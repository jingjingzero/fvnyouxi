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
      <div v-show="!detail">
          <div class="text-center mt-15vh  box-border mx-3 rounded-1 line-height-12 text-20px iconfont2 cursor-pointer transition-all duration-300 bg-#F56C6C text-white/90 font-bold" @click="fanhui(1)">返回</div>
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
              <div class="bg-white/90 rounded-1 overflow-hidden relative cursor-pointer select-none" @click="goDetail(item.name)">
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
      <div v-if="detail" class="h-full z-1 relative">
        <!-- 人物档案卡 -->
        <div class="w-full h-full bg-black/40 flex rounded-2 flex-col border border-white/60 shadow-xl">
          <div class="flex items-center mt-3vh mb-3vh">
            <!-- 左侧头像 -->
            <div class="w-30% relative flex items-start justify-center px-3">
              <div class="w-35 h-35 rounded-1 overflow-hidden border border-cyan-400/40 bg-white/80">
                <img :src="Img(xinxi.img)" class="w-full h-full object-cover pointer-events-none" />
              </div>
            </div>
            <!-- 标题 -->
            <div class="text-white">
              <div class="flex items-center mb-2">
                <span class="text-24px font-bold tracking-widest iconfont2"> 人物档案 </span>
                <span class="ml-3 text-14px text-cyan-300 opacity-80 iconfont2"> PERSONNEL FILE </span>
              </div>

              <!-- 信息表 -->
              <div class="grid grid-cols-2 gap-y-2 gap-x-6 text-16px mb-3">
                <div><span class="text-cyan-300">姓名：</span>{{ xinxi.name }}</div>
                <div><span class="text-cyan-300">类型：</span>{{ xinxi.type }}</div>
                <div><span class="text-cyan-300">性格：</span>{{ xinxi.xingge }}</div>
                <div><span class="text-cyan-300">身份：</span>{{ xinxi.shenfen }}</div>
                <div><span class="text-cyan-300">状态：</span>{{ xinxi.status }}</div>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col px-4 text-white overflow-y-auto box-border box-border">
            <!-- <div class="flex-1 text-17px leading-6 text-white font-bold iconfont2 overflow-y-auto">{{ xinxi.beijing[0] }}</div> -->
            <el-collapse v-model="activeName" accordion>
              <el-collapse-item v-for="item of xinxi.beijing" :key="item.name" :title="item.title" :name="item.name">
                <div class="iconfont2 text-15px indent-2em box-border px-4">{{ item.text }}</div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import router from "@/router"; //引入路由
const zhujue = import.meta.glob("@/assets/fullBody/zhujue/*.{webp}", { eager: true });
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
// 预加载函数
function preloadImages(modules) {
  preloadImages(zhujue);
  const list = Object.values(modules);
  list.forEach((mod) => {
    const img = new Image();
    img.src = mod.default;
  });
}

