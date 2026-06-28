import Matter from "matter-js";

export function createEngine() {
  const engine = Matter.Engine.create({
    positionIterations: 4,
    velocityIterations: 3,
    constraintIterations: 2,
  });
  return engine;
}   