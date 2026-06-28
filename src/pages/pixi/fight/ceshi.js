import { Application } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'

// CardSpine.js
export const CARD_DATA = {
  射击: {
    skin: 'Shoot',
    color: '#ff4757',
    maxCooldown: 0,
    cost: 0,
    limitPerTurn: 1,
    evoOptions: ['弹夹升级', '概率暴击', '快速换弹', '破甲'],
    defaultEvos: ['快速换弹', '概率暴击'],//已进化
    evoDesc: {
      "弹夹升级": "额外射击二次",
      "概率暴击": "有50%概率暴击，造成140%伤害",
      "快速换弹": "可消耗1点灵力额外使用1次",
      "破甲": "无视敌方 30% 护甲"
    },
    hitCount: 6,//打击次数
    fixedDmg: 8,//固定伤害
    atkRatio: 0.1,//攻击力收益
    animDelay: 6 * 150,//动画时长
    // ✅ 卡牌描述
    desc: "无消耗,每回合限用一次,朝敌人射击6次,每次造成 8 + 10% 攻击力物理伤害。"
  },

  激光: {
    skin: 'Laser',
    color: '#ffeb3b',
    maxCooldown: 1,
    cost: 3,
    evoOptions: ['击杀返还', '概率暴击', '超频释放', '破甲'],
    defaultEvos: [],
    evoDesc: {
      "击杀返还": "造成击杀则返还2点灵力",
      "概率暴击": "有50%概率暴击，造成140%伤害",
      "超频释放": "所需灵力提升1点，造成伤害提升40%",
      "破甲": "无视敌方 30% 护甲"
    },
    fixedDmg: 110,
    atkRatio: 1.2,
    animDelay: 500,
    desc: "对所有敌人造成110+120%攻击力物理伤害。"
  },

  瘴气: {
    skin: 'Miasma',
    color: '#2fca64',
    dmgType: "poison", // 毒伤
    maxCooldown: 2,
    cost: 2,
    evoOptions: ['毒素紊乱', '熟能生巧', '死亡返还', '虚弱'],
    defaultEvos: ['毒素紊乱', '熟能生巧', '死亡返还', '虚弱'],
    evoDesc: {
      "毒素紊乱": "目标身上每携带1种毒素状态，瘴毒伤害提高12%",
      "熟能生巧": "战斗中累计使用3 次后，减少1点灵力消耗",
      "死亡返还": "当有敌人阵亡时，冷却缩短1回合",
      "虚弱": "携带【瘴毒】的敌人护甲降低 15%，所受毒素伤害提高12%"
    },
    fixedDmg: 25,
    atkRatio: 0.25,
    animDelay: 500,
    desc: "对全部敌人施加【瘴毒】，持续 3 回合；敌人每次行动时受到「25+25% 攻击力」毒素伤害。重复施加瘴气，刷新中毒持续时长，并使【瘴毒】伤害增幅 50%。"
  },

  无人机: {
    skin: 'Drone',
    color: '#a78bfa',
    maxCooldown: 3,
    cost: 3,
    evoOptions: ['超强续航', '自动部署', '系统升级', '机群效应'],
    defaultEvos: ['机群效应'],
    evoDesc: {
      "超强续航": "无人机攻击次数+2",
      "自动部署": "战斗开局自动召唤 1 台无人机",
      "系统升级": "无人机速度提升40%，造成伤害提升20%",
      "机群效应": "当召唤无人机时，在场的无人机行动条推进 50%"
    },
    fixedDmg: 60,
    atkRatio: 0.6,
    animDelay: 500,
    desc: "召唤一个无人机协助自己作战，无人机初始拥有60速度，在攻击3次后退场。无人机每次攻击造成60+60%攻击力伤害。"
  },

  影分身: {
    skin: 'ShadowClone',
    color: '#7c3aed',
    maxCooldown: 1,
    cost: 3,
    evoOptions: ['生命提升', '自动召唤', '强力分裂', '协同作战'],
    defaultEvos: ['协同作战'],
    evoDesc: {
      "生命提升": "影分身生命值提升至40%最大生命值",
      "自动召唤": "战斗开局自动召唤影分身",
      "强力分裂": "影分身的属性提升至自身的70%%",
      "协同作战": "影分身行动时，你的行动条推进30%"
    },
    desc: "召唤一个拥有你25%最大生命值的影分身，拥有你60%的速度，他会替你承担50%伤害，死亡后退场。当他行动时，会使用射击。"
  },

  聚灵: {
    skin: 'SpiritGather',
    color: '#10b981',
    maxCooldown: 2,
    initialCooldown: 2,
    cost: 0,
    evoOptions: ['快速使用', '效果强化', '汲灵秘术', '灵力分享'],
    defaultEvos: ['快速使用', '汲灵秘术'],
    evoDesc: {
      "快速使用": "战斗开始时不再拥有冷却",
      "效果强化": "额外恢复1点灵力",
      "汲灵秘术": "使用后全属性提升10%持续1回合",
      "灵力分享": "使用后会使你的其他友方单位行动条推进25%"
    },
    desc: "恢复2点灵力"
  },

  反弹: {
    skin: 'Reflect',
    color: '#f59e0b',
    maxCooldown: 2,
    cost: 2,
    evoOptions: ['效果强化', '全副武装', '状态延长', '自动释放'],
    defaultEvos: [],
    evoDesc: {
      "效果强化": "反弹伤害修正为【70%折前伤害+180%护甲】",
      "全副武装": "反弹状态下额外提升20%护甲",
      "状态延长": "反弹状态额外持续1回合",
      "自动释放": "战斗开始时自动获得此状态，并且战斗开始时护甲提升10%"
    },
    desc: "获得2回合的【反弹】状态，期间护甲提升30%，当你受到攻击时，对攻击者造成【50%折前伤害+140%护甲】伤害。"
  },

  武器强化: {
    skin: 'WeaponBoost',
    color: '#fbbf24',
    maxCooldown: 2,
    cost: 2,
    evoOptions: ['首发增幅', '负荷提升', '穿甲', '重置'],
    defaultEvos: [],
    evoDesc: {
      "首发增幅": "第一次使用时额外增强100%效果",
      "负荷提升": "可强化次数提升2，当强化三次后，冷却时间缩短1回合",
      "穿甲": "每层效果额外使你的物理伤害无视5%护甲",
      "重置": "每次强化后可额外免费使用一次射击"
    },
    desc: "使你的物理伤害提升20%直到战斗结束，最多可强化三次。"
  },

  洞察: {
    skin: 'Insight',
    color: '#ffffff',
    maxCooldown: 2,
    cost: 2,
    initialCooldown: 1,
    evoOptions: ['效果增强', '乘胜追击', '不安', '看透'],
    defaultEvos: ['效果增强', '看透', '不安', '乘胜追击'],
    evoDesc: {
      "效果增强": "受到伤害修正为（15+9*破解层数）%",
      "乘胜追击": "当拥有弱点的敌人死亡，你的速度提升20%持续2回合",
      "不安": "当敌人获得弱点时，行动条减少40%",
      "看透": "拥有弱点的敌人护甲会降低20%"
    },
    desc: "使所有敌人获得一层弱点状态，敌人拥有弱点时，受到伤害提升（10+6*破解层数）%"
  },

  毒雾: {
    skin: 'PoisonMist',
    color: '#2fca64',
    maxCooldown: 1,
    cost: 5,
    initialCooldown: 4,
    evoOptions: ['效果增强', '快速启动', '窒息', '扩散'],
    defaultEvos: ['效果增强', '快速启动', '窒息', '扩散'],
    evoDesc: {
      "效果增强": "敌人行动时受到中毒伤害提升至55+55%",
      "快速启动": "初始冷却-2",
      "窒息": "毒雾存在时，敌人的速度降低18%",
      "扩散": "毒雾存在时，敌人行动时会受到20+15%攻击力的毒素伤害"
    },
    desc: "令周围充满毒雾，令所有敌人进入中毒效果、护甲降低 20%、所受毒素伤害提高 30%；敌人每回合开始受到 40+40% 攻击力的毒素伤害。"
  }
}

