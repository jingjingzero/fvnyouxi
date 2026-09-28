
import { useCounterStore } from "@/store/counter";
// ⛔ 讨伐战已移除：不再需要 getMapMeta（Boss 战/场景深入度系统已删除）
import { ENEMY_DROP_RATES, SHADOW_DROP_BLESSING_MULT } from "../dungeon/dropRates";
import { ITEM_SKIN_MAP } from "../dungeon/config";
let VH = window.innerHeight / 100;
let VW = window.innerWidth / 100;

const user = useCounterStore();

// 🎖️ 奖励等级成长率：敌人每比 1 级高 1 级，经验/掉落 +10%（1 级 = 1.0 倍，10 级 = 1.9 倍）
export const ENEMY_REWARD_LEVEL_GROWTH = 0.10;
// 按敌人等级计算奖励倍率（地牢/自定义战斗通用）
function rewardLvMultOf(enemy) {
  const ed = enemy?.data ?? enemy;
  const lv = Number(ed?.level ?? enemy?.level ?? 1) || 1;
  return 1 + (lv - 1) * ENEMY_REWARD_LEVEL_GROWTH;
}

// 💰 击败敌人金币奖励分档（参考杀戮尖塔2）：普通 15 / 精英 40 / Boss 100
export const ENEMY_GOLD_BY_TYPE = { normal: 15, elite: 40, boss: 100 };
// 敌人类型：Boss > 精英 > 普通（Boss 标记优先）
function enemyTypeOf(enemy) {
  const ed = enemy?.data ?? enemy;
  if (ed?.isBoss ?? enemy?.isBoss) return 'boss';
  if (ed?.isElite ?? enemy?.isElite) return 'elite';
  return 'normal';
}
// 金币 = 类型基础值 × 等级倍率（至少 1）
function enemyGoldOf(enemy) {
  const base = ENEMY_GOLD_BY_TYPE[enemyTypeOf(enemy)] ?? ENEMY_GOLD_BY_TYPE.normal;
  return Math.max(1, Math.round(base * rewardLvMultOf(enemy)));
}
/**
 * 根据深入深度计算敌人属性倍率
 * @param {number} depth - 深入程度百分比（5~无限）
 * @returns {object} 属性倍率
 */
function getDepthMultiplier(depth) {
    // 每5%深度提升1级
    const level = Math.floor(depth / 5);
    return {
        hp: 1 + (level - 1) * 0.10,      // 每5% +10%生命
        attack: 1 + (level - 1) * 0.06,  // 每5% +6%攻击
        armor: 1 + (level - 1) * 0.03,   // 每5% +3%护甲
        speed: 1 + (level - 1) * 0.01    // 每5% +1%速度
    };
}

/**
 * 每深入5%，经验倍率匀速提升
 * 5% = ×1.1
 * 10% = ×1.2
 * 每5% +0.1 线性增长，无分段区间
 * @param {number} depth - 深入程度百分比
 * @returns {number} 经验倍率
 */
// ⛔ 讨伐战已移除：getDepthExpMultiplier（按深入度提升经验倍率）已删除

/**
 * 每深入5%，掉落概率匀速提升
 * 5% = ×1.05
 * 10% = ×1.10
 * 每5% +0.05倍掉落，线性递增
 * @param {number} depth - 深入程度百分比
 * @returns {number} 概率倍率
 */
// ⛔ 讨伐战已移除：getDepthDropBonus（按深入度提升掉落概率）已删除

/**
 * 根据深度获取敌人数量
 * 越深怪物越多，线性增加
 */
// ⛔ 讨伐战已移除：getEnemyCount（按深入度增加敌人数量）已删除

/**
 * 怪物类型配置
 */
