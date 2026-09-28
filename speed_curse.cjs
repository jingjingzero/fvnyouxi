const fs = require('fs')
const crlfSave = (p, s, crlf) => fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8')
const load = (p) => { const raw = fs.readFileSync(p, 'utf8'); return { s: raw.replace(/\r\n/g, '\n'), crlf: raw.includes('\r\n') } }

// ========== 1️⃣ enemiesData.js：空心布偶死亡被动改减速 ==========
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/matter1/enemiesData.js'
  const { s, crlf } = load(p)
  const old = `        // 💀 死亡毒被动：死亡后给玩家施加 deathPoisonStacks 层中毒
        deathPoisonStacks: 2,
        deathPoisonTurns: 3,
        // 🌀 被动展示（图鉴/战斗内敌人面板；战斗逻辑走上面的 deathPoisonStacks）
        passives: [
            {
                name: '厄念',
                desc: '死亡时为玩家施加 2 层中毒。',
                type: 'deathPoison',
            },
        ],`
  const neu = `        // 🎃 死亡被动：玩家速度-4%（本次地牢内永久，可叠加，离开地牢清除）
        deathSpeedDown: 0.04,
        // 🌀 被动展示（图鉴/战斗内敌人面板；战斗逻辑走上面的 deathSpeedDown）
        passives: [
            {
                name: '减速诅咒',
                desc: '死亡时使玩家速度降低 4%，本次地牢内持续生效可叠加，直到离开地牢。',
                type: 'deathSpeedDown',
                speedDownPct: 0.04,
            },
        ],`
  const i = s.indexOf(old)
  if (i === -1) { console.error('E1 MISS'); process.exit(1) }
  crlfSave(p, s.slice(0, i) + neu + s.slice(i + old.length), crlf)
  console.log('1 enemiesData OK')
}

// ========== 2️⃣ battle.js：死亡处理 + 战斗初始化应用减速 ==========
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/fight/battle.js'
  const { s, crlf } = load(p)
  // 2a. 死亡被动处理（剧毒死亡毒块之后）
  const oldA = `    // 🌑 暗影拖拽被动：死亡后降低玩家 20% 行动条（passives 配置 actionBarReduce，默认 0.2）`
  const neuA = `    // 🎃 空心布偶死亡被动：玩家速度-4%（本次地牢内永久，可叠加，离开地牢清除）
    const speedDownPassive = (deadEnemy.passives || []).find(p => p.type === 'deathSpeedDown')
    if (speedDownPassive) {
      try {
        const sdPct = speedDownPassive.speedDownPct ?? 0.04
        const juese = user.pixi?.player
        if (juese) {
          juese.dungeonSpeedDown = Math.round(((juese.dungeonSpeedDown || 0) + sdPct) * 10000) / 10000
          _playerInstanceCache?.showBuffText?.(\`🐢 速度-\${Math.round(sdPct * 100)}%（地牢内）\`)
          battleLog(\`🎃 减速诅咒：\${deadEnemy.name} 死亡，玩家速度-\${Math.round(sdPct * 100)}%（本次地牢累计 -\${Math.round((juese.dungeonSpeedDown || 0) * 100)}%）\`)
        }
      } catch (e) { /* ignore */ }
    }

    // 🌑 暗影拖拽被动：死亡后降低玩家 20% 行动条（passives 配置 actionBarReduce，默认 0.2）`
  let i = s.indexOf(oldA)
  if (i === -1) { console.error('E2a MISS'); process.exit(1) }
  s = s.slice(0, i) + neuA + s.slice(i + oldA.length)

  // 2b. 玩家战斗初始化：应用地牢永久减速
  const oldB = `    player.baseSpeed = Math.floor(juese.baseSpeed)
    player.speed = Math.floor(juese.baseSpeed)`
  const neuB = `    player.baseSpeed = Math.floor(juese.baseSpeed)
    player.speed = Math.floor(juese.baseSpeed)
    // 🎃 空心布偶减速诅咒：本次地牢内玩家速度-4%/层（可叠加，离开地牢清除）
    const _dungeonSlow = Number(juese.dungeonSpeedDown || 0)
    if (_dungeonSlow > 0) {
      const _slowed = Math.max(1, Math.floor(player.speed * (1 - _dungeonSlow)))
      player.speed = _slowed
      player.baseSpeed = _slowed
    }`
  let j = s.indexOf(oldB)
  if (j === -1) { console.error('E2b MISS'); process.exit(1) }
  s = s.slice(0, j) + neuB + s.slice(j + oldB.length)

  crlfSave(p, s, crlf)
  console.log('2 battle OK')
}

// ========== 3️⃣ dungeon.vue：离开地牢清除减速 ==========
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/dungeon.vue'
  const { s, crlf } = load(p)
  const old = `    user.pixi.player.dungeonSpeedBuff = false;
    user.pixi.player.dungeonVisionBuff = false; // 🧪 明目药剂：离开地牢同时清除`
  const neu = `    user.pixi.player.dungeonSpeedBuff = false;
    user.pixi.player.dungeonVisionBuff = false; // 🧪 明目药剂：离开地牢同时清除
    user.pixi.player.dungeonSpeedDown = 0; // 🎃 减速诅咒：离开地牢清除`
  const i = s.indexOf(old)
  if (i === -1) { console.error('E3 MISS'); process.exit(1) }
  crlfSave(p, s.slice(0, i) + neu + s.slice(i + old.length), crlf)
  console.log('3 dungeon OK')
}

console.log('ALL DONE')
