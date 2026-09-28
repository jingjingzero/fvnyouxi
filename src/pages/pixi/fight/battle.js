import { battleLog, setBattleLog } from './logger.js'
import { reactive } from 'vue'
import { getFinalArmor, calculateSkillDamage, useSkillShooting, calculateFinalDamage, resetLuckGodChosenPity, applyDamageToTarget, applyDamageToPlayer, computeArmorReduction, computeMagicResistReduction, selectEnemySkill, refreshLeaderBuff, refreshCrownBuff } from './SkillDamage'
import { hasSummonShield } from './hitShield.js'
import { getDotTick } from './dotSystem.js'
import { BUFF_TYPE_CLEANUP, BUFF_NAME_CLEANUP, DEBUFF_NAME_CLEANUP, upsertBuff, applyBuffSideEffects } from './buffCleanup.js'
import { random, chance, pickIndex } from './rng.js'
import { applyBleed } from './NewCards.js'
import {
  removeFreeze
} from './ElementReaction.js';
import { useCounterStore } from "@/store/counter";
import { ATTACK_CARDS } from "@/store/counter"; // 攻击牌列表
import { ITEM_DEFS } from "@/store/configs"; // 装备 fx 战斗效果参数
import { computeUnitAttrs } from "@/store/unitAttrs"; // 🧮 属性结算统一入口（力量/智慧换算 + maxHp 派生）
import { removeSummon, getSummonInstance, getFirePointPosition, playSpineProjectile, playProjectile, playReflectBuff, removeReflectBuff, removePoisonMist, removeFieldFx, playSpineEffect } from "./SkillLogic"
import { getEffect, returnEffect } from "./animations/effectPool.js"
import { playAllyEffect, playEnemyEffect } from './playCardEffect.js'
import { getEffectConfig, getSummonSound, getAllyFxConfig, getEnemyFxConfig, getEnemySkillEffectConfig } from './effectConfig.js'
import emitter from "@/bus";
import { calculateBattleRewards, monsterConfigs } from "../matter1/enemiesData"
import { Container, Sprite, Texture, Assets } from 'pixi.js'
import { gsap } from 'gsap'
import { playCardCooldownEffect } from './hitParticles.js'
import { t } from "@/i18n";
const user = useCounterStore();
export const BattleSystem = {}
let zhandou = false
// 新增：战斗循环启停标记
let loopPaused = true
let VH = window.innerHeight / 100;
let VW = window.innerWidth / 100;



// ==============================================
// 🔥 性能优化：缓存Pinia数据，避免频繁访问触发响应式
// ==============================================
let _cardDataCache = null;
let _pixiAppCache = null;
let _fightAppCache = null;       // 战斗场景专用 pixi app（屏幕坐标，与敌人spine同画布）
let _enemyContainerCache = null; // 敌人容器（zIndex较低，需要在敌人下方的特效放这里）
let _playerScreenPos = null;     // 玩家屏幕坐标 {x, y}，用于子弹起点
let _playerInstanceCache = null;
let _isPlayerTurn = false; // 🎯 玩家回合标志（玩家出牌阶段 true，敌人回合 false；玩家受伤动画据此判断）
// 🎯 当前战斗的玩家战斗单位引用（供战斗 UI 预测伤害等读取，createBattle 时设置）
let _currentBattlePlayer = null;
let _currentBattleAllies = [];
export function getBattlePlayer() {
  return _currentBattlePlayer;
}
// 🔥 天赋缓存
let _talentsCache = [];
let _userStoreCache = null;

// 🧙 携带的队友 spine 引用（主世界创建，战斗攻击动画播放用）
let _npcAllySpineCache = null;
// 🧙 携带队友在战斗特效层（屏幕坐标）的实际位置，用于特效/投射物起点
let _npcAllyScreenPos = null;

/**
 * 设置携带队友的 spine 引用（matter.vue 创建队友后调用）
 * @param {Object|null} allyNpc - 队友 NPC 实例（含 .spine）
 */
export function setNpcAllySpine(allyNpc) {
  _npcAllySpineCache = allyNpc || null;
  // 清空缓存的位置（等 setNpcAllyScreenPos 重新设置）
  if (!allyNpc) _npcAllyScreenPos = null;
}

/** 获取携带队友的 spine 引用 */
export function getNpcAllySpine() {
  return _npcAllySpineCache;
}

/**
 * 设置携带队友在战斗特效层（屏幕坐标）的实际位置
 * @param {{x: number, y: number}|null} screenPos - 队友屏幕坐标
 */
export function setNpcAllyScreenPos(screenPos) {
  _npcAllyScreenPos = screenPos || null;
}

/** 获取携带队友的屏幕坐标（特效/投射物起点用） */
export function getNpcAllyScreenPos() {
  return _npcAllyScreenPos;
}

/**
 * 初始化战斗缓存（战斗开始前调用一次）
 */
export function initBattleCache(userStore) {
  _cardDataCache = userStore.pixi.player.CARD_DATA;
  _pixiAppCache = userStore.pixi.app;
  _playerInstanceCache = userStore.pixi.playerInstance;
  // 🔥 缓存天赋信息
  _talentsCache = userStore.pixi.player.activatedTalents || [];
  _userStoreCache = userStore;
  // ⚡ 战斗日志联动性能模式：节能自动关日志（省 console 开销），高性能全量日志
  setBattleLog(userStore.perfMode !== 'low');
}

/**
 * 设置战斗场景 pixi app（屏幕坐标容器，与敌人spine同画布）
 * 战斗场景的子弹、特效统一渲染到这里，保证坐标与敌人对齐
 */
export function setFightApp(fightApp, playerScreenPos) {
  _fightAppCache = fightApp;
  // 传入 null/undefined 时保留已有玩家坐标（避免覆盖 matter.vue 动态计算的值）
  if (playerScreenPos) {
    _playerScreenPos = playerScreenPos;
  }
}

/** 设置玩家在战斗特效层（屏幕坐标）的实际位置（覆盖 setFightApp 传入的固定值） */
export function setPlayerScreenPos(playerScreenPos) {
  _playerScreenPos = playerScreenPos;
}

/** 获取战斗容器（优先用fightApp，fallback到大世界app） */
export function getFightContainer() {
  return _fightAppCache || _pixiAppCache;
}

// ✨ 抽牌中心光芒绽放特效（从战斗画面中心向外扩散的多层金色光环，配合发牌/重开战斗播放）
let _dealGlowTex = null
function ensureDealGlowTex() {
  if (_dealGlowTex) return _dealGlowTex
  try {
    const size = 512
    const cv = document.createElement('canvas')
    cv.width = cv.height = size
    const ctx = cv.getContext('2d')
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(255,255,255,0.95)')
    grad.addColorStop(0.22, 'rgba(255,238,186,0.85)')
    grad.addColorStop(0.5, 'rgba(251,191,36,0.4)')
    grad.addColorStop(0.8, 'rgba(251,146,60,0.12)')
    grad.addColorStop(1, 'rgba(251,146,60,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    _dealGlowTex = Texture.from(cv)
    return _dealGlowTex
  } catch (e) { return null }
}

export function playDealGlowBurst() {
  try {
    const app = getFightContainer()
    if (!app || !app.stage || app.stage.destroyed) return
    const W = app.screen?.width || 1280
    const H = app.screen?.height || 720
    const tex = ensureDealGlowTex()
    if (!tex) return
    const MAX = Math.max(W, H)
    const layers = [
      { max: MAX * 1.6, dur: 1.0, delay: 0, alpha: 0.6 },
      { max: MAX * 1.15, dur: 0.8, delay: 0.12, alpha: 0.5 },
      { max: MAX * 0.8, dur: 0.6, delay: 0.24, alpha: 0.45 },
    ]
    const sprites = []
    layers.forEach((L, i) => {
      const s = new Sprite(tex)
      s.anchor.set(0.5)
      s.position.set(W / 2, H / 2)
      s.alpha = 0
      s.scale.set(0.12)
      app.stage.addChild(s)
      sprites.push(s)
      gsap.to(s, {
        scale: L.max / 512,
        alpha: L.alpha,
        duration: L.dur,
        delay: L.delay,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(s, { alpha: 0, duration: 0.4, ease: 'power1.in', onComplete: () => { try { s.destroy({ texture: false }) } catch (e) { } } })
        }
      })
    })
    // 兜底清理（防止异常中断导致 sprite 残留）
    setTimeout(() => { sprites.forEach(s => { try { if (!s.destroyed) s.destroy({ texture: false }) } catch (e) { } }) }, 3200)
  } catch (e) { /* 特效失败不阻塞发牌 */ }
}

/** 设置敌人容器（用于播放需要在敌人下方的特效） */
export function setEnemyContainer(container) {
  _enemyContainerCache = container;
}

/** 获取敌人容器（特效需要在敌人下方时用） */
export function getEnemyContainer() {
  return _enemyContainerCache;
}

// ========== 不幸天赋残留数据（用于延迟播放特效和伤害数字） ==========
let _strikeData = null;  // { triggered: boolean, damages: [{ enemyUid, enemyName, damage }] }

/** 获取并清空不幸天赋数据（延迟到 setFightApp 后播放粒子特效和伤害数字） */
export function consumeStrikeData() {
  const data = _strikeData;
  _strikeData = null;
  return data;
}

/**
 * 在敌人中心位置播放不幸天赋爆炸粒子特效
 * 贴图 CartoonSmoke，黑灰二色，向四周缓慢扩散
 * @param {Container} container - 战斗特效容器
 * @param {Object[]} enemies - 存活敌人列表 [{ x, y, hp, uid }]
 */
export async function playStrikeExplosion(container, enemies) {
  if (!container || !enemies || enemies.length === 0) return;

  // 计算敌人中心位置
  const living = enemies.filter(e => e.hp > 0);
  if (living.length === 0) return;
  const centerX = living.reduce((s, e) => s + e.x, 0) / living.length;
  const centerY = living.reduce((s, e) => s + e.y, 0) / living.length;

  // 获取 CartoonSmoke 贴图
  let tex;
  try { tex = Assets.get('CartoonSmoke'); } catch (e) { /* ignore */ }
  if (!tex) {
    // 如果缓存没有，尝试显式加载一次
    try { tex = await Assets.load('CartoonSmoke'); } catch (e2) { /* ignore */ }
  }
  if (!tex) {
    // fallback：生成一个简单圆形贴图
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(8, 8, 8, 0, Math.PI * 2); ctx.fill();
    tex = Texture.from(canvas);
  }

  const wrapper = new Container();
  wrapper.zIndex = 9999;
  container.addChild(wrapper);

  // 生成 80 个烟雾粒子，黑灰二色，向四周缓慢扩散
  for (let i = 0; i < 80; i++) {
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    const startSize = 0.1 + Math.random() * 0.13; // 大幅放大起始大小 0.08~0.20
    s.scale.set(startSize);
    s.position.set(centerX + (Math.random() - 0.5) * 40, centerY + (Math.random() - 0.5) * 20);
    // 黑灰二色随机
    s.tint = Math.random() > 0.5 ? 0x333333 : 0x666666;
    s.alpha = 0.3 + Math.random() * 0.5; // 0.3~0.8
    s.rotation = Math.random() * Math.PI * 2;
    wrapper.addChild(s);

    const angle = Math.random() * Math.PI * 2;
    const dist = 75 + Math.random() * 150;      // 扩散距离 80~280px
    const dur = 1.5 + Math.random() * 1.5;       // 持续 1.5~3.0 秒（慢速）
    const endSize = 0.15 + Math.random() * 0.25; // 终点尺寸大幅变大
    const delay = Math.random() * 0.2;

    gsap.to(s, {
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist - Math.random() * 30, // 微微上浮
      scale: endSize,
      alpha: 0,
      rotation: s.rotation + (Math.random() - 0.5) * 3,
      duration: dur,
      ease: 'power2.out',
      delay,
    });
  }

  // 动画结束后自动销毁
  gsap.delayedCall(3.5, () => {
    if (wrapper.parent) wrapper.parent.removeChild(wrapper);
    wrapper.destroy({ children: true });
  });
}

// 敌人 spine 列表缓存（用于播放攻击动画等）
let _enemySpineListCache = null;
let _enemiesDataCache = null;

/**
 * 设置敌人 spine 列表（战斗开始时调用，用于播放敌人攻击动画）
 * @param {Array} spineList - 敌人 spine 列表
 * @param {Array} enemiesData - 敌人数据列表（用于索引对应）
 */
export function setEnemySpineList(spineList, enemiesData) {
  _enemySpineListCache = spineList;
  _enemiesDataCache = enemiesData;
}

/** 获取玩家屏幕坐标（子弹起点用） */
export function isPlayerTurn() { return _isPlayerTurn }

export function getPlayerScreenPos() {
  return _playerScreenPos;
}

/**
 * 根据敌人 uid 或索引获取敌人 spine 的实际渲染位置
 * @param {object|number} target - 敌人对象（含 uid）或敌人索引
 * @returns {{x: number, y: number}|null}
 */
export function getEnemySpinePos(target) {
  if (!_enemySpineListCache) return null;
  let idx = -1;
  if (typeof target === 'number') {
    idx = target;
  } else if (target && target.uid !== undefined) {
    idx = _enemiesDataCache?.findIndex(e => e.uid === target.uid) ?? -1;
  }
  if (idx < 0 || idx >= _enemySpineListCache.length) return null;
  const spineItem = _enemySpineListCache[idx];
  if (!spineItem || !spineItem.spine) return null;
  return { x: spineItem.spine.x, y: spineItem.spine.y };
}


/**
 * 获取敌人 Spine 攻击点端点（attackPoint）在画布上的坐标（与 getEnemySpinePos 同一坐标空间）
 * 兼容 attackPoint / points 两种插槽命名；找不到返回 null（调用方回退敌人 spine 位置）
 * @param {object|number} target - 敌人对象（含 uid）或敌人索引
 * @returns {{x: number, y: number}|null}
 */
export function getEnemyAttackPointPos(target) {
  if (!_enemySpineListCache) return null;
  let idx = -1;
  if (typeof target === 'number') {
    idx = target;
  } else if (target && target.uid !== undefined) {
    idx = _enemiesDataCache?.findIndex(e => e.uid === target.uid) ?? -1;
  }
  if (idx < 0 || idx >= _enemySpineListCache.length) return null;
  const spine = _enemySpineListCache[idx]?.spine;
  if (!spine?.skeleton) return null;
  // 🎯 先强制更新骨架世界变换：注册/事件触发时骨架可能尚未 updateWorldTransform，骨骼 world 坐标会是 (0,0)
  try { spine.skeleton.updateWorldTransform(); } catch (e) { /* ignore */ }
  for (const slotName of ['attackPoint', 'points']) {
    const slot = spine.skeleton.findSlot?.(slotName);
    const att = slot && spine.skeleton.getAttachmentByName?.(slotName, 'attackPoint');
    if (!slot || !att) continue;
    const bone = slot.bone || spine.skeleton.findBone?.(slotName);
    // 🎯 Spine 4.3：骨骼世界变换在 appliedPose（BonePose）上（bone.a/b/c/d/worldX/worldY 已移到 appliedPose）
    const pose = bone?.appliedPose || bone?.pose;
    if (pose && typeof pose.a === 'number') {
      const wx = pose.a * (att.x ?? 0) + pose.b * (att.y ?? 0) + (pose.worldX ?? 0);
      const wy = pose.c * (att.x ?? 0) + pose.d * (att.y ?? 0) + (pose.worldY ?? 0);
      // 🧪 临时诊断（用后即删）
      console.warn('[攻击点] pose矩阵=', pose.a.toFixed(3), pose.b.toFixed(3), pose.c.toFixed(3), pose.d.toFixed(3),
        '| world=', (pose.worldX ?? 0).toFixed(1), (pose.worldY ?? 0).toFixed(1),
        '| 骨架攻击点=', wx.toFixed(1), wy.toFixed(1),
        '| 画布起点=', (spine.x + wx * (spine.scale.x || 1)).toFixed(0), (spine.y - wy * (spine.scale.y || 1)).toFixed(0));
      return {
        x: spine.x + wx * (spine.scale.x || 1),
        y: spine.y - wy * (spine.scale.y || 1), // 🎯 骨架 Y 向上、画布 Y 向下 → 取负
      };
    }
    // 兜底：旧版 API（computeWorldPosition）
    if (att?.computeWorldPosition) {
      const p = att.computeWorldPosition(bone, { x: 0, y: 0 });
      if (p && (p.x || p.y)) {
        return {
          x: spine.x + (p.x || 0) * (spine.scale.x || 1),
          y: spine.y - (p.y || 0) * (spine.scale.y || 1),
        };
      }
    }
  }
  return null;
}


/**
 * 获取卡牌配置（从缓存）
 */
function getCardData(name) {
  return _cardDataCache?.[name];
}

// ======================================
// 🔥 天赋系统辅助函数
// ======================================
/**
 * 检查是否激活了某个天赋
 */
function hasTalent(talentId) {
  return _talentsCache?.includes(talentId) || false;
}

/**
 * 读取天赋战斗效果值（dladmin「编辑天赋」页的 effect 字段可改）
 * 未配置时返回 fallback（即原代码默认值）
 */
function talentFx(talentId, key, fallback) {
  const v = _userStoreCache.getTalentEffect?.(talentId, key);
  return v === undefined || v === null ? fallback : v;
}

// 🧹 buff/debuff 到期清理依赖注入（buffCleanup.js 为纯注册表，所需闭包/工具函数在此传入）
const BUFF_CLEANUP_HELPERS = {
  talentFx,
  removeReflectBuff,
  removeFreeze,
  returnEffect,
};

// ⚔️ 统一攻击力提升入口：任何来源（天赋/卡牌/道具/精灵）提升玩家攻击力都走这里，
//    自动记录来源明细（供弹窗显示）；atk_up 状态图标由 reconcileAtkUpIcon 统一维护
export function playerAttackUp(player, atkUp, pct, sourceName) {
  player.attack += atkUp
  if (!player._atkUpDetails) player._atkUpDetails = []
  const disp = pct === undefined ? Math.round(atkUp * 100) / 100 : Math.round(pct * 100) / 100
  const hit = player._atkUpDetails.find(d => d.name === sourceName)
  if (hit) hit.value = Math.round((hit.value + disp) * 100) / 100
  else player._atkUpDetails.push({ name: sourceName, value: disp, pct: pct !== undefined })
  // ⚔️ 立即刷新 atk_up 状态图标（不等到回合结束）
  reconcileAtkUpIcon(player)
}

// ↩️ 回滚攻击力来源记录（临时攻回合结束移除时调用）
export function playerAttackRollback(player, sourceName) {
  player._atkUpDetails = (player._atkUpDetails || []).filter(d => d.name !== sourceName)
}

// ⚔️ atk_up 状态图标维护：攻击力高于基础值且无其他攻击力提升 buff 图标时显示，回落则隐藏
function reconcileAtkUpIcon(player) {
  const hasAtkIcon = (player.buffs || []).some(b => b.name === '攻击力提升' || b.name === '聚灵' || b.name === '雷之祝福')
  const hasAtkGain = player.attack > player.baseAttack
  if (hasAtkGain && !hasAtkIcon) {
    player.buffs.push({ name: '攻击力提升', type: 'allStats', remaining: 999, isPermanent: true, atkUp: 0 })
  } else if (!hasAtkGain && player.buffs.some(b => b.name === '攻击力提升')) {
    player.buffs = player.buffs.filter(b => b.name !== '攻击力提升')
  }
}
/**
 * 应用战斗开始时的天赋效果
 */
function applyBattleStartTalents(player, enemies) {
  player.executeDamageBonus = 1;//最终增伤
  player.takenDamageReduce = 1;// 最终减伤
  player.allDamageBonus = 0;//增伤
  player.lowHpBuffTriggered = hasTalent('low_hp_battle_buff') ? true : false
  if (hasTalent('double_blade')) {
    // 双刃剑：最终物理伤害提升（独立乘区，仅物理）+ 受到伤害增加
    player.physDmgBonus = (player.physDmgBonus || 0) + talentFx('double_blade', 'dmgBonus', 0.25);
    player.takenDamageReduce += talentFx('double_blade', 'takenReduce', 0.12)
  }
  if (hasTalent('battle_start_attack_buff')) {
    const atkBonus = Math.trunc(player.baseAttack * talentFx('battle_start_attack_buff', 'atkPct', 0.4) * 100) / 100;
    playerAttackUp(player, atkBonus, talentFx('battle_start_attack_buff', 'atkPct', 0.4) * 100, '先攻')
    // 先攻：造成物理伤害提升（独立乘区，仅物理）
    player.physDmgBonus = (player.physDmgBonus || 0) + talentFx('battle_start_attack_buff', 'dmgBonus', 0.4);
    upsertBuff(player, {
      name: '先攻',
      remaining: 2
    });
  }
  if (hasTalent('mana_surge')) {
    const manaLevel = _userStoreCache.getTalentLevel?.('mana_surge') || 1;
    player.mp = Math.min(player.maxMp, player.mp + Math.round(manaLevel * talentFx('mana_surge', 'mpPerLv', 1)));
  }

  if (hasTalent('mana_initial_up')) {
    player.maxMp += talentFx('mana_initial_up', 'mp', 2);
    player.mp = Math.min(player.maxMp, player.mp + talentFx('mana_initial_up', 'mp', 2));
    battleLog('[天赋]云弥的祝福：最大灵力+2，初始灵力+2');
  }
  if (hasTalent('mana_max_up')) {
    const manaLevel = _userStoreCache.getTalentLevel?.('mana_max_up') || 1;
    player.maxMp += Math.round(manaLevel * talentFx('mana_max_up', 'mpPerLv', 1));
  }
  if (hasTalent('hp_convert_atk')) {
    const lv = _userStoreCache.getTalentLevel?.('hp_convert_atk') || 1;
    const rate = (talentFx('hp_convert_atk', 'rates', [0.06, 0.09, 0.12]) || [])[lv - 1] ?? 0.06;
    const addAtk = Math.round(player.maxHp * rate);
    playerAttackUp(player, addAtk, rate * 100, '生命转换')
    battleLog(`[天赋]生命转换：基于最大生命获得 ${addAtk} 点攻击力`);
  }
  if (hasTalent('swift_speed')) {
    const manaLevel = _userStoreCache.getTalentLevel?.('swift_speed') || 1;
    // 迅捷：每级 +4 点速度（固定值，非百分比）
    const addSpeed = talentFx('swift_speed', 'flatSpeed', 4) + talentFx('swift_speed', 'flatSpeedPerLv', 4) * (manaLevel - 1);
    player.speed += addSpeed;
    battleLog(`[天赋]迅捷：速度 +${addSpeed}`);
  }
  if (hasTalent('luck_blessing')) {
    const lv = _userStoreCache.getTalentLevel?.('luck_blessing') || 1;
    const addLuck = talentFx('luck_blessing', 'baseLuck', 20) + talentFx('luck_blessing', 'perLvLuck', 10) * (lv - 1);
    player.luck += addLuck;
  }
  // 🌀 紊乱：进入战斗后获得智慧 × rate% 的元素精通（仅1级，2点天赋）
  if (hasTalent('element_derivative_dmg')) {
    const addMastery = (player.intelligence || 0) * (talentFx('element_derivative_dmg', 'rate', 0.3));
    player.elementMastery = (player.elementMastery || 0) + addMastery;
    battleLog(`[天赋]紊乱：基于智慧获得 ${addMastery} 点元素精通`);
  }
  // 天赋：硬化 护甲+魔抗固定加成（每级各+2，非百分比）
  if (hasTalent('hardened_armor')) {
    const lv = _userStoreCache.getTalentLevel?.('hardened_armor') || 1;
    const addArmor = talentFx('hardened_armor', 'flatArmor', 2) + talentFx('hardened_armor', 'flatArmorPerLv', 2) * (lv - 1);
    const addMR = talentFx('hardened_armor', 'flatMagicResist', 2) + talentFx('hardened_armor', 'flatMagicResistPerLv', 2) * (lv - 1);
    player.armor += addArmor;
    player.magicResist = (player.magicResist || 0) + addMR;
    battleLog(`[天赋]硬化：护甲 +${addArmor} 魔抗 +${addMR}`);
  }
  // 天赋：纯净元素 - 元素反应伤害无视护甲
  if (hasTalent('element_armor_pierce')) {
    const lv = _userStoreCache.getTalentLevel?.('element_armor_pierce') || 1;
    // 1级12% 每级+4%
    const rate = talentFx('element_armor_pierce', 'basePct', 0.12) + talentFx('element_armor_pierce', 'perLvPct', 0.04) * (lv - 1);
    // 存入玩家全局变量，反应文件直接读取
    player.elementIgnoreArmorRate = Math.trunc(rate * 100) / 100;
  }
  // 天赋：残血收割 开局预计算阈值+增伤比例
  if (hasTalent('execute')) {
    const lv = _userStoreCache.getTalentLevel?.('execute') || 1
    // Lv1:25%  Lv2:35%  Lv3:45%
    player.executeHpThreshold = Math.trunc((talentFx('execute', 'thresholdBase', 0.25) + talentFx('execute', 'thresholdPerLv', 0.1) * (lv - 1)) * 100) / 100;
    // Lv1:+25% Lv2:+30% Lv3:+35%
    player.executeZengshang = Math.trunc((talentFx('execute', 'dmgBase', 0.25) + talentFx('execute', 'dmgPerLv', 0.05) * (lv - 1)) * 100) / 100;
  }
  // 🌀 元素共鸣：元素精通每级 +5（最多5级，战斗内生效）
  if (hasTalent('element_reaction_dmg_up')) {
    const lv = _userStoreCache.getTalentLevel?.('element_reaction_dmg_up') || 1
    const addMastery = (lv || 1) * (talentFx('element_reaction_dmg_up', 'flatMastery', 5));
    player.elementMastery = (player.elementMastery || 0) + addMastery;
    battleLog(`[天赋]元素共鸣：元素精通 +${addMastery}`);
  }
  if (hasTalent('mana_bless')) {
    const lv = _userStoreCache.getTalentLevel?.('mana_bless') || 1;
    const shieldRate = talentFx('mana_bless', 'basePct', 0.06) + talentFx('mana_bless', 'perLvPct', 0.03) * (lv - 1);
    const shieldAmount = Math.floor(player.maxHp * shieldRate);
    player.shield = (player.shield || 0) + shieldAmount;
  }
  // 🍀 莫奇的祝福：每装备一件道具，进入战斗后攻击力+6%（任务解锁天赋）
  if (hasTalent('moqi_blessing')) {
    const equipCount = (_userStoreCache?.pixi?.player?.equippedItems || []).length
    if (equipCount > 0) {
      const atkPct = talentFx('moqi_blessing', 'atkPct', 0.06) * equipCount
      const addAtk = Math.round(player.baseAttack * atkPct * 100) / 100
      player.attack = (player.attack || 0) + addAtk
      battleLog(`[天赋]莫奇的祝福：装备 ${equipCount} 件道具，攻击力 +${(atkPct * 100).toFixed(0)}%（+${addAtk}）`)
    }
  }

  // ========== 绝对防御：战斗开始提升百分比护甲与魔抗，受3次攻击后失效 ==========
  if (hasTalent('start_battle_armor_buff')) {
    const lv = _userStoreCache.getTalentLevel?.('start_battle_armor_buff') || 1;
    const rates = talentFx('start_battle_armor_buff', 'rates', { 1: 0.75, 2: 0.95, 3: 1.15 });
    const armorRate = rates[lv] ?? 0.5;
    const addArmor = Math.floor(player.baseArmor * armorRate);
    const addMR = Math.floor((player.baseMagicResist ?? 10) * armorRate);
    player.armor += addArmor;
    player.magicResist = (player.magicResist || 0) + addMR;
    upsertBuff(player, {
      name: '绝对防御',
      type: 'abs_defense',
      addArmor,
      addMR,
      hitRemain: 3,
      isPermanent: true, // 手动管理，不自动移除
    });
    battleLog(`[天赋] 绝对防御 Lv.${lv}：护甲+${addArmor} 魔抗+${addMR}（${armorRate * 100}%），受3次攻击后失效`);
  }

  player.hitShieldCount = hasTalent('hit_count_shield') ? Math.round(talentFx('hit_count_shield', 'hits', 8)) : false;
  // 天赋：荆棘反伤 折前伤害反弹
  if (hasTalent('thorns_reflect')) {
    const lv = _userStoreCache.getTalentLevel?.('thorns_reflect') || 1;
    player.reflectRate = (talentFx('thorns_reflect', 'basePct', 5) + talentFx('thorns_reflect', 'perLvPct', 2.5) * (lv - 1)) / 100;
    upsertBuff(player, {
      name: '荆棘反伤1',
      stack: 0,
      isPermanent: true
    });
  }

  // ========== 天赋：不幸（battle_start_strike）- 战斗开始概率对全体敌人AOE ==========
  if (hasTalent('battle_start_strike') && enemies && enemies.length > 0) {
    const lv = _userStoreCache.getTalentLevel?.('battle_start_strike') || 1;
    // 概率：Lv1=30% Lv2=40% Lv3=50% Lv4=60% Lv5=70%
    const baseProb = talentFx('battle_start_strike', 'baseProb', 0.3) + talentFx('battle_start_strike', 'probPerLv', 0.1) * (lv - 1);
    // 新倍率：120/150/180/210/240%
    const ratioArr = talentFx('battle_start_strike', 'dmgRatios', [1.2, 1.5, 1.8, 2.1, 2.4]);
    const dmgRatio = ratioArr[lv - 1];

    const luck = player.luck ?? 0;
    const finalProb = _userStoreCache.luckProb(baseProb);

    battleLog(`[天赋] 不幸 Lv.${lv}：基础概率=${(baseProb * 100).toFixed(0)}%，幸运=${luck}，最终概率=${(finalProb * 100).toFixed(1)}%`);

    if (chance(finalProb)) {
      battleLog(`[天赋] 不幸 触发！对全体敌人造成 ${(dmgRatio * 100).toFixed(0)}% 幸运值伤害，敌人全程受伤+15%`);

      const livingEnemies = enemies.filter(e => e.hp > 0);
      const damageRecords = [];

      livingEnemies.forEach(enemy => {
        // 🛡️ 受击前统一拦截（暗影王暗影庇佑：有召唤物存活时免疫所有伤害，含天赋 AOE）
        if (hasSummonShield(enemy, enemies)) return;
        // 整场战斗易伤 +15%，字段 damageTaken
        enemy.damageTaken += talentFx('battle_start_strike', 'vulnPct', 0.15);

        const rawDmg = player.luck * dmgRatio;
        const armor = Math.max(0, enemy.armor || 0);
        // 🛡️ 统一减伤公式（护甲曲线收敛唯一入口）
        const finalDmg = Math.max(1, Math.round(rawDmg * (1 - computeArmorReduction(armor)) * 100) / 100);
        // 🛡️ 统一伤害落地（天赋 AOE 不触发受击被动/死亡检查——战斗尚未正式开始，仅扣血+飘字）
        applyDamageToTarget(enemy, finalDmg, {
          player, dmgType: 'null', isCritical: false, skillName: '厄运', enemies,
          triggerPassives: false, trackOverflow: false, trackMark: false, checkBattleEnd: false,
        });
        battleLog(`[天赋] 不幸 → ${enemy.name}：造成 ${Math.round(finalDmg * 100) / 100} 点伤害（剩余HP: ${enemy.hp}/${enemy.maxHp}）`);

        damageRecords.push({
          enemyUid: enemy.uid,
          enemyName: enemy.name,
          damage: finalDmg,
        });
      });
      _strikeData = { triggered: true, damages: damageRecords };
    } else {
      battleLog(`[天赋] 不幸 未触发（概率 ${(finalProb * 100).toFixed(1)}%）`);
      _strikeData = { triggered: false, damages: [] };
    }
  }
}

