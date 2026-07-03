/**
 * 对话系统核心逻辑
 * 
 * 功能：
 * - 管理对话状态（使用 Pinia 持久化）
 * - 处理对话跳转
 * - 记录对话历史和选择
 * - 支持条件判断
 * - 支持事件回调
 * - 存档兼容
 * - 按需加载对话模块
 * - 国际化（i18n）支持
 */

import { ref, computed } from 'vue';
import { useCounterStore } from "@/store/counter";
import emitter from "@/bus"; // 引入传值组件
// 导入 i18n
import { t, initLanguage, setLanguage, getCurrentLang, isZh, addTranslations } from './i18n/index.js';

// 预加载所有对话模块（Vite 特性，支持子目录）
const dialogueModules = import.meta.glob('./data/**/*.js', { eager: false });

// 所有对话数据集合（已加载的）
const allDialogues = {};

// 已加载的对话模块缓存
const loadedModules = {};

// 获取 store
const getStore = () => useCounterStore();

// 运行时状态（不存档）
const currentDialogueId = ref(null);
const isDialogueActive = ref(false);
const dialogueHistory = ref([]); // 本次对话的历史

// CG 相关状态
const currentCgName = ref(null); // 当前显示的 CG 名称
const currentCgAnimation = ref(null); // 当前播放的 CG 动画名称
const isCgVisible = ref(false); // CG 是否可见

// 缓存：当前对话的计算结果（避免每次渲染都重新计算）
const cachedDialogueText = ref('');
const cachedVisibleOptions = ref([]);

/**
 * 获取当前对话节点
 */
const currentDialogue = computed(() => {
  if (!currentDialogueId.value) return null;
  return allDialogues[currentDialogueId.value] || null;
});

/**
 * 重新计算缓存（对话节点变化时调用）
 */
function recalculateCache() {
  const dialogue = currentDialogue.value;
  if (!dialogue) {
    cachedDialogueText.value = '';
    cachedVisibleOptions.value = [];
    return;
  }

  // 计算文本
  if (typeof dialogue.text === 'function') {
    cachedDialogueText.value = dialogue.text();
  } else if (typeof dialogue.text === 'string' && dialogue.text.startsWith('i18n:')) {
    // i18n key 格式：i18n:npc_jingling.greeting_stranger
    const key = dialogue.text.slice(5);
    cachedDialogueText.value = t(key);
  } else {
    cachedDialogueText.value = dialogue.text || '';
  }

  // 计算可见选项
  if (dialogue.options && Array.isArray(dialogue.options)) {
    cachedVisibleOptions.value = dialogue.options
      .map((option, index) => ({ ...option, originalIndex: index })) // 保留原始索引
      .filter(option => {
        if (option.condition && typeof option.condition === 'function') {
          return option.condition();
        }
        return true;
      })
      .map(option => {
        // 处理选项文本的 i18n
        let text = option.text;
        if (typeof text === 'string' && text.startsWith('i18n:')) {
          const key = text.slice(5);
          text = t(key);
        }
        return { ...option, text };
      });
  } else {
    cachedVisibleOptions.value = [];
  }
}

/**
 * 加载对话模块（按需加载）
 * @param {string} modulePath - 模块路径，如 'npc/jingling' 或 'intro'
 * @returns {Promise<boolean>} 是否加载成功
 */
async function loadDialogueModule(modulePath) {
  // 已经加载过了
  if (loadedModules[modulePath]) {
    return true;
  }

  try {
    // 构建完整路径（与 import.meta.glob 匹配的路径）
    const fullPath = `./data/${modulePath}.js`;

    // 从预加载的模块中获取
    const moduleLoader = dialogueModules[fullPath];

    if (!moduleLoader) {
      console.error(`[对话系统] 找不到对话模块文件: ${modulePath}`);
      console.log('[对话系统] 可用的模块:', Object.keys(dialogueModules));
      return false;
    }

    // 动态加载模块
    const module = await moduleLoader();
    const moduleData = module.default || module;

    // 处理翻译（同文件写法）
    if (moduleData.translations && typeof moduleData.translations === 'object') {
      // 注册每种语言的翻译
      for (const [lang, translations] of Object.entries(moduleData.translations)) {
        addTranslations(lang, translations);
      }
      console.log(`[对话系统] 已注册 ${modulePath} 的翻译`);
    }

    // 提取对话数据（排除 translations）
    const dialogues = {};
    for (const [key, value] of Object.entries(moduleData)) {
      if (key !== 'translations') {
        dialogues[key] = value;
      }
    }

    // 合并到 allDialogues
    Object.assign(allDialogues, dialogues);

    // 标记已加载
    loadedModules[modulePath] = true;

    console.log(`[对话系统] 已加载对话模块: ${modulePath}`);
    return true;
  } catch (e) {
    console.error(`[对话系统] 加载对话模块失败: ${modulePath}`, e);
    return false;
  }
}

