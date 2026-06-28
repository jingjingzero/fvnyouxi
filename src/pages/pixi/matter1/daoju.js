let mark;
export const floatingMarks = []
export async function wenhaoHudong(
  x, y, w, h,
  {
    textureName,
    show = true,
    isInteractive,
    wuxian = false,
    isFloatEnable = true
  } = {},
  WallScale,
  worldContainer,
  Assets,
  Sprite
) {
  // 不显示则直接返回
  if (!show) return null;
  textureName = textureName || "question"

  // 获取资源
  const texture = Assets.get(textureName);
  if (!texture) return null;

  // 创建精灵
  const mark = new Sprite(texture);
  mark.wuxian = wuxian;
  mark.isFloatEnable = isFloatEnable;
  // 锚点、缩放、层级、位置
  mark.anchor.set(0.5, 1);
  mark.scale.set(WallScale * 0.6);

  mark.position.set(x, y);


  // 添加到舞台
  worldContainer.addChild(mark);

  // 初始化浮动效果（删掉传参 interactRange）
  await initFloatingMark(mark, isFloatEnable);
  // 点击事件
  mark.on("pointertap", () => {
    if (!mark.visible || mark.locked) return;

    if (mark.wuxian !== 0) {
      mark.wuxian--
      removeFloatingMark(mark, true);
      mark.visible = false;
      mark.locked = true;
      mark._hideTimer = setTimeout(() => {
        mark.locked = false;
        mark.visible = true;
      }, 1200);
    } else {
      removeFloatingMark(mark, false);
    }
  });
  floatingMarks.push(mark);
  return { mark, floatingMarks };
}

async function initFloatingMark(mark, isFloatEnable) {
  mark.baseY = mark.y;
  mark.maxBaseY = mark.baseY + 8;
  mark.minBaseY = mark.baseY - 8;
  mark.speed = 0.4;
  mark.direction = 1;
  mark.isFloatEnable = isFloatEnable;  // ✅【最终关键】
  mark.visible = true;
  mark.locked = false; // ⭐ 关键
  mark.eventMode = "static";
  mark.cursor = "pointer";
}
function removeFloatingMark(mark, yincang = false) {
  if (yincang) {
    mark.visible = false;
    mark.locked = true; // ⭐ 关键
  } else {
    const index = floatingMarks.indexOf(mark);
    if (index !== -1) {
      floatingMarks.splice(index, 1);
    }

    if (mark.parent) {
      mark.parent.removeChild(mark);
    }

    mark.destroy();
  }
}
//duration：冷却时间，单位毫秒（默认 1000ms，即 1 秒）。
function createCooldown(duration = 1000) {
  let locked = false;
  let timer = null;

  return function () {
    if (locked) return false;

    locked = true;

    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      locked = false;
      timer = null;
    }, duration);

    return true;
  };
}
const elevatorEnterCooldown = createCooldown(1000);

// ========= 纯数据版电梯 · 不碰 Matter =========

export function createElevator(label, body, VH) {
  if (!label.playersOnElevator) label.playersOnElevator = new Set();
  if (label.startY === undefined) label.startY = body.position.y;

  const speed = 0.4 * VH;
  const topY = 50;

  let moveDirection = 0;
  let currentY = label.startY;

  function update() {
    if (moveDirection === 0) return null;

    const prevY = currentY;
    currentY += speed * moveDirection;
    const dy = currentY - prevY;

    if (moveDirection === -1 && currentY <= topY) {
      currentY = topY;
      moveDirection = 0;
      if (label.playersOnElevator.size === 0) moveDirection = 1;
    }
    if (moveDirection === 1 && currentY >= label.startY) {
      currentY = label.startY;
      moveDirection = 0;
    }

    return { y: currentY, dy };
  }

  function enter(player) {
    label.playersOnElevator.add(player);
    moveDirection = -1;
  }

  function leave(player) {
    label.playersOnElevator.delete(player);
    if (currentY <= topY && label.playersOnElevator.size === 0) {
      moveDirection = 1;
    }
  }

  return {
    update,
    enter,
    leave,
    body,
    playersOnElevator: label.playersOnElevator
  };
}