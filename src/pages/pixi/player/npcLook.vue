<template>
    <div
        class="w-full h-95vh flex flex-col relative overflow-hidden rounded-[1vh] select-none! text-[#e0e0e0] bg-gradient-to-br from-[#141430] via-[#182044] to-[#0d2547]">
        <!-- ==================== 背景装饰层 ==================== -->
        <div class="absolute inset-0 pointer-events-none">
            <img src="@/assets/image/beijing.webp" draggable="false"
                class="w-full h-full object-cover opacity-[0.08] mix-blend-screen" />
            <div class="absolute inset-0 bg-gradient-to-b from-[#141430]/60 via-transparent to-[#0d2547]/85"></div>
            <div class="absolute -top-[8vh] -right-[8vh] w-[42vh] h-[42vh] rounded-full bg-[#f472b6]/10 blur-[9vh]"></div>
            <div class="absolute -bottom-[10vh] -left-[8vh] w-[38vh] h-[38vh] rounded-full bg-[#a78bfa]/10 blur-[9vh]"></div>
            <div
                class="absolute top-1/3 left-1/2 w-[55vh] h-[55vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#764ba2]/5 blur-[12vh]">
            </div>
        </div>

        <!-- ==================== 顶部标题栏 ==================== -->
        <div
            class="relative z-10 flex justify-between items-center px-[3vh] py-[1.8vh] border-b border-white/10 bg-black/25 backdrop-blur-md flex-shrink-0">
            <div class="flex items-center gap-[1.8vh]">
                <div
                    class="w-[5.6vh] h-[5.6vh] rounded-xl bg-gradient-to-br from-[#f472b6] to-[#a78bfa] flex items-center justify-center text-[3vh] shadow-[0_0_2.5vh_rgba(244,114,182,0.45)]">
                    💞
                </div>
                <div>
                    <h2
                        class="m-0 text-[3.4vh] font-bold iconfont2 bg-gradient-to-r from-[#f472b6] via-[#c084fc] to-[#a78bfa] bg-clip-text text-transparent leading-none">
                        {{ L('nlTitle') }}</h2>
                    <div class="text-[1.7vh] text-white/45 mt-[0.6vh] tracking-wider">{{ L('nlSubtitle') }}</div>
                </div>
            </div>
            <div class="flex items-center gap-[1.2vh]">
                <span
                    class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.8vh] font-medium bg-white/5 border border-white/10 text-white/70">
                    👥 {{ fmt('nlTotal', { n: npcList.length }) }}
                </span>
                <span
                    class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.8vh] font-medium bg-[#f472b6]/10 border border-[#f472b6]/25 text-[#f9a8d4]">
                    💗 {{ fmt('nlAvgAffection', { n: avgAffection }) }}
                </span>
            </div>
        </div>

        <!-- ==================== 排序工具栏 ==================== -->
        <div
            class="relative z-10 flex items-center gap-[1.2vh] flex-wrap px-[3vh] py-[1.6vh] border-b border-white/10 bg-black/10 backdrop-blur-sm flex-shrink-0">
            <div class="flex items-center gap-[0.8vh]">
                <div v-for="s in sortOptions" :key="s.value"
                    class="px-[1.8vh] py-[0.8vh] rounded-full text-[1.8vh] font-medium cursor-pointer border transition-all duration-300"
                    :class="sortMode === s.value
                        ? 'bg-[#f472b6]/20 text-[#f472b6] border-[#f472b6]/60 shadow-[0_0_1.5vh_rgba(244,114,182,0.25)]'
                        : 'bg-white/5 text-white/60 border-white/15 hover:bg-white/10 hover:text-white/80'"
                    @click="sortMode = s.value">
                    {{ L(s.label) }}
                </div>
            </div>
            <div class="ml-auto text-[1.7vh] text-white/35">💡 {{ L('nlClickHint') }}</div>
        </div>

        <!-- ==================== 人物网格 ==================== -->
        <div class="relative z-10 flex-1 overflow-y-auto p-[3vh] npc-scrollbar">
            <template v-if="sortedNpcList.length">
                <div class="grid grid-cols-5 xl:grid-cols-6 gap-[2vh]">
                    <div v-for="npc in sortedNpcList" :key="npc.img"
                        class="npc-card relative flex flex-col items-center gap-[1vh] p-[2.2vh] rounded-2xl border cursor-pointer transition-all duration-300 group"
                        :class="{ 'npc-locked': isLocked(npc) }"
                        :style="{
                            borderColor: getTier(npc.affection).color + '55',
                            background: 'rgba(255,255,255,0.03)',
                            '--tier-color': getTier(npc.affection).color
                        }"
                        @click="openDetail(npc)">
                        <!-- 🔒 未解锁锁定遮罩 -->
                        <div v-if="isLocked(npc)"
                            class="absolute inset-0 z-10 rounded-2xl flex flex-col items-center justify-center gap-[0.8vh] bg-black/60 backdrop-blur-[0.2vh] cursor-not-allowed">
                            <span class="text-[6vh] opacity-90">🔒</span>
                            <span class="text-[1.8vh] text-white/70 font-medium">{{ L('nlLocked') }}</span>
                        </div>

                        <!-- 好感度排名角标 -->
                        <span
                            class="absolute top-[1vh] left-[1vh] w-[3.4vh] h-[3.4vh] rounded-full flex items-center justify-center text-[1.6vh] font-bold border"
                            :style="{
                                color: getTier(npc.affection).color,
                                borderColor: getTier(npc.affection).color + '66',
                                background: getTier(npc.affection).color + '1A'
                            }">
                            #{{ npcList.indexOf(npc) + 1 }}
                        </span>

                        <!-- 圆形头像（按好感度等级变色发光） -->
                        <div
                            class="w-[22vh] h-[22vh] rounded-full overflow-hidden bg-white/5 border-[0.4vh] mb-[0.5vh] transition-transform duration-300 group-hover:scale-105"
                            :style="{
                                borderColor: getTier(npc.affection).color,
                                boxShadow: `0 0 2.5vh ${getTier(npc.affection).color}55`
                            }">
                            <img :src="getHeadImg(npc.img)" :alt="npc.name"
                                class="w-full h-full object-cover transition-all duration-300"
                                :class="{ 'grayscale opacity-40': isLocked(npc) }" />
                        </div>

                        <!-- 姓名 -->
                        <div
                            class="text-[3vh] font-bold text-center truncate w-full iconfont2 transition-all duration-300"
                            :class="isLocked(npc) ? 'text-white/35' : 'text-white'">
                            {{ tr(npc.name) }}
                        </div>

                        <!-- 好感度等级徽章 -->
                        <div class="flex items-center gap-[0.8vh] px-[1.6vh] py-[0.5vh] rounded-full text-[1.8vh] font-semibold border"
                            :style="{
                                color: getTier(npc.affection).color,
                                borderColor: getTier(npc.affection).color + '55',
                                background: getTier(npc.affection).color + '1A'
                            }">
                            <span>{{ getTier(npc.affection).icon }}</span>
                            <span>{{ getTier(npc.affection).label }}</span>
                            <span class="opacity-70">{{ Math.min(100, npc.affection ?? 0) }}</span>
                        </div>

                        <!-- 好感度进度条 -->
                        <div class="w-full h-[1.2vh] rounded-full bg-white/10 overflow-hidden mt-[0.3vh]">
                            <div class="h-full rounded-full transition-all duration-500"
                                :style="{
                                    width: Math.min(100, npc.affection ?? 0) + '%',
                                    background: `linear-gradient(90deg, ${getTier(npc.affection).color}88, ${getTier(npc.affection).color})`
                                }">
                            </div>
                        </div>

                        <!-- 可携带出战标签 -->
                        <span v-if="npc.canAlly && !isLocked(npc)"
                            class="text-[1.5vh] text-white/45">🤝 {{ L('nlCanCarry') }}</span>
                    </div>
                </div>
            </template>

            <!-- 空状态 -->
            <div v-else class="h-full flex flex-col items-center justify-center gap-[1.8vh]">
                <div class="text-[5vh]">💞</div>
                <div class="text-[2.4vh] font-bold text-white/70 iconfont2">{{ L('nlNoNpc') }}</div>
                <div class="text-[1.9vh] text-white/40">{{ L('nlNoNpcHint') }}</div>
            </div>
        </div>

        <!-- ==================== 人物详情弹窗 ==================== -->
        <teleport to="body">
            <Transition name="jx-fade">
                <div v-if="activeDetail" class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[0.3vh]"
                    @click="activeDetail = null">
                    <div
                        class="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border rounded-2xl p-[3.5vh] w-[38vw] max-w-[440px] shadow-2xl"
                        :style="{ borderColor: getTier(activeDetail.affection).color + '66' }">
                        <div class="flex items-center gap-[2.5vh] mb-[2.5vh]">
                            <!-- 大头像 -->
                            <div class="w-[14vh] h-[14vh] rounded-full overflow-hidden bg-white/5 border-[0.4vh] flex-shrink-0"
                                :style="{
                                    borderColor: getTier(activeDetail.affection).color,
                                    boxShadow: `0 0 3vh ${getTier(activeDetail.affection).color}55`
                                }">
                                <img :src="getHeadImg(activeDetail.img)" :alt="activeDetail.name"
                                    class="w-full h-full object-cover" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-[3.4vh] font-bold text-white iconfont2 truncate">{{ tr(activeDetail.name) }}</div>
                                <div class="flex items-center gap-[1vh] mt-[0.8vh]">
                                    <span class="px-[1.4vh] py-[0.4vh] rounded-full text-[1.7vh] font-semibold border"
                                        :style="{
                                            color: getTier(activeDetail.affection).color,
                                            borderColor: getTier(activeDetail.affection).color + '55',
                                            background: getTier(activeDetail.affection).color + '1A'
                                        }">
                                        {{ getTier(activeDetail.affection).icon }} {{ getTier(activeDetail.affection).label }}
                                    </span>
                                    <span v-if="activeDetail.canAlly"
                                        class="px-[1.4vh] py-[0.4vh] rounded-full text-[1.6vh] font-medium bg-[#67c23a]/15 text-[#67c23a] border border-[#67c23a]/40">
                                        🤝 {{ L('nlCanCarry') }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- 好感度 -->
                        <div class="mb-[1.5vh] flex justify-between items-center">
                            <span class="text-[2vh] text-white/70">💗 {{ L('nlAffection') }}</span>
                            <span class="text-[2.6vh] font-bold" :style="{ color: getTier(activeDetail.affection).color }">
                                {{ Math.min(100, activeDetail.affection ?? 0) }} / 100
                            </span>
                        </div>
                        <div class="w-full h-[1.8vh] rounded-full bg-white/10 overflow-hidden mb-[2.5vh]">
                            <div class="h-full rounded-full transition-all duration-500"
                                :style="{
                                    width: Math.min(100, activeDetail.affection ?? 0) + '%',
                                    background: `linear-gradient(90deg, ${getTier(activeDetail.affection).color}88, ${getTier(activeDetail.affection).color})`
                                }">
                            </div>
                        </div>

        

                        <div class="flex justify-end mt-[2.5vh]">
                            <button
                                class="px-[3vh] py-[1.2vh] rounded-xl text-[2vh] font-bold bg-gradient-to-r from-[#f472b6] to-[#a78bfa] text-white hover:brightness-110 transition-all cursor-pointer"
                                @click="activeDetail = null">{{ L('nlGotIt') }}</button>
                        </div>
                    </div>
                </div>
            </Transition>
        </teleport>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useCounterStore } from "@/store/counter";
