/**
 * 商人1 对话数据 · 地牢商人（tiled dungeon_objects id42）
 * loadData: 'npc/shangren1'（tiled dialogLoadData 配置）
 *
 * 流程：
 * - 首遇（xm01 未完成）→ 幽暗森林初见莫奇（问名 / 赤莓 / 指路 / 请求同行，一次性）
 * - 二次遇见（sr01 未完成）→ 莫奇认出你（你还活着？/ 还记得我？，一次性）
 * - 携带晨曦见莫奇（mjEnd 未完成）→ 晨曦线（莫奇指路的因果 / 里亚下落 / 玩家想帮忙 / 赠 LV2 魔晶，一次性）
 * - 提交线索（sr10 菜单选项，按携带分流：晨曦线 mjrEnd / 西亚线 mhrEnd / 云弥线 myrEnd，完成对应城堡幕8后解锁）→ 告知莫奇里亚可能在城堡（莫奇想起里亚提过 / 自责 / 亮出开锁本事 / 约定下次同行，一次性）
 * - 之后进入 → sr100 中转 → 直接「买卖 / 离开」（sr10）
 * - 买卖 → 打开商店并结束对话；离开（仅首次）→ 欢迎台词
 *
 * 立绘头像：onStage: "shangren1" → shangren1head_skel（loadAssets 已注册）
 * 表情切换：npcSkin（moren1 / moren / jingit / daxiao1）
 */
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
import { cond } from "@/pages/pixi/dialogue/condition.js";
const user = useCounterStore();

// 🏪 清除「最近一次商店操作」标记：sr10 显示完「买了 / 没买」对应文本后即清除，
//   下次再进入对话回到好感度开场，避免跨地牢 / 读档残留
function _clearShopMarkers() {
  queueMicrotask(() => {
    user.setDialogueFlag('shangrenShopOpenedAt', 0);
    user.setDialogueFlag('shangrenBoughtAt', 0);
    user.setDialogueFlag('shangrenSoldAt', 0);
    user.setDialogueFlag('shangrenBigBuyAt', 0);
  });
}

// 🎒 添加「寻找失踪的里亚」任务（仅添加一次，幂等）
function addLiyaTask() {
  const all = [...(user.allTasks?.mainTasks || []), ...(user.allTasks?.sideTasks || [])];
  if (all.some(t => t.name === '寻找失踪的里亚')) return;
  user.addTask?.({
    id: 'find_liya',
    name: '寻找失踪的里亚',
    description: '里亚是莫奇的同伴，七天前前往地牢深处贸易后失踪。在地牢深处找到它，带它回去见莫奇。',
    steps: [
      { id: 'find', content: '在地牢深处找到失踪的里亚' },
      { id: 'return', content: '带里亚回去和商人莫奇对话' },
    ],
  }, 'side');
}

