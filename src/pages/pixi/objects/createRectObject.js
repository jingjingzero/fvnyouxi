import Matter from "matter-js";
import { Sprite, Graphics, Texture } from "pixi.js";
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
    isStatic = false,
    label = null,
    create = false,
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
        isStatic: !isStatic,
        isSensor,
        inertia: Infinity,
        // 🎯 摩擦：与玩家一致用 0（玩家移动靠 setVelocity 代码控制，不依赖物理摩擦）。
        //    Matter 实际摩擦 = min(两碰撞体摩擦)，统一 0 保证贴墙跳不被向下静摩擦拉住。
        friction: 0,        //【滑动摩擦】
        frictionStatic: 0,  //【静摩擦】
        frictionAir:0,        //【空气阻力】
        density:  undefined,//刚体密度（重量
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask:
            COLLISION_GROUPS.FRIEND |
            COLLISION_GROUPS.ENEMY |
            COLLISION_GROUPS.OBSTACLE |
            COLLISION_GROUPS.BULLET |
            COLLISION_GROUPS.SENSOR,
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
  return obj;
}