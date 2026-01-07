import nipplejs from "nipplejs";

export function createController({ joystickZone }) {
  const keys = {
    left: { pressed: false, doubleTap: false, last: 0 },
    right: { pressed: false, doubleTap: false, last: 0 },
    down: { pressed: false },
    space: { pressed: false },
  };

  // ===== 键盘控制 =====
  function handle(e, pressed) {
    let key;
    
    if (e.code === "ArrowLeft" || e.code === "KeyA") key = keys.left;
    if (e.code === "ArrowRight" || e.code === "KeyD") key = keys.right;
    if (!key) return;

    if (pressed && !key.pressed && key.last !== undefined) {
      const now = performance.now();
      key.doubleTap = now - key.last < 250;
      key.last = now;
    }

    key.pressed = pressed;
    if (!pressed && key.doubleTap !== undefined) key.doubleTap = false;
  }

  window.addEventListener("keydown", (e) => handle(e, true));
  window.addEventListener("keyup", (e) => handle(e, false));

  // ===== 摇杆控制 =====
  const joystick = nipplejs.create({
    zone: joystickZone, // ❗必须是 DOM 节点
    mode: "static",
    position: { left: "50%", bottom: "50%" },
    size: 100,
    color: "gray",
  })[0];

  const threshold = 0.2;

  joystick.on("move", (evt, data) => {
    if (!data || !data.vector) return;
    const x = data.vector.x;

    keys.left.pressed = x < -threshold;
    keys.right.pressed = x > threshold;
  });

  joystick.on("end", () => {
    keys.left.pressed = false;
    keys.right.pressed = false;
  });

  return { keys };
}
