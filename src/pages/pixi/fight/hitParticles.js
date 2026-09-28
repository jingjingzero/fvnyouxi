/**
 * 技能命中粒子特效
 * 使用 ParticleContainer + 对象池优化性能
 */
import { Texture, Assets, ParticleContainer, Particle } from 'pixi.js'
import { gsap } from 'gsap'
import { getFightContainer, getEnemySpinePos } from './battle.js'

// 记录当前战斗中所有活跃的粒子特效，用于清理
let _activeEffects = []

/** 全局最大活跃粒子数（超过此限制优先回收旧粒子） */
const MAX_PARTICLES = 300
/** 全局活跃粒子计数 */
let _activeParticleCount = 0

/**
 * 在敌人位置播放命中粒子特效
 *
 * @param {Object} enemy - 敌人对象（含 x, y 坐标）
 * @param {string} element - 元素类型：physical / water / ice / fire / lightning / poison
 * @param {Object} [options]
 * @param {string} [options.spread='around'] - 扩散方式：'around' | 'cone'
 * @param {number} [options.enemyDirection=1] - 敌人朝向
 * @param {number} [options.scale=1] - 粒子大小倍率
 * @param {number} [options.count=30] - 粒子数量
 * @param {number} [options.duration=0.6] - 动画时长
 * @returns {{ container: Container }|null}
 */

// ========== 对象池 ==========

/** 粒子池：{ element: Particle[] } */
const _particlePool = {}

/** 从池中获取或新建 Particle */
function _acquireParticle(texture, element) {
  if (!_particlePool[element]) _particlePool[element] = []
  const pool = _particlePool[element]
  let p = pool.pop()
  if (!p) {
    p = new Particle({ texture, anchorX: 0.5, anchorY: 0.5 })
  } else {
    // 重置状态
    p.texture = texture
    p.alpha = 1
    p.scaleX = 1
    p.scaleY = 1
    p.rotation = 0
    p.tint = 0xffffff
    p.x = 0
    p.y = 0
  }
  _activeParticleCount++
  return p
}

/** 归还 Particle 到池中 */
function _releaseParticle(p, element) {
  gsap.killTweensOf(p)
  if (!_particlePool[element]) _particlePool[element] = []
  _particlePool[element].push(p)
  _activeParticleCount--
}

/** ParticleContainer 池 */
const _containerPool = []

function _acquireContainer() {
  return _containerPool.pop() || new ParticleContainer({
    dynamicProperties: {
      vertex: true,     // scale 变化需要更新顶点
      position: true,   // 位置每帧变化
      rotation: true,   // 旋转每帧变化
      color: true,      // alpha 每帧衰减
    },
  })
}

function _releaseContainer(c) {
  c.removeParticles()
  c.zIndex = 0
  _containerPool.push(c)
}

// ========== DOM 元素对象池（canvas 复用，减少 GC） ==========

/** DOM canvas 元素池 */
const _domElPool = []

/** 从池中获取 canvas 元素并绘制源图 */
function _acquireDomEl(sourceCanvas) {
  let el = _domElPool.pop()
  if (!el) {
    el = document.createElement('canvas')
  }
  el.width = sourceCanvas.width
  el.height = sourceCanvas.height
  el.getContext('2d').drawImage(sourceCanvas, 0, 0)
  el.style.cssText = ''
  gsap.killTweensOf(el)
  return el
}

/** 归还 canvas 元素到池中（清除内容 + 样式） */
function _releaseDomEl(el) {
  gsap.killTweensOf(el)
  try { if (el.parentNode) el.parentNode.removeChild(el) } catch (e) { }
  el.style.cssText = ''
  el.width = 1
  el.height = 1
  if (_domElPool.length < 200) _domElPool.push(el)
}

/** 全局活跃 DOM 特效列表（战斗结束时统一清理 overlay 及子元素） */
const _activeDomEffects = []

/** 注册 DOM 特效到全局清理列表 */
function _trackDomEffect(overlay) {
  _activeDomEffects.push(overlay)
}

/** 全屏覆层池（减少 div 创建/销毁） */
const _overlayPool = []

function _acquireOverlay(zIndex = 99999) {
  let ov = _overlayPool.pop()
  if (!ov) {
    ov = document.createElement('div')
    ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none'
  }
  ov.style.zIndex = zIndex
  ov.innerHTML = ''
  ov.style.opacity = '1'
  ov.style.transform = 'none'
  ov.style.display = 'block'
  document.body.appendChild(ov)
  return ov
}

function _releaseOverlay(ov) {
  gsap.killTweensOf(ov.children)
  // 移出所有子元素
  while (ov.firstChild) {
    _releaseDomEl(ov.firstChild)
  }
  try { if (ov.parentNode) ov.parentNode.removeChild(ov) } catch (e) { }
  ov.innerHTML = ''
  ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none'
  if (_overlayPool.length < 10) _overlayPool.push(ov)
}

