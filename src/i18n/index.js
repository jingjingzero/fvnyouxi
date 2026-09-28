// 🌐 全局 i18n 主模块
// - t(key)：UI 词条（zh/en 字典，找不到回退中文/原文）
// - tr(text)：数据文本翻译（卡牌/天赋/物品/怪物/任务/成就等显示字符串，data.js 里 原文→英文）
// - getLang() / setLang()：语言读写（localStorage 持久化 + 同步 store.pixi.language + 事件通知）
// 词条文件：ui-core.js（已加载）、ui-player.js / ui-fight.js / data.js / dialogue.js（分片按需添加后在此汇总）
import uiCore from './ui-core.js';

const langPacks = { uiCore };

// 各分片词条注册（文件存在后在此 import 汇总；新增词条文件在下方加一行）
import uiPlayer from './ui-player.js';
import uiFight from './ui-fight.js';
import dataPack from './data.js';
import dialoguePack from './dialogue.js';
langPacks.uiPlayer = uiPlayer;
langPacks.uiFight = uiFight;
langPacks.dataPack = dataPack;
langPacks.dialoguePack = dialoguePack;

import { useCounterStore } from "@/store/counter";

const STORAGE_KEY = 'fvnyouxi_lang';
let current = 'zh';
try { current = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh'; } catch (e) { /* ignore */ }

function mergeDict(lang) {
  let out = {};
  for (const pack of Object.values(langPacks)) {
    if (pack && pack[lang]) Object.assign(out, pack[lang]);
  }
  return out;
}
const zhDict = mergeDict('zh');
const enDict = mergeDict('en');

/** UI 词条：key → 当前语言文案（en 缺词回退中文） */
export function t(key) {
  const d = current === 'en' ? enDict : zhDict;
  return (d && d[key]) ?? (zhDict[key] ?? key);
}

/** 数据文本翻译：中文原文 → 英文（en 模式查 data 映射，查不到回退原文；zh 模式直接返回原文） */
export function tr(text) {
  if (!text) return text;
  if (current !== 'en') return text;
  if (typeof text !== 'string') return text;
  const map = dataPack.en || {};
  return map[text] ?? text;
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  const next = lang === 'en' ? 'en' : 'zh';
  current = next;
  try { localStorage.setItem(STORAGE_KEY, current); } catch (e) { /* ignore */ }
  // 同步 store：对话系统等读 store.pixi.language（'zh-CN' / 'en-US'）
  try {
    const store = useCounterStore();
    if (store.pixi) store.pixi.language = current === 'en' ? 'en-US' : 'zh-CN';
  } catch (e) { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('fvnyouxi-lang-changed')); } catch (e) { /* ignore */ }
}

/** 语言切换后触发组件重新渲染的便捷 ref 计数（在组件里 watch/依赖此值） */
export function langTickRef() {
  return { value: 0 };
}
