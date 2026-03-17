import nipplejs from "nipplejs";
import { useCounterStore } from "@/store/counter";
export function createController({ joystickZone }) {

  const user = useCounterStore();
  // =========================
  // 统一输入状态（给游戏用）
  // =========================
  const keys = {
    left: { pressed: false },
    right: { pressed: false },
    space: { pressed: false }, // 跳跃
  };

  // =========================
  // 键盘控制
  // =========================
  function handleKey(e, pressed) {
    if (user.pixi.stop) {
      pressed = false
    }
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        keys.left.pressed = pressed;
        break;

      case "ArrowRight":
      case "KeyD":
        keys.right.pressed = pressed;
        break;

      case "Space":
        keys.space.pressed = pressed;
        break;
    }
  }

  window.addEventListener("keydown", (e) => handleKey(e, true));
  window.addEventListener("keyup", (e) => handleKey(e, false));

  // =========================
  // 摇杆控制
  // =========================
  const vh = window.innerHeight / 100;
  const joystick = nipplejs.create({
    zone: joystickZone,
    mode: "static",
    position: { left: "50%", bottom: "50%" },
    size: vh * 15, // ⭐ vh → px
    color: "gray",
  })[0];

  const DEAD_ZONE = 0.2;

  joystick.on("move", (evt, data) => {
    if (!data?.vector) return;
    if (user.pixi.stop) {
      return
    }
    const x = data.vector.x;

    keys.left.pressed = x < -DEAD_ZONE;
    keys.right.pressed = x > DEAD_ZONE;
  });

  joystick.on("end", () => {
    keys.left.pressed = false;
    keys.right.pressed = false;
  });

  // =========================
  // 返回给外部使用
  // =========================
  return { keys };
}
