/**
 * 精灵 NPC 对话数据 —— 主线剧情段（zz / jqZ / jjone / jqX / one + end）
 * 
 * 由 jingling.js 拆分而来，本文件只导出对话节点
 * 辅助函数/翻译/选项数组在 jingling-shared.js 里，节点通过 import 引用
 * 
 * ⚠️ 注意：本段包含重复 key（zz01 / zz18 / zz79 / jqZ30）
 * 保持原文件的书写顺序，后面出现的会覆盖前面出现的（与拆分前行为一致）
 */

import {
  user,
  emitter,
  createNPC,
  hideNpc,
  askOptions,
} from './jingling-shared.js';
import { createWenhaoHudong, getWenhaoHudong } from '@/pages/pixi/matter1/daoju.js';
import { ElMessText } from '@/pages/zujian/utils.js';
import { idleAnimator } from '@/pages/pixi/matter1/idleAnimator.js';
// ========== 主线剧情段 ==========
export const zhuxianDialogues = {
  zz116: {
    blackScreen: true, //黑屏文字
    onEnter: () => {
      getWenhaoHudong('hj01')?.remove();
      getWenhaoHudong('hj25')?.remove();
      getWenhaoHudong('hj10')?.remove();
      hideNpc(4)
      // 🎨 指定皮肤 + 待机动画示例（写入 npcDataList 随存档保存，读档后自动保持）：
      // createNPC({
      //   id: 1, juese: 'jinmao', player: 3, mapId: 'desert_01',
      //   x: 0.45, y: 0.72, direction: 1,
      //   skin: 'angry',                    // 🎨 Spine 皮肤名（骨骼里真实存在的）
      //   animation: 'idle',                // 🎬 基础待机动画（默认 'idle'）
      //   idleNames: ['idle2'],             // 🎬 不定时播放的特殊待机动画
      //   idleMinInterval: 1000, idleMaxInterval: 2000,
      //   data: { name: '金毛' },
      // })
      createNPC({ id: 1, juese: 'jinmao', player: 3, mapId: 'desert_01', x: 0.45, y: 0.72, direction: 1, TopMap: 0, data: { name: '金毛' }, idleNames: ['idle2'], idleMinInterval: 1000, idleMaxInterval: 2000 })
      createNPC({ id: 2, juese: 'yu', player: 3, mapId: 'desert_01', x: 0.8, y: 0.72, direction: -1, TopMap: 0, data: { name: '鱼' }, shadowConfig: { offsetX: 0.5, offsetY: 0 }, idleNames: ['idle2'], idleMinInterval: 1000, idleMaxInterval: 2000 })
      createNPC({ id: 3, juese: 'huli', player: 3, mapId: 'desert_01', x: 0.3, y: 0.72, direction: 1, TopMap: 1, data: { name: '狐狸' }, idleNames: ['idle2'], idleMinInterval: 1000, idleMaxInterval: 2000 })
      createWenhaoHudong({
        id: 'jinmao',          // 唯一 ID（不要和其他问号重复）
        mapId: 'desert_01',        // 所在的地图 ID（默认 'one01'）
        x: 0.45, y: 0.57,           // 百分比 0~1（x 相对地图宽度，y 相对窗口高度）
        textureName: 'duihua',     // 图标纹理（默认 "question"）
        wuxian: -1,                // 可点击次数，-1=无限点击
        isFloatEnable: true,       // 是否上下浮动
        // show: false, 
        clickData: {
          loadData: 'npc/jingling',
          route: [
            { ifNotCompleted: 'jinmao01', name: 'jinmao01' },  // 金毛01 与 鱼01/狐狸01 是共同事件，任一完成则跳过
            { ifNotCompleted: 'jinmao50', name: 'jinmao50' },  // 未完成 jinmao50 → 打开
            { needNpc: 'tuzi', ifCompleted: 'hd390', ifNotCompleted: 'hd420', name: 'hd420', ifDaysSinceFlag: { flag: 'heimiJoinDay', min: 2 }, ifCompletedToday: ['hd390'] },
            { ifCompleted: 'hd420', ifNotCompleted: 'jinmao60', name: 'jinmao60', ifDayEqualsFlag: 'hd444Day' },  // 必须与 hd444 同一天（day === 记录的天数）才能触发 jinmao60
            { name: 'jinmao51' },                             // 兜底打开 jinmao51
          ],
        },
      });
      createWenhaoHudong({
        id: 'yu',          // 唯一 ID（不要和其他问号重复）
        mapId: 'desert_01',        // 所在的地图 ID（默认 'one01'）
        x: 0.8, y: 0.57,           // 百分比 0~1（x 相对地图宽度，y 相对窗口高度）
        textureName: 'duihua',     // 图标纹理（默认 "question"）
        wuxian: -1,                // 可点击次数，-1=无限点击
        isFloatEnable: true,       // 是否上下浮动
        clickData: {
          loadData: 'npc/jingling',
          route: [
            { ifNotCompleted: 'yu500', name: 'yu500' },
            { ifNotCompleted: 'yu01', name: 'yu01' },  // 鱼01 与 金毛01/狐狸01 是共同事件，任一完成则跳过
            { ifNotCompleted: 'yu50', name: 'yu50' },  // 未完成 yu50 → 打开
            { name: 'yu51' },                           // 兜底打开 yu51
          ],
        },
      });
      createWenhaoHudong({
        id: 'huli',          // 唯一 ID（不要和其他问号重复）
        mapId: 'desert_01',        // 所在的地图 ID（默认 'one01'）
        x: 0.3, y: 0.57,           // 百分比 0~1（x 相对地图宽度，y 相对窗口高度）
        textureName: 'duihua',     // 图标纹理（默认 "question"）
        wuxian: -1,                // 可点击次数，-1=无限点击
        isFloatEnable: true,       // 是否上下浮动
        clickData: {
          loadData: 'npc/jingling',
          route: [
            { ifNotCompleted: 'hl01', name: 'hl01' },  // 狐狸01：今天已触发过 hl50 则跳过（同一天互斥）
            { ifNotCompleted: 'hl50', name: 'hl50' },  // 狐狸50：今天已触发过 hl01 则跳过（同一天互斥）
            { needNpc: 'tuzi', ifNotCompleted: 'hd390', name: 'hd390', ifDaysSinceFlag: { flag: 'heimiJoinDay', min: 1 }, ifCompletedToday: ['hd420'] },  // 需要黑米NPC存在 且 天数≥2 且 黑米入队后过1天 且 未完成 hd390 → 打开
            { name: 'hl51' },                         // 兜底打开 hl51
          ],
        },
      });
      const hasBaiShuoCrystal = user.inventory.some(item => item.name === "白朔的灵晶");
      if (!hasBaiShuoCrystal) {
        user.addItemToInventory({
          name: "白朔的灵晶",
          num: 1,
          img: "baisuo",
          miaoshu: "白朔的本命灵晶，蕴含着神奇的力量。\n攻击力+10，护甲+10，速度+10，\n击败敌人额外获得15%经验值",
          isItem: true,
          color: "#E6A23C",
          quality: "rare"
        });
      }
      if (!user.isItemEquipped("白朔的灵晶")) {
        user.equipItem("白朔的灵晶", 1);
      }
      user.addItemToInventory({
        name: "灵力晶核",
        num: 999,
        img: "jinghe",
        miaoshu: "蕴含强大灵力的晶核，可用于抽取卡牌。",
        sell: 10,
        status: "material",
        color: "#8B5CF6"
      });
      const juese = user.pixi.player.juese;
      juese.hp = Math.min(juese.maxHp, juese.hp + Math.floor(juese.maxHp * 0.7));

      // ===== 动态创建休息问号（rest_01）：走过本段剧情后沙漠地图才出现休息点 =====
      // 全部逻辑走可序列化 clickData 路由（onClick 是函数存档会丢失，读档后靠路由恢复）：
      // 1. 未完成初次相遇（dayo300）→ 先打开 dayo302 剧情对话
      // 2. 行动点充足（≥3）→ 打开 rest_not_tired 提示"你还不累"
      // 3. 兜底 → 打开 rest_do 执行休息+存档
      createWenhaoHudong({
        id: 'rest_01',
        mapId: 'desert_01',
        x: 0.61, y: 0.57,
        textureName: 'xiuxi',
        scale: 1.5,
        detectWidth: 35,
        wuxian: -1,                // -1=无限点击
        isFloatEnable: true,       // 是否上下浮动
        clickData: {
          loadData: 'npc/jingling',
          route: [
            // 未完成初次相遇（dayo300）→ 先打开 dayo302 剧情对话
            // { ifNotCompleted: 'dayo300', name: 'dayo302' },
            // 行动点还很多（≥3）→ 提示"你还不累"，本次不休息
            // 兜底 → 执行休息+存档（silent：只执行 onEnter，不弹出休息对话框）
            { name: 'dayo1001', silent: true },
          ],
        },
      });

      console.log('achievements成就=', user.allTasks);
      if (!user.allTasks?.mainTasks?.some(t => t.id === 1)) {
        user.allTasks.mainTasks = user.allTasks.mainTasks || [];
        user.allTasks.mainTasks.push({
          id: 1,
          name: "等待救援",
          type: "main",
          description: "记录该星球的状态，等待奥米集团的救援。",
          isCompleted: false,
          currentStep: 0,
          steps: [
            { id: 1, content: "等待救援", isCompleted: false },
          ]
        });
      }
    }
  },
  zx01: {
    npcSkin: "weixiao",
  },
  zv01: {
    npcSkin: "weixiao",
  },
  zb01: {
    npcSkin: "weixiao",
  },
  zb06: {
    npcSkin: "zc",
  },
  zb11: {
    npcSkin: "weixiao",
  },
  // ===== 休息问号（rest_01）相关节点：逻辑放在源码节点里，读档不丢失 =====
  // rest_not_tired：行动点还很多（≥3），提示"你还不累"，不休息
  dayo1000: {
    repeatable: true, // 可重复，不记录完成状态
    textSpeed: 25,
  },
  // rest_do：执行休息+存档（回满行动点/回血、天数+1、昼夜CG）
  // 用 hideUI + autoNext（不用 blackScreen），避免黑屏层盖住昼夜CG
  dayo1001: {
    repeatable: true, // 可重复，不记录完成状态
    onEnter: () => {
      // 💾 存档移到昼夜动画播放完毕后执行（duihua.vue 播完 CG 触发 dayCgFinished → matter.vue saveGame）
      if (user.getDialogueFlag("第五日结束")) {
        hideNpc(4)
        hideNpc(3)
        hideNpc(2)
        hideNpc(1)
        createNPC({ id: 1, juese: 'jinmao', player: 3, mapId: 'desert_01', x: 0.45, y: 0.72, direction: 1, TopMap: 0, data: { name: '金毛' }, idleNames: ['idle2'], })
        createNPC({ id: 2, juese: 'yu', player: 3, mapId: 'desert_01', x: 0.8, y: 0.72, direction: -1, TopMap: 0, data: { name: '鱼' }, shadowConfig: { offsetX: 0.5, offsetY: 0 }, idleNames: ['idle2'], })
        createNPC({ id: 3, juese: 'huli', player: 3, mapId: 'desert_01', x: 0.3, y: 0.72, direction: 1, TopMap: 1, data: { name: '狐狸' }, idleNames: ['idle2'], })
        createNPC({ id: 4, juese: 'tuzi', player: 3, mapId: 'desert_01', x: 0.35, y: 0.72, direction: -1, TopMap: 1, data: { name: '兔子' }, idleNames: ['idle2'], })
        getWenhaoHudong('jinmao1')?.remove();
        getWenhaoHudong('xiya1')?.remove();
        getWenhaoHudong('yu1')?.remove();
        getWenhaoHudong('heimi')?.show();
        getWenhaoHudong('jinmao')?.show();
        getWenhaoHudong('huli')?.show();
        getWenhaoHudong('yu')?.show();
      }
      // 休息：进入下一天（天数+1、恢复生命、昼夜CG）
      user.restAndRestoreActionPoints();
    },
    end: 1,
  },
  hl19: {
    blackScreen: true, // 黑屏模式
  },
  one00: {
    blackScreen: true, // 黑屏模式
    textSpeed: 15,
    options: [
      { text: "i18n:common.xuzhang", next: "one00Start", repeatable: true, },
      { text: "i18n:common.tiaoguo", next: "one200", repeatable: true },
    ],
  },
  // 🎬 序章 → 新的初始剧情（opening.js：主神创造 → 投放森林）
  one00Start: {
    onEnter: () => {
      user.markDialogueComplete('one00', true); // 序章也标记初始剧情完成，下次启动不再弹出
      emitter.emit('talkToNpc', { loadData: 'npc/opening', name: 'op01' });
    },
    end: 1,
  },
  one200: {
    blackScreen: true, // 黑屏文字：跳过序章（text 为 i18n key，翻译见 npc_juqing01.one200）
    textSpeed: 35,
    clickDelay: 1200,
    text: "one200",
    onEnter: () => {
      user.markDialogueComplete('one00', true); // 跳过也标记初始剧情完成，下次启动不再弹出
    },
    next: "one200Dungeon",
  },
  one200Dungeon: {
    onEnter: () => {
      emitter.emit('skipToDungeon'); // matter.vue 监听该事件 → 直接打开地牢
    },
    end: 1,
  },
  end: {
    name: "",
    end: true,
    onExit: () => {
      //user.setDialogueFlag('jingling_met', true); //对话标记，表示「玩家已经遇到过精灵了」后续其他对话可以用 getDialogueFlag('jingling_met') 检查这个标记，再次遇到精灵时，检查到 jingling_met = true，就不会再播放初次相遇的剧情，直接进入日常对话。
      // user.markDialogueComplete('jingling_first_meet');//标记这段对话剧情已经完成，可以用 isDialogueComplete('jingling_first_meet') 检查玩家是否已经看过这段剧情，避免重复触发
    }
  },
};
