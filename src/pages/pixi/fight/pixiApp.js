import { Application } from 'pixi.js'

export const app = new Application()

export async function initPixiApp() {
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0,
    antialias: true,
  })

  document.body.appendChild(app.canvas)
}