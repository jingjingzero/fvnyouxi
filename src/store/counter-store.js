// Store 定义（拆分自 counter.js）
import { defineStore } from "pinia";
import { Howl } from "howler";
import { playBgm as audioPlayBgm, stopBgm as audioStopBgm, setBgmVolume as audioSetBgmVolume } from "@/utils/audioManager";
import { ElMessText } from "@/pages/zujian/utils.js";
import { ElMessage } from "element-plus";
import { tr } from "@/i18n";
import emitter from "@/bus";
import { INITIAL_DECK, DEFAULT_GACHA_RATES, DEFAULT_CARD_DATA, DEFAULT_npcSelectList, NPC_NAME_COLORS, AFFECTION_BONUS_TIERS, ITEM_DEFS, FEEDABLE_ITEMS, FEED_AFFECTION_GAIN, FOOD_ITEMS, MAX_ALLY_LEVEL, MAX_PLAYER_LEVEL, BREAKTHROUGH_STAGES, BREAKTHROUGH_QUALITY_PENALTY, BREAKTHROUGH_BOOSTER_BONUS, BREAKTHROUGH_FAIL_COMPENSATION, BREAKTHROUGH_COMPENSATION_CAP, CRYSTAL_QUALITY, BREAKTHROUGH_PASSIVES, BREAKTHROUGH_QUALITY_BONUS, LIANZHI_LEVEL_CFG, LIANZHI_RECIPES, CRAFT_RECIPES, DEFAULT_ALLY_BATTLE_DATA, TASK_TPL_VERSION, TASK_DEFS, DEFAULT_inventory, TASK_REWARDS, DEFAULT_SHOP_ITEMS, DEFAULT_SELL_PRICES, ATTACK_CARDS, createDefaultJuese, LEVEL_UP_CFG, ACHIEVEMENT_DEFS, AUTO_SAVE_PATHS, SAVE_VERSION, SAVE_MIGRATIONS, META_ROLE_CFG, ROLE_INIT_CONFIGS } from "./configs";
import { setStorage, getStorage, DEFAULT_TALENT_CONFIG, refreshAllyDerivedFields, setDEFAULT_TALENT_CONFIG } from "./counter-utils";
import { DEFAULT_allTasks, buildTasksFromDefs, allyExpBase, allyExpMult, allyMaxExpForLevel } from "./counter-tasks";
import { computeUnitAttrs } from "./unitAttrs";
import { playingSounds, _sfxDedupMap, SFX_DEDUPE_MS, BGM_VOLUME_BASE, unlockAudio, _autoSaveTimer, setAutoSaveTimer } from "./counter-audio";
let _clickSound = null; // 🖱️ 点击音效单例（只加载一次，避免每次点击 new Howl 造成偶发卡顿/无反馈）
let _clickDedupAt = 0; // 🖱️ 点击音效去重时间戳（全局监听与局部调用同一次点击只响一次）

// 💾 手动存档（唯一档位：key: fv_save_slot_0；历史版本曾为六格 fv_save_slot_0 ~ 5，统一删除时兼容清理）
const SAVE_SLOT_COUNT = 1;
function saveSlotKey(i) { return 'fv_save_slot_' + i; }
/** 🏰 地牢存档 key 统一管理（快照/恢复/重置共用；新增层数只改这里） */
export const DUNGEON_KEYS = [
  'fv_dungeon_level',
  ...Array.from({ length: 10 }, (_, i) => `fv_dungeon_save_v1_L${i + 1}`),
  'fv_dungeon_save_v1',
];

/** 快照当前地牢进度（每格独立保存，读档时恢复） */
function snapshotDungeon() {
  const snap = {};
  try {
    for (const k of DUNGEON_KEYS) {
      const v = localStorage.getItem(k);
      if (v != null) snap[k] = v;
    }
  } catch (e) { /* ignore */ }
  return snap;
}
/** 恢复地牢进度快照（先清空现有地牢 key，再写入档内快照） */
function restoreDungeon(snap) {
  if (!snap || typeof snap !== 'object') return;
  try {
    for (const k of DUNGEON_KEYS) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(snap)) {
      localStorage.setItem(k, v);
    }
  } catch (e) { /* ignore */ }
}

