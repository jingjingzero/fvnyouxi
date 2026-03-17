
import { Graphics } from "pixi.js";
import { createSpineBoy } from "./spineBoy";

/* ==================== NPC 对象池（无碰撞） ==================== */
export const MAX_NPCS = 7;
export const npcPool = [];
export const npcs = []; // 当前激活 NPC
const COLLISION_GROUPS = {
    PLAYER: 0x0001, // 玩家
    OBSTACLE: 0x0002, // 障碍物
    BULLET: 0x0004, // 子弹
};
export function initNPCPool(parent, floorY, Matter, worldWidth, playerH, playerW, world) {
    for (let i = 0; i < MAX_NPCS; i++) {
        const npc = createNPCObject(parent, 0, floorY, Matter, worldWidth, playerH, playerW, world);
        npc.view.visible = false;
        npc.lived = false;
        npcPool.push(npc);

    }
}


export function createNPCObject(parent, xPercent, floorY, Matter, worldWidth, playerH, playerW, world) {
    // ---------------- Spine ----------------
    const npcChar = createSpineBoy();
    const bounds = npcChar.spine.getBounds();
    const scale = playerH / bounds.height;
    npcChar.view.scale.set(scale);

    const spineFootLocalY = bounds.y + bounds.height;
    const spineFootOffset = spineFootLocalY * scale;

    const x = Math.round(xPercent * worldWidth);
    const y = floorY*0.5;
    npcChar.view.x = x;
    npcChar.view.y = y;
    console.log('y=',y);
    console.log('floorY=',floorY);
    parent.addChild(npcChar.view);
    const radius = playerW / 2; // 胶囊圆半径
    const rectHeight = playerH - 2 * radius;
    // ---------------- Matter.js 刚体 ----------------
    const mainBody = Matter.Bodies.rectangle(0, 0, playerW, playerH, {
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        restitution: 0,
        inertia: Infinity,
        label: "npcMain",
        collisionFilter: {
            category: COLLISION_GROUPS.PLAYER,
            mask: COLLISION_GROUPS.OBSTACLE, // 只和障碍物碰撞
        },
    });

    const topCircle = Matter.Bodies.circle(0, -rectHeight / 2, radius, {
        isSensor: false,
        label: "playerTop",
        collisionFilter: {
            category: COLLISION_GROUPS.PLAYER,
            mask: COLLISION_GROUPS.OBSTACLE,
        },
    });
    const bottomCircle = Matter.Bodies.circle(0, rectHeight / 2, radius, {
        isSensor: false,
        label: "playerBottom",
        collisionFilter: {
            category: COLLISION_GROUPS.PLAYER,
            mask: COLLISION_GROUPS.OBSTACLE,
        },
    });
    // 脚传感器用于检测地面
    const footSensor = Matter.Bodies.rectangle(0, rectHeight / 2 + radius - 1, playerW * 0.4, 4, {
        isSensor: true,
        label: "playerFoot",
        collisionFilter: {
            category: COLLISION_GROUPS.SENSOR,
            mask: COLLISION_GROUPS.OBSTACLE, // 只检测障碍物/地面
        },
    });

    const body = Matter.Body.create({
        parts: [mainBody, topCircle, bottomCircle, footSensor],
        friction: 0,
        frictionAir: 0,
    });
    Matter.Body.setPosition(body, { x, y: y }); // center 对齐
    Matter.World.add(world, body);

    // ---------------- 红色矩形 debug ----------------
    // const debugRect = new Graphics();
    // debugRect.beginFill(0xff0000, 0.5);
    // debugRect.drawRect(-playerW / 2, -playerH / 2, playerW, playerH);
    // debugRect.endFill();
    // // 初始位置：body 的中心
    // debugRect.x = body.position.x;
    // debugRect.y = body.position.y;
    // parent.addChild(debugRect);

    return {
        char: npcChar,
        view: npcChar.view,
        body,
        mainBody,
        footSensor,
        // debugRect,       // 红色矩形
        spineFootOffset,
        vx: 0,
        vy: 0,
        onGround: false,
        lived: false,
        active: true,
        reset(newXPercent, floorY, worldWidth, animName = "idle") {
            const newX = Math.round(newXPercent * worldWidth);
            const newY = floorY - spineFootOffset;

            // // 更新 Spine
            this.view.x = newX;
            this.view.y = newY;

            // // 更新 Matter.Body
            Matter.Body.setPosition(this.body, { x: newX, y: newY - playerH / 2 });

            this.view.visible = true;
            this.lived = true;
            this.char.playBase({ name: animName }, true);
        },
        // reset(newX, newY) {
        //     Matter.Body.setPosition(this.body, { x: newX, y: newY });
        //     this.spine.view.x = newX;
        //     this.spine.view.y = newY - playerH / 2 + this.spineFootOffset;
        //     if (!worldContainer.children.includes(this.spine.view)) worldContainer.addChild(this.spine.view);
        //     if (!world.bodies.includes(this.body)) Matter.World.add(world, this.body);
        //   },
        deactivate() {
            this.view.visible = false;
            this.lived = false;
            this.char.playBase({ name: "death", loop: false });
            // 可选：World.remove(world, this.body);
        },
    };
}


export function activateNPC(xPercent, floorY, worldWidth, animName = "idle") {
    const npc = npcPool.find((n) => !n.lived);
    if (!npc) return null;
    npc.reset(xPercent, floorY, worldWidth, animName);
    npcs.push(npc);
    return npc;
}

export function deactivateNPC(npc) {
    npc.deactivate();
    const idx = npcs.indexOf(npc);
    if (idx !== -1) npcs.splice(idx, 1);
}

export function updateNPCs(activePlayer) {
    for (let npc of npcs) {
        // npc.view.x += npc.vx;
        // npc.view.y += npc.vy;
        // 朝向玩家
        if (npc.lived) {
            if (npc.view.x < activePlayer.spine.view.x) {
                npc.char.setDirection(1);
            } else if (npc.view.x > activePlayer.spine.view.x) {
                npc.char.setDirection(-1);
            }
        }

    }
}


