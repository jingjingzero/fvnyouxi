const fs = require('fs')
const crlfSave = (p, s, crlf) => fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8')
const load = (p) => { const raw = fs.readFileSync(p, 'utf8'); return { s: raw.replace(/\r\n/g, '\n'), crlf: raw.includes('\r\n') } }

// ========== 1️⃣ counter-store.js：新增「同心」天赋 ==========
{
  const p = 'D:/youxi/fvnyouxi/src/store/counter-store.js'
  const { s, crlf } = load(p)
  const old = `          {
            id: "leader_skill",`
  const neu = `          {
            id: "tong_xin",
            name: "同心",
            description: "你的所有召唤物持续时间延长\${eff.summonDurExt}回合；每打出\${eff.summonCardNeed}张召唤物牌获得\${eff.summonCardMp}点灵力（累积，战斗开始时重置）",
            cost: 2,
            color: "#F48FB1",
            tier: 4,
            col: 23.6,
            prerequisites: [{ id: "kind_favor", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [],
            levelDescriptions: ["你的所有召唤物持续时间延长\${eff.summonDurExt}回合；每打出\${eff.summonCardNeed}张召唤物牌获得\${eff.summonCardMp}点灵力（累积，战斗开始时重置）"],
            effect: { "summonDurExt": 1, "summonCardNeed": 3, "summonCardMp": 1 },
          },
          {
            id: "leader_skill",`
  const i = s.indexOf(old)
  if (i === -1) { console.error('T1 MISS'); process.exit(1) }
  crlfSave(p, s.slice(0, i) + neu + s.slice(i + old.length), crlf)
  console.log('1 counter OK')
}

// ========== 2️⃣ SkillDamage.js：4 处精灵持续回合 +1（同心） ==========
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/fight/SkillDamage.js'
  const { s, crlf } = load(p)
  const old = `const DURATION = cfg.summonDuration ?? 3;`
  const neu = `const DURATION = (cfg.summonDuration ?? 3) + (user.hasTalent?.('tong_xin') ? 1 : 0); // 🤝 同心：召唤物持续时间+1回合`
  const cnt = s.split(old).length - 1
  if (cnt !== 4) { console.error('T2 count=' + cnt); process.exit(1) }
  crlfSave(p, s.split(old).join(neu), crlf)
  console.log('2 SkillDamage OK x' + cnt)
}

// ========== 3️⃣ battle.js：每3张召唤物牌+1灵力 + 战斗开始重置 ==========
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/fight/battle.js'
  const { s, crlf } = load(p)
  // 3a. playerUseCard：useCard 后加计数
  const oldA = `    state.phase = 'resolving'
    const animDelay = useCard(card, target)
`
  const neuA = `    state.phase = 'resolving'
    const animDelay = useCard(card, target)

    // 🤝 天赋：同心 - 每打出3张召唤物牌获得1点灵力（累积，战斗开始时重置）
    if (hasTalent('tong_xin') && (getCardData(card.name) || {}).isSummon) {
      player._summonCardCount = (player._summonCardCount || 0) + 1;
      const need = talentFx('tong_xin', 'summonCardNeed', 3);
      const mpGain = talentFx('tong_xin', 'summonCardMp', 1);
      if (player._summonCardCount >= need) {
        player._summonCardCount -= need;
        player.mp = Math.min(player.maxMp, player.mp + mpGain);
        _playerInstanceCache?.showBuffText(\`🤝 同心：灵力+\${mpGain}\`);
        battleLog(\`[天赋] 同心：每\${need}张召唤物牌 +\${mpGain} 灵力\`);
      }
    }
`
  let i = s.indexOf(oldA)
  if (i === -1) { console.error('T3a MISS'); process.exit(1) }
  s = s.slice(0, i) + neuA + s.slice(i + oldA.length)

  // 3b. applyEntryBuffs 开头重置计数器
  const oldB = `function applyEntryBuffs(player, enemies) {
  // 🔥 天赋效果
  applyBattleStartTalents(player, enemies);`
  const neuB = `function applyEntryBuffs(player, enemies) {
  player._summonCardCount = 0; // 🤝 同心：召唤物牌计数战斗开始时重置
  // 🔥 天赋效果
  applyBattleStartTalents(player, enemies);`
  let j = s.indexOf(oldB)
  if (j === -1) { console.error('T3b MISS'); process.exit(1) }
  s = s.slice(0, j) + neuB + s.slice(j + oldB.length)

  crlfSave(p, s, crlf)
  console.log('3 battle OK')
}

console.log('ALL DONE')
