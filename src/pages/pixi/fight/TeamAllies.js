import { battleLog } from './logger.js'
import { createUnit } from './Unit.js'
import { useCounterStore } from "@/store/counter";

const user = useCounterStore();

/**
 * 创建携带的队友（世界地图战斗准备面板选择）
 * 从 store 读取队友战斗属性配置，生成一个 AI 战斗单位
 * - 拥有普攻 + 一个技能（技能进入冷却后只使用普攻）
 * - 敌人不会攻击队友（敌人 AI 只攻击玩家），所以队友无需血条
 * - 玩家死亡则战斗失败
 * @returns {Array} 队友单位数组（无队友时为空数组）
 */
export function createAllies() {
  const allyList = [];
  // 读取当前携带队友
  const allyImg = user.getNpcAlly?.();
  if (!allyImg) return allyList;

  const cfg = user.getAllyBattleData?.(allyImg);
  if (!cfg) return allyList;

  // ===== 🎭 解析当前选定的技能（selectedSkillId 指向 skillList 中的一项）=====
  // 若 skillList 存在，用选中的技能覆盖扁平字段（skillType/skillName/skillValue/...）
  // 兼容旧数据：无 skillList / selectedSkillId 无效时，直接使用原有的扁平技能字段
  const effSkill = (() => {
    if (Array.isArray(cfg.skillList) && cfg.skillList.length > 0) {
      const selected = cfg.skillList.find(s => s.id === cfg.selectedSkillId) || cfg.skillList[0];
      if (selected) return selected;
    }
    return null;
  })();
  // 有效技能字段（选中的技能项 优先于 扁平字段，缺失项回退到扁平字段）
  const S = (key) => (effSkill && effSkill[key] !== undefined) ? effSkill[key] : cfg[key];

  // 💗 好感度战斗加成：每拥有 50 好感度，进入战斗全属性 +10%（无上限，动态计算不写档）
  //    好感度 0-49 → 0%；50-99 → +10%；100-149 → +20% ……
  const _favNpc = user.pixi?.npcSelectList?.find(n => n.img === allyImg)
  // 💗 单点换算：由 counter.js 的 getAffectionFightMult 统一提供（每 50 好感 +10%，无上限）
  const _favMult = (user.getAffectionFightMult?.(_favNpc?.affection ?? 0)) ?? (1 + Math.floor((_favNpc?.affection ?? 0) / 50) * 0.10)
  if (_favMult !== 1) {
    battleLog(`[羁绊] ${cfg.name || allyImg} 好感度 ${_favNpc?.affection ?? 0}：进入战斗全属性 +${Math.round((_favMult - 1) * 100)}%`);
  }

  const ally = createUnit({
    name: cfg.name || '队友',
    img: allyImg,
    juese: cfg.juese,
    // 队友有血量但不参与被攻击（敌人不打队友），用于存活判断
    hp: Math.round((cfg.hp ?? 300) * _favMult),
    maxHp: Math.round((cfg.maxHp ?? 300) * _favMult),
    baseAttack: Math.round((cfg.baseAttack ?? 14) * _favMult),
    baseArmor: Math.round((cfg.baseArmor ?? 20) * _favMult),
    baseSpeed: Math.round((cfg.baseSpeed ?? 100) * _favMult),
    camp: 'player',
    // 标记为携带的 NPC 队友
    isNpcAlly: true,
    // ===== 🎯 新技能系统字段 =====
    // 普攻配置（attackType: 'playerAtk'=基于玩家攻击力 | 'heal'=治疗玩家 | 默认=自身攻击力）
    attackType: cfg.attackType || 'selfAtk',
    attackRatio: cfg.attackRatio ?? 0.6,
    attackDmgType: cfg.attackDmgType || 'physical',
    // 技能配置（skillType 区分行为；由 skillList 中选中的技能项提供）
    skillType: S('skillType') || 'damage',   // damage | enemyDamageTaken | aoePushback | shield | manaCharge | playerActionBar | heal | aoeDamage | singleDamage
    skillName: S('skillName') || '队友技能',
    // 🎯 当前选中技能的 id（如 'chanrao'），ALLY_EFFECT_CONFIG 按它选对应特效/音效
    skillId: effSkill?.id || cfg.selectedSkillId || null,
    // 🎬 技能本体动作动画名（由 skillList 选中的技能项提供；普攻固定 attack）
    skillAnim: S('skillAnim') || null,       // 技能时本体播放的动作（缺省回退 attack）
    skillValue: S('skillValue') ?? 1.5,
    skillDuration: S('skillDuration') ?? 3,
    skillPushback: S('skillPushback') ?? 0,
    skillCooldown: S('skillCooldown') ?? 3,
    // 初始冷却（进战斗后需经过的自身回合数才可使用技能，默认 2）
    skillInitialCooldown: S('skillInitialCooldown') ?? 2,
    skillDmgType: S('skillDmgType') || 'physical',
    // 被动配置（passiveType 区分行为）
    passiveType: cfg.passiveType || null,   // null | actionBar | enemySlow | allyDamageUp | manaConsume | enemyDamageTaken | enemyActionBarReduce
    passiveValue: cfg.passiveValue ?? 0,     // 被动数值（如 enemySlow 减速比例、enemyDamageTaken 易伤比例、enemyActionBarReduce 推条百分比）
    // 💧 manaConsume 被动专用配置（魔力消耗阈值 / 触发伤害倍率 / 伤害类型，可调）
    passiveManaCost: cfg.passiveManaCost ?? 10,
    passiveDmgType: cfg.passiveDmgType || 'water',
    // 技能冷却计数（初始为 skillInitialCooldown，进战斗后经过初始冷却才可用）
    skillCdRemain: S('skillInitialCooldown') ?? 2,
    // 🔥 云弥灵力充能状态（突破上限的灵力，持续1回合）
    manaOverride: 0,
    // 🎵 战斗音效（占位文件名，后期替换；无文件自动跳过）
    attackSound: cfg.attackSound || null,  // 普攻音效
    // 技能音效：优先用当前选中技能项里的 sound（skillList 每项可单独配），缺省回退同伴级 skillSound
    skillSound: S('sound') || cfg.skillSound || null,
  });

  allyList.push(ally);
  return allyList;
}
