const fs = require('fs')

function repFile(file, old, nw, expect = 1) {
  const p = file
  let s = fs.readFileSync(p, 'utf8')
  const count = s.split(old).length - 1
  if (count !== expect) {
    console.error(`COUNT MISMATCH in ${p}: expected ${expect} got ${count} =>`, JSON.stringify(old.slice(0, 50)))
    process.exit(1)
  }
  s = s.split(old).join(nw)
  fs.writeFileSync(p, s, 'utf8')
  console.log('PATCHED', p)
}

// 1. matter.vue：删除 TEMP DIAG 块
repFile(
  'D:/youxi/fvnyouxi/src/pages/pixi/matter.vue',
  `      // ⚠️ TEMP DIAG (remove later)
      if (this._diagN == null) this._diagN = 0;
      if ((this._diagN++ % 30) === 0) {
        console.log('[diag]', JSON.stringify({
          isMoving: this._isMovingAnim, isOnGround: this.isOnGround,
          airGap: airGap, vy: vy, hm: currentHeightMapId,
          left: playerInput.value.left, right: playerInput.value.right,
          vx: +(this.body?.velocity?.x || 0).toFixed(2),
          x: +(this.body?.position?.x || 0).toFixed(1), y: +(this.body?.position?.y || 0).toFixed(1)
        }));
      }
      // 战斗状态锁定fight动画`,
  `      // 战斗状态锁定fight动画`
)

// 2. collisionEvents.js：清理 _jumpLocked 死代码（跳跃已删除）
repFile(
  'D:/youxi/fvnyouxi/src/pages/pixi/matter1/collisionEvents.js',
  `          obj.groundContacts++;
          obj.isOnGround = true;
          obj._jumpLocked = false; // 🚫 已落地，解锁跳跃（允许再次起跳）
          continue;`,
  `          obj.groundContacts++;
          obj.isOnGround = true;
          continue;`,
  2 // 两处相同（bodyA / bodyB 分支）
)

console.log('CLEANUP OK')