// ----- 工具函数 -----
function rand(min = 0, max = 1) {
  return min + Math.random() * (max - min)
}

function _makeFallbackTex() {
  const canvas = document.createElement('canvas')
  canvas.width = 10
  canvas.height = 10
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(5, 5, 5, 0, Math.PI * 2)
  ctx.fill()
  return Texture.from(canvas)
}

/**
 * 元素配置：贴图 + 颜色 + 拖拽粒子行为参数
 *
 * 每个元素可自定义：
 * - texture   : 贴图名称（Assets 加载的资源名）
 * - colors    : 三种颜色（粒子随机选取）
 * - drag      : 拖拽粒子行为参数（不设置则使用默认值）
 *
 * drag 可配置字段：
 * - maxParticles : number         最大并发粒子数
 * - spawnInterval: number         生成间隔（ms）
 * - spreadX      : number         扩散半径（px）
 * - spreadY      : [min, max]     Y 轴偏移范围（px, 负数为向上飘）
 * - duration     : [min, max]     动画时长（s）
 * - scale        : [min, max]     显示缩放范围
 * - spawnJitter  : number         出生位置随机偏移（px）
 * - opacity      : [min, max]     透明度范围
 */
/** 池中 canvas 底图统一像素尺寸（视觉大小由 scale 控制） */
const DRAG_BASE_SIZE = 24

const DRAG_DEFAULT = {
  maxParticles: 12,
  spawnInterval: 60,
  spreadX: 200,
  spreadY: [-28, -4],
  duration: [0.8, 1.5],
  scale: [1.2, 1.5],
  spawnJitter: 8,
  opacity: [0.5, 0.9],
}

const ELEMENT_CONFIG = {
  water: {
    texture: 'Bubbles50px',
    colors: [0x4fc3f7, 0x29b6f6, 0x01579b],
    drag: {
      maxParticles: 15,
      spawnInterval: 50,
      spreadX: 180,
      spreadY: [-35, -5],
      duration: [0.7, 1],
      scale: [0.5, 1],
    },
  },
  ice: {
    texture: 'Snow50px',
    colors: [0xe0f7fa, 0x81d4fa, 0x0288d1],
    drag: {
      spawnInterval: 70,
      duration: [0.8, 1.4],
      scale: [0.8, 1.2],
      opacity: [0.3, 0.7],
    },
  },
  fire: {
    texture: 'Fire',
    colors: [0xffab00, 0xff6f00, 0xd50000],
    drag: {
      maxParticles: 10,
      spawnInterval: 45,
      spreadX: 160,
      spreadY: [-40, -8],
      duration: [0.7, 1.3],
      scale: [1.5, 2.5],
      opacity: [0.6, 1.0],
    },
  },
  physical: {
    texture: 'Sparks',
    colors: [0xffe082, 0xffd54f, 0xff8f00],
    drag: {
      maxParticles: 12,
      spawnInterval: 55,
      spreadX: 200,
      duration: [0.7, 1.2],
      scale: [0.1, 0.2],
    },
  },
  electric: {
    texture: 'HardRain',
    colors: [0xea80fc, 0xb388ff, 0x2962ff],
    drag: {
      maxParticles: 18,
      spawnInterval: 40,
      spreadX: 250,
      spreadY: [-20, -2],
      duration: [0.6, 1.2],
      scale: [1.0, 2.0],
      opacity: [0.4, 0.8],
    },
  },
  poison: {
    texture: 'smokeparticle',
    colors: [0xb9f6ca, 0x69f0ae, 0x00c853],
    drag: {
      maxParticles: 8,
      spawnInterval: 80,
      spreadX: 150,
      spreadY: [-25, -3],
      duration: [1.0, 1.8],
      scale: [1.5, 3.0],
      opacity: [0.3, 0.65],
    },
  },
}

function getElementTex(element) {
  const cfg = ELEMENT_CONFIG[element]
  const texName = cfg ? cfg.texture : 'Sparks'
  let tex
  try { tex = Assets.get(texName); if (tex) return tex } catch (e) { }
  try { tex = Assets.get('Sparks'); if (tex) return tex } catch (e) { }
  try { tex = Assets.get('particle'); if (tex) return tex } catch (e) { }
  return _makeFallbackTex()
}

