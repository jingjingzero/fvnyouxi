<template>
  <div class="flex my-5vh mx-7vw h-90vh relative border-3 border-solid border-black rounded-3" @click.stop="">
    <div v-show="num1 === 0">
      <img class="w-full h-90vh object-cover absolute left-0 z-0 rounded-2" src="@/assets/images/bizhi.webp" />
      <div class="w-full h-4.5vh z-2 absolute flex items-center px-4 box-border justify-between pt-3 gap-x-2">
        <span class="text-13px text-#333 font-bold iconfont2">
          {{ user.attributes.DateYear }}
        </span>
        <div class="flex-row-reverse flex gap-x-2">
          <img src="@/assets/icon/dianliang.png" class="w-17px h-17px object-contain" />
          <img src="@/assets/icon/wifi.png" class="w-17px h-17px object-contain" />
          <img src="@/assets/icon/xinhao.png" class="w-17px h-17px object-contain" />
          <img src="@/assets/icon/vpn.png" class="w-17px h-17px object-contain" />
        </div>
      </div>
      <div class="z-2 relative box-border px-5 py-4 flex flex-wrap gap-x-6 mt-4vh max-w-40vw">
        <!-- 应用程序 -->
        <div v-for="item of user.attributes.userApps" :key="item.name" class="flex relative w-80px h-80px flex-col items-center gap-y-1 justify-center" @click="yingyong(item.id)">
          <img :src="headImg(item.src)" class="h-35px w-35px object-contain bg-white rounded-1 p-1" />
          <span class="text-14px"> {{ item.name }}</span>
          <el-icon v-if="item.tips" class="absolute! top-0 right-3 float-warning" size="16px" color="#F56C6C"><WarningFilled /></el-icon>
        </div>
      </div>
      <div class="absolute bottom-0 bg-black/85 w-full flex py-2 box-border pl-3 rounded-bl-1 rounded-br-1">
        <el-popover placement="top-start" :width="50" trigger="click">
          <template #reference>
            <div class="flex">
              <img src="@/assets/icon/windows.png" class="h-25px object-contain" />
            </div>
          </template>
          <div class="flex gap-x-2 items-center" @click="user.wupingShow = 0">
            <img src="@/assets/icon/windowend.png" class="h-20px object-contain" />
            <span class="mt-1 font-bold">关机</span>
          </div>
        </el-popover>
      </div>
    </div>
    <!-- 消息 -->
    <div v-show="num1 === 1" class="bg-black/60 w-full h-full">
      <div class="flex flex-col box-border py-2vh h-full w-full px-2vw">
        <!-- 顶部标题栏 -->
        <div class="bg-black rounded-3 px-4 box-border py-1.5vh flex items-center justify-between">
          <div class="iconfont2 flex items-center gap-x-2">
            <img src="@/assets/icon/phone.png" class="w-7" />
            <span class="text-20px font-bold"> 消息提示</span>
          </div>
          <el-icon size="3.5vw" color="#F56C6C" class="border-1 border-solid border-red rounded-full" @touchstart="yingyong(0)">
            <CircleCloseFilled />
          </el-icon>
        </div>

        <!-- 主体内容 -->
        <div class="flex mt-2.4vh h-72vh mb-2vh">
          <!-- 联系人列表 -->
          <div class="bg-black w-26% overflow-y-scroll h-full rounded-3 box-border py-2vh px-1.5 flex flex-col gap-y-3">
            <div v-for="(item, index) of user.attributes.contacts" :key="item.name" class="flex relative py-1.5vh items-center bg-#A8ABB2 rounded-full px-1.5 gap-x-2" :class="index === tactIndex ? 'bg-yellow-100!' : ''" @touchstart="tactChange(item, index)">
              <img :src="headImg(item.src)" class="h-28px w-28px object-contain rounded-full border border-solid border-black shrink-0" />
              <div class="flex flex-col">
                <span class="font-bold text-13px truncate w-85%" :class="index === tactIndex ? 'text-black' : 'text-white'">{{ item.name }}</span>
                <span class="text-11px truncate text-#606266 w-14vw">{{ item.xiaoxi }}</span>
              </div>
              <el-icon v-if="item.tips" class="absolute! right-0 -top-1 float-warning z-999" size="20px" color="#F56C6C"><WarningFilled /></el-icon>
            </div>
          </div>

          <!-- 消息面板 -->
          <div v-if="!qunIndex" class="bg-black flex-1 ml-2 rounded-3 flex flex-col h-72vh min-w-[300px]">
            <!-- 面板标题1 -->
            <div class="px-3 py-1.5vh flex items-center justify-between gap-x-2 bottomB">
              <div class="flex items-center gap-x-2">
                <img src="@/assets/icon/lianxi.png" class="h-25px w-25px" />
                <span class="font-bold text-16px">{{ tactName }}</span>
              </div>
              <el-icon v-show="qun !== undefined" size="25px" color="white" @click="qunxinxi"><MoreFilled /></el-icon>
            </div>

            <!-- 消息内容 -->
            <div class="flex relative pt-2vh pb-1.5vh overflow-y-auto h-full px-3 rounded-bl-3 rounded-br-3 text-16px flex-col gap-y-6" ref="messageContainer">
              <div v-for="item of tactArr" :key="item.name" class="flex gap-x-2" :class="item.user === '琳恩' ? 'flex-row-reverse' : ''">
                <template v-if="item.user">
                  <!-- 头像 -->
                  <img :src="headImg(item.src)" class="h-28px w-28px object-contain rounded-full border-1 border-solid border-white shrink-0" />
                  <!-- 三角箭头 -->
                  <span class="absolute mt-1.5" :class="item.user !== '琳恩' ? 'ml-6.65 triangle-right' : 'mr-6.2 triangle-left'"></span>
                  <!-- 气泡内容 -->
                  <div class="relative px-2.5 pt-1.2 pb-1 rounded-2 font-bold break-words text-16px max-w-85%" :class="item.user === '琳恩' ? 'bubble-right bg-#409EFF text-white' : 'bubble-left bg-white text-black'" v-html="item.text" @touchstart="item.shijian ? shijianTou(item) : null"></div>
                </template>
                <template v-else-if="item.choices !== undefined">
                  <div class="w-full text-20px flex flex-col items-end box-border pr-5">
                    <div class="flex flex-row-reverse w-75%">
                      <img :src="headImg('mytouxiang.png')" class="h-28px w-28px object-contain rounded-full border-1 border-solid border-white shrink-0" />
                      <span class="mt-1.5 triangle-right-me scale-x-[-1]"></span>
                      <div class="flex flex-col w-full gap-y-1 bg-#409EFF text-white font-bold break-words text-16px max-w-85% rounded-2 px-2.5 pt-1.7 pb-2.5">
                        <div class="flex items-center gap-x-1.5">
                          <img src="@/assets/icon/lianxi.png" class="scale-x-[-1] w-25px" />
                          <span>短信回复</span>
                        </div>
                        <div class="text-black bg-white rounded-full flex justify-center items-center py-1 text-14px" v-for="item in item.choices" :key="item.text" @touchstart="huifu(item.rengwu)">{{ item.text }}</div>
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="w-full justify-center flex text-12px text-white/60">{{ item.text }}</div>
                </template>
              </div>
              <el-divider style="margin: 2.5vh 0">最新消息</el-divider>
            </div>
          </div>
          <div v-else class="bg-black flex-1 ml-2 rounded-3 flex flex-col h-72vh min-w-[300px]">
            <!-- 面板标题 -->
            <div class="px-3 py-1.5vh flex items-center justify-between gap-x-2 bottomB">
              <div class="flex items-center gap-x-2">
                <el-icon size="22px" @touchstart="qunIndex = false"><ArrowLeftBold /></el-icon>
                <span class="font-bold text-16px">{{ tactName }}</span>
              </div>
            </div>
            <div class="mt-2vh w-full h-full flex flex-wrap gap-x-5 px-3 py-2 box-border">
              <div class="flex flex-col items-center gap-y-1 w-20" v-for="item of qun" :key="item.name">
                <img :src="headImg(item.src)" class="h-40px w-40px object-contain rounded-full border-1 border-solid border-white shrink-0" />
                <span class="text-20px">{{ item.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 新闻 -->
    <div v-show="num1 === 2" class="w-full h-full flex flex-col bg-white rounded-bl-3 rounded-br-3">
      <div class="bg-black py-2vh text-20px flex items-center justify-between px-4">
        <div class="flex items-center gap-x-3">
          <img src="@/assets/icon/new1.png" class="h-36px h-36px" />
          <span class="text-20px font-bold">热点新闻</span>
        </div>
        <el-icon size="3.5vw" color="#F56C6C" class="border-1 border-solid border-red rounded-full" @touchstart="yingyong(0)"> <CircleCloseFilled /></el-icon>
      </div>
      <div class="flex flex-col box-border px-2vw py-4 gap-y-7 overflow-y-auto">
        <div v-for="(item, index) of user.attributes.news" :key="item.src" class="flex w-full flex-col">
          <div class="flex items-center gap-x-2 w-full" :class="index % 2 !== 0 ? 'flex-row-reverse' : ''">
            <img :src="newImg(item.src)" class="w-25vw h-[14.0625vw] object-contain rounded-3 border-1 border-solid border-white shrink-0" />
            <div class="text-black flex h-full flex-1 overflow-hidden flex-col">
              <div class="text-22px font-bold truncate underline underline-offset-4">
                <span @touchstart="newOpen(item)">{{ item.title }}</span>
              </div>
              <span class="text-15px overflow-hidden text-ellipsis line-clamp-4 all-indent mt-1" v-html="item.content"></span>
              <div class="flex justify-end text-13px text-#909399 mt-1 gap-x-3 font-bold">
                <span>{{ item.name }}</span
                ><span>{{ item.time }}</span>
              </div>
            </div>
          </div>
          <el-divider style="margin: 6px 0 0 0" />
        </div>
      </div>
    </div>
    <!-- 备忘录 -->
    <div v-show="num1 === 3" class="w-full h-full flex flex-col bg-white/85 rounded-bl-3 rounded-br-3 gap-y-2vh">
      <div class="bg-black py-2vh text-20px flex items-center justify-between px-4">
        <div class="flex items-center gap-x-3">
          <img src="@/assets/icon/beiwanglu.png" class="h-36px h-36px" />
          <span class="text-20px font-bold">备忘录</span>
        </div>
        <el-icon size="3.5vw" color="#F56C6C" class="border-1 border-solid border-red rounded-full" @touchstart="yingyong(0)"> <CircleCloseFilled /></el-icon>
      </div>
      <div class="flex flex-1 box-border px-2 gap-x-2">
        <el-date-picker-panel v-model="user.attributes.DateYear" class="pointer-events-none h-73vh" />
        <el-collapse v-model="activeName" accordion class="bg-white flex-1 mb-3vh rounded-1 px-2 overflow-y-auto h-73vh">
          <el-collapse-item :title="'进行中的任务 （ ' + user.attributes.allTasks?.finishedTasks.length + ' ）'" name="1">
            <div class="flex flex-col gap-y-2vh">
              <div v-for="item of user.attributes.allTasks?.finishedTasks" :key="item.name" class="flex flex-col border border-solid border-#EBEEF5 px-2vw pt-1.2vh pb-0.5vh">
                <div class="text-gray-800 flex items-center gap-x-1">
                  <img v-if="item.src" :src="headImg(item.src)" class="w-16px h-16px object-contain" />
                  <el-icon v-else size="15px" color="#909399"><InfoFilled /></el-icon>
                  <span>{{ item.name }}</span>
                </div>
                <span class="text-gray-500" v-html="item.note"></span>
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item :title="'已完成的任务 （ ' + user.attributes.allTasks?.unfinishedTasks.length + ' ）'" name="2">
            <div class="flex flex-col gap-y-2vh">
              <div v-for="item of user.attributes.allTasks?.unfinishedTasks" :key="item.name" class="flex flex-col border border-solid border-#EBEEF5 px-2vw pt-1.2vh pb-0.5vh">
                <div class="text-gray-800 flex items-center gap-x-1">
                  <el-icon color="#67C23A" size="15px"><SuccessFilled /></el-icon><span>{{ item.name }}</span>
                </div>
                <span class="text-gray-500" v-html="item.note"></span>
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item :title="'已获得的成就 （ ' + user.attributes?.achv?.length + ' ）'" name="3">
            <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(80px,10vw,120px),1fr))] gap-x-5vw gap-y-4vh">
              <div v-for="(item, index) in user.attributes.achv" :key="index" class="bg-white text-black h-[70px] w-full flex justify-center items-center rounded relative">
                <el-popover class="box-item pointer-events-auto" :teleported="true" :width="300" trigger="click" placement="bottom-start" :append-to-body="false">
                  <template #default>
                    <div>
                      <div class="text-16px text-gray-700 mb-2">{{ item.note }}</div>
                      <div class="text-13px text-gray-500 mb-2">{{ item.title }}</div>
                    </div>
                  </template>
                  <template #reference>
                    <div class="text-#409EFF text-18px iconfont2">{{ item.name }}</div>
                  </template>
                </el-popover>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
    <!-- 监测 -->
    <div v-show="num1 === 4" class="w-full h-full flex flex-col bg-white/85 rounded-bl-3 rounded-br-3 gap-y-2vh">
      <div class="bg-black py-2 text-20px flex items-center justify-between px-4">
        <div class="flex items-center gap-x-3">
          <img src="@/assets/icon/jiance.png" class="h-36px h-36px" />
          <span class="text-20px font-bold">数据监测</span>
        </div>
        <el-icon size="3.5vw" color="#F56C6C" class="border-1 border-solid border-red rounded-full" @touchstart="yingyong(0)"> <CircleCloseFilled /></el-icon>
      </div>
      <div class="flex flex-1 mx-3 mb-2vh gap-x-3">
        <div class="bg-white w-30vw h-72vh rounded-2">
          <img src="@/assets/fullBody/zhujue/tuzilihui.webp" class="w-full h-full object-contain" />
        </div>
        <div class="bg-white flex-1 h-72vh box-border rounded-2 text-black text-22px font-bold py-5 px-4 flex flex-col gap-y-4">
          <div class="flex gap-x-3">
            <span class="iconfont2 line-height-30px">压力值</span>
            <el-progress :percentage="user.attributes.jingshenData?.Pressure" :color="progressColor" striped striped-flow :stroke-width="10" class="flex-1" />
          </div>
          <div class="flex gap-x-3 items-center">
            <span class="iconfont2 line-height-30px">初始精神力</span><span class="iconfont4 text-32px">{{ user.attributes.jingshenData?.chushiPower }}</span> <span class="iconfont2 line-height-30px ml-5">当前精神力</span><span class="iconfont4 text-32px text-#409EFF">{{ user.attributes.jingshenData?.SpiritPower }} </span>
          </div>
          <div class="flex gap-x-1 items-center text-yellow-500">
            <el-icon><WarningFilled /></el-icon> <span class="iconfont2 line-height-30px">任务提升幅度:</span
            ><span class="iconfont4 text-32px font-bold"
              ><span class="text-yellow-700 iconfont4">{{ powerIncreasePercent }}%</span> / {{ user.attributes.jingshenData?.mubianPower }}%</span
            >
          </div>
          <div class="flex gap-x-3 items-center">
            <span class="iconfont2 line-height-30px">好感度(仅测试版本可见)：</span><span class="text-26px">{{ user.attributes?.Character?.[0]?.Affinity ?? 0 }}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- 新闻弹出框 -->
    <el-dialog v-model="dialogTableVisible" width="90%" :close-on-click-modal="false" :top="'8vh'">
      <template #header>
        <div class="flex items-center justify-between w-full text-black font-bold text-24px">
          {{ news.title }}
        </div>
      </template>
      <div class="text-#999999 text-14px mb-2vh">来源：{{ news.name }} | {{ news.time }}</div>
      <div class="overflow-y-auto pb-5vh flex flex-col justify-center items-center">
        <img :src="newImg(news.src)" class="w-40vw mb-2vh object-contain" />
        <div v-html="news.content" class="block text-15px all-indent text-black"></div>
      </div>
    </el-dialog>
    <!-- 选择实验体 -->
    <el-dialog v-model="dialogTableVisible1" class="pb-0! mb-0!" width="80%" :close-on-click-modal="false" :top="'3vh'">
      <template #header>
        <div class="flex items-center w-full gap-x-2 text-#909399 text-14px box-border px-5 py-2 h-7 rounded-full border border-solid border-#DCDFE6">
          <el-icon size="17px"><Warning /></el-icon>
          <span>https://192.168.128.01:8081/#/AoMi2031PeiYu/index</span>
        </div>
      </template>
      <div>
        <el-carousel :autoplay="false" type="card" height="78vh" indicator-position="none">
          <el-carousel-item v-for="item in lihuiArr" :key="item.name" class="border-1 border-solid border-#E4E7ED">
            <img :src="bgImg(item.bgSrc)" class="w-full h-full object-cover absolute -z-2" />
            <div class="flex justify-center relative">
              <span class="absolute text-20px left-2 top-2 text-#333 iconfont2 bg-white py-2 px-3 border border-solid border-#333 rounded-1">{{ item.name }}</span>
              <span class="absolute text-20px right-2 top-2 text-red-600 iconfont2 bg-white py-2 px-3 border border-solid border-#333 rounded-1">{{ item.power }}</span>
              <span class="absolute text-16px left-2 top-15vh bg-#10B981 text-#FFFFFF px-3 pt-1 pb-1.1 rounded-2" @touchstart="selectJilu(item, 0)">实验记录</span>
              <span v-if="item.lock" class="absolute text-20px bottom-25vh text-white bg-#409EFF/85 px-4 py-1.5 rounded-full text-20px" @touchstart="selectJilu(item, 1)">选择实验体</span>
              <span v-else class="absolute text-20px bottom-25vh text-black/75 bg-#F2F3F5/65 px-4 py-1.5 rounded-full text-20px">
                <span class="relative inline-block">
                  <img src="@/assets/icon/lock.png" class="w-30px h-30px absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-80" />
                  <span class="relative z-10">等待后续更新</span>
                </span>
              </span>
              <div class="absolute -z-1 bg-black/25 w-full h-150%"></div>
              <img :src="lihuiImg(item.src)" class="w-70% object-contain" />
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
    </el-dialog>
    <el-dialog v-model="dialogTableVisible2" class="pb-0! mb-0!" width="90%" :close-on-click-modal="false" :top="'8vh'">
      <template #header>
        <div class="flex items-center w-full text-#333 font-blod">实验报告</div>
      </template>
      <div class="h-60vh relative text-black text-15px line-height-24px all-indent">
        <p>编号 220 个体具备较强的服从性与配合度，在实验过程中可严格遵循指令执行任务，无抗拒或不配合行为。</p>
        <p>该个体智力较低，知识接受与理解速度迟缓，需实验人员通过多次、长时间的讲解与指导方可初步掌握，且掌握后记忆留存能力较弱，需通过反复巩固以避免遗忘。</p>
        <p>此外，该个体对痛苦的耐受度较高，在完成任务后若未获得正向反馈（如表扬），会表现出情绪低落；若实验人员对其采取冷漠态度，个体将出现恐惧、惶恐等负面情绪反应。</p>
        <img src="@/assets/icon/logo.webp" class="w-60px h-60px absolute left-0 bottom-0.5" />
        <img src="@/assets/fullBody/zhujue/xiaotuzi.webp" class="w8-0px h-80px absolute right-0 bottom-0" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, onBeforeUnmount } from "vue";
