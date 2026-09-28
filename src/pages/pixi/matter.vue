  <template>
    <div v-loading="isPageLoading" element-loading-text="游戏加载中..." element-loading-background="#000"
      class="w-screen h-screen overflow-hidden">
      <!-- 🏃 加载动画：加载期间右下角循环播放 paobuload spine -->
      <LoadingSpine :show="isPageLoading" />
      <!-- <div class="absolute z-9999">{{ user.pixi.fight }}/{{ user.pixi.gameUi }}</div> -->
      <!-- 对话 -->
      <div v-show="user.pixi.duihua || user.pixi.dayCgTrigger" class="absolute z-999">
        <duihua />
      </div>

      <!-- 🧭 突破新手引导（10级且可突破时：打开右侧栏 → 点击突破 → 弹出突破界面即完成；引导期间只能点目标按钮） -->
      <!-- 遮罩：拦截其他点击（第2步时 drawer 需在遮罩之上，遮罩降级到主界面层级） -->
      <div v-if="btTutorialStep > 0" class="fixed inset-0 z-[9997]"
        :class="btTutorialStep === 2 ? 'bt-mask-below' : ''">
        <div class="absolute inset-0 bg-black/45"></div>
      </div>
      <!-- 提示气泡：独立于遮罩置顶（drawer z-10000 之上） -->
      <div v-if="btTutorialStep === 1"
        class="fixed -translate-x-1/2 z-[10002] whitespace-nowrap bg-black/90 border-1 border-solid border-amber-400/70 rounded-2 px-4vh py-2.5vh text-center shadow-[0_0_3vh_rgba(250,204,21,0.35)]"
        :style="{ left: btTutorialTipPos.x + 'px', top: btTutorialTipPos.y + 'px' }">
        <div class="text-2.6vh font-bold text-amber-300 mb-1vh">🧭 新手引导 · 突破</div>
        <div class="text-2.2vh text-white leading-snug">点击右上角<b class="text-amber-300">角色头像</b>打开右侧栏</div>
        <div class="text-1.6vh text-white/60 mt-1vh">引导期间只能点击目标按钮</div>
      </div>
      <div v-else-if="btTutorialStep === 2"
        class="fixed -translate-x-1/2 z-[10002] whitespace-nowrap bg-black/90 border-1 border-solid border-amber-400/70 rounded-2 px-4vh py-2.5vh text-center shadow-[0_0_3vh_rgba(250,204,21,0.35)]"
        :style="{ left: btTutorialTipPos.x + 'px', top: btTutorialTipPos.y + 'px' }">
        <div class="text-2.6vh font-bold text-amber-300 mb-1vh">🧭 新手引导 · 突破</div>
        <div class="text-2.2vh text-white leading-snug">点击<b class="text-amber-300">「可突破」</b>按钮</div>
        <div class="text-1.6vh text-white/60 mt-1vh">打开突破界面即完成引导</div>
      </div>

      <kapai v-if="user.pixi.fight" class="absolute! z-[9999]" @fight-end="enablePlayerControl" />
      <DungeonGame v-show="dungeonVisible" :visible="dungeonVisible" @close="closeDungeon" />
      <div ref="gameContainer" class="w-screen h-screen overflow-hidden relative">
        <!-- 自由视角切换按钮 + 地图传送按钮（绝对定位，点击切换摄像机模式 / 打开传送面板） -->
        <div class="absolute top-6vh left-10vw z-30 flex items-center gap-x-1vh">
          <button v-show="!user.pixi.gameUi && !user.pixi.fight && !isPageLoading"
            class="flex items-center gap-x-1vh px-2vh py-1vh rounded-2 border-0.1 border-solid border-#333 text-2.5vh font-bold shadow-md transition-all cursor-pointer select-none!"
            :class="isFreeCamera ? 'bg-#F56C6C text-white' : 'bg-white/80 text-#303133'" @click="toggleFreeCamera">
            <span class="iconfont2">{{ isFreeCamera ? '🎥' : '🛰️' }}</span>
            <span>{{ isFreeCamera ? L('followView') : L('freeView') }}</span>
          </button>
          <button v-show="!user.pixi.gameUi && !user.pixi.fight && !isPageLoading"
            class="flex items-center gap-x-1vh px-2vh py-1vh rounded-2 border-0.1 border-solid border-#333 text-2.5vh font-bold shadow-md transition-all cursor-pointer select-none! bg-#409EFF text-white hover:bg-#66B1FF"
            @click="tpPanelVisible = true">
            <span class="iconfont2">🗺️</span>
            <span>{{ L('mapTeleport') }}</span>
          </button>
          <!-- 🌍 世界地图按钮 -->
          <button v-show="!user.pixi.gameUi && !user.pixi.fight && !isPageLoading"
            class="flex items-center gap-x-1vh px-2vh py-1vh rounded-2 border-0.1 border-solid border-#333 text-2.5vh font-bold shadow-md transition-all cursor-pointer select-none! bg-gradient-to-r from-#67C23A to-#409EFF text-white hover:brightness-110"
            @click="worldMapVisible = true">
            <span class="iconfont2">🌍</span>
            <span>{{ L('worldMap') }}</span>
          </button>          <!-- ⚡ 快速传送按钮（一键传送，不用打开世界地图） -->
          <button v-show="!user.pixi.gameUi && !user.pixi.fight && !isPageLoading"
            class="flex items-center gap-x-1vh px-2vh py-1vh rounded-2 border-0.1 border-solid border-#333 text-2.5vh font-bold shadow-md transition-all cursor-pointer select-none! bg-gradient-to-r from-#F56C6C to-#E6A23C text-white hover:brightness-110"
            @click="quickTpVisible = !quickTpVisible">
            <span class="iconfont2">⚡</span>
            <span>{{ L('quickTeleport') }}</span>
          </button>
          <!-- 🗺️ 黑白碰撞图调试开关 -->
          <button v-show="!user.pixi.gameUi && !user.pixi.fight && !isPageLoading"
            class="flex items-center gap-x-1vh px-2vh py-1vh rounded-2 border-0.1 border-solid border-#333 text-2.5vh font-bold shadow-md transition-all cursor-pointer select-none!"
            :class="heightMapDebugVisible ? 'bg-#F56C6C text-white' : 'bg-white/80 text-#303133'"
            @click="toggleHeightMapDebug">
            <span class="iconfont2">&#x1F532;</span>
            <span>{{ heightMapDebugVisible ? L('hideCollision') : L('showCollision') }}</span>
          </button>
          <button v-show="!user.pixi.gameUi && !user.pixi.fight && !isPageLoading"
            class="flex items-center gap-x-1vh px-2vh py-1vh rounded-2 border-0.1 border-solid border-#333 text-2.5vh font-bold shadow-md transition-all cursor-pointer select-none! bg-gradient-to-r from-#9b59b6 to-#8e44ad text-white hover:brightness-110"
            @click="toggleDungeon">
            <span>&#x1F3F0;</span>
            <span>{{ L('dungeon') }}</span>
          </button>
        </div>

        <img ref="btTutorialAvatarRef" src="@/assets/daoju/juese.webp"
          class="absolute right-2vw w-12vh h-12vh object-contain top-3vh rounded-full"
          :class="btTutorialStep === 1 ? 'guide-lock-avatar' : (btTutorialStep === 2 ? 'bt-avatar-locked' : '')"
          style="border:1.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
          v-show="!user.pixi.gameUi && !isPageLoading && !user.pixi.fight" @click="ceshi5" />
        <el-drawer v-model="drawer" :with-header="false" @close="guanbi" :z-index="btTutorialStep === 2 ? 10000 : 100"
          :close-on-click-modal="btTutorialStep !== 2">
          <div class="bg-#f5f5f5 w-full h-full py-2.5vh px-1vw" :class="btTutorialStep === 2 ? 'bt-guide-lock' : ''">
            <!-- 第一行：头像 + 等级经验 + 血量 -->
            <div class="flex items-start gap-3vw mb-3vh">
              <!-- 左侧：角色头像 -->
              <div class="flex-shrink-0 relative">
                <img src="@/assets/fullBody/head/zhujue.webp" class="w-15vh h-15vh rounded-full object-cover block"
                  style="border:3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />
                <!-- 等级徽章 -->
                <div
                  class="absolute -bottom-2vh left-1/2 iconfont2 -translate-x-1/2 bg-gradient-to-r from-#FFD700 to-#FFA500 text-white text-2.5vh px-1.5vw py-0.2vh rounded-full shadow-md whitespace-nowrap">
                  Lv.{{ user.pixi.player.Level }}
                </div>
                <!-- 🧪 测试按钮区：+500 经验 + 突破（正式上线前移除测试按钮） -->
                <div
                  class="absolute -bottom-10vh left-1/2 -translate-x-1/2 flex items-center gap-x-1vw whitespace-nowrap z-10">
                  <button
                    class="bg-gradient-to-r from-#FFD700 to-#FFA500 text-white text-2vh px-1.5vw py-0.4vh rounded-full shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                    @click.stop="addTestExp">{{ L('testExp') }}</button>
                  <button ref="btTutorialBtnRef" v-if="user.canBreakthrough()"
                    :class="btTutorialStep === 2 ? 'guide-lock-step2' : ''"
                    class="bg-gradient-to-r from-#a78bfa to-#8B5CF6 text-white text-2vh px-1.5vw py-0.4vh rounded-full shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all animate-pulse"
                    @click.stop="openBreakthrough">{{ L('canBreak') }}</button>
                </div>
              </div>

              <!-- 右侧：经验条 + 血量条 -->
              <div class="flex-1 flex flex-col justify-center gap-2vh pt-1vh">
                <!-- 血量进度条 -->
                <div>
                  <div class="flex justify-between items-center mb-0.8vh">
                    <span class="text-2vh font-bold text-#333">{{ L('attrHp') }}</span>
                    <span class="text-1.8vh text-#666">
                      {{ user.pixi.player.juese.hp }} / {{ user.pixi.player.juese.maxHp }}
                    </span>
                  </div>
                  <div class="w-full h-2.5vh bg-#e0e0e0 rounded-full overflow-hidden shadow-inner">
                    <div
                      class="h-full bg-gradient-to-r from-#F56C6C to-#FF7878 rounded-full transition-all duration-300"
                      :style="{ width: Math.max(0, user.pixi.player.juese.hp / user.pixi.player.juese.maxHp * 100) + '%' }">
                    </div>
                  </div>
                </div>
                <!-- 经验值进度条 -->
                <div>
                  <div class="flex justify-between items-center mb-0.8vh">
                    <span class="text-2vh font-bold text-#333">{{ L('attrExp') }}</span>
                    <span class="text-1.8vh text-#666">
                      {{ user.pixi.player.exp }} / {{ user.pixi.player.maxExp }}
                    </span>
                  </div>
                  <div class="w-full h-2vh bg-#e0e0e0 rounded-full overflow-hidden shadow-inner">
                    <div
                      class="h-full bg-gradient-to-r from-#409EFF to-#67C23A rounded-full transition-all duration-300"
                      :style="{ width: Math.max(0, user.pixi.player.exp / user.pixi.player.maxExp * 100) + '%' }">
                    </div>
                  </div>
                </div>
                <!-- 📅 天数记录 -->
                <div class="flex justify-end gap-x-2 items-center">
                  <span class="text-2.5vh font-bold text-#333">游戏{{ L('dayRecord') }}:</span>
                  <span class="text-3vh text-#333 line-height-2.5vh">{{ user.pixi.player.day }}</span>
                </div>
              </div>
            </div>
            <!-- 分割线 -->
            <div class="w-full h-0.1vh bg-#ddd mb-4vh mt-5vh!"></div>
            <!-- 功能图标区：每行最多4个 -->
            <div class="grid grid-cols-4 gap-2vh">
              <!-- 角色信息 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openInventory">
                <img src="@/assets/daoju/beibao.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('bagSystem') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(8)">
                <img src="@/assets/daoju/jibanList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('allyView') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openCards">
                <img src="@/assets/daoju/cardList.webp" class="w-11vh h-11vh object-contain scale-115" />
                <span class="text-2.5vh text-white font-medium">{{ L('cardSystem') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(4)">
                <img src="@/assets/daoju/taskList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('taskTitle') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(5)">
                <img src="@/assets/daoju/aixin.png" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('bondSystem') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openTalent">
                <img src="@/assets/daoju/tianfuList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('talentTab') }}</span>
              </div>
              <!-- 🆕 合成工坊入口 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openCraft">
                <img src="@/assets/daoju/hecheng.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('craftWorkshop') }}</span>
              </div>
              <!-- 🏆 成就系统入口 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openAchievement">
                <img src="@/assets/daoju/chengjiu.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('achTitle') }}</span>
              </div>
              <!-- 🏪 商店入口 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openShop">
                <img src="@/assets/daoju/jinghe.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('shopTitle') }}</span>
              </div>
              <!-- 📖 物品图鉴入口 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openItemTuJian">
                <img src="@/assets/daoju/tujian.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('tjTitle') }}</span>
              </div>
              <!-- 👾 怪物图鉴入口 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openMonsterCodex">
                <span class="text-[5vh] leading-none">👾</span>
                <span class="text-2.5vh text-white font-medium">{{ L('monsterCodex') }}</span>
              </div>
              <!-- ⚗️ 炼制工坊入口 -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="openLianzhi">
                <img src="@/assets/daoju/lianzhi.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('lzWorkshop') }}</span>
              </div>
              <!-- <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="handleTalkNpc('npc/jingling', 'zx01')">
                <img src="@/assets/daoju/tianfuList.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">触发对话</span>
              </div> -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(2)">
                <img src="@/assets/daoju/zhandou.png" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('fight1') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(7)">
                <img src="@/assets/daoju/zhandou.png" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('fight1') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(6)">
                <img src="@/assets/daoju/jiaoxue.webp" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('basicTutorial') }}</span>
              </div>
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="tanchuang(3)">
                <img src="@/assets/daoju/fanhui.png" class="w-11vh h-11vh object-contain" />
                <span class="text-2.5vh text-white font-medium">{{ L('backToMenu') }}</span>
              </div>
              <!-- ⚙️ 设置（返回主界面右侧） -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh"
                @click="settingsVisible = true">
                <span class="text-4vh leading-none">⚙️</span>
                <span class="text-2.5vh text-white font-medium">{{ L('settings') }}</span>
              </div>
              <!-- 🧸 道具放置器（纯视觉 Spine 放置工具） -->
              <div
                class="flex flex-col items-center  cursor-pointer hover:scale-105 transition-transform bg-black/75 rounded-1 py-1.5vh border border-amber-400/40"
                @click="openPropPlacer">
                <span class="text-4vh">🧸</span>
                <span class="text-2.5vh text-amber-300 font-medium">{{ L('placeProp') }}</span>
              </div>
            </div>
          </div>
        </el-drawer>

        <!-- ⚙️ 设置弹窗（文字速度 / 音量 / 手动保存 / 语言） -->
        <el-dialog v-model="settingsVisible" width="74vw" :show-close="true" top="4vh"  append-to-body
          class="settings-dialog" body-class="!p-0!" modal-class="settings-modal"
          :style="{ '--el-dialog-bg-color': 'rgba(20,22,40,0.96)' }">
          <div class="px-4vh h-70vh!  pb-5vh  mb-0!">
            <!-- 文字速度 -->
            <div class="text-2.4vh font-bold text-white/90 mb-1.2vh">{{ L('textSpeed') }}</div>
            <div class="flex items-center gap-x-3vw">
              <span class="text-2vh text-white/60 w-6vh">{{ L('slow') }}</span>
              <el-slider v-model="user.text_speed" :min="90" :max="99" class="flex-1!" @change="onTextSpeedChange" />
              <span class="text-2vh text-white/60 w-6vh">{{ L('fast') }}</span>
            </div>
            <!-- 总音量 -->
            <div class="text-2.4vh font-bold text-white/90 mb-1.2vh mt-0.5vh">{{ L('volume') }}</div>
            <div class="flex items-center gap-x-3vw">
              <span class="text-2vh text-white/60 w-6vh">{{ L('low') }}</span>
              <el-slider v-model="user.volume" :min="0" :max="0.7" :step="0.05" class="flex-1!"
                @change="onVolumeChange" />
              <span class="text-2vh text-white/60 w-6vh">{{ L('high') }}</span>
            </div>
            <!-- 手动保存 -->
            <div class="text-2.4vh font-bold text-white/90 mb-1.2vh mt-2vh">{{ L('manualSave') }}</div>
            <el-button type="primary"  class="w-full!" @click="manualSave">{{ L('manualSave') }}</el-button>
            <!-- 语言 -->
            <div class="text-2.4vh font-bold text-white/90 mb-1.2vh mt-2vh">{{ L('language') }}</div>
            <div class="flex gap-x-2vw">
              <el-button :type="getLang() === 'zh' ? 'primary' : 'default'" 
                @click="switchLang('zh')">中文</el-button>
              <el-button :type="getLang() === 'en' ? 'primary' : 'default'"  
                @click="switchLang('en')">English</el-button>
            </div>
            <!-- ⚡ 性能模式（公共组件，与启动页设置共用） -->
            <PerfModeSwitch />
          </div>
        </el-dialog>

        <!-- 💎 等级突破弹窗 -->
        <el-dialog v-model="breakthroughVisible"
          class="bt-dialog bg-gradient-to-br! from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e]! rounded-[1.2vh]! overflow-hidden! shadow-[0_1vh_5vh_rgba(0,0,0,0.55)]!"
          width="78vw" top="3vh" :show-close="true" modal-class="bt-modal" body-class="!p-0!"
          :close-on-click-modal="false" append-to-body>
          <Breakthrough @breakthrough="onBreakthroughDone" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible" width="75vw" :show-close="false" @close="ceshi5" top="4vh"
          destroy-on-close>
          <xinxi class="overflow-hidden" :defaultTab="playerInfoDefaultTab" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible1" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <task class="overflow-hidden" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible2" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <npcLook class="overflow-hidden" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible3" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <jiaoxue class="overflow-hidden h-91vh! px-2vw py-2vh box-border" />
        </el-dialog>
        <el-dialog v-model="dialogTableVisible4" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <allyLook class="overflow-hidden" />
        </el-dialog>
        <!-- ⚗️ 合成工坊 -->
        <el-dialog v-model="dialogTableVisible5" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <craft class="overflow-hidden" />
        </el-dialog>
        <!-- 🏆 成就系统 -->
        <el-dialog v-model="dialogTableVisible6" width="75vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <achievement class="overflow-hidden" />
        </el-dialog>

        <!-- 🏪 商店 -->
        <el-dialog v-model="dialogTableVisible7" width="75vw" :show-close="false" @close="onShopDialogClose" top="2vh"
          class="p-0!">
          <shop class="overflow-hidden" />
        </el-dialog>

        <!-- ⚗️ 炼制工坊 -->
        <el-dialog v-model="dialogTableVisible8" width="75vw" :show-close="false" @close="ceshi5" top="2vh" class="p-0!"
          :close-on-click-modal="!lzCrafting" :close-on-press-escape="!lzCrafting">
          <lianzhi class="overflow-hidden" @crafting-change="v => lzCrafting = v" />
        </el-dialog>

        <!-- 📖 物品图鉴 -->
        <el-dialog v-model="dialogTableVisible9" width="82vw" :show-close="false" @close="ceshi5" top="2vh"
          class="p-0!">
          <itemTuJian class="overflow-hidden" />
        </el-dialog>

        <!-- 👾 怪物图鉴 -->
        <MonsterTuJian v-model="dialogTableVisible10" />

        <!-- 地图传送面板 -->
        <div v-if="tpPanelVisible" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          @click.self="tpPanelVisible = false">
          <div
            class="bg-white/95 backdrop-blur rounded-2xl shadow-2xl w-[70vw] max-w-[900px] max-h-[88vh] overflow-y-auto p-5vh border border-#DCDFE6">
            <div class="flex items-center justify-between mb-4vh">
              <div class="text-4vh font-bold text-#303133">🗺️ 地图传送</div>
              <button class="text-3.5vh text-#909399 hover:text-#F56C6C transition-colors"
                @click="tpPanelVisible = false">✕</button>
            </div>

            <!-- 目标地图 -->
            <div class="mb-3vh">
              <div class="text-2.5vh font-semibold text-#606266 mb-1.5vh">目标地图</div>
              <div class="flex gap-x-2vh">
                <div v-for="opt in tpMapOptions" :key="opt.id"
                  class="flex-1 px-3vh py-2vh rounded-xl border-2 cursor-pointer text-center transition-all"
                  :class="tpConfig.targetMap === opt.id ? 'border-#409EFF bg-#409EFF/10 text-#409EFF font-bold' : 'border-#DCDFE6 hover:border-#409EFF/50'"
                  @click="tpConfig.targetMap = opt.id; onTpMapChange()">
                  {{ opt.label }}
                </div>
              </div>
            </div>

            <!-- 配置项 -->
            <div class="grid grid-cols-2 gap-x-4vh gap-y-3vh">
              <!-- 昼夜滤镜 -->
              <div>
                <div class="text-2.5vh font-semibold text-#606266 mb-1.5vh">🌗 昼夜滤镜（lightSource）</div>
                <el-select v-model="tpConfig.lightSource" class="w-full">
                  <el-option v-for="opt in tpLightOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </div>
              <!-- TopMap 地面位置 -->
              <div>
                <div class="text-2.5vh font-semibold text-#606266 mb-1.5vh">🏔️ TopMap 地面位置</div>
                <el-input-number v-model="tpConfig.TopMap" :step="1" class="w-full" controls-position="right" />
              </div>
              <!-- OFFSETY 地面高度 -->
              <div>
                <div class="text-2.5vh font-semibold text-#606266 mb-1.5vh">📏 OFFSETY 地面高度</div>
                <el-input-number v-model="tpConfig.OFFSETY" :step="1" :min="0" :max="100" class="w-full"
                  controls-position="right" />
              </div>
              <!-- 地图背景 -->
              <div>
                <div class="text-2.5vh font-semibold text-#606266 mb-1.5vh">🖼️ 地图背景（backgroundImages）</div>
                <el-select v-model="tpConfig.bgKey" class="w-full" @change="onBgKeyChange">
                  <el-option v-for="opt in tpBgOptions" :key="opt.key" :label="opt.label" :value="opt.key" />
                </el-select>
              </div>
              <!-- 远景背景 -->
              <div>
                <div class="text-2.5vh font-semibold text-#606266 mb-1.5vh">🌄 远景背景（farBackgroundImages）</div>
                <el-select v-model="tpConfig.farBgKey" class="w-full" @change="onFarBgKeyChange">
                  <el-option v-for="opt in tpFarBgOptions" :key="opt.key" :label="opt.label" :value="opt.key" />
                </el-select>
              </div>
              <!-- Spine 动态背景 -->
              <div>
                <div class="text-2.5vh font-semibold text-#606266 mb-1.5vh">🌀 Spine 动态背景</div>
                <el-select v-model="tpConfig.spineBgKey" class="w-full" @change="onSpineBgKeyChange">
                  <el-option v-for="opt in tpSpineBgOptions" :key="opt.key" :label="opt.label" :value="opt.key" />
                </el-select>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-x-3vh mt-5vh">
              <button class="flex-1 py-2.5vh rounded-xl text-3vh font-bold text-white transition-all cursor-pointer"
                :class="tpConfig.targetMap === currentMapId ? 'bg-#909399 cursor-not-allowed' : 'bg-gradient-to-r from-#409EFF to-#66B1FF hover:shadow-lg'"
                :disabled="tpConfig.targetMap === currentMapId" @click="doTeleport">
                {{tpConfig.targetMap === currentMapId ? '已在此地图' : `传送到 ${tpMapOptions.find(o => o.id ===
                  tpConfig.targetMap)?.label || tpConfig.targetMap}`}}
              </button>
              <button
                class="w-30vh py-2.5vh rounded-xl text-3vh font-bold bg-#F5F7FA text-#606266 border border-#DCDFE6 transition-all cursor-pointer hover:bg-#E4E7ED"
                @click="tpPanelVisible = false">
                取消
              </button>
            </div>
          </div>
        </div>

        <!-- 🌍 世界地图画布 -->
        <WorldMap :visible="worldMapVisible" :current-map-id="currentMapId" @close="worldMapVisible = false" />
        <!-- 🧸 道具放置器（纯视觉 Spine，无碰撞） -->
        <PropPlacer v-if="propPlacerState.visible" />
        <!-- 🧸 道具放置提示 + 放置/取消按钮（桌面端点击屏幕放置；移动端显示按钮） -->
        <div v-if="propPlacerState.armed"
          class="fixed top-[10vh] left-1/2 -translate-x-1/2 z-[130] flex flex-col items-center gap-[1.2vh] pointer-events-none">
          <div
            class="px-[3vh] py-[1vh] rounded-full bg-black/75 border border-amber-400/40 text-[#fde68a] text-[2vh] backdrop-blur-sm whitespace-nowrap">
            🧸 放置「{{ propPlacerState.armed.label }}」：{{ isTouchDevice ? '摇杆左右调整 · 点「放置」确认' : '点击地图放置 · Esc 取消' }}
          </div>
          <!-- 移动端：放置 / 取消按钮 -->
          <div v-if="isTouchDevice" class="flex gap-[2vh] pointer-events-auto">
            <button @click="confirmGhostPlacement"
              class="px-[3.5vh] py-[1.3vh] rounded-full text-[2.4vh] font-bold bg-gradient-to-r from-[#67c23a] to-[#4ade80] text-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_2vh_rgba(103,194,58,0.4)] cursor-pointer">
              ✅ 放置
            </button>
            <button @click="cancelGhostPlacement"
              class="px-[3.5vh] py-[1.3vh] rounded-full text-[2.4vh] font-bold bg-gradient-to-r from-[#f56c6c] to-[#f78989] text-white hover:brightness-110 active:scale-95 transition-all shadow-[0_0_2vh_rgba(245,108,108,0.4)] cursor-pointer">
              ✕ 取消
            </button>
          </div>
        </div>

        <!-- ⚡ 快速传送面板（不用打开世界地图，一键传送到任意地图） -->
        <div v-if="quickTpVisible" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          @click.self="quickTpVisible = false">
          <div
            class="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[#fbbf24]/40 rounded-2 p-[3vh] w-[40vw] max-w-[420px] shadow-2xl">
            <div class="flex items-center justify-between mb-[2vh]">
              <h3 class="m-0 text-[3vh] font-bold text-white">⚡ 快速传送</h3>
              <button
                class="w-[4vh] h-[4vh] rounded-full bg-white/10 text-white/70 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                @click="quickTpVisible = false">✕</button>
            </div>
            <!-- 🌗 选择传送后的时间（修改昼夜滤镜） -->
            <div class="flex items-center gap-[1vh] mb-[2vh]">
              <span class="text-[2vh] text-white/70 whitespace-nowrap">🌗 时间</span>
              <div class="flex gap-[0.8vh] flex-1">
                <button
                  v-for="t in [{ v: null, label: '默认' }, { v: 'morning', label: '☀️ 早上' }, { v: 'night', label: '🌙 晚上' }]"
                  :key="t.v === null ? 'default' : t.v"
                  class="flex-1 px-[1.5vh] py-[1vh] rounded-xl text-[1.8vh] font-bold transition-all cursor-pointer border"
                  :class="quickTpTime === t.v
                    ? 'bg-[#fbbf24]/25 text-[#fbbf24] border-[#fbbf24]/50'
                    : 'bg-white/5 text-[#e0e0e0] border-white/10 hover:bg-[#fbbf24]/10'" @click="quickTpTime = t.v">
                  {{ t.label }}
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-[1vh] max-h-[50vh] overflow-y-auto npc-scrollbar">
              <button v-for="m in quickTpMaps" :key="m.id"
                class="flex items-center justify-between px-[2vh] py-[1.2vh] rounded-xl text-[2vh] font-bold transition-all cursor-pointer border"
                :class="m.id === currentMapId
                  ? 'bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/40 cursor-not-allowed'
                  : 'bg-white/5 text-[#e0e0e0] border-white/10 hover:bg-[#fbbf24]/15 hover:border-[#fbbf24]/40'"
                :disabled="m.id === currentMapId" @click="quickTeleport(m.id)">
                <span>{{ tr(m.name) }}</span>
                <span class="text-[1.6vh] text-white/50 font-normal">{{ m.id }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

<script setup>
import DungeonGame from './dungeon.vue';
import duihua from "./duihua.vue";
import WorldMap from "./components/WorldMap.vue";
import PerfModeSwitch from "@/components/PerfModeSwitch.vue";
import LoadingSpine from "@/components/LoadingSpine.vue";
import { ref, onMounted, onBeforeUnmount, markRaw, watch } from "vue";
import {
  Container,
  Graphics,
  ColorMatrixFilter,
  Sprite,
  BlurFilter,
  Text,
  Assets,
  TexturePool,
} from "pixi.js";
import { gsap } from "gsap";
import emitter from "@/bus";
import { attachShadow } from "./lighting";
import Matter from "matter-js";
import { createApp } from "./core/app.js";
import { createSpineBoy } from "./spineBoy";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { createViewport } from "./camera/viewport.js";
import { createEngine } from "./core/engine.js";
import {
  createRectObject,
  createCircleObject,
  createTriangleObject
} from "./objects/index.js";
import { useCounterStore } from "@/store/counter";
import { tr } from "@/i18n";
import { pushBgmScene as audioPushBgmScene, popBgmScene as audioPopBgmScene, sfx as audioSfx } from "@/utils/audioManager";
import xinxi from "./player/xinxi.vue";
import task from "./player/task.vue";
import npcLook from "./player/npcLook.vue";
import allyLook from "./player/allyLook.vue";
import craft from "./player/craft.vue";
import achievement from "./player/achievement.vue";
import shop from "./player/shop.vue";
import lianzhi from "./player/lianzhi.vue";
import itemTuJian from "./player/ItemTuJian.vue";
import MonsterTuJian from "@/components/MonsterTuJian.vue";
import jiaoxue from "./player/jiaoxue.vue";
import PropPlacer from "./player/propPlacer.vue";
import { propPlacerState, openPropPlacer, disarmProp, closePropPlacer, propAffordable, consumePropCost, propCostText } from "./player/propPlacerStore.js";
import { SPINE_PROP_DEFS, PROP_PLACE_MAPS } from "./player/spineProps.js";
import { getMapData, getAllMapIds, getTiledMapUrls, getAllMapMeta } from "./player/map";
import { ensureTiledMap, getTiledMapCached } from "./player/tiledMap";
import { ElMessText } from "@/pages/zujian/utils.js";
import { ElMessageBox } from 'element-plus';
import { updateSetting } from "@/pages/storage";
import { t as i18nT, getLang, setLang } from "@/i18n";
import Breakthrough from "./player/Breakthrough.vue";

import { loadMapBundle, isBundleLoaded } from "../../components/loadAssets";
import router from "@/router";
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { BgWall, createWallObject, createBgSpine, createPool, loadMapData, computeMapWidth } from './matter1/bg.js';
import { idleAnimator } from './matter1/idleAnimator.js';
import { createPlayerPhysicsBody, applyDamageFilter, updatePlayerAnimation, updatePlayerDirection, createHpBar } from './matter1/playerCreate.js';
import { wenhaoHudong, floatingMarks, setWenhaoHudong, createWenhaoHudong, getWenhaoHudong } from './matter1/daoju.js';
import { destroyEffect } from './matter1/particleEffects.js';
import { savePlayerPosition, savedPlayerPosition, savedPlayerMapId, teleportBack, removeNPCsByMapId, playerUpdate, updateNPCPool, hideAllEnemyHpBar, fightMode, showAllEnemyHpBar, npcs, npcPool, syncAllNPC, goToMap, setNpcDirection, moveNpcToX } from './matter1/npcManager.js';
import { setupCollisionStart, setupCollisionEnd } from './matter1/collisionEvents.js';
// 🗺️ 高度图吸附法：黑白碰撞图 → 一维高度数组，玩家/NPC 按 x 查高度吸附地面
import { ensureHeightMap, getGroundYAt, clearHeightMap } from './matter1/heightMap.js';
import { initGameUI, updateGameUI, getJoystick, setViewportRef } from "./matter1/gameUI.js";
import { shakeViewport } from "./matter1/myFilter.js";
import {
  destroyDayNightFilter, setDayNightSpeed, hideDayNightFilter, showDayNightFilter, isDayNightActive, getDayTime, setDayTime, createDayNightFilter, waitDayNightReady
} from "./matter1/filters.js";
import kapai from "./fight/index.vue"
import { fightQidong } from "./matter1/fightKaiqi.js"
import { setNpcAllySpine, setNpcAllyScreenPos, setPlayerScreenPos, isPlayerTurn } from "./fight/battle.js"
import { DAMAGE_COLOR_MAP, BUFF_COLOR_MAP } from './matter1/buff.js'
import { createCustomEnemies } from './matter1/enemiesData.js';
import { loadDialogueModule, startDialogue, allDialogues } from './dialogue/index.js';
// 多线程物理Worker
const physicsWorker = new Worker(new URL('./physics.worker.js', import.meta.url), { type: 'module' });
// 刚体ID映射：id -> 主线程Matter.Body实例，用于同步坐标
// 玩家输入缓存，每帧发给worker
const playerInput = ref({
  left: false,
  right: false
});
// ✅ 复用 postMessage 对象，每帧只改 data 引用
const staticInputMsg = {
  type: 'input',
  data: null,
  VW: 0, // 占位，onMounted 中由 VW 赋值
  VH: 0, // 占位，onMounted 中由 VH 赋值（移动速度统一用 VH 世界单位）
};
staticInputMsg._zero = { left: false, right: false };
// ✅ 活输入复用对象（每帧直接改属性，不 new 对象）
staticInputMsg._live = { left: false, right: false };
// ✅ 新增：玩家控制总开关（true=可移动，false=完全禁用）
let canPlayerControl = true;
// ✅ 镜头是否固定（战斗时固定镜头）
let isCameraFixed = false;
// 🎥 自由视角（摄像机脱离跟随，自由飞行）
const isFreeCamera = ref(false)
// 自由视角键盘输入状态（上下左右）
const freeKeys = { up: false, down: false, left: false, right: false }
// 自由视角移动速度（每帧移动距离 = 屏幕宽度 * 该系数）
const FREE_CAM_SPEED = 0.02

// =====================================
// 🗺️ 地图传送面板（逻辑已抽离到 matter1/mapTeleport.js）
// =====================================
import {
  tpMapOptions,
  tpLightOptions,
  tpBgOptions,
  tpFarBgOptions,
  tpSpineBgOptions,
  tpPanelVisible,
  tpConfig,
  initMapTeleport,
  onTpMapChange,
  onBgKeyChange,
  onFarBgKeyChange,
  onSpineBgKeyChange,
  doTeleport,
} from './matter1/mapTeleport.js'

// =====================================
// 🌍 世界地图画布
// =====================================
const worldMapVisible = ref(false);
const dungeonVisible = ref(false); // 世界地图开关
const mainWorldNight = ref(false); // 🌙 主世界天黑标记：离开地牢后为 true → 功能图标区显示休息入口
const pendingDungeonBattle = ref(false); // 地牢战斗中：战斗结束后重新打开地牢

// 🗺️ 世界地图打开时：清空玩家输入残留（防止按住移动键开地图后角色继续走），
//    关闭时恢复（后续按键由键盘监听正常处理）
watch(worldMapVisible, (v) => {
  if (!v) return;
  if (joystick) {
    joystick.keyLeft = false;
    joystick.keyRight = false;
  }
  playerInput.value = { left: false, right: false };
});
function toggleDungeon() {
  if (dungeonVisible.value) {
    dungeonVisible.value = false; // 关闭地牢
    audioPopBgmScene(); // 🎵 离开地牢：恢复进入地牢前的主世界 BGM
    return;
  }
  // ⏳ 每天只能进入一次地牢：当天已进过 → 拦截（离开地牢后直接天黑，休息过夜到新一天才能再来）
  const _today = Number(user.pixi?.player?.day) || 1;
  if ((user.pixi?.dungeonLastEnterDay ?? -1) === _today) {
    ElMessText('今天已经进过地牢了，天色已晚，明天再来吧', 'warning');
    return;
  }
  // 🩸 生命值 <5% 不可进入地牢（先恢复血量再进入）
  const _hp = user.pixi?.player?.juese;
  const _hpPct = _hp && _hp.maxHp ? _hp.hp / _hp.maxHp : 1;
  if (_hpPct < 0.05) {
    ElMessText('生命值过低，无法进入地牢，请先恢复血量！', 'warning');
    return;
  }
  user.setDialogueFlag('dungeonEnterOutside', true); // 🌙 从地牢外进入：进入后刷新为白天
  user.setDialogueFlag('shangrenMetThisDungeon', false); // 🧭 重置本次地牢会话的商人对话计数
  user.setDialogueFlag('cdDungeonVisited', true); // 🏰 已前往地牢：主线待续期（守城后）满足今日休息条件
  audioPushBgmScene(); // 🎵 进入地牢：记忆主世界 BGM 并停止，由地牢 playBgMusic 接管
  dungeonVisible.value = true;
  user.pixi.dungeonLastEnterDay = _today; // ⏳ 记录今日已进地牢
}
// 🏰 关闭地牢（含离开时恢复主世界 BGM）
function closeDungeon() {
  dungeonVisible.value = false;
  audioPopBgmScene(); // 🎵 离开地牢：恢复进入地牢前的主世界 BGM
  // 🦊 晨曦初见（剧情模式专属）：首次离开地牢回到主世界 → 触发晨曦对话（chenxi.js cl01；播完标记完成，不再触发）
  // ⚔️ 普通模式无剧情：离开地牢不触发任何对话
  if (user.pixi?.gameMode !== 'normal' && !user.isDialogueComplete?.('cl01')) {
    emitter.emit('talkToNpc', { loadData: 'npc/chenxi', name: 'cl01' });
  }
}

// 🌙 天黑后在地图上创建浮动月亮休息图标（点击图标 → dayo1001 休息节点过夜；CG 播完在 onDayCgFinished 天亮并移除图标）
function createNightRestMark() {
  try { getWenhaoHudong('rest_night')?.remove(); } catch (e) { /* ignore */ }
  createWenhaoHudong({
    id: 'rest_night',
    mapId: currentMapId,
    x: 0.61,  // 地图 x 轴固定位置（百分比）
    y: 0.55,   // 地图 y 轴固定位置（百分比）
    textureName: 'xiuxi',   // 🌙 休息图标纹理
    scale: 1.5,
    detectWidth: 35,
    wuxian: -1,             // 无限点击
    isFloatEnable: true,    // 上下浮动
    clickData: {            // 可序列化路由：读档后点击仍可恢复
      loadData: 'npc/jingling',
      route: [{ name: 'dayo1001', silent: true }], // 直接执行休息（普通模式无剧情标记，仅休息+回血+昼夜CG）
    },
  });
}

watch(dungeonVisible, (v) => {
  if (!app) return;
  if (v) {
    if (joystick) { joystick.keyLeft = false; joystick.keyRight = false; }
    playerInput.value = { left: false, right: false };
    app.ticker.stop();
    emitter.emit('dungeonResume'); // 🏰 地牢重新显示：解冻 + 重置敌人到出生点
  } else {
    app.ticker.start();
    repairMainFilterBindGroup();
    emitter.emit('dungeonPause'); // 🏰 地牢隐藏：冻结移动
    // 🌙 从地牢返回主世界：重新应用地图昼夜配置
    try {
      if (currentLight?.night?.enable) {
        initOnceDayNightFilter();
        applyMapDayNightConfig();
      }
    } catch (e) { /* ignore */ }

    // 🎵 彻底离开地牢回主世界：恢复主世界背景音乐
    //    （进入战斗隐藏地牢时 pendingDungeonBattle=true → 跳过；战斗结束返回地牢由 dungeon.vue playBgMusic 恢复）
    if (!pendingDungeonBattle.value) {
      user.playBgm('senlin', 0.25);
      // 🌙 离开地牢后直接天黑：固定夜晚（与地牢天黑一致），并在地图上创建浮动月亮休息图标（休息过夜到新一天才会重新变亮）
      try {
        if (currentLight?.night?.enable) {
          setDayTime(0.5);
          setDayNightSpeed(0);
        }
      } catch (e) { /* ignore */ }
      mainWorldNight.value = true;
      createNightRestMark();
    }
  }
});
// 🛠️ 兜底修复：项目里多个独立 renderer（对话头像/CG/战斗场景等）destroy(true) 时
// 会 releaseGlobalResources → 清空全局 TexturePool._texturePool，但 _poolKeyHash 残留旧 uid 映射，
// 导致主游戏 Text 销毁时 this._texturePool[key] 为 undefined → returnTexture 崩溃白屏。
// 这里包装 returnTexture：池缺失的 key 自动补空数组 / 池被清空则安全丢弃，彻底免疫该类崩溃。
try {
  const _origReturnTexture = TexturePool.returnTexture.bind(TexturePool);
  TexturePool.returnTexture = function (renderTexture, resetStyle) {
    const key = this._poolKeyHash?.[renderTexture?.uid];
    if (key === undefined || !this._texturePool) return; // 池被清空/未登记：直接丢弃，避免崩溃
    if (!this._texturePool[key]) this._texturePool[key] = [];
    return _origReturnTexture(renderTexture, resetStyle);
  };
} catch (e) { /* ignore */ }

// 🛠️ 修复主游戏滤镜 BindGroup：地牢的独立 renderer 在销毁时可能触发全局滤镜纹理被回收，
// 导致 FilterSystem._globalFilterBindGroup 自动 destroy（resources=null），恢复渲染时报错。
// 返回地牢时将其重置为空对象，下次 setResource 重建。
function repairMainFilterBindGroup() {
  try {
    const fs = app?.renderer?.renderPipes?.filter;
    const bg = fs?._globalFilterBindGroup;
    if (bg && bg.resources === null) {
      bg.resources = Object.create(null);
      bg._dirty = true;
    }
  } catch (e) { /* ignore */ }
}

// ⚡ 快速传送面板（不用打开世界地图，一键传送到任意地图）
const quickTpVisible = ref(false);
const quickTpMaps = getAllMapIds().map(id => {
  const d = getMapData(id, { WORLD_WIDTH: 0 });
  return { id, name: d.name || id };
});
// 🌗 快速传送面板：选择传送后应用的时间（null=保持地图默认，'morning'=早上，'night'=晚上）
const quickTpTime = ref(null);

// 🗺️ 高度图/黑白碰撞图 调试开关（显示黑白图叠层，对照地形）
const heightMapDebugVisible = ref(false)

const gameContainer = ref(null);
const isPageLoading = ref(true); // 全局加载状态
const user = useCounterStore();// 💾 昼夜动画播放完毕后保存游戏（点击休息 → 播放昼夜CG → CG播放完才存档）
emitter.off('skipToDungeon', onSkipToDungeon);
emitter.on('skipToDungeon', onSkipToDungeon);
// 🏰 跳过初始剧情 → 直接进入地牢（复用 toggleDungeon 的进入逻辑）
function onSkipToDungeon() {
  toggleDungeon();
}
emitter.off('dayCgFinished', onDayCgFinished);
emitter.on('dayCgFinished', onDayCgFinished);
function onDayCgFinished() {
  // ⚔️ 幕12守城夜解锁：任务「等待众人回归」完成（10级突破）后，休息过夜到次日才可触发营地触发点（cdSiege）
  if (user.isTaskCompleted?.('wait_return') && !user.getDialogueFlag?.('cdSiegeReady')) {
    user.setDialogueFlag?.('cdSiegeReady', true);
  }

  // 🏰 主线待续期（守城夜完成后）休息条件重置：休息过夜后，下次休息前需再次前往地牢
  if (user.isDialogueComplete?.('cdSgEnd')) {
    user.setDialogueFlag?.('cdDungeonVisited', false);
  }

  // 🌙 天黑休息完成（点击浮动月亮休息图标 → dayo1001 休息 → 昼夜CG 播完）：恢复主世界白天并移除休息图标
  if (mainWorldNight.value || getWenhaoHudong?.('rest_night')) {
    mainWorldNight.value = false;
    try {
      setDayTime(0);      // 🌅 天亮
      setDayNightSpeed(0); // 固定白天（地图默认无时间流逝）
    } catch (e) { /* ignore */ }
    getWenhaoHudong('rest_night')?.remove();
  }
  saveGame();
}

const route = useRoute();
const drawer = ref(false)
// ✅ 是否跳过自动存档（用于新游戏/重置场景，删除存档后阻止路由守卫重新存档）
// 离开游戏页面时自动存档（所有返回主界面的入口都会触发）
onBeforeRouteLeave((to, from, next) => {
  // 战斗中退出不存档，避免存档异常数据
  if (user.pixi.fight) {
    next();
    return;
  }
  // 新游戏/重置场景：跳过自动存档（前面已经删除了存档）
  if (user._skipAutoSave) {
    user._skipAutoSave = false;
    next();
    return;
  }
  if (activePlayer) {
    user.autoSave(getSaveData());
    // 💾 自动保存成功轻提示（返回主界面等离开场景；延迟到防抖写入后）
    setTimeout(() => { try { ElMessText(L('saveAutoSuccess'), 'success'); } catch (e) { /* ignore */ } }, 350);
  }
  next();
});


// 收集存档数据（玩家/NPC 位置一律存为百分比，避免屏幕尺寸变化后读档错位）
function getSaveData() {
  const npcDirections = {};
  const npcPositions = {};
  const npcHidden = {};
  const npcPendingMoves = {};

  // 玩家当前地图参数（像素 → 百分比换算用）
  const playerMap = user.pixi.mapDataList?.find(m => m.id === currentMapId);
  const playerMapWidth = playerMap?.realWidth || 1;
  const playerMapOffset = playerMap?.offsetX ?? 0;
  const mapHeightPx = 100 * VH; // 地图高度基准（与 NPC 创建时一致）

  for (const npc of npcs) {
    const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
    if (!npcKey) continue;
    if (npc.spine?.direction != null) {
      npcDirections[npcKey] = npc.spine.direction;
    }
    // NPC 位置存百分比：相对其所在地图的宽度/偏移
    if (npc.body?.position?.x != null) {
      const npcMap = user.pixi.mapDataList?.find(m => m.id === npc.mapId);
      const w = npcMap?.realWidth || playerMapWidth;
      const off = npcMap?.offsetX ?? playerMapOffset;
      npcPositions[npcKey] = (npc.body.position.x - off) / w;
    }
    // 只保存真正被脚本显式隐藏的 NPC，不保存因距离远而暂时不可见的 NPC
    // ⚠️ 还要排除「非当前地图的 NPC」：它们因 notCurrentMap 被 updateNPCPool 隐藏
    //    （_explicitlyHidden=true），但这不是脚本显式隐藏。若误存为 npcHidden，
    //    读档后 restoreDirections 会把它们写成 hidden=true，导致切回原地图后
    //    该地图 NPC 永远加载不出来（比如在初始之森存档，绿洲 NPC 全部丢失）。
    if (npc._explicitlyHidden === true && npc.mapId === currentMapId) {
      npcHidden[npcKey] = true;
    }
    // ✅ 保存未完成的 NPC 移动任务（targetX 转百分比，读档按新地图宽度换算）
    if (npc._pendingMove) {
      const pend = { ...npc._pendingMove };
      const npcMap = user.pixi.mapDataList?.find(m => m.id === npc.mapId);
      const w = npcMap?.realWidth || playerMapWidth;
      const off = npcMap?.offsetX ?? playerMapOffset;
      if (pend.targetX != null) {
        pend.targetPercent = (pend.targetX - off) / w;
      }
      npcPendingMoves[npcKey] = pend;
    }
  }

  return {
    currentMap: currentMapId,
    playerX: ((activePlayer?.body?.position.x ?? 0) - playerMapOffset) / playerMapWidth,
    playerY: (activePlayer?.body?.position.y ?? 0) / mapHeightPx,
    playerDirection: activePlayer?.spine?.direction ?? 1,
    npcDirections: npcDirections,
    npcPositions: npcPositions,
    npcHidden: npcHidden,
    npcPendingMoves: npcPendingMoves,
  };
}

// 恢复朝向（读档时调用）
function restoreDirections() {
  // 恢复玩家朝向
  if (route.query.playerDir && activePlayer?.spine) {
    const dir = Number(route.query.playerDir);
    activePlayer.spine.direction = dir;
    activePlayer.spine.setDirection?.(dir);
  }

  // 恢复NPC朝向
  if (route.query.npcDirs) {
    try {
      const npcDirs = JSON.parse(route.query.npcDirs);
      let restoredCount = 0;
      for (const npc of npcs) {
        const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
        if (npcKey && npcDirs[npcKey] != null && npc.spine) {
          const dir = npcDirs[npcKey];
          npc.spine.direction = dir;
          npc.spine.setDirection?.(dir);
          restoredCount++;
        }
      }
      // console.log(`[读档] 恢复了 ${restoredCount} 个NPC的朝向`);
    } catch (e) {
      console.warn('[读档] 解析NPC朝向失败:', e);
    }
  }
}

import { npcs as _npcs, npcPool as _npcPool } from './matter1/npcManager.js';
// 暴露给外部模块直接访问（如 jingling.js 的 setNpcVisible）
window.__npcPool = _npcPool;
window.__npcs = _npcs;

// 暴露全局 setNpcVisible 供对话系统直接调用（绕过 emitter）
window.__setNpcVisible = (npcId, visible) => {
  const npc = _npcPool.find(n => (n.data?.id ?? n.data?.data?.id) === npcId);
  if (!npc) return;
  npc._explicitlyHidden = !visible;
  npc.view.visible = visible;
  if (npc.body) {
    npc.body.collisionFilter.mask = visible ? 0x0006 : 0; // OBSTACLE|BULLET : 无碰撞
  }
};

let app;
let worldContainer;
let propContainer; // 🧸 道具放置容器（纯视觉，无碰撞）
const _propViews = new Map(); // 已放置道具的 Spine 视图 id → view
const _propBodies = new Map(); // 已放置道具的刚体 id → body（仅 collidable 道具）
const _propQms = new Map();    // 已放置道具头顶的浮动问号 id → mark（可配置 show/onClick）
let _ghostView = null; // 🧸 放置中的透明预览视图
let _ghostRing = null; // 预览脚下的定位环（金色 = 可放置）
let _ghostRedColumn = null; // 重叠警示红色光柱（显示 = 不可放置）
let _ghostDef = null;  // 预览对应的道具 def
let _ghostX = null;    // 预览当前世界 x（null = 尚未定位；y 始终贴地）
let _lastMouseClient = null; // 最近一次鼠标位置（桌面端选中道具时预览初始定位用）
// 左右键/摇杆微调步长（⚠️ 运行时取值：window.VH 在游戏初始化后才设置，模块加载时取会是 NaN）
const ghostNudge = () => 2 * window.VH;
// 是否为触屏设备：移动端显示「放置/取消」按钮 + 摇杆调整；桌面端点击屏幕放置 + 鼠标调整
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
let engine;
let runner;
let playerPool;
let activePlayer;
let world;

const dialogTableVisible = ref(null);
const dialogTableVisible1 = ref(null);
const dialogTableVisible2 = ref(null);
const dialogTableVisible3 = ref(null);
const dialogTableVisible4 = ref(null); // 同伴查看
const dialogTableVisible5 = ref(null); // 合成工坊
const dialogTableVisible6 = ref(null); // 成就系统
const dialogTableVisible7 = ref(null); // 商店
const merchantShopReturn = ref(false); // 🏪 地牢商人「买卖」打开商店：关闭后返回对话，不弹侧边栏
const dialogTableVisible8 = ref(null); // 炼制工坊
const dialogTableVisible9 = ref(null); // 物品图鉴
const dialogTableVisible10 = ref(null); // 怪物图鉴
const lzCrafting = ref(false); // 炼制工坊是否正在炼制（炼制中锁定弹窗，禁止关闭离开）
const playerInfoDefaultTab = ref('info'); // 角色信息面板默认激活的标签
const rectPool = createPool(createRectObject);
const circlePool = createPool(createCircleObject);
const trianglePool = createPool(createTriangleObject);

let WORLD_WIDTH;
let WORLD_HEIGHT;

let VH = window.innerHeight / 100;
let VW = window.innerWidth / 100;
// ✅ 同步 staticInputMsg.VW/VH（避免 TDZ 错误，VH/VW 此时已初始化）
staticInputMsg.VW = VW;
staticInputMsg.VH = VH;
// 🗺️ 注入地图传送模块的运行依赖（user/VH/Assets/BgWall/TpMap 等此时均已定义）
initMapTeleport({
  user,
  Assets,
  BgWall,
  ElMessText,
  computeMapWidth,
  getVH: () => VH,
  getTpMap: () => TpMap,
  getCameraTarget: () => cameraTarget,
  getActivePlayer: () => activePlayer,
  resetMapBounds: () => { MAP_BOUNDS = null },
});

const COLLISION_GROUPS = {
  FRIEND: 0x0001,
  ENEMY: 0x0002,
  OBSTACLE: 0x0004,
  BULLET: 0x0008,
  SENSOR: 0x0010,
};

function tanchuang(i) {
  if (i === 3) {
    user.pixi.fight = false
    user.pixi.isPaused = false;
    drawer.value = false;
    // 复位主界面显示条件，防止异常路径导致返回后白屏
    user.selectBoolean = false;
    user.youxi = 0;
    router.push({ name: "index" });
    return;
  }
  user.pixi.setting = i;
  if (i === 2) {
    drawer.value = false
    console.log('成就=', user.achievements);
    console.log('npc=', user.pixi.npcDataList);
    console.log('desert_01 地图的问号数据=', JSON.stringify(
      user.pixi.mapDataList?.find(m => m.id === 'desert_01')?.wenhaoHudong, null, 2
    ));
    console.log('保存的对话记录this.pixi.dialogueProgress=', user.pixi.dialogueProgress);
    console.log('保存的对话记录this.pixi.dialogueFlags=', user.pixi.dialogueFlags);
    console.log("user.pixi.mapDataList地图数据=", user.pixi.mapDataList);
    // 🃏 测试：解锁所有卡牌（只加入背包，不修改当前卡组），方便测试战斗效果
    const allCardNames = Object.keys(user.pixi.player.CARD_DATA);
    let unlockedCount = 0;
    for (const cardName of allCardNames) {
      user.addCardToInventory(cardName, 1);
      unlockedCount++;
    }
    ElMessText(`✅ 已解锁全部 ${unlockedCount} 张卡牌，可在图鉴中查看！`, "success");
    console.log('🎴 已解锁所有卡牌:', allCardNames);
    console.log('🎴 当前卡组 deck=', user.pixi.player.deck);
    return
  } else if (i === 7) {
    drawer.value = false
    emitter.emit("talkToNpc", {
      loadData: 'npc/jingling',
      name: 'dayo01',
      //  silent: true // 🔇 只执行 onEnter（添加障碍物），不弹出对话框
    });
    return
  } else if (i === 0) dialogTableVisible.value = true;
  else if (i === 4) dialogTableVisible1.value = true;
  else if (i === 5) dialogTableVisible2.value = true;
  else if (i === 6) dialogTableVisible3.value = true;
  else if (i === 8) dialogTableVisible4.value = true;
}
const vh = (percent) => {
  const viewportHeight = window.innerHeight; // 或者用你的Pixi应用高度：app.renderer.height
  const px = viewportHeight * percent / 100;
  // 限制最小/最大字号，避免极端分辨率下异常
  return Math.max(12, Math.min(px, 32));
};
// 🔢 假 body（纯视觉 NPC）id 递增种子：保证每个假 body id 唯一稳定
let _fakeBodyIdSeed = 900000;
function createPlayerObject(x, y, options) {
  const DEFAULT_HEIGHT = 27;
  console.log('options=', options);

  const playerH = (options.height ?? DEFAULT_HEIGHT) * VH;
  const playerW = playerH * 0.4;
  const radius = playerW / 2;
  const rectHeight = playerH - 2 * radius;

  const isFriend = options.player === 1 || options.player === 3;
  const collisionCategory = isFriend ? COLLISION_GROUPS.FRIEND : COLLISION_GROUPS.ENEMY;

  // ============================================================
  // 🎯 纯视觉 NPC：非玩家（player!==1）不创建物理刚体
  //    用「假 body」占位对象模拟 position/velocity，让所有读 npc.body.xxx 的代码照常工作；
  //    它不是 Matter 刚体，不会被引擎施加重力/碰撞 → NPC 纯 Spine 视觉，位置由代码控制。
  //    只有玩家（player:1）创建真实 Matter 刚体（受重力、有碰撞）。
  // ============================================================
  let body, footSensor;
  if (options.player === 1) {
    const { body: _b, footSensor: _f } = createPlayerPhysicsBody(
      playerW, rectHeight, radius, isFriend, collisionCategory, Matter, COLLISION_GROUPS
    );
    body = _b;
    footSensor = _f;
    // 复合体不支持 Body.setInertia，直接锁定惯性防止旋转
    body.inertia = Infinity;
    body.inverseInertia = 0;
    Matter.Body.setPosition(body, { x, y });
    Matter.World.add(world, body);
  } else {
    // 假 body（纯视觉 NPC，无物理）：模拟 position/velocity 字段
    _fakeBodyIdSeed++;  // 模块级递增，保证 id 唯一稳定
    body = {
      id: _fakeBodyIdSeed,
      label: "playerMain",
      position: { x, y },
      positionPrev: { x, y },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      angle: 0,
      inertia: Infinity,
      inverseInertia: 0,
      isStatic: true,     // 假 body 标记为静态（语义上不受物理影响）
      isSleeping: false,
      isSensor: false,
      mass: 1,
      frictionAir: 0,
      parts: [],
      _fakeBody: true,    // 🔥 标记：供 npcManager 判断用直接赋值而非 Matter.Body API
      gameObject: null,
      collisionFilter: { mask: 0x0006 }, // OBSTACLE|BULLET（兼容读 mask 的代码）
      view: null,
    };
    footSensor = null;
  }

  const spine = createSpineBoy({}, options);
  spine.view.batchable = true;
  spine.view.alphaCutoff = 0.1;
  const bounds = spine.spine.getBounds();
  const scale = (playerH / bounds.height);
  spine.view.scale.set(scale);
  // Spine中心点 = 和刚体一模一样 x，y = body.y + TopMap 偏移（与 physics.worker 公式一致：
  //   fy = y + (th + currentMapTopMap) * VH）
  //   ⚠️ 之前只设 body.y，worker 每帧会补 TopMap*VH 覆盖 view.y，
  //      导致角色创建瞬间「先出现、跳一下、再被拉回」的视觉跳动。
  //      这里一步到位，view.y 一开始就是最终位置。
  spine.view.position.set(x, y + ((options.TopMap ?? 0) + (defaultMap?.TopMap ?? 0)) * VH);
  spine.direction = 1;
  spine.setDirection(1);
  spine.view.zIndex = options.zIndex ?? 0;

  // ==============================================
  // 🔥 全局共享 BlurFilter 实例（所有影子复用同一个，极大减少GPU开销）
  // ==============================================

  // shadow 为 false 时不创建脚下影子（对话中创建 NPC 可通过 shadow 参数控制）
  // 🕳️ 软影：椭圆径向渐变纹理（比硬椭圆更自然，静态纹理零性能开销）
  const showShadow = options.shadow !== false;
  const shadow = showShadow
    ? attachShadow(worldContainer, playerW * 0.6, playerW * 0.2)
    : null;
  if (showShadow) {
    shadow.visible = true;
    shadow.zIndex = -1;
    // ✅ 初始时影子直接放到spawn位置，避免出现在(0,0)显示
    shadow.x = x - 0.5 * VW;
    shadow.y = y + 4 * VH;
    if (options.shadowConfig) {
      shadow.x -= (options.shadowConfig.offsetX) * VW
      shadow.y += (options.shadowConfig.offsetY) * VH
    }
    shadow.alpha = 0.3
    worldContainer.addChild(shadow);
  }
  worldContainer.addChild(spine.view);
  // 初始化地面固定Y
  let groundFixedY;
  // 影子动画插值变量
  let shadowScale = 1;
  let shadowAlpha = 0.4;
  // ==============================================

  // 🎯 角色移动速度：支持 options.speed 自定义（NPC 创建时可传 speed 控制移动快慢）
  //    默认 = 玩家身高 2.5%（每帧像素）；纯视觉 NPC（假 body）移动时 moveNpcToX 会用其 35%
  const speed = options.speed ?? (playerH * 0.025);
  const zdSpeed = playerH * 0.18;
  // 全局创建唯一的受伤滤镜，所有角色共享
  const globalDamageFilter = new ColorMatrixFilter()
  // 预设闪白参数，不用每次创建
  globalDamageFilter.brightness(1.8)
  globalDamageFilter.contrast(1.2)
  const player = {
    showBubble: false, bubbleText: "",
    groundContacts: 0, isOnGround: false,
    // 🎯 纯视觉 NPC（假 body）没有碰撞传感器，isOnGround 始终视为 true（站在地面上，影子正常）
    ...(options.player !== 1 ? { groundContacts: 1, isOnGround: true } : {}),
    data: options, char: spine, view: spine.view, body,
    speed, zdSpeed, isDashing: false, playerH, playerW, spine,
    ticker: null, active: true, scale,
    damageFilter: new ColorMatrixFilter(), damageTimer: null,
    shadow,
    groundFixedY,
    shadowScale,
    shadowAlpha,
    shadowData: null,
    _damageTextStack: 0, // 伤害数字堆叠计数器，防止多个数字重合
    // 🔥 受击位移抖动偏移（px）：view 每帧被 worker lerp 更新，直接抖 view 会被覆盖，
    //    所以抖这个偏移量，在 view 位置更新处叠加（_playHitShake 里 gsap 驱动）
    _shakeOffsetX: 0,
    _shakeOffsetY: 0,

    takeDamage(damage = 1, options = {}, playerAttack = 1) {
      if (!this.active) return
      const { type = 'normal', isCritical = false } = options;

      this.data.data.hp -= damage
      user.pixi.player.juese.hp -= damage
      // 🔥 受击震动效果（内部异常不阻断闪白/飘字）
      try { this._playHitShake(); } catch (e) { /* 忽略，动画异常不影响伤害表现 */ }

      // 原有闪白滤镜逻辑不变
      if (this.damageTimer) clearTimeout(this.damageTimer)
      this.view.filters = [...(this.view.filters || []), globalDamageFilter]
      this.damageTimer = setTimeout(() => {
        this.view.filters = this.view.filters?.filter(f => f !== globalDamageFilter) || []
        this.damageTimer = null
      }, 100)
      applyDamageFilter(this.view, this.damageFilter, damage, this.data.data.maxHp);
      this._spawnDamageText(damage, type, isCritical, playerAttack);
      if (this.data.data.hp <= 0) this.deactivate();
    },

    // 🔥 受击震动效果
    _playHitShake() {
      // 🎯 玩家出牌回合（玩家行动阶段）受伤不播 shoushang 动画，避免打断出牌表现；敌人回合正常播
      if (!this.spine) return;
      if (!isPlayerTurn()) {
        // 受击播完，自动切回战斗
        this.spine.playshoushang(() => {
          this.spine.playFight(0.75);
        });
      }

      // 🔥 受击位移抖动：gsap 驱动 _shakeOffsetX/Y（view 更新处叠加），来回抖动后归零
      if (this._shakeTween) {
        this._shakeTween.kill();
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
      }
      const shakeDistance = 8;   // 水平震动距离（px）
      this._shakeTween = gsap.timeline({
        onComplete: () => {
          this._shakeOffsetX = 0;
          this._shakeOffsetY = 0;
          this._shakeTween = null;
        }
      })
        .to(this, { _shakeOffsetX: shakeDistance, _shakeOffsetY: 2, duration: 0.04, ease: 'power2.in' })
        .to(this, { _shakeOffsetX: -shakeDistance, _shakeOffsetY: -2, duration: 0.07, ease: 'power2.out' })
        .to(this, { _shakeOffsetX: shakeDistance * 0.6, _shakeOffsetY: 1, duration: 0.05, ease: 'power2.in' })
        .to(this, { _shakeOffsetX: 0, _shakeOffsetY: 0, duration: 0.05, ease: 'power2.out' });
    },
    _spawnDamageText(value, type = 'normal', isCritical = false, playerAttack = 0) {
      const activeType = DAMAGE_COLOR_MAP[type] ? type : 'normal';
      const textColor = DAMAGE_COLOR_MAP[activeType][isCritical ? 'critical' : 'normal'];

      let scaleRatio = 1;
      if (playerAttack > 0) {
        const damageRatio = value / playerAttack;
        scaleRatio = 0.8 + Math.min(damageRatio * 0.4, 0.7);
      }
      if (isCritical) scaleRatio *= 1.2;

      const baseFontSize = vh(1.6);
      const finalFontSize = Math.max(12, Math.min(28, Math.round(baseFontSize * scaleRatio)));
      const damageText = new Text({
        // ✅ 唯一修改：自动区分正负号，恢复显示+，伤害显示-
        // 最多保留两位小数（整数不带 .00）
        text: `${['heal', 'mp'].includes(type) ? '+' : '-'}${+Math.max(value, 0).toFixed(2)}`,
        style: {
          fill: textColor,
          fontSize: finalFontSize,
          fontWeight: isCritical ? '900' : 'bold',
          stroke: {
            color: '#000000',
            width: Math.max(2, Math.floor(finalFontSize / 7)),
          },
          fontFamily: 'Arial Black',
          resolution: window.devicePixelRatio || 2,
        }
      });

      // 后面的位置、动画、层级逻辑 完全复用，一点不用改
      damageText.anchor.set(0.5);
      // ✅ 伤害数字堆叠偏移：每个新数字往上偏移，避免重合
      const stackOffset = this._damageTextStack * vh(1.5);
      // 水平随机偏移加大，避免完全重叠
      // 🎯 整体往左偏一点（玩家受伤数字更贴近角色身体左侧，与敌人受击表现一致）
      damageText.x = this.view.x + (Math.random() - 0.5) * (finalFontSize * 3);
      // 往上堆叠，新的在上面
      damageText.y = this.view.y - this.view.height / 2 - vh(0.5) - stackOffset;
      // 堆叠计数+1
      this._damageTextStack++;
      damageText.alpha = 1;
      damageText.scale.set(1);
      damageText.zIndex = 999;
      damageText.blendMode = 'normal';

      const parent = this.view.parent;
      parent?.addChild(damageText);
      // ✅ worldContainer.sortableChildren = true，zIndex 自动排序

      gsap.timeline()
        .to(damageText, {
          scale: isCritical ? 1.2 : 1.1,
          duration: 0.15,
          ease: 'power3.out'
        })
        .to(damageText, {
          y: damageText.y - vh(3.5),
          duration: 0.5,
          ease: 'power1.out',
        }, '<')
        .to(damageText, {
          alpha: 0,
          duration: 0.2,
          ease: 'power1.out',
        }, '>')
        .call(() => {
          // 动画结束，堆叠计数-1
          this._damageTextStack = Math.max(0, this._damageTextStack - 1);
          damageText.destroy({ children: true });
        }, null, '>');
    },
    takeHeal(value, type = 'heal', isCritical = false) {
      if (!this.active) return;

      // 1. 实际加数值
      if (type === 'heal') {
        // 回血，不超过最大血量
        this.data.data.hp = Math.min(this.data.data.maxHp, this.data.data.hp + value);
      } else if (type === 'mp') {
        // 回灵力，不超过最大灵力
        this.data.data.mp = Math.min(this.data.data.maxMp, this.data.data.mp + value);
      }
      // 3. ✅ 直接复用飘字逻辑，不用写重复代码
      this._spawnDamageText(value, type, isCritical);
    },
    // ✅ Buff文字排队：短时间内连续调用时排队，每0.15秒最多触发一个
    _buffQueue: [],       // 待显示的buff名称队列
    _buffProcessing: false, // 是否正在处理队列中的buff

    showBuffText(buffName) {
      if (!this.active) return;

      // 推入队列（显示前统一英文化；查不到映射回退原文）
      this._buffQueue.push(tr(buffName));
      // 如果当前没有在处理，立即开始处理
      if (!this._buffProcessing) {
        this._processBuffQueue();
      }
    },

    _processBuffQueue() {
      if (this._buffQueue.length === 0 || !this.active) {
        this._buffProcessing = false;
        return;
      }

      this._buffProcessing = true;
      const buffName = this._buffQueue.shift();

      const color = BUFF_COLOR_MAP[buffName]?.color || BUFF_COLOR_MAP['减益'].color;
      const finalFontSize = Math.max(6, Math.min(16, Math.round(vh(0.8))));
      const buffText = new Text({
        text: buffName,
        style: {
          fill: color,
          fontSize: finalFontSize,
          fontWeight: 'bold',
          stroke: { color: '#000000', width: Math.max(2, Math.floor(finalFontSize / 7)) },
          fontFamily: 'Arial Black',
          resolution: window.devicePixelRatio || 2,
        }
      });

      buffText.anchor.set(0.5);
      // ✅ 方案1：直接大范围随机，保证两个buff不会在同一个位置
      buffText.x = this.view.x + (Math.random() - 0.5) * 40;  // ±40 大范围随机
      buffText.y = (this.view.y + 2 * VH) - this.view.height / 2 - vh(0.5) + (Math.random() - 0.5) * 40;
      buffText.alpha = 1;
      buffText.scale.set(1);
      buffText.zIndex = 120;
      buffText.blendMode = 'normal';

      const parent = this.view.parent;
      parent?.addChild(buffText);
      // ✅ worldContainer.sortableChildren = true，zIndex 自动排序

      gsap.timeline()
        .to(buffText, { scale: 1.1, duration: 0.15, ease: 'power3.out' })
        .to(buffText, { y: buffText.y - vh(3.5), duration: 0.5, ease: 'power1.out' }, '<')
        .to(buffText, { alpha: 0, duration: 0.2, ease: 'power1.out' }, '>')
        .call(() => buffText.destroy({ children: true }))
        // ✅ 缩放动画完成后立即播放下一个buff（重叠播放，不等当前完全结束）
        .call(() => {
          this._processBuffQueue();
        }, null, 0.15);
    },
    updateMotion(left, right, isOnGround) {
      if (!this.active) return;
      this.isOnGround = isOnGround;

      // 朝向：用输入方向（玩家按哪边看哪边）
      let vx = 0;
      if (left) vx = -1;
      if (right) vx = 1;

      // 🎯 动画 run/idle 判定：用「累计位移」判断是否真的在移动（最可靠）
      //    玩家贴障碍物边缘持续按方向键时：
      //      - 单帧 velocity.x 会因碰撞解算在 0 附近震荡 → 用 velocity 判会疯狂切换
      //      - 用「累计位移」：累积最近几帧的水平位移，超过阈值才算移动
      //        被墙挡住时位置几乎不动 → 累计位移 ≈ 0 → 稳定 idle
      //        正常行走时位置持续前进 → 累计位移稳定增长 → 稳定 run
      //    滞回：进入移动需累计位移 > 3px，退出需 < 1px（中间保持当前状态）
      const curX = this.body?.position?.x ?? 0;
      const lastX = this._animLastX ?? curX;
      const deltaX = curX - lastX;
      this._animLastX = curX;

      // 累计最近 6 帧的位移（环形缓冲）
      if (!this._animDxBuffer) this._animDxBuffer = [];
      const buf = this._animDxBuffer;
      buf.push(deltaX);
      if (buf.length > 6) buf.shift();
      // 累计位移 = 缓冲内各帧位移的代数和（朝同一方向前进会累加；抖动正负抵消）
      const accumulated = buf.reduce((s, d) => s + d, 0);

      // 滞回判断
      const wasMoving = !!this._isMovingAnim;
      let isMoving = wasMoving;
      const absAccum = Math.abs(accumulated);
      if (!wasMoving && absAccum > 3) isMoving = true;        // 进入移动
      else if (wasMoving && absAccum < 1) isMoving = false;   // 退出移动（静止）
      this._isMovingAnim = isMoving;

      const vy = this.body.velocity.y;

      // 🎯 离地距离（px）：脚底离「地形地面」多远，> 阈值才算腾空（斜坡/抖动不会误触发）
      //    高度图地图用 getGroundYAt 精确算；没有高度图时用碰撞的 isOnGround 兜底
      let airGap = 0;
      if (currentHeightMapId) {
        let gY = getGroundYAt(currentHeightMapId, this.body.position.x);
        if (gY == null) gY = currentGroundY * VH; // 该列无地面（悬崖）→ 用基准地面
        if (gY != null) {
          const halfH = (this.playerH || 20) / 2;
          airGap = gY - (this.body.position.y + halfH); // 正 = 脚底离地面多高
        }
      } else {
        airGap = isOnGround ? 0 : 999; // 非高度图：离地与否看碰撞 isOnGround
      }

      // 战斗状态锁定fight动画
      if (!user.pixi.fight) {
        updatePlayerAnimation(this.spine, isOnGround, isMoving ? 1 : 0, vy, airGap);
      }
      updatePlayerDirection(this.spine, vx);

      // 影子逻辑不动（未创建影子的 NPC 跳过）
      if (this.shadowData && this.shadow) {
        this.shadow.x = this.shadowData.x;
        this.shadow.y = this.shadowData.y;
        this.shadow.scale.set(this.shadowData.scale);
        this.shadow.alpha = this.shadowData.alpha;
      }
    },
    npcAIUpdate(playerTarget) {
      if (!this.active || !playerTarget?.body) return;

      const vx = this.body.velocity.x;
      const absVX = Math.abs(vx);
      this.updateMotion(vx, this.isOnGround, absVX, this.body.velocity.y);

      // ========== 新增：红色调试框跟随物理刚体 ==========
      // if (npc.debugRect) {
      //   npc.debugRect.x = this.body.position.x;
      //   npc.debugRect.y = this.body.position.y;
      // }
    },

    deactivate() {
      if (options.player === 2) {
        this.active = false;
        this.view.visible = false;
        this.view.renderable = false;
        if (this.shadow) {
          this.shadow.visible = false;
          this.shadow.renderable = false;
        }

        this.body.collisionFilter.mask = COLLISION_GROUPS.OBSTACLE;
        if (this.damageTimer) clearTimeout(this.damageTimer);
        this.shadowAlpha = 0;
        if (this.shadow) this.shadow.alpha = this.shadowAlpha;
      }
    },

  };

  body.gameObject = player;
  return player;
}
let WallScale;
let bgContainer;
let spineBgContainer; // spine 动态背景容器（独立于静态背景）
let spineFgContainer; // spine 高层前景容器（z-index 更高，在玩家上层）
let farBgContainer; // 远景背景容器（最底层，视差最慢）
let allBgContainer; // 所有背景的父容器，用于统一应用滤镜
let heightMapDebugContainer; // 🗺️ 黑白碰撞图调试叠层（可开关，放在背景之上、角色之下）
let currentHeightMapDebugIds = []; // 当前已渲染的黑白图纹理名（用于复用判断）
// 🌉 高层 Spine 前景容器（位于角色之上，用于遮挡人物的前景；不参与地图宽度计算）
let spineFrontContainer;

const wuti = new Map();
let viewport;
let cameraTarget;

/**
 * 创建 Spine 障碍物（视觉=Spine 骨骼动画，物理=矩形碰撞体）
 * 由 createRectFromData 在 rectData.spineSkel 存在时调用，不走对象池
 * @param {Object} rectData - 障碍物数据（含 spineSkel/spineAtlas/spineAnimation/spineSkin/spineScale 等）
 * @param {number} index - 索引（用于命名）
 * @param {string} mapId - 所属地图ID（存入 wuti）
 * @returns {Object} 兼容 wuti 的对象 { view, spine, body, active, reset, destroy }
 */
function createSpineRectObstacle(rectData, index, mapId) {
  const x = rectData.x;
  const y = rectData.y;
  const w = rectData.w;
  const h = rectData.h;

  // ---------- 视觉：Spine ----------
  const view = new Container();
  let spine = null;
  try {
    spine = new Spine({
      skeleton: rectData.spineSkel,
      atlas: rectData.spineAtlas || rectData.spineSkel.replace('_skel', '_atlas'),
      allowMissingRegions: true,
    });
    // 防御性检查：skeleton 数据不存在则回退纯碰撞（无视觉）
    if (!spine.skeleton) {
      console.warn('[SpineObstacle] skeleton 数据未找到:', rectData.spineSkel);
      spine = null;
    }
    // 禁止 Spine 物理约束继承容器位移/旋转（镜头移动不影响骨骼）
    if (spine && typeof spine.setPhysicsPositionInheritanceFactor === 'function') {
      spine.setPhysicsPositionInheritanceFactor(0, 0);
    }
    if (spine && spine.physicsRotationInheritanceFactor !== undefined) {
      spine.physicsRotationInheritanceFactor = 0;
    }
  } catch (e) {
    console.error('[SpineObstacle] Spine 创建失败:', e);
    spine = null;
  }

  // 渲染优化设置（与主世界 NPC/背景一致，防止被裁剪/批量渲染异常）
  if (spine) {
    spine.batchable = true;
    spine.alphaCutoff = 0.1;
  }
  view.cullable = false;
  view.cullableChildren = false;

  // 皮肤（可选）
  let appliedSkin = null;
  if (spine && rectData.spineSkin) {
    try {
      const skins = spine.skeleton.data.skins || [];
      const target = skins.find(s => s.name === rectData.spineSkin);
      if (target) {
        spine.skeleton.setSkin(target);
        appliedSkin = target;
      }
    } catch (e) { }
  }
  if (spine && !appliedSkin) {
    // 未指定皮肤 → 自动用第一个非 default 皮肤（很多骨骼默认皮肤是空的）
    try {
      const skins = spine.skeleton.data.skins || [];
      const realSkins = skins.filter(v => v.name !== "default");
      if (realSkins.length > 0) spine.skeleton.setSkin(realSkins[0]);
    } catch (e) { }
  }

  // 缩放：默认让 Spine 完全贴合矩形的 w × h 碰撞盒（等比缩放，宽度贴合 w、高度不超 h）
  // 用户想图片贴合矩形大小 → 用这个自动缩放；也保留 spineScale 手动微调
  let fittedScale = 1;
  if (spine) {
    try {
      // 先播放动画 + update 一帧，让 bounds 反映真实显示尺寸（setup pose 空的话 bounds 为 0）
      spine.state.clearTracks?.();
      const animations = spine.skeleton.data.animations || [];
      const animName = rectData.spineAnimation || (animations.length > 0 ? animations[0].name : null);
      if (animName) spine.state.setAnimation(0, animName, rectData.spineLoop !== false);
      spine.update(0.05);
      const b = spine.getBounds();
      const rawW = b.width;
      const rawH = b.height;
      if (isFinite(rawW) && isFinite(rawH) && rawW > 0 && rawH > 0) {
        // 等比缩放：宽度贴合 w（若 w 有效），同时限制高度不超出 h
        let s = 1;
        if (w > 0) s = Math.min(s, w / rawW);
        if (h > 0) s = Math.min(s, h / rawH);
        fittedScale = s;
      }
    } catch (e) { }
    // spineScale 作为手动微调倍数（默认 1）
    const manual = rectData.spineScale || 1;
    spine.scale.set(fittedScale * manual);
  }

  // 定位：底部中心对齐到 (x, y)
  if (spine) {
    // ⚠️ 先不设 position，先获取「局部」bounds 计算底部偏移：
    //    getBounds() 返回的是包含 position 的世界包围盒，若先 set(position) 再减会把它移走（看不见）。
    //    正确做法：spine 在原点时取 bounds，得到"从原点到底部的距离"，再设 y = y - bottomOffset。
    // ⚠️ 必须先手动 update 一帧再取 bounds：部分骨骼（如 ceshispine）setup pose 是空的，
    //    内容完全由 animation 动画驱动，不 update 的话 getBounds() 返回 0（对齐会乱/看不到）。
    //    有动画则播放一帧后取；没动画也用 setup pose 计算一次，保证 bounds 有效。
    let bottomOffset = 0;
    try {
      spine.update(0.05);
      const bounds = spine.getBounds();
      if (isFinite(bounds.y) && isFinite(bounds.height) && bounds.height > 0) {
        bottomOffset = bounds.y + bounds.height;
      }
    } catch (e) { }
    spine.__bottomOffset = bottomOffset; // 存供 reset 重新定位用
    spine.x = x;
    spine.y = y - bottomOffset; // 底部对齐到 y
    spine.zIndex = rectData.zIndex ?? 0;
    view.addChild(spine);
    view.position.set(0, 0);
  }

  view.zIndex = rectData.zIndex ?? 0;
  worldContainer.addChild(view);

  // ---------- 物理：矩形碰撞体 ----------
  let body = null;
  if (rectData.withBody !== false) {
    body = Matter.Bodies.rectangle(
      x,
      y - h / 2, // 底部 y → 物理中心 y
      w,
      h,
      {
        isStatic: !(rectData.isStatic === false),
        isSensor: rectData.isSensor,
        inertia: Infinity,
        // 🎯 摩擦：与玩家一致用 0（玩家移动靠 setVelocity 代码控制，不依赖物理摩擦）。
        //    Matter 实际摩擦 = min(两碰撞体摩擦)，统一 0 保证贴墙跳不被向下静摩擦拉住。
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        density: undefined,
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask:
            COLLISION_GROUPS.FRIEND |
            COLLISION_GROUPS.ENEMY |
            COLLISION_GROUPS.OBSTACLE |
            COLLISION_GROUPS.BULLET |
            COLLISION_GROUPS.SENSOR,
        },
        label: rectData.label || null,
      }
    );
    body._triggered = false;
    body.view = view;
    Matter.World.add(world, body);
  }

  // ---------- GameObject（兼容 wuti 清理） ----------
  const obj = {
    view,
    spine,
    body,
    active: true,
    ticker: null,
    name: "矩形" + index,

    reset(nx, ny) {
      view.position.set(nx, ny);
      if (spine) spine.position.set(nx, ny - (spine.__bottomOffset || 0));
      if (body) {
        Matter.Body.setPosition(body, { x: nx, y: ny - h / 2 });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngle(body, 0);
      }
    },

    destroy() {
      if (this.ticker) {
        app.ticker.remove(this.ticker);
        this.ticker = null;
      }
      if (this.body) {
        Matter.World.remove(world, this.body);
        this.body = null;
      }
      if (this.view?.parent) {
        this.view.parent.removeChild(this.view);
      }
      if (this.spine) {
        try { this.spine.destroy({ children: true, texture: false }); } catch (e) { }
        this.spine = null;
      }
      try { view.destroy({ children: true }); } catch (e) { }
    },
  };

  return obj;
}

