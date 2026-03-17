import { AnimatedSprite, Texture, Rectangle } from "pixi.js";

export function createBulletAnimation({
  spriteSheet,
  frameW,
  frameH,
  gapX = 0,
  gapY = 0,
  nCols,
  nRows,
  frames = null,

  frameTime = 1,        // 全局帧时间（秒）
  frameTimes = null,    // 单帧时间数组（秒）

  loop = true,
  loopStartIndex = 0,

  offsetX = 0,
  offsetY = 0,
}) {
  /* ===== 生成 frames ===== */
  if (!Array.isArray(frames)) {
    frames = [];
    for (let y = 0; y < nRows; y++) {
      for (let x = 0; x < nCols; x++) {
        frames.push({ x, y });
      }
    }
  }

  /* ===== 安全检查 ===== */
  if (frameTimes && frameTimes.length !== frames.length) {
    console.warn(
      "[createBulletAnimation] frameTimes length mismatch:",
      frameTimes.length,
      frames.length
    );
  }

  /* ===== 切帧 ===== */
  const allFrames = frames.map(({ x, y }, i) => {
    const texture = new Texture({
      source: spriteSheet.source,
      frame: new Rectangle(
        offsetX + x * (frameW + gapX),
        offsetY + y * (frameH + gapY),
        frameW,
        frameH
      ),
    });

    // 🎯 单帧时间模式（毫秒）
    if (frameTimes) {

      return {
        texture,
        time: (frameTimes[i] ?? frameTime) * 1000,
      };
    }

    // 🎯 全局帧时间模式
    return texture;
  });

  /* ===== 创建动画 ===== */
  const anim = new AnimatedSprite(allFrames);
  anim.anchor.set(0.5);

  // ⚠️ 只有「非单帧时间模式」才使用 animationSpeed
  if (!frameTimes) {
    anim.animationSpeed = 1 / frameTime;
  }

  /* ===== 情况 1：不循环 ===== */
  if (!loop) {
    anim.loop = false;
    anim.play();
    return anim;
  }

  /* ===== 情况 2：从 0 开始循环 ===== */
  if (loopStartIndex === 0) {
    anim.loop = true;
    anim.play();
    return anim;
  }

  /* ===== 情况 3：首轮完整播，之后从指定帧循环 ===== */
  anim.loop = false;

  anim.onComplete = () => {
    const start = Math.max(
      0,
      Math.min(loopStartIndex, allFrames.length - 1)
    );

    anim.textures = allFrames.slice(start);
    anim.loop = true;
    anim.gotoAndPlay(0);
  };

  anim.play();
  return anim;
}
