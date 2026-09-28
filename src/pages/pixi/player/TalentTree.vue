<template>
    <div class="flex flex-col h-full w-full select-none!">
        <!-- 顶部：天赋点显示 + 操作按钮 -->
        <div
            class="flex items-center justify-between px-4vh py-1.5vh border-b border-#E4E7ED flex-shrink-0 bg-white z-10">
            <div class="flex items-center gap-3vh">
                <div class="flex items-center gap-2vh">
                    <span class="text-3vh">🌟</span>
                    <span class="text-2.5vh font-bold text-#303133">{{ L('talentPoints') }}</span>
                </div>
                <div class="flex items-center gap-1.5vh">
                    <span class="text-4vh font-bold text-#E6A23C">{{ user.pixi.player.talentPoints }}</span>
                    <span class="text-2vh text-#909399">{{ L('pointsAvailable') }}</span>
                </div>
            </div>
            <div class="flex items-center gap-2vh">
                <span class="text-2.5vh text-#909399">
                    {{ L('activatedCountLabel') }} {{ activatedCount }} / {{ allCount }}
                </span>
            </div>
        </div>

        <!-- 画布区域 -->
        <div class="flex-1 relative overflow-hidden bg-#F9FAFB">
            <!-- 缩放控制按钮（右上角） -->
            <div class="absolute top-2vh right-2vh z-30 flex flex-col gap-y-1vh">
                <button
                    class="w-5vh h-5vh rounded-lg bg-white shadow-md flex items-center justify-center text-#606266 hover:text-#409EFF hover:shadow-lg transition-all border border-#DCDFE6"
                    :title="L('zoomIn')" @click="zoomIn">
                    <el-icon :size="20">
                        <ZoomIn />
                    </el-icon>
                </button>
                <button
                    class="w-5vh h-5vh rounded-lg bg-white shadow-md flex items-center justify-center text-#606266 hover:text-#409EFF hover:shadow-lg transition-all border border-#DCDFE6"
                    :title="L('zoomOut')" @click="zoomOut">
                    <el-icon :size="20">
                        <ZoomOut />
                    </el-icon>
                </button>
                <button
                    class="w-5vh h-5vh rounded-lg bg-white shadow-md flex items-center justify-center text-#606266 hover:text-#409EFF hover:shadow-lg transition-all border border-#DCDFE6"
                    :title="L('resetView')" @click="resetView">
                    <el-icon :size="18">
                        <FullScreen />
                    </el-icon>
                </button>
                <div class="text-center text-1.5vh text-#909399 mt-0.5vh font-medium">
                    {{ Math.round(scale * 100) }}%
                </div>
            </div>

            <!-- 画布 -->
            <canvas ref="canvasRef" class="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
                @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
                @wheel.prevent="onWheel" @touchstart="onTouchStart" @touchmove="onTouchMove"
                @touchend="onTouchEnd"></canvas>

            <!-- 悬浮激活确认面板（跟随画布缩放） -->
            <div v-if="hoveredTalent" class="absolute z-20" style="pointer-events:none"
                :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }">
                <div class="px-2vh py-1.5vh bg-#303133 text-white rounded-xl shadow-xl leading-relaxed"
                    style="pointer-events:auto" :style="{
                        transform: `translateX(-50%) translateY(-100%) scale(${scale})`,
                        transformOrigin: '50% 100%',
                        minWidth: '45vh',
                    }" @click.stop>
                    <!-- 天赋信息 -->
                    <div class="flex items-center gap-x-1.5vh mb-1vh">
                        <div class="font-bold text-4vh " :style="{ color: hoveredTalent.color }">
                            {{ tr(hoveredTalent.name) }}
                        </div>
                    </div>
                    <!-- 任务获取型天赋（autoGranted）在解锁前不显示描述 -->
                    <div v-if="!hoveredTalent.autoGranted || user.hasTalent(hoveredTalent.id)"
                        class="text-white text-3vh mb-0.5vh iconfont2">{{ talentCurrentDesc }}</div>

                    <!-- 可升级天赋：等级 + 下一级预览（仅未锁定且未满级时显示） -->
                    <template v-if="isUpgradeableTalent && canActivate(hoveredTalent)">
                        <!-- 等级 -->
                        <div v-if="talentCurrentLevel < hoveredTalent.maxLevel"
                            class="flex items-center gap-x-1.5vh text-2.5vh justify-center text-#E6A23C font-bold mb-1vh">
                            {{ L('talentLevelLabel') }} {{ talentCurrentLevel }} / {{ hoveredTalent.maxLevel }}
                        </div>

                        <!-- 已激活未满级：当前 + 下一级效果 -->
                        <div v-if="talentCurrentLevel > 0 && talentCurrentLevel < hoveredTalent.maxLevel"
                            class="flex flex-col items-center mb-1vh">

                            <div class="text-#67C23A text-2.5vh font-bold my-0.5vh">
                                {{ L('nextLevelLabel') }} {{ nextLevelDesc }}
                            </div>
                            <div
                                class="flex items-center w-full text-2.5vh justify-end text-#E6A23C font-bold mb-0.5vh">
                                {{ L('costLabel') }} {{ hoveredTalent.cost }} {{ L('talentPointUnit') }}
                            </div>
                        </div>
                    </template>

                    <!-- 不可升级的天赋：消耗 -->
                    <template
                        v-if="!isUpgradeableTalent && !user.hasTalent(hoveredTalent.id) && canActivate(hoveredTalent)">
                        <div class="flex items-center gap-x-1.5vh text-2.5vh justify-end text-#E6A23C font-bold mb-1vh">
                            {{ L('costLabel') }} {{ hoveredTalent.cost }} {{ L('talentPointUnit') }}
                        </div>
                    </template>

                    <!-- 已满级 -->
                    <div v-if="isUpgradeableTalent && talentCurrentLevel >= hoveredTalent.maxLevel"
                        class="text-3vh font-bold text-#67C23A text-center py-0.8vh">
                        ✓ {{ L('maxedOut') }}
                    </div>

                    <!-- 可升级·未满级·可升级按钮 -->
                    <div v-else-if="isUpgradeableTalent && canActivate(hoveredTalent)" class="flex gap-x-1.5vh">
                        <div class="flex-1 px-2vh py-1vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all
                bg-#F5F7FA/20 text-#C0C4CC" @click.stop="cancelText(1)">{{ L('cancel') }}</div>
                        <div v-if="(hoveredTalent.levelCost || hoveredTalent.cost) > user.pixi.player.talentPoints"
                            class="flex-1 px-2vh py-1vh rounded-lg text-2.5vh font-medium text-center
                bg-#909399/30 text-#909399 cursor-not-allowed">{{ L('notEnoughPoints') }}</div>
                        <div v-else class="flex-1 px-2vh py-1vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all
                bg-#E6A23C text-white" @click="confirmFromTooltip">{{ talentCurrentLevel === 0 ? L('activateBtn') : L('upgradeBtn') }} </div>
                    </div>

                    <!-- 普通天赋·已激活 -->
                    <div v-if="!isUpgradeableTalent && user.hasTalent(hoveredTalent.id)"
                        class="text-3vh font-bold text-#67C23A text-center py-0.8vh">
                        ✓ {{ L('activated') }}
                    </div>

                    <!-- 任务获取型天赋（未激活） -->
                    <div v-else-if="!isUpgradeableTalent && hoveredTalent.autoGranted"
                        class="text-3vh text-#909399 text-center py-0.8vh">
                        🔒 {{ L('taskObtained') }}
                    </div>

                    <!-- 未解锁前置 / 属性需求 -->
                    <div v-else-if="!canActivate(hoveredTalent) && !(talentCurrentLevel >= hoveredTalent.maxLevel)"
                        class="text-3vh text-#909399 text-center py-0.8vh">
                        🔒 {{ attrReqBlocked ? attrReqLabel : fmt('prereqBlocked', { n: firstMissingPrereqLabel }) }}
                    </div>

                    <!-- 普通天赋·可激活按钮 -->
                    <div v-else-if="!isUpgradeableTalent" class="flex gap-x-1.5vh">
                        <div class="flex-1 px-2vh py-1vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all
                bg-#F5F7FA/20 text-#C0C4CC" @click.stop="cancelText(0)">{{ L('cancel') }}</div>
                        <div v-if="hoveredTalent.cost > user.pixi.player.talentPoints" class="flex-1 px-2vh py-1vh rounded-lg text-2.5vh font-medium text-center
                bg-#909399/30 text-#909399 cursor-not-allowed">{{ L('notEnoughPoints') }}</div>
                        <div v-else class="flex-1 px-2vh py-1vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all
                bg-#409EFF text-white" @click="confirmFromTooltip">{{ L('confirmActivate') }}</div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useCounterStore } from '@/store/counter'