function createRectFromData(rectData, index, name, mapId) {
  let rect;
  if (name === "矩形") {
    // 🦴 Spine 障碍物：rectData.spineSkel 存在时视觉用 Spine（不走对象池的 Sprite/Graphics）
    if (rectData.spineSkel) {
      rect = createSpineRectObstacle(rectData, index, mapId);
    } else {
      rect = rectPool.acquire(rectData.x, rectData.y, rectData.w, rectData.h, {
        color: rectData.color, zIndex: rectData.zIndex, withBody: rectData.withBody,
        isSensor: rectData.isSensor, isStatic: rectData.isStatic, label: rectData.label, create: rectData.create, enableAABB: rectData.enableAABB,
      }, world, worldContainer, COLLISION_GROUPS);
    }
  } else if (name === "三角形") {
    rect = trianglePool.acquire(rectData.x, rectData.y, rectData.w, rectData.h, {
      color: rectData.color, zIndex: rectData.zIndex, withBody: rectData.withBody,
      isSensor: rectData.isSensor, isStatic: rectData.isStatic, label: rectData.label, create: rectData.create,
    }, world, worldContainer, COLLISION_GROUPS);
  } else if (name === "圆形") {
    rect = circlePool.acquire(rectData.x, rectData.y, rectData.r, {
      color: rectData.color, zIndex: rectData.zIndex, withBody: rectData.withBody,
      isSensor: rectData.isSensor, isStatic: rectData.isStatic, label: rectData.label, create: rectData.create,
    }, world, worldContainer, COLLISION_GROUPS);
  } else if (name === "问号互动") {
    rect = wenhaoHudong(rectData.x, rectData.y, rectData.w, rectData.h, {
      textureName: rectData.textureName, show: rectData.show,
      wuxian: rectData.wuxian, isFloatEnable: rectData.isFloatEnable,
      scale: rectData.scale,
      detectWidth: rectData.detectWidth,
      onlyXDetect: rectData.onlyXDetect,
      clickData: rectData.clickData,
      onClick: rectData.onClick,
      wenhaoId: rectData.id,
      mapId: mapId,
      followNpcId: rectData.followNpcId,
      followOffsetY: rectData.followOffsetY,
    }, WallScale, hudMarkContainer, Assets, Sprite);

    return;
  }
  rect.name = name + index;
  if (!wuti.has(mapId)) wuti.set(mapId, []);
  wuti.get(mapId).push(rect);
}