const monsterConfigs = {
    // 普通怪
    monster1: {
        codexScale: 0.85,
        codexAnimSpeed: 1,
        name: '暗影',
        level: 1,
        hp: 100,
        attack: 8,
        armor: 5,
        magicResist: 10,
        speed: 90,
        luck: 0,
        baseExp: 25,
        damageTaken: 0,//易伤
        allDamageBonus: 0,//增伤
        physDamageTaken: 0,//物理易伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackBase: 0,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.4,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        // � 本体动作动画名（骨骼里实际存在的动画名）
        //   attackAnim：普攻动作
        //   skillAnim：技能默认动作（缺省回退 attack）
        //   ⚠️ 多技能扩展：有多个技能时，可在每个技能配置里单独写 skillAnim / sound，
        //      优先用技能自己的，没写才回退到这里的 skillAnim / skillSound
        attackAnim: 'attack',   // 普攻时本体播放的动作
        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）
        // �🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
        attackSound: 'enemy_monster1_attack',  // 普攻音效
        skillSound: 'enemy_monster1_skill',    // 技能默认音效（技能可在配置里单独写 sound 覆盖）
        // spine渲染配置
        spineScale: 0.8,
        spineAlpha: 0.8,
        // 🎯 技能配置（暗影的技能：150%攻击力伤害 + 降低玩家15%行动条）
        skills: [
            {
                name: '暗影突袭',
                desc: '对目标造成150%攻击力伤害，并降低玩家15%行动条',
                type: 'singleDamage_actionBarReduce',
                damageRatio: 1.5,
                actionBarReduce: 0.15,
                cooldown: 2,
                initialCooldown: 2,
                // 🎬 技能专属动作（缺省用怪物级 skillAnim；多技能可各配不同动画）
                skillAnim: 'jineng',
                // 🎵 技能专属音效（缺省用怪物级 skillSound）
                sound: 'enemy_monster1_skill',
            }
        ],
        // 🌑 暗影拖拽：死亡后降低玩家 20% 行动条（死亡被动，不参与回合技能选择）
        passives: [
            {
                name: '暗影拖拽',
                desc: '死亡后降低玩家20%行动条',
                type: 'deathActionBarReduce',
                actionBarReduce: 0.2,
            }
        ],

    },
    // 🧪 空心布偶（较强小怪，暂用暗影 monster1 的 spine，后续替换）
    //   普攻：3 回合中毒，每回合 50% 攻击力毒伤（毒可叠加：层1=50%，每+1层 +25%，层2=75%、层3=100%…）
    //   技能「毒爆」：先施加 1 层毒再引爆，造成「当前层数×50% 攻击力」毒属性伤害，冷却 3 回合（玩家≥2层毒才用）
    //   被动：死亡后为玩家施加 2 层中毒
    duwuguai: {
        codexScale: 0.85,
        codexAnimSpeed: 1,
        name: '空心布偶',
        flipX: false, // buou 骨骼美术朝左，战斗不再翻转，保持面向玩家
        enterAnim: 'ruchang', // 🎪 出场先播入场动画 ruchang，再切待机
        level: 3,
        hp: 160,
        attack: 12,
        armor: 8,
        magicResist: 15,
        speed: 95,
        luck: 5,
        baseExp: 40,
        damageTaken: 0,//易伤
        allDamageBonus: 0,//增伤
        physDamageTaken: 0,//物理易伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackBase: 0,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.4,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        attackAnim: 'attack',   // 普攻动作（暗影 monster1 同款）
        skillAnim: 'attack',    // 技能默认动作
        attackSound: 'enemy_monster1_attack',
        skillSound: 'enemy_monster1_skill',
        spineScale: 1,

        // 🧪 普攻附加毒：命中后给玩家施加 attackPoison.stacks 层、持续 turns 回合的中毒，
        //    每回合造成 ratio（默认0.5=50%）攻击力毒属性伤害（无直接物理伤害）
        attackPoison: { stacks: 1, turns: 3, ratio: 0.5 },
        // 🎃 死亡被动：玩家速度-4%（本次地牢内永久，可叠加，离开地牢清除）
        deathSpeedDown: 0.04,
        // 🌀 被动展示（图鉴/战斗内敌人面板；战斗逻辑走上面的 deathSpeedDown）
        passives: [
            {
                name: '减速诅咒',
                desc: '死亡时使玩家速度降低 4%，本次地牢内持续生效可叠加，直到离开地牢。',
                type: 'deathSpeedDown',
                speedDownPct: 0.04,
            },
        ],
        // 🎯 技能配置
        skills: [
            {
                name: '诅咒',
                desc: '施加1层中毒并引爆玩家体内毒素，造成当前层数×35%攻击力毒属性伤害，不消耗毒素层数',
                type: 'poisonDetonate',
                ratio: 0.35,
                minStacks: 2,
                turns: 3,
                cooldown: 3,
                skillAnim: 'jineng', // 空心布偶 buou 已新增 jineng 动画
                sound: 'enemy_monster1_skill',
            }
        ],
    },
    // 🎭 诅咒布偶：普攻100%物伤；技能塞入3张诅咒卡（冷却3）；被动死亡后封禁玩家随机一张牌（本次地牢内）
    buou1: {
        codexScale: 1,
        codexAnimSpeed: 1,
        flipX: false,
        name: '诅咒布偶',
        enterAnim: 'ruchang', // 🎪 出场先播入场动画 ruchang，再切待机
        level: 4,
        hp: 175,
        attack: 13,
        armor: 10,
        magicResist: 10,
        speed: 88,
        luck: 5,
        baseExp: 45,
        damageTaken: 0,
        allDamageBonus: 0,
        physDamageTaken: 0,
        executeDamageBonus: 1,
        takenDamageReduce: 1,
        attackMultiplier: 1,
        attackBase: 0,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.4,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        attackAnim: 'attack',
        skillAnim: 'attack',
        attackSound: 'enemy_monster1_attack',
        skillSound: 'enemy_monster1_skill',
        spineScale: 1,
        passives: [
            {
                name: '咒缚',
                desc: '死亡后在本次地牢期间永久封禁玩家随机一张牌（抽到后无法打出）。',
                type: 'deathBanCard',
            },
        ],
        skills: [
            {
                name: '怨咒',
                desc: '往玩家牌库塞入2张诅咒卡，离开地牢后清除。',
                type: 'insertCurseCards',
                count: 2,
                cooldown: 3,
                skillAnim: 'jineng',
                sound: 'enemy_monster1_skill',
            }
        ],
    },
    // 🟢 兽型史莱姆1（小怪）：普攻100%攻击力物理伤害；技能缠绕150%物伤+降玩家20%速度3回合（不可叠加可刷新，冷却3）；被动再生（受伤及回合开始恢复12%已损失生命值）
    shilaimu1: {
        codexScale: 0.85,
        codexAnimSpeed: 1,
        flipX: false,
        name: '兽型史莱姆1',
        level: 3,
        hp: 150,
        attack: 12,
        armor: 6,
        magicResist: 0,
        speed: 90,
        luck: 5,
        baseExp: 35,
        damageTaken: 0,//易伤
        allDamageBonus: 0,//增伤
        physDamageTaken: 0,//物理易伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackBase: 0,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.6,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        attackAnim: 'attack',   // 普攻动作
        skillAnim: 'jineng',    // 技能默认动作（缺省回退 attack）
        attackSound: 'enemy_monster1_attack',
        skillSound: 'enemy_monster1_skill',
        spineScale: 0.9,
        spineAlpha: 1,
        // 🪢 技能：缠绕：150%物伤 + 降低玩家20%速度，持续3回合（不可叠加，可刷新），冷却3回合
        skills: [
            {
                name: '缠绕',
                desc: '对玩家造成150%攻击力物理伤害，并降低玩家20%速度，持续3回合（不可叠加，可刷新）',
                type: 'singleDamage_slow',
                damageRatio: 1.5,
                slowPct: 0.2,
                duration: 3,
                cooldown: 3,
                initialCooldown: 1,
                skillAnim: 'jineng',
                sound: 'enemy_monster1_skill',
            }
        ],
        // 🌿 被动：再生：受到伤害后以及回合开始时，恢复12%已损失生命值
        passives: [
            {
                name: '再生',
                desc: '受到伤害后以及回合开始时，恢复12%已损失生命值',
                type: 'regen',
                pct: 0.12,
            }
        ],
    },
    // 🐱 猫咪史莱姆（小怪）：普攻(70%攻击+目标5%最大生命值)物伤；技能粘液喷射6段(20%攻击+2%目标最大生命值)每段33%打空、命中减速6%可叠加刷新2回合、冷却3；被动首次致命保留1点生命
    shilaimumm: {
        codexScale: 0.6,
        codexAnimSpeed: 1,
           flipX: false,
        name: '猫咪史莱姆',
        level: 5,
        hp: 170,
        attack: 14,
        armor: 10,
        magicResist: 5,
        speed: 100,
        luck: 8,
        baseExp: 45,
        damageTaken: 0,//易伤
        allDamageBonus: 0,//增伤
        physDamageTaken: 0,//物理易伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 0.7,
        attackMaxHpPct: 0.05,
        attackBase: 0,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.6,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        attackAnim: 'attack',   // 普攻动作
        skillAnim: 'jineng',    // 技能默认动作（缺省回退 attack）
        attackSound: 'enemy_monster1_attack',
        skillSound: 'enemy_monster1_skill',
        spineScale: 0.5,
        spineAlpha: 1,
        // 💦 技能：粘液喷射：6段伤害，每段(20%攻击+2%目标最大生命值)物伤，每段33%概率打空，命中减速6%（可叠加并刷新）持续2回合，冷却3回合
        skills: [
            {
                name: '粘液喷射',
                desc: '对玩家造成6段伤害，每段(20%攻击力+2%目标最大生命值)物理伤害，每段33%概率打空，命中时减速6%（可叠加并刷新）持续2回合',
                type: 'multiHit_slow',
                hitCount: 6,
                damageRatio: 0.2,
                maxHpPct: 0.02,
                missChance: 0.33,
                slowPct: 0.06,
                duration: 2,
                cooldown: 3,
                initialCooldown: 1,
                skillAnim: 'jineng',
                sound: 'enemy_monster1_skill',
            }
        ],
        // 💪 被动：粘液之躯：首次受到致命伤害后保留1点生命值
        passives: [
            {
                name: '粘液之躯',
                desc: '首次受到致命伤害后保留1点生命值',
                type: 'deathResist',
            }
        ],
    },
    // ⚔️ 利刃史莱姆（小怪）：普攻100%攻击力物伤；技能回旋斩击3段40%物伤+每段1层流血（冷却3）；被动利刃：造成伤害无视玩家护甲
    zhanjishilaimu: {
        codexScale: 0.85,
        codexAnimSpeed: 1,
             flipX: false,
        name: '利刃史莱姆',
        level: 5,
        hp: 175,
        attack: 15,
        armor: 12,
        magicResist: 5,
        speed: 105,
        luck: 8,
        baseExp: 48,
        damageTaken: 0,//易伤
        allDamageBonus: 0,//增伤
        physDamageTaken: 0,//物理易伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackBase: 0,
        // ⚔️ 被动：利刃：造成伤害无视玩家护甲（enemyAttack 里按 ignoreArmor 跳过护甲减免）
        ignoreArmor: true,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.6,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        attackAnim: 'attack',   // 普攻动画
        skillAnim: 'jineng',    // 技能动画
        attackSound: 'enemy_monster1_attack',
        skillSound: 'enemy_monster1_skill',
        spineScale: 1,
        spineAlpha: 1,
        // 🌀 技能：回旋斩击：3段斩击，每段40%攻击力物理伤害并使玩家获得1层流血状态，冷却3回合
        skills: [
            {
                name: '回旋斩击',
                desc: '对玩家造成3段斩击，每段40%攻击力物理伤害并使玩家获得1层流血状态',
                type: 'multiHit_bleed',
                hitCount: 3,
                damageRatio: 0.4,
                bleedStacks: 1,
                cooldown: 3,
                initialCooldown: 1,
                skillAnim: 'jineng',
                sound: 'enemy_monster1_skill',
            }
        ],
        // ⚔️ 被动展示
        passives: [
            {
                name: '利刃',
                desc: '造成伤害无视玩家护甲',
                type: 'ignoreArmor',
            }
        ],
    },
    // ❄️ 凋零魔兽（小怪）：普攻100%攻击力冰伤；技能150%冰伤+冻结玩家2张手牌；被动25%生命护盾+破盾行动条+50%
    qilin: {
        codexScale: 1.1,
        codexAnimSpeed: 1,
        name: '凋零魔兽',
        level: 1,
        hp: 120,
        attack: 10,
        armor: 5,
        flipX: false,
        magicResist: 10,
        speed: 85,
        luck: 0,
        baseExp: 30,
        damageTaken: 0,//易伤
        allDamageBonus: 0,//增伤
        physDamageTaken: 0,//物理易伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackBase: 0,
        // ❄️ 普攻/技能均为冰属性伤害（吃魔抗，飘字/元素反应按 ice）
        //    🚫 不触发元素反应的角色冻结（冻结/霜冻强化）：凋零魔兽的冻结机制是冻手牌，不冻玩家角色
        noFreezeReact: true,
        attackDmgType: "ice",
        attackEffect: 'zhuaji',
        attackEffectScale: 0.4,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        attackAnim: 'attack',   // 普攻动作
        skillAnim: 'attack',    // 技能默认动作
        attackSound: 'enemy_monster1_attack',
        skillSound: 'enemy_monster1_skill',
        spineScale: 1,
        spineAlpha: 1,
        // 🎯 技能：150% 冰伤 + 随机冻结玩家 2 张手牌（下回合无法使用）
        skills: [
            {
                name: '凋零冰刺',
                desc: '对玩家造成150%攻击力冰属性伤害，并随机冻结4张手牌（下回合无法使用）',
                type: 'singleDamage_freezeCards',
                damageRatio: 1.5,
                freezeCount: 4,
                cooldown: 3,
                initialCooldown: 1,
                skillAnim: 'jineng',
                sound: 'enemy_monster1_skill',
            }
        ],
        // 🌀 被动：凋零之盾 - 进入战斗获得 25% 最大生命值护盾；护盾被击破时自身行动条提升 50%
        passives: [
            {
                name: '凋零之盾',
                desc: '进入战斗获得25%最大生命值护盾；护盾被击破时自身行动条提升50%',
                type: 'witherShield',
                shieldPct: 0.25,
                actionBarBoost: 0.5,
            }
        ],
    },
    // 精英怪
    guaiwu2: {
        codexScale: 0.95,
        codexAnimSpeed: 1,
        isElite: true, // 💰 金币奖励分档：精英
        name: '魔化猫',
        level: 5,
        hp: 150,
        attack: 16,
        armor: 70,
        magicResist: 40,
        speed: 110,
        luck: 15,
        baseExp: 50,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackEffect: 'zhuaji2',
        attackEffectScale: 1,
        attackEffectOffsetX: 0,
        attackEffectOffsetY: 5,
        // � 本体动作动画名（骨骼里实际存在的动画名）
        //   attackAnim：普攻动作
        //   skillAnim：技能默认动作（缺省回退 attack）
        //   ⚠️ 多技能扩展：有多个技能时，可在每个技能配置里单独写 skillAnim / sound，
        //      优先用技能自己的，没写才回退到这里的 skillAnim / skillSound
        attackAnim: 'attack',   // 普攻时本体播放的动作
        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）
        // �🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
        attackSound: 'enemy_guaiwu2_attack',  // 普攻音效
        skillSound: 'enemy_guaiwu2_skill',    // 技能默认音效（技能可在配置里单独写 sound 覆盖）
        // spine渲染配置
        spineScale: 0.9,
        spineAlpha: 1,
        // 🎯 技能配置（魔化猫：狂怒，提升30%移速+40%攻击力2回合，自身循环播放特效直到状态结束）
        skills: [
            {
                name: '狂怒',
                desc: '恢复20%已损失生命值，提升50%攻击力，持续2回合',
                type: 'buffSelf',
                buffType: 'rage',       // 狂怒 buff
                attackBoost: 0.5,
                duration: 2,
                cooldown: 4,

                initialCooldown: 1,
                // 🎬 技能专属动作（缺省用怪物级 skillAnim；多技能可各配不同动画）
                skillAnim: 'jineng',
                // 🎵 技能专属音效（缺省用怪物级 skillSound）
                sound: 'enemy_guaiwu2_skill',
            }
        ],
        // 🎯 被动配置（魔化猫：受到伤害提升8%行动条以及2%攻击力）
        passives: [
            {
                name: '愤怒',
                desc: '受到伤害时提升6%行动条以及3%攻击力',
                type: 'rageOnHit',
                actionBarBoost: 0.06,
                attackBoost: 0.03,
                maxStack: 20,
            }
        ],

    },
    // 雷鸟（battle_03 专属怪，暂用 guaiwu3 骨骼）
    guaiwu3: {
        codexScale: 0.85,
        codexAnimSpeed: 1,
        name: '雷鸟',
        level: 10,
        hp: 220,
        attack: 22,
        armor: 50,
        magicResist: 55,
        speed: 125,
        luck: 10,
        baseExp: 75,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 0.45,
        attackHits: 3,
        hitIntervalMs: 150,        // 每段间隔
        attackDmgType: "lightning",
        attackEffect: 'zhuaji2',
        attackEffectScale: 1,
        attackEffectOffsetX: 0,
        attackEffectOffsetY: 5,
        // � 本体动作动画名（骨骼里实际存在的动画名）
        //   attackAnim：普攻动作
        //   skillAnim：技能默认动作（缺省回退 attack）
        //   ⚠️ 多技能扩展：有多个技能时，可在每个技能配置里单独写 skillAnim / sound，
        //      优先用技能自己的，没写才回退到这里的 skillAnim / skillSound
        attackAnim: 'attack',   // 普攻时本体播放的动作
        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）
        // �🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
        attackSound: 'enemy_guaiwu3_attack',  // 普攻音效
        skillSound: 'enemy_guaiwu3_skill',    // 技能默认音效（技能可在配置里单独写 sound 覆盖）
        // spine渲染配置
        spineScale: 0.8,
        spineAlpha: 1,
        // 📍 Y 轴偏移（vh 单位，正数=往下移，负数=往上移）
        // 雷鸟是飞行动物，默认上浮 5vh 表现「在空中」；想调整直接改这个数值即可
        yOffsetVH: 0,
        // 🎯 被动配置（雷鸟：受到攻击后生命值低于50%时会飞翔，无法受到伤害持续至回合开始，仅触发一次）
        passives: [
            {
                name: '濒死飞翔',
                desc: '受到攻击后若生命值低于50%，进入飞翔状态无法受到伤害，持续至自身回合开始（仅触发一次）',
                type: 'flyOnLowHp',
                hpThreshold: 0.5,
                triggerOnce: true,   // 仅触发一次
            }
        ],

    },
    // 👑 暗影王（暗影的精英/BOSS，暂用 monster1 骨骼放大）
    anyingwang: {
        codexScale: 0.85,
        codexAnimSpeed: 1,
        name: '暗影王',
        level: 15,
        hp: 300,
        attack: 18,
        armor: 50,
        magicResist: 25,
        speed: 100,
        luck: 10,
        baseExp: 150,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.6,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        // � 本体动作动画名（骨骼里实际存在的动画名）
        //   attackAnim：普攻动作
        //   skillAnim：技能默认动作（缺省回退 attack）
        //   ⚠️ 技能里单独配了 skillAnim / sound，优先用技能自己的，没写才回退到这里的 skillAnim / skillSound
        attackAnim: 'attack',   // 普攻时本体播放的动作
        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）
        // �🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
        attackSound: 'enemy_anyingwang_attack',  // 普攻音效
        skillSound: 'enemy_anyingwang_skill',    // 技能默认音效（技能可在配置里单独写 sound 覆盖）
        // spine渲染配置
        spineScale: 0.9,
        spineAlpha: 1,
        // 👑 Boss 标记：血条固定在屏幕顶部中心（二阶段换皮重建时继承该标记）
        isBoss: true,
        // 血条更宽（BOSS 感）
        hpBarWidth: 12,
        // 🎯 技能配置（暗影王）
        skills: [
            {
                name: '凝暗聚影',
                desc: "召唤2个拥有自己50%属性的暗影",
                type: 'summon',
                summonType: 'monster1',   // 召唤暗影
                summonCount: 2,
                summonStatRatio: 0.5,
                maxTotal: 5,
                minTotalForUse: 4,
                cooldown: 3,
                initialCooldown: 3,
                // ⏱️ 延迟召唤（毫秒）：先播放 skillAnim 召唤动作（zhaohuan），
                //    动作做完后才真正召唤暗影（0/不配 = 立即召唤）
                summonDelay: 350,
                // 🎬 技能专属动作：召唤可配不同动画（如 'summon'），缺省用怪物级 skillAnim
                skillAnim: 'zhaohuan',
                // 🎵 技能专属音效
                sound: 'enemy_anyingwang_summon',
            }
        ],
        // 👑 二阶段配置（暗影王血量归0后变身，_phase2Data 透传到战斗单位）
        phase2: {
            name: '暗影王',
            // 💬 二阶段变身通知气泡文案（通用：其他 boss 写自己的 bubbleText 即可）
            bubbleText: '玩闹时间结束了！',
            hp: 450,
            attack: 26,
            armor: 40,
            magicResist: 25,
            speed: 105,
            luck: 10,
            baseExp: 0,
            attackMultiplier: 1,
            attackEffect: 'zhuaji',
            attackEffectScale: 0.6,
            attackEffectOffsetX: 2,
            attackEffectOffsetY: 0,
            attackAnim: 'attack',
            skillAnim: 'jineng',
            attackSound: 'enemy_anyingwang_attack',
            skillSound: 'enemy_anyingwang_skill',
            spineKey: 'anyingwang1',
            enterAnim: 'ruchang',
            idleAnim: 'idle',
            spineScale: 0.9,
            hpBarWidth: 12,
            // 👑 二阶段同样是 Boss：血条固定在屏幕顶部中心（换皮重建与图鉴/立绘读配置均按 Boss 处理）
            isBoss: true,
            skills: [
                {
                    name: '独裁',
                    desc: '对玩家造成150%物理伤害并使玩家手上的卡牌所需消耗的灵力提升1，玩家使用卡片后恢复',
                    type: 'singleDamage_dictatorship',
                    damageRatio: 1.5,
                    cooldown: 3,
                    initialCooldown: 2,
                    skillAnim: 'jineng',
                    sound: 'enemy_anyingwang_skill',
                }
            ],
            passives: [
                { name: '王权', desc: '入场时消灭场上所有魔物并召唤1只空心布偶和1只诅咒布偶，暗影王和这2个魔物属性全部相同', type: 'sovereignty' },
                { name: '天命', desc: '暗影王行动时，随机冻结玩家手上一张卡牌持续一回合', type: 'destiny' },
            ],
        },

    },
    // 👑 暗影王二阶段（图鉴独立记录：anyingwang1 骨骼 + 独裁/王权/天命）
    anyingwang1: {
        codexScale: 0.85,
        codexAnimSpeed: 1,
        name: '暗影王·二阶段',
        desc: '玩闹时间结束后的暗影王，显露真正姿态',
        level: 15,
        hp: 450,
        attack: 26,
        armor: 40,
        magicResist: 25,
        speed: 105,
        luck: 10,
        baseExp: 0,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        attackMultiplier: 1,
        attackEffect: 'zhuaji',
        attackEffectScale: 0.6,
        attackEffectOffsetX: 2,
        attackEffectOffsetY: 0,
        attackAnim: 'attack',
        skillAnim: 'jineng',
        attackSound: 'enemy_anyingwang_attack',
        skillSound: 'enemy_anyingwang_skill',
        spineScale: 0.9,
        spineAlpha: 1,
        hpBarWidth: 12,
        // 🎯 二阶段技能（与 phase2 配置一致）
        skills: [
            {
                name: '独裁',
                desc: '对玩家造成150%物理伤害并使玩家手上的卡牌所需消耗的灵力提升1，玩家使用卡片后恢复',
                type: 'singleDamage_dictatorship',
                damageRatio: 1.5,
                cooldown: 3,
                initialCooldown: 2,
                skillAnim: 'jineng',
                sound: 'enemy_anyingwang_skill',
            }
        ],
        // 🎯 二阶段被动（与 phase2 配置一致）
        passives: [
            { name: '王权', desc: '入场时消灭场上所有魔物并召唤1只空心布偶和1只诅咒布偶，暗影王和这2个魔物属性全部相同', type: 'sovereignty' },
            { name: '天命', desc: '暗影王行动时，随机冻结玩家手上一张卡牌持续一回合', type: 'destiny' },
        ],
    },
    // 👁️ 巨型眼瞳（重压 + 元素抗性被动）
    jutong: {
        codexScale: 0.7,
        codexAnimSpeed: 1,
        name: '巨型眼瞳',
        level: 12,
        hp: 380,
        attack: 20,
        armor: 40,
        magicResist: 120,
        speed: 85,
        luck: 5,
        baseExp: 200,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 1,
        attackArmorReducePct: 0.1,
        attackEffect: 'zhuaji2',
        attackEffectScale: 1,
        attackEffectOffsetX: 0,
        attackEffectOffsetY: 5,
        // � 本体动作动画名（骨骼里实际存在的动画名）
        //   attackAnim：普攻动作
        //   skillAnim：技能默认动作（缺省回退 attack）
        //   ⚠️ 多技能扩展：有多个技能时，可在每个技能配置里单独写 skillAnim / sound，
        //      优先用技能自己的，没写才回退到这里的 skillAnim / skillSound
        attackAnim: 'attack',   // 普攻时本体播放的动作
        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）
        // �🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
        attackSound: 'enemy_yantong_attack',  // 普攻音效
        skillSound: 'enemy_yantong_skill',    // 技能默认音效（技能可在配置里单独写 sound 覆盖）
        // spine渲染配置
        spineScale: 1.1,
        spineAlpha: 1,
        hpBarWidth: 13,
        // 👑 巨型眼瞳是 Boss：血条固定在屏幕顶部中心（二阶段同理）
        isBoss: true,
        // 🎯 技能配置（巨型眼瞳：致幻）
        skills: [
            {
                name: '致幻',
                desc: '造成160%攻击力伤害并降低玩家100%行动条，冷却3回合',
                type: 'singleDamage_actionBarReduce1',  // 🎯 子类型：与暗影突袭共享技能逻辑，但特效配置独立（skillTypes.Reduce1 → zhihuan 特效）
                damageRatio: 1.6,
                actionBarReduce: 1,
                cooldown: 3,
                initialCooldown: 20,
                // 🎬 技能专属动作：jutong 骨骼仅有 attack/fight/idle 三个动画（无独立技能动画），
                //    这里与暗影突袭共用 attack；技能特效已通过 skillTypes.Reduce1 → zhihuan 区分
                skillAnim: 'attack',
                // 🎵 技能专属音效（缺省用怪物级 skillSound）
                sound: 'enemy_yantong_skill',
            }
        ],
        // 🎯 被动配置（巨型眼瞳：灵力汲取）
        passives: [
            {
                name: '灵力汲取',
                desc: '造成伤害时降低玩家1点灵力',
                type: 'manaDrainOnHit',
                manaDrain: 1,
            }
        ],
        // 👁️ 二阶段配置（巨型眼瞳血量归0后变身，_phase2Data 透传到战斗单位）
        phase2: {
            name: '千目魔瞳',
            // 💬 二阶段变身通知气泡文案
            bubbleText: "Mgl'oth shugg-nafl gh'kllu!",
            hp: 550,
            attack: 30,
            armor: 40,
            magicResist: 220,
            speed: 90,
            luck: 8,
            baseExp: 0,
            attackMultiplier: 1,
            attackDmgType: "random",
            attackEffect: 'zhuaji2',
            attackEffectScale: 1,
            attackEffectOffsetX: 0,
            attackEffectOffsetY: 5,
            attackAnim: 'attack',
            skillAnim: 'jineng',
            attackSound: 'enemy_yantong_attack',
            skillSound: 'enemy_yantong_skill',
            spineKey: 'jutong1',
            enterAnim: 'ruchang',
            idleAnim: 'idle',
            spineScale: 1.1,
            hpBarWidth: 13,
            // 👑 二阶段同样是 Boss：血条固定在屏幕顶部中心
            isBoss: true,
            skills: [
                {
                    name: '千目渊光',
                    desc: '对玩家造成8段伤害，每段随机造成13%攻击力的随机元素伤害。冷却3回合',
                    type: 'multiHit_randomElement',
                    hitCount: 8,
                    damageRatio: 0.13,
                    cooldown: 3,
                    initialCooldown: 2,
                    skillAnim: 'jineng',
                    sound: 'enemy_yantong_skill',
                }
            ],
            passives: [
                { name: '深渊魔瞳', desc: '获得100魔抗', type: 'magicResistUp', magicResist: 100 },
                { name: '深渊凝视', desc: '玩家每次行动时卡牌灵力消耗增加1点，回合内首次使用卡牌后移除此效果', type: 'manaCostUpFirstTurn' }
            ],
        },

    },
    // 👁️ 巨型眼瞳二阶段（图鉴独立记录：jutong1 骨骼 + 千目渊光/深渊魔瞳/深渊凝视）
    jutong1: {
        codexScale: 0.85,
        codexAnimSpeed: 0.6,
        name: '千目魔瞳',
        desc: '展露深渊真容的眼瞳，凝视间万物沉沦',
        // 👑 千目魔瞳是 Boss：血条固定在屏幕顶部中心
        isBoss: true,
        level: 12,
        hp: 550,
        attack: 30,
        armor: 40,
        magicResist: 220,
        speed: 90,
        luck: 8,
        baseExp: 0,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        attackMultiplier: 1,
        attackDmgType: 'random',  // 普攻随机元素属性
        attackEffect: 'zhuaji2',
        attackEffectScale: 1,
        attackEffectOffsetX: 0,
        attackEffectOffsetY: 5,
        attackAnim: 'attack',
        skillAnim: 'jineng',
        attackSound: 'enemy_yantong_attack',
        skillSound: 'enemy_yantong_skill',
        spineScale: 1.1,
        spineAlpha: 1,
        hpBarWidth: 13,
        skills: [
            {
                name: '千目渊光',
                desc: '对玩家造成8段伤害，每段随机造成13%攻击力的随机元素伤害。冷却3回合',
                type: 'multiHit_randomElement',
                hitCount: 8,
                damageRatio: 0.13,
                cooldown: 3,
                initialCooldown: 2,
                skillAnim: 'jineng',
                sound: 'enemy_yantong_skill',
            }
        ],
        passives: [
            { name: '深渊魔瞳', desc: '获得100魔抗', type: 'magicResistUp', magicResist: 100 },
            { name: '深渊凝视', desc: '玩家每次行动时卡牌灵力消耗增加1点，回合内首次使用卡牌后移除此效果', type: 'manaCostUpFirstTurn' },
        ],
    },
    // 🐦 雷鸟女皇（飞翔 + 元素抗性被动）
    nvhuang: {
        codexScale: 1.1,
        codexAnimSpeed: 1,
        name: '雷鸟女皇',
        level: 18,
        hp: 500,
        attack: 26,
        armor: 60,
        magicResist: 70,
        speed: 115,
        luck: 12,
        baseExp: 300,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 0.45,
        attackHits: 3,
        hitIntervalMs: 150,        // 每段间隔
        attackDmgType: "lightning",
        attackEffect: 'zhuaji2',
        attackEffectScale: 1,
        attackEffectOffsetX: 0,
        attackEffectOffsetY: 5,
        // � 本体动作动画名（骨骼里实际存在的动画名）
        //   attackAnim：普攻动作
        //   skillAnim：技能默认动作（缺省回退 attack）
        //   ⚠️ 多技能扩展：有多个技能时，可在每个技能配置里单独写 skillAnim / sound，
        //      优先用技能自己的，没写才回退到这里的 skillAnim / skillSound
        attackAnim: 'attack',   // 普攻时本体播放的动作
        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）
        // �🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
        attackSound: 'enemy_leiniaonvhuang_attack',  // 普攻音效
        skillSound: 'enemy_leiniaonvhuang_skill',    // 技能默认音效（技能可在配置里单独写 sound 覆盖）
        // spine渲染配置
        spineScale: 1.15,
        spineAlpha: 1,
        hpBarWidth: 14,
        // 📍 雷鸟女皇默认上浮（飞行）
        yOffsetVH: -5,
        // 🎯 技能配置（雷鸟女皇：电磁场）
        skills: [
            {
                name: '电磁场',
                desc: '令玩家周围充满电流，玩家回合开始时受到雷鸟女皇50%攻击力雷属性伤害；永久持续直到战斗结束',
                type: 'electro_field',
                damageRatio: 0.5,
                cooldown: 999,
                initialCooldown: 0,
                // 🎬 技能专属动作：施放时播 boss 自己的 attack 动画
                //    （'diancichang' 是场地特效骨骼的动画名，boss 骨骼 nvhuang.skel 没有，播不出来）
                skillAnim: 'attack',
                // 🎵 技能专属音效（缺省用怪物级 skillSound）
                sound: 'enemy_leiniaonvhuang_skill',
            }
        ],
        // 🎯 被动配置（雷鸟女皇）
        passives: [
            {
                name: '受击飞翔',
                desc: '受到玩家攻击后会飞翔，无法受到伤害持续至回合开始，并立即以45%攻击力的雷电反击玩家',
                type: 'flyOnHit',
                triggerPerTurn: true, // 每回合可触发一次
                counterDmgRatio: 0.45,
                counterDmgType: 'lightning', // 电属性
                counterEffectName: 'leiji', // 复用普攻雷电特效
                counterEffectScale: 3,
            }
        ],

    },
    // 风息（BOSS 级自定义怪，不透明、尺寸饱满）
    fengxi: {
        codexScale: 0.9,
        codexAnimSpeed: 1,
        name: '风息',
        level: 12,
        hp: 200,
        attack: 18,
        armor: 80,
        speed: 90,
        luck: 15,
        baseExp: 100,
        damageTaken: 0,//易伤
        physDamageTaken: 0,//物理易伤
        allDamageBonus: 0,//增伤
        executeDamageBonus: 1,//最终增伤
        takenDamageReduce: 1,//最终减伤
        // 攻击相关配置
        attackMultiplier: 0.5,
        attackHits: 2,
        hitIntervalMs: 150,        // 每段间隔
        attackDmgType: "wind",
        attackEffect: 'zhuaji2',
        attackEffectScale: 1,
        attackEffectOffsetX: 0,
        attackEffectOffsetY: 5,
        // � 本体动作动画名（骨骼里实际存在的动画名）
        //   attackAnim：普攻动作
        //   skillAnim：技能默认动作（缺省回退 attack）
        //   ⚠️ 多技能扩展：有多个技能时，可在每个技能配置里单独写 skillAnim / sound，
        //      优先用技能自己的，没写才回退到这里的 skillAnim / skillSound
        attackAnim: 'attack',   // 普攻时本体播放的动作
        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）
        // �🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
        attackSound: 'enemy_fengxi_attack',  // 普攻音效
        skillSound: 'enemy_fengxi_skill',    // 技能默认音效（技能可在配置里单独写 sound 覆盖）
        // spine渲染配置
        spineScale: 1,
        spineAlpha: 1,
        // 血条宽度：视口百分比（14 = 14vw，默认 10）
        hpBarWidth: 14,
        // X 位置偏移（vw 单位，负值往左，正值往右；默认 0）
        // 注意：设置后会作用到整排怪物（第一个偏移，其他跟随一起偏移）
        // xOffsetVW: -10,
        // 🎯 技能配置（风息：龙卷风暴，7段×35%风伤）
        skills: [
            {
                name: '暴风',
                desc: '召唤龙卷风，对玩家造成7段伤害，每段35%攻击力风属性伤害',
                type: 'multiHit_wind',
                damageRatio: 0.35,
                hitCount: 7,
                hitIntervalMs: 200,
                windActionBarReduce: 0.02,
                bleedChance: 0.5,
                cooldown: 3,
                initialCooldown: 3,
                // 🎬 技能专属动作
                skillAnim: 'jineng',
                // 🎵 技能专属音效
                sound: 'enemy_fengxi_skill',
            }
        ],
        // 🎯 被动配置（风息：御风——自身回合结束时速度提升5%，至多提升至50%）
        passives: [
            {
                name: '顺风而行',
                desc: '自身回合结束时，速度提升5%，至多提升至50%',
                type: 'windSpeedUp',
                speedBoostPerTurn: 0.05,
                maxSpeedBoost: 0.5,
            }
        ],

    }
};

