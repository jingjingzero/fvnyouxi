import { ref, computed, onUnmounted } from "vue";

export function useSpriteAnimation({
  sprite,
  imgW,
  imgH,
  gapX = 0,
  gapY = 0,
  nCols,
  nRows,
  frames = null,
  frameTime = null,   // 全局帧时间（秒）
  frameTimes = null,  // 单帧时间数组（秒）
  widthVh = 50,       // 👈 显示宽度（vh）
  aspectRatio = null, // 👈 宽 / 高，例如 2（不传则用 imgW/imgH）
}) {
  /* ================= 帧数据 ================= */
  const currentFrame = ref(0);

  if (!frames) {
    frames = [];
    for (let y = 0; y < nRows; y++) {
      for (let x = 0; x < nCols; x++) {
        frames.push({ x, y });
      }
    }
  }

  /* ================= 尺寸计算 ================= */
  const realAspect = aspectRatio ?? imgW / imgH;

  // 高度 vh = 宽度 vh / (宽高比)
  const heightVh = widthVh / realAspect;

  // vh → px，用来算 backgroundSize
  const scale = computed(() => {
    const screenH = window.innerHeight;
    const displayPxW = (widthVh / 100) * screenH;
    return displayPxW / imgW;
  });

  /* ================= 动画控制 ================= */
  let loopTimer = null;

  function playLoop(infinite = true) {
    let played = 0;
    const total = frames.length;

    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }

    function next() {
      currentFrame.value = (currentFrame.value + 1) % total;
      played++;

      if (!infinite && played >= total) {
        loopTimer = null;
        return;
      }

      const timeMs =
        frameTime != null
          ? frameTime * 1000
          : frameTimes
          ? frameTimes[currentFrame.value] * 1000
          : 200;

      loopTimer = setTimeout(next, timeMs);
    }

    const initialTime =
      frameTime != null
        ? frameTime * 1000
        : frameTimes
        ? frameTimes[currentFrame.value] * 1000
        : 200;

    loopTimer = setTimeout(next, initialTime);
  }

  onUnmounted(() => {
    if (loopTimer) clearTimeout(loopTimer);
  });

  /* ================= 样式 ================= */
  const style = computed(() => {
    const { x, y } = frames[currentFrame.value];

    const totalW = nCols * imgW + (nCols - 1) * gapX;
    const totalH = nRows * imgH + (nRows - 1) * gapY;

    const offsetX = x * (imgW + gapX);
    const offsetY = y * (imgH + gapY);

    return {
      width: `${widthVh}vh`,
      height: `${heightVh}vh`,
      backgroundImage: `url(${sprite})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${totalW * scale.value}px ${totalH * scale.value}px`,
      backgroundPosition: `-${offsetX * scale.value}px -${offsetY * scale.value}px`,
      cursor: "pointer",
    };
  });

  return {
    style,
    playLoop,
    currentFrame,
  };
}
