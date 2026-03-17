// src/data/mapData.js

/**
 * 所有地图定义都在这里
 * 每个 map 是一个函数，接收 WORLD_WIDTH，返回地图数据
 */
const MAPS = {
    one01({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        return {
            id: "one01",
            name: "第一章地图",
            //矩形物体
            rectPoolArr: [
                //地板1黑色
                {
                    x: WORLD_WIDTH * 0.5,
                    y: 100 * VH(),
                    w: WORLD_WIDTH,
                    h: 11 * VH(),
                    color: undefined,
                    withBody: true, //是否有碰撞体积
                    create: false, //是否显示矩形
                },
                //左墙
                {
                    x: 0,
                    y: 100 * VH(),
                    w: WORLD_WIDTH * 0.002,
                    h: 200 * VH(),
                    color: undefined,
                    withBody: true, //是否有碰撞体积
                    create: true, //是否显示矩形
                },
                //右墙
                {
                    x: WORLD_WIDTH,
                    y: 100 * VH(),
                    w: WORLD_WIDTH * 0.002,
                    h: 200 * VH(),
                    color: undefined,
                    withBody: true, //是否有碰撞体积
                    create: true, //是否显示矩形
                },
                //无碰撞在角色前面
                // {
                //     x: WORLD_WIDTH * 0.2,
                //     y: 82.5 * VH(),
                //     w: 20 * VH(),
                //     h: 15 * VH(),
                //     color: undefined,
                //     withBody: false, //是否有碰撞体积
                //     create: true, //是否显示矩形
                //     zIndex: 100, //z轴高度
                // },
                {
                    x: WORLD_WIDTH * 0.97,
                    y: 88 * VH(),
                    w: 25 * VH(),
                    h: 50 * VH(),
                    withBody: true, //是否有碰撞体积
                    create: false, //是否显示矩形
                    zIndex: 0, //z轴高度
                    tietu: null,
                    movable: false,//是否可推动
                    // isSensor:true,//true无碰撞
                },
         
            ],
            //矩形区域触发
            TriggerAreaArr: [
                // //无碰撞在角色前面
                // {
                //     x: WORLD_WIDTH * 0.15,
                //     y: 82.5 * VH(),
                //     w: 12 * VH(),
                //     h: 20 * VH(),
                //     color: undefined,
                //     withBody: true, //是否有碰撞体积
                //     create: true, //是否显示矩形
                //     zIndex: 100, //z轴高度
                //     Area: {
                //         label:'playerBottom',
                //         type:"tips",
                //         message:"前方可能有敌人",
                //         shiti:false
                //     },//区域检测，传感器
                // },
                // {
                //     x: WORLD_WIDTH * 0.15,
                //     y: 89 * VH(),
                //     w: 15 * VH(),
                //     h: 10 * VH(),
                //     color: undefined,
                //     withBody: true, //是否有碰撞体积
                //     create: true, //是否显示矩形
                //     zIndex: 100, //z轴高度
                //     movable: false,//是否可推动
                //     isSensor: false,
                //     label: {
                //         name: "电梯",
                //         type: true,
                //         ticker:null
                //     },
                // },
            ],
            trianglePoolArr: [
                {
                    x: WORLD_WIDTH * 0.3,
                    y: 88 * VH(),
                    w: 20 * VH(),
                    h: 10 * VH(),
                    color: undefined,
                    withBody: true, //是否有碰撞体积
                    create: true, //是否显示矩形
                    zIndex: 0, //z轴高度
                },
            ],
            circlePoolArr: [
                // {
                //     x: WORLD_WIDTH * 0.25,
                //     y: 88 * VH(),
                //     r: 10 * VH(),
                //     color: undefined,
                //     withBody: true, //是否有碰撞体积
                //     create: true, //是否显示矩形
                //     zIndex: 0, //z轴高度
                // },
            ],
            //敌人
            npcDataList: [
                {
                    type: "melee",//近战
                    juese:"mao",
                    player: 2,
                    maxHp: 5,
                    currentHp: 5,
                    x: 0.9,
                    TopH:5,
                    width:10,
                    height:9,
                    speed:0.22,
                    aiMode:"follow"
                },
                {
                    type: "ranged",//远程
                    juese:"spineboy",
                    player: 2,
                    maxHp: 5,
                    currentHp: 5,
                    x: 0.8,
                    TopH:10,
                    speed:0.3,
                },
            ],
            //特殊物品
            teshuData:[
                {
                    x: WORLD_WIDTH * 0.776,
                    y: 71.9 * VH(),
                    texture:"jingdao",
                    show:true,
                    isInteractive:true,//未互动
                    interactRange:20*VW(),//互动范围
                },
            ],
            //问号互动
            wenhaoHudong:[
                {
                    x: WORLD_WIDTH * 0.9,
                    y: 71.9 * VH(),
                    texture:"jingdao",
                    show:true,
                    isInteractive:true,//未互动
                    interactRange:25*VW(),//互动范围
                },
            ]
        };
    },

    desert_01({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        return {
            id: "desert_01",
            name: "沙漠 · 炙热",
            objects: [
                {
                    type: "ground",
                    x: WORLD_WIDTH / 2,
                    y: 92 * VH(),
                    width: WORLD_WIDTH,
                    height: 12 * VH(),
                },
                {
                    type: "spike",
                    x: WORLD_WIDTH * 0.5,
                    y: 90 * VH(),
                    width: 16 * VW(),
                    height: 6 * VH(),
                },
                {
                    type: "goal",
                    x: WORLD_WIDTH * 0.95,
                    y: 85 * VH(),
                },
            ],
        };
    },

    boss_01({ WORLD_WIDTH, VH = v => v, VW = v => v }) {
        return {
            id: "boss_01",
            name: "Boss · 决战",
            objects: [
                {
                    type: "ground",
                    x: WORLD_WIDTH / 2,
                    y: 96 * VH(),
                    width: WORLD_WIDTH,
                    height: 8 * VH(),
                },
                {
                    type: "boss",
                    x: WORLD_WIDTH * 0.7,
                    y: 80 * VH(),
                },
            ],
        };
    },
};
/**
 * 获取地图数据
 */
export function getMapData(mapId, params) {
    const mapFactory = MAPS[mapId];

    if (!mapFactory) {
        console.warn(`[Map] 未找到地图: ${mapId}`);
        return {
            id: mapId,
            name: "unknown",
            objects: [],
        };
    }

    return mapFactory(params);
}

/**
 * （可选）获取所有地图 ID
 */
export function getAllMapIds() {
    return Object.keys(MAPS);
}
//动画
export const animationConfigs = {
    "爆炸": {
        textureKey: "baozha",
        frameW: 200,
        frameH: 200,
        gapX: 10,
        gapY: 10,
        nCols: 3,
        nRows: 2,
        frameTime: 4,
        loop: false,
        loopStartIndex: 0,
        offsetX: 10,
        offsetY: 10,
        widthVH: 10,   // 5 * VH()
        heightVH: 10,  // 5 * VH()
    },
    "子弹": {
        textureKey: "zidan",
        frameW: 200,
        frameH: 100,
        gapX: 20,
        gapY: 20,
        nCols: 3,
        nRows: 3,
        frameTime: 10,
        loop: true,
        loopStartIndex: 1,
        offsetX: 0,
        offsetY: 0,
        widthVH: 15,    // 1 * VH()
        heightVH: 7.5, // 0.5 * VH()
        visible: false // 默认隐藏
    },
    "激光": {
        textureKey: "jiguang",
        frameW: 600,
        frameH: 200,
        gapX: 10,
        gapY: 10,
        nCols: 3,
        nRows: 2,
        frameTimes: [
            0.02,
            0.02,
            0.03, // 蓄力
            0.03,
            0.12,
            0.12, // 飞行
        ],
        loop: true,
        loopStartIndex: 4,
        offsetX: 0,
        offsetY: 0,
        visible: true // 默认隐藏
    },
    "激光1": {
        textureKey: "jiguang",
        frameW: 600,
        frameH: 200,
        gapX: 10,
        gapY: 10,
        nCols: 3,
        nRows: 2,
        frameTimes: [
            0.02,
            0.02,
            0.02, // 蓄力
            0.02,
            0.02,
            0.05, // 飞行
        ],
        loop: false,
        offsetX: 0,
        offsetY: 0,
        visible: true // 默认隐藏
    }
};
