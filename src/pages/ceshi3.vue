<template>
  <div class="relative">
    <div class="absolute flex justify-center w-full -mt-3vh" ref="wrap">
      <!-- 视频 -->
      <video ref="bg" :src="user.attributes.jueseDonghua" v-show="isReady && user.attributes.jueseDonghua !== undefined && user.attributes.showActions !== 2 && user.attributes.liaotian < 3" autoplay muted loop playsinline webkit-playsinline preload="auto" @canplay="handleCanPlay" class="absolute pointer-events-none z-10 h-140vh" />

      <div
        v-for="(box, index) in boxs"
        :key="index"
        class="absolute border-2 border-white rounded-md opacity-70 z-20 transition-all duration-200"
        :style="{
          left: box.screenX + 'px',
          top: box.screenY + 'px',
          width: box.screenW + 'px',
          height: box.screenH + 'px',
          transform: 'translate(-50%, -50%)',
        }"
        @touchstart="momo(box)">
        <transition enter-active-class="transition-opacity duration-400 ease-in" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-400 ease-out" leave-to-class="opacity-0">
          <div v-show="box.shuohua" class="relative line-clamp-2 ml-3 iconfont2 bg-#409EFF text-white w-36 text-18px py-2 px-3 rounded-full whitespace-normal break-normal">
            {{ box.wenzi }}
          </div>
        </transition>
      </div>
    </div>
    <transition name="fade" v-show="user.attributes.liaotian === 1" appear>
      <div v-if="user.attributes.showActions === undefined" class="h-100vh flex justify-center py-12vh box-border">
        <div class="w-65vw flex flex-col gap-y-10vh">
          <div class="flex justify-between">
            <div
              class="bg-white px-5 py-2 rounded-2 text-26px border-2.5 border-solid border-#409EFF"
              :class="{
                'text-[#cccccc] border-#D4D7DE': user.attributes.duihua,
              }"
              @touchstart="hudong('聊天')">
              聊天
            </div>
            <div
              class="bg-white px-5 py-2 rounded-2 text-26px border-2.5 border-solid border-#409EFF"
              :class="{
                'text-[#cccccc] border-#D4D7DE': user.attributes.shiyan,
              }"
              @touchstart="hudong('实验')">
              实验
            </div>
          </div>
          <div class="flex justify-between">
            <div class="bg-white px-5 py-2 rounded-2 text-26px border-2.5 border-solid border-#409EFF" @touchstart="hudong('观察')">观察</div>
            <div
              class="bg-white px-5 py-2 rounded-2 text-26px border-2.5 border-solid border-#409EFF"
              @touchstart="hudong('喂食')"
              :class="{
                'text-[#cccccc] border-#D4D7DE': user.attributes.weishi,
              }">
              喂食
            </div>
          </div>
          <div class="flex justify-between">
            <div class="bg-white px-5 py-2 rounded-2 text-26px border-2.5 border-solid border-#F56C6C" @touchstart="hudong('结束')">结束</div>
          </div>
        </div>
      </div>
      <div v-else-if="user.attributes.showActions === 1" class="h-100vh flex justify-center py-12vh box-border">
        <div class="w-65vw flex flex-col gap-y-10vh">
          <div class="flex justify-between">
            <div class="bg-white px-5 py-2 rounded-2 text-26px border-2.5 border-solid border-#409EFF" @touchstart="hudong('手段', 2)">
              <div>确定</div>
            </div>
            <div class="bg-white px-5 py-2 rounded-2 text-26px border-2.5 border-solid border-#F56C6C" @touchstart="hudong('返回', 0)">返回</div>
          </div>
        </div>
      </div>
    </transition>
    <transition name="fade" v-show="user.attributes.liaotian === 3" appear>
      <div class="w-full h-100vh absolute flex justify-end bg-black/20">
        <div class="w-40vw h-full flex flex-col gap-y-10 items-center absolute z-9999">
          <div class="text-center mt-10vh text-outline-black text-white">请选择培育手段</div>
          <div class="flex items-center justify-center gap-x-3 border-2 border-solid border-[#67C23A] py-3 rounded-1 w-65 bg-white" @touchstart="shiyan(2)">
            <span class="text-white font-bold text-outline-poison text-25px">注射(+25压力)</span>
            <img src="@/assets/icon/zhushe.png" class="w-40px h-40px" />
          </div>
          <div class="flex items-center justify-center gap-x-3 border-2 border-solid border-[#409EFF] py-3 rounded-1 w-65 bg-white" @touchstart="shiyan(1)">
            <span class="text-white font-bold text-outline-electric text-25px">电击(+40压力)</span>
            <img src="@/assets/icon/dianji.png" class="w-40px h-40px" />
          </div>
        </div>
      </div>
    </transition>
    <el-dialog v-model="dialogVisible" title="具体信息" width="500" :close-on-click-modal="false">
      <div class="flex gap-x-3 items-center">
        <span>精神力:</span><span class="text-32px iconfont4">{{ user.attributes.jingshenData.SpiritPower }}</span>
      </div>
      <div class="flex gap-x-3 mt-3vh mb-2vh">
        <span class="iconfont2 line-height-30px">压力值</span>
        <el-progress :percentage="user.attributes.jingshenData.Pressure" :color="progressColor" striped striped-flow :stroke-width="10" class="flex-1" />
      </div>
      <template #footer>
        <el-button type="primary" @click="dialogVisible = false"> 关闭 </el-button>
      </template>
    </el-dialog>
    <yemian class="absolute z-999!" v-show="user.attributes.liaotian > 1" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import yemian from "@/pages/youxiyemian/one.vue";
