import { Application, Container, RenderTexture } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

// ========== 全局单例（全程仅1个WebGL上下文） ==========
let globalApp = null
let globalAppInit = null // Promise 锁，防并发竞态：init 完成前 globalApp 已非 null 但 renderer 未就绪
let isDestroying = false // 销毁锁，防止重复销毁/渲染冲突
const activeSpines = new Map()
let spineIdCounter = 0

async function getGlobalApp() {
  // 先检查 init Promise（防止并发：init 完成前 globalApp 已非 null 但未就绪）
  if (globalAppInit) return globalAppInit
  if (globalApp) return globalApp

  globalAppInit = (async () => {
    globalApp = new Application()
    await globalApp.init({
      width: 1,
      height: 1,
      backgroundAlpha: 0,
      antialias: false,
      autoStart: false, // 关闭自动渲染，全程手动触发
      preference: 'webgl2',
      preserveDrawingBuffer: true,
    })
    return globalApp
  })()
  return globalAppInit
}

// ========== 核心：单次渲染卡牌到DOM Canvas ==========
function renderCardToCanvas(data) {
  if (!data.spine || !data.canvas || !data.renderTexture) return
  if (data.renderTexture.width === 0 || data.renderTexture.height === 0) return

  const renderer = globalApp.renderer
  try {
    // 强制刷新一次骨骼姿态，确保皮肤、顶点已计算
    data.spine.update(0)

    // 渲染到离屏纹理
    renderer.render({
      container: data.container,
      target: data.renderTexture,
      clear: true,
    })

    // 提取并绘制到DOM Canvas
    const sourceCanvas = renderer.extract.canvas(data.renderTexture)
    const ctx = data.canvas.getContext('2d')
    ctx.clearRect(0, 0, data.canvas.width, data.canvas.height)
    ctx.drawImage(sourceCanvas, 0, 0, data.canvas.width, data.canvas.height)
  } catch (e) {
    console.warn('卡牌渲染失败:', e)
  }
}

// ================================
// 原有工具函数（完全不动）
// ================================
export function getCardSkinName(name) {
  return user.pixi.player.CARD_DATA[name]?.skin || 'attack'
}

export function getCardTextColor(name) {
  return user.pixi.player.CARD_DATA[name]?.color || '#ffffff'
}

export function getCardMaxCooldown(name) {
  return user.pixi.player.CARD_DATA[name]?.maxCooldown || 0
}

// ================================
// 创建卡牌Spine（仅渲染1次，时序对齐原逻辑）
// ================================
export async function createCardSpine(cardName, width, height) {
  try {
    await getGlobalApp()
    const id = ++spineIdCounter

    // 1. DOM输出画布
    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, width * dpr)
    canvas.height = Math.max(1, height * dpr)
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    // 2. 创建Spine实例
    const container = new Container()
    const spine = new Spine({
      skeleton: 'kapai_skel',
      atlas: 'kapai_atlas',
      allowMissingRegions: true,
      autoUpdate: false, // 离屏渲染：关闭自动更新，渲染前手动 update(0)
    })

    if (!spine) {
      console.error('Spine创建失败')
      return null
    }

    // 皮肤设置
    const skins = spine.skeleton.data?.skins?.map(s => s.name) || []
    const targetSkin = getCardSkinName(cardName)
    if (skins.includes(targetSkin)) {
      spine.skeleton.setSkinByName(targetSkin)
    } else {
      spine.skeleton.setSkinByName(skins[0] || null)
    }

    if (spine.state) spine.state.clearTracks()
    container.addChild(spine)

    // 缩放定位（和原参数完全一致）
    const scale = Math.max(width / 512, height / 512)
    spine.scale.set(scale * 1.2 * dpr)
    spine.x = (width * dpr) / 2
    spine.y = height * dpr

    // 3. 离屏渲染纹理
    const renderTexture = RenderTexture.create({
      width: Math.max(1, width * dpr),
      height: Math.max(1, height * dpr),
      resolution: 1,
    })

    const cardData = { container, spine, renderTexture, canvas }
    activeSpines.set(id, cardData)

    // 关键：等两帧让Spine资源、骨骼完全就绪再渲染，对齐你原代码时序
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    renderCardToCanvas(cardData)

    return {
      canvas,
      render() {
        renderCardToCanvas(cardData)
      },
      destroy() {
        try {
          const data = activeSpines.get(id)
          if (data) {
            data.container.destroy({ children: true })
            data.renderTexture.destroy()
            activeSpines.delete(id)
          }
          canvas.remove()
        } catch (e) {
          console.error('Spine销毁错误:', e)
        }
      }
    }
  } catch (e) {
    console.error('createCardSpine error:', e)
    return null
  }
}

