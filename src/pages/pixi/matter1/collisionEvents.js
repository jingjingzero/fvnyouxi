// 存储当前有效的"地面接触"碰撞对 ID，用于 collisionEnd 精确匹配
const _groundContactPairs = new Set();

// 从 Matter 碰撞体中获取 gameObject（复合体的 part 需要通过 .parent）
function _getGameObj(body) {
  return body.parent?.gameObject || body.gameObject;
}

export function setupCollisionStart(engine, Matter, VH, physicsWorker) {
  let triggerCooldown = false;

  Matter.Events.on(engine, "collisionStart", (event) => {
    const pairs = event.pairs;
    for (let i = 0, len = pairs.length; i < len; i++) {
      const pair = pairs[i];
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // ---- 地面检测（基于 footSensor 脚部传感器） ----
      // footSensor（isSensor）与 OBSTACLE 碰撞 → 角色接触地面
      if (bodyA.label === "footSensor") {
        const obj = _getGameObj(bodyA);
        if (obj) {
          _groundContactPairs.add(pair.id);
          obj.groundContacts++;
          obj.isOnGround = true;
          continue;
        }
      }
      if (bodyB.label === "footSensor") {
        const obj = _getGameObj(bodyB);
        if (obj) {
          _groundContactPairs.add(pair.id);
          obj.groundContacts++;
          obj.isOnGround = true;
          continue;
        }
      }

      // ---- 传送触发器检测 ----
      const playerA = _getGameObj(bodyA);
      const playerB = _getGameObj(bodyB);
      const isPlayer = (playerA?.data?.player === 1) || (playerB?.data?.player === 1);
      const hitTrigger = bodyA.label === "teleportTrigger" || bodyB.label === "teleportTrigger";

      if (isPlayer && hitTrigger && !triggerCooldown) {
        triggerCooldown = true;
        const timer = setTimeout(() => triggerCooldown = false, 500);
        engine.collisionTimers ??= [];
        engine.collisionTimers.push(timer);
      }
    }
  });
}

export function setupCollisionEnd(engine, Matter, physicsWorker) {
  Matter.Events.on(engine, "collisionEnd", (event) => {
    const pairs = event.pairs;
    for (let i = 0, len = pairs.length; i < len; i++) {
      const pair = pairs[i];
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // 只处理之前标记为地面接触的碰撞对
      if (!_groundContactPairs.has(pair.id)) continue;
      _groundContactPairs.delete(pair.id);

      // footSensor 可能在 bodyA 或 bodyB
      const obj = (bodyA.label === "footSensor" ? _getGameObj(bodyA) : _getGameObj(bodyB));
      if (obj) {
        obj.groundContacts--;
        obj.isOnGround = obj.groundContacts > 0;
      }
    }
  });
}