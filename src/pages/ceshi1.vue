<template>
  <div class="w-full h-100vh flex relative flex overflow-hidden" ref="containerRef">
    <!-- 动态渲染技能动画 -->
    <video
      v-for="item in animations"
      :key="item.id"
      :ref="(el) => (videoRefs[item.id] = el)"
      :src="item.src"
      preload="auto"
      class="absolute pointer-events-none z-999"
      :style="{
        left: item.left + 'px',
        top: item.top + 'px',
        width: item.width + 'px',
        height: item.height + 'px',
        transform: `translate(-50%, -50%) rotate(${item.angle}deg)`,
      }"
      @ended="removeAnimation(item.id)" />
    <video
      v-for="item in animations1"
      :key="item.id"
      :ref="(el) => (videoRefs1[item.id] = el)"
      preload="auto"
      :src="item.src"
      playsinline
      webkit-playsinline
      muted
      class="absolute pointer-events-none z-999"
      :style="{
        left: item.left,
        top: item.top,
        width: item.width,
        height: item.height,
        transform: `${item.transform}`,
      }"
      @ended="removeAnimation1(item.id)" />
    <div class="max-w-22vw w-35vh flex-col flex items-center justify-evenly py-2vh box-border gap-y-2vh">
      <div :ref="(el) => (popoverRefs3Aoe = el)" class="absolute w-35vh h-80vh z-9"></div>
      <div class="h-20vh w-20vh relative" v-for="(item, index) of Character" :key="index" :class="{ shake: item.isShaking }" :style="{ '--shake-distance': item.shakeDistance + 'px' }">
        <div :ref="(el) => (popoverRefs3[index] = el)" class="absolute h-28vh w-28vh z-9 -left-3vh"></div>
        <div class="absolute -top-3.4 flex w-full justify-end" v-for="(item1, index1) of item.status" :key="item1.name">
          <!-- 状态栏 -->
          <img v-if="index1 < 5" :src="JnImg(item1.img)" class="w-4.8 h-4.8 object-cover rounded-1 opacity-80 border border-solid border-gray" />
        </div>
        <div class="absolute w-full h-full border-2 border-solid rounded-full z-2 p-2 -left-1vw -bottom-3" v-if="gongjizhe[0].name === item.name || (gongjizhe[0].name === '全部' && !isDead(item))" :style="{ borderColor: gongjizhe[0].color }"></div>
        <el-popover trigger="click" placement="right" width="250" :disabled="open">
          <template #reference>
            <img :src="headImg(item.img)" class="w-95% object-contain mx-2.5% z-10! relative" :style="{ filter: isDead(item) ? 'grayscale(100%)' : 'none' }" />
          </template>
          <div class="py-1vh flex flex-col pr-1 gap-y-1vh">
            <div class="flex justify-between pr-3">
              <div>攻击力:{{ item.str }}</div>
              <div>敏捷:{{ item.agi }}</div>
            </div>
            <div class="flex flex-col">
              <div v-for="jineng of item.jineng" :key="jineng.name">
                <div class="text-#409EFF font-bold">{{ jineng.name }}(技能)</div>
                <div class="text-13px">{{ jineng.miaoshu }}</div>
              </div>
              <div v-for="jineng of item.beidong" :key="jineng.name">
                <div class="text-#E6A23C font-bold">{{ jineng.name }}(被动)</div>
                <div class="text-13px">{{ jineng.miaoshu }}</div>
              </div>
            </div>
          </div>
        </el-popover>
        <el-progress :text-inside="true" :show-text="false" :stroke-width="9" :percentage="item.hpPercent" status="success" />
        <div class="text-12px text-#333 mt-0.5 flex justify-center">{{ item.currentHp }}/{{ item.maxHp }}</div>
        <!-- 扣血飘字 -->
        <transition-group name="float-damage" tag="div">
          <div v-for="dmg in item.damageTexts" :key="dmg.id" class="absolute left-1/2 -bottom-9vh text-red-400 font-bold text-lg transform -translate-x-1/2">-{{ dmg.value }}</div>
        </transition-group>
      </div>
    </div>

    <!-- 战斗主区域 -->
    <div class="flex-1 biankuang flex flex-col relative bg-#F2F3F5/25">
      <!-- 战斗日志 -->
      <div class="h-80vh flex flex-col" ref="logContainer">
        <div class="text-center font-medium text-lg py-2">战斗记录</div>
        <div ref="logContent" class="flex-1 overflow-y-auto px-4 py-2 text-sm">
          <div v-for="(log, index) in battleLog" :key="index" v-html="log"></div>
        </div>
      </div>

      <!-- 行动条区域 -->
      <template v-if="resultJieguo === 0">
        <div class="flex flex-1 items-end pb-2vh box-border" v-if="!myRound">
          <div class="flex-1">
            <!-- 友军行动条图标 -->
            <div class="flex relative">
              <div class="h-10vh w-10vh absolute -top-5vh transition-all duration-100 ease-linear z-2" :style="{ marginLeft: item.actionBar - 4 + '%' }" v-for="(item, index) of Character" :key="index">
                <img v-if="item.currentHp > 0" :src="headImg(item.img)" class="w-95% object-contain mx-2.5%" :alt="item.name + '行动图标'" />
              </div>
            </div>

            <!-- 敌人行动条图标 -->
            <div class="flex relative">
              <div class="h-10vh w-10vh absolute -top-5vh transition-all duration-100 ease-linear z-2" :style="{ marginLeft: item.actionBar - 4 + '%' }" v-for="(item, index) of enemy" :key="index">
                <img v-if="item.currentHp > 0" :src="headImg(item.img)" class="w-95% object-contain mx-2.5%" :alt="item.name + '行动图标'" />
              </div>
            </div>

            <!-- 行动条背景 -->
            <el-progress :percentage="100" :show-text="false" :stroke-width="10" color="#909399" class="mt-5vh" />
          </div>
        </div>
        <div v-else class="flex w-full h-20vh absolute bottom-0 items-center justify-around topBottom bg-#F2F3F5/60">
          <div class="w-25vh border border-solid border-#D4D7DE text-#606266 font-500 h-10vh! text-4vh! bg-white rounded-1 flex justify-center items-center" @click="gongji(1)">攻击</div>
          <el-popover trigger="click" placement="top" width="250" :ref="(el) => (popoverRefs1 = el)">
            <template #reference>
              <div class="w-25vh border border-solid border-#D4D7DE text-white font-500 h-10vh! text-4vh! bg-#409EFF rounded-1 flex justify-center items-center">技能</div>
            </template>
            <div class="py-2vh">
              <div class="flex gap-x-2 items-center" v-for="item of myShuxing.jineng" :key="item.img" @click="gongji(2, item)">
                <img :src="JnImg(item.img)" class="w-13 h-13 object-cover border border-solid border-#CDD0D6 p-1 rounded-1" />
                <div class="flex flex-col" v-if="item.lengque <= 0">
                  <span class="font-bold text-16px">{{ item.name }}</span>
                  <span class="text-13px text-#909399">{{ item.miaoshu }}</span>
                </div>
                <div v-else>冷却中,剩余{{ item.lengque }}回合</div>
              </div>
            </div>
          </el-popover>
        </div>
      </template>
    </div>

    <!-- 敌人角色面板（点击选择目标） -->
    <el-row ref="popoverRefs2Aoe" class="max-w-22vw w-35vh flex-col flex items-center justify-evenly py-2vh box-border gap-y-2vh">
      <div class="h-20vh w-20vh select-none relative" v-for="(item, index) of enemy" :key="index" :class="{ shake: item.isShaking }" :style="{ '--shake-distance': item.shakeDistance + 'px' }" @click="selectTarget(item)">
        <div :ref="(el) => (popoverRefs2[index] = el)" class="absolute h-28vh w-28vh z-9 -left-3vh"></div>
        <div class="absolute -top-3.4 flex w-full justify-end" v-for="(item1, index1) of item.status" :key="item1.name">
          <img v-if="index1 < 5" :src="JnImg(item1.img)" class="w-4.8 h-4.8 object-cover rounded-1 opacity-80 border border-solid border-gray" />
        </div>
        <div class="absolute w-full h-full border-2 border-solid rounded-full z-2 p-2 -left-1vw -bottom-3" v-if="gongjizhe[1].name === item.name || (gongjizhe[1].name === '全部' && !isDead(item))" :style="{ borderColor: gongjizhe[1].color }"></div>
        <el-popover trigger="click" placement="right" width="250" :disabled="open">
          <template #reference>
            <img :src="headImg(item.img)" class="w-95% object-contain mx-2.5% z-10! relative" :style="{ filter: isDead(item) ? 'grayscale(100%)' : 'none' }" />
          </template>
          <div class="py-1vh flex flex-col pr-1 gap-y-1vh">
            <div class="flex justify-between pr-3">
              <div>攻击力:{{ item.str }}</div>
              <div>敏捷:{{ item.agi }}</div>
            </div>
            <div class="flex flex-col">
              <div v-for="jineng of item.jineng" :key="jineng.name">
                <div class="text-#409EFF font-bold">{{ jineng.name }}(技能)</div>
                <div class="text-13px">{{ jineng.miaoshu }}</div>
              </div>
              <div v-for="jineng of item.beidong" :key="jineng.name">
                <div class="text-#E6A23C font-bold">{{ jineng.name }}(被动)</div>
                <div class="text-13px">{{ jineng.miaoshu }}</div>
              </div>
              <div class="flex justify-end" v-for="zhuangtai of item.status" :key="zhuangtai.name">
                <div class="font-bold" :class="zhuangtai.color">{{ zhuangtai.name }} (状态)</div>
              </div>
            </div>
          </div>
        </el-popover>
        <el-progress :text-inside="true" :show-text="false" :stroke-width="9" :percentage="item.hpPercent" status="success" />
        <div class="text-12px text-#333 mt-0.5 flex justify-center">{{ item.currentHp }}/{{ item.maxHp }}</div>
        <!-- 扣血飘字 -->
        <transition-group name="float-damage" tag="div">
          <div v-for="dmg in item.damageTexts" :key="dmg.id" class="absolute left-1/2 -bottom-9vh text-red-400 font-bold text-lg transform -translate-x-1/2">-{{ dmg.value }}</div>
        </transition-group>
      </div>
    </el-row>
    <el-tour v-model="open">
      <el-tour-step :target="popoverRefs2Aoe?.$el" title="选择指定的目标" placement="left" :show-close="false" :next-button-props="{ children: '取消' }" :content-style="{ width: '20vw' }" />
      <!-- 覆盖掉指示器 -->
      <template #indicators></template>
    </el-tour>
  </div>
