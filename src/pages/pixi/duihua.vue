<template>
  <!-- 全屏点击层（点击任意位置下一步；无对话框过渡CG和hideUI模式时禁用点击，防止打断自动播放） -->
  <div v-show="isDialogueActive && !isBlackScreenMode && !isCgWithoutDialog && !isHideUiMode"
    class="dialog-click-overlay fixed inset-0 z-[60]" @click="handleNext"></div>
  <!-- CG 层（v-show常驻canvas，避免销毁重建报错） -->
  <div v-show="isCgVisible" ref="cgContainer"
    class="fixed inset-0 z-40 bg-#a09fa0 flex items-center justify-center overflow-hidden">
    <canvas ref="cgCanvas" class="block"
      style="aspect-ratio: 16/9; width: min(100vw, calc(100vh * 16/9)); height: min(100vh, calc(100vw * 9/16));"></canvas>
  </div>

  <!-- 全屏黑屏白字模式（支持选项） -->
  <div v-if="isBlackScreenMode"
    class="black-screen-container fixed inset-0 z-[100] select-none bg-black flex flex-col items-center justify-center px-[10vw] pointer-events-auto cursor-pointer"
    @click="handleNext">
    <div
      class="text-white text-center text-[5vh] leading-relaxed whitespace-pre-wrap break-words w-full iconfont2 pointer-events-none">
      <span v-html="displayedText"></span>
      <!-- 打字光标 -->
      <span v-if="!finished" class="typing-cursor">|</span>
    </div>
    <!-- 黑屏模式选项（打字完成后显示在文字下方） -->
    <div v-if="finished && visibleOptions.length > 0"
      class="mt-8vh flex flex-wrap gap-x-4.5vh gap-y-2.5vh pointer-events-auto" @click.stop>
      <div class="option-btn iconfont2 px-2.5vh py-1.2vh text-3.5vh rounded"
        :class="{ 'option-disabled': opt.disabled }" v-for="(opt, i) in visibleOptions" :key="i"
        :style="optionBtnStyle(opt)" @click.stop="handleChooseOption(i, opt)">
        {{ replacePlayerName(opt.text) }}<span v-if="opt.needItem" class="option-need">（{{ L('need') }}：{{ formatItemRequirement(opt) }}）</span><span v-if="opt.needAffection" class="option-need">（{{ L('need') }}：{{ formatAffectionRequirement(opt) }}）</span>
      </div>
    </div>
  </div>

  <!-- 对话框（仅对话激活时显示；黑屏模式、无对话框过渡CG和hideUI模式下隐藏；
       ⚠️ 加 isDialogueActive 条件：结算流程播放昼夜CG时 duihua 组件因 dayCgTrigger 而显示，
          若不加此条件会露出空对话框框体） -->
  <div v-show="isDialogueActive && !isBlackScreenMode && !isCgWithoutDialog && !isHideUiMode"
    class="fixed bottom-[0.8vh] left-1/2 -translate-x-1/2 w-[90vw] h-[26vh] z-[70]">
    <div class="bg-black/50 text-white px-2vw box-border flex flex-col h-full relative rounded-1 dialog-box"
      @click="handleNext">
      <!-- 玩家头像 - 左边（CG显示时默认隐藏，cgShowAvatar=true 时仍显示） -->
      <div v-show="!isCgVisible || currentCgShowAvatar"
        class="w-30vh h-60vh -bottom-1vh absolute left-0vw -z-1 rounded flex-shrink-0 text-xs">
        <canvas ref="playerAvatarCanvas" class="w-full h-full block"></canvas>
      </div>

      <!-- NPC头像 - 右边（CG显示时默认隐藏，cgShowAvatar=true 时仍显示，支持多个NPC水平排列） -->
      <div v-show="!isCgVisible || currentCgShowAvatar" ref="npcAvatarContainer"
        class="-bottom-1vh absolute -z-1 rounded flex-shrink-0 text-xs flex items-end justify-end"
        :style="{ right: npcContainerRight }">
        <canvas ref="npcAvatarCanvas" class="block"></canvas>
      </div>

      <!-- 内容滚动区域 -->
      <div ref="contentContainer" class="flex-1 overflow-y-auto scroll-smooth whitespace-pre-wrap break-words mt-1.5vh">
        <div v-if="currentDialogue" class="flex items-start gap-3 mb-2">
          <div class="flex-1 flex flex-col">
            <!-- 姓名（旁白/系统不显示） -->
            <div v-if="showName"
              class="speaker-name text-[4vh] mb-1 absolute bottom-25.2vh iconfont2 bg-black/50 px-2vw rounded-1 py-1vh left-0"
              :style="{ color: speakerNameColor }">
              {{ displaySpeakerName }}
            </div>

            <!-- 表情 + 文本 -->
            <div class="flex flex-col gap-1 py-1vh w-full">
              <span v-html="displayedText" class="text-[5vh] iconfont2 block w-full leading-relaxed"
                style="word-break: break-word; word-wrap: break-word; white-space: pre-wrap;"></span>
            </div>
          </div>
        </div>

        <!-- 分支选项 -->
        <div v-if="finished && visibleOptions.length > 0" class="mt-2 flex flex-wrap gap-x-4.5vh gap-y-2.5vh pb-2.5vh">
          <!-- <el-button v-for="(opt, i) in visibleOptions" size="small" :key="i" type="primary"
            @click.stop="handleChooseOption(i)">{{ opt.text }}</el-button> -->
          <div class="option-btn iconfont2 px-2.5vh py-1.2vh text-3.5vh rounded"
            :class="{ 'option-disabled': opt.disabled }" v-for="(opt, i) in visibleOptions" :key="i"
            :style="optionBtnStyle(opt)" @click.stop="handleChooseOption(i, opt)">
            {{ replacePlayerName(opt.text) }}<span v-if="opt.needItem" class="option-need">（{{ L('need') }}：{{ formatItemRequirement(opt) }}）</span><span v-if="opt.needAffection" class="option-need">（{{ L('need') }}：{{ formatAffectionRequirement(opt) }}）</span>
          </div>
        </div>
      </div>

      <!-- 尾随箭头 -->
      <div v-if="finished && canClick && visibleOptions.length === 0 && !isEndNode(currentDialogue?.end)"
        class="absolute bottom-2 right-[5%]">
        <el-icon class="next-icon" color="white">
          <CaretBottom />
        </el-icon>
      </div>

    </div>
  </div>

  <!-- 快进按钮（屏幕右上角固定位置） -->
  <div v-show="isDialogueActive" @click.stop="toggleFastForward"
    class="fixed top-2vh right-6vw p-2vh z-[200] cursor-pointer  rounded-full transition-all shadow-lg flex items-center justify-center w-7vh h-7vh"
    :class="isFastForwarding ? 'bg-yellow-500/90 text-black hover:bg-yellow-400' : 'bg-black/60 text-white hover:bg-black/80'"
    :title="L('fastForward')">
    <svg v-if="!isFastForwarding" xmlns="http://www.w3.org/2000/svg" width="6vh" height="6vh" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="13 19 22 12 13 5 13 19"></polygon>
      <polygon points="2 19 11 12 2 5 2 19"></polygon>
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="6vh" height="6vh" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from "vue";
import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import { t as i18nT, tr as i18nTr } from "@/i18n";
import {
  currentDialogue,
  startDialogue,
  goToDialogue,
  chooseOption,
  endDialogue,
  getDialogueText,
  allDialogues,
  getVisibleOptions,
  isDialogueActive,
  isEndNode,
  // 音频
  playClickSound,
  // CG 相关
  isCgVisible,
  currentCgName,
  currentCgAnimation,
  currentCgLoop,
  currentCgSkin,
  currentCgShowAvatar,
  showCg,
  hideCg,
  // 头像动画相关
  currentNpcAvatarAnimation,
  currentPlayerAvatarAnimation,
  currentPlayerAvatar,
  // 头像皮肤相关
  currentPlayerSkin,
  currentNpcSkin,
} from "./dialogue/index.js";

// PixiJS 和 Spine
import { Application, Container, Assets } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { AdjustmentFilter } from "pixi-filters";
import emitter from "@/bus";
import { findFirstMatchable } from "./dialogue/condition.js";
const user = useCounterStore();

// 🌐 i18n：响应式取词（监听语言切换事件刷新）
const langVersion = ref(0);
function L(key) {
  langVersion.value;
  return i18nT(key);
}
window.addEventListener("fvnyouxi-lang-changed", () => langVersion.value++);


// 是否显示姓名（旁白/系统不显示）
const showName = computed(() => {
  if (!currentSpeakerName.value) return false;
  const name = currentSpeakerName.value;
  // 系统、旁白不显示姓名
  if (name === '系统' || name === '旁白' || name === '') return false;
  return true;
});

// 说话者姓名颜色映射（按人物显示不同文字颜色，未列出的默认白色）
const SPEAKER_COLORS = {
  '白朔': '#9fdbf9',
  '林恩': '#fd8177',
  '西亚': '#ebb7a9',
  '晨曦': '#fcefc5',
  '黑米': '#ebb7a9',
  '云弥': '#93baff',
  '风息': '#ebb7a9',
};

// 当前说话者姓名的文字颜色
const speakerNameColor = computed(() => {
  const name = currentSpeakerName.value;
  return SPEAKER_COLORS[name] || '#ffffff';
});

// 是否为全屏黑屏白字模式
const isBlackScreenMode = computed(() => {
  return currentDialogue.value?.blackScreen === true;
});

// 是否为隐藏UI模式（只显示CG，隐藏对话框）
const isHideUiMode = computed(() => {
  return currentDialogue.value?.hideUI === true && isDialogueActive.value;
});

// 播放时不显示对话框的CG名单（过渡动画类CG，如昼夜变化，播放时隐藏对话框；其他剧情CG正常显示对话框）
const CG_WITHOUT_DIALOG = new Set(['taiyangyueliang']);

// 当前CG是否需要隐藏对话框（CG显示中 且 当前CG属于无对话框类型时才隐藏；普通CG仍显示对话框）
const isCgWithoutDialog = computed(() => {
  return isCgVisible.value && CG_WITHOUT_DIALOG.has(currentCgName.value);
});

// ========================
// CG 相关
// ========================
const cgContainer = ref(null);
const cgCanvas = ref(null);

// PixiJS 应用和 CG spine 实例
let cgApp = null;
let cgSpine = null;
let cgSpinePrev = null;      // 换肤时的旧层 Spine（交叉淡化期间保留，淡出完成后销毁）
let cgContainerPixi = null;
let cgResizeRafId = null; // CG resize RAF ID，用于取消未完成的动画帧
let cgFadeRafId = null;   // 换肤交叉淡化 RAF ID，用于取消未完成的淡化动画
let cgLoadedAssets = []; // 记录当前 CG 加载的资源名称，用于卸载
let lastAppliedCgAnimation = null; // 追踪上次已应用的 CG 动画名称，避免每段对话都重新播放
let lastAppliedCgSkin = null; // 追踪上次已应用的 CG 皮肤名称，皮肤变化时重新加载 Spine

// 🎬 CG 标记点暂停：Spine 动画时间轴放一个 Event（默认名 'pause'）→ 播放到该标记点暂停，点击画面继续
const CG_PAUSE_EVENT = 'pause';
const cgPaused = ref(false); // 当前是否处于标记点暂停
let cgPausedEntry = null;    // 被暂停的 trackEntry（恢复时 timeScale=1）
let pendingCgRestart = false; // 🎬 cgRestart 等待当前动画播完后再重建（快速点击保护，防止跳过后续段落）
let cgAnimCompleted = false;  // 🎬 当前非循环 CG 动画是否已播完（complete 事件触发）

// 头像相关追踪变量（避免每段对话都重复调用，只在值真正变化时才执行）
let lastAppliedNpcAnim = null;
let lastAppliedPlayerAnim = null;
let lastAppliedPlayerChar = 'zhujue';
let lastAppliedPlayerSkin = null;
let lastAppliedNpcSkin = null;

// ========================
// 头像 Spine 相关
// ========================
let playerAvatarApp = null;
let playerAvatarSpine = null;
let playerAvatarContainer = null;
let playerAlphaFilter = null;      // 玩家头像透明度滤镜（用于过渡动画）
let playerGrayscaleFilter = null;  // 玩家头像灰度滤镜（非说话时变灰）
let playerAvatarResizeRafId = null; // 玩家头像 resize RAF ID
let lastPlayerAvatarChar = 'zhujue'; // 上一次玩家头像角色名，用于切换时卸载旧纹理

let npcAvatarApp = null;
let npcAvatarMainContainer = null; // NPC头像主容器（所有NPC头像都放在这里）
// NPC 头像 Map：key = NPC名称，value = 头像对象
// 每个头像对象：{ spine, container, alphaFilter, grayscaleFilter, scale, visible, actualWidth, actualHeight }
const npcAvatarMap = new Map();
// 🛡️ 创建中 Promise 缓存：防止并发调用（如 onStage 展示与 avatarFx 同时触发）重复创建头像框
const _npcAvatarCreating = new Map();
let currentNpcAvatarName = null; // 当前说话的NPC头像名称
const onStageNpcList = ref([]); // 在场的NPC名称列表（按显示顺序，最右边的在前）
const currentSpeakerName = ref(''); // 当前显示的说话者姓名（沿用上次的逻辑）

// 🎭 把对话文本里的“林恩”替换为玩家自定义姓名（数据层保留“林恩”标识用于逻辑判断，仅显示层替换）
function replacePlayerName(t) {
  if (!t) return t;
  const name = user.playerName;
  if (name === '林恩') return t;
  return String(t).split('林恩').join(name);
}

// 说话者姓名的展示名：林恩 → 自定义玩家名（颜色映射仍用原始名查询）；英文模式下其他角色名 → 拼音
const displaySpeakerName = computed(() => {
  const n = currentSpeakerName.value;
  if (n === '林恩') return user.playerName;
  return i18nTr(n) || n;
});

/**
 * 初始化 CG PixiJS 应用
 */