import { useCounterStore } from "@/store/counter"; // pinia库
import { dialogueTree } from "@/juqing_wz/DH02.js";
import { DuihuaPanduan } from "@/pages/zujian/utils.js";
import emitter from "@/bus";
import { ElMessText } from "@/pages/zujian/utils.js";
const user = useCounterStore();
const isReady = ref(false);
// 压力值颜色计算函数
const progressColor = (percentage) => {
  if (percentage < 40) return "#67C23A"; // 绿色（低压力）
  if (percentage < 70) return "#E6A23C"; // 黄色（中等）
  return "#F56C6C"; // 红色（高压力）
};
const dialogVisible = ref(false);
////
const bg = ref(null);
const wrap = ref(null);
const boxs = ref([
  { x: 0.49, y: 0.22, width: 0.3, height: 0.14, name: "头", shuohua: false },
  { x: 0.6, y: 0.33, width: 0.08, height: 0.08, name: "脸右", shuohua: false },
  { x: 0.39, y: 0.33, width: 0.08, height: 0.08, name: "脸左", shuohua: false },
  { x: 0.495, y: 0.36, width: 0.09, height: 0.04, name: "下巴", shuohua: false },
  { x: 0.65, y: 0.18, width: 0.09, height: 0.1, shuohua: false, wenzi: "" },
]);
function handleCanPlay() {
  isReady.value = true;
  nextTick(updateAllBoxes);
}
function getRenderInfo() {
  const wrapRect = wrap.value.getBoundingClientRect();
  const videoRect = bg.value.getBoundingClientRect();

  // 视频相对于包裹容器的偏移
  const offsetX = videoRect.left - wrapRect.left;
  const offsetY = videoRect.top - wrapRect.top;

  const renderW = videoRect.width;
  const renderH = videoRect.height;

  return { renderW, renderH, offsetX, offsetY };
}

/**
 * 更新红框位置
 */
function updateAllBoxes() {
  const info = getRenderInfo();
  if (!info) return;

  boxs.value.forEach((b) => {
    b.screenX = info.offsetX + b.x * info.renderW;
    b.screenY = info.offsetY + b.y * info.renderH;
    b.screenW = b.width * info.renderW;
    b.screenH = b.height * info.renderH;
  });
}

function onResize() {
  updateAllBoxes();
}
////
onMounted(() => {
  updateAllBoxes();
  user.attributes.jueseDonghua = new URL("@/assets/lihui/tuziHappy.webm", import.meta.url).href;
  text_num1();
  window.addEventListener("resize", onResize);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});
