<template>
    <div class="w-screen h-screen  text-white overflow-hidden relative">
        <div v-show="!battleStarted" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 ">
            <button @click="startBattle" class="px-8 py-4 bg-blue-600 rounded-lg text-xl">
                开始战斗
            </button>
        </div>
        <!-- 星铁行动条 UI -->
        <div class="absolute top-1vh left-1/2 -translate-x-1/2 w-[40%] z-40">
            <el-progress :percentage="100"  :duration="8" :stroke-width="10" striped striped-flow
                :text-inside="false" :show-text="false" />

            <div class="relative w-full h-0">
                <div class="absolute -bottom-5 text-xs text-blue-400 font-bold whitespace-nowrap bg-white/35 rounded-full px-1.5"
                    :style="{ left: player.actionProgress / 10000 * 100 + '%', transform: 'translateX(-50%)' }">
                    <div class="absolute top--1 left-40%"
                        style="width: 0;height: 0;border-left: 4px solid transparent;border-right: 4px solid transparent; border-bottom: 4px solid rgba(255, 255, 255, 0.5);">
                    </div>
                    主角
                </div>
                <div v-for="a in allies.filter(x => x.hp > 0)" :key="a.name"
                    class="absolute -bottom-5 text-xs text-cyan-400 font-bold whitespace-nowrap bg-white/35 rounded-full px-1.5 "
                    :style="{ left: a.actionProgress / 10000 * 100 + '%', transform: 'translateX(-50%)' }">
                    <div class="absolute top--1 left-40%"
                        style="width: 0;height: 0;border-left: 4px solid transparent;border-right: 4px solid transparent; border-bottom: 4px solid rgba(255, 255, 255, 0.5);">
                    </div>
                    {{ a.name }}
                </div>
                <div v-for="enemy in enemies.filter(item => item.hp > 0)" :key="enemy.name"
                    class="absolute -bottom-5 text-xs text-red-400 font-bold whitespace-nowrap bg-white/35 rounded-full px-1.5"
                    :style="{ left: enemy.actionProgress / 10000 * 100 + '%', transform: 'translateX(-50%)' }">
                    <div class="absolute top--1 left-40%"
                        style="width: 0;height: 0;border-left: 4px solid transparent;border-right: 4px solid transparent; border-bottom: 4px solid rgba(255, 255, 255, 0.5);">
                    </div>
                    {{ enemy.name }}
                </div>
            </div>
        </div>
        <div class="absolute top-2vh right-1vw bg-black/40 px-1vw py-1.5vh rounded text-#FAFAFA z-50 text-1.2vw ">
            <div class="iconfont2">回合 {{ battle.state.round }}</div>
        </div>
        <!-- ✅ 新增：玩家动态血条 -->
        <!-- <div class="absolute top-3vh left-1vw w-[22vw] z-50">
            <div class="absolute z-2 text-2.5vh font-bold left-0.5vw h-4.5vh flex items-center"> HP {{
                Math.ceil(player.hp) }} / {{ player.maxHp }}</div>
            <div class="relative w-full h-4.5vh rounded-full bg-gray-900/80 overflow-hidden shadow-inner">
                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-600 ease-out"
                    :class="hpBarColorClass.delayed" :style="{ width: hpPercent + '%' }"></div>
                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-out"
                    :class="hpBarColorClass.main" :style="{ width: hpPercent + '%' }"></div>
                <div class="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-full pointer-events-none">
                </div>
            </div>
        </div> -->
        <template v-if="showEndButton">

            <div class="absolute top-2vh right-7.5vw  text-white bg-#F56C6C z-2 text-1.3vw py-1.4vh px-1vw rounded-2"
                @click="myEndPlayerTurn">结束回合</div>

            <el-icon class="absolute! right-1vw top-10vh z-2" color="#333" @click="openAllCardPopup">
                <InfoFilled />
            </el-icon>
        </template>

        <!-- 卡牌 ====================== 核心修改在这里 ====================== -->
        <div v-for="(card, i) in playerHand" :key="card.id" ref="cardRefs"
            class="absolute  rounded-lg pointer-events-auto overflow-hidden w-[20vh] h-[30.54vh] transition-transform duration-300 ease-out"
            :class="[
                getCardCursorClass(card),
                getCardOpacityClass(card),
                showCards ? 'card-show' : 'card-hide'
            ]" :style="{
                left: (showCards ? card.x : getCardTargetX(i)) + 'px',
                top: (showCards ? card.y : card.y + (13 / 100) * vh) + 'px',
                zIndex: card.dragging ? 999 : 10,
                transform: card.dragging ? 'rotate(0deg)' : `rotate(${card.angle || 0}deg)`,
                transformOrigin: 'bottom center',
                transition: card.dragging ? 'none' : 'left 0.3s ease, top 0.3s ease, transform 0.3s ease'
            }" @mousedown="handleCardDrag($event, card)" @touchstart="handleCardDrag($event, card)">

            <div class="spine-here absolute inset-0"></div>

            <template v-if="card.spineLoaded">
                <div v-if="card.name.length === 2"
                    class="mt-1.2vh absolute text-3vh iconfont2 w-100% ml-0.5vh text-center" :style="{
                        color: getCardTextColor(card.name),
                        textShadow: '0 0 2px #000, 0 0 4px #000, 0 1px 2px rgba(0,0,0,0.5)'
                    }">
                    {{ card.name }}
                </div>
                <div v-else-if="card.name.length === 3"
                    class="mt-1.2vh absolute text-3vh iconfont2 w-100% left-1vh text-center" :style="{
                        color: getCardTextColor(card.name),
                        textShadow: '0 0 2px #000, 0 0 4px #000, 0 1px 2px rgba(0,0,0,0.5)'
                    }">
                    {{ card.name }}
                </div>
                <div v-else class="mt-1.2vh absolute text-3vh iconfont2 w-70% left-4.3vh text-center" :style="{
                    color: getCardTextColor(card.name),
                    textShadow: '0 0 2px #000, 0 0 4px #000, 0 1px 2px rgba(0,0,0,0.5)'
                }">
                    {{ card.name }}
                </div>

                <div class="absolute top-0.2vh left-1.5vh text-#409EFF text-3.5vh font-bold">
                    {{ card.cost }}
                </div>
                <div v-if="card.disabledLevel > 0 || (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn)"
                    class="absolute right-1vh top-0.65vh text-2.56vh bg-#F56C6C/80 px-1 rounded ">
                    次数用尽
                </div>
                <div v-else-if="card.cooldown > 0" class="absolute top-1 right-1 text-xs bg-black/60 px-1 rounded z-50">
                    {{ card.cooldown }}
                </div>
            </template>
        </div>

        <CardDetailPopup v-model:visible="showCardPopup" :hand-cards="playerHand" :player="player" :allies="allies"
            :enemies="enemies" />
        <pixiIndex :mp="player.mp" :maxMp="player.maxMp" />
    </div>
