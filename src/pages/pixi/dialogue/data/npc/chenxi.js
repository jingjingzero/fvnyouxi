/**
 * 晨曦初见（chenxi），第 99 位天命者（默认名「林恩1」，玩家可自定义）在传送阵初遇晨曦
 * loadData: 'npc/chenxi'（tiled dialogLoadData 配置；dladmin 编辑器需在 FILES 数组登记 'chenxi'）
 *
 * 剧情流程（一次性主线，按幕推进）：
 *   cl01-10  传送阵初见：晨曦从背后搭肩 → 惊愕喊「林恩」→ 认脸却不相认 → 玩家警惕后退
 *   cl11-15  晨曦自我介绍 + 玩家自报名字 + 「跟我走吧，我会保护你的」→ 选项
 *   cl16     选项①：问「林恩是谁」→ 晨曦：一个朋友（故人暗线）
 *   cl17     选项②：问安全点 → 晨曦带路
 *   cl19     路上：晨曦试探记忆 → 玩家提到莫奇与赤莓
 *   cl20     到达营地（界木）→ 结束（后续遇西亚、云弥，待续）
 *
 * 人称：旁白统一第二人称「你」。
 * ⚠️ 名字区分：玩家默认名「林恩1」（实际为玩家自定义名）；晨曦/西亚喊的「林恩」是故人（第 98 位）的名字
 */
import { useCounterStore } from "@/store/counter";
import emitter from "@/bus";
import { createNPC } from './jingling-shared.js';
import { createWenhaoHudong } from '@/pages/pixi/matter1/daoju.js';
const user = useCounterStore();

// 💗 晨曦好感（npcSelectList 里 jinmao 的 affection）
function addJinmaoAffection(n) {
  const npc = user.pixi?.npcSelectList?.find(x => x.img === 'jinmao');
  if (npc) npc.affection = (npc.affection || 0) + n;
}