//摸摸
let timer = null;
let lastNum = null;
//随机数
function getRandomNonRepeat() {
  let num;
  do {
    num = Math.floor(Math.random() * 6) + 1;
  } while (num === lastNum);
  lastNum = num;
  return num;
}
function momo(item) {
  console.log("摸摸", item);
  if (item.name === undefined || timer !== null) {
    return;
  }
  if (timer) clearTimeout(timer);
  if (item.name === "脸右") {
  } else if (item.name === "脸左") {
  } else if (item.name === "头") {
    boxs.value[4].wenzi = "请不要乱摸。";
  } else if (item.name === "下巴") {
    boxs.value[4].wenzi = "不要这样。";
  }
  const num = getRandomNonRepeat();
  if (num === 1) {
    boxs.value[4].wenzi = "请不要碰我的头。";
  } else if (num === 2) {
    boxs.value[4].wenzi = "请你不要乱摸了。";
  } else if (num === 3) {
    boxs.value[4].wenzi = "我不喜欢这样。";
  } else if (num === 4) {
    boxs.value[4].wenzi = "( ´•̥×•̥` )";
  } else if (num === 5) {
    boxs.value[4].wenzi = "  (◞‸◟)";
  } else if (num === 6) {
    boxs.value[4].wenzi = "……";
  }
  boxs.value[4].shuohua = true;
  timer = setTimeout(() => {
    boxs.value[4].shuohua = false;
    timer = null; // 清空状态
  }, 1600);
}
//日期生成
function getDayKey(day) {
  // 生成 day01, day02, ..., dayXX 的映射
  if (day >= 1 && day <= 31) {
    // 假设一天最多31天
    return `day${String(day).padStart(2, "0")}`; // 格式化为 day01, day02, ..., day31
  }
  return "defaultDay"; // 如果超出范围，返回默认值
}
async function hudong(param, i) {
  user.attributes.liaotianNodeKey = getDayKey(user.attributes.Day);
  user.playSound("clickS", false, user.volume * 0.5);
  if (param === "返回") {
    user.attributes.showActions = undefined;
  } else if (param === "手段") {
    if (user.attributes.shiyan !== undefined) {
      ElMessText("让他休息下吧");
      return;
    }
    if (i === 2) {
      if (user.youxi01 !== 0) {
        user.youxi01 = 0;
      }
      if (user.attributes.Day === 1) {
        //撒谎了
        if (user.attributes.selectselected.includes("start021")) {
          user.attributes.shiyan = "shiyan2";
        } else if (user.attributes?.Character?.[0]?.Affinity > 2) {
          //高好感
          user.attributes.shiyan = "shiyan3";
        } else {
          user.attributes.shiyan = "shiyan1";
        }
      } else {
        user.attributes.shiyan = "shiyan";
        user.attributes.liaotianNodeKey = "dayCon";
      }
      user.attributes.DH02Cur = user.attributes.shiyan;
      user.attributes.showActions = 2;
      user.backgroundImage = new URL(`../assets/images/chengfashi.webp`, import.meta.url).href;
      user.bg_img = "chengfashi";
      emitter.emit("text_num1");
    } else {
      user.attributes.showActions = undefined;
    }
  } else if (param === "实验") {
    user.attributes.showActions = 1;
  } else if (param === "观察") {
    dialogVisible.value = true;
  } else if (param === "聊天") {
    if (user.attributes.duihua !== undefined) {
      if (user.attributes.duihua === 999) {
        ElMessText("他已经没有力气聊天了");
      } else {
        ElMessText("已经聊过天了");
      }
      return;
    }
    if (user.youxi01 !== 0) {
      user.youxi01 = 0;
    }
    if (!user.attributes.selectselected.includes("d01_LT")) {
      if (user.attributes?.Character?.[0]?.Affinity >= 3) {
        user.attributes.duihua = "Day01_hg10";
      } else {
        user.attributes.duihua = "Day01_hg5";
      }
      user.attributes.Character[0].Affinity += 2;
      user.attributes.selectselected.push("d01_LT");
    } else if (!user.attributes.selectselected.includes("d02_LT")) {
      user.attributes.duihua = "Day02_lt";
      user.attributes.selectselected.push("d02_LT");
    } else if (!user.attributes.selectselected.includes("d03_LT")) {
      user.attributes.duihua = "Day03_lt";
      user.attributes.selectselected.push("d03_LT");
    }
    user.attributes.liaotianNodeKey = "dayCon";
    user.attributes.DH02Cur = user.attributes.duihua;
    user.attributes.jingshenData.Pressure -= 10;
    emitter.emit("text_num1");
  } else if (param === "喂食") {
    if (user.attributes.weishi !== undefined) {
      if (user.attributes.weishi === 999) {
        ElMessText("他已经吃不下任何东西了");
      } else {
        ElMessText("已经聊过天了");
      }
      return;
    }
    if (user.youxi01 !== 0) {
      user.youxi01 = 0;
    }
    if (!user.attributes.selectselected.includes("weishi")) {
      if (user.attributes.selectselected.includes("eat01")) {
        user.attributes.weishi = "weishi01";
      } else {
        user.attributes.weishi = "weishi02";
      }
      user.attributes.liaotianNodeKey = "dayCon";
      user.attributes.selectselected.push("weishi");
    } else {
      user.attributes.weishi = "weishi";
      user.attributes.liaotianNodeKey = "dayCon";
    }
    user.attributes.DH02Cur = user.attributes.weishi;
    user.attributes.jingshenData.Pressure -= 5;
    user.attributes.shiwu++;
    emitter.emit("text_num1");
  } else if (param === "结束") {
    if (user.attributes.shiyan === undefined) {
      ElMessText("还没进行实验呢，我可不想培育不达标。");
      return;
    }
    user.attributes.liaotian = false;
    console.log("user.attributes.Day=", user.attributes.Day);

    if (user.attributes.Day === 1) {
      user.currentNodeKey = "oneDay";
      user.attributes.dangqianrenwu = "电脑";
      user.attributes.bjWuping[0].boxes[6].show = true;
      user.attributes.bjWuping[0].boxes[1].liang = true;
      user.attributes.bjWuping[0].boxes[2].tip = "（最好还是让他休息下，不要再去吵他了。)";
    } else if (user.attributes.Day === 2) {
      user.currentNodeKey = "twoDay";
      user.attributes.dangqianrenwu = "电脑";
      user.attributes.bjWuping[0].boxes[6].show = true;
      user.attributes.bjWuping[0].boxes[1].liang = true;
      user.attributes.bjWuping[0].boxes[2].tip = "（最好还是让他休息下，不要再去吵他了。)";
    }
    user.youxi = 1;
    emitter.emit("text_num");
  }
}
let yanchi = false;
function shiyan(index) {
  if (yanchi) {
    return;
  }
  yanchi = true;
  if (user.youxi01 !== 0) {
    user.youxi01 = 0;
  }
  user.attributes.liaotianNodeKey = getDayKey(user.attributes.Day);
  if (index === 1) {
    //电击
    if (!user.attributes.selectselected.includes("dianji")) {
      user.attributes.selectselected.push("dianji");
    }
    if (user.attributes.Day === 1) {
      user.attributes.shiyan = "dianji01";
    } else {
      if (user.attributes.selectselected.includes("dianji")) {
        user.attributes.shiyan = "dianji";
      } else {
        user.attributes.shiyan = "dianji01";
      }
      user.attributes.liaotianNodeKey = "dayCon";
    }
    user.attributes.DH02Cur = user.attributes.shiyan;
    user.attributes.jingshenData.Pressure += 40;
    user.attributes.jingshenData.SpiritPower += 2;
  } else if (index === 2) {
    //注射
    if (!user.attributes.selectselected.includes("zhushe")) {
      user.attributes.selectselected.push("zhushe");
    }
    if (user.attributes.Day === 1) {
      user.attributes.shiyan = "zhushe01";
    } else {
      if (user.attributes.selectselected.includes("dianji")) {
        user.attributes.shiyan = "zhushe";
      } else {
        user.attributes.shiyan = "zhushe01";
      }
      user.attributes.liaotianNodeKey = "dayCon";
    }
    user.attributes.DH02Cur = user.attributes.shiyan;
    user.attributes.jingshenData.Pressure += 25;
    user.attributes.jingshenData.SpiritPower += 1;
  }
  user.attributes.duihua = 999;
  user.attributes.weishi = 999;
  user.textYincang = false;
  emitter.emit("text_num1");
  user.attributes.showActions = 2;
  setTimeout(() => {
    yanchi = false;
  }, 300);
}
function text_num1() {
  emitter.off("text_num1");
  emitter.on("text_num1", async () => {
    user.attributes.liaotian = 2;
    user.text_boolean = true;
    console.log(" user.youxi01=", user.youxi01);
    console.log("user.attributes.DH02Cur=", user.attributes.DH02Cur);
    console.log("user.attributes.liaotianNodeKey=", user.attributes.liaotianNodeKey);
    console.log("dialogueTree=", dialogueTree[user.attributes.liaotianNodeKey]);
    const content = dialogueTree[user.attributes.liaotianNodeKey][user.attributes.DH02Cur];
    console.log("content", content);
    await DuihuaPanduan(content[user.youxi01]);
    console.log("user.youxi=", user.selectBoolean);
  });
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.text-outline-electric {
  text-shadow: 0 0 2px #00c8ff, 0 0 4px #00c8ff, 0 0 8px #6f00ff;
}
.text-outline-poison {
  text-shadow: 0 0 3px #00ff66, 0 0 6px #00ff66, 0 0 12px #008f11;
}
.text-outline-black {
  text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 0 6px #000; /* 稍微柔和点的黑色外晕 */
}
</style>
