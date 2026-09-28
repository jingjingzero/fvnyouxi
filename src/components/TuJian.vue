<template>
  <teleport to="body">
    <div
      class="tujian-mask fixed inset-0 z-9999 flex items-center justify-center bg-black/55 backdrop-blur-[3px]"
      @click.self="close"
    >
      <!-- 📖 书籍图鉴（全部用 unocss，宽高以 vw/vh 为单位，移动端/PC 显示比例一致） -->
      <div
        class="tujian-book relative w-92vw h-90vh
          bg-[linear-gradient(90deg,rgba(0,0,0,0.06)_0%,transparent_5%,transparent_95%,rgba(0,0,0,0.06)_100%),linear-gradient(160deg,#f9efd8_0%,#f3e3c0_45%,#e9d3a4_100%)]
          border-[0.6vh] border-solid border-[#8b5a2b] rounded-[1.8vh]
          shadow-[0_2.4vh_6vh_rgba(0,0,0,0.45),inset_0_0_6vh_rgba(139,90,43,0.18)]
          p-[2.6vh_3.4vw_2.6vh_7vw] overflow-hidden
          before:content-[''] before:absolute before:left-[6vw] before:top-0 before:bottom-0 before:w-[0.5vw]
          before:bg-[linear-gradient(180deg,rgba(139,90,43,0.35),rgba(139,90,43,0.12),rgba(139,90,43,0.35))]
          before:rounded-[0.4vw]"
      >
        <!-- 左侧三个书签：精灵 / 魔物 / 成就 -->
        <div class="bookmarks absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-[1.6vh] z-3">
          <div
            class="bookmark bookmark-jingling w-3vw p-[1.6vh_0.4vw] rounded-l-[1.2vh] text-white text-[min(3.4vw,16px)] font-bold text-center cursor-pointer
              shadow-[0_0.4vh_1vh_rgba(0,0,0,0.3)] transition-all duration-200 tracking-[0.2vw]
              [writing-mode:vertical-rl] [text-orientation:upright] hover:brightness-110
              bg-[linear-gradient(180deg,#e8b64c,#c98f1f)]"
            :class="tab === 'jingling' ? 'translate-x-[1vw] brightness-115' : ''"
            :style="isEn ? enBookStyle : undefined"
            @click="switchTab('jingling')"
          >{{ L('tujianSpirits') }}</div>
          <div
            class="bookmark bookmark-monster w-3vw p-[1.6vh_0.4vw] rounded-l-[1.2vh] text-white text-[min(3.4vw,16px)] font-bold text-center cursor-pointer
              shadow-[0_0.4vh_1vh_rgba(0,0,0,0.3)] transition-all duration-200 tracking-[0.2vw]
              [writing-mode:vertical-rl] [text-orientation:upright] hover:brightness-110
              bg-[linear-gradient(180deg,#9b6dd8,#6f3fb8)]"
            :class="tab === 'monster' ? 'translate-x-[1vw] brightness-115' : ''"
            :style="isEn ? enBookStyle : undefined"
            @click="switchTab('monster')"
          >{{ L('tujianMonsters') }}</div>
          <div
            class="bookmark bookmark-achievement w-3vw p-[1.6vh_0.4vw] rounded-l-[1.2vh] text-white text-[min(3.4vw,16px)] font-bold text-center cursor-pointer
              shadow-[0_0.4vh_1vh_rgba(0,0,0,0.3)] transition-all duration-200 tracking-[0.2vw]
              [writing-mode:vertical-rl] [text-orientation:upright] hover:brightness-110
              bg-[linear-gradient(180deg,#e0563d,#a5281b)]"
            :class="tab === 'achievement' ? 'translate-x-[1vw] brightness-115' : ''"
            :style="isEn ? enBookStyle : undefined"
            @click="switchTab('achievement')"
          >{{ L('tujianAchievements') }}</div>
        </div>

        <!-- 关闭按钮 -->
        <div
          class="book-close absolute top-[1.4vh] right-[1.8vw] w-[3.4vh] h-[3.4vh] rounded-full bg-[rgba(139,90,43,0.18)]
            text-[#6b4423] text-[1.6vh] flex items-center justify-center cursor-pointer
            transition-all duration-200 hover:bg-[rgba(139,90,43,0.38)] z-4"
          @click="close"
        >✕</div>

        <!-- ===== 相册视图（v-show 保留 DOM，返回时不重置滚动条位置） ===== -->
        <div v-show="!current" class="album h-full flex flex-col">
          <h2 class="book-title mb-[1.8vh] text-[min(4.6vw,24px)] text-[#5b3a1e] tracking-[0.3vw] [text-shadow:0_0.1vh_0_rgba(255,255,255,0.6)]">
            {{ albumTitle }}
          </h2>

          <!-- 🏆 成就页（图鉴第三页签）→ 复用公共成就面板（theme=book 羊皮纸风） -->
          <AchievementPanel v-if="tab === 'achievement'" ref="achPanelRef" theme="book" class="flex-1 min-h-0" />

          <!-- 角色相册 -->
          <div
            v-else
            class="album-grid flex-1 grid grid-cols-[repeat(auto-fill,minmax(14vw,1fr))] gap-[1.8vh_1.6vw] overflow-y-auto p-[0.6vh_0.6vw_1.6vh]"
          >
            <div
              v-for="item in list"
              :key="item.id"
              class="photo flex flex-col items-center cursor-pointer transition-all duration-200 hover:-translate-y-[0.6vh] hover:scale-[1.04]"
              @click="openDetail(item)"
            >
              <div
                class="photo-frame w-full aspect-square bg-white border-2 border-solid border-[#c9a86a] rounded-[1vw]
                  shadow-[0_0.5vh_1.2vh_rgba(0,0,0,0.28)] overflow-hidden flex items-center justify-center relative"
              >
                <img v-if="tab === 'monster' && thumbs[item.id]" :src="thumbs[item.id]" class="w-full h-full object-contain" alt="" />
                <img v-else-if="item.head && headUrl(item)" :src="headUrl(item)" class="w-full h-full object-contain" @error="onHeadError(item)" alt="" />
                <div v-else class="photo-loading text-[#a08456] text-[min(3vw,13px)]">{{ L('generating') }}</div>
              </div>
              <div class="photo-name mt-[1vh] text-[#5b3a1e] text-[min(3.2vw,15px)] font-semibold tracking-[0.1vw]">{{ tr(item.name) }}</div>
            </div>
          </div>
        </div>

        <!-- ===== 详情视图（Q版 spine 可动角色 / 头像立绘） ===== -->
        <div v-show="current" class="detail h-full flex items-center gap-[2.4vw]">
          <div
            class="detail-left relative flex-1 h-full min-w-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.55),rgba(233,211,164,0.25))]
              rounded-[1.4vw] flex items-center justify-center overflow-hidden"
          >
            <div ref="detailCanvasRef" class="detail-canvas w-full h-full [&_canvas]:block"></div>
            <!-- 🎭 视图切换：Q版 / 立绘（仅该角色有头像立绘时显示） -->
            <div
              v-if="hasLihui(current)"
              class="view-switch absolute bottom-[1.8vh] left-1/2 -translate-x-1/2 z-2 flex items-center gap-[0.4vw]
                bg-[rgba(60,38,16,0.62)] border border-solid border-[#d9b56a] rounded-full
                p-[0.5vh_0.6vw] shadow-[0_0.5vh_1.2vh_rgba(0,0,0,0.35)] backdrop-blur-[3px]"
            >
              <button
                v-if="current?.juese"
                class="px-[1.5vw] py-[0.8vh] rounded-full text-[min(3vw,14px)] font-bold cursor-pointer transition-all duration-200"
                :class="viewMode === 'q'
                  ? 'bg-[linear-gradient(180deg,#e8b64c,#c98f1f)] text-white shadow-[0_0.3vh_0.8vh_rgba(0,0,0,0.35)]'
                  : 'text-[#f0dcae] hover:bg-[rgba(255,255,255,0.12)]'"
                @click="switchView('q')"
              >{{ L('chibi') }}</button>
              <button
                class="px-[1.5vw] py-[0.8vh] rounded-full text-[min(3vw,14px)] font-bold cursor-pointer transition-all duration-200"
                :class="viewMode === 'lihui'
                  ? 'bg-[linear-gradient(180deg,#e8b64c,#c98f1f)] text-white shadow-[0_0.3vh_0.8vh_rgba(0,0,0,0.35)]'
                  : 'text-[#f0dcae] hover:bg-[rgba(255,255,255,0.12)]'"
                @click="switchView('lihui')"
              >{{ L('portrait') }}</button>
            </div>
          </div>
          <div class="detail-right w-28vw flex-shrink-0 flex flex-col gap-[1.4vh]">
            <h2 class="detail-name text-[min(5.5vw,28px)] text-[#4a2e12] tracking-[0.2vw]">{{ tr(current?.name) }}</h2>
            <!-- 🎨 立绘表情皮肤选择（仅立绘视图且该立绘有多个皮肤时显示） -->
            <div v-if="viewMode === 'lihui' && lihuiSkins.length > 1" class="lihui-skins flex flex-col min-h-0">
              <div class="skin-title mb-[0.8vh] text-[min(2.8vw,13px)] text-[#8a6334] tracking-[0.15vw] font-semibold">{{ L('expression') }}</div>
              <div class="skin-list flex flex-col gap-[0.8vh] overflow-y-auto max-h-[32vh] pr-[0.4vw]">
                <button
                  v-for="s in lihuiSkins"
                  :key="s.key"
                  class="flex-shrink-0 px-[1vw] py-[0.6vh] rounded-full text-center text-[min(2.7vw,12px)] cursor-pointer
                    border border-solid transition-all duration-200"
                  :class="lihuiSkin === s.key
                    ? 'bg-[linear-gradient(180deg,#e8b64c,#c98f1f)] text-white border-[#a8772f] shadow-[0_0.3vh_0.7vh_rgba(0,0,0,0.25)]'
                    : 'bg-white/60 text-[#6f5230] border-[#d8b882] hover:bg-[#f3e0b8]'"
                  @click="selectLihuiSkin(s.key)"
                >{{ skinLabel(s.key) }}</button>
              </div>
            </div>
            <!-- <p class="detail-desc text-[min(3.2vw,15px)] leading-[1.7] text-[#6f5230]">{{ current?.desc || '暂无介绍' }}</p>
            <div
              class="detail-meta text-[min(2.8vw,13px)] text-[#93713f] bg-[rgba(139,90,43,0.1)] p-[0.8vh_1.2vw] rounded-[0.8vw] break-all"
            >
              骨骼：{{ current?.juese }}<template v-if="current?.skin"> · 皮肤：{{ current?.skin }}</template>
              <template v-if="current?.anim"> · 待机：{{ current?.anim }}</template>
              <template v-if="current?.animSpeed !== undefined"> · 速度：{{ current?.animSpeed }}x</template>
            </div> -->
            <!-- 🎬 魔物动画播放按钮（仅 Q版 视图显示） -->
            <div v-if="tab === 'monster' && viewMode === 'q' && animList.length" class="anim-btns flex flex-wrap gap-[0.6vw]">
              <button
                v-for="an in animList"
                :key="an"
                class="px-[1.2vw] py-[0.6vh] rounded-full text-[min(2.6vw,12px)] font-bold cursor-pointer border border-solid transition-all duration-200"
                :class="playingAnim === an
                  ? 'bg-[linear-gradient(180deg,#e8b64c,#c98f1f)] text-white border-[#a8772f]'
                  : 'bg-white/60 text-[#6f5230] border-[#d8b882] hover:bg-[#f3e0b8]'"
                @click="playAnimOnce(an)"
              >{{ animLabel(an) }}</button>
            </div>
            <button
              class="detail-back self-start mt-[0.8vh] p-[1vh_2.2vw] border-none rounded-[1vw]
                bg-[linear-gradient(180deg,#e8b64c,#c98f1f)] text-white text-[min(3.2vw,15px)] font-bold cursor-pointer
                shadow-[0_0.4vh_1vh_rgba(0,0,0,0.25)] transition-all duration-200 hover:brightness-110"
              @click="closeDetail"
            >{{ L('backToAlbum') }}</button>
          </div>
        </div>
      </div>

    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Application, Assets } from "pixi.js";
import { Spine, Skin } from "@esotericsoftware/spine-pixi-v8";
import { useCounterStore } from "@/store/counter";
import { tr, t as i18nT, getLang } from "@/i18n";
import AchievementPanel from "./AchievementPanel.vue";

const emit = defineEmits(["close"]);
const user = useCounterStore();

// 🌐 语言切换刷新（词条 UI + 皮肤标签）
const langVersion = ref(0);
function L(key) { langVersion.value; return i18nT(key); }
window.addEventListener("fvnyouxi-lang-changed", () => langVersion.value++);
// 书签样式适配：中文竖排（短），英文单词横排（避免竖排拉太长）
const isEn = computed(() => { langVersion.value; return getLang() === 'en'; });
const enBookStyle = { writingMode: 'horizontal-tb', width: 'auto', minWidth: '8vw', padding: '1vh 1.4vw', borderRadius: '0.9vh', fontSize: 'min(2.4vw,12px)' };

const tab = ref("jingling");          // 当前书签：jingling / monster / achievement
const current = ref(null);            // 当前查看的图鉴条目（null=相册视图）
const thumbs = reactive({});          // 无头像图的条目：spine 截图 dataURL
const detailCanvasRef = ref(null);    // 详情 spine 容器
const achPanelRef = ref(null);        // 🏆 公共成就面板（切换页签/关闭时同步关闭其详情弹窗）
const viewMode = ref("q");            // 详情视图：q=Q版立绘 / lihui=头像立绘
const lihuiSkin = ref("default");     // 立绘当前皮肤名
const lihuiSkins = ref([]);           // 立绘可选皮肤列表 [{ key, label }]
const animList = ref([]);               // 魔物详情：可选动画名列表（不含 idle）
const playingAnim = ref("");           // 当前正在播放的动画名

// 🎬 魔物动画名 → 中文显示（图鉴播放按钮，未映射的保持原名）
const ANIM_NAME_MAP = {
  attack: '攻击',
  ruchang: '入场',
  jineng: '技能',
  shoushang: '受伤',
};
function animLabel(name) {
  return ANIM_NAME_MAP[name] || name;
}
let detailApp = null;                 // 详情 App（每次打开详情创建，关闭销毁）
let detailSpine = null;
let captureApp = null;                // ⚠️ 缩略图截图 App 全局复用同一个！
//   原因：每个角色新建一个 Application 会创建/销毁大量 WebGL 上下文，
//   浏览器会回收「最老」的上下文（很可能就是主页 qidong 的画布），
//   导致关掉图鉴后主页 spine 不再显示。复用一个 App 只增加 1 个上下文。
let destroyed = false;

const list = computed(() => user.tujian?.[tab.value] || []);

/** 相册标题（含成就页签） */
const albumTitle = computed(() =>
  tab.value === "jingling" ? L('tujianSpirits') : tab.value === "monster" ? L('tujianMonsters') : L('tujianAchievements')
);

/** 精灵/主角有现成头像图 → 直接用图片 */
function headUrl(item) {
  if (!item.head) return "";
  try {
    return new URL(`../assets/fullBody/head/${item.head}.webp`, import.meta.url).href;
  } catch (e) {
    return "";
  }
}

// ==================== 头像立绘（lihui 资源） ====================
// 已注册的立绘头像骨骼基名（loadAssets 里 ${base}head_skel / ${base}head_atlas）
const HEAD_SPINE_BASES = ["jinmao", "yu", "huli", "maomi", "heimi", "fengxi", "zhujue", "jingling", "shangren1", "shangren2"];

/** 立绘骨骼基名（配置 lihui 优先，回退用 head；没有则无立绘） */
function lihuiBase(item) {
  if (!item) return "";
  return item.lihui || item.head || "";
}

/** 该角色是否拥有头像立绘资源 */
function hasLihui(item) {
  if (!item) return false;
  const base = lihuiBase(item);
  return !!base && HEAD_SPINE_BASES.includes(base);
}

/** 立绘皮肤名 → 标签（表情皮肤多为拼音，映射成友好名字；en 模式用英文标签） */
const SKIN_LABELS_CN = {
  default: "默认", moren: "默认形象",
  buman: "不满", daxiao: "大笑", nanguo: "难过", pingjing: "平静", shengqi: "生气", xiee: "邪恶", zhenjing: "震惊",
  duoshan: "躲闪", haixiu: "害羞", jiaoxia: "狡黠", jingti: "警惕", zhayan: "眨眼", weixiao: "微笑",
  biyanbx: "闭眼", biyanwx: "闭眼", buganxin: "不甘心", jingya: "惊讶", kuqi: "哭泣", lianhong: "脸红",
  sikao: "思考", tanqi: "叹气", tushe: "吐舌", xiong: "凶", yunong: "愚弄", yunongdaxiao: "大笑",
  fennu: "愤怒", shenshi: "绅士", jinzhang: "紧张", shangxin: "伤心", tiaopi: "调皮", xieshi: "邪视",
  biyan: "闭眼", renzhen: "认真", taohao: "讨好",
};
const SKIN_LABELS_EN = {
  default: "Default", moren: "Default",
  buman: "Displeased", daxiao: "Laughing", nanguo: "Sad", pingjing: "Calm", shengqi: "Angry", xiee: "Evil", zhenjing: "Shocked",
  duoshan: "Dodging", haixiu: "Shy", jiaoxia: "Sly", jingti: "Wary", zhayan: "Blink", weixiao: "Smile",
  biyanbx: "Eyes Closed", biyanwx: "Eyes Closed", buganxin: "Reluctant", jingya: "Surprised", kuqi: "Crying", lianhong: "Blushing",
  sikao: "Thinking", tanqi: "Sigh", tushe: "Tongue Out", xiong: "Fierce", yunong: "Teasing", yunongdaxiao: "Laughing Hard",
  fennu: "Furious", shenshi: "Gentleman", jinzhang: "Nervous", shangxin: "Heartbroken", tiaopi: "Playful", xieshi: "Wicked Look",
  biyan: "Eyes Closed", renzhen: "Serious", taohao: "Pleading",
};

/** 皮肤名转标签：命中映射用当前语言，带数字后缀的变体追加序号 */
function skinLabel(key) {
  langVersion.value; // 依赖语言切换刷新
  const LABELS = getLang() === 'en' ? SKIN_LABELS_EN : SKIN_LABELS_CN;
  if (LABELS[key]) return LABELS[key];
  const m = key.match(/^(.*?)(\d+)$/);
  if (m) {
    const base = LABELS[m[1]] || m[1];
    return `${base}·${m[2]}`;
  }
  return key;
}

/** 确保资源已加载（已缓存直接通过，否则动态加载） */
async function ensureAssets(aliases) {
  const need = aliases.filter(n => !Assets.cache.has(n));
  if (!need.length) return true;
  try {
    await Assets.load(need);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 应用立绘皮肤：与对话端一致，直接单皮肤切换（不叠加 default），
 * 避免 default 里未覆盖的槽位残留（如感激2 皮肤未覆盖眉毛时不再显示 default 的眉毛）。
 */
function applyLihuiSkin(spine, name) {
  try {
    const data = spine.skeleton?.data;
    if (!data) return;
    const skins = data.skins || [];
    const skin = skins.find(s => s.name === name) || skins.find(s => s.name === "default") || skins[0];
    if (!skin) return;
    spine.skeleton.setSkin(skin);
    spine.skeleton.setupPoseSlots?.();
  } catch (e) { /* 皮肤不存在则用默认 */ }
}

/** 播放立绘待机动画（立绘骨骼通常只有 animation 一条） */
function playHeadAnim(spine) {
  try {
    spine.state.timeScale = 1;
    const anims = spine.skeleton?.data?.animations || [];
    const has = n => anims.some(a => a.name === n);
    const base = has("animation") ? "animation" : (anims[0]?.name || null);
    if (base) spine.state.setAnimation(0, base, true);
  } catch (e) { /* 忽略 */ }
}

/**
 * 按包围盒把 spine 居中缩放进容器（带 bounds 就绪重试）。
 * 🖼️ 就绪前保持隐藏（配合 renderX 同步适配失败时先隐藏），
 * 防止首帧以原始大尺寸绘制后再跳变到适配尺寸造成“变小/瞬移”；就绪后播放入场过渡。
 */
function fitLoop(spine, box) {
  const w = box?.clientWidth || 400;
  const h = box?.clientHeight || 500;
  let tries = 0;
  const retry = () => {
    if (!spine || destroyed || detailSpine !== spine) return;
    spine.update(0.05);
    if (spine._entered) { spine.visible = true; return; } // 入场动画进行中/已完成，不再重复适配
    if (fitSpine(spine, w, h)) {
      spine._entered = true;
      entranceIn(spine, w, h);
      return;
    }
    if (tries++ < 20) requestAnimationFrame(retry);
    else {
      // 兜底：温和默认缩放 + 居中
      spine.scale.set(Math.min(w, h) / 500);
      spine.x = w / 2;
      spine.y = h / 2;
      spine.visible = true;
    }
  };
  requestAnimationFrame(retry);
}

function switchTab(t) {
  tab.value = t;
  closeDetail();
  achPanelRef.value?.closeDetail();
}

/** 头像图加载失败（文件不存在）→ 回退用 spine 截图 */
function onHeadError(item) {
  if (!thumbs[item.id]) captureThumb(item);
}

// ==================== Spine 通用工具 ====================

/** 计算 spine 实际内容包围盒（不依赖渲染，基于骨骼槽位附件） */
function getContentBounds(spine) {
  const skeleton = spine.skeleton;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;
  try {
    for (const slot of skeleton.slots) {
      if (!slot.bone.active) continue;
      const attachment = slot.attachment;
      if (!attachment) continue;
      if (typeof attachment.width === "number" && typeof attachment.height === "number") {
        const bone = slot.bone;
        const w = attachment.width * Math.abs(bone.scaleX);
        const h = attachment.height * Math.abs(bone.scaleY);
        const cx = bone.worldX + attachment.x * bone.scaleX;
        const cy = bone.worldY + attachment.y * bone.scaleY;
        minX = Math.min(minX, cx - w / 2);
        minY = Math.min(minY, cy - h / 2);
        maxX = Math.max(maxX, cx + w / 2);
        maxY = Math.max(maxY, cy + h / 2);
        found = true;
      }
    }
  } catch (e) { /* 忽略 */ }
  if (!found || minX === Infinity) {
    try { return spine.getBounds(); } catch (e) { return { x: 0, y: 0, width: 0, height: 0 }; }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 应用皮肤（与 spineBoy / createNPC 的 skin 参数一致） */
function applySkin(spine, skin) {
  if (!skin) return;
  try {
    const s = spine.skeleton?.data?.findSkin?.(skin);
    if (s) {
      spine.skeleton.setSkin(s);
      spine.skeleton.setupPoseSlots?.();
    }
  } catch (e) { /* 皮肤不存在则用默认 */ }
}

/**
 * 播放角色动画：与 spineBoy.js 的 setBase 一致——
 * track 0 播基础待机动画（anim，默认 'idle'，可按图鉴条目指定如 'idle1'），
 * 骨骼若有 'animation' 动画则始终叠加到 track 1（混合动画，必须叠加）。
 * @param {number} [speed] - 动画播放速度（animSpeed，默认 1，越大越快）
 */
function playBaseAnim(spine, anim = "idle", speed = 1) {
  try {
    // 🎬 动画播放速度（与 spineBoy 的 data.animSpeed 一致）
    spine.state.timeScale = speed ?? 1;
    const anims = spine.skeleton?.data?.animations || [];
    const has = n => anims.some(a => a.name === n);
    const base = has(anim) ? anim : (has("idle") ? "idle" : (anims[0]?.name || null));
    if (base) spine.state.setAnimation(0, base, true);
    // 🎵 叠加混合动画：骨骼有 'animation' 就一定叠加（与 spineBoy 相同）
    if (has("animation")) {
      spine.state.setAnimation(1, "animation", true);
    }
  } catch (e) { /* 忽略 */ }
}

/** 🎬 播放指定动画一次，播完自动切回 idle */
function playAnimOnce(name) {
  if (!detailSpine) return;
  playingAnim.value = name;
  try {
    detailSpine.state.setAnimation(0, name, false); // 不循环
    // 监听播放完成 → 切回 idle
    detailSpine.state.addListener({
      complete: (entry) => {
        if (entry.animation?.name === name) {
          playingAnim.value = "";
          detailSpine.state.setAnimation(0, "idle", true);
        }
      }
    });
  } catch (e) { playingAnim.value = ""; }
}

/** 创建 Spine（构造时直接关掉 autoUpdate，避免短暂挂到 Pixi 共享 ticker） */
function createTuJianSpine(skel, atlas) {
  return new Spine({
    skeleton: skel,
    atlas,
    allowMissingRegions: true,
    autoUpdate: false,   // 🔒 手动驱动，避免影响全局共享 ticker
  });
}

/**
 * 获取 spine 实际包围盒（含 mesh、含已应用皮肤、按当前帧实时计算）。
 * spine-pixi-v8 的 spine.bounds 基于当前骨架动态计算（update 后会置脏重算），
 * 比只数 RegionAttachment 的方式可靠——mesh 骨骼不会算小导致角色被放大裁剪。
 */
function getSpineBounds(spine) {
  try {
    const b = spine.bounds;
    if (b && b.width > 0 && b.height > 0 && b.width !== Infinity) {
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  } catch (e) { /* 忽略 */ }
  // 兜底1：RegionAttachment 附件包围盒
  const cb = getContentBounds(spine);
  if (cb.width > 0 && cb.height > 0) return cb;
  // 兜底2：Pixi 容器包围盒
  try {
    const g = spine.getBounds();
    if (g && g.width > 0 && g.height > 0) return g;
  } catch (e) { /* 忽略 */ }
  return null;
}

/** 按包围盒把 spine 居中缩放进容器（成功返回 true） */
function fitSpine(spine, w, h, maxRatio = 0.85) {
  const bounds = getSpineBounds(spine);
  if (!bounds) return false;
  const scale = Math.min((w * maxRatio) / bounds.width, (h * maxRatio) / bounds.height);
  spine.scale.set(scale);
  spine.x = w / 2 - (bounds.x + bounds.width / 2) * scale;
  spine.y = h / 2 - (bounds.y + bounds.height / 2) * scale;
  return true;
}

/** 🎬 入场过渡动画：Spine 已按最终尺寸适配，从 0.9× 缩放 + 透明平滑放大淡入到位（全程居中，无位移跳变） */
function entranceIn(spine, w, h) {
  const fs = spine.scale.x;          // 最终缩放
  const ax = (w / 2 - spine.x) / fs; // 包围盒中心锚点 X
  const ay = (h / 2 - spine.y) / fs; // 包围盒中心锚点 Y
  const from = 0.9;                  // 起始比例（相对最终缩放）
  const start = performance.now();
  const DUR = 260;                   // 过渡时长（毫秒）
  const ease = t => 1 - Math.pow(1 - t, 3); // easeOutCubic
  const step = () => {
    if (!spine || destroyed || detailSpine !== spine) return;
    const p = Math.min(1, (performance.now() - start) / DUR);
    const sc = fs * (from + (1 - from) * ease(p));
    spine.scale.set(sc);
    spine.x = w / 2 - ax * sc;
    spine.y = h / 2 - ay * sc;
    spine.alpha = Math.min(1, p * 1.5); // 前 ~65% 完成淡入
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** 适配 + 入场动画：成功返回 true；已入场（_entered）只确保可见，不重复动画 */
function fitAndEnter(spine, w, h) {
  if (!fitSpine(spine, w, h)) return false;
  if (!spine._entered) {
    spine._entered = true;
    entranceIn(spine, w, h);
  } else {
    spine.visible = true;
  }
  return true;
}

// ==================== 相册缩略图（无头像图的条目：spine 截图） ====================

async function captureThumb(item) {
  if (destroyed) return;
  // 🧭 资源选择：优先 Q 版（juese）；无 Q 版的角色（如只有立绘的商人1）回退用立绘截图
  const qSkel = item.juese ? `${item.juese}_skel` : null;
  const qAtlas = item.juese ? `${item.juese}_atlas` : null;
  const lBase = item.lihui || item.head || "";
  const useLihui = (!qSkel || !Assets.cache.has(qSkel))
    && !!lBase && HEAD_SPINE_BASES.includes(lBase)
    && Assets.cache.has(`${lBase}head_skel`) && Assets.cache.has(`${lBase}head_atlas`);
  const skel = useLihui ? `${lBase}head_skel` : qSkel;
  const atlas = useLihui ? `${lBase}head_atlas` : qAtlas;
  if (!skel || !atlas || !Assets.cache.has(skel) || !Assets.cache.has(atlas)) return;

  try {
    // 🔒 复用同一个截图 App（只创建一次，避免 WebGL 上下文堆积挤掉主页）
    if (!captureApp) {
      captureApp = new Application();
      await captureApp.init({
        width: 320,
        height: 320,
        backgroundAlpha: 0,
        antialias: false,
        resolution: 1,
        autoStart: false,
      });
    }

    const spine = createTuJianSpine(skel, atlas);
    captureApp.stage.addChild(spine);
    if (useLihui) {
      applyLihuiSkin(spine, "moren");
    } else {
      applySkin(spine, item.skin);
      playBaseAnim(spine, item.anim, item.animSpeed);
    }
    spine.update(0.05); // 推进一帧，应用姿势与皮肤

    const bounds = getSpineBounds(spine);
    if (bounds.width > 0 && bounds.height > 0) {
      fitSpine(spine, 320, 320, 0.9);
      spine.update(0.05);
      captureApp.renderer.render(captureApp.stage);
      const canvas = captureApp.renderer.extract.canvas(spine);
      thumbs[item.id] = canvas.toDataURL("image/png");
    }

    captureApp.stage.removeChild(spine);
    spine.destroy({ children: true, texture: false });
  } catch (e) {
    console.warn("[图鉴] 缩略图生成失败:", item.id, e);
  }
}

// ==================== 详情视图（Q版 spine 可动角色 / 头像立绘） ====================

async function openDetail(item) {
  closeDetail();
  current.value = item;
  // 🔄 进入详情默认视图：无 Q 版（juese 为空）且只有立绘的角色 → 默认立绘；其余默认 Q 版
  viewMode.value = (hasLihui(item) && !item.juese) ? "lihui" : "q";
  lihuiSkin.value = "moren";
  lihuiSkins.value = [];
  await nextTick();

  const box = detailCanvasRef.value;
  if (!box) return;

  try {
    detailApp = new Application();
    await detailApp.init({
      width: box.clientWidth || 400,
      height: box.clientHeight || 500,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    box.appendChild(detailApp.canvas);

    // 手动驱动动画（spine.autoUpdate = false）
    detailApp.ticker.add((delta) => {
      if (detailSpine) detailSpine.update(delta.deltaTime * (1 / 60));
    });

    await renderCurrent();
  } catch (e) {
    console.error("[图鉴] 详情 spine 初始化失败:", e);
    closeDetail();
  }
}

/** 按当前视图渲染对应 spine（先清空旧 spine，Q版 / 立绘 共用同一画布） */
async function renderCurrent() {
  if (!detailApp) return;
  if (detailSpine) {
    try {
      detailApp.stage.removeChild(detailSpine);
      detailSpine.destroy({ children: true, texture: false });
    } catch (e) { /* 忽略 */ }
    detailSpine = null;
  }
  if (viewMode.value === "lihui" && hasLihui(current.value)) {
    await renderLihuiSpine(current.value);
  } else {
    await renderQSpine(current.value);
  }
}

/** 渲染 Q 版 spine（现状：juese + skin 可动角色） */
async function renderQSpine(item) {
  if (!item) return;
  const box = detailCanvasRef.value;
  const skel = `${item.juese}_skel`;
  const atlas = `${item.juese}_atlas`;
  if (!Assets.cache.has(skel) || !Assets.cache.has(atlas)) {
    console.warn("[图鉴] 骨骼资源未加载:", skel, atlas);
    return;
  }
  // 🎬 动画速度取 enemiesData.js 的 codexAnimSpeed，没有则回退 item.animSpeed
  //    ⚠️ 必须先取完再创建 Spine：此 import 带 ?t= 时间戳会真实请求，等待期间 ticker 已在渲染；
  //    若 Spine 已上屏，会以原始大尺寸（scale=1）被绘制若干帧，产生“初始过大→复原”的瞬移。
  let animSpeed = item.animSpeed ?? 1;
  try {
    const cfgMod = await import(`/src/pages/pixi/matter1/enemiesData.js?t=${Date.now()}`)
    const cfg = cfgMod.monsterConfigs?.[item.juese];
    if (cfg && cfg.codexAnimSpeed !== undefined) animSpeed = cfg.codexAnimSpeed;
  } catch (e) { /* 忽略 */ }
  detailSpine = createTuJianSpine(skel, atlas);
  applySkin(detailSpine, item.skin);
  detailApp.stage.addChild(detailSpine);
  playBaseAnim(detailSpine, item.anim, animSpeed);
  detailSpine.update(0.05);
  // 🖼️ 初始尺寸过大：先同步尝试适配（多数骨骼此刻包围盒已就绪），未就绪则先隐藏，避免首帧以原始大尺寸绘制产生“变小/瞬移”
  if (!fitAndEnter(detailSpine, box.clientWidth || 400, box.clientHeight || 500)) detailSpine.visible = false;
  fitLoop(detailSpine, box);
  // 🎬 获取该骨骼的所有动画（排除 idle 和混合 animation）
  try {
    const all = (detailSpine.skeleton?.data?.animations || []).map(a => a.name);
    animList.value = all.filter(n => n !== "idle" && n !== "animation");
  } catch (e) { animList.value = []; }
  playingAnim.value = "";
}

/** 渲染头像立绘 spine（lihui 资源，支持表情皮肤） */
async function renderLihuiSpine(item) {
  if (!item) return;
  const box = detailCanvasRef.value;
  const base = lihuiBase(item);
  const skel = `${base}head_skel`;
  const atlas = `${base}head_atlas`;
  if (!(await ensureAssets([skel, atlas]))) {
    console.warn("[图鉴] 立绘资源加载失败:", skel, atlas);
    return;
  }
  detailSpine = createTuJianSpine(skel, atlas);
  detailApp.stage.addChild(detailSpine);

  // 收集立绘已有皮肤（default=完整形象 + 表情变体；列表不展示 default，默认形象统一用 moren）
  const skins = detailSpine.skeleton?.data?.skins || [];
  lihuiSkins.value = skins.filter(s => s.name !== "default").map(s => ({ key: s.name, label: skinLabel(s.name) }));
  // 🔄 进入立绘默认选中 moren 皮肤（若该立绘没有 moren 则回退 default / 第一个）
  lihuiSkin.value = skins.some(s => s.name === "moren")
    ? "moren"
    : (skins.some(s => s.name === "default") ? "default" : (skins[0]?.name || "default"));
  applyLihuiSkin(detailSpine, lihuiSkin.value);
  playHeadAnim(detailSpine);
  detailSpine.update(0.05);
  // 🖼️ 初始尺寸过大：先同步尝试适配（多数骨骼此刻包围盒已就绪），未就绪则先隐藏，避免首帧以原始大尺寸绘制产生“变小/瞬移”
  if (!fitAndEnter(detailSpine, box.clientWidth || 400, box.clientHeight || 500)) detailSpine.visible = false;
  fitLoop(detailSpine, box);
}

/** 切换 Q版 / 立绘 */
async function switchView(mode) {
  if (viewMode.value === mode) return;
  if (mode === "lihui" && !hasLihui(current.value)) return;
  viewMode.value = mode;
  if (detailApp) await renderCurrent();
}

/** 选择立绘表情皮肤（实时应用并重新适配） */
function selectLihuiSkin(name) {
  lihuiSkin.value = name;
  if (viewMode.value !== "lihui" || !detailSpine) return;
  applyLihuiSkin(detailSpine, name);
  detailSpine.update(0.05);
  const box = detailCanvasRef.value;
  if (box) fitSpine(detailSpine, box.clientWidth || 400, box.clientHeight || 500);
}

function closeDetail() {
  if (detailApp) {
    try {
      detailApp.ticker.stop();
      // ⚠️ 不能传 true：会触发 GlobalResourceRegistry.release() 清空共享几何体池，
      //    导致主页 qidong 渲染时 geometry 为 null 报错。用对象参数，保留共享资源。
      detailApp.destroy(
        { removeView: true },
        { children: true, texture: false, textureSource: false, context: true }
      );
    } catch (e) { /* 忽略 */ }
    detailApp = null;
  }
  detailSpine = null;
  viewMode.value = "q";
  lihuiSkin.value = "moren";
  lihuiSkins.value = [];
  if (detailCanvasRef.value) detailCanvasRef.value.innerHTML = "";
  current.value = null;
}

function close() {
  closeDetail();
  achPanelRef.value?.closeDetail();
  emit("close");
}

onMounted(async () => {
  // 对所有没有头像图的条目（NPC / 魔物）生成 spine 缩略图
  const needCapture = [
    ...(user.tujian?.jingling || []),
    ...(user.tujian?.monster || []),
  ];
  for (const item of needCapture) {
    if (destroyed) return;
    await captureThumb(item);
    await new Promise(r => setTimeout(r, 30)); // 让出主线程，避免卡顿
  }
});

onBeforeUnmount(() => {
  destroyed = true;
  closeDetail();
  // 🔒 销毁复用的截图 App（同样不能用 true，避免清掉共享几何体/纹理源）
  if (captureApp) {
    try {
      captureApp.destroy(
        { removeView: true },
        { children: true, texture: false, textureSource: false, context: true }
      );
    } catch (e) { /* 忽略 */ }
    captureApp = null;
  }
});
</script>

<style scoped>
</style>
