// =====================================================
// 🎛️ 纯配置段（从 counter.js 迁出）
// ⚠️ dladmin 后台「物品/升级/成就/任务/地牢」编辑直接写入本文件
// 保持导出顺序 = 原 counter.js 顺序（配置段内部存在交叉引用）
// =====================================================
export const DEFAULT_GACHA_RATES = {
  // 普通卡池（消耗灵力晶核）
  normal: {
    common: 50, // 普通
    excellent: 28, // 优秀
    rare: 17, // 稀有
    epic: 5, // 史诗
    legendary: 0, // 传说
  },
  // 高级卡池（消耗魔力晶核，无保底）
  premium: {
    excellent: 35, // 优秀
    rare: 40, // 稀有
    epic: 18, // 史诗
    legendary: 7, // 传说
  },
};

// ========================
// 🎓 默认天赋配置（后续新增/删除/调整天赋数值只需改 state 里的 talentConfig，读档自动生效）
// 占位变量：在 state 初始化时被捕获为默认快照（见 state 中 talentConfig 的 IIFE）
// ========================

export const DEFAULT_CARD_DATA = {
  // ⭐ 卡牌配置（dladmin「卡牌编辑」写入）
  // cost=灵力消耗；atkRatio=1/2/3星攻击力倍率；desc 由游戏内模板动态生成（跟变量绑定）
  "双兆": {
    "skin": "TwinFate",
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "color": "#8e44ad",
    "dmgType": "null",
    "rarity": "excellent",
    "cardType": "exclusive",
    "exclusiveRole": "linen",
    "num": 0,
    "maxCooldown": 0,
    "cost": 2,
    "limitPerTurn": 0,
    "desc": "抽取 2 张卡牌。",
    "starDesc": ["抽取 2 张卡牌。","抽取 2 张卡牌。","抽取 2 张卡牌。"],
    "atkRatio": [0,0,0],
  },
  "火精灵": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌效果提升 15%。"},
    "skin": "huojingling",
    "color": "#ff7043",
    "dmgType": "fire",
    "rarity": "excellent",
    "num": 0,
    "isSummon": true,
    "maxCooldown": 0,
    "cost": 3,
    "limitPerTurn": 0,
    "atkRatio": [0.8,0.85,0.9],
    "speedRatio": [0.6,0.7,0.8],
    "actionDmgRatio": [0.9,1,1.1],
    "summonDuration": 3,
    "spineScale": 0.336,
    "desc": "召唤一个持续 3 回合的火精灵，以你 60/70/80% 的速度行动，拥有 80/85/90% 攻击力，行动时对最近的敌人造成 90/100/110% 攻击力的火属性伤害；火精灵存在时你的火属性伤害提升 25%。首次召唤消耗 3 灵力，场上已有火精灵时再次召唤仅需 2 灵力，并刷新持续回合并强化（体型+8%、攻击力+20%、速度+10%）。",
    "starDesc": ["召唤持续 3 回合的火精灵，拥有你 60% 速度与 80% 攻击力，行动时对最近的敌人造成 90% 攻击力的火属性伤害。","召唤持续 3 回合的火精灵，拥有你 65% 速度与 85% 攻击力，行动时对最近的敌人造成 100% 攻击力的火属性伤害。","召唤持续 3 回合的火精灵，拥有你 70% 速度与 90% 攻击力，行动时对最近的敌人造成 110% 攻击力的火属性伤害。"],
  },
  "水精灵": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "shuijingling",
    "color": "#4fc3f7",
    "dmgType": "water",
    "rarity": "excellent",
    "num": 0,
    "isSummon": true,
    "maxCooldown": 0,
    "cost": 3,
    "limitPerTurn": 0,
    "atkRatio": [0.8,0.85,0.9],
    "speedRatio": [0.6,0.7,0.8],
    "healRatio": [0.7,0.8,0.9],
    "summonDuration": 3,
    "spineScale": 0.336,
    "desc": "召唤一个持续 3 回合的水精灵，以你 60/70/80% 的速度行动，每次行动为你恢复召唤时攻击力 70/80/90% 的生命值；水精灵存在时你的水元素伤害提升 15%。首次召唤消耗 3 灵力，场上已有水精灵时再次召唤仅需 2 灵力，并刷新持续回合并强化（体型+8%、速度+8%、行动条+25%、治疗基数按当前攻击刷新）。",
    "starDesc": ["召唤持续 3 回合的水精灵，以你 60% 速度行动，每次行动恢复召唤时攻击力 70% 的生命值。","召唤持续 3 回合的水精灵，以你 70% 速度行动，每次行动恢复召唤时攻击力 80% 的生命值。","召唤持续 3 回合的水精灵，以你 80% 速度行动，每次行动恢复召唤时攻击力 90% 的生命值。"],
  },
  "冰精灵": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌效果提升 15%。"},
    "skin": "bingjingling",
    "color": "#87CEEB",
    "dmgType": "ice",
    "rarity": "excellent",
    "num": 0,
    "isSummon": true,
    "maxCooldown": 0,
    "cost": 3,
    "limitPerTurn": 0,
    "speedRatio": [0.7,0.85,1],
    "summonDuration": 3,
    "spineScale": 0.336,
    "desc": "召唤一个持续 3 回合的冰精灵，以你 70/85/100% 的速度行动，每次行动使你抽 1 张牌并使其灵力消耗-1（单卡最多降 1 费）；冰精灵存在时你的冰元素伤害提升 15%。首次召唤消耗 3 灵力，场上已有冰精灵时再次召唤仅需 2 灵力，并刷新持续回合并强化（体型+8%、行动条+25%、速度+8%），且立即额外抽 1 张牌。",
    "starDesc": ["召唤持续 3 回合的冰精灵，以你 70% 速度行动，每次行动使你抽 1 张牌（灵力-1）。","召唤持续 3 回合的冰精灵，以你 85% 速度行动，每次行动使你抽 1 张牌（灵力-1）。","召唤持续 3 回合的冰精灵，以你 100% 速度行动，每次行动使你抽 1 张牌（灵力-1）。"],
    "atkRatio": [0,0,0],
  },
  "雷精灵": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌效果提升 15%。"},
    "skin": "leituanzi",
    "color": "#9370DB",
    "dmgType": "lightning",
    "rarity": "excellent",
    "num": 0,
    "isSummon": true,
    "maxCooldown": 0,
    "cost": 3,
    "limitPerTurn": 0,
    "actionGainRatio": [0.2,0.25,0.3],
    "atkBuffRatio": [0.15,0.2,0.25],
    "speedRatio": [0.6,0.7,0.8],
    "summonDuration": 3,
    "spineScale": 0.336,
    "desc": "召唤一个持续 3 回合的雷精灵，以你 60/70/80% 的速度行动，每次行动使你获得 20/25/30% 行动条并提升 15/20/25% 攻击力（以召唤时你基础攻击为基数，永久累加、不衰减）；雷精灵存在时你的雷属性伤害提升 15%。首次召唤消耗 3 灵力，场上已有雷精灵时再次召唤仅需 2 灵力，并刷新持续回合并强化（体型+8%、行动条+25%、速度+8%、增益效果+15%）。",
    "starDesc": ["召唤持续 3 回合的雷精灵，以你 60% 速度行动，每次行动使你获得 20% 行动条并提升 15% 攻击力。","召唤持续 3 回合的雷精灵，以你 70% 速度行动，每次行动使你获得 25% 行动条并提升 20% 攻击力。","召唤持续 3 回合的雷精灵，以你 80% 速度行动，每次行动使你获得 30% 行动条并提升 25% 攻击力。"],
    "atkRatio": [0,0,0],
  },
  "射击": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Shoot",
    "color": "#ff4757",
    "dmgType": "physical",
    "rarity": "common",
    "num": 0,
    "maxCooldown": 0,
    "cost": 0,
    "limitPerTurn": 0,
    "hitCount": 6,
    "fixedDmg": 0,
    "atkRatio": [0.14,0.18,0.22],
    "animDelay": 900,
    "desc": "朝敌人射击 6 次，每次造成 14/18/22% 攻击力的物理伤害。",
    "starDesc": ["朝敌人射击 6 次，每次造成 14% 攻击力物理伤害。","朝敌人射击 6 次，每次造成 18% 攻击力物理伤害。","朝敌人射击 6 次，每次造成 22% 攻击力物理伤害。"],
  },
  "激光": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Laser",
    "color": "#ffeb3b",
    "dmgType": "physical",
    "rarity": "excellent",
    "maxCooldown": 0,
    "cost": 3,
    "skillAnim": "attack1",
    "num": 0,
    "fixedDmg": 0,
    "atkRatio": [2,2.35,2.7],
    "animDelay": 500,
    "starEffects": {},
    "desc": "对所有敌人造成 200/235/270% 攻击力的物理伤害。",
  },
  "火球": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "huoqiu",
    "color": "#ff4500",
    "dmgType": "fire",
    "rarity": "excellent",
    "maxCooldown": 0,
    "cost": 0,
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "atkRatio": [1.3,1.55,1.8],
    "animDelay": 500,
    "starEffects": {"2":{"splashBoost":0.15},"3":{"splashBoost":0.25,"splashRatio":0.75}},
    "desc": "对指定目标造成 130/155/180% 攻击力的火属性伤害，并溅射相邻敌人（溅射 50% 伤害）。二星溅射+15%，三星溅射+25% 且主目标伤害降至 75%。",
    "starDesc": ["对指定目标造成 130% 攻击力火属性伤害，并溅射周围敌人。","对指定目标造成 155% 攻击力火属性伤害，并溅射周围敌人。","对指定目标造成 180% 攻击力火属性伤害，并溅射周围敌人。"],
  },
  "水弹": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "shuidan",
    "color": "#7EC8E3",
    "dmgType": "water",
    "rarity": "excellent",
    "maxCooldown": 0,
    "cost": 2,
    "num": 0,
    "fixedDmg": 0,
    "atkRatio": [0.9,1.1,1.3],
    "animDelay": 500,
    "starEffects": {"2":{"slowPct":0.1},"3":{"slowPct":0.2}},
    "desc": "对所有敌人造成 90/110/130% 攻击力的水属性伤害；二星起施加迟滞使目标速度降低 10%，三星降低 20%（不可叠加，刷新持续时间）。",
    "starDesc": ["对所有敌人造成 90% 攻击力水属性伤害。","对所有敌人造成 110% 攻击力水属性伤害。","对所有敌人造成 130% 攻击力水属性伤害。"],
  },
  "雷击": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "leiji",
    "color": "#7A42F5",
    "dmgType": "lightning",
    "rarity": "excellent",
    "maxCooldown": 0,
    "cost": 2,
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "atkRatio": [1.5,1.8,2.1],
    "animDelay": 150,
    "starEffects": {"1":{"pushbackPct":10},"2":{"pushbackPct":15},"3":{"pushbackPct":20}},
    "desc": "对指定敌人造成 150/180/210% 攻击力的电属性伤害，并降低目标 10/15/20% 行动条。",
    "starDesc": ["对指定敌人造成 150% 攻击力电属性伤害，并降低其 10% 行动条。","对指定敌人造成 180% 攻击力电属性伤害，并降低其 15% 行动条。","对指定敌人造成 210% 攻击力电属性伤害，并降低其 20% 行动条。"],
  },
  "冰箭": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "bingjian",
    "color": "#B8D4E3",
    "dmgType": "ice",
    "rarity": "excellent",
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "atkRatio": [1.5,1.8,2.1],
    "animDelay": 500,
    "starEffects": {"2":{"armorBreakPct":0.12},"3":{"armorBreakPct":0.16}},
    "desc": "对指定敌人造成 150/180/210% 攻击力的冰属性伤害；二星起击碎目标当前护甲 12%，三星击碎 16%。",
  },
  "瘴气": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Miasma",
    "color": "#2fca64",
    "dmgType": "poison",
    "rarity": "common",
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "atkRatio": [0.35,0.42,0.49],
    "animDelay": 500,
    "desc": "对指定敌人施加【瘴毒】持续 3 回合，敌人回合开始时受到 35/42/49% 攻击力的毒素伤害；重复施加刷新时长，每叠加一层伤害+50%。",
  },
  "影分身": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "ShadowClone",
    "color": "#7c3aed",
    "dmgType": "physical",
    "rarity": "excellent",
    "num": 0,
    "isSummon": true,
    "animDelay": 500,
    "cloneHpRatio": [0.25,0.29,0.33],
    "cloneAtkRatio": [0.5,0.55,0.6],
    "skillAnim": "qidao2",
    "starEffects": {"3":{"autoSummonAtStart":true}},
    "desc": "召唤拥有你 25/29/33% 最大生命、继承 50/55/60% 基础属性的影分身，替你承担 50% 伤害；三星时战斗开始自动召唤。",
  },
  "聚灵": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "SpiritGather",
    "color": "#10b981",
    "dmgType": "null",
    "rarity": "excellent",
    "maxCooldown": 0,
    "animDelay": 300,
    "initialCooldown": 0,
    "cost": 0,
    "num": 0,
    "manaRecover": [2,2,3],
    "atkBoostPct": [0.15,0.2,0.25],
    "skillAnim": "qidao2",
    "desc": "恢复 2/2/3 点灵力，并使本回合攻击力提升 15/20/25%。",
  },
  "诅咒": {
    "mastery": {"base":100,"type":"percentDmg","value":0,"desc":"诅咒卡"},
    "skin": "ShadowClone",
    "color": "#8B5CF6",
    "dmgType": "null",
    "rarity": "common",
    "maxCooldown": 0,
    "cost": 0,
    "num": 0,
    "animDelay": 200,
    "skillAnim": "qidao2",
    "canDraw": false,
    "desc": "诅咒卡。可以打出，会进入牌堆可重复抽到；无法卸下，离开地牢后清除。",
  },
  "反弹": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Reflect",
    "color": "#f59e0b",
    "dmgType": "null",
    "rarity": "excellent",
    "maxCooldown": 0,
    "cost": 2,
    "num": 0,
    "animDelay": 500,
    "reflectArmorPct": [0.2,0.25,0.3],
    "reflectBase": [0.45,0.5,0.55],
    "reflectArmor": [1.2,1.4,1.6],
    "skillAnim": "qidao2",
    "starEffects": {"2":{"dmgReduce":0.05},"3":{"dmgReduce":0.1}},
    "desc": "获得 2 回合【反弹】状态：护甲提升 20/25/30%，受到攻击时反弹 45/50/55% 折前伤害与 120/140/160% 当前护甲的物理伤害；二星起受到伤害-5%，三星-10%（不可叠加，刷新持续时间）。",
  },
  "武器强化": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "WeaponBoost",
    "color": "#fbbf24",
    "dmgType": "null",
    "rarity": "common",
    "maxCooldown": 0,
    "cost": 2,
    "num": 0,
    "animDelay": 500,
    "skillAnim": "qidao2",
    "atkRatio": [0.15,0.2,0.25],
    "desc": "使你的物理伤害提升 15/20/25%，持续到战斗结束，最多可强化 3 次。",
  },
  "洞察": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Insight",
    "color": "#ffffff",
    "dmgType": "null",
    "rarity": "common",
    "maxCooldown": 0,
    "cost": 2,
    "num": 0,
    "needTarget": true,
    "animDelay": 900,
    "skillAnim": "qidao2",
    "weaknessBase": [0.15,0.2,0.25],
    "weaknessPerStack": [0.06,0.08,0.1],
    "desc": "使指定敌人获得一层弱点（永久）：目标受到伤害提升 15/20/25%，每层弱点额外提升 6/8/10%，层数越多越痛。",
  },
  "毒雾": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "PoisonMist",
    "color": "#2fca64",
    "dmgType": "poison",
    "rarity": "rare",
    "num": 0,
    "animDelay": 500,
    "skillAnim": "jineng",
    "poisonTakenBoost": [0.3,0.4,0.5],
    "poisonDotRatio": [0.6,0.8,1],
    "starEffects": {"2":{"enemyAtkReduce":0.1},"3":{"enemyAtkReduce":0.15}},
    "desc": "令所有敌人永久中毒：毒素易伤提升 30/40/50%，敌人回合开始时受到 60/80/100% 攻击力的毒素伤害，并永久击碎 20% 护甲；二星起压制敌人攻击-10%，三星-15%。",
  },
  "未来": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Weilai",
    "color": "#9b59b6",
    "dmgType": "null",
    "rarity": "epic",
    "num": 0,
    "animDelay": 500,
    "skillAnim": "jineng",
    "starEffects": {"2":{"enemyPushbackPct":15},"3":{"enemyPushbackPct":30}},
    "desc": "回合结束后额外获得一个回合；二星起使用后击退全体敌人行动条 15%，三星击退 30%。",
  },
  "毒发": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Dufa",
    "color": "#27ae60",
    "dmgType": "poison",
    "rarity": "rare",
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "animDelay": 500,
    "atkRatio": [0.3,0.45,0.6],
    "dotRatio": [0.7,0.75,0.8],
    "starEffects": {"3":{"keepPoisonTurns":true}},
    "skillAnim": "qidao2",
    "desc": "对指定目标造成 30/45/60% 攻击力的毒属性伤害，并立即引爆其全部中毒效果（造成 70/75/80% 伤害）；三星时引爆不再削减中毒回合。",
  },
  "号令": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Haoling",
    "color": "#e67e22",
    "dmgType": "null",
    "rarity": "rare",
    "num": 0,
    "animDelay": 500,
    "allyActionBoost": [0.4,0.6,0.8],
    "allyAtkBoost": [0.25,0.3,0.35],
    "starEffects": {"3":{"costReduce":1}},
    "skillAnim": "qidao2",
    "desc": "使自己以外的所有友方单位行动条提升 40/60/80%，攻击力提升 25/30/35%（可叠加，持续到战斗结束）；三星时灵力消耗-1。",
  },
  "光佑": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Guangyou",
    "color": "#f1c40f",
    "dmgType": "null",
    "rarity": "rare",
    "num": 0,
    "animDelay": 500,
    "shieldRatio": [0.1,0.14,0.18],
    "skillAnim": "qidao1",
    "desc": "获得 10/14/18% 最大生命值的护盾，护盾可叠加。",
  },
  "水愈": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Shuiyu",
    "color": "#3498db",
    "dmgType": "null",
    "rarity": "excellent",
    "num": 0,
    "animDelay": 700,
    "healRatio": [0.05,0.08,0.11],
    "dotHealRatio": [0.025,0.03,0.035],
    "skillAnim": "qidao1",
    "desc": "立即恢复 5/8/11% 最大生命值，接下来 3 回合内自身回合开始时恢复 2.5/3/3.5% 最大生命值（持续恢复不可叠加、可刷新）。",
  },
  "魔力暴动": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "MoliBaodong",
    "color": "#8e44ad",
    "dmgType": "null",
    "rarity": "legendary",
    "num": 0,
    "animDelay": 500,
    "skillAnim": "jineng",
    "manaGain": [4,7,10],
    "desc": "立即获得 4/7/10 点灵力（可突破上限）。",
  },
  "水牢": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Shuilao",
    "color": "#2980b9",
    "dmgType": "water",
    "rarity": "epic",
    "num": 0,
    "animDelay": 950,
    "fixedDmg": 0,
    "skillAnim": "qidao2",
    "atkRatio": [1.6,2.2,2.8],
    "pushbackPct": [50,75,100],
    "desc": "对所有敌人造成 160/220/280% 攻击力的水属性伤害，并击退其行动条 50/75/100%。",
  },
  "风刃": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Fengren",
    "color": "#1abc9c",
    "dmgType": "wind",
    "rarity": "rare",
    "num": 0,
    "skillAnim": "attack1",
    "fixedDmg": 0,
    "atkRatio": [0.5,0.6,0.7],
    "hitCount": 3,
    "desc": "对最近的敌人造成 3 段 50/60/70% 攻击力的风属性伤害；每段击退目标行动条 2%，并有 50% 概率附加流血。",
  },
  "龙卷风暴": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "LongjuanFengbao",
    "color": "#16a085",
    "dmgType": "wind",
    "rarity": "epic",
    "num": 0,
    "fixedDmg": 0,
    "skillAnim": "attack1",
    "atkRatio": [0.3,0.35,0.4],
    "hitCount": [5,6,7],
    "desc": "对所有敌人造成 5/6/7 段 30/35/40% 攻击力的风属性伤害；每段击退敌人行动条 2%，并有 50% 概率附加流血。",
    "starDesc": ["对所有敌人造成 30% 风属性伤害，重复 5 次。","对所有敌人造成 35% 风属性伤害，重复 6 次。","对所有敌人造成 40% 风属性伤害，重复 7 次。"],
  },
  "风之庇佑": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "FengZhiBiyou",
    "color": "#2ecc71",
    "dmgType": "null",
    "rarity": "epic",
    "num": 0,
    "skillAnim": "qidao1",
    "initialCooldown": 0,
    "animDelay": 500,
    "speedBoostPct": [0.25,0.35,0.45],
    "shootBoostPct": [0.04,0.05,0.06],
    "desc": "提升自身速度 25/35/45% 持续 3 回合，期间射击伤害转为风属性并提升 4/5/6% 攻击力/发（重复触发刷新持续时间）。",
  },
  "禁忌狂雷": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "JinjiKuanglei",
    "color": "#f39c12",
    "dmgType": "lightning",
    "rarity": "legendary",
    "maxCooldown": 0,
    "cost": 0,
    "num": 0,
    "skillAnim": "jineng",
    "initialCooldown": 0,
    "fixedDmg": 0,
    "atkRatio": [0.6,0.7,0.8],
    "hitCount": [8,10,12],
    "desc": "对随机敌人落下 8/10/12 道闪电，每段造成 60/70/80% 攻击力的电属性伤害，后续每段伤害递增 5%。",
  },
  "焚焰": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Fenyan",
    "color": "#e74c3c",
    "dmgType": "fire",
    "rarity": "excellent",
    "maxCooldown": 0,
    "cost": 2,
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "atkRatio": [1.5,1.8,2.1],
    "starEffects": {"3":{"killRefundMana":1}},
    "desc": "对指定敌人造成 150/180/210% 攻击力的火属性伤害；三星时击杀目标返还 1 点灵力。",
  },
  "回旋风刃": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Fengren1",
    "color": "#1abc9c",
    "dmgType": "wind",
    "rarity": "excellent",
    "num": 0,
    "fixedDmg": 0,
    "skillAnim": "attack",
    "atkRatio": [0.7,0.95,1.2],
    "hitCount": 2,
    "hitInterval": 200,
    "falloffPct": 0.15,
    "desc": "对所有敌人来回攻击 2 次，每次造成 70/95/120% 攻击力的风属性伤害；每命中 1 名敌人伤害降低 15%，风刃回旋后衰减重置。",
    "animDelay": 600,
  },
  "狙击": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Shoot1",
    "color": "#ff6b81",
    "dmgType": "physical",
    "rarity": "epic",
    "num": 0,
    "fixedDmg": 0,
    "skillAnim": "attack",
    "atkRatio": [2.4,3,3.6],
    "highHpBoostPct": 0.25,
    "highHpThreshold": 0.9,
    "desc": "对最远的敌人造成 240/300/360% 攻击力的物理伤害；若目标生命值高于 90%，伤害额外提升 25%。",
    "animDelay": 600,
  },
  "碎甲弹": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Shoot2",
    "color": "#c0c4cc",
    "dmgType": "physical",
    "rarity": "common",
    "skillAnim": "attack",
    "num": 0,
    "fixedDmg": 0,
    "atkRatio": [1.5,2,2.5],
    "armorShredPct": 0.25,
    "armorShredDuration": 2,
    "desc": "对最近的敌人造成 150/200/250% 攻击力的物理伤害，并击碎其 25% 护甲持续 2 回合（重复触发刷新持续时间）。",
    "animDelay": 600,
  },
  "毒刺": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Duci",
    "color": "#27ae60",
    "dmgType": "poison",
    "rarity": "excellent",
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "skillAnim": "attack",
    "atkRatio": [0.9,1.25,1.6],
    "poisonBoostPct": 0.4,
    "desc": "对指定敌人造成 90/125/160% 攻击力的毒属性伤害；目标身上每有一种毒素，伤害提升 40%。",
    "animDelay": 1000,
  },
  "流火": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "liuhuo",
    "color": "#ff4500",
    "dmgType": "fire",
    "rarity": "epic",
    "num": 0,
    "skillAnim": "attack",
    "fixedDmg": 0,
    "atkRatio": [0.5,0.65,0.8],
    "hitCount": 4,
    "burnBoostPct": 0.2,
    "desc": "随机攻击敌人 4 次，每次造成 50/65/80% 攻击力的火属性伤害；攻击带有灼烧的敌人伤害提升 20%。",
    "animDelay": 600,
  },
  "冰寒": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "Binghan",
    "color": "#B8D4E3",
    "dmgType": "ice",
    "rarity": "common",
    "num": 0,
    "needTarget": true,
    "fixedDmg": 0,
    "skillAnim": "qidao2",
    "slowPct": [0.35,0.425,0.5],
    "slowDuration": 2,
    "atkRatio": [1.25,1.75,2.25],
    "desc": "使指定敌人的速度降低 35/42.5/50% 持续 2 回合；若敌人被冻结，额外造成 125/175/225% 攻击力的冰属性伤害。",
    "animDelay": 600,
  },
  "连锁闪电": {
    "mastery": {"base":100,"type":"percentDmg","value":15,"desc":"熟练度每提升一级，卡牌伤害提升 15%。"},
    "skin": "LSshandian",
    "color": "#7A42F5",
    "dmgType": "lightning",
    "rarity": "common",
    "maxCooldown": 0,
    "cost": 0,
    "num": 0,
    "fixedDmg": 0,
    "skillAnim": "attack",
    "atkRatio": [0.9,1.2,1.5],
    "chainCount": 1,
    "desc": "对最近的敌人造成 90/120/150% 攻击力的电属性伤害，随后电链额外随机弹射 1 次（不回弹主目标）。",
    "animDelay": 600,
  },
};