/** 在敌人位置播放命中粒子特效（ParticleContainer + 对象池优化） */
export function playHitParticlesOnEnemy(enemy, element = 'physical', options = {}) {
  if (!enemy || enemy.hp === undefined) return null

  const fightContainer = getFightContainer()
  if (!fightContainer) return null

  const { spread = 'around', enemyDirection = 1, scale = 1, count = 30, duration = 1, offsetX = 0, offsetY = -10, range = 0.5 } = options
  // 使用敌人 spine 的实际渲染坐标
  const VW = window.innerWidth / 100
  const VH = window.innerHeight / 100
  const spinePos = getEnemySpinePos(enemy)
  const px = (spinePos ? spinePos.x : enemy.x) + offsetX * VW
  const py = (spinePos ? spinePos.y : enemy.y) + offsetY * VH

  // ---- 获取贴图（共享纹理） ----
  const tex = getElementTex(element)
  const cfg = ELEMENT_CONFIG[element] || ELEMENT_CONFIG.physical
  const [color1, color2, color3] = cfg.colors

  // ---- 限制粒子数量 ----
  const actualCount = Math.min(count, MAX_PARTICLES - _activeParticleCount)
  if (actualCount <= 0) return null

  // ---- 从池中获取 ParticleContainer ----
  const pc = _acquireContainer()
  pc.zIndex = 9999
  pc._element = element // 标记元素类型，供 clearAllHitParticles 使用
  fightContainer.addChild(pc)

  // ---- 从池中获取 Particle 并设置动画 ----
  for (let i = 0; i < actualCount; i++) {
    const p = _acquireParticle(tex, element)
    // 初始位置（中心聚集）
    p.x = px + rand(-6 * scale, 6 * scale)
    p.y = py + rand(-6 * scale, 6 * scale)
    p.tint = [color1, color2, color3][Math.floor(Math.random() * 3)]
    p.alpha = 1
    p.scaleX = 0
    p.scaleY = 0
    pc.addParticle(p)

    let angle, dist
    if (spread === 'cone') {
      const coneAngle = 0
      angle = coneAngle + rand(-Math.PI / 4, Math.PI / 4)
      dist = rand(45, 140) * scale * range
    } else {
      angle = rand(0, Math.PI * 2)
      dist = rand(45, 140) * scale * range
    }

    const endScale = rand(0.3, 0.6) * scale
    const targetX = px + Math.cos(angle) * dist
    const targetY = py + Math.sin(angle) * dist - rand(0, 30)

    gsap.to(p, {
      x: targetX,
      y: targetY,
      scaleX: endScale,
      scaleY: endScale,
      alpha: 0,
      rotation: angle,
      duration: rand(0.8, 1.5) * duration,
      ease: 'power2.out',
      delay: rand(0, 0.2),
    })
  }

  _activeEffects.push(pc)

  // 自动清理（将 Particle 归还池中）
  setTimeout(() => {
    const idx = _activeEffects.indexOf(pc)
    if (idx !== -1) _activeEffects.splice(idx, 1)
    // 归还所有 Particle
    const children = [...pc.particleChildren]
    children.forEach(p => {
      pc.removeParticle(p)
      _releaseParticle(p, element)
    })
    if (pc.parent) pc.parent.removeChild(pc)
    _releaseContainer(pc)
  }, (duration + 0.5) * 1000)

  return { container: pc }
}


/**
 * 创建拖拽粒子发射器（DOM 覆盖层，z-index 高于卡牌）
 *
 * @param {string} element
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @returns {{ update: Function, destroy: Function }|null}
 */
/**
 * 拖拽粒子颜色映射（每种元素三种颜色）
 * physical → 白/银, water → 蓝, ice → 冰蓝, fire → 红橙,
 * electric → 紫, poison → 绿, 其他（治疗/增益）→ 金色
 */
/** 缓存池：{ key: [canvas, ...] } */
const _dragPoolMap = {}

/** 获取元素对应贴图的原始图片，用于 DOM canvas 绘制 */
function _getElementImg(element) {
  const e = element === 'lightning' ? 'electric' : element
  const cfg = ELEMENT_CONFIG[e]
  if (!cfg) return null
  try {
    const tex = Assets.get(cfg.texture)
    if (!tex) return null
    const res = tex.source?.resource
    if (res instanceof HTMLImageElement || res instanceof HTMLCanvasElement) return res
    if (tex.frame) {
      const srcRes = tex.source?.resource
      if (srcRes) {
        const frame = tex.frame
        const c = document.createElement('canvas')
        c.width = frame.width
        c.height = frame.height
        const cx = c.getContext('2d')
        cx.drawImage(srcRes, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height)
        return c
      }
    }
    return null
  } catch {
    return null
  }
}

