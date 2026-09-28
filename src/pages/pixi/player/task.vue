<template>
  <div
    class="w-full h-95vh flex flex-col relative overflow-hidden rounded-[1vh] select-none! text-[#e0e0e0] bg-gradient-to-br from-[#141430] via-[#1e1b4b] to-[#0d2547]">
    <!-- ==================== 背景装饰层 ==================== -->
    <div class="absolute inset-0 pointer-events-none">
      <img src="@/assets/image/beijing.webp" draggable="false"
        class="w-full h-full object-cover opacity-[0.08] mix-blend-screen" />
      <div class="absolute inset-0 bg-gradient-to-b from-[#141430]/60 via-transparent to-[#0d2547]/85"></div>
      <div class="absolute -top-[8vh] -right-[8vh] w-[42vh] h-[42vh] rounded-full bg-[#667eea]/15 blur-[9vh]"></div>
      <div class="absolute -bottom-[10vh] -left-[8vh] w-[38vh] h-[38vh] rounded-full bg-[#a78bfa]/12 blur-[9vh]"></div>
      <div
        class="absolute top-1/3 left-1/2 w-[55vh] h-[55vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#764ba2]/6 blur-[12vh]">
      </div>
    </div>

    <!-- ==================== 顶部标题栏 ==================== -->
    <div
      class="relative z-10 flex justify-between items-center px-[3vh] py-[1.8vh] border-b border-white/10 bg-black/25 backdrop-blur-md flex-shrink-0">
      <div class="flex items-center gap-[1.8vh]">
        <div
          class="w-[5.6vh] h-[5.6vh] rounded-xl bg-gradient-to-br from-[#667eea] to-[#a78bfa] flex items-center justify-center text-[3vh] shadow-[0_0_2.5vh_rgba(102,126,234,0.45)]">
          📋
        </div>
        <div>
          <h2
            class="m-0 text-[3.4vh] font-bold iconfont2 bg-gradient-to-r from-[#818cf8] via-[#a78bfa] to-[#c084fc] bg-clip-text text-transparent leading-none">
            {{ L('taskTitle') }}</h2>
          <div class="text-[1.7vh] text-white/45 mt-[0.6vh] tracking-wider">{{ L('taskSubtitle') }}</div>
        </div>
      </div>
      <div class="flex items-center gap-[1.2vh]">
        <span class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.8vh] font-medium bg-white/5 border border-white/10 text-white/70">
          📌 {{ fmt('taskActive', { n: totalActiveCount }) }}
        </span>
        <span class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.8vh] font-medium bg-[#67c23a]/10 border border-[#67c23a]/25 text-[#a8e6a1]">
          ✅ {{ fmt('taskCompleted', { n: totalCompletedCount }) }}
        </span>
      </div>
    </div>

    <!-- ==================== 主体 ==================== -->
    <div class="relative z-10 flex-1 flex overflow-hidden min-h-0">
      <!-- ========== 左侧：任务列表 ========== -->
      <div class="w-[30%] shrink-0 border-r border-white/10 bg-black/10 backdrop-blur-sm flex flex-col overflow-hidden">
        <!-- 分类标签（主线/支线） -->
        <div class="flex items-center gap-[0.8vh] px-[1.8vh] py-[1.2vh] border-b border-white/10 flex-shrink-0">
          <div v-for="tab in typeTabs" :key="tab.value"
            class="flex items-center gap-[0.8vh] px-[1.8vh] py-[0.8vh] rounded-full text-[1.8vh] font-medium cursor-pointer border transition-all duration-300"
            :class="activeTab === tab.value
              ? 'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/60 shadow-[0_0_1.5vh_rgba(167,139,250,0.25)]'
              : 'bg-white/5 text-white/60 border-white/15 hover:bg-white/10 hover:text-white/80'"
            @click="switchTab(tab.value)">
            <span>{{ tab.icon }}</span>
            <span>{{ L(tab.label) }}</span>
            <span class="opacity-70">({{ tab.count }})</span>
          </div>
        </div>

        <!-- 状态筛选 -->
        <div class="flex items-center gap-[0.8vh] px-[1.8vh] py-[1vh] border-b border-white/10 flex-shrink-0">
          <span class="text-[1.6vh] text-white/40 mr-[0.3vh]">{{ L('taskFilter') }}</span>
          <div v-for="f in statusFilters" :key="f.value"
            class="px-[1.4vh] py-[0.6vh] rounded-full text-[1.6vh] font-medium cursor-pointer border transition-all duration-300"
            :class="statusFilter === f.value
              ? 'bg-[#fbbf24]/20 text-[#fde68a] border-[#fbbf24]/60'
              : 'bg-white/5 text-white/50 border-white/15 hover:bg-white/10 hover:text-white/80'"
            @click="statusFilter = f.value; filterTasks()">
            {{ L(f.label) }} <span class="opacity-70">({{ f.count }})</span>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="flex-1 overflow-y-auto p-[1.6vh] task-scrollbar">
          <template v-if="filteredTasks.length">
            <div v-for="task in filteredTasks" :key="task.id"
              class="relative flex flex-col gap-[0.8vh] p-[1.6vh] mb-[1.2vh] rounded-2xl border cursor-pointer transition-all duration-300"
              :class="selectedTask?.id === task.id
                ? 'bg-gradient-to-r from-[#667eea]/30 to-[#764ba2]/20 border-[#a78bfa]/60 shadow-[0_0_2vh_rgba(102,126,234,0.3)]'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'"
              @click="selectTask(task)">
              <div class="flex items-center gap-[1.2vh]">
                <!-- 类型图标 -->
                <div class="w-[5vh] h-[5vh] rounded-xl flex items-center justify-center text-[2.4vh] flex-shrink-0 border"
                  :style="task.type === 'main'
                    ? { background: 'rgba(102,126,234,0.15)', borderColor: 'rgba(102,126,234,0.4)' }
                    : { background: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.4)' }">
                  {{ task.type === 'main' ? '📋' : '📌' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[2.4vh] font-bold text-white truncate"
                    :class="{ 'line-through text-white/50': task.isCompleted }">
                    {{ tr(task.name) }}
                  </div>
                  <div class="text-[1.5vh] text-[#e0e0e0]/45 mt-[0.3vh]">
                    {{ fmt('taskStepsCount', { c: getCompletedSteps(task), t: task.steps.length }) }}
                  </div>
                </div>
                <!-- 状态徽章 -->
                <span v-if="task.isCompleted"
                  class="flex-shrink-0 px-[1.2vh] py-[0.4vh] rounded-full text-[1.5vh] font-bold bg-[#67c23a]/20 text-[#67c23a] border border-[#67c23a]/40">
                  ✓ {{ L('taskCompletedBadge') }}
                </span>
                <span v-else
                  class="flex-shrink-0 px-[1.2vh] py-[0.4vh] rounded-full text-[1.5vh] font-bold bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40">
                  ▶ {{ L('taskActiveBadge') }}
                </span>
              </div>
              <!-- 进度条 -->
              <div class="w-full h-[1.1vh] rounded-full bg-white/10 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: taskProgress(task) + '%',
                    background: task.isCompleted
                      ? 'linear-gradient(90deg, #67c23a88, #67c23a)'
                      : 'linear-gradient(90deg, #a78bfa88, #a78bfa)'
                  }">
                </div>
              </div>
            </div>
          </template>

          <!-- 空状态 -->
          <div v-else class="h-full flex flex-col items-center justify-center gap-[1.5vh]">
            <div class="text-[5vh]">{{ emptyEmoji }}</div>
            <div class="text-[2.2vh] font-bold text-white/60 iconfont2">{{ emptyTitle }}</div>
            <div class="text-[1.8vh] text-white/35">{{ emptyDesc }}</div>
          </div>
        </div>
      </div>

      <!-- ========== 右侧：任务详情 ========== -->
      <div class="flex-1 min-w-0 overflow-y-auto p-[3vh] task-scrollbar">
        <Transition name="jx-fade" mode="out-in">
          <div v-if="selectedTask" :key="selectedTask.id" class="flex flex-col">
            <div>
              <!-- 任务标题 -->
              <div class="flex items-center gap-[2vh] mb-[2.5vh]">
                <div class="w-[7vh] h-[7vh] rounded-2xl flex items-center justify-center text-[3.4vh] border flex-shrink-0"
                  :style="selectedTask.type === 'main'
                    ? { background: 'rgba(102,126,234,0.15)', borderColor: 'rgba(102,126,234,0.5)', boxShadow: '0 0 2.5vh rgba(102,126,234,0.25)' }
                    : { background: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.5)', boxShadow: '0 0 2.5vh rgba(244,114,182,0.25)' }">
                  {{ selectedTask.type === 'main' ? '📋' : '📌' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-[1.2vh] flex-wrap">
                    <h3 class="m-0 text-[3.8vh] font-bold iconfont2 leading-none truncate"
                      :class="selectedTask.isCompleted ? 'text-white/50 line-through' : 'text-white'">
                      {{ tr(selectedTask.name) }}
                    </h3>
                    <span class="px-[1.4vh] py-[0.4vh] rounded-full text-[1.6vh] font-semibold border"
                      :style="selectedTask.type === 'main'
                        ? { color: '#a5b4fc', borderColor: 'rgba(102,126,234,0.5)', background: 'rgba(102,126,234,0.15)' }
                        : { color: '#f9a8d4', borderColor: 'rgba(244,114,182,0.5)', background: 'rgba(244,114,182,0.15)' }">
                      {{ selectedTask.type === 'main' ? L('taskMain') : L('taskSide') }}
                    </span>
                    <span v-if="selectedTask.isCompleted"
                      class="px-[1.4vh] py-[0.4vh] rounded-full text-[1.6vh] font-bold bg-[#67c23a]/20 text-[#67c23a] border border-[#67c23a]/40">
                      ✓ {{ L('taskCompletedBadge') }}
                    </span>
                    <span v-else
                      class="px-[1.4vh] py-[0.4vh] rounded-full text-[1.6vh] font-bold bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40">
                      ▶ {{ L('taskActiveBadge') }}
                    </span>
                  </div>
                  <div class="flex items-center gap-[1.5vh] mt-[1.2vh]">
                    <div class="flex-1 max-w-[40vh] h-[1.3vh] rounded-full bg-white/10 overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500"
                        :style="{
                          width: taskProgress(selectedTask) + '%',
                          background: selectedTask.isCompleted
                            ? 'linear-gradient(90deg, #67c23a88, #67c23a)'
                            : 'linear-gradient(90deg, #a78bfa88, #a78bfa)'
                        }">
                      </div>
                    </div>
                    <span class="text-[1.7vh] text-white/50 flex-shrink-0">
                      {{ fmt('taskProgressLine', { c: getCompletedSteps(selectedTask), t: selectedTask.steps.length, p: taskProgress(selectedTask) }) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 任务描述 -->
              <div v-if="selectedTask.description"
                class="mb-[3vh] p-[2.4vh] rounded-2xl bg-white/[0.04] border border-white/10">
                <div class="flex items-center gap-[1vh] mb-[1.2vh] text-[2vh] font-semibold text-[#a5b4fc]">
                  <span>📖</span> {{ L('taskDescLabel') }}
                  <span class="h-px flex-1 bg-gradient-to-r from-[#a78bfa]/40 to-transparent"></span>
                </div>
                <p class="m-0 text-[2.2vh] leading-[1.8] text-[#d0d0d0]">{{ selectedTask.description }}</p>
              </div>

              <!-- 任务步骤 -->
              <div class="mb-[3vh]">
                <div class="flex items-center gap-[1vh] mb-[1.5vh] text-[2vh] font-semibold text-[#a5b4fc]">
                  <span>🪜</span> {{ L('taskStepsLabel') }}
                  <span class="h-px flex-1 bg-gradient-to-r from-[#a78bfa]/40 to-transparent"></span>
                </div>
                <div class="flex flex-col gap-[1.2vh]">
                  <div v-for="step in displaySteps" :key="step.id"
                    class="flex items-start gap-[1.4vh] p-[1.8vh] rounded-xl border transition-all duration-300"
                    :class="{
                      'bg-white/[0.04] border-white/10': !step.isCompleted && !isCurrentStep(selectedTask, step, step.originalIndex),
                      'border-[#67c23a]/40 bg-[#67c23a]/[0.06]': step.isCompleted,
                      'border-[#a78bfa]/60 bg-[#a78bfa]/10 shadow-[0_0_2vh_rgba(167,139,250,0.2)]': isCurrentStep(selectedTask, step, step.originalIndex)
                    }">
                    <div
                      class="w-[3.6vh] h-[3.6vh] rounded-full flex items-center justify-center text-[1.8vh] font-bold flex-shrink-0 mt-[0.2vh]"
                      :class="{
                        'bg-[#67c23a] text-white': step.isCompleted,
                        'bg-[#a78bfa] text-white step-pulse': isCurrentStep(selectedTask, step, step.originalIndex),
                        'bg-white/10 text-white/60': !step.isCompleted && !isCurrentStep(selectedTask, step, step.originalIndex)
                      }">
                      <span v-if="step.isCompleted">✓</span>
                      <span v-else>{{ step.originalIndex + 1 }}</span>
                    </div>
                    <div class="flex-1 flex items-center gap-[1.5vh] min-w-0">
                      <span class="text-[2.4vh] leading-[1.4] flex-1"
                        :class="{
                          'line-through text-white/40': step.isCompleted,
                          'text-white font-bold': isCurrentStep(selectedTask, step, step.originalIndex),
                          'text-[#cfd8ea]': !step.isCompleted && !isCurrentStep(selectedTask, step, step.originalIndex)
                        }">
                        {{ step.content }}
                      </span>
                      <span v-if="isCurrentStep(selectedTask, step, step.originalIndex) && !step.isCompleted"
                        class="px-[1.2vh] py-[0.4vh] rounded-full text-[1.5vh] font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white flex-shrink-0">
                        {{ L('taskCurrent') }}
                      </span>
                      <span v-if="step.isCompleted"
                        class="px-[1.2vh] py-[0.4vh] rounded-full text-[1.5vh] font-bold bg-[#67c23a]/20 text-[#67c23a] flex-shrink-0">
                        {{ L('taskDone') }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 任务奖励 -->
              <div v-if="taskReward" class="mb-[3vh]">
                <div class="flex items-center gap-[1vh] mb-[1.5vh] text-[2vh] font-semibold text-[#fde68a]">
                  <span>🎁</span> {{ L('taskRewardLabel') }}
                  <span class="h-px flex-1 bg-gradient-to-r from-[#fbbf24]/40 to-transparent"></span>
                </div>
                <div
                  class="p-[2vh] rounded-2xl bg-[#fbbf24]/[0.05] border border-[#fbbf24]/20 flex flex-wrap items-center gap-[1.2vh]">
                  <span v-if="taskReward.exp > 0"
                    class="flex items-center gap-[0.6vh] px-[1.6vh] py-[0.8vh] rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30 text-[1.8vh] font-semibold">
                    💎 {{ fmt('taskRewardExp', { n: taskReward.exp }) }}
                  </span>
                  <span v-if="taskReward.money > 0"
                    class="flex items-center gap-[0.6vh] px-[1.6vh] py-[0.8vh] rounded-full bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30 text-[1.8vh] font-semibold">
                    🪙 {{ fmt('taskRewardMoney', { n: taskReward.money }) }}
                  </span>
                  <span v-for="item in taskReward.items" :key="item.name"
                    class="flex items-center gap-[0.8vh] px-[1.6vh] py-[0.8vh] rounded-full bg-white/5 text-white/85 border border-white/15 text-[1.8vh] font-semibold">
                    <img v-if="item.img" :src="getRewardItemImg(item.img)" class="w-[2.8vh] h-[2.8vh] object-contain"
                      draggable="false" />
                    <span>{{ tr(item.name) }} ×{{ item.num }}</span>
                  </span>
                </div>
              </div>

              <!-- 操作区 -->
              <div class="flex justify-center pt-[2.5vh] border-t border-white/10">
                <!-- 任务完成横幅 -->
                <div v-if="selectedTask.isCompleted"
                  class="w-full max-w-[45vh] px-[3vh] py-[2vh] rounded-2xl text-center bg-gradient-to-r from-[#fbbf24]/15 to-[#f59e0b]/10 border border-[#fbbf24]/40">
                  <div class="text-[2.6vh] font-bold text-[#fde68a] iconfont2">🎉 {{ L('taskDoneBanner') }}</div>
                  <div class="text-[1.7vh] text-[#fde68a]/70 mt-[0.6vh]">{{ L('taskDoneBannerDesc') }}</div>
                </div>
                <!-- 完成当前步骤按钮 -->
                <div v-else-if="currentStepObj" @click="completeCurrentStep"
                  class="px-[4vh] py-[1.4vh] rounded-xl text-[2.2vh] font-bold cursor-pointer bg-gradient-to-r from-[#667eea] to-[#a78bfa] text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_2vh_rgba(102,126,234,0.35)]">
                  ✅ {{ L('taskCompleteStepBtn') }}
                </div>
              </div>
            </div>
          </div>

          <!-- 未选中任务 -->
          <div v-else key="empty" class="h-full flex flex-col items-center justify-center gap-[1.8vh]">
            <div class="text-[6vh]">🗂️</div>
            <div class="text-[2.6vh] font-bold text-white/50 iconfont2">{{ L('taskSelectHint') }}</div>
            <div class="text-[1.9vh] text-white/35">{{ L('taskSelectHintDesc') }}</div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCounterStore } from "@/store/counter";
import { tr } from "@/i18n";
import { ElMessage } from 'element-plus'
import { t } from '@/i18n';

const user = useCounterStore();
const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// 当前选中的标签页（主线/支线）
const activeTab = ref('main')
// 状态筛选：all | active | completed
const statusFilter = ref('all')
// 当前选中的任务
const selectedTask = ref(null)

// 主线任务列表
const mainTasks = computed(() => user.allTasks.mainTasks || [])
// 支线任务列表
const sideTasks = computed(() => user.allTasks.sideTasks || [])

// 分类标签（主线/支线）
const typeTabs = computed(() => [
  { value: 'main', label: 'taskTabMain', icon: '📋', count: mainTasks.value.length },
  { value: 'side', label: 'taskTabSide', icon: '📌', count: sideTasks.value.length },
])

// 当前标签页的任务总数（用于状态筛选计数）
const activeTabTasks = computed(() => activeTab.value === 'main' ? mainTasks.value : sideTasks.value)

const statusFilters = computed(() => [
  { value: 'all', label: 'taskFilterAll', count: activeTabTasks.value.length },
  { value: 'active', label: 'taskFilterActive', count: activeTabTasks.value.filter(t => !t.isCompleted).length },
  { value: 'completed', label: 'taskFilterCompleted', count: activeTabTasks.value.filter(t => t.isCompleted).length },
])

// 顶部汇总（全部任务）
const totalActiveCount = computed(() => {
  return [...mainTasks.value, ...sideTasks.value].filter(t => !t.isCompleted).length
})
const totalCompletedCount = computed(() => {
  return [...mainTasks.value, ...sideTasks.value].filter(t => t.isCompleted).length
})

// 过滤后的任务列表
const filteredTasks = ref([])

// 过滤任务
function filterTasks() {
  let tasks = [...activeTabTasks.value]

  // 🕶️ 隐藏任务（dladmin 任务编辑中勾选「隐藏」）不显示
  tasks = tasks.filter(t => !t.hidden)

  if (statusFilter.value === 'active') tasks = tasks.filter(t => !t.isCompleted)
  else if (statusFilter.value === 'completed') tasks = tasks.filter(t => t.isCompleted)

  filteredTasks.value = tasks

  // 如果当前选中的任务不在过滤后的列表中，取消选中
  if (selectedTask.value && !tasks.find(t => t.id === selectedTask.value.id)) {
    selectedTask.value = tasks.length > 0 ? tasks[0] : null
  }
}

// 切换分类标签
function switchTab(tab) {
  activeTab.value = tab
  filterTasks()
  // 默认选中第一个任务
  if (filteredTasks.value.length > 0) {
    selectedTask.value = filteredTasks.value[0]
  }
}

// 选择任务
function selectTask(task) {
  selectedTask.value = task
}

// 获取已完成的步骤数
function getCompletedSteps(task) {
  return (task.steps || []).filter(s => s.isCompleted).length
}

// 任务总进度百分比
function taskProgress(task) {
  const total = task.steps?.length || 0
  if (!total) return 0
  return Math.round((getCompletedSteps(task) / total) * 100)
}

// 判断是否是当前步骤
function isCurrentStep(task, step, index) {
  // 当前步骤是第一个未完成的步骤
  if (step.isCompleted) return false
  const firstUncompletedIndex = task.steps.findIndex(s => !s.isCompleted)
  return index === firstUncompletedIndex
}

// 获取当前步骤对象
const currentStepObj = computed(() => {
  if (!selectedTask.value) return null
  return selectedTask.value.steps.find(s => !s.isCompleted) || null
})

// 显示的步骤列表（已完成的步骤 + 当前步骤，后面的步骤隐藏）
const displaySteps = computed(() => {
  if (!selectedTask.value) return []

  const steps = selectedTask.value.steps || []
  const firstUncompletedIndex = steps.findIndex(s => !s.isCompleted)

  // 如果全部完成了，显示所有步骤
  if (firstUncompletedIndex === -1) {
    return steps.map((step, index) => ({ ...step, originalIndex: index }))
  }

  // 显示已完成的步骤 + 当前步骤（第一个未完成的）
  const visibleCount = firstUncompletedIndex + 1
  return steps
    .slice(0, visibleCount)
    .map((step, index) => ({ ...step, originalIndex: index }))
})

// 当前选中任务的奖励配置（供详情面板展示）
const taskReward = computed(() => {
  if (!selectedTask.value) return null
  return user.getTaskRewardInfo?.(selectedTask.value) || null
})

// 完成当前步骤
function completeCurrentStep() {
  if (!selectedTask.value || !currentStepObj.value) return

  const result = user.completeTaskStep(selectedTask.value.id, currentStepObj.value.id)

  if (result) {
    if (result.taskCompleted) {
      const r = result.reward
      if (r && (r.exp || r.money || r.items.length)) {
        const parts = []
        if (r.exp) parts.push(fmt('taskRewardExp', { n: r.exp }))
        if (r.money) parts.push(fmt('taskRewardMoney', { n: r.money }))
        if (r.items.length) parts.push(r.items.map(i => `${i.name}×${i.num}`).join('、'))
        ElMessage.success(fmt('taskCompleteReward', { r: parts.join(L('taskRewardSep')) }))
      } else {
        ElMessage.success(L('taskCongrats'))
      }
    } else {
      ElMessage.success(L('taskStepDone'))
    }
    // 刷新过滤后的列表
    filterTasks()
  }
}

// 奖励物品图标（assets/daoju 下的 webp）
function getRewardItemImg(imgName) {
  if (!imgName) return ''
  try {
    return new URL(`../../../assets/daoju/${imgName}.webp`, import.meta.url).href
  } catch (e) {
    return ''
  }
}

// 空状态文案
const emptyStateMap = {
  noTask: { emoji: '🗂️', title: 'emptyNoTaskTitle', desc: 'emptyNoTaskDesc' },
  filtered: { emoji: '🔍', title: 'emptyFilteredTitle', desc: 'emptyFilteredDesc' },
}
const emptyEmoji = computed(() => {
  const base = activeTabTasks.value.length === 0 ? emptyStateMap.noTask : emptyStateMap.filtered
  return base.emoji
})
const emptyTitle = computed(() => {
  const base = activeTabTasks.value.length === 0 ? emptyStateMap.noTask : emptyStateMap.filtered
  return L(base.title)
})
const emptyDesc = computed(() => {
  const base = activeTabTasks.value.length === 0 ? emptyStateMap.noTask : emptyStateMap.filtered
  return L(base.desc)
})

// 获取图标URL（保留，兼容后续任务图标）
function getIconUrl(iconName) {
  try {
    return new URL(`../../../assets/images/${iconName}`, import.meta.url).href
  } catch (e) {
    return ''
  }
}

// 初始化
onMounted(() => {
  filterTasks()
  // 默认选中第一个任务
  if (filteredTasks.value.length > 0) {
    selectedTask.value = filteredTasks.value[0]
  }
})
</script>

<style scoped>
/* 当前步骤脉冲动画 */
.step-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(167, 139, 250, 0.4);
  }
  50% {
    box-shadow: 0 0 0 1vh rgba(167, 139, 250, 0);
  }
}

/* 自定义滚动条 */
.task-scrollbar::-webkit-scrollbar {
  width: 0.8vh;
}
.task-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.task-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(167, 139, 250, 0.35);
  border-radius: 1vh;
}
.task-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(167, 139, 250, 0.6);
}

/* 内容切换过渡 */
.jx-fade-enter-active,
.jx-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.jx-fade-enter-from {
  opacity: 0;
  transform: translateY(1vh);
}
.jx-fade-leave-to {
  opacity: 0;
  transform: translateY(-1vh);
}
</style>
