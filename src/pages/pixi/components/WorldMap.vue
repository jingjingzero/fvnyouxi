<template>
  <!-- 世界地图选择画布：可拖动 + 场景节点点击交互 -->
  <!-- ⚠️ 用 v-show 控制显隐（组件常驻挂载，不销毁），保证 Spine 背景只初始化一次、切换开关不丢失 -->
  <div v-show="visible" class="world-map-mask fixed inset-0 z-[90] bg-black/80 flex items-center justify-center select-none"
    @mousedown.self="close" @touchstart.self="close">
    <div class="world-map-wrap relative w-[92vw] h-[80vh] bg-gradient-to-b from-#0a1a2f to-#0d2b45 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <!-- 顶部标题 -->
      <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4vh py-2vh pointer-events-none">
        <div class="text-[3.5vh] text-white font-bold iconfont2 drop-shadow-lg">🗺️ 世界地图</div>
        <div class="flex items-center gap-2vh pointer-events-auto">
          <!-- 缩放控制按钮组 -->
          <div class="flex items-center bg-[#0a1a2f]/80 rounded-full border border-amber-400/20 overflow-hidden backdrop-blur-sm shadow-lg">
            <button class="zoom-btn w-7vh h-7vh flex items-center justify-center text-[3vh] text-amber-300 hover:text-amber-200 hover:bg-white/10 bg-transparent transition-colors"
              title="缩小" @click="zoomOut">−</button>
            <span class="w-8vh text-center text-[2vh] text-amber-200/80 iconfont2 border-x border-white/10">{{ Math.round(scale * 100) }}%</span>
            <button class="zoom-btn w-7vh h-7vh flex items-center justify-center text-[3vh] text-amber-300 hover:text-amber-200 hover:bg-white/10 bg-transparent transition-colors"
              title="放大" @click="zoomIn">＋</button>
            <button class="zoom-btn px-2vh h-7vh flex items-center justify-center text-[2vh] text-amber-200/80 hover:text-amber-200 hover:bg-white/10 bg-transparent transition-colors border-l border-white/10"
              title="重置缩放" @click="resetView">重置</button>
          </div>
          <!-- 关闭按钮 -->
          <button class="close-btn w-7vh h-7vh rounded-full flex items-center justify-center text-[2.5vh] text-amber-200/70 bg-[#0a1a2f]/80 border border-amber-400/20 hover:bg-red-500/80 hover:text-white hover:border-red-400/50 transition-all shadow-lg"
            title="关闭" @click="close">
            <svg width="2.8vh" height="2.8vh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- 可拖动画布 -->
      <div class="absolute inset-0 z-10 overflow-hidden">
        <!-- ⚠️ 外层画布铺满整个容器（absolute inset-0），保证容器内任意空白区域都能捕获 pointerdown；
             内部内容层用 transform: translate 平移 + scale 缩放，天然响应拖动 -->
        <div ref="canvasEl" class="world-map-canvas absolute inset-0"
          :style="{ cursor: dragging ? 'grabbing' : 'grab' }"
          @pointerdown="onPointerDown" @wheel.prevent="onWheel">
          <!-- 内部内容层：2000×2000 世界画布，随 pos 平移、scale 缩放 -->
          <div class="absolute world-map-content"
            :style="{ width: MAP_W + 'px', height: MAP_H + 'px', transformOrigin: '0 0', transform: 'translate(' + pos.x + 'px,' + pos.y + 'px) scale(' + scale + ')' }">
            <!-- 🗺️ Spine 背景（mapditu，皮肤 one01，无动画，铺满 2000×2000 画布） -->
            <canvas ref="bgCanvas" class="world-map-bg absolute top-0 left-0 pointer-events-none"
              :width="MAP_W" :height="MAP_H"></canvas>

            <!-- 场景连线（SVG）：一条连续直线依次连接所有场景，黑色（任务模式不显示） -->
            <svg class="absolute top-0 left-0 pointer-events-none" :width="MAP_W" :height="MAP_H"
              style="z-index: 0.5;">
              <path :d="mainPath" fill="none" stroke="#000000" stroke-opacity="0.6" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>

            <!-- 场景节点 -->
            <div v-for="s in scenes" :key="s.id" class="absolute scene-node"
              :style="{ left: s.x + 'px', top: s.y + 'px' }" :title="tr(s.desc)">
              <div class="flex flex-col items-center relative">
                <!-- 节点图标：图片形式，战斗区域=红色图标，其他区域=蓝色图标 -->
                <div class="relative" :class="{ 'scene-player-marker': s.id === currentMapId }">
                  <img :src="sceneIconImg(s)" class="scene-icon object-contain drop-shadow-lg transition-all"
                    :style="{ width: iconSizePx + 'px', height: iconSizePx + 'px' }"
                    @pointerdown.stop="onNodePointerDown"
                    @click.stop="onNodeClick(s, $event)" />
                  <!-- 右上角角标：战斗地图=战斗图标，非战斗地图=坐标图标 -->
                  <span class="scene-badge" :class="s.type === 'battle' ? 'scene-badge-battle' : 'scene-badge-story'"
                    :title="s.type === 'battle' ? '战斗区域' : '坐标地点'"
                    @pointerdown.stop="onNodePointerDown" @click.stop="onNodeClick(s, $event)">
                    <svg v-if="s.type === 'battle'" viewBox="0 0 24 24" class="scene-badge-svg" fill="currentColor">
                      <!-- 战斗图标：交叉双剑 -->
                      <path d="M3 3l6 6-2 2-4-1-1 3-2-2 3-4 1 1-1-5zM21 3l-6 6 2 2 4-1 1 3 2-2-3-4-1 1 1-5z" />
                      <path d="M9 9l6 6-2 2-6-6z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="scene-badge-svg" fill="currentColor">
                      <!-- 坐标图标：定位图钉 -->
                      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                    </svg>
                  </span>
                </div>
                <!-- 场景名称 -->
                <div class="scene-name mt-1vh px-2vh rounded-full iconfont2"
                  :style="{ fontSize: nameFontPx + 'px', paddingTop: nameFontPx * 0.25 + 'px', paddingBottom: nameFontPx * 0.25 + 'px' }"
                  :class="s.id === currentMapId ? 'bg-amber-500 text-black font-bold' : 'bg-black/60 text-white'">
                  {{ s.label }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-center gap-[1vh] px-4vh py-2vh bg-black/40 pointer-events-auto">        <div class="text-[2vh] text-white/60 iconfont2">拖动 / WASD 或方向键平移画布 · 滚轮缩放</div>
      </div>

            <!-- 讨伐准备面板（选择队友 + 进入地牢） -->
      <BattlePrepPanel v-if="selectedBattle" :visible="true"
        :current-floor="1" :max-floor="2"
        :title="'地牢讨伐 · ' + tr(selectedBattle.label)" :enter-text="'进入地牢'"
        :cost="selectedBattle.cost || 3"
        @leave="selectedBattle = null" @enter="onBattleConfirm" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from "vue";
import { useCounterStore } from "@/store/counter";
import emitter from "@/bus";
import { getWorldMapScenes } from "../player/map.js";
import BattlePrepPanel from "./BattlePrepPanel.vue";
import { Application, Container } from "pixi.js";
import { tr } from "@/i18n";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { loadMapBundle } from "@/components/loadAssets.js";

/**
 * 世界地图选择画布
 * - 可无限拖动，画布上有多个场景节点
 * - 战斗场景 → 弹出战斗准备面板选择深入度 → 触发战斗
 * - 普通场景 → 传送到该地图 或 直接触发对话
 *
 * @prop {Boolean} visible - 是否显示
 * @prop {String} currentMapId - 当前所在地图
 */
const props = defineProps({
  visible: { type: Boolean, default: false },
  currentMapId: { type: String, default: "desert_01" },
});

const emit = defineEmits(["close"]);

const user = useCounterStore();

// ==================== 画布尺寸与位置 ====================
const MAP_W = 2000;
const MAP_H = 2000;
const canvasEl = ref(null);
const bgCanvas = ref(null); // Spine 背景 canvas
const pos = reactive({ x: 0, y: 0 }); // 画布相对容器偏移
const dragging = ref(false);
const scale = ref(1);                 // 缩放倍率
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
let dragStart = { x: 0, y: 0, px: 0, py: 0 };

// ==================== 场景定义 ====================
// 世界地图上所有可选的场景节点（从地图注册表生成，新增地图只需在 map.js 登记）
// - story 剧情/普通场景：点击后传送到该地图
// - battle 战斗区域：点击后弹出战斗准备面板，可选择深入度与携带队友
// ⚠️ 用 ref 保存：对话/剧情可通过 map.js 的 addWorldMapScene/removeWorldMapScene/updateWorldMapScene
//    动态增删改地标，每次打开世界地图时 rebuildScenes() 重新从 MAP_META 生成节点和连线
const scenes = ref([]);
// 场景连线路径（每次重建 scenes 时同步重算）
const mainPath = ref("");

/** 从 MAP_META 重新生成场景节点 + 连线（打开世界地图时调用，反映对话动态增删的地标） */
function rebuildScenes() {
  const list = getWorldMapScenes();
  // 🎯 坐标换算：MAP_META 里的 x/y 是百分比（0~100，以地图中心 0,0 为参照），
  // 这里换算成内容层像素坐标（0~2000，左上角原点），供模板 / 连线 / resetView 使用。
  // 换算：百分比 0~100 → 内容层像素 0~MAP_W（0~MAP_H）
  for (const s of list) {
    s.x = (s.x / 100) * MAP_W;
    s.y = (s.y / 100) * MAP_H;
  }
    scenes.value = list;
  mainPath.value = buildLinePath(list);
}

/** 场景节点图标图片：每个场景在 MAP_META 里配置了专属 img 路径（public/mapicon/ 下），
 *    这里直接返回该场景自己的图标；未配置 img 的场景退回空字符串（不显示图片）
 */
function sceneIconImg(scene) {
  return scene?.img || "";
}

// ==================== 🔍 缩放按钮 ====================
function zoomIn() {
  scale.value = Math.min(MAX_SCALE, scale.value + 0.2);
}
function zoomOut() {
  scale.value = Math.max(MIN_SCALE, scale.value - 0.2);
}

// ==================== 📍 场景节点交互 ====================
let nodeDownPos = null;
function onNodePointerDown(e) {
  nodeDownPos = { x: e.clientX, y: e.clientY };
}
function onNodeClick(scene, e) {
  // 拖动过则不触发点击
  if (nodeDownPos && e) {
    const dx = Math.abs(e.clientX - nodeDownPos.x);
    const dy = Math.abs(e.clientY - nodeDownPos.y);
    if (dx > 5 || dy > 5) { nodeDownPos = null; return; }
    nodeDownPos = null;
  }
  if (scene.type === 'battle') {
    selectedBattle.value = scene;
  } else {
    // 普通场景：传送到该地图
    emit('close');
    emitter.emit('teleportToMap', { mapId: scene.mapId || scene.id });
  }
}


/** 重置视角：居中到 focusSceneId 对应的场景（或画布中心） */
function resetView() {
  if (!canvasEl.value) return;
  const rect = canvasEl.value.getBoundingClientRect();
  const containerW = rect.width;
  const containerH = rect.height;

  let targetX = MAP_W / 2;
  let targetY = MAP_H / 2;
  if (focusSceneId && scenes.value?.length) {
    const scene = scenes.value.find(sc => sc.id === focusSceneId);
    if (scene) {
      targetX = scene.x;
      targetY = scene.y;
    }
  }
  pos.x = containerW / 2 - targetX * scale.value;
  pos.y = containerH / 2 - targetY * scale.value;
}


// ==================== 🖱️ 地图拖动与缩放 ====================
function onPointerDown(e) {
  if (e.button !== 0) return; // 只响应左键
  dragging.value = true;
  dragStart = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(e) {
  if (!dragging.value) return;
  pos.x = dragStart.px + (e.clientX - dragStart.x);
  pos.y = dragStart.py + (e.clientY - dragStart.y);
}

function onPointerUp() {
  dragging.value = false;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
}

// 滚轮缩放
function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value + delta));
  // 以鼠标位置为中心缩放
  if (canvasEl.value) {
    const rect = canvasEl.value.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ratio = newScale / scale.value;
    pos.x = mx - (mx - pos.x) * ratio;
    pos.y = my - (my - pos.y) * ratio;
  }
  scale.value = newScale;
}

