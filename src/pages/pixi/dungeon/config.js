/**
 * 地牢全局常量配置与纯工具函数
 * 从 dungeon.vue 拆出：无共享状态依赖，可安全 import
 */

// ========== 移动 / 推动 / 摇杆 ==========
// ========== 🎛️ 地牢可编辑配置（dladmin「地牢编辑」tab 统一修改，其余 export 均引用本对象） ==========
// 说明：在 dladmin 地牢编辑页修改这里的值后点「保存写入」，重进地牢/读档自动生效；
//       天气说明（WEATHER_INFO）默认按下方数值自动生成；如需自定义文案，在 weather.*.desc 填写即可覆盖
export const DUNGEON_EDIT_CFG = {
  moveSpeed:         7, // 玩家格子移动速度（格/秒）
  playerVisibleRadius: 4, // 玩家可见默认格数（tiled viewRadius 可覆盖）
  nightAfterSec:     160, // 进入地牢后多少秒天黑
  nightFadeSec:      20, // 天黑前渐变秒数
  iceSlideSpeedRatio: 1.35, // 冰面移动速度倍率
  iceSlideDecay:     0.45, // 每滑一格消耗能量
  iceSlideInitEnergy: 1, // 初始滑行能量
  pushSpeedRatio:    0.45, // 推动木箱速度倍率
  joyDeadzone:       0.28, // 摇杆死区
  gridScale:         0.65, // 镜头固定缩放
  enemyAggroRadius:  5, // 普通敌人索敌半径（格）
  enemyFovDeg:       120, // 普通敌人索敌角度（度）
  enemyChaseBonus:   2, // 追击范围额外提升（格）
  shadowAggro:       5, // 暗影怪索敌半径（格）
  shadowFovDeg:      90, // 暗影怪索敌角度（度）
  shadowClose:       1.5, // 暗影怪近身圆形索敌半径（格）
  nightEnemySpeedBonus: 2, // 血月/夜晚敌人移速加成（格/秒）
  leiniaofuSightScale: 1.2, // 雷鸟索敌半径倍率
  leiniaofuFovMult:  1.2, // 雷鸟索敌角度倍率
  thunderInterval:   4, // 雷击间隔（秒）
  thunderWarnTime:   1.5, // 雷击预警（秒）
  thunderDmgPct:     0.15, // 雷击伤害（最大生命百分比）
  thunderConductPct: 0.5, // 水面传导伤害比例
  magmaDmgPctScale:  0.01, // 岩浆每秒伤害比例
  frostDmgPct:       0.01, // 冻伤每次扣血（最大生命百分比）
  rarePoolPercent:   6, // 稀有道具占比（%）
  enemyLevelPerDay:  1, // 每过一天地牢怪物等级 +N（第 15 天迎击邪魔的主线任务配合）
  frost: { staySec: 90, dmgInterval: 12 },  // 雪天冻伤：呆满秒数 / 扣血间隔
  bloodmoonBattle: { actionBar: 0.5, atk: 0.15, hp: 0.2, spd: 0.15, exp: 0.25 },
  respawnPool: [
    { name: "赤莓", chance: 30, img: "chimei" },
    { name: "翠息草", chance: 30, img: "cuixicao" },
    { name: "风萤果", chance: 20, img: "fengyingguo" },
    { name: "忆尘晶", chance: 4, img: "yichenjing", max: 1, rare: true },
    { name: "月露草", chance: 8, img: "yuelucao", max: 1, rare: true },
    { name: "幽冥花蕊", chance: 2, img: "youminghua", max: 1, rare: true },
  ],
  weather: {
    sunny:        { playerSlow: 0, fogReduce: 0, enemySpeedUp: 0 },
    rain:        { playerSlow: 0.25, fogReduce: 0, enemySpeedUp: 0 },
    fog:        { playerSlow: 0.15, fogReduce: 2, enemySpeedUp: 0 },
    storm:        { playerSlow: 0.4, fogReduce: 1, enemySpeedUp: 0 },
    thunderstorm:        { playerSlow: 0.35, fogReduce: 1, enemySpeedUp: 0 },
    bloodmoon:        { playerSlow: 0, fogReduce: 0, enemySpeedUp: 0 },
    snow:        { playerSlow: 0.25, fogReduce: 0, enemySpeedUp: 0 },
  },
  weatherTable: {
    battle_01: { sunny: 34, rain: 28, fog: 18, storm: 7, thunderstorm: 5, bloodmoon: 4, snow: 0 },
    battle_02: { sunny: 18, rain: 28, fog: 25, storm: 9, thunderstorm: 6, bloodmoon: 5, snow: 0 },
    battle_03: { sunny: 38, rain: 24, fog: 0, storm: 13, thunderstorm: 6, bloodmoon: 4, snow: 0 },
  },
  bgVolume: { sunny: 0.35, fog: 0.3, bloodmoon: 0.5, rain: 0.75, storm: 0.9, thunderstorm: 0.9, snow: 0.25 },
  sfxVolume: { zoulu: 0.18, caishui: 0.25, shatu: 1, shoushang: 0.9, dalei: 0.5, lock: 0.6, open: 0.8, shiqu: 0.2, jingti: 0.55, zhandou: 0.7, kongbugongji: 0.7 },
};