</template>

<script setup>
import { reactive, computed, onMounted, nextTick, ref, onUnmounted } from 'vue'
import { createUnit } from './Unit.js'
import { ElMessage } from 'element-plus'
import { createCard } from './Card.js'
import { useCardDrag } from './drag.js'
import { createBattle } from './battle.js'
import { createEnemyGroup } from './EnemyGroup.js'
import { createAllies } from './TeamAllies.js'
import { useSkill } from './SkillLogic.js'
import { resetFastReload } from './SkillReset'
import CardDetailPopup from './CardDetailPopup.vue'
import { createCardSpine, getCardTextColor, destroyAllCardSpines } from './CardSpine'
import { loadAssets } from "@/components/loadAssets.js";
import { useDrone, useSkillShadowClone, useSkillReflect } from './SkillDamage';
import { getAllSummons } from './SkillLogic.js';
import pixiIndex from './pixi.vue'
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
const emit = defineEmits(['fight-end'])

const vw = window.innerWidth
const vh = window.innerHeight
const showCardPopup = ref(false)
// 战斗启动开关，页面载入默认未开始
const battleStarted = ref(false)
const cardSpineList = ref([])
function openAllCardPopup() {
    showCardPopup.value = true
}

// 手动启动战斗
async function startBattle() {
    battleStarted.value = true
    // battle内部计时器正式开始运行
    battle.resumeLoop()

    // user.pixi.player.playerHand[3] = '瘴气'
    // // 执行替换
    // await replaceCard(3, '瘴气')
    // emit('fight-end', { isWin: true, score: 100 })
}
const spineRefreshLock = new Map()
async function refreshSingleCardSpine(targetIndex) {
    // 上锁，正在刷新直接返回，避免并发创建多个Application
    if (spineRefreshLock.get(targetIndex)) return
    spineRefreshLock.set(targetIndex, true)

    try {
        const cardWidth = window.innerWidth * 0.5
        const cardHeight = cardWidth * 1.45
        const spineWrappers = document.querySelectorAll('.spine-here')
        const card = playerHand.value[targetIndex]
        const wrap = spineWrappers[targetIndex]

        if (!card || !wrap) return

        // 彻底销毁旧实例
        const oldSpine = cardSpineList.value[targetIndex];
        if (oldSpine?.destroy) oldSpine.destroy();

        const result = await createCardSpine(card.name, cardWidth, cardHeight)

        if (!result || !result.canvas) return

        wrap.innerHTML = ''
        const canvas = result.canvas
        canvas.style.cssText = `
            position: absolute; left: 0; top: 0; width: 100%; height: 100%; 
            display: block; pointer-events: none;
        `
        wrap.appendChild(canvas)

        card.spineLoaded = true
        cardSpineList.value[targetIndex] = result

        await nextTick()
    } finally {
        // 无论成功失败都解锁
        spineRefreshLock.set(targetIndex, false)
    }
}
async function replaceCard(index, newCardName) {
    // 1. 边界校验
    if (index < 0 || index >= playerHand.value.length) return

    // 2. 替换手牌数据（必须用 createCard 新建，不能直接改原对象 name）
    playerHand.value[index] = createCard(newCardName)

    // 3. 重新计算所有卡牌的弧形位置（数量不变也建议执行，保证布局一致）
    calcArcCardPos()

    // 4. 等待 DOM 更新后，刷新对应下标的 Spine 渲染
    await nextTick()
    await refreshSingleCardSpine(index)
}
function calcArcCardPos() {
    const total = playerHand.value.length;
    if (total === 0) return;

    const screenCenterX = (45 / 100) * vw;
    const baseBottomY = (72 / 100) * vh;
    const cardGap = (7 / 100) * vw;
    const maxRotate = 15;
    const arcHeight = (6 / 100) * vh;

    for (let i = 0; i < total; i++) {
        const card = playerHand.value[i];
        const mid = (total - 1) / 2;
        const off = i - mid;

        const angle = mid === 0 ? 0 : (off / mid) * maxRotate;
        const x = screenCenterX + off * cardGap;
        const ratio = Math.abs(off) / mid || 0;
        const y = baseBottomY + ratio * ratio * arcHeight;

        card.x = x;
        card.y = y;
        card.baseX = x;
        card.baseY = y;
        card.angle = angle;
    }
}
const getCardTargetX = (index) => {
    return playerHand.value[index].x;
};
let result = null
onMounted(async () => {
    await loadAssets()
    await nextTick()
    const cardWidth = window.innerWidth * 0.5
    const cardHeight = cardWidth * 1.45
    const spineWrappers = document.querySelectorAll('.spine-here')
    cardSpineList.value = [] // 清空旧实例
    for (let i = 0; i < playerHand.value.length; i++) {

        const card = playerHand.value[i]
        const wrap = spineWrappers[i]
        if (!wrap) continue

        result = await createCardSpine(card.name, cardWidth, cardHeight)
        if (!result || !result.canvas) continue

        wrap.innerHTML = ''
        const canvas = result.canvas
        canvas.style.cssText = `
            position: absolute; left: 0; top: 0; width: 100%; height: 100%; 
            display: block; pointer-events: none;
        `
        wrap.appendChild(canvas)
        card.spineLoaded = true
        cardSpineList.value.push(result)
    }


})
// 血量百分比（0-100）
const hpPercent = computed(() => {
    return Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
});

