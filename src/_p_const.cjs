// 扩展渲染常量：counter.js __T_EFF_* 与 TalentTree.vue EFF_*
const fs = require('fs');
const cfile = 'D:/youxi/fvnyouxi/src/store/counter.js';
const tfile = 'D:/youxi/fvnyouxi/src/pages/pixi/player/TalentTree.vue';

// 新配对：base -> perLv
const NEW_PAIRS = "atkPerMana: 'atkPerManaPerLv', extraCards: 'extraCardsPerLv', dmgBonus: 'dmgBonusPerLv', expMult: 'expMultPerLv', reactBonus: 'reactBonusPerLv'";
// 新百分比集合
const NEW_PCT = "atkPerMana', 'atkPerManaPerLv', 'dmgBonusPerLv', 'expMult', 'expMultPerLv', 'reactBonus', 'reactBonusPerLv', 'prob', 'mult', 'dmgProb', 'dmgReduce";

function patchCounter(s) {
  // __T_EFF_LV_PAIR
  const p1 = s.match(/const __T_EFF_LV_PAIR = \{[^}]*\}/);
  if (!p1) throw new Error('LV_PAIR not found');
  s = s.replace(p1[0], p1[0].replace(/\}$/, ', ' + NEW_PAIRS + ' }'));
  // __T_EFF_PCT100
  const p2 = s.match(/const __T_EFF_PCT100 = new Set\(\[[^\]]*\]\)/);
  if (!p2) throw new Error('PCT100 not found');
  s = s.replace(p2[0], p2[0].replace(/\]\)$/, ", '" + NEW_PCT + "'])"));
  return s;
}
function patchTalent(s) {
  const p1 = s.match(/const EFF_LV_PAIR = \{[^}]*\}/);
  if (!p1) throw new Error('T LV_PAIR not found');
  s = s.replace(p1[0], p1[0].replace(/\}$/, ', ' + NEW_PAIRS + ' }'));
  const p2 = s.match(/const EFF_PCT100 = new Set\(\[[^\]]*\]\)/);
  if (!p2) throw new Error('T PCT100 not found');
  s = s.replace(p2[0], p2[0].replace(/\]\)$/, ", '" + NEW_PCT + "'])"));
  return s;
}

let c = fs.readFileSync(cfile, 'utf8');
let t = fs.readFileSync(tfile, 'utf8');
c = patchCounter(c);
t = patchTalent(t);
fs.writeFileSync(cfile, c, 'utf8');
fs.writeFileSync(tfile, t, 'utf8');
console.log('CONST PATCHED');