// 视差滚动系数（越大移动越慢，景深效果越强）
const PARALLAX_FAR_BG = 0.5;  // 远景背景视差系数（更大=移动更慢）
// 当前远景的地图偏移量（用于视差滚动对齐）
let currentFarBgOffsetX = 0;
// 🎥 自由视角时冻结的远景位置（自由视角下远景不跟随镜头移动）
let _farBgFrozenX = 0;

/**
 * 创建单张地图的远景背景和 Spine 动态背景
 * @param {Object} mapData - 地图数据对象
 */

// ====== 远景背景全局单例（场景复用，同一张远景图多张地图共享） ======
let currentFarBgImages = null;  // 当前远景背景的图片标识
let currentFarBgTopImages = []; // 当前顶部延伸图的图片标识（仅显式配置 farTopImages 时有值，否则空数组）

/**
 * 更新远景背景（全局单例，切换地图时调用）
 * 相同远景图自动复用，不重复创建；不同则切换
 * @param {Object} mapData - 地图数据对象
 */
let farWallPiece;
function updateFarBackground(mapData) {
  const farImages = mapData.farBackgroundImages;
  // 🏔️ 顶部延伸图：仅当显式配置 farTopImages 时才渲染独立的顶部延伸层；
  //    ⚠️ 全局规则：未配置 farTopImages 不再默认复用远景主体图（farBackgroundImages），
  //       避免出现多余的“第二层”背景图
  const farTopImages = (Array.isArray(mapData.farTopImages) && mapData.farTopImages.length > 0)
    ? mapData.farTopImages : [];

  // 判断图片是否相同（相同则复用，不重新创建；主体 + 顶部图都一致才复用）
  const sameList = (a, b) => !!a && !!b && a.length === b.length && a.every((img, i) => img === b[i]);
  const isSame = sameList(currentFarBgImages, farImages) && sameList(currentFarBgTopImages, farTopImages);

  if (isSame && farWallPiece) {
    //console.log('🔄 远景背景相同，复用当前远景:', farImages);
    farWallPiece.x = mapData.offsetX;
    // 更新当前偏移量，用于视差滚动对齐
    currentFarBgOffsetX = mapData.offsetX;
    // 手动更新一次视差位置（确保切换地图时立即对齐）
    // 🎥 自由视角下切图：只更新冻结基准，不真正移动远景
    farBgContainer.x = PARALLAX_FAR_BG * (viewport.left - currentFarBgOffsetX);
    if (isFreeCamera.value) _farBgFrozenX = farBgContainer.x;
    return;
  }

  // 清空旧的远景
  while (farBgContainer.children.length > 0) {
    const child = farBgContainer.removeChildAt(0);
    if (child.destroy) child.destroy({ children: true });
  }
  farWallPiece = null;

  // 创建新的远景
  if (farImages && farImages.length > 0) {
    const farBgData = BgWall(Assets, farImages);
    if (farBgData.WallTextures.length > 0) {
      farWallPiece = createWallObject(farBgData.WallScale, farBgData.WallTextures, Sprite, Container);
      // 远景和地图对齐（世界坐标，和静态背景一样）
      farWallPiece.x = mapData.offsetX;
      farBgContainer.addChild(farWallPiece);
      // 🏔️ 顶部延伸层（世界 y<0 区域，底部对齐 y=0 向上延伸，与主体同容器 → 同视差滚动）：
      //    仅当显式配置 farTopImages 时才渲染；未配置则不渲染（不再默认复用主体图补顶）
      if (farTopImages.length > 0) {
        const farTopData = BgWall(Assets, farTopImages);
        if (farTopData.WallTextures.length > 0) {
          const farTopPiece = createWallObject(farTopData.WallScale, farTopData.WallTextures, Sprite, Container, { alignTop: true });
          farTopPiece.x = mapData.offsetX;
          farTopPiece.y = 1; // 🏔️ 往下 2px 与主体拼合（消除接缝）
          farBgContainer.addChild(farTopPiece);
        }
      }
      // 更新当前偏移量，用于视差滚动对齐
      currentFarBgOffsetX = mapData.offsetX;
      // 手动更新一次视差位置
      farBgContainer.x = PARALLAX_FAR_BG * (viewport.left - currentFarBgOffsetX);
      // 🎥 自由视角下切图：冻结远景到新位置
      if (isFreeCamera.value) _farBgFrozenX = farBgContainer.x;
      // console.log('✅ 远景背景已更新，图片:', farImages, '位置:', mapData.offsetX);
      // 只有成功创建时才设置当前图片标识
      currentFarBgImages = [...farImages];
      currentFarBgTopImages = [...farTopImages];
    } else {
      console.warn('⚠️ 远景资源未加载，无法创建远景背景');
      // 创建失败，重置状态
      currentFarBgImages = null;
      currentFarBgTopImages = [];
      currentFarBgOffsetX = 0;
    }
  } else {
    // console.log('ℹ️ 该地图无远景背景配置');
    currentFarBgImages = null;
    currentFarBgTopImages = [];
    currentFarBgOffsetX = 0;
  }

  if (farWallPiece) {
    // console.log('farWallPiece.1x=', farWallPiece.x);
  }
}

// ====== 静态背景（bgContainer）更新：切图时清空旧的，只保留当前地图的 backgroundImages ======
/**
 * 更新静态背景（全局单例，切换地图时调用）
 * 清空 bgContainer 里所有旧的墙图，只按当前地图的 backgroundImages 重建一张 wallPiece
 * 这样上一张地图的背景图不会残留，也避免多张墙图叠加造成性能浪费
 * @param {Object} mapData - 地图数据对象
 */
function updateStaticBackground(mapData) {
  // 清空旧的所有静态背景墙图（含所有地图叠加的残留）
  while (bgContainer.children.length > 0) {
    const child = bgContainer.removeChildAt(0);
    // 🗺️ Tiled 地图容器是全局缓存的（跨地图复用），只移出不销毁
    if (child._tiledMapReuse) continue;
    if (child.destroy) child.destroy({ children: true });
  }

  // 🗺️ Tiled 导入：用 pixi-tiledmap 渲染地图（边界/碰撞已由 tiledMap.js 自动生成，不再用 backgroundImages）
  if (mapData.tiled) {
    const tiledAsset = getTiledMapCached(mapData.tiled.url);
    if (tiledAsset) {
      const ws = mapData.tiledScale ?? (window.innerHeight / 1080);
      const cont = tiledAsset.container;
      // 🐛 兜底保护：读档重挂时缓存容器可能已被 app.destroy 销毁（destroyed=true、scale=null），
      //    直接对已销毁容器调用 .scale.set 会报 "Cannot read properties of null (reading 'set')"
      //    （ensureTiledMap 已负责重建缓存，这里再兜一层防未预加载路径）
      if (!cont || cont.destroyed) {
        console.warn('[Tiled] 跳过已销毁的地图容器', mapData.tiled.url);
      } else {
        cont._tiledMapReuse = true; // 标记：全局复用
        cont.scale.set(ws);
        // 🎯 底部锚点：pivot 设在容器左下角（本地坐标 = 显示高度 / scale），position.y=100VH 定位地图底部（固定地面线），
        //    地图可在 Tiled 里任意向上加高（顶部长高），底部地面与世界位置始终保持固定
        cont.pivot.set(0, cont.height / cont.scale.y);
        cont.position.set(mapData.offsetX ?? 0, 100 * VH);
        bgContainer.addChild(cont);
        WallScale = ws;
      }
    }
  } else {
    // 按当前地图背景重建 wallPiece
    const bgData = BgWall(Assets, mapData.backgroundImages);
    if (bgData.WallTextures.length > 0) {
      const wallPiece = createWallObject(bgData.WallScale, bgData.WallTextures, Sprite, Container);
      wallPiece.x = mapData.offsetX;
      bgContainer.addChild(wallPiece);
    }

    // 🏔️ 顶部边界额外图片（topImages）：在世界 y<0 区域渲染（底部对齐 y=0 向上延伸），
    //    用于没有图片背景的地图（如 desert_01 用 Spine 背景）在边界上方补图防穿帮
    if (Array.isArray(mapData.topImages) && mapData.topImages.length > 0) {
      const topData = BgWall(Assets, mapData.topImages);
      if (topData.WallTextures.length > 0) {
        const topPiece = createWallObject(topData.WallScale, topData.WallTextures, Sprite, Container, { alignTop: true });
        topPiece.x = mapData.offsetX;
        bgContainer.addChild(topPiece);
      }
    }
    // 记录当前 WallScale（供其他模块使用，如问号标记缩放）
    WallScale = bgData.WallScale;
  }

  // 🗺️ 黑白碰撞图调试叠层：跟随当前地图的 heightMapImages 重建（可开关）
  updateHeightMapDebugLayer(mapData);
}

/**
 * 🗺️ 渲染/更新黑白碰撞图调试叠层（半透明叠加在背景上，对照地形用）
 * 有 heightMapImages 才渲染；无则清空。显隐由 heightMapDebugVisible 控制。
 * @param {Object} mapData - 当前地图数据
 */
function updateHeightMapDebugLayer(mapData) {
  if (!heightMapDebugContainer) return;
  // 清空旧的
  while (heightMapDebugContainer.children.length > 0) {
    const child = heightMapDebugContainer.removeChildAt(0);
    if (child.destroy) child.destroy({ children: true });
  }
  currentHeightMapDebugIds = [];

  const texNames = mapData?.heightMapImages || [];
  if (texNames.length === 0) return;

  // 复用 createWallObject 同款平铺逻辑渲染黑白图（sprite 按 WallScale 缩放、从左到右拼接）
  const debugData = BgWall(Assets, texNames);
  if (debugData.WallTextures.length > 0) {
    const debugPiece = createWallObject(debugData.WallScale, debugData.WallTextures, Sprite, Container);
    debugPiece.x = mapData.offsetX ?? 0;
    // 半透明，方便对照背景
    debugPiece.alpha = 0.55;
    // 黑白图叠层放在角色之下（zIndex 低）
    debugPiece.zIndex = 0;
    heightMapDebugContainer.addChild(debugPiece);
    currentHeightMapDebugIds = [...texNames];
  }

  // 显隐跟随开关
  heightMapDebugContainer.visible = heightMapDebugVisible.value;
}

// ====== Spine 动态背景全局单例（场景复用） ======
let currentSpineBgConfig = null;  // 当前 Spine 背景的配置标识
let currentSpineFgConfig = null;  // 当前高层 Spine 的配置标识

/**
 * 更新 Spine 动态背景（全局单例，切换地图时调用）
 * 相同配置自动复用，不重复创建；不同则切换
 * @param {Object} mapData - 地图数据对象
 */
function updateSpineBackground(mapData) {
  const spineConfig = mapData.spineBackground;

  // 判断配置是否相同（相同则复用，只更新位置）
  const isSame = currentSpineBgConfig && spineConfig &&
    currentSpineBgConfig.skelName === spineConfig.skelName &&
    currentSpineBgConfig.atlasName === spineConfig.atlasName &&
    currentSpineBgConfig.animationName === spineConfig.animationName;

  if (isSame) {
    // console.log('🔄 Spine 动态背景相同，复用当前 Spine:', spineConfig.skelName);
    // 复用同一个 Spine 实例，只更新位置（和当前地图对齐）
    if (spineBgContainer.children.length > 0) {
      const spineView = spineBgContainer.children[0];
      spineView.x = mapData.offsetX + mapData.realWidth / 2;
    }
    return;
  }

  // 清空旧的 Spine 背景
  while (spineBgContainer.children.length > 0) {
    const child = spineBgContainer.removeChildAt(0);
    if (child.destroy) child.destroy({ children: true });
  }

  // 创建新的 Spine 背景
  if (spineConfig) {
    const bgData = BgWall(Assets, mapData.backgroundImages);
    const bgHeight = bgData.WallTextures.length > 0
      ? bgData.WallTextures[0].height * bgData.WallScale
      : window.innerHeight;

    const bgSpine = createBgSpine(
      bgData.WallScale,
      bgHeight,
      spineConfig.skelName,
      spineConfig.atlasName,
      spineConfig.animationName,
      Container,
      app
    );

    if (bgSpine.spine) {
      // Spine 背景和地图对齐（世界坐标）
      bgSpine.view.x = mapData.offsetX + mapData.realWidth / 2;
      bgSpine.setGroundY(window.innerHeight);
      spineBgContainer.addChild(bgSpine.view);
      // console.log('✅ Spine 动态背景创建成功:', spineConfig.skelName, '位置x=', bgSpine.view.x);
    } else {
      console.warn('⚠️ Spine 动态背景创建失败:', spineConfig.skelName);
    }
  } else {
    // console.log('ℹ️ 该地图无 Spine 动态背景配置');
  }

  currentSpineBgConfig = spineConfig ? { ...spineConfig } : null;
}

// ====== 高层 Spine 前景（全局单例，在玩家上层显示） ======
/**
 * 更新高层 Spine 前景（全局单例，切换地图时调用）
 * 相同配置自动复用，不重复创建；不同则切换
 * 地图没有配置 spineForeground 则不渲染
 * @param {Object} mapData - 地图数据对象
 */
