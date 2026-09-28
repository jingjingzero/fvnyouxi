import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
import { matchDialogueCondition } from "@/pages/pixi/dialogue/condition.js";
const user = useCounterStore();
let mark;
let _assets = null; // 缓存 Assets 引用，供运行时切换纹理使用
export const floatingMarks = []

// =====================================
// 问号互动控制对象注册表（按 id 存取，方便任意位置操作）
// createWenhaoHudong 创建时会自动注册
// 任意位置可用 getWenhaoHudong(id) 获取控制对象
// =====================================
const wenhaoControllers = new Map(); // id -> 控制对象

/**
 * 获取已创建问号互动的控制对象（任意位置操作标记用）
 * @param {string} id - createWenhaoHudong 时传的唯一 ID
 * @returns {Object|null} 控制对象 { id, setPosition, setTexture, show, hide, remove }，未找到返回 null
 * @example getWenhaoHudong('hd200_mark')?.show()
 */
export function getWenhaoHudong(id) {
  return wenhaoControllers.get(id) || null;
}

/**
 * 从可序列化的 clickData（路由）生成运行时 onClick 函数
 * 只需写一份 clickData（纯数据、可存档），onClick 由系统自动生成，
 * 避免「运行时 onClick + 存档 clickData」写两遍相同分支逻辑
 *
 * 每个 route 步骤的条件字段由公共模块 matchDialogueCondition 统一判断：
 * - needNpc / ifAnyCompleted / ifCompletedToday / ifDayGte
 * - ifDayEqualsFlag / ifDaysSinceFlag / ifNotCompleted / ifCompleted
 * - ifFlag / ifNotFlag（判断 setDialogueFlag 存的布尔标记）
 * - needItem（背包检测）/ needAffection（NPC好感度检测）
 * 步骤还可配 silent: true → 只执行该节点的 onEnter，不弹出对话框（如休息问号）
 *
 * @param {Object} [clickData] - 可序列化的点击配置 { loadData, route: [...] }
 * @returns {Function|null} 生成的 onClick；无 loadData 时返回 null
 */
