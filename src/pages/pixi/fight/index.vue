<template>
    <div class="w-screen h-screen  text-white overflow-hidden relative" :style="battleScreenStyle" @click="onBattleClick">
        <!-- 🎨 战斗背景差异化：跟随地牢天气/血月/昼夜变化（放最底层，UI 全部在其上） -->
        <div class="absolute inset-0 pointer-events-none transition-all duration-700" :style="battleBgStyle"></div>
        <!-- ❤️ 低血量屏幕警示（战斗中也生效：HP<30% 全屏红闪 + 心跳音） -->
        <LowHpOverlay :hp="player.hp" :max-hp="player.maxHp" />
        <!-- 👑 暗影王二阶段文字气泡：屏幕中心通知式（圆形气泡，居中显示，淡入淡出） -->
        <transition name="phase2-bubble">
            <div v-if="phase2Bubble" class="fixed left-[64%] top-[32vh] -translate-x-1/2 z-[200] pointer-events-none select-none">
                <div class="rounded-full bg-black/78 border-2 border-#8B5CF6/80 px-5vh py-2vh text-5vh font-black text-#E9D5FF whitespace-nowrap shadow-[0_0_24px_rgba(139,92,246,0.45)]"
                    style="backdrop-filter: blur(4px); text-shadow: 0 2px 8px rgba(0,0,0,0.8);">
                    {{ phase2Bubble.text }}
                </div>
            </div>
        </transition>
                        <!-- 🎯 星铁式行动条 UI：左侧竖排，行动顺序从下到上（进度越满越靠上，最先行动） -->
        <div ref="actionBarRef" v-show="!isInDialogue" class="absolute left-1vw top-1/2 -translate-y-1/2 h-[62vh] w-[4.5vw] z-40 tour-target-action-bar">
            <!-- 竖条轨道 + 蓝色填充（进入战斗后 0→100 动画填满，之后固定不变） -->
            <div class="absolute inset-y-0 left-0 w-[0.9vw] rounded-full bg-black/55 border border-white/10"></div>
            <div class="absolute bottom-0 left-0 w-[0.9vw] rounded-full bg-gradient-to-t from-#409EFF/50 to-#409EFF/90"
                :style="{ height: actionBarFillPct + '%', transition: 'height 1.2s ease-out' }"></div>
            <!-- 单位标签：按 actionProgress 从下往上定位（底部=刚行动，顶部=即将行动） -->
            <div class="absolute left-[1.3vw] flex items-center gap-0 whitespace-nowrap"
                :style="{ bottom: Math.min(100, Math.max(0, player.actionProgress) / 10000 * 100) + '%', transform: 'translateY(50%)' }">
                <span class="relative text-[2.1vh] font-bold px-2 py-0.5 rounded-full bg-white/40 text-blue-400"><span style="position:absolute;left:-1.2vh;top:50%;transform:translateY(-50%);width:0;height:0;border-top:1vh solid transparent;border-bottom:1vh solid transparent;border-right:1.4vh solid rgba(255,255,255,0.4);"></span>{{ L('playerLabel') }}</span>
            </div>
            <div v-for="a in aliveAllies" :key="a.uid"
                class="absolute left-[1.3vw] flex items-center gap-0 whitespace-nowrap"
                :style="{ bottom: Math.min(100, Math.max(0, a.actionProgress) / 10000 * 100) + '%', transform: 'translateY(50%)' }">
                <span class="relative text-[2.1vh] font-bold px-2 py-0.5 rounded-full bg-white/40 text-cyan-400"><span style="position:absolute;left:-1.2vh;top:50%;transform:translateY(-50%);width:0;height:0;border-top:1vh solid transparent;border-bottom:1vh solid transparent;border-right:1.4vh solid rgba(255,255,255,0.4);"></span>{{ tr(a.name) }}</span>
            </div>
            <div v-for="enemy in aliveEnemies" :key="enemy.uid"
                class="absolute left-[1.3vw] flex items-center gap-0 whitespace-nowrap"
                :style="{ bottom: Math.min(100, Math.max(0, enemy.actionProgress) / 10000 * 100) + '%', transform: 'translateY(50%)' }">
                <span class="relative text-[2.1vh] font-bold px-2 py-0.5 rounded-full bg-white/40 text-red-400"><span style="position:absolute;left:-1.2vh;top:50%;transform:translateY(-50%);width:0;height:0;border-top:1vh solid transparent;border-bottom:1vh solid transparent;border-right:1.4vh solid rgba(255,255,255,0.4);"></span>{{ tr(enemy.name) }}</span>
            </div>
        </div>

