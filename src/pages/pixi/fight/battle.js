import { reactive } from 'vue'
import { tickMiasma, getFinalArmor, calculateSkillDamage, useSkillShooting, calculateFinalDamage } from './SkillDamage'
import { useCounterStore } from "@/store/counter";
import { removeSummon, getSummonInstance, getFirePointPosition, playSpineProjectile, playReflectBuff, removeReflectBuff, removePoisonMist, playSpineEffect } from "./SkillLogic"
import emitter from "@/bus";

const user = useCounterStore();
export const BattleSystem = {}
const POISON_BUFFS = ["瘴毒", "毒雾"];
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
let _playerInstanceCache = null;
// 🔥 天赋缓存
let _talentsCache = [];
let _userStoreCache = null;

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
 * 应用战斗开始时的天赋效果
 */
function applyBattleStartTalents(player) {
  console.log('天赋=', _talentsCache);

  // 天赋：灵力奔涌 - 最大灵力+1，当前灵力+3
  if (hasTalent('mana_surge')) {
    player.maxMp += 1;
    player.mp = Math.min(player.maxMp, player.mp + 3);
    console.log('[天赋] 灵力奔涌：最大灵力+1，获得3点灵力');
  }

  // 天赋：战斗狂热 - 攻击力和速度提升15%
  if (hasTalent('battle_frenzy')) {
    const atkBonus = Math.floor(player.baseAttack * 0.15);
    const spdBonus = player.baseSpeed * 0.15;
    player.attack += atkBonus;
    player.speed += spdBonus;

    player.buffs.push({
      name: '战斗狂热',
      stack: 0,
      isPermanent: true
    });
    console.log('[天赋] 战斗狂热：攻击力+15%，速度+15%');
  }

  // 天赋：致命一击 - 幸运+15
  if (hasTalent('critical_strike')) {
    player.luck += 15;
    console.log('[天赋] 致命一击：幸运+15');
  }
}

/**
 * 应用回合开始时的天赋效果（玩家回合）
 */
function applyPlayerTurnStartTalents(player) {
  // 天赋：灵韵流转 - 每回合额外获得1点灵力
  if (hasTalent('mana_regen')) {
    player.mp = Math.min(player.maxMp, player.mp + 1);
    console.log('[天赋] 灵韵流转：获得1点灵力');
  }

  // 天赋：生命回复 - 恢复4%最大生命值
  if (hasTalent('life_steal')) {
    const healAmount = Math.floor(player.maxHp * 0.04);
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    console.log(`[天赋] 生命回复：恢复${healAmount}点生命`);
  }
}

/**
 * 获取暴击伤害倍率（天赋加成）
 */
export function getCritDamageMultiplier() {
  let multiplier = 1; // 基础倍率为1，在原有基础上增加

  // 天赋：致命一击 - 暴击伤害提升40%
  if (hasTalent('critical_strike')) {
    multiplier += 0.4;
    console.log('[天赋] 致命一击：暴击伤害+40%');
  }

  return multiplier;
}

