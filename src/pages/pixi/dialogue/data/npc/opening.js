/**
 * 初始剧情（opening），主神创造第 99 位天命者（默认名「林恩1」，玩家可自定义）
 * loadData: 'npc/opening'（tiled dialogLoadData 配置；dladmin 编辑器需在 FILES 数组登记 'opening'）
 *
 * 剧情流程（一次性主线，按幕推进）：
 *   op01-04  幕1 创造与赐名（主神：不命令，只祝福）
 *   op05-12  幕2 空中化身 · 坠落（球体在下坠途中化为兽人，落地即第 98 位模样）
 *   op13-20  幕3 独自一人（幽暗森林：醒来 → 认识自己的身体 → 第一次开口 → 星印微光 → 主神声音碎片）
 *   第二章：自由行动 → 森林中遇见商人「莫奇」（问名字 / 指路安全点）→ 传送点遇晨曦
 *
 * 人称：旁白统一第二人称「你」；主角开口节点说话人显示「？？」（身份未知），
 *       待后续剧情揭示名字后再改回「林恩1」。
 *
 * 立绘说明：
 *   - 主神 onStage: 'op_god'（占位，需在项目 loadAssets 注册主神立绘，或先在编辑器改）
 *   - 主角为玩家视角（playerSkin）；落地时已是第 98 位模样的兽人，主角立绘需按 98 位样式制作/占位
 */
import { useCounterStore } from "@/store/counter";
import { emitter } from './jingling-shared.js';
const user = useCounterStore();

export default {
  // ===== 幕1 · 创造与赐名（主神） =====
  op01: {
    name: "主神",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "第九十九次了。前九十八次，我都让你为了我去战斗。这一次... 我只想让你好好活着。",
    showCg: "cgspine",
    cgSkin: "one/cg1",
    next: "op02",
  },
  op02: {
    name: "主神",
    text: "去吧，替我再好好看看这个世界。",
    next: "op03",
  },
  op03: {
    name: "主神",

    text: "我给你取名叫林恩1，愿你在最后的这段时间里，能幸福地活下去。",
    next: "op05",
  },

  // ===== 幕2 · 空中化身 · 坠落 =====
  op05: {
    name: "旁白",
    text: "蓝翼轻轻一扬，淡紫色的光球被送入世界，坠向那片还明亮着的大地。",
    cgResume: true,
    next: "op10",
  },
  op10: {
    name: "旁白",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "光球划破清晨。下坠途中，那团淡紫色的光团，一点一点地舒展。绒毛、四肢、五官，你在空中凝成了一个人形的轮廓。",
    cgResume: true,
    next: "op11",
  },
  op11: {
    name: "旁白",
    text: "微风中，你第一次有了感觉，风擦过你的皮毛，又冷，又新鲜。",
    next: "op12",
  },
  op12: {
    name: "旁白",
    text: "直到你稳稳地被那股神秘的力量轻放到草地上。",
    next: "op13",
    cgSkin: "one/cg2",
    cgRestart: true,
  },

  // ===== 幕3 · 独自一人（幽暗森林，不遇到任何 NPC） =====
  op13: {
    name: "旁白",
    text: "过了一会，你撑着身子坐起来。低头，是陌生的手；抬头，是陌生的树影和漏下来的月光。",
    next: "op14",
  },
  op14: {
    name: "旁白",
    text: "你试着站起来，腿有些发软。你摸了摸自己的耳朵，又捏了捏毛茸茸的尾巴尖，温热的，活着的。可你对它们一无所知。",
    next: "op15",
  },
  op15: {
    name: "？？",
    playerSkin: "moren",
    text: "…… 我？",
    next: "op16",
  },
  op16: {
    name: "旁白",
    text: "这是你第一次开口说话。声音又轻又哑，像刚学会鸣叫的雏鸟，把自己也吓了一跳。",
    next: "op17",
  },
  op17: {
    name: "旁白",
    text: "你摊开手掌，掌心里有一点很淡的光，一闪，一闪，像在回应你。可你一眨眼，它就藏了起来。",
    next: "op18",
  },
  op18: {
    name: "旁白",
    text: "隐隐约约，你记起一个声音。很温柔，说：“去看看这个世界……好好活着。”可你再想，又什么都想不起来了。",
    next: "op19",
  },
  op19: {
    name: "旁白",
    text: "你靠着树根坐下来，抱着膝盖。夜风很凉，可你的心是暖的，虽然你说不上为什么。",
    next: "op20",
  },
  op20: {
    name: "旁白",
    text: "远处有火光在跳，像有人守着夜。今夜，你一个人。明天的事，明天再说。",
    next: "opEnd",
  },

  // ===== 结尾（一次性完成）：序章播完 → 直接进入地牢 =====
  opEnd: {
    onEnter: () => {
      emitter.emit('skipToDungeon'); // matter.vue 监听该事件 → toggleDungeon 打开地牢
    },
    end: 1,
  },
};
