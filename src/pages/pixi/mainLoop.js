export function createGameLoop({ player, npcs, collision }) {
  return (delta) => {
    // 玩家逻辑
    player.update(0, 0);

    // NPC AI
    npcs.forEach((npc) => {
      if (npc.active) npc.update(0, 0);
    });

    // 碰撞检测
    collision();
  };
}