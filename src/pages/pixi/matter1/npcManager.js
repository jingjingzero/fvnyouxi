import { useCounterStore } from "@/store/counter";
import { createSpineBoy } from "../spineBoy";
import { ref } from 'vue'
const user = useCounterStore();
export const npcs = []; // 当前激活 NPC
export const npcPool = []; // 当前激活 NPC
let WORLD_WIDTH
let VH
const existingMap = new Map();
export function playerUpdate(Matter, activePlayer, viewport) {
    // Spine 皮肤切换
    if (user.pixi.activePlayer.juese !== activePlayer.data.juese) {

        const oldDirection = activePlayer.spine.direction
        activePlayer.data.juese = user.pixi.activePlayer.juese

        if (activePlayer.spine?.view) {
            activePlayer.spine.view.parent?.removeChild(activePlayer.spine.view);
        }
        activePlayer.spine = null;

        const spine = createSpineBoy({}, { juese: activePlayer.data.juese });

        spine.view.scale.set(activePlayer.scale);
        spine.direction = oldDirection;
        spine.setDirection(oldDirection);
        //挂回舞台
        viewport.addChild(spine.view);
        activePlayer.spine = spine;
        activePlayer.view = spine.view;
    }

    // Spine位置同步
    if (activePlayer.spine?.view) {
        activePlayer.spine.view.x = activePlayer.body.position.x;
        activePlayer.spine.view.y =
            activePlayer.body.position.y + (activePlayer.playerH ?? 10) * VH;
    }

    // 血条同步
    if (activePlayer.hpBar?.view) {
        activePlayer.hpBar.view.x = activePlayer.body.position.x;
        activePlayer.hpBar.view.y =
            activePlayer.body.position.y -
            (activePlayer.data?.xuetiaoPosition ?? 20) * VH;
    }
    console.log('user.pixi.activePlayer=', user.pixi.activePlayer);

    activePlayer.speed = user.pixi.activePlayer.speed
    activePlayer.data.data.maxHp = user.pixi.activePlayer.maxHp
}
export function updateNPCPool(newList, playerPool, wORLD_WIDTH, vH, Matter, world, app, currentGroundY, TopMap) {
    WORLD_WIDTH = wORLD_WIDTH
    VH = vH
   
    // ========== 1. 每次都清空重建，避免残留旧ID ==========
    existingMap.clear(); // ✅ 先清空
    npcPool.forEach(npc => {
        const key = npc.data.id || npc.data.data?.id;
        if (key) {
            existingMap.set(key, npc);
        }
    });

    // ========== 2. 遍历新列表：只新增，不碰已有 ==========
    const newIds = new Set();

    for (let i = 0; i < newList.length; i++) {
        const config = { ...newList[i], TopMap };
        const key = config.id || config.data?.id;
        newIds.add(key);

        if (key && existingMap.has(key)) {
            continue;
        }

        console.log('新增NPC:', key || config.data?.name);
        const npc = createNPC(config, playerPool, WORLD_WIDTH, VH, currentGroundY);
        npcPool.push(npc);
        npcs.push(npc);

        // ✅ 新增后也加入existingMap
        if (key) {
            existingMap.set(key, npc);
        }
    }

    // ========== 3. 删除多余NPC ==========
    for (let i = npcPool.length - 1; i >= 0; i--) {
        const npc = npcPool[i];
        const key = npc.data.id || npc.data.data?.id;

        if (key && !newIds.has(key)) {
            console.log('移除多余NPC:', key);
            removeNPC(npc, Matter, world, app);
            const mgrIdx = npcManager.instances.indexOf(npc);
            if (mgrIdx !== -1) npcManager.instances.splice(mgrIdx, 1);
        }
    }
    console.log('npcPool=', npcPool);

}
export function removeNPCsByMapId(mapId = "desert_02", Matter, world, app) {
    let count = 0;
    const deletedKeys = []; // 记录删除的id

    for (let i = npcPool.length - 1; i >= 0; i--) {
        const npc = npcPool[i];

        if (npc.mapId === mapId) {
            const key = npc.data.id || npc.data.data?.id;
            if (key) deletedKeys.push(key);

            removeNPC(npc, Matter, world, app);

            const mgrIdx = npcManager.instances.indexOf(npc);
            if (mgrIdx !== -1) {
                npcManager.instances.splice(mgrIdx, 1);
            }

            count++;
        }
    }

    // ✅ 批量更新 user.pixi.npcDataList（一次性过滤，更高效）
    if (deletedKeys.length > 0 && user.pixi.npcDataList) {
        user.pixi.npcDataList = user.pixi.npcDataList.filter(item => {
            const itemKey = item.id || item.data?.id;
            return !deletedKeys.includes(itemKey);
        });
    }

    return { count, deletedKeys };
}
function createNPC(data, playerPool, WORLD_WIDTH, VH, currentGroundY) {
    const npcData = {
        ...data,
        TopMap: data.TopMap ?? 0
    };
    console.log('data=', data);

    let spawnX;
    // 编辑器新增NPC：读取对应地图真实宽度+偏移

    if (npcData.npcEdit) {
        const targetMap = user.pixi.mapDataList.find(m => m.id === npcData.mapId);
        const mapW = targetMap?.realWidth ?? WORLD_WIDTH;
        const mapOffset = targetMap?.offsetX ?? 0;
        spawnX = mapOffset + mapW * (npcData.x ?? 0.5);
    } else {
        // 原生地图NPC，沿用原有像素坐标
        spawnX = WORLD_WIDTH * (npcData.x ?? 0.5);
    }

    const npc = playerPool.acquire(
        spawnX,
        (npcData.y ?? currentGroundY) * VH,
        npcData
    );
    const initDirection = npcData.direction ?? 1; // 未配置时默认朝右
    if (npc.spine?.setDirection) {
        npc.spine.direction = initDirection;
        npc.spine.setDirection(initDirection);
    }
    npc.mapId = npcData.mapId;
    npc._lastJuese = npcData.juese;
    npcManager.add(npc);
    return npc;
}
function removeNPC(npc, Matter, world, app) {
    if (!npc) return;

    // 1. 从existingMap中删除对应的ID
    const key = npc.data.id || npc.data.data?.id;
    if (key && existingMap.has(key)) {
        existingMap.delete(key);
    }

    // 2. ✅ 同步更新 user.pixi.npcDataList（按id过滤）
    if (key && user.pixi.npcDataList) {
        user.pixi.npcDataList = user.pixi.npcDataList.filter(item => {
            const itemKey = item.id || item.data?.id;
            return itemKey !== key;
        });
    }

    const idx = npcPool.indexOf(npc);
    if (idx !== -1) npcPool.splice(idx, 1);

    const i2 = npcs.indexOf(npc);
    if (i2 !== -1) npcs.splice(i2, 1);

    npc.active = false;

    if (npc.body) {
        Matter.World.remove(world, npc.body);
        npc.body = null;
    }

    npc.view?.parent?.removeChild(npc.view);
    npc.hpBar?.view?.parent?.removeChild(npc.hpBar.view);
    npc.speechBubble?.parent?.removeChild(npc.speechBubble);

    if (npc.ticker) {
        app.ticker.remove(npc.ticker);
    }

    npc.body = null;
    npc.view = null;
    npc.hpBar = null;
    npc.spine = null;
}
// 新增：战斗模式总开关
export let fightMode = false;