import { t, tr } from '@/i18n'
import { ZoomIn, ZoomOut, FullScreen, WarningFilled } from '@element-plus/icons-vue'
import { Application, Container, RenderTexture } from 'pixi.js'
import { Spine } from '@esotericsoftware/spine-pixi-v8'

const user = useCounterStore()
const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// ==================== 全局缓存（在 <script setup> 外面，跨组件实例共享） ====================
// 这些变量放在模块作用域，而不是组件内部，这样组件销毁重建后仍然存在
let _gSpineRenderApp = null
let _gSpineRenderAppInit = null
const _gIconCache = {}
let _gIconCacheInit = false

/** 尝试从 sessionStorage 恢复图标缓存 */
function _loadIconCacheFromStorage() {
    if (_gIconCacheInit) return
    _gIconCacheInit = true
    try {
        const raw = sessionStorage.getItem('talent_icon_cache_v2') // v2：升级 key 作废旧空白缓存
        if (!raw) return
        const data = JSON.parse(raw)
        let loaded = 0
        Object.entries(data).forEach(([id, base64]) => {
            if (_gIconCache[id]) return // 已有，跳过
            const img = new Image()
            img.src = base64
            const canvas = document.createElement('canvas')
            canvas.width = img.width || 80
            canvas.height = img.height || 80
            img.onload = () => {
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                _gIconCache[id] = canvas
            }
            // 同步加载 canvas
            const c2 = document.createElement('canvas')
            c2.width = 80 * (window.devicePixelRatio || 1)
            c2.height = 80 * (window.devicePixelRatio || 1)
            const ctx2 = c2.getContext('2d')
            const img2 = new Image()
            img2.src = base64
            img2.onload = () => {
                ctx2.drawImage(img2, 0, 0)
                const dpr = window.devicePixelRatio || 1
                c2.width = 80 * dpr
                c2.height = 80 * dpr
                ctx2.drawImage(img2, 0, 0, c2.width, c2.height)
                _gIconCache[id] = c2
            }
            // 尝试同步（base64 图片可能已缓存）
            try {
                document.createElement('canvas').getContext('2d')
            } catch (e) { }
        })
    } catch (e) {
        console.warn('[天赋] sessionStorage 缓存读取失败:', e)
    }
}

const canvasRef = ref(null)