<div v-show="!isInDialogue" class="absolute top-2vh right-1vw bg-black/40 px-1vw py-1.5vh rounded text-#FAFAFA z-50 text-1.2vw ">
            <div class="iconfont2" @click="ceshi">{{ L('round') }} {{ battle.state.round }}</div>
        </div>
        <!-- ✅ 新增：玩家动态血条 -->
        <div v-show="!isInDialogue" class="absolute top-2vh left-0.75vw w-[22vw] z-50">
            <div class="absolute z-2 text-2.5vh font-bold left-0.5vw h-4.5vh flex items-center gap-1">
                <span>HP {{ Math.ceil(player.hp) }} / {{ player.maxHp }}</span>
                <span v-if="player.shield > 0" class="text-sky-300">🛡️ {{ Math.ceil(player.shield) }}</span>
            </div>
            <div class="relative w-full h-4.5vh rounded-full bg-gray-900/80 overflow-hidden shadow-inner">
                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-600 ease-out"
                    :class="hpBarColorClass.delayed" :style="{ width: hpPercent + '%' }"></div>
                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-out"
                    :class="hpBarColorClass.main" :style="{ width: hpPercent + '%' }"></div>
                <!-- 护盾条虚影：受到攻击时红色滞后收回（损失护盾警示；与血条一致：绑当前值+慢速transition，无需状态） -->
                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-600 ease-out bg-red-700/60"
                    :style="{ width: shieldPercent + '%' }"></div>
                <!-- 护盾条：叠在血条上方，蓝色渐变 -->
                <div v-if="shieldPercent > 0"
                    class="absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-out bg-gradient-to-r from-sky-400 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                    :style="{ width: shieldPercent + '%' }"></div>
                <div class="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-full pointer-events-none">
                </div>
            </div>
            <!-- 🎯 DOM 层透明可点击区域：整条 buff 行可点击，弹出详情（覆盖 buff/毒/减速所有图标） -->
            <div v-show="!isInDialogue && (allBuffsForPopover.length > 0 || playerSlowDebuffs.length > 0)"
                @click="showBuffPopover = true; selectedBuffIdx = 0"
                class="absolute left-0 cursor-pointer" style="top: 5.5vh; min-height: 6vh; min-width: 20vw; pointer-events: auto; z-index: 51;">
            </div>
        </div>

        <!-- 🎖️ 玩家 buff 详情 Popover：点击血条下方 buff 图标弹出 -->
        <Teleport to="body">
            <div v-if="showBuffPopover" class="fixed inset-0 z-[9999] flex items-start justify-start" style="pointer-events:none">
                <div class="absolute left-0.75vw" style="top: 12vh; pointer-events:auto;">
                    <div class="w-[26vw] rounded-xl bg-[#1a1530]/95 border border-#4a3a7a shadow-2xl overflow-hidden" style="backdrop-filter: blur(8px);">
                        <!-- 标题栏 -->
                        <div class="px-3vh py-1.8vh bg-white/5 border-b border-white/10 flex items-center justify-between">
                            <span class="text-2.7vh font-bold text-white">玩家状态</span>
                            <button @click="showBuffPopover = false" class="text-black hover:text-black/70 text-2vh px-1vh font-bold">✕</button>
                        </div>
                        <!-- 主体：左侧列表 + 右侧详情 -->
                        <div class="flex" style="min-height: 18vh;">
                            <!-- 左侧 buff 列表 -->
                            <div class="w-[8vw] border-r border-white/10 overflow-y-auto" style="max-height: 30vh;">
                                <div v-for="(b, i) in allBuffsForPopover" :key="i"
                                    @click="selectedBuffIdx = i"
                                    class="px-1.5vh py-1.2vh cursor-pointer border-l-2 transition-all"
                                    :class="selectedBuffIdx === i ? 'border-amber-400 bg-amber-400/10' : 'border-transparent hover:bg-white/5'">
                                    <div class="text-2.2vh leading-tight" :style="{ color: buffColorOf(b.name), opacity: selectedBuffIdx === i ? 1 : 0.6 }">{{ b.name }}</div>
                                </div>
                                <div v-if="allBuffsForPopover.length === 0" class="px-2vh py-3vh text-white/30 text-2.2vh text-center">无状态</div>
                            </div>
                            <!-- 右侧详情 -->
                            <div class="flex-1 p-2.5vh">
                                <template v-if="selectedBuff">
                                    <div class="text-2.7vh font-bold mb-1.2vh" :style="{ color: buffColorOf(selectedBuff.name) }">{{ selectedBuff.name }}</div>
                                    <div class="text-2.2vh leading-relaxed space-y-0.6vh" :style="{ color: buffColorOf(selectedBuff.name) + 'CC' }">
                                        <div v-if="selectedBuff.remaining && selectedBuff.remaining < 999 && !selectedBuff.isGrouped">剩余回合：<b class="text-amber-300">{{ selectedBuff.remaining }}</b></div>
                                        <div v-if="selectedBuff.stack || selectedBuff.stack === 0">层数：<b class="text-amber-300">{{ selectedBuff.stack ?? 1 }}</b></div>

                                        <div v-if="poisonDamagePreview !== null">每回合受到 <b class="text-red-400">{{ poisonDamagePreview }}</b> 点毒属性伤害</div>                                 <div v-if="bleedDamagePreview !== null">每回合受到 <b class="text-red-400">{{ bleedDamagePreview }}</b> 点流血伤害</div>
                                        <!-- 👑 首领：全属性加成详情 -->
                                        <template v-if="selectedBuff.name === '首领'">
                                            <div v-if="selectedBuff.atkUp" class="mt-0.6vh">⚔️ 攻击力 <b class="text-amber-300">+{{ selectedBuff.atkUp }}</b><span v-if="selectedBuff.atkPct" class="text-amber-300/80">（+{{ selectedBuff.atkPct }}%）</span></div>
                                            <div v-if="selectedBuff.armorUp" class="mt-0.4vh">🛡️ 护甲 <b class="text-amber-300">+{{ selectedBuff.armorUp }}</b></div>
                                            <div v-if="selectedBuff.luckUp" class="mt-0.4vh">🍀 幸运 <b class="text-amber-300">+{{ selectedBuff.luckUp }}</b></div>
                                            <div v-if="selectedBuff.speedUp" class="mt-0.4vh">💨 速度 <b class="text-amber-300">+{{ selectedBuff.speedUp }}</b></div>
                                            <div v-if="selectedBuff.hpUp" class="mt-0.4vh">❤️ 生命 <b class="text-amber-300">+{{ selectedBuff.hpUp }}</b></div>
                                        </template>
                                        <div v-if="selectedBuff.isGrouped && selectedBuff.total > 0" class="mt-0.6vh">{{ selectedBuff.type === 'speedDown' ? '共降低' : '共提升' }}：<b class="text-amber-300 text-2.4vh">{{ selectedBuff.total }}{{ selectedBuff.unit }}</b></div>
                                        <div v-if="selectedBuff.sources && selectedBuff.sources.length > 0">
                                            <div class="text-white/60 text-2vh mt-0.8vh mb-0.4vh">来源：</div>
                                            <div v-for="(src, si) in selectedBuff.sources" :key="si" class="text-amber-200/90 text-2.1vh pl-1vh">• {{ src.name }} <span class="text-amber-300">{{ src.value > 0 ? '+' : '' }}{{ src.value }}{{ src.pct ? '%' : '' }}</span></div>
                                        </div>
            
                                    </div>
                                </template>
                                <div v-else class="text-white/30 text-2.2vh text-center mt-4vh">选择左侧状态查看详情</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
        <template v-if="showEndButton">

            <div ref="endTurnBtnRef"
                :class="['absolute top-2vh right-7.5vw  text-white bg-#F56C6C z-2 text-1.3vw py-1.4vh px-1vw rounded-2 tour-target-end-turn', { 'opacity-50 grayscale cursor-not-allowed': tourVisible }]"
                @click="myEndPlayerTurn">{{ L('endTurn') }}</div>

            <el-icon ref="infoIconRef" class="absolute! right-1vw top-10vh z-2 tour-target-info" color="white"
                @click="openAllCardPopup">
                <InfoFilled />
            </el-icon>

            <!-- 🃏 牌库剩余计数（最右下角，点击查看剩余卡牌） -->
            <div v-if="showCards"
                class="absolute right-1vw bottom-[2vh] z-2 flex items-center text-white text-1.5vh font-bold cursor-pointer select-none"
                @click="showDrawPilePopup = true">
                <span class="px-1.5vw py-0.8vh rounded-lg bg-black/55 border border-white/15 hover:bg-black/75 transition-all">{{ L('drawPile') }} {{ drawPile.length }}</span>
            </div>
        </template>

        <!-- 卡牌 ====================== 核心修改在这里 ====================== -->
        <el-popover v-for="(card, i) in playerHand" :key="'pc' + card.id"
            :visible="cardPopVisibleId === card.id" trigger="manual" placement="top" :width="320"
            :show-arrow="true" :z-index="99999" popper-class="fight-card-popover">
            <template #reference>
                <div ref="cardRefs" :data-card-id="card.id"
                    class="absolute  rounded-lg pointer-events-auto overflow-hidden w-[20vh] h-[30.54vh] transition-transform duration-300 ease-out"
                    :class="[
                        getCardCursorClass(card),
                        getCardOpacityClass(card),
                        showCards ? 'card-show' : 'card-hide'
                    ]" :style="{
                        left: (card._justDrawn ? card._srcX : (showCards ? card.x : getCardTargetX(i))) + 'px',
                        top: (card._justDrawn ? card._srcY : (showCards ? card.y : card.y + (13 / 100) * vh)) + 'px',
                        zIndex: card.dragging ? 999 : 10,
                        transform: card.dragging ? 'rotate(0deg)' : `rotate(${card.angle || 0}deg)`,
                        transformOrigin: 'bottom center',
                        transition: card.dragging ? 'none' : 'left 0.3s ease, top 0.3s ease, transform 0.3s ease'
                    }" @mousedown="startLongPress($event, card)" @touchstart="startLongPress($event, card)"
                    @mouseup="clearLongPress($event, card)" @touchend="clearLongPress($event, card)" @mouseleave="clearLongPress">
            <div class="spine-here absolute inset-0"></div>
            <!-- ❄️ 冰霜粒子：被冰精灵降费的卡牌循环粒子特效（打出后随卡消失） -->
            <div v-if="(card._costReduce ?? 0) > 0" class="frost-particles">
                <span v-for="n in 14" :key="'fp' + n" class="frost-particle" :style="frostStyle(n)"></span>
            </div>
            <template v-if="card.spineLoaded">
                <div v-if="card.name.length === 2"
                    class="mt-1.2vh absolute text-3vh iconfont2 w-100% ml-0.5vh text-center text-black">
                    {{ tr(card.name) }}
                </div>
                <div v-else-if="card.name.length === 3"
                    class="mt-1.2vh absolute text-3vh iconfont2 text-black w-100% left-1vh text-center">
                    {{ tr(card.name) }}
                </div>
                <div v-else class="mt-1.2vh absolute text-3vh iconfont2 text-black w-70% left-4.3vh text-center">
                    {{ tr(card.name) }}
                </div>

                <!-- ⭐ 星级角标 -->
                <div v-if="card.star > 1"
                    class="absolute top-[12%] left-1/2 -translate-x-1/2 text-2vh text-yellow-400 font-bold"
                    style="text-shadow: 0 0 2px #000, 0 0 3px #000;">
                    {{ '★'.repeat(Math.min(3, card.star)) }}
                </div>

                <div class="absolute top-0.2vh left-1.5vh text-3.5vh font-bold"
                    :class="getCardCanFree(card) ? 'text-cyan-300' : (isCardCostReduced(card) ? 'cost-reduced-flash' : 'text-#409EFF')">
                    {{ getCardCanFree(card) ? 0 : getCardFinalCost(card) }}
                </div>
                <!-- ❄️ 冰冻状态：冰蓝覆盖层 + 冰冻标签 + 雪花（不显示次数用尽） -->
                <div v-if="card.disabledLevel > 0"
                    class="absolute inset-0 pointer-events-none rounded-lg overflow-hidden"
                    style="background: linear-gradient(160deg, rgba(56,189,248,0.30), rgba(14,116,144,0.42) 55%, rgba(56,189,248,0.24)); box-shadow: inset 0 0 0 2px rgba(125,211,252,0.9), inset 0 0 16px rgba(56,189,248,0.55);">
                    <div class="absolute inset-0 opacity-25"
                        style="background-image: radial-gradient(circle at 18% 28%, rgba(255,255,255,0.75) 1px, transparent 2.5px), radial-gradient(circle at 68% 58%, rgba(255,255,255,0.65) 1px, transparent 2.5px), radial-gradient(circle at 42% 82%, rgba(255,255,255,0.55) 1px, transparent 2.5px); background-size: 36px 36px;"></div>
                    <div class="absolute right-1vh top-0.65vh text-2.56vh bg-#38bdf8/90 px-1 rounded font-bold text-white"
                        style="text-shadow: 0 1px 2px rgba(0,0,0,0.6);">{{ L('frozen') }}</div>
                    <div class="absolute inset-0 flex items-center justify-center text-3.5vh opacity-65 select-none"
                        style="filter: drop-shadow(0 0 4px #bae6fd);">❄️</div>
                </div>
                <!-- 🈲 封禁状态：本次地牢内该牌无法打出（诅咒布偶被动） -->
                <div v-if="isBannedCardName(card.name)"
                    class="absolute inset-0 pointer-events-none rounded-lg overflow-hidden flex items-center justify-center"
                    style="background: rgba(107,114,128,0.32); box-shadow: inset 0 0 0 2px rgba(107,114,128,0.9);">
                    <div class="absolute right-1vh top-0.65vh text-2.56vh bg-#6B7280/90 px-1 rounded font-bold text-white"
                        style="text-shadow: 0 1px 2px rgba(0,0,0,0.6);">封禁</div>
                    <div class="text-4vh opacity-70 select-none" style="filter: drop-shadow(0 0 4px #9ca3af);">🈲</div>
                </div>
                <div v-else-if="card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn"
                    class="absolute right-1vh top-0.65vh text-2.56vh bg-#F56C6C/80 px-1 rounded ">
                    {{ L('usesExhausted') }}
                </div>

            </template>
                </div>
            </template>
            <!-- 🃏 卡牌详情说明（Popover 弹出）：只显示描述 -->
            <div class="text-black w-full">
                <div class="text-[12.5px] leading-relaxed text-gray-700 whitespace-pre-line iconfont2"
                    v-html="getCardDynamicDesc(card, getCardStar(card))"></div>
            </div>
        </el-popover>
        <el-col ref="ref2" class="absolute left-33% w-35vw h-20vh bottom-1vh!"></el-col>
        <CardDetailPopup ref="cardDetailPopupRef" v-model:visible="showCardPopup" :hand-cards="playerHand"
            :player="player" :allies="allies" :enemies="enemies" />
        <DrawPilePopup v-if="showDrawPilePopup" :cards="drawPile" @close="showDrawPilePopup = false" />

        <!-- 🎯 敌人预测攻击详情弹层：告诉玩家敌人下一次攻击是什么（Teleport 到 body 防 transform 错位） -->
        <Teleport to="body">
        <div v-if="predictPop" class="fixed inset-0 z-[9999] cursor-default" @click.self="predictPop = null">
            <div class="absolute"
                :style="{ left: predictPop.x + 'px', top: predictPop.y + 'px', transform: predictPop.placement === 'below' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }">
                <div class="relative bg-black/85 border border-white/15 rounded-xl px-4vh py-3vh max-w-[min(88vw,460px)] text-white shadow-2xl">
                    <div class="flex items-center justify-between mb-1.2vh">
                        <span class="text-2.8vh font-black text-amber-300">🎯 下一次攻击</span>
                        <span class="text-1.6vh px-1.5vh py-0.3vh rounded-full bg-white/10">{{ predictPop.source === 'skill' ? '技能' : '普攻' }}</span>
                    </div>
                    <div class="text-1.8vh text-white/80 mb-1.2vh">{{ predictPop.enemyName }} 即将对你发动攻击</div>
                    <div class="w-full h-px bg-white/15 mb-1.2vh"></div>

                    <div v-if="predictPop.skill">
                        <div class="text-2.2vh font-bold mb-0.5vh" :style="{ color: dmgColor(predictPop.dmgType) }">{{ predictPop.skill.name }}</div>
                        <div v-if="predictPop.skill.desc" class="text-1.7vh text-white/75 leading-snug mb-1vh">{{ predictPop.skill.desc }}</div>
                    </div>
                    <div v-else>
                        <div class="text-2.2vh font-bold mb-0.5vh" :style="{ color: dmgColor(predictPop.dmgType) }">普通攻击</div>
                    </div>

                    <div class="flex flex-wrap gap-x-2.5vh gap-y-0.5vh text-1.7vh text-white/80">
                        <span>伤害类型：<b :style="{ color: dmgColor(predictPop.dmgType) }">{{ dmgTypeLabel(predictPop.dmgType) }}</b></span>
                        <span v-if="!predictPop.skill">攻击倍率：<b>{{ Math.round((predictPop.attackMultiplier ?? 1) * 100) }}%</b></span>
                        <span v-if="!predictPop.skill && (predictPop.attackHits ?? 1) > 1">攻击次数：<b>{{ predictPop.attackHits }} 次</b></span>
                        <span v-if="!predictPop.skill && (predictPop.attackArmorReducePct ?? 0) > 0">破甲：<b>{{ Math.round((predictPop.attackArmorReducePct ?? 0) * 100) }}%</b></span>
                        <span v-if="predictPop.skill && (predictPop.skill.cooldown ?? 0) > 0">冷却：<b>{{ predictPop.skill.cooldown }} 回合</b></span>
                    </div>

                    <div v-if="(predictPop.buffs && predictPop.buffs.length) || (predictPop.debuffs && predictPop.debuffs.length)"
                        class="mt-1.6vh pt-1.4vh border-t border-white/15">
                        <div class="text-2.0vh font-bold text-white/90 mb-0.8vh">当前状态</div>
                        <div v-if="predictPop.buffs && predictPop.buffs.length" class="text-1.8vh mb-0.5vh leading-snug">
                            <span class="text-emerald-300 font-bold">增益：</span>
                            <span class="text-white/85">{{ predictPop.buffs.map(buffLabel).join('、') }}</span>
                        </div>
                        <div v-if="predictPop.debuffs && predictPop.debuffs.length" class="text-1.8vh leading-snug">
                            <span class="text-rose-300 font-bold">减益：</span>
                            <span class="text-white/85">{{ predictPop.debuffs.map(debuffLabel).join('、') }}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1vh mt-1.6vh pt-1.4vh border-t border-white/15 text-2.8vh font-black"
                        :style="{ color: dmgColor(predictPop.dmgType) }">
                        <span class="predict-icon" :class="predictPop.source === 'skill' ? 'predict-icon-skill' : 'predict-icon-basic'">{{ predictPop.source === 'skill' ? '✨' : '⚔️' }}</span>预计造成 {{ predictPop.dmg }} 点伤害
                    </div>
                </div>
            </div>
        </div>
        </Teleport>

        <!-- 🩹 友方召唤物属性详情弹窗 -->
        <Teleport to="body">
        <div v-if="summonPop" class="fixed inset-0 z-[9999] cursor-default" @click.self="summonPop = null">
            <div class="absolute"
                :style="{ left: summonPop.x + 'px', top: summonPop.y + 'px', transform: summonPop.placement === 'below' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }">
                <div class="relative bg-black/85 border border-white/15 rounded-xl px-4vh py-3vh max-w-[min(88vw,420px)] text-white shadow-2xl">
                    <div class="flex items-center justify-between mb-1.2vh">
                        <span class="text-2.8vh font-black text-sky-300">{{ summonPop.name }}</span>
                        <button @click="summonPop = null" class="text-black hover:text-black/70 text-2vh px-1vh font-bold">✕</button>
                    </div>
                    <div class="grid grid-cols-2 gap-x-3vh gap-y-0.8vh text-1.9vh text-white/85 mb-1.2vh">
                        <span class="flex items-center gap-1vh"><img src="@/assets/daoju/Hp.webp" class="w-2.6vh h-2.6vh object-contain" alt="生命" /> 生命：<b class="text-red-300">{{ summonPop.hp }}/{{ summonPop.maxHp }}</b></span>
                        <span class="flex items-center gap-1vh"><img src="@/assets/daoju/Attack.webp" class="w-2.6vh h-2.6vh object-contain" alt="攻击" /> 攻击：<b class="text-amber-300">{{ summonPop.attack }}</b></span>
                        <span class="flex items-center gap-1vh"><img src="@/assets/daoju/Speed.webp" class="w-2.6vh h-2.6vh object-contain" alt="速度" /> 速度：<b class="text-cyan-300">{{ summonPop.speed }}</b></span>
                   <span class="flex items-center gap-1vh">💖 魅力加成：<b class="text-pink-300">+{{ charmSummonBonus.toFixed(1) }}%</b></span>
                    </div>

                    <div class="w-full h-px bg-white/15 mb-1.2vh"></div>
                    <div v-if="(summonPop.buffs && summonPop.buffs.length) || (summonPop.debuffs && summonPop.debuffs.length)" class="text-1.9vh leading-snug">
                        <div v-if="summonPop.buffs && summonPop.buffs.length" class="mb-0.5vh">
                            <span class="text-emerald-300 font-bold">增益：</span>
                            <span class="text-white/85">{{ summonPop.buffs.map(buffLabel).join('、') }}</span>
                        </div>
                        <div v-if="summonPop.debuffs && summonPop.debuffs.length">
                            <span class="text-rose-300 font-bold">减益：</span>
                            <span class="text-white/85">{{ summonPop.debuffs.map(debuffLabel).join('、') }}</span>
                        </div>
                    </div>
                    <div v-else class="text-1.9vh text-white/40">无增益或减益状态</div>
                </div>
            </div>
        </div>
        </Teleport>

        <pixiIndex ref="pixiIndexRef" :mp="player.mp" :maxMp="player.maxMp" :enemy-spines="enemySpineNames"
            :enemies="enemies" :player-buffs="playerBuffs" :player="player" :allies="allies" />
        <el-col ref="ref1" class="absolute bottom-7vh left-2.5vw w-7vw h-8vh"></el-col>
        <!-- 🔥 战斗结果弹窗 -->
        <BattleResultPopup :visible="showBattleResult" :is-victory="battleIsVictory" :exp-gained="battleExpGained" :gold-gained="battleGoldGained"
            :item-rewards="battleItemRewards" :level-up-info="battleLevelUpInfo" :ally-exp-results="allyExpResults" :rounds="battleRounds"
            :custom-battle="isCustomBattle"
            @close="closeBattleResult"
            @leave="handleLeaveBattle" />

        <!-- 🔥 指定目标卡牌拖拽提示 -->
        <div v-if="draggingNeedTargetCard"
            class="absolute top-40% left-1/2 -translate-x-1/2 z-50 text-white text-1.5vw font-bold px-3vw py-1.5vh rounded-full bg-black/60 backdrop-blur-sm animate-pulse pointer-events-none">
            {{ L('selectTargetHint') }}
        </div>

        <!-- 🔥 新手引导 Tour -->
        <el-tour v-model="tourVisible" :mask="true" :show-close="false" @close="onTourClose" @finish="onTourClose">
            <el-tour-step :target="ref1?.$el" :title="L('tourManaTitle')" :description="L('tourManaDesc')" />
            <el-tour-step :target="ref2?.$el" :title="L('tourCardsTitle')" :description="L('tourCardsDesc')"
                placement="top" />
            <el-tour-step target=".tour-target-action-bar" :title="L('tourActionBarTitle')" :description="L('tourActionBarDesc')"
                placement="bottom" />
            <el-tour-step target=".tour-target-info" :title="L('tourInfoTitle')" :description="L('tourInfoDesc')"
                placement="left" />
            <el-tour-step target=".tour-target-end-turn" :title="L('endTurn')" :description="L('tourEndTurnDesc')"
                placement="left" />
        </el-tour>
    </div>
</template>