// 血条动态颜色：根据血量自动切换绿/黄/红
const hpBarColorClass = computed(() => {
    const pct = hpPercent.value;
    if (pct <= 30) {
        return {
            main: 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
            delayed: 'bg-red-700/60'
        };
    } else if (pct <= 60) {
        return {
            main: 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
            delayed: 'bg-orange-700/60'
        };
    }
    return {
        main: 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
        delayed: 'bg-green-700/60'
    };
});
/* ===== 单位 ===== */
const player = createUnit({
    ...user.pixi.player.juese,
    x: user.pixi.activePlayer.x,
    y: user.pixi.activePlayer.y
})
console.log('player=', player);

const allies = reactive(createAllies())
const enemies = ref([])

const playerHand = ref(
    user.pixi.player.playerHand.map(name => createCard(name))
)
const usedCardThisTurn = []
let diren = user.pixi.npcDataList.filter((item) => item.mapId === "desert_02")
console.log('user.pixi.npcInstance=',user.pixi.npcInstance);
enemies.value = []
const totalEnemies = diren.length; 
for (let i = 0; i < diren.length; i++) {
    const {x,y} = user.pixi.npcInstance[i].npcFight(i,totalEnemies)
    enemies.value.push(
        createUnit({
            ...diren[i].data,  // 保留原data的所有属性（name/hp/attack等）
            x: x,     // 追加x坐标
            y: y*0.9      // 追加y坐标
        })
    )
}
console.log('enemies=', enemies.value);
/* ===== 战斗核心（创建但不自动启动计时） ===== */
const battle = createBattle(
    player,
    allies,
    enemies.value,
    useCard,
    () => {
        // 未开始战斗直接阻断回合重置逻辑
        if (!battleStarted.value) return
        const hasShadowClone = allies.some(a => a.isShadowClone && a.hp > 0);
        playerHand.value.forEach(card => {
            if (card.name === '影分身' && hasShadowClone) {
                card.usedCount = 0;
                return;
            }
            if (card.cooldown > 0 && !usedCardThisTurn.includes(card)) {
                card.cooldown--;
            }
            card.usedCount = 0;
        });
        usedCardThisTurn.length = 0;
    },
    playerHand.value
);

