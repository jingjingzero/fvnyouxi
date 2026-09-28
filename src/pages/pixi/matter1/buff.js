// 颜色配置：普通/暴击两档，支持扩展更多属性
export const DAMAGE_COLOR_MAP = Object.freeze({
  physical: { normal: '#ff9500', critical: '#ff6b00' }, // 物理橙
  poison: { normal: '#bf5af2', critical: '#9d32d9' },   // 毒紫
  ice: { normal: '#87CEEB', critical: '#4DB8E6' },      // 冰：浅天蓝
  water: { normal: '#5B9BD5', critical: '#2E75B6' },    // 水：深海蓝
  fire: { normal: '#ff3b30', critical: '#ff0000' },     // 火：鲜红
  lightning: { normal: '#9370DB', critical: '#7A42F5' }, // 雷：紫色
  wind: { normal: '#1ABC9C', critical: '#0E8A73' },     // 风：青绿
  normal: { normal: '#ffffff', critical: '#ffffff' },   // 无属性白
  null: { normal: '#ffffff', critical: '#ffffff' },
  // 恢复类配色
  heal: { normal: '#00ff66', critical: '#00cc44' },     // 回血：亮绿
  mp: { normal: '#00ccff', critical: '#0099ff' }        // 回灵力：天蓝色
});

// Buff名称颜色映射配置（按功能分组·去重配色·格式统一）
export const BUFF_COLOR_MAP = {
  // 增伤破甲
  '看透': { color: '#FFD700' },
  '弱点': { color: '#FF4500' },
  '弱点+1': { color: '#FF4500' },

  // 法术增益
  '汲灵秘术': { color: '#00CED1' },
  '乘胜追击': { color: '#00CED1' },
  '武器强化': { color: '#00CED1' },
  '灵力充能': { color: '#409EFF' },
  '蓄灵': { color: '#409EFF' },
  '噬灵收割': { color: '#409EFF' },
  '号令': { color: '#FFD700' },
  '鼓舞': { color: '#FFD700' },
  '光之庇佑': { color: '#FFD700' },
  '电磁场': { color: '#55aaff' },
  // 元素异常Debuff
  '瘴毒': { color: '#7CFC00' },
  '冻结': { color: '#409EFF' },
  '湿润': { color: '#7EC8E3' },
  '霜冻': { color: '#B8D4E3' },
  '电流': { color: '#9370DB' },
  '感电': { color: '#7B68EE' },

  // 元素反应
  '蒸发': { color: '#87CEFA' },
  '融化': { color: '#FF7F50' },
  '超导': { color: '#87CEFA' },
  '超载': { color: '#FF6347' },
  '减益': { color: '#FF6347' },

  // 敏捷速度身法
  '锋速': { color: '#5cc0ff' },
  '瞬连突袭': { color: '#5cc0ff' },
  '余速续航': { color: '#5cc0ff' },
  '顺势疾行': { color: '#5cc0ff' },

  // 治疗回血祝福
  '生命回复': { color: '#67C23A' },
  '快速愈合': { color: '#67C23A' },
  '西亚的祝福': { color: '#67C23A' },
  '冰精灵的祝福': { color: '#87CEEB' }, // 冰蓝
  '首领': { color: '#FFD700' }, // 首领（召唤物数量全属性加成）
  '雷精灵的祝福': { color: '#9370DB' }, // 雷紫
  '愤怒': { color: '#dc2626' },
  '灵能愈合': { color: '#67C23A' },
  '向死而生': { color: '#FF3333' },
  // 流血反噬负面
  '残血收割': { color: '#dc2626' },
  '隐忍': { color: '#dc2626' },
  '反伤': { color: '#B22222' },
  '晨曦的祝福': { color: '#F56C6C' },
  '风之庇佑': { color: '#2DD4BF' },
  '水愈': { color: '#38BDF8' },
  '冰寒': { color: '#7DD3FC' },
  // 敌人技能
  '暗影召唤': { color: '#B388FF' }, // 暗影王召唤（紫色，暗影系）
  '狂怒': { color: '#FF8C00' },    // 魔化猫狂怒（橙红，攻击/移速增益）
  '电磁场': { color: '#40C4FF' },   // 雷鸟女皇电磁场（电蓝）
  '飞翔！无法受到伤害': { color: '#40C4FF' }, // 雷鸟飞翔（电蓝，无敌状态提示）
};

