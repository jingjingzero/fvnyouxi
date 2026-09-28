// 一次性补丁：13 个缺失 effect 的天赋补 effect + description/levelDescriptions 模板化
const fs = require('fs');
const file = 'D:/youxi/fvnyouxi/src/store/counter.js';
let s = fs.readFileSync(file, 'utf8');

// 注意：desc 中 ${eff.xxx} 必须写成 \\${eff.xxx} 防止 JS 模板求值
const PATCHES = [
  { id: 'kill_spread_damage',        effect: '{ transferPct: 0.6 }',                            desc: '击杀敌人时，溢出伤害的\\${eff.transferPct}%由最近敌方单位全额承受' },
  { id: 'mana_cycle_free',           effect: '{ manaCost: 6 }',                                 desc: '每消耗\\${eff.manaCost}点魔力，本回合内下一张卡牌无需消耗魔力' },
  { id: 'mana_cd_reduce',            effect: '{ manaCost: 4, cdReduce: 1 }',                    desc: '每消耗\\${eff.manaCost}点魔力，随机一张卡牌冷却回合减少\\${eff.cdReduce}' },
  { id: 'mana_atk_stack',            effect: '{ atkPerMana: 0.01, atkPerManaPerLv: 0.0025 }',   desc: '每消耗1点魔力，攻击力+\\${eff.atkPerMana}%' },
  { id: 'mana_missile',              effect: '{ dmgBase: 0.2, dmgPerLv: 0.025 }',               desc: '每消耗1点魔力，随机对一名敌人造成\\${eff.dmgBase}%攻击力伤害' },
  { id: 'card_heal_regen',           effect: '{ healPct: 0.015 }',                              desc: '每打出一张手牌，恢复自身\\${eff.healPct}%最大生命值' },
  { id: 'card_master',               effect: '{ extraCards: 1, extraCardsPerLv: 1 }',           desc: '可携带的卡牌数量提升 \\${eff.extraCards}' },
  { id: 'shield_damage_up',          effect: '{ dmgBonus: 0.15, dmgBonusPerLv: 0.05 }',         desc: '护盾存在时，最终伤害+\\${eff.dmgBonus}%' },
  { id: 'luck_grace',                effect: '{ expMult: 0.15, expMultPerLv: 0.075 }',          desc: '击败魔物获得经验提升\\${eff.expMult}%' },
  { id: 'luck_god_chosen',           effect: '{ prob: 0.2, mult: 0.5, dmgProb: 0.2, dmgReduce: 0.5 }', desc: '自身造成伤害有\\${eff.prob}%概率提升\\${eff.mult}%，受到攻击有\\${eff.dmgProb}%概率减免\\${eff.dmgReduce}%伤害' },
  { id: 'element_derivative_dmg',    effect: '{ dmgBase: 0.15, dmgPerLv: 0.075 }',              desc: '触发元素反应后，额外造成\\${eff.dmgBase}%攻击力伤害' },
  { id: 'element_residual',          effect: '{ reactBonus: 0.03, reactBonusPerLv: 0.005 }',    desc: '敌人受到元素反应伤害后，后续元素反应伤害提升\\${eff.reactBonus}%' },
  { id: 'element_fission',           effect: '{ addStatus: 1 }',                                desc: '触发元素反应后，为敌人随机附加\\${eff.addStatus}种自身未拥有的元素异常状态' },
];

for (const p of PATCHES) {
  const i = s.indexOf("id: '" + p.id + "'");
  if (i < 0) throw new Error('NOT FOUND: ' + p.id);

  // 1) 替换 description 行
  const dRe = /(description: ")[^"]*(",)/;
  const dSub = s.slice(i, i + 800);
  if (!dRe.test(dSub)) throw new Error('DESC MISS: ' + p.id);
  // 在整段中只替换该块内的第一处（用 i 限定范围）
  const head = s.slice(0, i);
  const tail = s.slice(i);
  const tail2 = tail.replace(dRe, '$1' + p.desc + '$2');
  s = head + tail2;

  // 2) 取 maxLevel
  const mlRe = s.slice(i, i + 900).match(/maxLevel: (\d+)/);
  if (!mlRe) throw new Error('MAXLV MISS: ' + p.id);
  const maxLv = Number(mlRe[1]);

  // 3) 替换 levelDescriptions 数组（单行）
  const lvArr = JSON.stringify(Array(maxLv).fill(p.desc.replace(/\\\$/g, '$')));
  const lvRe = /(levelDescriptions: \[)[\s\S]*?(\],)/;
  const i2 = s.indexOf("levelDescriptions:", i);
  const head2 = s.slice(0, i2);
  const tail3 = s.slice(i2);
  const tail4 = tail3.replace(lvRe, '$1' + lvArr + '$2');
  s = head2 + tail4;

  // 4) 在 maxLevel: 前插入 effect
  const i3 = s.indexOf("maxLevel:", i);
  const head3 = s.slice(0, i3);
  const tail5 = s.slice(i3);
  s = head3 + 'effect: ' + p.effect + ',\r\n        ' + tail5;

  console.log('PATCHED:', p.id, 'maxLv=' + maxLv);
}

fs.writeFileSync(file, s, 'utf8');
console.log('DONE');
