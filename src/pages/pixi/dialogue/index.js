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
import { ElMessText } from "@/pages/zujian/utils.js";
// 导入 i18n
import { t, initLanguage, setLanguage, getCurrentLang, isZh, addTranslations } from './i18n/index.js';
const user = useCounterStore();


/**
 * 播放点击音效
 */
function playClickSound() {
  user.playClickSound()
}

/**
 * 播放背景音乐（循环）
 * @param {string} bgmName - 音乐文件名（不含路径，如 'jiemian'），传null/空字符串停止
 */
function playBgm(bgmName) {
   user.playBgm(bgmName)
}

/**
 * 停止背景音乐
 */
function stopBgm() {
  user.stopBgm()
}

// 预加载所有对话模块（Vite 特性，支持子目录）
const dialogueModules = import.meta.glob('./data/**/*.js', { eager: false });

// 所有对话数据集合（已加载的）
const allDialogues = {};

// 已加载的对话模块缓存
const loadedModules = {};

// 获取 store
const getStore = () => useCounterStore();

/**
 * 给对话 key 名 +1
 * 例如：one01 → one02, one99 → one100, ch01_01 → ch01_02
 * @param {string} key - 原始 key 名
 * @returns {string|null} - +1 后的 key 名，失败返回 null
 */
function incrementKey(key) {
  if (typeof key !== 'string') return null;

  // 匹配末尾的数字
  const match = key.match(/(\d+)$/);
  if (!match) return null;

  const numStr = match[1];
  const prefix = key.slice(0, -numStr.length);
  const num = parseInt(numStr, 10);

  // +1 后保持相同的位数（如果有的话）
  const nextNum = num + 1;
  const nextNumStr = String(nextNum).padStart(numStr.length, '0');

  return prefix + nextNumStr;
}

/**
 * 自然排序比较函数（用于排序 key 名，如 one01, one02, ..., one10）
 */
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// 运行时状态（不存档）
const currentDialogueId = ref(null);
const isDialogueActive = ref(false);
const dialogueHistory = ref([]); // 本次对话的历史

// CG 相关状态
const currentCgName = ref(null); // 当前显示的 CG 名称
const currentCgAnimation = ref(null); // 当前播放的 CG 动画名称
const currentCgLoop = ref(false); // CG 动画是否循环播放（默认 false 不循环）
const isCgVisible = ref(false); // CG 是否可见
const currentCgSkin = ref(null); // CG 使用的 Spine 皮肤名称（null=默认皮肤）
// CG 显示时是否仍显示头像框（默认 false=隐藏头像，true=CG 期间头像也显示）
const currentCgShowAvatar = ref(false);

// 头像动画相关状态
const currentNpcAvatarAnimation = ref(null); // 当前 NPC 头像播放的动画名称
const currentPlayerAvatarAnimation = ref(null); // 当前玩家头像播放的动画名称
const currentAvatarFx = ref(null); // 🎬 当前头像框表现动画（avatarFx：抖动/放大缩小等情绪表现）
const currentPlayerAvatar = ref(true); // 统一玩家头像控制：false=隐藏，true=显示当前，string=显示并切换到该角色

// 头像皮肤（Spine skin）相关状态 —— 通过切换 Spine 皮肤来实现表情切换
const currentPlayerSkin = ref(null); // 当前玩家头像使用的皮肤名称（null=默认皮肤）
// npcSkin 支持两种格式：
//   - 字符串："smile" → 应用于当前说话的 NPC
//   - 对象：{ huli: "smile", jinmao: null } → 按 NPC 名称分别指定（null=恢复默认）
const currentNpcSkin = ref(null);

// 缓存：当前对话的计算结果（避免每次渲染都重新计算）
const cachedDialogueText = ref('');
const cachedVisibleOptions = ref([]);