export const DUNGEON_COMBAT_CFG = DUNGEON_EDIT_CFG;

export const MOVE_SPEED = DUNGEON_EDIT_CFG.moveSpeed;               // 玩家格子移动速度（格/秒）
// 🌙 血月/夜晚：敌人移速固定提升（格/秒，不用百分比；两者同时可叠加；调大更快）
export const NIGHT_ENEMY_SPEED_BONUS = DUNGEON_EDIT_CFG.nightEnemySpeedBonus;
export const ICE_SLIDE_SPEED_RATIO = DUNGEON_EDIT_CFG.iceSlideSpeedRatio; // 冰面上主动移动速度倍率（滑得更快）
export const ICE_SLIDE_DECAY = DUNGEON_EDIT_CFG.iceSlideDecay;       // 每滑一格消耗的能量（0~1，越小滑得越远）
export const ICE_SLIDE_INIT_ENERGY = DUNGEON_EDIT_CFG.iceSlideInitEnergy;  // 进入冰面/按下方向时的初始滑行能量
export const PUSH_SPEED_RATIO = DUNGEON_EDIT_CFG.pushSpeedRatio;      // 推动木箱时速度倍率（越小越沉）
export const JOY_DEADZONE = DUNGEON_EDIT_CFG.joyDeadzone;          // 摇杆死区（相对底座半径的比例）

// ========== 镜头缩放 ==========
export const GRID_SCALE = DUNGEON_EDIT_CFG.gridScale;            // 固定缩放程度：瓦片改 64px 后调小，恢复接近原先的视觉大小

// ========== 地牢多层配置 ==========
export const DUNGEON_LEVEL_MAPS = {
  1: '/map/dungeon.tmj',
  2: '/map/dungeon2.tmj',
};
export const DUNGEON_LEVEL_KEY = 'fv_dungeon_level';
export const DUNGEON_LEVEL_DAY_KEY = 'fv_dungeon_day'; // 🌅 上次进入/下到该层时的天数（跨天重置层数用）

// ========== 地牢怪物等级 ==========
// 每下一层怪物等级 +N（乘在怪物初始配置 level 上）
export const DUNGEON_ENEMY_LEVEL_PER_FLOOR = DUNGEON_EDIT_CFG.enemyLevelPerFloor ?? 1;
// 每过一天怪物等级 +N（配合主线任务「邪魔苏醒」：第 15 天迎击苏醒的邪魔，天数越高地牢越危险）
export const DUNGEON_ENEMY_LEVEL_PER_DAY = DUNGEON_EDIT_CFG.enemyLevelPerDay ?? 1;
// 每级属性成长率（hp/attack/armor/magicResist/speed），Lv.N 属性 = 初始属性 × (1 + (N-1)×成长率)
export const DUNGEON_ENEMY_GROWTH = DUNGEON_EDIT_CFG.enemyLevelGrowth ?? { hp: 0.12, attack: 0.12, armor: 0.12, magicResist: 0.12, speed: 0.06 };

// ========== 地牢天黑 ==========
// 天黑速度：每秒黑夜进度增量（0→1，约 200 秒完全变黑）；每次从地牢外进入刷新为白天，单向变黑不再亮
// ⏱️ 进入地牢后固定多少秒进入夜间（调大更久、调小更快天黑；默认 120 秒 = 2 分钟）
export const DUNGEON_NIGHT_AFTER_SEC = DUNGEON_EDIT_CFG.nightAfterSec;
// 🌗 进入夜间前的渐变秒数（提前这段时间开始渐暗，到点全黑；默认 15 秒）
export const DUNGEON_NIGHT_FADE_SEC = DUNGEON_EDIT_CFG.nightFadeSec;

