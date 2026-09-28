/**
 * 精灵 NPC 对话数据 —— 公共部分
 * 
 * 由 jingling.js 拆分而来：
 * - 辅助函数（NPC 显隐 / 动态创建 / 移动 / 好感度）
 * - i18nPrefix、speakers
 * - 选项数组（askOptions / askOptions1/2/3 / option4）
 * 
 * 入口 jingling.js 和各剧情子文件（jingling-yushi / jingling-guanri / jingling-zhuxian）
 * 都从这里 import，避免子文件反向 import 入口造成的循环依赖 + TDZ 报错
 */

import { useCounterStore } from "@/store/counter";
import { t } from '../../i18n/index.js';
import emitter from "@/bus";
import { ElMessText } from "@/pages/zujian/utils.js";
import router from "@/router";

const user = useCounterStore();

/**
 * 设置 NPC 显隐（通过 npcConfigUpdated 事件重建 NPC）
 * @param {number} npcId - NPC 的 id
 * @param {boolean} visible - true=显示, false=隐藏
 */
function setNpcVisible(npcId, visible) {
  const list = user.pixi.npcDataList;
  if (!list) return;

  const item = list.find(n => (n.id ?? n.data?.id) === npcId);
  if (item) {
    item.hidden = !visible;

    emitter.emit('npcConfigUpdated', list);
  }
}

/**
 * 移除 NPC（快捷方式）
 * 从 npcDataList 中移除 NPC（地图上不再显示）
 * ⚠️ 不会从 npcSelectList（可携带列表）移除：可携带状态由 createNPC 的 canAlly 独立控制，
 *    隐藏实体不代表伙伴离开队伍，避免携带面板中的伙伴意外消失
 * @param {number} npcId - NPC 的 id
 */
function hideNpc(npcId) {
  const list = user.pixi.npcDataList;
  if (!list) return;

  const item = list.find(n => (n.id ?? n.data?.id) === npcId);
  if (item) {
    // 从 npcDataList 中移除（NPC 真正消失）
    user.pixi.npcDataList = list.filter(n => (n.id ?? n.data?.id) !== npcId);

    // 通知 matter.vue 重建 NPC 池（物理 body 同步删除）
    emitter.emit('npcConfigUpdated', user.pixi.npcDataList);
  }
}

/**
 * 判断指定 NPC 是否存在于 npcDataList（地图上真实存在的 NPC）
 * 匹配三种字段：id / juese（Spine角色名）/ data.name（显示名）
 * @param {string|string[]} need - NPC 标识；传数组时要求全部存在
 * @returns {boolean}
 */
function isNpcExists(need) {
  const list = user.pixi.npcDataList || [];
  const needList = Array.isArray(need) ? need : [need];
  return needList.every(need => list.some(n =>
    n.id === need || n.juese === need || n.data?.name === need
  ));
}

/**
 * 生成「共同对话事件」的互斥路由（多个角色共享同一段剧情时用）
 *
 * 用法示例（金毛问号，与狐狸共享两段共同剧情）：
 *   clickData: {
 *     loadData: 'npc/jingling',
 *     route: buildSharedDialogueRoute({
 *       npc: 'jinmao',                        // 本角色 NPC 标识（匹配 id/juese/data.name）
 *       stages: [
 *         { id: 'jinmao01', sharedWith: ['hl01'] },  // 第一阶段：金毛01 与 狐狸01 是共同事件
 *         { id: 'jinmao50', sharedWith: ['hl50'] },  // 第二阶段：金毛50 与 狐狸50 是共同事件
 *       ],
 *       done: 'jinmao51',                     // 全部完成后的兜底对话
 *     }),
 *   },
 *
 * 互斥逻辑（集中在一个函数里判断）：
 * - 本角色 NPC 不存在 → 整段路由都不触发
 * - 某阶段的共同事件里【任意一个角色】已完成该阶段 → 本角色该阶段跳过（互斥）
 * - 未完成的阶段按 stages 顺序优先触发
 * - 全部完成 → 走 done 兜底对话
 *
 * @param {Object} cfg
 * @param {string} cfg.npc - 本角色 NPC 标识
 * @param {Array<{id:string, sharedWith?:string[]}>} cfg.stages - 本角色按顺序的对话阶段
 *        sharedWith: 与该阶段共享同一事件的其他角色对话 id 数组（任一完成则本阶段互斥跳过）
 * @param {string} cfg.done - 全部阶段完成后的兜底对话 id
 * @returns {Array} 可直接用于 clickData.route 的路由数组（纯数据、可存档）
 */