function buildOnClickFromClickData(clickData) {
  if (!clickData || !clickData.loadData) return null;
  return () => {
    let targetName = clickData.name;
    let silent = false;
    if (Array.isArray(clickData.route)) {
      for (const step of clickData.route) {
        // 条件不满足则跳过该步（公共判断，含天数/NPC/互斥/完成状态等）
        if (!matchDialogueCondition(step)) continue;
        targetName = step.name;
        silent = !!step.silent;
        break;
      }
    }
    if (targetName) {
      emitter.emit("talkToNpc", {
        loadData: clickData.loadData,
        name: targetName,
        silent, // 🔇 silent: true → 只执行 onEnter，不弹出对话框
      });
    }
  };
}
export async function wenhaoHudong(
  x, y, w, h,
  {
    textureName,
    show = true,
    wuxian = false,
    isFloatEnable = true,
    scale,           // 问号大小（缩放倍数），不传则用默认 WallScale * 0.45
    detectWidth,     // x轴检测范围（像素），不传则用全局默认距离
    onlyXDetect,     // 是否只检测x轴（忽略y轴距离）
    onClick,         // 点击事件回调函数
    clickData,       // 点击事件附带的自定义参数
    wenhaoId,        // 问号互动的唯一ID
    mapId,           // 所属地图ID
    followNpcId,     // 绑定的 NPC id：NPC 移动时问号跟随其头顶（每帧由主线程同步位置）
    followOffsetY,   // 头顶向上偏移（像素），默认 45
  } = {},
  WallScale,
  worldContainer,
  Assets,
  Sprite
) {
  // 不显示则直接返回
  if (!show) return null;
  textureName = textureName || "question"

  // 缓存 Assets 引用，供后续 setWenhaoHudong 切换纹理使用
  _assets = Assets;

  // 获取资源
  const texture = Assets.get(textureName);
  if (!texture) return null;

  // 创建精灵
  const mark = new Sprite(texture);
  mark.alpha = 0.7;
  mark.wuxian = wuxian;
  mark.isFloatEnable = isFloatEnable;
  mark.detectWidth = detectWidth || 12;   // 默认8vw的x轴检测范围
  mark.onlyXDetect = onlyXDetect !== false; // 默认true，只检测x轴
  mark.clickData = clickData || null;
  mark.wenhaoId = wenhaoId || null;
  mark.mapId = mapId || null;
  mark.followNpcId = followNpcId ?? null;
  mark.followOffsetY = followOffsetY ?? 45;
  // 把 onClick 挂到 mark 上，支持运行时通过 setWenhaoHudong/setClickData 动态更新
  mark.onClick = typeof onClick === 'function' ? onClick : null;
  // 锚点、缩放、层级、位置
  mark.anchor.set(0.5, 1);

  const baseScale = WallScale * 0.5;
  const finalScale = baseScale * (scale ?? 1);
  mark.scale.set(finalScale);

  mark.position.set(x, y);


  // 添加到舞台
  worldContainer.addChild(mark);

  // 初始化浮动效果
  await initFloatingMark(mark, isFloatEnable);
  // 点击事件

  mark.on("pointertap", () => {
    if (!mark.visible || mark.locked) return;

    if (mark.wuxian !== 0) {
      mark.wuxian--
      removeFloatingMark(mark, true);
      mark.visible = false;
      mark.locked = true;
      mark._hideTimer = setTimeout(() => {
        mark.locked = false;
        mark.visible = true;
      }, 1200);
    } else {
      removeFloatingMark(mark, false);
      // 从地图数据中删除，确保重新进入地图或读档后不再出现
      if (mark.mapId && mark.wenhaoId) {
        emitter.emit('removeWenhaoHudong', {
          mapId: mark.mapId,
          wenhaoId: mark.wenhaoId
        });
      }
    }

    // 触发自定义点击回调（优先用 mark 上最新的 onClick，支持运行时动态更新）
    if (typeof mark.onClick === 'function') {
      mark.onClick(mark);
    } else if (mark.clickData && mark.clickData.loadData) {
      // onClick 随存档序列化丢失后，用可序列化的 clickData 兜底恢复点击
      // 支持 route 路由数组：按进度选择要打开的对话（如 jingling.js 的 heimi 问号）
      const fn = buildOnClickFromClickData(mark.clickData);
      if (fn) fn(mark);
    }
  });
  floatingMarks.push(mark);
  // ✅ 注册控制对象到全局注册表：保证任意来源（读档/地图重载/对话创建）渲染的问号
  //    都能用 getWenhaoHudong(wenhaoId) 操作（hide/show/setPosition/remove 等）
  if (wenhaoId && mapId && !wenhaoControllers.has(wenhaoId)) {
    wenhaoControllers.set(wenhaoId, buildWenhaoController(mapId, wenhaoId));
  }
  return { mark, floatingMarks };
}

