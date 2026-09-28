<!--
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:50:23
 * @LastEditTime: 2025-05-16 17:03:49
-->

<template>
  <LandscapeOnly>
    <router-view />
  </LandscapeOnly>

  <!-- 桌面端自动更新提示 -->
  <div v-if="showUpdateDialog" class="fixed inset-0 z-[99999] flex items-center justify-center">
    <!-- 遮罩 -->
    <div class="absolute inset-0 bg-black/60" @click="onMaskClick"></div>

    <!-- 对话框 -->
    <div class="relative w-[420px] max-w-[90vw] bg-white rounded-xl shadow-2xl p-6 text-black select-none">
      <div class="text-xl font-bold mb-3 flex items-center gap-2">
        <span class="inline-block w-2.5 h-2.5 rounded-full" :class="dotClass"></span>
        {{ dialogTitle }}
      </div>

      <div class="text-sm text-gray-600 leading-relaxed mb-4 min-h-[60px] whitespace-pre-wrap">
        {{ dialogMessage }}
      </div>

      <!-- 下载进度条 -->
      <div v-if="updaterPhase === 'downloading'" class="mb-4">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>正在下载更新...</span>
          <span>{{ downloadPercent.toFixed(1) }}%</span>
        </div>
        <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-blue-500 rounded-full transition-all duration-300"
            :style="{ width: downloadPercent + '%' }"></div>
        </div>
      </div>

      <!-- 按钮区 -->
      <div class="flex justify-end gap-3">
        <button v-if="updaterPhase === 'available' || updaterPhase === 'error'"
          class="px-4 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-sm transition-colors"
          @click="closeUpdateDialog">
          暂不更新
        </button>
        <button v-if="updaterPhase === 'available'"
          class="px-4 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors"
          @click="startDownload">
          立即更新
        </button>
        <button v-if="updaterPhase === 'downloaded'"
          class="px-4 py-1.5 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm transition-colors"
          @click="quitAndInstall">
          重启并安装
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import LandscapeOnly from "./zujian/LandscapeOnly.vue";
import gsap from "gsap"; // 🎨 UI 微交互：全局按钮按压缩放

// 🎛️ 管理员全局快捷键：F8 直达对话管理系统（管理员专用，无 UI 入口，普通玩家不可见）
const router = useRouter();
function onAdminHotkey(e) {
  if (e.key === "F8") {
    e.preventDefault();
    if (router.currentRoute.value.path !== "/dladmin") router.push("/dladmin");
  }
}

const videos = import.meta.glob("@/assets/lihui/*.webm", { eager: true });
const videos2 = import.meta.glob("@/assets/donghua/*.webm", { eager: true });
const icons = import.meta.glob("@/assets/icon/*.{png,webp}", { eager: true });
const bgImg = import.meta.glob("@/assets/images/*.{webp}", { eager: true });
const teshu = import.meta.glob("@/assets/teshu/*.{webp}", { eager: true });
const head = import.meta.glob("@/assets/fullBody/head/*.{webp}", { eager: true });
const body = import.meta.glob("@/assets/fullBody/fullbody/*.{webp}", { eager: true });
const daoju = import.meta.glob("@/assets/daoju/*.{webp}", { eager: true });
// 合并资源对象
const allAssets = { ...videos, ...videos2, ...icons, ...bgImg,...teshu,...head,...body,...daoju };

// =====================
// 桌面端自动更新（electron-updater）
// =====================
const isDesktop = typeof window !== 'undefined' && !!window.desktop?.isDesktop;
const showUpdateDialog = ref(false);
const updaterPhase = ref('idle'); // checking | available | downloading | downloaded | not-available | error
const downloadPercent = ref(0);
const newVersion = ref('');
const updateError = ref('');

// 取消订阅函数（卸载时清理）
let unsubscribeStatus = null;
let unsubscribeProgress = null;
let unsubscribeError = null;

const dialogTitle = computed(() => {
  switch (updaterPhase.value) {
    case 'available': return '发现新版本';
    case 'downloading': return '正在下载更新';
    case 'downloaded': return '更新已就绪';
    case 'error': return '更新失败';
    case 'not-available': return '已是最新版本';
    default: return '检查更新';
  }
});

const dialogMessage = computed(() => {
  switch (updaterPhase.value) {
    case 'available':
      return `发现新版本 v${newVersion.value}，是否立即下载更新？\n更新后可获得最新内容与修复。`;
    case 'downloading':
      return `正在下载 v${newVersion.value}，请稍候...`;
    case 'downloaded':
      return `v${newVersion.value} 已下载完成，点击「重启并安装」完成更新。`;
    case 'error':
      return `检查/下载更新失败：${updateError.value}\n请检查网络后重试，或前往官网手动下载。`;
    case 'not-available':
      return '当前已是最新版本。';
    default:
      return '正在检查更新...';
  }
});