// ========== 雷雨天 ==========
export const THUNDER_INTERVAL = DUNGEON_EDIT_CFG.thunderInterval;         // 每 4 秒一次
export const THUNDER_WARN_TIME = DUNGEON_EDIT_CFG.thunderWarnTime;      // 预警时长 1.5 秒

// ========== 存档 ==========
export const DUNGEON_SAVE_KEY = 'fv_dungeon_save_v1'; // 旧版单层 key（兼容迁移）
// 🚪 上次使用 spawn 传送点退出地牢的记录（{ level, col, row }，下次进入优先在该传送点复活）
export const DUNGEON_LAST_SPAWN_KEY = 'fv_dungeon_last_spawn';
export function saveKeyForLevel(level) {
  return `fv_dungeon_save_v1_L${level}`;
}

// ========== 道具配置 ==========
// 物品名 → 图标 key（assets/daoju/*.webp）；拾取提示/结算图标用；道具点可在 tiled 里用 img 属性覆盖
export const ITEM_IMG_MAP = {
  '魔力晶核': 'molijinghe',
'灵力晶核': 'jinghe', '金币': 'jinbi',
};

// 🎨 物品名 → daojuall spine 皮肤名映射（图片按皮肤渲染；拾取提示 / 背包 / 宝箱等按物品名回退找皮肤）
//   显式传入 img 皮肤名时优先用 img；物品只有旧图 / 无 img 时按名字查这里
export const ITEM_SKIN_MAP = {
  '卡牌碎片': 'suipian',
  '赤莓': 'chimei',
  '翠息草': 'cuixicao',
  '风萤果': 'fengyingguo',
  '魔力灵液': 'moliye',
  '未知钥匙': 'yaoshi1',
  '怒之晶石': 'nushi',
  '暗之晶石': 'anshi',
  '雷之晶石': 'leishi',
  '恢复药剂': 'huifuyaoji',
  '疾行药剂': 'jixingyaoji',
  '焚力永浆': 'fenliyongjiang',
  '幽铠永浆': 'youkaiyongjiang',
  '迅霆永浆': 'xuntingyongjiang',
  '忆尘晶': 'yichenjing',
  '月露草': 'yuelucao',
  '幽冥花蕊': 'youminghua',
  '金币': 'jinbi',
  '魔力晶核': 'molijinghe',
  '灵力晶核': 'jinghe',
  '魔晶LV1': 'redCrystalT1',
  '魔晶LV2': 'redCrystalT2',
  '魔晶LV3': 'redCrystalT3',
  '魔晶LV4': 'redCrystalT4',
  '魔晶LV5': 'redCrystalT5',
  '魔晶LV6': 'redCrystalT6',
  '魔晶LV7': 'redCrystalT7',
};
// ========== 🎲 地牢随机刷新道具池（代码配置；tiled 地图属性 randomSpawnItems 只设置刷新总数量） ==========
//   name  ：道具名（对应背包物品，喂食/食用/拾取按此结算）
//   chance：固定出现概率（%）：每局地牢独立判定一次，互不稀释；后续新增道具不影响已有道具概率
//   max   ：每次进入地牢最多刷出的数量（可选，不配则不限）
//   img   ：daojuall spine 皮肤名（图片用 spine 皮肤渲染；不配则回退 ITEM_IMG_MAP 静态图）
//   后续新增可刷新道具，直接在此追加一项即可
// 🎲 稀有道具池占比（%）：rare=true 的稀有道具共占此区间；其余主道具占 100−此区间
//   内部仍按各自 chance 比例分配（主池按 30:30:20 分 94%；稀有池按 4:8:2 分 6%）
export const RARE_POOL_PERCENT = DUNGEON_EDIT_CFG.rarePoolPercent;

export const RESPAWN_ITEM_POOL = DUNGEON_EDIT_CFG.respawnPool;


// 道具图标 URL：customImg 为 tiled 里配置的 img 覆盖（可为 key 或完整路径）
// ⚠️ 本文件位于 src/pages/pixi/dungeon/，到 src/assets/daoju 需 ../../../assets/daoju
// 🖼️ 预注册 src/assets/daoju/ 下所有 .webp 图片（Vite 静态收集：文件不存在时无条目）
//   ⚠️ 不再用 new URL(模板, import.meta.url)：Vite 会把它转换成 Object.assign(glob映射)[key]，
//   文件不存在时 key 查不到 → undefined → 拼出 .../dungeon/undefined 的异常 URL（旧 bug）
const daojuImgAssets = import.meta.glob('../../../assets/daoju/*.webp', { eager: true, import: 'default' });

