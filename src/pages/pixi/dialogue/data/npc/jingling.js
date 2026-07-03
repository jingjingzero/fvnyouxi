/**
 * 精灵 NPC 对话数据
 * 
 * 同文件写法：翻译和对话数据在同一个文件里
 * - 写的时候不用跳文件，上下翻就能看到
 * - 以后加英文直接加 en 对象就行
 * - 对话数据用 i18n:key 引用翻译
 */

import { useCounterStore } from "@/store/counter";
import { t } from '../../i18n/index.js';

const getStore = () => useCounterStore();

// ========== 翻译 ==========
// 中文翻译（写对话的时候直接看这里）
const translations = {
  'zh-CN': {
    npc_jingling: {
      // 问候
      greeting_stranger: "...你是谁？为什么会在这里？",
      greeting_familiar: "嗯...是你啊。有什么事吗？",
      greeting_friendly: "你好，又见面了。今天的天气不错，你觉得呢？",
      greeting_close: "啊，是你呀！今天也来找我玩吗？我正想找人说说话呢~",

      // 聊天入口
      chat_intro_low: "聊天...？好吧，你想说什么？",
      chat_intro_high: "聊天吗？好呀！你想聊些什么呢？",

      // 聊天选项
      opt_chat: "聊聊天",
      opt_gift: "送礼物",
      opt_ask_forest: "询问森林的事",
      opt_daily: "你平时都做些什么？",
      opt_place: "这里是什么地方？",
      opt_like: "你喜欢什么？",
      opt_nothing: "没什么，随便问问",
      opt_chat_more: "再聊点别的",
      opt_next_time: "下次再说吧",

      // 聊天内容
      chat_daily: "我吗？平时就是在森林里走走，照顾花草，和小动物们说说话。有时候会晒晒太阳，看看云朵的形状~",
      chat_place: "这里...是苍穹设施的外围森林。虽然人类建了很多奇怪的机器，但森林的力量还在，我能感受到。",
      chat_like: "我喜欢的东西吗？嗯...阳光、露水、花朵的香气、还有...嗯，没什么啦！",
      chat_more: "那...你还有什么想聊的吗？",

      // 送礼物
      gift_intro: "礼物？给我的吗？",
      opt_gift_flower: "送她一朵花",
      opt_gift_stone: "送她发光的石头",
      opt_gift_later: "算了，下次再送",
      gift_flower: "哇...好漂亮的花！谢谢你，我会好好照顾它的~",
      gift_stone: "这是...森林深处的发光石？你怎么找到的！谢谢你，我太开心了！",

      // 森林相关
      forest_intro: "森林的事...你想知道什么？",
      opt_forest_danger: "森林里有危险吗？",
      opt_forest_stay: "你为什么留在这？",
      forest_danger: "森林深处有一些...不太好的东西。人类的实验污染了那里，连植物都变得奇怪了。你最好不要去太深的地方。",
      forest_stay: "因为...这里是我的家啊。虽然森林变了，但它还是我的家。而且，我在等一个人...不，没什么。",

      // 告别
      bye_stranger: "...再见。",
      bye_familiar: "嗯，再见。路上小心。",
      bye_close: "要走了吗？下次再来找我玩呀！我会在这里等你的~",

      // 初次相遇
      first_meet_alert: "！你是谁？为什么会出现在这里？",
      first_meet_opt_staff: "我是这里的工作人员",
      first_meet_opt_passby: "我只是路过",
      first_meet_opt_friendly: "你好，我叫林恩",
      first_meet_staff_angry: "苍穹设施的人？！你们来这里做什么！走开！",
      first_meet_passby_suspicious: "路过...？这里可是设施的外围，一般人不会来这里。你最好快点离开。",
      first_meet_friendly_surprised: "林恩...？你不像那些坏人。嗯...我叫精灵。你可以叫我精灵。",
      first_meet_end: "你遇到了神秘的森林精灵。",
    },

    // 通用
    common: {
      goodbye: "告辞",
    }
  },

  // 以后加英文直接取消注释，在这里写就行
  // 'en-US': {
  //   npc_jingling: {
  //     greeting_stranger: "...Who are you? Why are you here?",
  //     // ... 更多英文翻译
  //   }
  // }
}

// ========== 辅助函数 ==========

// 获取精灵好感度
function getJinglingAffection() {
  const store = getStore();
  const npc = store.getNpcInfo('jingling');
  return npc?.affection || 0;
}