async function initFloatingMark(mark, isFloatEnable) {
  mark.baseY = mark.y;
  mark.maxBaseY = mark.baseY + 8;
  mark.minBaseY = mark.baseY - 8;
  mark.speed = 0.4;
  mark.direction = 1;
  mark.isFloatEnable = isFloatEnable;  // ✅【最终关键】
  mark.visible = true;
  mark.locked = false; // ⭐ 关键
  mark.eventMode = "static";
  mark.cursor = "pointer";
}
function removeFloatingMark(mark, yincang = false) {
  if (yincang) {
    mark.visible = false;
    mark.locked = true; // ⭐ 关键
  } else {
    const index = floatingMarks.indexOf(mark);
    if (index !== -1) {
      floatingMarks.splice(index, 1);
    }

    if (mark.parent) {
      mark.parent.removeChild(mark);
    }

    mark.destroy();
  }
}
// =====================================
// 设置问号互动属性（百分比坐标系统）
// x: 0~1（地图宽度 realWidth 百分比）
// y: 0~1（窗口高度百分比）
// 读档时 bg.js 负责将百分比转为世界像素坐标
// =====================================
// 问号互动控制对象构建（hide/show/setPosition/remove 等方法）
// 供 createWenhaoHudong 和低层 wenhaoHudong 渲染时共同使用，
// 保证任意来源的问号都能 getWenhaoHudong(id) 操作
// =====================================
function buildWenhaoController(mapId, wenhaoId) {
  return {
    id: wenhaoId,
    setPosition(x, y) {
      setWenhaoHudong(mapId, wenhaoId, { x, y });
    },
    setTexture(textureName) {
      setWenhaoHudong(mapId, wenhaoId, { textureName });
    },
    show() {
      setWenhaoHudong(mapId, wenhaoId, { show: true });
    },
    hide() {
      setWenhaoHudong(mapId, wenhaoId, { show: false });
    },
    // 运行时更新点击配置（clickData 可序列化路由）
    // 用法：getWenhaoHudong('jinmao')?.setClickData({ loadData: 'npc/jingling', route: [...] })
    setClickData(newClickData) {
      setWenhaoHudong(mapId, wenhaoId, { clickData: newClickData });
    },
    // 运行时设置自定义点击回调（onClick 为函数，不存档，适合临时逻辑）
    setOnClick(fn) {
      setWenhaoHudong(mapId, wenhaoId, { onClick: fn });
    },
    // 在原有 clickData 路由基础上「追加/插入」新的点击分支（不覆盖原路由）
    // @param {Object|Object[]} steps - 单个路由条目或数组
    //   { ifNotCompleted: 'jinmao373', name: 'jinmao373' }
    // @param {Object} [opts]
    // @param {boolean} [opts.prepend=false] - true=插到最前面（优先触发），false=追加到最后
    addRouteStep(steps, opts = {}) {
      const prepend = opts.prepend === true;
      const newSteps = Array.isArray(steps) ? steps : [steps];

      // 从地图数据取回当前 clickData（原路由还在，避免运行时被覆盖后丢失）
      const mapData = user.pixi.mapDataList.find(m => m.id === mapId);
      const item = mapData?.wenhaoHudong?.find(w => w.id === wenhaoId);
      const old = item?.clickData || null;

      const merged = {
        loadData: old?.loadData || 'npc/jingling',
        route: prepend
          ? [...newSteps, ...(old?.route || [])]
          : [...(old?.route || []), ...newSteps],
      };
      setWenhaoHudong(mapId, wenhaoId, { clickData: merged });
      return merged;
    },
    remove() {
      // 移除渲染实例（先清掉点击反馈的恢复计时器，避免操作已销毁对象）
      const mark = floatingMarks.find(m => m.mapId === mapId && m.wenhaoId === wenhaoId);
      if (mark) {
        if (mark._hideTimer) { clearTimeout(mark._hideTimer); mark._hideTimer = null; }
        removeFloatingMark(mark, false);
      }
      // 从地图数据删除（不写入 removedWenhaoIds，允许后续再次创建）
      const md = user.pixi.mapDataList.find(m => m.id === mapId);
      if (md && md.wenhaoHudong) {
        md.wenhaoHudong = md.wenhaoHudong.filter(w => w.id !== wenhaoId);
      }
      // 从全局注册表注销
      wenhaoControllers.delete(wenhaoId);
    },
  };
}

// =====================================
// 动态创建问号互动（类似 createNPC，对话中调用）
// 用法: createWenhaoHudong({ id:'xx', mapId:'desert_01', x:0.5, y:0.5, ... })
// =====================================
/**
 * 动态创建问号互动（对话中调用来增加新的可点击标记）
 * 参考 createNPC 的用法：已存在同 id 会先删除再重建（允许对话中更新）
 * @param {Object} config - 问号互动配置
 * @param {string} config.id - 唯一 ID（不能和其他问号重复）
 * @param {string} [config.mapId] - 所在的地图 ID（默认当前地图）
 * @param {number} [config.x] - X 坐标百分比（0~1，相对地图宽度）
 * @param {number} [config.y] - Y 坐标百分比（0~1，相对窗口高度）
 * @param {string} [config.textureName] - 图标纹理名（默认 "question"）
 * @param {boolean} [config.show] - 是否显示（默认 true）
 * @param {number} [config.wuxian] - 可点击次数，-1=无限点击（默认 -1）
 * @param {number} [config.scale] - 问号大小缩放倍数
 * @param {number} [config.detectWidth] - x 轴检测范围（像素）
 * @param {boolean} [config.onlyXDetect] - 是否只检测 x 轴
 * @param {boolean} [config.isFloatEnable] - 是否会上下浮动（默认 true）
 * @param {Function} [config.onClick] - 点击事件回调函数
 * @returns {Object|null} 控制对象 { id, setPosition, setTexture, show, hide, remove }，失败返回 null
 */