export default {
  // ===== 首遇：幽暗森林初见莫奇（一次性） =====
  // 入口触发数组：[{ifNotCompleted:'xm01', name:'xm01'}, {ifNotCompleted:'sr01', name:'sr01'}, {name:'sr100'}]
  //   → xm01 首遇（未完成先播）→ sr01 二次遇见（首遇完成后播）→ sr100 买卖菜单
  // 莫奇移动：xm01 onEnter 触发 dialogueMoveNpc 且 col/row=-1 → 商人走到玩家面前（dungeon 侧解析）
  xm01: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    // onEnter: () => {
    //   // 🚶 商人迎到玩家面前（-1 = 玩家面前格，dungeon 侧解析）
    //   emitter.emit('dialogueMoveNpc', [{ npcId: 42, col: -1, row: -1, speed: 5 }]);
    // },
    autoNext: 0, // 无文本：莫奇走到面前后立即进入 xm02
    next: "xm02",
  },
  xm02: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "哎！活人！我是商人莫奇，有什么需要的吗？",
    showCg: "cgspine",
    cgSkin: "one/cg3",
    next: "xm03",
  },
  xm03: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……等等。我从来没在附近见过你。你是从哪儿来的？",
    next: "xm04",
  },
  xm04: {
    name: "旁白",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "莫奇的目光在你脸上停了一会儿，像是在看一件他看不太懂的东西，但你没有理他。片刻后，他移开眼，挠了挠头，没再往下问。",
    next: "xm06",
  },
  xm06: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "啧，瞧你这眼神，就像刚出生似的。这森林边上，可不是小哥你这样的人该来的。",
    next: "xm07",
  },
  xm07: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "……算了，看你这副模样，怕是连一个金币都没有。喏，拿着。",
    next: "xm08",
  },
  xm08: {
    name: "旁白",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "他从小背包里抓了一把赤红饱满的莓果，塞进你手里。",
    cgSkin: "one/cg4",
    next: "xm09",
  },
  xm09: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    onEnter: () => {
      // 🍓 首遇赠送赤莓 ×3（幂等，仅一次）
      if (!user.getDialogueFlag('xmBerryGiven')) {
        user.setDialogueFlag('xmBerryGiven', true);
        user.addItemToInventory({ name: '赤莓', num: 3 });
        emitter.emit('dungeonItemGain', { name: '赤莓', num: 3, img: 'chimei' });
      }
    },
    text: "吃吧，先垫垫肚子，算我请你的。",
    next: "xm10",
  },
  xm10: {
    name: "旁白",
    text: "你低头看着手里的赤莓，红彤彤的，甜香直往鼻子里钻。",
    next: "xm10b",
  },
  xm10b: {
    name: "旁白",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "你并没有在他身上感受到恶意，你尝试着咬了一口，酸甜的汁水在舌尖化开……这是你在这个世界吃的第一口东西，竟意外的不错。",
    cgSkin: "one/cg5",
    next: "xm11",
  },
  xm11: {
    name: "？？",
    playerSkin: "moren",
    text: "……谢谢。",
    next: "xm12",
  },
  xm12: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "我叫莫奇，在这森林边上做点小买卖。你呢，叫什么名字？",
    options: [
      {
        text: "（回答）……林恩1。",
        next: "xm14",
        onSelect: () => {
          user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 3);
        },
      },
      {
        text: "（警惕）你是谁？",
        next: "xm12b1",
      },
    ],
  },

  // ===== 首遇分支：警惕（不加好感，汇合到名字） =====
  xm12b1: {
    name: "旁白",
    text: "你没有回答，反而后退了半步，警惕地盯着他。",
    showCg: "",
    next: "xm12b2",
  },
  xm12b2: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "嘿，你个小家伙，还挺有警觉？放心吧，我不会伤害你的，你该庆幸遇到的是我，而不是森林里的魔物。",
    next: "xm12b3",
  },
  xm12b3: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "好了，不逗你了。可我总不能一直叫你“喂”吧。名字总得有一个。",
    next: "xm12b4",
  },
  xm12b4: {
    name: "旁白",
    text: "你张了张嘴。可就在那一瞬，一个词自己冒了上来，好像它本来就在那儿，等着你说出口。",
    next: "xm14",
  },

  // ===== 首遇：名字（回答分支汇合点） =====
  xm14: {
    name: "林恩1",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "……林恩1。",
    showCg: "",
    next: "xm15",
  },
  xm15: {
    name: "旁白",
    text: "你说完自己也愣住了。你不知道自己为什么知道这个名字，就像是深耕于脑海中的东西。",
    next: "xm16",
  },
  xm16: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "林恩1？行，我记住了。瞧着面生，名字倒是有意思，是你自己取的吗？",
    next: "xm17",
  },
  xm17: {
    name: "旁白",
    text: "你低下头，心里有点发慌。你到底是谁？为什么你会知道这个名字？可就在这时，你忽然记起一件事，一件很模糊的事：有个声音，很温柔，跟你说过，要好好活着。",
    next: "xm18",
  },
  xm18: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……不是我，有人希望我幸福地活下去。",
    next: "xm19",
  },
  xm19: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren" },
    text: "有人？那他人呢，怎么没陪着你？",
    next: "xm20",
  },
  xm20: {
    name: "旁白",
    text: "你张了张嘴，回答不上来。好一会儿，你才有些不知所措地开口。",
    next: "xm21",
  },
  xm21: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……我不知道。",
    next: "xm22",
  },
  xm22: {
    name: "旁白",
    text: "莫奇看着你，像是明白了什么。他没有再问，很快扯开话题，语气又变得热络起来。",
    next: "xm23",
  },
  xm23: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "daxiao1" },
    text: "嗐，瞧我，问这些做什么。来，我跟你说说这森林的事……",
    next: "xm23b",
  },
  // 🖤 黑屏讲解常识（blackScreen 全屏黑字）
  xm23b: {
    name: "旁白",
    blackScreen: true,
    text: "他跟你讲解了一些常识。",
    next: "xm24",
  },
  xm24: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "行了，这森林夜里可是很危险的，连我也得找安全地方躲着。沿着左边往南走，那有个安全点，你去那里寻求庇护吧。",
    next: "xm25",
  },
  xm25: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "记住了，别往深处去，会死的噢。",
    next: "xm26",
  },
  xm26: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "想做生意、打听消息，随时回来找我，我就在这森林边上。",
    options: [
      {
        text: "（请求同行）……我能跟着你吗？",
        next: "xm28",
        onSelect: () => {
          user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 3);
          user.setDialogueFlag('xmAskedFollow', true); // 🧭 记录：首遇请求过同行 → 二次遇见走关心线
        },
      },
      {
        text: "（离开）",
        next: "xmEnd",
        onSelect: () => {
          user.setDialogueFlag('xmLeftFirst', true); // 🧭 记录：首遇直接离开 → 二次遇见走寒暄线
        },
      },
    ],
  },

  // ===== 首遇：请求同行（好感 +3） =====
  xm28: {
    name: "旁白",
    text: "你站在原地，没动。你看着他，忽然问出一句连自己都没想明白的话。",
    next: "xm29",
  },
  xm29: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……我能，跟着你吗？",
    next: "xm30",
  },
  xm30: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren" },
    text: "……跟我？不行。",
    next: "xm31",
  },
  xm31: {
    name: "林恩1",
    playerSkin: "moren",
    text: "为什么？我不会给你添麻烦的，我会帮忙的。",
    next: "xm32",
  },
  xm32: {
    name: "旁白",
    text: "你不知道那里是不是更好。你只是觉得，眼前这个人是第一个对你伸出手的，你不想就这么走掉。",
    next: "xm33",
  },
  xm33: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "jingit" },
    text: "我护不住你。",
    next: "xm34",
  },
  xm34: {
    name: "旁白",
    text: "你有些难过。",
    next: "xm35",
  },
  xm35: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren" },
    text: "真的啦，别看我这样，其实我自己都照顾不好自己。",
    next: "xm36",
  },
  xm36: {
    name: "旁白",
    text: "你露出怀疑的眼神。",
    next: "xm37",
  },
  xm37: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "jingit" },
    text: "我哥……就是在这儿失踪的。",
    next: "xm38",
  },
  xm38: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "jingit" },
    text: "抱歉，我还得找他……",
    next: "xm39",
  },
  xm39: {
    name: "旁白",
    text: "他说得很轻，可你听得出，那句话里有愧疚。你忽然意识到自己太过了。",
    next: "xm40",
  },
  xm40: {
    name: "林恩1",
    playerSkin: "moren",
    text: "……对不起。是我想当然了。",
    next: "xm41",
  },
  xm41: {
    name: "莫奇",
    onStage: "shangren1",
    npcSkin: { "shangren1": "moren1" },
    text: "好吧，相信我，去到那里你绝对会满意的。",
    next: "xmEnd",
  },

  // ===== 首遇结束（一次性，完成即标记 xm01 完成） =====
  // 🧭 进入结束节点时通知地牢：首遇莫奇完成 → 指引切换为「前往安全点」（spawn 复活点）
  xmEnd: {
    end: 1,
    onEnter: () => { emitter.emit('dialogueGuideToSpawn'); },
  },

  // ===== 二次遇见（首遇 xm01 完成后，再次靠近莫奇触发；播完汇入 sr10 即标记完成） =====
  // 分流依据：首遇 xm26 的选择。请求过同行（xmAskedFollow）→ 关心线；直接离开 → 寒暄线
  sr01: {
    autoNext: 0, // 无文本，按首遇选择自动分流
    next: () => {
      if (user.getDialogueFlag('xmAskedFollow')) return 'sr02';
      return 'sr03';
    },
  },

  // ===== 关心线（首遇请求过同行：莫奇记得拒绝了你，又愧疚又牵挂） =====
  sr02: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "哎？！是你！你、你怎么回来了？你……你不是去安全点了吗？",
    next: "sr02b",
  },
  sr02b: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "等等，你该不会是……生我的气，跑回来的吧？那天我没带你走，你、你没难过吧？",
    next: "sr02b_1",
  },
  sr02b_1: {
    name: "林恩1",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "……没有。你说得对，我得自己学着长大。",
    next: "sr02b_2",
  },
  sr02b_2: {
    name: "莫奇",
    playerSkin: "moren",
    npcSkin: "moren1",
    text: "……你这话，说得还挺像回事。那你在安全点，待得还好吗？有没有人欺负你？吃饱了没？",
    next: "sr02b_3",
  },
  sr02b_3: {
    name: "林恩1",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "嗯，挺好的。……就是有时候，有点想找人说话。",
    next: "sr02b_4",
  },
  sr02b_4: {
    name: "莫奇",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "那、那你来找我啊。我一直在森林边上，哪儿也不去。……那天没能带上你，可我能陪你说话，还能给你留吃的。",
    next: "sr02b_5",
  },
  sr02b_5: {
    name: "林恩1",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "……好。",
    next: "sr02c",
  },
  sr02c: {
    name: "莫奇",
    playerSkin: "moren",
    npcSkin: "daxiao1",
    text: "那说好了！你要是又饿肚子了就来我这儿，赤莓管够！……不过别的还是要收钱的，你可别怪我小气。",
    next: "sr10",
  },

  // ===== 寒暄线（首遇直接离开：平平常常地再见面） =====
  sr03: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "哎？！是你！那个小家伙！你居然又回来了？我还以为你早把这地方忘了呢。",
    next: "sr03b",
  },
  sr03b: {
    name: "林恩1",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "……我回来了。",
    next: "sr03c",
  },
  sr03c: {
    name: "莫奇",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "回来就好。这地牢边上能多一个活着的朋友，我心里踏实多了。",
    next: "sr03c_1",
  },
  sr03c_1: {
    name: "莫奇",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "在安全点待得怎么样？夜里冷不冷？饿没饿着？",
    next: "sr03c_2",
  },
  sr03c_2: {
    name: "林恩1",
    playerSkin: "moren",
    npcSkin: "moren",
    text: "……谢谢你，莫奇。",
    next: "sr03c_3",
  },
  sr03c_3: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "嗐，谢什么。你好好活着，就是给我最大的谢礼啦。",
    next: "sr10",
  },

  // ===== 选项3：夸它厉害（好感 +5） =====

  // ===== 携带晨曦见莫奇（mjIn 入口分流，一次性，完成后回 sr100 买卖菜单） =====
  // 入口触发数组追加：{ ifNotCompleted: 'mjEnd', name: 'mjIn' }
  //   → 携带晨曦（getNpcAlly()==='jinmao'）→ 晨曦线；带西亚/云弥 → 暂走买卖（分支待写）；
  //     没带人 → sr01 二次遇见（未完成）或 sr100
  // 提交线索：由 sr10 菜单选项进入（mjrSel 按携带分流），无需额外触发条目
  mjIn: {
    autoNext: 0, // 无文本，按携带状态自动分流
    next: () => {
      const ally = user.getNpcAlly?.();
      if (ally === 'jinmao') return 'mj01';
      if (ally === 'huli') return 'mh01';
      if (ally === 'yu') return 'my01';
      if (user.isDialogueComplete?.('sr01')) return 'sr100';
      return 'sr01';
    },
  },

  // ===== 晨曦线：带晨曦见莫奇（莫奇指路 → 你到安全点 → 认识同伴的因果线） =====
  mj01: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "诶！晨曦哥！今天怎么有空过来？",
    next: "mj02",
  },
  mj02: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "出来转转，顺便看看你。今天好像收获不错？",
    next: "mj03",
  },
  mj03: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "嘿嘿，那是，今天我专门深入了一点……咦？",
    next: "mj04",
  },
  mj04: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "莫奇的目光落在你身上，眨了眨眼，认出了你。",
    next: "mj05",
  },
  mj05: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "这不是上回那个小哥吗？看来你找到了我说的安全点呢。",
    next: "mj06",
  },
  mj06: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "嗯，他现在是我们的一员了。",
    next: "mj07",
  },
  mj07: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "daxiao1" },
    text: "真的呀？那敢好！",
    next: "mj08",
  },
  mj08: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……很感谢你当时为我指路。",
    next: "mj09",
  },
  mj09: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "嗐，就顺手一指的事。",
    next: "mj10",
  },
  mj10: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "话说，你为什么不加入我们呢。",
    next: "mj11",
  },
  mj11: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "人越多的话，越会吸引来强大的魔物，我可不想害了你们。",
    next: "mj12",
  },
  mj12: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "别小看我呀，我还是很强的。",
    next: "mj13",
  },
  mj13: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "我知道，但我现在就活得挺好的，所以，不用啦。",
    next: "mj14",
  },
  mj14: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "对了，里亚，有消息了吗？",
    next: "mj15",
  },
  mj15: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "提到里亚，莫奇难过得摇了摇头。",
    next: "mj16",
  },
  mj16: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "我今天深入了一点，但还是没有一点消息。",
    next: "mj17",
  },
  mj17: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "你小心点吧，毕竟你不擅长战斗，以后还是别深入了。",
    next: "mj18",
  },
  mj18: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "我会帮你留意着的，一有消息就来找你。",
    next: "mj19",
  },
  mj19: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "嗯，我知道了，谢谢你。",
    next: "mj20",
  },
  mj20: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "莫奇还是有些萎靡的样子。",
    next: "mj21",
  },
  mj21: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……莫奇。",
    next: "mj22",
  },
  mj22: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "嗯？",
    next: "mj23",
  },
  mj23: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "你哥，他是在哪里不见的？我帮你找。",
    next: "mj24",
  },
  mj24: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "jingit" },
    text: "……你？这对你来说太危险了。",
    next: "mj25",
  },
  mj25: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "林恩1，我知道你心好，可里亚失踪那片林子，太深入了，连我都不敢深入。你不许去。",
    next: "mj26",
  },
  mj26: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "可是我想帮他，我不想他一直这样傻等，也不想明天看不到他了。",
    next: "mj27",
  },
  mj27: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……",
    next: "mj28",
  },
  mj28: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "我想去看看。只看一眼，不行就回来。",
    next: "mj29",
  },
  mj29: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……你真是，算了，既然你想的话，我会陪着你的。",
    next: "mj30",
  },
  mj30: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "就是千万别告诉西亚，不然他下次肯定不肯我和你单独出去了。",
    next: "mj31",
  },
  mj31: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "好，一言为定。",
    next: "mj32",
  },
  mj32: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……行，我带你去。但说好了，有危险就回头。",
    next: "mj33",
  },
  mj33: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "莫奇愣愣地看着你们，像是没反应过来。",
    next: "mj34",
  },
  mj34: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "你……你们是说真的？",
    next: "mj35",
  },
  mj35: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "嗯。",
    next: "mj36",
  },
  mj36: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "莫奇张了张嘴，眼眶一下子有些微红。他别过脸，好一会儿才找回声音。",
    next: "mj37",
  },
  mj37: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "……为什么？我们才见过几面，你为什么要这样帮我？",
    next: "mj38",
  },
  mj38: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "因为你是我有记忆以来，第一个对我好的人。",
    next: "mj39",
  },
  mj39: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "我想报答你。",
    next: "mj40",
  },
  mj40: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "莫奇愣住了。他低着头，耳朵抖了抖，声音闷闷的。",
    next: "mj41",
  },
  mj41: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "……你这人，还真是单纯。",
    next: "mj42",
  },
  mj42: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "他翻找了好一会儿，从摊子底下摸出一个灰扑扑的小袋子，郑重地塞进你手里。",
    next: "mj43",
  },
  mj43: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "这个给你，是我攒了好久的宝贝。",
    next: "mj44",
  },
  mj44: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    onEnter: () => {
      // 💎 赠送 LV2 魔晶 ×1（幂等，仅一次）
      if (!user.getDialogueFlag('mjCrystalGiven')) {
        user.setDialogueFlag('mjCrystalGiven', true);
        user.addItemToInventory({ name: '魔晶LV2', num: 1 });
        emitter.emit('dungeonItemGain', { name: '魔晶LV2', num: 1, img: 'redCrystalT2' });
      }
    },
    text: "你打开袋子，里面躺着一颗流转着幽蓝光泽的魔晶。",
    next: "mjEnd",
  },
  mjEnd: { end: 1 },

  // ===== 提交线索：完成幕8城堡后，sr10 菜单解锁「提交线索」选项 → mjrSel 按携带分流（一次性） =====
  mjrSel: {
    autoNext: 0, // 无文本，按携带状态自动分流
    next: () => {
      const ally = user.getNpcAlly?.();
      if (ally === 'jinmao') return 'mjr01'; // 晨曦线
      if (ally === 'huli') return 'mhr01'; // 西亚线
      if (ally === 'yu') return 'myr01'; // 云弥线
      return 'sr10';
    },
  },
  mjr01: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……莫奇，我们有里亚的线索了。",
    next: "mjr02",
  },
  mjr02: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "真的吗？他人呢，还好吗？",
    next: "mjr03",
  },
  mjr03: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "这……我们也不太清楚。",
    next: "mjr04",
  },
  mjr04: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "林子最深处有座城堡，晨曦在门口闻到了里亚的气味。",
    next: "mjr05",
  },
  mjr05: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "很淡，但确实是他的。门从里面锁死了，我们进不去。",
    next: "mjr06",
  },
  mjr06: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "那里吗……对，我想起来了。",
    next: "mjr07",
  },
  mjr07: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "里亚跟我说过，他发现了一个不错的地方。",
    next: "mjr08",
  },
  mjr08: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……我早该想到的，他说过那个地方。",
    next: "mjr09",
  },
  mjr09: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "或许就是那里吧，没想到……",
    next: "mjr10",
  },
  mjr10: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……他还活着吗？",
    next: "mjr11",
  },
  mjr11: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……我也不知道。",
    next: "mjr12",
  },
  mjr12: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "没有闻到血腥味，应该还活着。只是门锁着，里面什么情况，看不出来。",
    next: "mjr13",
  },
  mjr13: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……他被关在里面了？是不是有人把他关起来的……",
    next: "mjr14",
  },
  mjr14: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……不好说，或许是魔物把他当作储备粮了呢。",
    next: "mjr15",
  },
  mjr15: {
    name: "旁白",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "莫奇的表情僵了一下。",
    next: "mjr16",
  },
  mjr16: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "……我瞎说的，别当真。",
    next: "mjr17",
  },
  mjr17: {
    name: "林恩1",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "肯定会没事的，我们再想想办法。",
    next: "mjr18",
  },
  mjr18: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……我要去看看。",
    next: "mjr19",
  },
  mjr19: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "不行。",
    next: "mjr20",
  },
  mjr20: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "那是我哥！",
    next: "mjr21",
  },
  mjr21: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "正因为是你哥，你才更不能去。你完全没有战斗力，去了也只会添乱。",
    next: "mjr22",
  },
  mjr22: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……",
    next: "mjr23",
  },
  mjr23: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "路我摸到了。下次再去，我会想办法把门弄开，把人带回来。",
    next: "mjr24",
  },
  mjr24: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……真的能带回来吗？",
    next: "mjr25",
  },
  mjr25: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "我什么时候骗过你。",
    next: "mjr26",
  },
  mjr26: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……下次带上我吧，我会开锁。",
    next: "mjr27",
  },
  mjr27: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "你还会这种事？",
    next: "mjr28",
  },
  mjr28: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "到处漂泊，总要有一些本事在身上。",
    next: "mjr29",
  },
  mjr29: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "可是很危险，我没把握保护好你。",
    next: "mjr30",
  },
  mjr30: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "我会照顾好自己的，我也不是靠运气活到现在的。",
    next: "mjr31",
  },
  mjr31: {
    name: "莫奇",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "而且，我也要亲自去收拾抓走我哥的混蛋。",
    next: "mjr32",
  },
  mjr32: {
    name: "晨曦",
    onStage: ["shangren1", "jinmao"],
    playerSkin: "moren",
    text: "好，那下次我们一起去。",
    next: "mjrEnd",
  },
  mjrEnd: { end: 1 },

  // ===== 西亚线提交线索：携带西亚 + 城堡西亚线完成（mzhEnd）→ 告知莫奇里亚下落（一次性） =====
  mhr01: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……莫奇，我们可能找到里亚的线索了。",
    next: "mhr02",
  },
  mhr02: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "真的？他、他还好吗？",
    next: "mhr03",
  },
  mhr03: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……我们也不太确定。",
    next: "mhr04",
  },
  mhr04: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "我们在深林里发现了一座城堡，门口有疗伤的痕迹。",
    next: "mhr05",
  },
  mhr05: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "应该是有人受伤了跑到这里，最有可能的人便是你哥里亚了。",
    next: "mhr06",
  },
  mhr06: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "城堡？深林里哪来的城堡……",
    next: "mhr07",
  },
  mhr07: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "以前是座废城堡，我路过好几次，从没见过门。现在却多了扇锁死的门。",
    next: "mhr08",
  },
  mhr08: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……里亚他还好吗？",
    next: "mhr09",
  },
  mhr09: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "不好说。他要是自己走进去，没必要在门口处理伤口。更像是被人发现带进去的。",
    next: "mhr10",
  },
  mhr10: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……",
    next: "mhr11",
  },
  mhr11: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……我早该想到的。",
    next: "mhr12",
  },
  mhr12: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "里亚跟我说过，他发现了一个不错的地方，说想带我去看看。",
    next: "mhr13",
  },
  mhr13: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……他说的，应该就是那里。",
    next: "mhr14",
  },
  mhr14: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "我要去看看。",
    next: "mhr15",
  },
  mhr15: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "不行。",
    next: "mhr16",
  },
  mhr16: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "那是我哥！",
    next: "mhr17",
  },
  mhr17: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "那你也得活着到那里才行。你一点战斗力都没，深入森林就是给魔物送点心。",
    next: "mhr18",
  },
  mhr18: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……",
    next: "mhr19",
  },
  mhr19: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "我有办法进去，只是天快黑了，下次我会进去看看。",
    next: "mhr20",
  },
  mhr20: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……下次带上我吧，你不是说大门锁上了吗，我会开锁。",
    next: "mhr21",
  },
  mhr21: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……你？看不出来。",
    next: "mhr22",
  },
  mhr22: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "到处漂泊，总要有一些本事在身上。",
    next: "mhr23",
  },
  mhr23: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "那地方很危险，我可没把握护你周全。",
    next: "mhr24",
  },
  mhr24: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "我还是有些逃命的本事在身上的。",
    next: "mhr25",
  },
  mhr25: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……而且，抓走我哥的那个混蛋，我要亲手找他算账。",
    next: "mhr26",
  },
  mhr26: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……行吧，那说好了。",
    next: "mhr27",
  },
  mhr27: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "莫奇，我们一定会把他带回来的。",
    next: "mhr28",
  },
  mhr28: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……你这小哥，来了才几天，倒是比我还会说漂亮话。",
    next: "mhr29",
  },
  mhr29: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……我说的是真的。",
    next: "mhr30",
  },
  mhr30: {
    name: "旁白",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "莫奇低下头，半天没说话。",
    next: "mhr31",
  },
  mhr31: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……行了。人还没找到，你先别自己吓自己。",
    next: "mhr32",
  },
  mhr32: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……嗯。",
    next: "mhrEnd",
  },
  mhrEnd: { end: 1 },

  // ===== 云弥线提交线索：携带云弥 + 城堡云弥线完成（mzyEnd）→ 告知莫奇里亚下落（一次性） =====
  myr01: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……莫奇，我们可能找到里亚的线索了。",
    next: "myr02",
  },
  myr02: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "真的？他、他在哪？",
    next: "myr03",
  },
  myr03: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……我们也不太确定。",
    next: "myr04",
  },
  myr04: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "我们在深林里发现了一座城堡，云弥说，里面有很淡的活人气息，或许就是失踪的里亚。",
    next: "myr05",
  },
  myr05: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……",
    next: "myr06",
  },
  myr06: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "城堡？我还第一次听说深林里有这东西。",
    next: "myr07",
  },
  myr07: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……里面有危险的气息。",
    next: "myr08",
  },
  myr08: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……里亚他还好吗？",
    next: "myr09",
  },
  myr09: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……",
    next: "myr10",
  },
  myr10: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……还活着。",
    next: "myr11",
  },
  myr11: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "真的吗？",
    next: "myr12",
  },
  myr12: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……嗯。",
    next: "myr13",
  },
  myr13: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……我早该想到的。",
    next: "myr14",
  },
  myr14: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "里亚跟我说过，他发现了一个不错的地方，说想带我去看看。",
    next: "myr15",
  },
  myr15: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……他说的，应该就是那里。",
    next: "myr16",
  },
  myr16: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "我要去看看。",
    next: "myr17",
  },
  myr17: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……不行。",
    next: "myr18",
  },
  myr18: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "那是我哥！",
    next: "myr19",
  },
  myr19: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……会死的。",
    next: "myr20",
  },
  myr20: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "我不怕！",
    next: "myr21",
  },
  myr21: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……你哥不会想看到你去送死。",
    next: "myr22",
  },
  myr22: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "……",
    next: "myr23",
  },
  myr23: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "云弥……真的没有办法了吗？",
    next: "myr24",
  },
  myr24: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "下次我一个人进去看看。",
    next: "myr25",
  },
  myr25: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "带上我，我能帮忙。",
    next: "myr26",
  },
  myr26: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "不行，你太弱了。",
    next: "myr27",
  },
  myr27: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "我才不弱。",
    next: "myr28",
  },
  myr28: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "你不在，我更好施展。",
    next: "myr29",
  },
  myr29: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "那……我能留在外面等你吗？我不跟你进去。",
    next: "myr30",
  },
  myr30: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "求你了。",
    next: "myr31",
  },
  myr31: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……好吧，感到不对就立马跑回去。",
    next: "myr32",
  },
  myr32: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "别告诉他们，我不想他们担心。",
    next: "myr33",
  },
  myr33: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "也带上我吧，你们不是说大门被锁了吗，我会开锁。",
    next: "myr34",
  },
  myr34: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……行吧，那你到时候跟林恩1待在一起，我自己进去。",
    next: "myr35",
  },
  myr35: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "好。",
    next: "myrEnd",
  },
  myrEnd: { end: 1 },



  // ===== 西亚线：带西亚见莫奇（逗莫奇 / 治疗手臂 / 求情让西亚答应帮忙，一次性） =====
  mh01: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "西亚，你怎么有空出来了？",
    next: "mh02",
  },
  mh02: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "腿还疼吗？",
    next: "mh03",
  },
  mh03: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "不疼了，谢谢你给我的药剂。",
    next: "mh04",
  },
  mh04: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "你有什么需要的吗？我这小摊里面的东西你有什么看上的都可以拿走。",
    next: "mh05",
  },
  mh05: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "诶，全都要可以吗？",
    next: "mh06",
  },
  mh06: {
    name: "旁白",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "莫奇有些尴尬地挠了挠脖子，一时间不知道怎么回答了。",
    next: "mh07",
  },
  mh07: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "好啦，逗逗你的，我不需要。",
    next: "mh08",
  },
  mh08: {
    name: "旁白",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "莫奇抬眼，这才看见西亚身后还站着个人。他眨了眨眼，认出了你。",
    next: "mh09",
  },
  mh09: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "咦，这不是上回那个小哥吗？看来你找到我说的安全点啦！",
    next: "mh10",
  },
  mh10: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "嗯，他现在是我们的一份子了。",
    next: "mh11",
  },
  mh11: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……谢谢你当时给我指路。",
    next: "mh12",
  },
  mh12: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "嗐，顺手的事。",
    next: "mh13",
  },
  mh13: {
    name: "旁白",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "西亚的视线落在你手臂上。",
    next: "mh14",
  },
  mh14: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "手伸出来。",
    next: "mh15",
  },
  mh15: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……嗯？",
    next: "mh16",
  },
  mh16: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "手上那些口子，林子里刮的？",
    next: "mh17",
  },
  mh17: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……嗯。",
    next: "mh18",
  },
  mh18: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "怎么不和我说？",
    next: "mh19",
  },
  mh19: {
    name: "旁白",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "西亚说完为你治疗起了手臂。",
    next: "mh20",
  },
  mh20: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "你这样让我很尴尬诶，明明答应了不会让你受到伤害的。",
    next: "mh21",
  },
  mh21: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "抱歉……下次不会了。",
    next: "mh22",
  },
  mh22: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "好啦，逗你玩的，没事了，就一点小伤口。",
    next: "mh23",
  },
  mh23: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "谢谢。",
    next: "mh24",
  },
  mh24: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "咦，西亚你今天怎么这么温柔？",
    next: "mh25",
  },
  mh25: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "我不温柔吗？",
    next: "mh26",
  },
  mh26: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "没有，只是今天的你很特别。",
    next: "mh27",
  },
  mh27: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……你哥，还没消息？",
    next: "mh28",
  },
  mh28: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "……嗯。",
    next: "mh29",
  },
  mh29: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "抱歉，这件事我帮不上忙。",
    next: "mh30",
  },
  mh30: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "……你有这份心意我已经很感激了，我也不想麻烦你们，毕竟这是我自己的事。",
    next: "mh31",
  },
  mh31: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "你哥，他是在哪里不见的？我帮你找。",
    next: "mh32",
  },
  mh32: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "jingit" },
    text: "……你？这对你来说太危险了。",
    next: "mh33",
  },
  mh33: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "他说得对。就你这样的，进去就是送死。",
    next: "mh34",
  },
  mh34: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "可是我想帮他，我不想他一直这样傻等，也不想明天看不到他了。",
    next: "mh35",
  },
  mh35: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "不行，我不答应！",
    next: "mh36",
  },
  mh36: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "求你了……我什么都可以答应你，帮帮他吧。",
    next: "mh37",
  },
  mh37: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……",
    next: "mh38",
  },
  mh38: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "求你了，莫奇是我的恩人。",
    next: "mh39",
  },
  mh39: {
    name: "莫奇",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "我吗……？",
    next: "mh40",
  },
  mh40: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "你真是……感觉我再不答应就要成为什么十恶不赦的人了。",
    next: "mh41",
  },
  mh41: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "你答应了吗？",
    next: "mh42",
  },
  mh42: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "……总之，我跟你深入找找……但是有危险的话，我可是会扯着你逃跑的噢。",
    next: "mh43",
  },
  mh43: {
    name: "林恩1",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "好，谢谢你，西亚，你是个好人。",
    next: "mh44",
  },
  mh44: {
    name: "西亚",
    onStage: ["shangren1", "huli"],
    playerSkin: "moren",
    text: "我可不是为了你……对，我只是不想莫奇出事而已。",
    next: "mhEnd",
  },
  mhEnd: { end: 1 },

  // ===== 云弥线：带云弥见莫奇（魔物潮玩笑 / 你替云弥说话 / 求情 / 云弥开口答应 / 赠 LV2 魔晶，一次性） =====
  my01: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "诶，稀客呀，竟然能在外面遇见你。",
    next: "my02",
  },
  my02: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "有魔物潮要来袭了吗？",
    next: "my03",
  },
  my03: {
    name: "旁白",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "云弥没应声。莫奇也不觉得冷场，视线一偏，看见了云弥旁边的你。他眨了眨眼。",
    next: "my04",
  },
  my04: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "咦，这不是上回那个小哥吗？看来你找到我说的安全点啦。",
    next: "my05",
  },
  my05: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……谢谢你给我指路。",
    next: "my06",
  },
  my06: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "嗐，顺手的事。……稀奇，你俩居然走到一块儿了。",
    next: "my07",
  },
  my07: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……嗯。",
    next: "my08",
  },
  my08: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "能跟云弥走到一块儿，小哥，你有点东西呀。",
    next: "my09",
  },
  my09: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……嗯？",
    next: "my10",
  },
  my10: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "这家伙很难相处吧，你和他在一起会觉得害怕吗？",
    next: "my11",
  },
  my11: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "不会，他是好人，我能感觉出来。",
    next: "my12",
  },
  my12: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……你哥呢？",
    next: "my13",
  },
  my13: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "……还没消息。没想到你还挺关心我的嘛。",
    next: "my14",
  },
  my14: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……嗯。",
    next: "my15",
  },
  my15: {
    name: "旁白",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "莫奇看了云弥一眼，没再多问，低头把筐子往边上挪了挪。",
    next: "my16",
  },
  my16: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "行了，今天我可是深入采集了一些超甜的赤莓，想吃自己拿，不用跟我客气。",
    next: "my17",
  },
  my17: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "莫奇，你哥的事……我想帮你。",
    next: "my18",
  },
  my18: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "……你想帮我什么？",
    next: "my19",
  },
  my19: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "我可以帮你去里面找找。",
    next: "my20",
  },
  my20: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "jingit" },
    text: "……不行，这对你来说太危险了。",
    next: "my21",
  },
  my21: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "那你就这样一直傻等着吗？",
    next: "my22",
  },
  my22: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "你清楚的吧，越拖下去越危险。",
    next: "my23",
  },
  my23: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "我不能连累你，这是我自己的事情，应该由我自己解决。",
    next: "my24",
  },
  my24: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "不，你是我的恩人，我想报答你。",
    next: "my25",
  },
  my25: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "我什么时候……",
    next: "my26",
  },
  my26: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "没有你给我指路，我说不定早就一个人去了森林深处了。",
    next: "my27",
  },
  my27: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "所以……请让我帮帮你吧，我想帮你。",
    next: "my28",
  },
  my28: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "可是……",
    next: "my29",
  },
  my29: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "我也会帮忙的。",
    next: "my30",
  },
  my30: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "daxiao1" },
    text: "诶，如果是你帮忙的话，我真是感激不尽。",
    next: "my31",
  },
  my31: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "如果真能找回我哥，以后有什么我能帮上忙的地方，请尽管吩咐。",
    next: "my32",
  },
  my32: {
    name: "林恩1",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "你的声望真的很高呀。",
    next: "my33",
  },
  my33: {
    name: "云弥",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "……",
    next: "my34",
  },
  my34: {
    name: "旁白",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    text: "莫奇翻找了好一会儿，从摊子底下摸出一个灰扑扑的小袋子，郑重地塞进你手里。",
    next: "my35",
  },
  my35: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren1" },
    text: "这个给你，是我攒了好久的宝贝。",
    next: "my36",
  },
  my36: {
    name: "旁白",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    onEnter: () => {
      // 💎 赠送 LV2 魔晶 ×1（幂等，仅一次；与晨曦线 mjCrystalGiven 分开发放）
      if (!user.getDialogueFlag('myCrystalGiven')) {
        user.setDialogueFlag('myCrystalGiven', true);
        user.addItemToInventory({ name: '魔晶LV2', num: 1 });
        emitter.emit('dungeonItemGain', { name: '魔晶LV2', num: 1, img: 'redCrystalT2' });
      }
    },
    text: "你打开袋子，里面躺着一颗流转着幽蓝光泽的魔晶。",
    next: "my37",
  },
  my37: {
    name: "莫奇",
    onStage: ["shangren1", "yu"],
    playerSkin: "moren",
    npcSkin: { "shangren1": "moren" },
    text: "拜托你们了。",
    next: "myEnd",
  },
  myEnd: { end: 1 },

  // ===== 中转站 sr100：sr01 二次遇见完成后进入，按条件分流到对应对话（不显示对话，立即跳转） =====
  // 入口触发数组：[{ifNotCompleted:'xm01', name:'xm01'}, {ifNotCompleted:'sr01', name:'sr01'}, {name:'sr100'}]
  //   → 首遇未完成播首遇 → 二次遇见未完成播二次遇见 → 都完成进买卖菜单
  sr100: {
    autoNext: 0, // 无文本，进入后立即自动流转
    next: () => {
      // 👉 把下面的示例条件/目标替换成你的分流逻辑；命中哪个条件就返回对应对话节点 id
      // if (user.getDialogueFlag('见过里亚')) return 'sr101'
      // if (cond.flag('某开关')) return 'sr102'
      return 'sr10' // 兜底：未命中任何条件 → 直接进入「买卖 / 离开」
    },
  },

  // ===== 可重复：买卖 / 离开 =====
  // 🏪 sr10 开场语动态化：按最近一次商店操作（买了 / 没买）+ 好感度切换不同文本
  sr10: {
    name: "莫奇",
    onEnter: () => {
      // ✅ 首次开场完成标记：sr01 开场（三选项/各分支）汇入 sr10 即视为已完成（幂等），
      //    避免「离开」走 srEnd(end:2 不标记完成) 导致下次又重复触发 sr01
      if (!user.isDialogueComplete?.('sr01')) user.markDialogueComplete?.('sr01');
      // 🧭 每次进入地牢第一次与商人对话计一次（重复对话不计入），累计>=2 解锁「你有同伴吗？」
      if (!user.getDialogueFlag('shangrenMetThisDungeon')) {
        user.setDialogueFlag('shangrenMetThisDungeon', true);
        user.setDialogueFlag('shangrenMeetCount', (user.getDialogueFlag('shangrenMeetCount') || 0) + 1);
      }

      // 🎒 带回里亚：已找到里亚且任务进行中 → 与商人对话即完成任务 + 好感奖励
      if (user.getDialogueFlag('liyaFound') && !user.isTaskCompleted?.('find_liya')) {
        const r = user.completeTaskStep?.('find_liya', 'return');

        if (r?.taskCompleted) {
          user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 50);
          user.setDialogueFlag('liyaFavor', (user.getDialogueFlag('liyaFavor') || 0) + 50);
          user.setDialogueFlag('liyaTaskDoneDay', user.pixi?.player?.day ?? 1); // 📅 记录任务完成日（隔天感谢用）
          user.setDialogueFlag('liyaReturnedThanks', true); // 🎉 带回里亚当天：对话显示提交任务感谢语（一次）

        }
      }
      // 💍 隔天感谢：任务完成次日再与莫奇对话 → 赠送幸运戒指（仅一次）
      const doneDay = Number(user.getDialogueFlag('liyaTaskDoneDay')) || 0;
      console.log('[戒指调试] 发放条件 doneDay=', doneDay, 'day=', user.pixi?.player?.day, 'ringGiven=', user.getDialogueFlag('ringGiven'), '背包现有戒指=', JSON.stringify((user.inventory || []).filter(i => i.name === '幸运戒指')));
      if (!user.getDialogueFlag('ringGiven') && doneDay > 0 && (user.pixi?.player?.day ?? 1) > doneDay) {
        user.setDialogueFlag('ringGiven', true);
        user.setDialogueFlag('ringThanksPending', true);
        user.addItemToInventory({ name: '幸运戒指', num: 1 });
        console.log('[戒指调试] addItemToInventory 执行后背包戒指=', JSON.stringify((user.inventory || []).filter(i => i.name === '幸运戒指')));
        emitter.emit('dungeonItemGain', { name: '幸运戒指', num: 1, img: 'jiezhi1' }); // 💍 获得弹窗（含皮肤图）
      }
    },
    text: () => {
      // 🎬 nextTextOnce 注入：前一个节点配置 nextTextOnce 属性时替换本节点文本（仅一次，随后清除）
      const _ovText = user.getDialogueFlag('dlgOverrideNextText');
      if (_ovText) {
        user.setDialogueFlag('dlgOverrideNextText', '');
        return _ovText;
      }
      // 🎬 sr37 → sr10 时沿用「还有，我叫莫奇。」（仅一次，随后清除，不覆盖）
      if (user.getDialogueFlag('sr10IntroOnce')) {
        user.setDialogueFlag('sr10IntroOnce', false);
        return '…希望它还活着吧';
      }
      // 🎉 带回里亚感谢语（任务提交当天显示一次，随后清除）
      if (user.getDialogueFlag('liyaReturnedThanks')) {
        user.setDialogueFlag('liyaReturnedThanks', false);
        return '你找到里亚了？！它平安无事……真是太好了！我欠你一个大人情，往后你在这地牢里有什么需要，尽管开口。';
      }
      // 💍 隔天感谢语（只显示一次）
      if (user.getDialogueFlag('ringThanksPending')) {
        user.setDialogueFlag('ringThanksPending', false);
        return '你找到了里亚，还带它平安回来了……我没什么能回报你的，这枚幸运戒指是我珍藏多年的宝贝，也是我现在能拿出的最珍贵的东西。戴上它，好运常伴你左右。';
      }
      // 🛒 最近一次商店操作对话（优先级高于天气抱怨）：卖 / 买 / 打开没交易
      const openedAt = Number(user.getDialogueFlag('shangrenShopOpenedAt')) || 0;
      const boughtAt = Number(user.getDialogueFlag('shangrenBoughtAt')) || 0;
      const soldAt = Number(user.getDialogueFlag('shangrenSoldAt')) || 0;
      if (soldAt > openedAt) {
        _clearShopMarkers();
        return '多谢照顾，欢迎下次再来。有好东西尽管拿来，我照单全收。';
      }
      if (boughtAt > openedAt) {
        // 💰 单次购买花费超过 100 金币 → 大客户特殊对话
        const bigAt = Number(user.getDialogueFlag('shangrenBigBuyAt')) || 0;
        if (bigAt > openedAt) {
          _clearShopMarkers();
          return '嚯，大手笔啊！这一单我可得记着，往后有好货，头一个想着你。'; // 💰 大客户感谢语
        }
        _clearShopMarkers();
        return '多谢惠顾！欢迎下次再来，还有什么需要的尽管说。';
      }
      if (openedAt > Math.max(boughtAt, soldAt)) {
        _clearShopMarkers();
        return '怎么，没有看得上的？有需要随时开口。';
      }
      // 🗣️ 天气抱怨（替换开场语）：完成赠戒后，只要对应天气（雪/雨/雾）就常触发；
      //   文字按好感度分两档：好感度 <100 一档、>=100 二档（更熟络）
      {
        const _w = user.getDialogueFlag('dungeonCurWeather');
        if ((_w === 'snow' || _w === 'rain' || _w === 'fog') && user.getDialogueFlag('ringGiven')) {
          const _hf = (user.getDialogueFlag('shangrenFavor') || 0) >= 100;
          if (_w === 'snow') return _hf
            ? '这雪天冻得人直哆嗦，搁平时我早收摊了。也就是你，我才在这儿守着。看中啥赶紧的，回头我请你喝口热的。'
            : '哎哟这雪天，手脚都冻僵了，做买卖都不利索……你看中什么赶紧的。';
          if (_w === 'rain') return _hf
            ? '又下雨……我这老骨头最怕这潮气，也就是熟客你，我才肯站这儿陪你唠。要什么抓紧挑，别让雨泡了货。'
            : '这雨下得可真不是时候……我这摊子都快泡汤了，你抓紧挑吧。';
          return _hf
            ? '又是这雾，能见度都不到几尺。换别人我早打发走了，你嘛……自己人，慢慢挑，别走丢咯。'
            : '这雾蒙蒙的天，连客人都不好找……可别走丢了，看货吧。';
        }
      }
      // 正常进入：按好感度切换开场语
      const favor = user.getDialogueFlag('shangrenFavor') || 0;
      // 3) 正常进入：按好感度切换开场语
      if (favor >= 15) return '哟，熟客来了！';
      if (favor >= 5) return '来了？看看有没有你需要的。';
      if (favor <= -5) return '……又是你。快点看，别耽误我做生意。';
      return '来看看货吧。';
    },
    onStage: "shangren1",
    repeatable: true,
    options: [
      {
        text: "买卖",
        next: "sr11",
        repeatable: true,
      },
      // 🧭 提交线索：完成幕8城堡且携带对应同伴 → 告知莫奇里亚下落（晨曦/西亚/云弥，一次性）
      {
        text: "（提交线索）我们有里亚的线索了。",
        next: "mjrSel",
        condition: () => {
          const ally = user.getNpcAlly?.();
          if (ally === 'jinmao') return !user.isDialogueComplete?.('mjrEnd') && user.isDialogueComplete?.('mzEnd');
          if (ally === 'huli') return !user.isDialogueComplete?.('mhrEnd') && user.isDialogueComplete?.('mzhEnd');
          if (ally === 'yu') return !user.isDialogueComplete?.('myrEnd') && user.isDialogueComplete?.('mzyEnd');
          return false;
        },
      },
      {
        text: "询问它在这里安全吗",
        next: "sr20",
        condition: () => !user.getDialogueFlag('shangrenSafeAsked'),
        onSelect: () => {
          user.setDialogueFlag('shangrenSafeAsked', true);
          user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 5);

        }
      },
      {
        text: "你有同伴吗",
        next: "sr30",
        condition: () => !user.getDialogueFlag('shangrenPeerAsked') && (user.getDialogueFlag('shangrenMeetCount') || 0) >= 2,
        onSelect: () => {
          user.setDialogueFlag('shangrenPeerAsked', true);
          user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 5);

        }
      },
      // 🧭 新增剧情：身世（好感>=20，一次性）
      {
        text: "你为什么会在这地牢边上做买卖？",
        next: "sr40",
        condition: cond.all(cond.notFlag('shangrenTaleAsked'), cond.flagNumGte('shangrenFavor', 20)),
        onSelect: () => {
          user.setDialogueFlag('shangrenTaleAsked', true);
          user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 5);

        }
      },
      // 🧭 新增剧情：地牢见闻（好感>=30，每次进入地牢仅可对话一次，内容轮流）
      {
        text: "讲讲这地牢里的见闻？",
        next: "sr50",
        condition: cond.all(cond.flagNumGte('shangrenFavor', 30), cond.notFlag('shangrenTaleToldThisDungeon')),
        onSelect: () => { user.setDialogueFlag('shangrenTaleToldThisDungeon', true); },
      },
      // 🧭 新增剧情：天黑提醒（一次性）
      {
        text: "天黑前你会离开吧？",
        next: "sr60",
        condition: cond.notFlag('shangrenNightAsked'),
        onSelect: () => { user.setDialogueFlag('shangrenNightAsked', true); }
      },
      // 🧭 新增剧情：里亚近况（需已完成带回任务，一次性）
      {
        text: "里亚最近怎么样了？",
        next: "sr70",
        condition: cond.all(cond.notFlag('shangrenLiyaTold'), cond.flagNumGte('liyaTaskDoneDay', 1)),
        onSelect: () => { user.setDialogueFlag('shangrenLiyaTold', true); }
      },
      // 🧭 新增剧情：名字来历（好感>=100，一次性）
      {
        text: "莫奇这名字有什么来历吗？",
        next: "sr80",
        condition: cond.all(cond.notFlag('shangrenNameAsked'), cond.flagNumGte('shangrenFavor', 100)),
        onSelect: () => {
          user.setDialogueFlag('shangrenNameAsked', true);
          user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 5);

        }
      },
      {
        text: "离开",
        next: "sr12",
        condition: () => !user.getDialogueFlag('shangrenLeft'),
        onSelect: () => { user.setDialogueFlag('shangrenLeft', true); }
      },
      {
        text: "离开",
        next: "srEnd",
        repeatable: true,
        condition: () => !!user.getDialogueFlag('shangrenLeft'),
      },
    ],
  },

  // ===== 买卖：打开商店并结束对话（地牢由 dungeon.vue 监听 openShop 冻结，关闭时 dungeonShopClosed 解冻） =====
  sr11: {
    onEnter: () => {
      // 🏪 记录本次打开商店时间（返回 sr10 时用于区分「买了 / 没买」）
      user.setDialogueFlag('shangrenShopOpenedAt', Date.now());
      // 🏪 标记：地牢商人「买卖」打开商店，关闭后返回 sr10 对话（matter.vue 监听）
      emitter.emit('dungeonMerchantShop');
      setTimeout(() => { emitter.emit('openShop'); }, 400);
    },
    end: 1,
  },

  // ===== 额外选项一：这里安全吗（一次性，好感+5） =====
  sr20: { onStage: "shangren1", name: "莫奇", text: "嘛…很多人都问过我这种问题，但我的答案是富贵险中求。", next: "sr21" },
  sr21: { name: "莫奇", text: "嘛…但其实是这里是边缘，只要我天黑前离开一般没有什么风险。", next: "sr10" },

  // ===== 额外选项二：你有同伴吗（第二次进入地牢遇见商人解锁，一次性，好感+5→+20） =====
  sr30: { onStage: "shangren1", name: "莫奇", text: "诶，这可是和生意无关噢。", next: "sr31" },
  sr31: { name: "林恩1", text: "我只是总看见你一个人在这有些奇怪。", next: "sr32" },
  sr32: { name: "莫奇", text: "嘛…我的确有同伴，不过它好像失踪了。它叫里亚，和我一样是个商人，七天前它去深处贸易后便再也没有回来了。", next: "sr33" },
  sr33: { name: "莫奇", text: "虽然我知道它90%概率可能已经丧命了，但还是有些心存侥幸。", next: "sr34" },
  sr34: { name: "莫奇", text: "我还真是丢人，明明我们只是买卖关系而已，却和你诉苦了。", next: "sr35" },
  sr35: { name: "林恩1", text: "没事的，我很乐意你能告诉我这些，你能告诉我更多关于它的线索嘛，我或许能去找找看有没有它的线索。", next: "sr36" },
  sr36: {
    name: "莫奇",
    text: "……好的，谢谢你。",
    onEnter: () => {
      user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 20);
      addLiyaTask(); // 🎒 添加「寻找失踪的里亚」任务
      console.log('[莫奇调试] sr36接任务后 sideTasks=', JSON.stringify((user.allTasks?.sideTasks || []).map(t => ({ id: t.id, name: t.name, c: t.isCompleted }))));

    },
    next: "sr10",
  },

  // ===== 新增剧情：身世（好感>=20，一次性） =====
  sr40: { onStage: "shangren1", name: "莫奇", text: "说来话长。我以前在城里开布庄，被人坑了一笔，欠了一屁股债，这才跑路到这儿来。", npcSkin: "moren", next: "sr41" },
  sr41: { name: "林恩1", text: "所以就来这地牢边上碰运气？", next: "sr42" },
  sr42: { name: "莫奇", text: "嘿嘿，你以为呢？这地牢边上虽然危险，但来打拼的冒险者多啊，出手还大方。我在这儿熬了三年，债早还清了。", npcSkin: "daxiao1", next: "sr43" },
  sr43: { name: "林恩1", text: "那怎么不回城里去？", next: "sr44" },
  sr44: { name: "莫奇", text: "回城？在这儿我自在。再说了，这地牢里头的宝贝，可比城里那些铺子有意思多了。", npcSkin: "moren1", next: "sr10" },

  // ===== 新增剧情：地牢见闻（好感>=30，可重复，内容轮流） =====
  sr50: {
    onStage: "shangren1",
    name: "莫奇",
    onEnter: () => {
      const c = Number(user.getDialogueFlag('shangrenTaleCount') || 0);
      user.setDialogueFlag('shangrenTaleCount', c + 1);
      user.setDialogueFlag('shangrenTaleIdx', c % 3);
    },
    text: () => {
      const n = Number(user.getDialogueFlag('shangrenTaleIdx') || 0);
      const lines = [
        '听回来的老冒险者说，最深那几层住着个会做梦的魔物，能把你拖进梦里。我只求别让它梦见我。',
        '有啊，都说这地牢最深处藏着个古国的宝库，钥匙被拆成几块，散落在各层。真真假假谁知道呢。',
        '多，但也换得快。头几天还眉飞色舞的，过几天就再没见着了……这地牢吃人呐。',
      ];
      return lines[n] ?? lines[0];
    },
    npcSkin: "moren1",
    next: "sr10",
  },

  // ===== 新增剧情：天黑提醒（一次性） =====
  sr60: { onStage: "shangren1", name: "莫奇", text: "那当然，我可不想被夜里的东西追上。你也是，天黑前最好也收手。这地牢一到晚上，就不是原来的地牢了。", npcSkin: "moren", next: "sr61" },
  sr61: { name: "林恩1", text: "我会小心的。", next: "sr10" },

  // ===== 新增剧情：里亚近况（需已完成带回任务，一次性） =====
  sr70: { onStage: "shangren1", name: "莫奇", text: "那小子恢复得不错，就是老念叨着要回深处去……我说你省省，能活着回来就偷着乐吧。", next: "sr71" },
  sr71: { name: "林恩1", text: "它还想回深处？", next: "sr72" },
  sr72: { name: "莫奇", text: "谁说不是呢。不过它说在深处见过一处没人碰过的货仓，等它养好了伤，我们打算去一趟。到时候有好货，头一个便宜你。", npcSkin: "moren1", next: "sr10" },

  // ===== 新增剧情：名字来历（好感>=100，一次性） =====
  sr80: { onStage: "shangren1", name: "莫奇", text: "……是以前一个恩人给我起的，说我见钱眼开，像只总想刨食的猫头鹰。莫奇莫奇，听着又像'莫欺'，他盼我别被钱财蒙了心。", npcSkin: "moren", next: "sr81" },
  sr81: { name: "林恩1", text: "看来那位恩人很了解你。", next: "sr82" },
  sr82: { name: "莫奇", text: "是啊……可惜我没能一直记着他的话。", npcSkin: "jingit", next: "sr10" },

  // 🎉 带回里亚重逢（双头像：里亚 + 莫奇），播放完回到 sr10 菜单
  lyReunion1: { onStage: ["shangren2", "shangren1"], name: "里亚", text: "莫奇！", next: "lyReunion2" },
  lyReunion2: { onStage: ["shangren2", "shangren1"], name: "莫奇", text: "里亚，没想到你还活着，真是太好了。", next: "lyReunion3" },
  lyReunion3: { onStage: ["shangren2", "shangren1"], name: "里亚", text: "我也没想到，我可遭老罪了，你是不知道…", next: "lyReunion4" },
  lyReunion4: { name: "旁白", text: "（他们闲聊了许久后）", next: "lyReunion5" },
  lyReunion5: { onStage: ["shangren2", "shangren1"], name: "莫奇", text: "谢谢你，林恩1，我欠你一个大人情，往后你在这地牢里有什么需要，尽管开口。", next: "sr10" },
  // 🗣️ 天气抱怨已并入 sr10 text（替换开场语），不再使用独立节点

  // ===== 首次离开：欢迎下次光临（仅触发一次） =====
  // ⚠️ 不能是 end 节点：goToDialogue 跳到 end 节点会立即 endDialogue，告别语来不及显示；
  //   改为显示告别语 + 「继续」→ srEnd（end:2 可重复结束）
  sr12: {
    onStage: "shangren1",
    name: "莫奇",
    text: "欢迎下次光临，有找到好东西我可以收购哟。",
    npcSkin: "daxiao1",
    next: "srEnd",
    moveNpcOnEnd: { npcId: 42, col: 3, row: 5, speed: 4 },

  },

  // ===== 已离开过：直接结束（可重复结束，不标记完成） =====
  srEnd: { end: 2 },
};
