export function createController() {
  const keys = {
    left: { pressed: false, doubleTap: false, last: 0 },
    right: { pressed: false, doubleTap: false, last: 0 },
    down: { pressed: false },
    space: { pressed: false },
  };

  function handle(e, pressed) {
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

  window.addEventListener("keydown", (e) => handle(e, true));
  window.addEventListener("keyup", (e) => handle(e, false));

  return { keys };
}
