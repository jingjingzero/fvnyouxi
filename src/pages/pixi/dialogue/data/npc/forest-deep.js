/**
 * 深入城堡（forest-deep）：幕10 晨曦线 · 莫奇开锁 → 自由行动 → 感应区暗影埋伏 → 必定落败 → 被囚 → 里亚兄弟重逢 → 暗影王戏耍
 * loadData: 'npc/forest-deep'（dladmin FILES 由 glob 自动登记；感应区触发点见下方）
 *
 * 流程：
 * - 入口①（城堡门口，自动）：forest-castle.js 的 mzIn 检测到「晨曦线提交线索完成（mjrEnd）且未经历囚禁（!cdJailEnd）」
 *     时自动转发本文件 cd01（莫奇开锁 → 晨曦独进被拦 → 莫奇放风）→ cdFree 结束，自由行动
 * - 入口②（感应区触发点，需在 Tiled 地图配置）：
 *     dialogLoadData: 'npc/forest-deep'
 *     dialogName:     'cdAmbush'
 *     玩家走进感应区 → 暗影魔物凭空出现 → 必定落败战斗 → 战败后 BattleResultPopup 自动触发被囚段
 * - 必败战斗机制（BattleResultPopup.vue）：
 *     战斗前节点 cdA06 onEnter 注册剧情战斗标记 cdCastleFight（markDialogueComplete），
 *     战斗结束 BattleResultPopup 的 STORY_BATTLE_ROUTES 命中该标记 →
 *     胜利 → talkToNpc('npc/forest-deep', 'cdFightWin')（兜底，正常必败不会走到）
 *     失败 → talkToNpc('npc/forest-deep', 'cdJail01')（自动触发被囚段）
 *     敌人数值为碾压级（hp/attack/armor 巨大），玩家无法战胜
 * - 被囚段：醒来 → 莫奇也被抓 → 里亚送饭兄弟重逢 → 暗影王登场戏耍（假意要吃，实际吓唬）→ 收尾
 *     完成标记 cdJailEnd 后感应区不再触发战斗（cdAmbush → cdIdle）
 *
 * 人称：旁白统一第二人称「你」；玩家说话人显示「林恩1」。晨曦 onStage: "jinmao"，莫奇 "shangren1"，里亚 "shangren2"。
 */
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

// 👥 过渡期同伴管理：云弥/西亚去救晨曦（幕11结束触发），三人从「同伴查看」隐藏且不可携带
//   - 隐藏：setNpcCanAlly(false) 设不可携带并自动解除当前携带；removeAllyFromDisplay 从同伴查看移除
//   - 隐藏前记录「前期选定的携带者」（flag chosenAlly，旧档回退取当前携带 npcAlly）→ 守城胜利后只恢复这一位
//   - 读档安全：syncAllyList 会跳过 canAlly=false 的 NPC，不会自动补回
function hideAlliesDuringRescue() {
  const chosen = user.getDialogueFlag?.('chosenAlly') || user.pixi?.npcAlly;
  if (chosen) user.setDialogueFlag('rescueChosenAlly', chosen);
  ['jinmao', 'huli', 'yu'].forEach(img => {
    user.setNpcCanAlly?.(img, false);
    user.removeAllyFromDisplay?.(img);
  });
}
// 🌅 幕12（众人回归）时调用恢复：只恢复前期选定的携带者（不可变更），其余两人保持不可携带
function restoreAlliesAfterRescue() {
  const chosen = user.getDialogueFlag?.('rescueChosenAlly');
  if (chosen && ['jinmao', 'huli', 'yu'].includes(chosen)) {
    user.setNpcCanAlly?.(chosen, true);
    user.addAllyToDisplay?.(chosen);
  }
}

