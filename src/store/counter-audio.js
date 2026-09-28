// 音频辅助（拆分自 counter.js）
import { Howl, Howler } from "howler";

export let audioUnlocked = false;      // 音频是否已解锁（浏览器自动播放策略）
export let bgmSoundInstance = null;    // 背景音乐实例
export let currentBgmName = null;      // 当前BGM名称
export let playingSounds = [];
// 🎯 同名音效去重表（name → 上次播放时间），防战斗/高频音效连发轰炸
export const _sfxDedupMap = new Map();
export const SFX_DEDUPE_MS = 80;
// 🎵 背景音乐【总音量系数】：所有 BGM 的最终音量 = 全局音量(volume) × 调用方系数(num) × 此系数
//    想统一调小/调大所有背景音乐，只改这一个数（0.5 = 全部减半，1 = 不缩放，0.3 = 再降 70%）
export const BGM_VOLUME_BASE = 0.65;
/**
 * 解锁音频上下文（需在用户手势事件中调用）
 */
export function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    audioUnlocked = true;
  } catch (e) {
    console.warn('[Store音频] 音频解锁失败:', e);
  }
}

// ======================================
// 自动存档配置：需要持久化的state路径
// 后续新增需要存档的字段，直接添加到这个数组即可，无需修改存读档逻辑
// ======================================
export let _autoSaveTimer = null;
export function setAutoSaveTimer(v) { _autoSaveTimer = v; }