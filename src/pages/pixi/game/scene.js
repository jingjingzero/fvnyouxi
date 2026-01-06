import { Container, TilingSprite, Texture, Sprite, Graphics } from 'pixi.js';

/**
 * 生成物品并放在地面上
 * @param {Container} parent - 添加到哪个容器（通常 camera）
 * @param {string} textureAlias - Pixi 加载的资源别名
 * @param {number} xPercent - 世界宽度百分比位置（0~1）
 * @param {number} floorY - 地面 Y 坐标
 * @param {number} screenH - 屏幕高度，用于计算 30vh
 * @param {number} worldWidth - 世界宽度
 */
function spawnItem(parent, textureAlias, xPercent, floorY, screenH, worldWidth) {
  const item = new Sprite(Texture.from(textureAlias));
  item.anchor.set(0.5, 1); // 底部中心对齐

  // 固定宽高为 30vh
  const size = screenH * 0.3;
  item.width = size;
  item.height = size;

  item.x = xPercent * worldWidth;
  item.y = floorY;
  parent.addChild(item);
  return item;
}

/**
 * 创建场景
 * @param {number} screenW - 屏幕宽度
 * @param {number} screenH - 屏幕高度
 */
export function createScene(screenW, screenH) {
  const view = new Container();

  const DESIGN_W = screenW;
  const DESIGN_H = screenH;

  const scale = Math.min(screenW / DESIGN_W, screenH / DESIGN_H);
  view.scale.set(scale);

  /* ================= 背景层 ================= */
  const bgGraphics = new Graphics();
  bgGraphics.beginFill(0xf5f5f5); // 护眼浅白
  bgGraphics.drawRect(0, 0, screenW * 2, screenH);
  bgGraphics.endFill();
  view.addChild(bgGraphics);

  const wallTexture = Texture.from('wall'); 
  const wall = new TilingSprite(wallTexture, screenW * 2, screenH);
  wall.tileScale.set(1, 1);
  wall.x = 0;
  wall.y = 0;
  view.addChild(wall);

  /* ================= camera & 玩家 ================= */
  const floorHeight = 0;
  const CAMERA_LEFT = 100;
  const CAMERA_RIGHT = 100;

  const worldWidth = DESIGN_W * 3;
  const worldHeight = DESIGN_H;

  const camera = new Container();
  view.addChild(camera);

  const player = new Sprite(Texture.from('player'));
  player.anchor.set(0.5, 1);
  player.x = (DESIGN_W - CAMERA_LEFT - CAMERA_RIGHT) / 2 + CAMERA_LEFT;
  player.y = worldHeight - floorHeight;
  camera.addChild(player);

  /* ================= 开局生成物品 ================= */
  const items = [];

  // 这里定义所有物品的百分比位置
  const itemPositions = [0.1, 0.25, 0.5, 0.8];

  // 自动生成物品
  itemPositions.forEach(xPercent => {
    const item = spawnItem(camera, 'tp1', xPercent, player.y, screenH, worldWidth);
    items.push(item);
  });

  /* ================= 移动接口 ================= */
  function movePlayer(dx) {
    player.x += dx;

    player.x = Math.max(CAMERA_LEFT, Math.min(worldWidth - CAMERA_RIGHT, player.x));

    const screenX = player.x + camera.x;

    if (screenX < CAMERA_LEFT) {
      camera.x = CAMERA_LEFT - player.x;
    } else if (screenX > DESIGN_W - CAMERA_RIGHT) {
      camera.x = (DESIGN_W - CAMERA_RIGHT) - player.x;
    }

    camera.x = Math.min(0, camera.x);
    camera.x = Math.max(DESIGN_W - worldWidth, camera.x);

    wall.tilePosition.x = camera.x;
  }

  return {
    view,
    scale,
    floorHeight,
    player,
    movePlayer,
    camera,
    items,       // 所有开局生成的物品
    worldWidth,
    wall,
  };
}
