/**
 * 特效对象池管理
 * 
 * 集中管理所有 Spine 特效的创建、复用、回收和预热
 * 避免频繁 new/destroy 造成的 GC 压力
 */
import { battleLog } from '../logger.js'
import { Spine } from "@esotericsoftware/spine-pixi-v8";

// ==============================================
// 🔥 缓存配置
// ==============================================
export let VH_CACHE = null;
export let VW_CACHE = null;
export let VH = window.innerHeight / 100;
export let VW = window.innerWidth / 100;
// 特效缩放基准：所有硬编码 scale 值基于 1080px 高的参考屏幕设计
// 非 16:9 横屏（比如 iPad）用高度比例适配，确保特效大小在不同设备上一致
export const EFFECT_SCALE_BASE = window.innerHeight / 1080;

/**
 * 初始化缓存（战斗开始时调用一次）
 */
export function initCache(user) {
  VH_CACHE = window.innerHeight / 100;
  VW_CACHE = window.innerWidth / 100;
}

/** 获取缓存的视口百分比值 */
export function getVHCache() { return VH_CACHE; }
export function getVWCache() { return VW_CACHE; }

// ==============================================
// 🔥 Spine特效对象池（全局复用，不创建不销毁）
// ==============================================
const EFFECT_CONFIG = {
  cxhuoqiu: { skeleton: 'cxhuoqiu_skel', atlas: 'cxhuoqiu_atlas' },
  bullet: { skeleton: 'texiaozidan_skel', atlas: 'texiaozidan_atlas' },
  laser: { skeleton: 'jiguang_skel', atlas: 'jiguang_atlas' },
  juling: { skeleton: 'juling_skel', atlas: 'juling_atlas' },
  shuituanzi: { skeleton: 'shuituanzi_skel', atlas: 'shuituanzi_atlas' },
  leituanzi: { skeleton: 'leituanzi_skel', atlas: 'leituanzi_atlas' },
  bingjingling: { skeleton: 'bingjingling_skel', atlas: 'bingjingling_atlas' },
  huojingling: { skeleton: 'huojingling_skel', atlas: 'huojingling_atlas' },
  fenshen: { skeleton: 'linen_skel', atlas: 'linen_atlas' },
  dongcha: { skeleton: 'dongcha_skel', atlas: 'dongcha_atlas' },
  zhangqi: { skeleton: 'zhangqi_skel', atlas: 'zhangqi_atlas' },
  wuqiqianghua: { skeleton: 'wuqiqianghua_skel', atlas: 'wuqiqianghua_atlas' },
  fantan: { skeleton: 'fantan_skel', atlas: 'fantan_atlas' },
  duwu: { skeleton: 'duwu_skel', atlas: 'duwu_atlas' },
  zhuaji: { skeleton: 'zhuaji_skel', atlas: 'zhuaji_atlas' },
  zhuaji2: { skeleton: 'zhuaji2_skel', atlas: 'zhuaji2_atlas' },
  shuipao: { skeleton: 'shuipao_skel', atlas: 'shuipao_atlas' },
  bingjian: { skeleton: 'bingjian_skel', atlas: 'bingjian_atlas' },
  dongjie: { skeleton: 'dongjie_skel', atlas: 'dongjie_atlas' },
  huoqiu: { skeleton: 'huoqiu_skel', atlas: 'huoqiu_atlas' },
  baozha: { skeleton: 'baozha_skel', atlas: 'baozha_atlas' },
  dianji: { skeleton: 'dianji_skel', atlas: 'dianji_atlas' },
  leiji: { skeleton: 'leiji_skel', atlas: 'leiji_atlas' }, // ⚡ 雷击（雷鸟女皇普攻三段特效）
  LongjuanFengbao: { skeleton: 'LongjuanFengbao_skel', atlas: 'LongjuanFengbao_atlas' },
  FengZhiBiyou: { skeleton: 'FengZhiBiyou_skel', atlas: 'FengZhiBiyou_atlas' },
  Fengren1: { skeleton: 'Fengren1_skel', atlas: 'Fengren1_atlas' },
  Shuilao: { skeleton: 'Shuilao_skel', atlas: 'Shuilao_atlas' },
  Shuiyu: { skeleton: 'Shuiyu_skel', atlas: 'Shuiyu_atlas' },
  Fengren: { skeleton: 'Fengren_skel', atlas: 'Fengren_atlas' },
  JinjiKuanglei: { skeleton: 'JinjiKuanglei_skel', atlas: 'JinjiKuanglei_atlas' },
  Fenyan: { skeleton: 'Fenyan_skel', atlas: 'Fenyan_atlas' },
  LSshandian: { skeleton: 'LSshandian_skel', atlas: 'LSshandian_atlas' },
  Weilai: { skeleton: 'Weilai_skel', atlas: 'Weilai_atlas' },
  Duci: { skeleton: 'Duci_skel', atlas: 'Duci_atlas' },
  liuhuo: { skeleton: 'liuhuo_skel', atlas: 'liuhuo_atlas' },
  Dufa: { skeleton: 'Dufa_skel', atlas: 'Dufa_atlas' },
  Guangyou: { skeleton: 'Guangyou_skel', atlas: 'Guangyou_atlas' },
  Binghan: { skeleton: 'Binghan_skel', atlas: 'Binghan_atlas' },
  Haoling: { skeleton: 'Haoling_skel', atlas: 'Haoling_atlas' },
  MoliBaodong: { skeleton: 'MoliBaodong_skel', atlas: 'MoliBaodong_atlas' },
  zhaoyao: { skeleton: 'zhaoyao_skel', atlas: 'zhaoyao_atlas' },
  kuangyong: { skeleton: 'kuangyong_skel', atlas: 'kuangyong_atlas' },
  linglichongneng: { skeleton: 'linglichongneng_skel', atlas: 'linglichongneng_atlas' },
  shuiqiuyu: { skeleton: 'shuiqiuyu_skel', atlas: 'shuiqiuyu_atlas' },
  zhiliaopugong: { skeleton: 'zhiliaopugong_skel', atlas: 'zhiliaopugong_atlas' },
    zhiyuxiya: { skeleton: 'zhiyuxiya_skel', atlas: 'zhiyuxiya_atlas' },
  guwu: { skeleton: 'guwu_skel', atlas: 'guwu_atlas' },
  chanrao: { skeleton: 'chanrao_skel', atlas: 'chanrao_atlas' },
  heimizhuaji: { skeleton: 'heimizhuaji_skel', atlas: 'heimizhuaji_atlas' },
  diancichang: { skeleton: 'diancichang_skel', atlas: 'diancichang_atlas' },
  cxbiyou: { skeleton: 'cxbiyou_skel', atlas: 'cxbiyou_atlas' },
  zhihuan: { skeleton: 'zhihuan_skel', atlas: 'zhihuan_atlas' },
  jypg: { skeleton: 'jypg_skel', atlas: 'jypg_atlas' },
  fennu: { skeleton: 'fennu_skel', atlas: 'fennu_atlas' },
  buou1T: { skeleton: 'buou1T_skel', atlas: 'buou1T_atlas' }, // 🎭 诅咒布偶动作特效（heiqiu/heianhuan）
};

