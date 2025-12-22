<template>
  <div class="flex">
    <!-- 左侧 -->
    <div class="w-38 relative py-2vh h-100vh box-border bg-#000000">
      <div v-show="!detail">
        <div v-for="(item, index) in info" :key="item" class="flex flex-col justify-center box-border py-3" @click="selectIndex(index)">
          <div class="text-center box-border mx-3 rounded-1 line-height-12 text-20px iconfont2 cursor-pointer transition-all duration-300" :class="infoIndex === index ? 'bg-#409EFF text-white shadow-lg' : 'bg-white text-black/70'">
            {{ item }}
          </div>
        </div>
      </div>
      <div v-show="detail">
        <div class="text-center mt-5vh box-border mx-3 rounded-1 line-height-12 text-20px iconfont2 cursor-pointer transition-all duration-300 bg-white text-black/70" @click="fanhui(0)">返回</div>
      </div>
    </div>

    <!-- 右侧 -->
    <div class="flex-1 relative h-100vh box-border bg-black/80 px-8">
      <!-- 右侧背景（只背景，不吃事件） -->
      <img src="@/assets/teshu/zero.webp" class="absolute inset-0 object-cover w-full h-100vh opacity-30 pointer-events-none" />

      <!-- 内容层（明确在上面） -->
      <div v-show="!detail">
        <Transition name="fade">
          <el-row v-if="show" :gutter="20" class="relative z-10 w-full h-full py-3vh">
            <el-col v-for="item in info1" :key="item.name" :span="6" class="mb-5">
              <!-- 卡片（唯一可点区域） -->
              <div class="bg-white/90 rounded-1 overflow-hidden relative cursor-pointer select-none" @click="goDetail(item)">
                <!-- 图片 -->
                <div class="relative w-full aspect-[99/100] bg-gray-300/30">
                  <img :src="Img(item.img)" class="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                </div>

                <!-- 名称 -->
                <div class="h-6vh flex items-center justify-center text-white bg-#409EFF/65 text-18px font-bold iconfont2 pointer-events-none">
                  {{ item.name }}
                </div>
              </div>
            </el-col>
          </el-row>
        </Transition>
      </div>
      <div v-if="detail"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";

const Img = (src) => {
  return new URL(`../assets/fullBody/zhujue/${src}.webp`, import.meta.url).href;
};

const info = reactive(["主要人物", "NPC", "背景"]);
const infoIndex = ref(0);
const show = ref(false);
const info1 = ref([]);
const detail = ref(false);
onMounted(() => {
  info1.value = arr1;
  setTimeout(() => {
    show.value = true;
  }, 200);
});

function selectIndex(index) {
  if (!show.value) return;
  infoIndex.value = index;
  show.value = false;

  if (index === 0) info1.value = arr1;
  else if (index === 1) info1.value = arr2;
  else info1.value = arr3;

  setTimeout(() => {
    show.value = true;
  }, 200);
}

function goDetail(item) {
  console.log("跳转");
  detail.value = true;
}
function fanhui(index) {
  if (index === 0) {
    detail.value = false;
  }
}

const arr1 = [
  { name: "220", img: "user" },
  { name: "219", img: "gou" },
  { name: "218", img: "huli1" },
  { name: "217", img: "shuishouren" },
  { name: "兰陵", img: "cat" },
];

const arr2 = [
  { name: "琳恩", img: "zhujue" },
  { name: "拉格尔", img: "dog1" },
  { name: "西奥", img: "xiao" },
  { name: "马库斯", img: "makusi" },
  { name: "法伯尔", img: "faboer" },
  { name: "主任", img: "zhuren" },
  { name: "198", img: "tuzi" },
  { name: "机械安保", img: "robot" },
];

const arr3 = [];
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
