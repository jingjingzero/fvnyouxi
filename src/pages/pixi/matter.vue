<template>
  <!-- 对话 -->
  <!-- <div v-show="user.pixi.duihua" class="absolute z-999">
    <duihua />
  </div> -->
  <div class="absolute z-999 text-black">
    x:{{ user.ceshi1.toFixed(0) }} y:{{ user.ceshi2.toFixed(0) }}
  </div>
  <div v-show="user.pixi.setting === 2" class="absolute z-100 w-100vw h-100vh">
    <Menu />
  </div>
  <div
    v-show="user.pixi.setting === 1"
    class="absolute left-0 w-full h-full z-100 bg-[rgba(0,0,0,0.6)]"
    @click="guanbi()"
  >
    <!-- <Ipad /> -->
  </div>
  <div ref="gameContainer" class="w-screen h-screen overflow-hidden relative">
    <!-- 摇杆挂载在这里 -->
    <div
      v-show="user.pixi.setting === 0"
      ref="joystickContainer"
      class="absolute left-9vw bottom-15vh w-[25vh] h-[25vh]"
    ></div>
    <!-- 右侧跳跃按钮 -->
    <div
      class="absolute right-7vh bottom-12vh w-[12vh] h-[12vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-4vh select-none active:scale-90"
      @touchend="handlePlayerInput(0)"
    >
      跳
    </div>
    <!-- 菜单 -->
    <div
      class="absolute right-7vh top-5vh w-[13vh] h-[6vh] rounded-3 bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-4vh select-none"
      @click="ceshi5"
    >
      <el-popover
        v-if="user.pixi.setting === 0"
        placement="left-start"
        :visible="user.pixi.isPaused"
        :width="200"
        trigger="click"
        popper-class="mr-1.5vh w-15vw! min-w-15vw!"
      >
        <template #reference>
          <span class="text-3vh iconfont2">菜单</span>
        </template>
        <div
          class="text-1.4vw flex flex-col items-center iconfont2 text-#333 gap-y-1.3vh py-0.5vh"
        >
          <div
            @touchend.prevent="tanchuang(0)"
            class="w-full h-full text-center"
          >
            人物信息
          </div>
          <el-divider style="margin: 0" />
          <!-- <div
            @touchend.prevent="tanchuang(1)"
            class="w-full h-full text-center"
          >
            手机
          </div> -->
          <el-divider style="margin: 0" />
          <div
            @touchend.prevent="tanchuang(2)"
            class="w-full h-full text-center"
          >
            设置
          </div>
        </div>
      </el-popover>
    </div>
    <!-- 冲刺按钮 -->
    <div
      class="absolute right-24vh bottom-12vh w-[12vh] h-[12vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-4vh select-none active:scale-90"
      :class="{ 'pointer-events-none': anniu.isDashCoolingDown }"
      @touchend="handlePlayerInput(1)"
    >
      <canvas
        ref="canvas1"
        class="absolute w-full h-full rounded-full z-1"
      ></canvas>
      <div
        class="w-full h-full rounded-full flex items-center justify-center text-white text-4vh select-none active:scale-95 pointer-events-auto"
      >
        <span
          v-show="anniu.isDashCoolingDown"
          class="absolute text-white text-4vh font-bold z-2"
        >
          {{ anniu.dashCdText }}
        </span>
        <span v-show="!anniu.isDashCoolingDown">冲刺</span>
      </div>
    </div>
    <!-- 射击按钮 -->
    <div
      class="absolute right-7vh bottom-29vh w-[12vh] h-[12vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-4vh select-none active:scale-90"
      :class="{ 'pointer-events-none': anniu.isCoolingDown }"
      @touchend="handlePlayerInput(2)"
    >
      <canvas
        ref="canvas2"
        class="absolute w-full h-full rounded-full z-1"
      ></canvas>
      <div
        class="w-full h-full rounded-full flex items-center justify-center text-white text-4vh select-none active:scale-95 pointer-events-auto"
      >
        <span
          v-show="anniu.isCoolingDown"
          class="absolute text-white text-4vh font-bold z-2"
        >
          {{ anniu.cdText }}
        </span>
        <span v-show="!anniu.isCoolingDown"> 射击</span>
      </div>
    </div>
    <!-- 技能按钮 -->
    <div
      class="absolute right-24vh bottom-29vh w-[12vh] h-[12vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-4vh select-none active:scale-90"
      :class="{ 'pointer-events-none': anniu.skillDown }"
      @click="handlePlayerInput(3)"
    >
      <canvas
        ref="canvas3"
        class="absolute w-full h-full rounded-full z-1"
      ></canvas>
      <div
        class="w-full h-full rounded-full flex items-center justify-center text-white text-4vh select-none active:scale-95 pointer-events-auto"
      >
        <span
          v-show="anniu.skillDown"
          class="absolute text-white text-4vh font-bold z-2"
        >
          {{ anniu.cdSkill }}
        </span>
        <span v-show="!anniu.skillDown"> 技能</span>
      </div>
    </div>
    <Transition
      class="fixed left-1/2 bottom-37% -translate-x-1/2 z-9999"
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-3"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-3"
    >
      <div
        v-if="anniu.showTip"
        class="pointer-events-none text-#E6A23C font-bold iconfont2 bg-white/50 rounded-2 px-0.7vw py-0.5vw text-1.7vw"
      >
        {{ anniu.showText }}
      </div>
    </Transition>
    <el-dialog
      v-model="dialogTableVisible"
      width="75vw"
      :show-close="false"
      @close="ceshi5"
      top="4vh"
    >
      <xinxi class="overflow-hidden" />
    </el-dialog>
  </div>
</template>

<script setup>
import duihua from "./duihua.vue";
import { ref, onMounted, onBeforeUnmount, reactive } from "vue";
import {
  Application,
  Container,
  Graphics,
  Texture,
  TilingSprite,
  ColorMatrixFilter,
  Sprite,
  RenderTexture,
  Text,
  Assets,
} from "pixi.js";
import {
  ZoomBlurFilter,
  MotionBlurFilter,
  KawaseBlurFilter,
} from "pixi-filters";
import { gsap } from "gsap";
import emitter from "@/bus"; // 引入传值组件
import Matter from "matter-js";
import { createApp } from "./app";
import { createController } from "./controller";
import { createSpineBoy } from "./spineBoy";
import { loadAssets } from "./assets";
import { useCounterStore } from "@/store/counter";
import xinxi from "./player/xinxi.vue";
import Menu from "@/pages/menu.vue";
import Ipad from "@/pages/youxiyemian/ipadVue.vue";
import { Viewport } from "pixi-viewport";
import { getMapData, animationConfigs } from "./player/map";
import { createBulletAnimation } from "@/pages/useSpritePixi";
import { Laser } from "./player/Laser";
const gameContainer = ref(null);
const joystickContainer = ref(null);
const user = useCounterStore();
/* ================= Pixi ================= */
let app;
let worldContainer;
let reflectionContainer; //倒影

/* ================= Matter ================= */
let engine;
let world;
let runner;

/* ================= 玩家 ================= */
let playerPool;
let activePlayer;
let playerInfo;
//技能
const canvas1 = ref(null);
const canvas2 = ref(null);
const canvas3 = ref(null);
const dialogTableVisible = ref(null);
const anniu = reactive({
  showTip: false,
  showText: "", //提示文字
  //冲刺
  isDashCoolingDown: false,
  dashCdText: 0,
  cdDuration1: 2,
  ctx1: null,
  //子弹
  isCoolingDown: false,
  cdText: 0,
  cdDuration2: 1, //技能冷却
  ctx2: null,
  //技能
  skillDown: false,
  cdSkill: 0,
  cdDuration3: 2, //技能冷却
  ctx3: null,
});
/* ================= Spine ================= */
// 每个玩家对象自己管理 Spine 和 Debug 红框
// activePlayer = { body, spine, debugView }

/* ================= 同步（非玩家） */
const rectPool = createPool(createRectObject);
const circlePool = createPool(createCircleObject);
const trianglePool = createPool(createTriangleObject);

/* ================= 世界参数 ================= */
const DEVICE_WIDTH = window.innerWidth;
const DEVICE_HEIGHT = window.innerHeight;
const FLOOR_HEIGHT = DESIGN_HEIGHT * 0.12;
const DESIGN_HEIGHT = 720;
// 当前设备横屏宽高比
const DEVICE_ASPECT = DEVICE_WIDTH / DEVICE_HEIGHT;
const DESIGN_WIDTH = Math.round(DESIGN_HEIGHT * DEVICE_ASPECT);
let WORLD_WIDTH;
let WORLD_HEIGHT;
/* ================= vh 系统 ================= */
const VIEW_HEIGHT = () => gameContainer.value.clientHeight;
const VH = () => VIEW_HEIGHT() / 100;
const VIEW_WIDTH = () => gameContainer.value.clientWidth; // 改成 clientWidth
const VW = () => VIEW_WIDTH() / 100; // 调用 VIEW_WIDTH()
/* ================= 控制 ================= */
let controller;
let isOnGround = false;
//菜单
function tanchuang(i) {
  user.pixi.setting = i;
  if (i === 0) {
    dialogTableVisible.value = true;
  }
}
function guanbi() {
  user.pixi.setting = 0;
  emitter.emit("vnZanting");
}