</template>

<script setup>
import { reactive, ref, watch, nextTick, onMounted } from "vue";
import { ElMessText } from "@/pages/zujian/utils.js";
// 导入工具函数库
import { getAllCharacters, getAverageAgi, setHP, isDead, calculateDamage, startActionLoop, endTurn, nextTurn, initHpPercent } from "./actionUtils.js";
const jineng = ["../assets/donghua/bianda.webm", "../assets/donghua/hai1.webm", "../assets/donghua/one.webm"];

const containerRef = ref(null);
const gongjizhe = reactive([
  { name: null, color: "red" },
  { name: null, color: "blue" },
]); // 这里可以随时修改
//
const animations = ref([]);
const animations1 = ref([]);
const videoRefs = {}; // 用对象存，不用数组
const videoRefs1 = {}; // 用对象存，不用数组
const open = ref(false);
function gongji(num, item) {
  if (item?.lengque) {
    ElMessText("技能冷却中");
    return;
  }
  const popover = popoverRefs1.value;
  if (popover && typeof popover.hide === "function") {
    popover.hide();
  }
  if (num === 1) {
    open.value = true;
  } else if (num === 2) {
    open.value = false;
    if (item.name === "子弹倾泻") {
      friendAttack(myShuxing.value, "suiji", item);
    }
  }
}
const popoverRefs1 = ref();
const popoverRefs2 = ref([]);
const popoverRefs3 = ref([]);
const popoverRefs2Aoe = ref(null); //敌人全体
const popoverRefs3Aoe = ref(null); //友方全体
//技能图标
const JnImg = (src) => {
  return new URL(`../assets/JN/${src}.webp`, import.meta.url).href;
};
const headImg = (src) => {
  return new URL(`../assets/head/${src}.jpg`, import.meta.url).href;
};
// ------------------ 基础响应式数据 ------------------
// 敌人数据
const enemy = reactive([
  {
    name: "凯",
    str: 10,
    agi: 6,
    maxHp: 300,
    currentHp: 100.5,
    hpPercent: 0,
    damageTexts: [],
    actionBar: 0,
    isShaking: false,
    shakeDistance: 8,
    img: "cat_biaoqing",
    wuqi: {
      name: "利爪",
      atk: 1,
      miaoshu: "造成100%攻击伤害",
      texiao: {
        src: "../assets/donghua/zhuaji.webm",
        randomAngle: true, //是否随机角度播放
        scale: 1,
        time: 0,
      },
    },
    status: [],
    beidongArr: [1],
    beidong: [
      {
        name: "幸运",
        type: 1, // 1 = 被攻击时触发/攻击时触发
        miaoshu: "攻击时有50%概率使伤害提升25%，被攻击时有50%概率减免35%伤害。",
        rate: 0.5,
      },
    ],
  },
  // {
  //   name: "萨米",
  //   str: 10,
  //   agi: 7,
  //   maxHp: 100,
  //   currentHp: 100,
  //   damageTexts: [],
  //   actionBar: 0,
  //   hpPercent: 0,
  //   isShaking: false,
  //   shakeDistance: 8,
  //   img: "sy_biaoqing",
  //   wuqi: {
  //     name: "水球",
  //     atk: 0.7,
  //     Aoe: true,
  //     miaoshu: "对所有目标造成70%伤害",
  //     texiao: {
  //       src: "../assets/donghua/shuipao.webm",
  //       w: 40,
  //       h: 40,
  //       x: -35,
  //       y: -24,
  //       lianxian: true,
  //       bias: 0.35,
  //       fanzhuan: -1,
  //     },
  //   },
  //   status: [],
  //   // jineng: [
  //   //   {
  //   //     name: "重击",
  //   //     atk: 2,
  //   //     huihe: 4,
  //   //     miaoshu: "对目标造成200%伤害。",
  //   //     lengque: 0,
  //   //     rank: 10, //技能释放优先级
  //   //     effect: "混乱",
  //   //   },
  //   // ],
  // },
]);

