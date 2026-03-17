import { Application } from "pixi.js";

export async function createApp(dom) {
  const app = new Application();
  await app.init({
    width:  window.innerWidth,
    height: window.innerHeight,
    resolution: 2,
    autoDensity: true,
    antialias: true,
    powerPreference: "high-performance",
    backgroundAlpha: 0,
  });

  // ✅ PixiJS v8 正确写法
  app.stage.roundPixels = true;

  app.ticker.maxFPS = 60;

  dom.appendChild(app.canvas);
  return app;
}
