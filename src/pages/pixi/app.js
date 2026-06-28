import { Application } from 'pixi.js'

export async function createApp(dom) {

  const app = new Application()

  await app.init({

    // =========================
    // 自动跟随窗口
    // =========================
    resizeTo: window,

    // =========================
    // 高清渲染（核心）
    // =========================
    resolution: Math.min(
      window.devicePixelRatio,
      2
    ),

    // =========================
    // Retina适配
    // =========================
    autoDensity: true,

    // =========================
    // 抗锯齿
    // =========================
    antialias: true,

    // =========================
    // 高性能GPU
    // =========================
    powerPreference: 'high-performance',

    // =========================
    // 透明背景
    // =========================
    backgroundAlpha: 0,
  })

  // =========================
  // 像素对齐
  // =========================
  app.stage.roundPixels = true

  // =========================
  // 限制FPS
  // =========================
  app.ticker.maxFPS = 60

  // =========================
  // canvas样式
  // =========================
  app.canvas.style.width = '100%'
  app.canvas.style.height = '100%'
  app.canvas.style.display = 'block'

  // 挂载
  dom.appendChild(app.canvas)

  return app
}