/**
 * 🎯 统一战斗属性初始化（createBattle 玩家 / NPC 队友共用，消除散落赋值漏项）
 * 从 base 同步战斗实时属性 + 战斗乘区默认值。
 * ⚠️ 玩家调用时 resetMultipliers 保持 false：乘区默认值由 applyEntryBuffs
 *    （createBattle 中段调用）统一设置，此处重置会覆盖其后的天赋效果。
 * @param {object} unit 战斗单位
 * @param {object} opts { magicResistDefault=10, luckFixed（固定幸运值，不传则用 baseLuck）, resetMultipliers=false }
 */
function initBattleAttrs(unit, opts = {}) {
  const { magicResistDefault = 10, luckFixed, resetMultipliers = false } = opts
  // 🧮 统一属性结算：基础四维 + maxHp 派生 + 力量/智慧换算基数（伤害公式不再单独读 attrRates）
  const attrs = computeUnitAttrs(unit)
  unit.buffs = unit.buffs ?? []
  unit.debuffs = unit.debuffs ?? []
  unit.attack = attrs.attack
  unit.armor = attrs.armor
  unit.magicResist = attrs.magicResist
  unit.speed = attrs.speed
  unit.luck = luckFixed !== undefined ? luckFixed : attrs.luck
  if (attrs.maxHp != null) unit.maxHp = attrs.maxHp // 💪 派生最大生命（单位无基础生命信息时不覆盖）
  unit.physBonusBase = attrs.physBonusBase // 💪 力量物理增伤基数（预计算）
  unit.eleBonusBase = attrs.eleBonusBase   // 🧠 智慧元素增伤基数（预计算）
  unit.mastery = attrs.mastery             // 🧠 元素精通（含智慧派生）
  unit.damageTaken = 0
  if (resetMultipliers) {
    unit.allDamageBonus = 0
    unit.executeDamageBonus = 1
    unit.takenDamageReduce = 1
  }
}

/**
 * 公共：进入战斗时应用的所有加成（天赋 + 道具）
 * 在 createBattle 和 resetBattle 中均调用，消除重复
 */
function applyEntryBuffs(player, enemies) {
  player._summonCardCount = 0; // 🤝 同心：召唤物牌计数战斗开始时重置
  // 🔥 天赋效果
  applyBattleStartTalents(player, enemies);
  player._manaCycleFreeConsumed = true;
  player._manaCycleFreePending = false;
  player._manaCdReduceCount = 0
  player._firstCardFreeThisTurn = false;
  player._firstCardFreeConsumed = false;
  // 🔥 道具：黑米的灵晶 - 基于已消灭魔物数量增加攻击力
  if (_userStoreCache.isItemEquipped?.('黑米的灵晶')) {
    const killCount = _userStoreCache.pixi.player.equippedItemKillCounts?.['黑米的灵晶'] || 0;
    if (killCount > 0) {
      const bonusAtk = killCount * 0.2;
      playerAttackUp(player, bonusAtk, Math.round(bonusAtk / (player.baseAttack || 1) * 100 * 10) / 10, '黑米的灵晶')
      battleLog(`[道具] 黑米的灵晶：进入战斗，已消灭魔物=${killCount}，攻击力+${bonusAtk.toFixed(1)}`);
    }
  }

  // 🧤 道具：幽暗手套 - 进入战斗攻击力 +%（fx.atkPct，dladmin 装备编辑可改）
  if (_userStoreCache.isItemEquipped?.('幽暗手套')) {
    const gloveFx = ITEM_DEFS['幽暗手套']?.fx || {};
    const gloveAtkPct = Number(gloveFx.atkPct ?? 0.05);
    const gloveAtk = Math.round(player.baseAttack * gloveAtkPct * 100) / 100;
    playerAttackUp(player, gloveAtk, Math.round(gloveAtkPct * 100), '幽暗手套')
    battleLog(`[道具] 幽暗手套：进入战斗，攻击力+${gloveAtk}（${Math.round(gloveAtkPct * 100)}%）`);
  }

  // ========== 先机天赋 ==========
  if (hasTalent('first_strike')) {
    const lv = _userStoreCache.getTalentLevel?.('first_strike') || 1;
    player.actionProgress = talentFx('first_strike', 'actionPerLv', 2000) * lv;
    battleLog('✅先机生效，初始行动条：', player.actionProgress);
  } else {
    player.actionProgress = 0
  }

  // 💎 突破被动：受伤害减免 & 最终伤害提升（放在最后应用，
  //    ⚠️ 修复：原写在 createBattle 玩家初始化段，会被本函数开头
  //    applyBattleStartTalents 的 takenDamageReduce=1 重置覆盖 → 突破减伤从未生效）
  //    takenDamageReduce 语义 = 1 无减伤、减小为减伤（向死而生 -0.3 → 0.7 = 减伤30%；突破减伤 0.1 → 0.9 = 减伤10%）
  player.takenDamageReduce = (player.takenDamageReduce ?? 1) - user.getBreakthroughDamageReduce()
  player.finalDamageBoost = user.getBreakthroughDamageBoost()
  // ⚔️ 开局攻击力提升状态图标
  reconcileAtkUpIcon(player)
}

/**
 * 应用回合开始时的天赋效果（玩家回合）
 */
function applyPlayerTurnStartTalents(player) {
  // 天赋：灵韵流转 - 每回合额外获得1点灵力
  if (hasTalent('mana_regen')) {
    const lv = _userStoreCache.getTalentLevel('mana_regen');
    const addMp = lv === 1 ? talentFx('mana_regen', 'mpLv1', 1) : talentFx('mana_regen', 'mpLv2', 2);

    player.mp = Math.min(player.maxMp, player.mp + addMp);
    battleLog(`[天赋] 灵韵流转Lv${lv}：获得${addMp}点灵力`);
  }
  // 天赋：生命回复 - 根据等级恢复（初始2%，每升一级+1%）
  if (hasTalent('life_steal')) {
    const lifeLevel = _userStoreCache.getTalentLevel?.('life_steal') || 1;
    // Lv1=2.0% 每级+0.5%
    const healPercent = talentFx('life_steal', 'basePct', 0.02) + talentFx('life_steal', 'perLvPct', 0.005) * (lifeLevel - 1);
    // 不取整，保留2位小数
    const healAmount = Math.round(player.maxHp * healPercent * 100) / 100;
    applyHeal(player, healAmount, 'heal');
    _playerInstanceCache?.showBuffText(t('buffLifeRegen'));
    battleLog(`[天赋] 生命回复 Lv.${lifeLevel}：恢复${healAmount}点生命（${(healPercent * 100).toFixed(1)}%）`);
  }
  if (hasTalent('attack_round_start_up')) {
    const lv = _userStoreCache.getTalentLevel('attack_round_start_up');
    const addRate = (talentFx('attack_round_start_up', 'rates', [0.05, 0.06, 0.07, 0.08, 0.09]) || [])[lv - 1] ?? 0.05;
    const atkBonus = Math.trunc(player.baseAttack * addRate * 100) / 100;
    _playerInstanceCache?.showBuffText(t('buffSwiftness'));
    playerAttackUp(player, atkBonus, addRate * 100, '锋速')
  }
  //燃血
  if (hasTalent('hp_cost_atk_up')) {
    const selfHurtPercent = talentFx('hp_cost_atk_up', 'selfHurtPct', 0.06);
    const atkBuffPercent = talentFx('hp_cost_atk_up', 'atkBuffPct', 0.12);
    // 计算自身当前血量伤害
    const selfHurtValue = Math.floor(player.hp * selfHurtPercent);
    // 走完整受击流程：扣护盾→扣血→西亚保命→触发汲取hurt_atk_stack→顺势疾行swift_rush→反伤全部触发
    BattleSystem.enemyAttack({
      name: '燃血',
      attack: selfHurtValue,
      attackMultiplier: 1,
      isTrueDamage: true // 新增标记：真实伤害
    }, () => { })

    // 施加攻击力增益
    const atkBonus = Math.trunc(player.baseAttack * atkBuffPercent * 100) / 100;
    playerAttackUp(player, atkBonus, atkBuffPercent * 100, '燃血')
  }
}

/**
 * 统一治疗函数 - 所有治疗效果必须通过此函数实现
 * 自动触发相关天赋效果（如：灵愈）
 *
 * @param {Object} target - 治疗目标（player对象）
 * @param {number} value - 治疗量
 * @param {string} type - 治疗类型 'heal'（回血）| 'mp'（回蓝）
 * @param {boolean} isCritical - 是否暴击治疗
 */
export function applyHeal(target, value, type = 'heal', isCritical = false) {
  if (type === 'heal') {
    // 🔥 天赋：灵愈 - 只要受到治疗就触发（无论是否满血）
    if (hasTalent('heal_atk_buff')) {
      const lv = _userStoreCache.getTalentLevel?.('heal_atk_buff') || 1;
      // 等级对应加成：Lv.1=1%, Lv.2=1.5%, Lv.3=2%
      const rateMap = talentFx('heal_atk_buff', 'rates', [0.01, 0.015, 0.02]);
      const rate = rateMap[lv - 1] ?? 0.01;
      const atkBonus = Math.trunc(target.baseAttack * rate * 100) / 100;
      target.attack += atkBonus;
    }

    // 传入已保留两位小数，直接使用
    const oldHp = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + value);
    const actualHeal = target.hp - oldHp;

    if (actualHeal <= 0) {
      // 满血不继续显示飘字
      return;
    }
  } else if (type === 'mp') {
    // 回灵力，直接累加
    target.mp = Math.min(target.maxMp, target.mp + value);
  }

  // 2. 显示飘字动画，原值传递
  _playerInstanceCache?.takeHeal(value, type, isCritical);
}

// 🎯 暴击机制已移除：暴击伤害倍率天赋不再存在（致命一击改为「每回合第一张物理牌伤害+25%」，见 SkillDamage）