function messageText(text) {
  //提示文字
  if (anniu.showTip) {
    return;
  }
  anniu.showTip = true;
  anniu.showText = text;
  setTimeout(() => {
    anniu.showTip = false;
    anniu.showText = "";
  }, 700);
}
let dropActive = false;
function handlePlayerInput(i) {
  if (i === 0) {
    //跳
    if (controller.keys.space.pressed) return;
    controller.keys.space.pressed = true;
    setTimeout(() => {
      controller.keys.space.pressed = false;
    }, 0);
    console.log("跳=");
  } else if (i === 1) {
    //冲刺
    if (!anniu.isDashCoolingDown) {
      dash(activePlayer);
    }
  } else if (i === 2) {
    //射击
    if (anniu.isCoolingDown) return;
    anniu.isCoolingDown = true;
    elapsed = 0;

    fireAtNearestEnemy();

    stopCaozuo = true;
    setTimeout(() => {
      stopCaozuo = false;
    }, 50);
    activePlayer.spine.playShoot();
    animate1();
  } else if (i === 3) {
    if (anniu.skillDown) return;
    console.log("npcs=", npcs);
    const target = getNearestEnemy(
      activePlayer.spine.view.x,
      activePlayer.spine.view.y,
      npcs
    );
    if (target === null) {
      messageText("无目标");
      return;
    }
    const skillShanghai = skillSearch("技能");
    // ===== 激光起点（无人机）=====
    const durationTime = skillShanghai.skill.durationTime; //激光持续时间
    // 设置本次激光伤害
    laser.damage = skillShanghai.shanghai;
    const sprite = playAnimation(
      "激光",
      {
        x: drone.x,
        y: drone.y + 2.5 * VH(),
      },
      true
    );
    console.log("sprite=", drone.x);
    sprite.height = 12 * VH();

    laser.startContinuous(
      //1秒触发6次
      () => ({ x: drone.view.position.x, y: drone.view.position.y + 1 * VH() }),
      () => {
        const dx = target.body.position.x - drone.view.position.x;
        const dy = target.body.position.y - drone.view.position.y;
        const len = Math.hypot(dx, dy) || 1;

        return {
          x: drone.view.position.x + (dx / len) * DEVICE_WIDTH * 2,
          y: drone.view.position.y + (dy / len) * DEVICE_WIDTH * 2,
        };
      },
      { duration: durationTime },
      sprite
    );
    anniu.skillDown = true;
    elapsed2 = 0;
    dropActive = true;
    attackDelayExtra = true;
    setTimeout(() => {
      dropActive = false; //无人机可动
      setTimeout(() => {
        attackDelayExtra = false;
      }, 250);
    }, durationTime);
    console.log("技能=", drone);
    animate3();
  }
}
//技能搜索
function skillSearch(name) {
  const skillIndex = playerInfo.skill.findIndex((i) => i.name === name);
  const skill = playerInfo.skill[skillIndex];
  const shanghai = skill.mul * playerInfo.attack + skill.shanghai;
  return { skill, shanghai };
}
// ==================== 对象池工具函数 ====================
function createPool(createFunc, max = Infinity) {
  const pool = [];
  const active = [];

  return {
    acquire(...args) {
      let obj;

      if (pool.length) {
        obj = pool.pop();
        obj.active = true;

        if (obj.body && !world.bodies.includes(obj.body)) {
          Matter.World.add(world, obj.body);
        }

        if (obj.ticker) {
          app.ticker.add(obj.ticker);
        }

        obj.reset(...args);
      } else {
        obj = createFunc(...args);
      }

      active.push(obj);
      return obj;
    },
    release(obj) {
      obj.active = false;

      if (obj.ticker) {
        app.ticker.remove(obj.ticker);
        obj.ticker = null;
      }

      if (obj.body) {
        Matter.World.remove(world, obj.body);
      }

      if (obj.view?.parent) {
        obj.view.parent.removeChild(obj.view);
      }

      const idx = active.indexOf(obj);
      if (idx !== -1) active.splice(idx, 1);

      pool.push(obj);
    },

    releaseAll() {
      while (active.length > 0) this.release(active[0]);
    },

    get active() {
      return active;
    },
  };
}

let spine;

const COLLISION_GROUPS = {
  FRIEND: 0x0001, // 友军（玩家 / 我方单位）
  ENEMY: 0x0002, // 敌人
  OBSTACLE: 0x0004, // 地形 / 墙 / 地板
  BULLET: 0x0008, // 子弹
  SENSOR: 0x0010, // 传感器（脚底 / 触发区）
};

// ==================== 玩家对象池 ====================
function createSpeechBubble() {
  const c = new Container();

  const bg = new Graphics();
  const text = new Text("", {
    fontSize: 2 * VH(), // ⭐ 字体大小（推荐 1.6 ~ 2.2）
    fill: 0xffffff, // 字体颜色
    wordWrap: true, // 是否自动换行
    wordWrapWidth: 22 * VH(), // ⭐ 一行最大宽度
    lineHeight: 2.2 * VH(), // ⭐ 行高（不写会显得挤）
    align: "left", // 文本对齐
  });

  const padding = 1 * VH();
  const arrowH = 1 * VH();

  function redraw() {
    bg.clear();

    const w = text.width + padding * 2;
    const h = text.height + padding * 2;

    // ⭐ 气泡主体（底部中心为 0,0）
    bg.beginFill(0x000000, 0.75);
    bg.drawRoundedRect(-w / 2, -h - arrowH, w, h, 8);

    // ⭐ 小箭头
    bg.moveTo(-5, -arrowH);
    bg.lineTo(0, 0);
    bg.lineTo(5, -arrowH);
    bg.endFill();

    // 文本位置
    text.position.set(-w / 2 + padding, -h - arrowH + padding);
  }

  c.setText = (str) => {
    text.text = str;
    redraw();
  };

  c.show = () => {
    gsap.killTweensOf(c);
    c.visible = true;
    gsap.fromTo(
      c,
      { alpha: 0, scale: 0.96 },
      {
        alpha: 1,
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
      }
    );
  };

  c.hide = () => {
    gsap.killTweensOf(c);
    gsap.to(c, {
      alpha: 0,
      duration: 0.15,
      ease: "power2.in",
      onComplete: () => {
        c.visible = false;
      },
    });
  };

  c.addChild(bg, text);
  c.visible = false;
  c.alpha = 0;

  return c;
}