function _buildDragPool(colors, element, dragCfg) {
  const pool = []
  const img = element ? _getElementImg(element) : null
  const size = DRAG_BASE_SIZE
  const half = size / 2

  for (let i = 0; i < 10; i++) {
    const hexColor = colors[Math.floor(Math.random() * 3)]
    const hex = '#' + hexColor.toString(16).padStart(6, '0')

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (img) {
      // 1) 绘制原始纹理（保留透明度）
      ctx.drawImage(img, 0, 0, size, size)
      // 2) source-atop 着色：只影响纹理有像素的区域，透明区不变
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = hex
      ctx.fillRect(0, 0, size, size)
      // 3) 中心白色光晕（缩小范围，只影响中心 30%，边缘保持半透明）
      const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
      grad.addColorStop(0, 'rgba(255,255,255,0.6)')
      grad.addColorStop(0.3, 'rgba(255,255,255,0.1)')
      grad.addColorStop(0.5, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
      ctx.globalCompositeOperation = 'source-over'
    } else {
      const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.4, hex)
      grad.addColorStop(1, hex + '00')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(half, half, half, 0, Math.PI * 2)
      ctx.fill()
    }

    pool.push(canvas)
  }

  return pool
}

function _resolveDragCfg(element) {
  const e = element === 'lightning' ? 'electric' : element
  const cfg = ELEMENT_CONFIG[e]
  if (!cfg) return { ...DRAG_DEFAULT }
  const ecfg = cfg.drag
  if (!ecfg) return { ...DRAG_DEFAULT }
  return { ...DRAG_DEFAULT, ...ecfg }
}

function _dragPoolKey(element) {
  const key = element === 'lightning' ? 'electric' : element
  return ELEMENT_CONFIG[key] ? key : '_default'
}

function _getColors(element) {
  const key = _dragPoolKey(element)
  const cfg = ELEMENT_CONFIG[key]
  return cfg ? cfg.colors : [0xfff176, 0xffd54f, 0xffb300] // 金色
}

export function createDragParticles(element = 'physical', x = 0, y = 0) {
  const key = _dragPoolKey(element)
  const colors = _getColors(element)
  const dragCfg = _resolveDragCfg(element)
  if (!_dragPoolMap[key]) _dragPoolMap[key] = _buildDragPool(colors, key, dragCfg)
  const srcPool = _dragPoolMap[key]
  const { maxParticles, spawnInterval, spawnJitter, opacity: _opacity, spreadX, spreadY, duration, scale: _scale } = dragCfg

  const overlay = _acquireOverlay(99999)
  _trackDomEffect(overlay)

  const particles = []
  let cx = x
  let cy = y

  function spawn() {
    if (particles.length >= maxParticles) {
      const old = particles.shift()
      gsap.killTweensOf(old)
      _releaseDomEl(old)
    }
    const src = srcPool[Math.floor(Math.random() * srcPool.length)]
    const half = src.width / 2
    const el = _acquireDomEl(src)
    el.style.cssText = [
      'position:fixed',
      'left:' + (cx - half + rand(-spawnJitter, spawnJitter)) + 'px',
      'top:' + (cy - half + rand(-spawnJitter, spawnJitter)) + 'px',
      'opacity:' + rand(_opacity[0], _opacity[1]),
    ].join(';')
    overlay.appendChild(el)
    particles.push(el)

    const angle = rand(0, Math.PI * 2)
    const dist = rand(0, spreadX)
    gsap.to(el, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      rotation: angle * 180 / Math.PI,
      opacity: 0,
      scale: rand(_scale[0], _scale[1]),
      duration: rand(duration[0], duration[1]),
      ease: 'power2.out',
      onComplete: () => {
        const idx = particles.indexOf(el)
        if (idx !== -1) particles.splice(idx, 1)
        _releaseDomEl(el)
      },
    })
  }

  const timer = setInterval(spawn, spawnInterval)

  return {
    update(nx, ny) { cx = nx; cy = ny },
    destroy() {
      clearInterval(timer)
      particles.forEach(p => { gsap.killTweensOf(p); _releaseDomEl(p) })
      particles.length = 0
      _releaseOverlay(overlay)
    },
  }
}

/**
 * 卡牌冷却缩减粒子特效（在卡牌位置爆发短粒子）
 * 用于"时间加速"等天赋触发时，在目标卡牌上显示视觉反馈
 *
 * @param {number} x - 卡牌中心 x 坐标（像素）
 * @param {number} y - 卡牌中心 y 坐标（像素）
 */