/**
 * 创建单个敌人基础数据
 * @param {number} id - 敌人ID
 * @param {number} positionIndex - 位置索引
 * @param {number} totalCount - 总数量
 * @param {string} monsterType - 怪物类型
 */
function createBaseEnemy(id, positionIndex, totalCount, monsterType = "monster1") {
    const xOffset = positionIndex * 8 * VW;
    const yOffset = (positionIndex % 2) * 4 * VH;
    const config = monsterConfigs[monsterType] || monsterConfigs.monster1;

    return {
        id: id,
        juese: monsterType,
        mapId: "desert_02",
        player: 2,
        x: xOffset,
        y: 75 * VH + yOffset,
        speed: 0,
        direction: -1,
        data: {
            name: config.name,
            hp: config.hp,
            maxHp: config.hp,
            baseSpeed: config.speed,
            speed: config.speed,
            allDamageBonus: config.allDamageBonus,
            executeDamageBonus: config.executeDamageBonus,
            takenDamageReduce: config.takenDamageReduce,
            damageTaken: config.damageTaken,//易伤
            physDamageTaken: config.damageTaken,//物理易伤
            camp: 'enemy',
            position: positionIndex + 1,
            baseArmor: config.armor,
            armor: config.armor,
            // 🛡️ 魔抗透传（怪物编辑里配置；战斗按护甲/魔抗双减免，缺省 0）
            baseMagicResist: config.magicResist ?? 0,
            magicResist: config.magicResist ?? 0,
            baseAttack: config.attack,
            attack: config.attack,
            baseLuck: config.luck,
            luck: config.luck,
            isElite: monsterType === 'guaiwu2',
            attackMultiplier: config.attackMultiplier,
            attackBase: config.attackBase,
            // 🛡️ 普攻附加效果：削弱玩家当前护甲百分比（巨型眼瞳 10%）
            attackArmorReducePct: config.attackArmorReducePct ?? 0,
            // 🎯 多段普攻透传（雷鸟女皇 attackHits: 3 三段雷击；缺省单段）
            attackHits: config.attackHits ?? 1,
            hitIntervalMs: config.hitIntervalMs ?? 150,
            attackDmgType: config.attackDmgType ?? 'physical',
            // 🚫 冰伤不触发角色冻结（凋零魔兽：冻结=冻手牌，不冻玩家角色）
            noFreezeReact: config.noFreezeReact ?? false,
            attackEffect: config.attackEffect,
            attackEffectScale: config.attackEffectScale,
            attackEffectOffsetX: config.attackEffectOffsetX,
            attackEffectOffsetY: config.attackEffectOffsetY,
            // � 本体动作动画名透传（普攻/技能，缺省回退 attack）
            attackAnim: config.attackAnim || 'attack',  // 普攻动画
            skillAnim: config.skillAnim || 'attack',    // 技能动画
            // �🎵 战斗音效透传（占位文件名，后期替换；文件不存在自动跳过）
            attackSound: config.attackSound || null,  // 普攻音效
            skillSound: config.skillSound || null,    // 技能音效
            spineScale: config.spineScale,
            spineAlpha: config.spineAlpha,
            // 🧪 普攻附加毒（毒系怪：攻击命中给玩家施加毒层，缺省无）
            attackPoison: config.attackPoison ? JSON.parse(JSON.stringify(config.attackPoison)) : null,
            // 💀 死亡毒被动（毒系怪：死亡后给玩家施加毒层，缺省 0）
            deathPoisonStacks: config.deathPoisonStacks ?? 0,
            deathPoisonTurns: config.deathPoisonTurns ?? 3,
            // 🎯 技能/被动配置透传（深拷贝，避免多实例共享引用）
            //    ⚠️ 深拷贝会完整保留每个技能自带的 skillAnim / sound 字段（多技能各配不同动作/音效）
            skills: config.skills ? JSON.parse(JSON.stringify(config.skills)) : [],
            passives: config.passives ? JSON.parse(JSON.stringify(config.passives)) : [],
            // 🌀 水平翻转：false 时战斗不翻转（骨骼美术本身朝左的怪用，如空心布偶 buou）
            flipX: config.flipX ?? true,
            // 血条宽度：配置里写的是视口百分比（如 14 = 14vw），转成像素
            // 不配置则不传，战斗页用默认 VW(10)
            hpBarWidth: config.hpBarWidth !== undefined ? config.hpBarWidth * VW : undefined,
            // 👑 Boss 标记（true 时血条显示在屏幕顶部中心，不跟随敌人）
            isBoss: config.isBoss ?? false,
            // X 位置偏移（vw 单位，转成像素，负值往左）
            xOffsetVW: config.xOffsetVW ?? 0,
            // 📍 Y 轴偏移（vh 单位，正数=往下，负数=往上；不配置默认 0）
            yOffsetVH: config.yOffsetVH ?? 0,
            // 🎪 入场动画透传（空心布偶/诅咒布偶等出场先播 enterAnim → 待机）
            enterAnim: config.enterAnim || null,
            _enterAnimPending: !!config.enterAnim,
            enterTimeScale: config.enterTimeScale ?? 0.5, // 🐢 ruchang 播放速度（召唤布偶 0.35，普通默认 0.5）
            // 👑 Boss 二阶段配置透传（暗影王血归0变身；深拷贝，避免多实例共享引用）
            _phase2Data: config.phase2 ? JSON.parse(JSON.stringify(config.phase2)) : null
        }
    };
}

