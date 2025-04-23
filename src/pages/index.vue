<!--
 * @作者: 冯星悦
 * @Date: 2025-04-15 15:40:17
 * @LastEditTime: 2025-04-23 17:16:53
-->
<!--
 * @作者: 冯星悦
 * @Date: 2025-04-15 15:40:17
 * @LastEditTime: 2025-04-16 16:37:32
-->
<template>
  <div class="relative w-100vw h-100vh overflow-hidden" @click="touchDown()">
    <div class="absolute top-5vh left-5vw text-1.6vw z-5 text-white">游戏进度:{{ user.youxi }} 文字:{{ user.kuaijin }} 背包:{{ user.attributes.status }}</div>
    <BlinkOverlay :visible="user.visible" />
    <!-- 背景图 -->
    <transition name="fade">
      <div v-if="user.heipingWenzi!==''" class="absolute top-0 w-full text-white text-4.5vw iconfont2 z-5 h-full flex items-center justify-center bg-[rgba(0,0,0,0.9)]">
        {{user.heipingWenzi}}
      </div>
    </transition>
    <img v-show="user.menu !== 2" :src="user.backgroundImage" class="w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-300" />
    <img v-if="user.backgroundImage1" :src="backgroundImage1(user.backgroundImage1)" class="w-full h-full object-cover absolute z-40 top-0 left-0" />
    <img v-if="user.backgroundImage1" :src="backgroundImage1(user.backgroundImage1)" class="w-full h-full object-cover absolute z-40 top-0 left-0" />
    <!-- 烟雾遮罩层 -->
    <div ref="fog" class="absolute inset-0 bg-black opacity-0 pointer-events-none" />
    <template v-if="user.wupingShow === 3">
      <fightIndex class="absolute z-2" />
    </template>
    <template v-else-if="user.menu === 2">
      <Menu />
    </template>
    <template v-else-if="!user.selectBoolean">
      <qidong v-show="user.youxi <= 0" />
      <youxiyemian @click.stop="" v-show="user.youxi !== 0" />
    </template>
    <template v-else>
      <searchIndex v-if="true" />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import qidong from "@/components/qidong.vue";
import youxiyemian from "./youxiyemian/one.vue";
import searchIndex from "./searchIndex.vue";
import Menu from "./menu.vue";
import fightIndex from "./fightIndex.vue";
import textData from "@/store/textData.json";
import { cloneDeep } from "lodash-es";
import emitter from "@/bus";
import { gsap } from "gsap";
import BlinkOverlay from "@/pages/zujian/BlinkOverlay.vue";
import { sleep, searchAll } from "@/pages/zujian/utils.js";
import { useCounterStore } from "@/store/counter";
import { readSettings } from "./storage.js";
const user = useCounterStore();

onMounted(async () => {
  user.playSound("jiemian", true);
  text_num();
  touchGongo();
  const settings = await readSettings();
  user.text_speed = settings.text_speed;
  user.volume = settings.volume;
});
// 背景特效图
const backgroundImage1 = (src) => {
  console.log("src=", src);
  return new URL(`../assets/image/${src}`, import.meta.url).href;
};
let num;
let clickGoole = false;
async function touchDown() {
  if (user.kuaijin) {
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false;
  }
  emitter.emit("touchGongo");
}

function touchGongo() {
  emitter.off("touchGongo");
  emitter.on("touchGongo", async () => {
    if (clickGoole) {
      return;
    }
    clickGoole = true;
    setTimeout(() => {
      if (user.text_boolean || user.selectBoolean || user.menu || user.wupingShow >= 2 || user.selectedOptionShow) {
        clickGoole = false;
        return;
      }
      emitter.emit("text_num");
      clickGoole = false;
    }, 100);
  });
}
let numBer = 0;
let WenBenText;
function text_num() {
  emitter.off("text_num");
  emitter.on("text_num", async (Text) => {
    //回退内容
    user.huituiData = cloneDeep({
      youxi: user.youxi, //游戏进度
      name: user.name, //姓名
      text: user.text, //文本描述
      selectBoolean: user.selectBoolean, //是否处于探索状态
      backgroundImage: user.backgroundImage,
      cg_imgboolean: user.cg_imgboolean, //是否出现中间图片
      cg_img: user.cg_img, //中间图片的路径
      face_img: user.face_img, //当前头像
      bg_img: user.bg_img, //背景图片
      selectedOptionShow: user.selectedOptionShow, //选项是否显示
      inventory: user.inventory, //我的物品
      attributes: user.attributes, //我的属性
      skillData: user.skillData, //我的技能点
      selectedOptionShow: user.selectedOptionShow, //是否出现选项
      selectedOption: user.selectedOption, //当前选项
      borderGradient: user.borderGradient, //边框颜色
      fullBodyImages: user.fullBodyImages, //立绘
      chapterNumber: user.chapterNumber, //章节
      textData: user.textData, //文本内容
    });
    // WenBenText = textData.one;
    WenBenText = user.textData ? user.textData : textData.one;
    if (Text !== undefined) {
      WenBenText[user.chapterNumber].splice(numBer + 1, 0, ...Text);
      user.textData = WenBenText;
    }
    numBer = user.youxi - 1;
    user.text_boolean = true;
    // cg图延长对话文字显示
    await searchAll(WenBenText[user.chapterNumber][numBer]);
    if (user.youxi === 0) {
      return;
    }
    if (WenBenText[user.chapterNumber][numBer]?.panduan) {
      const hasStatus = user.attributes.status.some((item) => item === WenBenText[user.chapterNumber][numBer].panduan);
      if (hasStatus) {
        WenBenText[user.chapterNumber].splice(numBer + 1, 0, ...WenBenText[user.chapterNumber][numBer].LWtext1);
        user.textData = WenBenText;
      } else {
        WenBenText[user.chapterNumber].splice(numBer + 1, 0, ...WenBenText[user.chapterNumber][numBer].LWtext2);
        user.textData = WenBenText;
      }
      user.text = WenBenText[user.chapterNumber][numBer].text;
    } else {
      user.text = WenBenText[user.chapterNumber][numBer].text;
    }
    if (!user.textData) {
      user.textData = textData.one;
    }
    user.youxi++;
  });
}

// 背景图片切换动画
const fog = ref(null);
// 监听 backgroundImage 的变化
watch(
  () => user.backgroundImage,
  async () => {
    await fogTransition();
  }
);

// 过渡动画
function fogTransition() {
  return new Promise((resolve) => {
    gsap.to(fog.value, {
      opacity: 0.5, // 烟雾遮罩显示
      filter: "blur(10px)", // 加入模糊效果
      duration: 0.3,
      onComplete: () => {
        gsap.to(fog.value, {
          opacity: 0,
          filter: "blur(0px)", // 恢复清晰
          duration: 0.5,
          delay: 0.1,
          onComplete: resolve,
        });
      },
    });
  });
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