function buildSharedDialogueRoute({ npc, stages = [], done }) {
  const route = [];
  for (const stage of stages) {
    const step = {
      needNpc: npc,
      ifNotCompleted: stage.id,
      name: stage.id,
    };
    // 共同对话互斥：共享事件其他角色的同阶段对话已完成 → 本阶段跳过
    if (Array.isArray(stage.sharedWith) && stage.sharedWith.length > 0) {
      step.ifAnyCompleted = stage.sharedWith;
    }
    route.push(step);
  }
  // 兜底：本角色 NPC 存在时，全部阶段完成 → 打开 done
  route.push({ needNpc: npc, name: done });
  return route;
}

// =====================================
// 运行时动态生成 NPC（对话中创建新 NPC 用）
// =====================================

/**
 * 根据百分比 x（0~1）和 mapId 计算世界像素坐标
 */
function calcWorldX(mapId, xPercent) {
  const mapData = user.pixi.mapDataList?.find(m => m.id === mapId);

  if (!mapData) return (xPercent ?? 0.5) * 5000;
  return (xPercent ?? 0.5) * mapData.realWidth + (mapData.offsetX ?? 0);
}

/**
 * 动态创建 NPC（对话中调用来增加新 NPC）
 * ✅ 创建后写入 user.pixi.npcDataList（在 AUTO_SAVE_PATHS 里随存档保存），
 *    读档时按配置原样重建：skin（皮肤）/ animation（基础待机）/ idleNames（特殊待机）
 *    都会自动保留，无需在 onEnter 里重复设置。
 *
 * @param {Object} config - NPC 配置
 * @param {number} config.id - 唯一 ID（不能和其他 NPC 重复）
 * @param {string} config.juese - Spine 角色名（如 "maomihengban"）
 * @param {number} config.player - 阵营：1=友方/3=中立NPC, 2=敌方
 * @param {string} config.mapId - 所在的地图 ID（如 "one01", "desert_01"）
 * @param {number} config.x - X 坐标百分比（0~1）
 * @param {number} [config.y] - Y 坐标：百分比 0~1（相对屏幕高度），或 >1 视为像素
 *                              不传则用该地图默认（80*VH）
 * @param {number} [config.height] - 角色高度（VH 单位）
 * @param {number} [config.speed] - 移动速度
 * @param {number} [config.direction] - 朝向：1=右, -1=左
 * @param {string} [config.skin] - 🎨 Spine 皮肤名（如 "pifu1/one05"）；不设置则用角色默认皮肤。
 *                                 由 spineBoy 创建骨骼时应用，读档后重建自动生效
 * @param {string} [config.animation] - 🎬 基础循环动画名，默认 'idle'（站立时一直播的动画；
 *                                      传别的名字（如 'idle2'）就是「指定待机动画」）
 * @param {number|boolean} [config.animRandomOffset] - 🎲 循环动画错峰（多个同骨骼 NPC 一起创建时
 *                                                     避免动画"整齐同步"）：true=每次创建随机起始相位；
 *                                                     0~1 数字=固定从动画该比例处开始播放
 * @param {string[]} [config.idleNames] - 🎬 特殊待机动画候选名数组（如 ['idle2', 'breath']）：
 *                                       创建后由 idleAnimator 不定时随机播一个（播完自动回到基础待机）
 * @param {number} [config.idleMinInterval] - 特殊待机动画最小间隔（毫秒），默认 10000
 * @param {number} [config.idleMaxInterval] - 特殊待机动画最大间隔（毫秒），默认 20000
 * @param {boolean} [config.shadow] - 是否创建脚下影子，默认 true；传 false 则 NPC 无影子
 * @example
 * // 指定皮肤 + 指定待机动画（存档/读档后依旧保持）
 * createNPC({
 *   id: 1, juese: 'jinmao', player: 3, mapId: 'desert_01',
 *   x: 0.45, y: 0.72, direction: 1,
 *   skin: 'angry',                    // 🎨 皮肤：写骨骼里真实存在的皮肤名
 *   animation: 'idle',                // 🎬 基础待机（默认 'idle'）
 *   animRandomOffset: true,           // 🎲 多 NPC 同骨骼时错峰播放，避免整齐同步
 *   idleNames: ['idle2'],             // 🎬 不定时播的特殊待机
 *   idleMinInterval: 1000, idleMaxInterval: 2000,
 *   data: { name: '金毛' },
 * })
 */
