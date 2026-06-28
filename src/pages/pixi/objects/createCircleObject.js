import Matter from "matter-js";
import { Graphics } from "pixi.js";

export function createCircleObject(
  x,
  y,
  r,
  {
    color = 0x000000,
    zIndex = 0,
    withBody = true,
    isSensor = false,
    movable = false,
    label = null,
  } = {},
  world,worldContainer,COLLISION_GROUPS
) {
  /* ---------- view（底部中心） ---------- */
  const view = new Graphics();
  view.beginFill(color);
  view.drawCircle(0, 0, r);
  view.endFill();

  view.pivot.set(0, r); // ⭐ 底部中心
  view.position.set(x, y);
  view.zIndex = zIndex;
  worldContainer.addChild(view);

  /* ---------- body（真实中心） ---------- */
  let body = null;
  if (withBody) {
    body = Matter.Bodies.circle(
      x,
      y - r, // ⭐ 底部 → 圆心
      r,
      {
        isStatic: !movable,
        isSensor,
        friction: movable ? 0.1 : 0,
        frictionStatic: movable ? 0.2 : 0,
        frictionAir: movable ? 0.02 : 0,
        density: movable ? 0.002 : undefined,
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask:
            COLLISION_GROUPS.FRIEND |
            COLLISION_GROUPS.ENEMY |
            COLLISION_GROUPS.OBSTACLE |
            COLLISION_GROUPS.BULLET,
        },
        label,
      }
    );
    Matter.World.add(world, body);
  }

  /* ---------- GameObject ---------- */
  const obj = {
    view,
    body,
    active: true,
    ticker: null,

    reset(nx, ny) {
      view.position.set(nx, ny);
      if (body) {
        Matter.Body.setPosition(body, { x: nx, y: ny - r });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      }
    },

    destroy() {
      if (this.ticker) {
        app.ticker.remove(this.ticker);
        this.ticker = null;
      }
      if (this.body) {
        Matter.World.remove(world, this.body);
        this.body = null;
      }
      this.view?.parent?.removeChild(this.view);
    },
  };

  /* ---------- ticker ---------- */
  if (movable && body) {
    obj.ticker = bindViewToBodyBottom(view, body, r);
    app.ticker.add(obj.ticker);
  }

  return obj;
}