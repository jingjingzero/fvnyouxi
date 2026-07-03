<template>
    <div
        class="w-full h-95vh flex flex-col bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-[#e0e0e0] overflow-hidden rounded-[1vh]">
        <!-- 顶部标题栏 -->
        <div class="flex justify-between items-center px-[3vh] py-[2vh] border-b border-white/10 bg-black/20">
            <h2
                class="m-0 text-[2.2vh] font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
                人物图鉴
            </h2>
        </div>

        <!-- 主内容区 -->
        <div class="flex-1 flex overflow-hidden">
            <!-- 左侧NPC列表 -->
            <div class="w-[15vw] border-r border-white/10 flex flex-col bg-black/15 flex-shrink-0">
                <div class="flex-1 overflow-y-auto p-[1.5vh] npc-scrollbar">
                    <div v-for="npc in npcList" :key="npc.img"
                        class="flex items-center p-[1.5vh] mb-[1vh] bg-white/5 rounded-[1vh] cursor-pointer transition-all duration-300 border border-transparent hover:bg-white/10 hover:translate-x-[0.5vh]"
                        :class="{
                            'bg-[#667eea]/15 border-[#667eea]/50': selectedNpc?.img === npc.img
                        }" @click="selectNpc(npc)">
                        <!-- 头像 -->
                        <div
                            class="w-[6vh] h-[6vh] mr-[1.5vh] rounded-full overflow-hidden bg-white/10 flex-shrink-0 border-2 border-white/20">
                            <img :src="getHeadImg(npc.img)" :alt="npc.name" class="w-full h-full object-cover" />
                        </div>
                        <!-- 信息 -->
                        <div class="flex-1 min-w-0">
                            <div class="text-[2vh] font-medium mb-[0.8vh]">
                                {{ npc.name }}
                            </div>
                            <!-- 好感度等级 -->
                            <div class="flex items-center gap-[0.8vh]">
                                <span class="text-[2vh] font-medium" :class="getAffectionColor(npc.affection)">
                                    {{ getAffectionLevel(npc.affection) }}
                                </span>
                                <span class="text-[2vh] text-[#666]">
                                    {{ getUnlockedStoryCount(npc) }}/{{ npc.backstories?.length || 0 }} 故事
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右侧NPC详情 -->
            <div class="flex-1 overflow-y-auto p-[3vh] npc-scrollbar">
                <div v-if="selectedNpc" class="h-full flex flex-col">
                    <!-- 上半部分：左右布局 - 左头像，右信息 -->
                    <div class="flex gap-[4vh] mb-[3vh]">
                        <!-- 左侧：头像 + buff -->
                        <div class="flex flex-col items-center flex-shrink-0">
                            <div
                                class="w-[15vh] h-[15vh] rounded-full overflow-hidden bg-white/10 border-[0.4vh] border-[#667eea]/50 shadow-[0_0_3vh_rgba(102,126,234,0.3)] mb-[2vh]">
                                <img :src="getHeadImg(selectedNpc.img)" :alt="selectedNpc.name"
                                    class="w-full h-full object-cover" />
                            </div>
                            <!-- 好感度等级 -->
                            <div class="px-[2vh] py-[0.8vh] rounded-full text-[1.4vh] font-semibold"
                                :class="getAffectionBgClass(selectedNpc.affection)">
                                {{ getAffectionLevel(selectedNpc.affection) }}
                            </div>
                        </div>

                        <!-- 右侧：人物介绍 -->
                        <div class="flex-1 flex flex-col">
                            <div class="text-[2h] text-white mb-[1.5vh] uppercase tracking-wider font-bold">人物介绍</div>
                            <div class="flex-1 p-[1.5vh] bg-white/5 rounded-[1vh] border-l-[0.4vh] border-[#667eea]">
                                <p class="m-0 text-[1.9vh] leading-[3.5vh] text-[#ccc]">
                                    {{ selectedNpc.description }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 下半部分：背景故事手风琴 -->
                    <div class="flex-1 flex flex-col min-h-0 ">
                        <div
                            class="text-[1.8vh] text-[#888] mb-[1.5vh] uppercase tracking-wider flex items-center gap-[1vh]">
                            背景故事
                            <span class="text-[1.8vh] text-[#666]">
                                ({{ getUnlockedStoryCount(selectedNpc) }}/{{ selectedNpc.backstories?.length || 0 }}
                                已解锁)
                            </span>
                        </div>
                        <div class="flex-1 overflow-y-auto pr-[1vh]">
                            <el-collapse v-model="activeCollapse" class="bg-transparent border-0 w-full" accordion>
                                <el-collapse-item v-for="story in selectedNpc.backstories" :key="story.id"
                                    :name="story.id" :disabled="!story.unlocked" class="mb-[1vh]">
                                    <template #title>
                                        <div class="flex items-center justify-between  pl-1.5vw">
                                            <div class="flex items-center gap-[1vh]">
                                                <!-- 锁图标统一白色 -->
                                                <el-icon v-if="!story.unlocked" color="#ffffff">
                                                    <Lock />
                                                </el-icon>
                                                <span class="text-[2.5vh] font-medium"
                                                    :class="story.unlocked ? 'text-white' : 'text-white'">
                                                    {{ story.title }}
                                                </span>
                                            </div>
                                            <!-- 右侧解锁提示文字改为白色 -->
                                            <span v-if="!story.unlocked" class="text-[2vh] text-white">
                                                未解锁
                                            </span>
                                        </div>
                                    </template>
                                    <!-- 内容区域：p左右内边距取消，外层撑开宽度，背景铺满整个折叠item -->
                                    <div
                                        class="w-full -mx-[1vh] px-[2vh] py-[1.5vh] text-[2vh] leading-[3vh] text-[#ccc] indent-[3vh] bg-[rgba(255,255,255,0.05)]">
                                        {{ story.content }}
                                    </div>
                                </el-collapse-item>
                            </el-collapse>
                        </div>
                    </div>
                </div>

                <!-- 未选中NPC时的空状态 -->
                <div v-else class="h-full flex items-center justify-center">
                    <el-empty description="请选择一个人物查看详情" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCounterStore } from "@/store/counter";