// ==================== 可升级天赋相关 ====================
/** 当前悬停的天赋是否为可升级类型 */
const isUpgradeableTalent = computed(() => {
    return hoveredTalent.value && hoveredTalent.value.maxLevel && hoveredTalent.value.maxLevel > 1
})
/** 当前悬停天赋的当前等级 */
const talentCurrentLevel = computed(() => {
    if (!hoveredTalent.value) return 0
    return user.getTalentLevel(hoveredTalent.value.id)
})
// ==================== {key} 占位符渲染（description/levelDescriptions 由效果变量决定） ====================
// 组合 key：base 值 + 每级追加值（perLv 类）
const EFF_LV_PAIR = { basePct: 'perLvPct', baseProb: 'probPerLv', baseRate: 'perLvRate', baseProgress: 'perLvProgress', thresholdBase: 'thresholdPerLv', dmgBase: 'dmgPerLv', baseLuck: 'perLvLuck', baseMp: 'mpPerLv', needCards: 'perLvCards' , atkPerMana: 'atkPerManaPerLv', extraCards: 'extraCardsPerLv', dmgBonus: 'dmgBonusPerLv', expMult: 'expMultPerLv', reactBonus: 'reactBonusPerLv', eleBonus: 'eleBonusPerLv' }
// 小数比例 key（值 <1 视为小数，显示时 ×100 转 %）
const EFF_PCT100 = new Set(['atkPct', 'atkBuffPct', 'dmgBonus', 'takenReduce', 'dropMult', 'vulnPct', 'healPct', 'shieldPct', 'hpRate', 'selfHurtPct', 'transferPct', 'perLv', 'perLvPct', 'baseProb', 'probPerLv', 'perStackRate', 'incProb', 'maxRate', 'thresholdBase', 'thresholdPerLv', 'dmgBase', 'dmgPerLv', 'baseRate', 'perLvRate', 'atkPerMana', 'atkPerManaPerLv', 'dmgBonusPerLv', 'expMult', 'expMultPerLv', 'reactBonus', 'reactBonusPerLv', 'prob', 'mult', 'dmgProb', 'dmgReduce', 'eleBonus', 'eleBonusPerLv', 'rate'])
// 行动条类 key：值 ÷N 转 %
const EFF_DIV10 = new Set(['baseProgress', 'perLvProgress'])
const EFF_DIV100 = new Set(['actionPerLv'])
/** 取效果 key 在指定等级的值（支持 base+perLv 组合） */
function effValAt(t, key, lv) {
  if (!t || !t.effect) return ''
  const eff = t.effect
  if (eff[key] === undefined || eff[key] === null) return ''
  const pair = EFF_LV_PAIR[key]
  if (pair && eff[pair] !== undefined) {
    return Number(eff[key]) + Number(eff[pair]) * Math.max(0, (lv || 1) - 1)
  }
  return eff[key]
}
/** 格式化效果值（按 key 语义转 % 或原样） */
function fmtEffVal(key, v) {
  const n = Number(v)
  if (isNaN(n)) return String(v)
  // basePct 混合格式：≤1 为小数（0.02→2%），>1 为整数百分数（6→6%）
  if (key === 'basePct') return String(n <= 1 ? Math.round(n * 10000) / 100 : n)
  if (EFF_PCT100.has(key)) return String(Math.round(n * 10000) / 100)
  if (EFF_DIV10.has(key)) return String(Math.round(n * 1000) / 1000 / 10)
  if (EFF_DIV100.has(key)) return String(Math.round(n * 10000) / 10000 / 100)
  return String(Math.round(n * 100) / 100)
}
/** 替换文本中的占位符（${eff.key} 与 {key} 两种写法，值随等级 lv 变化） */
function fmtTalentText(text, t, lv) {
  if (!text || !t || !t.effect) return text || ''
  const fill = (m, k) => {
    // 模式1c：${eff.base + eff.perLv * level}（基础值 + 每级值×等级，原始值直显——模板自带单位，如行动条%）
    const mulLevelM = k.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\+\s*(?:eff\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\*\s*level$/)
    if (mulLevelM) {
      // 模板已显式表达公式，取原始 effect 值（不经过 effValAt，避免 pair 双叠加）
      const v1 = t.effect?.[mulLevelM[1]]
      const v2 = t.effect?.[mulLevelM[2]]
      if (v1 === '' || v1 === null || v1 === undefined || v2 === '' || v2 === null || v2 === undefined) return m
      return String(Math.round((Number(v1) + Number(v2) * (lv || 1)) * 100) / 100)
    }
    // 模式1：${eff.base + eff.perLv * (level - 1)}（基础值 + 每级值×（等级-1），显示该级实际值）
    const addM = k.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\+\s*(?:eff\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\*\s*\(\s*level\s*-\s*1\s*\)$/)
    if (addM) {
      // 模板已显式表达公式，取原始 effect 值（不经过 effValAt，避免 pair 双叠加）
      const v1 = t.effect?.[addM[1]]
      const v2 = t.effect?.[addM[2]]
      if (v1 === '' || v1 === null || v1 === undefined || v2 === '' || v2 === null || v2 === undefined) return m
      const raw1 = Number(v1)
      const f1 = Number(fmtEffVal(addM[1], v1))
      // 同格式缩放：base 被 ×100（小数），perLv 同步 ×100；base 原样（整数），perLv 原样
      const scale = (raw1 !== 0 && f1 !== raw1) ? (f1 / raw1) : 1
      return String(Math.round((f1 + Number(v2) * scale * ((lv || 1) - 1)) * 100) / 100)
    }
    // 模式2：${eff.key * level}：key 值 × 当前等级（显示该级累计值）
    const mulLv = /\*\s*level$/.test(k)
    const key = k.replace(/\s*\*\s*level$/, '')
    const v = effValAt(t, key, lv)
    if (v === '' || v === null || v === undefined) return m
    let out
    if (Array.isArray(v)) {
      const idx = Math.min(Math.max(0, (lv || 1) - 1), v.length - 1)
      out = String(Math.round(Number(v[idx]) * 10000) / 100)
    } else if (v && typeof v === 'object') {
      // 对象分级值（如 rates: {1:0.4, 2:0.5}）：取当前等级，×100 显示 %
      const lvKey = String(lv || 1)
      const val = v[lvKey] !== undefined ? v[lvKey] : v[lv]
      out = val === undefined ? m : String(Math.round(Number(val) * 10000) / 100)
    } else if (typeof v === 'string' && v.includes(',')) {
      // 逗号分隔的逐级百分比（如 rates/dmgRatios '0.05,0.06,0.07'）：取当前等级并 ×100 显示
      const arr = v.split(',').map(Number)
      const idx = Math.min(Math.max(0, (lv || 1) - 1), arr.length - 1)
      out = String(Math.round((arr[idx] ?? 0) * 10000) / 100)
    } else {
      out = fmtEffVal(key, v)
    }
    if (mulLv) out = String(Math.round(Number(out) * (lv || 1) * 100) / 100)
    return out
  }
  return String(text)
    .replace(/\$\{eff\.([a-zA-Z_][a-zA-Z0-9_]*\s*\+\s*(?:eff\.)?[a-zA-Z_][a-zA-Z0-9_]*\s*\*\s*level|[a-zA-Z_][a-zA-Z0-9_]*\s*\+\s*(?:eff\.)?[a-zA-Z_][a-zA-Z0-9_]*\s*\*\s*\(\s*level\s*-\s*1\s*\)|[a-zA-Z_][a-zA-Z0-9_]*\s*\*\s*level|[a-zA-Z_][a-zA-Z0-9_]*)\}/g, fill)
    .replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, fill)
}
/** 当前悬停天赋的描述（按等级显示） */
const talentCurrentDesc = computed(() => {
    if (!hoveredTalent.value) return ''
    const t = hoveredTalent.value
    if (t.maxLevel && t.maxLevel > 1) {
        const level = user.getTalentLevel(t.id) || 0
        if (level === 0) return fmtTalentText(t.description, t, 1)
        return fmtTalentText(t.levelDescriptions?.[level - 1] || t.description, t, level)
    }
    return fmtTalentText(t.description, t, 1)
})
/** 下一级描述（可升级且未满级时显示） */
const nextLevelDesc = computed(() => {
    if (!hoveredTalent.value) return null
    const t = hoveredTalent.value
    if (!t.maxLevel || t.maxLevel <= 1) return null
    const level = user.getTalentLevel(t.id) || 0
    if (level >= t.maxLevel) return null // 已满级
    const text = t.levelDescriptions?.[level] || null
    return text ? fmtTalentText(text, t, level + 1) : null
})