// ==================== 图标/文字尺寸（基于世界地图边界宽高） ====================
// 场景图标与文字大小由世界地图边界（MAP_W×MAP_H，2000×2000）决定，
// 任何屏幕分辨率下相对地图的比例保持一致；scene-node 以 (s.x,s.y) 为中心（translate(-50%,-50%)）
const mapBase = Math.min(MAP_W, MAP_H);      // 地图基准边长（宽高相等，即 2000）
const ICON_RATIO = 0.04;                     // 图标边长 = 地图基准的 4%（80px）
const ICON_GAP_RATIO = 0.002;                // 连线与图标边缘的间隙 = 地图基准的 0.2%（4px）
const iconSizePx = Math.round(mapBase * ICON_RATIO);  // 图标边长（px，地图像素）
const nameFontPx = Math.round(iconSizePx * 0.14);     // 场景名称字号
// 把方向正交化到水平/垂直，返回从节点中心指向「某条边中心」的偏移量
function edgeOffset(dx, dy, half) {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: (dx > 0 ? 1 : -1) * half, y: 0 };
  }
  return { x: 0, y: (dy > 0 ? 1 : -1) * half };
}
// 从节点中心 p 出发，朝方向 (dx,dy) 偏移 half，落到图标边缘（贴边）
function pointAtEdge(p, dx, dy, half) {
  const e = edgeOffset(dx, dy, half);
  return { x: p.x + e.x, y: p.y + e.y };
}
// 直线连线：根据每个地标的 links 字段连接指定对象（无向，避免重复画同一条线）
// 每个地标可在 MAP_META 配置 links: ['其他地标id', ...]，连线就连接这些地标
// 例：desert_01: { ..., links: ['battle_01', 'battle_02'] }
function buildLinePath(sceneMap) {
  if (!sceneMap.length) return "";
  const halfByScene = {};
  // 每个地标按自身实际大小取半边长（无配置则用默认 half）
  for (const s of sceneMap) {
    const sz = (s.iconSizePx || iconSizePx) / 2 + mapBase * ICON_GAP_RATIO;
    halfByScene[s.id] = sz;
  }
  const seen = new Set(); // 记录已连接的边，避免 A→B 和 B→A 重复
  let d = "";
  for (const s of sceneMap) {
    const links = s.links || [];
    for (const targetId of links) {
      const key = [s.id, targetId].sort().join("|");
      if (seen.has(key)) continue; // 无向：同一条边只画一次
      const t = sceneMap.find(x => x.id === targetId);
      if (!t) continue;
      seen.add(key);
      // 各自从中心朝对方方向贴到边缘
      const a = pointAtEdge(s, t.x - s.x, t.y - s.y, halfByScene[s.id]);
      const b = pointAtEdge(t, s.x - t.x, s.y - t.y, halfByScene[t.id]);
      d += `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)} `;
    }
  }
  return d;
}

