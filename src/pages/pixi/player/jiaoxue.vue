<template>
    <div
        class="w-full h-full relative overflow-hidden rounded-[1.2vh] flex flex-col select-none! text-white bg-gradient-to-br from-[#141430] via-[#182044] to-[#0d2547]">
        <!-- ==================== 背景装饰层 ==================== -->
        <div class="absolute inset-0 pointer-events-none">
            <img src="@/assets/image/beijing.webp" draggable="false"
                class="w-full h-full object-cover opacity-[0.10] mix-blend-screen" />
            <div class="absolute inset-0 bg-gradient-to-b from-[#141430]/70 via-transparent to-[#0d2547]/85"></div>
            <!-- 光晕 -->
            <div class="absolute -top-[8vh] -right-[8vh] w-[45vh] h-[45vh] rounded-full bg-[#fbbf24]/10 blur-[9vh]"></div>
            <div class="absolute -bottom-[10vh] -left-[8vh] w-[40vh] h-[40vh] rounded-full bg-[#38bdf8]/10 blur-[9vh]"></div>
            <div
                class="absolute top-1/3 left-1/2 w-[60vh] h-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a855f7]/5 blur-[12vh]">
            </div>
        </div>

        <!-- ==================== 顶部标题栏 ==================== -->
        <div
            class="relative z-10 flex items-center justify-between px-[3vh] py-[1.8vh] border-b border-white/10 bg-black/25 backdrop-blur-md flex-shrink-0">
            <div class="flex items-center gap-[1.8vh]">
                <div
                    class="w-[5.6vh] h-[5.6vh] rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center text-[3vh] shadow-[0_0_2.5vh_rgba(251,191,36,0.45)]">
                    📖
                </div>
                <div>
                    <h2
                        class="m-0 text-[3.4vh] font-bold iconfont2 bg-gradient-to-r from-[#fbbf24] via-[#fde68a] to-[#f59e0b] bg-clip-text text-transparent leading-none">
                        {{ L('jxTitle') }}</h2>
                    <div class="text-[1.7vh] text-white/45 mt-[0.6vh] tracking-wider">{{ L('jxSubtitle') }}</div>
                </div>
            </div>
            <div class="flex items-center gap-[1vh]">
                <span
                    class="px-[1.8vh] py-[0.7vh] rounded-full text-[1.7vh] font-medium bg-white/5 border border-white/10 text-white/60">
                    📚 {{ fmt('jxTotalItems', { n: totalItems }) }}
                </span>
            </div>
        </div>

        <!-- ==================== 主体 ==================== -->
        <div class="relative z-10 flex-1 flex overflow-hidden min-h-0">
            <!-- ========== 左侧导航 ========== -->
            <aside class="w-[27%] shrink-0 border-r border-white/10 bg-black/15 backdrop-blur-sm overflow-y-auto jx-scroll p-[2.2vh] flex flex-col gap-[2.6vh] box-border">

                <!-- 战斗系统 -->
                <div>
                    <div class="flex items-center gap-[1vh] mb-[1.4vh]">
                        <span class="text-[2.2vh]">⚔️</span>
                        <span class="text-[2.2vh] font-bold text-[#fbbf24] iconfont2">{{ L('jxBattleSystem') }}</span>
                        <span class="h-px flex-1 bg-gradient-to-r from-[#fbbf24]/30 to-transparent"></span>
                    </div>
                    <div class="grid grid-cols-2 gap-x-[1vh] gap-y-[1.2vh]">
                        <div v-for="item in battleItems" :key="item.key"
                            class="relative py-[1.1vh] rounded-xl flex flex-col items-center gap-[0.7vh] cursor-pointer border transition-all duration-300 group"
                            :class="selectedItem === item.key ? 'scale-[1.03]' : 'hover:-translate-y-[0.3vh]'"
                            :style="selectedItem === item.key
                                ? { background: `linear-gradient(180deg, ${getColor(item.key)}26, ${getColor(item.key)}0D)`, borderColor: getColor(item.key) + '88', boxShadow: `0 0 2vh ${getColor(item.key)}33` }
                                : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }"
                            @click="selectItem(item.key)">
                            <div
                                class="w-[5vh] h-[5vh] rounded-full flex items-center justify-center text-[2.6vh] border transition-all duration-300"
                                :style="selectedItem === item.key
                                    ? { background: `radial-gradient(circle at 30% 30%, ${getColor(item.key)}66, ${getColor(item.key)}1A)`, borderColor: getColor(item.key) + 'AA', boxShadow: `0 0 1.5vh ${getColor(item.key)}55` }
                                    : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }">
                                {{ item.icon }}
                            </div>
                            <span class="text-[1.55vh] text-center leading-[1.35] px-[0.4vh] flex items-center justify-center min-h-[4.4vh]"
                                :style="{ color: selectedItem === item.key ? getColor(item.key) : '#aab4c8' }">{{ L(item.name) }}</span>
                            <span v-if="selectedItem === item.key"
                                class="absolute -top-[0.4vh] -right-[0.4vh] w-[2.2vh] h-[2.2vh] rounded-full flex items-center justify-center text-[1.3vh] font-bold text-[#141430]"
                                :style="{ background: getColor(item.key) }">✓</span>
                        </div>
                    </div>
                </div>

                <!-- 游戏机制 -->
                <div>
                    <div class="flex items-center gap-[1vh] mb-[1.4vh]">
                        <span class="text-[2.2vh]">🧩</span>
                        <span class="text-[2.2vh] font-bold text-[#7dd3fc] iconfont2">{{ L('jxGameMechanics') }}</span>
                        <span class="h-px flex-1 bg-gradient-to-r from-[#7dd3fc]/30 to-transparent"></span>
                    </div>
                    <div class="flex flex-col gap-[1vh]">
                        <div v-for="item in gameMechanicsItems" :key="item.key"
                            class="flex items-center gap-[1.2vh] px-[1.4vh] py-[1.1vh] rounded-xl cursor-pointer border transition-all duration-300"
                            :class="selectedItem === item.key ? '' : 'hover:-translate-x-[0.2vh]'"
                            :style="selectedItem === item.key
                                ? { background: `linear-gradient(90deg, ${getColor(item.key)}26, ${getColor(item.key)}0D)`, borderColor: getColor(item.key) + '77', boxShadow: `0 0 1.5vh ${getColor(item.key)}22` }
                                : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }"
                            @click="selectItem(item.key)">
                            <div
                                class="w-[4.4vh] h-[4.4vh] rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/[0.06] border border-white/10 text-[2.4vh]">
                                <img v-if="item.img" :src="item.img" class="w-full h-full object-cover"
                                    draggable="false" />
                                <span v-else>{{ item.icon }}</span>
                            </div>
                            <span class="text-[2.1vh] font-medium truncate flex-1"
                                :style="{ color: selectedItem === item.key ? getColor(item.key) : '#c3cdde' }">{{ L(item.name) }}</span>
                            <span v-if="selectedItem === item.key" class="text-[1.6vh]"
                                :style="{ color: getColor(item.key) }">●</span>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- ========== 右侧内容 ========== -->
            <main class="flex-1 min-w-0 overflow-y-auto jx-scroll p-[3vh] relative">
                <Transition name="jx-fade" mode="out-in">
                    <!-- 空状态 -->
                    <div v-if="!currentContent" key="empty"
                        class="h-full flex flex-col items-center justify-center gap-[2vh]">
                        <img src="@/assets/pixi/question.webp" draggable="false"
                            class="w-[16vh] h-[16vh] object-contain opacity-80 drop-shadow-[0_0_2vh_rgba(251,191,36,0.35)]" />
                        <div class="text-[3vh] font-bold text-white/70 iconfont2">{{ L('jxWelcome') }}</div>
                        <div class="text-[2vh] text-white/40">{{ L('jxClickHint') }}</div>
                    </div>

                    <!-- 内容详情 -->
                    <div v-else :key="selectedItem" class="flex flex-col">
                        <!-- 标题 -->
                        <div class="flex items-center gap-[2vh] mb-[2.5vh]">
                            <div
                                class="w-[7vh] h-[7vh] rounded-2xl flex items-center justify-center text-[3.6vh] border flex-shrink-0 overflow-hidden"
                                :style="{
                                    background: getColor(selectedItem) + '1F',
                                    borderColor: getColor(selectedItem) + '55',
                                    boxShadow: `0 0 2.5vh ${getColor(selectedItem)}33`
                                }">
                                <img v-if="getItemMeta(selectedItem)?.img" :src="getItemMeta(selectedItem).img"
                                    class="w-full h-full object-cover" draggable="false" />
                                <span v-else>{{ getIcon(selectedItem) }}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-[1.2vh]">
                                    <h3 class="m-0 text-[3.8vh] font-bold iconfont2 leading-none truncate"
                                        :style="{ color: getColor(selectedItem) }">
                                        {{ L(currentContent.title) }}
                                    </h3>
                                    <el-tag size="small" effect="dark" class="flex-shrink-0"
                                        :style="{
                                            background: getColor(selectedItem) + '26',
                                            color: getColor(selectedItem),
                                            border: '1px solid ' + getColor(selectedItem) + '55'
                                        }">
                                        {{ currentGroupName }}
                                    </el-tag>
                                </div>
                                <div class="text-[1.8vh] text-white/35 mt-[0.8vh]">{{ L('jxSwitchHint') }}</div>
                            </div>
                        </div>
                        <!-- 分隔线 -->
                        <div class="h-px w-full bg-gradient-to-r from-white/15 via-white/5 to-transparent mb-[2.5vh]">
                        </div>

                        <!-- 说明条目 -->
                        <div class="flex flex-col gap-[1.4vh]">
                            <div v-for="(line, idx) in currentContent.lines" :key="idx"
                                class="flex items-start gap-[1.6vh] p-[2.2vh] rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300 group">
                                <div
                                    class="w-[4.2vh] h-[4.2vh] rounded-lg flex items-center justify-center text-[1.9vh] font-bold flex-shrink-0 mt-[0.2vh] transition-transform duration-300 group-hover:scale-110"
                                    :style="{
                                        background: getColor(selectedItem) + '1F',
                                        color: getColor(selectedItem),
                                        border: `1px solid ${getColor(selectedItem)}40`
                                    }">
                                    {{ String(idx + 1).padStart(2, '0') }}
                                </div>
                                <div class="text-[2.5vh] leading-[1.85] text-[#cfd8ea] font-medium"
                                    v-html="highlightText(renderGuideLine(line))"></div>
                            </div>
                        </div>


                    </div>
                </Transition>
            </main>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { LEVEL_UP_CFG } from "@/store/counter";
