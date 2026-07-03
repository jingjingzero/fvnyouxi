  <template>
    <div v-loading="isPageLoading" element-loading-text="游戏加载中..." element-loading-background="#000"
      class="w-screen h-screen overflow-hidden">
      <div class="absolute z-9999">{{ user.pixi.duihua }}</div>
      <!-- 对话 -->
      <div v-show="user.pixi.duihua" class="absolute z-999">
        <duihua />
      </div>
      <div v-if="user.pixi.setting === 1" class="absolute left-0 w-full h-full z-5 ">
        <infoMap />
        <!-- <Ipad /> -->
      </div>
      <kapai v-if="user.pixi.fight" class="absolute!" @fight-end="enablePlayerControl" />
      <div ref="gameContainer" class="w-screen h-screen overflow-hidden relative">
        <!-- 菜单 -->
        <!-- <div
          class="absolute right-7vh top-5vh w-[13vh] h-[6vh] rounded-3 bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-4vh select-none"
          v-show="!user.pixi.fight && !isPageLoading" @click="ceshi5">
          <el-popover v-if="user.pixi.setting !== 1" placement="left-start" :visible="user.pixi.isPaused" :width="200"
            trigger="click" popper-class="mr-1.5vh w-15vw! min-w-15vw!">
            <template #reference>
              <span class="text-3vh iconfont2">菜单</span>
            </template>
<div class="text-1.4vw flex flex-col items-center iconfont2 text-#333 gap-y-1.3vh py-0.5vh">
  <div @click="tanchuang(0)" class="w-full h-full text-center">
    信息
  </div>
  <el-divider style="margin: 0" />
  <div @click="tanchuang(1)" class="w-full h-full text-center">
    管理员权限
  </div>
  <el-divider style="margin: 0" />
  <div @click="tanchuang(4)" class="w-full h-full text-center">
    任务
  </div>
  <el-divider style="margin: 0" />
  <div @click="tanchuang(5)" class="w-full h-full text-center">
    NPC查看
  </div>
  <el-divider style="margin: 0" />
  <div @click="tanchuang(2)" class="w-full h-full text-center">
    进入战斗
  </div>
  <el-divider style="margin: 0" />
  <div @click="tanchuang(3)" class="w-full h-full text-center">
    返回主界面
  </div>
</div>
</el-popover>
</div> -->
        <img src="@/assets/daoju/juese.webp"
          class="absolute right-5vh w-12vh h-12vh object-contain top-3vh rounded-full"
          style="border:1.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
          v-show="!user.pixi.gameUi && !isPageLoading" @click="ceshi5" />
        <el-drawer v-model="drawer" :with-header="false" @close="guanbi" :z-index="100">
          <div class="bg-#f5f5f5 w-full h-full py-2.5vh px-1vw">
            <!-- 第一行：头像 + 等级经验 + 血量 -->
            <div class="flex items-start gap-3vw mb-3vh">
              <!-- 左侧：角色头像 -->
              <div class="flex-shrink-0 relative">
                <img src="@/assets/fullBody/head/zhujue.webp" class="w-15vh h-15vh rounded-full object-cover block"
                  style="border:3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />
                <!-- 等级徽章 -->
                <div
                  class="absolute -bottom-2vh left-1/2 iconfont2 -translate-x-1/2 bg-gradient-to-r from-#FFD700 to-#FFA500 text-white text-2.5vh px-1.5vw py-0.2vh rounded-full shadow-md whitespace-nowrap">
                  Lv.{{ user.pixi.player.Level }}
                </div>
              </div>

              <!-- 右侧：经验条 + 血量条 -->
              <div class="flex-1 flex flex-col justify-center gap-2vh pt-1vh">
                <!-- 血量进度条 -->
                <div>
                  <div class="flex justify-between items-center mb-0.8vh">
                    <span class="text-2vh font-bold text-#333">生命值</span>
                    <span class="text-1.8vh text-#666">
                      {{ user.pixi.player.juese.hp }} / {{ user.pixi.player.juese.maxHp }}
                    </span>
                  </div>
                  <div class="w-full h-2.5vh bg-#e0e0e0 rounded-full overflow-hidden shadow-inner">
                    <div
                      class="h-full bg-gradient-to-r from-#F56C6C to-#FF7878 rounded-full transition-all duration-300"
                      :style="{ width: (user.pixi.player.juese.hp / user.pixi.player.juese.maxHp * 100) + '%' }">
                    </div>
                  </div>
                </div>
                <!-- 经验值进度条 -->
                <div>
                  <div class="flex justify-between items-center mb-0.8vh">
                    <span class="text-2vh font-bold text-#333">经验值</span>
                    <span class="text-1.8vh text-#666">
                      {{ user.pixi.player.exp }} / {{ user.pixi.player.maxExp }}
                    </span>
                  </div>
                  <div class="w-full h-2vh bg-#e0e0e0 rounded-full overflow-hidden shadow-inner">
                    <div
                      class="h-full bg-gradient-to-r from-#409EFF to-#67C23A rounded-full transition-all duration-300"
                      :style="{ width: (user.pixi.player.exp / user.pixi.player.maxExp * 100) + '%' }">
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 分割线 -->
            <div class="w-full h-0.1vh bg-#ddd mb-4vh mt-5vh!"></div>
            <!-- 功能图标区：每行最多4个 -->
            <div class="grid grid-cols-4 gap-2vh">
              <!-- 角色信息 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openInventory">
                <img src="@/assets/daoju/beibao.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">背包系统</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openCards">
                <img src="@/assets/daoju/cardList.webp" class="w-11vh h-11vh object-contain scale-115" />
                <span class="text-2.5vh text-white font-medium">卡牌系统</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(4)">
                <img src="@/assets/daoju/taskList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">任务系统</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(5)">
                <img src="@/assets/daoju/jibanList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">羁绊系统</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openTalent">
                <img src="@/assets/daoju/tianfuList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">天赋系统</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="talkToNpc('npc/jingling','jingling_first_meet')">
                <img src="@/assets/daoju/tianfuList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">触发对话</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(2)">
                <img src="@/assets/daoju/zhandou.png" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">进入战斗</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(3)">
                <img src="@/assets/daoju/fanhui.png" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">返回主界面</span>
              </div>
            </div>
          </div>
        </el-drawer>
        <el-dialog v-model="dialogTableVisible" width="75vw" :show-close="false" @close="ceshi5" top="4vh">
          <xinxi class="overflow-hidden" :defaultTab="playerInfoDefaultTab" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible1" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <task class="overflow-hidden" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible2" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <npcLook class="overflow-hidden" />
        </el-dialog>
      </div>
    </div>
  </template>

<script setup>
import duihua from "./duihua.vue";
import { ref, onMounted, onBeforeUnmount, markRaw } from "vue";
import {
  Container,
  Graphics,
  Texture,
  TilingSprite,
  ColorMatrixFilter,
  Sprite,
  RenderTexture,
  BlurFilter,
  Text,
  Assets,
  RenderGroup,
  log2
} from "pixi.js";
import { gsap } from "gsap";
import emitter from "@/bus";
import Matter from "matter-js";
import { createApp } from "./core/app.js";
import { createSpineBoy } from "./spineBoy";
import { createViewport } from "./camera/viewport.js";
import { createEngine } from "./core/engine.js";
import {
  createRectObject,
  createCircleObject,
  createTriangleObject
} from "./objects/index.js";
import { useCounterStore } from "@/store/counter";
import xinxi from "./player/xinxi.vue";
import task from "./player/task.vue";
import npcLook from "./player/npcLook.vue";
import { getMapData, getAllMapIds } from "./player/map";

import { loadAssets, loadMapBundle, unloadMapBundle, isBundleLoaded } from "../../components/loadAssets";
import infoMap from "./info/index.vue";
import router from "@/router";
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { BgWall, createWallObject, createBgSpine, createPool, createSpeechBubble, loadMapData } from './matter1/bg.js';
import { createPlayerPhysicsBody, applyDamageFilter, updatePlayerAnimation, updatePlayerDirection, createHpBar } from './matter1/playerCreate.js';
import { wenhaoHudong, floatingMarks } from './matter1/daoju.js';
import { savePlayerPosition, teleportBack, removeNPCsByMapId, playerUpdate, updateNPCPool, hideAllEnemyHpBar, fightMode, showAllEnemyHpBar, npcs, npcPool, syncAllNPC, cameraOffsetX, goToMap, npcManager } from './matter1/npcManager.js';
import { setupCollisionStart, setupCollisionEnd, allElevators } from './matter1/collisionEvents.js';
import { initGameUI, updateGameUI, getJoystick } from "./matter1/gameUI.js";
import {
  createOldFilmFilter, destroyDayNightFilter, setDayNightSpeed, hideDayNightFilter, showDayNightFilter, isNight, isDay, getNightFactor, isDayNightActive, getDayTime, setDayTime, getDayNightSpeed, updateDayNightCalc, createDayNightFilter, getCurrentBoundary,
  getReflectionFilter, createReflectionFilter, removeReflectionFilter, setReflectionBoundary, isReflectionActive, createGodrayLight, removeGodrayLight, isGodrayActive, getGodrayFilter, getOldFilmFilter, removeOldFilmFilter
} from "./matter1/filters.js";
import kapai from "./fight/index.vue"
import { fightQidong } from "./matter1/fightKaiqi.js"
import { DAMAGE_COLOR_MAP, BUFF_COLOR_MAP } from './matter1/buff.js'
import createEnemiesData from './matter1/enemiesData.js';
import { loadDialogueModule, startDialogue } from './dialogue/index.js';
// 全局记录已生成的地图ID，避免重复生成
const generatedMapIds = new Set();
// 全局记录已加载的地图数据
const generatedMapData = new Map();
// 多线程物理Worker
const physicsWorker = new Worker(new URL('./physics.worker.js', import.meta.url), { type: 'module' });
// 刚体ID映射：id -> 主线程Matter.Body实例，用于同步坐标
// 玩家输入缓存，每帧发给worker
const playerInput = ref({
  left: false,
  right: false,
  jump: false
});
// ✅ 新增：玩家控制总开关（true=可移动跳跃，false=完全禁用）
let canPlayerControl = true;
const fps = ref(0); // 帧率
let frameCount = 0;
let lastTime = performance.now();
const gameContainer = ref(null);
const isPageLoading = ref(true); // 全局加载状态
const user = useCounterStore();
const route = useRoute();
const drawer = ref(false)
// 离开游戏页面时自动存档（所有返回主界面的入口都会触发）
onBeforeRouteLeave((to, from, next) => {
  // 战斗中退出不存档，避免存档异常数据
  if (user.pixi.fight) {
    next();
    return;
  }
  if (activePlayer) {
    user.autoSave(getSaveData());
  }
  next();
});

