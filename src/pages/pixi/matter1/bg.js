import { Matter } from "matter-js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export function BgWall(Assets, backgroundImages) {
    const WallScale = window.innerHeight / 1080;
    // 资源未就绪直接返回固定宽，防止0
    if (!Assets || !Assets.get) {
        return { BgWidthPx: 3000, WallScale, WallTextures: [] };
    }
    const WallTextures = backgroundImages.map(name => Assets.get(name)).filter(Boolean);
    let BgWidthPx = 0;
    WallTextures.forEach(tex => {
        if (tex) BgWidthPx += tex.width * WallScale;
    });
    // 兜底：计算宽度为0强制赋值3000
    if (BgWidthPx <= 0) BgWidthPx = 3000;
    return { BgWidthPx, WallScale, WallTextures };
}

/**
 * 计算地图的「可行走宽度」（世界像素）
 * 规则（if/else）：
 * - 如果地图配置了 spineForeground（Spine 动态背景）→ 用动态背景的实际宽度
 * - 否则 → 用 backgroundImages（静态背景）的宽度
 * 该宽度会作为地图的 realWidth，决定物理边界、可行走区域、出生点百分比等
 * @param {Object} mapData - 地图数据（含 spineForeground / backgroundImages）
 * @param {Object} Assets - pixi Assets 缓存
 * @returns {number} 地图宽度（世界像素）
 */
export function computeMapWidth(mapData, Assets) {
    const WallScale = window.innerHeight / 1080;
    // ===== 🗺️ 优先：Tiled 导入地图 → 宽度由 tmx/tmj 自动计算（map.js 工厂已把边界写入 WORLD_WIDTH）=====
    if (mapData?.tiled) {
        if (mapData.WORLD_WIDTH > 0) return mapData.WORLD_WIDTH;
    }
    // ===== 其次：spineForeground 动态背景宽度 =====
    const fg = mapData?.spineForeground;
    if (fg && fg.skelName && fg.atlasName) {
        try {
            // 创建一个临时 Spine 测量其原始宽度（setup pose 的 bounds）
            const spine = new Spine({
                skeleton: fg.skelName,
                atlas: fg.atlasName,
                allowMissingRegions: true,
            });
            const raw = spine.getBounds();
            // 测完立即销毁，避免残留
            try { spine.destroy({ children: true, texture: false }); } catch (e) { }
            if (raw.width > 0) {
                return raw.width * WallScale;
            }
        } catch (e) {
            console.warn('[computeMapWidth] spineForeground 宽度计算失败，回退静态背景:', e);
        }
    }
    // ===== 回退：backgroundImages 静态背景宽度 =====
    const bgData = BgWall(Assets, mapData?.backgroundImages || []);
    return bgData.BgWidthPx;
}

/**
 * 横向拼接背景纹理 → 一个 Container（每张纹理一个 Sprite，从左到右排列，底部对齐屏幕底）
 * @param {number} WallScale - 背景缩放比例（innerHeight / 1080）
 * @param {Texture[]} WallTextures - 纹理数组（一张长图的多段，按顺序横向拼接）
 * @param {Function} Sprite - Pixi Sprite 构造函数
 * @param {Function} Container - Pixi Container 构造函数
 * @param {Object} [opts]
 * @param {number} [opts.topRepeat=0] - 🏔️ 顶部额外平铺层数：在 y 上方重复渲染裁剪的背景图，
 *        覆盖世界 y < 0 的区域（如背景图只有 1080px 高、地形坡度走到图顶之上时防止穿帮）
 * @param {boolean} [opts.alignTop=false] - 🏔️ 底部对齐世界 y=0（屏幕顶部）向上延伸：
 *        用于地图配置 topImages（顶部边界额外渲染的图片，覆盖世界 y ∈ [-h, 0]）
 * @returns {Container}
 */
export function createWallObject(WallScale, WallTextures, Sprite, Container, opts = {}) {
    const topRepeat = opts.topRepeat ?? 0; // 顶部额外平铺层数（0 = 不延伸）
    const alignTop = !!opts.alignTop;      // 顶部延伸图：底部对齐世界 y=0
    let wallContainer = new Container();
    let offsetX = 0;
    WallTextures.forEach(texture => {
        if (!texture) return;
        const h = texture.height * WallScale;
        for (let i = 0; i <= topRepeat; i++) {
            const sprite = new Sprite(texture);
            sprite.scale.set(WallScale);
            sprite.x = offsetX;
            // 普通背景：底部对齐屏幕底（世界 y = 100VH），向上堆叠 i 份
            // 顶部延伸图：底部对齐世界 y=0（屏幕顶），向上堆叠 i 份 → 覆盖 y ∈ [-i*100VH, 0]
            sprite.y = alignTop
                ? (-h - i * h)
                : (window.innerHeight - h - i * h);
            wallContainer.addChild(sprite);
        }
        offsetX += texture.width * WallScale;
    });
    wallContainer.cullable = true;
    wallContainer.cullableChildren = false;
    return wallContainer;
}