// ⛔ 讨伐战已移除：createEnemiesData（按深入度随机生成讨伐敌人）及其专属 getEliteChance 已删除，
//    战斗统一走 createCustomEnemies（对话自定义战斗 / 地牢战斗）


/**
 * 创建自定义敌人数据（剧情/自定义战斗专用，怪物完全自定义）
 * - 敌人种类、数量、属性、奖励完全由配置决定，不随机
 * - 不参与深入度系统（战斗胜利也不会增加深入度上限）
 * @param {Array} enemyConfigs - 敌人配置数组
 *   [{ monsterType: 'monster1'|'guaiwu2'|..., count: 2, hpMultiplier: 1, attackMultiplier: 1,
 *      armorMultiplier: 1, speedMultiplier: 1, baseExp: 50, drops: [...] }]
 * @param {number|null} [depth] - 可选深入度加成：传入则按标准深入度倍率统一缩放敌人属性
 *   （例如传 30，敌人的属性 = 基础属性 × 30% 深度的标准倍率 × 各自配置乘数）
 * @returns {Array} 敌人数组
 */
function createCustomEnemies(enemyConfigs, depth = null) {
    const enemies = [];
    if (!Array.isArray(enemyConfigs)) return enemies;

    // 深入度加成：传入 depth 则应用标准深入度倍率（确定性，不随机）
    const depthMult = depth != null
        ? getDepthMultiplier(depth)
        : { hp: 1, attack: 1, armor: 1, speed: 1 };

    // 敌人 id 从 1000 开始（独立区间，避免与剧情 NPC / 队友冲突）
    let id = 1000;
    enemyConfigs.forEach((cfg) => {
        const count = cfg.count || 1;
        for (let i = 0; i < count; i++) {
            const monsterType = cfg.monsterType || 'monster1';
            const config = monsterConfigs[monsterType] || monsterConfigs.monster1;

            const baseEnemy = createBaseEnemy(id, id - 1000, count, monsterType);

            // 自定义属性乘数（默认1，不额外缩放）
            const hpM = cfg.hpMultiplier ?? 1;
            const atkM = cfg.attackMultiplier ?? 1;
            const armM = cfg.armorMultiplier ?? 1;
            const spdM = cfg.speedMultiplier ?? 1;

            // 最终属性 = 基础属性 × 深入度加成倍率 × 各自配置乘数
            baseEnemy.data.hp = Math.floor((cfg.hp ?? config.hp) * depthMult.hp * hpM);
            baseEnemy.data.maxHp = Math.floor((cfg.hp ?? config.hp) * depthMult.hp * hpM);
            baseEnemy.data.attack = Math.floor((cfg.attack ?? config.attack) * depthMult.attack * atkM * 10) / 10;
            baseEnemy.data.baseAttack = baseEnemy.data.attack;
            baseEnemy.data.armor = Math.floor((cfg.armor ?? config.armor) * depthMult.armor * armM);
            baseEnemy.data.baseArmor = baseEnemy.data.armor;
            // 🛡️ 魔抗：可被自定义配置覆盖（如地牢 Tiled magicResist），未配置继承怪物编辑数值
            baseEnemy.data.magicResist = Math.floor((cfg.magicResist ?? config.magicResist ?? 0) * depthMult.armor * armM);
            baseEnemy.data.baseMagicResist = baseEnemy.data.magicResist;
            baseEnemy.data.speed = Math.floor((cfg.speed ?? config.speed) * depthMult.speed * spdM);
            baseEnemy.data.baseSpeed = baseEnemy.data.speed;

            // 自定义基础经验（默认用怪物配置的 baseExp，可覆盖）
            baseEnemy.data.baseExp = cfg.baseExp ?? config.baseExp;
            // 自定义掉落（默认用怪物配置的 drops，可覆盖为空数组表示不掉落）
            baseEnemy.data.customDrops = cfg.drops !== undefined ? cfg.drops : null;
            // 🎁 固定掉落（配置了则只发固定，跳过 ENEMY_DROP_RATES 随机表）
            baseEnemy.data.dropItems = cfg.dropItems ?? null;

            // 标记为自定义战斗敌人（不参与深入度系统）
            baseEnemy.data.isCustom = true;

            // 记录敌人名称（用于战斗UI显示）
            baseEnemy.data.name = cfg.name || config.name;
            // 👑 Boss 标记（true 时血条显示在屏幕顶部中心；不写则继承怪物配置默认）
            baseEnemy.data.isBoss = cfg.isBoss ?? config.isBoss ?? false;
            // 血条宽度：单场战斗自定义（写视口百分比，如 14 = 14vw），转成像素
            // 不写则用怪物配置默认，再没有用战斗页默认
            if (cfg.hpBarWidth !== undefined) {
                baseEnemy.data.hpBarWidth = cfg.hpBarWidth * VW;
            }
            // X 位置偏移：单场战斗自定义（vw 单位，负值往左，正值往右）
            // 不写则用怪物配置默认（默认 0）
            if (cfg.xOffsetVW !== undefined) {
                baseEnemy.data.xOffsetVW = cfg.xOffsetVW;
            } else {
                baseEnemy.data.xOffsetVW = config.xOffsetVW ?? 0;
            }
            // 📍 Y 轴偏移：单场战斗自定义（vh 单位，正数=往下，负数=往上）
            // 不写则用怪物配置默认（默认 0）
            if (cfg.yOffsetVH !== undefined) {
                baseEnemy.data.yOffsetVH = cfg.yOffsetVH;
            } else {
                baseEnemy.data.yOffsetVH = config.yOffsetVH ?? 0;
            }

            enemies.push(baseEnemy);
            id++;
        }
    });

    return enemies;
}

