/**
 * 对话系统国际化管理
 * 
 * 功能：
 * - 切换语言
 * - 翻译文本
 * - 语言包按需加载
 */

import { ref, computed } from 'vue';
import { useCounterStore } from "@/store/counter";

// 当前语言
const currentLang = ref('zh-CN');

// 已加载的语言包
const loadedLangs = {};

// 默认语言包（同步加载，避免首屏闪烁）
import zhCN from './zh-CN.js';
loadedLangs['zh-CN'] = zhCN;

// 获取 store
const getStore = () => useCounterStore();

/**
 * 初始化语言（从 store 读取）
 */
function initLanguage() {
  const store = getStore();
  const savedLang = store.pixi?.language || 'zh-CN';
  currentLang.value = savedLang;
  console.log(`[i18n] 当前语言: ${savedLang}`);
}

/**
 * 切换语言
 * @param {string} lang - 语言代码（zh-CN / en-US）
 */
async function setLanguage(lang) {
  if (!lang) return false;
  
  // 如果已经加载了，直接切换
  if (loadedLangs[lang]) {
    currentLang.value = lang;
    // 保存到 store
    const store = getStore();
    if (store.pixi) {
      store.pixi.language = lang;
    }
    console.log(`[i18n] 切换语言: ${lang}`);
    return true;
  }
  
  // 动态加载语言包
  try {
    const langModule = await import(`./${lang}.js`);
    loadedLangs[lang] = langModule.default || langModule;
    currentLang.value = lang;
    
    // 保存到 store
    const store = getStore();
    if (store.pixi) {
      store.pixi.language = lang;
    }
    
    console.log(`[i18n] 加载并切换语言: ${lang}`);
    return true;
  } catch (e) {
    console.error(`[i18n] 加载语言包失败: ${lang}`, e);
    return false;
  }
}

/**
 * 翻译文本
 * @param {string} key - 翻译 key，如 'npc_jingling.greeting_stranger'
 * @param {Object} params - 插值参数（可选）
 * @returns {string} 翻译后的文本
 */
function t(key, params = {}) {
  if (!key) return '';
  
  const langData = loadedLangs[currentLang.value];
  const fallbackData = loadedLangs['zh-CN']; // 中文作为 fallback
  
  if (!langData && !fallbackData) {
    console.warn(`[i18n] 没有可用的语言包`);
    return key;
  }
  
  // 按点分割 key，逐层查找
  const keys = key.split('.');
  
  // 先在当前语言中查找
  let value = langData;
  for (const k of keys) {
    if (value == null || typeof value !== 'object') {
      value = null;
      break;
    }
    value = value[k];
  }
  
  // 如果当前语言没有翻译，fallback 到中文
  if (value == null || value === '' || typeof value !== 'string') {
    value = fallbackData;
    for (const k of keys) {
      if (value == null || typeof value !== 'object') {
        value = null;
        break;
      }
      value = value[k];
    }
  }
  
  if (value == null || typeof value !== 'string') {
    console.warn(`[i18n] 找不到翻译 key: ${key}`);
    return key;
  }
  
  // 处理插值（可选，以后需要再加）
  if (Object.keys(params).length > 0) {
    return value.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`);
  }
  
  return value;
}

/**
 * 获取当前语言
 */
const getCurrentLang = computed(() => currentLang.value);

/**
 * 检查是否是中文
 */
const isZh = computed(() => currentLang.value.startsWith('zh'));

/**
 * 动态添加翻译（用于对话模块同文件写法）
 * @param {string} lang - 语言代码（zh-CN / en-US）
 * @param {Object} translations - 翻译对象，会深度合并到现有语言包
 */
function addTranslations(lang, translations) {
  if (!lang || !translations || typeof translations !== 'object') {
    return false;
  }
  
  // 如果语言包不存在，初始化
  if (!loadedLangs[lang]) {
    loadedLangs[lang] = {};
  }
  
  // 深度合并翻译
  deepMerge(loadedLangs[lang], translations);
  
  console.log(`[i18n] 已添加 ${lang} 翻译`);
  return true;
}

/**
 * 深度合并对象（辅助函数）
 */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// 导出
export {
  currentLang,
  getCurrentLang,
  isZh,
  initLanguage,
  setLanguage,
  t,
  addTranslations,
};

export default {
  currentLang,
  getCurrentLang,
  isZh,
  initLanguage,
  setLanguage,
  t,
  addTranslations,
};