function selectIndex(index) {
  if (!show.value||infoIndex.value===index) return;

  infoIndex.value = index;
  show.value = false;

  if (index === 0) info1.value = arr1;
  else if (index === 1) info1.value = arr2;
  else info1.value = arr3;

  setTimeout(() => {
    show.value = true;
  }, 200);
}
const xinxi = ref({
  img: "", //照片
  name: "", //姓名
  type: "", //类型
  xingge: "", //性格
  shenfen: "", //身份
  status: "", //状态
  beijing: [], //背景
});
const activeName = ref("1"); //折叠面板
const xinxiArr = [
  {
    img: "user", //照片
    name: "220", //姓名
    type: "重要人物", //类型
    xingge: "胆小", //性格
    shenfen: "实验体", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "长时间未觉醒能力的实验体，被送往“苍穹设施”进行最后阶段的潜力挖掘。该个体为融合耳廓狐基因所创造的生命体，表现出明显的胆怯与依附倾向，缺乏独立性，认知与学习能力偏低，反应迟缓，但整体性情温顺，实验较为配合。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  {
    img: "tuzi", //照片
    name: "198", //姓名
    type: "NPC", //类型
    xingge: "卑微", //性格
    shenfen: "实验体", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "人造生命，本该被处理的失败实验体，却因为太过听话而被西奥留下。 目前在花园负责日常清洁，夜晚睡在长椅上。 一味讨好他人，不敢惹任何人生气， 是最底层、最容易被忽视的存在。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  {
    img: "gou", //照片
    name: "219", //姓名
    type: "重要人物", //类型
    xingge: "傲娇", //性格
    shenfen: "实验体", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "长时间未觉醒能力的实验体，被送往“苍穹设施”进行最后阶段的潜力挖掘。该个体为融合***创造的生命体，性格表现较为封闭，偏好独处，对外界干预抱有警惕，对管控指令与安排并非绝对服从，已显现出初步的自我意识与反抗倾向。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  {
    img: "huli1", //照片
    name: "218", //姓名
    type: "重要人物", //类型
    xingge: "温和", //性格
    shenfen: "实验体", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "因长期未觉醒核心能力，该实验体被移送至 “苍穹设施”，开展最后阶段的潜力挖掘。此个体为融合金毛犬基因创造的生命体，性情温和顺从、智力较高、具备主动学习的强烈意愿，行事沉稳成熟，对实验非常配合。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  {
    img: "shuishouren", //照片
    name: "217", //姓名
    type: "重要人物", //类型
    xingge: "自闭", //性格
    shenfen: "实验体", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "因长期未觉醒核心能力，该实验体被移送至 “苍穹设施”，开展最后阶段的潜力挖掘。此个体为融合水栖兽人基因创造的生命体，性格温和、精神状态萎靡。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  //兰陵
  {
    img: "cat", //照片
    name: "兰陵", //姓名
    type: "重要人物", //类型
    xingge: "正直", //性格
    shenfen: "雇佣兵", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "兰陵自童年丧失双亲后，便在街头颠沛流离，摸爬滚打。他与一群同样挣扎在底层的伙伴惺惺相惜，抱团组建起雇佣兵小队，靠着承接各类任务勉力过活。在兰陵的带领下，小队的知名度逐渐提升。某天夜晚，兰陵收留了一位重伤濒死的青年，名为拉格尔，起初他本不愿接纳，后在队友的求情下才勉为其难将人留下。相处日久，兰陵越发欣赏拉格尔的能力。为了证明自己，也为了带领小队迈入更广阔的舞台，兰陵接下了一项政府派发的危险任务——潜入集团盗取某件物品。因手握详细情报，他毅然承接了这份危险的人物，却未曾想遭到拉格尔的背叛。最终，小队全军覆灭，兰陵自身也沦为阶下囚。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  {
    img: "zhujue", //照片
    name: "琳恩", //姓名
    type: "NPC", //类型
    xingge: "理智 / 善良", //性格
    shenfen: "员工", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "身为集团网络安全负责人的她，被萨米看中能力，帮她解除洗脑枷锁后，直面过往受控时犯下的种种行径，愧疚缠身的她想要逃离集团，遂与萨米达成秘密协议，借工作失误的由头被萨米降职调往苍穹设施，暗中潜伏以帮助萨米窃取集团核心情报。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  //拉格尔
  {
    img: "dog1", //照片
    name: "拉格尔", //姓名
    type: "NPC", //类型
    xingge: "冷漠", //性格
    shenfen: "员工", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "拉格尔是人造生命，曾是同批次中的顶尖存在。因一次任务中心软，被集团判定为“不合格工具”，遭强行洗脑并剥离软弱特质，沦为集团最忠诚的鹰犬。某次秘密任务中，他因集团内部的间谍导致自身行踪暴露，被异能者设伏，拼死逃脱后只剩半口气，晕倒在兰陵小屋门口，被兰陵收留照料。失去记忆的他与兰陵共度了一段时光，后随接下特殊任务的兰陵前往苍穹设施——任务目标是潜入集团内部盗取某物。然而，当拉格尔在苍穹基地前看到集团标志的瞬间，记忆骤然复苏，他转身背叛并泄露了兰陵的行踪，致使兰陵任务失败，其队友全部遇难。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  {
    img: "xiao", //照片
    name: "西奥", //姓名
    type: "NPC", //类型
    xingge: "热情", //性格
    shenfen: "员工", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "西奥成长于集团从业者家庭，父母均为集团效力，受家庭环境的熏陶，他自然而然地步入集团任职，在他眼里，集团的一切行为都是合理的。他擅长伪装情绪，始终以笑脸迎人，将真实心绪藏于心底，也正因如此，在身边人眼中，他是友善亲和、平易近人的存在。西奥骨子里有着强烈的慕强心理，格外欣赏实力出众的强者，内心深处怀揣着对权力与地位的极致渴望，立志成为顶尖人物。在专业领域，他展现出不俗的天赋，尤其在调制药剂方面具备较强的能力。",
        title: "基础信息",
        name: "1",
      },
    ], //背景
  },
  {
    img: "makusi", //照片
    name: "马库斯", //姓名
    type: "NPC", //类型
    xingge: "冷血", //性格
    shenfen: "员工", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "马库斯出身精英家庭，父母对他自幼便极为严苛，在这样的成长环境中，他逐渐养成了好胜的性格。然而，在众多优秀的兄弟姐妹中，他始终是最不起眼的那一个，更是家族里唯一没有觉醒异能的孩子。这份“特殊”让他从未得到过父母的关爱，只有父母失望的叹气，童年时期频繁遭受兄弟姐妹的排挤与愚弄。长期的情感匮乏与不公对待，让他平等地厌恶着身边的所有人，性格愈发冷漠，对生命毫无敬畏之心。成年后，他被父母派遣到小基地工作，始终无法获得重用。为了达成自己的目标，他不择手段，愿意付出一切代价。",
        title: "基础信息",
        name: "1",
      },
    ],
  },
  {
    img: "faboer", //照片
    name: "法伯尔", //姓名
    type: "NPC", //类型
    xingge: "木讷", //性格
    shenfen: "员工", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "法伯尔出身平民家庭，家境贫寒。父母为了让他替自己完成未能实现的梦想——进入奥米集团工作，不惜倾尽所有力量供他求学。父母的殷切期待是支撑他一路坚持的动力，而他也不负所望，考上了一流的大学，毕业后成功入职奥米集团。本以为这会是幸福生活的开端，没想到却是噩梦的起点。上学期间，他是备受同学们瞩目的佼佼者，可进入集团后，却沦为垫底的存在。木讷内向的性格成为他工作中的巨大阻力，书本上的理论知识在实际工作应用中也难以派上用场，这让他在集团里始终处于底层。巨大的身份与能力落差席卷了他，可他却丝毫不敢辞职——父母为了供他上学、托关系帮他入职早已欠下巨额债务。为了偿还债务，也为了不辜负父母的付出，即便内心痛苦万分，他也只能咬牙坚持。他最大的期盼，便是有朝一日能够升职，彻底摆脱当下的困境。",
        title: "基础信息",
        name: "1",
      },
    ],
  },
  {
    img: "zhuren", //照片
    name: "主任", //姓名
    type: "NPC", //类型
    xingge: "理智", //性格
    shenfen: "领导", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "为集团奉献了大半辈子的元老，凭借自身努力从底层一步步打拼至如今的地位。她的身份较为特殊，是由异能者克隆而来的克隆人。早年集团曾推行克隆人计划，后发现克隆人无法觉醒异能，便终止了该计划，而她正是最后一批克隆人之一。虽然没有异能，但得益于继承了本体出色的能力，她在集团内摸爬滚打多年，凭借卓越的能力和多年的贡献获得了集团的赏识，最终成为苍穹设施的主要负责人。",
        title: "基础信息",
        name: "1",
      },
    ],
  },
  {
    img: "robot", //照片
    name: "机械安保", //姓名
    type: "NPC", //类型
    xingge: "绝对顺从", //性格
    shenfen: "工具", //身份
    status: "存活", //状态
    beijing: [
      {
        text: "机械安保是集团依托多年技术积累研发的机械生命，其核心特质为无自我意识、绝对顺从指令。该类机械生命的核心功能是替代兽人维持集团各设施的正常运转，保障设施安全与秩序。",
        title: "基础信息",
        name: "1",
      },
    ],
  },
];
function goDetail(name) {
  console.log("跳转", name);
  detail.value = true;
  if (name === "220") {
    xinxi.value = xinxiArr[0];
  } else if (name === "198") {
    xinxi.value = xinxiArr[1];
  } else if (name === "219") {
    xinxi.value = xinxiArr[2];
  } else if (name === "218") {
    xinxi.value = xinxiArr[3];
  } else if (name === "217") {
    xinxi.value = xinxiArr[4];
  } else if (name === "兰陵") {
    xinxi.value = xinxiArr[5];
  } else if (name === "琳恩") {
    xinxi.value = xinxiArr[6];
  } else if (name === "拉格尔") {
    xinxi.value = xinxiArr[7];
  } else if (name === "西奥") {
    xinxi.value = xinxiArr[8];
  } else if (name === "马库斯") {
    xinxi.value = xinxiArr[9];
  } else if (name === "法伯尔") {
    xinxi.value = xinxiArr[10];
  } else if (name === "主任") {
    xinxi.value = xinxiArr[11];
  } else if (name === "机械安保") {
    xinxi.value = xinxiArr[12];
  }
}
function fanhui(index) {
  if (index === 0) {
    detail.value = false;
    activeName.value = "1";
  }else{
      router.push({ name: "index" });
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
:deep(.el-collapse-item__header) {
  background-color: rgba(64, 158, 255, 0.8);
  color: white;
  font-size: 20px;
  padding-left: 15px;
  box-sizing: border-box;
  font-weight: bold;
  font-style: italic;
  letter-spacing: 0.05em;
}

:deep(.el-collapse-item__wrap) {
  background-color: rgba(0, 0, 0, 0.3);
}
:deep(.el-collapse-item__content) {
  color: white;
  padding-bottom: 10px;
  padding-top: 5px;
}
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