export function playCardCooldownEffect(x, y) {
  const colors = [0x42a5f5, 0x1e88e5, 0x90caf9] // 蓝色系 —— 时间/冷却主题
  const poolKey = '_cooldown_effect'
  if (!_dragPoolMap[poolKey]) {
    _dragPoolMap[poolKey] = _buildSimplePool(colors, 20)
    // 环形 canvas 也缓存
    const ringC = document.createElement('canvas')
    ringC.width = 80
    ringC.height = 80
    const rctx = ringC.getContext('2d')
    const ringGrad = rctx.createRadialGradient(40, 40, 0, 40, 40, 40)
    ringGrad.addColorStop(0, 'rgba(66,165,245,0)')
    ringGrad.addColorStop(0.3, 'rgba(66,165,245,0.8)')
    ringGrad.addColorStop(0.5, 'rgba(100,181,246,1)')
    ringGrad.addColorStop(0.7, 'rgba(66,165,245,0.6)')
    ringGrad.addColorStop(1, 'rgba(66,165,245,0)')
    rctx.fillStyle = ringGrad
    rctx.fillRect(0, 0, 80, 80)
    _dragPoolMap[poolKey + '_ring'] = ringC
  }
  const pool = _dragPoolMap[poolKey]
  const ringSource = _dragPoolMap[poolKey + '_ring']
  const count = 24
  const cx = x
  const cy = y

  const overlay = _acquireOverlay(99998)
  _trackDomEffect(overlay)

  const particles = []

  // 第一波：小粒子从中心向外扩散
  for (let i = 0; i < count; i++) {
    const src = pool[Math.floor(Math.random() * pool.length)]
    const half = src.width / 2
    const el = _acquireDomEl(src)

    const angle = rand(0, Math.PI * 2)
    const startDist = rand(0, 12)
    const startX = cx + Math.cos(angle) * startDist - half
    const startY = cy + Math.sin(angle) * startDist - half

    el.style.cssText = [
      'position:fixed',
      'left:' + startX + 'px',
      'top:' + startY + 'px',
      'opacity:' + rand(0.8, 1.0),
    ].join(';')
    overlay.appendChild(el)
    particles.push(el)

    const dist = rand(60, 130)
    gsap.to(el, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - rand(0, 25),
      rotation: rand(-360, 360),
      opacity: 0,
      scale: rand(1.0, 2.0),
      duration: rand(0.8, 1.4),
      ease: 'power2.out',
      delay: rand(0, 0.12),
      onComplete: () => {
        const idx = particles.indexOf(el)
        if (idx !== -1) particles.splice(idx, 1)
        _releaseDomEl(el)
      },
    })
  }

  // 第二波：闪光圆环从中心扩大消失
  const ringEl = _acquireDomEl(ringSource)
  ringEl.style.cssText = [
    'position:fixed',
    'left:' + (cx - 40) + 'px',
    'top:' + (cy - 40) + 'px',
    'opacity:1',
  ].join(';')
  overlay.appendChild(ringEl)
  particles.push(ringEl)

  gsap.to(ringEl, {
    scale: 2.5,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    onComplete: () => {
      const idx = particles.indexOf(ringEl)
      if (idx !== -1) particles.splice(idx, 1)
      _releaseDomEl(ringEl)
    },
  })

  // 自动清理 DOM 容器
  setTimeout(() => {
    particles.forEach(p => { gsap.killTweensOf(p); _releaseDomEl(p) })
    _releaseOverlay(overlay)
  }, 1600)
}

/**
 * 简易粒子池构建（纯色圆形，不依赖纹理）
 * @param {number[]} colors
 * @param {number} size
 * @returns {HTMLCanvasElement[]}
 */
function _buildSimplePool(colors, size = 16) {
  const pool = []
  const half = size / 2
  for (let i = 0; i < 10; i++) {
    const hexColor = colors[Math.floor(Math.random() * 3)]
    const hex = '#' + hexColor.toString(16).padStart(6, '0')

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.3, hex)
    grad.addColorStop(1, hex + '00')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(half, half, half, 0, Math.PI * 2)
    ctx.fill()
    pool.push(canvas)
  }
  return pool
}

// ========== 魔力飞弹粒子缓存 ==========
const _missileCache = {}

/** 构建魔力飞弹的 DOM 粒子图 */
function _getMissileCanvas(color = 0x409EFF) {
  const hex = '#' + color.toString(16).padStart(6, '0')
  const key = 'missile_' + hex
  if (_missileCache[key]) return _missileCache[key]

  const size = 28
  const half = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 头部亮色核心
  const coreGrad = ctx.createRadialGradient(half, half, 0, half, half, half)
  coreGrad.addColorStop(0, '#ffffff')
  coreGrad.addColorStop(0.15, hex)
  coreGrad.addColorStop(0.5, hex + 'aa')
  coreGrad.addColorStop(1, hex + '00')
  ctx.fillStyle = coreGrad
  ctx.fillRect(0, 0, size, size)

  // 拖尾光点（稍许偏移模拟飞行感）
  const trailGrad = ctx.createRadialGradient(half + 4, half, 0, half + 4, half, half * 0.6)
  trailGrad.addColorStop(0, hex)
  trailGrad.addColorStop(1, hex + '00')
  ctx.fillStyle = trailGrad
  ctx.fillRect(0, 0, size, size)

  _missileCache[key] = canvas
  return canvas
}

/**
 * 魔力飞弹粒子特效 —— 贝塞尔曲线飞行 + 命中爆炸
 *
 * @param {number} startX - 起点 X（玩家卡牌区域，像素）
 * @param {number} startY - 起点 Y
 * @param {number} endX   - 终点 X（敌人位置，像素）
 * @param {number} endY   - 终点 Y
 * @param {Function} onHit - 命中回调，在飞弹到达终点时调用
 * @param {number} delayMs - 该枚飞弹的延迟（ms），用于错开发射
 */
