<template>
  <div class="w-90vw px-5vw h-92vh py-4vh bg-black/75 text-white">
    <div class="bg-white/90 h-85vh pb-5vh text-black p-10px overflow-hidden">

      <!-- 顶部 -->
      <div class="flex items-center justify-between">
        <el-segmented v-model="value" :options="options" />

        <el-button type="danger" @click="exit">
          退出
        </el-button>
      </div>

      <template v-if="value === 'NPC编辑'">

        <!-- NPC数量 -->
        <div class="flex items-center  gap-x-4vw pb-1vh">
          <div class="flex items-center gap-x-10px">
            <span class="iconfont2">NPC数量:</span>
            <span>{{ user.pixi.npcDataList?.length || 0 }}</span>

            <el-button type="primary" size="small" @click="addNpc">
              新增角色
            </el-button>
          </div>

          <!-- 复制并打印按钮 -->
          <el-button type="primary" size="small" @click="copyNpcData">
            复制并打印
          </el-button>
        </div>

        <!-- 主区域 -->
        <div class="flex  h-[70vh] border text-24px">

          <!-- 左侧NPC列表 -->
          <div ref="npcListRef" class="w-250px border-r overflow-y-auto" style="scroll-behavior: smooth;">
            <div v-for="(npc, index) in user.pixi.npcDataList" :key="index" :ref="el => npcRefs[index] = el"
              class="p-10px border-b cursor-pointer" :class="{ 'bg-blue-100': currentNpcIndex === index }"
              @click="selectNpc(index)">
              NPC{{ index + 1 }}
              <div class="text-12px text-gray">
                {{ npc.juese }}
              </div>
              <div class="text-12px text-green-600">
                地图: {{ npc.mapId || 'one01' }}
              </div>
            </div>
          </div>

          <!-- 右侧编辑器 -->
          <div v-if="currentNpc" ref="npcEditorRef" class="flex-1 p-20px overflow-y-auto">

            <div class="grid gap-15px text-20px">
              <div class="flex flex-col gap-y-1vh">
                <span>人物</span>
                <div class="flex gap-x-15vw">
                  <el-select v-model="currentNpc.juese" placeholder="请选择角色" clearable style="width: 100%;">
                    <el-option v-for="role in user.pixi.npcSelectList" :key="role.value" :label="role.tips"
                      :value="role.value" />
                  </el-select>
                  <el-button type="danger" @click="removeNpc">
                    删除当前NPC
                  </el-button>
                </div>
              </div>

              <!-- 👇 新增：地图选择 -->
              <div>
                <div>生成地图</div>
                <el-select v-model="currentNpc.mapId" placeholder="选择地图" style="width:100%;">
                  <el-option label="第一章地图" value="one01" />
                  <el-option label="沙漠地图" value="desert_01" />
                </el-select>
              </div>

              <div>
                <div>角色位置X(%)</div>
                <el-input-number v-model="currentNpc.x" :step="0.02" />
              </div>

              <div>
                <div>角色高度</div>
                <el-input-number v-model="currentNpc.TopH" />
              </div>

              <div>
                <div>速度</div>
                <el-input-number v-model="currentNpc.speed" :step="0.1" />
              </div>

              <div>
                <div>当前血量</div>
                <el-input-number v-model="currentNpc.currentHp" />
              </div>

              <div>
                <div>最大血量</div>
                <el-input-number v-model="currentNpc.maxHp" />
              </div>

            </div>

          </div>

        </div>

      </template>
      <template v-else-if="value === '主角编辑'">


        <div class="flex flex-wrap gap-x-5vw pt-2vh gap-y-4vh px-2vw text-2vw max-h-75vh overflow-y-auto">

          <div class="w-15vw">
            <div>人物</div>
            <el-select v-model="user.pixi.activePlayer.juese" placeholder="请选择角色" clearable style="width:100%;">
              <el-option v-for="role in user.pixi.npcSelectList" :key="role.value" :label="role.tips"
                :value="role.value" />
            </el-select>
          </div>

          <div class="w-15vw">
            <div>角色位置X</div>
            <el-input-number v-model="user.pixi.activePlayer.x" :step="10" style="width:100%;" />
          </div>

          <div class="w-15vw">
            <div>角色位置Y</div>
            <el-input-number v-model="user.pixi.activePlayer.y" :step="10" style="width:100%;" />
          </div>

          <div class="w-15vw">
            <div>速度</div>
            <el-input-number v-model="user.pixi.activePlayer.speed" :step="0.1" style="width:100%;" />
          </div>

          <div class="w-15vw">
            <div>当前血量</div>
            <el-input-number v-model="user.pixi.activePlayer.currentHp" style="width:100%;" />
          </div>

          <div class="w-15vw">
            <div>最大血量</div>
            <el-input-number v-model="user.pixi.activePlayer.maxHp" style="width:100%;" />
          </div>

        </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, reactive, onMounted } from "vue";
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";
import { ElMessage } from 'element-plus'
const user = useCounterStore();
const npcEditorRef = ref(null);
const npcListRef = ref(null);
const npcRefs = reactive({}); // 存每个 NPC 的 DOM
const value = ref("主角编辑");
console.log('user.pixi.activePlayer=', user.pixi.activePlayer);

