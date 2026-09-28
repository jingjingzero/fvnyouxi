import { Application } from 'pixi.js'

export async function createApp(dom) {
  const app = new Application()
  // ✅ 移动端优化：检测设备类型，降低渲染分辨率;
  await app.init({
  // preferWebGPU: false,  // 优先用WebGPU渲染，性能比WebGL高30%+
    // ⚠️ 不再用 resizeTo: window——它只监听 window 的 resize 事件，
    //    移动端地址栏伸缩/横竖屏/容器布局变化时容易不触发，改用下方 ResizeObserver 监听容器自身
    resolution: 2, // 手机1x，桌面2x
    autoDensity: true,
    antialias: false, // 像素/卡通风直接关，性能更好
    powerPreference: 'high-performance',
    plugins:{
     interaction:false
    },
    backgroundAlpha: 0,
    backgroundColor: 0xFFFFFF,
    failIfMajorPerformanceCaveat: true,
    roundPixels: true,
    useBackBuffer: false,
  })

  app.stage.roundPixels = true
  // ✅ 智能帧率：手机限制30fps，电脑不限（由requestAnimationFrame和显示器决定）
  app.ticker.maxFPS = 0  // 0=不限制，自然跟随显示器刷新率
  app.canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;'
  // ⚠️ 移除了 document 级 touchmove preventDefault：
  // 它会在全局拦截所有 touchmove，导致页面上所有 overflow-y:auto 面板
  // （菜单/任务/背包/图鉴等）在移动端都无法滚动。
  // 画布自身已设置 touch-action:none，游戏内拖拽/摇杆/自由视角不受影响。
  dom.appendChild(app.canvas)

  // =====================
  // ✅ 固定屏幕尺寸（不做 resize 监听，节约性能）
  // =====================
  // 仅在初始化时按容器当前尺寸设置一次画布渲染尺寸，之后不再跟随屏幕变化
  const updateViewport = () => {
    window.VH = app.screen.height / 100
    window.VW = app.screen.width / 100
  }
  // 一次性设置画布尺寸为容器尺寸
  const width = Math.max(1, dom.clientWidth || window.innerWidth)
  const height = Math.max(1, dom.clientHeight || window.innerHeight)
  app.renderer.resize(width, height)
  updateViewport()

  app.destroyCustom = () => {
    app.destroy({ children: true, texture: false, textureSource: false, buffer: true, releaseGlobalResources: false })
  }
  return app
}