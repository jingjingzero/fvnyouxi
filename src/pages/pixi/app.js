import { Application } from "pixi.js";

export async function createApp(dom) {
  const app = new Application();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  await app.init({
    resizeTo: window,
    resolution: dpr, // 或 dpr
    autoDensity: true,
    antialias: false,
    powerPreference: "high-performance",
    backgroundAlpha: 0,
  });

  // ✅ PixiJS v8 正确写法
  app.stage.roundPixels = true;

  app.ticker.maxFPS = 60;

  dom.appendChild(app.canvas);
  return app;
}