// 显示所有敌人血条（战斗开始）
export function showAllEnemyHpBar() {
    fightMode = true;
}

// 隐藏所有敌人血条（战斗结束）
export function hideAllEnemyHpBar() {
    fightMode = false;
}
export function syncAllNPC(newList, Matter, viewport, currentGroundY) {
    npcPool.forEach((npc, i) => {
        if (!npc || !newList[i]) return;
        syncNPC(npc, newList[i], Matter, currentGroundY);
    });
}
function syncNPC(npc, data, Matter, currentGroundY) {
    if (!npc || !data) return;
    npc.data = data;
    npc.speed = data.speed;
    npc.playerH = data.TopH ?? npc.playerH;
    npc.data.data.maxHp = data.data.maxHp;
    if (data.direction !== undefined && npc.spine?.setDirection) {
        npc.spine.direction = data.direction;
        npc.spine.setDirection(data.direction);
    }
    let targetX;
    if (data.npcEdit) {
        // 实时匹配NPC绑定的mapId，取对应地图offset+宽度
        const targetMap = user.pixi.mapDataList.find(m => m.id === data.mapId);
        const mapW = targetMap?.realWidth ?? WORLD_WIDTH;
        const mapOffset = targetMap?.offsetX ?? 0;
        targetX = mapOffset + mapW * data.x;
    } else {
        targetX = data.x;
    }
    Matter.Body.setPosition(npc.body, {
        x: targetX,
        y: currentGroundY * VH
    });
    Matter.Body.setVelocity(npc.body, { x: 0, y: 0 }); // 清空速度防止乱飞
    const hpRatio = Math.max(npc.data.data.hp / npc.data.data.maxHp, 0);
    if (npc.hpBar?.view) {
        npc.hpBar.view.scale.x = hpRatio;
    }
}