// ==================== 布局常量 ====================
const NODE_RADIUS = 38
const TIER_GAP_Y = 180   // 层与层之间的垂直间距
const NODE_GAP_X = 160   // 同层节点之间的水平间距

// ==================== 缩放 ====================
const MIN_SCALE = 0.35
const MAX_SCALE = 2.0
const DEFAULT_SCALE = 0.65
const scale = ref(DEFAULT_SCALE)

function zoomIn() {
    scale.value = Math.min(MAX_SCALE, +(scale.value + 0.05).toFixed(2))
    draw()
}
function zoomOut() {
    scale.value = Math.max(MIN_SCALE, +(scale.value - 0.05).toFixed(2))
    draw()
}
function resetView() {
    scale.value = DEFAULT_SCALE
    viewOffset.value = { x: 0, y: 0 }
    saveViewState()
    draw()
}

// ==================== 计算天赋树数据 ====================
const talents = computed(() => user.talentConfig || [])
const allCount = computed(() => talents.value.length)
const activatedCount = computed(() => {
    return (user.pixi.player.activatedTalents || []).length
})

// 按 tier 分组
const tierGroups = computed(() => {
    const groups = {}
    talents.value.forEach(t => {
        if (!groups[t.tier]) groups[t.tier] = []
        groups[t.tier].push(t)
    })
    return groups
})

const maxTier = computed(() => {
    return Math.max(1, ...talents.value.map(t => t.tier || 1))
})

// ==================== Spine 渲染（离屏）—— 使用全局缓存 ====================

/** 获取或创建全局离屏渲染器（模块级单例） */
async function _getSpineRenderApp() {
    if (_gSpineRenderAppInit) return _gSpineRenderAppInit
    if (_gSpineRenderApp) return _gSpineRenderApp
    _gSpineRenderAppInit = (async () => {
        const app = new Application()
        await app.init({
            width: 1,
            height: 1,
            backgroundAlpha: 0,
            antialias: false,
            autoStart: false,
            preference: 'webgl2',
            preserveDrawingBuffer: true,
        })
        _gSpineRenderApp = app
        return app
    })()
    return _gSpineRenderAppInit
}

/** 将单个天赋Spine渲染到离屏Canvas并缓存（优先走 _gIconCache） */
async function renderTalentIcon(talentId, skinName) {
    const skin = (skinName && String(skinName).trim()) || talentId
    if (_gIconCache[skin]) return _gIconCache[skin]

    const app = await _getSpineRenderApp()
    const iconSize = 80
    const dpr = window.devicePixelRatio || 1
    const canvas = document.createElement('canvas')
    canvas.width = iconSize * dpr
    canvas.height = iconSize * dpr
    canvas.style.width = iconSize + 'px'
    canvas.style.height = iconSize + 'px'

    const container = new Container()
    const spine = new Spine({
        skeleton: 'tianfu_skel',
        atlas: 'tianfu_atlas',
        allowMissingRegions: true,
        autoUpdate: false, // 离屏渲染：关闭自动更新，渲染前手动 update(0)
    })

    const skins = spine.skeleton.data?.skins?.map(s => s.name) || []
    if (skins.includes(skin)) {
        spine.skeleton.setSkinByName(skin)
    } else {
        // ❌ 皮肤名不存在（新增皮肤未生效/皮肤名写错）：不渲染空白占位，避免空白图被缓存固化
        console.warn('[天赋] tianfu 皮肤不存在，跳过渲染:', skin)
        try { spine.destroy?.() } catch (e) { }
        return null
    }
    if (spine.state) spine.state.clearTracks()

    container.addChild(spine)

    const renderTexture = RenderTexture.create({
        width: Math.max(1, iconSize * dpr),
        height: Math.max(1, iconSize * dpr),
        resolution: 1,
    })

    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)

    const bounds = spine.getBounds()
    const spineW = Math.max(bounds.width, 1)
    const spineH = Math.max(bounds.height, 1)
    const s = Math.min((iconSize * 1.2) / spineW, (iconSize * 1.2) / spineH) * dpr
    spine.scale.set(s)
    spine.x = (iconSize * dpr) / 2
    spine.y = (iconSize * dpr) / 2

    spine.update(0)
    app.renderer.render({ container, target: renderTexture, clear: true })
    const sourceCanvas = app.renderer.extract.canvas(renderTexture)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)

    container.destroy({ children: true })
    renderTexture.destroy()

    _gIconCache[skin] = canvas

    // 同步保存到 sessionStorage（base64 格式，刷新也保留）
    try {
        const raw = sessionStorage.getItem('talent_icon_cache_v2') // v2：升级 key 作废旧空白缓存 || '{}'
        const data = JSON.parse(raw)
        data[skin] = canvas.toDataURL()
        sessionStorage.setItem('talent_icon_cache_v2', JSON.stringify(data))
    } catch (e) {
        // 忽略尺寸过大等写入错误
    }

    return canvas
}

