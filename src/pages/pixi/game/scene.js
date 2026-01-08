import { Container, TilingSprite, Texture, Sprite, Graphics } from 'pixi.js';

const DESIGN_HEIGHT = 720; // 设计稿高度（核心）

/**
 * 生成物品并放在地面上（高清不糊版本）
 */
function spawnItem(parent, textureAlias, xPercent, floorY, designH, worldWidth) {
  const item = new Sprite(Texture.from(textureAlias));
  item.anchor.set(0.5, 1);

  // 设计尺寸下的 30vh
  const designSize = designH * 0.3;
  const scale = designSize / item.texture.height;
  item.scale.set(scale);

  item.x = xPercent * worldWidth;
  item.y = floorY;

  parent.addChild(item);
  return item;
}

/**
 * 创建场景（手机 / PC 都清晰）
 */
export function createScene(screenW, screenH) {
  /* ================= 基础容器 ================= */
  const view = new Container();

  // 核心：只按高度缩放
  const scale = screenH / DESIGN_HEIGHT;
  view.scale.set(scale);

  // 设计坐标系尺寸
  const designW = screenW / scale;
  const designH = DESIGN_HEIGHT;

  /* ================= 背景 ================= */
  const bg = new Graphics();
  bg.beginFill(0xf5f5f5);
  bg.drawRect(0, 0, designW * 2, designH);
  bg.endFill();
  view.addChild(bg);

  const wallTexture = Texture.from('wall');
  wallTexture.baseTexture.mipmap = true; // Android 更清晰

  // 新的 TilingSprite 构造方式
  const wall = new TilingSprite({
    texture: wallTexture,
    width: designW * 2,
    height: designH,
  });
  wall.tileScale.set(1, 1);
  wall.x = 0;
  wall.y = 0;
  view.addChild(wall);

  /* ================= 世界 & 相机 ================= */
  const CAMERA_LEFT = 100;
  const CAMERA_RIGHT = 100;
  const floorHeight = 0;

  const worldWidth = designW * 3;
  const worldHeight = designH;

  const camera = new Container();
  view.addChild(camera);

  /* ================= 玩家 ================= */
  const player = new Sprite(Texture.WHITE); // 创建一个透明的纹理，避免加载 player 纹理
  player.anchor.set(0.5, 1);
  player.x = (designW - CAMERA_LEFT - CAMERA_RIGHT) / 2 + CAMERA_LEFT;
  player.y = worldHeight - floorHeight;
  camera.addChild(player);

  /* ================= 物品 ================= */
  const items = [];
  const itemPositions = [0.1, 0.25, 0.5, 0.8];

  itemPositions.forEach(xPercent => {
    const item = spawnItem(camera, 'tp1', xPercent, player.y, designH, worldWidth);
    items.push(item);
  });

  /* ================= 移动接口 ================= */
  function movePlayer(dx) {
    player.x += dx;

    player.x = Math.max(CAMERA_LEFT, Math.min(worldWidth - CAMERA_RIGHT, player.x));

    const screenX = player.x + camera.x;

    if (screenX < CAMERA_LEFT) {
      camera.x = CAMERA_LEFT - player.x;
    } else if (screenX > designW - CAMERA_RIGHT) {
      camera.x = (designW - CAMERA_RIGHT) - player.x;
    }

    camera.x = Math.min(0, camera.x);
    camera.x = Math.max(designW - worldWidth, camera.x);

    wall.tilePosition.x = camera.x;
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