// 当前选中的战斗场景
const selectedBattle = ref(null);

// 🎯 世界地图打开时聚焦到哪个地标（玩家所在地）。默认聚焦 desert_01（绿洲）。
//    可改为其他地标 id，或置空/null 则不聚焦（退回到全部地标居中显示）
const focusSceneId = 'desert_01';

function onBattleConfirm(allyImg) {
  const scene = selectedBattle.value;
  if (!scene) return;


  // 保存携带队友
  if (typeof allyImg === 'string') {
    user.setNpcAlly(allyImg);
  }

  selectedBattle.value = null;
  close();

  // 🏰 发起讨伐直接进入地牢（目前所有地图进入同一个地牢，后续改不同地图进不同地牢）
  emitter.emit('enterDungeonFromWorldMap', { sceneId: scene.id, mapId: scene.mapId, label: scene.label });
}

// 关闭面板
function close() {
  selectedBattle.value = null;
  emit("close");
}

// ==================== 🗺️ Spine 背景（mapditu，皮肤 one01，无动画，铺满 2000×2000） ====================
let bgApp = null;          // 背景 Pixi 应用
let bgSpine = null;        // mapditu Spine 实例
let bgSpineView = null;    // 背景容器（便于整体定位/缩放）
let bgInited = false;

/** 初始化世界地图 Spine 背景（懒加载，首次打开时创建） */
async function initWorldMapBg() {
  if (bgInited || !bgCanvas.value) return;
  bgInited = true;
  try {
    // 确保 mapditu 资源已加载（在 map_01 bundle 里注册过；loadMapBundle 内部有缓存判断，重复调用无害）
    try { await loadMapBundle("desert_01"); } catch (e) { console.warn('[WorldMap] map_01 资源加载失败，背景可能空白', e); }

    bgApp = new Application();
    await bgApp.init({
      canvas: bgCanvas.value,
      width: MAP_W,
      height: MAP_H,
      backgroundAlpha: 0, // 背景透明，由外层 CSS 渐变打底
      autoStart: true,
      autoDensity: true,
      resolution: 1,
      antialias: true,
    });

    bgSpineView = new Container();
    bgApp.stage.addChild(bgSpineView);

    bgSpine = new Spine({
      skeleton: "mapditu_skel",
      atlas: "mapditu_atlas",
      allowMissingRegions: true,
    });

    // 应用皮肤 one01（mapditu 只有这一个皮肤）
    const skeleton = bgSpine.skeleton;
    const skin = skeleton.data.findSkin?.("one01") || skeleton.data.skins?.[0];
    if (skin) {
      skeleton.setSkin(skin);
      skeleton.setupPose();
      bgSpine.state.apply?.(skeleton);
    }

    // ⚠️ 无动画：mapditu 没有动画，只推送到 setup pose 即可，不 setAnimation

    // 铺满画布：贴图本身是 2000×2000，把 Spine 的 bounds 对齐到画布原点 (0,0)，scale=1 即铺满
    // 先推进到第 0 帧姿态，确保 getBounds 拿到的是实际渲染 bounds
    try {
      bgSpine.state.update(0);
      bgSpine.state.apply?.(skeleton);
      skeleton.updateWorldTransform();
    } catch (e) { /* 忽略 */ }

    const raw = bgSpine.getBounds();
    // 铺满画布：贴图本身是 2000×2000，缩放使其 bounds 宽高正好等于画布尺寸，
    // 并把 bounds 左上角对齐到画布原点 (0,0)，实现完全铺满（不居中偏移）
    const bw = raw.width || MAP_W;
    const bh = raw.height || MAP_H;
    const scaleX = MAP_W / bw;
    const scaleY = MAP_H / bh;
    bgSpine.scale.set(scaleX, scaleY);
    // 重新取缩放后 bounds，把左上角对齐到画布原点
    const scaled = bgSpine.getBounds();
    bgSpine.x = -scaled.x;
    bgSpine.y = -scaled.y;

    bgSpineView.addChild(bgSpine);
  } catch (e) {
    console.error('[WorldMap] Spine 背景初始化失败:', e);
    bgInited = false;
  }
}

