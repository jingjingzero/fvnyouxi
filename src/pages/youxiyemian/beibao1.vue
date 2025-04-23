<template>
  <div class="inventory-container relative flex w-[96%] h-[80vh] bg-white text-white p-4 box-border my-[10vh] mx-[2%] rounded-xl shadow-xl">
    <!-- 关闭按钮 -->

    <!-- 左侧人物照片 -->
    <div class="w-1/4 flex justify-center items-center bg-gray-700 rounded-3">
      <img :src="getImageUrl(user.attributes.quanshenImg)" class="w-full object-cover rounded-xl border border-#C6E2FF drop-shadow-[0_0_10px_#C6E2FF]" />
    </div>

    <!-- 右侧内容区域 -->
    <div class="w-3/4 pl-6 flex flex-col text-gray-100">
      <!-- Tabs -->
      <div class="flex w-full justify-between items-center">
        <el-tabs v-model="activeTab" type="card" class="text-white" tab-position="top">
          <el-tab-pane v-for="(tab, index) in tabs" :key="index" :label="tab" :name="tab" />
        </el-tabs>
        <el-icon class="text-black text-xl z-10" @click="handleClose">
          <Close color="black" class="mb-3vh" />
        </el-icon>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 bg-gray-700 bg-opacity-80 rounded-xl p-4 overflow-y-auto border border-white">
        <!-- 道具栏 -->
        <div v-if="activeTab === '道具'" class="flex flex-wrap gap-x-4.6vw pl-1vw gap-y-5vh overflow-y-auto mx-auto">
          <div v-for="(item, index) in user.inventory" :key="index" class="bg-white w-[8vw] h-[8vw] text-black flex justify-center items-center rounded-1">
            <el-popover class="box-item" :title="item.name" :width="200" :content="item.miaoshu" trigger="click" placement="top-start">
              <template #reference>
                <img :src="inventoryImg(item.img)" class="w-70% object-cover" />
              </template>
            </el-popover>
            <span v-if="item.num > 1" class="text-1.8vw absolute -mt-8% ml-7.5vw bg-#79BBFF rounded-full text-gray-800 px-1.1vw py-0.5vh">{{ item.num }}</span>
          </div>
        </div>

        <!-- 知识栏 -->
        <div v-else-if="activeTab === '知识'" class="px-4vw py-2vh">
          <el-collapse accordion class="bg-white bg-opacity-10 backdrop-blur rounded-xl">
            <el-collapse-item v-for="(chapter, index) in user.attributes.knowledge" :key="index" :title="'第 ' + (index + 1) + ' 章 - ' + chapter.title" class="text-white px-2vw">
              <p class="text-gray-500 leading-relaxed text-2vw box-border pl-2vw">{{ chapter.content }}</p>
              <div class="text-right pr-2vw mt-2vh">
                <el-button size="small" type="primary" @click="openBookModal(index)">查看详细信息</el-button>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 属性栏 -->
        <div v-else-if="activeTab === '属性'">
          <!-- 等级和经验进度条 -->
          <div class="w-full mb-6 text-center pl-3.5vw box-border">
            <div class="mb-2vh text-white font-semibold">等级：{{ user.attributes.level }}</div>
            <el-progress :percentage="expPercentage" :stroke-width="15" striped striped-flow />
          </div>
          <div class="w-full mb-1vh text-2.5vw font-bold iconfont2 flex justify-center">角色属性</div>
          <!-- 属性展示 -->
          <div class="flex flex-wrap bg-opacity-50 mt-4vh rounded-xl text-sm justify-between px-[4vw] text-white">
            <div v-for="(val, key) in attributes" :key="key" class="w-[40%] mb-3 pr-2 flex justify-between border-b border-white/20 pb-1">
              <span class="font-semibold text-transparent bg-clip-text" :class="getGradientClass(key)">
                {{ key }}
              </span>
              <span class="text-gray-300">
                <!-- 只对魔力为0时显示“未掌握” -->
                {{ val }}
              </span>
            </div>
          </div>
        </div>

        <!-- 技能栏 -->
        <div v-else-if="activeTab === '技能'" class="bg-white">
          <div class="flex bg-white justify-end box-border pr-3vw text-2vw text-#909399 py-1vh">技能点: {{ user.skillData.points }}</div>

          <el-segmented v-model="skillType" :options="['物理', '魔法']" block />

          <el-collapse accordion>
            <el-collapse-item v-for="(skill, i) in filteredSkills" :key="i" :title="skill.name" :name="i" class="text-white bg-opacity-60 border-none px-4vw">
              <div class="flex justify-between items-center my-1vh">
                <span>等级：{{ skill.level }}</span>
                <el-button size="small" type="primary" @click="increaseLevel(i)" :disabled="user.skillData.points <= 0"> +1 </el-button>
              </div>
              <div class="mt-1vh iconfont2 text-2vw text-gray-500">{{ skill.description }}</div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>
    <el-dialog v-model="showBook" width="100%" :show-close="false" destroy-on-close>
      <el-carousel trigger="click" height="150px" class="" :autoplay="false" :loop="false" arrow="always">
        <el-carousel-item v-for="item in BookText" :key="item">
          <h3 class="small justify-center" text="2xl">{{ item }}</h3>
        </el-carousel-item>
      </el-carousel>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Close } from "@element-plus/icons-vue";
