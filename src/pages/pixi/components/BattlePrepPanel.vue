<template>
  <!-- 讨伐准备面板（点击空白遮罩区域可关闭） -->
  <div class="fixed inset-0 z-[80] flex items-center justify-center"
    @click.self="handleLeave">
    <div
      class="battle-prep-panel pointer-events-auto bg-black/70 backdrop-blur-sm rounded-2xl px-8vh py-6vh text-center border border-white/10 shadow-2xl">
      <div class="text-[4.5vh] text-white font-bold mb-2vh iconfont2">{{ title }}</div>



      <!-- 携带队友选择（没有可携带的队友时不显示） -->
      <div v-if="npcList.length > 0" class="mb-6vh">
        <div class="text-[2.8vh] text-white/80 iconfont2 mb-2vh">选择队友（可携带一名 NPC 协助战斗）</div>
        <div class="flex items-center justify-center gap-3vh">
          <!-- 各 NPC -->
          <div v-for="npc in npcList" :key="npc.img" class="ally-option flex flex-col items-center gap-1vh cursor-pointer"
            :class="{ 'ally-selected': selectedAlly === npc.img }" @click="selectedAlly = npc.img">
            <div class="w-12vh h-12vh rounded-full overflow-hidden bg-white/10 border-2 border-white/20">
              <img :src="getHeadImg(npc.img)" :alt="npc.name" class="w-full h-full object-cover" />
            </div>
            <span class="text-[2vh] text-white/80 iconfont2">{{ tr(npc.name) }}</span>
          </div>
        </div>
      </div>

      <!-- 按钮 -->
      <div class="flex gap-4vh justify-center">
        <button @click="handleLeave"
          class="battle-btn battle-btn-leave px-6vh py-2vh rounded-xl text-[3vh] iconfont2 bg-white/10 text-white/80 hover:bg-white/20 transition-all border border-white/10">
          离开
        </button>
        <button @click="handleEnter"
          class="battle-btn battle-btn-enter px-6vh py-2vh rounded-xl text-[3vh] iconfont2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-orange-500/30">
          {{ enterText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useCounterStore } from "@/store/counter";
import { tr } from "@/i18n";

/**
 * 讨伐准备面板
 * 只保留选择队友 + 地牢层数显示，发起讨伐直接进入地牢
 *
 * @prop {Boolean} visible - 是否显示
 * @prop {Number} currentFloor - 当前层数（默认1）
 * @prop {Number} maxFloor - 最大层数（默认2）
 * @prop {String} title - 面板标题
 * @prop {String} enterText - 确认按钮文字
 * @emit leave - 点击"离开"
 * @emit enter(allyImg) - 点击"确认"并返回携带的队友
 */
const props = defineProps({
  visible: { type: Boolean, default: false },
  currentFloor: { type: Number, default: 1 },
  maxFloor: { type: Number, default: 2 },
  title: { type: String, default: "地牢讨伐" },
  enterText: { type: String, default: "进入地牢" },
});

const emit = defineEmits(["leave", "enter"]);

const user = useCounterStore();

// 可选的队友列表
const npcList = computed(() => {
  const list = user.getMapAllyList?.() || [];
  return list.filter(n => n.canAlly !== false);
});

// 获取默认选中的队友
function getDefaultAlly() {
  const saved = user.getNpcAlly?.();
  if (saved && npcList.value.some(n => n.img === saved)) return saved;
  return npcList.value[0]?.img || null;
}

const selectedAlly = ref(getDefaultAlly());

// 🏰 实际地牢层数（从 localStorage 读取，玩家可能已经推进到更深层）
const DUNGEON_LEVEL_KEY = 'fv_dungeon_level';
const actualFloor = ref(1);
const maxFloor = 2; // 最大层数（后续可从地牢配置读取）

function readDungeonLevel() {
  try {
    const saved = Number(localStorage.getItem(DUNGEON_LEVEL_KEY));
    if (saved && saved >= 1) actualFloor.value = saved;
    else actualFloor.value = 1;
  } catch (e) { actualFloor.value = 1; }
}

// 获取 NPC 头像图片
function getHeadImg(imgName) {
  try {
    return new URL(`../../../assets/fullBody/head/${imgName}.webp`, import.meta.url).href;
  } catch (e) {
    return "";
  }
}

watch(
  () => props.visible,
  (active) => {
    if (active) {
      selectedAlly.value = getDefaultAlly();
      readDungeonLevel(); // 🏰 每次打开面板时读取最新地牢层数
    }
  },
  { immediate: true }
);

function handleLeave() {
  emit("leave");
}

function handleEnter() {
  user.setNpcAlly?.(selectedAlly.value);
  emit("enter", selectedAlly.value);
}
</script>

<style scoped>
.battle-prep-panel {
  min-width: 60vh;
  animation: battle-panel-in 0.3s ease-out;
}

@keyframes battle-panel-in {
  from {
    opacity: 0;
    transform: translateY(3vh);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.battle-btn {
  cursor: pointer;
  border: none;
  outline: none;
  font-weight: 500;
}
.battle-btn:active {
  transform: scale(0.96);
}

.ally-option {
  transition: transform 0.15s, filter 0.15s;
}
.ally-option:hover {
  transform: scale(1.05);
}
.ally-option.ally-selected {
  transform: scale(1.05);
}
.ally-option.ally-selected > div:first-child {
  border-color: #f59e0b;
  box-shadow: 0 0 1.5vh rgba(245, 158, 11, 0.6);
}
</style>
