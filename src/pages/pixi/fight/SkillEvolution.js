export function getEvolutionBuff(card) {
  const buff = { critRate: 0, critMul: 1, ignoreArmor: 0 };
  if (!card || !card.activeEvos) return buff;
  if (card.name === '射击') {
    if (card.activeEvos.includes('概率暴击')) {
      buff.critRate = 0.5; buff.critMul = 1.4;
    }
    if (card.activeEvos.includes('破甲')) {
      buff.ignoreArmor = 0.3;
    }
  } else if (card.name === '激光') {
    if (card.activeEvos.includes('概率暴击')) {
      buff.critRate = 0.5; buff.critMul = 1.4;
    }
    if (card.activeEvos.includes('破甲')) {
      buff.ignoreArmor = 0.3;
    }
  }
  return buff;
}