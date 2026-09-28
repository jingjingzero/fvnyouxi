/**
 * 粒子特效模块
 * 纯 PixiJS v8 + gsap 实现，使用 ParticleContainer + 对象池优化性能
 */
import { Texture, Assets, ParticleContainer, Particle } from 'pixi.js'
import { gsap } from 'gsap'

// ========== 全局池 ==========

/** 粒子池：{ textureKey: Particle[] } */
const _particlePool = {}
let _activeParticles = 0
const MAX_PARTICLES = 500

/** 从池中获取或新建 Particle */
function _acquireParticle(texture) {
    if (_activeParticles >= MAX_PARTICLES) return null
    const key = texture.label || '_default'
    if (!_particlePool[key]) _particlePool[key] = []
    const pool = _particlePool[key]
    let p = pool.pop()
    if (!p) {
        p = new Particle({ texture, anchorX: 0.5, anchorY: 0.5 })
    } else {
        p.texture = texture
        p.alpha = 1
        p.scaleX = 1
        p.scaleY = 1
        p.rotation = 0
        p.tint = 0xffffff
        p.x = 0
        p.y = 0
    }
    _activeParticles++
    return p
}

/** 归还 Particle 到池中 */
function _releaseParticle(p) {
    gsap.killTweensOf(p)
    const key = p.texture?.label || '_default'
    if (!_particlePool[key]) _particlePool[key] = []
    _particlePool[key].push(p)
    _activeParticles--
}

/** ParticleContainer 对象池 */
const _containerPool = []

function _acquireContainer() {
    return _containerPool.pop() || new ParticleContainer({
        dynamicProperties: {
            vertex: true,
            position: true,
            rotation: true,
            color: true,
        },
    })
}

function _releaseContainer(c) {
    c.removeParticles()
    c.zIndex = 0
    if (c.parent) c.parent.removeChild(c)
    _containerPool.push(c)
}

// ----- 工具函数 -----
let VH = window.innerHeight / 100
let VW = window.innerWidth / 100

export function updateViewportUnits() {
    VH = window.innerHeight / 100
    VW = window.innerWidth / 100
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
    const tex = Texture.from(canvas)
    tex.label = '_fallback'
    return tex
}

/**
 * 在 0-1 之间随机
 */
function rand(min = 0, max = 1) {
    return min + Math.random() * (max - min)
}




// ============================================================
//  敌人死亡消散特效
// ============================================================

/**
 * 敌人死亡时的消散粒子效果
 * 许多小烟雾向周围扩散
 *
 * @param {Container} parentContainer
 * @param {number} x - 死亡位置 X
 * @param {number} y - 死亡位置 Y（底部）
 * @param {object} [options]
 * @param {number} [options.duration=1.5]
 * @param {number} [options.scale=1] - 粒子大小倍率
 * @returns {{ container: Container }}
 */
export async function createEnemyDeathEffect(parentContainer, x, y, options = {}) {
    const { duration = 1.5, scale = 1 } = options
    let tex
    try { tex = Assets.get('CartoonSmoke'); if (tex) {} } catch (e) { /* ignore */ }
    if (!tex) {
        try { tex = await Assets.load('CartoonSmoke'); if (tex) {} } catch (e) { /* ignore */ }
    }
    if (!tex) {
        try { tex = await Assets.load('particle'); if (tex) {} } catch (e) { /* ignore */ }
    }
    if (!tex) tex = _makeFallbackTex()
    tex.label = tex.label || 'CartoonSmoke'

    const pc = _acquireContainer()
    pc.zIndex = 998
    parentContainer.addChild(pc)

    for (let i = 0; i < 120; i++) {
        const p = _acquireParticle(tex)
        if (!p) break
        const startSize = rand(0.04, 0.1) * scale
        p.x = x + rand(-10, 10)
        p.y = y + rand(-5, 5)
        p.tint = rand(0, 1) > 0.5 ? 0x444444 : 0x888888
        p.alpha = rand(0.3, 0.7)
        p.scaleX = startSize
        p.scaleY = startSize
        pc.addParticle(p)

        const angle = rand(0, Math.PI * 2)
        const dist = rand(40, 160)
        const endSize = rand(0.04, 0.1) * scale
        gsap.to(p, {
            x: x + Math.cos(angle) * dist,
            y: y + Math.sin(angle) * dist - rand(0, 40),
            scaleX: endSize,
            scaleY: endSize,
            alpha: 0,
            rotation: rand(-Math.PI, Math.PI),
            duration: rand(0.8, 2.0) * duration,
            ease: 'power2.out',
            delay: rand(0, 0.15),
        })
    }

    return { container: pc, _texKey: tex.label }
}



/**
 * 清理粒子特效（支持 ParticleContainer + 对象池）
 * @param {{ container: Container, _texKey?: string }} effect
 */
export function destroyEffect(effect) {
    if (!effect) return
    const { container, _texKey } = effect
    if (!container) return

    // 停止所有 gsap 动画
    gsap.killTweensOf(container.particleChildren || container.children)

    // 如果是 ParticleContainer，归还粒子到池中
    if (container.particleChildren) {
        const texKey = _texKey || '_default'
        const children = [...container.particleChildren]
        children.forEach(p => {
            container.removeParticle(p)
            _releaseParticle(p)
        })
    } else {
        // 旧版 Container 直接销毁
        if (container.parent) container.parent.removeChild(container)
        container.destroy({ children: true })
        return
    }

    _releaseContainer(container)
}