import { t } from '@/i18n';

const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
function renderGuideLine(line) {
  return typeof line === 'function' ? line() : L(line)
}
// 游戏机制使用的游戏内素材图片

// 当前选中的小类，默认选中第一个小类
const selectedItem = ref('ice')

// 战斗系统小类列表
const battleItems = [
    { key: 'ice', name: 'jxIceDmg', icon: '❄️' },
    { key: 'water', name: 'jxWaterDmg', icon: '💧' },
    { key: 'fire', name: 'jxFireDmg', icon: '🔥' },
    { key: 'electric', name: 'jxElecDmg', icon: '⚡' },
    { key: 'wind', name: 'jxWindDmg', icon: '🍃' },
    { key: 'poison', name: 'jxPoisonDmg', icon: '☠️' },
    { key: 'physical', name: 'jxPhysDmg', icon: '🛡️' },
]

// 游戏机制小类列表
const gameMechanicsItems = [
    { key: 'save', name: 'jxSave', icon: '💾', img: '' },
    { key: 'battle2', name: 'jxBattle', icon: '⚔️', img: '' },
    { key: 'rest', name: 'jxRest', icon: '🌙', img: '' },
    { key: 'heal', name: 'jxHeal', icon: '💚', img: '' },
    { key: 'event', name: 'jxEvent', icon: '📜', img: '' },
    { key: 'achievement', name: 'jxAchievement', icon: '🏆', img: '' },
    { key: 'favor', name: 'jxFavor', icon: '💕', img: '' },
]

