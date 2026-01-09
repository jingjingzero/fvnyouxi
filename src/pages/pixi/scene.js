import { Container, TilingSprite, Texture, Sprite, Graphics } from 'pixi.js';

const DESIGN_HEIGHT = 720;

/**
 * 生成物品（像素对齐版）
 */
function spawnItem(parent, textureAlias, xPercent, floorY, designH, worldWidth) {
  const item = new Sprite(Texture.from(textureAlias));
  item.anchor.set(0.5, 1);
  item.roundPixels = true;

  const designSize = designH * 0.3;
  const scale = designSize / item.texture.height;
  item.scale.set(scale);

  item.x = Math.round(xPercent * worldWidth);
  item.y = Math.round(floorY);

  parent.addChild(item);
  return item;
}

/**
 * 创建场景（不糊 / 不抖 / 手机友好）
 */
export function createScene(screenW, screenH) {
  /* ================= 根视图 ================= */
  const view = new Container();

  // 按高度等比缩放
  const scale = screenH / DESIGN_HEIGHT;
  view.scale.set(scale);

  const designW = screenW / scale;
  const designH = DESIGN_HEIGHT;

  /* ================= 背景 ================= */
  const bg = new Graphics();
  bg.beginFill(0xf5f5f5);
  bg.drawRect(0, 0, designW * 2, designH);
  bg.endFill();
  bg.cacheAsBitmap = true;
  view.addChild(bg);

  const wallTexture = Texture.from('wall');
  wallTexture.baseTexture.mipmap = true;

  const wall = new TilingSprite({
    texture: wallTexture,
    width: designW * 2,
    height: designH,
  });
  wall.roundPixels = true;
  view.addChild(wall);

  /* ================= 世界 & 相机 ================= */
  const CAMERA_LEFT = 100;
  const CAMERA_RIGHT = 100;
  const floorHeight = 0;

  const worldWidth = designW * 3;
  const worldHeight = designH;

  // 世界容器
  const world = new Container();
  world.roundPixels = true;
  view.addChild(world);

  // 相机容器
  const camera = new Container();
  world.addChild(camera);

  /* ================= 玩家 ================= */
  const player = new Sprite(Texture.WHITE);
  player.anchor.set(0.5, 1);
  player.roundPixels = true;

  player.x = Math.round((designW - CAMERA_LEFT - CAMERA_RIGHT) / 2 + CAMERA_LEFT);
  player.y = Math.round(worldHeight - floorHeight);
  camera.addChild(player);

  /* ================= 物品 ================= */
  const items = [];
  const itemPositions = [0.1, 0.25, 0.5, 0.8];

  itemPositions.forEach(xPercent => {
    items.push(
      spawnItem(camera, 'tp1', xPercent, player.y, designH, worldWidth)
    );
  });

  /* ================= 相机核心参数 ================= */
  const screenCenterX = designW / 2;
  const minCameraX = designW - worldWidth;
  const maxCameraX = 0;

  /* ================= 相机跟随（核心） ================= */
  function updateCameraFollow() {
    let targetX = screenCenterX - player.x;
    // 边界限制
    targetX = Math.min(maxCameraX, targetX);
    targetX = Math.max(minCameraX, targetX);

    // 像素对齐
    camera.x = Math.round(targetX);

    // 背景同步
    wall.tilePosition.x = camera.x;
  }

  /* ================= 玩家移动 ================= */
  function movePlayer(dx) {
    player.x += dx;

    // 玩家世界边界
    player.x = Math.round(
      Math.max(CAMERA_LEFT, Math.min(worldWidth - CAMERA_RIGHT, player.x))
    );

    updateCameraFollow();
  }

  return {
    view,
    scale,
    player,
    camera,
    movePlayer,
    items,
    worldWidth,
    wall,
    floorHeight,
  };
}
