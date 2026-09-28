/**
 * 所有地图定义都在这里
 * 每个 map 是一个函数，接收 WORLD_WIDTH，返回地图数据
 *
 * 🏔️ 远景图（farBackgroundImages）：远景和背景一样是「长图分段」——一张完整长图可能切成多段
 *   （如 map1_01yj + map1_02yj 拼接成一张），支持多张远景图各自独立视差 + zIndex：
 *   1. 字符串数组（旧写法，兼容）：一张长远景图的多段，整体拼接，默认视差 0.5、zIndex 0
 *        farBackgroundImages: ['map1_01yj', 'map1_02yj']
 *   2. 对象数组（推荐，多层景深）：每个对象 = 一组长图（images 内多段拼接），
 *      parallax 0~1 越大越远移动越慢、zIndex 越大越靠前
 *        farBackgroundImages: [
 *          { images: ['map1_01yj', 'map1_02yj'], parallax: 0.3, zIndex: 1 },  // 最远的山
 *          { images: ['map2_01yj', 'map2_02yj'], parallax: 0.7, zIndex: 2 },  // 近处树林
 *        ]
 *
 * 🏔️ 背景向上延伸（防止坡度穿帮）：
 *   背景图只有 1080px 高（覆盖世界 y ∈ [0, 100VH]），地形坡度走到图顶之上（y < 0）会穿帮。
 *   给地图配 bgTopRepeat: N → 背景图/远景图在 y 上方额外平铺 N 份（向上重复裁剪的背景图）。
 *   例：bgTopRepeat: 1 → 再往上渲染一份，覆盖 y ∈ [-100VH, 0]。
 *   注意：这只是视觉补图，地形（高度图/物理）仍限制在 0~100VH 内。
 */
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import { getTiledMapCached, buildTiledCollisionRects, getTiledBounds, getGroundTopTiledY } from "./tiledMap.js";
const user = useCounterStore();


