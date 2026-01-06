import { Application } from "pixi.js";

export async function createApp(dom) {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: "#1099bb",
  });
  dom.appendChild(app.canvas);
  return app;
}
