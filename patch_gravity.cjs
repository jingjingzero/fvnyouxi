const fs = require('fs')
const path = require('path')

function patchFile(file, edits) {
  const p = path.resolve(file)
  let s = fs.readFileSync(p, 'utf8')
  for (const e of edits) {
    const count = s.split(e.old).length - 1
    if (count !== e.expect) {
      console.error(`COUNT MISMATCH in ${file}: expected ${e.expect} got ${count} =>`, JSON.stringify(e.old.slice(0, 50)))
      process.exit(1)
    }
    s = s.split(e.old).join(e.new)
  }
  fs.writeFileSync(p, s, 'utf8')
  console.log('PATCHED', file)
}

// 1. matter.vue：恢复重力（保持跳跃删除；角色贴地/移动动画依赖重力下落触发碰撞）
patchFile('D:/youxi/fvnyouxi/src/pages/pixi/matter.vue', [
  {
    expect: 1,
    old: `  // 🚫 已移除跳跃与重力：世界不再下落，角色靠高度图吸附贴地
  engine.gravity.scale = 0;`,
    new: `  // 🎯 重力 scale 按屏高归一化（1080p 基准 0.00072）：角色需重力下落接触地面
  //    （无高度图地图贴地依赖 footSensor 碰撞事件；跳跃功能已删除，仅保留重力落地）
  engine.gravity.scale = 0.00072 * (window.innerHeight / 1080);`,
  },
])

// 2. core/engine.js：恢复重力默认值
patchFile('D:/youxi/fvnyouxi/src/pages/pixi/core/engine.js', [
  {
    expect: 1,
    old: `   // 🚫 已移除重力（角色不再跳跃，世界不施加重力下落）
   gravity: { x: 0, y: 1, scale: 0 }`,
    new: `   // ✅ 使用 Matter 自带重力（角色仍需下落接触地面；跳跃功能已单独删除）
   //    gravity.y * scale = 0.2 / 277.8 ≈ 0.00072，手感与屏高归一化由 matter.vue 覆盖
   gravity: { x: 0, y: 1, scale: 0.00072 }`,
  },
])

console.log('GRAVITY RESTORED')