// ================================
// 工具函数（自动从统一配置读取）
// ================================
export function getCardSkinName(name) {
  return CARD_DATA[name]?.skin || 'attack'
}

export function getCardTextColor(name) {
  return CARD_DATA[name]?.color || '#ffffff'
}

export function getCardMaxCooldown(name) {
  return CARD_DATA[name]?.maxCooldown || 0
}
// ================================
// Spine 创建函数（不变）
// ================================

export async function createCardSpine(cardName, width, height) {
  try {
    const app = new Application()
    await app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: false,
    })

    const spine = new Spine({
      skeleton: 'kapai_skel',
      atlas: 'kapai_atlas',
    })

    if (!spine) {
      console.error('Spine创建失败')
      await app.destroy(true, { children: true, texture: true, context: true })
      return null
    }

    const skins = spine.skeleton.data?.skins?.map(s => s.name) || []
    const targetSkin = getCardSkinName(cardName)

    if (skins.includes(targetSkin)) {
      spine.skeleton.setSkinByName(targetSkin)
    } else {
      spine.skeleton.setSkinByName(skins[0] || null)
    }

    spine.state.clearTracks()
    app.stage.addChild(spine)

    const scale = Math.max(width / 512, height / 512)
    spine.scale.set(scale * 1.2)
    spine.x = width / 2
    spine.y = height
   app.render()
    // 删掉整段 tickHandler + app.ticker.add(tickHandler)
    // 静态卡牌不需要每帧更新骨骼动画

    return {
      app,
      spine,
      canvas: app.canvas,
     
    }
  } catch (e) {
    console.error('createCardSpine error:', e)
    return null
  }
}