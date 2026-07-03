<template>
  <!-- CG 层（v-show常驻canvas，避免销毁重建报错） -->
  <div
    v-show="isCgVisible"
    ref="cgContainer"
    class="fixed inset-0 z-40 bg-black flex items-center justify-center overflow-hidden"
  >
    <canvas 
      ref="cgCanvas" 
      class="block"
      style="aspect-ratio: 16/9; width: min(100vw, calc(100vh * 16/9)); height: min(100vh, calc(100vw * 9/16));"
    ></canvas>
  </div>

  <!-- 对话框 -->
  <div class="fixed bottom-[0.8vh] left-1/2 -translate-x-1/2 w-[90vw] h-[26vh] z-50">
    <div
      class="bg-black/50 text-white  px-2vw box-border flex flex-col h-full relative"
    >
      <!-- 玩家头像 - 左边（CG显示时隐藏） -->
      <div
        v-if="!isCgVisible"
        class="w-40vh h-50vh bottom-10vh absolute left-4vw -z-1 rounded flex-shrink-0 text-xs"
      >
        <img
          :src="Img('zhujue')"
          class="w-full h-full object-contain pointer-events-none"
        />
      </div>
      
      <!-- NPC头像 - 右边（有头像才显示，CG显示时隐藏） -->
      <div
        v-if="currentDialogue?.avatar && !isCgVisible"
        class="w-40vh h-50vh bottom-10vh absolute right-0 -z-1 rounded flex-shrink-0 text-xs"
      >
        <img
          :src="Img(currentDialogue.avatar)"
          class="w-full h-full object-contain pointer-events-none"
        />
      </div>
      
      <!-- 内容滚动区域 -->
      <div
        ref="contentContainer"
        class="flex-1 overflow-y-auto scroll-smooth whitespace-pre-wrap break-words mt-1.5vh"
        @click="handleNext"
      >
        <div v-if="currentDialogue" class="flex items-start gap-3 mb-2">
          <div class="flex-1 flex flex-col">
            <!-- 姓名（旁白/系统不显示） -->
            <div
              v-if="showName"
              class="font-bold text-[4vh] mb-1 absolute bottom-25.2vh iconfont2 bg-black/50 px-2vw rounded-2 py-1vh left-0"
            >
              {{ currentDialogue.name }}
            </div>

            <!-- 表情 + 文本 -->
            <div class="flex flex-col gap-1 py-1vh w-full">
              <span v-html="displayedText" class="text-[5vh] iconfont2 block w-full leading-relaxed" style="word-break: break-word; word-wrap: break-word; white-space: pre-wrap;"></span>
            </div>
          </div>
        </div>

        <!-- 分支选项 -->
        <div
          v-if="finished && visibleOptions.length > 0"
          class="mt-2 flex flex-wrap gap-4"
        >
          <el-button
            v-for="(opt, i) in visibleOptions"
            size="small"
            :key="i"
            type="primary"

            @click.stop="handleChooseOption(i)"
            >{{ opt.text }}</el-button
          >
        </div>
      </div>

      <!-- 尾随箭头 -->
      <div
        v-if="finished && visibleOptions.length === 0 && !currentDialogue?.end"
        class="absolute bottom-2 right-[5%]"
      >
        <el-icon class="next-icon" color="white">
          <CaretBottom />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from "vue";
import { useCounterStore } from "@/store/counter";
import { 
  currentDialogue, 
  startDialogue, 
  goToDialogue, 
  chooseOption, 
  endDialogue,
  getDialogueText,
  getVisibleOptions,
  isDialogueActive,
  // CG 相关
  isCgVisible,
  currentCgName,
  currentCgAnimation,
} from "./dialogue/index.js";

// PixiJS 和 Spine
import { Application, Container } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

const user = useCounterStore();

const Img = (src) => {
  return new URL(`../../assets/fullBody/head/${src}.webp`, import.meta.url)
    .href;
};

// 是否显示姓名（旁白/系统不显示）
const showName = computed(() => {
  if (!currentDialogue.value?.name) return false;
  const name = currentDialogue.value.name;
  // 系统、旁白不显示姓名
  if (name === '系统' || name === '旁白' || name === '') return false;
  return true;
});

// ========================
// CG 相关
// ========================
const cgContainer = ref(null);
const cgCanvas = ref(null);

