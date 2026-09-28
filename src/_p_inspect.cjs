const fs = require('fs');
const s = fs.readFileSync('D:/youxi/fvnyouxi/src/store/counter.js', 'utf8');
for (const id of ['mana_atk_stack', 'mana_missile', 'card_master', 'shield_damage_up', 'luck_grace', 'element_derivative_dmg', 'element_residual']) {
  const i = s.indexOf("id: '" + id + "'");
  const seg = s.slice(i, i + 800);
  const lv = seg.match(/maxLevel: (\d+)/);
  const lvd = seg.match(/levelDescriptions: (\[[^\]]*\])/);
  console.log(id, 'maxLv=' + (lv && lv[1]), 'lvds.len=' + (lvd ? JSON.parse(lvd[1]).length : '?'));
  if (lvd) {
    const arr = JSON.parse(lvd[1]);
    arr.forEach((x, idx) => console.log('   lv' + (idx + 1) + ':', JSON.stringify(x)));
  }
}