import { useCounterStore } from "@/store/counter"; // pinia库
import { ElMessText } from "@/pages/zujian/utils.js";
import emitter from "@/bus"; // 引入传值组件
import { ElMessageBox } from "element-plus";
import { doCheck } from "./duanxin.js";
const user = useCounterStore();
const visible = ref(false);
const num1 = ref(0);
const tactIndex = ref(0);
const tactName = ref("萨米");
const tactArr = ref([]);
const activeName = ref("1"); //笔记
const messageContainer = ref(null);
const lihuiArr = [
  {
    name: "编号 220",
    power: "精神力 20",
    src: "tuzilihui",
    lock: true,
    bgSrc: "tzBg",
  },
  {
    name: "编号 219",
    power: "精神力 24",
    src: "goulihui",
    bgSrc: "gouBg",
  },
  {
    name: "编号 218",
    power: "精神力 60",
    src: "hulilihui1",
    bgSrc: "huliBg",
  },
  {
    name: "编号 217",
    power: "精神力 40",
    src: "shuishourenlihui",
    bgSrc: "shuiBg",
  },
];
//新闻
const dialogTableVisible = ref(false);
const dialogTableVisible1 = ref(false);
const dialogTableVisible2 = ref(false);
const news = ref(null);
onMounted(() => {
  console.log('user.attributes=',user.attributes);
  tactArr.value = user.attributes.contacts[0].messages;
  window.handleLinkTouch = handleLinkTouch;
});
onBeforeUnmount(() => {
  delete window.handleLinkTouch;
});
const handleLinkTouch = (i) => {
  if (i === 1) {
    if (user.attributes.userApps.length > 3) {
      ElMessText(`链接已失效`);
      return;
    }
    dialogTableVisible1.value = true;
  }
};
// 压力值颜色计算函数
const progressColor = (percentage) => {
  if (percentage < 40) return "#67C23A"; // 绿色（低压力）
  if (percentage < 70) return "#E6A23C"; // 黄色（中等）
  return "#F56C6C"; // 红色（高压力）
};
//计算提升幅度
const powerIncreasePercent = computed(() => {
  const data = user.attributes.jingshenData;
  console.log('data=',data);
  if (data===undefined) return
  const { chushiPower, SpiritPower } = data;

  if (!chushiPower) return 0;

  const percent = ((SpiritPower - chushiPower) / chushiPower) * 100;

  // 判断是否接近整数（避免浮点误差）
  return Math.abs(percent - Math.round(percent)) < 0.05 ? Math.round(percent) : percent.toFixed(1);
});
//打开新闻
function newOpen(item) {
  console.log("item=", item);
  dialogTableVisible.value = true;
  news.value = item;
}