// 友军数据
const Character = reactive([
  {
    name: "我",
    str: 6,
    int: 2,
    agi: 12,
    maxHp: 100,
    currentHp: 80,
    actionBar: 0,
    hpPercent: 0,
    damageTexts: [],
    isShaking: false, //是否抖动
    shakeDistance: 8, //抖动效果
    img: "tz_biaoqing",
    wuqi: {
      name: "手枪",
      atk: 1,
      zhiding: true,
      texiao: {
        src: "../assets/donghua/sheji.webm",
        lianxian: true,
        bias: 0.435,
        fanzhuan: -1,
        speed: 1.5,
        time: 600,
      },
    },
    jineng: [
      {
        name: "子弹倾泻",
        atk: 0.25,
        huihe: 3,
        img: "liulian",
        suiji: true,
        miaoshu: "对随机目标造成25%伤害，循环6次，冷却二回合。",
        cishu: 6,
        lengque: 0,
        texiao: {
          src: "../assets/donghua/liulianfa.webm",
          lianxian: true,
          bias: 0.435,
          fanzhuan: -1,
          time: 450,
        },
      },
    ],
    status: [],
  },
  {
    name: "赛瑞克",
    str: 8,
    int: 2,
    agi: 6,
    maxHp: 100,
    damageTexts: [],
    currentHp: 100,
    actionBar: 0,
    hpPercent: 0,
    isShaking: false,
    shakeDistance: 8,
    img: "hl_biaoqing",
    jineng: [
      {
        name: "更改认知",
        atk: 0,
        huihe: 4,
        miaoshu: "使目标陷入混乱一回合，冷却三回合。",
        lengque: 0,
        rank: 10, //技能释放优先级
        effect: "混乱",
        texiao: {
          src: "../assets/donghua/editrenzhi.webm",
          scale: 0.25,
        },
      },
    ],
    wuqi: {
      name: "臂刃",
      atk: 0.6,
      cishu: 2,
      texiao: {
        src: "../assets/donghua/dankan.webm",
        randomAngle: true, //是否随机角度播放
        x: -20,
        scale: 0.5,
        time: 0,
      },
    },
    status: [],
  },
  {
    name: "玲奈",
    str: 8,
    int: 2,
    agi: 11,
    maxHp: 100,
    damageTexts: [],
    currentHp: 100,
    actionBar: 0,
    hpPercent: 0,
    isShaking: false,
    shakeDistance: 8,
    img: "hl_biaoqing",
    jineng: [
      {
        name: "缠绕",
        atk: 1.7,
        huihe: 6,
        miaoshu: "对所有目标造成170%伤害并使其敏捷降低40%持续二回合，冷却五回合。",
        lengque: 0,
        rank: 5, //技能释放优先级
        effect: "减速",
        Aoe: true,
        texiao: {
          src: "../assets/donghua/biandaAoe.webm",
          randomAngle: true, //是否随机角度播放
          scale: 1,
          x: -10,
          time: 0,
        },
      },
    ],
    wuqi: {
      name: "长鞭",
      atk: 0.8,
      Aoe: true, //是否攻击全体
      //dandu: 0.3, //如果只有一个敌人，倍率 + 0.3
      texiao: {
        src: "../assets/donghua/bianda.webm",
        scale: 1,
        x: -10,
        time: 0,
      },
    },
    status: [],
  },
]);