<script setup>
import { battleLog } from './logger.js'
import { reactive, computed, onMounted, nextTick, ref, onUnmounted } from 'vue'
import { createUnit } from './Unit.js'
import { ElMessage } from 'element-plus'
import { createCard } from './Card.js'
import { useCardDrag } from './drag.js'
import { createBattle, playDealGlowBurst, playerAttackUp } from './battle.js'
import { createAllies } from './TeamAllies.js'
import { useSkill, initSkillCache, prewarmEffectPool } from './SkillLogic.js'
import { resetFastReload } from './SkillReset'
import CardDetailPopup from './CardDetailPopup.vue'
import DrawPilePopup from './DrawPilePopup.vue'
import { tr } from "@/i18n";
import BattleResultPopup from './BattleResultPopup.vue'
import { createCardSpine, destroyAllCardSpines } from './CardSpine'
import { createDragParticles, clearAllHitParticles, playCardCooldownEffect, playManaMissileSequence, playSpikeAttack } from './hitParticles.js'
import { loadAssets } from "@/components/loadAssets.js";
import { useSkillShadowClone, useSkillReflect, calculateFinalDamage, applyDamageToTarget } from './SkillDamage';
import { getAllSummons, clearBattleSummons } from './SkillLogic.js';
import pixiIndex from './pixi.vue'
import { useCounterStore, LEVEL_UP_CFG } from "@/store/counter";
import { getFinalMagicResist } from './SkillDamage.js';
import { pushBgmScene as audioPushBgmScene, popBgmScene as audioPopBgmScene } from "@/utils/audioManager";
import { initBattleCache, setFightApp, setEnemyContainer } from './battle.js'
import emitter from "@/bus";
import { getNightFactor } from '../matter1/filters.js'
import LowHpOverlay from "@/components/LowHpOverlay.vue";
import { createCustomEnemies } from "../matter1/enemiesData.js";
// ⛔ 讨伐战已移除：不再使用 getMapMeta（Boss 战/深入度系统已删除）
import { applyHeal } from './battle';
import { BUFF_SKIN_MAP, DAMAGE_COLOR_MAP } from '../matter1/buff.js';
import { t } from "@/i18n";
const user = useCounterStore();
const emit = defineEmits(['fight-end'])
// 🌐 语言响应：语言切换后重渲染 + 词条读取
const langVersion = ref(0);
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++);
function L(key) { langVersion.value; return t(key); }
function F(key, vars) { let s = L(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }
// ✅ 关键修复：先初始化战斗缓存（天赋数据），再创建战斗实例
initSkillCache(user);
initBattleCache(user);
const ref1 = ref()
const ref2 = ref()
const vw = window.innerWidth
const vh = window.innerHeight
const showCardPopup = ref(false)
// 战斗启动开关，页面载入默认未开始
const battleStarted = ref(false)
const showDrawPilePopup = ref(false) // 🃏 牌库弹窗（点击右下角牌库计数打开）
const predictPop = ref(null) // 🎯 敌人预测攻击详情弹层（点击血条上方图标弹出）
const summonPop = ref(null) // 🩹 友方召唤物属性详情弹层（点击召唤物弹出）
// 💖 魅力：召唤物/同伴全属性加成（分段线性递减，越提升越弱，与战斗内一致）
const charmSummonBonus = computed(() => {
  const c = user.pixi?.player?.juese?.charm || 0
  if (!(c > 0)) return 0
  let p = Math.min(c, 50) * 0.30
  if (c > 50) p += Math.min(c - 50, 70) * 0.18
  if (c > 120) p += Math.min(c - 120, 130) * 0.10
  if (c > 250) p += (c - 250) * 0.06
  return p
})
const cardSpineList = ref([])

// ✅ 卡牌详情弹窗引用
const cardDetailPopupRef = ref(null)

// ✅ 新手引导 Tour 相关
const tourVisible = ref(false)
const hasShownTutorial = ref(false) // 标记是否已经显示过新手引导
const actionBarRef = ref(null)
const endTurnBtnRef = ref(null)
const infoIconRef = ref(null)
const pixiIndexRef = ref(null)
const cardRefs = ref([])
function ceshi() {
    battleLog('触发');
    
    emitter.emit("talkToNpc", {
        loadData: 'npc/jingling',
        name: 'hm01',
    });
}

// 引导结束回调
function onTourClose() {
    tourVisible.value = false
    // 标记已看过引导
    user.pixi.hasSeenBattleTutorial = true
}

// 开始新手引导
function startBattleTutorial() {
    // 延迟一下，确保所有元素都渲染完成
    nextTick(() => {
        setTimeout(() => {

            tourVisible.value = true
        }, 500)
    })
}

// 🃏 当前弹出详情 Popover 的卡牌 id（null = 全部关闭）
const cardPopVisibleId = ref(null)
// ✅ 单击判定：按下起点 + 移动阈值（拖动过就不弹，只有干净单击才弹）
let longPressStartPos = { x: 0, y: 0 }
const MOVE_THRESHOLD = 10 // 移动超过10px视为拖动，不弹详情
// 🃏 拖动卡牌 0.25 秒后自动关闭详情弹窗（计时器 + 首次移动标记）
let popoverCloseTimer = null
let dragMoveArmed = false

// 🔥 战斗结果弹窗
const showBattleResult = ref(false)
const battleIsVictory = ref(true)
const battleExpGained = ref(0)
const battleGoldGained = ref(0)
const battleItemRewards = ref([])
const battleLevelUpInfo = ref(null)
// 🐾 战斗胜利：携带队友经验结果（结算界面展示）
const allyExpResults = ref([])
const battleRounds = ref(0)
function openAllCardPopup() {
    showCardPopup.value = true
}

// 手动启动战斗
async function startBattle() {
    // ✅ 设置战斗场景 pixi 容器，子弹与敌人 spine 渲染在同一画布，坐标统一
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fightApp = pixiIndexRef.value?.getApp();
    const effectContainer = pixiIndexRef.value?.getEffectContainer?.();
    const enemyContainer = pixiIndexRef.value?.getEnemyContainer?.();
    if (fightApp && effectContainer) {
        // 使用独立的特效层容器，确保所有技能特效在敌人spine上方
        // ⚠️ 玩家屏幕坐标由 matter.vue 的 jinruzhandou 用 viewport.toScreen 动态计算
        //    （setPlayerScreenPos），这里不传坐标避免覆盖动态值
        setFightApp(effectContainer, null);
    }
    // ✅ 设置敌人容器（用于激光等需要在敌人下方的特效）
    if (enemyContainer) {
        setEnemyContainer(enemyContainer);
    }

    // ✅ 开始战斗前清空所有召唤物和状态
    clearBattleSummons(allies)

    battleStarted.value = true
    // 🃏 抽牌制：战斗开始初始化抽牌堆
    initBattleDeck()
    // 🃏 战斗开始立即发起始手牌；第一回合不再抽，从第二回合起每回合开始抽 getCardsPerTurn() 张
    firstTurnHanded = false // 🔄 重置"第一回合已发牌"标志（每次战斗独立）
    drawCards(getStartingHandCount())
    // battle内部计时器正式开始运行
    battle.resumeLoop()

    // 重置新手引导状态，每次战斗的第一次玩家回合都会显示
    hasShownTutorial.value = false

    // 🔥 战斗开始，刷新 buff 图标
    nextTick(() => {
        pixiIndexRef.value?.updatePlayerBuffIcons(player.buffs)
    })
}
const spineRefreshLock = new Map()
async function refreshSingleCardSpine(targetIndex) {
    // 上锁，正在刷新直接返回，避免并发创建多个Application
    if (spineRefreshLock.get(targetIndex)) return
    spineRefreshLock.set(targetIndex, true)

    try {
        const cardWidth = window.innerWidth * 0.5
        const cardHeight = cardWidth * 1.45
        // 🛡️ 从手牌对应的卡牌 DOM 里取 spine 容器，与 playerHand index 强绑定，
        //    避免全局 querySelectorAll 文档顺序在打牌/抽牌重排后错位（最后一张 spine 不显示）
        const card = playerHand.value[targetIndex]
        if (!card) return
        // 🛡️ 优先按 card.id 直接定位 DOM：splice 双兆后 v-for key 复用会移动新卡 DOM，
        //    cardRefs.value 索引与 playerHand 可能错位，直接按 card.id 查最稳
        const wrap = document.querySelector(`[data-card-id="${card.id}"] .spine-here`)
            || cardRefs.value?.[targetIndex]?.querySelector('.spine-here')

        if (!wrap) return

        // 销毁旧实例（先校验 canvas 归属）：cardSpineList 按 index 存储，
        // 打牌导致手牌前移后 index 会错位——若直接 destroy，会 remove 掉挂在其他卡牌 div 上的 canvas，
        // 造成抽牌后旧卡 spine 画面丢失。只销毁 canvas 属于当前卡牌 div 的实例。
        const oldSpine = cardSpineList.value[targetIndex];
        if (oldSpine?.destroy) {
            const oldCanvas = oldSpine.canvas;
            const belongs = !oldCanvas || oldCanvas.parentElement === wrap
                || (oldCanvas.parentElement && oldCanvas.parentElement.contains(wrap));
            if (belongs) {
                oldSpine.destroy({
                    children: true,
                    texture: false
                });
            }
        }

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
// 🃏 抽牌制：洗牌
function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
// 🃏 抽牌制：战斗开始初始化牌组（自定义牌组洗入抽牌堆）
function initBattleDeck() {
  drawPile.value = [];
  discardPile.value = [];
  playedThisTurn.value = [];
  playerHand.value = []; // 重开战斗清空手牌（手牌已改为跨回合保留）
  BATTLE_DECK.forEach(name => drawPile.value.push(createCard(name)));
  shuffleArr(drawPile.value);
}
// 🃏 手牌上限（抽牌/发牌都不能超过）
const MAX_HAND_CARDS = 9;

// 🃏 起始手牌数：基础 4，可被天赋/道具 buff 增减（集中计算，方便扩展）
function getStartingHandCount() {
  let n = 4;
  // 【扩展点·天赋】例：开局多抽1张 → user.hasTalent('opening_draw') && (n += user.getTalentEffect?.('opening_draw', 'extra') ?? 1)
  // 【扩展点·道具/战斗buff】例：player.buffs.find(b => b.type === 'opening_draw') && (n += 1)
  return Math.max(0, n);
}

// 🃏 每回合抽牌数：基础 3，可被天赋/道具 buff 增减（集中计算，方便扩展）
function getCardsPerTurn() {
  let n = 3;
  // 【扩展点·天赋】例：每回合多抽1张 → user.hasTalent('quick_draw') && (n += user.getTalentEffect?.('quick_draw', 'extraDraw') ?? 1)
  // 【扩展点·道具/战斗buff】例：const db = player.buffs.find(b => b.type === 'draw_bonus'); if (db) n += db.stacks ?? 1;
  return Math.max(0, n);
}

// 🎴 抽牌飞入起点：右下角牌库按钮附近（right-1vw bottom-2vh），按视口自适应
const PILE_SRC_X = vw - Math.max(150, vw * 0.13);
const PILE_SRC_Y = vh - Math.max(120, vh * 0.11);

// ✨ 抽牌弧线飞行动画：卡牌从牌库位置沿二次贝塞尔弧线飞入手牌区
// 带“先上抛后落手”的弧线轨迹、弹出式缩放、倾斜回正、飞行置顶，完成后交还 Vue 接管位置
function flyCardTo(el, fromX, fromY, toX, toY, delay = 0) {
  if (!el) return Promise.resolve(); // 🛡️ 取不到卡牌 DOM 时跳过动画，不中断后续刷新
  return new Promise(resolve => {
    const DUR = 420;
    const start = performance.now() + delay;
    // 弧线控制点：起点与终点中点向上抬高，形成先抛后落的弧
    const midX = (fromX + toX) / 2;
    const midY = Math.min(fromY, toY) - 0.28 * vh;
    el.style.transition = 'none'; // 手动逐帧驱动，禁掉 CSS 过渡避免插值打架
    el.style.zIndex = 60; // 飞行中的卡置顶
    const tick = (now) => {
      if (now < start) { requestAnimationFrame(tick); return; }
      const t = Math.min(1, (now - start) / DUR);
      const e = 1 - Math.pow(1 - t, 2); // easeOutQuad：先快后慢
      const inv = 1 - e;
      const x = inv * inv * fromX + 2 * inv * e * midX + e * e * toX;
      const y = inv * inv * fromY + 2 * inv * e * midY + e * e * toY;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transform = 'rotate(' + ((1 - e) * 15).toFixed(1) + 'deg) scale(' + (0.65 + 0.35 * e).toFixed(3) + ')';
      if (t < 1) requestAnimationFrame(tick);
      else {
        el.style.left = toX + 'px';
        el.style.top = toY + 'px';
        el.style.transform = 'rotate(0deg) scale(1)';
        el.style.transition = '';
        el.style.zIndex = '';
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

// 🃏 抽牌制：抽 n 张（受手牌上限 9 张限制；抽牌堆空 → 弃牌堆洗回；都没牌则不抽），抽到的新卡刷新 spine
async function drawCards(n) {
  // 🃏 上限截断：最多抽到 9 张。8 张时应抽 2 张 → 只抽 1 张；已满 9 张 → 跳过抽牌
  const canDraw = Math.max(0, Math.min(n, MAX_HAND_CARDS - playerHand.value.length));
  if (canDraw <= 0) return;
  const added = [];
  for (let k = 0; k < canDraw; k++) {
    if (drawPile.value.length === 0) {
      if (discardPile.value.length === 0) break;
      drawPile.value = shuffleArr(discardPile.value.slice());
      discardPile.value = [];
    }
    const card = drawPile.value.pop();
    card.cooldown = 0; // 抽牌制：抽到的牌无视冷却
    // ✨ 抽牌动画：新抽的卡从右下角牌库位置飞入手牌区（弧线 + 弹出缩放 + 倾斜回正）
    card._justDrawn = true; // 动画期间模板渲染在起点
    card.angle = 15; // 起点倾斜，飞行中回正
    card._srcX = PILE_SRC_X + k * 14; // 独立起点字段：calcArcCardPos 写目标时起点不跳变
    card._srcY = PILE_SRC_Y + k * 10;
    card.x = card._srcX;
    card.y = card._srcY;
    playerHand.value.push(card);
    added.push(card);
  }
  if (added.length) {
    // 第一帧：全部渲染在牌库位置（_justDrawn → _srcX/_srcY）
    await nextTick();
    // 等浏览器真正绘制出起点这一帧，再开始飞行
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    // 计算所有卡目标位置（含新卡）；新卡 _justDrawn 分支仍显示起点，DOM 不动
    calcArcCardPos();
    const refs = cardRefs.value;
    const total = playerHand.value.length;
    for (let idx = 0; idx < added.length; idx++) {
      const c = added[idx];
      const el = refs[total - added.length + idx];
      // 逐张错开飞入（第 idx 张延迟 idx*70ms），飞完交还 Vue 接管位置
      flyCardTo(el, c._srcX, c._srcY, c.x, c.y, idx * 70)
        .then(() => {
          c._justDrawn = false;
          c.angle = 0;
        })
        .catch(() => {
          c._justDrawn = false;
          c.angle = 0;
        });
    }
    await nextTick();
    // 🛡️ 按 card 对象实时查索引刷新：useCard 里双兆 drawCards(2) 未 await，
    //    紧接着会 splice 移除双兆导致手牌索引前移；若用抽牌前算死的 total-added.length 索引，
    //    createCardSpine 异步完成后 canvas 会挂到错位的卡牌 DOM（图与名字互换）
    for (const c of added) {
      const idx = playerHand.value.indexOf(c);
      if (idx >= 0) await refreshSingleCardSpine(idx);
    }
  } else {
    calcArcCardPos();
  }
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
    // ✅ 页面加载时先清空所有残留的召唤物
    clearBattleSummons(allies)

    await loadAssets()
    await nextTick()
    audioPushBgmScene(null) // 🎵 记忆战斗前 BGM（地牢/主世界），进入战斗后暂停
    user.playBgm('fight', 1.2) // 🎵 战斗 BGM（经统一音频管理器）
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

    // ✅ 预热特效对象池，避免首次播放动画掉帧
    // 延迟 200ms，等卡牌渲染稳定后再预热，避免挤在一起更卡
    setTimeout(() => {
        prewarmEffectPool()
    }, 200)

    // 🔥 监听战斗结束事件
    emitter.on("battleEnd", handleBattleEnd)

    // 🔥 监听玩家回合开始事件，第一次时显示新手引导
    emitter.on("playerTurnStart", handlePlayerTurnStart)

    // 🔥 监听敌人受伤事件，显示伤害浮动数字
    emitter.on("enemyDamage", handleEnemyDamage)

    // 🔥 监听敌人获得buff/debuff事件，显示buff浮动文字
    emitter.on("enemyBuff", handleEnemyBuff)
    emitter.on("enemyPredictTap", handleEnemyPredictTap)

    // ❄️ 监听凋零冰刺冻结手牌（敌人随机冻结 count 张，玩家回合结束时清除）
    emitter.on("freezePlayerCards", handleFreezePlayerCards)
    emitter.on("bossPhase2", handleBossPhase2)
    emitter.on("cardCostUp", handleCardCostUp)
    emitter.on("insertCurseCards", handleInsertCurseCards)
    emitter.on("banPlayerCard", handleBanPlayerCard)

    // 🔥 监听敌人中毒事件，显示闪绿效果
    emitter.on("enemyPoisonFlash", handleEnemyPoisonFlash)

    // 🧪 战斗中用药水（背包内使用治疗药水）：基于战斗 player.hp 计算真实恢复量并立即生效
    function handlePotionUsed({ hp }) {
        if (player && hp > 0) {
            // 战斗中的真实恢复量（基于 player.hp，而非 juese.hp）
            const healAmt = Math.max(0, Math.min(player.maxHp, (player.hp || 0) + hp) - (player.hp || 0))
            if (healAmt > 0) {
                player.hp = Math.min(player.maxHp, (player.hp || 0) + healAmt)
                // 同步回 store（统一走战斗血量回写入口，口径与战斗结束一致）
                syncPlayerHpToStore()
                ElMessage.success(F('hpPlusFmt', { n: healAmt }))
                battleLog(`🧪 战斗中使用药水，恢复 ${healAmt} 点生命`)
            } else {
                ElMessage.info(L('hpFullNoPotion'))
            }
        }
    }
    emitter.on("potionUsed", handlePotionUsed)

    // 👑 暗影王召唤：接收 battle.js 创建的召唤敌人，同步到渲染列表
    //    注意：battle.js 的 createEnemySummon 已经 push 到 enemies.value（战斗逻辑可见），
    //    这里负责把召唤体转成 createUnit 并触发 pixi 层重新渲染
    window.__onEnemySummoned = (summonData) => {
        // 🎯 召唤体放到召唤源（暗影王）前方：查找源敌人索引，召唤体插入其前面，
        //    这样召唤体更靠近玩家（x 更小），可以被玩家的「最近攻击」优先选中阻挡
        const srcIdx = summonData._sourceUid
            ? enemies.value.findIndex(e => e.uid === summonData._sourceUid)
            : -1;
        // 插入位置：源敌人之前（其前方）；找不到源则排到最前（更靠近玩家）
        const insertIdx = srcIdx >= 0 ? srcIdx : 0;

        // 🎯 数据坐标先用渲染公式给个初始值（插入后统一重算，见下方 refreshAllEnemyDataPos）
        const seq = summonData._summonIdx ?? 0;
        const summonTotal = summonData._summonTotal ?? (seq + 1);
        const RENDER_RIGHT_FIXED = window.innerWidth * 0.92;  // 92vw
        const RENDER_SPACING = window.innerWidth * 0.10;      // 10vw
        const RENDER_Y = window.innerHeight * 0.85;           // 85vh
        const finalTotal = enemies.value.length + (summonTotal - seq);
        const finalIndex = insertIdx;
        const rowOffsetVW = (enemyList.value[0]?.data?.xOffsetVW ?? 0);
        const x = RENDER_RIGHT_FIXED - (finalTotal - finalIndex - 1) * RENDER_SPACING
            + window.innerWidth * (rowOffsetVW / 100);
        const y = RENDER_Y + window.innerHeight * ((summonData.data?.yOffsetVH ?? 0) / 100);
        const newUnit = createUnit({
            ...summonData.data,
            // 🎯 保留 juese（骨骼名）：data 里没有，必须从顶层透传，否则 spine 不渲染
            juese: summonData.juese || summonData.data?.juese || 'monster1',
            // 🎯 uid 必须唯一！⚠️ 不能用 Date.now()（同一毫秒召唤两个暗影会生成相同 uid，
            //    导致指定卡牌/高亮/伤害定位都指向同一个敌人，看起来两个暗影重叠在一起）。
            //    复用 createEnemySummon 里已带随机数的 id（Date.now() + Math.random() 唯一）
            uid: `enemy_summon_${summonData.id}`,
            // 👑 保留召唤源标记（暗影王「暗影庇佑」免疫判断用：_sourceUid=召唤者 uid）
            _sourceUid: summonData._sourceUid,
            _isSummon: true,
            x: x,
            y: y
        })
        // 初始化召唤体战斗状态（与 createBattle 敌人初始化一致）
        newUnit.actionProgress = 0
        newUnit.buffs = newUnit.buffs ?? []
        newUnit.debuffs = newUnit.debuffs ?? []
        newUnit.speed = newUnit.baseSpeed
        if (Array.isArray(newUnit.skills) && newUnit.skills.length) {
            newUnit.skillCds = newUnit.skills.map(s => s.initialCooldown ?? 0)
        }
        // 插入到源敌人前方（召唤体挡在暗影王前面，可被最近攻击选中）
        enemies.value.splice(insertIdx, 0, newUnit)
        // 更新 enemyList（驱动 enemySpineNames，触发 pixi 重新渲染）——同样插入到源前方，
        // 且必须保留 juese 字段，否则 enemySpineNames 过滤后该召唤体不渲染
        enemyList.value.splice(insertIdx, 0, {
            ...summonData.data,
            juese: summonData.juese || summonData.data?.juese || 'monster1',
        })

        // 🎯 关键：召唤后 pixi 层 renderEnemies 会按【最终数组 index】重排所有敌人，
        //    初始敌人的渲染位置也会变（不只是召唤体）。若不同步数据坐标，指定卡牌
        //    （getEnemyAtPosition 按数据 x/y 检测）就选中不了。
        //    这里把所有敌人的数据坐标统一重算 = 渲染位置（92vw/10vw/85vh + rowOffset/yOffset），
        //    与 pixi createEnemySpine 完全一致。
        const refreshAllEnemyDataPos = () => {
            const total = enemies.value.length
            const rowOff = enemyList.value[0]?.data?.xOffsetVW ?? 0
            enemies.value.forEach((e, i) => {
                e.x = window.innerWidth * 0.92 - (total - i - 1) * window.innerWidth * 0.10
                    + window.innerWidth * (rowOff / 100)
                e.y = window.innerHeight * 0.85
                    + window.innerHeight * ((e.yOffsetVH ?? 0) / 100)
            })
        }
        refreshAllEnemyDataPos()
    }

    // ✅ 加载完毕自动开始战斗
    startBattle()

})

// 🔄 第一回合已发过初始手牌标志（开战抽3张；第二回合起才按每回合抽牌数补牌）
let firstTurnHanded = false

// 玩家回合开始处理
function handlePlayerTurnStart() {
    // 🔥 回合开始，刷新 buff 图标（buff 可能增减/扣回合数）
    nextTick(() => {
        pixiIndexRef.value?.updatePlayerBuffIcons(player.buffs)
        pixiIndexRef.value?.updatePlayerSlowIcons?.(playerSlowDebuffs.value)
    })
    // 🃏 抽牌制：第二回合起每回合开始抽 getCardsPerTurn() 张（第一回合已发初始手牌，不重复抽）
    if (battleStarted.value) {
      if (firstTurnHanded) {
        drawCards(getCardsPerTurn())
      } else {
        firstTurnHanded = true
      }
    }
    // 只在第一次玩家回合时显示引导
    battleLog('user.pixi.hasSeenBattleTutorial=', user.pixi.hasSeenBattleTutorial);

    // if (!user.pixi.hasSeenBattleTutorial) {
    //     hasShownTutorial.value = true
    //     startBattleTutorial()
    // }
}

// 敌人中毒闪绿处理
function handleEnemyPoisonFlash({ enemyUid, enemyName }) {
    let enemyIndex = -1;
    if (enemyUid) {
        enemyIndex = enemies.value.findIndex(e => e.uid === enemyUid);
    }
    if (enemyIndex === -1) {
        enemyIndex = enemies.value.findIndex(e => e.name === enemyName);
    }
    if (enemyIndex === -1) return;
    pixiIndexRef.value?.flashEnemyPoison?.(enemyIndex);
}

// 敌人受伤处理：显示伤害浮动数字
function handleEnemyDamage({ enemyUid, enemyName, damage, type, isCritical }) {
    // 优先用唯一uid定位（解决同名敌人都显示在第一个的问题），fallback到name
    let enemyIndex = -1;
    if (enemyUid) {
        enemyIndex = enemies.value.findIndex(e => e.uid === enemyUid);
    }
    if (enemyIndex === -1) {
        enemyIndex = enemies.value.findIndex(e => e.name === enemyName);
    }
    if (enemyIndex === -1) return;
    pixiIndexRef.value?.showEnemyDamage?.(enemyIndex, damage, { type, isCritical });
}

// 敌人获得buff/debuff处理：显示buff浮动文字
function handleEnemyBuff({ enemyUid, enemyName, buffName }) {
    let enemyIndex = -1;
    if (enemyUid) {
        enemyIndex = enemies.value.findIndex(e => e.uid === enemyUid);
    }
    if (enemyIndex === -1) {
        enemyIndex = enemies.value.findIndex(e => e.name === enemyName);
    }
    if (enemyIndex === -1) return;
    pixiIndexRef.value?.showEnemyBuff?.(enemyIndex, tr(buffName));
}

// 🎯 敌人预测攻击详情弹层（点击血条上方图标弹出）
function dmgColor(type) {
    return (DAMAGE_COLOR_MAP[type] || DAMAGE_COLOR_MAP.null).normal;
}
function dmgTypeLabel(type) {
    const m = {
        physical: '物理',
        fire: '火',
        water: '水',
        lightning: '雷',
        ice: '冰',
        poison: '毒',
        wind: '风',
    };
    return m[type] || '无属性';
}
// 🩹 弹窗状态文案：增益名（剩余回合）
function buffLabel(b) {
    let s = b.name || '未知';
    if (b.remaining) s += `（${b.remaining}回合）`;
    return s;
}
// 🩹 弹窗状态文案：碎甲特殊显示护甲减免百分比，其余显示 层数（剩余回合）
function debuffLabel(d) {
    if (d.type === 'armorShred' || d.name === '碎甲' || d.name === 'armor_down') {
        const pct = Math.round((d.armorShredPct ?? 0.25) * 100);
        return `碎甲（护甲-${pct}%）`;
    }
    let s = d.name || '未知';
    if (d.stack) s += `×${d.stack}`;
    if (d.remaining) s += `（${d.remaining}回合）`;
    return s;
}
// 🖱️ 点击怪物本体 → 弹出预测攻击详情（DOM 层命中检测，复用卡牌选目标已验证的坐标体系）
function onBattleClick(e) {
    const info = pixiIndexRef.value?.getEnemyPredictTap?.(e.pageX, e.pageY, TARGET_DETECT_RADIUS);
    if (info) {
        handleEnemyPredictTap({ ...info, x: e.clientX, y: e.clientY });
        return;
    }
    // 🩹 没点到敌人 → 检测友方召唤物（水/雷/冰/火精灵、影分身等）
    const summon = pixiIndexRef.value?.getSummonTap?.(e.pageX, e.pageY, 80);
    if (summon) {
        handleSummonTap({ ...summon, x: e.clientX, y: e.clientY });
    }
}
// 🩹 召唤物详情弹窗定位（复用敌人预测弹窗的 placement 算法）
function handleSummonTap(payload) {
    const pad = 8;
    const w = window.innerWidth || 375;
    const h = window.innerHeight || 667;
    const estW = Math.min(w * 0.88, 420);
    const estH = 320;
    let x = Math.min(Math.max(payload.x, estW / 2 + pad), w - estW / 2 - pad);
    let y = payload.y - pad;
    let placement = 'above';
    if (y - estH < pad) { y = payload.y + pad; placement = 'below'; }
    if (y + estH > h - pad) { y = h - pad - (placement === 'below' ? estH : 0); }
    if (y < pad) y = pad;
    summonPop.value = { ...payload, x, y, placement };
}
function handleEnemyPredictTap(payload) {
    // 📱 移动端适配：弹层尺寸估计并 clamp 到视口内（上方放不下就翻到点击点下方）
    const pad = 8;
    const w = window.innerWidth || 375;
    const h = window.innerHeight || 667;
    const estW = Math.min(w * 0.88, 460);
    const estH = 300;
    let x = Math.min(Math.max(payload.x, estW / 2 + pad), w - estW / 2 - pad);
    // 默认 above：弹窗底边在点击点上方（模板 translate(-50%,-100%)）
    let y = payload.y - pad;
    let placement = 'above';
    // 上方空间不够 → below：弹窗顶边在点击点下方（模板 translate(-50%,0)）
    if (y - estH < pad) {
        y = payload.y + pad;
        placement = 'below';
    }
    // 下方越界：below 时把弹窗底边压到屏幕底；above 时把弹窗底边压到屏幕底
    if (y + estH > h - pad) {
        y = h - pad - (placement === 'below' ? estH : 0);
    }
    if (y < pad) y = pad;
    predictPop.value = { ...payload, x, y, placement };
}
// ❄️ 凋零冰刺冻结手牌：只随机未冻结的卡牌（已冻结不重复冻），玩家回合结束时清除
function handleFreezePlayerCards({ count = 2 } = {}) {
    const candidates = [];
    playerHand.value.forEach((c, i) => { if ((c.disabledLevel || 0) <= 0) candidates.push(i); });
    if (!candidates.length) return;
    const n = Math.min(count, candidates.length);
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.slice(0, n).forEach(i => {
        playerHand.value[i].disabledLevel = (playerHand.value[i].disabledLevel || 0) + 1;
    });
}
// 👑 暗影王二阶段文字气泡：弹出 2 秒后淡入淡出
const phase2Bubble = ref(null)
let _phase2BubbleTimer = null
function handleBossPhase2({ text = '' } = {}) {
    // 💬 变身通知气泡：偏右显示，2.5 秒后淡出
    phase2Bubble.value = { text }
    clearTimeout(_phase2BubbleTimer)
    _phase2BubbleTimer = setTimeout(() => { phase2Bubble.value = null }, 2500)
}
// 👑 独裁（暗影王二阶段技能）：玩家手牌所需灵力 +1（打出后恢复）
function handleCardCostUp() {
    playerHand.value.forEach(c => {
        c._costUp = (c._costUp || 0) + 1
    })
    battleLog('👑 独裁：手牌所需灵力 +1（打出后恢复）')
}
// 🎭 塞咒（诅咒布偶）：向玩家牌库塞入 count 张诅咒卡（可重复抽到，离开地牢后清除）
function handleInsertCurseCards({ count = 3 } = {}) {
    for (let i = 0; i < count; i++) drawPile.value.push(createCard('诅咒'));
    battleLog('🎭 玩家牌库被塞入 ' + count + ' 张诅咒卡');
}
// 🎭 咒缚（诅咒布偶死亡被动）：随机封禁玩家当前卡组的一张牌（本次地牢内，抽到后无法打出）
function handleBanPlayerCard() {
    const pool = BATTLE_DECK.filter(n => n !== '诅咒');
    if (!pool.length) return;
    const name = pool[Math.floor(Math.random() * pool.length)];
    if (!user.pixi.player.dungeonBannedCards) user.pixi.player.dungeonBannedCards = [];
    if (!user.pixi.player.dungeonBannedCards.includes(name)) user.pixi.player.dungeonBannedCards.push(name);
    user.pixi.playerInstance?.showBuffText?.('🈲 封禁：' + name);
    battleLog('🎭 封禁卡牌：' + name + '（本次地牢内无法打出）');
}
// 🈲 判断卡牌是否被咒缚封禁
function isBannedCardName(name) {
    return (user.pixi?.player?.dungeonBannedCards || []).includes(name)
}
// ⚔️ 战斗血量统一回写入口：战斗内 player.hp 为权威值，回写 store juese.hp（钳制 maxHp、取整）
//    药水即时同步与战斗结束同步共用此入口，保证「显示 vs 实际」口径一致
function syncPlayerHpToStore() {
    const juese = user.pixi?.player?.juese
    if (!player || !juese) return
    juese.hp = Math.min(juese.maxHp ?? player.maxHp, Math.max(0, Math.floor(player.hp)))
}
// 🔥 处理战斗结束（发放奖励 + 显示弹窗）
function handleBattleEnd(result) {
    battleRounds.value = result.rounds
    battleIsVictory.value = result.isVictory
    battleItemRewards.value = result.itemRewards

    // ⚔️ 战斗结束同步血量：player.hp 是战斗权威值，无条件全量回写 store
    //    （takeDamage 飘字误扣已有恢复守护，store 在战斗中不随伤害变动，全量同步不会产生"回满"偏差）
    syncPlayerHpToStore()

    // 如果是胜利，立即发放奖励
    if (result.isVictory) {
        // 发放物品奖励
        result.itemRewards.forEach(item => {
            user.addItemToInventory(item)
        })

        // 💰 击败敌人金币奖励：按敌人类型分档（普通/精英/Boss）随等级成长，直接入账商店金币
        const _gold = Math.max(0, Math.floor(result.goldGained || 0));
        if (_gold > 0) {
          if (!user.shop) user.shop = { money: 100, items: [] };
          user.shop.money = (user.shop.money ?? 0) + _gold;
          battleGoldGained.value = _gold;
        }

        // ⛔ 讨伐战已移除：Boss 战判定（battleSceneId/bossDefeated）与按场景深入度系统已删除

        // 道具经验加成（显示与入账统一口径：与 addExp 内部公式完全同式）
        const equipExpBonus = user.getEquippedExpBonus ? user.getEquippedExpBonus() : 0;
        // 🔥 天赋：增幅 - 击败魔物获得经验提升（与道具加成叠加）
        let talentExpMult = 0;
        if (user.hasTalent('luck_grace')) {
            const lgLv = user.getTalentLevel('luck_grace') || 1;
            talentExpMult = (Number(user.getTalentEffect?.('luck_grace', 'expMult') ?? 0.15) + Number(user.getTalentEffect?.('luck_grace', 'expMultPerLv') ?? 0.075) * (lgLv - 1));
        }
        // 📈 显示 = 基础 × (1+天赋) × (1+道具+盈悟)，与 addExp 内部计算恒等（addExp 传参已含天赋倍率）
        const finalExp = Math.floor(result.expGained * (1 + talentExpMult) * (1 + equipExpBonus + (user.getExpGainBonus?.() || 0)));
        battleExpGained.value = finalExp;

        // 发放经验并检查升级（传基础经验，内部统一计算加成）
        const levelUpInfo = user.addExp(result.expGained * (1 + talentExpMult))
        battleLevelUpInfo.value = levelUpInfo

        // ⚔️ 战斗胜利：携带队友也获得经验（基础经验，不吃主角经验倍率——道具/天赋加成不参与）
        const _teamAlly = user.getNpcAlly?.()
        let _allyResults = []
        if (_teamAlly) {
          const allyExpRes = user.addAllyExp?.(_teamAlly, result.expGained)
          if (allyExpRes?.ok) {
            const _bd = user.pixi?.allyBattleData?.[_teamAlly] || {}
            _allyResults = [{
              img: _teamAlly,
              name: _bd.name || user.pixi?.npcSelectList?.find(n => n.img === _teamAlly)?.name || _teamAlly,
              ...allyExpRes,
            }]
            // 队友升级不再弹顶部浮窗（升级照常，结算面板经验条动画正常展示）
          }
        }
        allyExpResults.value = _allyResults

        // ⛔ 讨伐战已移除：深入度解锁（noDepthUnlock/battleSceneId/unlockedDepth）已删除
    } else {
        battleLevelUpInfo.value = null
        // 🏆 战斗失败：把本局获得的经验结算给局外角色（地牢死亡再触发时由 runMetaSettled 防重）
        user.settleMetaExp()
    }

    // 显示弹窗
    showBattleResult.value = true
}

// 🔥 关闭战斗结果弹窗（退出战斗）
function closeBattleResult() {
    showBattleResult.value = false

    // 退出战斗，返回主世界
    setTimeout(() => {
        emitter.emit("enablePlayerControl")
    }, 200)
}

// 🔥 离开战斗
function handleLeaveBattle() {
    closeBattleResult()
}

// ⛔ 讨伐战已移除：handleContinueDeeper（继续深入）、handleStaySearch（原地搜索）、
//    restartBattle（按深度重新生成敌人）已删除，战斗胜利后统一「返回」

// 血量百分比（0-100）
const hpPercent = computed(() => {
    return Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
});

// 护盾百分比（基于最大生命值计算，0-100）
const shieldPercent = computed(() => {
    const shield = player.shield || 0;
    return Math.max(0, Math.min(100, (shield / player.maxHp) * 100));
});

// 🐢 玩家减速 debuff（缠绕/霜冻/冰寒等带 speedDebuff 的）——pixi 层图标（同中毒布局，右上回合/右下层数）
const playerSlowDebuffs = computed(() => {
    return (player.debuffs || [])
        .filter(d => d.speedDebuff != null && d.speedDebuff !== 0)
        .map(d => ({ name: d.name, remaining: d.remaining, stacks: d.stacks ?? 1 }));
});
const handlePlayerSlowChanged = (payload) => {
    // 🐢 优先用事件携带的数据（战斗数据非响应式，computed 可能不更新）
    const list = payload?.list ?? playerSlowDebuffs.value;
    pixiIndexRef.value?.updatePlayerSlowIcons?.(list);
};
emitter.on("playerSlowChanged", handlePlayerSlowChanged);


// 🔥 性能优化：缓存存活的友军和敌人，避免模板中每次都filter
const aliveAllies = computed(() => {
    return allies.filter(x => x.hp > 0);
});

const aliveEnemies = computed(() => {
    return enemies.value.filter(item => item.hp > 0);
});

// 🎯 行动条蓝色填充：进入战斗后 0→100 动画填满一次，之后固定（不随进度变化）
const actionBarFillPct = ref(0);
onMounted(() => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { actionBarFillPct.value = 100; });
    });
});



// 🔥 玩家 buff 列表（过滤掉不可见buff和debuff）
// 🐢 统一计算玩家总减速：自动检测所有减速来源（debuff 里带 speedDebuff 的 + dungeonSpeedDown）
function getPlayerTotalSlow() {
    const debuffs = player.debuffs || [];
    let total = 0;
    const sources = [];
    debuffs.forEach(b => {
        if (b && b.speedDebuff > 0) {
            total += b.speedDebuff;
            sources.push({ name: b.name || '未知减速', value: b.speedDebuff });
        }
    });
    const dungeonSlow = Number(player?.juese?.dungeonSpeedDown || 0);
    if (dungeonSlow > 0) {
        const pct = Math.round(dungeonSlow * 100);
        total += pct;
        sources.push({ name: '地牢减速诅咒', value: pct });
    }
    return { total: Math.round(total * 10) / 10, sources };
}
// 📊 统一属性变化检测：自动对比当前属性和基础属性，生成状态栏图标
// 覆盖：攻击力、护甲、魔抗、速度
function getPlayerStatChanges() {
    const result = [];
    const base = player._baseStats || {};
    const cur = player;

    // 1. 攻击力
    const atkDiff = Math.round(((cur.attack || 0) - (base.attack || cur.baseAttack || 0)) * 10) / 10;
    if (atkDiff !== 0) {
        result.push({
            name: atkDiff > 0 ? '攻击力提升' : '攻击力降低',
            type: atkDiff > 0 ? 'buff' : 'debuff',
            total: atkDiff,
            unit: '',
            sources: (player._atkUpDetails || []).map(d => ({ name: d.name, value: d.value, pct: d.pct })),
            remaining: 999,
            isPermanent: true
        });
    }

    // 2. 速度（基于基础移速判断：高显示提升，低显示降低，相等不显示）
    const baseSpeed = base.speed || cur.baseSpeed || 0;
    const speedDiffPct = baseSpeed > 0 ? Math.round(((cur.speed || 0) - baseSpeed) / baseSpeed * 1000) / 10 : 0;
    const allSpeedSources = [];
    // 收集所有减速来源
    const debuffs = player.debuffs || [];
    debuffs.forEach(b => {
        if (b && b.speedDebuff > 0) {
            allSpeedSources.push({ name: b.name || '未知减速', value: -b.speedDebuff, pct: true });
        }
    });
    const dungeonSlow = Number(player?.juese?.dungeonSpeedDown || 0);
    if (dungeonSlow > 0) {
        const pct = Math.round(dungeonSlow * 100);
        allSpeedSources.push({ name: '地牢减速诅咒', value: -pct, pct: true });
    }
    // 收集所有加速来源
    const speedBuffs = player.buffs || [];
    speedBuffs.forEach(b => {
        if (b && b.speedUp > 0) {
            allSpeedSources.push({ name: b.name || '未知加速', value: b.speedUp, pct: true });
        }
    });
    if (speedDiffPct !== 0) {
        result.push({
            name: speedDiffPct > 0 ? '移速提升' : '移速降低',
            type: speedDiffPct > 0 ? 'buff' : 'debuff',
            total: Math.abs(speedDiffPct),
            unit: '%',
            sources: allSpeedSources,
            remaining: 999,
            isPermanent: true
        });
    }
    // 3. 护甲
    const armorDiff = Math.round(((cur.armor || 0) - (base.armor || cur.baseArmor || 0)) * 10) / 10;
    if (armorDiff > 0) {
        result.push({
            name: '护甲提升',
            type: 'buff',
            total: armorDiff,
            unit: '',
            sources: [],
            remaining: 999,
            isPermanent: true
        });
    } else if (armorDiff < 0) {
        result.push({
            name: '护甲降低',
            type: 'debuff',
            total: Math.abs(armorDiff),
            unit: '',
            sources: [],
            remaining: 999,
            isPermanent: true
        });
    }

    // 4. 魔抗
    const mresDiff = Math.round(((cur.magicResist || 0) - (base.magicResist || cur.baseMagicResist || 0)) * 10) / 10;
    if (mresDiff > 0) {
        result.push({
            name: '魔抗提升',
            type: 'buff',
            total: mresDiff,
            unit: '',
            sources: [],
            remaining: 999,
            isPermanent: true
        });
    } else if (mresDiff < 0) {
        result.push({
            name: '魔抗降低',
            type: 'debuff',
            total: Math.abs(mresDiff),
            unit: '',
            sources: [],
            remaining: 999,
            isPermanent: true
        });
    }

    // 5. 元素伤害提升（火/水/冰/雷/风/毒）
    const elements = [
        { key: 'fireDmgUp', name: '火元素伤害提升' },
        { key: 'waterDmgUp', name: '水元素伤害提升' },
        { key: 'iceDmgUp', name: '冰元素伤害提升' },
        { key: 'thunderDmgUp', name: '雷元素伤害提升' },
        { key: 'windDmgUp', name: '风元素伤害提升' },
        { key: 'poisonDmgUp', name: '毒元素伤害提升' },
    ];
    elements.forEach(elem => {
        const val = cur[elem.key] || 0;
        if (val > 0) {
            result.push({
                name: elem.name,
                type: 'buff',
                total: Math.round(val * 10) / 10,
                unit: '%',
                sources: [],
                remaining: 999,
                isPermanent: true
            });
        }
    });
    return result;
}

// 🎯 通用版：传入 unit（player 或 enemy），自动检测所有属性变化
function getUnitStatChanges(unit) {
    if (!unit) return [];
    const result = [];
    const base = unit._baseStats || {};

    // 攻击力
    const atkDiff = Math.round(((unit.attack || 0) - (base.attack || unit.baseAttack || 0)) * 10) / 10;
    if (atkDiff !== 0) {
        result.push({
            name: atkDiff > 0 ? '攻击力提升' : '攻击力降低',
            type: atkDiff > 0 ? 'buff' : 'debuff',
            total: Math.abs(atkDiff),
            unit: '',
            sources: [],
            remaining: 999,
            isPermanent: true
        });
    }

    // 速度
    const debuffs = unit.debuffs || [];
    let slowTotal = 0;
    const slowSources = [];
    debuffs.forEach(b => {
        if (b && b.speedDebuff > 0) {
            slowTotal += b.speedDebuff;
            slowSources.push({ name: b.name || '未知减速', value: b.speedDebuff });
        }
    });
    if (slowTotal > 0) {
        result.push({
            name: '移速降低',
            type: 'debuff',
            total: Math.round(slowTotal * 10) / 10,
            unit: '%',
            sources: slowSources,
            remaining: 999,
            isPermanent: true
        });
    }

    // 护甲
    const armorDiff = Math.round(((unit.armor || 0) - (base.armor || unit.baseArmor || 0)) * 10) / 10;
    if (armorDiff !== 0) {
        result.push({
            name: armorDiff > 0 ? '护甲提升' : '护甲降低',
            type: armorDiff > 0 ? 'buff' : 'debuff',
            total: Math.abs(armorDiff),
            unit: '',
            sources: [],
            remaining: 999,
            isPermanent: true
        });
    }

    // 魔抗
    const mresDiff = Math.round(((unit.magicResist || 0) - (base.magicResist || unit.baseMagicResist || 0)) * 10) / 10;
    if (mresDiff !== 0) {
        result.push({
            name: mresDiff > 0 ? '魔抗提升' : '魔抗降低',
            type: mresDiff > 0 ? 'buff' : 'debuff',
            total: Math.abs(mresDiff),
            unit: '',
            sources: [],
            remaining: 999,
            isPermanent: true
        });
    }

    // 元素伤害提升
    const elements = [
        { key: 'fireDmgUp', name: '火元素伤害提升' },
        { key: 'waterDmgUp', name: '水元素伤害提升' },
        { key: 'iceDmgUp', name: '冰元素伤害提升' },
        { key: 'thunderDmgUp', name: '雷元素伤害提升' },
        { key: 'windDmgUp', name: '风元素伤害提升' },
        { key: 'poisonDmgUp', name: '毒元素伤害提升' },
    ];
    elements.forEach(elem => {
        const val = unit[elem.key] || 0;
        if (val > 0) {
            result.push({
                name: elem.name,
                type: 'buff',
                total: Math.round(val * 10) / 10,
                unit: '%',
                sources: [],
                remaining: 999,
                isPermanent: true
            });
        }
    });

    return result;
}

const playerBuffs = computed(() => {
    const list = [...(player.buffs || []), ...(player.debuffs || [])];
    list.forEach(b => { if (b) void (b.name + (b.remaining ?? 0) + (b.atkUp ?? 0) + (b.atkPct ?? 0) + (b.speedDebuff ?? 0)); });
    void player.attack; void player.speed; void player.armor; void player.magicResist;
    const statChanges = getPlayerStatChanges();
    statChanges.forEach(sc => list.push(sc));
    return list.filter(b => BUFF_SKIN_MAP[b.name] || b.isPermanent);
});

// 🎯 毒图标是否激活（用于显示 DOM 点击层）
const playerPoisonActive = computed(() => {
    return (player.buffs || []).some(b => b.name === "中毒" || b.poisonStacks > 0);
});

// 🎖️ buff 详情 Popover
const showBuffPopover = ref(false);
const selectedBuffIdx = ref(0);
// 📊 buff 聚合：同类属性提升合并成一项，详情显示各来源
const BUFF_CATEGORIES = {
    attackUp: { label: "攻击力提升", names: ["晨曦的祝福", "武器强化", "愤怒", "号令", "残血收割", "噬灵收割", "元素增伤", "雷之祝福"] },
    fireDmgUp: { label: "火元素伤害提升", names: ["火灵祝福", "元素共鸣"] },
    thunderDmgUp: { label: "雷属性伤害提升", names: ["雷灵祝福"] },
    waterDmgUp: { label: "水元素伤害提升", names: ["水灵祝福"] },
    iceDmgUp: { label: "冰元素伤害提升", names: ["冰灵祝福"] },
    armorUp: { label: "护甲提升", names: ["绝对防御", "抵抗姿态", "盾反", "无畏强攻"] },
    magicResistUp: { label: "魔抗提升", names: ["纯净元素", "灵能愈合"] },
    speedUp: { label: "速度提升", names: ["锋速", "余速续航", "瞬连突袭"] },
    speedDown: { label: "移速降低", names: ["粘液减速", "缠绕", "霜冻", "冰寒", "减速诅咒"] },
};

// 🎨 状态关键词 → 弹窗配色（按类型着色：攻击/毒/元素等）
const BUFF_KEYWORD_COLORS = [
    { keys: ['火'], color: '#F97316' },
    { keys: ['冰'], color: '#7DD3FC' },
    { keys: ['雷', '电'], color: '#C084FC' },
    { keys: ['水'], color: '#38BDF8' },
    { keys: ['风'], color: '#2DD4BF' },
    { keys: ['毒', '腐'], color: '#A3E635' },
    { keys: ['攻击', '攻'], color: '#F87171' },
    { keys: ['护甲', '盾'], color: '#60A5FA' },
    { keys: ['魔抗'], color: '#C084FC' },
    { keys: ['速度'], color: '#4ADE80' },
    { keys: ['生命', '血'], color: '#F87171' },
    { keys: ['幸运'], color: '#FDE047' },
    { keys: ['元素'], color: '#E879F9' },
];
function buffColorOf(name) {
    for (const k of BUFF_KEYWORD_COLORS) {
        if (k.keys.some(key => (name || '').includes(key))) return k.color
    }
    return '#FBBF24' // 默认琥珀
}

// 📊 各类属性提升的来源数值（读 buff 对象上的实际加成字段）
function buffGainValue(b, key) {
    if (key === 'attackUp') return b.atkUp || 0;
    if (key === 'fireDmgUp') return b.name === '火灵祝福' ? 25 : (b.value || 0);
    if (key === 'thunderDmgUp') return b.name === '雷灵祝福' ? 15 : (b.value || 0);
    if (key === 'waterDmgUp') return b.name === '水灵祝福' ? 15 : (b.value || 0);
    if (key === 'iceDmgUp') return b.name === '冰灵祝福' ? 15 : (b.value || 0);
    if (key === 'armorUp') return b.armorUp || 0;
    if (key === 'magicResistUp') return b.mresUp || b.magicResistUp || 0;
    if (key === 'speedUp') return b.speedUp || 0;
    if (key === 'speedDown') return b.speedDebuff || 0; // 🐢 移速降低：读 speedDebuff（否则来源恒显示 +0）
    return 0;
}

const allBuffsForPopover = computed(() => {
    const all = [...(player.buffs || []), ...(player.debuffs || [])];
    const grouped = {};
    const ungrouped = [];
    all.forEach(b => {
        let matched = false;
        for (const [key, cat] of Object.entries(BUFF_CATEGORIES)) {
            if (cat.names.includes(b.name)) {
                if (!grouped[key]) grouped[key] = { name: cat.label, type: key, sources: [], remaining: 999, isPermanent: true, isGrouped: true, total: 0, unit: (key === 'fireDmgUp' || key === 'thunderDmgUp' || key === 'waterDmgUp' || key === 'iceDmgUp') ? '%' : '' };
                // 来源显示值：攻击力提升显示百分比（atkPct），火伤固定 25%，其余按固定数值
                const srcVal = key === 'attackUp' ? (b.atkPct || 0) : (key === 'fireDmgUp' ? 25 : (key === 'thunderDmgUp' ? 15 : (key === 'waterDmgUp' ? 15 : (key === 'iceDmgUp' ? 15 : buffGainValue(b, key)))));
                // 总计：攻击力提升按固定数值求和，其余按来源值求和
                const totalVal = key === 'attackUp' ? (b.atkUp || 0) : srcVal;
                // 🐢 移速降低：来源以负值显示（-6），总计取绝对值（共提升：6）
                grouped[key].sources.push({ name: b.name, value: key === 'speedDown' ? -srcVal : srcVal, pct: key === 'speedDown' ? !!b.pct : undefined });
                grouped[key].total += Math.abs(totalVal);
                matched = true;
                break;
            }
        }
        if (!matched) {
            // 🎖️ 攻击力提升（图标占位 buff）：来源来自 _atkUpDetails（天赋/卡牌/道具统一记录）
            if (b.name === '攻击力提升') {
                const srcs = (player._atkUpDetails || []).map(d => ({ name: d.name, value: d.value, pct: d.pct }));
                ungrouped.push({ ...b, isGrouped: true, sources: srcs, total: Math.round((player.attack - player.baseAttack) * 100) / 100, unit: '' });
            } else {
                ungrouped.push(b);
            }
        }
    });
    // 🎯 攻击力共提升：以真实攻击力差值计；来源 = buff 来源（百分比）+ 统一记录的直接加攻来源
    if (grouped.attackUp) {
        grouped.attackUp.total = Math.round((player.attack - player.baseAttack) * 100) / 100;
        grouped.attackUp.sources.forEach(src => { src.pct = true });
        (player._atkUpDetails || []).forEach(d => {
            if (!grouped.attackUp.sources.some(x => x.name === d.name)) grouped.attackUp.sources.push({ name: d.name, value: d.value, pct: d.pct });
        });
    }
    return [...ungrouped, ...Object.values(grouped)];
});
const selectedBuff = computed(() => allBuffsForPopover.value[selectedBuffIdx.value] || null);

// 🧪 计算中毒每回合伤害（供详情显示）
const poisonDamagePreview = computed(() => {
    const b = selectedBuff.value;
    if (!b || b.name !== "中毒") return null;
    const atk = b.attack || 0;
    const ratio = b.poisonRatio || 0.5;
    const stacks = b.stacks || 1;
    return Math.max(1, Math.round(atk * ratio * (1 + 0.5 * (stacks - 1))));
});

// 🩸 计算流血每回合伤害（供详情显示）
const bleedDamagePreview = computed(() => {
    const b = selectedBuff.value;
    if (!b || b.name !== `流血`) return null;
    const atk = b.sourceAtk || b.attack || 0;
    const stacks = b.stack || b.stacks || 1;
    // 公式：(12 + 4*层数)% 攻击力
    const ratio = (12 + 4 * stacks) / 100;
    return Math.max(1, Math.round(atk * ratio));
});
function handlePlayerBuffTap() {
    showBuffPopover.value = true;
    selectedBuffIdx.value = 0;
}
emitter.on("playerBuffTap", handlePlayerBuffTap);

// 🧪 玩家中毒图标（与 buff 图标同排的正方形，边角显示层数/回合；由 pixi 层渲染）
const handlePlayerPoison = ({ stacks, remaining }) => {
    pixiIndexRef.value?.updatePlayerPoisonIcon?.(stacks, remaining);
};
emitter.on("playerPoison", handlePlayerPoison);

// 血条动态颜色：根据血量自动切换绿/黄/红；虚影层固定红色（扣血时滞后显示的损失血量）
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
            delayed: 'bg-red-700/60'
        };
    }
    return {
        main: 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
        delayed: 'bg-red-700/60'
    };
});
/* ===== 单位 ===== */
const player = createUnit({
    ...user.pixi.player.juese,
    x: user.pixi.activePlayer.x,
    y: user.pixi.activePlayer.y
})
battleLog('user.pixi.player.juese=', user.pixi.player.juese);

