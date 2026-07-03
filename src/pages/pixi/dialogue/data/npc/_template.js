/**
 * NPC 对话模板
 * 
 * 【使用方法】
 * 1. 复制这个文件，改个名字（比如 laowang.js）
 * 2. 修改下面的翻译和对话数据
 * 3. 用 loadDialogueModule('npc/laowang') 加载
 * 
 * 【同文件写法的好处】
 * - 翻译和对话数据在同一个文件里，不用跳来跳去
 * - 以后加英文直接加 en 对象就行
 * - 结构清晰，好找好改
 */

import { useCounterStore } from "@/store/counter";
import { t } from '../../i18n/index.js';

const getStore = () => useCounterStore();

// ============================================================
//  翻译区（写对话的时候主要看这里）
// ============================================================
const translations = {
  'zh-CN': {
    // 用 npc_xxx 命名，避免和其他 NPC 冲突
    npc_laowang: {
      // ===== 问候 =====
      greeting: "你好啊，冒险者！欢迎来到我们的村庄。",
      greeting_friendly: "哟，是你啊！今天气色不错嘛~",
      
      // ===== 选项 =====
      opt_chat: "聊聊天",
      opt_quest: "有什么任务吗？",
      opt_shop: "看看商品",
      opt_bye: "告辞",
      
      // ===== 聊天内容 =====
      chat_weather: "今天天气真好啊，适合出去冒险。",
      chat_village: "我们村子虽然小，但大家都很热情。",
      chat_more: "还有什么想聊的吗？",
      
      // ===== 任务 =====
      quest_intro: "任务啊...最近森林里的狼有点多，你能帮忙清理一下吗？",
      quest_accept: "太好了！注意安全啊。",
      quest_decline: "好吧，等你准备好了再来找我。",
      
      // ===== 告别 =====
      bye: "慢走啊，有空常来坐坐！",
    },
  },
  
  // 以后加英文直接取消注释，在这里写就行
  // 'en-US': {
  //   npc_laowang: {
  //     greeting: "Hello, adventurer! Welcome to our village.",
  //     // ... 更多英文翻译
  //   }
  // }
}

// ============================================================
//  辅助函数区（如果需要好感度、条件判断等，写在这里）
// ============================================================

// 获取老王好感度（示例）
function getLaowangAffection() {
  const store = getStore();
  const npc = store.getNpcInfo('laowang');
  return npc?.affection || 0;
}

// ============================================================
//  对话数据区（用 i18n:key 引用上面的翻译）
// ============================================================

const laowangDialogues = {
  // ===== 对话入口 =====
  laowang_talk: {
    id: "laowang_talk",
    name: "老王",          // NPC 名字
    avatar: "laowang",     // 头像图片名（对应 assets/fullBody/head/laowang.webp）
    face: "normal",        // 表情（可选）
    
    // 对话文本
    // 方式1：直接写 i18n key
    text: "i18n:npc_laowang.greeting",
    
    // 方式2：用函数，可以根据条件返回不同文本
    // text: () => {
    //   if (getLaowangAffection() >= 50) {
    //     return t('npc_laowang.greeting_friendly');
    //   }
    //   return t('npc_laowang.greeting');
    // },
    
    // 选项列表
    options: [
      {
        text: "i18n:npc_laowang.opt_chat",  // 选项文字
        next: "laowang_chat",               // 点击后跳转到哪个对话
        // condition: () => true,            // （可选）显示条件，返回 true 才显示
        // onSelect: () => {},               // （可选）点击时触发的回调
      },
      {
        text: "i18n:npc_laowang.opt_quest",
        next: "laowang_quest",
      },
      {
        text: "i18n:npc_laowang.opt_shop",
        next: "laowang_shop",
      },
      {
        text: "i18n:npc_laowang.opt_bye",
        next: "laowang_bye",
      },
    ],
  },

  // ===== 聊天 =====
  laowang_chat: {
    id: "laowang_chat",
    name: "老王",
    avatar: "laowang",
    face: "happy",
    text: "i18n:npc_laowang.chat_weather",
    // 如果有 next，点击后直接跳转到下一个对话（没有选项）
    next: "laowang_chat_more",
  },

  laowang_chat_more: {
    id: "laowang_chat_more",
    name: "老王",
    avatar: "laowang",
    face: "normal",
    text: "i18n:npc_laowang.chat_more",
    options: [
      { text: "i18n:npc_laowang.opt_chat", next: "laowang_chat" },
      { text: "i18n:npc_laowang.opt_bye", next: "laowang_bye" },
    ],
  },

  // ===== 任务 =====
  laowang_quest: {
    id: "laowang_quest",
    name: "老王",
    avatar: "laowang",
    face: "serious",
    text: "i18n:npc_laowang.quest_intro",
    options: [
      {
        text: "好的，交给我吧",
        next: "laowang_quest_accept",
        onSelect: () => {
          // 接受任务时触发
          const store = getStore();
          // store.addQuest('wolf_hunt');
          console.log('接受了任务');
        }
      },
      {
        text: "我再考虑考虑",
        next: "laowang_quest_decline",
      },
    ],
  },

  laowang_quest_accept: {
    id: "laowang_quest_accept",
    name: "老王",
    avatar: "laowang",
    face: "happy",
    text: "i18n:npc_laowang.quest_accept",
    next: "laowang_talk",  // 返回主对话
  },

  laowang_quest_decline: {
    id: "laowang_quest_decline",
    name: "老王",
    avatar: "laowang",
    face: "normal",
    text: "i18n:npc_laowang.quest_decline",
    next: "laowang_talk",
  },

  // ===== 商店 =====
  laowang_shop: {
    id: "laowang_shop",
    name: "老王",
    avatar: "laowang",
    face: "normal",
    text: "看看有什么需要的？",
    onEnter: () => {
      // 进入这个对话时触发
      // 比如打开商店界面
      console.log('打开商店');
    },
    options: [
      { text: "我再看看", next: "laowang_talk" },
    ],
  },

  // ===== 告别 =====
  laowang_bye: {
    id: "laowang_bye",
    name: "老王",
    avatar: "laowang",
    face: "normal",
    text: "i18n:npc_laowang.bye",
    end: true,  // 标记为结束对话，点击后关闭对话框
    onExit: () => {
      // 对话结束时触发
      console.log('[对话] 老王对话结束');
    }
  },
}

// ============================================================
//  导出（不用改，直接用）
// ============================================================
export default {
  translations,       // 翻译会自动注册到 i18n
  ...laowangDialogues // 对话节点
};
