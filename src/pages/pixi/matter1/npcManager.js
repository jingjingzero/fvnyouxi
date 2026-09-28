import { useCounterStore } from "@/store/counter";
import { createSpineBoy } from "../spineBoy";
import { idleAnimator } from "./idleAnimator";
import { ref } from 'vue'
const user = useCounterStore();
export const npcs = []; // 当前激活 NPC
export const npcPool = []; // 当前激活 NPC
let WORLD_WIDTH
let VH
// 📍 当前地图 TopMap（由 updateNPCPool 每帧/每次更新时同步，TpMap 切图后自动更新）
//    用于 playerUpdate 里按与 physics.worker 一致的公式计算玩家 Spine view.y
let currentMapTopMap = 0
const existingMap = new Map();

// ==============================================
// 🔧 假 body 辅助：纯视觉 NPC（player!==1）没有 Matter 刚体，
//    用 _fakeBody 标记，直接改 position/velocity 属性；真刚体用 Matter.Body API。
//    玩家（真刚体）仍走 Matter.Body。
// ==============================================
let _MatterRef = null;
function setBodyPos(body, x, y) {
  if (!body) return;
  if (body._fakeBody) {
    body.position.x = x;
    body.position.y = y;
  } else if (_MatterRef) {
    _MatterRef.Body.setPosition(body, { x, y });
  }
}
function setBodyVel(body, vx, vy) {
  if (!body) return;
  if (body._fakeBody) {
    body.velocity.x = vx;
    body.velocity.y = vy;
  } else if (_MatterRef) {
    _MatterRef.Body.setVelocity(body, { x: vx, y: vy });
  }
}
function removeBodyFromWorld(world, body) {
  if (!body || body._fakeBody) return; // 假 body 不在 Matter world，无需移除
  if (_MatterRef) _MatterRef.World.remove(world, body);
}
function ensureMatterRef(Matter) {
  if (Matter) _MatterRef = Matter;
}