battleLog('player=', player);

const allies = reactive(createAllies())
const enemies = ref([])

// 🃏 抽牌制：战斗手牌初始为空，每回合开始从牌组抽牌（不再常驻携带卡）
const playerHand = ref([])
// 🃏 抽牌制牌组：当前卡组（user.pixi.player.deck，可在 dladmin 编辑初始卡组）
//    卡名数组可含重复（重复 = 多副本，抽牌堆对应多张）
const BATTLE_DECK = (() => {
  const d = user.pixi?.player?.deck;
  return Array.isArray(d) && d.length ? [...d] : ['射击', '激光', '狙击', '碎甲弹', '武器强化'];
})()
const drawPile = ref([])    // 抽牌堆
const discardPile = ref([]) // 弃牌堆
const playedThisTurn = ref([]) // 本回合已使用的卡：点击结束回合后洗回抽牌堆（本回合内抽牌技能抽不到它们）
const usedCardThisTurn = []
// 蓄灵计数器：记录本回合已使用牌数
let _cardUseCountThisTurn = 0
// 🔥 魔力溢涌：跨战斗魔力累积（存 player 对象，战斗重置不丢失）
// 初始化魔力溢涌计数器
if (player._manaCycleSpentCount === undefined) player._manaCycleSpentCount = 0
// 🔥 时间加速：跨战斗魔力累积
if (player._manaCdReduceCount === undefined) player._manaCdReduceCount = 0