function createPlayerObject(x, y, options) {
  const playerH = options.height * VH() || 20 * VH();
  const playerW = options.width * VH() || 8 * VH();
  const radius = playerW / 2; // 胶囊圆半径
  // Matter 胶囊体：上圆 + 下圆 + 中矩形
  const rectHeight = playerH - 2 * radius;
  const mainBody = Matter.Bodies.rectangle(0, 0, playerW, rectHeight, {
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0.02,
    restitution: 0,
    label: "playerMain",
  });
  const topCircle = Matter.Bodies.circle(0, -rectHeight / 2, radius, {
    isSensor: false,
    label: "playerTop",
  });
  const bottomCircle = Matter.Bodies.circle(0, rectHeight / 2, radius, {
    isSensor: false,
    label: "playerBottom",
  });
  // 脚传感器
  const footSensor = Matter.Bodies.rectangle(
    0,
    rectHeight / 2 + radius,
    playerW * 0.2,
    1,
    {
      isSensor: true,
      label: "playerFoot",
      collisionFilter: {
        category: COLLISION_GROUPS.SENSOR,
        mask: COLLISION_GROUPS.OBSTACLE,
      },
    }
  );
  //playerPool
  const isFriend = options.player === 1 || options.player === 3;

  const body = Matter.Body.create({
    parts: [mainBody, topCircle, bottomCircle, footSensor],
    friction: 0,
    frictionAir: 0.02,
    collisionFilter: {
      // ceshi
      category: isFriend ? COLLISION_GROUPS.FRIEND : COLLISION_GROUPS.ENEMY,
      // ❌ 初始不和子弹碰
      mask: COLLISION_GROUPS.OBSTACLE,
    },
  });
  Matter.Body.setInertia(body, Infinity); // 锁旋转
  Matter.Body.setPosition(body, { x, y });
  Matter.World.add(world, body);
  //红色矩形
  // const playerRect = new Graphics();
  // playerRect.beginFill(0xff0000); // 红色
  // playerRect.drawRect(-playerW / 2, -playerH / 2, playerW, playerH);
  // playerRect.endFill();
  // playerRect.x = x;
  // playerRect.y = y;
  // worldContainer.addChild(playerRect);
  const spine = createSpineBoy(
    {
      onShoot() {
        console.log("触发射击");
        const skill = skillSearch("射击");
        fireBullet({
          sourceX:
            activePlayer.spine.view.x + activePlayer.spine.direction * 30, // 偏移到玩家前方
          sourceY: activePlayer.spine.view.y - activePlayer.playerH * 0.5, // 偏移到玩家上方
          direction: activePlayer.spine.direction,
          speed: activePlayer.zdSpeed,
          undefined,
          undefined,

          aoeRadius: 0,
          shanghai: skill.shanghai,
        });
      },
    },
    options
  );
  const bounds = spine.spine.getBounds();
  const scale = playerH / bounds.height;
  spine.view.scale.set(scale);
  spine.view.y = y - playerH / 2 + 20 * VH();
  spine.view.x = x;
  spine.direction = 1;
  spine.setDirection(1);
  worldContainer.addChild(spine.view);
  // ===== 对话气泡 =====
  const speechBubble = createSpeechBubble();
  speechBubble.visible = false;
  worldContainer.addChild(speechBubble);
  // ===== 血条（用 rectPool） =====
  const hpBar = rectPool.acquire(
    body.position.x, // x
    body.position.y - 11 * VH(), // y 在玩家头上
    playerW, // 宽度
    1.1 * VH(), // 高度
    {
      color: options.player === 1 ? 0x13ce66 : 0xff4949, // 红色
      texture: false,
      create: true,
    }
  );

  hpBar.view.visible = false;
  if (options.player !== 3) {
    worldContainer.addChild(hpBar.view); // 血条随角色移动
  }
  //速度
  const speed = playerH * 0.025;
  const zdSpeed = playerH * 0.18;
  const player = {
    speechBubble, //气泡
    showBubble: false,
    bubbleText: "",
    data: options,
    char: spine,
    view: spine.view,
    body,
    speed, //走动速度
    zdSpeed, //子弹速度
    isDashing: false,
    playerH,
    playerW,
    mainBody,
    hpBar,
    footSensor,
    spine,
    ticker: null,
    active: true,
    scale,
    takeDamage(damage = 20) {
      //受到伤害
      this.data.currentHp -= damage;
      const filter = new ColorMatrixFilter();
      this.view.filters = [filter];
      //当前伤害百分比生命值
      const intensity1 = Math.min((damage / this.data.maxHp) * 1.4, 1);
      // 伤害越高，红色越深（0~1）
      const intensity = Math.min(0.2 + intensity1, 1); // 假设最大伤害 50
      // 手动插值红色
      const r = 1; // 红色全量
      const g = 1 - intensity; // 绿色减少
      const b = 1 - intensity; // 蓝色减少
      filter.matrix = [
        r,
        0,
        0,
        0,
        0,
        0,
        g,
        0,
        0,
        0,
        0,
        0,
        b,
        0,
        0,
        0,
        0,
        0,
        1,
        0,
      ];
      setTimeout(() => {
        this.view.filters = [];
      }, 100);
      // ===== 更新血条宽度 =====
      const hpRatio = Math.max(this.data.currentHp / this.data.maxHp, 0);
      this.hpBar.view.width = this.playerW * hpRatio;
      if (this.data.currentHp <= 0) {
        this.deactivate();
      }
    },
    update(vx, isOnGround, absVX, vy) {
      Matter.Body.setVelocity(this.body, { x: vx, y: vy });
      if (!isOnGround) {
        if (vy < -1) this.spine.playJumpUp();
        else if (vy > 1) this.spine.playJumpDown();
      } else {
        if (absVX > this.speed * 0.8) this.spine.playRun();
        else if (absVX > 0.2) this.spine.playRun();
        else this.spine.playIdle();
      }
      if (vx > 0) {
        this.spine.direction = 1;
        this.spine.setDirection(1);
      } else if (vx < 0) {
        this.spine.direction = -1;
        this.spine.setDirection(-1);
      }
    },
    NpcPosition(vx, absVX, vy) {
      if (!this.active) return;
      // ===== 气泡位置 =====
      if (this.showBubble && this.speechBubble.visible) {
        this.speechBubble.position.set(
          this.body.position.x,
          this.body.position.y -
            this.playerH + // 人物高度
            7 * VH() // 头顶留一点空隙
        );
      }

      Matter.Body.setVelocity(this.body, { x: vx, y: vy });
      if (!isOnGround) {
        if (vy < -1) this.spine.playJumpUp();
        else if (vy > 1) this.spine.playJumpDown();
      } else {
        if (absVX > this.speed * 0.8) this.spine.playRun();
        else if (absVX > 0.2) this.spine.playRun();
        else this.spine.playIdle();
      }
      if (vx > 0) this.spine.setDirection(1);
      else if (vx < 0) this.spine.setDirection(-1);
      // Spine 精灵位置
      this.spine.view.x = this.body.position.x;
      this.spine.view.y = this.body.position.y + this.data.TopH * VH();
      // 血条位置
      if (options.player !== 3) {
        this.hpBar.view.x = this.body.position.x;
        this.hpBar.view.y = this.body.position.y - (this.data.TopH + 1) * VH();
      }
      // Spine 内部动画更新
      this.spine.update();
    },
    npcAIUpdate(playerTarget) {
      if (!this.active) return;
      if (!playerTarget || !playerTarget.body) return;

      const npcX = this.body.position.x;
      const playerX = playerTarget.body.position.x;
      const dx = playerX - npcX;
      const distance = Math.abs(dx);
      const vy = this.body.velocity.y;

      let vx = 0;

      switch (this.aiMode) {
        // ===================== 跟随玩家 =====================
        case "follow":
          if (this.data.type === "melee") {
            const attackRange = this.data.attackRange;
            if (distance > attackRange) vx = dx > 0 ? this.speed : -this.speed;
            else vx = 0;
          } else if (this.data.type === "ranged") {
            const minDist = this.data.minDist;
            const maxDist = this.data.maxDist;
            if (distance < minDist)
              vx = dx > 0 ? -this.speed : this.speed; // 太近 → 后退
            else if (distance > maxDist)
              vx = dx > 0 ? this.speed : -this.speed; // 太远 → 靠近
            else vx = 0; // 安全区 → 停止
          }
          break;

        // ===================== 远离玩家 =====================
        case "flee":
          if (this.data.type === "melee") {
            const attackRange = this.data.attackRange;
            if (distance < attackRange)
              vx = dx > 0 ? -this.speed : this.speed; // 太近 → 后退
            else vx = 0;
          } else if (this.data.type === "ranged") {
            const minDist = this.data.minDist;
            const maxDist = this.data.maxDist;
            if (distance < minDist)
              vx = dx > 0 ? -this.speed : this.speed; // 太近 → 后退
            else if (distance > maxDist) vx = 0; // 太远 → 停止
            else vx = dx > 0 ? -this.speed : this.speed; // 安全区 → 继续拉开
          }
          break;

        // ===================== 巡逻 =====================
        case "patrol":
          if (!this._patrolDir) this._patrolDir = 1;
          if (!this._patrolCenter) this._patrolCenter = npcX;
          const range = this.data.patrolRange || 100;

          if (npcX > this._patrolCenter + range) this._patrolDir = -1;
          if (npcX < this._patrolCenter - range) this._patrolDir = 1;

          vx = this._patrolDir * this.speed;
          break;

        default:
          vx = 0;
          break;
      }

      // 更新位置与动画
      this.NpcPosition(vx, Math.abs(vx), vy);
    },
    playerUpdate() {
      if (!this.active) return;
      // ===== 气泡位置 =====
      if (this.showBubble && this.speechBubble.visible) {
        this.speechBubble.position.set(
          this.body.position.x,
          this.body.position.y -
            this.playerH + // 人物高度
            7 * VH() // 头顶留一点空隙
        );
      }
      user.ceshi1 = this.body.position.x;
      user.ceshi2 = this.body.position.y;
      // Spine 精灵位置
      this.spine.view.x = this.body.position.x;
      this.spine.view.y = this.body.position.y + 10 * VH();
      // 血条位置 idle
      if (options.player !== 3) {
        this.hpBar.view.x = this.body.position.x;
        this.hpBar.view.y = this.body.position.y - 11 * VH();
      }
      // Spine 内部动画更新
      this.spine.update();
    },
    reset() {
      //机器人才会执行
      this.speed = this.data.speed * VW();
      this.aiMode = this.data.aiMode;
      this.view.visible = true;
      this.active = true;
      this.hpBar.view.visible = true;
      this.data.currentHp = this.data.maxHp;
      this.body.collisionFilter.mask =
        COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.BULLET;
      this.spine.playIdle();
      if (options.player === 2) {
        this.ticker = () => {
          this.npcAIUpdate(activePlayer);
        };
        app.ticker.add(this.ticker);
      }
    },
    deactivate() {
      this.view.visible = false;
      this.active = false;
      // this.char.playBase({ name: "death", loop: false });
      // Matter.Body.set(this.body, {
      //   collisionFilter: {
      //     ...this.body.collisionFilter,
      //     mask: this.body.collisionFilter.mask & ~COLLISION_GROUPS.BULLET,
      //   },
      // });
      this.body.collisionFilter.mask = COLLISION_GROUPS.OBSTACLE;
      // 延迟移除 ticker
      setTimeout(() => {
        if (this.ticker) {
          app.ticker.remove(this.ticker);
          this.ticker = null;
          this.tickerActions = []; // 清空内部动作数组
        }
      }, 1500);
    },
    //对话气泡
    showSpeech(text) {
      this.bubbleText = text;
      this.speechBubble.setText(text);
      this.showBubble = true;
      this.speechBubble.show();
    },
    hideSpeech() {
      this.showBubble = false;
      this.speechBubble.hide();
    },
  };
  if (options.player === 1) {
    player.ticker = () => {
      player.playerUpdate();
    };
    player.hpBar.view.visible = true;
    app.ticker.add(player.ticker);
  }
  // ✅ 只加这一行，不影响返回结构
  body.gameObject = player;

  return player;
}