// 战斗状态数据
const battleLog = reactive(["战斗开始！"]);
const logContent = ref(null); // 日志滚动容器
const currentActor = ref(null); // 当前行动角色
const isBattling = ref(false); // 是否在战斗中
const turnIndex = ref(0); // 回合顺序索引
const turnOrder = ref([]); // 回合顺序列表
const baseChargeRate = ref(5); // 行动条基础充能系数
const myRound = ref(false); //我的回合？
const myShuxing = ref(null);
// ------------------ 初始化逻辑 ------------------
onMounted(() => {
  // 1. 初始化生命值百分比
  initHpPercent(Character, enemy);
  // 2. 生成初始回合顺序（按敏捷排序，高敏捷先动）
  turnOrder.value = getAllCharacters(Character, enemy).sort((a, b) => b.agi - a.agi);
  // 3. 启动行动条循环
  startActionLoop(Character, enemy, currentActor, baseChargeRate.value);
  skillLoad();
  // 4. 监听当前行动角色变化，触发回合
  watch(currentActor, (newVal) => {
    if (newVal) {
      triggerTurn(newVal);
    }
  });
});

// ------------------ 日志滚动逻辑 ------------------
watch(battleLog, async () => {
  await nextTick();
  if (logContent.value) {
    // 滚动到底部
    logContent.value.scrollTop = logContent.value.scrollHeight;
  }
});

// ------------------ 组件专属工具函数 ------------------

// 2. 异步延迟（组件内通用，保留在组件）
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 3. 选择敌人目标（交互逻辑，保留在组件）
function selectTarget(enemyUnit) {
  if (!open.value) {
    return;
  }
  if (isBattling.value || isDead(enemyUnit)) return;
  open.value = false;
  friendAttack(myShuxing.value, enemyUnit);
}

