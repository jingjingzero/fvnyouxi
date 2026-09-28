/**
 * idleAnimator.js — 角色不定时待机动画播放器
 *
 * 用途：让站立不动的角色「不定时」播放一个特殊待机动画（如摇头、环顾、挥手、眨眼等），
 *       播完自动回到基础待机 idle，增加角色鲜活感。
 *
 * 依赖：createSpineBoy 返回的角色对象（含 .spine / .playIdle）
 *   - character.spine                        -> spine-pixi-v8 Spine 实例
 *   - character.spine.skeleton.data.animations -> 动画列表
 *   - character.spine.state                   -> AnimationState（setAnimation / tracks）
 *
 * 用法：
 *   import { idleAnimator } from './matter1/idleAnimator.js'
 *
 *   // 开始（5~12 秒随机间隔播一次特殊待机）
 *   idleAnimator.start(character, {
 *     idleNames: ['idle2', 'breath'],   // 可选：候选特殊待机动画名（不传则自动挑选含 idle 的）
 *     minInterval: 5000,                // 最小间隔 ms（默认 5000）
 *     maxInterval: 12000,               // 最大间隔 ms（默认 12000）
 *     baseAnim: 'idle',                 // 基础待机名（默认自动找 'idle'）
 *     onlyWhenIdle: true,               // 仅在角色处于基础待机时才播（避免打断跑步/攻击，默认 true）
 *     checkActive: () => true,          // 可选：额外「可播放」判断（战斗/对话暂停时返回 false）
 *   })
 *
 *   // 停止 / 暂停 / 恢复
 *   idleAnimator.stop(character)
 *   idleAnimator.pause(character)      // 临时暂停（战斗/对话时用），不销毁
 *   idleAnimator.resume(character)     // 恢复
 *   idleAnimator.stopAll()             // 全部停止
 *
 *   // 角色销毁前记得调用 idleAnimator.stop(character)，避免残留计时器
 */

// ==================== 内部状态 ====================
const registry = new Map() // character -> { enabled, destroyed, timerId, options }

// ==================== Spine 引用归一化 ====================

/**
 * 取出角色身上的「真实 Spine 实例」。
 * createSpineBoy 返回的包装对象：{ view, spine, ... }，真实实例在 .spine 上；
 * 但某些地方可能直接把实例传进来。所以兼容两种：character.spine.spine || character.spine。
 */
function getRealSpine(character) {
  return character?.spine?.spine || character?.spine || null
}

// ==================== 工具 ====================

function getAnimations(character) {
  return getRealSpine(character)?.skeleton?.data?.animations || []
}

function findAnimation(character, name) {
  return getAnimations(character).find(a => a.name === name) || null
}

/**
 * 排除「动作类」动画名 —— 这些不是待机变体，绝不能当待机播
 * （run 跑步 / walk 走路 / jump 跳 / fight 攻击 / shoushang 受伤 / animation 叠层混合等）
 */
const ACTION_BLACKLIST = [
  'run', 'walk', 'walking', 'sprint',
  'jumpup', 'jumpdown', 'jump', 'jump_1', 'jump_2',
  'fight', 'attack', 'att', 'skill', 'hit', 'hurt', 'damage',
  'shoushang', 'dead', 'die', 'death', 'down', 'lie',
  'animation', // 叠层混合动画（spineBoy 轨道1用的），不是独立待机
]

function isActionName(name) {
  return ACTION_BLACKLIST.includes(name)
}

/** 挑选候选的特殊待机动画名列表（只返回「真正的待机变体」） */
function findIdleVariants(character, idleNames) {
  const anims = getAnimations(character)
  const has = new Set(anims.map(a => a.name))
  const result = []

  // 1. 优先用传入的 idleNames（只保留真实存在且非动作类的）
  ;(idleNames || []).forEach(n => {
    if (has.has(n) && !isActionName(n) && n !== 'idle' && !result.includes(n)) {
      result.push(n)
    }
  })
  if (result.length > 0) return result

  // 2. 自动挑选：名称含 idle 但 ≠ 基础 idle 的（如 idle2 / idle_breath / idleLook）
  anims.forEach(a => {
    if (/idle/i.test(a.name) && a.name !== 'idle' && !isActionName(a.name)) {
      result.push(a.name)
    }
  })
  if (result.length > 0) return result

  // 3. 兜底：没有任何「待机变体」→ 返回空（调用方遇空则不播，绝不拿 run/jump 凑数）
  return []
}

