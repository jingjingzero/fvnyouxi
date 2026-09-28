/**
 * 出发森林（forest-out）：玩家点击森林入口时，晨曦/西亚/云弥跑来争着陪同
 * loadData: 'npc/forest-out'（tiled dialogLoadData 配置；dladmin 编辑器需在 FILES 数组登记 'forest-out'）
 *
 * 流程：
 * - fr01-36 四人对话：玩家想去森林找莫奇，三人阻拦并争着陪同
 * - fr37 选项：选晨曦 / 西亚 / 云弥 → 对应角色好感 +5，并设置为携带队友（setNpcAlly）
 * - 晨曦分支：获得恢复药剂 ×3（西亚塞药）
 * - 各分支 end:1 一次性完成
 *
 * tiled 触发数组建议：
 *   [
 *     { ifNotCompleted: 'fr37', name: 'fr01' },
 *   ]
 *   （fr37 为选项节点，三个分支都从它出去；任选一支后 fr37 即完成，不再触发）
 *
 * 人称：旁白统一第二人称「你」；玩家说话人显示「林恩1」（默认名，可自定义）。
 * 立绘：晨曦/西亚/云弥 onStage: ["jinmao","huli","yu"]（默认皮肤）；玩家 playerSkin: "moren"。
 */
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

// 💗 好感（npcSelectList 里对应 img 的 affection）
function addAffection(img, n) {
  const npc = user.pixi?.npcSelectList?.find(x => x.img === img);
  if (npc) npc.affection = (npc.affection || 0) + n;
}

// 🔒 携带者锁定：选定后仅该角色可携带，其余两人从「同伴查看」移除且不可携带（此后不可变更）
//    记录到 flag chosenAlly（守城之夜众人回归时只恢复这一位）
function lockChosenAlly(chosen) {
  user.setDialogueFlag('chosenAlly', chosen);
  ['jinmao', 'huli', 'yu'].forEach(img => {
    if (img !== chosen) {
      user.setNpcCanAlly?.(img, false);
      user.removeAllyFromDisplay?.(img);
    }
  });
}