// 对象池
const effectPool = {
  fennu:[],
  jypg:[],
  zhihuan:[],
  cxbiyou:[],
  diancichang:[],
  heimizhuaji:[],
  chanrao:[],
  guwu:[],
  zhiyuxiya:[],
  zhiliaopugong:[],
  shuiqiuyu:[],
  linglichongneng:[],
  kuangyong:[],
  zhaoyao:[],
  cxhuoqiu:[],
  MoliBaodong: [],
  Haoling: [],
  Binghan: [],
  Guangyou: [],
  Dufa: [],
  liuhuo: [],
  bullet: [],
  laser: [],
  juling: [],
  shuituanzi: [],
  leituanzi: [],
  bingjingling: [],
  huojingling: [],
  fenshen: [],
  dongcha: [],
  zhangqi: [],
  wuqiqianghua: [],
  fantan: [],
  duwu: [],
  zhuaji: [],
  zhuaji2: [],
  shuipao: [],
  bingjian: [],
  dongjie: [],
  huoqiu: [],
  baozha: [],
  dianji: [],
  leiji: [], // ⚡ 雷击（雷鸟女皇普攻三段特效）
  LongjuanFengbao: [],
  FengZhiBiyou: [],
  Fengren1: [],
  Shuilao: [],
  Shuiyu: [],
  Fengren: [],
  JinjiKuanglei: [],
  Fenyan: [],
  LSshandian: [],
  Weilai: [],
  Duci: [],
  buou1T: [] // 🎭 诅咒布偶动作特效池
};

