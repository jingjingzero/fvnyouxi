<template>
  <div class="text-white flex w-full box-border px-6vw py-9vh box-border h-full bg-[rgba(0,0,0,0.5)]">
    <img src="@/assets/image/load.png" class="w-100vw h-100vh object-cover absolute top-0 left-0 -z-1" />
    <div class="flex w-full h-full z-1">
      <div class="w-25% h-full">
        <span class="text-#79BBFF iconfont2 text-4vw">菜单栏</span>
        <div class="mt-3vh flex flex-col gap-y-2.3vh">
          <div v-for="(item, index) in info" :key="index" @click="menuNum(index)">
            <span class="iconfont2 text-2.5vw" :class="{ 'text-#A0CFFF': user.menuSelect === index }">{{ item }}</span>
          </div>
          <img class="w-4.5vw mt-3vh" src="@/assets/icon/back.png" @click="fanhui()" />
        </div>
      </div>
      <div class="w-2px h-full bg-#79BBFF z-1"></div>
      <!-- 右侧栏 -->
      <div v-show="user.menuSelect === 0" ref="messageContainer" class="flex-1 ml-8vw pl-2vw py-1vh box-border bg-[rgba(0,0,0,0.4)] overflow-y-auto text-white">
        <div v-for="(msg, index) in user.messages" :key="index" class="mb-4">
          <div class="flex flex-col text-1.8vw">
            <span class="font-bold text-2vw">{{ msg.role }}</span>
            <span v-html="msg.content"></span>
          </div>
        </div>
      </div>
      <div class="flex-1 ml-4vw" v-show="user.menuSelect === 1 || user.menuSelect === 2">
        <div class="flex flex-wrap gap-y-5.5vh gap-x-2vw pl-3vw">
          <div v-for="(item, index) in dataJson" :key="index" class="w-[calc(33%-3vw)] h-20 flex items-center justify-center rounded-1 text-white" @click="JSONGet((user.currentPage - 1) * 9 + index + 1)">
            <img class="absolute w-16vw object-cover opacity-80 -z-1" :src="item?.data?.backgroundImage !== undefined ? item?.data?.backgroundImage : saveBg" />
            {{ (user.currentPage - 1) * 9 + index + 1 }}
            <div class="absolute w-16vw mt-25vh flex justify-center text-1.5vw opacity-80">
              {{ item === "" ? "无存档" : item.time }}
            </div>
          </div>
        </div>
        <div class="mt-6vh flex justify-center w-full">
          <el-pagination size="small" layout="pager" :total="18" :page-size="9" :current-page="user.currentPage" @current-change="handleCurrentChange" />
        </div>
      </div>
      <div class="flex-1 ml-4vw" v-show="user.menuSelect === 3">
        <div>
          <div>
            <div class="flex justify-center items-center text-white">文字速度</div>
            <div class="flex justify-between items-center gap-x-4vw">
              <span>慢</span>
              <el-slider v-model="user.text_speed" :min="80" :max="99" @change="onTextSpeedChange" />
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
        </div>
      </div>
      <div class="flex-1 ml-4vw overflow-y-auto text-2.9vw flex-col flex gap-y-2vh pt-2vh pb-5vh" v-show="user.menuSelect === 5">
        <div>大家好，我是我想静静了，一名尝试开发自己脑海中故事的游戏开发萌新。这款游戏是我投入了大量心血和时间的成果。</div>
        <div>游戏的故事围绕一只失去记忆的猫咪展开，它在努力找回失去的记忆的过程中，逐步发现自己真正的归属。虽然这是一段充满冒险与成长的旅程，但未来的故事可能会变得更加残酷和复杂。我不打算剧透太多，希望你们亲自体验。</div>
        <div>作为独立开发者，我在这款游戏的制作过程中面临了许多挑战。从最初的概念设计到编码实现，每个步骤都充满了学习与成长。为了克服制作中的技术难题，我利用了各种AI技术，包括AI生成图片以及图像处理工具如PS，这帮助我在美术和图形设计上节省了大量时间并提高了效率。尽管面临许多困难和技术瓶颈，但通过不断学习、调试和利用这些先进的工具，我最终成功将这款游戏呈现给大家。</div>
        <div>这款游戏对我来说不仅仅是一次技术上的尝试，更是对自己创意与耐心的挑战。在未来，我希望能继续优化游戏的玩法和体验，加入更多玩家互动元素以及创新的游戏机制。我真心希望这款游戏能让你们感到开心，也期待能够得到你们的反馈和建议。</div>
        <div>如果你对我的游戏感兴趣，或者有任何剧情的的问题或者赞助的想法，欢迎随时联系我！我非常期待能与更多的游戏爱好者和开发者交流，并共同打造出更加精彩的游戏内容。</div>
        <div>QQ：1277104448</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import saveBg from "@/assets/image/saveBg.png";