// 🃏 初始卡组（新游戏开局时玩家的当前卡组；dladmin「初始卡组」Tab 可编辑）
//    卡名数组，可含重复（重复 = 多副本，战斗抽牌堆中对应多张）
export const INITIAL_DECK = [
"水精灵",
  "雷精灵",
  "射击",
  "狙击",
  "碎甲弹"
];

// 🎭 开局角色初始配置（dladmin「角色初始」Tab 可编辑；startNewGame 按所选角色套用）
//    deck=初始卡组（卡名数组） / attrs=初始属性（力量/智慧/元素精通/魅力 + 基础攻速甲抗）
//    talentPoints=初始天赋点 / freeAttrPoints=初始自由属性点
export const ROLE_INIT_CONFIGS = {
  linen: {
    name: "林恩",
    desc: "天命者 · 主角",
    deck: ["射击", "碎甲弹", "激光", "火球", "冰箭"],
    attrs: { strength: 5, intelligence: 5, elementMastery: 0, charm: 5, baseMaxHp: 100, baseAttack: 250, baseSpeed: 90, baseArmor: 10, baseMagicResist: 10 },
    talentPoints: 50,
    freeAttrPoints: 5,
    unlocked: true,
  },
  jinmao: {
    name: "晨曦",
    desc: "晨曦 · 金毛",
    deck: ["射击", "碎甲弹", "狙击", "武器强化"],
    attrs: { strength: 2, intelligence: 0, elementMastery: 0, charm: 0, baseMaxHp: 80, baseAttack: 12, baseSpeed: 95, baseArmor: 12, baseMagicResist: 8 },
    talentPoints: 6,
    freeAttrPoints: 5,
    unlocked: false,
  },
  yu: {
    name: "云弥",
    desc: "云弥 · 鱼",
    deck: ["激光", "狙击", "武器强化", "射击"],
    attrs: { strength: 0, intelligence: 3, elementMastery: 2, charm: 0, baseMaxHp: 60, baseAttack: 10, baseSpeed: 85, baseArmor: 8, baseMagicResist: 12 },
    talentPoints: 6,
    freeAttrPoints: 5,
    unlocked: false,
  },
  huli: {
    name: "西亚",
    desc: "西亚 · 狐狸",
    deck: ["激光", "武器强化", "射击", "狙击"],
    attrs: { strength: 0, intelligence: 1, elementMastery: 1, charm: 3, baseMaxHp: 70, baseAttack: 10, baseSpeed: 92, baseArmor: 10, baseMagicResist: 10 },
    talentPoints: 6,
    freeAttrPoints: 5,
    unlocked: false,
  },
};