export const cameraOffsetX = ref(0) //镜头偏移
export let savedPlayerPosition = { x: 0, y: 0 }; // 用来保存玩家【原来的位置】
export let savedNpcData = []// 保存旧NPC数据
export let isTeleported = false; // 是否处于传送后状态
export const gameState = {
    savedNpcData: [],        // NPC数据
    isTeleported: false      // 传送状态
}


// =====================================
// 【2】清空当前所有NPC（传送时调用）
// =====================================
let Matter;
export function clearAllNpc(matter, world) {
    if (!npcs) return;
    if (matter) Matter = matter
    npcs.forEach(npc => {
        if (!npc) return;
        try {
            if (npc.body) Matter.World.remove(world, npc.body);
            if (npc.view) npc.view.visible = false;
            if (npc.hpBar?.view) npc.hpBar.view.visible = false;
        } catch (e) { }
    });

    npcs.length = 0;
}

// =====================================
// 1. 记录当前位置（必须先调用）
// =====================================
export function savePlayerPosition(activePlayer) {
    if (!activePlayer) return;
    savedPlayerPosition.x = activePlayer.body.position.x;
    savedPlayerPosition.y = activePlayer.body.position.y;
    console.log("已记录玩家位置：", savedPlayerPosition);
}
// =====================================
// 2. 传送到【指定坐标】
// =====================================
export async function teleportTo(x, y, matter, activePlayer) {
    if (!activePlayer) return;
    if (matter) Matter = matter

    Matter.Body.setPosition(activePlayer.body, { x, y });
    Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 }); // 清空速度防止乱飞
}

// =====================================
// 3. 传送回【刚才记录的位置】
// =====================================
export function teleportBack(activePlayer) {
    if (!activePlayer || !savedPlayerPosition) return;
    Matter.Body.setPosition(activePlayer.body, savedPlayerPosition);
    Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 });
}

export const npcManager = {
    instances: [],
    currentMapId: "one01",
    add(npc) {
        this.instances.push(npc);
    }
};
//传送到指定地图
export function goToMap(mapId, activePlayer, Matter, tpPosition) {
    const last = npcManager.currentMapId;
    const data = user.pixi.mapDataList.find(m => m.id === mapId);
    teleportTo(tpPosition ? tpPosition : data.playerSpawnX, data.playerSpawnY, Matter, activePlayer);
    npcManager.currentMapId = mapId;
    return data
}