function createNPC(config = {}) {
  // 检查 ID 是否已存在

  // 已存在则先删除再重建（允许对话中更新 NPC 的位置/属性等）
  if (user.pixi.npcDataList) {
    const existing = user.pixi.npcDataList.find(n => (n.id ?? n.data?.id) === config.id);
    if (existing) {
      console.warn(`[createNPC] NPC ID ${config.id} 已存在，删除重建`);
      user.pixi.npcDataList = user.pixi.npcDataList.filter(n =>
        (n.id ?? n.data?.id) !== config.id
      );
    }
  }

  const mapId = config.mapId || user.pixi.mapDataList?.[0]?.id || 'desert_01';

  // ✅ x 为百分比，内部转为世界像素坐标
  const worldX = calcWorldX(mapId, config.x);
  // ✅ y：直接存「原始 config.y」！
  //    - config.y 为百分比（0~1）→ 存百分比，读取时（npcManager）按当前 VH 换算 → 切屏不漂移
  //    - config.y 为像素（>1）→ 存像素，读取时直接使用
  //    ⚠️ 之前把百分比转成了像素再存（y*100*VH），导致切换屏幕尺寸后：
  //       移动端创建的 NPC 存的是旧 VH 像素 y → 切电脑端刷新后浮空/陷入地面。
  const worldY = config.y;

  const newNpc = {
    id: config.id,
    juese: config.juese || 'maomihengban',
    player: config.player ?? 3,
    mapId: mapId,
    x: worldX,                    // 存世界像素坐标（updateNPCPool 直接使用）
    y: worldY,                    // 存像素 Y（npcManager.createNPC 的 floorY 直接用）
    height: config.height ?? 27,
    speed: config.speed ?? 2,
    direction: config.direction ?? 1,
    animation: config.animation ?? 'idle',
    animRandomOffset: config.animRandomOffset, // 🎲 循环动画错峰：true=随机起始相位 / 0~1=固定相位比例（同骨骼多 NPC 避免整齐同步）
    TopMap: config.TopMap,
    shadowConfig: config.shadowConfig,
    shadow: config.shadow,   // 是否创建影子，默认 true；传 false 无影子
    skin: config.skin,       // Spine 皮肤名，不设置则用角色默认皮肤
    idleNames: config.idleNames, // 特殊待机动画候选名数组（如 ['idle2']），由 updateNPCPool 创建实例时自动启动 idleAnimator
    // 是否可携带出战（默认 true）
    canAlly: config.canAlly !== false,
    // 携带时的战斗标识 img（对应 npcSelectList 的 img / allyBattleData 的 key）
    allyImg: config.allyImg,
    data: {
      name: config.data?.name || config.juese || '未知',
      ...config.data,
    },
  };

  if (!user.pixi.npcDataList) user.pixi.npcDataList = [];
  user.pixi.npcDataList.push(newNpc);

  // ✅ 可携带同步：根据 canAlly 注册/移除该 NPC 到可携带列表（npcSelectList）
  syncCanAlly(newNpc, config);

  // 通知 matter.vue 刷新 NPC 列表
  emitter.emit('npcConfigUpdated', user.pixi.npcDataList);

  // 返回一个控制对象，方便后续操作
  const ctrl = {
    id: config.id,
    moveTo(xPercent, options = {}) {
      emitter.emit('moveNpcTo', { npcId: config.id, xPercent, teleport: options.teleport ?? true, speed: options.speed ?? null });
    },
    show() { setNpcVisible(config.id, true); },
    hide() { setNpcVisible(config.id, false); },
    remove() {
      user.pixi.npcDataList = user.pixi.npcDataList.filter(n =>
        (n.id ?? n.data?.id) !== config.id
      );
      emitter.emit('npcConfigUpdated', user.pixi.npcDataList);
    },
    // 快捷：设置该 NPC 是否可携带（canAlly）
    setCanAlly(canAlly = true) {
      newNpc.canAlly = canAlly;
      syncCanAlly(newNpc, { allyImg: config.allyImg, allyData: config.allyData, canAlly });
    },
  };
  return ctrl;
}