// ================================
// 创建道具Spine（使用 daojuall 骨骼，img 作为皮肤名）
// 注意：这些道具皮肤都是静态的，无动画。
// 渲染到 canvas 后立即销毁 GL 资源，不保留任何引用。
// ================================
export async function createDaojuSpine(skinName, width, height) {
  try {
    const app = await getGlobalApp()
    const dpr = window.devicePixelRatio || 1

    // 1. DOM输出画布
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, width * dpr)
    canvas.height = Math.max(1, height * dpr)
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    // 2. 创建Spine实例（使用 daojuall 骨骼）
    const container = new Container()
    const spine = new Spine({
      skeleton: 'daojuall_skel',
      atlas: 'daojuall_atlas',
      allowMissingRegions: true,
      autoUpdate: false, // 离屏渲染：关闭自动更新，渲染前手动 update(0)
    })

    if (!spine) {
      console.error('道具Spine创建失败:', skinName)
      return null
    }

    // 3. 设置皮肤（skinName 就是 img 名称）
    const skins = spine.skeleton.data?.skins?.map(s => s.name) || []
    let usedSkin = skinName
    if (!skins.includes(usedSkin)) usedSkin = skins[0] || ''
    if (usedSkin) spine.skeleton.setSkinByName(usedSkin)
   
    // 静态皮肤，无需清动画轨道

    container.addChild(spine)

    // 4. 手动推进一帧让骨架计算世界变换（无需等 RAF）
    spine.update(0)

    // 5. 计算bounds并缩放定位（居中显示）
    const bounds = spine.getBounds()

    const spineW = Math.max(bounds.width, 1)
    const spineH = Math.max(bounds.height, 1)
    const s = Math.min((width * 0.85) / spineW, (height * 0.85) / spineH) * dpr
    spine.scale.set(s)
    spine.x = (width * dpr) / 2
    spine.y = (height * dpr) / 2

    // 6. 离屏渲染纹理
    const renderTexture = RenderTexture.create({
      width: Math.max(1, width * dpr),
      height: Math.max(1, height * dpr),
      resolution: 1,
    })

    // 7. 渲染到纹理
    spine.update(0)
    app.renderer.render({ container, target: renderTexture, clear: true })

    // 8. 提取到DOM Canvas
    const sourceCanvas = app.renderer.extract.canvas(renderTexture)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)

    // 9. 立即释放 GL 资源（已拿到 canvas，不再需要）
    container.destroy({ children: true })
    renderTexture.destroy()

    return {
      canvas,
      destroy() {
        canvas.remove()
      }
    }
  } catch (e) {
    console.error('createDaojuSpine error:', e)
    return null
  }
}

// ================================
// 全局销毁
// ================================
export function destroyAllCardSpines() {
  if (isDestroying) return
  isDestroying = true

  try {
    // 1. 先销毁所有卡牌资源（纹理、容器、DOM）
    for (const [id] of activeSpines) {
      const data = activeSpines.get(id)
      if (!data) continue
      try {
        data.renderTexture?.destroy?.()
        data.container?.destroy?.({ children: true })
        data.canvas?.remove?.()
      } catch (e) {
        console.error('单张卡牌资源销毁异常:', e)
      }
    }
    activeSpines.clear()

    // 2. 最后销毁全局App（Pixi v8 正确参数格式）
    if (globalApp) {
      try {
        globalApp.destroy({
          removeView: true,
          children: true,
          texture: true,
          context: true
        })
      } catch (e) {
        console.error('全局App销毁异常:', e)
      }
      globalApp = null
      globalAppInit = null // ✅ 重置 init Promise，下次可重新创建
    }
  } finally {
    isDestroying = false
  }
}