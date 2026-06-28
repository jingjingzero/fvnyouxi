import { createElevator } from "./daoju.js";
export const allElevators = [];

export function setupCollisionStart(engine, Matter, VH, physicsWorker) {
  let triggerCooldown = false;

  Matter.Events.on(engine, "collisionStart", (event) => {
    for (const { bodyA, bodyB } of event.pairs) {
      onCollision(bodyA, bodyB);

      const playerA = bodyA.parent?.gameObject;
      const playerB = bodyB.parent?.gameObject;
      const isPlayer = (playerA?.data?.player === 1) || (playerB?.data?.player === 1);
      const isTriggerA = bodyA.label === "teleportTrigger";
      const isTriggerB = bodyB.label === "teleportTrigger";
      const hitTrigger = isTriggerA || isTriggerB;

      if (isPlayer && hitTrigger && !triggerCooldown) {
        triggerCooldown = true;
        setTimeout(() => triggerCooldown = false, 500);
      }
    
      // ====================== 电梯 ======================
      if (bodyA.label?.name === "电梯" && bodyB.label === "playerFoot") {
        const player = bodyB.parent.gameObject;

        if (!bodyA.label.elevatorId) {
          const id = "elev_" + Date.now() + Math.random();
          bodyA.label.elevatorId = id;
          bodyA.label.elevatorBody = bodyA;

          // 发给 Worker 初始化
          physicsWorker.postMessage({
            type: "elevator:init",
            id,
            bodyY: bodyA.position.y * 1.0595,
            VH
          });
        }

        // 通知 Worker：玩家进入
        physicsWorker.postMessage({
          type: "elevator:enter",
          id: bodyA.label.elevatorId,
          playerId: player.data.id
        });
      }
    }
  });
}

export function setupCollisionEnd(engine, Matter, physicsWorker) {
  Matter.Events.on(engine, "collisionEnd", (event) => {
    for (const { bodyA, bodyB } of event.pairs) {
      if (bodyA.label === "playerFoot") {
        const obj = bodyA.parent.gameObject;
        if (obj) { obj.groundContacts--; obj.isOnGround = obj.groundContacts > 0; }
      }
      if (bodyB.label === "playerFoot") {
        const obj = bodyB.parent.gameObject;
        if (obj) { obj.groundContacts--; obj.isOnGround = obj.groundContacts > 0; }
      }

      // 离开电梯
      if (bodyA.label?.name === "电梯" && bodyB.label === "playerFoot") {
        const player = bodyB.parent.gameObject;
        if (bodyA.label.elevatorId) {
          physicsWorker.postMessage({
            type: "elevator:leave",
            id: bodyA.label.elevatorId,
            playerId: player.data.id
          });
        }
      }
    }
  });
}

function onCollision(bodyA, bodyB) {
  if (bodyA.label === "playerFoot") { const o = bodyA.parent.gameObject; o && (o.groundContacts++, o.isOnGround = true); }
  if (bodyB.label === "playerFoot") { const o = bodyB.parent.gameObject; o && (o.groundContacts++, o.isOnGround = true); }
}

function myTriggerFunction() { }