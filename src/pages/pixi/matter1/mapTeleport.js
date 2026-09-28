/**
 * 地图传送面板模块（从 matter.vue 抽离）
 *
 * 提供：传送面板状态、可选项配置、onTpMapChange / doTeleport 逻辑
 * 依赖通过 initMapTeleport(ctx) 注入，避免与 matter.vue 强耦合。
 *
 * 注意：
 * - el-select 的 value 必须是「字符串 key」，不能用数组/对象（引用相等无法匹配选中态）
 * - 真实数据（数组/对象）通过 key 在选项里查找，放在 tpConfig 中供 doTeleport 使用
 */
import { ref } from 'vue'
import { getAllMapMeta } from '../player/map.js'

// ==================== 可选项配置 ====================

/**
 * 可选的目标地图（从地图注册表生成）
 * 只列出「非战斗地图」（story 类型），战斗地图由世界地图进入
 */
export const tpMapOptions = Object.entries(getAllMapMeta())
  .filter(([, meta]) => meta.type === 'story')
  .map(([id, meta]) => ({ id, label: meta.label || meta.mapId || id }))

/** 昼夜滤镜可选值 */
export const tpLightOptions = [
  { label: '白天', value: 'day' },
  { label: '早晨', value: 'morning' },
  { label: '夜晚', value: 'night' },
]

/** 地图背景可选（key 作为下拉 value，value 存真实图片数组，spineForeground 为该背景配套的前景） */
export const tpBgOptions = [
  {
    key: 'forest',
    label: '森林地图（map1_01~04）',
    value: ['map1_01', 'map1_02', 'map1_03', 'map1_04'],
    spineForeground: null, // 森林初始地图没有 spineForeground
  },
  {
    key: 'desert',
    label: '沙漠地图（map2_01~04）',
    value: ['map2_01', 'map2_02', 'map2_03', 'map2_04'],
    spineForeground: { skelName: 'changjing2_skel', atlasName: 'changjing2_atlas', animationName: null },
  },
]

/** 远景背景可选 */
export const tpFarBgOptions = [
  { key: 'forest', label: '森林远景（map1_01yj~02yj）', value: ['map1_01yj', 'map1_02yj'] },
  { key: 'none', label: '无远景', value: [] },
]

/** 哨兵对象：表示「无 Spine 背景」（不能用 null，el-select value 类型检查会警告） */
export const SPINE_BG_NONE = { __none: true }

/** Spine 动态背景可选 */
export const tpSpineBgOptions = [
  {
    key: 'scene1',
    label: '场景1（changjing1）',
    value: { skelName: 'changjing1_skel', atlasName: 'changjing1_atlas', animationName: null },
  },
  { key: 'none', label: '无 Spine 背景', value: SPINE_BG_NONE },
]

// ==================== 面板状态 ====================

export const tpPanelVisible = ref(false)

export const tpConfig = ref({
  targetMap: 'desert_01',
  lightSource: 'morning',
  // 下拉选中 key（字符串）
  bgKey: 'forest',
  farBgKey: 'forest',
  spineBgKey: 'scene1',
  // 实际数据（由 key 同步得到）
  backgroundImages: ['map1_01', 'map1_02', 'map1_03', 'map1_04'],
  farBackgroundImages: ['map1_01yj', 'map1_02yj'],
  spineBackground: { skelName: 'changjing1_skel', atlasName: 'changjing1_atlas', animationName: null },
  // 高层 Spine 前景（随地图背景一起选择；沙漠背景有 changjing2，森林没有）
  spineForeground: null,
  TopMap: 0,
  OFFSETY: 76,
})

// ==================== 依赖注入 ====================

let _ctx = null

/**
 * 注入 matter.vue 的运行依赖
 * @param {Object} ctx - { user, Assets, BgWall, ElMessText, getVH, getTpMap, getCameraTarget, getActivePlayer, resetMapBounds }
 */
export function initMapTeleport(ctx) {
  _ctx = ctx
}

// ==================== 工具 ====================

function getOpt(list, key) {
  return list.find(o => o.key === key) || null
}

function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

// ==================== 逻辑 ====================

/** 切换目标地图时，自动同步该地图的默认配置 */
export function onTpMapChange() {
  const { user } = _ctx
  const srcMap = user.pixi.mapDataList?.find(m => m.id === tpConfig.value.targetMap)
  if (!srcMap) return
  const cfg = tpConfig.value

  cfg.lightSource = srcMap.lightSource?.night?.fixedTime || 'morning'

  // 同步地图背景 key + 数据
  const bgIdx = tpBgOptions.findIndex(o => arraysEqual(o.value, srcMap.backgroundImages || []))
  cfg.bgKey = bgIdx > -1 ? tpBgOptions[bgIdx].key : (tpBgOptions[0]?.key || 'forest')
  cfg.backgroundImages = [...(srcMap.backgroundImages || [])]

  // 同步远景背景 key + 数据
  const farIdx = tpFarBgOptions.findIndex(o => arraysEqual(o.value, srcMap.farBackgroundImages || []))
  cfg.farBgKey = farIdx > -1 ? tpFarBgOptions[farIdx].key : (tpFarBgOptions[0]?.key || 'forest')
  cfg.farBackgroundImages = [...(srcMap.farBackgroundImages || [])]

  // 同步 Spine 背景 key + 数据
  if (srcMap.spineBackground) {
    cfg.spineBackground = { ...srcMap.spineBackground }
    const spIdx = tpSpineBgOptions.findIndex(
      o => o.value && !o.value.__none
        && o.value.skelName === srcMap.spineBackground.skelName
        && o.value.atlasName === srcMap.spineBackground.atlasName
    )
    cfg.spineBgKey = spIdx > -1 ? tpSpineBgOptions[spIdx].key : 'scene1'
  } else {
    cfg.spineBackground = SPINE_BG_NONE
    cfg.spineBgKey = 'none'
  }

  // 同步高层 Spine 前景（随地图背景，与背景一起切换）
  cfg.spineForeground = srcMap.spineForeground
    ? { ...srcMap.spineForeground }
    : null

  cfg.TopMap = srcMap.TopMap ?? 0
  cfg.OFFSETY = srcMap.currentGroundY ?? 76
}

