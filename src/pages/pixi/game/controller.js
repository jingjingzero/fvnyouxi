// src/game/controller.js
import nipplejs from "nipplejs";

export function createController(joystickContainer) {
  const keys = {
    left: { pressed: false, doubleTap: false, last: 0 },
    right: { pressed: false, doubleTap: false, last: 0 },
    down: { pressed: false },
    space: { pressed: false },
  };

  /** ===== 键盘控制 ===== */
  function handleKey(e, pressed) {
    let key;
    if (e.code === "ArrowLeft" || e.code === "KeyA") key = keys.left;
    if (e.code === "ArrowRight" || e.code === "KeyD") key = keys.right;
    if (e.code === "ArrowDown" || e.code === "KeyS") key = keys.down;
    if (e.code === "Space") key = keys.space;
    if (!key) return;

    if (pressed && !key.pressed && key.last !== undefined) {
      const now = performance.now();
      key.doubleTap = now - key.last < 250;
      key.last = now;
    }

    key.pressed = pressed;
    if (!pressed && key.doubleTap !== undefined) key.doubleTap = false;
  }

  window.addEventListener("keydown", (e) => handleKey(e, true));
  window.addEventListener("keyup", (e) => handleKey(e, false));

  /** ===== 摇杆控制 ===== */
  const joystick = nipplejs.create({
    zone: joystickContainer,
    mode: "static",
    position: { left: "100px", bottom: "100px" },
    color: "#888",
    size: 100,
    restOpacity: 0.3,
  });

  joystick.on("move", (_, data) => {
    if (!data || !data.angle) return;
    const angle = data.angle.degree;

    if (angle >= 135 && angle <= 225) {
      keys.left.pressed = true;
      keys.right.pressed = false;
    } else if (angle <= 45 || angle >= 315) {
      keys.right.pressed = true;
      keys.left.pressed = false;
    } else {
      keys.left.pressed = false;
      keys.right.pressed = false;
    }
  });

  joystick.on("end", () => {
    keys.left.pressed = false;
    keys.right.pressed = false;
  });

  return { keys };
}