const options = [
  "主角编辑",
  "NPC编辑",
  "地图设置",
];
// 用于编辑属性


onMounted(() => {

})
const currentNpcIndex = ref(0);

const currentNpc = computed(() => {
  if (
    !user.pixi.npcDataList ||
    user.pixi.npcDataList.length === 0 ||
    currentNpcIndex.value >= user.pixi.npcDataList.length
  ) {
    return null; // 没有 NPC 时返回 null
  }

  return user.pixi.npcDataList[currentNpcIndex.value];
});

function exit() {
  user.pixi.setting = 0;

  // ⚠️ 只在这里同步一次
  emitter.emit('npcConfigUpdated', user.pixi.npcDataList);
  emitter.emit("vnZanting");
}

// 创建默认NPC
function createDefaultNpc() {
  return {
    type: "ranged",
    juese: "jinglingQ",
    player: 2,
    maxHp: 500,
    currentHp: 500,
    xuetiaoPosition: 21,
    x: getSafeNpcX(),
    speed: 0.3,
    mapId: "one01",
    npcEdit:true
  };
}
function getSafeNpcX() {
  const step = 0.02;
  const start = 0.75;

  const used = new Set(
    user.pixi.npcDataList.map(n => Number((n.x ?? 0).toFixed(2)))
  );

  // 1️⃣ 从 0.75 开始往右找
  for (let x = start; x <= 1; x += step) {
    const key = +x.toFixed(2);
    if (!used.has(key)) return key;
  }

  // 2️⃣ 超过 1 后，从 0.02 开始回绕
  for (let x = step; x < start; x += step) {
    const key = +x.toFixed(2);
    if (!used.has(key)) return key;
  }

  // 3️⃣ 实在满了（极端情况）
  return start;
}
// 修改NPC数量
function addNpc() {
  // 👇 原来的逻辑不变
  const newNpc = createDefaultNpc();
  user.pixi.npcDataList.push(newNpc);

  // ⚡ 新增这 1 行，强制让 Pinia 响应式更新
  user.pixi.npcDataList = [...user.pixi.npcDataList];

  currentNpcIndex.value = user.pixi.npcDataList.length - 1;

  nextTick(() => {
    ElMessage.success('已新增角色');
    const lastNpcEl = npcRefs[user.pixi.npcDataList.length - 1];
    if (lastNpcEl && npcListRef.value) {
      lastNpcEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });
}
function copyNpcData() {
  // 深拷贝数组
  const copiedList = JSON.parse(JSON.stringify(user.pixi.npcDataList));

  console.log("copied npcDataList:", copiedList);
}
function selectNpc(index) {
  currentNpcIndex.value = index;

  nextTick(() => {
    if (npcEditorRef.value) {
      npcEditorRef.value.scrollTop = 0; // 滚动到顶部
    }
  });
}
// 删除NPC
function removeNpc() {
  if (!user.pixi.npcDataList.length) return;

  user.pixi.npcDataList.splice(currentNpcIndex.value, 1);

  // ⚡ 强制响应式更新
  user.pixi.npcDataList = [...user.pixi.npcDataList];

  if (currentNpcIndex.value >= user.pixi.npcDataList.length) {
    currentNpcIndex.value = Math.max(0, user.pixi.npcDataList.length - 1);
  }

  ElMessage.error(`已删除角色`);
}
</script>