export default {
  // ===== 四人对话 =====
  fr01: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你正要踏入森林入口，身后传来一阵急促的脚步声。",
    next: "fr02",
  },
  fr02: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "等等！林恩1！你一个人要去森林？！",
    next: "fr03",
  },
  fr03: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "他跑得气喘吁吁，拦在你面前。西亚不紧不慢地跟上来，云弥站在几步外，没有说话，但也没走开。",
    next: "fr04",
  },
  fr04: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "晨曦你没和他说过森林的危险吗？",
    next: "fr05",
  },
  fr05: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "我说过了。",
    next: "fr06",
  },
  fr06: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "抱歉，我只是想出去看看，随便找找莫奇。",
    next: "fr07",
  },
  fr07: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "可是你一个人去也太危险了吧。",
    next: "fr08",
  },
  fr08: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "嗯嗯，晨曦快骂他。",
    next: "fr09",
  },
  fr09: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你别添乱了。",
    next: "fr10",
  },
  fr10: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "抱歉，我不知道这些。",
    next: "fr11",
  },
  fr11: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "但我只在外围探探，可以吗？",
    next: "fr12",
  },
  fr12: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "不行，除非让我陪着你。",
    next: "fr13",
  },
  fr13: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你可算了吧，整天带着伤回来，你可别害他了。",
    next: "fr14",
  },
  fr14: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "哪有！你太夸张了。",
    next: "fr15",
  },
  fr15: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "还是让我跟着你吧，我可不想让那个笨蛋带你去。",
    next: "fr16",
  },
  fr16: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你会战斗？",
    next: "fr17",
  },
  fr17: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "喂，你什么意思？",
    next: "fr18",
  },
  fr18: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "抱歉……",
    next: "fr19",
  },
  fr19: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "别小看医师啊，认真的话，这只小狗也打不过我！",
    next: "fr20",
  },
  fr20: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "说谁小狗呢，还有，我怎么就打不过你了。",
    next: "fr21",
  },
  fr21: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "诶，你想试试吗？",
    next: "fr22",
  },
  fr22: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "可算了吧，你这人小心眼，就算我赢了你，你下次又往药里下东西折腾我。",
    next: "fr23",
  },
  fr23: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "哼，不敢就是不敢。",
    next: "fr24",
  },
  fr24: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你！",
    next: "fr25",
  },
  fr25: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你们别吵了……",
    next: "fr26",
  },
  fr26: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "走吧，林恩1，你就留下来给我地里松松土，记得要按时浇水哦。",
    next: "fr27",
  },
  fr27: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "这都是你的活。",
    next: "fr28",
  },
  fr28: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "现在归你了。因为，我要保护他。",
    next: "fr29",
  },
  fr29: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "他朝你这边偏了偏头。晨曦气得尾巴都炸了。",
    next: "fr30",
  },
  fr30: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……松土？",
    next: "fr31",
  },
  fr31: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……你！云弥，你说句话呀！西亚太过分了！",
    next: "fr32",
  },
  fr32: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "云弥看了你一眼，又移开目光。",
    next: "fr33",
  },
  fr33: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……让他自己选吧。",
    next: "fr34",
  },
  fr34: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "有道理！林恩1，你选，想让谁陪你？",
    next: "fr35",
  },
  fr35: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "行吧，还是要尊重当事人的意见，但是我绝对比那只小狗更会保护你。",
    next: "fr36",
  },
  fr36: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "三人齐齐看向你。晨曦挺着胸，西亚抱着手臂，云弥看不出表情，但也没有走开。",
    next: "fr37",
  },

  // ===== 选择陪同者（好感 +5，并设置携带队友） =====
  fr37: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你想让谁陪着你？",
    options: [
      {
        text: "让晨曦陪",
        next: "fr38a",
        onSelect: () => {
          addAffection('jinmao', 5);
          user.setNpcAlly('jinmao');
          lockChosenAlly('jinmao'); // 🔒 选定晨曦：锁定，其余两人不可携带
        },
      },
      {
        text: "让西亚陪",
        next: "fr39a",
        onSelect: () => {
          addAffection('huli', 5);
          user.setNpcAlly('huli');
          lockChosenAlly('huli'); // 🔒 选定西亚：锁定，其余两人不可携带
        },
      },
      {
        text: "让云弥陪",
        next: "fr40a",
        onSelect: () => {
          addAffection('yu', 5);
          user.setNpcAlly('yu');
          lockChosenAlly('yu'); // 🔒 选定云弥：锁定，其余两人不可携带
        },
      },
    ],
  },

  // ===== ① 晨曦陪同（好感 +5） =====
  fr38a: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "嘿嘿，选我就对了，略略略你这只臭狐狸！",
    next: "fr38b",
  },
  fr38b: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "西亚……抱歉。",
    next: "fr38c",
  },
  fr38c: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "没事……正好我还有一堆药剂要调配呢，毕竟让这只小狗照顾我的药田的话，指不定会被糟蹋成什么样呢。",
    next: "fr38d",
  },
  fr38d: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你知道就好。",
    next: "fr38e",
  },
  fr38e: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    onEnter: () => {
      // 💊 赠送恢复药剂 ×3（幂等，仅一次）
      if (!user.getDialogueFlag('forestPotionGiven')) {
        user.setDialogueFlag('forestPotionGiven', true);
        user.addItemToInventory({ name: '恢复药剂', num: 3 });
        emitter.emit('dungeonItemGain', { name: '恢复药剂', num: 3, img: 'huifuyaoji' });
      }
    },
    text: "西亚从怀里掏出几瓶药剂，塞进你手里。",
    next: "fr38f",
  },
  fr38f: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "这些给你，记得照顾好自己，受伤了就喝掉这些。",
    next: "fr38g",
  },
  fr38g: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你还真是爱操心啊，我才不会让他受伤呢。",
    next: "fr38h",
  },
  fr38h: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "我可一点都不相信你。",
    next: "fr38i",
  },
  fr38i: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "晨曦一把拉起你的手，朝森林走去。",
    next: "fr38j",
  },
  fr38j: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "走吧，我对森林可熟悉了，我带你去找好吃的。",
    next: "fr38z",
  },
  fr38z: { end: 1 },

  // ===== ② 西亚陪同（好感 +5） =====
  fr39a: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……嗯，还算有眼光。",
    next: "fr39b",
  },
  fr39b: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "呜……怎么选他不选我！我明明更熟路！",
    next: "fr39c",
  },
  fr39c: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "因为他知道谁更可靠呀，笨蛋。",
    next: "fr39d",
  },
  fr39d: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……你！云弥你看他！",
    next: "fr39e",
  },
  fr39e: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……嗯。",
    next: "fr39f",
  },
  fr39f: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "西亚走到你身边。晨曦还在原地跳脚，云弥看着他，没有接话。",
    next: "fr39g",
  },
  fr39g: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "走吧，别管那只烦人的小狗了。",
    next: "fr39h",
  },
  fr39h: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "这么说他，是不是不太好。",
    next: "fr39i",
  },
  fr39i: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "没事啦，他不会介意的。",
    next: "fr39j",
  },
  fr39j: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "好吧。",
    next: "fr39z",
  },
  fr39z: { end: 1 },

  // ===== ③ 云弥陪同（好感 +5） =====
  fr40a: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "诶？",
    next: "fr40b",
  },
  fr40b: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "不是在我们俩中选吗？",
    next: "fr40c",
  },
  fr40c: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "不可以吗？",
    next: "fr40d",
  },
  fr40d: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……可以。",
    next: "fr40e",
  },
  fr40e: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "可是……我不知道我能否保护好你。",
    next: "fr40f",
  },
  fr40f: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你还是让他们陪你吧。",
    next: "fr40g",
  },
  fr40g: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你站在原地，没有动。",
    options: [
      {
        text: "……好吧。",
        next: "fr40h",
        onSelect: () => {
          addAffection('yu', -5); // 💔 同意云弥退出，云弥好感 -5
        },
      },
      {
        text: "我会照顾好自己的，你能陪我走走吗？",
        next: "fr40j",
        onSelect: () => {
          addAffection('yu', 2); // 💗 拒绝云弥退出，云弥好感 +2
        },
      },
    ],
  },
  // 同意云弥退出 → 重新选人（不再显示云弥）
  fr40h: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "好吧。",
    next: "fr41",
  },
  fr41: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "云弥没有再说话，退到了一旁。现在，只剩两个人还在等着你的选择。",
    options: [
      {
        text: "让晨曦陪",
        next: "fr38a",
        onSelect: () => {
          addAffection('jinmao', 5);
          user.setNpcAlly('jinmao');
          lockChosenAlly('jinmao'); // 🔒 选定晨曦：锁定，其余两人不可携带
        },
      },
      {
        text: "让西亚陪",
        next: "fr39a",
        onSelect: () => {
          addAffection('huli', 5);
          user.setNpcAlly('huli');
          lockChosenAlly('huli'); // 🔒 选定西亚：锁定，其余两人不可携带
        },
      },
    ],
  },
  // 拒绝云弥退出 → 云弥陪同
  fr40j: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "我会照顾好自己的，你能陪我走走吗？",
    next: "fr40k",
  },
  fr40k: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "云弥看着你，很久没有说话。",
    next: "fr40l",
  },
  fr40l: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……好。",
    next: "fr40m",
  },
  fr40m: {
    name: "晨曦",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "行吧，既然是云弥的话，肯定没事了。",
    next: "fr40n",
  },
  fr40n: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "是的呢。",
    next: "fr40o",
  },
  fr40o: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "难得你们统一意见了呢。",
    next: "fr40p",
  },
  fr40p: {
    name: "西亚",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "没办法，事实就是如此。",
    next: "fr40q",
  },
  fr40q: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "云弥有些不好意思地低下头。",
    next: "fr40r",
  },
  fr40r: {
    name: "旁白",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "你牵起云弥的手，他反应过来，也握紧了你的手。",
    next: "fr40s",
  },
  fr40s: {
    name: "林恩1",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "走吧。",
    next: "fr40t",
  },
  fr40t: {
    name: "云弥",
    onStage: ["jinmao", "huli", "yu"],
    playerSkin: "moren",
    text: "……好。",
    next: "fr40z",
  },
  fr40z: { end: 1 },
};