/** 销毁世界地图 Spine 背景 */
function destroyWorldMapBg() {
  try {
    if (bgSpine) {
      bgSpine.state?.clearTracks?.();
      bgSpine.state?.clearListeners?.();
      bgSpine.destroy?.({ children: true, texture: false });
      bgSpine = null;
    }
    if (bgApp) {
      bgApp.destroy?.(true, { children: true, texture: false });
      bgApp = null;
    }
    bgSpineView = null;
  } catch (e) {
    console.warn('[WorldMap] 背景销毁异常', e);
  }
  // 重置标志：组件用 v-show 常驻挂载，此函数仅在组件真正卸载时调用；
  // 重置 bgInited 作为安全兜底（若将来改回 v-if 卸载重建，避免下次打开跳过初始化）
  bgInited = false;
}

// 键盘 Esc 关闭
function onKeydown(e) {
  if (e.key === "Escape") close();
}

// ==================== 键盘平移地图 ====================
const pressedKeys = new Set();
let panLoopId = null;
const PAN_SPEED = 12; // 每帧平移像素

function onMapKeydown(e) {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (keys.includes(e.key)) {
    e.preventDefault();
    pressedKeys.add(e.key);
    if (!panLoopId) startPanLoop();
  }
}

function onMapKeyup(e) {
  pressedKeys.delete(e.key);
  if (pressedKeys.size === 0) stopPanLoop();
}