export const useCounterStore = defineStore("counter", {
  state: () => {
    return {
      // 🎭 玩家自定义姓名（独立于存档，localStorage 持久化；新游戏/读档都保留）
      playerName: (typeof localStorage !== 'undefined' && localStorage.getItem('fv_player_name')) || '林恩',
      // 💾 待读取的手动档位（主菜单选中后标记，autoLoad 消费一次即清空；null = 读自动存档）
      _pendingLoadSlot: null,
      ceshi1: 0,
      ceshi2: 0,
      ceshi3: 0,
      pixi: {
        app: null,//主世界画布
        stop: false,
        mapLoading: false,//地图加载
        mapLoadingProgress: 0,//地图加载进度
        isPaused: false, //游戏暂停
        spineBoy: null,//主角
        fight: false,//是否进入战斗
        hasSeenBattleTutorial: false, // 是否已看过战斗新手引导
        gameUi: false,//是否隐藏ui
        characters: [],//人物动画
        setting: 0,
        npcDataList: [],//所有地图NPC数据
        mapDataList: [],//地图运行时数据（缓存，含 onClick 等函数）
        placedProps: [],//🧸 放置的道具（{ key, x, y }，纯视觉或可碰撞，读档恢复）
        removedWenhaoIds: {},//已永久删除的问号ID { mapId: [wenhaoId, ...] }，用于持久化
        activePlayer: null,
        playerInstance: null,//主角实例
        npcSelectList: DEFAULT_npcSelectList,
        // 当前携带的队友（世界地图战斗准备面板选择；null = 不带队友）
        // 存 NPC 的 img（如 'tuzi'），战斗时通过 allyBattleData 查配置
        // 🐛 初始默认携带晨曦（jinmao）：进入游戏创建 NPC 后即默认带上晨曦
        npcAlly: 'jinmao',
        // 队友战斗属性配置（DEFAULT_ALLY_BATTLE_DATA，持久化以支持自定义扩展）
        allyBattleData: DEFAULT_ALLY_BATTLE_DATA,
        // 👥 同伴展示列表（独立于地图 NPC，用于「同伴查看」展示）
        // 与 npcDataList（地图实体）解耦：即使地图上的 NPC 被删除/隐藏，只要在这个列表里就仍显示
        // 由 syncAllyList() 从 npcSelectList + allyBattleData 构建（读档/新游戏自动填充）
        // 每个元素：{ img, name, affection, avatarScale, canAlly }
        allyList: [],
        player: {
          // 🃏 当前卡组（战斗抽牌牌组；新游戏初始化 = INITIAL_DECK，可含重复多副本）
          deck: [...INITIAL_DECK],
          deckInstances: [], // 🃏 牌库实例 id 记录（与 deck 一一对应，点击哪张实例就记录哪张，图鉴"已携带"按此精确匹配）
          role: 'linen', // 🎭 开局选择的角色骨骼名（linen=林恩 / jinmao=晨曦 / yu=云弥 / huli=西亚），地图玩家形象用
          equippedItems: [], // 已装备的道具（最多3个）
          equippedItemKillCounts: {}, // 道具击杀计数 { 道具名: 击杀数 }，脱下后保留可恢复
          CARD_DATA: DEFAULT_CARD_DATA,
          juese: createDefaultJuese(),
          shenfen: `身份：奥米集团 <b class="text-#F56C6C">LV.1</b> 探索者`,
          exp: 0,//经验值
          maxExp: 50,
          Level: 1,//等级
          overflowExp: 0, // 💎 未突破时溢出的经验池（30% 转换，突破后 100% 转回）
          breakthroughLog: [], // 💎 突破记录 [{ stage, quality, level, attr, talent, time }]
          breakthroughFailBuff: {}, // 💎 突破失败补偿 { 阶段: 成功率加成 }（失败累计、成功清零，随存档保存）
          breakthroughPassives: [], // 💎 魔力晶核突破解锁的随机被动 [{ id, name, desc, type, value, fromStage }]
          talentPoints: LEVEL_UP_CFG.player.initialTalentPoints ?? 0, // 天赋点（初始可配；成就+11 / 突破+6 获取）
          freeAttrPoints: 0, // 🆓 自由属性点（每升1级 +4，可分配 力量/智慧/元素精通）
          activatedTalents: [], // 已激活的天赋ID列表（普通天赋）
          talentLevels: {}, // 可升级天赋的等级记录 { talentId: level }
          day: 1, // 当前天数
          talentTreeView: null, // 天赋树画布视图状态 { scale, offsetX, offsetY }
        },
        duihua: false,
        dayCgTrigger: false, // 昼夜变化CG触发标志
        // 语言设置
        language: 'zh-CN',
        // 对话系统状态
        dialogueFlags: {}, // 对话标记（用于条件判断）
        choiceHistory: [], // 选择历史记录
        dialogueProgress: {}, // 对话进度（记录每个对话的完成情况）
        // ⚗️ 炼制系统：已解锁的配方 ID 列表（初始未知，第一次炼制成功后才解锁）
        lianzhiRecipes: [],
        // ⚗️ 配方熟练度 { 配方id: 累计熟练度 }（炼制成功提升，失败不提升）
        lianzhiProficiency: {},
        // ⚗️ 炼制等级（熟练度累计提升，等级越高炼制失败率越低）
        lianzhiLevel: 1,
        // 🎖 卡牌熟练度 { 卡名: { exp: 累计熟练度, level: 熟练度等级 } }（战斗出牌 +1，达到阈值升级变强）
        cardMastery: {},
        // 当前所在地图ID（运行时字段，TpMap 切图时同步，供对话/工具函数判断当前地图用）
        currentMapId: 'desert_01',
      },
      _skipAutoSave: false,
      playerSprite: undefined,
      youxi01: 0,
      textYincang: false,//文字是否隐藏
      currentNodeKey: "",
      animations: [],
      youxi: 0, //游戏进程
      selectBoolean: false,//选择是否开启搜索环境
      selecttextNum: 0,//选择是否在执行中
      searchContent: [],//搜索物品
      backgroundImage: "",//背景图
      backgroundImage1: false,//背景特效图
      text: "",//文本
      text_boolean: false,//文字是否在播放中
      menu: 1,//菜单
      menuSelect: 0,//菜单选择
      savejson: [],//存档
      messages: [],//历史记录 
      inventory: [],  // 物品列表
      triggeredStories: [], // 已触发的剧情列表（一次性剧情）
      gachaHistory: [], // 抽卡历史记录
      premiumGachaPity: 0, // 高级卡池保底计数（连续未出稀有的次数）
      gachaRates: JSON.parse(JSON.stringify(DEFAULT_GACHA_RATES)), // 🎰 抽卡出货概率配置（持久化，读档同步最新默认）
      // 🏪 商店数据（持久化）
      shop: {
        money: 100, // 玩家金钱（金币）
        items: [],  // 商店物品运行时列表（含已购数量 soldNum）
      },
      achievements: [], // 成就列表（跨游戏保留，新游戏不会重置）
      dungeonAchieve: {}, // 🏰 地牢成就累计进度（跨游戏保留，新游戏不重置）
      // 🏆 局外养成：四名可玩角色的永久进度（跨局保留；失败返回时结算本局经验，升级提升下次开局初始属性）
      metaRoles: {
        linen: { exp: 0, level: 1 },
        jinmao: { exp: 0, level: 1 },
        yu: { exp: 0, level: 1 },
        huli: { exp: 0, level: 1 },
      },
      // 📊 本局累计获得经验（每局开始清零；游戏失败返回主界面时结算给局外角色）
      runExpGained: 0,
      // 🚩 本局局外结算标记（防止地牢死亡 + 战斗失败双结算）
      runMetaSettled: false,
      saveData: "",//存档数据
      SoundArr: [],
      volume: 0.6, // 默认音量 60%
      text_speed: 96,//1快速，2正常，3慢速
      textSize: 18,//文字大小
      perfMode: 'high', // ⚡ 性能模式：'high' 高性能（全特效）/ 'low' 节能（氛围/粒子/流动层关闭 + Spine 隔帧 + 昼夜静态化）
      fullBodyImages: [],//立绘
      // 📖 图鉴配置（启动页「图鉴」按钮打开，组件从这渲染）
      // - head : 相册照片用的头像图（assets/fullBody/head/{head}.webp）；null=没有头像图，自动用 spine 截图
      // - juese: Q 版 spine 骨骼名（对应 loadAssets 里的 ${juese}_skel）
      // - skin : 骨骼皮肤名（如 NPCQ 骨骼的 NPC1~NPC5），null=用默认皮肤
      // - anim : 详情页播放的基础待机动画名（默认 'idle'，有的角色是 'idle1'）；
      //          骨骼若有 'animation' 动画会始终叠加在 track1 上（与 spineBoy 一致）
      // - animSpeed : 动画播放速度（默认 1，越大越快，如 0.8=慢放 / 1.5=快放）
      // - lihui : 立绘头像骨骼基名（对应 loadAssets 里的 head_skel）；null/缺省=没有立绘，
      //          详情页可切换 Q 版 / 立绘，并选择立绘已有的表情皮肤
      // 点击照片进入详情，用 juese + skin 渲染可动的 Q 版 spine（与 createNPC 一致）
      tujian: {
        jingling: [
          { id: 'jinmao', name: '晨曦', desc: '晨曦 · 金毛', juese: 'jinmao', skin: null, head: 'jinmao', lihui: 'jinmao', anim: 'idle', animSpeed: 1 },
          { id: 'yu', name: '云弥', desc: '云弥 · 鱼', juese: 'yu', skin: null, head: 'yu', lihui: 'yu', anim: 'idle', animSpeed: 1 },
          { id: 'huli', name: '西亚', desc: '西亚 · 狐狸', juese: 'huli', skin: null, head: 'huli', lihui: 'huli', anim: 'idle', animSpeed: 1 },
          { id: 'heimi', name: '黑米', desc: '半魔化精灵（兔子）', juese: 'tuzi', skin: null, head: 'tuzi', lihui: 'heimi', anim: 'idle', animSpeed: 1 },
          { id: 'baishuo', name: '白朔', desc: '白朔', juese: 'maomihengban', skin: null, head: 'maomi', lihui: 'maomi', anim: 'idle', animSpeed: 0.5 },
          { id: 'npc1', name: '天选者', desc: '同骨骼 NPC，靠皮肤切换', juese: 'NPCQ', skin: 'NPC1', head: 'NPC1', lihui: 'zhujue', anim: 'idle', animSpeed: 1 },
          { id: 'npc2', name: '神秘精灵', desc: '同骨骼 NPC，靠皮肤切换', juese: 'NPCQ', skin: 'NPC2', head: 'NPC2', anim: 'idle', animSpeed: 1 },
          { id: 'npc3', name: '神秘精灵', desc: '同骨骼 NPC，靠皮肤切换', juese: 'NPCQ', skin: 'NPC3', head: 'NPC3', anim: 'idle', animSpeed: 1 },
          { id: 'npc4', name: '神秘精灵', desc: '同骨骼 NPC，靠皮肤切换', juese: 'NPCQ', skin: 'NPC4', head: 'NPC4', anim: 'idle', animSpeed: 1 },
          { id: 'npc5', name: '神秘精灵', desc: '同骨骼 NPC，靠皮肤切换', juese: 'NPCQ', skin: 'NPC5', head: 'NPC5', anim: 'idle', animSpeed: 1 },
          { id: 'shangren1', name: '商人1', desc: '行走四方的商人，兜售奇珍异宝。', juese: null, skin: null, head: 'shangren1', lihui: 'shangren1', anim: 'idle', animSpeed: 1 },
          { id: 'shangren2', name: '商人2', desc: '行走四方的商人，兜售奇珍异宝。', juese: null, skin: null, head: 'shangren2', lihui: 'shangren2', anim: 'idle', animSpeed: 1 },
        ],
        // 魔物（juese 对应 enemiesData.js 中实际使用的骨骼）
        monster: [
          { id: 'monster1', name: '暗影', desc: '魔物巢穴中的普通魔物', juese: 'monster1', skin: null, head: 'anying', anim: 'idle', animSpeed: 1 },
          { id: 'guaiwu2', name: '魔化猫', desc: '幽暗林地的精英魔物', juese: 'guaiwu2', skin: null, head: 'mohuamao', anim: 'idle', animSpeed: 1 },
          { id: 'guaiwu3', name: '雷鸟', desc: '废弃矿洞的飞行魔物', juese: 'guaiwu3', skin: null, head: 'leiniao', anim: 'idle', animSpeed: 1 },
           { id: 'buou', name: '空心布偶', desc: '废弃矿洞的飞行魔物', juese: 'buou', skin: null, head:null, anim: 'idle', animSpeed: 1 },
             { id: 'qilin', name: '凋零魔兽', desc: '废弃矿洞的飞行魔物', juese: 'qilin', skin: null, head:null, anim: 'idle', animSpeed: 1 },
          { id: 'anyingwang', name: '暗影王', desc: '暗影的王者（暂用暗影骨骼）', juese: 'anyingwang', skin: null, head: 'anyingwang', anim: 'idle', animSpeed: 1 },
          { id: 'yantong', name: '巨型眼瞳', desc: '重压与元素隔绝', juese: 'jutong', skin: null, head: null, anim: 'idle', animSpeed: 1 },
          { id: 'leiniaonvhuang', name: '雷鸟女皇', desc: '飞翔的雷鸟之王', juese: 'nvhuang', skin: null, head: 'leiniaonvhuang', anim: 'idle', animSpeed: 1 },
          { id: 'fengxi_monster', name: '风息', desc: '异变后的魔物形态', juese: 'fengxi', skin: null, head: 'fengxi', lihui: 'fengxi', anim: 'idle', animSpeed: 0.8 },
          { id: 'shilaimu1', name: '兽型史莱姆1', desc: '缠绕减速的兽型史莱姆', juese: 'shilaimu1', skin: null, head: null, anim: 'idle', animSpeed: 1 },
          { id: 'shilaimumm', name: '猫咪史莱姆', desc: '粘液喷射的猫咪史莱姆', juese: 'shilaimumm', skin: null, head: null, anim: 'idle', animSpeed: 1 },
          { id: 'zhanjishilaimu', name: '利刃史莱姆', desc: '挥刃斩击的利刃史莱姆', juese: 'zhanjishilaimu', skin: null, head: null, anim: 'idle', animSpeed: 1 },
          { id: 'anyingwang1', name: '暗影王·二阶段', desc: '玩闹时间结束后的暗影王，显露真正姿态', juese: 'anyingwang1', skin: null, head: null, anim: 'idle', animSpeed: 1 },
          { id: 'jutong1', name: '千目魔瞳', desc: '巨型眼瞳二阶段形态', juese: 'jutong1', skin: null, head: null, anim: 'idle', animSpeed: 1 },
          { id: 'buou1', name: '诅咒布偶', desc: '被诅咒的布偶魔物', juese: 'buou1', skin: null, head: null, anim: 'idle', animSpeed: 1 },
        ],
      },
      visible: 0, // 控制黑幕和眼皮的显示与隐藏
      currentPage: 1,//分页当前页数
      textData: null,//文本数据
      kuaijin: false,//是否快进中
      //任务列表
      allTasks: DEFAULT_allTasks,
      //天赋
      // 🎯 talentConfig 是默认天赋配置（后续新增/删除/调整数值改这里），
      //    用 IIFE 包裹以便捕获默认快照到 DEFAULT_TALENT_CONFIG（读档自动同步最新配置）
      talentConfig: (() => {
        const DEFAULT_TALENT_CONFIG_SNAPSHOT = [
          {
            id: "death_cheat",
            name: "西亚的祝福",
            description: "受到致命伤害时免疫死亡，生命值锁定为${eff.keepHp}点，每天仅触发1次",
            cost: 1,
            color: "#67C23A",
            tier: 1,
            col: -1.6,
            prerequisites: [],
            maxLevel: 1,
            levelCost: 1,
            autoGranted: true,
            attrReq: [],
            levelDescriptions: ["受到致命一击免疫死亡，血量最低保留${eff.keepHp}点，每天仅生效1次"],
            effect: { "keepHp": 1 },
          },
          {
            id: "mana_initial_up",
            name: "云弥的祝福",
            description: "战斗初始灵力+${eff.mp}，最大灵力上限+${eff.mp}",
            cost: 2,
            color: "#409EFF",
            tier: 2,
            col: -1.6,
            prerequisites: [],
            maxLevel: 1,
            levelCost: 2,
            autoGranted: true,
            attrReq: [],
            levelDescriptions: ["进入战斗初始灵力+${eff.mp}，最大灵力上限+${eff.mp}"],
            effect: { "mp": 2 },
          },
          {
            id: "attack_stack",
            name: "晨曦的祝福",
            description: "每打出1张攻击牌，攻击力+${eff.atkPct}%，持续至战斗结束",
            cost: 2,
            color: "#F56C6C",
            tier: 3,
            col: -1.6,
            prerequisites: [],
            maxLevel: 1,
            levelCost: 2,
            autoGranted: true,
            attrReq: [],
            levelDescriptions: ["每打出1张攻击牌，攻击力+${eff.atkPct}%，持续至战斗结束"],
            effect: { "atkPct": 0.02 },
          },
          {
            id: "moqi_blessing",
            name: "莫奇的祝福",
            description: "每装备一件道具，进入战斗后攻击力+${eff.atkPct}%",
            cost: 1,
            color: "#F59E0B",
            tier: 1,
            col: -3.2,
            prerequisites: [],
            maxLevel: 1,
            levelCost: 1,
            autoGranted: true,
            attrReq: [],
            levelDescriptions: ["每装备一件道具，进入战斗后攻击力+${eff.atkPct}%"],
            effect: { "atkPct": 0.06 },
          },
          {
            id: "mana_max_up",
            name: "灵海扩容",
            description: "最大灵力上限 + ${eff.mpPerLv}",
            cost: 2,
            color: "#409EFF",
            tier: 1,
            col: 0,
            prerequisites: [],
            maxLevel: 2,
            levelCost: 2,
            attrReq: [],
            levelDescriptions: ["最大灵力上限 + ${eff.mpPerLv}", "最大灵力上限 + ${eff.mpPerLv}", "最大灵力上限 + ${eff.mpPerLv}", "最大灵力上限 + ${eff.mpPerLv}"],
            effect: { "mpPerLv": 1 },
          },
          {
            id: "mana_surge",
            name: "灵力奔涌",
            description: "初始灵力+${eff.mpPerLv}",
            cost: 2,
            color: "#409EFF",
            tier: 1,
            col: 1.6,
            prerequisites: [],
            maxLevel: 2,
            levelCost: 2,
            attrReq: [],
            levelDescriptions: ["初始灵力+${eff.mpPerLv}", "初始灵力+${eff.mpPerLv}"],
            effect: { "mpPerLv": 1 },
          },
          {
            id: "life_steal",
            name: "生命回复",
            description: "自身回合开始时恢复${eff.basePct}%最大生命值",
            cost: 1,
            color: "#67C23A",
            tier: 1,
            col: 3.2,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值", "自身回合开始时恢复${eff.basePct}%最大生命值"],
            effect: { "basePct": 0.02, "perLvPct": 0.005 },
          },
          {
            id: "card_master",
            name: " 余匣 ",
            description: "可携带的卡牌数量提升 ${eff.extraCards}",
            cost: 2,
            color: "#909399",
            tier: 1,
            col: 4.8,
            prerequisites: [],
            maxLevel: 3,
            levelCost: 2,
            attrReq: [],
            levelDescriptions: ["可携带的卡牌数量提升 ${eff.extraCards}", "可携带的卡牌数量提升 ${eff.extraCards}", "可携带的卡牌数量提升 ${eff.extraCards}"],
            effect: { "extraCards": 1, "extraCardsPerLv": 1 },
          },
          {
            id: "mana_bless",
            name: "灵力护盾",
            description: " 进入战斗后获得 ${eff.basePct}% 最大生命值护盾 ",
            cost: 1,
            color: "#72D9FF",
            tier: 1,
            col: 6.4,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: [" 进入战斗后获得 ${eff.basePct}% 最大生命值护盾 ", " 进入战斗后获得 ${eff.basePct}% 最大生命值护盾 ", " 进入战斗后获得 ${eff.basePct}% 最大生命值护盾 ", " 进入战斗后获得 ${eff.basePct}% 最大生命值护盾 ", " 进入战斗后获得 ${eff.basePct}% 最大生命值护盾 "],
            effect: { "basePct": 0.04, "perLvPct": 0.02 },
          },
          {
            id: "battle_frenzy",
            name: " 战斗狂热 ",
            description: "力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（每级+${eff.flatStrPerLv}）",
            cost: 1,
            color: "#F56C6C",
            tier: 1,
            col: 8.79,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: [" 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）", " 力量+${eff.flatStr + eff.flatStrPerLv * (level - 1)}（常驻，加在面板上）"],
            effect: { "flatStr": 4, "flatStrPerLv": 4 },
          },
          {
            id: "no_attack_power_up",
            name: " 隐忍 ",
            description: " 自身回合内未打出攻击牌，则下个自身回合攻击力提升${eff.atkPct}%",
            cost: 2,
            color: "#E6A23C",
            tier: 1,
            col: 20.99,
            prerequisites: [],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [],
            levelDescriptions: [],
            effect: { "atkPct": 0.2 },
          },
          {
            id: "swift_speed",
            name: "迅捷",
            description: "进入战斗后，移动速度+${eff.flatSpeed + eff.flatSpeedPerLv * (level - 1)}（每级+${eff.flatSpeedPerLv}）",
            cost: 1,
            color: "#5cc0ff",
            tier: 1,
            col: 11.2,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["进入战斗后，移动速度+${eff.flatSpeed + eff.flatSpeedPerLv * (level - 1)}", "进入战斗后，移动速度+${eff.flatSpeed + eff.flatSpeedPerLv * (level - 1)}", "进入战斗后，移动速度+${eff.flatSpeed + eff.flatSpeedPerLv * (level - 1)}", "进入战斗后，移动速度+${eff.flatSpeed + eff.flatSpeedPerLv * (level - 1)}", "进入战斗后，移动速度+${eff.flatSpeed + eff.flatSpeedPerLv * (level - 1)}"],
            effect: { "flatSpeed": 4, "flatSpeedPerLv": 4 },
          },
          {
            id: "luck_blessing",
            name: "好运",
            description: "幸运+${eff.baseLuck}",
            cost: 1,
            color: "#E6B800",
            tier: 1,
            col: 13.6,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["幸运+${eff.baseLuck + eff.perLvLuck * (level - 1)}", "幸运+${eff.baseLuck + eff.perLvLuck * (level - 1)}", "幸运+${eff.baseLuck + eff.perLvLuck * (level - 1)}", "幸运+${eff.baseLuck + eff.perLvLuck * (level - 1)}", "幸运+${eff.baseLuck + eff.perLvLuck * (level - 1)}"],
            effect: { "baseLuck": 5, "perLvLuck": 5 },
          },
          {
            id: "hardened_armor",
            name: "硬化",
            description: "护甲+${eff.flatArmor + eff.flatArmorPerLv * (level - 1)}、魔抗+${eff.flatMagicResist + eff.flatMagicResistPerLv * (level - 1)}（每级各+${eff.flatArmorPerLv}）",
            cost: 1,
            color: "#94a3b8",
            tier: 1,
            col: 15.97,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["护甲+${eff.flatArmor + eff.flatArmorPerLv * (level - 1)}、魔抗+${eff.flatMagicResist + eff.flatMagicResistPerLv * (level - 1)}", "护甲+${eff.flatArmor + eff.flatArmorPerLv * (level - 1)}、魔抗+${eff.flatMagicResist + eff.flatMagicResistPerLv * (level - 1)}", "护甲+${eff.flatArmor + eff.flatArmorPerLv * (level - 1)}、魔抗+${eff.flatMagicResist + eff.flatMagicResistPerLv * (level - 1)}", "护甲+${eff.flatArmor + eff.flatArmorPerLv * (level - 1)}、魔抗+${eff.flatMagicResist + eff.flatMagicResistPerLv * (level - 1)}", "护甲+${eff.flatArmor + eff.flatArmorPerLv * (level - 1)}、魔抗+${eff.flatMagicResist + eff.flatMagicResistPerLv * (level - 1)}"],
            effect: { "flatArmor": 2, "flatArmorPerLv": 2, "flatMagicResist": 2, "flatMagicResistPerLv": 2 },
          },
          {
            id: "element_reaction_dmg_up",
            name: "元素共鸣",
            description: "元素精通 +${eff.flatMastery}",
            cost: 1,
            color: "#9370DB",
            tier: 1,
            col: 18,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["元素精通 +${eff.flatMastery * level}", "元素精通 +${eff.flatMastery * level}", "元素精通 +${eff.flatMastery * level}", "元素精通 +${eff.flatMastery * level}", "元素精通 +${eff.flatMastery * level}"],
            effect: { "flatMastery": 5 },
          },
          {
            id: "hp_convert_atk",
            name: "生命转换",
            description: "进入战斗后，获得自身最大生命值${eff.rates}%的攻击力",
            cost: 2,
            color: "#67C23A",
            tier: 1,
            col: 19.6,
            prerequisites: [],
            maxLevel: 3,
            levelCost: 2,
            levelDescriptions: ["进入战斗后，获得自身最大生命值${eff.rates}%的攻击力", "进入战斗后，获得自身最大生命值${eff.rates}%的攻击力", "进入战斗后，获得自身最大生命值${eff.rates}%的攻击力"],
            effect: { "rates": [0.06,0.09,0.12] },
          },
          {
            id: "element_residual",
            name: "元素残留",
            description: "敌人受到元素反应伤害后，后续元素反应伤害提升${eff.reactBonus}%",
            cost: 2,
            color: "#9370DB",
            tier: 2,
            col: 18.8,
            prerequisites: [{ id: "element_reaction_dmg_up", minLevel: 2 }],
            maxLevel: 4,
            levelCost: 1,
            attrReq: [{"key":"intelligence","value":25}],
            levelDescriptions: ["敌人受到元素反应伤害后，后续元素反应伤害提升${eff.reactBonus}%", "敌人受到元素反应伤害后，后续元素反应伤害提升${eff.reactBonus}%", "敌人受到元素反应伤害后，后续元素反应伤害提升${eff.reactBonus}%", "敌人受到元素反应伤害后，后续元素反应伤害提升${eff.reactBonus}%", "敌人受到元素反应伤害后，后续元素反应伤害提升${eff.reactBonus}%"],
            effect: { "reactBonus": 0.02, "reactBonusPerLv": 0.01 },
          },
          {
            id: "element_derivative_dmg",
            name: "紊乱",
            description: "进入战斗后，获得智慧${eff.rate}%的元素精通（战斗内生效，仅1级）",
            cost: 3,
            color: "#9370DB",
            tier: 2,
            col: 17.2,
            prerequisites: [{ id: "element_reaction_dmg_up", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [{"key":"intelligence","value":25}],
            levelDescriptions: ["进入战斗后，获得智慧${eff.rate}%的元素精通（战斗内生效）"],
            effect: { "rate": 0.25 },
          },
          {
            id: "element_armor_pierce",
            name: "纯净元素",
            description: "元素反应伤害无视敌人${eff.basePct}%护甲",
            cost: 3,
            color: "#9370DB",
            tier: 2,
            col: 18,
            prerequisites: [{ id: "element_reaction_dmg_up", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [{"key":"intelligence","value":25}],
            levelDescriptions: ["元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲", "元素反应伤害无视敌人${eff.basePct}%护甲"],
            effect: { "basePct": 0.2, "perLvPct": 0.04 },
          },
          {
            id: "hurt_atk_stack",
            name: "愤怒",
            description: "受到攻击后，攻击力提升2%",
            cost: 1,
            color: "#67C23A",
            tier: 2,
            col: 2.8,
            prerequisites: [{ id: "life_steal", minLevel: 4 }],
            maxLevel: 3,
            levelCost: 1,
            levelDescriptions: ["受到攻击后，攻击力+2%", "受到攻击后，攻击力+3%", "受到攻击后，攻击力+4%"],
            effect: { "perLvRate": 0.01 },
          },
          {
            id: "heal_atk_buff",
            name: "灵愈",
            description: "受到治疗后，攻击力提升${eff.rates}%",
            cost: 2,
            color: "#67C23A",
            tier: 2,
            col: 3.6,
            prerequisites: [{ id: "life_steal", minLevel: 4 }],
            maxLevel: 3,
            levelCost: 2,
            levelDescriptions: ["受到治疗后，攻击力+${eff.rates}%", "受到治疗后，攻击力+${eff.rates}%", "受到治疗后，攻击力+${eff.rates}%", "受到治疗后，攻击力+${eff.rates}%", "受到治疗后，攻击力+${eff.rates}%"],
            effect: { "rates": [0.02,0.04,0.06] },
          },
          {
            id: "critical_strike",
            name: " 致命一击 ",
            description: "每回合使用的第一张物理牌伤害增加25%",
            cost: 3,
            color: "#F56C6C",
            tier: 2,
            col: 7.99,
            prerequisites: [{ id: "battle_frenzy", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [{"key":"strength","value":30}],
            levelDescriptions: ["每回合使用的第一张物理牌伤害增加25%", "每回合使用的第一张物理牌伤害增加25%", "每回合使用的第一张物理牌伤害增加25%"],
            effect: { "perLv": 0.25 },
          },
          {
            id: "double_blade",
            name: "双刃剑",
            description: "自身最终物理伤害提升${eff.dmgBonus}%，同时受到所有伤害增加${eff.takenReduce}%",
            cost: 2,
            color: "#F56C6C",
            tier: 2,
            col: 8.79,
            prerequisites: [{ id: "battle_frenzy", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [{"key":"strength","value":30}],
            levelDescriptions: ["自身最终物理伤害提升${eff.dmgBonus}%，同时受到所有伤害增加${eff.takenReduce}%"],
            effect: { "dmgBonus": 0.25, "takenReduce": 0.12 },
          },
          {
            id: "execute",
            name: "残血收割",
            description: "对生命值低于${eff.thresholdBase}%的敌人，最终物理伤害提升${eff.dmgBase}%",
            cost: 2,
            color: "#dc2626",
            tier: 2,
            col: 9.66,
            prerequisites: [{ id: "battle_frenzy", minLevel: 2 }],
            maxLevel: 3,
            levelCost: 2,
            attrReq: [{"key":"strength","value":30}],
            levelDescriptions: ["对生命值低于${eff.thresholdBase}%的敌人，最终物理伤害提升${eff.dmgBase}%（独立乘区）", "对生命值低于${eff.thresholdBase}%的敌人，最终物理伤害提升${eff.dmgBase}%（独立乘区）", "对生命值低于${eff.thresholdBase}%的敌人，最终物理伤害提升${eff.dmgBase}%（独立乘区）"],
            effect: { "thresholdBase": 0.25, "thresholdPerLv": 0.1, "dmgBase": 0.25, "dmgPerLv": 0.05 },
          },
          {
            id: "mana_atk_stack",
            name: "魔力淬体",
            description: "每消耗1点魔力，攻击力+${eff.atkPerMana}%",
            cost: 1,
            color: "#409EFF",
            tier: 2,
            col: 1.6,
            prerequisites: [{ id: "mana_surge", minLevel: 1 }],
            maxLevel: 3,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["每消耗1点魔力，攻击力+${eff.atkPerMana}%", "每消耗1点魔力，攻击力+${eff.atkPerMana}%", "每消耗1点魔力，攻击力+${eff.atkPerMana}%", "每消耗1点魔力，攻击力+${eff.atkPerMana}%", "每消耗1点魔力，攻击力+${eff.atkPerMana}%"],
            effect: { "atkPerMana": 0.006, "atkPerManaPerLv": 0.003 },
          },
          {
            id: "mana_cycle_free",
            name: "魔力溢涌",
            description: "每消耗${eff.manaCost}点魔力，本回合内下一张卡牌无需消耗魔力",
            cost: 2,
            color: "#7289DA",
            tier: 2,
            col: 0,
            prerequisites: [{ id: "mana_max_up", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [],
            levelDescriptions: ["每消耗${eff.manaCost}点魔力，本回合内下一张卡牌无需消耗魔力"],
            effect: { "manaCost": 12 },
          },
          {
            id: "armor_fixed_dmg",
            name: "尖刺攻击",
            description: "行动时攻击最近的敌人，造成${eff.rates}%（双抗）的无属性伤害",
            cost: 1,
            color: "#8090B0",
            tier: 2,
            col: 16.4,
            prerequisites: [{ id: "hardened_armor", minLevel: 3 }],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["行动时攻击最近的敌人，造成${eff.rates}%（双抗）的无属性伤害", "行动时攻击最近的敌人，造成${eff.rates}%（双抗）的无属性伤害", "行动时攻击最近的敌人，造成${eff.rates}%（双抗）的无属性伤害", "行动时攻击最近的敌人，造成${eff.rates}%（双抗）的无属性伤害", "行动时攻击最近的敌人，造成${eff.rates}%（双抗）的无属性伤害"],
            effect: { "rates": {"1":0.125,"2":0.1625,"3":0.2,"4":0.2375,"5":0.275} },
          },
          {
            id: "thorns_reflect",
            name: "荆棘反伤",
            description: "受到伤害反弹${eff.basePct}%折前伤害",
            cost: 2,
            color: "#8090B0",
            tier: 2,
            col: 15.6,
            prerequisites: [{ id: "hardened_armor", minLevel: 3 }],
            maxLevel: 4,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["受到伤害反弹${eff.basePct}%折前伤害", "受到伤害反弹${eff.basePct}%折前伤害", "受到伤害反弹${eff.basePct}%折前伤害", "受到伤害反弹${eff.basePct}%折前伤害", "受到伤害反弹${eff.basePct}%折前伤害"],
            effect: { "basePct": 6, "perLvPct": 2 },
          },
          {
            id: "first_strike",
            name: "先机",
            description: "进入战斗后自身行动条提升${eff.actionPerLv}%",
            cost: 3,
            color: "#5cc0ff",
            tier: 2,
            col: 11.21,
            prerequisites: [{ id: "swift_speed", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [{"key":"speed","value":135}],
            levelDescriptions: ["进入战斗后自身行动条提升${eff.actionPerLv}%", "进入战斗后自身行动条提升${eff.actionPerLv}%", "进入战斗后自身行动条提升${eff.actionPerLv}%"],
            effect: { "actionPerLv": 5000 },
          },
          {
            id: "blessing",
            name: "眷顾",
            description: "提升${eff.dropMult}%魔物击杀物品掉落概率",
            cost: 2,
            color: "#E6B800",
            tier: 2,
            col: 12.79,
            prerequisites: [{ id: "luck_blessing", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [{"key":"luck","value":45}],
            levelDescriptions: ["提升击杀魔物物品掉落概率"],
            effect: { "dropMult": 0.2 },
          },
          {
            id: "battle_start_strike",
            name: "不幸",
            description: "进入战斗有${eff.baseProb}%基础概率，对全体敌人造成${eff.dmgRatios}%幸运值伤害，并使敌人受到伤害提升${eff.vulnPct}%，持续整场战斗",
            cost: 1,
            color: "#E6B800",
            tier: 2,
            col: 13.6,
            prerequisites: [{ id: "luck_blessing", minLevel: 2 }],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [{"key":"luck","value":45}],
            levelDescriptions: ["进入战斗${eff.baseProb}%基础概率，对全体敌人造成${eff.dmgRatios}%幸运值伤害，敌人受伤+${eff.vulnPct}%整场战斗", "进入战斗${eff.baseProb}%基础概率，对全体敌人造成${eff.dmgRatios}%幸运值伤害，敌人受伤+${eff.vulnPct}%整场战斗", "进入战斗${eff.baseProb}%基础概率，对全体敌人造成${eff.dmgRatios}%幸运值伤害，敌人受伤+${eff.vulnPct}%整场战斗", "进入战斗${eff.baseProb}%基础概率，对全体敌人造成${eff.dmgRatios}%幸运值伤害，敌人受伤+${eff.vulnPct}%整场战斗", "进入战斗${eff.baseProb}%基础概率，对全体敌人造成${eff.dmgRatios}%幸运值伤害，敌人受伤+${eff.vulnPct}%整场战斗"],
            effect: { "baseProb": 0.3, "probPerLv": 0.1, "dmgRatios": [1.2,1.5,1.8,2.1,2.4], "vulnPct": 0.15 },
          },
          {
            id: "luck_grace",
            name: "增幅",
            description: "击败魔物获得经验提升${eff.expMult}%",
            cost: 2,
            color: "#E6B800",
            tier: 2,
            col: 14.39,
            prerequisites: [{ id: "luck_blessing", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [{"key":"luck","value":45}],
            levelDescriptions: ["击败魔物获得经验提升${eff.expMult}%", "击败魔物获得经验提升${eff.expMult}%", "击败魔物获得经验提升${eff.expMult}%"],
            effect: { "expMult": 0.25, "expMultPerLv": 0.075 },
          },
          {
            id: "card_draw_mana",
            name: "蓄灵",
            description: "每使用${eff.needCards}张牌，恢复${eff.mp}点灵力",
            cost: 2,
            color: "#409EFF",
            tier: 2,
            col: 4.4,
            prerequisites: [{ id: "card_master", minLevel: 2 }],
            maxLevel: 2,
            levelCost: 2,
            levelDescriptions: ["每使用${eff.needCards}张手牌，恢复${eff.mp}点灵力", "每使用${eff.needCards}张手牌，恢复${eff.mp}点灵力"],
            effect: { "needCards": 5, "perLvCards": -1, "mp": 1 },
          },
          {
            id: "round_end_random_cd",
            name: "时序调息",
            description: "回合结束时若手牌数少于3张，则抽一张牌",
            cost: 3,
            color: "#409EFF",
            tier: 2,
            col: 5.2,
            prerequisites: [{ id: "card_master", minLevel: 3 }],
            maxLevel: 1,
            levelCost: 3,
            levelDescriptions: ["回合结束时若手牌数少于3张，则抽一张牌"],
            effect: { "needCards": 3 },
          },
          {
            id: "shield_charge_action",
            name: "能量转换",
            description: "敌方攻击护盾，自身行动条+${eff.basePct}%",
            cost: 1,
            color: "#72D9FF",
            tier: 2,
            col: 5.8,
            prerequisites: [{ id: "mana_bless", minLevel: 3 }],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["敌方攻击护盾，自身行动条+${eff.basePct}%", "敌方攻击护盾，自身行动条+${eff.basePct}%", "敌方攻击护盾，自身行动条+${eff.basePct}%", "敌方攻击护盾，自身行动条+${eff.basePct}%", "敌方攻击护盾，自身行动条+${eff.basePct}%"],
            effect: { "basePct": 6, "perLvPct": 3 },
          },
          {
            id: "shield_reflect_damage",
            name: "盾反",
            description: "敌方攻击护盾，反弹${eff.baseRate}%伤害",
            cost: 1,
            color: "#72D9FF",
            tier: 2,
            col: 7.01,
            prerequisites: [{ id: "mana_bless", minLevel: 3 }],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害", "敌方攻击护盾，反弹${eff.baseRate}%伤害"],
            effect: { "baseRate": 1.4, "perLvRate": 0.4 },
          },
          {
            id: "no_attack_armor_up",
            name: "抵抗姿态",
            description: "行动未使用攻击牌，护甲与魔抗提升${eff.rates}%，持续至下次行动",
            cost: 1,
            color: "#8090B0",
            tier: 3,
            col: 16.4,
            prerequisites: [{ id: "armor_fixed_dmg", minLevel: 3 }],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["行动未使用攻击牌，护甲与魔抗提升40%，持续至下次行动", "行动未使用攻击牌，护甲与魔抗提升50%，持续至下次行动", "行动未使用攻击牌，护甲与魔抗提升60%，持续至下次行动", "行动未使用攻击牌，护甲与魔抗提升70%，持续至下次行动", "行动未使用攻击牌，护甲与魔抗提升80%，持续至下次行动"],
            effect: { "rates": {"1":0.3,"2":0.4,"3":0.5,"4":0.6,"5":0.7} },
          },
          {
            id: "start_battle_armor_buff",
            name: "绝对防御",
            description: "战斗开始护甲与魔抗提升${eff.rates}%，受到3次攻击后失效",
            cost: 1,
            color: "#5B9BD5",
            tier: 3,
            col: 15.6,
            prerequisites: [{ id: "thorns_reflect", minLevel: 3 }],
            maxLevel: 3,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["战斗开始护甲与魔抗提升${eff.rates}%，受到3次攻击后失效", "战斗开始护甲与魔抗提升${eff.rates}%，受到3次攻击后失效", "战斗开始护甲与魔抗提升${eff.rates}%，受到3次攻击后失效"],
            effect: { "rates": {"1":0.4,"2":0.5,"3":0.6,"4":0.7,"5":0.8} },
          },
          {
            id: "luck_action_rush",
            name: "再来一次",
            description: "回合结束时，${eff.baseProb}%概率额外获得一回合，未触发下次概率额外+${eff.incProb}%，战斗结束重置",
            cost: 2,
            color: "#E6B800",
            tier: 3,
            col: 12.8,
            prerequisites: [{ id: "blessing", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [{"key":"luck","value":60}],
            levelDescriptions: ["回合结束时，${eff.baseProb}%概率额外获得一回合，未触发下次概率额外+${eff.incProb}%，战斗结束重置"],
            effect: { "baseProb": 0.15, "incProb": 0.03 },
          },
          {
            id: "enemy_luck_dmg",
            name: "厄运",
            description: "敌人行动时，${eff.baseProb}%概率受到${eff.dmgRatios}%幸运值伤害（未触发时每次概率+${eff.incProb}%，触发后重置）",
            cost: 1,
            color: "#E6B800",
            tier: 3,
            col: 13.6,
            prerequisites: [{ id: "battle_start_strike", minLevel: 3 }],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [{"key":"luck","value":60}],
            levelDescriptions: ["敌人行动时，${eff.baseProb}%概率受到${eff.dmgRatios}%幸运值伤害（未触发时每次概率+${eff.incProb}%，触发后重置）", "敌人行动时，${eff.baseProb}%概率受到${eff.dmgRatios}%幸运值伤害（未触发时每次概率+${eff.incProb}%，触发后重置）", "敌人行动时，${eff.baseProb}%概率受到${eff.dmgRatios}%幸运值伤害（未触发时每次概率+${eff.incProb}%，触发后重置）", "敌人行动时，${eff.baseProb}%概率受到${eff.dmgRatios}%幸运值伤害（未触发���每次概率+${eff.incProb}%，触发后重置）", "敌人行动时，${eff.baseProb}%概率受到${eff.dmgRatios}%幸��值伤害（未触发时每次概率+${eff.incProb}%，触发后重置）"],
            effect: { "dmgRatios": [0.6,0.75,0.9,1.05,1.2], "baseProb": 0.5, "incProb": 0.05 },
          },
          {
            id: "luck_mana_restore",
            name: "多多益善",
            description: "每打出一张手牌，${eff.baseProb}%概率恢复1点灵力，未触发则下次概率+${eff.incProb}%，战斗结束重置",
            cost: 2,
            color: "#E6B800",
            tier: 3,
            col: 14.4,
            prerequisites: [{ id: "luck_grace", minLevel: 3 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [{"key":"luck","value":60}],
            levelDescriptions: ["每打出一张手牌，${eff.baseProb}%概率恢复1点灵力，未触发则下次概率+${eff.incProb}%，战斗结束重置"],
            effect: { "baseProb": 0.15, "incProb": 0.01 },
          },
          {
            id: "shield_absorb",
            name: "抵消",
            description: "护盾被超额击破时，溢出伤害不会损耗生命值",
            cost: 2,
            color: "#72D9FF",
            tier: 3,
            col: 5.8,
            prerequisites: [{ id: "shield_charge_action", minLevel: 5 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["护盾承受超额伤害被击碎时，超出护盾部分伤害无效，自身生命值不受影响"],
            effect: { "enable": "true" },
          },
          {
            id: "shield_damage_up",
            name: "无畏强攻",
            description: "护盾存在时，最终伤害+${eff.dmgBonus}%",
            cost: 2,
            color: "#72D9FF",
            tier: 3,
            col: 6.4,
            prerequisites: [{ id: "shield_charge_action", minLevel: 3 }, { id: "shield_reflect_damage", minLevel: 5 }],
            maxLevel: 3,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["护盾存在时，最终伤害+${eff.dmgBonus}%", "护盾存在时，最终伤害+${eff.dmgBonus}%", "护盾存在时，最终伤害+${eff.dmgBonus}%"],
            effect: { "dmgBonus": 0.15, "dmgBonusPerLv": 0.05 },
          },
          {
            id: "low_hp_shield",
            name: "绝境守御",
            description: "生命值低于${eff.hpRate}%时，获得自身${eff.shieldPct}%大生命值护盾，每场战斗仅触发一次",
            cost: 2,
            color: "#72D9FF",
            tier: 3,
            col: 7,
            prerequisites: [{ id: "shield_reflect_damage", minLevel: 3 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["血量低于${eff.hpRate}%，获得${eff.shieldPct}%最大生命护盾，单场战斗仅触发1次"],
            effect: { "hpRate": 0.4, "shieldPct": 0.15 },
          },
          {
            id: "mana_regen",
            name: "灵韵流转",
            description: " 每回合开始时额外获得 ${eff.mpLv1} 点灵力 ",
            cost: 2,
            color: "#409EFF",
            tier: 3,
            col: 0,
            prerequisites: [{ id: "mana_cycle_free", minLevel: 1 }],
            maxLevel: 2,
            levelCost: 2,
            attrReq: [],
            levelDescriptions: ["每回合开始时额外获得 ${eff.mpLv1} 点灵力 ", "每回合开始时额外获得 ${eff.mpLv2} 点灵力 "],
            effect: { "mpLv1": 1, "mpLv2": 2 },
          },
          {
            id: "mana_cd_reduce",
            name: "时间加速",
            description: "每消耗${eff.manaCost}点魔力，抽一张牌",
            cost: 3,
            color: "#409EFF",
            tier: 3,
            col: 1.62,
            prerequisites: [{ id: "mana_atk_stack", minLevel: 3 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [],
            levelDescriptions: ["每消耗${eff.manaCost}点魔力，抽一张牌"],
            effect: { "manaCost": 10 },
          },
          {
            id: "element_damage_up",
            name: "元素增伤",
            description: "造成火、电、水、冰、风元素伤害时，最终伤害提升${eff.eleBonus}%",
            cost: 3,
            color: "#F56C6C",
            tier: 3,
            col: 18,
            prerequisites: [{ id: "element_derivative_dmg", minLevel: 1 }, { id: "element_armor_pierce", minLevel: 1 }, { id: "element_residual", minLevel: 3 }],
            maxLevel: 3,
            levelCost: 1,
            attrReq: [{"key":"intelligence","value":40}],
            levelDescriptions: ["造成火、电、水、冰、风元素伤害时，最终伤害提升${eff.eleBonus}%", "造成火、电、水、冰、风元素伤害时，最终伤害提升${eff.eleBonus}%", "造成火、电、水、冰、风元素伤害时，最终伤害提升${eff.eleBonus}%", "造成火、电、水、冰、风元素伤害时，最终伤害提升${eff.eleBonus}%"],
            effect: { "eleBonus": 0.2, "eleBonusPerLv": 0.05 },
          },
          {
            id: "element_fission",
            name: "元素裂变",
            description: "触发元素反应后，为敌人随机附加${eff.addStatus}种自身未拥有的元素异常状态（裂变附加的元素参与的反应总伤害-50%）",
            cost: 5,
            color: "#BA55D3",
            tier: 4,
            col: 18,
            prerequisites: [{ id: "element_damage_up", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [{"key":"intelligence","value":60}],
            levelDescriptions: ["触发元素反应后，为敌人随机附加${eff.addStatus}种自身未拥有的元素异常状态"],
            effect: { "addStatus": 1 },
          },
          {
            id: "low_hp_emergency_heal",
            name: "快速愈合",
            description: "生命值低于${eff.hpRate}%时，立即治疗自己五次，每次恢复${eff.healPct}%最大生命值，每场战斗仅触发1次",
            cost: 3,
            color: "#67C23A",
            tier: 3,
            col: 3.6,
            prerequisites: [{ id: "heal_atk_buff", minLevel: 2 }],
            maxLevel: 1,
            levelCost: 3,
            levelDescriptions: ["生命值低于${eff.hpRate}%时，立即治疗自己五次，每次恢复${eff.healPct}%最大生命值，每场战斗仅触发1次"],
            effect: { "hpRate": 0.4, "healPct": 0.03, "ticks": 5 },
          },
          {
            id: "kill_recover_mana",
            name: "噬灵收割",
            description: "消灭敌人后，获得${eff.baseMp}点灵力",
            cost: 1,
            color: "#409EFF",
            tier: 3,
            col: 9.6,
            prerequisites: [{ id: "execute", minLevel: 1 }],
            maxLevel: 3,
            levelCost: 1,
            attrReq: [{"key":"strength","value":50}],
            levelDescriptions: ["消灭敌人后，获得${eff.baseMp}点灵力", "消灭敌人后，获得${eff.baseMp}点灵力", "消灭敌人后，获得${eff.baseMp}点灵力"],
            effect: { "baseMp": 1, "mpPerLv": 1 },
          },
          {
            id: "battle_start_attack_buff",
            name: "先攻",
            description: "进入战斗时攻击力提升${eff.atkPct}%，造成物理伤害提升${eff.dmgBonus}%，效果持续1回合",
            cost: 2,
            color: "#dc2626",
            tier: 3,
            col: 8.79,
            prerequisites: [{ id: "double_blade", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [{"key":"strength","value":50}],
            levelDescriptions: ["进入战斗时攻击力提升${eff.atkPct}%，造成物理伤害提升${eff.dmgBonus}%，效果持续1回合"],
            effect: { "atkPct": 0.4, "dmgBonus": 0.4 },
          },
          {
            id: "kill_spread_damage",
            name: "余伤蔓延",
            description: "击杀敌人时，溢出伤害的${eff.transferPct}%由最近敌方单位全额承受",
            cost: 2,
            color: "#dc2626",
            tier: 3,
            col: 8,
            prerequisites: [{ id: "critical_strike", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [{"key":"strength","value":50}],
            levelDescriptions: ["击杀敌人时，溢出伤害的${eff.transferPct}%由最近敌方单位全额承受"],
            effect: { "transferPct": 0.6 },
          },
          {
            id: "swift_rush",
            name: "顺势疾行",
            description: "受到攻击后，自身行动条提升${eff.baseProgress}%",
            cost: 2,
            color: "#5cc0ff",
            tier: 3,
            col: 10.4,
            prerequisites: [{ id: "first_strike", minLevel: 2 }],
            maxLevel: 3,
            levelCost: 1,
            attrReq: [{"key":"speed","value":155}],
            levelDescriptions: ["受到攻击后，自身行动条提升${eff.baseProgress}%", "受到攻击后，自身行动条提升${eff.baseProgress}%", "受到攻击后，自身行动条提升${eff.baseProgress}%"],
            effect: { "baseProgress": 100, "perLvProgress": 40 },
          },
          {
            id: "attack_round_start_up",
            name: "锋速",
            description: "自身回合开始时，攻击力提升${eff.rates}%",
            cost: 1,
            color: "#5cc0ff",
            tier: 3,
            col: 11.2,
            prerequisites: [{ id: "first_strike", minLevel: 2 }],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [{"key":"speed","value":155}],
            levelDescriptions: ["自身回合开始，攻击力+${eff.rates}%", "自身回合开始，攻击力+${eff.rates}%", "自身回合开始，攻击力+${eff.rates}%", "自身回合开始，攻击力+${eff.rates}%", "自身回合开始，攻击力+${eff.rates}%"],
            effect: { "rates": [0.05,0.06,0.07,0.08,0.09] },
          },
          {
            id: "turn_end_speed",
            name: "余速续航",
            description: "自身回合结束时，行动条提升${eff.basePct + eff.perLvPct * (level - 1)}%",
            cost: 2,
            color: "#5cc0ff",
            tier: 3,
            col: 12,
            prerequisites: [{ id: "first_strike", minLevel: 2 }],
            maxLevel: 4,
            levelCost: 1,
            attrReq: [{"key":"speed","value":155}],
            levelDescriptions: ["自身回合结束时，行动条提升${eff.basePct + eff.perLvPct * (level - 1)}%", "自身回合结束时，行动条提升${eff.basePct + eff.perLvPct * (level - 1)}%", "自身回合结束时，行动条提升${eff.basePct + eff.perLvPct * (level - 1)}%", "自身回合结束时，行动条提升${eff.basePct + eff.perLvPct * (level - 1)}%"],
            effect: { "basePct": 5, "perLvPct": 3 },
          },
          {
            id: "extra_equip",
            name: "奇物扩容",
            description: "可额外装备一件道具",
            cost: 3,
            color: "#E6B800",
            tier: 3,
            col: 4.8,
            prerequisites: [{ id: "card_draw_mana", minLevel: 2 }, { id: "round_end_random_cd", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            levelDescriptions: ["解锁额外${eff.extraSlot}个道具装备栏位"],
            effect: { "extraSlot": 1 },
          },
          {
            id: "hp_cost_atk_up",
            name: "燃血",
            description: "行动时，受到自身${eff.selfHurtPct}%当前生命值伤害，攻击力提升${eff.atkBuffPct}%，该伤害视为受到攻击",
            cost: 3,
            color: "#67C23A",
            tier: 3,
            col: 2.8,
            prerequisites: [{ id: "hurt_atk_stack", minLevel: 3 }],
            maxLevel: 1,
            levelCost: 3,
            levelDescriptions: ["行动时，受到自身${eff.selfHurtPct}%当前生命值伤害，攻击力提升${eff.atkBuffPct}%，该伤害视为受到攻击"],
            effect: { "selfHurtPct": 0.06, "atkBuffPct": 0.12 },
          },
          {
            id: "death_mark_stack",
            name: "夺命烙印",
            description: "对敌人造成的物理及无属性伤害的15%会记录留存（元素伤害不计入），敌人生命值低于记录值时即刻秒杀，记录数值${eff.transferPct}%转移给随机敌方单位",
            cost: 3,
            color: "#7E22CE",
            tier: 4,
            col: 8.8,
            prerequisites: [{ id: "kill_spread_damage", minLevel: 1 }, { id: "battle_start_attack_buff", minLevel: 1 }, { id: "kill_recover_mana", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [{"key":"strength","value":75}],
            levelDescriptions: ["对敌人造成的物理及无属性伤害的15%会记录留存（魔法、元素伤害不计入），敌人生命值低于记录值时即刻秒杀，记录数值${eff.transferPct}%转移给随机敌方单位"],
            effect: { "transferPct": 0.5 },
          },
          {
            id: "thorn_defense",
            name: "尖刺防御",
            description: "受到任意伤害后，随机对一名敌人造成${eff.baseRate}%（护甲+魔抗）的无属性伤害（吃护甲减伤），每次触发额外提升${eff.perStackRate}%护甲与魔抗收益，战斗结束重置",
            cost: 3,
            color: "#5B9BD5",
            tier: 4,
            col: 16,
            prerequisites: [{ id: "start_battle_armor_buff", minLevel: 2 }, { id: "no_attack_armor_up", minLevel: 3 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [],
            levelDescriptions: ["受到任意伤害后，随机对一名敌人造成${eff.baseRate}%（护甲+魔抗）的无属性伤害（吃护甲减伤），每次触发额外提升${eff.perStackRate}%护甲与魔抗收益，战斗结束重置"],
            effect: { "baseRate": 0.2, "perStackRate": 0.025, "maxRate": 1 },
          },
          {
            id: "luck_god_chosen",
            name: "天选之子",
            description: "自身造成伤害有${eff.prob}%概率提升${eff.mult}%，受到攻击有${eff.dmgProb}%概率减免${eff.dmgReduce}%伤害（未触发时每次概率+${eff.incProb}%，触发后重置）",
            cost: 3,
            color: "#FFD700",
            tier: 4,
            col: 13.59,
            prerequisites: [{ id: "luck_mana_restore", minLevel: 1 }, { id: "enemy_luck_dmg", minLevel: 5 }, { id: "luck_action_rush", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [{"key":"luck","value":80}],
            levelDescriptions: ["自身造成伤害有${eff.prob}%概率提升${eff.mult}%，受到攻击有${eff.dmgProb}%概率减免${eff.dmgReduce}%伤害（未触发时每次概率+${eff.incProb}%，触发后重置）"],
            effect: { "prob": 0.2, "mult": 0.5, "dmgProb": 0.2, "dmgReduce": 0.5, "incProb": 0.02 },
          },
          {
            id: "hit_count_shield",
            name: "承压御守",
            description: "累计受到8次攻击后，获得10%最大生命值护盾",
            cost: 3,
            color: "#5B9BD5",
            tier: 4,
            col: 6.4,
            prerequisites: [{ id: "low_hp_shield", minLevel: 1 }, { id: "shield_damage_up", minLevel: 3 }, { id: "shield_absorb", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["累计承受8次攻击，获得${eff.hits}%最大生命值护盾"],
            effect: { "hits": 8, "shieldPct": 0.08 },
          },
          {
            id: "low_hp_battle_buff",
            name: "向死而生",
            description: "生命值低于${eff.hpRate}%时，自身造成最终伤害+${eff.dmgBonus}%，受到伤害-${eff.takenReduce}%，触发后全程持续至战斗结束",
            cost: 3,
            color: "#67C23A",
            tier: 4,
            col: 2.77,
            prerequisites: [{ id: "hp_cost_atk_up", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [],
            levelDescriptions: ["残血绝境增伤减伤，整场战斗持续生效"],
            effect: { "hpRate": 0.35, "dmgBonus": 0.5, "takenReduce": 0.3 },
          },
          {
            id: "mana_missile",
            name: "魔力飞弹",
            description: "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力的魔法伤害",
            cost: 1,
            color: "#409EFF",
            tier: 4,
            col: 0.8,
            prerequisites: [{ id: "mana_cd_reduce", minLevel: 1 }, { id: "mana_regen", minLevel: 1 }],
            maxLevel: 10,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害", "每消耗1点魔力，随机对一名敌人造成${eff.dmgBase}%攻击力伤害"],
            effect: { "dmgBase": 0.2, "dmgPerLv": 0.025 },
          },
          {
            id: "card_heal_regen",
            name: "灵能愈合",
            description: "每打出一张手牌，恢复自身${eff.healPct}%最大生命值",
            cost: 3,
            color: "#67C23A",
            tier: 4,
            col: 3.6,
            prerequisites: [{ id: "low_hp_emergency_heal", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            levelDescriptions: ["每打出一张手牌，恢复自身${eff.healPct}%最大生命值"],
            effect: { "healPct": 0.015 },
          },
          {
            id: "continuous_strike",
            name: "瞬连突袭",
            description: "连续行动时，攻击力提升${eff.atkPct}%持续至回合结束并且本回合第一张卡牌无消耗",
            cost: 4,
            color: "#5cc0ff",
            tier: 4,
            col: 11.2,
            prerequisites: [{ id: "attack_round_start_up", minLevel: 5 }, { id: "swift_rush", minLevel: 3 }, { id: "turn_end_speed", minLevel: 3 }],
            maxLevel: 1,
            levelCost: 4,
            attrReq: [{"key":"speed","value":175}],
            levelDescriptions: ["连续行动时，攻击力提升${eff.atkPct}%持续至回合结束并且本回合第一张卡牌无消耗"],
            effect: { "atkPct": 0.4 },
          },
          {
            id: "charm_affinity",
            name: "亲和",
            description: "魅力+${eff.flatCharm + eff.flatCharmPerLv * (level - 1)}（每级+${eff.flatCharmPerLv}）",
            cost: 1,
            color: "#F48FB1",
            tier: 1,
            col: 22.8,
            prerequisites: [],
            maxLevel: 5,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["魅力+${eff.flatCharm + eff.flatCharmPerLv * (level - 1)}", "魅力+${eff.flatCharm + eff.flatCharmPerLv * (level - 1)}", "魅力+${eff.flatCharm + eff.flatCharmPerLv * (level - 1)}", "魅力+${eff.flatCharm + eff.flatCharmPerLv * (level - 1)}", "魅力+${eff.flatCharm + eff.flatCharmPerLv * (level - 1)}"],
            effect: { "flatCharm": 1, "flatCharmPerLv": 1 },
          },
          {
            id: "charm_pity",
            name: "怜惜",
            description: "怪物追击你时，移动速度降低${eff.slowSpeed}%；进入战斗时，敌人的攻击力降低${eff.attackReducePct}%",
            cost: 2,
            color: "#F48FB1",
            tier: 2,
            col: 21.88,
            prerequisites: [{ id: "charm_affinity", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            levelDescriptions: ["怪物追击你时，移动速度降低${eff.slowSpeed}%；进入战斗时，敌人的攻击力降低${eff.attackReducePct}%"],
            effect: { "slowSpeed": 20, "attackReducePct": 20 },
          },
          {
            id: "forest_messenger",
            name: "天眷",
            description: "遭遇恶劣天气的概率降低${eff.reducePct}%",
            cost: 2,
            color: "#F48FB1",
            tier: 2,
            col: 22.77,
            prerequisites: [{ id: "charm_affinity", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            levelDescriptions: ["遭遇恶劣天气的概率降低${eff.reducePct}%"],
            effect: { "reducePct": 20 },
          },
          {
            id: "charm_freeze",
            name: "犹怜",
            description: "进入战斗后，直到你开始回合前，敌人都不会获得行动条；敌人获取行动条速率降低${eff.actionBarReducePct}%",
            cost: 2,
            color: "#F48FB1",
            tier: 2,
            col: 23.62,
            prerequisites: [{ id: "charm_affinity", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["进入战斗后，直到你开始回合前，敌人都不会获得行动条；敌人获取行动条速率降低${eff.actionBarReducePct}%"],
            effect: { "actionBarReducePct": 25 },
          },
          {
            id: "kind_favor",
            name: "优待",
            description: "出售物品时售价提高${eff.sellPct}%；购买商品时价格降低${eff.buyPct}%；战斗中，敌人第一次行动不会出手",
            cost: 3,
            color: "#F48FB1",
            tier: 3,
            col: 22.18,
            prerequisites: [{ id: "charm_pity", minLevel: 1 }, { id: "forest_messenger", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["出售物品时售价提高${eff.sellPct}%；购买商品时价格降低${eff.buyPct}%；战斗中，敌人第一次行动不会出手（跳过第一回合）"],
            effect: { "sellPct": 20, "buyPct": 20 },
          },
          {
            id: "heart_to_heart",
            name: "交心",
            description: "你的召唤物以及同伴全属性增加${eff.attrPct}%",
            cost: 2,
            color: "#F48FB1",
            tier: 3,
            col: 23.34,
            prerequisites: [{ id: "charm_freeze", minLevel: 1 }, { id: "forest_messenger", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [],
            levelDescriptions: ["你的召唤物以及同伴全属性增加${eff.attrPct}%"],
            effect: { "attrPct": 30 },
          },
          {
            id: "favor_charm",
            name: "偏爱",
            description: "你的召唤物行动时会提升召唤物自身${eff.attrPct}%的全属性。",
            cost: 2,
            color: "#F48FB1",
            tier: 4,
            col: 22.79,
            prerequisites: [{ id: "heart_to_heart", minLevel: 1 }, { id: "kind_favor", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 1,
            attrReq: [{"key":"charm","value":20}],
            levelDescriptions: ["你的召唤物行动时会提升召唤物自身${eff.attrPct}%的全属性。"],
            effect: { "attrPct": 8 },
          },
          {
            id: "tong_xin",
            name: "同心",
            description: "你的所有召唤物持续时间延长${eff.summonDurExt}回合；每打出${eff.summonCardNeed}张召唤物牌获得${eff.summonCardMp}点灵力",
            cost: 2,
            color: "#F48FB1",
            tier: 4,
            col: 21.6,
            prerequisites: [{ id: "kind_favor", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 2,
            attrReq: [],
            levelDescriptions: ["你的所有召唤物持续时间延长${eff.summonDurExt}回合；每打出${eff.summonCardNeed}张召唤物牌获得${eff.summonCardMp}点灵力（累积，战斗开始时重置）"],
            effect: { "summonDurExt": 1, "summonCardNeed": 3, "summonCardMp": 2 },
          },
          {
            id: "leader_skill",
            name: "首领",
            description: "你的所有召唤物以及同伴属性额外提升${eff.attrPct}%；场上每存在一个召唤物或同伴，你的全属性提升${eff.perSummonPct}%",
            cost: 3,
            color: "#FFD700",
            tier: 4,
            col: 24.15,
            prerequisites: [{ id: "heart_to_heart", minLevel: 1 }],
            maxLevel: 1,
            levelCost: 3,
            attrReq: [],
            levelDescriptions: ["你的所有召唤物以及同伴属性额外提升${eff.attrPct}%；场上每存在一个召唤物或同伴，你的全属性提升${eff.perSummonPct}%"],
            effect: { "attrPct": 30, "perSummonPct": 5 },
          },
        ];
// 🎨 天赋描述模板渲染（${eff.key} 占位符，按等级取效果值，供 getTalentLevelDescription 使用）
const __T_EFF_LV_PAIR = { basePct: 'perLvPct', baseProb: 'probPerLv', baseRate: 'perLvRate', baseProgress: 'perLvProgress', thresholdBase: 'thresholdPerLv', dmgBase: 'dmgPerLv', baseLuck: 'perLvLuck', baseMp: 'mpPerLv', needCards: 'perLvCards' , atkPerMana: 'atkPerManaPerLv', extraCards: 'extraCardsPerLv', dmgBonus: 'dmgBonusPerLv', expMult: 'expMultPerLv', reactBonus: 'reactBonusPerLv', eleBonus: 'eleBonusPerLv' }
const __T_EFF_PCT100 = new Set(['atkPct', 'atkBuffPct', 'dmgBonus', 'takenReduce', 'dropMult', 'vulnPct', 'healPct', 'shieldPct', 'hpRate', 'selfHurtPct', 'transferPct', 'perLv', 'perLvPct', 'baseProb', 'probPerLv', 'perStackRate', 'incProb', 'maxRate', 'thresholdBase', 'thresholdPerLv', 'dmgBase', 'dmgPerLv', 'baseRate', 'perLvRate', 'atkPerMana', 'atkPerManaPerLv', 'dmgBonusPerLv', 'expMult', 'expMultPerLv', 'reactBonus', 'reactBonusPerLv', 'prob', 'mult', 'dmgProb', 'dmgReduce', 'eleBonus', 'eleBonusPerLv'])
const __T_EFF_AUTO100 = new Set(['basePct'])
const __T_EFF_DIV10 = new Set(['baseProgress', 'perLvProgress'])
const __T_EFF_DIV100 = new Set(['actionPerLv'])
function __tEffValAt(t, k, lv) {
  const e = (t && t.effect) || {}
  if (e[k] === undefined || e[k] === null) return ''
  const p = __T_EFF_LV_PAIR[k]
  if (p && e[p] !== undefined) return Number(e[k]) + Number(e[p]) * Math.max(0, (lv || 1) - 1)
  if (k === 'perLv' || (typeof k === 'string' && k.endsWith('PerLv'))) return Number(e[k]) * Math.max(1, lv || 1)
  return e[k]
}
function __tFmtEffVal(k, v) {
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (__T_EFF_PCT100.has(k)) return String(Math.round(n * 10000) / 100)
  // basePct 混合格式：≤1 为小数（0.02→2%），>1 为整数百分数（6→6%）
  if (__T_EFF_AUTO100.has(k)) return String(n <= 1 ? Math.round(n * 10000) / 100 : n)
  if (__T_EFF_DIV10.has(k)) return String(Math.round(n * 1000) / 1000 / 10)
  if (__T_EFF_DIV100.has(k)) return String(Math.round(n * 10000) / 10000 / 100)
  return String(Math.round(n * 100) / 100)
}
function __fmtTalentText(text, t, lv) {
  if (!text || !t) return text || ''
  return String(text).replace(/\$\{eff\.([a-zA-Z_][a-zA-Z0-9_.\s+*()\-]*)\}/g, (m, k) => {
    const eff = (t && t.effect) || {}
    // 模式1c：${eff.base + eff.perLv * level}（原始值直显，模板自带单位）
    const mulLevelM = k.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\+\s*(?:eff\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\*\s*level$/)
    if (mulLevelM) {
      const v1 = eff[mulLevelM[1]]
      const v2 = eff[mulLevelM[2]]
      if (v1 === undefined || v2 === undefined) return m
      return String(Math.round((Number(v1) + Number(v2) * (lv || 1)) * 100) / 100)
    }
    // 模式1：${eff.base + eff.perLv * (level - 1)}（该级实际值）
    const addM = k.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\+\s*(?:eff\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\*\s*\(\s*level\s*-\s*1\s*\)$/)
    if (addM) {
      const v1 = eff[addM[1]]
      const v2 = eff[addM[2]]
      if (v1 === undefined || v2 === undefined) return m
      const raw1 = Number(v1)
      const f1 = Number(__tFmtEffVal(addM[1], v1))
      // 同格式缩放：base 被 ×100（小数），perLv 同步 ×100；base 原样（整数），perLv 原样
      const scale = (raw1 !== 0 && f1 !== raw1) ? (f1 / raw1) : 1
      return String(Math.round((f1 + Number(v2) * scale * ((lv || 1) - 1)) * 100) / 100)
    }
    // 模式2：${eff.key} / ${eff.key * level}
    const mulLv = /\*\s*level$/.test(k)
    const key = k.replace(/\s*\*\s*level$/, '')
    const v = __tEffValAt(t, key, lv)
    if (v === '' || v === null || v === undefined) return m
    let out
    if (Array.isArray(v)) {
      const idx = Math.min(Math.max(0, (lv || 1) - 1), v.length - 1)
      out = String(Math.round(Number(v[idx]) * 10000) / 100)
    } else if (v && typeof v === 'object') {
      const lvKey = String(lv || 1)
      const val = v[lvKey] !== undefined ? v[lvKey] : v[lv]
      out = val === undefined ? m : String(Math.round(Number(val) * 10000) / 100)
    } else if (typeof v === 'string' && v.includes(',')) {
      const arr = v.split(',')
      const idx = Math.min(Math.max(0, (lv || 1) - 1), arr.length - 1)
      out = String(Math.round(Number(arr[idx]) * 10000) / 100)
    } else {
      out = __tFmtEffVal(key, v)
    }
    if (mulLv && out !== m) {
      const num = Number(out)
      out = String(Math.round(num * (lv || 1) * 100) / 100)
    }
    return out
  })
}

        // 🎯 捕获默认天赋配置快照（读档时用最新默认覆盖，保证新增/删除/调整数值自动生效）
        setDEFAULT_TALENT_CONFIG(JSON.parse(JSON.stringify(DEFAULT_TALENT_CONFIG_SNAPSHOT)));
        return DEFAULT_TALENT_CONFIG_SNAPSHOT;
      })()
    }
  },
  getters: {
  },
  actions: {
    // 屏幕特效
    addMessage(name, content) {
      const lastMsg = this.messages[0]
      // 如果最后一条内容与当前相同，不添加
      if (lastMsg && lastMsg.content === content) {
        return
      }
      this.messages.unshift({ name, content })

      // 最多保留 30 条
      if (this.messages.length > 30) {
        this.messages.pop()
      }
    },
    // 存放物品
    addItemToInventory(newItem) {
      if (!newItem.num) {
        return; // 不做任何操作
      }
      const def = ITEM_DEFS[newItem.name] || {};
      const existing = this.inventory.find(item => item.name === newItem.name)
      if (existing) {
        existing.num += newItem.num
        // 🔄 补全已存在物品缺失的定义字段（shiyong/special/img/color/miaoshu 等）
        for (const k in def) {
          if (existing[k] === undefined || existing[k] === null) existing[k] = def[k];
        }
        // 🎯 效果规则字段始终以 ITEM_DEFS 最新配置为准（dladmin 改效果数值后旧背包物品同步生效）
        for (const k of ['Hp', 'moli', 'effectValue', 'maxUses', 'maxTotal', 'special', 'buffs', 'eatExp', 'feedExp']) {
          if (def[k] !== undefined && def[k] !== null) existing[k] = def[k];
        }
      } else {
        // 🧩 defs 兜底补全缺失字段（显式传入字段优先）
        const merged = { ...newItem }
        for (const k in def) {
          if (merged[k] === undefined || merged[k] === null) merged[k] = def[k];
        }
        // 🎯 效果规则字段以 ITEM_DEFS 为准（防止合成/炼制/掉落产出携带旧写死数值）
        for (const k of ['Hp', 'moli', 'effectValue', 'maxUses', 'maxTotal', 'special', 'buffs', 'eatExp', 'feedExp']) {
          if (def[k] !== undefined && def[k] !== null) merged[k] = def[k];
        }
        this.inventory.push(merged)
      }
    },
    /**
     * 🆕 合成系统：消耗材料制作物品（支持批量）
     * @param {Object} recipe - 配方 { id, name, materials: [{name,num,img}], output: {...} }
     * @param {number} count - 制作数量
     * @returns {{ok:boolean, msg?:string}}
     */
    craftItem(recipe, count = 1) {
      if (!recipe || !Array.isArray(recipe.materials) || count <= 0) {
        return { ok: false, msg: '配方无效' }
      }
      // 1. 检查材料是否足够
      for (const mat of recipe.materials) {
        const inv = this.inventory.find(i => i.name === mat.name)
        if (!inv || inv.num < mat.num * count) {
          return { ok: false, msg: `材料「${mat.name}」不足` }
        }
      }
      // 2. 消耗材料
      for (const mat of recipe.materials) {
        const inv = this.inventory.find(i => i.name === mat.name)
        inv.num -= mat.num * count
        if (inv.num <= 0) {
          const idx = this.inventory.indexOf(inv)
          if (idx > -1) this.inventory.splice(idx, 1)
        }
      }
      // 3. 产出物品
      const out = recipe.output
      const totalNum = (out.num || 1) * count
      this.addItemToInventory({ ...out, num: totalNum })
      return { ok: true }
    },
    // ========================
    // ⚗️ 炼制系统
    // ========================
    /**
     * 获取所有合成工坊图纸（供合成工坊界面使用）
     * 配置来自模块级常量 CRAFT_RECIPES，天然始终是最新（读档自动生效）
     * @returns {Array}
     */
    getCraftRecipes() {
      return CRAFT_RECIPES;
    },
    /**
     * 🔄 同步合成工坊图纸（每次读档/新游戏时调用，与炼制图鉴同一套机制）
     * 图纸配置来自模块级常量 CRAFT_RECIPES（天然始终是最新的），
     * 这里保持接口一致性，后续如需给合成图纸加解锁/进度等持久化状态，在此统一校验。
     * @returns {Array}
     */
    refreshCraftRecipes() {
      return CRAFT_RECIPES;
    },
    /**
     * 获取所有炼制配方（供炼制界面使用）
     * @returns {Array}
     */
    getLianzhiRecipes() {
      return LIANZHI_RECIPES;
    },
    /**
     * 获取指定配方（按 id）
     * @param {string} recipeId
     * @returns {Object|null}
     */
    getLianzhiRecipeById(recipeId) {
      return LIANZHI_RECIPES.find(r => r.id === recipeId) || null;
    },
    /**
     * 检查配方是否已解锁
     * @param {string} recipeId
     * @returns {boolean}
     */
    isLianzhiRecipeUnlocked(recipeId) {
      return (this.pixi.lianzhiRecipes || []).includes(recipeId);
    },
    /**
     * 解锁配方（首次炼制成功时调用）
     * @param {string} recipeId
     */
    unlockLianzhiRecipe(recipeId) {
      if (!this.pixi.lianzhiRecipes) this.pixi.lianzhiRecipes = [];
      if (!this.pixi.lianzhiRecipes.includes(recipeId)) {
        this.pixi.lianzhiRecipes.push(recipeId);
      }
    },
    /**
     * 🔄 同步炼制图鉴（每次读档/新游戏时调用）
     * 后续在 LIANZHI_RECIPES 里新增/删除/修改配方时，读档自动生效：
     *   - 图鉴配置本身来自模块级常量 LIANZHI_RECIPES（天然始终是最新的）
     *   - 这里只需校验已解锁的配方 ID：把「最新图鉴中已不存在」的 ID 从解锁记录里清理掉
     *     （防止旧配方被删除/改了 id 后，解锁记录里残留无意义 ID）
     */
    refreshLianzhiRecipes() {
      if (!this.pixi.lianzhiRecipes) this.pixi.lianzhiRecipes = [];
      const validIds = new Set(LIANZHI_RECIPES.map(r => r.id));
      this.pixi.lianzhiRecipes = this.pixi.lianzhiRecipes.filter(id => validIds.has(id));
      return this.pixi.lianzhiRecipes;
    },
    /**
     * 🔥 尝试炼制：根据放入大锅的 4 种材料匹配配方
     * @param {string[]} materialNames - 放入大锅的材料名数组（最多 4 个）
     * @returns {{ok:boolean, msg?:string, recipe?:Object, unlocked?:boolean}}
     *  - 匹配成功：消耗材料 + 产出物品 + （首次）解锁配方
     *  - 匹配失败：材料消失（炼制失败）
     */
    tryLianzhi(materialNames) {
      // 1. 参数校验
      if (!Array.isArray(materialNames) || materialNames.length === 0) {
        return { ok: false, msg: '请先放入材料' };
      }
      const names = materialNames.slice(0, 4); // 最多 4 种
      if (names.length < 1) {
        return { ok: false, msg: '请先放入材料' };
      }

      // 2. 检查背包中这些材料是否足够（每种至少 1 个）
      for (const n of names) {
        const inv = this.inventory.find(ix => ix.name === n);
        if (!inv || inv.num < 1) {
          return { ok: false, msg: '材料「' + n + '」不足' };
        }
      }

      // 3. 匹配配方：把放入的材料排序后与配方材料排序比对
      const sortKey = (arr) => [...arr].sort().join('|');
      const inputKey = sortKey(names);
      const recipe = LIANZHI_RECIPES.find(r => {
        const matNames = r.materials.map(m => m.name);
        if (matNames.length !== names.length) return false;
        return sortKey(matNames) === inputKey;
      });

      // 4. 无论成功失败，先消耗材料（失败则材料消失）
      for (const n of names) {
        const inv = this.inventory.find(ix => ix.name === n);
        if (inv) {
          inv.num -= 1;
          if (inv.num <= 0) {
            const idx = this.inventory.indexOf(inv);
            if (idx > -1) this.inventory.splice(idx, 1);
          }
        }
      }

      // 5. 未匹配配方：材料消失
      if (!recipe) {
        return { ok: false, msg: '炼制失败，材料化为灰烬……', failed: true };
      }

      // 6. 实际失败率 = 基础失败率 - 炼制等级减免（等级越高越难失败）；🍀 幸运提升炼制成功率
      const baseFail = recipe.failRate || 0;
      const failRate = Math.max(0, 1 - this.luckProb(1 - (baseFail - this.getLianzhiFailReduction())));
      if (Math.random() < failRate) {
        return { ok: false, msg: '炼制失败，材料化为灰烬……（当前失败率 ' + Math.round(failRate * 100) + '%）', failed: true };
      }

      // 7. 按概率 roll 产出（多结果配方；单结果走 results[0]）
      const results = recipe.results || [{ chance: 1, output: recipe.output }];
      let rr = Math.random();
      let acc = 0;
      let out = results[results.length - 1].output;
      for (const res of results) {
        acc += (res.chance || 0);
        if (rr < acc) { out = res.output; break; }
      }
      this.addItemToInventory({ ...out, num: out.num || 1 });

      // 8. 熟练度提升（仅成功时；不同配方提升不同熟练度）+ 首次解锁
      this.addLianzhiProficiency(recipe.id, recipe.proficiencyGain || 10);

      let unlocked = false;
      if (!this.isLianzhiRecipeUnlocked(recipe.id)) {
        this.unlockLianzhiRecipe(recipe.id);
        unlocked = true;
      }

      return { ok: true, recipe, unlocked, outName: out.name, msg: '炼制成功！获得「' + out.name + '」×' + (out.num || 1) };
    },
    // ⚗️ 获取当前炼制等级
    getLianzhiLevel() {
      return this.pixi?.lianzhiLevel || 1;
    },
    // ⚗️ 获取某配方累计熟练度
    getRecipeProficiency(recipeId) {
      return this.pixi?.lianzhiProficiency?.[recipeId] || 0;
    },
    // ⚗️ 获取全部炼制熟练度总和（跨配方累加，每 100 点升 1 级）
    getTotalLianzhiProficiency() {
      const p = this.pixi?.lianzhiProficiency || {};
      return Object.values(p).reduce((a, b) => a + (b || 0), 0);
    },
    // ⚗️ 炼制等级带来的失败率减免（每级 -2%，上限 -20%）
        getLianzhiFailReduction() {
      const lv = this.getLianzhiLevel();
      const c = LIANZHI_LEVEL_CFG || {};
      // 等级表模式：查本级减免
      if (Array.isArray(c.levels) && c.levels.length) {
        const lvCfg = c.levels[lv - 2];
        return lvCfg ? (lvCfg.reduce ?? 0) : (c.maxFailReduction ?? 0);
      }
      // 旧格式兜底
      return Math.min(c.maxFailReduction ?? 0.2, (lv - 1) * (c.failReductionPerLevel ?? 0.02));
    },
    // ⚗️ 由累计熟练度计算应达等级（每 100 点熟练度升 1 级）
        getLianzhiLevelFromProficiency() {
      const p = this.pixi?.lianzhiProficiency || {};
      const total = Object.values(p).reduce((a, b) => a + (b || 0), 0);
      const c = LIANZHI_LEVEL_CFG || {};
      // 等级表模式：逐级扣减所需熟练度
      if (Array.isArray(c.levels) && c.levels.length) {
        let lv = 1, remain = total;
        for (const l of c.levels) {
          if (remain >= (l.need || 0)) { remain -= l.need; lv++; } else break;
        }
        return Math.min(lv, c.maxLevel || 99);
      }
      // 旧格式兜底：固定每级
      return 1 + Math.floor(total / (c.proficiencyPerLevel || 100));
    },
    // ⚗️ 增加配方熟练度（炼制成功时调用），并检测炼制等级提升
        addLianzhiProficiency(recipeId, gain) {
      if (!recipeId || !gain) return;
      if (!this.pixi.lianzhiProficiency) this.pixi.lianzhiProficiency = {};
      const c = LIANZHI_LEVEL_CFG || {};
      const maxLv = c.maxLevel || 99;
      // 已达最大等级：熟练度溢出丢弃（不再累积）
      if (this.getLianzhiLevel() >= maxLv) return;
      this.pixi.lianzhiProficiency[recipeId] = (this.pixi.lianzhiProficiency[recipeId] || 0) + gain;
      const newLv = this.getLianzhiLevelFromProficiency();
      // 升到满级时：截断超出满级所需的熟练度（溢出丢弃）
      if (newLv >= maxLv && Array.isArray(c.levels) && c.levels.length) {
        const needTotal = c.levels.reduce((a, l) => a + (l.need || 0), 0);
        let total = Object.values(this.pixi.lianzhiProficiency).reduce((a, b) => a + (b || 0), 0);
        let over = total - needTotal;
        if (over > 0) {
          for (const k of Object.keys(this.pixi.lianzhiProficiency)) {
            if (over <= 0) break;
            const cur = this.pixi.lianzhiProficiency[k] || 0;
            const cut = Math.min(cur, over);
            this.pixi.lianzhiProficiency[k] = cur - cut;
            over -= cut;
          }
        }
      }
      const oldLv = this.getLianzhiLevel();
      if (newLv > oldLv) {
        this.pixi.lianzhiLevel = newLv;
        if (typeof ElMessText === 'function') {
          ElMessText('🎉 炼制等级提升至 Lv.' + newLv + '！炼制失败率降低，更易炼制成功。', 'success');
        }
      }
    },
    // ============ 🎖 卡牌熟练度 ============
    // 🎖 出牌积累熟练度：exp+1，达到阈值（base×2^level）自动升级，返回升级后的等级（未升级返回 null）
    gainCardMastery(cardName) {
      if (!cardName) return null;
      if (!this.pixi.cardMastery) this.pixi.cardMastery = {};
      const rec = this.pixi.cardMastery[cardName] || { exp: 0, level: 0 };
      rec.exp += 1;
      // 配置了 mastery 的卡才升级变强；未配置只累计熟练度
      const cfg = (DEFAULT_CARD_DATA[cardName] || {}).mastery;
      if (cfg && cfg.base > 0) {
        let upgraded = false;
        while (rec.exp >= cfg.base * Math.pow(2, rec.level)) {
          rec.level += 1;
          upgraded = true;
        }
        this.pixi.cardMastery[cardName] = rec;
        return upgraded ? rec.level : null;
      }
      this.pixi.cardMastery[cardName] = rec;
      return null;
    },
    // 🎖 获取卡牌熟练度记录 { exp, level }（无记录返回 { exp:0, level:0 }）
    getCardMastery(cardName) {
      if (!cardName) return { exp: 0, level: 0 };
      return { ...(this.pixi?.cardMastery?.[cardName] || { exp: 0, level: 0 }) };
    },
    // 🎖 获取卡牌熟练度等级（伤害结算用）
    getCardMasteryLevel(cardName) {
      return this.pixi?.cardMastery?.[cardName]?.level || 0;
    },
    // 🎖 获取下一级所需熟练度（无 mastery 配置返回 null）
    getCardMasteryNeed(cardName) {
      const cfg = (DEFAULT_CARD_DATA[cardName] || {}).mastery;
      if (!cfg || !cfg.base) return null;
      const lv = this.getCardMasteryLevel(cardName);
      return cfg.base * Math.pow(2, lv);
    },
    // 💊 特殊物品使用（永浆/灵剂/灵药/疾行药剂等）：返回 {ok,msg} 或 null（非特殊物品走默认逻辑）
    useSpecialPotion(item) {
      if (!item || !item.special) return null;
      const player = this.pixi.player;
      const juese = player.juese;
      const counters = player.potionUse = player.potionUse || {};
      const used = (n) => counters[n] || 0;
      const _cfg = ITEM_DEFS[item.name] || {};
      const _val = (k, d) => { const v = _cfg[k]; return v === undefined || v === null ? d : Number(v); };
      switch (item.special) {
        case 'dungeonSpeed': {
          const pct = _val('effectValue', 25);
          player.dungeonSpeedBuff = pct / 100;
          return { ok: true, msg: '疾行生效：本次地牢移动速度 +' + pct + '%' };
        }
        case 'permAttack': {
          const val = _val('effectValue', 2), max = _val('maxUses', 30), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限' };
          counters[key] = used(key) + 1;
          juese.baseAttack = (juese.baseAttack || 0) + val;
          if (juese.attack != null) juese.attack = juese.baseAttack;
          return { ok: true, msg: '焚力生效：永久攻击力 +' + val + '（累计 ' + counters[key] + '/' + max + '）' };
        }
        case 'permArmor': {
          const val = _val('effectValue', 1), max = _val('maxUses', 30), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限' };
          counters[key] = used(key) + 1;
          juese.baseArmor = (juese.baseArmor || 0) + val;
          if (juese.armor != null) juese.armor = juese.baseArmor;
          return { ok: true, msg: '幽铠生效：永久护甲 +' + val + '（累计 ' + counters[key] + '/' + max + '）' };
        }
        case 'permSpeed': {
          const val = _val('effectValue', 1), max = _val('maxUses', 30), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限' };
          counters[key] = used(key) + 1;
          juese.baseSpeed = (juese.baseSpeed || 0) + val;
          if (juese.speed != null) juese.speed = juese.baseSpeed;
          return { ok: true, msg: '迅霆生效：永久速度 +' + val + '（累计 ' + counters[key] + '/' + max + '）' };
        }
        case 'dungeonVision': {
          const vv = _val('effectValue', 1);
          player.dungeonVisionBuff = vv;
          return { ok: true, msg: '明目生效：本次地牢可见度 +' + vv + ' 格' };
        }
        case 'permCharm': {
          const val = _val('effectValue', 2), max = _val('maxUses', 3), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限' };
          counters[key] = used(key) + 1;
          juese.charm = (juese.charm || 0) + val;
          return { ok: true, msg: '芬芳生效：永久魅力 +' + val + '（累计 ' + counters[key] + '/' + max + '）' };
        }
        case 'talentPoint': {
          const val = _val('effectValue', 1), max = _val('maxUses', 3), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限' };
          counters[key] = used(key) + 1;
          player.talentPoints = (player.talentPoints || 0) + val;
          return { ok: true, msg: '启明生效：天赋点 +' + val + '（累计 ' + counters[key] + '/' + max + '）' };
        }
        case 'expGain': {
          const val = _val('effectValue', 3), max = _val('maxUses', 30), cap = _val('maxTotal', 90), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限（' + cap + '% 封顶）' };
          counters[key] = used(key) + 1;
          return { ok: true, msg: '盈悟生效：经验获取 +' + val + '%（累计 ' + Math.min(cap, counters[key] * val) + '%）' };
        }
        case 'permHp': {
          const val = _val('effectValue', 40), key = item.name;
          if (used(key)) return { ok: false, msg: key + ' 仅限使用 1 次' };
          counters[key] = 1;
          juese.baseMaxHp = (juese.baseMaxHp ?? juese.maxHp ?? 100) + val; // 🧱 永久生命加在基础生命上（maxHp 派生自动包含）
          juese.maxHp = computeUnitAttrs(juese).maxHp ?? juese.maxHp;
          juese.hp = (juese.hp || 0) + val;
          return { ok: true, msg: '生命灵药生效：最大生命值 +' + val };
        }
        case 'permMana': {
          const val = _val('effectValue', 1), max = _val('maxUses', 3), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限，无法再使用' };
          counters[key] = used(key) + 1;
          juese.maxMp = (juese.maxMp || 0) + val;
          return { ok: true, msg: '魔力灵药生效：最大魔力 +' + val + '（累计 ' + counters[key] + '/' + max + '）' };
        }
        case 'permAtkFlower': {
          const val = _val('effectValue', 1), max = _val('maxUses', 3), key = item.name;
          if (used(key) >= max) return { ok: false, msg: key + ' 已达 ' + max + ' 次上限，无法再食用' };
          counters[key] = used(key) + 1;
          juese.baseAttack = (juese.baseAttack || 0) + val;
          if (juese.attack != null) juese.attack = juese.baseAttack;
          return { ok: true, msg: '幽冥花蕊生效：永久攻击力 +' + val + '（累计 ' + counters[key] + '/' + max + '）' };
        }
                case 'lianzhiRecipe': {
          // 📜 配方图纸：使用解锁对应炼制配方；已解锁则无效果（物品照常消耗消失）
          const rid = item.recipeId;
          const recipe = LIANZHI_RECIPES.find(r => r.id === rid);
          if (!recipe) return { ok: true, warn: true, msg: '该配方图纸已失效，使用无效果' };
          if (this.isLianzhiRecipeUnlocked(rid)) {
            return { ok: true, warn: true, msg: '「' + recipe.name + '」配方已解锁，使用无效果' };
          }
          this.unlockLianzhiRecipe(rid);
          return { ok: true, msg: '🎉 解锁炼制配方「' + recipe.name + '」！已收录到炼制工坊' };
        }
        default:
          return null;
      }
    },
        // 📈 盈悟灵浆经验获取加成（读取 ITEM_DEFS 配置，默认 3%/次、上限 90%）
    getExpGainBonus() {
      const cfg = ITEM_DEFS['盈悟灵浆'] || {};
      const per = (Number(cfg.effectValue) || 3) / 100;
      const cap = (Number(cfg.maxTotal) || 90) / 100;
      const c = this.pixi?.player?.potionUse?.['盈悟灵浆'] || 0;
      return Math.min(cap, c * per);
    },
    // 📝 物品描述（动态）：魔晶按 FEEDABLE_ITEMS 实时生成"提升多少经验值"描述；
    //    修改 FEEDABLE_ITEMS 数值会全端同步（背包 / 喂食弹窗等）。其余物品返回原 miaoshu。
    getItemDesc(item) {
      if (!item) return '';
      // 💎 魔晶：经验值读 eatExp（玩家食用）/ feedExp（投喂同伴）字段，dladmin 可编辑
      if (/魔晶LV\d+/.test(item.name || '')) {
        const m = /魔晶LV(\d+)/.exec(item.name);
        const q = m ? m[1] : '?';
        const d = ITEM_DEFS[item.name] || (DEFAULT_inventory || []).find(x => x.name === item.name) || {};
        const eatExp = d.eatExp ?? FOOD_ITEMS[item.name] ?? '?';
        const feedExp = d.feedExp ?? FEEDABLE_ITEMS[item.name] ?? '?';
        return tr('品质 ' + q + ' 的红色魔晶。食用可提升 ' + eatExp + ' 点经验，投喂同伴可提升 ' + feedExp + ' 点经验，也可用于等级突破。');
      }
      // 📝 描述以配置（ITEM_DEFS / 初始背包）的最新 miaoshu 为准，物品实例字段兜底，旧存档物品也能显示最新文案
      const def = ITEM_DEFS[item.name] || (DEFAULT_inventory || []).find(x => x.name === item.name) || {};
      const tpl = def.miaoshu || item.miaoshu || '';
      if (!tpl.includes('${')) return tr(tpl);
      return tr(tpl.replace(/\$\{([\w.]+)\}/g, (match, key) => {
        const seg = key.split('.');
        // 1️⃣ 物品实例取值（含 buffs.xxx 等路径）
        let cur = item;
        for (const s of seg) { if (cur == null) break; cur = cur[s]; }
        let v = cur;
        // 2️⃣ 回退 ITEM_DEFS 权威配置（dladmin 编辑后的 buffs/fx 实时生效）
        if (v === undefined || v === null) {
          let d = ITEM_DEFS[item.name];
          for (const s of seg) { if (d == null) break; d = d[s]; }
          v = d;
        }
        return v === undefined || v === null ? match : String(v);
      }));
    },
    // 🍎 玩家食用经验（优先 ITEM_DEFS / 初始背包的 eatExp 字段，dladmin 可编辑；无则用 FOOD_ITEMS 兜底）
    getEatExp(itemName) {
      const d = ITEM_DEFS[itemName] || (DEFAULT_inventory || []).find(x => x.name === itemName);
      if (d && d.eatExp != null) return Number(d.eatExp);
      return FOOD_ITEMS[itemName] ?? 0;
    },
    // 💗 投喂同伴经验（优先 ITEM_DEFS / 初始背包的 feedExp 字段；无则用 FEEDABLE_ITEMS 兜底）
    getFeedExp(itemName) {
      const d = ITEM_DEFS[itemName] || (DEFAULT_inventory || []).find(x => x.name === itemName);
      if (d && d.feedExp != null) return Number(d.feedExp);
      return FEEDABLE_ITEMS[itemName] ?? 0;
    },
    // 📖 物品图鉴：返回全部物品定义（ITEM_DEFS + 初始背包），供图鉴页面展示
    getAllItemCatalog() {
      const map = {};
      for (const [name, def] of Object.entries(ITEM_DEFS)) {
        map[name] = { name, ...def };
      }
      for (const it of DEFAULT_inventory) {
        if (!it || !it.name) continue;
        map[it.name] = { name: it.name, ...(map[it.name] || {}), ...it };
      }
      return Object.values(map);
    },
    // 🧪 测试物资：读取游戏时把新材料/配方产物补足到 999（图片后补）
    grantTestMaterials() {
      const names = [
        '赤莓', '翠息草', '风萤果', '魔力灵液', '怒之晶石', '暗之晶石', '雷之晶石',
        '幽冥花蕊', '月露草', '忆尘晶', '暗之晶石',
        '恢复药剂', '疾行药剂', '焚力永浆', '幽铠永浆', '迅霆永浆',
        '启明灵剂', '盈悟灵浆', '生命灵药', '魔力灵药',
      ];
      const defs = ITEM_DEFS;
      for (const n of names) {
        const inv = this.inventory.find(ix => ix.name === n);
        if (inv) {
          if (inv.num < 999) inv.num = 999;
          if (!inv.img && defs[n]?.img) inv.img = defs[n].img; // 🔖 已存在物品补图（daojuall 皮肤名）
          const d = defs[n] || {};
          for (const k in d) {
            if (inv[k] === undefined || inv[k] === null) inv[k] = d[k]; // 🔄 补全缺失定义字段（shiyong/special/status 等）
          }
        } else {
          this.inventory.push({ name: n, num: 999, img: '', miaoshu: '（测试物资）', ...(defs[n] || {}) });
        }
      }
      // 💎 突破系统测试物资（魔晶 + 特殊材料）
      const btTest = {
        '突破神石': { status: 'material', color: '#fbbf24', bType: 'booster', bBoost: 0.15 },
        '幸运草': { status: 'material', color: '#67C23A', bType: 'booster', bBoost: 0.10 },
      };
      for (const n of Object.keys(btTest)) {
        const inv = this.inventory.find(ix => ix.name === n);
        if (inv) { if (inv.num < 999) inv.num = 999; }
        else this.inventory.push({ name: n, num: 999, img: '', miaoshu: '（测试物资）', ...(btTest[n] || {}) });
      }
    },
    // 🎨 道具显示颜色（拾取弹窗/提示等按道具配置上色；未配置返回空）
    getItemColor(name) {
      return (ITEM_DEFS[name] || {}).color || '';
    },
    // 🍬 给予 NPC 永久属性永浆（焚力/幽铠/迅霆永浆；与玩家使用共享全局上限）
    feedPermanentPotionToAlly(npcImg, itemName) {
      const cfg = this.pixi?.allyBattleData?.[npcImg];
      if (!cfg) return { ok: false, msg: '该同伴不存在' };
      const map = {
        '焚力永浆': { k: 'baseAttack', add: 2, limit: 30 },
        '幽铠永浆': { k: 'baseArmor', add: 1, limit: 30 },
        '迅霆永浆': { k: 'baseSpeed', add: 1, limit: 30 },
      };
      const def = map[itemName];
      if (!def) return { ok: false, msg: '「' + itemName + '」不能给予同伴使用' };
      const inv = this.inventory.find(i => i.name === itemName);
      if (!inv || inv.num <= 0) return { ok: false, msg: '没有「' + itemName + '」，无法给予' };
      // 与玩家使用共享同一全局上限计数器
      const counters = this.pixi.player.potionUse = this.pixi.player.potionUse || {};
      const used = counters[itemName] || 0;
      if (used >= def.limit) return { ok: false, msg: '「' + itemName + '」已达 ' + def.limit + ' 次上限' };
      counters[itemName] = used + 1;
      // 永久提升该同伴基础属性
      cfg[def.k] = (cfg[def.k] || 0) + def.add;
      if (cfg.attack != null) cfg.attack = cfg.baseAttack;
      if (cfg.armor != null) cfg.armor = cfg.baseArmor;
      if (cfg.speed != null) cfg.speed = cfg.baseSpeed;
      // 消耗 1 个
      inv.num--;
      if (inv.num <= 0) {
        const idx = this.inventory.indexOf(inv);
        if (idx > -1) this.inventory.splice(idx, 1);
      }
      // 💗 永浆按 FEED_AFFECTION_GAIN 配置加好感度（未配置默认 0 = 不加）
      this.addNpcAffection?.(npcImg, FEED_AFFECTION_GAIN[itemName] || 0)
      return { ok: true, msg: '给予「' + (cfg.name || npcImg) + '」' + itemName + '：永久属性 +' + def.add + '（累计 ' + counters[itemName] + '/' + def.limit + '）' };
    },
    // 添加卡牌到物品栏（按星级分条目：同一卡牌不同星级是独立格子）
    // 默认获得 1 星卡牌；如需指定星级传入 star
    addCardToInventory(cardName, count = 1, star = 1) {
      const cardData = this.pixi.player.CARD_DATA[cardName];
      if (!cardData) return;

      // 物品唯一键：name_star（同一卡牌不同星级分开）
      const key = `${cardName}_${star}`;
      const existing = this.inventory.find(item => item.isCard && item._cardKey === key);
      if (existing) {
        existing.num += count;
      } else {
        this.inventory.push({
          _cardKey: key,
          name: cardName,
          num: count,
          img: cardData.skin || cardName,
          miaoshu: cardData.desc || '',
          isCard: true,
          color: cardData.color,
          cost: Array.isArray(cardData.cost) ? (cardData.cost[star - 1] ?? cardData.cost[0] ?? 0) : (cardData.cost || 0),
          maxCooldown: Array.isArray(cardData.maxCooldown) ? (cardData.maxCooldown[star - 1] ?? cardData.maxCooldown[0] ?? 0) : (cardData.maxCooldown ?? 0),
          star: star,
          rarity: cardData.rarity || 'common',
        });
      }

      // 同步更新 CARD_DATA：拥有该卡牌的最高星级
      const highestStar = this.getHighestCardStar(cardName);
      cardData.star = highestStar;
      // 拥有总数量
      const total = this.getCardTotalCount(cardName);
      cardData.num = total;
    },
    // 获取某卡牌拥有的最高星级（按背包条目）
    getHighestCardStar(cardName) {
      const items = this.inventory.filter(item => item.isCard && item.name === cardName);
      if (!items.length) return 1;
      return Math.max(...items.map(i => i.star || 1));
    },
    // 获取某卡牌拥有总数量（各星级合计）
    getCardTotalCount(cardName) {
      return this.inventory
        .filter(item => item.isCard && item.name === cardName)
        .reduce((sum, i) => sum + (i.num || 0), 0);
    },
    // 获取某卡牌指定星级的数量
    getCardCountAtStar(cardName, star) {
      const item = this.inventory.find(i => i.isCard && i.name === cardName && i.star === star);
      return item ? item.num : 0;
    },
    // 消耗重复卡牌进化
    evolveCardWithItem(cardName, evoName) {
      const cardItem = this.inventory.find(item => item.name === cardName && item.isCard);
      const cardData = this.pixi.player.CARD_DATA[cardName];

      if (!cardItem || !cardData) return false;
      if (cardItem.num < 2) {
        ElMessText("需要至少2张相同卡牌才能进化", "warning");
        return false;
      }

      // 检查是否已经进化过
      if (!cardData.defaultEvos) {
        cardData.defaultEvos = [];
      }
      if (cardData.defaultEvos.includes(evoName)) {
        ElMessText("该词条已进化", "warning");
        return false;
      }

      // 检查是否是可进化的词条
      if (!cardData.evoOptions || !cardData.evoOptions.includes(evoName)) {
        ElMessText("无法进化该词条", "warning");
        return false;
      }

      // 消耗1张卡牌
      cardItem.num -= 1;
      if (cardItem.num <= 0) {
        const index = this.inventory.indexOf(cardItem);
        this.inventory.splice(index, 1);
      }

      // 添加进化
      cardData.defaultEvos.push(evoName);
      ElMessText(`进化成功：${evoName}`, "success");
      return true;
    },
    // 消耗指定数量卡牌进化（用于卡牌图鉴）
    evolveCardWithCount(cardName, evoName, count) {
      const cardItem = this.inventory.find(item => item.name === cardName && item.isCard);
      const cardData = this.pixi.player.CARD_DATA[cardName];

      if (!cardItem || !cardData) return false;

      // 至少保留1张基础卡牌
      if (cardItem.num - 1 < count) {
        ElMessText(`需要至少 ${count + 1} 张卡牌才能进化`, "warning");
        return false;
      }

      // 检查是否已经进化过
      if (!cardData.defaultEvos) {
        cardData.defaultEvos = [];
      }
      if (cardData.defaultEvos.includes(evoName)) {
        ElMessText("该词条已进化", "warning");
        return false;
      }

      // 检查是否是可进化的词条
      if (!cardData.evoOptions || !cardData.evoOptions.includes(evoName)) {
        ElMessText("无法进化该词条", "warning");
        return false;
      }

      // 最多进化4次
      if (cardData.defaultEvos.length >= 4) {
        ElMessText("已达到最大进化次数", "warning");
        return false;
      }

      // 消耗指定数量卡牌
      cardItem.num -= count;
      if (cardItem.num <= 0) {
        const index = this.inventory.indexOf(cardItem);
        this.inventory.splice(index, 1);
      }

      // 同步更新 CARD_DATA 中的 num
      if (cardData.num) {
        cardData.num -= count;
      }

      // 添加进化
      cardData.defaultEvos.push(evoName);
      ElMessText(`进化成功：${evoName}`, "success");
      return true;
    },
    // ========================
    // ⭐ 卡牌升星系统
    // ========================
    // 稀有度 → 分解碎片数 / 合成消耗碎片数
    getCardShardValue(rarity) {
      const map = { common: 1, excellent: 3, rare: 6, epic: 12, legendary: 24 };
      return map[rarity] || 1;
    },
    // 🪙 稀有度 → 分解金币默认值（指定卡牌 decomposeGold 字段可覆盖，dladmin 卡牌编辑可调）
    getCardGoldValue(rarity) {
      const map = { common: 5, excellent: 15, rare: 30, epic: 60, legendary: 120 };
      return map[rarity] || 5;
    },
    getCardCraftCost(rarity) {
      const map = { common: 8, excellent: 12, rare: 17 };
      return map[rarity] || null; // 稀有以上不能合成
    },
    // 升星：5张【同星级】同卡 → 1张升到下一星（1→2→3）
    // 消耗当前星级的 5 张（其中4张消失，1张升级）
    // star 参数：要升星的当前星级（不传则取玩家拥有的最高星级）
    starUpCard(cardName, star) {
      const cardData = this.pixi.player.CARD_DATA[cardName];
      if (!cardData) {
        ElMessText("卡牌不存在", "warning");
        return false;
      }

      // 当前要升星的星级 = 指定的星级 或 玩家拥有该卡牌的最高星级
      const currentStar = star || this.getHighestCardStar(cardName);
      if (currentStar >= 3) {
        ElMessText("已达到最高星级（3星）", "warning");
        return false;
      }

      // 查找当前星级的物品条目
      const cardItem = this.inventory.find(i => i.isCard && i.name === cardName && i.star === currentStar);
      if (!cardItem || cardItem.num < 5) {
        ElMessText(`升星需要 5 张 ${currentStar} 星 ${cardName} 卡牌（当前 ${cardItem?.num || 0} 张）`, "warning");
        return false;
      }

      // 消耗 5 张当前星级（全部消耗，升到下一星 1 张）
      cardItem.num -= 5;
      if (cardItem.num <= 0) {
        const index = this.inventory.indexOf(cardItem);
        this.inventory.splice(index, 1);
      }

      // 目标星级加1张
      const nextStar = currentStar + 1;
      this.addCardToInventory(cardName, 1, nextStar);

      // 同步 CARD_DATA 最高星级和总数量
      cardData.star = this.getHighestCardStar(cardName);
      cardData.num = this.getCardTotalCount(cardName);

      ElMessText(`升星成功！${cardName} 升到 ${nextStar} 星`, "success");
      return true;
    },
    // 分解卡牌：获得稀有度 + 星级加成碎片数
    // 星级加成：1星×1，2星×2.5，3星×6（向下取整）
    decomposeCard(cardName, count = 1, star) {
      // 未指定星级时，分解该卡牌最低星级的条目（从1星开始找）
      let targetStar = star;
      if (targetStar == null) {
        const minStar = this.inventory
          .filter(i => i.isCard && i.name === cardName)
          .reduce((min, i) => Math.min(min, i.star || 1), 3);
        targetStar = minStar;
      }
      const cardItem = this.inventory.find(i => i.isCard && i.name === cardName && i.star === targetStar);
      const cardData = this.pixi.player.CARD_DATA[cardName];
      if (!cardItem || !cardData) {
        ElMessText("卡牌不存在", "warning");
        return false;
      }
      if (cardItem.num < count) {
        ElMessText("卡牌数量不足", "warning");
        return false;
      }

      // 🪙 分解金币：优先指定卡牌 decomposeGold（dladmin「卡牌编辑」可单独调整），否则按稀有度默认
      const goldPerCard = cardData.decomposeGold != null
        ? Number(cardData.decomposeGold)
        : this.getCardGoldValue(cardData.rarity);
      // 星级加成：1星×1，2星×2.5，3星×6（向下取整）
      const starMultiplier = targetStar === 1 ? 1 : targetStar === 2 ? 2.5 : 6;
      const totalGold = Math.floor(goldPerCard * starMultiplier) * count;

      // 消耗卡牌
      cardItem.num -= count;
      if (cardItem.num <= 0) {
        const index = this.inventory.indexOf(cardItem);
        this.inventory.splice(index, 1);
      }

      // 加金币：钱包余额 + 背包「金币」物品（背包界面显示的是背包金币物品数量，宝箱金币同口径）
      if (!this.shop) this.shop = { money: 100, items: [] };
      this.shop.money = (this.shop.money ?? 0) + totalGold;
      this.addItemToInventory({ name: '金币', num: totalGold });

      // 同步 CARD_DATA 最高星级和总数量
      cardData.star = this.getHighestCardStar(cardName);
      cardData.num = this.getCardTotalCount(cardName);

      ElMessText(`分解成功！获得 ${totalGold} 金币`, "success");
      return { ok: true, gold: totalGold };
    },
    // 合成卡牌：消耗碎片获得1张指定卡牌
    craftCard(cardName) {
      const cardData = this.pixi.player.CARD_DATA[cardName];
      if (!cardData) {
        ElMessText("卡牌不存在", "warning");
        return false;
      }
      // 🎴 独占卡牌不可合成（仅通过抽卡/商店获取）
      if (cardData.cardType === 'exclusive') {
        ElMessText("独占卡牌无法合成", "warning");
        return false;
      }
      // 🎴 特殊卡牌暂无获取来源，同样不可合成
      if (cardData.cardType === 'special') {
        ElMessText("特殊卡牌暂无获取来源", "warning");
        return false;
      }
      // 稀有及以上只能抽卡
      const craftCost = this.getCardCraftCost(cardData.rarity);
      if (!craftCost) {
        ElMessText("稀有及以上品质的卡牌只能通过抽卡获得", "warning");
        return false;
      }

      // 检查碎片是否足够
      const fragmentItem = this.inventory.find(item => item.name === '卡牌碎片');
      const fragmentCount = fragmentItem ? fragmentItem.num : 0;
      if (fragmentCount < craftCost) {
        ElMessText(`合成需要 ${craftCost} 个碎片（当前 ${fragmentCount} 个）`, "warning");
        return false;
      }

      // 消耗碎片
      fragmentItem.num -= craftCost;
      if (fragmentItem.num <= 0) {
        const index = this.inventory.indexOf(fragmentItem);
        this.inventory.splice(index, 1);
      }

      // 获得卡牌
      this.addCardToInventory(cardName, 1);

      ElMessText(`合成成功！获得「${cardName}」卡牌`, "success");
      return true;
    },
    // ========================
    // 道具装备系统
    // ========================
    // 最大装备道具数量
    getMaxEquipItems() {
      // 基础6格 + 天赋额外栏位（奇物扩容 extraSlot，管理页可改）
      let max = 6;
      if (this.hasTalent('extra_equip')) {
        max += Number(this.getTalentEffect?.('extra_equip', 'extraSlot') || 1);
      }
      return max;
    },

    // 获取道具的属性加成数据（仅静态基础加成，动态击杀加成见 getItemDynamicBuffs）
    getItemBuffs(itemName) {
      // 优先读 ITEM_DEFS / 商店配置 / 初始背包里的 buffs 字段（dladmin 可编辑），无则用内置兜底表
      const fromDef = ITEM_DEFS[itemName]?.buffs;
      if (fromDef) return fromDef;
      const fromShop = (DEFAULT_SHOP_ITEMS || []).find(x => x.name === itemName)?.buffs;
      if (fromShop) return fromShop;
      const fromInv = (DEFAULT_inventory || []).find(x => x.name === itemName)?.buffs;
      if (fromInv) return fromInv;
            const itemData = {
        '白朔的灵晶': {
          expBonus: 0.15, // 15%经验加成
        },
        '黑米的灵晶': {
          attack: 10, // 基础+10攻击力，动态击杀加成由 equipItem 额外计算
        },
        // ⚗️ 炼制产出装备类道具
        '力量护符': { attack: 8 },   // 永久攻击+8
        '守护宝珠': { armor: 12 },   // 永久护甲+12
        '疾风之符': { speed: 6 },    // 永久速度+6
        '贤者之石': { attack: 5, armor: 5, speed: 5 }, // 全属性+5
        '幸运戒指': { luck: 15 },  // 💍 佩戴后基础幸运+15
      };
      return itemData[itemName] || null;
    },

    // 获取道具的动态属性加成（基于击杀数等运行时状态）
    // 返回值会叠加在 getItemBuffs 之上
    getItemDynamicBuffs(itemName) {
      if (itemName === '黑米的灵晶') {
        const killCount = this.pixi.player.equippedItemKillCounts?.[itemName] || 0;
        return { attack: killCount * 0.2 };
      }
      return null;
    },

    // 检查道具是否已装备
    isItemEquipped(itemName) {
      return this.pixi.player.equippedItems.includes(itemName);
    },

    // 装备道具
    equipItem(itemName, i = 0) {
      const player = this.pixi.player;
      const juese = player.juese;

      // 检查是否已装备
      if (this.isItemEquipped(itemName)) {
        ElMessText("该道具已装备", "warning");
        return false;
      }

      // 检查是否达到上限
      if (player.equippedItems.length >= this.getMaxEquipItems()) {
        ElMessText(`最多只能装备 ${this.getMaxEquipItems()} 个道具`, "warning");
        return false;
      }

      // 检查背包中是否有该道具
      const invItem = this.inventory.find(i => i.name === itemName && i.isItem);
      if (!invItem || invItem.num <= 0) {
        ElMessText("背包中没有该道具", "warning");
        return false;
      }

      // 获取道具静态加成
      const buffs = this.getItemBuffs(itemName);
      if (!buffs) {
        ElMessText("未知道具", "warning");
        return false;
      }

      // 应用静态属性加成
      if (buffs.attack) {
        juese.baseAttack += buffs.attack;
        juese.attack = (juese.attack || juese.baseAttack) + buffs.attack;
      }
      if (buffs.armor) {
        juese.baseArmor += buffs.armor;
        juese.armor = (juese.armor || juese.baseArmor) + buffs.armor;
      }
      if (buffs.speed) {
        juese.baseSpeed += buffs.speed;
        juese.speed = (juese.speed || juese.baseSpeed) + buffs.speed;
      }
      if (buffs.luck) {
        juese.baseLuck = (juese.baseLuck || 0) + buffs.luck;
        if (juese.luck != null) juese.luck += buffs.luck;
      }
      if (buffs.charm) {
        juese.charm = (juese.charm || 0) + buffs.charm;
      }

      // 应用动态击杀加成（如黑米的灵晶）：恢复已保存的击杀数对应的攻击力
      const dynamicBuffs = this.getItemDynamicBuffs(itemName);
      if (dynamicBuffs && dynamicBuffs.attack) {
        juese.baseAttack += dynamicBuffs.attack;
        juese.attack = (juese.attack || juese.baseAttack) + dynamicBuffs.attack;
      }
      // 确保击杀计数存在（首次装备初始化）
      if (itemName === '黑米的灵晶') {
        if (!player.equippedItemKillCounts) player.equippedItemKillCounts = {};
        if (player.equippedItemKillCounts[itemName] === undefined) {
          player.equippedItemKillCounts[itemName] = 0;
        }
      }

      // 添加到已装备列表
      player.equippedItems.push(itemName);
      if (i === 0) ElMessText(`已装备「${itemName}」`, "success")
      return true;
    },

    // 卸下道具
    unequipItem(itemName) {
      const player = this.pixi.player;
      const juese = player.juese;

      // 检查是否已装备
      if (!this.isItemEquipped(itemName)) {
        ElMessText("该道具未装备", "warning");
        return false;
      }

      // 获取道具静态加成
      const buffs = this.getItemBuffs(itemName);
      if (!buffs) return false;

      // 移除静态属性加成
      if (buffs.attack) {
        juese.baseAttack -= buffs.attack;
        juese.attack = Math.max(0, (juese.attack || juese.baseAttack) - buffs.attack);
      }
      if (buffs.armor) {
        juese.baseArmor -= buffs.armor;
        juese.armor = Math.max(0, (juese.armor || juese.baseArmor) - buffs.armor);
      }
      if (buffs.speed) {
        juese.baseSpeed -= buffs.speed;
        juese.speed = Math.max(0, (juese.speed || juese.baseSpeed) - buffs.speed);
      }
      if (buffs.luck) {
        juese.baseLuck = Math.max(0, (juese.baseLuck || 0) - buffs.luck);
        if (juese.luck != null) juese.luck = Math.max(0, (juese.luck || 0) - buffs.luck);
      }
      if (buffs.charm) {
        juese.charm = Math.max(0, (juese.charm || 0) - buffs.charm);
      }

      // 移除动态击杀加成（如黑米的灵晶）
      const dynamicBuffs = this.getItemDynamicBuffs(itemName);
      if (dynamicBuffs && dynamicBuffs.attack) {
        juese.baseAttack -= dynamicBuffs.attack;
        juese.attack = Math.max(0, (juese.attack || juese.baseAttack) - dynamicBuffs.attack);
      }

      // 从已装备列表移除
      const idx = player.equippedItems.indexOf(itemName);
      if (idx > -1) {
        player.equippedItems.splice(idx, 1);
      }

      ElMessText(`已卸下「${itemName}」`, "success");
      return true;
    },

    // 获取当前装备道具的总经验加成
    getEquippedExpBonus() {
      let totalBonus = 0;
      const player = this.pixi.player;
      if (!player.equippedItems) return totalBonus;

      player.equippedItems.forEach(itemName => {
        const buffs = this.getItemBuffs(itemName);
        if (buffs && buffs.expBonus) {
          totalBonus += buffs.expBonus;
        }
      });

      return totalBonus;
    },

    // 抽卡方法（普通卡池，按稀有度概率）
    // 普通池最高史诗（不出传说），出货率：普通 50% / 优秀 28% / 稀有 17% / 史诗 5%
    gachaCard(count = 1) {
      // 检查灵力晶核数量
      const crystalItem = this.inventory.find(item => item.name === "灵力晶核");
      const cost = count; // 十连抽优惠

      if (!crystalItem || crystalItem.num < cost) {
        ElMessText("灵力晶核不足！", "warning");
        return null;
      }

      // 消耗灵力晶核
      crystalItem.num -= cost;
      if (crystalItem.num <= 0) {
        const index = this.inventory.indexOf(crystalItem);
        this.inventory.splice(index, 1);
      }

      // 稀有度概率权重（普通池，最高史诗；从 gachaRates 读取，后续版本可平衡）
      // 普通 50% / 优秀 28% / 稀有 17% / 史诗 5% / 传说 0%（普通池不出传说）
      const RARITY_WEIGHTS = {
        common: this.gachaRates?.normal?.common ?? 50,
        excellent: this.gachaRates?.normal?.excellent ?? 28,
        rare: this.gachaRates?.normal?.rare ?? 17,
        epic: this.gachaRates?.normal?.epic ?? 5,
        legendary: this.gachaRates?.normal?.legendary ?? 0,
      };

      // 按稀有度分组卡牌
      const cardsByRarity = this._buildCardsByRarity();

      const results = [];

      for (let i = 0; i < count; i++) {
        // 1. 先按稀有度权重抽稀有度
        const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        let chosenRarity = 'common';
        for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
          roll -= weight;
          if (roll <= 0) {
            chosenRarity = rarity;
            break;
          }
        }
        // 普通池最高史诗：若意外抽到传说则降级为史诗
        if (chosenRarity === 'legendary') {
          chosenRarity = 'epic';
        }

        // 2. 从该稀有度的卡池中随机选一张
        const pool = cardsByRarity[chosenRarity] || cardsByRarity.common || [];
        if (!pool.length) {
          // 该稀有度没有卡，回退到所有卡
          const allPool = Object.values(cardsByRarity).flat();
          if (!allPool.length) break;
          const selectedCard = allPool[Math.floor(Math.random() * allPool.length)];
          this.addCardToInventory(selectedCard.name, 1);
          results.push({ ...selectedCard });
          continue;
        }
        const selectedCard = pool[Math.floor(Math.random() * pool.length)];
        this.addCardToInventory(selectedCard.name, 1);
        results.push({ ...selectedCard });
      }

      // 添加到抽卡历史记录
      this._recordGachaHistory(count, cost, results.map(r => r.name), '普通卡池');

      return results;
    },
    // ======================================
    // 💎 高级卡池（消耗魔力晶核，只能单抽）
    // 保底稀有（连续 10 抽未出稀有及以上，第 11 抽必出），最高传说
    // 出货率：优秀 35% / 稀有 40% / 史诗 18% / 传说 7%
    // ======================================
    gachaCardPremium() {
      // 魔力晶核
      const premiumItem = this.inventory.find(item => item.name === "魔力晶核");
      if (!premiumItem || premiumItem.num < 1) {
        ElMessText("魔力晶核不足！", "warning");
        return null;
      }

      // 消耗 1 颗魔力晶核
      premiumItem.num -= 1;
      if (premiumItem.num <= 0) {
        const index = this.inventory.indexOf(premiumItem);
        this.inventory.splice(index, 1);
      }

      // 稀有度概率权重（高级池：优秀/稀有/史诗/传说，无保底；从 gachaRates 读取）
      const RARITY_WEIGHTS = {
        excellent: this.gachaRates?.premium?.excellent ?? 35,
        rare: this.gachaRates?.premium?.rare ?? 40,
        epic: this.gachaRates?.premium?.epic ?? 18,
        legendary: this.gachaRates?.premium?.legendary ?? 7,
      };

      // 正常抽取（按权重直接随机）
      let chosenRarity = null;
      const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
      let roll = Math.random() * totalWeight;
      for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
        roll -= weight;
        if (roll <= 0) { chosenRarity = rarity; break; }
      }

      // 从该稀有度的卡池中随机选一张
      const cardsByRarity = this._buildCardsByRarity();
      const pool = cardsByRarity[chosenRarity] || cardsByRarity.rare || [];
      if (!pool.length) {
        // 该稀有度没有卡，回退到所有非普通卡
        const allPool = Object.values(cardsByRarity).flat().filter(c => c.rarity !== 'common');
        if (!allPool.length) {
          // 兜底：随便给一张卡
          const anyPool = Object.values(cardsByRarity).flat();
          const fallback = anyPool[Math.floor(Math.random() * anyPool.length)];
          if (!fallback) {
            ElMessText("当前没有可抽取的卡牌", "warning");
            return null;
          }
          this.addCardToInventory(fallback.name, 1);
          this._recordGachaHistory(1, 1, [fallback.name], '高级卡池');
          return [{ ...fallback }];
        }
        const selectedCard = allPool[Math.floor(Math.random() * allPool.length)];
        this.addCardToInventory(selectedCard.name, 1);
        this._recordGachaHistory(1, 1, [selectedCard.name], '高级卡池');
        return [{ ...selectedCard }];
      }
      const selectedCard = pool[Math.floor(Math.random() * pool.length)];
      this.addCardToInventory(selectedCard.name, 1);
      this._recordGachaHistory(1, 1, [selectedCard.name], '高级卡池');
      return [{ ...selectedCard }];
    },
    // 按稀有度分组卡牌（内部工具）
    // 🎴 卡牌类型过滤：普通牌（无 cardType）可抽取；特殊牌（cardType:'special'）无获取来源不进卡池；
    //    独占牌（cardType:'exclusive'）仅指定角色（exclusiveRole）可从卡池获得
    _buildCardsByRarity() {
      const role = this.pixi?.player?.role || 'linen';
      const cardsByRarity = {};
      Object.entries(this.pixi.player.CARD_DATA)
        .filter(([name, data]) => {
          if (data.canDraw === false) return false; // 🎰 不可抽取卡牌（canDraw:false，如诅咒）不进卡池
          if (data.cardType === 'special') return false; // 🎴 特殊牌：暂无获取来源，不进卡池
          if (data.cardType === 'exclusive' && data.exclusiveRole && data.exclusiveRole !== role) return false; // 🎴 独占牌：仅对应角色可抽
          return true;
        })
        .forEach(([name, data]) => {
          const r = data.rarity || 'common';
          if (!cardsByRarity[r]) cardsByRarity[r] = [];
          cardsByRarity[r].push({
            name,
            color: data.color || "#ffffff",
            cost: Array.isArray(data.cost) ? data.cost[0] : (data.cost || 0),
            rarity: r,
          });
        });
      return cardsByRarity;
    },
    // 记录抽卡历史（内部工具）
    _recordGachaHistory(count, cost, cardNames, poolName = '') {
      const historyRecord = {
        time: new Date().toLocaleString('zh-CN'),
        count: count,
        cost: cost,
        cards: cardNames,
        pool: poolName,
      };
      this.gachaHistory.unshift(historyRecord);
      // 只保留最近100条记录
      if (this.gachaHistory.length > 100) {
        this.gachaHistory = this.gachaHistory.slice(0, 100);
      }
    },
    // 获取灵力晶核数量
    getCrystalCount() {
      const crystalItem = this.inventory.find(item => item.name === "灵力晶核");
      return crystalItem ? crystalItem.num : 0;
    },
    // 获取魔力晶核数量
    getPremiumCrystalCount() {
      const premiumItem = this.inventory.find(item => item.name === "魔力晶核");
      return premiumItem ? premiumItem.num : 0;
    },
    // ======================================
    // 自动存读档系统（可扩展）
    // ======================================
    /**
     * 自动存档：返回主界面时调用
     * @param {Object} extraData - 游戏内临时数据（当前地图、玩家坐标等非store常驻数据）
     */
    autoSave(extraData = {}) {
      // 💾 存档写入节流：150ms 防抖，高频触发（休息/回城/换图等）合并为最后一次全量写入，
      //    避免连续操作反复序列化大对象 + 写 localStorage 造成卡顿
      if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
      setAutoSaveTimer(setTimeout(() => {
        setAutoSaveTimer(null);
        const saveData = this.buildSaveData(extraData);
        // 存入本地存储（自动存档 = 最近进度）
        setStorage('auto_save', saveData);
        console.log('[自动存档] 成功，存档时间：', new Date(saveData.saveTime).toLocaleString());
      }, 150));
    },

    /**
     * 💾 组装完整存档数据（自动存档 / 手动档位共用同一组装逻辑）
     * @param {Object} extraData - 游戏内临时数据（当前地图、玩家坐标等）
     * @returns {Object} { version, saveTime, meta, data }
     */
    buildSaveData(extraData = {}) {
      const saveData = {
        version: SAVE_VERSION, // 存档版本号（后续版本更新可做兼容迁移）
        saveTime: Date.now(),
        data: {},
      };

      // 自动收集配置路径下的所有store数据，深拷贝避免引用问题
      AUTO_SAVE_PATHS.forEach(path => {
        const keys = path.split('.');
        let target = this;
        for (const key of keys) {
          if (target == null) break;
          target = target[key];
        }
        // 💾 体积优化：跳过空值/空容器（读档时缺失字段保持 store 默认，行为等价）
        if (target === undefined || target === null) return;
        if (Array.isArray(target) && target.length === 0) return;
        if (typeof target === 'object' && Object.keys(target).length === 0) return;
        saveData.data[path] = JSON.parse(JSON.stringify(target));
      });

        // 合并游戏内临时数据
      Object.assign(saveData.data, extraData);

      // 💾 档位摘要（六格存档弹窗展示用：时间 / 玩家名 / 等级 / 天数 / 地图）
      const mapId = extraData?.currentMap || 'desert_01';
      const map = this.pixi?.mapDataList?.find(m => m.id === mapId);
      saveData.meta = {
        saveTime: saveData.saveTime,
        playerName: this.playerName || '林恩',
        level: this.pixi?.player?.Level ?? 1,
        day: this.pixi?.player?.day ?? 1,
        mapId,
        mapName: map?.name || mapId,
      };
      return saveData;
    },

    /**
     * 💾 保存到指定手动档位（六格之一；每格含独立地牢进度快照）
     * @param {number} slotIndex - 档位索引 0~5
     * @param {Object} extraData - 同 autoSave 的临时数据（matter 传 getSaveData()）
     * @returns {boolean} 是否保存成功
     */
    saveSlot(slotIndex, extraData = {}) {
      if (slotIndex == null || slotIndex < 0 || slotIndex >= SAVE_SLOT_COUNT) return false;
      const saveData = this.buildSaveData(extraData);
      // 🏰 地牢进度快照：每格独立，读档时恢复该格的地牢进度
      saveData.dungeon = snapshotDungeon();
      setStorage(saveSlotKey(slotIndex), saveData);
      console.log('[手动存档] 已保存到档位', slotIndex + 1, '，时间：', new Date(saveData.saveTime).toLocaleString());
      return true;
    },

    /**
     * 💾 六格存档摘要列表（读取/保存弹窗展示）
     * @returns {Array<Object|null>} 每格：meta 摘要 或 null（空档）
     */
    getSlotList() {
      const list = [];
      for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
        const d = getStorage(saveSlotKey(i));
        if (d && d.data) {
          list.push(d.meta || {
            saveTime: d.saveTime || 0,
            playerName: '林恩',
            level: 1,
            day: 1,
            mapId: 'desert_01',
            mapName: 'desert_01',
          });
        } else {
          list.push(null);
        }
      }
      return list;
    },


    /**
     * 🗑️ 删除指定手动档位（删除前由弹窗确认）
     * @param {number} slotIndex - 档位索引 0~5
     * @returns {boolean} 是否删除成功
     */
    deleteSlot(slotIndex) {
      if (slotIndex == null || slotIndex < 0 || slotIndex >= SAVE_SLOT_COUNT) return false;
      try {
        localStorage.removeItem(saveSlotKey(slotIndex));
        console.log('[手动存档] 已删除档位', slotIndex + 1);
        return true;
      } catch (e) { return false; }
    },

    /**
     * 💾 是否有待读取的手动档标记（主菜单选中档位后、matter 挂载前判断）
     */
    hasPendingLoadSlot() {
      return this._pendingLoadSlot != null;
    },

    /**
     * 💾 自动存档摘要（主菜单读取弹窗底部展示"最近进度"）
     * @returns {Object|null} meta 摘要 或 null（无自动存档）
     */
    autoLoadMeta() {
      const d = getStorage('auto_save');
      if (!d || !d.data) return null;
      return d.meta || {
        saveTime: d.saveTime || 0,
        playerName: this.playerName || '林恩',
        level: 1,
        day: 1,
        mapId: 'desert_01',
        mapName: 'desert_01',
      };
    },

    /**
     * 💾 标记要读取的手动档位（主菜单选中档位后调用；null = 读自动存档）
     *    autoLoad 会消费一次该标记（读完自动清空，避免二次读取重复消费）
     */
    setPendingLoadSlot(i) {
      this._pendingLoadSlot = (i == null) ? null : Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(i) || 0));
    },


    /**
     * 🆕 卡牌系统同步：每次读档 / 打开卡牌面板时调用，用最新 DEFAULT_CARD_DATA 覆盖卡牌配置
     *    （后续版本新增 / 平衡卡牌只需改 DEFAULT_CARD_DATA，读档自动生效）
     *    仅保留玩家的进度数据：最高星级 star、拥有总数量 num
     */
    syncLatestCardData() {
      if (this.pixi?.player?.CARD_DATA) {
        const cd = this.pixi.player.CARD_DATA;
        for (const [name, defaultData] of Object.entries(DEFAULT_CARD_DATA)) {
          const old = cd[name];
          // 读档前：收集玩家进度数据（最高星级/总数量/自定义运行标记）
          const savedStar = old?.star ?? 1;
          const savedNum = old?.num ?? 0;
          const savedDefaultEvos = old?.defaultEvos || []; // 兼容旧档进化残留（读档后清空）
          // 用最新默认配置完全覆盖（含 atkRatio/cost/maxCooldown/desc/rarity/starEffects 等平衡数据）
          cd[name] = JSON.parse(JSON.stringify(defaultData));
          // 恢复玩家进度数据
          cd[name].star = Math.min(3, Math.max(1, savedStar || 1));
          cd[name].num = savedNum || 0;
          // 清空旧进化机制残留
          cd[name].defaultEvos = [];
          if (cd[name].evoOptions) delete cd[name].evoOptions;
          if (cd[name].evoDesc) delete cd[name].evoDesc;
          if (savedDefaultEvos.length) {
            // 旧进化词条在升星系统下无意义，仅保留数量进度即可
          }
        }
        // 背包中的卡牌物品同步最新配置（每个物品格子保留自身 star，cost/maxCooldown 按该物品星级取）
        (this.inventory || []).forEach(item => {
          if (item.isCard && cd[item.name]) {
            const data = cd[item.name];
            const star = Math.min(3, Math.max(1, item.star || 1)); // 保留该条目自身的星级
            item.star = star;
            item.rarity = data.rarity || 'common';
            item.cost = Array.isArray(data.cost) ? (data.cost[star - 1] ?? data.cost[0] ?? 0) : (data.cost ?? 0);
            item.maxCooldown = Array.isArray(data.maxCooldown) ? (data.maxCooldown[star - 1] ?? data.maxCooldown[0] ?? 0) : (data.maxCooldown ?? 0);
            item.color = data.color;
            item.miaoshu = data.desc || '';
            item.img = data.skin || item.name;
            // 兼容旧存档：若物品缺 _cardKey 则按 name_star 补齐（旧档一星卡在 1 星条目下）
            if (!item._cardKey) item._cardKey = `${item.name}_${star}`;
          }
        });
        // 兼容旧存档：若旧存档所有卡牌都挤在一个条目（无 _cardKey / 星级未拆分），
        // 把该条目拆分为「1星 + 剩余数量按最高星级」：无法区分星级时统一放 1 星条目
        // （仅当出现「无 _cardKey 的卡牌物品」时处理，正常新档不会触发）
        const legacyCards = (this.inventory || []).filter(item => item.isCard && !item._cardKey);
        if (legacyCards.length) {
          for (const item of legacyCards) {
            item._cardKey = `${item.name}_${item.star || 1}`;
          }
        }
      }


    },

    /**
     * 自动读档：开始游戏时调用
     * @returns {Object|null} 游戏初始化需要的临时数据（地图、坐标等），无存档返回null
     */
    autoLoad() {
      // 💾 手动档优先：主菜单选中档位则读该档；否则读自动存档（最近进度）
      let saveData = null;
      let fromSlot = false;
      const ps = this._pendingLoadSlot;
      if (ps != null && ps >= 0 && ps < SAVE_SLOT_COUNT) {
        saveData = getStorage(saveSlotKey(ps));
        fromSlot = !!saveData;
        this._pendingLoadSlot = null; // 只消费一次
      }
      if (!saveData) saveData = getStorage('auto_save');
      if (!saveData || !saveData.data) {
        console.log('[自动读档] 无存档，开始新游戏');
        // 🧪 测试物资：开始新游戏也塞 999
        this.grantTestMaterials();
        // 🏆 本局局外结算状态重置
        this.runExpGained = 0;
        this.runMetaSettled = false;
        return null;
      }

      // 📦 存档版本迁移：旧版本存档按迁移表逐级升级到当前版本，避免直接丢弃
      let saveVer = Number(saveData.version) || 0;
      while (saveVer < SAVE_VERSION) {
        const migFn = SAVE_MIGRATIONS[saveVer];
        if (migFn) { try { migFn(saveData.data); } catch (e) { console.warn('[自动读档] 迁移 v' + saveVer + ' 失败', e); } }
        saveVer++;
      }
      saveData.version = SAVE_VERSION;

      // 🏰 手动档读档：恢复该档独立的地牢进度快照（自动存档读档不恢复，保持当前地牢进度）
      if (fromSlot) restoreDungeon(saveData.dungeon);

      // 自动还原配置路径下的所有store数据
      Object.entries(saveData.data).forEach(([path, value]) => {
        // 只还原配置里的store路径，跳过临时数据
        if (AUTO_SAVE_PATHS.includes(path)) {
          const keys = path.split('.');
          let target = this;
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (target[key] == null) {
              target[key] = {};
            }
            target = target[key];
          }
          target[keys[keys.length - 1]] = value;
        }
      });

      // 🏆 本局局外结算状态重置（读档后本局重新开始，失败结算需重新可用）
      this.runExpGained = 0;
      this.runMetaSettled = false;

      // 🎴 读档兜底：手牌中的卡视为已拥有（老档 num 可能为 0，图鉴显示未解锁）；按卡组副本数补足
      if (Array.isArray(this.pixi?.player?.deck)) {
        const _cnt2 = {};
        this.pixi.player.deck.forEach(n => { _cnt2[n] = (_cnt2[n] || 0) + 1; });
        Object.entries(_cnt2).forEach(([n, c]) => {
          if (this.pixi.player.CARD_DATA?.[n]) this.pixi.player.CARD_DATA[n].num = Math.max(c, this.pixi.player.CARD_DATA[n].num || 0);
        });
      }

      // ===== 旧存档迁移：玩家新属性字段兜底（力量/智慧/元素精通/魅力 + 自由属性点） =====
      const _pj = this.pixi?.player?.juese;
      if (_pj) {
        if (_pj.strength == null) _pj.strength = 0;
        if (_pj.intelligence == null) _pj.intelligence = 0;
        if (_pj.elementMastery == null) _pj.elementMastery = 0;
        if (_pj.charm == null) _pj.charm = 0;
      if (_pj.attrAlloc == null) _pj.attrAlloc = {};
      }
      if (this.pixi?.player && this.pixi.player.freeAttrPoints == null) this.pixi.player.freeAttrPoints = 0;
      // 🎭 旧档迁移：角色字段兜底（默认林恩）
      if (this.pixi?.player && this.pixi.player.role == null) this.pixi.player.role = 'linen';

      // ===== 旧存档迁移：战斗狂热改为每级 +4 力量（常驻面板） =====
      //    旧版战斗狂热是"进入战斗后加攻击力"，已激活的存档没加过力量；
      //    读档时按激活等级一次性补发力量并打标记，避免重复补发
      if (_pj && this.pixi?.player?.talentLevels?.battle_frenzy) {
        const _bfLv = Number(this.pixi.player.talentLevels.battle_frenzy) || 0;
        if (_bfLv > 0 && !_pj._bfStrApplied) {
          _pj.strength = (_pj.strength || 0) + 4 * _bfLv;
          _pj._bfStrApplied = true;
          console.log('[天赋迁移] 战斗狂热：已补发力量 +' + (4 * _bfLv));
        }
      }

      // ===== 旧存档迁移：maxHp 拆派生（力量加成不再混入存储值） =====
      //    baseMaxHp = 基础生命（初始100 + 灵药 + 突破），maxHp = baseMaxHp + strength × strengthHp 派生
      //    ⚠️ 必须放在战斗狂热补力量之后执行，才能准确剥离力量对 maxHp 的贡献
      if (_pj && _pj.baseMaxHp == null) {
        const _strNow = _pj.strength || 0;
        const _strHp = LEVEL_UP_CFG.attrRates?.strengthHp ?? 2;
        _pj.baseMaxHp = Math.floor((_pj.maxHp || 100) - _strNow * _strHp);
        if (_pj.baseMaxHp < 1) _pj.baseMaxHp = Math.floor(_pj.maxHp || 100); // 🛡️ 异常存档保底
        if (_pj.hp != null) _pj.hp = Math.min(_pj.hp, _pj.maxHp || 100);
        console.log('[存档迁移] maxHp 拆派生：baseMaxHp=' + _pj.baseMaxHp + '（力量 ' + _strNow + ' 点加成已剥离）');
      }

      // ===== 旧存档迁移：升级攻击力按等级补发（每级 +attackPerLevel） =====
      //    老存档玩家已升的等级没有走过新升级逻辑，读档时按 (等级-1) × 每级成长 补差额；
      //    levelAttackBonus 记录已补发累计值，新档/正常升级后读档不会重复补
      if (this.pixi?.player?.juese && this.pixi.player.Level > 1) {
        const _atkPerLv = LEVEL_UP_CFG.player.attackPerLevel ?? 3;
        const _shouldAtk = (this.pixi.player.Level - 1) * _atkPerLv;
        const _alreadyAtk = this.pixi.player.juese.levelAttackBonus || 0;
        if (_shouldAtk > _alreadyAtk) {
          this.pixi.player.juese.baseAttack = (this.pixi.player.juese.baseAttack || 0) + (_shouldAtk - _alreadyAtk);
          if (this.pixi.player.juese.attack != null) this.pixi.player.juese.attack = this.pixi.player.juese.baseAttack;
          this.pixi.player.juese.levelAttackBonus = _shouldAtk;
          console.log(`[读档] 升级攻击力补发 +${_shouldAtk - _alreadyAtk}（${this.pixi.player.Level} 级 × ${_atkPerLv}）`);
        }
      }

      // ===== 旧存档迁移：队友战斗属性同步最新默认 =====
      // 后续调整 DEFAULT_ALLY_BATTLE_DATA 里的属性（hp/攻击/护甲/速度/技能等）后，读档自动生效
      // 规则：
      //   - 「基础数值/技能/行为/文案」字段始终跟随最新默认（读档覆盖存档旧值）
      //   - 「等级/经验」（level/exp/maxExp）保留存档（玩家养成投入不被覆盖）
      //   - 升级属性加成（投喂每级攻击+2、速度+1）按等级重新计算叠加，不因覆盖而丢失
      if (this.pixi?.allyBattleData && DEFAULT_ALLY_BATTLE_DATA) {
        for (const img of Object.keys(DEFAULT_ALLY_BATTLE_DATA)) {
          const src = DEFAULT_ALLY_BATTLE_DATA[img];
          if (!this.pixi.allyBattleData[img]) {
            // 存档缺失该队友 → 完整用最新默认
            this.pixi.allyBattleData[img] = JSON.parse(JSON.stringify(src));
            continue;
          }
          const dst = this.pixi.allyBattleData[img];
          // 1️⃣ 先备份玩家养成数据（等级/经验）
          const savedLevel = dst.level ?? 1;
          const savedExp = dst.exp ?? 0;
          const savedMaxExp = dst.maxExp ?? src.maxExp ?? 50;
          // 2️⃣ 用最新默认覆盖「数值/技能/行为/文案」字段（随配置调整自动生效）
          const SYNC_KEYS = [
            // 展示字段
            'name', 'title',
            // 基础属性（用户后续主要调整这些）
            'hp', 'maxHp', 'baseAttack', 'baseArmor', 'baseSpeed',
            // 显示配置（骨骼大小）
            'spineScale',
            // 普攻
            'attackType', 'attackRatio', 'attackDmgType',
            // 技能
            'skillType', 'skillName', 'skillAnim', 'skillValue', 'skillDuration',
            'skillPushback', 'skillDmgType', 'skillCooldown', 'skillInitialCooldown',
            // 🎭 技能列表跟随最新默认（selectedSkillId 单独保留玩家选择，见下方校验）
            'skillList',
            // 被动（数值/倍率字段跟随最新默认）
            'passiveType', 'passiveName', 'passiveValue', 'passiveManaCost', 'passiveDmgType',
            // 🎵 战斗音效
            'attackSound', 'skillSound',
            // 文案/标签（desc/skillDesc/passiveDesc 由 syncAllAllyDerivedFields 根据最终数值重新生成）
            'desc', 'skillDesc', 'passiveDesc', 'descFlavor', 'tags',
          ];
          for (const key of SYNC_KEYS) {
            if (src[key] !== undefined) {
              dst[key] = JSON.parse(JSON.stringify(src[key]));
            }
          }
          // 🎭 选定技能校验：保留玩家选择，但若技能列表变化导致选择失效则回退到第一个技能
          //    （skillList 已用最新默认覆盖；若存档的 selectedSkillId 不在其中，说明技能被删/改 id）
          if (Array.isArray(dst.skillList) && dst.skillList.length > 0) {
            const validIds = new Set(dst.skillList.map(s => s.id));
            if (!validIds.has(dst.selectedSkillId)) {
              dst.selectedSkillId = dst.skillList[0].id;
            }
            // 用最终选中的技能项同步扁平字段（保证战斗读取一致；技能项用 name 字段，映射到扁平 skillName）
            const eff = dst.skillList.find(s => s.id === dst.selectedSkillId) || dst.skillList[0];
            const flatKeys = ['skillType', 'skillName', 'skillAnim', 'skillValue', 'skillDuration', 'skillPushback', 'skillCooldown', 'skillInitialCooldown', 'skillDmgType', 'skillDesc'];
            flatKeys.forEach(k => {
              if (k === 'skillName') {
                if (eff.skillName !== undefined) dst.skillName = JSON.parse(JSON.stringify(eff.skillName));
                else if (eff.name !== undefined) dst.skillName = JSON.parse(JSON.stringify(eff.name));
                return;
              }
              if (eff[k] !== undefined) dst[k] = JSON.parse(JSON.stringify(eff[k]));
            });
          }
          // 3️⃣ 移除 NPC 队友的幸运属性残留（旧存档可能有 baseLuck/luck）
          delete dst.baseLuck;
          delete dst.luck;
          // 4️⃣ 恢复养成数据（等级/经验保留存档）
          dst.level = savedLevel;
          dst.exp = savedExp;
          // 🎓 maxExp 按 LEVEL_UP_CFG 公式重算（expBase/expMult 改动读档立即生效；等级用存档等级）
          dst.maxExp = allyMaxExpForLevel(img, savedLevel);
          // 5️⃣ 重新叠加升级属性加成（🎓 数值来自 LEVEL_UP_CFG.ally.growth，dladmin「升级编辑」可改）
          const _mg = (LEVEL_UP_CFG.ally.growth || {})[img] || {};
          const _mAtk = _mg.attack ?? 2, _mSpd = _mg.speed ?? 1;
          const lvlBonus = (savedLevel || 1) - 1;
          dst.baseAttack = Math.floor((dst.baseAttack || 0) + lvlBonus * _mAtk);
          dst.baseSpeed = Math.floor((dst.baseSpeed || 0) + lvlBonus * _mSpd);
          // 6️⃣ 溢出经验突破等级：若版本提高了最大等级上限，
          //    用满级时累积的 overflowExp 一次性突破数级
          const _mMaxLv = LEVEL_UP_CFG.ally.maxLevel ?? MAX_ALLY_LEVEL;
          if (dst.overflowExp > 0 && (dst.level || 1) < _mMaxLv) {
            let pool = dst.overflowExp;
            while (pool > 0 && (dst.level || 1) < _mMaxLv) {
              const need = dst.maxExp || allyExpBase(img);
              if (pool >= need) {
                pool -= need;
                dst.level += 1;
                dst.baseAttack = Math.floor((dst.baseAttack || 0) + _mAtk);
                dst.baseSpeed = Math.floor((dst.baseSpeed || 0) + _mSpd);
                dst.maxExp = Math.floor(allyExpBase(img) + (dst.maxExp || 50) * allyExpMult(img));
              } else {
                break; // 剩余不足一级，保留在溢出池
              }
            }
            // 剩余的溢出经验继续保留（不足一级的留到下次）
            dst.overflowExp = Math.max(0, pool);
            if (dst.level >= _mMaxLv) {
              dst.exp = dst.maxExp; // 又到满级，经验显示为满
            }
            console.log(`[同伴] ${img} 用溢出经验突破至 Lv.${dst.level}，剩余溢出经验 ${dst.overflowExp}`);
          }
        }
      }
      if (this.pixi?.npcSelectList && DEFAULT_npcSelectList) {
        const existingImgs = new Set(this.pixi.npcSelectList.map(n => n.img));
        for (const npc of DEFAULT_npcSelectList) {
          if (!existingImgs.has(npc.img)) {
            this.pixi.npcSelectList.push(JSON.parse(JSON.stringify(npc)));
          }
        }
      }

      // 🆕 兼容旧存档：若没有携带任何同伴（npcAlly 为空），默认携带晨曦（jinmao）
      if (!this.pixi?.npcAlly && (this.pixi?.npcSelectList || []).some(n => n.img === 'jinmao' && n.canAlly !== false)) {
        this.pixi.npcAlly = 'jinmao'
      }

      // 🆕 旧存档迁移：NPC 的 y 坐标（像素 → 百分比）
      // 旧代码创建 NPC 时把百分比 y 转成了像素（y*100*VH_old）存进 npcDataList，
      // 切屏后 VH 变化 → 像素值不随屏幕适配 → NPC 浮空/陷入地面。
      // 这里把 y>1（旧像素）转回百分比（相对屏幕高度），读取端按当前 VH 重新换算。
      // ⚠️ 旧像素是基于旧 VH 算的，无法得知旧 VH，用「当前 VH」反推（同屏准确，跨屏后重新保存即纠正）
      if (Array.isArray(this.pixi?.npcDataList)) {
        const curVH = (window.innerHeight || 1080) / 100;
        this.pixi.npcDataList.forEach(npc => {
          if (npc && npc.y != null && npc.y > 1) {
            npc.y = npc.y / (100 * curVH); // 像素 → 百分比
          }
        });
      }

      // 🆕 兼容旧存档：背包若没有「魔晶」，补 20 个（投喂同伴升级用）
      if (!(this.inventory || []).some(i => i.name === '魔晶LV1')) {
        this.inventory.push({
          name: "魔晶LV1",
          num: 20,
          img: "redCrystalT1",
          miaoshu: "蕴含纯净能量的魔晶，投喂给同伴可提升等级。\n每颗 +25 经验，升级提升攻击力+2、速度+1。",
          status: "material",
          color: "#8B5CF6"
        });
      }

      // 🆕 兼容旧存档：补充合成系统材料（草药/纯净水/灵力晶核），确保合成工坊可用
      const craftMaterials = [
        { name: "灵力晶核", num: 50, img: "jinghe", miaoshu: "蕴含强大灵力的晶核，可用于合成和抽卡。", status: "material", color: "#8B5CF6" },
      ];
      for (const mat of craftMaterials) {
        if (!(this.inventory || []).some(i => i.name === mat.name)) {
          this.inventory.push(mat);
        }
      }

      // 🆕 兼容旧存档：补齐「魔力晶核」（高级卡池消耗）
      if (!(this.inventory || []).some(i => i.name === '魔力晶核')) {
        this.inventory.push({
          name: "魔力晶核",
          num: 5,
          img: "molijinghe",
          miaoshu: "蕴含远古力量的稀有魔晶，用于抽取高级卡池（必得优秀以上卡牌，保底稀有，最高传说）。",
          status: "material",
          color: "#F56C6C"
        });
      }

      // 🆕 兼容旧存档：补齐突破系统道具（中等/史诗魔晶 + 突破材料）
      const btCompat = [
        { name: "魔晶LV2", num: 5, img: "redCrystalT2", miaoshu: "蕴含较强能量的魔晶，品质 2。用于等级突破，收益比普通魔晶更高。", status: "material", color: "#409EFF", bType: 'crystal', bCrystal: 2 },
        { name: "魔晶LV4", num: 3, img: "redCrystalT4", miaoshu: "蕴含古老神力的魔晶LV4，品质 4。用于等级突破可获得极高收益，并随机解锁一项被动。", status: "material", color: "#a78bfa", bType: 'crystal', bCrystal: 4 },
        { name: "突破神石", num: 5, img: "tuposhenshi", miaoshu: "蕴含突破之力的神石，投入可提升突破成功率 +15%。", status: "material", color: "#fbbf24", bType: 'booster', bBoost: 0.15 },
        { name: "幸运草", num: 5, img: "xingyuncao", miaoshu: "幸运的四叶草，投入可提升突破成功率 +10%。", status: "material", color: "#67C23A", bType: 'booster', bBoost: 0.10 },
      ];
      for (const it of btCompat) {
        if (!(this.inventory || []).some(i => i.name === it.name)) {
          this.inventory.push(it);
        }
      }
      // 🔧 修正突破道具图片（早期版本误用 caoyao 草药图，现按各自皮肤渲染）
      for (const it of this.inventory || []) {
        if (it.name === '突破神石' && it.img === 'caoyao') it.img = 'tuposhenshi';
        else if (it.name === '幸运草' && it.img === 'caoyao') it.img = 'xingyuncao';
      }

      this.syncLatestCardData();

      // 🆕 🎰 抽卡出货概率同步：每次读档都用最新 DEFAULT_GACHA_RATES 覆盖
      //    （后续版本平衡出货率只需改 DEFAULT_GACHA_RATES，读档自动生效）
      this.gachaRates = JSON.parse(JSON.stringify(DEFAULT_GACHA_RATES));

      // 🆕 🎓 天赋配置同步：每次读档都用最新默认天赋配置覆盖
      //    （后续版本新增/删除/调整天赋只需改 state 里的 talentConfig，读档自动生效）
      //    玩家进度（activatedTalents / talentLevels）保留，配置用最新默认
      if (DEFAULT_TALENT_CONFIG && Array.isArray(DEFAULT_TALENT_CONFIG)) {
        this.talentConfig = JSON.parse(JSON.stringify(DEFAULT_TALENT_CONFIG));
        // 🧹 清理被删除天赋的残留进度：若最新配置删除了某个天赋，
        //    把它从已激活列表/等级记录中移除（避免引用不存在的天赋导致报错）
        const validIds = new Set(this.talentConfig.map(t => t.id));
        if (Array.isArray(this.pixi?.player?.activatedTalents)) {
          this.pixi.player.activatedTalents = this.pixi.player.activatedTalents.filter(id => validIds.has(id));
        }
        if (this.pixi?.player?.talentLevels) {
          for (const id of Object.keys(this.pixi.player.talentLevels)) {
            if (!validIds.has(id)) delete this.pixi.player.talentLevels[id];
          }
        }
      }

      // 🆕 🏪 商店同步：每次读档用最新 DEFAULT_SHOP_ITEMS 刷新商店物品
      //    （新增/删除/编辑改 DEFAULT_SHOP_ITEMS，读档自动生效；已购数量保留）
      this.refreshShopItems();

      // 🆕 ⚗️ 炼制图鉴同步：每次读档用最新 LIANZHI_RECIPES 校验已解锁配方
      //    （后续新增/删除/修改配方只需改 LIANZHI_RECIPES，读档自动生效；
      //     已解锁记录中「图鉴已不存在」的 ID 会被清理）
      this.refreshLianzhiRecipes();

      // 🆕 🧪 合成工坊图纸同步：每次读档用最新 CRAFT_RECIPES
      //    （后续新增/删除/修改图纸只需改 CRAFT_RECIPES，读档自动生效）
      this.refreshCraftRecipes();

      // 🆕 👥 同伴展示列表同步：每次读档保证 pixi.allyList 包含所有默认可携带同伴
      //    （独立于地图 NPC，即使地图实体被删/隐藏，展示列表不受影响）
      this.syncAllyList();
      // 💗 好感度属性加成同步：旧档已有好感度 ≥50/100 的同伴补发属性加成
      this.syncAllNpcAffectionBonus();
      // 📝 用存档当前数值重新生成全部同伴派生字段（扁平技能字段 + desc/skillDesc/passiveDesc，
      //    含养成等级加成与好感度属性加成；调整 DEFAULT_ALLY_BATTLE_DATA 后读档自动更新）
      this.syncAllAllyDerivedFields();
      // 🐛 兼容旧档：黑米是剧情解锁角色（hd317 入队），若曾在旧版被误加进展示列表
      //    但剧情尚未解锁（无 heimiJoinDay 标记）→ 从展示列表移除，等剧情入队时再加入
      if (Array.isArray(this.pixi?.allyList) && !this.pixi.allyList.some(a => a.img === 'tuzi')) {
        // 黑米不在展示列表，无需处理
      } else if (Array.isArray(this.pixi?.allyList) && !this.getDialogueFlag('heimiJoinDay')) {
        this.pixi.allyList = this.pixi.allyList.filter(a => a.img !== 'tuzi');
        console.log('[同伴] 已移除未解锁的黑米（等待剧情入队 hd317 再加入）');
      }

      // 🧪 测试物资：读取游戏时补足 999（材料/产物，图片后补）
      this.grantTestMaterials();
      console.log('[自动读档] 成功，存档时间：', new Date(saveData.saveTime).toLocaleString());
      // 返回游戏初始化需要的临时数据
      return {
        currentMap: saveData.data.currentMap,
        playerX: saveData.data.playerX,
        playerY: saveData.data.playerY,
        playerDirection: saveData.data.playerDirection,
        npcDirections: saveData.data.npcDirections,
        npcPositions: saveData.data.npcPositions,
        npcHidden: saveData.data.npcHidden || {},
        npcPendingMoves: saveData.data.npcPendingMoves || {},
        saveTime: saveData.saveTime,
      };
    },

    /**
     * 检查是否存在自动存档
     */
    hasAutoSave() {
      return !!getStorage('auto_save');
    },

    /**
     * 删除自动存档（开始新游戏时调用）
     */
    deleteAutoSave() {
      setStorage('auto_save', null);
      console.log('[自动存档] 已删除');
    },

    /**
     * 🗑️ 删除唯一存档（地牢死亡/游戏失败时调用）：
     *    清空自动存档 + 历史六格手动档残留 + 地牢探索进度，返回主世界后无法再读档恢复
     */
    deleteSave() {
      try {
        // 唯一存档（自动存档 = 最近进度）
        localStorage.removeItem('auto_save');
        // 🧹 历史六格手动档残留（fv_save_slot_0 ~ 5，旧版本遗留，统一清掉）
        for (let i = 0; i < 6; i++) localStorage.removeItem(saveSlotKey(i));
        // 🏰 地牢探索进度（迷雾/层数/已拾取/已击败等）
        DUNGEON_KEYS.forEach(k => localStorage.removeItem(k));
      } catch (e) { /* ignore */ }
      console.log('[存档] 已删除唯一存档（游戏失败）');
    },

    /** 🧹 历史手动档兜底：返回第一个非空档位索引（旧版本存档迁移用；无则 -1） */
    getFirstLegacySlot() {
      for (let i = 0; i < 6; i++) {
        if (getStorage(saveSlotKey(i))?.data) return i;
      }
      return -1;
    },


    /**
     * 💾 是否存在可读取的存档（唯一存档 auto_save 或历史手动档残留）
     */
    hasAnySave() {
      if (getStorage('auto_save')) return true;
      for (let i = 0; i < 6; i++) {
        if (getStorage(saveSlotKey(i))?.data) return true;
      }
      return false;
    },

    // ========================
    // 音频系统
    // ========================

    /**
     * 解锁音频上下文（浏览器自动播放策略，需在用户手势中调用）
     */
    unlockAudio() {
      unlockAudio();
    },

    /**
     * 播放点击音效
     */
    playClickSound() {
      unlockAudio();
      // 🖱️ 点击音效单例：只加载一次 mp3，避免每次点击重复 new Howl 造成偶发卡顿/无反馈
      if (!_clickSound) {
        _clickSound = new Howl({
          src: [`/music/clickS.mp3`],
          volume: 1,
          preload: true,
        });
        playingSounds.push(_clickSound);
      }
      // 🎯 去重：80ms 内同一物理点击（全局监听 + 局部手动调用可能双触发）只播一次
      const _now = Date.now();
      if (_now - _clickDedupAt < SFX_DEDUPE_MS) return;
      _clickDedupAt = _now;
      // 音量跟随全局设置实时更新
      _clickSound.volume(Math.max(0, Math.min(1, this.volume ?? 1)));
      // 若被其他逻辑清出 playingSounds，重新登记
      if (playingSounds.indexOf(_clickSound) === -1) playingSounds.push(_clickSound);
      // 播放中则从头重播（快速连点也能即时响应，不叠加）
      if (_clickSound.playing()) _clickSound.stop();
      _clickSound.play();
    },
    /**
     * 🎵 播放一次性技能/攻击音效（战斗用）
     * 根据路径播放音频：
     *   - 新格式（卡牌）：带路径+后缀，如 'music/jineng/sheji.wav' → 播放 /music/jineng/sheji.wav
     *   - 旧格式（兼容队友/敌人/剧情）：裸文件名，如 'ally_tuzi_guhuo' → 播放 /music/ally_tuzi_guhuo.mp3
     *   - 音频文件不存在（loaderror）时静默跳过，不影响战斗（后期手动替换同名文件即可生效）
     *   - 播放结束自动清理实例，避免内存堆积
     * @param {string} soundName - 音频路径/文件名（可带 music/... 路径和 .wav/.mp3 后缀）
     * @param {number} [volume=1] - 独立音量倍率（0~1，乘到全局音量上；不传 = 全局音量）
     */
    playSoundEffect(soundName, volume = 1) {
      if (!soundName) return;
      // 🎯 同名音效去重：80ms 内同一音效不重复触发（防技能/攻击音效连发轰炸）
      const _now = Date.now();
      const _key = String(soundName);
      if (_now - (_sfxDedupMap.get(_key) || 0) < SFX_DEDUPE_MS) return;
      _sfxDedupMap.set(_key, _now);
      try {
        unlockAudio();
        // 🎵 解析地址：
        //   带路径（music/...）或带音频后缀 → 直接以 / 开头作为完整路径；
        //   裸文件名（旧格式）→ 兼容回退到 /music/{name}.mp3
        let name = String(soundName).trim();
        let src;
        if (name.includes('/') || /\.(wav|mp3|ogg|m4a)$/i.test(name)) {
          if (!name.startsWith('/')) name = '/' + name;
          src = name;
        } else {
          src = `/music/${name}.mp3`;
        }
        const sound = new Howl({
          src,
          // 🎚️ 独立音量 = 全局音量 × 该音效音量倍率（钳制 0~1）
          volume: Math.max(0, Math.min(1, (this.volume ?? 1) * volume)),
          preload: true,
        });
        // 音频文件不存在 → 静默跳过（后期手动替换即可），不弹报错
        sound.on('loaderror', () => {
          sound.unload();
          const idx = playingSounds.indexOf(sound);
          if (idx > -1) playingSounds.splice(idx, 1);
        });
        sound.play();
        playingSounds.push(sound);
        // 播放结束自动清理
        sound.on('end', () => {
          const idx = playingSounds.indexOf(sound);
          if (idx > -1) playingSounds.splice(idx, 1);
        });
        // 🎚️ 结尾淡出：音效快结束时音量渐小，避免戛然而止
        //    淡出时长 = min(120ms, 总时长 × 30%)，短音效也不会被吃掉太多
        sound.on('play', () => {
          const durMs = sound.duration() * 1000;
          if (!durMs || !isFinite(durMs) || durMs <= 0) return;
          const fadeMs = Math.min(120, durMs * 0.3);
          setTimeout(() => {
            try {
              if (sound.playing()) sound.fade(sound.volume(), 0, fadeMs);
            } catch (e) { /* 忽略淡出异常 */ }
          }, Math.max(0, durMs - fadeMs));
        });
      } catch (e) {
        // 播放失败静默跳过
      }
    },
    /**
     * 播放背景音乐（循环）
     * @param {string} bgmName - 音乐文件名（不含路径和后缀）
     */
    _stopAllAudioRaw() {
      const fadeTime = 500; // 淡出毫秒
      // 遍历所有音频执行淡出
      playingSounds.forEach(sound => {
        if (!sound) return;
        // 获取当前音量，淡出到0
        const curVol = sound.volume();
        sound.fade(curVol, 0, fadeTime);
        // 淡出完成后销毁
        setTimeout(() => {
          sound.stop();
          sound.unload();
        }, fadeTime);
      });
      // 清空数组延迟，避免立即访问失效实例
      setTimeout(() => {
        playingSounds.length = 0;
      }, fadeTime + 50);

      // 🎵 BGM → 统一音频管理器（淡出 + 释放实例）
      audioStopBgm();
    },

    /**
     * 全局停止所有音频（对外调用）
     */
    stopAllAudio() {
      this._stopAllAudioRaw();
      console.log('[Store音频] 全部音频开始淡出释放');
    },

    /**
     * 停止背景音乐
     */
    stopBgm() {
      this._stopAllAudioRaw();
    },

    /**
     * 播放背景音乐（带淡入淡出过渡）
     * @param {string} bgmName - 音乐文件名
     * @param {number} num - 音量系数
     */
    playBgm(bgmName, num = 0.4) {
      // 🎵 统一音频管理器：同曲不重启、淡入淡出、只切 BGM（不再误杀一次性音效）
      if (!bgmName) return;
      try {
        unlockAudio();
        this._lastBgmNum = num; // ⚙️ 记录当前 BGM 系数，供设置弹窗调音量时重算目标音量
        // 🎵 最终 BGM 音量 = 全局音量(volume) × 调用方系数(num) × BGM_VOLUME_BASE（总音量系数）
        const targetVol = Math.max(0, Math.min(1, (this.volume ?? 1) * num * BGM_VOLUME_BASE));
        audioPlayBgm(bgmName, { volume: targetVol });
      } catch (e) {
        console.warn(`[Store音频] BGM播放失败 ${bgmName}:`, e);
      }
    },

    /**
     * ⚙️ 设置弹窗调音量：更新全局音量并让当前 BGM 立即 fade 到新音量
     * @param {number} v - 0~1 全局音量
     */
    applyVolume(v) {
      this.volume = Math.max(0, Math.min(1, Number(v) || 0));
      try {
        const num = this._lastBgmNum ?? 0.4;
        const targetVol = Math.max(0, Math.min(1, this.volume * num * BGM_VOLUME_BASE));
        audioSetBgmVolume(targetVol);
      } catch (e) { /* ignore */ }
    },

    // ========== 🎁 任务奖励 ==========

    /**
     * 🎁 获取任务的奖励配置（供界面展示）
     * @param {Object} task - 任务对象（含 id / name）
     * @returns {Object|null} { exp, money, items: [{name, num, img}] }
     */
    getTaskRewardInfo(task) {
      if (!task) return null
      // 优先按 id 匹配，其次按任务名匹配（兼容 id 不固定的任务）
      const cfg = task.reward ?? TASK_REWARDS[task.id] ?? TASK_REWARDS[task.name] ?? null
      if (!cfg) return null
      return {
        exp: cfg.exp || 0,
        money: cfg.money || 0,
        items: (cfg.items || []).map(it => {
          const def = DEFAULT_inventory.find(d => d.name === it.name)
          return {
            name: it.name,
            num: it.num,
            img: it.img || def?.img || '',
          }
        }),
      }
    },

    /**
     * 🎁 发放任务奖励（经验值/金币/物品），任务完成时调用
     * @param {Object} task - 任务对象（含 id / name）
     * @returns {Object|null} { exp, money, items: [{name, num}] }；未配置奖励返回 null
     */
    // 🌟 解锁任务获取型天赋（autoGranted: true），加入已激活列表
    unlockAutoGrantedTalent(talentId) {
      const talent = this.talentConfig.find(t => t.id === talentId)
      if (!talent || !talent.autoGranted) return false
      if (!this.pixi?.player?.activatedTalents) {
        if (this.pixi?.player) this.pixi.player.activatedTalents = []
      }
      if (this.pixi.player.activatedTalents.includes(talentId)) return false
      this.pixi.player.activatedTalents.push(talentId)
      ElMessText(`解锁天赋：${talent.name}`, "success")
      return true
    },

    grantTaskRewards(task) {
      if (!task) return null
      // 优先按 id 匹配，其次按任务名匹配（兼容 id 不固定的任务）
      const cfg = task.reward ?? TASK_REWARDS[task.id] ?? TASK_REWARDS[task.name]
      if (!cfg) return null

      const granted = { exp: 0, money: 0, items: [], talents: [] }

      // 💎 经验值（自动计算装备加成并处理升级）
      if (cfg.exp > 0) {
        this.addExp(cfg.exp)
        granted.exp = cfg.exp
      }

      // 🪙 金币
      if (cfg.money > 0) {
        this.shop.money = (this.shop.money ?? 0) + cfg.money
        granted.money = cfg.money
      }

      // 🎒 物品（自动从 DEFAULT_inventory 补齐图标/描述/颜色；背包已存在同名物品自动累加数量）
      for (const it of (cfg.items || [])) {
        if (!it || !it.name || !(it.num > 0)) continue
        const def = DEFAULT_inventory.find(d => d.name === it.name)
        this.addItemToInventory({
          name: it.name,
          num: it.num,
          img: it.img || def?.img || '',
          miaoshu: it.miaoshu || def?.miaoshu || '',
          color: it.color || def?.color || '#E6A23C',
        })
        granted.items.push({ name: it.name, num: it.num })
      }

      // 🌟 解锁天赋（奖励 talents: ["天赋id"]，仅任务获取型 autoGranted 天赋生效）
      for (const tid of (cfg.talents || [])) {
        if (this.unlockAutoGrantedTalent(String(tid))) granted.talents.push(String(tid))
      }

      console.log(`[任务奖励] 「${task.name}」完成：经验 +${granted.exp}、金币 +${granted.money}、物品 ${JSON.stringify(granted.items)}、天赋 ${JSON.stringify(granted.talents)}`)
      return granted
    },

    // 完成任务步骤
    completeTaskStep(taskId, stepId) {
      const allTasks = this.allTasks
      // 兜底，不存在就默认空数组，解决不可迭代问题
      const mainTasks = allTasks.mainTasks || []
      const sideTasks = allTasks.sideTasks || []
      const taskList = [...mainTasks, ...sideTasks]

      const task = taskList.find(t => t.id === taskId)

      if (!task) return false

      const step = task.steps.find(s => s.id === stepId)
      if (!step || step.isCompleted) return false

      step.isCompleted = true

      // 检查是否所有步骤都完成了
      const allCompleted = task.steps.every(s => s.isCompleted)
      let reward = null
      if (allCompleted) {
        task.isCompleted = true
        // 🎁 任务完成：自动发放奖励（经验/金币/物品）
        reward = this.grantTaskRewards(task)
      }

      return { stepCompleted: true, taskCompleted: allCompleted, reward }
    },
    // 获取当前进行中的任务
    getActiveTasks(type = 'all') {
      if (this.allTasks?._tplVer !== TASK_TPL_VERSION) this.syncTasksFromDefs?.()
      const allTasks = this.allTasks
      if (type === 'main') {
        return (allTasks.mainTasks || []).filter(t => !t.hidden && !t.isCompleted)
      } else if (type === 'side') {
        return (allTasks.sideTasks || []).filter(t => !t.hidden && !t.isCompleted)
      }
      return [...(allTasks.mainTasks || []), ...(allTasks.sideTasks || [])].filter(t => !t.hidden && !t.isCompleted)
    },
    // 获取已完成的任务
    getCompletedTasks(type = 'all') {
      if (this.allTasks?._tplVer !== TASK_TPL_VERSION) this.syncTasksFromDefs?.()
      const allTasks = this.allTasks
      if (type === 'main') {
        return (allTasks.mainTasks || []).filter(t => !t.hidden && t.isCompleted)
      } else if (type === 'side') {
        return (allTasks.sideTasks || []).filter(t => !t.hidden && t.isCompleted)
      }
      return [...(allTasks.mainTasks || []), ...(allTasks.sideTasks || [])].filter(t => !t.hidden && t.isCompleted)
    },
    // 添加新任务
    addTask(taskData, type = 'side') {
      // 🛡️ 确保任务数组存在（新游戏 allTasks 初始为空对象，避免 push 崩溃导致任务添加失败）
      if (!this.allTasks.mainTasks) this.allTasks.mainTasks = []
      if (!this.allTasks.sideTasks) this.allTasks.sideTasks = []
      // 如果传了 id 就用传的，否则从对应列表最后一位的 id+1
      let newId = taskData.id
      if (newId == null) {
        const list = type === 'main' ? this.allTasks.mainTasks : this.allTasks.sideTasks
        const lastId = list.length > 0 ? list[list.length - 1].id : 0
        newId = lastId + 1
      }

      const newTask = {
        id: newId,
        name: taskData.name || '新任务',
        type: type,
        description: taskData.description || '',
        icon: taskData.icon || '',
        isCompleted: false,
        currentStep: 0,
        steps: taskData.steps || []
      }

      if (type === 'main') {
        this.allTasks.mainTasks.push(newTask)
      } else {
        this.allTasks.sideTasks.push(newTask)
      }

      return newTask
    },

    // 💗 好感度进战加成（单点事实源）：每拥有 50 好感度，进入战斗全属性 +10%（无上限，动态计算不写档）
    // 好感度 0-49 → 0%；50-99 → +10%；100-149 → +20% ……（与 AFFECTION_BONUS_TIERS 永久档并存叠加）
    getAffectionFightMult(affection = 0) {
      return 1 + Math.floor((Number(affection) || 0) / 50) * 0.10
    },

    // 📜 同步任务模板（TASK_DEFS ↔ allTasks）：模板新增→补入；模板修改→更新字段保留进度；模板删除→移除模板任务（保留运行时任务）
    syncTasksFromDefs() {
      if (!this.allTasks || typeof this.allTasks !== 'object') this.allTasks = {}
      if (!Array.isArray(this.allTasks.mainTasks)) this.allTasks.mainTasks = []
      if (!Array.isArray(this.allTasks.sideTasks)) this.allTasks.sideTasks = []
      const all = [...this.allTasks.mainTasks, ...this.allTasks.sideTasks]
      const mergedMain = []
      const mergedSide = []
      for (const def of TASK_DEFS) {
        const old = all.find(t => String(t.id) === String(def.id))
        const type = def.type === 'main' ? 'main' : 'side'
        if (old) {
          old.name = def.name || old.name
          old.type = type
          old.description = def.description ?? old.description
          old.icon = def.icon ?? old.icon
          old.hidden = def.hidden ? 1 : 0
          old._fromDef = true
          old.steps = (def.steps || []).map(s => {
            const os = (old.steps || []).find(o => String(o.id) === String(s.id))
            return os ? { ...os, desc: s.desc ?? os.desc, target: s.target ?? os.target ?? 0 } : { id: s.id, desc: s.desc || '', target: s.target || 0, current: 0, isCompleted: false }
          })
          ;(type === 'main' ? mergedMain : mergedSide).push(old)
        } else {
          const nt = {
            id: def.id, name: def.name || '新任务', type, description: def.description || '', icon: def.icon || '',
            hidden: def.hidden ? 1 : 0, isCompleted: false, currentStep: 0, _fromDef: true,
            steps: (def.steps || []).map(s => ({ id: s.id, desc: s.desc || '', target: s.target || 0, current: 0, isCompleted: false })),
          }
          ;(type === 'main' ? mergedMain : mergedSide).push(nt)
        }
      }
      // 保留运行时任务（非模板生成）
      for (const t of this.allTasks.mainTasks) if (!t._fromDef) mergedMain.push(t)
      for (const t of this.allTasks.sideTasks) if (!t._fromDef) mergedSide.push(t)
      this.allTasks.mainTasks = mergedMain
      this.allTasks.sideTasks = mergedSide
      this.allTasks._tplVer = TASK_TPL_VERSION
    },

    // 🗑 删除任务（从当前 allTasks 移除；模板任务改由 TASK_DEFS 管理）
    removeTask(taskId) {
      const all = [...(this.allTasks?.mainTasks || []), ...(this.allTasks?.sideTasks || [])]
      const t = all.find(x => String(x.id) === String(taskId))
      if (!t) return false
      const list = t.type === 'main' ? this.allTasks.mainTasks : this.allTasks.sideTasks
      const i = list.indexOf(t)
      if (i !== -1) list.splice(i, 1)
      return true
    },
    // 检测单个任务是否已完成
    isTaskCompleted(taskId) {
      const allTasks = [...(this.allTasks.mainTasks || []), ...(this.allTasks.sideTasks || [])]
      const task = allTasks.find(t => t.id === taskId)
      return task?.isCompleted === true
    },
    // 获取单个任务信息
    getTaskInfo(taskId) {
      const allTasks = [...this.allTasks.mainTasks, ...this.allTasks.sideTasks]
      return allTasks.find(t => t.id === taskId) || null
    },
    // 增加NPC好感度
        // 🆓 分配自由属性点（每级 +4；魅力不可分配；力量附带每点 +2 最大生命）
    addAttrPoint(key) {
      const player = this.pixi.player;
      const juese = player.juese;
      if ((player.freeAttrPoints || 0) <= 0) return { ok: false, msg: '没有可用自由属性点' };
      if (key === 'charm') return { ok: false, msg: '魅力无法通过自由属性点提升' };
      if (key === 'luck') return { ok: false, msg: '幸运无法通过自由属性点提升' };
      const ALLOC_KEYS = ['strength', 'intelligence', 'attack', 'armor', 'magicResist', 'speed', 'luck'];
      if (!ALLOC_KEYS.includes(key)) return { ok: false, msg: '未知属性' };
      if (!juese.attrAlloc) juese.attrAlloc = {};
      juese.attrAlloc[key] = (juese.attrAlloc[key] || 0) + 1;
      if (key === 'attack') { juese.baseAttack = (juese.baseAttack || 0) + 1; juese.attack = juese.baseAttack; }
      else if (key === 'armor') { juese.baseArmor = (juese.baseArmor || 0) + 1; juese.armor = juese.baseArmor; }
      else if (key === 'magicResist') { juese.baseMagicResist = (juese.baseMagicResist ?? 10) + 1; }
      else if (key === 'speed') { juese.baseSpeed = (juese.baseSpeed || 0) + 1; }
      else if (key === 'luck') { juese.baseLuck = (juese.baseLuck || 0) + 1; }
      else { juese[key] = (juese[key] || 0) + 1; }
      player.freeAttrPoints -= 1;
      // 💪 力量附带：最大生命 = baseMaxHp + strength × strengthHp（派生，不写进存储；不回满，保持当前比例）
      if (key === 'strength') {
        this.syncMaxHp();
      }
      return { ok: true, key, left: player.freeAttrPoints };
    },
    // 🧱 同步派生最大生命（maxHp = baseMaxHp + strength × strengthHp）
    //    分配/洗点/灵药/突破/进战斗后调用，保证 maxHp 永远与 strength 一致（唯一派生入口）
    syncMaxHp() {
      const juese = this.pixi?.player?.juese;
      if (!juese) return;
      juese.maxHp = computeUnitAttrs(juese).maxHp ?? juese.maxHp;
      if (juese.hp != null) juese.hp = Math.min(juese.maxHp, juese.hp);
    },
    // 🆓 重置自由属性点（回收已分配点数；力量的生命加成同步回收）
    resetAttrPoints() {
      const player = this.pixi.player;
      const juese = player.juese;
      const alloc = juese.attrAlloc || {};
      const spent = Object.values(alloc).reduce((s, n) => s + (n || 0), 0);
      if (spent <= 0) return { ok: false, msg: '没有已分配的属性点' };
      // 💪 力量派生：maxHp 随 strength 归零自动回退（由 syncMaxHp 统一派生，不再手动加减）
      juese.baseAttack = Math.max(0, (juese.baseAttack || 0) - (alloc.attack || 0));
      juese.attack = juese.baseAttack;
      juese.baseArmor = Math.max(0, (juese.baseArmor || 0) - (alloc.armor || 0));
      juese.armor = juese.baseArmor;
      juese.baseMagicResist = Math.max(0, (juese.baseMagicResist ?? 10) - (alloc.magicResist || 0));
      juese.baseSpeed = Math.max(0, (juese.baseSpeed || 0) - (alloc.speed || 0));
      juese.baseLuck = Math.max(0, (juese.baseLuck || 0) - (alloc.luck || 0));
      juese.strength = 0;
      juese.intelligence = 0;
      juese.elementMastery = 0;
      juese.attrAlloc = {};
      player.freeAttrPoints = (player.freeAttrPoints || 0) + spent;
      this.syncMaxHp(); // 💪 力量归零：派生 maxHp 自动回退 + hp 钳制
      return { ok: true, left: player.freeAttrPoints };
    },
    addNpcAffection(npcImg, amount) {
      const npc = this.pixi.npcSelectList.find(n => n.img === npcImg)
      if (!npc) return false


      npc.affection = Math.max(0, npc.affection + amount) // 💗 无上限（显示时封顶 100）

      // 🔄 同步到同伴展示列表（保持两份数据一致：喂食弹窗 / 同伴查看即时刷新）
      const allyEntry = (this.pixi.allyList || []).find(x => x.img === npcImg)
      if (allyEntry) allyEntry.affection = npc.affection

      // 检查并解锁达到好感度要求的背景故事
      if (npc.backstories && Array.isArray(npc.backstories)) {
        npc.backstories.forEach(story => {
          if (!story.unlocked && npc.affection >= story.unlockAffection) {
            story.unlocked = true
          }
        })
      }

      // 💗 好感度达标（50/100）：自动永久提升同伴属性
      this.applyNpcAffectionBonus?.(npcImg)

      return npc.affection
    },

    /**
     * 💗 同步好感度属性加成（幂等）
     * 好感度达到 50 / 100 时永久提升同伴属性（写入 allyBattleData 的 baseAttack/baseSpeed）；
     * 每个档位只生效一次，通过 cfg.affectionBonusApplied 记录已应用档位（旧档缺失时自动补发）。
     * 累计加成数额记录在 cfg.affectionAttackBonus / cfg.affectionSpeedBonus（供界面展示）。
     * @param {string} npcImg - 同伴 img
     * @returns {{applied:boolean, attackGain:number, speedGain:number, tier:number}|null} 无此人/无战斗配置返回 null
     */
    applyNpcAffectionBonus(npcImg) {
      const npc = this.pixi.npcSelectList?.find(n => n.img === npcImg)
      if (!npc) return null
      const cfg = this.getAllyBattleData(npcImg)
      if (!cfg) return null

      const affection = npc.affection ?? 0
      const applied = new Set(cfg.affectionBonusApplied || [])
      let attackGain = 0
      let speedGain = 0
      let lastTier = 0

      for (const t of AFFECTION_BONUS_TIERS) {
        if (affection < t.threshold) continue      // 未达标
        if (applied.has(t.threshold)) continue     // 已应用过该档

        const baseAtk = cfg.baseAttack ?? 14
        const baseSpd = cfg.baseSpeed ?? 100
        const atk = Math.floor(baseAtk * t.attackPct)
        const spd = Math.floor(baseSpd * t.speedPct)
        cfg.baseAttack = baseAtk + atk
        cfg.baseSpeed = baseSpd + spd
        cfg.affectionBonusApplied = [...(cfg.affectionBonusApplied || []), t.threshold]
        cfg.affectionAttackBonus = (cfg.affectionAttackBonus || 0) + atk
        cfg.affectionSpeedBonus = (cfg.affectionSpeedBonus || 0) + spd
        attackGain += atk
        speedGain += spd
        lastTier = t.threshold
        console.log(`[羁绊] ${npc.name} 好感度达到 ${t.threshold}：攻击力 +${atk}、速度 +${spd}`)
      }
      return { applied: lastTier > 0, attackGain, speedGain, tier: lastTier }
    },

    /**
     * 🔄 为所有 NPC 同步好感度属性加成（读档时调用，兼容旧档已有高好感度的同伴补发加成）
     */
    syncAllNpcAffectionBonus() {
      for (const npc of (this.pixi.npcSelectList || [])) {
        this.applyNpcAffectionBonus?.(npc.img)
      }
    },

    /**
     * 📝 重新生成全部同伴的派生字段（读档后调用）
     * 扁平技能字段（与选中的技能项同步）+ desc / skillList[].skillDesc / passiveDesc（按当前数值动态生成）。
     * 后续调整 DEFAULT_ALLY_BATTLE_DATA 的数值/倍率后读档自动更新，无需手动同步文案与扁平字段。
     */
    syncAllAllyDerivedFields() {
      for (const cfg of Object.values(this.pixi?.allyBattleData || {})) {
        refreshAllyDerivedFields(cfg)
      }
    },
    // 解锁NPC某段背景故事
    unlockNpcBackstory(npcImg, storyId) {
      const npc = this.pixi.npcSelectList.find(n => n.img === npcImg)
      if (!npc || !npc.backstories) return false

      const story = npc.backstories.find(s => s.id === storyId)
      if (story) {
        story.unlocked = true
        return true
      }
      return false
    },
    // 获取NPC好感度等级文字
    getAffectionLevel(affection) {
      return affection
    },
    // 获取NPC信息
    getNpcInfo(npcImg) {
      return this.pixi.npcSelectList.find(n => n.img === npcImg) || null
    },

    // ========== 💗 NPC好感度检测（供对话选项 needAffection 使用） ==========

    /**
     * 获取指定 NPC 的好感度
     * @param {string} npcImg - NPC 的 img（如 'huli' / 'jinmao'）
     * @returns {number} 好感度（0-100，未找到返回 0）
     */
    getNpcAffection(npcImg) {
      return this.pixi.npcSelectList?.find(n => n.img === npcImg)?.affection ?? 0
    },

    /**
     * 检测 NPC 好感度是否达标（支持单个或数组，数组 = 全部达标才通过）
     * @param {Object|Object[]} requirements - { npc: 'huli', min: 50 } 或数组
     * @returns {boolean}
     */
    hasNpcAffection(requirements) {
      const list = Array.isArray(requirements) ? requirements : [requirements]
      if (!list.length) return true
      return list.every(r => {
        if (!r || !r.npc) return true
        return this.getNpcAffection(r.npc) >= (r.min ?? 0)
      })
    },

    // ========== 羁绊系统人物（增删） ==========

    /**
     * ➕ 新增羁绊系统人物（人物图鉴 / npcSelectList）
     * 支持两种用法：
     *   1. addNpcToSelectList({ img: 'jqr', name: '机巧少女', affection: 0, avatarScale: 1, canAlly: true })
     *   2. addNpcToSelectList('jqr')  // 只传 img，自动补默认字段（name 用 img、affection 0、avatarScale 1、canAlly true）
     * 若该 img 已存在：不重复添加（默认行为），可传 { override: true } 覆盖已有条目
     * @param {string|Object} npcData - img 字符串 或 完整人物对象
     * @returns {Object|null} 新增/更新后的人物，失败返回 null
     */
    addNpcToSelectList(npcData) {
      if (!Array.isArray(this.pixi.npcSelectList)) {
        this.pixi.npcSelectList = [];
      }
      // 只传了 img 字符串 → 补默认字段
      let data = typeof npcData === 'string' ? { img: npcData } : (npcData || {});
      if (!data.img) {
        console.warn('[羁绊] 新增人物失败：缺少 img');
        return null;
      }
      const existing = this.pixi.npcSelectList.find(n => n.img === data.img);
      // 已存在且不允许覆盖 → 直接返回现有条目
      if (existing && !data.override) {
        return existing;
      }
      // 组装新条目（保证字段齐全）
      const newNpc = {
        img: data.img,
        name: data.name || data.img,
        affection: data.affection ?? 0,
        avatarScale: data.avatarScale ?? 1,
        canAlly: data.canAlly ?? true,
        // 其余自定义字段（backstories 等）原样透传
        ...(data.backstories ? { backstories: data.backstories } : {}),
      };
      if (existing) {
        // 覆盖模式：替换已有条目内容
        Object.assign(existing, newNpc);
        return existing;
      }
      this.pixi.npcSelectList.push(newNpc);
      console.log(`[羁绊] 新增人物：${newNpc.name}（${newNpc.img}）`);
      return newNpc;
    },

    /**
     * 🏛️ 地牢 NPC → 羁绊系统：玩家在地牢中碰撞（同格触碰）NPC 时记录到人物图鉴/羁绊
     * 莫奇(shangren1) / 里亚(shangren2) 等特殊 NPC 的好感与对话 flag 绑定，同步显示
     * @param {Object} npc - 地牢 npc 对象（含 spineKey / dialogName）
     */
    addDungeonNpcToBond(npc) {
      if (!npc?.spineKey || !Array.isArray(this.pixi?.npcSelectList)) return;
      const img = String(npc.spineKey);
      const MAP = {
        shangren1: { name: '莫奇', flag: 'shangrenFavor' },
        shangren2: { name: '里亚', flag: 'liyaFavor' },
      };
      const info = MAP[img] || { name: npc.dialogName || img, flag: null };
      this.addNpcToSelectList({
        img,
        name: info.name,
        affection: info.flag ? (this.getDialogueFlag(info.flag) || 0) : 0,
        canAlly: false, // 地牢 NPC 不可携带出战
      });
      this.syncDungeonNpcFavor(); // 好感 flag → 羁绊条目
    },

    /**
     * 💗 把莫奇/里亚的好感 flag 同步到羁绊系统条目（保证对话加的好感实时显示在人物图鉴）
     */
    syncDungeonNpcFavor() {
      if (!Array.isArray(this.pixi?.npcSelectList)) return;
      const MAP = {
        shangren1: { flag: 'shangrenFavor' },
        shangren2: { flag: 'liyaFavor' },
      };
      for (const [img, info] of Object.entries(MAP)) {
        const npc = this.pixi.npcSelectList.find(n => n.img === img);
        if (npc) npc.affection = this.getDialogueFlag(info.flag) || 0;
      }
    },

    /**
     * ➖ 删除羁绊系统人物（人物图鉴 / npcSelectList）
     * 若该人物当前正被携带出战（npcAlly），会一并解除携带状态
     * @param {string} npcImg - 人物 img
     * @returns {boolean} 是否删除成功
     */
    removeNpcFromSelectList(npcImg) {
      if (!Array.isArray(this.pixi.npcSelectList)) return false;
      const idx = this.pixi.npcSelectList.findIndex(n => n.img === npcImg);
      if (idx === -1) {
        console.warn(`[羁绊] 删除人物失败：${npcImg} 不存在`);
        return false;
      }
      this.pixi.npcSelectList.splice(idx, 1);
      // 若正携带该人物出战，解除携带
      if (this.pixi.npcAlly === npcImg) {
        this.pixi.npcAlly = null;
      }
      console.log(`[羁绊] 删除人物：${npcImg}`);
      return true;
    },

    // ========== 携带队友系统 ==========

    /**
     * 设置当前携带的队友（世界地图战斗准备面板调用）
     * @param {string|null} npcImg - NPC 的 img（如 'tuzi'），null 表示不带队友
     */
    setNpcAlly(npcImg) {
      this.pixi.npcAlly = npcImg || null
    },

    /**
     * 获取当前携带的队友 img（无则返回 null）
     */
    getNpcAlly() {
      return this.pixi.npcAlly || null
    },

    /**
     * 获取队友战斗属性配置（按 img 查）
     * @param {string} npcImg
     * @returns {Object|null}
     */
    getAllyBattleData(npcImg) {
      if (!npcImg) return null
      return this.pixi.allyBattleData?.[npcImg] || null
    },

    /**
     * 🆕 获取背包中「可投喂给同伴」的物品列表（用于投喂弹窗展示）
     * 根据 FEEDABLE_ITEMS 配置筛选背包 inventory，返回 { name, num, expGain, img, miaoshu }
     * @returns {Array}
     */
    getFeedableItems() {
      const items = []
      for (const [name, expGain] of Object.entries(FEEDABLE_ITEMS)) {
        const inv = (this.inventory || []).find(i => i.name === name)
        if (inv && inv.num > 0) {
          items.push({
            name,
            num: inv.num,
            expGain,
            img: inv.img || '',
            miaoshu: inv.miaoshu || '',
          })
        }
      }
      return items
    },

    /**
     * 📈 获取同伴等级上限（供界面显示/判断满级用）
     * @returns {number}
     */
    getMaxAllyLevel() {
      return LEVEL_UP_CFG.ally.maxLevel ?? MAX_ALLY_LEVEL;
    },

    /**
     * 📈 获取玩家等级上限（供界面显示/判断满级用）
     * ⛔ 固定上限：玩家最大等级 = LEVEL_UP_CFG.player.maxLevel（当前 30）
     *    突破仅解锁属性/天赋点，永不提升等级上限（10/20/30 级只是升级门槛，突破后仍封顶 30）
     * @returns {number}
     */
    getMaxPlayerLevel() {
      return LEVEL_UP_CFG.player.maxLevel ?? MAX_PLAYER_LEVEL;
    },

    /**
     * 🎭 切换同伴当前选定的技能（持久化，读档保留）
     * @param {string} npcImg - 同伴 img
     * @param {string} skillId - 技能列表中的 id
     * @returns {boolean} 是否切换成功
     */
    setAllySelectedSkill(npcImg, skillId) {
      const cfg = this.getAllyBattleData(npcImg);
      if (!cfg || !Array.isArray(cfg.skillList)) return false;
      const skill = cfg.skillList.find(s => s.id === skillId);
      if (!skill) return false;
      // 记录选中的技能 id
      cfg.selectedSkillId = skillId;
      // 同步扁平技能字段（便于战斗/旧逻辑直接读取；技能项用 name 字段，映射到扁平 skillName）
      const flatKeys = ['skillType', 'skillName', 'skillAnim', 'skillValue', 'skillDuration', 'skillPushback', 'skillCooldown', 'skillInitialCooldown', 'skillDmgType', 'skillDesc'];
      flatKeys.forEach(k => {
        if (k === 'skillName') {
          if (skill.skillName !== undefined) cfg.skillName = skill.skillName;
          else if (skill.name !== undefined) cfg.skillName = skill.name;
          else delete cfg.skillName;
          return;
        }
        if (skill[k] !== undefined) cfg[k] = skill[k];
        else delete cfg[k];
      });
      return true;
    },

    /**
     * 🆕 投喂指定物品给同伴（通用投喂逻辑）
     * 消耗 1 个该物品，给同伴增加对应经验（经验值来自 FEEDABLE_ITEMS 配置）；
     * 满经验自动升级：攻击力 +2、速度 +1，每级 maxExp 递增（初始 50，每级 *1.1）
     * @param {string} npcImg - 同伴 img（如 'tuzi'）
     * @param {string} itemName - 投喂的物品名（如 '魔晶'）
     * @returns {{ok:boolean, leveledUp:boolean, expGain:number, msg:string}}
     */
    /**
     * 🍎 玩家食用食物（提升玩家经验）
     * 消耗 1 个该食物，调用 addExp 增加玩家经验并自动升级
     * @param {string} itemName - 食物名（如 '果实'）
     * @returns {{ok:boolean, expGain:number, leveledUp:boolean, newLevel:number, msg:string}}
     */
    eatFoodItem(itemName) {
      const expGain = this.getEatExp(itemName)
      if (expGain == null || expGain === 0) {
        return { ok: false, expGain: 0, leveledUp: false, newLevel: this.pixi?.player?.Level ?? 1, msg: `「${itemName}」不能食用` }
      }
      // 检查背包中是否有该食物
      const invItem = (this.inventory || []).find(i => i.name === itemName)
      if (!invItem || invItem.num <= 0) {
        return { ok: false, expGain, leveledUp: false, newLevel: this.pixi?.player?.Level ?? 1, msg: `没有「${itemName}」，无法食用` }
      }
      // 消耗 1 个
      invItem.num--
      if (invItem.num <= 0) {
        const idx = this.inventory.indexOf(invItem)
        if (idx > -1) this.inventory.splice(idx, 1)
      }
      // 增加玩家经验（addExp 内部处理升级 + 装备经验加成）
      const res = this.addExp(expGain)
      return {
        ok: true,
        expGain,
        leveledUp: res.leveledUp,
        newLevel: res.newLevel ?? this.pixi.player.Level,
        msg: `食用了「${itemName}」，经验 +${expGain}${res.leveledUp ? `，升级了！Lv.${res.newLevel}` : ''}`,
      }
    },

    // 🍓 可食用材料回血配置：物品名 → 恢复生命值（优先 ITEM_DEFS.edibleHp，兼容旧存档物品无该字段）
    getEdibleHp(itemName) {
      const d = ITEM_DEFS[itemName] || (DEFAULT_inventory || []).find(x => x.name === itemName) || {}
      return d.edibleHp ?? 0
    },
    isEdibleHpItem(itemName) {
      return this.getEdibleHp(itemName) > 0
    },
    /**
     * 💚 玩家回血统一入口（非战斗）：所有恢复玩家 juese.hp 的路径都走这里
     * 钳制最大生命；预留 healMult 治疗加成位（后续做治疗加成/治疗暴击只改这一处）
     * @param {number} amount - 恢复量
     * @param {object} opts - { healMult=1 治疗加成倍率, source 来源标识（预留） }
     * @returns {number} 实际恢复量（钳制后，<= amount）
     */
    healPlayer(amount, opts = {}) {
      const j = this.pixi?.player?.juese
      if (!j || !(j.maxHp > 0) || !(amount > 0)) return 0
      const mult = typeof opts.healMult === 'number' ? opts.healMult : 1
      const oldHp = j.hp ?? 0
      j.hp = Math.min(j.maxHp, oldHp + amount * mult)
      return Math.max(0, j.hp - oldHp)
    },

    /**
     * 🍓 食用恢复生命物品（消耗 1 个，恢复 hp 点生命值，不超过最大生命）
     * @param {string} itemName - 物品名（如 '赤莓'）
     * @param {number} hp - 恢复的生命值
     * @returns {{ok:boolean, heal:number, msg:string}}
     */
    eatFoodHpItem(itemName, hp) {
      const invItem = (this.inventory || []).find(i => i.name === itemName)
      if (!invItem || invItem.num <= 0) {
        return { ok: false, heal: 0, msg: `没有「${itemName}」，无法食用` }
      }
      // 消耗 1 个
      invItem.num--
      if (invItem.num <= 0) {
        const idx = this.inventory.indexOf(invItem)
        if (idx > -1) this.inventory.splice(idx, 1)
      }
      // 恢复生命值（统一走 healPlayer：钳制最大生命 + 治疗加成预留）
      this.healPlayer(hp)
      return { ok: true, heal: hp, msg: `食用了「${itemName}」，恢复 ${hp} 点生命值` }
    },

    feedAllyItem(npcImg, itemName) {
      const cfg = this.getAllyBattleData(npcImg)
      if (!cfg) return { ok: false, leveledUp: false, expGain: 0, msg: '该同伴不存在' }

      // 该物品是否可投喂
      const expGain = this.getFeedExp(itemName)
      if (expGain == null || expGain === 0) {
        return { ok: false, leveledUp: false, expGain: 0, msg: `「${itemName}」不能投喂给同伴` }
      }

      // 检查背包中是否有该物品
      const invItem = (this.inventory || []).find(i => i.name === itemName)
      if (!invItem || invItem.num <= 0) {
        return { ok: false, leveledUp: false, expGain, msg: `没有「${itemName}」，无法投喂` }
      }

      // 消耗 1 个
      invItem.num--
      if (invItem.num <= 0) {
        const idx = this.inventory.indexOf(invItem)
        if (idx > -1) this.inventory.splice(idx, 1)
      }

      // 💗 普通投喂成功：按 FEED_AFFECTION_GAIN 配置加好感度（默认 0 = 不加）
      this.addNpcAffection?.(npcImg, FEED_AFFECTION_GAIN[itemName] || 0)

      // 补全字段（防旧档缺失）
      if (cfg.level == null) cfg.level = 1
      if (cfg.exp == null) cfg.exp = 0
      if (cfg.maxExp == null) cfg.maxExp = allyExpBase(npcImg)

      // 加经验
      cfg.exp += expGain
      let leveledUp = false

      // 📈 若已满级：经验不再升级，全部累积到溢出经验池
      //    （下次版本提高 MAX_ALLY_LEVEL 上限后，读档会自动用溢出经验突破等级）
      if (cfg.level >= (LEVEL_UP_CFG.ally.maxLevel ?? MAX_ALLY_LEVEL)) {
        cfg.overflowExp = (cfg.overflowExp || 0) + expGain
        cfg.exp = cfg.maxExp // 满级显示为满经验
        return {
          ok: true,
          leveledUp: false,
          expGain,
          level: cfg.level,
          exp: cfg.exp,
          maxExp: cfg.maxExp,
          overflowExp: cfg.overflowExp,
          msg: `已满级（Lv.${cfg.level}），经验 +${expGain} 已存入溢出池（共 ${cfg.overflowExp}）`,
        }
      }

      // 检查是否升级（可能连升多级）（🎓 数值来自 LEVEL_UP_CFG.ally，dladmin「升级编辑」可改）
      const _ag = (LEVEL_UP_CFG.ally.growth || {})[npcImg] || {}
      const _atkG = _ag.attack ?? 2, _spdG = _ag.speed ?? 1
      const _allyMaxLv = LEVEL_UP_CFG.ally.maxLevel ?? MAX_ALLY_LEVEL
      while (cfg.exp >= cfg.maxExp) {
        cfg.exp -= cfg.maxExp
        cfg.level += 1
        leveledUp = true
        // 升级属性：攻击力 +_atkG、速度 +_spdG
        cfg.baseAttack = Math.floor((cfg.baseAttack || 0) + _atkG)
        cfg.baseSpeed = Math.floor((cfg.baseSpeed || 0) + _spdG)
        // 最大经验逐级递增（expBase + 当前所需 × expMult）
        cfg.maxExp = Math.floor(allyExpBase(npcImg) + cfg.maxExp * allyExpMult(npcImg))
        // 📈 等级上限（🎓 LEVEL_UP_CFG.ally.maxLevel）
        if (cfg.level >= _allyMaxLv) {
          // 到达上限：剩余经验累积到溢出经验池（下次更新提高上限后自动突破等级）
          if (cfg.exp > 0) {
            cfg.overflowExp = (cfg.overflowExp || 0) + cfg.exp
          }
          cfg.exp = cfg.maxExp // 满级显示为满经验
          break
        }
      }

      return {
        ok: true,
        leveledUp,
        expGain,
        level: cfg.level,
        exp: cfg.exp,
        maxExp: cfg.maxExp,
        overflowExp: cfg.overflowExp || 0,
        msg: leveledUp
          ? `投喂「${itemName}」经验 +${expGain}！升级了！Lv.${cfg.level}，攻击力+${_atkG}、速度+${_spdG}`
          : `投喂「${itemName}」经验 +${expGain}（${cfg.exp}/${cfg.maxExp}）`,
      }
    },

    /**
     * ⚔️ 战斗胜利给携带队友加经验（不吃主角经验倍率：道具/天赋加成不参与）
     * 升级逻辑与投喂一致（经验公式/成长/满级/溢出池均读 LEVEL_UP_CFG.ally 按角色配置）
     * @param {string} npcImg - 同伴 img（如 'tuzi'）
     * @param {number} expGain - 基础经验（不加任何倍率）
     */
    addAllyExp(npcImg, expGain) {
      const cfg = this.pixi?.allyBattleData?.[npcImg]
      if (!cfg) return { ok: false, leveledUp: false, expGain: 0, msg: '该同伴不存在' }
      const g = Math.max(0, Math.floor(Number(expGain) || 0))
      if (g <= 0) return { ok: false, leveledUp: false, expGain: 0, msg: '' }
      if (cfg.level == null) cfg.level = 1
      if (cfg.exp == null) cfg.exp = 0
      if (cfg.maxExp == null) cfg.maxExp = allyExpBase(npcImg)
      // 📊 记录加经验前状态（供战斗结算界面显示涨幅）
      const prevLevel = cfg.level, prevExp = cfg.exp, prevMaxExp = cfg.maxExp
      cfg.exp += g
      let leveledUp = false
      let gainAtk = 0, gainSpd = 0
      // 📈 满级：全部累积到溢出经验池
      if (cfg.level >= (LEVEL_UP_CFG.ally.maxLevel ?? MAX_ALLY_LEVEL)) {
        cfg.overflowExp = (cfg.overflowExp || 0) + g
        cfg.exp = cfg.maxExp
        return {
          ok: true, leveledUp: false, expGain: g, level: cfg.level, exp: cfg.exp,
          maxExp: cfg.maxExp, overflowExp: cfg.overflowExp,
          prevLevel, prevExp, prevMaxExp, gains: { attack: 0, speed: 0 },
          msg: '已满级（Lv.' + cfg.level + '），经验 +' + g + ' 已存入溢出池（共 ' + cfg.overflowExp + '）',
        }
      }
      const _ag = (LEVEL_UP_CFG.ally.growth || {})[npcImg] || {}
      const _atkG = _ag.attack ?? 2, _spdG = _ag.speed ?? 1
      const _allyMaxLv = LEVEL_UP_CFG.ally.maxLevel ?? MAX_ALLY_LEVEL
      while (cfg.exp >= cfg.maxExp) {
        cfg.exp -= cfg.maxExp
        cfg.level += 1
        leveledUp = true
        cfg.baseAttack = Math.floor((cfg.baseAttack || 0) + _atkG)
        cfg.baseSpeed = Math.floor((cfg.baseSpeed || 0) + _spdG)
        gainAtk += _atkG
        gainSpd += _spdG
        cfg.maxExp = Math.floor(allyExpBase(npcImg) + cfg.maxExp * allyExpMult(npcImg))
        if (cfg.level >= _allyMaxLv) {
          if (cfg.exp > 0) cfg.overflowExp = (cfg.overflowExp || 0) + cfg.exp
          cfg.exp = cfg.maxExp
          break
        }
      }
      return {
        ok: true, leveledUp, expGain: g, level: cfg.level, exp: cfg.exp,
        maxExp: cfg.maxExp, overflowExp: cfg.overflowExp || 0,
        prevLevel, prevExp, prevMaxExp, gains: { attack: gainAtk, speed: gainSpd },
        msg: leveledUp ? '战斗历练！' + (cfg.name || npcImg) + ' Lv.' + cfg.level + '，攻击力+' + gainAtk + '、速度+' + gainSpd : '',
      }
    },

    /**
     * 投喂魔晶提升同伴等级（兼容旧接口，内部走通用投喂）
     * @param {string} npcImg - 同伴 img（如 'tuzi'）
     */
    feedAllyCrystal(npcImg) {
      return this.feedAllyItem(npcImg, '魔晶LV1')
    },

    /**
     * 获取当前携带队友的战斗属性配置（无则返回 null）
     */
    getCurrentAllyBattleData() {
      const ally = this.getNpcAlly()
      if (!ally) return null
      return this.getAllyBattleData(ally)
    },

    /**
     * 👥 获取同伴展示列表（独立于地图 NPC）
     * 「同伴查看」界面用这个列表展示，不再与 npcDataList（地图实体）绑定——
     * 即使地图上的 NPC 被删除/隐藏，只要在 pixi.allyList 里就仍会显示。
     * 返回带展示信息的数组：{ img, name, affection, avatarScale, canAlly, level, exp, maxExp, attack, armor, speed, maxHp, color }
     */
    getAllyList() {
      const list = this.pixi.allyList || [];
      return list.map(a => {
        const bd = this.pixi.allyBattleData?.[a.img] || {};
        const info = this.pixi.npcSelectList?.find(n => n.img === a.img) || {};
        return {
          img: a.img,
          name: a.name || info.name || bd.name || a.img,
          affection: info.affection ?? a.affection ?? 0, // 💗 npcSelectList 为权威来源（addNpcAffection 更新后即时生效）
          avatarScale: a.avatarScale ?? info.avatarScale ?? 1,
          canAlly: info.canAlly ?? a.canAlly ?? true, // 💗 以 npcSelectList 为准（setNpcCanAlly 后即时生效，同伴查看只显示可携带）
          level: bd.level ?? 1,
          exp: bd.exp ?? 0,
          maxExp: bd.maxExp ?? 50,
          attack: bd.attack ?? bd.baseAttack ?? 0,
          armor: bd.armor ?? bd.baseArmor ?? 0,
          speed: bd.speed ?? bd.baseSpeed ?? 0,
          maxHp: bd.maxHp ?? 0,
          color: NPC_NAME_COLORS[a.img] || '#409EFF',
        };
      });
    },

    /**
     * 👥 把一个 NPC 加入同伴展示列表（从 npcSelectList + allyBattleData 构建）
     * 用于在剧情/对话等时机动态把某个角色加入「同伴查看」
     * @param {string} npcImg - NPC 的 img（如 'tuzi'）
     * @returns {Object|null} 加入后的条目，已存在则返回现有条目，无战斗配置返回 null
     */
    addAllyToDisplay(npcImg) {
      if (!npcImg) return null;
      // 🔓 加入即解锁人物图鉴（剧情解锁角色，如黑米）
      const selInfo = this.pixi.npcSelectList?.find(n => n.img === npcImg);
      if (selInfo) selInfo.unlocked = true;
      if (!Array.isArray(this.pixi.allyList)) this.pixi.allyList = [];
      const exist = this.pixi.allyList.find(a => a.img === npcImg);
      if (exist) return exist;
      // 必须有战斗配置，否则不算同伴
      if (!this.pixi.allyBattleData?.[npcImg]) return null;
      const info = this.pixi.npcSelectList?.find(n => n.img === npcImg) || {};
      const entry = {
        img: npcImg,
        name: info.name || this.pixi.allyBattleData[npcImg].name || npcImg,
        affection: info.affection ?? 0,
        avatarScale: info.avatarScale ?? 1,
        canAlly: info.canAlly ?? true,
      };
      this.pixi.allyList.push(entry);
      console.log(`[同伴] 已加入展示列表：${entry.name}（${npcImg}）`);
      return entry;
    },

    /**
     * 👥 把一个 NPC 从同伴展示列表移除
     * 若该 NPC 当前正被携带出战（npcAlly），会一并解除携带
     * @param {string} npcImg - NPC 的 img
     * @returns {boolean}
     */
    removeAllyFromDisplay(npcImg) {
      if (!Array.isArray(this.pixi.allyList)) return false;
      const idx = this.pixi.allyList.findIndex(a => a.img === npcImg);
      if (idx === -1) return false;
      this.pixi.allyList.splice(idx, 1);
      if (this.pixi.npcAlly === npcImg) {
        this.pixi.npcAlly = null;
      }
      console.log(`[同伴] 已从展示列表移除：${npcImg}`);
      return true;
    },

    /**
     * 🔄 同步同伴展示列表（每次读档/新游戏时调用）
     * 保证 pixi.allyList 包含「所有默认可携带同伴」：
     *   - 把 npcSelectList 中「默认展示」（defaultAlly !== false）且有战斗配置的 NPC 自动加入展示列表
     *   - 剧情解锁的角色（如黑米 defaultAlly: false）不自动补，需在入队剧情里用 addAllyToDisplay 显式加入
     *   - 保留列表里已有的自定义顺序/条目（不重复添加）
     *   - 清理掉已失去战斗配置的残留条目
     */
    syncAllyList() {
      // ⚔️ 普通模式（无剧情）：不解锁任何同伴（图鉴保持锁定、同伴列表清空、不携带出战）
      if (this.pixi?.gameMode === 'normal') {
        if (Array.isArray(this.pixi.allyList)) this.pixi.allyList = [];
        (this.pixi.npcSelectList || []).forEach(n => { n.unlocked = false; });
        this.pixi.npcAlly = null;
        return this.pixi.allyList;
      }
      if (!Array.isArray(this.pixi.allyList)) this.pixi.allyList = [];
      const battleDataMap = this.pixi.allyBattleData || {};
      // 1. 清理：展示列表里已无战斗配置的条目移除
      this.pixi.allyList = this.pixi.allyList.filter(a => battleDataMap[a.img] != null);
      // 2. 补齐：npcSelectList 中「默认展示」且可携带且有战斗配置的 NPC
      //    （defaultAlly 缺省视为 true；黑米 defaultAlly: false 不会自动加入）
      const existing = new Set(this.pixi.allyList.map(a => a.img));
      for (const npc of (this.pixi.npcSelectList || [])) {
        if (npc.defaultAlly === false) continue;      // 剧情解锁角色，不自动展示
        if (npc.canAlly === false) continue;
        if (existing.has(npc.img)) continue;
        if (battleDataMap[npc.img] == null) continue;
        this.pixi.allyList.push({
          img: npc.img,
          name: npc.name || battleDataMap[npc.img].name || npc.img,
          affection: npc.affection ?? 0,
          avatarScale: npc.avatarScale ?? 1,
          canAlly: npc.canAlly ?? true,
        });
      }
      // 🔓 同步解锁状态：已在同伴展示列表（已入队）的 NPC 视为已解锁（兼容旧档 / 读档）
      const allyImgs = new Set(this.pixi.allyList.map(x => x.img));
      for (const npc of (this.pixi.npcSelectList || [])) {
        if (allyImgs.has(npc.img)) npc.unlocked = true;
      }
      return this.pixi.allyList;
    },

    /**
     * 获取「地图实体制」可携带同伴列表：
     * 只返回当前 npcDataList 中真实存在、且可携带（实体 canAlly）并配置了战斗属性（allyBattleData）的 NPC，
     * 并与 npcSelectList 的基础信息（名字/好感度/头像）合并。
     * 每个元素：{ img, name, affection, avatarScale, canAlly, npcData }
     */
    getMapAllyList() {
      const list = this.pixi.npcDataList || []
      const battleDataMap = this.pixi.allyBattleData || {}
      // juese -> img 的反查表（allyBattleData 里的 juese 字段对应主世界 spine 骨骼名）
      const jueseToImg = {}
      for (const img of Object.keys(battleDataMap)) {
        const bd = battleDataMap[img]
        if (bd?.juese) jueseToImg[bd.juese] = img
      }
      const result = []
      const seen = new Set() // 同 img 只出现一次（地图上可能有多只同骨骼 NPC）
      for (const npc of list) {
        // 排除战斗中的临时队友（matter.vue 会往 npcDataList 追加 id=9001 的战斗实体）
        if (npc.isBattleAlly) continue
        // 拿到该 NPC 对应的 img：优先 npc.allyImg，其次通过 juese 反查
        const img = npc.allyImg || jueseToImg[npc.juese]
        if (!img || seen.has(img)) continue
        // 实体明确不可携带则跳过
        if (npc.canAlly === false) continue
        // 必须有战斗属性配置，才能作为队友出战
        const battleData = battleDataMap[img]
        if (!battleData) continue
        seen.add(img)
        // 从图鉴补充基础信息
        const info = this.pixi.npcSelectList?.find(n => n.img === img) || {}
        result.push({
          img,
          name: battleData.name || info.name || npc.data?.name || img,
          affection: info.affection ?? 0,
          avatarScale: info.avatarScale ?? 1,
          canAlly: true,
          npcData: npc, // 指向地图实体，方便追踪
        })
      }
      return result
    },

    /**
     * 设置 NPC 是否可携带出战（创建 NPC 时可调用）
     * @param {string} npcImg - NPC 的 img
     * @param {boolean} canAlly - 是否可携带，默认 true
     * @returns {Object|null} 更新后的 NPC 信息
     */
    setNpcCanAlly(npcImg, canAlly = true) {
      const npc = this.pixi.npcSelectList.find(n => n.img === npcImg)
      if (!npc) return null
      npc.canAlly = canAlly
      // 若 NPC 被设为不可携带，且当前正携带它，则自动清除携带状态
      if (!canAlly && this.pixi.npcAlly === npcImg) {
        this.pixi.npcAlly = null
      }
      return npc
    },

    /**
     * 判断 NPC 是否可携带出战（无 canAlly 字段时默认可携带）
     * @param {string} npcImg
     * @returns {boolean}
     */
    canNpcAlly(npcImg) {
      const npc = this.pixi.npcSelectList.find(n => n.img === npcImg)
      return npc ? (npc.canAlly !== false) : false
    },

    // ========== 对话系统相关方法 ==========

    /**
     * 设置对话标记
     */
    setDialogueFlag(key, value = true) {
      this.pixi.dialogueFlags[key] = value
    },

    /**
     * 获取对话标记
     */
    getDialogueFlag(key) {
      return this.pixi.dialogueFlags?.[key] || false
    },

    // ⛔ 讨伐战已移除：getUnlockedDepthByScene / unlockDepthByScene /
    //    setBattleDepthByScene / getBattleDepthByScene（按战斗场景深入度系统）已删除

    /**
     * 记录对话选择
     */
    recordDialogueChoice(dialogueId, optionIndex, optionText) {
      this.pixi.choiceHistory.push({
        dialogueId,
        optionIndex,
        optionText,
        timestamp: Date.now()
      })
    },

    /**
     * 检查是否选择过某个对话选项
     */
    hasChosenOption(dialogueId, optionIndex) {
      return this.pixi.choiceHistory?.some(
        c => c.dialogueId === dialogueId && c.optionIndex === optionIndex
      ) || false
    },

    /**
     * 标记对话完成
     */
    markDialogueComplete(dialogueId) {
      this.pixi.dialogueProgress[dialogueId] = {
        completed: true,
        completedAt: Date.now(),
        completedDay: this.pixi.player?.day ?? 1, // 记录完成时的天数（用于同一天内互斥判断）
      }
    },

    /**
     * 检查对话是否完成
     */
    isDialogueComplete(dialogueId) {
      return this.pixi.dialogueProgress?.[dialogueId]?.completed || false
    },

    /**
     * 重置指定对话的进度（清空 dialogueProgress 中的记录）
     * 支持传单个 id 或 id 数组
     * 用例：每天重置 NPC 日常对话，让 one01 可以重新触发
     */
    resetDialogueProgress(dialogueId) {
      if (Array.isArray(dialogueId)) {
        dialogueId.forEach(id => {
          delete this.pixi.dialogueProgress[id];
        });
      } else {
        delete this.pixi.dialogueProgress[dialogueId];
      }
    },

    /**
     * 清空所有对话进度
     */
    resetAllDialogueProgress() {
      this.pixi.dialogueProgress = {};
    },

    /**
     * 重置指定对话的选项选择记录（让变灰的选项恢复可点）
     * 支持传单个 dialogueId 或 id 数组
     */
    resetChoiceHistory(dialogueId) {
      if (Array.isArray(dialogueId)) {
        this.pixi.choiceHistory = this.pixi.choiceHistory.filter(
          c => !dialogueId.includes(c.dialogueId)
        );
      } else {
        this.pixi.choiceHistory = this.pixi.choiceHistory.filter(
          c => c.dialogueId !== dialogueId
        );
      }
    },

    /**
     * 清空所有选项选择记录
     */
    resetAllChoiceHistory() {
      this.pixi.choiceHistory = [];
    },

    /**
     * 获取对话存档数据
     */
    getDialogueSaveData() {
      return {
        dialogueFlags: { ...this.pixi.dialogueFlags },
        choiceHistory: [...this.pixi.choiceHistory],
        dialogueProgress: { ...this.pixi.dialogueProgress }
      }
    },

    /**
     * 加载对话存档数据
     */
    loadDialogueSaveData(saveData) {
      if (!saveData) return

      if (saveData.dialogueFlags) {
        this.pixi.dialogueFlags = { ...saveData.dialogueFlags }
      }
      if (saveData.choiceHistory) {
        this.pixi.choiceHistory = [...saveData.choiceHistory]
      }
      if (saveData.dialogueProgress) {
        this.pixi.dialogueProgress = { ...saveData.dialogueProgress }
      }
    },

    /**
     * 显示对话
     */
    showDialogue() {
      this.pixi.duihua = true
    },

    /**
     * 隐藏对话
     */
    hideDialogue() {
      this.pixi.duihua = false
    },

    // ========== 对话系统方法结束 ==========

    // ========== 🎒 背包物品检测 / 消耗（供对话选项等使用） ==========

    /**
     * 获取背包中某物品的数量
     * @param {string} name - 物品名
     * @returns {number}
     */
    getInventoryItemNum(name) {
      return (this.inventory || []).find(i => i.name === name)?.num || 0
    },

    /**
     * 检测背包是否拥有指定物品（支持单个名称或数组）
     * @param {string|string[]} names - 物品名（数组 = 全部都要有）
     * @param {number} [num=1] - 每种物品至少需要的数量
     * @returns {boolean}
     */
    hasInventoryItem(names, num = 1) {
      const list = Array.isArray(names) ? names : [names]
      if (!list.length) return true
      return list.every(n => this.getInventoryItemNum(n) >= num)
    },

    /**
     * 消耗背包物品（支持单个名称或数组；数量不足时不消耗任何物品并返回 false）
     * @param {string|string[]} names - 物品名（数组 = 依次消耗每种）
     * @param {number} [num=1] - 每种物品消耗的数量
     * @returns {boolean} 是否成功消耗
     */
    consumeInventoryItem(names, num = 1) {
      const list = Array.isArray(names) ? names : [names]
      if (!list.length) return true
      // 先整体检查是否足够，不足则不消耗（避免部分扣除）
      if (!this.hasInventoryItem(list, num)) return false
      for (const n of list) {
        const inv = (this.inventory || []).find(i => i.name === n)
        if (!inv) continue
        inv.num -= num
        if (inv.num <= 0) {
          const idx = this.inventory.indexOf(inv)
          if (idx > -1) this.inventory.splice(idx, 1)
        }
      }
      return true
    },

    /**
     * 休息：进入下一天（天数+1、恢复生命、触发昼夜CG、重置每日对话选项）
     */
    restAndRestoreActionPoints() {
      this.enterNextDay();
    },

    /**
     * 🌅 进入下一天：天数+1、恢复生命、触发昼夜CG、重置每日对话选项
     */
    enterNextDay() {
      this.pixi.player.day++;
      // 📜 主线任务「邪魔苏醒」：达到第 15 天自动完成（迎击苏醒的邪魔）
      try {
        const demonTask = (this.allTasks?.mainTasks || []).find(t => t.id === 'main_demon_awaken');
        if (demonTask && !demonTask.isCompleted && this.pixi.player.day >= 15) {
          const step = (demonTask.steps || []).find(s => !s.isCompleted);
          if (step) this.completeTaskStep('main_demon_awaken', step.id);
        }
      } catch (e) { /* 任务缺失/异常不影响过天 */ }
      this.pixi.player.juese.hp = Math.min(this.pixi.player.juese.hp + this.pixi.player.juese.maxHp * 1, this.pixi.player.juese.maxHp)
      this.pixi.dayCgTrigger = true;
      ElMessText("休息完毕，生命值已恢复", "success");
      // 重置每日对话选项（让"每天一次"的选项恢复可选）
      // 这些节点 id 共享选项状态：hl50/hl51、yu50/yu51、jinmao50/jinmao51
      // 仅当完成过初次相遇（dayo300）后才重置，避免未相遇前提前解锁日常对话
      emitter.emit('resetDailyDialogueChoices', {
        ids: ['hl50', 'yu50', 'jinmao50']
      });
    },


    //技能加点
    levelUpSkill(index) {
      if (this.skillData.points > 0) {
        this.skillData.list[index].level++
        this.skillData.points--
      }
    },

    /**
     * 检查是否已激活某个天赋（包括普通激活和可升级天赋）
     */
    hasTalent(talentId) {
      // 检查普通天赋列表
      if (this.pixi.player.activatedTalents?.includes(talentId)) return true
      // 检查可升级天赋（等级 ≥ 1 视为已激活）
      if (this.getTalentLevel(talentId) >= 1) return true
      return false
    },

    /**
     * 获取可升级天赋的当前等级（1 起，0 表示未激活）
     */
    getTalentLevel(talentId) {
      return this.pixi.player.talentLevels?.[talentId] || 0
    },

    /**
     * 获取天赋配置中的战斗效果数值（effect 字段，dladmin「编辑天赋」页可改）
     * 未配置返回 undefined，调用方沿用代码默认值
     */
    getTalentEffect(talentId, key) {
      const t = this.talentConfig.find(x => x.id === talentId)
      return t?.effect?.[key]
    },

    /**
     * 热刷新天赋配置（dladmin「编辑天赋」保存写入后调用，避免整页刷新）
     */
    async refreshTalentConfig() {
      try {
        const resp = await fetch('/src/store/counter-store.js?t=' + Date.now())
        const src = await resp.text()
        const m = src.match(/const DEFAULT_TALENT_CONFIG_SNAPSHOT = \[[\s\S]*?^        \];/m)
        if (!m) return false
        const arrText = m[0].slice(m[0].indexOf('[') + 1, m[0].lastIndexOf(']'))
        this.talentConfig = Function('return [' + arrText + ']')()
        return true
      } catch (e) {
        console.error('[dladmin] 热刷新天赋配置失败', e)
        return false
      }
    },

    /**
     * 检查天赋的前置条件是否满足
     * 前置条件支持两种格式：
     *   - 字符串: 'talentId' 表示需要激活该天赋
     *   - 对象: { id: 'talentId', minLevel: 2 } 表示前置天赋至少达到指定等级
     */
    /**
     * 获取天赋在指定等级应使用的前置条件
     * @param {Object} talent 天赋配置对象
     * @param {number} targetLevel 目标等级（1起）
     * @returns {Array} 前置条件数组
     */
    _getPrereqsForLevel(talent, targetLevel) {
      // 如果配置了 levelPrerequisites 且对应等级有值，使用等级专属前置
      if (talent.levelPrerequisites?.[targetLevel]) {
        return talent.levelPrerequisites[targetLevel]
      }
      // 否则使用默认 prerequisites
      return talent.prerequisites || []
    },

    /** 读取指定属性当前值（用于属性需求判定） */
    getAttrValue(key) {
      const j = this.pixi?.player?.juese || {}
      switch (key) {
        case 'strength': return Number(j.strength) || 0
        case 'intelligence': return Number(j.intelligence) || 0
        case 'elementMastery': return computeUnitAttrs(j).mastery
        case 'charm': return Number(j.charm) || 0
        case 'attack': return Number(j.baseAttack ?? j.attack) || 0
        case 'armor': return Number(j.baseArmor ?? j.armor) || 0
        case 'magicResist': return Number(j.baseMagicResist ?? j.magicResist) || 0
        case 'speed': return Number(j.baseSpeed ?? j.speed) || 0
        case 'luck': return Number(j.baseLuck ?? j.luck) || 0
        default: return 0
      }
    },

    /** 🏆 局外角色经验阈值：第 level 级升到下一级所需经验（与 META_ROLE_CFG 匹配） */
    metaExpNeed(level) {
      return META_ROLE_CFG.expBase + (Math.max(1, level || 1) - 1) * META_ROLE_CFG.expStep;
    },

    /** 🏆 结算本局经验到局外角色（游戏失败返回主界面时调用；防重复结算） */
    settleMetaExp() {
      if (this.runMetaSettled) return null;
      this.runMetaSettled = true;
      const exp = this.runExpGained || 0;
      this.runExpGained = 0;
      if (exp <= 0) return null;
      const role = this.pixi?.player?.role || 'linen';
      if (!this.metaRoles) this.metaRoles = {};
      const rec = (this.metaRoles[role] = this.metaRoles[role] || { exp: 0, level: 1 });
      // 📊 本局经验 → 局外经验按转换率结算（META_ROLE_CFG.expConversionRate，dladmin 可编辑）
      const conv = Number(META_ROLE_CFG.expConversionRate ?? 1);
      rec.exp += Math.round(exp * conv);
      let guard = 0;
      while (rec.level < META_ROLE_CFG.maxLevel && rec.exp >= this.metaExpNeed(rec.level) && guard++ < 100) {
        rec.exp -= this.metaExpNeed(rec.level);
        rec.level++;
      }
      return { role, level: rec.level, exp: rec.exp };
    },

    /** 🏆 局外角色初始属性固定提升（每级 +perLevelStats 对应属性；1 级无加成；返回各属性累计增加值） */
    metaRoleStatBonus(roleId) {
      const lv = this.metaRoles?.[roleId]?.level || 1;
      const s = META_ROLE_CFG.perLevelStats || { attack: 2, maxHp: 20, speed: 1, armor: 1, magicResist: 1 };
      const n = Math.max(0, lv - 1);
      return {
        attack: Math.round((s.attack || 0) * n),
        maxHp: Math.round((s.maxHp || 0) * n),
        speed: Math.round((s.speed || 0) * n),
        armor: Math.round((s.armor || 0) * n),
        magicResist: Math.round((s.magicResist || 0) * n),
      };
    },

    /** 🍀 幸运转化率（0~1）：幸运属性对「对玩家有益概率/收益」的提升系数（收敛式，幸运越高增量越少、永不溢出） */
    getLuckRate() {
      const luck = this.getAttrValue('luck') || 0;
      if (!luck) return 0;
      return ((LEVEL_UP_CFG?.attrRates?.luckDrop ?? 100) / 100) * (luck / (luck + 100));
    },

    /** 🍀 统一幸运概率入口：所有「对玩家有益概率」一律用本函数提升（p × (1+幸运转化率)，上限 100%） */
    luckProb(p) {
      return Math.min(1, (Number(p) || 0) * (1 + this.getLuckRate()));
    },

    canActivateTalent(talentId) {
      const talent = this.talentConfig.find(t => t.id === talentId)
      if (!talent) return false

      // 任务获取型天赋：不可手动激活
      if (talent.autoGranted) return false

      // 确定目标等级：可升级天赋为 nextLevel，普通天赋为 1
      let targetLevel = 1
      if (talent.maxLevel && talent.maxLevel > 1) {
        const curLevel = this.getTalentLevel(talentId)
        if (curLevel >= talent.maxLevel) return false // 已满级
        targetLevel = curLevel + 1
      } else {
        // 普通天赋：已激活则不能再次激活
        if (this.hasTalent(talentId)) return false
      }

      // 获取该等级对应的前置条件
      const prereqs = this._getPrereqsForLevel(talent, targetLevel)

      // 检查前置天赋
      if (prereqs.length > 0) {
        const allPreReqsMet = prereqs.every(preReq => {
          if (typeof preReq === 'string') {
            // 字符串格式：只需激活
            return this.hasTalent(preReq)
          } else if (preReq && preReq.id) {
            // 对象格式：需要最低等级
            const reqLevel = preReq.minLevel || 1
            if (reqLevel <= 1) {
              // minLevel <=1 只需激活即可，用 hasTalent（兼容普通天赋和可升级天赋）
              return this.hasTalent(preReq.id)
            }
            // minLevel > 1 需要检查可升级天赋的具体等级
            return this.getTalentLevel(preReq.id) >= reqLevel
          }
          return false
        })
        if (!allPreReqsMet) return false
      }

      // 🔒 属性需求：任一属性不达标即锁定（支持多条）
      const _attrList = Array.isArray(talent.attrReq) ? talent.attrReq : (talent.attrReq && talent.attrReq.key ? [talent.attrReq] : [])
      for (const _r of _attrList) {
        if (_r && _r.key && this.getAttrValue(_r.key) < (Number(_r.value) || 0)) return false
      }

      // 可升级天赋：检查升级消耗
      if (talent.maxLevel && talent.maxLevel > 1) {
        const cost = talent.levelCost || talent.cost
        if (this.pixi.player.talentPoints < cost) return false
        return true
      }

      // 普通天赋：检查天赋点是否足够
      if (this.pixi.player.talentPoints < talent.cost) return false
      return true
    },

    /**
     * 激活/升级天赋
     */
    activateTalent(talentId) {
      const talent = this.talentConfig.find(t => t.id === talentId)
      if (!talent) return false

      // 任务获取型天赋：不可手动激活
      if (talent.autoGranted) {
        ElMessText("该天赋需要通过任务获取", "warning")
        return false
      }

      // 🔒 属性需求：任一不达标禁止激活（支持多条）
      const _attrList = Array.isArray(talent.attrReq) ? talent.attrReq : (talent.attrReq && talent.attrReq.key ? [talent.attrReq] : [])
      const _attrCN = { strength: '力量', intelligence: '智慧', elementMastery: '元素精通', charm: '魅力', attack: '攻击力', armor: '护甲', magicResist: '魔抗', speed: '速度', luck: '幸运' }
      const _missing = _attrList.filter(r => r && r.key && this.getAttrValue(r.key) < (Number(r.value) || 0))
      if (_missing.length) {
        ElMessText(`${talent.name} 需要${_missing.map(r => `${_attrCN[r.key] || r.key} ${Number(r.value) || 0} 点`).join('、')}`, "warning")
        return false
      }

      // 可升级天赋处理
      if (talent.maxLevel && talent.maxLevel > 1) {
        const curLevel = this.getTalentLevel(talentId)
        if (curLevel >= talent.maxLevel) {
          ElMessText("该天赋已达最高等级", "warning")
          return false
        }
        const cost = talent.levelCost || talent.cost
        if (this.pixi.player.talentPoints < cost) {
          ElMessText("天赋点不足", "warning")
          return false
        }
        // 扣除天赋点
        this.pixi.player.talentPoints -= cost
        // 更新等级
        if (!this.pixi.player.talentLevels) {
          this.pixi.player.talentLevels = {}
        }
        const newLevel = curLevel + 1
        this.pixi.player.talentLevels[talentId] = newLevel

        // ⚔️ 战斗狂热：每级 +4 点力量（常驻面板，不进战斗临时加）
        if (talentId === 'battle_frenzy') {
          const _pf = this.pixi?.player?.juese
          if (_pf) _pf.strength = (_pf.strength || 0) + 4
        }

        // 如果这是首次激活（1级），也加到 activatedTalents 中
        if (!this.pixi.player.activatedTalents) {
          this.pixi.player.activatedTalents = []
        }
        if (!this.pixi.player.activatedTalents.includes(talentId)) {
          this.pixi.player.activatedTalents.push(talentId)
        }

        // const desc = talent.levelDescriptions?.[newLevel - 1] || talent.description
        ElMessText(`升级天赋：${talent.name}`, "success")
        return { leveled: true, newLevel }
      }

      // ===== 普通天赋处理 =====
      // 检查是否已激活
      if (this.hasTalent(talentId)) {
        ElMessText("该天赋已激活", "warning")
        return false
      }

      // 检查天赋点是否足够
      if (this.pixi.player.talentPoints < talent.cost) {
        ElMessText("天赋点不足", "warning")
        return false
      }

      // 扣除天赋点
      this.pixi.player.talentPoints -= talent.cost

      // 添加到已激活列表
      if (!this.pixi.player.activatedTalents) {
        this.pixi.player.activatedTalents = []
      }
      this.pixi.player.activatedTalents.push(talentId)

      // ⚔️ 战斗狂热：每级 +4 点力量（常驻面板，不进战斗临时加）
      if (talentId === 'battle_frenzy') {
        const _pf = this.pixi?.player?.juese
        if (_pf) _pf.strength = (_pf.strength || 0) + 4
      }

      ElMessText(`激活天赋：${talent.name}`, "success")
      return true
    },


    /**
     * 升级时检查是否获得新的天赋点
     */
    checkTalentPointGain(oldLevel, newLevel) {
      // 一共升了多少级，就给多少点
      const gained = newLevel - oldLevel

      if (gained > 0) {
        this.pixi.player.talentPoints += gained
        console.log(`[天赋系统] 等级提升，获得 ${gained} 点天赋点`)
        ElMessText(`获得 ${gained} 点天赋点！`, "success")
      }

      return gained
    },

    /**
     * 获取所有已激活的天赋
     */
    getActivatedTalents() {
      const activated = this.pixi.player.activatedTalents || []
      const talentLevels = this.pixi.player.talentLevels || {}
      return this.talentConfig.filter(t => activated.includes(t.id)).map(t => {
        if (t.maxLevel && t.maxLevel > 1) {
          return { ...t, currentLevel: talentLevels[t.id] || 1 }
        }
        return t
      })
    },

    /**
     * 获取可升级天赋的当前等级描述
     */
    getTalentLevelDescription(talentId) {
      const talent = this.talentConfig.find(t => t.id === talentId)
      if (!talent || !talent.maxLevel || talent.maxLevel <= 1) return null
      const level = this.getTalentLevel(talentId)
      if (level === 0) return '未激活'
      const desc = talent.levelDescriptions?.[level - 1] || talent.description
      return `Lv.${level}/${talent.maxLevel} · ${__fmtTalentText(desc, talent, level)}`
    },
    // ======================================
    // 🔥 等级经验系统
    // ======================================
    /**
     * 增加经验值，自动处理升级
     * @param {number} expAmount - 获得的经验值
     * @returns {Object} 升级信息 { leveledUp: boolean, levelsGained: number, oldLevel: number, newLevel: number }
     */
    addExp(expAmount) {
      const player = this.pixi.player;
      const oldLevel = player.Level;
      let levelsGained = 0;

      // 计算道具经验加成
      const expBonus = this.getEquippedExpBonus();
      // 📈 盈悟灵浆经验加成（最多 30 次 × 3% = 90%，与装备加成叠加）
      const finalExp = Math.floor(expAmount * (1 + expBonus + this.getExpGainBonus()));
      const bonusExp = finalExp - expAmount;

      // 增加经验
      player.exp += finalExp;
      // 🏆 累计本局获得经验（游戏失败返回主界面时结算给局外角色；任务奖励等 addExp 入口一并计入）
      this.runExpGained = (this.runExpGained || 0) + finalExp;
      console.log(`[经验系统] 基础 ${expAmount} 经验，道具加成 +${bonusExp}，共获得 ${finalExp} 经验，当前经验：${player.exp}/${player.maxExp}`);

      // 检查是否升级（可能连升多级）
      while (player.exp >= player.maxExp) {
        // 💎 突破门槛：当前等级到达 10/20/30 且该阶段未突破 → 暂停升级
        //    未突破：额外经验只按 30% 转溢出经验池（突破后 100% 转回经验继续升级）
        const btStage = this.getStageNeededByLevel(player.Level);
        if (btStage != null) {
          const overflow = player.exp - player.maxExp;
          if (overflow > 0) {
            player.overflowExp = (player.overflowExp || 0) + Math.floor(overflow * 0.3);
          }
          player.exp = player.maxExp; // 经验锁定当前等级上限（等突破）
          break;
        }
        player.exp -= player.maxExp;
        this._performLevelUp();
        levelsGained++;

        // 📈 玩家等级上限（固定 30）：突破不提升上限，达到后经验锁定为满经验、溢出归 0
        //    如需调整上限改 LEVEL_UP_CFG.player.maxLevel / configs.MAX_PLAYER_LEVEL，读档自动生效
        if (player.Level >= (LEVEL_UP_CFG.player.maxLevel ?? MAX_PLAYER_LEVEL)) {
          player.exp = player.maxExp;
          player.overflowExp = 0; // 🏁 到达满级封顶：溢出经验归 0
          this.addAchievement('巅峰突破'); // 🏆 到达 30 级成就
          break;
        }
      }

      // 更新身份文字中的等级显示
      this._updateShenfenText();

      const result = {
        leveledUp: levelsGained > 0,
        levelsGained,
        oldLevel,
        newLevel: player.Level
      };

      if (levelsGained > 0) {
        console.log(`[经验系统] 升级了！从 Lv.${oldLevel} 升到 Lv.${player.Level}，共升了 ${levelsGained} 级`);

        // 🔥 检查是否获得天赋点
        this.checkTalentPointGain(oldLevel, player.Level);
      }

      return result;
    },

    // ======================================
    // 💎 等级突破系统
    // ======================================
    /** 根据等级返回需要突破的阶段（10/20/30 → 1/2/3），未到门槛或已突破返回 null */
    getStageNeededByLevel(level) {
      const map = { 10: 1, 20: 2, 30: 3 };
      const stage = map[level];
      if (!stage) return null;
      if ((this.pixi.player.breakthroughLog || []).some(l => l.stage === stage)) return null;
      return stage;
    },
    /** 当前已完成突破阶段数（0-3） */
    getBreakthroughStage() {
      return (this.pixi.player.breakthroughLog || []).length;
    },
    /** 下一个需要突破的阶段（1/2/3），全部完成返回 null */
    getNextBreakthroughStage() {
      const done = new Set((this.pixi.player.breakthroughLog || []).map(l => l.stage));
      for (let st = 1; st <= 3; st++) if (!done.has(st)) return st;
      return null;
    },
    /** 下一突破阶段的目标等级（10/20/30），无则返回 null */
    getNextBreakthroughLevel() {
      const st = this.getNextBreakthroughStage();
      return st ? BREAKTHROUGH_STAGES[st].level : null;
    },
    /** 当前突破阶段配置（下一阶段） */
    getNextBreakthroughCfg() {
      const st = this.getNextBreakthroughStage();
      return st ? { stage: st, ...BREAKTHROUGH_STAGES[st] } : null;
    },
    /** 是否可突破（达到目标等级且该阶段未突破） */
    canBreakthrough() {
      const lv = this.getNextBreakthroughLevel();
      return !!lv && this.pixi.player.Level >= lv;
    },
    /** 计算突破成功率（0-1）：基础率 × 品质因子（1−惩罚）× 材料加成 + 失败补偿；幸运已不再影响突破 */
    calcBreakthroughRate(stage, quality, boosters) {
      const cfg = BREAKTHROUGH_STAGES[stage];
      const qualityFactor = 1 - (BREAKTHROUGH_QUALITY_PENALTY[quality] || 0);
      // 💎 多个特殊材料：成功率以乘法叠加（每个材料 ×(1+加成)），最高 100%
      let rate = cfg.baseRate * qualityFactor;
      for (const n of (boosters || [])) {
        rate *= 1 + this.getBoosterBonus(n, stage);
      }
      // 💎 突破失败补偿：上次失败累积的保底加成（加法，按阶段独立）
      rate += (this.pixi.player.breakthroughFailBuff?.[stage] || 0);
      return Math.max(0.05, Math.min(1, rate));
    },
    /** 材料在该突破阶段的成功率加成（0-1），兼容旧数字格式 */
    getBoosterBonus(name, stage) {
      // 优先读物品条目上的 btBoost 字段（dladmin 可编辑；整数=百分比自动 /100，兼容小数）；无则用兜底表
      const itemDef = ITEM_DEFS[name] || (DEFAULT_inventory || []).find(x => x.name === name);
      const v = itemDef?.btBoost ?? BREAKTHROUGH_BOOSTER_BONUS[name];
      if (v == null) return 0;
      if (typeof v === 'number') return v <= 1 ? v : v / 100;
      const perStage = v[stage] ?? v[1] ?? 0;
      return perStage <= 1 ? perStage : perStage / 100;
    },
    /** 某品质魔晶在该阶段的奖励倍率 */
    _btQualityBonus(stage, quality) {
      return BREAKTHROUGH_QUALITY_BONUS[quality] || 1;
    },
    /** 计算突破奖励预览（不消耗材料） */
    calcBreakthroughPreview(crystalName, boosters) {
      const cfg = this.getNextBreakthroughCfg();
      if (!cfg) return null;
      const quality = CRYSTAL_QUALITY[crystalName] || 0;
      const mult = this._btQualityBonus(cfg.stage, quality);
      const attr = {};
      for (const k in cfg.attr) attr[k] = Math.floor(cfg.attr[k] * mult);
      const talent = Math.max(1, 5 + (quality - 1) * 2); // 💎 突破天赋点固定公式：品质1=5，每+1品质+2
      const rate = this.calcBreakthroughRate(cfg.stage, quality, boosters);
      let passive = null;
      if (quality >= 3) {
        passive = BREAKTHROUGH_PASSIVES[Math.floor(Math.random() * BREAKTHROUGH_PASSIVES.length)];
      }
      return { stage: cfg.stage, quality, attr, talent, rate, compensate: Math.round((this.pixi.player.breakthroughFailBuff?.[cfg.stage] || 0) * 100), passive, level: cfg.level };
    },
    /** 执行突破（消耗魔晶+材料，有成功率） */
    tryBreakthrough(crystalName, boosters) {
      const cfg = this.getNextBreakthroughCfg();
      if (!cfg) return { ok: false, msg: '当前没有可突破的阶段' };
      const quality = CRYSTAL_QUALITY[crystalName] || 0;
      if (!quality) return { ok: false, msg: '请先投入魔晶' };
      boosters = boosters || [];
      for (const n of boosters) {
        const it = this.inventory.find(i => i.name === n);
        if (!it || it.num < 1) return { ok: false, msg: '材料「' + n + '」不足' };
      }
      const crystal = this.inventory.find(i => i.name === crystalName);
      if (!crystal || crystal.num < 1) return { ok: false, msg: '魔晶「' + crystalName + '」不足' };
      const consumeOne = (name) => {
        const it = this.inventory.find(i => i.name === name);
        if (!it) return;
        it.num -= 1;
        if (it.num <= 0) {
          const idx = this.inventory.indexOf(it);
          if (idx > -1) this.inventory.splice(idx, 1);
        }
      };
      consumeOne(crystalName);
      for (const n of boosters) consumeOne(n);
      const rate = this.calcBreakthroughRate(cfg.stage, quality, boosters);
      const roll = Math.random();
      if (roll >= rate) {
        // 💎 突破失败：按本次使用的魔晶品质累计失败补偿（下次突破成功率提升，该阶段独立，成功清零）
        const player = this.pixi.player;
        player.breakthroughFailBuff = player.breakthroughFailBuff || {};
        const add = BREAKTHROUGH_FAIL_COMPENSATION[quality] || 0;
        const cap = BREAKTHROUGH_COMPENSATION_CAP ?? 0.5;
        const compensate = Math.min(cap, (player.breakthroughFailBuff[cfg.stage] || 0) + add);
        player.breakthroughFailBuff[cfg.stage] = compensate;
        return { ok: false, fail: true, rate: Math.round(rate * 100), compensate: Math.round(compensate * 100), msg: '突破失败！成功率 ' + Math.round(rate * 100) + '%，材料已消耗（下次突破成功率 +' + Math.round(compensate * 100) + '%）' };
      }
      const mult = this._btQualityBonus(cfg.stage, quality);
      const player = this.pixi.player;
      player.breakthroughFailBuff = player.breakthroughFailBuff || {};
      player.breakthroughFailBuff[cfg.stage] = 0; // 💎 突破成功：清空该阶段失败补偿
      const juese = player.juese;
      const attrApplied = {};
      for (const k in cfg.attr) {
        const add = Math.floor(cfg.attr[k] * mult);
        attrApplied[k] = add;
        if (k === 'maxHp') {
          // 🧱 突破生命加在基础生命上（maxHp 派生自动包含力量加成，保持当前比例）
          const oldMax = juese.maxHp || 100;
          juese.baseMaxHp = Math.floor((juese.baseMaxHp ?? oldMax) + add);
          juese.maxHp = computeUnitAttrs(juese).maxHp ?? juese.maxHp;
          const ratio = (juese.hp ?? oldMax) / oldMax;
          juese.hp = Math.min(juese.maxHp, Math.floor(juese.maxHp * ratio));
        } else if (k === 'attack') {
          juese.baseAttack = Math.floor((juese.baseAttack || 0) + add);
          juese.attack = juese.baseAttack;
        } else if (k === 'armor') {
          juese.baseArmor = Math.floor((juese.baseArmor || 0) + add);
          juese.armor = juese.baseArmor;
        } else if (k === 'speed') {
          juese.baseSpeed = Math.floor((juese.baseSpeed || 0) + add);
          juese.speed = juese.baseSpeed;
        }
      }
      const talent = Math.max(1, 5 + (quality - 1) * 2); // 💎 突破天赋点固定公式：品质1=5，每+1品质+2
      player.talentPoints = (player.talentPoints || 0) + talent;
      player.breakthroughLog = player.breakthroughLog || [];
      player.breakthroughLog.push({ stage: cfg.stage, quality, level: cfg.level, attr: attrApplied, talent, time: Date.now() });
      let passive = null;
      if (quality >= 3) {
        const pool = BREAKTHROUGH_PASSIVES;
        passive = pool[Math.floor(Math.random() * pool.length)];
        player.breakthroughPassives = player.breakthroughPassives || [];
        player.breakthroughPassives.push({ ...passive, fromStage: cfg.stage });
        this.applyBreakthroughPassive(passive);
      }
      const overflow = player.overflowExp || 0;
      player.overflowExp = 0;
      if (overflow > 0) {
        player.exp += overflow;
        let guard = 0;
        while (player.exp >= player.maxExp && guard < 40) {
          guard++;
          const s2 = this.getStageNeededByLevel(player.Level);
          if (s2 != null) break;
          player.exp -= player.maxExp;
          this._performLevelUp();
          if (player.Level >= (LEVEL_UP_CFG.player.maxLevel ?? MAX_PLAYER_LEVEL)) { player.exp = player.maxExp; break; } // ⛔ 突破不提升等级上限，满 30 级封顶
        }
        this._updateShenfenText();
      }
      this._updateShenfenText();
      return { ok: true, stage: cfg.stage, quality, talent, attr: attrApplied, passive, overflowApplied: overflow, msg: '突破成功！Lv.' + cfg.level + ' 突破完成' };
    },
    /** 应用突破被动（属性类立即加基础属性；reduce/boost 百分比类在进入战斗时合并） */
    applyBreakthroughPassive(passive) {
      if (!passive) return;
      const juese = this.pixi.player.juese;
      if (!juese) return;
      if (passive.type === 'attack') {
        juese.baseAttack = Math.floor((juese.baseAttack || 0) + passive.value);
        juese.attack = juese.baseAttack;
      } else if (passive.type === 'armor') {
        juese.baseArmor = Math.floor((juese.baseArmor || 0) + passive.value);
        juese.armor = juese.baseArmor;
      } else if (passive.type === 'speed') {
        juese.baseSpeed = Math.floor((juese.baseSpeed || 0) + passive.value);
        juese.speed = juese.baseSpeed;
      } else if (passive.type === 'hp') {
        const oldMax = juese.maxHp || 100;
        juese.maxHp = Math.floor(oldMax + passive.value);
        const ratio = (juese.hp ?? oldMax) / oldMax;
        juese.hp = Math.min(juese.maxHp, Math.floor(juese.maxHp * ratio));
      }
    },
    /** 突破被动累计：受伤害减免（0-1 加算） */
    getBreakthroughDamageReduce() {
      return (this.pixi.player.breakthroughPassives || []).reduce((sum, p) => p.type === 'reduce' ? sum + (p.value || 0) : sum, 0);
    },
    /** 突破被动累计：最终伤害提升（0-1 加算） */
    getBreakthroughDamageBoost() {
      return (this.pixi.player.breakthroughPassives || []).reduce((sum, p) => p.type === 'boost' ? sum + (p.value || 0) : sum, 0);
    },

    /**
     * 执行一次升级（内部方法）
     */
    _performLevelUp() {
      const player = this.pixi.player;

      // 等级+1
      player.Level += 1;

      // 🆓 每升 1 级获得自由属性点（LEVEL_UP_CFG.player.freeAttrPerLevel，dladmin「升级编辑」可改；可分配 力量/智慧/元素精通）
      const _freePerLv = LEVEL_UP_CFG.player.freeAttrPerLevel ?? 4;
      player.freeAttrPoints = (player.freeAttrPoints || 0) + _freePerLv;

      // ✨ 每升 1 级获得天赋点（LEVEL_UP_CFG.player.talentPerLevel，默认 0 不增长；dladmin「升级编辑」可改）
      const _talentPerLv = LEVEL_UP_CFG.player.talentPerLevel ?? 0;
      if (_talentPerLv > 0) player.talentPoints = (player.talentPoints || 0) + _talentPerLv;

      // ⚔️ 每升 1 级基础攻击力 +attackPerLevel（默认 +3；数值来自 LEVEL_UP_CFG.player.attackPerLevel，dladmin「升级编辑」可改）
      //    升级加成独立于自由属性点（洗点不回收），用 levelAttackBonus 累计标记，读档时按等级差额补发
      const atkGain = LEVEL_UP_CFG.player.attackPerLevel ?? 3;
      if (player.juese) {
        player.juese.baseAttack = (player.juese.baseAttack || 0) + atkGain;
        if (player.juese.attack != null) player.juese.attack = player.juese.baseAttack;
        player.juese.levelAttackBonus = (player.juese.levelAttackBonus || 0) + atkGain;
      }

      // 最大经验线性递增（📈 expBase + expStep × (当前等级-1)，数值来自 LEVEL_UP_CFG；旧指数曲线已废弃）
      player.maxExp = Math.floor((LEVEL_UP_CFG.player.expBase ?? 50) + (LEVEL_UP_CFG.player.expStep ?? 20) * (player.Level - 1));
    },

    /**
     * 更新身份文字中的等级显示
     */
    _updateShenfenText() {
      const player = this.pixi.player;
      player.shenfen = `身份：奥米集团 <b class="text-#F56C6C">LV.${player.Level}</b> 探索者`;
    },
    // ========================
    // 地图数据操作方法
    // ========================
    /**
     * 获取指定地图的数据
     * @param {string} mapId - 地图ID
     * @returns {Object|null} 地图数据对象
     */
    getMapDataById(mapId) {
      return this.pixi.mapDataList.find(m => m.id === mapId) || null;
    },
    /**
     * 删除指定地图的触发区域（按label删除）
     * @param {string} mapId - 地图ID
     * @param {string} label - 触发区域的label标识
     * @returns {boolean} 是否删除成功
     */
    removeTriggerArea(mapId, label) {
      const mapData = this.pixi.mapDataList.find(m => m.id === mapId);
      if (!mapData || !mapData.TriggerAreaArr) return false;
      const index = mapData.TriggerAreaArr.findIndex(a => a.label === label);
      if (index > -1) {
        mapData.TriggerAreaArr.splice(index, 1);
        return true;
      }
      return false;
    },
    /**
     * 更新指定地图触发区域的属性
     * @param {string} mapId - 地图ID
     * @param {string} label - 触发区域的label标识
     * @param {Object} updates - 要更新的属性对象
     * @returns {boolean} 是否更新成功
     */
    updateTriggerArea(mapId, label, updates) {
      const mapData = this.pixi.mapDataList.find(m => m.id === mapId);
      if (!mapData || !mapData.TriggerAreaArr) return false;
      const area = mapData.TriggerAreaArr.find(a => a.label === label);
      if (area) {
        Object.assign(area, updates);
        return true;
      }
      return false;
    },
    /**
     * 向指定地图添加新的触发区域
     * @param {string} mapId - 地图ID
     * @param {Object} areaData - 触发区域数据
     * @returns {boolean} 是否添加成功
     */
    addTriggerArea(mapId, areaData) {
      const mapData = this.pixi.mapDataList.find(m => m.id === mapId);
      if (!mapData) return false;
      if (!mapData.TriggerAreaArr) {
        mapData.TriggerAreaArr = [];
      }
      mapData.TriggerAreaArr.push(areaData);
      return true;
    },
    /**
     * 删除指定地图的问号互动（永久删除）
     * 同时更新运行时缓存 mapDataList 和持久化记录 removedWenhaoIds
     * @param {string} mapId - 地图ID
     * @param {string} wenhaoId - 问号互动的ID
     * @returns {boolean} 是否删除成功
     */
    removeWenhaoHudong(mapId, wenhaoId) {
      // 1. 更新持久化记录
      if (!this.pixi.removedWenhaoIds[mapId]) {
        this.pixi.removedWenhaoIds[mapId] = [];
      }
      if (!this.pixi.removedWenhaoIds[mapId].includes(wenhaoId)) {
        this.pixi.removedWenhaoIds[mapId].push(wenhaoId);
      }

      // 2. 同步删除运行时缓存中的数据
      const mapData = this.pixi.mapDataList.find(m => m.id === mapId);
      if (mapData && mapData.wenhaoHudong) {
        const index = mapData.wenhaoHudong.findIndex(w => w.id === wenhaoId);
        if (index > -1) {
          mapData.wenhaoHudong.splice(index, 1);
        }
      }

      console.log(`[地图数据] 已永久删除问号: map=${mapId}, id=${wenhaoId}`);
      return true;
    },
    /**
     * 检查指定问号是否已被永久删除
     * @param {string} mapId - 地图ID
     * @param {string} wenhaoId - 问号ID
     * @returns {boolean}
     */
    isWenhaoRemoved(mapId, wenhaoId) {
      return this.pixi.removedWenhaoIds[mapId]?.includes(wenhaoId) || false;
    },
    /**
     * 设置地图相关事件监听（removeWenhaoHudong 等）
     * 只需调用一次，内部会去重
     */
    setupMapEventListeners() {
      if (this._mapListenersSetup) return;
      this._mapListenersSetup = true;
      emitter.on('removeWenhaoHudong', ({ mapId, wenhaoId }) => {
        this.removeWenhaoHudong(mapId, wenhaoId);
      });
      console.log('[地图数据] 事件监听器已设置');
    },
    addWuxingProgress() {
      // 增加0.5进度
      this.pixi.player.wuxing += 50;
      // 判断是否满1点
      if (this.pixi.player.wuxing >= 100) {
        this.pixi.player.wuxing = 0; //清零进度
        this.pixi.player.talentPoints++; //天赋点+1
        return 100
      }
      return this.pixi.player.wuxing
    },
    // 🎭 设置玩家自定义姓名（持久化到 localStorage，后续对话中“林恩”统一替换为这个名字）
    setPlayerName(name) {
      this.playerName = (name && String(name).trim()) || '林恩';
      localStorage.setItem('fv_player_name', this.playerName);
    },
    // 重置所有属性（新游戏时调用）
    resetUser() {
      // 🎭 新游戏所选角色（startNewGame 前设置 _pendingRole）；初始卡组 = 该角色固定卡组（applyRoleInit 会用随机结果覆盖）
      const _newRole = this._pendingRole || 'linen';
      const _newRoleDeck = (ROLE_INIT_CONFIGS[_newRole]?.deck && ROLE_INIT_CONFIGS[_newRole].deck.length)
        ? ROLE_INIT_CONFIGS[_newRole].deck : INITIAL_DECK;
      // 删除存档（唯一存档 + 历史档位残留 + 地牢进度）
      this.deleteSave();

      // 重置玩家数据
      this.pixi.player = {
        // 🃏 当前卡组（战斗抽牌牌组；新游戏初始化 = 角色初始卡组，可含重复多副本）
        deck: [..._newRoleDeck],
          deckInstances: [], // 🃏 牌库实例 id 记录（与 deck 一一对应，点击哪张实例就记录哪张，图鉴"已携带"按此精确匹配）
        role: this._pendingRole || 'linen', // 🎭 新游戏所选角色（startNewGame 前设置 _pendingRole）
        equippedItems: [], // 已装备的道具
        CARD_DATA: JSON.parse(JSON.stringify(DEFAULT_CARD_DATA)), // 重置为默认卡牌配置
        juese: createDefaultJuese(),
        breakthroughFailBuff: {}, // 💎 突破失败补偿 { 阶段: 成功率加成 }（失败累计、成功清零）
        shenfen: `身份：奥米集团 <b class="text-#F56C6C">LV.1</b> 探索者`,
        exp: 0,
        maxExp: LEVEL_UP_CFG.player.expBase ?? 50,
        wuxing: 0,
        Level: 1,
        freeAttrPoints: LEVEL_UP_CFG.player.freeAttrPointsStart ?? 10, // 🆓 新游戏初始自由属性点（升级编辑可配）
        talentPoints: LEVEL_UP_CFG.player.initialTalentPoints ?? 0, // 天赋点（初始可配）
        activatedTalents: [], // 已激活的天赋
        talentLevels: {}, // 可升级天赋的等级记录 { talentId: level }
        day: 1, // 当前天数
        equippedItemKillCounts: {}, // 道具击杀计数
      };

      // 🎴 开局赠送：卡组中的卡视为已拥有，拥有数按卡组实际副本数计（图鉴解锁 / 升星计数用）
      if (Array.isArray(this.pixi?.player?.deck)) {
        const _cnt = {};
        this.pixi.player.deck.forEach(n => { _cnt[n] = (_cnt[n] || 0) + 1; });
        Object.entries(_cnt).forEach(([n, c]) => {
          if (this.pixi.player.CARD_DATA?.[n]) this.pixi.player.CARD_DATA[n].num = c;
        });
      }
      // 🛡️ 独占卡：仅对应角色可拥有（如双兆=林恩独占；选择其他角色时 num 归零，不出现在已有卡牌/图鉴）
      const _ownRole = this.pixi.player.role || _newRole;
      for (const [n, def] of Object.entries(this.pixi.player.CARD_DATA)) {
        if (def?.exclusiveRole && def.exclusiveRole !== _ownRole) def.num = 0;
      }

      // 🏆 本局局外经验结算状态重置（新开局清零；metaRoles 局外进度跨局保留不重置）
      this.runExpGained = 0;
      this.runMetaSettled = false;

      // 🏆 新游戏保留成就：重新累加已完成成就的永久天赋点（成就跨游戏保留）
      const rewardTotal = (this.achievements ?? []).reduce((sum, a) => {
        const def = ACHIEVEMENT_DEFS[a.name];
        return sum + (def?.talentReward ?? 0);
      }, 0);
      this.pixi.player.talentPoints += rewardTotal;

      // 🏰 新游戏重置地牢成就累计进度（已解锁的成就保留，进度从 0 重新累计）
      this.dungeonAchieve = {};

      // 重置战斗和UI状态
      this.pixi.fight = false;
      this.pixi.gameUi = false;
      this.pixi.setting = 0;
      this.pixi.isPaused = false;

      // 重置地图数据（新游戏时所有问号等恢复初始状态）
      this.pixi.mapDataList = [];
      this.pixi.removedWenhaoIds = {};
      this.pixi.npcDataList = [];
      this.pixi.placedProps = []; // 🧸 新游戏清空放置的道具

      // 重置对话系统数据
      this.pixi.dialogueFlags = {}; // 清空对话标记
      this.pixi.choiceHistory = []; // 清空选择历史
      this.pixi.dialogueProgress = {}; // 清空对话进度
      this.pixi.duihua = false; // 重置对话状态
      this.pixi.dayCgTrigger = false; // 重置昼夜CG触发标志
      // ⚗️ 炼制配方解锁跨游戏保留（同成就永久保留，新游戏不清空已解锁配方）

      // 重置NPC好感度和故事解锁状态
      this.pixi.npcSelectList = DEFAULT_npcSelectList.map(n => ({ ...n })) // 🔒 深拷贝，避免运行期修改污染默认常量
      // 重置携带队友（默认携带晨曦 jinmao）
      this.pixi.npcAlly = 'jinmao'
      // 🔥 重置队友战斗配置（含 spineScale 等），确保新游戏使用最新 DEFAULT_ALLY_BATTLE_DATA
      this.pixi.allyBattleData = JSON.parse(JSON.stringify(DEFAULT_ALLY_BATTLE_DATA))
      // 重置游戏进度
      this.youxi = 0;
      this.youxi01 = 0;
      this.currentNodeKey = "";
      this.textData = null;
      this.duihua = true;
      this.selectBoolean = false;
      this.selecttextNum = 0;
      this.searchContent = [];
      this.text = "";
      this.text_boolean = false;
      this.textYincang = false;
      this.kuaijin = false;
      this.backgroundImage = "";
      this.animations = [];
      this.menu = 1;
      this.menuSelect = 0;

      // 重置物品栏和抽卡记录
      this.inventory = DEFAULT_inventory;
      this.gachaHistory = [];
      // 🎰 重置抽卡出货概率为最新默认
      this.gachaRates = JSON.parse(JSON.stringify(DEFAULT_GACHA_RATES));
      // 🏪 重置商店（新游戏：金钱恢复初始、商店按最新配置重新生成）
      this.shop = {
        money: 100,
        items: [],
      };
      this.refreshShopItems();
      this.savejson = [];
      this.messages = [];

      // 重置任务列表（由任务模板 TASK_DEFS 重新生成，避免共享引用污染）
      this.allTasks = buildTasksFromDefs();

      // 重置NPC好感度和故事解锁状态
      this.pixi.npcSelectList = DEFAULT_npcSelectList.map(n => ({ ...n })) // 🔒 深拷贝，避免运行期修改污染默认常量
      // 重置携带队友（默认携带晨曦 jinmao）
      this.pixi.npcAlly = 'jinmao'
      // 🔥 重置队友战斗配置（含 spineScale 等），确保新游戏使用最新 DEFAULT_ALLY_BATTLE_DATA
      this.pixi.allyBattleData = JSON.parse(JSON.stringify(DEFAULT_ALLY_BATTLE_DATA))
      // 👥 重置同伴展示列表（独立于地图 NPC）：清空后按最新配置重新生成
      this.pixi.allyList = []
      this.syncAllyList()

      console.log('[重置] 游戏数据已重置为初始状态');
    },

    // ========== 成就系统（开始新游戏不会重置，存了就会一直保存）==========
    /**
     * 🏆 获取所有成就配置（供成就界面渲染）
     * @returns {Array} [{ name, desc, talentReward, unlocked }]
     */
    getAchievementDefs() {
      const list = this.achievements ?? [];
      return Object.entries(ACHIEVEMENT_DEFS).map(([name, def]) => {
        const rec = list.find(item => item.name === name);
        return {
          name: def.name || name,
          desc: def.desc,
          talentReward: def.talentReward,
          attrReward: def.attrReward ?? 0,
          unlocked: !!rec,
          // 完成时间戳（旧存档可能没有 time，用完成顺序 order 兜底排序）
          unlockTime: rec?.time ?? null,
          order: rec ? list.indexOf(rec) : -1,
        };
      });
    },

    /**
     * 添加成就（每个成就只完成一次）
     * 首次完成会奖励永久天赋点（talentPoints += talentReward），跨游戏保留
     * @param {string} name - 成就名称
     * @param {number} [index] - 成就进度（可选，用于进度类成就）
     * @returns {boolean} 是否【首次】完成（true=新完成并奖励；false=已完成过/无效）
     */
    addAchievement(name, index) {
      if (!name) return false;
      const def = ACHIEVEMENT_DEFS[name];
      // 不在配置表里的成就名：允许记录（兼容旧数据），但不给天赋点
      // 已在列表中存在 = 已完成过，不重复奖励
      const existed = this.hasAchievement(name);
      if (existed) return false;

      // 完整拷贝数组
      const list = [...(this.achievements ?? [])];
      list.push({ name, index, time: Date.now() });
      this.achievements = list;

      // 🎁 首次完成：奖励永久天赋点
      if (def && def.talentReward > 0) {
        if (!this.pixi?.player?.talentPoints) this.pixi.player.talentPoints = 0;
        this.pixi.player.talentPoints += def.talentReward;
      }
      // 🆓 首次完成：奖励自由属性点（可与天赋点同时奖励）
      if (def && def.attrReward > 0) {
        if (!this.pixi?.player?.freeAttrPoints) this.pixi.player.freeAttrPoints = 0;
        this.pixi.player.freeAttrPoints += def.attrReward;
      }
      return true;
    },

    // ========== 🏰 地牢累计类成就（进度跨游戏保留）==========
    /**
     * 获取地牢成就累计进度
     * @returns {Object} { kills, explored, deaths, chests, bloodmoon, thunder, bloodmoonNight, night, magma, pickups }
     */
    getDungeonAchieve() {
      return this.dungeonAchieve ?? {};
    },
    /**
     * 累计地牢统计值，并触发对应成就检查（达到阈值自动解锁）
     * @param {string} key - 统计键（kills/explored/deaths/chests/bloodmoon/thunder/bloodmoonNight/night/magma/pickups）
     * @param {number} n - 本次累加数量（默认 1）
     */
    trackDungeonStat(key, n = 1) {
      const s = { ...(this.dungeonAchieve || {}) };
      s[key] = (s[key] || 0) + (Number(n) || 0);
      this.dungeonAchieve = s;
      this.checkDungeonAchievements();
    },
    /**
     * 检查地牢累计类成就（达到阈值自动解锁并奖励永久属性点）
     */
    checkDungeonAchievements() {
      const s = this.dungeonAchieve || {};
      // ⚙️ 数据驱动：遍历 ACHIEVEMENT_DEFS，凡配置了 stat 的成就按 condition 阈值自动判定（可在 dladmin 成就编辑页修改）
      for (const [name, def] of Object.entries(ACHIEVEMENT_DEFS)) {
        if (!def || !def.stat) continue; // 非统计类成就（如 巅峰突破）由游戏逻辑手动触发
        const val = s[def.stat] || 0;
        if (val >= (def.condition ?? 1) && this.addAchievement(name)) {
          ElMessage({
            message: '🏆 解锁成就「' + (def.name || name) + '」！获得 ' + (def?.talentReward ?? 1) + ' 点永久天赋点' + (def?.attrReward ? '、' + def.attrReward + ' 点自由属性点' : ''),
            type: 'success',
            duration: 2500,
            offset: Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 600) - 110),
            customClass: 'achieve-pop', // 🏆 从屏幕底部向上弹出（动画在 main.css）
          });
        }
      }
    },
    /**
     * 🏆 重置全部成就与地牢累计进度（测试用：清空已解锁成就与进度，重新开始累计）
     */
    resetAchievements() {
      this.achievements = [];
      this.dungeonAchieve = {};
      // 🔄 同步清理 localStorage 持久化中的成就数据（防止 persist 延迟/未写入导致刷新后恢复旧成就）
      try {
        const raw = localStorage.getItem('storekey');
        if (raw) {
          const obj = JSON.parse(raw);
          if (obj && typeof obj === 'object') {
            obj.achievements = [];
            obj.dungeonAchieve = {};
            localStorage.setItem('storekey', JSON.stringify(obj));
          }
        }
      } catch (e) { /* ignore */ }
      return true;
    },
    /**
     * 检测是否已获得某成就
     * @param {string} name - 成就名称
     * @returns {boolean}
     */
    hasAchievement(name, index) {
      const list = this.achievements ?? [];
      return list.some(item => {
        if (item.name !== name) return false;
        //没传index，只要存在就为true
        if (index === undefined) return true;
        //改成全等匹配，只有数字一模一样才返回true
        return item.index === index;
      });
    },

    // ========== 🏪 商店系统 ==========
    /**
     * 获取玩家金钱（金币）
     * @returns {number}
     */
    getShopMoney() {
      return this.shop?.money ?? 0;
    },

    /**
     * 用最新 DEFAULT_SHOP_ITEMS 同步商店物品列表
     * 规则：
     *   - 配置里新增的物品 → 加入商店
     *   - 配置里删除的物品 → 从商店移除
     *   - 配置里编辑的物品 → 更新价格/名称/数量等，但保留已购数量 soldNum
     *   - 若物品的「当前数量」没变（soldNum 相同），则保持数量不变
     * 每次读档 / 新游戏时调用。
     */
    refreshShopItems() {
      if (!this.shop) this.shop = { money: 100, items: [] };
      const items = this.shop.items ?? [];

      // 1. 收集现有已购数量（按 id）
      const soldMap = {};
      items.forEach(it => { if (it.id) soldMap[it.id] = it.soldNum ?? 0; });

      // 2. 用最新配置重建
      const newItems = DEFAULT_SHOP_ITEMS.map(cfg => {
        const oldSold = soldMap[cfg.id] ?? 0;
        return {
          id: cfg.id,
          name: cfg.name,
          price: cfg.price,
          limit: cfg.limit ?? -1,
          img: cfg.img,
          miaoshu: cfg.miaoshu || '',
          color: cfg.color || '#909399',
          quality: cfg.quality || null,
          output: cfg.output ? { ...cfg.output } : null,
          // 已购数量：数量未更新则保持；新物品从 0 开始
          soldNum: oldSold,
        };
      }).filter(it => it.limit < 0 || (it.limit - (it.soldNum ?? 0)) > 0); // 🗑️ 已售罄的限购物品直接下架，不占位置

      this.shop.items = newItems;
      return newItems;
    },

    /**
     * 获取商店物品列表（含剩余可购数量）
     * @returns {Array}
     */
    getShopItems() {
      if (!this.shop) this.shop = { money: 100, items: [] };
      return this.shop.items ?? [];
    },

    /**
     * 购买商店物品
     * @param {string} shopItemId - 商店物品 id
     * @param {number} count - 购买数量（默认1）
     * @returns {{ok:boolean, msg?:string}}
     */
    buyShopItem(shopItemId, count = 1) {
      const shop = this.shop;
      if (!shop) return { ok: false, msg: '商店数据异常' };
      const item = (shop.items ?? []).find(it => it.id === shopItemId);
      if (!item) return { ok: false, msg: '物品不存在' };

      // 检查剩余可购数量
      const remaining = item.limit < 0 ? Infinity : (item.limit - (item.soldNum ?? 0));
      if (remaining <= 0) return { ok: false, msg: `「${item.name}」已售罄` };
      const buyCount = Math.min(count, remaining);

      // 🏪 商人折扣（仅地牢商人商店打开时生效）：好感度折扣（>=100 打6折，>=50 打8折）
      //    叠乘 大客户折扣（累计消费>=100 打一折=原价10%），二者可叠加
      let discount = 1;
      if (this.getDialogueFlag?.('shangrenShopOpenedAt')) {
        const favor = this.getDialogueFlag('shangrenFavor') || 0;
        if (favor >= 100) discount = 0.6;
        else if (favor >= 50) discount = 0.8;
        // 💎 大客户优惠：累计消费达到 100 金币后打一折（折扣减 0.1），与好感度折扣加算叠加（如 0.6-0.1=0.5）
        if ((Number(this.getDialogueFlag('shangrenTotalSpent')) || 0) >= 100) {
          discount = Math.max(0, discount - 0.1);
        }
      }
      // 检查金钱
      const totalCost = Math.floor(item.price * discount) * buyCount;
      if ((shop.money ?? 0) < totalCost) {
        return { ok: false, msg: `金币不足，需要 ${totalCost} 金币` };
      }

      // 扣金钱
      shop.money -= totalCost;

      // 加物品到背包
      const output = { ...item.output };
      delete output.isItem; // 仅用于标记，不覆盖背包物品字段
      // 保留商店物品的标记字段
      const itemToAdd = {
        name: item.name,
        num: buyCount,
        img: item.img,
        miaoshu: item.miaoshu,
        color: item.color,
        ...(item.output || {}),
      };
      // 补全背包物品字段（若商店配置未提供 isItem 等标记，则按类型推断）
      if (itemToAdd.isItem === undefined) {
        // 非货币/材料类 → 视为材料
      }
      this.addItemToInventory(itemToAdd);

      // 更新已购数量
      item.soldNum = (item.soldNum ?? 0) + buyCount;

      // 🗑️ 限购物品售罄后直接下架（从商店列表删除，不占位置）
      const remAfter = item.limit < 0 ? Infinity : (item.limit - (item.soldNum ?? 0));
      if (remAfter <= 0) {
        const rmIdx = (shop.items ?? []).indexOf(item);
        if (rmIdx > -1) shop.items.splice(rmIdx, 1);
      }

      return { ok: true, msg: `购买「${item.name}」×${buyCount}，花费 ${totalCost} 金币`, totalCost };
    },

    /**
     * 出售背包物品（材料可出售，卡牌/装备不可出售）
     * @param {string} itemName - 物品名
     * @param {number} count - 出售数量（默认1）
     * @returns {{ok:boolean, msg?:string}}
     */
    sellItem(itemName, count = 1) {
      if (!itemName) return { ok: false, msg: '参数错误' };
      const inv = this.inventory.find(i => i.name === itemName);
      if (!inv || inv.num <= 0) return { ok: false, msg: '背包中没有该物品' };

      // 卡牌、装备、货币不可出售
      if (inv.isCard) return { ok: false, msg: '卡牌不可出售' };
      if (inv.wuqi) return { ok: false, msg: '装备不可出售' };
      if (inv.isItem) return { ok: false, msg: '道具不可出售' };
      if (inv.shiyong) return { ok: false, msg: '消耗品不可出售' };
      // 货币（金币/晶核/魔晶等）不可出售
      if (inv.status === 'currency' || inv.name === '金币' || inv.name === '灵力晶核' || inv.name === '魔力晶核' || inv.name === '魔晶LV1') {
        return { ok: false, msg: '货币不可出售' };
      }

      // 计算单价：按商店出售价表，没有则按默认值
      const sellPrice = this.getSellPrice(inv);
      const sellCount = Math.min(count, inv.num);
      const totalGold = sellPrice * sellCount;

      // 扣减背包物品
      inv.num -= sellCount;
      if (inv.num <= 0) {
        const idx = this.inventory.indexOf(inv);
        if (idx > -1) this.inventory.splice(idx, 1);
      }

      // 加金钱
      if (!this.shop) this.shop = { money: 100, items: [] };
      this.shop.money = (this.shop.money ?? 0) + totalGold;

      return { ok: true, msg: `出售「${itemName}」×${sellCount}，获得 ${totalGold} 金币` };
    },

    /**
     * 获取物品出售单价（金币）
     * 定价规则（优先级从高到低）：
     *   1. DEFAULT_SELL_PRICES 配置表（自定义售价）
     *   2. 商店有售卖的同名物品 → 售价 = 商店价的一半（约 50% 回收）
     *   3. 兜底：材料类默认 2 金币，其他默认 1 金币
     * @param {Object} item - 背包物品
     * @returns {number}
     */
    getSellPrice(item) {
      if (!item) return 1;
      // 💖 优待：出售物品时售价提高（默认 +20%）
      const _favMult = this.hasTalent('kind_favor') ? (1 + (this.getTalentEffect?.('kind_favor', 'sellPct') ?? 20) / 100) : 1;
      // 1️⃣ 自定义售价配置表（物品名精确匹配）
      if (DEFAULT_SELL_PRICES[item.name] != null) {
        return Math.max(1, Math.floor(DEFAULT_SELL_PRICES[item.name] * _favMult));
      }
      // 2️⃣ 商店同款物品按商店价一半回收
      const shopCfg = DEFAULT_SHOP_ITEMS.find(c => c.name === item.name);
      if (shopCfg) {
        return Math.max(1, Math.floor(shopCfg.price * 0.5 * _favMult));
      }
      // 3️⃣ 兜底：材料类 2 金币，其他 1 金币
      if (item.status === 'material') return Math.max(1, Math.floor(2 * _favMult));
      return Math.max(1, Math.floor(1 * _favMult));
    },
  },
  persist: {
    // 按需存储 state/ref
    // 修改存储中使用的键名称，默认为当前 Store的 id
    key: "storekey",
    // 使用 localStorage，关闭页面后数据仍在（sessionStorage关闭就没了）
    storage: window.localStorage,
    // 🎉按需持久化，设置+成就保留，游戏进度用autoSave系统
    paths: ["volume", "text_speed", "textSize", "perfMode", "achievements", "dungeonAchieve"],
  },
})