// ------------------ 战斗核心逻辑（组件专属业务） ------------------
// 1. 触发当前角色的回合
async function triggerTurn(actor) {
  if (isDead(actor)) {
    endTurn(currentActor);
    startActionLoop(Character, enemy, currentActor, baseChargeRate.value);
    return;
  }

  isBattling.value = true;
  await delay(150);
  if (resultJieguo.value !== 0) {
    return;
  }
  battleLog.push(`<span class="font-bold text-18px py-1.5px">—— ${actor.name} 的行动回合 ——</span>`);
  // 判断是友军还是敌人，执行对应逻辑
  const isFriend = Character.includes(actor);
  //技能冷却减少一回合
  if (actor.jineng) {
    actor.jineng.forEach((e) => {
      if (e.lengque > 0) {
        e.lengque--;
      }
    });
  }
  console.log("actor=", actor);
  //状态判定
  if (actor.status.length > 0) {
    actor.status.forEach((item, index) => {
      console.log("item=", item);
      if (item.panduan === 2) {
        item.turns--;
        if (item.turns <= 0) {
          if (item.name == "减速") {
            actor.agi += Number(item.shuzhi);
            battleLog.push(`${actor.name} <span class="text-#6B8E23">减速</span> 效果移除。`);
          }
          actor.status.splice(index, 1);
        }
      }
    });
  }
  myShuxing.value = actor;
  let result = null;
  if (actor.name === "我") {
    // 友军回合：等待玩家选择目标
    // battleLog.push(`到你的回合了`);
    myRound.value = true;
    isBattling.value = false;
  } else if (isFriend) {
    //攻击血少的敌人
    const target = getLowestHpEnemy(enemy);
    if (actor.jineng) {
      result = actor.jineng.filter((item) => item.lengque === 0).sort((a, b) => b.rank - a.rank)[0];
    }
    if (result !== undefined) {
      friendAttack(actor, target, result);
    } else {
      friendAttack(actor, target);
    }
  } else {
    // 敌人回合：自动攻击
    if (actor.jineng) {
      result = actor.jineng.filter((item) => item.lengque === 0).sort((a, b) => b.rank - a.rank)[0];
    }
    if (result !== undefined) {
      await enemyAttack(actor, result);
    } else {
      await enemyAttack(actor);
    }
  }
}
// 1. 筛选并返回生命值最低的存活敌人
function getLowestHpEnemy(enemies) {
  // 过滤出所有存活的敌人
  const aliveEnemies = enemies.filter((enemy) => !isDead(enemy));
  if (aliveEnemies.length === 0) return null;

  // 按当前生命值升序排序（从小到大），取第一个（血量最低）
  return aliveEnemies.sort((a, b) => a.currentHp - b.currentHp)[0];
}
let stateArr = [];
//对目标进行攻击
async function attackGongji(attacker, target, JN) {
  // console.log("target=", target);
  // console.log("attacker=", attacker);
  // 生成战斗日志
  let logMsg = ``;
  let number1 = 0;
  let Aoe = false; //是否是群攻
  if (!target) {
    if (resultJieguo.value === 0) {
      battleLog.push(`<span class="font-bold text-14px text-#F56C6C">${attacker.name} 无法行动，跳过回合。</span>`);
    }
    await delay(250);
    return;
  }
  // 判断是友军还是敌人，执行对应逻辑
  const isFriend = Character.includes(attacker);
  let { damage } = calculateDamage(attacker, JN);
  //判断被动技能
  if (attacker.beidongArr?.includes(1)) {
    const jineng = attacker.beidong.filter((item) => item.type === 1);
    jineng.forEach((item) => {
      if (item.name === "幸运") {
        if (Math.random() < item.rate) {
          number1 = Number((damage * 0.25).toFixed(1));
          // logMsg += `凯触发了 <span class="text-#E6C200">幸运</span> 被动，伤害提升 <span class="text-#F56C6C font-bold"> ${number1} </span>。`;
          // battleLog.push(logMsg);
          item.rate = 0.5;
        } else {
          item.rate += 0.01;
        }
      }
    });
  }
  if (target.beidongArr?.includes(1)) {
    const jineng = target.beidong.filter((item) => item.type === 1);
    jineng.forEach((item) => {
      if (item.name === "幸运") {
        if (damage <= 0) {
          return;
        }
        if (Math.random() < item.rate) {
          number1 = -Number((damage * 0.35).toFixed(1));
          // logMsg += `凯触发了 <span class="text-#E6C200">幸运</span> 被动，伤害降低 <span class="text-#F56C6C font-bold"> ${Math.abs(number1)} </span>。`;
          // battleLog.push(logMsg);
          item.rate = 0.5;
        } else {
          item.rate += 0.01;
        }
      }
    });
  }
  let mubiao = []; //群体攻击目标
  let dandu = 0;
  let attackGj = null;
  logMsg = ``;
  damage = Number((damage + number1).toFixed(1));
  //文本输出
  if (JN) {
    attackGj = JN.name;
    if (JN.name === "更改认知") {
      logMsg += `${attacker.name} 对【${target.name}】使用 ${JN.name}`;
      target.status.push({
        name: "混乱",
        turns: 1,
        img: "hunluan",
        panduan: 1, //1就是在攻击时判断
        color: "text-fuchsia-500",
      });
      stateArr.push(`【${target.name}】受到 ${JN.name} 影响进入 <span class="text-fuchsia-500">混乱</span> 状态持续一回合。`);
    } else if (JN.name === "子弹倾泻") {
      logMsg += `${attacker.name} 朝【${target.name}】 射击 `;
    } else if (JN.name === "重击") {
      logMsg += `${attacker.name} 朝【${target.name}】 用力一击 `;
    } else if (JN.name === "缠绕") {
      logMsg += `${attacker.name} 朝【所有目标】 使用 缠绕 `;
    }
    if (JN.Aoe) {
      //群攻技能
      Aoe = true;
      dandu = JN.dandu ? JN.dandu : 0;
    }
  } else {
    attackGj = attacker.wuqi.name;
    if (attacker.wuqi.Aoe) {
      //群攻技能
      Aoe = true;
      dandu = attacker.wuqi.dandu ? attacker.wuqi.dandu : 0;
      logMsg += `${attacker.name}使用 ${attacker.wuqi.name} 攻击【所有目标】`;
    } else {
      logMsg += `${attacker.name}使用 ${attacker.wuqi.name} 朝【${target.name}】 攻击 `;
    }
  }
  if (Aoe) {
    //判断群体攻击是否只攻击了一个
    if (isFriend) {
      mubiao = enemy.filter((c) => !isDead(c));
    } else {
      mubiao = Character.filter((c) => !isDead(c));
    }
    if (mubiao.length === 1) {
      //只有一个目标，群攻变单体并且伤害提升25%
      target = mubiao[0];
      damage = Number((damage * (1.2 + dandu)).toFixed(1));
      logMsg += `，(仅剩一个目标，伤害提升${(0.2 + dandu) * 100}%)`;
    }
  }
  if (damage <= 0) {
    logMsg = null;
  } else {
    logMsg += `，造成<span class="text-#F56C6C font-bold"> ${damage} </span>点伤害。`;
  }
  // 扣减目标生命值
  if (Aoe) {
    if (isFriend) {
      gongjizhe[1].name = "全部";
      gongjizhe[1].color = "#F56C6C";
    } else {
      gongjizhe[0].name = "全部";
      gongjizhe[0].color = "#F56C6C";
    }
  } else {
    if (isFriend) {
      gongjizhe[1].name = target.name;
      gongjizhe[1].color = "#F56C6C";
    } else {
      gongjizhe[0].name = target.name;
      gongjizhe[0].color = "#F56C6C";
    }
  }
  if (JN) {
    skillAnim(target, Aoe, JN, isFriend, attackGj, damage, mubiao, attacker.name, logMsg);
  } else {
    skillAnim(target, Aoe, attacker.wuqi, isFriend, attackGj, damage, mubiao, attacker.name, logMsg);
  }
}
//技能特效
function skillAnim(target, Aoe, skill, isFriend, attackGj, damage, mubiao, name, logMsg) {
  let texiao;
  let index;

  if (isFriend) {
    if (Aoe) {
      texiao = popoverRefs2Aoe.value?.$el; //敌人全体
    } else {
      index = enemy.findIndex((item) => item.name === target.name);
      if (index === -1) {
        index = Character.findIndex((item) => item.name === target.name);
        texiao = popoverRefs3.value[index];
      } else {
        texiao = popoverRefs2.value[index];
      }
    }
  } else {
    if (Aoe) {
      texiao = popoverRefs3Aoe.value;
    } else {
      index = Character.findIndex((item) => item.name === target.name);
      if (index === -1) {
        index = enemy.findIndex((item) => item.name === target.name);
        texiao = popoverRefs2.value[index];
      } else {
        texiao = popoverRefs3.value[index];
      }
    }
  }

  const rect = texiao.getBoundingClientRect();

  // 容器（比如全屏 div）的宽高
  const containerRect = containerRef.value.getBoundingClientRect();

  const files = [
    {
      src: skill.texiao.src,
      w: skill.texiao.w ?? 0,
      h: skill.texiao.h ?? 0,
      x: skill.texiao.x ?? 0,
      y: skill.texiao.y ?? 0,
      scale: skill.texiao.scale ?? 0,
      speed: skill.texiao.speed ?? 1,
      randomAngle: skill.texiao.randomAngle,
    },
  ];
  if (skill.texiao.lianxian) {
    let texiao1;
    //连线特效
    if (!isFriend) {
      index = enemy.findIndex((item) => item.name === name);
      texiao1 = popoverRefs2.value[index];
    } else {
      index = Character.findIndex((item) => item.name === name);
      texiao1 = popoverRefs3.value[index];
    }

    const rect1 = texiao1.getBoundingClientRect();
    const centerA = {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    };
    const centerB = {
      x: rect1.left - containerRect.left + rect1.width / 2,
      y: rect1.top - containerRect.top + rect1.height / 2,
    };
    // 中点
    const bias = skill.texiao.bias;
    const midX = centerA.x * (1 - bias) + centerB.x * bias;
    const midY = centerA.y * (1 - bias) + centerB.y * bias;

    // 长度 + 角度
    const deltaX = centerB.x - centerA.x;
    const deltaY = centerB.y - centerA.y;
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    const length = containerRect.width; // 占容器宽度 40%

    // 添加视频动画
    const id = Date.now() + Math.random();
    const src = new URL(skill.texiao.src, import.meta.url).href;
    animations1.value.push({
      id,
      src,
      left: midX + "px",
      top: midY + "px",
      width: length + "px", // 跨越两点
      height: "120vh", // 控制粗细/视频高度
      transform: `translate(-50%, -50%) rotate(${angle}deg) scaleX(${skill.texiao.fanzhuan})`,
    });

    // 播放
    nextTick(() => {
      const video = videoRefs1[id];
      if (!video) return;
      texiaoBofang(video, target, damage, attackGj, mubiao, skill.texiao, logMsg);
    });
  } else {
    // 获取目标元素中心点（相对容器）
    const centerX = rect.left - containerRect.left + rect.width / 2;
    const centerY = rect.top - containerRect.top + rect.height / 2;
    //目标特效
    files.forEach((file) => {
      const src = new URL(file.src, import.meta.url).href;
      const id = Date.now() + Math.random();

      const randomAngle = file.randomAngle ? Math.floor(Math.random() * 360) : 0; // 随机角度 0~359
      animations.value.push({
        id,
        src,
        left: centerX + file.x,
        top: centerY + file.y - 20, // 固定往上偏移 20px
        width: (rect.width + file.w) * (1.2 + file.scale), // 放大 1.2
        height: (rect.height + file.h) * (1.2 + file.scale),
        angle: randomAngle, // 保存角度
      });
      console.log("animations=", animations.value);
      nextTick(() => {
        console.log("id=", id);

        const video = videoRefs[id];
        console.log("video=", video);

        if (!video) return;
        texiaoBofang(video, target, damage, attackGj, mubiao, file.speed, logMsg);
      });
    });
  }
}
//特效播放
const texiaoBofang = (video, target, damage, attackGj, mubiao, texiao, logMsg) => {
  video.playbackRate = texiao.speed || 1;

  // 获取视频时长（metadata 加载完成后）
  const onLoadedMetadata = () => {
    const duration = video.duration; // 秒
    setTimeout(
      () => {
        shanghai(target, damage, attackGj, mubiao, logMsg);
      },
      texiao.time ? duration * texiao.time : 400
    );
    video.removeEventListener("loadedmetadata", onLoadedMetadata);
  };

  if (!isNaN(video.duration) && video.duration > 0) {
    onLoadedMetadata();
  } else {
    video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
  }

  // 播放动画
  video.play().catch((err) => {
    console.warn("视频播放失败:", err);
  });
};
//特效关闭
const removeAnimation = (id) => {
  animations.value = animations.value.filter((item) => item.id !== id);
};
const removeAnimation1 = (id) => {
  animations1.value = animations1.value.filter((item) => item.id !== id);
};
//伤害扣除
function shanghai(target, damage, attackGj, mubiao, logMsg) {
  let targets;
  battleLog.push(logMsg);
  if (mubiao && mubiao.length > 0) {
    // 如果有多目标，就用 mubiao
    targets = mubiao;
  } else {
    // 没有多目标，单体攻击直接放入数组
    targets = [target];
  }

  targets.forEach((t) => {
    // 原来的伤害逻辑保持不变
    t.damageTexts.push({
      id: Date.now() + Math.random(),
      value: damage,
    });

    t.shakeDistance = 12 + Math.min(12, Math.floor(damage * 0.25));

    t.isShaking = false;
    requestAnimationFrame(() => {
      t.isShaking = true;
      setTimeout(() => (t.isShaking = false), 500);
    });

    setTimeout(() => {
      t.damageTexts.shift();
    }, 1000);
    setHP(t, t.currentHp - damage);
    if (isDead(t)) {
      // 检查是否所有敌人死亡
      if (resultJieguo.value !== 0) {
        return;
      }
      battleLog.push(`${t.name} 倒下了！`);
      const isFriend = Character.includes(t);
      let allEnemyDead;
      if (!isFriend) {
        allEnemyDead = enemy.every(isDead);
      } else {
        allEnemyDead = Character.every(isDead);
      }
      if (allEnemyDead) {
        battleLog.push("\n—— 所有敌人已被击败，战斗胜利！——");
        isBattling.value = false;
        clearInterval(window.actionTimer);
        endZhandou("胜利");
        return;
      }
    }
    if (attackGj === "缠绕") {
      let shuzhi = Number((t.agi * 0.4).toFixed(1));
      t.status.push({
        name: "减速",
        turns: 2,
        img: "hunluan",
        shuzhi: shuzhi,
        panduan: 2, // 就是回合开始时判断
        color: "text-#6B8E23",
      });
      t.agi -= shuzhi;
      stateArr.push(`【${t.name}】受到 ${attackGj} 影响 <span class="text-#6B8E23">敏捷降低${shuzhi}</span> 持续二回合。`);
    }
  });
  stateArr.forEach((item) => {
    battleLog.push(item);
  });
  stateArr = [];
}
// 2. 友军攻击逻辑
async function friendAttack(attacker, target, JN) {
  if (resultJieguo.value !== 0) {
    return;
  }
  isBattling.value = true;
  let liveFriends;
  // 计算伤害
  //攻击次数
  let cishu;
  liveFriends = enemy.filter((c) => !isDead(c));
  if (JN) {
    cishu = JN.cishu;
    if (JN.suiji) {
      liveFriends = enemy.filter((c) => !isDead(c));
      target = liveFriends[Math.floor(Math.random() * liveFriends.length)];
    }
  } else {
    cishu = attacker.wuqi.cishu;
  }
  myRound.value = false;
  if (cishu) {
    for (let i = 0; i < cishu; i++) {
      attackGongji(attacker, target, JN);
      await delay(150);
      if (JN) {
        liveFriends = enemy.filter((c) => !isDead(c));
        target = liveFriends[Math.floor(Math.random() * liveFriends.length)];
      }
    }
  } else {
    attackGongji(attacker, target, JN);
  }
  await delay(350);

  // 结束回合，重启行动条

  await delay(300);
  gongjizhe[0].name = null;
  gongjizhe[1].name = null;
  endTurn(currentActor);
  startActionLoop(Character, enemy, currentActor, baseChargeRate.value);
  isBattling.value = false;
  if (JN) {
    JN.lengque = JN.huihe;
  }
}

