<template>
  <div class="w-full h-95vh flex flex-col bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-[#e0e0e0] overflow-hidden rounded-[1vh]">
    <!-- 顶部标题栏 -->
    <div class="flex justify-between items-center px-[3vh] py-[1.5vh] border-b border-white/10 bg-black/20">
      <h2 class="text-[4vh] font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
        任务列表
      </h2>
      <div class="flex gap-[2vh]">
        <el-switch
          v-model="showCompleted"
              style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
          active-text="显示已完成"
          inactive-text="隐藏已完成"
          inline-prompt
          @change="filterTasks"
        />
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧任务列表 -->
      <div class="w-[25vw] border-r border-white/10 flex flex-col bg-black/15 flex-shrink-0">
        <!-- 分类标签 -->
        <el-tabs v-model="activeTab" class="px-[2vh] mt-[1.5vh] " @tab-change="onTabChange">
          <el-tab-pane label="主线任务" name="main">
            <span class="mr-[0.8vh]">📋</span>
            <span class="text-[2vh]">主线任务</span>
            <span class="ml-[1vh] px-[1vh] py-[0.3vh] bg-[#667eea]/20 rounded-full text-[1.5vh] text-[#667eea]">
              {{ mainTasks.length }}
            </span>
          </el-tab-pane>
          <el-tab-pane label="支线任务" name="side">
            <span class="mr-[0.8vh]">📌</span>
            <span class="text-[2vh]">支线任务</span>
            <span class="ml-[1vh] px-[1vh] py-[0.3vh] bg-[#667eea]/20 rounded-full text-[1.3vh] text-[#667eea]">
              {{ sideTasks.length }}
            </span>
          </el-tab-pane>
        </el-tabs>

        <!-- 任务列表 -->
        <div class="flex-1 overflow-y-auto p-[1.5vh] task-scrollbar">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="flex items-center p-[1.5vh] mb-[1vh] bg-white/5 rounded-[1vh] cursor-pointer transition-all duration-300 border border-transparent hover:bg-white/10 hover:translate-x-[0.5vh]"
            :class="{
              'opacity-60 grayscale': task.isCompleted,
              'bg-[#667eea]/15 border-[#667eea]/50': selectedTask?.id === task.id
            }"
            @click="selectTask(task)"
          >
            <div class="w-[7vh] h-[7vh] mr-[2vh] flex items-center justify-center bg-white/10 rounded-[1vh] flex-shrink-0">
              <img v-if="task.icon" :src="getIconUrl(task.icon)" :alt="task.name" class="w-full h-full object-contain" />
              <span v-else class="text-[2.5vh]">{{ task.type === 'main' ? '📋' : '📌' }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div 
                class="text-[2.3vh] font-medium mb-[0.5vh] truncate"
                :class="{ 'line-through': task.isCompleted }"
              >
                {{ task.name }}
              </div>
              <div class="text-[1.6vh] text-[#888]">
                进度: {{ getCompletedSteps(task) }}/{{ task.steps.length }}
              </div>
            </div>
            <div class="flex-shrink-0">
              <el-tag v-if="task.isCompleted" type="success" size="small">已完成</el-tag>
              <el-tag v-else type="warning" size="small">进行中</el-tag>
            </div>
          </div>

          <div v-if="filteredTasks.length === 0" class="py-[8vh] px-[3vh] text-center text-[#666]">
            <el-empty description="暂无任务" />
          </div>
        </div>
      </div>

      <!-- 右侧任务详情 -->
      <div class="flex-1 overflow-y-auto p-[3vh] task-scrollbar">
        <div v-if="selectedTask" >
          <!-- 任务标题 -->
          <div class="flex w-full  items-center gap-[1.5vh]  pb-[2vh] border-b border-white/10">
            <h3 
              class="m-0 text-[3.6vh] font-semibold flex-1"
              :class="{ 'line-through text-[#888]': selectedTask.isCompleted }"
            >
              {{ selectedTask.name }}
            </h3>
            <el-tag :type="selectedTask.type === 'main' ? 'danger' : 'info'" size="small">
              {{ selectedTask.type === 'main' ? '主线' : '支线' }}
            </el-tag>
          </div>

          <!-- 任务描述 -->
          <div class="mb-[3vh] p-[2vh] bg-white/5 rounded-[1vh] border-l-[0.4vh] border-[#667eea]">
            <div class="text-[2.4vh] text-[#888] mb-[1vh] uppercase tracking-wider">任务描述</div>
            <p class="m-0 text-[2vh] leading-[3vh] text-[#ccc]">{{ selectedTask.description }}</p>
          </div>


          <!-- 任务步骤 -->
          <div class="mb-[3vh]">
            <div class="text-[1.3vh] text-[#888] mb-[1.5vh] uppercase tracking-wider">任务步骤</div>
            <div class="flex flex-col gap-[1vh]">
              <div
                v-for="step in displaySteps"
                :key="step.id"
                class="flex items-start p-[1.8vh] px-[2vh] bg-white/5 rounded-[1vh] transition-all duration-300 border-l-[0.4vh] border-transparent"
                :class="{
                  'border-l-[#67c23a]': step.isCompleted,
                  'bg-[#667eea]/10 border-l-[#667eea] shadow-[0_0_2.5vh_rgba(102,126,234,0.2)]': isCurrentStep(selectedTask, step, step.originalIndex)
                }"
              >
                <div 
                  class="w-[3.5vh] h-[3.5vh] mr-[1.5vh] flex items-center justify-center bg-white/10 rounded-full text-[2vh] flex-shrink-0"
                  :class="{
                    'bg-[#67c23a] text-white': step.isCompleted,
                    'bg-[#667eea] text-white step-pulse': isCurrentStep(selectedTask, step, step.originalIndex)
                  }"
                >
                  <span v-if="step.isCompleted">✓</span>
                  <span v-else class=" ml-4% mb-5%">{{ step.originalIndex + 1 }}</span>
                </div>
                <div class="flex-1 flex items-center gap-[1.5vh]">
                  <span 
                    class="text-[2vh] leading-[2.5vh] flex-1 mt-0.6vh"
                    :class="{
                      'line-through text-[#888]': step.isCompleted,
                      'text-white font-bold': isCurrentStep(selectedTask, step, step.originalIndex)
                    }"
                  >
                    {{ step.content }}
                  </span>
                  <span 
                    v-if="isCurrentStep(selectedTask, step, step.originalIndex) && !step.isCompleted"
                    class="px-[1vh] py-[0.3vh] bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-[0.5vh] text-[1.2vh] text-white font-medium flex-shrink-0"
                  >
                    当前
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-center pt-[2.5vh] border-t border-white/10">
            <el-button
              v-if="!selectedTask.isCompleted && currentStepObj"
              type="primary"
              @click="completeCurrentStep"
            >
              完成当前步骤
            </el-button>
            <el-button
              v-if="selectedTask.isCompleted"
              type="success"
              disabled
            >
              任务已完成
            </el-button>
          </div>
        </div>

        <!-- 未选中任务时的空状态 -->
        <div v-else class="h-full flex items-center justify-center">
          <el-empty description="请选择一个任务查看详情" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCounterStore } from "@/store/counter";
