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
  // 计算矩形
  const rect = {
    x: Math.round(item.x - item.width / 2),
    y: Math.round(item.y - item.height),
    width: Math.round(item.width),
    height: Math.round(item.height),
  };

  // 创建可视化矩形（透明度0.2）
  const debugRect = new Graphics();
  debugRect.beginFill(0xff0000, 0.2); // 红色半透明
  debugRect.drawRect(rect.x, rect.y, rect.width, rect.height);
  debugRect.endFill();
  parent.addChild(debugRect);
  // 返回物品及其矩形边界
  return {
    sprite: item,
    rect
  };
}

/**
 * 判断矩形碰撞（AABB）
 */
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * 创建场景（不糊 / 不抖 / 手机友好）
 */
export function createScene(screenW, screenH) {
  const view = new Container();
  const scale = screenH / DESIGN_HEIGHT;
  view.scale.set(scale);

  const designW = screenW / scale;
  const designH = DESIGN_HEIGHT;

  // 背景
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

  // 世界容器
  const CAMERA_LEFT = 100;
  const CAMERA_RIGHT = 100;
  const floorHeight = 0;
  const worldWidth = designW * 3;
  const worldHeight = designH;

  const world = new Container();
  world.roundPixels = true;
  view.addChild(world);

  // 相机容器
  const camera = new Container();
  world.addChild(camera);

  // 玩家
  const player = new Sprite(Texture.WHITE);
  player.anchor.set(0.5, 1);
  player.roundPixels = true;
  player.x = Math.round((designW - CAMERA_LEFT - CAMERA_RIGHT) / 2 + CAMERA_LEFT);
  player.y = Math.round(worldHeight - floorHeight);
  camera.addChild(player);

  // 玩家矩形（用于碰撞检测）
  const playerRect = {
    x: Math.round(player.x - player.width / 2),
    y: Math.round(player.y - player.height),
    width: Math.round(player.width),
    height: Math.round(player.height),
  };

  // 物品
  const items = [];
  const obstacles = []; // 存储每个物品的矩形
  const itemPositions = [0.1, 0.25, 0.5, 0.8];
  itemPositions.forEach(xPercent => {
    const itemObj = spawnItem(camera, 'tp1', xPercent, player.y, designH, worldWidth);
    items.push(itemObj.sprite);
    obstacles.push(itemObj.rect); // 保存边界
  });

  // 相机参数
  const screenCenterX = designW / 2;
  const minCameraX = designW - worldWidth;
  const maxCameraX = 0;

  function updateCameraFollow() {
    let targetX = screenCenterX - player.x;
    targetX = Math.min(maxCameraX, targetX);
    targetX = Math.max(minCameraX, targetX);
    camera.x = Math.round(targetX);
    wall.tilePosition.x = camera.x;
  }

  /**
   * 玩家移动 + 障碍物碰撞
   * dx: 水平移动量
   */
  function movePlayer(dx) {
    if (dx === 0) return;

    // 计算玩家下一个位置矩形
    const nextRect = {
      x: playerRect.x + dx,
      y: playerRect.y,
      width: playerRect.width,
      height: playerRect.height,
    };
   console.log('nextRect=',nextRect);
    // 检查与每个障碍物碰撞
    for (let obs of obstacles) {
      if (isColliding(nextRect, obs)) {
        if (dx > 0) {
          // 右侧碰撞 → 玩家左边对齐障碍物左边
          nextRect.x = obs.x - playerRect.width;
        } else {
          // 左侧碰撞 → 玩家右边对齐障碍物右边
          nextRect.x = obs.x + obs.width;
        }
        // 遇到障碍停止移动
        dx = nextRect.x - playerRect.x;
      }
    }

    // 移动玩家
    player.x += dx;
    playerRect.x += dx;

    // 玩家世界边界
    player.x = Math.round(Math.max(CAMERA_LEFT, Math.min(worldWidth - CAMERA_RIGHT, player.x)));
    playerRect.x = Math.round(player.x - playerRect.width / 2);

    updateCameraFollow();
  }




  return {
    view,
    scale,
    player,
    camera,
    movePlayer,
    items,
    obstacles,
    worldWidth,
    wall,
    floorHeight,
    playerRect, // 方便外部垂直碰撞用
  };
}