import { Lock, Unlock } from '@element-plus/icons-vue'

const user = useCounterStore();

// NPC列表
const npcList = computed(() => user.pixi.npcSelectList || [])

// 已解锁的故事总数
const unlockedStoriesCount = computed(() => {
    let count = 0
    npcList.value.forEach(npc => {
        if (npc.backstories) {
            count += npc.backstories.filter(s => s.unlocked).length
        }
    })
    return count
})

// 当前选中的NPC
const selectedNpc = ref(null)
// 手风琴展开的项（切换人物时重置为空，收起所有手风琴）
const activeCollapse = ref([])

// 选择NPC
function selectNpc(npc) {
    selectedNpc.value = npc
    // 切换人物时收起所有手风琴
    activeCollapse.value = []
}

// 获取头像图片
function getHeadImg(imgName) {
    try {
        return new URL(`../../../assets/fullBody/head/${imgName}.webp`, import.meta.url).href
    } catch (e) {
        return ''
    }
}

// 获取好感度等级文字
function getAffectionLevel(affection) {
    return user.getAffectionLevel(affection)
}

// 获取好感度对应的颜色类
function getAffectionColor(affection) {
    if (affection >= 90) return 'text-[#ff6b6b]'
    if (affection >= 70) return 'text-[#ff8c00]'
    if (affection >= 50) return 'text-[#ffd700]'
    if (affection >= 25) return 'text-[#67c23a]'
    return 'text-[#888]'
}

// 获取好感度对应的背景类
function getAffectionBgClass(affection) {
    if (affection >= 90) return 'bg-[#ff6b6b]/20 text-[#ff6b6b]'
    if (affection >= 70) return 'bg-[#ff8c00]/20 text-[#ff8c00]'
    if (affection >= 50) return 'bg-[#ffd700]/20 text-[#ffd700]'
    if (affection >= 25) return 'bg-[#67c23a]/20 text-[#67c23a]'
    return 'bg-[#888]/20 text-[#888]'
}

// 获取已解锁的故事数量
function getUnlockedStoryCount(npc) {
    if (!npc.backstories) return 0
    return npc.backstories.filter(s => s.unlocked).length
}

// 初始化
onMounted(() => {
    // 默认选中第一个NPC
    if (npcList.value.length > 0) {
        selectedNpc.value = npcList.value[0]
    }
})
</script>

<style scoped>
/* Element Plus 手风琴样式覆盖 */
:deep(.el-collapse) {
    border: none;
    background: transparent;
    margin: 0;
    padding: 0;
}

:deep(.el-collapse-item) {
    border: none;
    margin-bottom: 1vh;
}

/* 最后一个去掉底部间距 */
:deep(.el-collapse-item:last-child) {
    margin-bottom: 0;
}

:deep(.el-collapse-item__header) {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 1vh;
    padding: 1.5vh 2vh;
    height: auto;
    line-height: 1.5;
    border-bottom: none !important;
    border: none;
}

:deep(.el-collapse-item__header.is-active) {
    border-radius: 1vh 1vh 0 0;
}

:deep(.el-collapse-item__wrap) {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 0 0 1vh 1vh;
    border: none;
    border-bottom: none;
    overflow: hidden;
}

:deep(.el-collapse-item__content) {
    padding: 0;
    padding-bottom: 0 !important;
    border: none;
}

:deep(.el-collapse-item.is-disabled .el-collapse-item__header) {
    opacity: 0.6;
    cursor: not-allowed;
}

/* 清除可能的伪元素 */
:deep(.el-collapse-item::before),
:deep(.el-collapse-item::after),
:deep(.el-collapse::before),
:deep(.el-collapse::after) {
    display: none;
}

:deep(.el-collapse-item__arrow) {
    color: #fff !important;
}

:deep(.el-collapse-item__arrow.is-active) {
    color: #fff !important;
}

:deep(.el-collapse-item__arrow svg) {
    fill: #ffffff !important;
}


:deep(.el-collapse-item__header) {
    padding: 0;
}
</style>
