// actionUtils.js
// 1. 角色数据整合与基础计算
export function getAllCharacters(friends, enemies) {
  // 合并友军和敌人，返回所有角色数组（不修改原数据）,全部角色
  return [...friends, ...enemies];
}

export function getAverageAgi(friends, enemies) {
  // 计算所有角色的平均敏捷值
  const allChars = getAllCharacters(friends, enemies);
  const totalAgi = allChars.reduce((sum, unit) => sum + (unit.agi || 0), 0);
  return totalAgi / allChars.length;
}


export function setHP(unit, value) {

  // 设置生命值（限制在 0~maxHp 范围内）
  unit.currentHp = Number(Math.max(0, Math.min(value, unit.maxHp)).toFixed(1));

  // 同步更新生命值百分比，保留 1 位小数
  unit.hpPercent = Number(((unit.currentHp / unit.maxHp) * 100).toFixed(1));
}

export function isDead(unit) {
  // 判定角色是否死亡（生命值 ≤ 0）
  return unit.currentHp<=0
}

// 3. 战斗伤害计算
export function calculateDamage(attacker, JN) {
  // 计算伤害（含暴击判定）
  // const isCrit = Math.random() < critRate;
  let damage;
  if (JN) {
    damage = Number((attacker.str * JN.atk).toFixed(1));
  } else {
    damage = Number((attacker.str * attacker.wuqi.atk).toFixed(1));
  }
  // 暴击伤害为 1.5 倍，向下取整
  // damage = isCrit ? Math.floor(damage * 1.5) : Math.floor(damage);
  return { damage };
}


// 6. 行动条核心逻辑
export function startActionLoop(friends, enemies, currentActor, baseChargeRate = 5) {
  // 清除已有计时器，避免重复执行
  if (window.actionTimer) {
    clearInterval(window.actionTimer);
  }

  const averageAgi = getAverageAgi(friends, enemies);

  // 用 window 挂载计时器（避免函数内变量被回收）
  window.actionTimer = setInterval(() => {
    const allChars = getAllCharacters(friends, enemies).filter(item=>item.currentHp>0);
    
    let actionTriggered = false;

    // 遍历所有角色更新行动条
    for (const unit of allChars) {
      // 计算每 0.1 秒的充能值（敏捷比例 × 基础系数）
      const charge = (unit.agi / averageAgi) * baseChargeRate;
      
      unit.actionBar += charge;

      // 行动条满了触发行动
      if (unit.actionBar >= 100) {
        unit.actionBar = 100;
        currentActor.value = unit; // 响应式变量赋值
        actionTriggered = true;
        break;
      }
    }

    // 触发行动后停止计时器
    if (actionTriggered) {
      clearInterval(window.actionTimer);
      window.actionTimer = null;
    }
  }, 100); // 每 0.1 秒刷新一次
}

export function endTurn(currentActor) {
  // 结束回合：重置当前行动者的行动条
  if (currentActor.value) {
    currentActor.value.actionBar = 0;
    currentActor.value = null;
  }
  // 无需重启循环（由 Vue 组件调用 startActionLoop 重启）
}

// 7. 回合切换逻辑
export function nextTurn(turnIndex, turnOrder, friends, battleLog, enemyAct) {
  // 更新回合索引（循环遍历回合顺序）
  turnIndex.value = (turnIndex.value + 1) % turnOrder.length;
  const currentUnit = turnOrder[turnIndex.value];

  // 若当前角色死亡，自动跳至下一个角色
  if (isDead(currentUnit)) {
    return nextTurn(turnIndex, turnOrder, friends, battleLog, enemyAct);
  }

  // 判断是否为玩家回合（友军属于玩家回合）
  const isPlayerTurn = friends.includes(currentUnit);

  // 敌人回合自动执行攻击，玩家回合添加日志
  if (!isPlayerTurn) {
    enemyAct(currentUnit); // 传入组件中的 enemyAct 函数（非纯逻辑，保留在组件）
  } else {
    battleLog.push(`轮到玩家行动：${currentUnit.name}`);
  }

  return { isPlayerTurn, canAttack: isPlayerTurn };
}

// 8. 初始化工具（生命值百分比）
export function initHpPercent(friends, enemies) {
  // 初始化所有角色的生命值百分比
  getAllCharacters(friends, enemies).forEach((unit) => {
    unit.hpPercent = Math.floor((unit.currentHp / unit.maxHp) * 100);
  });
}