<!--
 * @作者: 冯星悦
 * @Date: 2025-04-15 15:55:21
 * @LastEditTime: 2025-07-23 09:24:36
-->
<template>
  <!-- animate__animated animate__wobble -->
  <div class="flex w-full h-100vh">
    <div class="z-1 flex" v-if="startSelect.index === 0">
      <div class="flex flex-col text-white iconfont2 mt-18vh pt-2vh px-3vw rounded-5 gap-y-3 font-bold">
        <span v-for="(item, index) of info" :key="index">
          <span class="bg-#409EFF/50 px-2vw py-1vh rounded-2" @click="enter(index)">{{ item }}</span>
        </span>
      </div>
      <!-- <div class="w-50% h-full text-white font-bold iconfont2 text-4vw flex justify-end">
        <div class="mt-10vh gradient-text">名为自由的彼岸</div>
      </div> -->
      <video poster="@/assets/lihuiImg/zhujue1.webp" :src="jueseDonghua" autoplay muted loop playsinline webkit-playsinline preload="auto" class="absolute pointer-events-none z-10 h-120vh mt-24vh -right-15 select-none" />
    </div>
    <div v-else class="w-full h-full relative flex items-center justify-center z-1">
      <!-- 背景视频 -->
      <video poster="@/assets/lihuiImg/heiping.webp" src="@/assets/donghua/waterBg.webm" autoplay muted loop playsinline webkit-playsinline preload="auto" class="absolute w-full h-full object-cover pointer-events-none" />

      <template v-if="startSelect.index === 1">
        <div class="absolute top-1/5 w-full text-center text-white text-36px font-bold iconfont2 opacity-0 animate-fadeIn">如果让你选择，你希望主角的性别是？</div>
        <div class="flex space-x-30vw z-10 mt-5vh opacity-0 animate-floatUp" :class="{ 'pointer-events-none': !startSelect.animationFinished }">
          <button @touchstart="selectGender('male', 0)" class="px-8 py-5 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-400 transition iconfont2 text-26px">男性</button>
          <button @touchstart="selectGender('female', 0)" class="px-8 py-5 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-400 transition iconfont2 text-26px">女性</button>
        </div>
      </template>
      <template v-else>
        <div class="absolute top-1/5 w-full text-center text-white text-36px font-bold iconfont2 opacity-0 animate-fadeIn">你觉得你是一个什么样的人？</div>
        <div class="flex space-x-30vw z-10 mt-5vh opacity-0 animate-floatUp" :class="{ 'pointer-events-none': !startSelect.animationFinished }">
          <button
            @touchstart="selectGender('pureKind', 1)"
            class="px-8 py-5 font-bold rounded-lg text-26px iconfont2 transition"
            :style="{
              background: 'linear-gradient(135deg, #FFFAE5, #FFD8A8)',
              color: '#000',
            }">
            善良
          </button>

          <!-- 冷漠理智按钮 -->
          <button
            @touchstart="selectGender('coldRational', 1)"
            class="px-8 py-5 font-bold rounded-lg text-26px iconfont2 transition"
            :style="{
              background: 'linear-gradient(135deg, #B0C4DE, #778899)',
              color: '#fff',
            }">
            理智
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useCounterStore } from "@/store/counter"; //pinia库
import { ElMessText } from "@/pages/zujian/utils.js";
import router from "@/router"; //引入路由
const startSelect = reactive({
  index: 0,
  animationFinished: false,
});
const shiyanti = ref([
  {
    src: "tuzi",
    name: 220,
  },
  {
    src: "gou",
    name: 219,
  },
  {
    src: "huli1",
    name: 218,
  },
  {
    src: "shuishouren",
    name: 217,
  },
]);
const headImg = (src) => {
  return new URL(`../assets/fullBody/zhujue/${src}.webp`, import.meta.url).href;
};

const jueseDonghua = ref();

const value = ref("实验体");
const options = ["实验体", "研究员"];
const user = useCounterStore();
const info = reactive(["开始游戏", "读取游戏", "画廊", "设置", "笔记"]);
let enterLock = false;

async function enter(index) {
  if (enterLock) return; // 正在等待，直接返回
  enterLock = true;       // 上锁，阻止短时间内再次触发

  try {
    user.text = "";
    user.playSound("clickS", false, user.volume * 0.5);

    if (index === 0) {
      if (user.SoundArr.length === 0) return;

      console.log("开始");
      user.resetUser();
      user.zhujue01.name = "琳恩";
      user.zhujue01.sex = 0;
      user.stopAllSounds();
      // startSelect.index++;
      user.playSound("water", true, user.volume * 0.5);
      // setTimeout(() => {
      //   startSelect.animationFinished = true;
      // }, 1600);

    } else if (index === 1) {
      user.stopAllSounds();
      user.cundang(2);
    } else if (index === 2) {
      ElMessText("未开放");
    } else if (index === 3) {
      user.menu = 2;
      user.menuSelect = 3;
    } else if (index === 4) {
         router.push({ name: "ceshi" });
    }

  } finally {
    // 0.25 秒后释放锁
    setTimeout(() => {
      enterLock = false;
    }, 250);
  }
}

const selectGender = (gender, index) => {
  if (!startSelect.animationFinished) return;
  user.playSound("clickS", false, user.volume * 0.5);
  if (index === 0) {
    console.log("选择的性别:", gender);
    if (gender === "female") {
      user.zhujue01.name = "琳恩";
      user.zhujue01.sex = 0;
    } else {
      ElMessText("未开放");
      return;
      user.zhujue01.name = "林恩";
      user.zhujue01.sex = 1;
    }
    startSelect.index++;
    startSelect.animationFinished = false;
    setTimeout(() => {
      startSelect.animationFinished = true;
    }, 1600);
  } else {
    startSelect.animationFinished = false;
    if (gender === "pureKind") {
      user.zhujue01.personality = 0;
    } else {
      ElMessText("未开放");
      return;
      user.zhujue01.personality = 1;
    }
    user.stopAllSounds();
    user.resetUser();
  }
};
onMounted(() => {
  if (user.youxi <= 0) {
    user.backgroundImage = new URL("@/assets/images/jiemian0.webp", import.meta.url).href;
    user.bg_img = "jiemian0";
  }
  jueseDonghua.value = new URL("@/assets/donghua/zhujue1.webm", import.meta.url).href;
});
</script>

<style scoped>
/* 渐显文字 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.animate-fadeIn {
  animation: fadeIn 1.5s forwards;
}
@keyframes floatUp {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-floatUp {
  animation: floatUp 2s forwards;
}
.gradient-text {
  background: linear-gradient(to right, #f56c6c, #409eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