/**
 * 根据 canAlly 同步 NPC 到可携带列表（npcSelectList）及战斗属性（allyBattleData）
 * - canAlly 为 true 且提供了 allyImg → 加入可携带列表（默认已存在则不重复），
 *   并注册战斗属性（含 spineScale 等）
 * - canAlly 为 false → 从可携带列表中移除（若有）
 */
function syncCanAlly(npc, config = {}) {
  const canAlly = npc.canAlly !== false;
  const allyImg = config.allyImg || npc.allyImg;
  if (!allyImg) return; // 没有 img 标识则无法映射到可携带/战斗

  if (!user.pixi.npcSelectList) user.pixi.npcSelectList = [];
  if (!user.pixi.allyBattleData) user.pixi.allyBattleData = {};

  // 战斗属性配置（允许通过 config.allyData 自定义；未传则用默认）
  const allyData = config.allyData;
  if (allyData && typeof allyData === 'object') {
    user.pixi.allyBattleData[allyImg] = {
      ...(user.pixi.allyBattleData[allyImg] || {}),
      ...allyData,
      name: allyData.name || npc.data?.name || npc.juese || '队友',
      juese: allyData.juese || npc.juese || 'maomihengban',
    };
  }

  if (canAlly) {
    // 已存在则不重复添加
    const exists = user.pixi.npcSelectList.find(n => n.img === allyImg);
    if (!exists) {
      user.pixi.npcSelectList.push({
        img: allyImg,
        name: npc.data?.name || npc.juese || '队友',
        affection: 0,
        avatarScale: 1,
        canAlly: true,
      });
    } else {
      exists.canAlly = true;
    }
  } else {
    // 不可携带：从可携带列表移除，并清除当前携带状态
    user.pixi.npcSelectList = user.pixi.npcSelectList.filter(n => n.img !== allyImg);
    if (user.getNpcAlly?.() === allyImg) user.setNpcAlly?.(null);
  }

  // 💗 好感度属性加成：入队/同步后，若该同伴好感度已达 50/100，自动补发属性加成
  user.applyNpcAffectionBonus?.(allyImg);
  // 📝 派生字段：入队/同步后按当前数值重新生成扁平技能字段与 desc/skillDesc/passiveDesc
  user.syncAllAllyDerivedFields?.();
}

/**
 * 批量移动多个 NPC（通过 moveNpcTo 事件，只改 X，Y 轴不变）
 * @param {Array<{npcId:number, xPercent:number, teleport?:boolean, direction?:number, speed?:number}>} moves
 * @example moveNpcs([{ npcId: 1, xPercent: 0.45, direction: -1 }, { npcId: 3, xPercent: 0.3 }])
 */
function moveNpcs(moves = []) {
  moves.forEach(m => {
    emitter.emit('moveNpcTo', {
      npcId: m.npcId,
      xPercent: m.xPercent,
      teleport: m.teleport ?? true,   // true=瞬移；false=走过去
      direction: m.direction,          // 1=朝右, -1=朝左（可选）
      speed: m.speed ?? null,          // 可选：行走速度
    });
  });
}

// hd122 / hd97 共用的移动配置（改位置只需改这里）
const moveJinmaoHuli = () => {
  console.log('触发');

  moveNpcs([
    { npcId: 1, xPercent: 0.45, direction: 1 },   // 金毛
    { npcId: 3, xPercent: 0.3 },                   // 狐狸
  ]);
};

// 获取精灵好感度
function getAffection(name) {
  const npc = user.getNpcInfo(name);
  console.log("npc?.affection=", npc?.affection)
  return npc?.affection || 0;
}