// 收集存档数据（包括朝向）
function getSaveData() {
  // 收集NPC朝向
  const npcDirections = {};
  for (const npc of npcs) {
    if (npc.spine?.direction != null && npc.data?.name) {
      npcDirections[npc.data.name] = npc.spine.direction;
    }
  }

  return {
    currentMap: currentMapId,
    playerX: activePlayer?.body?.position.x ?? 0,
    playerY: activePlayer?.body?.position.y ?? 0,
    playerDirection: activePlayer?.spine?.direction ?? 1,
    npcDirections: npcDirections,
  };
}

// 恢复朝向（读档时调用）
function restoreDirections() {
  // 恢复玩家朝向
  if (route.query.playerDir && activePlayer?.spine) {
    const dir = Number(route.query.playerDir);
    activePlayer.spine.direction = dir;
    activePlayer.spine.setDirection?.(dir);
    console.log('[读档] 恢复玩家朝向:', dir);
  }

  // 恢复NPC朝向
  if (route.query.npcDirs) {
    try {
      const npcDirs = JSON.parse(route.query.npcDirs);
      let restoredCount = 0;
      for (const npc of npcs) {
        if (npc.data?.name && npcDirs[npc.data.name] != null && npc.spine) {
          const dir = npcDirs[npc.data.name];
          npc.spine.direction = dir;
          npc.spine.setDirection?.(dir);
          restoredCount++;
        }
      }
      console.log(`[读档] 恢复了 ${restoredCount} 个NPC的朝向`);
    } catch (e) {
      console.warn('[读档] 解析NPC朝向失败:', e);
    }
  }
}

// 自动存档定时器（每6分钟自动存一次）
let autoSaveTimer = null;
function startAutoSaveTimer() {
  if (autoSaveTimer) return;
  autoSaveTimer = setInterval(() => {
    // 战斗中不自动存档
    if (user.pixi.fight) {
      console.log('[自动存档] 战斗中，跳过自动存档');
      return;
    }
    if (activePlayer) {
      user.autoSave(getSaveData());
    }
  }, 6 * 60 * 1000); // 6分钟
}

function stopAutoSaveTimer() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
    console.log('[自动存档] 已停止');
  }
}

let app;
let worldContainer;
let engine;
let runner;
let playerPool;
let activePlayer;
let world;

const dialogTableVisible = ref(null);
const dialogTableVisible1 = ref(null);
const dialogTableVisible2 = ref(null);
const playerInfoDefaultTab = ref('info'); // 角色信息面板默认激活的标签
const rectPool = createPool(createRectObject);
const circlePool = createPool(createCircleObject);
const trianglePool = createPool(createTriangleObject);

let WORLD_WIDTH;
let WORLD_HEIGHT;

let VH = window.innerHeight / 100;
let VW = window.innerWidth / 100;

const COLLISION_GROUPS = {
  FRIEND: 0x0001,
  ENEMY: 0x0002,
  OBSTACLE: 0x0004,
  BULLET: 0x0008,
  SENSOR: 0x0010,
};

