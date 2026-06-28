//增益buff

// 拉条 50%（立刻跳半格，瞬时）
battle.advance(player, 50)

// 推条 50%（立刻退半格，瞬时）
battle.pushback(enemy, 50)

// 加速 20%，持续 2 回合
battle.addSpeedBuff(player, 20, 2)

// 减速 20%，持续 2 回合
battle.addSlowBuff(enemy, 20, 2)

/* ===== 出牌逻辑 ===== */
function useCard(card) {
    // 出牌后拉条50%
    battle.advance(player, 50)

    card.x = card.baseX
    card.y = card.baseY
    card.dragging = false
}

// 基础概率 50%
// 幸运 0 → 50%
// 幸运 50 → 66.7%
// 幸运 100 → 75%
// 幸运 200 → 83.3%
// 幸运 500 → 91.7%
// 幸运 1000 → 95.5%
// 幸运 无限大 → 无限接近 100%
// 如果基础概率是 30%
// 幸运 0 → 30%
// 幸运 100 → 45%
// 幸运 200 → 48%
// 最终概率 = 基础概率 + (1 - 基础概率) × (幸运 / (100 + 幸运))




// 开启昼夜滤镜（和体积光共用bgContainer）
createDayNightFilter(bgContainer, app);

// 关闭昼夜
removeDayNightFilter();

// 调昼夜流速（更快天黑天亮）
setDayNightSpeed(0.001);

// 手动设置到深夜
setDayTime(0.5);

// 判断是否开启
if(isDayNightActive()){}

// 获取滤镜实例
const filter = getDayNightFilter();