/**
 * 创建 Spine 动态背景
 * @param {number} WallScale - 背景缩放比例（与静态背景保持一致）
 * @param {number} bgHeight - 静态背景高度（用于对齐）
 * @param {string} skelName - spine 骨骼数据别名（默认 changjing1_skel）
 * @param {string} atlasName - spine 图集别名（默认 changjing1_atlas）
 * @param {string} animationName - 动画名称，不传则自动播放第一个动画
 * @param {Container} Container - Pixi Container 构造函数
 * @param {Object} app - Pixi 应用实例，用于绑定 ticker 更新
 * @returns {Object} 背景 spine 对象 { view, spine, play, destroy }
 */
export function createBgSpine(WallScale, bgHeight, skelName = 'changjing1_skel', atlasName = 'changjing1_atlas', animationName = null, Container, app = null) {
    const view = new Container();

    // 创建 Spine 实例
    let spine = null;
    try {
        spine = new Spine({
            skeleton: skelName,
            atlas: atlasName,
            allowMissingRegions: true,
        });
        // 防御性检查：skeleton 数据不存在则视为创建失败
        if (!spine.skeleton) {
            console.warn('[BgSpine] skeleton 数据未找到:', skelName);
            spine = null;
        }
        // 🎯 禁止背景 Spine 物理约束继承容器位移/旋转：
        // viewport 镜头移动会改变 worldContainer 的 worldTransform，
        // 避免背景物理骨骼（布料/飘带等）因镜头移动而乱动。
        if (spine && typeof spine.setPhysicsPositionInheritanceFactor === 'function') {
            spine.setPhysicsPositionInheritanceFactor(0, 0);
        }
        if (spine && spine.physicsRotationInheritanceFactor !== undefined) {
            spine.physicsRotationInheritanceFactor = 0;
        }
    } catch (e) {
        console.error('[BgSpine] 创建失败:', e);
        return {
            view,
            spine: null,
            play() {},
            setSpeed() {},
            setGroundY() {},
            destroy() { view.destroy({ children: true }); }
        };
    }

    // 创建失败直接返回空对象
    if (!spine) {
        return {
            view,
            spine: null,
            play() {},
            setSpeed() {},
            setGroundY() {},
            destroy() { view.destroy({ children: true }); }
        };
    }

    // 确保可见
    spine.visible = true;
    spine.alpha = 1;
    view.visible = true;
    view.alpha = 1;

    // 先获取原始 bounds（未缩放）
    const rawBounds = spine.getBounds();
    // 应用缩放
    spine.scale.set(WallScale);

    // 获取缩放后的 bounds
    const scaledBounds = spine.getBounds();
    // 计算底部相对于原点的偏移（缩放后）
    const bottomOffset = scaledBounds.y + scaledBounds.height;

    // 记录动态背景的世界宽度（缩放后），供地图宽度计算使用
    const worldWidth = scaledBounds.width;

    // 获取可用动画列表
    const animations = spine.skeleton.data.animations;
    let animName = animationName;

    if (!animName && animations && animations.length > 0) {
        animName = animations[0].name;
    }

    // 播放动画（无限循环）
    if (animName) {
        const trackEntry = spine.state.setAnimation(0, animName, true);
        trackEntry.loop = true;
    }

    // 默认先放在原点，外部通过 setGroundY 来调整位置
    spine.x = 0;
    spine.y = 0;

    view.addChild(spine);

    // 关闭 cullable
    view.cullable = false;
    view.cullableChildren = false;

    /**
     * 设置底部对齐的 y 坐标
     * @param {number} groundY - 底部要对齐到的 y 坐标
     */
    function setGroundY(groundY) {
        // spine.y + bottomOffset = groundY
        // spine.y = groundY - bottomOffset
        spine.y = groundY - bottomOffset;
    }

    return {
        view,
        spine,
        worldWidth, // 动态背景世界宽度（缩放后）
        scaledBounds, // 缩放后的局部包围盒 { x, y, width, height }，用于视觉中心对齐

        play(name, loop = true) {
            if (name && spine) {
                const entry = spine.state.setAnimation(0, name, loop);
                entry.loop = loop;
            }
        },

        setSpeed(speed) {
            if (spine) {
                spine.state.timeScale = speed;
            }
        },

        setGroundY,

        destroy() {
            try {
                if (spine) {
                    spine.state.clearTracks();
                    spine.state.clearListeners?.();
                }
                view.removeChildren();
                spine?.destroy({ children: true });
                view.destroy({ children: true });
            } catch (e) {
                console.error('BgSpine destroy error:', e);
            }
        }
    };
}