/** 批量渲染所有天赋图标（分批并行，仅渲染未缓存的） */
async function preloadAllTalentIcons() {
    const skinOf = t => (t.icon && String(t.icon).trim()) || t.id
    const uncached = talents.value.filter(t => !_gIconCache[skinOf(t)])
    if (uncached.length === 0) return // 全部已缓存，直接跳过
    const batchSize = 4
    for (let i = 0; i < uncached.length; i += batchSize) {
        const batch = uncached.slice(i, i + batchSize)
        await Promise.all(batch.map(t => renderTalentIcon(t.id, skinOf(t))))
    }
}

// ==================== 画布状态 ====================
let canvasCtx = null
let animationId = null

const viewOffset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

const hoveredTalent = ref(null)
const tooltipX = ref(0)
const tooltipY = ref(0)
/** 面板出现的时间戳（防误触：0.5s内确认无效） */
let panelAppearTime = 0

// 节点位置缓存（未应用缩放/偏移的原始坐标）
const nodePositions = ref({})


function canActivate(talent) {
    return user.canActivateTalent(talent.id)
}

/** 获取前置天赋的显示文本 */
function getPrereqLabel(preReq) {
    if (typeof preReq === 'string') {
        const t = user.talentConfig.find(t => t.id === preReq)
        return t ? tr(t.name) : preReq
    } else if (preReq && preReq.id) {
        const t = user.talentConfig.find(t => t.id === preReq.id)
        const name = t ? tr(t.name) : preReq.id
        const minLv = preReq.minLevel || 1
        return minLv > 1 ? `${name} Lv.${minLv}` : name
    }
    return ''
}
/** 获取当前等级对应使用的前置条件 */
function getEffectivePrereqs(talent) {
    if (!talent) return []
    const curLevel = user.getTalentLevel(talent.id)
    const nextLevel = talent.maxLevel > 1 ? curLevel + 1 : 1
    // 如果有等级专属前置，使用对应等级的前置
    if (talent.levelPrerequisites?.[nextLevel]) {
        return talent.levelPrerequisites[nextLevel]
    }
    return talent.prerequisites || []
}

/** 第一个未满足的前置条件描述 */
const firstMissingPrereqLabel = computed(() => {
    const prereqs = getEffectivePrereqs(hoveredTalent.value)
    if (!prereqs.length) return ''
    for (const pre of prereqs) {
        const id = typeof pre === 'string' ? pre : pre.id
        const minLv = (typeof pre === 'object' && pre.minLevel) || 1
        const has = minLv > 1
            ? user.getTalentLevel(id) >= minLv
            : user.hasTalent(id)
        if (!has) return getPrereqLabel(pre)
    }
    return ''
})

/** 属性需求：指定属性达标才可解锁 */
const ATTR_CN = { strength: 'attrStrength', intelligence: 'attrIntelligence', elementMastery: 'attrMastery', attack: 'attrAtk', armor: 'attrArmor', magicResist: 'attrMagicResist', speed: 'attrSpeed', luck: 'attrLuck', charm: 'attrCharm' }
const attrReqBlocked = computed(() => {
    const t = hoveredTalent.value
    if (!t || !t.attrReq) return false
    const list = Array.isArray(t.attrReq) ? t.attrReq : (t.attrReq.key ? [t.attrReq] : [])
    return list.some(r => r && r.key && user.getAttrValue(r.key) < (Number(r.value) || 0))
})
const attrReqLabel = computed(() => {
    const t = hoveredTalent.value
    if (!t || !t.attrReq) return ''
    const list = Array.isArray(t.attrReq) ? t.attrReq : (t.attrReq.key ? [t.attrReq] : [])
    if (!list.length) return ''
    return L('attrReqPrefix') + list.map(r => fmt('attrReqFormat', { attr: L(ATTR_CN[r.key] || r.key), v: Number(r.value) || 0, cur: user.getAttrValue(r.key) })).join(L('attrReqSep'))
})