playerHand.value.forEach((card, i) => {
    card.dragging = false
    card.disabledLevel = 0

    if (card.name === '激光' && card.activeEvos?.includes('超频释放')) {
        card.cost += 1
    }
    if (card.name === '无人机' && card.activeEvos.includes('自动部署')) {
        useDrone(player, allies, card)
    }
    if (card.name === '影分身' && card.activeEvos.includes('自动召唤')) {
        useSkillShadowClone(player, allies, enemies.value, battle, card)
        card.cooldown++
    }
    if (card.name === '聚灵' && card.activeEvos.includes('快速使用')) {
        card.cooldown -= 2
    }
    if (card.name === '反弹' && card.activeEvos.includes('自动释放')) {
        useSkillReflect(player, card)
        const extraArmor = Math.floor(player.armor * 0.1)
        player.armor += extraArmor
    }
    if (card.name === '毒雾' && card.activeEvos.includes('快速启动')) {
        card.cooldown -= 2
    }
})
calcArcCardPos();
const { endPlayerTurn } = battle
function myEndPlayerTurn() {
    if (!battleStarted.value) return
    endPlayerTurn()
    playerHand.value.forEach(card => {
        resetFastReload(card)
    })
    nextTick(() => calcArcCardPos());
}

const canDrag = computed(() => {
    // 必须战斗已开始才能拖拽卡牌
    return battleStarted.value && battle.state.currentActor === 'player' && battle.state.phase === 'action'
})

