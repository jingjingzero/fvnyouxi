// drag.js
export function useCardDrag(cards, vh, onDrop) {
  let current = null

  function startDrag(e, card) {
    if (e.cancelable) e.preventDefault()
    current = card
    card.dragging = true

    const pageX = e.touches ? e.touches[0].pageX : e.pageX
    const pageY = e.touches ? e.touches[0].pageY : e.pageY

    card.offsetX = pageX - card.x
    card.offsetY = pageY - card.y

    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchmove', onDrag)
    window.addEventListener('touchend', endDrag)
  }

  function onDrag(e) {
    if (!current) return
    const pageX = e.touches ? e.touches[0].pageX : e.pageX
    const pageY = e.touches ? e.touches[0].pageY : e.pageY

    current.x = pageX - current.offsetX
    current.y = pageY - current.offsetY
  }

  function endDrag() {
    if (!current) return

    // 🔹 判断卡牌是否拖到屏幕上方超过 centerY
    // 使用 vh 来计算触发点：比如超过屏幕高度的 50% 就出牌
    const triggerY = vh * 0.5 // 50vh 以上触发出牌

    if (current.y < triggerY) {
      onDrop(current)
    } else {
      // 回到底部卡槽位置
      current.x = current.baseX
      current.y = current.baseY
    }

    current.dragging = false
    current = null

    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', endDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('touchend', endDrag)
  }

  return { startDrag }
}