// ==================== 确认激活天赋 ====================
function confirmFromTooltip() {
    if (!hoveredTalent.value) return
    // 防误触：面板出现后 0.3s 内不可确认
    if (Date.now() - panelAppearTime < 400)
        return
    const talent = hoveredTalent.value
    const success = user.activateTalent(talent.id)
    if (success) {
        hoveredTalent.value = null
        draw()
    }
}
function cancelText(i) {
    // 防误触：面板出现后 0.3s 内不可确认
    if (Date.now() - panelAppearTime < 400) return
    hoveredTalent.value = null

}
// ==================== 计算节点布局（从上到下） ====================
function computeLayout(canvasWidth, canvasHeight) {
    const positions = {}
    const cx = canvasWidth / 2
    const cy = canvasHeight / 2

    // 总树高度 = 层数 * 层间距
    const treeHeight = maxTier.value * TIER_GAP_Y
    const startY = cy - treeHeight / 2 + TIER_GAP_Y / 2

    // 整棵天赋树全局统一中心列，所有层级共用同一个中点，上下永久对齐竖线
    const globalCenterCol = 4

    talents.value.forEach(t => {
        const tier = t.tier || 1
        // Y轴分层
        const y = startY + (tier - 1) * TIER_GAP_Y
        // X全局统一居中，不受同层其他天赋影响
        const x = cx + (t.col - globalCenterCol) * NODE_GAP_X

        positions[t.id] = { x, y }
    })

    return positions
}
// ==================== 绘制 ====================
function draw() {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    canvasCtx = ctx

    const W = rect.width
    const H = rect.height

    ctx.clearRect(0, 0, W, H)

    // 计算布局（原始坐标，不包含缩放偏移）
    const positions = computeLayout(W, H)
    nodePositions.value = positions

    const s = scale.value
    const ox = viewOffset.value.x
    const oy = viewOffset.value.y

    // 应用缩放
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(s, s)

    // ----- 绘制连线（含流动动画）-----
    talents.value.forEach(t => {
        if (!t.prerequisites?.length) return
        const from = positions[t.id]
        if (!from) return
        t.prerequisites.forEach(preReq => {
            // 解析前置天赋（支持字符串和 { id, minLevel } 对象格式）
            const preId = typeof preReq === 'string' ? preReq : preReq.id
            const minLevel = (typeof preReq === 'object' && preReq.minLevel) ? preReq.minLevel : 1

            const to = positions[preId]
            if (!to) return
            const preActivated = user.hasTalent(preId)
            const curActivated = user.hasTalent(t.id)
            const canActive = canActivate(t)
            const allActivated = preActivated && curActivated

            // 颜色
            let color = '#DCDFE6'
            let lw = allActivated ? 3 : 2
            if (allActivated) { color = '#409EFF' }
            else if (preActivated && !curActivated && canActive) { color = '#E6A23C'; lw = 2.5 }
            else if (preActivated) { color = '#A0CFFF' }

            const dx = from.x - to.x
            const dy = from.y - to.y
            const len = Math.sqrt(dx * dx + dy * dy)

            if (allActivated) {
                // 已激活 纯蓝色静态实线 无流动动画
                ctx.save()
                ctx.beginPath()
                ctx.moveTo(to.x, to.y)
                ctx.lineTo(from.x, from.y)
                // 底层蓝光发光
                ctx.strokeStyle = '#409EFF'
                ctx.lineWidth = 5
                ctx.globalAlpha = 0.25
                ctx.stroke()
                // 主蓝色实线
                ctx.beginPath()
                ctx.moveTo(to.x, to.y)
                ctx.lineTo(from.x, from.y)
                ctx.strokeStyle = '#409EFF'
                ctx.lineWidth = 3
                ctx.globalAlpha = 1
                ctx.stroke()
                ctx.restore()
            } else {
                // 未激活：普通实线
                ctx.beginPath()
                ctx.moveTo(to.x, to.y)
                ctx.lineTo(from.x, from.y)
                ctx.strokeStyle = color
                ctx.lineWidth = lw
                ctx.stroke()
            }

            // 箭头
            if (len > 10) {
                const midX = (to.x + from.x) / 2
                const midY = (to.y + from.y) / 2
                const angle = Math.atan2(dy, dx)
                const arrowSize = allActivated ? 10 : 8
                ctx.fillStyle = color
                ctx.beginPath()
                ctx.moveTo(midX, midY)
                ctx.lineTo(midX - arrowSize * Math.cos(angle - 0.4), midY - arrowSize * Math.sin(angle - 0.4))
                ctx.lineTo(midX - arrowSize * Math.cos(angle + 0.4), midY - arrowSize * Math.sin(angle + 0.4))
                ctx.closePath()
                ctx.fill()

                // 前置天赋所需等级（仅 minLevel > 1 时显示数字）
                if (minLevel > 1) {
                    ctx.save()
                    const lvColor = allActivated ? '#409EFF' : preActivated ? '#E6A23C' : '#C0C4CC'
                    ctx.fillStyle = lvColor
                    ctx.font = 'bold 12px sans-serif'
                    ctx.textAlign = 'left'
                    ctx.textBaseline = 'top'
                    // 在箭头中点下方显示 Lv.2 等
                    ctx.fillText(`Lv.${minLevel}`, midX, midY + arrowSize + 4)
                    ctx.restore()
                }
            }
        })
    })

    // ----- 绘制节点 -----
    talents.value.forEach(t => {
        const pos = positions[t.id]
        if (!pos) return

        const x = pos.x
        const y = pos.y
        const isActivated = user.hasTalent(t.id)
        const canActive = canActivate(t)
        const isLocked = !isActivated && !canActive
        const r = NODE_RADIUS

        // 外发光（已激活）
        if (isActivated) {
            ctx.beginPath()
            ctx.arc(x, y, r + 6, 0, Math.PI * 2)
            ctx.fillStyle = t.color + '44'
            ctx.fill()
        }

        // 外圈填充
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        if (isActivated) {
            const grad = ctx.createRadialGradient(x - 10, y - 10, 0, x, y, r)
            grad.addColorStop(0, t.color + 'dd')
            grad.addColorStop(1, t.color + '99')
            ctx.fillStyle = grad
        } else if (canActive) {
            ctx.setLineDash([4, 4])
            ctx.fillStyle = t.color + '22'
        } else {
            ctx.fillStyle = '#F5F7FA'
        }
        ctx.fill()
        ctx.setLineDash([])

        // 边框
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.strokeStyle = isActivated ? t.color : isLocked ? '#DCDFE6' : t.color + '88'
        ctx.lineWidth = isActivated ? 3 : 2
        ctx.stroke()

        // ----- 天赋图片（Spine离屏渲染，以圆型裁剪）-----
        const iconCanvas = _gIconCache[(t.icon && String(t.icon).trim()) || t.id]
        if (iconCanvas) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(x, y, r - 3, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(iconCanvas, x - r + 3, y - r + 3, (r - 3) * 2, (r - 3) * 2)
            ctx.restore()
        }

        // 锁定遮罩（覆盖在图片上）
        if (isLocked) {
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(0,0,0,0.4)'
            ctx.fill()
        }

        // 名称
        ctx.font = 'bold 12px sans-serif'
        ctx.fillStyle = isActivated ? '#303133' : isLocked ? '#C0C4CC' : '#303133'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(tr(t.name), x, y + r + 6)

        // 状态文字（消耗 / 等级 / 已激活）
        ctx.font = '12px sans-serif'
        ctx.textBaseline = 'top'
        const canUpgrade = t.maxLevel && t.maxLevel > 1
        if (canUpgrade) {
            const level = user.getTalentLevel(t.id)
            if (level >= t.maxLevel) {
                ctx.fillStyle = '#67C23A'
                ctx.fillText(`Lv.${level}/${t.maxLevel}`, x, y + r + 24)
            } else if (level > 0) {
                ctx.fillStyle = '#E6A23C'
                ctx.fillText(`Lv.${level}/${t.maxLevel}`, x, y + r + 24)
            } else {
                ctx.fillStyle = '#E6A23C'
                ctx.fillText(` ${t.levelCost || t.cost} ${L('talentPointUnit')}`, x, y + r + 24)
            }
        } else {
            // autoGranted 天赋显示"任务获取"，不可手动激活
            if (t.autoGranted && !isActivated) {
                ctx.fillStyle = '#909399'
                ctx.fillText(L('taskObtained'), x, y + r + 24)
            } else {
                ctx.fillStyle = isActivated ? '#67C23A' : '#E6A23C'
                ctx.fillText(isActivated ? '✓ ' + L('activated') : `${t.cost} ${L('talentPointUnit')}`, x, y + r + 24)
            }
        }

        // 已激活额外光晕
        if (isActivated) {
            ctx.beginPath()
            ctx.arc(x, y, r + 2, 0, Math.PI * 2)
            ctx.strokeStyle = t.color + '88'
            ctx.lineWidth = 1.5
            ctx.setLineDash([3, 3])
            ctx.stroke()
            ctx.setLineDash([])
        }
    })

    ctx.restore() // 恢复缩放

    // 流动动画持续更新
    if (hoveredTalent.value) {
        // 有面板显示时保持重绘
    }
}