/** 找到基础待机动画名（默认 'idle'，找不到在非动作类动画里挑一个） */
function findBaseAnim(character, baseAnim) {
  if (baseAnim && findAnimation(character, baseAnim)) return baseAnim
  if (findAnimation(character, 'idle')) return 'idle'
  // 兜底：挑第一个「非动作类」动画当基础（避免拿 run/jump 当基础待机）
  const calm = getAnimations(character).find(a => !isActionName(a.name))
  return calm?.name || null
}

/** 当前轨道 0 是否正播基础待机 */
function isCurrentlyBase(character, baseAnim) {
  const state = getRealSpine(character)?.state
  if (!state) return false
  const track = state.tracks?.[0]
  if (!track?.animation) return true
  return track.animation.name === baseAnim
}

// ==================== 核心 ====================

function scheduleNext(character, state) {
  if (!state.enabled || state.destroyed) return
  // 🔒 防抖：已有一个待触发的计时器就不再新建，避免 resume() 被每帧/每3帧反复调用时
  //    叠加出大量 setTimeout，导致 10~20 秒后一堆定时器同时触发、看起来「一直连续播放」
  if (state.timerId != null) return
  const min = state.options.minInterval ?? 5000
  const max = state.options.maxInterval ?? 12000
  const delay = min + Math.random() * Math.max(0, max - min)
  state.timerId = setTimeout(() => {
    state.timerId = null // 触发后清空，允许安排下一次
    fire(character, state)
  }, delay)
}

function fire(character, state) {
  if (!state.enabled || state.destroyed) return
  try {
    const o = state.options
    const variants = findIdleVariants(character, o.idleNames)
    const baseAnim = findBaseAnim(character, o.baseAnim)
    const realSpine = getRealSpine(character)

    if (!baseAnim || variants.length === 0) {
      // 🩺 一次性诊断：配置了 idleNames 但骨骼里找不到可播的待机变体
      //   最典型原因：骨骼文件里根本没有对应动画名（如 jinmao.skel/yu.skel 里只有 idle）
      if (o.idleNames?.length && variants.length === 0 && !state._warnedNoVariant) {
        state._warnedNoVariant = true
        const skelName = realSpine?.skeleton?.data?.name || '?'
        const has = getAnimations(character).map(a => a.name).join(', ') || '（无）'
        console.warn(
          `[idleAnimator] 角色「${character.data?.name ?? character.data?.id ?? '?'}」的骨骼「${skelName}」中没有待机变体动画，已跳过待机（不再播）。\n` +
          `  ▸ 配置的 idleNames: ${JSON.stringify(o.idleNames)}\n` +
          `  ▸ 骨骼实际动画: ${has}\n` +
          `  ▸ 解决方法：给该骨骼补上对应动画名，或把 idleNames 改成骨骼中已有的动画（如 huli 骨骼可用 'idle2'/'idle2662'）。`
        )
      }
      // ⛔ 骨骼没有可播的待机变体 → 给角色打上标记并停止计时器，不再空转。
      //    标记可防止后续 resume（视距恢复/显示恢复）反复 start→fire→stop 空转
      character.__noIdleVariant = true
      idleAnimator.stop(character)
      return
    }
    // 有可播动画 → 清除可能的历史「无变体」标记（骨骼可能被换/重载后新增了动画）
    if (character.__noIdleVariant) delete character.__noIdleVariant

    // 仅在角色处于基础待机时才播，避免打断跑步/攻击/受伤
    if (o.onlyWhenIdle !== false && !isCurrentlyBase(character, baseAnim)) {
      scheduleNext(character, state)
      return
    }
    // 额外可播放判断（战斗/对话暂停等由调用方传入）
    if (typeof o.checkActive === 'function' && !o.checkActive(character)) {
      scheduleNext(character, state)
      return
    }

    // 随机挑一个特殊待机动画，非循环播放
    const animName = variants[Math.floor(Math.random() * variants.length)]
    // 🔒 最终安全闸：再次确认动画真实存在（骨骼中途可能被换/重载），不存在则跳过不报错
    if (!realSpine || !animName || !findAnimation(character, animName)) {
      scheduleNext(character, state)
      return
    }
    const entry = realSpine.state.setAnimation(0, animName, false)

    // 播完回到基础待机 + 安排下一次
    const resume = () => {
      // 无论由 complete 触发还是兜底定时器触发，都先清除兜底，保证只执行一次
      if (state._fallbackTimer) { clearTimeout(state._fallbackTimer); state._fallbackTimer = null }
      const cur = getRealSpine(character)
      if (state.enabled && !state.destroyed && cur && cur.state) { // 🛡️ cur.state 可能为 null（spine 未就绪/已销毁），避免 setEmptyAnimation 崩
        // 🔒 安全：基础待机若已不存在（骨骼被换），回落到骨骼第一个动画或保持当前
        const safeBase = findAnimation(character, baseAnim) ? baseAnim : (getAnimations(character)[0]?.name || null)
        if (safeBase) {
          const baseEntry = cur.state.setAnimation(0, safeBase, true)
          // 🎲 与 spineBoy 一致：配置了 animRandomOffset 的角色，特殊待机播完回到基础待机时
          //    也随机/按比例错峰，避免多个同骨骼 NPC 的基础待机重新对齐
          if (character.data?.animRandomOffset && baseEntry) {
            const dur = baseEntry.animation?.duration ?? 1
            baseEntry.trackTime = typeof character.data.animRandomOffset === 'number'
              ? (character.data.animRandomOffset % 1) * dur
              : Math.random() * dur
          }
        } else {
          cur.state.setEmptyAnimation(0, 0)
        }
      }
      scheduleNext(character, state)
    }

    // 复用可能已有的 listener，只追加 complete 逻辑
    if (entry.listener) {
      const prev = entry.listener
      entry.listener = {
        complete: (e) => { prev?.complete?.(e); resume() },
      }
    } else {
      entry.listener = { complete: resume }
    }

    // 🔒 兜底保险：万一 complete 事件丢失（轨道被每帧 playIdle / 其它动画覆盖而中断），
    //    在「动画时长 + 0.5s」后强制切回 idle 并安排下一次，保证不会一直停留在特殊待机
    const durSec = entry.animation?.duration || 2
    state._fallbackTimer = setTimeout(resume, (durSec + 0.5) * 1000)
  } catch (e) {
    console.warn('[idleAnimator] 播放待机动画出错:', e)
    scheduleNext(character, state)
  }
}