export default {
  // ===== 感应区入口分流（Tiled 触发点 dialogName='cdAmbush'；已被囚禁过则不再触发） =====
  cdAmbush: {
    autoNext: 0, // 无文本，按状态自动分流
    next: () => {
      if (user.isDialogueComplete?.('cdJailEnd')) return 'cdIdle'; // ⛔ 已被囚禁过（晨曦线），不再触发战斗
      if (user.isDialogueComplete?.('cdYEnd')) return 'cdIdle';    // ⛔ 云弥线已走完，不再触发战斗
      if (user.getDialogueFlag?.('cdYInCastle')) return 'cdYA01';  // 🌊 云弥线深入中 → 可胜埋伏
      return 'cdA01';
    },
  },
  cdIdle: { end: 2 },

  // ===== ① 开锁段（由 forest-castle.js mzIn 自动转发 cd01；晨曦 + 莫奇 + 玩家） =====
  cd01: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "莫奇，这道锁你能打开吗？",
    next: "cd02",
  },
  cd02: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "没问题，交给我吧。",
    next: "cd03",
  },
  cd03: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "莫奇蹲在门前，耳朵贴着门缝听了听，掏出一根细铁丝，在锁孔里鼓捣了一阵。咔哒一声，门开了。",
    next: "cd04",
  },
  cd04: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "搞定。",
    next: "cd05",
  },
  cd05: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "太好了。",
    next: "cd06",
  },
  cd06: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "你们俩就留在这吧，我自己先进去看看。如果有危险，你们就快逃，不用管我。",
    next: "cd07",
  },
  cd07: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "我要和你一起。",
    next: "cd08",
  },
  cd08: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……",
    next: "cd09",
  },
  cd09: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "我能帮上忙的，不会拖累你的。",
    next: "cd10",
  },
  cd10: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "好吧。",
    next: "cd11",
  },
  cd11: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "我还是在这待着给你们放风吧。",
    next: "cdFree",
  },
  // 🚶 开锁段结束：自由行动（玩家可探索城堡外围；走进感应区触发 cdAmbush）
  cdFree: { end: 2 },

  // ===== ② 感应区：暗影魔物凭空出现包围 → 必定落败战斗 =====
  cdA01: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "走廊尽头，几道暗影魔物凭空出现，包围了你们。",
    next: "cdA02",
  },
  cdA02: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……糟了。",
    next: "cdA03",
  },
  cdA03: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……它们是什么时候出现的？",
    next: "cdA04",
  },
  cdA04: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "不知道。……它们太多了，退后！",
    next: "cdA05",
  },
  cdA05: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "黑甲的身影从阴影中一个接一个涌出，像早就等在这里。你们退到墙边，再无去路。",
    next: "cdA06",
  },
  cdA06: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    onEnter: () => {
      // ⚔️ 注册本次剧情战斗：BattleResultPopup 的 STORY_BATTLE_ROUTES 命中 cdCastleFight 后，
      //    失败自动 talkToNpc 到 cdJail01（被囚段）；胜利（理论上不可能）到 cdFightWin
      user.markDialogueComplete('cdCastleFight', true);
      // 💀 必败：敌人数值碾压，玩家无法战胜
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [
            { monsterType: 'monster1', count: 3, name: '暗影守卫', hp: 99999, attack: 999, armor: 99, speed: 60, baseExp: 0 },
          ],
        });
      }, 400);
    },
    text: "……糟了！",
    next: "cdABattle",
  },
  cdABattle: { end: 2 }, // 结束对话进入战斗（胜负由 BattleResultPopup 路由）

  // ===== 胜利兜底（正常必败不会走到）：晨曦警觉继续涌来 → 自由行动 =====
  cdFightWin: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……赢了？不对，它们还在涌来。快撤！",
    next: "cdFightWinEnd",
  },
  cdFightWinEnd: { end: 2 },

  // ===== ③ 被囚段（战斗失败后自动触发 cdJail01） =====
  cdJail01: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "你们终究不是对手，被打晕在原地。但奇怪的是，暗影们并没有下死手，而是将你们拖到牢房里关了起来。",
    next: "cdJail02",
  },
  cdJail02: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "再醒来时，你被关在一间石牢里，手腕上缠着锁链。晨曦就在旁边，闭着眼，一动不动。",
    next: "cdJail03",
  },
  cdJail03: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……晨曦？晨曦！",
    next: "cdJail04",
  },
  cdJail04: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……唔……我没事。我们没死？",
    next: "cdJail05",
  },
  cdJail05: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "目前来看，我们好像被抓住关起来了。",
    next: "cdJail06",
  },
  cdJail06: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "莫奇呢，他逃走了吗？",
    next: "cdJail07",
  },
  cdJail07: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "你俩对视一眼，同时看向牢门外。走廊尽头传来锁链拖地的声响，一个熟悉的身影被两个暗影架着，拖进了对面的牢房。",
    next: "cdJail08",
  },
  cdJail08: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……嘶，轻点轻点，我自己会走！",
    next: "cdJail09",
  },
  cdJail09: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……莫奇？！你怎么也被抓了！",
    next: "cdJail10",
  },
  cdJail10: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……我也不知道啊！你们进去没多久，城堡里就冲出几个黑影，我跑都来不及……",
    next: "cdJail11",
  },
  cdJail11: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……不是说好了在外面等我吗！",
    next: "cdJail12",
  },
  cdJail12: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "我是在外面等啊！是它们出来找的我！",
    next: "cdJail13",
  },
  cdJail13: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……",
    next: "cdJail14",
  },
  cdJail14: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……这下好了，一个都没跑掉。",
    next: "cdJail15",
  },
  cdJail15: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……你闭嘴吧。",
    next: "cdJail16",
  },
  cdJail16: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "莫奇嘿嘿笑了两声，又安静下来。他靠在牢栏上，耳朵耷拉着。",
    next: "cdJail17",
  },

  // ===== 里亚送饭：兄弟重逢（立绘切换为晨曦 + 里亚） =====
  cdJail17: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "脚步声由远及近，停在对面的牢房外。一个身影站在暗处，身量不高，披着一件宽大的旧袍子，手里端着东西，像是给人送饭的。",
    next: "cdJail18",
  },
  cdJail18: {
    name: "晨曦",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……谁？",
    next: "cdJail19",
  },
  cdJail19: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "那身影顿了顿，往这边走了两步。",
    next: "cdJail20",
  },
  cdJail20: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……哥？！",
    next: "cdJail21",
  },
  cdJail21: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "莫奇猛地扑到牢栏上，声音都在抖。",
    next: "cdJail22",
  },
  cdJail22: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "哥！是我！莫奇！你还活着……你还活着！",
    next: "cdJail23",
  },
  cdJail23: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "里亚愣住了。他端着盘子的手抖了一下，好半天才找回声音。",
    next: "cdJail24",
  },
  cdJail24: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……莫奇？……你、你怎么会在这里？",
    next: "cdJail25",
  },
  cdJail25: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "我来找你啊！你都失踪这么久了，我每天都在林边等你……我、我以为你……",
    next: "cdJail26",
  },
  cdJail26: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……",
    next: "cdJail27",
  },
  cdJail27: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "里亚低下头，没说话。莫奇看着他，忽然发现他脖子下面，隐约有一道暗色的痕迹。",
    next: "cdJail28",
  },
  cdJail28: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……你脖子怎么了？是不是有人打你了？！",
    next: "cdJail29",
  },
  cdJail29: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……没有。是我自己不小心。",
    next: "cdJail30",
  },
  cdJail30: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "你骗我！",
    next: "cdJail31",
  },
  cdJail31: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……",
    next: "cdJail32",
  },
  cdJail32: {
    name: "晨曦",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……里亚，你认识这座城堡的主人？",
    next: "cdJail33",
  },
  cdJail33: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……嗯。是他救了我。",
    next: "cdJail34",
  },
  cdJail34: {
    name: "晨曦",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……救了你？",
    next: "cdJail35",
  },
  cdJail35: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……那天我差点被魔物吃了，是他路过，把我带了回来。",
    next: "cdJail36",
  },
  cdJail36: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "那为什么不回家？！你知不知道我找了你多久！",
    next: "cdJail37",
  },
  cdJail37: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……对不起，我没办法。",
    next: "cdJail38",
  },
  cdJail38: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……是这里的主人不让你离开吗？",
    next: "cdJail39",
  },
  cdJail39: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "里亚没有回答，往后退了半步，像是有什么话不敢说出口。",
    next: "cdJail40",
  },

  // ===== 暗影王登场（立绘切回晨曦 + 莫奇） =====
  cdJail40: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "就在这时，一道高大的身影无声地出现在走廊尽头。里亚立刻低下头，退到墙边。",
    next: "cdJail41",
  },
  cdJail41: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……原来你们还是兄弟吗？真有意思，我这算是让你们兄弟团聚了吧。",
    next: "cdJail42",
  },
  cdJail42: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "那声音低沉，像从很深的地方传来。他一步一步走近，目光在你们身上扫过，最后停在里亚身上。",
    next: "cdJail43",
  },
  cdJail43: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……是想放走他吗？",
    next: "cdJail44",
  },
  cdJail44: {
    name: "里亚",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……对、对不起，我马上回去。",
    next: "cdJail45",
  },
  cdJail45: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "你、你就是这城堡的主人？！你究竟想干什么？",
    next: "cdJail46",
  },
  cdJail46: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……我可是你哥的救命恩人呢。",
    next: "cdJail47",
  },
  cdJail47: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "那你为什么不让我哥回家！",
    next: "cdJail48",
  },
  cdJail48: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……你问他。",
    next: "cdJail49",
  },
  cdJail49: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "莫奇看向里亚。里亚低着头，手指攥着旧围巾的边，没有抬头。",
    next: "cdJail50",
  },
  cdJail50: {
    name: "里亚",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……主人，求您放过他们。他们只是来找我的。",
    next: "cdJail51",
  },
  cdJail51: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……放过他们？",
    next: "cdJail52",
  },
  cdJail52: {
    name: "里亚",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……求您了。我什么都可以做。",
    next: "cdJail53",
  },
  cdJail53: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "暗影王沉默了一会儿。他低头看着里亚，像在看一件有趣的东西。",
    next: "cdJail54",
  },
  cdJail54: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……不行。",
    next: "cdJail55",
  },
  cdJail55: {
    name: "里亚",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……！",
    next: "cdJail56",
  },
  cdJail56: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "他们冒犯了我的领地，被我吃掉也是可以的吧？",
    next: "cdJail57",
  },
  cdJail57: {
    name: "里亚",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……求你了，别吃他们，我愿意做任何事。",
    next: "cdJail58",
  },
  cdJail58: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……可我饿了呢。吃掉他们，我的力量能提升一大截。你觉得，你有什么资格让我放走他们？",
    next: "cdJail59",
  },
  cdJail59: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "里亚张了张嘴，什么也没说出来。他站在那里，肩膀微微发抖。",
    next: "cdJail60",
  },
  cdJail60: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……哥，别求他！他要是敢吃我们，我就……",
    next: "cdJail61",
  },
  cdJail61: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……你就怎样？",
    next: "cdJail62",
  },
  cdJail62: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "暗影王转头看向莫奇。莫奇的声音一下卡住了，爪子攥着牢栏，指节发白。",
    next: "cdJail63",
  },
  cdJail63: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……呵，跟你哥一样，嘴硬。",
    next: "cdJail64",
  },
  cdJail64: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "我骗你的。看把你吓得，脸都白了。",
    next: "cdJail65",
  },
  cdJail65: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……你！",
    next: "cdJail66",
  },
  cdJail66: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "你们就好好在牢里待着吧。正好，我这城堡好久没这么热闹了。",
    next: "cdJail67",
  },
  cdJail67: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "暗影王转身要走，走了两步，又停下来，回头看向里亚。",
    next: "cdJail68",
  },
  cdJail68: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……对了，里亚。你要是敢半夜偷偷放走他们，我真的会生气哦。",
    next: "cdJail69",
  },
  cdJail69: {
    name: "里亚",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……我不会的。",
    next: "cdJail70",
  },
  cdJail70: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "这才乖。",
    next: "cdJail71",
  },
  cdJail71: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "暗影王走了。里亚站在原地，端着盘子，手抖得厉害。",
    next: "cdJail72",
  },
  cdJail72: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "哥，你别怕他！我们会想办法出去的！",
    next: "cdJail73",
  },
  cdJail73: {
    name: "里亚",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "别说了，你们好好待着吧，我会找机会朝他求情的。",
    next: "cdJail74",
  },
  cdJail74: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "里亚放下盘子，转身快步走了。牢门外的脚步声渐渐远去。",
    next: "cdJail75",
  },
  cdJail75: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……",
    next: "cdJail75b",
  },
  // 🦷 插曲：晨曦牙咬镣铐（里亚离开后、三人对话前，苦中作乐；莫奇会开锁为幕11深夜开锁埋伏笔）
  cdJail75b: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "晨曦低着头，不知在鼓捣什么。你凑近一看，他正用牙咬着手腕上的镣铐。",
    next: "cdJail75c",
  },
  cdJail75c: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "等等，晨曦你在干嘛？",
    next: "cdJail75d",
  },
  cdJail75d: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "嗯唔……",
    next: "cdJail75e",
  },
  cdJail75e: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "我在尝试解开这副镣铐呢！",
    next: "cdJail75f",
  },
  cdJail75f: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "用牙咬……真的可行吗？",
    next: "cdJail75g",
  },
  cdJail75g: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "不试试怎么知道呢。",
    next: "cdJail75h",
  },
  cdJail75h: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "尝试许久后，晨曦郁闷地停了下来。",
    next: "cdJail75i",
  },
  cdJail75i: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "怎么样？",
    next: "cdJail75j",
  },
  cdJail75j: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "不怎么样，牙好酸，再咬下去感觉牙要断了。",
    next: "cdJail75k",
  },
  cdJail75k: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "我们还是再想想办法吧。",
    next: "cdJail75l",
  },
  cdJail75l: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "喂，你们在干嘛呢？",
    next: "cdJail75m",
  },
  cdJail75m: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "莫奇，你怎么出来了？",
    next: "cdJail75n",
  },
  cdJail75n: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "你们忘了谁开的大门锁了？",
    next: "cdJail75o",
  },
  cdJail75o: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "对了诶，你会开锁，没想到你连手铐也能解开。",
    next: "cdJail75p",
  },
  cdJail75p: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "小把戏小把戏……",
    next: "cdJail75q",
  },
  cdJail75q: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "早说呀，我牙疼死了。",
    next: "cdJail75r",
  },
  cdJail75r: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "这不是以为你在磨牙吗？",
    next: "cdJail75s",
  },
  cdJail75s: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "你就是故意的。",
    next: "cdJail75t",
  },
  cdJail75t: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "好啦，我这就来给你们开锁。",
    next: "cdJail75u",
  },
  cdJail75u: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "莫奇说着就往这边凑。可刚迈出两步，走廊尽头传来动静，他一下缩了回去。",
    next: "cdJail75v",
  },
  cdJail75v: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……嘘。夜里再说。",
    next: "cdJail76",
  },
  cdJail76: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "你认识那个魔物吗？",
    next: "cdJail77",
  },
  cdJail77: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "不认识，但感觉并没有想吃掉我们的意思。",
    next: "cdJail78",
  },
  cdJail78: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "而且里亚他看起来，很害怕。",
    next: "cdJail79",
  },
  cdJail79: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……嗯。",
    next: "cdJail80",
  },
  cdJail80: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "三人在牢房里沉默了很久。你低头看着手腕上的锁链，这个世界，好像比想象中要可怕得多。",
    next: "cdJailEnd",
  },
  // 🏁 被囚段完成标记（cdJailEnd）：感应区入口据此不再触发战斗
  cdJailEnd: { end: 1 },

  // 🏰 ===== 幕10 牢房：和里亚交谈（多选题菜单） =====
  // 触发：被囚禁后（cdJailEnd 完成），牢房里点击里亚 NPC。
  //       Tiled 触发对象：dialogLoadData='npc/forest-deep'，dialogName='cdTalk'
  // 交互：4 个问题可多选，每个只问一次（选过即隐藏：cdAsk1-4 标记），回答完回到菜单；最后「没什么想问的了」退出
  cdTalk: {
    autoNext: 0,
    next: () => {
      // 🏁 脱困后里亚已回营地，牢房不再触发交谈
      if (user.isDialogueComplete?.('cdEsEnd')) return 'cdIdle';
      if (user.isDialogueComplete?.('cdJailEnd')) return user.getDialogueFlag('cdTalkStarted') ? 'cdTalkM' : 'cdTalk0';
      return 'cdIdle';
    },
  },
  // 首次开场：里亚又偷偷来送吃的
  cdTalk0: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "牢房外又响起脚步声。里亚左右看了看，端着一碗东西快步走到牢栏前。",
    onEnter: () => user.setDialogueFlag('cdTalkStarted', true),
    next: "cdTalk0b",
  },
  cdTalk0b: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "哥，你不准备解释一下吗？",
    next: "cdTalk0c",
  },
  cdTalk0c: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……你们还好吗，先吃点东西吧。有什么想问的就问吧，我会回答的。",
    next: "cdTalkM",
  },
  // 菜单：4 个问题可多选，选过即隐藏；最后一项退出
  cdTalkM: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……还有什么想问的吗？",
    repeatable: true,
    options: [
      { text: "那个魔物，是什么来历？", next: "cdTk1", condition: () => !user.getDialogueFlag('cdAsk1'), onSelect: () => user.setDialogueFlag('cdAsk1', true) },
      { text: "那个魔物，有什么能力？", next: "cdTk2", condition: () => !user.getDialogueFlag('cdAsk2'), onSelect: () => user.setDialogueFlag('cdAsk2', true) },
      { text: "你在这里，过得好吗？", next: "cdTk3", condition: () => !user.getDialogueFlag('cdAsk3'), onSelect: () => user.setDialogueFlag('cdAsk3', true) },
      { text: "城堡里，还住着别的东西吗？", next: "cdTk4", condition: () => !user.getDialogueFlag('cdAsk4'), onSelect: () => user.setDialogueFlag('cdAsk4', true) },
      { text: "（没什么想问的了）", next: "cdTkEnd" },
    ],
  },
  // ① 那个魔物，是什么来历？
  cdTk1: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "他称呼自己为暗，是个能沟通的高级魔物。是他救了我，给我吃喝，给我住的地方。",
    next: "cdTk1b",
  },
  cdTk1b: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……他待我还行。",
    next: "cdTk1c",
  },
  cdTk1c: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "他是魔物，不是人。",
    next: "cdTk1d",
  },
  cdTk1d: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……好吧。",
    next: "cdTk1e",
  },
  cdTk1e: {
    name: "林恩1",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "你没想过回去吗？",
    next: "cdTk1f",
  },
  cdTk1f: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "我试过几次逃跑，都被抓回来了。",
    next: "cdTk1g",
  },
  cdTk1g: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "他说过，只要我完成任务，就会放我离开。",
    next: "cdTk1h",
  },
  cdTk1h: {
    name: "林恩1",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "什么任务？",
    next: "cdTk1i",
  },
  cdTk1i: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "我的能力能潜移默化地改变别人的情绪，他想用这个，跟另一个魔物更亲近些。",
    next: "cdTk1j",
  },
  cdTk1j: {
    name: "晨曦",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "还有别的魔物？",
    next: "cdTk1k",
  },
  cdTk1k: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "嗯。不过那位经常不在。",
    next: "cdTalkM",
  },
  // ② 那个魔物，有什么能力？
  cdTk2: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……他能让别的魔物听他的话。我见过的魔物里，没有哪个能比得上他。",
    next: "cdTk2b",
  },
  cdTk2b: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "你们别轻举妄动，我会去求他放过你们的。",
    next: "cdTk2c",
  },
  cdTk2c: {
    name: "林恩1",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……他能答应？",
    next: "cdTk2d",
  },
  cdTk2d: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……我会努力试试的。",
    next: "cdTalkM",
  },
  // ③ 你在这里，过得好吗？
  cdTk3: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "他像是第一次被人这么问，愣了好一会儿。",
    next: "cdTk3b",
  },
  cdTk3b: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……吃穿不愁。他不会饿着我，也不会打我。就是……",
    next: "cdTk3c",
  },
  cdTk3c: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……他不肯让我离开。",
    next: "cdTalkM",
  },
  // ④ 城堡里，还住着别的东西吗？（风息伏笔，尾部带子选项）
  cdTk4: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……有一位客人。主人对他很好，好得不像话。",
    next: "cdTk4b",
  },
  cdTk4b: {
    name: "林恩1",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……客人？",
    next: "cdTk4c",
  },
  cdTk4c: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……嗯。主人每天都会去看他，还会让我给他做吃的。",
    next: "cdTk4d",
  },
  cdTk4d: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "主人很崇拜他。",
    next: "cdTk4e",
  },
  cdTk4e: {
    name: "林恩1",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……他是谁？",
    next: "cdTk4f",
  },
  cdTk4f: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……我不知道。我没看清过他的脸，他总是待在里屋不出来。就记得他头发很淡，说话声音很轻。",
    next: "cdTk4f2",
  },
  cdTk4f2: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "晨曦没有接话。他低着头，好一会儿没出声。",
    next: "cdTk4f3",
  },
  cdTk4f3: {
    name: "晨曦",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……没什么。你继续说。",
    next: "cdTk4g",
  },
  cdTk4g: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "他说是他救了我，要我报答他，认他做主人。",
    next: "cdTk4h",
  },
  cdTk4h: {
    name: "莫奇",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "你还真答应了？太丢人了吧。",
    next: "cdTk4i",
  },
  cdTk4i: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "我也没办法呀，要是不答应，他把我吃了怎么办。",
    next: "cdTalkM",
  },
  // ⑤ 退出
  cdTkEnd: {
    name: "里亚",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "……你们别着急，我会想办法的。",
    next: "cdTkEndb",
  },
  cdTkEndb: {
    name: "旁白",
    onStage: ["jinmao", "shangren2"],
    playerSkin: "moren",
    text: "他放下吃的，转身快步走了。",
    end: 2,
  },

  // 🏰 ===== 幕11 脱困（晨曦线）：被囚后触发 =====
  // 触发：cdJailEnd 完成后，牢房里点牢门/莫奇（Tiled 触发对象：dialogLoadData='npc/forest-deep'，dialogName='cdEscape'）
  // 流程：莫奇开锁 → 劝里亚同行 → 门口遇暗（必败战斗）→ 风息出场留下晨曦 → 营地醒来（里亚自责、云弥/西亚去救晨曦）
  cdEs01: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "夜深了。莫奇确认周围没有动静，捣鼓了一阵，把自己的手铐打开了。",
    next: "cdEs02",
  },
  cdEs02: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "……这样也能开？",
    next: "cdEs03",
  },
  cdEs03: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "我早说过了，到处漂泊，总要有本事在身上。",
    next: "cdEs04",
  },
  cdEs04: {
    name: "旁白",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "说完，莫奇也将你们放了出来。",
    next: "cdEs05",
  },
  cdEs05: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1"],
    playerSkin: "moren",
    text: "走吧。",
    next: "cdEs06",
  },
  // —— 找到里亚，劝他同行 ——
  cdEs06: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "三人贴着墙摸出牢房，一路小心翼翼地搜索，在一间偏房里找到了里亚。",
    next: "cdEs07",
  },
  cdEs07: {
    name: "里亚",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……你们？！你们怎么出来的？！",
    next: "cdEs08",
  },
  cdEs08: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "哥，跟我们走！",
    next: "cdEs09",
  },
  cdEs09: {
    name: "里亚",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……你们疯了！要是他发现你们跑了，后果很恐怖的。",
    next: "cdEs10",
  },
  cdEs10: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "不然你想我们乖乖等他放了我们？别做梦了。",
    next: "cdEs11",
  },
  cdEs11: {
    name: "里亚",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "可是……",
    next: "cdEs12",
  },
  cdEs12: {
    name: "莫奇",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "走吧，别在这耗着了。",
    next: "cdEs13",
  },
  cdEs13: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "里亚低下头，好一会儿，才像是下了什么决心。",
    next: "cdEs14",
  },
  cdEs14: {
    name: "里亚",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……好。我跟你们走。要是被发现了，我会拖住他的。",
    next: "cdEs15",
  },
  // —— 门口遇暗 ——
  cdEs15: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "四人摸到城堡大门。门开着，月色从门缝漏进来。门框边，一道身影不知站了多久。",
    next: "cdEs16",
  },
  cdEs16: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……你们去哪。",
    next: "cdEs17",
  },
  cdEs17: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "他问得很平静，像是随口一问。里亚的脚步一下就钉住了，低着头，不敢看他。",
    next: "cdEs18",
  },
  cdEs18: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "里亚。",
    next: "cdEs19",
  },
  cdEs19: {
    name: "里亚",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "我……",
    next: "cdEs20",
  },
  cdEs20: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你违背了我们的约定。",
    next: "cdEs21",
  },
  cdEs21: {
    name: "里亚",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……对不起。",
    next: "cdEs22",
  },
  cdEs22: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……呵。算了。",
    next: "cdEs23",
  },
  cdEs23: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "暗影王抬手，暗色的力量在掌心凝聚，封住了整个出口。",
    next: "cdEs24",
  },
  cdEs24: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……想走？先打赢我再说。",
    next: "cdEs25",
  },
  cdEs25: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    onEnter: () => {
      // ⚔️ 注册本次剧情战斗：BattleResultPopup 的 STORY_BATTLE_ROUTES 命中 cdEscapeFight 后，
      //    失败自动 talkToNpc 到 cdEs26（风息救场段）；胜利（理论上不可能）到 cdEsWin
      user.markDialogueComplete('cdEscapeFight', true);
      // 💀 必败：暗影王数值碾压，玩家无法战胜
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [
            { monsterType: 'monster1', count: 1, name: '暗影王', hp: 99999, attack: 999, armor: 99, speed: 80, baseExp: 0 },
          ],
        });
      }, 400);
    },
    text: "林恩1，退后！",
    next: "cdEsBattle",
  },
  cdEsBattle: { end: 2 }, // 结束对话进入战斗（胜负由 BattleResultPopup 路由）

  // ===== 胜利兜底（正常必败不会走到）：暗影王未认真 → 汇合风息出场段 =====
  cdEsWin: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……赢了？不对，他没认真。",
    next: "cdEs29",
  },

  // ===== 战斗失败后：风息出场，留下晨曦 =====
  cdEs26: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你们被逼到墙角，暗影王的力量像潮水一样压过来。晨曦护在你身前，单膝跪地，撑不住地发抖。",
    next: "cdEs27",
  },
  cdEs27: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……就这点本事，也敢放肆。",
    next: "cdEs28",
  },
  cdEs28: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "他抬起手，暗色的力量在掌心凝聚，对准了你们。",
    next: "cdEs29",
  },
  cdEs29: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……够了。",
    next: "cdEs30",
  },
  cdEs30: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "一个清冷的声音从走廊尽头传来。风息慢慢走出来，站在你们和暗影王之间。",
    next: "cdEs31",
  },
  cdEs31: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你怎么来了？",
    next: "cdEs32",
  },
  cdEs32: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……风息？！",
    next: "cdEs33",
  },
  cdEs33: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "晨曦的声音一下变了调。他死死盯着风息，像在看一个不可能出现的人。",
    next: "cdEs34",
  },
  cdEs34: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……你、你还活着？！",
    next: "cdEs35",
  },
  cdEs35: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……嗯。让你失望了。",
    next: "cdEs36",
  },
  cdEs36: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你们认识？",
    next: "cdEs37",
  },
  cdEs37: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "风息看着他，目光很冷。可在那冷底下，又像是压着什么别的东西。",
    next: "cdEs38",
  },
  cdEs38: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "认识，当然认识，我得好好和他重温一下。",
    next: "cdEs39",
  },
  cdEs39: {
    name: "晨曦",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "风息，你这些年过得怎么样？",
    next: "cdEs40",
  },
  cdEs40: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "闭嘴。",
    next: "cdEs41",
  },
  cdEs41: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……别跟我说话，我听着犯恶心。",
    next: "cdEs42",
  },
  cdEs42: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "风息，让我来收拾他。",
    next: "cdEs43",
  },
  cdEs43: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……他，是我的。轮不到你动手。",
    next: "cdEs44",
  },
  cdEs44: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……行。你说了算。",
    next: "cdEs45",
  },
  cdEs45: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……其他人，都给我滚。",
    next: "cdEs46",
  },
  cdEs46: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "他看向晨曦，目光像结了霜。",
    next: "cdEs47",
  },
  cdEs47: {
    name: "暗影王",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "不行，他们都是我好不容易抓到的。",
    next: "cdEs48",
  },
  cdEs48: {
    name: "林恩1",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……不行！要走一起走！",
    next: "cdEs49",
  },
  cdEs49: {
    name: "风息",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "够了！",
    next: "cdEs50",
  },
  cdEs50: {
    name: "旁白",
    onStage: ["jinmao", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "一阵狂风袭来，你被重重撞到墙上，晕了过去。",
    next: "cdEs51",
  },
  // —— 醒来・营地（云弥+西亚+里亚同框） ——
  cdEs51: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "你睁开眼，先看到的是界木投下的光。你躺在营地的草垫上。",
    next: "cdEs52",
  },
  cdEs52: {
    name: "里亚",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……你醒了？！",
    next: "cdEs53",
  },
  cdEs53: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "里亚的声音带着哭腔，眼眶红红的。",
    next: "cdEs54",
  },
  cdEs54: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……晨曦呢？",
    next: "cdEs55",
  },
  cdEs55: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "里亚张了张嘴，没说出话。你转头，看见云弥和西亚都站在几步外，没有说话。",
    next: "cdEs56",
  },
  cdEs56: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……晨曦在哪？",
    next: "cdEs57",
  },
  cdEs57: {
    name: "里亚",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……对、对不起……都是因为我……",
    next: "cdEs58",
  },
  cdEs58: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "你挣扎着坐起来。记忆一点点回笼。",
    next: "cdEs59",
  },
  cdEs59: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……晨曦他，还在那？",
    next: "cdEs60",
  },
  cdEs60: {
    name: "里亚",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……嗯。当时没办法，晨曦交代了我们，一定要带你回去，我只能……",
    next: "cdEs61",
  },
  cdEs61: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "云弥转过身，看着你。他脸上没什么表情，可那双眼睛比平时沉。",
    next: "cdEs62",
  },
  cdEs62: {
    name: "云弥",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……你伤还没好。",
    next: "cdEs63",
  },
  cdEs63: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "我要去救他。",
    next: "cdEs64",
  },
  cdEs64: {
    name: "云弥",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……我会亲自去的。",
    next: "cdEs65",
  },
  cdEs65: {
    name: "云弥",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……好好养伤。",
    next: "cdEs66",
  },
  cdEs66: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "他说完，转身走了。里亚看着他的背影，又看看你。",
    next: "cdEs67",
  },
  cdEs67: {
    name: "里亚",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……你也是。这么危险的事，为什么不和我们商量？",
    next: "cdEs68",
  },
  cdEs68: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……对不起。",
    next: "cdEs69",
  },
  cdEs69: {
    name: "里亚",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "哎，我也得跟着云弥去，我不太放心。你好好待着养伤。",
    next: "cdEs70",
  },
  cdEs70: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    text: "……好。",
    next: "cdEs71",
  },
  cdEs71: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren2"],
    playerSkin: "moren",
    onEnter: () => {
      // 🎒 幕11后任务「等待众人回归」：云弥/西亚/里亚去救晨曦，玩家留营地养伤练级（幂等，仅添加一次）
      const all = [...(user.allTasks?.mainTasks || []), ...(user.allTasks?.sideTasks || [])];
      if (!all.some(t => t.name === '等待众人回归')) {
        user.addTask?.({
          id: 'wait_return',
          name: '等待众人回归',
          description: '云弥、西亚和里亚去救晨曦了。留在营地养伤，努力提升实力，等他们带着晨曦回来。',
          steps: [
            { id: 'grow', content: '努力提升实力，完成 10 级突破' },
          ],
        }, 'side');
      }
      // 👥 三人离开期间：同伴查看隐藏晨曦/西亚/云弥，不可携带（幕12回归时恢复）
      hideAlliesDuringRescue();
    },
    text: "西亚也跟了上去。你躺在草垫上，看着他们的背影消失在界木的光里。",
    next: "cdEsEnd",
  },
  // 🏁 脱困段完成标记（cdEsEnd）：晨曦被留在城堡，里亚/云弥/西亚去营救
  cdEsEnd: { end: 1 },
  // 🌊 ===== 幕10 云弥线（cdY）：可胜深入城堡（云弥+莫奇+玩家） =====
  // 入口：forest-castle.js mzIn yu 分支检测「云弥线提交线索完成（myrEnd）且未深入过（!cdYEnd）」→ 转发 cdY01
  // 流程：开锁争执 → 突破埋伏（可胜 cdYAmbushFight）→ 找到里亚 → 门口战暗影王（可胜 cdYKingFight）→
  //       里亚求情、暗影王退走 → 兄弟重逢 → 几天后晨曦落单被抓（cdYRevenge，营地点莫奇触发）→
  //       cdYEnd（设任务「等待众人回归」+ 三人隐藏）→ 与晨曦线汇合复用守城之夜（cdSiege）
  cdY01: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    onEnter: () => {
      user.setDialogueFlag('cdYInCastle', true); // 🚩 云弥线深入中：感应区据此走可胜埋伏（cdYA01）
    },
    text: "云弥站在门前，没有动。他又一次看向你，目光很沉。",
    next: "cdY02",
  },
  cdY02: {
    name: "云弥",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "……危险。",
    next: "cdY03",
  },
  cdY03: {
    name: "林恩1",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "都到这里了，我们不能就这么回去。",
    next: "cdY04",
  },
  cdY04: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "云弥没接话。他移开眼，看着那扇门，像在看一件他不愿意靠近的东西。",
    next: "cdY05",
  },
  cdY05: {
    name: "林恩1",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "……莫奇，交给你了。",
    next: "cdY06",
  },
  cdY06: {
    name: "莫奇",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "好。",
    next: "cdY07",
  },
  cdY07: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "莫奇蹲在门前，耳朵贴着门缝听了听，掏出一根细铁丝，在锁孔里鼓捣了一阵。咔哒一声，门开了。",
    next: "cdY08",
  },
  cdY08: {
    name: "莫奇",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "搞定。我在这守着，就不进去给你们添乱了。",
    next: "cdY09",
  },
  cdY09: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "云弥走在你前面。他什么都没说，但你听得见，他的呼吸比平时沉了一点。",
    next: "cdYFree",
  },
  // 🚶 云弥线开锁段结束：自由行动（走进感应区触发 cdAmbush → cdYA01 可胜埋伏）
  cdYFree: { end: 2 },

  // ===== Y2 突破埋伏（可战胜） =====
  cdYA01: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "走廊尽头，几道暗影魔物凭空出现，包围了你们。它们像是早就等在这里，一双双幽绿的眼睛在暗处亮起。",
    next: "cdYA02",
  },
  cdYA02: {
    name: "林恩1",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "……糟了！",
    next: "cdYA03",
  },
  cdYA03: {
    name: "云弥",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "……站我身后。",
    next: "cdYA04",
  },
  cdYA04: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "云弥抬手，水蓝色的魔力在指尖绕了一圈，又散开。他没有回头。",
    next: "cdYA05",
  },
  cdYA05: {
    name: "云弥",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    onEnter: () => {
      // ⚔️ 云弥线埋伏（可胜）：BattleResultPopup 命中 cdYAmbushFight → 胜 cdYAw1 / 负 cdYAFail1（可重试）
      user.markDialogueComplete('cdYAmbushFight', true);
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [
            { monsterType: 'monster1', count: 2, name: '暗影守卫', hp: 120, attack: 25, armor: 8, speed: 35, baseExp: 30 },
          ],
        });
      }, 400);
    },
    text: "……别动。",
    next: "cdYABattle",
  },
  cdYABattle: { end: 2 },
  // —— 埋伏胜利收尾 ——
  cdYAw1: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "战斗结束得很快。暗影魔物像潮水一样退去，只留下满地残迹。云弥站在原地，连衣角都没乱。",
    next: "cdYAw2",
  },
  cdYAw2: {
    name: "林恩1",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "……你没事吧？",
    next: "cdYAw3",
  },
  cdYAw3: {
    name: "云弥",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "……嗯。我们走。",
    next: "cdYB01",
  },
  // —— 埋伏战败兜底（可重试：退出后重进感应区再触发） ——
  cdYAFail1: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "你们被逼退回走廊口，暗影没有追来。云弥护在你身前，眉头微微拧起。",
    next: "cdYAFail2",
  },
  cdYAFail2: {
    name: "云弥",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "……先退出去。",
    next: "cdYAFail3",
  },
  cdYAFail3: {
    name: "旁白",
    onStage: ["yu", "shangren1"],
    playerSkin: "moren",
    text: "莫奇在外面接应，看见你们出来，一脸担心。",
    end: 2,
  },

  // ===== Y3 找到里亚 =====
  cdYB01: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "在一间偏房里，你们找到了里亚。他坐在窗边，望着外面的月光，像一尊不会动的影子。",
    next: "cdYB02",
  },
  cdYB02: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……谁？！",
    next: "cdYB03",
  },
  cdYB03: {
    name: "林恩1",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你就是里亚吧。我们是来带你走的，莫奇就在外面等你。",
    next: "cdYB04",
  },
  cdYB04: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你们、你们怎么进来的？！这是主人的城堡！他会发现的！",
    next: "cdYB05",
  },
  cdYB05: {
    name: "林恩1",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "主人？先不管这些，我们要快点走。",
    next: "cdYB06",
  },
  cdYB06: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……我还不能走，我答应过他。",
    next: "cdYB07",
  },
  cdYB07: {
    name: "林恩1",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "喂，你疯了还是他们给你洗脑了？",
    next: "cdYB08",
  },
  cdYB08: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "我没有…… 他会放我离开的，但现在还不行。",
    next: "cdYB09",
  },
  cdYB09: {
    name: "林恩1",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你相信一个关着你的人？",
    next: "cdYB10",
  },
  cdYB10: {
    name: "林恩1",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你弟弟还在外面冒着危险等你，你就在这耗着？",
    next: "cdYB11",
  },
  cdYB11: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……好，我跟你们走。",
    next: "cdYC01",
  },

  // ===== Y4 门口遇暗（可战胜） =====
  cdYC01: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "三人摸到城堡大门。门框边，一道身影不知站了多久。",
    next: "cdYC02",
  },
  cdYC02: {
    name: "暗影王",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……里亚。我救了你，你就这么报答我？",
    next: "cdYC03",
  },
  cdYC03: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "里亚的脚步一下就钉住了，低着头，不敢看他。",
    next: "cdYC04",
  },
  cdYC04: {
    name: "云弥",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……让开。",
    next: "cdYC05",
  },
  cdYC05: {
    name: "暗影王",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "有意思。闯进我的城堡，抢走我的人，还想就这么离开？",
    next: "cdYC06",
  },
  cdYC06: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "暗影王抬手，暗色的力量封住了整个出口。",
    next: "cdYC07",
  },
  cdYC07: {
    name: "暗影王",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你觉得，我会答应？",
    next: "cdYC08",
  },
  cdYC08: {
    name: "云弥",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……不答应，就灭了你。",
    next: "cdYC09",
  },
  cdYC09: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "云弥上前一步，水蓝色的魔力在周身亮起，像月光落进了湖里。",
    next: "cdYC10",
  },
  cdYC10: {
    name: "云弥",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    onEnter: () => {
      // ⚔️ 云弥线门口战暗影王（可胜）：BattleResultPopup 命中 cdYKingFight → 胜 cdYCw1 / 负 cdYCFail1（可重试）
      user.markDialogueComplete('cdYKingFight', true);
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [
            { monsterType: 'monster1', count: 1, name: '暗影王', hp: 650, attack: 55, armor: 15, speed: 50, baseExp: 120 },
          ],
        });
      }, 400);
    },
    text: "……别动。",
    next: "cdYCBattle",
  },
  cdYCBattle: { end: 2 },
  // —— 暗影王战胜利收尾：里亚求情、暗影王退走 ——
  cdYCw1: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "暗影王半跪在地上，暗色一点点散去。他抬起头，目光从云弥身上移到你身上，最后停在里亚身上。",
    next: "cdYCw2",
  },
  cdYCw2: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "别杀他，他救过我。",
    next: "cdYCw3",
  },
  cdYCw3: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "里亚的声音发着抖。云弥抬起的手，停在半空。",
    next: "cdYCw4",
  },
  cdYCw4: {
    name: "云弥",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……魔物，救过你？",
    next: "cdYCw5",
  },
  cdYCw5: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "嗯，请你放过他吧，求你了。",
    next: "cdYCw6",
  },
  cdYCw6: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "云弥没有回答。他看了里亚很久，才慢慢把手放下。",
    next: "cdYCw7",
  },
  cdYCw7: {
    name: "暗影王",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……呵。有意思。这次，是我大意了。",
    next: "cdYCw8",
  },
  cdYCw8: {
    name: "暗影王",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……给我等着。这笔账，我一定会讨回来的。",
    next: "cdYCw9",
  },
  cdYCw9: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "暗影王说完，整个人化作一道暗色，消散在夜色里。",
    next: "cdYCw10",
  },
  cdYCw10: {
    name: "云弥",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……走吧。",
    next: "cdYD01",
  },
  // —— 暗影王战败兜底（可重试） ——
  cdYCFail1: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "暗影王的力量像潮水一样压过来，云弥护着你退到门边。",
    next: "cdYCFail2",
  },
  cdYCFail2: {
    name: "云弥",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……走。",
    next: "cdYCFail3",
  },
  cdYCFail3: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "暗影王没有追。他站在门边，像在看一场笑话。",
    end: 2,
  },

  // ===== Y5 回到森林・兄弟重逢 =====
  cdYD01: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "三人走出城堡，月色从林间漏下来。莫奇从树后探出半个身子，看见里亚，整个人愣在原地。",
    next: "cdYD02",
  },
  cdYD02: {
    name: "莫奇",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "……哥？真的是你！",
    next: "cdYD03",
  },
  cdYD03: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "莫奇扑上去，紧紧抱住里亚。里亚僵了一下，也慢慢抬起手，回抱住他。",
    next: "cdYD04",
  },
  cdYD04: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……对不起，让你担心了。",
    next: "cdYD05",
  },
  cdYD05: {
    name: "莫奇",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "你回来就好！回来就好！",
    next: "cdYD06",
  },
  cdYD06: {
    name: "里亚",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……谢谢你们。真的，谢谢。",
    next: "cdYD07",
  },
  cdYD07: {
    name: "林恩1",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……走吧，先回营地再说。",
    next: "cdYD08",
  },
  cdYD08: {
    name: "旁白",
    onStage: ["yu", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "云弥走在最后面。他回头看了一眼那座城堡，像是察觉到什么危险。",
    next: "cdYDone",
  },
  cdYDone: { end: 2 }, // 自由行动，几天后营地点莫奇触发 cdYRevenge（晨曦落单被抓）

  // ===== Y6 暗的报复（晨曦落单被抓） =====
  // 触发：Y5 完成后，营地点击莫奇（Tiled 触发对象：dialogLoadData='npc/forest-deep'，dialogName='cdYRevenge'）
  cdYRevenge: {
    autoNext: 0,
    next: () => (user.getDialogueFlag('cdYRevengeDone') ? 'cdYRevengeIdle' : 'cdYE01'),
  },
  cdYRevengeIdle: { end: 2 },
  cdYE01: {
    name: "旁白",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    onEnter: () => user.setDialogueFlag('cdYRevengeDone', true),
    text: "几天后的傍晚，营地外忽然传来急促的脚步声。你冲出帐篷，看见莫奇跑得上气不接下气，脸都白了。",
    next: "cdYE02",
  },
  cdYE02: {
    name: "莫奇",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "林恩1！不好了！晨曦被城堡里那个魔物抓走了！",
    next: "cdYE03",
  },
  cdYE03: {
    name: "林恩1",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "……什么？！",
    next: "cdYE04",
  },
  cdYE04: {
    name: "莫奇",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    npcSkin: {"shangren1":"moren1"},
    text: "我去森林边缘采集的时候，看见那个魔物拖着个人影往林子深处跑，是晨曦！我认得那道身影！",
    next: "cdYE05",
  },
  cdYE05: {
    name: "林恩1",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "云弥，我们得去救他！",
    next: "cdYE06",
  },
  cdYE06: {
    name: "云弥",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "……是我，他在报复我。",
    next: "cdYE07",
  },
  cdYE07: {
    name: "西亚",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "你们是不是瞒着我什么？",
    next: "cdYE08",
  },
  cdYE08: {
    name: "旁白",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "你们跟西亚解释了前因后果。",
    next: "cdYE09",
  },
  cdYE09: {
    name: "西亚",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "好呀，你们竟然瞒着我做了这么危险的事情。",
    next: "cdYE10",
  },
  cdYE10: {
    name: "林恩1",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "这不是怕被你骂嘛。",
    next: "cdYE11",
  },
  cdYE11: {
    name: "西亚",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "哎，算了，事到如今还是先想想办法吧。",
    next: "cdYE12",
  },
  cdYE12: {
    name: "云弥",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "……对不起，都是我的问题，我这就去把他救回来。",
    next: "cdYE13",
  },
  cdYE13: {
    name: "旁白",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "说完，云弥便离开前往森林了。",
    next: "cdYE14",
  },
  cdYE14: {
    name: "西亚",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "喂，算了，林恩1，你好好守着这里，我去帮帮他。",
    next: "cdYE15",
  },
  cdYE15: {
    name: "林恩1",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "我也想去帮忙！",
    next: "cdYE16",
  },
  cdYE16: {
    name: "西亚",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "你别捣乱，家里也需要有人守着，还是说你觉得你比我强？",
    next: "cdYE17",
  },
  cdYE17: {
    name: "林恩1",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "……好，我知道了。",
    next: "cdYE18",
  },
  cdYE18: {
    name: "西亚",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "记得帮我照顾好我的植物。",
    next: "cdYE19",
  },
  cdYE19: {
    name: "林恩1",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "你们会没事的，对吗？",
    next: "cdYE20",
  },
  cdYE20: {
    name: "西亚",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    text: "当然，有我在呢。",
    next: "cdYE21",
  },
  cdYE21: {
    name: "旁白",
    onStage: ["huli", "yu", "shangren1"],
    playerSkin: "moren",
    onEnter: () => {
      // 🎒 云弥线汇合：任务「等待众人回归」（与晨曦线共用，幂等）＋ 三人隐藏不可携带
      const all = [...(user.allTasks?.mainTasks || []), ...(user.allTasks?.sideTasks || [])];
      if (!all.some(t => t.name === '等待众人回归')) {
        user.addTask?.({
          id: 'wait_return',
          name: '等待众人回归',
          description: '云弥、西亚和里亚去救晨曦了。留在营地养伤，努力提升实力，等他们带着晨曦回来。',
          steps: [
            { id: 'grow', content: '努力提升实力，完成 10 级突破' },
          ],
        }, 'side');
      }
      hideAlliesDuringRescue();
    },
    text: "你站在界木的光里，看着他们的背影消失在夜色中。",
    next: "cdYEnd",
  },
  // 🏁 云弥线完成标记（cdYEnd）：晨曦被抓、云弥/西亚/里亚去救 → 与晨曦线汇合（复用守城之夜 cdSiege）
  cdYEnd: { end: 1 },


  // 🏰 ===== 幕11后 过渡期营地：莫奇（等待众人回归） =====
  // 触发：cdEsEnd 完成后，营地点击莫奇（Tiled 触发对象：dialogLoadData='npc/forest-deep'，dialogName='cdEsMq'）
  // 第一次对话进入剧情；之后每次点击莫奇只问候「需要什么帮助吗？」
  cdEsMq: {
    autoNext: 0,
    next: () => (user.getDialogueFlag('cdEsMqDone') ? 'cdEsMqIdle' : 'cdEsMq1'),
  },
  cdEsMq1: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    onEnter: () => user.setDialogueFlag('cdEsMqDone', true),
    text: "莫奇，你有他们的消息吗？",
    next: "cdEsMq1b",
  },
  cdEsMq1b: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "还没有，云弥哥说了，让你好好养伤，别乱跑。",
    next: "cdEsMq1c",
  },
  cdEsMq1c: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……他们什么时候回来？",
    next: "cdEsMq1d",
  },
  cdEsMq1d: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "抱歉，我也不知道。",
    next: "cdEsMq1e",
  },
  cdEsMq1e: {
    name: "旁白",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "莫奇给你盛了碗热汤，坐在旁边，难得没有贫嘴。好一会儿，他才开口。",
    next: "cdEsMq1f",
  },
  cdEsMq1f: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……说起来，都怪我。",
    next: "cdEsMq1g",
  },
  cdEsMq1g: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……什么？",
    next: "cdEsMq1h",
  },
  cdEsMq1h: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "要不是我，你们也就不会去那里。",
    next: "cdEsMq1i",
  },
  cdEsMq1i: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "晨曦也就不会被抓，他们也就不会离开了。",
    next: "cdEsMq1j",
  },
  cdEsMq1j: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……莫奇。",
    next: "cdEsMq1k",
  },
  cdEsMq1k: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "我多希望他们抓的是我，这样我也就不会这么难受了。",
    next: "cdEsMq1l",
  },
  cdEsMq1l: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "是我害的晨曦，我真的很抱歉。",
    next: "cdEsMq1m",
  },
  cdEsMq1m: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……不怪你。",
    next: "cdEsMq1n",
  },
  cdEsMq1n: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "是我想要帮你，要怪也是怪我，你没有错。",
    next: "cdEsMq1o",
  },
  cdEsMq1o: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "都怪我太弱了，没能帮上忙，我一定要变强，这样我就能保护他们了。",
    next: "cdEsMq1p",
  },
  cdEsMq1p: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……好，你一定可以的。",
    next: "cdEsMq1q",
  },
  cdEsMq1q: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "你帮了我，我总得报答你点什么。",
    next: "cdEsMq1r",
  },
  cdEsMq1r: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……你不用报答，是我自愿的。",
    next: "cdEsMq1s",
  },
  cdEsMq1s: {
    name: "旁白",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "莫奇伸出手，掌心里浮起一点暖融融的光。他把它轻轻按在你额头上。",
    next: "cdEsMq1t",
  },
  cdEsMq1t: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……愿你前路有光，遇难呈祥。",
    next: "cdEsMq1u",
  },
  cdEsMq1u: {
    name: "旁白",
    onStage: "shangren1",
    playerSkin: "moren",
    onEnter: () => {
      // 💛 莫奇的祝福：一生一次，天赋已内置（moqi_blessing，每装备一件道具进入战斗攻击力+6%）
      user.unlockAutoGrantedTalent?.('moqi_blessing');
    },
    text: "那点光没进你身体里。你感觉胸口一暖，像有什么东西，从此留了下来。",
    next: "cdEsMq1v",
  },
  cdEsMq1v: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "这是什么？",
    next: "cdEsMq1w",
  },
  cdEsMq1w: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "你不知道吗？",
    next: "cdEsMq1x",
  },
  cdEsMq1x: {
    name: "旁白",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "你摇了摇头。",
    next: "cdEsMq1y",
  },
  cdEsMq1y: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "就算是我的一点小小祝福吧。",
    next: "cdEsMq1z",
  },
  cdEsMq1z: {
    name: "林恩1",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……谢谢。",
    next: "cdEsMq1aa",
  },
  cdEsMq1aa: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……嗐，谢什么。饭凉了，快吃。",
    end: 1,
  },
  cdEsMqIdle: {
    name: "莫奇",
    onStage: "shangren1",
    playerSkin: "moren",
    text: "……需要什么帮助吗？",
    end: 2,
  },

  // 🏕️ ===== 过渡期：里亚看望（云弥/西亚解救晨曦后，第一次点休息触发，仅一次） =====
  // 触发：营地休息问号/按钮路由最前面加 → { ifCompleted: 'cdEsEnd', ifNotCompleted: 'cdEsVisitEnd', name: 'cdEsVisit' }
  //   需 cdEsEnd（幕11脱困，云弥/西亚去解救晨曦）已完成 且 未看过望 → 点休息先播这段（含幸运戒指）；否则正常休息
  cdEsVisit: {
    name: "旁白",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "傍晚，你坐在界木下歇着，营地外传来小心的脚步声。",
    next: "cdEsVisit1",
  },
  cdEsVisit1: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "……那个，你没在忙吧？",
    next: "cdEsVisit2",
  },
  cdEsVisit2: {
    name: "旁白",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "你回头，里亚站在几步外，手里攥着个小布袋，有点局促。",
    next: "cdEsVisit3",
  },
  cdEsVisit3: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "里亚？你怎么过来了？",
    next: "cdEsVisit4",
  },
  cdEsVisit4: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "我就是来看看你。",
    next: "cdEsVisit5",
  },
  cdEsVisit5: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "你还好吗？",
    next: "cdEsVisit6",
  },
  cdEsVisit6: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "没事，我还好。",
    next: "cdEsVisit7",
  },
  cdEsVisit7: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "晨曦的事…… 都怪我。",
    next: "cdEsVisit8",
  },
  cdEsVisit8: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "不怪你，是我太弱了。",
    next: "cdEsVisit9",
  },
  cdEsVisit9: {
    name: "旁白",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "里亚低下头，好一会儿，才把手里的小布袋递过来。",
    next: "cdEsVisit10",
  },
  cdEsVisit10: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "……这个，给你。",
    next: "cdEsVisit11",
  },
  cdEsVisit11: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "这是什么？",
    next: "cdEsVisit12",
  },
  cdEsVisit12: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "一个幸运戒指。是…… 是我从小就戴着的，陪了我很久很久。",
    next: "cdEsVisit13",
  },
  cdEsVisit13: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "那你为什么要给我？",
    next: "cdEsVisit14",
  },
  cdEsVisit14: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "我没什么能报答你的。我太没用了，帮不上忙，还会拖累人。",
    next: "cdEsVisit15",
  },
  cdEsVisit15: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    onEnter: () => {
      // 💍 里亚的幸运戒指（仅一次）：入包 + 拾取提示
      user.addItemToInventory?.({ name: '幸运戒指', num: 1 });
      emitter.emit('dungeonItemGain', { name: '幸运戒指', num: 1, img: 'jiezhi1' });
    },
    text: "这是我身上最珍贵的东西了，我希望它能替我，保佑你平平安安的。",
    next: "cdEsVisit16",
  },
  cdEsVisit16: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "这太贵重了，你还是收回去吧。",
    next: "cdEsVisit17",
  },
  cdEsVisit17: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "不，你救了我的命，跟这比，我欠你的还远远不够。",
    next: "cdEsVisit18",
  },
  cdEsVisit18: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "……不，足够了，谢谢你，里亚。",
    next: "cdEsVisit19",
  },
  cdEsVisit19: {
    name: "里亚",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "好，你好好待着，千万别再去那个地方了。",
    next: "cdEsVisit20",
  },
  cdEsVisit20: {
    name: "林恩1",
    onStage: "shangren2",
    playerSkin: "moren",
    text: "嗯。",
    next: "cdEsVisitEnd",
  },
  cdEsVisitEnd: { end: 1 },

  // ⚔️ ===== 幕12 守城之夜（10级突破后的次日，营地触发点 dialogName='cdSiege'） =====
  // 触发：任务「等待众人回归」完成（10级突破）＋ 休息过夜到次日（cdSiegeReady，matter.vue onDayCgFinished 设置）＋ 未看过（!cdSiegeEnd）
  // 战斗：连续4波（cdSiege1-4，flags 注册于 cdSgW1/2/3/4），任何一波失败 → cdSgFail（营地沦陷坏结局）；全部胜利 → cdSgEnd（恢复三人可携带）
  cdSiege: {
    autoNext: 0,
    next: () => {
      if (user.isDialogueComplete?.('cdSiegeEnd')) return 'cdSiegeIdle';
      if (!user.isTaskCompleted?.('wait_return')) return 'cdSiegeNotYet';
      if (!user.getDialogueFlag?.('cdSiegeReady')) return 'cdSiegeNotYet';
      return 'cdSg01';
    },
  },
  cdSiegeNotYet: {
    name: "旁白",
    playerSkin: "moren",
    text: "……还不是时候。",
    end: 2,
  },
  cdSiegeIdle: {
    name: "旁白",
    playerSkin: "moren",
    text: "……",
    end: 2,
  },

  // ===== 第一场・负伤归来 =====
  cdSg01: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "次日一早，营地的安静被林子边的动静打破。你冲出帐篷，看见云弥背着晨曦走在前面，西亚捂着胳膊，布条底下还在渗血，里亚在一旁搀扶着他。",
    next: "cdSg02",
  },
  cdSg02: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你们回来了……",
    next: "cdSg03",
  },
  cdSg03: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "云弥把晨曦小心放在草垫上，一句话没说，自己也晃了一下。",
    next: "cdSg04",
  },
  cdSg04: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你们怎么伤成这样？！",
    next: "cdSg05",
  },
  cdSg05: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "莫奇抱着药箱从边上迎过来，眼眶红红的。他是天没亮就出林子接应的，没想到真接上了。",
    next: "cdSg06",
  },
  cdSg06: {
    name: "莫奇",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "我是半路遇见的，他们伤得可重了，还好我带了恢复药剂，不然他们可能真要回不来了。",
    next: "cdSg07",
  },
  cdSg07: {
    name: "西亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……撞上了一个很强的魔物。",
    next: "cdSg07b",
  },
  cdSg07b: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……魔物？",
    next: "cdSg07c",
  },
  cdSg07c: {
    name: "西亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "嗯，专克云弥，路数熟得很。招招都冲着云弥的破绽去，像是早就摸透了他。我们急着护晨曦，差点没脱身。",
    next: "cdSg07d",
  },
  cdSg07d: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……你们认识他？",
    next: "cdSg07e",
  },
  cdSg07e: {
    name: "西亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "我可不认识。他倒是像认得云弥。",
    next: "cdSg07f",
  },
  cdSg07f: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "西亚说完，看了一眼云弥。云弥没接话，垂着眼睛，看不清神色。",
    next: "cdSg08",
  },
  cdSg08: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "有什么我能帮上忙的吗？",
    next: "cdSg09",
  },
  cdSg09: {
    name: "西亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "去我住处拿些恢复药剂过来，路上带的全喝光了。",
    next: "cdSg10",
  },
  cdSg10: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "众人喝下药剂后，伤势好转了些许。你才知道，他们在城堡里和那魔物混战了一场，虽然成功带走了晨曦，自己也受了重伤，怕是要养上半个月才能恢复。",
    next: "cdSg11",
  },
  cdSg11: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "西亚一路就没停过。他把晨曦安置好，转头又去翻药箱。他自己的伤口还在渗血，他像感觉不到一样。",
    next: "cdSg12",
  },
  cdSg12: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……西亚，你的手……",
    next: "cdSg13",
  },
  cdSg13: {
    name: "西亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "诶，别挡光，一边去。",
    next: "cdSg14",
  },
  cdSg14: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "他嘴上嫌弃，手上却没停，绷带绕得又快又稳。",
    next: "cdSg14b",
  },
  cdSg14b: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……",
    next: "cdSg14c",
  },
  cdSg14c: {
    name: "西亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……晨曦这笨蛋，把自己折腾成这样，回来还得我收拾。",
    next: "cdSg15",
  },
  cdSg15: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "晨曦的额头滚烫，人还在昏睡着，偶尔会难受地皱一下眉。",
    next: "cdSg16",
  },
  cdSg16: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……他怎么了？",
    next: "cdSg17",
  },
  cdSg17: {
    name: "云弥",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……被关了一天一夜。那魔物太狠了，没少折磨他。",
    next: "cdSg18",
  },
  cdSg18: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……",
    next: "cdSg19",
  },
  cdSg19: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你握住晨曦的手，滚烫。",
    next: "cdSg19b",
  },
  cdSg19b: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……你说什么？",
    next: "cdSg19c",
  },
  cdSg19c: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "他没有回答。你凑近听了很久，才听清那个断断续续的音节。",
    next: "cdSg19d",
  },
  cdSg19d: {
    name: "晨曦",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……对不起",
    next: "cdSg19e",
  },
  cdSg19e: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你愣住了。你握着他的手，过了好一会儿，才轻轻放回去。",
    next: "cdSg20",
  },
  cdSg20: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "西亚给晨曦处理完，才坐下处理自己的伤。云弥泡在水池里，谁也不看。",
    next: "cdSg20b",
  },
  cdSg20b: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "里亚一直没走。他蹲在晨曦旁边，等西亚包扎完，才轻轻伸出手，贴了贴晨曦的额头。",
    next: "cdSg20c",
  },
  cdSg20c: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……里亚？",
    next: "cdSg20d",
  },
  cdSg20d: {
    name: "里亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……我的能力很弱，只能让他好受一点点。",
    next: "cdSg20e",
  },
  cdSg20e: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你看见晨曦拧着的眉，像是真的松开了一些。",
    next: "cdSg20f",
  },
  cdSg20f: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……谢谢你。",
    next: "cdSg20g",
  },
  cdSg20g: {
    name: "里亚",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "这是我欠你们的。",
    next: "cdSg20h",
  },
  cdSg20h: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "你走到水池边，蹲下来。",
    next: "cdSg20i",
  },
  cdSg20i: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……云弥，你的伤。",
    next: "cdSg20j",
  },
  cdSg20j: {
    name: "云弥",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……没事。",
    next: "cdSg20k",
  },
  cdSg20k: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……那个人，你认识？",
    next: "cdSg20l",
  },
  cdSg20l: {
    name: "云弥",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……嗯。他叫风息。以前，我们一起战斗过。",
    next: "cdSg20m",
  },
  cdSg20m: {
    name: "林恩1",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……",
    next: "cdSg20n",
  },
  cdSg20n: {
    name: "云弥",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "……他以前，不是这样的。",
    next: "cdSg20o",
  },
  cdSg20o: {
    name: "旁白",
    onStage: ["yu", "huli", "shangren1", "shangren2"],
    playerSkin: "moren",
    text: "说完这句，他就没再开口。水面倒映着他的影子。你在他旁边蹲了很久，也没有追问。",
    next: "cdSg21",
  },

  // ===== 第二场・魔物围营 =====
  cdSg21: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "入夜。界木的光安稳地笼着营地。你坐在晨曦身边，他已经昏迷了一整日了。",
    next: "cdSg22",
  },
  cdSg22: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "就在这时，界木的光，猛地晃了一下。",
    next: "cdSg23",
  },
  cdSg23: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "你冲出帐篷。林子的边缘，一双双幽绿的眼睛亮了起来，密密麻麻，望不到头。",
    next: "cdSg24",
  },
  cdSg24: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "不好，是那个魔物，他估计来报仇了。",
    next: "cdSg25",
  },
  cdSg25: {
    name: "林恩1",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "我们不是有界木吗，他们怎么敢……",
    next: "cdSg26",
  },
  cdSg26: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "界木只能压制他们的实力，并不能完全阻挡他们。",
    next: "cdSg27",
  },
  cdSg27: {
    name: "云弥",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "……准备战斗。",
    next: "cdSg28",
  },
  cdSg28: {
    name: "林恩1",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "可是你们的伤……",
    next: "cdSg29",
  },
  cdSg29: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "没事，还能撑住，就是要麻烦你照顾好晨曦了。",
    next: "cdSg30",
  },
  cdSg30: {
    name: "林恩1",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "我一定会的。",
    next: "cdSg31",
  },
  cdSg31: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "你握紧武器，站到帐篷前。身后，晨曦沉沉地睡着。云弥撑着剑走到你身边，西亚也按着伤口站到另一边。",
    next: "cdSgW1",
  },

  // ===== 第1波・魔物先锋 =====
  cdSgW1: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    onEnter: () => {
      user.markDialogueComplete('cdSiege1', true);
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [{ monsterType: 'monster1', count: 3, name: '魔物先锋', hp: 150, attack: 28, armor: 5, speed: 30, baseExp: 30 }],
        });
      }, 400);
    },
    text: "第一波魔物冲上来了。被界木的光压着，它们动作迟缓，嘶吼声都发得含混。",
    next: "cdSgW1End",
  },
  cdSgW1End: { end: 2 },
  cdSgW1Win: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "第一波魔物被击退。你喘着气，回头看了一眼，界木的光似乎又暗了一分。",
    next: "cdSgW2",
  },

  // ===== 第2波・魔物主力 =====
  cdSgW2: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    onEnter: () => {
      user.markDialogueComplete('cdSiege2', true);
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [{ monsterType: 'monster1', count: 4, name: '魔物主力', hp: 220, attack: 42, armor: 10, speed: 35, baseExp: 45 }],
        });
      }, 400);
    },
    text: "小心，又要来了。",
    next: "cdSgW2End",
  },
  cdSgW2End: { end: 2 },
  cdSgW2Win: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "第二波退去。西亚的纱布已经被血浸透了，他扶着墙，站得笔直。云弥的手在不断颤抖，却一步没退。",
    next: "cdSgW2b",
  },
  cdSgW2b: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "云弥，你还能撑住吗？",
    next: "cdSgW2c",
  },
  cdSgW2c: {
    name: "云弥",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "……可以。",
    next: "cdSgW2d",
  },
  cdSgW2d: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "你看见云弥手背上裂开一道口子，血顺着双手往下滴。他像感觉不到一样。",
    next: "cdSgW2e",
  },
  cdSgW2e: {
    name: "林恩1",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "让我来帮忙。",
    next: "cdSgW2f",
  },
  cdSgW2f: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "……逞什么强，咱们一起上。",
    next: "cdSgW3",
  },

  // ===== 第3波・暗影精锐 =====
  cdSgW3: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    onEnter: () => {
      user.markDialogueComplete('cdSiege3', true);
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [{ monsterType: 'monster1', count: 3, name: '暗影精锐', hp: 320, attack: 55, armor: 15, speed: 45, baseExp: 60 }],
        });
      }, 400);
    },
    text: "第三波冲上来了。这一次，冲在最前面的魔物身上，缠着暗色的甲壳。",
    next: "cdSgW3End",
  },
  cdSgW3End: { end: 2 },
  cdSgW3Win: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "第三波退去。界木的光已经黯淡得只剩薄薄一层，像风里快要熄灭的烛火。",
    next: "cdSgW3b",
  },
  cdSgW3b: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "林子里安静下来。你听见一声低沉的、像叹息一样的声音，从深处传来。",
    next: "cdSgW3c",
  },
  cdSgW3c: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "他来了。",
    next: "cdSgW4a",
  },

  // ===== 第三场・暗影王出战 =====
  cdSgW4a: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "暗影王从林子里走出来，浑身缠绕着浓得化不开的暗色。他站在界木的光里，像站在火上，却一步也没有退。",
    next: "cdSgW4b",
  },
  cdSgW4b: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "……界木的光，压得我好疼。",
    next: "cdSgW4c",
  },
  cdSgW4c: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "可你们打伤风息，全都该死。",
    next: () => (user.isDialogueComplete?.('cdYEnd') ? 'cdSgW4cY' : 'cdSgW4'),
  },
  // 🌊 云弥线守城台词：暗影王为「抢走里亚、救回晨曦」的旧账而来（晨曦线为「打伤风息」）
  cdSgW4cY: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "可你们三番两次坏我的事，全都该死。",
    next: "cdSgW4",
  },
  cdSgW4: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    onEnter: () => {
      user.markDialogueComplete('cdSiege4', true);
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [
            { monsterType: 'monster1', count: 2, name: '暗影护卫', hp: 260, attack: 50, armor: 12, speed: 42, baseExp: 40 },
            { monsterType: 'monster2', count: 1, name: '暗影王', hp: 800, attack: 70, armor: 20, speed: 50, baseExp: 120 },
          ],
        });
      }, 400);
    },
    text: "……上。一个不留。",
    next: "cdSgW4End",
  },
  cdSgW4End: { end: 2 },

  // ===== 胜利线・暗影王退走 =====
  cdSgW4Win: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "暗影王半跪在地上，暗色一点点散去。界木的光落在他身上，烧出一道道黑烟。",
    next: "cdSgW4b2",
  },
  cdSgW4b2: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "……咳。",
    next: "cdSgW4c2",
  },
  cdSgW4c2: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "界木……要不是这鬼东西……",
    next: "cdSgW4d2",
  },
  cdSgW4d2: {
    name: "林恩1",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "我们该怎么处置他？",
    next: "cdSgW4e2",
  },
  cdSgW4e2: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "云弥，你怎么看？",
    next: "cdSgW4f2",
  },
  cdSgW4f2: {
    name: "云弥",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "你走吧，告诉风息，别再来了。",
    next: "cdSgW4g2",
  },
  cdSgW4g2: {
    name: "西亚",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "就这么放过他吗？",
    next: "cdSgW4h2",
  },
  cdSgW4h2: {
    name: "云弥",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "……嗯。",
    next: "cdSgW4i2",
  },
  cdSgW4i2: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "……呵，别以为我会感激你们。",
    next: "cdSgW4j2",
  },
  cdSgW4j2: {
    name: "暗影王",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "不过算我欠你们一次。",
    next: "cdSgW4k2",
  },
  cdSgW4k2: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "他撑着站起来，看了你们一眼，转身走进林子里。",
    next: "cdSgW4l2",
  },
  cdSgW4l2: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    text: "你看着他的背影消失在夜色里。界木的光，终于重新亮了起来。",
    next: "cdSgEnd",
  },

  // 🏁 幕12胜利收尾：恢复三人可携带/同伴查看
  cdSgEnd: {
    name: "旁白",
    onStage: ["huli", "yu"],
    playerSkin: "moren",
    onEnter: () => {
      restoreAlliesAfterRescue?.();
    },
    text: "这一夜，算是熬过去了。",
    end: 1,
  },

  // 💀 坏结局・营地沦陷（任何一波失败 → 旁白收尾）
  cdSgFail: {
    name: "旁白",
    playerSkin: "moren",
    text: "你们终究没能守住。界木的光，在魔物的冲击下，一点一点暗了下去。",
    next: "cdSgFail2",
  },
  cdSgFail2: {
    name: "旁白",
    playerSkin: "moren",
    text: "屏障破碎的那一刻，魔物像潮水一样涌进营地。你挡在晨曦身前，暗色的浪潮吞没了视野。",
    next: "cdSgFail3",
  },
  cdSgFail3: {
    name: "旁白",
    playerSkin: "moren",
    text: "那一夜之后，这片林子里，再也没有人见过界木的光。",
    end: 1,
  },

  // 🎬 ===== 主线待续提示（幕12守城夜完成后，每次休息 → 昼夜CG播完 → 弹此提示 → 正常进入下一天） =====
  // 挂载：duihua.vue dialogueList 末尾 { id:'cdSgContinue', loadData:'npc/forest-deep', ifCompleted:'cdSgEnd' }
  // end:2 不标记完成 → 每次休息都会提示；主线剧情暂告一段落，后续不发放新主线任务
  cdSgContinue: {
    name: "旁白",
    playerSkin: "moren",
    text: "主线剧情暂告一段落，游戏待续。你可以继续自由探索、练级，等待新的故事。",
    end: 2,
  },

  // 🏰 ===== 休息条件：主线待续期（cdSgEnd 完成后）必须先前往地牢才能休息 =====
  // 挂载：营地休息问号 clickData.route 最前面加 → { ifCompleted: 'cdSgEnd', ifNotCompleted: 'cdDungeonVisited', name: 'cdRestNeedDungeon' }
  // 标记：进入地牢（matter.vue toggleDungeon）设置 cdDungeonVisited=true；休息过夜（matter.vue onDayCgFinished）清除 → 每天休息前都要去一次地牢
  cdRestNeedDungeon: {
    name: "旁白",
    playerSkin: "moren",
    text: "你正想休息，又想起外面还有不少魔物。先前往地牢探索历练一番，再回来休息吧。",
    end: 2,
  },
};