// ===== ★ 高性能查找缓存：npcDataList 引用变化时自动重建，避免频繁 find() =====
let _lastNpcDataRef = null;
const _npcDataMap = new Map();
function getNpcDataItem(key) {
    if (!key || !user.pixi.npcDataList) return null;
    const list = user.pixi.npcDataList;
    if (list !== _lastNpcDataRef) {
        _npcDataMap.clear();
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const itemKey = item.id ?? item.data?.id;
            if (itemKey) _npcDataMap.set(itemKey, item);
        }
        _lastNpcDataRef = list;
    }
    return _npcDataMap.get(key) ?? null;
}
export function playerUpdate(Matter, activePlayer, viewport) {
    // Spine 皮肤切换
    if (user.pixi.activePlayer.juese !== activePlayer.data.juese) {

        const oldDirection = activePlayer.spine.direction
        activePlayer.data.juese = user.pixi.activePlayer.juese

        if (activePlayer.spine) {
            if (activePlayer.spine.view?.parent) {
                activePlayer.spine.view.parent.removeChild(activePlayer.spine.view);
            }
            // 加上规范参数
            activePlayer.spine.destroy?.({
                children: true,
                texture: false
            });
            activePlayer.spine = null;
        }

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
    // 📍 统一用与 physics.worker 一致的公式：view.y = body.y + TopMap*VH
    //   （worker 的 computeAllViews 里 fy = y + (th + currentMapTopMap) * VH）
    //   之前这里用 body.y + playerH*VH，与 worker 公式打架，
    //   每次 npcConfigUpdated（战斗中创建敌人/队友）触发 playerUpdate 时，
    //   会把玩家 Spine 拉到不同 Y（差 playerH - TopMap），导致进入战斗 Y 轴不固定。
    if (activePlayer.spine?.view) {
        activePlayer.spine.view.x = activePlayer.body.position.x;
        const topMapTotal = ((activePlayer.data?.TopMap ?? 0) + currentMapTopMap);
        activePlayer.spine.view.y = activePlayer.body.position.y + topMapTotal * VH;
    }



    activePlayer.speed = user.pixi.activePlayer.speed
    activePlayer.data.data.maxHp = user.pixi.activePlayer.maxHp
}
export function updateNPCPool(newList, playerPool, wORLD_WIDTH, vH, Matter, world, app, currentGroundY, topMap, curMapId) {
    WORLD_WIDTH = wORLD_WIDTH
    VH = vH
    ensureMatterRef(Matter)
    currentMapTopMap = topMap ?? 0  // 📍 同步当前地图 TopMap（TpMap 切图后自动更新）
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
        const config = newList[i];
        config.TopMap = config.TopMap ?? 0;
        const key = config.id || config.data?.id;
        newIds.add(key);
        // 🎯 非当前地图的 NPC 一律隐藏（数据保留，仅不显示）：
        //    动态 NPC（createNPC 创建）数据会一直保留在 npcDataList，
        //    但传送到其他地图时不能显示——由这里按当前地图控制显隐。
        const cfgMapId = config.mapId ?? config.data?.mapId;
        const notCurrentMap = curMapId != null && cfgMapId != null && cfgMapId !== curMapId;
        if (key && existingMap.has(key)) {
            // 已存在的 NPC：根据 hidden 属性恢复可见状态
            const existing = existingMap.get(key);
            // 🔥 战斗队友（isBattleAlly）保护：战斗中已被 jinruzhandou 固定站位
            //   （关闭碰撞 + 冻结 body + 记录固定坐标），这里不再重置位置/mask，
            //   否则会把队友拉回旧的 config.y（掉下去）或重新开启碰撞。
            const isFightingAlly = fightMode && existing.data?.isBattleAlly === true;
            // 非当前地图 或 配置 hidden → 隐藏
            const shouldHide = notCurrentMap || config.hidden === true;
            existing._explicitlyHidden = shouldHide;
            existing.view.visible = !shouldHide;

            // 战斗中队友：保持已被固定/冻结的状态，跳过 mask 与位置重置
            if (!isFightingAlly) {
                existing.body.collisionFilter.mask = shouldHide ? 0 : 0x0006; // OBSTACLE|BULLET
                // 更新 x 位置（从 mapDataList 中的最新值），y 也同步
                // 🎯 假 body（纯视觉 NPC）直接改属性；真刚体（玩家）用 Matter.Body
                // 🎯 单个 NPC 自定义 Y：0~1 视为百分比转像素，>1 视为像素，不传用默认 80*VH
                let npcBodyY = 80 * VH;
                if (config.y != null) {
                    npcBodyY = config.y <= 1 ? config.y * 100 * VH : config.y;
                }
                setBodyPos(existing.body, config.x, npcBodyY);
            }
            // ✅ 同时隐藏/显示影子
            if (existing.shadow) existing.shadow.visible = !shouldHide;

            // 🎬 隐藏时暂停待机动画（避免对不可见角色白跑计时器），显示时恢复
            if (shouldHide) {
                idleAnimator.pause(existing);
            } else if (idleAnimator.isActive(existing)) {
                idleAnimator.resume(existing);
            }

            continue;

        }
        const npc = createNPC(config, playerPool, WORLD_WIDTH, VH, currentGroundY, curMapId);
        npcPool.push(npc);
        npcs.push(npc);

        // 🎬 自动启动不定时待机动画：只要配置了 idleNames，创建实例后立即启动（不依赖对话时序）
        // ⚠️ 骨骼里没有特殊待机动画的 NPC（如 jinmao/yu 只有 idle）会自动跳过，不播任何兜底动画
        if (npc && Array.isArray(config.idleNames) && config.idleNames.length > 0) {
          idleAnimator.start(npc, {
            idleNames: config.idleNames,
            minInterval: config.idleMinInterval ?? 10000,
            maxInterval: config.idleMaxInterval ?? 20000,
            checkActive: () => !user.pixi.fight,
          })
        }

        // ✅ 新建 NPC 也要检查 hidden 标志
        if (config.hidden === true) {
            npc._explicitlyHidden = true;
            npc.view.visible = false;
            if (npc.shadow) npc.shadow.visible = false;
            if (npc.body) npc.body.collisionFilter.mask = 0;
            // 隐藏时暂停待机（等显示时自动恢复）
            idleAnimator.pause(npc);
        }

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
       
            removeNPC(npc, Matter, world, app);
            const mgrIdx = npcManager.instances.indexOf(npc);
            if (mgrIdx !== -1) npcManager.instances.splice(mgrIdx, 1);
        }
    }

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



