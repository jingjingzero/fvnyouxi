/**
 * 🗺️ 高度图吸附法（混合方案）
 * ---------------------------------------------
 * 把横版地图的黑白碰撞图（黑=实心地面/障碍，白=可通行）提前转换成一维高度数组，
 * 玩家/NPC 移动时按 x 直接查「地面顶部 y」，把脚底精准吸附到地面上。
 *
 * 优点：
 *  - 零抖动：不做逐帧像素采样，只查预计算的 Float32Array
 *  - 高性能：O(1) 查询，无物理引擎碰撞结算开销
 *  - 支持任意复杂地形（台阶、斜坡、坑洞），不用拼矩形
 *  - 内存极小：每 4px 一列，一张 4000px 地图只有 ~1000 个 float
 *
 * 混合方案：本模块只负责「地面/地形」的高度吸附，
 * 竖直障碍物（墙、箱子、动态 addRectObstacle 等）仍走 Matter 矩形碰撞。
 */

// 每张地图的高度数组缓存：mapId -> Float32Array
// 存储的是「世界坐标 y」（已换算好 VH），index = 列号（每 HEIGHT_MAP_STEP 世界像素一列）
const _heightMaps = new Map();

// 列采样步长（世界像素）。越小越精细，越大越省内存。
const HEIGHT_MAP_STEP = 4;

// 世界高度基准（与背景图一致：背景图从世界 y=0 到 100*VH）
const IMG_H = 1080; // 黑白图原始高度（像素）

/** 加载图片 URL 为可读像素的 Image 元素（绕过 ImageBitmap 的 CORS 污染问题） */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败: ' + url));
    img.src = url;
  });
}

/**
 * 计算背景/黑白图的 WallScale（与 bg.js 的 BgWall 保持一致）：
 *   WallScale = innerHeight / 1080
 * 即原始 1080 高的图，缩放后铺满整个屏幕高度（世界 0 ~ 100*VH）
 * @param {number} vh - 单 VH 像素数（window.innerHeight / 100）
 */
function calcWallScale(vh) {
  return (vh * 100) / IMG_H;
}

/**
 * 从黑白图（多个纹理拼接，与背景图一一对应）生成高度数组。
 * 每个纹理：从下往上扫描每一列，找到第一个「实心(黑)」像素的 y（像素），
 * 换算成世界坐标 y 存入数组。
 *
 * 黑色判定：像素亮度 < 阈值（默认 128），可配置。
 *
 * @param {Object[]} textures - PixiJS Texture 数组（按地图从左到右顺序）
 * @param {Object} options
 * @param {number} options.vh - 单 VH 像素数（window.innerHeight / 100）
 * @param {number} options.mapOffsetX - 该地图 offsetX（世界坐标）
 * @param {number} options.threshold - 黑色阈值（0~255，默认 128）
 * @returns {Promise<Float32Array>} 高度数组（世界坐标 y），index = (世界x - mapOffsetX) / HEIGHT_MAP_STEP
 */
