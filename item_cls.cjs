const fs = require('fs')
const crlfSave = (p, s, crlf) => fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8')
const load = (p) => { const raw = fs.readFileSync(p, 'utf8'); return { s: raw.replace(/\r\n/g, '\n'), crlf: raw.includes('\r\n') } }

// ========== xinxiUtils.js ==========
{
  const p = 'D:/youxi/fvnyouxi/src/pages/pixi/player/xinxiUtils.js'
  const { s, crlf } = load(p)
  const oldA = `  if (item.shiyong) return 'consumable'; // 🧪 消耗品（药水等）优先
  if (item.isItem) return 'item';`
  const neuA = `  if (item.isItem && item.buffs) return 'item'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return 'consumable'; // 🧪 消耗品（药水等）
  if (item.isItem) return 'item';`
  let i = s.indexOf(oldA)
  if (i === -1) { console.error('U1 MISS'); process.exit(1) }
  s = s.slice(0, i) + neuA + s.slice(i + oldA.length)

  const oldB = `  if (item.shiyong) return '消耗品'; // 🧪 消耗品（药水等）优先
  if (item.isItem) return '道具';`
  const neuB = `  if (item.isItem && item.buffs) return '道具'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return '消耗品'; // 🧪 消耗品（药水等）
  if (item.isItem) return '道具';`
  let j = s.indexOf(oldB)
  if (j === -1) { console.error('U2 MISS'); process.exit(1) }
  s = s.slice(0, j) + neuB + s.slice(j + oldB.length)
  crlfSave(p, s, crlf)
  console.log('xinxiUtils OK')
}

// ========== BagPanel.vue ==========
{
  const p = 'D:/youxi/fvnyouxi/src/components/BagPanel.vue'
  const { s, crlf } = load(p)
  const oldA = `  if (item.shiyong) return 'consumable';
  if (item.isItem) return 'item';`
  const neuA = `  if (item.isItem && item.buffs) return 'item'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return 'consumable';
  if (item.isItem) return 'item';`
  let i = s.indexOf(oldA)
  if (i === -1) { console.error('B1 MISS'); process.exit(1) }
  s = s.slice(0, i) + neuA + s.slice(i + oldA.length)

  const oldB = `  if (item.shiyong) return '消耗品';
  if (item.isItem) return '道具';`
  const neuB = `  if (item.isItem && item.buffs) return '道具'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return '消耗品';
  if (item.isItem) return '道具';`
  let j = s.indexOf(oldB)
  if (j === -1) { console.error('B2 MISS'); process.exit(1) }
  s = s.slice(0, j) + neuB + s.slice(j + oldB.length)
  crlfSave(p, s, crlf)
  console.log('BagPanel OK')
}

console.log('ALL DONE')
