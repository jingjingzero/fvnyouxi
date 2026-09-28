// ==============================================
// 🎯 暴击机制已移除：暴击率/暴击伤害不再参与结算（星级不再提供暴击率）
//    保留 getEvolutionBuff 签名与 ignoreArmor 字段，兼容 NewCards 调用
// ==============================================
export function getEvolutionBuff(card) {
  const buff = { critRate: 0, critMul: 1, ignoreArmor: 0 };
  if (!card) return buff;
  return buff;
}