function updateSpineForeground(mapData) {
  const spineConfig = mapData.spineForeground;

  // 🎯 关键：有动态前景（spineForeground）时隐藏静态背景 bgContainer（backgroundImages），
  //    否则静态背景和动态前景会同时渲染（看起来重复）。没有动态前景时显示静态背景。
  //    注意：spineBgContainer（spineBackground 动态背景）不受影响，始终正常渲染。
  if (bgContainer) {
    bgContainer.visible = !spineConfig;
  }

  // 判断配置是否相同（相同则复用，只更新位置）
  const isSame = currentSpineFgConfig && spineConfig &&
    currentSpineFgConfig.skelName === spineConfig.skelName &&
    currentSpineFgConfig.atlasName === spineConfig.atlasName &&
    currentSpineFgConfig.animationName === spineConfig.animationName;

  if (isSame) {
    // console.log('🔄 高层 Spine 前景相同，复用当前 Spine:', spineConfig.skelName);
    // 复用同一个 Spine 实例，只更新位置（和当前地图对齐，用视觉中心居中消除左右空隙）
    if (spineFgContainer.children.length > 0) {
      const spineView = spineFgContainer.children[0];
      const centerX = mapData.offsetX + mapData.realWidth / 2;
      // 用已存在的 scaledBounds（存在则存到容器上）做视觉中心对齐
      const sb = spineView._scaledBounds || null;
      spineView.x = sb ? centerX - (sb.x + sb.width / 2) : centerX;
    }
    return;
  }

  // 清空旧的 Spine 前景
  while (spineFgContainer.children.length > 0) {
    const child = spineFgContainer.removeChildAt(0);
    if (child.destroy) child.destroy({ children: true });
  }

  // 创建新的 Spine 前景
  if (spineConfig) {
    try {
      const bgData = BgWall(Assets, mapData.backgroundImages);
      const bgHeight = bgData.WallTextures.length > 0
        ? bgData.WallTextures[0].height * bgData.WallScale
        : window.innerHeight;

      const fgSpine = createBgSpine(
        bgData.WallScale,
        bgHeight,
        spineConfig.skelName,
        spineConfig.atlasName,
        spineConfig.animationName,
        Container,
        app
      );

      if (fgSpine.spine) {
        // 🎯 视觉中心对齐地图中心（消除左右空隙）：
        //    view 原点 ≠ 骨骼视觉中心。骨骼自身有偏移（scaledBounds.x 可能是负值或有透明留白），
        //    若只设 view.x = 中心点，视觉内容会整体偏一侧/两侧留缝。
        //    正确做法：把 view.x 设为「中心点 - 骨骼视觉中心在 view 内的局部偏移」
        // 存下 scaledBounds 到 view 上，供 isSame 复用分支再次居中
        fgSpine.view._scaledBounds = fgSpine.scaledBounds || null
        const centerX = mapData.offsetX + mapData.realWidth / 2
        if (fgSpine.scaledBounds) {
          // 骨骼视觉中心在 view 局部坐标 = scaledBounds.x + scaledBounds.width/2
          // view.x + 视觉中心局部坐标 = 世界中心 → view.x = centerX - 视觉中心局部坐标
          const sb = fgSpine.scaledBounds
          fgSpine.view.x = centerX - (sb.x + sb.width / 2)
        } else {
          fgSpine.view.x = centerX
        }
        // 底部对齐到浏览器最底部（setGroundY 内部已用 bottomOffset 让骨骼底部贴到 groundY）
        fgSpine.setGroundY(window.innerHeight);
        spineFgContainer.addChild(fgSpine.view);

        // 🎯 地图可行走宽度 = 动态前景宽度（有 spineForeground 时以它为准）
        if (fgSpine.worldWidth > 0 && fgSpine.worldWidth !== mapData.realWidth) {
          mapData.realWidth = fgSpine.worldWidth;
          // 同步全局宽度 & 边界缓存（确保物理边界 / clamp 正确）
          if (mapData.id === currentMapId) {
            WORLD_WIDTH = fgSpine.worldWidth;
            MAP_BOUNDS = null;
          }
          // 重新按新宽度居中前景（视觉中心对齐）
          const newCenterX = mapData.offsetX + mapData.realWidth / 2
          if (fgSpine.scaledBounds) {
            const sb = fgSpine.scaledBounds
            fgSpine.view.x = newCenterX - (sb.x + sb.width / 2)
          } else {
            fgSpine.view.x = newCenterX
          }
        }
      } else {
        console.warn('⚠️ 高层 Spine 前景创建失败，资源可能未加载:', spineConfig.skelName);
      }
    } catch (e) {
      console.error('[SpineForeground] 创建出错:', e);
    }
  } else {
    // console.log('ℹ️ 该地图无高层 Spine 前景配置');
  }

  currentSpineFgConfig = spineConfig ? { ...spineConfig } : null;
}

// ====== 🌉 高层 Spine 前景（位于角色之上，遮挡人物） ======
// 与 spineForeground 的区别：
//   - 层级在「角色之上」（viewport 里 worldContainer 之后挂载）
//   - 不参与地图宽度计算（不改变 realWidth）
//   - 移动速度与场景一致（直接挂 viewport，随镜头平移，无视差）
/**
 * 更新高层 Spine 前景（全局单例，切换地图时调用）
 * 相同配置自动复用，不重复创建；不同则切换
 * 地图没有配置 spineFront 则不渲染
 * @param {Object} mapData - 地图数据对象
 */
let currentSpineFrontConfig = null; // 当前高层 Spine 前景（角色之上）的配置标识
function updateSpineFront(mapData) {
  const spineConfig = mapData.spineFront;

  // 判断配置是否相同（相同则复用，只更新位置）
  const isSame = currentSpineFrontConfig && spineConfig &&
    currentSpineFrontConfig.skelName === spineConfig.skelName &&
    currentSpineFrontConfig.atlasName === spineConfig.atlasName &&
    currentSpineFrontConfig.animationName === spineConfig.animationName;

  if (isSame) {
    if (spineFrontContainer.children.length > 0) {
      const spineView = spineFrontContainer.children[0];
      const centerX = mapData.offsetX + mapData.realWidth / 2;
      const sb = spineView._scaledBounds || null;
      spineView.x = sb ? centerX - (sb.x + sb.width / 2) : centerX;
    }
    return;
  }

  // 清空旧的
  while (spineFrontContainer.children.length > 0) {
    const child = spineFrontContainer.removeChildAt(0);
    if (child.destroy) child.destroy({ children: true });
  }

  // 创建新的
  if (spineConfig) {
    try {
      const bgData = BgWall(Assets, mapData.backgroundImages);
      const bgHeight = bgData.WallTextures.length > 0
        ? bgData.WallTextures[0].height * bgData.WallScale
        : window.innerHeight;

      const frontSpine = createBgSpine(
        bgData.WallScale,
        bgHeight,
        spineConfig.skelName,
        spineConfig.atlasName,
        spineConfig.animationName,
        Container,
        app
      );

      if (frontSpine.spine) {
        // 视觉中心对齐地图中心（消除左右空隙，同 spineForeground）
        frontSpine.view._scaledBounds = frontSpine.scaledBounds || null
        const centerX = mapData.offsetX + mapData.realWidth / 2
        if (frontSpine.scaledBounds) {
          const sb = frontSpine.scaledBounds
          frontSpine.view.x = centerX - (sb.x + sb.width / 2)
        } else {
          frontSpine.view.x = centerX
        }
        // 底部对齐到浏览器最底部
        frontSpine.setGroundY(window.innerHeight);
        spineFrontContainer.addChild(frontSpine.view);
        // console.log('✅ 高层 Spine 前景(角色之上)创建成功:', spineConfig.skelName);
      } else {
        console.warn('⚠️ 高层 Spine 前景(角色之上)创建失败，资源可能未加载:', spineConfig.skelName);
      }
    } catch (e) {
      console.error('[SpineFront] 创建出错:', e);
    }
  } else {
    // console.log('ℹ️ 该地图无高层 Spine 前景(角色之上)配置');
  }

  currentSpineFrontConfig = spineConfig ? { ...spineConfig } : null;
}

let currentGroundY;
// 🗺️ 当前地图高度图状态（由 heightMapImages 生成，供玩家/NPC 吸附落地）
let currentHeightMapId = null;   // 当前已构建高度图的地图 id
let joystick; // 定义 1 次
let defaultMap
let hudMarkContainer
onMounted(async () => {
  // 0. 自动读档（刷新页面恢复数据；手动档标记 or 自动存档）
  let saveData = null;
  if (user.hasAutoSave() || user.hasPendingLoadSlot()) {
    saveData = user.autoLoad();
    // 💾 读档成功轻提示（手动档/自动存档；新游戏无存档不提示）
    if (saveData) {
      setTimeout(() => { try { ElMessText(L('loadSuccess'), 'success'); } catch (e) { /* ignore */ } }, 1200);
    }
    // console.log('[matter] 自动读档完成', saveData);
  }

  user.pixi.activePlayer = null
  user.pixi.fight = false
  user.pixi.isPaused = false
  // 🛠 读档后重置 UI 状态：pixi.gameUi 会随存档持久化，若上次在面板/对话打开时退出，重载后
  //    主世界所有图标按钮会被 v-show="!gameUi" 隐藏；这里按对话状态恢复（与战斗结束恢复逻辑一致）
  user.pixi.gameUi = user.pixi.duihua ? true : false
  floatingMarks.length = 0;
  npcPool.length = 0;
  npcs.length = 0;

  // 1. 先加载初始地图资源（读档则加载存档地图，否则默认one01）
  const startMap = saveData?.currentMap || route.query.map || 'desert_01';
  // 🧭 旧存档兼容：one01/one02 地图已移除，映射到新默认地图 desert_01
  const mapAlias = { one01: 'desert_01', one02: 'desert_01' };
  const finalStartMap = mapAlias[startMap] || startMap;
  currentMapId = finalStartMap;
  user.pixi.currentMapId = finalStartMap;
  await loadMapInfo(startMap)
  customBattle()
  teleportByName()
  // 2. 创建 Pixi 应用
  app = await createApp(gameContainer.value);
  gameContainer.value.appendChild(app.canvas);
  window.__matterApp = app; // 暴露主游戏 app（供地牢返回时修复滤镜 BindGroup）
  // 静态背景组（不动的背景、地图）
  farBgContainer = new Container({ isRenderGroup: true });
  bgContainer = new Container({ isRenderGroup: true });
  // Spine 动态背景（每帧需更新动画，所以 isRenderGroup 让 Pixi 自动管理刷新）
  spineBgContainer = new Container({ isRenderGroup: true });
  // 所有背景的父容器，用于统一应用滤镜（本身不是渲染组，让滤镜生效）
  allBgContainer = new Container();
  // 🗺️ 黑白碰撞图调试叠层（渲染黑白图，对照地形；默认隐藏，可开关）
  heightMapDebugContainer = new Container({ isRenderGroup: true, sortableChildren: true });
  heightMapDebugContainer.visible = false;
  // 动态组（乱跑的玩家、NPC）—— 使用 zIndex 控制层级，需开启排序
  worldContainer = new Container({ isRenderGroup: true, sortableChildren: true });
  // 🧸 道具放置容器（纯视觉 Spine，无物理碰撞；zIndex 按世界 y 排序与角色穿插）
  propContainer = new Container({ isRenderGroup: true, sortableChildren: true });
  worldContainer.addChild(propContainer);
  cameraTarget = new Container();
  // HUD组（头顶问号、特效）
  hudMarkContainer = new Container({ isRenderGroup: true });
  hudMarkContainer.zIndex = 9999;
  // 高层 Spine 前景容器（在最上层）
  spineFgContainer = new Container({ isRenderGroup: true });
  // 🌉 高层 Spine 前景容器（位于角色之上，遮挡人物用；不参与地图宽度计算）
  spineFrontContainer = new Container({ isRenderGroup: true });

  // 4. 加载所有地图数据和背景
  const allMapIds = getAllMapIds();
  // 先保存存档中的地图数据（用于恢复TriggerAreaArr等修改）
  const savedMapDataList = user.pixi.mapDataList && user.pixi.mapDataList.length > 0
    ? [...user.pixi.mapDataList]
    : null;
  // 保存存档中的动态 NPC 数据（如对话创建的白朔，不在 map.js 静态定义里）
  const savedDynamicNpcs = user.pixi.npcDataList || [];
  user.pixi.npcDataList = [];
  user.pixi.mapDataList = [];
  // ⚠️ 不再把所有地图的墙图一次性塞进 bgContainer（避免背景残留/重复叠加）：
  //    现在只构建地图数据（算 realWidth）并记录 WallScale 初始值，
  //    具体静态背景由 updateStaticBackground 在 TpMap 切图时按需清空重建
  // 🗺️ 预加载所有 Tiled 导入的地图（tmj + 外部 tsx + 贴图），供 map.js 同步生成碰撞/边界
  const tiledUrls = getTiledMapUrls();
  if (tiledUrls.length > 0) {
    await Promise.all(tiledUrls.map(url =>
      ensureTiledMap(url).catch(e => console.warn('[Tiled] 地图加载失败:', url, e))
    ));
  }
  for (const mapId of allMapIds) {
    // 第一步：先用占位宽度拿模板（backgroundImages / spineForeground 与宽度无关，恒定存在）
    const tempMap = getMapData(mapId, { WORLD_WIDTH: 0, VH, VW });
    // 🎯 地图可行走宽度：优先 spineForeground 动态背景宽度，没有则用 backgroundImages 静态背景宽度
    const mapWidth = computeMapWidth(tempMap, Assets);
    // 第二步：用计算出的宽度重新生成完整地图（rectPoolArr 地面、出生点等都按此宽度排布）
    const mapData = getMapData(mapId, { WORLD_WIDTH: mapWidth, VH, VW });
    const bgData = BgWall(Assets, tempMap.backgroundImages);
    WallScale = bgData.WallScale; // 初始化 WallScale（问号标记等依赖它）
    mapData.realWidth = mapWidth;
    user.pixi.mapDataList.push(mapData);
  }

  // 如果有存档地图数据，恢复 TriggerAreaArr 和 wenhaoHudong 的修改状态
  if (savedMapDataList) {
    savedMapDataList.forEach(savedMap => {
      const targetMap = user.pixi.mapDataList.find(m => m.id === savedMap.id);
      if (!targetMap) return;

      // 恢复触发区域的删除状态
      if (savedMap.TriggerAreaArr) {
        targetMap.TriggerAreaArr = savedMap.TriggerAreaArr;
      }

      // 恢复动态障碍物（addRectObstacle 写入 rectPoolArr 的 obstacleId 障碍物）
      // targetMap 刚由 map.js 模板重新生成，这里把存档中「带 obstacleId 的动态障碍物」合并回来，
      // 避免被模板覆盖丢失（读档后障碍物依旧生效）
      if (savedMap.rectPoolArr) {
        if (!targetMap.rectPoolArr) targetMap.rectPoolArr = [];
        const targetIds = new Set(targetMap.rectPoolArr.map(r => r.obstacleId).filter(Boolean));
        savedMap.rectPoolArr.forEach(savedRect => {
          if (savedRect.obstacleId && !targetIds.has(savedRect.obstacleId)) {
            targetMap.rectPoolArr.push({ ...savedRect });
            targetIds.add(savedRect.obstacleId);
          }
        });
      }

      // 恢复问号互动的删除状态和属性修改（通过id匹配，保留原始onClick函数）
      // targetMap 可能没有静态定义 wenhaoHudong（如 rest_01 等全部由 createWenhaoHudong 动态创建），
      // 此时先初始化为空数组，保证下面的动态问号恢复逻辑能正常工作
      if (savedMap.wenhaoHudong) {
        if (!targetMap.wenhaoHudong) {
          targetMap.wenhaoHudong = [];
        }
        // 1. 过滤掉已删除的问号
        const savedIds = savedMap.wenhaoHudong.map(w => w.id);
        targetMap.wenhaoHudong = targetMap.wenhaoHudong.filter(w => savedIds.includes(w.id));

        // 2. 把动态创建的问号（createWenhaoHudong 创建、不在 map.js 静态模板里的）追加回来，避免读档后消失
        //    例：jingling.js 里动态创建的 'heimi'、zz116 里创建的 'rest_01' 问号
        const targetIds = new Set(targetMap.wenhaoHudong.map(w => w.id));
        savedMap.wenhaoHudong.forEach(savedW => {
          if (savedW.id && !targetIds.has(savedW.id)) {
            // onClick 是函数无法序列化，存档后已丢失；点击靠 clickData 兜底恢复
            targetMap.wenhaoHudong.push({ ...savedW });
            targetIds.add(savedW.id);
          }
        });

        // 3. 恢复 x / y / show / textureName 的修改（保留原始 onClick 函数，因为函数无法序列化）
        targetMap.wenhaoHudong.forEach(targetW => {
          const savedW = savedMap.wenhaoHudong.find(s => s.id === targetW.id);
          if (savedW) {
            if (savedW.x !== undefined) targetW.x = savedW.x;
            if (savedW.y !== undefined) targetW.y = savedW.y;
            if (savedW.show !== undefined) targetW.show = savedW.show;
            if (savedW.textureName !== undefined) targetW.textureName = savedW.textureName;
          }
        });
      }
    });
  }

  defaultMap = user.pixi.mapDataList.find(m => m.id === "desert_01");
  WORLD_WIDTH = defaultMap.realWidth;
  WORLD_HEIGHT = 100 * VH;

  // 5. 创建视口和物理引擎
  viewport = createViewport(app, WORLD_WIDTH, WORLD_HEIGHT);
  viewport.setZoom(getBaseZoom());
  viewport.followSpeed = 1000;
  viewport.decelerate = 0.92;
  // 🔥 暴露视口/镜头引用到全局（供 SkillLogic.js 等把玩家世界坐标换算成屏幕坐标）
  window.__worldViewport = viewport;
  window.__worldCameraTarget = cameraTarget;

  // 🎥 暗影王二阶段变身演出：主世界镜头（整个画面）移动到 boss 身上并放大，
  //    ruchang 入场动画播完 1 秒后还原（matter.vue 根容器 transform，主世界+战斗画面一起动）
  let _phase2CamRestoreTimer = null
  const onPhase2Zoom = ({ x = null, y = null } = {}) => {
    const root = gameContainer.value?.parentNode
    if (!root) return
    const bx = x !== null && x !== undefined ? x : window.innerWidth * 0.92
    const by = y !== null && y !== undefined ? y : window.innerHeight * 0.85
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    // 👇 镜头控制参数（想改就改这里）
    const s = 1.4                                 // 放大倍数（1 = 不放大）
    const offX = -1.5 * window.innerWidth / 100      // 到达后向左偏移（负=左，正=右，单位 vw）
    const offY = 2 * window.innerHeight / 100      // 到达后向下偏移（正=下，负=上，单位 vh）
    gsap.killTweensOf(root)
    root.style.transformOrigin = '0 0'
    // 镜头目标：让 boss 落到屏幕中心，再叠加左下偏移
    let tx = cx - bx * s + offX
    let ty = cy - by * s + offY
    // 📐 防露白：放大后的画面必须覆盖全屏（右/下边缘 >= 100vw/vh），超限自动夹回
    const minTx = (1 - s) * window.innerWidth
    const minTy = (1 - s) * window.innerHeight
    if (tx < minTx) tx = minTx
    if (ty < minTy) ty = minTy
    // 🌑 兜底深色背景（极端情况防白）
    root.style.background = '#05070d'
    gsap.fromTo(root, { scale: 1, x: 0, y: 0 },
      { scale: s, x: tx, y: ty, duration: 1.5, ease: 'power2.out' })
  }
  const onPhase2EnterDone = () => {
    const root = gameContainer.value?.parentNode
    if (!root) return
    clearTimeout(_phase2CamRestoreTimer)
    // ⏱️ ruchang 入场动画播完 0.5 秒后还原镜头
    _phase2CamRestoreTimer = setTimeout(() => {
      gsap.to(root, { scale: 1, x: 0, y: 0, duration: 0.6, ease: 'power2.inOut',
        onComplete: () => {
          root.style.transformOrigin = '50% 50%'
          root.style.background = ''
        } })
    }, 500)
  }
  emitter.off('phase2Zoom', onPhase2Zoom)
  emitter.on('phase2Zoom', onPhase2Zoom)
  emitter.off('phase2EnterDone', onPhase2EnterDone)
  emitter.on('phase2EnterDone', onPhase2EnterDone)
  engine = createEngine();
  world = engine.world;
  // 🎯 重力 scale 按屏高归一化（1080p 基准 0.00072）：角色需重力下落接触地面
  //    （无高度图地图贴地依赖 footSensor 碰撞事件；跳跃功能已删除，仅保留重力落地）
  engine.gravity.scale = 0.00072 * (window.innerHeight / 1080);
  // 开启刚体休眠（必加！静止NPC自动不计算物理）
  world.enableSleeping = true;
  engine.autoUpdate = false;
  engine.positionIterations = 5;
  engine.velocityIterations = 3;
  app.stage.addChild(viewport);

  // ===== 所有背景都放到 allBgContainer 中，统一应用滤镜 =====
  // 远景最先添加（最底层）
  allBgContainer.addChild(farBgContainer);
  // Spine 动态背景放在静态背景下方
  allBgContainer.addChild(spineBgContainer);
  // 静态背景在中间层
  allBgContainer.addChild(bgContainer);
  // 高层 Spine 前景（全局最上层，同时受昼夜滤镜影响）
  allBgContainer.addChild(spineFgContainer);

  // 把所有背景的父容器添加到 viewport
  viewport.addChild(allBgContainer);

  // 🗺️ 黑白碰撞图调试叠层：放在背景之上、角色之下
  viewport.addChild(heightMapDebugContainer);

  viewport.addChild(worldContainer);
  // 🌉 高层 Spine 前景（位于角色之上，遮挡人物用）
  viewport.addChild(spineFrontContainer);
  viewport.addChild(hudMarkContainer);

  // 6. 初始化UI、摇杆、键盘
  initGameUI(app, user);
  joystick = getJoystick();
  // 📍 注入摄像头引用，让 UI 的 XY 显示镜头坐标（而非玩家坐标）
  setViewportRef(viewport);

  // ==================== 🧸 Spine 道具放置器（纯视觉或可碰撞） ====================
  // 已放置列表变化 → 同步存档 + 销毁被移除的道具 Spine 视图 / 刚体 / 头顶问号
  watch(() => propPlacerState.placed.slice(), () => {
    // 💾 同步到存档（读档后 restorePlacedProps 自动恢复；qmConsumed 记录问号是否已永久消耗；
    //    mapId 记录道具归属地图——面板只显示当前地图的道具，切图后该地图的道具才显示）
    user.pixi.placedProps = propPlacerState.placed.map(p => ({
      key: p.key, x: p.x, y: p.y, qmConsumed: !!p.qmConsumed,
      mapId: p.mapId || 'desert_01', // 旧数据迁移：缺省归唯一可放置地图
    }));
    const ids = new Set(propPlacerState.placed.map(p => p.id));
    for (const [id, view] of _propViews) {
      if (!ids.has(id)) {
        try { view.destroy?.({ children: true, texture: false }); } catch (e) { }
        _propViews.delete(id);
      }
    }

    for (const [id, body] of _propBodies) {
      if (!ids.has(id)) {
        try { Matter.World.remove(world, body); } catch (e) { }
        _propBodies.delete(id);
      }
    }
    for (const [id, mark] of _propQms) {
      if (!ids.has(id)) {
        try { mark.destroy?.({ children: true }); } catch (e) { }
        try { emitter.emit('removeWenhaoHudong', { mapId: currentMapId, wenhaoId: id }); } catch (e) { }
        _propQms.delete(id);
      }
    }
  }, { deep: true });

  // 选择道具 → 创建透明预览；取消 → 销毁预览（放置/取消通过顶部按钮，不用点击地图）
  watch(() => propPlacerState.armed, (def) => {
    if (def) {
      drawer.value = false; // 🧸 开始放置时关闭右侧抽屉，避免挡住地图
      startGhostPlacement(def);
    } else {
      cleanupGhost();
    }
  });

  // 🧸 右侧抽屉关闭时，道具放置器面板也一并关闭
  //    （放置模式不误关：armProp 程序性关抽屉时面板 visible 已是 false）
  watch(drawer, (open) => {
    if (!open && propPlacerState.visible) closePropPlacer();
  });

  // 桌面端：点击确认放置（在预览位置，y 恒贴地 → 不可能放空中；移动端用顶部按钮）
  gameContainer.value?.addEventListener('click', (e) => {
    if (!propPlacerState.armed || isTouchDevice) return;
    confirmGhostPlacement();
  });

  // 鼠标移动 → 记录位置 + 预览跟随（桌面端；移动端用摇杆，屏蔽触屏模拟 mouse 事件）
  window.addEventListener('mousemove', (e) => {
    _lastMouseClient = { x: e.clientX, y: e.clientY };
    if (!propPlacerState.armed || !_ghostView || isTouchDevice) return;
    const { x } = screenToWorld(e.clientX, e.clientY);
    moveGhostToX(x);
  });

  // 📂 读档恢复已放置的道具
  restorePlacedProps();

  window.addEventListener('keydown', (e) => {
    // 🗺️ 世界地图打开时：屏蔽玩家移动与自由视角按键（WASD/方向键交给世界地图画布平移）
    if (worldMapVisible.value) return;
    // 🧸 道具放置模式：←→/A/D 微调透明预览位置，Esc 取消（此时玩家不可移动）
    if (propPlacerState.armed) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); moveGhostBy(-ghostNudge()); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); moveGhostBy(ghostNudge()); }
      else if (e.code === 'Escape') cancelGhostPlacement();
      return;
    }
    // 🎥 自由视角：WASD / 方向键 控制镜头上下左右
    if (isFreeCamera.value) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') freeKeys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') freeKeys.down = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') freeKeys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') freeKeys.right = true;
      return;
    }
    if (!joystick || !canPlayerControl) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') joystick.keyLeft = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') joystick.keyRight = true;
  });
  window.addEventListener('keyup', (e) => {
    // 🎥 自由视角：释放按键
    if (isFreeCamera.value) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') freeKeys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') freeKeys.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') freeKeys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') freeKeys.right = false;
      return;
    }
    if (!joystick) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') joystick.keyLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') joystick.keyRight = false;
  });

  // 7. 加载NPC数据
  // 🎯 只加载「当前起始地图」的刚体/问号，而不是所有地图：
  //    支持多地图统一 offsetX=0（靠 TpMap 传送切换时只加载当前地图），
  //    避免把所有地图的刚体一次性叠加进 world。
  const startMapData = user.pixi.mapDataList.find(m => m.id === startMap) || user.pixi.mapDataList[0];
  const finalNpcs = loadMapData([startMapData], createRectFromData);
  // 记录已加载的地图（仅当前起始地图）
  _loadedMapIds.clear();
  _loadedMapIds.add(startMapData.id);

  // 恢复存档中的动态 NPC（如对话创建的 NPC，不在 map.js 静态定义里）
  const staticIds = new Set(finalNpcs.map(n => n.id ?? n.data?.id));
  const dynamicNpcs = savedDynamicNpcs.filter(n => {
    const id = n.id ?? n.data?.id;
    return id && !staticIds.has(id);
  });
  if (dynamicNpcs.length > 0) {
    // console.log('[读档] 恢复动态NPC:', dynamicNpcs.map(n => n.id ?? n.data?.id));
    finalNpcs.push(...dynamicNpcs);
  }

  user.pixi.npcDataList = finalNpcs;

  // 8. 创建玩家
  playerPool = createPool(createPlayerObject);
  activePlayer = playerPool.acquire(defaultMap.playerSpawnX, defaultMap.playerSpawnY, {
    player: 1, juese: user.pixi?.player?.role || 'linen', // 🎭 开局所选角色（linen=林恩 / jinmao=晨曦 / yu=云弥 / huli=西亚）
    zIndex: 2, TopMap: defaultMap.TopMap,
    // animSpeed: 0.6, //角色动画播放速度
    data: {
      hp: 1500,
      maxHp: 1500,
    }
  });

  activePlayer.label = true;
  user.pixi.playerInstance = markRaw(activePlayer);
  viewport.follow(cameraTarget, { speed: 200 });

  // 9. 设置碰撞
  setupCollisionStart(engine, Matter, VH, physicsWorker);
  setupCollisionEnd(engine, Matter, physicsWorker);

  // 10. 注册NPC更新事件并渲染NPC
  npcConfigUpdated();
  await TpMap(startMap);
  // TpMap 后 currentGroundY 已被正确设置，此时触发 NPC 创建
  emitter.emit('npcConfigUpdated', user.pixi.npcDataList);
  // 读档时设置玩家到存档坐标（qidong.vue 传的 x/y 是百分比，需按当前地图换算回像素）
  if (route.query.x && route.query.y && activePlayer) {
    const qMap = user.pixi.mapDataList?.find(m => m.id === currentMapId);
    const qW = qMap?.realWidth || 1;
    const qOff = qMap?.offsetX ?? 0;
    const qH = 100 * VH;
    const qx = Number(route.query.x);
    const qy = Number(route.query.y);
    Matter.Body.setPosition(activePlayer.body, {
      x: Math.abs(qx) > 1 ? qx : qx * qW + qOff,  // 兼容旧存档像素
      y: Math.abs(qy) > 1 ? qy : qy * qH,
    });
  }

  // 自动读档：恢复玩家坐标和朝向
  // ⚠️ 存档存的是百分比（相对地图宽度/高度），读档必须按当前屏幕的地图参数换算回像素，
  //    否则换屏幕尺寸后玩家位置会错乱
  if (saveData && activePlayer) {
    const curMap = user.pixi.mapDataList?.find(m => m.id === currentMapId);
    const curW = curMap?.realWidth || 1;
    const curOff = curMap?.offsetX ?? 0;
    const curH = 100 * VH;
    // 兼容旧存档（绝对像素）：>1 视为旧格式直接使用
    const px = (p) => (p != null && Math.abs(p) > 1) ? p : p * curW + curOff;
    const py = (p) => (p != null && Math.abs(p) > 1) ? p : p * curH;

    if (saveData.playerX != null && saveData.playerY != null) {
      Matter.Body.setPosition(activePlayer.body, {
        x: px(saveData.playerX),
        y: py(saveData.playerY)
      });
    }
    if (saveData.playerDirection != null && activePlayer.spine) {
      activePlayer.spine.direction = saveData.playerDirection;
      activePlayer.spine.setDirection?.(saveData.playerDirection);
    }
    // 恢复NPC朝向
    if (saveData.npcDirections) {
      for (const npc of npcs) {
        const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
        if (npcKey && saveData.npcDirections[npcKey] != null && npc.spine) {
          const dir = saveData.npcDirections[npcKey];
          npc.spine.direction = dir;
          npc.spine.setDirection?.(dir);
        }
      }
    }
  }

  // 自动读档：恢复NPC位置（只恢复 X，Y 保持在各自地图的地面上）
  // ⚠️ 存档存的是百分比（相对NPC所在map的宽度/偏移），读档按当前屏幕地图参数换算回像素
  if (saveData && saveData.npcPositions) {
    for (const npc of npcs) {
      const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
      if (npcKey && npc.body) {
        const savedX = saveData.npcPositions[npcKey];
        if (savedX != null) {
          // 按 NPC 所在地图换算（兼容旧存档像素格式：>1 直接用）
          const npcMap = user.pixi.mapDataList?.find(m => m.id === npc.mapId);
          const w = npcMap?.realWidth || 1;
          const off = npcMap?.offsetX ?? 0;
          const targetX = Math.abs(savedX) > 1 ? savedX : savedX * w + off;
          // 🎯 假 body（纯视觉 NPC）直接改属性；真刚体用 Matter.Body
          if (npc.body._fakeBody) {
            npc.body.position.x = targetX;
            npc.body.position.y = npc.body.position.y; // Y 保持
          } else {
            Matter.Body.setPosition(npc.body, {
              x: targetX,
              y: npc.body.position.y  // Y 保持创建时的地面位置不变
            });
          }
          // 同步更新npcDataList里的x（与 createNPC/moveNpcToX 一致，存世界像素），
          // 避免后续 sync 或 updateNPCPool 用旧值重置位置
          const npcDataItem = user.pixi.npcDataList.find(item =>
            (item.id ?? item.data?.id) === npcKey
          );
          if (npcDataItem) {
            npcDataItem.x = targetX;
          }
        }
      }
    }
  }

  // 自动读档：恢复NPC显隐状态
  // ⚠️ 只处理「当前地图」的 NPC：
  //   - 非当前地图的 NPC 由 updateNPCPool 统一隐藏（notCurrentMap），这里不干预，
  //     否则会被 else 分支误设为 visible=true，或把「非当前地图隐藏」误判为显式隐藏。
  //   - 只在存档 npcHidden 记录「当前地图且被脚本显式隐藏」的 NPC（见 getSaveData）。
  if (saveData && saveData.npcHidden) {
    for (const npc of npcs) {
      if (npc.mapId !== currentMapId) continue; // 跳过非当前地图 NPC
      const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
      if (npcKey && saveData.npcHidden[npcKey] === true) {
        // 存档时是隐藏的 → 保持隐藏
        npc._explicitlyHidden = true;
        npc.view.visible = false;
        if (npc.body) npc.body.collisionFilter.mask = 0;
        const npcDataItem = user.pixi.npcDataList.find(item =>
          (item.id ?? item.data?.id) === npcKey
        );
        if (npcDataItem) npcDataItem.hidden = true;
      } else {
        // 存档时是显示的 → 确保碰撞恢复
        npc._explicitlyHidden = false;
        npc.view.visible = true;
        if (npc.body) npc.body.collisionFilter.mask = COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.BULLET;
      }
    }
  }

  // ✅ 恢复 NPC 待完成的移动任务（读档前可能已启动，现在重新执行）
  // console.log('saveData=', saveData);

  if (saveData?.npcPendingMoves) {
    // 等一帧让 NPC 物理 body 稳定下来
    requestAnimationFrame(() => {
      for (const npc of npcs) {
        const npcKey = npc.data?.id ?? npc.data?.data?.id ?? npc.data?.name;
        if (!npcKey) continue;
        const pend = saveData.npcPendingMoves[npcKey];
        if (!pend) continue;
        // ⚠️ targetPercent（新存档）按当前地图宽度换算回像素；旧存档直接 targetX
        let targetX = pend.targetX;
        if (pend.targetPercent != null) {
          const npcMap = user.pixi.mapDataList?.find(m => m.id === npc.mapId);
          const w = npcMap?.realWidth || 1;
          const off = npcMap?.offsetX ?? 0;
          targetX = pend.targetPercent * w + off;
        }
        moveNpcToX(npc, targetX, Matter, app, activePlayer, {
          teleport: false,
          speed: pend.speed,
          waitForPlayer: pend.waitForPlayer,
          maxDistance: pend.maxDistance,
          resumeDistance: pend.resumeDistance,
        });
      }
    });
  }

  // console.log('saveData=', saveData);

  vnZanting();

  // 11. 初始化物理Worker
  physicsWorker.postMessage({ type: 'init' });
  physicsWorker.onmessage = (e) => {
    const type = e.data.type;

    // 1. 移动速度
    if (type === 'vxSync' && activePlayer?.body) {
      if (!canPlayerControl) return;
      const body = activePlayer.body;
      Matter.Body.setVelocity(body, {
        x: e.data.vx,
        y: body.velocity.y
      });
      return;
    }

    // 2. 视图位置、NPC、问号、影子更新
    if (type === 'viewResult') {
      // ✅ 打包缓冲读取（替代 slice 对象数组）：零 GC，O(n) 遍历
      const { buffer, count } = e.data;
      const out = new Float32Array(buffer);
      // 布局：float[0]=count（主线程用 DataView 读 Uint32），实体数据从 float[1] 开始，每实体 12 个 float
      const readCount = Math.min(count, Math.floor((buffer.byteLength - 4) / 48));

      _viewMap.clear();
      _shadowMap.clear();
      for (let i = 0; i < readCount; i++) {
        const p = 1 + i * 12; // float 下标（worker 侧一致）
        // ✅ 从对象池取对象复用，避免每帧 new 数百个对象触发 GC
        const v = _viewPool[i] || (_viewPool[i] = { id: 0, x: 0, y: 0, gravityVy: 0, isNear: false, showBubble: false });
        v.id = out[p];
        v.x = out[p + 1];
        v.y = out[p + 2];
        v.gravityVy = out[p + 3];
        v.isNear = out[p + 4] === 1;
        v.showBubble = out[p + 5] === 1;
        _viewMap.set(v.id, v);

        const s = _shadowPool[i] || (_shadowPool[i] = { id: 0, x: 0, y: 0, scale: 1, alpha: 1, groundFixedY: 0 });
        s.id = out[p + 6];
        s.x = out[p + 7];
        s.y = out[p + 8];
        s.scale = out[p + 9];
        s.alpha = out[p + 10];
        s.groundFixedY = out[p + 11];
        _shadowMap.set(s.id, s);
      }

      // 主角坐标
      const playerView = _viewMap.get(activePlayer.body.id);

      if (playerView) {
        // 🎯 帧率无关插值：把固定 lerp 系数（0.7/0.5 每帧）按实际帧间隔归一化
        //    （等效 60fps 下每帧 0.7/0.5 的收敛速度）。否则低帧率下视觉追赶物理变慢，
        //    跳跃最高点看起来更矮、降落速度更慢 → 不同帧率/不同设备表现不一致。
        const _now = performance.now();
        const _dt = Math.min(Math.max(_now - _lastViewSyncTs, 1), 100); // 防切后台大间隔
        _lastViewSyncTs = _now;
        const _kx = 1 - Math.pow(1 - 0.7, _dt / (1000 / 60));
        const _ky = 1 - Math.pow(1 - 0.5, _dt / (1000 / 60));
        // 🎯 玩家 spine 位置取整到像素：lerp 平滑会产生子像素小数位置，
        //    spine 走 Mesh 蒙皮渲染，roundPixels 对网格不生效 → 移动时角色在子像素上采样而模糊
        if (!isCameraFixed) {
          activePlayer.spine.view.x = Math.round(lerp(activePlayer.spine.view.x, playerView.x, _kx) + (activePlayer._shakeOffsetX || 0));
          // 垂直方向系数稍小，跳跃落地更跟手，避免漂浮感（已做帧率归一化）
          activePlayer.spine.view.y = Math.round(lerp(activePlayer.spine.view.y, playerView.y, _ky) + (activePlayer._shakeOffsetY || 0));
        }
      }

      // NPC批量更新
      npcs.forEach(npc => {
        const v = _viewMap.get(npc.body.id);
        if (!v) return;

        // 🧮 视距剔除：距离判断已在 Worker 完成（isNear），主线程只应用结果
        //    显式隐藏的 NPC 永远不显示；worker 判定「远」则隐藏并暂停动画/待机计时器
        const shouldHide = npc._explicitlyHidden === true || v.isNear === false;
        const wasVisible = npc.view.visible;
        if (shouldHide) {
          npc.view.visible = false;
          // 刚变远：暂停 Spine 动画 + 待机计时器（原本可见才需要暂停）
          if (wasVisible) {
            if (npc.spine?.spine?.state) npc.spine.spine.state.timeScale = 0;
            idleAnimator.pause(npc);
          }
        } else {
          npc.view.visible = true;
          // 刚变近：恢复 Spine 动画 + 待机计时器（原本隐藏才需要恢复）
          if (!wasVisible) {
            if (npc.spine?.spine?.state) npc.spine.spine.state.timeScale = 1;
            if (idleAnimator.isActive(npc)) idleAnimator.resume(npc);
          }
        }
        if (!npc.view.visible) return; // 不可见则不更新坐标/影子

        // ✅ 重力已由 Matter 引擎驱动（core/engine.js 的 gravity），
        //    不再需要手动 setVelocity 施加 gravityVy（Matter 会处理下落/落地）

        npc.spine.view.x = v.x;
        npc.spine.view.y = v.y + (npc.data?.spineOffsetY ?? 0);
        // // ✅ NPC 影子更新（用 Map 查找替代数组遍历）
        const npcShadow = _shadowMap.get(npc.body.id);
        if (npcShadow) {
          if (!npc.shadowData) {
            npc.shadowData = { x: 0, y: 0, scale: 1, alpha: 1 };
          }
          npc.shadowData.x = npcShadow.x;
          npc.shadowData.y = npcShadow.y;
          npc.shadowData.scale = npcShadow.scale;
          npc.shadowData.alpha = npcShadow.alpha;
          npc.groundFixedY = npcShadow.groundFixedY;
        }
        // // ✅ 应用 NP 影子到显示对象
        if (npc.shadowData && npc.shadow) {
          npc.shadow.x = npc.shadowData.x;
          npc.shadow.y = npc.shadowData.y;
          npc.shadow.scale.set(npc.shadowData.scale);
          npc.shadow.alpha = npc.shadowData.alpha;
        }
      });

      // 主角影子
      const playerShadow = _shadowMap.get(activePlayer.body.id);
      if (playerShadow) {
        // ✅ 复用对象，零 GC 分配
        if (!activePlayer.shadowData) {
          activePlayer.shadowData = { x: 0, y: 0, scale: 1, alpha: 1 };
        }
        activePlayer.shadowData.x = playerShadow.x;
        activePlayer.shadowData.y = playerShadow.y;
        activePlayer.shadowData.scale = playerShadow.scale;
        activePlayer.shadowData.alpha = playerShadow.alpha;
        activePlayer.groundFixedY = playerShadow.groundFixedY;
      }

      // ✅ 处理完毕后归还输出缓冲到空闲池（下次发送复用，不再 new）
      if (buffer && buffer.byteLength >= VIEW_OUT_SIZE && _viewOutPool.length < 3) {
        _viewOutPool.push(buffer);
      }
      return;
    }

    // 3. 问号浮动标记回写
    if (type === 'wenhaoResult') {
      const view = new DataView(e.data.buffer);
      const count = view.getUint32(0, true);
      // ⚠️ 防御：worker 返回的 count 是「发送时」的长度；回写时数组可能已被 splice 缩短，
      //    用当前实际长度取交集，避免 floatingMarks[i] 为 undefined 导致读取 locked 报错
      const len = Math.min(count, floatingMarks.length);
      for (let i = 0; i < len; i++) {
        const off = 4 + i * 44;
        const mark = floatingMarks[i];
        if (!mark) continue; // 空值保护：数组中间被删除可能留下空洞
        const inRange = view.getUint8(off + 25, true) === 1;
        mark.visible = mark.locked ? false : inRange;
        mark.y = view.getFloat32(off + 8, true);
        mark.direction = view.getInt8(off + 24, true);
      }
      return;
    }

    // 4. 触发器触发
    if (type === 'triggerEnter') {
      const trigger = cachedTriggerAreas[e.data.index];
      if (!trigger) return;
      const { label, name } = trigger;

      if (label === 'teleportTrigger') {
        emitter.emit("teleportByName", name);
      } else if (label === 'zaoyuguaiwu') {
        disablePlayerControl();
        // ⚔️ 普通模式无剧情：跳过遭遇对话（jqZ01），仅清理触发器
        if (user.pixi?.gameMode !== 'normal') {
          emitter.emit("talkToNpc", { loadData: 'npc/jingling', name: 'jqZ01' });
        }
        cachedTriggerAreas.splice(e.data.index, 1);
        user.removeTriggerArea(currentMapId, label);
      }
    }
  };

  // 13. 启用玩家控制
  enablePlayerControl();

  // 13.5 初始化屏幕震动监听
  initScreenShakeListener();

  // 14. 等待几帧确保所有Spine资源加载渲染完成
  await new Promise(resolve => requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  }));
  talkToNpc()
  // ⚔️ 普通模式（gameMode=normal）：跳过开场剧情讲解，直接开始地牢探索
  if (user.pixi?.gameMode !== 'normal' && !user.isDialogueComplete('one00')) {
    emitter.emit("talkToNpc", {
      loadData: 'npc/jingling',
      name: 'one00'
    });
  }
  // 🔥 读档时恢复朝向
  restoreDirections();

  // // 15. 后台预加载其他地图
  // afterTpMap(startMap);

  // 🌙 夜晚滤镜渲染就绪后再显示地图：若当前地图启用了夜晚滤镜，
  //    等昼夜 Worker 首次回传（滤镜变成正确明暗效果）后再隐藏加载界面，
  //    避免"地图先亮、夜晚滤镜后加载变黑"的跳变
  try {
    if (currentLight?.night?.enable) {
      await waitDayNightReady(3000);
    }
  } catch (e) { /* ignore */ }

  // 16. 隐藏loading，显示游戏
  isPageLoading.value = false;

  const FIXED_DT = 1000 / 60; // 物理固定步长 60Hz，原值保留
  let tickCount = 0;
  // 🎯 玩家 spine lerp 的帧率无关插值计时（记录上次 view 同步时刻，用于按实际帧间隔归一化插值系数）
  let _lastViewSyncTs = 0;

  // ========== 【新增】物理固定步长所需变量 ==========
  let physicsAccumulator = 0;
  let lastFrameTime = performance.now();
  const MAX_FRAME_TIME = 100; // 防切后台跳帧，单帧最大耗时截断

  app.ticker.add(() => {
    // ========== 【新增】计算本帧真实耗时 ==========
    const now = performance.now();
    let deltaMS = now - lastFrameTime;
    lastFrameTime = now;
    // 切后台/卡顿后回来，单帧耗时过大时截断，避免物理猛冲穿墙
    if (deltaMS > MAX_FRAME_TIME) deltaMS = MAX_FRAME_TIME;

    // ========== 【核心修改】物理固定步长更新 ==========
    physicsAccumulator += deltaMS;
    // 攒够一个步长就更新一次物理，一帧可能更新多次，也可能不更新
    while (physicsAccumulator >= FIXED_DT) {
      Matter.Engine.update(engine, FIXED_DT); // 内部调用和你原代码完全一致
      physicsAccumulator -= FIXED_DT;
      // 🗺️ 高度图吸附法：当前地图有 heightMap 时，把玩家脚底吸附到地面（每物理步长一次）
      applyHeightMapToPlayer();
    }

    // ========== 【完全不动】tickCount 计数 ==========
    tickCount++;

    // ========== 【完全不动】输入降帧原逻辑 ==========
    if (tickCount % 3 === 0) {
      // 🎥 自由视角：不向物理 worker 发送移动输入，角色保持静止
      if (isFreeCamera.value) {
        staticInputMsg.data = staticInputMsg._zero;
        physicsWorker.postMessage(staticInputMsg);
      } else if (!canPlayerControl) {
        staticInputMsg.data = staticInputMsg._zero;
        physicsWorker.postMessage(staticInputMsg);
      } else if (propPlacerState.armed) {
        // 🧸 放置模式：玩家不可移动，摇杆左右控制预览位置（移动端）
        const jx = joystick;
        if (jx) {
          if (jx.x < -20 || jx.keyLeft) moveGhostBy(-ghostNudge());
          else if (jx.x > 20 || jx.keyRight) moveGhostBy(ghostNudge());
        }
        // 玩家输入清零（放置时玩家静止）
        playerInput.value.left = false;
        playerInput.value.right = false;
        staticInputMsg._live.left = false;
        staticInputMsg._live.right = false;
        staticInputMsg.data = staticInputMsg._live;
        physicsWorker.postMessage(staticInputMsg);
      } else {
        const jx = joystick;
        const hasJoy = jx != null;
        const left = hasJoy && (jx.x < -20 || jx.keyLeft);
        const right = hasJoy && (jx.x > 20 || jx.keyRight);

        playerInput.value.left = left;
        playerInput.value.right = right;

        staticInputMsg._live.left = left;
        staticInputMsg._live.right = right;
        staticInputMsg.data = staticInputMsg._live;
        physicsWorker.postMessage(staticInputMsg);
      }
    }

    // ========== 【完全不动】UI&渲染降帧原逻辑 ==========
    if (tickCount % 2 === 0) {
      // updateGameUI(app.ticker, activePlayer)
      updateWenhao();
      syncFollowMarks();
      // ✅ 重力已由 Matter 引擎驱动（core/engine.js），仅保留摔出世界时的重置保险
      applyFallbackReset();
      // 🎥 自由视角：远景不跟随镜头移动（冻结在进入自由视角时的位置）
      if (isFreeCamera.value) {
        farBgContainer.x = _farBgFrozenX;
      } else {
        farBgContainer.x = PARALLAX_FAR_BG * (viewport.left - currentFarBgOffsetX);
      }
    }

    // ========== 【完全不动】核心主逻辑 ==========
    gameLoop();
    sendAllToViewWorker();
  });
});
function lerp(a, b, t) {
  return a + (b - a) * t;
}
// 💎 等级突破弹窗（正式上线保留）
const breakthroughVisible = ref(false);
function openBreakthrough() {
  breakthroughVisible.value = true;
}
function onBreakthroughDone(res) {
  // 突破成功：属性/天赋点/溢出经验已由 store 更新
  // ✅ 突破成功后立即关闭突破窗口（失败则保持打开）
  if (res && res.ok) {
    breakthroughVisible.value = false;
  }
}