export function createBattle(player, allies, enemies, useCard, onPlayerTurnStart, playerHand, onPlayerTurnEnd) {
  // 🎯 记录当前战斗玩家引用（供战斗 UI 预测伤害读取）
  _currentBattlePlayer = player;
  player._fireSpiritBoost = false; // 🔥 重置火精灵火伤光环标记（每次战斗独立）

  const state = reactive({
    round: 1,
    currentActor: null,
    acting: false,
    phase: 'waiting',
    battleEnd: false
  })

  // 🎬 慢动作状态：变身演出期间时间流速降低（行动条增长变慢）
  let slowMoFactor = 1
  let slowMoUntil = 0
  function setSlowMo(factor, ms) {
    slowMoFactor = factor
    slowMoUntil = performance.now() + ms
  }

  // 星铁固定参数
  const ACTION_MAX = 10000
  const TICK_SPEED = 10 // 进度条动画速度
  const GROW_SCALE = 1
  // 🎯 统一战斗属性初始化（玩家：乘区默认值由 applyEntryBuffs 统一设置，此处不重置避免覆盖）
  initBattleAttrs(player)
  // 🎃 空心布偶减速诅咒：本次地牢内玩家速度-4%/层（可叠加，离开地牢清除）
  const _dungeonSlow = Number(user.pixi?.player?.dungeonSpeedDown || 0)
  if (_dungeonSlow > 0) {
    const _slowed = Math.max(1, Math.floor(player.speed * (1 - _dungeonSlow)))
    player.speed = _slowed
    player.baseSpeed = _slowed
  }
  // 💎 突破被动（受伤害减免/最终伤害提升）已收敛进 applyEntryBuffs 末尾应用，
  //    避免被 applyBattleStartTalents 的乘区重置覆盖（修复：原写法突破减伤从未生效）
  //队友初始化
  allies.forEach(u => {
    u.actionProgress = 0
    if (u.isNpcAlly) {
      // 🎯 统一属性初始化（NPC 队友：从 base 同步 + 重置战斗乘区默认值）
      initBattleAttrs(u, { luckFixed: 0, resetMultipliers: true })
      u.shield = 0
      // 初始冷却：进战斗后需经过 skillInitialCooldown 个自身回合才可使用技能
      u.skillCdRemain = u.skillInitialCooldown ?? 2
    } else {
      u.buffs = u.buffs ?? []
      u.debuffs = u.debuffs ?? []
      u.speed = u.baseSpeed
    }
  })

  // 💖 交心 + 👑 首领：进入战斗后，同伴/召唤物全属性提升（开局已在场的同伴/召唤物）
  const _hhPct = user.hasTalent?.('heart_to_heart') ? (Number(user.getTalentEffect?.('heart_to_heart', 'attrPct') ?? 0) || 0) : 0;
  const _ldPct = user.hasTalent?.('leader_skill') ? (Number(user.getTalentEffect?.('leader_skill', 'attrPct') ?? 0) || 0) : 0;
  // 💖 魅力：分段线性递减加成召唤物/同伴全属性（0-50 每点0.30%，50-120 每点0.18%，120-250 每点0.10%，250+ 每点0.06%）
  const _charmVal = _userStoreCache.pixi?.player?.juese?.charm || 0;
  let _charmPct = 0;
  if (_charmVal > 0) {
    _charmPct += Math.min(_charmVal, 50) * 0.30;
    if (_charmVal > 50) _charmPct += Math.min(_charmVal - 50, 70) * 0.18;
    if (_charmVal > 120) _charmPct += Math.min(_charmVal - 120, 130) * 0.10;
    if (_charmVal > 250) _charmPct += (_charmVal - 250) * 0.06;
    _charmPct /= 100;
  }
  const _htoPct = (_hhPct + _ldPct) / 100; // 交心/领袖：全属性（含护甲）
  const _totalPct = _htoPct + _charmPct; // 💖 魅力：不加护甲（精灵等召唤物不需要护甲）
  if (_totalPct > 0) {
    allies.forEach(u => {
      if (!u || !(u.maxHp > 0)) return;
      u.maxHp = Math.round(u.maxHp * (1 + _totalPct));
      u.hp = Math.min(u.maxHp, Math.round(u.hp * (1 + _totalPct)));
      u.attack = Math.round((u.attack ?? 0) * (1 + _totalPct));
      u.armor = Math.round((u.armor ?? 0) * (1 + _htoPct)); // 护甲只吃交心/领袖
      u.magicResist = Math.round((u.magicResist ?? 0) * (1 + _totalPct));
      u.speed = Math.round(u.speed * (1 + _totalPct) * 10) / 10;
      u.luck = Math.round((u.luck ?? 0) * (1 + _totalPct));
      u.baseSpeed = u.speed; // 同步 baseSpeed，防止回合刷新速度时覆盖
    });
  }
  // 👑 首领：进入战斗后，按场上召唤物数量刷新玩家全属性加成
  refreshLeaderBuff(player, allies);
  refreshCrownBuff(player, allies); // 👑 精灵王冠：进入战斗刷新（四系齐全才生效）

  //敌人不变
  // 🌕 血月天气：敌人行动条立即提升 50%（战斗开始时）
  const bloodMoonBoost = (() => {
    try {
      const cbd = user.getDialogueFlag?.('customBattleData');
      return !!(cbd && cbd.bloodMoon);
    } catch (e) { return false; }
  })();
  // 🌦️ 雨天天气湿润标记：地牢雨天/暴风雨/雷雨天进入战斗 → 双方挂湿润
  const wetWeather = (() => {
    try {
      const cbd = user.getDialogueFlag?.('customBattleData');
      const w = cbd && cbd.weather;
      return w === 'rain' || w === 'storm' || w === 'thunderstorm';
    } catch (e) { return false; }
  })();
  const applyWetDebuff = (unit) => {
    if (!unit) return;
    upsertBuff(unit, { name: '湿润', type: 'wet', remaining: 999 }, { isDebuff: true });
  };
  // ❄️ 雪天天气霜冻标记：地牢雪天进入战斗 → 双方挂霜冻（触发元素反应）
  const frostWeather = (() => {
    try {
      const cbd = user.getDialogueFlag?.('customBattleData');
      const w = cbd && cbd.weather;
      return w === 'snow';
    } catch (e) { return false; }
  })();
  const applyFrostDebuff = (unit) => {
    if (!unit) return;
    upsertBuff(unit, { name: '霜冻', type: 'frost', remaining: 999 }, { isDebuff: true });
  };
  if (wetWeather) {
    applyWetDebuff(player);
    allies.forEach(a => applyWetDebuff(a));
  }
  if (frostWeather) {
    applyFrostDebuff(player);
    allies.forEach(a => applyFrostDebuff(a));
  }
  enemies.forEach(e => {
    e.actionProgress = hasTalent('charm_freeze') ? 0 : (bloodMoonBoost ? ACTION_MAX * 0.5 : 0)
    if (hasTalent('charm_freeze')) e._charmFrozen = true // 💖 犹怜：开战冻结敌人行动条，直到玩家首次行动
    if (hasTalent('kind_favor')) e._skipFirstTurn = true // 💖 优待：敌人第一次行动不会出手（跳过第一回合）
    e.buffs = e.buffs ?? []
    e.debuffs = e.debuffs ?? []
    e.speed = e.baseSpeed
    if (wetWeather) applyWetDebuff(e);
    if (frostWeather) applyFrostDebuff(e);
    // 🎯 敌人技能冷却初始化：每个技能独立的冷却计数器
    //    初始冷却 initialCooldown 表示进战斗后需经过多少个自身回合才可用
    if (Array.isArray(e.skills) && e.skills.length) {
      e.skillCds = e.skills.map(s => s.initialCooldown ?? 0)
    }
    // 🎯 敌人被动状态初始化
    if (Array.isArray(e.passives) && e.passives.length) {
      // 飞翔类被动标记（防重复触发）
      e._flying = false
      e._lowHpFlyTriggered = false  // 雷鸟「濒死飞翔」是否已触发
      e._hitFlyTriggeredThisTurn = false // 雷鸟女皇「受击飞翔」本回合是否已触发
      // 受击狂暴叠加层数（魔化猫）
      e._rageStacks = 0
      // 物理抗性被动应用（巨型眼瞳「魔能体」：减免物理伤害）
      const physResist = e.passives.find(p => p.type === 'physResist')
      if (physResist) {
        e._physResist = physResist
      }
      // 🌫️ 凋零之盾（凋零魔兽）：进入战斗获得 25% 最大生命值护盾；破盾时行动条 +50%
      const witherShieldP = e.passives.find(p => p.type === 'witherShield')
      if (witherShieldP) {
        e._witherShield = Math.round((e.maxHp ?? e.hp ?? 0) * (witherShieldP.shieldPct ?? 0.25) * 100) / 100
        e._witherShieldMax = e._witherShield   // 初始护盾（护盾条满宽基准）
        e._witherShieldBoostPct = witherShieldP.actionBarBoost ?? 0.5
      }
    }
  })

  // 💖 怜惜：进入战斗时，敌人攻击力降低（数值可配置；地牢追击减速已在 dungeon.vue 生效）
  if (hasTalent('charm_pity')) {
    const _pityAtkMult = 1 - (Number(user.getTalentEffect?.('charm_pity', 'attackReducePct') ?? 20) || 0) / 100;
    enemies.forEach(e => {
      if (!e || e.hp <= 0) return;
      e.attack = Math.round((e.attack ?? 0) * _pityAtkMult);
      if (e.baseAttack != null) e.baseAttack = Math.round(e.baseAttack * _pityAtkMult);
    });
  }

  // ========== 🧙 携带队友被动初始化 ==========
  allies.forEach(u => {
    if (!u.isNpcAlly) return;
    const pType = u.passiveType;
    // —— 黑米被动（旧）：战斗开始时提升 30% 行动条 ——
    if (pType === 'actionBar') {
      u.actionProgress = Math.min(u.actionProgress + ACTION_MAX * 0.30, ACTION_MAX);
      battleLog(`🧙 ${u.name} 被动：开战行动条 +30%`);
    }
    // —— 晨曦被动：所有敌人受到的伤害提升（对全体敌人生效，全程）——
    if (pType === 'enemyDamageTaken') {
      const dmgTaken = u.passiveValue ?? 0.10;
      enemies.forEach(e => {
        if (e.hp <= 0) return;
        e.damageTaken = (e.damageTaken || 0) + dmgTaken;
      });
      battleLog(`🧙 ${u.name} 被动：所有敌人受伤 +${Math.round(dmgTaken * 100)}%`);
    }
  });
  // —— 西亚被动：敌人的速度降低（对全体敌人生效）——
  allies.forEach(u => {
    if (u.isNpcAlly && u.passiveType === 'enemySlow') {
      enemies.forEach(e => {
        if (e.hp <= 0) return;
        const slowPct = u.passiveValue ?? 0.12;
        e.speed = Math.max(1, Math.round((e.baseSpeed || e.speed || 100) * (1 - slowPct) * 100) / 100);
        e._allySlowPct = slowPct;
      });
      battleLog(`🧙 ${u.name} 被动：敌人速度 -${Math.round((u.passiveValue ?? 0.12) * 100)}%`);
    }
  });

  // 🔥 保存玩家战斗初始基础状态快照（用于重置战斗时恢复）
  const playerBaseSnapshot = {
    maxMp: player.maxMp,
    mp: player.mp,
    attack: player.baseAttack,
    armor: player.baseArmor,
    speed: player.baseSpeed,
    luck: player.baseLuck
  }
  battleLog('playerBaseSnapshot=', playerBaseSnapshot);

  // ========== 调用公共的进入战斗加成 ==========
  applyEntryBuffs(player, enemies);

  // 🔥 天赋：蓄力隐忍 & 抵抗姿态 - 攻击牌检测标记
  let _attackCardPlayedThisTurn = false; // 本回合是否打出过攻击牌
  let _hasNoAttackPowerUpPending = false; // 隐忍 buff 待生效
  let _hasNoAttackArmorPending = false;   // 抵抗姿态 buff 待生效
  // 🔥 天赋：再来一次 - 概率累积
  let _luckActionRushProb = talentFx('luck_action_rush', 'baseProb', 0.15); // 初始概率，未触发每次+incProb，触发后重置
  // 🔥 天赋：多多益善 - 概率累积
  let _luckManaRestoreProb = talentFx('luck_mana_restore', 'baseProb', 0.15); // 初始概率，未触发每次+incProb，触发后重置
  // 🔥 天赋：厄运 - 概率累积（未触发每次+incProb，触发后重置）
  let _luckEnemyDmgProb = talentFx('enemy_luck_dmg', 'baseProb', 0.5);
  // 🔥 天赋：天选之子 - 保底概率重置（战斗结束自动随战斗销毁）
  resetLuckGodChosenPity();
  // 🔥 天赋：瞬连突袭 - 连续行动检测
  let _lastActorWasPlayer = false; // 上次行动者是否为玩家
  let globalAT = 0
  const FIRST_CYCLE_AT = 150
  const NORMAL_CYCLE_AT = 100
  let isFirstRound = true

  let timer = null
  let lastTime = 0;
  const FIXED_STEP = TICK_SPEED; // 固定逻辑步进，和你原来TICK_SPEED数值保持一致
  let accumulator = 0;
  // ⏱️ 行动条推进统一入口：一格速度 × GROW_SCALE 推进，硬上限 ACTION_MAX
  // 玩家/队友/敌人共用同一公式，以后调行动条节奏只改这一处
  // rate：行动条获取速率倍率（犹怜天赋对敌人 0.5 = 速率降低 50%）
  function advanceActionBar(unit, rate = 1) {
    if (!unit || unit.hp <= 0) return;
    unit.actionProgress = Math.min(unit.actionProgress + unit.speed * GROW_SCALE * rate, ACTION_MAX); // 🎯 硬上限：行动条最高 100%
  }
  // ====================
  // 主循环
  // ====================
  function startLoop() {
    if (timer) return;
    lastTime = performance.now();
    timer = requestAnimationFrame(loopTick);
  }
  // 🌫️ 凋零之盾：破盾瞬间立即结算行动条 +50%（事件驱动；988 主循环兜底，_witherShieldBoosted 防重）
  const onWitherShieldBroken = ({ enemy }) => {
    if (battleDestroyed || state.battleEnd || !enemy || enemy.hp <= 0) return;
    if (enemy._witherShieldBoosted) return;
    enemy._witherShieldBoosted = true;
    const boostPct = enemy._witherShieldBoostPct ?? 0.5;
    enemy.actionProgress = Math.min((enemy.actionProgress || 0) + ACTION_MAX * boostPct, ACTION_MAX);
    battleLog(`🌫️ ${enemy.name} 护盾破碎，行动条提升 ${Math.round(boostPct * 100)}%`);
    emitter.emit('enemyBuff', { enemyName: enemy.name, enemyUid: enemy.uid, buffName: `行动条+${Math.round(boostPct * 100)}%` });
  };
  emitter.on('witherShieldBroken', onWitherShieldBroken);
  // 👑 二阶段入场动画播完 → 解除变身无敌（ruchang 期间免疫所有伤害，防止多段伤害打断变身）
  emitter.on('phase2EnterDone', ({ enemyUid } = {}) => {
    const e = (enemies || []).find(x => x && x.uid === enemyUid)
    if (e) {
      e._phase2Invincible = false
      clearTimeout(e._phase2InvincibleTimer)
    }
    // 🎬 慢动作：ruchang 入场动画播完 0.5 秒后恢复正常速度
    setTimeout(() => { slowMoFactor = 1 }, 500)
  });
  function loopTick(now) {
    // 战斗销毁直接终止循环
    if (battleDestroyed) {
      stopLoop();
      return;
    }

    // 计算帧间隔时间，限制最大差值，防止安卓卡顿时间跳变导致进度暴涨
    // 🎬 慢动作：变身演出期间 delta 乘以 slowMoFactor（<1 时行动条/战斗节奏变慢）
    if (now >= slowMoUntil) slowMoFactor = 1;
    const delta = Math.min(now - lastTime, 150) * slowMoFactor;
    lastTime = now;
    accumulator += delta;

    // 固定步长执行逻辑：无论帧率高低，逻辑执行频率恒定
    while (accumulator >= FIXED_STEP) {
      accumulator -= FIXED_STEP;

      // 暂停/角色行动中/战斗结束，跳过本次逻辑
      if (loopPaused || state.acting || state.battleEnd) continue;

      advanceActionBar(player);

      // 队友行动条增长 for循环无GC
      for (let i = 0, len = allies.length; i < len; i++) {
        const u = allies[i];
        advanceActionBar(u);
      }

      // 敌人行动条增长（💖 犹怜：冻结中不增长；解锁后获取速率永久降低 50%）
      const charmSlow = hasTalent('charm_freeze') ? 1 - (Number(user.getTalentEffect?.('charm_freeze', 'actionBarReducePct') ?? 50) || 0) / 100 : 1
      for (let i = 0, len = enemies.length; i < len; i++) {
        const e = enemies[i];
        // 🌫️ 凋零之盾破盾结算：护盾被击破 → 自身行动条 +50%（仅一次）
        if (e._witherShieldBroken && !e._witherShieldBoosted) {
          e._witherShieldBoosted = true;
          const boostPct = e._witherShieldBoostPct ?? 0.5;
          e.actionProgress = Math.min((e.actionProgress || 0) + ACTION_MAX * boostPct, ACTION_MAX);
          battleLog(`🌫️ ${e.name} 护盾破碎，行动条提升 ${Math.round(boostPct * 100)}%`);
          emitter.emit('enemyBuff', { enemyName: e.name, enemyUid: e.uid, buffName: `行动条+${Math.round(boostPct * 100)}%` });
        }
        if (e._charmFrozen) continue; // 💖 犹怜：敌人行动条冻结中
        advanceActionBar(e, charmSlow);
      }

      globalAT += 1;
      checkWhoAct();
      checkGlobalRound();
    }

    // 继续下一帧渲染
    timer = requestAnimationFrame(loopTick);
  }
  function stopLoop() {
  cancelAnimationFrame(timer);
  timer = null;
}

  // ====================
  // 行动判断：【先查眩晕 → 再走回合开始结算】
  // ====================
  function checkWhoAct() {
    if (frozen) return   // ⭐ 加这个
    //我方 = 主角+活着队友
    const aliveAllies = allies.filter(x => x.hp > 0)
    const units = [player, ...aliveAllies, ...enemies.filter(e => e.hp > 0)]
    const ready = units.filter(u => u.actionProgress >= ACTION_MAX)
    if (ready.length === 0) return

    ready.sort((a, b) => b.speed - a.speed)
    const first = ready[0]

    if (first.hp <= 0) {
      first.actionProgress -= ACTION_MAX
      checkBattleEnd(playerHand)
      return
    }
    onTurnStart(first)

    // 🔥 瞬连突袭：判断是否是连续行动（上次行动者也是玩家）
    player._continuousStrikeNextTurn = (first === player) && _lastActorWasPlayer;
    // 更新上次行动者
    _lastActorWasPlayer = (first === player);

    //区分：主角手动、队友AI自动、敌人AI
    if (first === player) {
      // 🥴 玩家被晕眩 → 跳过本回合行动
      if (player._stunTurns > 0) {
        player._stunTurns -= 1;
        battleLog(`🥴 玩家被晕眩，跳过行动（剩余 ${player._stunTurns} 回合）`);
        player.actionProgress -= ACTION_MAX;
        onTurnEnd(player);
        endAction();
      } else {
        triggerPlayer()
      }
    } else if (allies.includes(first)) {
      triggerAlly(first)
    } else {
      // 敌人被冻结 → 跳过本回合行动
      // 💖 优待：敌人第一次行动不会出手（跳过第一回合）
      if (first._skipFirstTurn) {
        first._skipFirstTurn = false;
        battleLog(`💖 ${first.name} 受优待影响，跳过第一次行动`);
        first.actionProgress -= ACTION_MAX;
        onTurnEnd(first);
        endAction();
      } else if (first._frozenThisTurn) {
        battleLog(`🥶 ${first.name} 被冻结，跳过行动`);
        first.actionProgress -= ACTION_MAX;
        onTurnEnd(first);
        endAction();
      } else {
        triggerEnemy(first)
      }
    }
  }

  // ====================
  // 1. 行动开始结算（流血、扣回合、刷新速度）
  // ====================
  // 🧪 给玩家施加中毒层数（毒系怪普攻/毒爆/死亡被动共用）
  //    毒可叠加：stacks 层数，剩余回合 = max(已有, turns)
  //    伤害口径：每层 50% 来源攻击力，层数每 +1 层 +25 个百分点（层1=50%、层2=75%、层3=100%…）
  function applyPlayerPoison(source, stacks = 1, turns = 3) {
    if (!player || state.battleEnd) return
    player.debuffs = player.debuffs || []
    let pb = player.debuffs.find(d => d.type === 'player_poison')
    if (!pb) {
      pb = {
        name: '中毒',
        type: 'player_poison',
        remaining: turns,
        stacks: 0,
        attack: source?.attack || 1,
        poisonRatio: source?.attackPoison?.ratio ?? source?.poisonRatio ?? 0.5,
      }
      player.debuffs.push(pb)
    } else {
      pb.remaining = Math.max(pb.remaining, turns)
      // 🎯 毒伤倍率：优先取施毒者配置（普攻 attackPoison.ratio），沿用已有值兜底
      pb.poisonRatio = source?.attackPoison?.ratio ?? source?.poisonRatio ?? pb.poisonRatio ?? 0.5
    }
    pb.stacks = (pb.stacks || 0) + stacks
    pb.attack = source?.attack || pb.attack // 毒伤按最新施毒者攻击力
    _playerInstanceCache?.showBuffText?.(`${t('poison')}×${pb.stacks}`)
    try { emitter.emit('playerPoison', { stacks: pb.stacks, remaining: pb.remaining }) } catch (e) { /* ignore */ }
    battleLog(`🧪 ${source?.name || '敌人'} 给玩家施毒：+${stacks} 层 → 共 ${pb.stacks} 层（剩 ${pb.remaining} 回合）`)
  }

  // 🧪 中毒发作（玩家回合开始结算）：层数越高伤害越高，结算后回合数在 debuffs 统一递减
  //    ✅ 已收敛：tickPlayerPoison 移至 SkillDamage.js 并在 dotSystem.js 注册，
  //      由下方 onTurnStart 的统一 DOT 循环（getDotTick）结算，不再单独调用

  // ⏱️ 技能冷却统一递减：单值 skillCdRemain（队友）与数组 skillCds（敌人）两种形态都 -1
  //    收敛前队友/敌人各写各的递减；统一后一个入口管所有技能冷却
  function tickSkillCooldowns(unit) {
    if (unit.skillCdRemain !== undefined && unit.skillCdRemain > 0) {
      unit.skillCdRemain -= 1;
    }
    if (Array.isArray(unit.skillCds)) {
      unit.skillCds = unit.skillCds.map(cd => Math.max(0, (cd || 0) - 1));
    }
  }

  function onTurnStart(target) {
    // 🔥 玩家回合开始时的天赋效果
    if (target === player) {
      _isPlayerTurn = true; // 🎯 玩家回合开始（出牌阶段受伤不播 shoushang）
      player._physCardUsedThisTurn = 0; // 💥 致命一击：每回合第一张物理牌计数重置
      // 💖 犹怜：玩家开始回合后，解除敌人行动条冻结（仅首次）
      if (hasTalent('charm_freeze')) { enemies.forEach(x => { if (x._charmFrozen) { x._charmFrozen = false; } }); }
      applyPlayerTurnStartTalents(player);
      refreshLeaderBuff(player, allies); // 👑 首领：玩家回合开始按场上召唤物数量刷新加成
      refreshCrownBuff(player, allies); // 👑 精灵王冠：回合开始刷新
    }

    // 🔥 NPC 队友回合开始：技能冷却 -1（用完技能后的下一回合开始计数）
    if (target.isNpcAlly) {
      tickSkillCooldowns(target);
    }

    // 🔥 黑米被动「动若脱兔」：自身回合开始时，随机一个敌人减少 10% 行动条
    if (target.isNpcAlly && target.passiveType === 'enemyActionBarReduce' && target.hp > 0) {
      const aliveEne = enemies.filter(e => e.hp > 0);
      if (aliveEne.length > 0) {
        const rand = aliveEne[pickIndex(aliveEne.length)];
        const pct = target.passiveValue ?? 10;
        pushback(rand, pct);
        battleLog(`🧙 ${target.name} 被动：${rand.name} 行动条 -${Math.round(pct)}%`);
      }
    }

    // 🎯 敌人回合开始：
    //   1. 技能冷却 -1
    //   2. 受击飞翔被动：本回合重置标记（每回合可触发一次）
    //   3. 飞翔状态结束（持续至「回合开始」）
    if (target.camp === 'enemy') {
      _isPlayerTurn = false; // 🎯 敌人回合开始（玩家待机，受伤正常播 shoushang）
      tickSkillCooldowns(target);
      // 🌿 再生被动：敌人回合开始时恢复 12% 已损失生命值
      const regenP = target.passives.find(p => p.type === 'regen')
      if (regenP && target.hp > 0 && target.hp < target.maxHp) {
        const lost = target.maxHp - target.hp
        const heal = Math.max(1, Math.round(lost * (regenP.pct ?? 0.12) * 100) / 100)
        target.hp = Math.min(target.maxHp, target.hp + heal)
        battleLog(`🌿 ${target.name} 再生：回合开始恢复 ${heal} 点生命`)
        emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: `+${heal} 再生` })
      }
      if (target._hitFlyTriggeredThisTurn !== undefined) {
        target._hitFlyTriggeredThisTurn = false
      }
      // 飞翔结束：回合开始时解除无法受伤状态（视觉上回到地面/恢复受击）
      if (target._flying) {
        target._flying = false
        // 🐦 停止飞翔特殊动画，恢复待机（渲染层监听）
        if (target.uid !== undefined) {
          emitter.emit('enemyFly', { enemyUid: target.uid, flying: false })
        }
        if (target._onFlyEnd) target._onFlyEnd()
      }
    }

    // 💧 水愈：自身回合开始时，恢复 maxHp * healRatio（持续3回合）
    //    在 buff 倒计时之前触发（remaining>0 表示当前回合仍生效）
    if (target === player) {
      target.buffs.forEach(b => {
        if (b.type === 'heal_over_time' && b.remaining > 0) {
          const healAmt = Math.round(player.maxHp * b.healRatio * 100) / 100;
          applyHeal(target, healAmt, 'heal');
          battleLog(`💧 水愈：回合开始恢复 ${healAmt} 点生命`);
        }
      });
    }

    // 🧪 中毒（玩家）：已收敛进下方统一 DOT 循环（getDotTick 按 player_poison 注册结算），不再单独调用

    //有益buff区域
    target.buffs = target.buffs.filter(b => {
      // 只减1次！！！
      if (b.isPermanent) return true
      b.remaining--

      if (b.remaining <= 0) {
        // 🎬 自动移除该 buff 的持续特效（effectConfig 里 loop: true 的 buff 特效，
        //    播放时挂在 target.buffFxMap[b.name]，这里统一清理）
        const fxMap = target.buffFxMap;
        if (fxMap && fxMap[b.name]) {
          try { returnEffect(fxMap[b.name].effectName, fxMap[b.name].spine); } catch (e) { /* ignore */ }
          delete fxMap[b.name];
        }
        // 🧹 到期清理：按 type / name 查表（buffCleanup.js 注册；type 与 name 可叠加，
        //    如 风之庇佑 = speed_buff 恢复速度 + 专属清理恢复射击，与原 if 链等价）
        const typeCleaner = BUFF_TYPE_CLEANUP[b.type]
        const nameCleaner = BUFF_NAME_CLEANUP[b.name]
        try {
          typeCleaner?.(target, b, player, BUFF_CLEANUP_HELPERS)
          nameCleaner?.(target, b, player, BUFF_CLEANUP_HELPERS)
        } catch (e) { console.error('[buff清理] 异常:', b.type || b.name, e) }
        return false
      }
      return true
    })
    //负面buff区域
    target._frozenThisTurn = false;

    // 🔥 黑米「洞悉」易伤倒计时：每回合 -1，归零移除
    if (target._allyDamageTakenDebuff && target.hp > 0) {
      const deb = target._allyDamageTakenDebuff;
      deb.remaining -= 1;
      if (deb.remaining <= 0) {
        target.damageTaken = Math.max(0, (target.damageTaken || 0) - deb.value);
        delete target._allyDamageTakenDebuff;
      }
    }

    target.debuffs = target.debuffs.filter(d => {
      const name = d.name

      // 🎯 统一 DOT 结算：按 debuff 类型/名字查注册表（流血/灼烧/瘴毒/毒雾…）
      //    新持续伤害在 dotSystem.js 注册即可，这里不再需要改
      const dotTick = getDotTick(d)
      if (dotTick) {
        try { dotTick(target, player, playerHand, name, d) } catch (e) { /* 忽略 */ }
      }

      // 冻结：本回合跳过行动
      if (name === '冻结') {
        target._frozenThisTurn = true;
      }

      if (d.isPermanent) return true
      d.remaining--
      // debuff 消失时的清理
      if (d.remaining <= 0) {
        // 🧹 到期清理：按名字查表（buffCleanup.js 注册，新 debuff 在此注册即可）
        const nameCleaner = DEBUFF_NAME_CLEANUP[name]
        try { nameCleaner?.(target, d, player, BUFF_CLEANUP_HELPERS) } catch (e) { console.error('[debuff清理] 异常:', name, e) }
      }
      return d.remaining > 0
    })

    // 🧪 玩家毒剩余回合同步 UI（毒图标右上角数字随回合递减刷新）
    if (target === player) {
      const pbSync = (player.debuffs || []).find(d => d.type === 'player_poison')
      try { emitter.emit('playerPoison', { stacks: pbSync?.stacks || 0, remaining: pbSync?.remaining || 0 }) } catch (err) { /* ignore */ }
      // ⚔️ 攻击力提升状态图标维护（攻击回落至基础值则隐藏）
      reconcileAtkUpIcon(player)
      // 🩸 玩家 debuff 变化强制同步：把最新 buff 快照直接传给 pixi 重建图标（绕过 props 响应式链路）
      try {
        const snap = [...(player.buffs || []), ...(player.debuffs || [])].filter(b => b && b.name);
        console.log('[ForceSync] emit snap =', snap.map(b => b.name + ':' + (b.remaining ?? '?')));
        emitter.emit('playerBuffsForceSync', snap);
      } catch (e) { /* ignore */ }
    }

    // 🔥 天赋：厄运 - 敌人行动时概率受到幸运值伤害（幸运收敛 + 未触发保底递增，触发后重置）
    if (target !== player && hasTalent('enemy_luck_dmg') && target.hp > 0) {
      const lv = _userStoreCache.getTalentLevel?.('enemy_luck_dmg') || 1;
      const ratioArr = talentFx('enemy_luck_dmg', 'dmgRatios', [0.6, 0.75, 0.9, 1.05, 1.2]);
      const dmgRatio = ratioArr[lv - 1] || 1.8;
      // 基础概率50%+统一幸运提升+未触发每次+incProb（触发后重置，战斗结束重置）
      const luck = player.luck ?? 0;
      const finalProb = Math.min(0.99, _userStoreCache.luckProb(_luckEnemyDmgProb));
      if (chance(finalProb)) {
        const rawDmg = player.luck * dmgRatio;
        calculateFinalDamage(rawDmg, target, { ignoreArmor: 1, dmgType: 'null', player: player, buff: null, applyElement: false, enemies: [], skillName: '厄运' });
        emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffDoom') });
        _luckEnemyDmgProb = talentFx('enemy_luck_dmg', 'baseProb', 0.5); // 触发后重置
      } else {
        _luckEnemyDmgProb = Math.min(0.99, _luckEnemyDmgProb + talentFx('enemy_luck_dmg', 'incProb', 0.05));
        battleLog(`[天赋] 厄运：未触发，下次概率→${(_luckEnemyDmgProb * 100).toFixed(0)}%`);
      }
    }

  }
  // ====================
  // 2. 行动结束结算（中毒、持续治疗）
  // ====================
  function onTurnEnd(target) {
    // 玩家回合结束，调用回调
    if (target === player) {
      // 🔥 云弥「灵力充能」持续1回合：玩家回合结束时，回收突破上限的灵力
      const manaAlly = allies.find(a => a.isNpcAlly && a.manaOverride > 0 && a.hp > 0);
      if (manaAlly) {
        if (player.mp > player.maxMp) {
          player.mp = player.maxMp; // 扣回超出上限的灵力
        }
        manaAlly.manaOverride = 0; // 清空记录
      }
      onPlayerTurnStart?.(); // 调用外部Vue页面的冷却回调
    }

    // 🔥 旧版 actionBar 被动：回合结束时提升 5% 行动条
    //    （黑米已改用 enemyActionBarReduce 被动，此处仅保留兼容其他使用 actionBar 的队友）
    if (target.isNpcAlly && target.passiveType === 'actionBar' && target.hp > 0) {
      target.actionProgress = Math.min(target.actionProgress + ACTION_MAX * 0.05, ACTION_MAX);
    }

    target.buffs.forEach(b => {
      if (b.type === 'heal' && b.remaining > 0) {
        const val = b.value
        applyHeal(target, val, 'heal');
        battleLog(`💚 ${target.name} 持续治疗：${val}`)
      }
    })

    // 🌬️ 敌人被动「御风」（风息）：自身回合结束时速度提升 5%，至多提升至 50%
    if (target.camp === 'enemy' && target.hp > 0 && Array.isArray(target.passives)) {
      const windSpeedUp = target.passives.find(p => p.type === 'windSpeedUp')
      if (windSpeedUp && target.baseSpeed) {
        const perTurn = windSpeedUp.speedBoostPerTurn ?? 0.05      // 每回合 +5%
        const maxBoost = windSpeedUp.maxSpeedBoost ?? 0.5           // 至多 +50%
        const curBoost = target._windSpeedBoost || 0                // 当前已叠加的提速
        if (curBoost < maxBoost) {
          const nextBoost = Math.min(maxBoost, curBoost + perTurn)
          const speedAdd = Math.round(target.baseSpeed * perTurn * 100) / 100
          target.speed = Math.round((target.speed + speedAdd) * 100) / 100
          target._windSpeedBoost = nextBoost
          // 🎈 御风是风息的有益 buff：在风息身上浮现 buff 文字（走 enemyBuff 事件 → 敌人头顶）
          if (target.uid !== undefined) {
            emitter.emit('enemyBuff', {
              enemyName: target.name,
              enemyUid: target.uid,
              buffName: `${t('windRide')} ${t('speed')}+${Math.round((target.speed / target.baseSpeed - 1) * 100)}%`,
            })
          }
          battleLog(`🌬️ ${target.name} 御风：速度 +${perTurn * 100}%（累计 ${Math.round(nextBoost * 100)}%）`)
        }
      }
    }
  }

  //友军AI自动行动：打站位最前存活敌人
  function triggerAlly(allyUnit) {
    state.acting = true
    state.currentActor = 'player'
    state.phase = 'resolving'

    const aliveEne = enemies.filter(e => e.hp > 0).sort((a, b) => a.position - b.position)
    const target = aliveEne[0]

    // 💖 偏爱：召唤物行动时，提升召唤物自身 5% 全属性（每次行动生效，可叠加）
    if (allyUnit && !allyUnit._isDead && !allyUnit._inAction &&
      (allyUnit.isWaterSpirit || allyUnit.isThunderSpirit || allyUnit.isIceSpirit || allyUnit.isFireSpirit || allyUnit.isShadowClone)) {
      const _favPct = user.hasTalent?.('favor_charm') ? (Number(user.getTalentEffect?.('favor_charm', 'attrPct') ?? 0) || 0) / 100 : 0;
      if (_favPct > 0) {
        if (allyUnit.maxHp > 0) {
          allyUnit.maxHp = Math.round(allyUnit.maxHp * (1 + _favPct));
          allyUnit.hp = Math.min(allyUnit.maxHp, Math.round((allyUnit.hp ?? allyUnit.maxHp) * (1 + _favPct)));
        }
        if (allyUnit.attack != null) allyUnit.attack = Math.round((allyUnit.attack ?? 0) * (1 + _favPct));
        if (allyUnit.armor != null) allyUnit.armor = Math.round((allyUnit.armor ?? 0) * (1 + _favPct));
        if (allyUnit.magicResist != null) allyUnit.magicResist = Math.round((allyUnit.magicResist ?? 0) * (1 + _favPct));
        if (allyUnit.speed != null) {
          allyUnit.speed = Math.round(allyUnit.speed * (1 + _favPct) * 10) / 10;
          allyUnit.baseSpeed = allyUnit.speed; // 同步 baseSpeed，防止回合刷新速度时覆盖
        }
        if (allyUnit.luck != null) allyUnit.luck = Math.round((allyUnit.luck ?? 0) * (1 + _favPct));
        battleLog(`💖 ${allyUnit.name} 行动：偏爱生效，全属性 +${Math.round(_favPct * 100)}%`);
      }
    }

    // ==============================
    // 🌊 【水精灵逻辑】开始（最近敌人 + attack 动画 + 水伤 + 持续回合递减）
    // ==============================
    if (allyUnit.isWaterSpirit) {
      if (allyUnit._isDead || allyUnit._inAction || !enemies.some(e => e.hp > 0)) return
      allyUnit._inAction = true

      // 🎯 最近的存活敌人（以玩家数据坐标为基准，与云弥被动口径一致）
      const ownerX = allyUnit.owner?.x ?? 0
      const aliveEne = enemies.filter(e => e.hp > 0)
      // 🐛 修复：reduce 不传 null 初始值（否则第一轮 a 为 null 读取 a.x 报错）；上层已保证 aliveEne 非空
      const target = aliveEne.reduce((a, b) => Math.abs(a.x - ownerX) <= Math.abs(b.x - ownerX) ? a : b)
      if (!target) {
        setTimeout(() => {
          if (frozen || state.battleEnd) return
          allyUnit.actionProgress -= ACTION_MAX
          onTurnEnd(allyUnit)
          allyUnit._inAction = false
          endAction()
        }, 100)
        return
      }

      // 🎬 播放 attack 动画（一次性），播完回 idle
      const spiritSpine = allyUnit.spineInstance
      if (spiritSpine && spiritSpine.state) {
        const anims = spiritSpine.skeleton?.data?.animations || []
        if (anims.some(a => a.name === 'attack')) {
          spiritSpine.state.setAnimation(0, 'attack', false)
          if (anims.some(a => a.name === 'idle')) {
            spiritSpine.state.addAnimation(0, 'idle', true, 0)
          }
        }
      }

      // 💧 水精灵行动：为玩家恢复 70/75/80% 攻击力的生命值（用召唤时攻击快照）
      const owner = allyUnit.owner
      const ownerAtk = allyUnit._atkSnapshot ?? owner?.attack ?? 0
      const healAmt = Math.round(ownerAtk * (allyUnit.healRatio ?? 0.7) * 100) / 100
      battleLog(`🌊 ${allyUnit.name} 行动：为玩家恢复 ${healAmt} 点生命（${Math.round((allyUnit.healRatio ?? 0.7) * 100)}%攻击力）`)
      // 🎵 治疗音效（配置 EFFECT_CONFIG 水精灵 的 attackSound，未配置则静默）
      const spiritSfx = getSummonSound('水精灵', 'attack')
      if (spiritSfx) user.playSoundEffect(spiritSfx.sound, spiritSfx.volume)

      setTimeout(() => {
        if (frozen || state.battleEnd) return
        if (owner?.hp > 0 && !owner._isDead) {
          applyHeal(owner, healAmt, 'heal') // 💧 统一治疗入口（自动吃水精灵 15% 光环 + 灵愈等天赋）
        }
      }, 350)

      // 行动结算：持续回合-1，耗尽离场
      setTimeout(() => {
        if (frozen || state.battleEnd) return
        allyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(allyUnit)

        allyUnit.spiritTurns = (allyUnit.spiritTurns ?? 3) - 1
        if (allyUnit.turnText) allyUnit.turnText.text = String(Math.max(0, allyUnit.spiritTurns)) // 🔢 更新剩余回合数
        if (allyUnit.spiritTurns <= 0) {
          allyUnit._isDead = true
          const idx = allies.findIndex(a => a === allyUnit)
          if (idx !== -1) allies.splice(idx, 1)
          refreshCrownBuff(allyUnit.owner, allies) // 👑 精灵王冠：精灵退场刷新（四系不齐即移除加成）
          // ⚡ 雷精灵全部离场后取消玩家的雷伤加成，并移除雷灵祝福 buff（deep watch 自动隐藏图标）
          if (!allies.some(a => a.isThunderSpirit && a.hp > 0 && !a._isDead)) {
            allyUnit.owner._thunderSpiritBoost = false
            const ti = (allyUnit.owner?.buffs || []).findIndex(b => b.name === '雷灵祝福')
            if (ti !== -1) allyUnit.owner.buffs.splice(ti, 1)
          }
          // 💧 水精灵全部离场后取消玩家的水伤加成，并移除水灵祝福 buff（deep watch 自动隐藏图标）
          if (!allies.some(a => a.isWaterSpirit && a.hp > 0 && !a._isDead)) {
            allyUnit.owner._waterSpiritBoost = false
            const wi = (allyUnit.owner?.buffs || []).findIndex(b => b.name === '水灵祝福')
            if (wi !== -1) allyUnit.owner.buffs.splice(wi, 1)
          }
          // ❄️ 冰精灵全部离场后取消玩家的冰伤加成，并移除冰灵祝福 buff（deep watch 自动隐藏图标）
          if (!allies.some(a => a.isIceSpirit && a.hp > 0 && !a._isDead)) {
            allyUnit.owner._iceSpiritBoost = false
            const ii = (allyUnit.owner?.buffs || []).findIndex(b => b.name === '冰灵祝福')
            if (ii !== -1) allyUnit.owner.buffs.splice(ii, 1)
          }
          // 🎬 退场：倒序播放 ruchang（从末尾到开头），播完才回收 spine
          const sp = allyUnit.spineInstance
          if (sp && sp.state) {
            const anims = sp.skeleton?.data?.animations || []
            if (anims.some(a => a.name === 'ruchang')) {
              const track = sp.state.setAnimation(0, 'ruchang', false)
              if (track) {
                track.timeScale = -1 // 🔁 倒放
                track.trackTime = track.animation?.duration ?? 1 // 从末尾开始倒放
              }
              const dur = (track?.animation?.duration ?? 1) * 1000
              setTimeout(() => {
                if (frozen || state.battleEnd) return
                allyUnit.onDeactivate?.()
              }, dur)
            } else {
              allyUnit.onDeactivate?.()
            }
          }
          battleLog('🌊 水精灵持续回合耗尽，离场')
        }
        allyUnit._inAction = false
        endAction()
      }, 500)
      return
    }

    // ==============================
    // ⚡ 【雷精灵逻辑】开始（行动时给玩家加行动条 + 攻击力 buff，持续回合递减）
    // ==============================
    if (allyUnit.isThunderSpirit) {
      if (allyUnit._isDead || allyUnit._inAction) return
      allyUnit._inAction = true

      // 🎬 播放 attack 动画（一次性），播完回 idle
      const spiritSpine = allyUnit.spineInstance
      if (spiritSpine && spiritSpine.state) {
        const anims = spiritSpine.skeleton?.data?.animations || []
        if (anims.some(a => a.name === 'attack')) {
          spiritSpine.state.setAnimation(0, 'attack', false)
          if (anims.some(a => a.name === 'idle')) {
            spiritSpine.state.addAnimation(0, 'idle', true, 0)
          }
        }
      }

      // ⚡ 玩家行动条 +16/20/24%（强化后 ×1.08，上限 ACTION_MAX）
      const owner = allyUnit.owner
      const actionRatio = allyUnit.actionGainRatio ?? 0.16
      const buffPower = allyUnit.buffPower ?? 1
      owner.actionProgress = Math.min(ACTION_MAX, (owner.actionProgress || 0) + Math.round(ACTION_MAX * actionRatio * buffPower))
      // ⚡ 玩家攻击力 +9/13/17%（强化后 ×增益效果）：永久加法叠加（每次行动累加，不随时间衰减）
      const atkRatio = allyUnit.atkBuffRatio ?? 0.09
      const atkPct = Math.round(atkRatio * buffPower * 100)
      const atkUp = Math.floor((allyUnit._atkSnapshot ?? (owner.baseAttack || 0)) * atkRatio * buffPower * 100) / 100
      const lb = owner.buffs.find(b => b.name === '雷之祝福')
      if (lb) {
        lb.atkUp = Math.round((lb.atkUp + atkUp) * 100) / 100
        lb.atkPct = Math.round((lb.atkPct + atkPct) * 100) / 100
        owner.attack += atkUp
      } else {
        owner.buffs.push({
          name: '雷之祝福',
          type: 'allStats',
          remaining: 999,
          isPermanent: true,
          atkUp,
          atkPct,
          armorUp: 0,
          speedUp: 0,
          luckUp: 0
        })
        applyBuffSideEffects(owner, { type: 'allStats', atkUp, armorUp: 0, speedUp: 0, luckUp: 0 })
      }
      // ✨ 玩家身上显示浮动 buff 文字
      user.pixi.playerInstance?.showBuffText?.('雷精灵的祝福')
      battleLog(`⚡ ${allyUnit.name} 行动：玩家行动条 +${Math.round(actionRatio * buffPower * 100)}%，攻击力 +${atkUp}（雷之祝福累计 +${lb ? Math.round(lb.atkUp * 100) / 100 : atkUp}）`)

      // 行动结算：持续回合-1，耗尽离场
      setTimeout(() => {
        if (frozen || state.battleEnd) return
        allyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(allyUnit)

        allyUnit.spiritTurns = (allyUnit.spiritTurns ?? 3) - 1
        if (allyUnit.turnText) allyUnit.turnText.text = String(Math.max(0, allyUnit.spiritTurns)) // 🔢 更新剩余回合数
        if (allyUnit.spiritTurns <= 0) {
          allyUnit._isDead = true
          const idx = allies.findIndex(a => a === allyUnit)
          if (idx !== -1) allies.splice(idx, 1)
          refreshCrownBuff(allyUnit.owner, allies) // 👑 精灵王冠：精灵退场刷新（四系不齐即移除加成）
          // 🎬 退场：倒序播放 ruchang（从末尾到开头），播完才回收 spine
          const sp = allyUnit.spineInstance
          if (sp && sp.state) {
            const anims = sp.skeleton?.data?.animations || []
            if (anims.some(a => a.name === 'ruchang')) {
              const track = sp.state.setAnimation(0, 'ruchang', false)
              if (track) {
                track.timeScale = -1 // 🔁 倒放
                track.trackTime = track.animation?.duration ?? 1 // 从末尾开始倒放
              }
              const dur = (track?.animation?.duration ?? 1) * 1000
              setTimeout(() => {
                if (frozen || state.battleEnd) return
                allyUnit.onDeactivate?.()
              }, dur)
            } else {
              allyUnit.onDeactivate?.()
            }
          }
          battleLog('⚡ 雷精灵持续回合耗尽，离场')
        }
        allyUnit._inAction = false
        endAction()
      }, 500)
      return
    }

    // ==============================
    // ❄️ 【冰精灵逻辑】开始（行动时抽牌 + 降费，持续回合递减）
    // ==============================
    if (allyUnit.isIceSpirit) {
      if (allyUnit._isDead || allyUnit._inAction) return
      allyUnit._inAction = true

      // 🎬 播放 attack 动画（一次性），播完回 idle
      const spiritSpine = allyUnit.spineInstance
      if (spiritSpine && spiritSpine.state) {
        const anims = spiritSpine.skeleton?.data?.animations || []
        if (anims.some(a => a.name === 'attack')) {
          spiritSpine.state.setAnimation(0, 'attack', false)
          if (anims.some(a => a.name === 'idle')) {
            spiritSpine.state.addAnimation(0, 'idle', true, 0)
          }
        }
      }

      // 🃏 抽牌 + 降费（交由战斗 UI 处理：固定抽 1 张灵力-1，再随机1张消耗>0手牌-1灵力）
      emitter.emit('iceSpiritAction', { drawCount: 1 })
      battleLog(`❄️ ${allyUnit.name} 行动：抽1张牌（灵力-1）`)

      // 行动结算：持续回合-1，耗尽离场
      setTimeout(() => {
        if (frozen || state.battleEnd) return
        allyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(allyUnit)

        allyUnit.spiritTurns = (allyUnit.spiritTurns ?? 3) - 1
        if (allyUnit.turnText) allyUnit.turnText.text = String(Math.max(0, allyUnit.spiritTurns)) // 🔢 更新剩余回合数
        if (allyUnit.spiritTurns <= 0) {
          allyUnit._isDead = true
          const idx = allies.findIndex(a => a === allyUnit)
          if (idx !== -1) allies.splice(idx, 1)
          refreshCrownBuff(allyUnit.owner, allies) // 👑 精灵王冠：精灵退场刷新（四系不齐即移除加成）
          // 🎬 退场：倒序播放 ruchang（从末尾到开头），播完才回收 spine
          const sp = allyUnit.spineInstance
          if (sp && sp.state) {
            const anims = sp.skeleton?.data?.animations || []
            if (anims.some(a => a.name === 'ruchang')) {
              const track = sp.state.setAnimation(0, 'ruchang', false)
              if (track) {
                track.timeScale = -1 // 🔁 倒放
                track.trackTime = track.animation?.duration ?? 1 // 从末尾开始倒放
              }
              const dur = (track?.animation?.duration ?? 1) * 1000
              setTimeout(() => {
                if (frozen || state.battleEnd) return
                allyUnit.onDeactivate?.()
              }, dur)
            } else {
              allyUnit.onDeactivate?.()
            }
          }
          battleLog('❄️ 冰精灵持续回合耗尽，离场')
        }
        allyUnit._inAction = false
        endAction()
      }, 500)
      return
    }

    // ==============================
    // 🔥 【火精灵逻辑】开始（最近敌人 + attack 动画 + 火伤 + 持续回合递减）
    // ==============================
    if (allyUnit.isFireSpirit) {
      if (allyUnit._isDead || allyUnit._inAction || !enemies.some(e => e.hp > 0)) return
      allyUnit._inAction = true

      // 🎯 最近的存活敌人（以玩家数据坐标为基准，与云弥被动口径一致）
      const owner = allyUnit.owner
      const ownerX = owner?.x ?? 0
      const aliveEne = enemies.filter(e => e.hp > 0)
      const target = aliveEne.reduce((a, b) => Math.abs(a.x - ownerX) <= Math.abs(b.x - ownerX) ? a : b)
      if (!target) {
        setTimeout(() => {
          if (frozen || state.battleEnd) return
          allyUnit.actionProgress -= ACTION_MAX
          onTurnEnd(allyUnit)
          allyUnit._inAction = false
          endAction()
        }, 100)
        return
      }

      // 🎬 播放 attack 动画（一次性），播完回 idle
      const spiritSpine = allyUnit.spineInstance
      if (spiritSpine && spiritSpine.state) {
        const anims = spiritSpine.skeleton?.data?.animations || []
        if (anims.some(a => a.name === 'attack')) {
          spiritSpine.state.setAnimation(0, 'attack', false)
          if (anims.some(a => a.name === 'idle')) {
            spiritSpine.state.addAnimation(0, 'idle', true, 0)
          }
        }
      }

      // 🔥 火精灵行动：对最近敌人造成 90/100/110% 攻击力火属性伤害（攻击力=玩家攻击力）
      const dmg = Math.round((owner?.attack || 0) * (allyUnit.actionDmgRatio ?? 0.9) * 100) / 100
      battleLog(`🔥 ${allyUnit.name} 行动：对 ${target.name} 造成 ${dmg} 点火属性伤害（${Math.round((allyUnit.actionDmgRatio ?? 0.9) * 100)}%攻击力）`)
      // 🎵 攻击音效（配置 EFFECT_CONFIG 火精灵 的 attackSound，未配置则静默）
      const spiritSfx = getSummonSound('火精灵', 'attack')
      if (spiritSfx) user.playSoundEffect(spiritSfx.sound, spiritSfx.volume)

      // 🚀 火球特效：从火精灵位置飞向最近敌人（命中后结算伤害，与视觉同步）
      const fireSpine = allyUnit.spineInstance
      const fireEnemySp = getEnemySpinePos(target)
      const fireStart = {
        x: fireSpine ? fireSpine.x : (allyUnit.x ?? 0),
        y: fireSpine ? fireSpine.y * 0.9 : ((allyUnit.y ?? 0) * 0.9),
      }
      const fireEnd = fireEnemySp ? { x: fireEnemySp.x, y: fireEnemySp.y - 26 * VH } : { x: target.x, y: target.y } // 🎯 终点命中敌人头顶（脚底往上约26vh）
      playProjectile(
        getFightContainer() || _pixiAppCache,
        fireStart,
        fireEnd,
        {
          effectName: 'huoqiu',
          scale: 0.18, // 🔥 火球调大
          duration: 0.35,
          animName: 'animation',
          rotationFromAngle: true,
          zIndex: 100,
          createExplosion: true,
          explosionEffectName: 'baozha',
          onHit: () => {
            if (frozen || state.battleEnd) return
            calculateFinalDamage(dmg, target, { ignoreArmor: 0, dmgType: 'fire', player: owner, buff: null, applyElement: true, enemies: enemies, skillName: '火精灵' })
          },
        }
      )

      // 行动结算：持续回合-1，耗尽离场
      setTimeout(() => {
        if (frozen || state.battleEnd) return
        allyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(allyUnit)

        allyUnit.spiritTurns = (allyUnit.spiritTurns ?? 3) - 1
        if (allyUnit.turnText) allyUnit.turnText.text = String(Math.max(0, allyUnit.spiritTurns)) // 🔢 更新剩余回合数
        if (allyUnit.spiritTurns <= 0) {
          allyUnit._isDead = true
          const idx = allies.findIndex(a => a === allyUnit)
          if (idx !== -1) allies.splice(idx, 1)
          refreshCrownBuff(allyUnit.owner, allies) // 👑 精灵王冠：精灵退场刷新（四系不齐即移除加成）
          // 🎬 退场：倒序播放 ruchang（从末尾到开头），播完才回收 spine
          const sp = allyUnit.spineInstance
          if (sp && sp.state) {
            const anims = sp.skeleton?.data?.animations || []
            if (anims.some(a => a.name === 'ruchang')) {
              const track = sp.state.setAnimation(0, 'ruchang', false)
              if (track) {
                track.timeScale = -1 // 🔁 倒放
                track.trackTime = track.animation?.duration ?? 1 // 从末尾开始倒放
              }
              const dur = (track?.animation?.duration ?? 1) * 1000
              setTimeout(() => {
                if (frozen || state.battleEnd) return
                allyUnit.onDeactivate?.()
              }, dur)
            } else {
              allyUnit.onDeactivate?.()
            }
          }
          // 🔥 火精灵全部离场后取消玩家的火伤加成，并移除火灵祝福 buff（deep watch 自动隐藏图标）
          if (!allies.some(a => a.isFireSpirit && a.hp > 0 && !a._isDead)) {
            owner._fireSpiritBoost = false
            if (owner?.buffs) {
              const fi = owner.buffs.findIndex(b => b.name === '火灵祝福')
              if (fi !== -1) owner.buffs.splice(fi, 1)
            }
          }
          battleLog('🔥 火精灵持续回合耗尽，离场')
        }
        allyUnit._inAction = false
        endAction()
      }, 500)
      return
    }

    if (allyUnit.isShadowClone) {
      const shadowClone = allyUnit;
      const baseDmg = calculateSkillDamage("射击", shadowClone, {
        star: 1,
        name: "射击"
      });

      const target = enemies.find(e => e.hp > 0);
      if (!target) {
        // 没有敌人直接结束回合
        setTimeout(() => {
          shadowClone.actionProgress -= ACTION_MAX;
          onTurnEnd(shadowClone);
          endAction();
        }, 100);
        return;
      }

      // ✅ 参考主角：读取配置 + 多发连射逻辑
      // 🔥 性能优化：从缓存取配置
      const cfg = getCardData('射击');
      let hitCount = cfg.hitCount || 1;
      const fireInterval = 100;  // 发射间隔
      const flyDuration = 0.3;   // 单颗子弹飞行时长

      // 🎯 影分身子弹水平射击：
      //    高度由 EFFECT_CONFIG「影分身」的 bulletStartYFactor 控制（越大越往下）
      const cloneFx = getEffectConfig('影分身') || {};
      // 🎯 终点 x 用敌人 spine 实际渲染位置（屏幕坐标），fallback 数据坐标（否则子弹会停在半空）
      const cloneTargetSpine = getEnemySpinePos(target);
      const cloneTargetX = cloneTargetSpine ? cloneTargetSpine.x : target.x;
      const startPos = {
        x: shadowClone.spineInstance.x + 5 * (window.innerWidth / 100),
        y: shadowClone.spineInstance.y * (cloneFx.bulletStartYFactor ?? 0.9)
      };
      // 🎯 水平飞行：终点 y = 起点 y（和玩家射击一样不斜着飞）
      const endPos = {
        x: cloneTargetX - 3 * (window.innerWidth / 100),
        y: startPos.y
      };

      battleLog(`👥 影分身射击，发射 ${hitCount} 发子弹`);

      // 🎬 影分身攻击动画：触发 attack（骨骼里没有 attack 则跳过），播完自动接回 fight 循环
      const cloneSpine = shadowClone.spineInstance;
      if (cloneSpine?.state && cloneSpine.skeleton?.data?.animations) {
        const cAnims = cloneSpine.skeleton.data.animations;
        const cBack = cAnims.some(a => a.name === 'idle') ? 'idle'
          : (cAnims.some(a => a.name === 'idle') ? 'idle'
            : (cAnims.find(a => a.name !== 'attack' && a.name !== 'feixing' && a.name !== 'fly')?.name || cAnims[0]?.name));
        if (cAnims.some(a => a.name === 'attack') && cBack) {
          cloneSpine.state.setAnimation(0, 'attack', false);
          cloneSpine.state.addAnimation(0, cBack, true, 0);
        }
      }

      // ✅ 循环发射多发子弹（每发子弹响一次射击音效）
      for (let i = 0; i < hitCount; i++) {
        setTimeout(() => {
          if (state.battleEnd) return; // ✅ 战斗已结束，跳过
          const hasAlive = enemies.some(e => e.hp > 0);
          if (!hasAlive) return;

          // 🎵 影分身攻击音效 = 射击音效（配置 EFFECT_CONFIG 影分身 的 attackSound；每发子弹播放一次）
          const cloneSfx = getSummonSound('影分身', 'attack');
          if (cloneSfx) {
            user.playSoundEffect(cloneSfx.sound, cloneSfx.volume);
          }

          playSpineProjectile(
            // ✅ 用战斗特效层容器，和影分身 spine 同坐标系
            getFightContainer() || _pixiAppCache,
            startPos,
            endPos,
            "idle",
            flyDuration,
            0.2,  // 影分身子弹小一点
            () => {
              if (state.battleEnd) return; // ✅ 战斗已结束
              const aliveEnemies = enemies.filter(e => e.hp > 0);
              if (aliveEnemies.length === 0) return;

              const currentTarget = aliveEnemies.find(e => e.name === target.name) || aliveEnemies[0];
              if (currentTarget.hp <= 0) return;

              calculateFinalDamage(
                baseDmg,
                currentTarget,
                { ignoreArmor: 0, dmgType: 'physical', player: shadowClone, buff: {}, applyElement: true, enemies: [], skillName: '影分身' }
              );
            }
          );
        }, i * fireInterval);
      }

      // 协同作战：给主角加速
      if (shadowClone.speedUpAction) {
        const player = shadowClone.owner;
        advance(player, 30);
      }

      // ✅ 计算总时长：所有子弹发射完 + 飞行时间
      const totalDuration = (hitCount - 1) * fireInterval + flyDuration * 1000 + 300;

      setTimeout(() => {
        if (state.battleEnd) return; // ✅ 战斗已结束
        shadowClone.actionProgress -= ACTION_MAX;
        onTurnEnd(shadowClone);
        endAction();
      }, totalDuration);

      return;
    }
    // ==============================
    // 🧙 【携带的 NPC 队友】普攻 + 技能（技能冷却中只普攻）
    //    每个同伴技能类型不同，通过 skillType 区分：
    //      - enemyDamageTaken : 黑米「洞悉」全体受伤+15%
    //      - aoePushback      : 西亚「缠绕」全体伤害+推条
    //      - shield           : 晨曦「光之庇佑」玩家护盾
    //      - manaCharge       : 云弥「灵力充能」玩家灵力（突破上限）
    //    普攻类型通过 attackType 区分：
    //      - playerAtk : 基于玩家攻击力造成伤害
    //      - heal      : 治疗玩家
    //      - selfAtk   : 基于自身攻击力造成伤害（默认）
    // ==============================
    else if (allyUnit.isNpcAlly) {
      // 判断技能是否可用
      const canUseSkill = (allyUnit.skillCdRemain ?? 0) <= 0;
      const skillType = allyUnit.skillType || 'damage';

      // 🎬 播放队友行动动画：
      //    普攻默认播放 attack；使用技能时播放该技能配置的 skillAnim（在 skillList 每项里配置，
      //    切换技能时由 TeamAllies 同步到 allyUnit.skillAnim，可给两个技能配不同动作）
      const allyNpcSpine = getNpcAllySpine();
      if (allyNpcSpine?.spine && allyNpcSpine.spine.skeleton?.data?.animations) {
        const animations = allyNpcSpine.spine.skeleton.data.animations;
        const hasFightAnim = animations.some(a => a.name === 'idle');
        // ⚠️ 战斗中回切动画优先 fight（战斗中默认 fight，idle 仅在非战斗场景用）
        // 没有 fight 就选 idle；再没有就选第一个非 attack/feixing/fly 的动画兜底
        const backAnim = hasFightAnim
          ? 'idle'
          : (animations.some(a => a.name === 'idle')
              ? 'idle'
              : (animations.find(a => a.name !== 'attack' && a.name !== 'feixing' && a.name !== 'fly')?.name || animations[0]?.name));
        // 目标动画：技能时优先配置的 skillAnim/skillAction，普攻默认 attack；
        //   若指定动画在骨骼中不存在则回退 attack，attack 也不存在则跳过
        const desiredAnim = canUseSkill
          ? (allyUnit.skillAnim || allyUnit.skillAction || 'attack')
          : 'attack';
        const targetAnim = animations.some(a => a.name === desiredAnim)
          ? desiredAnim
          : (animations.some(a => a.name === 'attack') ? 'attack' : null);
        if (targetAnim && backAnim) {
          try {
            allyNpcSpine.spine.state.setAnimation(0, targetAnim, false);
            allyNpcSpine.spine.state.addAnimation(0, backAnim, true, 0);
          } catch (e) {
            console.warn('队友行动动画播放失败', e);
          }
        }
      }

      // ========================================
      // 🎯 释放技能（冷却可用时）
      // ========================================
      if (canUseSkill) {
        // 🎵 播放 NPC 技能音效（按选中技能 id 从 ALLY_EFFECT_CONFIG.skills 取，回退队友配置 skillSound；无文件自动跳过）
        const allySkillFx = getAllyFxConfig(allyUnit.img, 'skill', allyUnit.skillId);
        const allySkillSnd = allySkillFx?.sound || allyUnit.skillSound;
        if (allySkillSnd) {
          user.playSoundEffect(allySkillSnd, allySkillFx?.soundVolume ?? 1);
        }
        allyUnit.skillCdRemain = allyUnit.skillCooldown ?? 3;
        const skillName = allyUnit.skillName || '技能';
        const skillValue = allyUnit.skillValue ?? 0;

        // —— 黑米「鼓舞」：为玩家提升行动条（拉条）——
        if (skillType === 'playerActionBar') {
          const pct = skillValue ?? 35;
          // 平滑拉条（复用 advance 分步动画）
          advance(player, pct);
          if (_playerInstanceCache?.showBuffText) {
            _playerInstanceCache.showBuffText(t('buffInspire'));
          }
          // 🎬 播放技能特效（配置来自 ALLY_EFFECT_CONFIG；鼓舞目前 type none 无特效）
          playAllyEffect({
            npcImg: allyUnit.img,
            kind: 'skill',
            skillId: allyUnit.skillId,
            container: getFightContainer() || _pixiAppCache,
            player, enemies,
          });
          battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：玩家行动条 +${Math.round(pct)}%`);
        }
        // —— 黑米「洞悉」（旧）：使所有敌人受到伤害提升 ——
        else if (skillType === 'enemyDamageTaken') {
          const duration = allyUnit.skillDuration ?? 3;
          enemies.forEach(e => {
            if (e.hp <= 0) return;
            // 叠加易伤（不重复叠加时保留最大）
            const dmgTaken = skillValue;
            e.damageTaken = (e.damageTaken || 0) + dmgTaken;
            // 记录持续回合（用定时器在 N 回合后移除较复杂，这里用永久易伤 + 记录来源）
            e._allyDamageTakenDebuff = {
              value: dmgTaken,
              remaining: duration,
            };
            emitter.emit('enemyBuff', { enemyName: e.name, enemyUid: e.uid, buffName: skillName });
          });
          // 🎬 播放技能特效（配置来自 ALLY_EFFECT_CONFIG；洞悉暂无特效配置则自动跳过）
          playAllyEffect({
            npcImg: allyUnit.img,
            kind: 'skill',
            skillId: allyUnit.skillId,
            container: getFightContainer() || _pixiAppCache,
            player, enemies,
          });
          battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：所有敌人受伤 +${Math.round(skillValue * 100)}%`);
        }
        // —— 晨曦「光之庇佑」：为玩家提供护盾 ——
        else if (skillType === 'shield') {
          const shieldAmount = Math.round(player.maxHp * skillValue * 100) / 100;
          player.shield = (player.shield || 0) + shieldAmount;
          // 显示护盾获得
          if (_playerInstanceCache?.showBuffText) {
            _playerInstanceCache.showBuffText(t('buffLightBlessing'));
          }
          // 🎬 播放技能特效（配置来自 ALLY_EFFECT_CONFIG；光之庇佑目前 type none 无特效）
          playAllyEffect({
            npcImg: allyUnit.img,
            kind: 'skill',
            skillId: allyUnit.skillId,
            container: getFightContainer() || _pixiAppCache,
            player, enemies,
          });
          battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：获得护盾 ${shieldAmount}`);
        }
        // —— 云弥「灵力充能」：为玩家提供可突破上限的灵力，持续1回合 ——
        else if (skillType === 'manaCharge') {
          const charge = skillValue;
          player.mp = (player.mp || 0) + charge;
          allyUnit.manaOverride = charge; // 记录本次突破上限的灵力
          if (_playerInstanceCache?.showBuffText) {
            _playerInstanceCache.showBuffText(t('buffManaCharge'));
          }
          // 🎬 在玩家脚底播放灵力充能 buff 特效（配置来自 ALLY_EFFECT_CONFIG 的 linglichongneng）
          playAllyEffect({
            npcImg: allyUnit.img,
            kind: 'skill',
            skillId: allyUnit.skillId,
            container: getFightContainer() || _pixiAppCache,
            player, enemies,
          });
          battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：灵力 +${charge}（突破上限）`);
        }
        // —— 西亚「缠绕」：对所有敌人造成伤害 + 推条 ——
        else if (skillType === 'aoePushback') {
          const aoeRatio = skillValue;
          const pushbackPct = allyUnit.skillPushback ?? 0;
          // 🔥 同伴自身增伤（allyDmgBonus，若配置）；同伴技能伤害基于自身攻击力
          const rawDmg = Math.round((allyUnit.attack || allyUnit.baseAttack || 14) * aoeRatio * (1 + (allyUnit.allyDmgBonus || 0)) * 100) / 100;
          const dmgType = allyUnit.skillDmgType || 'physical';
          // 对全体存活敌人结算
          enemies.forEach(e => {
            if (e.hp <= 0) return;
            calculateFinalDamage(rawDmg, e, { ignoreArmor: 0, dmgType: dmgType, player: allyUnit, buff: null, applyElement: true, enemies: [], skillName: skillName });
            // 推条 50%
            if (pushbackPct > 0) pushback(e, pushbackPct);
            emitter.emit('enemyBuff', { enemyName: e.name, enemyUid: e.uid, buffName: skillName });
          });
          // 🎬 播放技能特效（配置来自 ALLY_EFFECT_CONFIG 的 chanrao，投射物飞向敌人）
          playAllyEffect({
            npcImg: allyUnit.img,
            kind: 'skill',
            skillId: allyUnit.skillId,
            container: getFightContainer() || _pixiAppCache,
            player, enemies,
          });
          battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：全体伤害 ${rawDmg}，推条 ${pushbackPct}%`);
        }
        // —— 西亚「治愈」：为你恢复 12% 最大生命值 ——
        else if (skillType === 'heal') {
          const healAmount = Math.round(player.maxHp * skillValue * 100) / 100;
          applyHeal(player, healAmount, 'heal');
          // 🎬 在玩家脚底播放治疗 buff 特效（配置来自 ALLY_EFFECT_CONFIG 的 zhiyu）
          playAllyEffect({
            npcImg: allyUnit.img,
            kind: 'skill',
            skillId: allyUnit.skillId,
            container: getFightContainer() || _pixiAppCache,
            player, enemies,
          });
          battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：治疗玩家 ${healAmount}`);
        }
        // —— 晨曦「照耀」/ 云弥「狂涌」：对所有敌人造成伤害 ——
        else if (skillType === 'aoeDamage') {
          const aoeRatio = skillValue ?? 1.6;
          const dmgType = allyUnit.skillDmgType || 'physical';
          // 同伴自身增伤（allyDmgBonus，若配置）；伤害基于自身攻击力
          const rawDmg = Math.round((allyUnit.attack || allyUnit.baseAttack || 14) * aoeRatio * (1 + (allyUnit.allyDmgBonus || 0)) * 100) / 100;
          // 对全体存活敌人结算（特效播放数据来自 ALLY_EFFECT_CONFIG 配置表）
          const aliveEne = enemies.filter(e => e.hp > 0);
          if (!aliveEne.length) { /* 空 */ }
          // 🎯 配置了 aoeCenter: true → 像玩家 AOE 一样，特效只放一次、飞到人群中心，
          //    命中后对全体敌人结算伤害（支持 damageDelay 延迟出伤）
          else if (getAllyFxConfig(allyUnit.img, 'skill', allyUnit.skillId)?.aoeCenter) {
            playAllyEffect({
              npcImg: allyUnit.img,
              kind: 'skill',
              skillId: allyUnit.skillId,
              container: getFightContainer() || _pixiAppCache,
              player, enemies,
              onHit: () => {
                if (state.battleEnd) return;
                aliveEne.forEach(e => {
                  if (e.hp <= 0) return;
                  calculateFinalDamage(rawDmg, e, { ignoreArmor: 0, dmgType: dmgType, player: allyUnit, buff: null, applyElement: true, enemies: [], skillName: skillName });
                });
              }
            });
          }
          // 旧行为：每个敌人发射一发投射物
          else {
            aliveEne.forEach((e, idx) => {
              playAllyEffect({
                npcImg: allyUnit.img,
                kind: 'skill',
                skillId: allyUnit.skillId,
                container: getFightContainer() || _pixiAppCache,
                player, enemies, target: e,
                onHit: () => {
                  if (state.battleEnd) return;
                  if (e.hp <= 0) return;
                  calculateFinalDamage(rawDmg, e, { ignoreArmor: 0, dmgType: dmgType, player: allyUnit, buff: null, applyElement: true, enemies: [], skillName: skillName });
                }
              });
            });
          }
          battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：全体伤害 ${rawDmg}（${dmgType}）`);
        }
        // —— 黑米「抓击」：对最近的敌人造成伤害 ——
        else if (skillType === 'singleDamage') {
          const ratio = skillValue ?? 2.6;
          const dmgType = allyUnit.skillDmgType || 'physical';
          if (!target) { /* 空 */ }
          else {
            const rawDmg = Math.round((allyUnit.attack || allyUnit.baseAttack || 14) * ratio * (1 + (allyUnit.allyDmgBonus || 0)) * 100) / 100;
            // 特效播放数据来自 ALLY_EFFECT_CONFIG 配置表
            playAllyEffect({
              npcImg: allyUnit.img,
              kind: 'skill',
              skillId: allyUnit.skillId,
              container: getFightContainer() || _pixiAppCache,
              player, enemies, target,
              onHit: () => {
                if (state.battleEnd) return;
                const aliveEnemies = enemies.filter(e => e.hp > 0);
                if (aliveEnemies.length === 0) return;
                const currentTarget = aliveEnemies.find(e => e.uid === target.uid) || aliveEnemies[0];
                if (currentTarget.hp <= 0) return;
                calculateFinalDamage(rawDmg, currentTarget, { ignoreArmor: 0, dmgType: dmgType, player: allyUnit, buff: null, applyElement: true, enemies: [], skillName: skillName });
              }
            });
            battleLog(`🧙 ${allyUnit.name} 使用【${skillName}】：伤害 ${rawDmg}（${dmgType}）`);
          }
        }
        // —— 通用伤害技能（默认）——
        else {
          // 无存活敌人则跳过
          if (!target) { /* 空 */ }
          else {
            // 🔥 同伴自身增伤（allyDmgBonus，若配置）；同伴技能伤害基于自身攻击力
            const rawDmg = Math.round((allyUnit.attack || allyUnit.baseAttack || 14) * (allyUnit.skillRatio ?? 1.5) * (1 + (allyUnit.allyDmgBonus || 0)) * 100) / 100;
            const dmgType = allyUnit.skillDmgType || 'physical';
            // 特效播放数据来自 ALLY_EFFECT_CONFIG 配置表
            playAllyEffect({
              npcImg: allyUnit.img,
              kind: 'skill',
              skillId: allyUnit.skillId,
              container: getFightContainer() || _pixiAppCache,
              player, enemies, target,
              onHit: () => {
                if (state.battleEnd) return;
                const aliveEnemies = enemies.filter(e => e.hp > 0);
                if (aliveEnemies.length === 0) return;
                const currentTarget = aliveEnemies.find(e => e.uid === target.uid) || aliveEnemies[0];
                if (currentTarget.hp <= 0) return;
                calculateFinalDamage(rawDmg, currentTarget, { ignoreArmor: 0, dmgType: dmgType, player: allyUnit, buff: null, applyElement: true, enemies: [], skillName: skillName });
              }
            });
          }
        }
      }
      // ========================================
      // 🎯 普攻（技能冷却中 或 非技能回合）
      // ========================================
      else {
        // 🎵 播放 NPC 普攻音效（优先 ALLY_EFFECT_CONFIG 的 attack.sound，回退队友配置 attackSound；无文件自动跳过）
        const allyAtkFx = getAllyFxConfig(allyUnit.img, 'attack');
        const allyAtkSnd = allyAtkFx?.sound || allyUnit.attackSound;
        if (allyAtkSnd) {
          user.playSoundEffect(allyAtkSnd, allyAtkFx?.soundVolume ?? 1);
        }
        const attackType = allyUnit.attackType || 'selfAtk';
        const attackRatio = allyUnit.attackRatio ?? 0.6;
        const dmgType = allyUnit.attackDmgType || 'physical';

        // —— 西亚普攻：治疗玩家 4% 最大生命 ——
        if (attackType === 'heal') {
          const healAmount = Math.round(player.maxHp * attackRatio * 100) / 100;
          applyHeal(player, healAmount, 'heal');
          // 🎬 在玩家脚底播放治疗 buff 特效（配置来自 ALLY_EFFECT_CONFIG 的 attack）
          playAllyEffect({
            npcImg: allyUnit.img,
            kind: 'attack',
            container: getFightContainer() || _pixiAppCache,
            player, enemies,
          });
          battleLog(`🧙 ${allyUnit.name} 普攻：治疗玩家 ${healAmount}`);
        }
        // —— 普通伤害普攻（基于玩家攻击力 或 自身攻击力）——
        else {
          if (!target) { /* 空 */ }
          else {
            const baseAtk = attackType === 'playerAtk' ? player.attack : (allyUnit.attack || allyUnit.baseAttack || 14);
            // 🔥 同伴自身增伤（allyDmgBonus，若配置）
            const rawDmg = Math.round(baseAtk * attackRatio * (1 + (allyUnit.allyDmgBonus || 0)) * 100) / 100;
            // 特效播放数据来自 ALLY_EFFECT_CONFIG 配置表
            playAllyEffect({
              npcImg: allyUnit.img,
              kind: 'attack',
              container: getFightContainer() || _pixiAppCache,
              player, enemies, target,
              onHit: () => {
                if (state.battleEnd) return;
                const aliveEnemies = enemies.filter(e => e.hp > 0);
                if (aliveEnemies.length === 0) return;
                const currentTarget = aliveEnemies.find(e => e.uid === target.uid) || aliveEnemies[0];
                if (currentTarget.hp <= 0) return;
                calculateFinalDamage(rawDmg, currentTarget, { ignoreArmor: 0, dmgType: dmgType, player: allyUnit, buff: null, applyElement: true, enemies: [], skillName: '普攻' });
              }
            });
            battleLog(`🧙 ${allyUnit.name} 普攻：伤害 ${rawDmg}（${dmgType}）`);
          }
        }
      }

      // 行动结束
      setTimeout(() => {
        if (frozen || state.battleEnd) return
        allyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(allyUnit)
        endAction()
      }, 400)
      return
    }

    // ===== 普通友军普攻：统一伤害计算 =====
    const baseDmg = Math.floor(random() * 80) + 40

    // ✅ 统一伤害计算：物理伤害，不破甲
    const dmg = calculateFinalDamage(baseDmg, target, { ignoreArmor: 0, dmgType: 'physical', player: null, buff: null, applyElement: true, enemies: [], skillName: allyUnit.name || '友军' })

    battleLog(`💛${allyUnit.name}普攻${target.name},伤害${dmg}`)

    setTimeout(() => {
      if (frozen) return   // ⭐ 关键
      allyUnit.actionProgress -= ACTION_MAX
      onTurnEnd(allyUnit)
      endAction()
    }, 350)
  }

  // 玩家
  function triggerPlayer() {
    state.acting = true
    state.currentActor = 'player'
    state.phase = 'action'

    // 🔥 天赋：瞬连突袭 - 连续行动时触发
    if (hasTalent('continuous_strike') && player._continuousStrikeNextTurn) {
      const atkBonus = Math.round(player.baseAttack * talentFx('continuous_strike', 'atkPct', 0.4) * 100) / 100;
      playerAttackUp(player, atkBonus, talentFx('continuous_strike', 'atkPct', 0.4) * 100, '瞬连突袭')
      player._continuousStrikeAtkBonus = atkBonus;
      player._firstCardFreeThisTurn = true;
      player._firstCardFreeConsumed = false;
      _playerInstanceCache?.showBuffText(t('buffChainAssault'));
      battleLog('[天赋] 瞬连突袭：攻击力+40%，本回合第一张卡牌无消耗');
    } else {
      if (player._continuousStrikeAtkBonus) {
        player.attack -= player._continuousStrikeAtkBonus;
        playerAttackRollback(player, '瞬连突袭')
        player._continuousStrikeAtkBonus = 0;
      }
      player._firstCardFreeThisTurn = false;
      player._firstCardFreeConsumed = false;
    }

    // 🔥 天赋：蓄力隐忍 - 回合开始时应用上回合积攒的攻击力加成
    // （在 applyPlayerTurnStartTalents 之后、回蓝之前处理）
    if (hasTalent('no_attack_power_up') && _hasNoAttackPowerUpPending) {
      const atkBonus = Math.round(player.baseAttack * talentFx('no_attack_power_up', 'atkPct', 0.2) * 100) / 100;
      playerAttackUp(player, atkBonus, talentFx('no_attack_power_up', 'atkPct', 0.2) * 100, '蓄力隐忍')
      player._noAttackPowerUpBonus = (player._noAttackPowerUpBonus || 0) + atkBonus;
      _hasNoAttackPowerUpPending = false;
      _playerInstanceCache?.showBuffText(t('buffEndure'));
      battleLog(`[天赋] 蓄力隐忍：上回合未打出攻击牌，本回合攻击力+${atkBonus}`);
    }

    // 🔥 天赋：抵抗姿态 - 回合开始时应用上回合的护甲与魔抗加成
    if (hasTalent('no_attack_armor_up') && _hasNoAttackArmorPending) {
      const lv = _userStoreCache.getTalentLevel?.('no_attack_armor_up') || 1;
      const rates = talentFx('no_attack_armor_up', 'rates', { 1: 0.4, 2: 0.5, 3: 0.6, 4: 0.7, 5: 0.8 });
      const armorRate = rates[lv] || 0.25;
      const addArmor = Math.floor(player.baseArmor * armorRate);
      const addMR = Math.floor((player.baseMagicResist ?? 10) * armorRate);
      player.armor += addArmor;
      player.magicResist = (player.magicResist || 0) + addMR;
      player._noAttackArmorBonus = addArmor;
      player._noAttackMRBonus = addMR;
      _hasNoAttackArmorPending = false;
      _playerInstanceCache?.showBuffText(t('buffDefensiveStance'));
      battleLog(`[天赋] 抵抗姿态 Lv.${lv}：上回合未打出攻击牌，护甲+${addArmor} 魔抗+${addMR}`);
    }

    // 🔥 天赋：尖刺攻击 - 玩家回合开始时攻击最近的敌人（伤害基数=护甲+魔抗，无属性只吃护甲减伤）
    if (hasTalent('armor_fixed_dmg')) {
      const lv = _userStoreCache.getTalentLevel?.('armor_fixed_dmg') || 1;
      const rates = talentFx('armor_fixed_dmg', 'rates', { 1: 0.2, 2: 0.25, 3: 0.3, 4: 0.35, 5: 0.4 });
      const armorRate = rates[lv] ?? 0.2;
      const rawDmg = Math.floor((player.armor + (player.magicResist || 0)) * armorRate);

      const aliveEnemies = enemies.filter(e => e.hp > 0);
      if (aliveEnemies.length > 0) {
        // 按 x 排序取最左边（屏幕最左边）的存活敌人
        aliveEnemies.sort((a, b) => a.x - b.x);
        const nearest = aliveEnemies[0];
        // 直接对最近敌人造成伤害，无粒子特效
        if (state.battleEnd) return;
        calculateFinalDamage(rawDmg, nearest, { ignoreArmor: 0, dmgType: 'null', player: player, buff: null, applyElement: true, enemies: [], skillName: '尖刺防御' });
        battleLog(`[天赋] 尖刺攻击 Lv.${lv}：对 ${nearest.name} 造成 ${rawDmg} 点无属性伤害（吃护甲减伤）`);
      }
    }

    // ⚡ 电磁场（雷鸟女皇）：玩家回合开始时受到 50% 攻击力雷属性伤害（永久持续，直到雷鸟死亡）
    //    ⚠️ 不走 calculateFinalDamage（它的玩家受伤分支依赖 player 参数是主角），这里直接完整结算玩家受伤
    enemies.forEach(en => {
      if (en.hp > 0 && en._electroField) {
        const dmg = Math.max(1, Math.round(en.attack * en._electroField.ratio * 100) / 100)
        // 护盾吸收（统一走 applyDamageToPlayer）
        applyDamageToPlayer(player, dmg, {
          dmgType: 'lightning',
          sourceAtk: en.attack,
          useShield: true,
          checkEnd: false, // 原行为：电磁场伤害不立即检查战斗结束
          showDamageText: true,
        })
        emitter.emit('screenShake', { intensity: 4, duration: 0.12 })
      }
    })

    //玩家回合开始 → 回蓝
    if (player.mp < player.maxMp) {
      player.mp = Math.min(player.mp + 2, player.maxMp)
    }
    // 🔥 发出玩家回合开始事件
    emitter.emit('playerTurnStart')
  }

  /**
   * 🎬 玩家攻击动画：默认播放 attack；若传入指定动画名（如卡牌配置的 skillAnim）则播放该动画。
   *    有对应动画就播（播完自动回 fight），没有则回退 attack，再没有就跳过。
   * @param {string} [animName] - 指定的动画名（可选，默认 'attack'）
   */
  function playPlayerAttackAnim(animName = 'attack') {
    const spine = _playerInstanceCache?.spine?.spine;
    if (!spine || !spine.state || !spine.skeleton?.data?.animations) return;
    const animations = spine.skeleton.data.animations;
    const hasFightAnim = animations.some(a => a.name === 'idle');
    // ⚠️ 战斗中回切动画优先 fight（战斗中默认 fight，idle 仅在非战斗场景用）
    // 没有 fight 就选 idle；再没有就选第一个非 attack/feixing/fly 的动画兜底
    const backAnim = hasFightAnim
      ? 'idle'
      : (animations.some(a => a.name === 'idle')
          ? 'idle'
          : (animations.find(a => a.name !== 'attack' && a.name !== 'feixing' && a.name !== 'fly')?.name || animations[0]?.name));

    // 目标动画：优先指定动画名（若骨骼中存在），否则回退 attack，都没有就跳过
    const targetAnim = animations.some(a => a.name === animName)
      ? animName
      : (animations.some(a => a.name === 'attack') ? 'attack' : null);

    if (targetAnim && backAnim) {
      // 播放指定动画（不循环），播完自动接回 fight 动画
      spine.state.setAnimation(0, targetAnim, false);
      spine.state.addAnimation(0, backAnim, true, 0);
    } else if (backAnim) {
      // 没有任何可播放的动作：保持 fight/兜底动画
      spine.state.setAnimation(0, backAnim, true);
    }
  }

    // 💀 玩家死亡动画：播放 siwang（不循环 → 播完自动停留最后一帧），返回动画时长毫秒
  function playPlayerDeathAnim() {
    // 💀 玩家死亡音效（/music/dilao/wanjiasiwang.mp3，一次性）
    try { user.playSoundEffect('music/dilao/wanjiasiwang.mp3'); } catch (e) { /* ignore */ }
    const spine = _playerInstanceCache?.spine?.spine;
    if (!spine || !spine.state || !spine.skeleton?.data?.animations) return 0;
    const animations = spine.skeleton.data.animations;
    const deathAnim = animations.find(a => a.name === 'siwang');
    if (!deathAnim) return 0;
    spine.state.setAnimation(0, 'siwang', false); // 不循环，播完保留最后一帧
    try { spine.state.timeScale = 2; } catch (e) { /* ignore */ } // ⚡ 死亡动画2倍速播放（加快节奏）
    try { spine.state.clearTrack(1); } catch (e) { /* ignore */ } // 清理叠加轨道
    return ((deathAnim.duration || 1.5) / 2) * 1000 + 300; // 动画加速后时长（毫秒），供延迟结算弹窗
  }

function playerUseCard(card, target = null) {
    if (state.currentActor !== 'player') return
    state.phase = 'resolving'
    const animDelay = useCard(card, target)

    // 🤝 天赋：同心 - 每打出3张召唤物牌获得1点灵力（累积，战斗开始时重置）
    if (hasTalent('tong_xin') && (getCardData(card.name) || {}).isSummon) {
      player._summonCardCount = (player._summonCardCount || 0) + 1;
      const need = talentFx('tong_xin', 'summonCardNeed', 3);
      const mpGain = talentFx('tong_xin', 'summonCardMp', 1);
      if (player._summonCardCount >= need) {
        player._summonCardCount -= need;
        player.mp = Math.min(player.maxMp, player.mp + mpGain);
        _playerInstanceCache?.showBuffText(`🤝 同心：灵力+${mpGain}`);
        battleLog(`[天赋] 同心：每${need}张召唤物牌 +${mpGain} 灵力`);
      }
    }

    // 🎖 卡牌熟练度：每打出一张牌 +1 熟练度，达到阈值升级（变强效果在伤害结算处生效）
    try {
      const upLv = user.gainCardMastery?.(card?.name);
      if (upLv) {
        const mCfg = (getCardData(card.name) || {}).mastery || (user.pixi?.player?.CARD_DATA?.[card.name] || {}).mastery;
        _playerInstanceCache?.showBuffText?.('🎖 ' + card.name + ' 熟练度 Lv.' + upLv);
        battleLog('[熟练度] ' + card.name + ' 提升至 Lv.' + upLv + (mCfg?.desc ? '：' + mCfg.desc : ''));
      }
    } catch (e) { /* 熟练度不影响战斗主流程 */ }

    // 🎬 玩家出牌时播放动画：
    //    默认播放 attack；若卡牌配置了 skillAnim（或 anim）字段，则播放该指定动画名
    //    （动画资源未定，先写好逻辑，后期在 CARD_DATA 对应卡牌上配 skillAnim 即可生效）
    const cardCfg = card?.name ? getCardData(card.name) : null;
    const cardAnimName = cardCfg?.skillAnim || cardCfg?.anim || 'attack';
    playPlayerAttackAnim(cardAnimName);

    // 🎵 玩家出牌音效：音效配置统一在 EFFECT_CONFIG（sound/soundVolume）
    //    - soundPerHit 技能（射击/流火/狙击/碎甲弹/影分身）：由特效层按每次发射/命中播放，
    //      这里跳过，避免重复（如射击 6 发子弹响 6 次，而不是 1+6=7 次）
    //    - 其余技能：出牌时播一次（音量 = 全局 × soundVolume）
    //    - 兼容回退：EFFECT_CONFIG 没配时用卡牌配置的 sound
    const skillEffCfg = getEffectConfig?.(card.name);
    const cardSound = skillEffCfg?.sound || cardCfg?.sound;
    if (cardSound && !skillEffCfg?.soundPerHit) {
      user.playSoundEffect(cardSound, skillEffCfg?.soundVolume ?? 1);
    }

    // 🔥 天赋：蓄力隐忍 - 检测本回合是否打出攻击牌
    if (hasTalent('no_attack_power_up') && ATTACK_CARDS.includes(card.name)) {
      _attackCardPlayedThisTurn = true;
    }

    // 🔥 天赋：晨曦的祝福 - 每打出1张攻击牌，攻击力+3%持续至战斗结束
    if (hasTalent('attack_stack') && ATTACK_CARDS.includes(card.name)) {
      const atkBonus = Math.round(player.baseAttack * talentFx('attack_stack', 'atkPct', 0.03) * 100) / 100;
      playerAttackUp(player, atkBonus, talentFx('attack_stack', 'atkPct', 0.03) * 100, '晨曦的祝福')
      _playerInstanceCache?.showBuffText(t('buffChenxiBlessing'));
      battleLog(`[天赋] 晨曦的祝福：攻击力+${atkBonus}`);
    }

    // 🔥 天赋：多多益善 - 每打出一张手牌，概率恢复1点灵力
    if (hasTalent('luck_mana_restore') && card.cost > 0) {
      const roll = random();
      if (roll < _userStoreCache.luckProb(_luckManaRestoreProb)) {
        player.mp = Math.min(player.maxMp, player.mp + 1);
        _playerInstanceCache?.showBuffText(t('buffPlenty'));
        battleLog(`[天赋] 多多益善：恢复1点灵力（概率 ${(_luckManaRestoreProb * 100).toFixed(0)}%）`);
        _luckManaRestoreProb = talentFx('luck_mana_restore', 'baseProb', 0.15); // 触发后重置
      } else {
        _luckManaRestoreProb = Math.min(0.99, _luckManaRestoreProb + talentFx('luck_mana_restore', 'incProb', 0.01));
        battleLog(`[天赋] 多多益善：未触发，下次概率→${(_luckManaRestoreProb * 100).toFixed(0)}%`);
      }
    }

    // 移除：player.actionProgress -= ACTION_MAX、onTurnEnd、endAction
    setTimeout(() => {
      state.phase = 'action' // 用完切回可继续出牌
    }, animDelay)
  }
  function endPlayerTurn() {
    _isPlayerTurn = false; // 🎯 玩家回合结束（后续敌人行动受伤正常播 shoushang）
    // 🔥 天赋：蓄力隐忍 - 回合结束时移除本回合的攻击力加成（仅持续1回合）
    if (hasTalent('no_attack_power_up') && player._noAttackPowerUpBonus) {
      player.attack -= player._noAttackPowerUpBonus;
      playerAttackRollback(player, '蓄力隐忍')
      battleLog(`[天赋] 蓄力隐忍：回合结束，移除攻击力加成 ${player._noAttackPowerUpBonus}`);
      player._noAttackPowerUpBonus = 0;
    }

    // 🔥 天赋：抵抗姿态 - 回合结束时移除本回合的护甲与魔抗加成
    if (hasTalent('no_attack_armor_up') && player._noAttackArmorBonus) {
      player.armor -= player._noAttackArmorBonus;
      if (player._noAttackMRBonus) player.magicResist = Math.max(0, (player.magicResist || 0) - player._noAttackMRBonus);
      battleLog(`[天赋] 抵抗姿态：回合结束，移除护甲加成 ${player._noAttackArmorBonus} 魔抗加成 ${player._noAttackMRBonus || 0}`);
      player._noAttackArmorBonus = 0;
      player._noAttackMRBonus = 0;
    }

    // 🔥 天赋：瞬连突袭 - 回合结束移除攻击力加成
    if (player._continuousStrikeAtkBonus) {
      player.attack -= player._continuousStrikeAtkBonus;
      playerAttackRollback(player, '瞬连突袭')
      battleLog(`[天赋] 瞬连突袭：回合结束，移除攻击力加成 ${player._continuousStrikeAtkBonus}`);
      player._continuousStrikeAtkBonus = 0;
    }
    player._firstCardFreeThisTurn = false;
    player._firstCardFreeConsumed = false;
    // ⚔️ 回合结束攻击力提升状态图标维护（临时攻移除后回落则隐藏）
    reconcileAtkUpIcon(player)

    player._gloveBoostCard = false; // 🧤 幽暗手套：攻击牌增伤标记回合结束复位

    // 🔥 天赋：蓄力隐忍 & 抵抗姿态 - 回合结束时检查是否未打出攻击牌
    if (hasTalent('no_attack_power_up') && !_attackCardPlayedThisTurn) {
      _hasNoAttackPowerUpPending = true;
      battleLog('[天赋] 蓄力隐忍：本回合未打出攻击牌，下回合攻击力+20%');
    }
    if (hasTalent('no_attack_armor_up') && !_attackCardPlayedThisTurn) {
      _hasNoAttackArmorPending = true;
      battleLog('[天赋] 抵抗姿态：本回合未打出攻击牌，下回合护甲提升');
    }
    // 重置本回合攻击牌检测标记
    _attackCardPlayedThisTurn = false;

    player.actionProgress -= ACTION_MAX

    // 🔥 天赋：余速续航 - 自身回合结束时，行动条提升一定比例
    if (hasTalent('turn_end_speed')) {
      const lv = _userStoreCache.getTalentLevel?.('turn_end_speed') || 1;
      // 解锁 +basePct%，每级 +perLvPct%（Lv.1 = basePct，不叠加首级）
      const percent = talentFx('turn_end_speed', 'basePct', 5) + talentFx('turn_end_speed', 'perLvPct', 3) * (lv - 1); // Lv1:5%, Lv2:8%, Lv3:11%
      const boostAmount = ACTION_MAX * (percent / 100);
      player.actionProgress = Math.min(player.actionProgress + boostAmount, ACTION_MAX);
      _playerInstanceCache?.showBuffText(t('buffMomentum'));
      // battleLog(`[天赋] 余速续航 Lv.${lv}：回合结束行动条+${percent}%（+${boostAmount}）`);
    }
    if (hasTalent('round_end_random_cd')) {
      // 🧘 时序调息：回合结束时若手牌数少于3张，则抽一张牌（抽牌回调由战斗 UI 传入）
      if (playerHand.length < 3) {
        onPlayerTurnEnd?.();
        _playerInstanceCache?.showBuffText('时序调息');
      }
    }

    // 🔥 天赋：再来一次 - 回合结束时概率额外获得一回合
    if (hasTalent('luck_action_rush')) {
      const roll = random();
      if (roll < _userStoreCache.luckProb(_luckActionRushProb)) {
        battleLog(`[天赋] 再来一次：触发（概率 ${(_luckActionRushProb * 100).toFixed(0)}%），额外获得一回合`);
        _playerInstanceCache?.showBuffText(t('buffOneMoreChance'));
        _luckActionRushProb = talentFx('luck_action_rush', 'baseProb', 0.15); // 触发后重置
        player.actionProgress = 9999;
        return; // 不执行 endAction，让玩家再次行动
      } else {
        _luckActionRushProb = Math.min(0.99, _luckActionRushProb + talentFx('luck_action_rush', 'incProb', 0.03));
        battleLog(`[天赋] 再来一次：未触发（概率 ${((_luckActionRushProb - 0.03) * 100).toFixed(0)}%），下次概率→${(_luckActionRushProb * 100).toFixed(0)}%`);
      }
    }

    // 🕐 卡牌「未来」：回合结束后额外获得一个回合
    if (player._extraTurnPending) {
      player._extraTurnPending = false;
      battleLog('🕐 未来卡牌：额外获得一个回合');
      _playerInstanceCache?.showBuffText(t('buffFuture'));
      player.actionProgress = 9999;
      onTurnEnd(player);
      return; // 不执行 endAction，让玩家再次行动
    }

    onTurnEnd(player)
    endAction()
  }
  // ====================
  // 敌人
  // ====================
  function triggerEnemy(enemyUnit) {
    state.acting = true
    state.currentActor = 'enemy'
    state.phase = 'resolving'

    // 👑 天命被动（暗影王二阶段）：行动时随机冻结玩家手上一张卡牌持续一回合
    const destinyP = (enemyUnit.passives || []).find(p => p.type === 'destiny')
    if (enemyUnit._phase2 && destinyP) {
      try {
        emitter.emit('freezePlayerCards', { count: 1, source: enemyUnit.name })
        battleLog('👑 天命：' + enemyUnit.name + ' 行动时冻结玩家一张手牌（持续一回合）')
      } catch (e) { /* ignore */ }
    }

    // 🎯 敌人技能调度：有可用技能则放技能，否则普攻
    const skillToUse = getEnemyUsableSkill(enemyUnit)
    if (skillToUse) {
      enemyUseSkill(enemyUnit, skillToUse, () => {
        enemyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(enemyUnit)
        endAction()
      })
    } else {
      enemyAttack(enemyUnit, () => {
        enemyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(enemyUnit)
        endAction()
      })
    }
  }

  // 🎯 获取敌人当前可用的技能（冷却为0 且 满足使用条件），返回技能对象或 null
  function getEnemyUsableSkill(enemyUnit) {
    // ✅ 收敛：走共享 selectEnemySkill（与实际预测 UI 同一套规则，含毒爆 ≥minStacks 条件）
    const aliveCount = enemies.filter(e => e.hp > 0).length
    const pb = (player.debuffs || []).find(d => d.type === 'player_poison')
    return selectEnemySkill(enemyUnit, {
      mode: 'actual',
      aliveCount,
      playerPoisonStacks: pb?.stacks || 0,
    })
  }

  // 🎬 播放敌人技能动作（提取成函数：召唤等会导致 spine 全量重建的场景可延迟重播）
  function playEnemySkillAnim(enemyUnit, skill) {
    const enemyIndex = enemies.indexOf(enemyUnit)
    if (!_enemySpineListCache || enemyIndex < 0 || !_enemySpineListCache[enemyIndex]) return
    const spineItem = _enemySpineListCache[enemyIndex]
    const spine = spineItem?.spine
    if (!spine?.state || !spine.skeleton?.data?.animations) return
    const animations = spine.skeleton.data.animations
    // 🎬 技能动画名：优先技能自身的 skillAnim，其次敌人配置 skillAnim，缺省回退 attack
    const skillAnim = skill?.skillAnim || enemyUnit.skillAnim || 'attack'
    const hasSkillAnim = animations.some(a => a.name === skillAnim)
    const hasFightAnim = animations.some(a => a.name === 'idle')
    // 🎯 回切动画：优先 fight（战斗待机）→ idle；绝不能选 feixing/fly/attack
    //    （雷鸟骨骼第一个非 attack 动画就是 feixing，会误把待机设成飞翔）
    const backAnim = hasFightAnim
      ? 'idle'
      : (animations.some(a => a.name === 'idle')
          ? 'idle'
          : (animations.find(a => a.name !== 'attack' && a.name !== 'feixing' && a.name !== 'fly')?.name || animations[0]?.name))
    if (hasSkillAnim && backAnim) {
      spine.state.setAnimation(0, skillAnim, false)
      spine.state.addAnimation(0, backAnim, true, 0)
    } else if (backAnim) {
      spine.state.setAnimation(0, backAnim, true)
    }
  }

  // 🎯 敌人释放技能（按技能类型分派）
  function enemyUseSkill(enemyUnit, skill, done) {
    // 播放攻击动画（复用 enemyAttack 的动画逻辑）
    playEnemySkillAnim(enemyUnit, skill)

    // 🎵 播放敌人技能音效：
    //    优先 ENEMY_EFFECT_CONFIG.skillTypes 里该技能类型的 sound/soundVolume（多技能扩展点），
    //    其次技能自身的 sound（可在 enemiesData 每个技能里单独配），再回退 skillSound / attackSound
    const enemySkillFx = getEnemyFxConfig(enemyUnit.juese, 'skill', skill?.type);
    const skillSfx = enemySkillFx?.sound || skill?.sound || enemyUnit.skillSound || enemyUnit.attackSound;
    if (skillSfx) {
      user.playSoundEffect(skillSfx, enemySkillFx?.soundVolume ?? 1);
    }

    const skillIdx = enemyUnit.skills.indexOf(skill)
    const attackDone = () => {
      // 使用技能后设置冷却
      if (Array.isArray(enemyUnit.skillCds)) {
        enemyUnit.skillCds[skillIdx] = skill.cooldown ?? 2
      }
      done && done()
    }

    // 🔥 分发表路由：按技能类型分发到独立 handler（9+ 分支收敛，行为零变化）
    //    新技能类型：enemySkillHandlers 注册一行即可
    const handler = enemySkillHandlers[skill.type]
    if (handler) {
      handler(enemyUnit, skill, attackDone)
      return
    }

    // 兜底：当成普攻
    enemyAttack(enemyUnit, attackDone)
  }

  // 🔥 伤害类技能（含行动条降低）：复用 enemyAttack 完整扣血流程（护盾/分身/西亚保命/天赋全生效），
  //    在扣血完成后施加技能附加效果
  //    🎯 支持多种子类型：`singleDamage_actionBarReduce` 与 `...Reduce1` 走同一套逻辑，
  //    但特效配置（ENEMY_EFFECT_CONFIG.skillTypes）按各自 type 匹配 → 可播放不同特效动画
  function handleActionBarReduce(enemyUnit, skill, attackDone) {
    enemyAttack(enemyUnit, () => {
      // 降低玩家行动条（最低降到 0%，不再减成负数；0 = 行动条起点，需重新攒满才能行动）
      const reducePct = skill.actionBarReduce ?? 0.2
      if (player.actionProgress !== undefined) {
        player.actionProgress = Math.max(0, player.actionProgress - ACTION_MAX * reducePct)
      }
      _playerInstanceCache?.showBuffText?.(`${t('actionBar')}-${Math.round(reducePct * 100)}%`)
      attackDone()
    }, skill)
    return
  }

  // ❄️ 凋零冰刺（凋零魔兽）：150% 冰伤 + 随机冻结玩家 2 张手牌（玩家下回合无法使用）
  //    ⚠️ 冻结走全局 bus 事件：createBattle 闭包持有的手牌数组可能已被 initBattleDeck
  //       重新赋值（playerHand.value = []），与战斗页 UI 手牌不是同一引用 → 由 index.vue 执行
  function handleFreezeCards(enemyUnit, skill, attackDone) {
    enemyAttack(enemyUnit, () => {
      emitter.emit('freezePlayerCards', { count: skill.freezeCount ?? 2, source: enemyUnit.name })
      battleLog(`❄️ ${enemyUnit.name} 尝试冻结玩家 ${skill.freezeCount ?? 2} 张手牌（下回合无法使用）`)
      attackDone()
    }, skill)
    return
  }

  // 👑 独裁（暗影王二阶段技能）：150% 物伤 + 玩家手牌所需灵力+1（使用后恢复）
  function handleDictatorship(enemyUnit, skill, attackDone) {
    enemyAttack(enemyUnit, () => {
      emitter.emit('cardCostUp', { source: enemyUnit.name })
      _playerInstanceCache?.showBuffText?.('👑 独裁：手牌灵力+1')
      battleLog('👑 ' + enemyUnit.name + ' 使用【独裁】：150%物伤 + 玩家手牌灵力消耗+1（使用后恢复）')
      attackDone()
    }, skill)
    return
  }

  // 🎭 塞咒（诅咒布偶）：向玩家牌库塞入 count 张诅咒卡（可重复抽到，离开地牢后清除）
  function handleInsertCurseCards(enemyUnit, skill, attackDone) {
    enemyAttack(enemyUnit, () => {
      const n = skill.count ?? 3
      emitter.emit('insertCurseCards', { count: n, source: enemyUnit.name })
      battleLog('🎭 ' + enemyUnit.name + ' 向玩家牌库塞入 ' + n + ' 张诅咒卡')
      attackDone()
    }, skill)
    return
  }

  // 🪢 缠绕（兽型史莱姆1）：150%物伤 + 降低玩家20%速度，持续3回合（不可叠加，可刷新，冷却3）
  //    伤害由 enemyAttack 按 skill.damageRatio 结算；回调里施加玩家减速 debuff（type slow 施加扣速，到期由 DEBUFF_NAME_CLEANUP 缠绕 恢复）
  function handleSlow(enemyUnit, skill, attackDone) {
    enemyAttack(enemyUnit, () => {
      const slowPct = skill.slowPct ?? 0.2
      const dur = skill.duration ?? 3
      const baseSpd = player.baseSpeed || player.speed || 100
      const speedDebuff = Math.round(baseSpd * slowPct * 100) / 100
      const isNew = upsertBuff(player, { name: '缠绕', type: 'slow', remaining: dur, speedDebuff }, { isDebuff: true })
      if (isNew) applyBuffSideEffects(player, { type: 'slow', speedDebuff })
      _playerInstanceCache?.showBuffText?.(`缠绕-${Math.round(slowPct * 100)}%`)
      emitter.emit('playerSlowChanged', { list: getPlayerSlowList() }) // 🐢 通知战斗页刷新减速图标
      battleLog(`🪢 ${enemyUnit.name} 对玩家施放缠绕：速度-${Math.round(slowPct * 100)}%，持续${dur}回合`)
      attackDone()
    }, skill)
    return
  }

  // 💦 粘液喷射（猫咪史莱姆）：6段(20%攻击+2%目标maxHp)物伤，每段33%概率打空，命中段减速6%（可叠加并刷新，持续2回合）
  function handleMultiHitSlow(enemyUnit, skill, attackDone) {
    const hits = Math.max(1, skill.hitCount ?? 6)
    const interval = skill.hitIntervalMs ?? 220
    const perRatio = skill.damageRatio ?? 0.2
    const maxHpPct = skill.maxHpPct ?? 0.02
    const missChance = skill.missChance ?? 0.33
    const slowPct = skill.slowPct ?? 0.06
    const dur = skill.duration ?? 2
    for (let i = 0; i < hits; i++) {
      setTimeout(() => {
        if (state.battleEnd) return
        // 🎲 每段 33% 概率打空
        if (chance(missChance)) {
          battleLog(`💦 ${enemyUnit.name} 粘液喷射第${i + 1}段打空`)
          if (i === hits - 1) attackDone()
          return
        }
        enemyAttack(
          { ...enemyUnit, attackMultiplier: perRatio, _skipAttackFx: i > 0 },
          () => {
            applySlowStacked(player, slowPct, dur)
            if (i === hits - 1) attackDone()
          },
          { ...skill, damageRatio: perRatio, maxHpPct }
        )
      }, i * interval)
    }
    return
  }

  // 🐢 汇总玩家当前减速 debuff（带 speedDebuff 的）——直接传数据给战斗页，不依赖 computed 响应式
  function getPlayerSlowList() {
    return (player.debuffs || [])
      .filter(d => d.speedDebuff != null && d.speedDebuff !== 0)
      .map(d => ({ name: d.name, remaining: d.remaining, stacks: d.stacks ?? 1 }))
  }

  // ⚔️ 回旋斩击（利刃史莱姆）：3段斩击，每段40%攻击力物理伤害，每段给玩家施加 bleedStacks 层流血（冷却3）
  function handleMultiHitBleed(enemyUnit, skill, attackDone) {
    const hits = Math.max(1, skill.hitCount ?? 3)
    const interval = skill.hitIntervalMs ?? 220
    const perRatio = skill.damageRatio ?? 0.4
    const bleedStacks = Math.max(1, skill.bleedStacks ?? 1)
    for (let i = 0; i < hits; i++) {
      setTimeout(() => {
        if (state.battleEnd) return
        enemyAttack(
          { ...enemyUnit, attackMultiplier: perRatio, _skipAttackFx: i > 0 },
          () => {
            // 🩸 每段斩击给玩家施加1层流血（可叠到5层，持续2回合，回合开始结算）
            for (let k = 0; k < bleedStacks; k++) applyBleed(enemyUnit, player)
            if (i === hits - 1) attackDone()
          },
          { ...skill, damageRatio: perRatio }
        )
      }, i * interval)
    }
    return
  }

  // 🐌 粘液减速：每段 -slowPct 速度，可叠加并刷新（持续 dur 回合）；到期由 DEBUFF_NAME_CLEANUP 粘液减速 按层数恢复
  function applySlowStacked(target, slowPct, dur) {
    const baseSpd = target.baseSpeed || target.speed || 100
    const unit = Math.round(baseSpd * slowPct * 100) / 100
    const list = (target.debuffs = target.debuffs || [])
    const exist = list.find(d => d.name === '粘液减速')
    if (exist) {
      exist.remaining = dur
      exist.stacks = (exist.stacks || 1) + 1
    } else {
      list.push({ name: '粘液减速', type: 'slow', remaining: dur, stacks: 1, speedDebuff: unit })
    }
    target.speed = Math.max(1, (target.speed ?? 100) - unit)
    emitter.emit('playerSlowChanged', { list: getPlayerSlowList() }) // 🐢 刷新减速图标
  }

  // ⚡ 重压：造成伤害 + 晕眩1回合（复用 enemyAttack 扣血）
  function handleStun(enemyUnit, skill, attackDone) {
    enemyAttack(enemyUnit, () => {
      // 晕眩玩家1回合（_stunTurns 由 checkWhoAct 检查）
      const stunTurns = skill.stunDuration ?? 1
      player._stunTurns = (player._stunTurns || 0) + stunTurns
      _playerInstanceCache?.showBuffText?.(`${t('stun')}${stunTurns}${t('turnUnit')}`)
      attackDone()
    }, skill)
    return
  }

  // 🧪 毒爆（毒系怪技能）：先给玩家施加 1 层中毒，再引爆体内毒素，
  //    造成「当前层数×skill.ratio 攻击力」毒属性伤害（不消耗毒层）
  function handlePoisonDetonate(enemyUnit, skill, attackDone) {
    applyPlayerPoison(enemyUnit, 1, skill.turns ?? 3) // 先施加 1 层
    const pb = (player.debuffs || []).find(d => d.type === 'player_poison')
    const stacks = pb?.stacks || 1
    const boomRatio = skill.ratio ?? 0.35
    const boomDmg = Math.max(1, Math.round(enemyUnit.attack * boomRatio * stacks * 100) / 100)
    // 💥 引爆：毒属性伤害（护盾优先吸收再扣血，统一走 applyDamageToPlayer）；毒层保留不清空
    applyDamageToPlayer(player, boomDmg, {
      dmgType: 'poison',
      sourceAtk: enemyUnit.attack,
      useShield: true,
      checkEnd: true, // 原行为：毒爆致死立即检查
      showDamageText: true,
    })
    _playerInstanceCache?.showBuffText?.(`${t('poison')}💥${Math.round(boomDmg)}`)
    battleLog(`🧪 ${enemyUnit.name} 引爆毒素：${boomDmg} 毒伤（${stacks} 层，毒层保留）`)
    setTimeout(attackDone, 400)
    return
  }

  // 🐈 狂怒：提升自身移速+攻击力（buff，纯辅助无伤害），并在自身循环播放特效直到状态结束
  function handleBuffSelf(enemyUnit, skill, attackDone) {
    const speedBoost = skill.speedBoost ?? 0.3
    const atkBoost = skill.attackBoost ?? 0.4
    const dur = skill.duration ?? 2
    // 存入 buff：rage 类型（onTurnStart 结算时恢复）——upsertBuff 去重刷新（重复施放刷新时长，属性覆盖式不变）
    enemyUnit.buffs = enemyUnit.buffs || []
    upsertBuff(enemyUnit, {
      name: skill.name || '狂怒',
      type: 'enemy_rage',
      remaining: dur,
      speedBoost,
      atkBoost,
      isEnemyBuff: true,
    })
    // 立即生效
    if (enemyUnit.speed !== undefined && enemyUnit.baseSpeed) {
      enemyUnit.speed = Math.round(enemyUnit.baseSpeed * (1 + speedBoost) * 100) / 100
    }
    if (enemyUnit.attack !== undefined && enemyUnit.baseAttack) {
      enemyUnit.attack = Math.round(enemyUnit.baseAttack * (1 + atkBoost) * 100) / 100
    }
    // 💚 狂怒附加效果：恢复自身 20% 已损失生命值（损失 = maxHp - hp，最多回满）
    //    比例可由技能配置 healLostRatio 覆盖（默认 0.2）
    const healLostRatio = skill.healLostRatio ?? 0.2
    if (enemyUnit.maxHp && enemyUnit.hp < enemyUnit.maxHp) {
      const lostHp = enemyUnit.maxHp - enemyUnit.hp
      const healAmt = Math.round(lostHp * healLostRatio * 100) / 100
      if (healAmt > 0) {
        enemyUnit.hp = Math.min(enemyUnit.maxHp, enemyUnit.hp + healAmt)
        // 🎈 敌人头顶飘回血文字（复用 buff 事件，显示 +xx；血条由 pixi.vue watch hp 自动刷新）
        if (enemyUnit.uid !== undefined) {
          emitter.emit('enemyBuff', { enemyName: enemyUnit.name, enemyUid: enemyUnit.uid, buffName: `+${Math.round(healAmt)}` })
        }
      }
    }
    // 🎈 狂怒是敌人的 buffSelf 技能：buff 文字应浮现在施放技能的敌人身上（走 enemyBuff 事件 → 敌人头顶），
    //    而不是玩家身上（_playerInstanceCache.showBuffText 是玩家专用）
    if (enemyUnit.uid !== undefined) {
      emitter.emit('enemyBuff', { enemyName: enemyUnit.name, enemyUid: enemyUnit.uid, buffName: skill.name || t('buffEnrage') })
    }

    // 🎇 自身循环特效（狂怒）：读 ENEMY_EFFECT_CONFIG.skillTypes.buffSelf，在敌人身上循环播放，
    //    直到 buff 结束（onTurnStart 里 enemy_rage buff 移除时同步回收）
    try {
      const rageFxCfg = getEnemySkillEffectConfig('buffSelf')
      if (rageFxCfg && rageFxCfg.effectName && !enemyUnit._rageFx) {
        const fx = getEffect(rageFxCfg.effectName)
        // 🎯 特效必须加到【敌人容器】才能显示在敌人 spine 下方：
        //    战斗特效层（getFightContainer）是独立画布，里面 zIndex 再低（如 -50）也永远盖在敌人之上；
        //    敌人容器内 spine zIndex=0，特效 zIndex=-50 才能排在敌人之下
        const fxContainer = getEnemyContainer() || getFightContainer() || _pixiAppCache || user.pixi.app
        if (fx && fxContainer) {
          fx.scale.set((rageFxCfg.scale ?? 1) * (window.innerHeight / 1080))
          fx.zIndex = rageFxCfg.zIndex ?? 100
          // 动画名兜底
          const anims = fx.skeleton?.data?.animations || []
          const animName = anims.some(a => a.name === (rageFxCfg.animName || 'animation'))
            ? (rageFxCfg.animName || 'animation')
            : (anims[0]?.name || 'animation')
          fx.state.timeScale = rageFxCfg.timeScale ?? 1
          fx.state.setAnimation(0, animName, true) // 🔁 循环播放
          // 定位：敌人 spine 实际渲染位置 + offsetY 微调（贴身上方）
          const ePos = getEnemySpinePos(enemyUnit)
          if (ePos) {
            fx.x = ePos.x + (rageFxCfg.offsetX ?? 0) * VW
            fx.y = ePos.y + (rageFxCfg.offsetY ?? -20) * VH
          }
          fxContainer.addChild(fx)
          if (fxContainer.sortChildren) fxContainer.sortChildren()
          fx._fxType = rageFxCfg.effectName // 记录池类型，buff 结束/死亡回池用
          enemyUnit._rageFx = fx
        }
      }
    } catch (e) { console.warn('[狂怒] 自身特效播放异常', e) }

    setTimeout(attackDone, 400)
    return
  }

  // 👑 暗影召唤：召唤暗影分身（纯辅助无伤害）
  function handleSummon(enemyUnit, skill, attackDone) {
    const aliveCount = enemies.filter(e => e.hp > 0).length
    const maxTotal = skill.maxTotal ?? 5
    const room = maxTotal - aliveCount
    const toSummon = Math.min(skill.summonCount ?? 2, room)
    // 🎬 召唤动作（skillAnim，如 'zhaohuan'）已在 enemyUseSkill 开头通过
    //    playEnemySkillAnim 播放（非循环，播完自动回 fight 待机）。
    //    ⏱️ summonDelay（毫秒）：角色做完召唤动作后才真正召唤暗影，
    //    默认 0 = 立即召唤（不配置延迟时保持原有即时行为）
    const summonDelay = skill.summonDelay ?? 0
    const doSummon = () => {
      if (toSummon <= 0 || typeof createEnemySummon !== 'function') return
      for (let i = 0; i < toSummon; i++) {
        // 🎯 传召唤序号（i）+ 本次召唤总数（toSummon）：index.vue 用它错开每个召唤体的数据坐标，
        //    先插的（i 小）数组 index 更小 → 视觉更靠左（更靠近玩家）→ 数据坐标也应偏移更多靠左
        createEnemySummon(enemyUnit, skill, i, toSummon)
      }
      // 🎬 召唤会触发 pixi 层全量重渲染（enemyList push → renderEnemies 重建所有 spine），
      //    敌人数组被 splice 插入新敌人，索引错位 → 浮动文字要等重建完成后
      //    再 emit（handleEnemyBuff 按 uid 重新 findIndex，此时索引已同步）
      setTimeout(() => {
        try {
          // 🎈 浮动文字显示在施放技能的敌人（暗影王）身上，而不是玩家身上
          if (enemyUnit.uid !== undefined) {
            emitter.emit('enemyBuff', { enemyName: enemyUnit.name, enemyUid: enemyUnit.uid, buffName: skill.name || t('shadowSummon') })
          }
          // ⚠️ 只有「立即召唤」（summonDelay=0）时才需要重播召唤动画：
          //    立即召唤会立刻触发全量重建，打断开头刚播放的 zhaohuan → 重建后重播一次保证可见。
          //    延迟召唤时 zhaohuan 已完整播完，重建后自然回 fight 待机，绝不重播（避免播两次）
          if (summonDelay <= 0) {
            playEnemySkillAnim(enemyUnit, skill)
          }
        } catch (e) { /* ignore */ }
      }, 150)
    }
    if (summonDelay > 0) {
      // ⏱️ 延迟召唤：先让角色播完召唤动作（skillAnim），动作完成后再出现暗影
      setTimeout(doSummon, summonDelay)
      setTimeout(attackDone, summonDelay + 500)
    } else {
      doSummon()
      setTimeout(attackDone, 500)
    }
    return
  }

  // 💚 暗影治愈（暗影王）：恢复所有友军最大生命值百分比（默认不包括自己）
  function handleHealAllies(enemyUnit, skill, attackDone) {
    const healRatio = skill.healRatio ?? 0.2
    const excludeSelf = skill.excludeSelf !== false
    let healedAny = false
    enemies.forEach(e => {
      if (e.hp <= 0) return
      if (excludeSelf && e === enemyUnit) return
      const healAmt = Math.round(e.maxHp * healRatio * 100) / 100
      if (healAmt <= 0) return
      const oldHp = e.hp
      e.hp = Math.min(e.maxHp, e.hp + healAmt)
      if (e.hp > oldHp) healedAny = true
      // 🎈 友军头顶飘治疗文字（复用 buff 事件，显示 +xx）
      emitter.emit('enemyBuff', { enemyName: e.name, enemyUid: e.uid, buffName: `+${Math.round(healAmt)}` })
    })
    _playerInstanceCache?.showBuffText?.(`${skill.name}！${healedAny ? t('allyHpRestore') : ''}`)
    battleLog(`💚 ${enemyUnit.name} 使用【${skill.name}】：全体友军恢复${Math.round(healRatio * 100)}%最大生命值`)
    setTimeout(attackDone, 400)
    return
  }

  // 🌪️ 龙卷风暴（风息）：多段风属性伤害（如 7 段×35%），每段都走完整攻击流程
  //    （风属性附加：每段 -2% 行动条 + 50% 概率流血，在 enemyAttack 的 applyDamage 里统一处理）
  //    🎬 特效 LongjuanFengbao 只播放一次（第一段），在玩家脚底释放
  function handleMultiHitWind(enemyUnit, skill, attackDone) {
    const hits = Math.max(1, skill.hitCount ?? 5)
    const perRatio = skill.damageRatio ?? 0.35
    const interval = skill.hitIntervalMs ?? 200
    const withDmgType = { ...enemyUnit, attackDmgType: 'wind' }  // 强制风属性
    // 多段攻击：每段递归一次 enemyAttack（带 skill，用 damageRatio 作每段倍率）
    for (let i = 0; i < hits; i++) {
      setTimeout(() => {
        if (state.battleEnd) return
        // 🎬 只有第一段播放技能特效（LongjuanFengbao），后续段用 _skipAttackFx 跳过特效播放
        enemyAttack(
          { ...withDmgType, attackMultiplier: perRatio, _skipAttackFx: i > 0 },
          i === hits - 1 ? attackDone : () => {}, // 只有最后一段完成才回调 done
          { ...skill, damageRatio: perRatio, dmgType: 'wind' }
        )
      }, i * interval)
    }
    return
  }

  // ⚡ 电磁场（雷鸟女皇）：使用后永久持续——玩家回合开始时受到 50% 攻击力雷伤 + 场地循环电特效
  function handleElectroField(enemyUnit, skill, attackDone) {
    enemyUnit._electroField = { ratio: skill.damageRatio ?? 0.5 }
    _playerInstanceCache?.showBuffText?.(t('buffEMField'))
    // ⚡ 场地循环电特效（diancichang）：在【玩家脚下】无限循环，直到雷鸟女皇死亡（onEnemyDied 移除）
    //    特效参数统一读 ENEMY_EFFECT_CONFIG.skillTypes.electro_field（改特效只改配置表）
    // 🎯 关键：特效必须加到【世界容器】（玩家所在画布）才能显示在玩家脚下。
    //    战斗特效层（getFightContainer）是覆盖在主世界上方的独立画布，特效层里 zIndex 再低
    //    （如 -9999）也永远在玩家之上；世界容器里玩家 zIndex=2，特效 zIndex<2 就在玩家之下。
    const fxCfg = getEnemySkillEffectConfig('electro_field') || {};
    try {
      const worldContainer = _pixiAppCache || user.pixi.app;
      if (enemyUnit._electroFieldFx) {
        // 🔁 重复施放/冷却后再次使用：复用旧特效，避免叠加多个实例
        const oldFx = enemyUnit._electroFieldFx;
        if (!oldFx.parent && worldContainer) worldContainer.addChild(oldFx);
        if (oldFx.state) oldFx.state.setAnimation(0, 'animation', true);
      } else {
        const fx = getEffect(fxCfg.effectName || 'diancichang')
        if (fx && worldContainer) {
          // 🎯 世界缩放换算：世界画布有战斗缩放（viewport zoom ≈ 1.15），
          //    除以 battleZoom 保持与之前屏幕空间相同的显示大小
          const battleZoom = window.__worldViewport?.scale?.x || 1.15;
          fx.scale.set((fxCfg.scale ?? 2.5) * (window.innerHeight / 1080) / battleZoom)
          // 🎯 层级：玩家在世界容器 zIndex=2，特效配 -50 → 渲染在玩家之下（影子之下、背景之上）
          fx.zIndex = fxCfg.zIndex ?? 1
          // 动画名兜底：取骨骼里实际存在的第一个动画，避免名字不匹配导致播不出来
          const anims = fx.skeleton?.data?.animations || [];
          const animName = anims.some(a => a.name === (fxCfg.animName || 'animation'))
            ? (fxCfg.animName || 'animation')
            : (anims[0]?.name || 'animation');
          fx.state.timeScale = fxCfg.timeScale ?? 1;   // ⏱️ 播放速度（读配置表）
          fx.state.setAnimation(0, animName, true)
          // 🎯 玩家脚下：用玩家【世界坐标】（view = 玩家 spine 在世界画布的显示对象），
          //    + 半身高度压到脚底 + offsetX/offsetY 微调（vw/vh，除以 battleZoom 保持屏幕空间语义）
          const pv = _playerInstanceCache?.view || _playerInstanceCache?.spine?.view;
          const px = pv?.x ?? (window.innerWidth / 2);
          const py = pv?.y ?? (window.innerHeight * 0.75);
          const footOffset = (_playerInstanceCache?.playerH ?? 0) / 2;
          fx.x = px + (fxCfg.offsetX ?? 0) * VW / battleZoom;
          fx.y = py + footOffset + (fxCfg.offsetY ?? 0) * VH / battleZoom;
          worldContainer.addChild(fx)
          if (worldContainer.sortChildren) worldContainer.sortChildren()
          enemyUnit._electroFieldFx = fx
        } else {
          console.warn('[电磁场] 特效创建失败：getEffect 返回 null 或容器为空', { fx: !!fx, worldContainer: !!worldContainer });
        }
      }
    } catch (e) { console.warn('[电磁场] 特效创建异常', e); }
    setTimeout(attackDone, 500)
    return
  }

  // 🐦 飞翔：对玩家造成伤害 + 自身无法受伤至下一个自身回合（复用 enemyAttack 扣血）
  function handleSingleDamageFly(enemyUnit, skill, attackDone) {
    enemyAttack(enemyUnit, () => {
      // 飞翔：无法受伤持续到下一个自身回合（onTurnStart 敌人回合开始时解除）
      enemyUnit._flying = true
      // 🎈 飞翔是敌人的自身状态：提示文字应浮现在施放技能的敌人身上（走 enemyBuff 事件 → 敌人头顶），
      //    而不是玩家身上（_playerInstanceCache.showBuffText 是玩家专用）
      if (enemyUnit.uid !== undefined) {
        emitter.emit('enemyBuff', { enemyName: enemyUnit.name, enemyUid: enemyUnit.uid, buffName: t('flyInvuln') })
        // 🐦 播放飞翔特殊动画（渲染层监听，持续至飞翔结束）
        emitter.emit('enemyFly', { enemyUid: enemyUnit.uid, flying: true })
      }
      attackDone()
    }, skill)
    return
  }

  // 📋 敌人技能分发表（type → handler）：收敛 9+ 分支，新技能类型注册一行
  const enemySkillHandlers = {
    singleDamage_actionBarReduce: handleActionBarReduce,
    singleDamage_actionBarReduce1: handleActionBarReduce, // 与 Reduce 同一逻辑，仅特效配置按各自 type
    singleDamage_stun: handleStun,
    singleDamage_freezeCards: handleFreezeCards, // ❄️ 凋零魔兽：冰伤 + 冻结手牌
    insertCurseCards: handleInsertCurseCards, // 🎭 诅咒布偶：塞入3张诅咒卡到玩家牌库
    singleDamage_dictatorship: handleDictatorship, // 👑 暗影王二阶段：150%物伤 + 手牌灵力+1
    singleDamage_slow: handleSlow, // 🪢 兽型史莱姆1：150%物伤 + 降玩家20%速度3回合（不可叠加可刷新）
    multiHit_slow: handleMultiHitSlow, // 💦 猫咪史莱姆：6段(20%攻击+2%目标maxHp)物伤，每段33%打空，命中减速6%可叠加刷新
    multiHit_bleed: handleMultiHitBleed, // ⚔️ 利刃史莱姆：3段40%物伤，每段施加1层流血
    poisonDetonate: handlePoisonDetonate,
    buffSelf: handleBuffSelf,
    summon: handleSummon,
    healAllies: handleHealAllies,
    multiHit_wind: handleMultiHitWind,
    electro_field: handleElectroField,
    singleDamage_fly: handleSingleDamageFly,
  }


  // 🎯 召唤暗影分身（暗影王技能）
  //    只创建数据，通过 window.__onEnemySummoned 交给 index.vue 渲染
  //    summonIdx：本次召唤的第几个（0 起），summonTotal：本次召唤总数，
  //    用于多个召唤体按插入顺序错开数据坐标（先插的靠左）
  function createEnemySummon(sourceEnemy, skill, summonIdx = 0, summonTotal = 1) {
    const summonRatio = skill.summonStatRatio ?? 0.5
    const newEnemy = {
      id: Date.now() + Math.random(),
      juese: skill.summonType || 'monster1',
      mapId: 'desert_02',
      player: 2,
      x: 0,
      y: 75 * VH,
      speed: 0,
      direction: -1,
      hp: 1,
      // 🎯 记录召唤源（暗影王）uid：index.vue 渲染时把召唤体放到暗影王前方
      //    顶层 + data 双写：顶层给 window.__onEnemySummoned 消费，data 在 index.vue
      //    展开时自动带进战斗单位（统一标记规范，避免重建时丢失）
      _sourceUid: sourceEnemy.uid,
      _sourceJuese: sourceEnemy.juese,
      // 🎯 召唤序号 + 总数：多个召唤体数据坐标依次错开（指定卡牌可区分）
      _summonIdx: summonIdx,
      _summonTotal: summonTotal,
      data: {
        name: '暗影',
        hp: Math.max(1, Math.floor((sourceEnemy.maxHp || 100) * summonRatio)),
        maxHp: Math.max(1, Math.floor((sourceEnemy.maxHp || 100) * summonRatio)),
        baseSpeed: Math.max(1, Math.floor((sourceEnemy.baseSpeed || 90) * summonRatio)),
        speed: Math.max(1, Math.floor((sourceEnemy.baseSpeed || 90) * summonRatio)),
        allDamageBonus: 0,
        executeDamageBonus: 1,
        takenDamageReduce: 1,
        damageTaken: 0,
        physDamageTaken: 0,
        camp: 'enemy',
        position: 0,
        baseArmor: Math.max(0, Math.floor((sourceEnemy.baseArmor || 40) * summonRatio)),
        armor: Math.max(0, Math.floor((sourceEnemy.baseArmor || 40) * summonRatio)),
        baseAttack: Math.max(1, Math.floor((sourceEnemy.baseAttack || 12) * summonRatio)),
        attack: Math.max(1, Math.floor((sourceEnemy.baseAttack || 12) * summonRatio)),
        baseLuck: 0,
        luck: 0,
        isElite: false,
        attackMultiplier: sourceEnemy.attackMultiplier ?? 1,
        attackBase: 0,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.4,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        spineScale: 0.6,
        spineAlpha: 0.75,
        skills: [],
        passives: [],
        baseExp: 5,
        _isSummon: true,
        _sourceUid: sourceEnemy.uid,
        _sourceJuese: sourceEnemy.juese,
      }
    }
    // 通过 index.vue 注册的回调创建敌人并同步渲染
    if (typeof window.__onEnemySummoned === 'function') {
      window.__onEnemySummoned(newEnemy)
    }
  }

  function enemyAttack(enemyUnit, done, skill) {
    // 获取敌人在数组中的索引
    const enemyIndex = enemies.indexOf(enemyUnit);
    // 🔒 ruchang 入场锁定期间：延迟执行攻击，等锁定解除
    const _lockSpine = _enemySpineListCache?.[enemyIndex]?.spine;
    if (_lockSpine?._ruchangLock) {
      setTimeout(() => enemyAttack(enemyUnit, done, skill), 200);
      return;
    }

    // 🎵 播放敌人普攻音效（无 skill 时是普攻）：
    //    - 普攻 → 优先 ENEMY_EFFECT_CONFIG 该敌人攻击特效的 sound/soundVolume，回退敌人数据 attackSound
    //    - 技能（有 skill，如单伤类复用 enemyAttack 的扣血流程）→ 技能音效已在 enemyUseSkill 播放，这里不再重复
    //    无文件自动跳过（后期替换音频即可生效）
    if (!skill) {
      const enemyAtkFx = getEnemyFxConfig(enemyUnit.juese, 'attack');
      const enemySfx = enemyAtkFx?.sound || enemyUnit.attackSound;
      if (enemySfx) {
        user.playSoundEffect(enemySfx, enemyAtkFx?.soundVolume ?? 1);
      }
    }

    // 播放敌人攻击动画（如果有attack动画）
    if (_enemySpineListCache && enemyIndex >= 0 && _enemySpineListCache[enemyIndex]) {
      const enemySpineItem = _enemySpineListCache[enemyIndex];
      const spine = enemySpineItem.spine;

      if (spine && spine.state) {
        // 攻击前冲抖动：往前冲一下再回来（不管有没有attack动画都执行）
        const originalX = spine.x;
        const dashDistance = 15; // 前冲距离（朝左，所以是减）
        spine.x = originalX - dashDistance;
        // 150ms 后复位
        setTimeout(() => {
          spine.x = originalX;
        }, 150);

        // 触发屏幕抖动（敌人攻击的冲击感）
        emitter.emit('screenShake', { intensity: 6, duration: 0.15 });

        if (spine.skeleton?.data?.animations) {
          const animations = spine.skeleton.data.animations;
          // 🎬 动画名：普攻（skill 为空）只用 attackAnim/attack；技能（复用 enemyAttack 扣血）才用 skill.skillAnim || enemyUnit.skillAnim，
          //    最后回退 attack（每个技能可各配不同动作，普攻绝不误播 jineng）
          const animName = skill ? (skill.skillAnim || enemyUnit.skillAnim || enemyUnit.attackAnim || 'attack') : (enemyUnit.attackAnim || 'attack');
          const hasAnim = animations.some(a => a.name === animName);
          const hasFightAnim = animations.some(a => a.name === 'idle');
          // ⚠️ 回切动画绝不能是 attack（否则会一直循环攻击动画，如风息）
          // ⚠️ 战斗中回切动画优先 fight（战斗中默认 fight，idle 仅在非战斗场景用）
          // 没有 fight 就选 idle；再没有就选第一个非 attack/feixing/fly 的动画兜底（雷鸟的 feixing 绝不能当待机）
          const backAnim = hasFightAnim
            ? 'idle'
            : (animations.some(a => a.name === 'idle')
                ? 'idle'
                : (animations.find(a => a.name !== 'attack' && a.name !== 'feixing' && a.name !== 'fly')?.name || animations[0]?.name));

          // 🔒 ruchang 入场动画播放期间，不覆盖动画（直接检查 spine 当前 track）
          const _curTrack = spine.state?.tracks?.[0];
          const _isRuchang = spine._ruchangLock === true || _curTrack?.animation?.name === "ruchang";
          if (hasAnim && backAnim && !_isRuchang) {
            // 播放动画（不循环）
            spine.state.setAnimation(0, animName, false);
            // ✅ 用 addAnimation 排队：动画【完整播放完毕】后再自动接 fight，
            //    不依赖硬编码时长（之前固定 350ms 会截断/残留最后一帧）
            spine.state.addAnimation(0, backAnim, true, 0);
          } else if (backAnim) {
            // 没有 attack 动画：直接保持 fight/兜底动画
            spine.state.setAnimation(0, backAnim, true);
          }
        }
      }
    }

    // 从敌人配置读取攻击参数（普通怪/精英怪不同）
    // 🎯 若传入技能 skill，用技能的伤害倍率（damageRatio）替代默认攻击倍率
    // ⚠️ 攻击特效（attackEffect/attackEffectScale/attackEffectOffsetX/Y）已迁移到
    //    ENEMY_EFFECT_CONFIG 配置表（见 playEnemyEffect），这里不再读取
    // 🎯 多段普攻：attackHits > 1（如雷鸟女皇 3 段×40%）→ 每段间隔结算一次完整攻击
    const hits = Math.max(1, enemyUnit.attackHits ?? 1);
    if (hits > 1 && !skill) {
      const perRatio = enemyUnit.attackMultiplier ?? 0.1;
      const interval = enemyUnit.hitIntervalMs ?? 150;
      for (let i = 0; i < hits; i++) {
        setTimeout(() => {
          enemyAttack(
            { ...enemyUnit, attackHits: 1, attackMultiplier: perRatio },
            i === hits - 1 ? done : () => {}, // 只有最后一段完成才回调 done
            skill
          );
        }, i * interval);
      }
      return;
    }
    const attackMultiplier = skill?.damageRatio ?? enemyUnit.attackMultiplier ?? 0.1;
    // 🐱 百分比最大生命值附加（普攻 attackMaxHpPct / 技能 skill.maxHpPct）：目标最大生命值 × 百分比
    const maxHpPctVal = skill?.maxHpPct !== undefined ? skill.maxHpPct : enemyUnit.attackMaxHpPct;
    const maxHpBonus = maxHpPctVal ? (player.maxHp || 0) * maxHpPctVal : 0;
    const baseDmg = enemyUnit.attack * attackMultiplier + maxHpBonus;
    // ⚡ 普攻伤害类型（默认物理；雷鸟女皇可配 attackDmgType: 'lightning'）
    const attackDmgType = enemyUnit.attackDmgType ?? 'physical';

    // ====================== 真实伤害判断 ======================
    let finalDmg
    if (player.lowHpBuffTriggered) {
      const hpRate = player.hp / player.maxHp
      // ====================== 向死而生：受伤后判定残血 ======================
      if (hpRate <= talentFx('low_hp_battle_buff', 'hpRate', 0.35)) {
        _playerInstanceCache?.showBuffText(t('buffDeathDefiance'));
        player.lowHpBuffTriggered = false
        player.executeDamageBonus += talentFx('low_hp_battle_buff', 'dmgBonus', 0.5);
        player.takenDamageReduce -= talentFx('low_hp_battle_buff', 'takenReduce', 0.3);
      }
    }

    // 燃血自残标记 = 真实伤害，无视护甲&所有减伤
    if (enemyUnit.isTrueDamage) {
      finalDmg = baseDmg
    } else {
      // 普通敌人伤害走正常护甲减免（伤害类型：默认物理，可用 attackDmgType 配置如雷属性）
      const res = calculateFinalDamage(
        baseDmg,
        player,
        { ignoreArmor: enemyUnit.ignoreArmor ? 1 : 0, dmgType: attackDmgType, player: enemyUnit, buff: null }
      );
      finalDmg = res.dmg
    }
    // =========================================================

    // 🛡️ 反弹状态受伤减免（二星-5%，三星-10%）
    const reflectBuffForReduce = player.buffs.find(b => b.type === "reflect");
    if (reflectBuffForReduce?.dmgReduce) {
      finalDmg = Math.round(finalDmg * (1 - reflectBuffForReduce.dmgReduce) * 100) / 100;
    }

    // 播放攻击特效（自残不播放怪物攻击特效）
    // 🎬 特效播放数据来自 ENEMY_EFFECT_CONFIG 配置表：
    //    - 普攻（无 skill）→ 敌人攻击特效
    //    - 技能（有 skill）→ 按技能类型 skillTypes 匹配，未配置回退普攻特效
    // ⏱️ damageDelay（毫秒）：特效配置里可设延迟出伤——特效先播放，damageDelay 毫秒后才结算伤害
    //    （读取当前攻击/技能的特效配置；默认 0 = 特效与伤害同时）
    let damageDelay = 0
    try {
      if (!enemyUnit.isTrueDamage) {
        const delayCfg = skill
          ? getEnemySkillEffectConfig(skill.type)
          : getEnemyFxConfig(enemyUnit.juese, 'attack');
        damageDelay = delayCfg?.damageDelay ?? 0;
      }
    } catch (e) { /* ignore */ }

    if (!enemyUnit.isTrueDamage && !enemyUnit._skipAttackFx) {
      const appContainer = getFightContainer() || _pixiAppCache || user.pixi.app;
      // 🎯 juese 兼容多层结构（顶层 / data / data.data）+ monsterType；
      //    fight/index.vue 已把 createBaseEnemy 顶层的 juese 透传到战斗单位，
      //    这里再兜底一层（召唤物等直接构造的单位）
      const fxJuese = enemyUnit.juese || enemyUnit.data?.juese || enemyUnit.data?.data?.juese
        || enemyUnit.monsterType || enemyUnit.data?.monsterType || 'monster1';
      playEnemyEffect({
        juese: fxJuese,
        kind: skill ? 'skill' : 'attack',
        skillType: skill?.type,
        container: appContainer,
        player, enemies, target: enemyUnit,
        onHit: null,
        // 🎯 事件驱动特效（onHit 事件帧）：需要 spine 实例 + 当前动画名（判断动画里是否有事件帧）
        animName: skill ? (skill.skillAnim || enemyUnit.skillAnim || enemyUnit.attackAnim || 'attack') : (enemyUnit.attackAnim || 'attack'),
        spine: _enemySpineListCache?.[enemyIndex]?.spine,
      });
    }

    // ⏱️ 延迟出伤：damageDelay > 0 时，把「伤害结算整段」（飘字/扣血/护盾/分身/反弹/天赋/削甲/灵力汲取）
    //    延迟到特效播放后 delay 毫秒再执行；= 0 时保持原有同步行为
    const applyDamage = () => {
    // 先备份玩家血量，避免函数重复扣血
    const backupPlayerHp = player.hp;

    // 触发受伤飘字动画（真实伤害也正常飘红数字）
    const playerInstance = _playerInstanceCache || user.pixi.playerInstance;
    if (playerInstance?.takeDamage) {
      // 🎨 传实际伤害属性（attackDmgType）→ 玩家受伤飘字用对应属性颜色
      //    （physical橙/wind青绿/fire红/lightning紫/ice蓝/water深蓝/poison紫）
      playerInstance.takeDamage(finalDmg, { type: attackDmgType || 'physical', isCritical: false }, enemyUnit.attack);
      playerInstance.data.data.hp = backupPlayerHp;
      // 🛡️ 战斗中玩家扣血统一由 player.hp 结算（护盾/分身/保命全生效），takeDamage 内部会误扣 store 血量 → 恢复，战斗结束再按 player.hp 同步（否则护盾白挡、store 血量被多扣）
      if (user.pixi?.player?.juese) user.pixi.player.juese.hp = backupPlayerHp;
    }

    // 影分身承伤逻辑（真实伤害分身一样分摊）
    const clone = allies.find(a => a.isShadowClone && a.hp > 0)
    if (clone) {
      const shareDmg = Math.floor(finalDmg * clone.takeDmgRatio)
      const selfDmg = finalDmg - shareDmg

      clone.hp = Math.max(0, clone.hp - shareDmg)
      // 主角承伤部分优先扣护盾（统一走 applyDamageToPlayer；分身分支原无盾反/能量转换，仅抵消+保命）
      const { absorbed: _cloneAbs, actualDmg: _cloneReal } = applyDamageToPlayer(player, selfDmg, {
        dmgType: attackDmgType || 'physical',
        sourceAtk: enemyUnit.attack,
        useShield: true,
        onShieldBroken: () => {
          if (hasTalent('shield_absorb')) {
            battleLog('[天赋] 抵消：护盾被击碎，溢出伤害被抵消');
            return true;
          }
          return false;
        },
        onLethal: () => {
          // 西亚保命正常生效
          if (hasTalent('death_cheat') && _userStoreCache.pixi.player.deathCheatUsedDay !== _userStoreCache.pixi.player.day) {
            player.hp = talentFx('death_cheat', 'keepHp', 1);
            _userStoreCache.pixi.player.deathCheatUsedDay = _userStoreCache.pixi.player.day;
            _playerInstanceCache?.showBuffText(t('buffXiyaBlessing'));
            battleLog('[天赋] 西亚的祝福：免疫致命伤害，生命值锁定为1点');
            return true;
          }
          return false;
        },
        checkEnd: false, // 玩家死亡由行动结束 checkBattleEnd 统一判定（原行为）
        showDamageText: false, // 飘字已在外部用全额 finalDmg 播放
      });
      battleLog(`👥 分身替主角承伤 ${shareDmg}，护盾吸收 ${_cloneAbs}，主角承受 ${_cloneReal}`)

      if (clone.hp <= 0) {
        const idx = allies.indexOf(clone)
        if (idx > -1) allies.splice(idx, 1)
        battleLog("💨 影分身被击破，退场")
      }
    } else {
      // 无分身全额吃伤，护盾正常抵挡真实伤害（统一走 applyDamageToPlayer）
      const { absorbed: _shieldAbs, actualDmg: _realDmg } = applyDamageToPlayer(player, finalDmg, {
        dmgType: attackDmgType || 'physical',
        sourceAtk: enemyUnit.attack,
        useShield: true,
        onAbsorbed: () => {
          // ========== 敌方攻击护盾 → 触发盾反 ==========
          if (hasTalent('shield_reflect_damage')) {
            const lv = user.getTalentLevel('shield_reflect_damage');
            const reflectRate = talentFx('shield_reflect_damage', 'baseRate', 2.2) + talentFx('shield_reflect_damage', 'perLvRate', 0.2) * (lv - 1);

            // 按敌人原始受到伤害计算反弹
            const reflectDmg = Math.round(finalDmg * reflectRate * 100) / 100;

            calculateFinalDamage(reflectDmg, enemyUnit, { ignoreArmor: 0, dmgType: 'physical', player: player, buff: null, applyElement: true, enemies: [], skillName: '护盾反击' });
            _playerInstanceCache?.showBuffText(t('buffShieldReflect'));
          }
          // 护盾受击 能量转换 加行动条
          if (hasTalent('shield_charge_action')) {
            const lv = user.getTalentLevel('shield_charge_action');
            const percent = talentFx('shield_charge_action', 'basePct', 6) + talentFx('shield_charge_action', 'perLvPct', 3) * (lv - 1);
            const boostAmount = ACTION_MAX * (percent / 100);
            player.actionProgress = Math.min(player.actionProgress + boostAmount, ACTION_MAX);
            _playerInstanceCache?.showBuffText(t('buffEnergyConversion'));
          }
        },
        onShieldBroken: () => {
          if (hasTalent('shield_absorb')) {
            battleLog('[天赋] 抵消：护盾被击碎，溢出伤害被抵消');
            return true; // 抵消剩余伤害
          }
          return false;
        },
        onLethal: () => {
          // 西亚不死依旧生效
          if (hasTalent('death_cheat') && _userStoreCache.pixi.player.deathCheatUsedDay !== _userStoreCache.pixi.player.day) {
            player.hp = talentFx('death_cheat', 'keepHp', 1);
            _userStoreCache.pixi.player.deathCheatUsedDay = _userStoreCache.pixi.player.day;
            _playerInstanceCache?.showBuffText(t('buffXiyaBlessing'));
            battleLog('[天赋] 西亚的祝福：免疫致命伤害，生命值锁定为1点');
            return true;
          }
          return false;
        },
        checkEnd: false, // 玩家死亡由行动结束 checkBattleEnd 统一判定（原行为）
        showDamageText: false, // 飘字已在外部用全额 finalDmg 播放
      });
      battleLog(`⚔️ ${enemyUnit.name} 攻击玩家，护盾吸收 ${_shieldAbs}，造成 ${_realDmg} 伤害`)
    }
    // ========== 绝对防御：每次受击扣除1层，归零后移除护甲加成 ==========
    if (hasTalent('start_battle_armor_buff')) {
      const absDef = player.buffs.find(b => b.type === 'abs_defense');
      if (absDef) {
        absDef.hitRemain -= 1;
        battleLog(`[天赋] 绝对防御：剩余 ${absDef.hitRemain} 次`);
        if (absDef.hitRemain <= 0) {
          player.armor -= absDef.addArmor;
          if (absDef.addMR) player.magicResist = Math.max(0, (player.magicResist || 0) - absDef.addMR);
          absDef.isPermanent = false;
          // 从 buffs 中移除
          const idx = player.buffs.indexOf(absDef);
          if (idx > -1) player.buffs.splice(idx, 1);
          _playerInstanceCache?.showBuffText(t('buffAbsDefenseGone'));
          battleLog(`[天赋] 绝对防御：已失效，护甲减少 ${absDef.addArmor} 魔抗减少 ${absDef.addMR || 0}`);
        }
      }
    }

    // 🔥 天赋：尖刺防御 - 每次受伤对随机敌人造成（护甲+魔抗）伤害，累计叠层（无属性只吃护甲减伤，数值已减半）
    if (hasTalent('thorn_defense')) {
      if (player._thornDefenseStacks === undefined) player._thornDefenseStacks = 0;
      player._thornDefenseStacks += 1;
      const stacks = player._thornDefenseStacks;
      const baseRate = talentFx('thorn_defense', 'baseRate', 0.15);
      const extraRate = talentFx('thorn_defense', 'perStackRate', 0.01) * (stacks - 1); // 每次触发额外加成
      const totalRate = Math.min(baseRate + extraRate, talentFx('thorn_defense', 'maxRate', 0.75)); // 上限
      const rawDmg = Math.floor((player.armor + (player.magicResist || 0)) * totalRate);

      const aliveEnemies = enemies.filter(e => e.hp > 0);
      if (aliveEnemies.length > 0) {
        const randomIdx = pickIndex(aliveEnemies.length);
        const target = aliveEnemies[randomIdx];
        calculateFinalDamage(rawDmg, target, { ignoreArmor: 0, dmgType: 'null', player: player, buff: null, applyElement: true, enemies: [], skillName: '尖刺防御' });
        battleLog(`[天赋] 尖刺防御 第${stacks}次：对 ${target.name} 造成 ${rawDmg} 点无属性伤害（${(totalRate * 100).toFixed(0)}% 护甲+魔抗，吃护甲减伤）`);
      }
    }

    // 快速愈合、汲取、顺势疾行、反伤全部正常触发，自残也算受伤
    if (hasTalent('low_hp_emergency_heal') && !player._lowHpEmergencyHealUsed) {
      const hpPercent = player.hp / player.maxHp;
      if (hpPercent < talentFx('low_hp_emergency_heal', 'hpRate', 0.4) && hpPercent > 0) {
        player._lowHpEmergencyHealUsed = true;
        // 保留两位小数，不取整
        const healPerTick = Math.round(player.maxHp * talentFx('low_hp_emergency_heal', 'healPct', 0.03) * 100) / 100;
        for (let i = 0; i < Math.round(talentFx('low_hp_emergency_heal', 'ticks', 5)); i++) {
          setTimeout(() => {
            if (state.battleEnd) return;
            applyHeal(player, healPerTick, 'heal');
            _playerInstanceCache?.showBuffText(t('buffFastHeal'));
            battleLog(`[天赋] 快速愈合 第${i + 1}/5次：恢复${healPerTick}点生命`);
          }, i * 200);
        }
      }
    }
    if (player.hitShieldCount) {
      // 受击次数递减
      player.hitShieldCount -= 1
      // 次数耗尽 = 触发护盾
      if (player.hitShieldCount <= 0) {
        const shieldAdd = Math.round(player.maxHp * talentFx('hit_count_shield', 'shieldPct', 0.08) * 100) / 100
        // 叠加原有护盾
        player.shield = Math.round((player.shield + shieldAdd) * 100) / 100
        _playerInstanceCache?.showBuffText(t('buffPressureGuard'))
        battleLog(`[天赋] 承压御守：累计受击8次，获得${shieldAdd}护盾`)
        // 触发完重置，下一轮继续累计8次
        player.hitShieldCount = Math.round(talentFx('hit_count_shield', 'hits', 8))
      }
    }
    // 绝境守御：残血低于40% 每场战斗仅1次，护盾叠加不覆盖
    if (hasTalent('low_hp_shield') && !player._lowHpShieldUsed) {
      const hpPercent = player.hp / player.maxHp;
      if (hpPercent < talentFx('low_hp_shield', 'hpRate', 0.4) && hpPercent > 0) {
        player._lowHpShieldUsed = true;
        const shieldAdd = Math.round(player.maxHp * talentFx('low_hp_shield', 'shieldPct', 0.15) * 100) / 100;
        // 原有护盾 + 新增护盾，保留两位小数
        player.shield = Math.round((player.shield + shieldAdd) * 100) / 100;

        _playerInstanceCache?.showBuffText(t('buffLastStand'));
        battleLog(`[天赋] 绝境守御：追加${shieldAdd}点护盾`);
      }
    }
    if (user.hasTalent('hurt_atk_stack')) {
      const lv = user.getTalentLevel('hurt_atk_stack')
      const rate = talentFx('hurt_atk_stack', 'perLvRate', 0.01) * (lv + 1)
      const atkBonus = Math.trunc(player.baseAttack * rate * 100) / 100
      playerAttackUp(player, atkBonus, rate * 100, '愤怒')
      _playerInstanceCache?.showBuffText(t('buffRage'));
    }
    if (user.hasTalent('swift_rush')) {
      const lv = user.getTalentLevel('swift_rush')
      const addProgress = talentFx('swift_rush', 'perLvProgress', 50) * lv + talentFx('swift_rush', 'baseProgress', 50)
      player.actionProgress = Math.min(player.actionProgress + addProgress, ACTION_MAX) // 🎯 硬上限
      _playerInstanceCache?.showBuffText(t('buffSwiftRush'));
    }
    const reflectBuff = player.buffs.find(b => b.type === "reflect");
    if (reflectBuff && reflectBuff.remaining > 0) {
      const rBase = reflectBuff.reflectBase;
      const rArmor = reflectBuff.reflectArmor;
      const rawReflectDmg = Math.round((finalDmg * rBase + player.armor * rArmor) * 100) / 100;
      const realDmg = calculateFinalDamage(rawReflectDmg, enemyUnit, { ignoreArmor: 0, dmgType: 'physical', player: player, buff: null, applyElement: true, enemies: [], skillName: '反弹' });
      battleLog(`🛡️ 反弹伤害(正常吃敌方护甲)：${realDmg}`);
    }
    if (player.reflectRate && player.reflectRate > 0) {
      const reflectRawDmg = Math.round(baseDmg * player.reflectRate * 100) / 100;
      battleLog(`🛡️ 天赋荆棘反伤：反弹折前伤害 ${reflectRawDmg}`);
      calculateFinalDamage(reflectRawDmg, enemyUnit, { ignoreArmor: 0, dmgType: '', player: player, buff: null, applyElement: true, enemies: [], skillName: '反弹伤害' });
    }

    // 🛡️ 巨型眼瞳普攻：削弱玩家 10% 当前护甲（仅普攻，技能不触发）
    if (!skill && enemyUnit.attackArmorReducePct && player.armor > 0) {
      const armorReduce = Math.max(0, Math.round(player.armor * enemyUnit.attackArmorReducePct * 100) / 100);
      player.armor = Math.max(0, Math.round((player.armor - armorReduce) * 100) / 100);
      _playerInstanceCache?.showBuffText?.(`${t('armor')}-${Math.round(armorReduce)}`);
      battleLog(`🛡️ ${enemyUnit.name} 普攻削弱玩家护甲 ${armorReduce}`);
    }

    // 🔮 巨型眼瞳被动「灵力汲取」：造成伤害时降低玩家 1 点灵力
    const manaDrainP = Array.isArray(enemyUnit.passives)
      ? enemyUnit.passives.find(p => p.type === 'manaDrainOnHit')
      : null;
    if (manaDrainP && player.mp > 0) {
      const drain = manaDrainP.manaDrain ?? 1;
      player.mp = Math.max(0, Math.round((player.mp - drain) * 100) / 100);
      _playerInstanceCache?.showBuffText?.(`${t('mana')}-1`);
      battleLog(`🔮 ${enemyUnit.name} 造成伤害，玩家灵力 -${drain}`);
    }

    // 🌬️ 风属性附加效果（风息普攻/龙卷风暴）：每段 -2% 行动条 + 50% 概率给玩家施加流血
    //    与玩家风刃/龙卷风暴机制一致（玩家被打也会吃行动条降低和流血）
    const dmgTypeNow = skill?.dmgType || enemyUnit.attackDmgType || 'physical';
    const isWindHit = dmgTypeNow === 'wind';
    // 普攻：默认每段 -2% 行动条 + 50% 流血；技能：用技能自己的配置（如龙卷风暴 windActionBarReduce/bleedChance）
    const windReduce = skill?.windActionBarReduce ?? 0.02;
    const windBleedChance = skill?.bleedChance ?? 0.5;
    if (isWindHit) {
      // 降低玩家行动条（最低降到 0%，不再减成负数）
      if (player.actionProgress !== undefined && windReduce > 0) {
        player.actionProgress = Math.max(0, player.actionProgress - ACTION_MAX * windReduce);
      }
      // 概率流血（加到玩家身上）
      if (chance(windBleedChance)) {
        try { applyBleed(enemyUnit, player); } catch (e) { /* ignore */ }
      }
    }
    // 🧪 毒系怪普攻附加毒：命中后给玩家施加 attackPoison 层中毒（持续 attackPoison.turns 回合）
    if (!skill && enemyUnit.attackPoison) {
      try {
        applyPlayerPoison(enemyUnit, enemyUnit.attackPoison.stacks ?? 1, enemyUnit.attackPoison.turns ?? 3)
      } catch (e) { /* ignore */ }
    }
    // ⚗️ 敌人元素攻击命中湿润玩家 → 反向元素反应（对玩家结算）
    //    火→蒸发、冰→冻结（概率）、雷→感电；触发后移除玩家湿润
    const hasPlayerWet = (player.debuffs || []).some(d => d.name === '湿润');
    if (hasPlayerWet && !enemyUnit.isTrueDamage) {
      const removeWetFromPlayer = () => {
        player.debuffs = (player.debuffs || []).filter(d => d.name !== '湿润');
      };
      if (dmgTypeNow === 'fire') {
        // 💧🔥 蒸发：95% 攻击力火属性伤害
        const evapDmg = Math.floor(enemyUnit.attack * 0.95);
        calculateFinalDamage(evapDmg, player, { ignoreArmor: 0, dmgType: 'fire', player: enemyUnit, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
        _playerInstanceCache?.showBuffText?.(t('eleVaporize'));
        battleLog('💧🔥 敌人对玩家触发蒸发：', evapDmg);
        removeWetFromPlayer();
      } else if (dmgTypeNow === 'ice') {
        // ❄️💧 冻结：55% 攻击力冰属性伤害 + 概率冻结玩家1回合
        const frostDmg = Math.floor(enemyUnit.attack * 0.55);
        calculateFinalDamage(frostDmg, player, { ignoreArmor: 0, dmgType: 'ice', player: enemyUnit, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
        _playerInstanceCache?.showBuffText?.(t('eleFreeze'));
        battleLog('❄️💧 敌人对玩家触发冻结：', frostDmg);
        // 35% 基础概率冻结玩家（吃敌方幸运）
        const baseChance = 0.35;
        const luckRate = 1 + (enemyUnit.luck ?? 0) / (120 + (enemyUnit.luck ?? 0));
        if (!enemyUnit.noFreezeReact && chance(Math.min(baseChance * luckRate, 1))) {
          player._stunTurns = (player._stunTurns || 0) + 1;
          battleLog('🥶 玩家被冻结1回合');
        }
        removeWetFromPlayer();
      } else if (dmgTypeNow === 'lightning') {
        // ⚡💧 感电：65% 攻击力雷属性伤害 + 降低12%行动条
        const elecDmg = Math.floor(enemyUnit.attack * 0.65);
        calculateFinalDamage(elecDmg, player, { ignoreArmor: 0, dmgType: 'lightning', player: enemyUnit, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
        if (player.actionProgress !== undefined) {
          player.actionProgress = Math.max(0, player.actionProgress - 1200);
        }
        _playerInstanceCache?.showBuffText?.(t('eleElectroCharged'));
        battleLog('⚡💧 敌人对玩家触发感电：', elecDmg);
        removeWetFromPlayer();
      }
    }
    // ❄️🧪 敌人元素攻击命中霜冻玩家 → 霜冻反应（对玩家结算）
    //    火→融化（1.5倍火伤）、雷→超导（雷伤+减速行动条）、冰→强化冻结；触发后消耗霜冻
    const hasPlayerFrost = (player.debuffs || []).some(d => d.name === '霜冻');
    if (hasPlayerFrost && !enemyUnit.isTrueDamage) {
      const removeFrostFromPlayer = () => {
        player.debuffs = (player.debuffs || []).filter(d => d.name !== '霜冻');
      };
      if (dmgTypeNow === 'fire') {
        // ❄️🔥 融化：150% 攻击力火属性伤害（克制霜冻）
        const meltDmg = Math.floor(enemyUnit.attack * 1.5);
        calculateFinalDamage(meltDmg, player, { ignoreArmor: 0, dmgType: 'fire', player: enemyUnit, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
        _playerInstanceCache?.showBuffText?.(t('eleMelt'));
        battleLog('❄️🔥 敌人对玩家触发融化：', meltDmg);
        removeFrostFromPlayer();
      } else if (dmgTypeNow === 'lightning') {
        // ❄️⚡ 超导：85% 攻击力雷属性伤害 + 降低18%行动条
        const superDmg = Math.floor(enemyUnit.attack * 0.85);
        calculateFinalDamage(superDmg, player, { ignoreArmor: 0, dmgType: 'lightning', player: enemyUnit, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
        if (player.actionProgress !== undefined) {
          player.actionProgress = Math.max(0, player.actionProgress - 1800);
        }
        _playerInstanceCache?.showBuffText?.(t('eleSuperconduct'));
        battleLog('❄️⚡ 敌人对玩家触发超导：', superDmg);
        removeFrostFromPlayer();
      } else if (dmgTypeNow === 'ice') {
        // ❄️❄️ 强化冻结：60% 攻击力冰属性伤害 + 高概率冻结玩家1回合
        const deepFrostDmg = Math.floor(enemyUnit.attack * 0.6);
        calculateFinalDamage(deepFrostDmg, player, { ignoreArmor: 0, dmgType: 'ice', player: enemyUnit, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
        const baseChance = 0.55;
        const luckRate = 1 + (enemyUnit.luck ?? 0) / (120 + (enemyUnit.luck ?? 0));
        if (!enemyUnit.noFreezeReact && chance(Math.min(baseChance * luckRate, 1))) {
          player._stunTurns = (player._stunTurns || 0) + 1;
          battleLog('🥶 霜冻强化：玩家被冻结1回合');
        }
        _playerInstanceCache?.showBuffText?.(t('eleFreeze'));
        removeFrostFromPlayer();
      }
    }
    } // —— applyDamage 结束 ——

    // ⏱️ 延迟出伤：damageDelay > 0 → 特效先播，delay 毫秒后再结算伤害；否则立即结算
    if (damageDelay > 0) {
      setTimeout(applyDamage, damageDelay)
      setTimeout(done, damageDelay + 400)
    } else {
      applyDamage()
      setTimeout(done, 400)
    }
  }
  // ========== 关键：把敌人攻击函数暴露出去 ==========
  BattleSystem.enemyAttack = enemyAttack
  // ====================
  // 行动结束
  // ====================
  function endAction() {
    state.acting = false
    state.currentActor = null
    state.phase = 'waiting'
    checkBattleEnd(playerHand) // ✅ 传入卡牌组
  }
  // 英雄联盟护甲减伤公式（核心；统一走 computeArmorReduction 收敛入口）
  function calcDamage(attacker, target, baseDamage) {
    const armor = getFinalArmor(target) // ✅ 自动吃所有减甲
    const actualDmg = Math.round(baseDamage * (1 - computeArmorReduction(armor)) * 100) / 100
    return Math.max(1, actualDmg)
  }
  // ====================
  // 全局回合
  // ====================
  function checkGlobalRound() {
    const limit = isFirstRound ? FIRST_CYCLE_AT : NORMAL_CYCLE_AT
    if (globalAT >= limit) {
      state.round++
      globalAT = 0
      isFirstRound = false
    }
  }

  // ====================
  // 【敌人死亡统一处理】必触发！
  // ====================
  function onEnemyDied(deadEnemy, playerHand) {
    battleLog("✅ 敌人死亡：", deadEnemy.name)

    // 🚫 死亡后从行动条上移除（设置为负值，aliveEnemies 过滤后不显示）
    deadEnemy.actionProgress = -9999

    // 💀 敌人死亡音效（/music/dilao/dirensiwang.mp3，一次性）
    try { user.playSoundEffect('music/dilao/dirensiwang.mp3'); } catch (e) { /* ignore */ }

    // 🪄 召唤者死亡 → 其召唤物随之消亡（暗影随王消散）：
    //    否则存活召唤物会阻塞胜利判定（enemies.every 要求所有单位 hp<=0），战斗永远不结束
    try {
      enemies.forEach(s => {
        if (s.hp > 0 && (s._sourceUid === deadEnemy.uid || s.data?._sourceUid === deadEnemy.uid)) {
          s.hp = 0
          s._checked = true // 本场已结算，防止重复触发 onEnemyDied
          battleLog(`🪄 召唤物 ${s.name} 随召唤者 ${deadEnemy.name} 消亡`)
        }
      })
    } catch (e) { /* ignore */ }

    // ⚡ 电磁场（雷鸟女皇）死亡：移除场地循环特效 + 停止场地伤害
    if (deadEnemy._electroFieldFx) {
      try { returnEffect('diancichang', deadEnemy._electroFieldFx) } catch (e) { /* ignore */ }
      deadEnemy._electroFieldFx = null
    }
    delete deadEnemy._electroField

    // 🐈 魔化猫狂怒自身特效：死亡时回收（防残留）
    if (deadEnemy._rageFx) {
      try { returnEffect(deadEnemy._rageFx._fxType || 'Fenyan', deadEnemy._rageFx) } catch (e) { /* ignore */ }
      deadEnemy._rageFx = null
    }

    // 🧪 剧毒怪死亡被动：死亡后给玩家施加 deathPoisonStacks 层中毒
    if (deadEnemy.deathPoisonStacks) {
      try {
        applyPlayerPoison(deadEnemy, deadEnemy.deathPoisonStacks, deadEnemy.deathPoisonTurns ?? 3)
      } catch (e) { /* ignore */ }
    }
    // 🎃 空心布偶死亡被动：玩家速度-4%（击杀立即生效 + 本次地牢内累计，可叠加，离开地牢清除）
    const speedDownPassive = (deadEnemy.passives || deadEnemy.data?.passives || []).find(p => p.type === 'deathSpeedDown')
    if (speedDownPassive) {
      try {
        const sdPct = speedDownPassive.speedDownPct ?? 0.04
        const juese = user.pixi?.player
        if (juese) {
          juese.dungeonSpeedDown = Math.round(((juese.dungeonSpeedDown || 0) + sdPct) * 10000) / 10000
          _playerInstanceCache?.showBuffText?.(`🐢 速度-${Math.round(sdPct * 100)}%（地牢内）`)
          battleLog(`🎃 减速诅咒：${deadEnemy.name} 死亡，玩家速度-${Math.round(sdPct * 100)}%（本次地牢累计 -${Math.round((juese.dungeonSpeedDown || 0) * 100)}%）`)
          // ⚡ 击杀立即生效：按累计减速重算当前战斗玩家速度（基于原始基础速度，避免重复乘算）
          const _rawBase = Math.floor(user.pixi.player.juese?.baseSpeed ?? player.baseSpeed ?? player.speed)
          const _slowedNow = Math.max(1, Math.floor(_rawBase * (1 - juese.dungeonSpeedDown)))
          player.baseSpeed = _slowedNow
          player.speed = _slowedNow

          // 🐢 添加减速诅咒 buff 到状态栏
          const existSlow = (player.debuffs || []).find(b => b.name === '减速诅咒')
          if (existSlow) {
            existSlow.speedDebuff = (existSlow.speedDebuff || 0) + sdPct * 100
          } else {
            player.debuffs.push({
              name: '减速诅咒',
              speedDebuff: sdPct * 100,
              remaining: 999,
              isPermanent: true,
              pct: true // 📊 百分比型减速（4 = 4%）：状态详情按 % 显示
            })
          }
          emitter.emit('playerBuffsForceSync')
        }
      } catch (e) { /* ignore */ }
    }

    // 🎭 诅咒布偶死亡被动：永久封禁玩家随机一张牌（本次地牢内，抽到后无法打出）
    const banPassive = (deadEnemy.passives || []).find(p => p.type === 'deathBanCard')
    if (banPassive) {
      try {
        emitter.emit('banPlayerCard', { source: deadEnemy.name })
        battleLog('🎭 ' + deadEnemy.name + ' 死亡：封禁玩家随机一张牌（本次地牢内）')
      } catch (e) { /* ignore */ }
    }

    // 🌑 暗影拖拽被动：死亡后降低玩家 20% 行动条（passives 配置 actionBarReduce，默认 0.2）
    const dragPassive = (deadEnemy.passives || []).find(p => p.type === 'deathActionBarReduce')
    if (dragPassive) {
      try {
        const reducePct = dragPassive.actionBarReduce ?? 0.2
        if (player.actionProgress !== undefined) {
          player.actionProgress = Math.max(0, player.actionProgress - ACTION_MAX * reducePct)
        }
        _playerInstanceCache?.showBuffText?.(`${t('actionBar')}-${Math.round(reducePct * 100)}%`)
        battleLog(`🌑 暗影拖拽：${deadEnemy.name} 死亡拖拽，玩家行动条降低 ${Math.round(reducePct * 100)}%`)
      } catch (e) { /* ignore */ }
    }

    // 🔥 天赋：夺命烙印 - 记录数值50%转移给随机敌方单位
    if (hasTalent('death_mark_stack') && deadEnemy._deathMarkAccum > 0) {
      const transfer = Math.round(deadEnemy._deathMarkAccum * talentFx('death_mark_stack', 'transferPct', 0.5) * 100) / 100;
      delete deadEnemy._deathMarkAccum;

      const aliveEnemies = enemies.filter(e => e.hp > 0 && e !== deadEnemy);
      if (aliveEnemies.length > 0) {
        // 随机选择一个存活敌人
        const targetEnemy = aliveEnemies[pickIndex(aliveEnemies.length)];
        // 将转移值叠加到目标敌人的累计记录上
        if (targetEnemy._deathMarkAccum === undefined) targetEnemy._deathMarkAccum = 0;
        targetEnemy._deathMarkAccum = Math.round((targetEnemy._deathMarkAccum + transfer) * 100) / 100;
        battleLog(`[天赋] 夺命烙印：${transfer.toFixed(2)} 转移给 ${targetEnemy.name}，累计 ${targetEnemy._deathMarkAccum.toFixed(2)}`);
      } else {
        battleLog(`[天赋] 夺命烙印：无存活敌人，${transfer.toFixed(2)} 消失`);
      }
    }

    // 🔥 天赋：余伤蔓延 - 溢出伤害在最近的敌人身上直接扣血
    if (deadEnemy?._spreadOverflow > 0) {
      const spreadRate = talentFx('kill_spread_damage', 'transferPct', 0.6);
      const overflow = deadEnemy._spreadOverflow * spreadRate;
      battleLog('overflow=', overflow);

      delete deadEnemy._spreadOverflow;
      delete deadEnemy._spreadOverflowRaw;

      const aliveEnemies = enemies.filter(e => e.hp > 0 && e !== deadEnemy);
      if (aliveEnemies.length > 0) {
        // 按 x 坐标排序找最近的（敌人排列在右侧，x 越接近越近）
        aliveEnemies.sort((a, b) => Math.abs(a.x - deadEnemy.x) - Math.abs(b.x - deadEnemy.x));
        const nearest = aliveEnemies[0];
        // 🛡️ 受击前统一拦截：暗影王有召唤物存活时溢出伤害同样免疫
        if (hasSummonShield(nearest, enemies)) return;
        // 🛡️ 统一伤害落地（溢出伤害：只扣血+飘字，不触发死亡检查/受击被动/记录，保持原行为）
        applyDamageToTarget(nearest, overflow, {
          player, dmgType: 'null', isCritical: false, skillName: '余伤蔓延', enemies,
          triggerPassives: false, trackOverflow: false, trackMark: false, checkBattleEnd: false,
        });
      }
    }

    // 🔥 道具：黑米的灵晶 - 击杀计数+1，实时更新攻击力
    const userStore = _userStoreCache;
    if (userStore && userStore.isItemEquipped?.('黑米的灵晶')) {
      const kills = userStore.pixi.player.equippedItemKillCounts;
      if (kills && kills['黑米的灵晶'] !== undefined) {
        kills['黑米的灵晶'] += 1;
        player.attack += 0.4;
        battleLog(`[道具] 黑米的灵晶：击杀+1，总击杀=${kills['黑米的灵晶']}，攻击力+0.4`);
      } else {
        // 初始化为1（从0开始计数）
        if (!kills) userStore.pixi.player.equippedItemKillCounts = {};
        userStore.pixi.player.equippedItemKillCounts['黑米的灵晶'] = 1;
        player.attack += 0.4;
        battleLog(`[道具] 黑米的灵晶：首次击杀，攻击力+0.4`);
      }
    }

    // 🔥 天赋：噬灵收割 - 消灭敌人后恢复灵力
    if (hasTalent('kill_recover_mana')) {
      const lv = _userStoreCache.getTalentLevel?.('kill_recover_mana') || 1;
      const recoverMp = Math.round(talentFx('kill_recover_mana', 'baseMp', 1) + talentFx('kill_recover_mana', 'mpPerLv', 1) * (lv - 1));
      player.mp = Math.min(player.maxMp, player.mp + recoverMp);
      _playerInstanceCache?.showBuffText(t('buffSoulHarvest'));
      battleLog(`[天赋] 噬灵收割 Lv.${lv}：消灭敌人，恢复${recoverMp}点灵力`);
    }
  }

  // ====================
  // 战斗结束检测（修复版）
  // ====================
  function checkBattleEnd() {
    // 【关键】不使用 _deadMarked 过滤，避免锁死
    const deadEnemies = enemies.filter(e => e.hp <= 0)

    // 👑 暗影王二阶段：血量归0不死亡，变身二阶段（数据切换 + 气泡 + 王权召唤）
    const phase2Boss = enemies.find(e => e._phase2Data && !e._phase2 && e.hp <= 0)
    if (phase2Boss) {
      enterPhase2(phase2Boss)
      return // 变身期间本回合不结算死亡/胜负（王权消灭的单位已标记 _checked 防重复）
    }

    // 逐个处理死亡敌人
    deadEnemies.forEach(e => {
      // 只处理没结算过的
      if (!e._checked) {
        e._checked = true // ★ 先标记再处理，防止递归触发
        onEnemyDied(e, playerHand)
      }
    })

    // 结束判断
    const isVictory = enemies.every(e => e.hp <= 0)
    const isDefeat = player.hp <= 0
    // 战败后血量归 0（显示 0 且用于触发 siwang 死亡动画；不保留 1 滴血）
    if (isDefeat) {
      player.hp = Math.max(0, player.hp)
      // 🧪 战败：清掉中毒角标（毒已无意义）
      try { emitter.emit('playerPoison', { stacks: 0, remaining: 0 }) } catch (e) { /* ignore */ }
    }

    if (isVictory || isDefeat) {
      if (!zhandou) {
        zhandou = true
        state.battleEnd = true
        clearInterval(timer)
        timer = null

        // 清理毒雾领域动画 + field 领域特效（playCardEffect 播放的）
        removePoisonMist();
        removeFieldFx();

        // 🔥 计算战斗奖励（⛔ 讨伐战已移除：不再按战斗场景/深入度读取，经验倍率恒 1；
        //    地牢/自定义战斗经验倍率已由配置端 baseExp 计算好）
        // ❌ 战斗失败：不计算任何奖励（经验/道具全空），胜利才结算
        const rewards = isVictory ? calculateBattleRewards(enemies) : { totalExp: 0, totalGold: 0, itemRewards: [] }
        battleLog('rewards=', rewards);

        // 💀 玩家战败：播放 siwang 死亡动画（不循环，播完保留最后一帧），
        //    并延迟结算弹窗到动画播完（动画时长由 playPlayerDeathAnim 返回）
        const resultDelay = isDefeat ? playPlayerDeathAnim() : 0;

        setTimeout(() => {
          try { _playerInstanceCache?.spine?.spine?.state && (_playerInstanceCache.spine.spine.state.timeScale = 1); } catch (e) { /* ignore */ } // 恢复动画速度
          // 🔥 发送战斗结束事件，由Vue组件处理弹窗和奖励发放
          emitter.emit("battleEnd", {
            isVictory,
            expGained: rewards.totalExp,
            goldGained: rewards.totalGold,
            itemRewards: rewards.itemRewards,
            rounds: state.round,
          })

          battleLog(`🏆 战斗结束！${isVictory ? '胜利' : '失败'}`)
          battleLog(`🎁 获得经验：${rewards}`)
          zhandou = false
        }, resultDelay + 500);
      }
    }
  }

  // ====================
  // 👑 暗影王二阶段变身
  // ====================
  function enterPhase2(boss) {
    const p2 = boss._phase2Data || {}
    boss._phase2 = true
    boss._phase2JustEntered = true // 🎬 刚变身标记：全量重建时重播 ruchang
    if (p2.name) boss.name = p2.name // 📛 二阶段改名（如 巨型眼瞳 → 千目魔瞳）
    boss._phase2EnteredAt = performance.now() // 🎬 变身时刻：演出窗口（1.5s 镜头特写）判断用
    // 🧹 二阶段变身：清空自身已有的增益/减益状态（含元素附着：湿润/霜冻/灼烧/电流等 debuff）
    boss.buffs = []
    boss.debuffs = []
    // 🧹 重置直改型状态字段：弱点/洞悉等易伤、毒易伤、冻结标记、夺命烙印累积等
    //    （破甲=直接扣 armor，靠下方 p2.armor 重设覆盖）
    boss.damageTaken = p2.damageTaken ?? 0          // 易伤
    boss.physDamageTaken = p2.physDamageTaken ?? 0  // 物理易伤
    boss.allDamageBonus = p2.allDamageBonus ?? 0    // 增伤
    boss.executeDamageBonus = p2.executeDamageBonus ?? 1 // 最终增伤
    boss.takenDamageReduce = p2.takenDamageReduce ?? 1   // 最终减伤
    boss.poisonTaken = 0                            // 毒易伤
    boss.poisonStacks = 0                           // 毒层
    boss._deathMarkAccum = 0                        // 夺命烙印累积
    boss._frozenThisTurn = false                    // 冻结（本回合跳过行动）
    boss._charmFrozen = false                       // 犹怜行动条冻结
    // 🛡️ 二阶段变身无敌：ruchang 入场动画期间免疫所有伤害（多段伤害的后续段不打断变身）
    boss._phase2Invincible = true
    clearTimeout(boss._phase2InvincibleTimer)
    // ⏱️ 兜底：6 秒后强制解除（防动画 complete 事件丢失导致永久无敌）
    boss._phase2InvincibleTimer = setTimeout(() => { boss._phase2Invincible = false }, 6000)
    boss.hp = p2.hp
    boss.maxHp = p2.hp
    boss.attack = p2.attack
    boss.baseAttack = p2.attack
    boss.armor = p2.armor
    boss.baseArmor = p2.armor
    boss.magicResist = p2.magicResist
    boss.baseMagicResist = p2.magicResist
    boss.speed = p2.speed
    boss.baseSpeed = p2.speed
    boss.luck = p2.luck
    boss.baseLuck = p2.luck
    boss.attackAnim = p2.attackAnim || 'attack'
    boss.skillAnim = p2.skillAnim || 'jineng'
    boss.attackSound = p2.attackSound
    boss.skillSound = p2.skillSound
    boss.spineScale = p2.spineScale ?? boss.spineScale
    boss.skills = p2.skills ? JSON.parse(JSON.stringify(p2.skills)) : []
    boss.passives = p2.passives ? JSON.parse(JSON.stringify(p2.passives)) : []
    if (Array.isArray(boss.skills)) boss.skillCds = boss.skills.map(s => s.initialCooldown ?? 0)
    boss.actionProgress = 0 // 变身期间不行动
    battleLog('👑 ' + boss.name + ' 进入二阶段！')
    // 💬 文字气泡（2秒淡入淡出）+ spine 切换（ruchang → idle，渲染层处理）
    // 🎯 直接带暗影王 spine 真实坐标（stage = 屏幕坐标），气泡定位不再依赖渲染层同步查询
    let bx = null, by = null
    try { const _sp = getEnemySpinePos(boss); if (_sp) { bx = _sp.x; by = _sp.y } } catch (e) { /* ignore */ }
    try { emitter.emit('bossPhase2', { enemyUid: boss.uid, text: p2.bubbleText || '进入二阶段！', x: bx, y: by }) } catch (e) { /* ignore */ }
    // 🎥 变身演出：慢动作 50%（长兜底 15 秒，ruchang 播完 1 秒后精确恢复）+ 主世界镜头移动到 boss（matter.vue 做）
    setSlowMo(0.25, 15000)
    try { emitter.emit('phase2Zoom', { enemyUid: boss.uid, x: bx, y: by }) } catch (e) { /* ignore */ }
    // 👑 王权（被动驱动）：只有配置了 sovereignty 被动的 boss 才消灭其他魔物并召唤共享生命的护卫
    if ((boss.passives || []).some(p => p.type === 'sovereignty')) sovereigntySummon(boss)
    // 🎯 强制刷新 enemies 数组，确保行动条正确更新
    try {
      const _idx = enemies.indexOf(boss);
      if (_idx >= 0) {
        const _boss = enemies.splice(_idx, 1)[0];
        enemies.splice(_idx, 0, _boss);
      }
    } catch(e) {}
  }

  // 👑 王权被动（二阶段入场）：消灭场上所有其他魔物，召唤空心布偶/诅咒布偶各1
  //    （属性与暗影王相同，共享生命值：伤害分摊给所有存活共享成员）
  function sovereigntySummon(boss) {
    try {
      enemies.forEach(e => {
        if (e !== boss && e.hp > 0) {
          e.hp = 0
          e._checked = true
          battleLog('👑 王权：消灭 ' + e.name)
        }
      })
      const stats = {
        hp: boss.maxHp || 450,
        attack: boss.attack || 26,
        armor: boss.armor || 40,
        speed: boss.baseSpeed ?? boss.speed ?? 105,
        magicResist: boss.magicResist || 25,
        luck: boss.luck || 10,
      }
      ;['buou1', 'buou'].forEach((type, idx) => {
        let cfg = (monsterConfigs || {})[type] || {}
        // 🎃 王权召唤的「空心布偶」：'buou' 只是骨骼名，怪物配置（含技能+被动+普攻中毒）在 duwuguai 上，补全
        if (type === 'buou') {
          const _dw = (monsterConfigs || {}).duwuguai || {}
          cfg = { 
            ...cfg, 
            passives: _dw.passives ? JSON.parse(JSON.stringify(_dw.passives)) : [],
            skills: _dw.skills ? JSON.parse(JSON.stringify(_dw.skills)) : [],
            attackPoison: _dw.attackPoison ? JSON.parse(JSON.stringify(_dw.attackPoison)) : undefined,
            attackMultiplier: _dw.attackMultiplier ?? cfg.attackMultiplier,
          }
        }
        const newEnemy = {
          id: Date.now() + Math.random(),
          juese: type,
          mapId: 'desert_02',
          player: 2,
          x: 0,
          y: 75 * VH,
          speed: 0,
          direction: -1,
          hp: stats.hp,
          _sourceUid: boss.uid,
          _summonIdx: idx,
          _summonTotal: 2,
          data: {
            name: cfg.name || (type === 'buou' ? '空心布偶' : '诅咒布偶'),
            juese: type,
            hp: stats.hp,
            maxHp: stats.hp,
            baseSpeed: stats.speed,
            speed: stats.speed,
            allDamageBonus: 0,
            executeDamageBonus: 1,
            takenDamageReduce: 1,
            damageTaken: 0,
            physDamageTaken: 0,
            camp: 'enemy',
            position: 0,
            baseArmor: stats.armor,
            armor: stats.armor,
            baseMagicResist: stats.magicResist,
            magicResist: stats.magicResist,
            baseAttack: stats.attack,
            attack: stats.attack,
            baseLuck: stats.luck,
            luck: stats.luck,
            isElite: false,
            attackMultiplier: cfg.attackMultiplier ?? 1,
            attackBase: 0,
            attackPoison: cfg.attackPoison || undefined,
            attackEffect: 'zhuaji',
            attackEffectScale: 0.4,
            attackEffectOffsetX: 2,
            attackEffectOffsetY: 0,
            attackAnim: cfg.attackAnim || 'attack',
            skillAnim: cfg.skillAnim || 'attack',
            attackSound: cfg.attackSound || 'enemy_monster1_attack',
            skillSound: cfg.skillSound || 'enemy_monster1_skill',
            spineScale: cfg.spineScale ?? 0.8,
            spineAlpha: 1,
            skills: cfg.skills ? JSON.parse(JSON.stringify(cfg.skills)) : [],
            passives: cfg.passives ? JSON.parse(JSON.stringify(cfg.passives)) : [],
            flipX: cfg.flipX ?? false,
            enterAnim: cfg.enterAnim || 'ruchang', // 🎪 出场先播入场动画（王权召唤的布偶）
            _enterAnimPending: true,
            enterTimeScale: 0.35, // 🐢 召唤布偶的 ruchang 用 0.35 速度（普通遭遇默认 0.5）
            baseExp: 0,
            _isSummon: true,
            _sourceUid: boss.uid,
          }
        }
        // 🎯 与 createEnemySummon 一致：只创建数据，由 window.__onEnemySummoned
        //    统一把 createUnit 单位插入 enemies（同一数组，战斗逻辑可见）。
        //    ⚠️ 不要在这里再 enemies.push：会导致王权召唤体在行动条上出现双份
        //    （原始对象无 uid、hp 永不变化，永远残留在左侧行动条）
        if (typeof window.__onEnemySummoned === 'function') {
          window.__onEnemySummoned(newEnemy)
        }
        battleLog('👑 王权召唤：' + newEnemy.data.name)
      })
    } catch (e) { console.warn('[王权] 召唤异常', e) }
  }

  // ====================
  // 计算战斗奖励
  // ====================

  BattleSystem.checkBattleEnd = checkBattleEnd
  // 手动开启战斗循环（页面点击开始战斗调用）
  function resumeLoop() {
    loopPaused = false
  }
  // 暂停战斗循环（备用）
  function pauseLoop() {
    loopPaused = true
  }
  // ====================
  // 拉条 / 推条
  // ====================
  function advance(target, percent) {
    const totalAdd = ACTION_MAX * (percent / 100);
    const step = totalAdd / 10; // 分10步加完（可改步数）
    let count = 0;

    const timer = setInterval(() => {
      target.actionProgress = Math.min(target.actionProgress + step, ACTION_MAX);
      count++;
      if (count >= 10) clearInterval(timer);
    }, 25); // 每30ms走一步，非常顺滑
  }

  // 平滑击退：一点点减（最低降到 0%，不再减成负数；0 = 行动条起点，需重新攒满才能行动）
  function pushback(target, percent) {
    const totalSub = ACTION_MAX * (percent / 100);
    const step = totalSub / 10; // 分10步减完
    let count = 0;

    const timer = setInterval(() => {
      target.actionProgress = Math.max(0, target.actionProgress - step);
      count++;
      if (count >= 10) clearInterval(timer);
    }, 25);
  }
  startLoop()
  let battleDestroyed = false
  let frozen = false
  function destroyBattle() {
    frozen = true // ⭐ 关键

    loopPaused = true
    battleDestroyed = true

    if (timer) {
      clearInterval(timer)
      timer = null
    }

    player.actionProgress = 0
    allies.forEach(u => u.actionProgress = 0)
    enemies.forEach(e => e.actionProgress = 0)
    try { if (window.__getFightEnemies) window.__getFightEnemies = null } catch (e) { /* ignore */ }
  }

  // 🔥 重置战斗（用于胜利后继续深入/原地搜索，开启新一场战斗）
  function resetBattle() {
    // 重置战斗结束标记
    state.battleEnd = false
    state.round = 1
    state.currentActor = null
    state.acting = false
    state.phase = 'waiting'
    zhandou = false
    frozen = false
    battleDestroyed = false
    loopPaused = true // 先暂停，由外部调用 resumeLoop 启动

    // ✅ 重置全局回合计数器（首次进入战斗时设为 true，后续重置也要恢复）
    globalAT = 0
    isFirstRound = true

    // 🔥 瞬连突袭：重置连续行动标记
    _lastActorWasPlayer = false;
    player._continuousStrikeNextTurn = false;
    player._firstCardFreeThisTurn = false;
    player._firstCardFreeConsumed = false;
    if (player._continuousStrikeAtkBonus) {
      player.attack -= player._continuousStrikeAtkBonus;
      player._continuousStrikeAtkBonus = 0;
    }
    // 🕐 重置卡牌「未来」额外回合标记
    player._extraTurnPending = false;
    // 🌬️ 重置风之庇佑（射击恢复物理属性）
    player._shootIsWind = false;
    player._shootWindBoostPct = 0;
    // 💧 重置水愈 buff
    player.buffs = (player.buffs || []).filter(b => b.name !== '水愈');
    // 重置所有单位行动进度
    player.actionProgress = 0
    allies.forEach(u => {
      u.actionProgress = 0
      // 🔥 NPC 队友：重置技能冷却与实时属性
      if (u.isNpcAlly) {
        u.skillCdRemain = u.skillInitialCooldown ?? 2
        u.attack = u.baseAttack
        u.armor = u.baseArmor
        u.luck = 0
        u.hp = u.maxHp
      }
    })
    enemies.forEach(e => {
      e.actionProgress = 0
      e._checked = false
    })

    // 🔥 重置玩家状态：清空buff/debuff，从 juese 重新读取最新属性（等级升级后的新属性）
    const juese = user.pixi.player.juese
    player.buffs = []
    player.debuffs = []
    // 🧪 清掉中毒角标（新战斗重新结算）
    try { emitter.emit('playerPoison', { stacks: 0, remaining: 0 }) } catch (e) { /* ignore */ }
    player.shield = 0
    player.maxMp = juese.maxMp
    player.mp = player.maxMp  // 满灵力进战
    player.maxHp = Math.floor(juese.maxHp)
    // 保留当前血量（上一场战斗后剩余的血量），不重置为满血
    player.hp = Math.min(Math.floor(player.hp), player.maxHp)
    player.baseAttack = Math.floor(juese.baseAttack)
    player.attack = Math.floor(juese.baseAttack)
    player.baseArmor = Math.floor(juese.baseArmor)
    player.armor = Math.floor(juese.baseArmor)
    player.baseMagicResist = Math.floor(juese.baseMagicResist ?? 10)
    player.magicResist = Math.floor(juese.baseMagicResist ?? 10)
    player.baseSpeed = Math.floor(juese.baseSpeed)
    player.speed = Math.floor(juese.baseSpeed)
    // 🎃 空心布偶减速诅咒：本次地牢内玩家速度-4%/层（可叠加，离开地牢清除）
    const _dungeonSlow = Number(user.pixi.player.dungeonSpeedDown || 0)
    if (_dungeonSlow > 0) {
      const _slowed = Math.max(1, Math.floor(player.speed * (1 - _dungeonSlow)))
      player.speed = _slowed
      player.baseSpeed = _slowed
    }
    player.baseLuck = Math.floor(juese.baseLuck)
    player.luck = Math.floor(juese.baseLuck)
    // 🔥 重置"每场战斗仅触发1次"的天赋标记
    player._lowHpEmergencyHealUsed = false;
    player._lowHpShieldUsed = false;
    // 🔥 尖刺防御：重置叠层
    player._thornDefenseStacks = 0;
    // ========== 调用公共的进入战斗加成 ==========
    applyEntryBuffs(player, enemies);

    // 清理毒雾 + field 领域特效
    removePoisonMist()
    removeFieldFx()

    // 重启定时器
    if (!timer) {
      startLoop()
    }

    battleLog('🔄 战斗已重置，准备开始新一场战斗')
  }

  // 👑 暴露当前战斗敌人列表（供 SkillDamage 暗影庇佑免疫判断实时读取；战斗销毁时清理）
  try { window.__getFightEnemies = () => enemies } catch (e) { /* ignore */ }

  return {
    state,
    playerUseCard,
    advance,
    pushback,
    calcDamage,
    endPlayerTurn,//手动结束
    checkBattleEnd,//判断敌人死亡
    resumeLoop, // 新增：启动进度条
    pauseLoop,
    destroyBattle,
    resetBattle
  }
}
