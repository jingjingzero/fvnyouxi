import { Application } from "pixi.js";

export async function createApp(dom) {
  const app = new Application();

  await app.init({
    resizeTo: window,

    // ====== 清晰度关键 ======
    resolution: window.devicePixelRatio || 2,
    autoDensity: true,

    // Android 上反而更清晰
    antialias: false,

    // 背景色（可选）
    background: "#1099bb",
  });

  dom.appendChild(app.canvas);
  return app;
}