export default {
  // ===== 传送阵初见 =====
  cl01: {
    name: "旁白",
    onEnter: () => {
      // 🌀 传送到地图中间（营地区域，Y 保持不变）
      emitter.emit('movePlayerTo', { xPercent: 0.5, direction: 1 });
      // 🦊 创建晨曦/云弥/西亚（参考 zz116 写法；已存在则重建，幂等）
      createNPC({ id: 1, juese: 'jinmao', player: 3, mapId: 'desert_01', x: 0.45, y: 0.72, direction: 1, TopMap: 0, data: { name: '晨曦' }, idleNames: ['idle2'], idleMinInterval: 1000, idleMaxInterval: 2000 });
      createNPC({ id: 2, juese: 'yu', player: 3, mapId: 'desert_01', x: 0.8, y: 0.72, direction: -1, TopMap: 0, data: { name: '云弥' }, shadowConfig: { offsetX: 0.5, offsetY: 0 }, idleNames: ['idle2'], idleMinInterval: 1000, idleMaxInterval: 2000 });
      createNPC({ id: 3, juese: 'huli', player: 3, mapId: 'desert_01', x: 0.3, y: 0.72, direction: 1, TopMap: 1, data: { name: '西亚' }, idleNames: ['idle2'], idleMinInterval: 1000, idleMaxInterval: 2000 });
      // 💬 三个问号跟随各自头顶（cl01 完成后点击进日常对话）
      createWenhaoHudong({ id: 'chenxi_head', mapId: 'desert_01', x: 0.45, y: 0.72, textureName: 'duihua', wuxian: -1, isFloatEnable: true, followNpcId: 1, followOffsetY: 45, clickData: { loadData: 'npc/chenxi-talk', route: [{ ifCompleted: 'cl01', name: 'ct01' }] } });
      createWenhaoHudong({ id: 'yunmi_head', mapId: 'desert_01', x: 0.8, y: 0.72, textureName: 'duihua', wuxian: -1, isFloatEnable: true, followNpcId: 2, followOffsetY: 45, clickData: { loadData: 'npc/yu-talk', route: [{ ifCompleted: 'cl01', name: 'yy01' }] } });
      createWenhaoHudong({ id: 'xiya_head', mapId: 'desert_01', x: 0.3, y: 0.72, textureName: 'duihua', wuxian: -1, isFloatEnable: true, followNpcId: 3, followOffsetY: 45, clickData: { loadData: 'npc/huli-talk', route: [{ ifCompleted: 'cl01', name: 'xh01' }] } });
    },
    text: "你眼前一晃，再站稳时，四周已经是安静的林间空地。你还没看清周围，一只手忽然搭上了你的肩。",
    next: "cl02",
  },
  cl02: {
    name: "旁白",
    text: "你吓得浑身一激灵，猛地回头，警惕地瞪着眼前这个不认识的家伙。",
    next: "cl03",
  },
  cl03: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……林恩？",
    next: "cl04",
  },
  cl04: {
    name: "旁白",
    text: "他满脸不可置信地看着你，像见了鬼一样，眼睛瞪得溜圆。",
    next: "cl05",
  },
  cl05: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "林恩！你不是……你不是……",
    next: "cl06",
  },
  cl06: {
    name: "旁白",
    text: "你被他喊得愣住了。林恩？你不认识叫这个名字的人。你没接话，只是皱着眉，警惕地看着他。",
    next: "cl07",
  },
  cl07: {
    name: "旁白",
    text: "他的话被噎住了。他看着你，目光在你脸上仔仔细细扫了一遍，眉头渐渐拧起来。",
    next: "cl08",
  },
  cl08: {
    name: "旁白",
    text: "他没有多想，朝你走过来。你不认识他，下意识往后退。",
    next: "cl09",
  },
  cl09: {
    name: "旁白",
    text: "他走一步，你退一步。他停住了，你也停住。他站在原地，呆呆地看着你，眼里的光一点点暗下去。",
    next: "cl10",
  },
  cl10: {
    name: "旁白",
    text: "他没有再靠近，像是终于明白了什么。",
    next: "cl11",
  },
  cl11: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……你，不认识我？",
    next: "cl12",
  },
  cl12: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……你是谁？",
    next: "cl13",
  },
  cl13: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……我叫晨曦，正在附近巡逻。……你呢？你怎么会一个人在森林里？",
    next: "cl14",
  },
  cl14: {
    name: "林恩1",
    playerSkin: "moren",
    // ⚠️ 玩家名字默认「林恩1」（自定义名占位），故人「林恩」是晨曦/西亚喊的名字
    text: "……我叫林恩1，我……也不知道我为什么会在这里。",
    next: "cl15",
  },
  cl15: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "我明白了，跟我走吧，我会保护你的",
    options: [
      {
        text: "……你刚才叫的那个林恩，是谁？",
        next: "cl16a",
        onSelect: () => { addJinmaoAffection(3); },
      },
      {
        text: "你知道附近有安全点吗？",
        next: "cl17a",
        onSelect: () => { addJinmaoAffection(2); },
      },
    ],
  },

  // ===== 选项①：问「林恩是谁」（好感 +3） =====
  cl16a: {
    name: "旁白",
    text: "你站在原地，没有动，只是看着他的眼睛。",
    next: "cl16b",
  },
  cl16b: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……你刚才叫的那个林恩，是谁？",
    next: "cl16c",
  },
  cl16c: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……一个朋友。很久以前的事了。",
    next: "cl16d",
  },
  cl16d: {
    name: "旁白",
    text: "他说完，像是怕你再多问，转过了身。可你还是看见，他的尾巴轻轻垂了一下。",
    next: "cl16e",
  },
  cl16e: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "走吧，跟上。",
    next: "cl19a",
  },

  // ===== 选项②：问安全点（好感 +2） =====
  cl17a: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……你知道附近有安全点吗？有人说，这里能找到安全的地方。",
    next: "cl17b",
  },
  cl17b: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "安全点？我知道，跟我走吧。",
    next: "cl17c",
  },
  cl17c: {
    name: "旁白",
    text: "你犹豫了一下，还是跟了上去。他走在前面，步子迈得不大，像是怕你跟不上。",
    next: "cl19a",
  },

  // ===== 汇合：路上 =====
  cl19a: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你还能想起些什么吗？",
    next: "cl19b",
  },
  cl19b: {
    name: "林恩1",
    playerSkin: "moren",
    // ⚠️ 玩家名字默认「林恩1」（自定义名占位），故人「林恩」是晨曦/西亚喊的名字
    text: "……我知道自己叫林恩1，有人希望我能过得幸福。",
    next: "cl19c",
  },
  cl19c: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "这样呀……你身上的赤莓是捡的吗？",
    next: "cl19d",
  },
  cl19d: {
    name: "林恩1",
    playerSkin: "moren",
    text: "不，是莫奇给我的，他是个好人。",
    next: "cl19e",
  },
  cl19e: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "原来是他呀。",
    next: "cl20",
  },

  // ===== 到达营地 =====
  cl20: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "到了。前面那棵大树底下，就是营地。树叫界木，它的光能驱散魔物，你在这儿会很安全。",
    next: "cl21",
  },

  // ===== 遇见西亚（狐狸）与云弥（鱼） =====
  cl21: {
    name: "旁白",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "你还没看清营地里的景象，一道身影已经朝你冲了过来。",
    next: "cl22",
  },
  cl22: {
    name: "西亚",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "……林恩？！",
    next: "cl23",
  },
  cl23: {
    name: "旁白",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "你想逃，可他反应太快，没给你逃跑的时间，就扑过来把你紧紧抱住。他埋在你肩头，声音又哑又闷。",
    next: "cl24",
  },
  cl24: {
    name: "西亚",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "你没死……你没死！",
    next: "cl25",
  },
  cl25: {
    name: "西亚",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "谢谢神……把你还了回来。",
    next: "cl26",
  },
  cl26: {
    name: "旁白",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "你不知道该说什么，就这样有些僵硬地被他抱着。他的关切热得发烫，你手足无措，转头朝晨曦投去求救的目光。",
    next: "cl27",
  },
  cl27: {
    name: "晨曦",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "……西亚，这不是他。",
    next: "cl28",
  },
  cl28: {
    name: "西亚",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "不可能。这模样，这气味，我怎么可能认错……",
    next: "cl28b",
  },
  cl28b: {
    name: "旁白",
    blackScreen: true,
    text: "晨曦和你费了一番口舌，把事情从头解释了一遍。西亚抱着你的手慢慢松开，失望地垂下头。",
    next: "cl29",
  },
  cl29: {
    name: "西亚",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "……所以，我明白了。",
    next: "cl30",
  },
  cl30: {
    name: "旁白",
    onStage: ["jinmao", "huli"],
    playerSkin: "moren",
    text: "他松开你，往后退了半步。再看你时，眼里的热切已经淡了下去，只剩下礼貌的疏离。",
    next: "cl31",
  },
  cl31: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……你就是新的天选者？",
    next: "cl32",
  },
  cl32: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "天选者……那是什么？",
    next: "cl33",
  },
  cl33: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……",
    next: "cl34",
  },
  cl34: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "祂没有给你说过你的职责吗？",
    next: "cl35",
  },
  cl35: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……我记不起来了。",
    next: "cl36",
  },
  cl36: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "这倒是……罕见。你连自己该干什么都不知道。",
    next: "cl37",
  },
  cl37: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你说，有人希望你幸福地活下去……该不会是祂对你说的吧？",
    next: "cl38",
  },
  cl38: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "怎么可能？他们不过是祂的棋子。",
    next: "cl39",
  },
  cl39: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "这句话一出，众人都安静下来。你看看晨曦，又看看西亚和云弥，谁也说不清楚。",
    next: "cl40",
  },
  cl40: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "晨曦像是看出了你的疲惫，声音放轻了些。",
    next: "cl41",
  },
  cl41: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "好啦，他不是犯人，先让他好好休息。至于没搞明白的事，我们会慢慢弄清楚。",
    next: "cl42",
  },
  cl42: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "这话大家都赞同。西亚没再开口，云弥也没再多问，各自散了。",
    next: "cl42b",
  },
  cl42b: {
    name: "旁白",
    blackScreen: true,
    text: "说完后大家散了，给你留下独自思考的时间。",
    next: "cl43",
  },
  // 内心独白（全角括号心声格式）
  cl43: {
    name: "林恩1",
    playerSkin: "moren",
    text: "（他们好像把我认成别人了。可我什么都记不得了。）",
    next: "cl44",
  },
  cl44: {
    name: "林恩1",
    playerSkin: "moren",
    text: "（呐……希望我幸福活下去的人，难道真的是祂吗？）",
    next: "cl45",
  },

  // ===== 结尾（一次性完成，后续待续） =====
  cl45: { end: 1 },
};
