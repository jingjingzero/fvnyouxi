// drag.js
/**
 * 卡牌拖拽系统
 * @param {Array} cards - 卡牌数组
 * @param {number} vh - 视口高度
 * @param {Function} onDrop - 释放回调 (card, targetEnemy?)
 * @param {Object} options - 扩展选项
 * @param {Function} options.getEnemyAtPosition - 根据坐标获取敌人 (x, y) => enemy
 * @param {Function} options.onTargetHover - 悬停敌人变化回调 (enemy | null)
 * @param {Function} options.onDragStart - 拖拽开始回调 (card)
 * @param {Function} options.onDragUpdate - 拖拽更新回调 (card)
 * @param {Function} options.onDragEnd - 拖拽结束回调 (card)
 */
export function useCardDrag(cards, vh, onDrop, options = {}) {
  const { getEnemyAtPosition, onTargetHover, onDragStart, onDragUpdate, onDragEnd } = options;
  let current = null;
  let hoveredEnemy = null; // 当前悬停的目标敌人

  function startDrag(e, card) {
    if (e.cancelable) e.preventDefault();
    current = card;
    card.dragging = true;

    const pageX = e.touches ? e.touches[0].pageX : e.pageX;
    const pageY = e.touches ? e.touches[0].pageY : e.pageY;

    card.offsetX = pageX - card.x;
    card.offsetY = pageY - card.y;

    // 通知拖拽开始（用于创建粒子特效等）
    onDragStart?.(card);

    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', onDrag);
    window.addEventListener('touchend', endDrag);
  }

  function onDrag(e) {
    if (!current) return;
    const pageX = e.touches ? e.touches[0].pageX : e.pageX;
    const pageY = e.touches ? e.touches[0].pageY : e.pageY;

    current.x = pageX - current.offsetX;
    current.y = pageY - current.offsetY;

    // 通知拖拽更新（用于更新粒子位置）
    onDragUpdate?.(current);

    // 需要指定目标的卡牌：检测是否悬停在敌人身上
    // 🎯 用鼠标/手指的真实位置（pageX/pageY）做命中检测，而不是卡牌左上角（current.x/y）：
    //    卡牌很大（20vh 宽），拖到敌人身上时卡牌左上角可能离敌人超过检测半径 → 永远选不中
    if (current.needTarget && getEnemyAtPosition) {
      const enemy = getEnemyAtPosition(pageX, pageY);
      // 只有悬停目标变化时才触发回调（避免频繁调用）
      if (enemy?.uid !== hoveredEnemy?.uid) {
        hoveredEnemy = enemy || null;
        onTargetHover?.(hoveredEnemy);
      }
    }
  }

  function endDrag() {
    if (!current) return;

    // 通知拖拽结束（用于销毁粒子特效）
    onDragEnd?.(current);

    const triggerY = vh * 0.5; // 50vh 以上触发出牌（普通卡牌）
    const triggerXRight = window.innerWidth * 0.75; // 拖到屏幕右侧75%以外也触发

    if (current.needTarget) {
      // ===== 指定目标卡牌：必须拖到敌人身上才释放 =====
      if (hoveredEnemy) {
        onDrop(current, hoveredEnemy);
      } else {
        // 没拖到敌人身上 → 回到底部卡槽
        current.x = current.baseX;
        current.y = current.baseY;
      }
    } else {
      // ===== 普通卡牌：拖到屏幕上方 或 拖到屏幕右侧就释放 =====
      if (current.y < triggerY || current.x > triggerXRight) {
        onDrop(current);
      } else {
        current.x = current.baseX;
        current.y = current.baseY;
      }
    }

    // 清理悬停高亮
    if (hoveredEnemy) {
      onTargetHover?.(null);
      hoveredEnemy = null;
    }

    current.dragging = false;
    current = null;

    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('touchmove', onDrag);
    window.removeEventListener('touchend', endDrag);
  }

  return { startDrag };
}