function createNPC(data, playerPool, WORLD_WIDTH, VH, currentGroundY, curMapId) {
    const npcData = data;
    // 确保 TopMap 有默认值
    if (npcData.TopMap === undefined) npcData.TopMap = 0;

    let spawnX;
    spawnX = npcData.x ?? WORLD_WIDTH * 0.5;

    // 🎯 单个 NPC 自定义 Y（方式二）：
    //   - npcData.y 为 0~1 → 视为百分比，转像素（y * 100 * VH）
    //   - npcData.y > 1  → 视为像素，直接用
    //   - 不传 y → 用该地图默认 80*VH
    let floorY = 80 * VH;
    if (npcData.y != null) {
        floorY = npcData.y <= 1 ? npcData.y * 100 * VH : npcData.y;
    }

    const npc = playerPool.acquire(
        spawnX,
        floorY,
        npcData
    );
    // ✅ 清除池复用可能残留的「无待机变体」标记，重新评估本 NPC 的待机动画
    //   （防止对象池复用时，旧角色的 __noIdleVariant 误拦截新角色的待机）
    if (npc.__noIdleVariant) delete npc.__noIdleVariant;
    const initDirection = npcData.direction ?? 1; // 未配置时默认朝右
    if (npc.spine?.setDirection) {
        npc.spine.direction = initDirection;
        npc.spine.setDirection(initDirection);
    }
    // 初始化时恢复保存的循环动画
    const initAnim = npcData.animation ?? 'idle';
    if (npc.spine?.playBase) {
        npc.spine.playBase(initAnim, true);
        npc._currentAnim = initAnim;
    }
    npc.mapId = npcData.mapId;
    npc._lastJuese = npcData.juese;
    npcManager.add(npc);
    // 🎯 隐藏条件：配置 hidden，或「非当前地图」（动态 NPC 数据保留但不在当前地图不显示）
    const cfgMapId = npcData.mapId ?? npcData.data?.mapId;
    const notCurrentMap = curMapId != null && cfgMapId != null && cfgMapId !== curMapId;
    const shouldHide = npcData.hidden === true || notCurrentMap;
    if (shouldHide) {
        npc._explicitlyHidden = true;
        if (npc.view) npc.view.visible = false;
        if (npc.shadow) npc.shadow.visible = false;
        if (npc.body) npc.body.collisionFilter.mask = 0;
    }
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

    // ===== 清理物理体 =====
    if (npc.body) {
        removeBodyFromWorld(world, npc.body); // 假 body（纯视觉 NPC）不在 Matter world，自动跳过
        npc.body = null;
    }

    // ===== ★ 清理所有 ticker（移动任务 + 常规 ticker）=====
    if (npc._moveTicker) {
        app.ticker.remove(npc._moveTicker);
        npc._moveTicker = null;
    }
    if (npc.ticker) {
        app.ticker.remove(npc.ticker);
        npc.ticker = null;
    }

    // ===== 清理影子（避免残留导致双影子） =====
    if (npc.shadow?.parent) {
        npc.shadow.parent.removeChild(npc.shadow);
        try { npc.shadow.destroy(); } catch (e) { }
    }
    npc.shadow = null;

    // ===== 清理舞台子元素 =====
    if (npc.view?.parent) {
        npc.view.parent.removeChild(npc.view);
    }

    // ===== 停掉待机动画计时器（避免切图/销毁后残留） =====
    idleAnimator.stop(npc);

    // ===== ★ 关键：销毁 Spine 释放纹理/骨骼/动画数据 =====
    if (npc.spine?.destroy) {
        npc.spine.destroy({
            children: true,
            texture: false
        });
    }

    // ===== 清空所有引用，让 GC 可以回收整块内存 =====
    npc.body = null;
    npc.view = null;
    npc.spine = null;
    npc.data = null;
    npc._pendingMove = null;
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
export function syncAllNPC(newList, Matter, viewport) {
    npcPool.forEach((npc, i) => {
        if (!npc || !newList[i]) return;
        syncNPC(npc, newList[i], Matter);
    });
}
function syncNPC(npc, data, Matter) {
    if (!npc || !data) return;
    npc.data = data;
    npc.speed = data.speed;

    npc.data.data.maxHp = data.data.maxHp;
    if (data.direction !== undefined && npc.spine?.setDirection) {
        npc.spine.direction = data.direction;
        npc.spine.setDirection(data.direction);
    }
    // 同步循环动画
    if (data.animation !== undefined && npc.spine?.playBase) {
        npc.spine.playBase(data.animation, true);
        npc._currentAnim = data.animation;
    }
    // 同步 X 和 Y（Y 使用 NPC 自己的 y，或保持当前不变）
    // 🎯 假 body（纯视觉 NPC）直接改属性；真刚体用 Matter.Body
    // 🎯 单个 NPC 自定义 Y：0~1 视为百分比转像素，>1 视为像素
    let npcBodyY = npc.body.position.y;
    if (data.y !== undefined) {
        npcBodyY = data.y <= 1 ? data.y * 100 * VH : data.y;
    }
    setBodyPos(npc.body, data.x, npcBodyY);
    setBodyVel(npc.body, 0, 0);

}



export let savedPlayerPosition = { x: 0, y: 0 }; // 用来保存玩家【原来的位置】
export let savedPlayerMapId = 'desert_01'; // 用来保存玩家【原来的地图ID】
export let savedNpcData = []// 保存旧NPC数据
export let isTeleported = false; // 是否处于传送后状态
export const gameState = {
    savedNpcData: [],        // NPC数据
    isTeleported: false      // 传送状态
}


// =====================================
// 【2】清空当前所有NPC（传送时调用）— 逐个完整销毁
// =====================================
let Matter;
export function clearAllNpc(matter, world, app) {
    if (!npcs || npcs.length === 0) return;
    if (matter) Matter = matter
    if (!app) {
        console.warn('clearAllNpc: missing app parameter, using fallback cleanup');
        npcs.forEach(npc => {
            if (!npc) return;
            try {
                // 假 body（纯视觉 NPC）不在 Matter world，自动跳过
                if (npc.body && !npc.body._fakeBody && Matter) Matter.World.remove(world, npc.body);
                if (npc.view) npc.view.visible = false;
            } catch (e) { }
        });
        npcPool.length = 0;
        npcs.length = 0;
        return;
    }
    // 拷贝一份再遍历，避免 removeNPC 修改 npcs 数组导致遍历错乱
    const toRemove = [...npcs];
    toRemove.forEach(npc => {
        if (!npc) return;
        try {
            removeNPC(npc, Matter, world, app);
        } catch (e) {
            console.error('clearAllNpc remove error:', e);
        }
    });
}

// =====================================
// 1. 记录当前位置（必须先调用）
// =====================================
export function savePlayerPosition(activePlayer, mapId) {
    if (!activePlayer) return;
    savedPlayerPosition.x = activePlayer.body.position.x;
    savedPlayerPosition.y = activePlayer.body.position.y;
    if (mapId) {
        savedPlayerMapId = mapId;
    }
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
    currentMapId: "desert_01",
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

// =====================================
// 安全播放 NPC 动画（检测动画是否存在，不存在则降级）
// =====================================
function safePlayAnim(npc, animType) {
    if (!npc?.spine) return;
    const spine = npc.spine.spine || npc.spine;
    const animList = spine?.skeleton?.data?.animations;
    if (!animList) return;

    const hasAnim = (name) => animList.some(a => a.name === name);

    if (animType === 'run') {
        if (hasAnim('run')) {
            npc.spine.playRun?.();
        } else if (hasAnim('walk')) {
            npc.spine.playBase?.('walk', true);
        }
        // 都没有就不切换，保持当前动画
    } else if (animType === 'idle') {
        if (hasAnim('idle')) {
            npc.spine.playIdle?.();
        }
        // 没有 idle 就保持现状
    }
}

// =====================================
// NPC 水平移动到指定 x 位置
// =====================================
/**
 * NPC 水平移动到目标 x 坐标（y 轴不变）
 * @param {Object} npc - NPC 实例
 * @param {number} targetX - 目标 x 坐标（像素）
 * @param {Object} Matter - Matter.js 实例
 * @param {Object} app - Pixi Application 实例（用于 ticker）
 * @param {Object} [activePlayer=null] - 玩家实例（等待玩家模式需要）
 * @param {Object} [options={}] - 配置项
 * @param {boolean} [options.waitForPlayer=false] - 是否需要等待玩家
 * @param {number} [options.maxDistance=600] - 最大跟随距离（超过就停下等待）
 * @param {number} [options.resumeDistance=400] - 恢复行走距离（玩家靠近到此距离内继续走）
 * @param {number} [options.speed=null] - 移动速度，不传则用 npc.speed
 * @param {Function} [options.onComplete=null] - 到达目的地后的回调
 * @returns {Function} 停止移动的函数（调用后立即停下）
 */
export function moveNpcToX(npc, targetX, Matter, app, activePlayer = null, options = {}) {
    const {
        waitForPlayer = false,
        maxDistance = 600,
        resumeDistance = 400,
        speed = null,
        onComplete = null,
        teleport = false, // 新增：是否直接瞬移
    } = options;

    // 清理之前的移动 ticker
    if (npc._moveTicker) {
        app.ticker.remove(npc._moveTicker);
        npc._moveTicker = null;
    }

    // ========== 瞬移逻辑优先执行 ==========
    if (teleport && npc.body) {
        // 🎯 假 body（纯视觉 NPC）直接改属性；真刚体用 Matter.Body
        setBodyPos(npc.body, targetX, npc.body.position.y);
        setBodyVel(npc.body, 0, 0);
        npc.data.x = targetX;
        // 同步全局数据
        const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
        const npcDataItem = getNpcDataItem(npcKey);
        if (npcDataItem) {
            npcDataItem.x = targetX;
        }
        safePlayAnim(npc, 'idle');
        onComplete?.();
        // 直接返回，不走移动逻辑   
        return () => {
            if (npc.body) setBodyVel(npc.body, 0, 0);
        };
    }

    // speed 处理：优先用传入 speed；没传则用 npc.speed（默认 1）
    // 🎯 统一按 VH 世界单位换算成「像素/秒」，与玩家移动速度一致：
    //    玩家速度 = 0.533 * VH（每 60Hz 物理 tick）→ 每秒 = 0.533 * VH * 60 ≈ 32*VH 像素/秒
    //    speed = 1 → 玩家同等速度；speed = 0.5 → 玩家一半速度
    //    用 VH（世界单位）而非 VW/固定像素 → 移动端/电脑端速度一致（世界位移相同）
    const curVH = VH || (window.innerHeight / 100);
    const playerSpeedPerSec = 0.533 * curVH * 60;
    const ratio = (speed != null) ? speed : (npc.speed != null ? npc.speed : 1);
    const moveSpeedPxPerSec = Math.max(ratio * playerSpeedPerSec, 10); // 像素/秒（保底，防卡死）

    let isMoving = true; // 当前是否在行走中（用于等待玩家模式的状态切换）

    // 起步先播放走路动画（安全检测）
    safePlayAnim(npc, 'run');

    function update(ticker) {
        if (!npc.active || !npc.body) return;

        // 🎯 帧率无关：用 ticker.deltaMS（上一帧耗时毫秒）计算本帧位移
        //    每帧位移 = 像素/秒 * (deltaMS/1000)
        const deltaSec = ticker?.deltaMS != null ? ticker.deltaMS / 1000 : (1 / 60);
        const stepPerFrame = moveSpeedPxPerSec * deltaSec;

        const currentX = npc.body.position.x;
        const diff = targetX - currentX;

        // ===== 到达目的地 =====
        if (Math.abs(diff) <= stepPerFrame) {
            setBodyPos(npc.body, targetX, npc.body.position.y);
            setBodyVel(npc.body, 0, 0);
            // 同步更新npc数据中的x，避免后续sync重置位置
            npc.data.x = targetX;
            // 同步到全局npcDataList确保持久化
            const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
            const npcDataItem = getNpcDataItem(npcKey);
            if (npcDataItem) {
                npcDataItem.x = targetX;
            }
            safePlayAnim(npc, 'idle');
            app.ticker.remove(npc._moveTicker);
            npc._moveTicker = null;
            npc._pendingMove = null; // 清除待完成任务记录
            // 同步清除持久层
            const clearPendKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
            const dataItem = getNpcDataItem(clearPendKey);
            if (dataItem) delete dataItem._pendingMove;
            onComplete?.();
            return;
        }

        // ===== 等待玩家模式：检测与玩家的距离 =====
        if (waitForPlayer && activePlayer?.body) {
            const playerX = activePlayer.body.position.x;
            const distToPlayer = Math.abs(currentX - playerX);

            if (isMoving && distToPlayer > maxDistance) {
                // 走太远了，停下等玩家
                isMoving = false;
                setBodyVel(npc.body, 0, 0);
                safePlayAnim(npc, 'idle');
                return;
            }
            if (!isMoving && distToPlayer <= resumeDistance) {
                // 玩家靠近了，继续走
                isMoving = true;
                safePlayAnim(npc, 'run');
            }

            // 停下状态就不移动
            if (!isMoving) return;
        }

        // ===== 正常行走 =====
        const direction = diff > 0 ? 1 : -1;
        // 🎯 假 body（纯视觉 NPC）没有物理引擎积分 velocity → 必须直接移动 position；
        //    真刚体（玩家）才用 Matter 的 setVelocity 由引擎自动积分
        if (npc.body._fakeBody) {
            const step = direction * stepPerFrame;
            npc.body.position.x += step;
            npc.body.positionPrev.x = npc.body.position.x - step;
            // 同步 npc.data.x 与全局 npcDataList（保持存档/一致性）
            npc.data.x = npc.body.position.x;
            const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
            const npcDataItem = getNpcDataItem(npcKey);
            if (npcDataItem) npcDataItem.x = npc.body.position.x;
        } else {
            // 真刚体：用速度积分（Matter 按帧积分，速度 = 像素/秒）
            setBodyVel(npc.body, direction * moveSpeedPxPerSec, npc.body.velocity.y);
        }
        npc.spine?.setDirection?.(direction);
    }

    // 记录待完成的移动任务（用于存档恢复）
    npc._pendingMove = {
        targetX,
        waitForPlayer,
        maxDistance,
        resumeDistance,
        speed,
        hasOnComplete: !!onComplete,
    };

    npc._moveTicker = update;
    app.ticker.add(update);

    // 返回停止函数
    return function stopMove() {
        if (npc._moveTicker) {
            app.ticker.remove(npc._moveTicker);
            npc._moveTicker = null;
        }
        npc._pendingMove = null;
        // 同步清除持久层
        const stopPendKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
        const dataItem = getNpcDataItem(stopPendKey);
        if (dataItem) delete dataItem._pendingMove;
        if (npc.body) {
            setBodyVel(npc.body, 0, 0);
        }
        safePlayAnim(npc, 'idle');
    };
}

export function setNpcDirection(npc, direction) {
    if (!npc) return;

    // 1. 更新 spine 朝向
    if (npc.spine?.setDirection) {
        npc.spine.direction = direction;
        npc.spine.setDirection(direction);
    }

    // 2. 同步到 npc.data
    npc.data.direction = direction;

    // 3. 同步到全局 npcDataList 确保持久化
    const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
    const npcDataItem = getNpcDataItem(npcKey);
    if (npcDataItem) {
        npcDataItem.direction = direction;
    }
}

// =====================================
// 设置 NPC 循环动画（保存后读取可恢复）
// =====================================
/**
 * 设置 NPC 循环播放的基础动画，并同步到持久化数据
 * 支持的动画名：idle / run / fight / jumpup / jumpdown
 * @param {Object} npc - NPC 实例
 * @param {string} animName - 动画名称
 */
export function setNpcAnimation(npc, animName) {
    if (!npc || !animName) return;

    // 1. 播放动画（循环）
    if (npc.spine?.playBase) {
        npc.spine.playBase(animName, true);
        npc._currentAnim = animName;
    }

    // 2. 同步到 npc.data
    npc.data.animation = animName;

    // 3. 同步到全局 npcDataList 确保持久化
    const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
    const npcDataItem = getNpcDataItem(npcKey);
    if (npcDataItem) {
        npcDataItem.animation = animName;
    }
}