// 计算敌人战斗站位（右侧对齐排列，屏幕相对坐标，必须和 pixi.vue 渲染位置一致）
// xOffsetVW：整排怪物 X 偏移（vw 单位），取「第一个敌人」的配置值，所有怪物跟随一起偏移
// - 在 monsterConfigs / 自定义战斗 enemies 里配置 xOffsetVW
// - 负值往左，正值往右，不配置默认 0
function calcEnemyPosition(index, totalCount, enemiesData) {
    const NPC_SPACING = vw * 0.08;   // 8vw 间距，数据层坐标
    const RIGHT_FIXED = vw * 0.82;   // 最右侧固定位置 82vw，数据层坐标
    // 整排偏移：取第一个敌人的 xOffsetVW（其他怪物跟随第一个一起偏移）
    const firstEnemy = enemiesData?.[0]?.data;
    const rowOffsetVW = firstEnemy?.xOffsetVW ?? 0;
    const xOffset = RIGHT_FIXED - (totalCount - index - 1) * NPC_SPACING + rowOffsetVW * vw / 100;
    // 📍 Y 轴偏移：按每个敌人自己的 yOffsetVH（vh 单位，正数=往下，负数=往上）
    const enemyData = enemiesData?.[index]?.data;
    const yOffsetVH = enemyData?.yOffsetVH ?? 0;
    return {
        x: xOffset,
        y: vh * 0.75 + yOffsetVH * vh / 100  // 75vh 高度基准 + 每敌人 Y 偏移（数据层坐标）
    };
}