async function buildHeightArray(textures, { vh, mapOffsetX = 0, threshold = 128 } = {}) {
  const wallScale = calcWallScale(vh);
  // 计算总宽（世界像素），并预加载每张图的 URL 为 Image（绕过 ImageBitmap CORS 污染）
  let totalWorldW = 0;
  const texInfos = [];
  for (const tex of textures) {
    const w = tex.width * wallScale; // 纹理世界宽 = 像素宽 * WallScale
    const h = tex.height * wallScale;
    totalWorldW += w;
    const url = tex.label || tex.source?.label || null;
    let img = null;
    if (url) {
      try { img = await loadImage(url); } catch (e) { console.warn('[heightMap] 加载黑白图失败:', e.message); }
    }
    texInfos.push({ tex, w, h, img });
  }

  const cols = Math.ceil(totalWorldW / HEIGHT_MAP_STEP);
  const heightArr = new Float32Array(cols);
  heightArr.fill(-1); // -1 = 无地面（该列没有实心像素）

  // 用于读取像素的 canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let worldCursorX = mapOffsetX; // 当前纹理的世界起始 x

  for (const info of texInfos) {
    const { tex, w, h, img } = info;
    const pw = tex.width;  // 纹理像素宽
    const ph = tex.height; // 纹理像素高
    if (!pw || !ph) {
      worldCursorX += w;
      continue;
    }
    if (!img) {
      console.warn(`[heightMap] 黑白图 ${tex.label || '?'} 未加载，跳过该段地形`);
      worldCursorX += w;
      continue;
    }
    canvas.width = pw;
    canvas.height = ph;
    ctx.clearRect(0, 0, pw, ph);
    ctx.drawImage(img, 0, 0);
    let imgData = null;
    try {
      imgData = ctx.getImageData(0, 0, pw, ph).data;
    } catch (e) {
      console.warn('[heightMap] 读取像素失败（可能被跨域/CORS 阻止）:', e);
      worldCursorX += w;
      continue;
    }

    // 逐列扫描（世界列），列的世界 x 落在本纹理范围内
    const texStartCol = Math.floor((worldCursorX - mapOffsetX) / HEIGHT_MAP_STEP);
    const texEndCol = Math.floor((worldCursorX + w - mapOffsetX) / HEIGHT_MAP_STEP);
    for (let col = texStartCol; col <= texEndCol; col++) {
      if (col < 0 || col >= cols) continue;
      // 该列在世界 x = mapOffsetX + col*STEP，转成纹理像素 x
      const worldX = mapOffsetX + col * HEIGHT_MAP_STEP;
      const localX = worldX - worldCursorX; // 相对本纹理起点的世界 x
      const px = Math.floor((localX / w) * pw); // 世界x → 纹理像素x
      if (px < 0 || px >= pw) continue;

      // 从上往下找第一个「实心」像素（亮度 < 阈值）= 地面顶部
      // ⚠️ 必须从上往下：从下往上会找到地面底部（整段黑色区域的最低点），导致高度恒定
      let groundPixelY = -1;
      for (let py = 0; py < ph; py++) {
        const idx = (py * pw + px) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < threshold) {
          groundPixelY = py;
          break;
        }
      }
      if (groundPixelY >= 0) {
        // 像素 y → 世界 y：黑图顶部(像素0) = 世界 y=0，黑图底部(像素1080) = 世界 y=100*VH
        heightArr[col] = (groundPixelY / IMG_H) * 100 * vh;
      }
    }
    worldCursorX += w;
  }

  return heightArr;
}

/**
 * 为某张地图构建/获取高度数组（带缓存）。异步：纹理未就绪时返回 null 不缓存。
 * @param {string} mapId - 地图 id
 * @param {string[]} texNames - 黑白图资源名数组（Assets 里的 key，如 ['heibai01',...]）
 * @param {Object} assets - PixiJS Assets 实例（或含 .get 的对象）
 * @param {Object} opts - 见 buildHeightArray
 * @returns {Promise<Float32Array|null>}
 */
export async function ensureHeightMap(mapId, texNames, assets, opts = {}) {
  if (_heightMaps.has(mapId)) return _heightMaps.get(mapId);
  if (!assets || !assets.get) return null;
  // ⚠️ 必须全部纹理就绪才构建：否则会生成不完整的高度图并缓存，
  //    后续即使纹理加载完成也不会重建（_heightMaps.has 已命中）。
  //    纹理缺失 → 返回 null 且不缓存，等下次调用（资源加载完成后）重试。
  const names = texNames || [];
  const loaded = names.map(name => assets.get(name));
  if (loaded.some(t => !t)) return null;
  const textures = loaded.filter(Boolean);
  if (textures.length === 0) return null;
  const arr = await buildHeightArray(textures, opts);
  _heightMaps.set(mapId, arr);
  return arr;
}

/**
 * 查询某地图某世界 x 处的地面顶部 y（世界坐标）。
 * 未构建高度图 → 返回 null（调用方回退到原逻辑）
 * @param {string} mapId
 * @param {number} worldX
 * @returns {number|null}
 */
export function getGroundYAt(mapId, worldX) {
  const arr = _heightMaps.get(mapId);
  if (!arr) return null;
  const col = Math.floor((worldX - 0) / HEIGHT_MAP_STEP);
  if (col < 0 || col >= arr.length) return null;
  return arr[col];
}

/** 清除某地图高度图缓存（切图/销毁时可选调用） */
export function clearHeightMap(mapId) {
  _heightMaps.delete(mapId);
}

/** 获取某地图高度数组引用（调试用） */
export function getHeightMapArray(mapId) {
  return _heightMaps.get(mapId) || null;
}
