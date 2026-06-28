<template>
  <div>
    <transition name="fade">
      <div v-show="progress !== 100" class="absolute inset-0 z-999">
        <div class="absolute flex justify-center items-center w-100vw h-100vh">
          <el-progress type="dashboard" :percentage="progress">
            <template #default="{ percentage }">
              <span class="percentage-value">
                {{ percentage }}%
              </span>

              <span class="percentage-label">
                加载资源中
              </span>
            </template>
          </el-progress>
        </div>
      </div>
    </transition>
    <transition name="fade-game">
      <div v-show="progress === 100" class="flex w-full h-100vh justify-end">
        <div class="fixed inset-0 overflow-hidden -z-1">
        </div>
        <!-- 背景spine图 -->
        <div class="absolute page">
          <div ref="pixiRef" class="pixi-wrap" :style="{
            opacity: pixiReady ? 1 : 0
          }">
          </div>
        </div>
        <div class="z-99 flex mr-3vw" v-if="startSelect.index === 0">
          <div class="flex flex-col items-end text-white iconfont2 mt-15vh pt-2vh px-3vw rounded-5 gap-y-5vh font-bold">
            <span v-for="(item, index) of info" :key="index">
              <span class="bg-#409EFF/50 px-2vw py-2vh rounded-2" @click="enter(index)">
                {{ item }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Application } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { useCounterStore } from "@/store/counter"; //pinia库
import { loadAssets } from "./loadAssets";
import router from "@/router"; //引入路由
import { ElMessText } from "@/pages/zujian/utils.js";
import { SkeletonBounds } from "@esotericsoftware/spine-core";
const user = useCounterStore();
const startSelect = reactive({
  index: 0,
  animationFinished: false,
});

const info = reactive([
  "开始游戏",
  "读取游戏",
  "画廊",
  "设置",
  "档案",
]);