const headImg = (src) => {
  return new URL(`../../assets/icon/${src}`, import.meta.url).href;
};
const newImg = (src) => {
  return new URL(`../../assets/icon/${src}.webp`, import.meta.url).href;
};
const lihuiImg = (src) => {
  return new URL(`../../assets/fullBody/zhujue/${src}.webp`, import.meta.url).href;
};
const bgImg = (src) => {
  return new URL(`../../assets/images/${src}.webp`, import.meta.url).href;
};
//点击聊天内容
function shijianTou(item) {
  user.playSound("clickS", false, user.volume * 0.5);
  if (item.shijian === 1) {
  }
}
const qun = ref(undefined);
const qunIndex = ref(false);
//切换联系人
function tactChange(item, index) {
  qunIndex.value = false;
  user.playSound("clickS", false, user.volume * 0.5);
  tactIndex.value = index;
  tactName.value = item.name;
  tactArr.value = item.messages;
  console.log("tactIndex=", tactIndex.value);
  qun.value = item.qun;
  console.log("item=", item);

  // 下一次 DOM 更新后滚动到底部
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
}
function yingyong(id) {
  user.playSound("clickS", false, user.volume * 0.5);
  num1.value = id;
  qunIndex.value = false;
  console.log("id=", id);
  if (id === 1) {
    nextTick(() => {
      if (messageContainer.value) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
      }
    });
    if (user.attributes.contacts[0].qun !== undefined) {
      qun.value = user.attributes.contacts[0].qun;
    }
  } else if (id === 2) {
  }
}
//群成员
function qunxinxi() {
  qunIndex.value = true;
}
//实验记录/选择
function selectJilu(item, index) {
  user.playSound("clickS", false, user.volume * 0.5);
  if (index === 0) {
    if (item.name !== "编号 220") {
      ElMessText(`等待后续更新`);
      return;
    }
    dialogTableVisible2.value = true;
  } else if (index === 1) {
    if (item.name !== "编号 220") {
      return;
    }
    ElMessageBox.confirm(
      "确定要培育编号 220 吗？",
      "确认操作", // 标题
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        closeOnClickModal: false, // 🚫 禁止点击遮罩关闭
      }
    )
      .then(async () => {
        // ✅ 点击“确定”后执行的逻辑
        ElMessText("已选择", "success");
        user.attributes.textJuxu = false;
        const index = user.attributes.allTasks.finishedTasks.findIndex((task) => task.id === 2);
        user.attributes.allTasks.finishedTasks.splice(index, 1);
        user.attributes.allTasks.unfinishedTasks.unshift({
          id: 2,
          name: "实验体挑选",
          note: "通过平板打开消息，在实验体培育部群聊中点击网址链接选择想要培育的实验体。",
        });
        user.attributes.allTasks.finishedTasks.push({
          id: 3,
          name: "实验体培育",
          note: "通过自身手段提升实验体精神力，帮助觉醒能力。",
          src: "shiyan.png",
        });
        user.attributes.userApps.push({
          src: "jiance.png",
          name: "数据监测",
          id: 4,
          tips: false,
        });
        user.attributes.userApps[0].tips = false;
        user.attributes.contacts[1].tips = false;
        user.wupingShow = 0;
        await nextTick();
        emitter.emit("text_num");
      })
      .catch(() => {
        // ❌ 点击“取消”或关闭弹窗时执行的逻辑
      });
  }
}
//回复短信
function huifu(item) {
  const result = doCheck(item); // 传参
  tactArr.value.pop();
  tactArr.value.push(result);
  user.attributes.contacts[tactIndex.value].tips = false;
  //判断短信是否没有感叹号
  const allFalse = user.attributes.contacts.every((item) => item.tips === false);
  if (allFalse) {
    user.attributes.userApps[0].tips = false;
  }
  user.attributes.textJuxu = false;
  emitter.emit("touchGongo");
}
</script>