// PixiJS 应用和 CG spine 实例
let cgApp = null;
let cgSpine = null;
let cgContainerPixi = null;

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
    
    if (screenWidth / screenHeight > 16/9) {
      // 屏幕更宽，以高度为准
      canvasHeight = screenHeight;
      canvasWidth = canvasHeight * 16/9;
    } else {
      // 屏幕更高，以宽度为准
      canvasWidth = screenWidth;
      canvasHeight = canvasWidth * 9/16;
    }
    
    console.log('[对话组件] CG初始化尺寸:', canvasWidth, canvasHeight);
    
    cgApp = new Application();
    await cgApp.init({
      view: cgCanvas.value,
      width: canvasWidth,
      height: canvasHeight,
      backgroundAlpha: 0,
      autoStart: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    
    cgContainerPixi = new Container();
    cgApp.stage.addChild(cgContainerPixi);
    
    console.log('[对话组件] CG PixiJS 应用初始化完成');
  } catch (e) {
    console.error('[对话组件] CG PixiJS 应用初始化失败:', e);
  }
}

/**
 * 显示 CG
 */
async function showCgSpine() {
  const cgName = currentCgName.value;
  if (!cgName || !cgApp) return;
  
  // 先销毁旧的
  destroyCgSpine();
  
  try {
    const skelName = `${cgName}_skel`;
    const atlasName = `${cgName}_atlas`;
    
    // 创建 Spine 实例
    cgSpine = new Spine({
      skeleton: skelName,
      atlas: atlasName,
    });
    
    if (!cgSpine) {
      console.error('[对话组件] CG Spine 创建失败');
      return;
    }
    
    // 获取可用动画列表
    const animations = cgSpine.skeleton.data.animations;
    let animName = currentCgAnimation.value;
    
    // 如果没有指定动画，播放第一个
    if (!animName && animations && animations.length > 0) {
      animName = animations[0].name;
    }
    
    // 播放动画（不循环，播完停在最后一帧）
    if (animName) {
      const trackEntry = cgSpine.state.setAnimation(0, animName, false);
      trackEntry.loop = false;
      // 动画播放完成后停在最后一帧
      trackEntry.listener = {
        complete: () => {
          console.log(`[对话组件] CG动画 ${animName} 播放完成，停在最后一帧`);
        }
      };
    }
    
    // 添加到容器
    cgContainerPixi.addChild(cgSpine);
    
    // 等待Spine初始化完成，多帧重试直到bounds有效
    let retryCount = 0;
    const tryResize = () => {
      const bounds = cgSpine.getBounds();
      if (bounds.width > 0 && bounds.height > 0) {
        resizeCgSpine();
        console.log('[对话组件] CG resize成功', bounds.width, bounds.height);
      } else if (retryCount < 10) {
        retryCount++;
        requestAnimationFrame(tryResize);
      } else {
        console.warn('[对话组件] CG bounds获取失败，使用默认缩放');
        // 默认缩放
        cgSpine.scale.set(1);
        cgSpine.x = cgApp.renderer.width / 2;
        cgSpine.y = cgApp.renderer.height / 2;
      }
    };
    requestAnimationFrame(tryResize);
    
    console.log(`[对话组件] CG 显示: ${cgName}, 动画: ${animName}`);
  } catch (e) {
    console.error('[对话组件] CG 显示失败:', e);
  }
}

/**
 * 调整 CG 大小，cover 模式（填满画布，不留间隙）
 */
function resizeCgSpine() {
  if (!cgSpine || !cgApp) return;
  
  const canvasWidth = cgApp.renderer.width;
  const canvasHeight = cgApp.renderer.height;
  
  // 获取 spine 原始尺寸
  const bounds = cgSpine.getBounds();
  const spineWidth = bounds.width;
  const spineHeight = bounds.height;
  
  console.log('[对话组件] CG resize:', { canvasWidth, canvasHeight, spineWidth, spineHeight, bounds });
  
  if (spineWidth === 0 || spineHeight === 0) return;
  
  // cover模式：取较大的缩放比例，填满画布不留间隙
  const scaleX = canvasWidth / spineWidth;
  const scaleY = canvasHeight / spineHeight;
  const scale = Math.max(scaleX, scaleY);
  
  cgSpine.scale.set(scale);
  
  // 居中
  cgSpine.x = canvasWidth / 2 - bounds.x * scale - spineWidth * scale / 2;
  cgSpine.y = canvasHeight / 2 - bounds.y * scale - spineHeight * scale / 2;
}

/**
 * 切换 CG 动画
 */
function changeCgAnimation() {
  if (!cgSpine || !currentCgAnimation.value) return;
  
  try {
    const trackEntry = cgSpine.state.setAnimation(0, currentCgAnimation.value, false);
    trackEntry.loop = false;
    console.log(`[对话组件] CG 动画切换: ${currentCgAnimation.value}`);
  } catch (e) {
    console.error('[对话组件] CG 动画切换失败:', e);
  }
}

/**
 * 销毁 CG spine
 */
