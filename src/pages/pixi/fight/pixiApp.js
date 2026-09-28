import { Application } from 'pixi.js'

export const app = new Application()

export async function initPixiApp() {
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0,
    antialias: false, // ⚡ 像素/卡通风直接关抗锯齿，性能更好（与主世界 app 一致）
  })

  document.body.appendChild(app.canvas)
}