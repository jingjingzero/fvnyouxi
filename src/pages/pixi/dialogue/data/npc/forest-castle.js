/**
 * 深林城堡（forest-castle）：携带晨曦深入森林找里亚，发现城堡入口
 * loadData: 'npc/forest-castle'（tiled dialogLoadData 配置；dladmin 编辑器需在 FILES 数组登记 'forest-castle'）
 *
 * 流程：
 * - 携带晨曦（getNpcAlly()==='jinmao'）→ 城堡前对话（犬科嗅觉追气味 → 推门失败 → 选项）
 * - 选项①暴力破坏：晨曦拦下你自己撞门 → 动静引来森林魔物 → customBattle 进入战斗（对话结束）
 *     战斗胜利后再次触发 → 晨曦吐槽撞门 → 汇合段 → 完成
 * - 选项②不尝试：无战斗 → 直接汇合段 → 完成
 * - 汇合段：晨曦"你以前来过这里吗"…→"趁它还不想留我们"→ 窗户里有东西注视（暗影王伏笔）
 *
 * tiled 触发数组建议：
 *   [
 *     { ifNotCompleted: 'mzEnd', name: 'mzIn' },
 *   ]
 *
 * 人称：旁白统一第二人称「你」；玩家说话人显示「林恩1」。晨曦 onStage: "jinmao"。
 */
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();