export const DEFAULT_npcSelectList = [
  {
    img: "tuzi",
    name: "黑米",
    unlocked: false, // 🔒 剧情解锁角色：未入队前人物图鉴灰色锁定；入队时 addAllyToDisplay 自动置 true
    affection: 0,
    avatarScale: 1.1, // 头像缩放比例
    canAlly: true,  // 是否可携带出战（默认 true）
    defaultAlly: false, // 🐛 不在同伴查看中默认展示（黑米是后续剧情解锁的角色，入队时用 addAllyToDisplay('tuzi') 动态加入）
  },
  {
    img: "huli",
    name: "西亚",
    affection: 0,
    avatarScale: 1.15, // 头像缩放比例
    canAlly: true,
  },
  {
    img: "jinmao",
    name: "晨曦",
    affection: 0,
    avatarScale: 0.95, // 头像缩放比例
    canAlly: true,
  },
  {
    img: "yu",
    name: "云弥",
    affection: 0,
    avatarScale: 0.95, // 头像缩放比例
    canAlly: true,
  },
]

export const NPC_NAME_COLORS = {
  linen: '#c084fc',  // 林恩 · 紫藤
  tuzi: '#a855f7',   // 黑米 · 紫
  huli: '#f97316',   // 西亚 · 橙
  jinmao: '#eab308', // 晨曦 · 金
  yu: '#06b6d4',     // 云弥 · 青
};

export const AFFECTION_BONUS_TIERS = [
  { threshold: 100, attackPct: 0.20, speedPct: 0.10 },
  { threshold: 50, attackPct: 0.10, speedPct: 0.05 },
]