function tanchuang(i) {
  if (i === 3) {
    user.pixi.fight = false
    user.pixi.isPaused = false;
    // 返回主界面前自动存档
    // if (activePlayer) {
    //   user.autoSave({
    //     currentMap: currentMapId,
    //     playerX: activePlayer.body.position.x,
    //     playerY: activePlayer.body.position.y,
    //   });
    // }
    router.push({ name: "index" });
    return;
  }
  user.pixi.setting = i;
  if (i === 2) {
    // user.pixi.setting = 0
    // emitter.emit("vnZanting");
    drawer.value = false
    guodu()
  } else if (i === 0) dialogTableVisible.value = true;
  else if (i === 4) dialogTableVisible1.value = true;
  else if (i === 5) dialogTableVisible2.value = true;
}
const vh = (percent) => {
  const viewportHeight = window.innerHeight; // 或者用你的Pixi应用高度：app.renderer.height
  const px = viewportHeight * percent / 100;
  // 限制最小/最大字号，避免极端分辨率下异常
  return Math.max(12, Math.min(px, 32));
};
function createPlayerObject(x, y, options) {
  const DEFAULT_HEIGHT = 19 * VH;
  const WIDTH_SCALE = 0.4;
  const PLAYER_SCALE_FACTOR = 1.5;

  const playerH = options.height * VH || DEFAULT_HEIGHT;
  const playerW = playerH * WIDTH_SCALE;
  const radius = playerW / 2;
  const rectHeight = playerH - 2 * radius;

  const isFriend = options.player === 1 || options.player === 3;
  const collisionCategory = isFriend ? COLLISION_GROUPS.FRIEND : COLLISION_GROUPS.ENEMY;

  const { mainBody, footSensor, body } = createPlayerPhysicsBody(
    playerW, rectHeight, radius, isFriend, collisionCategory, Matter, COLLISION_GROUPS
  );

  Matter.Body.setInertia(body, Infinity);
  // Matter.Body.setPosition(body, { x, y });
  Matter.World.add(world, body);


  const spine = createSpineBoy({}, options);
  // ✅ 新增：开启批处理，同Atlas纹理的多个Spine会自动合并成1次DrawCall
  spine.view.batchable = true;
  // ✅ 可选：如果Spine有半透明像素，开启alpha裁切，避免WebGPU下渲染错误
  spine.view.alphaCutoff = 0.1;
  const bounds = spine.spine.getBounds();
  const scale = (playerH / bounds.height) * PLAYER_SCALE_FACTOR;
  spine.view.scale.set(scale);
  spine.view.position.set(x, y - playerH / 2 + 20 * VH);
  spine.direction = 1;
  spine.setDirection(1);
  const zIndex = options.zIndex ?? 0;
  spine.view.zIndex = zIndex;

  // ==============================================
  // 🔥 每个角色自动添加 贴地阴影（永远在脚下）
  // ==============================================
  const shadow = new Graphics()
    .ellipse(
      0,
      0,
      playerW * 0.75,
      playerW * 0.2
    )
    .fill({
      color: 0x000000,
      alpha: 0.7,
    });
  shadow.filters = [
    new BlurFilter({
      strength: 5,
      quality: 2,
    }),
  ];

  shadow.pivot.set(0, 0);
  // 影子层级低于人物
  shadow.zIndex = -1;

  worldContainer.addChild(shadow);
  worldContainer.addChild(spine.view);
  // 初始化地面固定Y
  let groundFixedY;
  // 影子动画插值变量
  let shadowScale = 1;
  let shadowAlpha = 0.35;
  // ==============================================

  const speechBubble = createSpeechBubble(VH, Container, Graphics, Text, gsap);
  speechBubble.visible = false;
  worldContainer.addChild(speechBubble);
  let hpBar

  if (options.player === 2) {
    hpBar = createHpBar(options, body, rectPool, VH, VW, world, worldContainer, Container, Text);
    worldContainer.addChild(hpBar.view);
  }
  const speed = playerH * 0.025;
  const zdSpeed = playerH * 0.18;
  // 全局创建唯一的受伤滤镜，所有角色共享
  const globalDamageFilter = new ColorMatrixFilter()
  // 预设闪白参数，不用每次创建
  globalDamageFilter.brightness(1.8)
  globalDamageFilter.contrast(1.2)
  const player = {
    speechBubble, showBubble: false, bubbleText: "",
    groundContacts: 0, isOnGround: false,
    data: options, char: spine, view: spine.view, body,
    speed, zdSpeed, isDashing: false, playerH, playerW,
    mainBody, hpBar, footSensor, spine,
    ticker: null, active: true, scale,
    damageFilter: new ColorMatrixFilter(), damageTimer: null,
    shadow,
    groundFixedY,
    shadowScale,
    shadowAlpha,
    shadowData: null,
    _damageTextStack: 0, // 伤害数字堆叠计数器，防止多个数字重合

    takeDamage(damage = 1, options = {}, playerAttack = 1) {
      if (!this.active) return
      const { type = 'normal', isCritical = false } = options;

      this.data.data.hp -= damage

      // 🔥 受击震动效果
      this._playHitShake();

      // 原有闪白滤镜逻辑不变
      if (this.damageTimer) clearTimeout(this.damageTimer)
      this.view.filters = [...(this.view.filters || []), globalDamageFilter]
      this.damageTimer = setTimeout(() => {
        this.view.filters = this.view.filters?.filter(f => f !== globalDamageFilter) || []
        this.damageTimer = null
      }, 100)
      applyDamageFilter(this.view, this.damageFilter, damage, this.data.data.maxHp);

      if (this.hpBar) {
        const hpRatio = Math.max(this.data.data.hp / this.data.data.maxHp, 0);
        this.hpBar.fill.scale.x = hpRatio;
        const curHp = Math.max(Math.ceil(this.data.data.hp), 0);
        this.hpBar.hpText.text = `${curHp}`;

        const { barStartX, barFullWidth } = this.hpBar;
        const currentMidX = barStartX + (barFullWidth * hpRatio) / 2;
        this.hpBar.hpText.x = currentMidX;
      }

      this._spawnDamageText(damage, type, isCritical, playerAttack);

      if (this.data.data.hp <= 0) this.deactivate();
    },

    // 🔥 受击震动效果
    _playHitShake() {
      if (!this.body || !this.active) return;

      // 判断阵营：玩家/友方往左震，怪物往右震
      const isPlayer = this.data.player === 1 || this.data.player === 3;
      const direction = isPlayer ? -1 : 1;

      const shakeDistance = 4; // 震动距离（像素）
      const shakeTimes = 3; // 震动次数
      const shakeDuration = 0.06; // 每次震动时长

      // 记录原始位置
      const originalX = this.body.position.x;

      // 清除之前的震动动画，避免叠加
      if (this._shakeTween) {
        this._shakeTween.kill();
      }

      // 震动动画：来回抖动
      this._shakeTween = gsap.to(this.body.position, {
        x: originalX + direction * shakeDistance,
        duration: shakeDuration,
        yoyo: true,
        repeat: shakeTimes * 2 - 1, // 来回算一次，重复N次
        ease: "power2.inOut",
        onComplete: () => {
          // 确保回到原位
          if (this.body) {
            Matter.Body.setPosition(this.body, {
              x: originalX,
              y: this.body.position.y
            });
          }
          this._shakeTween = null;
        }
      });
    },

    _spawnDamageText(value, type = 'normal', isCritical = false, playerAttack = 0) {
      const activeType = DAMAGE_COLOR_MAP[type] ? type : 'normal';
      const textColor = DAMAGE_COLOR_MAP[activeType][isCritical ? 'critical' : 'normal'];

      let scaleRatio = 1;
      if (playerAttack > 0) {
        const damageRatio = value / playerAttack;
        scaleRatio = 0.8 + Math.min(damageRatio * 0.4, 0.7);
      }
      if (isCritical) scaleRatio *= 1.2;

      const baseFontSize = vh(1.6);
      const finalFontSize = Math.max(12, Math.min(28, Math.round(baseFontSize * scaleRatio)));
      const damageText = new Text({
        // ✅ 唯一修改：自动区分正负号，恢复显示+，伤害显示-
        text: `${['heal', 'mp'].includes(type) ? '+' : '-'}${Math.max(value, 0)}`,
        style: {
          fill: textColor,
          fontSize: finalFontSize,
          fontWeight: isCritical ? '900' : 'bold',
          stroke: {
            color: '#000000',
            width: Math.max(2, Math.floor(finalFontSize / 7)),
          },
          fontFamily: 'Arial Black',
          resolution: window.devicePixelRatio || 2,
        }
      });

      // 后面的位置、动画、层级逻辑 完全复用，一点不用改
      damageText.anchor.set(0.5);
      // ✅ 伤害数字堆叠偏移：每个新数字往上偏移，避免重合
      const stackOffset = this._damageTextStack * vh(1.5);
      // 水平随机偏移加大，避免完全重叠
      damageText.x = this.view.x + (Math.random() - 0.5) * (finalFontSize * 3);
      // 往上堆叠，新的在上面
      damageText.y = this.view.y - this.view.height / 2 - vh(0.5) - stackOffset;
      // 堆叠计数+1
      this._damageTextStack++;
      damageText.alpha = 1;
      damageText.scale.set(1);
      damageText.zIndex = 999;
      damageText.blendMode = 'normal';

      const parent = this.view.parent;
      parent?.addChild(damageText);
      parent.sortChildren();

      gsap.timeline()
        .to(damageText, {
          scale: isCritical ? 1.2 : 1.1,
          duration: 0.15,
          ease: 'power3.out'
        })
        .to(damageText, {
          y: damageText.y - vh(3.5),
          duration: 0.5,
          ease: 'power1.out',
        }, '<')
        .to(damageText, {
          alpha: 0,
          duration: 0.2,
          ease: 'power1.out',
        }, '>')
        .call(() => {
          // 动画结束，堆叠计数-1
          this._damageTextStack = Math.max(0, this._damageTextStack - 1);
          damageText.destroy({ children: true });
        }, null, '>');
    },
    takeHeal(value, type = 'heal', isCritical = false) {
      if (!this.active) return;

      // 1. 实际加数值
      if (type === 'heal') {
        // 回血，不超过最大血量
        this.data.data.hp = Math.min(this.data.data.maxHp, this.data.data.hp + value);
      } else if (type === 'mp') {
        // 回灵力，不超过最大灵力
        this.data.data.mp = Math.min(this.data.data.maxMp, this.data.data.mp + value);
      }
      // 3. ✅ 直接复用飘字逻辑，不用写重复代码
      this._spawnDamageText(value, type, isCritical);
    },
    showBuffText(buffName) {
      if (!this.active) return;

      const color = BUFF_COLOR_MAP[buffName]?.color || BUFF_COLOR_MAP['减益'].color;
      const finalFontSize = Math.max(12, Math.min(28, Math.round(vh(1.6))));
      const buffText = new Text({
        text: buffName,
        style: {
          fill: color,
          fontSize: finalFontSize,
          fontWeight: 'bold',
          stroke: '#000000',
          strokeThickness: Math.max(2, Math.floor(finalFontSize / 7)),
          fontFamily: 'Arial Black',
          resolution: window.devicePixelRatio || 2,
        }
      });

      buffText.anchor.set(0.5);
      // ✅ 方案1：直接大范围随机，保证两个buff不会在同一个位置
      buffText.x = this.view.x + (Math.random() - 0.5) * 40;  // ±40 大范围随机
      buffText.y = (this.view.y + 2 * VH) - this.view.height / 2 - vh(0.5) + (Math.random() - 0.5) * 40;
      buffText.alpha = 1;
      buffText.scale.set(1);
      buffText.zIndex = 120;
      buffText.blendMode = 'normal';

      const parent = this.view.parent;
      parent?.addChild(buffText);
      parent.sortChildren();

      gsap.timeline()
        .to(buffText, { scale: 1.1, duration: 0.15, ease: 'power3.out' })
        .to(buffText, { y: buffText.y - vh(3.5), duration: 0.5, ease: 'power1.out' }, '<')
        .to(buffText, { alpha: 0, duration: 0.2, ease: 'power1.out' }, '>')
        .call(() => buffText.destroy({ children: true }));
    },
    updateMotion(vx, isOnGround, absVX, vy) {
      if (!this.active) return;

      this.isOnGround = isOnGround;
      updatePlayerAnimation(this.spine, isOnGround, absVX, vx, vy, this.speed);
      updatePlayerDirection(this.spine, vx);
      if (this.shadowData) {
        this.shadow.x = this.shadowData.x;
        this.shadow.y = this.shadowData.y;
        this.shadow.scale.set(this.shadowData.scale);
        this.shadow.alpha = this.shadowData.alpha;
      }
    },
    npcAIUpdate(playerTarget) {
      if (!this.active || !playerTarget?.body) return;
      this.updateMotion(0, this.isOnGround, 0, this.body.velocity.y);
    },
    npcFight(index, totalCount, player = activePlayer) {
      const NPC_SPACING = 5 * VW;
      const RIGHT_FIXED = 57 * VW;  // 最右侧固定位置

      // ✅ 最右侧固定，整体向左对齐
      // 最后一个(index = totalCount-1) → 正好在 RIGHT_FIXED（最右）
      // 第一个(index = 0) → 在 RIGHT_FIXED - (totalCount-1)×间距（最左）
      const xOffset = RIGHT_FIXED - (totalCount - index - 1) * NPC_SPACING;

      // 1. 设置渲染位置
      this.view.x = player.view.x + xOffset;
      this.view.y = player.view.y;
      // 2. 同步物理body位置
      Matter.Body.setPosition(this.body, {
        x: player.body.position.x + xOffset,
        y: this.view.y
      });

      // 3. NPC面向主角（朝左）
      this.spine.setDirection(-1);
      this.spine.direction = -1;

      // 4. 同步影子位置
      this.shadow.x = this.body.position.x;
      this.shadow.y = this.groundFixedY;
      return {
        x: this.view.x,
        y: this.view.y
      };
    },
    reset() {
      this.speed = this.data.speed * VW;
      this.aiMode = this.data.aiMode;
      this.view.visible = true;
      this.view.renderable = true;
      this.shadow.visible = true;
      this.shadow.renderable = true;
      this.active = true;
      if (this.hpBar) {
        this.hpBar.view.visible = false;
        this.hpBar.view.renderable = true;
        this.hpBar.hpText.text = `${this.data.data.hp}`;
        this.hpBar.hpText.x = this.hpBar.barStartX + this.hpBar.barFullWidth / 2;
      }
      this.body.collisionFilter.mask = COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.BULLET;
      this.spine.playIdle();
      // 重置影子参数
      this.shadowScale = 1;
      this.shadowAlpha = 0.35;
      this.shadow.alpha = this.shadowAlpha;
      this.groundFixedY = this.body.position.y + this.playerH * 0.32;
    },

    deactivate() {
      if (options.player === 2) {
        this.active = false;
        this.view.visible = false;
        this.view.renderable = false;
        this.shadow.visible = false;
        this.shadow.renderable = false;
        this.speechBubble.visible = false;
        if (this.hpBar) {
          this.hpBar.view.visible = false;
          this.hpBar.view.renderable = false;
        }
        this.body.collisionFilter.mask = COLLISION_GROUPS.OBSTACLE;
        if (this.damageTimer) clearTimeout(this.damageTimer);
        this.shadowAlpha = 0;
        this.shadow.alpha = this.shadowAlpha;
      }
    },

    showSpeech(text) {
      this.bubbleText = text;
      this.speechBubble.setText(text);
      this.showBubble = true;
      this.speechBubble.show();
    },

    hideSpeech() {
      this.showBubble = false;
      this.speechBubble.hide();
    }
  };

  body.gameObject = player;
  return player;
}
let WallScale;
let bgContainer;
let spineBgContainer; // spine 动态背景容器（独立于静态背景）
let farBgContainer; // 远景背景容器（最底层，视差最慢）
let allBgContainer; // 所有背景的父容器，用于统一应用滤镜

