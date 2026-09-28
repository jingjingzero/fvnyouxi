import Matter from "matter-js";

export function createEngine() {
const engine = Matter.Engine.create({
  positionIterations: 6,
  velocityIterations: 4,
  constraintIterations: 2,
   // ✅ 使用 Matter 自带重力（角色仍需下落接触地面；跳跃功能已单独删除）
   //    gravity.y * scale = 0.2 / 277.8 ≈ 0.00072，手感与屏高归一化由 matter.vue 覆盖
   gravity: { x: 0, y: 1, scale: 0.00072 }
});
  return engine;
}   