let wall;
let BgWidthPx = 0;
let WallTextures = [];
let WallScale;
const DESIGN_BG_HEIGHT = 1080;
let wallContainer;
function BgWall() {
  // 1️⃣ 等比缩放
  WallScale = DEVICE_HEIGHT / DESIGN_BG_HEIGHT;

  // 2️⃣ 读取切好的多张图
  WallTextures = [
    Texture.from("wall_01"),
    Texture.from("wall_02"),
    Texture.from("wall_03"),
    // 继续加
  ];

  // 3️⃣ 计算拼接后的总宽度
  BgWidthPx = 0;
  WallTextures.forEach((tex) => {
    BgWidthPx += tex.width * WallScale;
  });
}
function createWallObject() {
  wallContainer = new Container();
  let offsetX = 0;
  WallTextures.forEach((texture) => {
    const heightPx = texture.height * WallScale;
    const sprite = new Sprite(texture);
    sprite.scale.set(WallScale);
    sprite.x = offsetX;
    sprite.y = DEVICE_HEIGHT - heightPx;
    sprite.roundPixels = true;
    wallContainer.addChild(sprite);
    offsetX += texture.width * WallScale;
  });

  bgContainer.addChild(wallContainer);
}

// ==================== 矩形/圆形/三角形对象，特殊对象 ====================

function createRectObject(
  x,
  y,
  w,
  h,
  {
    color = 0x000000,
    texture = null,
    zIndex = 0,
    withBody = false,
    isSensor = false,
    movable = false,
    label = null,
    create = false,
    name = false,
  } = {}
) {
  /* ---------- view（底部中心）
  //rectPool.acquire createRectFromData---------- */
  if (name) {
    console.log("name=", name);
  }
  let view;
  if (texture) {
    view = new Sprite(Texture.from(texture));
    view.width = w;
    view.height = h;
    view.anchor.set(0.5, 1); // ⭐ 底部中心
  } else if (create) {
    view = new Graphics();
    view.beginFill(color);
    view.drawRect(0, 0, w, h);
    view.endFill();
    view.pivot.set(w / 2, h); // ⭐ 底部中心
  }
  if (create | texture) {
    view.position.set(x, y);
    view.zIndex = zIndex;
    worldContainer.addChild(view);
  }
  /* ---------- body（真实中心点） ---------- */
  let body = null;
  if (withBody) {
    body = Matter.Bodies.rectangle(
      x,
      y - h / 2, // ⭐ 关键：底部 y → 物理中心 y
      w,
      h,
      {
        isStatic: !movable,
        isSensor,
        inertia: Infinity,
        friction: movable ? 1 : 0,
        frictionStatic: movable ? 2 : 0,
        frictionAir: movable ? 0.05 : 0,
        density: movable ? 0.002 : undefined,
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask:
            COLLISION_GROUPS.FRIEND |
            COLLISION_GROUPS.ENEMY |
            COLLISION_GROUPS.OBSTACLE |
            COLLISION_GROUPS.BULLET,
        },
        label,
      }
    );
    body._triggered = false;
    body.view = view;
    Matter.World.add(world, body);
  }

  /* ---------- GameObject ---------- */
  const obj = {
    view,
    body,
    active: true,
    ticker: null,

    reset(nx, ny) {
      view.position.set(nx, ny);
      if (body) {
        Matter.Body.setPosition(body, {
          x: nx,
          y: ny - h / 2, // ⭐ 同样是底部 → 中心
        });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngle(body, 0);
      }
    },

    destroy() {
      if (this.ticker) {
        app.ticker.remove(this.ticker);
        this.ticker = null;
      }
      if (this.body) {
        Matter.World.remove(world, this.body);
        this.body = null;
      }
      if (this.view?.parent) {
        this.view.parent.removeChild(this.view);
      }
    },
  };

  /* ---------- ticker（同步） ---------- */
  if (movable) {
    obj.ticker = () => {
      view.x = body.position.x;
      view.y = body.position.y + h / 2; // ⭐ 中心 → 底部
    };
    app.ticker.add(obj.ticker);
  }
  return obj;
}

function createCircleObject(
  x,
  y,
  r,
  {
    color = 0x000000,
    zIndex = 0,
    withBody = true,
    isSensor = false,
    movable = false,
    label = null,
  } = {}
) {
  /* ---------- view（底部中心） ---------- */
  const view = new Graphics();
  view.beginFill(color);
  view.drawCircle(0, 0, r);
  view.endFill();

  view.pivot.set(0, r); // ⭐ 底部中心
  view.position.set(x, y);
  view.zIndex = zIndex;
  worldContainer.addChild(view);

  /* ---------- body（真实中心） ---------- */
  let body = null;
  if (withBody) {
    body = Matter.Bodies.circle(
      x,
      y - r, // ⭐ 底部 → 圆心
      r,
      {
        isStatic: !movable,
        isSensor,
        friction: movable ? 0.1 : 0,
        frictionStatic: movable ? 0.2 : 0,
        frictionAir: movable ? 0.02 : 0,
        density: movable ? 0.002 : undefined,
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask:
            COLLISION_GROUPS.FRIEND |
            COLLISION_GROUPS.ENEMY |
            COLLISION_GROUPS.OBSTACLE |
            COLLISION_GROUPS.BULLET,
        },
        label,
      }
    );
    Matter.World.add(world, body);
  }

  /* ---------- GameObject ---------- */
  const obj = {
    view,
    body,
    active: true,
    ticker: null,

    reset(nx, ny) {
      view.position.set(nx, ny);
      if (body) {
        Matter.Body.setPosition(body, { x: nx, y: ny - r });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      }
    },

    destroy() {
      if (this.ticker) {
        app.ticker.remove(this.ticker);
        this.ticker = null;
      }
      if (this.body) {
        Matter.World.remove(world, this.body);
        this.body = null;
      }
      this.view?.parent?.removeChild(this.view);
    },
  };

  /* ---------- ticker ---------- */
  if (movable && body) {
    obj.ticker = bindViewToBodyBottom(view, body, r);
    app.ticker.add(obj.ticker);
  }

  return obj;
}

function createTriangleObject(
  x,
  y,
  w,
  h,
  {
    color = 0x000000,
    zIndex = 0,
    withBody = true,
    isSensor = false,
    movable = false,
    label = null,
  } = {}
) {
  const verts = [
    { x: -w / 2, y: h / 2 },
    { x: w / 2, y: h / 2 },
    { x: 0, y: -h / 2 },
  ];

  /* ---------- view（底部中心） ---------- */
  const view = new Graphics();
  view.beginFill(color);
  view.moveTo(verts[0].x, verts[0].y);
  view.lineTo(verts[1].x, verts[1].y);
  view.lineTo(verts[2].x, verts[2].y);
  view.closePath();
  view.endFill();

  view.pivot.set(0, h / 2); // ⭐ 底部中心
  view.position.set(x, y);
  view.zIndex = zIndex;
  worldContainer.addChild(view);

  /* ---------- body ---------- */
  let body = null;
  if (withBody) {
    body = Matter.Bodies.fromVertices(
      x,
      y - h / 2, // ⭐ 底部 → 中心
      verts,
      {
        isStatic: !movable,
        isSensor,
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask:
            COLLISION_GROUPS.FRIEND |
            COLLISION_GROUPS.ENEMY |
            COLLISION_GROUPS.OBSTACLE |
            COLLISION_GROUPS.BULLET,
        },
        label,
      },
      true
    );
    Matter.World.add(world, body);
  }

  /* ---------- GameObject ---------- */
  const obj = {
    view,
    body,
    active: true,
    ticker: null,

    reset(nx, ny) {
      view.position.set(nx, ny);
      if (body) {
        Matter.Body.setPosition(body, { x: nx, y: ny - h / 2 });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      }
    },

    destroy() {
      if (this.ticker) {
        app.ticker.remove(this.ticker);
        this.ticker = null;
      }
      if (this.body) {
        Matter.World.remove(world, this.body);
        this.body = null;
      }
      this.view?.parent?.removeChild(this.view);
    },
  };

  /* ---------- ticker ---------- */
  if (movable && body) {
    obj.ticker = bindViewToBodyBottom(view, body, h / 2);
    app.ticker.add(obj.ticker);
  }

  return obj;
}
const floatingMarks = []; //问号
function createTeshu(
  x,
  y,
  w,
  h,
  {
    texture = null,
    name = false,
    show = true,
    isInteractive = false,
    interactRange = 0,
  } = {}
) {
  if (!show) return;

  const options = { juese: texture };
  const spine = createSpineBoy({}, options);

  spine.view.scale.set(WallScale);
  spine.view.position.set(x, y);
  worldContainer.addChild(spine.view);

  spine.isInteractive = isInteractive;

  if (isInteractive) {
    const texture1 = Assets.get("question");
    const mark = new Sprite(texture1);

    mark.anchor.set(0.5, 1); // 顶部中心
    mark.scale.set(0.6);
    mark.zIndex = 2;

    spine.view.addChild(mark);
    spine.questionMark = mark;

    const bounds = spine.view.getLocalBounds();
    mark.x = bounds.x + bounds.width / 2;
    mark.y = bounds.y - 25;

    // ===== 统一参数 =====
    initFloatingMark(mark, interactRange);

    // ===== 点击 =====
    mark.on("pointertap", () => {
      if (!mark.visible) return;
      spine.playBase("donghua1", false);
      removeFloatingMark(mark);
    });

    floatingMarks.push(mark);
  }

  return spine;
}