function startPanLoop() {
  function loop() {
    if (pressedKeys.has('ArrowUp')) pos.y -= PAN_SPEED;
    if (pressedKeys.has('ArrowDown')) pos.y += PAN_SPEED;
    if (pressedKeys.has('ArrowLeft')) pos.x -= PAN_SPEED;
    if (pressedKeys.has('ArrowRight')) pos.x += PAN_SPEED;
    panLoopId = requestAnimationFrame(loop);
  }
  panLoopId = requestAnimationFrame(loop);
}

function stopPanLoop() {
  if (panLoopId) {
    cancelAnimationFrame(panLoopId);
    panLoopId = null;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("keydown", onMapKeydown);
  window.addEventListener("keyup", onMapKeyup);
  // 首次挂载：生成场景节点和连线
  rebuildScenes();
  // 初始居中
  requestAnimationFrame(resetView);
  // 初始化 Spine 背景（组件常驻挂载，v-show 控制显隐，canvas 始终存在，只初始化一次）
  initWorldMapBg();
});
// 每次打开世界地图都重置视角（组件常驻挂载，仅靠 v-show 切换显示，不重复初始化背景）
// 🎯 打开时重新从 MAP_META 生成场景节点和连线：对话/剧情动态增删改地标后，
//    下次打开世界地图即生效（rebuildScenes 用 map.js 的 getWorldMapScenes 重新读取）
watch(
  () => props.visible,
  (v) => {
    if (v) {
      rebuildScenes();
      requestAnimationFrame(resetView);
    } else {
      // 关闭时停止平移循环并清空按键状态，避免残留
      stopPanLoop();
      pressedKeys.clear();
    }
  }
);
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("keydown", onMapKeydown);
  window.removeEventListener("keyup", onMapKeyup);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  stopPanLoop();
  // 应用真正关闭（组件卸载）时才销毁背景
  destroyWorldMapBg();
});
</script>