// 🧭 突破新手引导（10级且可突破时：打开右侧栏 → 点击突破 → 弹出突破界面即完成，只触发一次）
const btTutorialStep = ref(0);            // 0=关闭 1=点右上角头像开右侧栏 2=点「可突破」按钮
const btTutorialAvatarRef = ref(null);
const btTutorialBtnRef = ref(null);
const btTutorialTipPos = ref({ x: 0, y: 0 });
const BT_TUTORIAL_KEY = 'dl_bt_tutorial_done';
function isBtTutorialNeeded() {
  const u = user.pixi?.player;
  if (!u) return false;
  try { if (localStorage.getItem(BT_TUTORIAL_KEY)) return false; } catch (e) { }
  return Number(u.Level || 0) >= 10
    && !dungeonVisible.value
    && !drawer.value
    && !isPageLoading.value
    && !!user.canBreakthrough?.();
}
function btTipTo(el, dy = 12) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const bw = 240; // 气泡半宽估算（nowrap 单行）
  const vw = window.innerWidth || 1280;
  let x = r.left + r.width / 2;
  // 气泡不超出屏幕左右（避免右缘挤压成竖排）
  x = Math.max(bw, Math.min(vw - bw, x));
  btTutorialTipPos.value = { x, y: r.bottom + dy };
}
function startBtTutorial() {
  btTutorialStep.value = 1;
  setTimeout(() => btTipTo(btTutorialAvatarRef.value), 150);
  setTimeout(() => btTipTo(btTutorialAvatarRef.value), 900); // 页面加载动画结束后再定位一次
}
function finishBtTutorial() {
  btTutorialStep.value = 0;
  try { localStorage.setItem(BT_TUTORIAL_KEY, '1'); } catch (e) { }
}
// 等级达到10 / 离开地牢 / 右侧栏关闭 → 检查是否触发突破引导
watch(() => user.pixi?.player?.Level, (lv) => {
  if (btTutorialStep.value === 0 && Number(lv || 0) >= 10 && isBtTutorialNeeded()) startBtTutorial();
});
watch(dungeonVisible, (v) => {
  if (!v && btTutorialStep.value === 0 && isBtTutorialNeeded()) startBtTutorial();
});
watch(drawer, (v) => {
  if (v && btTutorialStep.value === 1) {
    // 右侧栏已打开 → 引导第 2 步：点击「可突破」按钮
    btTutorialStep.value = 2;
    setTimeout(() => btTipTo(btTutorialBtnRef.value), 300);
    setTimeout(() => btTipTo(btTutorialBtnRef.value), 800); // 抽屉动画完成后再次定位
  } else if (!v && btTutorialStep.value === 0) {
    // 关闭右侧栏 → 检查是否满足触发条件（如刚在右侧栏里升到10级）
    setTimeout(() => { if (isBtTutorialNeeded()) startBtTutorial(); }, 300);
  }
});
// 突破界面弹出 → 引导完成（只触发一次）
watch(breakthroughVisible, (v) => {
  if (v && btTutorialStep.value > 0) finishBtTutorial();
});
// 游戏加载完成后 → 触发突破引导（头像可见后才能正确定位气泡）
watch(isPageLoading, (v) => {
  if (!v && btTutorialStep.value === 0) {
    setTimeout(() => { if (isBtTutorialNeeded()) startBtTutorial(); }, 600);
  }
});
// 页面加载完成后兜底检查（玩家可能已满10级但此前未触发过）
setTimeout(() => {
  if (btTutorialStep.value === 0 && isBtTutorialNeeded()) startBtTutorial();
}, 3000);


// 🧪 测试按钮：一键 +500 经验（正式上线前移除）
function addTestExp() {
  if (!user.pixi?.player) return;
  const before = user.pixi.player.Level;
  const beforeExp = user.pixi.player.exp;
  user.addExp(500);
  const after = user.pixi.player.Level;
  const afterExp = user.pixi.player.exp;
  ElMessText(
    tr('🧪 +500 经验（测试）') + '\n' +
    'Lv.' + before + ' → Lv.' + after + ' · ' + tr('经验') + ' ' + beforeExp + ' → ' + afterExp,
    'success'
  );
}

async function ceshi5() {
  drawer.value = true
  user.pixi.activePlayer = {
    hp: activePlayer.data.data.hp,
    maxHp: activePlayer.data.data.maxHp,
    x: activePlayer.body.position.x,
    y: activePlayer.body.position.y,
    speed: activePlayer.speed,
    juese: activePlayer.data.juese
  };
  emitter.emit("vnZanting");
}

// 🏪 商店弹窗关闭：地牢商人「买卖」场景 → 返回 sr10 对话（不弹侧边栏）；其他场景保持原逻辑
function onShopDialogClose() {
  if (merchantShopReturn.value) {
    merchantShopReturn.value = false;
    emitter.emit('talkToNpc', { loadData: 'npc/shangren1', name: 'sr10' });
    return;
  }
  ceshi5();
}

// 打开角色信息 - 背包标签
function openInventory() {
  playerInfoDefaultTab.value = 'inventory';
  drawer.value = false;
  dialogTableVisible.value = true;
}

// 打开角色信息 - 卡牌携带标签
function openCards() {
  playerInfoDefaultTab.value = 'cardBook';
  drawer.value = false;
  dialogTableVisible.value = true;
}

// 打开角色信息 - 天赋标签
function openTalent() {
  playerInfoDefaultTab.value = 'talent';
  drawer.value = false;
  dialogTableVisible.value = true;
}

// ⚗️ 打开合成工坊
function openCraft() {
  drawer.value = false;
  dialogTableVisible5.value = true;
}

// 🏆 打开成就系统
function openAchievement() {
  drawer.value = false;
  dialogTableVisible6.value = true;
}

// 🏪 打开商店（刷新商店物品 + 展示弹窗）
function openShop() {
  // 每次打开商店前用最新配置刷新一次（新增/删除/编辑自动生效，已购数量保留）
  user.refreshShopItems();
  // 关闭可能同时打开的其他弹窗（背包/合成等），避免叠加
  dialogTableVisible.value = false;
  dialogTableVisible5.value = false;
  dialogTableVisible6.value = false;
  drawer.value = false;
  dialogTableVisible7.value = true;
}

// ⚗️ 打开炼制工坊（展示弹窗）
function openLianzhi() {
  // 关闭可能同时打开的其他弹窗，避免叠加
  dialogTableVisible.value = false;
  dialogTableVisible5.value = false;
  dialogTableVisible6.value = false;
  dialogTableVisible7.value = false;
  drawer.value = false;
  dialogTableVisible8.value = true;
}

// 📖 打开物品图鉴（展示弹窗）
function openItemTuJian() {
  // 关闭可能同时打开的其他弹窗，避免叠加
  dialogTableVisible.value = false;
  dialogTableVisible5.value = false;
  dialogTableVisible6.value = false;
  dialogTableVisible7.value = false;
  dialogTableVisible8.value = false;
  drawer.value = false;
  dialogTableVisible9.value = true;
}
// 👾 打开怪物图鉴（与 dladmin 怪物编辑共用 enemiesData.js 数据）
function openMonsterCodex() {
  dialogTableVisible.value = false;
  dialogTableVisible5.value = false;
  dialogTableVisible6.value = false;
  dialogTableVisible7.value = false;
  dialogTableVisible8.value = false;
  dialogTableVisible9.value = false;
  drawer.value = false;
  dialogTableVisible10.value = true;
}
const handleTalkNpc = (loadData, name) => {
  emitter.emit('talkToNpc', { loadData, name });
}
// 🏪 地牢商人「买卖」打开商店标记回调
const onDungeonMerchantShop = () => { merchantShopReturn.value = true; };

// 🏪 全局商店打开事件：其他页面（如背包 xinxi.vue）可 emitter.emit('openShop') 打开商店
emitter.off("openShop");
emitter.on('openShop', () => {
  openShop();
});
// 🏰 商店关闭 → 通知地牢解冻（地牢商人交易时冻结地牢）
watch(dialogTableVisible7, (v) => { if (!v) emitter.emit('dungeonShopClosed'); });
// 🏪 地牢商人「买卖」打开商店标记：关闭后返回 sr10 对话
emitter.off('dungeonMerchantShop', onDungeonMerchantShop);
emitter.on('dungeonMerchantShop', onDungeonMerchantShop);
// 问号互动删除监听：点击后从地图数据中移除
emitter.on('removeWenhaoHudong', ({ mapId, wenhaoId }) => {
  const mapData = user.pixi.mapDataList.find(m => m.id === mapId);
  if (mapData && mapData.wenhaoHudong) {
    const index = mapData.wenhaoHudong.findIndex(w => w.id === wenhaoId);
    if (index > -1) {
      mapData.wenhaoHudong.splice(index, 1);
    }
  }
});

// 问号互动创建监听：动态创建的标记立即渲染（createWenhaoHudong 触发）
emitter.off("wenhaoConfigUpdated");
emitter.on('wenhaoConfigUpdated', ({ mapId, wenhaoId }) => {
  const mapData = user.pixi.mapDataList.find(m => m.id === mapId);
  if (!mapData || !mapData.wenhaoHudong) return;
  const item = mapData.wenhaoHudong.find(w => w.id === wenhaoId);
  if (!item) return;

  // 已存在实例则跳过（避免重复创建）
  if (floatingMarks.some(m => m.mapId === mapId && m.wenhaoId === wenhaoId)) return;

  // 百分比 → 世界像素坐标
  const mapHeight = window.innerHeight; // 100 * VH
  const x = (item.x ?? 0.5) * (mapData.realWidth ?? 0) + (mapData.offsetX ?? 0);
  const y = (item.y ?? 0.5) * mapHeight;

  wenhaoHudong(x, y, 0, 0, {
    textureName: item.textureName,
    show: item.show,
    wuxian: item.wuxian,
    isFloatEnable: item.isFloatEnable,
    scale: item.scale,
    detectWidth: item.detectWidth,
    onlyXDetect: item.onlyXDetect,
    clickData: item.clickData,
    onClick: item.onClick,
    wenhaoId: item.id,
    mapId: mapId,
    followNpcId: item.followNpcId,
    followOffsetY: item.followOffsetY,
  }, WallScale, hudMarkContainer, Assets, Sprite);
});

// 障碍物重建监听：对话中添加/移除 rectPoolArr 障碍物后，立即重建当前地图刚体（addRectObstacle 触发）
emitter.off('rebuildMapObstacles');
emitter.on('rebuildMapObstacles', ({ mapId }) => {
  const mapData = user.pixi.mapDataList.find(m => m.id === mapId);
  if (!mapData) return;
  // 只有重建「当前地图」才立即生效；非当前地图读档/切图时会自动带上
  if (mapId !== currentMapId) return;

  // 1. 清掉当前地图旧的刚体（保留 NPC/问号：clearMapRuntimeData 会一并清理，需先重建）
  //    ⚠️ 这里只重建地形刚体，NPC/问号由各自事件管理，因此单独清 rect 类刚体
  const wutiList = wuti.get(mapId);
  if (wutiList && wutiList.length > 0) {
    const bodiesToRemove = [];
    const objectsToDestroy = [];
    for (let i = wutiList.length - 1; i >= 0; i--) {
      const obj = wutiList[i];
      if (obj && obj.body) bodiesToRemove.push(obj.body);
      if (obj && obj.destroy) objectsToDestroy.push(obj);
    }
    if (bodiesToRemove.length > 0) {
      try { Matter.World.remove(world, bodiesToRemove); } catch (e) { }
    }
    for (const obj of objectsToDestroy) {
      try { obj.destroy(); } catch (e) { }
    }
    wuti.delete(mapId);
  }

  // 2. 从 mapDataList 重新实体化当前地图的 rectPoolArr / TriggerAreaArr 刚体
  const applyOffset = (item) => ({ ...item, x: item.x + mapData.offsetX });
  mapData.rectPoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "矩形", mapData.id));
  mapData.trianglePoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "三角形", mapData.id));
  mapData.circlePoolArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "圆形", mapData.id));
  mapData.TriggerAreaArr?.map(applyOffset).forEach((d, i) => createRectFromData(d, i, "矩形", mapData.id));
});

//播放对话
function talkToNpc() {
  emitter.off("talkToNpc");
  emitter.on('talkToNpc', async (data) => {
    const { loadData, name, silent } = data;
    drawer.value = false;
    // 先加载对话模块（已加载过会直接返回）
    await loadDialogueModule(loadData);

    // 🔇 静默模式：只执行目标节点的 onEnter 回调，不弹出对话框
    //    适用于「纯执行」节点（如动态添加障碍物 addRectObstacle）
    if (silent) {
      const node = allDialogues?.[name];
      if (node?.onEnter && typeof node.onEnter === 'function') {
        node.onEnter();
      }
      user.pixi.duihua = false;
      return;
    }

    if (!user.isDialogueComplete(name)) {
      user.pixi.gameUi = true;
      disablePlayerControl();
      // 条件不满足（如背包物品不足/好感度不足）时 startDialogue 返回 false：
      // 恢复 UI 与操作权并隐藏对话框，避免玩家卡住
      const started = await startDialogue(name);
      if (started) {
        user.showDialogue()
      } else {
        // 恢复 UI 与操作权（用事件方式，与 endDialogue 一致），避免玩家卡住
        user.pixi.gameUi = false;
        user.hideDialogue();
        emitter.emit("enablePlayerControl", 1);
      }
    } else {
      user.pixi.duihua = false
    }
  });
}

// ⚙️ 设置弹窗（文字速度 / 音量 / 手动保存 / 语言切换）
const settingsVisible = ref(false);
const langVersion = ref(0);
// 语言切换后触发模板重新渲染（读取 langVersion 建立依赖）
function L(key) { langVersion.value; return i18nT(key); }
function onLangChanged() { langVersion.value++; }
window.addEventListener('fvnyouxi-lang-changed', onLangChanged);
async function onTextSpeedChange(v) {
  try { await updateSetting("text_speed", v); } catch (e) { /* ignore */ }
}
async function onVolumeChange(v) {
  user.applyVolume(v);
  try { await updateSetting("volume", v); } catch (e) { /* ignore */ }
}
function switchLang(l) { setLang(l); }