// 已选选项记录：key = 对话节点id, value = Set<选项索引>
const chosenOptionsMap = new Map();

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
      const store = getStore();
    const dialogueId = dialogue.id || currentDialogueId.value;
    // 合并内存临时记录 + 持久化记录，确保重新开对话也能记住已选选项
    const chosenSet = new Set(chosenOptionsMap.get(dialogueId) || []);
    store.pixi.choiceHistory?.forEach(c => {
      if (c.dialogueId === dialogueId) chosenSet.add(c.optionIndex);
    });

    cachedVisibleOptions.value = dialogue.options
      .map((option, index) => {
        // 计算 disabled 状态
        let disabled = chosenSet.has(index) && !option.repeatable; // 已选且不可重复则变灰禁用

        // 🎒 物品检查：有 needItem（背包检测）且不是软检查模式时，物品不足则禁用
        if (option.needItem && !option.softItemCheck) {
          const store = getStore();
          if (!store.hasInventoryItem?.(option.needItem, option.needItemNum ?? 1)) {
            disabled = true;
          }
        }

        // 💗 好感度检查：needAffection（{npc, min} 或数组）未达标且不是软检查模式时禁用
        if (option.needAffection && !option.softAffectionCheck) {
          const store = getStore();
          if (!store.hasNpcAffection?.(option.needAffection)) {
            disabled = true;
          }
        }

        return {
          ...option,
          originalIndex: index,
          disabled,
        };
      })
      .filter((option, index) => {
        // 1. 条件判断：有condition函数且返回false，隐藏
        if (option.condition && typeof option.condition === 'function') {
          if (!option.condition()) return false;
        }
        // 2. 已选择且配置了 hideOnChosen：选择后消失
        if (chosenSet.has(index) && option.hideOnChosen && !option.repeatable) {
          return false;
        }
        return true;
      })
      .map(option => {
        // 处理选项文本的 i18n
        let text = option.text;
        if (typeof text === 'function') {
          text = text();
        }
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
 * 获取所有 i18n 前缀（支持字符串和对象两种配置）
 * @param {string|object} prefixConfig - i18nPrefix 配置
 * @returns {string[]} 前缀列表
 */
function getAllPrefixes(prefixConfig) {
  if (!prefixConfig) return [];
  if (typeof prefixConfig === 'string') return [prefixConfig];
  if (typeof prefixConfig === 'object') {
    return Object.values(prefixConfig).filter((v, i, arr) => arr.indexOf(v) === i);
  }
  return [];
}

/**
 * 根据节点 key 解析对应的 i18n 前缀
 * @param {string} nodeKey - 对话节点 key
 * @param {string|object} prefixConfig - i18nPrefix 配置
 * @returns {string|null} 对应的前缀
 */
function resolvePrefixByKey(nodeKey, prefixConfig) {
  if (!prefixConfig) return null;
  if (typeof prefixConfig === 'string') return prefixConfig;
  if (typeof prefixConfig === 'object') {
    const defaultPrefix = prefixConfig.default || null;
    // 按前缀长度从长到短排序，最长匹配优先
    const prefixKeys = Object.keys(prefixConfig)
      .filter(k => k !== 'default')
      .sort((a, b) => b.length - a.length);
    for (const prefixKey of prefixKeys) {
      if (nodeKey.startsWith(prefixKey)) {
        return prefixConfig[prefixKey];
      }
    }
    return defaultPrefix;
  }
  return null;
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
      // console.log('[对话系统] 可用的模块:', Object.keys(dialogueModules));
      return false;
    }

    // 动态加载模块
    const module = await moduleLoader();
    const moduleData = module.default || module;

    // 处理翻译（同文件写法）
    if (moduleData.translations && typeof moduleData.translations === 'object') {
      // 提取每个对话节点的 speaker / 皮肤信息（从第一种语言中提取）
      const nodeSpeakers = {};
      const nodeSkins = {}; // 🎨 记录翻译条目中携带的 playerSkin / npcSkin / onStage

      // 遍历每种语言，处理对象格式的翻译
      for (const [lang, translations] of Object.entries(moduleData.translations)) {
        for (const [prefix, prefixData] of Object.entries(translations)) {
          if (typeof prefixData === 'object') {
            for (const [key, value] of Object.entries(prefixData)) {
              // 如果 value 是对象，说明包含 text 和 speaker 等信息
              if (typeof value === 'object' && value !== null && value.text !== undefined) {
                // 提取 speaker 信息（只从第一种语言提取一次）
                if (lang === Object.keys(moduleData.translations)[0]) {
                  if (value.speaker !== undefined) {
                    nodeSpeakers[`${prefix}.${key}`] = value.speaker;
                  }
                  // 🎨 提取皮肤配置（playerSkin / npcSkin / onStage），
                  //    允许直接在翻译条目里写皮肤，无需另建对话节点
                  const skins = {};
                  if (value.playerSkin !== undefined) skins.playerSkin = value.playerSkin;
                  if (value.npcSkin !== undefined) skins.npcSkin = value.npcSkin;
                  if (value.onStage !== undefined) skins.onStage = value.onStage;
                  if (value.avatarFx !== undefined) skins.avatarFx = value.avatarFx; // 🎬 头像框表现动画
                  if (Object.keys(skins).length > 0) {
                    nodeSkins[`${prefix}.${key}`] = skins;
                  }
                }
                // 把 text 放回 translations（保持 i18n 系统兼容）
                prefixData[key] = value.text;
              }
            }
          }
        }
      }

      // 把提取的 speaker 信息存起来，后面应用到对话节点
      moduleData._nodeSpeakers = nodeSpeakers;
      // 🎨 把提取的皮肤配置存起来，后面应用到对话节点
      moduleData._nodeSkins = nodeSkins;

      // 注册每种语言的翻译
      for (const [lang, translations] of Object.entries(moduleData.translations)) {
        addTranslations(lang, translations);
      }
      // console.log(`[对话系统] 已注册 ${modulePath} 的翻译`);
    }

    // 提取对话数据（排除 translations、i18nPrefix、speakers）
    const dialogues = {};
    let i18nPrefix = moduleData.i18nPrefix || null;
    let speakers = moduleData.speakers || null; // 说话者别名映射

    for (const [key, value] of Object.entries(moduleData)) {
      if (key !== 'translations' && key !== 'i18nPrefix' && key !== 'speakers') {
        dialogues[key] = value;
      }
    }

    // 如果配置了 i18nPrefix，根据 translations 自动生成对话节点
    if (i18nPrefix && moduleData.translations) {
      const firstLang = Object.keys(moduleData.translations)[0];
      const allPrefixes = getAllPrefixes(i18nPrefix);
      let totalKeys = 0;

      for (const prefix of allPrefixes) {
        const prefixTranslations = moduleData.translations[firstLang]?.[prefix];
        if (prefixTranslations && typeof prefixTranslations === 'object') {
          const keys = Object.keys(prefixTranslations).sort(naturalCompare);

          // 自动生成不存在的对话节点
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (!dialogues[key]) {
              dialogues[key] = {};
            }

            // 最后一个节点：如果没有 next 且存在 end 节点，自动跳到 end
            if (i === keys.length - 1) {
              const dialogue = dialogues[key];
              if (dialogue.next === undefined && !isEndNode(dialogue.end) && dialogues['end']) {
                dialogue.next = 'end';
              }
            }
          }
          totalKeys += keys.length;
        }
      }

    }

    // 把从 translations 中提取的 speaker 信息应用到对话节点
    if (moduleData._nodeSpeakers && typeof moduleData._nodeSpeakers === 'object') {
      const allPrefixes = getAllPrefixes(i18nPrefix);
      for (const [fullKey, speaker] of Object.entries(moduleData._nodeSpeakers)) {
        // fullKey 格式：prefix.key（如 npc_jingling.one01）
        const parts = fullKey.split('.');
        const key = parts.pop(); // 最后一部分是节点 key
        const prefix = parts.join('.');

        // 所有配置的 prefix 都处理
        if (allPrefixes.includes(prefix)) {
          if (dialogues[key]) {
            // 如果对话节点没有设置 speaker，就用 translations 里的
            if (dialogues[key].speaker === undefined && dialogues[key].name === undefined) {
              dialogues[key].speaker = speaker;
            }
          }
        }
      }

    }

    // 🎨 把从 translations 中提取的皮肤配置应用到对话节点
    //    允许直接在翻译条目里写 playerSkin / npcSkin / onStage，
    //    节点已有显式配置时以节点为准（翻译只补缺）
    if (moduleData._nodeSkins && typeof moduleData._nodeSkins === 'object') {
      const allPrefixes = getAllPrefixes(i18nPrefix);
      for (const [fullKey, skins] of Object.entries(moduleData._nodeSkins)) {
        const parts = fullKey.split('.');
        const key = parts.pop(); // 最后一部分是节点 key
        const prefix = parts.join('.');

        if (allPrefixes.includes(prefix) && dialogues[key]) {
          const dialogue = dialogues[key];
          if (skins.playerSkin !== undefined && dialogue.playerSkin === undefined) {
            dialogue.playerSkin = skins.playerSkin;
          }
          if (skins.npcSkin !== undefined && dialogue.npcSkin === undefined) {
            dialogue.npcSkin = skins.npcSkin;
          }
          if (skins.onStage !== undefined && dialogue.onStage === undefined) {
            dialogue.onStage = skins.onStage;
          }
          if (skins.avatarFx !== undefined && dialogue.avatarFx === undefined) {
            dialogue.avatarFx = skins.avatarFx;
          }
        }
      }
    }

    // 如果配置了 i18nPrefix，自动给简写的 text 补全前缀
    if (i18nPrefix) {
      for (const key of Object.keys(dialogues)) {
        const dialogue = dialogues[key];
        const nodePrefix = resolvePrefixByKey(key, i18nPrefix);
        if (!nodePrefix) continue;

        // 处理对话主文本
        if (typeof dialogue.text === 'string' && !dialogue.text.startsWith('i18n:') && !dialogue.text.includes(':')) {
          dialogue.text = `i18n:${nodePrefix}.${dialogue.text}`;
        }
        // 处理选项文本（跟随当前节点的前缀）
        if (dialogue.options && Array.isArray(dialogue.options)) {
          for (const option of dialogue.options) {
            if (typeof option.text === 'string' && !option.text.startsWith('i18n:') && !option.text.includes(':')) {
              option.text = `i18n:${nodePrefix}.${option.text}`;
            }
          }
        }
      }
  
    }

    // 处理说话者别名（speaker → name）
    if (speakers && typeof speakers === 'object') {
      for (const key of Object.keys(dialogues)) {
        const dialogue = dialogues[key];
        // 如果设置了 speaker 字段，从别名映射中查找对应的名字
        if (dialogue.speaker !== undefined && dialogue.speaker !== null) {
          const speakerName = speakers[dialogue.speaker];
          if (speakerName !== undefined) {
            dialogue.name = speakerName;
          } else {
            // 没找到别名，直接用 speaker 的值作为 name
            dialogue.name = dialogue.speaker;
          }
          // 删除 speaker 字段，避免后续处理混淆
          delete dialogue.speaker;
        }
      }
   
    }

    // 自动补全 text 和 next 字段
    for (const key of Object.keys(dialogues)) {
      const dialogue = dialogues[key];

      // 自动补全 text：没写 text 就用 key 名
      if (dialogue.text === undefined || dialogue.text === null) {
        dialogue.text = key;
        // 如果有 i18nPrefix，自动加上前缀（按节点 key 匹配分组）
        if (i18nPrefix) {
          const nodePrefix = resolvePrefixByKey(key, i18nPrefix);
          if (nodePrefix) {
            dialogue.text = `i18n:${nodePrefix}.${key}`;
          }
        }
      }

      // 自动补全 next：没写 next 且不是 end 节点，就用 key 名 +1
      // 有 options 的节点跳过自动补全（选项节点靠选项驱动，不该被自动补成结束节点导致选项不显示）
      if (dialogue.next === undefined && dialogue.next !== null && !isEndNode(dialogue.end) && !(dialogue.options && dialogue.options.length > 0)) {
        const nextKey = incrementKey(key);
        // 只有当下一个节点存在时才自动补全
        if (nextKey && dialogues[nextKey]) {
          dialogue.next = nextKey;
        } else {
          // 下一个节点不存在 → 自动跳转到 end 节点（有文本的节点先显示完再结束）
          if (dialogues['end']) {
            dialogue.next = 'end';
          } else {
            dialogue.end = true;
          }
        }
      }
    }

    // 合并到 allDialogues
    Object.assign(allDialogues, dialogues);

    // 标记已加载
    loadedModules[modulePath] = true;

  
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

  // 🎒 入口节点检测：needItem（背包检测）/ needAffection（NPC好感度检测），不满足则不开启对话
  //    （由调用方负责恢复 UI / 操作权，见 matter.vue talkToNpc）
  const store = getStore();
  const entryMissing = [];
  if (dialogue.needItem && !store.hasInventoryItem?.(dialogue.needItem, dialogue.needItemNum ?? 1)) {
    entryMissing.push(`物品 ${formatItemNeed(dialogue.needItem, dialogue.needItemNum ?? 1)}`);
  }
  if (dialogue.needAffection && !store.hasNpcAffection?.(dialogue.needAffection)) {
    entryMissing.push(`好感 ${formatAffectionNeed(dialogue.needAffection)}`);
  }
  if (entryMissing.length) {
    ElMessText(`条件不足：缺少${entryMissing.join('、')}`, 'warning');
    console.warn(`[对话系统] 对话节点条件不满足: ${dialogueId}（${entryMissing.join('、')}）`);
    return false;
  }

  // 🎒 入口节点消耗物品：节点配置 consumeItem（string|string[]，可配 consumeItemNum）
  if (dialogue.consumeItem) {
    const consumed = store.consumeInventoryItem?.(dialogue.consumeItem, dialogue.consumeItemNum ?? 1);
    if (!consumed) {
      ElMessText(`条件不足：缺少物品 ${formatItemNeed(dialogue.consumeItem, dialogue.consumeItemNum ?? 1)}`, 'warning');
      console.warn(`[对话系统] 背包物品不足，无法进入节点: ${dialogueId}`);
      return false;
    }
  }

  // 初始化 i18n（首次调用时初始化）
  initLanguage();

  // 重置运行时状态
  currentDialogueId.value = dialogueId;
  isDialogueActive.value = true;
  dialogueHistory.value = [];
  chosenOptionsMap.clear(); // 清空已选选项记录

  // 每次打开新对话重置头像皮肤为默认（null=默认皮肤）：
  //    - 后续节点如果显式写了 playerSkin/npcSkin 会覆盖此默认值
  //    - 如果节点没写，则保持默认皮肤
  currentPlayerSkin.value = null;
  currentNpcSkin.value = null;

  // 触发 onEnter 回调
  if (dialogue.onEnter && typeof dialogue.onEnter === 'function') {
    dialogue.onEnter();
  }

  // 记录到历史
  dialogueHistory.value.push({
    id: dialogueId,
    timestamp: Date.now(),
  });

  // 处理 CG 相关字段（showCg: 字符串=显示，空字符串=隐藏，不写=不操作）
  if (dialogue.showCg !== undefined) {
    if (dialogue.showCg === '') {
      hideCg();
    } else {
      showCg(dialogue.showCg, dialogue.cgAnimation || null, dialogue.cgLoop || false, dialogue.cgSkin ?? null);
    }
  }
  // cgSkin 独立处理：即使不写 showCg（仅切换皮肤）也能更新皮肤值
  if (dialogue.cgSkin !== undefined && dialogue.showCg === undefined) {
    setCgSkin(dialogue.cgSkin);
  }
  if (dialogue.cgAnimation && isCgVisible.value) {
    setCgAnimation(dialogue.cgAnimation);
  }
  // 处理 CG 显示时是否仍显示头像框
  if (dialogue.cgShowAvatar !== undefined) {
    currentCgShowAvatar.value = dialogue.cgShowAvatar === true;
  }

  // 处理 BGM 相关字段
  if (dialogue.bgm !== undefined) {
    if (dialogue.bgm) {
      playBgm(dialogue.bgm);
    } else {
      stopBgm();
    }
  }

  // 处理头像动画相关字段
  if (dialogue.npcAnim !== undefined) {
    setNpcAvatarAnimation(dialogue.npcAnim);
  }
  if (dialogue.playerAnim !== undefined) {
    setPlayerAvatarAnimation(dialogue.playerAnim);
  }
  if (dialogue.avatarFx !== undefined) {
    setAvatarFx(dialogue.avatarFx);
  }
  if (dialogue.playerAvatar !== undefined) {
    setPlayerAvatar(dialogue.playerAvatar);
  }
  // 📖 旁白节点（无 onStage 且无 name）→ 隐藏所有头像（含玩家）；非旁白恢复玩家头像
  const _isNarr = dialogue.narration === true || (!dialogue.onStage && !dialogue.name);
  if (_isNarr) {
    if (currentPlayerAvatar.value !== false) setPlayerAvatar(false);
  } else if (currentPlayerAvatar.value === false) {
    setPlayerAvatar(true);
  }

  // 处理头像皮肤相关字段（用于 Spine 皮肤切换表情）
  if (dialogue.playerSkin !== undefined) {
    setPlayerSkin(dialogue.playerSkin);
  }
  if (dialogue.npcSkin !== undefined) {
    setNpcSkin(dialogue.npcSkin);
  }

  // 处理屏幕震动
  if (dialogue.screenShake) {
    const shakeParams = typeof dialogue.screenShake === 'object'
      ? dialogue.screenShake
      : { intensity: 8, duration: 300 };
    emitter.emit('screenShake', shakeParams);
  }

  // 重新计算缓存
  recalculateCache();


  return true;
}

