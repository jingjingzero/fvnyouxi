import { log2 } from "pixi.js";

/**
 * 所有地图定义都在这里
 * 每个 map 是一个函数，接收 WORLD_WIDTH，返回地图数据
 */
const MAPS = {
    // ========================
    // 区域 1：初始地图
    // ========================
    one01({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        const OFFSET = 0; // 👈 定义一个变量
        const OFFSETY = 76;//地面位置
        return {
            id: "one01",
            name: "第一章地图",
            effects: {
                reflection: {
                    enable: true,             // 是否开启水面
                    waterWorldY: 90 * VH      // 水面高度（世界坐标）
                },
                // 以后还能加：bloom, blur, fog 等
            },
            lightSource: {
                x: WORLD_WIDTH * 0.5, // 光源X世界坐标
                y: 60 * VH,           // 光源Y世界坐标（越高影子偏移越大）
                offsetScale: 0.02,  // 影子偏移强度
                show: true,
                night: {
                    enable: true, // true=进图自动开启昼夜滤镜 false=关闭
                    speed: 0.0015 // 昼夜流逝速度
                }
            },
            TopMap: 0,//地面位置
            backgroundImages: ['map1_01', 'map1_02'], //【地图背景】
            offsetX: OFFSET, // 区域1在 X=0 位置
            currentGroundY: OFFSETY,
            WORLD_WIDTH: WORLD_WIDTH,
            rectPoolArr: [
                { x: WORLD_WIDTH * 0.5, y: 100 * VH, w: WORLD_WIDTH, h: 11 * VH, color: undefined, withBody: true, create: false },
                { x: 0, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: false },
                { x: WORLD_WIDTH, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: false },
                // { x: WORLD_WIDTH * 0.97, y: 88 * VH, w: 25 * VH, h: 50 * VH, withBody: true, create: false, zIndex: 0, tietu: null, movable: false },//障碍物
            ],
            TriggerAreaArr: [
                { x: WORLD_WIDTH * 0.85, y: 89 * VH, w: 15 * VH, h: 10 * VH, color: undefined, withBody: true, create: true, zIndex: -1, movable: false, isSensor: false, label: { name: "电梯", type: true, ticker: null } },
                //  { x: WORLD_WIDTH * 0.75, y: 84 * VH, w: 15 * VH, h: 10 * VH, color: undefined, withBody: true, create: true, zIndex: 100, movable: false, isSensor: false, label: { name: "电梯", type: true, ticker: null } },
                {
                    x: WORLD_WIDTH * 0.99,
                    y: 86 * VH,
                    w: 4 * VH,
                    h: 12 * VH,
                    label: "teleportTrigger", // 👈 自定义标记，用来识别它
                    enableAABB: 1,
                    name: "TP1",
                    teleportToMap: "desert_01",    // 目标地图ID
                }
            ],
            trianglePoolArr: [],
            circlePoolArr: [],
            npcDataList: [
                {
                    id: 1,
                    type: "ranged", juese: "two219", player: 3, xuetiaoPosition: 21, x: 0.7, speed: 0.3, data: {
                        name: '史莱姆',
                        hp: 1500,
                        maxHp: 1500,
                        baseSpeed: 90,
                        speed: 90,
                        camp: 'enemy',
                        position: 1,
                        baseArmor: 50,
                        armor: 50,
                        baseAttack: 70,
                        attack: 70,
                        baseLuck: 10,
                        luck: 10
                    }
                },
                // { type: "ranged", juese: "huli", player: 2, maxHp: 500, currentHp: 500, xuetiaoPosition: 21, x: 0.64, TopH: 9, speed: 0.3 },
                // { type: "ranged", juese: "jinmao", player: 2, maxHp: 500, currentHp: 500, xuetiaoPosition: 21, x: 0.7, TopH: 9, speed: 0.3 },
                // { type: "ranged", juese: "yu", player: 2, maxHp: 500, currentHp: 500, xuetiaoPosition: 21, x: 0.69, TopH: 9, speed: 0.3 },
            ],
            wenhaoHudong: [
                {
                    x: WORLD_WIDTH * 0.8, y: 71.9 * VH, show: true, isInteractive: true,
                    wuxian: -1,//可点击次数，-1可以无限点击
                    isFloatEnable: true,//是否会上下浮动
                },
            ],

            // 出生点
            playerSpawnX: OFFSET + WORLD_WIDTH * 0.9,
            playerSpawnY: OFFSETY * VH,
        };
    },

    // ========================
    // 区域 2：沙漠地图
    // ========================
    desert_01({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        const OFFSET = 250 * VW; // 👈 定义一个变量
        const OFFSETY = 80;//地面位置

        return {
            id: "desert_01",
            name: "沙漠 · 炙热",
            lightSource: {
                x: OFFSET + WORLD_WIDTH * 0.5, // 光源X世界坐标
                y: 60 * VH,           // 光源Y世界坐标（越高影子偏移越大）
                offsetScale: 0,     // 影子偏移强度
                show: false,
                night: {
                    enable: false,
                }
            },
            TopMap: 3.5,//地面位置
            backgroundImages: ['wall_01'], //【地图背景】
            offsetX: OFFSET,// 区域2 放在 6000 位置，完全不重叠
            currentGroundY: OFFSETY,
            WORLD_WIDTH: WORLD_WIDTH,
            rectPoolArr: [
                { x: WORLD_WIDTH * 0.5, y: 100 * VH, w: WORLD_WIDTH, h: 11 * VH, color: undefined, withBody: true, create: false },
                { x: 0, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: true },
                { x: WORLD_WIDTH, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: true },
            ],
            TriggerAreaArr: [
                {
                    x: WORLD_WIDTH * 0.005,
                    y: 89 * VH,
                    w: 4 * VH,
                    h: 10 * VH,
                    label: "teleportTrigger", // 👈 自定义标记，用来识别它
                    enableAABB: 1,
                    name: "TP0",
                    teleportToMap: "one01",    // 目标地图ID
                }
            ],
            trianglePoolArr: [],
            circlePoolArr: [],
            npcDataList: [
            ],
            wenhaoHudong: [],

            // 出生点
            playerSpawnX: OFFSET + WORLD_WIDTH * 0.02,
            playerSpawnY: OFFSETY * VH,
        };
    },
    desert_02({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        const OFFSET = 900 * VW; // 👈 定义一个变量
        const OFFSETY = 80;//地面位置

        return {
            id: "desert_02",
            name: "沙漠 · 炙热",
            lightSource: {
                x: OFFSET + WORLD_WIDTH * 0.5, // 光源X世界坐标
                y: 60 * VH,           // 光源Y世界坐标（越高影子偏移越大）
                offsetScale: 0,     // 影子偏移强度
                show: false,
                night: {
                    enable: false,
                }
            },
            TopMap: 3.5,//地面位置
            backgroundImages: ['wall_02'], //【地图背景】
            offsetX: OFFSET,// 区域2 放在 6000 位置，完全不重叠
            currentGroundY: OFFSETY,
            WORLD_WIDTH: WORLD_WIDTH,
            rectPoolArr: [
                { x: WORLD_WIDTH * 0.5, y: 100 * VH, w: WORLD_WIDTH, h: 11 * VH, color: undefined, withBody: true, create: false },
                { x: 0, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: true },
                { x: WORLD_WIDTH, y: 100 * VH, w: WORLD_WIDTH * 0.002, h: 200 * VH, color: undefined, withBody: true, create: true },
            ],
            TriggerAreaArr: [
            ],
            trianglePoolArr: [],
            circlePoolArr: [],
            npcDataList: [

            ],
            wenhaoHudong: [],

            // 出生点
            playerSpawnX: OFFSET + WORLD_WIDTH * 0.1,
            playerSpawnY: OFFSETY * VH,
        };
    },

};
export function getMapData(mapId, params) {
    const mapFactory = MAPS[mapId];
    if (!mapFactory) {
        console.warn(`[Map] 未找到地图: ${mapId}`);
        return { id: mapId, name: "unknown", objects: [] };
    }
    // 🔥 删掉所有缓存！每次都重新执行！
    return mapFactory(params);
}

export function getAllMapIds() {
    return Object.keys(MAPS);
}