const wuti = new Map();
let viewport;
let cameraTarget;


function createRectFromData(rectData, index, name, mapId) {
  let rect;
  if (name === "矩形") {
    rect = rectPool.acquire(rectData.x, rectData.y, rectData.w, rectData.h, {
      color: rectData.color, zIndex: rectData.zIndex, withBody: rectData.withBody,
      isSensor: rectData.isSensor, movable: rectData.movable, label: rectData.label, create: rectData.create, enableAABB: rectData.enableAABB,
    }, world, worldContainer, COLLISION_GROUPS);
  } else if (name === "三角形") {
    rect = trianglePool.acquire(rectData.x, rectData.y, rectData.w, rectData.h, {
      color: rectData.color, zIndex: rectData.zIndex, withBody: rectData.withBody,
      isSensor: rectData.isSensor, movable: rectData.movable, label: rectData.label, create: rectData.create,
    }, world, worldContainer, COLLISION_GROUPS);
  } else if (name === "圆形") {
    rect = circlePool.acquire(rectData.x, rectData.y, rectData.r, {
      color: rectData.color, zIndex: rectData.zIndex, withBody: rectData.withBody,
      isSensor: rectData.isSensor, movable: rectData.movable, label: rectData.label, create: rectData.create,
    }, world, worldContainer, COLLISION_GROUPS);
  } else if (name === "问号互动") {
    rect = wenhaoHudong(rectData.x, rectData.y, rectData.w, rectData.h, {
      textureName: rectData.texture, show: rectData.show, isInteractive: rectData.isInteractive,
      wuxian: rectData.wuxian, isFloatEnable: rectData.isFloatEnable
    }, WallScale, hudMarkContainer, Assets, Sprite);

    return;
  }
  rect.name = name + index;
  if (!wuti.has(mapId)) wuti.set(mapId, []);
  wuti.get(mapId).push(rect);
}

// 视差滚动系数（越大移动越慢，景深效果越强）
const PARALLAX_FAR_BG = 0.5;  // 远景背景视差系数（更大=移动更慢）
// 当前远景的地图偏移量（用于视差滚动对齐）
let currentFarBgOffsetX = 0;

function onViewportMoved() {
  // 远景移动最慢（景深效果）
  // 公式：farBgContainer.x = 视差系数 * (视口位置 - 地图偏移)
  // 确保当 viewport.left = offsetX 时，远景和静态背景对齐
  farBgContainer.x = PARALLAX_FAR_BG * (viewport.left - currentFarBgOffsetX);
}

/**
 * 创建单张地图的远景背景和 Spine 动态背景
 * @param {Object} mapData - 地图数据对象
 */
function createMapExtraBackgrounds(mapData) {
  console.log('mapData=', mapData);

  const mapId = mapData.id;
  let createdSomething = false;

  // ===== 远景背景 =====
  if (mapData.farBackgroundImages && mapData.farBackgroundImages.length > 0) {
    const farBgKey = mapId + '_farBg';
    console.log('generatedMapIds=', generatedMapIds);

    if (!generatedMapIds.has(farBgKey)) {
      const farBgData = BgWall(Assets, mapData.farBackgroundImages);
      console.log('farBgData=', farBgData);

      // 只有当实际有纹理时才创建（资源已加载）
      if (farBgData.WallTextures.length > 0) {
        farWallPiece = createWallObject(farBgData.WallScale, farBgData.WallTextures, Sprite, Container);
        farWallPiece.x = mapData.offsetX;
        console.log('mapData.offsetX=', mapData.offsetX);

        farBgContainer.addChild(farWallPiece);
        console.log('✅ 远景背景已添加，地图:', mapId, '图片:', mapData.farBackgroundImages);
        generatedMapIds.add(farBgKey);
        createdSomething = true;
      }
    }
  }

  // ===== Spine 动态背景 =====
  if (mapData.spineBackground) {
    const spineBgKey = mapId + '_spineBg';
    if (!generatedMapIds.has(spineBgKey)) {
      const bgData = BgWall(Assets, mapData.backgroundImages);
      const bgHeight = bgData.WallTextures.length > 0
        ? bgData.WallTextures[0].height * bgData.WallScale
        : window.innerHeight;

      const bgSpine = createBgSpine(
        bgData.WallScale,
        bgHeight,
        mapData.spineBackground.skelName,
        mapData.spineBackground.atlasName,
        mapData.spineBackground.animationName,
        Container,
        app
      );

      if (bgSpine.spine) {
        bgSpine.view.x = mapData.offsetX + mapData.realWidth / 2;
        bgSpine.setGroundY(window.innerHeight);
        spineBgContainer.addChild(bgSpine.view);
        console.log('✅ spine 动态背景已添加，地图:', mapId);
        generatedMapIds.add(spineBgKey);
        createdSomething = true;
      }
    }
  }

  return createdSomething;
}

// ====== 远景背景全局单例（场景复用，同一张远景图多张地图共享） ======
let currentFarBgImages = null;  // 当前远景背景的图片标识

/**
 * 更新远景背景（全局单例，切换地图时调用）
 * 相同远景图自动复用，不重复创建；不同则切换
 * @param {Object} mapData - 地图数据对象
 */
let farWallPiece;
function updateFarBackground(mapData) {
  const farImages = mapData.farBackgroundImages;

  // 判断图片是否相同（相同则复用，不重新创建）
  const isSame = currentFarBgImages && farImages &&
    currentFarBgImages.length === farImages.length &&
    currentFarBgImages.every((img, i) => img === farImages[i]);

  if (isSame && farWallPiece) {
    console.log('🔄 远景背景相同，复用当前远景:', farImages);
    farWallPiece.x = mapData.offsetX;
    // 更新当前偏移量，用于视差滚动对齐
    currentFarBgOffsetX = mapData.offsetX;
    // 手动更新一次视差位置（确保切换地图时立即对齐）
    farBgContainer.x = PARALLAX_FAR_BG * (viewport.left - currentFarBgOffsetX);
    console.log('    farWallPiece.x=', farWallPiece.x);
    return;
  }

  // 清空旧的远景
  while (farBgContainer.children.length > 0) {
    const child = farBgContainer.removeChildAt(0);
    if (child.destroy) child.destroy({ children: true });
  }
  farWallPiece = null;

  // 创建新的远景
  if (farImages && farImages.length > 0) {
    const farBgData = BgWall(Assets, farImages);
    if (farBgData.WallTextures.length > 0) {
      farWallPiece = createWallObject(farBgData.WallScale, farBgData.WallTextures, Sprite, Container);
      // 远景和地图对齐（世界坐标，和静态背景一样）
      farWallPiece.x = mapData.offsetX;
      farBgContainer.addChild(farWallPiece);
      // 更新当前偏移量，用于视差滚动对齐
      currentFarBgOffsetX = mapData.offsetX;
      // 手动更新一次视差位置
      farBgContainer.x = PARALLAX_FAR_BG * (viewport.left - currentFarBgOffsetX);
      console.log('✅ 远景背景已更新，图片:', farImages, '位置:', mapData.offsetX);
      // 只有成功创建时才设置当前图片标识
      currentFarBgImages = [...farImages];
    } else {
      console.warn('⚠️ 远景资源未加载，无法创建远景背景');
      // 创建失败，重置状态
      currentFarBgImages = null;
      currentFarBgOffsetX = 0;
    }
  } else {
    console.log('ℹ️ 该地图无远景背景配置');
    currentFarBgImages = null;
    currentFarBgOffsetX = 0;
  }

  if (farWallPiece) {
    console.log('farWallPiece.1x=', farWallPiece.x);
  }
}

// ====== Spine 动态背景全局单例（场景复用） ======
let currentSpineBgConfig = null;  // 当前 Spine 背景的配置标识

/**
 * 更新 Spine 动态背景（全局单例，切换地图时调用）
 * 相同配置自动复用，不重复创建；不同则切换
 * @param {Object} mapData - 地图数据对象
 */
function updateSpineBackground(mapData) {
  const spineConfig = mapData.spineBackground;

  // 判断配置是否相同（相同则复用，只更新位置）
  const isSame = currentSpineBgConfig && spineConfig &&
    currentSpineBgConfig.skelName === spineConfig.skelName &&
    currentSpineBgConfig.atlasName === spineConfig.atlasName &&
    currentSpineBgConfig.animationName === spineConfig.animationName;

  if (isSame) {
    console.log('🔄 Spine 动态背景相同，复用当前 Spine:', spineConfig.skelName);
    // 复用同一个 Spine 实例，只更新位置（和当前地图对齐）
    if (spineBgContainer.children.length > 0) {
      const spineView = spineBgContainer.children[0];
      spineView.x = mapData.offsetX + mapData.realWidth / 2;
    }
    return;
  }

  // 清空旧的 Spine 背景
  while (spineBgContainer.children.length > 0) {
    const child = spineBgContainer.removeChildAt(0);
    if (child.destroy) child.destroy({ children: true });
  }

  // 创建新的 Spine 背景
  if (spineConfig) {
    const bgData = BgWall(Assets, mapData.backgroundImages);
    const bgHeight = bgData.WallTextures.length > 0
      ? bgData.WallTextures[0].height * bgData.WallScale
      : window.innerHeight;

    const bgSpine = createBgSpine(
      bgData.WallScale,
      bgHeight,
      spineConfig.skelName,
      spineConfig.atlasName,
      spineConfig.animationName,
      Container,
      app
    );

    if (bgSpine.spine) {
      // Spine 背景和地图对齐（世界坐标）
      bgSpine.view.x = mapData.offsetX + mapData.realWidth / 2;
      bgSpine.setGroundY(window.innerHeight);
      spineBgContainer.addChild(bgSpine.view);
    }
  } else {
    console.log('ℹ️ 该地图无 Spine 动态背景配置');
  }

  currentSpineBgConfig = spineConfig ? { ...spineConfig } : null;
}

