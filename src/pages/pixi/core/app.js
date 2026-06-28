import { Application, Sprite, Texture,RendererType } from 'pixi.js'

export async function createApp(dom) {
  const app = new Application()
  await app.init({
        preferWebGPU: true, // 优先用WebGPU渲染，性能比WebGL高30%+
    resizeTo: window,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    antialias: false, // 像素/卡通风直接关，性能更好，3D类/高清渲染再开
    powerPreference: 'high-performance',
    backgroundAlpha: 1, // 直接设为不透明，比手动加白色背景性能更好，省去一个精灵开销
    backgroundColor: 0xFFFFFF, // 直接指定背景色，不需要额外加白色Sprite
    failIfMajorPerformanceCaveat: true, // 禁止低性能设备用软件渲染，避免卡死
    roundPixels: true, // 全局开启像素对齐，避免小数坐标导致的边缘模糊
    useBackBuffer: false, // 不需要屏幕后处理的话关掉，减少显存占用
  })

  app.stage.roundPixels = true
  app.ticker.maxFPS = 60
  app.canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;'
  dom.appendChild(app.canvas)
  const updateViewport = () => {
    // 尺寸变化时可以同步更新全局VH/VW，不需要额外监听window
    window.VH = app.screen.height / 100
    window.VW = app.screen.width / 100
  }
  app.renderer.on('resize', updateViewport)
  updateViewport() // 初始化一次
  app.destroyCustom = () => {
    app.renderer.off('resize', updateViewport)
    app.destroy(true, { children: true, texture: true, buffer: true })
  }
  return app
}