import { ElMessage } from 'element-plus'

const user = useCounterStore();

// 当前选中的标签页
const activeTab = ref('main')
// 是否显示已完成的任务（默认不显示）
const showCompleted = ref(false)
// 当前选中的任务
const selectedTask = ref(null)

// 主线任务列表
const mainTasks = computed(() => user.allTasks.mainTasks || [])
// 支线任务列表
const sideTasks = computed(() => user.allTasks.sideTasks || [])

// 过滤后的任务列表
const filteredTasks = ref([])

// 过滤任务
function filterTasks() {
  let tasks = activeTab.value === 'main' ? mainTasks.value : sideTasks.value
  
  if (!showCompleted.value) {
    tasks = tasks.filter(task => !task.isCompleted)
  }
  
  filteredTasks.value = tasks
  
  // 如果当前选中的任务不在过滤后的列表中，取消选中
  if (selectedTask.value && !tasks.find(t => t.id === selectedTask.value.id)) {
    selectedTask.value = tasks.length > 0 ? tasks[0] : null
  }
}

// 标签页切换
function onTabChange() {
  selectedTask.value = null
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
  return task.steps.filter(s => s.isCompleted).length
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
  
  const steps = selectedTask.value.steps
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

// 完成当前步骤
function completeCurrentStep() {
  if (!selectedTask.value || !currentStepObj.value) return
  
  const result = user.completeTaskStep(selectedTask.value.id, currentStepObj.value.id)
  
  if (result) {
    if (result.taskCompleted) {
      ElMessage.success('🎉 恭喜！任务已完成！')
    } else {
      ElMessage.success('步骤已完成！')
    }
    // 刷新过滤后的列表
    filterTasks()
  }
}

// 获取图标URL
function getIconUrl(iconName) {
  // 这里可以根据实际的图标路径来调整
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
/* Element Plus 组件样式覆盖 */

:deep(.el-tabs__item.is-active) {
  color: #409EFF !important;
}
:deep(.el-tabs__item) {
  color: #F2F3F5 !important;
}

:deep(.el-tabs__active-bar) {
  background-color: #409EFF !important;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

/* 当前步骤脉冲动画 */
.step-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 0 0 1vh rgba(102, 126, 234, 0);
  }
}

/* 自定义滚动条 */
.task-scrollbar::-webkit-scrollbar {
  width: 0.8vh;
}

.task-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.task-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.4vh;
}

.task-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
