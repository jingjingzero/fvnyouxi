import { Assets } from "pixi.js";

let bundleRegistered = false;
// 存储每个Bundle的加载状态
const bundleLoadedMap = new Map();
// 公共资源是否加载完成（游戏启动的前提）
let commonLoaded = false;

// ========================
// 注册分块Bundle
// ========================
function registerBundle() {
  if (bundleRegistered) return;
  bundleRegistered = true;

  // ========== 公共Bundle：全部资源共享，首屏一次性加载 ==========
  Assets.addBundle("common", {
    // ===== 界面/CG资源 =====
    bg1_skel: "/pixi/jinmaocg1.skel",
    bg1_atlas: "/pixi/jinmaocg1.atlas",
    bg2_skel: "/pixi/yucg1.skel",
    bg2_atlas: "/pixi/yucg1.atlas",
    bg3_skel: "/pixi/bg5.skel",
    bg3_atlas: "/pixi/bg5.atlas",
    bg4_skel: "/pixi/hulicg1.skel",
    bg4_atlas: "/pixi/hulicg1.atlas",

    // ===== 加载动画（放公共包：首屏最早加载，各加载页动画秒出）=====
    paobuload_skel: "/pixi1/paobuload.skel",
    paobuload_atlas: "/pixi1/paobuload.atlas",
  });

  // 地图Bundle保留空壳，保持接口兼容
  Assets.addBundle("map_01", {

    // ===== 玩家主角 =====

    huojingling_skel: "/NPC/huojingling.skel",
    huojingling_atlas: "/NPC/huojingling.atlas",
    bingjingling_skel: "/NPC/bingjingling.skel",
    bingjingling_atlas: "/NPC/bingjingling.atlas",
    leituanzi_skel: "/NPC/leituanzi.skel",
    leituanzi_atlas: "/NPC/leituanzi.atlas",
    shuituanzi_skel: "/NPC/shuituanzi.skel",
    shuituanzi_atlas: "/NPC/shuituanzi.atlas",
    huojingling_skel: "/NPC/huojingling.skel",
    huojingling_atlas: "/NPC/huojingling.atlas",
    heimifu_skel: "/NPC/heimifu.skel",
    heimifu_atlas: "/NPC/heimifu.atlas",
    leiniaofu_skel: "/NPC/leiniaofu.skel",
    leiniaofu_atlas: "/NPC/leiniaofu.atlas",
    mohuamaofu_skel: "/NPC/mohuamaofu.skel",
    mohuamaofu_atlas: "/NPC/mohuamaofu.atlas",
    anyingwangfu_skel: "/NPC/anyingwangfu.skel",
    anyingwangfu_atlas: "/NPC/anyingwangfu.atlas",
    daanyingguai_skel: "/NPC/daanyingguai.skel",
    daanyingguai_atlas: "/NPC/daanyingguai.atlas",
    linen_skel: "/NPC/ZHUJUE.skel",
    linen_atlas: "/NPC/ZHUJUE.atlas",
    dilaoQ_skel: "/NPC/dilaoQ.skel",
    dilaoQ_atlas: "/NPC/dilaoQ.atlas",
    DLanying_skel: "/NPC/DLanying.skel",
    DLanying_atlas: "/NPC/DLanying.atlas",
    shangren1_skel: "/NPC/shangren1.skel",
    shangren1_atlas: "/NPC/shangren1.atlas",
    shangren2_skel: "/NPC/shangren2.skel",
    shangren2_atlas: "/NPC/shangren2.atlas",
    // ===== NPC角色 =====
    buffall_skel: "/pixi/buffall.skel",
    buffall_atlas: "/pixi/buffall.atlas",
    jinmao_skel: "/pixi/jinmao.skel",
    jinmao_atlas: "/pixi/jinmao.atlas",
    yu_skel: "/pixi/yu.skel",
    yu_atlas: "/pixi/yu.atlas",
    huli_skel: "/pixi/huli.skel",
    huli_atlas: "/pixi/huli.atlas",
    maomihengban_skel: "/pixi/maomihengban.skel",
    maomihengban_atlas: "/pixi/maomihengban.atlas",
    tuzi_skel: "/pixi/tuzi.skel",
    tuzi_atlas: "/pixi/tuzi.atlas",
    fengxi_skel: "/diren/fengxi.skel",
    fengxi_atlas: "/diren/fengxi.atlas",
    NPCQ_skel: "/NPC/NPC.skel",
    NPCQ_atlas: "/NPC/NPC.atlas",

    // ===== 场景Spine =====
    
    changjing1_skel: "/pixi1/changjing1.skel",
    changjing1_atlas: "/pixi1/changjing1.atlas",
    changjing2_skel: "/pixi1/changjing2.skel",
    changjing2_atlas: "/pixi1/changjing2.atlas",
    mapditu_skel: "/pixi1/mapditu.skel",
    mapditu_atlas: "/pixi1/mapditu.atlas",
    ceshispine_skel: "/pixi1/ceshispine.skel",
    ceshispine_atlas: "/pixi1/ceshispine.atlas",
    zhujuejiemian_skel: "/pixi1/zhujuejiemian.skel",
    zhujuejiemian_atlas: "/pixi1/zhujuejiemian.atlas",
    // ===== 地图背景 =====
    map1_01: new URL("../assets/pixi/map1_01.webp", import.meta.url).href,
    map1_02: new URL("../assets/pixi/map1_02.webp", import.meta.url).href,
    map1_03: new URL("../assets/pixi/map1_03.webp", import.meta.url).href,
    map1_04: new URL("../assets/pixi/map1_04.webp", import.meta.url).href,
    map2_01: new URL("../assets/pixi/map2_01.webp", import.meta.url).href,
    map2_02: new URL("../assets/pixi/map2_02.webp", import.meta.url).href,
    map2_03: new URL("../assets/pixi/map2_03.webp", import.meta.url).href,
    map2_04: new URL("../assets/pixi/map2_04.webp", import.meta.url).href,
    heibai01: new URL("../assets/pixi/heibai1.jpg", import.meta.url).href,
    heibai02: new URL("../assets/pixi/heibai2.jpg", import.meta.url).href,
    heibai03: new URL("../assets/pixi/heibai3.jpg", import.meta.url).href,
    heibai04: new URL("../assets/pixi/heibai4.jpg", import.meta.url).href,


    // ===== 远景背景 =====
    map1_01yj: new URL("../assets/pixi/map1_01yj.webp", import.meta.url).href,
    map1_02yj: new URL("../assets/pixi/map1_02yj.webp", import.meta.url).href,
    map1_03yj: new URL("../assets/pixi/map1_03yj.webp", import.meta.url).href,
    map1_04yj: new URL("../assets/pixi/map1_04yj.webp", import.meta.url).href,

    // ===== 战斗背景 =====
    map02: new URL("../assets/pixi/fightMap1.jpg", import.meta.url).href,
    map021: new URL("../assets/pixi/fightMap2.jpg", import.meta.url).href,
    // ===== 特效Spine =====
    buou1T_skel: "/texiao/buou1T.skel",
    buou1T_atlas: "/texiao/buou1T.atlas",
    fennu_skel: "/texiao/fennu.skel",
    fennu_atlas: "/texiao/fennu.atlas",
    heimizhuaji_skel: "/texiao/heimizhuaji.skel",
    heimizhuaji_atlas: "/texiao/heimizhuaji.atlas",
    chanrao_skel: "/texiao/chanrao.skel",
    chanrao_atlas: "/texiao/chanrao.atlas",
    guwu_skel: "/texiao/guwu.skel",
    guwu_atlas: "/texiao/guwu.atlas",
    zhiyuxiya_skel: "/texiao/zhiyuxiya.skel",
    zhiyuxiya_atlas: "/texiao/zhiyuxiya.atlas",
    zhiliaopugong_skel: "/texiao/zhiliaopugong.skel",
    zhiliaopugong_atlas: "/texiao/zhiliaopugong.atlas",
    shuiqiuyu_skel: "/texiao/shuiqiuyu.skel",
    shuiqiuyu_atlas: "/texiao/shuiqiuyu.atlas",
    linglichongneng_skel: "/texiao/linglichongneng.skel",
    linglichongneng_atlas: "/texiao/linglichongneng.atlas",
    kuangyong_skel: "/texiao/kuangyong.skel",
    kuangyong_atlas: "/texiao/kuangyong.atlas",
    zhaoyao_skel: "/texiao/zhaoyao.skel",
    zhaoyao_atlas: "/texiao/zhaoyao.atlas",
    cxhuoqiu_skel: "/texiao/cxhuoqiu.skel",
    cxhuoqiu_atlas: "/texiao/cxhuoqiu.atlas",
    MoliBaodong_skel: "/texiao/MoliBaodong.skel",
    MoliBaodong_atlas: "/texiao/MoliBaodong.atlas",
    Haoling_skel: "/texiao/Haoling.skel",
    Haoling_atlas: "/texiao/Haoling.atlas",
    Binghan_skel: "/texiao/Binghan.skel",
    Binghan_atlas: "/texiao/Binghan.atlas",
    Guangyou_skel: "/texiao/Guangyou.skel",
    Guangyou_atlas: "/texiao/Guangyou.atlas",
    Dufa_skel: "/texiao/Dufa.skel",
    Dufa_atlas: "/texiao/Dufa.atlas",
    liuhuo_skel: "/texiao/liuhuo.skel",
    liuhuo_atlas: "/texiao/liuhuo.atlas",
    Duci_skel: "/texiao/Duci.skel",
    Duci_atlas: "/texiao/Duci.atlas",
    leiji_skel: "/texiao/dianji.skel",
    leiji_atlas: "/texiao/dianji.atlas",
    Weilai_skel: "/texiao/Weilai.skel",
    Weilai_atlas: "/texiao/Weilai.atlas",
    LSshandian_skel: "/texiao/LSshandian.skel",
    LSshandian_atlas: "/texiao/LSshandian.atlas",
    Fenyan_skel: "/texiao/Fenyan.skel",
    Fenyan_atlas: "/texiao/Fenyan.atlas",
    JinjiKuanglei_skel: "/texiao/JinjiKuanglei.skel",
    JinjiKuanglei_atlas: "/texiao/JinjiKuanglei.atlas",
    Fengren_skel: "/texiao/Fengren.skel",
    Fengren_atlas: "/texiao/Fengren.atlas",
    Shuiyu_skel: "/texiao/Shuiyu.skel",
    Shuiyu_atlas: "/texiao/Shuiyu.atlas",
    Shuilao_skel: "/texiao/Shuilao.skel",
    Shuilao_atlas: "/texiao/Shuilao.atlas",
    Fengren1_skel: "/texiao/Fengren1.skel",
    Fengren1_atlas: "/texiao/Fengren1.atlas",
    texiaozidan_skel: "/texiao/bullet.skel",
    texiaozidan_atlas: "/texiao/bullet.atlas",
    jiguang_skel: "/texiao/jiguang.skel",
    jiguang_atlas: "/texiao/jiguang.atlas",
    juling_skel: "/texiao/juling.skel",
    juling_atlas: "/texiao/juling.atlas",
    dongcha_skel: "/texiao/dongcha.skel",
    dongcha_atlas: "/texiao/dongcha.atlas",
    zhangqi_skel: "/texiao/zhangqi.skel",
    zhangqi_atlas: "/texiao/zhangqi.atlas",
    wuqiqianghua_skel: "/texiao/wuqiqianghua.skel",
    wuqiqianghua_atlas: "/texiao/wuqiqianghua.atlas",
    fantan_skel: "/texiao/fantan.skel",
    fantan_atlas: "/texiao/fantan.atlas",
    duwu_skel: "/texiao/duwu.skel",
    duwu_atlas: "/texiao/duwu.atlas",
    zhuaji_skel: "/texiao/zhuaji.skel",
    zhuaji_atlas: "/texiao/zhuaji.atlas",
    zhuaji2_skel: "/texiao/zhuaji2.skel",
    zhuaji2_atlas: "/texiao/zhuaji2.atlas",
    shuipao_skel: "/texiao/shuipao.skel",
    shuipao_atlas: "/texiao/shuipao.atlas",
    bingjian_skel: "/texiao/bingjian.skel",
    bingjian_atlas: "/texiao/bingjian.atlas",
    dongjie_skel: "/texiao/dongjie.skel",
    dongjie_atlas: "/texiao/dongjie.atlas",
    huoqiu_skel: "/texiao/huoqiu.skel",
    huoqiu_atlas: "/texiao/huoqiu.atlas",
    baozha_skel: "/texiao/baozha.skel",
    baozha_atlas: "/texiao/baozha.atlas",
    dianji_skel: "/texiao/dianji.skel",
    dianji_atlas: "/texiao/dianji.atlas",
    yuansuicon_skel: "/texiao/yuansuicon.skel",
    yuansuicon_atlas: "/texiao/yuansuicon.atlas",
    LongjuanFengbao_skel: "/texiao/LongjuanFengbao.skel",
    LongjuanFengbao_atlas: "/texiao/LongjuanFengbao.atlas",
    FengZhiBiyou_skel: "/texiao/FengZhiBiyou.skel",
    FengZhiBiyou_atlas: "/texiao/FengZhiBiyou.atlas",
    diancichang_skel: "/texiao/diancichang.skel",
    diancichang_atlas: "/texiao/diancichang.atlas",
    cxbiyou_skel: "/texiao/cxbiyou.skel",
    cxbiyou_atlas: "/texiao/cxbiyou.atlas",
    zhihuan_skel: "/texiao/zhihuan.skel",
    zhihuan_atlas: "/texiao/zhihuan.atlas",
    jypg_skel: "/texiao/jypg.skel",
    jypg_atlas: "/texiao/jypg.atlas",

    // ===== 公共UI/交互 =====
    question: new URL("../assets/pixi/question.webp", import.meta.url).href,
    xiuxi: new URL("../assets/pixi/xiuxi.webp", import.meta.url).href,
    duihua: new URL("../assets/pixi/duihua.webp", import.meta.url).href,
    jump: new URL("../assets/pixi/jump.webp", import.meta.url).href,
    zidan: new URL("../assets/pixi/zidan.webp", import.meta.url).href,
    baozha: new URL("../assets/pixi/baozha.webp", import.meta.url).href,
    drop: new URL("../assets/pixi/drop.webp", import.meta.url).href,
    jiguang: new URL("../assets/pixi/jiguang.webp", import.meta.url).href,


    // ===== 卡牌/精灵球 =====
    kapai_skel: "/pixi/kapai.skel",
    kapai_atlas: "/pixi/kapai.atlas",
    jinglingQ_skel: "/pixi/jinglingQ.skel",
    jinglingQ_atlas: "/pixi/jinglingQ.atlas",
    two219_skel: "/pixi/two219.skel",
    two219_atlas: "/pixi/two219.atlas",
    bluefive_skel: "/pixi/bluefive.skel",
    bluefive_atlas: "/pixi/bluefive.atlas",
    // ===== Buff/Debuff 统合皮肤（无动画静态图标）=====
    buffall_skel: "/pixi/buffall.skel",
    buffall_atlas: "/pixi/buffall.atlas",

    // ===== 怪物 =====
    anyingwang1_skel: "/diren/anyingwang1.skel",
    anyingwang1_atlas: "/diren/anyingwang1.atlas",
    zhanjishilaimu_skel: "/diren/zhanjishilaimu.skel",
    zhanjishilaimu_atlas: "/diren/zhanjishilaimu.atlas",
    shilaimumm_skel: "/diren/shilaimumm.skel",
    shilaimumm_atlas: "/diren/shilaimumm.atlas",
    shilaimu1_skel: "/diren/shilaimu1.skel",
    shilaimu1_atlas: "/diren/shilaimu1.atlas",
    qilin_skel: "/diren/qilin.skel",
    qilin_atlas: "/diren/qilin.atlas",
    buou1_skel: "/NPC/buou1.skel",
    buou1_atlas: "/NPC/buou1.atlas",
    buou_skel: "/diren/buou.skel",
    buou_atlas: "/diren/buou.atlas",
    monster1_skel: "/diren/monster1.skel",
    monster1_atlas: "/diren/monster1.atlas",
    // 🧪 剧毒怪（duwuguai）：已替换为空心布偶（buou）骨骼
    duwuguai_skel: "/diren/buou.skel",
    duwuguai_atlas: "/diren/buou.atlas",
    guaiwu2_skel: "/diren/guaiwu2.skel",
    guaiwu2_atlas: "/diren/guaiwu2.atlas",
    guaiwu3_skel: "/diren/guaiwu3.skel",
    guaiwu3_atlas: "/diren/guaiwu3.atlas",
    jutong_skel: "/diren/jutong.skel",
    jutong_atlas: "/diren/jutong.atlas",
    nvhuang_skel: "/diren/nvhuang.skel",
    nvhuang_atlas: "/diren/nvhuang.atlas",
    anyingwang_skel: "/diren/anyingwang.skel",
    anyingwang_atlas: "/diren/anyingwang.atlas",
    anyingwang1_skel: "/diren/anyingwang1.skel",
    anyingwang1_atlas: "/diren/anyingwang1.atlas",
    jutong1_skel: "/diren/jutong1.skel",
    jutong1_atlas: "/diren/jutong1.atlas",

    // ===== CG剧情 =====

    cgspine_skel: "/cg/cgspine.skel",
    cgspine_atlas: "/cg/cgspine.atlas",
    taiyangyueliang_skel: "/cg/taiyangyueliang.skel",
    taiyangyueliang_atlas: "/cg/taiyangyueliang.atlas",

    manhua4_skel: "/cg/manhua4.skel",
    manhua4_atlas: "/cg/manhua4.atlas",
    richangmanhua_skel: "/cg/richangmanhua.skel",
    richangmanhua_atlas: "/cg/richangmanhua.atlas",
    richangmanhua1_skel: "/cg/richangmanhua1.skel",
    richangmanhua1_atlas: "/cg/richangmanhua1.atlas",

    //特殊Q版姿势
    yuQ1_skel: "/Qbanlihui/yuQ1.skel",
    yuQ1_atlas: "/Qbanlihui/yuQ1.atlas",
    yuQ2_skel: "/Qbanlihui/yuQ2.skel",
    yuQ2_atlas: "/Qbanlihui/yuQ2.atlas",
    yuQ3_skel: "/Qbanlihui/yuQ3.skel",
    yuQ3_atlas: "/Qbanlihui/yuQ3.atlas",
    yuQ4_skel: "/Qbanlihui/yuQ4.skel",
    yuQ4_atlas: "/Qbanlihui/yuQ4.atlas",

    // ===== 立绘头像 =====

    shangren2head_skel: "/lihui/shangren2head.skel",
    shangren2head_atlas: "/lihui/shangren2head.atlas",
    shangren1head_skel: "/lihui/shangren1head.skel",
    shangren1head_atlas: "/lihui/shangren1head.atlas",
    zhujuehead_skel: "/lihui/xzhujuehead.skel",
    zhujuehead_atlas: "/lihui/xzhujuehead.atlas",
    jinglinghead_skel: "/lihui/jinglinghead.skel",
    jinglinghead_atlas: "/lihui/jinglinghead.atlas",
    jinmaohead_skel: "/lihui/jinmaohead.skel",
    jinmaohead_atlas: "/lihui/jinmaohead.atlas",
    yuhead_skel: "/lihui/yuhead.skel",
    yuhead_atlas: "/lihui/yuhead.atlas",
    hulihead_skel: "/lihui/hulihead.skel",
    hulihead_atlas: "/lihui/hulihead.atlas",
    maomihead_skel: "/lihui/maomihead.skel",
    maomihead_atlas: "/lihui/maomihead.atlas",
    // heimi 头像别名：对话 onStage:"heimi" 时按 `${name}head` 取名会找 heimihead_skel/atlas，
    // 这里映射到已有的 heimi 立绘资源，让 onStage 能正常显示头像
    heimihead_skel: "/lihui/heimi.skel",
    heimihead_atlas: "/lihui/heimi.atlas",
    // 风息（魔物）立绘头像
    fengxihead_skel: "/lihui/fengxihead.skel",
    fengxihead_atlas: "/lihui/fengxihead.atlas",
    // === 天赋图标（只放天赋皮肤）
    tianfu_skel: "/tianfu/tianfu.skel",
    tianfu_atlas: "/tianfu/tianfu.atlas",
    // === 道具图标（所有道具皮肤：suipian/jinghe/baisuo/chimei/cuixicao/redCrystalT1~T7 等）
    daojuall_skel: "/pixi/daojuall.skel",
    daojuall_atlas: "/pixi/daojuall.atlas",
    // ===== 粒子贴图 =====
    particle: new URL("/tietu/particle.png", import.meta.url).href,
    HardRain: new URL("/tietu/HardRain.png", import.meta.url).href,
    smokeparticle: new URL("/tietu/smokeparticle.png", import.meta.url).href,
    Bubbles50px: new URL("/tietu/Bubbles50px.png", import.meta.url).href,
    CartoonSmoke: new URL("/tietu/CartoonSmoke.png", import.meta.url).href,
    Fire: new URL("/tietu/Fire.png", import.meta.url).href,
    Pixel25px: new URL("/tietu/Pixel25px.png", import.meta.url).href,
    Snow50px: new URL("/tietu/Snow50px.png", import.meta.url).href,
    Sparks: new URL("/tietu/Sparks.png", import.meta.url).href,
    HardCircle: new URL("/tietu/HardCircle.png", import.meta.url).href,
  });
  Assets.addBundle("map_one01", {});
  Assets.addBundle("map_desert_01", {});
  Assets.addBundle("map_desert_02", {});
}

