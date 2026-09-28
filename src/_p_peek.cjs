const fs = require('fs');
const s = fs.readFileSync('D:/youxi/fvnyouxi/src/store/counter.js', 'utf8');
for (const id of ['kill_spread_damage', 'mana_atk_stack', 'luck_god_chosen', 'element_fission']) {
  const i = s.indexOf("id: '" + id + "'");
  console.log('==== ' + id + ' ====');
  console.log(JSON.stringify(s.slice(i - 30, i + 560)));
}