function wenhaoHudong(x, y, w, h, { show = true, interactRange = 200 } = {}) {
  if (!show) return null;

  const texture1 = Assets.get("question");
  if (!texture1) return null;

  const mark = new Sprite(texture1);

  mark.anchor.set(0.5, 1);
  mark.scale.set(WallScale * 0.6);
  mark.zIndex = 2;

  mark.position.set(x, y);
  worldContainer.addChild(mark);

  initFloatingMark(mark, interactRange);

  mark.on("pointertap", () => {
    if (!mark.visible) return;
    console.log("你好");
    removeFloatingMark(mark, true);
    setTimeout(() => {
      mark.visible = true;
      mark.locked = false;
    }, 1500);
  });

  floatingMarks.push(mark);

  return mark;
}
function initFloatingMark(mark, interactRange) {
  mark.baseY = mark.y;
  mark.maxBaseY = mark.baseY + 8;
  mark.minBaseY = mark.baseY - 8;
  mark.speed = 0.4;
  mark.direction = 1;
  mark.interactRange = interactRange || 100;

  mark.visible = false;
  mark.eventMode = "static";
  mark.cursor = "pointer";
}
function removeFloatingMark(mark, yincang = false) {
  if (yincang) {
    mark.visible = false;
    mark.locked = true; // ⭐ 关键
  } else {
    const index = floatingMarks.indexOf(mark);
    if (index !== -1) {
      floatingMarks.splice(index, 1);
    }

    if (mark.parent) {
      mark.parent.removeChild(mark);
    }

    mark.destroy();
  }
}

let bgContainer; // 背景层，渲染在最底层

// ==================== 碰撞 ====================
function onCollision(bodyA, bodyB) {
  if (bodyA === activePlayer.footSensor || bodyB === activePlayer.footSensor)
    isOnGround = true;
}
function createCooldown(duration = 1000) {
  let locked = false;
  let timer = null;

  return function () {
    if (locked) return false;

    locked = true;

    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      locked = false;
      timer = null;
    }, duration);

    return true;
  };
}
const tipEnterCooldown = createCooldown(1000);
const elevatorEnterCooldown = createCooldown(1000);
const leaveCooldown = createCooldown(1000);
// 传感器触发
function onTrigger(label, player, boolean, body) {
  if (!label.playersOnElevator) label.playersOnElevator = new Set(); // ⭐ 记录站在电梯上的玩家
  if (label.startY === undefined) label.startY = 87 * VH(); // ⭐ 电梯初始高度
  const speed = 0.4 * VH();
  if (boolean) {
    // 玩家进入电梯
    if (!elevatorEnterCooldown()) return;
    if (label.name === "电梯") {
      console.log("我坐上电梯了", body);

      // 添加玩家到集合
      label.playersOnElevator.add(player);

      // ⭐ 修正玩家位置，确保站在电梯顶部
      if (player.active) {
        Matter.Body.setPosition(player.body, {
          x: player.body.position.x,
          y: body.position.y - player.playerH / 2, // 玩家底部对齐电梯顶部
        });
      }
      // 如果 ticker 已存在，不重复添加
      if (!label.ticker) {
        label.ticker = () => {
          // 到顶部停下条件
          const topY = 50;
          if (body.position.y <= topY) {
            // 如果没人站上去，开始回落
            if (label.playersOnElevator.size === 0) {
              app.ticker.remove(label.ticker);
              label.ticker = null;
              // 自动回落
              label.ticker = () => {
                if (body.position.y >= label.startY) {
                  app.ticker.remove(label.ticker);
                  label.ticker = null;
                  return;
                }
                Matter.Body.translate(body, { x: 0, y: speed });
                body.view.x = body.position.x;
                body.view.y = body.position.y + 5 * VH();
              };
              app.ticker.add(label.ticker);
            }
            return;
          }

          // 每帧上升
          Matter.Body.translate(body, { x: 0, y: -speed });
          body.view.x = body.position.x;
          body.view.y = body.position.y + 5 * VH();

          // 推动玩家
          label.playersOnElevator.forEach((p) => {
            if (p.active) {
              Matter.Body.translate(p.body, { x: 0, y: -speed });
            }
          });
        };

        app.ticker.add(label.ticker);
      }
    }
  } else {
    // 玩家离开电梯
    if (label.name === "电梯") {
      console.log("我离开电梯了", body);
      label.playersOnElevator.delete(player);

      // 如果电梯在顶端且没人了，开始回落
      if (
        body.position.y <= 50 &&
        label.playersOnElevator.size === 0 &&
        !label.ticker
      ) {
        label.ticker = () => {
          if (body.position.y >= label.startY) {
            app.ticker.remove(label.ticker);
            label.ticker = null;
            return;
          }
          Matter.Body.translate(body, { x: 0, y: speed });
          body.view.x = body.position.x;
          body.view.y = body.position.y + 5 * VH();
        };
        app.ticker.add(label.ticker);
      }
    } else if (label.name === "tips") {
      if (!leaveCooldown()) return;
      activePlayer.hideSpeech();
    }
  }
}

function onCollisionEnd(e) {}

let elapsed = 0;
let elapsed1 = 0;
let elapsed2 = 0;
//倒计时扇形
function drawCooldown(ratio, lengque, ctx) {
  const c = lengque;
  const radius = c.width / 2;
  const ctxIndex = ctx;
  ctxIndex.clearRect(0, 0, c.width, c.height);
  if (ratio >= 1) return;
  // 绘制半透明扇形覆盖
  ctxIndex.beginPath();
  ctxIndex.moveTo(radius, radius);
  ctxIndex.arc(
    radius,
    radius,
    radius,
    -Math.PI / 2,
    -Math.PI / 2 + ratio * 2 * Math.PI,
    false
  );
  ctxIndex.closePath();
  ctxIndex.fillStyle = "rgba(0,0,0,0.5)";
  ctxIndex.fill();
}
function animate1() {
  elapsed += 1 / 60;
  const ratio = Math.min(elapsed / anniu.cdDuration2, 1);
  drawCooldown(ratio, canvas2.value, anniu.ctx2);
  // 更新数字倒计时
  anniu.cdText = Math.ceil(anniu.cdDuration2 * (1 - ratio));
  if (ratio < 1) {
    requestAnimationFrame(animate1);
  } else {
    // CD结束
    anniu.cdText = 0;
    anniu.ctx1.clearRect(0, 0, canvas2.value.width, canvas2.value.height);
    anniu.isCoolingDown = false;
  }
}
function animate2() {
  elapsed1 += 1 / 60;
  const ratio = Math.min(elapsed1 / anniu.cdDuration1, 1);

  drawCooldown(ratio, canvas1.value, anniu.ctx1);

  // 更新数字倒计时
  anniu.dashCdText = Math.ceil(anniu.cdDuration1 * (1 - ratio));

  if (ratio < 1) {
    requestAnimationFrame(animate2);
  } else {
    // CD结束
    anniu.dashCdText = 0;
    anniu.ctx2.clearRect(0, 0, canvas1.value.width, canvas1.value.height);
    anniu.isDashCoolingDown = false;
  }
}
function animate3() {
  elapsed2 += 1 / 60;
  const ratio = Math.min(elapsed2 / anniu.cdDuration3, 1);
  drawCooldown(ratio, canvas3.value, anniu.ctx3);
  // 更新数字倒计时
  anniu.cdSkill = Math.ceil(anniu.cdDuration3 * (1 - ratio));
  if (ratio < 1) {
    requestAnimationFrame(animate3);
  } else {
    // CD结束
    anniu.cdSkill = 0;
    anniu.ctx2.clearRect(0, 0, canvas3.value.width, canvas3.value.height);
    anniu.skillDown = false;
  }
}
/* ==================== 子弹池（Matter版） ==================== */
const MAX_BULLETS = 10;
const bulletPool = [];