function _playSingleManaMissile(startX, startY, endX, endY, onHit, delayMs = 0, color = 0x409EFF) {
  const VH = window.innerHeight / 100
  // 索敌整体往上偏移 10vh，改这里数字就行
  const offsetY = 10 * VH
  const realEndY = endY - offsetY

  const overlay = _acquireOverlay(99995)
  _trackDomEffect(overlay)

  const missileCanvas = _getMissileCanvas(color)
  const el = _acquireDomEl(missileCanvas)
  el.style.cssText = 'position:fixed;left:' + (startX - 14) + 'px;top:' + (startY - 14) + 'px;opacity:1;'
  overlay.appendChild(el)

  // 贝塞尔控制点：随机化方向和弧度，每条飞弹走完全不同的曲线
  const dx = endX - startX
  const dy = realEndY - startY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const baseAngle = Math.atan2(dy, dx) // 起点到终点的基本方向

  // 随机决定曲线类型：0=上方弧, 1=下方弧, 2=S形上下, 3=大回旋
  const curveType = Math.floor(Math.random() * 4)
  // 随机弯曲强度：0.3~1.0 倍飞行距离
  const bendStrength = (0.2 + Math.random() * 0.5) * dist

  let cp1x, cp1y, cp2x, cp2y

  switch (curveType) {
    case 0: { // 上方大弧
      const offAngle = baseAngle - Math.PI / 2
      cp1x = startX + Math.cos(offAngle) * bendStrength * 0.35 + Math.cos(baseAngle) * dist * 0.2
      cp1y = startY + Math.sin(offAngle) * bendStrength * 0.35 + Math.sin(baseAngle) * dist * 0.2
      cp2x = endX + Math.cos(offAngle) * bendStrength * 0.35 - Math.cos(baseAngle) * dist * 0.2
      cp2y = realEndY + Math.sin(offAngle) * bendStrength * 0.35 - Math.sin(baseAngle) * dist * 0.2
      break
    }
    case 1: { // 下方大弧 —— 大幅降低陡峭度
      const offAngle = baseAngle + Math.PI / 2
      cp1x = startX + Math.cos(offAngle) * bendStrength * 0.25 + Math.cos(baseAngle) * dist * 0.2
      cp1y = startY + Math.sin(offAngle) * bendStrength * 0.25 + Math.sin(baseAngle) * dist * 0.2
      cp2x = endX + Math.cos(offAngle) * bendStrength * 0.25 - Math.cos(baseAngle) * dist * 0.2
      cp2y = realEndY + Math.sin(offAngle) * bendStrength * 0.25 - Math.sin(baseAngle) * dist * 0.2
      break
    }
    case 2: { // S 形曲线 放缓
      const sign = Math.random() > 0.5 ? 1 : -1
      const offAngle1 = baseAngle + sign * Math.PI / 2
      const offAngle2 = baseAngle - sign * Math.PI / 2
      cp1x = startX + Math.cos(offAngle1) * bendStrength * 0.25 + Math.cos(baseAngle) * dist * 0.25
      cp1y = startY + Math.sin(offAngle1) * bendStrength * 0.25 + Math.sin(baseAngle) * dist * 0.25
      cp2x = endX + Math.cos(offAngle2) * bendStrength * 0.25 - Math.cos(baseAngle) * dist * 0.25
      cp2y = realEndY + Math.sin(offAngle2) * bendStrength * 0.25 - Math.sin(baseAngle) * dist * 0.25
      break
    }
    case 3: { // 大回旋 变平缓
      const sideSign = Math.random() > 0.5 ? 1 : -1
      const sideAngle = baseAngle + sideSign * Math.PI / 2
      const midDist = dist * 0.5
      const midX = startX + Math.cos(baseAngle) * midDist
      const midY = startY + Math.sin(baseAngle) * midDist
      cp1x = midX + Math.cos(sideAngle) * bendStrength * 0.4
      cp1y = midY + Math.sin(sideAngle) * bendStrength * 0.4
      cp2x = midX + Math.cos(sideAngle) * bendStrength * 0.4
      cp2y = midY + Math.sin(sideAngle) * bendStrength * 0.4
      break
    }
  }

  // 三次贝塞尔: B(t) = (1-t)³·P0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3
  function bezier(t) {
    const u = 1 - t
    const uu = u * u
    const tt = t * t
    const uuu = uu * u
    const ttt = tt * t
    return {
      x: uuu * startX + 3 * uu * t * cp1x + 3 * u * tt * cp2x + ttt * endX,
      y: uuu * startY + 3 * uu * t * cp1y + 3 * u * tt * cp2y + ttt * realEndY,
    }
  }

  const proxy = { t: 0, scale: 1 }
  gsap.to(proxy, {
    t: 1,
    duration: color === 0x888888 ? 0.7 + Math.random() * 0.25 : 0.4 + Math.random() * 0.2, // 灰色尖刺飞弹飞行时间更长/更平缓
    ease: 'power2.in',
    delay: delayMs / 1000,
    onUpdate: () => {
      const pos = bezier(proxy.t)
      el.style.left = (pos.x - 14) + 'px'
      el.style.top = (pos.y - 14) + 'px'
      // 飞行方向旋转
      if (proxy.t < 0.98) {
        const next = bezier(Math.min(1, proxy.t + 0.02))
        const angle = Math.atan2(next.y - pos.y, next.x - pos.x) * 180 / Math.PI
        el.style.transform = 'rotate(' + angle + 'deg)'
      }
      // 淡出拖尾
      el.style.opacity = (1 - proxy.t * 0.5)
    },
    onComplete: () => {
      // 命中爆炸 同步抬高
      _burstAtPosition(endX, realEndY, overlay)
      _releaseDomEl(el)
      if (onHit) onHit()
      setTimeout(() => {
        _releaseOverlay(overlay)
      }, 700)
    },
  })
}
/** 在指定位置产生爆炸粒子 */
function _burstAtPosition(x, y, parentOverlay) {
  const colors = [0x42a5f5, 0x90caf9, 0xbbdefb]
  const poolKey = '_missile_burst'
  if (!_dragPoolMap[poolKey]) {
    _dragPoolMap[poolKey] = _buildSimplePool(colors, 14)
  }
  const pool = _dragPoolMap[poolKey]
  const count = 5

  for (let i = 0; i < count; i++) {
    const src = pool[Math.floor(Math.random() * pool.length)]
    const half = src.width / 2
    const el = _acquireDomEl(src)

    const angle = rand(0, Math.PI * 2)
    const startDist = rand(0, 6)
    el.style.cssText = [
      'position:fixed',
      'left:' + (x + Math.cos(angle) * startDist - half) + 'px',
      'top:' + (y + Math.sin(angle) * startDist - half) + 'px',
      'opacity:' + rand(0.7, 1),
    ].join(';')
    parentOverlay.appendChild(el)

    const dist = rand(40, 60)
    gsap.to(el, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - rand(0, 12),
      rotation: rand(-180, 180),
      opacity: 0,
      scale: rand(1, 1.5),
      duration: rand(0.55, 0.85),
      ease: 'power2.out',
      onComplete: () => _releaseDomEl(el),
    })
  }
}