<style scoped>
.world-map-mask {
  -webkit-tap-highlight-color: transparent;
}
.world-map-canvas {
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.world-map-bg {
  /* Spine 背景铺满内容层，不拦截任何鼠标事件 */
  z-index: 0;
}
.scene-node {
  transform: translate(-50%, -50%);
  z-index: 1;
}
.scene-icon {
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.scene-icon:hover {
  transform: scale(1.08);
}
/* 地标右上角角标（战斗=战斗图标，非战斗=坐标图标） */
.scene-badge {
  position: absolute;
  top: -0.6vh;
  right: -0.6vh;
  width: 4.2vh;
  height: 4.2vh;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: #e53935; /* 战斗角标：红色底 */
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  pointer-events: auto;
  z-index: 2;
}
/* 非战斗（坐标）角标：蓝色底 */
.scene-badge-story {
  background: #1e88e5;
}
.scene-badge-battle {
  background: #e53935;
}
.scene-badge-svg {
  width: 70%;
  height: 70%;
}
/* 玩家所在地标记：图标外金色脉冲光圈 */
.scene-player-marker::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 9999px;
  border: 3px solid #ffc107;
  box-shadow: 0 0 12px 4px rgba(255, 193, 7, 0.55);
  animation: scenePlayerPulse 1.6s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}
@keyframes scenePlayerPulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.12); opacity: 0.5; }
}
/* 缩放/关闭按钮 */
.zoom-btn,
.close-btn {
  outline: none;
  cursor: pointer;
}
.zoom-btn:active {
  transform: scale(0.9);
}
.close-btn:active {
  transform: scale(0.92);
}
</style>
