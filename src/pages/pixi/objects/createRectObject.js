import Matter from "matter-js";
import { Sprite, Graphics } from "pixi.js";
export function createRectObject(
  x,
  y,
  w,
  h,
  {
    color = 0x000000,
    texture = null,
    zIndex = 0,
    withBody = false,
    isSensor = false,
    movable = false,
    label = null,
    create = false,
    enableAABB = false,
  } = {},
  world, worldContainer, COLLISION_GROUPS
) {
  /* ---------- view（底部中心）
  //rectPool.acquire createRectFromData---------- */

  let view;
  
  if (texture) {
    view = new Sprite(Texture.from(texture));
    view.width = w;
    view.height = h;
    view.anchor.set(0.5, 1); // ⭐ 底部中心
  } else if (create) {
    view = new Graphics()
      .rect(0, 0, w, h)
      .fill(color);

    view.pivot.set(w / 2, h);
  }
  if (create | texture) {
    view.position.set(x, y);
    view.zIndex = zIndex;
    worldContainer.addChild(view);
  }
  /* ---------- body（真实中心点） ---------- */
  let body = null;
  if (withBody) {
    body = Matter.Bodies.rectangle(
      x,
      y - h / 2, // ⭐ 关键：底部 y → 物理中心 y
      w,
      h,
      {
        isStatic: !movable,
        isSensor,
        inertia: Infinity,
        friction: movable ? 1 : 0,
        frictionStatic: movable ? 2 : 0,
        frictionAir: movable ? 0.05 : 0,
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
    body._triggered = false;
    body.view = view;
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
        Matter.Body.setPosition(body, {
          x: nx,
          y: ny - h / 2, // ⭐ 同样是底部 → 中心
        });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngle(body, 0);
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
      if (this.view?.parent) {
        this.view.parent.removeChild(this.view);
      }
    },
  };

  /* ---------- ticker（同步） ---------- */
  if (movable) {
    obj.ticker = () => {
      view.x = body.position.x;
      view.y = body.position.y + h / 2; // ⭐ 中心 → 底部
    };
    app.ticker.add(obj.ticker);
  }
  return obj;
}