// 保存游戏
function saveGame() {
  if (activePlayer && !user.pixi.fight) {
    user.autoSave(getSaveData());
    ElMessText(L('saveSuccess'), "success");
  } else {
    ElMessText("战斗中无法存档", "warning");
  }
}
// 💾 手动保存：唯一存档直接覆盖（不再弹窗选档；战斗中禁止存档）
function manualSave() {
  saveGame();
}
// ⛔ 讨伐战已移除：guodu（普通讨伐）入口已删除，
//    战斗统一走 customBattle（对话自定义战斗 / 地牢战斗）
// 自定义战斗：怪物种类、数量、属性、奖励完全自定义，不随机，胜利不增加深入度上限
// 用法：emitter.emit("customBattle", { enemies: [...], noDepthUnlock: true, depth: 30 })
// enemies 配置项：{ monsterType, count, name, hp, attack, armor, speed, hpMultiplier,
//                  attackMultiplier, armorMultiplier, speedMultiplier, baseExp, drops }
// noDepthUnlock: 是否提升深入度上限（自定义战斗默认不提升，可显式传 false 覆盖）
// depth: 可选深入度加成，传入则按标准深入度倍率统一缩放敌人属性（不随机）
function customBattle() {
  emitter.off("customBattle");
  emitter.on('customBattle', async (config = {}) => {
    // 保存自定义战斗配置（供战斗页读取）
    const enemyConfigs = Array.isArray(config.enemies) ? config.enemies : [];
    const customBattleData = {
      enemies: enemyConfigs,
      // 深入度加成（可选）
      depth: config.depth ?? null,
      // 是否提升深入度上限（自定义战斗默认不提升，可显式传 false 覆盖）
      noDepthUnlock: config.noDepthUnlock !== false,
      // 🌕 血月标记（敌人行动条+50%）
      bloodMoon: !!config.bloodMoon,
      // 🌦️ 地牢天气（雨天/暴风雨/雷雨天进入战斗给双方挂湿润）
      weather: config.weather ?? null,
      // 🌙 地牢天黑：战斗场景天黑跟随地牢（night=是否天黑；nightLevel=天黑进度0~1）
      night: !!config.night,
      nightLevel: typeof config.nightLevel === 'number' ? config.nightLevel : (config.night ? 1 : 0),
    };
    user.setDialogueFlag('customBattleData', customBattleData);
    await jinruzhandou();
  });

  // 🏰 地牢进入战斗：关闭地牢页面（v-if=false 销毁组件），战斗结束后重新打开
  emitter.off("dungeonEnterBattle");
  emitter.on('dungeonEnterBattle', () => {
    pendingDungeonBattle.value = true;
    dungeonVisible.value = false;
  });

  // 💀 地牢玩家血量归0：强制关闭地牢页面（返回主世界，不恢复血量）
  emitter.off("dungeonForceClose");
  emitter.on('dungeonForceClose', () => {
    dungeonVisible.value = false;
    audioPopBgmScene(); // 🎵 地牢死亡返回主世界：恢复进入地牢前的主世界 BGM
  });

  // 🏰 从世界地图发起讨伐：关闭世界地图，打开地牢
  // 🎬 进入地牢前先判断剧情对话（hd200 → jqZ200 → fx03）：触发则不再进入地牢，
  //    直接在主世界弹出对话，对话结束后保持原地图
  emitter.off("enterDungeonFromWorldMap");
  emitter.on('enterDungeonFromWorldMap', (data) => {
    // 保存进入地牢的来源地图ID，供地牢剧情触发判断使用
    if (data?.mapId) {
      user.setDialogueFlag('dungeonEntryMapId', data.mapId);
    }
    if (data?.sceneId) {
      user.setDialogueFlag('dungeonEntrySceneId', data.sceneId);
    }
    // 🗺️ 保存来源地图名（世界地图 scene.label），供地牢底栏“显示是哪张地图”
    if (data?.label) {
      user.setDialogueFlag('dungeonEntryMapLabel', data.label);
    }
    // 🎬 判断是否触发进入地牢前的剧情对话（只在从世界地图进入时判断）
    const entrySceneId = user.getDialogueFlag?.('dungeonEntrySceneId');
    let entryDialogueName = null;
    // if (entrySceneId) {
    //   const day = user.pixi?.player?.day ?? 1;
    //   if (!user.isDialogueComplete('hd200')) {
    //     entryDialogueName = 'hd200';
    //   } else if (day >= 3 && !user.isDialogueComplete('jqZ200')) {
    //     entryDialogueName = 'jqZ200';
    //   } else if (day >= 6 && user.isDialogueComplete('jqZ200') && user.getDialogueFlag?.('jinmao250Done') && !user.isDialogueComplete('fx03')) {
    //     entryDialogueName = 'fx03';
    //   }
    // }
    // if (entryDialogueName) {
    //   // 🎬 触发剧情对话：不进入地牢，留在主世界（世界地图已关闭），对话结束后恢复主世界
    //   user.setDialogueFlag('dungeonEntrySceneId', null); // 防止重复触发
    //   worldMapVisible.value = false;
    //   emitter.emit('talkToNpc', { loadData: 'npc/jingling', name: entryDialogueName });
    //   return;
    // }
    worldMapVisible.value = false;
    // 🩸 生命值 <5% 不可进入地牢（先恢复血量再进入）
    const _hp = user.pixi?.player?.juese;
    const _hpPct = _hp && _hp.maxHp ? _hp.hp / _hp.maxHp : 1;
    if (_hpPct < 0.05) {
      ElMessText('生命值过低，无法进入地牢，请先恢复血量！', 'warning');
      return;
    }
    user.setDialogueFlag('dungeonEnterOutside', true); // 🌙 从世界地图进入：进入后刷新为白天
    user.setDialogueFlag('shangrenMetThisDungeon', false); // 🧭 重置本次地牢会话的商人对话计数
    user.setDialogueFlag('shangrenTaleToldThisDungeon', false); // 🧭 重置本次地牢会话的见闻已讲标记（每次进地牢可再听一次）
    dungeonVisible.value = true;
  });

  // 📢 号令：在所有友军身上弹出浮动 buff 文字（队友 spine 在 worldContainer）
  emitter.off("allyBuff");
  emitter.on('allyBuff', ({ allyName, buffName }) => {
    try {
      // 🧙 队友是纯 Spine 显示对象（世界坐标），战斗中被固定在玩家左侧
      const allyView = window.__battleAlly?.view;
      if (!allyView || !allyView.parent) return;
      const color = BUFF_COLOR_MAP[buffName]?.color || BUFF_COLOR_MAP['减益'].color;
      const finalFontSize = Math.max(6, Math.min(16, Math.round(vh(0.8))));
      const buffText = new Text({
        text: tr(buffName),
        style: {
          fill: color,
          fontSize: finalFontSize,
          fontWeight: 'bold',
          stroke: { color: '#000000', width: Math.max(2, Math.floor(finalFontSize / 7)) },
          fontFamily: 'Arial Black',
          resolution: window.devicePixelRatio || 2,
        }
      });
      buffText.anchor.set(0.5);
      // ✅ 大范围随机，保证多个 buff 不会叠在同一个位置
      buffText.x = allyView.x + (Math.random() - 0.5) * 40;
      buffText.y = (allyView.y + 2 * VH) - (allyView.height || 0) / 2 - vh(1.5) + (Math.random() - 0.5) * 30;
      buffText.alpha = 1;
      buffText.scale.set(1);
      buffText.zIndex = 120;
      buffText.blendMode = 'normal';
      allyView.parent.addChild(buffText);
      // ✅ worldContainer.sortableChildren = true，zIndex 自动排序
      gsap.timeline()
        .to(buffText, { scale: 1.1, duration: 0.15, ease: 'power3.out' })
        .to(buffText, { y: buffText.y - vh(3.5), duration: 0.5, ease: 'power1.out' }, '<')
        .to(buffText, { alpha: 0, duration: 0.2, ease: 'power1.out' }, '>')
        .call(() => buffText.destroy({ children: true }));
    } catch (e) { /* 忽略异常 */ }
  });
}
function guanbi() {
  user.pixi.isPaused = false;
  app.ticker.start();
}
async function jinruzhandou() {
  // 👤 清理上一次战斗残留的战斗阴影（防重复进入叠加）
  _clearBattleShadows();
  // 0. 保存战斗前的玩家位置和地图ID（战斗结束后传回这里）
  savePlayerPosition(activePlayer, currentMapId);
  // 1. 先变黑
  isMapTransitioning = false;
  // � 提前进入战斗模式（fightMode=true）：从传送瞬间就关闭手写重力，
  //    避免玩家/敌人在 TpMap 内部等待帧期间因悬空被重力下坠（“进入战斗后掉下去”）
  showAllEnemyHpBar();

  // 🎯 战斗站位固定值：玩家/队友刚体世界 Y（可调：数值越大越靠下/靠近背景底部）
  //   必须在 TpMap 前就定义好
  const BATTLE_PLAYER_BODY_Y = 72 * VH;

  // 🔥 关键：TpMap 传送【之前】就冻结玩家（关闭碰撞 + isSleeping + 清速度），
  //   这样 TpMap 内部多帧 await 期间物理引擎完全不会碰玩家 body，
  //   彻底杜绝「传送中掉落/弹跳、进战斗后再被拉回」的视觉问题。
  window.__battlePlayerMask = activePlayer.body.collisionFilter.mask;
  activePlayer.body.collisionFilter.mask = 0;
  if (activePlayer.body.parts && activePlayer.body.parts.length) {
    activePlayer.body.parts.forEach(p => { p.collisionFilter.mask = 0; });
  }
  Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(activePlayer.body, 0);
  activePlayer.body.isSleeping = true; // 冻结，物理不再移动玩家
  // 统一禁用玩家控制（canPlayerControl=false + 冻结 + activePlayer 快照），
  // 避免 TpMap 期间玩家输入/主世界逻辑移动冻结的 body
  disablePlayerControl();

  // �💥 读取战斗地图：优先用世界地图选择的讨伐地图（enterBattleFromPrep 保存的 battleMapId），
  //    默认回退到 desert_02（剧情强制战斗等场景）
  const battleMapId = user.getDialogueFlag('battleMapId') || "desert_02";
  const map = user.pixi.mapDataList.find(m => m.id === battleMapId) || user.pixi.mapDataList.find(m => m.id === "desert_02");
  WORLD_WIDTH = map.realWidth;
  // 玩家在战斗地图中的站位（镜头固定在 0.48，玩家保持左侧对敌）
  // 0.325 ≈ 玩家出现在屏幕约 28% 处（与队友一起保持在可视范围内）
  const tpPosition = map.offsetX + WORLD_WIDTH * 0.3
  activePlayer.spine.direction = 1;
  activePlayer.spine.setDirection(1);
  // 🛡️ 等待上一次地图切换（如战斗结束回城 TpMap）完成，避免 isMapTransitioning 锁拦截本次传送
  //   （否则玩家 body 停在上一张地图的大坐标，战斗立绘跑到屏幕右侧外）
  let _tpWait = 0;
  while (isMapTransitioning && _tpWait < 50) { await new Promise(r => setTimeout(r, 20)); _tpWait++; }
  if (isMapTransitioning) isMapTransitioning = false; // 锁被异常卡住时强制复位
  await TpMap(battleMapId, tpPosition);

  // 🎯 TpMap 完成后（玩家已被 TpMap 放到出生点，但仍处于冻结状态），
  //   立即把玩家刚体固定到目标 Y，并硬设 Spine view.y 到最终位置
  //   （worker 同款公式），避免 view.y 从出生点缓动造成「掉下去/飞上来再拉回」
  Matter.Body.setPosition(activePlayer.body, {
    x: activePlayer.body.position.x,
    y: BATTLE_PLAYER_BODY_Y,
  });
  Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 });
  activePlayer.body.isSleeping = true;
  if (activePlayer?.spine?.view) {
    activePlayer.spine.view.x = activePlayer.body.position.x;
    activePlayer.spine.view.y = activePlayer.body.position.y
      + ((activePlayer.data?.TopMap ?? 0) + (defaultMap?.TopMap ?? 0)) * VH;
  }
  user.pixi.gameUi = true;

  // 读取自定义战斗配置（customBattle 事件写入；普通剧情/魔物讨伐没有则为空）
  const customBattleData = user.getDialogueFlag('customBattleData');
  const hasCustomBattle = customBattleData && Array.isArray(customBattleData.enemies) && customBattleData.enemies.length > 0;
  // 🌙 地牢战斗：战斗场景天黑跟随地牢天黑（而不是外面天黑）
  //    地牢天黑 → 战斗夜晚（dayTime=0.5 全黑）；地牢天亮 → 战斗白天（dayTime=0）；
  //    非地牢战斗（night 未定义）不干预，保持主世界昼夜
  if (hasCustomBattle && customBattleData.night !== undefined && customBattleData.night !== null) {
    const nl = Math.max(0, Math.min(1, customBattleData.nightLevel ?? (customBattleData.night ? 1 : 0)));
    setDayTime(nl * 0.5);   // 0=白天 … 0.5=全黑（滤镜 t=sin(dayTime*π)）
    setDayNightSpeed(0);    // 地牢天黑固定不流逝
  }

  // 3. 创建敌人数据
  // 自定义战斗：怪物完全自定义，不随机；depth 有值则按标准深入度倍率统一缩放
  // 普通战斗：根据战斗深度动态调整
  // 🎯 读取当前战斗场景 id（世界地图进入时保存），按场景取独立深入度 + 决定怪物种类
  const battleSceneId = user.getDialogueFlag('battleSceneId') || null;
  let enemyData;
  if (hasCustomBattle) {
    enemyData = createCustomEnemies(customBattleData.enemies, customBattleData.depth);
    // console.log('[自定义战斗] enemyData=', enemyData);
  } else {
    // ⛔ 讨伐战已移除：不再生成随机讨伐敌人，战斗统一走 customBattle（对话自定义战斗 / 地牢战斗）
    enemyData = [];
    console.warn('[matter] 无自定义战斗配置，跳过战斗敌人创建');
  }

  // ⚠️ 提前进入战斗模式（fightMode=true）：战斗中关闭手写重力，
  //    避免队友/敌人刚体在创建瞬间因悬空被重力下坠一点点
  //    （disablePlayerControl 里也会再调一次 showAllEnemyHpBar，幂等安全）
  showAllEnemyHpBar();
  // 🐛 修复：敌人追加到 npcDataList 时标记 hidden（主世界不显示）。
  //   战斗页（fight/index.vue）用 createCustomEnemies 自己生成并渲染敌人（右侧排列），
  //   主世界不依赖这些敌人 NPC；若不隐藏，敌人会按 createBaseEnemy 的 x=0/8vw/16vw…
  //   被当普通 NPC 生成在 desert_02 主世界【屏幕左侧】，出现"额外怪物但不攻击"的残留 spine。
  user.pixi.npcDataList = [...user.pixi.npcDataList, ...enemyData.map(e => ({ ...e, hidden: true }))];
  // // 5. 创建敌人NPC
  emitter.emit('npcConfigUpdated', user.pixi.npcDataList);

  // 6. 等待几帧确保所有敌人Spine资源加载渲染完成
  await new Promise(resolve => requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }));

  // ===== 携带队友：在战斗场景生成 Spine（无物理 body，纯显示） =====
  // 队友站在玩家身后（左侧，玩家面朝右侧敌人）；敌人不攻击队友，无需血条
  // 💡 队友不再创建物理刚体（不经过 createNPC / playerPool），只创建一个 Spine 显示：
  //   - 彻底杜绝物理导致的「掉落 / 弹跳 / 被拉回」问题
  //   - 战斗逻辑（battle.js）只需队友的 .spine（播动画）和屏幕坐标（特效定位），
  //     不依赖队友的物理碰撞
  //   - 位置直接固定在玩家左侧同一水平线（BATTLE_PLAYER_BODY_Y），永不动
  const allyBattleData = user.getCurrentAllyBattleData?.();
  if (allyBattleData && activePlayer) {
    // 队友在战斗场景中的大小倍率（默认 1 = 与玩家等大）
    const allySpineScale = allyBattleData.spineScale ?? 1;
    const ALLY_ID = 9001;
    // 队友固定站位：玩家左侧 10vw
    const ALLY_BODY_X = activePlayer.body.position.x - 10 * VW;
    // 🎯 队友比玩家高 2VH（视觉上队友略微浮空/靠上）：
    //   玩家 view.y = body.y + TopMap*VH，队友在此基础再减 2VH
    const allyY = BATTLE_PLAYER_BODY_Y
      + ((allyBattleData.TopMap ?? 0) + (defaultMap?.TopMap ?? 0)) * VH
      - 5 * VH;

    // 创建纯 Spine（无物理）
    const allySpineBoy = createSpineBoy({}, { juese: allyBattleData.juese });
    allySpineBoy.view.batchable = true;
    allySpineBoy.view.alphaCutoff = 0.1;
    // 大小与玩家一致（玩家高度 × 队友缩放倍率）
    const targetH = (activePlayer.playerH ? activePlayer.playerH : 27 * VH) * allySpineScale;
    const allyBounds = allySpineBoy.spine.getBounds();
    const allyScale = targetH / (allyBounds.height || 100);
    allySpineBoy.view.scale.set(allyScale);
    // 位置 = 玩家左侧，比玩家高 2VH
    allySpineBoy.view.position.set(ALLY_BODY_X, allyY);
    allySpineBoy.view.zIndex = 1; // 玩家 zIndex=2，队友略低
    allySpineBoy.setDirection(1);
    worldContainer.addChild(allySpineBoy.view);
    allySpineBoy.playFight();

    // 注册队友到战斗逻辑（供播放攻击动画）
    setNpcAllySpine(allySpineBoy);

    // 👤 队友脚下阴影（战斗中补：纯 Spine 队友无主世界 shadow）
    if (allySpineBoy?.view) {
      const _allyShadow = new Graphics()
        .ellipse(0, 0, targetH * 0.3, targetH * 0.065)
        .fill({ color: 0x000000, alpha: 0.3 });
      _allyShadow.position.set(allySpineBoy.view.x, allyY + targetH * 0.53);
      _allyShadow.zIndex = 0; // 低于队友 view（zIndex=1）
      worldContainer.addChild(_allyShadow);
      window.__battleShadows = window.__battleShadows || [];
      window.__battleShadows.push(_allyShadow);
    }

    // 保存队友引用供屏幕坐标计算（战斗特效定位）
    window.__battleAlly = {
      spineBoy: allySpineBoy,
      view: allySpineBoy.view,
      id: ALLY_ID,
    };
  }

  // 👤 玩家脚下阴影（战斗中补：每帧跟随玩家 spine view 脚下；隐藏原 worker 阴影避免双影——地牢与地牢外统一）
  {
    const _pv = activePlayer?.spine?.view;
    if (_pv) {
      window.__battleShadowYOff = 11.8 * VH + 4; // 🎯 玩家影子 y 偏移（往下为正，只改这一处）
      console.log('[战斗影子] 创建 view=', !!_pv, 'pv=', _pv.x.toFixed(1) + ',' + _pv.y.toFixed(1), 'yOff=', window.__battleShadowYOff.toFixed(1), 'workerShadow=', activePlayer.shadow ? activePlayer.shadow.visible : 'null');
      const _pShadow = new Graphics()
        .ellipse(0, 0, 27 * VH * 0.3, 27 * VH * 0.065)
        .fill({ color: 0x000000, alpha: 0.3 });
      _pShadow.zIndex = 1; // 低于玩家 spine（zIndex=2）
      // 初始兜底位置（玩家脚下），即使 view 位置未刷新也先可见
      _pShadow.position.set(_pv.x, _pv.y + window.__battleShadowYOff);
      worldContainer.addChild(_pShadow);
      window.__battleShadows = window.__battleShadows || [];
      window.__battleShadows.push(_pShadow);
      window.__battlePlayerShadow = _pShadow;
      window.__battlePlayerShadowView = _pv;
      // 隐藏主世界 worker 阴影，避免双影错位/加深
      window.__battlePlayerShadowWasHidden = false;
      if (activePlayer.shadow) {
        window.__battlePlayerShadowWasHidden = !activePlayer.shadow.visible;
        activePlayer.shadow.visible = false;
      }
      // 每帧：直接跟随玩家 spine view 脚下（地牢/地牢外玩家显示位置一致，最可靠，不依赖 shadowData）
      if (!window.__battlePlayerShadowSync) {
        window.__battlePlayerShadowSync = () => {
          const _v = window.__battlePlayerShadowView;
          const _g = window.__battlePlayerShadow;
          if (!_g) return;
          if (_v && _v.parent) {
            _g.position.set(_v.x, _v.y + (window.__battleShadowYOff ?? (9.4 * VH + 4)));
            _g.scale.set(1);
            if (!window.__battleShadowLoggedOnce) {
              window.__battleShadowLoggedOnce = true;
              console.log('[战斗影子] 首次同步 view=', _v.x.toFixed(1) + ',' + _v.y.toFixed(1), 'shadow可见=', _g.visible, 'view可见=', _v.visible, 'shadowPos=', _g.x.toFixed(1) + ',' + _g.y.toFixed(1));
            }
          }
        };
        app.ticker.add(window.__battlePlayerShadowSync);
      }
    }
  }

  // 进入战斗：镜头调整（用战斗缩放，比主世界小一点，画面缩小、战场看得更全）
  viewport.setZoom(getBattleZoom());
  const vpScale = viewport?.scale?.x || 1.15;

  // 📍 固定战斗镜头：让镜头贴着背景图片最底部
  // 背景图片底部 = window.innerHeight（createWallObject 里 sprite.y = window.innerHeight - h，
  //   背景底边正好对齐到 window.innerHeight = 100*VH 世界 Y）
  // 屏幕底部世界 Y = camY + (screenHeight/2)/scale，要让屏幕最底部 = 背景底部：
  //   camY = window.innerHeight - (window.innerHeight/2)/vpScale
  const fixedCameraX = map.offsetX + WORLD_WIDTH * 0.48;
  const fixedCameraY = window.innerHeight - (window.innerHeight / 2) / vpScale;

  // 🎯 固定玩家 + 携带队友站位（封装成函数，战斗启动后还会兜底再执行一次，
  //    确保队友异步创建完成后也能被固定，杜绝「队友掉下去」）
  const fixBattleStance = () => {
    if (!activePlayer?.body) return;
    // ── 玩家 ──
    // ⚠️ 只保存一次原始碰撞 mask（TpMap 前已保存过则不覆盖，避免保存成 0）
    if (window.__battlePlayerMask == null) {
      window.__battlePlayerMask = activePlayer.body.collisionFilter.mask;
    }
    activePlayer.body.collisionFilter.mask = 0;
    if (activePlayer.body.parts && activePlayer.body.parts.length) {
      activePlayer.body.parts.forEach(p => { p.collisionFilter.mask = 0; });
    }
    Matter.Body.setPosition(activePlayer.body, {
      x: activePlayer.body.position.x,
      y: BATTLE_PLAYER_BODY_Y,
    });
    Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 });
    activePlayer.body.isSleeping = true; // 立即冻结，防止物理窗口期移动
    if (activePlayer.spine?.view) {
      activePlayer.spine.view.x = activePlayer.body.position.x;
      activePlayer.spine.view.y = activePlayer.body.position.y
        + ((activePlayer.data?.TopMap ?? 0) + (defaultMap?.TopMap ?? 0)) * VH;
    }

    // ── 携带队友（纯 Spine，无物理 body）──
    // 队友是纯显示对象，没有物理，只需让它的 Spine 位置跟随玩家左侧同水平线即可
    // 🎯 队友比玩家高 2VH
    const allyRef = window.__battleAlly;
    if (allyRef?.view) {
      allyRef.view.x = activePlayer.body.position.x - 10 * VW;
      allyRef.view.y = BATTLE_PLAYER_BODY_Y
        + ((allyBattleData?.TopMap ?? 0) + (defaultMap?.TopMap ?? 0)) * VH
        - 3 * VH;

      // 🎯 同步队友屏幕坐标到战斗特效层（供队友攻击发射动画定位）
      //   用镜头目标 + 缩放手动换算（与玩家 screenPos 同一套逻辑，稳定可靠）
      const camX2 = cameraTarget?.position?.x;
      const camY2 = cameraTarget?.position?.y;
      if (camX2 !== undefined && camY2 !== undefined) {
        const halfW2 = window.innerWidth / 2;
        const halfH2 = window.innerHeight / 2;
        const s2 = viewport?.scale?.x || 1;
        setNpcAllyScreenPos({
          x: halfW2 + (allyRef.view.x - camX2) * s2,
          y: halfH2 + (allyRef.view.y - camY2) * s2,
        });
      }
    }
  };

  // 立即固定一次（此时玩家已就绪；队友若已创建也会被固定）
  fixBattleStance();

  // 固定镜头 + 禁用控制
  fixCamera(fixedCameraX, fixedCameraY);
  // 💡 镜头立即中心移动到目标（不等待 follow 插件平滑滑动，Y 即刻固定）
  if (viewport && cameraTarget) {
    viewport.moveCenter(fixedCameraX, fixedCameraY);
  }
  disablePlayerControl();

  // 战斗开始：切换为战斗姿态动画（fight 动画速度 0.75）
  if (activePlayer?.spine) {
    activePlayer.spine.playFight(0.75);
  }

  // 延迟结束后才正式启动战斗（显示战斗UI）
  fightQidong(user);

  // 🔥 兜底：战斗启动后等队友彻底创建完成再固定一次（多帧后执行），
  //    确保无论队友异步创建何时完成，都不会掉下去
  setTimeout(fixBattleStance, 300);
  setTimeout(fixBattleStance, 1200);

  // 🔥 战斗 UI 已挂载（pixi.vue 已设置固定玩家坐标兜底），
  // 计算玩家/队友在战斗特效层（屏幕坐标）的真实位置，
  // 让玩家和队友攻击的特效/投射物从各自真实位置触发（而非固定坐标）
  // ⚠️ 不用 viewport.toScreen：它依赖 viewport 异步跟随的当前镜头状态，
  //    战斗镜头（cameraTarget）固定后跟随动画可能未完成，导致坐标漂移；
  //    这里用「镜头目标 + 缩放」手动换算，稳定可靠
  try {
    const vpScale = viewport?.scale?.x || 1;
    const camX = cameraTarget?.position?.x;
    const camY = cameraTarget?.position?.y;
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    const worldToScreen = (wx, wy) => ({
      x: halfW + (wx - camX) * vpScale,
      y: halfH + (wy - camY) * vpScale,
    });
    if (camX !== undefined && camY !== undefined) {
      // 玩家
      if (activePlayer?.view) {
        const ps = worldToScreen(activePlayer.view.x, activePlayer.view.y);
        setPlayerScreenPos({ x: ps.x, y: ps.y });
      }
      // 队友（纯 Spine，无物理 body，用 window.__battleAlly 引用）
      const allyRef2 = window.__battleAlly;
      if (allyRef2?.view) {
        const as = worldToScreen(allyRef2.view.x, allyRef2.view.y);
        setNpcAllyScreenPos({ x: as.x, y: as.y });
      }
    }
  } catch (e) {
    console.warn('战斗屏幕坐标计算失败', e);
  }

  // 等待入场动画播完（1.5s）再显示战斗界面
  await new Promise(resolve => setTimeout(resolve, 2000))
}
let cachedTriggerAreas = [];
let frameCount1 = 0
// 把所有玩家、NPC的位置数据发给Worker计算视图
const ACTIVE_DISTANCE = VW * 58; // npc可见距离（减少渲染范围，提升性能）
// ===== 双缓冲 ArrayBuffer：零 GC 的 transfer list 方案 =====
// Worker 处理 buffer A 时，主线程用 buffer B 写入下一帧
const BYTES_PER_ENTRY = 40;
const VIEW_BUF_SIZE = 1024 * 8;
let _viewBufA = new ArrayBuffer(VIEW_BUF_SIZE);
let _viewBufB = new ArrayBuffer(VIEW_BUF_SIZE);
let _useBufA = true; // 交替使用 A/B

// ===== 输出缓冲（worker 回传视图+影子，打包成 float 数组，transfer 往返复用零 GC）=====
// 每实体 12 个 float = 48 字节：view[0..5] + shadow[6..11]
// float[0] 预留存 count（Uint32）；实体数据从 float[1] 开始
// 用「空闲池」管理：发出时 transfer（主线程 detach），收到后放回池中复用。
// 若 worker 尚未归还导致池空，则临时新建一个（极端情况，不影响正确性）。
const VIEW_OUT_SIZE = 4 + 256 * 12 * 4; // 4字节 count + 256 * 48
const _viewOutPool = [
  new ArrayBuffer(VIEW_OUT_SIZE),
  new ArrayBuffer(VIEW_OUT_SIZE),
  new ArrayBuffer(VIEW_OUT_SIZE),
];

// ===== 主线程 view/shadow 对象池（复用，零 GC 分配）=====
// worker 回传的是打包 float，主线程每帧需要把这些还原成对象供 _viewMap/_shadowMap 使用。
// 复用池对象，避免每帧 new 数百个对象触发 GC。
const _viewPool = [];
const _shadowPool = [];
const _viewPoolSize = 256;
for (let i = 0; i < _viewPoolSize; i++) {
  _viewPool[i] = { id: 0, x: 0, y: 0, gravityVy: 0, isNear: false, showBubble: false };
  _shadowPool[i] = { id: 0, x: 0, y: 0, scale: 1, alpha: 1, groundFixedY: 0 };
}

// 传送触发器 buffer（模块级复用，避免每帧 new ArrayBuffer 导致 GC）
let _trigBuf = new ArrayBuffer(4 + 12 + 4 + 20 * 24);
// viewMap 复用实例（避免每帧 new Map() 触发 GC）
const _viewMap = new Map();
// shadowMap 复用实例（避免每帧 new Map() 触发 GC，配合 O(n²)→O(n) 优化）
const _shadowMap = new Map();

function sendAllToViewWorker() {
  if (!activePlayer || !activePlayer.body) return;

  const playerX = activePlayer.body.position.x;
  let entryCount = 0;

  // ✅ 双缓冲：这帧用 A，下帧用 B，transfer 后不 new
  const buf = _useBufA ? _viewBufA : _viewBufB;
  _useBufA = !_useBufA;
  // ✅ 输出缓冲从空闲池取（worker 尚未归还时 new 一个，极端情况兜底）
  const outBuf = _viewOutPool.length > 0 ? _viewOutPool.pop() : new ArrayBuffer(VIEW_OUT_SIZE);

  const view = new DataView(buf);
  view.setUint32(0, 0, true);
  let wo = 4;

  // 内联写入函数：直接操作 DataView，零临时对象分配
  function we(id, x, y, ph, th, xt, sb, vy, og, tf) {
    if (wo + BYTES_PER_ENTRY > VIEW_BUF_SIZE) return;
    view.setUint32(wo, id, true);
    view.setFloat32(wo + 4, x, true);
    view.setFloat32(wo + 8, y, true);
    view.setFloat32(wo + 12, ph, true);
    view.setFloat32(wo + 16, th, true);
    view.setFloat32(wo + 20, xt, true);
    view.setUint8(wo + 24, sb ? 1 : 0);
    view.setFloat32(wo + 28, vy, true);
    view.setUint8(wo + 32, og ? 1 : 0);
    view.setUint8(wo + 33, tf);
    wo += BYTES_PER_ENTRY;
    entryCount++;
  }

  // 🧮 视距剔除已移入 Worker（computeAllViews 里算 isNear），主线程只负责把
  //    所有激活 NPC 都发给 worker；不再在主线程做距离判断/按可见性跳过
  for (const n of npcs) {
    if (!n || !n.body || !n.active) continue;
    // ✅ 脚本显式隐藏的 NPC 仍要发给 worker（保持 id 对应关系），但不显示
    we(n.body.id, n.body.position.x, n.body.position.y,
      n.playerH ?? 10, n.data?.TopMap ?? 0,
      0, n.showBubble ?? false,
      n.body.velocity.y, n.isOnGround ? 1 : 0, 0);
  }

  we(activePlayer.body.id, activePlayer.body.position.x, activePlayer.body.position.y,
    activePlayer.playerH, activePlayer.data?.TopMap ?? 0,
    0, activePlayer.showBubble ?? false,
    activePlayer.body.velocity.y, activePlayer.isOnGround ? 1 : 0, 1);

  view.setUint32(0, entryCount, true);

  // 🎯 玩家阴影「参考物 = spine 角色」：脚底偏移 = spine 视觉脚底 - body 中心（实测 6.5VH 稳定）
  //    （spine 骨骼原点在角色中下部，站立时 spine 脚底精确压在主地面顶面；
  //      Matter body 质心/物理脚底（80px）不作为参考，避免与视觉脚底错位）
  //    ⚠️ 不适用 getBounds().maxY：spine 动态 bounds 包含尾巴/衣摆等最低点（实测 853），
  //       不是站立脚底（813），因此用实测稳定的 6.5VH。
  const playerFootOffset = 6.5 * VH;

  // ✅ 双缓冲 transfer：零拷贝 + 零 GC
  physicsWorker.postMessage({
    type: 'computeAllViews',
    buffer: buf,
    count: entryCount,
    VH,
    currentMapTopMap: defaultMap?.TopMap ?? 0,
    currentGroundY,
    // 🧮 视距剔除距离判断交给 worker：传入玩家 X + 判定距离
    playerX,
    activeDistance: ACTIVE_DISTANCE,
    playerFootOffset,
    // ✅ 重力已由 Matter 引擎驱动，不再传给 worker
    // ✅ 输出缓冲：worker 打包写入后 transfer 回传，主线程读取
    outBuffer: outBuf,
  });
  // ✅ 不再 transfer，双缓冲原地复用，0 GC 分配

  // ---------------- 传送触发器 二进制版（buffer 复用） ----------------
  frameCount1++;
  if (frameCount1 % 10 === 0 && cachedTriggerAreas.length > 0) {
    const p = activePlayer.body.position;
    const ph = activePlayer.playerH;
    const trigCount = cachedTriggerAreas.length;

    // 按需扩容
    const need = 4 + 12 + 4 + trigCount * 24;
    if (_trigBuf.byteLength < need) _trigBuf = new ArrayBuffer(need);
    const v = new DataView(_trigBuf);

    v.setUint32(0, 1, true);
    v.setFloat32(4, p.x, true);
    v.setFloat32(8, p.y, true);
    v.setFloat32(12, ph, true);
    v.setUint32(16, trigCount, true);
    for (let i = 0; i < trigCount; i++) {
      const t = cachedTriggerAreas[i];
      const o = 20 + i * 24;
      v.setFloat32(o, t.x, true);
      v.setFloat32(o + 4, t.y, true);
      v.setFloat32(o + 8, t.w, true);
      v.setFloat32(o + 12, t.h, true);
      v.setFloat32(o + 16, t.offsetX, true);
      v.setUint32(o + 20, i, true);
    }

    physicsWorker.postMessage({ type: 'checkTriggers', buffer: _trigBuf });
    // ✅ 不再 transfer，_trigBuf 原地复用，0 GC 分配
  }
}
let MAP_BOUNDS = null;

/**
 * 获取当前地图的镜头边界（clamp 范围）
 * 🎯 优化：改为按「当前地图」取边界，而不是用 playerX 在所有地图边界里匹配。
 *    支持所有地图 offsetX=0（靠传送切换）——若地图宽度不同，playerX 匹配会选错边界。
 */
function getCurrentMapClampBounds(playerX) {
  const curMap = user.pixi.mapDataList?.find(m => m.id === currentMapId);
  if (curMap) {
    return { left: curMap.offsetX, right: curMap.offsetX + curMap.realWidth };
  }
  return { left: 0, right: WORLD_WIDTH };
}

// ==================== 🧸 道具放置器：坐标转换 / 校验 / 放置（纯视觉，无碰撞无实体） ====================

// 屏幕坐标（clientX/clientY）→ 世界坐标（适配 resolution / autoDensity 缩放）
function screenToWorld(clientX, clientY) {
  const rect = app?.canvas?.getBoundingClientRect();
  if (!rect || !viewport) return { x: 0, y: 0 };
  const sx = (clientX - rect.left) / rect.width * app.screen.width;
  const sy = (clientY - rect.top) / rect.height * app.screen.height;
  // pixi-viewport 版本差异：优先 toWorld，缺失则手动换算
  if (typeof viewport.toWorld === 'function') return viewport.toWorld(sx, sy);
  return {
    x: viewport.left + (sx / viewport.screenWidth) * viewport.worldScreenWidth,
    y: viewport.top + (sy / viewport.screenHeight) * viewport.worldScreenHeight,
  };
}

// 校验放置位置：① 只能在地图内 ② 不与 NPC 重叠 ③ 不与物件重叠 ④ 不与已放置的道具重叠
// 返回 null=通过，否则为错误文案
function validatePropPosition(worldX, worldY, radiusVh) {
  const VH_ = window.VH;
  const curMap = user.pixi.mapDataList?.find(m => m.id === currentMapId);
  if (!curMap) return '找不到当前地图';
  // ① 地图内（宽 [offsetX, offsetX+realWidth]，高 [0, 100*VH]）
  const left = curMap.offsetX ?? 0;
  const right = left + (curMap.realWidth ?? WORLD_WIDTH);
  if (worldX < left || worldX > right || worldY < 0 || worldY > 100 * VH_) return '只能放置在地图内';
  const pr = (radiusVh ?? 1) * VH_;

  // 🧍 角色「视觉位置」的 y（body.y + TopMap*VH，与 physics.worker 的 view.y 公式一致）。
  //    ⚠️ 重叠检测必须对着「屏幕上看到的角色」：白朔(TopMap+5)、狐狸(TopMap-7) 等
  //       NPC 的 body 和视觉差好几个 VH，用 body.y 检测会漏检（道具能怼进 NPC 身体里）。
  const topMapTotal = (defaultMap?.TopMap ?? 0) * VH_;
  const charVisualY = (c) => (c?.body
    ? c.body.position.y + ((c.data?.TopMap ?? 0) * VH_ + topMapTotal)
    : NaN);

  // ② 不与 NPC 重叠（视觉位置 + 宽松半径；隐藏的 NPC 不阻挡放置）
  for (const npc of npcPool) {
    if (!npc?.body || npc.mapId !== currentMapId) continue;
    if (npc.view && npc.view.visible === false) continue; // 隐藏 NPC 不阻挡
    const dx = worldX - npc.body.position.x;
    const dy = worldY - charVisualY(npc);
    const npcR = Math.max(1.5 * VH_, (npc.playerH ?? 20) / 4);
    if (dx * dx + dy * dy < ((pr + npcR) * OVERLAP_MARGIN) ** 2) return '与 NPC 重叠，请换个位置';
  }
  // ②.5 不与玩家重叠（视觉位置，不能把道具放在自己身上）
  if (activePlayer?.body) {
    const dx = worldX - activePlayer.body.position.x;
    const dy = worldY - charVisualY(activePlayer);
    const playerR = Math.max(1.5 * VH_, (activePlayer.playerH ?? 20) / 4);
    if (dx * dx + dy * dy < ((pr + playerR) * OVERLAP_MARGIN) ** 2) return '与角色重叠，请换个位置';
  }
  // ③ 不与物件（地形/障碍）重叠：点到刚体 AABB 的最短距离
  //    ⚠️ 不能用 getBodyRadius（max(w,h)/2）：细长刚体（如 200VH 高的左右边界墙）
  //       会被圆判成半径 100VH 的巨大障碍 → 出生点附近整片地图都放不了。
  //       AABB 距离 = 到物体表面的距离，细长物体只挡它自己那一小条。
  const objs = wuti.get(currentMapId) || [];
  for (const obj of objs) {
    if (!obj?.body?.bounds) continue;
    const b = obj.body.bounds;
    const dx = Math.max(b.min.x - worldX, 0, worldX - b.max.x);
    const dy = Math.max(b.min.y - worldY, 0, worldY - b.max.y);
    if (dx * dx + dy * dy < (pr * OVERLAP_MARGIN + VH_) ** 2) return '与物件重叠，请换个位置';
  }
  // ④ 不与已放置的道具重叠（道具之间至少相隔 2×radius×安全系数；只算当前地图的道具）
  for (const p of propPlacerState.placed) {
    if ((p.mapId || 'desert_01') !== currentMapId) continue;
    const dx = worldX - p.x;
    const dy = worldY - p.y;
    if (dx * dx + dy * dy < (pr * 2 * OVERLAP_MARGIN) ** 2) return '与已放置的道具重叠，请换个位置';
  }
  return null;
}