// 从敌人配置数据读取（根据战斗深度动态调整敌人强度和数量）
// 优先使用自定义战斗配置（customBattle 事件写入，怪物完全自定义），否则按深度生成
const customBattleData = user.getDialogueFlag('customBattleData');
const hasCustomBattle = customBattleData && Array.isArray(customBattleData.enemies) && customBattleData.enemies.length > 0;

// 🌙 夜晚强度：地牢天黑（customBattle 显式传入）优先，同时跟随主世界昼夜兜底
//    （主世界黄昏/夜晚时无论进地牢还是自定义战斗，战斗界面都有夜色氛围，不再一片白）
const battleNightFactor = computed(() => {
    const cbd = customBattleData || {};
    let night = cbd.night ? (cbd.nightLevel || 1) : 0;
    if (typeof getNightFactor === 'function') {
      night = Math.max(night, Math.max(0, getNightFactor() || 0));
    }
    return night;
});
// 🌃 夜晚滤镜（屏幕级）：卡牌、左下角灵力等全部 UI 统一压暗 + 降饱和，
//    风格对齐主世界昼夜滤镜（最黑约 brightness 0.58 / saturate 0.6）
const battleScreenStyle = computed(() => {
    const n = battleNightFactor.value;
    if (n <= 0.35) return { transition: 'filter 0.7s ease' };
    const k = Math.min(1, (n - 0.35) / 0.65);
    return {
        filter: 'brightness(' + (1 - 0.42 * k).toFixed(3) + ') saturate(' + (1 - 0.4 * k).toFixed(3) + ')',
        transition: 'filter 0.7s ease',
    };
});
// 🎨 战斗背景差异化：跟随地牢天气/血月/昼夜（优先级：血月 > 雨/暴风雨/雷雨 > 雪 > 雾 > 夜晚 > 默认）
const battleBgStyle = computed(() => {
    const cbd = customBattleData || {};
    const w = cbd.weather;
    const night = battleNightFactor.value;
    let bg;
    if (cbd.bloodMoon || w === 'bloodmoon') {
        bg = 'radial-gradient(120% 90% at 50% 0%, rgba(180,40,40,.4), transparent 60%), linear-gradient(180deg, rgba(58,20,32,.5), rgba(26,10,16,.55))';
    } else if (w === 'rain' || w === 'storm' || w === 'thunderstorm') {
        bg = 'radial-gradient(120% 90% at 50% 0%, rgba(90,130,180,.3), transparent 60%), linear-gradient(180deg, rgba(29,41,56,.45), rgba(13,19,28,.5))';
    } else if (w === 'snow') {
        bg = 'radial-gradient(120% 90% at 50% 0%, rgba(200,220,240,.22), transparent 60%), linear-gradient(180deg, rgba(44,59,76,.4), rgba(26,36,48,.45))';
    } else if (w === 'fog') {
        bg = 'radial-gradient(120% 90% at 50% 0%, rgba(180,185,190,.2), transparent 60%), linear-gradient(180deg, rgba(52,57,63,.35), rgba(32,36,42,.4))';
    } else if (night > 0.35) {
        // 🌙 夜晚战斗背景：深蓝夜色，近不透明（不再透出白底）
        bg = 'radial-gradient(120% 90% at 50% 0%, rgba(70,90,160,.32), transparent 62%), linear-gradient(180deg, rgba(9,14,32,.8), rgba(4,6,12,.88))';
    } else {
        bg = 'radial-gradient(120% 90% at 50% 0%, rgba(120,120,140,.14), transparent 60%), linear-gradient(180deg, rgba(35,42,58,.18), rgba(20,24,34,.22))';
    }
    return { background: bg };
});
// 是否为自定义战斗（胜利弹窗只显示「返回」按钮）
const isCustomBattle = ref(hasCustomBattle);
// ⛔ 讨伐战已移除：battleSceneId / maxDepth / bossDefeated / effectiveMaxDepth /
//    battleDepth / canContinueDeeper（Boss 战判定与深入度系统）已删除
const allEnemiesData = hasCustomBattle
    ? createCustomEnemies(customBattleData.enemies, customBattleData.depth ?? null)
    : [] // ⛔ 讨伐战已移除：不再生成随机讨伐敌人
// 后续可根据当前地图 / 战斗深度过滤，暂时全量
const enemyList = ref(allEnemiesData);

enemies.value = []
const totalEnemies = enemyList.value.length;
// 🎯 初始敌人数据坐标 = 渲染位置（与 pixi createEnemySpine 同款公式 92vw/10vw/85vh），
//    保证「最近攻击」（风刃/碎甲弹按 e.x 选最近）与指定卡牌都基于正确位置。
//    ⚠️ calcEnemyPosition 是旧基准（82vw/8vw/75vh），与渲染基准不一致，弃用。
const rowOffsetVWInit = enemyList.value[0]?.data?.xOffsetVW ?? 0;
for (let i = 0; i < enemyList.value.length; i++) {
    const x = window.innerWidth * 0.92 - (totalEnemies - i - 1) * window.innerWidth * 0.10
        + window.innerWidth * (rowOffsetVWInit / 100);
    const y = window.innerHeight * 0.85
        + window.innerHeight * ((enemyList.value[i].data?.yOffsetVH ?? 0) / 100);
    enemies.value.push(
        createUnit({
            ...enemyList.value[i].data,
            // 🎯 保留敌人标识 juese（骨骼名，如 'nvhuang'/'guaiwu3'）——createBaseEnemy 在顶层，
            //    data 里没有；特效配置（ENEMY_EFFECT_CONFIG）按 juese 匹配，丢了就全走默认特效
            juese: enemyList.value[i].juese || enemyList.value[i].data?.juese || null,
            uid: `enemy_${i}`,  // 唯一ID，用于定位（解决同名敌人查找错误）
            x: x,
            y: y
        })
    )
}

// 敌人 spine 资源名数组（传给 pixi 层渲染）
const enemySpineNames = computed(() => {
    return enemyList.value.map(e => e.juese).filter(Boolean);
});

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
        // 🔥 蓄灵计数器跨回合累积（不重置）
        // ❄️ 手牌冰冻解除：冻结只持续玩家一个回合（凋零魔兽「凋零冰刺」），玩家回合结束时清除
        playerHand.value.forEach(c => { c.disabledLevel = 0 })
    },
    playerHand.value,
    () => {
        // 🧘 时序调息已移除：每回合开始固定抽 getCardsPerTurn() 张已保证手牌补充，
        //    旧逻辑"回合结束手牌<3补1"会与下一回合抽2张动画叠加成 3 张，体感异常
    }
);

playerHand.value.forEach((card, i) => {
    card.dragging = false
    card.disabledLevel = 0

    // ⭐ 星级系统：开局特殊效果
    // 影分身 3星：开局自动召唤
    if (card.name === '影分身' && card.star >= 3) {
        useSkillShadowClone(player, allies, enemies.value, battle, card)
        card.cooldown++
    }
    // 聚灵 2星：开局冷却-1，3星：开局冷却-2
    if (card.name === '聚灵' && card.star >= 2) {
        const reduce = card.star >= 3 ? 2 : 1;
        card.cooldown = Math.max(0, card.cooldown - reduce);
    }
})
calcArcCardPos();
const { endPlayerTurn } = battle
function myEndPlayerTurn() {
    if (!battleStarted.value) return
    if (tourVisible.value) return
    showBuffPopover.value = false // 🩹 结束回合后自动关闭玩家增益弹窗
    endPlayerTurn()
    playerHand.value.forEach(card => {
        resetFastReload(card)
    })
    // 🃏 本回合打出的牌直接洗回抽牌堆（下回合开始就有机会抽到，不再等抽空）
    if (playedThisTurn.value.length) {
      drawPile.value.push(...playedThisTurn.value)
      shuffleArr(drawPile.value)
      playedThisTurn.value.splice(0, playedThisTurn.value.length) // 原地清空，保持引用一致
    }
    // 🃏 炉石制：手牌跨回合保留（不进弃牌堆、不清空），下回合抽牌叠加，最多 9 张
    nextTick(() => calcArcCardPos());
}

const canDrag = computed(() => {
    // 必须战斗已开始才能拖拽卡牌
    return battleStarted.value && battle.state.currentActor === 'player' && battle.state.phase === 'action' && !isInDialogue.value
})

// 对话中：隐藏战斗 UI 和卡牌
const isInDialogue = computed(() => user.pixi.duihua)

const showCards = computed(() => {
    return battleStarted.value && battle.state.currentActor === 'player' && battle.state.phase === 'action' && !isInDialogue.value
})

const showEndButton = computed(() => {
    return battleStarted.value && battle.state.currentActor === 'player' && battle.state.phase === 'action' && !isInDialogue.value
})

// 当前是否有需要指定目标的卡牌正在被拖拽
const draggingNeedTargetCard = computed(() => {
    return playerHand.value.some(card => card.dragging && card.needTarget)
})

const getCardCursorClass = (card) => {
    if (card.cooldown > 0 || (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn)) {
        return 'cursor-not-allowed'
    }
    return 'cursor-grab'
}

