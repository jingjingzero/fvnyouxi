// 校验：13 个补丁天赋全等级渲染
const fs = require('fs');
const s = fs.readFileSync('D:/youxi/fvnyouxi/src/store/counter.js', 'utf8');
const m = s.match(/const DEFAULT_TALENT_CONFIG_SNAPSHOT = \[[\s\S]*?^        \];/m);
const arr = Function('return [' + m[0].slice(m[0].indexOf('[') + 1, m[0].lastIndexOf(']')) + ']')();

// 复刻 __fmtTalentText
const EFF_LV_PAIR = { basePct: 'perLvPct', baseProb: 'probPerLv', baseRate: 'perLvRate', baseProgress: 'perLvProgress', thresholdBase: 'thresholdPerLv', dmgBase: 'dmgPerLv', baseLuck: 'perLvLuck', baseMp: 'mpPerLv', needCards: 'perLvCards', atkPerMana: 'atkPerManaPerLv', extraCards: 'extraCardsPerLv', dmgBonus: 'dmgBonusPerLv', expMult: 'expMultPerLv', reactBonus: 'reactBonusPerLv' };
const EFF_PCT100 = new Set(['atkPct', 'atkBuffPct', 'dmgBonus', 'takenReduce', 'dropMult', 'vulnPct', 'healPct', 'shieldPct', 'hpRate', 'selfHurtPct', 'transferPct', 'perLv', 'perLvPct', 'baseProb', 'probPerLv', 'perStackRate', 'incProb', 'maxRate', 'thresholdBase', 'thresholdPerLv', 'dmgBase', 'dmgPerLv', 'baseRate', 'perLvRate', 'atkPerMana', 'atkPerManaPerLv', 'dmgBonusPerLv', 'expMult', 'expMultPerLv', 'reactBonus', 'reactBonusPerLv', 'prob', 'mult', 'dmgProb', 'dmgReduce']);
function valAt(t, k, lv) {
  const e = (t && t.effect) || {};
  if (e[k] === undefined || e[k] === null) return '';
  const p = EFF_LV_PAIR[k];
  if (p && e[p] !== undefined) return Number(e[k]) + Number(e[p]) * Math.max(0, (lv || 1) - 1);
  if (k === 'perLv' || (typeof k === 'string' && k.endsWith('PerLv'))) return Number(e[k]) * Math.max(1, lv || 1);
  return e[k];
}
function fmt(k, v) {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (EFF_PCT100.has(k)) return String(Math.round(n * 10000) / 100);
  return String(Math.round(n * 100) / 100);
}
function render(text, t, lv) {
  return String(text).replace(/\$\{eff\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (mm, k) => {
    const v = valAt(t, k, lv);
    if (v === '' || v === null || v === undefined) return mm;
    return fmt(k, v);
  });
}

const ids = ['kill_spread_damage', 'mana_cycle_free', 'mana_cd_reduce', 'mana_atk_stack', 'mana_missile', 'card_heal_regen', 'card_master', 'shield_damage_up', 'luck_grace', 'luck_god_chosen', 'element_derivative_dmg', 'element_residual', 'element_fission'];
let bad = 0;
for (const id of ids) {
  const t = arr.find(x => x.id === id);
  if (!t) { console.log('!! MISSING', id); bad++; continue; }
  if (!t.effect) { console.log('!! NO EFFECT', id); bad++; continue; }
  const desc = render(t.description, t, 1);
  if (desc.includes('${')) { console.log('!! RESIDUAL', id, desc); bad++; }
  for (let lv = 1; lv <= t.maxLevel; lv++) {
    const d = render(t.levelDescriptions[lv - 1], t, lv);
    if (d.includes('${')) { console.log('!! RESIDUAL LV' + lv, id, d); bad++; }
    if (lv === t.maxLevel) console.log('  ' + id + ' [' + t.name.trim() + '] Lv' + lv + ': ' + d);
  }
}
console.log(bad === 0 ? 'ALL_RENDER_OK' : 'BAD=' + bad);