// 每个条目的主题色
const itemColorMap = {
    // 元素属性
    ice: '#7DD3FC',
    water: '#38BDF8',
    fire: '#FB7185',
    electric: '#FDE047',
    wind: '#2DD4BF',
    poison: '#4ADE80',
    physical: '#94A3B8',
    // 游戏机制
    save: '#67C23A',
    battle2: '#F87171',
    rest: '#93C5FD',
    heal: '#4ADE80',
    event: '#C084FC',
    achievement: '#FDE047',
    favor: '#F472B6',
}

// 关键词颜色映射：属性+异常+反应
const keywordColor = {
    // 属性
    '冰属性伤害': '#7DD3FC',
    '水属性伤害': '#38BDF8',
    '火属性伤害': '#FB7185',
    '电属性伤害': '#FDE047',
    '风属性伤害': '#2DD4BF',
    '毒属性伤害': '#4ADE80',
    '物理伤害': '#94A3B8',
    'Ice DMG': '#7DD3FC',
    'Water DMG': '#38BDF8',
    'Fire DMG': '#FB7185',
    'Lightning DMG': '#FDE047',
    'Wind DMG': '#2DD4BF',
    'Poison DMG': '#4ADE80',
    'Physical DMG': '#94A3B8',
    // 异常状态
    '寒霜': '#7DD3FC',
    '湿润': '#38BDF8',
    '灼烧': '#FB7185',
    '电流': '#FDE047',
    '冰冻': '#7DD3FC',
    '流血': '#F87171',
    'Frost': '#7DD3FC',
    'Wet': '#38BDF8',
    'Burn': '#FB7185',
    'Electro': '#FDE047',
    'Freeze': '#7DD3FC',
    'Bleed': '#F87171',
    // 元素反应
    '元素反应伤害': '#A78BFA',
    '融化': '#FF9E77',
    '冻结': '#94D0FF',
    '超导': '#C09DFF',
    '蒸发': '#FF8A80',
    '感电': '#FFE666',
    '爆燃': '#FF5757',
    'Elemental Reaction DMG': '#A78BFA',
    'Melt': '#FF9E77',
    'Superconduct': '#C09DFF',
    'Vaporize': '#FF8A80',
    'Electro-Charged': '#FFE666',
    'Overload': '#FF5757',
    // 通用数值关键词
    '攻击力': '#FBBF24',
    '护甲': '#60A5FA',
    '行动条': '#34D399',
    'ATK': '#FBBF24',
    'Armor': '#60A5FA',
    'Action Bar': '#34D399',
    // 游戏机制
    '自动保存': '#67C23A',
    '精力值': '#E6A23C',
    '好感度': '#F56C6C',
    'Auto Save': '#67C23A',
    'Stamina': '#E6A23C',
    'Affection': '#F56C6C',
    // ---- 暴击新增 ----
    '暴击': '#FF3333',
    '暴击伤害': '#FF4422',
    '暴击率': '#FF7722',
    'Crit': '#FF3333',
    'Crit DMG': '#FF4422',
    'Crit Rate': '#FF7722'
}