import { tr } from "@/i18n";
import { ElMessText } from "@/pages/zujian/utils.js";
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

// NPC列表
const npcList = computed(() => user.pixi.npcSelectList || []) // 🔒 未解锁角色显示灰色锁定卡片（npc-locked），入队后恢复

// 🔒 解锁判定：unlocked===false 或「剧情解锁角色（defaultAlly===false）未入队」→ 锁定
const allyImgs = computed(() => new Set((user.pixi.allyList || []).map(a => a.img)))
function isLocked(npc) {
    if (npc.unlocked === false) return true
    if (npc.defaultAlly === false && !allyImgs.value.has(npc.img)) return true
    return false
}

// 平均好感度
const avgAffection = computed(() => {
    const list = npcList.value
    if (!list.length) return 0
    return Math.round(list.reduce((s, n) => s + (n.affection ?? 0), 0) / list.length)
})

// ============ 好感度排序 ============
const sortMode = ref('desc') // desc(高→低) | asc(低→高) | default(默认顺序)
const sortOptions = [
    { value: 'default', label: 'nlSortDefault' },
    { value: 'desc', label: 'nlSortDesc' },
    { value: 'asc', label: 'nlSortAsc' },
]

// 排序后的人物列表（默认顺序保持图鉴原顺序）
const sortedNpcList = computed(() => {
    const list = [...npcList.value]
    if (sortMode.value === 'default') return list
    list.sort((a, b) => {
        const d = (a.affection ?? 0) - (b.affection ?? 0)
        return sortMode.value === 'desc' ? -d : d
    })
    return list
})