export const ITEM_DEFS = {
  "赤莓": { status: "material", color: "#ff6b81", img: "chimei", miaoshu: "甘甜赤红的饱满莓果，蕴含充沛的活性养分，制作材料。" },
  "翠息草": { status: "material", color: "#67C23A", img: "cuixicao", miaoshu: "蕴含生机的翠绿草叶，是制作与炼制的基础材料。" },
  "风萤果": { status: "material", color: "#fbbf24", img: "fengyingguo", miaoshu: "轻盈如风、莹光流转的果实，制作材料。" },
  "魔力灵液": { status: "material", color: "#67C23A", img: "moliye", miaoshu: "蕴含精纯魔力的灵液，是炼制与制作的核心材料。" },
  "怒之晶石": { status: "material", color: "#F56C6C", img: "nushi", miaoshu: "蕴含狂暴怒意的红色晶石，制作材料。" },
  "暗之晶石": { status: "material", color: "#909399", img: "anshi", miaoshu: "蕴含幽暗能量的黑色晶石，制作材料。" },
  "雷之晶石": { status: "material", color: "#fbbf24", img: "leishi", miaoshu: "蕴含雷电之力的晶石，制作材料。" },
  "幽冥花蕊": { status: "material", shiyong: true, special: "permAtkFlower", effectValue: 1, maxUses: 3, color: "#a78bfa", img: "youminghua", miaoshu: "幽冥之花的花蕊，稀有的炼制材料。可直接食用，永久提升 ${effectValue} 点基础攻击力（最多 ${maxUses} 次），不可投喂。" },
  "玫瑰果": { status: "material", color: "#f472b6", img: "meiguiguo", miaoshu: "玫红饱满的野果，花香馥郁，是制作与炼制的基础材料。" },
  "未知钥匙": { status: "special", isSpecial: true, color: "#fbbf24", img: "yaoshi1", miaoshu: "一把来历不明的神秘钥匙，或许能打开某些被锁住的门扉。" },
  "幸运戒指": { isItem: true, buffs: {"luck":15}, color: "#FBBF24", img: "jiezhi1", miaoshu: "莫奇赠予的珍贵戒指，是它向帮助你的人所能拿出最诚挚的谢意。佩戴后基础幸运 +${buffs.luck}。" },
  "晶石项链": { isItem: true, buffs: {"charm":5}, color: "#E6A23C", img: "xianglian1", miaoshu: "镶嵌晶石的精致项链，蕴含温柔的亲和力。佩戴后魅力 +${buffs.charm}。" },
  "幽暗手套": { isItem: true, buffs: { attackPct: 0.05 }, fx: { atkPct: 0.05, hpCostPct: 0.04, boostPct: 0.2 }, color: "#8B5CF6", img: "youanshoutao", miaoshu: "缠绕暗影之力的手套。佩戴后进入战斗攻击力+5%。战斗效果：使用攻击牌时，消耗4%当前生命值（视为受击，会触发受击效果），使该攻击牌增伤20%。" },
  "精灵王冠": { isItem: true, buffs: { charm: 15 }, fx: { allAttrPct: 0.25 }, color: "#fbbf24", img: "jinglingwangguan", miaoshu: "精灵之王的冠冕，蕴藏自然的祝福。佩戴后魅力 +${buffs.charm}。战斗效果：场上同时存在水/冰/火/雷精灵时，你的全属性提升25%，持续至任意精灵退场；再次集齐四精灵后重新获得加成。" },
  "怒焰斗篷": { isItem: true, fx: { fireDmgPct: 0.35 }, color: "#F56C6C", img: "nuyandoupeng", miaoshu: "燃烧着怒焰的斗篷。佩戴后进入战斗效果：你的火属性伤害提升35%。" },
  "雷电勋章": { isItem: true, fx: { basePct: 0.15, speedScale: 0.15 }, color: "#E6A23C", img: "leidianxunzhang", miaoshu: "萦绕着雷光的勋章。佩戴后进入战斗效果：你的雷属性伤害提升(15+15%速度)%，速度越高加成越高。" },
  "月露草": { status: "material", color: "#dff0ff", img: "yuelucao", miaoshu: "沐浴月光而生的露草，稀有的炼制材料。" },
  "忆尘晶": { status: "material", color: "#E6A23C", img: "yichenjing", miaoshu: "承载记忆之尘的水晶，稀有的炼制材料。" },
  "恢复药剂": { shiyong: true, isItem: true, Hp: 20, color: "#67C23A", img: "huifuyaoji", miaoshu: "饮用后恢复 ${Hp} 点生命值。" },
  "疾行药剂": { shiyong: true, isItem: true, special: "dungeonSpeed", effectValue: 25, color: "#5cc0ff", img: "jixingyaoji", miaoshu: "下一次地牢中移动速度提升 ${effectValue}%，可在地牢中使用。" },
  "焚力永浆": { shiyong: true, isItem: true, special: "permAttack", giveNpc: true, effectValue: 2, maxUses: 30, color: "#F56C6C", img: "fenliyongjiang", miaoshu: "永久提升基础攻击力 ${effectValue} 点（最多 ${maxUses} 次），可给予 NPC 使用。" },
  "幽铠永浆": { shiyong: true, isItem: true, special: "permArmor", giveNpc: true, effectValue: 1, maxUses: 30, color: "#409EFF", img: "youkaiyongjiang", miaoshu: "永久提升基础护甲 ${effectValue} 点（最多 ${maxUses} 次），可给予 NPC 使用。" },
  "迅霆永浆": { shiyong: true, isItem: true, special: "permSpeed", giveNpc: true, effectValue: 1, maxUses: 30, color: "#5cc0ff", img: "xuntingyongjiang", miaoshu: "永久提升基础速度 ${effectValue} 点（最多 ${maxUses} 次），可给予 NPC 使用。" },
  "启明灵剂": { shiyong: true, isItem: true, special: "talentPoint", effectValue: 1, maxUses: 3, color: "#a78bfa", img: "qiminglingji", miaoshu: "服用后天赋点 +${effectValue}（最多 ${maxUses} 次）。" },
  "明目药剂": { shiyong: true, isItem: true, special: "dungeonVision", effectValue: 1, color: "#38bdf8", img: "mingmuyaoji", miaoshu: "下一次地牢探索可见度 +${effectValue} 格，可在地牢中使用。" },
  "芬芳药剂": { shiyong: true, isItem: true, special: "permCharm", effectValue: 2, maxUses: 3, color: "#f472b6", img: "fenfangyaoji", miaoshu: "服用后永久提升 ${effectValue} 点魅力（最多 ${maxUses} 次）。" },
  "盈悟灵浆": { shiyong: true, isItem: true, special: "expGain", effectValue: 3, maxUses: 30, maxTotal: 90, color: "#E6A23C", img: "yingwulingjiang", miaoshu: "永久提升 ${effectValue}% 经验获取（最多 ${maxUses} 次，叠加上限 ${maxTotal}%）。" },
  "生命灵药": { shiyong: true, isItem: true, special: "permHp", effectValue: 40, maxUses: 1, color: "#67C23A", img: "shengminglingyao", miaoshu: "永久提升基础生命值 ${effectValue} 点（仅限 ${maxUses} 次）。" },
  "魔力灵药": { shiyong: true, isItem: true, special: "permMana", effectValue: 1, maxUses: 3, color: "#409EFF", img: "molilingyao", miaoshu: "永久提升 ${effectValue} 点最大魔力（最多 ${maxUses} 次）。" },
  "魔晶LV7": { status: "material", food: true, eatExp: 1500, feedExp: 1500, color: "#fbbf24", img: "redCrystalT7", miaoshu: "品质 ${quality} 的顶级红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。" },
  "魔晶LV1": { status: "material", food: true, eatExp: 25, feedExp: 25, color: "#9ca3af", img: "redCrystalT1", miaoshu: "品质 ${quality} 的红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。" },
  "幸运草": { bType: "booster", btBoost: {"1":15,"2":10,"3":5}, color: "#67C23A", img: "xingyuncao", miaoshu: "幸运的四叶草，投入可提升突破成功率 +${btBoost.1}%。" },
};

export const FEEDABLE_ITEMS = {
  '魔晶LV1': 25,   // 🔴 品质1
  '魔晶LV2': 75,   // 🔴 品质2
  '魔晶LV3': 150,   // 🔴 品质3
  '魔晶LV4': 300,   // 🔴 品质4
  '魔晶LV5': 600,  // 🔴 品质5
  '魔晶LV6': 1000,  // 🔴 品质6
  '魔晶LV7': 1500,  // 🔴 品质7
}

export const FEED_AFFECTION_GAIN = {
  '魔晶LV1': 1,
  '魔晶LV2': 1,
  '魔晶LV3': 1,
  '魔晶LV4': 1,
  '魔晶LV5': 1,
  '魔晶LV6': 1,
  '魔晶LV7': 1,
}

export const FOOD_ITEMS = {
  '魔晶LV1': 10,
  '魔晶LV2': 25,
  '魔晶LV3': 50,
  '魔晶LV4': 90,
  '魔晶LV5': 140,
  '魔晶LV6': 200,
  '魔晶LV7': 280,
}

// ========================
// 📈 同伴等级上限（投喂升级用）
// 后续版本调整等级上限只需改这里（读档自动生效）
// ========================

export const MAX_ALLY_LEVEL = 30;

// ========================
// 📈 玩家等级上限（经验升级用）
// 后续版本解锁等级上限只需改这里（读档自动生效）
// ⚠️ 满级后溢出的经验不累积（直接丢失），解锁上限后从满级继续升级
// ========================

export const MAX_PLAYER_LEVEL = 30;

// ========================
// 💎 等级突破系统配置（每 10/20/30 级突破，消耗魔晶）
// ========================
// 各阶段：目标等级 / 基础成功率 / 可用魔晶最高品质 / 基础属性奖励 / 天赋点 / 品质收益倍率

export const BREAKTHROUGH_STAGES = {
  1: { level: 10, baseRate: 0.5, attr: { maxHp: 25, attack: 6, armor: 3, speed: 2 } },
  2: { level: 20, baseRate: 0.3, attr: { maxHp: 50, attack: 12, armor: 6, speed: 4 } },
  3: { level: 30, baseRate: 0.2, attr: { maxHp: 80, attack: 18, armor: 9, speed: 6 } },
};

// 💎 全局品质属性倍率（不分阶段，一破也可用品质7）：突破后属性提升 = 阶段属性 × 品质倍率（向下取整）
export const BREAKTHROUGH_QUALITY_BONUS = {
  1: 1,
  2: 1.5,
  3: 2,
  4: 2.5,
  5: 3,
  6: 3.5,
  7: 4,
};

// 品质惩罚（乘算：实际成功率 = 基础率 × (1 − 惩罚)，品质越高成功率越低，不再做绝对值减法）
export const BREAKTHROUGH_QUALITY_PENALTY = {
  1: 0,
  2: 0.15,
  3: 0.3,
  4: 0.4,
  5: 0.5,
  6: 0.58,
  7: 0.65,
};

export const BREAKTHROUGH_LUCK_BONUS_PER = 0;

export const BREAKTHROUGH_FAIL_COMPENSATION = {
  1: 0.02,
  2: 0.03,
  3: 0.05,
  4: 0.07,
  5: 0.1,
  6: 0.14,
  7: 0.2,
};

export const BREAKTHROUGH_COMPENSATION_CAP = 0.40;

export const BREAKTHROUGH_BOOSTER_BONUS = {
  // 特殊材料成功率加成（按突破阶段递减：一破/二破/三破）
  '幸运草': { 1: 0.15, 2: 0.10, 3: 0.05 },
  '突破神石': { 1: 0.2, 2: 0.15, 3: 0.10 },
  '秘纹水晶': { 1: 0.25, 2: 0.20, 3: 0.15 },
};

export const CRYSTAL_QUALITY = { '魔力晶核': 3, '魔晶LV1': 1, '魔晶LV2': 2, '魔晶LV3': 3, '魔晶LV4': 4, '魔晶LV5': 5, '魔晶LV6': 6, '魔晶LV7': 7 };

export const BREAKTHROUGH_PASSIVES = [
  { id: 'bt_reduce', name: '铜墙铁壁', desc: '受到伤害降低 10%', type: 'reduce', value: 0.1 },
  { id: 'bt_boost', name: '势如破竹', desc: '最终伤害提升 10%', type: 'boost', value: 0.1 },
  { id: 'bt_atk', name: '狂暴', desc: '攻击力 +15', type: 'attack', value: 15 },
  { id: 'bt_armor', name: '磐石', desc: '护甲 +10', type: 'armor', value: 10 },
  { id: 'bt_speed', name: '疾风', desc: '速度 +15', type: 'speed', value: 15 },
  { id: 'bt_hp', name: '生生不息', desc: '最大生命 +100', type: 'hp', value: 100 },
];

// ========================
// ⚗️ 炼制图鉴配置（LIANZHI_RECIPES）
// 大锅最多放 4 种材料 → 匹配配方：
//   - 匹配成功 → 消耗材料 + 产出对应物品 + 解锁该配方（第一次）
//   - 匹配失败 → 材料消失（炼制失败）
// 配方初始是「未知」的，第一次炼制成功后才会在右上角「配方」中解锁显示。
// 每个配方：
//   id: 唯一标识
//   name: 成品名
//   desc: 成品说明
//   icon: 成品图标（assets/daoju 下的 webp 文件名）
//   color: 成品品质色
//   materials: [{ name }] 所需材料（无序，与玩家放入顺序无关）
//   output: { name, num, img, miaoshu, isItem/shiyong/Hp/moli 等 } 产出道具（字段与背包 inventory 一致）
// ========================
// ⚗️ 炼制等级配置（dladmin「物品编辑 → 炼制」可修改）

export const LIANZHI_LEVEL_CFG = {
  // 最大等级：达到后熟练度溢出丢弃（不再累积）
  maxLevel: 3,
  // 等级表：levels[i] = Lv.(i+2) 的配置。need = 升到本级所需熟练度；reduce = 本级失败率减免（Lv.1 减免 0）
  levels: [
    { need: 100, reduce: 0.02 },
    { need: 300, reduce: 0.02 },
  ],
};