export function createWenhaoHudong(config = {}) {
  const mapId = config.mapId || 'desert_01';
  const mapData = user.pixi.mapDataList?.find(m => m.id === mapId);
  if (!mapData) {
    console.warn(`[createWenhaoHudong] 未找到地图: ${mapId}`);
    return null;
  }
  if (!mapData.wenhaoHudong) mapData.wenhaoHudong = [];

  // 已存在则先删除再重建（允许对话中更新位置/属性等）
  const existing = mapData.wenhaoHudong.find(w => w.id === config.id);
  if (existing) {
    mapData.wenhaoHudong = mapData.wenhaoHudong.filter(w => w.id !== config.id);
    // 移除已渲染的旧实例（先清掉点击反馈的恢复计时器，避免操作已销毁对象）
    const oldMark = floatingMarks.find(m => m.mapId === mapId && m.wenhaoId === config.id);
    if (oldMark) {
      if (oldMark._hideTimer) { clearTimeout(oldMark._hideTimer); oldMark._hideTimer = null; }
      removeFloatingMark(oldMark, false);
    }
  }

  const clickData = config.clickData || null;
  // 只传 clickData（可序列化路由）时自动生成 onClick，运行时即可点击；
  // 存档时 onClick 函数会丢失，但 clickData 是纯数据会保留，读档后靠兜底逻辑恢复
  const onClick = config.onClick || buildOnClickFromClickData(clickData);

  const item = {
    id: config.id,
    x: config.x ?? 0.5,
    y: config.y ?? 0.5,
    show: config.show ?? true,
    textureName: config.textureName,
    wuxian: config.wuxian ?? -1,
    scale: config.scale,
    detectWidth: config.detectWidth,
    onlyXDetect: config.onlyXDetect,
    isFloatEnable: config.isFloatEnable ?? true,
    followNpcId: config.followNpcId,
    followOffsetY: config.followOffsetY,
    onClick,
    clickData, // 可序列化的点击配置（存档后 onClick 丢失，用 clickData 兜底恢复点击）
  };
  mapData.wenhaoHudong.push(item);

  // 通知 matter.vue 立即创建渲染实例
  emitter.emit('wenhaoConfigUpdated', { mapId, wenhaoId: config.id });

  // 返回一个控制对象，方便后续操作（并注册到全局注册表，供任意位置 getWenhaoHudong(id) 获取）
  const ctrl = buildWenhaoController(mapId, config.id);
  wenhaoControllers.set(config.id, ctrl);
  return ctrl;
}

/**
 * 修改问号互动的位置、显示状态、图标纹理
 * @param {string} mapId - 地图ID
 * @param {string} wenhaoId - 问号互动的唯一ID
 * @param {Object} options - 修改选项
 * @param {number} [options.x] - 新的 x 坐标（百分比 0~1，相对于地图宽度 realWidth）
 * @param {number} [options.y] - 新的 y 坐标（百分比 0~1，相对于窗口高度）
 * @param {boolean} [options.show] - 是否显示
 * @param {string} [options.textureName] - 新的纹理名称
 * @example setWenhaoHudong('desert_01', 'jinmao', { x: 0.45, y: 0.57, show: false })
 */
export function setWenhaoHudong(mapId, wenhaoId, options = {}) {
  const { x, y, show, textureName, clickData, onClick } = options;

  // 获取地图数据
  const mapData = user.pixi.mapDataList.find(m => m.id === mapId);
  if (!mapData) return;

  const realWidth = mapData.realWidth ?? 0;
  const offsetX = mapData.offsetX ?? 0;
  const mapHeight = window.innerHeight; // 100 * VH

  // 1. 更新 floatingMarks 中的实际渲染实例（百分比→世界像素坐标）
  const mark = floatingMarks.find(m => m.mapId === mapId && m.wenhaoId === wenhaoId);
  if (mark) {
    if (x !== undefined) {
      mark.x = x * realWidth + offsetX;
    }
    if (y !== undefined) {
      const worldY = y * mapHeight;
      mark.y = worldY;
      mark.baseY = worldY;
      mark.maxBaseY = worldY + 8;
      mark.minBaseY = worldY - 8;
    }
    if (show !== undefined) {
      // 关键：清除点击反馈的自动恢复计时器，避免 hide() 后 1.2 秒又被 _hideTimer 重新显示
      if (mark._hideTimer) {
        clearTimeout(mark._hideTimer);
        mark._hideTimer = null;
      }
      mark.visible = show;
      mark.locked = !show; // 隐藏时锁定防误触，显示时解锁
      mark.eventMode = show ? "static" : "none";
    }
    if (textureName !== undefined && _assets) {
      const texture = _assets.get(textureName);
      if (texture) {
        mark.texture = texture;
      }
    }
    // 更新点击配置：clickData 更新时同步重建 onClick（可存档路由）
    if (clickData !== undefined) {
      mark.clickData = clickData;
      mark.onClick = buildOnClickFromClickData(clickData);
    }
    // 直接设置自定义点击回调（覆盖 clickData 生成的）
    if (onClick !== undefined) {
      mark.onClick = typeof onClick === 'function' ? onClick : null;
    }
  }

  // 2. 同步到 mapDataList 中的数据（持久化百分比值，读档后自动恢复）
  if (mapData && mapData.wenhaoHudong) {
    const item = mapData.wenhaoHudong.find(w => w.id === wenhaoId);
    if (item) {
      if (x !== undefined) item.x = x;            // 百分比存储（0~1）
      if (y !== undefined) item.y = y;            // 百分比存储（0~1）
      if (show !== undefined) item.show = show;
      if (textureName !== undefined) item.textureName = textureName;
      // 点击配置持久化：clickData 是纯数据可存档；onClick 是函数不存档（读档靠 clickData 兜底）
      if (clickData !== undefined) {
        item.clickData = clickData;
        item.onClick = buildOnClickFromClickData(clickData);
      }
      if (onClick !== undefined) {
        item.onClick = typeof onClick === 'function' ? onClick : null;
      }
    }
  }
}

