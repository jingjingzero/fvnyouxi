/**
 * 中文语言包
 * 
 * 命名规范：
 * - 通用：common.xxx
 * - NPC：npc.{npcId}.xxx
 * - 主线：main.{chapterId}.xxx
 * - 支线：side.{taskId}.xxx
 */

export default {
  // ========== 通用 ==========
  common: {
    continue: "继续",
    goodbye: "告辞",
    chat: "聊聊天",
    gift: "送礼物",
    ask: "询问",
    next: "下一步",
    back: "返回",
  },

  // ========== NPC：精灵 ==========
  // 注意：精灵的翻译已移到 dialogue/data/npc/jingling.js 中（同文件写法）
  // 这里只保留通用翻译

  // ========== 示例：序章 ==========
  intro: {
    start_text: "你好，欢迎来到苍穹设施！你要做什么？",
    opt_explore: "探索实验室",
    opt_rest: "休息一下",
    
    explore_text_low: "你开始探索实验室，但精灵看起来有些警惕，远远地观察着你。",
    explore_text_high: "你满怀好奇地走进实验室，精灵对你很友好，主动向你介绍这里的设备。",
    opt_continue_deep: "继续深入",
    opt_go_back_rest: "回去休息",
    
    rest_text: "你找了个地方坐下休息，恢复了一些精神。",
    rest_continue_text: "休息完毕，你感觉精神好多了。",
    opt_continue_adventure: "继续冒险",
    opt_rest_more: "再歇会儿",
    rest_more_text: "你又坐了一会儿，时间悄悄流逝，但也错过了一些探索的机会。",
    
    find_room_text: "你在实验室深处发现了一扇神秘的门，上面写着「禁止入内」。",
    opt_open_door: "开门进去",
    opt_ignore: "先不管它",
    
    secret_room_text: "你用钥匙打开了门，里面是一个秘密实验室，到处都是奇怪的仪器和文件...",
    
    continue_explore_text: "你决定先不碰那扇门，继续探索其他地方。",
    
    find_item_text: "你在实验台上发现了一瓶药剂，看起来很珍贵。",
    opt_take_potion: "拿走药剂",
    opt_put_back: "放回去",
    take_potion_text: "你把药剂放进了背包。",
    
    rest_room_text: "你回到休息区，这里有舒适的沙发和自动咖啡机。",
    
    leave_lab_text: "是时候离开实验室了，今天的探索收获不少。",
    
    end_text: "对话结束。",
  },
};