// ========================
// 首屏加载
// ========================
export async function loadAssets(onProgress, defaultMapId = "01") {
  registerBundle();

  if (commonLoaded) {
    onProgress?.(100);
    return;
  }


  // 同时加载 common、默认地图包、map_01
  const loadBundles = ["common", "map_01"];

  try {
    await Assets.loadBundle(loadBundles, (progress) => {
      const value = Math.floor(progress * 100);
      onProgress?.(value);
    });
    commonLoaded = true;
    bundleLoadedMap.set("common", true);
    bundleLoadedMap.set("map_01", true); // 新增标记map_01已加载

  } catch (err) {
    console.error("❌ 首屏资源加载失败", err);
    throw err;
  }
}

// ========================
// 切地图时加载对应地图资源
// ========================
export async function loadMapBundle(mapId, onProgress) {
  registerBundle();
  const bundleName = `map_01`;

  if (bundleLoadedMap.get(bundleName)) {
    onProgress?.(100);
    return;
  }

  const start = performance.now();
  try {
    await Assets.loadBundle(bundleName, (progress) => {
      const value = Math.floor(progress * 100);
      onProgress?.(value);
    });

    bundleLoadedMap.set(bundleName, true);
    const end = performance.now();
    // console.log(`✅ 地图${mapId}资源加载完成，用时 ${((end - start) / 1000).toFixed(2)} 秒`);
  } catch (err) {
    throw err;
  }
}
// export async function loadMapBundle(mapId, onProgress) {
//   registerBundle();
//   const bundleName = `map_${mapId}`;