export default {
  // ===== 入口分流（携带晨曦 → 城堡剧情；战斗后返回 → 吐槽段；其余 → 不触发） =====
  mzIn: {
    autoNext: 0, // 无文本，按状态自动分流
    next: () => {
      const ally = user.getNpcAlly?.();
      if (ally === 'jinmao') {
        // 🏰 幕10入口：晨曦线提交线索完成（mjrEnd）且未被囚禁过（!cdJailEnd）→ 转发 forest-deep 开锁深入
        if (user.isDialogueComplete?.('mjrEnd') && !user.isDialogueComplete?.('cdJailEnd')) return 'cdFwd';
        // 🏁 幕10/幕11（被囚/脱困）后城堡剧情完结：再点城堡无事发生
        if (user.isDialogueComplete?.('cdJailEnd')) return 'cdIdle';
        // ⚔️ 晨曦线暴力分支战斗胜利后返回：先播吐槽段，再走汇合段
        if (user.getDialogueFlag('mzBangedDoor') && !user.getDialogueFlag('mzTauntDone')) return 'mzT1';
        if (!user.getDialogueFlag('mzStarted')) return 'mz01'; // 首次进入
        return 'mzIdle';
      }
      if (ally === 'huli') {
        // ⚔️ 西亚线暴力分支战斗胜利后返回：先播吐槽段，再走汇合段
        if (user.getDialogueFlag('mzhBangedDoor') && !user.getDialogueFlag('mzhTauntDone')) return 'mzhT1';
        if (!user.getDialogueFlag('mzhStarted')) return 'mzh01'; // 首次进入
        return 'mzIdle';
      }
      if (ally === 'yu') {
        // 🏰 幕10云弥线入口：提交线索完成（myrEnd）且未深入过（!cdYEnd）→ 转发 forest-deep 的 cdY01（可胜深入）
        if (user.isDialogueComplete?.('myrEnd') && !user.isDialogueComplete?.('cdYEnd')) return 'cdYFwd';
        // 云弥线：无战斗，首次进入即可
        if (!user.getDialogueFlag('mzyStarted')) return 'mzy01'; // 首次进入
        return 'mzIdle';
      }
      return 'mzIdle';
    },
  },
  mzIdle: { end: 2 },

  // 🌊 幕10云弥线转发节点：mzIn yu 分支检测到云弥线提交线索完成 → 转发 forest-deep 的 cdY01（可胜深入）
  cdYFwd: {
    end: 2,
    onEnter: () => {
      emitter.emit('talkToNpc', { loadData: 'npc/forest-deep', name: 'cdY01' });
    },
  },

  // 🏰 幕10转发节点：mzIn 检测到晨曦线提交线索完成 → 无文本结束并转发 forest-deep 的 cd01（莫奇开锁深入）
  cdFwd: {
    end: 2,
    onEnter: () => {
      emitter.emit('talkToNpc', { loadData: 'npc/forest-deep', name: 'cd01' });
    },
  },

  // ===== 城堡前：晨曦犬科嗅觉发现里亚气味 =====
  mz01: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    onEnter: () => {
      user.setDialogueFlag('mzStarted', true); // 🚩 首次进入标记
    },
    text: "这里有里亚的气味！",
    next: "mz02",
  },
  mz02: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你怎么知道的？",
    next: "mz03",
  },
  mz03: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "我的嗅觉可灵啦，虽然气味很淡，但我还是能闻到。",
    next: "mz04",
  },
  mz04: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "这道门，打不开吗？",
    next: "mz05",
  },
  mz05: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "晨曦试着推门。门纹丝不动。他又用肩膀顶了顶，门框上的灰尘簌簌落下，大门依然紧闭。",
    next: "mz06",
  },
  mz06: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……打不开。这门像是从里面封死的。",
    next: "mz07",
  },

  // ===== 选项：尝试暴力破坏 / 不尝试 =====
  mz07: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你站在原地，看着那扇紧闭的大门。",
    options: [
      {
        text: "（尝试暴力破坏）……我来试试。",
        next: "mz08",
        onSelect: () => {
          user.setDialogueFlag('mzBangedDoor', true); // ⚔️ 记录：撞门引来魔物
        },
      },
      {
        text: "（不尝试）……算了，不硬来。",
        next: "mzN1",
      },
    ],
  },

  // ===== ① 暴力破坏（晨曦拦下你自己撞，动静引来森林魔物 → 战斗） =====
  mz08: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……我来试试。",
    next: "mz09",
  },
  mz09: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……你？还是我来吧，我可不想让你受伤。",
    next: "mz10",
  },
  mz10: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "晨曦把你拦到身后，自己走上前，用力撞向大门。门纹丝不动，他反而被震得往后退了一步。",
    next: "mz11",
  },
  mz11: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……这门真牢固，蛮力打不开。",
    next: "mz12",
  },
  mz12: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "林子深处传来窸窸窣窣的响动，几双幽绿的眼睛在暗处亮起，魔物循着声音围了过来。",
    next: "mz13",
  },
  mz13: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    onEnter: () => {
      // ⚔️ 触发森林魔物战斗（对话结束；胜利后重新触发进入吐槽段）
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [
            {
              monsterType: 'monster1',
              count: 3,
              name: '森林魔物',
              hp: 60,
              attack: 6,
              armor: 3,
              baseExp: 20,
            },
          ],
        });
      }, 400);
    },
    text: "……糟了，动静太大了。它们来了，退后！",
    next: "mzBattle",
  },
  mzBattle: { end: 2 }, // 结束对话进入战斗（不标记剧情完成，战斗后回来继续）

  // ===== ② 不尝试（无战斗） =====
  mzN1: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……算了，不硬来。",
    next: "mzN2",
  },
  mzN2: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "嗯，算你听劝。",
    next: "mz14",
  },

  // ===== 战斗后吐槽段（暴力分支战斗胜利后返回触发，一次性） =====
  mzT1: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……嘶，肩膀还疼呢。下回再乱来，我可真不跟你出来了。",
    next: "mzT2",
  },
  mzT2: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……对不起。",
    next: "mzT3",
  },
  mzT3: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    onEnter: () => {
      user.setDialogueFlag('mzTauntDone', true); // 🚩 吐槽段完成标记
    },
    text: "嗐，逗你的。……走吧，这门的事，回去再说。",
    next: "mz14",
  },

  // ===== 汇合段（两分支/战斗后都走） =====
  mz14: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你以前来过这里吗？",
    next: "mz15",
  },
  mz15: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "我从来没来过这里，我们有点……太深入了。",
    next: "mz16",
  },
  mz16: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "晨曦的后颈毛微微立起。",
    next: "mz17",
  },
  mz17: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "直觉告诉我，里面很危险。",
    next: "mz18",
  },
  mz18: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "有没有可能里面有人居住？",
    next: "mz19",
  },
  mz19: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "怎么可能！谁敢在这森林里住啊。",
    next: "mz20",
  },
  mz20: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "天快黑了，我们还是先回去吧。",
    next: "mz21",
  },
  mz21: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "好吧，看来今天只能到这了，不过我们也不是没有收获。",
    next: "mz22",
  },
  mz22: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "至少知道了里亚可能在里面。",
    next: "mz23",
  },
  mz23: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你可千万别跟西亚说我带你来到这么危险的地方哦。",
    next: "mz24",
  },
  mz24: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "不然我又要遭罪了。",
    next: "mz25",
  },
  mz25: {
    name: "林恩1",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "好，这是我们两人的秘密。",
    next: "mz26",
  },
  mz26: {
    name: "晨曦",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "……走吧，趁它还不想留我们。",
    next: "mz27",
  },
  mz27: {
    name: "旁白",
    onStage: "jinmao",
    playerSkin: "moren",
    text: "你最后看了一眼那座城堡，跟着晨曦往回走。城堡的窗户里，有什么东西，静静注视着你们离开的方向。",
    next: "mzEnd",
  },
  mzEnd: { end: 1 },

  // ===== 西亚线：带西亚到城堡前（药泥痕迹推理 → 废弃城堡多了扇门 → 选项 → 战斗/汇合） =====
  mzh01: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    onEnter: () => {
      user.setDialogueFlag('mzhStarted', true); // 🚩 首次进入标记
    },
    text: "……停。",
    next: "mzh02",
  },
  mzh02: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "怎么了？",
    next: "mzh03",
  },
  mzh03: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "西亚蹲下身，手指在地面的泥土上抹了一下，凑近看了看。",
    next: "mzh04",
  },
  mzh04: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "这里有问题。",
    next: "mzh05",
  },
  mzh05: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "这些是治伤的草药碾成的药泥，估计是有人在这受伤了再用药泥治疗伤口。",
    next: "mzh06",
  },
  mzh06: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "……你是说有人来过？",
    next: "mzh07",
  },
  mzh07: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "很有可能，应该是有人被袭击了然后来这里处理伤口。",
    next: "mzh08",
  },
  mzh08: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "这附近基本没什么人会来，除了晨曦，就是那商人俩兄弟了。",
    next: "mzh09",
  },
  mzh09: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "我也没听见莫奇最近有受伤的消息。",
    next: "mzh10",
  },
  mzh10: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "所以这很有可能是里亚做的。",
    next: "mzh11",
  },
  mzh11: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "嗯。",
    next: "mzh12",
  },
  mzh12: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "你们朝前望去，前方有一扇被锁住的大门。",
    next: "mzh13",
  },
  mzh13: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "这座城堡……",
    next: "mzh14",
  },
  mzh14: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "以前我来过这里，只是个废弃的城堡，当时可没有这扇门。",
    next: "mzh15",
  },
  mzh15: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "……你是说，这扇门是后来才有的？",
    next: "mzh16",
  },
  mzh16: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "嗯。我上次路过来这还没有这扇大门呢。",
    next: "mzh17",
  },
  mzh17: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……这灰，边缘是干净的。最近有人进进出出。",
    next: "mzh18",
  },
  mzh18: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "……里面有人住？",
    next: "mzh19",
  },
  mzh19: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "至少，有活的东西。",
    next: "mzh20",
  },
  mzh20: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "会是里亚吗？",
    next: "mzh21",
  },
  mzh21: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……不知道。他要是真在里面，情况估计也不乐观。",
    next: "mzh22",
  },
  mzh22: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "那我们……",
    next: "mzh23",
  },
  mzh23: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "先推门试试。",
    next: "mzh24",
  },
  mzh24: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "西亚推了推门。门纹丝不动。他又用肩膀顶了顶，大门依然紧闭，连灰都没掉几粒。",
    next: "mzh25",
  },
  mzh25: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……打不开。锁是从里面扣死的。",
    next: "mzh26",
  },

  // ===== 选项：尝试暴力破坏 / 不尝试 =====
  mzh26: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "你站在原地，看着那扇紧闭的大门。",
    options: [
      {
        text: "（尝试暴力破坏）……我来试试。",
        next: "mzh27",
        onSelect: () => {
          user.setDialogueFlag('mzhBangedDoor', true); // ⚔️ 记录：撞门引来魔物
        },
      },
      {
        text: "（不尝试）……算了，不硬来。",
        next: "mzhH1",
      },
    ],
  },

  // ===== ① 暴力破坏（西亚拦下你自己撞，动静引来森林魔物 → 战斗） =====
  mzh27: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "……我来试试。",
    next: "mzh28",
  },
  mzh28: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……你？省省吧，就你这小身板。",
    next: "mzh29",
  },
  mzh29: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "西亚把你推到一边，自己上前，用力撞向大门。门纹丝不动，他反而被震得退了一步。",
    next: "mzh30",
  },
  mzh30: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……这门还挺牢固的。",
    next: "mzh31",
  },
  mzh31: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "林子深处传来窸窸窣窣的响动，几双幽绿的眼睛在暗处亮起，魔物循着声音围了过来。",
    next: "mzh32",
  },
  mzh32: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    onEnter: () => {
      // ⚔️ 触发森林魔物战斗（对话结束；胜利后重新触发进入吐槽段）
      setTimeout(() => {
        emitter.emit('customBattle', {
          enemies: [
            {
              monsterType: 'monster1',
              count: 3,
              name: '森林魔物',
              hp: 60,
              attack: 6,
              armor: 3,
              baseExp: 20,
            },
          ],
        });
      }, 400);
    },
    text: "……啧，引来了麻烦的东西。退后。",
    next: "mzhBattle",
  },
  mzhBattle: { end: 2 }, // 结束对话进入战斗（不标记剧情完成，战斗后回来继续）

  // ===== 战斗后吐槽段（西亚线暴力分支战斗胜利后返回触发，一次性） =====
  mzhT1: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "……啧。",
    next: "mzhT2",
  },
  mzhT2: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "……对不起。",
    next: "mzhT3",
  },
  mzhT3: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    onEnter: () => {
      user.setDialogueFlag('mzhTauntDone', true); // 🚩 吐槽段完成标记
    },
    text: "行了，回去再说。",
    next: "mzhH1",
  },

  // ===== 汇合段（两分支都走） =====
  mzhH1: {
    name: "西亚",
    onStage: "huli",
    playerSkin: "moren",
    text: "我们还是先回去吧，天快要黑了。",
    next: "mzhH2",
  },
  mzhH2: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "好吧，看来今天只能到这了，不过我们也不是没有收获。",
    next: "mzhH3",
  },
  mzhH3: {
    name: "林恩1",
    onStage: "huli",
    playerSkin: "moren",
    text: "至少知道了里亚可能在里面。",
    next: "mzhH4",
  },
  mzhH4: {
    name: "旁白",
    onStage: "huli",
    playerSkin: "moren",
    text: "你最后看了一眼那座城堡，跟着西亚往回走。城堡的窗户里，有什么东西，静静注视着你们离开的方向。",
    next: "mzhEnd",
  },
  mzhEnd: { end: 1 },

  // ===== 云弥线：带云弥到城堡前（魔力感知 → 挡门劝退 → 无战斗） =====
  mzy01: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    onEnter: () => {
      user.setDialogueFlag('mzyStarted', true); // 🚩 首次进入标记
    },
    text: "云弥忽然停下脚步。他没有说话，只是看着前方。",
    next: "mzy02",
  },
  mzy02: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……怎么了？",
    next: "mzy03",
  },
  mzy03: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……前面。",
    next: "mzy04",
  },
  mzy04: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "你顺着他的目光看去，前方是一座被藤蔓缠绕的古老城堡，大门牢牢关紧。",
    next: "mzy05",
  },
  mzy05: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……城堡？我没听人提过这里。",
    next: "mzy06",
  },
  mzy06: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……不应该。",
    next: "mzy07",
  },
  mzy07: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……什么意思？",
    next: "mzy08",
  },
  mzy08: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……这里的空气不对。有魔物的味道，还有别的。",
    next: "mzy09",
  },
  mzy09: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……别的？",
    next: "mzy10",
  },
  mzy10: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……活人的气息，很淡。像是被带进去的。",
    next: "mzy11",
  },
  mzy11: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……被带进去的？你说，里亚会不会就在里面？",
    next: "mzy12",
  },
  mzy12: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……不知道。别靠近。",
    next: "mzy13",
  },
  mzy13: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "他拦在你身前，没有让开的意思。",
    next: "mzyOp",
  },

  // ===== 选项：坚持 / 听他的 =====
  mzyOp: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "你站在原地。",
    options: [
      {
        text: "（坚持）……我不想就这样回去。",
        next: "mzyQ1",
      },
      {
        text: "（听他的）……好，我跟你回去。",
        next: "mzyH1",
      },
    ],
  },

  // ===== ① 坚持（云弥挡门，不让强闯） =====
  mzyQ1: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "你没有动，他也没有让开。你们在门前站着，谁都没有先开口。",
    next: "mzyQ2",
  },
  mzyQ2: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……那扇门，我推一下试试，就一下。",
    next: "mzyQ3",
  },
  mzyQ3: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "你刚迈出半步，云弥已经挡在门前。",
    next: "mzyQ4",
  },
  mzyQ4: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……不行。",
    next: "mzyQ5",
  },
  mzyQ5: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……为什么？你明明不怕这些东西。",
    next: "mzyQ6",
  },
  mzyQ6: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……我不怕它们。",
    next: "mzyQ7",
  },
  mzyQ7: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……我怕你出事。",
    next: "mzyQ8",
  },
  mzyQ8: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "他说得很轻，你差点没听清。",
    next: "mzyQ9",
  },
  mzyQ9: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……",
    next: "mzyQ10",
  },
  mzyQ10: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……你和他，一样固执。",
    next: "mzyQ11",
  },
  mzyQ11: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "他？",
    next: "mzyQ12",
  },
  mzyQ12: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……没什么。走吧，天黑之前要回营地。",
    next: "mzyQ13",
  },
  mzyQ13: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……好吧，反正我们也不是一无所获。",
    next: "mzyH1",
  },

  // ===== 汇合段（两分支都走） =====
  mzyH1: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "你最后看了一眼那座城堡，跟着云弥往回走。",
    next: "mzyH2",
  },
  mzyH2: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……记住。",
    next: "mzyH3",
  },
  mzyH3: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……嗯？",
    next: "mzyH4",
  },
  mzyH4: {
    name: "云弥",
    onStage: "yu",
    playerSkin: "moren",
    text: "……你还活着。",
    next: "mzyH5",
  },
  mzyH5: {
    name: "林恩1",
    onStage: "yu",
    playerSkin: "moren",
    text: "……嗯。",
    next: "mzyH6",
  },
  mzyH6: {
    name: "旁白",
    onStage: "yu",
    playerSkin: "moren",
    text: "他没有再说话。城堡的窗户里，有什么东西，静静注视着你们离开的方向。",
    next: "mzyEnd",
  },
  mzyEnd: { end: 1 },
};