function initBulletPool(MAX_BULLETS = 20) {
  for (let i = 0; i < MAX_BULLETS; i++) {
    // 红色矩形
    // const sprite = new Graphics();
    // sprite.beginFill(0xff0000);
    // sprite.drawRect(-width / 2, -height / 2, width, height);
    // sprite.endFill();
    // sprite.visible = false;
    // 子弹贴图
    const width = 10 * VH();
    const height = 5 * VH();
    const sprite = playAnimation("子弹", {
      width: width,
      height: height,
    });
    // Matter 子弹刚体
    const body = Matter.Bodies.rectangle(-1000, -1000, width, height, {
      isSensor: true,
      inertia: Infinity,
      label: "bullet",
      collisionFilter: {
        category: COLLISION_GROUPS.BULLET,
        mask:
          COLLISION_GROUPS.FRIEND |
          COLLISION_GROUPS.ENEMY |
          COLLISION_GROUPS.OBSTACLE,
        group: -2,
      },
      friction: 0,
      frictionAir: 0,
      restitution: 0,
    });

    Matter.World.add(world, body);

    // 推入池
    bulletPool.push({
      sprite,
      body,
      active: false,
      lifeTime: 0,
      zhongliTime: 0,
      autoAim: false,
      maxLife: 500, // ms
      aoeRadius: 0, // ✅ 默认没有范围伤害
      shanghai: 1, //伤害
      fixedVy: -0.23, //下坠
      direction: 0, //子弹方向
      deactivate() {
        activeBullets.delete(this);
        this.active = false;
        this.sprite.visible = false;
        this.lifeTime = 0;
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        Matter.Body.setPosition(this.body, { x: -9999, y: -9999 });
      },

      shoot(x, y, vx, vy, autoAim = false, aoeRadius, shanghai) {
        activeBullets.add(this);
        this.shanghai = shanghai;
        this.aoeRadius = aoeRadius;
        this.active = true;
        this.sprite.visible = true;
        this.lifeTime = 0;
        this.autoAim = autoAim;
        this.zhongliTime = 0;
        Matter.Body.setPosition(this.body, { x, y });
        Matter.Body.setVelocity(this.body, { x: vx, y: vy });
        // 设置旋转角度指向运动方向
        this.sprite.rotation = Math.atan2(vy, vx);
      },

      update(deltaMs = 16) {
        if (!this.active) return;
        this.lifeTime += deltaMs;
        if (!this.autoAim) {
          this.zhongliTime += deltaMs;
          Matter.Body.setVelocity(this.body, {
            x: this.body.velocity.x,
            y: this.body.velocity.y + this.fixedVy,
          });
        } else {
        }
        // 更新显示
        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
        // 超时销毁
        if (this.lifeTime >= this.maxLife) this.deactivate();
      },
    });
  }
}
function fireBullet({
  sourceX,
  sourceY,
  direction = 1,
  speed = 40,
  autoAim = false,
  target = false,
  aoeRadius = false,
  shanghai = 20,
}) {
  const bullet = bulletPool.find((b) => !b.active);
  if (!bullet) return;

  if (autoAim) {
    const dx = target.view.x - sourceX;
    const dy = target.view.y - sourceY - target.playerH;

    const angle = Math.atan2(dy, dx);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    bullet.shoot(sourceX, sourceY, vx, vy, autoAim, aoeRadius, shanghai);

    bullet.sprite.rotation = angle;
  } else {
    // ⭐ 获取最近敌人
    let nearest = null;
    if (target) {
      nearest = getNearestEnemy(sourceX, sourceY, npcs);
    }

    if (nearest) {
      const dx = nearest.view.x - sourceX;
      const dy = nearest.view.y - nearest.playerH * 0.5 - sourceY;

      const angle = Math.atan2(dy, dx);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      bullet.shoot(sourceX, sourceY, vx, vy, false, aoeRadius, shanghai);

      bullet.sprite.rotation = angle;
    } else {
      // 原来的水平射击
      bullet.shoot(
        sourceX,
        sourceY,
        direction * speed,
        0,
        false,
        aoeRadius,
        shanghai
      );

      bullet.sprite.rotation = direction > 0 ? 0 : Math.PI;
    }
  }
}

function canvasH(c, index) {
  c.width = c.clientWidth;
  c.height = c.clientHeight;
  if (index === 1) {
    anniu.ctx1 = c.getContext("2d");
  } else if (index === 2) {
    anniu.ctx2 = c.getContext("2d");
  } else if (index === 3) {
    anniu.ctx3 = c.getContext("2d");
  }
}
let stopCaozuo = false;
const wuti = new Map();
let drone; //无人机
let droneTicker = null; //无人机位置
let viewport;
function resizeGame(app) {
  app.renderer.resize(DEVICE_WIDTH, DEVICE_HEIGHT);

  // 告诉 viewport：屏幕尺寸变了
  viewport.resize(DEVICE_WIDTH, DEVICE_HEIGHT);
}

function handleBulletCollision(bodyA, bodyB) {
  //子弹检测
  const { BULLET, ENEMY, OBSTACLE } = COLLISION_GROUPS;

  const getFilter = (body) =>
    body.parent ? body.parent.collisionFilter : body.collisionFilter;

  const filterA = getFilter(bodyA);
  const filterB = getFilter(bodyB);

  let bulletBody = null;
  let otherBody = null;

  if (filterA.category & BULLET) {
    bulletBody = bodyA;
    otherBody = bodyB;
  } else if (filterB.category & BULLET) {
    bulletBody = bodyB;
    otherBody = bodyA;
  }

  // ⭐ 不是子弹碰撞，直接放行
  if (!bulletBody) return false;

  // ===== 拿 bullet 实例 =====
  let bullet = bulletBody.bulletRef;
  if (!bullet) {
    bullet = bulletPool.find((b) => b.body === bulletBody);
    bulletBody.bulletRef = bullet;
  }

  // 子弹已失效，碰撞吃掉即可
  if (!bullet || !bullet.active) return true;

  const otherFilter = getFilter(otherBody);
  const isRight = bulletBody.velocity.x > 0;
  // 随机偏移量
  // 最小偏移量和最大偏移量
  const minOffset = 2 * VW(); // 最小偏移 2% 屏幕宽
  const maxOffset = 3 * VW(); // 最大偏移 5% 屏幕宽

  // 随机偏移 = 最小偏移 + 随机部分
  const randomOffset = minOffset + Math.random() * (maxOffset - minOffset);

  // 根据方向决定正负
  const offsetX = isRight ? randomOffset : -randomOffset;
  // ===== 计算碰撞点 =====
  const hitX = bulletBody.position.x + offsetX;
  const hitY = bulletBody.position.y * 1.01;
  // ===== 范围伤害 =====
  if (
    bullet.aoeRadius &&
    (otherFilter.category & ENEMY || otherFilter.category & OBSTACLE)
  ) {
    applyAOEDamage(bullet, hitX, hitY);
    playAnimation("爆炸", {
      x: hitX,
      y: hitY,
    });
    bullet.deactivate();
    return true;
  }

  // ===== 单体命中 =====
  if (otherFilter.category & ENEMY) {
    otherBody.parent.gameObject.takeDamage(bullet.shanghai);
    playAnimation("爆炸", {
      x: hitX,
      y: hitY,
    });
    bullet.deactivate();
    return true;
  }

  if (otherFilter.category & OBSTACLE) {
    playAnimation("爆炸", {
      x: hitX,
      y: hitY,
    });
    bullet.deactivate();
    return true;
  }

  return true;
}

function playAnimation(name, option = {}, jiguang = false) {
  //动画
  const config = animationConfigs[name];
  if (!config) {
    console.warn(`动画配置未找到: ${name}`);
    return null;
  }
  const texture = Assets.get(config.textureKey);

  const width = (option.widthVH ?? config.widthVH) * VH();
  const height = (option.heightVH ?? config.heightVH) * VH();
  const sprite = createBulletAnimation({
    spriteSheet: texture,
    frameW: config.frameW,
    frameH: config.frameH,
    gapX: config.gapX,
    gapY: config.gapY,
    nCols: config.nCols,
    nRows: config.nRows,
    frameTime: config.frameTime,
    frameTimes: config.frameTimes,
    loop: config.loop,
    loopStartIndex: config.loopStartIndex,
    offsetX: config.offsetX ?? 0,
    offsetY: config.offsetY ?? 0,
  });

  sprite.width = width;
  sprite.height = height;
  sprite.anchor.set(0.5, 0.5);
  if (jiguang) {
    return sprite;
  }
  // 坐标
  sprite.x = option.x ?? 0;
  sprite.y = option.y ?? 0;

  // 可见性
  sprite.visible = option.visible ?? config.visible ?? true;
  // 非循环动画自动销毁
  if (!config.loop) {
    sprite.onComplete = () => {
      sprite.removeFromParent();
      sprite.destroy({ texture: false }); // 保留纹理
    };
  }

  worldContainer.addChild(sprite);
  return sprite;
}

function applyAOEDamage(bullet, cx, cy) {
  //AOE伤害
  npcs.forEach((enemy) => {
    if (!enemy.active) return;

    const dx = enemy.view.x - cx;
    const dy = enemy.view.y - cy;

    if (Math.hypot(dx, dy) <= bullet.aoeRadius) {
      enemy.takeDamage(bullet.shanghai);
    }
  });
}
let teshuSpine = [];
//读取矩形创建
function createRectFromData(rectData, index, name) {
  let rect;
  if (name === "矩形") {
    rect = rectPool.acquire(rectData.x, rectData.y, rectData.w, rectData.h, {
      color: rectData.color,
      zIndex: rectData.zIndex,
      withBody: rectData.withBody,
      isSensor: rectData.isSensor,
      movable: rectData.movable,
      label: rectData.label,
      create: rectData.create,
    });
  } else if (name === "三角形") {
    rect = trianglePool.acquire(
      rectData.x,
      rectData.y,
      rectData.w,
      rectData.h,
      {
        color: rectData.color,
        zIndex: rectData.zIndex,
        withBody: rectData.withBody,
        isSensor: rectData.isSensor,
        movable: rectData.movable,
        label: rectData.label,
        create: rectData.create,
      }
    );
  } else if (name === "圆形") {
    rect = circlePool.acquire(rectData.x, rectData.y, rectData.r, {
      color: rectData.color,
      zIndex: rectData.zIndex,
      withBody: rectData.withBody,
      isSensor: rectData.isSensor,
      movable: rectData.movable,
      label: rectData.label,
      create: rectData.create,
    });
  } else if (name === "互动道具") {
    rect = createTeshu(rectData.x, rectData.y, rectData.w, rectData.h, {
      texture: rectData.texture,
      name: rectData.texture,
      show: rectData.show,
      isInteractive: rectData.isInteractive,
      interactRange: rectData.interactRange,
    });
    teshuSpine.push(rect);
    //删除做法
    return;
  } else if (name === "问号互动") {
    rect = wenhaoHudong(rectData.x, rectData.y, rectData.w, rectData.h, {
      texture: rectData.texture,
      show: rectData.show,
      isInteractive: rectData.isInteractive,
      interactRange: rectData.interactRange,
    });
    teshuSpine.push(rect);
    //删除做法
    return;
  }

  rect.name = name + index;
  if (!wuti.has(index)) {
    wuti.set(index, []);
  }
  wuti.get(index).push(rect);
}