// ==================== 对外接口 ====================

export const idleAnimator = {
  /**
   * 开始为角色不定时播放待机动画
   * @param {Object} character - createSpineBoy 返回的角色对象
   * @param {Object} [options] - 配置
   * @returns {boolean} 是否成功启动
   */
  start(character, options = {}) {
    if (!getRealSpine(character)) return false
    // 该角色骨骼没有待机变体（此前已被检测到）→ 直接跳过，不再尝试
    if (character.__noIdleVariant) return false
    if (registry.has(character)) this.stop(character)
    const state = { enabled: true, destroyed: false, timerId: null, _fallbackTimer: null, options: { ...options } }
    registry.set(character, state)
    scheduleNext(character, state)
    return true
  },

  /** 停止某个角色的待机动画（并清除计时器） */
  stop(character) {
    const state = registry.get(character)
    if (!state) return
    state.enabled = false
    state.destroyed = true
    if (state.timerId) clearTimeout(state.timerId)
    if (state._fallbackTimer) { clearTimeout(state._fallbackTimer); state._fallbackTimer = null }
    registry.delete(character)
  },

  /** 停止所有角色 */
  stopAll() {
    registry.forEach((state) => {
      state.enabled = false
      state.destroyed = true
      if (state.timerId) clearTimeout(state.timerId)
      if (state._fallbackTimer) { clearTimeout(state._fallbackTimer); state._fallbackTimer = null }
    })
    registry.clear()
  },

  /** 是否正在运行 */
  isActive(character) {
    return registry.has(character)
  },

  /**
   * 调试：查看某角色实际会播哪些待机动画候选（按当前配置过滤后）
   * @param {Object} character - 角色对象
   * @param {Object} [options] - 可选：想按哪个配置查（默认用已 start 的配置，没 start 用空）
   * @returns {string[]} 该角色实际可播的待机动画名列表（空 = 不会播）
   */
  inspect(character, options = null) {
    if (!getRealSpine(character)) return []
    const opts = options || registry.get(character)?.options || {}
    const variants = findIdleVariants(character, opts.idleNames)
    const baseAnim = findBaseAnim(character, opts.baseAnim)
    return {
      character: character.data?.name ?? character.data?.id ?? '?',
      baseAnim,
      variants,                       // 实际会随机播的候选（空=不播）
      willPlay: variants.length > 0,  // 是否会播额外待机
    }
  },

  /** 临时暂停（战斗/对话时用），不销毁状态 */
  pause(character) {
    const state = registry.get(character)
    if (!state) return
    state.enabled = false
    if (state.timerId) { clearTimeout(state.timerId); state.timerId = null }
    if (state._fallbackTimer) { clearTimeout(state._fallbackTimer); state._fallbackTimer = null }
  },

  /** 恢复（暂停后继续；未启动则相当于 start） */
  resume(character, options = {}) {
    const state = registry.get(character)
    if (state) {
      state.enabled = true
      if (state._fallbackTimer) { clearTimeout(state._fallbackTimer); state._fallbackTimer = null }
      scheduleNext(character, state)
    } else {
      this.start(character, options)
    }
  },
}