export function createBattle(player, allies, enemies, useCard, onPlayerTurnStart, playerHand) {
  const state = reactive({
    round: 1,
    currentActor: null,
    acting: false,
    phase: 'waiting',
    battleEnd: false
  })

  // 星铁固定参数
  const ACTION_MAX = 10000
  const TICK_SPEED = 15 // 进度条动画速度
  const GROW_SCALE = 1
  player.actionProgress = 0
  player.buffs = player.buffs ?? []
  player.debuffs = player.debuffs ?? []
  player.speed = player.baseSpeed

  //队友初始化
  allies.forEach(u => {
    u.actionProgress = 0
    u.buffs = u.buffs ?? []
    u.debuffs = u.debuffs ?? []
    u.speed = u.baseSpeed
  })

  //敌人不变
  enemies.forEach(e => {
    e.actionProgress = 0
    e.buffs = e.buffs ?? []
    e.debuffs = e.debuffs ?? []
    e.speed = e.baseSpeed
  })

  // 🔥 应用战斗开始时的天赋效果
  applyBattleStartTalents(player);

  let globalAT = 0
  const FIRST_CYCLE_AT = 150
  const NORMAL_CYCLE_AT = 100
  let isFirstRound = true

  let timer = null

  // ====================
  // 主循环
  // ====================
  function startLoop() {
    if (timer) return
    timer = setInterval(() => {
      if (battleDestroyed) return
      if (loopPaused || state.acting || state.battleEnd) return
      player.actionProgress += player.speed * GROW_SCALE
      //队友涨进度
      allies.filter(x => x.hp > 0).forEach(u => u.actionProgress += u.speed * GROW_SCALE)
      enemies.forEach(e => {
        if (e.hp > 0) e.actionProgress += e.speed * GROW_SCALE
      })
      globalAT += 1
      checkWhoAct()
      checkGlobalRound()
    }, TICK_SPEED)
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

    //区分：主角手动、队友AI自动、敌人AI
    if (first === player) {
      triggerPlayer()
    } else if (allies.includes(first)) {
      triggerAlly(first)
    } else {
      triggerEnemy(first)
    }
  }

  // ====================
  // 1. 行动开始结算（流血、扣回合、刷新速度）
  // ====================
  function onTurnStart(target) {
    // 🔥 玩家回合开始时的天赋效果
    if (target === player) {
      applyPlayerTurnStartTalents(player);
    }

    //有益buff区域
    target.buffs = target.buffs.filter(b => {
      // 只减1次！！！
      if (b.isPermanent) return true
      b.remaining--

      if (b.remaining <= 0) {
        if (b.type === "allStats") {
          target.attack -= b.atkUp
          target.armor -= b.armorUp
          target.luck -= b.luckUp
          target.speed -= b.speedUp
        }
        if (b.type === "reflect") {
          target.armor -= b.addArmor;
          // 移除反弹 buff 动画
          removeReflectBuff(target);
        }
        if (b.type === "speed_buff") {
          //乘胜追击加速效果
          target.speed -= b.speedUp
        }
        return false
      }
      return true
    })
    //负面buff区域
    target.debuffs = target.debuffs.filter(d => {
      const name = d.name

      // ✅ 统一判断：只要在毒系数组里，就触发伤害
      if (POISON_BUFFS.includes(name)) {
        tickMiasma(target, player, playerHand, name, d);
      }

      if (d.isPermanent) return true
      d.remaining--
      // 瘴毒消失 → 恢复护甲
      if (d.remaining <= 0) {
        if (name === '瘴毒') {
          target.armor += d.reduceArmor
          target.poisonTaken -= d.poisonTaken
        }
      }
      return d.remaining > 0
    })

  }
  // ====================
  // 2. 行动结束结算（中毒、持续治疗）
  // ====================
  function onTurnEnd(target) {
    // 玩家回合结束，调用回调
    if (target === player) {
      onPlayerTurnStart?.(); // 调用外部Vue页面的冷却回调
    }
    target.buffs.forEach(b => {
      if (b.type === 'heal' && b.remaining > 0) {
        const val = b.value
        target.hp = Math.min(target.maxHp, target.hp + val)
        console.log(`💚 ${target.name} 持续治疗：${val}`)
      }
    })
  }

  //友军AI自动行动：打站位最前存活敌人
  function triggerAlly(allyUnit) {
    state.acting = true
    state.currentActor = 'player'
    state.phase = 'resolving'

    const aliveEne = enemies.filter(e => e.hp > 0).sort((a, b) => a.position - b.position)
    const target = aliveEne[0]

    // ==============================
    // 🚁 【无人机逻辑】开始
    // ==============================
    if (allyUnit.isDrone) {
      if (allyUnit._isDead || allyUnit._inAction || !target) return
      allyUnit._inAction = true

      // 🔥 性能优化：从缓存取配置
      const cfg = getCardData('无人机');
      const rawDmg = cfg.fixedDmg + Math.floor(allyUnit.owner.attack * cfg.atkRatio)

      allyUnit.remainingAttacks -= 1

      const spine = getSummonInstance('drone', allyUnit.summonId);
      if (spine) {
        // spine.state.addAnimation(0, 'animation', true, 0);

        setTimeout(() => {
          const firePos = getFirePointPosition(spine);
          // ✅ 2. 先播特效，不管敌人死没死（或者判断原始血量）
          if (target && target.hp > 0) {
            playSpineProjectile(
              // 🔥 性能优化：从缓存取app
              _pixiAppCache,
              firePos,
              { x: target.x, y: target.y },
              "idle",
              0.25,
              0.15,
              () => {
                // ✅ 3. 子弹命中后才真正扣血
                const npcIndex = user.pixi.npcInstance.findIndex(
                  item => item.data.data.name === target.name
                );
                if (npcIndex >= 0) {
                  // 只需要调用这一行，自动完成【伤害计算+触发受击效果+扣血+飘字】全流程
                  const { dmg: finalDmg, crit } = calculateFinalDamage(rawDmg, target, 0, 'null', player);
                  // 只需要打印日志即可
                  console.log(`🚁 ${allyUnit.name} 攻击 ${target.name}，伤害 ${finalDmg} ${crit ? '🔥暴击' : ''}`);
                }
                BattleSystem.checkBattleEnd()
              }
            );
          }
        }, 80);
      }
      setTimeout(() => {
        if (frozen) return   // ⭐ 关键
        allyUnit.actionProgress -= ACTION_MAX
        onTurnEnd(allyUnit)

        if (allyUnit.remainingAttacks <= 0) {
          allyUnit._isDead = true
          const idx = allies.findIndex(a => a === allyUnit)
          if (idx !== -1) allies.splice(idx, 1)
          // ✅ 新增：攻击次数耗尽，销毁Spine
          removeSummon('drone', allyUnit.summonId, allyUnit.owner);
          console.log('❌ 无人机攻击次数耗尽，离场')
        }
        allyUnit._inAction = false
        endAction()
      }, 350)
      return
    }
    else if (allyUnit.isShadowClone) {
      const shadowClone = allyUnit;
      const baseDmg = calculateSkillDamage("射击", shadowClone, {
        activeEvos: [],
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

      // ✅ 影分身也支持"弹夹升级"进化（如果有）
      const evos = shadowClone.owner?.data?.activeEvos || [];
      if (evos.includes('弹夹升级')) {
        hitCount += 2;
      }

      const startPos = {
        x: shadowClone.spineInstance.x + 5 * (window.innerWidth / 100),
        y: shadowClone.spineInstance.y * 0.75
      };
      const endPos = { x: target.x - 3 * (window.innerWidth / 100), y: target.y * 0.85 };

      console.log(`👥 影分身射击，发射 ${hitCount} 发子弹`);

      // ✅ 循环发射多发子弹
      for (let i = 0; i < hitCount; i++) {
        setTimeout(() => {
          const hasAlive = enemies.some(e => e.hp > 0);
          if (!hasAlive) return;

          playSpineProjectile(
            // 🔥 性能优化：从缓存取app
            _pixiAppCache,
            startPos,
            endPos,
            "idle",
            flyDuration,
            0.15,  // 影分身子弹小一点
            () => {
              const aliveEnemies = enemies.filter(e => e.hp > 0);
              if (aliveEnemies.length === 0) return;

              const currentTarget = aliveEnemies.find(e => e.name === target.name) || aliveEnemies[0];
              if (currentTarget.hp <= 0) return;

              calculateFinalDamage(
                baseDmg,
                currentTarget,
                0,
                'physical',
                shadowClone,
                {}
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
        shadowClone.actionProgress -= ACTION_MAX;
        onTurnEnd(shadowClone);
        endAction();
      }, totalDuration);

      return;
    }

    // ===== 普通友军普攻：统一伤害计算 =====
    const baseDmg = Math.floor(Math.random() * 80) + 40

    // ✅ 统一伤害计算：物理伤害，不破甲
    const dmg = calculateFinalDamage(baseDmg, target, 0, 'physical')

    console.log(`💛${allyUnit.name}普攻${target.name},伤害${dmg}`)

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
    //玩家回合开始 → 回蓝
    if (player.mp < player.maxMp) {
      player.mp = Math.min(player.mp + 2, player.maxMp)
    }
    // 🔥 发出玩家回合开始事件
    emitter.emit('playerTurnStart')
  }

  function playerUseCard(card) {
    if (state.currentActor !== 'player') return
    state.phase = 'resolving'
    const animDelay = useCard(card)
    // 移除：player.actionProgress -= ACTION_MAX、onTurnEnd、endAction
    setTimeout(() => {
      state.phase = 'action' // 用完切回可继续出牌
    }, animDelay)
  }
  function endPlayerTurn() {
    player.actionProgress -= ACTION_MAX
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

    enemyAttack(enemyUnit, () => {
      enemyUnit.actionProgress -= ACTION_MAX
      onTurnEnd(enemyUnit)
      endAction()
    })
  }

  function enemyAttack(enemyUnit, done) {
    const baseDmg = Math.floor(Math.random() * 100) + 50

    // 🔥 播放爪击特效（在玩家位置，x轴翻转）
    const appContainer = _pixiAppCache || user.pixi.app;
    if (appContainer && player.x !== undefined) {
      playSpineEffect({
        effectName: 'zhuaji',
        container: appContainer,
        x: player.x+4*VW,
        y: player.y,
        scale: 0.4,
        flipX: true,  // x轴翻转，让爪击朝向玩家
        animationName: 'animation',
        loop: false
      });
    }
    console.log("你好")
    // 🔥 使用统一伤害计算函数
    // 先备份玩家血量，因为 calculateFinalDamage 会自动扣血
    const backupPlayerHp = player.hp;

    // 计算最终伤害（敌人攻击玩家，物理伤害，不暴击）
    const { dmg: finalDmg } = calculateFinalDamage(
      baseDmg,
      player,
      0,
      'physical',
      enemyUnit,  // 攻击者是敌人
      null        // 没有buff，不暴击
    );

    // 恢复玩家血量（因为 calculateFinalDamage 已经扣过了，我们需要手动处理影分身）
    player.hp = backupPlayerHp;

    // 🔥 触发玩家受伤效果（闪白滤镜 + 飘伤害数字）
    const playerInstance = _playerInstanceCache || user.pixi.playerInstance;
    if (playerInstance?.takeDamage) {
      // 调用 takeDamage 触发受伤特效和飘字
      playerInstance.takeDamage(finalDmg, { type: 'physical', isCritical: false }, enemyUnit.attack);
      // 恢复玩家实例的血量（战斗系统的血量由 battle.js 统一管理）
      playerInstance.data.data.hp = backupPlayerHp;
    }

    // 影分身承伤逻辑
    const clone = allies.find(a => a.isShadowClone && a.hp > 0)
    if (clone) {
      const shareDmg = Math.floor(finalDmg * clone.takeDmgRatio)
      const selfDmg = finalDmg - shareDmg

      clone.hp = Math.max(0, clone.hp - shareDmg)
      player.hp = Math.max(0, player.hp - selfDmg)
      console.log(`👥 分身替主角承伤 ${shareDmg}，主角承受 ${selfDmg}`)

      // 分身死亡直接退场
      if (clone.hp <= 0) {
        const idx = allies.indexOf(clone)
        if (idx > -1) allies.splice(idx, 1)
        console.log("💨 影分身被击破，退场")
      }
    } else {
      // 无分身全额吃伤
      player.hp = Math.max(0, player.hp - finalDmg)
      console.log(`⚔️ ${enemyUnit.name} 攻击玩家，造成 ${finalDmg} 伤害`)
    }
    const reflectBuff = player.buffs.find(b => b.type === "reflect");
    if (reflectBuff && reflectBuff.remaining > 0) {
      const rBase = reflectBuff.reflectBase;
      const rArmor = reflectBuff.reflectArmor;
      // 1.计算反弹原始面板伤害
      const rawReflectDmg = Math.floor(finalDmg * rBase + player.armor * rArmor);
      // 2.复用通用LOL护甲公式计算最终反弹伤害，和射击、普攻规则完全一致
      const realDmg = calculateFinalDamage(rawReflectDmg, enemyUnit, 0, 'physical', player);
      console.log(`🛡️ 反弹伤害(正常吃敌方护甲)：${realDmg}`);
    }
    const selfPoisonMist = enemyUnit.debuffs.find(d => d.name === "毒雾");
    if (selfPoisonMist?.hasEvoSpread) {
      tickMiasma(enemyUnit, player, playerHand, '扩散', selfPoisonMist);
    }
    setTimeout(done, 400)
  }

  // ====================
  // 行动结束
  // ====================
  function endAction() {
    state.acting = false
    state.currentActor = null
    state.phase = 'waiting'
    checkBattleEnd(playerHand) // ✅ 传入卡牌组
  }
  // 英雄联盟护甲减伤公式（核心）
  function calcDamage(attacker, target, baseDamage) {
    const armor = getFinalArmor(target) // ✅ 自动吃所有减甲
    const reduction = armor / (armor + 100)
    return Math.max(1, Math.floor(baseDamage * (1 - reduction)))
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
    console.log("✅ 敌人死亡：", deadEnemy.name)

    // 瘴气 - 死亡返还
    const miasma = playerHand.find(c => c.name === '瘴气')
    if (miasma && miasma.activeEvos.includes('死亡返还')) {
      miasma.cooldown = Math.max(0, miasma.cooldown - 1)
    }

    // 洞察 - 乘胜追击
    const insightCard = playerHand.find(c => c.name === '洞察')
    if (insightCard && insightCard.activeEvos.includes('乘胜追击')) {
      if (deadEnemy.debuffs.some(d => d.name === '弱点')) {
        const exist = player.buffs.find(b => b.type === 'speed_buff')
        if (exist) {
          exist.remaining = 2
        } else {
          const speedUp = player.baseSpeed * 0.2
          player.buffs.push({
            name: "乘胜追击",
            type: 'speed_buff',
            speedUp,
            remaining: 2
          })
          player.speed += speedUp
        }
        // 🔥 性能优化：从缓存取playerInstance
        _playerInstanceCache?.showBuffText('乘胜追击');
        // console.log("⚡ 乘胜追击触发！速度+20%")
      }
    }
  }

  // ====================
  // 战斗结束检测（修复版）
  // ====================
  function checkBattleEnd() {
    // 【关键】不使用 _deadMarked 过滤，避免锁死
    const deadEnemies = enemies.filter(e => e.hp <= 0)

    // 逐个处理死亡敌人
    deadEnemies.forEach(e => {
      // 只处理没结算过的
      if (!e._checked) {
        onEnemyDied(e, playerHand)
        e._checked = true
      }
    })

    // 结束判断
    const isVictory = enemies.every(e => e.hp <= 0)
    const isDefeat = player.hp <= 0

    if (isVictory || isDefeat) {
      if (!zhandou) {
        zhandou = true
        state.battleEnd = true
        clearInterval(timer)

        // 清理毒雾领域动画
        removePoisonMist();

        // 🔥 计算战斗奖励
        const rewards = calculateBattleRewards(isVictory, enemies)

        // 🔥 发送战斗结束事件，由Vue组件处理弹窗和奖励发放
        emitter.emit("battleEnd", {
          isVictory,
          expGained: rewards.exp,
          itemRewards: rewards.items,
          rounds: state.round
        })

        console.log(`🏆 战斗结束！${isVictory ? '胜利' : '失败'}`)
        console.log(`🎁 获得经验：${rewards.exp}，获得物品：`, rewards.items)

        setTimeout(() => {
          zhandou = false
        }, 500);
      }
    }
  }

  // ====================
  // 计算战斗奖励
  // ====================
  function calculateBattleRewards(isVictory, enemies) {
    if (!isVictory) {
      return { exp: 0, items: [] }
    }

    // 根据敌人数量和强度计算经验
    let totalExp = 0
    enemies.forEach(enemy => {
      // 基础经验：根据敌人最大生命计算（可调整）
      totalExp += 20
    })

    // 最少给50经验
    totalExp = Math.max(50, totalExp)

    // 物品奖励：灵力晶核（根据敌人数量）
    const crystalCount = Math.max(1, Math.floor(enemies.length * 1))
    const items = [{
      name: "灵力晶核",
      num: crystalCount,
      img: "jinghe",
      miaoshu: "蕴含强大灵力的晶核，可用于抽取卡牌。",
      sell: 10,
      status: "material",
      color: "#8B5CF6"
    }]

    return {
      exp: totalExp,
      items
    }
  }
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

  // 平滑击退：一点点减（你要的效果！）
  function pushback(target, percent) {
    const totalSub = ACTION_MAX * (percent / 100);
    const step = totalSub / 10; // 分10步减完
    let count = 0;

    const timer = setInterval(() => {
      target.actionProgress = Math.max(target.actionProgress - step, 0);
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
  }
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
    destroyBattle
  }
}