export const LIANZHI_RECIPES = [
  {
    id: "qiming_lingji",
    name: "启明灵剂",
    desc: "魔力灵液与幽冥花蕊交融的珍稀灵剂，服用后天赋点 +1（上限 3 次）。20% 概率炼制失败。",
    color: "#a78bfa",
    materials: [{ name: "魔力灵液" }, { name: "幽冥花蕊" }],
    failRate: 0.2,
    proficiencyGain: 15,
    results: [{ chance: 1, output: { name: "启明灵剂", num: 1, miaoshu: "服用后天赋点 +1（上限 3 次）。", isItem: true, shiyong: true, special: "talentPoint", color: "#a78bfa" } }],
  },
  {
    id: "yuelu_moli",
    name: "翠息月露",
    desc: "翠息草与月露草在月光下凝结，50% 概率凝出魔力灵液，50% 概率炼制失败。",
    color: "#67C23A",
    materials: [{ name: "翠息草" }, { name: "月露草" }],
    failRate: 0.5,
    proficiencyGain: 8,
    results: [{ chance: 1, output: { name: "魔力灵液", num: 1, status: "material", color: "#67C23A" } }],
  },
  {
    id: "yingwu_lingjiang",
    name: "盈悟灵浆",
    desc: "忆尘晶承载的灵浆，服用后永久提升 3% 经验获取（最多 30 次，叠加上限 90%）。20% 概率炼制失败。",
    color: "#E6A23C",
    materials: [{ name: "忆尘晶" }, { name: "魔力灵液" }],
    failRate: 0.2,
    proficiencyGain: 12,
    results: [{ chance: 1, output: { name: "盈悟灵浆", num: 1, miaoshu: "永久提升 3% 经验获取（最多 30 次，叠加上限 90%）。", isItem: true, shiyong: true, special: "expGain", color: "#E6A23C" } }],
  },
  {
    id: "sanjing_lingyao",
    name: "三晶灵药",
    desc: "暗之晶石、雷之晶石与怒之晶石共鸣的灵药：45% 炼出生命灵药、45% 炼出魔力灵药、10% 炼制失败。",
    color: "#F56C6C",
    materials: [{ name: "暗之晶石" }, { name: "雷之晶石" }, { name: "怒之晶石" }],
    failRate: 0.1,
    proficiencyGain: 20,
    results: [{ chance: 0.5, output: { name: "生命灵药", num: 1, miaoshu: "永久提升基础生命值 40 点（仅限 1 次）。", isItem: true, shiyong: true, special: "permHp", color: "#67C23A" } }, { chance: 0.5, output: { name: "魔力灵药", num: 1, miaoshu: "永久提升 1 点最大魔力（最多 3 次）。", isItem: true, shiyong: true, special: "permMana", color: "#409EFF" } }],
  },
  {
    id: "fenfang_yaoji",
    name: "芬芳药剂",
    desc: "玫瑰果的馥郁与幽冥花蕊的幽香交融，服用后永久提升 2 点魅力（上限 3 次）。20% 概率炼制失败。",
    color: "#f472b6",
    materials: [{ name: "玫瑰果" }, { name: "幽冥花蕊" }],
    failRate: 0.2,
    proficiencyGain: 10,
    results: [{ chance: 1, output: { name: "芬芳药剂", num: 1, miaoshu: "服用后永久提升 ${effectValue} 点魅力（最多 ${maxUses} 次）。", isItem: true, shiyong: true, special: "permCharm", effectValue: 2, maxUses: 3, color: "#f472b6" } }],
  },
  {
    id: "jinglian_mojing4",
    name: "精炼魔晶·IV",
    desc: "三枚三阶魔晶在忆尘晶的引导下升华，40% 概率凝成四阶魔晶。",
    color: "#E6A23C",
    materials: [{ name: "魔晶LV3", num: 3 }, { name: "忆尘晶", num: 1 }],
    failRate: 0.6,
    proficiencyGain: 16,
    results: [{ chance: 1, output: { name: "魔晶LV4", num: 1, status: "material", color: "#E6A23C" } }],
  },
  {
    id: "huayan_lingji",
    name: "花焰灵剂",
    desc: "幽冥花蕊的幽火点燃怒之晶石，60% 概率炼出焚力永浆。",
    color: "#F56C6C",
    materials: [{ name: "幽冥花蕊", num: 1 }, { name: "怒之晶石", num: 1 }],
    failRate: 0.4,
    proficiencyGain: 14,
    results: [{ chance: 1, output: { name: "焚力永浆", num: 1, miaoshu: "永久提升基础攻击力 2 点（最多 30 次），可给予 NPC 使用。", isItem: true, shiyong: true, special: "permAttack", giveNpc: true, color: "#F56C6C" } }],
  },
  {
    id: "yueying_yaoji",
    name: "月影药剂",
    desc: "月露草的月光清辉浸润双目，50% 概率炼出明目药剂。",
    color: "#38bdf8",
    materials: [{ name: "月露草", num: 1 }, { name: "翠息草", num: 2 }],
    failRate: 0.5,
    proficiencyGain: 10,
    results: [{ chance: 1, output: { name: "明目药剂", num: 1, miaoshu: "下一次地牢探索可见度 +1 格。", isItem: true, shiyong: true, special: "dungeonVision", effectValue: 1, color: "#38bdf8" } }],
  },
  {
    id: "guolu_ningye",
    name: "果露凝液",
    desc: "玫瑰果的馥郁汁液凝入月露草，60% 概率炼出双份魔力灵液。",
    color: "#67C23A",
    materials: [{ name: "玫瑰果", num: 2 }, { name: "月露草", num: 1 }],
    failRate: 0.4,
    proficiencyGain: 9,
    results: [{ chance: 1, output: { name: "魔力灵液", num: 2, status: "material", color: "#67C23A" } }],
  },];
// ========================
// 🧪 合成工坊图纸配置// 🧪 合成工坊图纸配置（CRAFT_RECIPES）
// 后续新增/删除/修改合成图纸只需改这里（读档自动生效，与炼制图鉴同一套同步机制）。
// 每个图纸：
//   id: 唯一标识
//   craftTime: 每件制作耗时（秒，合成工坊读取；未配置默认 2 秒）
//   name: 图纸名
//   category: 大类（如 药水/符咒/装备）
//   subcategory: 小类（如 生命恢复/灵力恢复）
//   desc: 说明
//   materials: [{ name, num, img }] 所需材料
//   output: { name, num, img, miaoshu, isItem, shiyong, Hp, ... } 产出道具（字段与背包 inventory 一致）
// ========================

export const CRAFT_RECIPES = [
  {
    id: "huifu_yaoji",
    craftTime: 2,
    name: "恢复药剂",
    category: "药水",
    subcategory: "生命恢复",
    desc: "赤莓与翠息草调和而成，饮用后恢复 20 点生命值。",
    materials: [{ name: "赤莓", num: 1, img: "chimei" }, { name: "翠息草", num: 1, img: "cuixicao" }],
    output: { name: "恢复药剂", num: 1, img: "huifuyaoji", miaoshu: "恢复 20 点生命值。", isItem: true, shiyong: true, Hp: 20, color: "#67C23A" },
  },
  {
    id: "jixing_yaoji",
    craftTime: 3,
    name: "疾行药剂",
    category: "药水",
    subcategory: "增益",
    desc: "风萤果的轻盈与翠息草的清新融合，下一次地牢中移动速度提升 25%，可在地牢中使用。",
    materials: [{ name: "风萤果", num: 1, img: "fengyingguo" }, { name: "翠息草", num: 1, img: "cuixicao" }],
    output: { name: "疾行药剂", num: 1, img: "jixingyaoji", miaoshu: "下一次地牢中移动速度 +25%，可在地牢中使用。", isItem: true, shiyong: true, special: "dungeonSpeed", color: "#5cc0ff" },
  },
  {
    id: "fenli_yongjiang",
    craftTime: 5,
    name: "焚力永浆",
    category: "永浆",
    subcategory: "永久强化",
    desc: "魔力灵液激怒之晶石的狂暴，永久提升基础攻击力 2 点（最多 30 次），可给予 NPC 使用。",
    materials: [{ name: "魔力灵液", num: 1, img: "moliye" }, { name: "怒之晶石", num: 1, img: "nushi" }],
    output: { name: "焚力永浆", num: 1, img: "fenliyongjiang", miaoshu: "永久提升基础攻击力 2 点（最多 30 次），可给予 NPC 使用。", isItem: true, shiyong: true, special: "permAttack", giveNpc: true, color: "#F56C6C" },
  },
  {
    id: "youkai_yongjiang",
    craftTime: 5,
    name: "幽铠永浆",
    category: "永浆",
    subcategory: "永久强化",
    desc: "魔力灵液融合暗之晶石的坚韧，永久提升基础护甲 1 点（最多 30 次），可给予 NPC 使用。",
    materials: [{ name: "魔力灵液", num: 1, img: "moliye" }, { name: "暗之晶石", num: 1, img: "anshi" }],
    output: { name: "幽铠永浆", num: 1, img: "youkaiyongjiang", miaoshu: "永久提升基础护甲 1 点（最多 30 次），可给予 NPC 使用。", isItem: true, shiyong: true, special: "permArmor", giveNpc: true, color: "#409EFF" },
  },
  {
    id: "xunting_yongjiang",
    craftTime: 5,
    name: "迅霆永浆",
    category: "永浆",
    subcategory: "永久强化",
    desc: "魔力灵液引动雷之晶石的迅捷，永久提升基础速度 1 点（最多 30 次），可给予 NPC 使用。",
    materials: [{ name: "魔力灵液", num: 1, img: "moliye" }, { name: "雷之晶石", num: 1, img: "leishi" }],
    output: { name: "迅霆永浆", num: 1, img: "xuntingyongjiang", miaoshu: "永久提升基础速度 1 点（最多 30 次），可给予 NPC 使用。", isItem: true, shiyong: true, special: "permSpeed", giveNpc: true, color: "#5cc0ff" },
  },
  {
    id: "mingmu_yaoji",
    craftTime: 2,
    name: "明目药剂",
    category: "药水",
    subcategory: "增益",
    desc: "翠息草与玫瑰果的芬芳融合风萤果的轻盈，下一次地牢探索可见度提升 1 格。",
    materials: [{ name: "翠息草", num: 1, img: "cuixicao" }, { name: "玫瑰果", num: 1, img: "meiguiguo" }, { name: "风萤果", num: 1, img: "fengyingguo" }],
    output: { name: "明目药剂", num: 1, img: "mingmuyaoji", miaoshu: "下一次地牢探索可见度 +1 格。", isItem: true, shiyong: true, special: "dungeonVision", effectValue: 1, color: "#38bdf8" },
  },
  {
    id: "huifu_yaoji2",
    craftTime: 2,
    name: "恢复药剂",
    category: "药水",
    subcategory: "生命恢复",
    desc: "赤莓的酸甜与翠息草的清冽调和，双份赤莓让药效更浓郁。",
    materials: [{ name: "赤莓", num: 2, img: "chimei" }, { name: "翠息草", num: 1, img: "cuixicao" }],
    output: { name: "恢复药剂", num: 1, img: "huifuyaoji", miaoshu: "恢复 20 点生命值。", isItem: true, shiyong: true, Hp: 20, color: "#67C23A" },
  },
  {
    id: "jixing_yaoji2",
    craftTime: 3,
    name: "疾行药剂",
    category: "药水",
    subcategory: "增益",
    desc: "双份风萤果的轻盈叠加赤莓的活力，风驰电掣。",
    materials: [{ name: "风萤果", num: 2, img: "fengyingguo" }, { name: "赤莓", num: 1, img: "chimei" }],
    output: { name: "疾行药剂", num: 1, img: "jixingyaoji", miaoshu: "下一次地牢中移动速度 +25%，可在地牢中使用。", isItem: true, shiyong: true, special: "dungeonSpeed", color: "#5cc0ff" },
  },
  {
    id: "heian_jishi",
    craftTime: 4,
    name: "暗影聚晶",
    category: "材料",
    subcategory: "晶石转化",
    desc: "以魔力灵液为引，将暗之晶石的沉静凝练为怒之晶石的狂暴。",
    materials: [{ name: "暗之晶石", num: 2, img: "anshi" }, { name: "魔力灵液", num: 1, img: "moliye" }],
    output: { name: "怒之晶石", num: 1, img: "nushi", status: "material", color: "#F56C6C" },
  },
  {
    id: "nulei_jishi",
    craftTime: 4,
    name: "怒雷聚晶",
    category: "材料",
    subcategory: "晶石转化",
    desc: "怒之晶石的怒火引动雷之晶石的电光，凝而为晶。",
    materials: [{ name: "怒之晶石", num: 2, img: "nushi" }, { name: "魔力灵液", num: 1, img: "moliye" }],
    output: { name: "雷之晶石", num: 1, img: "leishi", status: "material", color: "#5cc0ff" },
  },
  {
    id: "leian_jishi",
    craftTime: 4,
    name: "雷暗聚晶",
    category: "材料",
    subcategory: "晶石转化",
    desc: "雷之晶石的雷光沉入暗之晶石的阴影，化暗为渊。",
    materials: [{ name: "雷之晶石", num: 2, img: "leishi" }, { name: "魔力灵液", num: 1, img: "moliye" }],
    output: { name: "暗之晶石", num: 1, img: "anshi", status: "material", color: "#409EFF" },
  },
  {
    id: "mojing_hc2",
    craftTime: 2,
    name: "魔晶合成·II",
    category: "材料",
    subcategory: "魔晶合成",
    desc: "五枚低阶魔晶彼此融合，凝成更高一阶的魔晶。",
    materials: [{ name: "魔晶LV1", num: 5, img: "redCrystalT1" }],
    output: { name: "魔晶LV2", num: 1, img: "redCrystalT2", status: "material", color: "#22c55e" },
  },
  {
    id: "mojing_hc3",
    craftTime: 2,
    name: "魔晶合成·III",
    category: "材料",
    subcategory: "魔晶合成",
    desc: "五枚二阶魔晶彼此融合，凝成更高一阶的魔晶。",
    materials: [{ name: "魔晶LV2", num: 5, img: "redCrystalT2" }],
    output: { name: "魔晶LV3", num: 1, img: "redCrystalT3", status: "material", color: "#22c55e" },
  },];