let currentTarget = null;
let floatTime = 0;

const PARALLAX = 0.2; // 远景（越小越远）
function onViewportMoved() {
  // 远景视差
  bgContainer.x = viewport.left * (1 - PARALLAX);
}
let laser;
// ==================== 主循环 ====================
let mapData;
onMounted(async () => {
  playerInfo = user.pixi.player;
  console.log("playerInfo=", playerInfo);
  await loadAssets();
  BgWall();
  WORLD_WIDTH = BgWidthPx;
  WORLD_HEIGHT = 100 * VH();
  mapData = getMapData("one01", {
    WORLD_WIDTH,
    VH,
    VW,
  });

  app = await createApp(gameContainer.value);
  viewport = new Viewport({
    screenWidth: DESIGN_WIDTH,
    screenHeight: DESIGN_HEIGHT,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    events: app.renderer.events,
    ticker: app.ticker, // ✅ 推荐加
    stopPropagation: true, // ✅ 推荐d
    disableOnContextMenu: true, // ✅ 推荐
    roundPixels: true, // ✅ 推荐
  });
  viewport.setZoom(1.3);
  resizeGame(app);
  vnZanting();
  //技能CD
  canvasH(canvas1.value, 1);
  canvasH(canvas2.value, 2);
  canvasH(canvas3.value, 3);
  gameContainer.value.appendChild(app.view);
  bgContainer = new Container();
  // bgContainer.scale.set(zoom);
  app.stage.addChild(bgContainer);

  worldContainer = new Container();

  app.stage.addChild(worldContainer);

  app.stage.addChild(viewport);

  engine = Matter.Engine.create();
  world = engine.world;
  world.gravity.y = 0.8;
  runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  viewport.addChild(bgContainer);
  viewport.addChild(worldContainer);

  createWallObject();
  mapData.rectPoolArr?.forEach((rectData, index) => {
    createRectFromData(rectData, index, "矩形");
  });
  mapData.trianglePoolArr?.forEach((rectData, index) => {
    createRectFromData(rectData, index, "三角形");
  });
  mapData.circlePoolArr?.forEach((rectData, index) => {
    createRectFromData(rectData, index, "圆形");
  });
  mapData.TriggerAreaArr?.forEach((rectData, index) => {
    createRectFromData(rectData, index, "矩形");
  });
  console.log(" mapData.teshuData=", mapData.teshuData);
  mapData.teshuData?.forEach((rectData, index) => {
    createRectFromData(rectData, index, "互动道具");
  });
  mapData.wenhaoHudong?.forEach((rectData, index) => {
    createRectFromData(rectData, index, "问号互动");
  });
  npcDataList = mapData.npcDataList ? mapData.npcDataList : [];
  playerPool = createPool(createPlayerObject);
  activePlayer = playerPool.acquire(WORLD_WIDTH * 0.9, 80 * VH(), {
    player: 1, //1=主角   2=敌人  3=站立NPC
    maxHp: 100,
    currentHp: 100,
    juese: "linen",
  });
  activePlayer.label = true;
  viewport.follow(activePlayer.mainBody.position, {
    speed: 20, // ❗非常小
  });
  viewport.clamp({
    left: 0,
    right: WORLD_WIDTH,
    top: -Infinity, // 无限制  -Infinity
    bottom: 100 * VH(),
  });
  //createCircleObject  createTriangleObject
  //无人机生成
  createDrone();
  controller = createController({ joystickZone: joystickContainer.value });

  Matter.Events.on(engine, "collisionStart", (event) => {
    for (const { bodyA, bodyB } of event.pairs) {
      // ⭐ 子弹优先处理
      if (handleBulletCollision(bodyA, bodyB)) continue;
      // ⭐ 其他逻辑（跳跃 / 传感器 / 拾取）
      onCollision(bodyA, bodyB);
      if (bodyA.label?.type && bodyB.label === "playerFoot") {
        onTrigger(bodyA.label, bodyB, true, bodyA);
      }
    }
  });
  Matter.Events.on(engine, "collisionEnd", (event) => {
    for (const { bodyA, bodyB } of event.pairs) {
      if (bodyB.label === "playerFoot") {
        isOnGround = false;
      }
      if (bodyA.label?.type && bodyB.label === "playerFoot") {
        onTrigger(bodyA.label, bodyB, false, bodyA);
      }
    }
  });
  // viewport.on("moved", onViewportMoved);
  //NPC池子
  initBulletPool();
  initNPCPool();
  activateNPC("idle");
  activateNPC("idle");
  // const oldFilmSeed = createTimer(200, updateOldFilmSeed); 复古滤镜
  laser = new Laser({
    app, // ✅ 一定要传
    engine,
    container: worldContainer,
    groups: COLLISION_GROUPS,
    damage: 20,
  });
  app.ticker.add((ticker) => {
    // oldFilmSeed(deltaMs);
    gameLoop();
    updateWenhao();
    // 更新子弹
    for (let b of activeBullets) b.update();
  });
});
function updateWenhao() {
  //问号更新
  const playerX = activePlayer.view.worldTransform.tx;
  const playerY = activePlayer.view.worldTransform.ty;
  for (let i = floatingMarks.length - 1; i >= 0; i--) {
    const mark = floatingMarks[i];

    // ⭐ 2. 快速跳过无效对象
    if (!mark || !mark.parent || mark.locked) continue;

    // ⭐ 3. 直接读取矩阵世界坐标（比 getGlobalPosition 快很多）
    const markX = mark.worldTransform.tx;
    const markY = mark.worldTransform.ty;

    const zoom = viewport.scale.x; // ⭐ 新增
    const range = (mark.interactRange || 100) * zoom; // ⭐ 修改

    // ⭐ 4. 第一层快速剔除（X轴判断）
    const dx = markX - playerX;
    if (Math.abs(dx) > range) {
      if (mark.visible) mark.visible = false;
      continue;
    }

    // ⭐ 5. 使用平方距离（避免 sqrt）
    const dy = markY - playerY;
    const distSq = dx * dx + dy * dy;
    const rangeSq = range * range;

    if (distSq <= rangeSq) {
      // ===== 在范围内 =====
      if (!mark.visible) {
        mark.visible = true;
      }

      // ⭐ 6. 只在可见时做浮动计算
      mark.y += mark.speed * mark.direction;

      if (mark.y >= mark.maxBaseY) {
        mark.y = mark.maxBaseY;
        mark.direction = -1;
      } else if (mark.y <= mark.minBaseY) {
        mark.y = mark.minBaseY;
        mark.direction = 1;
      }
    } else {
      if (mark.visible) mark.visible = false;
    }
  }
}
function updateOldFilmSeed() {
  oldFilm.seed = Math.random();
}
function createTimer(intervalMs, callback) {
  let counter = 0;
  return (deltaMs) => {
    counter += deltaMs;
    if (counter >= intervalMs) {
      counter = 0;
      callback();
    }
  };
}
const activeBullets = new Set();

function gameLoop() {
  if (!activePlayer) return;
  let vx = 0;
  let vy = activePlayer.body.velocity.y;
  const input = controller.keys;
  if (!stopCaozuo) {
    // 移动逻辑只在 stopCaozuo 为 false 时执行
    if (input.left.pressed) vx = -activePlayer.speed;
    else if (input.right.pressed) vx = activePlayer.speed;
    else if (activePlayer.isDashing) {
      vx =
        activePlayer.spine.direction === 1
          ? activePlayer.speed
          : -activePlayer.speed;
    }
    if (input.space.pressed && isOnGround) {
      const h = activePlayer.playerH * 0.26; //减少跳跃高度
      const v = Math.sqrt(2 * engine.gravity.y * h);
      vy = -v;
      input.space.pressed = false;
    }
  }
  // 玩家同步
  const absVX = Math.abs(vx);
  //update1
  activePlayer.update(vx, isOnGround, absVX, vy);
}
function vnZanting() {
  emitter.off("vnZanting");
  emitter.on("vnZanting", () => {
    user.pixi.isPaused = !user.pixi.isPaused;
    if (user.pixi.isPaused) {
      app.ticker.stop();
      Matter.Runner.stop(runner);
    } else {
      app.ticker.start();
      Matter.Runner.run(runner, engine);
    }
  });
}
// 给 viewport 的父级添加抖动
function shakeViewport(vpParent, intensity = 10, duration = 300) {
  const startTime = performance.now();

  function step() {
    const elapsed = performance.now() - startTime;

    if (elapsed < duration) {
      vpParent.x = (Math.random() * 2 - 1) * intensity;
      vpParent.y = (Math.random() * 2 - 1) * intensity;
      requestAnimationFrame(step);
    } else {
      vpParent.x = 0;
      vpParent.y = 0;
    }
  }

  requestAnimationFrame(step);
}