let currentGroundY;
let joystick; // 定义 1 次
let defaultMap
let hudMarkContainer
onMounted(async () => {
  user.pixi.activePlayer = null
  user.pixi.fight = false
  user.pixi.isPaused = false
  floatingMarks.length = 0;
  npcPool.length = 0;
  npcs.length = 0;

  // 1. 先加载初始地图资源（读档则加载存档地图，否则默认one01）
  const startMap = route.query.map || 'one01';
  currentMapId = startMap;
  await loadMapInfo(startMap)

  // 2. 创建 Pixi 应用
  app = await createApp(gameContainer.value);
  gameContainer.value.appendChild(app.canvas);
  bgContainer = new Container();
  spineBgContainer = new Container();
  farBgContainer = new Container();
  allBgContainer = new Container();  // 所有背景的父容器，用于统一应用滤镜
  worldContainer = new Container();
  cameraTarget = new Container();
  hudMarkContainer = new Container();
  hudMarkContainer.zIndex = 9999;

  // 3. 配置RenderGroup分层合批
  // spine 动态背景是否在静态背景上方（true=上方，false=下方）
  const isSpineAboveBg = false;

  // 远景背景（最底层，视差最慢）
  farBgContainer.group = new RenderGroup({
    priority: -2,
    isStatic: true,
    sortableChildren: false,
  })
  bgContainer.group = new RenderGroup({
    priority: 0,
    isStatic: true,
    sortableChildren: false,
  })
  // spine 动态背景用独立的动态渲染组（isStatic=false，保证每帧更新）
  spineBgContainer.group = new RenderGroup({
    priority: isSpineAboveBg ? 1 : -1,
    isStatic: false,
    sortableChildren: false,
  })
  worldContainer.group = new RenderGroup({
    priority: 2,
    isStatic: false,
    sortableChildren: true,
  })
  hudMarkContainer.group = new RenderGroup({
    priority: 3,
    isStatic: true,
    sortableChildren: false,
  })

  // 4. 加载所有地图数据和背景
  const allMapIds = getAllMapIds();
  user.pixi.npcDataList = [];
  user.pixi.mapDataList = [];
  for (const mapId of allMapIds) {
    const tempMap = getMapData(mapId, { WORLD_WIDTH: 0, VH, VW });
    const bgData = BgWall(Assets, tempMap.backgroundImages);
    const myOwnWidth = bgData.BgWidthPx;
    const mapData = getMapData(mapId, { WORLD_WIDTH: myOwnWidth, VH, VW });
    WallScale = bgData.WallScale;
    const wallPiece = createWallObject(bgData.WallScale, bgData.WallTextures, Sprite, Container);
    wallPiece.x = mapData.offsetX;
    bgContainer.addChild(wallPiece);

    mapData.realWidth = myOwnWidth;
    user.pixi.mapDataList.push(mapData);
  }

  defaultMap = user.pixi.mapDataList.find(m => m.id === "one01");
  WORLD_WIDTH = defaultMap.realWidth;
  WORLD_HEIGHT = 100 * VH;

  // 5. 创建视口和物理引擎
  viewport = createViewport(app, WORLD_WIDTH, WORLD_HEIGHT);
  viewport.setZoom(1.3);
  viewport.on('moved', onViewportMoved);
  engine = createEngine();
  world = engine.world;
  engine.gravity.y = 0.8;

  app.stage.addChild(viewport);

  // ===== 所有背景都放到 allBgContainer 中，统一应用滤镜 =====
  // 远景最先添加（最底层）
  allBgContainer.addChild(farBgContainer);

  // 根据 isSpineAboveBg 参数决定添加顺序（后添加的在上层）
  if (isSpineAboveBg) {
    // spine 在静态背景上方
    allBgContainer.addChild(bgContainer);
    allBgContainer.addChild(spineBgContainer);
  } else {
    // spine 在静态背景下方
    allBgContainer.addChild(spineBgContainer);
    allBgContainer.addChild(bgContainer);
  }

  // 把所有背景的父容器添加到 viewport
  viewport.addChild(allBgContainer);

  viewport.addChild(worldContainer);
  viewport.addChild(hudMarkContainer);

  // 6. 初始化UI、摇杆、键盘
  initGameUI(app, () => {
    if (!canPlayerControl) return;
    if (activePlayer?.isOnGround && !playerInput.value.jump) {
      playerInput.value.jump = true;
    }
  }, Sprite, user);
  joystick = getJoystick();

  window.addEventListener('keydown', (e) => {
    if (!joystick || !canPlayerControl) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') joystick.keyLeft = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') joystick.keyRight = true;
    if ((e.code === 'Space' || e.code === 'KeyW') && activePlayer?.isOnGround && !playerInput.value.jump) {
      playerInput.value.jump = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (!joystick) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') joystick.keyLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') joystick.keyRight = false;
  });

  // 7. 加载NPC数据
  const finalNpcs = loadMapData(user.pixi.mapDataList, createRectFromData);
  user.pixi.npcDataList = finalNpcs;

  // 8. 创建玩家
  playerPool = createPool(createPlayerObject);
  activePlayer = playerPool.acquire(defaultMap.playerSpawnX, defaultMap.playerSpawnY, {
    player: 1, juese: "linen",
    height: 22, TopH: 6.5, xuetiaoPosition: 25, zIndex: 2, TopMap: defaultMap.TopMap,
    data: {
      hp: 1500,
      maxHp: 1500,
    }
  });
  activePlayer.label = true;
  user.pixi.playerInstance = markRaw(activePlayer);
  viewport.follow(cameraTarget, { speed: 5000 });

  // 9. 设置碰撞
  setupCollisionStart(engine, Matter, VH, physicsWorker);
  setupCollisionEnd(engine, Matter, physicsWorker);

  // 10. 注册NPC更新事件并渲染NPC
  npcConfigUpdated();
  await TpMap(startMap);
  // 读档时设置玩家到存档坐标
  if (route.query.x && route.query.y && activePlayer) {
    Matter.Body.setPosition(activePlayer.body, {
      x: Number(route.query.x),
      y: Number(route.query.y)
    });
  }

  emitter.emit('npcConfigUpdated', user.pixi.npcDataList);

  vnZanting();

  // 11. 初始化物理Worker
  physicsWorker.postMessage({ type: 'init' });
  physicsWorker.onmessage = (e) => {
    if (e.data.type === 'vxSync' && activePlayer?.body) {
      if (!canPlayerControl) return;
      Matter.Body.setVelocity(activePlayer.body, {
        x: e.data.vx,
        y: activePlayer.body.velocity.y
      });
      if (e.data.jump && activePlayer.isOnGround) {
        const jumpPower = -Math.sqrt(2 * engine.gravity.y * activePlayer.playerH * 0.26);
        Matter.Body.setVelocity(activePlayer.body, {
          x: activePlayer.body.velocity.x,
          y: jumpPower
        });
        playerInput.value.jump = false;
      }
    }
  };

  // 13. 启用玩家控制
  enablePlayerControl();

  // 14. 等待几帧确保所有Spine资源加载渲染完成
  await new Promise(resolve => requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  }));
  talkToNpc('npc/jingling','jingling_first_meet')
  // 🔥 读档时恢复朝向
  restoreDirections();

  // 15. 后台预加载其他地图
  afterTpMap(startMap);

  // 16. 隐藏loading，显示游戏
  isPageLoading.value = false;

  // 17. 启动自动存档定时器（每6分钟）
  startAutoSaveTimer();
  // 主循环：移除主线程Matter.Engine.update，仅发送输入+步进指令
  let tickCount = 0;
  app.ticker.add(() => {
    // ====================
    // ✅ 新增：帧率计算
    // ====================
    const now = performance.now();
    frameCount++;
    if (now - lastTime >= 1000) {
      fps.value = Math.round(frameCount);
      frameCount = 0;
      lastTime = now;
    }

    tickCount++;
    if (tickCount % 2 === 0) {
      // ✅ 禁用时，永远发静止输入给Worker
      if (!canPlayerControl) {
        physicsWorker.postMessage({
          type: "input",
          data: { left: false, right: false, jump: false },
          VW: VW
        });
      } else {
        const left = (joystick?.x < -20) || joystick?.keyLeft;
        const right = (joystick?.x > 20) || joystick?.keyRight;
        playerInput.value.left = left;
        playerInput.value.right = right;

        physicsWorker.postMessage({
          type: "input",
          data: { ...playerInput.value },
          VW: VW
        });
      }
    }


    Matter.Engine.update(engine, 16.666);
    updateWenhao();
    gameLoop();
    updateGameUI(fps, activePlayer);
    // 发给 Worker：所有需要计算视图的角色（每帧执行，关键路径）
    sendAllToViewWorker()
  });
});
let globalTimeScale = 1; // 全局游戏时间倍速，暂停/快进只改这一个值
async function ceshi5() {
  drawer.value = true
  user.pixi.activePlayer = {
    hp: activePlayer.data.data.hp,
    maxHp: activePlayer.data.data.maxHp,
    x: activePlayer.body.position.x,
    y: activePlayer.body.position.y,
    speed: activePlayer.speed,
    juese: activePlayer.data.juese
  };
  emitter.emit("vnZanting");
}


// 打开角色信息 - 背包标签
function openInventory() {
  playerInfoDefaultTab.value = 'inventory';
  drawer.value = false;
  dialogTableVisible.value = true;
}

