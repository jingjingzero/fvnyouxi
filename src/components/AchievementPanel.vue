<template>
  <div class="flex flex-col h-full min-h-0 select-none!" :class="isBook ? 'ach-book' : 'ach-dark'">
    <!-- ==================== 统计栏 ==================== -->
    <div class="flex items-center gap-[1.2vw] px-[0.6vw] mb-[1.8vh] flex-wrap flex-shrink-0">
      <!-- 标题 -->
      <div class="flex items-center gap-[0.9vw] mr-[0.3vw]">
        <div
          class="w-[0.45vw] h-[3.4vh] rounded-full bg-[linear-gradient(180deg,var(--accent),var(--accent-deep))] shadow-[0_0_1vh_rgba(251,191,36,0.35)]">
        </div>
        <div>
          <div class="text-[min(3.1vw,16px)] font-black tracking-[0.2em] text-[var(--text)] leading-none">{{ L('achBestiary') }}</div>
          <div class="text-[min(1.9vw,10.5px)] text-[var(--text-weak)] mt-[0.5vh] tracking-wider">{{ L('achDone') }}
            {{ unlockedCount }} / {{ totalCount }}</div>
        </div>
      </div>
      <!-- 天赋点徽章 -->
      <div
        class="flex items-center gap-[0.6vw] px-[1.2vw] py-[0.7vh] rounded-[0.9vw] border border-solid border-[var(--card-ok-border)] bg-[var(--pill-bg)] shadow-[inset_0_0_1vh_rgba(251,191,36,0.06)]">
        <span class="text-[min(2vw,11px)] text-[var(--text-weak)]">{{ L('talentPoint') }}</span>
        <span class="text-[min(2.7vw,15px)] font-black text-[var(--accent)] leading-none">+{{ totalReward }}</span>
      </div>
      <!-- 属性点徽章（有属性点奖励时才显示） -->
      <div v-if="totalAttrReward"
        class="flex items-center gap-[0.6vw] px-[1.2vw] py-[0.7vh] rounded-[0.9vw] border border-solid border-[var(--card-ok-border)] bg-[var(--pill-bg)] shadow-[inset_0_0_1vh_rgba(56,189,248,0.08)]">
        <span class="text-[min(2vw,11px)] text-[var(--text-weak)]">{{ L('attrPoint') }}</span>
        <span class="text-[min(2.7vw,15px)] font-black text-[#38bdf8] leading-none">+{{ totalAttrReward }}</span>
      </div>
      <!-- 收集进度 -->
      <div class="flex-1 min-w-[10vw]">
        <div class="flex items-center justify-between mb-[0.5vh]">
          <span class="text-[min(2vw,11px)] text-[var(--text-weak)]">{{ L('collectProgress') }}</span>
          <span class="text-[min(2.2vw,12px)] font-bold text-[var(--accent)]">{{ percent }}%</span>
        </div>
        <div class="h-[1.4vh] rounded-full overflow-hidden bg-[var(--track-bg)]">
          <div
            class="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-deep))] shadow-[0_0_0.9vh_rgba(251,191,36,0.45)] transition-all duration-500"
            :style="{ width: percent + '%' }"></div>
        </div>
      </div>
      <!-- 重置 -->
      <button
        v-if="showReset"
        class="px-[1.6vh] py-[0.8vh] rounded-full text-[min(2.2vw,12px)] font-semibold cursor-pointer border border-solid transition-all duration-300
          bg-[rgba(239,68,68,0.14)] border-[rgba(248,113,113,0.45)] text-[rgb(252,165,165)] hover:bg-[rgba(239,68,68,0.32)] hover:text-[rgb(254,202,202)]"
        @click="onResetAchievements"
      >{{ L('resetAch') }}</button>
    </div>

    <!-- ==================== 筛选 / 排序 ==================== -->
    <div class="flex items-center gap-[0.8vh] flex-wrap px-[0.4vw] mb-[1.4vh] flex-shrink-0">
      <div
        v-for="f in filterOptions" :key="f.value"
        class="px-[1.8vh] py-[0.8vh] rounded-full text-[min(2.3vw,12px)] font-medium cursor-pointer border border-solid transition-all duration-300"
        :class="filter === f.value ? 'ach-pill-on' : 'ach-pill-off'"
        @click="filter = f.value"
      >{{ f.label }} <span class="opacity-60 text-[min(1.8vw,10px)]">({{ f.count }})</span></div>
      <div class="ml-auto flex items-center gap-[0.7vh]">
        <span class="text-[min(1.9vw,10.5px)] text-[var(--text-weak)] mr-[0.2vh]">{{ L('completeTime') }}</span>
        <div
          v-for="s in sortOptions" :key="s.value"
          class="px-[1.5vh] py-[0.7vh] rounded-full text-[min(1.9vw,11px)] cursor-pointer border border-solid transition-all duration-300"
          :class="sortDir === s.value ? 'ach-pill-on' : 'ach-pill-off'"
          @click="sortDir = s.value"
        >{{ s.label }}</div>
      </div>
    </div>

    <!-- ==================== 成就列表 ==================== -->
    <div class="ach-body flex-1  overflow-y-auto p-[0.6vh_0.6vw_1.6vh]  ">
      <template v-if="displayList.length">
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-[6vh_1.4vw]">
          <!-- 已解锁：点击卡片 → Popconfirm 气泡弹出（仅文字：条件 + 完成时间，无按钮；点击外部自动关闭） -->
          <el-popconfirm
            v-for="a in displayList" :key="a.name"
            :ref="el => setPopRef(a.name, el)"
            :disabled="!a.unlocked"
            :width="200"
            title=""
            :hide-icon="true"
            :teleported="true"
            placement="top-start"
            popper-class="ach-pop"
            class="block h-full"
          >
            <template #reference>
              <div
                class="relative flex flex-col items-center justify-center gap-[0.9vh] p-[1.7vh_0.6vw] rounded-[1.1vw] border border-solid cursor-pointer transition-all duration-300 h-full"
                :class="a.unlocked ? 'ach-card-ok' : 'ach-card-no'"
              >
                <!-- 已解锁角标（纯 CSS 金点，无图标） -->
                <div v-if="a.unlocked"
                  class="absolute top-[0.8vh] right-[0.8vh] w-[0.55vw] h-[0.55vw] rounded-full bg-[var(--ok-dot)] shadow-[0_0_0.9vh_rgba(251,191,36,0.75)]">
                </div>
                <div class="text-[min(2.6vw,13.5px)] font-bold text-center leading-snug text-[var(--text)]">{{ tr(a.name) }}</div>
                <div
                  class="text-[min(2vw,11px)] px-[0.8vw] py-[0.3vh] rounded-full border border-solid font-bold"
                  :class="a.unlocked
                    ? 'text-[var(--accent)] border-[var(--card-ok-border)] bg-white/10'
                    : 'text-[var(--text-weak)] border-[var(--card-no-border)]'"
                >{{ a.talentReward ? '+' + a.talentReward + ' ' + L('talentPoint') : '' }}{{ a.attrReward ? (a.talentReward ? ' · ' : '') + '+' + a.attrReward + ' ' + L('attrPoint') : '' }}</div>
                <div v-if="a.unlocked" class="text-[min(1.8vw,10px)] text-[var(--text-weak)] leading-none">{{ formatTime(a.unlockTime) }}</div>
                <div v-else class="text-[min(1.8vw,10px)] text-[var(--text-weak)] opacity-60 tracking-[0.15em] leading-none">{{ L('notDone') }}</div>
              </div>
            </template>
            <!-- 弹层内容：仅文字（无按钮），显示完成条件 + 完成时间 -->
            <template #actions>
              <div class="ach-pop-body select-none!">
                <div class="text-[15px] font-black text-[#b45309] mb-[6px]">{{ tr(a.name) }}</div>
                <div class="text-[13px] leading-relaxed text-gray-700">{{ tr(a.desc || L('noDesc')) }}</div>
                <div class="text-[12px] text-gray-500 border-t border-gray-200 pt-[1vh] mt-[1vh]">{{ L('completedOn') }} {{ formatTime(a.unlockTime) }}</div>
              </div>
            </template>
          </el-popconfirm>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="h-full flex flex-col items-center justify-center gap-[1.4vh]">
        <div class="w-[6vh] h-[0.6vh] rounded-full bg-[linear-gradient(90deg,transparent,var(--accent),transparent)]"></div>
        <div class="text-[min(3vw,16px)] font-bold text-[var(--empty-title)]">{{ emptyTitle }}</div>
        <div class="text-[min(2.3vw,12px)] text-[var(--empty-desc)]">{{ emptyDesc }}</div>
      </div>

      <!-- 底部说明 -->
      <div
        class="mt-[7vh] p-[2.2vh] rounded-2xl text-[min(2.1vw,12px)] leading-[1.9] text-[var(--footnote-text)]
          bg-[var(--footnote-bg)] border border-solid border-[var(--footnote-border)]"
      >
        {{ L('achNote1') }}<br />
        {{ L('achNote2') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useCounterStore } from "@/store/counter";
import { tr, t as i18nT, getLang } from "@/i18n";

const props = defineProps({
  theme: { type: String, default: 'dark' }, // 'book'(羊皮纸古书) | 'dark'(深色科技)
  showReset: { type: Boolean, default: false }, // 是否显示「重置成就」按钮
})
defineExpose({ closeDetail })

// 🌐 语言切换刷新
const langVersion = ref(0)
function L(key) { langVersion.value; return i18nT(key); }
window.addEventListener("fvnyouxi-lang-changed", () => langVersion.value++);
const isEn = computed(() => { langVersion.value; return getLang() === 'en'; })

const isBook = computed(() => props.theme === 'book')
const user = useCounterStore()

// ============ 成就数据与统计 ============
const achievements = computed(() => user.getAchievementDefs?.() || [])
const totalCount = computed(() => achievements.value.length)
const unlockedCount = computed(() => achievements.value.filter(a => a.unlocked).length)
const lockedCount = computed(() => totalCount.value - unlockedCount.value)
const totalReward = computed(() => achievements.value.filter(a => a.unlocked).reduce((s, a) => s + (a.talentReward || 0), 0))
const totalAttrReward = computed(() => achievements.value.filter(a => a.unlocked).reduce((s, a) => s + (a.attrReward || 0), 0))
const percent = computed(() => (totalCount.value ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0))

// ============ 时间格式化（带时分；旧存档无时间戳显示"早期完成"） ============
function formatTime(ts) {
  if (!ts) return L('earlyDone')
  const d = new Date(ts)
  if (isNaN(d.getTime())) return L('earlyDone')
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ============ 筛选 & 排序 ============
const filter = ref('all')    // all | unlocked | locked
const sortDir = ref('desc')  // desc(最新) | asc(最早)

const filterOptions = computed(() => [
  { value: 'all', label: L('filterAll'), count: totalCount.value },
  { value: 'unlocked', label: L('achDone'), count: unlockedCount.value },
  { value: 'locked', label: L('filterNotDone'), count: lockedCount.value },
])
const sortOptions = computed(() => [
  { value: 'desc', label: L('sortNewest') },
  { value: 'asc', label: L('sortOldest') },
])

// 展示列表：已解锁的按完成时间排序（旧存档无时间戳时按完成顺序兜底），未解锁保持配置顺序
const displayList = computed(() => {
  let list = [...achievements.value]
  if (filter.value === 'unlocked') list = list.filter(a => a.unlocked)
  if (filter.value === 'locked') list = list.filter(a => !a.unlocked)
  const unlocked = list.filter(a => a.unlocked)
  const locked = list.filter(a => !a.unlocked)
  unlocked.sort((a, b) => {
    const ta = a.unlockTime ?? 0
    const tb = b.unlockTime ?? 0
    const d = ta === tb ? (a.order ?? 0) - (b.order ?? 0) : ta - tb
    return sortDir.value === 'desc' ? -d : d
  })
  return [...unlocked, ...locked]
})

// ============ 空状态文案 ============
const emptyTitle = computed(() => filter.value === 'unlocked' ? L('emptyUnlockTitle') : filter.value === 'locked' ? L('emptyLockedTitle') : L('emptyAllTitle'))
const emptyDesc = computed(() => filter.value === 'unlocked' ? L('emptyUnlockDesc') : filter.value === 'locked' ? L('emptyLockedDesc') : L('emptyAllDesc'))

// ============ 成就详情（Popconfirm 气泡弹出，仅文字：条件 + 完成时间） ============
// 采用默认点击触发（不传受控 visible，避免点击无效果）；实例缓存用于外部统一关闭
const popRefs = {}
function setPopRef(name, el) {
  if (el) popRefs[name] = el
  else delete popRefs[name]
}
function closeDetail() {
  Object.values(popRefs).forEach(p => { try { p?.hide?.() } catch (e) { /* ignore */ } })
}

// ============ 重置全部成就（测试用） ============
function onResetAchievements() {
  const done = user.resetAchievements?.();
  ElMessage({ message: done ? L('resetOk') : L('resetFail'), type: done ? 'success' : 'warning', duration: 1800 });
}
</script>

<style scoped>
/* ==================== 双主题 CSS 变量（UnoCSS 原子类通过 var() 引用配色） ==================== */
.ach-dark {
  --bg: transparent;
  --text: #eef1f6;
  --text-weak: #8a9bb5;
  --accent: #f6c453;
  --accent-deep: #e8a33d;
  --ok-dot: #f6c453;
  --card-ok-bg: linear-gradient(150deg, rgba(246, 196, 83, 0.16), rgba(232, 163, 61, 0.05));
  --card-ok-border: rgba(246, 196, 83, 0.5);
  --card-no-bg: rgba(255, 255, 255, 0.03);
  --card-no-border: rgba(255, 255, 255, 0.09);
  --pill-bg: rgba(255, 255, 255, 0.05);
  --pill-border: rgba(255, 255, 255, 0.14);
  --pill-text: rgba(255, 255, 255, 0.62);
  --pill-on-bg: linear-gradient(135deg, var(--accent), var(--accent-deep));
  --pill-on-text: #1c1505;
  --stat-bg: rgba(255, 255, 255, 0.05);
  --stat-border: rgba(255, 255, 255, 0.12);
  --track-bg: rgba(255, 255, 255, 0.1);
  --footnote-bg: rgba(255, 255, 255, 0.04);
  --footnote-border: rgba(255, 255, 255, 0.1);
  --footnote-text: rgba(238, 241, 246, 0.5);
  --detail-bg: linear-gradient(160deg, rgba(26, 28, 46, 0.97), rgba(20, 26, 44, 0.97));
  --detail-border: rgba(246, 196, 83, 0.5);
  --detail-text: #cdd4e0;
  --detail-name: #ffffff;
  --empty-title: rgba(255, 255, 255, 0.72);
  --empty-desc: rgba(255, 255, 255, 0.42);
  --scroll-thumb: rgba(246, 196, 83, 0.4);
}
.ach-book {
  --text: #4a2e12;
  --text-weak: #8a6334;
  --accent: #b8860b;
  --accent-deep: #8b6914;
  --ok-dot: #b8860b;
  --card-ok-bg: linear-gradient(160deg, rgba(255, 255, 255, 0.9), rgba(238, 214, 160, 0.6));
  --card-ok-border: #c9a24b;
  --card-no-bg: rgba(122, 92, 58, 0.08);
  --card-no-border: #d3bd93;
  --pill-bg: rgba(139, 90, 43, 0.08);
  --pill-border: #cfae77;
  --pill-text: #7a5220;
  --pill-on-bg: linear-gradient(135deg, #b8860b, #8b6914);
  --pill-on-text: #fdf6e3;
  --stat-bg: rgba(139, 90, 43, 0.08);
  --stat-border: #cfae77;
  --track-bg: rgba(139, 90, 43, 0.2);
  --footnote-bg: rgba(139, 90, 43, 0.07);
  --footnote-border: rgba(207, 174, 119, 0.5);
  --footnote-text: #8a6334;
  --detail-bg: linear-gradient(160deg, #faf1da, #ecd8ab);
  --detail-border: #8b5a2b;
  --detail-text: #6f5230;
  --detail-name: #4a2e12;
  --empty-title: #8a6334;
  --empty-desc: #93713f;
  --scroll-thumb: rgba(184, 134, 11, 0.5);
}

/* 筛选/排序 pill 激活态（渐变金色） */
.ach-pill-on {
  background: var(--pill-on-bg) !important;
  border-color: transparent !important;
  color: var(--pill-on-text) !important;
  box-shadow: 0 0.3vh 1vh rgba(251, 191, 36, 0.25);
}
.ach-pill-off {
  background: var(--pill-bg);
  border-color: var(--pill-border);
  color: var(--pill-text);
}
.ach-pill-off:hover {
  background: var(--stat-bg);
  color: var(--text);
}

/* 成就卡片：已解锁（金色描边 + 内发光）/ 未解锁（暗色去饱和） */
.ach-card-ok {
  background-image: var(--card-ok-bg);
  border-color: var(--card-ok-border);
  box-shadow: 0 0.6vh 1.4vh rgba(0, 0, 0, 0.18), inset 0 0 1.6vh rgba(251, 191, 36, 0.05);
}
.ach-card-ok:hover {
  transform: translateY(-0.5vh);
  box-shadow: 0 1vh 2vh rgba(201, 143, 31, 0.28), inset 0 0 1.6vh rgba(251, 191, 36, 0.08);
}
.ach-card-no {
  background: var(--card-no-bg);
  border-color: var(--card-no-border);
  opacity: 0.6;
  filter: grayscale(0.6);
  cursor: not-allowed;
}

/* 滚动条（伪元素无法用原子类，保留最小 CSS） */
.ach-body::-webkit-scrollbar { width: 1vh; }
.ach-body::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border-radius: 1vh; }
.ach-body::-webkit-scrollbar-track { background: transparent; }

</style>

<style>
/* ==================== 成就详情 Popconfirm 弹层（teleport 到 body，需全局样式） ==================== */
.ach-pop {
  padding: 0 !important;
  border: none !important;
  border-radius: 12px !important;
  background: #fff !important;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.28) !important;
  /* 弹层 teleport 到 body，需高于 TuJian 遮罩(z-9999)等覆盖层，否则会被盖住看不见 */
  z-index: 99999 !important;
}
.ach-pop .el-popper__arrow { display: none !important; }
.ach-pop .el-popconfirm__action {
  margin: 0 !important;
  text-align: left !important;
  width: 100% !important;
}
.ach-pop-body {
  padding: 14px 18px;
  min-width: 22vw;
  background: #fff;
  border-radius: 12px;
}
</style>
