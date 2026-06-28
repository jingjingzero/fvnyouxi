//抖动效果
export function shakeViewport(target, intensity = 8, duration = 300,gsap) {
  if (!target) return;

  const startTime = performance.now();

  function step() {
    const elapsed = performance.now() - startTime;

    if (elapsed < duration) {
      // 随机小幅度震动
      gsap.to(target, {
        x: "random(-" + intensity + ", " + intensity + ")",
        y: "random(-" + intensity + ", " + intensity + ")",
        duration: 0.05,
        overwrite: true,
      });
      requestAnimationFrame(step);
    } else {
      // 结束后复位
      gsap.to(target, {
        x: 0,
        y: 0,
        duration: 0.05,
        overwrite: true,
      });
    }
  }

  step();
}
//使用方法 主界面 shakeViewport(viewport.parent, 8, 300,gsap);