/** 获取卡牌当前星级（兼容 CARD_DATA 配置） */
function getCardStar(item) {
  const cardData = item?.name ? user.pixi.player.CARD_DATA[item.name] : null;
  if (cardData?.star) return cardData.star;
  return item?.star || 1;
}
/** 🃏 卡牌类型（普通/特殊/独占） */
function getCardType(card) {
  const cfg = card?.name ? user.pixi.player.CARD_DATA[card.name] : null;
  return card?.type || cfg?.type || '';
}
// 稀有度名称与颜色
const RARITY_NAMES = {
  common: 'rarityCommon',
  excellent: 'rarityExcellent',
  rare: 'rarityRare',
  epic: 'rarityEpic',
  legendary: 'rarityLegendary',
};
const RARITY_COLORS = {
  common: '#909399',
  excellent: '#409EFF',
  rare: '#8B5CF6',
  epic: '#E6A23C',
  legendary: '#F56C6C',
};
function rarityName(r) { return L(RARITY_NAMES[r] || 'rarityCommon'); }
function rarityColor(r) { return RARITY_COLORS[r] || '#909399'; }
function getCardRarity(card) {
  return card?.rarity || user.pixi.player.CARD_DATA?.[card?.name]?.rarity || 'common';
}
// 📖 卡牌描述：按星级填充 "X/Y/Z%" 三档数值为当前星级实际值，金色加粗标注
function starSpecificDesc(desc, star) {
  if (!desc) return ''
  const idx = Math.max(1, Math.min(3, star || 1)) - 1
  // 📐 1️⃣ 条件句裁剪：二星起/三星生效的效果，当前星级未达到则整句删除（1星不显示未解锁效果；2星只显示二星档；3星替换为三星档数值并保留独有补充）
  const segs = desc.split(/([；。])/)
  let text = ''
  for (let k = 0; k < segs.length; k += 2) {
    const seg = segs[k], sep = segs[k + 1] || ''
    if (!seg) { text += sep; continue }
    if (/(二星|三星)/.test(seg)) {
      if (idx === 0) { text = text.replace(/；$/, '。'); continue } // 1星：效果未解锁，整句删除（前导分号改句号收尾）
      const isThreeOnly = /^(三星时|三星)/.test(seg.trim())
      let body = seg.trim().replace(/^(二星起|二星|三星时|三星)/, '')
      const m = body.match(/^(.*?)，三星(.*)$/)
      if (m) {
        if (idx === 1) {
          body = m[1] // 2星：只显示二星档
        } else {
          // 3星：二星档数值替换为三星档数值，保留三星独有补充（如"且…"、"（…）"）
          const v2 = (m[2].match(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/) || [''])[0]
          body = v2 ? m[1].replace(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, v2) : m[1]
          const rest2 = m[2].replace(/^[^，]+?[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, '').trim()
          if (/^[且并（(]/.test(rest2)) body = `${body}${/^[（(]/.test(rest2) ? '' : '，'}${rest2}`
        }
      }
      if (isThreeOnly && idx === 1) { text = text.replace(/；$/, '。'); continue } // 三星专属：2星删除（前导分号改句号收尾）
      text += body + sep
    } else {
      text += seg + sep
    }
  }
  // 🎨 2️⃣ 剩余文本先做 HTML 转义防注入，再把星级变动的数值用金色加粗标注（百分比 / 次数 / 灵力三档均支持）
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc(text).replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(%)?/g, (m, a, b, c, pct) => '<span style="color:#ffb400;font-weight:600">' + [a, b, c][idx] + (pct || '') + '</span>')
}
function getCardDynamicDesc(card, star) {
  const name = card?.name;
  const starNum = star || getCardStar(card) || 1;
  const cfg = name ? user.pixi.player.CARD_DATA[name] : null;
  return starSpecificDesc((cfg?.desc || card?.desc || ''), starNum);
}

/** 检查卡牌是否可免费打出（瞬连突袭或魔力溢涌） */
function getCardCanFree(card) {
    return (user.hasTalent('continuous_strike') && player._firstCardFreeThisTurn && !player._firstCardFreeConsumed)
        || (user.hasTalent('mana_cycle_free') && player._manaCycleFreePending && !player._manaCycleFreeConsumed)
}

const getCardOpacityClass = (card) => {
    const isFreeCard = user.hasTalent('continuous_strike') && player._firstCardFreeThisTurn && !player._firstCardFreeConsumed
    const isManaCycleFree = user.hasTalent('mana_cycle_free') && player._manaCycleFreePending && !player._manaCycleFreeConsumed
    const canFreePlay = isFreeCard || isManaCycleFree
    // ❄️ 冰冻卡（disabledLevel>0）不加灰不加透明度：冻结感由冰冻特效层（冰蓝渐变+雪花）呈现，
    //    避免 grayscale 把冰蓝覆盖层也变成灰色遮罩
    const dim = tourVisible.value || card.cooldown > 0 || (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn)
    return {
        'opacity-50 grayscale-[100%]': dim,
        // 可免费打出时统一显示免费效果
        'ring-2 ring-cyan-300/70 shadow-lg shadow-cyan-300/30':
            canFreePlay
    }
}

// 🌊 水精灵动态灵力：首次召唤 3 灵力，场上已有存活水精灵时强化仅需 2 灵力
function getCardFinalCost(card) {
    if (!card) return 0
    let base = card.cost ?? 0
    // 🌊⚡❄️🔥 四系精灵：首次召唤 3 灵力，场上已有存活精灵时仅需 2 灵力
    if ((card.name === '水精灵' && allies.some(a => a.isWaterSpirit && a.hp > 0 && !a._isDead)) ||
        (card.name === '雷精灵' && allies.some(a => a.isThunderSpirit && a.hp > 0 && !a._isDead)) ||
        (card.name === '冰精灵' && allies.some(a => a.isIceSpirit && a.hp > 0 && !a._isDead)) ||
        (card.name === '火精灵' && allies.some(a => a.isFireSpirit && a.hp > 0 && !a._isDead))) {
        base = 2
    }
    // ❄️ 冰精灵降费标记（_costReduce）：抽到的牌 / 随机手牌 灵力-1
    const reduced = Math.max(0, base - (card._costReduce ?? 0))
    // 🛡️ 总降费上限 1 点（强化召唤-1 + 冰精灵降费叠加也不超过原价-1，多次召唤不再 -2/-3）
    // 👑 独裁（暗影王二阶段）：手牌所需灵力 +1（打出后恢复）
    return Math.max(0, reduced + (card._costUp ?? 0))
}
// ❄️ 冰精灵行动：抽 drawCount 张牌（各灵力-1）+ 随机1张消耗>0手牌灵力-1
async function handleIceSpiritAction({ drawCount }) {
    if (!battleStarted.value) return
    // ✨ 玩家身上弹出 buff 文字（冰系蓝色由 BUFF_COLOR_MAP 控制）
    user.pixi.playerInstance?.showBuffText?.('冰精灵的祝福')
    const before = playerHand.value.length
    await drawCards(Math.max(1, drawCount || 1))
    // 刚抽到的牌各降 1 点灵力（不额外随机降费）
    const newCards = playerHand.value.slice(before)
    newCards.forEach(c => { c._costReduce = Math.min(1, (c._costReduce ?? 0) + 1) }) // ❄️ 单卡最多降1费，多次召唤不叠加
}
emitter.on('iceSpiritAction', handleIceSpiritAction)

// ❄️ 冰精灵重复召唤奖励：立即额外抽 1 张牌（不降费，纯抽牌）
function handleIceSpiritSummonDraw() {
    if (battleStarted.value) drawCards(1)
}
emitter.on('iceSpiritSummonDraw', handleIceSpiritSummonDraw)

// 💡 卡牌所需灵力是否降低（动态成本 < 基础成本，如水精灵强化召唤 3→2）
function isCardCostReduced(card) {
    const base = card?.cost ?? 0
    const final = getCardFinalCost(card)
    return base > 0 && final < base
}
// ❄️ 冰霜粒子随机样式（每颗粒子位置/延迟/漂移不同）
function frostStyle(n) {
    return {
        left: ((n * 37) % 100) + '%',
        top: ((n * 53) % 100) + '%',
        animationDelay: (n * 0.23) + 's',
        animationDuration: (1.8 + (n % 3) * 0.5) + 's',
        '--driftX': ((n % 2 ? 1 : -1) * (4 + (n % 4) * 3)) + 'px',
    }
}

function isCardUsable(card) {
    if (!battleStarted.value) return false
    if (tourVisible.value) return false
    if (card.disabledLevel > 0) return false
    if (isBannedCardName(card.name)) return false // 🈲 咒缚：本次地牢内该牌无法打出
    const isLimitReached = card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn
    // 🔥 天赋：瞬连突袭 - 本回合第一张卡牌无消耗，忽略灵力检查
    const isFreeCard = user.hasTalent('continuous_strike') && player._firstCardFreeThisTurn && !player._firstCardFreeConsumed
    // 🔥 天赋：魔力溢涌 - 每消耗6点魔力触发免单
    const isManaCycleFree = user.hasTalent('mana_cycle_free') && player._manaCycleFreePending && !player._manaCycleFreeConsumed
    return canDrag.value && !isLimitReached && card.cooldown <= 0 && (isFreeCard || isManaCycleFree || player.mp >= getCardFinalCost(card))
}

// ===== 指定目标卡牌：敌人位置检测 =====
// 检测半径（敌人周围多少像素内算命中）
const TARGET_DETECT_RADIUS = 90;

function getEnemyAtPosition(x, y) {
    // 🎯 用数据坐标检测（初始版本能正常工作的方式）：
    //    - 数据坐标已统一为渲染公式（92vw/10vw/85vh），与 pixi 渲染位置一致
    //    - 用鼠标真实位置（pageX/pageY）检测（比卡牌左上角更准）
    //    - 兜底：若渲染层 getEnemyAtRenderPos 可用，优先用它（最准）
    const renderUid = pixiIndexRef.value?.getEnemyAtRenderPos?.(x, y, TARGET_DETECT_RADIUS);
    const aliveEnemies = enemies.value.filter(e => e.hp > 0 && !hasCannotBeTargeted(e));

    // 优先渲染层命中
    if (renderUid) {
        const byRender = enemies.value.find(e => e.uid === renderUid);
        if (byRender && byRender.hp > 0 && !hasCannotBeTargeted(byRender)) {
            return byRender;
        }
    }
    // 数据坐标检测兜底（与渲染层一致：命中半径按敌人 spine 大小决定）
    for (const enemy of aliveEnemies) {
        // 🎯 半径 = ENEMY_TARGET_HEIGHT(35vh) × spineScale 的一半（宽高取大），保底 60px、上限 130px
        const targetH = window.innerHeight * 0.35 * (enemy.spineScale ?? 1);
        const halfH = targetH * 0.5;
        const hitRadius = Math.max(60, Math.min(130, Math.max(targetH * 0.3, halfH)));
        // 🎯 检测中心上移半高的一半（对齐敌人身体中下部，与渲染层一致）
        const dx = x - enemy.x;
        const dy = y - (enemy.y - halfH * 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= hitRadius) {
            return enemy;
        }
    }
    return null;
}

// 🎯 检查敌人是否「无法被指定卡牌选中」（遁入暗影被动）
function hasCannotBeTargeted(enemy) {
    if (enemy._cannotBeTargeted) return true; // 动态标记（技能期间）
    if (Array.isArray(enemy.passives)) {
        return enemy.passives.some(p => p.type === 'cannotBeTargeted');
    }
    return false;
}

// 卡牌悬停敌人变化：通知 pixi 层高亮/取消高亮
function handleTargetHover(enemy) {
    if (enemy) {
        emitter.emit('cardTargetHover', { enemyUid: enemy.uid, hovering: true });
    } else {
        emitter.emit('cardTargetHover', { hovering: false });
    }
}

// 卡牌释放处理（包装 battle.playerUseCard，支持目标参数）
function handleCardDrop(card, target) {
    battle.playerUseCard(card, target);
}

// 拖拽粒子发射器（每个卡牌一个，拖拽时创建，松开时销毁）
const dragParticleMap = new Map()

/** 卡牌 Dom 尺寸（与模板中 w-[20vh] h-[30.54vh] 一致） */
const CARD_HALF_W = 10 // 10vh
const CARD_HALF_H = 15.27 // 15.27vh

function handleDragStart(card) {
    if (dragParticleMap.has(card.id)) return
    const cx = card.x + CARD_HALF_W * vh / 100
    const cy = card.y + CARD_HALF_H * vh / 100
    // lightning → electric 映射由 createDragParticles 内部处理
    const emitter = createDragParticles(card.dmgType, cx, cy)
    if (emitter) dragParticleMap.set(card.id, emitter)
}

function handleDragUpdate(card) {
    const cx = card.x + CARD_HALF_W * vh / 100
    const cy = card.y + CARD_HALF_H * vh / 100
    const emitter = dragParticleMap.get(card.id)
    if (emitter) emitter.update(cx, cy)
    // 🃏 开始拖动后 0.25 秒关闭卡牌详情 Popover（只触发一次，避免拖动时弹窗遮挡）
    if (cardPopVisibleId.value !== null && !dragMoveArmed) {
        dragMoveArmed = true
        popoverCloseTimer = setTimeout(() => {
            closeCardPopover()
            popoverCloseTimer = null
            dragMoveArmed = false
        }, 250)
    }
}

function handleDragEnd(card) {
    const emitter = dragParticleMap.get(card.id)
    if (emitter) {
        emitter.destroy()
        dragParticleMap.delete(card.id)
    }
    // 🃏 松开：清除拖动关闭计时器（拖动不足 0.25s 松开不关闭，避免与 clearLongPress 冲突）
    if (popoverCloseTimer) { clearTimeout(popoverCloseTimer); popoverCloseTimer = null }
    dragMoveArmed = false
    // 🃏 注意：不能在这里关闭 Popover——endDrag 会在每次松开（含纯单击）时回调它，
    //    会把 clearLongPress 刚弹出的详情立即关掉。关闭只放在 useCard（打出时）。
}

const { startDrag } = useCardDrag(playerHand.value, vh, handleCardDrop, {
    getEnemyAtPosition,
    onTargetHover: handleTargetHover,
    onDragStart: handleDragStart,
    onDragUpdate: handleDragUpdate,
    onDragEnd: handleDragEnd,
})

function useCard(card, target = null) {
    if (!battleStarted.value) return 0
    if (tourVisible.value) return 0
    closeCardPopover() // 🃏 打出卡牌：关闭卡牌详情 Popover
    showBuffPopover.value = false // 🩹 打出手牌后自动关闭玩家增益弹窗
    if (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn) return 0
    // 🔥 天赋：瞬连突袭 - 本回合第一张卡牌无消耗
    const isFreeCard = user.hasTalent('continuous_strike') && player._firstCardFreeThisTurn && !player._firstCardFreeConsumed;
    // 🔥 天赋：魔力溢涌 - 每消耗6点魔力触发免单
    const isManaCycleFree = user.hasTalent('mana_cycle_free') && player._manaCycleFreePending && !player._manaCycleFreeConsumed;

    if (isFreeCard) {
        player._firstCardFreeConsumed = true;
        // 不检查灵力，不扣灵力
    } else if (isManaCycleFree) {
        player._manaCycleFreeConsumed = true;
        player._manaCycleFreePending = false;
        // 不检查灵力，不扣灵力，但依然计入本回合已用牌数（影响蓄灵等天赋）
    } else {
        const finalCost = getCardFinalCost(card)
        if (player.mp < finalCost) return 0
        if (card.limitPerTurn > 0) card.usedCount++
        player.mp -= finalCost
        card._costUp = 0 // 👑 独裁：打出后恢复灵力消耗

        // 🔥 云弥被动：每消耗 X 点魔力后，对最近的敌人造成 Y% 水属性攻击力伤害（数值来自同伴配置 passiveManaCost/passiveValue/passiveDmgType）
        //    消耗魔力的累计计数器（跨回合保留）
        const yuAlly = allies.find(a => a.isNpcAlly && a.passiveType === 'manaConsume');
        if (yuAlly && yuAlly.hp > 0) {
            player._manaSpentCount = (player._manaSpentCount || 0) + finalCost;
            const MANA_THRESHOLD = yuAlly.passiveManaCost ?? 10;
            while (player._manaSpentCount >= MANA_THRESHOLD) {
                player._manaSpentCount -= MANA_THRESHOLD;
                // 找最近的存活敌人（x 距离玩家最近）
                const aliveEne = enemies.value.filter(e => e.hp > 0);
                if (aliveEne.length > 0) {
                    const nearest = aliveEne.reduce((a, b) =>
                        Math.abs(a.x - player.x) <= Math.abs(b.x - player.x) ? a : b
                    );
                    const rawDmg = Math.round((yuAlly.attack || yuAlly.baseAttack || 14) * (yuAlly.passiveValue ?? 2.5) * (1 + (yuAlly.allyDmgBonus || 0)) * 100) / 100;
                    calculateFinalDamage(rawDmg, nearest, { ignoreArmor: 0, dmgType: yuAlly.passiveDmgType ?? 'water', player: yuAlly, buff: null, applyElement: true, enemies: [], skillName: '溢灵' });
                    user.pixi.playerInstance?.showBuffText('溢灵');
                    battleLog(`🧙 ${yuAlly.name} 被动【溢灵】：魔力满${MANA_THRESHOLD}，对 ${nearest.name} 造成 ${rawDmg} 水伤`);
                }
            }
        }

        // 🔥 魔力溢涌：扣费后检查是否达到6点阈值，触发下次免单
        if (user.hasTalent('mana_cycle_free')) {
            const cycleCost = Number(user.getTalentEffect?.('mana_cycle_free', 'manaCost') ?? 6) || 6
            player._manaCycleSpentCount = (player._manaCycleSpentCount || 0) + finalCost
            while (player._manaCycleSpentCount >= cycleCost) {
                player._manaCycleSpentCount -= cycleCost
                player._manaCycleFreePending = true
                player._manaCycleFreeConsumed = false
                user.pixi.playerInstance?.showBuffText('魔力溢涌')
                battleLog('[天赋] 魔力溢涌：累计消耗6点魔力，本回合下一张卡牌免费')
            }
        }

        // 🔥 天赋：魔力淬体 - 每消耗1点魔力，攻击力永久提升，持续至战斗结束
        if (user.hasTalent('mana_atk_stack') && card.cost > 0) {
            const lv = user.getTalentLevel('mana_atk_stack') || 1
            const rate = (Number(user.getTalentEffect?.('mana_atk_stack', 'atkPerMana') ?? 0.01) + Number(user.getTalentEffect?.('mana_atk_stack', 'atkPerManaPerLv') ?? 0.0025) * (lv - 1))
            const atkBonus = Math.round(player.baseAttack * rate * card.cost * 100) / 100
            playerAttackUp(player, atkBonus, rate * card.cost * 100, '魔力淬体')
            battleLog(`[天赋] 魔力淬体 Lv.${lv}：消耗${card.cost}魔力，攻击力+${atkBonus}（+${Math.round(rate * card.cost * 100)}%）`)
        }

    }

    let animTime = 300
    // ⚠️ try/catch：单个技能异常不能中断整个出牌流程（否则后续所有技能的特效/结算都会失效）
    try {
      animTime = useSkill(card.name, player, enemies.value, allies, battle, card, playerHand.value, user, target)
    } catch (e) {
      console.error('[技能] useSkill 异常:', card.name, e)
    }
    // 🃏 双兆：抽取 2 张卡牌（无伤害技能，效果直接在此结算）
    if (card.name === '双兆') {
      drawCards(2)
    }
    // 🔥 天赋：蓄灵 - 每使用N张牌恢复1点灵力（needCards 基础牌数 / perLvCards 每级变化，管理页可改）
    if (user.hasTalent('card_draw_mana')) {
        const talentLv = user.getTalentLevel('card_draw_mana') || 1
        const baseCards = Number(user.getTalentEffect?.('card_draw_mana', 'needCards') ?? 5)
        const perLvCards = Number(user.getTalentEffect?.('card_draw_mana', 'perLvCards') ?? -1)
        const mpGain = Number(user.getTalentEffect?.('card_draw_mana', 'mp') ?? 1)
        const needCount = Math.max(1, baseCards + perLvCards * (talentLv - 1)) // Lv.1=5张, Lv.2=4张
        // 本回合已用牌数+1（当前这张）
        _cardUseCountThisTurn = (_cardUseCountThisTurn || 0) + 1

        if (_cardUseCountThisTurn >= needCount) {
            _cardUseCountThisTurn = 0
            player.mp = Math.min(player.maxMp, player.mp + mpGain)
            user.pixi.playerInstance?.showBuffText('蓄灵');
            battleLog(`[天赋] 蓄灵Lv.${talentLv}：使用${needCount}张牌，恢复${mpGain}点灵力`)
        }
    }
    if (user.hasTalent('card_heal_regen')) {
        // 保留2位小数，不取整
        const healPct = Number(user.getTalentEffect?.('card_heal_regen', 'healPct') ?? 0.015);
        const healAmount = Math.round(player.maxHp * healPct * 100) / 100;
        applyHeal(player, healAmount, 'heal');
        user.pixi.playerInstance?.showBuffText('灵能愈合');
    }

    usedCardThisTurn.push(card)
    // 🃏 抽牌制：打出的牌本回合先进“已使用区”，点击结束回合后洗回抽牌堆
    //    （因此本回合内触发的抽牌技能无法抽到本回合打过的牌）
    const _handIdx = playerHand.value.indexOf(card)
    if (_handIdx >= 0) {
      playerHand.value.splice(_handIdx, 1)
      playedThisTurn.value.push(card)
      nextTick(() => calcArcCardPos())
    }
    card.cooldown = card.maxCooldown
    // 💥 焚焰：击杀目标时刷新冷却
    if (card._killResetCooldown) {
      card.cooldown = 0;
      card._killResetCooldown = false;
    }
    // 🔥 时间加速：每消耗5点魔力，抽一张牌（免费牌不计入）
    if (user.hasTalent('mana_cd_reduce') && card.cost > 0 && !isFreeCard && !isManaCycleFree) {
        const manaCost = Number(user.getTalentEffect?.('mana_cd_reduce', 'manaCost') ?? 5) || 5
        player._manaCdReduceCount = (player._manaCdReduceCount || 0) + card.cost
        while (player._manaCdReduceCount >= manaCost) {
            player._manaCdReduceCount -= manaCost
            drawCards(1) // 🃏 每满 manaCost 点魔力抽一张牌
            user.pixi.playerInstance?.showBuffText('时间加速')
        }
    }
    // 🔥 天赋：魔力飞弹 —— 每消耗1点魔力，随机对一名敌人造成伤害
    if (user.hasTalent('mana_missile') && card.cost > 0 && !isFreeCard && !isManaCycleFree) {
        const lv = user.getTalentLevel('mana_missile') || 1
        const dmgRate = (Number(user.getTalentEffect?.('mana_missile', 'dmgBase') ?? 0.2) + Number(user.getTalentEffect?.('mana_missile', 'dmgPerLv') ?? 0.025) * (lv - 1))  // 20% + 每级2.5%
        const aliveEnemies = enemies.value.filter(e => e.hp > 0)
        if (aliveEnemies.length > 0) {
            const missileCount = card.cost
            const targetEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]
            playManaMissileSequence(targetEnemy, missileCount, (idx) => {
                const rawDmg = player.attack * dmgRate
                // 🎯 魔力飞弹：魔法伤害，走统一结算层（吃魔抗/智慧增伤；'magic' 不在元素附着表 → 不附着元素/不触发反应；非 physical → 不暴击）
                const { dmg: finalDmg, crit } = calculateFinalDamage(rawDmg, targetEnemy, {
                    dmgType: 'magic', player, buff: null, applyElement: true,
                    enemies: enemies.value, skillName: '魔力飞弹',
                })
                // 🛡️ 统一伤害落地：免疫拦截（暗影庇佑）/余伤蔓延/受击被动/死亡即时结算/飘字震动
                applyDamageToTarget(targetEnemy, finalDmg, {
                    player, dmgType: 'magic', isCritical: crit, skillName: '魔力飞弹',
                    enemies: enemies.value, isPlayerDirect: true,
                })
                battleLog(`[天赋] 魔力飞弹 Lv.${lv}：第${idx + 1}枚命中${targetEnemy.name}，造成${Math.round(finalDmg * 100) / 100}伤害`)
            })
            battleLog(`[天赋] 魔力飞弹 Lv.${lv}：消耗${card.cost}魔力，发射${missileCount}枚飞弹 → ${targetEnemy.name}`)
        }
    }
    card.x = card.baseX
    card.y = card.baseY
    card.dragging = false
    return animTime
}