// Buff名称 → tianfu皮肤名 映射（用于战斗页面的buff图标渲染）
export const BUFF_SKIN_MAP = {
  '先攻': 'battle_start_attack_buff',
  '绝对防御': 'start_battle_armor_buff',
  '荆棘反伤': 'thorns_reflect',
  '反弹': 'Reflect',
  '武器强化': 'WeaponBoost',
  '汲灵秘术': 'mana_regen',
  '生命回复': 'life_steal',
  '锋速': 'attack_round_start_up',
  '瞬连突袭': 'continuous_strike',
  '余速续航': 'turn_end_speed',
  '愤怒': 'hurt_atk_stack',
  '灵愈': 'heal_atk_buff',
  '聚灵': 'atk_up', // ✨ 聚灵：玩家攻击力提升（buffall atk_up）
  '攻击力提升': 'atk_up', // ⚔️ 通用攻击力提升状态（天赋/道具直接加攻时显示）
  '灵能愈合': 'card_heal_regen',
  '向死而生': 'low_hp_battle_buff',
  '乘胜追击': 'first_strike',
  '噬灵收割': 'kill_recover_mana',
  '隐忍': 'no_attack_power_up',
  '残血收割': 'execute',
  '晨曦的祝福': 'attack_stack',
  '雷之祝福': 'atk_up', // ⚡ 雷精灵加攻击：buffall atk_up（攻击力提升）
  '西亚的祝福': 'death_cheat',
  '快速愈合': 'low_hp_emergency_heal',
  '魔力溢涌': 'mana_cycle_free',
  '魔力淬体': 'mana_atk_stack',
  '时间加速': 'mana_cd_reduce',
  '蓄灵': 'card_draw_mana',
  '能量转换': 'shield_charge_action',
  '盾反': 'shield_reflect_damage',
  '无畏强攻': 'shield_damage_up',
  '绝境守御': 'low_hp_shield',
  '抵消': 'shield_absorb',
  '承压御守': 'hit_count_shield',
  '抵抗姿态': 'no_attack_armor_up',
  '双刃剑': 'double_blade',
  '厄运': 'enemy_luck_dmg',
  '再来一次': 'luck_action_rush',
  '多多益善': 'luck_mana_restore',
  '元素共鸣': 'element_reaction_dmg_up',
  '紊乱': 'element_derivative_dmg',
  '纯净元素': 'element_armor_pierce',
  '元素残留': 'element_residual',
  '元素裂变': 'element_fission',
  '天选之子': 'luck_god_chosen',
  '夺命烙印': 'death_mark_stack',
  '余伤蔓延': 'kill_spread_damage',
  '灵韵流转': 'mana_regen',
  '时序调息': 'round_end_random_cd',
  '元素增伤': 'element_damage_up',
  '火灵祝福': 'fire_dmg_up', // 🔥 火精灵存在：玩家火属性伤害 +25%（buffall 皮肤 fire_dmg_up）
  '雷灵祝福': 'elec_dmg_up', // ⚡ 雷精灵存在：玩家雷属性伤害 +15%（buffall 皮肤 elec_dmg_up）
  '水灵祝福': 'water_dmg_up', // 💧 水精灵存在：玩家水元素伤害 +15%（buffall 皮肤 water_dmg_up）
  '冰灵祝福': 'ice_dmg_up', // ❄️ 冰精灵存在：玩家冰元素伤害 +15%（buffall 皮肤 ice_dmg_up）
  '流血': 'bleed_debuff', // 🩸 流血：可叠加 DOT（buffall 皮肤 bleed_debuff）
  '粘液减速': 'speed_down', // 🐢 粘液减速：移速降低（buffall 皮肤 speed_down）
  '缠绕': 'speed_down', // 🐢 缠绕：移速降低（buffall 皮肤 speed_down）
  '霜冻': 'speed_down', // 🐢 霜冻：移速降低（buffall 皮肤 speed_down）
  '冰寒': 'speed_down', // 🐢 冰寒：移速降低（buffall 皮肤 speed_down）
  '减速诅咒': 'speed_down', // 🐢 减速诅咒：空心布偶死亡减速（buffall 皮肤 speed_down）
  '移速降低': 'speed_down', // 🐢 自动聚合的移速降低图标
  '移速提升': 'speed_up', // 🐎 自动聚合的移速提升图标
  '攻击力降低': 'atk_down', // ⚔️ 自动聚合的攻击力降低图标
  '护甲提升': 'armor_up', // 🛡️ 自动聚合的护甲提升图标
  '护甲降低': 'armor_down', // 🛡️ 自动聚合的护甲降低图标
  '魔抗提升': 'magic_resist_up', // ✨ 自动聚合的魔抗提升图标
  '魔抗降低': 'magic_resist_down', // ✨ 自动聚合的魔抗降低图标
  '火元素伤害提升': 'fire_dmg_up', // 🔥 火元素伤害提升
  '水元素伤害提升': 'water_dmg_up', // 💧 水元素伤害提升
  '冰元素伤害提升': 'ice_dmg_up', // ❄️ 冰元素伤害提升
  '雷元素伤害提升': 'elec_dmg_up', // ⚡ 雷元素伤害提升
  '风元素伤害提升': 'wind_dmg_up', // 🌪️ 风元素伤害提升
  '毒元素伤害提升': 'poison_dmg_up', // ☠️ 毒元素伤害提升
};