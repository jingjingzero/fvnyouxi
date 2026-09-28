/**
 * 云弥独立对话（yu-talk）：营地湖边点击云弥触发
 * loadData: 'npc/yu-talk'（tiled dialogLoadData 配置；dladmin 编辑器需在 FILES 数组登记 'yu-talk'）
 *
 * 流程：
 * - 第一次点击（yyEnd 未完成）→ 完整对话：看水 → 最强却不打魔物 → 「和我一起的人，都死了」→ 「别逞强」（一次性）
 * - 完成主线后点击（可重复）→ 按好感分档问候，选项离开
 *
 * tiled 触发数组建议：
 *   [
 *     { ifNotCompleted: 'yyEnd', name: 'yy01' },  // 主线未完成 → 完整对话
 *     { name: 'yy50' },                            // 主线完成后 → 分档问候
 *   ]
 *
 * 人称：旁白统一第二人称「你」；玩家说话人显示「林恩1」（默认名，可自定义）。
 * 云弥人设：外冷内热、极度沉默、被动；认为林恩1是又一个被主神制造的牺牲品，心疼但不表达。
 * 立绘：云弥 onStage: "yu"（默认皮肤，可在编辑器换）；玩家 playerSkin: "moren"。
 */
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

// 💗 云弥好感（npcSelectList 里 yu 的 affection）
function addYuAffection(n) {
  const npc = user.pixi?.npcSelectList?.find(x => x.img === 'yu');
  if (npc) npc.affection = (npc.affection || 0) + n;
}
function yuAffection() {
  return user.pixi?.npcSelectList?.find(x => x.img === 'yu')?.affection || 0;
}

export default {
  // ===== 第一次点击：完整对话（一次性） =====
  yy01: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "他坐在湖边，望着水面，不知道看了多久。你走过去，他早就发现了你，但没有理你。",
    next: "yy02",
  },
  yy02: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……你在看什么？",
    next: "yy03",
  },
  yy03: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……水。",
    next: "yy04",
  },
  yy04: {
    name: "林恩1",
    playerSkin: "moren",
    text: "水有什么好看的？",
    next: "yy05",
  },
  yy05: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……它能看到自己。",
    next: "yy06",
  },
  yy06: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "你没听懂，但他没有解释的意思。你在他旁边站了一会儿，他也没赶你走。",
    next: "yy07",
  },
  yy07: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……你喜欢一个人独处吗？",
    next: "yy08",
  },
  yy08: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……嗯。",
    next: "yy09",
  },
  yy09: {
    name: "林恩1",
    playerSkin: "moren",
    text: "晨曦说，你是他们里最强的。",
    next: "yy10",
  },
  yy10: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……嗯。",
    next: "yy11",
  },
  yy11: {
    name: "林恩1",
    playerSkin: "moren",
    text: "那你，为什么不去打魔物？",
    next: "yy12",
  },
  yy12: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "他沉默了很久。久到你以为他不会回答了。",
    next: "yy13",
  },
  yy13: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……打过。",
    next: "yy14",
  },
  yy14: {
    name: "林恩1",
    playerSkin: "moren",
    text: "那现在呢？",
    next: "yy15",
  },
  yy15: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……都死了。",
    next: "yy16",
  },
  yy16: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……什么？",
    next: "yy17",
  },
  yy17: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "和我一起的人。都死了。",
    next: "yy18",
  },
  yy18: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "他说完这句话，又转回去看水，像是刚才那些话不是他说的一样。",
    next: "yy19",
  },
  yy19: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……对不起。",
    next: "yy20",
  },
  yy20: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……是我的问题。",
    next: "yy21",
  },
  yy21: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "他顿了顿。你听见他补了一句，声音很轻，几乎被风吹散。",
    next: "yy22",
  },
  yy22: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……你，别跟他们一样。",
    next: "yy23",
  },
  yy23: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……一样什么？",
    next: "yy24",
  },
  yy24: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……逞强。",
    next: "yy25",
  },
  yy25: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    onEnter: () => {
      // 💗 完整对话结束，云弥好感 +3（入口已用 ifNotCompleted 控制，仅一次）
      addYuAffection(3);
    },
    text: "他没有再开口。你站在他旁边，很久，水面只荡开他一个人的影子。可你知道，那句“别逞强”，是他今天说过最长的话。",
    next: "yyEnd",
  },
  yyEnd: { end: 1 },

  // ===== 主线完成后：分档问候（可重复） =====
  yy50: {
    autoNext: 0, // 无文本，按好感自动分流
    next: () => {
      const a = yuAffection();
      if (a >= 60) return 'yy70a';
      if (a >= 30) return 'yy60a';
      return 'yy50a';
    },
  },
  // 好感 ≥ 60
  yy70a: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……水还是那水。你，坐吧。",
    options: [
      { text: "……好。", next: "yy70z" },
    ],
  },
  yy70z: { end: 2 },
  // 好感 ≥ 30
  yy60a: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……嗯。又来了。",
    options: [
      { text: "……走了。", next: "yy60z" },
    ],
  },
  yy60z: { end: 2 },
  // 默认
  yy50a: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……有事？",
    options: [
      { text: "没事，你先忙。", next: "yy50z" },
    ],
  },
  yy50z: { end: 2 },
};