import { reactive, ref, onMounted, nextTick, watch } from "vue";
import emitter from "@/bus"; // 引入传值组件
import { ElMessageBox } from "element-plus";
import { useCounterStore } from "@/store/counter";
import { upsertItemById, getAllItems, readSettings, updateSetting } from "./storage.js";
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import { sleep } from "@/pages/zujian/utils.js";
const user = useCounterStore();
const info = reactive(["历史", "存档", "读档", "首选项", "主菜单", "关于"]);
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
        user.cg_imgboolean = false;
        user.stopAllSounds();
      })
      .catch(() => {});
  } else if (index === 5) {
    // clearMyData();
    // console.log("清除成功");
  }
  user.menuSelect = index;
}
// 返回当前页面
function fanhui() {
  if (user.youxi <= 0) {

    menuFace();
    return;
  }
  user.menu = 0;
  user.selectedOptionShow = false;
  user.text_boolean = true;
  user.backgroundImage = new URL(`../assets/images/${user.bg_img}`, import.meta.url).href;
  setTimeout(() => {
    emitter.emit("text_num");
  }, 150);
}
const dataJson = ref([]);
// 获取存档数据
onMounted(async () => {
  console.log('  user.textData=',  user.textData);
  loadJson();
  const settings = await readSettings();
  user.text_speed = settings.text_speed;
  user.volume = settings.volume;
});
function loadJson() {
  getAllItems().then((data) => {
    const startId = (user.currentPage - 1) * 9 + 1;
    // 创建一个包含当前页码的 id 范围
    const ids = Array.from({ length: 9 }, (_, i) => startId + i);
    // 过滤原数组，只保留当前页码对应的 id 范围内的元素
    let result = ids.map((id) => {
      const item = data.find((a) => a.id === id);
      return item || { id, name: "" }; // 如果没有找到对应的项，使用空对象
    });
    // 按 id 从小到大排序
    dataJson.value = result.sort((a, b) => a.id - b.id);
    console.log('dataJson.value',dataJson.value);
  });
}
// 存读档
async function JSONGet(item) {
  if (user.menuSelect === 1) {
    //存档
    const info = {
      data: {
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
      },
      time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    };
          console.log('user.textData=',user.textData);
    upsertItemById(item, {
      data: info.data,
      time: info.time,
    });
    loadJson();
    ElMessage("存档成功");
    setTimeout(() => {
      loadJson();
    }, 250);
  } else {
    //读档
    user.text_boolean = true;
    user.resetUser();
    user.stopAllSounds();
    const index = dataJson.value.findIndex((item1) => item1.id == item);
    if (dataJson.value[index].data !== undefined) {
      user.menu = 0;
      const data = dataJson.value[index].data;
      console.log("data=", data);
      user.name = data.name;
      user.youxi = user.selectedOptionShow ? data.youxi - 1 : data.youxi;
      user.inventory = data.inventory; //我的物品
      user.attributes = data.attributes; //我的属性
      user.skillData = data.skillData; //我的技能点
      user.chapterNumber = data.chapterNumber;
      user.textData = data.textData; //读取文本内容
      console.log("读档", data);
      setTimeout(() => {
        user.bg_img = data.bg_img;
        user.face_img = data.face_img;
        user.fullBodyImages = data.fullBodyImages;
        user.selectBoolean = data.selectBoolean;
        user.cg_imgboolean = data.cg_imgboolean;
        emitter.emit("text_num");
        user.backgroundImage = new URL(`../assets/images/${data.bg_img}`, import.meta.url).href;
      }, 150);
    }
  }
}
// 分页
function handleCurrentChange(i) {
  user.currentPage = i;
  loadJson(i);
}
// 清除所有存档
function clearMyData() {
  // 清除所有数据
  if (typeof plus !== "undefined") {
    // 5+APP 环境
    plus.storage.removeItem("_mylist.json");
  } else {
    // 浏览器环境
    localStorage.removeItem("_mylist.json");
  }
}
// 返回主菜单
function menuFace() {
  user.menu = 1;
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
</script>