/**
 * 播放完整的魔力飞弹序列 —— 多枚飞弹依次发射
 *
 * @param {Object} enemy - 目标敌人对象（含 spine 坐标）
 * @param {number} count  - 飞弹数量
 * @param {number} totalCost - 总消耗魔力（用于单发伤害计算）
 * @param {Function} onEachHit - 每枚飞弹命中回调 (missileIndex)
 * @param {number} [totalDelayMs=1200] - 整个序列的总时长（ms）
 */
export function playManaMissileSequence(enemy, count, onEachHit, totalDelayMs = 900) {
  if (!enemy || count <= 0) return

  const spinePos = getEnemySpinePos(enemy)
  if (!spinePos) return

  const endX = spinePos.x
  const endY = spinePos.y

  // 起点：玩家卡牌区域中间偏上
  const vw = window.innerWidth / 100
  const vh = window.innerHeight / 100
  const startX = 20 * vw
  const startY = 65 * vh

  const interval = totalDelayMs / count

  for (let i = 0; i < count; i++) {
    const delay = i * interval + Math.random() * interval * 0.3
    _playSingleManaMissile(startX, startY, endX, endY, () => {
      if (onEachHit) onEachHit(i)
    }, delay)
  }
}

/**
 * 清理所有活跃的命中粒子特效（战斗结束时调用）
 */
export function clearAllHitParticles() {
  // 1) 清理 Pixi ParticleContainer（修复 BUG: 传 pool key 而非 '_active'）
  _activeEffects.forEach(pc => {
    gsap.killTweensOf(pc.particleChildren)
    // 从 pc 上获取 element 标记（由 playHitParticlesOnEnemy 调用时设置）
    const element = pc._element || 'physical'
    const children = [...pc.particleChildren]
    children.forEach(p => {
      pc.removeParticle(p)
      _releaseParticle(p, element)
    })
    if (pc.parent) pc.parent.removeChild(pc)
    _releaseContainer(pc)
  })
  _activeEffects = []

  // 2) 清理所有活跃 DOM 特效（每个 overlay 及其子元素归还池中）
  _activeDomEffects.forEach(ov => _releaseOverlay(ov))
  _activeDomEffects.length = 0

  // 3) 清理所有残留 gsap tween（粒子动画）
  gsap.killTweensOf(_domElPool)
  gsap.killTweensOf(_overlayPool)
}