// 通用对象池（你的游戏万能复用）
export function createPool(createFunc, max = Infinity) {
    const pool = [];
    const active = [];

    return {
        acquire(...args) {
            let obj;

            if (pool.length) {
                obj = pool.pop();
                obj.active = true;

                // 🎯 假 body（纯视觉 NPC）不在 Matter world，跳过 add
                if (obj.body && !obj.body._fakeBody && !Matter.Composite.allBodies(world).includes(obj.body)) {
                    Matter.World.add(world, obj.body);
                }
                if (obj.ticker) {
                    app.ticker.add(obj.ticker);
                }

                obj.reset(...args);
            } else {
                obj = createFunc(...args);
            }

            active.push(obj);
            return obj;
        },

        release(obj) {
            obj.active = false;

            if (obj.ticker) {
                app.ticker.remove(obj.ticker);
                obj.ticker = null;
            }
            if (obj.body && !obj.body._fakeBody) { // 🎯 假 body（纯视觉 NPC）不在 Matter world，跳过
                Matter.World.remove(world, obj.body);
            }
            if (obj.view?.parent) {
                obj.view.parent.removeChild(obj.view);
            }
            // ✅ 从舞台移除影子但不销毁（池中保留，reset 时重新挂回）
            if (obj.shadow?.parent) {
                obj.shadow.parent.removeChild(obj.shadow);
            }

            const idx = active.indexOf(obj);
            if (idx !== -1) active.splice(idx, 1);

            pool.push(obj);
        },

        releaseAll() {
            while (active.length > 0) this.release(active[0]);
        },

        get active() {
            return active;
        },
    };
}


// ✅ 接收已经算好宽度的地图
export function loadMapData(mapDataList, createRectFromData) {
    if (!mapDataList) return []

    let finalNpcs = []

    mapDataList.forEach((data) => {
        const applyOffset = (item) => ({ ...item, x: item.x + data.offsetX })

        // 加载各种地形
        // ⚠️ 必须传 data.id 作为 mapId，否则刚体会存到 wuti.get(undefined)，
        //    clearMapRuntimeData(mapId) 按地图 id 清理时清不到 → 切图后旧地图刚体残留（如空气墙）
        data.rectPoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "矩形", data.id))
        data.trianglePoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "三角形", data.id))
        data.circlePoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "圆形", data.id))
        data.TriggerAreaArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "矩形", data.id))

        // 问号互动（x/y 统一为百分比 0~1，加载时转为世界像素坐标）
        // 兼容旧版存档：如果 x > 1 视为旧版像素格式，自动迁移
        const mapHeight = window.innerHeight; // 100 * VH = window.innerHeight
        data.wenhaoHudong?.forEach((d, i) => {
            const item = { ...d }
            // x：百分比 (0~1) → 世界像素 = 百分比 * 地图宽度 + 偏移
            // 兼容旧版存档：x > 1 视为旧版像素相对坐标，直接加 offsetX 并原地迁移为百分比
            if (d.x !== undefined) {
                if (d.x > 1) {
                    // 旧版像素相对坐标 → 转成百分比存入 mapDataList，保证读档后一致
                    const px = d.x + data.offsetX;
                    item.x = px;
                    d.x = (d.x / data.realWidth) || 0; // 迁移为百分比（后续加载统一用百分比）
                } else {
                    // 新版：百分比 (0~1)
                    item.x = d.x * data.realWidth + data.offsetX
                }
            }
            // y：百分比 (0~1) → 世界像素 = 百分比 * 窗口高度
            if (d.y !== undefined) {
                if (d.y > 1) {
                    // 旧版像素坐标 → 转成百分比存入 mapDataList
                    item.y = d.y;
                    d.y = d.y / mapHeight;
                } else {
                    // 新版：百分比 (0~1)
                    item.y = d.y * mapHeight
                }
            }
            createRectFromData(item, i, "问号互动", data.id)
        })

        // NPC 坐标计算（x=百分比→像素, y=百分比→像素）
        const mapHeightPx = 100 * VH;
        const npcs = data.npcDataList?.map(n => ({
            ...n,
            mapId: data.id,
            x: n.x * data.realWidth + data.offsetX,
            y: n.y !== undefined ? n.y * mapHeightPx : 80 * VH,
            spineOffsetY: n.spineOffsetY ?? 0,
        })) || []

        finalNpcs = [...finalNpcs, ...npcs]
    })

    return finalNpcs
}