// 📝 同伴文案// 📝 同伴文案动态生成器（desc / skillDesc / passiveDesc 跟随数值自动更新）
// 后续调整 DEFAULT_ALLY_BATTLE_DATA 中的数值/倍率后，模块加载 & 读档都会自动重新生成文案，
// 无需再手动同步描述字符串。
// 描述中出现的所有数字均来自配置字段（攻击/速度/生命/倍率/冷却/推条等）。
// ========================

export const DEFAULT_ALLY_BATTLE_DATA = {
  // 黑米（兔子，半魔化精灵）
  tuzi: {
    juese: 'tuzi',
    name: '黑米',
    title: '半魔化兔灵',
    hp: 320,
    maxHp: 320,
    baseAttack: 16,
    baseArmor: 28,
    baseSpeed: 100,
    level: 1,
    exp: 0,
    maxExp: 50,
    spineScale: 1.1,
    // 🎯 普攻：造成基于自身攻击力的 150% 物理伤害
    //    attackType: 'selfAtk' → 伤害基数 = 自身攻击力 × attackRatio
    attackType: 'selfAtk',
    attackRatio: 1.5,
    attackDmgType: 'physical',
    // 🎯 技能：见下方 skillList（选中技能会同步到扁平字段，无需重复填写）
    // � 技能列表（可在界面切换，选中的技能用于战斗）
    //   每项可单独配 sound（技能专属音效，缺省回退同伴级 skillSound）与 skillAnim（专属动作）
    selectedSkillId: 'guhuo',
    skillList: [
      { id: 'guhuo', name: '鼓舞', skillType: 'playerActionBar', skillValue: 35, skillCooldown: 3, skillInitialCooldown: 2, skillAnim: 'attack', sound: 'ally_tuzi_guhuo' },
      { id: 'zhuaji', name: '抓击', skillType: 'singleDamage', skillValue: 2.6, skillDmgType: 'physical', skillCooldown: 3, skillInitialCooldown: 1, skillAnim: 'attack', sound: 'ally_tuzi_zhuaji' },
    ],
    // �🎯 被动：自身回合开始时，随机一个敌人减少 10% 行动条
    passiveType: 'enemyActionBarReduce',
    passiveValue: 10,      // 随机敌人行动条 -10%
    passiveName: '夺势',
    // desc / skillDesc / passiveDesc 由 refreshAllyDerivedFields 根据数值动态生成
    descFlavor: '因魔化力量而诞生的黑兔精灵，性格内敛却战力惊人，是可靠的战斗伙伴。',
    // 🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
    attackSound: 'ally_tuzi_attack',  // 普攻音效
    skillSound: 'ally_tuzi_skill',    // 技能音效
    tags: ['物理', '干扰'],
  },
  // 西亚（狐狸）
  huli: {
    juese: 'huli',
    name: '西亚',
    title: '赤狐少女',
    hp: 260,
    maxHp: 260,
    baseAttack: 13,
    baseArmor: 20,
    baseSpeed: 112,
    level: 1,
    exp: 0,
    maxExp: 50,
    spineScale: 1,
    // 🎯 普攻：为你恢复 4% 最大生命值（治疗，非伤害）
    //    attackType: 'heal' → 每次行动治疗玩家
    attackType: 'heal',
    attackRatio: 0.04,       // 4% 最大生命
    // 🎯 技能：见下方 skillList（选中技能会同步到扁平字段，无需重复填写）
    // � 技能列表（可在界面切换，选中的技能用于战斗）
    //   每项可单独配 sound（技能专属音效，缺省回退同伴级 skillSound）与 skillAnim（专属动作）
    selectedSkillId: 'chanrao',
    skillList: [
      { id: 'chanrao', name: '缠绕', skillType: 'aoePushback', skillValue: 0.95, skillPushback: 50, skillDmgType: 'physical', skillCooldown: 3, skillInitialCooldown: 1, skillAnim: 'attack', sound: 'ally_huli_chanrao' },
      { id: 'zhiyu', name: '治愈', skillType: 'heal', skillValue: 0.12, skillCooldown: 3, skillInitialCooldown: 2, skillAnim: 'attack', sound: 'ally_huli_zhiyu' },
    ],
    // �🎯 被动：敌人的速度降低 10%
    passiveType: 'enemySlow',
    passiveValue: 0.10,       // 敌人速度 -10%
    passiveName: '自然之息',
    // desc / skillDesc / passiveDesc 由 refreshAllyDerivedFields 根据数值动态生成
    descFlavor: '活泼好动的赤狐精灵，速度出众，擅长以灵巧敏捷的身手接连出击。',
    // 🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
    attackSound: 'ally_huli_attack',  // 普攻音效
    skillSound: 'ally_huli_skill',    // 技能音效
    tags: ['辅助', '治疗'],
  },
  // 晨曦（金毛）
  jinmao: {
    juese: 'jinmao',
    name: '晨曦',
    title: '金毛战将',
    hp: 350,
    maxHp: 350,
    baseAttack: 17,
    baseArmor: 30,
    baseSpeed: 95,
    level: 1,
    exp: 0,
    maxExp: 50,
    spineScale: 1,
    // 🎯 普攻：造成基于自身攻击力的 120% 火属性伤害
    attackType: 'selfAtk',
    attackRatio: 1.2,
    attackDmgType: 'fire',
    // 🎯 技能：见下方 skillList（选中技能会同步到扁平字段，无需重复填写）
    // � 技能列表（可在界面切换，选中的技能用于战斗）
    //   每项可单独配 sound（技能专属音效，缺省回退同伴级 skillSound）与 skillAnim（专属动作）
    selectedSkillId: 'guangzhibiyou',
    skillList: [
      { id: 'guangzhibiyou', name: '光之庇佑', skillType: 'shield', skillValue: 0.08, skillCooldown: 3, skillInitialCooldown: 2, skillAnim: 'attack', sound: 'ally_jinmao_guangzhi' },
      {
        id: 'zhaoyao', name: '照耀', skillType: 'aoeDamage', skillValue: 1.6, skillDmgType: 'fire', skillCooldown: 3,//技能冷却
        skillInitialCooldown: 1, //初始冷却
        skillAnim: 'attack', // 🎬 技能本体动作（与光之庇佑不同，可配专属动作）
        sound: 'ally_jinmao_zhaoyao', // 🎵 技能专属音效（缺省回退同伴级 skillSound）
      },
    ],
    // �🎯 被动：所有敌人受到的伤害提升 10%
    passiveType: 'enemyDamageTaken',
    passiveValue: 0.10,      // 敌人受伤 +10%
    passiveName: '光耀万物',
    // desc / skillDesc / passiveDesc 由 refreshAllyDerivedFields 根据数值动态生成
    descFlavor: '勇猛的金毛精灵，拥有队伍中最高的攻击力，是冲锋陷阵的先锋。',
    // 🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
    attackSound: 'ally_jinmao_attack',  // 普攻音效
    skillSound: 'ally_jinmao_skill',    // 技能音效
    tags: ['火系', '守护'],
  },
  // 云弥（鱼）
  yu: {
    juese: 'yu',
    name: '云弥',
    title: '云海鱼灵',
    hp: 280,
    maxHp: 280,
    baseAttack: 14,
    baseArmor: 22,
    baseSpeed: 108,
    level: 1,
    exp: 0,
    maxExp: 50,
    spineScale: 1,
    // 🎯 普攻：造成基于自身攻击力的 120% 水属性伤害
    attackType: 'selfAtk',
    attackRatio: 1.2,
    attackDmgType: 'water',
    // 🎯 技能：见下方 skillList（选中技能会同步到扁平字段，无需重复填写）
    // � 技能列表（可在界面切换，选中的技能用于战斗）
    //   每项可单独配 sound（技能专属音效，缺省回退同伴级 skillSound）与 skillAnim（专属动作）
    selectedSkillId: 'linglichongneng',
    skillList: [
      { id: 'linglichongneng', name: '灵力充能', skillType: 'manaCharge', skillValue: 3, skillDuration: 1, skillCooldown: 3, skillInitialCooldown: 2, skillAnim: 'attack', sound: 'ally_yu_linglichongneng' },
      { id: 'kuangyong', name: '狂涌', skillType: 'aoeDamage', skillValue: 1.6, skillDmgType: 'water', skillCooldown: 3, skillInitialCooldown: 1, skillAnim: 'attack', sound: 'ally_yu_kuangyong' },
    ],
    // �🎯 被动：每消耗 10 点魔力后，对最近的敌人造成 250% 水属性攻击力伤害
    passiveType: 'manaConsume',
    passiveValue: 2.5,          // 魔力触发后对最近敌人造成 250% 攻击力伤害
    passiveManaCost: 10,        // 每消耗 10 点魔力触发一次
    passiveDmgType: 'water',    // 伤害类型（水属性）
    passiveName: '溢灵',
    // desc / skillDesc / passiveDesc 由 refreshAllyDerivedFields 根据数值动态生成
    descFlavor: '沉默寡言的云海鱼灵，属性均衡，攻守兼备，是可靠的战斗伙伴。',
    // 🎵 战斗音效（占位文件名，后期替换成真实音频即可生效；文件不存在会自动跳过）
    attackSound: 'ally_yu_attack',  // 普攻音效
    skillSound: 'ally_yu_skill',    // 技能音效
    tags: ['水系', '充能'],
  },
}

export const TASK_TPL_VERSION = Date.now()

export const TASK_DEFS = [
  // 📜 任务模板（dladmin「任务编辑」维护）：新增/编辑/删除/隐藏任务
  // type=main 主线 / side 支线；hidden=1 隐藏（面板不显示，进度保留）
  // steps=[{ id, desc, target? }] 达成步骤；reward={ exp, money, items:[{name,num}], talents:["天赋id"] } 完成奖励
  // talents 为任务解锁型天赋（autoGranted: true，如莫奇的祝福 moqi_blessing），完成后自动激活
];

