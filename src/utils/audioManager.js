/**
 * 🎵 统一音频管理器
 * ============================================================
 * 职责：
 *  1. SFX（音效）：原生 Audio 对象池 + 同名去重 + 统一音量系数
 *     —— 面向地牢/高频音效（脚步、拾取、受击等），避免每次 new Audio 堆积、同名轰炸
 *  2. BGM（背景音乐）：基于 Howler 的统一播放入口（淡入淡出、目录前缀、同曲不重启）
 *     —— 主世界 / 地牢 / 战斗的 BGM 全部经由这里，store.playBgm 转发到本模块
 *  3. 场景记忆：pushBgmScene / popBgmScene —— 进入子场景（地牢/战斗）时记忆上一层
 *     BGM，退出时自动恢复，解决"场景切换 BGM 丢失/串台"问题
 * ============================================================
 */
import { Howl, Howler } from 'howler'

// ==================== SFX（原生 Audio 池 + 去重） ====================
const _sfxPool = new Map()        // name -> Audio[]（空闲实例池）
const _sfxLastAt = new Map()      // name -> 上次播放时间戳（同名去重）
const SFX_MAX_POOL = 3            // 每个音效最多缓存 3 个空闲实例
const SFX_DEFAULT_DEDUPE = 120    // 默认同名音效最小间隔（ms），防连发轰炸
let _globalSfxVolume = 1          // 全局音效音量系数（乘到每次 sfx 上）

/** 设置全局音效音量系数（0~1），供外部跟随用户音量设置同步 */
export function setGlobalSfxVolume(v) {
  _globalSfxVolume = Math.max(0, Math.min(1, Number(v) || 1))
}

/**
 * 播放一次性音效（池化 + 同名去重）
 * @param {string} name 音频名（不含后缀）
 * @param {Object} [opts]
 * @param {number} [opts.volume=0.7] 基础音量（最终 = volume × 全局系数，钳制 0~1）
 * @param {number} [opts.dedupeMs=120] 同名最小间隔；0 = 不去重
 * @param {number} [opts.rate=1] 播放速率
 * @param {string} [opts.base='/music/'] 音频目录前缀
 */
export function sfx(name, opts = {}) {
  if (!name) return
  const { volume = 0.7, dedupeMs = SFX_DEFAULT_DEDUPE, rate = 1, base = '/music/' } = opts
  const now = performance.now()
  if (dedupeMs > 0) {
    const last = _sfxLastAt.get(name) || 0
    if (now - last < dedupeMs) return
    _sfxLastAt.set(name, now)
  }
  try {
    const url = base + name + '.mp3'
    let pool = _sfxPool.get(name)
    if (!pool) { pool = []; _sfxPool.set(name, pool) }
    let a = pool.pop()
    if (!a) a = new Audio(url)
    else { try { a.src = url } catch (e) { a = new Audio(url) } }
    a.volume = Math.max(0, Math.min(1, volume * _globalSfxVolume))
    a.playbackRate = rate
    a.play().catch(() => { /* 自动播放被拦截时静默跳过 */ })
    a.onended = () => {
      try { a.pause(); a.currentTime = 0 } catch (e) { /* ignore */ }
      if (pool.length < SFX_MAX_POOL) pool.push(a)
      else { try { a.src = '' } catch (e) { /* ignore */ } }
    }
  } catch (e) { /* ignore */ }
}

// ==================== BGM（Howler 统一播放） ====================
const BGM_FADE = 500                       // 淡入淡出毫秒
let _bgm = null                            // 当前 Howl 实例
let _bgmKey = null                         // 当前 BGM key（含目录差异比较）
let _bgmBase = '/music/'                   // 当前 BGM 目录前缀

function _ensureUnlocked() {
  try {
    if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume()
  } catch (e) { /* ignore */ }
}

/** 当前正在播放的 BGM key（null = 无） */
export function getCurrentBgm() { return _bgmKey }

/**
 * 播放背景音乐（循环 + 淡入淡出）
 * @param {string} key 音乐名（不含后缀）
 * @param {Object} [opts]
 * @param {number} [opts.volume=0.4] 目标音量（0~1）
 * @param {string} [opts.base='/music/'] 音乐目录前缀（地牢传 DILAO_MUSIC_BASE）
 */
export function playBgm(key, opts = {}) {
  const { volume = 0.4, base = '/music/' } = opts
  if (!key) return
  // 同曲同源正在播 → 不重启（避免天气切换/场景恢复时反复重建实例）
  if (_bgmKey === key && _bgmBase === base && _bgm) return
  stopBgm()
  _ensureUnlocked()
  _bgmKey = key
  _bgmBase = base
  try {
    const h = new Howl({ src: [base + key + '.mp3'], loop: true, volume: 0, preload: true })
    _bgm = h
    h.play()
    h.fade(0, Math.max(0, Math.min(1, volume)), BGM_FADE)
  } catch (e) {
    _bgm = null
    _bgmKey = null
  }
}

/** 停止背景音乐（淡出后释放实例） */
export function stopBgm() {
  if (_bgm) {
    try {
      const h = _bgm
      h.fade(h.volume(), 0, BGM_FADE)
      setTimeout(() => { try { h.stop(); h.unload() } catch (e) { /* ignore */ } }, BGM_FADE + 80)
    } catch (e) { /* ignore */ }
    _bgm = null
  }
  _bgmKey = null
}

/** ⚙️ 设置弹窗调音量：立即把当前 BGM fade 到新目标音量（0~1），不重启实例 */
export function setBgmVolume(v) {
  const target = Math.max(0, Math.min(1, Number(v) || 0))
  if (_bgm) {
    try { _bgm.fade(_bgm.volume(), target, 300) } catch (e) { /* ignore */ }
  }
}

/** 停止全部音频（BGM；SFX 为即时音效无需停止） */
export function stopAll() { stopBgm() }

// ==================== 场景记忆（BGM 自动恢复） ====================
const _bgmSceneStack = []   // 场景 BGM 记忆栈

/**
 * 进入子场景：记忆当前 BGM，然后切到场景 BGM（可传 null 表示只停不播）
 * 例：进地牢 pushBgmScene()（记主世界）；进战斗 pushBgmScene('fight', {volume:1.2})
 */
export function pushBgmScene(key = null, opts = {}) {
  _bgmSceneStack.push({ key: _bgmKey, base: _bgmBase })
  if (key) playBgm(key, opts)
  else stopBgm()
}

/**
 * 退出子场景：恢复进入前记忆的 BGM（与 pushBgmScene 配对使用）
 */
export function popBgmScene() {
  const prev = _bgmSceneStack.pop()
  if (prev && prev.key) playBgm(prev.key, { volume: 0.4, base: prev.base })
  else stopBgm()
}

/** 清空场景记忆栈（页面级切换时兜底，防止残留栈导致下次恢复错乱） */
export function clearBgmSceneStack() { _bgmSceneStack.length = 0 }
