/**
 * 晨曦独立对话（chenxi-talk）：营地点击晨曦触发
 * loadData: 'npc/chenxi-talk'（tiled dialogLoadData 配置；dladmin 编辑器需在 FILES 数组登记 'chenxi-talk'）
 *
 * 流程：
 * - 第一次点击（ctEnd 未完成）→ 完整对话：送赤莓 → 聊故人「林恩」→ 安慰玩家（一次性）
 * - 完成主线后点击（可重复）→ ct50「怎么了？」→ 选项离开（不加好感）
 *
 * tiled 触发数组建议：
 *   [
 *     { ifNotCompleted: 'ctEnd', name: 'ct01' },  // 主线未完成 → 完整对话
 *     { name: 'ct50' },                            // 主线完成后 → 怎么了？
 *   ]
 *
 * 人称：旁白统一第二人称「你」；玩家说话人显示「林恩1」（默认名，可自定义）。
 * 立绘：晨曦 onStage: "jinmao"（默认皮肤，可在编辑器换）；玩家 playerSkin: "moren"。
 */
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

// 💗 晨曦好感（npcSelectList 里 jinmao 的 affection）
function addJinmaoAffection(n) {
  const npc = user.pixi?.npcSelectList?.find(x => x.img === 'jinmao');
  if (npc) npc.affection = (npc.affection || 0) + n;
}
function jinmaoAffection() {
  return user.pixi?.npcSelectList?.find(x => x.img === 'jinmao')?.affection || 0;
}

export default {
  // ===== 第一次点击：完整对话（一次性） =====
  ct01: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "林恩1！正找你呢。怎么样，还习惯吗？",
    next: "ct02",
  },
  ct02: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "饿不饿？正好我刚刚出去摘了点果子，呐，给你。",
    next: "ct03",
  },
  ct03: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    onEnter: () => {
      // 🍓 赠送赤莓 ×5（幂等，仅一次）
      if (!user.getDialogueFlag('chenxiBerryGiven')) {
        user.setDialogueFlag('chenxiBerryGiven', true);
        user.addItemToInventory({ name: '赤莓', num: 5 });
        emitter.emit('dungeonItemGain', { name: '赤莓', num: 5, img: 'chimei' });
      }
    },
    text: "他把一把果子塞进你怀里。（获得赤莓 ×5）",
    next: "ct04",
  },
  ct04: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……谢谢。",
    next: "ct05",
  },
  ct05: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "吃啊，愣着干嘛。……说起来，你现在肯定很迷茫吧，你有什么想问我的吗？",
    next: "ct05b",
  },
  ct05b: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……你们看我的眼神，都怪怪的。我是不是，长得像你们认识的谁？",
    next: "ct06",
  },
  ct06: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……你怎么突然问起他。",
    next: "ct07",
  },
  ct07: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "他嚼果子的动作慢了下来，好一会儿没说话。",
    next: "ct08",
  },
  ct08: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "他呀……是个很负责任的人。",
    next: "ct09",
  },
  ct09: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "他和你一样，也是突然出现的，不过他可没你这么迷茫，他知道自己的职责。",
    next: "ct10",
  },
  ct10: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "他曾满怀抱负，想要带领我们消灭魔物，收复家园。可惜……最后还是失败了。",
    next: "ct11",
  },
  ct11: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……他死了吗？",
    next: "ct12",
  },
  ct12: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "嗯。……你和他，长得几乎一模一样。",
    next: "ct13",
  },
  ct13: {
    name: "林恩1",
    playerSkin: "moren",
    text: "所以你第一次看见我，才会那么震惊吗？",
    next: "ct14",
  },
  ct14: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "说实话，刚看见你时，我还真以为他回来了。……可我知道，他回不来了。",
    next: "ct15",
  },
  ct15: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……抱歉。",
    next: "ct16",
  },
  ct16: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你为什么要道歉呀？",
    next: "ct17",
  },
  ct17: {
    name: "林恩1",
    playerSkin: "moren",
    text: "我……好像辜负了你们的期待。",
    next: "ct18",
  },
  ct18: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "好啦，别想太多了。虽然你不是他，但我也会好好保护你的。",
    next: "ct19",
  },
  ct19: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……谢谢你。",
    next: "ct20",
  },
  ct20: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你还真是客气。……话说，你有什么想做的吗？",
    next: "ct21",
  },
  ct21: {
    name: "林恩1",
    playerSkin: "moren",
    text: "我……不知道。",
    next: "ct22",
  },
  ct22: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "没事，好好在这待着吧。你来到这里肯定是有意义的，我会等你慢慢找到的。",
    next: "ct23",
  },
  ct23: {
    name: "林恩1",
    playerSkin: "moren",
    onEnter: () => {
      // 💗 完整对话结束，晨曦好感 +3（入口已用 ifNotCompleted 控制，仅一次）
      addJinmaoAffection(3);
    },
    text: "……好。",
    next: "ctEnd",
  },
  ctEnd: { end: 1 },

  // ===== 主线完成后：怎么了？（可重复，按好感分档问候） =====
  ct50: {
    autoNext: 0, // 无文本，按好感自动分流
    next: () => {
      const a = jinmaoAffection();
      if (a >= 60) return 'ct70a';
      if (a >= 30) return 'ct60a';
      return 'ct50a';
    },
  },
  // 好感 ≥ 60
  ct70a: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "哟，林恩1，又来找我啦？正好，我刚摘了点果子，尝尝？",
    options: [
      { text: "没事，我先走了。", next: "ct70z" },
    ],
  },
  ct70z: { end: 2 },
  // 好感 ≥ 30
  ct60a: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "哟，林恩1，有事？",
    options: [
      { text: "没事，我先走了。", next: "ct60z" },
    ],
  },
  ct60z: { end: 2 },
  // 默认
  ct50a: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "怎么了？",
    options: [
      { text: "没事，我先走了。", next: "ct50z" },
    ],
  },
  ct50z: { end: 2 },
};