let msgLock = false

// ✅ 开始按下卡牌：记录起点 + 启动拖拽（是否弹详情由松开时是否拖动过决定）
function startLongPress(e, card) {
    const pageX = e.touches ? e.touches[0].pageX : e.pageX
    const pageY = e.touches ? e.touches[0].pageY : e.pageY
    longPressStartPos = { x: pageX, y: pageY }
    handleCardDrag(e, card)
}

// ✅ 松开卡牌：只要拖动过（移动超过阈值，无论是否打出/回槽）就不弹详情，
//    只有干净单击（按下没动、重新点击）才弹 Popover
function clearLongPress(e, card) {
    if (!card) return // mouseleave 等无 card 的清理调用不弹详情
    // 取指针真实坐标：touch 用 touches/changedTouches，鼠标直接用 pageX/pageY
    let pt = null
    if (e) {
        if (e.touches && e.touches[0]) pt = e.touches[0]
        else if (e.changedTouches && e.changedTouches[0]) pt = e.changedTouches[0]
        else if (typeof e.pageX === 'number') pt = e
    }
    const pageX = pt ? pt.pageX : longPressStartPos.x
    const pageY = pt ? pt.pageY : longPressStartPos.y
    // 拖动过 → 不弹（打牌/回槽由拖拽逻辑处理）
    const moved = Math.abs(pageX - longPressStartPos.x) > MOVE_THRESHOLD || Math.abs(pageY - longPressStartPos.y) > MOVE_THRESHOLD
    if (moved) return
    openCardPopover(card)
}

// 🃏 切换卡牌详情 Popover（同一张卡再点关闭，点另一张自动切换）
function openCardPopover(card) {
    if (popoverCloseTimer) { clearTimeout(popoverCloseTimer); popoverCloseTimer = null }
    dragMoveArmed = false
    if (cardPopVisibleId.value === card.id) {
        closeCardPopover() // 再点同一张 → 关闭
    } else {
        cardPopVisibleId.value = card.id
        // 打开后注册“点击外部关闭”监听（延迟到本次点击事件流结束，避免刚打开就被关闭）
        setTimeout(() => {
            if (cardPopVisibleId.value === card.id) {
                document.addEventListener('click', handleDocClickToClose, true)
            }
        }, 0)
    }
}

// 🃏 统一关闭卡牌详情 Popover（并移除外部点击监听）
function closeCardPopover() {
    cardPopVisibleId.value = null
    document.removeEventListener('click', handleDocClickToClose, true)
}

// 🃏 点击弹窗外部 → 关闭详情（点击卡牌本身由单击/拖拽逻辑处理，点击弹窗内容不关闭）
function handleDocClickToClose(e) {
    if (e.target && e.target.closest && e.target.closest('[data-card-id]')) return // 点在卡牌上
    const el = document.querySelector('.fight-card-popover')
    if (el && el.contains(e.target)) return // 点在弹窗内容上
    closeCardPopover()
}

function handleCardDrag(e, card) {
    if (!battleStarted.value) return
    const usable = isCardUsable(card)
    if (!usable) {
        if (msgLock) return
        msgLock = true

        if (card.disabledLevel > 0) {
            ElMessage.warning({ message: L('cardDisabled'), duration: 900 })
        } else if (card.cooldown > 0) {
            ElMessage.warning({ message: L('cardOnCooldown'), duration: 900 })
        } else if (card.limitPerTurn > 0 && card.usedCount >= card.limitPerTurn) {
            ElMessage.warning({ message: L('turnUsesExhausted'), duration: 900 })
        } else if (player.mp < getCardFinalCost(card)) {
            ElMessage.warning({ message: L('notEnoughMana'), duration: 900 })
        }

        setTimeout(() => msgLock = false, 900)
        return
    }
    startDrag(e, card)
}
// 组件销毁：清空战斗定时器、清理spine画布、重置状态
onUnmounted(async () => {
    audioPopBgmScene() // 🎵 战斗结束：恢复战斗前的 BGM（地牢 BGM / 主世界 BGM）
    // 🔥 移除事件监听
    emitter.off("battleEnd", handleBattleEnd)
    emitter.off("playerTurnStart", handlePlayerTurnStart)
    emitter.off("enemyDamage", handleEnemyDamage)
    emitter.off("enemyBuff", handleEnemyBuff)
    emitter.off("enemyPredictTap", handleEnemyPredictTap)
    emitter.off("enemyPoisonFlash", handleEnemyPoisonFlash)
    emitter.off("playerPoison", handlePlayerPoison)
    emitter.off("freezePlayerCards", handleFreezePlayerCards)
    emitter.off("bossPhase2", handleBossPhase2)
    emitter.off("cardCostUp", handleCardCostUp)
    emitter.off("insertCurseCards", handleInsertCurseCards)
    emitter.off("banPlayerCard", handleBanPlayerCard)
    emitter.off("playerSlowChanged", handlePlayerSlowChanged)
    // emitter.off("potionUsed", handlePotionUsed) // 函数在 onMounted 作用域里，onUnmounted 访问不到
    emitter.off("playerBuffTap", handlePlayerBuffTap)
    emitter.off("iceSpiritAction", handleIceSpiritAction)
    emitter.off("iceSpiritSummonDraw", handleIceSpiritSummonDraw)

    // ✅ 清除长按计时器
    clearLongPress()
    // 🃏 清除拖动关闭弹窗计时器
    if (popoverCloseTimer) { clearTimeout(popoverCloseTimer); popoverCloseTimer = null }

    // 1️⃣ 先停所有战斗逻辑
    battle.pauseLoop()
    battle.destroyBattle()

    // ✅ 清空所有召唤物spine和数据
    clearBattleSummons(allies)

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
.phase2-bubble-enter-active, .phase2-bubble-leave-active {
    transition: opacity 0.55s ease, transform 0.55s ease;
}
.phase2-bubble-enter-from, .phase2-bubble-leave-to {
    opacity: 0;
    transform: translate(-50%, 10px);
}
@keyframes costReducedFlash {
    0%, 100% { color: #ffd700; text-shadow: 0 0 5px rgba(255,215,0,0.95), 0 0 11px rgba(255,215,0,0.55); }
    50% { color: #fffbe6; text-shadow: 0 0 10px rgba(255,255,255,0.98), 0 0 20px rgba(255,215,0,0.85); }
}
.cost-reduced-flash {
    animation: costReducedFlash 0.8s ease-in-out infinite;
    transform-origin: center;
}
.frost-particles {
    position: absolute; inset: 0;
    pointer-events: none; overflow: hidden;
    border-radius: inherit;
    z-index: 5;
    box-shadow: inset 0 0 14px rgba(147,197,253,0.6), inset 0 0 4px rgba(224,247,255,0.55);
    background: linear-gradient(160deg, rgba(186,230,253,0.16), rgba(147,197,253,0.06) 45%, rgba(224,247,255,0.14));
}
.frost-particle {
    position: absolute;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: radial-gradient(circle, #f0fdff 0%, rgba(147,197,253,0.85) 50%, transparent 78%);
    box-shadow: 0 0 10px rgba(186,230,253,1), 0 0 20px rgba(125,211,252,0.65);
    opacity: 0;
    animation: frostParticleFloat 2s ease-in-out infinite;
}
@keyframes frostParticleFloat {
    0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
    15% { opacity: 1; }
    55% { opacity: 0.85; transform: translate(var(--driftX, 8px), -18px) scale(1.15); }
    100% { opacity: 0; transform: translate(calc(var(--driftX, 8px) * -1), 12px) scale(0.5); }
}
.predict-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.6vh;
    height: 2.6vh;
    vertical-align: middle;
    margin-right: 0.9vh;
    filter: drop-shadow(0 0 0.3vh rgba(0,0,0,0.7));
}
.predict-icon-basic {
    font-size: 2.4vh;
    line-height: 1;
}
.predict-icon-skill {
    font-size: 2.4vh;
    line-height: 1;
}
</style>