async function initCgApp() {
  if (cgApp) return;

  if (!cgCanvas.value) {
    console.error('[对话组件] cgCanvas不存在');
    return;
  }

  try {
    // 直接计算16:9尺寸（和CSS一致，不依赖getBoundingClientRect，因为v-show隐藏时尺寸为0）
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let canvasWidth, canvasHeight;

    if (screenWidth / screenHeight > 16 / 9) {
      // 屏幕更宽，以高度为准
      canvasHeight = screenHeight;
      canvasWidth = canvasHeight * 16 / 9;
    } else {
      // 屏幕更高，以宽度为准
      canvasWidth = screenWidth;
      canvasHeight = canvasWidth * 9 / 16;
    }

    // console.log('[对话组件] CG初始化尺寸:', canvasWidth, canvasHeight);

    cgApp = new Application();
    await cgApp.init({
      canvas: cgCanvas.value,
      width: canvasWidth,
      height: canvasHeight,
      backgroundAlpha: 0,
      autoStart: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    cgContainerPixi = new Container();
    cgApp.stage.addChild(cgContainerPixi);

    // console.log('[对话组件] CG PixiJS 应用初始化完成');
  } catch (e) {
    console.error('[对话组件] CG PixiJS 应用初始化失败:', e);
  }
}

/**
 * 智能查找皮肤（支持 Spine 编辑器「皮肤文件夹」前缀，如 pifu1/one05、pifu2/one05）
 * - 查找顺序：
 *   1. 精确匹配完整名称（支持直接写 "pifu1/one05"，也支持无文件夹前缀 "one05"）
 *   2. 若未命中，再按「以 /皮肤名 结尾」在所有皮肤中模糊匹配
 * - 多文件夹同名处理：如果 pifu1/one05 和 pifu2/one05 同时存在，
 *   模糊匹配无法区分，会返回 null 并打印警告 → 请改用完整名称 cgSkin: "pifu1/one05"
 * @param {object} skeleton - Spine 骨架
 * @param {string} skinName - 要查找的皮肤名
 * @returns {object|null} 皮肤对象（找不到返回 null）
 */
function findCgSkin(skeleton, skinName) {
  if (!skinName) return null;
  // 1. 精确匹配（皮肤名可能是 "one05" 或完整 "pifu1/one05"）
  if (skeleton.data.findSkin?.(skinName)) {
    return skeleton.data.findSkin(skinName);
  }
  // 2. 模糊匹配：在所有皮肤里找「以 /皮肤名 结尾」的
  const skins = skeleton.data.skins || [];
  const matches = skins.filter(s => s.name === skinName || s.name.endsWith('/' + skinName));
  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length > 1) {
    // 多个文件夹里有同名皮肤，无法确定用哪个 → 提示写全名
    console.warn(
      `[对话组件] 皮肤 "${skinName}" 在多个文件夹中都存在：`,
      matches.map(s => s.name),
      '，请改用完整名称，如 cgSkin: "pifu1/' + skinName + '"'
    );
  }
  return null;
}

/**
 * 显示 CG
 */
async function showCgSpine() {
  const cgName = currentCgName.value;
  if (!cgName || !cgApp) return;

  // 🎬 重建即重置等待标志：不再等待旧动画，新动画从头开始
  pendingCgRestart = false;
  cgAnimCompleted = false;

  // 先销毁旧的
  destroyCgSpine();

  try {
    const skelName = `${cgName}_skel`;
    const atlasName = `${cgName}_atlas`;
    // 记录已加载的资源名称，便于销毁时卸载
    cgLoadedAssets = [skelName, atlasName];

    // 创建 Spine 实例
    cgSpine = new Spine({
      skeleton: skelName,
      atlas: atlasName,
      allowMissingRegions: true,
    });

    if (!cgSpine) {
      console.error('[对话组件] CG Spine 创建失败');
      return;
    }

    // ===== 应用 CG 皮肤（cgSkin: 有指定就用指定，没指定用默认/第一个皮肤）=====
    try {
      const cgSkeleton = cgSpine.skeleton;
      const cgSkins = cgSkeleton.data.skins || [];
      const cgSkinName = currentCgSkin.value;
      // 支持 Spine 编辑器皮肤文件夹（如 pifu1/one05）：先精确匹配，失败再模糊匹配
      const targetSkin = findCgSkin(cgSkeleton, cgSkinName);
      if (cgSkinName && targetSkin) {
        // 指定了皮肤且存在 → 用指定的（直接传皮肤对象，含文件夹前缀也能应用）
        cgSkeleton.setSkin(targetSkin);
      } else if (cgSkins.length > 0) {
        // 没指定 → 用默认皮肤（default），没有 default 就用第一个非 default 皮肤
        const defaultSkin = cgSkins.find(s => s.name === 'default') || cgSkins.find(s => s.name !== 'default') || cgSkins[0];
        cgSkeleton.setSkin(defaultSkin);
      }
      // 注意：spine-core 4.3.x 里方法名是 setupPose（不是 setToSetupPose），
      // 用错名字会静默失败导致换肤后旧皮肤附件残留，必须用 setupPose 重置骨骼+插槽
      cgSkeleton.setupPose();
      cgSpine.state.apply?.(cgSkeleton);
      lastAppliedCgSkin = currentCgSkin.value || null; // 记录已应用的皮肤，避免重复触发
    } catch (e) {
      console.warn('[对话组件] CG 皮肤应用失败（使用默认）:', e);
    }

    // 获取可用动画列表
    const animations = cgSpine.skeleton.data.animations;
    let animName = currentCgAnimation.value;

    // 如果没有指定动画，播放第一个
    if (!animName && animations && animations.length > 0) {
      animName = animations[0].name;
    }

    // 播放动画（默认不循环，cgLoop=true 时循环播放）
    if (animName) {
      lastAppliedCgAnimation = animName; // 记录作为当前已应用的动画，防止后续对话重复触发
      const shouldLoop = currentCgLoop.value === true;
      const trackEntry = cgSpine.state.setAnimation(0, animName, !shouldLoop);
      trackEntry.loop = shouldLoop;
      resetCgPause();
      // 🎬 标记点暂停：无论是否循环都挂 pause 事件监听（循环动画每次到标记点都会暂停）；
      //    非循环时保留原 complete 回调
      attachCgPauseListener(trackEntry, !shouldLoop ? () => {
            // 如果是昼夜变化CG，播放完毕后自动关闭对话框
            if (currentCgName.value === 'taiyangyueliang') {
              const timerId = setTimeout(() => {
                // ⚠️ 清除残留的 autoNext 定时器：若 CG 比 autoNext 的延迟更早结束，
                //    旧的 autoNext 会在 dayCgTrigger 已复位后误触发 endDialogue/hideDialogue，
                //    导致后续对话被误关闭或 duihua 被提前置 false
                if (autoNextTimer) {
                  clearTimeout(autoNextTimer);
                  autoNextTimer = null;
                }
                // 🔥 设置玩家位置（昼夜CG播放完毕后传送到指定X位置）
                emitter.emit('movePlayerTo', {
                  xPercent: 0.6,        // 0~1，地图宽度百分比
                  direction: -1,        // 朝向：1=右, -1=左
                });
                hideCg();
                // 🔥 只有当前没有正在播放的对话时才关闭对话框
                // （否则休息后触发的对话会被CG结束逻辑隐藏，导致对话框一直显示不出来）
                // user.resetDialogueProgress('hd01');
                user.pixi.dayCgTrigger = false;
                // 💾 昼夜动画播放完毕 → 触发保存（matter.vue 监听 dayCgFinished 执行存档）
                emitter.emit('dayCgFinished');
                // 按优先级从高到低排列，前面优先触发
                // 每个条目可写条件：needNpc / ifDayGte / ifCompletedToday / ifNotCompleted /
                // ifCompleted / ifAnyCompleted / ifDayEqualsFlag / ifDaysSinceFlag
                // 以及 ifFlag / ifNotFlag（判断 setDialogueFlag 存的布尔标记）
                // 以及 needItem（背包检测）/ needAffection（NPC好感度检测）
                // ⚔️ 普通模式与剧情模式各自维护休息（昼夜CG）后的剧情对话列表，按优先级从高到低触发
                //    普通模式暂未写剧情：列表留空，后续直接往下方数组里按优先级添加即可
                const dialogueList = user.pixi?.gameMode === 'normal'
                  ? [
                      // 🌙 首次休息触发 hd01（睡醒争执剧情）：未完成才触发，完成后不再触发
                      // { id: 'hd01', loadData: 'npc/jingling' },
                      // TODO: 普通模式更多休息后的每日剧情（按优先级从高到低在此添加）
                    ]
                  : [
                  { id: 'hd01', loadData: 'npc/jingling' },
                  { id: 'hd350', loadData: 'npc/jingling', needNpc: 'tuzi', ifDaysSinceFlag: { flag: 'heimiJoinDay', min: 2 } },
                  // 天数 ≥ 5 → 强制触发 dayo400（夜袭/强制战斗剧情）
                  { id: 'dayo01', needNpc: 'tuzi', loadData: 'npc/jingling', ifDayGte: 6, ifCompleted: "jqZ200", ifNotCompleted: "dayo400" },
                  { id: 'dayo400', loadData: 'npc/jingling', ifDayGte: 6, ifCompleted: "jqZ200", ifNotCompleted: "dayo01" },
                  // 🎬 幕12守城夜完成后：每次休息提示「游戏待续」（主线暂告一段落，仍正常进入下一天）
                  { id: 'cdSgContinue', loadData: 'npc/forest-deep', ifCompleted: 'cdSgEnd' },
                ];
                // 找到第一个满足条件的对话（条件判断与问号路由共用 condition.js）
                const pendingDialogue = findFirstMatchable(dialogueList, { checkCompleteKey: 'id' });
                if (pendingDialogue) {
                  emitter.emit("talkToNpc", {
                    loadData: pendingDialogue.loadData,
                    name: pendingDialogue.id
                  });
                  return;
                }
                // 🔥 昼夜CG播放完毕且无后续对话：关闭对话框
                // 注意：此时 dayCgTrigger 已复位为 false，endDialogue 内部不会再触发 hideCg
                //（hideCg 上面已调用过，避免重复销毁 Spine）
                endDialogue();
                user.hideDialogue();
              }, 500); // 延迟500ms关闭，让用户看完最后一帧
              // 将 timerId 存到 trackEntry 上，便于清理时取消
              trackEntry._cgCloseTimer = timerId;
            }
          }
        : null);
    }

    // ⭐⭐⭐ 首帧防抖：先把 CG 设为透明（alpha=0），等 bounds 有效并完成 resize
    //    后再显示，避免"首次加载"时 Spine 以默认 scale=1 / 位置(0,0) 渲染一帧、
    //    随后 snap 到正确尺寸造成抖动。换肤走 changeCgSkin（复制旧层变换），已无此问题。
    cgSpine.alpha = 0;

    // ⭐⭐⭐ 关键：手动把动画应用一次（推进到第 0 帧姿态），
    //    否则 getBounds() 拿到的是 setup pose（初始姿势）的边界，
    //    与动画第 0 帧实际姿态不同 → 缩放/位置算偏 → 一播放就抖一格
    try {
      cgSpine.state.update(0);
      cgSpine.state.apply?.(cgSpine.skeleton);
      cgSpine.skeleton.updateWorldTransform();
    } catch (e) { /* 忽略手动更新失败 */ }

    // 尝试同步计算 bounds 并缩放：若资源已就绪，首帧即为正确尺寸，不抖动
    let cgResizedSync = false;
    try {
      const initialBounds = cgSpine.getBounds();
      if (initialBounds.width > 0 && initialBounds.height > 0) {
        resizeCgSpine();
        cgSpine.alpha = 1;
        cgResizedSync = true;
      }
    } catch (e) { /* 同步缩放失败则走 RAF 重试 */ }

    // 添加到容器
    cgContainerPixi.addChild(cgSpine);

    // 🐛 调试：挂到 window 供外部读取
    window.__cgSpine = cgSpine;
    window.__cgApp = cgApp;

    // 取消上一次可能还在运行的 resize RAF
    if (cgResizeRafId) {
      cancelAnimationFrame(cgResizeRafId);
      cgResizeRafId = null;
    }

    // 同步已成功 → 无需异步重试
    if (cgResizedSync) return;

    // 等待Spine初始化完成，多帧重试直到bounds有效
    let retryCount = 0;
    const tryResize = () => {
      if (!cgSpine) return; // 组件已卸载或Spine已销毁，停止重试
      const bounds = cgSpine.getBounds();
      if (bounds.width > 0 && bounds.height > 0) {
        resizeCgSpine();
        cgSpine.alpha = 1; // ⭐ resize 完成后再显示，避免首帧错误变换
        // console.log('[对话组件] CG resize成功', bounds.width, bounds.height);
        cgResizeRafId = null;
      } else if (retryCount < 10) {
        retryCount++;
        cgResizeRafId = requestAnimationFrame(tryResize);
      } else {
        console.warn('[对话组件] CG bounds获取失败，使用默认缩放');
        // 默认缩放
        cgSpine.scale.set(1);
        cgSpine.x = cgApp.renderer.width / 2;
        cgSpine.y = cgApp.renderer.height / 2;
        cgSpine.alpha = 1; // 兜底：也恢复显示
        cgResizeRafId = null;
      }
    };
    cgResizeRafId = requestAnimationFrame(tryResize);

    //console.log(`[对话组件] CG 显示: ${cgName}, 动画: ${animName}`);
  } catch (e) {
    console.error('[对话组件] CG 显示失败:', e);
  }
}

/**
 * 调整 CG 大小，contain 模式（完整显示，不裁剪 Spine 边缘）
 * @param {object|null} spine - 要调整的 Spine 实例（默认 cgSpine）
 */
function resizeCgSpine(spine = cgSpine) {
  if (!spine || !cgApp) return;

  const canvasWidth = cgApp.renderer.width;
  const canvasHeight = cgApp.renderer.height;

  // 获取 spine 原始尺寸
  const bounds = spine.getBounds();
  const spineWidth = bounds.width;
  const spineHeight = bounds.height;

  // console.log('[对话组件] CG resize:', { canvasWidth, canvasHeight, spineWidth, spineHeight, bounds });

  if (spineWidth === 0 || spineHeight === 0) return;

  // contain模式：取较小的缩放比例，完整显示 Spine 不裁剪（画布内空隙透出背景）
  const scaleX = canvasWidth / spineWidth;
  const scaleY = canvasHeight / spineHeight;
  const scale = Math.min(scaleX, scaleY);

  spine.scale.set(scale);

  // 居中
  spine.x = canvasWidth / 2 - bounds.x * scale - spineWidth * scale / 2;
  spine.y = canvasHeight / 2 - bounds.y * scale - spineHeight * scale / 2;
}

/**
 * 🎬 给 CG 动画挂「标记点暂停」监听
 * Spine 时间轴放一个 Event（默认名 'pause'）→ 播放到该标记点时暂停（timeScale=0），点击画面继续
 * @param {object} trackEntry - state.setAnimation 返回的轨道
 * @param {Function|null} onComplete - 非循环播完回调（循环动画传 null）
 */
function attachCgPauseListener(trackEntry, onComplete) {
  if (!trackEntry) return;
  const prev = trackEntry.listener || {};
  trackEntry.listener = {
    ...prev,
    complete: (entry) => {
      // 📌 记录非循环动画已播完（供 cgRestart 等待逻辑判断）
      cgAnimCompleted = true;
      // 保留原有 complete 回调（prev.complete 优先，其次本次传入的 onComplete）
      if (prev.complete) prev.complete(entry);
      else if (onComplete) onComplete(entry);
      // 🎬 等待中的 cgRestart：动画播完 → 执行重建（切皮肤/从头重播）
      //    微任务延迟：避免在 Spine state.update 派发 complete 的调用栈内销毁当前动画对象
      if (pendingCgRestart) {
        pendingCgRestart = false;
        queueMicrotask(() => {
          if (isCgVisible.value) showCgSpine();
        });
      }
    },
    event: (entry, event) => {
      // 播放到标记点（Spine Event）→ 暂停该轨道
      if (event?.data?.name === CG_PAUSE_EVENT) {
        // 🎬 cgRestart 等待期间暂停点失效：让动画一路播完再切换皮肤，
        //    避免快速点击时还没播到后续段落就重建导致内容丢失
        if (pendingCgRestart) return;
        cgPaused.value = true;
        cgPausedEntry = entry;
        entry.timeScale = 0;
      }
    },
  };
}

/** 🎬 恢复被标记点暂停的 CG（点击画面触发） */
function resumeCg() {
  if (!cgPaused.value) return;
  if (cgPausedEntry) cgPausedEntry.timeScale = 1;
  cgPausedEntry = null;
  cgPaused.value = false;
}

/** 🎬 重置暂停状态（重建/切换/销毁 CG 时调用，避免残留暂停） */
function resetCgPause() {
  cgPaused.value = false;
  cgPausedEntry = null;
}

/**
 * 切换 CG 动画
 */
function changeCgAnimation() {
  if (!cgSpine || !currentCgAnimation.value) return;

  try {
    resetCgPause();
    pendingCgRestart = false; // 手动切换动画，取消可能挂起的 cgRestart 等待
    cgAnimCompleted = false;
    const shouldLoop = currentCgLoop.value === true;
    const trackEntry = cgSpine.state.setAnimation(0, currentCgAnimation.value, !shouldLoop);
    trackEntry.loop = shouldLoop;
    // 🎬 标记点暂停：切换动画也挂监听
    attachCgPauseListener(trackEntry);
    //  console.log(`[对话组件] CG 动画切换: ${currentCgAnimation.value}`);
  } catch (e) {
    console.error('[对话组件] CG 动画切换失败:', e);
  }
}

/**
 * 切换 CG 皮肤（交叉淡化：旧皮肤画面逐渐透明淡出，新皮肤画面逐渐淡入）
 * 通过双 Spine 叠加实现：保留旧层（cgSpinePrev）+ 新建新层（cgSpine，从动画开头播放新皮肤）
 */
function changeCgSkin() {
  if (!cgSpine || !cgApp || !cgContainerPixi) return;

  // 取消上一次未完成的淡化动画
  if (cgFadeRafId) {
    cancelAnimationFrame(cgFadeRafId);
    cgFadeRafId = null;
  }
  // 清理上一次残留的旧层（正常结束后会置空，这里兜底防止叠加）
  if (cgSpinePrev) {
    try {
      if (cgSpinePrev.parent) cgSpinePrev.parent.removeChild(cgSpinePrev);
      cgSpinePrev.destroy({ children: true, texture: false });
    } catch (e) { /* 忽略清理错误 */ }
    cgSpinePrev = null;
  }

  const cgName = currentCgName.value;
  if (!cgName) return;

  // 保存当前 Spine 引用（用于失败时恢复）
  const prevSpine = cgSpine;

  let newSpine = null;
  try {
    // 1. 创建新 Spine（同一 CG 资源，应用新皮肤）
    const skelName = `${cgName}_skel`;
    const atlasName = `${cgName}_atlas`;
    newSpine = new Spine({ skeleton: skelName, atlas: atlasName, allowMissingRegions: true });

    // 应用新皮肤
    const cgSkeleton = newSpine.skeleton;
    const cgSkins = cgSkeleton.data.skins || [];
    const cgSkinName = currentCgSkin.value;
    // 支持 Spine 编辑器皮肤文件夹（如 pifu1/one05）：先精确匹配，失败再模糊匹配
    const targetSkin = findCgSkin(cgSkeleton, cgSkinName);
    if (cgSkinName && targetSkin) {
      // 指定了皮肤且存在 → 用指定的（直接传皮肤对象，含文件夹前缀也能应用）
      cgSkeleton.setSkin(targetSkin);
    } else if (cgSkins.length > 0) {
      // 没指定 → 用默认皮肤（default），没有 default 就用第一个非 default 皮肤
      const defaultSkin = cgSkins.find(s => s.name === 'default') || cgSkins.find(s => s.name !== 'default') || cgSkins[0];
      cgSkeleton.setSkin(defaultSkin);
    }
    // 注意：spine-core 4.3.x 里方法名是 setupPose（不是 setToSetupPose），
    // 用错名字会静默失败导致换肤后旧皮肤附件残留，必须用 setupPose 重置骨骼+插槽
    cgSkeleton.setupPose();

    // 播放当前动画（新皮肤从动画开头开始播放）
    let animName = currentCgAnimation.value;
    if (!animName && newSpine.skeleton.data.animations?.length > 0) {
      animName = newSpine.skeleton.data.animations[0].name;
    }
    if (animName) {
      const shouldLoop = currentCgLoop.value === true;
      const trackEntry = newSpine.state.setAnimation(0, animName, !shouldLoop);
      trackEntry.loop = shouldLoop;
      pendingCgRestart = false; // 换肤重播，取消可能挂起的 cgRestart 等待
      cgAnimCompleted = false;
      // ⭐ mixDuration=0：新层直接以新皮肤姿态显示，不做新旧混合
      trackEntry.mixDuration = 0;
      // 🎬 标记点暂停：换肤重播也挂监听
      attachCgPauseListener(trackEntry);
      // ⭐⭐ 同步动画进度：让新层从旧层当前动画时间继续播放，
      //    保证切换瞬间新旧两层骨骼姿态完全一致（避免淡化时画面偏移）
      const oldTrack = prevSpine?.state?.tracks?.[0];
      if (oldTrack && oldTrack.animation?.name === animName && oldTrack.trackTime !== undefined) {
        // 🎨 旧层动画已播完（complete 定格）时，新层从头播放：否则换肤后瞬间定格在同一最后一帧，
        //    皮肤差异（如 cg1/cg2）根本看不出来，看起来像"没换肤"
        const dur = oldTrack.animation.duration || 0;
        trackEntry.trackTime = (dur > 0 && oldTrack.trackTime >= dur) ? 0 : oldTrack.trackTime;
      }
    }
    // ⭐⭐⭐ 关键：立即手动应用一次动画姿态（update→apply→updateWorldTransform），
    //    否则新层加入渲染树后要等下一帧 ticker 才会更新骨骼，
    //    在 startFade 启动瞬间新层仍停留在 setupPose 初始姿态，导致画面偏移一帧/一格
    try {
      newSpine.state.update(0);
      newSpine.state.apply?.(newSpine.skeleton);
      newSpine.skeleton.updateWorldTransform();
    } catch (e) { /* 忽略手动更新失败 */ }
  } catch (e) {
    console.error('[对话组件] CG 皮肤切换失败:', e);
    // 新层创建失败，保持当前 Spine 不变
    if (newSpine) {
      try { newSpine.destroy({ children: true, texture: false }); } catch (err) { /* 忽略 */ }
    }
    return;
  }

  // 2. 新层创建成功：把当前 Spine 留作旧层（保持原进度继续播放，用于淡出）
  cgSpinePrev = prevSpine;
  cgSpinePrev.alpha = 1;

  // 3. 新层初始透明，叠加在旧层上方
  newSpine.alpha = 0;
  cgContainerPixi.addChild(newSpine);
  cgSpine = newSpine;

  // 新层就绪后自动缩放（Spine 初始化需几帧，bounds 有效后再缩放）
  let retryCount = 0;
  const tryResize = () => {
    if (!cgSpine) return;
    // ⭐ 新旧层是同一个 CG 资源（仅皮肤不同），直接复制旧层变换，
    //    避免因新旧层处于不同动画帧、bounds 不同导致淡化时画面轻微位移
    if (cgSpinePrev && cgSpinePrev.scale.x > 0) {
      cgSpine.scale.set(cgSpinePrev.scale.x, cgSpinePrev.scale.y);
      cgSpine.x = cgSpinePrev.x;
      cgSpine.y = cgSpinePrev.y;
      startFade();
      return;
    }
    // 旧层变换不可用时（首次显示），退回按 bounds 自适应
    const bounds = cgSpine.getBounds();
    if (bounds.width > 0 && bounds.height > 0) {
      resizeCgSpine();
      startFade();
    } else if (retryCount < 10) {
      retryCount++;
      requestAnimationFrame(tryResize);
    } else {
      resizeCgSpine();
      startFade();
    }
  };

  // 4. 交叉淡化（RAF 逐帧调整两层的 alpha）
  const fadeDuration = 500; // 淡化时长（毫秒），可按需调整
  const startFade = () => {
    const startTime = performance.now();
    const step = () => {
      if (!cgSpinePrev || !cgSpine) { cgFadeRafId = null; return; }
      const t = Math.min(1, (performance.now() - startTime) / fadeDuration);
      cgSpinePrev.alpha = 1 - t; // 旧层淡出
      cgSpine.alpha = t;          // 新层淡入
      if (t < 1) {
        cgFadeRafId = requestAnimationFrame(step);
      } else {
        cgFadeRafId = null;
        // 淡化完成，销毁旧层
        const old = cgSpinePrev;
        cgSpinePrev = null;
        if (old) {
          try {
            if (old.parent) old.parent.removeChild(old);
            old.destroy({ children: true, texture: false });
          } catch (e) { /* 忽略清理错误 */ }
        }
      }
    };
    cgFadeRafId = requestAnimationFrame(step);
    // console.log(`[对话组件] CG 皮肤切换: ${currentCgSkin.value}（交叉淡化）`);
  };

  // 启动：等新层就绪后缩放并开始淡化
  requestAnimationFrame(tryResize);
}

/**
 * 销毁 CG spine
 */
function destroyCgSpine() {
  // 🎬 标记点暂停状态一并清除
  resetCgPause();
  pendingCgRestart = false; // 销毁即取消挂起的 cgRestart 等待
  cgAnimCompleted = false;
  // 取消 CG resize RAF（防止回调中访问已销毁的 cgSpine）
  if (cgResizeRafId) {
    cancelAnimationFrame(cgResizeRafId);
    cgResizeRafId = null;
  }
  // 取消换肤交叉淡化 RAF（防止回调中访问已销毁的 Spine）
  if (cgFadeRafId) {
    cancelAnimationFrame(cgFadeRafId);
    cgFadeRafId = null;
  }

  if (cgSpine && cgContainerPixi) {
    try {
      // 清理 trackEntry 上的定时器
      const tracks = cgSpine.state.tracks;
      if (tracks) {
        for (const entry of tracks) {
          if (entry?._cgCloseTimer) {
            clearTimeout(entry._cgCloseTimer);
            entry._cgCloseTimer = null;
          }
          // 清除 listener 引用
          if (entry?.listener) {
            entry.listener = null;
          }
        }
      }

      cgContainerPixi.removeChild(cgSpine);
      cgSpine.destroy({
        children: true,
        texture: false
      });
    } catch (e) {
      console.warn('[对话组件] CG Spine销毁警告:', e.message);
    }
    cgSpine = null;
  }

  // 同时销毁旧层 Spine（交叉淡化残留）
  if (cgSpinePrev && cgContainerPixi) {
    try {
      if (cgSpinePrev.parent) cgSpinePrev.parent.removeChild(cgSpinePrev);
      cgSpinePrev.destroy({ children: true, texture: false });
    } catch (e) {
      console.warn('[对话组件] CG 旧层Spine销毁警告:', e.message);
    }
    cgSpinePrev = null;
  }

  // 彻底卸载 CG 纹理和骨骼资源，防止内存累积
  if (cgLoadedAssets.length > 0) {
    for (const asset of cgLoadedAssets) {
      try {
        // 先检查缓存中是否存在该key，避免 PixiJS 内部 key 格式不匹配导致的警告
        if (Assets.cache.has(asset)) {
          Assets.unload(asset);
        }
      } catch (e) {
        // 忽略卸载错误
      }
    }
    cgLoadedAssets = [];
    lastAppliedCgAnimation = null; // 重置 CG 动画追踪，下次显示CG时会重新记录
    lastAppliedCgSkin = null; // 重置 CG 皮肤追踪，下次显示CG时会重新应用皮肤
  }
}

/**
 * 销毁 CG 应用
 */
function destroyCgApp() {
  // 先移除Spine
  destroyCgSpine();

  if (cgApp) {
    try {
      cgApp.ticker.stop();
      if (cgContainerPixi) {
        cgContainerPixi.removeChildren();
        cgApp.stage.removeChild(cgContainerPixi);
        cgContainerPixi.destroy({ children: true });
      }
      cgApp.destroy({ children: true, texture: true, textureSource: true, releaseGlobalResources: false });
    } catch (e) {
      console.warn('[对话组件] CG App销毁警告:', e.message);
    }
    cgApp = null;
    cgContainerPixi = null;
  }
}

// ========================
// 头像 Spine 相关函数
// ========================

/**
 * 确保资源已加载：已缓存的资源直接跳过，避免重复调用 Assets.load
 * 重复加载同一资源会触发 PixiJS 警告 `[Cache] already has key: xxx`
 * （立绘头像资源已随 map_01 bundle 在启动时加载，这里通常都能命中缓存）
 * @param {string[]} keys - 资源别名数组（如 ['zhujuehead_skel', 'zhujuehead_atlas']）
 */
async function ensureAssetsLoaded(keys) {
  const missing = keys.filter(k => !Assets.cache.has(k));
  if (missing.length > 0) {
    await Assets.load(missing);
  }
}

/**
 * 初始化玩家头像 PixiJS 应用和 Spine
 */
async function initPlayerAvatar() {
  if (playerAvatarApp) return;
  if (!playerAvatarCanvas.value) return;

  try {
    const VH = window.innerHeight / 100;
    const width = 40 * VH;
    const height = 50 * VH;

    playerAvatarApp = new Application();
    await playerAvatarApp.init({
      canvas: playerAvatarCanvas.value,
      width: width,
      height: height,
      backgroundAlpha: 0,
      autoStart: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    playerAvatarContainer = new Container();
    playerAvatarApp.stage.addChild(playerAvatarContainer);

    // 创建透明度滤镜（用于过渡动画，初始完全透明）
    playerAlphaFilter = new AdjustmentFilter({ alpha: 0 });
    playerAlphaFilter.resolution = playerAvatarApp.renderer.resolution;

    // 创建灰度滤镜（用于非说话时变灰，初始正常颜色）
    playerGrayscaleFilter = new AdjustmentFilter({ saturation: 1 });
    playerGrayscaleFilter.resolution = playerAvatarApp.renderer.resolution;

    // 应用滤镜到容器
    playerAvatarContainer.filters = [playerAlphaFilter, playerGrayscaleFilter];

    // 先确保资源加载完成（已缓存则跳过，避免重复加载警告）
    await ensureAssetsLoaded(['zhujuehead_skel', 'zhujuehead_atlas']);

    // 创建主角头像 spine
    playerAvatarSpine = new Spine({
      skeleton: 'zhujuehead_skel',
      atlas: 'zhujuehead_atlas',
      allowMissingRegions: true,
    });
    // console.log('playerAvatarSpine=', playerAvatarSpine);

    if (playerAvatarSpine) {
      playerAvatarContainer.addChild(playerAvatarSpine);

      // 设置动画混合时间（切换动画时平滑过渡，避免卡顿/花屏）
      setDefaultMixTime(playerAvatarSpine, 0.3);

      // 设置默认皮肤为 "moren"（有 moren 皮肤才设置，没有则保持默认皮肤不主动选择）
      const defaultSkin = playerAvatarSpine.skeleton.data.findSkin('moren');
      if (defaultSkin) {
        playerAvatarSpine.skeleton.setSkin(defaultSkin);
        playerAvatarSpine.skeleton.setupPoseSlots();
      }

      // 多轨道动画叠加播放
      const animations = playerAvatarSpine.skeleton.data.animations;
      if (animations && animations.length > 0) {
        // Track 0: 基础动画 "animation"，一直循环播放
        const baseAnimExists = animations.some(a => a.name === 'animation');
        if (baseAnimExists) {
          playerAvatarSpine.state.setAnimation(0, 'animation', true);
        } else {
          // 没有 "animation" 就播放第一个动画作为基础
          playerAvatarSpine.state.setAnimation(0, animations[0].name, true);
        }

        // Track 1: 表情动画（叠加在基础动画上）
        const expressionAnim = currentPlayerAvatarAnimation.value;
        if (expressionAnim && expressionAnim !== 'animation') {
          const animExists = animations.some(a => a.name === expressionAnim);
          if (animExists) {
            playerAvatarSpine.state.setAnimation(1, expressionAnim, true);
          } else {
            console.warn(`[对话组件] 玩家头像表情动画不存在: ${expressionAnim}`);
          }
        }
      }

      // 等待Spine初始化完成后调整大小
      let retryCount = 0;
      const tryResize = () => {
        if (!playerAvatarSpine) return; // 组件已卸载，停止重试
        const bounds = playerAvatarSpine.getBounds();
        if (bounds.width > 0 && bounds.height > 0) {
          resizeAvatarSpine(playerAvatarApp, playerAvatarSpine);
          playerAvatarResizeRafId = null;
        } else if (retryCount < 10) {
          retryCount++;
          playerAvatarResizeRafId = requestAnimationFrame(tryResize);
        } else {
          playerAvatarResizeRafId = null;
        }
      };
      playerAvatarResizeRafId = requestAnimationFrame(tryResize);
    }


  } catch (e) {
    console.error('[对话组件] 玩家头像初始化失败:', e);
  }
}

/**
 * 切换玩家头像角色（销毁旧spine，创建新spine）
 * @param {string} charName - 角色名，如 'zhujue'、'maomi'
 */
async function changePlayerAvatarChar(charName) {
  if (!playerAvatarApp || !playerAvatarContainer) return;
  if (!charName) return;

  try {
    const spineName = `${charName}head`;
    const skelName = `${spineName}_skel`;
    const atlasName = `${spineName}_atlas`;

    // 先取消可能还在运行的 resize RAF
    if (playerAvatarResizeRafId) {
      cancelAnimationFrame(playerAvatarResizeRafId);
      playerAvatarResizeRafId = null;
    }

    // 先卸载旧的 Spine 纹理资源
    if (lastPlayerAvatarChar && lastPlayerAvatarChar !== charName) {
      const oldSpineName = `${lastPlayerAvatarChar}head`;
      const oldSkelName = `${oldSpineName}_skel`;
      const oldAtlasName = `${oldSpineName}_atlas`;
      try {
        Assets.unload(oldSkelName);
        Assets.unload(oldAtlasName);
      } catch (e) {
        // 忽略未加载资源的卸载错误
      }
    }
    // 更新追踪变量
    lastPlayerAvatarChar = charName;

    // 先销毁旧的 spine
    destroyPlayerAvatarSpine();

    // 加载新资源（已缓存则跳过，避免重复加载警告）
    await ensureAssetsLoaded([skelName, atlasName]);

    // 创建新的 spine
    playerAvatarSpine = new Spine({
      skeleton: skelName,
      atlas: atlasName,
      allowMissingRegions: true,
    });

    if (playerAvatarSpine) {
      playerAvatarContainer.addChild(playerAvatarSpine);

      // 设置动画混合时间
      setDefaultMixTime(playerAvatarSpine, 0.3);

      // 设置默认皮肤为 "moren"（有 moren 皮肤才设置，没有则保持默认皮肤不主动选择）
      const defaultSkin = playerAvatarSpine.skeleton.data.findSkin('moren');
      if (defaultSkin) {
        playerAvatarSpine.skeleton.setSkin(defaultSkin);
        playerAvatarSpine.skeleton.setupPoseSlots();
      }

      // 多轨道动画叠加播放
      const animations = playerAvatarSpine.skeleton.data.animations;
      if (animations && animations.length > 0) {
        // Track 0: 基础动画
        const baseAnimExists = animations.some(a => a.name === 'animation');
        if (baseAnimExists) {
          playerAvatarSpine.state.setAnimation(0, 'animation', true);
        } else {
          playerAvatarSpine.state.setAnimation(0, animations[0].name, true);
        }

        // Track 1: 恢复当前表情动画
        const expressionAnim = currentPlayerAvatarAnimation.value;
        if (expressionAnim && expressionAnim !== 'animation') {
          const animExists = animations.some(a => a.name === expressionAnim);
          if (animExists) {
            playerAvatarSpine.state.setAnimation(1, expressionAnim, true);
          }
        }
      }

      // 调整大小
      let retryCount = 0;
      const tryResize = () => {
        if (!playerAvatarSpine) return;
        const bounds = playerAvatarSpine.getBounds();
        if (bounds.width > 0 && bounds.height > 0) {
          resizeAvatarSpine(playerAvatarApp, playerAvatarSpine);
          playerAvatarResizeRafId = null;
        } else if (retryCount < 10) {
          retryCount++;
          playerAvatarResizeRafId = requestAnimationFrame(tryResize);
        } else {
          playerAvatarResizeRafId = null;
        }
      };
      playerAvatarResizeRafId = requestAnimationFrame(tryResize);
    }

    // console.log(`[对话组件] 玩家头像角色切换为: ${charName}`);
  } catch (e) {
    console.error('[对话组件] 玩家头像角色切换失败:', e);
  }
}

/**
 * 初始化 NPC 头像 PixiJS 应用
 */
async function initNpcAvatarApp() {
  if (npcAvatarApp) return;
  if (!npcAvatarCanvas.value) return;

  try {
    const VH = window.innerHeight / 100;
    const width = 40 * VH;
    const height = 50 * VH;

    npcAvatarApp = new Application();
    await npcAvatarApp.init({
      canvas: npcAvatarCanvas.value,
      width: width,
      height: height,
      backgroundAlpha: 0,
      autoStart: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    npcAvatarMainContainer = new Container();
    npcAvatarMainContainer.sortableChildren = true; // 开启 zIndex 排序
    npcAvatarApp.stage.addChild(npcAvatarMainContainer);


  } catch (e) {
    console.error('[对话组件] NPC头像应用初始化失败:', e);
  }
}

/**
 * 获取或创建 NPC 头像（缓存复用，避免重复创建）
 * @param {string} avatarName NPC 头像名称
 * @returns {Promise<Object>} NPC 头像对象
 */
async function getOrCreateNpcAvatar(avatarName) {
  // 如果已经创建过，直接返回
  if (npcAvatarMap.has(avatarName)) {
    return npcAvatarMap.get(avatarName);
  }
  // 🛡️ 并发保护：已有创建中的 Promise 则复用（onStage 展示与 avatarFx 可能同时触发创建，
  //    若都通过 Map 检查会各自 new 一个 Container + Spine → 出现重复头像框）
  if (_npcAvatarCreating.has(avatarName)) {
    return _npcAvatarCreating.get(avatarName);
  }

  const promise = (async () => {
    try {
      const spineName = `${avatarName}head`;
    const skelName = `${spineName}_skel`;
    const atlasName = `${spineName}_atlas`;

    // 获取当前 NPC 的头像缩放比例
    const npc = user.pixi.npcSelectList.find(n => n.img === avatarName);
    const avatarScale = npc?.avatarScale || 1;

    // 先确保资源加载完成（已缓存则跳过，避免重复加载警告）
    await ensureAssetsLoaded([skelName, atlasName]);

    // 创建子容器
    const container = new Container();
    npcAvatarMainContainer.addChild(container);

    // 创建透明度滤镜（初始完全透明，用于淡入动画）
    const alphaFilter = new AdjustmentFilter({ alpha: 0 });
    alphaFilter.resolution = npcAvatarApp.renderer.resolution;

    // 创建灰度滤镜（初始正常颜色，非说话时变灰）
    const grayscaleFilter = new AdjustmentFilter({ saturation: 1 });
    grayscaleFilter.resolution = npcAvatarApp.renderer.resolution;

    // 应用滤镜到容器
    container.filters = [alphaFilter, grayscaleFilter];

    // 先创建头像对象（spine 后续填充）
    const avatarObj = {
      name: avatarName,
      spine: null,
      container: container,
      alphaFilter: alphaFilter,
      grayscaleFilter: grayscaleFilter,
      scale: avatarScale,
      visible: false,
      actualWidth: 0,
      actualHeight: 0,
      baseZIndex: 0, // 初始层级
    };

    // 创建 Spine
    const spine = new Spine({
      skeleton: skelName,
      atlas: atlasName,
      allowMissingRegions: true,
    });

    if (spine) {
      avatarObj.spine = spine;
      container.addChild(spine);

      // 设置动画混合时间（切换动画时平滑过渡）
      setDefaultMixTime(spine, 0.3);

      // 设置默认皮肤为 "moren"（有 moren 皮肤才设置，没有则保持默认皮肤不主动选择）
      const morenSkin = spine.skeleton.data.findSkin('moren');
      if (morenSkin) {
        spine.skeleton.setSkin(morenSkin);
        spine.skeleton.setupPoseSlots();
      }

      // 多轨道动画叠加播放
      const animations = spine.skeleton.data.animations;
      if (animations && animations.length > 0) {
        // Track 0: 基础动画 "animation"，一直循环播放
        const baseAnimExists = animations.some(a => a.name === 'animation');
        if (baseAnimExists) {
          spine.state.setAnimation(0, 'animation', true);
        } else {
          // 没有 "animation" 就播放第一个动画作为基础
          spine.state.setAnimation(0, animations[0].name, true);
        }
      }

      // 等待Spine初始化完成后调整大小
      let resizeRafId = null;
      let retryCount = 0;
      const tryResize = () => {
        if (!avatarObj.spine) return;
        const bounds = spine.getBounds();
        if (bounds.width > 0 && bounds.height > 0) {
          resizeNpcAvatarSingle(avatarObj);
          layoutNpcAvatars();
          resizeRafId = null;
        } else if (retryCount < 10) {
          retryCount++;
          resizeRafId = requestAnimationFrame(tryResize);
        } else {
          resizeRafId = null;
        }
      };
      resizeRafId = requestAnimationFrame(tryResize);
      // 将RAF ID存到avatarObj上，便于销毁时取消
      avatarObj._resizeRafId = resizeRafId;
    }

    // 存入 Map
    npcAvatarMap.set(avatarName, avatarObj);
    //console.log(`[对话组件] NPC头像创建: ${avatarName}`);

    // 设置初始灰度状态（如果不是当前说话者，初始为灰色）
    const isSpeaking = currentNpcAvatarName === avatarName;
    if (!isSpeaking) {
      setNpcAvatarGrayscale(true, 0, avatarName); // 立即变灰，无动画
    }

    return avatarObj;
    } catch (e) {
      console.error(`[对话组件] NPC头像创建失败: ${avatarName}`, e);
      return null;
    }
  })();

  _npcAvatarCreating.set(avatarName, promise);
  try {
    return await promise;
  } finally {
    _npcAvatarCreating.delete(avatarName);
  }
}

/**
 * 显示指定 NPC 头像（作为当前说话者，其他在场 NPC 仍然显示但变灰）
 * 注意：不会自动添加到场，onStage 由 applyOnStageNpcList 统一管理
 * - 单角色模式：avatar 变化时由 applyOnStageNpcList 替换
 * - 多角色模式：由 onStage 字段明确指定在场列表
 * @param {string} avatarName NPC 头像名称
 */
async function showNpcAvatar(avatarName) {
  if (!npcAvatarApp || !npcAvatarMainContainer) return;

  if (!avatarName) {
    // 没有 NPC 说话，清空当前说话者（在场 NPC 仍显示但变灰）
    currentNpcAvatarName = null;
    return;
  }

  // 如果已经是当前说话的 NPC，只更新动画
  if (currentNpcAvatarName === avatarName) {
    const avatarObj = npcAvatarMap.get(avatarName);
    if (avatarObj && currentNpcAvatarAnimation.value) {
      changeNpcAvatarAnimation(currentNpcAvatarAnimation.value, avatarName);
    }
    return;
  }

  // 获取或创建 NPC 头像
  const avatarObj = await getOrCreateNpcAvatar(avatarName);
  if (!avatarObj) return;

  // 只有当 NPC 在场上时才确保可见
  // （不在场上的 NPC 不应该因为 showNpcAvatar 而突然出现）
  if (onStageNpcList.value.includes(avatarName) && !avatarObj.visible) {
    avatarObj.visible = true;
    fadeInNpcAvatar(avatarObj);
  }

  // 更新表情动画
  if (currentNpcAvatarAnimation.value) {
    changeNpcAvatarAnimation(currentNpcAvatarAnimation.value, avatarName);
  }

  currentNpcAvatarName = avatarName;

  // 重新布局
  layoutNpcAvatars();

  // 更新灰度状态
  updateAvatarGrayscaleState();

  // console.log(`[对话组件] NPC头像显示（说话者）: ${avatarName}`);
}

/**
 * 隐藏所有 NPC 头像
 */
function hideAllNpcAvatars() {
  npcAvatarMap.forEach((avatarObj) => {
    if (avatarObj.visible) {
      fadeOutNpcAvatar(avatarObj);
    }
  });
  currentNpcAvatarName = null;
}

/**
 * 应用在场 NPC 列表（内部函数，由对话数据的 onStage 字段触发）
 * @param {string[]} npcNames - NPC 名称数组，按显示顺序排列（第一个在最右边）
 * @param {string} [speakingName] - 当前说话的 NPC 名称
 */
async function applyOnStageNpcList(npcNames, speakingName = null) {
  if (!npcAvatarApp || !npcAvatarMainContainer) return;
  if (!Array.isArray(npcNames)) return;

  // console.log(`[对话组件] 应用在场NPC: ${npcNames.join(', ')}`);

  // 更新在场列表
  onStageNpcList.value = [...npcNames];

  // 根据在场顺序设置初始层级（第一个最右边，层级最高）
  npcNames.forEach((name, index) => {
    const avatarObj = npcAvatarMap.get(name);
    if (avatarObj) {
      avatarObj.baseZIndex = npcNames.length - index; // 第一个 = n, 第二个 = n-1, ...
      avatarObj.container.zIndex = avatarObj.baseZIndex;
    }
  });

  // 确保所有在场 NPC 都已创建并显示
  for (const name of npcNames) {
    if (!name) continue;

    if (!npcAvatarMap.has(name)) {
      await getOrCreateNpcAvatar(name);
      // ⚠️ 首次创建头像后需要补应用皮肤：
      //    对话节点应用 onStage 时，applyOnStageNpcList 是异步的（内部 await 加载骨骼资源），
      //    而皮肤应用（applyNpcSkin）在 onStage 之后同步执行 → 头像可能还没创建完，
      //    导致 changeNpcAvatarSkin 因 npcAvatarMap 里找不到该头像而跳过（首次打开皮肤不生效，
      //    第二次打开头像已缓存才生效）。
      //    这里在头像创建完成后，若 currentNpcSkin 里指定了该 NPC 的皮肤，立即补应用。
      const npcSkinVal = currentNpcSkin.value;
      if (npcSkinVal && typeof npcSkinVal === 'object' && npcSkinVal[name] !== undefined) {
        changeNpcAvatarSkin(npcSkinVal[name] || 'moren', name);
      } else if (npcSkinVal && typeof npcSkinVal === 'string') {
        // 字符串格式 → 应用到当前说话的 NPC（创建完成后若该 NPC 是说话者则补应用）
        // ⚠️ 头像创建循环发生在 currentNpcAvatarName 赋值之前（值为旧值/null），
        //    因此用本次在场列表的说话者 speakingName 判断，而不是 currentNpcAvatarName。
        if (name === currentNpcAvatarName || name === speakingName) {
          changeNpcAvatarSkin(npcSkinVal, name);
        }
      }
    }

    const avatarObj = npcAvatarMap.get(name);
    if (avatarObj && !avatarObj.visible) {
      avatarObj.visible = true;
      fadeInNpcAvatar(avatarObj, 0); // 立即显示
    }
  }

  // 隐藏不在场列表里的 NPC
  npcAvatarMap.forEach((avatarObj, name) => {
    if (!npcNames.includes(name) && avatarObj.visible) {
      fadeOutNpcAvatar(avatarObj);
    }
  });

  // 设置当前说话者
  if (speakingName && npcNames.includes(speakingName)) {
    currentNpcAvatarName = speakingName;
  } else {
    currentNpcAvatarName = npcNames[0] || null;
  }

  // 重新布局
  layoutNpcAvatars();

  // 更新灰度状态
  updateAvatarGrayscaleState();

  //  console.log(`[对话组件] 在场NPC应用完成，共${npcNames.length}个，当前说话: ${currentNpcAvatarName}`);
}

/**
 * 计算 Spine 实际可见内容的边界框（简化版，基于 RegionAttachment 宽高）
 */
function getContentBounds(spine) {
  const skeleton = spine.skeleton;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;

  for (const slot of skeleton.slots) {
    if (!slot.bone.active) continue;
    const attachment = slot.attachment;
    if (!attachment) continue;

    // RegionAttachment 有 width/height
    if (typeof attachment.width === 'number' && typeof attachment.height === 'number') {
      const bone = slot.bone;
      const w = attachment.width * Math.abs(bone.scaleX);
      const h = attachment.height * Math.abs(bone.scaleY);
      // 附件中心的世界坐标
      const cx = bone.worldX + attachment.x * bone.scaleX;
      const cy = bone.worldY + attachment.y * bone.scaleY;

      minX = Math.min(minX, cx - w / 2);
      minY = Math.min(minY, cy - h / 2);
      maxX = Math.max(maxX, cx + w / 2);
      maxY = Math.max(maxY, cy + h / 2);
      found = true;
    }
  }

  if (!found || minX === Infinity) {
    return spine.getBounds();
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * 调整头像 Spine 大小：固定高度，宽度自适应
 * 所有头像高度一致，宽度按内容比例自动调整
 * @param {*} app PixiJS 应用
 * @param {*} spine Spine 实例
 * @param {number} extraScale 额外缩放比例（默认 1，用于 NPC 头像大小调整）
 */
function resizeAvatarSpine(app, spine, extraScale = 1) {
  if (!app || !spine) return;

  const VH = window.innerHeight / 100;
  const fixedHeight = 60 * VH * extraScale;

  // 用实际内容的边界来计算
  const bounds = getContentBounds(spine);
  const spineWidth = bounds.width;
  const spineHeight = bounds.height;

  if (spineWidth === 0 || spineHeight === 0) return;

  // 固定高度，宽度按比例
  const scale = fixedHeight / spineHeight;

  spine.scale.set(scale);

  // 计算缩放后的内容尺寸
  const scaledWidth = spineWidth * scale;
  const scaledHeight = spineHeight * scale;

  // 增加左右padding，给动画左右移动留出空间（左右各30%内容宽度）
  const horizontalPadding = scaledWidth * 0.3;
  const canvasWidth = scaledWidth + horizontalPadding * 2;
  const canvasHeight = scaledHeight;

  // 调整 canvas 大小
  app.renderer.resize(canvasWidth, canvasHeight);

  // 设置canvas的CSS尺寸，保持像素比例一致，避免拉伸变形
  const canvasEl = app.canvas;
  if (canvasEl) {
    canvasEl.style.width = `${canvasWidth}px`;
    canvasEl.style.height = `${canvasHeight}px`;
  }

  // spine水平居中显示，垂直顶部对齐
  spine.x = horizontalPadding - bounds.x * scale;
  spine.y = -bounds.y * scale;
}

/**
 * 计算单个 NPC 头像的实际尺寸（不 resize canvas，用于多 NPC 布局）
 * @param {Object} avatarObj NPC 头像对象
 */
function resizeNpcAvatarSingle(avatarObj) {
  const { spine, scale: extraScale } = avatarObj;
  if (!spine) return;

  const VH = window.innerHeight / 100;
  const fixedHeight = 60 * VH * extraScale;

  // 用实际内容的边界来计算
  const bounds = getContentBounds(spine);
  const spineWidth = bounds.width;
  const spineHeight = bounds.height;

  if (spineWidth === 0 || spineHeight === 0) return;

  // 固定高度，宽度按比例
  const scale = fixedHeight / spineHeight;

  spine.scale.set(scale);

  // spine 相对于容器的偏移（内容左上角对齐容器原点）
  spine.x = -bounds.x * scale;
  spine.y = -bounds.y * scale;

  // 保存实际尺寸（用于布局计算）
  avatarObj.actualWidth = spineWidth * scale;
  avatarObj.actualHeight = spineHeight * scale;
}

/**
 * 布局所有可见 NPC 头像（水平排列，从右往左，底部对齐）
 * 按 onStageNpcList 顺序排列，第一个在最右边
 * 自适应宽度 + 中心固定：每个 NPC 的身体中心位置固定，canvas 宽度自动适应内容，永不裁剪
 */
function layoutNpcAvatars() {
  if (!npcAvatarApp || !npcAvatarMainContainer) return;

  const VH = window.innerHeight / 100;
  const centerStep = 35 * VH;    // 两个 NPC 身体中心之间的固定距离
  const horizontalPadding = 5 * VH; // 左右padding（给动画留空间）
  // 基准：最右边 NPC 的中心距离父元素右边的偏移（保持原来的位置不变）
  // 原来 slotWidth=45vh, padding=5vh, right=-2vw
  // 中心到canvas右边缘 = 27.5vh，容器右边缘超出父元素 2vw
  // 中心到父元素右边 = 2vw + 27.5vh
  const BASE_CENTER_OFFSET_VW = 2;
  const BASE_CENTER_OFFSET_VH = 27.5;

  // 按在场顺序获取所有可见的 NPC 头像
  const visibleAvatars = [];
  onStageNpcList.value.forEach((name) => {
    const avatarObj = npcAvatarMap.get(name);
    if (avatarObj && avatarObj.visible && avatarObj.spine && avatarObj.actualWidth) {
      visibleAvatars.push(avatarObj);
    }
  });

  if (visibleAvatars.length === 0) {
    npcAvatarApp.renderer.resize(1, 1);
    npcContainerRight.value = '-2vw';
    return;
  }

  // 计算最大高度
  let maxHeight = 0;
  visibleAvatars.forEach((avatarObj) => {
    maxHeight = Math.max(maxHeight, avatarObj.actualHeight || 0);
  });

  // 计算所有 NPC 的左右边缘（相对于最右中心）
  let minLeftRel = Infinity;  // 最左边缘（相对最右中心，往左为负）
  let maxRightRel = -Infinity; // 最右边缘（相对最右中心）

  visibleAvatars.forEach((avatarObj, index) => {
    const width = avatarObj.actualWidth || 0;
    const centerRel = -index * centerStep; // 相对于最右中心的x偏移
    const leftRel = centerRel - width / 2;
    const rightRel = centerRel + width / 2;

    if (leftRel < minLeftRel) minLeftRel = leftRel;
    if (rightRel > maxRightRel) maxRightRel = rightRel;
  });

  // 计算 canvas 宽度：内容宽度 + 左右padding
  const contentWidth = maxRightRel - minLeftRel;
  const canvasWidth = contentWidth + horizontalPadding * 2;
  const canvasHeight = maxHeight;

  // 调整 canvas 大小
  npcAvatarApp.renderer.resize(canvasWidth, canvasHeight);

  // 设置canvas的CSS尺寸，保持像素比例一致，避免拉伸变形
  const canvasEl = npcAvatarApp.canvas;
  if (canvasEl) {
    canvasEl.style.width = `${canvasWidth}px`;
    canvasEl.style.height = `${canvasHeight}px`;
  }

  // 最右中心在 canvas 内的 x 坐标
  // 最左边缘在 canvas 内的 x 坐标 = horizontalPadding
  // 最左边缘相对最右中心 = minLeftRel
  // 所以最右中心在 canvas 内 = horizontalPadding - minLeftRel
  const rightCenterX = horizontalPadding - minLeftRel;

  // 布局每个 NPC（水平居中，身体中心固定）
  visibleAvatars.forEach((avatarObj, index) => {
    const width = avatarObj.actualWidth || 0;
    const height = avatarObj.actualHeight || 0;

    // 中心在 canvas 内的 x 坐标
    const centerX = rightCenterX - index * centerStep;
    // spine 左边缘 = 中心 - 宽度/2（水平居中）
    avatarObj.container.x = centerX - width / 2;
    // 底部对齐：容器顶部 = 最大高度 - 当前头像高度
    avatarObj.container.y = maxHeight - height;
  });

  // 动态计算容器的 right 值，保持最右 NPC 的身体中心位置不变
  // 中心到 canvas 右边缘的距离（px转vh）
  const centerToCanvasRightVh = (canvasWidth - rightCenterX) / VH;
  // 中心到父元素右边的距离 = right + 中心到canvas右边缘的距离 = BASE_CENTER_OFFSET
  // 所以 right = BASE_CENTER_OFFSET - 中心到canvas右边缘的距离
  const rightValue = `calc(${BASE_CENTER_OFFSET_VH}vh - ${BASE_CENTER_OFFSET_VW}vw - ${centerToCanvasRightVh}vh)`;
  npcContainerRight.value = rightValue;

}
function destroyPlayerAvatarSpine() {
  if (playerAvatarSpine && playerAvatarContainer) {
    try {
      playerAvatarContainer.removeChild(playerAvatarSpine);
      playerAvatarSpine.destroy({
        children: true,
      });
      // 卸载当前玩家头像资源（下次显示时会重新加载）
      const charName = lastPlayerAvatarChar || 'zhujue';
      const spineName = `${charName}head`;
      try {
        const skel = `${spineName}_skel`;
        const atlas = `${spineName}_atlas`;
        if (Assets.cache.has(skel)) Assets.unload(skel);
        if (Assets.cache.has(atlas)) Assets.unload(atlas);
      } catch (e) {
        // 忽略卸载错误
      }
    } catch (e) {
      console.warn('[对话组件] 玩家头像Spine销毁警告:', e.message);
    }
    playerAvatarSpine = null;
  }
}


/**
 * 销毁所有 NPC 头像
 */
function destroyAllNpcAvatars() {
  npcAvatarMap.forEach((avatarObj, name) => {
    try {
      // 取消 resize RAF
      if (avatarObj._resizeRafId) {
        cancelAnimationFrame(avatarObj._resizeRafId);
        avatarObj._resizeRafId = null;
      }
      if (avatarObj.container && npcAvatarMainContainer) {
        npcAvatarMainContainer.removeChild(avatarObj.container);
      }
      if (avatarObj.spine) {
        avatarObj.spine.destroy({
          children: true,
          texture: false
        });
      }
      // 彻底卸载 NPC 头像的纹理和骨骼资源
      const spineName = `${name}head`;
      try {
        const skel = `${spineName}_skel`;
        const atlas = `${spineName}_atlas`;
        if (Assets.cache.has(skel)) Assets.unload(skel);
        if (Assets.cache.has(atlas)) Assets.unload(atlas);
      } catch (e) {
        // 忽略卸载错误
      }
    } catch (e) {
      console.warn(`[对话组件] NPC头像销毁警告: ${name}`, e.message);
    }
  });
  npcAvatarMap.clear();
  currentNpcAvatarName = null;
}

// 兼容旧函数名
function destroyNpcAvatarSpine() {
  destroyAllNpcAvatars();
}


// ========================
// 🎬 头像框表现动画（avatarFx）
// 表现人物情绪的头像框容器动画：抖动 / 放大缩小 / 弹跳 等。
// 用法（写进对话翻译条目或节点）：
//   avatarFx: "angry"                            → 作用于「当前说话者」
//   avatarFx: "huli:angry"                       → 作用于指定 NPC（onStage 里的 img）
//   avatarFx: "player:shake"                     → 作用于玩家头像框
//   avatarFx: { target: "huli", fx: "angry" }    → 对象写法（fx 可为注册表名或 {type,参数}）
//   avatarFx: [{ target: "huli", fx: "angry" },  → 数组：同时影响多个角色
//              { target: "player", fx: "shake" }]
// 【可扩展】新增情绪只需在 AVATAR_FX 加一个配置；新动画类型在 runAvatarFxTween 的 switch 加分支。
// ========================
const AVATAR_FX = {
  // ===== 基础情绪 =====
  // 抖动（愤怒/惊吓/紧张）
  shake: { type: 'shake', duration: 0.5, intensity: 10 },
  // 放大缩小脉冲（激动/强调）
  pulse: { type: 'pulse', duration: 0.6, scaleTo: 1.25 },
  // 猛地放大再回弹（惊讶/震惊）
  pop: { type: 'pulse', duration: 0.45, scaleTo: 1.35 },
  // 上下弹跳（开心/撒娇）
  bounce: { type: 'bounce', duration: 0.7, height: 10 },
  // 愤怒组合：抖动 + 放大（配套 playerSkin/npcSkin: "angry" 使用）
  angry: { type: 'angry', duration: 0.8, intensity: 8, scaleTo: 1.15 },
  // 悲伤/消沉：缓慢下沉再回弹
  sad: { type: 'sad', duration: 0.9, drop: 8 },
  // 紧张：高频小抖动
  nervous: { type: 'shake', duration: 0.7, intensity: 4 },

  // ===== 开心 / 积极 =====
  // 开心摇摆（哼歌/得意）
  sway: { type: 'sway', duration: 0.8, distance: 14, times: 3 },
  // 欢呼雀跃（连续弹跳，比 bounce 更欢快）
  hop: { type: 'bounce', duration: 0.8, height: 14, times: 3 },
  // 兴奋转圈（旋转）
  spin: { type: 'spin', duration: 0.9, angle: 0.9, times: 1 },
  // 惊喜（放大 + 弹跳组合）
  excited: { type: 'excited', duration: 0.9, scaleTo: 1.3, height: 12 },
  // 大笑（快速颤抖 + 后仰）
  laugh: { type: 'laugh', duration: 0.9, intensity: 6, angle: 0.25 },
  // 郑重宣布（放大后稳住）
  announce: { type: 'pulse', duration: 0.8, scaleTo: 1.2 },

  // ===== 消极 / 低落 =====
  // 委屈啜泣（颤抖 + 下沉）
  sob: { type: 'sob', duration: 1.0, drop: 8 },
  // 害怕退缩（缩小）
  shrink: { type: 'shrink', duration: 0.6, amount: 0.18 },
  // 尴尬（缩肩 + 小幅后退）
  awkward: { type: 'shrink', duration: 0.8, amount: 0.12, times: 2 },

  // ===== 疑惑 / 微妙 =====
  // 歪头疑惑（可爱歪头）
  tilt: { type: 'tilt', duration: 0.7, angle: 0.35 },
  // 轻蔑（歪头 + 缓慢左右摆）
  sneer: { type: 'sway', duration: 1.0, distance: 10, times: 2, angle: 0.2 },
  // 眩晕（快速旋转摇摆）
  dizzy: { type: 'spin', duration: 1.1, angle: 0.5, times: 3 },
  // 害羞（低头小幅摆动）
  shy: { type: 'tilt', duration: 1.0, angle: -0.3, times: 2 },

  // ===== 微表情动作 =====
  // 点头（赞同/应允）
  nod: { type: 'bounce', duration: 0.5, height: 5, times: 1 },
  // 摇头（否认/无奈）
  headshake: { type: 'sway', duration: 0.6, distance: 9, times: 2 },
  // 思考（缓慢左右摆）
  think: { type: 'sway', duration: 1.2, distance: 6, times: 1 },
  // 温柔/宠溺（缓慢摆动 + 微倾）
  gentle: { type: 'sway', duration: 1.2, distance: 6, times: 1, angle: 0.1 },
  // 撒娇（两连弹跳）
  cute: { type: 'bounce', duration: 0.7, height: 12, times: 2 },
  // 得意/炫耀（微倾摆动）
  proud: { type: 'sway', duration: 0.9, distance: 8, times: 2, angle: 0.15 },
  // 疲惫（缓慢下沉）
  tired: { type: 'sad', duration: 1.3, drop: 6 },
  // 打哈欠（缓慢放大再回）
  yawn: { type: 'pulse', duration: 1.5, scaleTo: 1.08 },
  // 打冷颤（小幅度高频抖）
  shiver: { type: 'shake', duration: 0.6, intensity: 3 },
  // 抓狂（大幅度抖 + 微转）
  frantic: { type: 'shake', duration: 0.6, intensity: 12, angle: 0.1 },
  // 警觉（微放大稳住）
  alert: { type: 'pulse', duration: 0.5, scaleTo: 1.1 },
  // 感动（轻声啜泣）
  moved: { type: 'sob', duration: 1.2, drop: 4 },
  // 无语（缓慢低头）
  speechless: { type: 'tilt', duration: 1.2, angle: -0.15 },
  // 惊艳（强放大回弹）
  dazzled: { type: 'pulse', duration: 0.6, scaleTo: 1.4 },
  // 鬼鬼祟祟（缓慢小幅摆）
  sneaky: { type: 'sway', duration: 1.4, distance: 4, times: 1 },
  // 惊退（快速缩小）
  surpriseBack: { type: 'shrink', duration: 0.4, amount: 0.12 },

  // ===== 卡通压扁拉伸（新动效类型 squash）=====
  // 受击/落地（猛烈压扁回弹）
  impact: { type: 'squash', duration: 0.4, amount: 0.25, times: 1 },
  // 伸懒腰（压扁拉伸两次）
  stretch: { type: 'squash', duration: 1.0, amount: 0.12, times: 2 },
  // 卡通弹跳（压扁 + 上跳）
  cartoonJump: { type: 'excited', duration: 0.8, scaleTo: 1.25, height: 16, squash: 0.15 },
};

/** 取消头像框动画并恢复原位 */
function cancelAvatarFx(container, app) {
  if (!container?._fxTickerFn) return;
  app.ticker.remove(container._fxTickerFn);
  container._fxTickerFn = null;
  const b = container._fxBase;
  if (b) {
    container.position.set(b.x, b.y);
    container.scale.set(b.scale, b.scale);
    container.rotation = b.rotation ?? 0;
  }
}

/**
 * 对头像框容器播放表现动画（低层补间）
 * @param {string|Object} fx - 注册表名称（如 'shake'）或配置对象 { type, ...参数 }
 * @param {Container} container - 头像框容器（玩家/NPC 的 Pixi Container）
 * @param {Application} app - 对应头像的 Pixi App（用于 ticker 驱动）
 */
function runAvatarFxTween(fx, container, app) {
  if (!container || !app) return;
  const spec = typeof fx === 'string' ? AVATAR_FX[fx] : fx;
  if (!spec || !spec.type) return;

  cancelAvatarFx(container, app);
  const baseX = container.x || 0;
  const baseY = container.y || 0;
  const baseScale = container.scale?.x ?? 1;
  const baseRot = container.rotation ?? 0;
  container._fxBase = { x: baseX, y: baseY, scale: baseScale, rotation: baseRot };

  const dur = (spec.duration || 0.6) * 1000;
  const start = app.ticker.lastTime;
  const amp = spec.intensity ?? 8;
  const scaleTo = spec.scaleTo ?? 1.25;
  const times = spec.times ?? 1;

  const tick = () => {
    const p = Math.min(1, (app.ticker.lastTime - start) / dur);
    const wave = Math.sin(p * Math.PI); // 0 → 1 → 0

    switch (spec.type) {
      case 'shake': {
        // 抖动（可带轻微旋转）
        const a = amp * (1 - p); // 幅度随时间衰减
        container.position.set(
          baseX + (Math.random() * 2 - 1) * a,
          baseY + (Math.random() * 2 - 1) * a
        );
        if (spec.angle) container.rotation = baseRot + Math.sin(p * Math.PI * 8) * spec.angle * (1 - p);
        break;
      }
      case 'pulse': {
        const s = baseScale + (scaleTo - 1) * wave;
        container.scale.set(s, s);
        break;
      }
      case 'bounce': {
        // 弹跳（times > 1 时连续多次弹跳，如 hop）
        const b = Math.abs(Math.sin(p * Math.PI * times)) * (spec.height ?? 10);
        container.position.y = baseY - b;
        break;
      }
      case 'angry': {
        // 愤怒：抖动 + 放大
        const a = amp * (1 - p);
        container.position.x = baseX + Math.sin(p * Math.PI * 10) * a;
        const s = baseScale + (scaleTo - 1) * wave;
        container.scale.set(s, s);
        break;
      }
      case 'sad': {
        // 悲伤：缓慢下沉再回弹
        container.position.y = baseY + (spec.drop ?? 8) * wave;
        break;
      }
      case 'sway': {
        // 左右摇摆（可带轻微旋转）
        container.position.x = baseX + Math.sin(p * Math.PI * times) * (spec.distance ?? 12);
        if (spec.angle) container.rotation = baseRot + Math.sin(p * Math.PI * times) * spec.angle;
        break;
      }
      case 'spin': {
        // 旋转（times > 1 时快速转圈，如 dizzy）
        container.rotation = baseRot + Math.sin(p * Math.PI * times) * (spec.angle ?? 0.9);
        break;
      }
      case 'tilt': {
        // 歪头（angle 可为负，如害羞低头）
        container.rotation = baseRot + (spec.angle ?? 0.35) * Math.sin(p * Math.PI * times);
        break;
      }
      case 'shrink': {
        // 缩小（times > 1 时缩肩多次，如尴尬）
        const dip = (spec.amount ?? 0.15) * Math.abs(Math.sin(p * Math.PI * times));
        const s = baseScale - dip;
        container.scale.set(s, s);
        break;
      }
      case 'sob': {
        // 啜泣：轻微颤抖 + 下沉
        const jitter = (Math.random() * 2 - 1) * 1.5 * (1 - p);
        container.position.y = baseY + (spec.drop ?? 8) * wave + jitter;
        break;
      }
      case 'laugh': {
        // 大笑：快速颤抖 + 后仰
        const a = amp * (1 - p);
        container.position.x = baseX + Math.sin(p * Math.PI * 8) * a;
        container.rotation = baseRot + Math.sin(p * Math.PI * 4) * (spec.angle ?? 0.25) * (1 - p);
        break;
      }
      case 'excited': {
        // 惊喜：放大 + 弹跳（可选 squash 压扁拉伸）
        let s = baseScale + (scaleTo - 1) * wave;
        if (spec.squash) {
          const sq = spec.squash * Math.abs(Math.sin(p * Math.PI * 2));
          container.scale.set(s * (1 - sq), s * (1 + sq));
        } else {
          container.scale.set(s, s);
        }
        container.position.y = baseY - (spec.height ?? 12) * Math.abs(Math.sin(p * Math.PI * 2));
        break;
      }
      case 'squash': {
        // 卡通压扁拉伸（受击/伸懒腰）：横向压扁 + 纵向拉伸（times > 1 连续两次）
        const sq = (spec.amount ?? 0.15) * Math.abs(Math.sin(p * Math.PI * times));
        container.scale.set(baseScale * (1 - sq), baseScale * (1 + sq));
        break;
      }
    }

    if (p >= 1) {
      app.ticker.remove(tick);
      container._fxTickerFn = null;
      container.position.set(baseX, baseY);
      container.scale.set(baseScale, baseScale);
      container.rotation = baseRot;
    }
  };

  app.ticker.add(tick);
  container._fxTickerFn = tick;
}

// 解析 avatarFx 条目 → { target, fx }
// 支持格式：
//   { target: "huli", fx: "angry" }       对象：指定目标 + 动画
//   { fx: "angry" } / "angry"             省略 target → 作用于当前说话者
//   "huli:angry"                          字符串快捷：目标:动画
//   "player:shake"                        指定玩家
function resolveFxTarget(item) {
  if (typeof item === 'object' && item !== null) {
    // 兼容 { target, type, ...参数 } 直接写动画参数的对象
    const fxBody = item.fx !== undefined ? item.fx : item;
    return { target: item.target ?? 'speaker', fx: fxBody };
  }
  if (typeof item === 'string') {
    const idx = item.indexOf(':');
    if (idx > 0 && !AVATAR_FX[item.slice(0, idx)] && AVATAR_FX[item.slice(idx + 1)]) {
      return { target: item.slice(0, idx), fx: item.slice(idx + 1) };
    }
    return { target: 'speaker', fx: item };
  }
  return { target: 'speaker', fx: item };
}

/** 把 avatarFx 应用到指定目标（玩家 / onStage 里的具体 NPC）的头像框上 */
function runAvatarFx(fx) {
  if (!fx) return;
  const list = Array.isArray(fx) ? fx : [fx];
  for (const item of list) {
    const { target, fx: fxBody } = resolveFxTarget(item);
    if (!fxBody) continue;

    // 省略 target → 当前说话者
    let t = target;
    if (t === 'speaker') {
      const speaker = currentSpeakerName.value;
      t = speaker === '林恩' ? 'player' : speaker;
    }

    if (t === 'player') {
      if (playerAvatarApp && playerAvatarContainer) {
        runAvatarFxTween(fxBody, playerAvatarContainer, playerAvatarApp);
      }
      continue;
    }

    // NPC 目标：等待头像「创建完成 + 布局完成」后再播放。
    // ⚠️ 首句对话时头像异步创建，getOrCreateNpcAvatar 在布局（layoutNpcAvatars 定位）之前就 resolve，
    //    若立刻动画会以 (0,0) 为基准，与真实头像位置对不上 → 用 actualWidth > 0 判定布局完成。
    if (t && npcAvatarApp) {
      ensureAvatarReady(t).then(avatarObj => {
        if (avatarObj?.container && npcAvatarApp) {
          runAvatarFxTween(fxBody, avatarObj.container, npcAvatarApp);
        }
      });
    }
  }
}

// 确保 NPC 头像已创建且布局完成（actualWidth > 0 = 已 resize + layoutNpcAvatars 定位）
function ensureAvatarReady(avatarName) {
  const done = npcAvatarMap.get(avatarName);
  if (done?.container && done.actualWidth > 0) return Promise.resolve(done);
  return getOrCreateNpcAvatar(avatarName).then(avatarObj => waitForAvatarLayout(avatarObj));
}

// 轮询等待头像布局完成（最多 ~30 帧，超时也继续避免卡死）
function waitForAvatarLayout(avatarObj, maxFrames = 30) {
  return new Promise(resolve => {
    let frames = 0;
    const check = () => {
      if (avatarObj?.actualWidth > 0) return resolve(avatarObj);
      if (frames++ < maxFrames) return requestAnimationFrame(check);
      resolve(avatarObj);
    };
    check();
  });
}

/**
 * 切换 NPC 头像表情动画（叠加在基础动画上播放）
 * @param {string|null} animName - 表情动画名称，传 null 则只播放基础动画
 * @param {string} [avatarName] - 指定NPC名称，不传则操作当前显示的NPC
 */
function changeNpcAvatarAnimation(animName, avatarName = null) {
  const targetName = avatarName || currentNpcAvatarName;
  if (!targetName) return;

  const avatarObj = npcAvatarMap.get(targetName);
  if (!avatarObj || !avatarObj.spine) return;

  try {
    const spine = avatarObj.spine;
    const animations = spine.skeleton.data.animations;
    if (!animations || animations.length === 0) return;

    // 确保 Track 0 的基础动画 "animation" 一直在播放
    const baseAnimExists = animations.some(a => a.name === 'animation');
    if (baseAnimExists) {
      const currentTrack0 = spine.state.tracks[0];
      if (!currentTrack0 || currentTrack0.animation.name !== 'animation') {
        spine.state.setAnimation(0, 'animation', true);
      }
    }

    // Track 1: 播放表情动画（叠加在基础动画上）
    if (animName && animName !== 'animation') {
      const animExists = animations.some(a => a.name === animName);
      if (animExists) {
        const trackEntry = spine.state.setAnimation(1, animName, true);
        trackEntry.loop = true;
        //  console.log(`[对话组件] NPC[${targetName}]表情动画切换: ${animName}（叠加播放）`);
      } else {
        console.warn(`[对话组件] NPC[${targetName}]表情动画不存在: ${animName}`);
        spine.state.clearTrack(1);
      }
    } else {
      // 没有指定表情动画，清空 Track 1，只保留基础动画
      spine.state.clearTrack(1);
      // console.log(`[对话组件] NPC[${targetName}]只播放基础动画`);
    }
  } catch (e) {
    console.error(`[对话组件] NPC[${targetName}]动画切换失败:`, e);
  }
}

/**
 * 切换玩家头像表情动画（叠加在基础动画上播放）
 * @param {string|null} animName - 表情动画名称，传 null 则只播放基础动画
 */
function changePlayerAvatarAnimation(animName) {
  if (!playerAvatarSpine) return;

  try {
    const animations = playerAvatarSpine.skeleton.data.animations;
    if (!animations || animations.length === 0) return;

    // 确保 Track 0 的基础动画 "animation" 一直在播放
    const baseAnimExists = animations.some(a => a.name === 'animation');
    if (baseAnimExists) {
      // 检查 Track 0 当前是否在播放基础动画，没有的话重新播放
      const currentTrack0 = playerAvatarSpine.state.tracks[0];
      if (!currentTrack0 || currentTrack0.animation.name !== 'animation') {
        playerAvatarSpine.state.setAnimation(0, 'animation', true);
      }
    }

    // Track 1: 播放表情动画（叠加在基础动画上）
    if (animName && animName !== 'animation') {
      const animExists = animations.some(a => a.name === animName);
      if (animExists) {
        const trackEntry = playerAvatarSpine.state.setAnimation(1, animName, true);
        trackEntry.loop = true;
        //    console.log(`[对话组件] 玩家头像表情动画切换: ${animName}（叠加播放）`);
      } else {
        console.warn(`[对话组件] 玩家头像表情动画不存在: ${animName}`);
        // 清空 Track 1
        playerAvatarSpine.state.clearTrack(1);
      }
    } else {
      // 没有指定表情动画，清空 Track 1，只保留基础动画
      playerAvatarSpine.state.clearTrack(1);
      //  console.log(`[对话组件] 玩家头像只播放基础动画`);
    }
  } catch (e) {
    console.error('[对话组件] 玩家头像动画切换失败:', e);
  }
}

// ========================
// Spine 皮肤切换（skin）—— 用于头像表情切换
// ========================

/**
 * 切换玩家头像皮肤
 * @param {string|null} skinName - 皮肤名称，传 null 或空字符串恢复默认皮肤
 */
function changePlayerAvatarSkin(skinName) {
  if (!playerAvatarSpine) return;

  try {
    const skeleton = playerAvatarSpine.skeleton;
    // null/空字符串 → 恢复默认皮肤 "moren"
    const effectiveSkin = skinName || 'moren';
    const skin = skeleton.data.findSkin(effectiveSkin);
    if (skin) {
      skeleton.setSkin(skin);
      skeleton.setupPoseSlots();
    } else {
      console.warn(`[对话组件] 玩家头像皮肤不存在: ${effectiveSkin}`);
    }
  } catch (e) {
    console.error('[对话组件] 玩家头像皮肤切换失败:', e);
  }
}

/**
 * 批量应用 NPC 皮肤（根据 currentNpcSkin 的值）
 * 自动处理字符串和对象两种格式：
 *   - 字符串：应用到当前说话的 NPC
 *   - 对象：{ huli: "smile", jinmao: null } 按 NPC 名称分别设置
 * @param {string|Object|null} npcSkinValue - 皮肤值
 */
function applyNpcSkin(npcSkinValue) {
  if (!npcSkinValue) {
    // null → 恢复所有在场 NPC 为默认皮肤 "moren"
    onStageNpcList.value.forEach(name => {
      changeNpcAvatarSkin('moren', name);
    });
    return;
  }

  if (typeof npcSkinValue === 'string') {
    // 字符串 → 应用到当前说话的 NPC
    changeNpcAvatarSkin(npcSkinValue);
    return;
  }

  if (typeof npcSkinValue === 'object') {
    // 对象 → 按 NPC 名称分别应用
    for (const [npcName, skinName] of Object.entries(npcSkinValue)) {
      changeNpcAvatarSkin(skinName || 'moren', npcName);
    }
    // 在场的但对象里没提到的 NPC → 恢复默认皮肤 "moren"
    onStageNpcList.value.forEach(name => {
      if (!(name in npcSkinValue)) {
        changeNpcAvatarSkin('moren', name);
      }
    });
    return;
  }
}

/**
 * 切换 NPC 头像皮肤
 * @param {string|null} skinName - 皮肤名称，传 null 或空字符串恢复默认皮肤
 * @param {string} [avatarName] - 指定 NPC 名称，不传则操作当前说话的 NPC
 */
function changeNpcAvatarSkin(skinName, avatarName = null) {
  const targetName = avatarName || currentNpcAvatarName;
  if (!targetName) return;

  const avatarObj = npcAvatarMap.get(targetName);
  if (!avatarObj || !avatarObj.spine) return;

  try {
    const skeleton = avatarObj.spine.skeleton;
    // null/空字符串 → 恢复默认皮肤 "moren"
    const effectiveSkin = skinName || 'moren';
    const skin = skeleton.data.findSkin(effectiveSkin);
    if (skin) {
      skeleton.setSkin(skin);
      skeleton.setupPoseSlots();
    } else if (skinName) {
      // 只有明确指定了皮肤但找不到时才警告；默认 moren 不存在则静默保持当前皮肤
      console.warn(`[对话组件] NPC[${targetName}]头像皮肤不存在: ${effectiveSkin}`);
    }
  } catch (e) {
    console.error(`[对话组件] NPC[${targetName}]头像皮肤切换失败:`, e);
  }
}

/**
 * 设置 Spine 动画默认混合时间（所有动画切换时平滑过渡）
 * @param {Spine} spine - Spine 实例
 * @param {number} mixTime - 混合时间（秒），默认 0.3
 */
function setDefaultMixTime(spine, mixTime = 0.3) {
  if (!spine?.state?.data) return;

  try {
    const stateData = spine.state.data;
    const animations = spine.skeleton.data.animations;

    if (!animations || animations.length === 0) return;

    // 为所有动画对设置相同的混合时间
    for (let i = 0; i < animations.length; i++) {
      for (let j = 0; j < animations.length; j++) {
        if (i !== j) {
          stateData.setMix(animations[i].name, animations[j].name, mixTime);
        }
      }
    }

  } catch (e) {
    console.warn('[对话组件] 设置动画混合时间失败:', e.message);
  }
}

/**
 * 销毁玩家头像应用
 */
function destroyPlayerAvatarApp() {
  // 取消玩家头像 resize RAF
  if (playerAvatarResizeRafId) {
    cancelAnimationFrame(playerAvatarResizeRafId);
    playerAvatarResizeRafId = null;
  }

  destroyPlayerAvatarSpine();
  if (playerAvatarApp) {
    try {
      // 清理滤镜的ticker动画
      if (playerAlphaFilter?._tickerFn) {
        playerAvatarApp.ticker.remove(playerAlphaFilter._tickerFn);
        playerAlphaFilter._tickerFn = null;
      }
      if (playerGrayscaleFilter?._grayTickerFn) {
        playerAvatarApp.ticker.remove(playerGrayscaleFilter._grayTickerFn);
        playerGrayscaleFilter._grayTickerFn = null;
      }
      playerAvatarApp.ticker.stop();
      if (playerAvatarContainer) {
        playerAvatarContainer.removeChildren();
        playerAvatarApp.stage.removeChild(playerAvatarContainer);
        playerAvatarContainer.destroy({ children: true });
      }
      playerAvatarApp.destroy({ children: true, texture: true, textureSource: true, releaseGlobalResources: false });
    } catch (e) {
      console.warn('[对话组件] 玩家头像App销毁警告:', e.message);
    }
    playerAvatarApp = null;
    playerAvatarContainer = null;
    playerAlphaFilter = null;
    playerGrayscaleFilter = null;
  }
}

/**
 * 销毁 NPC 头像应用
 */
function destroyNpcAvatarApp() {
  if (npcAvatarApp) {
    try {
      // 先清理所有NPC滤镜的ticker动画（必须在destroyAllNpcAvatars之前，因为后者会清空npcAvatarMap）
      npcAvatarMap.forEach((avatarObj) => {
        if (avatarObj.alphaFilter?._tickerFn) {
          npcAvatarApp.ticker.remove(avatarObj.alphaFilter._tickerFn);
          avatarObj.alphaFilter._tickerFn = null;
        }
        if (avatarObj.grayscaleFilter?._grayTickerFn) {
          npcAvatarApp.ticker.remove(avatarObj.grayscaleFilter._grayTickerFn);
          avatarObj.grayscaleFilter._grayTickerFn = null;
        }
      });

      // 再销毁所有 NPC 头像（会清空 npcAvatarMap）
      destroyAllNpcAvatars();

      npcAvatarApp.ticker.stop();
      if (npcAvatarMainContainer) {
        npcAvatarMainContainer.removeChildren();
        npcAvatarApp.stage.removeChild(npcAvatarMainContainer);
        npcAvatarMainContainer.destroy({ children: true });
      }
      npcAvatarApp.destroy({ children: true, texture: true, textureSource: true, releaseGlobalResources: false });
    } catch (e) {
      console.warn('[对话组件] NPC头像App销毁警告:', e.message);
    }
    npcAvatarApp = null;
    npcAvatarMainContainer = null;
  }
}

// ========================
// 头像过渡动画函数（使用滤镜 alpha 实现）
// ========================

// 玩家头像淡入动画
function fadeInPlayerAvatar(duration = 0.5) {
  if (!playerAlphaFilter || !playerAvatarApp) return;
  tweenFilterAlpha(playerAlphaFilter, playerAlphaFilter.alpha, 1, duration, playerAvatarApp);
}

// 玩家头像淡出动画
function fadeOutPlayerAvatar(duration = 0.5) {
  if (!playerAlphaFilter || !playerAvatarApp) return;
  tweenFilterAlpha(playerAlphaFilter, playerAlphaFilter.alpha, 0, duration, playerAvatarApp);
}

// NPC头像淡入动画
function fadeInNpcAvatar(avatarOrName = null, duration = 0.5) {
  const avatarObj = getNpcAvatarObj(avatarOrName);
  if (!avatarObj || !avatarObj.alphaFilter || !npcAvatarApp) return;
  tweenFilterAlpha(avatarObj.alphaFilter, avatarObj.alphaFilter.alpha, 1, duration, npcAvatarApp);
  avatarObj.visible = true;
}

// NPC头像淡出（立即消失，无过渡动画）
function fadeOutNpcAvatar(avatarOrName = null) {
  const avatarObj = getNpcAvatarObj(avatarOrName);
  if (!avatarObj || !avatarObj.alphaFilter || !npcAvatarApp) return;

  // 移除可能存在的上一个动画
  if (avatarObj.alphaFilter._tickerFn) {
    npcAvatarApp.ticker.remove(avatarObj.alphaFilter._tickerFn);
    avatarObj.alphaFilter._tickerFn = null;
  }

  // 立即设置为完全透明
  avatarObj.alphaFilter.alpha = 0;
  avatarObj.visible = false;
}

// 辅助函数：获取 NPC 头像对象（支持传入对象、名称，或默认取当前显示的）
function getNpcAvatarObj(avatarOrName) {
  if (!avatarOrName) {
    // 不传参数，取当前显示的 NPC
    if (!currentNpcAvatarName) return null;
    return npcAvatarMap.get(currentNpcAvatarName);
  }
  if (typeof avatarOrName === 'string') {
    // 传入名称
    return npcAvatarMap.get(avatarOrName);
  }
  // 传入对象
  return avatarOrName;
}

// 通用：滤镜 alpha 过渡动画（使用 app.ticker 驱动）
function tweenFilterAlpha(filter, from, to, duration, app) {
  if (!filter || !app) return;

  // 移除可能存在的上一个动画
  if (filter._tickerFn) {
    app.ticker.remove(filter._tickerFn);
    filter._tickerFn = null;
  }

  filter.alpha = from;
  const startTime = app.ticker.lastTime;

  filter._tickerFn = () => {
    if (!filter) {
      app.ticker.remove(filter._tickerFn);
      filter._tickerFn = null;
      return;
    }
    const elapsed = (app.ticker.lastTime - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);
    // 缓动效果：ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    filter.alpha = from + (to - from) * eased;

    if (progress >= 1) {
      app.ticker.remove(filter._tickerFn);
      filter._tickerFn = null;
    }
  };

  app.ticker.add(filter._tickerFn);
}

// ========================
// 头像灰度滤镜函数（非说话角色变灰）
// ========================

// 设置玩家头像灰度状态（未说话时变暗+降低饱和度）
function setPlayerAvatarGrayscale(grayscale, duration = 0.3) {
  if (!playerGrayscaleFilter || !playerAvatarApp) return;
  if (grayscale) {
    // 未说话：变暗 + 降低饱和度 + 轻微降低对比度
    // 从当前值开始动画，避免闪一下
    tweenFilterGrayscale(playerGrayscaleFilter, {
      saturation: playerGrayscaleFilter.saturation,
      brightness: playerGrayscaleFilter.brightness,
      contrast: playerGrayscaleFilter.contrast
    }, {
      saturation: 0.25,
      brightness: 0.65,
      contrast: 0.9
    }, duration, playerAvatarApp);
  } else {
    // 说话：恢复正常
    tweenFilterGrayscale(playerGrayscaleFilter, {
      saturation: playerGrayscaleFilter.saturation,
      brightness: playerGrayscaleFilter.brightness,
      contrast: playerGrayscaleFilter.contrast
    }, {
      saturation: 1,
      brightness: 1,
      contrast: 1
    }, duration, playerAvatarApp);
  }
}

// 设置NPC头像灰度状态（未说话时变暗+降低饱和度）
function setNpcAvatarGrayscale(grayscale, duration = 0.3, avatarName = null) {
  const avatarObj = getNpcAvatarObj(avatarName);
  if (!avatarObj || !avatarObj.grayscaleFilter || !npcAvatarApp) return;

  const filter = avatarObj.grayscaleFilter;

  if (grayscale) {
    // 未说话：变暗 + 降低饱和度 + 轻微降低对比度
    // 从当前值开始动画，避免闪一下
    tweenFilterGrayscale(filter, {
      saturation: filter.saturation,
      brightness: filter.brightness,
      contrast: filter.contrast
    }, {
      saturation: 0.25,
      brightness: 0.65,
      contrast: 0.9
    }, duration, npcAvatarApp);
  } else {
    // 说话：恢复正常
    tweenFilterGrayscale(filter, {
      saturation: filter.saturation,
      brightness: filter.brightness,
      contrast: filter.contrast
    }, {
      saturation: 1,
      brightness: 1,
      contrast: 1
    }, duration, npcAvatarApp);
  }
}

// 通用：滤镜灰度效果过渡动画（同时动画 saturation、brightness、contrast）
function tweenFilterGrayscale(filter, from, to, duration, app) {
  if (!filter || !app) return;

  // 移除可能存在的上一个动画
  if (filter._grayTickerFn) {
    app.ticker.remove(filter._grayTickerFn);
    filter._grayTickerFn = null;
  }

  const startTime = app.ticker.lastTime;

  filter._grayTickerFn = () => {
    if (!filter) {
      app.ticker.remove(filter._grayTickerFn);
      filter._grayTickerFn = null;
      return;
    }
    const elapsed = (app.ticker.lastTime - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);
    // 缓动效果：ease-in-out
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    filter.saturation = from.saturation + (to.saturation - from.saturation) * eased;
    filter.brightness = from.brightness + (to.brightness - from.brightness) * eased;
    filter.contrast = from.contrast + (to.contrast - from.contrast) * eased;

    if (progress >= 1) {
      app.ticker.remove(filter._grayTickerFn);
      filter._grayTickerFn = null;
    }
  };

  app.ticker.add(filter._grayTickerFn);
}

// 根据当前对话更新头像灰度状态（多 NPC 版本）
function updateAvatarGrayscaleState() {
  if (!currentDialogue.value) return;

  // NPC显示名称到img标识的映射表（支持别名）
  const speakerNameToImg = {
    '金毛': 'jinmao',
    '晨曦': 'jinmao',
    '猫咪': 'maomi',
    "白朔": "maomi",
    '小白': 'maomi',
    '晨曦': "jinmao",
    '西亚': "huli",
    '云弥': "yu",
    '黑米': "heimi",
    '里亚': "shangren2",
    '商人': "shangren1",
    '莫奇': "shangren1"
  };

  // 集体说话的别名列表：这些名称表示所有在场NPC一起说话，全部高亮
  const groupSpeakerNames = ['众人', '众精灵', '大家', '所有人'];

  // 从store的npcSelectList自动补充映射（name -> img）
  const store = useCounterStore();
  if (store.pixi?.npcSelectList) {
    store.pixi.npcSelectList.forEach(npc => {
      if (npc.name && npc.img) {
        speakerNameToImg[npc.name] = npc.img;
      }
    });
  }

  const speakerName = currentDialogue.value.name;
  // 玩家说话判断
  const isPlayerSpeaking = speakerName === '林恩';
  // 旁白/系统说话（空名称）：没有NPC在说话
  const isNarrator = !speakerName || speakerName === '';
  // 集体说话：所有在场NPC都高亮
  const isGroupSpeaking = groupSpeakerNames.includes(speakerName);

  // 将显示名称转换为NPC的img标识（用于匹配头像）
  let speakingNpcImg = null;
  if (!isPlayerSpeaking && !isNarrator && !isGroupSpeaking) {
    speakingNpcImg = speakerNameToImg[speakerName] || speakerName;
    // 🔄 通用回退：显示名未映射到在场头像时，若场景只有一个 NPC 则高亮该 NPC
    //   （如商人：说话名「商人」→ onStage 头像 key「shangren1」）
    if (!onStageNpcList.value.includes(speakingNpcImg) && onStageNpcList.value.length === 1) {
      speakingNpcImg = onStageNpcList.value[0];
    }
  }

  // 更新所有在场 NPC 的灰度状态和层级
  onStageNpcList.value.forEach((npcImg) => {
    // 判断当前NPC是否应该高亮：单个说话者匹配，或者是集体说话
    const isSpeaking = isGroupSpeaking || (npcImg === speakingNpcImg);
    setNpcAvatarGrayscale(!isSpeaking, 0.3, npcImg);

    // 更新层级
    const avatarObj = npcAvatarMap.get(npcImg);
    if (avatarObj && avatarObj.container) {
      if (isSpeaking) {
        avatarObj.container.zIndex = 100; // 说话者层级最高
      } else {
        avatarObj.container.zIndex = avatarObj.baseZIndex; // 恢复初始层级
      }
    }
  });

  // 玩家灰度状态：非主角头像时常亮，主角说话时正常颜色，否则变灰
  // 当前显示的角色名：字符串直接用，true 表示保持当前（默认 zhujue）
  const currentAvatarChar = typeof currentPlayerAvatar.value === 'string' ? currentPlayerAvatar.value : 'zhujue';
  const shouldGrayscale = currentAvatarChar === 'zhujue' && !isPlayerSpeaking;
  setPlayerAvatarGrayscale(shouldGrayscale);
}

// 监听对话激活状态，对话结束时清理在场列表
watch(isDialogueActive, (active) => {
  if (!active) {
    // 对话结束：停止快进
    stopFastForward();
    // 对话结束：清空在场 NPC 列表，隐藏所有 NPC 头像
    onStageNpcList.value = [];
    currentNpcAvatarName = null;
    hideAllNpcAvatars();
    // 重置 CG 动画和头像相关的追踪变量，下次对话开始时能正确判断是否需要切换
    lastAppliedCgAnimation = null;
    lastAppliedCgSkin = null;
    lastAppliedNpcAnim = null;
    lastAppliedPlayerAnim = null;
    lastAppliedPlayerChar = 'zhujue';
    lastAppliedPlayerSkin = null;
    lastAppliedNpcSkin = null;

    // 🎯 移动端性能优化：对话结束后停止三个独立 Pixi 应用的 ticker，
    //    避免隐藏的 WebGL 上下文每帧空转渲染（cgApp / playerAvatarApp / npcAvatarApp）
    //    ⚠️ 但 CG 可能脱离对话单独显示（昼夜CG/纯CG过渡），此时 cgApp 必须保持运行
    if (!isCgVisible.value) {
      if (cgApp?.ticker) cgApp.ticker.stop();
      if (playerAvatarApp?.ticker) playerAvatarApp.ticker.stop();
      if (npcAvatarApp?.ticker) npcAvatarApp.ticker.stop();
    }
  } else {
    // 对话开始时恢复 ticker（若有则启动，无副作用）
    if (cgApp?.ticker) cgApp.ticker.start();
    if (playerAvatarApp?.ticker) playerAvatarApp.ticker.start();
    if (npcAvatarApp?.ticker) npcAvatarApp.ticker.start();
  }
});

// 监听 CG 显示状态（合并暂停/恢复动画 + 淡入淡出头像）
watch(isCgVisible, async (visible) => {
  if (visible) {
    // 🎯 性能优化：CG 显示时必须确保 cgApp ticker 运行（否则动画冻结）
    if (cgApp?.ticker) cgApp.ticker.start();
    // 显示 CG：只创建Spine（cgApp已在onMounted初始化）
    showCgSpine();
    // CG显示时：默认淡出头像并暂停动画；若 cgShowAvatar=true 则保留头像（不淡出、不停动画）
    if (!currentCgShowAvatar.value) {
      fadeOutPlayerAvatar();
      playerAvatarSpine && (playerAvatarSpine.state.timeScale = 0);
      onStageNpcList.value.forEach((name) => {
        fadeOutNpcAvatar(name);
      });
      npcAvatarMap.forEach((avatarObj) => {
        avatarObj.spine && (avatarObj.spine.state.timeScale = 0);
      });
    }
  } else {
    // 隐藏 CG：只移除Spine，不销毁cgApp（canvas常驻）
    destroyCgSpine();
    // CG隐藏时，淡入头像 + 恢复头像动画
    if (currentPlayerAvatar.value !== false) {
      fadeInPlayerAvatar();
    }
    playerAvatarSpine && (playerAvatarSpine.state.timeScale = 1);
    onStageNpcList.value.forEach((name) => {
      fadeInNpcAvatar(name);
    });
    npcAvatarMap.forEach((avatarObj) => {
      avatarObj.spine && (avatarObj.spine.state.timeScale = 1);
    });
    // 🎯 性能优化：对话也未激活时，CG 隐藏后可将三个应用 ticker 一并停止
    if (!isDialogueActive.value) {
      if (cgApp?.ticker) cgApp.ticker.stop();
      if (playerAvatarApp?.ticker) playerAvatarApp.ticker.stop();
      if (npcAvatarApp?.ticker) npcAvatarApp.ticker.stop();
    }
  }
});

// 监听 CG 显示时是否保留头像框（cgShowAvatar 中途切换：true=淡入头像+恢复动画，false=淡出头像+暂停动画）
// 注意：CG 首次显示/隐藏已由 watch(isCgVisible) 统一处理，这里只处理 CG 已显示时的中途切换
watch(currentCgShowAvatar, (show) => {
  if (!isCgVisible.value) return; // CG 未显示时不处理（由 isCgVisible 监听负责）

  if (show) {
    // 恢复头像显示 + 恢复动画
    if (currentPlayerAvatar.value !== false) {
      fadeInPlayerAvatar();
    }
    playerAvatarSpine && (playerAvatarSpine.state.timeScale = 1);
    onStageNpcList.value.forEach((name) => {
      fadeInNpcAvatar(name);
    });
    npcAvatarMap.forEach((avatarObj) => {
      avatarObj.spine && (avatarObj.spine.state.timeScale = 1);
    });
  } else {
    // 淡出头像 + 暂停动画
    fadeOutPlayerAvatar();
    playerAvatarSpine && (playerAvatarSpine.state.timeScale = 0);
    onStageNpcList.value.forEach((name) => {
      fadeOutNpcAvatar(name);
    });
    npcAvatarMap.forEach((avatarObj) => {
      avatarObj.spine && (avatarObj.spine.state.timeScale = 0);
    });
  }
});

// 监听 CG 名称变化（切换不同 CG 时重新加载 Spine，首次显示不由这里触发）
watch(currentCgName, (newName, oldName) => {
  if (isCgVisible.value && newName && oldName && newName !== oldName) {
    showCgSpine();
  }
});

// 监听 CG 皮肤变化（皮肤一变立即在现有 Spine 上换肤，并重播当前动画，不受同名动画判断影响）
// 注意：如果当前节点带了 showCg，说明 Spine 会重建（showCgSpine 已应用皮肤），这里跳过避免重复
watch(currentCgSkin, (newSkin, oldSkin) => {
  if (isCgVisible.value && cgSpine && newSkin !== oldSkin) {
    // 只有当本次变更不是由 showCg 重建导致时才换肤
    // （changeCgSkin 内部做交叉淡化：旧皮肤淡出 + 新皮肤从动画开头淡入，
    //   不需要在这里手动 setAnimation 重播，否则二次重播会导致动画从头开始）
    if (currentDialogue.value?.showCg === undefined) {
      // 🎬 cgRestart: true → 强制重建 CG（重新应用皮肤并从动画开头播放），
      //    用于"切皮肤必须重头播动画"的场景（如序章主角落地换装）
      //    若当前动画仍在播放（未到暂停点/未播完），先等它播完再重建，
      //    避免快速点击时还没播到后续段落（如 pause 后的第三段）就切换导致内容丢失
      if (currentDialogue.value?.cgRestart === true) {
        if (currentCgLoop.value === true || cgAnimCompleted) {
          showCgSpine(); // 循环动画或已播完 → 立即重建
        } else {
          pendingCgRestart = true; // 等待动画播完（等待期间 pause 点失效，一路播到结尾）
          if (cgPaused.value) resumeCg(); // 若正停在暂停点，先恢复让它播完
        }
      } else {
        changeCgSkin();
      }
    }
  }
});

// 监听昼夜变化CG触发标志
watch(() => user.pixi.dayCgTrigger, (trigger) => {
  if (trigger) {
    // 播放昼夜变化CG动画
    showCg('taiyangyueliang', 'animation');
  }
});

// 监听对话变化（集中处理：打字、NPC头像切换、动画、皮肤、CG动画等，避免多个watcher链式触发）
watch(currentDialogue, (newDialogue) => {
  // 🎬 CG 标记点暂停：仅当本节点标记 cgResume:true 时恢复被 pause 暂停的 CG（未标记不恢复，保持暂停定格）
  if (newDialogue?.cgResume === true) {
    resumeCg();
  }
  // ⚠️ 对话切换：清除残留的 autoNext 定时器，避免昼夜CG完成后触发新对话时，
  //    旧定时器仍带着上一节点逻辑误作用于新对话（误关闭/误跳转）
  if (autoNextTimer) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }
  if (!newDialogue) return;

  // --- 1. 处理说话者姓名 ---
  if ('name' in newDialogue) {
    let _n = newDialogue.name || '';
    // 📛 莫奇自我介绍(sr37)后，商人对话姓名显示「莫奇」
    if (_n === '商人' && user.getDialogueFlag?.('moqiName')) _n = '莫奇';
    currentSpeakerName.value = _n;
  }

  // --- 2. 玩家头像始终显示（只有CG时隐藏，由模板v-show控制） ---
  if (currentPlayerAvatar.value !== false && !isCgVisible.value) {
    fadeInPlayerAvatar();
  }

  // --- 3. 处理 onStage 在场列表 ---
  if ('onStage' in newDialogue) {
    const onStage = newDialogue.onStage;

    if (onStage === "" || (Array.isArray(onStage) && onStage.length === 0)) {
      hideAllNpcAvatars();
    } else {
      let npcList = [];
      let speakingName = null;

      if (typeof onStage === 'string') {
        npcList = [onStage];
        speakingName = onStage;
      } else if (Array.isArray(onStage)) {
        npcList = [...onStage];
        speakingName = onStage[0] || null;
      }

      if (npcList.length > 0) {
        applyOnStageNpcList(npcList, speakingName);

        if (speakingName) {
          showNpcAvatar(speakingName);
          if (!isCgVisible.value) {
            fadeInNpcAvatar(speakingName);
          }
        }
      }
    }
  }

  // --- 4. 更新头像灰度状态 ---
  updateAvatarGrayscaleState();

  // --- 5. 应用对话中指定的头像动画/角色/皮肤（只在值真正变化时才执行，避免每段对话重复触发） ---
  if (currentNpcAvatarAnimation.value && currentNpcAvatarAnimation.value !== lastAppliedNpcAnim
    && currentNpcAvatarName && npcAvatarMap.has(currentNpcAvatarName)) {
    changeNpcAvatarAnimation(currentNpcAvatarAnimation.value);
  }
  lastAppliedNpcAnim = currentNpcAvatarAnimation.value;

  if (currentPlayerAvatarAnimation.value && currentPlayerAvatarAnimation.value !== lastAppliedPlayerAnim
    && playerAvatarSpine) {
    changePlayerAvatarAnimation(currentPlayerAvatarAnimation.value);
  }
  lastAppliedPlayerAnim = currentPlayerAvatarAnimation.value;

  // 🎬 头像框表现动画（avatarFx）：一次性动画，每个声明了 avatarFx 的节点都会触发
  //    （不能按"值变化"去重 —— 连续两句用同一个 avatarFx 时值不变，会导致第二句不触发）
  if (newDialogue.avatarFx !== undefined) {
    runAvatarFx(newDialogue.avatarFx);
  }

  // playerAvatar 统一处理：false→隐藏，字符串→切换并显示，true→显示当前
  const newPlayerAvatar = currentPlayerAvatar.value;
  if (newPlayerAvatar === false) {
    fadeOutPlayerAvatar();
  } else if (typeof newPlayerAvatar === 'string' && newPlayerAvatar !== lastAppliedPlayerChar && playerAvatarApp) {
    changePlayerAvatarChar(newPlayerAvatar);
    if (!isCgVisible.value) fadeInPlayerAvatar();
  } else if (newPlayerAvatar === true && !isCgVisible.value) {
    fadeInPlayerAvatar();
  }
  lastAppliedPlayerChar = typeof newPlayerAvatar === 'string' ? newPlayerAvatar : 'zhujue';

  if (currentPlayerSkin.value !== null && currentPlayerSkin.value !== lastAppliedPlayerSkin
    && playerAvatarSpine) {
    changePlayerAvatarSkin(currentPlayerSkin.value);
  }
  lastAppliedPlayerSkin = currentPlayerSkin.value;

  if (currentNpcSkin.value !== null && JSON.stringify(currentNpcSkin.value) !== JSON.stringify(lastAppliedNpcSkin)) {
    applyNpcSkin(currentNpcSkin.value);
  }
  lastAppliedNpcSkin = currentNpcSkin.value ? JSON.parse(JSON.stringify(currentNpcSkin.value)) : null;

  // CG 动画切换（CG已显示且动画名称与上次不同时才切换，避免每段对话都重播）
  // 注意：如果本段对话指定了 showCg，说明 CG Spine 会被重新加载（showCgSpine），
  // 此时由 showCgSpine 负责播放动画，不应在这里提前切换（cgSpine 可能还是旧的）
  if (isCgVisible.value && cgSpine && currentCgAnimation.value && currentCgAnimation.value !== lastAppliedCgAnimation) {
    // 如果 showCg 有值（新CG/Spine正在加载中），跳过本次动画切换
    if (newDialogue.showCg === undefined) {
      changeCgAnimation();
      lastAppliedCgAnimation = currentCgAnimation.value;
    }
  }

  // --- 6. 重新开始打字 ---
  startTyping();
});
// 监听窗口大小变化
function handleResize() {
  if (!cgApp) return;

  // 重新计算16:9尺寸
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  let canvasWidth, canvasHeight;

  if (screenWidth / screenHeight > 16 / 9) {
    canvasHeight = screenHeight;
    canvasWidth = canvasHeight * 16 / 9;
  } else {
    canvasWidth = screenWidth;
    canvasHeight = canvasWidth * 9 / 16;
  }

  // 更新渲染器尺寸
  cgApp.renderer.resize(canvasWidth, canvasHeight);

  // 重新调整Spine大小（当前层）
  if (cgSpine) {
    resizeCgSpine(cgSpine);
  }
  // 交叉淡化期间旧层也同步缩放，避免尺寸错位
  if (cgSpinePrev) {
    resizeCgSpine(cgSpinePrev);
  }

  // 调整头像大小
  if (playerAvatarApp) {
    const VH = window.innerHeight / 100;
    const width = 40 * VH;
    const height = 60 * VH;
    playerAvatarApp.renderer.resize(width, height);
    if (playerAvatarSpine) {
      resizeAvatarSpine(playerAvatarApp, playerAvatarSpine);
    }
  }
  if (npcAvatarApp) {
    // 重新计算所有 NPC 头像大小
    npcAvatarMap.forEach((avatarObj) => {
      if (avatarObj.spine) {
        resizeNpcAvatarSingle(avatarObj);
      }
    });
    // 重新布局所有 NPC
    layoutNpcAvatars();
  }
}

// ========== 富文本解析 ==========
// 支持标签：[c=颜色]、[size=大小]、[sub]、[sup]、[b]、[i]，可嵌套
function parseRichText(input) {
  const segments = [];
  let currentText = '';
  let currentStyles = {};
  const styleStack = [];

  const tagRegex = /\[(c|size|sub|sup|b|i|u)(?:=([^\]]+))?\]|\[\/(c|size|sub|sup|b|i|u)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      currentText += input.slice(lastIndex, match.index);
    }

    const openTag = match[1];
    const closeTag = match[3];
    const tagValue = match[2];
    const isClosing = !!closeTag;
    const tagName = openTag || closeTag;

    if (isClosing) {
      if (currentText) {
        segments.push({ text: currentText, styles: { ...currentStyles } });
        currentText = '';
      }
      if (styleStack.length > 0) {
        styleStack.pop();
        currentStyles = {};
        for (const s of styleStack) Object.assign(currentStyles, s);
      }
    } else {
      if (currentText) {
        segments.push({ text: currentText, styles: { ...currentStyles } });
        currentText = '';
      }
      const newStyle = {};
      if (tagName === 'c') newStyle.color = tagValue;
      else if (tagName === 'size') newStyle.fontSize = tagValue;
      else if (tagName === 'sub') newStyle.sub = true;
      else if (tagName === 'sup') newStyle.sup = true;
      else if (tagName === 'b') newStyle.bold = true;
      else if (tagName === 'i') newStyle.italic = true;
      else if (tagName === 'u') newStyle.underline = true;
      styleStack.push(newStyle);
      Object.assign(currentStyles, newStyle);
    }

    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < input.length) {
    currentText += input.slice(lastIndex);
  }
  if (currentText) {
    segments.push({ text: currentText, styles: { ...currentStyles } });
  }

  const chars = segments.map(s => s.text).join('');
  return { segments, totalChars: chars.length, chars };
}

// 根据已显示的字符数，渲染成带样式的 HTML
function renderRichText(parsed, visibleChars) {
  let remaining = visibleChars;
  let html = '';

  for (const seg of parsed.segments) {
    if (remaining <= 0) break;
    const segLen = seg.text.length;
    const take = Math.min(remaining, segLen);
    const text = seg.text.slice(0, take);

    let openTag = '';
    let closeTag = '';

    if (seg.styles.sub) { openTag = '<sub>' + openTag; closeTag += '</sub>'; }
    if (seg.styles.sup) { openTag = '<sup>' + openTag; closeTag += '</sup>'; }
    if (seg.styles.bold) { openTag = '<b>' + openTag; closeTag += '</b>'; }
    if (seg.styles.italic) { openTag = '<i>' + openTag; closeTag += '</i>'; }
    if (seg.styles.underline) { openTag = '<span style="text-decoration:underline;text-underline-offset:0.25em">' + openTag; closeTag += '</span>'; }

    const inlineStyles = ['font-family: inherit'];
    if (seg.styles.color) inlineStyles.push(`color:${seg.styles.color}`);
    if (seg.styles.fontSize) inlineStyles.push(`font-size:${seg.styles.fontSize}`);
    if (inlineStyles.length > 0) {
      openTag = `<span style="${inlineStyles.join(';')}">` + openTag;
      closeTag += '</span>';
    }

    html += openTag + text.replace(/\n/g, '<br>') + closeTag;
    remaining -= take;
  }

  return html;
}

// 打字机效果相关
const displayedText = ref("");
const finished = ref(false);
const canClick = ref(false); // 打字完成后是否可以点击（延迟200ms后才能点）
const CLICK_DELAY = 200; // 打字完成后可点击的延迟时间（毫秒）
const isFastForwarding = ref(false); // 是否正在快进
let fastForwardTimer = null; // 快进定时器

let clickDelayTimer = null;
let autoNextTimer = null; // 自动下一步定时器
let charIndex = 0,
  acc = 0,
  lastTime = 0,
  rafId = null;
const DEFAULT_CPS = 50; // 兜底默认打字速度：每秒 50 字（当 user.text_speed 不可用时的保底值）
let currentCps = DEFAULT_CPS; // 当前对话的打字速度
let currentInterval = 1000 / DEFAULT_CPS;
let currentParsedText = null; // 当前对话解析后的富文本结构

/**
 * 根据用户设置（菜单「文字速度」滑块）计算默认打字速度 CPS
 * user.text_speed 范围 90~99（数字越大越快）：
 *   - 90（最慢）→ 25 字/秒
 *   - 96（默认）→ 约 62 字/秒
 *   - 99（最快）→ 80 字/秒
 * 该速度对普通对话框和黑屏文字都生效（共用同一打字机）。
 */
function getDefaultCps() {
  const setting = user.text_speed ?? 96;
  const t = Math.min(99, Math.max(90, setting)) - 90; // 0~9
  return Math.round(25 + (t / 9) * 55);
}

const pauseMap = {
  "，": 150,
  ",": 150,
  "。": 200,
  ".": 200,
  "！": 200,
  "!": 200,
  "？": 200,
  "?": 200,
};
const contentContainer = ref(null);
const playerAvatarCanvas = ref(null);
const npcAvatarCanvas = ref(null);
const npcAvatarContainer = ref(null);
const npcContainerRight = ref('-2vw'); // NPC头像容器的right值，动态计算保持中心位置固定

// 打字机步进
function typeStep(now) {
  if (!lastTime) lastTime = now;
  const delta = now - lastTime;
  lastTime = now;
  acc += delta;

  if (!currentDialogue.value) return;
  if (!currentParsedText) return;

  while (acc >= currentInterval && charIndex < currentParsedText.totalChars) {
    const ch = currentParsedText.chars[charIndex];
    charIndex++;
    acc -= currentInterval + (pauseMap[ch] || 0);
  }

  displayedText.value = replacePlayerName(renderRichText(currentParsedText, charIndex));

  nextTick(() => {
    if (contentContainer.value)
      contentContainer.value.scrollTop = contentContainer.value.scrollHeight;
  });

  if (charIndex < currentParsedText.totalChars) {
    rafId = requestAnimationFrame(typeStep);
  } else {
    finished.value = true;
  }
}

// 开始打字机效果
function startTyping() {
  displayedText.value = "";
  charIndex = 0;
  acc = 0;
  lastTime = 0;
  finished.value = false;

  // 解析富文本（直接读当前节点文本，避免依赖缓存导致显示上一句文本）
  const rawText = getDialogueText(currentDialogue.value) || "";
  currentParsedText = parseRichText(rawText);

  // 打字速度优先级：
  //   1. 对话节点配置了 textSpeed（每秒字数）→ 直接用（普通对话框和黑屏文字都生效）
  //   2. 否则用用户设置（菜单「文字速度」滑块）计算出的默认 CPS
  const textSpeed = currentDialogue.value?.textSpeed;
  if (typeof textSpeed === 'number' && textSpeed > 0) {
    currentCps = textSpeed;
  } else {
    currentCps = getDefaultCps();
  }
  currentInterval = 1000 / currentCps;

  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(typeStep);
}


// 监听打字完成
watch(finished, (isFinished) => {
  if (isFinished) {
    // 获取当前对话的可点击延迟时间
    let delay;
    // 如果有 showCg 或 cgAnimation 且设置了 cgClickDelay，用 CG 专用的点击延迟
    const hasCgContent = currentDialogue.value?.showCg || currentDialogue.value?.cgAnimation;
    if (hasCgContent && currentDialogue.value?.cgClickDelay !== undefined) {
      delay = currentDialogue.value.cgClickDelay;
    } else {
      // 否则用普通的 clickDelay，没有就用默认值
      delay = currentDialogue.value?.clickDelay ?? CLICK_DELAY;
    }

    // 打字完成后，延迟指定时间才能点击（快进模式下无延迟）
    if (clickDelayTimer) clearTimeout(clickDelayTimer);
    if (isFastForwarding.value) {
      // 快进模式：立即可以点击
      canClick.value = true;
    } else {
      // 正常模式：延迟后才能点击
      clickDelayTimer = setTimeout(() => {
        canClick.value = true;
      }, delay);
    }

    // 如果配置了 autoNext，打字完成后自动进入下一句（绕过 canClick 检查）
    const autoNextDelay = currentDialogue.value?.autoNext;
    if (typeof autoNextDelay === 'number' && autoNextDelay >= 0) {
      if (autoNextTimer) clearTimeout(autoNextTimer);
      // 快进时时间减半
      const delay = isFastForwarding.value ? Math.round(autoNextDelay / 2) : autoNextDelay;
      autoNextTimer = setTimeout(() => {
        autoNextTimer = null;
        // ⚠️ 昼夜CG播放中：不提前结束对话（否则 endDialogue → duihua=false 会隐藏承载CG的组件，导致CG提前消失）
        //    等CG播放完成回调统一处理（关闭对话框 or 触发后续对话）
        if (user.pixi.dayCgTrigger && isCgVisible.value) {
          return;
        }
        // 如果有选项，不自动跳转
        if (visibleOptions.value.length > 0) return;
        // 如果是结束节点，自动关闭
        if (isEndNode(currentDialogue.value?.end)) {
          endDialogue();
          user.hideDialogue();
          return;
        }
        // 如果有 next，直接跳转（绕过 canClick）
        if (currentDialogue.value?.next) {
          goToDialogue(currentDialogue.value.next);
        }
      }, delay);
    }

    // 如果是结束节点，自动关闭对话框
    // ⚠️ 昼夜CG播放中（dayCgTrigger + CG可见）不自动关闭：dayo1001 等休息节点的结束逻辑
    //    会在打字完成后 800ms 就调用 endDialogue + hideDialogue，把承载CG的组件提前隐藏，
    //    导致昼夜CG动画被切断；由CG播放完成回调统一处理关闭
    if (isEndNode(currentDialogue.value?.end) && !(user.pixi.dayCgTrigger && isCgVisible.value)) {
      const endDelay = isFastForwarding.value ? 100 : 800;
      setTimeout(() => {
        // 定时器触发时再判断一次（CG可能在延迟期间开始播放）
        if (user.pixi.dayCgTrigger && isCgVisible.value) {
          return;
        }
        if (isFastForwarding.value) {
          stopFastForward();
        }
        endDialogue();
        user.hideDialogue();
      }, endDelay);
    }
  } else {
    // 开始新的打字，重置可点击状态
    canClick.value = false;
    if (clickDelayTimer) {
      clearTimeout(clickDelayTimer);
      clickDelayTimer = null;
    }
    // 清除 autoNext 定时器
    if (autoNextTimer) {
      clearTimeout(autoNextTimer);
      autoNextTimer = null;
    }
  }
});

// ========== 战斗准备面板（已移除：战斗统一从世界地图进入） ==========
// ⛔ 讨伐战已移除：不再提供剧情选项"讨伐魔物"进入普通讨伐战斗，
//    仅保留对话自定义战斗（customBattle）与地牢战斗（customBattle 路径）

// 点击跳过或下一段
function handleNext() {
  // hideUI 模式下禁用点击，只靠 autoNext 自动推进
  if (isHideUiMode.value) return;

  // 播放点击音效（快进时不播放，避免连续噪音）
  if (!isFastForwarding.value) {
    playClickSound();
  }

  if (!currentDialogue.value) return;

  // 如果打字机还没完成
  if (!finished.value) {
    // 黑屏模式下不允许跳过，必须等打字完成
    if (isBlackScreenMode.value) {
      return;
    }
    // ⚠️ 节点设置了 textSpeed（自定义打字速度）时，点击不能跳过打字
    //    必须等文字自行显示完毕（快进仍可跳过，见 fastForwardTick）
    if (typeof currentDialogue.value?.textSpeed === 'number' && currentDialogue.value.textSpeed > 0) {
      return;
    }
    // 普通模式：直接显示完整文本
    if (currentParsedText) {
      displayedText.value = replacePlayerName(renderRichText(currentParsedText, currentParsedText.totalChars));
    } else {
      displayedText.value = replacePlayerName(getDialogueText(currentDialogue.value));
    }
    finished.value = true;
    if (rafId) cancelAnimationFrame(rafId);
    // 注意：跳过打字后不立即设置canClick，由watch(finished)统一处理延迟逻辑
    // 确保clickDelay/cgClickDelay在快速点击时也能正确生效，防止连点跳过剧情
    nextTick(() => {
      if (contentContainer.value)
        contentContainer.value.scrollTop = contentContainer.value.scrollHeight;
    });
    return;
  }

  // 打字完成了，但还没到可点击时间（快进模式下跳过此检查）
  if (!canClick.value && !isFastForwarding.value) {
    return;
  }

  // 如果有选项，不处理点击（等用户选选项），同时停止快进
  if (visibleOptions.value.length > 0) {
    if (isFastForwarding.value) {
      stopFastForward();
    }
    return;
  }

  // 如果对话标记为结束
  if (isEndNode(currentDialogue.value.end)) {
    if (isFastForwarding.value) {
      stopFastForward();
    }
    endDialogue();
    user.hideDialogue();
    return;
  }

  // 清除 autoNext 定时器（用户手动点击时取消自动跳转）
  if (autoNextTimer) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }

  // 如果有 next 字段，跳到下一条对话
  if (currentDialogue.value.next) {
    goToDialogue(currentDialogue.value.next);
  }
}

// 🎨 选项按钮配色：每个选项上的 optionBg=背景色 / optionColor=文字色；未配置时用默认蓝底白字
function optionBtnStyle(opt) {
  const bg = opt?.optionBg, color = opt?.optionColor
  if (!bg && !color) return {}
  const s = {}
  if (bg) s.backgroundColor = bg
  if (color) s.color = color
  return s
}
// 选择选项
function handleChooseOption(optionIndex, opt) {
  // 禁用的选项不响应
  if (opt?.disabled) return;

  // 🎒 物品软检查：有 needItem 且是软检查模式时，背包物品不足弹提示不执行
  if (opt?.needItem && opt?.softItemCheck) {
    const store = useCounterStore();
    if (!store.hasInventoryItem?.(opt.needItem, opt.needItemNum ?? 1)) {
      ElMessText(`${L("needItem")}${formatItemRequirement(opt)}`, "warning");
      return;
    }
  }

  // 💗 好感度软检查：有 needAffection 且是软检查模式时，好感未达标弹提示不执行
  if (opt?.needAffection && opt?.softAffectionCheck) {
    const store = useCounterStore();
    if (!store.hasNpcAffection?.(opt.needAffection)) {
      ElMessText(`${L("needAffection")}${formatAffectionRequirement(opt)}`, "warning");
      return;
    }
  }

  // 播放点击音效（快进时不播放，避免噪音）
  if (!isFastForwarding.value) {
    playClickSound();
  }

  // 还没到可点击时间（快进模式下跳过）
  if (!canClick.value && !isFastForwarding.value) return;

  // 选择选项时停止快进
  if (isFastForwarding.value) {
    stopFastForward();
  }

  // 清除 autoNext 定时器
  if (autoNextTimer) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }

  // 直接使用可见选项中的 originalIndex（原始索引）
  const visibleOpt = visibleOptions.value[optionIndex];
  if (!visibleOpt) return;

  // 使用原始索引调用 chooseOption
  if (typeof visibleOpt.originalIndex === 'number') {
    chooseOption(visibleOpt.originalIndex);
  }
}

// 格式化选项的物品需求文案（needItem: string|string[]，needItemNum: number）
function formatItemRequirement(opt) {
  if (!opt?.needItem) return ''
  const num = opt.needItemNum ?? 1
  const list = Array.isArray(opt.needItem) ? opt.needItem : [opt.needItem]
  return list.map(n => `${n}×${num}`).join('、')
}

// 格式化选项的好感度需求文案（needAffection: {npc, min} 或数组）
function formatAffectionRequirement(opt) {
  if (!opt?.needAffection) return ''
  const store = useCounterStore()
  const list = Array.isArray(opt.needAffection) ? opt.needAffection : [opt.needAffection]
  return list.filter(r => r?.npc).map(r => {
    const name = store.getNpcInfo?.(r.npc)?.name || r.npc
    return `${name} ${L("affection")}≥${r.min ?? 0}`
  }).join('、')
}

// 切换快进状态
function toggleFastForward() {
  if (isFastForwarding.value) {
    stopFastForward();
  } else {
    startFastForward();
  }
}

// 开始快进
function startFastForward() {
  isFastForwarding.value = true;
  // console.log('[快进] 开始快进');

  // 立即触发一次
  fastForwardTick();
}

// 停止快进
function stopFastForward() {
  isFastForwarding.value = false;
  if (fastForwardTimer) {
    clearTimeout(fastForwardTimer);
    fastForwardTimer = null;
  }
  // console.log('[快进] 停止快进');
}

// 快进执行一次
function fastForwardTick() {
  if (!isFastForwarding.value) return;
  if (!isDialogueActive.value) {
    stopFastForward();
    return;
  }

  // 如果有选项，停止快进
  if (visibleOptions.value.length > 0) {
    stopFastForward();
    return;
  }

  // 如果是结束节点，停止快进
  if (isEndNode(currentDialogue.value?.end)) {
    stopFastForward();
    return;
  }

  // 如果打字还没完成，先完成打字
  if (!finished.value) {
    // 黑屏模式下不能跳过打字，等待
    if (isBlackScreenMode.value) {
      fastForwardTimer = setTimeout(fastForwardTick, 50);
      return;
    }
    // 直接显示完整文本
    if (currentParsedText) {
      displayedText.value = replacePlayerName(renderRichText(currentParsedText, currentParsedText.totalChars));
    } else {
      displayedText.value = replacePlayerName(getDialogueText(currentDialogue.value));
    }
    finished.value = true;
    if (rafId) cancelAnimationFrame(rafId);
    nextTick(() => {
      if (contentContainer.value)
        contentContainer.value.scrollTop = contentContainer.value.scrollHeight;
    });
  }

  // hideUI 模式：不调 handleNext，等 autoNext 自然触发
  if (isHideUiMode.value) {
    // 如果已经触发了 autoNext 定时器，等它完成
    if (autoNextTimer) {
      fastForwardTimer = setTimeout(fastForwardTick, 100);
    } else if (currentDialogue.value?.next || isEndNode(currentDialogue.value?.end)) {
      // autoNext 已执行但还没跳到下一节点，等 nextTick
      fastForwardTimer = setTimeout(fastForwardTick, 50);
    } else {
      // 没有 autoNext 然后当前节点没 next → 结束
      stopFastForward();
    }
    return;
  }

  // 如果可以点击了，进入下一句
  if (canClick.value || finished.value) {
    // 延迟一小段时间再进入下一句，避免太快看不清
    fastForwardTimer = setTimeout(() => {
      if (isFastForwarding.value) {
        handleNext();
        // 下一句加载后继续快进
        nextTick(() => {
          fastForwardTick();
        });
      }
    }, 50);
  } else {
    // 等待canClick变为true
    fastForwardTimer = setTimeout(fastForwardTick, 20);
  }
}

// 可见的选项（从对话系统缓存读取，避免重复计算）
const visibleOptions = computed(() => {
  if (!currentDialogue.value) return [];
  return getVisibleOptions(); // 不传参数，读缓存
});

// 光标闪烁
const showCursor = ref(true);
const cursorInterval = setInterval(() => (showCursor.value = !showCursor.value), 500);

// 暴露方法给外部调用
defineExpose({
  startDialogue,
  goToDialogue,
  endDialogue
});

onMounted(async () => {
  // 如果有默认对话可以在这里开始
  // startDialogue("start");

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);

  // 初始化CG应用（canvas常驻，只初始化一次）
  await nextTick();
  await initCgApp();

  // 初始化头像
  await initPlayerAvatar();
  await initNpcAvatarApp();

  // 初始化说话者姓名
  if (currentDialogue.value && 'name' in currentDialogue.value) {
    let _n = currentDialogue.value.name || '';
    // 📛 莫奇自我介绍(sr37)后，商人对话姓名显示「莫奇」
    if (_n === '商人' && user.getDialogueFlag?.('moqiName')) _n = '莫奇';
    currentSpeakerName.value = _n;
  }

  // 如果当前有对话且有 onStage 字段，应用在场列表并显示 NPC 头像
  if (currentDialogue.value && 'onStage' in currentDialogue.value) {
    const onStage = currentDialogue.value.onStage;

    if (onStage === "" || (Array.isArray(onStage) && onStage.length === 0)) {
      // 空字符串或空数组：隐藏所有
      hideAllNpcAvatars();
    } else {
      // 解析在场列表和说话者
      let npcList = [];
      let speakingName = null;

      if (typeof onStage === 'string') {
        npcList = [onStage];
        speakingName = onStage;
      } else if (Array.isArray(onStage)) {
        npcList = [...onStage];
        speakingName = onStage[0] || null;
      }

      if (npcList.length > 0) {
        applyOnStageNpcList(npcList, speakingName);
      }
    }
  }

  // 初始化头像显示状态（CG不显示时淡入，CG显示时保持淡出）
  if (!isCgVisible.value) {
    // 玩家头像：根据 currentPlayerAvatar 决定显示/隐藏
    if (currentPlayerAvatar.value !== false) {
      fadeInPlayerAvatar(0); // 立即显示，无动画
    } else {
      fadeOutPlayerAvatar(0); // 立即隐藏
    }
    // 淡入所有在场 NPC
    onStageNpcList.value.forEach((name) => {
      fadeInNpcAvatar(name, 0); // 立即显示，无动画
    });
  }

  // 初始化灰度状态
  updateAvatarGrayscaleState();
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (autoNextTimer) clearTimeout(autoNextTimer);
  if (clickDelayTimer) clearTimeout(clickDelayTimer);
  if (fastForwardTimer) clearTimeout(fastForwardTimer);
  clearInterval(cursorInterval);

  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);

  // 销毁 CG 应用
  destroyCgApp();

  // 销毁头像
  destroyPlayerAvatarApp();
  destroyNpcAvatarApp();
});
</script>