// 创建道具视图（+ 可选刚体），并登记到已放置列表
// 创建道具视图（+ 可选刚体 + 可选头顶浮动问号），并登记到已放置列表
// options.qmConsumed = true 时不再生成问号（读档时问号已被永久消耗）
function createPropView(def, worldX, worldY, options = {}) {
  try {
    const spine = createSpineBoy({}, { juese: def.skeleton, skin: def.skin || undefined });
    spine.view.batchable = true;
    const bounds = spine.spine.getBounds();
    const h = (def.height ?? 2) * window.VH;
    const scale = bounds.height > 0 ? h / bounds.height : 1;
    spine.view.scale.set(scale);
    // 以点击点为中心放置（脚底大致贴地）
    spine.view.position.set(worldX, worldY - (bounds.height * scale) / 2);
    spine.view.zIndex = Math.round(worldY); // 按世界 y 排序，与角色正确穿插

    // 🎬 初始放置动画：
    //    - 有 fangzhi + 有 idle → 两者「叠加」播放（track0 idle 循环打底 + track1 fangzhi 一次性叠加），
    //      fangzhi 播完 → 清掉 fangzhi 轨道，只留 idle 循环
    //    - 只有 fangzhi → 播一次，播完停在该动画结束帧（静态）
    //    - 只有 idle → 直接循环 idle
    //    - 都没有 → 静态物品
    //    ⚠️ 先 clearTracks 清掉 createSpineBoy 创建时在 track1 叠加的「animation」混合动画，
    //       避免和我们的轨道混在一起。
    try {
      const animNames = spine.spine.skeleton?.data?.animations || [];
      const hasFangzhi = animNames.some(a => a.name === 'fangzhi');
      const hasIdle = animNames.some(a => a.name === 'idle');
      spine.spine.state.clearTracks();
      if (hasFangzhi && hasIdle) {
        // 叠加：idle 打底 + fangzhi 一次性叠在上面
        spine.spine.state.setAnimation(0, 'idle', true);
        const entry = spine.spine.state.setAnimation(1, 'fangzhi', false);
        entry.listener = {
          complete: () => {
            // fangzhi 播完 → 只保留 idle（移除叠加轨道）
            spine.spine.state.clearTrack(1);
          },
        };
      } else if (hasFangzhi) {
        // 只有 fangzhi：播一次，播完停在结束帧（静态）
        spine.spine.state.setAnimation(0, 'fangzhi', false);
      } else if (hasIdle) {
        spine.spine.state.setAnimation(0, 'idle', true);
      }
    } catch (e) {
      console.warn('[道具放置动画] 播放失败', def.key, e);
    }

    propContainer.addChild(spine.view);

    // 🧱 可碰撞道具：创建静态刚体（不可碰撞则纯视觉、无实体）
    let body = null;
    if (def.collidable) {
      const bw = Math.max((bounds.width * scale) || 10, 4);
      const bh = Math.max((bounds.height * scale) || 10, 4);
      body = Matter.Bodies.rectangle(worldX, worldY - bh / 2, bw, bh, {
        isStatic: true,
        friction: 0, frictionStatic: 0, frictionAir: 0,
        label: 'propBody',
        collisionFilter: {
          category: COLLISION_GROUPS.OBSTACLE,
          mask: COLLISION_GROUPS.FRIEND | COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.BULLET | COLLISION_GROUPS.SENSOR,
        },
      });
      Matter.World.add(world, body);
    }

    const id = 'prop_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    _propViews.set(id, spine.view);
    if (body) _propBodies.set(id, body);
    propPlacerState.placed.push({
      id,
      key: def.key,
      label: def.label,
      skeleton: def.skeleton,
      x: Math.round(worldX),
      y: Math.round(worldY),
      collidable: !!def.collidable,
      qmConsumed: !!options.qmConsumed,
      mapId: options.mapId || currentMapId, // 🗺️ 道具归属地图（读档恢复用存档里的 mapId）
    });

    // 🧸 道具头顶浮动问号（可配置 show / wuxian / scale / offsetY / onClick）
    //    读档恢复时按配置重新生成；被「永久消失」过的问号（qmConsumed）不再生成
    if (def.questionMark?.show && !options.qmConsumed) {
      const fxH = Math.max((bounds.height * scale) || 10, 4);
      const qmY = worldY - fxH - ((def.questionMark.offsetY ?? 0) * window.VH);
      const qm = wenhaoHudong(worldX, qmY, 0, 0, {
        textureName: 'question',
        show: true,
        wuxian: def.questionMark.wuxian ?? 0,
        isFloatEnable: true,
        scale: def.questionMark.scale ?? 1,
        onClick: (mark) => {
          // ① 调用用户配置的点击函数
          try { def.questionMark.onClick?.(mark, { propId: id, def, x: worldX, y: worldY }); } catch (e) {
            console.error('[道具问号] onClick 异常', e);
          }
          // ② 问号被「永久消失」时（wuxian 已为 0 且未在临时隐藏中）记录到存档，读档不再生成
          if (mark.wuxian === 0 && !mark.locked) {
            const rec = propPlacerState.placed.find(p => p.id === id);
            if (rec) rec.qmConsumed = true;
          }
        },
        wenhaoId: id,
        mapId: currentMapId,
      }, WallScale, hudMarkContainer, Assets, Sprite);
      if (qm?.mark) _propQms.set(id, qm.mark);
    }

    return true;
  } catch (e) {
    console.error('[道具放置] 创建失败', e);
    return false;
  }
}

// 📂 读档恢复：只恢复「当前地图」的已放置道具（其他地图的道具数据保留在存档里，
//    切到那张地图时由 rebuildPlacedPropsForCurrentMap 恢复显示）
//    旧存档没有 mapId 的项 → 迁移归唯一可放置地图 desert_01
function restorePlacedProps() {
  const saved = user.pixi.placedProps || [];
  for (const p of saved) {
    const mapId = p.mapId || 'desert_01'; // 旧存档迁移
    if (mapId !== currentMapId) continue; // 只恢复当前地图
    const def = SPINE_PROP_DEFS.find(d => d.key === p.key);
    if (!def) continue;
    if (typeof p.x !== 'number' || typeof p.y !== 'number') continue;
    createPropView(def, p.x, p.y, { qmConsumed: !!p.qmConsumed, mapId });
  }
}

// 🗺️ 切图后重建「当前地图」的已放置道具（销毁旧地图残留的视图/刚体/问号，再恢复当前地图的）。
//    注意：placed 列表全局保留（含所有地图），这里只动视图层；placed 记录同步重建（id 更新）。
function rebuildPlacedPropsForCurrentMap() {
  // 1. 销毁当前场景中所有道具视图 / 刚体 / 问号
  for (const [, view] of _propViews) {
    try { view.destroy?.({ children: true, texture: false }); } catch (e) { }
  }
  _propViews.clear();
  for (const [, body] of _propBodies) {
    try { Matter.World.remove(world, body); } catch (e) { }
  }
  _propBodies.clear();
  for (const [id, mark] of _propQms) {
    try { mark.destroy?.({ children: true }); } catch (e) { }
    try { emitter.emit('removeWenhaoHudong', { mapId: currentMapId, wenhaoId: id }); } catch (e) { }
  }
  _propQms.clear();

  // 2. 重建当前地图的道具（从 placed 记录重建，保持 id 与视图一一对应）
  const cur = currentMapId;
  const items = propPlacerState.placed.filter(p => (p.mapId || 'desert_01') === cur);
  for (const p of items) {
    const idx = propPlacerState.placed.findIndex(r => r.id === p.id);
    if (idx > -1) propPlacerState.placed.splice(idx, 1);
    const def = SPINE_PROP_DEFS.find(d => d.key === p.key);
    if (def) createPropView(def, p.x, p.y, { qmConsumed: !!p.qmConsumed, mapId: p.mapId });
  }
}

// ==================== 🧸 透明预览放置（贴地跟随，点击确认） ====================
// 重叠检测安全系数：值越大，道具之间 / 与 NPC、物件的安全距离越大（1.4 = 多留 40%）
const OVERLAP_MARGIN = 2;

// 某世界 x 处的地面顶部 y（高度图优先，兜底用地图基准地面）——保证不浮空
function getGroundYAtWorldX(worldX) {
  let gy = getGroundYAt(currentHeightMapId, worldX);
  if (gy == null) gy = currentGroundY * window.VH;
  return gy;
}

// 世界 x 限制：地图范围内 + 玩家周围 30vw 内（放置不能离玩家太远）
function clampGhostX(worldX) {
  let x = worldX;
  const curMap = user.pixi.mapDataList?.find(m => m.id === currentMapId);
  if (curMap) {
    const left = curMap.offsetX ?? 0;
    const right = left + (curMap.realWidth ?? WORLD_WIDTH);
    x = Math.min(right, Math.max(left, x));
  }
  // 🧸 只能放在玩家周围 30vw 内（移动端摇杆范围也是这个）
  const px = activePlayer?.body?.position?.x;
  if (px != null) {
    const range = 0.30 * window.innerWidth;
    x = Math.min(px + range, Math.max(px - range, x));
  }
  return x;
}

// 开始放置：创建半透明预览（默认贴地，桌面端初始跟随鼠标、移动端在玩家脚下）
function startGhostPlacement(def) {
  cleanupGhost();
  if (!def) return;

  try {
    const spine = createSpineBoy({}, { juese: def.skeleton, skin: def.skin || undefined });
    spine.view.batchable = true;
    const bounds = spine.spine.getBounds();
    const h = (def.height ?? 2) * window.VH;
    const scale = bounds.height > 0 ? h / bounds.height : 1;
    spine.view.scale.set(scale);
    spine.view.alpha = 0.4; // 🧸 半透明预览
    spine.view.zIndex = 100000; // 最上层，清晰可见
    spine.view._fxHeight = bounds.height * scale; // 记录显示高度（贴地用）
    // 地面定位环：明确显示"将放置在这里"（半径加大，匹配更大的不可重叠检测范围）
    const ring = new Graphics()
      .ellipse(0, 0, (def.radius ?? 1) * 2.4 * window.VH, (def.radius ?? 1) * 0.9 * window.VH)
      .fill({ color: 0xffc107, alpha: 0.25 })
      .stroke({ width: 2, color: 0xffc107, alpha: 0.9 });
    ring.zIndex = 100000;
    // 🚫 重叠警示红色光柱（不可放置时显示；更高更宽更醒目）
    const colH = 8 * window.VH;
    const colW = 3.5 * window.VH;
    const redColumn = new Graphics()
      .rect(-colW / 2, -colH, colW, colH)
      .fill({ color: 0xff3333, alpha: 0.4 })
      .stroke({ width: 2, color: 0xff0000, alpha: 1 });
    redColumn.zIndex = 100000;
    redColumn.visible = false;
    // ⚠️ 预览加到最顶层容器（spineFrontContainer 位于角色/地形之上），不被地形遮挡
    spineFrontContainer.addChild(spine.view);
    spineFrontContainer.addChild(ring);
    spineFrontContainer.addChild(redColumn);

    _ghostView = spine.view;
    _ghostRing = ring;
    _ghostRedColumn = redColumn;
    _ghostDef = def;

    // 🧸 初始位置：
    //   移动端 = 玩家脚下（立即显示，摇杆调整）
    //   桌面端 = 预览隐藏，首次移动鼠标才定位显示（避免出现在"鼠标所在的面板/屏幕最右侧"等意外位置）
    if (isTouchDevice) {
      let x = activePlayer?.body?.position?.x;
      if (x == null) {
        const curMap = user.pixi.mapDataList?.find(m => m.id === currentMapId);
        x = (curMap?.offsetX ?? 0) + (curMap?.realWidth ?? WORLD_WIDTH) / 2;
      }
      x = clampGhostX(x);
      positionGhost(x, getGroundYAtWorldX(x)); // y 恒贴地，禁止浮空
      propPlacerState.message = `放置「${def.label}」：摇杆左右调整 · 点「放置」确认`;
    } else {
      spine.view.visible = false;
      ring.visible = false;
      propPlacerState.message = `放置「${def.label}」：移动鼠标定位 · 点击确认 · Esc 取消`;
    }
  } catch (e) {
    console.error('[道具预览] 创建失败', e);
    cleanupGhost();
    propPlacerState.message = '❌ Spine 资源不可用';
  }
}

// 定位预览到 (x, 贴地 y)，并显示；同时实时校验：重叠/越界 → 显示红色光柱（禁止放置）
function positionGhost(x, gy) {
  if (!_ghostView) return;
  _ghostView.position.set(x, gy - ((_ghostView._fxHeight ?? 0) / 2));
  if (_ghostRing) _ghostRing.position.set(x, gy + 2);
  if (_ghostRedColumn) _ghostRedColumn.position.set(x, gy);
  _ghostX = x;
  if (!_ghostView.visible) {
    _ghostView.visible = true;
    if (_ghostRing) _ghostRing.visible = true;
  }

  // 🚫 位置校验：重叠/越界 → 红柱警示 + 隐藏金环；合法 → 金环
  const err = validatePropPosition(x, gy, _ghostDef?.radius);
  const invalid = !!err;
  if (_ghostRedColumn) _ghostRedColumn.visible = invalid;
  if (_ghostRing) _ghostRing.visible = !invalid;
  if (invalid) {
    propPlacerState.message = '🚫 ' + err + '（无法放置）';
  } else {
    propPlacerState.message = `放置「${_ghostDef?.label}」：${isTouchDevice ? '摇杆左右调整' : '移动鼠标定位'} · 点击确认 · Esc 取消`;
  }
}

// 移动预览到指定世界 x（y 始终贴地，禁止浮空）
function moveGhostToX(worldX) {
  if (!_ghostView || !_ghostDef) return;
  const x = clampGhostX(worldX);
  const gy = getGroundYAtWorldX(x);
  positionGhost(x, gy);
}

// 左右键微调（尚未定位时以玩家位置为起点）
function moveGhostBy(dx) {
  if (!_ghostView || !_ghostDef) return;
  const base = _ghostX ?? (activePlayer?.body?.position?.x ?? 0);
  moveGhostToX(base + dx);
}

// 点击确认：校验通过 → 移除预览 → 正式放置（预览未显示过则忽略，防止误触）
function confirmGhostPlacement() {
  if (!_ghostDef || !_ghostView || !_ghostView.visible) return;
  const def = _ghostDef;
  // 🗺️ 地图白名单兜底校验（理论上 openPropPlacer 已拦截，这里防止绕过）
  if (!PROP_PLACE_MAPS.includes(currentMapId)) {
    propPlacerState.message = `🚫 当前地图不能放置道具（仅 ${PROP_PLACE_MAPS.join('、')} 可放置）`;
    ElMessText('当前地图不能放置道具', 'warning');
    disarmProp();
    return;
  }
  // 材料校验：不足则不可放置（确认时兜底，卡片已按 affordable 禁用）
  if (!propAffordable(def)) {
    const need = propCostText(def);
    propPlacerState.message = '❌ 材料不足：需要 ' + need;
    ElMessText('材料不足，无法放置：需要 ' + need, 'warning');
    return;
  }
  const gy = getGroundYAtWorldX(_ghostX);
  const err = validatePropPosition(_ghostX, gy, def.radius);
  if (err) {
    propPlacerState.message = '❌ ' + err;
    ElMessText(err, 'warning');
    return;
  }
  if (createPropView(def, _ghostX, gy)) {
    // 放置成功 → 消耗背包材料（读档恢复不重复消耗）
    consumePropCost(def);
    propPlacerState.message = `✅ 已放置「${def.label}」(${Math.round(_ghostX)}, ${Math.round(gy)})`;
  } else {
    propPlacerState.message = '❌ Spine 资源不可用';
    ElMessText('道具 Spine 资源加载失败', 'warning');
  }
  // 放置完成：移除预览并取消放置模式
  disarmProp(); // 触发 armed watcher → cleanupGhost
}

// 取消放置：销毁预览 + 取消选择
function cancelGhostPlacement() {
  disarmProp();
}

// 销毁透明预览 / 定位环 / 红色光柱
function cleanupGhost() {
  if (_ghostView) {
    try { _ghostView.destroy?.({ children: true, texture: false }); } catch (e) { }
    _ghostView = null;
  }
  if (_ghostRing) {
    try { _ghostRing.destroy?.({ children: true, texture: false }); } catch (e) { }
    _ghostRing = null;
  }
  if (_ghostRedColumn) {
    try { _ghostRedColumn.destroy?.({ children: true, texture: false }); } catch (e) { }
    _ghostRedColumn = null;
  }
  _ghostDef = null;
}
//根据传送点名称传送

function teleportByName() {
  emitter.off("teleportByName");
  emitter.on('teleportByName', async (triggerName) => {
    // console.log('triggerName=', triggerName);

    // 根据不同名字 跳不同地图+坐标
    let map;
    let tpPosition;

    switch (triggerName) {
      // TP0 → 传送回 第一张地图
      case "TP0":
        map = user.pixi.mapDataList.find(m => m.id === "desert_01");
        WORLD_WIDTH = map.realWidth;
        tpPosition = map.offsetX + WORLD_WIDTH * 0.02

        await TpMap("desert_01", tpPosition);
        // TpMap 完成后 NPC 池已重建，再查找并移动 NPC
        const maomiNpc0 = npcPool.find(n => n.data?.id === 4);
        if (maomiNpc0 && maomiNpc0.body) {
          const npcMap0 = user.pixi.mapDataList.find(m => m.id === maomiNpc0.mapId);
          const targetX0 = npcMap0
            ? npcMap0.offsetX + npcMap0.realWidth * 0.97
            : viewport.right - 50;
          moveNpcToX(maomiNpc0, targetX0, Matter, app, activePlayer, {
            speed: 1,
            waitForPlayer: true,
            maxDistance: 25 * VW,
            resumeDistance: 20 * VW,
          });
        }
        break;

      case "TP1":
        user.playBgm('senlin', 0.25)
        user.pixi.gameUi = false
        map = user.pixi.mapDataList.find(m => m.id === "desert_01");
        WORLD_WIDTH = map.realWidth;
        tpPosition = map.offsetX + WORLD_WIDTH * 0.6
        TpMap("desert_01", tpPosition);
        break;
    }
  });
}
let frame = 0;
let ACTIVE_MARK_DIST = VW * 15;
// wenhao 预分配 buffer（最大浮标数），每7帧复用
const MAX_MARKS = 60;
// 🎯 问号跟随指定 NPC 头顶：把绑定了 followNpcId 的浮空问号，每帧同步到 NPC 渲染位置上方
//    （mark.x / mark.y 即 PIXI 渲染位置；NPC 移动/转身时问号始终贴着头顶，浮动由 worker 继续围绕 baseY）
function syncFollowMarks() {
  if (!floatingMarks.length || !_npcPool.length) return;
  for (let i = 0; i < floatingMarks.length; i++) {
    const mark = floatingMarks[i];
    const npcId = mark.followNpcId;
    if (npcId == null) continue;
    const npc = _npcPool.find(n => (n.data?.id ?? n.data?.data?.id) === npcId);
    if (!npc?.view) continue;
    const topY = npc.view.y - (mark.followOffsetY ?? 45);
    mark.x = npc.view.x;
    mark.baseY = topY;
    mark.maxBaseY = topY + 8;
    mark.minBaseY = topY - 8;
    mark.y = topY;
  }
}

const MARK_BYTES = 4 * 11;
let _markBuf = new ArrayBuffer(4 + MAX_MARKS * MARK_BYTES);
//浮动问号 修复字节对齐+接收Worker返回Y+正常浮动显示
function updateWenhao() {
  if (++frame % 7 !== 0) return;
  if (!activePlayer || !activePlayer.body) return;

  const px = activePlayer.body.position.x;
  const py = activePlayer.body.position.y;

  const count = floatingMarks.length;
  if (count === 0) return;

  const needSize = 4 + count * MARK_BYTES;
  if (_markBuf.byteLength < needSize) {
    _markBuf = new ArrayBuffer(needSize);
  }
  const view = new DataView(_markBuf);
  view.setUint32(0, count, true);

  for (let i = 0; i < count; i++) {
    const m = floatingMarks[i];
    const off = 4 + i * MARK_BYTES;

    view.setFloat32(off + 0, m.x ?? 0, true);
    view.setFloat32(off + 4, m.baseY ?? m.y, true);
    view.setFloat32(off + 8, m.y ?? 0, true);

    // 严格4字节对齐！uint8占1位，后面补3位对齐float
    view.setUint8(off + 12, m.locked ? 1 : 0);
    view.setUint8(off + 13, 0);
    view.setUint8(off + 14, 0);
    view.setUint8(off + 15, 0);

    view.setUint8(off + 16, m.isFloatEnable ? 1 : 0);
    view.setFloat32(off + 20, m.speed ?? 0, true);
    view.setInt8(off + 24, m.direction ?? 1, true);
    view.setFloat32(off + 28, m.maxBaseY ?? 0, true);
    view.setFloat32(off + 32, m.minBaseY ?? 0, true);
    view.setFloat32(off + 36, m.detectWidth > 0 ? m.detectWidth * VW : 0, true);
    view.setUint8(off + 40, m.onlyXDetect ? 1 : 0);
  }

  physicsWorker.postMessage(
    { type: 'updateWenhao', buffer: _markBuf, px, py, ACTIVE_MARK_DIST }
  );
  // ✅ 不再 transfer，_markBuf 原地复用，0 GC 分配
}
let currentLight = null;
let originalFixedTime = null; // 保存地图原始的fixedTime配置
let isMapTransitioning = false; // 地图切换过渡锁，防止重复触发
let _tpQueue = Promise.resolve(); // 🛡️ TpMap 串行队列：保证任意时刻只有一个地图切换在执行
let currentMapId = 'desert_01'; // 当前所在地图ID，用于存档

// 🎥 缩放（主世界）：统一固定值，移动端/电脑端角色占屏比例一致
//    zoom 决定角色占屏高比例 = 27 * zoom / 100。
//    电脑端原 1.4 偏大、移动端 1.3 偏小 → 取中间 1.35，两端一致且都合适（角色占屏高 ~36%）
const BASE_ZOOM = 1.35;
function getBaseZoom() {
  return BASE_ZOOM;
}

// ⚔️ 缩放（战斗）：比主世界更小一点，让战斗画面缩小（敌人/战场看得更全）
const BATTLE_ZOOM = 1.15;
// 👤 清理战斗专用脚下阴影（玩家 + 队友），战斗结束 / 重复进入战斗时调用
function _clearBattleShadows() {
  const arr = window.__battleShadows || [];
  arr.forEach(g => {
    try { if (g?.parent) g.parent.removeChild(g); g?.destroy?.({ children: true }); } catch (e) { /* ignore */ }
  });
  window.__battleShadows = [];
}
function getBattleZoom() {
  return BATTLE_ZOOM;
}

// 🗺️ 已加载运行时数据（刚体/问号）的地图集合：
//   用于 TpMap 时「只清理已加载但非目标」的地图，避免每次遍历所有地图全量清理
const _loadedMapIds = new Set();

/**
 * 清理指定地图的所有运行时数据（用于切换地图时重构）
 * 「优化版」：批量移除 Matter 刚体，减少物理引擎内部遍历次数
 * @param {string} mapId - 要清理的地图ID
 */
function clearMapRuntimeData(mapId) {
  // 1. 删除该地图的所有 NPC（包含物理 body 移除）
  removeNPCsByMapId(mapId, Matter, world, app);

  // 2. 批量删除该地图的物理刚体
  // ⚠️ 兼容清理：历史上 loadMapData 创建地形时没传 mapId，刚体被存到 wuti.get(undefined)，
  //    导致 clearMapRuntimeData(具体地图id) 永远清不到 → 切图后旧地图刚体残留（如空气墙）。
  //    这里把 undefined 残留一并清掉（Matter body 从 world 移除 + 销毁视图对象）
  const staleKeys = [...wuti.keys()].filter(k => k == null); // undefined / null
  for (const key of staleKeys) {
    const staleList = wuti.get(key);
    if (staleList && staleList.length > 0) {
      const bodies = [];
      const objs = [];
      for (let i = staleList.length - 1; i >= 0; i--) {
        const obj = staleList[i];
        if (obj && obj.body) bodies.push(obj.body);
        if (obj && obj.destroy) objs.push(obj);
      }
      if (bodies.length > 0) {
        try { Matter.World.remove(world, bodies); } catch (e) { }
      }
      for (const obj of objs) {
        try { obj.destroy(); } catch (e) { }
      }
    }
    wuti.delete(key);
  }

  // 3. 批量删除该地图的物理刚体
  const wutiList = wuti.get(mapId);
  if (wutiList && wutiList.length > 0) {
    const bodiesToRemove = [];
    const objectsToDestroy = [];
    for (let i = wutiList.length - 1; i >= 0; i--) {
      const obj = wutiList[i];
      if (obj && obj.body) bodiesToRemove.push(obj.body);
      if (obj && obj.destroy) objectsToDestroy.push(obj);
    }
    // ✅ 批量移除：一次调用减少 Matter 内部 O(n²) 遍历
    if (bodiesToRemove.length > 0) {
      try { Matter.World.remove(world, bodiesToRemove); } catch (e) { }
    }
    // 销毁视图对象
    for (const obj of objectsToDestroy) {
      try { obj.destroy(); } catch (e) { }
    }
    wuti.delete(mapId);
  }

  // 3. 清理该地图的浮动问号（floatingMarks）
  // ✅ filter 替代 splice，避免多次数组重排
  const before = floatingMarks.length;
  for (let i = floatingMarks.length - 1; i >= 0; i--) {
    const mark = floatingMarks[i];
    if (mark.mapId === mapId) {
      if (mark.parent) mark.parent.removeChild(mark);
      try { mark.destroy(); } catch (e) { }
    }
  }
  // 一次性过滤（只遍历一次 + 一次赋值）
  const filtered = floatingMarks.filter(m => m.mapId !== mapId);
  floatingMarks.length = 0;
  floatingMarks.push(...filtered);
}

/**
 * 删除除当前地图外的所有其他地图数据
 * @param {string} keepMapId - 要保留的地图ID
 */
function removeOtherMapsData(keepMapId) {
  const allMaps = user.pixi.mapDataList || [];
  for (const map of allMaps) {
    if (map.id === keepMapId) continue;
    clearMapRuntimeData(map.id);
  }
}

// 🎯 阴影跟随脚下表面：把当前地图所有可站立矩形（顶面 + 水平范围）推送给 worker
//    worker 据此计算每个实体正下方的最近表面（二楼/平台），阴影贴到该表面；跳跃时无表面则回落主地面
//    过滤边界墙（w<5 的细条）、传感器、纯视觉矩形（无物理）
function sendShadowSurfaces(mapData) {
  const rects = mapData?.rectPoolArr;
  if (!Array.isArray(rects)) return;
  const surfaces = [];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (!r) continue;
    if (r.withBody === false) continue;      // 纯视觉矩形不参与站立
    if (r.isSensor) continue;                // 传感器不参与站立
    if (r.w < 5 || r.h <= 0) continue;       // 排除边界墙（w=2 细条）等不可站立条带
    // 优先用 tiled 矩形输出的「真实顶面」（不含碰撞 OFFSET），否则用底部 - 高
    const topY = (r._topY !== undefined) ? r._topY : (r.y - r.h);
    surfaces.push({ x0: r.x - r.w / 2, x1: r.x + r.w / 2, topY });
  }
  physicsWorker.postMessage({ type: 'setShadowSurfaces', surfaces });
}

async function TpMap(name, tpPosition) {
  // 🛡️ 串行队列：所有地图切换严格排队执行，保证任意时刻只有一个 TpMap 在运行，
  //    彻底避免「战斗结束回城 TpMap」与「再次进入战斗 TpMap」并发改 body/镜头导致立绘错位
  await _tpQueue;
  let _tpRelease;
  _tpQueue = new Promise(r => { _tpRelease = r; });
  try {
    // 防止重复触发地图切换（队列内无并发，锁仅作防御）
    isMapTransitioning = true;
    currentMapId = name; // 更新当前地图ID
    user.pixi.currentMapId = name; // 同步到 store（供对话/障碍物工具判断当前地图）
    // ====== 黑屏状态下加载地图资源 ======
    if (!isBundleLoaded(name)) {
      await loadMapInfo(name)
    }

    // ====== 从 mapDataList 获取当前地图数据（先于 goToMap） ======
    const currentMapData = user.pixi.mapDataList.find(m => m.id === name);
    // console.log('currentMapData=', currentMapData);
    console.log('name=', name);
    if (!currentMapData) {
      console.warn(`[TpMap] 未找到地图数据: ${name}`);
      return;
    }

    // ====== 先清理当前地图的旧运行时数据（避免重复图标和位置乱序） ======
    // ⚠️ 保存 NPC 隐藏状态（hideNpc 可能在 TpMap 异步完成前已调用）
    const _savedHiddenState = {};
    user.pixi.npcDataList.forEach(n => {
      const id = n.id ?? n.data?.id;
      if (id != null && n.hidden) _savedHiddenState[id] = true;
    });

    // ⚠️ 保存动态 NPC（不在 map.js 静态定义里的，如对话中 createNPC 创建的）
    // 🎯 动态 NPC 数据必须保留在 npcDataList 中（回到原地图时要恢复显示），
    //    是否显示由 updateNPCPool 按「当前地图」控制（非当前地图的 NPC 隐藏，数据保留）。
    const staticNpcIds = new Set(currentMapData.npcDataList?.map(n => n.id) || []);
    const dynamicNpcs = user.pixi.npcDataList.filter(item => {
      const id = item.id ?? item.data?.id;
      return id && !staticNpcIds.has(id);
    });

    clearMapRuntimeData(name);

    // ====== 再清理其他「已加载」地图的数据 ======
    // 🎯 优化：不再遍历所有地图，只清理 _loadedMapIds 中「已加载过运行时数据」但非目标的地图。
    //    地图多时，未访问过的地图没有任何运行时数据（wuti/floatingMarks/NPC 都为空），
    //    clearMapRuntimeData 对它们是无意义的遍历，这里直接跳过。
    _loadedMapIds.forEach(mapId => {
      if (mapId !== name) clearMapRuntimeData(mapId);
    });
    _loadedMapIds.clear();

    // ====== 重建当前地图的 NPC、刚体、问号（从 mapDataList 重新生成） ======
    const currentMapOnly = [currentMapData];
    const rebuiltNpcs = loadMapData(currentMapOnly, createRectFromData);
    // 标记目标地图已加载运行时数据（供下次传送时增量清理）
    _loadedMapIds.add(name);
    // 合并：静态 NPC + 保留的动态 NPC
    // ⚠️ 恢复 NPC 隐藏状态（避免 TpMap 异步回城后 hideNpc 状态丢失）
    [...rebuiltNpcs, ...dynamicNpcs].forEach(n => {
      const id = n.id ?? n.data?.id;
      if (id != null && _savedHiddenState[id]) n.hidden = true;
    });
    const mergedNpcs = [...rebuiltNpcs, ...dynamicNpcs];
    user.pixi.npcDataList = mergedNpcs;
    // 触发 NPC 创建
    emitter.emit('npcConfigUpdated', user.pixi.npcDataList);

    // ====== 切换地图数据和玩家位置 ======
    const data = goToMap(name, activePlayer, Matter, tpPosition)
    defaultMap = data
    WORLD_WIDTH = data.realWidth;
    // 🎯 阴影表面：切图后推送当前地图可站立矩形给 worker（阴影跟随脚下表面）
    sendShadowSurfaces(data);

    // ====== 更新静态背景、远景背景和 Spine 动态背景（全局单例，相同则复用） ======
    // 先更新静态背景：清空 bgContainer 旧墙图，只保留当前地图的 backgroundImages（避免上一张地图背景残留）
    updateStaticBackground(data);
    updateFarBackground(data);
    updateSpineBackground(data);
    updateSpineForeground(data);
    // 🌉 高层 Spine 前景（角色之上，遮挡人物用；不参与地图宽度计算）
    updateSpineFront(data);

    // ====== 🗺️ 高度图吸附法：构建/复用当前地图的高度数组 ======
    //    有 heightMapImages 配置 → 用黑白碰撞图生成高度数组（玩家/NPC 落地吸附）
    //    没有 → 回退到原 rectPoolArr 矩形地面（clearHeightMap 确保不残留旧高度图）
    if (data.heightMapImages && data.heightMapImages.length > 0) {
      currentHeightMapId = name;
      // 异步构建（黑白图需要逐张加载读像素）；未构建完成前玩家仍可用原逻辑/自由下落
      ensureHeightMap(name, data.heightMapImages, Assets, {
        vh: VH,
        mapOffsetX: data.offsetX ?? 0,
        threshold: 128,
      }).then(built => {
        if (!built && currentMapId === name) {
          // ⚠️ 纹理未就绪（黑白图属 map_01 bundle，可能还在加载）：
          //    延迟重试，确保资源加载完成后高度图一定构建成功
          setTimeout(() => {
            if (currentMapId === name) {
              ensureHeightMap(name, data.heightMapImages, Assets, {
                vh: VH,
                mapOffsetX: data.offsetX ?? 0,
                threshold: 128,
              });
            }
          }, 600);
        }
      });
      // console.log(`🗺️ 高度图已就绪: ${name} (${data.heightMapImages.length} 张)`);
    } else {
      if (currentHeightMapId && currentHeightMapId !== name) clearHeightMap(currentHeightMapId);
      currentHeightMapId = null;
    }

    // ====== 根据地图配置自动开关滤镜 ======
    currentLight = data.lightSource;
    // console.log('currentLight=', currentLight);
    if (currentLight) {
      initOnceDayNightFilter()
      if (currentLight.night.enable) {
        showDayNightFilter();
      } else {
        hideDayNightFilter();
      }
      // 🔥 修复：切图后重新应用昼夜配置（initOnceDayNightFilter 只在首次执行，
      //    之后 currentLight 变化必须显式调用 applyMapDayNightConfig 才生效）
      if (dayNightInited) {
        applyMapDayNightConfig();
      }
    }

    currentGroundY = data.currentGroundY
    cachedTriggerAreas = (defaultMap.TriggerAreaArr || [])
      .filter(t => t.enableAABB)
      .map(t => ({
        x: t.x, y: t.y, w: t.w, h: t.h,
        label: t.label, enableAABB: t.enableAABB ?? false,
        name: t.name, offsetX: defaultMap.offsetX,
      }));

    // 更新视口边界
    const playerX = activePlayer.body.position.x;
    const bounds = getCurrentMapClampBounds(playerX);
    viewport.clamp({ left: bounds.left, right: bounds.right, top: -Infinity, bottom: 100 * VH });
    // 🎥 自由视角下切图：保持 clamp/follow 暂停，否则镜头又被边界限制/拉回玩家
    if (isFreeCamera.value) {
      viewport.plugins.get('clamp')?.pause();
      viewport.plugins.get('follow')?.pause();
    }

    // 🌙 等昼夜 Worker 回传（滤镜明暗正确）后再继续：避免切图/首次进入"地图先亮、夜晚后变黑"跳变
    try {
      if (currentLight?.night?.enable) await waitDayNightReady(2000);
    } catch (e) { /* ignore */ }

    // ====== 等待几帧确保渲染完成 ======
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    }));

    // ====== 地图切换过渡：通知可以开始淡入新场景 ======

    // // ====== 后台预加载下一张地图 ======
    // afterTpMap(name);

    // 🗺️ 切图后重建当前地图的已放置道具（其他地图的道具不显示，切过去才显示）
    rebuildPlacedPropsForCurrentMap();
    // 🗺️ 非白名单地图不允许放置：切过来时自动关闭放置器面板
    if (!PROP_PLACE_MAPS.includes(name)) closePropPlacer();

  } finally {
    isMapTransitioning = false;
    if (_tpRelease) _tpRelease();
  }
}
async function loadMapInfo(name = 'desert_01') {
  if (!isBundleLoaded(name)) {
    // 1. 先判断目标地图资源有没有加载
    user.pixi.mapLoading = true;
    // 加载目标地图资源，可传入进度回调更新加载条
    await loadMapBundle("map_01", (progress) => {

      user.pixi.mapLoadingProgress = progress;
    });
    user.pixi.mapLoading = false;
  }
}
// 进入地图后，后台预加载下一张地图
function afterTpMap(currentMapId) {
  const nextMapMap = {
    desert_01: "huli_01",
    huli_01: "yu_01",
  };
  const nextMapId = nextMapMap[currentMapId];
  if (nextMapId && !isBundleLoaded(nextMapId)) {
    // 低优先级后台加载，不占用当前游戏性能
    loadMapBundle(nextMapId).catch(() => { });
  }
}
let dayNightInited = false;