const MAPS = {
    desert_01({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        const OFFSET = 0; // 👈 所有地图统一用 0：多地图靠「传送时只加载当前地图」切换，不用 X 偏移区分
        const OFFSETY = 75.5;//地面位置

        return {
            id: "desert_01",
            name: "沙漠 · 炙热",
            lightSource: {
                night: {
                    enable: true,
                    fixedTime: 'morning'
                }
            },
            TopMap: 0,//地面位置
            backgroundImages: [], //【地图背景】
            bgTopRepeat: 0,
            farBackgroundImages: ['map1_01yj', 'map1_02yj', 'map1_03yj', 'map1_04yj'], //【远景背景】（最底层，视差最慢）
            //   farTopImages: ['map1_01', 'map1_02'],//第二层远景
            spineBackground: { //【Spine 动态背景】
                skelName: 'changjing1_skel',    // spine 骨骼数据别名
                atlasName: 'changjing1_atlas',  // spine 图集别名
                animationName: null,            // 动画名称，null 则自动播放第一个动画
            },
            //   heightMapImages: ['heibai01', 'heibai02', 'heibai03', 'heibai04'],//黑白
            spineForeground: {
                skelName: 'changjing2_skel',      // spine 骨骼数据别名
                atlasName: 'changjing2_atlas',    // spine 图集别名
                animationName: null,       // 动画名称，null 自动播放第一个
            },
            // 🌉 高层 Spine 前景（角色之上）—— 与 spineForeground 同时使用
            // spineFront: {
            //     skelName: 'changjing2_skel',      // spine 骨骼数据别名
            //     atlasName: 'changjing2_atlas',    // spine 图集别名
            //     animationName: null,              // 动画名称，null 自动播放第一个
            // },
            offsetX: OFFSET,// 区域2 放在 6000 位置，完全不重叠
            currentGroundY: OFFSETY,
            WORLD_WIDTH: WORLD_WIDTH,
            rectPoolArr: [
                { x: WORLD_WIDTH * 0.5, y: 95 * VH, w: WORLD_WIDTH, h: 15 * VH, color: undefined, withBody: true, create: false },
                { x: 0, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: true },
                { x: WORLD_WIDTH, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: true },
            ],
            TriggerAreaArr: [
                // {
                //     x: WORLD_WIDTH * 0.005,
                //     y: 89 * VH,
                //     w: 4 * VH,
                //     h: 10 * VH,
                //     label: "teleportTrigger", // 👈 自定义标记，用来识别它
                //     name: "TP0",
                //     teleportToMap: "desert_01", // 目标地图ID
                // }
            ],
            trianglePoolArr: [],
            circlePoolArr: [],
            // NPC 不再在此定义，全部由对话系统 createNPC 动态创建（写入 user.pixi.npcDataList）
            // 休息问号 rest_01 也由 zz116 剧情动态创建（createWenhaoHudong），故此处不再维护
            // 出生点（居中 50%）
            playerSpawnX: OFFSET + WORLD_WIDTH * 0.5,
            playerSpawnY: OFFSETY * VH,
        };
    },
    desert_02({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        const OFFSET = 0; // 👈 所有地图统一用 0：多地图靠「传送时只加载当前地图」切换，不用 X 偏移区分
        const OFFSETY = 95;//地面位置

        return {
            id: "desert_02",
            name: "沙漠 · 炙热",
            lightSource: {
                night: {
                    enable: true,
                    // ⚠️ 战斗地图默认白天（昼夜按地图配置）
                    fixedTime: 'morning'
                }
            },
            TopMap: 3.5,//地面位置
            backgroundImages: ['map02', 'map021'], //【地图背景】
            farBackgroundImages: [], //【远景背景】（最底层，视差最慢）
            offsetX: OFFSET,// 区域2 放在 6000 位置，完全不重叠
            currentGroundY: OFFSETY,
            WORLD_WIDTH: WORLD_WIDTH,
            rectPoolArr: [
            ],
            TriggerAreaArr: [
            ],
            trianglePoolArr: [],
            circlePoolArr: [],
            // 出生点
            playerSpawnX: OFFSET + WORLD_WIDTH * 0.1,
            playerSpawnY: OFFSETY * VH,
        };
    },

    dungeon_01({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        const TILED_URL = '/map/dungeon.tmj';
        const TILED_SCALE = VH / 10.8;
        const tiledData = getTiledMapCached(TILED_URL);
        const tiledBounds = tiledData ? getTiledBounds(tiledData.mapData, TILED_SCALE) : { width: WORLD_WIDTH, height: 0 };
        const tiledRects = tiledData ? buildTiledCollisionRects(tiledData.mapData, TILED_SCALE, { worldYOffset: 100 * VH }) : [];
        const groundTopTiledY = tiledData ? getGroundTopTiledY(tiledData.mapData) : 0;
        const mapHeightTiledPx = tiledData ? tiledData.mapData.height * tiledData.mapData.tileheight : 0;
        const groundWorldY = 100 * VH - (mapHeightTiledPx - groundTopTiledY) * TILED_SCALE;
        return {
            id: "dungeon_01", name: "地牢探索", effects: {},
            lightSource: { night: { enable: true, fixedTime: 'night' } },
            TopMap: 0, tiled: { url: TILED_URL }, tiledScale: TILED_SCALE,
            backgroundImages: [], farBackgroundImages: [], offsetX: 0,
            currentGroundY: groundWorldY / VH, WORLD_WIDTH: tiledBounds.width,
            rectPoolArr: [
                ...tiledRects.map(r => ({ ...r, color: undefined, withBody: true, create: false })),
                { x: 0, y: 200 * VH, w: 2, h: (tiledBounds.height || 0) + 300 * VH, color: undefined, withBody: true, create: false },
                { x: tiledBounds.width, y: 200 * VH, w: 2, h: (tiledBounds.height || 0) + 300 * VH, color: undefined, withBody: true, create: false },
            ],
            TriggerAreaArr: [], trianglePoolArr: [], circlePoolArr: [], wenhaoHudong: [],
            playerSpawnX: tiledBounds.width * 0.15, playerSpawnY: groundWorldY - 5 * VH,
        };
    },


};
export function getMapData(mapId, params) {
    const mapFactory = MAPS[mapId];
    if (!mapFactory) {
        console.warn(`[Map] 未找到地图: ${mapId}`);
        return { id: mapId, name: "unknown", objects: [] };
    }

    // 每次都从模板重新生成（保证 create:false 等状态字段重置，地板/碰撞重新实体化）
    const mapData = mapFactory(params);

    // 过滤掉已永久删除的问号（读档后自动生效，删除状态由 pinia 持久化）
    if (mapData.wenhaoHudong && mapData.wenhaoHudong.length > 0) {
        mapData.wenhaoHudong = mapData.wenhaoHudong.filter(w => {
            if (!w.id) return true; // 没有 id 的不过滤（无限点击类）
            return !user.isWenhaoRemoved(mapId, w.id);
        });
    }

    // 设置事件监听（永久删除问号的事件响应，只需初始化一次）
    user.setupMapEventListeners();

    return mapData;
}

export function getAllMapIds() {
    return Object.keys(MAPS);
}


/** 收集所有使用 Tiled 导入的地图的 tmj/tmx URL（供初始化预加载） */
export function getTiledMapUrls() {
    const urls = [];
    for (const key of Object.keys(MAPS)) {
        try {
            const m = MAPS[key]({ WORLD_WIDTH: 0, VH: v => v, VW: v => v });
            if (m && m.tiled && m.tiled.url) urls.push(m.tiled.url);
        } catch (e) { /* 单个地图模板失败不影响其他 */ }
    }
    return urls;
}
// ========================
// 🌍 地图注册表（统一地图元信息，为多地图扩展埋下伏笔）
// ========================
// 新增地图时：
//   1. 在 MAPS 中定义地图模板（rectPoolArr / wenhaoHudong / 背景 / 宽度来源）
//   2. 在这里登记元信息（世界地图场景 / 传送面板）
// 世界地图场景（scene）字段说明：
//   - label / icon / desc : 世界地图节点显示名、图标 emoji、描述
//   - img                 : 世界地图节点专属图标图片（public/mapicon/ 下的独立图片），每个场景一个
//   - x / y               : 世界地图节点位置，用百分比（0~100），以地图中心 (0,0) 为参照：
//                           50,50 = 地图正中心（对应 mapditu 地图的世界坐标 0,0）
//                           0,0   = 地图左上角（世界坐标 -1000,-1000）
//                           100,100 = 地图右下角（世界坐标 +1000,+1000）
//   - type                : 'story' 剧情/普通地图 | 'battle' 战斗地图
//   - links               : （可选）该地标的连线对象（其他地标 id 数组），世界地图会为每一对画一条直线；
//                           不配 links 的地标不连任何线（无向，A↔B 只画一次，双向配置不重复）
// 不配 scene 的地图（如 desert_02 战斗地图）不直接出现在世界地图上，
// 但可以被战斗区域节点（scene.type === 'battle'）通过 mapId 引用。
// 🗺️ 世界地图节点图标（当前统一先用 map1~4，后续可给每个场景换成专属图片）
//    导出供对话/剧情 addUnlockWorldMapScene 等场景直接引用（如 img: MAP_ICONS[0]）
export const MAP_ICONS = [1, 2, 3, 4].map(n => new URL(`../../../assets/map/map${n}.webp`, import.meta.url).href);

// 🏗️ 战斗区域节点工厂：多个战斗区域指向同一张战斗地图 desert_02，仅数值不同，消除重复
//    maxDepth: 该地图的最大深入度（到达后进入 Boss 战，各地图不同）
//    boss: Boss 战敌人配置（customBattle 格式，怪物完全自定义、属性不随深入度变化）
//    小怪用 monster1（暗影狼，可配数量/血量/速度），Boss 用 guaiwu2（魔化猫王）
function battleNode({ label, icon, img, x, y, desc, links, maxDepth, wolfCount = 1, wolfHp = 120, wolfSpeed, catHp = 400, cost = 1 }) {
    return {
        label, icon, img, x, y,
        type: 'battle', mapId: 'desert_02', desc,
        links,
        maxDepth,
        cost, // 进入该地牢消耗的精力值
        boss: {
            enemies: [
                { monsterType: 'monster1', count: wolfCount, name: '暗影狼', hp: wolfHp, attack: 8, armor: 5, ...(wolfSpeed != null ? { speed: wolfSpeed } : {}) },
                { monsterType: 'guaiwu2', count: 1, name: '魔化猫王', hp: catHp, attack: 18, armor: 80, baseExp: 200 },
            ],
            noDepthUnlock: true,
        },
    };
}

const MAP_META = {
    desert_01: {
        label: '绿洲', icon: '🏜️', img: MAP_ICONS[0], x: 40, y: 63,
        type: 'story', mapId: 'desert_01', desc: '寻找伙伴的沙漠',
        links: ['battle_01'],
    },
    // 战斗区域节点（可多个战斗区域指向同一张战斗地图 desert_02）
    battle_01: battleNode({ label: '幽暗森林', cost: 1, icon: '⚔️', img: MAP_ICONS[1], x: 46, y: 58, desc: '深入讨伐魔物', links: ['desert_01'], maxDepth: 100, wolfCount: 1, wolfHp: 50, wolfSpeed: 50, catHp: 40 }),
    battle_02: battleNode({ label: '碎石场', cost: 2, icon: '🌑', img: MAP_ICONS[2], x: 25, y: 56, desc: '阴暗的林间狩猎场', links: ['battle_01'], maxDepth: 150, wolfCount: 2, wolfHp: 120, catHp: 400 }),
    battle_03: battleNode({ label: '宽阔平原', cost: 3, icon: '⛏️', img: MAP_ICONS[3], x: 52, y: 45, desc: '废弃的矿洞，魔物横行', links: ['battle_02'], maxDepth: 170, wolfCount: 2, wolfHp: 120, catHp: 400 }),
    // 🔓 剧情解锁节点（读档不丢失）：unlockBy 指定对话全部完成后才在世界地图显示
    //    判断用持久化的对话标记（user.isDialogueComplete）→ 读档/刷新后依旧生效
    //    启用：把下面整段取消注释，改成你的新地图信息
    //    注意：mapId 必须对应 MAPS 里已存在的地图；要全新地图需先在 MAPS 新增
    // addUnlockWorldMapScene({
    //   id: 'new_battle_01',
    //   label: '新讨伐区', icon: '⚔️', img: MAP_ICONS[1], x: 60, y: 50,
    //   type: 'battle', mapId: 'desert_02', desc: '击败魔物潮后解锁的讨伐区',
    //   links: ['battle_03'],
    //   maxDepth: 150,                      // 深入度上限
    //   boss: {                             // 可选：到达上限后的 Boss 战
    //     enemies: [
    //       { monsterType: 'monster1', count: 2, name: '暗影狼', hp: 120, attack: 8, armor: 5 },
    //       { monsterType: 'guaiwu2', count: 1, name: '魔化猫王', hp: 400, attack: 18, armor: 80, baseExp: 200 },
    //     ],
    //     noDepthUnlock: true,
    //   },
    // }, ['Day5魔物潮1']);
    // addUnlockWorldMapScene({
    //   id: 'new_zone_01',
    //   label: '新区域', icon: '🗺️', img: MAP_ICONS[0], x: 60, y: 50,
    //   type: 'story', mapId: 'desert_01', desc: '击败魔物潮后解锁的新区域',  // 传送到已有地图
    //   links: ['battle_03'],
    // }, ['Day5魔物潮1']);
};

/** 获取所有地图元信息（含世界地图场景） */
export function getAllMapMeta() {
    return MAP_META;
}

// ========================
// 🗺️ 世界地图地标动态管理（供对话/剧情动态增删改世界地图节点）
// ========================
// 用法（对话节点 onEnter 里调用）：
//   addWorldMapScene({ id: 'new_01', label: '新地点', icon: '📍', img: MAP_ICON_IMG, x: 30, y: 50, type: 'story', mapId: 'desert_01', desc: '描述' })
//   removeWorldMapScene('new_01')
//   updateWorldMapScene('new_01', { x: 40, y: 60, label: '改名' })
// 说明：
//   - id 唯一，add 时若已存在则覆盖更新
//   - x / y 用百分比（0~100），50,50 = 地图中心（与 MAP_META 一致）
//   - type: 'story'（点击传送）| 'battle'（点击弹战斗准备面板）
//   - mapId: 传送到哪张地图；battle 类型还需配 maxDepth / boss（可省略走默认）
//   - img: 节点图标图片路径（可省略，不显示图片）
// 修改后下次打开世界地图即生效（WorldMap 每次打开都重新从 MAP_META 生成节点）

/** 增加/覆盖一个世界地图地标 */
export function addWorldMapScene(cfg) {
    if (!cfg || !cfg.id) {
        console.warn('[addWorldMapScene] 缺少 id，已忽略');
        return;
    }
    const { id, ...rest } = cfg;
    MAP_META[id] = { ...MAP_META[id], ...rest };
    return MAP_META[id];
}

/** 删除一个世界地图地标 */
export function removeWorldMapScene(id) {
    if (MAP_META[id]) {
        delete MAP_META[id];
        return true;
    }
    return false;
}

/** 修改一个世界地图地标（只改传入的字段） */
export function updateWorldMapScene(id, patch) {
    if (!MAP_META[id]) {
        console.warn(`[updateWorldMapScene] 地标不存在: ${id}`);
        return null;
    }
    MAP_META[id] = { ...MAP_META[id], ...patch };
    return MAP_META[id];
}

/** 获取世界地图场景列表（供 WorldMap.vue 渲染，替代硬编码 scenes） */
export function getWorldMapScenes() {
    // 🔄 读档 / 刷新恢复：已解锁（对话标记持久化）但 MAP_META 缺失的「动态添加」节点重新补加
    //    解决 addUnlockWorldMapScene 只在内存加节点、刷新会丢的问题 → 读档后节点依旧显示
    for (const { cfg, unlockBy } of UNLOCKED_SCENES) {
        if (unlockBy.every(id => user.isDialogueComplete(id)) && !MAP_META[cfg.id]) {
            addWorldMapScene(cfg);
        }
    }
    // 🔓 剧情解锁节点：unlockBy 指定的对话全部完成后才在世界地图显示
    //    判断基于持久化的对话标记（user.isDialogueComplete，Pinia persist 到 localStorage）
    //    → 读档 / 刷新页面后标记恢复，节点依旧显示，不会丢失
    return Object.entries(MAP_META)
        .filter(([, meta]) => !meta.unlockBy?.length || meta.unlockBy.every(id => user.isDialogueComplete(id)))
        .map(([id, meta]) => ({ id, ...meta }));
}

// 🔓 剧情解锁节点注册表：addUnlockWorldMapScene 注册的节点（节点定义静态保存在这里）
//    解锁条件满足时 add 进 MAP_META；读档/刷新后由 getWorldMapScenes 自动补加，不会丢失
const UNLOCKED_SCENES = [];

/**
 * 「剧情解锁」世界地图节点 —— 在对话 onEnter 里调用，满足「动态添加进去」的写法
 * @param {object} cfg      同 addWorldMapScene 的节点配置（id/label/icon/x/y/type/mapId/desc/links，img 可省略）
 * @param {string[]} unlockBy 解锁所需完成的对话 id 列表（如 ['Day5魔物潮1']）
 *  - 解锁条件已满足 → 立即 add 进 MAP_META（本次会话打开世界地图即显示）
 *  - 未满足 → 仅注册；条件满足后（读档 / 下次打开世界地图）自动补加，读档不丢失
 */
export function addUnlockWorldMapScene(cfg, unlockBy = []) {
    if (!cfg || !cfg.id) {
        console.warn('[addUnlockWorldMapScene] 缺少 id，已忽略');
        return;
    }
    UNLOCKED_SCENES.push({ cfg, unlockBy });
    if (unlockBy.every(id => user.isDialogueComplete(id))) {
        addWorldMapScene(cfg);
    }
    return MAP_META[cfg.id];
}

/** 获取某张地图的元信息（无则返回 null） */
export function getMapMeta(mapId) {
    return MAP_META[mapId] || null;
}

// =====================================
// 🧱 对话中动态添加/移除障碍物（rectPoolArr）—— 读档后依旧生效
// =====================================
// 工具函数在 @/pages/pixi/matter1/daoju.js（addRectObstacle / removeRectObstacle / updateRectObstacle）
//
// 用法：在对话节点的 onEnter 里调用，例如：
//   import { addRectObstacle, removeRectObstacle } from '@/pages/pixi/matter1/daoju.js';
//
//   // 1) 纯碰撞墙（不可见）
//   onEnter: () => {
//     addRectObstacle({
//       mapId: 'desert_01',
//       obstacleId: 'wall_after_plot',   // 唯一标识，防重复
//       xPercent: 0.5,                   // X 百分比 0~1（地图正中间）
//       yPercent: 0.8,                   // Y 百分比 0~1（底部在 80% 高度）
//       w: 20, h: 30,                    // 宽高（像素）
//     });
//   },
//
//   // 2) Spine 障碍物（看得见的石头/木箱/门 + 碰撞）：绑定骨骼名即可
//   //    🎯 Spine 图片会自动等比缩放到「贴合 w × h 矩形」大小（宽度贴合 w、高度不超 h），无需手动调大小
//   onEnter: () => {
//     addRectObstacle({
//       mapId: 'desert_01',
//       obstacleId: 'rock_1',
//       spineName: 'ceshispine',          // 骨骼名（loadAssets.js 里注册了 xxx_skel/atlas）
//       spineAnimation: 'animation',       // 可选：动画名，不传自动播放第一个
//       spineLoop: true,                   // 可选：动画循环，默认 true
//       spineSkin: 'pifu1',                // 可选：皮肤名
//       spineScale: 1,                     // 可选：在自动贴合基础上再微调（1=贴合大小）
//       xPercent: 0.4, yPercent: 0.75,     // 底部中心位置（百分比）
//       w: 40, h: 50,                      // 物理碰撞盒宽高（像素）→ Spine 自动贴合此大小
//     });
//   },
//   // 拆除：removeRectObstacle('desert_01', 'rock_1')
//
// 说明：
//   - 数据写入 user.pixi.mapDataList 对应地图的 rectPoolArr（已持久化）→ 读档自动恢复
//   - 当前地图添加后立即重建刚体（emitter 事件），不需要切图
//   - 坐标用百分比 0~1（x 相对地图宽度、y 相对窗口高度），或像素 x/y
//   - rectPoolArr 里的字段：x/y/w/h 位置尺寸、withBody 物理、create 是否显示图形、
//     isStatic 是否静态、color/zIndex/label 等

// =====================================
// 🧍 单个 NPC 单独设置 Y 坐标（方式二）
// =====================================
// 对话系统 createNPC（jingling-shared.js）和主世界 createNPC（npcManager.js）
// 都支持 config.y 自定义 NPC 的 Y 位置：
//
//   - config.y 传 0~1 → 视为百分比（相对屏幕高度 100*VH），自动转像素
//   - config.y 传 >1  → 视为像素，直接用
//   - 不传 config.y  → 用默认 80*VH
//
// 示例（对话 onEnter 里）：
//   createNPC({
//     id: 4, juese: 'tuzi', player: 3, mapId: 'desert_01',
//     x: 0.35,            // X 百分比
//     y: 0.6,             // 🎯 Y 百分比（屏幕 60% 高度）→ 自动转像素
//     TopMap: 1,          // 可选：额外视觉偏移（VH 单位）
//     data: { name: '兔子' },
//   });
//
// 注意：最终视觉 Y = body.y（config.y 换算后） + (NPC.TopMap + 地图TopMap) * VH