function destroyCgSpine() {
  if (cgSpine && cgContainerPixi) {
    try {
      cgContainerPixi.removeChild(cgSpine);
      cgSpine.destroy();
    } catch (e) {
      console.warn('[对话组件] CG Spine销毁警告:', e.message);
    }
    cgSpine = null;
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
      cgApp.destroy(true, { children: true });
    } catch (e) {
      console.warn('[对话组件] CG App销毁警告:', e.message);
    }
    cgApp = null;
    cgContainerPixi = null;
  }
}

// 监听 CG 显示状态
watch(isCgVisible, async (visible) => {
  if (visible) {
    // 显示 CG：只创建Spine（cgApp已在onMounted初始化）
    showCgSpine();
  } else {
    // 隐藏 CG：只移除Spine，不销毁cgApp（canvas常驻）
    destroyCgSpine();
  }
});

// 监听 CG 动画变化
watch(currentCgAnimation, () => {
  if (isCgVisible.value && cgSpine) {
    changeCgAnimation();
  }
});

// 监听窗口大小变化
function handleResize() {
  if (!cgApp) return;
  
  // 重新计算16:9尺寸
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  let canvasWidth, canvasHeight;
  
  if (screenWidth / screenHeight > 16/9) {
    canvasHeight = screenHeight;
    canvasWidth = canvasHeight * 16/9;
  } else {
    canvasWidth = screenWidth;
    canvasHeight = canvasWidth * 9/16;
  }
  
  // 更新渲染器尺寸
  cgApp.renderer.resize(canvasWidth, canvasHeight);
  
  // 重新调整Spine大小
  if (cgSpine) {
    resizeCgSpine();
  }
}

// 打字机效果相关
const displayedText = ref("");
const finished = ref(false);

let charIndex = 0,
  acc = 0,
  lastTime = 0,
  rafId = null;
const cps = 50, // 打字速度：每秒 50 字
  interval = 1000 / cps;
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

// 打字机步进
function typeStep(now) {
  if (!lastTime) lastTime = now;
  const delta = now - lastTime;
  lastTime = now;
  acc += delta;

  if (!currentDialogue.value) return;

  const text = getDialogueText() || ""; // 不传参数，读缓存

  while (acc >= interval && charIndex < text.length) {
    const ch = text[charIndex++];
    displayedText.value += ch === "\n" ? "<br>" : ch;
    acc -= interval + (pauseMap[ch] || 0);
  }

  nextTick(() => {
    if (contentContainer.value)
      contentContainer.value.scrollTop = contentContainer.value.scrollHeight;
  });

  if (charIndex < text.length) {
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
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(typeStep);
}

// 监听对话变化，重新开始打字
watch(currentDialogue, (newDialogue) => {
  if (newDialogue) {
    startTyping();
  }
});

// 监听打字完成，如果是结束节点，自动关闭对话框
watch(finished, (isFinished) => {
  if (isFinished && currentDialogue.value?.end) {
    // 延迟一点再关闭，让用户看完最后一句话
    setTimeout(() => {
      endDialogue();
      user.hideDialogue();
    }, 800);
  }
});

// 点击跳过或下一段
function handleNext() {
  if (!currentDialogue.value) return;

  // 如果打字机还没完成，直接显示完整文本
  if (!finished.value) {
    displayedText.value = getDialogueText(currentDialogue.value);
    finished.value = true;
    if (rafId) cancelAnimationFrame(rafId);
    nextTick(() => {
      if (contentContainer.value)
        contentContainer.value.scrollTop = contentContainer.value.scrollHeight;
    });
    return;
  }

  // 如果有选项，不处理点击（等用户选选项）
  if (visibleOptions.value.length > 0) {
    return;
  }

  // 如果对话标记为结束
  if (currentDialogue.value.end) {
    endDialogue();
    user.hideDialogue();
    return;
  }

  // 如果有 next 字段，跳到下一条对话
  if (currentDialogue.value.next) {
    goToDialogue(currentDialogue.value.next);
  }
}

// 选择选项
function handleChooseOption(optionIndex) {
  // 直接使用可见选项中的 originalIndex（原始索引）
  const visibleOpt = visibleOptions.value[optionIndex];
  if (!visibleOpt) return;

  // 使用原始索引调用 chooseOption
  if (typeof visibleOpt.originalIndex === 'number') {
    chooseOption(visibleOpt.originalIndex);
  }
}

// 可见的选项（从对话系统缓存读取，避免重复计算）
const visibleOptions = computed(() => {
  if (!currentDialogue.value) return [];
  return getVisibleOptions(); // 不传参数，读缓存
});

// 光标闪烁
const showCursor = ref(true);
setInterval(() => (showCursor.value = !showCursor.value), 500);

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
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);
  
  // 销毁 CG 应用
  destroyCgApp();
});
</script>

<style scoped>
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
</style>