export function itemImgUrl(name, customImg) {
  const key = customImg || ITEM_IMG_MAP[name];
  if (!key) return '';
  // 🛡️ 防御：显式传 'undefined' 字符串（如 tiled 属性误填）也视为无效，避免拼出异常 URL
  if (String(key).toLowerCase() === 'undefined') return '';
  // 支持 tiled 里直接写完整 http(s) 路径或 /xxx 绝对路径
  if (/^https?:\/\//.test(key) || key.startsWith('/')) return key;
  return daojuImgAssets[`../../../assets/daoju/${key}.webp`] || '';
}

// ========== 天气 ==========
// tiled 地图属性 weather 取值：sunny 晴天 / rain 雨天 / fog 雾天 / storm 暴风雨 / thunderstorm 雷雨天 / bloodmoon 血月
// ❄️ 雪天冻伤扣血配置（弹窗介绍与扣血逻辑共用：改这里，介绍和实际扣血同步生效）
export const SNOW_FROST_CFG = DUNGEON_EDIT_CFG.frost; // 呆满 90 秒后每 12 秒扣 1% 最大生命

// 天气数值配置（可被 tiled 覆盖：playerSlowPercent / fogReduceRadius / enemySpeedUpPercent）
export const WEATHER_CFG = DUNGEON_EDIT_CFG.weather;

// ⚡ 雷击基础伤害（desc 与落雷逻辑同源）：15% 最大生命值
export const THUNDER_DMG_PCT = DUNGEON_EDIT_CFG.thunderDmgPct;
// ⚡ 雷电传导伤害比例：落雷命中水面时，同片连续水域上的玩家受到 50% 雷击伤害（被直接命中者额外 +50%）
export const THUNDER_CONDUCT_PCT = DUNGEON_EDIT_CFG.thunderConductPct;
// 🔥 岩浆每秒伤害：tiled 属性 damage 按百分比解析（如 5 = 每秒 5% 最大生命值）
export const MAGMA_DMG_PCT_SCALE = DUNGEON_EDIT_CFG.magmaDmgPctScale;
// ❄️ 冻伤扣血比例（desc 与扣血逻辑同源）：1% 最大生命值 / 次
export const FROST_DMG_PCT = DUNGEON_EDIT_CFG.frostDmgPct;
// 🦅 雷鸟（leiniaofu / guaiwu3）索敌倍率：半径 / 角度放大（当前按用户调整为 1.2 倍；默认 1 倍 / 120°）
export const LEINIAOFU_SIGHT_SCALE = DUNGEON_EDIT_CFG.leiniaofuSightScale;
export const LEINIAOFU_FOV_MULT = DUNGEON_EDIT_CFG.leiniaofuFovMult;

// 🌕 血月战斗加成（desc 与战斗逻辑同源）：行动条 / 攻击 / 生命 / 速度 / 经验
export const BLOODMOON_BATTLE = DUNGEON_EDIT_CFG.bloodmoonBattle;

// 天气展示信息（desc 默认引用上方配置常量自动生成；若 DUNGEON_EDIT_CFG.weather.*.desc 有自定义文案则优先使用）
export const WEATHER_INFO = {
  sunny:        { name: '晴天',     icon: '☀️', desc: WEATHER_CFG.sunny.desc || '风和日丽，无任何特殊效果。', color: '#ffffff' },
  rain:         { name: '雨天',     icon: '🌧️', desc: WEATHER_CFG.rain.desc || `玩家移动速度降低 ${Math.round(WEATHER_CFG.rain.playerSlow * 100)}%。`, color: '#7ab8ff' },
  fog:          { name: '雾天',     icon: '🌫️', desc: WEATHER_CFG.fog.desc || `玩家可见度降低 ${WEATHER_CFG.fog.fogReduce} 格。\n敌人的索敌框隐藏，玩家更容易被偷袭`, color: '#d9e3ee' },
  storm:        { name: '暴风雨',   icon: '⛈️', desc: WEATHER_CFG.storm.desc || `玩家移动速度降低 ${Math.round(WEATHER_CFG.storm.playerSlow * 100)}%，可见度降低 ${WEATHER_CFG.storm.fogReduce} 格\n每隔一段时间都会刮来一阵暴风，强制移动玩家位置。`, color: '#ff9d5c' },
  thunderstorm: { name: '雷雨天',   icon: '⚡', desc: WEATHER_CFG.thunderstorm.desc || `玩家移动速度降低 ${Math.round(WEATHER_CFG.thunderstorm.playerSlow * 100)}%，可见度降低 ${WEATHER_CFG.thunderstorm.fogReduce} 格\n每 ${THUNDER_INTERVAL} 秒在玩家附近预警 ${THUNDER_WARN_TIME} 秒并降下雷电，造成 ${Math.round(THUNDER_DMG_PCT * 100)}% 最大生命值伤害。`, color: '#ffd84d' },
  bloodmoon:    { name: '血月',     icon: '🌕', desc: WEATHER_CFG.bloodmoon.desc || `敌人移动速度提升 ${NIGHT_ENEMY_SPEED_BONUS} 格\n敌人进入战斗后行动条立即提升 ${Math.round(BLOODMOON_BATTLE.actionBar * 100)}%，攻击力 +${Math.round(BLOODMOON_BATTLE.atk * 100)}%，最大生命值 +${Math.round(BLOODMOON_BATTLE.hp * 100)}%，速度 +${Math.round(BLOODMOON_BATTLE.spd * 100)}%\n击败敌人的经验值 +${Math.round(BLOODMOON_BATTLE.exp * 100)}%`, color: '#ff6b6b' },
  snow:         { name: '雪天',     icon: '❄️', desc: WEATHER_CFG.snow.desc || `玩家移动速度降低 ${Math.round(WEATHER_CFG.snow.playerSlow * 100)}%，灯光失效\n岩浆被冻结为石板、水面结冰\n战斗中双方附着霜冻\n呆满 ${SNOW_FROST_CFG.staySec} 秒后每 ${SNOW_FROST_CFG.dmgInterval} 秒扣除 1% 最大生命值。`, color: '#dff0ff' },
};

// ========== 🎲 地牢天气权重表（世界地图进入地牢时按场景随机抽取） ==========
// 键：世界地图场景 id（sceneId）；值为各天气的权重（0=永不出现，缺省键权重为0）
// 权重越高越容易抽中；所有键权重之和用于归一化
export const DUNGEON_WEATHER_TABLE = DUNGEON_EDIT_CFG.weatherTable;

// 按权重从表中随机抽取一个天气 id（无表/全0则返回 null）
export function rollDungeonWeather(sceneId, badMult = 1) {
  const table = (sceneId && DUNGEON_WEATHER_TABLE[sceneId]) || null;
  if (!table) return null;
  let total = 0;
  for (const k in table) if (table[k] > 0) total += table[k];
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const k in table) {
    if (table[k] <= 0) continue;
    // 🌲 森林使者：恶劣天气（非晴天）权重按比例降低
    const w = (badMult !== 1 && k !== 'sunny') ? table[k] * badMult : table[k];
    r -= w;
    if (r <= 0) return k;
  }
  return null;
}