// 根据好感度获取问候语
function getGreetingText() {
  const affection = getJinglingAffection();
  console.log('好感度=', affection);

  if (affection >= 70) return t('npc_jingling.greeting_close');
  if (affection >= 40) return t('npc_jingling.greeting_friendly');
  if (affection >= 20) return t('npc_jingling.greeting_familiar');
  return t('npc_jingling.greeting_stranger');
}

// 根据好感度获取告别语
function getByeText() {
  const affection = getJinglingAffection();
  if (affection >= 60) return t('npc_jingling.bye_close');
  if (affection >= 30) return t('npc_jingling.bye_familiar');
  return t('npc_jingling.bye_stranger');
}

// ========== 对话数据 ==========
// 用 i18n:key 引用上面的翻译
const jinglingDialogues = {
  // ===== 日常对话入口 =====
  jingling_talk: {
    id: "jingling_talk",
    name: "精灵",
    avatar: "jingling",
    face: "normal",
    // 根据好感度显示不同问候
    text: () => getGreetingText(),
    options: [
      {
        text: "i18n:npc_jingling.opt_chat",
        next: "jingling_chat",
      },
      {
        text: "i18n:npc_jingling.opt_gift",
        next: "jingling_gift",
        condition: () => getJinglingAffection() >= 20,
      },
      {
        text: "i18n:npc_jingling.opt_ask_forest",
        next: "jingling_forest",
        condition: () => getJinglingAffection() >= 30,
      },
      {
        text: "i18n:common.goodbye",
        next: "jingling_bye",
      },
    ],
  },

  // ===== 聊天 =====
  jingling_chat: {
    id: "jingling_chat",
    name: "",
    avatar: "jingling",
    face: "curious",
    showCg: "chuzuwu",
    text: () => {
      const affection = getJinglingAffection();
      if (affection >= 50) {
        return t('npc_jingling.chat_intro_high');
      }
      return t('npc_jingling.chat_intro_low');
    },
    options: [
      {
        text: "i18n:npc_jingling.opt_daily",
        next: "jingling_daily",
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', 2);
        }
      },
      {
        text: "i18n:npc_jingling.opt_place",
        next: "jingling_place",
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', 1);
        }
      },
      {
        text: "i18n:npc_jingling.opt_like",
        next: "jingling_like",
        condition: () => getJinglingAffection() >= 30,
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', 3);
        }
      },
      {
        text: "i18n:npc_jingling.opt_nothing",
        next: "jingling_talk",
      },
    ],
  },

  // 日常
  jingling_daily: {
    id: "jingling_daily",
    name: "精灵",
    avatar: "jingling",
    face: "happy",
    text: "i18n:npc_jingling.chat_daily",
    next: "jingling_chat_more",
  },

  // 地方
  jingling_place: {
    id: "jingling_place",
    name: "精灵",
    avatar: "jingling",
    face: "thinking",
    text: "i18n:npc_jingling.chat_place",
    next: "jingling_chat_more",
  },

  // 喜欢的东西
  jingling_like: {
    id: "jingling_like",
    name: "精灵",
    avatar: "jingling",
    face: "shy",
    text: "i18n:npc_jingling.chat_like",
    next: "jingling_chat_more",
  },

  // 继续聊天
  jingling_chat_more: {
    id: "jingling_chat_more",
    name: "精灵",
    avatar: "jingling",
    face: "normal",
    text: "i18n:npc_jingling.chat_more",
    cgAnimation: "animation1",
    options: [
      { text: "i18n:npc_jingling.opt_chat_more", next: "jingling_chat" },
      { text: "i18n:npc_jingling.opt_next_time", next: "jingling_bye" },
    ],
  },

  // ===== 送礼物 =====
  jingling_gift: {
    id: "jingling_gift",
    name: "精灵",
    avatar: "jingling",
    face: "surprised",
    text: "i18n:npc_jingling.gift_intro",
    options: [
      {
        text: "i18n:npc_jingling.opt_gift_flower",
        next: "jingling_gift_flower",
        condition: () => {
          const store = getStore();
          return store.inventory?.some(item => item.name === '野花');
        },
        onSelect: () => {
          const store = getStore();
          const idx = store.inventory.findIndex(item => item.name === '野花');
          if (idx !== -1) {
            store.inventory[idx].num--;
            if (store.inventory[idx].num <= 0) {
              store.inventory.splice(idx, 1);
            }
          }
          store.addNpcAffection('jingling', 10);
        }
      },
      {
        text: "i18n:npc_jingling.opt_gift_stone",
        next: "jingling_gift_stone",
        condition: () => {
          const store = getStore();
          return store.inventory?.some(item => item.name === '发光石头');
        },
        onSelect: () => {
          const store = getStore();
          const idx = store.inventory.findIndex(item => item.name === '发光石头');
          if (idx !== -1) {
            store.inventory[idx].num--;
            if (store.inventory[idx].num <= 0) {
              store.inventory.splice(idx, 1);
            }
          }
          store.addNpcAffection('jingling', 15);
        }
      },
      {
        text: "i18n:npc_jingling.opt_gift_later",
        next: "jingling_talk",
      },
    ],
  },

  // 送花反应
  jingling_gift_flower: {
    id: "jingling_gift_flower",
    name: "精灵",
    avatar: "jingling",
    face: "happy",
    text: "i18n:npc_jingling.gift_flower",
    next: "jingling_talk",
  },

  // 送石头反应
  jingling_gift_stone: {
    id: "jingling_gift_stone",
    name: "精灵",
    avatar: "jingling",
    face: "shocked",
    text: "i18n:npc_jingling.gift_stone",
    next: "jingling_talk",
  },

  // ===== 询问森林 =====
  jingling_forest: {
    id: "jingling_forest",
    name: "精灵",
    avatar: "jingling",
    face: "serious",
    text: "i18n:npc_jingling.forest_intro",
    options: [
      {
        text: "i18n:npc_jingling.opt_forest_danger",
        next: "jingling_forest_danger",
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', 2);
        }
      },
      {
        text: "i18n:npc_jingling.opt_forest_stay",
        next: "jingling_forest_stay",
        condition: () => getJinglingAffection() >= 50,
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', 5);
        }
      },
      {
        text: "i18n:npc_jingling.opt_nothing",
        next: "jingling_talk",
      },
    ],
  },

  // 森林危险
  jingling_forest_danger: {
    id: "jingling_forest_danger",
    name: "精灵",
    avatar: "jingling",
    face: "worried",
    text: "i18n:npc_jingling.forest_danger",
    next: "jingling_forest",
  },

  // 为什么留下
  jingling_forest_stay: {
    id: "jingling_forest_stay",
    name: "精灵",
    avatar: "jingling",
    face: "sad",
    text: "i18n:npc_jingling.forest_stay",
    next: "jingling_forest",
  },

  // ===== 告别 =====
  jingling_bye: {
    id: "jingling_bye",
    name: "精灵",
    avatar: "jingling",
    face: "normal",
    text: () => getByeText(),
    end: true,
    onExit: () => {
      console.log('[对话] 精灵对话结束');
    }
  },

  // ===== 特殊剧情对话：初次相遇 =====
  jingling_first_meet: {
    id: "jingling_first_meet",
    name: "精灵",
    avatar: "jingling",
    face: "alert",
    text: "i18n:npc_jingling.first_meet_alert",
    options: [
      {
        text: "i18n:npc_jingling.first_meet_opt_staff",
        next: "jingling_first_meet_staff",
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', -5);
        }
      },
      {
        text: "i18n:npc_jingling.first_meet_opt_passby",
        next: "jingling_first_meet_passby",
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', 0);
        }
      },
      {
        text: "i18n:npc_jingling.first_meet_opt_friendly",
        next: "jingling_first_meet_friendly",
        onSelect: () => {
          const store = getStore();
          store.addNpcAffection('jingling', 5);
        }
      },
    ],
  },

  jingling_first_meet_staff: {
    id: "jingling_first_meet_staff",
    name: "精灵",
    avatar: "jingling",
    face: "angry",
    text: "i18n:npc_jingling.first_meet_staff_angry",
    next: "jingling_first_meet_end",
  },

  jingling_first_meet_passby: {
    id: "jingling_first_meet_passby",
    name: "精灵",
    avatar: "jingling",
    face: "suspicious",
    text: "i18n:npc_jingling.first_meet_passby_suspicious",
    next: "jingling_first_meet_end",
  },

  jingling_first_meet_friendly: {
    id: "jingling_first_meet_friendly",
    name: "精灵",
    avatar: "jingling",
    face: "surprised",
    text: "i18n:npc_jingling.first_meet_friendly_surprised",
    next: "jingling_first_meet_end",
  },

  jingling_first_meet_end: {
    id: "jingling_first_meet_end",
    name: "系统",
    avatar: "",
    text: "i18n:npc_jingling.first_meet_end",
    end: true,
    onExit: () => {
      const store = getStore();
      store.setDialogueFlag('jingling_met', true);
      store.markDialogueComplete('jingling_first_meet');
      console.log('[对话] 初次相遇剧情完成');
    }
  },
};

// ========== 导出 ==========
// translations 会被自动注册到 i18n 系统
// 其他的都是对话节点
export default {
  translations,
  ...jinglingDialogues
};
