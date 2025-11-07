<template>
  <div class="fullscreen-player">
    <video ref="video" v-show="isReady" @canplay="isReady = true" :src="videoSrc" autoplay muted loop playsinline webkit-playsinline preload="auto" class="video-el" />

    <!-- 控制按钮 -->
    <div class="controls">
      <button @click="togglePlay">
        {{ isPlaying ? "暂停" : "播放" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

// 视频路径（换成你自己的）
const videoSrc = ref(new URL("@/assets/donghua/huli1.webm", import.meta.url).href);
const isReady = ref(false);
const video = ref(null);
const isPlaying = ref(true);

// 播放/暂停切换
const togglePlay = () => {
  if (!video.value) return;

  if (isPlaying.value) {
    video.value.pause();
  } else {
    console.log("触发");
    video.value.load();
    video.value.play();
  }
  isPlaying.value = !isPlaying.value;
};
</script>

<style scoped>
.fullscreen-player {
  position: fixed;
  inset: 0;
  width: 50vw;
  height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.video-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 控制按钮样式 */
.controls {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
}

button {
  padding: 10px 20px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
button:hover {
  background: rgba(255, 255, 255, 1);
}
</style>
