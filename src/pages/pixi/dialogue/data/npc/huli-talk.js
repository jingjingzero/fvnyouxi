/**
 * 西亚独立对话（huli-talk）：营地药棚点击西亚触发
 * loadData: 'npc/huli-talk'（tiled dialogLoadData 配置；dladmin 编辑器需在 FILES 数组登记 'huli-talk'）
 *
 * 流程：
 * - 第一次点击（xhEnd 未完成）→ 完整对话：配药 → 玩家察觉他躲闪 → 「和你无关」→ 收尾医嘱（一次性）
 * - 完成主线后点击（可重复）→ 按好感分档问候，选项离开
 *
 * tiled 触发数组建议：
 *   [
 *     { ifNotCompleted: 'xhEnd', name: 'xh01' },  // 主线未完成 → 完整对话
 *     { name: 'xh50' },                            // 主线完成后 → 分档问候
 *   ]
 *
 * 人称：旁白统一第二人称「你」；玩家说话人显示「林恩1」（默认名，可自定义）。
 * 西亚人设：演技好、收敛情绪、不轻易破防；林恩（第98位）曾是他的救命恩人，献祭那天他忘不了。
 * 立绘：西亚 onStage: "huli"（默认皮肤，可在编辑器换）；玩家 playerSkin: "moren"。
 */
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

// 💗 西亚好感（npcSelectList 里 huli 的 affection）
function addHuliAffection(n) {
  const npc = user.pixi?.npcSelectList?.find(x => x.img === 'huli');
  if (npc) npc.affection = (npc.affection || 0) + n;
}
function huliAffection() {
  return user.pixi?.npcSelectList?.find(x => x.img === 'huli')?.affection || 0;
}

export default {
  // ===== 第一次点击：完整对话（一次性） =====
  xh01: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……是你。找我有事？先说好诶，我手头正忙着。",
    next: "xh02",
  },
  xh02: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……没，就是路过。你在做什么？",
    next: "xh03",
  },
  xh03: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "配药。这林子毒物多，多准备点没坏处。",
    next: "xh04",
  },
  xh04: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "他手上没停，动作利落，像早就习惯一边说话一边干活。",
    next: "xh05",
  },
  xh05: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "住得还习惯吗？有什么缺的吗？",
    next: "xh06",
  },
  xh06: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……嗯。你，是不是不太想见到我？",
    next: "xh07",
  },
  xh07: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "他手上顿了一下，只有一下，很快又动起来。",
    next: "xh08",
  },
  xh08: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "你怎么会这么想呢，你是客人，我很欢迎你。",
    next: "xh09",
  },
  xh09: {
    name: "林恩1",
    playerSkin: "moren",
    text: "你那天，抱着我，喊了林恩。",
    next: "xh10",
  },
  xh10: {
    name: "林恩1",
    playerSkin: "moren",
    text: "他是个怎么样的人？",
    next: "xh11",
  },
  xh11: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "他沉默了很久。久到你以为他不会回答了。",
    next: "xh12",
  },
  xh12: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……和你无关。",
    next: "xh13",
  },
  xh13: {
    name: "林恩1",
    playerSkin: "moren",
    text: "他……对你很重要吗？",
    next: "xh14",
  },
  xh14: {
    name: "林恩1",
    playerSkin: "moren",
    text: "抱歉……辜负了你的期待。",
    next: "xh15",
  },
  xh15: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "他手里的药杵停在半空。这一次，他没有很快接话。",
    next: "xh16",
  },
  xh16: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……是我认错人了，和你没关系，你不需要对我道歉。",
    next: "xh17",
  },
  xh17: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……那我，先走了。",
    next: "xh18",
  },
  xh18: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "你还没走远，身后忽然又传来他的声音，很轻。",
    next: "xh19",
  },
  xh19: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "有哪里不舒服的话，记得来找我。",
    next: "xh20",
  },
  xh20: {
    name: "林恩1",
    playerSkin: "moren",
    onEnter: () => {
      // 💗 完整对话结束，西亚好感 +2（入口已用 ifNotCompleted 控制，仅一次）
      addHuliAffection(2);
    },
    text: "……好。",
    next: "xhEnd",
  },
  xhEnd: { end: 1 },

  // ===== 主线完成后：分档问候（可重复） =====
  xh50: {
    autoNext: 0, // 无文本，按好感自动分流
    next: () => {
      const a = huliAffection();
      if (a >= 60) return 'xh70a';
      if (a >= 30) return 'xh60a';
      return 'xh50a';
    },
  },
  // 好感 ≥ 60
  xh70a: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……嗯。伤口好点了吗？记得按时上药，别仗着年轻硬扛。",
    options: [
      { text: "没事，我先走了。", next: "xh70z" },
    ],
  },
  xh70z: { end: 2 },
  // 好感 ≥ 30
  xh60a: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "又来了？这回是哪儿刮的伤，还是哪根筋又搭错了？",
    options: [
      { text: "没事，我先走了。", next: "xh60z" },
    ],
  },
  xh60z: { end: 2 },
  // 默认
  xh50a: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……有事？没事我要忙了。",
    options: [
      { text: "没事，我先走了。", next: "xh50z" },
    ],
  },
  xh50z: { end: 2 },
};
