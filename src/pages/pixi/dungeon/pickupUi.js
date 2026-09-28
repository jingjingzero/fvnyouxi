// 🎒 地牢拾取 / 奖励提示模块（拆自 dungeon.vue，行为零变化）
// 依赖通过 initPickupUi 注入（getter 实时读取主文件变量，状态仍由主文件持有）
import { ElMessage } from 'element-plus';
import { h } from 'vue';
import { ITEM_SKIN_MAP, itemImgUrl } from './config.js';
import { createDaojuSpine } from '../fight/CardSpine.js';
import { t, tr } from "@/i18n";

let ctx = null;
export function initPickupUi(deps) { ctx = deps; }
function fmt(key, vars) { let s = t(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }

// 🎲 生成单个 daojuall 皮肤图（缓存到 dungeonDaojuImgMap + window），返回 dataURL
export async function ensureDaojuSkinOnce(skin) {
  if (ctx.dungeonDaojuImgMap.value[skin]) return ctx.dungeonDaojuImgMap.value[skin];
  const pre = (typeof window !== 'undefined' && window.__daojuImgMap) || {};
  if (pre[skin]) return pre[skin];
  try {
    const result = await createDaojuSpine(skin, 80, 80);
    if (result?.canvas) {
      const url = result.canvas.toDataURL();
      ctx._dungeonDaojuCache[skin] = url;
      ctx.dungeonDaojuImgMap.value = { ...ctx.dungeonDaojuImgMap.value, [skin]: url };
      if (window.__daojuImgMap) window.__daojuImgMap[skin] = url;
      result.destroy?.();
      return url;
    }
  } catch (e) { console.warn('[地牢拾取] spine 加载失败:', skin, e); }
  return '';
}

// 🖼️ 统一道具图标解析：URL 直接用；daojuall 皮肤名（显式 img 或 ITEM_SKIN_MAP 映射）→ dataURL；
//   未命中缓存时异步生成并返回空（下次渲染补上）；其余回退静态 itemImgUrl
export function resolveItemIcon(name, img) {
  if (img && (/^https?:\/\//.test(img) || img.startsWith('/') || img.startsWith('data:'))) return img;
  const skin = (img && !/^https?:\/\//.test(img) && !img.startsWith('/') && !img.startsWith('data:'))
    ? img
    : ITEM_SKIN_MAP[name];
  if (skin) {
    const u = ctx.dungeonDaojuImgMap.value[skin] || (typeof window !== 'undefined' && window.__daojuImgMap?.[skin]) || '';
    if (u) return u;
    ensureDaojuSkinOnce(skin); // 🔄 异步生成皮肤图，下次渲染自动补上
    return '';
  }
  return itemImgUrl(name, img);
}

// 🖼️ 统一道具图片解析：daojuall spine 皮肤名 → dataURL；URL → 直接用；否则静态图
export function resolveItemImg(name, img) {
  if (!img) return resolveItemIcon(name);
  if (/^https?:\/\//.test(img) || img.startsWith('/') || img.startsWith('data:')) return img;
  // 🎲 daojuall spine 皮肤名 → dataURL（未命中返回空，调用方显示 🎁 占位，避免错图）
  const u = ctx.dungeonDaojuImgMap.value[img] || (typeof window !== 'undefined' && window.__daojuImgMap?.[img]) || '';
  if (u) return u;
  // 显式皮肤未命中 → 回退物品名映射的皮肤（如魔晶LV1 → redCrystalT1）
  const skin2 = ITEM_SKIN_MAP[name];
  if (skin2 && skin2 !== img) {
    const u2 = ctx.dungeonDaojuImgMap.value[skin2] || (typeof window !== 'undefined' && window.__daojuImgMap?.[skin2]) || '';
    if (u2) return u2;
    ensureDaojuSkinOnce(skin2);
    return '';
  }
  ensureDaojuSkinOnce(img);
  return '';
}

export function showPickupTip(name, num, img) {
  // 🎲 图片解析：皮肤名（如 chimei）→ daojuall spine dataURL；URL → 直接用；否则静态图
  const isUrl = img && (/^https?:\/\//.test(img) || img.startsWith('/') || img.startsWith('data:'));
  let url = '';
  if (img && !isUrl) {
    url = ctx.dungeonDaojuImgMap.value[img] || (typeof window !== 'undefined' && window.__daojuImgMap?.[img]) || '';
    if (!url) url = resolveItemIcon(name, img);
  } else if (isUrl) {
    url = img;
  } else {
    url = resolveItemIcon(name, img);
  }
  const render = (u) => {
    ElMessage({
      message: h('div', { class: 'dungeon-pickup-inner', style: 'color:black;font-size:2vh;' }, [
        u ? h('img', { src: u, alt: '', style: 'width:4vh;height:4vh;object-fit:contain;margin-right:6px;vertical-align:middle;' }) : null,
        h('span', { style: 'color:' + (ctx.user.getItemColor ? (ctx.user.getItemColor(name) || '#000000') : '#000000') + ';font-weight:bold;text-shadow:0 1px 2px rgba(255,255,255,0.55);' }, fmt('pickupGainFmt', { name: tr(name), num })),
      ]),
      duration: 2200,
      showClose: false,
      grouping: true,
      customClass: 'dungeon-pickup-single',
    });
  };
  // 🎲 spine 皮肤图尚未就绪 → 异步生成后补一次（保证弹窗图标正确）
  if (img && !isUrl && !url) {
    ensureDaojuSkinOnce(img).then(u => render(u || ''));
    return;
  }
  render(url);
}

// 💍 地牢获得物品弹窗（来自对话模块 emit，如幸运戒指；skin 皮肤未生成会自动 ensure 后补图）
export function onDungeonItemGain(payload) {
  if (!payload || !payload.name) return;
  showPickupTip(payload.name, payload.num || 1, payload.img);
}

// 📋 开箱奖励汇总弹窗：一条消息列出所有获得（道具 + 配方图纸）
export function showChestRewardTip(gains) {
  if (!gains || !gains.length) return;
  // 🎲 皮肤名图未就绪 → 异步生成入缓存（避免弹窗显示错图；本次未命中显示 🎁 占位）
  for (const g of gains) {
    if (g.img && !/^https?:\/\//.test(g.img) && !g.img.startsWith('/') && !g.img.startsWith('data:') && !resolveItemImg(g.name, g.img)) {
      ensureDaojuSkinOnce(g.img);
    }
  }
  ElMessage({
    message: h('div', {
      style: 'display:flex;flex-direction:column;align-items:stretch;color:black;font-size:2vh;min-width:32vh;',
    }, [
      // 标题 + 分隔线
      h('div', { style: 'display:flex;align-items:center;gap:8px;font-weight:bold;font-size:2.3vh;color:#b45309;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:6px;' }, t('chestRewardTitle')),
      // 三列网格：每行 3 个物品卡片
      h('div', { style: 'display:flex;flex-wrap:wrap;' },
        gains.map(g => {
          const url = resolveItemImg(g.name, g.img);
          return h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:4px;width:33.33%;box-sizing:border-box;padding:6px 4px;' }, [
            h('div', { style: 'width:5vh;height:5vh;flex-shrink:0;border-radius:8px;background:#f5f7fa;border:1px solid #e4e7ed;display:flex;align-items:center;justify-content:center;overflow:hidden;' },
              url ? h('img', { src: url, alt: '', style: 'width:100%;height:100%;object-fit:contain;' }) : h('span', { style: 'font-size:2.6vh;' }, '🎁')),
            h('div', { style: 'font-size:1.7vh;color:#1f2937;font-weight:600;text-align:center;line-height:1.3;word-break:break-all;width:100%;' }, tr(g.name)),
            h('div', { style: 'color:#e07b00;font-weight:800;font-size:1.9vh;' }, '×' + g.num),
          ]);
        })
      ),
    ]),
    // ⏱️ 显示时长：基础 1.5s，每多 3 个物品 +0.75s
    duration: 1500 + Math.floor((gains.length - 1) / 3) * 750,
    showClose: false,
    grouping: true,
    customClass: 'dungeon-pickup-message',
  });
}