// ⛔ 讨伐战已移除：BOSS_FIRST_REWARDS（各场景 Boss 首次通关奖励）已删除，
//    Boss 战判定与首次/重复击败奖励系统不再存在

/**
 * 计算战斗奖励（经验值 + 掉落物品）
 * ⛔ 讨伐战已移除：不再按深入度乘经验倍率、不再判定 Boss 战，bossRewardRate 恒 1
 */
function calculateBattleRewards(enemies) {
    // ⛔ 讨伐战已移除：经验倍率恒 1（地牢/自定义战斗的深度与天气加成已由配置端 baseExp 算好）
    let totalExp = 0;
    let totalGold = 0;
    console.log('enemies=', enemies);
    // 鸿运增幅 经验天赋
    const expTalentLv = user.getTalentLevel('luck_grace') || 0
    const expTalentRate = 1 + 0.15 + (expTalentLv - 1) * 0.075
    // 🎁 掉落率加成（眷顾天赋 +25%）：金币数量 × (眷顾 + 幸运转化率)；掉落概率经统一 luckProb 提升
    const blessMult = user.hasTalent('blessing') ? 1 + (user.getTalentEffect?.('blessing', 'dropMult') ?? 0.25) : 1;

    for (const enemy of enemies) {
        // 🔥 兼容两种敌人结构：createUnit 展开后字段在顶层（无 .data），未展开时为 { data } 结构
        const enemyData = enemy.data ?? enemy;
        const monsterType = enemyData.juese || enemy.juese || 'monster1';
        const config = monsterConfigs[monsterType] || monsterConfigs.monster1;
        // ⛔ 讨伐战已移除：敌人经验统一用配置的 baseExp（地牢/自定义战斗已带深度/天气倍率），不再按深度乘经验倍率
        const customBaseExp = enemyData.baseExp;

        // 🎖️ 奖励随怪物等级提升：经验 × 等级倍率（每级 +10%）
        const enemyExp = Math.floor((customBaseExp ?? config.baseExp ?? 0) * expTalentRate * rewardLvMultOf(enemy));
        // ⛔ Boss 战已移除：经验倍率恒 1（isBossBattle 变量已随讨伐战删除，这里直接累加）
        totalExp += enemyExp;

        // 💰 击败敌人金币奖励：按类型分档（普通/精英/Boss）× 等级倍率 × 掉落率加成（眷顾 + 幸运转化率）
        totalGold += Math.round(enemyGoldOf(enemy) * (blessMult + user.getLuckRate()));
    }

    // 🎁 掉落：按敌人 spine 查 ENEMY_DROP_RATES（与地牢统一规则：
    //    每个敌人独立查自己的表，从上到下检测、命中即停，每张表最多掉 1 种）
    //    掉落率加成 blessMult 已在函数开头计算，幸运概率经统一 luckProb 提升
    const dropMap = new Map();
    const addDrop = (itemId, cnt, img) => {
        if (dropMap.has(itemId)) dropMap.get(itemId).num += cnt;
        else dropMap.set(itemId, { itemKey: itemId, name: itemId, img: img || '', num: cnt });
    };
    for (const enemy of enemies) {
        const eData = enemy.data ?? enemy;
        const mType = eData.juese || enemy.juese || 'monster1';
        // 🎯 固定掉落优先：配置了 dropItems（非空）→ 只发固定，跳过随机表
        if (Array.isArray(eData.dropItems) && eData.dropItems.length) {
            for (const fi of eData.dropItems) {
                const itemId = String(fi.item || fi.name || '').trim();
                if (!itemId) continue;
                // 🎖️ 固定掉落数量随怪物等级提升（至少 1）
                addDrop(itemId, Math.max(1, Math.round((Number(fi.count ?? fi.num) || 1) * rewardLvMultOf(enemy))), fi.img || ITEM_SKIN_MAP[itemId] || itemId);
            }
            continue;
        }
        const dropTable = ENEMY_DROP_RATES[mType];
        if (!dropTable || dropTable.length === 0) continue;
        for (const dr of dropTable) {
            const itemId = String(dr.item || '').trim();
            if (!itemId) continue;
            // 🎖️ 随机掉落概率随怪物等级提升（上限 100%）
            if (Math.random() < user.luckProb(Number(dr.base || 0) * blessMult * rewardLvMultOf(enemy))) {
                addDrop(itemId, 1, dr.img || ITEM_SKIN_MAP[itemId] || itemId);
                break; // 🛑 命中即停：每张表最多掉 1 种
            }
        }
    }
    const itemRewards = Array.from(dropMap.values());
    return { totalExp, totalGold, itemRewards };
}

// 导出
export {
    getDepthMultiplier,
    monsterConfigs,
    createCustomEnemies,
    calculateBattleRewards
};