// hex 颜色转 rgba
function rgba(hex, alpha) {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
}

// 文本关键字自动高亮（胶囊样式）
function highlightText(str) {
    let html = str
    // 遍历所有关键词替换上色
    Object.keys(keywordColor).forEach(word => {
        const reg = new RegExp(word, 'g')
        const color = keywordColor[word]
        html = html.replace(reg,
            `<span style="color:${color};background:${rgba(color, 0.14)};border:1px solid ${rgba(color, 0.35)};border-radius:0.5vh;padding:0 0.8vh;font-weight:600;white-space:nowrap">${word}</span>`)
    })
    return html
}

// 🧪 元素反应固定伤害（基础值 / 每级成长，从 LEVEL_UP_CFG.elementReaction 读取，升级编辑可配置，不写死）
const ER = LEVEL_UP_CFG?.elementReaction || {};
const erPct = (v, d) => Math.round((v ?? d) * 100);

// 教学内容数据
const contentMap = {
    ice: {
        title: 'jxIceDmg',
        lines: [
            () => L('jx_ice_l1'),
            () => L('jx_ice_l2'),
            () => fmt('jx_ice_l3', { v1: ER.meltBase ?? 162, v2: ER.meltPerLv ?? 3, v3: erPct(ER.meltArmorReduce, 0.1) }),
            () => fmt('jx_ice_l4', { v1: ER.freezeBase ?? 137, v2: ER.freezePerLv ?? 3, v3: erPct(ER.freezeChance, 0.35) }),
            () => fmt('jx_ice_l5', { v1: ER.superconductBase ?? 125, v2: ER.superconductPerLv ?? 3, v3: erPct(ER.superconductPhysUp, 0.25) }),
        ]
    },
    water: {
        title: 'jxWaterDmg',
        lines: [
            () => L('jx_water_l1'),
            () => L('jx_water_l2'),
            () => fmt('jx_water_l3', { v1: ER.vaporizeBase ?? 237, v2: ER.vaporizePerLv ?? 4 }),
            () => fmt('jx_water_l4', { v1: ER.freezeBase ?? 137, v2: ER.freezePerLv ?? 3, v3: erPct(ER.freezeChance, 0.35) }),
            () => fmt('jx_water_l5', { v1: ER.electrochargeBase ?? 162, v2: ER.electrochargePerLv ?? 3, v3: erPct(ER.electrochargeActionDrop, 0.12) }),
        ]
    },
    fire: {
        title: 'jxFireDmg',
        lines: [
            () => L('jx_fire_l1'),
            () => L('jx_fire_l2'),
            () => fmt('jx_fire_l3', { v1: ER.vaporizeBase ?? 237, v2: ER.vaporizePerLv ?? 4 }),
            () => fmt('jx_fire_l4', { v1: ER.meltBase ?? 162, v2: ER.meltPerLv ?? 3, v3: erPct(ER.meltArmorReduce, 0.1) }),
            () => fmt('jx_fire_l5', { v1: ER.overloadBase ?? 100, v2: ER.overloadPerLv ?? 2 }),
        ]
    },
    electric: {
        title: 'jxElecDmg',
        lines: [
            () => L('jx_elec_l1'),
            () => L('jx_elec_l2'),
            () => fmt('jx_elec_l3', { v1: ER.electrochargeBase ?? 162, v2: ER.electrochargePerLv ?? 3, v3: erPct(ER.electrochargeActionDrop, 0.12) }),
            () => fmt('jx_elec_l4', { v1: ER.superconductBase ?? 125, v2: ER.superconductPerLv ?? 3, v3: erPct(ER.superconductPhysUp, 0.25) }),
            () => fmt('jx_elec_l5', { v1: ER.overloadBase ?? 100, v2: ER.overloadPerLv ?? 2 }),
        ]
    },
    wind: {
        title: 'jxWindDmg',
        lines: [
            () => L('jx_wind_l1'),
            () => L('jx_wind_l2'),
            () => L('jx_wind_l3'),
            () => L('jx_wind_l4'),
        ]
    },
    poison: {
        title: 'jxPoisonDmg',
        lines: [
            () => L('jx_poison_l1'),
        ]
    },
    physical: {
        title: 'jxPhysDmg',
        lines: [
            () => L('jx_phys_l1'),
        ]
    },
    // ============ 游戏机制 ============
    save: {
        title: 'jxSave',
        lines: [
            () => L('jx_save_l1'),
        ]
    },
    battle2: {
        title: 'jxBattle',
        lines: [
            () => L('jx_battle_l1'),
        ]
    },
    rest: {
        title: 'jxRest',
        lines: [
            () => L('jx_rest_l1'),
        ]
    },
    heal: {
        title: 'jxHeal',
        lines: [
            () => L('jx_heal_l1'),
            () => L('jx_heal_l2'),
        ]
    },
    event: {
        title: 'jxEvent',
        lines: [
            () => L('jx_event_l1'),
        ]
    },
    achievement: {
        title: 'jxAchievement',
        lines: [
            () => L('jx_ach_l1'),
        ]
    },
    favor: {
        title: 'jxFavor',
        lines: [
            () => L('jx_favor_l1'),
        ]
    },
}