// 应用当前地图的昼夜配置（切换地图时调用）
function applyMapDayNightConfig() {
  // console.log("currentLight=", currentLight)
  if (!currentLight) {
    return
  }
  // 保存地图原始的fixedTime配置
  originalFixedTime = currentLight.night?.fixedTime;

  // 根据行动点判断实际使用的时间
  const actualFixedTime = getActualFixedTime();
  const speed = currentLight.night?.speed;

  // 1. 设置初始时间
  if (actualFixedTime !== undefined && actualFixedTime !== null) {
    if (actualFixedTime === 'day') {
      setDayTime(0);
    } else if (actualFixedTime === 'morning') {
      setDayTime(0.15);
    } else if (actualFixedTime === 'night') {
      setDayTime(0.5);
    } else if (typeof actualFixedTime === 'number') {
      setDayTime(actualFixedTime);
    }
  } else {
    // 没设置 fixedTime，默认白天
    setDayTime(0);
  }

  // 2. 设置流逝速度
  if (speed !== undefined && speed !== null && speed > 0) {
    // 设置了 speed 且 > 0，时间正常流逝
    setDayNightSpeed(speed);
  } else {
    // 没设置 speed 或 speed <= 0，暂停时间，不计算
    setDayNightSpeed(0);
  }
}

// 实际的时间配置（删除精力值后：始终使用地图原始配置）
function getActualFixedTime() {
  return originalFixedTime;
}

// 初始化昼夜滤镜（仅执行一次，创建实例）
function initOnceDayNightFilter() {
  if (dayNightInited) return;
  dayNightInited = true;
  createDayNightFilter(allBgContainer, app);
  // 应用第一张地图的配置
  applyMapDayNightConfig();
}


// 🗺️ 高度图吸附法：每物理步长把玩家脚底吸附到地面（当前地图配置了 heightMapImages 时）
function applyHeightMapToPlayer() {
  // 当前地图没有高度图 → 回退原逻辑（Matter 矩形地面）
  if (!currentHeightMapId || !activePlayer?.body) return;
  const player = activePlayer;
  const body = player.body;


  // 查高度图（精确地形）；未构建完成时用地图默认地面 currentGroundY 兜底，避免玩家坠落
  let groundY = getGroundYAt(currentHeightMapId, body.position.x);
  if (groundY == null) {
    groundY = currentGroundY * VH; // 该列无地面（悬崖/空洞）或高度图未就绪 → 用地图基准地面
  }
  if (groundY == null) return; // 实在没有基准 → 交给 Matter 自由下落

  // 脚底 y = body 中心 y + 半高（body 是矩形，高度约等于 playerH）
  const halfH = (player.playerH || 20) / 2;
  const footY = body.position.y + halfH;

  // 落地判定：向下运动（或静止）且脚底已触到/越过地面 → 吸附
  if (body.velocity.y >= 0 && footY >= groundY - 1) {
    Matter.Body.setPosition(body, {
      x: body.position.x,
      y: groundY - halfH
    });
    body.velocity.y = 0;
    player.isOnGround = true;
    player.groundContacts = 1;
  }
}

// 👣 主世界玩家脚步声：zoulu.mp3（地面移动时播放，节流；空中/静止不播）→ 统一音频管理器（池化 + 去重 + 全局音量）
let _lastFootstepAt = 0;
const FOOTSTEP_GAP_MS = 400;    // 每 400ms 最多触发一次
function playWorldFootstep() {
  if (!activePlayer || !activePlayer.isOnGround || !activePlayer._isMovingAnim) return; // 空中/静止不播
  const now = performance.now();
  if (now - _lastFootstepAt < FOOTSTEP_GAP_MS) return;
  _lastFootstepAt = now;
  audioSfx('zoulu', { volume: 0.18 * (user?.volume ?? 1), base: '/music/dilao/', dedupeMs: 400 });
}

function gameLoop() {
  if (!activePlayer) return;
  // ✅ 新增：控制禁用时，完全跳过移动逻辑
  if (!canPlayerControl) {
    // 镜头未固定时才跟随玩家
    if (!isCameraFixed) {
      cameraTarget.position.set(
        activePlayer.body.position.x,
        activePlayer.body.position.y
      );
    }
    return;
  }
  // 🎥 自由视角：镜头脱离跟随，用输入自由飞行（玩家不动、不受重力/障碍物影响）
  if (isFreeCamera.value) {
    updateFreeCamera();
    return;
  }
  // 读取摇杆/键盘输入
  activePlayer.updateMotion(playerInput.value.left, playerInput.value.right, activePlayer.isOnGround);
  playWorldFootstep(); // 👣 主世界玩家脚步声（地面移动，节流，空中不播）
  // 镜头未固定时才跟随玩家
  if (!isCameraFixed) {
    cameraTarget.position.set(
      activePlayer.body.position.x,
      activePlayer.body.position.y   // 镜头也跟随电梯
    );
  }
}

// =====================================
// 🎥 自由视角（摄像机脱离跟随角色，自由飞行）
// =====================================
/** 切换自由视角开关（由页面按钮调用） */
function toggleFreeCamera() {
  isFreeCamera.value = !isFreeCamera.value;
  // 清空键盘状态，避免残留
  Object.keys(freeKeys).forEach(k => freeKeys[k] = false);
  playerInput.value.left = false;
  playerInput.value.right = false;
  if (joystick) {
    joystick.keyLeft = false;
    joystick.keyRight = false;
  }

  // 🎥 自由视角：暂停/恢复 viewport 插件（否则镜头会被地图边界挡住 + follow 会拉回玩家）
  //  - clamp：地图边界限制
  //  - follow：跟随 cameraTarget（玩家）
  const clampPlugin = viewport?.plugins?.get('clamp');
  const followPlugin = viewport?.plugins?.get('follow');
  if (isFreeCamera.value) {
    clampPlugin?.pause();
    followPlugin?.pause();
    // 🎥 自由视角：冻结远景位置（远景不随镜头移动）
    _farBgFrozenX = farBgContainer.x;
  } else {
    clampPlugin?.resume();
    followPlugin?.resume();
    // 🎥 退出自由视角：远景重新按当前镜头位置对齐
    farBgContainer.x = PARALLAX_FAR_BG * (viewport.left - currentFarBgOffsetX);
  }

  if (!isFreeCamera.value) {
    // 关闭自由视角：镜头瞬间回到玩家并重新跟随
    if (activePlayer?.body && cameraTarget) {
      cameraTarget.position.set(
        activePlayer.body.position.x,
        activePlayer.body.position.y
      );
    }
  }
}

/** 🗺️ 切换黑白碰撞图调试叠层的显隐（由页面按钮调用） */
function toggleHeightMapDebug() {
  heightMapDebugVisible.value = !heightMapDebugVisible.value;
  if (heightMapDebugContainer) {
    heightMapDebugContainer.visible = heightMapDebugVisible.value;
  }
}

/** 自由视角：根据键盘/摇杆输入移动镜头（不受重力和障碍物影响） */
function updateFreeCamera() {
  if (!viewport) return;
  // 每帧移动距离 = 屏幕宽度 * 系数（对角移动时归一化，避免更快）
  const speed = FREE_CAM_SPEED * (app.screen.width || window.innerWidth);
  const jx = joystick;
  const hasJoy = jx != null && jx.active;
  const joyLeft = hasJoy && jx.x < -20;
  const joyRight = hasJoy && jx.x > 20;
  const joyUp = hasJoy && jx.y < -20;
  const joyDown = hasJoy && jx.y > 20;

  let dx = 0;
  let dy = 0;
  if (freeKeys.left || joyLeft) dx -= 1;
  if (freeKeys.right || joyRight) dx += 1;
  if (freeKeys.up || joyUp) dy -= 1;
  if (freeKeys.down || joyDown) dy += 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; } // 对角归一化

  const cx = viewport.center.x + dx * speed;
  const cy = viewport.center.y + dy * speed;
  viewport.moveCenter(cx, cy);
  // 同步 cameraTarget，切回跟随视角时不跳变
  if (cameraTarget) cameraTarget.position.set(cx, cy);
}

// 保险逻辑：玩家位置掉出地图下方时，重置到 60vh 位置（防止 Matter 重力下玩家摔出世界）
function applyFallbackReset() {
  if (!canPlayerControl || fightMode) return;
  if (activePlayer?.body && activePlayer.body.position.y > (100 * VH)) {
    Matter.Body.setPosition(activePlayer.body, {
      x: activePlayer.body.position.x,
      y: 60 * VH
    });
    Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 });
  }
}
function vnZanting() {
  emitter.off("vnZanting");
  emitter.on("vnZanting", () => {
    if (!runner) runner = Matter.Runner.create();
    user.pixi.isPaused = !user.pixi.isPaused;
    if (user.pixi.isPaused) {
      app.ticker.stop();
      Matter.Runner.stop(runner);
    } else app.ticker.start();
  });
}

function destroyRectsByIndex(index) {
  const list = wuti.get(index);
  if (!list) return;
  for (let i = 0; i < list.length; i++) rectPool.release(list[i]);
  wuti.delete(index);
}

function npcConfigUpdated() {
  emitter.off("npcConfigUpdated");
  emitter.on('npcConfigUpdated', (newList = []) => {
    if (!world || !viewport || !playerPool) return;

    updateNPCPool(newList, playerPool, WORLD_WIDTH, VH, Matter, world, app, currentGroundY, defaultMap.TopMap, currentMapId)

    syncAllNPC(newList, Matter, viewport); // 正常保留
    if (user.pixi.activePlayer) playerUpdate(Matter, activePlayer, viewport);
  });
}

// =====================================
// NPC 控制事件（对话系统通过 emitter 调用）
// =====================================
// 移动 NPC 到指定百分比位置
// 用法: emitter.emit('moveNpcTo', { npcId: 1, xPercent: 0.8, teleport: true })
// direction: 1=右, -1=左（可选，瞬移立即生效，走路时到达后生效）
// ===== 同步 NPC 影子到刚体位置（NPC 影子的 viewResult 更新已注释，这里手动同步） =====
emitter.off("moveNpcTo");
emitter.on('moveNpcTo', ({ npcId, xPercent, teleport = true, speed = null, onComplete, direction }) => {
  const npc = npcPool.find(n => n.data?.id === npcId);
  if (!npc || !npc.body) {
    console.warn(`[moveNpcTo] 未找到 NPC: ${npcId}`);
    return;
  }
  const npcMap = user.pixi.mapDataList.find(m => m.id === npc.mapId);
  if (!npcMap) return;
  const targetX = npcMap.offsetX + npcMap.realWidth * xPercent;
  // 移动完成后设置朝向 + 同步影子（瞬移在 moveNpcToX 内同步执行，走到位时走 onComplete）
  const done = () => {
    if (direction !== undefined) setNpcDirection(npc, direction);
    onComplete?.();
  };
  moveNpcToX(npc, targetX, Matter, app, activePlayer, { teleport, speed, onComplete: done });
});

// =====================================
// 设置玩家位置（对话/CG 中调用）
// 用法: emitter.emit('movePlayerTo', { xPercent: 0.5, direction: -1 })
// - xPercent: 0~1 地图宽度百分比（必传）
// - direction: 1=右, -1=左（可选，默认保持当前朝向）
// - mapId: 可选，指定后先切到该地图再传送
// 注意：只改 X，Y 保持不变；切地图会触发 TpMap 重载，如需保持当前对话请谨慎使用
emitter.off("movePlayerTo");
emitter.on('movePlayerTo', async ({ mapId, xPercent, direction }) => {
  if (!activePlayer?.body) return;

  // 需要切地图时，先 TpMap 过去
  if (mapId && mapId !== currentMapId) {
    const targetMap = user.pixi.mapDataList.find(m => m.id === mapId);
    if (!targetMap) {
      console.warn(`[movePlayerTo] 未找到地图: ${mapId}`);
      return;
    }
    const targetX = targetMap.offsetX + targetMap.realWidth * (xPercent ?? 0.5);
    await TpMap(mapId, targetX);
  }

  // 计算目标 X 坐标（世界像素），Y 保持不变
  const map = user.pixi.mapDataList.find(m => m.id === (mapId || currentMapId));
  if (!map) return;
  const targetX = map.offsetX + map.realWidth * (xPercent ?? 0.5);
  const targetY = activePlayer.body.position.y;

  // 设置刚体位置并清空速度
  Matter.Body.setPosition(activePlayer.body, { x: targetX, y: targetY });
  Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 });

  // 设置朝向
  if (direction !== undefined && activePlayer.spine?.setDirection) {
    activePlayer.spine.direction = direction;
    activePlayer.spine.setDirection(direction);
  }

  // 同步相机跟随目标
  if (cameraTarget) {
    cameraTarget.position.set(targetX, targetY);
  }

  // 通知 Worker 更新玩家输入状态
  if (physicsWorker) {
    physicsWorker.postMessage({
      type: "input",
      data: { left: false, right: false },
      VW: VW,
      VH: VH
    });
  }
  // 刷新 NPC 位置同步
  if (user.pixi.activePlayer) playerUpdate(Matter, activePlayer, viewport);
});

// =====================================
// 🌍 世界地图：前往指定地图（WorldMap 组件触发）
// 用法: emitter.emit('worldMapGo', { mapId: 'one01' })
// - mapId: 目标地图 ID
// - 若该地图配置了入口对话（dialogue 标记），则触发对话；否则直接传送到该地图
// =====================================
emitter.off("worldMapGo");
emitter.on('worldMapGo', async ({ mapId }) => {
  if (!activePlayer?.body || !mapId) return;
  if (mapId === currentMapId) {
    ElMessText('你已在此地图', 'info');
    return;
  }
  const targetMap = user.pixi.mapDataList.find(m => m.id === mapId);
  if (!targetMap) {
    console.warn(`[worldMapGo] 未找到地图: ${mapId}`);
    return;
  }
  // 🚩 传送到目标地图出生点（优先用配置的 playerSpawnX，避免落到地图中心）
  const targetX = targetMap.playerSpawnX != null
    ? targetMap.playerSpawnX
    : targetMap.offsetX + targetMap.realWidth * 0.5;
  await TpMap(mapId, targetX);
  if (cameraTarget) {
    cameraTarget.position.set(activePlayer.body.position.x, activePlayer.body.position.y);
  }
});

// =====================================
// ⚡ 快速传送：一键传送到指定地图（无需打开世界地图）
// 用法: quickTeleport('one01') 或 emitter.emit('teleportToMap', { mapId: 'one01' })
// - mapId: 目标地图 ID
// - 传送到目标地图中心（出生点）
// - quickTpTime：传送后修改昼夜滤镜（'morning'=早上 0.15，'night'=晚上 0.5，null=地图默认）
// =====================================
async function quickTeleport(mapId) {
  quickTpVisible.value = false;
  if (!activePlayer?.body || !mapId) return;
  const targetMap = user.pixi.mapDataList.find(m => m.id === mapId);
  if (!targetMap) {
    ElMessText(`未找到地图: ${mapId}`, "warning");
    return;
  }
  if (mapId === currentMapId) {
    ElMessText("你已在此地图", "info");
    return;
  }
  // 传送到地图中心（或出生点）
  const targetX = targetMap.playerSpawnX != null
    ? targetMap.playerSpawnX
    : targetMap.offsetX + targetMap.realWidth * 0.5;
  ElMessText(`正在前往 ${targetMap.name || mapId}...`, "info");
  await TpMap(mapId, targetX);

  // 🌗 应用选定的昼夜时间（覆盖地图默认；null 则不干预，保持地图配置）
  if (quickTpTime.value === 'morning') {
    setDayTime(0.15);
  } else if (quickTpTime.value === 'night') {
    setDayTime(0.5);
  }

  if (cameraTarget) {
    cameraTarget.position.set(activePlayer.body.position.x, activePlayer.body.position.y);
  }
}

// 兼容：全局事件触发快速传送（对话/控制台可用）
emitter.off("teleportToMap");
emitter.on('teleportToMap', async ({ mapId }) => {
  await quickTeleport(mapId);
});

// 设置 NPC 显隐
// 用法: emitter.emit('setNpcVisible', { npcId: 1, visible: false })
emitter.off("setNpcVisible");
emitter.on('setNpcVisible', ({ npcId, visible }) => {
  // 降级方案：jingling.js 已通过 window.__npcPool 直接操作 NPC
  // 此 emitter 处理剩余未覆盖的情况
  const npc = npcPool.find(n => n.data?.id === npcId);
  if (!npc) return;
  if (npc._explicitlyHidden === !visible && npc.view.visible === visible) return; // 已处理过
  npc._explicitlyHidden = !visible;
  npc.view.visible = visible;
  if (npc.body) {
    npc.body.collisionFilter.mask = visible ? COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.BULLET : 0;
  }
});
// 🎥 固定镜头到指定位置（战斗时调用）
function fixCamera(x, y) {
  isCameraFixed = true;
  if (cameraTarget) {
    cameraTarget.position.set(x, y);
  }
  // 🔥 战斗期间暂停 follow 插件：否则它会持续用平滑速度跟随 cameraTarget，
  //    叠加 moveCenter 后产生镜头抖动/延迟，玩家 Y 轴看起来不稳定
  viewport?.plugins?.get('follow')?.pause();
}
// 🎥 恢复镜头跟随玩家（战斗结束时调用）
function unfixCamera() {
  isCameraFixed = false;
  // 恢复 follow 插件，镜头重新跟随玩家
  viewport?.plugins?.get('follow')?.resume();
}
// 🎮 禁用玩家所有移动（战斗开始时调用）
function disablePlayerControl() {
  if (!canPlayerControl) return; // 已经禁用直接返回，避免重复执行
  canPlayerControl = false;
  user.pixi.activePlayer = {
    hp: activePlayer.data.data.hp,
    maxHp: activePlayer.data.data.maxHp,
    x: activePlayer.body.position.x,
    y: activePlayer.body.position.y,
    speed: activePlayer.speed,
    juese: activePlayer.data.juese
  };
  user.pixi.app = markRaw(worldContainer)
  // console.log('警用');

  showAllEnemyHpBar()
  if (activePlayer?.body) {
    // ✅ GC 优化：直接修改 velocity 属性
    activePlayer.body.velocity = { x: 0, y: 0 };
    activePlayer.body.angularVelocity = 0;
    // 临时冻结刚体物理，杜绝滑行
    activePlayer.body.isSleeping = true;
  }
  if (activePlayer?.spine) {
    activePlayer.spine.playIdle();
  }
  playerInput.value = {
    left: false,
    right: false
  };
}
// 🎮 恢复玩家所有移动（战斗结束时调用）
function enablePlayerControl() {
  emitter.off("enablePlayerControl");
  emitter.on('enablePlayerControl', async (i) => {
    // 🔥 战斗中触发对话：对话结束后保持玩家禁用，战斗中的角色依然不可移动
    if (i === 1 && user.pixi.fight) {
      user.pixi.gameUi = true;
      return;
    }
    // 🔥 对话结束（i===1）且不在战斗：无论 canPlayerControl 是否已被提前恢复
    // （如 donghua 里 emit('leave') 与 talkToNpc 竞态导致控制被提前恢复），
    // 都强制复位 UI，避免 gameUi 卡在 true
    if (i === 1 && !user.pixi.fight) {
      user.pixi.gameUi = false;
    }
    if (canPlayerControl) return;
    // 老电影滤镜已移除
    // 2. 入场（战斗场景渐显）

    canPlayerControl = true;

    // 🏰 地牢战斗结束：重新显示地牢（watch 会自动 emit dungeonResume 解冻+重置敌人）
    if (pendingDungeonBattle.value) {
      pendingDungeonBattle.value = false;
      user.setDialogueFlag('dungeonEnterOutside', false); // 🏰 战斗返回地牢：不刷新白天（保持天黑）
      // 🌙 恢复主世界昼夜（进入战斗时战斗场景天黑被地牢天黑覆盖，返回地牢后按主世界配置恢复）
      try { applyMapDayNightConfig(); } catch (e) { /* ignore */ }
      dungeonVisible.value = true;
    }

    // 🎥 恢复镜头跟随玩家
    unfixCamera();

    // ✅ 【关键】恢复时强制清空所有输入状态，彻底解决残留
    if (joystick) {
      joystick.keyLeft = false;
      joystick.keyRight = false;
      joystick.x = 0; // 摇杆也强制归位
    }
    playerInput.value = {
      left: false,
      right: false
    };

    // ✅ 强制清零玩家速度，防止恢复瞬间还有惯性
    if (activePlayer?.body) {
      // ✅ GC 优化：直接修改属性
      activePlayer.body.velocity.x = 0;
      activePlayer.body.isSleeping = false
      activePlayer.body.velocity = { x: 0, y: 0 };
      // 🔥 恢复玩家战斗期间被关闭的碰撞（jinruzhandou 里设的 mask=0，含 parts/footSensor）
      if (window.__battlePlayerMask != null) {
        activePlayer.body.collisionFilter.mask = window.__battlePlayerMask;
        if (activePlayer.body.parts && activePlayer.body.parts.length) {
          activePlayer.body.parts.forEach(p => {
            // 主体用保存的 mask，脚部传感器恢复 OBSTACLE
            p.collisionFilter.mask = p.label === 'footSensor'
              ? COLLISION_GROUPS.OBSTACLE
              : window.__battlePlayerMask;
          });
        }
        window.__battlePlayerMask = null;
      }
    }

    // ✅ 战斗结束，切回待机动画
    if (activePlayer?.spine) {
      activePlayer.spine.playIdle();
    }

    // ✅ 立刻给Worker发一次静止输入，确保Worker那边也彻底清空
    physicsWorker.postMessage({
      type: "input",
      data: { left: false, right: false },
      VW: VW,
      VH: VH
    });
    hideAllEnemyHpBar()
    // 💥 清理战斗地图的敌人/队友 NPC（用本次战斗地图，回退 desert_02）
    const fightCleanMapId = user.getDialogueFlag('battleMapId') || "desert_02";
    removeNPCsByMapId(fightCleanMapId, Matter, world, app);
    // 战斗结束：清理队友 spine 引用
    setNpcAllySpine(null);
    // 💥 清理纯 Spine 队友（无物理，window.__battleAlly 里存的显示对象）
    const allyRefClean = window.__battleAlly;
    if (allyRefClean?.spineBoy) {
      try {
        if (allyRefClean.view?.parent) {
          allyRefClean.view.parent.removeChild(allyRefClean.view);
        }
        allyRefClean.spineBoy.destroy?.();
      } catch (e) { console.warn('队友 Spine 清理失败', e); }
    }
    window.__battleAlly = null;
    window.__battleAllyMask = null;
    // 👤 清理战斗专用脚下阴影（玩家 + 队友）
    _clearBattleShadows();
    // 👤 恢复玩家主世界 worker shadow，停止补影同步
    if (window.__battlePlayerShadowSync) {
      try { app.ticker.remove(window.__battlePlayerShadowSync); } catch (e) { /* ignore */ }
      window.__battlePlayerShadowSync = null;
    }
    window.__battlePlayerShadow = null;
    if (activePlayer?.shadow && !window.__battlePlayerShadowWasHidden) {
      activePlayer.shadow.visible = true;
    }
    window.__battlePlayerShadowWasHidden = false;
    user.pixi.activePlayer = null
    if (i !== 1) {
      user.pixi.fight = false;
      user.pixi.gameUi = user.pixi.duihua ? true : false;
      // ✅ 战斗结束，清理自定义战斗配置和深入度解锁标记，避免残留影响后续战斗
      user.setDialogueFlag('customBattleData', null);
      user.setDialogueFlag('noDepthUnlock', false);
      // 💥 清理本次战斗地图标记，避免残留影响后续战斗
      user.setDialogueFlag('battleMapId', null);
      user.setDialogueFlag('battleMapLabel', null);
      user.setDialogueFlag('battleSceneId', null);
      const map = user.pixi.mapDataList.find(m => m.id === savedPlayerMapId);
      WORLD_WIDTH = map.realWidth;
      // 战斗结束传回进入战斗前的位置，而不是地图边缘
      const tpPosition = savedPlayerPosition.x > 0 ? savedPlayerPosition.x : map.offsetX + WORLD_WIDTH * 0.97;
      await TpMap(savedPlayerMapId, tpPosition);
      // 🔥 修复“掉下去”：TpMap 只传 X，Y 用地图出生点（可能悬空），
      //    这里用进入战斗前记录的精确位置（含 Y）覆盖，避免回城后被放到悬空处下坠
      if (activePlayer?.body && savedPlayerPosition) {
        Matter.Body.setPosition(activePlayer.body, {
          x: savedPlayerPosition.x,
          y: savedPlayerPosition.y,
        });
        Matter.Body.setVelocity(activePlayer.body, { x: 0, y: 0 });
      }
      // 战斗结束回地图：镜头拉远，恢复地图视角
      viewport.setZoom(getBaseZoom());
      // 🏰 地牢战斗结束返回地牢：不播放地牢外的 BGM（由 dungeon.vue playBgMusic 按天气恢复地牢音乐）
      if (!dungeonVisible.value) {
        user.playBgm('senlin', 0.25)
      }
      // 🔥 战斗结束后自动存档
      // if (activePlayer) {
      //   user.autoSave(getSaveData());
      //   console.log('[自动存档] 战斗结束，已自动存档');
      // }
    } else {
      user.pixi.gameUi = false
    }
  });
}

// 📳 屏幕震动（对话触发）
function initScreenShakeListener() {
  emitter.off("screenShake");
  emitter.on('screenShake', (params = {}) => {
    if (!viewport) return;
    const { intensity = 8, duration = 300 } = params;
    shakeViewport(viewport.parent, intensity, duration, gsap);
  });
}

onBeforeUnmount(() => {
  // 事件监听最先清理，防止中途抛错导致监听残留污染下次进入
  try {
    emitter.off("customBattle");
    emitter.off("worldMapGo");
    emitter.off("dayCgFinished", onDayCgFinished);
  } catch (e) { console.warn('[matter] 卸载清理事件监听失败:', e); }

  // 物理与渲染资源清理：每步独立 try，任一步失败都不阻断整体卸载
  try { app.ticker.stop(); } catch (e) { console.warn('[matter] 停止ticker失败:', e); }
  try { Matter.World.clear(world, false); } catch (e) { console.warn('[matter] 清理World失败:', e); }
  try { Matter.Engine.clear(engine); } catch (e) { console.warn('[matter] 清理Engine失败:', e); }
  try {
    Matter.Events.off(engine, "collisionStart");
    Matter.Events.off(engine, "collisionEnd");
  } catch (e) { console.warn('[matter] 移除碰撞监听失败:', e); }
  try {
    npcs.forEach(npc => npc.deactivate?.())
    npcs.length = 0
    npcPool.length = 0
    floatingMarks.length = 0
  } catch (e) { console.warn('[matter] 清理NPC失败:', e); }
  try { destroyDayNightFilter(); } catch (e) { console.warn('[matter] 清理昼夜滤镜失败:', e); }
  try { app.destroy({ children: true, texture: true, textureSource: true, releaseGlobalResources: false }); } catch (e) { console.warn('[matter] 销毁Pixi应用失败:', e); }
  // 销毁Worker释放线程
  try { physicsWorker.terminate(); } catch (e) { console.warn('[matter] 终止物理Worker失败:', e); }
  try { destroyDayNightFilter(); } catch (e) { console.warn('[matter] 二次清理昼夜滤镜失败:', e); }
});
</script>

<style scoped>
:deep(.el-dialog__header) {
  padding-bottom: 0;
}

:deep(.el-overlay-dialog) {
  bottom: auto;
}

:deep(.el-drawer__body) {
  padding: 0;
}

/* 🎓 新手引导样式 */
.guide-lock-avatar {
  z-index: 10001 !important;
  animation: guide-btn-pulse 1.2s ease-in-out infinite;
  box-shadow: 0 0 2vh rgba(250, 204, 21, 0.6);
}

.guide-lock-step2 {
  z-index: 10001 !important;
  animation: guide-btn-pulse 1.2s ease-in-out infinite;
  box-shadow: 0 0 2vh rgba(167, 139, 250, 0.7);
}

/* 🧭 突破引导第2步：drawer 提到遮罩之上（z-10000），遮罩降级拦截主界面，drawer 内容除「可突破」外全部禁点 */
.bt-mask-below {
  z-index: 50 !important;
}

.bt-avatar-locked {
  pointer-events: none !important;
}

.bt-guide-lock {
  pointer-events: none !important;
}

.bt-guide-lock .guide-lock-step2 {
  pointer-events: auto !important;
}

@keyframes guide-btn-pulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.06);
  }
}
</style>

<!-- 💎 突破弹窗：header 白底收尾（背景渐变已在 el-dialog class 用 UnoCSS 控制） -->
<style>
.bt-dialog .el-dialog__header {
  padding: 0;
  margin: 0;
  background: transparent !important;
  border-bottom: none;
}

.bt-dialog .el-dialog__headerbtn {
  top: 1.4vh;
  right: 1.4vh;
  width: 4vh;
  height: 4vh;
  z-index: 20;
}

.bt-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #fff;
  font-size: 2.8vh;
  text-shadow: 0 0 0.6vh rgba(0, 0, 0, 0.6);
}

.bt-modal {
  background: transparent !important;
}
</style>
