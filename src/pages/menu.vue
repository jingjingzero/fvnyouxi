<template>
  <div class="text-white flex w-full box-border px-6vw py-9vh box-border h-full bg-[rgba(0,0,0,0.5)]">
    <img src="@/assets/image/load.webp" class="w-100vw h-100vh object-cover absolute top-0 left-0 z-1" />
    <div class="flex w-full h-full z-1">
      <div class="w-25% h-full">
        <span class="text-#79BBFF iconfont2 text-4vw">菜单栏</span>
        <div class="mt-3vh flex flex-col gap-y-1.2vh">
          <div v-for="(item, index) in info" :key="index" @click="menuNum(index)">
            <span class="iconfont2 text-2.5vw" :class="{ 'text-#A0CFFF': user.menuSelect === index }">{{ item }}</span>
          </div>
          <img class="w-4.5vw mt-3vh" src="@/assets/icon/back.png" @click="fanhui()" />
        </div>
      </div>
      <div class="w-2px h-full bg-#79BBFF z-1"></div>
      <!-- 右侧栏 -->
      <div v-show="user.menuSelect === 0" ref="messageContainer" class="flex-1 ml-8vw pl-2vw py-1vh box-border bg-[rgba(0,0,0,0.4)] overflow-y-auto text-white">
        <div v-for="(msg, index) in user.messages" :key="index" class="mb-5">
          <div class="flex flex-col text-1.8vw">
            <span class="font-bold text-[clamp(17px,1.7vw,27px)]">{{ msg.name }}</span>
            <span class="text-[clamp(14px,1.4vw,24px)]" v-html="msg.content"></span>
          </div>
        </div>
      </div>
      <div class="flex-1 ml-4vw" v-show="user.menuSelect === 3">
        <div>
          <div>
            <div class="flex justify-center items-center text-white">文字速度</div>
            <div class="flex justify-between items-center gap-x-4vw">
              <span>慢</span>
              <el-slider v-model="user.text_speed" :min="90" :max="99" @change="onTextSpeedChange" />
              <span>快</span>
            </div>
          </div>
          <div class="mt-5vh">
            <div class="flex justify-center items-center text-white">总音量</div>
            <div class="flex justify-between items-center gap-x-4vw">
              <span>低</span>
              <el-slider v-model="user.volume" :min="0" :max="0.7" :step="0.05" @change="onMusicChange" />
              <span>高</span>
            </div>
          </div>
          <div class="mt-5vh">
            <div class="flex justify-center items-center text-white">文字大小</div>
            <div class="flex justify-between items-center gap-x-4vw">
              <span>低</span>
              <el-slider v-model="user.textSize" :min="16" :max="30" :step="1" @change="onTextSizeChange" />
              <span>高</span>
            </div>
          </div>
          <div class="mt-10vh w-full justify-end flex">
            <el-button type="primary" @click="clearMyData">清除所有缓存数据</el-button>
          </div>
        </div>
      </div>
      <div class="flex-1 ml-4vw overflow-y-auto text-2.3vw flex-col flex gap-y-2vh pt-2vh pb-5vh" v-show="user.menuSelect === 5">
        <div>如果你对我的游戏感兴趣，或者有任何剧情的的问题或者赞助的想法，欢迎随时联系我！我非常期待能与更多的游戏爱好者交流，并共同打造出更加精彩的游戏内容。</div>
        <div>QQ：1277104448</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, nextTick, watch } from "vue";
import emitter from "@/bus"; // 引入传值组件
import { ElMessageBox } from "element-plus";
import { useCounterStore } from "@/store/counter";
import { setStorage, getStorage, readSettings, updateSetting } from "./storage.js";

const user = useCounterStore();
const info = reactive(["历史", "存档", "读档", "首选项", "主菜单", "关于"]);
let chushiIndex = 0;
const zidongData = ref([]);
// 点击左侧栏
async function menuNum(index) {
  if (index === 4) {
    await ElMessageBox.confirm("确定要返回主界面吗?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      showClose: false, // 不显示右上角的关闭按钮
    })
      .then(() => {
        // 点击确定后的逻辑
        menuFace();
        user.selectBoolean = false; //关闭搜索场景
        user.youxi = 0;

        user.stopAllSounds();
        user.playSound("jiemian", true);
      })
      .catch(() => {});
    user.menuSelect = chushiIndex;
    return;
  } else if (index === 1) {
    if (user.youxi === 0) {
      return;
    }
    await ElMessageBox.confirm("确定要覆盖存档吗?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      showClose: false, // 不显示右上角的关闭按钮
    })
      .then(() => {
        // 点击确定后的逻辑
        JSONGet(1);
      })
      .catch(() => {});
    user.menuSelect = chushiIndex;
    return;
  } else if (index === 2) {
    await ElMessageBox.confirm("确定要读档吗?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      showClose: false, // 不显示右上角的关闭按钮
    })
      .then(() => {
        JSONGet(2);
      })
      .catch(() => {});
    user.menuSelect = chushiIndex;
    return;
  }
  user.menuSelect = index;
  chushiIndex = index;
}
// 返回当前页面
function fanhui() {
            user.playSound("clickS", false,user.volume*0.5);
  if (user.youxi <= 0) {
    menuFace();
    return;
  }
  user.menu = 0;
  user.text_boolean = true;
  user.backgroundImage = new URL(`../assets/images/${user.bg_img}.webp`, import.meta.url).href;
  setTimeout(() => {
    user.text_boolean = false;
  }, 200);
}
const dataJson = ref([]);
let textData;
// 获取存档数据
onMounted(async () => {
  textData = await import("@/store/textData.json");
  const settings = await readSettings();
  console.log("settings=", settings);

  user.text_speed = settings.text_speed;
  user.volume = settings.volume;
  user.textSize = settings.textSize;
});
emitter.emit("touchGongo");
let cundangBoolean = false;
let tableYuanshi;
//存读档
function JSONGet(index) {
  user.cundang(index);
}
// 分页
function handleCurrentChange(i) {
  user.currentPage = i;
}
// 清除所有存档
function clearMyData() {
  // 清除所有数据
  if (typeof plus !== "undefined") {
    // 5+APP 环境
    plus.storage.removeItem("_mylist.json");
    plus.storage.removeItem("_settings.json");
  } else {
    // 浏览器环境
    localStorage.removeItem("_mylist.json");
    localStorage.removeItem("_settings.json");
  }
}
// 返回主菜单
function menuFace() {
  user.menu = 1;
  user.animations.splice(0, user.animations.length);
  user.text = "";
}
// 历史对话自动拉到最下边
const messageContainer = ref(null);
watch(
  () => user.messages,
  () => {
    nextTick(() => {
      const el = messageContainer.value;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  },
  { deep: true }
);
//首选项保存
async function onTextSpeedChange(params) {
  await updateSetting("text_speed", params);
}
async function onMusicChange(params) {
  await updateSetting("volume", params); // 修改音量
}
async function onTextSizeChange(params) {
  await updateSetting("textSize", params); // 修改音量
}
</script>