// ========== 🎵 地牢音乐系统 ==========
export const DILAO_MUSIC_BASE = '/music/dilao/';
// 天气 → 循环背景音乐
export const DUNGEON_BG_MUSIC = {
  sunny: 'qingchen', fog: 'fog', bloodmoon: 'xueyue',
  rain: 'rain', storm: 'rain', thunderstorm: 'rain', snow: 'xiaxue',
};
// 各天气背景音乐音量（按天气 key 配置；雨类三兄弟共用 rain.mp3 但音量不同）
export const BG_VOLUME = DUNGEON_EDIT_CFG.bgVolume;
// 各音效音量（未配置的默认 0.7）：移动小声 / 沙地单独调大 / 受伤大声 / 打雷调低 / 宝箱锁0.6 开箱0.7 拾取0.5 / 暗影怪攻击0.7
export const SFX_VOLUME = DUNGEON_EDIT_CFG.sfxVolume;
// 地形 → 脚步声（玩家移动到的格子按 terrain 播放对应音效，未配置的格子用默认脚步 zoulu）
export const TERRAIN_FOOTSTEP_SFX = {
  岩浆: 'rongyan', 冰面: 'bingmian', 泥地: 'nitu',
  沙地: 'shatu', 雪地: 'xuedi', 石板: 'shiban',
  浅水: 'caishui', 深水: 'caishui',
};