const showCards = computed(() => {
    return battleStarted.value && battle.state.currentActor === 'player' && battle.state.phase === 'action'
})

const showEndButton = computed(() => {
    return battleStarted.value && battle.state.currentActor === 'player' && battle.state.phase === 'action'
})

const getCardCursorClass = (card) => {
    if (card.cooldown > 0 || (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn)) {
        return 'cursor-not-allowed'
    }
    return 'cursor-grab'
}

const getCardOpacityClass = (card) => {
    return {
        'opacity-50 grayscale-[100%]':
            card.disabledLevel > 0 ||
            card.cooldown > 0 ||
            (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn)
    }
}

function isCardUsable(card) {
    if (!battleStarted.value) return false
    if (card.disabledLevel > 0) return false
    const isLimitReached = card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn
    return canDrag.value && !isLimitReached && card.cooldown <= 0 && player.mp >= card.cost
}

const { startDrag } = useCardDrag(playerHand.value, vh, battle.playerUseCard)

function useCard(card) {
    if (!battleStarted.value) return 0
    if (card.name === '无人机') {
        const droneCount = getAllSummons('drone').length;
        if (droneCount >= 6) {
            ElMessage.warning('无人机已达上限');
      card.dragging = false;
      card.x = card.baseX;
      card.y = card.baseY;
      // 强制触发位置重排，确保归位
      nextTick(() => calcArcCardPos());
            return 0; // 直接返回，不扣蓝、不使用卡牌
        }
    }
    if (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn) return 0
    if (player.mp < card.cost) return 0

    if (card.limitPerTurn > 0) card.usedCount++
    player.mp -= card.cost

    const animTime = useSkill(card.name, player, enemies.value, allies, battle, card, playerHand.value, user)
    usedCardThisTurn.push(card)
    card.cooldown = card.maxCooldown

    card.x = card.baseX
    card.y = card.baseY
    card.dragging = false
    return animTime
}

let msgLock = false
function handleCardDrag(e, card) {
    if (!battleStarted.value) return
    const usable = isCardUsable(card)
    if (!usable) {
        if (msgLock) return
        msgLock = true

        if (card.disabledLevel > 0) {
            ElMessage.warning({ message: "卡牌已禁用", duration: 900 })
        } else if (card.cooldown > 0) {
            ElMessage.warning({ message: "正在冷却中", duration: 900 })
        } else if (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn) {
            ElMessage.warning({ message: "本回合次数已用尽", duration: 900 })
        } else if (player.mp < card.cost) {
            ElMessage.warning({ message: "灵力不足", duration: 900 })
        }

        setTimeout(() => msgLock = false, 900)
        return
    }
    startDrag(e, card)
}
// 组件销毁：清空战斗定时器、清理spine画布、重置状态
onUnmounted(async () => {
    // 1️⃣ 先停所有战斗逻辑
    battle.pauseLoop()
    battle.destroyBattle()
    cardSpineList.value.forEach((item, i) => {
        item?.destroy?.();
    });

    cardSpineList.value.length = 0

    // 4️⃣ 最后再清 DOM
    requestAnimationFrame(() => {
        document.querySelectorAll('.spine-here').forEach(el => el.innerHTML = '')
    })
    destroyAllCardSpines()
})
</script>

<style scoped>
* {
    font-family: "Microsoft YaHei", "微软雅黑", STHeiti, SimHei, sans-serif !important;
}
</style>