/**
 * 尖刺防御粒子：复用魔力飞弹贝塞尔曲线，灰色 + 更平缓
 * @param {object} enemy - 目标敌人对象
 * @param {function} onHit - 命中回调
 */
export function playSpikeDefense(enemy, onHit) {
  if (!enemy) return
  const spinePos = getEnemySpinePos(enemy)
  if (!spinePos) return
  const VH = window.innerHeight / 100
  const startX = 20 * window.innerWidth / 100
  const startY = 65 * VH
  const endX = spinePos.x
  const endY = spinePos.y - 8 * VH
  // 复用魔力飞弹的贝塞尔曲线逻辑，灰色 + 长飞行时间更平缓
  _playSingleManaMissile(startX, startY, endX, endY, onHit, 0, 0x888888)
}

/**
 * 尖刺攻击：灰色粒子直线飞向最近敌人，命中爆炸
 * @param {object} enemy - 目标敌人对象（含 x, y, uid）
 * @param {function} onHit - 命中回调
 */
export function playSpikeAttack(enemy, onHit) {
  if (!enemy) return

  const spinePos = getEnemySpinePos(enemy)
  if (!spinePos) return

  const endX = spinePos.x
  const endY = spinePos.y
  const vw = window.innerWidth / 100
  const vh = window.innerHeight / 100
  const startX = 20 * vw    // 玩家卡牌区域中间偏上
  const startY = 65 * vh
  const realEndY = endY - 19 * vh // 命中点往上偏移 8vh

  const overlay = _acquireOverlay(99996)

  // 创建灰色圆形粒子（Canvas绘制）—— 缓存到池
  const spikePoolKey = '_spike_gray'
  if (!_dragPoolMap[spikePoolKey]) {
    const size = 10
    const mc = document.createElement('canvas')
    mc.width = mc.height = size
    const ctx2 = mc.getContext('2d')
    const gradient = ctx2.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, '#cccccc')
    gradient.addColorStop(1, '#555555')
    ctx2.fillStyle = gradient
    ctx2.beginPath()
    ctx2.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx2.fill()
    _dragPoolMap[spikePoolKey] = mc
  }
  const spikeSource = _dragPoolMap[spikePoolKey]

  const el = _acquireDomEl(spikeSource)
  el.style.cssText = `position:fixed;left:${startX - 5}px;top:${startY - 5}px;opacity:1;z-index:99997`
  overlay.appendChild(el)

  // 直线飞行到目标
  const flyDuration = 400 // ms
  const startTime = performance.now()

  function animateMissile(now) {
    const t = Math.min((now - startTime) / flyDuration, 1)
    const x = startX + (endX - startX) * t
    const y = startY + (realEndY - startY) * t
    el.style.left = (x - 5) + 'px'
    el.style.top = (y - 5) + 'px'

    if (t < 1) {
      requestAnimationFrame(animateMissile)
    } else {
      // 命中后爆炸特效：多个小灰色碎片向四周扩散
      _releaseDomEl(el)

      // 创建5个碎片向四周飞出（池中 canvas 绘制灰色圆）
      const fragPoolKey = '_spike_frag'
      if (!_dragPoolMap[fragPoolKey]) {
        const size = 8
        const fc = document.createElement('canvas')
        fc.width = fc.height = size
        const fctx = fc.getContext('2d')
        fctx.fillStyle = '#888888'
        fctx.beginPath()
        fctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        fctx.fill()
        _dragPoolMap[fragPoolKey] = fc
      }
      const fragSource = _dragPoolMap[fragPoolKey]

      for (let i = 0; i < 5; i++) {
        const fr = _acquireDomEl(fragSource)
        const fs = 3 + Math.random() * 4
        const angle = (Math.PI * 2 / 5) * i + (Math.random() - 0.5) * 0.5
        const dist = 20 + Math.random() * 30
        fr.style.cssText = `position:fixed;left:${endX - fs / 2}px;top:${realEndY - fs / 2}px;opacity:0.8;z-index:99997;`
        overlay.appendChild(fr)
        requestAnimationFrame(() => {
          fr.style.left = (endX + Math.cos(angle) * dist - fs / 2) + 'px'
          fr.style.top = (realEndY + Math.sin(angle) * dist - fs / 2) + 'px'
          fr.style.opacity = '0'
          fr.style.transition = `all ${0.3 + Math.random() * 0.2}s ease-out`
          setTimeout(() => _releaseDomEl(fr), 500)
        })
      }

      setTimeout(() => {
        _releaseOverlay(overlay)
      }, 800)

      if (onHit) onHit()
    }
  }

  requestAnimationFrame(animateMissile)
}