/**
 * 跳转到下一个对话节点
 * @param {string} nextId - 下一个对话节点ID
 */
function goToDialogue(nextId) {
  if (!nextId) return false;

  // next 支持函数形式，运行时解析出真实节点ID
  const resolvedId = typeof nextId === 'function' ? nextId() : nextId;
  if (!resolvedId) return false;

  const nextDialogue = allDialogues[resolvedId];
  if (!nextDialogue) {
    console.error(`[对话系统] 找不到对话节点: ${resolvedId}`);
    return false;
  }

  // 🎒 声明式条件检查：needItem（背包检测）/ needAffection（NPC好感度检测）
  //    不满足时提示玩家并直接退出对话，避免卡住
  const store = getStore();
  const missing = [];
  if (nextDialogue.needItem && !store.hasInventoryItem?.(nextDialogue.needItem, nextDialogue.needItemNum ?? 1)) {
    missing.push(`物品 ${formatItemNeed(nextDialogue.needItem, nextDialogue.needItemNum ?? 1)}`);
  }
  if (nextDialogue.needAffection && !store.hasNpcAffection?.(nextDialogue.needAffection)) {
    missing.push(`好感 ${formatAffectionNeed(nextDialogue.needAffection)}`);
  }
  if (missing.length) {
    ElMessText(`条件不足：缺少${missing.join('、')}`, 'warning');
    console.warn(`[对话系统] 对话节点条件不满足: ${resolvedId}（${missing.join('、')}）`);
    endDialogue();
    return false;
  }

  // 检查显示条件（condition 函数，保持原有行为：仅阻止跳转）
  if (nextDialogue.condition && typeof nextDialogue.condition === 'function') {
    if (!nextDialogue.condition()) {
      console.warn(`[对话系统] 对话节点条件不满足: ${resolvedId}`);
      return false;
    }
  }

  // 🎒 进入节点消耗物品：节点配置 consumeItem（string|string[]，可配 consumeItemNum）
  if (nextDialogue.consumeItem) {
    const consumed = store.consumeInventoryItem?.(nextDialogue.consumeItem, nextDialogue.consumeItemNum ?? 1);
    if (!consumed) {
      ElMessText(`条件不足：缺少物品 ${formatItemNeed(nextDialogue.consumeItem, nextDialogue.consumeItemNum ?? 1)}`, 'warning');
      console.warn(`[对话系统] 背包物品不足，无法进入节点: ${resolvedId}`);
      endDialogue();
      return false;
    }
  }

  // 触发当前对话的 onExit 回调
  const current = currentDialogue.value;
  if (current?.onExit && typeof current.onExit === 'function') {
    current.onExit();
  }
  // 🎯 moveNpcOnEnd：本句说完后移动指定 npc 到指定格（可单条/数组）
  handleMoveNpcOnEnd(current);
  // 🆕 spawnNpcsOnEnd：本句说完后生成指定 npc 到指定格（可单条/数组）
  handleSpawnNpcOnEnd(current);
  // 🆕 spawnEnemiesOnEnd：本句说完后生成指定敌人到指定格（可单条/数组）
  handleSpawnEnemyOnEnd(current);
  // 🎬 nextTextOnce：当前节点配置了该属性 → 跳转时给目标节点注入一次性文本
  //    （目标节点的 text 函数读取后清除，仅生效一次；配合 sr10 等动态开场文本使用）
  if (current?.nextTextOnce) {
    store.setDialogueFlag?.('dlgOverrideNextText', current.nextTextOnce);
  }

  // 切换到下一个对话
  currentDialogueId.value = resolvedId;

  // 触发下一个对话的 onEnter 回调
  if (nextDialogue.onEnter && typeof nextDialogue.onEnter === 'function') {
    nextDialogue.onEnter();
  }

  // 处理 CG 相关字段（showCg: 字符串=显示，空字符串=隐藏，不写=不操作）
  if (nextDialogue.showCg !== undefined) {
    if (nextDialogue.showCg === '') {
      hideCg();
    } else {
      showCg(nextDialogue.showCg, nextDialogue.cgAnimation || null, nextDialogue.cgLoop || false, nextDialogue.cgSkin ?? null);
    }
  }
  // cgSkin 独立处理：即使不写 showCg（仅切换皮肤）也能更新皮肤值
  if (nextDialogue.cgSkin !== undefined && nextDialogue.showCg === undefined) {
    setCgSkin(nextDialogue.cgSkin);
  }
  if (nextDialogue.cgAnimation && isCgVisible.value) {
    setCgAnimation(nextDialogue.cgAnimation);
  }
  // 处理 CG 显示时是否仍显示头像框
  if (nextDialogue.cgShowAvatar !== undefined) {
    currentCgShowAvatar.value = nextDialogue.cgShowAvatar === true;
  }

  // 处理 BGM 相关字段
  if (nextDialogue.bgm !== undefined) {
    if (nextDialogue.bgm) {
      playBgm(nextDialogue.bgm);
    } else {
      stopBgm();
    }
  }

  // 处理头像动画相关字段
  if (nextDialogue.npcAnim !== undefined) {
    setNpcAvatarAnimation(nextDialogue.npcAnim);
  }
  if (nextDialogue.playerAnim !== undefined) {
    setPlayerAvatarAnimation(nextDialogue.playerAnim);
  }
  if (nextDialogue.avatarFx !== undefined) {
    setAvatarFx(nextDialogue.avatarFx);
  }
  if (nextDialogue.playerAvatar !== undefined) {
    setPlayerAvatar(nextDialogue.playerAvatar);
  }
  // 📖 旁白节点（无 onStage 且无 name）→ 隐藏所有头像（含玩家）；非旁白恢复玩家头像
  const _isNarrNext = nextDialogue.narration === true || (!nextDialogue.onStage && !nextDialogue.name);
  if (_isNarrNext) {
    if (currentPlayerAvatar.value !== false) setPlayerAvatar(false);
  } else if (currentPlayerAvatar.value === false) {
    setPlayerAvatar(true);
  }

  // 处理头像皮肤相关字段（用于 Spine 皮肤切换表情）
  if (nextDialogue.playerSkin !== undefined) {
    setPlayerSkin(nextDialogue.playerSkin);
  }
  if (nextDialogue.npcSkin !== undefined) {
    setNpcSkin(nextDialogue.npcSkin);
  }

  // 处理屏幕震动
  if (nextDialogue.screenShake) {
    const shakeParams = typeof nextDialogue.screenShake === 'object'
      ? nextDialogue.screenShake
      : { intensity: 8, duration: 300 };
    emitter.emit('screenShake', shakeParams);
  }

  // 记录历史
  dialogueHistory.value.push({
    id: resolvedId,
    timestamp: Date.now(),
  });

  // 重新计算缓存
  recalculateCache();

  // 检查是否结束
  if (isEndNode(nextDialogue.end)) {
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

  // 🎒 提前校验目标节点的声明式条件（needItem / needAffection）：
  //    不满足时提示并直接退出对话，且不记录本次选择（避免选项"被用掉"却没生效）
  if (typeof option.next === 'string' && allDialogues[option.next]) {
    const target = allDialogues[option.next];
    const store = getStore();
    const fail = [];
    if (target.needItem && !store.hasInventoryItem?.(target.needItem, target.needItemNum ?? 1)) {
      fail.push(`物品 ${formatItemNeed(target.needItem, target.needItemNum ?? 1)}`);
    }
    if (target.needAffection && !store.hasNpcAffection?.(target.needAffection)) {
      fail.push(`好感 ${formatAffectionNeed(target.needAffection)}`);
    }
    if (fail.length) {
      ElMessText(`条件不足：缺少${fail.join('、')}`, 'warning');
      console.warn(`[对话系统] 目标节点条件不满足: ${option.next}（${fail.join('、')}）`);
      endDialogue();
      return false;
    }
  }

  // 🎒 消耗物品：选项配置了 consumeItem（string|string[]，可配 consumeItemNum）时，
  //    先检查并消耗背包物品再执行选择；数量不足则中止本次选择
  if (option.consumeItem) {
    const store = getStore();
    const consumed = store.consumeInventoryItem?.(option.consumeItem, option.consumeItemNum ?? 1);
    if (!consumed) {
      console.warn(`[对话系统] 背包物品不足，无法选择选项「${typeof option.text === 'string' ? option.text : ''}」`);
      return false;
    }
  }

  // 记录选择历史到 Pinia（持久化）
  // 优先用对话节点的 id 字段，没有的话用节点 key（currentDialogueId）
  const dialogueId = current.id || currentDialogueId.value;
  store.recordDialogueChoice(dialogueId, optionIndex, option.text);

  // 记录已选选项（用于循环返回时禁用变灰）
  if (!chosenOptionsMap.has(dialogueId)) {
    chosenOptionsMap.set(dialogueId, new Set());
  }
  chosenOptionsMap.get(dialogueId).add(optionIndex);



  // 触发选项的 onSelect 回调
  if (option.onSelect && typeof option.onSelect === 'function') {
    option.onSelect();
  }

  // 📢 触发选项配置的自定义事件（emitEvent: '事件名' 或 {name:'事件名', data:{...}}）
  if (option.emitEvent) {
    let eventName, eventData = {};
    if (typeof option.emitEvent === 'string') {
      eventName = option.emitEvent;
      eventData = option.emitData || {};
    } else if (typeof option.emitEvent === 'object') {
      eventName = option.emitEvent.name;
      eventData = option.emitEvent.data || {};
    }
    if (eventName) {
      console.log('[对话系统] 选项触发事件:', eventName, eventData);
      emitter.emit(eventName, eventData);
    }
  }

  // 处理好感度变化
  if (option.affection && option.npc) {
    store.addNpcAffection(option.npc, option.affection);
  }

  // 跳转到下一个对话（next 支持字符串或函数）
  if (option.next) {
    const nextId = typeof option.next === 'function' ? option.next() : option.next;
    return goToDialogue(nextId);
  }

  return true;
}

/**
 * 判断是否是结束节点
 * @param {*} endValue - end字段的值
 * @returns {boolean} 是否是结束节点
 */
function isEndNode(endValue) {
  return endValue === true || endValue === 1 || endValue === 2;
}

/**
 * 判断是否是一次性结束节点（需要标记完成，不可重复触发）
 * @param {*} endValue - end字段的值
 * @returns {boolean} 是否是一次性结束节点
 */
function isOneTimeEnd(endValue) {
  return endValue === true || endValue === 1;
}

/**
 * 判断是否是可重复结束节点（不标记完成，可以重复触发）
 * @param {*} endValue - end字段的值
 * @returns {boolean} 是否是可重复结束节点
 */
function isRepeatableEnd(endValue) {
  return endValue === 2;
}

// 格式化背包物品需求文案（needItem: string|string[]，num: 数量）
function formatItemNeed(needItem, num = 1) {
  const list = Array.isArray(needItem) ? needItem : [needItem]
  return list.map(n => `${n}×${num}`).join('、')
}

// 格式化 NPC 好感度需求文案（needAffection: {npc, min} 或数组）
function formatAffectionNeed(needAffection) {
  const list = Array.isArray(needAffection) ? needAffection : [needAffection]
  return list.filter(r => r?.npc).map(r => {
    const info = getStore().getNpcInfo?.(r.npc)
    return `${info?.name || r.npc} 好感≥${r.min ?? 0}`
  }).join('、')
}

/**
 * 🎯 节点配置 moveNpcOnEnd：对话说完后移动指定 tiled npc 到指定格
 * 支持单条对象或数组（多个 npc 批量移动）
 * 例：{ npcId: 42, col: 3, row: 5, speed: 4 }
 */
function handleMoveNpcOnEnd(node) {
  if (!node?.moveNpcOnEnd) return;
  const list = Array.isArray(node.moveNpcOnEnd) ? node.moveNpcOnEnd : [node.moveNpcOnEnd];
  emitter.emit('dialogueMoveNpc', list.map(cfg => ({
    npcId: cfg.npcId,
    col: cfg.col,
    row: cfg.row,
    speed: cfg.speed,
    teleport: cfg.teleport === true, // 🌀 传送：true 时瞬间移动到目标格（不走路）
  })));
}

/** 🆕 spawnNpcsOnEnd：本句/对话结束后生成指定 npc 到指定格（支持单条/数组批量） */
function handleSpawnNpcOnEnd(node) {
  if (!node?.spawnNpcsOnEnd) return;
  const list = Array.isArray(node.spawnNpcsOnEnd) ? node.spawnNpcsOnEnd : [node.spawnNpcsOnEnd];
  emitter.emit('dialogueSpawnNpc', list);
}

/** 🆕 spawnEnemiesOnEnd：本句/对话结束后生成指定敌人到指定格（对齐 tiled enemy 结构，支持单条/数组批量） */
function handleSpawnEnemyOnEnd(node) {
  if (!node?.spawnEnemiesOnEnd) return;
  const list = Array.isArray(node.spawnEnemiesOnEnd) ? node.spawnEnemiesOnEnd : [node.spawnEnemiesOnEnd];
  emitter.emit('dialogueSpawnEnemy', list);
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
  // 🎯 moveNpcOnEnd：对话结束时也执行一次（覆盖无 next 跳转直接关闭的场景）
  handleMoveNpcOnEnd(current);
  // 🆕 spawnNpcsOnEnd：对话结束时也执行一次
  handleSpawnNpcOnEnd(current);
  // 🆕 spawnEnemiesOnEnd：对话结束时也执行一次
  handleSpawnEnemyOnEnd(current);

  // 标记对话完成（持久化）：只有一次性结束节点才标记，可重复节点不标记
  // 起始节点加了 repeatable: true 的对话（如 NPC 日常打招呼），永远不记录进度，可以无限重复
  const startNodeId = dialogueHistory.value?.[0]?.id;
  const startNodeData = startNodeId ? allDialogues[startNodeId] : null;
  if (isOneTimeEnd(current?.end) && startNodeId && !startNodeData?.repeatable) {
    store.markDialogueComplete(startNodeId);
  }

  isDialogueActive.value = false;
  currentDialogueId.value = null;

  // 对话结束自动隐藏 CG
  // ⚠️ 休息节点触发昼夜CG（dayCgTrigger）时不能在此隐藏，否则会打断 CG 播放；
  //    昼夜CG由 duihua.vue 的 taiyangyueliang 播放完成回调统一关闭
  if (!store.pixi.dayCgTrigger) {
    hideCg();
  }

  // 对话结束自动停止 BGM
  // stopBgm();

  // 对话结束重置头像动画状态
  currentNpcAvatarAnimation.value = null;
  currentPlayerAvatarAnimation.value = null;
  currentAvatarFx.value = null;
  currentPlayerAvatar.value = true;

  // 对话结束重置头像皮肤状态
  currentPlayerSkin.value = null;
  currentNpcSkin.value = null;
  // 对话结束重置 CG 显示头像开关
  currentCgShowAvatar.value = false;

  // 自动关闭对话框
  // ⚠️ 休息节点触发昼夜CG（dayCgTrigger）时不能在此关闭对话框承载组件：
  //    duihua=false 会让 matter.vue 的 v-show 隐藏整个组件（含 CG canvas），导致 CG 提前消失；
  //    昼夜CG由 duihua.vue 的 taiyangyueliang 播放完成回调统一关闭
  if (!store.pixi.dayCgTrigger) {
    store.hideDialogue();
  }
  emitter.emit("enablePlayerControl", 1)

  // 💗 对话结束后自动同步好感度到羁绊系统（免去每个节点手动写 syncFavor；幂等，无好感变化也无副作用）
  store.syncDungeonNpcFavor?.();

  // 📋 对话已完全结束（所有关闭路径都走这里）
  emitter.emit("dialogueEnded")

}

// ========================
// CG 相关方法
// ========================

/**
 * 显示 CG
 * @param {string} cgName - CG 名称（对应资源名，如 'chuzuwu'）
 * @param {string} animationName - 动画名称（可选，默认播放第一个动画）
 * @param {boolean} loop - 是否循环
 * @param {string|null} skinName - Spine 皮肤名称（可选，null=默认皮肤）
 */
function showCg(cgName, animationName = 'animation', loop = false, skinName = null) {
  if (!cgName) return;
  
  currentCgName.value = cgName;
  currentCgAnimation.value = animationName;
  currentCgLoop.value = loop;
  currentCgSkin.value = skinName || null;
  isCgVisible.value = true;
  
}

/**
 * 隐藏 CG
 */
function hideCg() {
  isCgVisible.value = false;
  currentCgName.value = null;
  currentCgAnimation.value = null;
  currentCgSkin.value = null;
  currentCgShowAvatar.value = false;

}

/**
 * 切换 CG 动画
 * @param {string} animationName - 动画名称
 */
function setCgAnimation(animationName) {
  if (!animationName) return;
  
  currentCgAnimation.value = animationName;
  

}

/**
 * 切换 CG 皮肤（需要重新加载 Spine 才生效，配合 showCgSpine 使用）
 * @param {string|null} skinName - 皮肤名称，null/空=默认皮肤
 */
function setCgSkin(skinName) {
  currentCgSkin.value = skinName || null;
}

// ========================
// 头像动画相关方法
// ========================

/**
 * 设置 NPC 头像动画
 * @param {string|null} animationName - 动画名称，传 null 表示恢复默认第一个动画
 */
function setNpcAvatarAnimation(animationName) {
  currentNpcAvatarAnimation.value = animationName;
  
}

/**
 * 设置玩家头像动画
 * @param {string|null} animationName - 动画名称，传 null 表示恢复默认第一个动画
 */
function setPlayerAvatarAnimation(animationName) {
  currentPlayerAvatarAnimation.value = animationName;

}

/**
 * 🎬 设置头像框表现动画（avatarFx：抖动/放大缩小等情绪表现动画）
 * @param {string|Object|null} fx - 动画名称（如 'shake'/'pulse'）或配置对象；null 恢复
 */
function setAvatarFx(fx) {
  currentAvatarFx.value = fx || null;
}

/**
 * 设置玩家头像（统一控制显示/隐藏/切换角色）
 * @param {boolean|string} value
 *   - false / "" / null → 隐藏头像
 *   - true → 显示当前角色（不切换）
 *   - "zhujue" / "maomi" 等字符串 → 显示并切换到该角色
 */
function setPlayerAvatar(value) {
  if (value === false || value === "" || value === null || value === undefined) {
    currentPlayerAvatar.value = false;
  } else if (value === true) {
    currentPlayerAvatar.value = true;
  } else {
    // 字符串：显示并切换角色
    currentPlayerAvatar.value = value;
  }
}

/**
 * 设置玩家头像皮肤（Spine skin），用于切换表情
 * 传入 null 或空字符串则恢复默认皮肤
 * @param {string|null} skinName - 皮肤名称
 */
function setPlayerSkin(skinName) {
  currentPlayerSkin.value = skinName || null;
}

/**
 * 设置 NPC 头像皮肤（Spine skin），用于切换表情
 * 支持两种格式：
 *   - 字符串："smile" → 应用于当前说话的 NPC
 *   - 对象：{ huli: "smile", jinmao: null } → 按 NPC 名称分别指定
 * 传入 null 则恢复所有 NPC 默认皮肤
 * @param {string|Object|null} skinName - 皮肤名称 或 按NPC名称映射的对象
 */
function setNpcSkin(skinName) {
  currentNpcSkin.value = skinName || null;
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
      const store = getStore();
    const dialogueId = dialogue.id || currentDialogueId.value;
    // 合并内存临时记录 + 持久化记录，确保重新开对话也能记住已选选项
    const chosenSet = new Set(chosenOptionsMap.get(dialogueId) || []);
    store.pixi.choiceHistory?.forEach(c => {
      if (c.dialogueId === dialogueId) chosenSet.add(c.optionIndex);
    });

    return dialogue.options
      .map((option, index) => {
        // 计算 disabled 状态
        let disabled = chosenSet.has(index) && !option.repeatable; // 已选且不可重复则变灰禁用

        // 🎒 物品检查：有 needItem（背包检测）且不是软检查模式时，物品不足则禁用
        if (option.needItem && !option.softItemCheck) {
          const store = getStore();
          if (!store.hasInventoryItem?.(option.needItem, option.needItemNum ?? 1)) {
            disabled = true;
          }
        }

        // 💗 好感度检查：needAffection（{npc, min} 或数组）未达标且不是软检查模式时禁用
        if (option.needAffection && !option.softAffectionCheck) {
          const store = getStore();
          if (!store.hasNpcAffection?.(option.needAffection)) {
            disabled = true;
          }
        }

        return {
          ...option,
          originalIndex: index,
          disabled,
        };
      })
      .filter((option, index) => {
        // 1. 条件判断：有condition函数且返回false，隐藏
        if (option.condition && typeof option.condition === 'function') {
          if (!option.condition()) return false;
        }
        // 2. 已选择且配置了 hideOnChosen：选择后消失
        if (chosenSet.has(index) && option.hideOnChosen && !option.repeatable) {
          return false;
        }
        return true;
      })
      .map(option => {
        let text = option.text;
        if (typeof text === 'function') {
          text = text();
        }
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

// 重置每日对话选项事件（休息后让"每天一次"的选项恢复可选）
// 用法: emitter.emit('resetDailyDialogueChoices', { ids: ['hl50', 'yu50', 'jinmao50'] })
emitter.off("resetDailyDialogueChoices");
emitter.on('resetDailyDialogueChoices', ({ ids = [] } = {}) => {
  ids.forEach(id => resetDialogueChoices(id));
});

/**
 * 重置指定对话的选项选择记录
 * - 普通变灰选项：恢复为可选
 * - hideOnChosen 消失的选项：保持消失，不重置
 * @param {string|string[]} dialogueId - 对话节点 id，单个或数组
 */
function resetDialogueChoices(dialogueId) {
    const store = getStore();
  const ids = Array.isArray(dialogueId) ? dialogueId : [dialogueId];

  ids.forEach(id => {
    const nodeData = allDialogues[id];
    const options = nodeData?.options || [];

    // 收集需要保留的选项索引（hideOnChosen: true 的保持消失）
    const keepIndexes = new Set();
    options.forEach((opt, idx) => {
      if (opt.hideOnChosen && !opt.repeatable) {
        keepIndexes.add(idx);
      }
    });

    // 1. 清内存：只删非 hideOnChosen 的选项记录
    const memSet = chosenOptionsMap.get(id);
    if (memSet) {
      memSet.forEach(idx => {
        if (!keepIndexes.has(idx)) memSet.delete(idx);
      });
    }

    // 2. 清持久化：只删非 hideOnChosen 的选项记录
    store.pixi.choiceHistory = store.pixi.choiceHistory.filter(c => {
      if (c.dialogueId !== id) return true;       // 不是当前对话的，保留
      return keepIndexes.has(c.optionIndex);     // 是 hideOnChosen 的才保留
    });
  });

  // 3. 刷新缓存，界面立刻更新
  refreshDialogueCache();
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
  currentCgLoop,
  currentCgSkin,
  currentCgShowAvatar,
  isCgVisible,

  // 头像动画相关状态
  currentNpcAvatarAnimation,
  currentPlayerAvatarAnimation,
  currentAvatarFx,
  currentPlayerAvatar,

  // 头像皮肤相关状态
  currentPlayerSkin,
  currentNpcSkin,

  // 方法
  startDialogue,
  goToDialogue,
  chooseOption,
  endDialogue,
  getDialogueText,
  getVisibleOptions,
  setDialogueFlag,
  getDialogueFlag,
  isEndNode,
  isOneTimeEnd,
  isRepeatableEnd,
  getDialogueSaveData,
  loadDialogueSaveData,
  refreshDialogueCache,
  resetDialogueChoices,
  loadDialogueModule,
  loadDialogueModules,

  // CG 相关方法
  showCg,
  hideCg,
  setCgAnimation,
  setCgSkin,

  // 音频相关方法
  playClickSound,
  playBgm,
  stopBgm,

  // 头像动画相关方法
  setNpcAvatarAnimation,
  setPlayerAvatarAnimation,
  setAvatarFx,
  setPlayerAvatar,

  // 头像皮肤相关方法
  setPlayerSkin,
  setNpcSkin,

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
  resetDialogueChoices,
  loadDialogueModule,
  loadDialogueModules,
  t,
  changeLanguage,
  getCurrentLang,
  isZh,
};
