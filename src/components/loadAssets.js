import { Assets } from "pixi.js";

let bundleRegistered = false;
// 存储每个Bundle的加载状态
const bundleLoadedMap = new Map();
// 公共资源是否加载完成（游戏启动的前提）
let commonLoaded = false;

// ========================
// 注册分块Bundle（核心修改）
// ========================
function registerBundle() {
  if (bundleRegistered) return;
  bundleRegistered = true;

  // ========== 1. 公共Bundle：所有地图都要用到的资源，首屏必加载 ==========
  Assets.addBundle("common", {
    bg_skel: "/pixi/jiemian.skel",
    bg_atlas: "/pixi/jiemian.atlas",
    bg1_skel: "/pixi/jinmaocg.skel",
    bg1_atlas: "/pixi/jinmaocg.atlas",
    bg2_skel: "/pixi/yucg.skel",
    bg2_atlas: "/pixi/yucg.atlas",
    bg3_skel: "/pixi/hulicg.skel",
    bg3_atlas: "/pixi/hulicg.atlas",
  });

  // ========== 2. 每个地图独立Bundle：仅对应地图用到的资源，切图时才加载 ==========
  // 地图one01的独有资源
  Assets.addBundle("map_one01", {
    linen_skel: "/pixi/zhujue.skel",
    linen_atlas: "/pixi/zhujue.atlas",
    question: new URL("../assets/pixi/question.webp", import.meta.url).href,
    zidan: new URL("../assets/pixi/zidan.webp", import.meta.url).href,
    jump: new URL("../assets/pixi/jump.webp", import.meta.url).href,
    baozha: new URL("../assets/pixi/baozha.webp", import.meta.url).href,
    drop: new URL("../assets/pixi/drop.webp", import.meta.url).href,
    jiguang: new URL("../assets/pixi/jiguang.webp", import.meta.url).href,
    kapai_skel: "/pixi/kapai.skel",
    kapai_atlas: "/pixi/kapai.atlas",
    jinglingQ_skel: "/pixi/jinglingQ.skel",
    jinglingQ_atlas: "/pixi/jinglingQ.atlas",
    two219_skel: "/pixi/two219.skel",
    two219_atlas: "/pixi/two219.atlas",
    bluefive_skel: "/pixi/bluefive.skel",
    bluefive_atlas: "/pixi/bluefive.atlas",
    wall_01: new URL("../assets/pixi/wall_01.jpg", import.meta.url).href,
    map1_01: new URL("../assets/pixi/map1_01.jpg", import.meta.url).href,
    yu_skel: "/pixi/yu.skel",
    yu_atlas: "/pixi/yu.atlas",
    jinmao_skel: "/pixi/jinmao.skel",
    jinmao_atlas: "/pixi/jinmao.atlas",
    wall_02: new URL("../assets/pixi/wall_02.jpg", import.meta.url).href,
    map1_02: new URL("../assets/pixi/map1_02.jpg", import.meta.url).href,
    huli_skel: "/pixi/huli.skel",
    huli_atlas: "/pixi/huli.atlas",
    wall_03: new URL("../assets/pixi/wall_03.jpg", import.meta.url).href,
    monster1_skel: "/pixi/monster1.skel",
    monster1_atlas: "/pixi/monster1.atlas",
    texiaozidan_skel: "/texiao/texiaozidan.skel",
    texiaozidan_atlas: "/texiao/texiaozidan.atlas",
    jiguang_skel: "/texiao/jiguang.skel",
    jiguang_atlas: "/texiao/jiguang.atlas",
    juling_skel: "/texiao/juling.skel",
    juling_atlas: "/texiao/juling.atlas",
    drone_skel: "/texiao/drone.skel",
    drone_atlas: "/texiao/drone.atlas",
    dongcha_skel: "/texiao/dongcha.skel",
    dongcha_atlas: "/texiao/dongcha.atlas",
  });
}

// ========================
// 首屏加载：仅加载公共资源 + 默认地图资源
// ========================
export async function loadAssets(onProgress, defaultMapId = "one01") {
  registerBundle();

  // 已经加载过公共资源直接返回
  if (commonLoaded) {
    onProgress?.(100);
    return;
  }

  const start = performance.now();
  const defaultBundleName = `map_${defaultMapId}`;

  try {
    // 并行加载公共Bundle + 默认地图Bundle，比串行快一倍
    await Assets.loadBundle(["common", defaultBundleName], (progress) => {
      const value = Math.floor(progress * 100);
      onProgress?.(value);
    });

    // 标记加载状态
    commonLoaded = true;
    bundleLoadedMap.set("common", true);
    bundleLoadedMap.set(defaultBundleName, true);

    const end = performance.now();
    console.log(`✅ 首屏资源加载完成，用时 ${((end - start) / 1000).toFixed(2)} 秒`);
  } catch (err) {
    console.error("❌ 首屏资源加载失败", err);
    // 可加重试逻辑，最多重试3次
    throw err;
  }
}

// ========================
// 切地图时加载对应地图资源（新写的方法，切图时调用）
// ========================
export async function loadMapBundle(mapId, onProgress) {
  registerBundle();
  const bundleName = `map_${mapId}`;

  if (bundleLoadedMap.get(bundleName)) {
    onProgress?.(100);
    return; // async函数本身返回Promise，不用写Promise.resolve()
  }

  const start = performance.now();
  try {
    await Assets.loadBundle(bundleName, (progress) => {
      const value = Math.floor(progress * 100);
      onProgress?.(value);
    });

    bundleLoadedMap.set(bundleName, true);
    // ✅ 这里补一行end的定义，之前漏了！
    const end = performance.now();
    // console.log(`✅ 地图${mapId}资源加载完成，用时 ${((end - start) / 1000).toFixed(2)} 秒`);
  } catch (err) {
    console.error(`❌ 地图${mapId}资源加载失败`, err);
    throw err;
  }
}

// ========================
// 卸载不用的地图资源（可选，释放显存）
// ========================
export async function unloadMapBundle(mapId) {
  registerBundle();
  const bundleName = `map_${mapId}`;
  // 公共资源不能卸载
  if (bundleName === "common" || !bundleLoadedMap.get(bundleName)) return;

  await Assets.unloadBundle(bundleName);
  bundleLoadedMap.set(bundleName, false);
  console.log(`🗑️  地图${mapId}资源已卸载`);
}

// ========================
// 原有接口保持兼容，不用改业务代码
// ========================
export function isAssetsLoaded() {
  return commonLoaded; // 公共资源加载完成就可以启动游戏
}

export function isBundleLoaded(mapId) {
  return bundleLoadedMap.get(`map_${mapId}`) ?? false;
}

export function getAsset(alias) {
  return Assets.get(alias);
}