<style scoped>
/* 全屏点击层（透明，无点击高亮） */
.dialog-click-overlay {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

/* 对话框去点击高亮 */
.dialog-box {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  cursor: pointer;
}

/* 说话者姓名：整体亮色显示（颜色由内联样式按人物动态设置） */
.speaker-name {
  -webkit-text-fill-color: currentColor;
  text-shadow: 0 0.2vh 0.4vh rgba(0, 0, 0, 0.6);
}

/* 选项按钮默认样式 */
.option-btn {
  background-color: #409EFF;
  color: white;
  cursor: pointer;
  transition: opacity 0.2s;
  pointer-events: auto;
}

/* 选项物品需求提示（needItem） */
.option-need {
  font-size: 2vh;
  opacity: 0.85;
  margin-left: 1vh;
  white-space: nowrap;
}

/* 选项禁用样式（已选过变灰 / 物品不足） */
.option-disabled {
  background-color: #909399 !important;
  opacity: 0.6;
  cursor: not-allowed;
}

.animate-blink {
  animation: blink 1s step-start infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.next-icon {
  color: white !important;
  opacity: 0.85;
  animation: arrow-float 1.2s ease-in-out infinite;
}

@keyframes arrow-float {
  0% {
    transform: translateY(0);
    opacity: 0.3;
  }

  50% {
    transform: translateY(6px);
    opacity: 1;
  }

  100% {
    transform: translateY(0);
    opacity: 0.3;
  }
}

.scroll-smooth {
  scroll-behavior: smooth;
}

/* 黑屏模式打字光标闪烁 */
.typing-cursor {
  display: inline-block;
  animation: cursor-blink 0.8s step-end infinite;
  margin-left: 2px;
}

@keyframes cursor-blink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

/* 禁用点击高亮 */
.black-screen-container {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  outline: none;
}
</style>
