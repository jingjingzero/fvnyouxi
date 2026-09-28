<template>
  <!-- 🏰 俯视角地牢探索：v-if 覆盖层，独立 PixiJS 实例，卸载时自动销毁 -->
  <div class="absolute inset-0 z-50 bg-black overflow-hidden select-none">
    <div ref="pixiContainer" class="w-full h-full"></div>

    <!-- ❤️ 低血量屏幕警示（HP<30% 全屏红闪 + 心跳音；地牢内生效） -->
    <LowHpOverlay :hp="curHp" :max-hp="maxHp" />

    <!-- ⏳ 进入地牢加载遮罩：黑屏 + 进度条 -->
    <div v-if="showDungeonLoading"
      class="absolute inset-0 z-[999] bg-[#05060e] flex flex-col items-center justify-center pointer-events-auto overflow-hidden">
      <!-- 🏃 加载动画：右下角循环播放 paobuload spine -->
      <LoadingSpine :show="showDungeonLoading" />
      <!-- 中央柔光氛围 -->
      <div class="absolute w-[70vh] h-[70vh] rounded-full pointer-events-none"
        style="background: radial-gradient(circle, rgba(99,102,241,0.26) 0%, rgba(139,92,246,0.1) 45%, transparent 70%); filter: blur(6vh);"></div>
      <div class="absolute w-[42vh] h-[42vh] rounded-full pointer-events-none translate-y-[22vh]"
        style="background: radial-gradient(circle, rgba(232,121,249,0.14) 0%, transparent 70%); filter: blur(5vh);"></div>
      <!-- 标题（无图标，渐变文字 + 呼吸光） -->
      <div class="relative text-[4.2vh] font-black tracking-[0.5em] indent-[0.5em] text-transparent bg-clip-text bg-gradient-to-b from-indigo-200 via-purple-300 to-fuchsia-400 mb-[4vh] dungeon-breath"
        style="filter: drop-shadow(0 0 3vh rgba(139,92,246,0.55));">{{ L('loadingDungeon') }}</div>
      <!-- 进度条（流动光泽 + 光晕） -->
      <div class="relative w-[46vw] h-[1.3vh] bg-white/8 rounded-full overflow-hidden border border-white/15"
        style="box-shadow: 0 0 3vh rgba(99,102,241,0.35), inset 0 0 1vh rgba(0,0,0,0.5);">
        <div class="h-full relative overflow-hidden rounded-full transition-all duration-200 dungeon-shine"
          :style="{ width: loadProgress + '%', background: 'linear-gradient(90deg, #6366f1, #a78bfa, #e879f9)' }"></div>
      </div>
      <div class="relative text-[2vh] text-white/60 mt-[2vh] tracking-[0.4em] font-light tabular-nums">{{ Math.floor(loadProgress) }}%</div>
      <div class="relative text-[1.5vh] text-white/30 mt-[1vh] tracking-[0.35em] font-light">{{ L('loadingTip') }}</div>
    </div>


    <!-- 拾取物品提示：改用 element-plus ElMessage（见 showPickupTip） -->

    <!-- 左上角：玩家生命值进度条 + 查看已获得道具按钮（对话时隐藏） -->
    <div v-show="!user.pixi?.duihua" class="absolute top-3vh left-1vw z-10">
      <div class="flex items-center gap-2.5">
        <div class="w-22vw min-w-160px">
          <img src="@/assets/daoju/Hp.webp" class="w-4vh h-4vh absolute top--0.02vh">
          <div
            class="h-2.8vh bg-black/55 rounded-full overflow-hidden border border-red-400/40 shadow-[0_2px_8px_rgba(0,0,0,0.5)] ml-5vh">

            <div class="h-full rounded-full transition-all duration-300 "
              :style="{ width: hpPercent + '%', background: hpColor }"></div>
          </div>
        </div>
        <div @click="showInv = true"
          class="px-2.5vh py-0.75vh rounded-2 bg-amber-500/85 text-white text-2vh font-bold hover:bg-amber-600 active:scale-95 transition-all cursor-pointer select-none! shadow-lg">
          {{ L('itemsBtn') }}
        </div>
        <div @click="openBag"
          class="px-2.5vh py-0.75vh rounded-2 bg-emerald-500/85 text-white text-2vh font-bold hover:bg-emerald-600 active:scale-95 transition-all cursor-pointer select-none! shadow-lg">
          {{ L('bagBtn') }}
        </div>
      </div>

    </div>

    <!-- 顶部按钮：重置 + 返回（对话时隐藏） -->
    <div v-show="!user.pixi?.duihua" class="absolute top-3vh right-12vw z-10 flex gap-2">
      <button @click="resetDungeon"
        class="px-3vh py-1.5vh rounded-2 bg-sky-500/80 text-white text-2vh font-bold hover:bg-sky-600 active:scale-95 transition-all cursor-pointer select-none! shadow-lg">
        {{ L('resetBtn') }}
      </button>
      <button @click="openSettle"
        class="px-3vh py-1.5vh rounded-2 bg-red-500/80 text-white text-2vh font-bold hover:bg-red-600 active:scale-95 transition-all cursor-pointer select-none! shadow-lg">
        {{ L('back') }}
      </button>
    </div>

    <!-- 🧭 右上角新手指引提示（首次进地牢时显示：简短告诉玩家该怎么做；对话时隐藏） -->
    <div v-show="guideHintShow && !user.pixi?.duihua"
      class="absolute left-1vw max-w-15vw top-9vh z-10 pointer-events-none select-none">
      <div
        class="text-2vh font-bold text-amber-200 bg-black/65 px-3vh py-1.2vh  rounded-1">
        {{ L(guideHintKey) }}
      </div>
    </div>

    <!-- 🗺️ 小地图（屏幕右侧，对话时隐藏）：局部视野 + 跟随玩家；点击打开完整地图 -->
    <div v-show="!user.pixi?.duihua" class="absolute right-0.5vw top-16vh -translate-y-1/2 z-10">
      <canvas ref="miniMapCanvas" @click="openFullMap"
        :title="user.getNpcAlly?.() === 'tuzi' ? L('miniMapTitleAlly') : L('miniMapTitleNoAlly')"
        class="border-2 border-amber-400/40 bg-black/55 shadow-[0_4px_18px_rgba(0,0,0,0.65)] cursor-pointer hover:brightness-110 transition-all"></canvas>
    </div>

    <!-- 🗺️ 完整地图弹窗（点击小地图打开，冻结地牢） -->
    <div v-if="showFullMap" class="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      @click.self="closeFullMap">
      <div class="bg-[#14171f]/95 border-2 border-amber-400/40 rounded-xl p-3vh shadow-2xl flex flex-col items-center"
        style="max-width:92vw;max-height:88vh">
        <div class="flex items-center justify-between w-full mb-2vh">
          <span class="text-2.6vh font-bold text-amber-300">{{ F('fullMapTitle', { name: mapDisplayName }) }}</span>
          <button @click="closeFullMap"
            class="px-3vh py-1vh rounded-lg bg-red-500/80 text-white text-1.9vh font-bold hover:bg-red-600 active:scale-95 transition-all cursor-pointer select-none!">✕
            {{ L('closeBtn') }}</button>
        </div>
        <canvas ref="fullMapCanvas" class="border border-white/10 rounded-sm"></canvas>
      </div>
    </div>

    <!-- 移动端摇杆（左下角）：pointer 事件，兼容触摸 / 鼠标拖动（对话时隐藏） -->
    <div v-show="!user.pixi?.duihua" ref="joyBase" class="joy-base" @pointerdown="onJoyDown" @pointermove="onJoyMove"
      @pointerup="onJoyUp" @pointercancel="onJoyUp">
      <div ref="joyKnob" class="joy-knob"></div>
      <span class="joy-hint">{{ L('joystickMove') }}</span>
    </div>

    <!-- 🌦️ 天气显示（底部坐标栏上方居中，点击查看效果说明，对话时隐藏） -->
    <div v-show="!user.pixi?.duihua && weatherUi !== 'sunny'" @click="showWeatherInfo = true"
      class="absolute bottom-9vh left-1/2 -translate-x-1/2 z-10 cursor-pointer select-none! group"
      :title="L('weatherTitleAttr')">
      <div
        class="flex items-center gap-1.5 px-2.5vh py-1vh rounded-full bg-black/60 border border-white/20 backdrop-blur-sm shadow-lg group-hover:scale-105 transition-all">
        <span class="text-3vh leading-none">{{ WEATHER_INFO[weatherUi]?.icon || '☀️' }}</span>
        <span class="text-1.9vh font-bold" :style="{ color: WEATHER_INFO[weatherUi]?.color || '#ffffff' }">{{
          WEATHER_INFO[weatherUi]?.name || L('sunnyFallback') }}</span>
      </div>
    </div>

    <!-- 🌦️ 天气效果说明弹窗 -->
    <el-dialog v-model="showWeatherInfo" width="55vw" align-center class="dungeon-weather-dialog"
      :close-on-click-modal="true" append-to-body @open="onWeatherInfoOpen" @closed="onWeatherInfoClosed">
      <template #header>
        <div class="flex items-center gap-2 text-center justify-center">
          <span class="text-4vh">{{ WEATHER_INFO[weatherUi]?.icon || '☀️' }}</span>
          <span class="text-3vh font-bold"
            :style="{ color: WEATHER_INFO[weatherUi]?.color || '#ffffff', background: 'rgba(0,0,0,0.42)', borderRadius: '1vh', padding: '0.3vh 1.6vh', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }">{{
              WEATHER_INFO[weatherUi]?.name || L('sunnyFallback') }}</span>
        </div>
      </template>
      <div class="bg-[#f8f5ee] rounded-xl border-2 border-amber-200 p-4vh shadow-inner">
        <!-- 🌦️ 天气效果说明：富文本（每条效果独立换行 + 数字/动作词多彩高亮） -->
        <div v-html="formatWeatherDesc(weatherUi)" class="weather-desc-wrap"></div>
      </div>
      <template #footer>
        <div class="text-center">
          <button @click="showWeatherInfo = false"
            class="px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-2.2vh font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('confirmBtn') }}
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 🌙 夜晚效果说明弹窗 -->
    <el-dialog v-model="showNightInfo" width="55vw" align-center class="dungeon-night-dialog"
      :close-on-click-modal="true" append-to-body @open="onNightInfoOpen" @closed="onNightInfoClosed">
      <template #header>
        <div class="flex items-center gap-2 text-center justify-center">
          <span class="text-4vh">🌙</span>
          <span class="text-3vh font-bold text-indigo-300">{{ L('nightTitle') }}</span>
        </div>
      </template>
      <div class="bg-[#1e1b2e] rounded-xl border-2 border-indigo-300/40 p-4vh shadow-inner">
        <div v-html="formatNightDesc()" class="night-desc-wrap"></div>
      </div>
      <template #footer>
        <div class="text-center">
          <button @click="showNightInfo = false"
            class="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-2.2vh font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('confirmBtn') }}
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 🗺️ 路线选择弹窗（杀戮尖塔2风格：冻结地牢弹窗选分支路线） -->
    <el-dialog v-model="showRouteDialog" width="75vw" class="dungeon-route-dialog mt-2.5vh!" :show-close="false" height="95vh"
      :close-on-click-modal="false" :close-on-press-escape="false" append-to-body>
      <div class="text-center py-1.5vh">
        <div class="text-3vh font-bold text-amber-300">{{ L('stairsTitle') }}</div>
      </div>
      <!-- 🔍 画布缩放控制（右上角，相对弹窗 body 定位） -->
      <div class="route-zoom-controls" @pointerdown.stop>
        <button class="route-zoom-btn" @click="routeZoomOut">−</button>
        <span class="route-zoom-pct">{{ Math.round(canvasScale * 100) }}%</span>
        <button class="route-zoom-btn" @click="routeZoomIn">+</button>
      </div>
      <!-- 🗺️ 路线地图画布（自身 flex 填满 + 等比居中 + 裁剪，边框即画布边缘，不再需要外层 wrap） -->
      <canvas ref="routeCanvasRef" class="route-canvas"
        :style="{ transform: 'scale(' + canvasScale + ')' }"
        @wheel.prevent="onRouteCanvasWheel"
        @pointerdown="onRouteCanvasDown" @pointermove="onRouteCanvasMove"
        @pointerup="onRouteCanvasUp" @pointerleave="onRouteCanvasUp"
        @pointercancel="onRouteCanvasUp"></canvas>
      <!-- 选中分支说明 -->
      <template #footer>
        <div class="flex justify-center gap-3vw">
          <el-button round @click="cancelRouteDialog"
            class="!h-[5.6vh] !text-[2.2vh] !px-[2.4vw] !font-bold">{{ L('cancelBtn') }}</el-button>
          <el-button round type="primary" @click="returnToCampFromRoute"
            class="!h-[5.6vh] !text-[2.2vh] !px-[2.4vw] !font-bold">{{ L('returnCampBtn') }}</el-button>
          <el-button round type="warning" @click="confirmEnterRoute" :disabled="!selectedRoute"
            class="!h-[5.6vh] !text-[2.2vh] !px-[2.4vw] !font-bold">进入所选路线</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 🪜 进入下一层确认弹窗（三按钮：取消 / 返回营地 / 进入下一层） -->
    <el-dialog v-model="showStairsDialog" width="52vw" class="dungeon-stairs-dialog" :show-close="false"
      :close-on-click-modal="false" :close-on-press-escape="false" align-center append-to-body>
      <div class="text-center py-3vh">
        <div class="text-6vh mb-2">🪜</div>
        <div class="text-3vh font-bold text-amber-300">{{ L('stairsTitle') }}</div>
      </div>
      <template #footer>
        <div class="flex justify-center gap-3vw">
          <button @click="cancelStairsDialog"
            class="px-7 py-2 rounded-xl bg-gray-600 hover:bg-gray-500 text-white text-2.2vh font-bold transition-all cursor-pointer select-none!">
            {{ L('cancelBtn') }}
          </button>
          <button @click="returnToCamp"
            class="px-7 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-2.2vh font-bold transition-all cursor-pointer select-none!">
            {{ L('returnCampBtn') }}
          </button>
          <button @click="confirmEnterNextLevel"
            class="px-7 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white text-2.2vh font-bold transition-all cursor-pointer select-none!">
            {{ L('enterNextFmt') }}
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 🎪 地牢通用弹窗（事件 / 恢复层 / 首领战利品：选项制 / 卡片制） -->
    <el-dialog v-model="showDungeonDialog" width="58vw" class="dungeon-dialog" :show-close="false"
      :close-on-click-modal="false" :close-on-press-escape="false" align-center append-to-body>
      <div class="text-center py-2vh">
        <div class="text-3.2vh font-bold mb-1.5vh" style="color:#f1f5f9">{{ dungeonDialog.title }}</div>
        <div class="text-2.2vh mb-3vh leading-6" style="color:rgba(148,163,184,.85)">{{ dungeonDialog.desc }}</div>
        <!-- 选项制（事件层 / 恢复层二选一） -->
        <div v-if="dungeonDialog.mode === 'choice'" class="flex flex-col gap-1.6vh">
          <button v-for="(o, i) in dungeonDialog.options" :key="i" @click="execChoiceOption(o)"
            class="w-full py-1.8vh rounded-lg text-2.2vh font-bold transition-all cursor-pointer select-none!"
            :style="o.run ? 'background:linear-gradient(135deg,rgba(251,191,36,.16),rgba(251,191,36,.05));border:1px solid rgba(251,191,36,.38);color:#fcd34d' : 'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(148,163,184,.55);cursor:not-allowed'">
            {{ o.label }}
          </button>
        </div>
        <!-- 卡片制（首领三选一 / 恢复层强化选卡） -->
        <div v-else class="grid grid-cols-3 gap-2vh">
          <div v-for="c in dungeonDialog.cards" :key="c.name" @click="execCardPick(c)"
            class="rounded-xl p-2.5vh cursor-pointer transition-all hover:-translate-y-0.5vh hover:shadow-lg"
            :style="{ background: (c.color || '#888') + '1a', border: '1px solid ' + (c.color || '#888') + '66' }">
            <div class="text-2.6vh font-bold mb-1.2vh" :style="{ color: c.color || '#fff' }">{{ c.name }}</div>
            <div class="text-1.9vh mb-1.5vh leading-5" style="color:rgba(148,163,184,.85)">{{ c.desc }}</div>
            <div class="text-1.8vh font-bold" style="color:rgba(229,231,235,.75)">{{ rarityLabel(c.rarity) }}<template v-if="c.type === 'card'"> · {{ '★'.repeat(c.star || 1) }}</template></div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 🌙 夜晚降落提示（到达夜晚时屏幕中间弹出，渐显渐隐） -->
    <transition name="nightfall-fade">
      <div v-if="nightFallTip" class="absolute top-36vh left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center">
        <div class="text-6vh font-bold tracking-widest text-indigo-200"
          style="text-shadow: 0 0 2vh rgba(129,140,248,0.85), 0 0 5vh rgba(30,27,75,0.95);">{{ L('nightTitle') }}</div>
      </div>
    </transition>
    <!-- 底部信息：层数 + 坐标 + 已探索（对话时隐藏） -->
    <div v-show="!user.pixi?.duihua"
      class="absolute bottom-2.5vh left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
      <div class="flex flex-col items-center gap-1vh text-1.6vh text-gray-300 bg-black/50 px-3vh py-0.8vh rounded-2xl">
        <!-- 第一行：速度 / 可见度 / 夜晚 -->
        <div class="flex items-center gap-2vh">
          <span class="text-cyan-300">{{ F('speedInfoFmt', { n: dungeonInfo.speed }) }}</span>
          <span class="text-gray-500">|</span>
          <span class="text-emerald-300">{{ F('visionInfoFmt', { n: dungeonInfo.vision }) }}</span>
          <span class="text-gray-500">|</span>
          <span @click="showNightInfo = true" :class="nightInfo.night ? 'text-indigo-300' : 'text-yellow-300'"
            class="pointer-events-auto cursor-pointer select-none! hover:brightness-125 transition-all"
            :title="L('nightInfoAttr')">
            <template v-if="nightInfo.night">{{ L('nightNow') }}</template>
            <template v-else-if="nightInfo.showProgress">{{ F('nightProgressFmt', { n: nightInfo.remainSec }) }}</template>
            <template v-else>{{ F('nightRemainFmt', { n: nightInfo.remainSec }) }}</template>
          </span>
        </div>
        <!-- 第二行：地图 / 坐标 / 脚下瓦片 -->
        <div class="flex items-center gap-2vh">
          <span class="text-amber-300 font-bold">{{ F('levelInfoFmt', { name: mapDisplayName, n: currentLevel })
          }}</span>
          <span class="text-gray-500">|</span>
          <span>{{ L('coordLabel') }}: ({{ playerCol }}, {{ playerRow }})</span>
          <span class="text-gray-500">|</span>
          <span class="text-green-300">{{ L('terrainLabel') }}: {{ tr(getTileTerrainName(playerCol, playerRow))
          }}</span>
        </div>
      </div>
    </div>

    <!-- 🖐️ 右下角互动按钮（玩家靠近互动点/NPC/宝箱时显示，对话时隐藏） -->
    <div v-show="nearInteractable && !user.pixi?.duihua"
      class="absolute bottom-8vh right-5vw z-20 flex flex-col items-center gap-1.5vh">
      <div class="text-1.8vh text-white/90 bg-black/60 px-2vh py-0.5vh rounded-full whitespace-nowrap">
        {{ nearInteractable?.title || L('interactFallback') }}
      </div>
      <button @click="handleInteract"
        class="w-12vh h-12vh rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-4vh font-bold shadow-[0_4px_20px_rgba(251,146,60,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer select-none! border-2 border-white/30 flex items-center justify-center">
        {{ nearInteractable?.kind === 'npc' ? '💬' : (nearInteractable?.kind === 'chest' ? '📦' : '🖐️') }}
      </button>
      <div class="text-1.5vh text-white/60">{{ L('interactKeyPre') }} {{ nearInteractable?.buttonText ||
        L('interactFallback') }}</div>
    </div>

    <!-- ⛏️ 采集进度条（采集中显示：进度条 + 百分比，采集中不可移动） -->
    <div v-if="isGathering" class="absolute bottom-8vh right-5vw z-20 flex flex-col items-center gap-1.5vh">
      <div class="text-1.8vh text-white/90 bg-black/60 px-2vh py-0.5vh rounded-full whitespace-nowrap">
        ⛏️ 采集中 {{ Math.round(gatherProgress * 100) }}%
      </div>
      <div class="w-34vh h-2.4vh bg-black/60 rounded-full overflow-hidden border border-white/25">
        <div class="h-full bg-gradient-to-r from-lime-400 to-emerald-500"
          :style="{ width: Math.round(gatherProgress * 100) + '%' }"></div>
      </div>
    </div>

    <!-- 🖐️ 互动弹窗（查看/自定义类型） -->
    <el-dialog v-model="showInteractDialog" width="60vw" class="dungeon-interact-dialog mt-7vh!" :show-close="true"
      :close-on-click-modal="true" align-center :title="interactDialogData.title">
      <div class="bg-[#f8f5ee] rounded-xl border-2 border-amber-200 p-5vh shadow-inner">
        <div class="text-2.4vh text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
          {{ interactDialogData.content }}
        </div>
      </div>
      <template #footer>
        <div class="text-center">
          <button @click="showInteractDialog = false"
            class="px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-2.2vh font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('confirmBtn') }}
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 🏁 地牢结算弹窗（element-plus dialog，仅可点"确认离开"退出） -->
    <el-dialog v-model="showSettle" width="70vw" class="dungeon-settle" :show-close="false"
      :close-on-click-modal="false" :close-on-press-escape="false" align-center append-to-body>
      <template #header>
        <div class="text-center">
          <div class="text-3.2vh font-bold text-yellow-300">{{ L('settleTitle') }}</div>
          <div class="text-1.6vh text-gray-400 mt-0.5vh">{{ L('settleSub') }}</div>
        </div>
      </template>

      <!-- 物品网格（一行多个，鼠标悬浮高亮） -->
      <div class="grid grid-cols-5 gap-3 max-h-46vh overflow-y-auto jx-scroll pr-1">
        <div v-for="it in settleItems" :key="it.name"
          class="flex flex-col items-center bg-black/30 rounded-xl p-3 border border-white/5 hover:border-yellow-400/40 hover:bg-black/45 transition-all">
          <div class="w-7vh h-7vh rounded-lg bg-white/5 flex items-center justify-center mb-2">
            <img :src="it.img" class="w-6vh h-6vh object-contain" alt="" />
          </div>
          <span class="text-1.6vh text-gray-100 font-medium text-center leading-tight">{{ tr(it.name) }}</span>
          <span class="text-1.9vh text-yellow-300 font-bold mt-0.5">×{{ it.num }}</span>
        </div>
        <div v-if="!settleItems.length" class="col-span-5 text-center text-1.8vh text-gray-500 py-10">{{
          L('settleEmpty') }}
        </div>
      </div>

      <template #footer>
        <div class="text-center">
          <button @click="confirmLeave"
            class="px-10 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-2.2vh font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('confirmLeaveBtn') }}
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 💀 战斗失败框：死亡过渡全黑后延迟弹出，面板带放大动画 -->
    <div v-if="showFailDialog" class="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 select-none!">
      <transition name="fail-panel">
        <div v-if="showFailPanel"
          class="fail-panel-box flex flex-col items-center justify-center rounded-4vh border border-red-500/50 bg-gradient-to-b from-[#2a0505] to-[#100203] px-14vh py-9vh shadow-[0_0_10vh_rgba(255,0,0,0.35)]">
          <div
            class="text-7vh font-black text-red-500 tracking-[0.4em] text-indent-0.4em drop-shadow-[0_0_3vh_rgba(255,0,0,0.9)]">
            {{ L('failTitle') }}</div>
          <div class="mt-3vh w-24vh h-0.1 bg-red-500/30"></div>
          <div class="mt-3vh text-2.4vh text-gray-300 tracking-wider">{{ L('failDesc') }}</div>
        </div>
      </transition>
    </div>

    <!-- 🎒 查看已获得道具弹窗（本次地牢会话拾取的物品） -->
    <el-dialog v-model="showInv" width="62vw" class="dungeon-inv" :show-close="false" :close-on-click-modal="false"
      :close-on-press-escape="false" align-center append-to-body>
      <template #header>
        <div class="text-center">
          <div class="text-3.2vh font-bold text-yellow-500 drop-shadow">{{ L('invTitle') }}</div>
          <div class="text-1.6vh text-gray-400 mt-0.5vh">{{ L('invSub') }}</div>
        </div>
      </template>
      <div class="grid grid-cols-6 gap-1.5 max-h-46vh overflow-y-auto jx-scroll pr-1">
        <div v-for="it in settleItems" :key="it.name"
          class="group  flex flex-col items-center  rounded-2 p-3vh bg-gray-200 border border-gray-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 cursor-default select-none!">
          <div
            class="w-6vh h-6vh rounded-2 bg-gray-200/70 border border-gray-200 flex items-center justify-center shadow-sm">
            <img :src="it.img" class="w-6vh h-6vh object-contain" alt="" />
          </div>
          <span
            class="w-full text-center text-2.2vh text-black font-medium leading-snug mt-1 truncate group-hover:whitespace-normal">{{
              it.name }}</span>
          <span class="text-2.1vh text-amber-600 font-bold mt-0.5">×{{ it.num }}</span>
        </div>
        <div v-if="!settleItems.length"
          class="col-span-6 flex flex-col items-center justify-center text-1.8vh text-gray-500 py-12 gap-2">
          <span class="text-4vh opacity-40">🎒</span>
          <span>{{ L('invEmpty') }}</span>
        </div>
      </div>
      <template #footer>
        <div class="text-center">
          <button @click="showInv = false"
            class="px-10 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-2.2vh font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('closeBtn') }}
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 🎒 背包弹窗：复用 BagPanel 组件，只显示背包（interactive=false 不显示操作按钮） -->
    <el-dialog v-model="showBag" width="72vw" class="dungeon-bag" :show-close="false" :close-on-click-modal="false"
      :close-on-press-escape="false" align-center append-to-body>
      <template #header>
        <div class="text-center">
          <div class="text-3vh font-bold text-emerald-300">{{ L('bagBtn') }}</div>
        </div>
      </template>
      <div class="h-60vh">
        <BagPanel :interactive="false" :allow-use="true" :card-img-map="dungeonCardImgMap"
          :daoju-img-map="dungeonDaojuImgMap" @use-item="onDungeonUseItem" />
      </div>
      <template #footer>
        <div class="text-center">
          <button @click="closeBag"
            class="px-10 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-2.2vh font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('closeBtn') }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 🏰 俯视角地牢探索组件
 *
 * 玩法：
 *   1. 俯视角地牢地图 — pixi-tiledmap 加载 /map/dungeon.tmj（墙壁瓦片 solid=true）
 *   2. 格子移动       — WASD/方向键一次移动一格，平滑插值，solid 网格碰撞检测
 *   3. 视野迷雾       — 玩家周围半径可见，未探索全黑，已探索半透明暗化
 *   4. 出生点 & 可拾取道具 — 由 tmj 的 dungeon_objects 对象层定义（出生点 spawn + 道具 item）
 *   5. 拾取联动       — 走到道具格自动拾取：提示 + 立即加入背包（addItemToInventory）
 *   6. 返回结算页     — 返回时弹出结算页，展示本次获得的物品
 *   7. 探索进度持久化 — 迷雾 + 玩家位置 + 已拾取道具，下次进入还原
 *
 * 地图宽高不固定：一切以 tmj 为准动态适配。
 */
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick,reactive } from 'vue';
import muxiangImg from '@/assets/daoju/muxiang.png';
import baoxiang1Img from '@/assets/daoju/baoxiang1.png';
import baoxiang2Img from '@/assets/daoju/baoxiang2.png';
import { ElMessage } from 'element-plus';
import { Application, Graphics, Assets, ColorMatrixFilter, Sprite, Container, Texture, Rectangle, Text, TilingSprite, ImageSource, CanvasSource, Mesh, Geometry } from 'pixi.js';
import { AdjustmentFilter, GlowFilter, OutlineFilter } from 'pixi-filters';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { loadTiledMapAsset } from 'pixi-tiledmap';
import { attachLight, updateLight, getEdgeDarkTexture } from './lighting.js';
import { initPickupUi, resolveItemIcon, showPickupTip, onDungeonItemGain, showChestRewardTip } from './dungeon/pickupUi.js';
import { initRespawnItems, parseRandomSpawnConfig, refreshRespawnItems, ensureRespawnSkins, createRespawnItemSprite } from './dungeon/respawnItems.js';
import { initTerrainFx, tileTerrainAt, spawnFootprints, updateFootprints, createFlowLayer, updateFlowLayers, createMapLights, updateMapLights, clearMapLights, updatePlayerReflection, clearFootprints } from './dungeon/terrainFx.js';
// 🏜️ 地牢氛围特效（光柱/体积光 + 漂浮尘埃 + 物体方向影；ENABLE_ATMOSPHERE=false 整体回退）
import { initAtmosphereFx, createAtmosphereFx, updateAtmosphereFx, clearAtmosphereFx } from './dungeon/atmosphereFx.js';
// 🌬️ 树冠摇曳 shader（cover_ 遮挡层微风摆动）
import { createTreeSwayFilter, updateTreeSway } from './dungeon/treeSway.js';
import LowHpOverlay from '@/components/LowHpOverlay.vue';
import LoadingSpine from '@/components/LoadingSpine.vue';
import { collectSolidTiles, buildSolidGrid } from './player/tiledMap.js';
import { useCounterStore } from "@/store/counter";
import { sfx as audioSfx, playBgm as audioPlayBgm, stopBgm as audioStopBgm } from "@/utils/audioManager";
import { loadMapBundle } from '@/components/loadAssets';
import { matchDialogueCondition } from './dialogue/condition.js';
import { createCardSpine, createDaojuSpine } from './fight/CardSpine.js';
import BagPanel from '@/components/BagPanel.vue';
import emitter from "@/bus";
import { t, tr } from "@/i18n";
// 🧩 地牢子模块（拆自本文件，保持行为不变）
import {
  MOVE_SPEED, NIGHT_ENEMY_SPEED_BONUS, ICE_SLIDE_SPEED_RATIO, ICE_SLIDE_DECAY, ICE_SLIDE_INIT_ENERGY,
  PUSH_SPEED_RATIO, JOY_DEADZONE, GRID_SCALE, DUNGEON_LEVEL_MAPS, DUNGEON_LEVEL_KEY, DUNGEON_LEVEL_DAY_KEY,
  DUNGEON_SAVE_KEY, DUNGEON_LAST_SPAWN_KEY, THUNDER_INTERVAL, THUNDER_WARN_TIME, THUNDER_DMG_PCT, THUNDER_CONDUCT_PCT, FROST_DMG_PCT, LEINIAOFU_SIGHT_SCALE, LEINIAOFU_FOV_MULT, BLOODMOON_BATTLE, ITEM_IMG_MAP, ITEM_SKIN_MAP, WEATHER_INFO, SNOW_FROST_CFG,
  DUNGEON_NIGHT_AFTER_SEC, DUNGEON_NIGHT_FADE_SEC, DUNGEON_COMBAT_CFG,
  DUNGEON_ENEMY_LEVEL_PER_FLOOR, DUNGEON_ENEMY_LEVEL_PER_DAY, DUNGEON_ENEMY_GROWTH,
  WEATHER_CFG, DUNGEON_WEATHER_TABLE, itemImgUrl, rollDungeonWeather, saveKeyForLevel, RESPAWN_ITEM_POOL, RARE_POOL_PERCENT,
  DILAO_MUSIC_BASE, DUNGEON_BG_MUSIC, BG_VOLUME, SFX_VOLUME, TERRAIN_FOOTSTEP_SFX,
} from './dungeon/config.js';
import {
  initMapReader, readSpawnFromMap, readSpawnsFromMap, readPickupItemsFromMap, readRespawnItemLayers, readStairsFromMap,
  readLightsFromMap, readSealZonesFromMap, readPreSealedZonesFromMap,
  readSwitchesFromMap, readEnemiesFromMap, readNpcsFromMap, readObstaclesFromMap,
  buildGlassGrid, buildTerrainGrid, buildVisionGrid, buildIceGrid, buildWaterGrid,
  buildDamageGrid, buildSandGrid, buildPuddleGrid, isGlassCell, isIceCell, isWaterCell,
  isSnowWeather, isPuddleCell,
  buildTerrainNameGrid, getTileTerrainName,
  getVisionReduce, getDamage, getTerrainSpeed, getSandConfig, readPushTargetsFromMap,
  readChestsFromMap, readChestTilesFromMap, readTriggersFromMap, readInteractablesFromMap,
  readGatherPointsFromMap,
  readAmbushGroupsFromMap, syncSealCellsFromLayers, enemyIdCounter,
} from './dungeon/mapReader.js';
import { GATHER_CONFIG, GATHER_DEFAULT } from './dungeon/gatherConfig.js'; // ⛏️ 采集点产出配置表
import { TRIGGER_CONFIG, TRIGGER_DEFAULT } from './dungeon/triggerConfig.js'; // ⚡ 感应器触发行为配置表
import { NPC_CONFIG, NPC_DEFAULT } from './dungeon/npcConfig.js'; // 🧑 NPC 对话/行为配置表
import { INTERACT_CONFIG, INTERACT_DEFAULT } from './dungeon/interactConfig.js'; // 🖐️ 互动点内容配置表
import { CHEST_CONFIG, CHEST_DEFAULT } from './dungeon/chestConfig.js'; // 🎁 宝箱奖励配置表
import { STAIRS_CONFIG, STAIRS_DEFAULT } from './dungeon/stairsConfig.js'; // 🏰 楼梯配置表
import { SEAL_EXIT_CONFIG, SEAL_EXIT_DEFAULT, PRE_SEAL_CONFIG, PRE_SEAL_DEFAULT, SWITCH_CONFIG, SWITCH_DEFAULT } from './dungeon/sealConfig.js'; // 🔐 封印系统配置表
import { initPathfinding, findPath, hasLineOfSight, canSeePlayer, setNightBoost, setBloodMoonBoost } from './dungeon/pathfinding.js';
import { ENEMY_DROP_RATES, SHADOW_DROP_BLESSING_MULT } from './dungeon/dropRates.js';
import { monsterConfigs, ENEMY_REWARD_LEVEL_GROWTH } from './matter1/enemiesData.js'; // 🧬 地牢敌人未配置属性时继承怪物编辑数值
import { initFx, spawnFloatText, triggerPlayerFx, updatePlayerFx, clearPlayerFx } from './dungeon/fx.js';
import { initTransition, playSceneTransition, destroyTransition } from './dungeon/transition.js'; // 🎬 过场过渡系统
import { initSave, saveDungeonState, saveDungeonStateNow, loadDungeonState } from './dungeon/save.js';
import { initMiniMap, drawMiniMap, setupFullMap, drawFullMap } from './dungeon/miniMap.js'; // 🗺️ 小地图绘制（拆自本文件）

const emit = defineEmits(['close']);
// 🌐 语言响应：语言切换后重渲染 + 词条读取
const langVersion = ref(0);
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++);
function L(key) { langVersion.value; return t(key); }
function F(key, vars) { let s = L(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }
const props = defineProps({
  // 父组件传入的显示状态（v-show），用于延迟初始化：第一次显示时才加载 Pixi/地图，避免页面加载时冻结
  visible: { type: Boolean, default: false },
});
const user = useCounterStore();
// ⚡ 低性能模式（设置里「性能模式」=节能）：关闭氛围/粒子/流动层 + Spine 隔帧 + 昼夜静态化
const isPerfLow = () => user.perfMode === 'low';
// ⚡ Spine 隔帧更新计数：低性能模式下骨骼动画每 2 帧才 update 一次（AI/位置照常，仅降动画计算）
let perfSpineTick = 0;
function shouldUpdateSpine() {
  if (!isPerfLow()) return true;
  perfSpineTick++;
  return (perfSpineTick & 1) === 0;
}
// 🧩 初始化拆分子模块（拆自本文件，getter 实时读主文件状态，行为零变化）
initPickupUi({
  get dungeonDaojuImgMap() { return dungeonDaojuImgMap },
  get user() { return user },
  get _dungeonDaojuCache() { return _dungeonDaojuCache },
});
initRespawnItems({
  get randomSpawnConfig() { return randomSpawnConfig },
  get mapW() { return mapW }, get mapH() { return mapH },
  get spawnPoints() { return spawnPoints }, get chests() { return chests }, get stairsPoint() { return stairsPoint },
  get pickupItems() { return pickupItems }, setPickupItems(v) { pickupItems = v },
  getTileTerrainName, isWalkable,
  get tileW() { return tileW }, get tileH() { return tileH },
  get respawnItemSprites() { return respawnItemSprites }, setRespawnItemSprites(v) { respawnItemSprites = v },
  get respawnItemLayers() { return respawnItemLayers }, getObjectLayer,
  get activeRespawnLayer() { return activeRespawnLayer }, setActiveRespawnLayer(v) { activeRespawnLayer = v },
  get currentWeather() { return currentWeather },
  get respawnItemContainer() { return respawnItemContainer },
  get dungeonDaojuImgMap() { return dungeonDaojuImgMap },
  get _dungeonDaojuCache() { return _dungeonDaojuCache },
});
initTerrainFx({
  get mapContainer() { return mapContainer }, get curMapData() { return curMapData },
  getFloorLayerName, getTileTerrainName, isWaterCell, isEntityOnScreen,
  get playerHeadName() { return playerHeadName },
  get currentWeather() { return currentWeather },
  get waterCells() { return waterCells }, get magmaCells() { return magmaCells },
  get flowLayer() { return flowLayer }, setFlowLayer(v) { flowLayer = v },
  get flowWaterSprites() { return flowWaterSprites }, setFlowWaterSprites(v) { flowWaterSprites = v },
  get flowMagmaSprites() { return flowMagmaSprites }, setFlowMagmaSprites(v) { flowMagmaSprites = v },
  get magmaBubbles() { return magmaBubbles }, setMagmaBubbles(v) { magmaBubbles = v },
  get mapLightSprites() { return mapLightSprites }, setMapLightSprites(v) { mapLightSprites = v },
  get lightPoints() { return lightPoints },
  get app() { return app },
  get tileW() { return tileW }, get tileH() { return tileH }, get scale() { return scale },
  get mapOffsetX() { return mapOffsetX }, get mapOffsetY() { return mapOffsetY },
  get pPixelX() { return pPixelX }, get pPixelY() { return pPixelY },
  get pCol() { return pCol }, get pRow() { return pRow },
  get playerReflection() { return playerReflection }, get playerSprite() { return playerSprite },
  get playerReflectionHead() { return playerReflectionHead }, setPlayerReflectionHead(v) { playerReflectionHead = v },
  get playerHeadOff() { return playerHeadOff },
});
initAtmosphereFx({
  get mapContainer() { return mapContainer }, get curMapData() { return curMapData },
  get tileW() { return tileW }, get tileH() { return tileH }, get scale() { return scale },
  get mapW() { return mapW }, get mapH() { return mapH },
  get currentWeather() { return currentWeather },
  // ⚡ 低性能模式：氛围特效（光柱/尘埃/投影）整体关闭
  get isPerfLow() { return user.perfMode === 'low' },
});
let initialized = false; // 是否已初始化（第一次显示时才 init）

const pixiContainer = ref(null);
const playerCol = ref(0);
const playerRow = ref(0);
const exploredCount = ref(0);
const totalCells = ref(0);
const miniMapCanvas = ref(null);      // 🗺️ 小地图 canvas
const guideHintShow = ref(false);     // 🧭 右上角新手指引提示开关（首次进地牢时显示）
const guideHintKey = ref('guideHint'); // 🧭 指引提示词条 key（guideHint=找莫奇 / guideHintNext=去安全点）
let miniMapW = 0, miniMapH = 0;        // 小地图对应地图宽高
let miniMapRAF = 0;                    // 🗺️ 小地图 rAF 句柄
let miniMapLast = 0;                   // 🗺️ 上次重绘时间（节流）
const nightInfo = ref({ night: false, remainSec: _nightAfterSec(), showProgress: false }); // 🌙 底部夜晚状态信息（夜晚/距离夜晚秒数；普通模式 showProgress=true 显示进度百分比）
const dungeonInfo = ref({ speed: 0, vision: 0, tile: '' }); // 📊 底部状态：速度（格/秒）、可见度（格）、脚下瓦片名
let dungeonInfoTimer = 0;                          // 底部状态低频刷新计时器
const nightFallTip = ref(false);   // 🌙 夜晚降落提示（到达夜晚时屏幕中间弹出）
let nightFallShown = false;        // 本趟是否已弹出过夜晚提示（防止重复）
const showSettle = ref(false);    // 结算页开关
const showDungeonLoading = ref(false); // ⏳ 进入地牢/切换层加载遮罩开关
const loadProgress = ref(0);           // ⏳ 加载进度 0~100
let dungeonLoadTimer = null;           // ⏳ 加载进度平滑推进定时器
const showInv = ref(false);       // 查看已获得道具弹窗开关
const showBag = ref(false);       // 🎒 背包弹窗开关

const showFullMap = ref(false);    // 🗺️ 完整地图弹窗开关（点击小地图打开，冻结地牢）
const fullMapCanvas = ref(null);   // 🗺️ 完整地图 canvas
const showFailDialog = ref(false); // 💀 战斗失败框（黑色遮罩）开关
const showFailPanel = ref(false);  // 💀 战斗失败框面板（放大动画）开关
const sessionItems = ref([]);     // 本次会话拾取物品 [{ name, num }]
// 🎴 从全局 window 读取卡牌/道具 Spine 图片（xinxi.vue 生成后同步到全局）
const dungeonCardImgMap = ref({});
const dungeonDaojuImgMap = ref({});
// 🎴 地牢自己的卡牌/道具 Spine 渲染缓存（模块级，不依赖 xinxi.vue）
let _dungeonCardCache = {};
let _dungeonDaojuCache = {};
let _dungeonCardCacheDone = false;
let _dungeonDaojuCacheDone = false;

/** 地牢内预渲染所有卡牌 Spine（不依赖 xinxi.vue 的全局变量） */
async function initDungeonCardSpines() {
  if (_dungeonCardCacheDone) {
    dungeonCardImgMap.value = { ..._dungeonCardCache };
    return;
  }
  const cardData = user.pixi?.player?.CARD_DATA || {};
  const names = Object.keys(cardData).filter(n => !_dungeonCardCache[n]);
  for (const name of names) {
    try {
      const result = await createCardSpine(name, 128, 128);
      if (result?.canvas) {
        const url = result.canvas.toDataURL();
        _dungeonCardCache[name] = url;
        dungeonCardImgMap.value = { ...dungeonCardImgMap.value, [name]: url };
      }
    } catch (e) {
      console.warn(`[地牢背包] 卡牌 ${name} spine 加载失败:`, e);
    }
  }
  _dungeonCardCacheDone = true;
}

/** 地牢内预渲染背包道具 Spine（不依赖 xinxi.vue 的全局变量） */
async function initDungeonDaojuSpines() {
  if (_dungeonDaojuCacheDone) {
    dungeonDaojuImgMap.value = { ..._dungeonDaojuCache };
    return;
  }
  const skinNames = new Set();
  for (const item of user.inventory || []) {
    if (!item.isCard && item.img && !_dungeonDaojuCache[item.img]) {
      skinNames.add(item.img);
    }
  }
  for (const skinName of skinNames) {
    try {
      const result = await createDaojuSpine(skinName, 80, 80);
      if (result?.canvas) {
        const url = result.canvas.toDataURL();
        _dungeonDaojuCache[skinName] = url;
        dungeonDaojuImgMap.value = { ...dungeonDaojuImgMap.value, [skinName]: url };
      }
    } catch (e) {
      console.warn(`[地牢背包] 道具 ${skinName} spine 加载失败:`, e);
    }
  }
  _dungeonDaojuCacheDone = true;
}

// ❤️ 玩家生命值（juese 实时，进度条）
const playerJuese = computed(() => user.pixi?.player?.juese || { hp: 100, maxHp: 100 });
const curHp = computed(() => playerJuese.value.hp ?? 100);
const maxHp = computed(() => playerJuese.value.maxHp ?? 100);
const hpPercent = computed(() => (maxHp.value > 0 ? Math.max(0, Math.min(100, (curHp.value / maxHp.value) * 100)) : 0));
const hpColor = computed(() => {
  const p = hpPercent.value;
  if (p > 60) return 'linear-gradient(90deg,#22c55e,#84cc16)';
  if (p > 30) return 'linear-gradient(90deg,#f59e0b,#fbbf24)';
  return 'linear-gradient(90deg,#ef4444,#f97316)';
});

// 结算页展示物品（补图标）
const settleItems = computed(() =>
  sessionItems.value.map(it => ({ ...it, img: it.img || resolveItemIcon(it.name, it.img) }))
);

// ========== Pixi 实例与地图数据 ==========
let app = null;
let mapContainer = null;
let fogGraphics = null;
let fogContainer = null;       // 🌀 迷雾容器：黑雾 + 圆形柔边压暗 Sprite（普通混合，把可见区边缘压成圆形）
let fogRoundSprites = [];      // 🌀 圆形柔边压暗 Sprite（玩家视野 + 地图光点，中心透明边缘渐黑）
let vignetteSprite = null;     // 🌑 屏幕暗角（径向渐变，四周压暗聚焦中心，跟随屏幕不随地图）
let playerGlow = null;
let playerSprite = null;      // 🧍 玩家用 dilaoQ spine 显示（按方向切换外观，不循环播放）
let playerReflection = null;  // 🌊 玩家水面倒影（垂直镜像 Spine，站水面格子时显示）
let playerReflectionHead = null; // 🌊 倒影当前皮肤（跟随玩家朝向）
let playerHeadName = null;    // 当前方向外观名（head_front/back/left/right）
let playerHeadOff = { x: 0, y: 0 }; // spine 底部中心相对原点的偏移（scale 后）
// 🎬 玩家头像受击特效（冻伤/雷击/烫伤：抖动 + 滤镜 + 头顶飘字）已拆分到 dungeon/fx.js 内部管理
let solidGrid = null;
let exploration = null;
let pickupItems = [];           // [{ col, row, itemId, num, img, taken }]（道具图由 tiled 对象层瓦片渲染）
let respawnItemLayers = [];     // 🎲 可刷新道具图层 [{ layerName, items: [...] }]（层名 items_respawn_*，进入地牢随机选一层）
let activeRespawnLayer = null;  // 🎲 本次地牢随机选中的可刷新道具层名（未选中为 null）
let respawnItemContainer = null; // 🎲 手动渲染 respawn 道具的容器（mapContainer 子节点，不依赖 tiled 对象层瓦片渲染）
let respawnItemSprites = [];     // 🎲 当前 respawn 道具的 Sprite 列表（与 pickupItems 中 respawn 项一一对应）
let randomSpawnConfig = null;      // 🎲 随机刷新道具总数量（tiled 地图属性 randomSpawnCount 只传数量，null=未配置走 items_respawn 图层）
let spawnPoint = null;          // 重生点（本次生效的复活点：多个 spawn 点中随机选中）
let spawnPoints = [];           // 🚪 全部 spawn 出生点列表（[{ col, row, showLeave }]，进入地牢随机选一个复活）
let hasMovedAfterEnter = false; // 🚪 进入地牢后是否移动过（移动一次后才检测右下角互动按钮）
let lightPoints = [];           // 💡 光点（对象层 light，照亮周围迷雾，radius 在 tiled 属性里设置）
let enemies = [];                // 👾 地牢敌人 [{ id, col, row, px, py, name, hp, attack, armor, speed, exp, spineKey, aggroRadius, count, sprite, state, path, moveTimer, aggroed }]
let catTrails = [];              // 🐱 魔化猫冲刺残影列表 [{ s, life, max }]（加速期生成的渐隐幽灵副本）
let ambushGroups = [];           // 👾 埋击敌人组 [{ layer, enemies: [], triggered }]——平时隐藏，触碰感应区后出现并追击
let npcs = []; // 🧑 地牢 NPC 列表（装饰性 spine 角色，播放待机动画）
let npcNightHideState = false; // 🌙 天黑后 NPC 隐藏状态（仅状态变化时设置一次 visible）
let npcTalkCooldown = 0; // 💬 NPC 对话触碰冷却（秒），防止连续触发
// 🧭 首次进入地牢新手指引：A* 寻路路线指向莫奇（shangren1），玩家照着走
let guideEnabled = false;   // 指引是否开启
let guidePath = [];         // 当前寻路路径 [{col,row},...]（不含起点）
let guideGraphics = null;   // 主地图路径绘制层（迷雾之上）
let guideDialogueActive = false; // 🧭 当前对话是否为莫奇（对话完成才关闭指引）
let guideTarget = null;     // 🧭 当前指引目标 {col,row}（阶段1=莫奇，阶段2=spawn 安全点）
let guideStage = 1;         // 🧭 指引阶段：1=找莫奇，2=前往安全点（首遇莫奇对话结束后切换）
let obstacles = []; // 📦 障碍物列表（pushable 可推动）
let obstacleGraphics = null; // 🎨 障碍物渲染图层
let sealZones = []; // 🚪 封印出口感应区 [{ id, col, row, w, h, once, sealCells, message, unlockType, triggered }]
let sealedCells = new Set(); // 🚪 已封印的格子 "col,row"
let sealLayers = {}; // 🚪 封印瓦片层引用 { sealId: layerContainer }（Tiled 里层名 seal_{id}）
let coverLayers = []; // 🌳 遮挡层容器（Tiled 里层名 cover_xxx 的瓦片层，提出到玩家之上，树冠/屋檐遮挡玩家）
let coverSortState = {}; // 🪜 y-sort 状态缓存（label -> 'front'|'back'），仅在状态变化时重排，避免每帧 addChildAt 导致排序抖动
let coverSwayMode = {}; // 🌬️ cover 层动画模式（label -> 'slide'|'swing'|'none'，来自 Tiled 图层自定义属性 swayMode）
let colRows = {}; // 🗂️ cover 层列级瓦片行集合 { col: Set<row> }（合并所有图层；列级遮挡判断用）
let coverColByLabel = {}; // 🗂️ 列容器 label → 列号（'cover_装饰#5' → 5；未拆分 fallback 无 # → NaN）
let coverRowByLabel = {}; // 🗂️ 瓦片容器 label → 行号（'cover_装饰#5#12' → 12；列容器/未拆分无行号 → undefined，走列级判断）
let coverZByLabel = {}; // 🪜 cover 图层上下级（label -> coverZ 数字，来自 Tiled 图层自定义属性 coverZ，越大越上层，默认 0）
let treeSwayFilters = []; // 🌬️ 树冠摇曳滤镜列表（每层一个，主循环更新 uTime）
let sealLayerCells = {}; // 🚪 seal 图层格子映射 { sealId: [[c,r],...] }（供 interact 解锁时解封）
let preSealedZones = []; // 🔒 预封印区域（一开始就封锁，满足条件后解锁）
let switches = []; // 🔘 地图开关 [{ id, switchId, col, row, message, activated }]
let activatedSwitches = new Set(); // 🔘 已激活的开关ID
let dialogueUnlockFlags = new Set(); // 💬 对话解锁标记集合
let isPushing = false; // 📦 当前是否在推动木箱（推动时移速降低，体现重量感）
// 推动时速度倍率（越小越沉）
let glassGrid = null; // 🪟 玻璃瓦片网格（1=玻璃，阻挡移动但不阻挡视野）
let terrainGrid = null; // 🌊 地形网格（存储每个格子的 speedMultiplier，1.0=正常，<1=减速）
let visionGrid = null; // 🌿 视野减少网格（存储每个格子的 visionReduce，具体减少的格子数）
let damageGrid = null; // 🔥 伤害网格（存储每个格子的 damage，站上去持续扣血，0=不扣血）
let damageTimer = 0; // 🔥 伤害扣血冷却计时器（秒）
let yumiHealTimer = 0; // 🐟 云弥被动：水面恢复计时器（秒）
let preBattlePos = null; // ⚔️ 进入战斗前的玩家位置（战斗结束后恢复到此位置，而非spawn点）
let preBattleEnemyStates = null; // ⚔️ 进入战斗前的所有存活敌人位置/状态（战斗结束后恢复，不刷新到出生点）
let pendingEnemyDialogue = null; // 💬 击败敌人后待触发的对话配置（dialogAfterBattle=true 时记录）
let currentBattleEnemy = null; // ⚔️ 当前正在战斗的敌人对象（战斗胜利后真正标记 defeated）
let sandSlowLevel = 0; // 🏜️ 沙地当前减速比例（0~1，0=不减速，1=满减速）
let sandHoldTimer = 0; // 🏜️ 离开沙地后的减速保持计时器（秒）
let sandCurConfig = null; // 🏜️ 当前沙地配置（slowMax/slowRate/slowHold）
let sandGrid = null; // 🏜️ 沙地网格（存储每个格子的沙地配置，null=不是沙地）
let iceGrid = null; // 🧊 冰面网格（1=冰面，滑行/惯性）
let waterGrid = null; // 💧 水属性网格（1=浅水/深水，下雪时冻结为冰面）
let puddleGrid = null; // 💧 雨洼网格（puddle=true 的石板瓦片格子，雨天渲染雨洼）
let puddleLayer = null; // 💧 雨洼渲染层（地图容器内，跟随地图；雨天显示水滴/涟漪）
let puddleDropData = []; // 💧 每个雨洼格的涟漪数据 { col,row,cx,cy,phase,size,r1,r2 }
let puddleStaticSprite = null; // 💧 雨洼静态水渍纹理（预渲染一次，每帧不重绘）
let iceSlideDir = { dc: 0, dr: 0 }; // 🧊 冰面滑行方向（最后移动方向）
let iceSlideActive = false; // 🧊 是否正在冰面滑行（松键后自动滑行）
let iceSlideEnergy = 0; // 🧊 冰面滑行剩余能量（0~1，逐格衰减）
// ❄️ 雪天粒子
let snowGraphics = null;           // 雪花粒子图层（屏幕坐标）
let snowDrops = [];                // 雪花粒子 { sprite }
let snowTex = null;                // 雪花贴图纹理
// ❄️ 雪天冻伤扣血（呆满10秒后每5秒扣1%最大生命）
let snowStayTimer = 0;             // 在雪天中累计停留时间（秒）
let snowDmgTimer = 0;              // 冻伤扣血冷却计时（秒）
// 🌅 环境光层次：全屏淡色调随昼夜/天气渐变（白天暖橙 → 夜晚冷蓝）
let ambientLayer = null;
let ambientGraphics = null;

let pushTargets = []; // 🎯 箱子目标位置列表（推到此处触发宝箱）
let chests = []; // 📦 宝箱列表（初始隐藏，触发后显示，打开获得物品）
let chestGraphics = null; // 🎨 宝箱渲染图层
let triggers = []; // ⚡ 感应区列表（玩家进入触发对话）
let interactables = []; // 🖐️ 互动点列表（玩家靠近显示互动按钮，点击/空格触发）
const nearInteractable = ref(null); // 🖐️ 当前玩家附近可互动的点
let gatherPoints = [];               // ⛏️ 采集点（对象层 gather：站上去采集，读进度条得道具）
const isGathering = ref(false);      // ⛏️ 正在采集（锁定移动）
const gatherProgress = ref(0);       // ⛏️ 采集进度 0~1
let gatherCurrent = null;            // ⛏️ 当前采集中的采集点
let gatherSpriteLayer = null;        // 🎨 采集点 Sprite 层
const showInteractDialog = ref(false); // 🖐️ 互动弹窗显示状态
const interactDialogData = ref({ title: '', content: '' }); // 🖐️ 互动弹窗数据
let mapW = 0, mapH = 0;
let tileW = 0, tileH = 0;
let scale = 1;
let mapOffsetX = 0, mapOffsetY = 0;

// ========== 玩家格子移动状态 ==========
let pCol = 5, pRow = 5;
let pPixelX = 0, pPixelY = 0;
let targetCol = 5, targetRow = 5;
let isMoving = false;
let windInputLock = false;           // 💨 吹风强制移动期间锁定玩家输入（玩家无法操控）
let windSpeedMult = 1;               // 💨 吹风强制移动时的移速倍率（被风猛吹，超级快）
// 进入冰面/按下方向时的初始滑行能量
let visibleRadius = DUNGEON_COMBAT_CFG.playerVisibleRadius; // 玩家周围亮起的格子范围（从 Tiled 地图属性 viewRadius 读取，默认见 config）
let currentWeather = 'sunny';        // 当前天气 id
let bgMusicAudio = null;   // 🎵 当前背景音乐 Audio
let loadedTilesetKeys = [];      // 🔥 已加载图块集资源 key（换层/离开时释放，防 WebGL OOM）
let currentLayerTilesetKeys = []; // 当前层实际加载的图块集（供对比卸载旧层）
let bgMusicKey = null;     // 🎵 当前背景音乐 key
let bgMusicWeather = null; // 🎵 当前背景音乐所属天气（雨类三兄弟共用同曲但音量不同，需记录天气）
let sfxAudioPool = [];     // 🎵 一次性音效池
function stopBgMusic() {
  bgMusicWeather = null;
  audioStopBgm(); // 🎵 统一音频管理器：淡出 + 释放 BGM 实例
  bgMusicKey = null;
}
function playBgMusic(weather) {
  const key = DUNGEON_BG_MUSIC[weather] || null;
  if (key === bgMusicKey && weather === bgMusicWeather) return; // 同一背景音乐且同一天气已在播，不重启（天气变了即使同曲也重启以应用新音量）
  stopBgMusic();
  if (!key) return;
  bgMusicKey = key;
  bgMusicWeather = weather;
  audioPlayBgm(key, { volume: BG_VOLUME[weather] != null ? BG_VOLUME[weather] : 0.5, base: DILAO_MUSIC_BASE }); // 🎵 统一音频管理器
}
let _lastAlertSfxAt = 0; // ⏱️ 敌人发现/追击提示音防重叠
function playAlertSfx() {
  const now = performance.now();
  if (now - _lastAlertSfxAt < 800) return; // 800ms 内只响一次（多个敌人同时发现不轰炸）
  _lastAlertSfxAt = now;
  playSfx('jingti'); // 🚨 敌人发现玩家/进入追击提示音（一次性）
}

function playSfx(name, opts = {}) {
  // 🎵 统一音频管理器：对象池 + 同名去重（默认 120ms 防连发轰炸）+ 全局音量同步
  audioSfx(name, {
    volume: (SFX_VOLUME[name] != null ? SFX_VOLUME[name] : 0.7) * (user?.volume ?? 1),
    base: DILAO_MUSIC_BASE,
    dedupeMs: opts.dedupeMs ?? 120,
    rate: opts.rate ?? 1,
  });
}
const weatherUi = ref('sunny');      // 供模板显示的响应式天气 id（同步自 currentWeather）
let weatherFogReduce = 0;            // 天气可见度减少格数（fog/storm/thunderstorm 用）
let weatherPlayerSlow = 0;           // 玩家移速降低比例（0~1）
let weatherEnemySpeedUp = 0;         // 敌人移速提升比例（0~1）
let tiledFogReduceOverride = -1;     // Tiled 地图属性 fogReduceRadius 覆盖值（-1=未配置，resume 重随机时沿用）
let tiledFixedWeather = false;       // 🎛️ Tiled 地图属性 fixedWeather：勾选后固定采用 weather 天气，跳过随机
// 雷雨天状态
let thunderTimer = 0;                // 距上次落雷的计时（秒）
// 预警时长 1.5 秒
let thunderWarnTimer = 0;            // 预警剩余时间
let thunderTarget = null;            // 当前落雷目标格 { col, row }
let thunderWarnLayer = null;         // 九宫格红色预警 Graphics
let thunderBoltLayer = null;         // 雷电特效 Graphics
let thunderFxTimer = 0;              // 雷电特效展示计时
let thunderBoltData = null;          // 当前闪电几何数据 { cx, cy, tw, th, topY, jitter }（供每帧重绘动效）
let thunderDmgWindow = 0;            // 落雷后伤害持续检测窗口（秒，0=无激活窗口）
let thunderDmgDone = false;          // 本窗口内是否已造成过伤害（0.5s 内只伤一次）
// ⚡ 水面电传导（雷雨天：落雷命中水面 → 整块连续水域导电）
let thunderConductCells = [];        // 传导水域格子 [{col,row}]
let thunderConductDistMap = [];      // 传导格及 BFS 距离 [{col,row,dist}]
let thunderConductTimer = 0;         // 电传导特效剩余时间（秒）
let thunderConductProgress = 0;      // 传导扩散进度 0~1
let thunderConductLayer = null;      // 电传导特效 Graphics（地图坐标，跟随镜头）
// 天气滤镜引用
let weatherFilter = null;            // 氛围滤镜（AdjustmentFilter，作用于地图容器）
let dungeonElapsed = 0;              // ⏱️ 地牢内累计秒数（进入地牢从0计时，天黑判定依据）
// 🌑 暗影怪物（黑夜降临后刷新的怪）：触碰不掉血不进入战斗，改为扣血+减速
const SHADOW_START_DELAY = 15;   // 黑夜降临后再过15 秒开始刷新
const SHADOW_INTERVAL = 8;      // 每 8 秒刷新一个
const SHADOW_MAX = 10;           // 最多出现 10 个
const SHADOW_SPAWN_NEAR = 8;     // 不在玩家附近（切比雪夫距离≥8）
const SHADOW_FREEZE = 4;         // 触碰后该暗影怪停留（冻结）4 秒并逐渐透明淡出，之后彻底消失
const SHADOW_SLOW_TIME = 1.5;    // 减速玩家持续 1.5 秒
const SHADOW_SLOW_RATIO = 0.4;   // 减速 40% 移速
const SHADOW_DMG_PCT = 0.16;     // 造成 16% 最大生命值伤害
const SHADOW_SPEED = 3;        // 暗影怪移动速度（格/秒，比普通敌人默认 3 快）
const SHADOW_AGGRO = DUNGEON_COMBAT_CFG.shadowAggro;          // 暗影怪索敌半径（格，config 可调）
const SHADOW_FOV = DUNGEON_COMBAT_CFG.shadowFovDeg * Math.PI / 180; // 暗影怪扇形索敌角度（度→弧度，config 可调）
const SHADOW_CLOSE = DUNGEON_COMBAT_CFG.shadowClose;        // 近身圆形索敌半径（格）
const SHADOW_PATROL = 3;         // 暗影怪巡逻范围（格）
// 🎁 掉落表（ENEMY_DROP_RATES / SHADOW_DROP_BLESSING_MULT）已抽到共享模块 dungeon/dropRates.js（主世界+地牢统一）
let shadowEnemies = [];          // 当前层暗影怪 [{ col,row,px,py,sprite,freezeTimer,playerInside,id }]
let shadowSpawnTimer = 0;        // 距下次刷新计时（秒）
let shadowSpawnStarted = false;  // 是否已到「黑夜降临后15秒」开始刷新
let shadowSpawnCount = 0;        // 本趟已刷新数量
let shadowSlowTimer = 0;         // 玩家受暗影减速剩余时间（秒）
let dungeonNightTime = 0;            // 🌙 地牢天黑进度 0~1（进入为白天，随时间单向变黑，到1保持不再亮）
let dungeonNightFilter = null;       // 🌙 天黑滤镜（AdjustmentFilter，挂 stage 覆盖瓦片+头像）
let weatherAtmoLayer = null;         // 全局氛围层（如血月暗角、雾天朦胧）
let weatherAtmoGraphics = null;      // 氛围层 Graphics（跟随镜头）
let snowScreenOverlay = null;        // ❄️ 雪天寒冷屏幕滤镜（跟随屏幕固定，不随地图移动）
let bloodmoonOverlay = null;         // 🌕 血月血色屏幕滤镜（跟随屏幕固定）
let bloodmoonApplied = false;        // 血月是否已生效（用于 battle 标记）
// 🔥 岩浆→石板覆盖层（雨天/暴风雨/雷雨天/雪天时岩浆被浇灭，视觉变石板且无伤害）
let magmaCells = [];                 // 当前层岩浆格子 [{ col, row }]

let waterCells = [];                 // 💧 当前层水属性格子 [{ col, row }]（雪天冻结为冰面）

let magmaCoverLayer = null;          // 石板覆盖层 Container（雨天时显示）
let curMapData = null;                 // 当前地图 mapData（供 updateMagmaCover 读取 tileset 瓦片映射）
// 🌧️ 雨滴粒子（雨天/暴风雨/雷雨天）
let rainGraphics = null;             // 雨滴图层（屏幕坐标，覆盖整个可视区）
let rainDrops = [];                  // 雨滴数组 { x, y, speed, drift, len, alpha }
let rainDensity = 0;                 // 当前雨滴数量（天气决定密度）
let rainDropCfg = null;              // 当前天气雨滴参数（count/speed/drift/len/width）
// 💨 暴风雨"一阵风"（从屏幕右侧吹过，强制玩家向左移动一格）
let windBlastTimer = 0;              // 距下次吹风倒计时（秒）
let windBlastActive = false;         // 是否正在吹风
let windBlastT = 0;                  // 当前吹风进行时间（秒，0~WIND_BLAST_DUR）
let windFxLayer = null;              // 吹风特效 Graphics（屏幕坐标，从右往左扫过）
let windFxSeed = [];                 // 风纹粒子种子（每条风线的 y/len/alpha）
// 🌫️ 雾天烟雾粒子（浓雾铺满，缓慢漂浮）
let fogSmokeGraphics = null;         // 烟雾图层（屏幕坐标）
let fogSmokeDrops = [];              // 烟雾粒子 { x, y, r, speedX, speedY, alpha, phase }
// ⚡ 打雷闪光（雷雨天偶尔全屏闪白）
let thunderFlashLayer = null;        // 打雷全屏闪白 Graphics
let thunderFlashTimer = 0;           // 闪光剩余时间（>0 表示闪光中）
let thunderFlashAlpha = 0;           // 当前闪光透明度
let thunderRandomTimer = 5;          // 距下次随机打雷的计时（秒）
const showWeatherInfo = ref(false);  // 天气说明弹窗开关
const showNightInfo = ref(false);    // 🌙 夜晚效果说明弹窗开关
let dungeonPaused = false; // 战斗期间暂停地牢（玩家和敌人都无法移动）
let _skipDungeonPauseSave = false; // 🗑️ 死亡清档后隐藏地牢时跳过本次 pause 存档回写
let storyPaused = false; // 剧情对话期间暂停地牢（触发 hd200/jqZ200/fx03 等对话时冻结）
const currentLevel = ref(1);
// 🗺️ 当前地牢所属地图名（世界地图进入时保存的 label，兜底“地牢”）
const mapDisplayName = computed(() => {
  const label = user.getDialogueFlag?.('dungeonEntryMapLabel');
  if (label && String(label).trim()) return String(label).trim();
  return t('dungeonNameFallback');
});
let stairsPoint = null; // 当前层的下楼入口 { col, row, targetLevel, cost, dialogLoadData, dialogRoute }
const showStairsDialog = ref(false); // 🪜 进入下一层确认弹窗
let pendingStairsDialogue = null; // 💬 进入下一层后待触发的对话配置 { dialogLoadData, dialogRoute }
// 🗺️ 路线选择弹窗（杀戮尖塔2风格）：到楼梯后冻结地牢，弹窗选分支路线
const showRouteDialog = ref(false);
const routeDialogRoutes = ref([]); // 打开弹窗时的分支路线快照（含 next 子树）
const selectedRouteId = ref(null); // 当前选中的分支 id
// 🗺️ 分支路线类型图标
const ROUTE_TYPE_ICONS = { battle: '⚔️', elite: '💀', chest: '🎁', shop: '💰', rest: '🛏️', event: '❓', boss: '👑', mystery: '🌫️' };
let mapEntryDialogue = null; // 🎬 地图属性配置的进入地牢对话（dialogLoadData + dialogRoute），每次加载该层时更新
// 旧版单层 key（兼容迁移）
// ========== 键盘输入 ==========
const keys = { up: false, down: false, left: false, right: false };

// ========== 移动端摇杆（左下角虚拟摇杆，复用 keys 控制移动） ==========
const joyBase = ref(null);
const joyKnob = ref(null);
let joyActive = false;
let joyCenterX = 0, joyCenterY = 0;
// 死区（相对底座半径的比例）

function onJoyDown(e) {
  if (showSettle.value) return;
  const base = joyBase.value;
  if (!base) return;
  joyActive = true;
  const rect = base.getBoundingClientRect();
  joyCenterX = rect.left + rect.width / 2;
  joyCenterY = rect.top + rect.height / 2;
  try { base.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  updateJoystick(e);
}
function onJoyMove(e) {
  if (!joyActive) return;
  updateJoystick(e);
}
function onJoyUp() {
  if (!joyActive) return;
  joyActive = false;
  clearJoyKeys();
  const knob = joyKnob.value;
  if (knob) knob.style.transform = 'translate(0,0)';
}
function updateJoystick(e) {
  const base = joyBase.value, knob = joyKnob.value;
  if (!base || !knob) return;
  const radius = base.offsetWidth / 2;
  let dx = e.clientX - joyCenterX;
  let dy = e.clientY - joyCenterY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const max = radius * 0.85;
  if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  // 八方向判定：nx 和 ny 都超过死区时同时触发两个方向键（支持斜向移动）
  clearJoyKeys();
  const nx = dx / radius, ny = dy / radius;
  if (Math.abs(nx) > JOY_DEADZONE) {
    if (nx > 0) keys.right = true; else keys.left = true;
  }
  if (Math.abs(ny) > JOY_DEADZONE) {
    if (ny > 0) keys.down = true; else keys.up = true;
  }
}
function clearJoyKeys() {
  keys.up = keys.down = keys.left = keys.right = false;
}

function onKeyDown(e) {
  // 🛡️ 地牢未显示（v-show 常驻但主世界游玩）时完全不响应按键，防止主世界移动穿到地牢触发拾取/移动
  if (!props.visible) return;
  if (showSettle.value) { e.preventDefault(); return; } // 结算页时屏蔽所有操作
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; e.preventDefault(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { keys.down = true; e.preventDefault(); }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
  if (e.code === 'Escape') { openSettle(); }
  if (e.code === 'Space') {
    e.preventDefault();
    if (nearInteractable.value && !showInteractDialog.value) handleInteract();
  }
}
function onKeyUp(e) {
  if (!props.visible) return; // 🛡️ 地牢未显示时不更新按键状态
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
}

function isWalkable(col, row) {
  if (col < 0 || col >= mapW || row < 0 || row >= mapH) return false;
  return !solidGrid[row][col];
}


function updateVisibility() {
  for (let i = 0; i < exploration.length; i++) {
    if (exploration[i] === 2) exploration[i] = 1;
  }
  const effectiveRadius = getVisionRadius();
  const r2 = effectiveRadius * effectiveRadius;
  // 🌫️ 雾天用正方形判定（九宫格全亮含斜角）；其他天气用圆形判定
  const isFog = currentWeather === 'fog';
  for (let dr = -effectiveRadius; dr <= effectiveRadius; dr++) {
    for (let dc = -effectiveRadius; dc <= effectiveRadius; dc++) {
      // 雾天用正方形判定（九宫格全亮含斜角）；其他天气用圆形判定
      if (!isFog && dc * dc + dr * dr > r2) continue;
      const c = pCol + dc, r = pRow + dr;
      if (c >= 0 && c < mapW && r >= 0 && r < mapH) {
        // 玩家视野不能穿墙：视线被墙壁挡住的格子不照亮
        if (!hasLineOfSight(pCol, pRow, c, r)) continue;
        if (exploration[r * mapW + c] === 0) user.trackDungeonStat('explored', 1); // 🏆 首次点亮新格（成就：无界探索家）
        exploration[r * mapW + c] = 2;
      }
    }
  }
  // 💡 光点照亮：每个光点周围 radius 格保持可见（状态 2，不随玩家移动降级）
  //    💡 照亮半径 = radius × 1.5：与灯光视觉光晕（terrainFx attachLight 同乘 1.5）对齐，
  //    光晕亮到哪迷雾破到哪
  //    💡 全天气生效：灯是地牢安全光源，雾/雪天同样照亮，灯旁始终全亮
  for (const lp of lightPoints) {
    // 💡 方形照亮：灯区 lr×lr 范围内所有格子全亮（状态 2），不做圆形裁剪，
    //    避免边缘格子保持半透明（状态1）混在亮区里
    const lr = Math.ceil(lp.radius * 1.5);
    for (let dr = -lr; dr <= lr; dr++) {
      for (let dc = -lr; dc <= lr; dc++) {
        const c = lp.col + dc, r = lp.row + dr;
        if (c >= 0 && c < mapW && r >= 0 && r < mapH) {
          exploration[r * mapW + c] = 2; // 💡 灯区无条件全亮（含墙后/边缘），不留半透明格子
        }
      }
    }
  }
  let count = 0;
  for (let i = 0; i < exploration.length; i++) {
    if (exploration[i] >= 1) count++;
  }
  exploredCount.value = count;
  // 🧑 NPC 在全黑迷雾（未探索，状态0）中隐藏，已探索/可见区域显示；夜晚（npcNightHideState）彻底隐藏，不被迷雾刷新重新显示
  for (const npc of npcs) {
    if (!npc.sprite) continue;
    const state = exploration[npc.row * mapW + npc.col] || 0;
    npc.sprite.visible = state > 0 && !npcNightHideState;
  }
  redrawFog();
}

// 🌀 当前玩家视野半径（格数）：与 updateVisibility 同一套计算（草地减视野 / 天气减视野 / 晨曦被动 + 明目药剂加成，雾天固定九宫格）
function getVisionRadius() {
  // 🌿 草地减少玩家视野：根据玩家所在格子的 visionReduce 减去具体格子数
  const playerVisionReduce = getVisionReduce(pCol, pRow);
  // 🌦️ 天气减少视野：雾天强制只能看到周围九宫格（正方形3×3，含斜角），其他天气按可见度减少格数
  const isFog = currentWeather === 'fog';
  // ☀️ 晨曦被动：携带进入地牢可见度 +1（雾天九宫格同样 +1）
  const carryVisionBonus = (user.getNpcAlly?.() === 'jinmao' ? 1 : 0) + (user.pixi?.player?.dungeonVisionBuff || 0); // ☀️ 晨曦被动 +1 / 🧪 明目药剂：本次地牢可见度 +N
  return isFog
    ? 1 + carryVisionBonus
    : Math.max(1, visibleRadius - playerVisionReduce - weatherFogReduce + carryVisionBonus);
}

function redrawFog() {
  if (!fogGraphics) return;
  fogGraphics.clear();
  const tw = tileW * scale, th = tileH * scale;
  // 🟩 逐行合并连续同状态格子为大矩形 + 整数化坐标：
  //    - 未探索(state0)：向右下扩 1px 覆盖缝隙（纯黑重叠无碍，无网格）
  //    - 已探索(state1)：floor 精确拼接不重叠（避免 0.72 半透明行间重叠加深成横线）
  for (let r = 0; r < mapH; r++) {
    let c = 0;
    while (c < mapW) {
      const state = exploration[r * mapW + c];
      if (state !== 0 && state !== 1) { c++; continue; }
      let c2 = c;
      while (c2 < mapW && exploration[r * mapW + c2] === state) c2++;
      const x = Math.floor(c * tw), y = Math.floor(r * th);
      const w = Math.ceil(c2 * tw) - x;
      if (state === 0) {
        fogGraphics.rect(x, y, w + 1, Math.ceil(r * th + th) - y + 1).fill({ color: 0x000000, alpha: 1 });
      } else {
        fogGraphics.rect(x, y, w, Math.floor((r + 1) * th) - y).fill({ color: 0x000000, alpha: 0.72 });
      }
      c = c2;
    }
  }
  updateFogRoundSprites(); // 🌀 玩家视野 + 光点：圆形柔边压暗（把可见区边缘的格子阶梯压成圆形，普通混合不擦地图）
}

// 🌀 圆形柔边压暗：玩家视野 + 每个地图光点，用"中心透明 → 边缘渐黑"的径向渐变纹理叠在黑雾上，
//    可见区（洞）中心不遮挡、边缘渐暗成圆，格子阶梯尖角被压进圆形轮廓；光点数量随切层变化，动态增删 Sprite
function syncFogRoundSpritesCount() {
  if (!fogContainer) return;
  const mk = () => {
    const s = new Sprite(getEdgeDarkTexture(0.55));
    s.anchor.set(0.5);
    s.visible = false; // 位置/大小由 redrawFog → updateFogRoundSprites 首次更新前不显示
    fogContainer.addChild(s);
    return s;
  };
  const need = 1 + (lightPoints || []).length;
  while (fogRoundSprites.length < need) fogRoundSprites.push(mk());
  while (fogRoundSprites.length > need) { const s = fogRoundSprites.pop(); try { s.destroy(); } catch (e) { /* ignore */ } }
}
function updateFogRoundSprites() {
  syncFogRoundSpritesCount();
  if (!fogRoundSprites.length) return;
  const tw = tileW * scale, th = tileH * scale;
  // 玩家视野圆
  const s0 = fogRoundSprites[0];
  const visR = getVisionRadius();
  s0.visible = visR > 0;
  s0.x = pPixelX;
  s0.y = pPixelY;
  s0.scale.set(((visR + 1.4) * tw * 2) / 256); // 略大于视野半径，边缘留出柔边渐变
  // 光点圆
  for (let i = 0; i < lightPoints.length; i++) {
    const lp = lightPoints[i];
    const s = fogRoundSprites[i + 1];
    if (!s) continue;
    s.visible = false; // 💡 灯区已方形全亮，圆形柔边会叠出半透明渐变，隐藏
    s.x = (lp.col + 0.5) * tw;
    s.y = (lp.row + 0.5) * th;
    s.scale.set(((lp.radius * 1.5 + 0.8) * tw * 2) / 256); // 💡 与光晕半径对齐
  }
}

// 🌑 屏幕暗角：四周径向渐变压暗，聚焦中心（跟随屏幕固定，不随地图，覆盖在游戏画面之上）
function createVignette() {
  try {
    const w = window.innerWidth, h = window.innerHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.74);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.16)');
    grad.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    vignetteSprite = new Sprite(new Texture({ source: new CanvasSource({ resource: c }) }));
    vignetteSprite.eventMode = 'none';
    app.stage.addChild(vignetteSprite);
  } catch (e) { vignetteSprite = null; }
}
// 🚪 应用封印：把指定格子变成障碍物，并显示 Tiled 封印层
function applySeal(zone) {
  if (!zone || zone.triggered) return;
  zone.triggered = true;
  for (const [c, r] of zone.sealCells) {
    if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
    const key = c + ',' + r;
    if (sealedCells.has(key)) continue;
    sealedCells.add(key);
    if (solidGrid && solidGrid[r]) solidGrid[r][c] = 1;
  }
  // 显示对应的 Tiled 封印层（visible + alpha 双保险，递归显示子元素）
  const layer = sealLayers[zone.id];
  if (layer) {
    layer.visible = true;
    layer.alpha = 1;
    const showChildren = (c) => {
      if (!c.children) return;
      for (const child of c.children) {
        child.visible = true;
        child.alpha = 1;
        showChildren(child);
      }
    };
    showChildren(layer);
  }
  // 提示
  if (zone.message) {
    ElMessage({ message: zone.message, type: 'warning', duration: 2000 });
  }
}

// 🔓 解除封印：恢复格子可通行，隐藏 Tiled 封印层
function unlockSeal(zone) {
  if (!zone || !zone.triggered || zone.unlocked) return;
  zone.unlocked = true;
  for (const [c, r] of zone.sealCells) {
    if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
    const key = c + ',' + r;
    sealedCells.delete(key);
    let stillSealed = false;
    for (const z of sealZones) {
      if (z !== zone && z.triggered && !z.unlocked) {
        for (const [cc, rr] of z.sealCells) {
          if (cc === c && rr === r) { stillSealed = true; break; }
        }
      }
      if (stillSealed) break;
    }
    if (!stillSealed && solidGrid && solidGrid[r]) solidGrid[r][c] = 0;
  }
  // 隐藏对应的 Tiled 封印层（visible + alpha 双保险，递归隐藏子元素）
  const layer = sealLayers[zone.id];
  if (layer) {
    layer.visible = false;
    layer.alpha = 0;
    const hideChildren = (c) => {
      if (!c.children) return;
      for (const child of c.children) {
        child.visible = false;
        child.alpha = 0;
        hideChildren(child);
      }
    };
    hideChildren(layer);
  }
}
// 🔒 应用所有预封印区域（把对应格子设为障碍物，Tiled 层已默认可见）
function applyPreSeals() {
  for (const z of preSealedZones) {
    if (z.unlocked) continue;
    for (const [c, r] of z.sealCells) {
      if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
      const key = c + ',' + r;
      if (sealedCells.has(key)) continue;
      sealedCells.add(key);
      if (solidGrid && solidGrid[r]) solidGrid[r][c] = 1;
    }
    // Tiled 封印层默认可见，无需额外操作
  }
}

// 🔒 解除预封印区域：恢复格子可通行，隐藏 Tiled 封印层（silent=true 时不弹解锁提示，用于读档静默恢复）
function unlockPreSeal(zone, silent) {
  if (!zone || zone.unlocked) return;
  zone.unlocked = true;
  for (const [c, r] of zone.sealCells) {
    if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
    const key = c + ',' + r;
    sealedCells.delete(key);
    let stillSealed = false;
    for (const z of sealZones) {
      if (z.triggered && !z.unlocked) {
        for (const [cc, rr] of z.sealCells) {
          if (cc === c && rr === r) { stillSealed = true; break; }
        }
      }
      if (stillSealed) break;
    }
    if (!stillSealed) {
      for (const z of preSealedZones) {
        if (z !== zone && !z.unlocked) {
          for (const [cc, rr] of z.sealCells) {
            if (cc === c && rr === r) { stillSealed = true; break; }
          }
        }
        if (stillSealed) break;
      }
    }
    if (!stillSealed && solidGrid && solidGrid[r]) solidGrid[r][c] = 0;
  }
  // 隐藏对应的 Tiled 封印层（visible + alpha 双保险，递归隐藏子元素）
  const layer = sealLayers[zone.id];
  if (layer) {
    layer.visible = false;
    layer.alpha = 0;
    const hideChildren = (c) => {
      if (!c.children) return;
      for (const child of c.children) {
        child.visible = false;
        child.alpha = 0;
        hideChildren(child);
      }
    };
    hideChildren(layer);
  }
  if (zone.unlockMessage && !silent) {
    ElMessage({ message: zone.unlockMessage, type: 'success', duration: 2000 });
  }
}

// 🔘 检查玩家是否触碰开关
function trySwitch() {
  for (const sw of switches) {
    if (sw.activated) continue;
    if (pCol === sw.col && pRow === sw.row) {
      sw.activated = true;
      activatedSwitches.add(sw.switchId);
      if (sw.message) {
        ElMessage({ message: sw.message, type: 'info', duration: 1500 });
      }
      return;
    }
  }
}
// 🧱 切换瓦片宝箱的显示瓦片：open=true 显示已开启（下面格=箱体86，上面格=盖子70），
//     false 恢复未开启瓦片（下面格=85，上面格还原原瓦片）。"上面那一格"不影响碰撞/交互。
function setChestTiles(chest, open) {
  if (!chest || !chest.fromTile || !mapContainer || !mapW || !mapH) return;
  const LAYER = chest.layer || getFloorLayerName();
  const tsIdx = chest.tsIndex;
  const setOne = (col, row, localId) => {
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) return;
    // localId<=0 → 清除该格瓦片
    if (!localId || localId <= 0) {
      try { mapContainer.setTile(LAYER, col, row, null); } catch (e) { /* ignore */ }
      return;
    }
    let t = null;
    try { t = mapContainer.getTile(LAYER, col, row); } catch (e) { t = null; }
    if (t && t.localId === localId && t.tilesetIndex === tsIdx) return;
    const next = {
      localId,
      tileset: tsIdx,
      horizontalFlip: !!(t && t.horizontalFlip),
      verticalFlip: !!(t && t.verticalFlip),
      diagonalFlip: !!(t && t.diagonalFlip),
    };
    try { mapContainer.setTile(LAYER, col, row, next); } catch (e) { /* 单格失败跳过 */ }
  };
  if (open) {
    // 记录盖子格原瓦片（重置/关闭时还原）；只在第一次替换时记录
    if (!chest.lidOrig) {
      try {
        const t = mapContainer.getTile(LAYER, chest.col, chest.row - 1);
        if (t && !(t.tilesetIndex === tsIdx && t.localId === chest.lidLocal)) {
          chest.lidOrig = { localId: t.localId, tileset: t.tilesetIndex };
        }
      } catch (e) { /* ignore */ }
    }
    setOne(chest.col, chest.row, chest.openLocal);      // 下面格：已开启箱体（与未开启对齐）
    setOne(chest.col, chest.row - 1, chest.lidLocal);   // 上面格：盖子（纯视觉，不影响）
  } else {
    setOne(chest.col, chest.row, chest.closeLocal);     // 恢复未开启宝箱瓦片
    if (chest.lidOrig) {
      setOne(chest.col, chest.row - 1, chest.lidOrig.localId); // 盖子格还原原瓦片
      chest.lidOrig = null;
    } else {
      setOne(chest.col, chest.row - 1, 0); // 上面格原本无瓦片 → 清空盖子
    }
  }
}

// 📦 渲染宝箱（未触发不渲染，已打开显示打开状态）
function renderChests() {
  // 🖼️ 优先用 pengzhuang 宝箱瓦片纹理渲染；纹理未就绪时退回代码画图
  if (rebuildChestSprites()) { if (chestGraphics) { try { chestGraphics.clear(); } catch (e) { } } return; }
  if (!chestGraphics) {
    chestGraphics = new Graphics();
    mapContainer.addChild(chestGraphics);
  }
  chestGraphics.clear();
  const cellW = tileW;
  const cellH = tileH;
  for (const chest of chests) {
    if (chest.fromTile) continue; // 🧱 瓦片宝箱靠地图瓦片显示，不画图形
    if (!chest.visible) continue;
    const x = chest.col * cellW;
    const y = chest.row * cellH;
    if (chest.opened) {
      // 已打开：空箱子（棕色+开盖）
      chestGraphics.rect(x + 3, y + 6, cellW - 6, cellH - 9);
      chestGraphics.fill(0x6B4423);
      chestGraphics.stroke({ width: 2, color: 0x4A2F17 });
      // 开盖（向上倾斜）
      chestGraphics.rect(x + 3, y + 2, cellW - 6, 6);
      chestGraphics.fill(0x8B5A2B);
      chestGraphics.stroke({ width: 1, color: 0x4A2F17 });
    } else {
      // 未打开：完整宝箱（金色边框+棕色箱体+锁）
      chestGraphics.rect(x + 3, y + 4, cellW - 6, cellH - 7);
      chestGraphics.fill(0x8B5A2B);
      chestGraphics.stroke({ width: 2, color: 0xFFD700 });
      // 箱盖
      chestGraphics.rect(x + 3, y + 4, cellW - 6, 7);
      chestGraphics.fill(0xA0522D);
      chestGraphics.stroke({ width: 1, color: 0xFFD700 });
      // 锁
      chestGraphics.rect(x + cellW / 2 - 3, y + 9, 6, 6);
      chestGraphics.fill(0xFFD700);
    }
  }
}

// 🎯 检查箱子是否推到了目标位置，触发对应宝箱，并锁定箱子（不可再推动）
function checkPushTarget(ob) {
  for (const target of pushTargets) {
    if (target.triggered) continue;
    if (target.col === ob.col && target.row === ob.row) {
      target.triggered = true;
      ob.locked = true; // 🔒 箱子推到目标位置后锁定，不可再推动
      // 触发对应宝箱显示
      const chest = chests.find(c => c.id === target.chestId);
      if (chest) {
        chest.visible = true;
        renderChests();
        ElMessage({ message: L('chestAppeared'), type: 'success', duration: 2000 });
      }
      return true;
    }
  }
  return false;
}
// ⚡ 检查玩家是否在感应区内：根据自定义属性决定 弹消息窗 或 进入对话
function tryTrigger() {
  for (const t of triggers) {
    // 都没配置则忽略（message / dialogLoadData / ambushLayer / spawnEnemies 任一有配置都要检测）
    if (!t.message && !t.dialogLoadData && !t.ambushLayer && t.spawnEnemies.length === 0) continue;
    // ⚡ 埋击类（ambushLayer / spawnEnemies）触发过一次后本趟不再重复触发，避免战斗结束返回后再次刷新敌人
    if (t.triggered && (t.once || t.ambushLayer || t.spawnEnemies.length > 0)) continue;
    if (t.cooldownTimer > 0) continue;
    // 检查玩家是否在感应区矩形内
    if (pCol >= t.col && pCol < t.col + t.w && pRow >= t.row && pRow < t.row + t.h) {
      t.triggered = true;
      if (t.cooldown > 0) t.cooldownTimer = t.cooldown;
      // 👾 模式0：配置了 ambushLayer 或 spawnEnemies → 埋击刷新敌人（触发一次）
      if (t.ambushLayer) {
        const cnt = spawnAmbushLayer(t.ambushLayer);
        t.ambushTriggered = true;
        if (cnt > 0) {
          ElMessage({ message: F('ambushFmt', { n: cnt }), type: 'warning', duration: 1800 });
        }
      } else if (t.spawnEnemies.length > 0) {
        spawnAmbushEnemies(t.spawnEnemies);
        t.ambushTriggered = true;
      }
      // 💬 模式1：配置了 message → 显示消息弹窗（与铭文/互动查看同款 UI）
      if (t.message) {
        interactDialogData.value = { title: t.title, content: t.message };
        showInteractDialog.value = true;
        npcTalkCooldown = Math.max(npcTalkCooldown, 2.0); // 防止连续触发
        return;
      }
      // 💬 模式2：配置了 dialogLoadData → 进入对话（条件路由和 stairs/NPC 一样）
      let targetName = t.dialogName;
      if (Array.isArray(t.dialogRoute) && t.dialogRoute.length > 0) {
        for (const step of t.dialogRoute) {
          if (!matchDialogueCondition(step)) continue;
          targetName = step.name;
          break;
        }
      }
      if (targetName) {
        emitter.emit('talkToNpc', {
          loadData: t.dialogLoadData,
          name: targetName,
        });
        npcTalkCooldown = Math.max(npcTalkCooldown, 2.0); // 防止连续触发
      }
      return;
    }
  }
}
// 👾 埋击刷新敌人（对象层方式）：把埋击组里隐藏的敌人创建 sprite 并立即进入追击状态
function spawnAmbushLayer(layerName) {
  const group = ambushGroups.find(g => g.layer === layerName);
  if (!group || group.triggered) return 0;
  group.triggered = true;
  let count = 0;
  for (const e of group.enemies) {
    if (e.defeated || e.sprite) continue;
    playAlertSfx(); // 🚨 埋击敌人出现即追击提示音
    e.state = 'chase';   // 🎯 埋击敌人出现即追击
    e.aggroed = true;    // 立即索敌
    // 🐛 修复：加入 enemies 数组，updateEnemies 每帧才会实时更新它们（移动/索敌/追击）
    if (!enemies.includes(e)) enemies.push(e);
    createEnemySprite(e);
    count++;
  }
  if (count > 0 && playerSprite && playerSprite.parent) {
    try { playerSprite.parent.addChild(playerSprite); } catch (err) { }
  }
  return count;
}

// 👾 埋击刷新敌人（JSON 数组方式）：在指定位置创建敌人并立即追击
function spawnAmbushEnemies(configs) {
  if (!Array.isArray(configs)) return;
  let count = 0;
  for (const cfg of configs) {
    const col = Math.floor(Number(cfg.col));
    const row = Math.floor(Number(cfg.row));
    if (!isFinite(col) || !isFinite(row)) continue;
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    if (!isWalkable(col, row)) continue; // 目标格不可走则跳过
    // 敌人配置数组（可多种敌人）
    const enemyCfgs = Array.isArray(cfg.enemies) ? cfg.enemies : [];
    if (enemyCfgs.length === 0) continue;
    const first = enemyCfgs[0];
    const e = {
      id: 'ambush_' + (++enemyIdCounter.value),
      spawnCol: col, spawnRow: row,
      col, row,
      px: (col + 0.5) * tileW * scale,
      py: (row + 0.5) * tileH * scale,
      enemies: enemyCfgs,
      displayName: String(first.name || t('enemyFallbackName')),
      spineKey: String(cfg.spine || first.spine || 'dilaoQ'),
      forceDilaoQ: cfg.forceDilaoQ === true,
      aggroRadius: Math.max(1, Number(cfg.aggroRadius) || DUNGEON_COMBAT_CFG.enemyAggroRadius),
      speed: Math.max(0.5, Number(cfg.speed) || 2.5),
      fovAngle: Math.max(0.3, (Number(cfg.fovAngle) || DUNGEON_COMBAT_CFG.enemyFovDeg) * Math.PI / 180),
      facing: ({ front: Math.PI / 2, back: -Math.PI / 2, left: Math.PI, right: 0 })[String(cfg.facing || 'front')] ?? Math.PI / 2,
      chaseRange: Math.max((Number(cfg.aggroRadius) || DUNGEON_COMBAT_CFG.enemyAggroRadius) + DUNGEON_COMBAT_CFG.enemyChaseBonus, Number(cfg.chaseRange) || ((Number(cfg.aggroRadius) || DUNGEON_COMBAT_CFG.enemyAggroRadius) * 2)),
      patrolRange: Math.max(1, Number(cfg.patrolRange) || 3),
      closeRange: Math.max(0.5, Number(cfg.closeRange) || 1.5),
      patrolTimer: 0,
      loseTargetTimer: 0,
      sprite: null,
      visionSprite: null,
      alertSprite: null,
      lastTargetCol: -1, lastTargetRow: -1,
      state: 'chase', // 🎯 埋伏敌人出现即追击
      path: [],
      moveTimer: 0,
      aggroed: true, // 立即索敌
      defeated: false,
      headName: null,
    };
    enemies.push(e);
    playAlertSfx(); // 🚨 埋伏敌人出现即追击提示音
    createEnemySprite(e);
    count++;
  }
  if (count > 0) {
    // 🎯 让玩家保持在敌人之上
    if (playerSprite && playerSprite.parent) {
      try { playerSprite.parent.addChild(playerSprite); } catch (err) { }
    }
    ElMessage({ message: F('ambushFmt', { n: count }), type: 'warning', duration: 1800 });
  }
}

// 🎯 是否已接到指定任务（进行中或已完成均算"已接到"）
function hasDungeonTask(taskId) {
  if (!taskId) return true;
  const all = [...(user.allTasks?.mainTasks || []), ...(user.allTasks?.sideTasks || [])];
  return all.some(t => String(t.id) === String(taskId));
}

// 🖐️ 检测玩家附近是否有可互动的点（每帧调用：互动点 / NPC 聊天 / 宝箱打开）
function checkNearbyInteractable() {
  if (showInteractDialog.value || showSettle.value || showInv.value || showBag.value || user.pixi?.duihua) {
    nearInteractable.value = null;
    return;
  }
  // 🚪 刚进入地牢（未移动过）不检测互动按钮，移动一次后才开始检测
  if (!hasMovedAfterEnter) {
    nearInteractable.value = null;
    return;
  }
  // 1️⃣ 互动点（unlock/inspect/custom，矩形范围）
  for (const it of interactables) {
    if (it.once && it.triggered) continue;
    if (pCol >= it.col && pCol < it.col + it.w && pRow >= it.row && pRow < it.row + it.h) {
      nearInteractable.value = it;
      return;
    }
  }
  // 1.5️⃣ 采集点（同格，点击/空格开始采集，采集中锁定移动+惊扰周围魔物）
  for (const gp of gatherPoints) {
    if (gp.triggered) continue;
    if (gp.col === pCol && gp.row === pRow) {
      nearInteractable.value = { kind: 'gather', gp, title: gp.title || '⛏️ 采集', buttonText: '⛏️ 采集' };
      return;
    }
  }
  // 2️⃣ NPC 互动（同格触碰，右下角显示互动按钮，点击/空格才触发：聊天 或 商人交易）
  for (const npc of npcs) {
    const isMerchant = npc.merchant === true;
    if (!npc.dialogLoadData && !isMerchant) continue;
    if (isDungeonNight()) continue; // 🌙 天黑后 NPC 隐藏且不可对话
    if (npc.needTask && !hasDungeonTask(npc.needTask)) continue; // 🔒 任务门禁：未接到任务不可对话
    if (npc.col === pCol && npc.row === pRow) {
      console.log('[地牢NPC同格调试] spine=', npc.spineKey, 'col=', npc.col, 'row=', npc.row, '玩家=', pCol, pRow, 'loadData=', npc.dialogLoadData);
      if (!npc.bondRecorded) {
        user.addDungeonNpcToBond?.(npc); // 🏛️ 碰撞 NPC → 记录到羁绊系统（莫奇/里亚等）
        npc.bondRecorded = true;
      }
      nearInteractable.value = isMerchant
        ? { kind: 'npc', npc, title: L('npcTradeTitle'), buttonText: L('tradeBtn') }
        : { kind: 'npc', npc, title: npc.dialogName ? F('npcChatTitleFmt', { name: tr(npc.dialogName) }) : L('chatBtn'), buttonText: L('chatBtn') };
      return;
    }
  }
  // 2.5️⃣ 下楼入口 stairs（同格触碰，右下角显示进入按钮，点击/空格才进入下一层）
  if (stairsPoint && stairsPoint.col === pCol && stairsPoint.row === pRow) {
    nearInteractable.value = { kind: 'stairs', title: L('stairsEnterTitle'), buttonText: L('stairsEnterBtn') };
    return;
  }
  // 2.6️⃣ spawn 出生点（支持多个 spawn 点；仅勾选 showLeave=true 的点，玩家到达该格时显示"离开地牢"按钮）
  for (const sp of spawnPoints) {
    if (sp.showLeave === false) continue;
    if (sp.col === pCol && sp.row === pRow) {
      nearInteractable.value = { kind: 'spawn', title: L('leaveDungeonTitle'), buttonText: L('leaveBtn') };
      return;
    }
  }
  // 3️⃣ 宝箱打开（同格重叠，点击/空格才打开）
  for (const chest of chests) {
    if (!chest.visible || chest.opened) continue;
    if (chest.col === pCol && chest.row === pRow) {
      const needTxt = chest.needItem ? F('chestNeedFmt', { name: tr(chest.needItem), n: Number(chest.needItemNum) || 1 }) : '';
      nearInteractable.value = { kind: 'chest', chest, title: L('openChestTitle'), buttonText: needTxt ? F('openChestNeedFmt', { need: needTxt }) : L('openBtn') };
      return;
    }
  }
  nearInteractable.value = null;
}

// 💬 触发 NPC 对话（按条件路由选对话）
function emitNpcTalk(npc) {
  if (npc.needTask && !hasDungeonTask(npc.needTask)) return; // 🔒 任务门禁：未接到任务不触发对话
  // 🎒 莫奇带回里亚：liyaFound 且任务未完成 → 完成任务 + 播放重逢对话（双头像）
  if (npc.spineKey === 'shangren1' && user.getDialogueFlag('liyaFound') && !user.isTaskCompleted?.('find_liya')) {
    const r = user.completeTaskStep?.('find_liya', 'return');
    if (r?.taskCompleted) {
      user.setDialogueFlag('shangrenFavor', (user.getDialogueFlag('shangrenFavor') || 0) + 50);
      user.setDialogueFlag('liyaFavor', (user.getDialogueFlag('liyaFavor') || 0) + 50);
      user.setDialogueFlag('liyaTaskDoneDay', user.pixi?.player?.day ?? 1);
      user.syncDungeonNpcFavor?.();
      emitter.emit('talkToNpc', { loadData: npc.dialogLoadData, name: 'lyReunion1' });
      return;
    }
  }
  // 🗣️ 莫奇天气抱怨走 sr10 text（替换开场语）：把当前天气传给对话模块，由 sr10 text 决定是否抱怨
  if (npc.spineKey === 'shangren1') {
    user.setDialogueFlag('dungeonCurWeather', (currentWeather === 'snow' || currentWeather === 'rain' || currentWeather === 'fog') ? currentWeather : null);
    if (guideEnabled) guideDialogueActive = true; // 🧭 与莫奇的对话开始（结束才关闭指引）
  }
  let targetName = npc.dialogName;
  let silent = false;
  if (Array.isArray(npc.dialogRoute) && npc.dialogRoute.length > 0) {
    for (const step of npc.dialogRoute) {
      if (!matchDialogueCondition(step)) continue;
      targetName = step.name;
      silent = !!step.silent;
      break;
    }
  }
  console.log('[地牢NPC对话调试] spine=', npc.spineKey, 'loadData=', npc.dialogLoadData, 'target=', targetName, 'route=', JSON.stringify(npc.dialogRoute || []));
  if (targetName) {
    emitter.emit('talkToNpc', { loadData: npc.dialogLoadData, name: targetName, silent });
  }
}

// 📦 打开单个宝箱，获得物品
function openChest(chest) {
  if (!chest || chest.opened) return;
  // 🔑 解锁检查：需要指定物品时先遍历背包并消耗，数量不足则提示并阻止打开
  if (chest.needItem) {
    const needName = String(chest.needItem);
    const needNum = Number(chest.needItemNum) || 1;
    const inv = (user.inventory || []).find(i => i.name === needName);
    if (!inv || (inv.num || 0) < needNum) {
      ElMessage({ message: F('chestNeedItemFmt', { name: needName, n: needNum }), type: 'warning', duration: 2200 });
      playSfx('lock'); // 🔒 尝试打开被锁宝箱音效（不循环）
      return;
    }
    inv.num -= needNum;
    if (inv.num <= 0) {
      const idx = user.inventory.indexOf(inv);
      if (idx > -1) user.inventory.splice(idx, 1);
    }
  }
  chest.opened = true;
  playSfx('open'); // 🎁 成功打开宝箱音效（不循环）
  user.trackDungeonStat('chests', 1); // 🏆 打开宝箱（成就：宝箱收藏家）
  if (chest.fromTile) setChestTiles(chest, true); // 🧱 瓦片宝箱：切换为已开启瓦片（箱体+盖子）
  renderChests();
  // 🎁 统计本次开箱全部获得（道具 + 配方图纸），最后一条弹窗统一提示
  const gains = [];
  for (const item of chest.items) {
    const itemId = String(item.itemId || item.name || '');
    const num = Number(item.num) || 1;
    if (itemId) {
      user.addItemToInventory({ name: itemId, num });
      // 🎒 记录本次会话（左上角道具按钮 + 结算页展示）
      const itImg = resolveItemIcon(itemId);
      const ex = sessionItems.value.find(x => x.name === itemId);
      if (ex) { ex.num += num; }
      else sessionItems.value.push({ name: itemId, num, img: itImg });
      gains.push({ name: itemId, num, img: itImg });
    }
  }
  // 📜 宝箱有概率额外爆出未解锁的炼制配方图纸（使用可解锁；全部已解锁则不爆）
  const rcp = rollRecipeFromChest();
  if (rcp) {
    const rName = F('recipeNameFmt', { name: tr(rcp.name) });
    user.addItemToInventory({
      name: rName, num: 1, img: '', isItem: true, shiyong: true,
      special: 'lianzhiRecipe', recipeId: rcp.id, color: '#a78bfa',
      miaoshu: F('recipeDescFmt', { name: tr(rcp.name) }) + '\n' + (rcp.desc ? tr(rcp.desc) : ''),
    });
    const ex = sessionItems.value.find(x => x.name === rName);
    if (ex) ex.num += 1;
    else sessionItems.value.push({ name: rName, num: 1, img: '' });
    gains.push({ name: rName, num: 1, img: '' });
  }
  if (gains.length) showChestRewardTip(gains); // 📋 一条弹窗汇总所有获得
  saveDungeonState(); // 💾 保存宝箱打开状态
}

// 📜 宝箱概率爆出未解锁的炼制配方：默认 25% 概率，从未解锁配方中随机抽一个（可调 CHEST_RECIPE_CHANCE）
function rollRecipeFromChest() {
  const CHEST_RECIPE_CHANCE = 0.35; //配方概率
  if (Math.random() > user.luckProb(CHEST_RECIPE_CHANCE)) return null;
  const all = user.getLianzhiRecipes() || [];
  const locked = all.filter(r => !user.isLianzhiRecipeUnlocked(r.id));
  if (!locked.length) return null;
  return locked[Math.floor(Math.random() * locked.length)];
}

// 🖐️ 执行互动（点击按钮或按空格触发：互动点 / NPC 聊天 / 宝箱打开）
function handleInteract() {
  const it = nearInteractable.value;
  if (!it) return;
  // 🧑 NPC 互动：商人 → 打开商店；否则聊天
  if (it.kind === 'npc') {
    if (it.npc.merchant === true) {
      // 💰 商人交易：冻结地牢并打开商店（matter.vue 监听 openShop）
      dungeonPaused = true;
      emitter.emit('openShop');
    } else {
      emitNpcTalk(it.npc);
      npcTalkCooldown = 1.0; // 冷却，防止对话关闭后立即再次触发
    }
    nearInteractable.value = null;
    return;
  }
  // 📦 宝箱打开
  if (it.kind === 'chest') {
    openChest(it.chest);
    nearInteractable.value = null;
    return;
  }
  // ⛏️ 采集点：开始采集（进度条 + 锁定移动 + 惊扰周围魔物）
  if (it.kind === 'gather') {
    startGather(it.gp);
    nearInteractable.value = null;
    return;
  }
  // 🏰 下楼入口（点击/空格确认后进入下一层）
  if (it.kind === 'stairs') {
    goToNextLevel();
    nearInteractable.value = null;
    return;
  }
  // 🚪 spawn 出生点（点击/空格后打开结算页，确认后离开地牢）
  if (it.kind === 'spawn') {
    openSettle();
    nearInteractable.value = null;
    return;
  }
  // 🖐️ 互动点（unlock/inspect/custom）
  if (it.type === 'unlock') {
    // 解锁类型：检查背包是否有 requireItem
    const itemName = it.requireItem;
    if (!itemName) {
      ElMessage({ message: L('noNeedItemCfg'), type: 'warning', duration: 1500 });
      return;
    }
    const inv = user.inventory || [];
    const item = inv.find(i => i.name === itemName && (i.num ?? 1) > 0);
    if (!item) {
      ElMessage({ message: it.failMessage, type: 'warning', duration: 2000 });
      return;
    }
    // 消耗物品
    if (typeof user.removeInventoryItem === 'function') {
      user.removeInventoryItem(itemName, 1);
    } else {
      item.num = Math.max(0, (item.num ?? 1) - 1);
    }
    it.triggered = true;
    nearInteractable.value = null;
    ElMessage({ message: it.unlockMessage, type: 'success', duration: 2000 });
    // 🔐 如果配置了 sealId：隐藏对应 seal 图层并解封障碍物格子
    if (it.sealId) {
      unlockSealByInteract(it.sealId);
    }
    saveDungeonState(); // 保存互动状态
  } else {
    // inspect / custom：弹窗显示内容
    interactDialogData.value = { title: it.title, content: it.content };
    showInteractDialog.value = true;
    if (it.once) it.triggered = true;
    if (it.once) saveDungeonState();
  }
}

// ========== ⛏️ 采集点系统：站上去 → 右下角按钮 → 点击开始采集（进度条 + 锁定移动 + 惊扰周围魔物）→ 完成获得道具 ==========
function startGather(gp) {
  if (isGathering.value || !gp || gp.triggered) return;
  gatherCurrent = gp;
  gatherProgress.value = 0;
  isGathering.value = true;
  // 🚨 惊扰周围魔物：alertRadius 内的敌人立即进入追击（采集要冒险，边采边提防）
  alertEnemiesAround(gp.col, gp.row, gp.alertRadius || 5);
  playAlertSfx();
}
function alertEnemiesAround(c, r, radius) {
  for (const e of enemies) {
    if (e.defeated || e.inBattle) continue;
    const dc = Math.abs(e.col - c), dr = Math.abs(e.row - r);
    if (Math.sqrt(dc * dc + dr * dr) <= radius) {
      e.state = 'chase';
      e.aggroed = true;
    }
  }
}
function finishGather() {
  if (!gatherCurrent) return;
  const gp = gatherCurrent;
  isGathering.value = false;
  gatherProgress.value = 0;
  if (typeof user.addItemToInventory === 'function') {
    user.addItemToInventory({ name: gp.itemId, num: gp.num || 1 });
  }
  gp.triggered = true;
  hideGatherSprite(gp);
  gatherCurrent = null;
  ElMessage({ message: `⛏️ 采集完成：${gp.itemId} ×${gp.num || 1}`, type: 'success', duration: 2000 });
  saveDungeonState(); // 保存采集状态（once 采集点不再出现）
}
// ⛏️ 渲染采集点：发光圆点 + 可选物品图标（img 属性填图片 URL）
function renderGatherSprites() {
  if (gatherSpriteLayer) { try { mapContainer.removeChild(gatherSpriteLayer); } catch (e) { } try { gatherSpriteLayer.destroy({ children: true }); } catch (e) { } gatherSpriteLayer = null; }
  if (!mapContainer) return;
  gatherSpriteLayer = new Container();
  try { mapContainer.addChild(gatherSpriteLayer); } catch (e) { gatherSpriteLayer = null; return; }
  for (const gp of gatherPoints) {
    if (gp.triggered) continue;
    const g = new Graphics();
    g.circle(0, 0, tileW * 0.30).fill({ color: 0x4ade80, alpha: 0.22 });
    g.circle(0, 0, tileW * 0.15).fill({ color: 0x86efac, alpha: 0.65 });
    g.position.set((gp.col + 0.5) * tileW, (gp.row + 0.5) * tileH);
    gatherSpriteLayer.addChild(g);
    gp.sprite = g;
    if (gp.img) makeBoxSprite(gp.img, gp.col, gp.row, gatherSpriteLayer);
  }
}
function hideGatherSprite(gp) {
  if (gp.sprite) { try { gatherSpriteLayer?.removeChild(gp.sprite); } catch (e) { } try { gp.sprite.destroy(); } catch (e) { } gp.sprite = null; }
}

// 🔐 互动解锁封印：隐藏 seal_{sealId} 图层，并解封该图层所有格子的障碍物
function unlockSealByInteract(sealId) {
  // 1. 隐藏对应 seal 图层
  const layer = sealLayers[sealId];
  if (layer) {
    layer.visible = false;
    layer.alpha = 0;
    const hideChildren = (c) => {
      if (!c.children) return;
      for (const child of c.children) {
        child.visible = false;
        child.alpha = 0;
        hideChildren(child);
      }
    };
    hideChildren(layer);
  }
  // 2. 解封该图层所有格子的障碍物
  const cells = sealLayerCells[sealId] || [];
  for (const [c, r] of cells) {
    if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
    const key = c + ',' + r;
    // 只有其他封印区域仍锁定时才保持障碍，否则恢复可通行
    sealedCells.delete(key);
    let stillSealed = false;
    for (const z of sealZones) {
      if (z.triggered && !z.unlocked && z.sealCells.some(([cc, rr]) => cc === c && rr === r)) {
        stillSealed = true; break;
      }
    }
    if (!stillSealed) {
      for (const z of preSealedZones) {
        if (!z.unlocked && z.sealCells.some(([cc, rr]) => cc === c && rr === r)) {
          stillSealed = true; break;
        }
      }
    }
    if (!stillSealed && solidGrid && solidGrid[r]) solidGrid[r][c] = 0;
  }
}

// 🔐 应用互动点关联的 seal 层：未解锁的显示并封锁障碍物，已解锁的隐藏并解封
function applyInteractSeals() {
  for (const it of interactables) {
    if (!it.sealId) continue;
    if (it.triggered) {
      // 已解锁过：隐藏 seal 层 + 解封格子
      unlockSealByInteract(it.sealId);
    } else {
      // 未解锁：显示 seal 层 + 封锁格子为障碍物
      const layer = sealLayers[it.sealId];
      if (layer) {
        layer.visible = true;
        layer.alpha = 1;
        const showChildren = (c) => {
          if (!c.children) return;
          for (const child of c.children) {
            child.visible = true;
            child.alpha = 1;
            showChildren(child);
          }
        };
        showChildren(layer);
      }
      const cells = sealLayerCells[it.sealId] || [];
      for (const [c, r] of cells) {
        if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
        const key = c + ',' + r;
        if (sealedCells.has(key)) continue;
        sealedCells.add(key);
        if (solidGrid && solidGrid[r]) solidGrid[r][c] = 1;
      }
    }
  }
}

// 🚪 检查封印出口感应区：玩家进入后在指定格子添加障碍物墙壁
function trySealZone() {
  for (const z of sealZones) {
    if (z.once && z.triggered) continue;
    // 检查玩家是否在感应区矩形内
    if (pCol >= z.col && pCol < z.col + z.w && pRow >= z.row && pRow < z.row + z.h) {
      applySeal(z);
      return;
    }
  }
}

// 📦 渲染障碍物（pushable=木箱色）
// ========== 🖼️ 木箱/宝箱图片资源（代码渲染；图片放 public 下） ==========
// 待提供图片后填入 URL（如 '/daoju/xxx.png'）；留空时自动退回色块兜底
const BOX_IMAGES = {
  crate: muxiangImg,         // 📦 可推动木箱
  chestClosed: baoxiang1Img, // 🎁 未开启宝箱
  chestOpen: baoxiang2Img,   // 🎁 开启宝箱（箱体）
};
let obstacleSpriteLayer = null; // 🎨 木箱 Sprite 层
let chestSpriteLayer = null;    // 🎨 宝箱 Sprite 层
// 预加载木箱/宝箱图片，全部就绪后返回 true
async function ensureBoxImages() {
  const urls = [BOX_IMAGES.crate, BOX_IMAGES.chestClosed, BOX_IMAGES.chestOpen].filter(Boolean);
  if (!urls.length) return false;
  try { await Promise.all(urls.map(u => Assets.load(u))); return true; } catch (e) { return false; }
}
// 用图片创建 Sprite（底边对齐格子底部，保持图片比例占一格）
function makeBoxSprite(imgUrl, col, row, layer) {
  const sp = new Sprite(Texture.WHITE);
  sp.anchor.set(0.5, 1);
  sp.position.set((col + 0.5) * tileW, (row + 1) * tileH);
  sp.width = tileW; sp.height = tileH;
  layer.addChild(sp);
  Assets.load(imgUrl).then(tex => {
    if (sp.destroyed) return;
    sp.texture = tex;
    const r = tex.width / tex.height;
    if (r >= 1) { sp.width = tileW; sp.height = tileH / r; } else { sp.width = tileW * r; sp.height = tileH; }
  }).catch(() => { });
  return sp;
}
// 重建木箱 Sprite 层（图片渲染可推动木箱）；图片未配置时返回 false 退回色块
function rebuildObstacleSprites() {
  if (obstacleSpriteLayer) { try { mapContainer.removeChild(obstacleSpriteLayer); } catch (e) { } try { obstacleSpriteLayer.destroy({ children: true }); } catch (e) { } obstacleSpriteLayer = null; }
  if (!BOX_IMAGES.crate || !mapContainer) return false;
  obstacleSpriteLayer = new Container();
  try { mapContainer.addChild(obstacleSpriteLayer); } catch (e) { obstacleSpriteLayer = null; return false; }
  for (const ob of obstacles) {
    if (ob.type !== 'pushable') continue;
    makeBoxSprite(BOX_IMAGES.crate, ob.col, ob.row, obstacleSpriteLayer);
  }
  return true;
}
// 重建宝箱 Sprite 层（对象层宝箱；瓦片宝箱靠地图瓦片）。未开启 chestClosed / 开启 chestOpen
function rebuildChestSprites() {
  if (chestSpriteLayer) { try { mapContainer.removeChild(chestSpriteLayer); } catch (e) { } try { chestSpriteLayer.destroy({ children: true }); } catch (e) { } chestSpriteLayer = null; }
  if (!BOX_IMAGES.chestClosed || !mapContainer) return false;
  chestSpriteLayer = new Container();
  try { mapContainer.addChild(chestSpriteLayer); } catch (e) { chestSpriteLayer = null; return false; }
  for (const chest of chests) {
    if (chest.fromTile) continue; // 🧱 瓦片宝箱靠地图瓦片显示
    if (!chest.visible) continue;
    if (chest.opened) {
      if (BOX_IMAGES.chestOpen) makeBoxSprite(BOX_IMAGES.chestOpen, chest.col, chest.row, chestSpriteLayer);
    } else {
      makeBoxSprite(BOX_IMAGES.chestClosed, chest.col, chest.row, chestSpriteLayer);
    }
  }
  return true;
}
// ⚠️ obstacleGraphics 是 mapContainer 的子元素，mapContainer 已 scale.set(scale)，
//    所以这里用原始像素（tileW/tileH），不能再乘 scale，否则会被缩放两次导致位置偏移
function renderObstacles() {
  // 🖼️ 优先用 pengzhuang 木箱子瓦片纹理渲染；纹理未就绪时退回代码画图
  if (rebuildObstacleSprites()) { if (obstacleGraphics) { try { obstacleGraphics.clear(); } catch (e) { } } return; }
  if (!obstacleGraphics) {
    obstacleGraphics = new Graphics();
    mapContainer.addChild(obstacleGraphics);
  }
  obstacleGraphics.clear();
  const cellW = tileW;
  const cellH = tileH;
  for (const ob of obstacles) {
    if (ob.type !== 'pushable') continue;
    const x = ob.col * cellW;
    const y = ob.row * cellH;
    // 木箱：棕色填充 + 深色边框
    obstacleGraphics.rect(x + 2, y + 2, cellW - 4, cellH - 4);
    obstacleGraphics.fill(0x8B5A2B);
    obstacleGraphics.stroke({ width: 2, color: 0x5C3A1E });
    // 十字纹理
    obstacleGraphics.moveTo(x + 2, y + cellH / 2);
    obstacleGraphics.lineTo(x + cellW - 2, y + cellH / 2);
    obstacleGraphics.moveTo(x + cellW / 2, y + 2);
    obstacleGraphics.lineTo(x + cellW / 2, y + cellH - 2);
    obstacleGraphics.stroke({ width: 1, color: 0x5C3A1E });
  }
}

// 📦 检查指定格子是否有障碍物
function getObstacleAt(col, row) {
  return obstacles.find(ob => ob.col === col && ob.row === row) || null;
}

// 📦 检查指定格子是否阻挡移动（pushable 和 glass 都阻挡移动）
function isObstacleBlocking(col, row) {
  const ob = getObstacleAt(col, row);
  return !!ob;
}

// 📦 检查指定格子是否阻挡视野（pushable 阻挡，玻璃不阻挡）
function isObstacleBlockingSight(col, row) {
  const ob = getObstacleAt(col, row);
  return ob && ob.type === 'pushable';
}

// 🧑 创建所有 NPC spine 并播放动画
// 🏃 逃跑型 NPC 参数（tiled flee=true 的 NPC：玩家靠近会远离玩家移动）
const NPC_FLEE_RANGE = 3;    // 玩家距 NPC 3 格内开始逃跑（切比雪夫距离）
const NPC_FLEE_SPEED = 5;    // 逃跑移速（格/秒，默认 5；tiled 可用 npc.speed 覆盖）
async function createNpcSprites() {
  for (const npc of npcs) {
    try {
      let sprite = null;
      // 🎯 优先用 Tiled 里配置的 spineKey 创建（如 jinmao/huli/tuzi），失败再兜底用玩家 dilaoQ
      // 🧪 forceDilaoQ=true 时该 NPC 强制用 dilaoQ，忽略 spine 配置
      const wantSkel = npc.spineKey + '_skel';
      const wantAtlas = npc.spineKey + '_atlas';
      const hasSkel = Assets.cache.has(wantSkel);
      const hasAtlas = Assets.cache.has(wantAtlas);
      const useCustom = !npc.forceDilaoQ && npc.spineKey && npc.spineKey !== 'dilaoQ' && hasSkel && hasAtlas;

      if (useCustom) {
        try {
          sprite = new Spine({
            skeleton: wantSkel,
            atlas: wantAtlas,
            allowMissingRegions: true,
            autoUpdate: false,
          });
        } catch (e) {
          console.warn('[地牢NPC] 自定义spine创建失败，兜底dilaoQ:', npc.spineKey, e?.message);
          sprite = null;
        }
      }
      // 兜底：直接用 dilaoQ 的资源 key 创建（与玩家/敌人完全一致的创建路径，避免复用对象导致 bounds 异常）
      if (!sprite) {
        try {
          sprite = new Spine({ skeleton: 'dilaoQ_skel', atlas: 'dilaoQ_atlas', allowMissingRegions: true, autoUpdate: false });
        } catch (e2) {
          const playerSkelData = playerSprite?.skeleton?.data;
          const playerAtlas = playerSprite?.skeleton?.data?.atlas || playerSprite?.atlas;
          if (playerSkelData && playerAtlas) {
            sprite = new Spine({ skeleton: playerSkelData, atlas: playerAtlas, allowMissingRegions: true, autoUpdate: false });
          }
        }
      }
      // 设置皮肤：Tiled 配置的 skin 优先；dilaoQ 默认 head_front；
      // 自定义spine优先尝试head_front，不存在再自动选第一个非默认皮肤（默认皮肤通常空白）
      const isDilaoQ = !useCustom || npc.spineKey === 'dilaoQ';
      let npcSkin = npc.skin || (isDilaoQ ? 'head_front' : null);
      if (!isDilaoQ && !npcSkin && sprite.skeleton?.data?.skins) {
        const skins = sprite.skeleton.data.skins;
        // 优先尝试 head_front 皮肤
        const headFrontSkin = skins.find(s => s.name === 'head_front');
        if (headFrontSkin) {
          npcSkin = 'head_front';
        } else {
          // 没有 head_front 则自动用第一个非默认皮肤（skins[0]通常是默认空皮肤）
          const autoSkin = skins.length > 1 ? skins[1] : skins[0];
          if (autoSkin) npcSkin = autoSkin.name;
        }

      }
      if (npcSkin && sprite.skeleton?.setSkinByName) {
        try {
          sprite.skeleton.setSkin(null);
          sprite.skeleton.setSkinByName(npcSkin);
          try { sprite.skeleton.setSlotsToSetupPose(); } catch (e) { }
        } catch (e) { /* 皮肤不存在则静默 */ }
      }
      // 播放动画：
      // - isHead + isDilaoQ：不播动画，只切换皮肤（dilaoQ setup pose 有内容）
      // - isHead + 自定义spine：播一次动画（配置的animation优先，否则自动用第一个动画），不循环——自定义spine的setup pose通常空白
      // - 非isHead：按 Tiled 配置的 animation + loop 循环播放
      if (sprite.state?.setAnimation) {
        if (npc.isHead && !isDilaoQ) {
          // 自动检测动画名：配置优先，否则用 skeleton 里第一个动画
          const anims = sprite.skeleton?.data?.animations || [];
          const anim = npc.animation || (anims.length > 0 ? anims[0].name : null);
          if (anim) {
            try { sprite.state.setAnimation(0, anim, false); } catch (e) { console.warn('[地牢NPC] 动画不存在:', anim); }
          }
        } else if (!npc.isHead && npc.animation) {
          try { sprite.state.setAnimation(0, npc.animation, npc.loop); } catch (e) { console.warn('[地牢NPC] 动画不存在:', npc.animation); }
        }
      }
      // update 一次驱动动画第一帧 / setup pose + 皮肤渲染（必须在缩放计算之前，确保 bounds 有值）
      sprite.update(0.05);
      sprite.update(0.05);
      // 按目标宽度自适应缩放：宽度固定一格（tileW*scale），高度等比自适应（cover，不压扁）
      try {
        applySpineHeadScale(sprite, tileW * scale * (npc.scale ?? 1), npcSkin || 'head_front', isDilaoQ);
      } catch (e) { sprite.scale.set(npc.scale || 1); }
      sprite.update(0.05);
      sprite.x = mapOffsetX + npc.px;
      sprite.y = mapOffsetY + npc.py;
      app.stage.addChild(sprite);
      npc.sprite = sprite;
      // 🔁 等纹理就绪后补算 NPC 头像尺寸（与玩家/敌人一致），避免 getLocalBounds 时机导致尺寸错乱
      if (typeof sprite.skeleton?.setSkinByName === 'function') {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!npc.sprite) return;
          try {
            applySpineHeadScale(npc.sprite, tileW * scale * (npc.scale ?? 1), npcSkin || 'head_front', isDilaoQ);
            npc.sprite.update(0.05);
          } catch (err) { }
        }));
      }

    } catch (err) {
      console.warn('[地牢NPC] 创建失败:', npc.spineKey, err);
    }
  }
  // 玩家保持在 NPC 之上
  if (playerSprite && playerSprite.parent) {
    try { playerSprite.parent.addChild(playerSprite); } catch (err) { }
  }
}

// 🧑 NPC 按移动方向切换皮肤（与玩家/敌人一致：head_front/left/right/back；自定义 spine 无对应皮肤则静默）
function applyNpcHead(npc, name) {
  const sprite = npc.sprite;
  if (!sprite || typeof sprite.skeleton?.setSkinByName !== 'function') return;
  if (npc.headName === name) return;
  npc.headName = name;
  try {
    sprite.skeleton.setSkin(null);
    sprite.skeleton.setSkinByName(name);
    try { sprite.skeleton.setSlotsToSetupPose(); } catch (e) { }
    sprite.update(0.05);
  } catch (err) { /* 皮肤不存在则静默 */ }
}

// 🧭 刷新指引路径：玩家当前位置 → 当前指引目标（A* 最短路线，不含起点）
function refreshGuidePath() {
  if (!guideEnabled || !solidGrid || !guideTarget) return;
  const path = findPath(pCol, pRow, guideTarget.col, guideTarget.row);
  guidePath = Array.isArray(path) && path.length ? path : [];
}

// 🎨 绘制指引路径（主地图：淡金色发光节点 + 连线 + 目标光圈；坐标随镜头，ticker 每帧重绘）
function renderGuidePath() {
  if (!guideGraphics) return;
  guideGraphics.clear();
  if (!guideEnabled || !guidePath.length) return;
  const pts = [{ col: pCol, row: pRow }, ...guidePath];
  // 🧭 已贴合目标（路径只剩 1 段）→ 不显示任何路径元素，避免脚下露出光点
  if (pts.length <= 2) return;
  const cx = c => mapOffsetX + (c + 0.5) * tileW * scale;
  const cy = r => mapOffsetY + (r + 0.5) * tileH * scale;
  guideGraphics.moveTo(cx(pts[0].col), cy(pts[0].row));
  for (let i = 1; i < pts.length; i++) guideGraphics.lineTo(cx(pts[i].col), cy(pts[i].row));
  guideGraphics.stroke({ width: Math.max(3, tileW * scale * 0.1), color: 0xffd98c, alpha: 0.55 });
  for (const p of pts) {
    guideGraphics.circle(cx(p.col), cy(p.row), Math.max(3, tileW * scale * 0.16)).fill({ color: 0xffe9b8, alpha: 0.95 });
  }
  const t = pts[pts.length - 1];
  guideGraphics.circle(cx(t.col), cy(t.row), Math.max(8, tileW * scale * 0.42)).stroke({ width: 3, color: 0xffd98c, alpha: 0.95 });
}

// 🧭 关闭指引（与莫奇对话完成后）
function closeGuidePath() {
  guideEnabled = false;
  guidePath = [];
  guideHintShow.value = false;
  if (guideGraphics) { try { guideGraphics.clear(); } catch (e) { } }
}

// 🧭 阶段2：首遇莫奇对话结束（xmEnd）→ 指引切换为「前往安全点」（spawn 复活点）
function switchGuideToSpawn() {
  if (!spawnPoint) return;
  guideStage = 2;
  guideTarget = { col: spawnPoint.col, row: spawnPoint.row };
  guideEnabled = true;
  guideHintShow.value = true;
  guideHintKey.value = 'guideHintNext';
  refreshGuidePath();
}

// 🧑 销毁所有 NPC spine
function destroyNpcs() {
  for (const npc of npcs) {
    if (npc.sprite) {
      try { app.stage.removeChild(npc.sprite); } catch (e) { }
      try { npc.sprite.destroy(); } catch (e) { }
      npc.sprite = null;
    }
  }
  npcs = [];
}
// 🎯 对话 moveNpcOnEnd：把指定 tiled npc（npcId=对象id）移动到目标格
function onDialogueMoveNpc(list) {
  if (!Array.isArray(list)) return;
  for (const cfg of list) {
    if (!cfg || cfg.npcId == null || cfg.col == null || cfg.row == null) continue;
    // 🚶 特殊值 col=-1 且 row=-1：移动到玩家面前（玩家下方格；不可行走则上方格）
    let _tCol = cfg.col, _tRow = cfg.row;
    if (cfg.col === -1 && cfg.row === -1) {
      _tCol = pCol; _tRow = pRow + 1;
      if (!isWalkable(_tCol, _tRow)) _tRow = pRow - 1;
    }
    const npc = npcs.find(n => n.id === cfg.npcId);
    if (!npc) { console.warn('[地牢] moveNpcOnEnd 未找到 npc id=' + cfg.npcId); continue; }
    // 若目标格不可行走，回退到最近可走格
    let tc = Math.round(_tCol), tr = Math.round(_tRow);
    if (!isWalkable(tc, tr)) {
      let fallback = null;
      for (let r2 = 0; r2 <= 2 && !fallback; r2++) {
        for (let dc = -r2; dc <= r2 && !fallback; dc++) {
          for (let dr = -r2; dr <= r2 && !fallback; dr++) {
            if (isWalkable(tc + dc, tr + dr)) fallback = { col: tc + dc, row: tr + dr };
          }
        }
      }
      if (fallback) { tc = fallback.col; tr = fallback.row; }
    }
    if (cfg.teleport) {
      // 🌀 传送：瞬间移动到目标格（不走路）
      npc.col = tc; npc.row = tr;
      npc.px = (tc + 0.5) * tileW * scale;
      npc.py = (tr + 0.5) * tileH * scale;
      npc.moveTarget = null; npc.moveSpeed = null;
      npc.fleeTarget = null;
      if (npc.sprite) { npc.sprite.x = mapOffsetX + npc.px; npc.sprite.y = mapOffsetY + npc.py; }
      continue;
    }
    npc.moveTarget = { col: tc, row: tr };
    npc.moveSpeed = Math.max(0.5, Number(cfg.speed) || (npc.speed || NPC_FLEE_SPEED));
    npc.fleeTarget = null; // 命令移动期间暂停逃跑
  }
}

// 🆕 生成型 NPC：按 Tiled npc 同款流程创建 spine（供 spawnNpcsOnEnd 使用）
async function spawnNpcSprite(npc) {
  try {
    let sprite = null;
    const wantSkel = npc.spineKey + '_skel';
    const wantAtlas = npc.spineKey + '_atlas';
    const hasSkel = Assets.cache.has(wantSkel);
    const hasAtlas = Assets.cache.has(wantAtlas);
    const useCustom = !npc.forceDilaoQ && npc.spineKey && npc.spineKey !== 'dilaoQ' && hasSkel && hasAtlas;
    if (useCustom) {
      try { sprite = new Spine({ skeleton: wantSkel, atlas: wantAtlas, allowMissingRegions: true, autoUpdate: false }); }
      catch (e) { sprite = null; }
    }
    if (!sprite) {
      try { sprite = new Spine({ skeleton: 'dilaoQ_skel', atlas: 'dilaoQ_atlas', allowMissingRegions: true, autoUpdate: false }); }
      catch (e2) { const pSd = playerSprite?.skeleton?.data; const pA = playerSprite?.skeleton?.data?.atlas || playerSprite?.atlas; if (pSd && pA) sprite = new Spine({ skeleton: pSd, atlas: pA, allowMissingRegions: true, autoUpdate: false }); }
    }
    const isDilaoQ = !useCustom || npc.spineKey === 'dilaoQ';
    let npcSkin = npc.skin || (isDilaoQ ? 'head_front' : null);
    if (!isDilaoQ && !npcSkin && sprite.skeleton?.data?.skins) {
      const skins = sprite.skeleton.data.skins;
      const headFrontSkin = skins.find(s => s.name === 'head_front');
      if (headFrontSkin) npcSkin = 'head_front';
      else { const autoSkin = skins.length > 1 ? skins[1] : skins[0]; if (autoSkin) npcSkin = autoSkin.name; }
    }
    if (npcSkin && sprite.skeleton?.setSkinByName) {
      try { sprite.skeleton.setSkin(null); sprite.skeleton.setSkinByName(npcSkin); try { sprite.skeleton.setSlotsToSetupPose(); } catch (e) { } } catch (e) { }
    }
    if (sprite.state?.setAnimation) {
      if (npc.isHead && !isDilaoQ) {
        const anims = sprite.skeleton?.data?.animations || [];
        const anim = npc.animation || (anims.length > 0 ? anims[0].name : null);
        if (anim) { try { sprite.state.setAnimation(0, anim, false); } catch (e) { } }
      } else if (!npc.isHead && npc.animation) {
        try { sprite.state.setAnimation(0, npc.animation, npc.loop !== false); } catch (e) { }
      }
    }
    sprite.update(0.05);
    sprite.update(0.05);
    try { applySpineHeadScale(sprite, tileW * scale * (npc.scale ?? 1), npcSkin || 'head_front', isDilaoQ); } catch (e) { sprite.scale.set(npc.scale || 1); }
    sprite.update(0.05);
    sprite.x = mapOffsetX + npc.px;
    sprite.y = mapOffsetY + npc.py;
    app.stage.addChild(sprite);
    npc.sprite = sprite;
    if (typeof sprite.skeleton?.setSkinByName === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!npc.sprite) return;
        try { applySpineHeadScale(npc.sprite, tileW * scale * (npc.scale ?? 1), npcSkin || 'head_front', isDilaoQ); npc.sprite.update(0.05); } catch (err) { }
      }));
    }
  } catch (err) {
    console.warn('[地牢NPC] 生成创建失败:', npc.spineKey, err);
    return null;
  }
  return npc.sprite;
}

// 🆕 对话 spawnNpcsOnEnd → 生成 npc 到指定格（支持单条/数组批量）
let _npcSpawnSeq = 0;
function onDialogueSpawnNpc(list) {
  if (!Array.isArray(list)) return;
  for (const cfg of list) {
    if (!cfg || cfg.col == null || cfg.row == null) continue;
    let tc = Math.round(cfg.col), tr = Math.round(cfg.row);
    if (!isWalkable(tc, tr)) {
      let fb = null;
      for (let r2 = 0; r2 <= 2 && !fb; r2++) {
        for (let dc = -r2; dc <= r2 && !fb; dc++) {
          for (let dr = -r2; dr <= r2 && !fb; dr++) {
            if (isWalkable(tc + dc, tr + dr)) fb = { col: tc + dc, row: tr + dr };
          }
        }
      }
      if (fb) { tc = fb.col; tr = fb.row; }
    }
    const npc = {
      col: tc, row: tr,
      id: -1 - (++_npcSpawnSeq), // 负数 id，不与 Tiled 对象 id 冲突；后续可用该 id 配合 moveNpcOnEnd
      px: (tc + 0.5) * tileW * scale,
      py: (tr + 0.5) * tileH * scale,
      spineKey: String(cfg.spineKey || 'NPCQ'),
      scale: Math.max(0.1, Number(cfg.scale) || 1),
      animation: cfg.animation ? String(cfg.animation) : null,
      loop: cfg.loop !== false,
      skin: cfg.skin ? String(cfg.skin) : null,
      isHead: cfg.isHead === true,
      speed: Math.max(0.5, Number(cfg.speed) || 5),
      flee: cfg.flee === true,
      fleeRange: Math.max(1, Number(cfg.fleeRange) || 3),
      fleeStuck: 0,
      forceDilaoQ: cfg.forceDilaoQ === true,
      merchant: cfg.merchant === true,
      needTask: cfg.needTask ? String(cfg.needTask) : null,
      dialogLoadData: cfg.dialogLoadData ? String(cfg.dialogLoadData) : null,
      dialogName: cfg.dialogName ? String(cfg.dialogName) : null,
      dialogRoute: Array.isArray(cfg.dialogRoute) ? cfg.dialogRoute : [],
      sprite: null,
      moveTarget: null,
      fleeTarget: null,
    };
    npcs.push(npc);
    spawnNpcSprite(npc);
  }
}

// 🆕 对话 spawnEnemiesOnEnd → 生成敌人到指定格（对齐 tiled enemy 结构，支持单条/数组批量）
let _enemySpawnSeq = 0;
function onDialogueSpawnEnemy(list) {
  if (!Array.isArray(list)) return;
  for (const cfg of list) {
    if (!cfg || cfg.col == null || cfg.row == null) continue;
    let tc = Math.round(cfg.col), tr = Math.round(cfg.row);
    if (!isWalkable(tc, tr)) {
      let fb = null;
      for (let r2 = 0; r2 <= 2 && !fb; r2++) {
        for (let dc = -r2; dc <= r2 && !fb; dc++) {
          for (let dr = -r2; dr <= r2 && !fb; dr++) {
            if (isWalkable(tc + dc, tr + dr)) fb = { col: tc + dc, row: tr + dr };
          }
        }
      }
      if (fb) { tc = fb.col; tr = fb.row; }
    }
    // enemies 配置数组：cfg.enemies 优先（对齐 tiled 多敌人），否则用简写字段包装为单个
    let enemiesCfg = Array.isArray(cfg.enemies) && cfg.enemies.length ? cfg.enemies : null;
    if (!enemiesCfg) {
      enemiesCfg = [{
        name: cfg.name || t('enemyFallbackName'),
        hp: cfg.hp, attack: cfg.attack, armor: cfg.armor, exp: cfg.exp, baseExp: cfg.baseExp,
        spine: cfg.spine || 'dilaoQ',
        speed: cfg.battleSpeed,
      }];
      if (enemiesCfg[0].hp == null && enemiesCfg[0].attack == null && !cfg.spine) continue;
    }
    const first = enemiesCfg[0];
    const e = {
      id: 'spawn' + (++_enemySpawnSeq), // 🆕 生成型敌人 id（字符串，不与 tiled 数字 id 冲突）
      spawnCol: tc, spawnRow: tr, col: tc, row: tr,
      px: (tc + 0.5) * tileW * scale,
      py: (tr + 0.5) * tileH * scale,
      enemies: enemiesCfg,
      displayName: String(first.name || t('enemyFallbackName')),
      dropRates: Array.isArray(cfg.dropRates) ? cfg.dropRates : [],
      spineKey: String(cfg.spineKey || first.spine || 'dilaoQ'),
      forceDilaoQ: cfg.forceDilaoQ === true,
      scale: Math.max(0.1, Number(cfg.scale) || 1),
      flee: cfg.flee === true,
      fleeRange: Math.max(1, Number(cfg.fleeRange) || 3),
      isShadow: cfg.isShadow === true || ['monster1', 'daanyingguai'].includes(String(cfg.spineKey || first.spine || '').trim().toLowerCase()),
      aggroRadius: Math.max(1, Number(cfg.aggroRadius) || 5),
      speed: Math.max(0.5, Number(cfg.speed) || 2.5),
      fovAngle: Math.max(0.3, (Number(cfg.fovAngle) || 120) * Math.PI / 180),
      facing: ({ front: Math.PI / 2, back: -Math.PI / 2, left: Math.PI, right: 0 })[String(cfg.facing || 'front')] ?? Math.PI / 2,
      chaseRange: Math.max((Number(cfg.aggroRadius) || 5) + 2, Number(cfg.chaseRange) || ((Number(cfg.aggroRadius) || 5) * 2)),
      patrolRange: Math.max(1, Number(cfg.patrolRange) || 3),
      closeRange: Math.max(0.5, Number(cfg.closeRange) || 1.5),
      patrolTimer: 0, loseTargetTimer: 0,
      sprite: null, visionSprite: null, alertSprite: null,
      lastTargetCol: -1, lastTargetRow: -1, state: "patrol", path: [], moveTimer: 0,
      aggroed: false, defeated: false, headName: null,
      dialogAfterBattle: cfg.dialogAfterBattle === true,
      noRespawn: cfg.noRespawn === true,
      dialogBeforeBattle: cfg.dialogBeforeBattle === true,
      dialogLoadData: cfg.dialogLoadData ? String(cfg.dialogLoadData) : null,
      dialogName: cfg.dialogName ? String(cfg.dialogName) : null,
      dialogRoute: Array.isArray(cfg.dialogRoute) ? cfg.dialogRoute : [],
      dropItems: Array.isArray(cfg.dropItems) ? cfg.dropItems : [],
    };
    enemies.push(e);
    createEnemySprite(e);
  }
}


// 🚶 移除里亚 NPC（对话完成后隐藏；spineKey=shangren2）
function removeLiyaNpc() {
  for (let i = npcs.length - 1; i >= 0; i--) {
    const npc = npcs[i];
    if (npc.spineKey === 'shangren2') {
      if (npc.sprite) {
        try { app.stage.removeChild(npc.sprite); } catch (e) { }
        try { npc.sprite.destroy(); } catch (e) { }
        npc.sprite = null;
      }
      npcs.splice(i, 1);
    }
  }
}
// 👾 创建敌人 spine（暂时统一用 dilaoQ，spineKey 属性保留后续替换）
// 🎖️ 地牢怪物等级：Tiled enemies 数组第一项可配 level（基准等级）覆盖，未配置继承怪物编辑 level，再加层数加成
function getEnemyLevel(e) {
  const first = Array.isArray(e.enemies) ? e.enemies[0] : null;
  const spine = e.spineKey || (first && first.spine) || 'monster1';
  // 等级兜底：Tiled 配置 level 优先，非数字/缺失回退怪物基础等级，杜绝 NaN
  let baseLv = monsterConfigs[spine]?.level ?? 1;
  if (first && first.level != null) {
    const n = Number(first.level);
    if (Number.isFinite(n)) baseLv = n;
  }
  const floorBonus = (Number(currentLevel.value) || 1) - 1;
  // 🎭 本层事件类型加成：强敌层 +2 级、首领层 +5 级（战斗/事件不加成）
  const typeBonus = dungeonRouteType === 'elite' ? 2 : dungeonRouteType === 'boss' ? 5 : dungeonRouteType === 'event' ? -1 : 0; // ❓ 事件层敌人 -1 级（事件收益换低风险）
  // 📅 天数加成：每过一天地牢怪物等级 +1（主线任务「邪魔苏醒」第 15 天迎击）
  const dayBonus = ((Number(user.pixi?.player?.day) || 1) - 1) * (DUNGEON_ENEMY_LEVEL_PER_DAY || 1);
  return Math.max(1, Math.round(baseLv + floorBonus * (DUNGEON_ENEMY_LEVEL_PER_FLOOR || 1) + dayBonus + typeBonus));
}

// 🎨 危险程度颜色（按怪物等级 − 玩家等级差）
function enemyDangerColor(level) {
  const plv = user.pixi?.player?.Level ?? 1;
  const diff = (level ?? 1) - plv;
  if (diff <= -3) return 0x7ee787;  // 绿：远低于玩家
  if (diff <= 0) return 0xfde68a;   // 黄：同级或略低
  if (diff <= 2) return 0xfb923c;   // 橙：略高于玩家
  if (diff <= 4) return 0xf87171;   // 红：危险
  return 0xdc2626;                  // 深红：极危
}

// 🏷️ 创建怪物头顶等级文字（挂在 stage 上，移动时用 syncEnemyLvText 同步位置）
function createEnemyLvText(e, offsetY) {
  if (e.lvText || !app) return;
  const lv = getEnemyLevel(e);
  e.level = lv;
  const offY = offsetY ?? -tileH * scale * 1.05;
  try {
    const txt = new Text('Lv.' + lv, {
      fontSize: Math.max(11, Math.round(tileH * scale * 0.42)),
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: enemyDangerColor(lv),
      stroke: { color: 0x000000, width: 3 },
      align: 'center',
    });
    txt.anchor.set(0.5, 1);
    txt.x = mapOffsetX + e.px;
    txt.y = mapOffsetY + e.py + offY;
    app.stage.addChild(txt);
    e.lvText = txt;
    e.lvTextOffsetY = offY;
  } catch (err) { e.lvText = null; }
}

function syncEnemyLvText(e) {
  if (e.lvText) {
    e.lvText.x = mapOffsetX + e.px;
    e.lvText.y = mapOffsetY + e.py + (e.lvTextOffsetY ?? -tileH * scale * 1.05);
  }
}

function destroyEnemyLvText(e) {
  if (e.lvText) {
    try { app?.stage?.removeChild(e.lvText); } catch (err) { }
    try { e.lvText.destroy({ children: true }); } catch (err) { }
    e.lvText = null;
  }
}

function createEnemySprite(e) {
  if (!app) return;
  // 🐰 黑米被动「地图凝视」：所有敌人必经此函数创建 sprite，统一打索敌角度减半标记
  e.fovHalved = user.getNpcAlly?.() === 'tuzi';
  // 🦅 雷鸟：行走头像 spine=leiniaofu（tiled 对象层），战斗 spine=guaiwu3（enemies 数组内）
  //    → 两者都认：索敌范围缩小 25% + 无视障碍物视线/移动
  if (e.spineKey === 'leiniaofu') {
    e.sightScale = LEINIAOFU_SIGHT_SCALE; // 🦅 雷鸟索敌半径/角度倍率（config 统一调整），且无视障碍物索敌
    e.ignoreSightBlock = true;
    e.fovAngle = (e.fovAngle || (120 * Math.PI / 180)) * LEINIAOFU_FOV_MULT; // 🦅 索敌角度倍率（config 统一调整）
  }
  let sprite = null;
  // ⚠️ 提升到 try 外：供下方 isEnemyDilaoQ 计算访问（否则 "useCustom is not defined"）
  let useCustom = false;
  try {
    // 🎯 forceDilaoQ=false 时优先用 Tiled 配置的 spineKey 创建（如自定义怪物），失败再兜底
    const wantSkel = e.spineKey + '_skel';
    const wantAtlas = e.spineKey + '_atlas';
    const hasSkel = Assets.cache.has(wantSkel);
    const hasAtlas = Assets.cache.has(wantAtlas);
    useCustom = !e.forceDilaoQ && e.spineKey && e.spineKey !== 'dilaoQ' && hasSkel && hasAtlas;
    console.log('[地牢敌人]', e.displayName, 'spineKey=', e.spineKey, 'forceDilaoQ=', e.forceDilaoQ, 'hasSkel=', hasSkel, 'hasAtlas=', hasAtlas, 'useCustom=', useCustom);
    if (useCustom) {
      try {
        sprite = new Spine({ skeleton: wantSkel, atlas: wantAtlas, allowMissingRegions: true, autoUpdate: false });
      } catch (e2) {
        console.warn('[地牢敌人] 自定义spine创建失败，兜底dilaoQ:', e.spineKey, e2?.message);
        sprite = null;
      }
    }
    // 兜底：直接用 dilaoQ 的资源 key 创建（与玩家/NPC 完全一致的创建路径）。
    //  ⚠️ 不能复用玩家 skeletonData/atlas 对象——Spine.createOptions 会用 Assets.get(obj) 按对象当 key 查缓存，
    //     拿到的 atlas/骨骼解析异常会导致 getLocalBounds 返回错误 bounds → 头像大一圈。
    if (!sprite) {
      try {
        sprite = new Spine({ skeleton: 'dilaoQ_skel', atlas: 'dilaoQ_atlas', allowMissingRegions: true, autoUpdate: false });
      } catch (e2) {
        console.warn('[地牢敌人] dilaoQ资源创建失败，二次复用玩家对象兜底:', e2?.message);
        const playerSkelData = playerSprite?.skeleton?.data;
        const playerAtlas = playerSprite?.skeleton?.data?.atlas || playerSprite?.atlas;
        if (playerSkelData && playerAtlas) {
          sprite = new Spine({ skeleton: playerSkelData, atlas: playerAtlas, allowMissingRegions: true, autoUpdate: false });
        }
      }
    }
  } catch (err) {
    console.error('[地牢敌人] Spine构造失败:', err);
  }
  if (sprite) {
    const isEnemyDilaoQ = !useCustom || e.spineKey === 'dilaoQ';
    try {
      if (isEnemyDilaoQ) {
        // dilaoQ：head_front 是皮肤名（不是动画名），只切换皮肤，不播放动画
        //  ⚠️ 不能 setAnimation——dilaoQ 存在名为 'animation' 的动画，若误触发会按动画姿态取 bounds，
        //     导致 getLocalBounds 变大 → 头像大一圈。这里与 NPC 一致：仅 setSkinByName + setupPose。
        try { sprite.skeleton.setSkin(null); } catch (err) { }
        try { sprite.skeleton.setSkinByName('head_front'); } catch (err) { }
        try { sprite.skeleton.setSlotsToSetupPose(); } catch (err) { }
      } else {
        // 自定义spine：优先尝试head_front皮肤，不存在再自动选第一个非默认皮肤 + 第一个动画
        let enemySkin = null;
        if (sprite.skeleton?.data?.skins) {
          const skins = sprite.skeleton.data.skins;
          const headFrontSkin = skins.find(s => s.name === 'head_front');
          if (headFrontSkin) {
            enemySkin = 'head_front';
          } else {
            const autoSkin = skins.length > 1 ? skins[1] : skins[0];
            if (autoSkin) enemySkin = autoSkin.name;
          }
        }
        if (enemySkin && sprite.skeleton?.setSkinByName) {
          try {
            sprite.skeleton.setSkin(null);
            sprite.skeleton.setSkinByName(enemySkin);
            try { sprite.skeleton.setSlotsToSetupPose(); } catch (err) { }
          } catch (err) { }
        }
        const anims = sprite.skeleton?.data?.animations || [];
        if (anims.length > 0) {
          try { sprite.state.setAnimation(0, anims[0].name, false); } catch (err) { }
        }
      }
      sprite.update(0.05);
      // 🎯 敌人头像尺寸统一：独立用 getLocalBounds 宽度基准（与玩家/NPC 完全一致）。
      //    ⚠️ 不能复制玩家 scale——玩家创建时若纹理未就绪 scale 暂时=1，复制会让敌人全体巨大。
      //    dilaoQ 渲染宽度 51.2（64×atlas scale 0.8）；DLanying 渲染宽度 64（无 scale）。
      //    下方双 rAF 纹理就绪后再用 applySpineHeadScale 精修。
      {
        const th = tileW * scale;
        const fb = sprite.getLocalBounds();
        // ⚠️ 实测 dilaoQ/DLanying 的 getLocalBounds 均返回 64（spine-pixi-v8 渲染不乘 atlas scale 0.8），
        //    因此兜底统一用 64（dilaoQ 不能用 51.2，否则纹理未就绪时 scale=41.6/51.2=0.81 偏大）
        const w = (isFinite(fb.width) && fb.width > 0) ? fb.width : 64;
        sprite.scale.set(th / w, th / w);
      }
      sprite.update(0.05);
    } catch (err) {
      console.warn('[地牢敌人] 皮肤设置失败:', err?.message);
      sprite.scale.set(0.9);
    }
  } else {
    const size = tileW * scale * 0.8;
    sprite = new Graphics();
    sprite.rect(-size / 2, -size / 2, size, size);
    sprite.fill(0xff3333);
    sprite.stroke({ width: 2, color: 0xffffff });
  }
  sprite.x = mapOffsetX + e.px;
  sprite.y = mapOffsetY + e.py;
  // 🕳️ 敌人软影（放软影层，位于角色之下）
  app.stage.addChild(sprite);
  e.sprite = sprite;
  // 🏷️ 怪物头顶等级 + 危险程度颜色
  createEnemyLvText(e);
  // 🌕 血月：给敌人头像加红色恐怖滤镜（红色发光 + 压暗），让敌人显得更诡异
  if (currentWeather === 'bloodmoon') {
    try {
      e.bloodFilter = new GlowFilter({ color: 0xff2020, outerStrength: 3, innerStrength: 1.2, distance: 14, quality: 0.15 });
      sprite.filters = [e.bloodFilter];
    } catch (err) { e.bloodFilter = null; }
  }
  // 👁️ 索敌范围可视化（近身圆形 + 扇形）
  e.visionSprite = new Graphics();
  drawEnemyVision(e);
  e.visionSprite.x = mapOffsetX + e.px;
  e.visionSprite.y = mapOffsetY + e.py;
  app.stage.addChild(e.visionSprite);
  // 敌人 sprite 移到索敌范围之上
  if (sprite.parent) sprite.parent.addChild(sprite);
  // ❗ 追击红色感叹号（纯红色感叹号，无圆形背景）
  try {
    const ag = new Graphics();
    const r = Math.max(16, tileW * scale * 0.4);
    ag.rect(-r * 0.13, -r * 0.55, r * 0.26, r * 0.62).fill({ color: 0xff2222 });
    ag.circle(0, r * 0.3, r * 0.15).fill({ color: 0xff2222 });
    ag.visible = false;
    ag.x = mapOffsetX + e.px;
    ag.y = mapOffsetY + e.py - tileW * scale * 0.8;
    app.stage.addChild(ag);
    e.alertSprite = ag;
  } catch (err) { e.alertSprite = null; }
  if (typeof sprite.skeleton?.setSkinByName === 'function') {
    // 🔁 敌人头像双 rAF 修正：宽度固定一格（tileW*scale），高度等比自适应。
    //    若纹理未就绪 getLocalBounds().width 为 0 则每帧重试，直到成功，避免敌人头像巨大
    const tryFixEnemyHead = () => {
      if (!e.sprite || typeof e.sprite.skeleton?.setSkinByName !== 'function') return;
      try {
        // 内部重新计算 isDilaoQ（避免闭包变量作用域问题）
        const isDilaoQHere = !e.forceDilaoQ ? (e.spineKey === 'dilaoQ' || !e.spineKey) : e.forceDilaoQ;
        // 🔍 敌人头像宽度 = 1 格 × tiled scale 自定义属性（默认 1；魔化猫等可在 tiled 里调大）
        const headW = tileW * scale * (e.scale ?? 1);
        applySpineHeadScale(e.sprite, headW, 'head_front', isDilaoQHere);
        e.sprite.update(0.05);
        // 若宽度仍无效（纹理未就绪）下帧重试
        const lb = e.sprite.getLocalBounds();
        if (!isFinite(lb.width) || lb.width <= 0) requestAnimationFrame(tryFixEnemyHead);
      } catch (err) { requestAnimationFrame(tryFixEnemyHead); }
    };
    requestAnimationFrame(() => requestAnimationFrame(tryFixEnemyHead));
  }
}

// 🌑 刷新一个暗影怪物（黑夜怪）：随机 2x2 可行走区域，不可在玩家/其他怪/宝箱附近，占 2x2 格
// 🌑 把 spine 判定为暗影怪的普通敌人（isShadow）转成暗影怪结构：加入 shadowEnemies 并从 enemies 移除，自动获得暗影怪全套行为
//    调用时机：地图敌人加载后（readEnemiesFromMap 之后、创建敌人 sprite 之前）
function routeShadowEnemies() {
  const list = enemies.filter(e => e.isShadow);
  if (!list.length) return;
  for (const e of list) {
    const sh = {
      id: e.id,
      col: e.col, row: e.row,
      spawnCol: e.spawnCol, spawnRow: e.spawnRow,
      // 2x2 中心基准（暗影怪占 2 格）
      px: (e.col + 1) * tileW * scale,
      py: (e.row + 1) * tileH * scale,
      freezeTimer: 0, playerInside: false,
      sprite: null, visionSprite: null,
      state: 'patrol', path: [], pathTimer: 0, patrolTimer: 0,
      patrolRange: e.patrolRange || SHADOW_PATROL,
      aggroRadius: e.aggroRadius || SHADOW_AGGRO,
      fovAngle: e.fovAngle || SHADOW_FOV,
      closeRange: e.closeRange || SHADOW_CLOSE,
      facing: e.facing ?? -Math.PI / 2,
      speed: e.speed || SHADOW_SPEED,
      loseTargetTimer: 0,
      lastTargetCol: -1, lastTargetRow: -1, aggroed: false, _lastFacing: null,
      // 头像 spine：优先 monster1（转换的那个）
      spineKey: e.spineKey || 'monster1',
      scale: e.scale ?? 1, // 🔍 头像放大倍率（tiled scale 属性，默认 1）
    };
    createShadowSprite(sh);
    sh.visionSprite = new Graphics();
    drawShadowVision(sh);
    sh.visionSprite.x = mapOffsetX + sh.px;
    sh.visionSprite.y = mapOffsetY + sh.py;
    if (app && sh.visionSprite) { try { app.stage.addChild(sh.visionSprite); } catch (err) { } }
    shadowEnemies.push(sh);
  }
  enemies = enemies.filter(e => !e.isShadow);
  // 玩家头像保持在暗影怪之上
  if (playerSprite && playerSprite.parent) { try { playerSprite.parent.addChild(playerSprite); } catch (err) { } }
}

// 💀 创建暗影怪头像 spine（spineKey 优先，兜底 daanyingguai → dilaoQ）；2x2 格宽等比自适应
function createShadowSprite(sh) {
  const keys = [sh.spineKey || 'monster1'];
  if ((sh.spineKey || '') !== 'daanyingguai') keys.push('daanyingguai');
  keys.push('dilaoQ');
  let sprite = null;
  for (const k of keys) {
    if (Assets.cache.has(k + '_skel') && Assets.cache.has(k + '_atlas')) {
      try {
        sprite = new Spine({ skeleton: k + '_skel', atlas: k + '_atlas', allowMissingRegions: true, autoUpdate: false });
        break;
      } catch (err) { sprite = null; }
    }
  }
  if (!sprite) {
    const size = tileW * scale * 1.6;
    sprite = new Graphics();
    sprite.rect(-size / 2, -size / 2, size, size);
    sprite.fill(0x8844ff);
    sprite.stroke({ width: 2, color: 0xffffff });
  } else {
    try {
      sprite.skeleton.setSkin(null);
      sprite.skeleton.setSkinByName('head_front');
      try { sprite.skeleton.setSlotsToSetupPose(); } catch (err) { }
      sprite.update(0.05);
      const lb = sprite.getLocalBounds();
      const w = (isFinite(lb.width) && lb.width > 0) ? lb.width : 64;
      sprite.scale.set((2 * tileW * scale) / w, (2 * tileW * scale) / w);
      sprite.update(0.05);
    } catch (err) { }
  }
  sprite.x = mapOffsetX + sh.px;
  sprite.y = mapOffsetY + sh.py;
  if (app) { try { app.stage.addChild(sprite); } catch (err) { } }
  sh.sprite = sprite;
  // 🏷️ 暗影怪头顶等级（2x2 占位，文字更高）
  createEnemyLvText(sh, -tileH * scale * 1.8);
}

function spawnShadowEnemy() {
  if (!app || !mapContainer || mapW <= 1 || mapH <= 1) return;
  const candidates = [];
  for (let c = 0; c < mapW - 1; c++) {
    for (let r = 0; r < mapH - 1; r++) {
      // 2x2 区域全部可行走且无障碍
      if (!isWalkable(c, r) || !isWalkable(c + 1, r) || !isWalkable(c, r + 1) || !isWalkable(c + 1, r + 1)) continue;
      // 不可在玩家附近
      if (Math.max(Math.abs(c - pCol), Math.abs(r - pRow)) < SHADOW_SPAWN_NEAR) continue;
      // 不与已有暗影怪/存活敌人太近
      if (shadowEnemies.some(sh => Math.abs(sh.col - c) < 3 && Math.abs(sh.row - r) < 3)) continue;
      if (enemies.some(e => !e.defeated && Math.abs(e.col - c) < 3 && Math.abs(e.row - r) < 3)) continue;
      // 不与宝箱/楼梯重叠
      if (chests.some(ch => ch.col >= c && ch.col <= c + 1 && ch.row >= r && ch.row <= r + 1)) continue;
      candidates.push({ col: c, row: r });
    }
  }
  if (!candidates.length) return;
  const pos = candidates[Math.floor(Math.random() * candidates.length)];
  shadowSpawnCount++;
  const sh = {
    id: 'shadow_' + shadowSpawnCount,
    col: pos.col, row: pos.row,
    spawnCol: pos.col, spawnRow: pos.row,   // 巡逻基准点（刷新位置）
    px: (pos.col + 1) * tileW * scale,      // 2x2 区域中心
    py: (pos.row + 1) * tileH * scale,
    freezeTimer: 0, playerInside: false, sprite: null, visionSprite: null,
    // 🤖 暗影怪 AI 字段（复用普通敌人寻路/索敌系统）
    state: 'patrol', path: [], pathTimer: 0, patrolTimer: 0,
    patrolRange: SHADOW_PATROL, aggroRadius: SHADOW_AGGRO, fovAngle: SHADOW_FOV,
    closeRange: SHADOW_CLOSE, facing: -Math.PI / 2,
    speed: SHADOW_SPEED, loseTargetTimer: 0,
    lastTargetCol: -1, lastTargetRow: -1, aggroed: false, _lastFacing: null,
  };
  // 💀 spine 头像：DLanying（优先，由代码决定），失败兜底 dilaoQ
  let sprite = null;
  try {
    if (Assets.cache.has('daanyingguai_skel') && Assets.cache.has('daanyingguai_atlas')) {
      sprite = new Spine({ skeleton: 'daanyingguai_skel', atlas: 'daanyingguai_atlas', allowMissingRegions: true, autoUpdate: false });
    }
  } catch (err) { sprite = null; }
  if (!sprite) {
    try { sprite = new Spine({ skeleton: 'dilaoQ_skel', atlas: 'dilaoQ_atlas', allowMissingRegions: true, autoUpdate: false }); }
    catch (err) { sprite = null; }
  }
  if (sprite) {
    try {
      // 只切换皮肤，不播放动画（头像模式）
      sprite.skeleton.setSkin(null);
      sprite.skeleton.setSkinByName('head_front');
      try { sprite.skeleton.setSlotsToSetupPose(); } catch (err) { }
      sprite.update(0.05);
      // 🎯 头像占 2x2 格：宽度 = 2*tileW*scale，高度等比自适应
      const lb = sprite.getLocalBounds();
      const w = (isFinite(lb.width) && lb.width > 0) ? lb.width : 64;
      sprite.scale.set((2 * tileW * scale) / w, (2 * tileW * scale) / w);
      sprite.update(0.05);
    } catch (err) { /* 忽略 */ }
  } else {
    const size = tileW * scale * 1.6;
    sprite = new Graphics();
    sprite.rect(-size / 2, -size / 2, size, size);
    sprite.fill(0x8844ff);
    sprite.stroke({ width: 2, color: 0xffffff });
  }
  sprite.x = mapOffsetX + sh.px;
  sprite.y = mapOffsetY + sh.py;
  app.stage.addChild(sprite);
  sh.sprite = sprite;
  // 👁️ 红色扇形索敌框（巡逻显示，追击隐藏）
  sh.visionSprite = new Graphics();
  drawShadowVision(sh);
  sh.visionSprite.x = mapOffsetX + sh.px;
  sh.visionSprite.y = mapOffsetY + sh.py;
  app.stage.addChild(sh.visionSprite);
  // 暗影怪头像在索敌框之上
  if (sprite.parent) { try { sprite.parent.addChild(sprite); } catch (err) { } }
  shadowEnemies.push(sh);
  // 玩家头像保持在暗影怪之上
  if (playerSprite && playerSprite.parent) { try { playerSprite.parent.addChild(playerSprite); } catch (err) { } }
}

// 🧹 清空暗影怪物（重新进入地牢 / 重置 / 卸载时调用）
function clearShadowEnemies() {
  for (const sh of shadowEnemies) {
    if (sh.sprite) {
      try { app?.stage?.removeChild(sh.sprite); } catch (err) { }
      try { sh.sprite.destroy({ children: true }); } catch (err) { }
    }
    if (sh.visionSprite) {
      try { app?.stage?.removeChild(sh.visionSprite); } catch (err) { }
      try { sh.visionSprite.destroy({ children: true }); } catch (err) { }
    }
    destroyEnemyLvText(sh);
  }
  shadowEnemies = [];
}

// 🗑️ 移除单个暗影怪（触碰玩家停留 4 秒结束后消失）
function removeShadowEnemy(sh) {
  // 🚫 暗影怪触碰玩家消失不算玩家击杀，不掉落奖励
  shadowEnemies = shadowEnemies.filter(x => x !== sh);
  if (sh.sprite) {
    try { app?.stage?.removeChild(sh.sprite); } catch (err) { }
    try { sh.sprite.destroy({ children: true }); } catch (err) { }
  }
  if (sh.visionSprite) {
    try { app?.stage?.removeChild(sh.visionSprite); } catch (err) { }
    try { sh.visionSprite.destroy({ children: true }); } catch (err) { }
  }
  destroyEnemyLvText(sh);
}

// 🌕 更新所有敌人头像的血月恐怖滤镜（血月=红色发光，其他天气=移除）
function updateEnemyBloodFilters() {
  const isBlood = currentWeather === 'bloodmoon';
  for (const e of enemies) {
    if (!e.sprite) continue;
    try {
      if (isBlood) {
        if (!e.bloodFilter) {
          e.bloodFilter = new GlowFilter({ color: 0xff2020, outerStrength: 3, innerStrength: 1.2, distance: 14, quality: 0.15 });
        }
        e.sprite.filters = [e.bloodFilter];
      } else {
        e.sprite.filters = [];
        if (e.bloodFilter) { try { e.bloodFilter.destroy(); } catch (err) { } e.bloodFilter = null; }
      }
    } catch (err) { /* 忽略 */ }
  }
}

// 👾 切换敌人皮肤（按移动方向），和玩家 applyPlayerHead 逻辑一致
function applyEnemyHead(e, name) {
  if (!e.sprite || typeof e.sprite.skeleton?.setSkinByName !== 'function') return;
  if (e.headName === name) return;
  e.headName = name;
  try {
    e.sprite.skeleton.setSkin(null);
    e.sprite.skeleton.setSkinByName(name);
    e.sprite.skeleton.setSlotsToSetupPose();
    e.sprite.update(0.05);
    // ⚠️ 不同方向皮肤原始 bounds 宽高可能不同，切换后重算 scale：宽度固定一格（tileW*scale），高度等比自适应
    const isEnemyDilaoQ2 = !e.forceDilaoQ ? e.spineKey === 'dilaoQ' || !e.spineKey : e.forceDilaoQ;
    applySpineHeadScale(e.sprite, tileW * scale * (e.scale ?? 1), name, isEnemyDilaoQ2);
    e.sprite.update(0.05);
  } catch (err) { }
}

// 🌑 暗影怪按朝向切换皮肤（head_front/left/right/back，与玩家/普通敌人一致；切换后重算 2x2 宽度比例）
function applyShadowHead(sh, name) {
  const sprite = sh.sprite;
  if (!sprite || typeof sprite.skeleton?.setSkinByName !== 'function') return;
  if (sh.headName === name) return;
  sh.headName = name;
  try {
    sprite.skeleton.setSkin(null);
    sprite.skeleton.setSkinByName(name);
    try { sprite.skeleton.setSlotsToSetupPose(); } catch (err) { }
    sprite.update(0.05);
    const lb = sprite.getLocalBounds();
    const w = (isFinite(lb.width) && lb.width > 0) ? lb.width : 64;
    sprite.scale.set((2 * tileW * scale * (sh.scale ?? 1)) / w, (2 * tileW * scale * (sh.scale ?? 1)) / w);
    sprite.update(0.05);
  } catch (err) { /* 忽略 */ }
}

// 👁️ 绘制敌人索敌范围（近身圆形 + 扇形）
function drawEnemyVision(e) {
  if (!e.visionSprite) return;
  const g = e.visionSprite;
  g.clear();
  const px = tileW * scale;
  // 🌿 草地减少敌人索敌范围：可视化范围和实际检测范围一致（减去具体格子数）
  const enemyVisionReduce = getVisionReduce(e.col, e.row);
  // 🌙 天黑扇形索敌框变大 ×1.4；🌕 血月再 ×1.3
  const aggroR = Math.max(0, e.aggroRadius - enemyVisionReduce) * px * (isDungeonNight() ? 1.4 : 1) * (currentWeather === 'bloodmoon' ? 1.3 : 1) * (e.sightScale || 1);
  // 扇形（橙色半透明，以 facing 朝向为中心）
  const effFov = (e.fovHalved ? e.fovAngle / 2 : e.fovAngle); // 🐰 黑米被动：索敌角度减半
  const startAngle = e.facing - effFov / 2;
  const endAngle = e.facing + effFov / 2;
  g.moveTo(0, 0);
  g.arc(0, 0, aggroR, startAngle, endAngle);
  g.closePath();
  // 🚨 攻击预警：发现玩家后红扇闪烁（alertFlash > 0 时）
  const alert = (e.alertFlash || 0) > 0;
  const blink = alert ? (Math.sin((e.alertFlash || 0) * 32) > 0 ? 1 : 0.18) : 1;
  g.fill({ color: alert ? 0xff2a00 : 0xffaa00, alpha: alert ? 0.30 * blink : 0.08 });
  g.stroke({ width: alert ? 3 : 1, color: alert ? 0xff5a00 : 0xffaa00, alpha: alert ? 0.95 * blink : 0.3 });
}

// ⚔️ 触发战斗：enemies 数组里的所有不同种类敌人同时进入战斗
let battleCooldown = false;
// 💬 战斗前对话：敌人追上玩家时若配置了 dialogBeforeBattle=true，先触发对话，对话结束后再进入战斗
let pendingBattleAfterDialogue = null; // 保存待进入战斗的敌人对象（对话结束后触发 doEnterBattle）
function triggerBattle(e) {
  if (e.defeated || e.inBattle || battleCooldown || dungeonPaused) return;
  e.inBattle = true; // ⚔️ 进入战斗（但尚未胜利）：不标记 defeated，防止封印解锁提前触发
  battleCooldown = true;
  dungeonPaused = true; // ⏸️ 暂停地牢：玩家和敌人都无法移动
  if (e.sprite) { e.sprite.visible = false; }
  // 触发战斗后隐藏感叹号和索敌范围
  if (e.alertSprite) { e.alertSprite.visible = false; }
  if (e.visionSprite) { e.visionSprite.visible = false; }
  // 💬 战斗前对话：dialogAfterBattle=true 且 dialogBeforeBattle=true → 先弹对话，对话结束再进入战斗
  if (e.dialogAfterBattle && e.dialogLoadData && e.dialogBeforeBattle) {
    pendingBattleAfterDialogue = e;
    let targetName = e.dialogName;
    if (Array.isArray(e.dialogRoute) && e.dialogRoute.length > 0) {
      for (const step of e.dialogRoute) {
        if (!matchDialogueCondition(step)) continue;
        targetName = step.name;
        break;
      }
    }
    if (targetName && user.pixi?.gameMode !== 'normal') {
      setTimeout(() => {
        storyPaused = true;
        dungeonPaused = true;
        emitter.emit('talkToNpc', { loadData: e.dialogLoadData, name: targetName });
      }, 300);
    } else {
      // 没有匹配的对话名（或普通模式无剧情）→ 直接进入战斗
      pendingBattleAfterDialogue = null;
      doEnterBattle(e);
    }
    return;
  }
  // 正常进入战斗（或战斗后对话：记录待触发对话，战斗结束返回时触发）
  doEnterBattle(e);
}

// ⚔️ 真正进入战斗（抽取公共逻辑，供正常触发 & 战斗前对话结束后调用）
function doEnterBattle(e) {
  // 遍历 enemies 数组，每种敌人生成一个战斗敌人配置
  const battleEnemies = [];
  // 🌕 血月：敌人攻击+15%、最大生命+20%、速度+15%（战斗内）
  const bloodMoon = currentWeather === 'bloodmoon';
  // 🌙 地牢天黑：进入战斗全属性+50%（速度/攻击/护甲，可与血月叠加）、击败经验+25%
  const nightOn = isDungeonNight();
  const atkM = (bloodMoon ? 1 + BLOODMOON_BATTLE.atk : 1) * (nightOn ? 1.5 : 1);
  const hpM = (bloodMoon ? 1 + BLOODMOON_BATTLE.hp : 1) * (nightOn ? 1.5 : 1);
  const spdM = (bloodMoon ? 1 + BLOODMOON_BATTLE.spd : 1) * (nightOn ? 1.5 : 1);
  const armM = nightOn ? 1.5 : 1;
  const expM = (bloodMoon ? 1 + BLOODMOON_BATTLE.exp : 1) * (nightOn ? 1.25 : 1);
  // 🧬 Tiled 未配置的属性继承怪物编辑数值（monsterConfigs），显式写的值（含 0）保留
  const num = (v, d) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v))) ? d : Number(v);
  for (const enemyCfg of e.enemies) {
    // 🐱 战斗敌人类型：优先用 Tiled 配置的 spine（如 guaiwu2=魔化猫），未配置兜底 monster1
    const monsterType = String(enemyCfg.spine || 'monster1');
    const base = monsterConfigs[monsterType] || monsterConfigs.monster1;
    // 🎖️ 怪物等级：Tiled enemies 数组可配 level（基准等级）覆盖，未配置继承怪物编辑 level，再加层数加成
    const enemyLevel = Math.max(1, num(enemyCfg.level, base.level ?? 1) + (currentLevel.value - 1) * DUNGEON_ENEMY_LEVEL_PER_FLOOR
      + ((Number(user.pixi?.player?.day) || 1) - 1) * DUNGEON_ENEMY_LEVEL_PER_DAY); // 📅 每过一天怪物等级 +1
    // 📈 等级属性倍率：Lv.N 属性 = 初始属性 × (1 + (N-1)×成长率)，成长率见 DUNGEON_ENEMY_GROWTH
    const g = DUNGEON_ENEMY_GROWTH;
    const lvMult = {
      hp: 1 + (enemyLevel - 1) * g.hp,
      attack: 1 + (enemyLevel - 1) * g.attack,
      armor: 1 + (enemyLevel - 1) * g.armor,
      magicResist: 1 + (enemyLevel - 1) * g.magicResist,
      speed: 1 + (enemyLevel - 1) * g.speed,
    };
    battleEnemies.push({
      monsterType,
      // 💰 敌人类型标记（金币奖励分档用）：继承怪物编辑 Boss/精英标记
      isBoss: !!base.isBoss,
      isElite: !!base.isElite,
      count: 1,
      level: enemyLevel,
      name: String(enemyCfg.name || base.name || t('enemyFallbackName')),
      // 🧬 未配置时继承怪物编辑数值（不再是写死的 30/8/0/90）；最终属性再乘等级倍率
      hp: Math.floor(num(enemyCfg.hp, base.hp || 30) * hpM * lvMult.hp),
      attack: Math.floor(num(enemyCfg.attack, base.attack || 8) * atkM * lvMult.attack),
      armor: Math.floor(num(enemyCfg.armor, base.armor ?? 0) * armM * lvMult.armor),
      // 🛡️ 魔抗：Tiled 可单独配，未配置继承怪物编辑魔抗（战斗按护甲/魔抗双减免）
      magicResist: Math.floor(num(enemyCfg.magicResist, base.magicResist ?? 0) * armM * lvMult.magicResist),
      // ⚡ 战斗速度：优先用 enemies 数组里该敌人配置的 speed（Tiled 可单独设置）；
      //    未配置时继承怪物编辑的 speed（没有再写死 90）
      speed: Math.round((num(enemyCfg.speed, base.speed || 90) * spdM * lvMult.speed) * 10) / 10,
      // 🌕 血月/🌙 天黑：经验值加成（Tiled 未配置 exp 时继承怪物编辑 baseExp，无则 30）
      baseExp: Math.floor(num(enemyCfg.exp, base.baseExp || 30) * expM),
      // 🚫 地牢战斗掉落统一由 dungeon.vue 的 ENEMY_DROP_RATES 结算：
      //    置空 drops 禁用 enemiesData 怪物默认掉落（如雷鸟的灵力晶核），避免双掉落
      drops: [],
      // 🎁 固定掉落（可选）：tiled enemies 数组里每个敌人可配 dropItems
      //    [{"item":"魔晶LV1","count":2}]；配置了则战斗胜利只发固定掉落、跳过随机表
      dropItems: Array.isArray(enemyCfg.dropItems) ? enemyCfg.dropItems : null,
    });
  }
  if (battleEnemies.length === 0) return;
  // ⚔️ 保存进入战斗前的玩家位置（战斗结束后恢复到此位置，而非spawn点）
  preBattlePos = { col: pCol, row: pRow, px: pPixelX, py: pPixelY };
  // ⚔️ 保存进入战斗前所有存活敌人的位置/状态（战斗结束后恢复，不刷新到出生点）
  preBattleEnemyStates = enemies
    .filter(en => !en.defeated && en.sprite)
    .map(en => ({
      col: en.col, row: en.row, px: en.px, py: en.py,
      state: en.state, aggroed: en.aggroed,
      path: en.path ? en.path.slice() : [],
      loseTargetTimer: en.loseTargetTimer || 0,
    }));
  // 💬 若该敌人配置了 dialogAfterBattle=true（且非战斗前对话），记录待触发对话（战斗结束后返回地牢时触发）
  if (e.dialogAfterBattle && e.dialogLoadData && !e.dialogBeforeBattle) {
    pendingEnemyDialogue = {
      dialogLoadData: e.dialogLoadData,
      dialogName: e.dialogName,
      dialogRoute: e.dialogRoute,
    };
  } else {
    pendingEnemyDialogue = null;
  }
  // 🎬 进入战斗过场过渡（红黑冲击波 + 火星粒子 + 屏幕震动），播完再真正切换战斗场景
  dungeonPaused = true; // 过渡期间冻结地牢
  stopBgMusic(); // 🎵 进入战斗：关闭背景音乐（战斗结束后返回地牢再恢复）
  playSfx('zhandou'); // ⚔️ 进入战斗音效（一次性，不循环）
  playSceneTransition('enterBattle', {
    onDone: () => {
      dungeonPaused = false;
      // 📢 通知 matter.vue 关闭地牢页面（v-if=false 销毁组件），战斗结束后重新打开
      emitter.emit('dungeonEnterBattle');
      emitter.emit('customBattle', { enemies: battleEnemies, bloodMoon, weather: currentWeather, night: isDungeonNight(), nightLevel: dungeonNightTime });
    },
  });
  // ⚔️ 记录本次战斗的敌人对象（battleEnd 胜利后真正标记 defeated）
  currentBattleEnemy = e;
  // 战斗结束冷却（防止连续触发）
  setTimeout(() => { battleCooldown = false; }, 1500);
}

// ⚔️ 战斗前对话结束后进入战斗（由对话结束事件调用，一次性）
function tryEnterBattleAfterDialogue() {
  if (!pendingBattleAfterDialogue) return;
  const e = pendingBattleAfterDialogue;
  pendingBattleAfterDialogue = null; // 用完即清，防止重复触发
  doEnterBattle(e);
}

// 🦅 雷鸟直线路径：无视障碍物，每步朝目标方向直/斜走一格（穿墙移动）
function straightPath(c0, r0, c1, r1) {
  const path = [];
  const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
  if (dc === 0 && dr === 0) return path;
  let c = c0, r = r0, guard = 0;
  while ((c !== c1 || r !== r1) && guard++ < 300) {
    c += dc; r += dr;
    path.push({ col: c, row: r });
  }
  return path;
}

// 👾 敌人更新（每帧 ticker 调用）：索敌 → A* 追击 → 追上触发战斗
function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.defeated || !e.sprite) continue;
    // 🎯 视口外优化：远离屏幕且未追击的敌人暂停 AI 与 spine 更新（省 CPU；玩家靠近后自动恢复）
    //    ⚡ 低性能模式：缓冲格数收紧（4格→1格），更早剔除屏幕外敌人
    const offMargin = isPerfLow() ? tileW * scale : tileW * scale * 4;
    if (e.state !== 'chase' && !isEntityOnScreen(e.px, e.py, offMargin)) continue;

    // 🏃 逃跑型敌人（tiled flee=true）：玩家靠近 fleeRange 格内 → 选远离玩家的格逃跑（不索敌不追击）
    const fleeDist = Math.max(Math.abs(e.col - pCol), Math.abs(e.row - pRow));
    const fleeing = !!(e.flee && e.state === 'patrol' && fleeDist <= (e.fleeRange || 3));
    if (fleeing) {
      const dc = e.col - pCol, dr = e.row - pRow;
      const cands = [];
      if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) cands.push({ col: e.col + Math.sign(dc), row: e.row });
        if (dr !== 0) cands.push({ col: e.col, row: e.row + Math.sign(dr) });
      } else {
        if (dr !== 0) cands.push({ col: e.col, row: e.row + Math.sign(dr) });
        if (dc !== 0) cands.push({ col: e.col + Math.sign(dc), row: e.row });
      }
      if (!cands.length) cands.push({ col: e.col + (Math.random() < 0.5 ? 1 : -1), row: e.row });
      let t = null;
      for (const c of cands) {
        if (c.col >= 1 && c.col < mapW - 1 && c.row >= 1 && c.row < mapH - 1 && isWalkable(c.col, c.row)) { t = c; break; }
      }
      e.path = t ? [t] : [];
      e.alertFlash = 0;
    }

    // ===== 状态转换 =====
    if (e.state === 'patrol') {
      // 👁️ 扇形视野索敌：发现玩家 → 追击（巡逻态每 0.15s 检测一次，玩家静止时省掉每帧扇形+视线计算）
      if (!fleeing) {
        e.sightTimer = (e.sightTimer || 0) - dt;
        if (e.sightTimer <= 0) {
          e.sightTimer = 0.25;
          if (canSeePlayer(e)) {
            playAlertSfx(); // 🚨 敌人发现玩家提示音
            e.state = 'chase';
            e.aggroed = true;
            e.alertFlash = 0.7; // 🚨 攻击预警：红色扇形闪烁 0.7s 后再开始追击（玩家有反应时间）
            e.path = [];
            e.pathTimer = 0;
            e.loseTargetTimer = 0;
            // 🐱 魔化猫特殊追击：发现玩家后停留 0.5 秒，随后提升 1.5 格移速持续 3 秒
            if (e.spineKey === 'mohuamaofu') { e.lungeDelay = 0.5; e.lungeBoost = 0; }
          }
        }
      }
    } else if (e.state === 'chase') {
      // 🚨 攻击预警倒计时：闪烁期间不移动、不追人（玩家可趁红闪逃走）
      if (e.alertFlash > 0) e.alertFlash = Math.max(0, e.alertFlash - dt);
      // 🐱 魔化猫蓄力/加速计时：蓄力 0.5 秒（期间不移动）→ 加速 3 秒
      if (e.lungeDelay > 0) {
        e.lungeDelay -= dt;
        if (e.lungeDelay <= 0) { e.lungeDelay = 0; e.lungeBoost = 3; }
      } else if (e.lungeBoost > 0) {
        e.lungeBoost = Math.max(0, e.lungeBoost - dt);
      }
      // 🏃 脱离追击：玩家不在有效索敌范围内（追击时已提升范围并全向）持续 2 秒 → 回到巡逻
      if (!canSeePlayer(e)) {
        e.loseTargetTimer += dt;
        if (e.loseTargetTimer >= 3) {
          e.state = 'patrol';
          e.aggroed = false;
          e.path = [];
          e.loseTargetTimer = 0;
          e.lungeDelay = 0; e.lungeBoost = 0; // 🐱 清魔化猫蓄力/加速，重新发现再触发
        }
      } else {
        e.loseTargetTimer = 0;
      }
    }

    // ===== 行为逻辑 =====
    if (e.state === 'patrol') {
      // 🚶 巡逻决策：计时到或路径为空时，在 spawn 周围 patrolRange 内随机选可行走目标
      e.patrolTimer -= dt;
      if (e.patrolTimer <= 0 || e.path.length === 0) {
        const candidates = [];
        for (let dc = -e.patrolRange; dc <= e.patrolRange; dc++) {
          for (let dr = -e.patrolRange; dr <= e.patrolRange; dr++) {
            const c = e.spawnCol + dc, r = e.spawnRow + dr;
            if (isWalkable(c, r) && !(c === e.col && r === e.row)) {
              candidates.push({ col: c, row: r });
            }
          }
        }
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          // 🦅 雷鸟无视障碍物：直线路径；其余敌人 A* 绕障碍
          e.path = e.ignoreSightBlock
            ? straightPath(e.col, e.row, target.col, target.row)
            : findPath(e.col, e.row, target.col, target.row);
        }
        e.patrolTimer = 2 + Math.random() * 3; // 2-5 秒后重新决策
      }
    } else if (e.state === 'chase') {
      // ⚔️ 追击：高频重算 A* 路径，玩家移动时动态跟随，路径快走完立即重算
      e.pathTimer -= dt;
      const targetMoved = e.lastTargetCol !== pCol || e.lastTargetRow !== pRow;
      const needRepath = e.path.length === 0 || e.pathTimer <= 0 ||
        (e.path.length <= 1 && targetMoved) ||
        (targetMoved && e.path.length <= 2);
      if (needRepath) {
        // 🦅 雷鸟无视障碍物：直线冲向玩家；其余敌人 A* 绕障碍
        e.path = e.ignoreSightBlock
          ? straightPath(e.col, e.row, pCol, pRow)
          : findPath(e.col, e.row, pCol, pRow);
        e.pathTimer = 0.25; // 0.25 秒重算一次（AI 节流：省 CPU，追击几乎无感）
        e.lastTargetCol = pCol;
        e.lastTargetRow = pRow;
      }
    }

    // ===== 沿路径插值移动（巡逻和追击共用）=====
    // 🐱 魔化猫蓄力期间停留 0.5 秒（不沿路径移动，同格触发战斗判定仍保留）
    if (e.path.length > 0 && !(e.lungeDelay > 0) && !(e.alertFlash > 0)) {
      const next = e.path[0];
      // 根据移动方向切换皮肤 + 更新朝向（扇形索敌用）
      if (next.col > e.col) { applyEnemyHead(e, 'head_right'); e.facing = 0; }
      else if (next.col < e.col) { applyEnemyHead(e, 'head_left'); e.facing = Math.PI; }
      else if (next.row > e.row) { applyEnemyHead(e, 'head_front'); e.facing = Math.PI / 2; }
      else if (next.row < e.row) { applyEnemyHead(e, 'head_back'); e.facing = -Math.PI / 2; }
      // 插值移动
      const targetX = (next.col + 0.5) * tileW * scale;
      const targetY = (next.row + 0.5) * tileH * scale;
      const dx = targetX - e.px, dy = targetY - e.py;
      const d = Math.sqrt(dx * dx + dy * dy);
      // 巡逻时速度降低30%，追击时全速；🌊 地形减速（水洼等）；🌕 血月敌人加速
      const terrainMult = getTerrainSpeed(e.col, e.row);
      const weatherEnemyMult = 1 + weatherEnemySpeedUp; // 血月敌人移速提升
      // 🌙 血月/夜晚：敌人移速固定提升（格/秒，两者同时可叠加，不用百分比）
      // 🦊 西亚被动：携带进入地牢，敌人追击你时速度降低（乘算 -20%）
      const carrySlowMult = (user.getNpcAlly?.() === 'huli' && e.state === 'chase') ? 0.8 : 1;
      // 💖 怜惜：怪物追击你时速度降低（乘算百分比，数值可配置）
      const pitySlowMult = (user.hasTalent('charm_pity') && e.state === 'chase') ? (1 - (Number(user.getTalentEffect?.('charm_pity', 'slowSpeed') ?? 20) || 0) / 100) : 1;
      const catLungeBoost = (e.lungeBoost > 0) ? 1.5 : 0; // 🐱 魔化猫加速：+1.5 格/秒（仅该敌人有 lungeBoost）
      const chaseBoost = (e.state === 'chase') ? 2 : 0; // 🏃 所有怪物发现玩家后额外提速 2 格/秒（魔化猫与此特性叠加）
      // 🐢 最低移速 1.5 格/秒兜底；追击加速与减速为乘算关系，不互相湮灭
      const moveSpeed = Math.max(1.5, (((e.state === 'patrol') ? e.speed * 0.7 : e.speed) + ((currentWeather === 'bloodmoon' ? NIGHT_ENEMY_SPEED_BONUS : 0) + (isDungeonNight() ? NIGHT_ENEMY_SPEED_BONUS : 0)) + catLungeBoost + chaseBoost) * pitySlowMult * carrySlowMult);
      const step = moveSpeed * tileW * scale * dt * terrainMult * weatherEnemyMult;
      if (d <= step) {
        e.px = targetX; e.py = targetY;
        e.col = next.col; e.row = next.row;
        e.path.shift();
      } else {
        e.px += (dx / d) * step;
        e.py += (dy / d) * step;
      }
    }

    // 🐱 魔化猫冲刺残影：加速期每 0.06s 生成一个渐隐幽灵副本
    if (e.lungeBoost > 0 && e.spineKey === 'mohuamaofu') {
      e.trailTimer = (e.trailTimer || 0) - dt;
      if (e.trailTimer <= 0) { e.trailTimer = 0.06; spawnCatTrail(e); }
    }

    // 追上玩家（同格）→ 进入战斗
    if (e.col === pCol && e.row === pRow) {
      triggerBattle(e);
      continue; // 战斗触发后跳过后续位置/感叹号更新，避免感叹号被重新设为可见
    }

    // 更新 sprite 位置 + spine 每帧手动 update（⚡ 低性能模式隔帧更新骨骼，省一半计算）
    if (e.sprite) {
      e.sprite.x = mapOffsetX + e.px;
      e.sprite.y = mapOffsetY + e.py;
      syncEnemyLvText(e);
      if (typeof e.sprite.update === 'function' && shouldUpdateSpine()) {
        try { e.sprite.update(dt); } catch (err) { }
      }
    }
    // 👁️ 索敌范围可视化：追击时隐藏；🌫️ 雾天直接隐藏（不管有无迷雾，让玩家更容易被偷袭）；巡逻时显示并随朝向重绘
    if (e.visionSprite) {
      e.visionSprite.x = mapOffsetX + e.px;
      e.visionSprite.y = mapOffsetY + e.py;
      if (e.state === 'chase' || currentWeather === 'fog') {
        if (e.alertFlash > 0) {
          // 🚨 攻击预警：红扇闪烁（每帧重绘，闪完才开始追击）
          e.visionSprite.visible = true;
          drawEnemyVision(e);
        } else {
          e.visionSprite.visible = false;
        }
      } else {
        e.visionSprite.visible = true;
        if (e._lastFacing !== e.facing) {
          e._lastFacing = e.facing;
          drawEnemyVision(e);
        }
      }
    }
    // ❗ 追击红色感叹号：仅追击时显示，在敌人头上，每帧移到最上层
    if (e.alertSprite) {
      e.alertSprite.visible = (e.state === 'chase');
      e.alertSprite.x = mapOffsetX + e.px;
      e.alertSprite.y = mapOffsetY + e.py - tileW * scale * 0.8;
      if (e.alertSprite.visible && e.alertSprite.parent) {
        e.alertSprite.parent.addChild(e.alertSprite); // 强制移到 stage 最上层
      }
    }
  }

  // 🐱 魔化猫冲刺残影渐隐更新
  for (let i = catTrails.length - 1; i >= 0; i--) {
    const tr = catTrails[i];
    if (!tr.s || !tr.s.parent) { catTrails.splice(i, 1); continue; }
    tr.life -= dt;
    tr.s.alpha = Math.max(0, 0.38 * (tr.life / tr.max));
    if (tr.life <= 0) {
      try { app.stage.removeChild(tr.s); tr.s.destroy?.(); } catch (err) { }
      catTrails.splice(i, 1);
    }
  }
}

// 🐱 魔化猫冲刺残影：复制当前外观（皮肤 + 骨骼姿态）为半透明幽灵，0.35s 渐隐
function spawnCatTrail(e) {
  if (!app || !e.sprite || !e.sprite.skeleton) return;
  try {
    const ghost = new Spine({
      skeleton: e.spineKey + '_skel',
      atlas: e.spineKey + '_atlas',
      allowMissingRegions: true,
      autoUpdate: false,
    });
    const srcSkel = e.sprite.skeleton;
    // 复制皮肤（方向皮肤 head_front/left 等）
    try {
      const skinName = srcSkel.skin?.name;
      if (skinName) ghost.skeleton.setSkinByName(skinName);
      else ghost.skeleton.setSkin(null);
    } catch (err) { }
    // 复制骨骼姿态（还原当前动画帧骨架）
    const gb = ghost.skeleton.bones, sb = srcSkel.bones;
    for (let i = 0; i < gb.length && i < sb.length; i++) {
      gb[i].rotation = sb[i].rotation;
      gb[i].x = sb[i].x;
      gb[i].y = sb[i].y;
    }
    ghost.skeleton.setSlotsToSetupPose?.();
    ghost.scale.set(e.sprite.scale.x, e.sprite.scale.y);
    ghost.x = e.sprite.x;
    ghost.y = e.sprite.y;
    ghost.alpha = 0.38;
    app.stage.addChild(ghost);
    catTrails.push({ s: ghost, life: 0.35, max: 0.35 });
  } catch (err) { }
}


// 👁️ 绘制暗影怪红色扇形索敌框（与普通敌人橙扇同理，红色）
function drawShadowVision(sh) {
  if (!sh.visionSprite) return;
  const g = sh.visionSprite;
  g.clear();
  const px = tileW * scale;
  const enemyVisionReduce = getVisionReduce(sh.col, sh.row);
  const aggroR = Math.max(0, sh.aggroRadius - enemyVisionReduce) * px * (isDungeonNight() ? 1.4 : 1) * (currentWeather === 'bloodmoon' ? 1.3 : 1);
  const effFov = (sh.fovHalved ? sh.fovAngle / 2 : sh.fovAngle); // 🐰 黑米被动：索敌角度减半
  const startAngle = sh.facing - effFov / 2;
  const endAngle = sh.facing + effFov / 2;
  g.moveTo(0, 0);
  g.arc(0, 0, aggroR, startAngle, endAngle);
  g.closePath();
  g.fill({ color: 0xff2020, alpha: 0.10 });
  g.stroke({ width: 1.5, color: 0xff4444, alpha: 0.45 });
}

// 🌑 暗影怪触碰玩家：扣 15% 最大生命 + 减速 40% 1.5s + 该怪停留并淡出 4 秒后彻底消失（不进入战斗）
function triggerShadowTouch(sh) {
  if (sh.freezeTimer > 0 || dungeonPaused) return;
  sh.freezeTimer = SHADOW_FREEZE;
  sh.playerInside = true;
  sh.pendingRemove = true; // 🌑 触碰玩家并停留 4 秒后消失（不重新进入巡逻）
  const juese = user.pixi?.player?.juese;
  if (juese) {
    const maxHp = juese.maxHp || 100;
    const dmg = Math.max(1, Math.round(maxHp * SHADOW_DMG_PCT));
    juese.hp = Math.max(0, (juese.hp ?? 100) - dmg);
    shadowSlowTimer = SHADOW_SLOW_TIME; // 🐌 减速 40% 持续 1.5s
    playSfx('kongbugongji'); // 🎵 暗影怪攻击音效（恐怖攻击）
    triggerPlayerFx('burn'); // 🎬 暗影伤害特效（抖动+红色滤镜+头顶飘字）
    spawnFloatText(`-${dmg}`, 0xff6666);
  }
}

// 👾 暗影怪 AI 更新（每帧 ticker 调用）：红色扇形索敌 → A* 追击 → 追上玩家造成伤害+减速（不进入战斗）
function updateShadowEnemies(dt) {
  for (const sh of shadowEnemies) {
    if (!sh.sprite) continue;
    // 🌑 触碰玩家并停留 4 秒后：该暗影怪消失（不重新进入巡逻）
    if (sh.freezeTimer <= 0 && sh.pendingRemove) {
      removeShadowEnemy(sh);
      continue;
    }
    // 🧊 触碰后停留 4 秒：不移动、不索敌（仅位置跟随镜头），同时逐渐透明淡出
    if (sh.freezeTimer > 0) {
      if (sh.sprite) { sh.sprite.x = mapOffsetX + sh.px; sh.sprite.y = mapOffsetY + sh.py; }
      if (sh.lvText) { sh.lvText.x = mapOffsetX + sh.px; sh.lvText.y = mapOffsetY + sh.py + (sh.lvTextOffsetY ?? -tileH * scale * 1.05); }
      if (sh.visionSprite) { sh.visionSprite.x = mapOffsetX + sh.px; sh.visionSprite.y = mapOffsetY + sh.py; }
      // 🌫️ 攻击后淡出：随停留时间线性降低透明度，4 秒后完全透明再由下方移除逻辑清除
      if (sh.pendingRemove) {
        const total = SHADOW_FREEZE;
        const elapsed = total - Math.max(0, sh.freezeTimer);
        const alpha = Math.max(0, 1 - elapsed / total);
        if (sh.sprite) sh.sprite.alpha = alpha;
        if (sh.visionSprite) sh.visionSprite.alpha = alpha;
      }
      continue;
    }
    // ===== 状态转换 =====
    if (sh.state === 'patrol') {
      // 👁️ 巡逻态索敌节流：每 0.15s 检测一次（玩家静止时省掉每帧扇形+视线计算）
      sh.sightTimer = (sh.sightTimer || 0) - dt;
      if (sh.sightTimer <= 0) {
        sh.sightTimer = 0.15;
        if (canSeePlayer(sh)) {
          playAlertSfx(); // 🚨 暗影怪发现玩家提示音（与普通敌人共用 800ms 防重叠）
          sh.state = 'chase';
          sh.aggroed = true;
          sh.path = [];
          sh.pathTimer = 0;
          sh.loseTargetTimer = 0;
        }
      }
    } else if (sh.state === 'chase') {
      if (!canSeePlayer(sh)) {
        sh.loseTargetTimer += dt;
        if (sh.loseTargetTimer >= 3) {
          sh.state = 'patrol';
          sh.aggroed = false;
          sh.path = [];
          sh.loseTargetTimer = 0;
        }
      } else {
        sh.loseTargetTimer = 0;
      }
    }
    // ===== 行为逻辑 =====
    if (sh.state === 'patrol') {
      sh.patrolTimer -= dt;
      if (sh.patrolTimer <= 0 || sh.path.length === 0) {
        const candidates = [];
        for (let dc = -sh.patrolRange; dc <= sh.patrolRange; dc++) {
          for (let dr = -sh.patrolRange; dr <= sh.patrolRange; dr++) {
            const c = sh.spawnCol + dc, r = sh.spawnRow + dr;
            if (isWalkable(c, r) && !(c === sh.col && r === sh.row)) candidates.push({ col: c, row: r });
          }
        }
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          sh.path = findPath(sh.col, sh.row, target.col, target.row);
        }
        sh.patrolTimer = 2 + Math.random() * 3; // 2-5 秒后重新决策
      }
    } else if (sh.state === 'chase') {
      sh.pathTimer -= dt;
      const targetMoved = sh.lastTargetCol !== pCol || sh.lastTargetRow !== pRow;
      const needRepath = sh.path.length === 0 || sh.pathTimer <= 0 ||
        (sh.path.length <= 1 && targetMoved) ||
        (targetMoved && sh.path.length <= 2);
      if (needRepath) {
        sh.path = findPath(sh.col, sh.row, pCol, pRow);
        sh.pathTimer = 0.15; // 0.15 秒重算一次，跟随玩家移动
        sh.lastTargetCol = pCol;
        sh.lastTargetRow = pRow;
      }
    }
    // ===== 沿路径插值移动（2x2 中心基准）=====
    if (sh.path.length > 0) {
      const next = sh.path[0];
      // 朝向更新（红色扇形索敌用）
      if (next.col > sh.col) { sh.facing = 0; applyShadowHead(sh, 'head_right'); }
      else if (next.col < sh.col) { sh.facing = Math.PI; applyShadowHead(sh, 'head_left'); }
      else if (next.row > sh.row) { sh.facing = Math.PI / 2; applyShadowHead(sh, 'head_front'); }
      else if (next.row < sh.row) { sh.facing = -Math.PI / 2; applyShadowHead(sh, 'head_back'); }
      const targetX = (next.col + 1) * tileW * scale;
      const targetY = (next.row + 1) * tileH * scale;
      const dx = targetX - sh.px, dy = targetY - sh.py;
      const d = Math.sqrt(dx * dx + dy * dy);
      const terrainMult = getTerrainSpeed(sh.col, sh.row);
      const weatherEnemyMult = 1 + weatherEnemySpeedUp; // 🌕 血月敌人加速
      // 巡逻 0.7 倍速，追击全速；🌙 夜晚/血月额外固定提速（与普通敌人一致）；🏃 暗影怪追击同样吃到 +2 格/秒
      const shadowChaseBoost = (sh.state === 'chase') ? 2 : 0; // 🏃 暗影怪追击提速 2 格/秒（与普通敌人 chaseBoost 一致）
      const moveSpeed = Math.max(1.5, (sh.state === 'patrol' ? sh.speed * 0.7 : sh.speed)
        + ((currentWeather === 'bloodmoon' ? NIGHT_ENEMY_SPEED_BONUS : 0) + (isDungeonNight() ? NIGHT_ENEMY_SPEED_BONUS : 0)) + shadowChaseBoost);
      const step = moveSpeed * tileW * scale * dt * terrainMult * weatherEnemyMult;
      if (d <= step) {
        sh.px = targetX; sh.py = targetY;
        sh.col = next.col; sh.row = next.row;
        sh.path.shift();
      } else {
        sh.px += (dx / d) * step;
        sh.py += (dy / d) * step;
      }
    }
    // ⚡ 追上玩家（玩家落在 2x2 区域）→ 造成伤害+减速（不进入战斗）
    const inArea = pCol >= sh.col && pCol <= sh.col + 1 && pRow >= sh.row && pRow <= sh.row + 1;
    if (inArea) {
      triggerShadowTouch(sh);
      continue;
    } else {
      sh.playerInside = false;
    }
    // 更新位置 + spine 每帧手动 update
    if (sh.sprite) {
      sh.sprite.x = mapOffsetX + sh.px;
      sh.sprite.y = mapOffsetY + sh.py;
      syncEnemyLvText(sh);
      if (typeof sh.sprite.update === 'function' && isEntityOnScreen(sh.px, sh.py, 250) && shouldUpdateSpine()) { try { sh.sprite.update(dt); } catch (err) { } }
    }
    // 👁️ 红色索敌框：追击隐藏，巡逻显示并随朝向重绘
    if (sh.visionSprite) {
      sh.visionSprite.x = mapOffsetX + sh.px;
      sh.visionSprite.y = mapOffsetY + sh.py;
      if (sh.state === 'chase') {
        sh.visionSprite.visible = false;
      } else {
        sh.visionSprite.visible = true;
        if (sh._lastFacing !== sh.facing) { sh._lastFacing = sh.facing; drawShadowVision(sh); }
      }
    }
  }
}

// 🗑️ 销毁所有敌人 spine
function destroyEnemies() {
  for (const e of enemies) {
    if (e.sprite) {
      try { app.stage.removeChild(e.sprite); } catch (err) { }
      try { e.sprite.destroy(); } catch (err) { }
      e.sprite = null;
    }
    if (e.bloodFilter) { try { e.bloodFilter.destroy(); } catch (err) { } e.bloodFilter = null; }
    if (e.visionSprite) {
      try { app.stage.removeChild(e.visionSprite); } catch (err) { }
      try { e.visionSprite.destroy(); } catch (err) { }
      e.visionSprite = null;
    }
    if (e.alertSprite) {
      try { app.stage.removeChild(e.alertSprite); } catch (err) { }
      try { e.alertSprite.destroy(); } catch (err) { }
      e.alertSprite = null;
    }
    destroyEnemyLvText(e);
  }
  enemies = [];
  // 👾 销毁埋击组内敌人 sprite，重置组状态（未触发，敌人隐藏）
  for (const g of ambushGroups) {
    g.triggered = false;
    for (const e of g.enemies) {
      if (e.sprite) {
        try { app.stage.removeChild(e.sprite); } catch (err) { }
        try { e.sprite.destroy(); } catch (err) { }
        e.sprite = null;
      }
      if (e.visionSprite) {
        try { app.stage.removeChild(e.visionSprite); } catch (err) { }
        try { e.visionSprite.destroy(); } catch (err) { }
        e.visionSprite = null;
      }
      if (e.alertSprite) {
        try { app.stage.removeChild(e.alertSprite); } catch (err) { }
        try { e.alertSprite.destroy(); } catch (err) { }
        e.alertSprite = null;
      }
      destroyEnemyLvText(e);
      e.defeated = false;
      e.state = 'patrol';
      e.col = e.spawnCol; e.row = e.spawnRow;
      e.px = (e.spawnCol + 0.5) * tileW * scale;
      e.py = (e.spawnRow + 0.5) * tileH * scale;
    }
  }
}

// 👾 为所有敌人创建 spine（玩家创建后调用，确保 tileW/scale/app 已就绪）
function createAllEnemySprites() {
  for (const e of enemies) {
    if (!e.sprite && !e.defeated) createEnemySprite(e);
  }
  // 玩家保持在敌人之上（敌人后创建会盖住玩家，重新 addChild 移到 stage 末尾）
  if (playerSprite && playerSprite.parent) {
    try { playerSprite.parent.addChild(playerSprite); } catch (err) { }
  }
}

// ========== 道具视觉：由 tiled 对象层瓦片渲染，这里只负责拾取后隐藏对应 Sprite ==========
// 支持可刷新道具图层（items_respawn_*）：传入 layerName 取对应层，默认 dungeon_objects
function getObjectLayer(layerName) {
  return (mapContainer && typeof mapContainer.getLayer === 'function')
    ? mapContainer.getLayer(layerName || 'dungeon_objects') : null;
}
// 🎭 隐藏对象层的调试白框/标记（pixi-tiledmap 会对无瓦片的矩形/椭圆/点/线对象画白色边框标记）。
//    只保留瓦片对象（item 道具等 Sprite），其余（敌人/宝箱/楼梯/感应区/木箱等）视觉均由代码渲染，去掉白框。
function hideObjectLayerBounds() {
  const hideIn = (layer) => {
    if (!layer || !layer.children) return;
    for (const child of layer.children) {
      if (!(child instanceof Sprite)) child.visible = false;
    }
  };
  hideIn(getObjectLayer('dungeon_objects'));
  for (const l of respawnItemLayers || []) hideIn(getObjectLayer(l.layerName));
}
// 隐藏某个道具对应的对象瓦片 Sprite：
//   对象瓦片渲染规则（pixi-tiledmap）：child.x = obj.x，child.y = obj.y - 瓦片高（底边对齐）
//   因此用对象原始像素坐标精确匹配（children 不含 spawn 等不渲染对象，不能用索引）
function hideItemSprite(it) {
  // 🎲 respawn 道具走手动 Sprite（_sprite），优先用 _sprite 控制显隐
  if (it && it._sprite) {
    it._sprite.visible = false;
    return;
  }
  const ol = getObjectLayer(it && it.layerName);
  if (!ol || !it || !ol.children) return;
  const px = it.px, py = it.py - tileH;
  for (const child of ol.children) {
    if (Math.abs(child.x - px) < 0.5 && Math.abs(child.y - py) < 0.5) {
      child.visible = false;
      return;
    }
  }
  // 兜底：按格坐标模糊匹配
  const cx = it.col * tileW, cy = it.row * tileH;
  for (const child of ol.children) {
    if (Math.abs(child.x - cx) < 10 && Math.abs(child.y - cy) < 10) {
      child.visible = false;
      return;
    }
  }
}
// 还原存档：隐藏所有已拾取道具的瓦片
function syncPickedSprites() {
  for (const it of pickupItems) if (it.taken) hideItemSprite(it);
}

// 恢复某个道具对应的对象瓦片 Sprite（重置时让道具重新出现）
function restoreItemSprite(it) {
  if (it && it._sprite) {
    it._sprite.visible = true;
    return;
  }
  const ol = getObjectLayer(it && it.layerName);
  if (!ol || !ol.children) return;
  const px = it.px, py = it.py - tileH;
  for (const child of ol.children) {
    if (Math.abs(child.x - px) < 0.5 && Math.abs(child.y - py) < 0.5) {
      child.visible = true;
      return;
    }
  }
}

// 🎲 随机刷新道具：允许刷新的地形（tiled 瓦片 terrain 属性，含天气映射后的名称）
// 🔄 重置当前层地牢：清空战争迷雾 + 还原所有道具 + 重置木箱/宝箱 + 回到当前层重生点
function resetDungeon() {
  if (showSettle.value || !exploration) return;
  try { localStorage.removeItem(saveKeyForLevel(currentLevel.value)); } catch (e) { /* ignore */ }
  exploration.fill(0);
  for (const it of pickupItems) { it.taken = false; restoreItemSprite(it); }
  // 📦 重置木箱到初始位置 + 解除锁定
  for (const ob of obstacles) {
    if (ob.type !== 'pushable') continue;
    ob.col = ob.initCol; ob.row = ob.initRow;
    ob.px = (ob.initCol + 0.5) * tileW * scale;
    ob.py = (ob.initRow + 0.5) * tileH * scale;
    ob.locked = false;
  }
  renderObstacles();
  // 📦 重置宝箱：隐藏 + 未打开
  for (const chest of chests) {
    if (chest.fromTile) setChestTiles(chest, false); // 🧱 瓦片宝箱恢复未开启瓦片
    chest.visible = false;
    chest.opened = false;
  }
  renderChests();
  // 🎯 重置箱子目标位置触发状态
  for (const t of pushTargets) t.triggered = false;
  // ⚡ 重置感应区触发状态
  for (const t of triggers) { t.triggered = false; t.cooldownTimer = 0; }
  // 🖐️ 重置互动点状态
  for (const it of interactables) { it.triggered = false; }
  nearInteractable.value = null;
  // ⛏️ 重置采集点状态（可重新采集）
  isGathering.value = false;
  gatherProgress.value = 0;
  gatherCurrent = null;
  for (const gp of gatherPoints) { gp.triggered = false; }
  renderGatherSprites();
  // 🚪 重置封印：预封印恢复封锁，感应区封印恢复隐藏，开关重置，对话标记清空
  sealedCells = new Set();
  for (const z of preSealedZones) {
    z.unlocked = false;
    const layer = sealLayers[z.id];
    if (layer) { layer.visible = true; layer.alpha = 1; }
  }
  for (const z of sealZones) {
    z.triggered = false;
    z.unlocked = false;
    const layer = sealLayers[z.id];
    if (layer) { layer.visible = false; layer.alpha = 0; }
  }
  for (const sw of switches) { sw.activated = false; }
  activatedSwitches = new Set();
  dialogueUnlockFlags = new Set();
  // 重新应用预封印的碰撞网格
  for (const z of preSealedZones) {
    for (const [c, r] of z.sealCells) {
      if (c >= 0 && c < mapW && r >= 0 && r < mapH && solidGrid && solidGrid[r]) {
        solidGrid[r][c] = 1;
        sealedCells.add(c + ',' + r);
      }
    }
  }
  // 🔐 重置后重建互动点关联的 seal 层（封锁恢复）
  applyInteractSeals();
  isMoving = false;
  hasMovedAfterEnter = false; // 🚪 重置后回到重生点，移动一次后才检测互动按钮
  clearJoyKeys();
  if (spawnPoint) {
    pCol = spawnPoint.col; pRow = spawnPoint.row;
    targetCol = spawnPoint.col; targetRow = spawnPoint.row;
  }
  pPixelX = (pCol + 0.5) * tileW * scale;
  pPixelY = (pRow + 0.5) * tileH * scale;
  if (playerHeadName !== 'head_front') applyPlayerHead('head_front');
  syncPlayerPos();
  checkNearbyInteractable(); // 🖐️ 重置回重生点后立即清除残留互动按钮
  updateCamera(); // 🎥 重置后镜头回到重生点
  playerCol.value = pCol;
  playerRow.value = pRow;
  updateVisibility();
  // 🌑 重置地牢：清空暗影怪、重置刷新计时（重新从白天计时）
  clearShadowEnemies();
  shadowSpawnStarted = false;
  shadowSpawnTimer = 0;
  shadowSpawnCount = 0;
  shadowSlowTimer = 0;
  ElMessage({ message: L('dungeonResetMsg'), type: 'success', duration: 1800 });
}

// 🎁 重置「每次进入地牢刷新」的宝箱（respawn=true）：回到初始未打开状态
//    普通重新进入地牢时调用（战斗结束返回不刷新，保持当前状态）
function resetRespawnChests() {
  // 🛡️ 地图容器未就绪（首次进入地牢异步初始化中）则跳过：
  //    loadMapForLevel 完成后宝箱从地图重新读取，respawn 宝箱初始即未打开，无需在此重置
  if (!mapContainer) return;
  for (const chest of chests) {
    if (!chest.respawn) continue;
    chest.opened = false;
    chest.visible = chest.showOnStart === true; // 回到初始显隐
    if (chest.fromTile) setChestTiles(chest, false); // 🧱 瓦片宝箱恢复未开启瓦片
  }
  renderChests();
}

// 🎯 统一头像缩放：把 spine 头像缩放到统一尺寸。
//    - dilaoQ（isDilaoQ=true）：复用玩家 scale（同一 dilaoQ + 同一皮肤 → 必然同尺寸，玩家是确认正常的基准）
//    - 自定义 spine（DLanying 等，isDilaoQ=false）：按「宽度 = targetPx」等比缩放，高度 cover 自适应，
//      保证不同 spine 的头像宽度统一（不再因各自宽高比不同而显得小一圈）
function applySpineHeadScale(sprite, targetPx, headName, isDilaoQ) {
  if (!sprite) return;
  try {
    // 确保切换的皮肤已应用
    if (headName && typeof sprite.skeleton?.setSkinByName === 'function') {
      sprite.skeleton.setSkin(null);
      sprite.skeleton.setSkinByName(headName);
      sprite.skeleton.setSlotsToSetupPose?.();
    }
    // ⚠️ dilaoQ 清空动画轨道：避免残留动画（如 dilaoQ 的 'animation'）按动画姿态驱动骨骼，
    //    导致 getLocalBounds 变大 → 头像大一圈。确保只按 setup pose 静态皮肤计算尺寸。
    //    自定义 spine（DLanying 等）需要靠动画显示外观，不清轨道。
    if (isDilaoQ) {
      try { sprite.state?.clearTracks?.(); } catch (e) { }
    }
    sprite.update(0.05);
    // 🎯 统一「宽度 = targetPx，高度等比自适应」缩放（cover，不压扁图像）。
    //    一律用 getLocalBounds().width 宽度基准。实测 dilaoQ/DLanying head_front 的
    //    getLocalBounds 均返回 64（spine-pixi-v8 渲染不乘 atlas scale 0.8），
    //    因此兜底统一用 64（dilaoQ 也用 64，不是 51.2——用 51.2 会让纹理未就绪时 scale 偏大）。
    let s = 0;
    const lb = sprite.getLocalBounds();
    if (isFinite(lb.width) && lb.width > 0) {
      s = targetPx / lb.width;
    } else {
      s = targetPx / 64; // 兜底：纹理未就绪时用已知渲染宽度（dilaoQ/DLanying 均为 64）
    }
    sprite.scale.set(s, s);
    sprite.update(0.05);
  } catch (e) { /* 忽略 */ }
}

// 🧍 玩家 spine：切换方向外观（head_front/back/left/right），不循环播放（静止展示）
// 若骨骼里不存在同名动画，则尝试按同名皮肤处理；都没有则保持当前外观。
function applyPlayerHead(name) {
  if (!playerSprite) return;
  try {
    const data = playerSprite.skeleton?.data;
    if (data?.findAnimation?.(name)) {
      playerSprite.state.setAnimation(0, name, false);
    } else {
      const skin = data?.findSkin?.(name);
      if (skin) { playerSprite.skeleton.setSkin(skin); playerSprite.skeleton.setupPoseSlots?.(); }
    }
    playerHeadName = name;
    // 应用一帧 pose；⚠️ 不同方向皮肤（head_front/back/left/right）原始 bounds 宽高可能不同，
    //    若只在创建时算一次 scale，切换方向后头像大小会变。这里每次切换都重算 scale + 中心偏移。
    //    用 getLocalBounds()（本地坐标、不含 sprite 位移，避免 getBounds 的 world 偏移污染位置）。
    //    宽度固定一格（tileW*scale），高度等比自适应（cover，与敌人/NPC 完全一致）
    playerSprite.update(0.05);
    const lb = playerSprite.getLocalBounds();
    const th = tileW * scale; // 玩家头像宽度固定一格（与敌人/NPC 统一）
    if (isFinite(lb.width) && lb.width > 0) {
      const s = th / lb.width;
      playerSprite.scale.set(s);
      playerSprite.update(0.05);
      const lb2 = playerSprite.getLocalBounds();
      // 缩放后的本地中心偏移 = 原始本地几何中心 × scale（头像视觉中心对齐格子中心）
      playerHeadOff.x = (lb2.x + lb2.width / 2) * s;
      playerHeadOff.y = (lb2.y + lb2.height / 2) * s;
    }
    syncPlayerPos();
  } catch (e) { /* 忽略 */ }
}

// 玩家位置：spine 底部中心对齐格子中心；光圈跟随格子中心
function syncPlayerPos() {
  if (!playerSprite) return;
  playerSprite.x = mapOffsetX + pPixelX - playerHeadOff.x;
  playerSprite.y = mapOffsetY + pPixelY - playerHeadOff.y;

  // 💡 动态光照：夜晚/雾天增强、白天微弱（additive 径向光，照亮周围环境）
  if (playerGlow) {
    const nightV = isDungeonNight() ? (dungeonNightTime || 0) : 0;
    const fogB = currentWeather === 'fog' ? 0.55 : 0;
    const wetB = (currentWeather === 'rain' || currentWeather === 'storm' || currentWeather === 'thunder' || currentWeather === 'snow') ? 0.18 : 0;
    const alpha = Math.min(0.6, 0.12 + nightV * 0.42 + fogB * 0.4 + wetB);
    const radius = tileW * scale * (1.6 + nightV * 2 + fogB * 1.4 + wetB);
    updateLight(playerGlow, mapOffsetX + pPixelX, mapOffsetY + pPixelY, radius, alpha);
  }
}
// ========== 🌊 水面 / 岩浆表面流动动画 ==========
let flowLayer = null;
let flowWaterSprites = [];
let flowMagmaSprites = [];
let magmaBubbles = [];
// ========== 💡 Tiled light 对象 → 动态点光源（火把/篝火/发光物，火焰摇曳） ==========
let mapLightSprites = [];   // [{ s, col, row, radius }]（点光源 Sprite 列表，操作逻辑在 dungeon/terrainFx.js）
// 🕳️ 宝箱 + 可拾取道具软影（位置固定，随镜头同步；懒创建，数量少性能无压力）

// 🎯 cover 遮挡判定：瓦片矩形与玩家身体矩形【真正重叠】才算遮挡玩家（不是按 Y 轴行号一刀切）
//    - 瓦片级容器：精确到单瓦片（label=层#列#行），只有真盖住玩家的那片才遮挡
//    - 列容器（动画层）：该列存在与玩家矩形重叠的瓦片 → 整列视为遮挡（树冠动画需按列整体处理）
function getCoverOcclusion(cl) {
  try {
    const pColF = pPixelX / scale / tileW; // 玩家中心列（浮点）
    const pRowF = pPixelY / scale / tileH; // 玩家脚底行（浮点）
    const pl = pColF - 0.4, pr = pColF + 0.4; // 玩家横向 ±0.4 格
    const pt = pRowF - 0.5, pb = pRowF + 0.3; // 玩家身体：脚底向上仅 0.5 格、向下 0.3 格（Y 轴范围收窄到角色本体，只判真正盖住角色的瓦片）
    const overlaps = (c, r) => c < pr && c + 1 > pl && r < pb && r + 1 > pt;
    const row = coverRowByLabel[cl.label];
    if (row !== undefined) {
      return overlaps(coverColByLabel[cl.label], row);
    }
    const col = coverColByLabel[cl.label];
    const rows = colRows[col];
    if (rows) for (const r of rows) { if (overlaps(col, r)) return true; }
    return false;
  } catch (e) { return false; }
}

// 🎥 镜头跟随：以玩家（插值像素位置）为中心移动地图容器，不可超出地牢地图边界
//   地图大于视口 → 钳制在边界内；地图小于视口 → 居中
function updateCamera() {
  if (!mapContainer || !fogContainer) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mapWpx = mapW * tileW * scale;
  const mapHpx = mapH * tileH * scale;
  let camX = vw / 2 - pPixelX;
  let camY = vh / 2 - pPixelY;
  camX = mapWpx > vw ? Math.min(0, Math.max(vw - mapWpx, camX)) : (vw - mapWpx) / 2;
  camY = mapHpx > vh ? Math.min(0, Math.max(vh - mapHpx, camY)) : (vh - mapHpx) / 2;
  mapContainer.x = camX;
  mapContainer.y = camY;
  mapOffsetX = camX;
  mapOffsetY = camY;
  fogContainer.x = camX;
  fogContainer.y = camY;
  // 🌳 遮挡层：与地图容器同帧同步（同一 camX/camY，避免时序差导致瓦片抖动）
  // 🎯 遮挡判定：瓦片矩形与玩家身体矩形【真正重叠】才算遮挡（不是按 Y 轴行号一刀切）→
  //    只有真盖住玩家的瓦片才盖玩家并半透明，其余瓦片保持不透明、玩家在前
  // 玩家在 stage 的直接子容器（playerSprite 可能深一层，indexOf 会得 -1 导致排序失效）
  let playerTop = playerSprite;
  while (playerTop.parent && playerTop.parent !== app.stage) playerTop = playerTop.parent;
  let needResort = false;
  // 🌫️ 被遮挡时 cover 瓦片半透明（隐约看到玩家）；未被遮挡恢复不透明
  const COVER_DIM_ALPHA = 0.35;
  for (const cl of coverLayers) {
    if (cl.parent !== app.stage) continue;
    cl.x = camX; cl.y = camY;
    if (!playerTop || playerTop.parent !== app.stage) continue;
    const occluded = getCoverOcclusion(cl); // 🎯 瓦片是否真正遮挡玩家（矩形重叠）
    const nextState = occluded ? 'back' : 'front';
    cl.alpha = occluded ? COVER_DIM_ALPHA : 1;
    if (coverSortState[cl.label] === nextState) continue;
    coverSortState[cl.label] = nextState;
    needResort = true;
  }
  if (needResort && playerTop && playerTop.parent === app.stage) resortCoverLayers(playerTop);
}

// 🪜 重排 cover 列容器：列间顺序【永远】按 coverZ 升序（装饰<障碍0<障碍1<障碍2，即 Tiled 图层表顺序）恒定不变，
//    玩家动态插入：无遮挡列 → 玩家插到最上（盖所有 cover，站在树/墙前可见）；
//    有遮挡列 → 玩家插到第一个遮挡列前（被该列及之后所有列盖，即玩家在树/墙后面被遮挡）
//    → 既满足"按安装顺序决定图层覆盖"（层间覆盖关系永不改变），又保证玩家真正在物体后方时才被遮挡
const resortCoverLayers = (playerTop) => {
  try {
    const st = app.stage;
    const layerItems = coverLayers.filter(cl => cl.parent === st);
    for (const cl of layerItems) { try { st.removeChild(cl); } catch (e) { /* ignore */ } }
    try { st.removeChild(playerTop); } catch (e) { /* ignore */ }
    // 🎯 遮挡判定与 updateCamera 完全一致：瓦片矩形与玩家身体矩形真正重叠才算遮挡
    const isBack = (cl) => getCoverOcclusion(cl);
    let insertAt = -1;
    const ordered = [...layerItems].sort((a, b) => (coverZByLabel[a.label] ?? 0) - (coverZByLabel[b.label] ?? 0));
    for (let i = 0; i < ordered.length; i++) {
      const cl = ordered[i];
      st.addChild(cl); // 永远按 coverZ 升序添加 → 层间覆盖顺序恒定（"按安装顺序决定图层覆盖"）
      if (insertAt < 0 && isBack(cl)) insertAt = i; // 第一个遮挡元素（玩家插它前面，被它及之后所有瓦片盖）
      coverSortState[cl.label] = isBack(cl) ? 'back' : 'front';
    }
    if (insertAt < 0) st.addChild(playerTop);
    else st.addChildAt(playerTop, insertAt);
  } catch (e) { /* ignore */ }
};

// ========== 拾取 ==========
function tryPickup() {
  for (const it of pickupItems) {
    if (!it.taken && it.col === pCol && it.row === pRow) {
      it.taken = true;
      playSfx('shiqu'); // 🎒 拾取地牢 item 道具音效（不循环）
      hideItemSprite(it); // 🗑️ 隐藏地图上的道具瓦片
      // 立即加入背包（按物品名合并数量）
      user.addItemToInventory({ name: it.itemId, num: it.num });
      user.trackDungeonStat('pickups', it.num); // 🏆 累计拾取道具数量（成就：拾荒大师）
      // 记录本次会话（结算展示）
      const itImg = resolveItemIcon(it.itemId, it.img);
      const ex = sessionItems.value.find(x => x.name === it.itemId);
      if (ex) { ex.num += it.num; }
      else sessionItems.value.push({ name: it.itemId, num: it.num, img: itImg });
      showPickupTip(it.itemId, it.num, itImg);
    }
  }
}

// ========== 🗺️ 无限层分支路线生成（2 分支差异化 + 节奏门控，只显示下一层） ==========
// 左路 = 资源型（事件/回复），右路 = 挑战型（战斗/强敌/首领）：2 选 1 有真正的取舍
const ROUTE_EVENT_POOL = ['battle', 'elite', 'boss', 'event', 'rest']; // 全部可选类型（isRouteOpen 判断用）
const ROUTE_EVENT_LABELS = { battle: '战斗', elite: '强敌', boss: '首领', event: '事件', rest: '回复' };
const ROUTE_EVENT_WEIGHTS = { battle: 40, elite: 25, event: 25, boss: 10, rest: 10 }; // ⚖️ 全随机权重（首领稀有、回复低频）
const ROUTE_BOSS_EVERY = 8;     // 🏰 首领门控：每 8 层必出首领（第 8/16/24… 层）
const ROUTE_BOSS_COOLDOWN = 6;  // 🏰 首领出现后 6 层内不再出现
const ROUTE_REST_COOLDOWN = 4;     // 🛏️ 恢复层冷却：额外节点出现后 4 层内不再出现（首领前必出除外）
const ROUTE_REST_EXTRA_CHANCE = 0.15; // 🛏️ 恢复层额外节点触发概率（每层判定一次；首领前一层必出）
let lastRouteTypes = [];        // 上一层刷出的类型（连续惩罚用）
let lastBossLevel = -99;        // 🏰 最近一次首领层（初始负值，开局不触发冷却）
let lastRestLevel = -99;        // 🛏️ 最近一次恢复层出现的层（初始负值，开局不触发冷却）
let dungeonRouteType = 'battle'; // 🎭 当前层事件类型（战斗/强敌/首领/事件/回复），敌人强度参考

// 单类型权重（防连出：上一层刷过的类型权重减半）
function routeWeight(t) {
  let w = ROUTE_EVENT_WEIGHTS[t] ?? 20;
  if (lastRouteTypes.includes(t)) w = Math.max(5, Math.round(w * 0.5)); // ⚖️ 上一层刷过 → 权重减半，避免一直刷新出某个事件
  return w;
}

// 从剩余类型加权随机抽一条（防连出：上一层刷过的类型权重减半）并从池中移除
function pickRouteType(types) {
  const wsum = types.reduce((s, t) => s + routeWeight(t), 0);
  let r = Math.random() * wsum;
  let sel = types[types.length - 1];
  for (const t of types) { r -= routeWeight(t); if (r <= 0) { sel = t; break; } }
  types.splice(types.indexOf(sel), 1);
  return sel;
}

// 生成下一层分支路线：
//   基础 2 条 = 战斗/强敌/事件 随机（首领只由每 7 层门控出现，普通层随机池不含首领）
//   🏰 首领前一层：基础 2 条 = 首领 + 战斗
//   🛏️ 恢复层永远是额外第 3 个节点（不占基础 2 条）：首领前一层必出；其他层 15% 概率 + 4 层冷却
function generateNextRoutes(level) {
  const target = (Number(level) || 1) + 1;
  const bossFloor = target % ROUTE_BOSS_EVERY === 0;                    // 🏰 下一层是首领层
  const bossOnCooldown = target - lastBossLevel <= ROUTE_BOSS_COOLDOWN; // 🏰 首领冷却期
  const restOnCooldown = target - lastRestLevel <= ROUTE_REST_COOLDOWN; // 🛏️ 恢复层冷却期
  const types = ['battle', 'elite', 'event']; // 🎯 基础随机池（首领仅门控出现，恢复层不占位）
  const picked = [];
  if (bossFloor) {
    // 🏰 首领前一层：首领 + 战斗（练手/收益），休息层作为额外第 3 节点
    picked.push('boss', 'battle');
  } else {
    if (bossOnCooldown) types.splice(types.indexOf('boss'), 1); // 兜底：冷却期再排一次（池中本无首领）
    const first = pickRouteType(types);
    picked.push(first);
    // ⚖️ 两条路线不能同属「事件/强敌/首领」：第一条落在该类时，第二条限定战斗
    if (['event', 'elite', 'boss'].includes(first)) {
      types.splice(0, types.length, ...types.filter(t => t === 'battle'));
    }
    if (types.length && picked.length < 2) picked.push(pickRouteType(types));
  }
  // 🛏️ 恢复层 = 额外第 3 个节点：首领前一层必出；其他层随机低频（冷却 4 层）
  const restExtra = bossFloor || (!restOnCooldown && Math.random() < ROUTE_REST_EXTRA_CHANCE);
  if (restExtra) picked.push('rest');
  lastRouteTypes = picked.slice();
  if (picked.includes('rest')) lastRestLevel = target; // 🛏️ 记录恢复层出现的层（触发冷却）
  if (picked.includes('boss')) lastBossLevel = target; // 🏰 记录首领层（触发冷却）
  return picked.map((type, i) => ({
    id: 'nxt' + target + '_' + type + '_' + i,
    type,
    label: ROUTE_EVENT_LABELS[type] || '未知',
    targetLevel: target,
    cost: 1,
    dialogLoadData: null,
    dialogRoute: [],
    next: [], // 🔮 只显示下一层，不再预览后续层
  }));
}

// ========== 下楼入口（由互动按钮/空格触发，进入下一层） ==========
function goToNextLevel() {
  if (!stairsPoint || isMoving) return;
  if (stairsPoint.col !== pCol || stairsPoint.row !== pRow) return;
  // 🗺️ 动态生成下一层分支路线（4 类事件平衡随机、无限层，不再有等级/地图限制）
  const routes = generateNextRoutes(currentLevel.value);
  if (routes.length > 0) {
    routeDialogRoutes.value = routes;
    selectedRouteId.value = null;
    resetRouteView(); // 🔍 打开弹窗：重置缩放 + 初始视角定位在当前层（玩家）节点
    showRouteDialog.value = true;
    dungeonPaused = true; // 弹窗期间冻结地牢
    return;
  }
  // 🪜 兜底：无分支时走原三按钮弹窗（取消 / 返回营地 / 进入下一层）
  showStairsDialog.value = true;
  dungeonPaused = true; // 弹窗期间冻结地牢
}

// 取消：关闭弹窗，继续游玩
function cancelStairsDialog() {
  showStairsDialog.value = false;
  dungeonPaused = false;
}

// 返回营地：直接离开地牢
function returnToCamp() {
  showStairsDialog.value = false;
  dungeonPaused = false;
  closeDungeonAndLeave();
}

// ========== 🎪 地牢通用弹窗（事件 / 恢复层 / 首领战利品） ==========
const showDungeonDialog = ref(false);
const dungeonDialog = reactive({ mode: 'choice', title: '', desc: '', options: [], cards: [], onPick: null });
function openDungeonDialog({ mode = 'choice', title = '', desc = '', options = [], cards = [], onPick = null } = {}) {
  dungeonDialog.mode = mode;
  dungeonDialog.title = title; dungeonDialog.desc = desc;
  dungeonDialog.options = options; dungeonDialog.cards = cards; dungeonDialog.onPick = onPick;
  showDungeonDialog.value = true;
  dungeonPaused = true; // 🧊 弹窗期间冻结地牢
}
function closeDungeonDialog() { showDungeonDialog.value = false; dungeonPaused = false; }
// 选项制点击：置灰选项（无 run）不关闭，玩家可改选有效项
function execChoiceOption(opt) {
  if (!opt || !opt.run) return;
  closeDungeonDialog();
  try { opt.run(); } catch (e) { console.error('[地牢弹窗]', e); }
}
// 卡片制点击：选中后执行回调
function execCardPick(c) {
  const cb = dungeonDialog.onPick;
  closeDungeonDialog();
  try { if (cb) cb(c); } catch (e) { console.error('[地牢弹窗]', e); }
}

// 🎁 随机奖励卡：复用抽卡卡池口径（counter-store._buildCardsByRarity：排除 canDraw:false / 特殊 / 独占其他角色）
const RARITY_INFO = {
  common: { label: '普通', quality: 1, weight: 40 },
  excellent: { label: '优秀', quality: 2, weight: 35 },
  rare: { label: '稀有', quality: 3, weight: 20 },
  epic: { label: '史诗', quality: 4, weight: 5 },
  legendary: { label: '传说', quality: 5, weight: 0 }, // weight 0：不进首领加权池
};
function rarityLabel(r) { return RARITY_INFO[r]?.label || r || ''; }
function randomRewardCard(exclude = [], weighted = false) {
  const byRarity = user._buildCardsByRarity?.() || {};
  if (weighted) {
    // 🎯 按稀有度权重选组（weight>0 才进池），组内均匀随机
    const entries = Object.entries(RARITY_INFO)
      .filter(([, info]) => info.weight > 0)
      .map(([r, info]) => ({ r, w: info.weight, cards: (byRarity[r] || []).filter(c => !exclude.includes(c.name)) }))
      .filter(e => e.cards.length);
    if (!entries.length) return null;
    const total = entries.reduce((sum, e) => sum + e.w, 0);
    let roll = Math.random() * total;
    for (const e of entries) {
      roll -= e.w;
      if (roll < 0) return e.cards[Math.floor(Math.random() * e.cards.length)].name;
    }
    return entries[entries.length - 1].cards[Math.floor(Math.random() * entries[entries.length - 1].cards.length)].name;
  }
  const names = Object.values(byRarity).flat().map(c => c.name).filter(n => !exclude.includes(n));
  return names.length ? names[Math.floor(Math.random() * names.length)] : null;
}

// 🃏 构造卡片选择数据（首领三选一 / 恢复层强化选卡共用；descFn 可定制描述）
function buildCardPickData(names, descFn) {
  return (names || []).map(n => {
    const d = user.pixi.player.CARD_DATA[n] || {};
    const raw = (descFn ? descFn(n, d) : (d.desc || '')).trim();
    return {
      type: 'card',
      name: n,
      rarity: d.rarity || 'common',
      color: d.color || '#fff',
      star: d.star || 1,
      desc: raw || rarityLabel(d.rarity || 'common') + '卡牌', // 🛡️ 空描述兜底显示稀有度
    };
  });
}

// 💸 扣生命（按最大生命百分比，至少 1），返回实际扣除量
function payHp(percent) {
  const j = user.pixi?.player?.juese;
  if (!j) return 0;
  const dmg = Math.max(1, Math.round((j.maxHp || 100) * percent));
  j.hp = Math.max(1, (j.hp || 1) - dmg);
  return dmg;
}

// ✨ 发放卡牌 + 提示（首领三选一 / 事件免费卡 / 恢复层强化共用）
function grantCard(name, star, msg) {
  if (!name) return;
  user.addCardToInventory(name, 1, star);
  ElMessage({ message: msg || ('✨ 获得卡牌：' + name), type: 'success', duration: 2200 });
}
// 🎁 发放物品 + 提示（宝箱 / 祭坛金币共用）
function grantItem(name, num, msg) {
  if (!name) return;
  user.addItemToInventory({ name, num });
  ElMessage({ message: msg || ('🎁 获得 ' + name + ' ×' + num), type: 'success', duration: 2200 });
}

// 👑 首领战利品：混合奖励三选一（保证 1 张品质加权卡 + 2 个随机条目：卡/金币/道具）
function buildBossRewardEntry() {
  const t = Math.random();
  if (t < 0.55) {
    // 🃏 品质加权卡牌
    const c = randomRewardCard([], true);
    if (c) {
      const d = user.pixi.player.CARD_DATA[c] || {};
      return { type: 'card', name: c, rarity: d.rarity || 'common', color: d.color || '#fff', star: d.star || 1, num: 1, desc: (d.desc || '').trim().slice(0, 42) || rarityLabel(d.rarity || 'common') + '卡牌' };
    }
    // 卡池空 → 兜底金币
    const num = 40 + currentLevel.value * 5;
    return { type: 'gold', name: '金币', rarity: '金币', color: '#fbbf24', num, desc: '获得 ' + num + ' 金币' };
  }
  if (t < 0.85) {
    // 💰 金币（随层数成长）
    const num = 40 + currentLevel.value * 5;
    return { type: 'gold', name: '金币', rarity: '金币', color: '#fbbf24', num, desc: '获得 ' + num + ' 金币' };
  }
  // 💎 道具（魔晶，数量随层数成长）
  const num = 2 + Math.floor(currentLevel.value / 5);
  return { type: 'item', name: '魔晶LV1', rarity: '道具', color: '#9ca3af', num, desc: '获得 魔晶LV1 ×' + num };
}
function openBossReward() {
  const picks = [];
  picks.push(buildBossRewardEntry()); // 首位：随机条目（大概率是卡）
  for (let i = 0; i < 8 && picks.length < 3; i++) { // 🛡️ 去重：同类型同内容不重复（避免三张金币/同一卡）
    const e = buildBossRewardEntry();
    if (picks.some(p => p.type === e.type && p.name === e.name)) continue;
    picks.push(e);
  }
  if (!picks.length) return;
  openDungeonDialog({
    mode: 'cardpick',
    title: '👑 首领战利品',
    desc: '击败首领，从三个奖励中选择一个获得：',
    cards: picks,
    onPick: (c) => {
      if (c.type === 'card') grantCard(c.name);
      else grantItem(c.name, c.num, '✨ 获得 ' + c.name + ' ×' + c.num);
    },
  });
}

// 🛏️ 恢复层二选一：回血 30% / 复制一张已携带卡牌（同名同星副本，不改星级）
function openRestChoice() {
  const j = user.pixi?.player?.juese;
  if (!j) return; // 🛡️ 角色数据未就绪时兜底回血
  const heal = Math.round((j.maxHp || 100) * 0.3);
  const deck = user.pixi?.player?.deck || [];
  // 📄 复制品质随层数解锁（稀有度品质：1普通/2优秀/3稀有/4史诗/5传说）
  //    <8 层：仅品质1（普通） / <16 层：品质≤3（普通~稀有） / ≥16 层：不限品质
  const maxQuality = (currentLevel.value || 1) >= 16 ? Infinity : ((currentLevel.value || 1) >= 8 ? 3 : 1);
  const copiable = [...new Set(deck)].filter(n => {
    const d = user.pixi.player.CARD_DATA?.[n];
    return d && (RARITY_INFO[d.rarity || 'common']?.quality || 1) <= maxQuality;
  }); // 📄 可复制：当前卡组去重 + 品质上限
  openDungeonDialog({
    mode: 'choice',
    title: '🛏️ 恢复层',
    desc: '这里是安全的庇护所，选择一项：',
    options: [
      { label: '💚 回复 ' + heal + ' 点生命（30% 最大生命）', run: () => {
        user.healPlayer(heal);
        ElMessage({ message: '💚 已回复 ' + heal + ' 点生命', type: 'success', duration: 2200 });
      } },
      { label: copiable.length ? '📄 复制一张已携带卡牌（品质≤' + (maxQuality === Infinity ? '不限' : maxQuality) + '）' : '📄 当前无品质≤' + (maxQuality === Infinity ? '不限' : maxQuality) + '卡牌可复制', run: copiable.length ? () => {
        openDungeonDialog({
          mode: 'cardpick',
          title: '📄 复制卡牌',
          desc: '选择一张品质≤' + (maxQuality === Infinity ? '不限' : maxQuality) + ' 的卡牌，获得同名同星副本（当前层共 ' + copiable.length + ' 张可选）：',
          cards: buildCardPickData(copiable, (n, d) => '复制后获得同名同星（' + (d.star || 1) + ' 星）卡牌 ×1'),
          onPick: (c) => {
            const cur = user.pixi.player.CARD_DATA[c.name]?.star || 1;
            grantCard(c.name, cur, '📄 已复制 ' + c.name + '（' + cur + ' 星）');
          },
        });
      } : null },
    ],
  });
}

// ❓ 事件层：进层触发随机小事件（选项制；连续不重复 + 奖励随层数成长）
let lastDungeonEventIndex = -1; // ❓ 上一次事件索引（防连续重复）
function rollDungeonEvent() {
  const j = user.pixi?.player?.juese;
  if (!j) return; // 🛡️ 角色数据未就绪时不触发事件
  const mh = j.maxHp || 100;
  const floor = currentLevel.value || 1; // 🏗️ 当前层数（奖励成长基准）
  const gold1 = 20 + floor * 2; // ⚱️ 祭坛献祭金币
  const gold2 = 25 + floor * 2; // 💎 宝箱金币
  const gold3 = 15 + floor * 2; // 🏺 泉水金币
  const gemN = 2 + Math.floor(floor / 5); // 💎 宝箱魔晶数量
  const events = [
    {
      title: '⚱️ 古老祭坛', desc: '一座布满苔藓的祭坛，似乎愿意回应祈祷。',
      options: [
        { label: '🙏 献祭 15% 生命，换取 ' + gold1 + ' 金币', run: () => {
          const dmg = payHp(0.15);
          grantItem('金币', gold1, '⚱️ 失去 ' + dmg + ' 生命，获得 ' + gold1 + ' 金币');
        } },
        { label: '🧘 静坐冥想，回复 20% 生命', run: () => {
          const h = Math.round(mh * 0.2);
          user.healPlayer(h);
          ElMessage({ message: '🧘 回复 ' + h + ' 点生命', type: 'success', duration: 2200 });
        } },
        { label: '🚪 转身离开', run: null },
      ],
    },
    {
      title: '🃏 流浪牌商', desc: '他掀开斗篷，露出几张泛光的卡牌。',
      options: [
        { label: '🃏 免费获得一张随机卡牌', run: () => grantCard(randomRewardCard()) },
        { label: '🧬 以 10% 生命换取 1 点天赋点', run: () => {
          const dmg = payHp(0.1);
          user.pixi.player.talentPoints = (user.pixi.player.talentPoints || 0) + 1;
          ElMessage({ message: '🧬 失去 ' + dmg + ' 生命，天赋点 +1', type: 'warning', duration: 2200 });
        } },
        { label: '🚪 离开', run: null },
      ],
    },
    {
      title: '🎁 尘封的宝箱', desc: '一个上锁的宝箱，锁扣已被时间锈蚀。',
      options: [
        { label: '🔓 撬开：获得 魔晶LV1 ×' + gemN, run: () => grantItem('魔晶LV1', gemN, '🔓 获得 魔晶LV1 ×' + gemN) },
        { label: '💎 砸开：获得 ' + gold2 + ' 金币', run: () => grantItem('金币', gold2, '💎 获得 ' + gold2 + ' 金币') },
        { label: '🚪 离开', run: null },
      ],
    },
    {
      title: '🏺 神秘泉水', desc: '一汪清泉在石缝间汩汩流动，散发着微光。',
      options: [
        { label: '💧 痛饮泉水：回复 25% 生命', run: () => {
          const h = Math.round(mh * 0.25);
          user.healPlayer(h);
          ElMessage({ message: '💧 回复 ' + h + ' 点生命', type: 'success', duration: 2200 });
        } },
        { label: '🪙 取水出售：获得 ' + gold3 + ' 金币', run: () => grantItem('金币', gold3, '🪙 获得 ' + gold3 + ' 金币') },
        { label: '🚪 离开', run: null },
      ],
    },
    {
      title: '🗿 被诅咒的雕像', desc: '一尊咧嘴大笑的雕像，似乎在邀请你触摸它。',
      options: [
        { label: '👆 触摸雕像（50% 获得 3 天赋点 / 50% 失去 20% 生命）', run: () => {
          if (Math.random() < 0.5) {
            user.pixi.player.talentPoints = (user.pixi.player.talentPoints || 0) + 3;
            ElMessage({ message: '✨ 雕像低语：天赋点 +3', type: 'success', duration: 2200 });
          } else {
            const dmg = payHp(0.2);
            ElMessage({ message: '💀 雕像狞笑：失去 ' + dmg + ' 点生命', type: 'warning', duration: 2200 });
          }
        } },
        { label: '🚪 离开', run: null },
      ],
    },
    {
      title: '🥾 拾荒者的遗物', desc: '一堆旧物间散落着几颗魔晶。',
      options: [
        { label: '🎒 翻找：随机获得 1-3 个魔晶LV1', run: () => {
          const n = 1 + Math.floor(Math.random() * 3);
          grantItem('魔晶LV1', n, '🎒 获得 魔晶LV1 ×' + n);
        } },
        { label: '🚪 离开', run: null },
      ],
    },
  ];
  let idx = Math.floor(Math.random() * events.length);
  if (events.length > 1 && idx === lastDungeonEventIndex) idx = (idx + 1) % events.length; // 🔁 连续两次不进同一事件
  lastDungeonEventIndex = idx;
  const ev = events[idx];
  openDungeonDialog({ mode: 'choice', title: ev.title, desc: ev.desc, options: ev.options });
}

// ========== 🗺️ 路线选择弹窗（杀戮尖塔2风格） ==========
// 递归查找分支（含 next 子树）
function findRouteById(list, id) {
  if (!list) return null;
  for (const b of list) {
    if (b.id === id) return b;
    if (b.next && b.next.length) {
      const f = findRouteById(b.next, id);
      if (f) return f;
    }
  }
  return null;
}
const selectedRoute = computed(() => findRouteById(routeDialogRoutes.value, selectedRouteId.value));
// ========== 🗺️ 路线地图画布（可拖拽 + 动画） ==========
const ROUTE_CANVAS_W = 820, ROUTE_CANVAS_H = 540;
const routeCanvasRef = ref(null);
const canvasScale = ref(1); // 🔍 路线画布缩放倍率（1 = 适配容器基准）
const ROUTE_SCALE_MIN = 0.5, ROUTE_SCALE_MAX = 2.5;
let routeLayoutNodes = [];     // 布局节点 [{id,type,label,targetLevel,branch,depth,px,py,seed,children}]
let routePan = { x: 0, y: 0 }; // 画布平移偏移
let routePanStart = null;      // 拖拽起点（相对画布 CSS 像素）
let routeDragging = false;
let routeAnimId = null;
let routeHoverId = null;
const ROUTE_TYPE_COLORS = {
  battle: '#ef4444', elite: '#8b5cf6', chest: '#f59e0b', shop: '#22c55e',
  rest: '#3b82f6', event: '#ec4899', boss: '#dc2626', mystery: '#64748b', current: '#fbbf24',
};
// 构建树形布局（自底向上：当前层 → 分支 → 后续预览）
function buildRouteLayout() {
  const W = ROUTE_CANVAS_W, H = ROUTE_CANVAS_H;
  const toNode = (b, depth) => ({
    id: b.id, type: b.type, label: b.label, targetLevel: b.targetLevel, branch: b,
    depth, seed: Math.random() * 10, children: (b.next || []).map(n => toNode(n, depth + 1)),
  });
  const root = {
    id: '__root__', type: 'current', label: '当前层 · 第 ' + currentLevel.value + ' 层',
    targetLevel: currentLevel.value, branch: null, depth: 0, seed: 5,
    children: routeDialogRoutes.value.map(b => toNode(b, 1)),
  };
  const leafCount = (n) => n.children.length ? n.children.reduce((s, c) => s + leafCount(c), 0) : 1;
  const assign = (n, left, right, depth) => {
    n.px = (left + right) / 2 * W;
    n.py = H - 64 - depth * 178;
    let cl = left;
    for (const c of n.children) {
      const w = leafCount(c) / leafCount(n);
      assign(c, cl, cl + w * (right - left), depth + 1);
      cl += w * (right - left);
    }
  };
  assign(root, 0.1, 0.9, 0);
  routeLayoutNodes = [];
  const collect = (n) => { routeLayoutNodes.push(n); n.children.forEach(collect); };
  collect(root);
}
// 节点颜色
function routeColor(type) { return ROUTE_TYPE_COLORS[type] || '#94a3b8'; }
// 节点显示态：当前层亮 / 分支按地图开放 / 预览节点（depth≥2）半透明不可交互
function routeNodeOpen(n) { return n.depth === 0 ? true : n.depth === 1 ? isRouteOpen(n.branch) : false; }
// 节点可交互：仅下一层（depth===1）且目标层有地图的分支节点
function routeInteractive(n) { return n.depth === 1 && !!n.branch && isRouteOpen(n.branch); }
// 十六进制 → rgba
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function lighten(hex, f) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return 'rgb(' + Math.min(255, ((n >> 16) & 255) + 255 * f) + ',' + Math.min(255, ((n >> 8) & 255) + 255 * f) + ',' + Math.min(255, (n & 255) + 255 * f) + ')';
}
function darken(hex, f) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return 'rgb(' + Math.round(((n >> 16) & 255) * (1 - f)) + ',' + Math.round(((n >> 8) & 255) * (1 - f)) + ',' + Math.round((n & 255) * (1 - f)) + ')';
}
// 绘制单条连线（虚线流动 + 光点）
function drawRouteLink(ctx, from, to, t, i) {
  const x1 = from.px + routePan.x, y1 = from.py + routePan.y;
  const x2 = to.px + routePan.x, y2 = to.py + routePan.y;
  const ctrlX = (x1 + x2) / 2, ctrlY = (y1 + y2) / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
  ctx.setLineDash([5, 9]);
  ctx.lineDashOffset = -t * 36 + i * 11;
  ctx.strokeStyle = 'rgba(251,191,36,0.32)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  // 流动光点
  const p = (t * 0.45 + i * 0.17) % 1;
  const mx = (1 - p) * (1 - p) * x1 + 2 * (1 - p) * p * ctrlX + p * p * x2;
  const my = (1 - p) * (1 - p) * y1 + 2 * (1 - p) * p * ctrlY + p * p * y2;
  ctx.beginPath(); ctx.arc(mx, my, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(251,191,36,0.95)'; ctx.fill();
}
// 绘制单个节点
function drawRouteNode(ctx, n, t) {
  const cx = n.px + routePan.x, cy = n.py + routePan.y;
  const r = 34;
  const open = routeNodeOpen(n);
  const selected = n.id === selectedRouteId.value;
  const hover = n.id === routeHoverId;
  const col = routeColor(n.type);
  const breathe = r * (1 + 0.09 * Math.sin(t * 2.4 + n.seed));
  const glowR = breathe * (selected ? 2.2 : hover ? 1.9 : 1.55);
  ctx.save();
  ctx.globalAlpha = open ? 1 : 0.38;
  // 光晕（呼吸）
  const g = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, glowR);
  g.addColorStop(0, selected ? 'rgba(251,191,36,0.55)' : hexA(col, 0.4));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();
  // 主体（宝石渐变）
  const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.15, cx, cy, r);
  body.addColorStop(0, lighten(col, 0.55));
  body.addColorStop(0.55, col);
  body.addColorStop(1, darken(col, 0.55));
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = body; ctx.fill();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? '#fbbf24' : 'rgba(226,232,240,0.65)';
  ctx.stroke();
  // 选中脉冲光环
  if (selected) {
    const pr = r + 9 + 4 * Math.sin(t * 5);
    ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
    ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(251,191,36,0.85)'; ctx.stroke();
  }
  // 图标
  ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(routeIcon(n.type), cx, cy - 3);
  // 标签
  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#f1f5f9';
  ctx.fillText(n.label, cx, cy + r + 17);
  // Lv
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#94a3b8';
  ctx.fillText('Lv.' + n.targetLevel, cx, cy + r + 33);
  if (!open && n.depth === 1) { ctx.font = '15px serif'; ctx.fillText('🔒', cx, cy + r + 47); }
  ctx.restore();
}
// 主绘制
function drawRouteMap() {
  const canvas = routeCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = ROUTE_CANVAS_W, H = ROUTE_CANVAS_H;
  const t = performance.now() / 1000;
  ctx.clearRect(0, 0, W, H);
  // 背景渐变
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0e1c');
  bg.addColorStop(0.5, '#141229');
  bg.addColorStop(1, '#1c1533');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // 星空点阵（随平移轻微流动）
  for (let i = 0; i < 90; i++) {
    const sx = ((i * 137.5 + routePan.x * 0.25) % W + W) % W;
    const sy = ((i * 89.3 + routePan.y * 0.25) % H + H) % H;
    const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + i);
    ctx.globalAlpha = 0.1 + 0.12 * tw;
    ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 连线（先画，节点覆盖在上）
  let linkI = 0;
  for (const n of routeLayoutNodes) {
    for (const c of n.children) drawRouteLink(ctx, n, c, t, linkI++);
  }
  // 节点（当前层在底部优先）
  const sorted = [...routeLayoutNodes].sort((a, b) => a.depth - b.depth);
  for (const n of sorted) drawRouteNode(ctx, n, t);
  // 底部小字提示
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(148,163,184,0.55)';
}
// 🔍 打开弹窗重置视图：缩放 100% + 初始视角定位在玩家所在区域（当前层节点，显示在画布下方 1/3 处）
function resetRouteView() {
  canvasScale.value = 1;
  const H = ROUTE_CANVAS_H;
  const rootY = H - 64;                        // root（当前层·第X层）节点逻辑 y
  routePan = { x: 0, y: H * (2 / 3) - rootY }; // 让玩家节点落在画布下方 1/3，分支在上方
}
// 🔍 画布缩放：按钮 + 滚轮（有最小/最大值）
function routeZoomIn() {
  canvasScale.value = Math.min(ROUTE_SCALE_MAX, +((canvasScale.value || 1) * 1.15).toFixed(2));
}
function routeZoomOut() {
  canvasScale.value = Math.max(ROUTE_SCALE_MIN, +((canvasScale.value || 1) / 1.15).toFixed(2));
}
function onRouteCanvasWheel(e) {
  const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  canvasScale.value = Math.min(ROUTE_SCALE_MAX, Math.max(ROUTE_SCALE_MIN, +((canvasScale.value || 1) * delta).toFixed(2)));
}
// 初始化画布
function initRouteCanvas() {
  const canvas = routeCanvasRef.value;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = ROUTE_CANVAS_W * dpr;
  canvas.height = ROUTE_CANVAS_H * dpr;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  routePan = { x: 0, y: 0 };
  routeHoverId = null;
  buildRouteLayout();
}
// 动画循环
function startRouteAnim() {
  stopRouteAnim();
  const loop = () => {
    if (!showRouteDialog.value) { routeAnimId = null; return; }
    drawRouteMap();
    routeAnimId = requestAnimationFrame(loop);
  };
  routeAnimId = requestAnimationFrame(loop);
}
function stopRouteAnim() {
  if (routeAnimId) { cancelAnimationFrame(routeAnimId); routeAnimId = null; }
}
// 命中测试（相对画布 CSS 坐标 → 逻辑坐标）
function routeHitTest(cx, cy) {
  const canvas = routeCanvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const sx = (cx - rect.left) * (ROUTE_CANVAS_W / rect.width);
  const sy = (cy - rect.top) * (ROUTE_CANVAS_H / rect.height);
  for (const n of routeLayoutNodes) {
    if (Math.hypot(n.px + routePan.x - sx, n.py + routePan.y - sy) <= 40) return n;
  }
  return null;
}
// 拖拽 + 点击
function onRouteCanvasDown(e) {
  const rect = routeCanvasRef.value.getBoundingClientRect();
  routePanStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, px: routePan.x, py: routePan.y };
  routeDragging = false;
  try { routeCanvasRef.value.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
}
function onRouteCanvasMove(e) {
  if (!routePanStart) return;
  const rect = routeCanvasRef.value.getBoundingClientRect();
  const dx = e.clientX - rect.left - routePanStart.x;
  const dy = e.clientY - rect.top - routePanStart.y;
  if (Math.abs(dx) + Math.abs(dy) > 6) routeDragging = true;
  if (routeDragging) {
    const inv = canvasScale.value || 1; // 逻辑坐标 = CSS 位移 / 缩放倍率
    routePan.x = routePanStart.px + dx / inv;
    routePan.y = routePanStart.py + dy / inv;
    routeHoverId = null;
  } else {
    const n = routeHitTest(e.clientX, e.clientY);
    routeHoverId = n && routeInteractive(n) ? n.id : null;
  }
}
function onRouteCanvasUp(e) {
  if (!routeDragging && routePanStart) {
    const n = routeHitTest(e.clientX, e.clientY);
    if (n && routeInteractive(n)) {
      selectRoute(n.branch);
      console.log('进入下一层'); // 🖥️ 点击下一层节点：打印进入下一层
    }
  }
  routePanStart = null;
  routeDragging = false;
}
// 弹窗开关时初始化画布 / 停止动画
watch(showRouteDialog, (v) => {
  if (v) {
    nextTick(() => { initRouteCanvas(); startRouteAnim(); });
  } else {
    stopRouteAnim();
  }
});
onBeforeUnmount(() => stopRouteAnim());

// 分支是否开放：无限层无等级/地图限制，4 类事件类型即可选
function isRouteOpen(branch) {
  return !!(branch && ROUTE_EVENT_POOL.includes(branch.type));
}
// 分支类型图标
function routeIcon(type) {
  return ROUTE_TYPE_ICONS[type] || '❓';
}
// 选中分支（未开放不可选）
function selectRoute(branch) {
  if (!isRouteOpen(branch)) return;
  selectedRouteId.value = branch.id;
}
// 取消路线选择：关闭弹窗继续游玩
function cancelRouteDialog() {
  showRouteDialog.value = false;
  dungeonPaused = false;
}
// 路线弹窗：返回营地
function returnToCampFromRoute() {
  showRouteDialog.value = false;
  dungeonPaused = false;
  closeDungeonAndLeave();
}
// 确认进入所选路线
function confirmEnterRoute() {
  const branch = selectedRoute.value;
  if (!branch) return;
  showRouteDialog.value = false;
  dungeonPaused = false;
  dungeonRouteType = branch.type; // 🎭 记录本层事件类型（战斗/强敌/首领/事件/回复），敌人强度参考
  user.pixi.player._routeType = branch.type; // 🎭 持久化本层类型（战斗结束组件重建后判断首领层/恢复层用）
  // 💬 下楼后对话：分支配置优先，回退层配置
  const dl = branch.dialogLoadData ?? stairsPoint.dialogLoadData;
  const dr = branch.dialogRoute ?? stairsPoint.dialogRoute;
  pendingStairsDialogue = dl ? { dialogLoadData: dl, dialogRoute: dr } : null;
  changeLevel(branch.targetLevel);
}

// 进入下一层：消耗对应精力后前往下一层
function confirmEnterNextLevel() {
  showStairsDialog.value = false;
  dungeonPaused = false;
  dungeonRouteType = 'battle'; // 🎭 普通楼梯直接下楼 = 普通层（防止残留事件/恢复/首领层类型误带入新层）
  user.pixi.player._routeType = 'battle';
  // 💬 保存下楼后待触发的对话配置（进入下一层后触发）
  if (stairsPoint.dialogLoadData) {
    pendingStairsDialogue = {
      dialogLoadData: stairsPoint.dialogLoadData,
      dialogRoute: stairsPoint.dialogRoute,
    };
  } else {
    pendingStairsDialogue = null;
  }
  changeLevel(stairsPoint.targetLevel);
}

// 🚪 直接离开地牢（返回营地）
function closeDungeonAndLeave() {
  try { saveDungeonStateNow?.(); } catch (e) { /* ignore */ }
  // 🎭 离开地牢重置本层类型（防下一趟普通层战斗胜利误判首领层；首领奖励标记 _pendingBossReward 保留，未领则下趟补发）
  if (user.pixi?.player) user.pixi.player._routeType = 'battle';
  emit('close');
}

// ========== 🌦️ 天气滤镜与氛围层 ==========
// 🔥 岩浆替换：雨天/暴风雨/雷雨天岩浆被浇灭变泥地（视觉变泥地瓦片，泥地减速）；
//    雪天岩浆被冻结为石板；非雨/雪类天气还原岩浆瓦片。
//    用 pixi-tiledmap 的 setTile 替换。terrain_tiles：localId=4 泥地、localId=5 石板、localId=7 岩浆
async function updateMagmaCover() {
  // 🌧️ 雨类（雨天/暴风雨/雷雨天）岩浆被浇灭变泥地；❄️ 雪天岩浆被冻结为石板
  const isMud = currentWeather === 'rain' || currentWeather === 'storm' || currentWeather === 'thunderstorm';
  const isFreeze = currentWeather === 'snow';
  if (!mapContainer || typeof mapContainer.getTile !== 'function' || typeof mapContainer.setTile !== 'function') return;
  const LAYER_NAME = getFloorLayerName(); // 🧱 动态取含岩浆的瓦片层（dungeon.tmj=地板 / dungeon2.tmj=地板与墙壁）
  // 🗺️ 动态从当前地图 tileset 构建 terrain 瓦片映射（兼容不同地图的瓦片集结构：
  //    dungeon.tmj 的 object 集合瓦片 / dungeon3.tmj 的 terrain_tiles 网格瓦片）
  const terrMap = buildTerrainTileMap();
  const magmaTile = terrMap['岩浆'] || null; // { tsIndex, localId }
  const mudTile = terrMap['泥地'] || null;
  const slabTile = terrMap['石板'] || null;
  // ❄️ 雪天冻结水格：浅水/深水 → 冰面
  //    收集当前地图所有冰面瓦片，按格子位置轮流使用，拼成连续一大块（不再只用同一格）
  const iceTiles = collectIceTiles();
  const iceLocalKeys = new Set(iceTiles.map(t => t.tsIndex + '_' + t.localId));
  const setTileLocal = (col, row, localId, tsIndex) => {
    let t = null;
    try { t = mapContainer.getTile(LAYER_NAME, col, row); } catch (e) { t = null; }
    if (!t) return;
    if (t.localId === localId && t.tilesetIndex === tsIndex) return;
    const next = {
      localId,
      tileset: tsIndex,
      horizontalFlip: !!t.horizontalFlip,
      verticalFlip: !!t.verticalFlip,
      diagonalFlip: !!t.diagonalFlip,
    };
    try { mapContainer.setTile(LAYER_NAME, col, row, next); } catch (e) { /* 单格失败跳过 */ }
  };
  // 在当前格瓦片所属 tileset 里找对应 terrain 的瓦片；找不到则用全局映射兜底
  const pickTarget = (cell, targetTerrain) => {
    let t = null;
    try { t = mapContainer.getTile(LAYER_NAME, cell.col, cell.row); } catch (e) { t = null; }
    if (!t) return null;
    // ① 优先当前格 tileset 的该 terrain
    const tsDef = curMapData?.tilesets?.[t.tilesetIndex];
    if (tsDef?.tiles) {
      for (const [localId, def] of tsDef.tiles) {
        const props = def?.properties;
        if (!props) continue;
        const terr = props.find(p => p.name === 'terrain')?.value;
        if (terr === targetTerrain) return { tsIndex: t.tilesetIndex, localId: Number(localId) };
      }
    }
    // ② 兜底：全局映射
    return terrMap[targetTerrain] || null;
  };
  try {
    // 🔥 岩浆 → 泥地（雨类）/ 石板（雪天），否则还原岩浆
    for (const cell of magmaCells) {
      const target = isMud ? '泥地' : isFreeze ? '石板' : '岩浆';
      const want = pickTarget(cell, target);
      if (!want) continue;
      setTileLocal(cell.col, cell.row, want.localId, want.tsIndex);
    }

    // ❄️ 雪天：水格 → 冰面（按位置轮流取冰面瓦片）；非雪天还原为原水瓦片（记录的原 tsIndex/localId）
    for (const cell of waterCells) {
      if (currentWeather === 'snow') {
        if (iceTiles.length) {
          const pick = iceTiles[(cell.col + cell.row) % iceTiles.length];
          setTileLocal(cell.col, cell.row, pick.localId, pick.tsIndex);
        }
      } else {
        // 读取当前格瓦片：若是冰面瓦片（集合内任一）则还原为水瓦片
        let t = null;
        try { t = mapContainer.getTile(LAYER_NAME, cell.col, cell.row); } catch (e) { t = null; }
        const isIce = !!(t && iceLocalKeys.has(t.tilesetIndex + '_' + t.localId));
        if (isIce) {
          setTileLocal(cell.col, cell.row, cell.origLocal ?? 1, cell.origTs ?? 0); // 原水瓦片
        }
      }
    }

  } catch (e) { /* ignore */ }
}

// ❄️ 收集当前地图所有 terrain=冰面 瓦片（按 localId 排序），供雪天把水格变成连续大块冰面
function collectIceTiles() {
  const list = [];
  if (!curMapData?.tilesets) return list;
  curMapData.tilesets.forEach((ts, tsIndex) => {
    if (!ts?.tiles) return;
    for (const [localId, def] of ts.tiles) {
      const props = def?.properties;
      if (!props) continue;
      const terr = props.find(p => p.name === 'terrain')?.value;
      if (terr === '冰面') list.push({ tsIndex, localId: Number(localId) });
    }
  });
  list.sort((a, b) => a.localId - b.localId);
  return list;
}

// 🗺️ 从当前地图 mapData.tilesets 构建 terrain 瓦片映射：terrain名 → { tsIndex, localId }（每个 terrain 取第一个匹配瓦片）
function buildTerrainTileMap() {
  const map = {};
  if (!curMapData?.tilesets) return map;
  curMapData.tilesets.forEach((ts, tsIndex) => {
    if (!ts?.tiles) return;
    for (const [localId, def] of ts.tiles) {
      const props = def?.properties;
      if (!props) continue;
      const terr = props.find(p => p.name === 'terrain')?.value;
      if (terr && !map[terr]) {
        map[terr] = { tsIndex, localId: Number(localId) };
      }
    }
  });
  return map;
}

// 🧱 动态获取含岩浆瓦片的瓦片层名（兼容不同地图的层名：dungeon.tmj 用「地板」、dungeon2.tmj 用「地板与墙壁」）
function getFloorLayerName() {
  const layers = (curMapData?.layers || []).filter(l => l.type === 'tilelayer');
  if (!layers.length) return '地板与墙壁';
  if (layers.length === 1) return layers[0].name;
  // 多瓦片层：优先含岩浆瓦片的层
  const magmaLocalIds = new Set();
  for (const ts of curMapData.tilesets || []) {
    for (const [id, def] of ts.tiles || []) {
      const terr = (def?.properties || []).find(p => p.name === 'terrain')?.value;
      if (terr === '岩浆') magmaLocalIds.add(Number(id));
    }
  }
  for (const l of layers) {
    const arr = l.chunks && l.chunks.length ? l.chunks.flatMap(c => c.tiles || []) : (l.tiles || []);
    if (arr.some(t => t && t.localId !== undefined && magmaLocalIds.has(t.localId))) return l.name;
  }
  return layers[0].name;
}
// 天气滤镜应用到地图容器（只影响地图瓦片/障碍/宝箱，不影响玩家/敌人头像）
// 🌙 地牢天黑判定（黑夜进度超过阈值视为夜间）
function _nightAfterSec() {
  return DUNGEON_NIGHT_AFTER_SEC;
}
function isDungeonNight() {
  // ⚔️ 普通模式：天黑进度由「每进入下一层 +15%」推进，进度满 100 即天黑；剧情模式仍按时间流逝
  if (user.pixi?.gameMode === 'normal') return dungeonNightTime >= 1;
  return dungeonElapsed >= _nightAfterSec();
}
// 🌙 更新天黑滤镜参数（0 白天 → 1 最深黑，参考主世界昼夜滤镜）
// ===========================
// 🌙 夜晚地牢氛围层：远景深蓝渐变 + 萤火虫粒子（天黑后渐进浮现，随 dungeonNightTime 强度）
// ===========================
let nightAtmoLayer = null;        // 屏幕固定容器（盖在瓦片/头像上，挂 app.stage）
let nightAtmoGradient = null;     // 深蓝渐变 Graphics
let fireflyDots = [];             // 萤火虫光点
let fireflyRespawnAt = 0;         // ⏱️ 萤火虫上次重刷时间（秒）
const FIREFLY_RESPAWN_INTERVAL = 7; // ⏱️ 每隔 20 秒重新随机刷新在玩家周围（7 格内）
let nightAtmoTickerFn = null;     // 每帧游走/闪烁更新
// 🧚 生成一群萤火虫：随机刷在地图草地瓦片格子上（mapContainer 子坐标，世界坐标固定不跟随；20 秒重刷一次）
function createFireflySwarm() {
  if (!mapContainer || mapW <= 0 || mapH <= 0) return;
  // 🌿 收集全部草地格子（terrainNameGrid 优先，运行时 getTile 兜底；含「草地」前后缀兼容）
  const grassCells = [];
  for (let c = 0; c < mapW; c++) {
    for (let r = 0; r < mapH; r++) {
      let terr = getTileTerrainName(c, r);
      if (!terr || terr === '地板') terr = tileTerrainAt(c, r);
      if (!terr) continue;
      if (terr === '草地' || terr.includes('草地')) grassCells.push([c, r]);
    }
  }
  if (!grassCells.length) return; // 🚫 地图没有草地 → 不生成萤火虫
  // 🔀 数量 = 草地瓦片格数 × 10%（最少 4 只、最多 64 只），洗牌后取前 N 个（每格不重复）
  const N = Math.max(4, Math.min(64, Math.round(grassCells.length * 0.1)));
  for (let i = grassCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grassCells[i], grassCells[j]] = [grassCells[j], grassCells[i]];
  }
  for (let i = 0; i < N; i++) {
    const cc = grassCells[i][0], cr = grassCells[i][1];
    const dot = new Graphics();
    dot.circle(0, 0, 1 + Math.random() * 1.6).fill({ color: 0xffe98a, alpha: 0.9 });
    dot.x = (cc + 0.5) * tileW;   // 🌿 草地格子中心（mapContainer 子坐标）
    dot.y = (cr + 0.5) * tileH;
    dot._ph = Math.random() * Math.PI * 2;
    dot._sp = 0.4 + Math.random() * 0.8;
    dot._amp = 20 + Math.random() * 40;
    mapContainer.addChild(dot);
    fireflyDots.push(dot);
  }
}
function ensureNightAtmo() {
  if (!app) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  // ① 夜空渐变层：屏幕固定（盖在场景上营造夜色氛围），仅首次创建
  if (!nightAtmoLayer) {
    const layer = new Container();
    // 顶部深蓝渐变：多段矩形模拟垂直渐变（上深下浅，越靠近夜空越浓）
    const g = new Graphics();
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const y0 = -vh * 0.15 + (i / steps) * vh * 0.75;
      const a = 0.26 * (1 - i / steps) * (1 - i / steps);
      g.rect(-vw * 2, y0, vw * 5, vh / steps + 4).fill({ color: 0x0b1e4a, alpha: a });
    }
    // 顶部边缘再压暗一档，让夜空更有纵深感
    g.rect(-vw * 2, -vh * 2, vw * 5, vh * 0.12).fill({ color: 0x000000, alpha: 0.18 });
    layer.addChild(g);
    nightAtmoGradient = g;
    layer.alpha = 0;
    layer.visible = false;
    app.stage.addChild(layer);
    nightAtmoLayer = layer;
  }
  // ② 萤火虫：世界坐标（挂地图容器，随镜头移动自然留在场景中，不贴屏幕）
  //    换层时地图容器销毁后 fireflyDots 被清空，这里会自动围绕玩家当前位置重建
  if (fireflyDots.length === 0 && mapContainer) {
    createFireflySwarm();
  }
  // ③ 轻量每帧更新：仅注册一次；仅当渐变层可见时移动/闪烁（不可见时零开销）
  if (!nightAtmoTickerFn) {
    nightAtmoTickerFn = () => {
      if (!nightAtmoLayer || !nightAtmoLayer.visible) return;
      const now = performance.now() * 0.001;
      if (!fireflyRespawnAt) fireflyRespawnAt = now;
      // ⏱️ 周期性重刷：每隔一段时间销毁旧虫群，重新随机分布在玩家周围（7 格内）
      if (now - fireflyRespawnAt >= FIREFLY_RESPAWN_INTERVAL) {
        fireflyRespawnAt = now;
        for (const d of fireflyDots) {
          try { mapContainer?.removeChild(d); d.destroy(); } catch (e) { /* ignore */ }
        }
        fireflyDots = [];
        createFireflySwarm();
      }
      // 🧭 萤火虫固定在世界坐标（不跟随玩家/镜头），仅在生成点附近小幅游走 + 呼吸闪烁
      for (let i = 0; i < fireflyDots.length; i++) {
        const d = fireflyDots[i];
        d.x += Math.sin(now * d._sp + d._ph) * 0.3;
        d.y += Math.cos(now * d._sp * 0.7 + d._ph) * 0.24;
        d.alpha = 0.35 + 0.65 * Math.abs(Math.sin(now * (0.6 + d._sp * 0.5) + d._ph));
      }
    };
    app.ticker.add(nightAtmoTickerFn);
  }
}
function updateNightAtmo() {
  if (!app) return;
  const t = isDungeonNight() ? (dungeonNightTime || 0) : 0;
  if (t <= 0.02) {
    if (nightAtmoLayer) { nightAtmoLayer.visible = false; nightAtmoLayer.alpha = 0; }
    return;
  }
  ensureNightAtmo();
  if (!nightAtmoLayer) return;
  nightAtmoLayer.visible = true;
  nightAtmoLayer.alpha = Math.min(1, t * 1.5); // 渐进浮现
}

function updateDungeonNightFilter() {
  if (!dungeonNightFilter) return;
  const t = dungeonNightTime;
  dungeonNightFilter.brightness = 1 - 0.58 * t;  // 1 → 0.42
  dungeonNightFilter.contrast = 1 + 0.3 * t;     // 1 → 1.3
  dungeonNightFilter.saturation = 1 - 0.45 * t;  // 1 → 0.55
  dungeonNightFilter.red = 1 - 0.4 * t;          // 1 → 0.6
  dungeonNightFilter.green = 1 - 0.28 * t;       // 1 → 0.72
  dungeonNightFilter.blue = 1 + 0.45 * t;        // 1 → 1.45
  updateNightAtmo(); // 🌙 夜晚氛围层（深蓝渐变 + 萤火虫）随天黑进度同步
}

function applyWeatherFilter() {
  if (!mapContainer) return;
  // 🔥 雨天/暴风雨/雷雨天：岩浆浇灭变石板（视觉 + 覆盖层），非雨类天气清除覆盖层
  updateMagmaCover();
  createFlowLayer(); // 🌊 水面/岩浆表面流动动画（视天气自动隐藏：雪天冻结/雨天浇灭）
  // 清理旧滤镜
  try { mapContainer.filters = []; } catch (e) { }
  if (weatherFilter) { try { weatherFilter.destroy(); } catch (e) { } weatherFilter = null; }
  destroyFogSmoke(); // 🌫️ 清理旧雾天烟雾
  destroySnowDrops(); // ❄️ 清理旧雪天雪花粒子
  if (weatherAtmoLayer) {
    try { app.stage.removeChild(weatherAtmoLayer); } catch (e) { }
    try { weatherAtmoLayer.destroy(); } catch (e) { }
    weatherAtmoLayer = null;
    weatherAtmoGraphics = null;
  }
  // ❄️ 清理雪天屏幕寒冷滤镜
  if (snowScreenOverlay) {
    try { app.stage.removeChild(snowScreenOverlay); } catch (e) { }
    try { snowScreenOverlay.destroy(); } catch (e) { }
    snowScreenOverlay = null;
  }
  // 🌕 清理血月屏幕血色滤镜
  if (bloodmoonOverlay) {
    try { app.stage.removeChild(bloodmoonOverlay); } catch (e) { }
    try { bloodmoonOverlay.destroy(); } catch (e) { }
    bloodmoonOverlay = null;
  }
  // 🌕 同步所有敌人头像的血月恐怖滤镜（血月添加/其他天气移除）
  updateEnemyBloodFilters();
  // 晴天无滤镜
  if (currentWeather === 'sunny') return;

  if (currentWeather === 'rain' || currentWeather === 'thunderstorm' || currentWeather === 'storm') {
    // 🌧️ 雨天/雷雨天/暴风雨：冷蓝灰调，降低亮度与饱和度
    const f = new AdjustmentFilter({
      brightness: currentWeather === 'storm' ? 0.72 : 0.82,
      saturation: currentWeather === 'storm' ? 0.55 : 0.7,
      red: 0.85, green: 0.92, blue: 1.1,
      contrast: currentWeather === 'storm' ? 1.15 : 1.05,
    });
    weatherFilter = f;
    mapContainer.filters = [f];
  } else if (currentWeather === 'fog') {
    // 🌫️ 雾天：低对比、低饱和、轻微提亮（朦胧）
    const f = new AdjustmentFilter({
      brightness: 1.12, saturation: 0.35, contrast: 0.8,
      red: 1.05, green: 1.05, blue: 1.08,
    });
    weatherFilter = f;
    mapContainer.filters = [f];
    createFogSmoke(); // 🌫️ 铺满动态烟雾
  } else if (currentWeather === 'bloodmoon') {
    // 🌕 血月：更恐怖的红色调——大幅压暗、拉高红色饱和度与对比，营造血色压抑氛围
    const f = new AdjustmentFilter({
      brightness: 0.62, saturation: 1.65, contrast: 1.45,
      red: 1.55, green: 0.6, blue: 0.55,
    });
    weatherFilter = f;
    mapContainer.filters = [f];
    // 🌕 屏幕空间血色氛围：跟随屏幕固定（不随地图移动），盖在画面上
    try {
      const ov = new Graphics();
      const vw = window.innerWidth, vh = window.innerHeight;
      // 整屏暗红半透明（血色滤镜）
      ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0x4a0000, alpha: 0.22 });
      // 四周暗角（中间亮四周暗，聚焦压迫感）
      ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0x000000, alpha: 0.12 });
      ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0x660000, alpha: 0.08 });
      bloodmoonOverlay = ov;
      app.stage.addChild(bloodmoonOverlay);
    } catch (e) { bloodmoonOverlay = null; }
  } else if (currentWeather === 'snow') {
    // ❄️ 雪天：冷白蓝调，降低亮度饱和度（寒冷氛围，作用于地图）
    const f = new AdjustmentFilter({
      brightness: 0.9, saturation: 0.55,
      red: 0.88, green: 0.95, blue: 1.15,
      contrast: 1.05,
    });
    weatherFilter = f;
    mapContainer.filters = [f];
    // ❄️ 屏幕空间寒冷滤镜：跟随屏幕固定（不随地图移动），盖在 stage 上模拟寒冷画面
    try {
      const ov = new Graphics();
      const vw = window.innerWidth, vh = window.innerHeight;
      ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0xa8c8e8, alpha: 0.16 });
      // 四角冷白微亮（模拟霜雾）
      ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5)
        .fill({ color: 0xffffff, alpha: 0.04 });
      snowScreenOverlay = ov;
      snowScreenOverlay.x = 0;
      snowScreenOverlay.y = 0;
      // 覆盖在地图/玩家/敌人之上（天气氛围之上），显示寒冷滤镜
      app.stage.addChild(snowScreenOverlay);
    } catch (e) { snowScreenOverlay = null; }
  }
}

// 创建/更新天气氛围层（覆盖全屏的半透明色调，跟随镜头）
function createWeatherAtmosphere() {
  if (weatherAtmoLayer) {
    try { app.stage.removeChild(weatherAtmoLayer); } catch (e) { }
    try { weatherAtmoLayer.destroy(); } catch (e) { }
    weatherAtmoLayer = null;
  }
  weatherAtmoGraphics = null;
  if (currentWeather === 'sunny') return;
  weatherAtmoGraphics = new Graphics();
  weatherAtmoLayer = weatherAtmoGraphics;
  const vw = window.innerWidth, vh = window.innerHeight;
  // 地图像素尺寸（雾天遮罩要盖满整张地图；镜头只显示其中一部分，故矩形覆盖整图）
  const mw = Math.max(window.innerWidth, mapW * tileW * scale);
  const mh = Math.max(window.innerHeight, mapH * tileH * scale);
  if (currentWeather === 'fog') {
    // 雾：半透明白色朦胧，覆盖整张地图（镜头滚动时始终铺满地图）
    weatherAtmoGraphics.rect(0, 0, mw, mh).fill({ color: 0xdde4ee, alpha: 0.16 });
  } else if (currentWeather === 'bloodmoon') {
    // 血月：四周红色暗角（覆盖整图，避免滚动露底）
    weatherAtmoGraphics.rect(0, 0, mw, mh).fill({ color: 0x550000, alpha: 0.12 });
  } else if (currentWeather === 'snow') {
    // ❄️ 雪天：冷白微蓝朦胧（覆盖整图）
    weatherAtmoGraphics.rect(0, 0, mw, mh).fill({ color: 0xdceeff, alpha: 0.10 });
  } else {
    // 雨/暴风雨/雷雨：微暗蓝色调（覆盖整图）
    weatherAtmoGraphics.rect(0, 0, mw, mh).fill({ color: 0x223344, alpha: 0.10 });
  }
  app.stage.addChild(weatherAtmoLayer);
  syncWeatherAtmospherePos();
}

// 🌅 环境光层次：全屏淡色调（白天暖橙 → 夜晚冷蓝，叠加天气色调），每帧随昼夜平滑渐变
function createAmbientLayer() {
  if (ambientLayer) { try { app.stage.removeChild(ambientLayer); } catch (e) { } try { ambientLayer.destroy(); } catch (e) { } ambientLayer = null; ambientGraphics = null; }
  ambientGraphics = new Graphics();
  ambientLayer = ambientGraphics;
  app.stage.addChild(ambientLayer);
  updateAmbientLighting();
}
function updateAmbientLighting() {
  if (!ambientGraphics) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const mw = Math.max(vw, mapW * tileW * scale);
  const mh = Math.max(vh, mapH * tileH * scale);
  const t = isDungeonNight() ? (dungeonNightTime || 0) : 0; // 0 白天 → 1 夜晚
  let r = 255, g = 224, b = 165;
  let a = 0.045;
  if (t > 0) { r = 255 - 195 * t; g = 224 - 150 * t; b = 165 + 90 * t; a = 0.045 + t * 0.075; }
  // 天气色调叠加
  if (currentWeather === 'bloodmoon') { r += 28; g *= 0.55; b *= 0.45; a += 0.03; }
  else if (currentWeather === 'fog') { r += 18; g += 18; b += 24; a += 0.02; }
  else if (currentWeather === 'rain' || currentWeather === 'storm' || currentWeather === 'thunderstorm') { g *= 0.92; b += 12; a += 0.02; }
  else if (currentWeather === 'snow') { r += 22; g += 22; b += 28; a += 0.02; }
  // ⚡ 低性能模式：环境光静态化。颜色只随昼夜/天气变化，渐变过程中不每帧清屏重绘；
  //    仅镜头偏移（mapOffset）仍需每帧跟随，故颜色不变时只更新位置
  if (isPerfLow()) {
    const key = Math.round(t * 20) + '|' + currentWeather; // 粗粒度键（20 档，渐变期最多重绘 20 次）
    if (key !== _ambientKey) {
      _ambientKey = key;
      const rr2 = Math.max(0, Math.min(255, Math.round(r)));
      const gg2 = Math.max(0, Math.min(255, Math.round(g)));
      const bb2 = Math.max(0, Math.min(255, Math.round(b)));
      ambientGraphics.clear();
      ambientGraphics.rect(0, 0, mw, mh).fill({ color: (rr2 << 16) | (gg2 << 8) | bb2, alpha: Math.min(0.18, a) });
    }
    ambientGraphics.x = mapOffsetX;
    ambientGraphics.y = mapOffsetY;
    return;
  }
  const rr = Math.max(0, Math.min(255, Math.round(r)));
  const gg = Math.max(0, Math.min(255, Math.round(g)));
  const bb = Math.max(0, Math.min(255, Math.round(b)));
  ambientGraphics.clear();
  ambientGraphics.rect(0, 0, mw, mh).fill({ color: (rr << 16) | (gg << 8) | bb, alpha: Math.min(0.18, a) });
  ambientGraphics.x = mapOffsetX;
  ambientGraphics.y = mapOffsetY;
}
let _ambientKey = ''; // ⚡ 低性能模式环境光缓存键（昼夜程度+天气）
function destroyAmbientLayer() {
  if (ambientLayer) { try { app.stage.removeChild(ambientLayer); } catch (e) { } try { ambientLayer.destroy(); } catch (e) { } ambientLayer = null; ambientGraphics = null; }
}

// 氛围层跟随镜头（每帧调用；矩形从 (0,0) 铺满整图，跟随 mapOffset 即对齐地图左上角）
function syncWeatherAtmospherePos() {
  if (!weatherAtmoLayer || !weatherAtmoGraphics) return;
  weatherAtmoLayer.x = mapOffsetX;
  weatherAtmoLayer.y = mapOffsetY;
}

// ========== 🌧️ 雨滴粒子系统（雨天/暴风雨/雷雨天） ==========
// 按天气密度创建雨滴（地图坐标，贴在地图上，镜头移动时雨滴相对地图不动）
function createRainDrops() {
  if (rainGraphics) {
    try { app.stage.removeChild(rainGraphics); } catch (e) { }
    try { rainGraphics.destroy(); } catch (e) { }
    rainGraphics = null;
  }
  rainDrops = [];
  if (currentWeather !== 'rain' && currentWeather !== 'storm' && currentWeather !== 'thunderstorm') {
    rainDensity = 0;
    return;
  }
  // 密度与速度按天气区分：雨天温和，雷雨天急促倾斜，暴风雨最猛烈
  const cfg = currentWeather === 'storm'
    ? { count: 200, speedBase: 640, speedRand: 420, driftBase: 180, driftRand: 100, lenBase: 22, lenRand: 14, width: 3 }
    : (currentWeather === 'thunderstorm'
      ? { count: 140, speedBase: 520, speedRand: 380, driftBase: 200, driftRand: 120, lenBase: 20, lenRand: 12, width: 2.5 }
      : { count: 90, speedBase: 380, speedRand: 320, driftBase: 90, driftRand: 80, lenBase: 12, lenRand: 9, width: 1.5 });
  rainDensity = cfg.count;
  rainDropCfg = cfg;
  // 地图像素尺寸（雨滴贴在地图上，镜头移动雨不随屏幕滚动）
  const mw = Math.max(window.innerWidth, mapW * tileW * scale);
  const mh = Math.max(window.innerHeight, mapH * tileH * scale);
  for (let i = 0; i < rainDensity; i++) {
    rainDrops.push({
      x: Math.random() * mw,
      y: Math.random() * mh,
      speed: cfg.speedBase + Math.random() * cfg.speedRand,     // 下落速度 px/s
      drift: cfg.driftBase + Math.random() * cfg.driftRand,     // 斜向漂移
      len: cfg.lenBase + Math.random() * cfg.lenRand,           // 雨滴长度
      alpha: 0.28 + Math.random() * 0.42,                       // 透明度
    });
  }
  rainGraphics = new Graphics();
  app.stage.addChild(rainGraphics);
}

// ========== 💧 雨洼效果（雨天/暴风雨/雷雨天：puddle=true 的石板格上有水滴/涟漪） ==========
// 生成雨洼数据：每个雨洼格按概率稀疏生成水渍（更自然、不密集）
function buildPuddleData() {
  puddleDropData = [];
  if (!puddleGrid || !mapW || !mapH) return;
  for (let r = 0; r < mapH; r++) {
    for (let c = 0; c < mapW; c++) {
      // puddle=true 的格（石板/浅水/深水等）或水属性格（浅水/深水）都会渲染雨洼水渍
      if (puddleGrid[r][c] !== 1 && !isWaterCell(c, r)) continue;
      // 🧱 障碍物上面的格子不显示雨洼（树/墙/木箱等遮挡，避免水渍透出障碍物）
      if (!isWalkable(c, r)) continue;
      // ⚠️ 坐标必须是地图原始像素（不含 scale）：puddleLayer/puddleStaticSprite 是 mapContainer 子节点，
      //    mapContainer.scale=GRID_SCALE 会自动缩放一次；若这里再乘 scale 会双重缩放导致水洼整体偏移。
      const cellW = tileW, cellH = tileH;
      // 稀疏化：约 55% 的雨洼格渲染雨洼，其余留空（避免过密）
      if (Math.random() > 0.55) continue;
      puddleDropData.push({
        col: c, row: r,
        cx: (c + 0.2 + Math.random() * 0.6) * cellW,   // 水渍中心（格内随机偏移）
        cy: (r + 0.24 + Math.random() * 0.52) * cellH,
        rx: cellW * (0.19 + Math.random() * 0.15),     // 水渍长半轴（缩小）
        ry: cellW * (0.12 + Math.random() * 0.10),     // 水渍短半轴（扁椭圆，缩小）
        rot: Math.random() * Math.PI,                  // 水渍朝向（随水流/地面纹理偏转）
        phase: Math.random() * Math.PI * 2,            // 涟漪动画相位错开
        speed: 0.7 + Math.random() * 0.9,              // 涟漪扩散速度
        alpha: 0.16 + Math.random() * 0.16,            // 水渍透明度
        hue: Math.random(),                            // 水色微调（个别偏青/偏蓝）
        glintSpeed: 0.05 + Math.random() * 0.08,       // ✨ 反光周期（约 8~20 秒闪一次）
        glintOff: Math.random(),                       // ✨ 反光相位错开（避免同时乱闪）
        glintSize: 0.7 + Math.random() * 1.1,          // ✨ 反光斑大小
        glintRot: Math.random() * Math.PI,             // ✨ 反光朝向（斜向亮线方向）
      });
    }
  }
  // 💧 诊断：统计浅水/深水格是否被 puddleGrid/waterGrid 标记（buildPuddleData 仅调用一次，不会刷屏）
  let waterTotal = 0, waterPuddle = 0;
  for (let r = 0; r < mapH; r++) for (let c = 0; c < mapW; c++) {
    if (isWaterCell(c, r)) { waterTotal++; if (puddleGrid[r][c] === 1) waterPuddle++; }
  }

  buildPuddleStatic(); // 💧 预渲染静态水渍纹理（只生成一次）
}

// 预渲染静态水渍纹理：已移除（下雨天不再生成水洼底/高光，只保留水滴落到地面的波纹）
function buildPuddleStatic() {
  if (puddleStaticSprite) {
    try { mapContainer.removeChild(puddleStaticSprite); } catch (e) { }
    try { puddleStaticSprite.destroy(); } catch (e) { }
    puddleStaticSprite = null;
  }
  return;
}

// 创建/更新雨洼层（地图容器内，跟随地图；雨天显示，其他天气隐藏）
function ensurePuddleLayer() {
  if (!mapContainer) return;
  if (puddleLayer && puddleLayer.parent === mapContainer) return;
  if (puddleLayer) {
    try { mapContainer.removeChild(puddleLayer); } catch (e) { }
    try { puddleLayer.destroy(); } catch (e) { }
    puddleLayer = null;
  }
  puddleLayer = new Graphics();
  try { mapContainer.addChild(puddleLayer); } catch (e) { }
}

// 每帧更新雨洼（静态水渍已移除：下雨天只保留水滴落到地面的波纹效果）
function updatePuddles(dt) {
  if (!app || !mapContainer) return;
  const isRain = currentWeather === 'rain' || currentWeather === 'storm' || currentWeather === 'thunderstorm';
  if (!isRain) {
    if (puddleLayer) puddleLayer.visible = false;
    return;
  }
  ensurePuddleLayer();
  if (!puddleLayer) return;
  if (dungeonPaused || storyPaused) return; // 暂停时冻结
  puddleLayer.visible = true;
  const g = puddleLayer;
  g.clear();
  const t = performance.now() / 1000; // 全局时间，驱动涟漪扩散
  for (const d of puddleDropData) {
    const rx = d.rx, ry = d.ry;
    // 动态涟漪：水滴落到地面的波纹（单圈柔和环，中心扩散-淡出）
    const k = (t * d.speed + d.phase) % 1;
    const ringR = Math.max(rx * 0.6, ry * 0.6) * (0.6 + k * 2.0);
    const ringA = Math.max(0, 0.4 * (1 - k) * (1 - k));
    g.circle(d.cx, d.cy, ringR).stroke({ width: 1, color: 0xcfeeff, alpha: ringA });
    // 中心水珠：涟漪原点偶尔闪一下的小亮珠
    const hl = Math.max(0, Math.sin(t * d.speed * 2.2 + d.phase));
    if (hl > 0.75) {
      g.circle(d.cx, d.cy, 1.3).fill({ color: 0xffffff, alpha: (hl - 0.75) * 3 * 0.85 });
    }
  }
}

// 每帧更新雨滴并绘制（地图坐标，容器定位到地图左上角；镜头移动时雨相对地图不动）
function updateRainDrops(dt) {
  if (!rainGraphics) return;
  const isRain = currentWeather === 'rain' || currentWeather === 'storm' || currentWeather === 'thunderstorm';
  if (!isRain) {
    rainGraphics.visible = false;
    return;
  }
  if (dungeonPaused || storyPaused) return; // 暂停时不动画
  rainGraphics.visible = true;
  // 容器定位到地图左上角 → 粒子使用地图像素坐标，镜头移动时雨滴相对地图不动
  rainGraphics.x = mapOffsetX;
  rainGraphics.y = mapOffsetY;
  const mw = Math.max(window.innerWidth, mapW * tileW * scale);
  const mh = Math.max(window.innerHeight, mapH * tileH * scale);
  const g = rainGraphics;
  g.clear();
  const width = rainDropCfg ? rainDropCfg.width : 1.5;
  // 雷雨天雨滴更倾斜（横向漂移更强）
  const driftFactor = currentWeather === 'thunderstorm' ? 0.85 : 0.55;
  const leanFactor = currentWeather === 'thunderstorm' ? 0.05 : 0.03;
  // 💡 性能优化：雨滴按透明度分 5 层，同层合并为一次 stroke。
  //    原实现每条雨滴独立 stroke → 每帧 90~200 次 drawable 重建；
  //    分层后每帧仅 5 次 stroke（draw call 减少 95%+），视觉几乎无差异。
  const LAYERS = [
    { min: 0.00, max: 0.38, alpha: 0.34 },
    { min: 0.38, max: 0.48, alpha: 0.44 },
    { min: 0.48, max: 0.58, alpha: 0.54 },
    { min: 0.58, max: 0.68, alpha: 0.63 },
    { min: 0.68, max: 1.01, alpha: 0.72 },
  ];
  const layerDrops = [[], [], [], [], []];
  const vw = window.innerWidth, vh = window.innerHeight;
  for (const d of rainDrops) {
    d.y += d.speed * dt;
    d.x += d.drift * dt * driftFactor; // 雨滴斜向（雷雨天更斜）
    if (d.y > mh + 30) { d.y = -30; d.x = Math.random() * mw; }
    if (d.x > mw + 40) { d.x = -20; }
    // 🎯 视口剔除：雨滴在屏幕外（含雨滴长度余量）时不绘制，省 draw call
    const sx = d.x + mapOffsetX, sy = d.y + mapOffsetY;
    if (sx < -70 || sx > vw + 70 || sy < -70 || sy > vh + 70) continue;
    // 归类到对应透明度层
    for (let li = 0; li < LAYERS.length; li++) {
      if (d.alpha >= LAYERS[li].min && d.alpha < LAYERS[li].max) {
        layerDrops[li].push(d);
        break;
      }
    }
  }
  // 逐层合并绘制：先 moveTo/lineTo 记录全部路径，再统一 stroke（一次 drawable）
  for (let li = 0; li < LAYERS.length; li++) {
    const ld = layerDrops[li];
    if (!ld.length) continue;
    for (const d of ld) {
      g.moveTo(d.x, d.y);
      g.lineTo(d.x - d.drift * leanFactor, d.y - d.len);
    }
    g.stroke({ width, color: 0x9fb8d4, alpha: LAYERS[li].alpha });
  }
  // ⚡ 雷雨天：随机打雷闪光（全屏闪白，快速衰减）
  updateThunderFlash(dt);
}

// ========== 💨 暴风雨"一阵风"：从屏幕右侧吹过，强制玩家向左移动一格 ==========
const WIND_BLAST_DUR = 1.2;          // 吹风持续时间（秒）
const WIND_BLAST_INTERVAL = [10, 15]; // 两次吹风随机间隔（秒）
const WIND_BLADE_MAIN = 3;           // 主风刃数量（粗、长、亮）
const WIND_BLADE_SUB = 5;            // 副风刃数量（细、短）
const WIND_STREAM_N = 42;            // 循环气流粒子数

// 初始化吹风状态（进入地牢/切换层/重置时调用）
function resetWindBlast() {
  windBlastTimer = WIND_BLAST_INTERVAL[0] + Math.random() * (WIND_BLAST_INTERVAL[1] - WIND_BLAST_INTERVAL[0]);
  windBlastActive = false;
  windBlastT = 0;
  if (windFxLayer) {
    try { app.stage.removeChild(windFxLayer); } catch (e) { }
    try { windFxLayer.destroy(); } catch (e) { }
    windFxLayer = null;
  }
}

// 开始一阵风：生成风效种子 + 强制玩家向左移动一格
function startWindBlast() {
  windBlastActive = true;
  windBlastT = 0;
  // 💨 生成风效种子（屏幕坐标，右→左扫过）
  const vw = window.innerWidth, vh = window.innerHeight;
  const blades = [], streams = [];
  // 主风刃：大弧度、粗、亮（像被狂风撕开的云层边缘）
  for (let i = 0; i < WIND_BLADE_MAIN; i++) {
    blades.push({
      y: vh * (0.12 + Math.random() * 0.6),      // 纵向位置
      len: vw * (0.95 + Math.random() * 0.3),    // 风刃长度
      amp: 46 + Math.random() * 52,              // 弧度幅度
      thick: 3 + Math.random() * 2,              // 线宽
      alpha: 0.55 + Math.random() * 0.3,         // 亮度
      speed: 0.72 + Math.random() * 0.22,        // 扫过速度
    });
  }
  // 副风刃：细、短、散布全屏，增添层次
  for (let i = 0; i < WIND_BLADE_SUB; i++) {
    blades.push({
      y: vh * (0.05 + Math.random() * 0.9),
      len: vw * (0.45 + Math.random() * 0.35),
      amp: 12 + Math.random() * 20,
      thick: 1.2 + Math.random() * 1.1,
      alpha: 0.28 + Math.random() * 0.22,
      speed: 0.85 + Math.random() * 0.3,
    });
  }
  // 循环气流粒子：细长光点从右往左流，形成风的"丝线"
  for (let i = 0; i < WIND_STREAM_N; i++) {
    streams.push({
      y: vh * (0.03 + Math.random() * 0.94),
      len: 12 + Math.random() * 24,
      alpha: 0.2 + Math.random() * 0.42,
      speed: 0.5 + Math.random() * 0.85,
      phase: Math.random() * Math.PI * 2,
      offset: Math.random(),                     // 错开生命周期，形成连续气流
    });
  }
  windFxSeed = { blades, streams };
  // 💨 记录玩家当前移动方向（在清空按键前读取）
  let mdCol = 0, mdRow = 0;
  if (isMoving) {
    // 正在移动中：以目标格相对当前格的方向为准
    mdCol = Math.sign(targetCol - pCol);
    mdRow = Math.sign(targetRow - pRow);
  } else {
    if (keys.left) mdCol = -1;
    else if (keys.right) mdCol = 1;
    if (keys.up) mdRow = -1;
    else if (keys.down) mdRow = 1;
  }
  // 💨 根据玩家移动方向决定吹风方向/距离/速度：
  //    基础（朝右/静止）：风从右侧吹来 → 向左 2 格
  //    朝左移动：→ 向左 4 格，且超级快移速（被风猛吹）
  //    朝下移动：→ 吹向左下对角第 2 格（左 2 + 下 2），速度快一点
  //    朝上移动：→ 吹向左上对角第 2 格（左 2 + 上 2），速度快一点
  let offCol = -2, offRow = 0;
  let windMult = 1; // 吹风移速倍率
  if (mdCol === -1) {
    // 朝左：左移 4 格 + 超快移速；若同时带上下则附加垂直偏移
    offCol = -4;
    windMult = 4;
    if (mdRow === 1) offRow = 2;
    else if (mdRow === -1) offRow = -2;
  } else if (mdRow === 1) {
    // 朝下：左下对角 2 格，速度快一点
    offCol = -2; offRow = 2;
    windMult = 2;
  } else if (mdRow === -1) {
    // 朝上：左上对角 2 格，速度快一点
    offCol = -2; offRow = -2;
    windMult = 2;
  }
  // 逐格检查路径（先水平后垂直），全程可行走且无障碍才移动
  const cEnd = pCol + offCol, rEnd = pRow + offRow;
  let cc = pCol, rr = pRow, blocked = false;
  const cStep = Math.sign(offCol), rStep = Math.sign(offRow);
  while (cc !== cEnd) {
    cc += cStep;
    if (!isWalkable(cc, rr) || getObstacleAt(cc, rr)) { blocked = true; break; }
  }
  if (!blocked) {
    while (rr !== rEnd) {
      rr += rStep;
      if (!isWalkable(cc, rr) || getObstacleAt(cc, rr)) { blocked = true; break; }
    }
  }
  if (!blocked) {
    // 打断玩家当前移动（无论是否正在移动），接管控制按吹风方向移动
    targetCol = cEnd;
    targetRow = rEnd;
    isMoving = true;
    isPushing = false;
    windInputLock = true; // 💨 吹风移动期间锁定玩家输入，玩家无法操控
    windSpeedMult = windMult; // 💨 吹风移速倍率（朝左时超级快）
    // 记录吹风方向（供冰面滑行方向使用），并清空滑行状态
    iceSlideDir.dc = offCol; iceSlideDir.dr = offRow;
    iceSlideActive = false; iceSlideEnergy = 0;
    // 玩家被吹风打断时若正握着方向键，需要清除按键状态
    keys.left = keys.right = keys.up = keys.down = false;
  }
}

// 绘制单条弧形风刃（二次贝塞尔曲线，头部亮→尾部渐隐）
function drawWindBlade(g, b, xOff, fade, vw) {
  const x0 = vw + 130 - xOff * b.speed; // 风刃头（右缘，随 xOff 左移）
  const len = b.len;
  const baseY = b.y;
  // 二次贝塞尔：P0(头) → C(中上拱) → P1(尾)
  const pt = (t) => {
    const mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * (x0 - len * 0.5) + t * t * (x0 - len);
    const py = mt * mt * baseY + 2 * mt * t * (baseY - b.amp) + t * t * (baseY + b.amp * 0.15);
    return [px, py];
  };
  const segs = 16;
  for (let k = 0; k < segs; k++) {
    const t0 = k / segs, t1 = (k + 1) / segs;
    const [x0p, y0p] = pt(t0);
    const [x1p, y1p] = pt(t1);
    const headA = Math.pow(1 - t0, 1.5); // 头部亮、尾部暗
    const a = b.alpha * headA * fade;
    if (a <= 0.02) continue;
    g.moveTo(x0p, y0p);
    g.lineTo(x1p, y1p);
    g.stroke({ width: b.thick, color: 0xdff2ff, alpha: a });
  }
  // 风刃头部亮斑（扫过最前端的耀眼亮点）
  const [hx, hy] = pt(0);
  g.circle(hx, hy, b.thick * 1.7).fill({ color: 0xffffff, alpha: b.alpha * 0.95 * fade });
}

// 每帧更新吹风倒计时 + 特效绘制（暴风雨专属）
function updateWindBlast(dt) {
  if (!app) return;
  // 非暴风雨 → 关闭特效与计时
  if (currentWeather !== 'storm') {
    if (windFxLayer) windFxLayer.visible = false;
    windBlastActive = false;
    windBlastTimer = 0;
    return;
  }
  // 暂停时冻结（不触发新风吹，正在吹的也暂停）
  if (dungeonPaused || storyPaused) {
    if (windFxLayer) windFxLayer.visible = false;
    return;
  }
  // 倒计时 → 触发一阵风
  if (!windBlastActive) {
    windBlastTimer -= dt;
    if (windBlastTimer <= 0) {
      startWindBlast();
      playSfx('dafeng'); // 💨 暴风雨刮风音效（不循环）
      windBlastTimer = WIND_BLAST_INTERVAL[0] + Math.random() * (WIND_BLAST_INTERVAL[1] - WIND_BLAST_INTERVAL[0]);
    }
    return;
  }
  // 正在吹风：更新特效
  windBlastT += dt;
  if (windBlastT >= WIND_BLAST_DUR) {
    windBlastActive = false;
    windBlastT = 0;
    if (windFxLayer) windFxLayer.visible = false;
    return;
  }
  // 创建风效层（屏幕坐标，覆盖全屏，跟随镜头不动）
  if (!windFxLayer) {
    windFxLayer = new Graphics();
    windFxLayer.zIndex = 2000;
    app.stage.addChild(windFxLayer);
  }
  windFxLayer.visible = true;
  const vw = window.innerWidth, vh = window.innerHeight;
  const g = windFxLayer;
  g.clear();
  // 进度：0→1，风从右缘扫到左缘；fade 控制整体淡入淡出（峰值在中段）
  const p = Math.min(1, windBlastT / WIND_BLAST_DUR);
  const fade = Math.sin(Math.PI * p);
  const xOff = (vw + 600) * p; // 风刃/风墙位移量
  const seeds = windFxSeed && windFxSeed.blades ? windFxSeed : { blades: [], streams: [] };

  // 1️⃣ 底层风压波：整屏细密横向弧线（风吹过屏幕的"风墙"打底）
  const waveA = 0.10 * fade;
  for (let wy = -8; wy < vh + 16; wy += 26) {
    const y = wy + Math.sin(p * 9 + wy * 0.012) * 3;
    g.moveTo(vw + 100 - xOff, y);
    g.bezierCurveTo(vw + 50 - xOff, y - 12, vw - 120 - xOff, y + 12, vw - 250 - xOff, y);
    g.stroke({ width: 1, color: 0xdff1ff, alpha: waveA });
  }

  // 2️⃣ 弧形风刃（主刃 + 副刃）
  for (const b of seeds.blades) {
    drawWindBlade(g, b, xOff, fade, vw);
  }

  // 3️⃣ 循环气流粒子：从右往左流的细长光点丝线
  for (const st of seeds.streams) {
    const tt = windBlastT * st.speed + st.offset;
    const life = ((tt % 1) + 1) % 1;               // 0~1 循环生命周期
    const x = vw + 90 - life * (vw + 420);
    const y = st.y + Math.sin(tt * 7 + st.phase) * 5;
    const a = Math.sin(Math.PI * life) * st.alpha * fade;
    if (a <= 0.03) continue;
    g.moveTo(x, y);
    g.lineTo(x - st.len, y + 2.5);
    g.stroke({ width: 1.6, color: 0xeaf6ff, alpha: a });
    g.circle(x, y, 1.1).fill({ color: 0xffffff, alpha: a * 1.3 });
  }
}

// ⚡ 打雷闪光：雷雨天偶尔全屏闪白 2~3 次（模拟天空闪电），无伤害纯氛围
function updateThunderFlash(dt) {
  // 非雷雨天或暂停时隐藏闪光
  if (currentWeather !== 'thunderstorm' || dungeonPaused || storyPaused) {
    if (thunderFlashLayer) thunderFlashLayer.visible = false;
    thunderFlashTimer = 0;
    thunderFlashAlpha = 0;
    return;
  }
  if (!thunderFlashLayer) {
    thunderFlashLayer = new Graphics();
    const vw = window.innerWidth, vh = window.innerHeight;
    thunderFlashLayer.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0xffffff, alpha: 1 });
    thunderFlashLayer.visible = false;
    app.stage.addChild(thunderFlashLayer);
  }
  if (thunderFlashTimer > 0) {
    // 闪光衰减：从当前 alpha 快速降到 0
    thunderFlashAlpha = Math.max(0, thunderFlashAlpha - dt * 2.2);
    thunderFlashTimer -= dt;
    if (thunderFlashTimer <= 0) {
      thunderFlashLayer.visible = false;
      thunderFlashAlpha = 0;
    } else {
      thunderFlashLayer.alpha = thunderFlashAlpha;
    }
    return;
  }
  // 随机触发：5~12 秒一次
  thunderRandomTimer -= dt;
  if (thunderRandomTimer <= 0) {
    thunderRandomTimer = 5 + Math.random() * 7; // 下次打雷间隔
    // 触发闪光（0.15~0.3 秒，闪烁 1~3 次）
    thunderFlashAlpha = 0.5 + Math.random() * 0.4;
    thunderFlashTimer = 0.15 + Math.random() * 0.2;
    thunderFlashLayer.visible = true;
    thunderFlashLayer.alpha = thunderFlashAlpha;
    // 预警落雷时闪光更亮（模拟雷击瞬间）
    if (thunderWarnTimer > 0) thunderFlashAlpha = Math.min(0.95, thunderFlashAlpha + 0.3);
  }
}

// ========== 🌫️ 雾天烟雾粒子（浓雾铺满全屏，缓慢漂浮） ==========
// 创建雾天烟雾（贴图粒子，地图坐标，跟随地图镜头不随屏幕滚动）
let fogSmokeTex = null; // 烟雾贴图纹理
async function createFogSmoke() {
  if (fogSmokeGraphics) {
    try { app.stage.removeChild(fogSmokeGraphics); } catch (e) { }
    try { fogSmokeGraphics.destroy(); } catch (e) { }
    fogSmokeGraphics = null;
  }
  fogSmokeDrops = [];
  if (currentWeather !== 'fog') return;
  // 获取烟雾贴图纹理（优先按注册 key 'smokeparticle' 命中缓存，避免 get(URL) 未命中告警；未加载则即时加载）
  let tex = null;
  try {
    if (Assets.cache?.has?.('smokeparticle')) tex = Assets.get('smokeparticle');
    else if (Assets.cache?.has?.('/tietu/smokeparticle.png')) tex = Assets.get('/tietu/smokeparticle.png');
  } catch (e) { tex = null; }
  if (!tex) {
    try { tex = await Assets.load('/tietu/smokeparticle.png'); } catch (e) { tex = null; }
    if (!tex) return; // 贴图加载失败则跳过雾（避免白块兜底）
  }
  fogSmokeTex = tex;
  // 地图像素尺寸（雾贴在地图上，镜头移动雾不随屏幕滚动）
  const mw = Math.max(window.innerWidth, mapW * tileW * scale);
  const mh = Math.max(window.innerHeight, mapH * tileH * scale);
  fogSmokeGraphics = new Container(); // 雾层容器（地图坐标）
  // 🌫️ 雾团数量按地图面积动态计算（密度恒定，大地图自动增加团数保持铺满）
  // 单团平均覆盖约 192×192px（贴图128px×平均缩放1.5），密度因子控制雾的浓密
  const DENSITY = 0.5; // 覆盖面积占比系数：越高雾越密
  const perBlobArea = 192 * 192;
  const count = Math.max(12, Math.round((mw * mh / perBlobArea) * DENSITY));
  for (let i = 0; i < count; i++) {
    const sp = new Sprite(fogSmokeTex || Texture.WHITE);
    sp.anchor.set(0.5, 0.5);
    const s = 0.7 + Math.random() * 1.8;
    sp.scale.set(s);
    sp.x = Math.random() * mw;
    sp.y = Math.random() * mh;
    sp.rotation = Math.random() * Math.PI * 2;
    sp.alpha = 0.35;
    sp.tint = 0xdfe6f0; // 雾的冷白调
    fogSmokeGraphics.addChild(sp);
    fogSmokeDrops.push({
      sprite: sp,
      speedX: (4 + Math.random() * 14) * (Math.random() < 0.5 ? -1 : 1), // 缓慢左右漂移
      speedY: (2 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1),  // 轻微上下浮动
      rotSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.12), // 缓慢自转
      phase: Math.random() * Math.PI * 2,                                  // 呼吸相位
    });
  }
  app.stage.addChild(fogSmokeGraphics);
}

// 每帧更新雾团（容器跟随 mapOffsetX/Y 使雾贴在地图上，不随屏幕滚动）
function updateFogSmoke(dt) {
  if (!fogSmokeGraphics) return;
  if (currentWeather !== 'fog' || dungeonPaused || storyPaused) {
    fogSmokeGraphics.visible = currentWeather === 'fog' && !(dungeonPaused || storyPaused);
    return;
  }
  fogSmokeGraphics.visible = true;
  // 容器定位到地图左上角 → 粒子使用地图像素坐标，镜头移动时雾相对地图不动
  fogSmokeGraphics.x = mapOffsetX;
  fogSmokeGraphics.y = mapOffsetY;
  const mw = Math.max(window.innerWidth, mapW * tileW * scale);
  const mh = Math.max(window.innerHeight, mapH * tileH * scale);
  for (const d of fogSmokeDrops) {
    const sp = d.sprite;
    sp.x += d.speedX * dt;
    sp.y += d.speedY * dt;
    sp.rotation += d.rotSpeed * dt;
    d.phase += dt * 0.5;
    // 出界回绕（在地图范围内持续铺满）
    const rr = 64 * sp.scale.x;
    if (sp.x < -rr) sp.x = mw + rr;
    if (sp.x > mw + rr) sp.x = -rr;
    if (sp.y < -rr) sp.y = mh + rr;
    if (sp.y > mh + rr) sp.y = -rr;
    // 呼吸：透明度轻柔脉动
    sp.alpha = Math.max(0.1, 0.35 * (0.7 + 0.3 * Math.sin(d.phase)));
  }
}

// 清理雾天烟雾资源
function destroyFogSmoke() {
  if (fogSmokeGraphics) {
    try { app.stage.removeChild(fogSmokeGraphics); } catch (e) { }
    try { fogSmokeGraphics.destroy({ children: true }); } catch (e) { }
    fogSmokeGraphics = null;
  }
  fogSmokeDrops = [];
}

// 清理雨滴资源
function destroyRainDrops() {
  if (rainGraphics) {
    try { app.stage.removeChild(rainGraphics); } catch (e) { }
    try { rainGraphics.destroy(); } catch (e) { }
    rainGraphics = null;
  }
  if (thunderFlashLayer) {
    try { app.stage.removeChild(thunderFlashLayer); } catch (e) { }
    try { thunderFlashLayer.destroy(); } catch (e) { }
    thunderFlashLayer = null;
  }
  rainDrops = [];
  rainDensity = 0;
  rainDropCfg = null;
  thunderFlashTimer = 0;
  thunderFlashAlpha = 0;
}

// ========== ❄️ 雪天粒子系统（雪花贴图，地图坐标，跟随地图不随屏幕滚动） ==========
async function createSnowDrops() {
  if (snowGraphics) {
    try { app.stage.removeChild(snowGraphics); } catch (e) { }
    try { snowGraphics.destroy({ children: true }); } catch (e) { }
    snowGraphics = null;
  }
  snowDrops = [];
  if (currentWeather !== 'snow') return;
  // 获取雪花贴图纹理（优先按注册 key 'Snow50px' 命中缓存，避免 get(URL) 未命中告警；未加载则即时加载）
  let tex = null;
  try {
    if (Assets.cache?.has?.('Snow50px')) tex = Assets.get('Snow50px');
    else if (Assets.cache?.has?.('/tietu/Snow50px.png')) tex = Assets.get('/tietu/Snow50px.png');
  } catch (e) { tex = null; }
  if (!tex) {
    try { tex = await Assets.load('/tietu/Snow50px.png'); } catch (e) { tex = null; }
    if (!tex) return; // 贴图加载失败则跳过
  }
  snowTex = tex;
  // 地图像素尺寸（雪贴在地图上，镜头移动雪花不随屏幕滚动）
  const mw = Math.max(window.innerWidth, mapW * tileW * scale);
  const mh = Math.max(window.innerHeight, mapH * tileH * scale);
  const count = 160; // 雪花数量
  snowGraphics = new Container(); // 雪花图层（地图坐标）
  for (let i = 0; i < count; i++) {
    const sp = new Sprite(snowTex);
    sp.anchor.set(0.5, 0.5);
    // ❄️ 雪花尺寸：原图 50px，缩放 0.25~0.60（约 12~30px），比之前大一些
    const s = 0.25 + Math.random() * 0.35;
    sp.scale.set(s);
    sp.x = Math.random() * mw;
    sp.y = Math.random() * mh;
    sp.rotation = Math.random() * Math.PI * 2; // 随机旋转
    // ❄️ 雪花着色：冷白微蓝调（雪花贴图多为白色，着色出层次）
    const tintChoice = Math.random();
    sp.tint = tintChoice < 0.5 ? 0xffffff : (tintChoice < 0.8 ? 0xe8f4ff : 0xcfeeff);
    sp.alpha = 0.55 + Math.random() * 0.45;
    snowGraphics.addChild(sp);
    snowDrops.push({
      sprite: sp,
      speedY: 25 + Math.random() * 45,               // 下落速度（慢，雪花轻飘）
      speedX: (6 + Math.random() * 18) * (Math.random() < 0.5 ? -1 : 1), // 横向飘移
      swayPhase: Math.random() * Math.PI * 2,         // 左右摇摆相位
      swayAmp: 6 + Math.random() * 14,                // 摇摆幅度
      rotSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 1.2), // 缓慢旋转
    });
  }
  app.stage.addChild(snowGraphics);
}

// 每帧更新雪花粒子（地图坐标，容器定位到地图左上角；飘落 + 左右摇摆 + 自转）
function updateSnowDrops(dt) {
  if (!snowGraphics) return;
  if (currentWeather !== 'snow' || dungeonPaused || storyPaused) {
    snowGraphics.visible = currentWeather === 'snow' && !(dungeonPaused || storyPaused);
    return;
  }
  snowGraphics.visible = true;
  // 容器定位到地图左上角 → 粒子使用地图像素坐标，镜头移动时雪花相对地图不动
  snowGraphics.x = mapOffsetX;
  snowGraphics.y = mapOffsetY;
  const mw = Math.max(window.innerWidth, mapW * tileW * scale);
  const mh = Math.max(window.innerHeight, mapH * tileH * scale);
  const vw = window.innerWidth, vh = window.innerHeight;
  for (const d of snowDrops) {
    d.sprite.y += d.speedY * dt;
    d.sprite.x += d.speedX * dt;
    d.swayPhase += dt * 1.8;
    d.sprite.x += Math.sin(d.swayPhase) * d.swayAmp * dt; // 左右摇摆
    d.sprite.rotation += d.rotSpeed * dt;                 // 自转
    if (d.sprite.y > mh + 40) { d.sprite.y = -40; d.sprite.x = Math.random() * mw; }
    if (d.sprite.x > mw + 40) { d.sprite.x = -40; }
    if (d.sprite.x < -40) { d.sprite.x = mw + 40; }
    // 🎯 视口剔除：屏幕外雪花隐藏（省渲染），回到屏幕后自动恢复
    const sx = d.sprite.x + mapOffsetX, sy = d.sprite.y + mapOffsetY;
    d.sprite.visible = sx >= -50 && sx <= vw + 50 && sy >= -50 && sy <= vh + 50;
  }
}

// 清理雪天粒子资源
function destroySnowDrops() {
  if (snowGraphics) {
    try { app.stage.removeChild(snowGraphics); } catch (e) { }
    try { snowGraphics.destroy({ children: true }); } catch (e) { }
    snowGraphics = null;
  }
  snowDrops = [];
}

// ========== ⚡ 雷雨天逻辑 ==========
// 在玩家附近随机选一个可走格作为落雷目标，进入预警（九宫格红色）
function startThunderWarning() {
  if (currentWeather !== 'thunderstorm' || !mapContainer) return;
  // 🧠 AI 预测玩家路线选择落雷目标：按当前移动方向 + 移速 × 预警时长推算预警结束瞬间玩家大概位置，尽可能命中玩家
  let thunderTargetCandidate = null;
  let dirX = 0, dirY = 0;
  if (isMoving) {
    dirX = Math.sign(targetCol - pCol);
    dirY = Math.sign(targetRow - pRow);
  } else if (iceSlideActive && (iceSlideDir.dc !== 0 || iceSlideDir.dr !== 0)) {
    dirX = iceSlideDir.dc; dirY = iceSlideDir.dr; // 🧊 冰面滑行方向
  }
  if (dirX !== 0 || dirY !== 0) {
    // 直线预测：预警时长 × 移速 ≈ 预警期间可走格数（封顶 12 格防飘太远），遇障碍物停在障碍前一格
    const maxSteps = Math.min(Math.max(2, Math.round(THUNDER_WARN_TIME * MOVE_SPEED)), 12);
    let c = pCol + dirX, r = pRow + dirY, steps = 0;
    while (steps < maxSteps && isWalkable(c, r)) {
      thunderTargetCandidate = { col: c, row: r };
      c += dirX; r += dirY; steps++;
    }
  }
  if (!thunderTargetCandidate) {
    // 无方向（站立/转向中）：以玩家为中心 0~3 格加权随机可走格，越近命中越高
    const candidates = [];
    for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) {
      const c = pCol + dc, r = pRow + dr;
      if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
      if (!isWalkable(c, r)) continue;
      candidates.push({ col: c, row: r, d: Math.abs(dc) + Math.abs(dr) });
    }
    if (candidates.length === 0) return;
    const weights = candidates.map(o => Math.max(1, 4 - o.d));
    let total = 0; for (const w of weights) total += w;
    let pick = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) { pick -= weights[i]; if (pick <= 0) { thunderTargetCandidate = candidates[i]; break; } }
    if (!thunderTargetCandidate) thunderTargetCandidate = candidates[0];
  }
  thunderTarget = thunderTargetCandidate;
  thunderWarnTimer = THUNDER_WARN_TIME;
  // 创建九宫格红色预警层
  if (!thunderWarnLayer) {
    thunderWarnLayer = new Graphics();
    app.stage.addChild(thunderWarnLayer);
  }
  thunderWarnLayer.clear();
  const tw = tileW * scale, th = tileH * scale;
  // 🐛 以 (0,0) 为图层中心绘制 3×3 九宫格，图层定位到目标格中心，与闪电落点/伤害判定基准完全统一
  thunderWarnLayer.rect(-tw / 2, -th / 2, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(-tw / 2, -th * 1.5, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(-tw / 2, th / 2, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(-tw * 1.5, -th / 2, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(tw / 2, -th / 2, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(-tw * 1.5, -th * 1.5, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(tw / 2, -th * 1.5, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(-tw * 1.5, th / 2, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  thunderWarnLayer.rect(tw / 2, th / 2, tw, th).fill({ color: 0xff2222, alpha: 0.65 });
  // 伤害区域外圈：半透明红线边框（明确 3×3 伤害范围，无淡红填充）
  thunderWarnLayer.rect(-tw * 1.5, -th * 1.5, tw * 3, th * 0.08).fill({ color: 0xff5555, alpha: 0.6 });
  thunderWarnLayer.rect(-tw * 1.5, th * 1.42, tw * 3, th * 0.08).fill({ color: 0xff5555, alpha: 0.6 });
  thunderWarnLayer.rect(-tw * 1.5, -th * 1.5, tw * 0.08, th * 3).fill({ color: 0xff5555, alpha: 0.6 });
  thunderWarnLayer.rect(tw * 1.42, -th * 1.5, tw * 0.08, th * 3).fill({ color: 0xff5555, alpha: 0.6 });
  thunderWarnLayer.visible = true;
  // 🐛 定位到目标格中心（与闪电落点 cx/cy、伤害像素判定同一基准）
  thunderWarnLayer.x = mapOffsetX + (thunderTarget.col + 0.5) * tileW * scale;
  thunderWarnLayer.y = mapOffsetY + (thunderTarget.row + 0.5) * tileH * scale;
}

// 落雷：对预警格造成伤害，展示闪电特效
function strikeThunder() {
  thunderWarnTimer = 0;
  if (thunderWarnLayer) thunderWarnLayer.visible = false;
  const target = thunderTarget;
  thunderTarget = null;
  if (!target) return;
  // ⚡ 闪电特效：黄色锯齿闪电从屏幕顶部劈到落雷格
  if (!thunderBoltLayer) {
    thunderBoltLayer = new Graphics();
    app.stage.addChild(thunderBoltLayer);
  }
  thunderBoltLayer.visible = true; // 🐛 修复：每次落雷都要重新显示（之前隐藏后不再显示）
  const tw = tileW * scale, th = tileH * scale;
  // 🐛 改用【地图相对坐标】绘制（不含 mapOffset），图层本身跟随镜头 x/y=mapOffset，
  //    这样闪电会钉在落雷格上，镜头移动时跟随地图滚动而不是钉在屏幕上
  thunderBoltLayer.x = mapOffsetX;
  thunderBoltLayer.y = mapOffsetY;
  const cx = (target.col + 0.5) * tw;   // 落雷格中心（地图相对坐标）
  const cy = (target.row + 0.5) * th;
  const topY = cy - window.innerHeight * 1.2; // 从屏幕顶部上方劈下（相对地图）
  // 保存闪电几何数据，供每帧重绘产生动态闪烁效果
  thunderBoltData = { cx, cy, tw, th, topY, jitter: tw * 2.2, elapsed: 0 };
  thunderFxTimer = 0.45; // 闪电展示时长（含闪烁）
  playSfx('dalei'); // ⚡ 雷雨天打雷音效（不循环）
  drawLightningBolt(true); // 首帧强闪
  // ⚡ 水面电传导：落雷 3×3 命中水面 → 沿整块连续水域扩散
  computeThunderConduct(target);
  // ⚡ 落雷后开启 0.5s 持续伤害窗口：不瞬间判定，玩家在窗口期内进入 3×3 范围也会受伤，但只伤一次
  thunderDmgWindow = 0.5;
  thunderDmgDone = false;
}

// ⚡ 绘制动态闪电（每帧重绘：随机抖动闪烁 + 亮度衰减 + 落点光晕呼吸）
function drawLightningBolt(firstFrame) {
  if (!thunderBoltLayer || !thunderBoltData) return;
  const { cx, cy, tw, th, topY, jitter } = thunderBoltData;
  const g = thunderBoltLayer;
  g.clear();
  // 主闪电进度：0.45s 内衰减（首帧最亮）
  const life = thunderFxTimer / 0.45;
  const t = firstFrame ? 1 : Math.max(0, life);
  const alpha = Math.max(0, t * (0.75 + Math.random() * 0.25)); // 衰减 + 随机闪烁
  // 生成锯齿闪电路径（每帧随机抖动 → 视觉上电弧在抖动）
  const segs = 12;
  const pts = [];
  const jitterScale = jitter * (0.4 + Math.random() * 0.6); // 抖动幅度随机
  for (let i = 0; i <= segs; i++) {
    const ratio = i / segs;
    const jx = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * jitterScale;
    pts.push({ x: cx + jx, y: topY + (cy - topY) * ratio });
  }
  // 外圈亮黄（粗）
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) g.lineTo(p.x, p.y);
  g.stroke({ width: tw * 0.16, color: 0xffd020, alpha: alpha * 0.95 });
  // 内圈白芯（细）
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) g.lineTo(p.x, p.y);
  g.stroke({ width: tw * 0.06, color: 0xffffff, alpha: alpha });
  // 分支小电弧（主闪电两侧，随亮度衰减数量）
  const branchCount = Math.max(0, Math.round(3 + 2 * t));
  for (let k = 0; k < branchCount; k++) {
    // 从主闪电中段某处岔出
    const segIdx = 2 + Math.floor(Math.random() * (segs - 3));
    const bx = pts[segIdx].x, by = pts[segIdx].y;
    const ang = Math.random() * Math.PI * 2;
    const len = tw * (0.5 + Math.random() * 1.2);
    const ex = bx + Math.cos(ang) * len;
    const ey = by + Math.sin(ang) * len;
    g.moveTo(bx, by);
    g.lineTo(bx + (ex - bx) * 0.5 + (Math.random() - 0.5) * tw * 0.5, by + (ey - by) * 0.5);
    g.lineTo(ex, ey);
    g.stroke({ width: tw * 0.04, color: 0xffe66a, alpha: alpha * 0.8 });
  }
  // 落点光晕（呼吸：半径随随机波动，亮度衰减）
  const glowR = tw * (0.7 + Math.random() * 0.8 + (1 - t) * 0.8);
  g.circle(cx, cy, glowR).fill({ color: 0xffee55, alpha: 0.45 * alpha });
  g.circle(cx, cy, tw * (0.35 + Math.random() * 0.25)).fill({ color: 0xffffff, alpha: 0.8 * alpha });
  // 落点放射小闪电
  const mini = Math.max(0, Math.round(4 * t));
  for (let k = 0; k < mini; k++) {
    const ang = Math.random() * Math.PI * 2;
    const r1 = tw * 0.3 + Math.random() * tw * 0.2;
    const r2 = r1 + tw * 0.5 + Math.random() * tw * 0.4;
    g.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
    g.lineTo(cx + Math.cos(ang + 0.35) * r2, cy + Math.sin(ang + 0.35) * r2);
    g.stroke({ width: tw * 0.06, color: 0xffe66a, alpha: alpha * 0.85 });
  }
}

// ⚡ 水面电传导：落雷 3×3 若命中水面，从落雷水域 BFS 扩散到整块连续水面
function computeThunderConduct(target) {
  thunderConductCells = [];
  thunderConductDistMap = [];
  thunderConductTimer = 0;
  thunderConductProgress = 0;
  if (!mapContainer || !target) return;
  // 落雷 3×3 直接范围内的水格作为传导源
  const seeds = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const c = target.col + dc, r = target.row + dr;
    if (c < 0 || c >= mapW || r < 0 || r >= mapH) continue;
    if (isWaterCell(c, r)) seeds.push({ col: c, row: r });
  }
  if (seeds.length === 0) return;
  // BFS 四方向找整块连续水面，同时记录到落雷源的 BFS 距离（供扩散动画）
  const visited = new Set();
  const queue = [];
  const distMap = new Map();
  for (const sd of seeds) {
    const k = sd.col + ',' + sd.row;
    if (visited.has(k)) continue;
    visited.add(k); queue.push(sd); distMap.set(k, 0);
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const cur = queue.shift();
    const ck = cur.col + ',' + cur.row;
    const d = distMap.get(ck);
    for (const [dc, dr] of dirs) {
      const nc = cur.col + dc, nr = cur.row + dr;
      if (nc < 0 || nc >= mapW || nr < 0 || nr >= mapH) continue;
      if (!isWaterCell(nc, nr)) continue;
      const nk = nc + ',' + nr;
      if (visited.has(nk)) continue;
      visited.add(nk); queue.push({ col: nc, row: nr }); distMap.set(nk, d + 1);
    }
  }
  for (const [k, dist] of distMap) {
    const p = k.split(',');
    thunderConductCells.push({ col: +p[0], row: +p[1] });
    thunderConductDistMap.push({ col: +p[0], row: +p[1], dist });
  }
  // 传导特效图层（地图坐标，跟随镜头）
  if (!thunderConductLayer) {
    thunderConductLayer = new Graphics();
    app.stage.addChild(thunderConductLayer);
  }
  thunderConductTimer = 1.4; // 特效展示时长
  thunderConductProgress = 0;
}

// 落雷后 0.5s 持续伤害窗口：玩家在窗口期内进入 3×3 范围受伤；命中水面触发导电
function updateThunderDmgWindow(dt) {
  if (thunderDmgWindow <= 0) return;
  thunderDmgWindow -= dt;
  // 窗口结束或已伤过 → 关闭
  if (thunderDmgWindow <= 0 || thunderDmgDone) {
    thunderDmgWindow = 0;
    return;
  }
  if (!thunderBoltData) return;
  const { cx, cy, tw, th } = thunderBoltData;
  const hitRange = tileW * scale * 1.5;
  const playerPxX = (pCol + 0.5) * tileW * scale;
  const playerPxY = (pRow + 0.5) * tileH * scale;
  const inDirect = Math.abs(playerPxX - cx) <= hitRange && Math.abs(playerPxY - cy) <= hitRange;
  const onWater = isWaterCell(pCol, pRow);
  const inConduct = thunderConductCells.some(o => o.col === pCol && o.row === pRow);
  // ⚡ 伤害倍率：直接命中=100%；站在水面被直接命中=100%+50%导电；仅传导水域=50%
  let dmgMult = 0;
  if (inDirect) dmgMult = onWater ? 1 + THUNDER_CONDUCT_PCT : 1;
  else if (inConduct) dmgMult = THUNDER_CONDUCT_PCT;
  if (dmgMult <= 0) return;
  thunderDmgDone = true; // 0.5s 内只伤一次
  user.trackDungeonStat('thunder', 1); // 🏆 被闪电击中（成就：雷霆淬体）
  playSfx('shoushang'); // 🎵 玩家在地牢受到伤害（雷击）音效（不循环）
  const juese = user.pixi?.player?.juese;
  if (juese && juese.maxHp > 0) {
    const base = Math.round(juese.maxHp * THUNDER_DMG_PCT); // ⚡ 雷击基础伤害：15% 最大生命值（同源 config）
    const dmg = Math.max(1, Math.round(base * dmgMult));
    juese.hp = Math.max(0, juese.hp - dmg); // ⚡ 雷击可致死（血量归0触发离开地牢）
    // 🎬 雷击特效：头像抖动 + 闪电滤镜 + 头顶红色负数飘字
    triggerPlayerFx('lightning');
    spawnFloatText('-' + dmg, 0xff4444);
    ElMessage({ message: (dmgMult >= 1.5 ? L('thunderDirect') : (dmgMult >= 1 ? L('thunderStrike') : L('thunderWater'))) + F('takeDmgFmt', { n: dmg }), type: 'error', duration: 1500 });
  }
}

// ⚡ 动态电传导特效：闪电色光晕沿水面格子从落雷点向外扩散 + 电流弧线（无矩形，地图相对坐标，跟随镜头）
function drawThunderConduct() {
  if (!thunderConductLayer) return;
  const g = thunderConductLayer;
  if (thunderConductTimer <= 0 || thunderConductCells.length === 0) {
    g.clear(); g.visible = false; return;
  }
  g.visible = true;
  g.x = mapOffsetX; g.y = mapOffsetY;
  const tw = tileW * scale, th = tileH * scale;
  const maxDist = thunderConductDistMap.length ? Math.max(...thunderConductDistMap.map(o => o.dist)) : 1;
  const edge = thunderConductProgress * maxDist; // 扩散前沿（BFS 距离）
  const life = Math.max(0, thunderConductTimer / 1.4); // 0→1 衰减
  g.clear();
  for (const cell of thunderConductDistMap) {
    const px = (cell.col + 0.5) * tw, py = (cell.row + 0.5) * th;
    const dF = cell.dist - edge;
    const nearFront = Math.abs(dF) <= 1.2; // 扩散前沿带
    if (nearFront) {
      // 前沿：闪电黄光晕 + 白色亮芯 + 向相邻传导格的小电流弧线（每帧随机抖动）
      const fA = (0.4 + Math.random() * 0.5) * life;
      g.circle(px, py, tw * (0.35 + Math.random() * 0.25)).fill({ color: 0xffd94d, alpha: fA });
      g.circle(px, py, tw * 0.16).fill({ color: 0xffffff, alpha: fA * 0.9 });
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = cell.col + dc, nr = cell.row + dr;
        if (thunderConductCells.some(o => o.col === nc && o.row === nr)) {
          const nx = (nc + 0.5) * tw, ny = (nr + 0.5) * th;
          g.moveTo(px, py);
          g.lineTo(px + (nx - px) * 0.5 + (Math.random() - 0.5) * tw * 0.3, py + (ny - py) * 0.5);
          g.lineTo(nx, ny);
          g.stroke({ width: tw * 0.05, color: 0xffe66a, alpha: fA * 0.8 });
        }
      }
    } else {
      // 已传导区域：微弱闪电黄小点（随 life 衰减）
      const baseA = (0.08 + Math.random() * 0.1) * life;
      g.circle(px, py, tw * 0.12).fill({ color: 0xffd94d, alpha: baseA });
    }
  }
}

// ⚡ 更新水面电传导特效（扩散推进 + 定时衰减）
function updateThunderConduct(dt) {
  if (!thunderConductLayer) return;
  if (thunderConductTimer > 0) {
    thunderConductTimer -= dt;
    thunderConductProgress = Math.min(1, thunderConductProgress + dt / 0.45); // 0.45s 扩散完整个水域
    drawThunderConduct();
  } else {
    thunderConductLayer.clear();
    thunderConductLayer.visible = false;
  }
}

// 雷雨天 ticker 驱动：返回是否显示预警中
function updateThunder(dt) {
  // 地牢暂停（战斗/对话/弹窗）时不落雷
  if (dungeonPaused || storyPaused) {
    if (thunderWarnLayer) thunderWarnLayer.visible = false;
    if (thunderBoltLayer) thunderBoltLayer.visible = false;
    if (thunderConductLayer) { thunderConductLayer.visible = false; thunderConductTimer = 0; }
    thunderDmgWindow = 0;
    return;
  }
  if (currentWeather !== 'thunderstorm') {
    if (thunderWarnLayer) thunderWarnLayer.visible = false;
    if (thunderBoltLayer) thunderBoltLayer.visible = false;
    if (thunderConductLayer) { thunderConductLayer.visible = false; thunderConductTimer = 0; }
    thunderDmgWindow = 0;
    return;
  }
  // 预警/落雷图层跟随镜头（防止镜头移动后错位）——定位到目标格中心，与预警绘制/伤害基准一致
  if (thunderWarnLayer && thunderWarnLayer.visible && thunderTarget) {
    thunderWarnLayer.x = mapOffsetX + (thunderTarget.col + 0.5) * tileW * scale;
    thunderWarnLayer.y = mapOffsetY + (thunderTarget.row + 0.5) * tileH * scale;
  }
  // 隐藏闪电特效
  // 闪电显示期间：图层跟随镜头（闪电钉在落雷格上，镜头滚动时跟地图一起动）+ 每帧重绘动态闪烁
  if (thunderBoltLayer && thunderBoltLayer.visible) {
    thunderBoltLayer.x = mapOffsetX;
    thunderBoltLayer.y = mapOffsetY;
    thunderFxTimer -= dt;
    if (thunderBoltData) thunderBoltData.elapsed += dt;
    if (thunderFxTimer <= 0) {
      thunderBoltLayer.visible = false;
    } else {
      drawLightningBolt(false); // 每帧重绘：电弧抖动、亮度衰减、光晕呼吸
    }
    // ⚡ 落雷后 0.5s 持续伤害窗口：玩家窗口期内进入 3×3 范围也会受伤，只伤一次
    updateThunderDmgWindow(dt);
  }
  updateThunderConduct(dt); // ⚡ 水面电传导特效更新（扩散/闪烁/衰减）
  if (thunderWarnTimer > 0) {
    // 预警中
    thunderWarnTimer -= dt;
    if (thunderWarnTimer <= 0) strikeThunder();
    return;
  }
  // 预警结束 → 倒计时下一次落雷
  thunderTimer -= dt;
  if (thunderTimer <= 0) {
    thunderTimer = THUNDER_INTERVAL;
    startThunderWarning();
  }
}

// ========== 加载指定层地图（重建 solidGrid / spawn / items / stairs / 迷雾存档） ==========
// 🌦️ 天气特效层级修复：把雪/雨/雷/雾/氛围层提到迷雾(fogGraphics)之上，
//    避免 init 时 fog 后创建盖住先创建的天气层（切换层重建的天气层天然在 fog 之上，无需处理）
function bringWeatherAboveFog() {
  const layers = [
    snowGraphics, rainGraphics, fogSmokeGraphics,
    thunderWarnLayer, thunderBoltLayer, thunderConductLayer, thunderFlashLayer,
    bloodmoonOverlay, windFxLayer,
  ];
  for (const layer of layers) {
    if (layer && layer.parent) layer.parent.addChild(layer); // addChild 移到父级末尾=最顶层
  }
}

// 🎯 视口判定：实体像素坐标（地图系）是否在屏幕可见范围内（含余量）
function isEntityOnScreen(px, py, margin = 0) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sx = px + mapOffsetX, sy = py + mapOffsetY;
  return sx >= -margin && sx <= vw + margin && sy >= -margin && sy <= vh + margin;
}

// 🚪 选择进入地牢时的出生点：优先「上次使用 spawn 传送点退出的位置」（同层且坐标仍存在），
//    其次 Tiled 指定 initial=true 的初始出生点，最后回退第一个（不再随机传送）
function pickSpawnPoint(points, level) {
  if (!points || points.length === 0) return null;
  const curLv = level ?? currentLevel.value;
  try {
    const raw = localStorage.getItem(DUNGEON_LAST_SPAWN_KEY);
    if (raw) {
      const last = JSON.parse(raw);
      if (last && Number(last.level) === Number(curLv)) {
        const hit = points.find(sp => sp.col === Number(last.col) && sp.row === Number(last.row));
        if (hit) return hit;
      }
    }
  } catch (e) { /* ignore */ }
  // 🏳️ 指定初始出生点（Tiled spawn 对象属性 initial=true），不再随机选
  const initial = points.find(sp => sp.initial);
  if (initial) return initial;
  return points[0];
}

// ⏳ 预加载下一层地图图块集资源（进下层时秒开；失败静默，不影响当前层）
async function preloadNextLevel() {
  try {
    const next = Number(currentLevel.value) + 1;
    const url = DUNGEON_LEVEL_MAPS[next];
    if (!url || url === DUNGEON_LEVEL_MAPS[currentLevel.value]) return;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const data = await resp.json();
    const urls = [];
    for (const ts of data.tilesets || []) {
      if (ts.image) urls.push(ts.image);
      else if (ts.source) {
        try {
          const tsResp = await fetch(ts.source);
          if (tsResp.ok) { const tsd = await tsResp.json(); if (tsd.image) urls.push(tsd.image); }
        } catch (e) { /* ignore */ }
      }
    }
    await Promise.all(urls.map(u => Assets.load(u).catch(() => null)));
  } catch (e) { /* ignore */ }
}

async function loadMapForLevel(level) {
  // 🗺️ 无限层：DUNGEON_LEVEL_MAPS 未配置的高层按层数循环复用已有地图（1→图1、2→图2、3→图1…）
  const mapKeys = Object.keys(DUNGEON_LEVEL_MAPS).map(Number).sort((a, b) => a - b);
  let url = DUNGEON_LEVEL_MAPS[level];
  if (!url && mapKeys.length) {
    url = DUNGEON_LEVEL_MAPS[mapKeys[((Number(level) || 1) - 1) % mapKeys.length]];
  }
  if (!url) return false;
  // ⏳ 加载遮罩：进入地牢/切换层时显示进度条（黑屏加载），平滑推进，真实节点跳档，完成跳 100 隐藏
  showDungeonLoading.value = true;
  loadProgress.value = 8;
  if (dungeonLoadTimer) { clearInterval(dungeonLoadTimer); dungeonLoadTimer = null; }
  dungeonLoadTimer = setInterval(() => {
    if (loadProgress.value < 92) loadProgress.value = Math.min(92, loadProgress.value + Math.random() * 2.5);
  }, 130);
  // 🔥 重置当前层图块集收集（新层加载过程中由 dungeonLoadAsset 填充）
  currentLayerTilesetKeys = [];
  clearAtmosphereFx(); // 🏜️ 氛围特效（光束/尘埃/投影）随旧地图销毁前清理
  // 销毁旧地图容器
  if (mapContainer) {
    try { app.stage.removeChild(mapContainer); } catch (e) { /* ignore */ }
    try { mapContainer.destroy({ children: true }); } catch (e) { /* ignore */ }
    mapContainer = null;
    fireflyDots = []; // 🌙 萤火虫随地图容器销毁（世界坐标），天黑后 ensureNightAtmo 自动重建
    obstacleGraphics = null; // 旧障碍物图层随容器销毁，置 null 让 renderObstacles 重建
    chestGraphics = null; // 旧宝箱图层随容器销毁，置 null 让 renderChests 重建
    obstacleSpriteLayer = null; // 🖼️ 旧木箱 Sprite 层随容器销毁
    chestSpriteLayer = null;    // 🖼️ 旧宝箱 Sprite 层随容器销毁
    clearFootprints(); // 👣 足迹随容器销毁
    flowWaterSprites = []; flowMagmaSprites = []; magmaBubbles = []; flowLayer = null; // 🌊 流动层随容器销毁
    clearMapLights(); // 💡 动态点光源重建前清理
    for (const cl of coverLayers) { try { app.stage.removeChild(cl); } catch (e) { /* ignore */ } try { cl.destroy({ children: true }); } catch (e) { /* ignore */ } }
    treeSwayFilters = [];
    coverLayers = []; // 🌳 遮挡层随地图销毁
    coverSortState = {}; coverSwayMode = {}; coverColByLabel = {}; coverRowByLabel = {}; coverZByLabel = {}; colRows = {}; // 🗂️ 遮挡状态/映射随地图重置
  }
  // 🔥 清理旧岩浆覆盖层引用（覆盖层是 mapContainer 子节点，随地图容器销毁；这里只需置 null）
  magmaCoverLayer = null;
  const asset = await loadTiledMapAsset(url, { loadAsset: dungeonLoadAsset, tileSpritePadding: 1 }); // 🟩 瓦片外扩 1px，消除瓦片间黑色缝隙网格线
  if (loadProgress.value < 45) loadProgress.value = 45; // ⏳ 地图资源加载完成
  mapContainer = asset.container;
  const mapData = asset.mapData;
  curMapData = mapData; // 🗺️ 缓存当前地图 mapData（供 updateMagmaCover 用）
  // 🔥 纹理缓存卸载：释放「不再被当前层使用」的旧图块集纹理（同层复用则不卸载），防长时间多地图 OOM
  for (const k of loadedTilesetKeys) {
    if (!currentLayerTilesetKeys.includes(k)) {
      try { Assets.unload(k); } catch (e) { /* ignore */ }
    }
  }
  loadedTilesetKeys = currentLayerTilesetKeys.slice();
  mapW = mapData.width;
  mapH = mapData.height;
  tileW = mapData.tilewidth;
  tileH = mapData.tileheight;
  totalCells.value = mapW * mapH;

  // 🎯 读取地图属性：玩家可见度范围（Tiled 地图属性 viewRadius，每张地图可单独设置，默认 4）
  visibleRadius = DUNGEON_COMBAT_CFG.playerVisibleRadius;
  // 🌦️ 读取天气：默认晴天，从 Tiled 地图属性 weather 读取（可选覆盖 playerSlowPercent / fogReduceRadius / enemySpeedUpPercent）
  currentWeather = 'sunny';
  weatherFogReduce = 0;
  tiledFogReduceOverride = -1; // 重置 Tiled 覆盖值
  let cfgPlayerSlow = WEATHER_CFG.sunny.playerSlow;
  let cfgEnemySpeedUp = WEATHER_CFG.sunny.enemySpeedUp;
  // 🎛️ 读取 Tiled 地图属性 fixedWeather（布尔）：勾选后固定采用 weather 设置的天气，跳过随机
  tiledFixedWeather = false;
  for (const p of mapData.properties || []) {
    if (p.name === 'fixedWeather') {
      tiledFixedWeather = p.value === true || String(p.value).toLowerCase() === 'true';
    }
  }
  // 🎲 世界地图进入地牢：默认按场景权重随机抽取天气（优先于 Tiled 静态 weather）
  //    若 fixedWeather 勾选为真 → 固定采用 Tiled 的 weather 属性，不随机
  const entrySceneId = user.getDialogueFlag?.('dungeonEntrySceneId') || '';
  // 🌲 森林使者：恶劣天气概率降低（非晴天权重 ×(1-reducePct%)）
  const _forestBadMult = user.hasTalent('forest_messenger') ? (1 - (user.getTalentEffect?.('forest_messenger', 'reducePct') ?? 20) / 100) : 1;
  const rolledWeather = tiledFixedWeather ? null : rollDungeonWeather(entrySceneId, _forestBadMult);
  if (rolledWeather) currentWeather = rolledWeather;
  for (const p of mapData.properties || []) {
    if (p.name === 'viewRadius') {
      const v = Number(p.value);
      if (isFinite(v) && v >= 1) visibleRadius = v;
    } else if (p.name === 'weather') {
      // 仅当世界地图未随机指定天气时，才采用 Tiled 静态天气
      if (!rolledWeather) {
        const w = String(p.value || 'sunny').toLowerCase();
        if (WEATHER_CFG[w]) currentWeather = w;
      }
    } else if (p.name === 'fogReduceRadius') {
      const v = Number(p.value);
      if (isFinite(v) && v >= 0) {
        weatherFogReduce = v;
        tiledFogReduceOverride = v; // 缓存 Tiled 覆盖值，供 resume 重随机时沿用
      }
    }
  }
  // 🐰 黑米旧被动「晴空庇佑」已封存（必定晴天效果保留给后续角色）；新被动 = 地图凝视（完整地图 + 敌人索敌角度减半）
  // if (user.getNpcAlly?.() === 'tuzi') { currentWeather = 'sunny'; weatherFogReduce = 0; }
  // 应用天气配置（tiled 可覆盖移速/敌人加速百分比）
  const baseCfg = WEATHER_CFG[currentWeather] || WEATHER_CFG.sunny;
  cfgPlayerSlow = baseCfg.playerSlow;
  cfgEnemySpeedUp = baseCfg.enemySpeedUp;
  if (currentWeather === 'bloodmoon') user.trackDungeonStat('bloodmoon', 1); // 🏆 遭遇血月（成就：血月见证者；黑米晴空庇佑已封存，正常记录）
  playBgMusic(currentWeather); // 🎵 进入地牢/切层：按当前天气播放循环背景音乐
  for (const p of mapData.properties || []) {
    if (p.name === 'playerSlowPercent') {
      const v = Number(p.value);
      if (isFinite(v) && v >= 0) cfgPlayerSlow = Math.min(1, v / 100);
    } else if (p.name === 'enemySpeedUpPercent') {
      const v = Number(p.value);
      if (isFinite(v) && v >= 0) cfgEnemySpeedUp = v / 100;
    }
  }
  // 若 tiled 未单独配置 fogReduceRadius，则用天气默认减少格数
  let hasFogReduceProp = false;
  for (const p of mapData.properties || []) {
    if (p.name === 'fogReduceRadius') { hasFogReduceProp = true; break; }
  }
  if (!hasFogReduceProp) weatherFogReduce = baseCfg.fogReduce;
  // 🎬 读取地图属性配置的进入地牢对话（dialogLoadData + dialogRoute，与 stairs 相同格式）
  //    仅在 enableEntryDialogue 勾选为真时才检测对话，为假/未勾选则直接跳过
  mapEntryDialogue = null;
  let enableEntryDialogue = false;
  for (const p of mapData.properties || []) {
    if (p.name === 'enableEntryDialogue') {
      enableEntryDialogue = p.value === true || String(p.value).toLowerCase() === 'true';
    } else if (p.name === 'dialogLoadData' && p.value) {
      mapEntryDialogue = mapEntryDialogue || {};
      mapEntryDialogue.dialogLoadData = String(p.value);
    } else if (p.name === 'dialogRoute' && p.value) {
      try {
        const parsed = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
        if (Array.isArray(parsed)) {
          mapEntryDialogue = mapEntryDialogue || {};
          mapEntryDialogue.dialogRoute = parsed;
        }
      } catch (e) { /* 忽略解析失败 */ }
    }
  }
  // 🎛️ 开关为假：不检测进入对话（清空 mapEntryDialogue）
  if (!enableEntryDialogue) mapEntryDialogue = null;
  // 存到模块级变量供移动/视野计算
  weatherPlayerSlow = cfgPlayerSlow;
  weatherEnemySpeedUp = cfgEnemySpeedUp;
  weatherUi.value = currentWeather; // 同步给模板显示
  // ❄️ 每次重新进入地牢/切换层都重置雪天冻伤计时
  snowStayTimer = 0;
  snowDmgTimer = 0;
  // 💨 每次重新进入地牢/切换层都重置暴风雨吹风倒计时
  resetWindBlast();
  // 🌦️ 应用天气滤镜到地图容器
  applyWeatherFilter();

  const solidTiles = collectSolidTiles(mapData);
  solidGrid = buildSolidGrid(mapData, solidTiles);
  glassGrid = buildGlassGrid(mapData); // 🪟 构建玻璃网格（阻挡移动但不阻挡视野）
  terrainGrid = buildTerrainGrid(mapData); // 🌊 构建地形网格（移速倍率）
  const terrainNameGrid = buildTerrainNameGrid(mapData); // 🗺️ 构建瓦片名称网格（tiled terrain 属性）
  visionGrid = buildVisionGrid(mapData); // 🌿 构建视野减少网格（草地等减少视野）
  iceGrid = buildIceGrid(mapData); // 🧊 构建冰面网格（滑行/惯性）
  waterGrid = buildWaterGrid(mapData); // 💧 构建水属性网格（浅水/深水，下雪时冻结）
  damageGrid = buildDamageGrid(mapData); // 🔥 构建伤害网格（岩浆等持续扣血）
  sandGrid = buildSandGrid(mapData); // 🏜️ 构建沙地网格（渐进减速）
  puddleGrid = buildPuddleGrid(mapData); // 💧 构建雨洼网格（puddle=true 的石板，雨天渲染雨洼）
  // 🧩 注入子模块地图解析环境（mapReader.js：对象层读取/网格查询全部走此处注入的快照与 getter）
  initMapReader({
    mapW, mapH, tileW, tileH, scale,
    getCurrentWeather: () => currentWeather,   // getter 型：战斗返回重随机天气后始终读最新值
    glassGrid, terrainGrid, visionGrid, iceGrid, waterGrid, damageGrid, sandGrid, puddleGrid,
    terrainNameGrid,
    isWalkable,
    sealLayerCells,                                   // 引用型（对象引用恒定）
    getSealZones: () => sealZones,                    // getter 型（主文件会重新赋值数组）
    getPreSealedZones: () => preSealedZones,
    getSealLayers: () => sealLayers,
    getTriggers: () => triggers,
    getGatherPoints: () => gatherPoints,
  });
  // 💧 生成雨洼涟漪数据（必须在 initMapReader 之后：buildPuddleData 依赖 isWaterCell，
  //    而 isWaterCell 读 mapReader 内部的 waterGrid，需先经 initMapReader 注入）
  buildPuddleData();
  // 🔥 记录岩浆格子（供雨天/雪天浇灭变石板用）
  magmaCells = [];
  for (let r = 0; r < mapH; r++) {
    for (let c = 0; c < mapW; c++) {
      if ((damageGrid[r][c] || 0) > 0) magmaCells.push({ col: c, row: r });
    }
  }

  mapContainer.scale.set(scale);
  // 🧱 地图容器插到 stage 最底层，确保迷雾/光圈/玩家头像始终在地图之上不被覆盖
  app.stage.addChildAt(mapContainer, 0);
  // 🎲 创建 respawn 道具容器（mapContainer 子节点，随镜头移动；手动渲染道具 Sprite）
  if (respawnItemContainer) { try { respawnItemContainer.destroy(); } catch (e) { /* ignore */ } respawnItemContainer = null; }
  respawnItemContainer = new Container();
  mapContainer.addChild(respawnItemContainer);
  respawnItemSprites = [];
  // 💧 记录水属性格子（浅水/深水，供雪天冻结为冰面用；此时 mapContainer 已 addChild，getTile 可用）
  waterCells = [];
  if (waterGrid && mapContainer && typeof mapContainer.getTile === 'function') {
    for (let r = 0; r < mapH; r++) {
      for (let c = 0; c < mapW; c++) {
        if (waterGrid[r][c] === 1) {
          // 记录原始瓦片（tsIndex + localId，供雪天结束后还原）
          let origLocal = 1; // 默认浅水
          let origTs = 0;
          try {
            const t = mapContainer.getTile('地板与墙壁', c, r);
            if (t) { origLocal = t.localId; origTs = t.tilesetIndex; }
          } catch (e) { /* ignore */ }
          waterCells.push({ col: c, row: r, origLocal, origTs });
        }
      }
    }
  }

  // 🌅 环境光层次（每帧随镜头同步）
  createAmbientLayer();
  // 🌦️ 创建天气氛围层（覆盖全屏半透明色调，需在 stage 上）
  createWeatherAtmosphere();
  // 🌧️ 创建雨滴粒子（雨天/暴风雨/雷雨天）
  createRainDrops();
  // ❄️ 创建雪花粒子（雪天）
  createSnowDrops();
  // 🔥 岩浆变石板覆盖层：此时 magmaCells 已构建、地图已上 stage，雨天/暴风雨/雷雨天/雪天立即生效
  updateMagmaCover();
  createFlowLayer(); // 🌊 水面/岩浆表面流动动画（视天气自动隐藏：雪天冻结/雨天浇灭）

  // 🎁 读取对象层：出生点 + 可拾取道具 + 下楼入口
  spawnPoints = readSpawnsFromMap(mapData);
  spawnPoint = pickSpawnPoint(spawnPoints, level); // 🚪 优先上次使用 spawn 退出的传送点，否则随机
  hasMovedAfterEnter = false; // 🚪 首次进入/切层，移动一次后才检测互动按钮
  pickupItems = readPickupItemsFromMap(mapData);
  respawnItemLayers = readRespawnItemLayers(mapData); // 🎲 可刷新道具图层（进入地牢随机选一层）
  randomSpawnConfig = parseRandomSpawnConfig(mapData); // 🎲 随机刷新道具配置（tiled 地图属性 randomSpawnCount，null=未配置）
  hideObjectLayerBounds(); // 🎭 隐藏对象层调试白框（敌人/宝箱/楼梯等视觉由代码渲染）
  refreshRespawnItems(); // 🎲 随机选取一个可刷新道具图层作为本次地牢的道具物资刷新点
  ensureRespawnSkins(); // 🎲 预渲染随机道具池 spine 皮肤图（异步，就绪后自动补图）
  // 🏰 读取楼梯（tiled 只摆位置），去向/消耗/下楼对话从代码配置表 STAIRS_CONFIG 合并（按层数，代码优先）
  const stairsRaw = readStairsFromMap(mapData);
  stairsPoint = stairsRaw ? { ...STAIRS_DEFAULT, ...stairsRaw, ...(STAIRS_CONFIG[currentLevel.value] || {}) } : null; // ⚠️ 无楼梯对象时保持 null
  lightPoints = readLightsFromMap(mapData); // 💡 读取光点
  createMapLights(); // 💡 渲染 Tiled light 对象为动态点光源（火把/篝火/发光物，火焰摇曳）
  createAtmosphereFx(); // 🏜️ 氛围特效：光柱（light 对象 beam 属性）/ 漂浮尘埃 / 物体方向影（prop/tree/stone 对象）
  // 🔐 读取封印系统（tiled 只摆位置 + 对象名/switchId 标识，sealCells 仍在 tiled），解锁条件/文案从代码配置表合并（代码优先）
  sealZones = readSealZonesFromMap(mapData).map(z => ({
    ...SEAL_EXIT_DEFAULT, ...z, ...(SEAL_EXIT_CONFIG[z.id] || {}),
  }));
  preSealedZones = readPreSealedZonesFromMap(mapData).map(z => ({
    ...PRE_SEAL_DEFAULT, ...z, ...(PRE_SEAL_CONFIG[z.id] || {}),
  }));
  switches = readSwitchesFromMap(mapData).map(s => ({
    ...SWITCH_DEFAULT, ...s, ...(SWITCH_CONFIG[s.switchId] || {}),
  }));
  // 🚪 收集 Tiled 里的封印瓦片层（层名格式 seal_{id}），通过 visible 控制显示/隐藏
  sealLayers = {};
  const collectSealLayers = (container) => {
    if (!container || !container.children) return;
    for (const child of container.children) {
      // ⚠️ pixi v8：Container.name 已移除，Tiled 图层名存在 label（pixi-tiledmap 用 label 存图层名）
      if (child.label && typeof child.label === 'string' && child.label.startsWith('seal_')) {
        const sealId = child.label.replace('seal_', '');
        sealLayers[sealId] = child;
      }
      if (child.children) collectSealLayers(child);
    }
  };
  collectSealLayers(mapContainer);
  // 🌳 收集遮挡层：label 以 cover_ 开头的瓦片图层从地图容器提出，挂到 stage（玩家之上、跟随镜头），用于树冠/屋檐遮挡玩家
  coverLayers = [];
  // 🌳 按瓦片拆分 cover 层（非动画层）：每个瓦片一个独立容器 → 精确遮挡（只有真正在玩家前方的瓦片才盖玩家），
  //    避免整列/整层瓦片（含玩家同行、旁边的墙）一起压到玩家身上导致"覆盖掉"
  // 🌬️ 动画层（swayMode=swing*）保持按列拆（树冠整体摆动，遮挡粒度粗但动画完整）
  const splitCoverByColumn = (cl) => {
    try {
      const m = cl.children && cl.children[0];
      const g = m && m._geometry;
      if (!g || !g.buffers || g.buffers.length < 2) return [cl];
      const pos = (g.buffers[0].data || g.buffers[0]);
      const uv = (g.buffers[1].data || g.buffers[1]);
      const nTiles = Math.floor(pos.length / 8); // 每瓦片 4 顶点 × 2 floats
      if (nTiles < 1) return []; // 空层，无需容器
      const mode = readCoverSwayMode(cl.label);
      const isAnim = mode === 'swing' || mode === 'swing1' || mode === 'swing2';
      if (!isAnim) {
        // 🗂️ 非动画层：每瓦片一个容器（label = 层#列#行），精确遮挡
        const parts = [];
        for (let i = 0; i < nTiles; i++) {
          const o = i * 8;
          const col = Math.round(pos[o] / tileW);
          const row = Math.round(pos[o + 1] / tileH);
          const geo = new Geometry();
          geo.addAttribute('aPosition', new Float32Array([
            pos[o], pos[o + 1], pos[o + 2], pos[o + 3], pos[o + 4], pos[o + 5], pos[o + 6], pos[o + 7],
          ]), 2);
          geo.addAttribute('aUV', new Float32Array([
            uv[o], uv[o + 1], uv[o + 2], uv[o + 3], uv[o + 4], uv[o + 5], uv[o + 6], uv[o + 7],
          ]), 2);
          geo.addIndex(new Uint16Array([0, 1, 2, 0, 2, 3]));
          const mesh = new Mesh({ geometry: geo, texture: m.texture, shader: m.shader || undefined });
          const c = new Container();
          c.label = cl.label + '#' + col + '#' + row; // 🗂️ label 带真实列号与行号，供瓦片级遮挡判断
          try { c.scale.set(scale); } catch (e) { /* ignore */ }
          c.addChild(mesh);
          parts.push(c);
        }
        return parts;
      }
      // 🌳 动画层：按列拆分（同列瓦片视为一棵树/一根柱，树冠整体摆动）
      const groups = new Map();
      for (let i = 0; i < nTiles; i++) {
        const col = Math.round(pos[i * 8] / tileW);
        if (!groups.has(col)) groups.set(col, []);
        groups.get(col).push(i);
      }
      const parts = [];
      for (const [col, tiles] of groups) {
        const npos = []; const nuv = []; const nidx = [];
        tiles.forEach((ti, j) => {
          const o = ti * 8;
          for (let v = 0; v < 4; v++) {
            npos.push(pos[o + v * 2], pos[o + v * 2 + 1]);
            nuv.push(uv[o + v * 2], uv[o + v * 2 + 1]);
          }
          const b = j * 4;
          nidx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        });
        const geo = new Geometry();
        geo.addAttribute('aPosition', new Float32Array(npos), 2);
        geo.addAttribute('aUV', new Float32Array(nuv), 2);
        geo.addIndex(new Uint16Array(nidx));
        const mesh = new Mesh({ geometry: geo, texture: m.texture, shader: m.shader || undefined });
        const c = new Container();
        c.label = cl.label + '#' + col; // 🗂️ label 带真实列号，供列级遮挡判断
        try { c.scale.set(scale); } catch (e) { /* ignore */ }
        c.addChild(mesh);
        parts.push(c);
      }
      return parts;
    } catch (e) {
      console.warn('[cover拆分] 失败，保持整层：', e?.message || e);
      return [cl];
    }
  };
  // 🌬️ 读 Tiled 图层自定义属性 swayMode（none/slide/swing），未设置默认 none（无动画）
  const readCoverSwayMode = (label) => {
    try {
      const l = (curMapData?.layers || []).find(x => x.name === label);
      const p = l?.properties || [];
      const v = p.find(x => x.name === 'swayMode');
      if (v && (v.value === 'none' || v.value === 'swing' || v.value === 'swing1' || v.value === 'swing2' || v.value === 'slide')) return v.value;
    } catch (e) { /* ignore */ }
    return 'none';
  };
  // 🪜 读 Tiled 图层自定义属性 coverZ（上下级：数字，越大越上层），未设置默认 0
  const readCoverZ = (label) => {
    try {
      const l = (curMapData?.layers || []).find(x => x.name === label);
      const p = l?.properties || [];
      const v = p.find(x => x.name === 'coverZ');
      if (v && v.value !== undefined && v.value !== null && v.value !== '') {
        const n = Number(v.value);
        if (!Number.isNaN(n)) return n;
      }
    } catch (e) { /* ignore */ }
    return 0;
  };
  const collectCoverLayers = (container) => {
    if (!container || !container.children) return;
    // ⚠️ 先收集再移除：for...of 中 removeChild 会跳过下一个元素（cover_障碍1 曾被漏提）
    const matched = [];
    const scan = (c) => {
      for (const child of c.children || []) {
        if (child.label && typeof child.label === 'string' && child.label.startsWith('cover_')) matched.push(child);
        if (child.children) scan(child);
      }
    };
    scan(container);
    for (const child of matched) {
      try { mapContainer.removeChild(child); } catch (e) { /* ignore */ }
      try { child.scale.set(scale); } catch (e) { /* ignore */ }
      // 🌬️ 读取 Tiled 图层自定义属性 swayMode：none=无动画 / slide=左右横移 / swing=扇形摆动（底部固定头部动）
      const mode = readCoverSwayMode(child.label);
      // 🪜 读取 Tiled 图层自定义属性 coverZ：cover 图层上下级（越大越上层，默认 0）
      const z = readCoverZ(child.label);
      coverZByLabel[child.label] = z;
      // 🗂️ 所有 cover 图层统一拆分：非动画层按瓦片（精确遮挡）、动画层按列（树冠整体摆动）→
      //    只有真正在玩家前方的瓦片才盖玩家（不会"整面墙/整列盖玩家"导致覆盖掉），同层多瓦片按 coverZ 排序 → 层级稳定
      const parts = splitCoverByColumn(child);
      try { app.stage.removeChild(child); } catch (e) { /* ignore */ }
      for (const c of parts) {
        coverSwayMode[c.label] = mode; // swing 层每个列容器挂自己的摇曳滤镜（下方统一挂载）
        coverZByLabel[c.label] = z; // 🪜 列容器继承原图层 coverZ
        const lblParts = c.label.split('#');
        coverColByLabel[c.label] = Number(lblParts[1]); // 🗂️ 记录列号（fallback 无 # → NaN → 不参与遮挡）
        coverRowByLabel[c.label] = lblParts.length >= 3 ? Number(lblParts[2]) : undefined; // 🗂️ 瓦片容器记录行号（列容器无行号 → undefined → 走列级判断）
        app.stage.addChild(c);
        coverLayers.push(c);
      }
    }
    // 🪜 cover 图层按 coverZ 升序排列（z 大的在上层），形成上下级关系；同步 stage addChild 顺序
    coverLayers.sort((a, b) => (coverZByLabel[a.label] ?? 0) - (coverZByLabel[b.label] ?? 0));
    for (const cl of coverLayers) {
      try {
        if (cl.parent === app.stage) { app.stage.removeChild(cl); app.stage.addChild(cl); }
      } catch (e) { /* ignore */ }
    }
  };
  collectCoverLayers(mapContainer);
  // 🌬️ 给树冠遮挡层附加微风摇曳 shader（幅度 3px，失败静默）
  // 🗂️ 构建 cover 层列级瓦片行集合 colRows { col: Set<row> }（合并所有图层）：供列级遮挡判断——
  //    玩家脚底落在某列（±1 列）的瓦片范围 → 该列所有列容器 back（盖玩家），其他列保持 front
  // ⚠️ curMapData 的瓦片 data 已被 pixi-tiledmap 消费为 undefined，改从 cover 层 Mesh 顶点反推：
  //    每瓦片 4 顶点连续存储 (x,y)，取每瓦片首个顶点 ÷ tile 尺寸即格子
  colRows = {};
  try {
    for (const cl of coverLayers) {
      const m = cl.children && cl.children[0];
      const buf = m && m._geometry && m._geometry.buffers && m._geometry.buffers[0];
      if (!buf) continue;
      const d = buf.data || buf;
      for (let i = 0; i + 1 < d.length; i += 8) {
        const wx = d[i], wy = d[i + 1];
        if (typeof wx !== 'number' || typeof wy !== 'number') continue;
        const col = Math.round(wx / tileW);
        const row = Math.round(wy / tileH);
        if (col >= 0 && row >= 0) {
          if (!colRows[col]) colRows[col] = new Set();
          colRows[col].add(row);
        }
      }
    }
  } catch (e) { /* ignore */ }
  treeSwayFilters = [];
  for (const cl of coverLayers) {
    try {
      const mode = coverSwayMode[cl.label] || 'slide';
      if (mode === 'none') continue; // 🚫 该图层标记 swayMode=none：不附加滤镜（无动画）
      // swing1 = 更大幅度的钟摆扇形（树冠顶摆幅 24px），swing = 12px；swing2 = 反向钟摆（顶部钉死、底部摆）
      const f = createTreeSwayFilter(mode === 'swing1' ? 24 : 12, mode === 'swing2' ? 'swingRev' : ((mode === 'swing' || mode === 'swing1') ? 'swing' : 'slide'));
      // ⚡ 低性能模式：不挂树冠摇曳滤镜（树冠静态化，省每帧 shader 中间纹理渲染）
      if (f && !isPerfLow()) { cl.filters = [f]; treeSwayFilters.push(f); }
    } catch (e) { /* ignore */ }
  }
  // 🚪 从瓦片层自动读取有墙壁的格子，同步到封印区域（不再依赖对象层的 sealCells 属性）
  syncSealCellsFromLayers(mapData);
  // 🔒 应用所有预封印区域（把对应格子设为障碍物，层在 Tiled 里已默认可见）
  applyPreSeals();
  destroyEnemies(); // 销毁旧层敌人
  enemies = readEnemiesFromMap(mapData); // 👾 读取敌人复活点
  // 🌑 spine=monster1/勾选 isShadow 的普通敌人转为暗影怪（不进入战斗，触碰停留扣血、掉 ENEMY_DROP_RATES.monster1）
  routeShadowEnemies();
  // 🐰 黑米被动「地图凝视」：给全部敌人补索敌角度减半标记（兼容已击败未建 sprite 的敌人）
  const heimiCarried = user.getNpcAlly?.() === 'tuzi';
  enemies.forEach(e => e.fovHalved = heimiCarried);
  destroyNpcs(); // 销毁旧层 NPC
  // 🧑 读取 NPC 标记点（tiled 只摆位置 + npcId），对话/行为从代码配置表 NPC_CONFIG 合并（代码优先）
  npcs = readNpcsFromMap(mapData).map(n => ({
    ...NPC_DEFAULT,
    ...n,
    ...(NPC_CONFIG[n.npcId] || {}),
  }));
  // 🚶 里亚已随玩家回去见莫奇（liyaGone）→ 本层及之后都不再显示
  if (user.getDialogueFlag('liyaGone')) {
    npcs = npcs.filter(n => n.spineKey !== 'shangren2');
  }
  // 🌧️ 恶劣天气（暴风雨/雷雨天/血月）商人莫奇不营业（不出现）
  if (['storm', 'thunderstorm', 'bloodmoon'].includes(currentWeather)) {
    npcs = npcs.filter(n => n.spineKey !== 'shangren1');
  }
  obstacles = readObstaclesFromMap(mapData); // 📦 读取障碍物
  renderObstacles(); // 📦 渲染障碍物
  pushTargets = readPushTargetsFromMap(mapData); // 🎯 读取箱子目标位置
  // 📦 读取宝箱（对象层 + 瓦片层）；对象层宝箱按 id 从代码配置表 CHEST_CONFIG 合并奖励（代码优先，瓦片宝箱不受影响）
  chests = [...readChestsFromMap(mapData).map(c => ({
    ...CHEST_DEFAULT, ...c, ...(CHEST_CONFIG[c.id] || {}),
  })), ...readChestTilesFromMap(mapData)];
  renderChests(); // 📦 渲染宝箱（初始隐藏）
  // 🖼️ 确保 pengzhuang 瓦片纹理已加载，完成后重建木箱/宝箱 Sprite（用真实瓦片图）
  ensureBoxImages().then(() => { if (app && mapContainer) { renderObstacles(); renderChests(); } });
  // ⚡ 读取感应区（tiled 只摆位置 + triggerId），触发行为从代码配置表 TRIGGER_CONFIG 合并（代码优先）
  triggers = readTriggersFromMap(mapData).map(t => ({
    ...TRIGGER_DEFAULT,
    ...t,
    ...(TRIGGER_CONFIG[t.triggerId] || {}),
  }));
  // 🖐️ 读取互动点（tiled 只摆位置 + interactId），互动内容从代码配置表 INTERACT_CONFIG 合并（代码优先）
  interactables = readInteractablesFromMap(mapData).map(it => ({
    ...INTERACT_DEFAULT,
    ...it,
    ...(INTERACT_CONFIG[it.interactId] || {}),
  }));
  nearInteractable.value = null;
  // ⛏️ 读取采集点（tiled 只摆位置 + gatherId），产出从代码配置表 GATHER_CONFIG 合并
  gatherPoints = readGatherPointsFromMap(mapData).map(g => ({
    ...GATHER_DEFAULT,
    ...(GATHER_CONFIG[g.gatherId] || {}),
    ...g,
  }));
  renderGatherSprites(); // ⛏️ 渲染采集点（发光圆点 + 可选贴图）
  // 👾 读取埋击敌人组（平时隐藏，触碰对应感应区后出现并追击）
  ambushGroups = readAmbushGroupsFromMap(mapData);

  // 🧭 读取该层存档：只还原战争迷雾 + 已拾取道具；玩家位置每次都在重生点复活
  exploration = new Uint8Array(mapW * mapH);
  const saved = loadDungeonState();
  if (saved) {
    exploration.set(saved.data);
    for (const p of saved.picked || []) {
      const [itemId, coord] = String(p).split('@');
      const [c, r] = String(coord || '').split(',').map(Number);
      const it = pickupItems.find(x => x.itemId === itemId && x.col === c && x.row === r);
      // 🎲 可刷新道具每次进入地牢重新刷新（taken 不持久化），仅恢复固定 item 的已拾取状态
      if (it && !it.respawn) it.taken = true;
    }
    // ⚡ 恢复已触发的感应区（once=true 的触发过不再触发）
    for (const key of saved.triggeredTriggers || []) {
      const [c, r] = String(key).split(',').map(Number);
      const t = triggers.find(x => x.col === c && x.row === r);
      if (t) t.triggered = true;
    }
    // ⛏️ 恢复已采集的采集点（once=true 的采集过不再显示）
    for (const key of saved.triggeredGathers || []) {
      const [c, r] = String(key).split(',').map(Number);
      const gp = gatherPoints.find(x => x.col === c && x.row === r);
      if (gp) { gp.triggered = true; hideGatherSprite(gp); }
    }
    // 📦 恢复箱子位置+锁定状态（按索引顺序，数量匹配才恢复）
    const pushables = obstacles.filter(o => o.type === 'pushable');
    if (Array.isArray(saved.pushableStates) && saved.pushableStates.length === pushables.length) {
      pushables.forEach((ob, i) => {
        const st = saved.pushableStates[i] || {};
        if (isFinite(st.col) && isFinite(st.row)) {
          ob.col = st.col; ob.row = st.row;
          ob.px = (st.col + 0.5) * tileW * scale;
          ob.py = (st.row + 0.5) * tileH * scale;
        }
        ob.locked = !!st.locked; // 🔒 恢复锁定状态
      });
      renderObstacles();
    }
    // 📦 恢复宝箱出现+开启状态（visible 的宝箱一直显示，未打开的保持未打开）
    for (const st of saved.visibleChests || []) {
      const chest = chests.find(x => x.col === st.col && x.row === st.row);
      if (chest) {
        chest.visible = true;
        chest.opened = !!st.opened;
        if (chest.fromTile && chest.opened) setChestTiles(chest, true); // 🧱 瓦片宝箱恢复已开启瓦片
      }
    }
    renderChests();
    // 🎯 恢复已触发的箱子目标位置（避免重复提示宝箱出现）
    for (const key of saved.triggeredTargets || []) {
      const [c, r] = String(key).split(',').map(Number);
      const t = pushTargets.find(x => x.col === c && x.row === r);
      if (t) t.triggered = true;
    }
    // 🖐️ 恢复已触发的互动点（once=true 的触发过不再触发）
    for (const key of saved.triggeredInteractables || []) {
      const [c, r] = String(key).split(',').map(Number);
      const it = interactables.find(x => x.col === c && x.row === r);
      if (it) it.triggered = true;
    }
    // 💀 恢复 noRespawn 敌人已击败状态（读档后这些敌人保持死亡，不创建 sprite、不复活）
    if (Array.isArray(saved.defeatedNoRespawn)) {
      for (const e of enemies) {
        if (e.noRespawn && saved.defeatedNoRespawn.includes(String(e.id))) {
          e.defeated = true;
        }
      }
    }
    // 🔓 恢复已解锁的预封印区域：保持解封、不重新封印、不弹提示
    if (Array.isArray(saved.unlockedPreSeals)) {
      for (const z of preSealedZones) {
        if (saved.unlockedPreSeals.includes(String(z.id))) {
          unlockPreSeal(z, true); // 静默解封：解封格子 + 隐藏封印层
        }
      }
    }
  }
  // 🔐 应用互动点关联的 seal 层：未解锁=显示+封锁障碍物；已解锁=隐藏+解封
  applyInteractSeals();
  syncPickedSprites();
  // ⏳ 后台预加载下一层资源（不阻塞当前层；玩家下楼梯时图块集已就绪）
  preloadNextLevel();
  // ⏳ 加载完成：进度满 100，延迟隐藏遮罩（等过渡动画播完）
  if (loadProgress.value < 100) loadProgress.value = 100;
  if (dungeonLoadTimer) { clearInterval(dungeonLoadTimer); dungeonLoadTimer = null; }
  setTimeout(() => { showDungeonLoading.value = false; }, 350);
  return true;
}

// ========== 切换地牢层 ==========
async function changeLevel(targetLevel) {
  if (targetLevel === currentLevel.value) return; // 🗺️ 无限层：不再有 DUNGEON_LEVEL_MAPS 等级/地图限制
  // 保存当前层进度
  saveDungeonStateNow();
  // 持久化层数（后续进入地牢直接从该层复活点重生）
  try { localStorage.setItem(DUNGEON_LEVEL_KEY, String(targetLevel)); } catch (e) { /* ignore */ }
  // 🌅 同时记录本次下到该层时的天数（新的一天重新进入地牢时据此重置回第一层）
  try { localStorage.setItem(DUNGEON_LEVEL_DAY_KEY, String(Number(user.pixi?.player?.day) || 1)); } catch (e) { /* ignore */ }
  currentLevel.value = targetLevel;
  // ⚔️ 普通模式：每进入下一层天黑进度 +15%（封顶 100），进度满 100 后进入天黑
  if (user.pixi?.gameMode === 'normal') {
    dungeonNightTime = Math.min(1, dungeonNightTime + 0.15);
  }

  const ok = await loadMapForLevel(targetLevel);
  if (!ok) return;

  // 🏳️ 玩家在新层重生点复活
  isMoving = false;
  clearJoyKeys();
  if (spawnPoint) {
    pCol = spawnPoint.col; pRow = spawnPoint.row;
    targetCol = spawnPoint.col; targetRow = spawnPoint.row;
  } else {
    // 兜底：找第一个可走格
    let found = false;
    for (let r = 2; r < mapH - 2 && !found; r++) {
      for (let c = 2; c < mapW - 2 && !found; c++) {
        if (isWalkable(c, r)) { pCol = c; pRow = r; targetCol = c; targetRow = r; found = true; }
      }
    }
  }
  pPixelX = (pCol + 0.5) * tileW * scale;
  pPixelY = (pRow + 0.5) * tileH * scale;
  playerCol.value = pCol;
  playerRow.value = pRow;
  applyPlayerHead('head_front'); // 直接重新应用外观（切层后纹理状态可能变化，不做 !== 判断）
  syncPlayerPos();
  updateCamera();
  updateVisibility();
  // 🎭 本层路线类型（读持久化字段：组件重建后仍可靠）
  const routeType = user.pixi?.player?._routeType || dungeonRouteType;
  if (routeType === 'rest') {
    // 🛏️ 恢复层：安全屋（无敌人，有楼梯可继续下楼）；进层弹二选一（回血 / 免费强化一张卡）
    enemies = [];
    openRestChoice();
  } else if (routeType === 'event') {
    // ❓ 事件层：进层触发随机小事件（与敌人并存，可先处理事件再战斗）
    rollDungeonEvent();
    createAllEnemySprites(); // 👾 新层敌人 spine 创建（敌人复用玩家 dilaoQ，资源已就绪）
  } else {
    createAllEnemySprites(); // 👾 新层敌人 spine 创建（敌人复用玩家 dilaoQ，资源已就绪）
  }
  createNpcSprites(); // 🧑 新层 NPC spine 创建（map_01 bundle 已在 init 加载，资源就绪）
  setupMiniMap(); // 🗺️ 新层地图加载完成后初始化右侧小地图
  // 🧍 等新层地图/纹理加载完后再渲染一次头像位置（双 rAF 确保纹理就绪，不依赖移动触发）
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (playerSprite) applyPlayerHead('head_front');
  }));
  ElMessage({ message: F('enterLevelFmt', { n: targetLevel }), type: 'success', duration: 1800 });
  // 💬 进入下一层后触发楼梯配置的对话（参考 NPC 的 dialogRoute 条件路由）
  // ⚔️ 普通模式无剧情：跳过并清空楼梯对话
  if (user.pixi?.gameMode === 'normal') {
    pendingStairsDialogue = null;
  } else if (pendingStairsDialogue?.dialogLoadData) {
    const d = pendingStairsDialogue;
    pendingStairsDialogue = null;
    let targetName = null;
    if (Array.isArray(d.dialogRoute) && d.dialogRoute.length > 0) {
      for (const step of d.dialogRoute) {
        if (!matchDialogueCondition(step)) continue;
        targetName = step.name;
        break;
      }
    }
    if (targetName) {
      // 延迟触发，确保新层地图/纹理渲染完成
      setTimeout(() => {
        storyPaused = true;
        dungeonPaused = true;
        emitter.emit('talkToNpc', { loadData: d.dialogLoadData, name: targetName });
      }, 600);
    }
  }
  // 🎬 进入下一层后触发该层地图属性配置的进入对话（dialogLoadData + dialogRoute）
  triggerMapEntryDialogue();
}

// ========== 🎬 地图属性进入对话（进入地牢/切换层时触发） ==========
// Tiled 地图属性可配置 dialogLoadData + dialogRoute（与 stairs 相同格式），
// 每次加载该层地图后自动触发一次；触发时冻结地牢，对话结束由 watch(user.pixi.duihua) 自动解冻
function triggerMapEntryDialogue() {
  // ⚔️ 普通模式无剧情：跳过地图进入对话
  if (user.pixi?.gameMode === 'normal') return;
  try {
    const d = mapEntryDialogue;
    if (!d?.dialogLoadData) return;
    let targetName = null;
    if (Array.isArray(d.dialogRoute) && d.dialogRoute.length > 0) {
      for (const step of d.dialogRoute) {
        if (!matchDialogueCondition(step)) continue;
        targetName = step.name;
        break;
      }
    } else {
      targetName = d.dialogLoadData; // 无路由时直接使用 loadData 作为对话名
    }
    if (targetName) {
      // 延迟触发，确保地图/纹理渲染完成
      setTimeout(() => {
        storyPaused = true;
        dungeonPaused = true;
        emitter.emit('talkToNpc', { loadData: d.dialogLoadData, name: targetName });
      }, 600);
    }
  } catch (e) { /* ignore */ }
}

// ========== 结算 ==========
function openSettle() {
  if (showSettle.value) return;
  keys.up = keys.down = keys.left = keys.right = false;
  dungeonPaused = true; // ⏸️ 弹出结算时立即冻结，玩家和敌人都无法移动
  showSettle.value = true;
}
// 🎒 打开背包：冻结地牢，只显示背包物品列表
function openBag() {
  if (showBag.value) return;
  keys.up = keys.down = keys.left = keys.right = false;
  dungeonPaused = true;
  // 🎴 优先用地牢自己预渲染的缓存；没有则从全局 window 读取（xinxi.vue 生成的）
  if (Object.keys(_dungeonCardCache).length > 0) {
    dungeonCardImgMap.value = { ..._dungeonCardCache };
  } else if (window.__cardImgMap) {
    dungeonCardImgMap.value = { ...window.__cardImgMap };
  }
  if (Object.keys(_dungeonDaojuCache).length > 0) {
    dungeonDaojuImgMap.value = { ..._dungeonDaojuCache };
  } else if (window.__daojuImgMap) {
    dungeonDaojuImgMap.value = { ...window.__daojuImgMap };
  }
  // 异步预渲染（渲染完后自动更新图片）
  initDungeonCardSpines();
  initDungeonDaojuSpines();
  showBag.value = true;
}
function closeBag() {
  showBag.value = false;
  dungeonPaused = false;
  storyPaused = false; // 恢复地牢时清除剧情暂停标志
}
// 🧪 地牢内使用消耗品（恢复药剂等）：恢复地牢生命值/魔力，扣背包数量（BagPanel 用完自动关详情）
function onDungeonUseItem(item) {
  if (!item) return;
  // 💊 特殊物品（永浆/灵剂/灵药/疾行药剂等）统一处理
  const spRes = user.useSpecialPotion(item);
  if (spRes) {
    if (!spRes.ok) { ElMessage({ message: spRes.msg, type: 'warning' }); return; }
    ElMessage({ message: spRes.msg, type: spRes.warn ? 'warning' : 'success' });
    item.num = (item.num || 1) - 1;
    if (item.num <= 0) {
      const idx = user.inventory.indexOf(item);
      if (idx > -1) user.inventory.splice(idx, 1);
    }
    return;
  }
  const juese = user.pixi?.player?.juese;
  let msg = F('usedItemFmt', { name: tr(item.name) });
  if (item.Hp !== undefined && juese) {
    const oldHp = juese.hp || 0;
    juese.hp = Math.min(juese.maxHp || oldHp, oldHp + item.Hp);
    const actual = Math.max(0, (juese.hp || 0) - oldHp);
    msg = msg + F('lifePlusFmt', { n: actual });
  }
  if (item.moli !== undefined) {
    user.attributes.moli += item.moli;
    user.attributes.myMana += item.moli;
    msg = msg + F('manaCapFmt', { n: item.moli });
  }
  ElMessage({ message: msg, type: 'success' });
  item.num = (item.num || 1) - 1;
  if (item.num <= 0) {
    const idx = user.inventory.indexOf(item);
    if (idx > -1) user.inventory.splice(idx, 1);
  }
}
// 🌦️ 天气说明弹窗：打开时冻结地牢，关闭时恢复
// 🌦️ 天气效果说明富文本：按 \n 拆行，数字/百分比与动作词多彩高亮
function formatWeatherDesc(wid) {
  const info = WEATHER_INFO[wid];
  if (!info || !info.desc) return '';
  const accent = info.color || '#d97706'; // 天气主题色（用于每行圆点）
  const lines = String(info.desc).split('\n');
  return lines.map(line => {
    if (!line.trim()) return '';
    // 1) 数字/百分比 → 琥珀加粗
    let html = line.replace(/(\d+(?:\.\d+)?%?)/g, '<b style="color:#e07b00;font-weight:800">$1</b>');
    // 2) 动作/状态词 → 多彩着色
    html = html
      .replace(/降低/g, '<b style="color:#3b82f6">降低</b>')
      .replace(/提升/g, '<b style="color:#ea580c">提升</b>')
      .replace(/扣除|伤害/g, '<b style="color:#dc2626">$&</b>')
      .replace(/预警/g, '<b style="color:#f59e0b">预警</b>')
      .replace(/失效/g, '<b style="color:#6b7280">失效</b>')
      .replace(/结冰|冻结|霜冻/g, '<b style="color:#60a5fa">$&</b>')
      .replace(/附着/g, '<b style="color:#22d3ee">附着</b>')
      .replace(/暴风/g, '<b style="color:#7c8aa5">暴风</b>');
    return '<div style="display:flex;align-items:flex-start;gap:1vh;color:#4a5568;font-size:2.5vh;line-height:1.75;margin-bottom:0.8vh;text-align:left;font-weight:500">'
      + '<span style="color:' + accent + ';font-size:1.5vh;line-height:2.4vh;flex-shrink:0;margin-top:0.8vh">●</span>'
      + '<span>' + html + '</span></div>';
  }).join('');
}
function onWeatherInfoOpen() {
  keys.up = keys.down = keys.left = keys.right = false;
  dungeonPaused = true;
}
function onWeatherInfoClosed() {
  dungeonPaused = false;
  storyPaused = false;
}
// 🌙 夜晚效果说明：富文本（每条独立行 + 数字/动作词高亮）
function formatNightDesc() {
  const lines = [
    L('nightDesc1'),
    L('nightDesc2'),
    L('nightDesc3'),
    L('nightDesc4'),
    L('nightDesc5'),
    L('nightDesc6'),
    L('nightDesc7'),
  ];
  return lines.map(line => {
    if (!line.trim()) return '';
    let html = line
      .replace(/(\d+(?:\.\d+)?%?)/g, '<b style="color:#e07b00;font-weight:800">$1</b>')
      .replace(/提升/g, '<b style="color:#ea580c">提升</b>')
      .replace(/扩大/g, '<b style="color:#22d3ee">扩大</b>')
      .replace(/叠加/g, '<b style="color:#a78bfa">叠加</b>');
    return '<div style="display:flex;align-items:flex-start;gap:1vh;color:#cbd5e1;font-size:2.5vh;line-height:1.75;margin-bottom:0.8vh;text-align:left;font-weight:500">'
      + '<span style="color:#818cf8;font-size:1.5vh;line-height:2.4vh;flex-shrink:0;margin-top:0.8vh">●</span>'
      + '<span>' + html + '</span></div>';
  }).join('');
}
function onNightInfoOpen() {
  keys.up = keys.down = keys.left = keys.right = false;
  dungeonPaused = true;
}
function onNightInfoClosed() {
  dungeonPaused = false;
  storyPaused = false;
}
// 📦 道具弹窗（本次地牢拾取物品）：打开时冻结，关闭时解冻
watch(showInv, (v) => {
  if (v) {
    keys.up = keys.down = keys.left = keys.right = false;
    dungeonPaused = true;
  } else {
    dungeonPaused = false;
  }
});
function confirmLeave() {
  showSettle.value = false;
  // 🚪 记录本次从 spawn 传送点退出：下次进入地牢优先在此传送点复活（仅 spawn 点确认离开才记录）
  try {
    localStorage.setItem(DUNGEON_LAST_SPAWN_KEY, JSON.stringify({ level: currentLevel.value, col: pCol, row: pRow }));
  } catch (e) { /* ignore */ }
  emit('close');
}

async function dungeonLoadAsset(url) {
  // 🛡️ 防御：url 为空/undefined/'undefined' 字符串时直接跳过，避免 Assets.load 触发解析告警
  if (!url || String(url).trim() === '' || String(url).toLowerCase() === 'undefined') {
    console.warn('[dungeon] 图块集 url 无效，跳过加载:', url);
    return null;
  }
  // 🛠️ 健壮化图块集加载：Tiled 重新保存（如修改宽高）时可能把 image 路径写成
  //    "../../youxi/fvnyouxi/public/map/assets/xxx.png" 或产生 "/assets/assets/" 重复，
  //    这里逐级规范化并尝试多个候选路径，保证任何写法都能正确加载。
  const candidates = [String(url)];
  const cleaned = String(url)
    .replace(/^\/?(?:\.\.\/)+?(?:youxi\/fvnyouxi\/)?public\//i, '/')
    .replace(/^\/youxi\/fvnyouxi\/public\//i, '/')
    .replace(/\/assets\/assets\//g, '/assets/');
  if (cleaned !== String(url)) candidates.push(cleaned);
  // 若路径没有 /assets/ 前缀，补上（图块集图片一般放在 map/assets/ 子目录）
  const slash = cleaned.lastIndexOf('/');
  const base = cleaned.slice(0, slash + 1);
  const name = cleaned.slice(slash + 1);
  if (!/\/assets\/[^/]+$/.test(cleaned)) candidates.push(`${base}assets/${name}`);
  for (const c of candidates) {
    try {
      const tex = await Assets.load(c);
      if (tex) {
        // 🔥 记录实际加载成功的图块集 key（供换层/离开时按层释放纹理）
        if (!currentLayerTilesetKeys.includes(c)) currentLayerTilesetKeys.push(c);
        return tex;
      }
    } catch (e) { /* 尝试下一个候选 */ }
  }
  throw new Error(`[dungeon] 图块集加载失败: ${url}`);
}

async function init() {
  app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    background: '#141b12', // 🟩 暗绿背景，与地板融合（原纯黑导致瓦片缝隙呈黑色网格线）
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  pixiContainer.value.appendChild(app.canvas);
  initTransition(app); // 🎬 初始化过场过渡系统（进入地牢/战斗/死亡滤镜粒子）
  // 🗺️ 注入小地图绘制依赖（纯读 getter，行为与拆分前一致）
  initMiniMap({
    miniMapCanvas: () => miniMapCanvas.value,
    fullMapCanvas: () => fullMapCanvas.value,
    mapW: () => mapW, mapH: () => mapH,
    solidGrid: () => solidGrid,
    exploration: () => exploration,
    playerCol: () => playerCol.value,
    playerRow: () => playerRow.value,
    visibleRadius: () => visibleRadius,
    stairsPoint: () => stairsPoint,
    chests: () => chests,
    npcs: () => npcs,
    enemies: () => enemies,
    guidePath: () => guidePath, // 🧭 新手指引寻路路线（小地图绘制）
  });
  // 🌙 地牢天黑滤镜：挂 app.stage 覆盖整个地牢（瓦片+头像），与天气滤镜（mapContainer 上）叠加
  dungeonNightFilter = new AdjustmentFilter({ brightness: 1, contrast: 1, saturation: 1, red: 1, green: 1, blue: 1 });
  try { app.stage.filters = [dungeonNightFilter]; } catch (e) { /* ignore */ }

  // 🏰 读取当前层数（持久化）：后续进入地牢从该层复活点重生，而非第一层
  // 🌅 新的一天重新进入地牢：层数进度仅当天保留，跨天重置回第一层
  try {
    const savedLevel = Number(localStorage.getItem(DUNGEON_LEVEL_KEY));
    const savedDay = Number(localStorage.getItem(DUNGEON_LEVEL_DAY_KEY));
    const curDay = Number(user.pixi?.player?.day) || 1;
    const newDay = savedDay > 0 && savedDay !== curDay;
    if (newDay) {
      currentLevel.value = 1;
      try { localStorage.setItem(DUNGEON_LEVEL_KEY, '1'); } catch (e) { /* ignore */ }
      try { localStorage.setItem(DUNGEON_LEVEL_DAY_KEY, String(curDay)); } catch (e) { /* ignore */ }
    } else if (savedLevel >= 1) {
      currentLevel.value = savedLevel; // 同一天：续层（无限层任意层都恢复）
    }
  } catch (e) { /* ignore */ }

  // 🎥 固定缩放：格子固定像素大小（loadMapForLevel 内部使用）
  scale = GRID_SCALE;

  // 加载当前层地图（含 solidGrid / spawn / items / stairs / 迷雾存档还原）
  await loadMapForLevel(currentLevel.value);

  // 🎴 异步预渲染卡牌/道具 Spine 图片（不依赖 xinxi.vue，进入地牢即开始加载）
  initDungeonCardSpines();
  initDungeonDaojuSpines();

  // 迷雾层（loadMapForLevel 不创建 fog，在此创建）
  // 🌀 迷雾容器：黑雾 + 圆形柔边压暗 Sprite（普通混合，把可见区边缘的格子阶梯压成圆形柔边）
  fogContainer = new Container();
  fogGraphics = new Graphics();
  fogContainer.addChild(fogGraphics);
  syncFogRoundSpritesCount();   // 🌀 玩家视野 + 光点圆形柔边压暗 Sprite
  app.stage.addChild(fogContainer);
  // 🧭 新手指引路径层（迷雾之上，显示穿迷雾的寻路路线）
  guideGraphics = new Graphics();
  app.stage.addChild(guideGraphics);
  createVignette();             // 🌑 屏幕暗角（径向渐变，四周压暗聚焦中心）
  // 🌦️ 天气特效（雪/雨/雷/雾/氛围）提到迷雾之上，避免纯黑色迷雾遮蔽下雪、下雨、打雷
  bringWeatherAboveFog();

  // 🏳️ 每次进入地牢都在当前层重生点（spawn 对象）复活
  if (spawnPoint) {
    pCol = spawnPoint.col; pRow = spawnPoint.row;
    targetCol = spawnPoint.col; targetRow = spawnPoint.row;
  } else {
    let spawnFound = false;
    for (let r = 2; r < mapH - 2 && !spawnFound; r++) {
      for (let c = 2; c < mapW - 2 && !spawnFound; c++) {
        if (isWalkable(c, r)) {
          pCol = c; pRow = r; targetCol = c; targetRow = r; spawnFound = true;
        }
      }
    }
  }

  // 🧍 进入地牢即等待 dilaoQ 头像资源加载完成（loadMapBundle 内部有缓存，已加载立即返回），
  //    头像就绪前不创建玩家、不启动移动（ticker 在玩家创建后才启动）
  try { await loadMapBundle('map_01'); } catch (e) { /* 大包可能因个别资源失败，下面单资源兜底 */ }
  // 单资源显式兜底：大包加载失败时确保 dilaoQ 的 skel/atlas 一定就绪
  if (!Assets.get('dilaoQ_skel') || !Assets.get('dilaoQ_atlas')) {
    try {
      await Assets.load({ dilaoQ_skel: '/NPC/dilaoQ.skel', dilaoQ_atlas: '/NPC/dilaoQ.atlas' });
    } catch (e) { /* 加载失败继续，Spine 创建时兜底 */ }
  }

  // 💡 玩家提灯光：additive 径向渐变光（夜晚/雾天由 syncPlayerPos 动态增强）
  playerGlow = attachLight(app.stage, tileW * scale * 3, 0xffd98c);

  // 🧍 玩家用 dilaoQ spine 显示（不播放动画，按方向切换外观）
  playerSprite = new Spine({
    skeleton: 'dilaoQ_skel',
    atlas: 'dilaoQ_atlas',
    allowMissingRegions: true,
    autoUpdate: false, // 不挂全局共享 ticker，手动控制（不播放动画）
  });
  try {
    // head_front 是皮肤名（不是动画名，dilaoQ 动画只有 'animation'），必须用 setSkinByName 切换皮肤，
    //  ⚠️ 不能 setAnimation——会抛 "Animation not found" 异常被 catch 后 scale.set(1)，
    //     导致玩家 scale 暂时 = 1，敌人创建时复制玩家 scale 会全体巨大。
    try { playerSprite.skeleton.setSkin(null); } catch (e) { }
    try { playerSprite.skeleton.setSkinByName('head_front'); } catch (e) { }
    try { playerSprite.skeleton.setSlotsToSetupPose(); } catch (e) { }
    playerSprite.update(0.05);
    // 直接用 applyPlayerHead 计算 scale（内部 getLocalBounds，纹理就绪则立即得到正确 scale，
    //    供后续敌人创建时复用；纹理未就绪则由双 rAF 的 applyPlayerHead 修正）
    applyPlayerHead('head_front');
    playerSprite.update(0.05);
  } catch (e) { playerSprite.scale.set(1); }
  // 🌊 玩家水面倒影：与玩家同一 dilaoQ spine，垂直镜像 + 半透明，默认隐藏（站水面时由 ticker 显示）
  try {
    playerReflection = new Spine({
      skeleton: 'dilaoQ_skel',
      atlas: 'dilaoQ_atlas',
      allowMissingRegions: true,
      autoUpdate: false,
    });
    try { playerReflection.skeleton.setSkin(null); } catch (e) { }
    try { playerReflection.skeleton.setSkinByName('head_front'); } catch (e) { }
    try { playerReflection.skeleton.setSlotsToSetupPose(); } catch (e) { }
    playerReflection.update(0.05);
    const rs = playerSprite.scale.x || 1;
    playerReflection.scale.set(rs, -rs); // 垂直镜像
    playerReflection.alpha = 0.38;        // 半透明倒影
    playerReflection.visible = false;
    playerReflectionHead = 'head_front';
  } catch (e) { playerReflection = null; }
  if (playerReflection) app.stage.addChild(playerReflection); // 先加倒影，玩家随后 addChild 保持在其上层
  app.stage.addChild(playerSprite);
  playerHeadName = 'head_front';
  syncPlayerPos(); // 应用外观 + 底部中心偏移 + 定位
  // 🧍 等图片（atlas 纹理）加载完后再渲染一次位置：双 rAF 确保纹理就绪，
  //    重新 applyPlayerHead（setAnimation/setSkin + update + 定位），头像立即显示（不依赖移动触发）
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (playerSprite) applyPlayerHead('head_front');
  }));

  // 🧩 注入子模块运行时环境（pathfinding/fx/save：全部走 getter，实时读取主文件状态）
  initPathfinding({
    isWalkable,
    isGlassCell,
    isObstacleBlocking,
    isObstacleBlockingSight,
    getVisionReduce,
    getFogVisionReduce: () => (currentWeather === 'fog' ? (weatherFogReduce > 0 ? weatherFogReduce : 2) : 0),
    getPCol: () => pCol,
    getPRow: () => pRow,
  });
  initFx({
    getApp: () => app,
    getPlayerSprite: () => playerSprite,
    getTileW: () => tileW,
    getScale: () => scale,
    getMapOffsetX: () => mapOffsetX,
    getMapOffsetY: () => mapOffsetY,
    getPPixelX: () => pPixelX,
    getPPixelY: () => pPixelY,
    getPlayerHeadOff: () => playerHeadOff,
  });
  initSave({
    getExploration: () => exploration,
    getPickupItems: () => pickupItems,
    getTriggers: () => triggers,
    getObstacles: () => obstacles,
    getChests: () => chests,
    getPushTargets: () => pushTargets,
    getInteractables: () => interactables,
    getGatherPoints: () => gatherPoints,
    getEnemies: () => enemies,
    getPreSealedZones: () => preSealedZones,
    getMapW: () => mapW,
    getMapH: () => mapH,
    getPCol: () => pCol,
    getPRow: () => pRow,
    getCurrentLevel: () => currentLevel.value,
  });

  // 道具图已由 tiled 对象层瓦片渲染（不再用代码画标记）；还原存档：隐藏已拾取道具的瓦片
  syncPickedSprites();
  createAllEnemySprites(); // 👾 创建敌人 spine
  createNpcSprites(); // 🧑 创建 NPC spine（此时 map_01 bundle 已加载，jinmao/huli/tuzi 等资源就绪）

  pPixelX = (pCol + 0.5) * tileW * scale;
  pPixelY = (pRow + 0.5) * tileH * scale;
  syncPlayerPos();
  updateCamera(); // 🎥 初始镜头：以重生点玩家为中心
  playerCol.value = pCol;
  playerRow.value = pRow;

  updateVisibility();
  // 🎬 首次进入地牢过场过渡（延迟初始化完成、app/ticker 就绪后才播放）：
  //    首次进入时 matter.vue 同步 emit 的 dungeonResume 在 init() 完成前到达，playSceneTransition
  //    因 app/layer 未就绪而跳过，故在此 init 末尾主动补播一次开场过渡
  playSceneTransition('enterDungeon', { title: mapDisplayName.value });
  // 🎬 进入地牢后触发该层地图属性配置的进入对话（dialogLoadData + dialogRoute，冻结地牢，结束解冻）
  triggerMapEntryDialogue();

  // 🧭 首次进入地牢开启新手指引（仅一次，持久标记）
  if (!user.getDialogueFlag('dungeonGuideShown')) {
    user.setDialogueFlag('dungeonGuideShown', true);
    if (user.pixi?.gameMode === 'normal') {
      // ⚔️ 普通模式：无剧情引导，显示地牢玩法指引（不绑定莫奇路线，常驻显示不自动隐藏）
      guideTarget = null;
      guideStage = 0;
      guideHintKey.value = 'guideHintNormal';
      guideEnabled = true;
      guideHintShow.value = true;
    } else {
      // 🧭 剧情模式：A* 寻路路线指向莫奇
      const mq = npcs.find(n => n.spineKey === 'shangren1');
      guideTarget = mq ? { col: mq.col, row: mq.row } : null;
      guideStage = 1;
      guideHintKey.value = 'guideHint';
      guideEnabled = true;
      guideHintShow.value = true;
      refreshGuidePath();
    }
  }

  let lastTime = performance.now();
  app.ticker.add(() => {
    // 🛡️ 卸载保护：app.destroy 停掉 ticker 后，已排队的 requestAnimationFrame 仍可能残留执行一帧，
    //    此时 solidGrid/exploration/playerSprite 已被 onBeforeUnmount 置 null → 直接跳过，避免
    //    "Cannot read properties of null (reading '2')" 之类的报错
    if (!app || !solidGrid || !exploration || !playerSprite || !fogGraphics || !mapContainer) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    // 🌬️ 树冠摇曳：每帧更新 shader 时间（性能可忽略；⚡ 低性能模式不挂滤镜，此处直接跳过）
    if (treeSwayFilters.length && !isPerfLow()) {
      const _t = now / 1000;
      for (const _f of treeSwayFilters) updateTreeSway(_f, _t);
    }
    // 🌙 地牢天黑系统：进入地牢后固定 DUNGEON_NIGHT_AFTER_SEC 秒进入夜间（可调），
    //    提前 DUNGEON_NIGHT_FADE_SEC 秒开始渐暗，到点全黑后保持不再变亮
    //    ⏸️ 只在玩家活跃探索时计时：进入战斗/对话/任意弹窗/离开地牢等冻结时不累计，
    //    避免"离开地牢后仍继续天黑导致误触发夜晚成就"。
    const nightAnyDialog = showInv.value || showBag.value || showSettle.value
      || showWeatherInfo.value || showNightInfo.value || showInteractDialog.value;
    const nightActive = props.visible && !dungeonPaused && !storyPaused && !nightAnyDialog;
    // ⏱️ 地牢内累计秒数：剧情模式天黑依据；普通模式仅供暗影怪等时间机制使用（天黑由层数进度推进）
    if (nightActive && (user.pixi?.gameMode === 'normal' || dungeonElapsed < _nightAfterSec() + DUNGEON_NIGHT_FADE_SEC)) {
      dungeonElapsed += dt;
    }
    // 🌙 夜晚程度：剧情模式按时间渐变（到阈值全黑保持）；普通模式不随时间变化，
    //    进度由「每进入下一层 +15%」推进（changeLevel 里累加），满 100 即天黑
    if (user.pixi?.gameMode !== 'normal') {
      if (dungeonElapsed >= _nightAfterSec() + DUNGEON_NIGHT_FADE_SEC) {
        dungeonNightTime = 1;
      } else {
        dungeonNightTime = Math.min(1, Math.max(0, (dungeonElapsed - (_nightAfterSec() - DUNGEON_NIGHT_FADE_SEC)) / DUNGEON_NIGHT_FADE_SEC));
      }
    }
    updateDungeonNightFilter();
    setNightBoost(isDungeonNight() ? 1.4 : 1);
    setBloodMoonBoost(currentWeather === 'bloodmoon' ? 1.3 : 1);
    if (!isPerfLow()) updatePlayerReflection(dt); // 🌊 玩家水面倒影每帧更新（⚡ 低性能模式跳过）

    // 🌙 天黑后 NPC 隐藏（含商人，天黑"打烊"不可对话），白天 / 重新进入地牢恢复显示
    const npcNightHide = isDungeonNight();
    if (npcNightHide !== npcNightHideState) {
      npcNightHideState = npcNightHide;
      for (const npc of npcs) if (npc.sprite) npc.sprite.visible = !npcNightHide;
    }

    // 🕐 底部夜晚信息（秒级低频更新，避免每帧重渲染）
    // ⚔️ 普通模式：显示天黑进度百分比（每下一层 +15%，满 100 天黑）；剧情模式显示距离夜晚秒数
    if (user.pixi?.gameMode === 'normal') {
      const progress = Math.min(100, Math.floor(dungeonNightTime * 100));
      if (progress !== nightInfo.value.remainSec || (dungeonNightTime >= 1) !== nightInfo.value.night || !nightInfo.value.showProgress) {
        nightInfo.value = { night: dungeonNightTime >= 1, remainSec: progress, showProgress: true };
      }
    } else {
      const remainSec = Math.max(0, Math.ceil(_nightAfterSec() - dungeonElapsed));
      if (remainSec !== nightInfo.value.remainSec || (dungeonElapsed >= _nightAfterSec()) !== nightInfo.value.night || nightInfo.value.showProgress) {
        nightInfo.value = { night: dungeonElapsed >= _nightAfterSec(), remainSec, showProgress: false };
      }
    }
    // 🌑 暗影怪物：黑夜降临后再过 SHADOW_START_DELAY 秒开始，每 SHADOW_INTERVAL 秒刷一个，最多 SHADOW_MAX 个
    //    ⏸️ 战斗/弹窗/离开地牢时 nightActive=false → 不刷新不计时
    if (nightActive) {
      // ⚔️ 普通模式：天黑（进度满 100）后即开始刷新暗影怪；剧情模式：天黑后再过 SHADOW_START_DELAY 秒
      if (user.pixi?.gameMode === 'normal') {
        if (dungeonNightTime >= 1) shadowSpawnStarted = true;
      } else if (dungeonElapsed >= _nightAfterSec() + SHADOW_START_DELAY) {
        shadowSpawnStarted = true;
      }
      if (shadowSpawnStarted && shadowEnemies.length < SHADOW_MAX) {
        shadowSpawnTimer += dt;
        if (shadowSpawnTimer >= SHADOW_INTERVAL) {
          shadowSpawnTimer = 0;
          spawnShadowEnemy();
        }
      }
    }
    // 🐌 暗影减速倒计时（玩家被暗影怪触碰后的 40% 减速）
    if (shadowSlowTimer > 0) shadowSlowTimer = Math.max(0, shadowSlowTimer - dt);
    // 🌑 暗影怪冻结冷却 + 位置跟随镜头
    for (const sh of shadowEnemies) {
      if (sh.freezeTimer > 0) sh.freezeTimer = Math.max(0, sh.freezeTimer - dt);
      if (sh.sprite) {
        sh.sprite.x = mapOffsetX + sh.px;
        sh.sprite.y = mapOffsetY + sh.py;
        syncEnemyLvText(sh);
      }
    }
    // 📊 底部状态：玩家移动速度（格/秒）与可见度（格）低频刷新（0.25s 一次，避免每帧重渲染）
    dungeonInfoTimer += dt;
    if (dungeonInfoTimer >= 0.25) {
      dungeonInfoTimer = 0;
      // 可见度（与 updateVisibility 同公式，含晨曦被动 +1）
      const isFog = currentWeather === 'fog';
      const visBonus = user.getNpcAlly?.() === 'jinmao' ? 1 : 0;
      const visR = isFog ? 1 + visBonus : Math.max(1, visibleRadius - getVisionReduce(pCol, pRow) - weatherFogReduce + visBonus);
      // 速度（格/秒，与移动公式一致：去掉 tileW*scale 像素系数）
      const terrainMult = getTerrainSpeed(pCol, pRow);
      const sandMult = 1 - sandSlowLevel;
      const weatherMult = 1 - weatherPlayerSlow;
      const iceMult = isIceCell(pCol, pRow) ? ICE_SLIDE_SPEED_RATIO : 1;
      const speedPotionMult = user.pixi?.player?.dungeonSpeedBuff ? 1 + user.pixi.player.dungeonSpeedBuff : 1;
      const shadowSlowMult2 = shadowSlowTimer > 0 ? (1 - SHADOW_SLOW_RATIO) : 1; // 🌑 暗影减速 40%
      const speedCells = MOVE_SPEED * (isPushing ? PUSH_SPEED_RATIO : 1) * terrainMult * sandMult * weatherMult * iceMult * windSpeedMult * speedPotionMult * shadowSlowMult2;
      dungeonInfo.value = { speed: Math.round(speedCells * 10) / 10, vision: visR, tile: getTileTerrainName(pCol, pRow) };
    }
    // 🌙 到达夜晚：屏幕中间弹出「夜晚降落」提示（本趟只提示一次）
    //    🛡️ 仅在地牢可见且未冻结时触发（防止离开地牢/暂停中误判解锁"初入永夜"成就）
    if (!nightFallShown && isDungeonNight() && props.visible && !dungeonPaused && !storyPaused) {
      nightFallShown = true;
      nightFallTip.value = true;
      user.trackDungeonStat('night', 1); // 🏆 第一次经历夜晚（成就：初入永夜）
      if (currentWeather === 'bloodmoon') user.trackDungeonStat('bloodmoonNight', 1); // 🏆 血月+夜晚（成就：血色永夜；黑米晴空庇佑已封存，正常记录）
      setTimeout(() => { nightFallTip.value = false; }, 2600);
    }
    // 💬 NPC 对话触碰冷却倒计时
    if (npcTalkCooldown > 0) npcTalkCooldown = Math.max(0, npcTalkCooldown - dt);
    // ⚡ 感应区冷却倒计时
    for (const t of triggers) {
      if (t.cooldownTimer > 0) t.cooldownTimer = Math.max(0, t.cooldownTimer - dt);
    }
    // 🔥 岩浆等伤害地板：站上去每秒扣固定血量（战斗中/弹窗打开不扣，关闭后继续扣）
    if (damageTimer > 0) damageTimer = Math.max(0, damageTimer - dt);
    const floorDmg = getDamage(pCol, pRow);
    if (floorDmg > 0 && damageTimer <= 0 && props.visible && !dungeonPaused && !storyPaused && !showInv.value && !showBag.value && !showSettle.value && !showWeatherInfo.value && !showInteractDialog.value) {
      const juese = user.pixi?.player?.juese;
      if (juese) {
        // 🔥 岩浆烫伤：每秒扣 floorDmg% 最大生命值（tiled 瓦片 damage 属性=百分比，如 5→5%、25→25%）
        const maxHp = juese.maxHp || 100;
        const magmaDmg = Math.max(1, Math.round(maxHp * (floorDmg / 100)));
        juese.hp = Math.max(0, (juese.hp ?? 100) - magmaDmg);
        user.trackDungeonStat('magma', magmaDmg); // 🏆 累计岩浆伤害（成就：岩浆行者）
        damageTimer = 1.0; // 每秒扣一次
        playSfx('shoushang'); // 🎵 玩家在地牢受到伤害（岩浆烫伤）音效（不循环）
        // 🎬 烫伤特效：头像抖动 + 红色滤镜 + 头顶飘字（与冻伤/电击共用 triggerPlayerFx）
        triggerPlayerFx('burn');
        spawnFloatText(`-${magmaDmg}`, 0xff8844);
      }
    }
    // 🐟 云弥被动：携带进入地牢，站在水面持续恢复生命（每秒恢复 0.5，不超上限）
    if (user.getNpcAlly?.() === 'yu') {
      const onWater = isWaterCell(pCol, pRow);
      if (onWater) yumiHealTimer += dt; else yumiHealTimer = 0;
      const healReady = onWater && yumiHealTimer >= 1 && props.visible && !dungeonPaused && !storyPaused
        && !showInv.value && !showBag.value && !showSettle.value
        && !showWeatherInfo.value && !showInteractDialog.value;
      if (healReady) {
        const juese = user.pixi?.player?.juese;
        if (juese) {
          yumiHealTimer = 0;
          const maxHp = juese.maxHp || 100;
          const yumiHeal = Math.round(maxHp * 0.005 * 10) / 10; // 🐟 每秒恢复 0.5% 最大生命值
          user.healPlayer(yumiHeal); // 💚 统一回血入口（钳制最大生命）
          // 🐟 绿色恢复飘字（跟随玩家头顶，与岩浆烫伤同款机制、颜色不同）
          spawnFloatText(`+${yumiHeal}`, 0x22c55e);
        }
      }
    }
    // ❄️ 雪天冻伤：呆满90秒后，每10秒扣除1%最大生命值
    //    （战斗中/弹窗暂停不计时，返回地牢后继续；每次重新进入地牢重置计时）
    if (currentWeather === 'snow') {
      // ⏸️ 地牢冻结时暂停计时：隐藏 / 暂停 / 对话 / 任意弹窗打开均不计时
      const anyDialog = showInv.value || showBag.value || showSettle.value
        || showWeatherInfo.value || showNightInfo.value || showInteractDialog.value;
      const frozen = !props.visible || dungeonPaused || storyPaused || anyDialog;
      if (!frozen) snowStayTimer += dt;
      if (snowDmgTimer > 0) snowDmgTimer = Math.max(0, snowDmgTimer - dt);
      const juese = user.pixi?.player?.juese;
      if (juese && snowStayTimer >= SNOW_FROST_CFG.staySec && snowDmgTimer <= 0 && !frozen) {
        const maxHp = juese.maxHp || 100;
        const frostDmg = Math.max(1, Math.round(maxHp * FROST_DMG_PCT));
        juese.hp = Math.max(0, (juese.hp ?? maxHp) - frostDmg);
        snowDmgTimer = SNOW_FROST_CFG.dmgInterval; // 每 X 秒扣一次（与弹窗介绍共用配置）
        playSfx('shoushang'); // 🎵 玩家在地牢受到伤害（冻伤）音效（不循环）
        // 🎬 冻伤特效：头像抖动 + 淡蓝色滤镜 + 头顶红色负数飘字
        triggerPlayerFx('frost');
        spawnFloatText(`-${frostDmg}`, 0xff4444);
      }
    } else {
      snowStayTimer = 0; // 非雪天重置计时
      snowDmgTimer = 0;
    }
    // ❤️ 血量归0时自动离开地牢（返回主世界；回城休整恢复满血，存档保留，可读档继续游戏）
    //    🛡️ 仅在地牢可见时判定（离开地牢期间不触发，避免岩浆/冻伤离场后误判）
    if (curHp.value <= 0 && props.visible && !dungeonPaused) {
      user.trackDungeonStat('deaths', 1); // 🏆 被击败次数（成就：九死一生）
      user.settleMetaExp(); // 🏆 地牢死亡：把本局获得的经验结算给局外角色（防重复：战斗失败已结算则跳过）
      dungeonPaused = true; // 冻结地牢
      // 🏥 失败回城休整：恢复满血（不再删档），返回主世界后存档保留、可读档继续
      const _j = user.pixi?.player?.juese;
      if (_j && _j.maxHp) _j.hp = _j.maxHp;
      // 🧹 跳过本次隐藏地牢的 pause 存档回写（保留最近一次安全点地牢进度，避免把死亡状态覆盖进去）
      _skipDungeonPauseSave = true;
      // 🎬 死亡过场过渡（灰度 + 暗幕 + 黑幕下压至全黑，播完保持后触发）
      playSceneTransition('death', {
        onDone: () => {
          // 💀 过渡全黑保持后，延迟弹出战斗失败框（面板放大动画）
          showFailDialog.value = true; // 黑色遮罩立即补上，保证视觉连续（无缝隙露出地牢）
          setTimeout(() => { showFailPanel.value = true; }, 300); // 面板放大弹出
          // 失败框展示后关闭地牢返回主世界
          setTimeout(() => { emitter.emit('dungeonForceClose'); }, 300 + 1300);
        },
      });
    }
    // 🏜️ 沙地渐进减速：进入沙地缓慢减速（有上限），离开后保持一段时间再恢复
    const sandCfg = getSandConfig(pCol, pRow);
    if (sandCfg) {
      sandCurConfig = sandCfg;
      // 在沙地上：缓慢增加减速到上限
      sandSlowLevel = Math.min(sandCfg.slowMax, sandSlowLevel + sandCfg.slowRate * dt);
      sandHoldTimer = sandCfg.slowHold; // 重置保持计时器
    } else {
      // 离开沙地：先保持 slowHold 秒，再逐渐恢复
      if (sandHoldTimer > 0) {
        sandHoldTimer = Math.max(0, sandHoldTimer - dt);
      } else if (sandSlowLevel > 0) {
        const recoverRate = sandCurConfig?.slowRate || 0.3;
        sandSlowLevel = Math.max(0, sandSlowLevel - recoverRate * dt);
      }
    }
    // 🔓 检查封印解除条件（击败地图上所有敌人后解除）
    for (const z of sealZones) {
      if (!z.triggered || z.unlocked) continue;
      if (z.unlockType === 'killAllEnemies') {
        const hasAliveEnemy = enemies.some(e => !e.defeated);
        if (!hasAliveEnemy) unlockSeal(z);
      }
    }
    // 🔓 检查预封印解除条件（四种：killAll/killSpecific/switch/dialogue）
    for (const z of preSealedZones) {
      if (z.unlocked) continue;
      let shouldUnlock = false;
      if (z.unlockType === 'killAll') {
        shouldUnlock = !enemies.some(e => !e.defeated);
      } else if (z.unlockType === 'killSpecific') {
        const target = enemies.find(e => String(e.id) === z.unlockTarget);
        shouldUnlock = target ? target.defeated : false;
      } else if (z.unlockType === 'switch') {
        shouldUnlock = activatedSwitches.has(z.unlockTarget);
      } else if (z.unlockType === 'dialogue') {
        shouldUnlock = dialogueUnlockFlags.has(z.unlockTarget);
      }
      if (shouldUnlock) unlockPreSeal(z);
    }

    // ⏸️ 战斗期间暂停地牢：玩家和敌人都无法移动，只保持渲染（位置/镜头）
    // 🛡️ 地牢未显示（v-show 常驻但主世界游玩）或暂停时：保持渲染但完全不响应移动/拾取/交互，
    //    防止主世界移动键穿到隐藏的地牢触发拾取道具
    if (!props.visible || dungeonPaused) {
      syncPlayerPos();
      updateCamera();
      return;
    }

    if (!isMoving && !windInputLock && !isGathering.value) { // ⛏️ 采集中锁定移动
      let dc = 0, dr = 0;
      // 独立判断，支持同时按两个方向键斜向移动（后按的方向优先覆盖相反方向）
      if (keys.up) dr = -1;
      if (keys.down) dr = 1;
      if (keys.left) dc = -1;
      if (keys.right) dc = 1;
      if (dc !== 0 || dr !== 0) {
        // 🧱 斜向移动防穿墙角：对应的水平/垂直方向有障碍物则不可斜向移动
        let diagonalBlocked = false;
        if (dc !== 0 && dr !== 0) {
          const isBlocked = (c, r) => !isWalkable(c, r) || !!getObstacleAt(c, r);
          if (dr === -1 && isBlocked(pCol, pRow - 1)) diagonalBlocked = true; // 上方有障碍→不可左上/右上
          if (dr === 1 && isBlocked(pCol, pRow + 1)) diagonalBlocked = true;  // 下方有障碍→不可左下/右下
          if (dc === -1 && isBlocked(pCol - 1, pRow)) diagonalBlocked = true; // 左方有障碍→不可左上/左下
          if (dc === 1 && isBlocked(pCol + 1, pRow)) diagonalBlocked = true;  // 右方有障碍→不可右上/右下
        }
        if (diagonalBlocked) {
          // 斜向被墙角阻挡，不移动
        } else {
          const nc = pCol + dc, nr = pRow + dr;
          const ob = getObstacleAt(nc, nr);
          if (ob && ob.type === 'pushable') {
            // 📦 目标格有可推动木箱
            if (ob.locked) {
              // 🔒 已锁定的箱子不可推动
            } else if (dc !== 0 && dr !== 0) {
              // 斜向不推动（只支持正交方向推）
            } else {
              // 尝试推动：推动方向的下一格必须可行走且无障碍物（玻璃也阻挡推动）
              const pushCol = nc + dc, pushRow = nr + dr;
              if (isWalkable(pushCol, pushRow) && !getObstacleAt(pushCol, pushRow)) {
                ob.col = pushCol; ob.row = pushRow;
                ob.px = (pushCol + 0.5) * tileW * scale;
                ob.py = (pushRow + 0.5) * tileH * scale;
                renderObstacles(); // 重新渲染障碍物位置
                isPushing = true; // 📦 标记正在推动木箱（移速降低）
                targetCol = nc; targetRow = nr; isMoving = true;
              }
            }
            // 无法推动 → 阻挡移动
          } else if (isWalkable(nc, nr)) {
            targetCol = nc;
            targetRow = nr;
            isMoving = true;
          }
        }
        // 🧊 记录最后移动方向（供冰面滑行使用）
        iceSlideDir.dc = dc; iceSlideDir.dr = dr;
        iceSlideActive = false; // 有按键输入时由玩家主动控制，不滑行
        // 🧊 在冰面上按方向键 → 积蓄滑行能量（松键后用于惯性滑行）
        iceSlideEnergy = isIceCell(pCol, pRow) ? ICE_SLIDE_INIT_ENERGY : 0;
      } else if (isIceCell(pCol, pRow)) {
        // 🧊 冰面惯性滑行：未按方向键但站在冰面上 → 沿最后移动方向自动滑行
        //    滑行能量随格子衰减，滑出冰面或能量耗尽即停；碰撞障碍物也停
        if (iceSlideEnergy > 0 && (iceSlideDir.dc !== 0 || iceSlideDir.dr !== 0)) {
          const nc = pCol + iceSlideDir.dc, nr = pRow + iceSlideDir.dr;
          // 斜向滑行检查防穿墙角
          let slideBlocked = false;
          if (iceSlideDir.dc !== 0 && iceSlideDir.dr !== 0) {
            const isB = (c, r) => !isWalkable(c, r) || !!getObstacleAt(c, r);
            if (iceSlideDir.dr === -1 && isB(pCol, pRow - 1)) slideBlocked = true;
            if (iceSlideDir.dr === 1 && isB(pCol, pRow + 1)) slideBlocked = true;
            if (iceSlideDir.dc === -1 && isB(pCol - 1, pRow)) slideBlocked = true;
            if (iceSlideDir.dc === 1 && isB(pCol + 1, pRow)) slideBlocked = true;
          }
          if (!slideBlocked && isWalkable(nc, nr) && !getObstacleAt(nc, nr)) {
            targetCol = nc; targetRow = nr; isMoving = true;
            iceSlideActive = true; // 标记正在滑行（下一格到达时衰减能量）
          } else {
            iceSlideActive = false; iceSlideEnergy = 0; // 撞墙/出冰 → 停止滑行
          }
        } else {
          iceSlideActive = false;
        }
      } else {
        iceSlideActive = false; // 不在冰面上 → 停止滑行
      }
    }

    if (isMoving) {
      const targetX = (targetCol + 0.5) * tileW * scale;
      const targetY = (targetRow + 0.5) * tileH * scale;
      // 📦 推动木箱时移速降低；🌊 地形减速（水洼等）；🏜️ 沙地渐进减速；🌦️ 天气减速
      const terrainMult = getTerrainSpeed(pCol, pRow);
      const sandMult = 1 - sandSlowLevel; // 沙地减速比例（0~1，0=不减速）
      const weatherMult = 1 - weatherPlayerSlow; // 天气减速（雨天/暴风雨/雷雨天）
      // 🧊 冰面：滑行/在冰面上移动时速度更快（惯性感）
      const iceMult = isIceCell(pCol, pRow) ? ICE_SLIDE_SPEED_RATIO : 1;
      // 🏃 疾行药剂：本次地牢移动速度 +25%
      const speedPotionMult = user.pixi?.player?.dungeonSpeedBuff ? 1 + user.pixi.player.dungeonSpeedBuff : 1;
      // 🌑 暗影减速：被暗影怪触碰后 1.5 秒内移速 -40%
      const shadowSlowMult = shadowSlowTimer > 0 ? (1 - SHADOW_SLOW_RATIO) : 1;
      const speed = MOVE_SPEED * tileW * scale * (isPushing ? PUSH_SPEED_RATIO : 1) * terrainMult * sandMult * weatherMult * iceMult * windSpeedMult * speedPotionMult * shadowSlowMult;

      const dx = targetX - pPixelX;
      const dy = targetY - pPixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = speed * dt;
      if (dist <= step) {
        pPixelX = targetX;
        pPixelY = targetY;
        pCol = targetCol;
        pRow = targetRow;
        isMoving = false;
        if (!windBlastActive) {
          // 🎵 玩家移动脚步音效：按脚下格子地形播放对应音效（岩浆/冰面/泥地/沙地/雪地/石板/水），无对应则普通脚步
          const footSfx = TERRAIN_FOOTSTEP_SFX[getTileTerrainName(pCol, pRow)] || 'zoulu';
          playSfx(footSfx);
          spawnFootprints(pCol, pRow); // 👣 雪地/沙地/泥地留下渐隐足迹
        }
        hasMovedAfterEnter = true; // 🚪 移动过一次后开始检测互动按钮
        isPushing = false; // 📦 推动完成，恢复正常移速
        windInputLock = false; // 💨 吹风强制移动完成，解除输入锁定
        windSpeedMult = 1; // 💨 吹风移速倍率复位
        // 🧊 冰面滑行：每滑一格衰减能量（冰面摩擦），能量耗尽或离开冰面则停止
        if (iceSlideActive) {
          if (isIceCell(pCol, pRow)) {
            iceSlideEnergy -= ICE_SLIDE_DECAY;
            if (iceSlideEnergy <= 0) { iceSlideActive = false; iceSlideEnergy = 0; }
          } else {
            iceSlideActive = false; iceSlideEnergy = 0; // 滑出冰面立即停
          }
        }
        playerCol.value = pCol;
        playerRow.value = pRow;
        updateVisibility();
        if (guideEnabled) {
          refreshGuidePath(); // 🧭 玩家移动后刷新寻路指引
          // 🧭 阶段2：玩家到达安全点（spawn 复活点）→ 关闭指引
          if (guideStage === 2 && spawnPoint && pCol === spawnPoint.col && pRow === spawnPoint.row) {
            closeGuidePath();
          }
        }
        tryPickup(); // 🎁 到达格子后检查可拾取道具
        // 🎯 检查所有箱子是否推到了目标位置（触发宝箱）
        for (const ob of obstacles) {
          if (ob.type === 'pushable') checkPushTarget(ob);
        }
        // ⚡ 检查是否在感应区内（触发对话）
        tryTrigger();
        // 🖐️ 检测附近可互动目标（互动点 / NPC 聊天 / 宝箱打开，右下角显示按钮）
        checkNearbyInteractable();
        // 🚪 检查是否在封印感应区内（触发出口封印）
        trySealZone();
        // 🔘 检查是否触碰开关
        trySwitch();
        // ⚔️ 玩家到达格子：立即检测当前格是否有存活敌人，命中直接进入战斗
        //    （防止快速连续移动时依赖敌人 AI 帧序检测而漏检“穿过”敌人）
        for (const e of enemies) {
          if (e.defeated || e.inBattle) continue;
          if (e.col === pCol && e.row === pRow) { triggerBattle(e); break; }
        }
        // 🌑 暗影怪物：触碰不进入战斗，造成 15% 最大生命伤害 + 减速 40% 移速 1.5s，该暗影怪停留 2.5s
        for (const sh of shadowEnemies) {
          const inArea = pCol >= sh.col && pCol <= sh.col + 1 && pRow >= sh.row && pRow <= sh.row + 1;
          if (!inArea) { sh.playerInside = false; continue; }
          if (sh.freezeTimer > 0 || sh.playerInside) continue; // 停留冷却中 / 已站在上面不重复触发
          triggerShadowTouch(sh);
          break;
        }
      } else {
        pPixelX += (dx / dist) * step;
        pPixelY += (dy / dist) * step;
      }
      // 🧍 玩家位置跟随格子移动 + 按移动方向切换外观（斜向优先水平方向皮肤）
      syncPlayerPos();
      let desiredHead = playerHeadName;
      if (keys.right) desiredHead = 'head_right';
      else if (keys.left) desiredHead = 'head_left';
      else if (keys.down) desiredHead = 'head_front';
      else if (keys.up) desiredHead = 'head_back';
      if (desiredHead && desiredHead !== playerHeadName) applyPlayerHead(desiredHead);
    }
    // ⛏️ 采集进度推进（战斗/弹窗冻结时暂停，进度不满不结束）
    if (isGathering.value && gatherCurrent && !dungeonPaused) {
      gatherProgress.value = Math.min(1, gatherProgress.value + dt / gatherCurrent.duration);
      if (gatherProgress.value >= 1) finishGather();
    }
    // 👾 敌人 AI 更新（索敌 → A* 追击 → 追上触发战斗）
    updateEnemies(dt);
    // 🌑 暗影怪 AI 更新（红色扇形索敌 → A* 追击 → 追上造成伤害+减速）
    updateShadowEnemies(dt);
    // 🧑 NPC spine 动画更新 + 位置跟随镜头（每帧更新，否则镜头移动后 NPC 停在原地出屏幕）
    for (const npc of npcs) {
      if (npc.sprite) {
        // 🎯 命令移动（对话 moveNpcOnEnd 触发）：沿直线插值移动到目标格，到达后清除
        if (npc.moveTarget) {
          const gx = (npc.moveTarget.col + 0.5) * tileW * scale;
          const gy = (npc.moveTarget.row + 0.5) * tileH * scale;
          const dx = gx - npc.px, dy = gy - npc.py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const step = (npc.moveSpeed || npc.speed || NPC_FLEE_SPEED) * tileW * scale * dt;
          if (Math.abs(dx) > Math.abs(dy)) applyNpcHead(npc, dx > 0 ? 'head_right' : 'head_left');
          else if (Math.abs(dy) > 0.01) applyNpcHead(npc, dy > 0 ? 'head_front' : 'head_back');
          if (dist <= step) {
            npc.px = gx; npc.py = gy;
            npc.col = npc.moveTarget.col; npc.row = npc.moveTarget.row;
            npc.moveTarget = null; npc.moveSpeed = null;
          } else if (dist > 0) {
            npc.px += (dx / dist) * step;
            npc.py += (dy / dist) * step;
          }
        } else if (npc.flee) {
          // 🏃 逃跑型 NPC（tiled flee=true）：玩家靠近 fleeRange 格内 → 智能选向逃跑
          const fleeDist = Math.max(Math.abs(npc.col - pCol), Math.abs(npc.row - pRow));
          if (fleeDist <= (npc.fleeRange || NPC_FLEE_RANGE)) {
            // ⏱️ 与玩家重叠（同格）：原地停留 0.4 秒再重新逃跑（避免重叠瞬间卡死不动）
            if (fleeDist === 0 && !(npc.fleeStuck > 0)) npc.fleeStuck = 0.4;
            // 冷却中：停留不动，倒计时结束再选目标
            if (npc.fleeStuck > 0) {
              npc.fleeStuck -= dt;
              if (npc.fleeStuck > 0) npc.fleeTarget = null;
            }
            if (!npc.fleeTarget && !(npc.fleeStuck > 0)) {
              // 🧠 智能选向：遍历上下左右 4 个邻格，取离玩家最远且可行走的格
              //   （距离优先；轻微偏好当前目标方向，避免频繁转向抖动）
              let best = null, bestScore = -1;
              const dirs = [
                { col: npc.col + 1, row: npc.row },
                { col: npc.col - 1, row: npc.row },
                { col: npc.col, row: npc.row + 1 },
                { col: npc.col, row: npc.row - 1 },
              ];
              for (const d of dirs) {
                if (d.col < 1 || d.col >= mapW - 1 || d.row < 1 || d.row >= mapH - 1) continue;
                if (!isWalkable(d.col, d.row)) continue;
                const dist = Math.max(Math.abs(d.col - pCol), Math.abs(d.row - pRow));
                const keep = (npc.fleeTarget && npc.fleeTarget.col === d.col && npc.fleeTarget.row === d.row) ? 1 : 0;
                const score = dist * 10 + keep;
                if (score > bestScore) { bestScore = score; best = d; }
              }
              if (best) {
                npc.fleeTarget = best;
              } else {
                // 🚫 被包围无路可逃：原地停留 0.4 秒再试
                npc.fleeStuck = 0.4;
                npc.fleeTarget = null;
              }
            }
          } else if (fleeDist > (npc.fleeRange || NPC_FLEE_RANGE) + 1) {
            npc.fleeTarget = null; // 距离足够 → 停止逃跑
          }
          if (npc.fleeTarget) {
            // 🧭 逃跑移动方向 → 切换皮肤（head_front/left/right/back，与玩家一致）
            if (npc.fleeTarget.col > npc.col) applyNpcHead(npc, 'head_right');
            else if (npc.fleeTarget.col < npc.col) applyNpcHead(npc, 'head_left');
            else if (npc.fleeTarget.row > npc.row) applyNpcHead(npc, 'head_front');
            else if (npc.fleeTarget.row < npc.row) applyNpcHead(npc, 'head_back');
            const tx = (npc.fleeTarget.col + 0.5) * tileW * scale;
            const ty = (npc.fleeTarget.row + 0.5) * tileH * scale;
            const dx = tx - npc.px, dy = ty - npc.py;
            const d = Math.sqrt(dx * dx + dy * dy);
            const step = (npc.speed || NPC_FLEE_SPEED) * tileW * scale * dt;
            if (d <= step) {
              npc.px = tx; npc.py = ty;
              npc.col = npc.fleeTarget.col; npc.row = npc.fleeTarget.row;
              npc.fleeTarget = null;
            } else if (d > 0) {
              npc.px += (dx / d) * step;
              npc.py += (dy / d) * step;
            }
          }
        }
        npc.sprite.x = mapOffsetX + npc.px;
        npc.sprite.y = mapOffsetY + npc.py;
        if (typeof npc.sprite.update === 'function' && isEntityOnScreen(npc.px, npc.py, 250) && shouldUpdateSpine()) {
          try { npc.sprite.update(dt); } catch (e) { }
        }
      }
    }
    // 🎥 镜头跟随玩家（每帧，含静止时保持边界钳制）
    updateCamera();
    // 🧭 新手指引路径跟随镜头重绘（仅开启时；Graphics 开销小）
    if (guideEnabled && guidePath.length) renderGuidePath();
    // 🌅 环境光随昼夜渐变（⚡ 低性能模式：静态化，只有昼夜/天气变化瞬间才重绘）
    updateAmbientLighting();
    // 🌦️ 天气驱动：氛围层跟随镜头 + 雷雨天落雷逻辑 + 雨滴粒子 + 雪花粒子
    syncWeatherAtmospherePos();
    if (isPerfLow()) {
      // ⚡ 低性能模式：粒子/流动层/点光源/氛围全跳过（视觉静态化，省 CPU 大头）
      updateFootprints(dt); // 👣 足迹渐隐保留（交互反馈）
      updatePlayerFx(dt);
      return;
    }
    updateThunder(dt);
    updateRainDrops(dt);
    updatePuddles(dt); // 💧 雨洼效果（puddle=true 石板上的水滴/涟漪）
    updateWindBlast(dt); // 💨 暴风雨一阵风（从右吹过，强制玩家左移一格）
    updateSnowDrops(dt); // ❄️ 雪天雪花粒子
    updateFogSmoke(dt); // 🌫️ 雾天烟雾粒子
    updateFootprints(dt); // 👣 足迹渐隐（下雨冲刷加速）
    updateFlowLayers(dt); // 🌊 水面/岩浆流动动画 + 岩浆气泡
    updateMapLights(dt); // 💡 Tiled light 对象动态点光源（火焰摇曳）
    updateAtmosphereFx(dt); // 🏜️ 氛围特效（光束呼吸 + 尘埃漂浮）
    // 🎬 玩家头像受击特效（抖动/滤镜/头顶飘字）每帧最后更新，确保抖动在基准位置之上
    updatePlayerFx(dt);
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

function onResize() {
  if (!app || !mapContainer) return;
  app.renderer.resize(window.innerWidth, window.innerHeight);
  scale = GRID_SCALE; // 固定缩放程度不变
  mapContainer.scale.set(scale);
  pPixelX = (pCol + 0.5) * tileW * scale;
  pPixelY = (pRow + 0.5) * tileH * scale;
  // 🧍 spine 玩家：头像宽度固定一格（tileW*scale，高度等比自适应，窗口缩放时保持与格子一致）
  if (playerSprite) {
    try {
      const lb0 = playerSprite.getLocalBounds();
      const targetH = tileW * scale; // 玩家头像宽度固定一格
      if (isFinite(lb0.width) && lb0.width > 0) {
        const s = targetH / lb0.width;
        playerSprite.scale.set(s);
        playerSprite.update(0.05);
        const lb = playerSprite.getLocalBounds();
        playerHeadOff.x = (lb.x + lb.width / 2) * s;
        playerHeadOff.y = (lb.y + lb.height / 2) * s;
      }
    } catch (e) { /* 忽略 */ }
  }
  // 💡 光照为纹理 Sprite，无需随窗口重置
  updateCamera(); // 🎥 镜头重新钳制到新视口
  syncPlayerPos();
  redrawFog();
  // 🌑 窗口缩放后重建暗角（径向渐变尺寸跟随新视口）
  if (vignetteSprite) {
    try { app.stage.removeChild(vignetteSprite); vignetteSprite.destroy(); } catch (e) { /* ignore */ }
    vignetteSprite = null;
    createVignette();
  }
  // ❄️ 窗口缩放后重建雪天屏幕寒冷滤镜（保证覆盖新视口）
  if (snowScreenOverlay && currentWeather === 'snow') {
    try {
      app.stage.removeChild(snowScreenOverlay);
      snowScreenOverlay.destroy();
    } catch (e) { }
    snowScreenOverlay = null;
    const ov = new Graphics();
    const vw = window.innerWidth, vh = window.innerHeight;
    ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0xa8c8e8, alpha: 0.16 });
    ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0xffffff, alpha: 0.04 });
    snowScreenOverlay = ov;
    app.stage.addChild(snowScreenOverlay);
  }
  // 🌕 窗口缩放后重建血月屏幕血色滤镜
  if (bloodmoonOverlay && currentWeather === 'bloodmoon') {
    try {
      app.stage.removeChild(bloodmoonOverlay);
      bloodmoonOverlay.destroy();
    } catch (e) { }
    bloodmoonOverlay = null;
    const ov = new Graphics();
    const vw = window.innerWidth, vh = window.innerHeight;
    ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0x4a0000, alpha: 0.22 });
    ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0x000000, alpha: 0.12 });
    ov.rect(-vw * 2, -vh * 2, vw * 5, vh * 5).fill({ color: 0x660000, alpha: 0.08 });
    bloodmoonOverlay = ov;
    app.stage.addChild(bloodmoonOverlay);
  }
  setupMiniMap(); // 🗺️ 窗口缩放后重算小地图尺寸
}

// ========== 🗺️ 小地图（屏幕右侧，canvas 绘制） ==========
function setupMiniMap() {
  const c = miniMapCanvas.value;
  if (!c || !mapW || !mapH) return;
  miniMapW = mapW; miniMapH = mapH;
  const dpr = window.devicePixelRatio || 1;
  const disp = Math.min(window.innerHeight * 0.28, 230); // 🗺️ 方形局部视野小地图（与之前全图尺寸一致）
  c.style.width = Math.round(disp) + 'px';
  c.style.height = Math.round(disp) + 'px';
  c.width = Math.max(1, Math.round(disp * dpr));
  c.height = Math.max(1, Math.round(disp * dpr));
  if (!miniMapRAF) miniMapRAF = requestAnimationFrame(drawMiniMapLoop);
}

// 🗺️ 暴露给 onMounted / 延迟兜底：确保循环已启动（幂等）
function startMiniMapLoop() {
  if (!miniMapRAF && miniMapCanvas.value) {
    miniMapRAF = requestAnimationFrame(drawMiniMapLoop);
  }
}

// 🗺️ 绘制循环（低频节流 ~5fps）：可见才绘制，不可见跳过但保持循环，随时恢复
function drawMiniMapLoop(ts) {
  const c = miniMapCanvas.value;
  if (c && c.offsetParent && ts - miniMapLast > 120) {
    try { drawMiniMap(); } catch (e) { /* 单帧绘制失败不中断循环 */ }
    miniMapLast = ts;
  }
  miniMapRAF = requestAnimationFrame(drawMiniMapLoop); // 永不停止；组件卸载时 cancelAnimationFrame 关闭
}

// 🗺️ 绘制小地图：障碍物 / 已探索迷雾 / 楼梯 / 宝箱 / 敌人 / 玩家

function openFullMap() {
  // 🗺️ 黑米地牢被动「地图凝视」：仅携带黑米时可查看完整地图
  if (user.getNpcAlly?.() !== 'tuzi') {
    return;
  }
  showFullMap.value = true;
  dungeonPaused = true; // ⏸️ 弹窗期间冻结地牢（玩家/敌人/天黑/扣血全停）
  requestAnimationFrame(() => setupFullMap()); // 等 DOM 渲染后再设置尺寸绘制
}
function closeFullMap() {
  showFullMap.value = false;
  dungeonPaused = false; // 关闭后解冻
}
// ⏸️ 地牢隐藏时冻结移动 + 保存进度（v-show 不会触发 onBeforeUnmount，所以在这里保存）
function onDungeonPause() {
  dungeonPaused = true;
  stopBgMusic(); // 🎵 进入战斗/离开地牢：关闭背景音乐
  // 🗑️ 死亡清档后隐藏地牢：跳过本次存档回写，避免把已删除的旧地牢进度还原
  if (_skipDungeonPauseSave) {
    _skipDungeonPauseSave = false;
  } else {
    saveDungeonStateNow(); // 💾 返回/隐藏地牢时保存已拾取道具、迷雾、木箱等状态
  }
  // 💨 疾行药剂：仅当离开地牢（返回主界面）时清除；进入战斗隐藏地牢时保留
  if (!preBattlePos && user.pixi?.player) {
    user.pixi.player.dungeonSpeedBuff = false;
    user.pixi.player.dungeonVisionBuff = false; // 🧪 明目药剂：离开地牢同时清除
    user.pixi.player.dungeonSpeedDown = 0; // 🎃 减速诅咒：离开地牢清除
    user.pixi.player.dungeonBannedCards = []; // 🎭 咒缚：离开地牢清除封禁
  }
}
// ▶️ 地牢重新显示时解冻 + 重置敌人到出生点（被击败的保持消失）
function onDungeonResume() {
  dungeonPaused = false;
  storyPaused = false; // 恢复地牢时清除剧情暂停标志（防止对话等冻结残留导致无法移动）
  windInputLock = false; // 💨 清除吹风输入锁定（防止退出地牢时吹风未结束、重新进入后无法移动）
  showFailDialog.value = false; // 💀 复位战斗失败框（下次进入地牢不残留）
  showFailPanel.value = false;
  showStairsDialog.value = false; // 🪜 复位下一层确认弹窗（地牢关闭/重进时不残留）
  keys.up = keys.down = keys.left = keys.right = false; // 清空残留按键状态
  // ⚔️ 战斗结束后：恢复到进入战斗前的位置（而非spawn点）
  const isBattleReturn = !!preBattlePos; // ⚔️ 先记录是否战斗结束返回（用于下方敌人是否复活判断）
  // 🎲 普通重新进入地牢时重随机天气（战斗结束返回则保持原天气，不重新随机）
  //    若 Tiled 地图属性 fixedWeather 勾选为真 → 固定采用 weather 设置的天气，不重随机
  // 仅在地牢已完成初始化（mapW/mapH 就绪）后才重随机——首次进入时 init 尚未完成，天气由 init 设置
  if (!isBattleReturn && initialized && mapW > 0 && !tiledFixedWeather && user.getNpcAlly?.() !== 'tuzi') {
    const entrySceneId = user.getDialogueFlag?.('dungeonEntrySceneId') || '';
    // 🌲 森林使者：恶劣天气概率降低
    const _forestBadMult = user.hasTalent('forest_messenger') ? (1 - (user.getTalentEffect?.('forest_messenger', 'reducePct') ?? 20) / 100) : 1;
    const rolledWeather = rollDungeonWeather(entrySceneId, _forestBadMult);
    if (rolledWeather && rolledWeather !== currentWeather) {
      currentWeather = rolledWeather;
      if (currentWeather === 'bloodmoon') user.trackDungeonStat('bloodmoon', 1); // 🏆 遭遇血月（成就：血月见证者；黑米晴空庇佑已封存，正常记录）
      // 尊重 Tiled fogReduceRadius 覆盖；未配置则用天气默认
      const baseCfg = WEATHER_CFG[currentWeather] || WEATHER_CFG.sunny;
      weatherFogReduce = tiledFogReduceOverride >= 0 ? tiledFogReduceOverride : baseCfg.fogReduce;
      // 重新应用天气滤镜/氛围/粒子（雾烟、雨滴、雪花、打雷等按新天气切换）
      applyWeatherFilter();
      createWeatherAtmosphere();
      createRainDrops();
      createSnowDrops();
      createFogSmoke();
      resetWindBlast(); // 💨 天气切换为暴风雨时重置吹风倒计时
      weatherUi.value = currentWeather; // 同步天气 UI
    }
  }
  if (isBattleReturn) {
    isMoving = false;
    pCol = preBattlePos.col; pRow = preBattlePos.row;
    targetCol = preBattlePos.col; targetRow = preBattlePos.row;
    pPixelX = preBattlePos.px; pPixelY = preBattlePos.py;
    preBattlePos = null; // 用完即清，下次普通进入地牢走spawn点逻辑
  } else {
    // 🎲 普通重新进入地牢：重新随机可刷新道具图层（战斗结束返回不刷新，保持当前道具/已拾取状态）
    refreshRespawnItems();
    // 🎁 普通重新进入地牢：重置 respawn=true 的宝箱（战斗结束返回不刷新，保持当前状态）
    resetRespawnChests();
    // 🎒 清空本次会话拾取记录（第二次进入地牢重新统计；战斗返回不清空保持本次会话）
    sessionItems.value = [];
    // 🏳️ 普通重新进入地牢：从全部 spawn 点中随机选一个作为本次复活点并回到该点
    isMoving = false;
    hasMovedAfterEnter = false; // 🚪 重新进入地牢，移动一次后才检测互动按钮
    // ❄️ 每次重新进入地牢重置雪天冻伤计时（战斗结束返回不重置，继续计时）
    snowStayTimer = 0;
    snowDmgTimer = 0;
    spawnPoint = pickSpawnPoint(spawnPoints); // 🚪 普通重新进入地牢：优先上次使用 spawn 退出的传送点
    if (spawnPoint) {
      pCol = spawnPoint.col; pRow = spawnPoint.row;
      targetCol = spawnPoint.col; targetRow = spawnPoint.row;
    }
    pPixelX = (pCol + 0.5) * tileW * scale;
    pPixelY = (pRow + 0.5) * tileH * scale;
    // 🎬 进入地牢过场过渡（黑暗之门开启：暗幕渐隐 + 圣光收缩环 + 光尘粒子）
    playSceneTransition('enterDungeon', { title: mapDisplayName.value });
  }
  // 🖐️ 传送/复活完成后立即检测一次当前位置的互动目标：
  //    普通重新进入地牢时 hasMovedAfterEnter=false → 立即清空残留的互动按钮（如上次离开地牢前 NPC 对话按钮）
  //    战斗返回时 → 基于当前位置立即刷新（不残留）
  checkNearbyInteractable();
  updateCamera(); // 🎥 镜头跟随到新位置
  syncPlayerPos(); // 🖐️ 同步玩家头像与黄色光圈到新位置（防止 v-show 切换后错位）
  playerCol.value = pCol;
  playerRow.value = pRow;
  playBgMusic(currentWeather); // 🎵 返回地牢：按当前天气恢复循环背景音乐（战斗返回/重新进入均覆盖）
  if (exploration) updateVisibility(); // 🛡️ 空值保护
  // 👾 敌人处理：
  //   ⚔️ 战斗结束返回 → 恢复到进入战斗前的位置/状态（不刷新到出生点）
  //   🏳️ 普通重新进入地牢 → 复活本层被击败的敌人（除非 noRespawn）并重置到出生点
  const respawnEnemies = !isBattleReturn; // 战斗结束返回（isBattleReturn=true）不复活；重新进入地牢才复活
  if (isBattleReturn && preBattleEnemyStates) {
    // ⚔️ 战斗结束返回：按顺序恢复每个存活敌人进入战斗前的位置与状态
    let idx = 0;
    for (const e of enemies) {
      const st = preBattleEnemyStates[idx++];
      if (e.defeated) continue; // 被击败的保持消失
      if (!e.sprite) continue;
      if (st) {
        e.col = st.col; e.row = st.row;
        e.px = st.px; e.py = st.py;
        e.state = st.state || 'patrol';
        e.aggroed = !!st.aggroed;
        e.path = Array.isArray(st.path) ? st.path.slice() : [];
        e.loseTargetTimer = st.loseTargetTimer || 0;
        // ⚔️ 战斗返回：若敌人与玩家同格（如敌人追上玩家时触发战斗），
        //    把敌人挪到相邻最近的可走格，避免返回后立即再次触发
        if (e.col === pCol && e.row === pRow) {
          const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          for (const [dc, dr] of dirs) {
            const nc = e.col + dc, nr = e.row + dr;
            if (isWalkable(nc, nr) && !(nc === pCol && nr === pRow)) {
              e.col = nc; e.row = nr;
              e.px = (nc + 0.5) * tileW * scale;
              e.py = (nr + 0.5) * tileH * scale;
              break;
            }
          }
        }
        e.sprite.visible = true;
        e.sprite.x = mapOffsetX + e.px;
        e.sprite.y = mapOffsetY + e.py;
        syncEnemyLvText(e);
      }
      if (e.visionSprite) e.visionSprite.visible = true;
      if (e.alertSprite) e.alertSprite.visible = false;
    }
    preBattleEnemyStates = null; // 用完即清
  } else {
    // 🏳️ 普通重新进入地牢：重置敌人到出生点（复活本层被击败的敌人）
    for (const e of enemies) {
      // 💀 特殊敌人：Tiled 布尔值 noRespawn=true → 永不复活（重新进入地牢也不复活）
      if (respawnEnemies && !e.noRespawn) {
        e.defeated = false; // 复活敌人
      }
      if (e.defeated) continue;
      e.col = e.spawnCol;
      e.row = e.spawnRow;
      e.px = (e.col + 0.5) * tileW * scale;
      e.py = (e.row + 0.5) * tileH * scale;
      e.state = 'patrol';
      e.path = [];
      e.aggroed = false;
      e.loseTargetTimer = 0;
      if (e.sprite) {
        e.sprite.visible = true;
        e.sprite.x = mapOffsetX + e.px;
        e.sprite.y = mapOffsetY + e.py;
        syncEnemyLvText(e);
      }
      if (e.visionSprite) e.visionSprite.visible = true;
      if (e.alertSprite) e.alertSprite.visible = false;
    }
  }
  // 💬 战斗结束返回时：若该敌人配置了 dialogAfterBattle=true，触发击败后对话
  // ⚔️ 普通模式无剧情：跳过并清空击败后对话
  if (isBattleReturn) {
    if (user.pixi?.gameMode === 'normal') {
      pendingEnemyDialogue = null;
    } else if (pendingEnemyDialogue?.dialogLoadData) {
    const d = pendingEnemyDialogue;
    pendingEnemyDialogue = null; // 用完即清
    let targetName = d.dialogName;
    if (Array.isArray(d.dialogRoute) && d.dialogRoute.length > 0) {
      for (const step of d.dialogRoute) {
        if (!matchDialogueCondition(step)) continue; // 条件不满足则跳过
        targetName = step.name;
        break;
      }
    }
    if (targetName) {
      // 延迟触发，确保地牢恢复渲染完成
      setTimeout(() => {
        storyPaused = true;
        dungeonPaused = true;
        emitter.emit('talkToNpc', { loadData: d.dialogLoadData, name: targetName });
      }, 500);
    }
    }
  }
  // 👑 首领战胜利：弹三选一战利品（战斗结束组件重建后此处触发一次；延迟等场景恢复）
  if (user.pixi?.player?._pendingBossReward) {
    user.pixi.player._pendingBossReward = false;
    setTimeout(() => {
      // 🎭 若剧情对话仍在播放（dialogAfterBattle 500ms 触发），等对话结束后再弹，避免弹窗叠层
      const tryOpen = () => {
        if (storyPaused || showDungeonDialog.value) { setTimeout(tryOpen, 400); return; }
        openBossReward();
      };
      tryOpen();
    }, 900);
  }
}

// 💬 对话选项解锁预封印（对话系统 emit('dungeonUnlockByFlag', { flag: 'xxx' })）
function onDungeonUnlockByFlag(data) {
  const flag = data?.flag || data;
  if (flag) dialogueUnlockFlags.add(String(flag));
}

// ⚔️ 战斗结束：胜利才真正标记敌人 defeated（触发封印解锁）；失败/逃跑则敌人复活继续
function onBattleEnd(res) {
  if (currentBattleEnemy) {
    // 🗑️ 只要进入战斗（无论胜负），触发战斗的敌人同点一组全部清空（消失、不再复活）：
    //    避免战斗返回地牢后敌人仍在原处/继续追击导致连续重复进入战斗
    let killCount = 1; // 🏆 本场胜利击败的敌人数（含同点一组）
    const cur = currentBattleEnemy;
    cur.defeated = true;
    cur.inBattle = false;
    if (cur.sprite) cur.sprite.visible = false;
    destroyEnemyLvText(cur); // 🏷️ 击败后清除头顶等级文字
    // 🧹 同点其余敌人也一并清空（同一 e.enemies 触发的一组战斗）
    for (const en of enemies) {
      if (en === cur || en.defeated) continue;
      if (en.inBattle) { en.defeated = true; en.inBattle = false; if (en.sprite) en.sprite.visible = false; destroyEnemyLvText(en); killCount++; }
    }
    // 🏆 仅胜利计入击杀成就；失败/逃跑虽清空敌人但不计入（防刷成就）
    if (res?.isVictory) {
      user.trackDungeonStat('kills', killCount);
      // 👑 首领层胜利：标记待发三选一战利品（战斗结束组件重建后 onDungeonResume 触发）
      if (user.pixi?.player?._routeType === 'boss') {
        user.pixi.player._pendingBossReward = true;
        user.trackDungeonStat('bossKills', 1); // 🏆 首领击杀统计（dladmin 成就可配「击败首领次数」）
      }
    }
    // 🎁 击败掉落（胜利才掉落）：每个参战敌人独立结算
    //    - 配置了 dropItems 固定掉落（JSON：[{"item":"魔晶","count":2}]）→ 只发固定，跳过该敌人随机表
    //    - 未配置 → 概率掉落（Tiled dropRates 覆盖 > ENEMY_DROP_RATES 按 spine 查表）
    if (res?.isVictory) {
      const gains = [];
      const battleList = (Array.isArray(cur.enemies) && cur.enemies.length) ? cur.enemies : [{ spine: cur.spineKey }];
      // 🌙 夜晚击败敌人掉落概率 +100%；可与「眷顾」天赋 +25% 叠加（100%+25%=125%）
      let dropMult = 1;
      if (isDungeonNight()) dropMult += 1;
      if (user.hasTalent('blessing')) dropMult += (user.getTalentEffect?.('blessing', 'dropMult') ?? 0.25);
      // 🍀 幸运：统一幸运概率入口 luckProb 提升掉落概率（幸运不再叠加进 dropMult）
      const addGain = (itemId, num, itImg) => {
        const ex = sessionItems.value.find(x => x.name === itemId);
        if (ex) { ex.num += num; } else { sessionItems.value.push({ name: itemId, num, img: itImg }); }
        gains.push({ name: itemId, num, img: itImg });
      };
      // 每张随机掉落表：从上到下依次检测，抽中一个即停止（每张表最多掉 1 种物品）
      const rollTable = (table, mult = 1) => {
        for (const d of table) {
          if (Math.random() >= user.luckProb(Number(d.base || 0) * dropMult * mult)) continue; // 未命中 → 试下一条（mult=等级掉落加成）
          const itemId = String(d.item || '').trim();
          if (!itemId) continue; // 命中了但物品无效 → 不占掉落名额，继续下一条
          user.addItemToInventory({ name: itemId, num: 1 });
          addGain(itemId, 1, resolveItemIcon(itemId));
          break; // 🎯 抽中一个不再检测后面的
        }
      };
      for (const ec of battleList) {
        // 🎖️ 奖励随怪物等级提升：按最终等级（基础 + 层数 + 天数）计算倍率，每级 +10%
        const _ecBase = monsterConfigs[ec.spine] || monsterConfigs.monster1;
        const ecFinalLv = Math.max(1, num(ec.level, _ecBase.level ?? 1)
          + (currentLevel.value - 1) * DUNGEON_ENEMY_LEVEL_PER_FLOOR
          + ((Number(user.pixi?.player?.day) || 1) - 1) * DUNGEON_ENEMY_LEVEL_PER_DAY);
        const ecRewardMult = 1 + (ecFinalLv - 1) * ENEMY_REWARD_LEVEL_GROWTH;
        const ecDropItems = ec.dropItems ?? cur.dropItems; // 兼容数组级 / 敌人对象级配置
        if (Array.isArray(ecDropItems) && ecDropItems.length) {
          // ① 固定掉落：只发固定，跳过随机表（数量随等级提升，至少 1）
          for (const d of ecDropItems) {
            const itemId = String(d.item || d.name || '').trim();
            const num = Math.max(1, Math.round((Number(d.count ?? d.num) || 1) * ecRewardMult));
            if (!itemId) continue;
            user.addItemToInventory({ name: itemId, num });
            addGain(itemId, num, resolveItemIcon(itemId));
          }
          continue;
        }
        // ② 无固定掉落 → 走 ENEMY_DROP_RATES 随机表（命中概率随等级提升）
        rollTable(ENEMY_DROP_RATES[ec.spine] || [], ecRewardMult);
      }

    }
  }
  currentBattleEnemy = null;
}

// 🔄 开始新游戏时重置地牢内存态（qidong.vue 的 resetDungeonProgress 已清 localStorage，这里重置常驻组件内存）
//   覆盖：noRespawn 敌人复活、迷雾清空、层数回到第1层、玩家回重生点
function onDungeonHardReset() {
  try {
    if (currentLevel.value !== 1) currentLevel.value = 1;
    if (enemies) for (const e of enemies) e.defeated = false;
    if (exploration) exploration.fill(0);
    if (enemies) for (const e of enemies) { if (e.sprite) e.sprite.visible = true; }
    if (playerSprite) playerSprite.visible = true;
    // 🔓 重置预封印解锁状态（新游戏重新封印，重新读档后 applyPreSeals 重新封锁）
    if (preSealedZones) for (const z of preSealedZones) z.unlocked = false;
    // 层数存档已在 resetDungeonProgress 清除；这里同步内存
    localStorage.removeItem(DUNGEON_LEVEL_KEY);
    // 🧹 清空所有层存档：防止后续 onDungeonPause→saveDungeonState 把旧 defeatedNoRespawn 写回
    //    （否则开始新游戏后重新进入地牢，noRespawn 敌人仍会被存档恢复为死亡状态）
    for (let i = 1; i <= 10; i++) {
      try { localStorage.removeItem(saveKeyForLevel(i)); } catch (e) { }
    }
    try { localStorage.removeItem(DUNGEON_SAVE_KEY); } catch (e) { }
  } catch (e) { /* ignore */ }
}

// 🏪 商店关闭 → 解冻地牢（商人交易时冻结）
const onShopClosed = () => {
  // 🏪 关闭商店：若随即返回 sr10 对话（duihua 已 true → 对话冻结），则不解冻地牢；
  //   延迟到微任务执行，确保「返回对话」先打开（duihua=true）后再判断，避免解冻覆盖对话冻结
  queueMicrotask(() => {
    if (!user.pixi?.duihua) dungeonPaused = false;
  });
};
// 🏪 地牢内打开商店 → 冻结地牢（商人对话「买卖」触发；关闭时 dungeonShopClosed 解冻）
const onOpenShop = () => { if (props.visible) dungeonPaused = true; };

onMounted(() => {
  startMiniMapLoop(); // 🗺️ 组件挂载后确保小地图循环启动（幂等）
  window.addEventListener('resize', onResize);
  // 🏰 地牢显示/隐藏事件（由 matter.vue 的 watch(dungeonVisible) 触发）
  emitter.off('dungeonPause', onDungeonPause);
  emitter.on('dungeonPause', onDungeonPause);
  emitter.off('dungeonResume', onDungeonResume);
  emitter.on('dungeonResume', onDungeonResume);
  // 💬 对话选项解锁预封印（对话系统 emit('dungeonUnlockByFlag', { flag: 'xxx' })）
  emitter.off('dungeonUnlockByFlag', onDungeonUnlockByFlag);
  emitter.on('dungeonUnlockByFlag', onDungeonUnlockByFlag);
  // 🔄 开始新游戏重置地牢内存态（noRespawn 复活 / 迷雾 / 层数）
  emitter.off('dungeonHardReset', onDungeonHardReset);
  emitter.on('dungeonHardReset', onDungeonHardReset);
  // ⚔️ 战斗结束：胜利才真正标记敌人 defeated（触发封印解锁）；失败/逃跑则敌人复活继续
  emitter.off('battleEnd', onBattleEnd);
  emitter.on('battleEnd', onBattleEnd);
  // 🏪 商店关闭 → 解冻地牢（商人交易时冻结）
  emitter.off('dungeonShopClosed', onShopClosed);
  emitter.on('dungeonShopClosed', onShopClosed);
  // 🏪 地牢内打开商店 → 冻结地牢（商人对话「买卖」）
  emitter.off('openShop', onOpenShop);
  emitter.on('openShop', onOpenShop);
  // 🚶 里亚对话完成 → 隐藏里亚 NPC（dungeonLiyaGone）
  emitter.off('dungeonLiyaGone', removeLiyaNpc);
  emitter.on('dungeonLiyaGone', removeLiyaNpc);
  // 🎯 对话节点配置 moveNpcOnEnd → 指定 npc 移动到指定格
  emitter.off('dialogueMoveNpc', onDialogueMoveNpc);
  emitter.on('dialogueMoveNpc', onDialogueMoveNpc);
  // 🆕 对话节点配置 spawnNpcsOnEnd → 生成指定 npc 到指定格
  emitter.off('dialogueSpawnNpc', onDialogueSpawnNpc);
  emitter.on('dialogueSpawnNpc', onDialogueSpawnNpc);
  // 🆕 对话节点配置 spawnEnemiesOnEnd → 生成指定敌人到指定格
  emitter.off('dialogueSpawnEnemy', onDialogueSpawnEnemy);
  emitter.on('dialogueSpawnEnemy', onDialogueSpawnEnemy);
  // 💍 获得物品弹窗（幸运戒指等来自对话模块）
  emitter.off('dungeonItemGain', onDungeonItemGain);
  emitter.on('dungeonItemGain', onDungeonItemGain);
  // ⏳ 延迟初始化：第一次显示地牢时才加载 Pixi/地图，避免页面加载时瞬间冻结
  watch(() => props.visible, (v) => {
    if (v && !initialized) {
      initialized = true;
      init();
    }
  }, { immediate: true });
  // 🌙 重新进入地牢刷新为白天（仅从地牢外进入；战斗返回不刷新，保持天黑）
  watch(() => props.visible, (v) => {
    if (v && initialized && user.getDialogueFlag?.('dungeonEnterOutside')) {
      dungeonElapsed = 0;
      dungeonNightTime = 0;
      updateDungeonNightFilter();
      setNightBoost(1);
      nightInfo.value = { night: false, remainSec: _nightAfterSec(), showProgress: false };
      nightFallShown = false;
      nightFallTip.value = false;
      user.setDialogueFlag('dungeonEnterOutside', false);
      // 🌑 重新进入地牢刷新为白天：清空暗影怪、重置刷新计时
      clearShadowEnemies();
      shadowSpawnStarted = false;
      shadowSpawnTimer = 0;
      shadowSpawnCount = 0;
      shadowSlowTimer = 0;
    }
  });
  // 💬 对话时冻结地牢，对话结束后解除（监听 user.pixi.duihua 状态）
  watch(() => user.pixi?.duihua, (v) => {
    if (v) {
      keys.up = keys.down = keys.left = keys.right = false;
      dungeonPaused = true;
    } else {
      // 对话结束：总是解除冻结（普通 NPC 对话 / 剧情对话都走这里）
      storyPaused = false;
      dungeonPaused = false;
      // ⚔️ 若是战斗前对话（dialogBeforeBattle=true），对话结束后进入战斗
      tryEnterBattleAfterDialogue();
    }
  });
  // 🧭 首遇莫奇对话结束（xmEnd）→ 指引切换为「前往安全点」（spawn 复活点）
  emitter.off('dialogueGuideToSpawn');
  emitter.on('dialogueGuideToSpawn', switchGuideToSpawn);
  // 💬 对话完全结束事件（兜底：某些对话结束时 duihua 状态可能不变）
  emitter.off('dialogueEnded');
  emitter.on('dialogueEnded', () => {
    storyPaused = false;
    dungeonPaused = false;
    // 🧭 阶段1（找莫奇）对话完成 → 关闭阶段1指引；
    //    阶段2（去安全点）由 dialogueGuideToSpawn 事件接管，不受对话结束影响
    if (guideEnabled && guideDialogueActive && guideStage === 1) closeGuidePath();
    guideDialogueActive = false;
    // ⚔️ 若是战斗前对话（dialogBeforeBattle=true），对话结束后进入战斗
    tryEnterBattleAfterDialogue();
  });
});

onBeforeUnmount(() => {
  // 💾 保存地牢探索进度（迷雾 + 玩家位置 + 已拾取道具），下次进入时还原
  saveDungeonStateNow();
  if (miniMapRAF) { cancelAnimationFrame(miniMapRAF); miniMapRAF = 0; } // 🗺️ 停止小地图绘制
  stopBgMusic(); // 🎵 组件卸载/离开地牢：关闭背景音乐
  emitter.off('dungeonPause', onDungeonPause);
  emitter.off('dungeonResume', onDungeonResume);
  emitter.off('dialogueGuideToSpawn', switchGuideToSpawn);
  emitter.off('dungeonUnlockByFlag', onDungeonUnlockByFlag);
  emitter.off('dungeonHardReset', onDungeonHardReset);
  emitter.off('battleEnd', onBattleEnd);
  emitter.off('dungeonShopClosed', onShopClosed);
  emitter.off('openShop', onOpenShop);
  emitter.off('dungeonLiyaGone', removeLiyaNpc);
  emitter.off('dungeonItemGain', onDungeonItemGain);
  if (dungeonLoadTimer) { clearInterval(dungeonLoadTimer); dungeonLoadTimer = null; } // ⏳ 清理加载进度定时器
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('resize', onResize);
  if (app) {
    // 🛡️ 先手动停 ticker，确保 destroy 前不再有新的帧调度（配合 ticker 回调内的空值保护双保险）
    try { app.ticker.stop(); } catch (e) { /* ignore */ }
    // 用温和方式销毁（rendererDestroyOptions=false）：不销毁 renderer 追踪的全局 GPU 纹理，
    // 避免波及主游戏（昼夜滤镜等共享滤镜纹理被回收导致 FilterSystem BindGroup 失效报错）。
    app.destroy(false, { children: true });
    app = null;
  }
  mapContainer = null;
  clearAtmosphereFx(); // 🏜️ 氛围特效随地牢退出清理
  fogGraphics = null;
  fogContainer = null;
  fogRoundSprites = [];
  guideGraphics = null; // 🧭 新手指引路径层随 app 销毁（app.destroy 已回收子节点）
  guideEnabled = false;
  guidePath = [];
  guideTarget = null;
  guideStage = 1;
  vignetteSprite = null;
  playerSprite = null;
  playerReflection = null; // 🌊 倒影随 app.destroy 已销毁，仅置 null
  playerReflectionHead = null;
  playerGlow = null;
  playerHeadName = null;
  playerHeadOff = { x: 0, y: 0 };
  // 🌦️ 天气资源清理
  if (weatherFilter) { try { weatherFilter.destroy(); } catch (e) { } weatherFilter = null; }
  // 🌙 天黑滤镜清理（挂在 app.stage）
  try { if (app) app.stage.filters = null; } catch (e) { /* ignore */ }
  if (dungeonNightFilter) { try { dungeonNightFilter.destroy(); } catch (e) { } dungeonNightFilter = null; }
  // 🔥 离开地牢：释放本层图块集纹理缓存（防 WebGL OOM；下次进入重新加载）
  for (const k of loadedTilesetKeys) {
    try { Assets.unload(k); } catch (e) { /* ignore */ }
  }
  loadedTilesetKeys = [];
  currentLayerTilesetKeys = [];
  // 🌙 清理夜晚氛围层（渐变 + 萤火虫）
  if (nightAtmoTickerFn && app?.ticker) { try { app.ticker.remove(nightAtmoTickerFn); } catch (e) { } nightAtmoTickerFn = null; }
  if (nightAtmoLayer) {
    try { app?.stage?.removeChild(nightAtmoLayer); } catch (e) { /* ignore */ }
    try { nightAtmoLayer.destroy({ children: true }); } catch (e) { /* ignore */ }
  }
  nightAtmoLayer = null; nightAtmoGradient = null;
  for (const d of fireflyDots) { try { mapContainer?.removeChild(d); d.destroy(); } catch (e) { /* ignore */ } }
  fireflyDots = [];
  if (weatherAtmoLayer) { try { weatherAtmoLayer.destroy(); } catch (e) { } weatherAtmoLayer = null; }
  weatherAtmoGraphics = null;
  snowScreenOverlay = null; // ❄️ 雪天屏幕滤镜（stage 子节点已随 app.destroy 销毁）
  bloodmoonOverlay = null;  // 🌕 血月屏幕滤镜（stage 子节点已随 app.destroy 销毁）
  if (thunderWarnLayer) { try { thunderWarnLayer.destroy(); } catch (e) { } thunderWarnLayer = null; }
  if (thunderBoltLayer) { try { thunderBoltLayer.destroy(); } catch (e) { } thunderBoltLayer = null; }
  thunderBoltData = null;
  thunderDmgWindow = 0;
  thunderDmgDone = false;
  if (thunderConductLayer) { try { thunderConductLayer.destroy(); } catch (e) { } thunderConductLayer = null; }
  thunderConductCells = [];
  thunderConductDistMap = [];
  thunderConductTimer = 0;
  destroyAmbientLayer(); // 🌅 清理环境光
  destroyRainDrops();
  destroySnowDrops(); // ❄️ 清理雪天雪花粒子
  destroyFogSmoke(); // 🌫️ 清理雾天烟雾
  if (windFxLayer) { try { windFxLayer.destroy(); } catch (e) { } windFxLayer = null; } // 💨 清理暴风雨吹风特效
  windBlastActive = false;
  windBlastTimer = 0;
  windFxSeed = [];
  if (puddleLayer) { try { puddleLayer.destroy(); } catch (e) { } puddleLayer = null; } // 💧 清理雨洼层
  if (puddleStaticSprite) { try { puddleStaticSprite.destroy(); } catch (e) { } puddleStaticSprite = null; } // 💧 清理雨洼静态水渍
  puddleDropData = [];

  clearPlayerFx(); // 🎬 清理玩家头像受击特效（滤镜/抖动/飘字）
  destroyTransition(); // 🎬 清理过场过渡系统（滤镜/粒子/震屏）
  thunderTarget = null;
  currentWeather = 'sunny';
  weatherFogReduce = 0;
  weatherPlayerSlow = 0;
  weatherEnemySpeedUp = 0;
  solidGrid = null;
  exploration = null;
  pickupItems = [];
  respawnItemLayers = []; // 🎲 可刷新道具图层
  activeRespawnLayer = null; // 🎲 当前选中的可刷新道具层
  for (const sp of respawnItemSprites) { try { sp.destroy(); } catch (e) { /* ignore */ } }
  respawnItemSprites = [];
  respawnItemContainer = null; // 随 mapContainer 销毁
  clearFootprints(); // 👣 足迹
  flowWaterSprites = []; flowMagmaSprites = []; magmaBubbles = []; flowLayer = null; // 🌊 流动层
  clearMapLights(); // 💡 动态点光源
  for (const cl of coverLayers) { try { app.stage.removeChild(cl); } catch (e) { /* ignore */ } try { cl.destroy({ children: true }); } catch (e) { /* ignore */ } }
  coverLayers = []; // 🌳 遮挡层卸载清理
  enemies = [];
  npcs = [];
  clearShadowEnemies(); // 🌑 清理暗影怪物
  shadowSpawnStarted = false;
  shadowSpawnTimer = 0;
  shadowSpawnCount = 0;
  shadowSlowTimer = 0;
  lightPoints = [];
  stairsPoint = null;
  spawnPoint = null;
  spawnPoints = []; // 🚪 全部 spawn 出生点列表
  gatherPoints = []; // ⛏️ 清理采集点
  isGathering.value = false;
  gatherProgress.value = 0;
  gatherCurrent = null;
  gatherSpriteLayer = null; // 🎨 清理采集点 Sprite 层（随 mapContainer 销毁）
  obstacles = [];
  obstacleGraphics = null;
  obstacleSpriteLayer = null; // 🖼️ 清理木箱 Sprite 层
  sealZones = [];
  sealedCells = new Set();
  sealLayers = {};
  preSealedZones = [];
  switches = [];
  activatedSwitches = new Set();
  dialogueUnlockFlags = new Set();
  glassGrid = null;
  terrainGrid = null;
  visionGrid = null;
  damageGrid = null;
  damageTimer = 0;
  sandGrid = null;
  sandSlowLevel = 0;
  sandHoldTimer = 0;
  sandCurConfig = null;
  pushTargets = [];
  chests = [];
  chestGraphics = null;
  chestSpriteLayer = null; // 🖼️ 清理宝箱 Sprite 层
  triggers = [];
});
</script>

<style scoped>
/* ⏳ 进入地牢加载：进度条流动光泽 + 标题呼吸光 */
@keyframes dungeonShineMove {
  from { transform: translateX(-120%); }
  to { transform: translateX(420%); }
}
.dungeon-shine::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.5) 50%, transparent 58%);
  animation: dungeonShineMove 1.5s linear infinite;
}
@keyframes dungeonBreath {
  0%, 100% { opacity: 0.82; }
  50% { opacity: 1; }
}
.dungeon-breath {
  animation: dungeonBreath 2.4s ease-in-out infinite;
}

/* 🌙 夜晚降落提示渐显渐隐 */
.nightfall-fade-enter-active {
  transition: opacity .6s ease;
}

.nightfall-fade-leave-active {
  transition: opacity 1s ease;
}

.nightfall-fade-enter-from,
.nightfall-fade-leave-to {
  opacity: 0;
}

/* 🖐️ 互动弹窗（浅色背景 + 黑色文字） */
.dungeon-interact-dialog :deep(.el-dialog) {
  background: #fffaf0;
  border-radius: 2vh;
  border: 2px solid #d4a94f;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  margin-top: 7vh;
}

.dungeon-interact-dialog :deep(.el-dialog__title) {
  color: #5b3a1a;
  font-size: 3vh;
  font-weight: bold;
}

.dungeon-interact-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #e8d5a8;
  padding-bottom: 1.5vh;
}

.dungeon-interact-dialog :deep(.el-dialog__body) {
  padding: 3vh 3vh 1vh;
}

.dungeon-interact-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #8a6a35;
  font-size: 2.6vh;
}

.dungeon-interact-dialog :deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #d4a94f;
}

/* 结算列表滚动条 */
.jx-scroll::-webkit-scrollbar {
  width: 6px;
}

.jx-scroll::-webkit-scrollbar-thumb {
  background: rgba(250, 204, 21, 0.4);
  border-radius: 3px;
}

.jx-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

/* 💀 战斗失败框面板：从小放大 + 轻微回弹的入场动画 */
.fail-panel-enter-active {
  transition: opacity 0.45s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fail-panel-enter-from {
  opacity: 0;
  transform: scale(0.4);
}

.fail-panel-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fail-panel-leave-to {
  opacity: 0;
  transform: scale(1.15);
}

.fail-panel-box {
  animation: fail-panel-glow 1.6s ease-in-out infinite;
}

@keyframes fail-panel-glow {

  0%,
  100% {
    box-shadow: 0 0 7vh rgba(255, 0, 0, 0.3);
  }

  50% {
    box-shadow: 0 0 12vh rgba(255, 0, 0, 0.55);
  }
}

/* 🕹️ 移动端虚拟摇杆（左下角） */
.joy-base {
  position: absolute;
  left: 7vw;
  bottom: 15vh;
  width: 18vh;
  height: 18vh;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.04));
  border: 2px solid rgba(255, 255, 255, 0.3);
  z-index: 20;
  touch-action: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.5) inset;
}

.joy-knob {
  width: 8vh;
  height: 8vh;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.12));
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  transition: transform 0.05s linear;
}

.joy-hint {
  position: absolute;
  bottom: -4.5vh;
  font-size: 1.6vh;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.3vw;
  user-select: none;
  pointer-events: none;
}

/* 🏁 el-dialog 结算弹窗样式覆盖（深色渐变 + 金色描边） */
.dungeon-settle :deep(.el-dialog) {
  background: linear-gradient(180deg, #232b3b 0%, #121722 100%);
  border: 1px solid rgba(250, 204, 21, 0.45);
  border-radius: 24px;
  padding: 20px 26px 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
  overflow: hidden;
}

.dungeon-settle :deep(.el-dialog__header) {
  margin: 0;
  padding: 6px 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dungeon-settle :deep(.el-dialog__body) {
  padding: 14px 2px 0;
}

.dungeon-settle :deep(.el-dialog__footer) {
  padding: 16px 0 2px;
}

/* 🎒 el-dialog 道具弹窗样式覆盖（与结算弹窗同风格） */
.dungeon-inv :deep(.el-dialog) {
  background: linear-gradient(180deg, #232b3b 0%, #121722 100%);
  border: 1px solid rgba(250, 204, 21, 0.45);
  border-radius: 24px;
  padding: 20px 26px 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
  overflow: hidden;
}

.dungeon-inv :deep(.el-dialog__header) {
  margin: 0;
  padding: 6px 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dungeon-inv :deep(.el-dialog__body) {
  padding: 14px 2px 0;
}

.dungeon-inv :deep(.el-dialog__footer) {
  padding: 16px 0 2px;
}

/* 🪜 el-dialog 进入下一层确认弹窗样式覆盖（深色渐变 + 琥珀描边） */
.dungeon-stairs-dialog :deep(.el-dialog) {
  background: linear-gradient(180deg, #26304a 0%, #131a29 100%);
  border: 1px solid rgba(251, 191, 36, 0.5);
  border-radius: 24px;
  padding: 20px 26px 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
  overflow: hidden;
}

.dungeon-stairs-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 6px 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dungeon-stairs-dialog :deep(.el-dialog__body) {
  padding: 14px 2px 0;
}

.dungeon-stairs-dialog :deep(.el-dialog__footer) {
  padding: 16px 0 2px;
}
</style>

<!-- 拾取提示 ElMessage 挂载到 body，需全局样式（非 scoped） -->
<style>
.dungeon-pickup-inner {
  display: flex;
  align-items: center;
}

/* 🎒 单个拾取提示：深色底（淡色道具文字在白底看不清 → 深底 + 白色柔和投影） */
.dungeon-pickup-single {
  background: rgba(24, 26, 34, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45) !important;
}

/* 🗺️ 路线选择弹窗（杀戮尖塔2风格节点图，append-to-body → 全局样式） */
.dungeon-route-dialog.el-dialog { background: rgba(15, 18, 32, 0.96); border: 1px solid rgba(148, 163, 184, 0.22); box-shadow: 0 0 4vh rgba(0, 0, 0, 0.6); height: 95vh; max-height: 95vh; margin: auto; display: flex; flex-direction: column; }
.dungeon-route-dialog .el-dialog__header { display: none; }  /* 隐藏 el-dialog 默认空 header，不占位 */
.dungeon-route-dialog .el-dialog__body,
.dungeon-route-dialog .el-dialog__footer { background: transparent; }
.dungeon-route-dialog .el-dialog__body { padding-bottom: 4px; flex: 1 1 auto; min-height: 0; overflow: hidden; position: relative; }
.route-map {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8vh;
  padding: 2vh 1vw 1vh;
  background: rgba(10, 12, 22, 0.72);
  border-radius: 1.4vh;
  border: 1px solid rgba(148, 163, 184, 0.18);
}
.route-row { display: flex; justify-content: center; gap: 2.5vw; align-items: flex-start; }
.route-col { display: flex; flex-direction: column; align-items: center; gap: 0.8vh; }
.route-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 11vw;
  padding: 1vh 0.8vw;
  border-radius: 1.2vh;
  background: rgba(30, 30, 50, 0.92);
  border: 1.5px solid rgba(148, 163, 184, 0.35);
  color: #e2e8f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
.route-icon { font-size: 4vh; line-height: 1; }
.route-label { font-size: 1.9vh; font-weight: 600; margin-top: 0.5vh; text-align: center; }
.route-lv { font-size: 1.5vh; color: #94a3b8; margin-top: 0.2vh; }
.route-lock { font-size: 1.4vh; color: #f59e0b; margin-top: 0.4vh; }
.route-node-select { cursor: pointer; transition: all 0.18s; }
.route-node-select:hover { transform: translateY(-0.4vh); border-color: rgba(251, 191, 36, 0.8); }
.route-node-selected {
  border-color: #fbbf24 !important;
  background: rgba(120, 53, 15, 0.55) !important;
  box-shadow: 0 0 1.6vh rgba(251, 191, 36, 0.45);
  transform: translateY(-0.4vh);
}
.route-node-locked { opacity: 0.45; cursor: not-allowed; filter: grayscale(0.6); }
.route-node-locked:hover { transform: none; border-color: rgba(148, 163, 184, 0.35); }
.route-node-preview { opacity: 0.55; min-width: 8vw; padding: 0.8vh 0.6vw; }
.route-node-preview .route-icon { font-size: 3vh; }
.route-node-current { border-color: rgba(251, 191, 36, 0.9); background: rgba(30, 27, 75, 0.85); min-width: 14vw; }
.route-node-placeholder { height: 3vh; }
.route-conn {
  width: 2px;
  height: 2.6vh;
  background: linear-gradient(to bottom, rgba(148, 163, 184, 0.25), rgba(251, 191, 36, 0.75));
}

/* 🗺️ 可拖拽路线地图（Canvas） */
.route-canvas {
  display: block;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  margin: auto;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 820 / 540;
  border-radius: 1.4vh;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 0 4vh rgba(0, 0, 0, 0.55), inset 0 0 8vh rgba(0, 0, 0, 0.4);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transform-origin: center center;
}
.route-canvas:active { cursor: grabbing; }
.route-zoom-controls {
  position: absolute;
  top: 1.2vh;
  right: 1.2vh;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.8vh;
  background: rgba(15, 18, 32, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1.2vh;
  padding: 0.4vh 0.8vh;
}
.route-zoom-btn {
  width: 4vh;
  height: 4vh;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.8vh;
  background: rgba(148, 163, 184, 0.15);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #fff;
  font-size: 2.6vh;
  line-height: 1;
  cursor: pointer;
  user-select: none;
}
.route-zoom-btn:hover { background: rgba(148, 163, 184, 0.3); }
.route-zoom-pct {
  min-width: 5.5vh;
  text-align: center;
  font-size: 1.7vh;
  color: rgba(255, 255, 255, 0.75);
  user-select: none;
}
.route-canvas:active { cursor: grabbing; }
.route-canvas-hint {
  position: absolute;
  bottom: 1vh;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 1.5vh;
  color: rgba(148, 163, 184, 0.62);
  pointer-events: none;
}
</style>