/**
 * 批量加载对话模块
 * @param {string[]} modulePaths - 模块路径数组
 */
async function loadDialogueModules(modulePaths) {
  const promises = modulePaths.map(path => loadDialogueModule(path));
  const results = await Promise.all(promises);
  return results.every(r => r);
}

/**
 * 开始对话
 * @param {string} dialogueId - 对话起始节点ID
 * @param {string} [modulePath] - 对话模块路径（如果未加载，会自动加载）
 */
async function startDialogue(dialogueId, modulePath = null) {
  // 如果指定了模块路径，先加载
  if (modulePath && !loadedModules[modulePath]) {
    const success = await loadDialogueModule(modulePath);
    if (!success) {
      console.error(`[对话系统] 无法加载对话模块: ${modulePath}`);
      return false;
    }
  }

  const dialogue = allDialogues[dialogueId];
  if (!dialogue) {
    console.error(`[对话系统] 找不到对话节点: ${dialogueId}`);
    return false;
  }

  // 初始化 i18n（首次调用时初始化）
  initLanguage();

  // 重置运行时状态
  currentDialogueId.value = dialogueId;
  isDialogueActive.value = true;
  dialogueHistory.value = [];

  // 触发 onEnter 回调
  if (dialogue.onEnter && typeof dialogue.onEnter === 'function') {
    dialogue.onEnter();
  }

  // 记录到历史
  dialogueHistory.value.push({
    id: dialogueId,
    timestamp: Date.now(),
  });

  // 重新计算缓存
  recalculateCache();

  console.log(`[对话系统] 开始对话: ${dialogueId}`);
  return true;
}

/**
 * 跳转到下一个对话节点
 * @param {string} nextId - 下一个对话节点ID
 */
function goToDialogue(nextId) {
  if (!nextId) return false;

  const nextDialogue = allDialogues[nextId];
  if (!nextDialogue) {
    console.error(`[对话系统] 找不到对话节点: ${nextId}`);
    return false;
  }

  // 检查显示条件
  if (nextDialogue.condition && typeof nextDialogue.condition === 'function') {
    if (!nextDialogue.condition()) {
      console.warn(`[对话系统] 对话节点条件不满足: ${nextId}`);
      return false;
    }
  }

  // 触发当前对话的 onExit 回调
  const current = currentDialogue.value;
  if (current?.onExit && typeof current.onExit === 'function') {
    current.onExit();
  }

  // 切换到下一个对话
  currentDialogueId.value = nextId;

  // 触发下一个对话的 onEnter 回调
  if (nextDialogue.onEnter && typeof nextDialogue.onEnter === 'function') {
    nextDialogue.onEnter();
  }

  // 处理 CG 相关字段
  if (nextDialogue.showCg) {
    showCg(nextDialogue.showCg, nextDialogue.cgAnimation || null);
  }
  if (nextDialogue.hideCg) {
    hideCg();
  }
  if (nextDialogue.cgAnimation && isCgVisible.value) {
    setCgAnimation(nextDialogue.cgAnimation);
  }

  // 记录历史
  dialogueHistory.value.push({
    id: nextId,
    timestamp: Date.now(),
  });

  // 重新计算缓存
  recalculateCache();

  // 检查是否结束
  if (nextDialogue.end) {
    endDialogue();
  }

  return true;
}

/**
 * 选择选项
 * @param {number} optionIndex - 选项索引（原始 options 中的索引）
 */
function chooseOption(optionIndex) {
  const store = getStore();
  const current = currentDialogue.value;
  if (!current?.options || !current.options[optionIndex]) {
    console.error('[对话系统] 无效的选项索引');
    return false;
  }

  const option = current.options[optionIndex];

  // 记录选择历史到 Pinia（持久化）
  store.recordDialogueChoice(current.id, optionIndex, option.text);

  console.log(`[对话系统] 选择选项: ${option.text}`);

  // 触发选项的 onSelect 回调
  if (option.onSelect && typeof option.onSelect === 'function') {
    option.onSelect();
  }

  // 处理好感度变化
  if (option.affection && option.npc) {
    store.addNpcAffection(option.npc, option.affection);
  }

  // 跳转到下一个对话
  if (option.next) {
    return goToDialogue(option.next);
  }

  return true;
}

/**
 * 结束对话
 */
function endDialogue() {
  const store = getStore();
  const current = currentDialogue.value;

  // 触发当前对话的 onExit 回调
  if (current?.onExit && typeof current.onExit === 'function') {
    current.onExit();
  }

  // 标记对话完成（持久化）
  if (dialogueHistory.value.length > 0) {
    store.markDialogueComplete(dialogueHistory.value[0].id);
  }

  isDialogueActive.value = false;
  currentDialogueId.value = null;

  // 对话结束自动隐藏 CG
  hideCg();

  // 自动关闭对话框
  store.hideDialogue();
  emitter.emit("enablePlayerControl", 1)
  console.log('[对话系统] 对话结束');
  console.log('[对话系统] 对话历史:', dialogueHistory.value);
}