export const DEFAULT_inventory = [
  // ===== 🧪 合成系统材料（默认准备充足） =====
  // ===== 合成材料 =====
  {
    name: "灵力晶核",
    num: 50,
    img: "jinghe",
    miaoshu: "蕴含强大灵力的晶核，可用于合成和抽卡。",
    status: "material",
    isGachaItem: true, // 🎰 抽卡资源（背包"特殊"分类）
    color: "#8B5CF6"
  },
  {
    name: "魔力晶核",
    num: 5,
    img: "molijinghe",
    miaoshu: "蕴含远古力量的稀有魔晶，用于抽取高级卡池（必得优秀以上卡牌，保底稀有，最高传说）。",
    status: "material",
    isGachaItem: true, // 🎰 抽卡资源（背包"特殊"分类）
    color: "#F56C6C",
    bType: 'crystal', // 💎 突破道具：魔晶（品质3）
    bCrystal: 3
  },
  {
    name: "白朔的灵晶",
    num: 1,
    img: "baisuo",
    miaoshu: "白朔赠予的神秘灵晶，蕴含着奇妙的力量。\n击败敌人额外获得${buffs.expPct}%经验值",
    isItem: true,
    buffs: { expPct: 15, expBonus: 0.15 },
    color: "#E6A23C",
    quality: "rare"
  },
  // 💎 新增 7 种品质魔晶（redCrystalT1~T7，T1 最差 → T7 最好；均可食用/投喂/突破）
  {
    name: "魔晶LV1",
    num: 5,
    img: "redCrystalT1",
    food: true, // 🍎 食物类：可食用/喂食
    miaoshu: "品质 ${quality} 的红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。",
    status: "material",
    color: "#9ca3af",
    bType: 'crystal',
    bCrystal: 1,
    quality: 1,
    eatExp: 10, // 🍎 玩家食用经验
    feedExp: 25, // 💗 投喂同伴经验
  },
  {
    name: "魔晶LV2",
    num: 5,
    img: "redCrystalT2",
    food: true, // 🍎 食物类：可食用/喂食
    miaoshu: "品质 ${quality} 的红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。",
    status: "material",
    color: "#22c55e",
    bType: 'crystal',
    bCrystal: 2,
    quality: 2,
    eatExp: 25, // 🍎 玩家食用经验
    feedExp: 75, // 💗 投喂同伴经验
  },
  {
    name: "魔晶LV3",
    num: 5,
    img: "redCrystalT3",
    food: true, // 🍎 食物类：可食用/喂食
    miaoshu: "品质 ${quality} 的红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。",
    status: "material",
    color: "#38bdf8",
    bType: 'crystal',
    bCrystal: 3,
    quality: 3,
    eatExp: 50, // 🍎 玩家食用经验
    feedExp: 150, // 💗 投喂同伴经验
  },
  {
    name: "魔晶LV4",
    num: 5,
    img: "redCrystalT4",
    food: true, // 🍎 食物类：可食用/喂食
    miaoshu: "品质 ${quality} 的红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。",
    status: "material",
    color: "#a78bfa",
    bType: 'crystal',
    bCrystal: 4,
    quality: 4,
    eatExp: 90, // 🍎 玩家食用经验
    feedExp: 300, // 💗 投喂同伴经验
  },
  {
    name: "魔晶LV5",
    num: 5,
    img: "redCrystalT5",
    food: true, // 🍎 食物类：可食用/喂食
    miaoshu: "品质 ${quality} 的红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。",
    status: "material",
    color: "#f59e0b",
    bType: 'crystal',
    bCrystal: 5,
    quality: 5,
    eatExp: 140, // 🍎 玩家食用经验
    feedExp: 600, // 💗 投喂同伴经验
  },
  {
    name: "魔晶LV6",
    num: 5,
    img: "redCrystalT6",
    food: true, // 🍎 食物类：可食用/喂食
    miaoshu: "品质 ${quality} 的红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。",
    status: "material",
    color: "#f43f5e",
    bType: 'crystal',
    bCrystal: 6,
    quality: 6,
    eatExp: 200, // 🍎 玩家食用经验
    feedExp: 1000, // 💗 投喂同伴经验
  },
  {
    name: "魔晶LV7",
    num: 5,
    img: "redCrystalT7",
    food: true, // 🍎 食物类：可食用/喂食
    miaoshu: "品质 ${quality} 的顶级红色魔晶。食用可提升 ${eatExp} 点经验，投喂同伴可提升 ${feedExp} 点经验，也可用于等级突破。",
    status: "material",
    color: "#fbbf24",
    bType: 'crystal',
    bCrystal: 7,
    quality: 7,
    eatExp: 280, // 🍎 玩家食用经验
    feedExp: 1500, // 💗 投喂同伴经验
  },
  // 🍀 突破特殊材料（提升突破成功率）
  {
    name: "突破神石",
    num: 5,
    img: "tuposhenshi",
    miaoshu: "蕴含突破之力的神石，投入可提升突破成功率 +${btBoost.1}%。",
    status: "material",
    color: "#fbbf24",
    bType: 'booster',
    bBoost: 0.15,
    btBoost: { 1: 20, 2: 15, 3: 10 }, // 🧗 各突破阶段成功率加成（一破/二破/三破，整数=百分比）
  },
  {
    name: "秘纹水晶",
    num: 3,
    img: "miwenshuijing",
    miaoshu: "铭刻古老秘纹的水晶，投入可大幅提升突破成功率 +${btBoost.1}%。",
    status: "material",
    color: "#F56C6C",
    bType: 'booster',
    bBoost: 0.25,
    btBoost: { 1: 25, 2: 20, 3: 15 }, // 🧗 各突破阶段成功率加成（一破/二破/三破，整数=百分比）
  },
  {
    name: "幸运草",
    num: 5,
    img: "xingyuncao",
    miaoshu: "幸运的四叶草，投入可提升突破成功率 +${btBoost.1}%。",
    status: "material",
    color: "#67C23A",
    bType: 'booster',
    bBoost: 0.10,
    btBoost: { 1: 15, 2: 10, 3: 5 }, // 🧗 各突破阶段成功率加成（一破/二破/三破，整数=百分比）
  },
  // 商店货币：金币（出售材料获得，可用于购买商店物品）
  {
    name: "金币",
    num: 100,
    img: "jinbi",
    miaoshu: "通用的货币，出售材料可获得，可在商店购买物品。",
    status: "currency",
    isSpecial: true, // 🎰 特殊分类（与抽卡资源同列）
    color: "#F5A623"
  },
  // {
  //   name: "黑米的灵晶",
  //   num: 1,
  //   img: "heimi",
  //   miaoshu: "黑米死后凝聚的半魔化灵晶。\n提升10点攻击力，\n进入战斗后提升0.2*已消灭魔物数量的攻击力。",
  //   isItem: true,
  //   color: "#E6A23C",
  //   quality: "rare"
  // },
]

// ========================
// 🎁 任务奖励配置（任务全部步骤完成后自动发放）
// 按任务 id 配置（找不到 id 时会再按任务名匹配，兼容 id 不固定的任务）：
//   - exp:   经验值（自动计算装备经验加成，并处理升级）
//   - money: 金币（加到商店金钱）
//   - items: 物品列表 [{ name, num, img?, miaoshu?, color? }]
//            - 只需写 name + num，img/miaoshu/color 会自动从 DEFAULT_inventory 补齐
//            - 也可显式指定（例如奖励不在初始背包里的物品）
// 未配置奖励的任务：完成时不发放任何奖励，不影响原有逻辑
// ========================

export const TASK_REWARDS = {
  // ===== 主线任务 =====
  1: { // 「等待救援」
    exp: 50,
    money: 100,
  },
  'main_demon_awaken': { // 「邪魔苏醒」第 15 天迎击苏醒的邪魔
    exp: 200,
    money: 300,
  },
  // ===== 支线任务示例（按 id 或按名称配置均可，去掉注释即可生效） =====
  // '示例任务名': { exp: 30, items: [{ name: '魔晶', num: 2 }] },
}

// ========================
// 🏪 商店物品配置（DEFAULT_SHOP_ITEMS）
// 每次读档/新游戏时会用这份配置同步商店：
//   - 配置里新增的物品 → 自动加入商店
//   - 配置里删除的物品 → 从商店移除
//   - 配置里编辑的物品（价格/名称/数量等）→ 更新，但已购数量保留
// 物品字段：
//   id         唯一标识（用于匹配已购数量）
//   name       物品名（与背包 inventory 的 name 对应）
//   price      购买价格（金币）
//   limit      可购买数量：-1 = 无限，>=0 = 限定数量（售罄后消失）
//   buyNum     单次可买数量（默认1，购买按钮可+/-）
//   img        图标
//   miaoshu    描述
//   color      品质颜色
//   output     产出物（如需追加额外属性如 isItem/shiyong/Hp 等）
// ========================

export const DEFAULT_SHOP_ITEMS = [
  { id: "shop_huifuyaoji", name: "恢复药剂", price: 20, limit: -1, img: "huifuyaoji", miaoshu: "饮用后恢复 20 点生命值。", color: "#67C23A" },
  { id: "shop_jixingyaoji", name: "疾行药剂", price: 30, limit: -1, img: "jixingyaoji", miaoshu: "下一次地牢中移动速度提升 25%，可在地牢中使用。", color: "#5cc0ff" },
  { id: "shop_fenli", name: "焚力永浆", price: 80, limit: -1, img: "fenliyongjiang", miaoshu: "永久提升基础攻击力 2 点（最多 30 次），可给予 NPC 使用。", color: "#F56C6C" },
  { id: "shop_youkai", name: "幽铠永浆", price: 80, limit: -1, img: "youkaiyongjiang", miaoshu: "永久提升基础护甲 1 点（最多 30 次），可给予 NPC 使用。", color: "#409EFF" },
  { id: "shop_xunting", name: "迅霆永浆", price: 80, limit: -1, img: "xuntingyongjiang", miaoshu: "永久提升基础速度 1 点（最多 30 次），可给予 NPC 使用。", color: "#5cc0ff" },
  { id: "shop_qiming", name: "启明灵剂", price: 120, limit: 1, img: "qiminglingji", miaoshu: "服用后天赋点 +1（最多 3 次）。", color: "#a78bfa" },
  { id: "shop_yingwu", name: "盈悟灵浆", price: 150, limit: 1, img: "yingwulingjiang", miaoshu: "永久提升 3% 经验获取（最多 30 次，叠加上限 90%）。", color: "#E6A23C" },
  { id: "shop_shengming", name: "生命灵药", price: 200, limit: 1, img: "shengminglingyao", miaoshu: "永久提升基础生命值 40 点（仅限 1 次）。", color: "#67C23A" },
  { id: "shop_jingshixianglian", name: "晶石项链", price: 200, limit: 1, img: "xianglian1", miaoshu: "镶嵌晶石的精致项链，佩戴后魅力 +5。", color: "#E6A23C", output: { isItem: true, buffs: {"charm":5} } },
  { id: "shop_moli", name: "魔力灵药", price: 120, limit: 1, img: "molilingyao", miaoshu: "永久提升 1 点最大魔力（最多 3 次）。", color: "#409EFF" },
  { id: "shop_tuposhenshi", name: "突破神石", price: 60, limit: -1, img: "tuposhenshi", miaoshu: "蕴含突破之力的神石，投入可提升突破成功率 +15%。", color: "#fbbf24" },
  { id: "shop_miwenshuijing", name: "秘纹水晶", price: 100, limit: -1, img: "miwenshuijing", miaoshu: "铭刻古老秘纹的水晶，投入可大幅提升突破成功率 +25%。", color: "#F56C6C" },
  { id: "shop_xingyuncao", name: "幸运草", price: 40, limit: -1, img: "xingyuncao", miaoshu: "幸运的四叶草，投入可提升突破成功率 +10%。", color: "#67C23A" },
  { id: "shop_weizhiyaoshi", name: "未知钥匙", price: 100, limit: 1, img: "yaoshi1", miaoshu: "一把来历不明的神秘钥匙，或许能打开某些被锁住的门扉。", color: "#fbbf24" },
]

