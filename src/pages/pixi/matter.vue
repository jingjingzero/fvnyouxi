  <template>
    <div v-loading="isPageLoading" element-loading-text="游戏加载中..." element-loading-background="#000"
      class="w-screen h-screen overflow-hidden">
      <!-- 对话 -->
      <!-- <div v-show="user.pixi.duihua" class="absolute z-999">
      <duihua />
    </div> -->
      <div v-if="user.pixi.setting === 1" class="absolute left-0 w-full h-full z-5 ">
        <infoMap />
        <!-- <Ipad /> -->
      </div>
      <kapai v-if="user.pixi.fight" class="absolute!" @fight-end="enablePlayerControl" />
      <div ref="gameContainer" class="w-screen h-screen overflow-hidden relative">
        <!-- 菜单 -->
        <div
          class="absolute right-7vh top-5vh w-[13vh] h-[6vh] rounded-3 bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-4vh select-none"
          v-show="!user.pixi.fight && !isPageLoading" @click="ceshi5">
          <el-popover v-if="user.pixi.setting === 0" placement="left-start" :visible="user.pixi.isPaused" :width="200"
            trigger="click" popper-class="mr-1.5vh w-15vw! min-w-15vw!">
            <template #reference>
              <span class="text-3vh iconfont2">菜单</span>
            </template>
            <div class="text-1.4vw flex flex-col items-center iconfont2 text-#333 gap-y-1.3vh py-0.5vh">
              <div @click="tanchuang(0)" class="w-full h-full text-center">
                人物信息
              </div>
              <el-divider style="margin: 0" />
              <div @click="tanchuang(1)" class="w-full h-full text-center">
                管理员权限
              </div>
              <div @click="tanchuang(4)" class="w-full h-full text-center">
                任务
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
        </div>


        <el-dialog v-model="dialogTableVisible" width="75vw" :show-close="false" @close="ceshi5" top="4vh">
          <xinxi class="overflow-hidden" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible1" width="75vw" :show-close="false" @close="ceshi5" top="4vh">
          <task class="overflow-hidden" />
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
import { getMapData, getAllMapIds } from "./player/map";

import { loadAssets, loadMapBundle, unloadMapBundle, isBundleLoaded } from "../../components/loadAssets";
import infoMap from "./info/index.vue";
import router from "@/router";
import { BgWall, createWallObject, createPool, createSpeechBubble, loadMapData } from './matter1/bg.js';
import { createPlayerPhysicsBody, applyDamageFilter, updatePlayerAnimation, updatePlayerDirection, createHpBar } from './matter1/playerCreate.js';
import { wenhaoHudong, floatingMarks } from './matter1/daoju.js';
import { savePlayerPosition, teleportBack, removeNPCsByMapId, playerUpdate, updateNPCPool, hideAllEnemyHpBar, fightMode, showAllEnemyHpBar, npcs, npcPool, syncAllNPC, cameraOffsetX, goToMap, npcManager } from './matter1/npcManager.js';
import { setupCollisionStart, setupCollisionEnd, allElevators } from './matter1/collisionEvents.js';
import { shakeViewport } from "./matter1/myFilter.js";
import { initGameUI, updateGameUI, getJoystick } from "./matter1/gameUI.js";
import {
  createOldFilmFilter, destroyDayNightFilter, setDayNightSpeed, hideDayNightFilter, showDayNightFilter, isNight, isDay, getNightFactor, isDayNightActive, getDayTime, setDayTime, getDayNightSpeed, updateDayNightCalc, createDayNightFilter, getCurrentBoundary,
  getReflectionFilter, createReflectionFilter, removeReflectionFilter, setReflectionBoundary, isReflectionActive, createGodrayLight, removeGodrayLight, isGodrayActive, getGodrayFilter, getOldFilmFilter, removeOldFilmFilter
} from "./matter1/filters.js";
import kapai from "./fight/index.vue"
import { fightQidong } from "./matter1/fightKaiqi.js"
import { DAMAGE_COLOR_MAP, BUFF_COLOR_MAP } from './matter1/buff.js'
import createEnemiesData from './matter1/enemiesData.js';
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