<style scoped>
:deep(.el-overlay),
:deep(.el-overlay-mask) {
  pointer-events: auto !important;
}

@keyframes floatY {
  0%,
  100% {
    transform: translateY(1.5px);
  }
  50% {
    transform: translateY(-1.5px);
  }
}

.float-warning {
  animation: floatY 1.5s ease-in-out infinite;
}
img {
  pointer-events: none; /* 禁止点击 */
  user-select: none; /* 禁止选中，可选 */
}
.all-indent {
  text-indent: 2em; /* 首行额外缩进 */
}
:deep(.all-indent p) {
  text-indent: 2em; /* 首行缩进 */
  margin: 0 0 0.3em; /* 段落底部间距，可根据需要调大 */
  line-height: 1.4; /* 行高，可选 */
}
.triangle-left {
  width: 0;
  height: 0;
  border: 7px solid transparent;
  border-left-color: #409eff; /* 👉 朝右的白色三角 */
}
.triangle-right {
  width: 0;
  height: 0;
  border: 7px solid transparent;
  border-right-color: white; /* 👉 朝右的白色三角 */
}
.triangle-right-me {
  width: 0;
  height: 0;
  border: 7px solid transparent;
  border-right-color: #409eff; /* 👉 朝右的白色三角 */
}
:deep(.text-blue-600) {
  color: #2563eb;
  text-decoration: underline;
}
:deep(.text-jinggao) {
  color: #f56c6c;
}
.text-overflow-1 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:deep(.el-divider__text) {
  background-color: black;
  color: white;
  font-size: 12px;
  margin-top: -0.5vh;
}
.bottomB {
  border-bottom: 2px solid gray;
}
</style>