// ========================
// 💰 物品出售价格配置表（DEFAULT_SELL_PRICES）
// 自定义每种物品的出售单价（金币），按「物品名」匹配：
//   - 配置了 → 使用配置的售价
//   - 未配置 → 回退逻辑：商店有售卖的同名物品按商店价一半回收；
//               否则材料类默认 2 金币，其他默认 1 金币
// 后期调整售价只需改这里（读档自动生效）
// ========================

export const DEFAULT_SELL_PRICES = {
  "灵力晶核": 15,
  "魔晶LV1": 10,
  "魔力晶核": 100,
  "卡牌碎片": 3,
}
// ========================
// 攻击牌列表（直接对敌人造成伤害的牌，瘴气/毒雾等状态牌不算）
// ========================

export const ATTACK_CARDS = ['射击', '激光', '火球', '水弹', '雷击', '冰箭', '毒发', '水牢', '风刃', '龙卷风暴', '禁忌狂雷', '焚焰', '回旋风刃', '狙击', '碎甲弹', '毒刺', '流火', '冰寒', '连锁闪电'];


// 🎭 新档角色模板：由 LEVEL_UP_CFG.player.base 动态生成（替代旧静态 DEFAULT_juese，消除双源数值不一致）
//    字段名映射：base.attack→baseAttack / armor→baseArmor / speed→baseSpeed / luck→baseLuck
//    mp/maxMp 暂无配置入口，默认 2/6（如需可配需同步「升级编辑」字段列表）
export function createDefaultJuese() {
  const b = LEVEL_UP_CFG.player.base || {};
  const _initStr = b.strength ?? 0;
  const _strHp = LEVEL_UP_CFG.attrRates?.strengthHp ?? 2;
  return {
    name: '主角',
    hp: b.maxHp ?? 100,
    maxHp: b.maxHp ?? 100,
    // 🧱 基础最大生命 = 初始生命 - 初始力量加成（保证派生 maxHp = baseMaxHp + strength×strengthHp 与旧初始值一致，玩家血条不变）
    baseMaxHp: Math.max(1, Math.floor((b.maxHp ?? 100) - _initStr * _strHp)),
    mp: 2,
    maxMp: 6,
    baseArmor: b.armor ?? 10,
    baseMagicResist: b.magicResist ?? 10,
    baseAttack: b.attack ?? 10,
    baseSpeed: b.speed ?? 90,
    baseLuck: b.luck ?? 5,
    strength: b.strength ?? 0,      // 💪 力量：物理伤害 +1%/点、最大生命 +2/点
    intelligence: b.intelligence ?? 0, // 🧠 智慧：元素魔法伤害 +1%/点
    elementMastery: b.elementMastery ?? 0, // ✨ 元素精通：元素反应伤害 +1%/点
    charm: b.charm ?? 0,            // 💖 魅力：提升召唤物与同伴全属性（收敛 charm/(charm+200)，收益递减，不可自由分配）
    attrAlloc: {},                  // 🆓 自由属性点分配记录（重置时按此回收）
    // 战斗实时属性，开局自动赋值，不要写死0
    armor: null,
    attack: null,
    speed: null,
    luck: null,
    camp: 'player',
  };
}
// 🏆 局外养成配置（跨局永久进度：普通模式选角色开局，游戏失败返回时结算本局经验，
//    局外角色升级后提升下一次开局的基础属性）
export const META_ROLE_CFG = {
  maxLevel: 50,
  expBase: 100,
  expStep: 30,
  perLevelStats: { attack: 2, maxHp: 20, speed: 1, armor: 1, magicResist: 1 },
  expConversionRate: 0.2,
};

// ========================
// 🎓 升级系统配置（dladmin「升级编辑」可改；读档自动生效）
//   经验公式：每级所需经验 = expBase + expStep × (当前等级-1)（线性递增，配合怪物约 30 经验/只）
//   growth = 每升 1 级提升的基础属性；base = 初始属性（新建档生效，NPC 只有基础攻击+基础速度）
// ========================

export const LEVEL_UP_CFG = {
  player: {
    maxLevel: 30,
    expBase: 100,
    expStep: 20,
    freeAttrPointsStart: 5,
    initialTalentPoints: 5,
    attackPerLevel: 3,
    freeAttrPerLevel: 4,
    talentPerLevel: 1,
    base: { maxHp: 100, attack: 10, armor: 10, speed: 90, luck: 5, strength: 5, intelligence: 5, elementMastery: 0, charm: 5 },
  },
  ally: {
    maxLevel: 30,
    expBase: {
      tuzi: 50,
      huli: 50,
      jinmao: 50,
      yu: 50,
    },
    expMult: {
      tuzi: 1.2,
      huli: 1.2,
      jinmao: 1.2,
      yu: 1.2,
    },
    growth: {
      tuzi: { attack: 2, speed: 1 },
      huli: { attack: 2, speed: 1 },
      jinmao: { attack: 2, speed: 1 },
      yu: { attack: 4, speed: 0 },
    },
    base: {
      tuzi: { attack: 16, speed: 100 },
      huli: { attack: 13, speed: 112 },
      jinmao: { attack: 17, speed: 95 },
      yu: { attack: 13, speed: 108 },
    },
  },
  attrRates: {
    strengthPhysDmg: 1.5,
    strengthHp: 2,
    intelligenceEleDmg: 1.5,
    elementMasteryReactDmg: 1,
    intelligenceMastery: 0.5,
    baseCritRate: 5,
    luckCritRate: 50,
    luckCritDmg: 100,
    luckDrop: 100,
    charmAffection: 1,
  },
  elementReaction: {
    freezeBase: 137,
    freezePerLv: 3,
    freezeChance: 0.35,
    vaporizeBase: 237,
    vaporizePerLv: 4,
    meltBase: 162,
    meltPerLv: 3,
    meltArmorReduce: 0.1,
    electrochargeBase: 162,
    electrochargePerLv: 3,
    electrochargeActionDrop: 0.12,
    superconductBase: 125,
    superconductPerLv: 3,
    superconductPhysUp: 0.25,
    overloadBase: 100,
    overloadPerLv: 2,
  },
};

export const ACHIEVEMENT_DEFS = {
  // 🏰 地牢成就（每个奖励 1 点永久属性点，跨游戏保留）
  // ⚙️ stat=统计键（见 trackDungeonStat），condition=达成阈值；无 stat 的成就由游戏逻辑手动触发
  '魔物猎手': { desc: '在地牢中累计击败 99 个敌人。', talentReward: 1, stat: 'kills', condition: 99 },
  '无界探索家': { desc: '在地牢中累计探索 999 个格子。', talentReward: 1, stat: 'explored', condition: 999 },
  '九死一生': { desc: '在地牢中累计被击败 9 次。', talentReward: 1, stat: 'deaths', condition: 9 },
  '宝箱收藏家': { desc: '在地牢中累计打开 16 个宝箱。', talentReward: 1, stat: 'chests', condition: 16 },
  '血月见证者': { desc: '在地牢中遭遇一次血月。', talentReward: 1, stat: 'bloodmoon', condition: 1 },
  '雷霆淬体': { desc: '在雷雨天被闪电击中一次。', talentReward: 1, stat: 'thunder', condition: 1 },
  '血色永夜': { desc: '在血月与夜晚同时降临的地牢中探索。', talentReward: 1, stat: 'bloodmoonNight', condition: 1 },
  '初入永夜': { desc: '第一次在地牢中经历夜晚。', talentReward: 1, stat: 'night', condition: 1 },
  '岩浆行者': { desc: '在地牢中累计承受 499 点岩浆伤害。', talentReward: 1, stat: 'magma', condition: 499 },
  '拾荒大师': { desc: '在地牢中累计拾取 100 个道具。', talentReward: 1, stat: 'pickups', condition: 100 },
  '巅峰突破': { desc: '玩家等级达到 30 级。', talentReward: 1 },
};

// ========================
// 音频系统（模块级别，不进 Pinia state）
// ========================

export const AUTO_SAVE_PATHS = [
  // 游戏进度相关
  'youxi',
  'youxi01',
  'currentNodeKey',
  'textData',
  'duihua',
  'selectBoolean',
  'selecttextNum',
  'searchContent',
  'text',
  'text_boolean',
  'textYincang',
  'kuaijin',
  'backgroundImage',
  // 物品/抽卡相关
  'inventory',
  'triggeredStories',
  'gachaHistory',
  'premiumGachaPity',
  'gachaRates',
  // 商店
  'shop',
  // ⚗️ 炼制系统（已解锁配方）
  'pixi.lianzhiRecipes',
  // ⚗️ 炼制熟练度/等级（同配方炼制熟练度、炼制等级，读档持久化）
  'pixi.lianzhiProficiency',
  'pixi.lianzhiLevel',
  // 🎖 卡牌熟练度（每使用一次 +1，按阈值升级变强，读档持久化）
  'pixi.cardMastery',
  // 🎮 游戏模式（普通=normal / 剧情=story，随存档保存，读档保持同伴解锁状态）
  'pixi.gameMode',
  // 🃏 当前卡组（玩家携带/弃用调整，读档持久化）
  'pixi.player.deck',
  // 设置相关
  'volume',
  'text_speed',
  'textSize',
  // 任务系统
  'allTasks',
  // NPC相关（好感度、背景故事解锁状态）
  'pixi.npcSelectList',
  // 携带队友（世界地图战斗准备面板选择，随存档保存）
  'pixi.npcAlly',
  'pixi.allyBattleData',
  // 👥 同伴展示列表（独立于地图 NPC，用于「同伴查看」展示）
  'pixi.allyList',
  // 对话系统
  'pixi.dialogueFlags',
  'pixi.choiceHistory',
  'pixi.dialogueProgress',
  'pixi.language', // 语言设置
  // 玩家数据（属性、卡牌CARD_DATA、当前卡组 deck、等级经验、身份）
  'pixi.player',
  'pixi.setting',
  'pixi.fight',
  'pixi.hasSeenBattleTutorial',
  'pixi.gameUi',
  // 地图数据（触发区域、NPC位置等动态修改的数据）
  'pixi.npcDataList',  // 动态 NPC 数据（如对话创建的白朔）
  'pixi.mapDataList',
  'pixi.placedProps',  // 🧸 放置的道具（{ key, x, y }，读档自动恢复）
  'pixi.removedWenhaoIds', // 已永久删除的问号记录
  // 成就系统（跨游戏重置保留）
  'achievements',
  // 🏆 局外养成（四角色永久进度：失败结算经验、升级提升初始属性，跨局保留）
  'metaRoles',
];

// 📦 自动存档版本与迁移表（后续存档结构变更：version+1 并在此加迁移函数）

export const SAVE_VERSION = 1;

export const SAVE_MIGRATIONS = {
  // 1: (data) => { /* v1 → v2 迁移示例 */ },
};
// 💾 存档写入节流 timer（autoSave 防抖合并高频触发）