// ==================== 工具：将屏幕坐标转为画布缩放后的坐标 ====================
function screenToCanvas(sx, sy) {
    const s = scale.value
    const ox = viewOffset.value.x
    const oy = viewOffset.value.y
    return {
        x: (sx - ox) / s,
        y: (sy - oy) / s,
    }
}

// ==================== 鼠标/触摸事件 ====================
function onMouseDown(e) {
    isDragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    dragOffset.value = { x: viewOffset.value.x, y: viewOffset.value.y }
}

function onMouseMove(e) {
    const rect = canvasRef.value.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (isDragging.value) {
        const dx = e.clientX - dragStart.value.x
        const dy = e.clientY - dragStart.value.y
        viewOffset.value.x = dragOffset.value.x + dx
        viewOffset.value.y = dragOffset.value.y + dy
        draw()
        return
    }

    checkHover(mx, my)
}

function onMouseUp() {
    if (isDragging.value) {
        const dx = Math.abs(viewOffset.value.x - dragOffset.value.x)
        const dy = Math.abs(viewOffset.value.y - dragOffset.value.y)
        isDragging.value = false
        if (dx < 5 && dy < 5) {
            handleClick()
        }
    }
}

function onWheel(e) {
    const rect = canvasRef.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // 鼠标位置处的画布坐标（缩放/偏移前）
    const canvasX = (mouseX - viewOffset.value.x) / scale.value
    const canvasY = (mouseY - viewOffset.value.y) / scale.value

    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(scale.value + delta).toFixed(2)))

    // 保持鼠标位置固定不变
    viewOffset.value.x = mouseX - canvasX * newScale
    viewOffset.value.y = mouseY - canvasY * newScale
    scale.value = newScale

    draw()
}

// 触摸
let touchStartPos = null
let touchPinchDist = 0       // 双指初始距离
let touchPinchScale = 1      // 双指缩放时的基准 scale
function onTouchStart(e) {
    if (e.touches.length === 1) {
        const t = e.touches[0]
        touchStartPos = { x: t.clientX, y: t.clientY }
        isDragging.value = true
        dragStart.value = { x: t.clientX, y: t.clientY }
        dragOffset.value = { x: viewOffset.value.x, y: viewOffset.value.y }
    } else if (e.touches.length === 2) {
        // 双指缩放：记录初始间距
        const t0 = e.touches[0], t1 = e.touches[1]
        touchPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        touchPinchScale = scale.value
        isDragging.value = false  // 停止拖动
    }
}

function onTouchMove(e) {
    if (e.cancelable) e.preventDefault()
    if (e.touches.length === 1 && isDragging.value) {
        const t = e.touches[0]
        const dx = t.clientX - dragStart.value.x
        const dy = t.clientY - dragStart.value.y
        viewOffset.value.x = dragOffset.value.x + dx
        viewOffset.value.y = dragOffset.value.y + dy
        draw()
    } else if (e.touches.length === 2) {
        // 双指缩放：根据手指间距变化计算缩放倍数
        const t0 = e.touches[0], t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        if (touchPinchDist > 0) {
            const ratio = dist / touchPinchDist
            const rect = canvasRef.value.getBoundingClientRect()
            // 以两指中心为缩放锚点
            const cx = (t0.clientX + t1.clientX) / 2 - rect.left
            const cy = (t0.clientY + t1.clientY) / 2 - rect.top
            const canvasX = (cx - viewOffset.value.x) / scale.value
            const canvasY = (cy - viewOffset.value.y) / scale.value
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(touchPinchScale * ratio).toFixed(2)))
            viewOffset.value.x = cx - canvasX * newScale
            viewOffset.value.y = cy - canvasY * newScale
            scale.value = newScale
            draw()
        }
    }
}