import { GobletSquareFull } from "@element-plus/icons-vue";
import { useCounterStore } from "@/store/counter";
import { gsap } from "gsap";
const user = useCounterStore();
const tabs = ["道具", "知识", "属性", "技能"];
const activeTab = ref("道具");
// 示例道具数据
const items = ref([
  { name: "治疗药水", num: 3 },
  { name: "布制裤子", num: 1 },
  { name: "破旧的剑", num: 5 },
  { name: "魔法石", num: 1 },
]);
const skillType = ref("物理");
// 属性渐变色
const getGradientClass = (key) => {
  switch (key) {
    case "生命":
      return "bg-gradient-to-r from-red-500 to-pink-400";
    case "魔力":
      return "bg-gradient-to-r from-indigo-400 to-cyan-300";
    case "力量":
      return "bg-gradient-to-r from-orange-500 to-red-400";
    case "速度":
      return "bg-gradient-to-r from-green-400 to-lime-300";
    case "耐力":
      return "bg-gradient-to-r from-yellow-400 to-orange-300";
    case "减伤":
      return "bg-gradient-to-r from-teal-500 to-teal-300";
    default:
      return "bg-gradient-to-r from-white to-gray-200";
  }
};
const attributes = ref();
const level = ref(5); // 假设初始等级为5
const experience = ref(120); // 当前经验值
const experienceToNextLevel = ref(200); // 升级所需的经验
//计算经验
const expPercentage = computed(() => {
  const { exp, expRequired } = user.attributes;
  return expRequired > 0 ? (exp / expRequired) * 100 : 0;
});
// 计算人物图片
// 动态拼接路径
const getImageUrl = (name) => {
  return new URL(`../../assets/people/wo/biaoqing/shenti/${name}`, import.meta.url).href;
};
//物品图片
const inventoryImg = (name) => {
  return new URL(`../../assets/wuping/${name}`, import.meta.url).href;
};
onMounted(() => {
  attributes.value = {
    生命: user.attributes.currentHp + "/" + user.attributes.maxHp,
    魔力: user.attributes.mana === 0 ? "未掌握" : user.attributes.mana,
    力量: user.attributes.strength,
    速度: user.attributes.speed,
    耐力: user.attributes.endurance,
    减伤: user.attributes.damageReduction + "%",
  };
  console.log("打开背包",user.attributes);
});

// 计算经验百分比
const experiencePercentage = computed(() => {
  return (experience.value / experienceToNextLevel.value) * 100;
});

// 计算属性：根据当前选择的技能类型过滤技能
const filteredSkills = computed(() => user.skillData.list.filter((skill) => skill.type === skillType.value));
// 加点函数
const increaseLevel = (indexInFiltered) => {
  const skillName = filteredSkills.value[indexInFiltered].name;
  const realIndex = user.skillData.list.findIndex((skill) => skill.name === skillName);
  if (realIndex !== -1) {
    user.levelUpSkill(realIndex);
  }
};
const handleClose = () => {
  ElMessage({
    message: "已关闭背包",
    type: "info",
  });
  user.wupingShow = 1;
};
// 知识弹出框

const showBook = ref(false);
const BookText = ref("");
const openBookModal = (index) => {
  showBook.value = true;
  BookText.value = user.attributes.knowledge[index].pages;
};
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
</style>