// =====================================
// 动态添加/移除障碍物（对话中调用，写入 mapDataList → 自动存档，读档后依旧生效）
// 用法（对话节点 onEnter 里调用）：
//   addRectObstacle({ mapId:'one01', obstacleId:'rock_1', x:..., y:..., w:40, h:30 })
//   removeRectObstacle('one01', 'rock_1')
//   getRectObstacles('one01')
// 说明：
//   - 数据写入 user.pixi.mapDataList 里对应地图的 rectPoolArr（已持久化），
//     读档/切图后由 loadMapData 自动实体化，无需额外处理
//   - 若给的是「当前地图」，会通过 emitter 触发 matter.vue 立即重建刚体（不需要切图就生效）
//   - x/y 用世界像素坐标（与 map.js 的 rectPoolArr 一致，底部对齐，物理中心自动 -h/2）
//   - obstacleId 用于防重复/删除定位；不带 obstacleId 则每次都新增
// =====================================
function getRectObstacles(mapId) {
  const mapData = user.pixi.mapDataList?.find(m => m.id === mapId);
  if (!mapData) return [];
  if (!mapData.rectPoolArr) mapData.rectPoolArr = [];
  return mapData.rectPoolArr;
}

/**
 * 动态添加一个矩形障碍物（静态碰撞体）
 * 支持两种视觉：
 *   1. 无 spineName → 纯碰撞墙（create:false 不可见 / extra.create:true 显示色块）
 *   2. 有 spineName  → 视觉用 Spine 骨骼动画 + 物理矩形碰撞（推荐：石头/木箱/门等）
 * @param {Object} config
 * @param {string} config.mapId - 目标地图ID（如 'one01' / 'desert_01'）
 * @param {number} [config.x] - 世界像素X（底部中心）；与 config.xPercent 二选一
 * @param {number} [config.xPercent] - X 百分比（0~1，相对地图宽度 realWidth），推荐
 * @param {number} [config.y] - 世界像素Y（底部；物理中心自动 -h/2）；与 config.yPercent 二选一
 * @param {number} [config.yPercent] - Y 百分比（0~1，相对窗口高度），推荐
 * @param {number} config.w - 物理碰撞宽度（像素；也可用 config.wPercent 相对地图宽度）
 * @param {number} config.h - 物理碰撞高度（像素；也可用 config.hPercent 相对窗口高度）
 * @param {string} [config.spineName] - Spine 骨骼名（如 'changjing2'，需在 loadAssets.js 注册了 xxx_skel/xxx_atlas）
 * @param {string} [config.spineAnimation] - Spine 动画名，不传则自动播放第一个动画
 * @param {boolean} [config.spineLoop] - Spine 动画是否循环，默认 true
 * @param {string} [config.spineSkin] - Spine 皮肤名，不传则自动用第一个非 default 皮肤
 * @param {number} [config.spineScale] - Spine 缩放倍数，默认 1
 * @param {string} [config.obstacleId] - 唯一标识（防重复 & 删除定位），建议传
 * @param {Object} [config.extra] - 额外字段合并到数据里（color/zIndex/isSensor/isStatic/label 等）
 * @param {boolean} [config.rebuild] - 是否立即重建当前地图刚体，默认 true
 * @returns {Object|null} 添加的障碍物数据，失败返回 null
 */
