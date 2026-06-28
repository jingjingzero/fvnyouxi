import Matter from "matter-js";
import { Graphics } from "pixi.js";

export function createTriangleObject(
  x,
  y,
  w,
  h,
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
  const verts = [
    { x: -w / 2, y: h / 2 },
    { x: w / 2, y: h / 2 },
    { x: 0, y: -h / 2 },
  ];

  /* ---------- view（底部中心） ---------- */
  const view = new Graphics();
  view.beginFill(color);
  view.moveTo(verts[0].x, verts[0].y);
  view.lineTo(verts[1].x, verts[1].y);
  view.lineTo(verts[2].x, verts[2].y);
  view.closePath();
  view.endFill();

  view.pivot.set(0, h / 2); // ⭐ 底部中心
  view.position.set(x, y);
  view.zIndex = zIndex;
  worldContainer.addChild(view);

  /* ---------- body ---------- */
  let body = null;
  if (withBody) {
    body = Matter.Bodies.fromVertices(
      x,
      y - h / 2, // ⭐ 底部 → 中心
      verts,
      {
        isStatic: !movable,
        isSensor,
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask:
            COLLISION_GROUPS.FRIEND |
            COLLISION_GROUPS.ENEMY |
            COLLISION_GROUPS.OBSTACLE |
            COLLISION_GROUPS.BULLET,
        },
        label,
      },
      true
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
        Matter.Body.setPosition(body, { x: nx, y: ny - h / 2 });
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
    obj.ticker = bindViewToBodyBottom(view, body, h / 2);
    app.ticker.add(obj.ticker);
  }

  return obj;
}