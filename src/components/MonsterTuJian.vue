<template>
  <el-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)"
    :title="L('monsterCodex')" width="96vw" top="2vh" :close-on-click-modal="true"
    :class="view === 'detail' ? 'monster-codex monster-codex-hide-header mb-0! h-95vh' : 'monster-codex mb-0! h-95vh'" custom-class="monster-codex-dialog" append-to-body>

    <!-- ========== 列表视图：怪物名字 + 头像 ========== -->
    <div v-if="view === 'list' && monsterList.length" class="h-full flex flex-col  h-75vh! overflow-y-auto">
      <div
        class="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-5 gap-[1vh] overflow-y-auto pr-[0.6vh] overflow-y-auto
        [&::-webkit-scrollbar]:w-[0.6vh] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-#3d2c63 [&::-webkit-scrollbar-track]:bg-transparent">
        <button v-for="m in monsterList" :key="m.key"
          class="flex flex-col items-center gap-[0.7vh] rounded-xl p-[1.8vh_1vh] bg-#241638 border border-#3d2c63 cursor-pointer transition-all hover:border-#8B5CF6 hover:bg-#2a1d45 active:scale-95"
          @click="openDetail(m.key)">
          <div
            class="w-full aspect-square rounded-lg border border-#3d2c63 bg-#1d1330 overflow-hidden flex items-center justify-center">
            <img v-if="thumbs[m.key]" :src="thumbs[m.key]" class="w-full h-full object-contain" alt="" />
            <span v-else class="text-[min(4vw,24px)] text-#6b5a8f">{{ L('generating') }}</span>
          </div>
          <span class="text-[min(2.3vw,13px)] font-bold text-#f0ecfa">{{ tr(m.name) }}</span>
          <span class="px-[1vh] py-[0.15vh] rounded-full text-[min(1.6vw,10px)] font-bold" :class="typeClsOf(m.key, m.data)">{{
            typeLabelOf(m.key, m.data) }}</span>
        </button>
      </div>
    </div>

    <!-- ========== 详情视图：属性 + 普攻 + 技能 ========== -->
    <div v-else-if="view === 'detail' && sel" class="h-full flex flex-col min-h-0 gap-[0.9vh]">
      <!-- 头部：返回 + 名称 + 类型 -->
      <div class="flex items-center gap-[0.8vw] flex-shrink-0">
        <button
          class="px-[1.2vh] py-[0.4vh] rounded-lg bg-#2a1d45 border border-#3d2c63 text-#c8b8f0 text-[min(2vw,12px)] font-bold cursor-pointer hover:bg-#352763 transition-all flex-shrink-0"
          @click="backToList">{{ L('mcBack') }}</button>
        <span class="text-[min(3.6vw,18px)] font-black text-#333">{{ tr(sel.name) }}</span>
        <span class="px-[1vh] py-[0.2vh] rounded-full text-[min(1.7vw,10.5px)] font-bold" :class="typeClsOf(selKey, sel)">{{
          typeLabelOf(selKey, sel) }}</span>
      </div>

      <!-- 主行：左 spine（不变）+ 右侧上下分布（属性在上，普攻+技能+被动合并在一个框内） -->
      <div
        class="flex-1 min-h-0 flex flex-row gap-[1vw]  overflow-y-auto pr-[0.6vh] pb-[1vh]  h-20vh!
        [&::-webkit-scrollbar]:w-[0.6vh] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-#3d2c63 [&::-webkit-scrollbar-track]:bg-transparent">
        <!-- 左：spine（不变，占满剩余宽度，不被属性栏挤压 → 不裁剪） -->
        <div ref="detailSpineBox" class="rounded-lg bg-white overflow-hidden" style="border: 2px solid #6b4d9e; box-shadow: 0 4px 16px rgba(0,0,0,0.3); height: 80vh;"></div>

        <!-- 右：上下分布 -->
        <div class="flex flex-col gap-[0.9vh] w-60vw min-h-0">
          <!-- 属性面板（上） -->
          <div class="rounded-lg p-[0.9vh] bg-#241638 border border-#3d2c63 grid grid-cols-4 auto-rows-fr gap-x-[0.4vw] gap-y-[0.6vh]">
            <el-popover v-for="s in statItems" :key="s.key" placement="top" :width="200" trigger="hover" :show-arrow="true" popper-class="stat-popover-dark" style="display:contents">

              <template #reference>
                <div class="flex items-center justify-center p-[1vh] gap-x-2 rounded-lg bg-#2a1d45 border border-#3a2a5c cursor-help transition-all hover:border-#6b4d9e">
                  <img v-if="s.img" :src="inventoryImg(s.img)" class="max-h-[6vh] max-w-[70%] object-contain" />
                  <span class="text-[min(2.1vw,12px)] font-black text-#f0ecfa">{{ s.value }}</span>
                </div>
              </template>
              <div style="font-size:13px;line-height:1.6;">
                <b style="color:#e8c88a;">{{ s.label }}</b>
                <p style="margin-top:4px;color:#c8b896;">{{ s.desc }}</p>
              </div>
            </el-popover>
          </div>

          <!-- 技能总框（下：普攻+技能+被动合并在一个方框内，内部滚动） -->
          <div class="h-60vh! overflow-y-auto monster-detail-scroll rounded-lg p-[1vh] bg-#241638 border border-#3d2c63 flex flex-col gap-[1.2vh]">
            <!-- 普攻 -->
            <div>
              <div class="flex items-center gap-[0.5vw] mb-[0.4vh]">
                <span class="text-[min(2.6vw,14px)] font-bold text-#e8c88a">⚔️ {{ L('basicAttack') }}</span>
              </div>
              <div class="flex flex-wrap gap-x-[1.4vw] gap-y-[0.4vh] text-[min(2.2vw,12.5px)] text-#d9bc86">
                <template v-if="sel.attackPoison">
                  <span class="text-[#7ee2a8]">{{ L('mcPoison') }}：<b>{{ sel.attackPoison.turns ??
                    3 }}{{ L('turnUnit') }} / {{ pct(sel.attackPoison.ratio ?? 0.5) }} {{ L('attackLabel') }}毒伤</b></span>
                </template>
                <template v-else>
                  <span>{{ L('mcDmgType') }}：<b>{{ dmgTypeLabel(sel.attackDmgType) }}</b></span>
                  <span>{{ L('mcMultiplier') }}：<b>{{ pct(sel.attackMultiplier) }}</b></span>
                  <span v-if="sel.attackHits > 1">{{ L('mcHits') }}：<b>{{ sel.attackHits }}</b></span>
                  <span v-if="sel.attackArmorReducePct > 0">{{ L('mcArmorShred') }}：<b>{{ pct(sel.attackArmorReducePct)
                      }}</b></span>
                </template>
              </div>
            </div>

            <!-- 技能 -->
            <div>
              <div class="flex items-center gap-[0.5vw] mb-[0.4vh]">
                <span class="text-[min(2.6vw,14px)] font-bold text-#9cc3f5">✨ {{ L('skill') }}</span>
              </div>
              <div v-if="sel.skills && sel.skills.length" class="flex flex-col gap-[0.6vh]">
                <div v-for="(s, i) in sel.skills" :key="i" class="rounded-lg bg-#1a2940 border border-#34507c p-[0.8vh]">
                  <div class="flex items-center gap-[0.6vw] mb-[0.2vh]">
                    <span class="text-[min(2.4vw,13px)] font-bold text-#e8f0fd">{{ tr(s.name) }}</span>
                    <span class="text-[min(1.8vw,11px)] text-#7d9cc9">{{ L('mcCooldown') }} {{ s.cooldown ?? '-' }}</span>
                  </div>
                  <div class="text-[min(2.2vw,12.5px)] leading-relaxed text-#bcd4f5">{{ tr(s.desc || '') }}</div>
                </div>
              </div>
              <div v-else class="text-[min(2vw,11.5px)] text-#7d9cc9">{{ L('mcNoSkill') }}</div>
            </div>

            <!-- 被动 -->
            <div>
              <div class="flex items-center gap-[0.5vw] mb-[0.4vh]">
                <span class="text-[min(2.6vw,14px)] font-bold text-#e3d0a0">🌀 {{ L('passive') }}</span>
              </div>
              <div v-if="sel.passives && sel.passives.length" class="flex flex-col gap-[0.6vh]">
                <div v-for="(p, i) in sel.passives" :key="i"
                  class="rounded-lg bg-#2c2415 border border-#5c4a20 p-[0.8vh]">
                  <div class="text-[min(2.4vw,13px)] font-bold text-#f5ecd4 mb-[0.2vh]">{{ tr(p.name) }}</div>
                  <div class="text-[min(2.2vw,12.5px)] leading-relaxed text-#e3d0a0">{{ tr(p.desc || '') }}</div>
                </div>
              </div>
              <div v-else class="text-[min(2vw,11.5px)] text-#b8a06a">{{ L('mcNoPassive') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="loadError" class="py-[6vh] text-center text-[min(2.6vw,14px)] text-#f56c6c">{{ L('mcLoadFail') }}
    </div>
    <div v-else class="py-[6vh] text-center text-[min(2.6vw,14px)] text-#9d8fc4">{{ L('generating') }}</div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Application, Assets } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { tr, t as i18nT, getLang } from "@/i18n"

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

// 🌐 语言切换刷新
const langVersion = ref(0)
function L(key) { langVersion.value; return i18nT(key) }
window.addEventListener("fvnyouxi-lang-changed", () => langVersion.value++)

// ========== 数据联动：与 dladmin 怪物编辑共用 enemiesData.js 的 monsterConfigs（动态 import 防缓存） ==========
// 模板铺底：怪未显式设置的字段按模板默认值显示（与 dladmin MONSTER_TEMPLATE 一致）
const MONSTER_TEMPLATE = {
  attackMultiplier: 1, attackHits: 1, hitIntervalMs: 150, attackDmgType: 'physical',
  magicResist: 0, damageTaken: 0, allDamageBonus: 0, physDamageTaken: 0,
  executeDamageBonus: 1, takenDamageReduce: 1, attackArmorReducePct: 0,
}
const DMG_TYPES = {
  physical: ['物理', 'Physical'], lightning: ['雷', 'Lightning'], wind: ['风', 'Wind'],
  fire: ['火', 'Fire'], water: ['水', 'Water'], ice: ['冰', 'Ice'],
  'null': ['无属性', 'None'], poison: ['毒', 'Poison'],
}

// 🎭 怪物头像（优先用 fullBody/head 下的美术头像；无图则用 emoji 兜底）
const MONSTER_AVATAR_IMG = {
  monster1: 'anying.webp',
  guaiwu2: 'mohuamao.webp',
  guaiwu3: 'leiniao.webp',
  anyingwang: 'anyingwang.webp',
  nvhuang: 'leiniaonvhuang.webp',
  fengxi: 'fengxi.webp',
}
function avatarImgOf(key) {
  const f = MONSTER_AVATAR_IMG[key]
  if (!f) return ''
  try {
    return new URL(`../assets/fullBody/head/${f}`, import.meta.url).href
  } catch (e) { return '' }
}
const MONSTER_AVATAR = {
  monster1: '👾', guaiwu2: '🐱', guaiwu3: '🦅',
  anyingwang: '👑', jutong: '👁️', nvhuang: '👸', fengxi: '🌪️',
}
function avatarOf(key) { return MONSTER_AVATAR[key] || '👾' }

const monsterList = ref([])
const view = ref('list')       // 'list' 列表 / 'detail' 详情
const selKey = ref(null)       // 当前查看详情的怪物 key
const loadError = ref(false)
const loaded = ref(false)
// 📸 无头像怪物的 Q 版立绘（骨骼渲染截图，同 TuJian.vue 的 thumbs 机制）
const thumbs = reactive({})
let captureApp = null // ⚠️ 缩略图截图 App 全局复用一个（避免 WebGL 上下文堆积挤掉主页）

/** 渲染怪物骨骼并截图（有头像图则跳过；资源缺失静默跳过） */
async function captureThumb(key) {
  if (thumbs[key] || spineDead) return
  const skel = `${key}_skel`, atlas = `${key}_atlas`
  if (!Assets.cache.has(skel) || !Assets.cache.has(atlas)) return
  try {
    if (!captureApp) {
      captureApp = new Application()
      await captureApp.init({
        width: 320, height: 320, backgroundAlpha: 0, antialias: false, resolution: 1, autoStart: false,
      })
    }
    const spine = new Spine({ skeleton: skel, atlas, allowMissingRegions: true, autoUpdate: false })
    captureApp.stage.addChild(spine)
    playEnemyIdle(spine)
    spine.update(0.05)
    const bounds = getSpineBounds(spine)
    if (bounds.width > 0 && bounds.height > 0) {
      fitSpine(spine, 320, 320, 0.85)
      spine.update(0.05)
      captureApp.renderer.render(captureApp.stage)
      thumbs[key] = captureApp.renderer.extract.canvas(spine).toDataURL('image/png')
    }
    captureApp.stage.removeChild(spine)
    spine.destroy({ children: true, texture: false })
  } catch (e) { console.warn('[怪物图鉴] 缩略图生成失败:', key, e) }
}

/** 对没有头像图的怪物逐个生成 Q 版立绘（让出主线程避免卡顿） */
async function genThumbs() {
  for (const mm of monsterList.value) {
    if (spineDead) return
    await captureThumb(mm.key)
    await new Promise(r => setTimeout(r, 30))
  }
}

// ==================== Q版 spine 待机动画（详情左栏） ====================
const detailSpineBox = ref(null)
let detailApp = null
let detailSpine = null
let spineDead = false
let detailFitToken = 0 // 🔢 fit 循环令牌：clearDetailSpine 时自增，旧 fit 循环立即失效（防切怪后旧循环操作新 spine）

/** 播放敌人待机动画：与战斗一致，优先 fight（战斗中待机），缺省 idle，再第一个非 attack */
function playEnemyIdle(spine, speed = 1) {
  try {
    spine.state.timeScale = speed
    const anims = spine.skeleton?.data?.animations || []
    const has = n => anims.some(a => a.name === n)
    const base = has('fight') ? 'fight'
      : (has('idle') ? 'idle'
        : (anims.find(a => a.name !== 'attack')?.name || anims[0]?.name || null))
    if (base) spine.state.setAnimation(0, base, true)
    // 混合动画叠加（与 spineBoy / TuJian 一致）
    if (has('animation')) spine.state.setAnimation(1, 'animation', true)
  } catch (e) { /* 忽略 */ }
}

/** 计算 spine 实际内容包围盒 */
function getSpineBounds(spine) {
  try {
    const b = spine.bounds
    if (b && b.width > 0 && b.height > 0 && b.width !== Infinity) {
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    }
  } catch (e) { /* 忽略 */ }
  try {
    const g = spine.getBounds()
    if (g && g.width > 0 && g.height > 0) return g
  } catch (e) { /* 忽略 */ }
  return null
}

/** 归一化缩放：所有怪物统一按「实际包围盒高度」归一化，渲染高度 = 容器高度 × 0.6（大小一致、不偏大）；
    包围盒未就绪时缩放占位并 return false，由 RAF 重试直到就绪；过宽模型按宽度收窄防溢出 */
function fitSpine(spine, w, h, maxRatio = 0.8) {
  const boxW = w || 300
  const boxH = h || 200
  const bounds = getSpineBounds(spine)
  if (!bounds || !(bounds.width > 0) || !(bounds.height > 0)) {
    spine.scale.set(1)
    spine.x = boxW / 2
    spine.y = boxH / 2
    return false // 包围盒未就绪：继续重试（暗影王二阶段等 spine.height 不可靠，必须等真实包围盒）
  }
  // 📏 统一高度：所有怪物渲染高度 = 容器高 × 0.6，用实际包围盒，口径一致 → 每个 spine 一样大
  let scale = (boxH * 0.6) / bounds.height
  // ⚠️ 过宽模型（碎片/触手）：宽度超过容器 80% 时按宽度收窄，保证不溢出
  if (bounds.width * scale > boxW * 0.8) scale = (boxW * 0.8) / bounds.width
  spine.scale.set(scale)
  spine.x = boxW / 2 - (bounds.x + bounds.width / 2) * scale
  spine.y = boxH / 2 - (bounds.y + bounds.height / 2) * scale
  return true
}

/** 仅清空详情 spine（保留单例 app / canvas，供切换怪物时复用），不销毁 WebGL 实例 */
function clearDetailSpine() {
  detailFitToken++ // 让上一个怪物的 fit 循环失效
  try {
    if (detailApp && detailApp.stage) {
      detailApp.stage.removeChildren().forEach(ch => ch.destroy({ children: true, texture: false }))
    }
  } catch (e) { /* 忽略 */ }
  detailSpine = null
}

/** 真正销毁详情 app（对话框关闭 / 组件卸载时调用，保留共享资源池） */
function destroyDetailApp() {
  try {
    if (detailApp) {
      detailApp.ticker.stop()
      // ⚠️ 不能传 true：会触发 GlobalResourceRegistry.release() 清空共享几何体/资源池，
      //    导致主游戏后续渲染 Batcher/BindGroup 读 null 报错（与 TuJian.vue 一致，保留共享资源）
      detailApp.destroy(
        { removeView: true },
        { children: true, texture: false, textureSource: false, context: true }
      )
      detailApp = null
    }
  } catch (e) { /* 忽略 */ }
  detailSpine = null
  _detailAppPromise = null
  const box = detailSpineBox.value
  if (box) box.innerHTML = ''
}

// 🔧 单例详情 app：懒创建一次，切怪/返回只清 stage 复用，避免反复创建 WebGL 实例（上下文冲突/资源池问题）
let _detailAppPromise = null
function ensureDetailApp(box) {
  // 已创建且正常：复用（画布尺寸随容器变化同步；canvas 若脱离 DOM 则重新挂载）
  if (detailApp && detailApp.renderer && detailApp.canvas) {
    try {
      if (box && detailApp.canvas.parentNode !== box) box.appendChild(detailApp.canvas)
      if (box && detailApp.renderer.width !== Math.max(box.clientWidth || 300, 100)) {
        detailApp.renderer.resize(
          Math.max(box.clientWidth || 300, 100),
          Math.max(box.clientHeight || 120, 80)
        )
      }
    } catch (e) { /* 忽略 */ }
    return Promise.resolve(detailApp)
  }
  // 创建中：复用同一 Promise（防并发重复创建）
  if (!_detailAppPromise) {
    _detailAppPromise = (async () => {
      const app = new Application()
      await app.init({
        width: Math.max(box?.clientWidth || 300, 100),
        height: Math.max(box?.clientHeight || 120, 80),
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      })
      if (!app.renderer || !app.canvas) {
        _detailAppPromise = null
        try { app.destroy({ removeView: true }) } catch (e) { /* 忽略 */ }
        return null
      }
      box?.appendChild(app.canvas)
      // ticker 只注册一次：驱动当前 detailSpine
      app.ticker.add((delta) => {
        if (detailSpine && !spineDead) detailSpine.update(delta.deltaTime * (1 / 60))
      })
      detailApp = app
      _detailAppPromise = null
      return app
    })()
  }
  return _detailAppPromise
}

/** 渲染详情 Q版 spine（怪物骨骼名 = key，如 monster1 → monster1_skel / monster1_atlas） */
let detailRenderSeq = 0 // 🔢 渲染序号：并发触发（view/selKey 各 watch 一次）时只保留最后一次
async function renderDetailSpine() {
  clearDetailSpine()
  const box = detailSpineBox.value
  if (!box || !selKey.value || view.value !== 'detail') return
  const key = selKey.value
  const skel = `${key}_skel`, atlas = `${key}_atlas`
  // 资源未加载（如骨骼缺失）则静默跳过，属性区仍正常显示
  if (!Assets.cache.has(skel) || !Assets.cache.has(atlas)) return
  const mySeq = ++detailRenderSeq
  try {
    const app = await ensureDetailApp(box)
    // 🛡️ 渲染器初始化失败：静默跳过（属性区仍正常显示）
    if (!app) {
      console.warn('[怪物图鉴] 渲染器初始化失败，跳过 spine 渲染:', key)
      return
    }
    // 🛡️ 已被更新的渲染请求取代（view/selKey 并发触发）：放弃本次
    if (mySeq !== detailRenderSeq) return
    detailSpine = new Spine({ skeleton: skel, atlas, allowMissingRegions: true, autoUpdate: false })
    app.stage.addChild(detailSpine)
    const boxW = box.clientWidth || 300
    const boxH = box.clientHeight || 200
    const targetH = boxH * 0.85
    const mData = monsterList.value.find(m => m.key === key)?.data
    const customScale = mData?.codexScale ?? mData?.spineScale ?? 1 // 图鉴单独缩放 codexScale，没配回退战斗 spineScale
    // 📏 先 update 一帧让 bounds 可用，然后一次性算好 scale+位置（不再二次修正 → 不瞬移）
    detailSpine.update(0.05)
    const lb = detailSpine.getLocalBounds()
    if (lb && lb.height > 0) {
      const s = (targetH / lb.height) * customScale
      detailSpine.scale.set(s)
      detailSpine.x = boxW / 2 - (lb.x + lb.width / 2) * s
      detailSpine.y = boxH / 2 - (lb.y + lb.height / 2) * s
    } else {
      detailSpine.scale.set((targetH / (detailSpine.height || 100)) * customScale)
      detailSpine.x = boxW / 2
      detailSpine.y = boxH / 2
    }
    playEnemyIdle(detailSpine, mData?.codexAnimSpeed ?? 1)
  } catch (e) {
    console.warn('[怪物图鉴] spine 初始化失败:', key, e)
    destroyDetailApp()
  }
}

watch(() => view.value, (v) => {
  if (v === 'detail' && props.modelValue) nextTick(() => renderDetailSpine())
  else clearDetailSpine() // 返回列表：只清 spine，复用 app
})
watch(() => selKey.value, () => {
  if (view.value === 'detail' && props.modelValue) nextTick(() => renderDetailSpine())
})
onBeforeUnmount(() => {
  spineDead = true
  destroyDetailApp()
  // 🔒 销毁复用的截图 App（不能用 true，避免清掉共享几何体/纹理源）
  if (captureApp) {
    try {
      captureApp.destroy(
        { removeView: true },
        { children: true, texture: false, textureSource: false, context: true }
      )
    } catch (e) { /* 忽略 */ }
    captureApp = null
  }
})

async function loadMonsters() {
  loadError.value = false
  try {
    const mod = await import(`/src/pages/pixi/matter1/enemiesData.js?t=${Date.now()}`)
    const cfg = mod.monsterConfigs || {}
    monsterList.value = Object.entries(cfg).map(([key, c]) => ({
      key,
      name: c.name || key,
      data: { ...MONSTER_TEMPLATE, ...JSON.parse(JSON.stringify(c)) },
    }))
    genThumbs() // 📸 无头像怪物生成 Q 版立绘
  } catch (e) {
    console.error('[怪物图鉴] 加载失败', e)
    loadError.value = true
  }
}
function openDetail(key) { selKey.value = key; view.value = 'detail' }
function backToList() { view.value = 'list' }

// 打开时（重新）加载：每次打开都刷新，保证 dladmin 保存后图鉴拿到最新数据
// 并全局阻断滚轮，弹窗打开期间页面/画布完全不响应滚动
function blockWheel(e) {
  if (document.querySelector('.monster-codex-dialog')) e.preventDefault()
}
watch(() => props.modelValue, (v) => {
  if (v) {
    view.value = 'list'
    selKey.value = null
    loadMonsters(); loaded.value = true
    document.addEventListener('wheel', blockWheel, { capture: true, passive: false })
  } else {
    document.removeEventListener('wheel', blockWheel, { capture: true })
    destroyDetailApp() // 对话框关闭：释放详情 app
  }
})

// 详情对象：把 data 摊平，模板可直接访问 sel.skills / sel.attackMultiplier 等
const sel = computed(() => {
  const m = monsterList.value.find(x => x.key === selKey.value) || null
  return m ? { ...m.data, key: m.key, name: m.name } : null
})

// 类型：优先按配置 rank 字段（normal/elite/boss）；其次 isBoss；其次 guaiwu2/guaiwu3=精英；默认普通
function typeLabelOf(k, d) {
  if (d?.rank === 'boss' || d?.isBoss) return L('mcBoss')
  if (d?.rank === 'elite' || k === 'guaiwu2' || k === 'guaiwu3') return L('mcElite')
  return L('mcNormal')
}
function typeClsOf(k, d) {
  if (d?.rank === 'boss' || d?.isBoss) return 'bg-#5c2630 text-#ff9da8'
  if (d?.rank === 'elite' || k === 'guaiwu2' || k === 'guaiwu3') return 'bg-#5c4a20 text-#ffd98a'
  return 'bg-#3a4a6e text-#c8dcff'
}

const isEn = computed(() => { langVersion.value; return getLang() === 'en' })
function dmgTypeLabel(v) {
  const e = DMG_TYPES[v]
  if (!e) return v
  return isEn.value ? e[1] : e[0]
}
const pct = (v) => (v ?? 0) === 0 ? '0%' : `${Math.round((v ?? 0) * 100)}%`

// 属性图标（与 xinxi.vue 个人面板共用 assets/daoju/*.webp）
const inventoryImg = (src) => {
  if (!src) return ''
  const s = String(src)
  if (s.startsWith('http') || s.startsWith('/') || s.startsWith('data:')) return s
  const name = s.replace(/\.(webp|png|jpg|jpeg|gif)$/i, '')
  try {
    return new URL(`../assets/daoju/${name}.webp`, import.meta.url).href
  } catch (e) { return '' }
}

const statItems = computed(() => {
  const d = sel.value || {}
  const base = [
    { key: 'hp', img: 'Hp', label: 'HP', value: d.hp ?? '-', desc: '生命值：怪物被击败前的总血量' },
    { key: 'attack', img: 'Attack', label: L('attackLabel'), value: d.attack ?? '-', desc: '攻击力：怪物普通攻击造成的基础伤害' },
    { key: 'armor', img: 'Armor', label: L('attrArmor'), value: d.armor ?? '-', desc: '护甲：减少受到的物理伤害' },
    { key: 'magicResist', img: 'MR', label: L('attrMagicResist'), value: d.magicResist ?? '-', desc: '魔抗：减少受到的魔法伤害' },
    { key: 'speed', img: 'Speed', label: L('attrSpeed'), value: d.speed ?? '-', desc: '速度：影响行动条增长，速度越高行动越快' },
    { key: 'luck', img: 'Luck', label: L('attrLuck'), value: d.luck ?? '-', desc: '幸运：影响掉落与元素反应触发率' },
    { key: 'exp', img: 'Exp', label: L('mcBaseExp'), value: d.baseExp ?? '-', desc: '基础经验：击败该怪物获得的经验值' },
  ]
  return base
})
</script>

<style scoped>
/* 弹窗壳子（el-dialog 内部结构只能靠 :deep 覆盖，其余样式全部用 unocss 工具类） */
/* 🔝 详情页隐藏弹窗标题栏（怪物图鉴+关闭按钮），内容上移不占位 */
.monster-codex-hide-header :deep(.el-dialog__header) { display: none; }

.monster-codex-dialog {
  border-radius: 1.4vh;
  background: linear-gradient(180deg, #241638, #170f26);
  border: 1px solid #3d2c63;
  max-height: 76vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.monster-codex-dialog :deep(.el-dialog__header) {
  padding: 1.5vh 2.2vh 0.5vh;
  flex-shrink: 0;
}

.monster-codex-dialog :deep(.el-dialog__title) {
  font-size: 15px;
  font-weight: 700;
  color: #eae4f7;
}

.monster-codex-dialog :deep(.el-dialog__headerbtn) {
  top: 1.6vh;
}

.monster-codex-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #9d8fc4;
}

.monster-codex-dialog :deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #eae4f7;
}

/* 🔄 右侧板块内部滚动条（内容超高时滚动不裁切） */
.monster-detail-scroll::-webkit-scrollbar { width: 0.4vh; }
.monster-detail-scroll::-webkit-scrollbar-thumb { border-radius: 999px; background: #3d2c63; }
.monster-detail-scroll::-webkit-scrollbar-track { background: transparent; }

.monster-codex-dialog :deep(.el-dialog__body) {
  padding: 0.8vh 2.2vh 1.4vh;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>

<style>
/* 🔝 全局兜底：详情页隐藏弹窗标题栏（怪物图鉴+关闭按钮）。
   注意：el-dialog 用 append-to-body 传送到 body，scoped 的 :deep 选择器对 teleport 内容不可靠，必须用非 scoped 规则 */
.monster-codex-hide-header .el-dialog__header { display: none; }
</style>