let app;
let worldContainer;
let engine;
let runner;
let playerPool;
let activePlayer;
let world;

const dialogTableVisible = ref(null);
const dialogTableVisible1 = ref(null);
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
    router.push({ name: "index" });
    return;
  }
  user.pixi.setting = i;
  if (i === 2) {
    user.pixi.setting = 0
    emitter.emit("vnZanting");
    guodu()
  } else if (i === 0) dialogTableVisible.value = true;
  else if (i === 4) dialogTableVisible1.value = true;
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

    takeDamage(damage = 1, options = {}, playerAttack = 1) {
      if (!this.active) return
      const { type = 'normal', isCritical = false } = options;

      this.data.data.hp -= damage

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
      damageText.x = this.view.x + (Math.random() - 0.5) * (finalFontSize * 1.2);
      damageText.y = this.view.y - this.view.height / 2 - vh(0.5);
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
        .call(() => damageText.destroy({ children: true }), null, '>');
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

const PARALLAX = 0.2;
function onViewportMoved() {
  bgContainer.x = viewport.left * (1 - PARALLAX);
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

  // 1. 先加载初始地图资源
  await loadMapInfo('one01')

  // 2. 创建 Pixi 应用
  app = await createApp(gameContainer.value);
  gameContainer.value.appendChild(app.canvas);
  bgContainer = new Container();
  worldContainer = new Container();
  cameraTarget = new Container();
  hudMarkContainer = new Container();
  hudMarkContainer.zIndex = 9999;

  // 3. 配置RenderGroup分层合批
  bgContainer.group = new RenderGroup({
    priority: 0,
    isStatic: true,
    sortableChildren: false,
  })
  worldContainer.group = new RenderGroup({
    priority: 1,
    isStatic: false,
    sortableChildren: true,
  })
  hudMarkContainer.group = new RenderGroup({
    priority: 2,
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
  viewport.setZoom(1.4);
  engine = createEngine();
  world = engine.world;
  engine.gravity.y = 0.8;

  app.stage.addChild(viewport);
  viewport.addChild(bgContainer);
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
  await TpMap("one01");
  console.log('user.pixi.npcDataList=',user.pixi.npcDataList);
  
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

  // 15. 后台预加载其他地图
  afterTpMap('one01');

  // 16. 隐藏loading，显示游戏
  isPageLoading.value = false;
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
  console.log('user.pixi.npcDataList=', user.pixi.npcDataList);

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
function guodu() {
  // 进入战斗：先变黑，加载完所有资源再变白
  jinruzhandou();
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
  console.log('enemyData=', enemyData);

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
async function TpMap(name, tpPosition) {
  // 防止重复触发地图切换
  if (isMapTransitioning) return;
  isMapTransitioning = true;

  // ====== 地图切换过渡：先变黑 ======
  const transition = createOldFilmFilter(app, viewport, {
    startDelay: 0,
    fadeInDuration: 0.4,
    fullBlackDuration: 0.5, // 完全黑屏时长，可按需调整
    fadeOutDuration: 0.5,
    autoFadeOut: false
  });
  // 等待完全黑屏后再加载地图

  // ====== 黑屏状态下加载地图资源 ======
  if (!isBundleLoaded(name)) {
    await loadMapInfo(name)
  }

  // ====== 切换地图数据和玩家位置 ======
  const data = goToMap(name, activePlayer, Matter, tpPosition)
  defaultMap = data
  WORLD_WIDTH = data.realWidth;

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
    createGodrayLight(bgContainer, app, currentLight, activePlayer);
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
  createDayNightFilter(bgContainer, app);
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
  const tempSpeed = 0.2 * VW;
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
  emitter.on('enablePlayerControl', async () => {
    if (canPlayerControl) return;

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
    const map = user.pixi.mapDataList.find(m => m.id === "one01");
    WORLD_WIDTH = map.realWidth;
    const tpPosition = map.offsetX + WORLD_WIDTH * 0.97
    await TpMap("one01", tpPosition);
  });
}
onBeforeUnmount(() => {
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
</style>