/**
 * 从对象池获取特效（优先复用，没有再创建）
 * @param {string} type 特效类型
 */
export function getEffect(type) {
  let effect = effectPool[type].pop();
  if (!effect) {
    effect = new Spine({
      skeleton: EFFECT_CONFIG[type].skeleton,
      atlas: EFFECT_CONFIG[type].atlas,
      allowMissingRegions: true,
    });
  }
  // 重置状态，不碰动画轨道（调用者会 setAnimation 覆盖）
  effect.scale.set(1);
  effect.rotation = 0;
  effect.alpha = 1;
  effect.visible = true;
  effect.renderable = true;
  effect._completeListeners = [];
  effect._hasCompleteListener = false;
  if (effect._hitTimer) { clearTimeout(effect._hitTimer); effect._hitTimer = null; }
  return effect;
}

/**
 * 归还特效到对象池（动画结束后调用）
 * @param {string} type 特效类型
 * @param {Spine} effect 特效实例
 */
export function returnEffect(type, effect) {
  if (!effect) return;
  try {
    if (effect.parent) {
      effect.parent.removeChild(effect);
    }
    if (!effect.state || !effect.skeleton) return;
    // 清除 state 上所有旧监听器，彻底杜绝复用后 complete 事件紊乱
    const listeners = effect.state.listeners;
    if (listeners) {
      for (let i = listeners.length - 1; i >= 0; i--) {
        try { effect.state.removeListener(listeners[i]); } catch (e) { /* ignore */ }
      }
    }
    effect._hasCompleteListener = false;
    effect._completeListeners = [];
    effectPool[type].push(effect);
  } catch (e) {
    // 静默失败，不回池
  }
}

/**
 * 预创建特效实例，预热对象池
 * @param {Object} options - 预热配置
 */
export function prewarmEffectPool(options = {}) {
  const config = {
    bulletCount: 8,
    laserCount: 2,
    julingCount: 1,
    dongchaCount: 1,
    fenshenCount: 2,
    ...options,
  };

  const typeMap = {
    bullet: config.bulletCount,
    laser: config.laserCount,
    juling: config.julingCount,
    dongcha: config.dongchaCount,
    fenshen: config.fenshenCount,
  };

  for (const [type, count] of Object.entries(typeMap)) {
    const currentCount = effectPool[type].length;
    const needCreate = Math.max(0, count - currentCount);
    if (needCreate > 0) {
      for (let i = 0; i < needCreate; i++) {
        try {
          const effect = new Spine({
            skeleton: EFFECT_CONFIG[type].skeleton,
            atlas: EFFECT_CONFIG[type].atlas,
            allowMissingRegions: true,
          });
          effect._completeListeners = [];
          effect._hasCompleteListener = false;
          effectPool[type].push(effect);
        } catch (e) {
          console.warn(`[对象池预热] ${type} 创建失败，跳过:`, e.message);
        }
      }
    }
  }
  battleLog('[对象池预热] 完成');
}