function ceshi5() {
  // teshuSpine[0].playBase("donghua1", false);
  // viewport.setZoom(0.5);
  shakeViewport(viewport.parent, 8, 300);
  console.log("123");
  return;
  // app.ticker.remove(wutituidong[0].ticker);
  //销毁物品 rectPool.release(wuti);
  // viewport.snapZoom({ //缩放
  //   width: WORLD_WIDTH*0.5,   // 缩放到世界宽度为 800
  //   time: 600,    // ms
  //   ease: 'easeInOutSine',
  // });
  // 人物 worldContainer  //背景  bgContainer  //全部 app.stage
  emitter.emit("vnZanting");
}
function destroyRectsByIndex(index) {
  //删除就给 destroyRectsByIndex(数字)
  const list = wuti.get(index);
  if (!list) return;

  for (let i = 0; i < list.length; i++) {
    rectPool.release(list[i]);
  }

  wuti.delete(index);
}

// --------------------
// 冲刺函数（仅地面）
// --------------------
function dash(player) {
  if (player.isDashing) return;
  if (!isOnGround) return;

  const DASH_SPEED = activePlayer.speed * 3; // 冲刺速度
  const DASH_TIME = 150; // 持续时间

  anniu.isDashCoolingDown = true;
  player.isDashing = true;
  const jiasu = activePlayer.speed * 3;
  activePlayer.speed += jiasu;
  elapsed1 = 0;
  animate2();
  // ⭐ 使用角色当前面朝方向
  const dir = player.spine.direction || 1;
  // 直接施加冲刺速度
  Matter.Body.setVelocity(player.body, {
    x: dir * DASH_SPEED,
    y: player.body.velocity.y,
  });

  // 视觉动感模糊
  const motionBlur = new MotionBlurFilter({
    velocity: [dir * 25, 0],
    kernelSize: 15,
  });

  player.spine.spine.filters = [motionBlur];

  setTimeout(() => {
    player.isDashing = false;

    // 冲刺结束后减速（可选）
    Matter.Body.setVelocity(player.body, {
      x: player.body.velocity.x * 0.5,
      y: player.body.velocity.y,
    });
    activePlayer.speed -= jiasu;
    player.spine.spine.filters = null;
  }, DASH_TIME);
}

//最近的敌人
function fireAtNearestEnemy() {
  if (npcs.length > 0) {
    const aliveEnemies = npcs.filter((e) => e.active);
    if (aliveEnemies.length === 0) return; // 没有敌人直接返回
    let nearest = aliveEnemies[0];
    let minDist = Math.abs(aliveEnemies[0].view.x - activePlayer.spine.view.x);

    for (let e of aliveEnemies) {
      const dist = Math.abs(e.view.x - activePlayer.spine.view.x);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    // ===== 强制调整玩家方向 =====
    if (nearest.view.x > activePlayer.spine.view.x) {
      activePlayer.spine.direction = 1; // 朝右
      activePlayer.char.setDirection(1);
    } else {
      activePlayer.spine.direction = -1; // 朝左
      activePlayer.char.setDirection(-1);
    }
  }
}
// ==================== 获取最近敌人 ====================
function getNearestEnemy(sourceX, sourceY, enemies, maxDistance = 51 * VW()) {
  const alive = enemies.filter((e) => e.active);
  if (alive.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;
  for (let e of alive) {
    const dist = Math.hypot(e.view.x - sourceX, e.view.y - sourceY);
    if (dist < minDist) {
      nearest = e;
      minDist = dist;
    }
  }

  // 距离超过 maxDistance 就返回 null
  if (minDist > maxDistance) return null;

  return nearest;
}
let attackDelayExtra = false; //无人机攻击延迟
function createDrone() {
  const height = 8 * VH(); // 高度 9 VH
  const width = height * (16 / 9); // 宽度 = 高度 × 16/9
  drone = rectPool.acquire(
    activePlayer.mainBody.position.x,
    activePlayer.mainBody.position.y - 5 * VH(),
    width,
    height,
    {
      texture: "drop",
      create: true,
    }
  );
  const droneAttackTimer = createTimer(3000, () => {
    if (attackDelayExtra) return; // 延迟期间不触发
    return;
    updateDroneAttack(); // 无人机攻击
  });

  const droneTimerFn = createTimer(25, updateDrone);
  droneTicker = (ticker) => {
    const deltaMs = ticker.deltaMS;
    droneAttackTimer(deltaMs);
    droneTimerFn(deltaMs);
  };
  app.ticker.add(droneTicker);
}
// 更新无人机位置
function updateDrone() {
  const facingDir = activePlayer.spine.direction;

  // ===== 判断速度和浮动幅度 =====
  const normalSpeed = 0.03;
  const slowSpeed = 0.001; // 明显减缓
  const followSpeed = dropActive ? slowSpeed : normalSpeed;

  // 浮动幅度
  const normalFloatX = DEVICE_WIDTH * 0.003;
  const normalFloatY = DEVICE_HEIGHT * 0.003;
  const slowFloatX = DEVICE_WIDTH * 0.001; // dropActive 时浮动幅度变小
  const slowFloatY = DEVICE_HEIGHT * 0.001;

  const floatX =
    Math.sin(performance.now() / 600) *
    (dropActive ? slowFloatX : normalFloatX);
  const floatY =
    Math.sin(performance.now() / 700) *
    (dropActive ? slowFloatY : normalFloatY);

  // ===== 基础目标位置（玩家位置 + 偏移） =====
  const baseX = activePlayer.mainBody.position.x + facingDir * (2 * VW());
  const baseY =
    activePlayer.mainBody.position.y - activePlayer.playerH - 7 * VH();

  // ===== 平滑跟随，产生拖尾 =====
  const newX =
    drone.view.position.x +
    (baseX - drone.view.position.x) * followSpeed +
    floatX;
  const newY =
    drone.view.position.y +
    (baseY - drone.view.position.y) * followSpeed +
    floatY;

  // ===== 更新显示 + 刚体 =====
  drone.reset(newX, newY);
}

// 无人机攻击
function updateDroneAttack() {
  const target = getNearestEnemy(
    activePlayer.spine.view.x,
    activePlayer.spine.view.y,
    npcs
  );
  if (target === null) return;
  const skillShanghai = skillSearch("被动");
  const durationTime = skillShanghai.skill.durationTime; //激光持续时间
  // 设置本次激光伤害
  laser.damage = skillShanghai.shanghai;
  const start = {
    x: drone.view.position.x,
    y: drone.view.position.y,
  };
  const targetX = target.body.position.x;
  const targetY = target.body.position.y;
  // ===== 激光终点（朝敌人方向，拉一条很长的线）=====
  const dx = targetX - start.x;
  const dy = targetY - start.y;
  const len = Math.hypot(dx, dy) || 1;

  const maxLength = DEVICE_WIDTH * 2; // 激光最大长度
  const end = {
    x: start.x + (dx / len) * maxLength,
    y: start.y + (dy / len) * maxLength,
  };
  //startContinuous
  const sprite = playAnimation(
    "激光1",
    {
      x: drone.view.position.x,
      y: drone.view.position.y + 2.5 * VH(),
    },
    true
  );
  sprite.height = 5 * VH();
  laser.shootOnce(
    //1秒触发6次
    start,
    end,
    {
      spriteFactory: sprite,
      duration: durationTime,
    }
  );
  dropActive = true;
  setTimeout(() => {
    dropActive = false; //无人机可动
  }, durationTime);
}

//NPC区域
/* ==================== NPC 对象池（无碰撞） ==================== */
const MAX_NPCS = 2;
const npcPool = [];
const npcs = []; // 当前激活 NPC

// 外部定义 NPC 数据数组
let npcDataList;
// NPC 初始化时为每个 NPC 生成随机跟随距离
function assignNPCRandomRanges(npc) {
  if (npc.data.type === "melee") {
    // 近战攻击范围，随机在 5% ~ 8% 屏幕宽度
    npc.data.attackRange = DEVICE_WIDTH * (0.05 + Math.random() * 0.03);
  } else if (npc.data.type === "ranged") {
    // 远程安全距离范围，随机化避免重合
    npc.data.minDist = DEVICE_WIDTH * (0.25 + Math.random() * 0.03); // 25%~28%
    npc.data.maxDist = DEVICE_WIDTH * (0.3 + Math.random() * 0.03); // 30%~33%
  }
}
function initNPCPool() {
  const dataLen = npcDataList.length;
  for (let i = 0; i < MAX_NPCS; i++) {
    // ⭐ 用余数循环取 1 2 1 2 1 2
    const npcData = { ...npcDataList[i % dataLen] };
    //NPC生成位置
    const activeNpc = playerPool.acquire(
      WORLD_WIDTH * npcDataList[i].x,
      npcDataList[i].y * VH() || 80 * VH(),
      npcData
    );

    activeNpc.view.visible = false;
    activeNpc.active = false;

    npcPool.push(activeNpc);
  }
}
//激活NPC
function activateNPC(xPercent) {
  const npc = npcPool.find((n) => !n.active);
  if (!npc) return null;
  assignNPCRandomRanges(npc);
  npc.reset(xPercent);
  npcs.push(npc);
}

onBeforeUnmount(() => {
  Matter.Runner.stop(runner);
  Matter.World.clear(world);
  Matter.Engine.clear(engine);
  app.destroy(true);
});
</script>

<style scoped>
:deep(.el-dialog__header) {
  padding-bottom: 0;
}
</style>