// 打开角色信息 - 卡牌携带标签
function openCards() {
  playerInfoDefaultTab.value = 'cardBook';
  drawer.value = false;
  dialogTableVisible.value = true;
}

// 打开角色信息 - 天赋标签
function openTalent() {
  playerInfoDefaultTab.value = 'talent';
  drawer.value = false;
  dialogTableVisible.value = true;
}

async function talkToNpc(loadData,name) {
  // 根据 NPC ID 选择不同的对话入口
  drawer.value = false;
  user.pixi.gameUi = true;
  disablePlayerControl();
  await loadDialogueModule(loadData);
  
  // 判断是否是第一次和精灵对话
  if (user.isDialogueComplete(name)) {
    // 已经相遇过，播放普通对话
    startDialogue('jingling_talk')
  } else {
    // 第一次相遇，播放初次相遇剧情
    startDialogue(name)
  }
  
  user.showDialogue() // 显示对话组件
}
// 保存游戏
function saveGame() {
  if (activePlayer && !user.pixi.fight) {
    user.autoSave(getSaveData());
    ElMessText("游戏已保存！", "success");
  } else {
    ElMessText("战斗中无法存档", "warning");
  }
}
function guodu() {
  // 进入战斗：先变黑，加载完所有资源再变白
  createOldFilmFilter(app, viewport, 0.35, jinruzhandou);
}
function guanbi() {
  user.pixi.isPaused = false;
  app.ticker.start();
}
async function jinruzhandou() {
  // 1. 先变黑
  isMapTransitioning = false;
  const map = user.pixi.mapDataList.find(m => m.id === "desert_02");
  WORLD_WIDTH = map.realWidth;
  const tpPosition = map.offsetX + WORLD_WIDTH * 0.08
  activePlayer.spine.direction = 1;
  activePlayer.spine.setDirection(1);
  await TpMap("desert_02", tpPosition);
  user.pixi.gameUi = true;
  // 3. 创建敌人数据
  const enemyData = createEnemiesData();
  user.pixi.npcDataList = [...user.pixi.npcDataList, ...enemyData];
  // // 5. 创建敌人NPC
  emitter.emit('npcConfigUpdated', user.pixi.npcDataList);
  // 6. 等待几帧确保所有敌人Spine资源加载渲染完成
  await new Promise(resolve => requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }));

  // 7. 启动战斗
  fightQidong(user);
  disablePlayerControl();
}
let cachedTriggerAreas = [];
let frameCount1 = 0
// 把所有玩家、NPC的位置数据发给Worker计算视图
const ACTIVE_DISTANCE = VW * 75; // npc可见距离
// 优化：计数器，降低非关键计算频率
let reflectionFrameCount = 0;
let godrayFrameCount = 0;
// 优化：NPC视距剔除缓存，减少每帧遍历开销
let npcCullTick = 0;
const NPC_CULL_INTERVAL = 3; // 每3帧做一次视距剔除
function sendAllToViewWorker() {
  if (!activePlayer || !activePlayer.body) return;

  const entries = [];
  const playerX = activePlayer.body.position.x;

  // 优化：每3帧做一次视距剔除，中间帧直接用上次结果
  npcCullTick++;
  if (npcCullTick % NPC_CULL_INTERVAL === 0) {
    for (const n of npcs) {
      if (!n || !n.body || !n.active) continue;

      const dx = Math.abs(
        n.body.position.x - playerX
      );
      // 超出范围直接跳过
      if (dx > ACTIVE_DISTANCE) {
        n.view.visible = false;
        continue;
      }
      n.view.visible = true;

      entries.push([
        n.body.id,
        n.body.position.x,
        n.body.position.y,
        n.playerH,
        n.data.TopH ?? 5.5,
        n.data.xuetiaoPosition ?? 25,
        n.showBubble ?? false,
        n.body.velocity.y,
        n.isOnGround ? 1 : 0,
        0
      ]);
    }
  } else {
    // 非剔除帧：只收集可见的NPC
    for (const n of npcs) {
      if (!n || !n.body || !n.active || !n.view.visible) continue;
      entries.push([
        n.body.id,
        n.body.position.x,
        n.body.position.y,
        n.playerH,
        n.data.TopH ?? 5.5,
        n.data.xuetiaoPosition ?? 25,
        n.showBubble ?? false,
        n.body.velocity.y,
        n.isOnGround ? 1 : 0,
        0
      ]);
    }
  }

  entries.push([
    activePlayer.body.id,
    activePlayer.body.position.x,
    activePlayer.body.position.y,
    activePlayer.playerH,
    activePlayer.data.TopH ?? 5.5,
    activePlayer.data.xuetiaoPosition ?? 25,
    activePlayer.showBubble ?? false,
    activePlayer.body.velocity.y, // 新增 vy
    activePlayer.isOnGround ? 1 : 0, // 新增落地标记
    1
  ]);

  const count = entries.length;
  // 原来每条32字节，现在每条40字节：4 + count * 40
  const buf = new ArrayBuffer(4 + count * 40);
  const view = new DataView(buf);
  view.setUint32(0, count, true);

  entries.forEach((e, i) => {
    const o = 4 + i * 40; // 步长改成40
    view.setUint32(o + 0, e[0], true);          // id
    view.setFloat32(o + 4, e[1], true);         // x
    view.setFloat32(o + 8, e[2], true);         // y
    view.setFloat32(o + 12, e[3], true);        // playerH
    view.setFloat32(o + 16, e[4], true);        // TopH
    view.setFloat32(o + 20, e[5], true);         // xuetiao
    view.setUint8(o + 24, e[6] ? 1 : 0, true);  // showBubble
    view.setFloat32(o + 28, e[7], true);         // 新增 vy
    view.setUint8(o + 32, e[8], true);           // 新增 isOnGround
    view.setUint8(o + 33, e[9], true);           // 类型标记(玩家/NPC)
  });

  physicsWorker.postMessage({
    type: 'computeAllViews',
    buffer: buf,
    count,
    VH,
    currentMapTopMap: defaultMap?.TopMap ?? 0,
    currentGroundY,
    // 只传必要数字，剥离复杂引用
    light: currentLight ? {
      x: currentLight.x,
      y: currentLight.y,
      offsetScale: currentLight.offsetScale
    } : null
  }, [buf]);

  // ---------------- 传送触发器 二进制版 ----------------
  frameCount1++;
  if (frameCount1 % 10 === 0) {
    const p = activePlayer.body.position;
    const ph = activePlayer.playerH;
    const trigCount = cachedTriggerAreas.length;

    // 构造二进制
    const trigBuf = new ArrayBuffer(
      4 +        // 玩家数量
      12 +       // 玩家 x,y,h
      4 +        // 触发器数量
      trigCount * 24  // x,y,w,h,offsetX, index
    );
    const v = new DataView(trigBuf);

    // 玩家
    v.setUint32(0, 1, true);
    v.setFloat32(4, p.x, true);
    v.setFloat32(8, p.y, true);
    v.setFloat32(12, ph, true);

    // 触发器
    v.setUint32(16, trigCount, true);
    for (let i = 0; i < trigCount; i++) {
      const t = cachedTriggerAreas[i];
      const o = 20 + i * 24;
      v.setFloat32(o + 0, t.x, true);
      v.setFloat32(o + 4, t.y, true);
      v.setFloat32(o + 8, t.w, true);
      v.setFloat32(o + 12, t.h, true);
      v.setFloat32(o + 16, t.offsetX, true);
      v.setUint32(o + 20, i, true); // 把索引传过去
    }

    physicsWorker.postMessage(
      { type: 'checkTriggers', buffer: trigBuf },
      [trigBuf]
    );
  }
  // ---------------- 水面数据发给Worker（优化：每2帧一次） ----------------
  if (isReflectionActive()) {
    reflectionFrameCount++;
    if (reflectionFrameCount % 2 === 0) {
      const filter = getReflectionFilter();
      if (filter) {
        filter.time += 0.03 * 2; // 补偿跳过的帧
        filter.boundary = getCurrentBoundary();
      }
      physicsWorker.postMessage({
        type: 'updateReflection',
        viewport: {
          left: viewport.left,
          top: viewport.top,
          scaleX: viewport.scale.x,
          scaleY: viewport.scale.y,
        },
        waterWorldY: 90 * VH, // 水面高度
        screenHeight: app.screen.height
      })
    }
  }
  // ====================== 体积光 同水面写法（优化：每2帧一次） ======================
  if (isGodrayActive() && currentLight && activePlayer) {
    godrayFrameCount++;
    if (godrayFrameCount % 2 === 0) {
      physicsWorker.postMessage({
        type: 'godray:calc',
        deltaMS: app.ticker.deltaMS * 2, // 补偿跳过的帧
        lightWorldX: currentLight.x,
        playerX: activePlayer.body.position.x
      });
    }
  }
  // ====================== 昼夜滤镜 ======================
  if (isDayNightActive()) {
    const delta = app.ticker.deltaTime * globalTimeScale;
    let t = getDayTime();
    t += getDayNightSpeed() * delta;
    if (t > 1) t = 0;
    setDayTime(t);
    dayNightSendTimer += delta; // 用时间累加更稳定，不依赖帧速率
    if (dayNightSendTimer >= 3) {
      updateDayNightCalc();
      dayNightSendTimer = 0;
    }
    dayNightLogTimer += delta;
    if (dayNightLogTimer >= 10) {
      dayNightLogTimer = 0;
      const darkFactor = getNightFactor();
      if (isGodrayActive()) {
        const filter = getGodrayFilter();
        // 颜色渐变
        const r = Math.floor(lerp(255, 160, darkFactor));
        const g = Math.floor(lerp(255, 184, darkFactor));
        const b = Math.floor(lerp(255, 255, darkFactor));
        filter.color = (r << 16) + (g << 8) + b;
        // 亮度：白天0.75，深夜0.3
        filter.gain = lerp(0.75, 0.5, darkFactor);
      }
      if (isReflectionActive()) {
        const refFilter = getReflectionFilter();
        // 白天透明度 [0.3,0.5]，夜晚反光更淡 [0.12, 0.26]
        const alphaMin = lerp(0.5, 0.65, darkFactor);
        const alphaMax = lerp(0.7, 0.9, darkFactor);
        refFilter.alpha = [alphaMin, alphaMax];
      }
      if (isNight()) {
        // console.log('当前：黑夜');
      } else {
        // console.log('当前：白天');
      }
    }
  }
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
let MAP_BOUNDS = null;
let dayNightSendTimer = 0; //昼夜
let dayNightLogTimer = 0; // 昼夜打印间隔计时器
function getCurrentMapClampBounds(playerX) {
  if (!MAP_BOUNDS) {
    MAP_BOUNDS = [];
    for (const map of user.pixi.mapDataList) {
      MAP_BOUNDS.push({ left: map.offsetX, right: map.offsetX + map.realWidth });
    }
  }
  for (const b of MAP_BOUNDS) {
    if (playerX >= b.left && playerX <= b.right) return b;
  }
  return { left: 0, right: WORLD_WIDTH };
}
//根据传送点名称传送
function teleportByName(triggerName) {
  // 根据不同名字 跳不同地图+坐标
  let map;
  let tpPosition;
  switch (triggerName) {
    // TP0 → 传送回 第一张地图
    case "TP0":
      map = user.pixi.mapDataList.find(m => m.id === "one01");
      WORLD_WIDTH = map.realWidth;
      tpPosition = map.offsetX + WORLD_WIDTH * 0.97
      TpMap("one01", tpPosition);
      break;

    case "TP1":
      map = user.pixi.mapDataList.find(m => m.id === "desert_01");
      WORLD_WIDTH = map.realWidth;
      tpPosition = map.offsetX + WORLD_WIDTH * 0.03
      TpMap("desert_01", tpPosition);
      break;
  }
}
let frame = 0;
let ACTIVE_MARK_DIST = VW * 19;
//浮动道具
function updateWenhao() {
  if (++frame % 7 !== 0) return;
  if (!activePlayer || !activePlayer.body) return;

  const px = activePlayer.body.position.x;
  const py = activePlayer.body.position.y;

  // 先过滤出玩家范围内的标记，只传这部分给Worker
  const validMarks = floatingMarks.filter(m => {
    const dx = Math.abs(m.x - px);
    // 只判断X横向距离（和NPC逻辑对齐，横版游戏够用）
    return dx <= ACTIVE_MARK_DIST;
  });
  const count = validMarks.length;

  const BYTES_PER_ENTRY = 4 * 9;
  const buf = new ArrayBuffer(4 + count * BYTES_PER_ENTRY);
  const view = new DataView(buf);
  view.setUint32(0, count, true);

  for (let i = 0; i < count; i++) {
    const m = validMarks[i];
    const off = 4 + i * BYTES_PER_ENTRY;

    view.setFloat32(off + 0, m.x ?? 0, true);
    view.setFloat32(off + 4, m.baseY ?? m.y, true); // 基准Y，固定不动，用于测距
    view.setFloat32(off + 8, m.y ?? 0, true);       // 当前浮动渲染Y
    view.setUint8(off + 12, m.locked ?? false, true);
    view.setUint8(off + 16, m.isFloatEnable ?? false, true);
    view.setFloat32(off + 20, m.speed ?? 0, true);
    view.setInt8(off + 24, m.direction ?? 1, true);
    view.setFloat32(off + 28, m.maxBaseY ?? 0, true);
    view.setFloat32(off + 32, m.minBaseY ?? 0, true);
  }

  physicsWorker.postMessage(
    {
      type: 'updateWenhao',
      buffer: buf,
      px,
      py,
      ACTIVE_MARK_DIST // 同步距离阈值给worker（可选）
    },
    [buf]
  );

  // 关键：范围外的问号直接隐藏，不用等worker返回
  floatingMarks.forEach(m => {
    // 新增：冷却锁优先级最高，上锁期间永久隐藏
    if (m.locked) {
      m.visible = false;
      return;
    }
    const dx = Math.abs(m.x - px);
    if (dx > ACTIVE_MARK_DIST) {
      m.visible = false;
    }
  });
}
// 接收 Worker 计算好的所有视图位置
physicsWorker.addEventListener('message', (e) => {
  if (e.data.type === 'viewResult') {
    const { views } = e.data;

    // 构建映射
    const viewMap = new Map();
    views.forEach(v => viewMap.set(v.id, v));

    // 更新主角
    if (activePlayer) {
      const v = viewMap.get(activePlayer.body.id);
      if (v) {
        // 人物
        activePlayer.spine.view.x = v.x;
        activePlayer.spine.view.y = v.y;

        // 气泡
        if (activePlayer.showBubble && activePlayer.speechBubble.visible) {
          activePlayer.speechBubble.position.set(v.bubbleX, v.bubbleY);
        }
      }
    }

    // 更新所有 NPC
    npcs.forEach(npc => {
      const v = viewMap.get(npc.body.id);
      if (!v) return;

      npc.spine.view.x = v.x;
      npc.spine.view.y = v.y;

      if (npc.showBubble && npc.speechBubble.visible) {
        npc.speechBubble.position.set(v.bubbleX, v.bubbleY);
      }

      if (npc.data.player !== 3) {
        npc.hpBar.view.x = v.hpX;
        npc.hpBar.view.y = v.hpY;
      }
    });
  } else if (e.data.type === 'wenhaoResult') {
    const { buffer } = e.data;
    const view = new DataView(buffer);
    const count = view.getUint32(0, true);

    for (let i = 0; i < count; i++) {
      const off = 4 + i * 36;
      const m = floatingMarks[i];
      const inRange = view.getUint8(off + 25, true) === 1;
      // locked 冷却锁优先级最高
      if (m.locked) {
        m.visible = false;
      } else {
        m.visible = inRange;
      }
      // 读取浮动渲染Y赋值给精灵y，baseY固定不变不覆盖
      m.y = view.getFloat32(off + 8, true);
      m.direction = view.getInt8(off + 24, true);
    }
  } else if (e.data.type === 'elevator:move') {
    for (const item of e.data.list) {
      // 找到对应的电梯刚体
      let targetBody = null;
      Matter.Composite.allBodies(world).forEach(b => {
        if (b.label?.elevatorId === item.id) {
          targetBody = b;
        }
      });

      if (!targetBody) return;

      // 真正移动电梯
      Matter.Body.setPosition(targetBody, {
        x: targetBody.position.x,
        y: item.y
      });

      // 同步视图
      if (targetBody.view) {
        targetBody.view.y = item.y;
      }
    }
  } else if (e.data.type === 'triggerEnter') {
    const { index } = e.data;
    const t = cachedTriggerAreas[index]; // 从缓存取
    if (!t) return;

    const label = t.label;
    const name = t.name;

    if (!triggerCooldown.get(label)) {
      triggerCooldown.set(label, true);

      if (label === 'teleportTrigger') {
        teleportByName(name);
        setTimeout(() => triggerCooldown.set(label, false), 1000);
      } else {
        setTimeout(() => triggerCooldown.set(label, false), 1000);
      }
    }
  } else if (e.data.type === 'reflectionBoundary') {
    if (isReflectionActive()) {
      setReflectionBoundary(e.data.boundary);
    }
    return
  } else if (e.data.type === 'shadowUpdate') {
    const { list } = e.data;
    list.forEach(item => {
      // 匹配玩家
      if (activePlayer && activePlayer.body.id === item.id) {
        activePlayer.shadowData = {
          x: item.x,
          y: item.y,
          scale: item.scale,
          alpha: item.alpha
        };
        activePlayer.groundFixedY = item.groundFixedY;
        return;
      }
      // 匹配NPC
      for (const npc of npcs) {
        if (npc.body.id === item.id) {
          npc.shadowData = {
            x: item.x,
            y: item.y,
            scale: item.scale,
            alpha: item.alpha
          };
          npc.groundFixedY = item.groundFixedY;
          break;
        }
      }
    });
  } else if (e.data.type === 'godray:result') {
    const filter = getGodrayFilter();
    if (!filter) return;
    filter.time = e.data.time;
    filter.center.x = e.data.screenPixelX;
    return
  }
});
// 全局锁：记录触发区域的冷却状态
const triggerCooldown = new Map();
let currentLight = null;
let isMapTransitioning = false; // 地图切换过渡锁，防止重复触发
let currentMapId = 'one01'; // 当前所在地图ID，用于存档
async function TpMap(name, tpPosition) {
  // 防止重复触发地图切换
  if (isMapTransitioning) return;
  isMapTransitioning = true;
  currentMapId = name; // 更新当前地图ID
  // ====== 黑屏状态下加载地图资源 ======
  if (!isBundleLoaded(name)) {
    await loadMapInfo(name)
  }

  // ====== 切换地图数据和玩家位置 ======
  const data = goToMap(name, activePlayer, Matter, tpPosition)
  defaultMap = data
  WORLD_WIDTH = data.realWidth;

  // ====== 更新远景背景和 Spine 动态背景（全局单例，相同则复用） ======
  updateFarBackground(data);
  updateSpineBackground(data);

  // ====== 根据地图配置自动开关滤镜 ======
  const effect = data.effects?.reflection;
  currentLight = data.lightSource;
  initOnceDayNightFilter()
  if (effect?.enable) {
    createReflectionFilter(viewport, app);
  } else {
    if (isReflectionActive()) {
      removeReflectionFilter();
    }
  }
  if (currentLight.night.enable) {
    showDayNightFilter();
  } else {
    hideDayNightFilter();
  }
  if (currentLight.show) {
    createGodrayLight(allBgContainer, app, currentLight, activePlayer);
  } else {
    removeGodrayLight();
  }

  currentGroundY = data.currentGroundY
  cachedTriggerAreas = (defaultMap.TriggerAreaArr || [])
    .filter(t => t.enableAABB)
    .map(t => ({
      x: t.x, y: t.y, w: t.w, h: t.h,
      label: t.label, enableAABB: t.enableAABB ?? false,
      name: t.name, offsetX: defaultMap.offsetX,
    }));

  // 更新视口边界
  const playerX = activePlayer.body.position.x;
  const bounds = getCurrentMapClampBounds(playerX);
  viewport.clamp({ left: bounds.left, right: bounds.right, top: -Infinity, bottom: 100 * VH });

  // ====== 等待几帧确保渲染完成 ======
  await new Promise(resolve => requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  }));

  // ====== 地图切换过渡：通知可以开始淡入新场景 ======

  // ====== 后台预加载下一张地图 ======
  afterTpMap(name);

  isMapTransitioning = false;
}
async function loadMapInfo(name = 'one01') {
  if (!isBundleLoaded(name)) {
    // 1. 先判断目标地图资源有没有加载
    user.pixi.mapLoading = true;
    // 加载目标地图资源，可传入进度回调更新加载条
    await loadMapBundle(name, (progress) => {

      user.pixi.mapLoadingProgress = progress;
    });
    user.pixi.mapLoading = false;
  }
}
// 进入地图后，后台预加载下一张地图
function afterTpMap(currentMapId) {
  const nextMapMap = {
    one01: "desert_01",
    desert_01: "huli_01",
    huli_01: "yu_01",
  };
  const nextMapId = nextMapMap[currentMapId];
  if (nextMapId && !isBundleLoaded(nextMapId)) {
    // 低优先级后台加载，不占用当前游戏性能
    loadMapBundle(nextMapId).catch(() => { });
  }
}
let dayNightInited = false;