// 获取头像图片
function getHeadImg(imgName) {
    try {
        return new URL(`../../../assets/fullBody/head/${imgName}.webp`, import.meta.url).href
    } catch (e) {
        return ''
    }
}

// 好感度等级（按数值分档）
function getTier(affection) {
    const a = affection ?? 0
    if (a >= 90) return { label: L('tierBond'), icon: '💞', color: '#ff6b6b' }
    if (a >= 70) return { label: L('tierIntimate'), icon: '💖', color: '#ff8c00' }
    if (a >= 50) return { label: L('tierFriendly'), icon: '💛', color: '#ffd700' }
    if (a >= 25) return { label: L('tierFamiliar'), icon: '💚', color: '#67c23a' }
    return { label: L('tierStranger'), icon: '🤍', color: '#8a93a6' }
}

// 详情弹窗
const activeDetail = ref(null)
function openDetail(npc) {
    if (isLocked(npc)) {
        ElMessText(fmt('nlLockedMsg', { n: npc.name || L('nlThatNpc') }), 'warning')
        return
    }
    activeDetail.value = npc
}
</script>

<style scoped>
.npc-scrollbar::-webkit-scrollbar {
    width: 1vh;
}
.npc-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(244, 114, 182, 0.4);
    border-radius: 1vh;
}
.npc-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

/* 人物卡片悬停：上浮 + 按好感度等级色发光（--tier-color 由内联样式注入） */
.npc-card:hover {
    transform: translateY(-0.4vh);
    box-shadow: 0 0 2.5vh color-mix(in srgb, var(--tier-color) 30%, transparent);
}

/* 🔒 未解锁卡片：灰化 + 取消悬停上浮 */
.npc-locked {
    filter: saturate(0.35) brightness(0.8);
    border-color: rgba(255, 255, 255, 0.12) !important;
    box-shadow: none !important;
    cursor: not-allowed;
}
.npc-locked:hover {
    transform: none;
    box-shadow: none;
}

/* 弹窗淡入淡出 */
.jx-fade-enter-active,
.jx-fade-leave-active {
    transition: opacity 0.25s ease;
}
.jx-fade-enter-from,
.jx-fade-leave-to {
    opacity: 0;
}
</style>
