<template>
  <!-- 🏃 全局单例加载动画：右下角循环播放 paobuload spine（原 256×256，显示约 16vh）
       用法：<LoadingSpine :show="isPageLoading" />，show=true 显示并循环播放，false 隐藏。
       实现说明：PIXI 应用只创建一次（挂 body 顶层，z-index 最高），永不销毁，仅控制显隐——
       避免多 renderer 创建/销毁破坏宿主渲染管线（曾导致 null.clear / BindGroup null[2] 报错）。 -->
</template>

<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue'
import { Application, Assets } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'

const props = defineProps({
  show: { type: Boolean, default: false },
})

// ==================== 全局单例（模块级，整个游戏只创建一次） ====================
let shared = null        // { app, spine, container, tickerFn }
let booting = null       // 初始化 promise（防并发重复创建）

const SKEL = '/pixi1/paobuload.skel'
const ATLAS = '/pixi1/paobuload.atlas'
const BOX_VH = 30 // 容器占屏幕高度 13vh（原 256×256，缩小不裁剪）
const PLAY_SPEED = 0.45 // 动画播放速度 0.5 倍

function boxSize() { return Math.max(30, Math.round(window.innerHeight * BOX_VH / 100)) }

function ensureGlobal() {
  if (shared) return Promise.resolve(shared)
  if (booting) return booting
  booting = (async () => {
    const BOX = boxSize()
    const container = document.createElement('div')
    container.style.cssText = `position:fixed;right:1vw;bottom:2vh;width:${BOX_VH}vh;height:${BOX_VH}vh;z-index:99999;pointer-events:none;display:none;`
    document.body.appendChild(container)
    const app = new Application()
    await app.init({ width: BOX, height: BOX, backgroundAlpha: 0, antialias: false, autoDensity: true, resolution: 2 })
    container.appendChild(app.canvas)
    // 加载 paobuload（qidong 已预加载，通常毫秒级命中缓存）
    await Assets.load([SKEL, ATLAS])
    const spine = new Spine({ skeleton: SKEL, atlas: ATLAS, allowMissingRegions: true, autoUpdate: false })
    // 🔁 循环播放第一个动画（paobuload 动画名为 'animation'），0.5 倍速
    const anims = spine.skeleton?.data?.animations || []
    if (anims.length) spine.state.setAnimation(0, anims[0].name, true)
    spine.state.timeScale = PLAY_SPEED
    spine.update(0.05)
    // 🎯 等比缩放完整显示（不裁剪）并居中：用动画全程摆动边界的最大包围盒适配，跑动时手脚不超出画布
    let maxBounds = null
    const computeMaxBounds = () => {
      try {
        const anims = spine.skeleton?.data?.animations || []
        if (!anims.length) return null
        const anim = anims[0]
        const total = anim.duration || 0.5
        const N = 16
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
        for (let i = 0; i <= N; i++) {
          spine.state.setAnimation(0, anim.name, false)
          spine.state.update((total * i) / N)
          spine.skeleton.updateWorldTransform()
          let b = null
          try { b = spine.getLocalBounds() } catch (e) { b = null }
          if (b && b.width > 0 && b.height > 0) {
            x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y)
            x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height)
          }
        }
        spine.state.setAnimation(0, anim.name, true) // 恢复循环
        spine.state.update(0)
        spine.skeleton.updateWorldTransform()
        if (x2 <= x1 || y2 <= y1) return null
        return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
      } catch (e) { return null }
    }
    const fitSpine = () => {
      const box = boxSize()
      if (!maxBounds) maxBounds = computeMaxBounds()
      const b = maxBounds
      const s = (b && b.width > 0 && b.height > 0) ? Math.min(box / b.width, box / b.height) * 0.7 : 1
      spine.scale.set(s)
      spine.x = box / 2 - ((b && b.width) ? (b.x + b.width / 2) * s : 0)
      spine.y = box / 2 - ((b && b.height) ? (b.y + b.height / 2) * s : 0)
      return box
    }
    const box0 = fitSpine()
    app.renderer.resize(box0, box0, 2)
    app.stage.addChild(spine)
    // ⏱ deltaMS/1000 转秒驱动（v8 deltaTime 是无量纲标量）
    const tickerFn = (delta) => { spine.update(delta.deltaMS / 1000) }
    app.ticker.add(tickerFn)
    // 窗口变化时重算容器尺寸与 spine 适配（显式保持 2x 分辨率，避免 resize 后变糊）
    const onResize = () => { const box = fitSpine(); app.renderer.resize(box, box, 2) }
    window.addEventListener('resize', onResize)
    shared = { app, spine, container, tickerFn, onResize }
    return shared
  })()
  return booting
}

/** 播放/暂停（不销毁，只显隐；每次显示重播动画从头开始） */
async function setShow(v) {
  if (v) {
    const g = await ensureGlobal()
    if (!g.container) return
    const anims = g.spine.skeleton?.data?.animations || []
    if (anims.length) g.spine.state.setAnimation(0, anims[0].name, true)
    g.container.style.display = 'block'
  } else if (shared) {
    shared.container.style.display = 'none'
  }
}

watch(() => props.show, (v) => { setShow(v) })

onMounted(() => { setShow(props.show) })
// 组件卸载时隐藏全局动画（v-if 场景：加载遮罩销毁后动画不能残留；单例本身不销毁）
onBeforeUnmount(() => { setShow(false) })
</script>