// 初始化昼夜滤镜（仅执行一次）
function initOnceDayNightFilter() {
  if (dayNightInited) return;
  dayNightInited = true;
  createDayNightFilter(allBgContainer, app);
  setDayNightSpeed(currentLight.night.speed ?? 0.0005);
}
function gameLoop() {
  if (!activePlayer) return;
  // ✅ 新增：控制禁用时，完全跳过移动逻辑
  if (!canPlayerControl) {
    // 禁用状态下，强制保持静止
    if (activePlayer?.body) {
      Matter.Body.setVelocity(activePlayer.body, {
        x: 0,
        y: activePlayer.body.velocity.y
      });
    }
    // 只更新NPC和相机，不处理玩家输入
    for (const npc of npcs) {
      if (!npc.active) continue;
      npc.npcAIUpdate(activePlayer);
    }
    cameraTarget.position.set(
      activePlayer.body.position.x + cameraOffsetX.value * VW,
      activePlayer.body.position.y
    );
    return; // 直接返回，不执行下面的玩家移动逻辑
  }
  const tempSpeed = 0.22 * VW;
  // ✅ 修复：键盘 + 摇杆 双输入
  const left = (joystick?.x < -20) || joystick?.keyLeft;
  const right = (joystick?.x > 20) || joystick?.keyRight;

  if (left) {
    Matter.Body.setVelocity(activePlayer.body, { x: -tempSpeed, y: activePlayer.body.velocity.y });
  } else if (right) {
    Matter.Body.setVelocity(activePlayer.body, { x: tempSpeed, y: activePlayer.body.velocity.y });
  }

  let vx = 0;
  if (left) vx = -activePlayer.speed;
  else if (right) vx = activePlayer.speed;
  else if (activePlayer.isDashing) {
    vx = activePlayer.spine.direction === 1 ? activePlayer.speed : -activePlayer.speed;
  }

  const absVX = Math.abs(vx);
  activePlayer.updateMotion(vx, activePlayer.isOnGround, absVX, activePlayer.body.velocity.y);

  for (const npc of npcs) {
    if (!npc.active) continue;
    npc.npcAIUpdate(activePlayer);
  }

  cameraTarget.position.set(
    activePlayer.body.position.x + cameraOffsetX.value * VW,
    activePlayer.body.position.y   // 镜头也跟随电梯
  );

  const playerX = activePlayer.body.position.x;
  const bounds = getCurrentMapClampBounds(playerX);
  viewport.clamp({ left: bounds.left, right: bounds.right, top: -Infinity, bottom: 100 * VH });
  //电梯
  physicsWorker.postMessage({ type: "elevator:updateAll" });
}
function vnZanting() {
  emitter.off("vnZanting");
  emitter.on("vnZanting", () => {
    if (!runner) runner = Matter.Runner.create();
    user.pixi.isPaused = !user.pixi.isPaused;
    if (user.pixi.isPaused) {
      app.ticker.stop();
      Matter.Runner.stop(runner);
    } else app.ticker.start();
  });
}

