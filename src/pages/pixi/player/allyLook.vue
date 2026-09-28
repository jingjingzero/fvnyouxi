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
                    👥
                </div>
                <div>
                    <h2
                        class="m-0 text-[3.4vh] font-bold iconfont2 bg-gradient-to-r from-[#818cf8] via-[#a78bfa] to-[#c084fc] bg-clip-text text-transparent leading-none">
                        {{ L('allyViewTitle') }}</h2>
                    <div class="text-[1.7vh] text-white/45 mt-[0.6vh] tracking-wider">{{ L('allyViewSubtitle') }}</div>
                </div>
            </div>
            <div class="flex items-center gap-[1.2vh]">
                <span
                    class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.8vh] font-medium bg-white/5 border border-white/10 text-white/70">
                    👥 {{ fmt('allyTotal', { n: allyList.length }) }}
                </span>
                <span v-if="currentAlly"
                    class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.8vh] font-medium bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fde68a] iconfont2">
                    ✦ {{ fmt('allyCurrentCarry', { n: currentAlly.name }) }}
                </span>
                <span v-else
                    class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.8vh] font-medium bg-white/5 border border-white/10 text-white/40">
                    {{ L('allyNoCarry') }}
                </span>
            </div>
        </div>

        <!-- ==================== 主体 ==================== -->
        <div class="relative z-10 flex-1 flex overflow-hidden min-h-0">
            <!-- ========== 左侧：可携带同伴列表 ========== -->
            <div
                class="w-[30%] shrink-0 border-r border-white/10 bg-black/10 backdrop-blur-sm flex flex-col overflow-hidden">
                <!-- 排序工具栏 -->
                <div class="flex items-center gap-[0.8vh] px-[1.8vh] py-[1.2vh] border-b border-white/10 flex-shrink-0">
                    <span class="text-[1.6vh] text-white/40 mr-[0.3vh]">{{ L('sortLabel') }}</span>
                    <div v-for="s in sortOptions" :key="s.value"
                        class="px-[1.4vh] py-[0.6vh] rounded-full text-[1.6vh] font-medium cursor-pointer border transition-all duration-300"
                        :class="sortMode === s.value
                            ? 'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/60'
                            : 'bg-white/5 text-white/50 border-white/15 hover:bg-white/10 hover:text-white/80'"
                        @click="sortMode = s.value">
                        {{ L(s.label) }}
                    </div>
                </div>

                <!-- 列表 -->
                <div class="flex-1 overflow-y-auto p-[1.6vh] npc-scrollbar">
                    <template v-if="sortedAllyList.length">
                        <div v-for="npc in sortedAllyList" :key="npc.img"
                            class="relative flex items-center gap-[1.2vh] px-[1.5vh] py-[1.3vh] rounded-2xl mb-[1.2vh] cursor-pointer transition-all duration-300 border"
                            :class="selectedImg === npc.img
                                ? 'bg-gradient-to-r from-[#667eea]/30 to-[#764ba2]/20 border-[#a78bfa]/60 shadow-[0_0_2vh_rgba(102,126,234,0.3)]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'"
                            @click="selectNpc(npc.img)">
                            <!-- 头像（好感度等级色描边；携带中为金色） -->
                            <div
                                class="w-[9.5vh] h-[9.5vh] rounded-full overflow-hidden bg-white/5 border-[0.35vh] flex-shrink-0 transition-all duration-300"
                                :style="npc.img === currentAllyImg
                                    ? { borderColor: '#fbbf24', boxShadow: '0 0 1.8vh rgba(251,191,36,0.45)' }
                                    : { borderColor: getTier(npc.affection).color, boxShadow: `0 0 1.5vh ${getTier(npc.affection).color}44` }">
                                <img :src="getHeadImg(npc.img)" :alt="npc.name" class="w-full h-full object-cover" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-[0.8vh] mb-[0.6vh]">
                                    <span v-if="npc.img === currentAllyImg" class="text-[2vh] flex-shrink-0">✨</span>
                                    <span class="text-[2.6vh] font-bold text-white truncate">{{ tr(npc.name) }}</span>
                                    <span
                                        class="flex-shrink-0 text-[1.5vh] font-bold px-[1vh] py-[0.2vh] rounded-md bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white shadow">
                                        Lv.{{ getAllyData(npc.img)?.level ?? 1 }}
                                    </span>
                                </div>
                                <!-- 迷你经验条 -->
                                <el-progress :percentage="allyExpPercent(npc.img)" :stroke-width="5" :show-text="false"
                                    color="#a78bfa" :trail-color="'rgba(255,255,255,0.1)'" class="!mb-[0.4vh]" />
                                <div class="flex items-center justify-between mt-[0.3vh]">
                                    <span class="text-[1.4vh] text-[#e0e0e0]/40">
                                        {{ getAllyData(npc.img)?.exp ?? 0 }}/{{ getAllyData(npc.img)?.maxExp ?? 50 }}
                                    </span>
                                    <span class="text-[1.4vh] font-semibold"
                                        :style="{ color: getTier(npc.affection).color }">
                                        {{ getTier(npc.affection).icon }} {{ Math.min(100, npc.affection ?? 0) }}
                                    </span>
                                </div>
                            </div>
                            <!-- 携带/卸下快捷按钮 -->
                            <div class="flex flex-col items-center gap-[0.5vh] flex-shrink-0">
                                <el-button v-if="npc.img === currentAllyImg" type="danger" size="small" round
                                    class="!h-[3.5vh] !px-[1.5vh] !text-[1.6vh] !font-bold"
                                    @click.stop="carryNpc(false, npc.img)">
                                    ✕ {{ L('allyUnequip') }}
                                </el-button>
                                <el-button v-else type="success" size="small" round
                                    class="!h-[3.5vh] !px-[1.5vh] !text-[1.6vh] !font-bold"
                                    @click.stop="carryNpc(true, npc.img)">
                                    ✦ {{ L('allyCarry') }}
                                </el-button>
                            </div>
                        </div>
                    </template>

                    <!-- 空状态 -->
                    <div v-else class="h-full flex flex-col items-center justify-center gap-[1.5vh]">
                        <div class="text-[5vh]">👥</div>
                        <div class="text-[2.2vh] font-bold text-white/60 iconfont2">{{ L('allyNoCarryList') }}</div>
                    </div>
                </div>
            </div>

            <!-- ========== 右侧：详情面板 ========== -->
            <div class="flex-1 min-w-0 overflow-y-auto p-[3vh] npc-scrollbar">
                <template v-if="detail">
                    <!-- 头部卡片：头像 + 名字 + 好感度 + 标签 -->
                    <div
                        class="relative flex items-center gap-[3vh] mb-[3vh] p-[2.5vh] rounded-2xl bg-gradient-to-r from-[#667eea]/15 to-[#764ba2]/10 border border-[#667eea]/25 overflow-hidden">
                        <div
                            class="absolute top-0 right-0 w-[20vh] h-[20vh] rounded-full bg-[#a78bfa]/10 blur-[5vh] pointer-events-none">
                        </div>
                        <div class="w-[15vh] h-[15vh] rounded-full overflow-hidden bg-white/5 border-[0.4vh] flex-shrink-0"
                            :style="{
                                borderColor: isCurrentCarried ? '#fbbf24' : getTier(selectedInfo?.affection).color,
                                boxShadow: isCurrentCarried
                                    ? '0 0 3vh rgba(251,191,36,0.4)'
                                    : `0 0 3vh ${getTier(selectedInfo?.affection).color}55`
                            }">
                            <img :src="getHeadImg(selectedImg)" :alt="detail.name" class="w-full h-full object-cover" />
                        </div>
                        <div class="relative flex-1 min-w-0">
                            <div class="flex items-center gap-[1.5vh] mb-[1vh] flex-wrap">
                                <span class="text-[4vh] font-bold text-white iconfont2">{{ tr(detail.name) }}</span>
                                <span
                                    class="text-[2.4vh] font-bold px-[1.5vh] py-[0.3vh] rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white shadow">
                                    Lv.{{ detail.level ?? 1 }}
                                </span>
                                <!-- 好感度等级徽章（点击查看好感度战斗加成） -->
                                <el-popover :width="300" trigger="click" placement="top" :show-arrow="false"
                                    popper-class="ally-aff-popover" :persistent="false">
                                    <template #reference>
                                        <span class="px-[1.6vh] py-[0.4vh] rounded-full text-[1.8vh] font-semibold border cursor-pointer" @click.stop
                                            :style="{
                                                color: getTier(selectedInfo?.affection).color,
                                                borderColor: getTier(selectedInfo?.affection).color + '55',
                                                background: getTier(selectedInfo?.affection).color + '1A'
                                            }">
                                            {{ getTier(selectedInfo?.affection).icon }} {{ L('affectionLabel') }} {{ Math.min(100, selectedInfo?.affection ?? 0) }}
                                        </span>
                                    </template>
                                    <div class="ally-aff-body">
                                        <div class="ally-aff-title">💗 {{ L('affBonusTitle') }}</div>
                                        <div class="ally-aff-rule" v-html="L('affBonusRule')"></div>
                                        <div class="ally-aff-cur" v-html="fmt('affBonusCur', { aff: affBonus(selectedInfo?.affection).aff, pct: affBonus(selectedInfo?.affection).pct })"></div>
                                        <div class="ally-aff-next" v-html="fmt('affBonusNext', { need: affBonus(selectedInfo?.affection).need, from: affBonus(selectedInfo?.affection).aff, to: affBonus(selectedInfo?.affection).aff + affBonus(selectedInfo?.affection).need })"></div>
                                    </div>
                                </el-popover>
                                <!-- 💗 好感度属性加成徽章 -->
                                <span v-if="affectionBonusTotal > 0"
                                    class="px-[1.6vh] py-[0.4vh] rounded-full text-[1.8vh] font-semibold bg-[#fbbf24]/15 text-[#fde68a] border border-[#fbbf24]/40">
                                    ⚡ {{ fmt('affBonusBadge', { atk: detail.affectionAttackBonus || 0, spd: detail.affectionSpeedBonus || 0 }) }}
                                </span>
                                <!-- 携带/卸下按钮 -->
                                <el-button v-if="isCurrentCarried" type="danger" size="small" round
                                    class="!h-[4.5vh] !px-[2.5vh] !text-[1.9vh] !font-bold flex-shrink-0"
                                    @click="carryNpc(false)">
                                    ✕ {{ L('allyUnequip') }}
                                </el-button>
                                <el-button v-else type="success" size="small" round
                                    class="!h-[4.5vh] !px-[2.5vh] !text-[1.9vh] !font-bold flex-shrink-0"
                                    @click="carryNpc(true)">
                                    ✦ {{ L('allyCarry') }}
                                </el-button>
                            </div>
                            <!-- 经验进度条 + 投喂 -->
                            <div class="mb-[1.2vh] max-w-[50vh]">
                                <div class="flex justify-between items-center mb-[0.4vh]">
                                    <span class="text-[1.8vh] text-[#e0e0e0]/60">{{ L('expLabel') }}</span>
                                    <span class="text-[1.8vh] text-[#a78bfa] font-semibold">{{ detail.exp ?? 0 }} /
                                        {{ detail.maxExp ?? 50 }}</span>
                                </div>
                                <div class="flex items-center gap-[1.5vh]">
                                    <el-progress :percentage="detailExpPercent" :stroke-width="10" :show-text="false"
                                        color="#a78bfa" :trail-color="'rgba(255,255,255,0.08)'" class="flex-1" />
                                    <span v-if="isDetailMaxLevel"
                                        class="flex-shrink-0 text-[1.6vh] font-bold px-[1.2vh] py-[0.4vh] rounded-full border"
                                        :class="detail.overflowExp > 0
                                            ? 'bg-[#e6a23c]/20 text-[#e6a23c] border-[#e6a23c]/40'
                                            : 'bg-[#67c23a]/20 text-[#67c23a] border-[#67c23a]/40'">
                                        {{ detail.overflowExp > 0 ? fmt('maxLevelOverflow', { n: detail.overflowExp }) : L('maxLevel') }}
                                    </span>
                                </div>
                            </div>
                            <!-- 标签 -->
                            <div v-if="(detail.tags || []).length" class="flex items-center gap-[1.2vh]">
                                <span v-for="tag in detail.tags" :key="tag"
                                    class="px-[1.5vh] py-[0.5vh] rounded-full text-[1.7vh] bg-[#667eea]/20 text-[#a5b4fc] border border-[#667eea]/30">
                                    {{ tr(tag) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- 介绍 -->
                    <!-- <div v-if="detail.desc"
                        class="mb-[3vh] p-[2.5vh] rounded-2xl bg-white/[0.04] border border-white/10 text-[2.2vh] leading-relaxed text-[#d0d0d0]">
                        {{ detail.desc }}
                    </div> -->

                    <!-- 属性面板 -->
                    <div class="mb-[3vh]">
                        <div
                            class="flex items-center gap-[1vh] mb-[2vh] text-[2.6vh] font-semibold text-white">
                            <span class="text-[2.6vh]">📊</span> {{ L('combatAttrsTitle') }}
                            <span class="h-px flex-1 bg-gradient-to-r from-[#a78bfa]/40 to-transparent"></span>
                        </div>
                        <div class="flex gap-[2vh]">
                            <!-- 左：基础属性 -->
                            <div class="flex-1 rounded-2xl bg-white/5 border border-white/10 p-[2vh]">
                                <div class="text-[2vh] font-semibold text-[#a5b4fc] mb-[1.5vh] flex items-center gap-[0.8vh]">
                                    <span class="w-[0.5vh] h-[2vh] rounded bg-[#667eea]"></span> {{ L('baseAttrsTitle') }}
                                </div>
                                <div v-for="attr in baseAttrs" :key="attr.label"
                                    class="flex justify-between items-center cursor-pointer hover:bg-white/5 rounded-xl px-[1.5vh] py-[1.2vh] -mx-[1vh] transition-all attr-row"
                                    @click="toggleTooltip(attr.label, $event.target)">
                                    <div class="flex items-center gap-x-[1.2vh]">
                                        <div
                                            class="w-[4.5vh] h-[4.5vh] rounded-lg border border-white/10 flex items-center justify-center">
                                            <img :src="attrImg(attr.img)" class="w-[3vh]" />
                                        </div>
                                        <span class="text-white">{{ L(attr.label) }}</span>
                                    </div>
                                    <div class="flex flex-col items-end">
                                        <span class="font-bold text-[3vh]" :style="attr.style">{{ attr.value }}</span>
                                        <span v-if="attr.bonus > 0" class="text-[1.4vh] text-[#fbbf24]/80 mt-[0.2vh]">{{ fmt('bonusIncluded', { n: attr.bonus }) }}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 右：次级属性 -->
                            <div class="flex-1 rounded-2xl bg-white/5 border border-white/10 p-[2vh]">
                                <div class="text-[2vh] font-semibold text-[#a5b4fc] mb-[1.5vh] flex items-center gap-[0.8vh]">
                                    <span class="w-[0.5vh] h-[2vh] rounded bg-[#764ba2]"></span> {{ L('secondAttrsTitle') }}
                                </div>
                                <div v-for="attr in secondAttrs" :key="attr.label"
                                    class="flex justify-between items-center cursor-pointer hover:bg-white/5 rounded-xl px-[1.5vh] py-[1.2vh] -mx-[1vh] transition-all attr-row"
                                    @click="toggleTooltip(attr.label, $event.target)">
                                    <div class="flex items-center gap-x-[1.2vh]">
                                        <div
                                            class="w-[4.5vh] h-[4.5vh] rounded-lg border border-white/10 flex items-center justify-center">
                                            <img :src="attrImg(attr.img)" class="w-[3vh]" />
                                        </div>
                                        <span class="text-white">{{ L(attr.label) }}</span>
                                    </div>
                                    <div class="flex flex-col items-end">
                                        <span class="font-bold text-[3vh]" :style="attr.style">{{ attr.value }}</span>
                                        <span v-if="attr.bonus > 0" class="text-[1.4vh] text-[#fbbf24]/80 mt-[0.2vh]">{{ fmt('bonusIncluded', { n: attr.bonus }) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 技能：普攻 / 技能 -->
                    <div class="grid grid-cols-2 gap-[2vh]">
                        <!-- 普攻 -->
                        <div class="rounded-2xl bg-white/5 border border-white/10 p-[2vh] transition-all duration-300 hover:border-[#a78bfa]/40">
                            <div class="flex items-center gap-[1vh] mb-[1.5vh] text-[2.4vh] font-semibold text-white">
                            {{ L('basicAttack') }}                                <span class="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></span>
                            </div>
                            <div class="text-[2.2vh] text-[#d0d0d0] leading-relaxed">
                                {{ getAllyAttackDesc(detail) }}
                            </div>
                        </div>
                        <!-- 技能 -->
                        <div
                            class="rounded-2xl bg-white/5 border border-[#e6a23c]/30 p-[2vh] transition-all duration-300 hover:border-[#e6a23c]/60">
                            <div v-if="detail.skillList && detail.skillList.length > 1"
                                class="flex flex-wrap gap-[1vh] mb-[1.5vh]">
                                <div v-for="sk in detail.skillList" :key="sk.id"
                                    class="px-[1.8vh] py-[0.6vh] rounded-full cursor-pointer text-[1.8vh] font-semibold transition-all border"
                                    :class="detail.selectedSkillId === sk.id
                                        ? 'bg-[#e6a23c]/30 text-[#ffd666] border-[#e6a23c]/60 shadow'
                                        : 'bg-white/5 text-[#e0e0e0]/70 border-white/10 hover:bg-white/10'"
                                    @click="switchSkill(sk)">
                                    {{ tr(sk.name) }}
                                </div>
                            </div>
                            <div class="flex items-center justify-between mb-[1.5vh]">
                                <span class="text-[2.4vh] font-bold text-[#e6a23c]"> {{ tr(detail.skillName) }}</span>
                                <span
                                    class="px-[1.5vh] py-[0.4vh] rounded-full text-[1.7vh] bg-[#e6a23c]/20 text-[#e6a23c] border border-[#e6a23c]/30">
                                    {{ getAllySkillMeta(detail)?.typeName || L('dmgTypePhysical') }}
                                </span>
                            </div>
                            <div class="text-[2.1vh] text-[#d0d0d0] leading-relaxed mb-[1vh]">{{ detail.skillDesc }}</div>
                            <div class="text-[1.8vh] text-[#e0e0e0]/50">
                                {{ getAllySkillMeta(detail)?.numDesc || '' }}
                            </div>
                        </div>
                    </div>

                    <!-- ⛩️ 地牢被动（携带进入地牢时生效） -->
                    <div v-if="dungeonPassive" class="mt-[2vh]">
                        <div
                            class="rounded-2xl bg-white/5 border border-[#38bdf8]/30 p-[2vh] transition-all duration-300 hover:border-[#38bdf8]/60">
                            <div class="flex items-center gap-[1.5vh] mb-[1.5vh]">
                                <span class="text-[2.4vh] font-bold text-[#38bdf8]">{{ L(dungeonPassive.name) }}</span>
                                <span
                                    class="text-[1.6vh] px-[1vh] py-[0.2vh] rounded-full bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">{{ L('dungeonPassiveLabel') }}</span>
                            </div>
                            <div class="text-[2.1vh] text-[#d0d0d0] leading-relaxed">{{ L(dungeonPassive.desc) }}</div>
                            <div class="mt-[1vh] text-[1.7vh] text-[#38bdf8]/70">{{ L('dungeonPassiveHint') }}</div>
                        </div>
                    </div>

                    <!-- 被动 -->
                    <div v-if="detail.passiveName" class="mt-[2vh]">
                        <div
                            class="rounded-2xl bg-white/5 border border-[#67c23a]/30 p-[2vh] transition-all duration-300 hover:border-[#67c23a]/60">
                            <div class="flex items-center gap-[1.5vh] mb-[1.5vh]">
                                <span class="text-[2.4vh] font-bold text-[#85ce61]">{{ tr(detail.passiveName) }}</span>
                                <span
                                    class="text-[1.6vh] px-[1vh] py-[0.2vh] rounded-full bg-[#67c23a]/20 text-[#67c23a] border border-[#67c23a]/30">{{ L('battlePassiveLabel') }}</span>
                            </div>
                            <div class="text-[2.1vh] text-[#d0d0d0] leading-relaxed">{{ detail.passiveDesc }}</div>
                        </div>
                    </div>

                    <!-- 属性浮层提示 -->
                    <teleport to="body">
                        <div v-if="activeTooltip"
                            class="fixed z-[99999] bg-[#1e1b4b]/95 border border-[#a78bfa]/40 text-white text-[2.2vh] rounded-xl px-[3vh] py-[2vh] shadow-2xl pointer-events-none whitespace-pre-line leading-relaxed"
                            :style="tooltipPos">
                            {{ activeTooltip }}
                        </div>
                    </teleport>
                </template>

                <!-- 无数据 -->
                <div v-else class="flex flex-col items-center justify-center h-full">
                    <div class="text-[6vh] mb-[2vh]">👥</div>
                    <div class="text-[2.6vh] font-bold text-white/50 iconfont2">{{ L('allyNoView') }}</div>
                    <div class="text-[1.9vh] text-white/35 mt-[1vh]">{{ L('allyNoViewHint') }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
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

// 可携带的同伴列表（独立展示列表：来自 store 的 pixi.allyList，不依赖地图 NPC 实体）
// 即使地图上的 NPC 被删除/隐藏，只要在展示列表里就仍会显示
const allyList = computed(() => {
    const list = user.getAllyList?.() || []
    return list.filter(n => n.canAlly !== false)
})

// ============ 同伴排序 ============
const sortMode = ref('default') // default | affection | level
const sortOptions = [
    { value: 'default', label: 'sortDefault' },
    { value: 'affection', label: 'sortAffection' },
    { value: 'level', label: 'sortLevel' },
]
// 排序后的同伴列表
const sortedAllyList = computed(() => {
    const list = [...allyList.value]
    if (sortMode.value === 'affection') {
        list.sort((a, b) => (b.affection ?? 0) - (a.affection ?? 0))
    } else if (sortMode.value === 'level') {
        list.sort((a, b) => (getAllyData(b.img)?.level ?? 1) - (getAllyData(a.img)?.level ?? 1))
    }
    return list
})

// 当前选中的 img
const selectedImg = ref(null)

// 当前携带的 img
const currentAllyImg = computed(() => user.getNpcAlly?.() || null)

// 当前携带的 NPC 信息（优先从地图列表取，其次图鉴）
const currentAlly = computed(() => {
    if (!currentAllyImg.value) return null
    const fromMap = allyList.value.find(n => n.img === currentAllyImg.value)
    if (fromMap) return fromMap
    return user.pixi.npcSelectList?.find(n => n.img === currentAllyImg.value) || null
})

// 选中 NPC 的基础信息（优先从地图列表取好感度，其次图鉴）
const selectedInfo = computed(() => {
    if (!selectedImg.value) return null
    const fromMap = allyList.value.find(n => n.img === selectedImg.value)
    if (fromMap) return fromMap
    return user.pixi.npcSelectList?.find(n => n.img === selectedImg.value) || null
})

// 选中 NPC 的战斗/展示数据（allyBattleData）
// 🎭 detailVersion 用于切换技能后强制刷新（detail 返回同一对象引用，依赖版本号触发重新求值）
const detailVersion = ref(0)
const detail = computed(() => {
    void detailVersion.value // 读取版本号建立依赖
    return getAllyData(selectedImg.value)
})

// 获取队友战斗数据
function getAllyData(img) {
    if (!img) return null
    return user.getAllyBattleData?.(img) || null
}

// ==================== 战斗属性（参考玩家属性查看，去掉生命值/灵力值/护甲，无进度条） ====================
// 基础属性：攻击力
const baseAttrs = computed(() => {
    if (!detail.value) return []
    return [
        {
            label: 'attrAtk',
            img: 'Attack',
            value: detail.value.baseAttack,
            bonus: detail.value.affectionAttackBonus || 0,
            style: { color: '#F56C6C', textShadow: '0 0 0.5px #000' },
            tooltip: L('attrAtkAllyTooltip'),
        },
    ]
})

// 次级属性：速度（NPC 队友无幸运属性）
const secondAttrs = computed(() => {
    if (!detail.value) return []
    return [
        {
            label: 'attrSpeed',
            img: 'Speed',
            value: detail.value.baseSpeed,
            bonus: detail.value.affectionSpeedBonus || 0,
            style: { color: '#5C7FA8', textShadow: '0 0 0.5px #000' },
            tooltip: L('attrSpeedAllyTooltip'),
        },
    ]
})

// 经验进度百分比（供 el-progress 使用）
function expPercent(exp, maxExp) {
    if (!maxExp) return 0
    return Math.min(100, Math.max(0, Math.round((exp / maxExp) * 100)))
}
// 左侧列表某同伴的经验进度
function allyExpPercent(img) {
    const d = getAllyData(img)
    return d ? expPercent(d.exp ?? 0, d.maxExp ?? 50) : 0
}
// 右侧详情当前同伴的经验进度
const detailExpPercent = computed(() => {
    return detail.value ? expPercent(detail.value.exp ?? 0, detail.value.maxExp ?? 50) : 0
})

// 📈 当前同伴是否已满级（等级达到上限）
const isDetailMaxLevel = computed(() => {
    if (!detail.value) return false
    const maxLevel = user.getMaxAllyLevel?.() ?? 30
    return (detail.value.level ?? 1) >= maxLevel
})

// 💗 好感度属性加成合计（用于界面展示）
const affectionBonusTotal = computed(() => {
    return (detail.value?.affectionAttackBonus || 0) + (detail.value?.affectionSpeedBonus || 0)
})

// 属性图标
function attrImg(src) {
    try {
        return new URL(`../../../assets/daoju/${src}.webp`, import.meta.url).href
    } catch (e) {
        return ''
    }
}

// ⛩️ 地牢被动（携带进入地牢时生效；与战斗被动 passiveName 区分）
const DUNGEON_PASSIVES = {
  jinmao: { name: 'dpJinmaoName', desc: 'dpJinmaoDesc' },
  yu: { name: 'dpYuName', desc: 'dpYuDesc' },
  huli: { name: 'dpHuliName', desc: 'dpHuliDesc' },
  tuzi: { name: 'dpTuziName', desc: 'dpTuziDesc' },
}
// 当前选中同伴的地牢被动（无则隐藏）
const dungeonPassive = computed(() => (selectedImg.value ? DUNGEON_PASSIVES[selectedImg.value] : null) || null)

// ==================== 属性浮层提示 ====================
const activeTooltip = ref('')
const tooltipPos = ref({ top: '0px', left: '0px' })

const allAttrMap = computed(() => {
    const map = {}
    baseAttrs.value.forEach(a => { map[a.label] = a.tooltip })
    secondAttrs.value.forEach(a => { map[a.label] = a.tooltip })
    return map
})

function toggleTooltip(label, target) {
    const content = allAttrMap.value[label]
    if (!content) return
    if (activeTooltip.value === content) {
        activeTooltip.value = ''
        return
    }
    activeTooltip.value = content
    nextTick(() => {
        const row = target?.closest?.('.attr-row')
        if (!row) return
        const rect = row.getBoundingClientRect()
        const tipW = 300
        const left = rect.right + 12 + tipW > window.innerWidth
            ? rect.left - tipW - 12
            : rect.right + 12
        tooltipPos.value = {
            top: `${rect.top + rect.height / 2}px`,
            left: `${left}px`,
            transform: 'translateY(-50%)'
        }
    })
}

// 默认选中当前携带的，否则第一个
watch(allyList, (list) => {
    if (list.length === 0) {
        selectedImg.value = null
        return
    }
    if (!list.some(n => n.img === selectedImg.value)) {
        selectedImg.value = currentAllyImg.value && list.some(n => n.img === currentAllyImg.value)
            ? currentAllyImg.value
            : list[0].img
    }
}, { immediate: true })

// 手动选择
function selectNpc(img) {
    selectedImg.value = img
}

// 当前详情查看的同伴是否就是正在携带的
const isCurrentCarried = computed(() => {
    return selectedImg.value && selectedImg.value === currentAllyImg.value
})

// 携带 / 卸下同伴（只能携带一个）
// @param {boolean} carry - true=携带，false=卸下
// @param {string} [img] - 指定同伴 img（省略则用当前选中）
function carryNpc(carry, img) {
    const target = img || selectedImg.value
    if (!target) return
    if (carry) {
        // 携带：setNpcAlly 会自动替换旧的（只保留一个）
        user.setNpcAlly?.(target)
        ElMessText(fmt('allyCarriedMsg', { n: target === selectedImg.value ? tr(detail.value?.name || L('allyCompanion')) : '' }), "success")
    } else {
        user.setNpcAlly?.(null)
        ElMessText(L('allyUnequippedMsg'), "info")
    }
}

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

// 💗 好感度战斗加成（每拥有 50 好感度，进入战斗时同伴全属性 +10%，无上限）
function affBonus(affection) {
    const a = affection ?? 0
    const tiers = Math.floor(a / 50)
    const pct = tiers * 10
    const need = 50 - (a % 50)
    return { aff: a, pct, need }
}

// 伤害类型名称
function getDmgTypeName(type) {
    const map = {
        physical: 'dmgTypePhysical',
        fire: 'dmgTypeFire',
        water: 'dmgTypeWater',
        lightning: 'dmgTypeLightning',
        ice: 'dmgTypeIce',
        poison: 'dmgTypePoison',
    }
    return L(map[type] || 'dmgTypePhysical')
}

// ==================== 🎯 新技能系统：普攻/技能描述 ====================
// 普攻描述（根据 attackType 区分）
function getAllyAttackDesc(d) {
    if (!d) return ''
    const atkType = d.attackType || 'selfAtk'
    const ratio = Math.round((d.attackRatio || 0) * 100)
    const dmgName = getDmgTypeName(d.attackDmgType)
    if (atkType === 'heal') {
        return fmt('allyAtkHeal', { r: ratio })
    }
    // 普攻伤害统一基于同伴自身攻击力
    return fmt('allyAtkDmg', { r: ratio, dmg: dmgName })
}

// 技能描述（根据 skillType 显示核心数值；已有 skillDesc 文案则优先用文案）
function getAllySkillMeta(d) {
    if (!d) return null
    const st = d.skillType || 'damage'
    const cd = d.skillCooldown || 0
    // 各技能类型的补充数值说明
    let numDesc = ''
    if (st === 'enemyDamageTaken') {
        numDesc = fmt('skillEnemyDmgTaken', { v: Math.round((d.skillValue || 0) * 100), cd })
    } else if (st === 'aoePushback') {
        numDesc = fmt('skillAoePushback', { v: Math.round((d.skillValue || 0) * 100), pb: d.skillPushback || 0, cd })
    } else if (st === 'shield') {
        numDesc = fmt('skillShield', { v: Math.round((d.skillValue || 0) * 100), cd })
    } else if (st === 'manaCharge') {
        numDesc = fmt('skillManaCharge', { v: d.skillValue || 0, dur: d.skillDuration || 1, cd })
    } else if (st === 'playerActionBar') {
        numDesc = fmt('skillPlayerActionBar', { v: Math.round(d.skillValue || 0), cd })
    } else if (st === 'heal') {
        numDesc = fmt('skillHeal', { v: Math.round((d.skillValue || 0) * 100), cd })
    } else if (st === 'aoeDamage') {
        numDesc = fmt('skillAoeDamage', { v: Math.round((d.skillValue || 0) * 100), cd })
    } else if (st === 'singleDamage') {
        numDesc = fmt('skillSingleDamage', { v: Math.round((d.skillValue || 0) * 100), cd })
    } else {
        numDesc = fmt('skillDmgMultiplier', { v: Math.round((d.skillValue || 0) * 100), cd })
    }
    return { numDesc, typeName: getDmgTypeName(d.skillDmgType) }
}

// 🎭 切换同伴技能（调用 store 持久化 + 刷新当前显示）
function switchSkill(skill) {
    if (!selectedImg.value || !detail.value || !skill) return
    const ok = user.setAllySelectedSkill?.(selectedImg.value, skill.id)
    if (ok) {
        detailVersion.value++ // 强制 detail 重新求值（刷新技能显示）
        ElMessText(fmt('skillSwitchedMsg', { n: tr(skill.name || skill.id) }), 'success')
    }
}
</script>

<style scoped>
.npc-scrollbar::-webkit-scrollbar {
    width: 1vh;
}
.npc-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(102, 126, 234, 0.4);
    border-radius: 1vh;
}
.npc-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
</style>

<style>
/* 投喂弹窗（el-popover 渲染到 body，需全局样式） */
.feed-popover {
    background: #1e1b4b !important;
    border: 1px solid rgba(167, 139, 250, 0.4) !important;
    border-radius: 1.2vh !important;
    box-shadow: 0 1vh 3vh rgba(0, 0, 0, 0.5) !important;
}
.feed-popover .feed-popover-body {
    padding: 0.5vh 0.5vh;
}
.feed-popover .el-popper__arrow {
    display: none;
}

/* 好感度战斗加成 Popover（el-popover 渲染到 body，需全局样式） */
.ally-aff-popover {
    background: #1e1b4b !important;
    border: 1px solid rgba(167, 139, 250, 0.4) !important;
    border-radius: 1.2vh !important;
    box-shadow: 0 1vh 3vh rgba(0, 0, 0, 0.5) !important;
    padding: 0 !important;
}
.ally-aff-popover .el-popper__arrow { display: none; }
.ally-aff-body { padding: 1.2vh 1.4vh; font-size: 1.5vh; line-height: 1.8; color: #e0e0e0; }
.ally-aff-title { font-size: 1.7vh; font-weight: 800; color: #fbbf24; margin-bottom: 0.8vh; }
.ally-aff-rule { color: #c7cbe6; margin-bottom: 0.8vh; }
.ally-aff-rule b, .ally-aff-cur b, .ally-aff-next b { color: #a78bfa; }
.ally-aff-cur { color: #e0e0e0; margin-bottom: 0.4vh; }
.ally-aff-cur b { color: #fbbf24; }
.ally-aff-next { color: #8a93a6; }
</style>