// ========================
// CG 相关方法
// ========================

/**
 * 显示 CG
 * @param {string} cgName - CG 名称（对应资源名，如 'chuzuwu'）
 * @param {string} animationName - 动画名称（可选，默认播放第一个动画）
 */
function showCg(cgName, animationName = 'animation') {
  if (!cgName) return;
  
  currentCgName.value = cgName;
  currentCgAnimation.value = animationName;
  isCgVisible.value = true;
  
  console.log(`[对话系统] 显示 CG: ${cgName}, 动画: ${animationName || '默认第一个'}`);
}

/**
 * 隐藏 CG
 */
function hideCg() {
  isCgVisible.value = false;
  currentCgName.value = null;
  currentCgAnimation.value = null;
  
  console.log('[对话系统] 隐藏 CG');
}

/**
 * 切换 CG 动画
 * @param {string} animationName - 动画名称
 */
function setCgAnimation(animationName) {
  if (!animationName) return;
  
  currentCgAnimation.value = animationName;
  
  console.log(`[对话系统] 切换 CG 动画: ${animationName}`);
}

/**
 * 获取对话文本（从缓存读取，避免重复计算）
 */
function getDialogueText(dialogue) {
  // 如果传入了 dialogue，说明是外部调用，直接计算
  if (dialogue) {
    if (typeof dialogue.text === 'function') {
      return dialogue.text();
    }
    if (typeof dialogue.text === 'string' && dialogue.text.startsWith('i18n:')) {
      const key = dialogue.text.slice(5);
      return t(key);
    }
    return dialogue.text || '';
  }
  // 否则返回缓存
  return cachedDialogueText.value;
}

/**
 * 获取可见的选项（从缓存读取，避免重复计算）
 */
function getVisibleOptions(dialogue) {
  // 如果传入了 dialogue，说明是外部调用，直接计算
  if (dialogue) {
    if (!dialogue?.options) return [];
    return dialogue.options
      .map((option, index) => ({ ...option, originalIndex: index })) // 保留原始索引
      .filter(option => {
        if (option.condition && typeof option.condition === 'function') {
          return option.condition();
        }
        return true;
      })
      .map(option => {
        let text = option.text;
        if (typeof text === 'string' && text.startsWith('i18n:')) {
          const key = text.slice(5);
          text = t(key);
        }
        return { ...option, text };
      });
  }
  // 否则返回缓存
  return cachedVisibleOptions.value;
}

/**
 * 设置对话标记（持久化到 Pinia）
 */
function setDialogueFlag(key, value = true) {
  const store = getStore();
  store.setDialogueFlag(key, value);
}

/**
 * 获取对话标记（从 Pinia 读取）
 */
function getDialogueFlag(key) {
  const store = getStore();
  return store.getDialogueFlag(key);
}

/**
 * 获取对话存档数据（用于保存）
 */
function getDialogueSaveData() {
  const store = getStore();
  return store.getDialogueSaveData();
}

/**
 * 加载对话存档数据
 */
function loadDialogueSaveData(saveData) {
  const store = getStore();
  store.loadDialogueSaveData(saveData);
}

/**
 * 手动刷新缓存（当语言切换、外部因素导致状态变化时调用）
 */
function refreshDialogueCache() {
  recalculateCache();
}

/**
 * 切换语言
 * @param {string} lang - 语言代码（zh-CN / en-US）
 */
async function changeLanguage(lang) {
  const success = await setLanguage(lang);
  if (success) {
    // 语言切换后，刷新对话缓存
    refreshDialogueCache();
  }
  return success;
}

// 导出
export {
  // 运行时状态
  currentDialogueId,
  isDialogueActive,
  currentDialogue,
  dialogueHistory,

  // CG 相关状态
  currentCgName,
  currentCgAnimation,
  isCgVisible,

  // 方法
  startDialogue,
  goToDialogue,
  chooseOption,
  endDialogue,
  getDialogueText,
  getVisibleOptions,
  setDialogueFlag,
  getDialogueFlag,
  getDialogueSaveData,
  loadDialogueSaveData,
  refreshDialogueCache,
  loadDialogueModule,
  loadDialogueModules,

  // CG 相关方法
  showCg,
  hideCg,
  setCgAnimation,

  // i18n
  t,
  changeLanguage,
  getCurrentLang,
  isZh,

  // 数据
  allDialogues,
  loadedModules,
};

export default {
  currentDialogueId,
  isDialogueActive,
  currentDialogue,
  startDialogue,
  goToDialogue,
  chooseOption,
  endDialogue,
  getDialogueText,
  getVisibleOptions,
  setDialogueFlag,
  getDialogueFlag,
  getDialogueSaveData,
  loadDialogueSaveData,
  refreshDialogueCache,
  loadDialogueModule,
  loadDialogueModules,
  t,
  changeLanguage,
  getCurrentLang,
  isZh,
};