function onTouchEnd() {
    if (isDragging.value && touchStartPos) {
        const dx = Math.abs(viewOffset.value.x - dragOffset.value.x)
        const dy = Math.abs(viewOffset.value.y - dragOffset.value.y)
        isDragging.value = false
        if (dx < 5 && dy < 5) {
            const rect = canvasRef.value.getBoundingClientRect()
            const mx = touchStartPos.x - rect.left
            const my = touchStartPos.y - rect.top
            checkHover(mx, my)
            handleClick()
        }
        touchStartPos = null
    }
}

// 悬停检测
function checkHover(mx, my) {
    const pos = nodePositions.value
    if (!pos) return
    const canvas = screenToCanvas(mx, my)

    let found = null
    for (const t of talents.value) {
        const p = pos[t.id]
        if (!p) continue
        const dx = canvas.x - p.x
        const dy = canvas.y - p.y
        if (dx * dx + dy * dy < (NODE_RADIUS + 10) * (NODE_RADIUS + 10)) {
            found = t
            break
        }
    }

    if (found !== hoveredTalent.value) {
        hoveredTalent.value = found
        if (found) panelAppearTime = Date.now()
        if (found) {
            const pos = nodePositions.value[found.id]
            if (pos) {
                tooltipX.value = pos.x * scale.value + viewOffset.value.x
                tooltipY.value = pos.y * scale.value + viewOffset.value.y
            }
        }
    }
}

// 点击处理
function handleClick() {
    const rect = canvasRef.value.getBoundingClientRect()
    const pos = nodePositions.value
    if (!pos) return

    // 用最新的鼠标位置（从 tooltipX/Y 获取，但 tooltipX/Y 在拖拽后可能不准）
    // 从拖拽 startPos 读取，但鼠标松开时已更新
    const cx = tooltipX.value
    const cy = tooltipY.value
    const canvas = screenToCanvas(cx, cy)

    let clicked = null
    for (const t of talents.value) {
        const p = pos[t.id]
        if (!p) continue
        const dx = canvas.x - p.x
        const dy = canvas.y - p.y
        if (dx * dx + dy * dy < NODE_RADIUS * NODE_RADIUS) {
            clicked = t
            break
        }
    }

    if (clicked) {
        // 点击天赋 → 如果已显示同一天赋则不重复设置（避免重置面板就绪计时器）
        if (hoveredTalent.value?.id === clicked.id) return
        // 显示或切换悬浮面板
        hoveredTalent.value = clicked
        const pos = nodePositions.value[clicked.id]
        if (pos) {
            tooltipX.value = pos.x * scale.value + viewOffset.value.x
            tooltipY.value = pos.y * scale.value + viewOffset.value.y
        }
    } else {
        // 点击空白区域 → 关闭面板
        hoveredTalent.value = null
    }
}

// ==================== 查找最后一个已激活天赋并跳转 ====================
function scrollToLastActivated() {
    const act = user.pixi.player.activatedTalents
    if (!act || act.length === 0) return

    // 从激活列表中找最大 tier 的（最后的已激活天赋）
    const lastId = act[act.length - 1]
    const pos = nodePositions.value[lastId]
    if (!pos) return

    const rect = canvasRef.value.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    const s = scale.value

    // 让该节点居中显示
    viewOffset.value.x = W / 2 - pos.x * s
    viewOffset.value.y = H / 2 - pos.y * s
}

// ==================== 生命周期 ====================
function renderLoop() {
    draw()
}

// ==================== 保存/恢复视图状态 ====================
function saveViewState() {
    if (!user.pixi.player.talentTreeView) {
        user.pixi.player.talentTreeView = {}
    }
    user.pixi.player.talentTreeView.scale = scale.value
    user.pixi.player.talentTreeView.offsetX = viewOffset.value.x
    user.pixi.player.talentTreeView.offsetY = viewOffset.value.y
}

function restoreViewState() {
    const saved = user.pixi.player.talentTreeView
    if (saved && saved.scale !== undefined && saved.scale !== null) {
        scale.value = saved.scale
        viewOffset.value.x = saved.offsetX ?? 0
        viewOffset.value.y = saved.offsetY ?? 0
        return true
    }
    return false
}

onMounted(() => {
    // 尝试从 sessionStorage 恢复图标缓存（定时器会立即执行，不影响后续）
    _loadIconCacheFromStorage()

    nextTick(() => {
        // 先立即绘制（画圆圈占位，图标后台慢慢渲染）
        draw()
        // 恢复视图状态或跳转到已激活天赋
        if (!restoreViewState()) {
            scrollToLastActivated()
        }
        draw()

        // 后台批量渲染天赋图标（不阻塞首次绘制）
        // 如果 sessionStorage 中有缓存，这一步几乎瞬间完成
        preloadAllTalentIcons().then(() => {
            draw() // 图标就绪后重绘
        })

        // 直接用 setInterval 代替 requestAnimationFrame 减少 GPU 开销
        animationId = setInterval(() => {
            renderLoop()
        }, 500)
    })
})

// 每次拖拽/缩放后自动保存
watch(() => scale.value, () => { saveViewState() })
watch(() => viewOffset.value.x, () => { saveViewState() })
watch(() => viewOffset.value.y, () => { saveViewState() })

onUnmounted(() => {
    if (animationId) clearInterval(animationId)
    // 不销毁 _gSpineRenderApp 和 _gIconCache，下次打开秒开
})

// 视图变化时更新悬浮面板位置（跟随画布移动/缩放）
watch([() => viewOffset.value.x, () => viewOffset.value.y, scale], () => {
    if (!hoveredTalent.value) return
    const pos = nodePositions.value[hoveredTalent.value.id]
    if (!pos) return
    tooltipX.value = pos.x * scale.value + viewOffset.value.x
    tooltipY.value = pos.y * scale.value + viewOffset.value.y
})

watch(() => user.pixi.player.activatedTalents, () => { draw() }, { deep: true })
watch(() => user.pixi.player.talentPoints, () => { draw() })
watch(scale, () => { draw() })

// 面板出现时记录时间戳（防误触用）
watch(hoveredTalent, (val) => {
    if (val) panelAppearTime = Date.now()
})
</script>

<style scoped>
canvas {
    touch-action: none;
}
</style>