// 3. 敌人攻击逻辑
async function enemyAttack(attacker, JN) {
  if (resultJieguo.value !== 0) {
    return;
  }
  // 选择存活的友军目标
  let liveFriends;
  liveFriends = Character.filter((c) => !isDead(c));
  // 随机选择一个目标
  let target;
  // 混乱状态判断
  const index = attacker.status.findIndex((s) => s.name === "混乱");
  if (index !== -1) {
    attacker.status[index].turns = Math.max(0, attacker.status[index].turns - 1);
    battleLog.push(`${attacker.name}处于<span class="text-fuchsia-500">混乱</span>状态。`);
    if (attacker.status[index].turns === 0) {
      attacker.status.splice(index, 1); // 移除该状态
    }
    liveFriends = enemy.filter((c) => !isDead(c) && c.name !== attacker.name);
    if (liveFriends) {
      target = liveFriends[Math.floor(Math.random() * liveFriends.length)];
    } else {
      target = undefined;
    }
  } else {
    target = liveFriends[Math.floor(Math.random() * liveFriends.length)];
  }
  //攻击次数
  const cishu = attacker.wuqi.cishu;
  if (cishu) {
    for (let i = 0; i < cishu; i++) {
      attackGongji(attacker, target, JN);
      await delay(150);
    }
  } else {
    attackGongji(attacker, target, JN);
  }
  await delay(350);

  // 结束回合，重启行动条
  await delay(300);
  gongjizhe[0].name = null;
  gongjizhe[1].name = null;
  endTurn(currentActor);
  startActionLoop(Character, enemy, currentActor, baseChargeRate.value);
  isBattling.value = false;
  if (JN) {
    JN.lengque = JN.huihe;
  }
}
const resultJieguo = ref(0);

