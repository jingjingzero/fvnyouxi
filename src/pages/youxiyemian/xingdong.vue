<!--
 * @作者: 冯星悦
 * @Date: 2025-07-28 11:04:15
 * @LastEditTime: 2025-07-29 10:57:13
-->
<template>
  <div class="inventory-container relative flex w-95% box-border h-[90vh] bg-white text-white p-4 box-border my-[5vh] mx-[2%] rounded-xl shadow-xl">
    <div class="w-full flex flex-col text-gray-100">
      <!-- Tabs -->
      <div class="flex w-full justify-between items-center mb-3vh">
        <div class="text-24px text-#333">请选择你外出的地点</div>
        <el-icon class="z-10" size="30" @click="handleClose">
          <Close color="black" />
        </el-icon>
      </div>
      <div class="text-black flex justify-between box-border px-5vw overflow-y-auto">
        <div class="flex flex-col" v-for="item of xingdong[0]" :key="item.id" @touchend.prevent="chuqu(item)">
          <img :src="bgImg(item.bgSrc)" class="w-19vw object-cover" />
          <div class="flex justify-center text-20px border border-solid border-#333 rounded-2">{{ item.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from "vue";
import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import emitter from "@/bus"; // 引入传值组件
import { ElMessageBox } from "element-plus";
const user = useCounterStore();
const handleClose = () => {
  user.wupingShow = 1;
};
//二维数组
const xingdong = [
  [
    {
      id: 1,
      bgSrc: "men217",
      name: "法伯尔",
    },
    {
      id: 2,
      bgSrc: "men218",
      name: "西奥",
    },
    {
      id: 3,
      bgSrc: "men219",
      name: "马库斯",
    },
  ],
];
const bgImg = (src) => {
  console.log("src=", src);
  return new URL(`../../assets/images/${src}.webp`, import.meta.url).href;
};
onMounted(() => {
  console.log("user.attributes.actionList=", user.attributes.actionList);
});
async function chuqu(item) {
  try {
    await ElMessageBox.confirm(`确定要去拜访 ${item.name} 吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    console.log('行动');
    if (item.id === 1) {
      //法伯尔 217
    } else if (item.id === 2) {
      //西奥 218
    } else if (item.id === 3) {
      //马库斯 219
    }
          ElMessText("剧情未完成");
  } catch {
    // ===== 用户点击 取消 或 关闭 =====
    console.log("用户取消了");
  }
}
</script>

<style scoped>
:deep(.el-progress__text) {
  margin-bottom: 1vh;
  color: white;
}
:deep(.el-collapse-item__content) {
  padding-bottom: 2.5vh;
}
.inventory-container {
  position: relative;
  backdrop-filter: blur(8px);
}
.alert-icon {
  font-weight: bold;
  color: #e6a23c;
  animation: bounceGlow 1s infinite;
  text-shadow: 0 0 8px #e6a23c;
}

@keyframes bounceGlow {
  0% {
    transform: scale(1);
    text-shadow: 0 0 6px #ff3333;
  }
  50% {
    transform: scale(1.3);
    text-shadow: 0 0 16px #ff6666;
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 6px #ff3333;
  }
}
</style>