async function enter(index) {
  if (enterLock) return; // 正在等待，直接返回
  enterLock = true; // 上锁，阻止短时间内再次触发

  try {
    user.text = "";
    user.playSound("clickS", false, user.volume * 0.5);

    if (index === 0) {
      if (user.SoundArr.length === 0) return;
      user.resetUser();
      router.push({ name: "matter" });
      return
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
let enterLock = false;
function VW(value) {
  return window.innerWidth * (value / 100);
}

function VH(value) {
  return window.innerHeight * (value / 100);
}

const pixiRef = ref(null);

let app = null;
const progress = ref(0)
const pixiReady = ref(false)
function createSpine({
  skeleton,
  atlas,
  width = 20,
  x = 50,
  y = 100,
  animation,
  loop = true,
  onClick,
}) {
  const spine = new Spine({
    skeleton,
    atlas,
  });

  app.stage.addChild(spine);

  const bounds = new SkeletonBounds();

  let latestHit = null;

  // =========================
  // 每帧同步（关键稳定点）
  // =========================
  const tickerFn = () => {
    bounds.update(spine.skeleton, true);
  };

  app.ticker.add(tickerFn);

  app.ticker.addOnce(() => {
    spine.autoUpdate = true;

    spine.scale.set(VW(width) / 100);
    spine.x = VW(x);
    spine.y = VH(y);

    const anim =
      animation ||
      spine.skeleton.data.animations?.[0]?.name;

    if (anim) {
      spine.state.setAnimation(0, anim, loop);
    }

    spine.eventMode = "static";

    spine.on("pointertap", (event) => {
      const local = spine.toLocal(event.global);

      const hit = bounds.containsPoint(local.x, local.y);

      latestHit = hit;

      if (!hit) {
        onClick?.({
          spine,
          slot: null,
          event,
        });
        return;
      }

      const slotName = hit.name || null;

      onClick?.({
        spine,
        slot: slotName,
        attachment: hit,
        event,
      });
    });
  });

  return {
    spine,
    destroy() {
      try {
        app?.ticker?.remove(tickerFn);

        app?.stage?.removeChild(spine);

        spine?.destroy?.({
          children: true
        });
      } catch (e) {
        console.error(e);
      }
    }
  };
}
const spineList = [];
onMounted(async () => {
  // 加载资源
  await loadAssets((value) => {
    progress.value = value !== 100 ? value : 99
  })
  // 创建Pixi
  app = new Application();

  await app.init({

    resizeTo: window,

    resolution: Math.min(
      window.devicePixelRatio,
      2
    ),

    autoDensity: true,

    backgroundAlpha: 0,

    antialias: true,
  });

  // 挂载canvas
  pixiRef.value.appendChild(
    app.canvas
  );

  // =========================
  // 背景
  // =========================
  spineList.push(
    createSpine({
      skeleton: "bg_skel",
      atlas: "bg_atlas",
      width: 5,
      x: 45,
      y: 101,
    })
  );

  spineList.push(
    createSpine({
      skeleton: "bg3_skel",
      atlas: "bg3_atlas",
      width: 1.8,
      x: 68,
      y: 40,
    })
  );

  spineList.push(
    createSpine({
      skeleton: "bg2_skel",
      atlas: "bg2_atlas",
      width: 5,
      x: 50,
      y: 101,

      onClick: ({ slot, spine }) => {
        console.log("点击 slot =", slot);
      },
    })
  );
  // =========================
  // 第二个角色
  // =========================
  spineList.push(
    createSpine({
      skeleton: "bg1_skel",
      atlas: "bg1_atlas",
      width: 5,
      x: 45,
      y: 101,
    })
  );
  await new Promise((resolve) => {
    setTimeout(resolve, 250)
  })
  pixiReady.value = true

  await nextTick()

  progress.value = 100
});

onBeforeUnmount(() => {

  spineList.forEach(item => {
    item?.destroy?.();
  });

  spineList.length = 0;

  if (app) {

    app.ticker.stop();

    app.destroy();

    app = null;
  }
});

//spine边界框点击判断

</script>

<style scoped>
/* loading */
.fade-enter-active,
.fade-leave-active {
  transition: opacity .5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 游戏 */
.fade-game-enter-active,
.fade-game-leave-active {
  transition:
    opacity 1s ease,
    transform 1s ease;
}

.fade-game-enter-from,
.fade-game-leave-to {
  opacity: 0;

  transform:
    scale(1.02);
}

.percentage-value {
  display: block;
  margin-top: 10px;
  font-size: 28px;
}

.percentage-label {
  display: block;
  margin-top: 10px;
  font-size: 12px;
}

.page {
  position: absolute;

  width: 100vw;
  height: 100vh;

  overflow: hidden;
}

/* 动态背景 */
.page::before {

  content: "";

  position: absolute;

  left: 50%;
  top: 50%;

  /* 故意放大 */
  width: 120%;
  height: 120%;

  background-image: url("@/assets/image/beijing.webp");

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  /* 初始居中 */
  transform:
    translate(-50%, -50%);

  /* 镜头缓慢移动 */
  animation:
    cameraMove 20s linear infinite alternate;

  will-change: transform;
}

/* Pixi层 */
.pixi-wrap {
  position: relative;
  z-index: 2;
}

/* 缓慢镜头移动 */
@keyframes cameraMove {

  0% {
    transform:
      translate(-50%, -50%) translate(-2%, -2%) scale(1);
  }

  25% {
    transform:
      translate(-50%, -50%) translate(2%, -1%) scale(1.02);
  }

  50% {
    transform:
      translate(-50%, -50%) translate(1%, 2%) scale(1.03);
  }

  75% {
    transform:
      translate(-50%, -50%) translate(-2%, 1%) scale(1.01);
  }

  100% {
    transform:
      translate(-50%, -50%) translate(2%, 2%) scale(1.05);
  }
}

/* 高清canvas */
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>