// 根据好感度获取问候语
function getGreetingText(name) {
  if (name === 'huli01') {
    const affection = getAffection('huli');
    if (affection >= 70) return t('npc_huli.hl56');
    if (affection >= 50) return t('npc_huli.hl54');
    if (affection >= 30) return t('npc_huli.hl52');
    return t('npc_huli.hl50');
  } else if (name === 'huli02') {
    const affection = getAffection('huli');
    if (affection >= 70) return t('npc_huli.hl57');
    if (affection >= 50) return t('npc_huli.hl55');
    if (affection >= 30) return t('npc_huli.hl53');
    return t('npc_huli.hl51');
  } else if (name === 'yu01') {
    const affection = getAffection('yu');
    if (affection >= 70) return t('npc_yu.yu56');
    if (affection >= 50) return t('npc_yu.yu54');
    if (affection >= 30) return t('npc_yu.yu52');
    return t('npc_yu.yu50');
  } else if (name === 'yu02') {
    const affection = getAffection('yu');
    if (affection >= 70) return t('npc_yu.yu57');
    if (affection >= 50) return t('npc_yu.yu55');
    if (affection >= 30) return t('npc_yu.yu53');
    return t('npc_yu.yu51');
  } else if (name === 'jinmao01') {
    const affection = getAffection('jinmao');
    if (affection >= 70) return t('npc_jinmao.jinmao56');
    if (affection >= 50) return t('npc_jinmao.jinmao54');
    if (affection >= 30) return t('npc_jinmao.jinmao52');
    return t('npc_jinmao.jinmao50');
  } else if (name === 'jinmao02') {
    const affection = getAffection('jinmao');
    if (affection >= 70) return t('npc_yjinmao.jinmao57');
    if (affection >= 50) return t('npc_jinmao.jinmao55');
    if (affection >= 30) return t('npc_jinmao.jinmao53');
    return t('npc_jinmao.jinmao51');
  }
}

// 根据好感度获取告别语
function getByeText() {
  const affection = getJinglingAffection();
  if (affection >= 60) return t('npc_jingling.bye_close');
  if (affection >= 30) return t('npc_jingling.bye_familiar');
  return t('npc_jingling.bye_stranger');
}

// ========== 对话数据 ==========
// 配置 i18n 前缀后，text 只写 key 名就行，会自动补全为 i18n:npc_jingling.xxx
const i18nPrefix = {
  default: "npc_juqing01",   // 默认分组
  "hl": "npc_huli",     // ax 开头的节点走这个分组
  "yu": "npc_yu",
  "jinmao": "npc_jinmao",
  "fx": "fengxi",
  "jqZ": "juqing02",
  "jjone": "jieju01",
  "dayo": "day5",
  "sb": "shibai01",
  "hd": "hudong01",
  "hm": "heimi"
};

// 说话者别名：用简短的 key 代替完整的名字
// 对话节点里用 speaker: "player" 就相当于 name: "林恩"
const speakers = {
  player: "林恩",   // 玩家
};