//   if (bundleLoadedMap.get(bundleName)) {
//     onProgress?.(100);
//     return;
//   }

//   const start = performance.now();
//   try {
//     await Assets.loadBundle(bundleName, (progress) => {
//       const value = Math.floor(progress * 100);
//       onProgress?.(value);
//     });

//     bundleLoadedMap.set(bundleName, true);
//     const end = performance.now();
//     // console.log(`✅ 地图${mapId}资源加载完成，用时 ${((end - start) / 1000).toFixed(2)} 秒`);
//   } catch (err) {
//     console.error(`❌ 地图${mapId}资源加载失败`, err);
//     throw err;
//   }
// }

// ========================
// 卸载不用的地图资源
// ========================
export async function unloadMapBundle(mapId) {
  registerBundle();
  const bundleName = `map_${mapId}`;
  if (bundleName === "common" || !bundleLoadedMap.get(bundleName)) return;

  await Assets.unloadBundle(bundleName);
  bundleLoadedMap.set(bundleName, false);
}

// ========================
// 原有接口保持兼容
// ========================
export function isAssetsLoaded() {
  return commonLoaded;
}

export function isBundleLoaded(mapId) {
  return bundleLoadedMap.get(`map_${mapId}`) ?? false;
}

export function getAsset(alias) {
  return Assets.get(alias);
}
