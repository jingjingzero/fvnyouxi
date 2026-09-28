const fs = require('fs')
function load(p) {
  let s = fs.readFileSync(p, 'utf8')
  const crlf = s.includes('\r\n')
  return { p, s: s.replace(/\r\n/g, '\n'), crlf }
}
function save(o) { fs.writeFileSync(o.p, o.crlf ? o.s.replace(/\n/g, '\r\n') : o.s, 'utf8') }
function rep(o, oldStr, newStr, expect = 1) {
  const count = o.s.split(oldStr).length - 1
  if (count !== expect) { console.error('MISMATCH', expect, count, JSON.stringify(oldStr.slice(0, 80))); process.exit(1) }
  o.s = o.s.split(oldStr).join(newStr)
}

// ========== 1. enemiesData.js：shilaimu1 技能动画改 jineng ==========
const e = load('D:/youxi/fvnyouxi/src/pages/pixi/matter1/enemiesData.js')
// 怪物级 skillAnim
rep(e,
  "        attackAnim: 'attack',   // 普攻动作\n        skillAnim: 'attack',    // 技能默认动作（缺省回退 attack）\n        attackSound: 'enemy_monster1_attack',\n        skillSound: 'enemy_monster1_skill',\n        spineScale: 0.9,\n        spineAlpha: 1,\n        // 🪢 技能：缠绕：150%物伤 + 降低玩家20%速度，持续3回合（不可叠加，可刷新），冷却3回合",
  "        attackAnim: 'attack',   // 普攻动作\n        skillAnim: 'jineng',    // 技能默认动作（缺省回退 attack）\n        attackSound: 'enemy_monster1_attack',\n        skillSound: 'enemy_monster1_skill',\n        spineScale: 0.9,\n        spineAlpha: 1,\n        // 🪢 技能：缠绕：150%物伤 + 降低玩家20%速度，持续3回合（不可叠加，可刷新），冷却3回合")
// 技能级 skillAnim
rep(e,
  "                cooldown: 3,\n                initialCooldown: 1,\n                skillAnim: 'attack',\n                sound: 'enemy_monster1_skill',\n            }\n        ],\n        // 🌿 被动：再生：受到伤害后以及回合开始时，恢复12%已损失生命值",
  "                cooldown: 3,\n                initialCooldown: 1,\n                skillAnim: 'jineng',\n                sound: 'enemy_monster1_skill',\n            }\n        ],\n        // 🌿 被动：再生：受到伤害后以及回合开始时，恢复12%已损失生命值")
save(e)

// ========== 2. battle.js：emit 直接携带减速列表（不依赖 computed 响应式） ==========
const b = load('D:/youxi/fvnyouxi/src/pages/pixi/fight/battle.js')
// 2a. handleSlow 的 emit
rep(b,
  "      emitter.emit('playerSlowChanged') // 🐢 通知战斗页刷新减速图标\n      attackDone()\n    }, skill)\n    return\n  }\n\n  // 💦 粘液喷射（猫咪史莱姆）",
  [
    "      emitter.emit('playerSlowChanged', { list: getPlayerSlowList() }) // 🐢 通知战斗页刷新减速图标",
    '      attackDone()',
    '    }, skill)',
    '    return',
    '  }',
    '',
    '  // 💦 粘液喷射（猫咪史莱姆）',
  ].join('\n'))
// 2b. applySlowStacked 的 emit
rep(b,
  "    target.speed = Math.max(1, (target.speed ?? 100) - unit)\n    emitter.emit('playerSlowChanged') // 🐢 刷新减速图标",
  "    target.speed = Math.max(1, (target.speed ?? 100) - unit)\n    emitter.emit('playerSlowChanged', { list: getPlayerSlowList() }) // 🐢 刷新减速图标")
// 2c. 新增 getPlayerSlowList 辅助（handleSlow 前）
rep(b,
  "  // 🐌 粘液减速：每段 -slowPct 速度，可叠加并刷新（持续 dur 回合）；到期由 DEBUFF_NAME_CLEANUP 粘液减速 按层数恢复",
  [
    '  // 🐢 汇总玩家当前减速 debuff（带 speedDebuff 的）——直接传数据给战斗页，不依赖 computed 响应式',
    '  function getPlayerSlowList() {',
    '    return (player.debuffs || [])',
    '      .filter(d => d.speedDebuff != null && d.speedDebuff !== 0)',
    '      .map(d => ({ name: d.name, remaining: d.remaining, stacks: d.stacks ?? 1 }))',
    '  }',
    '',
    '  // 🐌 粘液减速：每段 -slowPct 速度，可叠加并刷新（持续 dur 回合）；到期由 DEBUFF_NAME_CLEANUP 粘液减速 按层数恢复',
  ].join('\n'))
save(b)

// ========== 3. index.vue：handlePlayerSlowChanged 优先用 payload.list ==========
const iv = load('D:/youxi/fvnyouxi/src/pages/pixi/fight/index.vue')
rep(iv,
  "const handlePlayerSlowChanged = () => {\n    pixiIndexRef.value?.updatePlayerSlowIcons?.(playerSlowDebuffs.value);\n};",
  "const handlePlayerSlowChanged = (payload) => {\n    // 🐢 优先用事件携带的数据（战斗数据非响应式，computed 可能不更新）\n    const list = payload?.list ?? playerSlowDebuffs.value;\n    pixiIndexRef.value?.updatePlayerSlowIcons?.(list);\n};")
save(iv)

console.log('PATCHED shilaimu1 jineng anim + slow icon data passing')