// 询问选项（zz25 和 zz32 共用，已选状态同步）
const askOptions = [
  { text: "zz27", next: "zx01" },
  { text: "zz28", next: "zc01" },
  { text: "zz29", next: "zv01" },
  { text: "zz30", next: "zb01" },
  { text: "zz31", next: "zz60", repeatable: true },
];
//狐狸
const askOptions1 = [
  {
    text: "i18n:common.liaotian",
    next: "hl100",
    onSelect: () => {
      // 聊天不再消耗精力点
    }
  },
  {
    text: "i18n:common.zhiliao",
    next: "hl200",
    repeatable: true,
    // 🩹 治疗不消耗精力点，但每天只能治疗一次（今天已治疗过则隐藏选项，隔天恢复）
    condition: () => {
      return user.getDialogueFlag('huliHealDay') !== user.pixi.player.day;
    },
    onSelect: () => {
      user.setDialogueFlag('huliHealDay', user.pixi.player.day); // 记录今天已治疗
      user.pixi.player.juese.hp = Math.min(
        user.pixi.player.juese.hp + user.pixi.player.juese.maxHp * 0.3,
        user.pixi.player.juese.maxHp
      );
    }
  },
  {
    text: "i18n:common.shiyi",
    next: "hl120",
    hideOnChosen: true,
  },
  {
    text: "i18n:common.yunmideguowang",
    next: "hl170",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("云弥的过往");
    },
  },
  {
    text: "i18n:common.fengxi",
    next: "hl207",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("晨曦与风息");
    },
  },
  {
    text: "i18n:common.bye",
    next: "end",
    repeatable: true
  },
];
//鱼
const askOptions2 = [
  {
    text: "i18n:common.liaotian",
    next: "yu100",
    onSelect: () => {
      user.addNpcAffection('yu', 30);
    }
  },
  // {
  //   text: "i18n:common.xuexi",
  //   next: "hl205",
  //   softActionCheck: true,
  //   onSelect: () => {
  //     const boolean = user.addWuxingProgress()
  //     console.log('boolean=', boolean);
  //     if (boolean < 100) {
  //       ElMessText(`悟性已提升，当前${boolean}%`, "warning");
  //     } else {
  //       ElMessText('天赋点+1', "success");
  //     }
  //   }
  // },
  {
    text: "i18n:common.shiyi",
    next: "yu120",
    hideOnChosen: true,
  },
  {
    text: "yu159",
    next: "yu160",
    repeatable: true,
    condition: () => {
      return user.getDialogueFlag("关于首领") && getAffection('yu') < 30;
    },
  },
  {
    text: "yu159",
    next: "yu165",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("关于首领") && getAffection('yu') >= 30;
    },
  },
  {
    text: "yu220",
    next: "yu160",
    repeatable: true,
    condition: () => {
      return user.getDialogueFlag("已知云弥大致情况") && getAffection('yu') < 50;
    },
  },
  {
    text: "yu220",
    next: "yu280",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("已知云弥大致情况") && getAffection('yu') >= 50;
    },
  },
  {
    text: "i18n:common.fengxi",
    next: "yu530",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("晨曦与风息");
    },
  },
  {
    text: "i18n:common.bye",
    next: "end",
    repeatable: true
  },
];
//金毛
const askOptions3 = [
  {
    text: "i18n:common.liaotian",
    next: "hl100",
    onSelect: () => {
      user.addNpcAffection('jinmao', 50);
    }
  },
  {
    text: "i18n:common.shiyi",
    next: "jinmao120",
    hideOnChosen: true,
  },
  {
    text: "jinmao40",
    next: "jinmao140",
    hideOnChosen: true,
  },
  {
    text: "i18n:common.yunmideguowang",
    next: "jinmao170",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("云弥的过往") && !user.getDialogueFlag("西亚的消息");
    },
  },
  {
    text: "i18n:common.yunmideguowang",
    next: "jinmao190",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("云弥的过往") && user.getDialogueFlag("西亚的消息") && !user.getDialogueFlag("已知云弥大致情况");
    },
  },
  {
    text: "i18n:common.fengxi",
    next: "jinmao205",
    repeatable: true,
    condition: () => {
      return user.getDialogueFlag("晨曦与风息") && getAffection('jinmao') < 50;
    },
  },
  {
    text: "i18n:common.fengxi",
    next: "jinmao250",
    // 用对话标记控制「只触发一次」：选中时写入标记，条件里检测标记
    repeatable: true,
    onSelect: () => {
      user.setDialogueFlag('jinmao250Done', true);
    },
    condition: () => {
      return user.getDialogueFlag("晨曦与风息") && !user.getDialogueFlag('jinmao250Done') && getAffection('jinmao') >= 50;
    },
  },
  {
    text: "i18n:common.bye",
    next: "end",
    repeatable: true
  },
];
//黑米
const askOptions4 = [
  {
    text: "i18n:common.bye",
    next: "end",
    repeatable: true
  },
  {
    text: "i18n:common.fengxi",
    next: "hm10",
    hideOnChosen: true,
    condition: () => {
      return user.getDialogueFlag("晨曦与风息");
    },
  },

]
const option4 = [
  { text: "hd206", next: "hd210", },
  {
    text: "hd207", next: "hd220", repeatable: true,
  }, {
    text: "hd208", next: "hd215", repeatable: true,
  },
];

export {
  user,
  emitter,
  router,
  setNpcVisible,
  hideNpc,
  isNpcExists,
  buildSharedDialogueRoute,
  calcWorldX,
  createNPC,
  moveNpcs,
  moveJinmaoHuli,
  getAffection,
  getGreetingText,
  getByeText,
  i18nPrefix,
  speakers,
  askOptions,
  askOptions1,
  askOptions2,
  askOptions3,
  askOptions4,
  option4,
};