function destroyRectsByIndex(index) {
  const list = wuti.get(index);
  if (!list) return;
  for (let i = 0; i < list.length; i++) rectPool.release(list[i]);
  wuti.delete(index);
}

function npcConfigUpdated() {
  emitter.off("npcConfigUpdated");
  emitter.on('npcConfigUpdated', (newList = []) => {
    if (!world || !viewport || !playerPool) return;

    updateNPCPool(newList, playerPool, WORLD_WIDTH, VH, Matter, world, app, currentGroundY, defaultMap.TopMap)

    syncAllNPC(newList, Matter, viewport, currentGroundY); // 正常保留
    if (user.pixi.activePlayer) playerUpdate(Matter, activePlayer, viewport);
  });
}
// 🎮 禁用玩家所有移动/跳跃（战斗开始时调用）
function disablePlayerControl() {
  if (!canPlayerControl) return; // 已经禁用直接返回，避免重复执行
  canPlayerControl = false;
  user.pixi.activePlayer = {
    hp: activePlayer.data.data.hp,
    maxHp: activePlayer.data.data.maxHp,
    x: activePlayer.body.position.x,
    y: activePlayer.body.position.y,
    speed: activePlayer.speed,
    juese: activePlayer.data.juese
  };
  user.pixi.app = markRaw(worldContainer)
  const npcData = npcs.filter((item) => item.data.mapId === "desert_02");
  user.pixi.npcInstance = markRaw(npcData)

  showAllEnemyHpBar()
  if (activePlayer?.body) {
    Matter.Body.setVelocity(activePlayer.body, {
      x: 0,  // 水平速度直接清零
      y: activePlayer.body.velocity.y // 垂直速度保留（比如正在跳跃就自然下落）
    });
    // 如果需要连跳跃也立刻中断，y也清零：y: 0
  }
  if (activePlayer?.spine) {
    activePlayer.spine.playIdle();
    // 强制更新一次运动状态，确保动画生效
    activePlayer.updateMotion(0, activePlayer.isOnGround, 0, 0);
  }
  playerInput.value = {
    left: false,
    right: false,
    jump: false
  };
}
// 🎮 恢复玩家所有移动/跳跃（战斗结束时调用）
function enablePlayerControl() {
  emitter.off("enablePlayerControl");
  emitter.on('enablePlayerControl', async (i) => {
    if (canPlayerControl) return;
    if (i !== 1) {
      createOldFilmFilter(app, viewport);
    }
    // 2. 入场：暗角从 1 消失到 0（战斗场景渐显）

    canPlayerControl = true;
    user.pixi.fight = false;
    user.pixi.gameUi = false

    // ✅ 【关键】恢复时强制清空所有输入状态，彻底解决残留
    if (joystick) {
      joystick.keyLeft = false;
      joystick.keyRight = false;
      joystick.x = 0; // 摇杆也强制归位
    }
    playerInput.value = {
      left: false,
      right: false,
      jump: false
    };

    // ✅ 强制清零玩家速度，防止恢复瞬间还有惯性
    if (activePlayer?.body) {
      Matter.Body.setVelocity(activePlayer.body, { x: 0, y: activePlayer.body.velocity.y });
    }

    // ✅ 立刻给Worker发一次静止输入，确保Worker那边也彻底清空
    physicsWorker.postMessage({
      type: "input",
      data: { left: false, right: false, jump: false },
      VW: VW
    });
    hideAllEnemyHpBar()
    removeNPCsByMapId("desert_02", Matter, world, app);
    user.pixi.activePlayer = null
    if (i !== 1) {
      const map = user.pixi.mapDataList.find(m => m.id === "one01");
      WORLD_WIDTH = map.realWidth;
      const tpPosition = map.offsetX + WORLD_WIDTH * 0.97
      await TpMap("one01", tpPosition);
      // 🔥 战斗结束后自动存档
      if (activePlayer) {
        user.autoSave(getSaveData());
        console.log('[自动存档] 战斗结束，已自动存档');
      }
    }
  });
}
onBeforeUnmount(() => {
  // 停止自动存档定时器
  stopAutoSaveTimer();
  app.ticker.stop();
  Matter.Runner.stop(runner);
  Matter.World.clear(world, false);
  Matter.Engine.clear(engine);
  Matter.Events.off(engine, "collisionStart");
  Matter.Events.off(engine, "collisionEnd");
  npcs.forEach(npc => npc.deactivate?.())
  npcs.length = 0
  npcPool.length = 0
  floatingMarks.length = 0
  destroyDayNightFilter();
  if (isReflectionActive()) removeReflectionFilter()
  if (isGodrayActive()) removeGodrayLight()
  app.destroy(true, { children: true });
  // 销毁Worker释放线程
  physicsWorker.terminate();
  destroyDayNightFilter();
});
</script>

<style scoped>
:deep(.el-dialog__header) {
  padding-bottom: 0;
}

:deep(.el-overlay-dialog) {
  bottom: auto;
}

:deep(.el-drawer__body) {
  padding: 0;
}
</style>