const dotClass = computed(() => {
  switch (updaterPhase.value) {
    case 'available':
    case 'downloaded': return 'bg-green-500';
    case 'downloading': return 'bg-blue-500 animate-pulse';
    case 'error': return 'bg-red-500';
    case 'not-available': return 'bg-gray-400';
    default: return 'bg-yellow-500';
  }
});

function initUpdater() {
  if (!isDesktop || !window.desktop?.updater) return;

  // 订阅状态事件
  unsubscribeStatus = window.desktop.updater.onStatus((payload) => {
    const { status, version } = payload || {};
    if (status === 'checking') {
      updaterPhase.value = 'checking';
    } else if (status === 'available') {
      newVersion.value = version;
      updaterPhase.value = 'available';
      showUpdateDialog.value = true;
    } else if (status === 'not-available') {
      updaterPhase.value = 'not-available';
    } else if (status === 'downloaded') {
      newVersion.value = version;
      updaterPhase.value = 'downloaded';
    }
  });

  // 订阅进度
  unsubscribeProgress = window.desktop.updater.onProgress((payload) => {
    downloadPercent.value = payload?.percent ?? 0;
    if (updaterPhase.value === 'idle' || updaterPhase.value === 'available') {
      updaterPhase.value = 'downloading';
    }
  });

  // 订阅错误
  unsubscribeError = window.desktop.updater.onError((payload) => {
    updateError.value = payload?.message || '未知错误';
    updaterPhase.value = 'error';
    showUpdateDialog.value = true;
  });
}

function onMaskClick() {
  // 下载中不允许关闭（防止误关中断下载）
  if (updaterPhase.value === 'downloading') return;
  closeUpdateDialog();
}

function closeUpdateDialog() {
  showUpdateDialog.value = false;
}

async function startDownload() {
  updaterPhase.value = 'downloading';
  const res = await window.desktop?.updater?.download();
  if (res && !res.ok) {
    updateError.value = res.message || '下载失败';
    updaterPhase.value = 'error';
  }
}

function quitAndInstall() {
  window.desktop?.updater?.quitAndInstall();
}

onMounted(async () => {
  window.addEventListener("keydown", onAdminHotkey);
  initUpdater();

  // 2️⃣ 获取所有 URL 并过滤 undefined
  const urls = Object.values(allAssets)
    .map((mod) => mod?.default)
    .filter(Boolean);

  console.log(`🧩 需要预加载的资源数量: ${urls.length}`);

  const start = performance.now();

  // 3️⃣ 并行加载所有资源（容错：单个失败不影响整体）
  const results = await Promise.allSettled(
    urls.map(
      (url) =>
        new Promise((resolve, reject) => {
          if (url.endsWith(".webm")) {
            const video = document.createElement("video");
            video.src = url;
            video.preload = "auto";
            video.oncanplaythrough = () => resolve(url);
            video.onerror = () => reject(new Error(`视频加载失败: ${url}`));
          } else {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(url);
            img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
          }
        })
    )
  );

  const end = performance.now();
  
  // 统计成功/失败数量
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failedResults = results.filter(r => r.status === 'rejected');
  
  console.log(`✅ 资源预加载完成，成功 ${successCount}/${urls.length}，用时 ${((end - start) / 1000).toFixed(2)} 秒`);
  
  if (failedResults.length > 0) {
    console.warn(`⚠️ 有 ${failedResults.length} 个资源加载失败:`);
    failedResults.forEach(r => console.warn(r.reason));
  }
});

onBeforeUnmount(() => {
  // 清理事件订阅
  unsubscribeStatus?.();
  unsubscribeProgress?.();
  unsubscribeError?.();
  window.removeEventListener("keydown", onAdminHotkey);
});
</script>

<style>
* {
  padding: 0;
  margin: 0;
  user-select: none;
  font-family: Arial !important;
}
.aspect-ratio-16-9 {
  position: relative;
  background-color: #f0f0f0;
}
.aspect-ratio-16-9 video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
img {
  -webkit-touch-callout: none; /* iOS 禁止弹出菜单 */
  -webkit-user-select: none; /* 禁止选择 */
  user-select: none; /* 标准属性 */
  -webkit-user-drag: none; /* 禁止在 Webkit 浏览器中拖动 */
  /* ⚠️ 移除了 img 上的 touch-action:none，否则手指落在图片上开始滑动时，
     所在的可滚动面板会被拦截而无法滚动。 */
}
.el-message__icon {
  display: none !important;
}
</style>