/** 地图背景下拉变化：按 key 同步实际数组 + 配套的 Spine 前景 */
export function onBgKeyChange() {
  const opt = getOpt(tpBgOptions, tpConfig.value.bgKey)
  if (opt) {
    tpConfig.value.backgroundImages = [...opt.value]
    tpConfig.value.spineForeground = opt.spineForeground
      ? { ...opt.spineForeground }
      : null
  }
}

/** 远景背景下拉变化：按 key 同步实际数组 */
export function onFarBgKeyChange() {
  const opt = getOpt(tpFarBgOptions, tpConfig.value.farBgKey)
  if (opt) tpConfig.value.farBackgroundImages = [...opt.value]
}

/** Spine 背景下拉变化：按 key 同步实际配置 */
export function onSpineBgKeyChange() {
  const opt = getOpt(tpSpineBgOptions, tpConfig.value.spineBgKey)
  if (opt) {
    tpConfig.value.spineBackground = opt.value && !opt.value.__none
      ? { ...opt.value }
      : SPINE_BG_NONE
  }
}

/**
 * 执行地图传送：用面板配置构建一份「自定义地图数据」，
 * 全部设置好（背景/远景/Spine/TopMap/地面高度/昼夜）后 TpMap 到目标地图。
 */
export async function doTeleport() {
  const { user, Assets, BgWall, ElMessText } = _ctx
  const cfg = tpConfig.value

  const targetMap = user.pixi.mapDataList?.find(m => m.id === cfg.targetMap)
  if (!targetMap) {
    ElMessText('目标地图不存在！', 'warning')
    return
  }
  tpPanelVisible.value = false

  // 1. 构建自定义地图数据（深拷贝目标地图，覆盖可配置项）
  const customMap = JSON.parse(JSON.stringify(targetMap))
  customMap.id = cfg.targetMap
  customMap.lightSource = { night: { enable: true, fixedTime: cfg.lightSource } }
  customMap.backgroundImages = [...cfg.backgroundImages]
  customMap.farBackgroundImages = [...cfg.farBackgroundImages]
  // Spine 动态背景：哨兵对象表示「无」，否则取实际配置
  customMap.spineBackground = cfg.spineBackground && !cfg.spineBackground.__none
    ? { ...cfg.spineBackground }
    : null
  // 高层 Spine 前景：随地图背景（沙漠有 changjing2，森林无）
  customMap.spineForeground = cfg.spineForeground
    ? { ...cfg.spineForeground }
    : null
  customMap.TopMap = cfg.TopMap
  customMap.currentGroundY = cfg.OFFSETY
  // 按新地面高度重算出生点 Y（playerSpawnY = OFFSETY * VH）
  customMap.playerSpawnY = cfg.OFFSETY * _ctx.getVH()

  // 2. 计算该地图背景的实际宽度（传送前先构建好）
  // 🎯 优先 spineForeground 动态背景宽度，没有则用 backgroundImages 静态背景宽度
  const mapWidth = _ctx.computeMapWidth ? _ctx.computeMapWidth(customMap, Assets) : 0
  customMap.realWidth = mapWidth || targetMap.realWidth || 3000
  // 重新计算出生点 X（沿用目标地图的出生点百分比位置）
  const spawnPercent = targetMap.playerSpawnX != null
    ? (targetMap.playerSpawnX - (targetMap.offsetX ?? 0)) / (targetMap.realWidth || 1)
    : 0.5
  customMap.playerSpawnX = (customMap.offsetX ?? 0) + customMap.realWidth * spawnPercent

  // 3. 把自定义地图写入 mapDataList（替换原地图定义，保证 TpMap 能读到）
  const idx = user.pixi.mapDataList.findIndex(m => m.id === cfg.targetMap)
  if (idx > -1) {
    user.pixi.mapDataList.splice(idx, 1, customMap)
  } else {
    user.pixi.mapDataList.push(customMap)
  }
  // 重置地图边界缓存（传送后地图宽度/偏移变化，clamp 边界需重新计算）
  _ctx.resetMapBounds()

  // 4. 传送：到目标地图出生点（优先用上面算好的 playerSpawnX，避免落到地图中心）
  const tpX = customMap.playerSpawnX != null ? customMap.playerSpawnX : customMap.offsetX + customMap.realWidth * 0.5
  await _ctx.getTpMap()(cfg.targetMap, tpX)

  // 5. 传送后镜头对准玩家
  const cameraTarget = _ctx.getCameraTarget()
  const activePlayer = _ctx.getActivePlayer()
  if (cameraTarget && activePlayer?.body) {
    cameraTarget.position.set(activePlayer.body.position.x, activePlayer.body.position.y)
  }
  ElMessText(`已传送到 ${customMap.name || cfg.targetMap}`, 'success')
}
