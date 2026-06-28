import { Application, Container, RenderTexture } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

// ========== 全局单例（全程仅1个WebGL上下文） ==========
let globalApp = null
let isDestroying = false // 销毁锁，防止重复销毁/渲染冲突
const activeSpines = new Map()
let spineIdCounter = 0

async function getGlobalApp() {
  if (globalApp) return globalApp

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
    }
  } finally {
    isDestroying = false
  }
}