// 当前选中的内容
const currentContent = computed(() => {
    return selectedItem.value ? contentMap[selectedItem.value] : null
})

// 当前条目所属的分类名
const currentGroupName = computed(() => {
    if (battleItems.some(i => i.key === selectedItem.value)) return L('jxBattleSystem')
    if (gameMechanicsItems.some(i => i.key === selectedItem.value)) return L('jxGameMechanics')
    return ''
})

// 总条目数
const totalItems = computed(() => battleItems.length + gameMechanicsItems.length)

// 选择小类
function selectItem(key) {
    selectedItem.value = key
}

// 获取条目的主题色
function getColor(key) {
    return itemColorMap[key] || '#94A3B8'
}

// 获取条目的图标
function getIcon(key) {
    const found = [...battleItems, ...gameMechanicsItems].find(i => i.key === key)
    return found?.icon || '📖'
}

// 获取条目元信息（含图片）
function getItemMeta(key) {
    return [...battleItems, ...gameMechanicsItems].find(i => i.key === key) || null
}
</script>

<style scoped>
/* 深色主题滚动条 */
.jx-scroll::-webkit-scrollbar {
    width: 0.8vh;
}
.jx-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.14);
    border-radius: 1vh;
}
.jx-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(251, 191, 36, 0.4);
}
.jx-scroll::-webkit-scrollbar-track {
    background: transparent;
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
