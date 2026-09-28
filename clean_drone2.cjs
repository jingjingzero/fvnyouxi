const fs = require('fs')

// summon.js 删 isDrone 分支
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/fight/animations/summon.js'
  let s = fs.readFileSync(p, 'utf8')
  const oldB = "      if (unit.isDrone) {\n        allies.splice(i, 1);\n        continue;\n      }\n"
  const i = s.indexOf(oldB)
  if (i === -1) { console.error('summon.js isDrone MISS'); process.exit(1) }
  s = s.slice(0, i) + s.slice(i + oldB.length)
  const oldC = " * 管理无人机、影分身等召唤物的创建、定位、动画和销毁"
  const j = s.indexOf(oldC)
  if (j !== -1) s = s.slice(0, j) + " * 管理影分身等召唤物的创建、定位、动画和销毁" + s.slice(j + oldC.length)
  fs.writeFileSync(p, s, 'utf8')
  console.log('summon.js cleaned')
}

// battle.js 注释去掉无人机
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/fight/battle.js'
  let s = fs.readFileSync(p, 'utf8')
  const oldC = "    //    - soundPerHit 技能（射击/流火/狙击/碎甲弹/无人机/影分身）：由特效层按每次发射/命中播放，"
  const i = s.indexOf(oldC)
  if (i === -1) { console.error('battle.js comment MISS'); process.exit(1) }
  s = s.slice(0, i) + "    //    - soundPerHit 技能（射击/流火/狙击/碎甲弹/影分身）：由特效层按每次发射/命中播放，" + s.slice(i + oldC.length)
  fs.writeFileSync(p, s, 'utf8')
  console.log('battle.js comment cleaned')
}
