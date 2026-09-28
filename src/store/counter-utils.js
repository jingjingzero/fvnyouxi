// 工具函数与存储封装（拆分自 counter.js，规避浏览器大模块编译 bug）

import { tr } from "@/i18n";

function _isPlusStorage() {
  return typeof window !== 'undefined' && typeof window.plus !== 'undefined'
}
export function setStorage(key, value) {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
  if (_isPlusStorage()) window.plus.storage.setItem(key, stringValue)
  else localStorage.setItem(key, stringValue)
}
export function getStorage(key) {
  let value
  if (_isPlusStorage()) value = window.plus.storage.getItem(key)
  else value = localStorage.getItem(key)
  try { return JSON.parse(value) } catch (e) { return value }
}

export let DEFAULT_TALENT_CONFIG = null;
export function setDEFAULT_TALENT_CONFIG(v) { DEFAULT_TALENT_CONFIG = v; }

export function allyDmgName(type) {
  const map = { physical: '物理', fire: '火属性', water: '水属性', lightning: '雷属性', ice: '冰属性', poison: '毒属性' }
  return map[type] || '物理'
}
export function allyPct(n) { return Math.round((n ?? 0) * 100) }

// 技能描述（按 skillType 动态生成，返回前统一英文化）
export function buildAllySkillDesc(s) {
  const dmg = allyDmgName(s.skillDmgType)
  switch (s.skillType) {
    case 'playerActionBar':
      return tr(`鼓舞士气，为你提升 ${s.skillValue ?? 0}% 行动条，抢先出手。`)
    case 'singleDamage':
      return tr(`对最近的敌人造成 ${allyPct(s.skillValue)}% 攻击力${dmg}伤害。`)
    case 'aoePushback':
      return tr(`对所有敌人造成 ${allyPct(s.skillValue)}% 攻击力${dmg}伤害并降低 ${s.skillPushback ?? 0}% 行动条。`)
    case 'aoeDamage':
      return tr(`对所有敌人造成 ${allyPct(s.skillValue)}% 攻击力${dmg}伤害。`)
    case 'heal':
      return tr(`为你恢复 ${allyPct(s.skillValue)}% 最大生命值。`)
    case 'shield':
      return tr(`展开守护屏障，为你提供 ${allyPct(s.skillValue)}% 最大生命值的护盾。`)
    case 'manaCharge':
      return tr(`凝聚灵力，为你提供 ${s.skillValue ?? 0} 点可突破上限的灵力，持续 ${s.skillDuration ?? 1} 回合。`)
    case 'enemyDamageTaken':
      return tr(`使所有敌人受到的伤害提升 ${allyPct(s.skillValue)}%${s.skillDuration ? `，持续 ${s.skillDuration} 回合` : ''}。`)
    default:
      return tr(`造成 ${allyPct(s.skillValue)}% 攻击力${dmg}伤害。`)
  }
}

// 被动描述（按 passiveType 动态生成，返回前统一英文化）
export function buildAllyPassiveDesc(cfg) {
  switch (cfg.passiveType) {
    case 'enemyActionBarReduce':
      return tr(`自身回合开始时，随机一个敌人减少 ${cfg.passiveValue ?? 0}% 行动条。`)
    case 'enemySlow':
      return tr(`进入战斗后使所有敌人的速度降低 ${allyPct(cfg.passiveValue)}%。`)
    case 'enemyDamageTaken':
      return tr(`进入战斗后所有敌人受到的伤害提升 ${allyPct(cfg.passiveValue)}%。`)
    case 'manaConsume':
      return tr(`每消耗 ${cfg.passiveManaCost ?? 10} 点魔力后，对最近的敌人造成 ${allyPct(cfg.passiveValue)}% 攻击力${allyDmgName(cfg.passiveDmgType)}伤害。`)
    case 'allyDamageUp':
      return tr(`全队造成的伤害提升 ${allyPct(cfg.passiveValue)}%。`)
    default:
      return ''
  }
}

// 同伴介绍（descFlavor 固定文案 + 动态数值摘要）
function buildAllyDesc(cfg) {
  const flavor = cfg.descFlavor || ''
  const atkDesc = cfg.attackType === 'heal'
    ? `普攻为你恢复 ${allyPct(cfg.attackRatio)}% 最大生命值`
    : `普攻造成 ${allyPct(cfg.attackRatio)}% 攻击力${allyDmgName(cfg.attackDmgType)}伤害`
  const stats = `攻击力 ${cfg.baseAttack ?? 0}、速度 ${cfg.baseSpeed ?? 0}、生命值 ${cfg.maxHp ?? 0}。`
  return flavor
    ? tr(`${flavor} ${stats}${atkDesc}。`)
    : tr(`${stats}${atkDesc}。`)
}

// 🔄 重新生成单个同伴的「派生字段」（每次读档/入队/模块加载时执行）：
//    - 扁平技能字段（skillType/skillName/skillValue/.../skillDesc）与选中的技能项同步
//    - desc / skillList[].skillDesc / passiveDesc 按当前数值动态生成
//    因此 DEFAULT_ALLY_BATTLE_DATA 里无需再手写外层扁平技能字段与描述文案。
export function refreshAllyDerivedFields(cfg) {
  if (!cfg) return cfg
  // 技能列表描述
  if (Array.isArray(cfg.skillList)) {
    cfg.skillList.forEach(s => { s.skillDesc = buildAllySkillDesc(s) })
  }
  // 当前选中技能（或第一个）
  const eff = (Array.isArray(cfg.skillList) && cfg.skillList.length)
    ? (cfg.skillList.find(s => s.id === cfg.selectedSkillId) || cfg.skillList[0])
    : null
  if (eff) {
    // 扁平技能字段跟随选中技能（缺失字段删除；战斗/界面读取有默认兜底）
    // 注：技能项用 name 字段，扁平字段叫 skillName，同步时自动映射
    const flatKeys = ['skillType', 'skillName', 'skillAnim', 'skillValue', 'skillDuration', 'skillPushback', 'skillCooldown', 'skillInitialCooldown', 'skillDmgType', 'skillDesc']
    flatKeys.forEach(k => {
      if (k === 'skillName') {
        if (eff.skillName !== undefined) cfg.skillName = eff.skillName
        else if (eff.name !== undefined) cfg.skillName = eff.name
        else delete cfg.skillName
        return
      }
      if (eff[k] !== undefined) cfg[k] = eff[k]
      else delete cfg[k]
    })
  }
  // 被动描述
  if (cfg.passiveType) cfg.passiveDesc = buildAllyPassiveDesc(cfg)
  // 介绍
  cfg.desc = buildAllyDesc(cfg)
  return cfg
}