export function addRectObstacle(config = {}) {
  const mapId = config.mapId;
  const mapData = user.pixi.mapDataList?.find(m => m.id === mapId);
  if (!mapData) {
    console.warn(`[addRectObstacle] 未找到地图: ${mapId}`);
    return null;
  }
  const arr = getRectObstacles(mapId);

  // 防重复：有 obstacleId 且已存在则直接返回
  if (config.obstacleId) {
    const exists = arr.find(r => r.obstacleId === config.obstacleId);
    if (exists) return exists;
  }

  const realWidth = mapData.realWidth || 0;
  const mapHeight = window.innerHeight; // 100 * VH

  // 坐标换算：支持像素或百分比
  // ⚠️ 与 map.js 静态 rectPoolArr 一致：x 存「地图内部相对坐标」（不加 offsetX），
  //    加载时 loadMapData/rebuildMapObstacles 会统一 applyOffset(+offsetX)
  const x = config.x !== undefined ? config.x : (config.xPercent ?? 0.5) * realWidth;
  const y = config.y !== undefined ? config.y : (config.yPercent ?? 0.5) * mapHeight;
  const w = config.w !== undefined ? config.w : (config.wPercent ?? 0.05) * realWidth;
  const h = config.h !== undefined ? config.h : (config.hPercent ?? 0.05) * mapHeight;

  // Spine 视觉字段（有 spineName 时存 spineSkel/spineAtlas，matter.vue 检测到后走 Spine 分支）
  const spineSkel = config.spineName ? `${config.spineName}_skel` : null;
  const spineAtlas = config.spineName ? `${config.spineName}_atlas` : null;

  const obstacle = {
    obstacleId: config.obstacleId,
    x, y, w, h,
    // Spine 视觉（可选）
    spineSkel,
    spineAtlas,
    spineAnimation: config.spineAnimation,
    spineLoop: config.spineLoop !== false,
    spineSkin: config.spineSkin,
    spineScale: config.spineScale,
    // 物理碰撞
    withBody: true,   // 有物理碰撞
    isStatic: true,   // 静态障碍
    create: false,    // 普通障碍纯碰撞；Spine 障碍视觉由 Spine 负责
    ...(config.extra || {}),
  };
  arr.push(obstacle);

  // 当前地图 → 立即重建刚体（不需要等切图）
  if (config.rebuild !== false && user.pixi.currentMapId === mapId) {
    emitter.emit('rebuildMapObstacles', { mapId });
  }
  return obstacle;
}

/**
 * 移除一个动态障碍物（按 obstacleId）
 * @param {string} mapId - 地图ID
 * @param {string} obstacleId - addRectObstacle 时传的唯一标识
 * @param {boolean} [rebuild] - 是否立即重建当前地图刚体，默认 true
 * @returns {boolean} 是否成功移除
 */
export function removeRectObstacle(mapId, obstacleId, rebuild = true) {
  const arr = getRectObstacles(mapId);
  const idx = arr.findIndex(r => r.obstacleId === obstacleId);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  if (rebuild && user.pixi.currentMapId === mapId) {
    emitter.emit('rebuildMapObstacles', { mapId });
  }
  return true;
}

/**
 * 修改一个动态障碍物（按 obstacleId 覆盖传入字段）
 * @param {string} mapId - 地图ID
 * @param {string} obstacleId - 障碍物唯一标识
 * @param {Object} patch - 要修改的字段（x/y/w/h 等）
 * @param {boolean} [rebuild] - 是否立即重建当前地图刚体，默认 true
 * @returns {Object|null} 修改后的数据，未找到返回 null
 */
export function updateRectObstacle(mapId, obstacleId, patch = {}, rebuild = true) {
  const arr = getRectObstacles(mapId);
  const item = arr.find(r => r.obstacleId === obstacleId);
  if (!item) return null;
  Object.assign(item, patch);
  if (rebuild && user.pixi.currentMapId === mapId) {
    emitter.emit('rebuildMapObstacles', { mapId });
  }
  return item;
}

