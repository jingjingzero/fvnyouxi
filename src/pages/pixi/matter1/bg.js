import { Matter } from "matter-js";
export function BgWall(Assets, backgroundImages) {
  const WallScale = window.innerHeight / 1080;
  // 资源未就绪直接返回固定宽，防止0
  if (!Assets || !Assets.get) {
    return { BgWidthPx: 3000, WallScale, WallTextures: [] };
  }
  const WallTextures = backgroundImages.map(name => Assets.get(name)).filter(Boolean);
  let BgWidthPx = 0;
  WallTextures.forEach(tex => {
    if(tex) BgWidthPx += tex.width * WallScale;
  });
  // 兜底：计算宽度为0强制赋值3000
  if(BgWidthPx <= 0) BgWidthPx = 3000;
  return { BgWidthPx, WallScale, WallTextures };
}

export function createWallObject(WallScale, WallTextures, Sprite, Container) {
  let wallContainer = new Container();
  let offsetX = 0;
  WallTextures.forEach(texture => {
        if (!texture) return;
    const h = texture.height * WallScale;
    const sprite = new Sprite(texture);
    sprite.scale.set(WallScale);
    sprite.x = offsetX;
    sprite.y = window.innerHeight - h;
    wallContainer.addChild(sprite);
    offsetX += texture.width * WallScale;
  });

  // ========== 新增墙体容器剔除代码 ==========
  wallContainer.cullable = true;
  wallContainer.cullableChildren = false;
  // ==========================================

  return wallContainer;
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

                if (obj.body && !Matter.Composite.allBodies(world).includes(obj.body)) {
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
            if (obj.body) {
                Matter.World.remove(world, obj.body);
            }
            if (obj.view?.parent) {
                obj.view.parent.removeChild(obj.view);
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
//对话气泡函数
export function createSpeechBubble(VH, Container, Graphics, Text, gsap) {
    const c = new Container();

    const bg = new Graphics();
    const text = new Text({
        text: '',
        style: {
            fontSize: 2 * VH,
            fill: 0xffffff,
            wordWrap: true,
            wordWrapWidth: 22 * VH,
            lineHeight: 2.2 * VH,
            align: 'left',
        }
    });

    const padding = 1 * VH;
    const arrowH = 1 * VH;

    function redraw() {
        bg.clear();

        const w = text.width + padding * 2;
        const h = text.height + padding * 2;

        bg.roundRect(-w / 2, -h - arrowH, w, h, 8)
            .moveTo(-5, -arrowH)
            .lineTo(0, 0)
            .lineTo(5, -arrowH)
            .fill({ color: 0x000000, alpha: 0.75 });

        text.position.set(-w / 2 + padding, -h - arrowH + padding);
    }

    c.setText = (str) => {
        text.text = str;
        redraw();
    };

    c.show = () => {
        gsap.killTweensOf(c);
        c.visible = true;
        gsap.fromTo(c,
            { alpha: 0, scale: 0.96 },
            {
                alpha: 1,
                scale: 1,
                duration: 0.2,
                ease: 'power2.out',
            }
        );
    };

    c.hide = () => {
        gsap.killTweensOf(c);
        gsap.to(c, {
            alpha: 0,
            duration: 0.15,
            ease: 'power2.in',
            onComplete: () => {
                c.visible = false;
            },
        });
    };

    c.addChild(bg, text);
    c.visible = false;
    c.alpha = 0;

    return c;
}

// ✅ 接收已经算好宽度的地图
export function loadMapData(mapDataList, createRectFromData) {
  if (!mapDataList) return []

  let finalNpcs = []

  mapDataList.forEach((data) => {
    const applyOffset = (item) => ({ ...item, x: item.x + data.offsetX })

    // 加载各种地形
    data.rectPoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "矩形"))
    data.trianglePoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "三角形"))
    data.circlePoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "圆形"))
    data.TriggerAreaArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "矩形"))

    // 问号互动
    data.wenhaoHudong?.forEach((d, i) => {
      const item = { ...d }
      item.x += data.offsetX
      createRectFromData(item, i, "问号互动")
    })

    // NPC 坐标计算
    const npcs = data.npcDataList?.map(n => ({
      ...n,
      mapId: data.id,
      x: n.x * data.realWidth + data.offsetX
    })) || []

    finalNpcs = [...finalNpcs, ...npcs]
  })

  return finalNpcs
}