//战斗结束
function endZhandou(param) {
  if (param === "胜利") {
    resultJieguo.value = 1;
  } else if (param === "失败") {
    resultJieguo.value = 2;
  }
}
</script>

<style scoped>
.fade-out-leave-active {
  transition: opacity 1s ease; /* 控制渐隐速度 */
}
.fade-out-leave-to {
  opacity: 0; /* 离开时变透明 */
}
/* 边框样式 */
.biankuang {
  border: none;
  border-left: 1px solid #dcdfe6;
  border-right: 1px solid #dcdfe6;
}

.topBottom {
  border: none;
  border-top: 1px solid #dcdfe6;
}

.float-damage-enter-active,
.float-damage-leave-active {
  transition: all 1s ease;
}

.float-damage-enter-from {
  opacity: 0;
  transform: translate(-50%, 0);
}

.float-damage-enter-to {
  opacity: 1;
  transform: translate(-50%, -30px);
}

.float-damage-leave-from {
  opacity: 1;
  transform: translate(-50%, -30px);
}

.float-damage-leave-to {
  opacity: 0;
  transform: translate(-50%, -60px);
}

.shake {
  animation: shakeAnim 0.5s;
}

@keyframes shakeAnim {
  0% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(calc(var(--shake-distance) * -1));
  }

  50% {
    transform: translateX(var(--shake-distance));
  }

  75% {
    transform: translateX(calc(var(--shake-distance) * -1));
  }

  100% {
    transform: translateX(0);
  }
}
</style>
