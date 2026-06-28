export function resetFastReload(card) {
  if (card._fastReloadOriginal) {
    card.cost = card._fastReloadOriginal.cost;
    card.limitPerTurn = card._fastReloadOriginal.limitPerTurn;
    delete card._fastReloadOriginal;
  }

  if (card._overclockOriginal) {
    card.cost = card._overclockOriginal.baseCost;
    delete card._overclockOriginal;
  }
}