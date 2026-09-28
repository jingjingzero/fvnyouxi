<template>
  <div class="flex flex-col text-1.6vw select-none!">

    <el-tabs v-model="activeTab" type="border-card" class="h-80vh" @tab-change="handleTabChange">
      <!-- 个人信息 -->
      <el-tab-pane v-if="shouldShowTab('info')" name="info" class="px-2vw pt-5vh relative" @click="closeTooltip">
        <template #label>
          <span class="text-3vh">{{ L('personalInfo') }}</span>
        </template>
        <!-- 🆓 自由属性点（右上角；无自由点时不显示；点＋进入分配模式，再点退出；加点不可还原） -->
        <div v-if="freeAttrPoints > 0"
          class="absolute top-1.5vh right-2vw z-10 flex items-center gap-x-1.2vh rounded-full py-0.9vh px-2vh shadow-[0_0_2vh_rgba(251,191,36,0.2)] border border-amber-300/40"
          style="background:linear-gradient(135deg,rgba(30,27,75,.92),rgba(17,24,39,.96));backdrop-filter:blur(4px)">
          <span class="text-2vh font-semibold tracking-wide text-amber-200/90">{{ L('freeAttrPointsLeft') }}</span>
          <span class="font-black text-4vh text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.55)]">{{ freeAttrPoints
            }}</span>
          <button
            class="w-3.4vh h-3.4vh rounded-full flex items-center justify-center text-white font-black text-2.2vh leading-none transition-all duration-200"
            :class="{ 'bg-gradient-to-br from-amber-400 to-orange-500 rotate-45 shadow-[0_0_1.2vh_rgba(251,191,36,0.7)]': allocMode, 'bg-gradient-to-br from-amber-300 to-amber-500 hover:scale-110 hover:shadow-[0_0_1.6vh_rgba(251,191,36,0.8)]': !allocMode }"
            @click="allocMode = !allocMode">＋</button>
        </div>
        <div class="flex" @click.stop>
          <div class="flex flex-col flex-1 gap-y-2vh">
            <div
              class="bg-gradient-to-br from-#F5F7FA to-#E4E7ED rounded-2 flex py-3vh px-2.5vw text-#303133 shadow-md border border-#DCDFE6">
              <!-- 左侧：基础属性 -->
              <div class="flex flex-col flex-1 min-h-0">
                <div class="text-1.5vw font-semibold text-#606266 mb-0.5vh">{{ L('baseAttrsTitle') }}</div>
                <div class="flex flex-col gap-y-2vh flex-1 min-h-0 max-h-[46vh] overflow-y-auto pr-2vw overscroll-contain"
                  style="-webkit-overflow-scrolling: touch">
                  <div v-for="attr in baseAttrs" :key="attr.label"
                    class="flex justify-between items-center cursor-pointer hover:bg-black/5 rounded px-1vh py-0.5vh -mx-1vh transition-all attr-row"
                    @click.stop="toggleTooltip(attr.label, $event.target)">
                    <div class="flex items-center gap-x-1.5vh">
                      <img v-if="attr.img" :src="inventoryImg(attr.img)" class="w-5vh" />
                      <span v-else class="text-3vh leading-none">{{ attr.icon }}</span>
                      <span class="text-#909399">{{ L(attr.label) }}</span>
                    </div>
                    <div class="flex items-center gap-x-1vh">
                      <span class="font-bold text-1.7vw" :style="attr.style">{{ attr.value }}</span>
                      <button v-if="allocMode && freeAttrPoints > 0 && attr.allocKey"
                        class="w-3.2vh h-3.2vh rounded-full flex items-center justify-center text-white font-black text-2vh leading-none transition-all duration-150 bg-gradient-to-br from-amber-300 to-amber-500 hover:scale-125 hover:shadow-[0_0_1.4vh_rgba(251,191,36,0.7)] active:scale-95 select-none"
                        @mousedown.prevent.stop="startHold(attr.allocKey)" @mouseup.stop="stopHold" @mouseleave.stop="stopHold" @touchstart.prevent.stop="startHold(attr.allocKey)" @touchend.stop="stopHold" @touchcancel.stop="stopHold">＋</button>
                    </div>
                  </div>
                </div>
              </div>

              <el-divider direction="vertical" class="mx-2vw! h-full! text-#E4E7ED!" />

              <!-- 右侧：次级属性 -->
              <div class="flex flex-col flex-1 min-h-0">
                <div class="text-1.5vw font-semibold text-#606266 mb-0.5vh">{{ L('secondaryAttrsTitle') }}</div>
                <div class="flex flex-col gap-y-2vh flex-1 min-h-0 max-h-[46vh] overflow-y-auto pr-1vh overscroll-contain"
                  style="-webkit-overflow-scrolling: touch">
                  <div v-for="attr in secondAttrs" :key="attr.label"
                    class="flex justify-between items-center cursor-pointer hover:bg-black/5 rounded px-1vh py-0.5vh -mx-1vh transition-all attr-row"
                    @click.stop="toggleTooltip(attr.label, $event.target)">
                    <div class="flex items-center gap-x-1.5vh">
                      <img v-if="attr.img" :src="inventoryImg(attr.img)" class="w-5vh" />
                      <span v-else class="text-3vh leading-none">{{ attr.icon }}</span>
                      <span class="text-#909399">{{ L(attr.label) }}</span>
                    </div>
                    <div class="flex items-center gap-x-1vh">
                      <span class="font-bold text-1.7vw" :style="attr.style">{{ attr.value }}</span>
                      <button v-if="allocMode && freeAttrPoints > 0 && attr.allocKey"
                        class="w-3.2vh h-3.2vh rounded-full flex items-center justify-center text-white font-black text-2vh leading-none transition-all duration-150 bg-gradient-to-br from-amber-300 to-amber-500 hover:scale-125 hover:shadow-[0_0_1.4vh_rgba(251,191,36,0.7)] active:scale-95 select-none"
                        @mousedown.prevent.stop="startHold(attr.allocKey)" @mouseup.stop="stopHold" @mouseleave.stop="stopHold" @touchstart.prevent.stop="startHold(attr.allocKey)" @touchend.stop="stopHold" @touchcancel.stop="stopHold">＋</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        <!-- 浮层提示 -->
        <teleport to="body">
          <div v-if="activeTooltip"
            class="fixed z-[99999] bg-#303133 text-white text-3vh rounded-xl px-3vh py-2vh shadow-xl pointer-events-none whitespace-pre-line leading-relaxed"
            :style="tooltipPos">
            {{ activeTooltip }}
          </div>
        </teleport>
      </el-tab-pane>

      <!-- 物品栏 -->
      <el-tab-pane v-if="shouldShowTab('inventory')" name="inventory">
        <template #label>
          <span class="text-3vh">{{ L('inventoryTab') }}</span>
        </template>
        <div class="h-70vh">
          <BagPanel :external-detail="true" :daoju-img-map="daojuImgMap" :card-img-map="cardImgMap"
            @select-item="(d) => selectItem(d.item, d.index)" />
        </div>

        <!-- 物品详情弹窗 -->
        <el-dialog v-model="itemDialogVisible" :title="tr(activeItem?.name || L('itemDetail'))" width="30vw" top="4vh"
          :close-on-click-modal="true" :show-close="true" custom-class="item-detail-dialog" @close="closeItemDetail">
          <template #header>
            <div class="flex items-center gap-x-2vh">
              <span class="text-2.5vh font-bold text-black">
                {{ tr(activeItem?.name || L('itemDetail')) }}
              </span>
            </div>
          </template>

          <div v-if="activeItem" class="flex flex-col gap-y-1.5vh">
            <!-- 物品头部 -->
            <div class="flex items-center gap-x-3vh pb-3vh border-b border-#409EFF/30">
              <!-- 物品图标 -->
              <div
                class="w-15vh h-15vh rounded-xl overflow-hidden border-2 shadow-lg flex-shrink-0 bg-gradient-to-br from-#F5F7FA to-#E4E7ED flex items-center justify-center"
                :style="{ borderColor: getItemQualityColor(activeItem) }">
                <!-- 道具 Spines 渲染 -->
                <img v-if="!activeItem.isCard && daojuImgMap[activeItem.img]" :src="daojuImgMap[activeItem.img]"
                  class="w-12vh h-12vh object-contain" />
                <img v-else-if="!activeItem.isCard" :src="inventoryImg(activeItem.img)"
                  class="w-12vh h-12vh object-contain" />
                <img v-else-if="cardImgMap[activeItem.name]" :src="cardImgMap[activeItem.name]"
                  class="w-12vh h-12vh object-contain scale-210" />
                <div v-else class="w-12vh h-12vh flex items-center justify-center text-4vh font-bold"
                  :style="{ color: activeItem.color }">
                  {{ activeItem.name.charAt(0) }}
                </div>
              </div>
              <!-- 物品信息 -->
              <div class="flex flex-col gap-y-1vh flex-1">
                <div class="text-2vh text-#333">
                  {{ L('qtyLabel') }} <span class="text-#E6A23C font-bold">{{ activeItem.num }}</span>
                </div>
                <div class="text-2vh font-medium text-black">
                  {{ tr(getItemType(activeItem)) }}
                </div>
                <!-- 卡牌专属信息 -->
                <div v-if="activeItem.isCard" class="flex gap-x-2vh text-2vh">
                  <span class="text-#909399">{{ L('costLabel') }} <span class="text-#E6A23C font-bold">{{ activeItem.cost
                      }}</span></span>
                </div>
              </div>
            </div>

            <!-- 物品描述 -->
            <div>
              <div class="text-2.5vh font-bold text-black mb-1.5vh">{{ activeItem.isCard ? L('cardEffect') : L('itemDescLabel') }}</div>
              <div class="text-2.7vh text-#333 leading-relaxed font-medium whitespace-pre-line" v-html="tr(getItemMiaoshu(activeItem))"></div>
            </div>

            <!-- 碎片信息（仅碎片显示） -->
            <div v-if="activeItem.img === 'suipian'"
              class="p-2.5vh rounded-xl bg-gradient-to-r from-#8B5CF6/15 to-#EC4899/15 border border-#8B5CF6/30">
              <div class="flex items-center justify-between mb-1.5vh">
                <span class="text-2.5vh font-bold text-#333">{{ L('craftShards') }}</span>
                <span class="text-2.8vh font-bold text-#E6A23C">
                  {{ activeItem.num }} {{ L('unitPcs') }}
                </span>
              </div>
              <div class="w-full h-1.5vh bg-#E4E7ED rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-#8B5CF6 to-#EC4899"
                  :style="{ width: Math.min(activeItem.num / 17 * 100, 100) + '%' }">
                </div>
              </div>
              <div class="text-2.2vh text-#909399 mt-1.5vh leading-relaxed">
                {{ L('fragmentInfoLine1') }}<br />
                {{ L('fragmentInfoLine2') }}
              </div>
            </div>

            <!-- 卡牌升星 / 稀有度信息 -->
            <div v-if="activeItem.isCard">
              <div class="text-2vh font-bold text-#333 mb-1.5vh">{{ L('starRarity') }}</div>
              <div class="flex flex-col gap-y-1.5vh">
                <div class="p-1.5vh rounded-lg border border-#E4E7ED/30 bg-#F5F7FA/10">
                  <div class="flex items-center justify-between">
                    <span class="text-2vh font-medium text-#333">
                      ⭐ {{ getCardStar(activeItem) }} {{ L('starUnit') }}
                    </span>
                    <span class="text-1.6vh px-1vh py-0.3vh rounded-full font-medium"
                      :style="{ background: rarityColor(getCardRarity(activeItem)) + '22', color: rarityColor(getCardRarity(activeItem)) }">
                      {{ rarityName(getCardRarity(activeItem)) }}
                    </span>
                  </div>
                  <template v-if="getCardStar(activeItem) < 3">
                    <div class="flex items-center justify-between mt-2.5vh">
                      <span class="text-2vh text-#909399">{{ L('starUpNeed') }}</span>
                      <span class="text-2.2vh font-bold text-#F56C6C">{{ getStarUpNeed(activeItem) }} {{ L('cardUnit') }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-4vh mt-4vh text-black text-center">{{ L('maxStarShort') }}</div>
                  </template>
                </div>
              </div>
            </div>

            <!-- 物品属性（如果有） -->
            <div v-if="activeItem.Hp || activeItem.moli">
              <div class="text-2vh font-bold text-white mb-2vh">{{ L('itemEffect') }}</div>
              <div class="flex flex-col gap-y-1.5vh">
                <div v-if="activeItem.Hp" class="flex justify-between text-1.7vh">
                  <span class="text-#909399">{{ L('restoreHp') }}</span>
                  <span class="text-#67C23A font-bold">+{{ activeItem.Hp }}</span>
                </div>
                <div v-if="activeItem.moli" class="flex justify-between text-1.7vh">
                  <span class="text-#909399">{{ L('manaCap') }}</span>
                  <span class="text-#E6A23C font-bold">+{{ activeItem.moli }}</span>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex gap-x-2vh">
              <template v-if="activeItem?.wuqi">
                <div
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#409EFF text-white hover:bg-#66B1FF"
                  @click="useItem('wuqi')">
                  {{ L('wearItem') }}
                </div>
              </template>
              <!-- 🧪 消耗品（药水等）：优先使用（恢复生命/灵力），而不是装备 -->
              <template v-else-if="activeItem?.shiyong">
                <div
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#67C23A text-white hover:bg-#85CE6A"
                  @click="useItem('eat')">
                  {{ L('useItemBtn') }}
                </div>
                <!-- 💊 永浆类：可给予 NPC 使用（焚力/幽铠/迅霆永浆） -->
                <div v-if="activeItem?.giveNpc"
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#409EFF text-white hover:bg-#66B1FF"
                  @click="openFeedDialog">
                  {{ L('giveToNpc') }}
                </div>
              </template>
              <!-- 🍓 可食用材料（如赤莓）：直接食用恢复生命，分类仍是材料 -->
              <template v-else-if="user.isEdibleHpItem(activeItem?.name)">
                <div
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#67C23A text-white hover:bg-#85CE6A"
                  @click="eatFood">
                  {{ L('eatBtn') }}
                </div>
              </template>
              <!-- 🍎 食物类：食用（玩家经验）/ 喂食（NPC经验） -->
              <template v-else-if="isFoodItem(activeItem)">
                <div
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#E6A23C text-white hover:bg-#F0B84D"
                  @click="eatFood">
                  {{ L('eatBtn') }}
                </div>
                <div
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#409EFF text-white hover:bg-#66B1FF"
                  @click="openFeedDialog">
                  {{ L('feedBtn') }}
                </div>
              </template>
              <template v-else-if="activeItem?.isItem">
                <div v-if="!isItemEquipped(activeItem.name)"
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all"
                  :class="equippedItemList.length >= maxEquipItems ? 'bg-#909399/30 text-#909399 cursor-not-allowed' : 'bg-#409EFF text-white hover:bg-#66B1FF'"
                  @click="equippedItemList.length >= maxEquipItems || equipItem(activeItem.name)">
                  {{ L('equipBtn') }}
                </div>
                <div v-else
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#E6A23C text-white hover:bg-#F0B84D"
                  @click="unequipItem(activeItem.name)">
                  {{ L('unequipBtn') }}
                </div>
              </template>
              <!-- 卡牌操作按钮：升星 / 分解 -->
              <template v-else-if="activeItem?.isCard">
                <!-- 升星：需要 5 张且未满 3 星 -->
                <div v-if="getCardStar(activeItem) < 3 && activeItem.num >= 5"
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#E6A23C text-white hover:bg-#F0B84D"
                  @click="starUpActiveCard">
                  ⭐ {{ L('starUpBtn') }}
                </div>
                <!-- 分解：需要至少 1 张（射击卡同样可分解，分解获得金币） -->
                <div
                  class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center cursor-pointer transition-all bg-#F56C6C text-white hover:bg-#F78989"
                  @click="decomposeCard">
                  {{ L('decomposeBtn') }} (+{{ getCardGoldValue(activeItem) }} 金币)
                </div>
              </template>
              <!-- 碎片合成按钮：仅碎片显示 -->
              <template v-else-if="activeItem?.img === 'suipian'">
                <div class="flex-1 px-2vh py-1.5vh rounded-lg text-2.5vh font-medium text-center transition-all"
                  :class="fragmentCount < 8 ? 'bg-#909399/30 text-#909399 cursor-not-allowed' : 'bg-#409EFF text-white hover:bg-#66B1FF cursor-pointer'"
                  @click="fragmentCount >= 8 && openCraftDialog()">
                  {{ L('craftCardBtn') }}
                </div>
              </template>
            </div>
          </template>
        </el-dialog>

        <!-- 🍎 喂食同伴选择弹窗 -->
        <el-dialog v-model="feedDialogVisible" :title="L('chooseFeedAlly')" width="46vw" top="8vh" :close-on-click-modal="true"
          custom-class="feed-dialog">
          <div class="flex flex-col gap-y-2vh max-h-60vh overflow-y-auto pr-1vh">
            <div v-for="a in feedAllyList" :key="a.img"
              class="flex items-center gap-x-2.5vh p-2.5vh rounded-xl bg-#F5F7FA hover:bg-#ECF5FF cursor-pointer transition-all border border-transparent hover:border-#409EFF/40"
              @click="feedToAlly(a.img)">
              <img :src="ImgSrc(a.img)"
                class="w-9vh h-9vh rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                @error="e => e.target.style.opacity = 0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-x-1.5vh flex-wrap">
                  <span class="text-2.8vh font-bold truncate" :style="{ color: a.color || '#303133' }">{{ a.name
                    }}</span>
                  <span
                    class="text-2vh text-white bg-gradient-to-r from-#8B5CF6 to-#EC4899 rounded-full px-1.5vh py-0.3vh flex-shrink-0">Lv.{{
                    a.level }}</span>
                  <span class="text-1.8vh font-semibold flex-shrink-0" style="color:#f472b6">💗 {{ Math.min(100,
                    a.affection
                    ?? 0) }}</span>
                </div>
                <div class="flex items-center gap-x-1.5vh mt-1vh">
                  <div class="flex-1 h-1.5vh bg-#E4E7ED rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-#67C23A to-#95D475"
                      :style="{ width: Math.min(a.exp / a.maxExp * 100, 100) + '%' }"></div>
                  </div>
                  <span class="text-1.8vh text-#909399 flex-shrink-0">{{ a.exp }}/{{ a.maxExp }}</span>
                </div>
                <div class="flex items-center gap-x-2.5vh mt-1vh text-1.8vh font-semibold flex-wrap">
                  <span style="color:#F56C6C">⚔ {{ L('attackLabel') }} {{ a.attack }}</span>
                  <span style="color:#38BDF8">⚡ {{ L('speedLabel') }} {{ a.speed }}</span>
                </div>
              </div>
              <div
                class="text-2.2vh text-#409EFF font-bold flex-shrink-0 px-2.5vh py-1vh rounded-full bg-#409EFF/10 hover:bg-#409EFF/20">
                {{ L('feedBtn') }}</div>
            </div>
            <div v-if="feedAllyList.length === 0" class="text-center text-#909399 text-2.5vh py-8vh">{{ L('noFeedAlly') }}</div>
          </div>
        </el-dialog>

        <!-- 碎片合成卡牌弹窗 -->
        <el-dialog v-model="showCraftDialog" :title="L('craftCardBtn')" width="50vw" top="2vh" :close-on-click-modal="true"
          custom-class="exchange-dialog">
          <div class="flex flex-col gap-y-2vh">
            <!-- 顶部提示 -->
            <div
              class="flex items-center justify-between p-2vh rounded-xl bg-gradient-to-r from-#8B5CF6/15 to-#EC4899/15 border border-#8B5CF6/30">
              <div class="flex items-center gap-x-1.5vh">
                <img v-if="daojuImgMap['suipian']" :src="daojuImgMap['suipian']" class="w-4vh h-4vh" />
                <img v-else :src="inventoryImg('suipian')" class="w-4vh h-4vh" />
                <span class="text-2vh text-#333">{{ L('currentShards') }}<span class="font-bold text-#E6A23C">{{ fragmentCount }}</span>
                  {{ L('unitPcs') }}</span>
              </div>
              <span class="text-1.8vh text-#909399">{{ L('craftCostHint') }}</span>
            </div>

            <!-- 卡牌选择区域（仅普通/优秀/稀有可合成） -->
            <div class="text-2vh font-bold text-#333 mb-1vh">{{ L('chooseCraftCard') }}</div>
            <div class="grid grid-cols-6 gap-x-2vh gap-y-2vh max-h-50vh overflow-y-auto pr-1vh">
              <div v-for="card in craftableCardList" :key="card.name"
                class="relative w-full h-0 pt-[148.28%] rounded-lg overflow-hidden cursor-pointer group shadow-md transition-all duration-200"
                :class="[
                  selectedCraftCard === card.name ? 'ring-2 ring-#409EFF scale-105' : 'hover:scale-105',
                ]" @click="selectedCraftCard = card.name">
                <div class="absolute inset-0">
                  <!-- 卡牌背景 -->
                  <div class="absolute inset-0" :style="{
                    background: `linear-gradient(180deg, ${card.color}22 0%, ${card.color}11 40%, ${card.color}33 100%)`,
                  }"></div>
                  <!-- 卡牌边框 -->
                  <div class="absolute inset-0 rounded-lg border-2 transition-all"
                    :style="{ borderColor: selectedCraftCard === card.name ? '#409EFF' : card.color + '88' }"></div>
                  <!-- 灵力消耗（左上角） -->
                  <div class="absolute top-[4%] left-[8%] text-2.5vh font-bold z-10 text-#409EFF">
                    {{ card.cost }}
                  </div>
                  <!-- 卡牌名称 -->
                  <div
                    class="absolute top-[5%] left-1/2 -translate-x-1/2 text-center text-1.8vh z-10 w-full font-bold text-black iconfont2">
                    {{ tr(card.name) }}
                  </div>
                  <!-- 稀有度角标 -->
                  <div class="absolute top-[14%] left-1/2 -translate-x-1/2 z-10">
                    <span class="text-1.4vh px-0.8vh py-0.2vh rounded-full font-medium"
                      :style="{ background: rarityColor(card.rarity) + '33', color: rarityColor(card.rarity) }">
                      {{ rarityName(card.rarity) }}
                    </span>
                  </div>
                  <!-- 合成消耗 -->
                  <div class="absolute bottom-[5%] left-[8%] z-10">
                    <span class="text-1.4vh px-0.8vh py-0.2vh rounded-full bg-black/50 text-white">
                      {{ getCardCraftCost(card) }} {{ L('shardUnit') }}
                    </span>
                  </div>
                  <!-- 已拥有数量 -->
                  <div class="absolute bottom-[5%] right-[8%] z-10">
                    <span class="text-1.4vh px-0.8vh py-0.2vh rounded-full bg-black/50 text-white">
                      {{ L('ownedLabel') }} {{ card.num || 0 }}
                    </span>
                  </div>
                  <!-- 中间卡牌图 -->
                  <div class="absolute inset-0 z-1 pointer-events-none">
                    <img v-if="cardImgMap[card.name]" :src="cardImgMap[card.name]"
                      class="w-full h-full object-cover pointer-events-none" draggable="false" />
                  </div>
                  <!-- 选中标记 -->
                  <div v-if="selectedCraftCard === card.name"
                    class="absolute top-1vh right-1vh w-3vh h-3vh rounded-full bg-#409EFF flex items-center justify-center z-20">
                    <span class="text-white text-1.5vh">✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex gap-x-2vh">
              <el-button @click="closeCraftDialog" class="flex-1">
                {{ L('cancel') }}
              </el-button>
              <el-button type="primary" @click="confirmCraftCard"
                :disabled="!selectedCraftCard || fragmentCount < getSelectedCraftCost()" class="flex-1">
                {{ L('confirmCraftBtn') }} ({{ L('spendLabel') }}{{ getSelectedCraftCost() }} {{ L('shardUnit') }})
              </el-button>
            </div>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- 卡牌图鉴 -->
      <el-tab-pane v-if="shouldShowTab('cardBook')" name="cardBook" class="pt-1.5vh">
        <template #label>
          <span class="text-3vh">{{ L('cardBookTab') }}</span>
        </template>
        <div class="flex flex-col h-66vh  pb-4vh ">
          <!-- 切换标签 -->
          <div class="flex gap-x-2vh px-2vh pb-1vh flex-shrink-0">
            <div class="px-2vw py-0.8vh rounded-full cursor-pointer text-1.4vw font-medium transition-all"
              :class="cardTab === 'owned' ? 'bg-gradient-to-r from-#409EFF to-#66B1FF text-white shadow-md' : 'bg-#F5F7FA text-#606266 hover:bg-#E4E7ED'"
              @click="cardTab = 'owned'; closeEvoPanel()">
              ✨ {{ L('unlockedLabel') }} ({{ ownedCardList.length }})
            </div>
            <div class="px-2vw py-0.8vh rounded-full cursor-pointer text-1.4vw font-medium transition-all"
              :class="cardTab === 'locked' ? 'bg-gradient-to-r from-#409EFF to-#66B1FF text-white shadow-md' : 'bg-#F5F7FA text-#606266 hover:bg-#E4E7ED'"
              @click="cardTab = 'locked'; closeEvoPanel()">
              🔒 {{ L('lockedLabel') }} ({{ lockedCardList.length }})
            </div>
          </div>
          <el-divider style="margin: 0 0;" />
          <!-- 筛选栏：稀有度 / 灵力花费 / 属性伤害（可多条件叠加） -->
          <div class="flex flex-wrap gap-x-1.5vh gap-y-1vh px-2vh py-1.5vh flex-shrink-0">
            <el-select v-model="cardBookRarity">
              <el-option :label="L('allRarity')" value="all" />
              <el-option v-for="opt in rarityOptions" :key="opt.value" :label="L(opt.name)" :value="opt.value" />
            </el-select>
            <el-select v-model="cardBookCost">
              <el-option :label="L('allMana')" value="all" />
              <el-option v-for="c in costOptions" :key="c" :label="`${c} ${L('manaUnit')}`" :value="c" />
            </el-select>
            <el-select v-model="cardBookDmgType">
              <el-option :label="L('allElement')" value="all" />
              <el-option v-for="opt in dmgTypeOptions" :key="opt.value" :label="L(opt.name)" :value="opt.value" />
            </el-select>
          </div>
          <!-- 卡牌列表 -->
          <div
            class="grid  md:grid-cols-6 xl:grid-cols-7 gap-x-2vh gap-y-2.5vh px-2vh py-2vh overflow-y-auto flex-1 box-border content-start card-gallery-scroll">
            <div v-for="card in displayCards" :key="card.name"
              class="relative w-full h-0 pt-[148.28%] rounded-lg overflow-hidden cursor-pointer group shadow-md transition-all duration-200 touch-manipulation"
              :class="[
                !card.owned && 'grayscale opacity-60',
                activeDescCard === card.name && 'scale-110'
              ]" @click="toggleCardDesc(card)">
              <!-- 内容层（占满整个卡牌区域） -->
              <div class="absolute inset-0">
                <!-- 卡牌背景 -->
                <div class="absolute inset-0" :style="{
                  background: `linear-gradient(180deg, ${card.color}22 0%, ${card.color}11 40%, ${card.color}33 100%)`,
                }"></div>

                <!-- 卡牌边框 -->
                <div class="absolute inset-0 rounded-lg border-2 group-hover:border-opacity-100 transition-all"
                  :style="{ borderColor: card.color + '88' }"></div>

                <!-- 锁定遮罩 -->
                <div v-if="!card.owned"
                  class="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
                  <div class="flex flex-col items-center gap-y-1vh">
                    <div class="text-5vh">🔒</div>
                    <div class="text-white text-1.3vw font-medium">{{ L('lockedLabel') }}</div>
                    <div class="text-white/70 text-1.1vh">{{ L('clickToView') }}</div>
                  </div>
                </div>

                <!-- 灵力消耗（左上角） -->
                <div class="absolute top-[4%] left-[8%] text-3.5vh font-bold z-10 text-#409EFF">
                  {{ getCardCostAtStar(card) }}
                </div>

                <!-- 卡牌名称（绝对居中） -->
                <div
                  class="absolute top-[5%] left-1/2  -translate-x-1/2 text-center text-3vh  z-10 w-full  font-bold text-black iconfont2 ">
                  {{ tr(card.name) }}
                </div>

                <!-- 星级标记（右上角） -->
                <div v-if="card.owned && card.star" class="absolute top-[0%] right-[4%] z-10">
                  <span class="text-2vh px-1vh py-0.3vh rounded-full text-white font-medium bg-black/50">
                    ⭐{{ card.star }}
                  </span>
                </div>
                <!-- 中间 Spine 卡牌图 -->
                <div class="absolute inset-0 z-1 pointer-events-none">
                  <img v-if="cardImgMap[card.name]" :src="cardImgMap[card.name]"
                    class="w-full h-full object-cover pointer-events-none" draggable="false" />
                </div>

              </div>
            </div>
          </div>
          <!-- 筛选结果为空提示 -->
          <div v-if="displayCards.length === 0"
            class="flex flex-col items-center justify-center py-8vh text-#909399 flex-shrink-0">
            <div class="text-4vh mb-1.5vh">🔍</div>
            <div class="text-2vh">{{ L('noMatchCard') }}</div>
          </div>
        </div>

        <!-- 右侧进化介绍弹窗 -->
        <Teleport to="body">
          <Transition name="slide-right">
            <div v-if="activeEvoCard"
              class="fixed top-0 right-0 h-full w-25vw z-[9999] bg-gradient-to-b from-#1a1a2e to-#16213e border-l-2 border-#409EFF/50 overflow-y-auto shadow-2xl">
              <!-- 关闭按钮 -->
              <div class="absolute top-2vh right-1.5vw z-10">
                <button @click="closeEvoPanel"
                  class="w-4vh h-4vh rounded-full bg-black/50 text-white text-2vh flex items-center justify-center hover:bg-black/70 transition-all">
                  ✕
                </button>
              </div>

              <!-- 卡牌头部信息 -->
              <div class="pt-4vh px-2vw pb-3vh border-b border-#409EFF/30">
                <div class="flex items-center gap-x-2vh">
                  <!-- 卡牌信息 -->
                  <div class="flex flex-col gap-y-1vh flex-1">
                    <div class="text-3.5vh font-bold flex items-center gap-x-1vh"
                      :style="{ color: activeEvoCard.color }">
                      <span>{{ tr(activeEvoCard.name) }}</span>
                      <span class="text-2vh font-medium" :style="{ color: rarityColor(getCardRarity(activeEvoCard)) }">
                        （{{ rarityName(getCardRarity(activeEvoCard)) }}）
                      </span>
                    </div>
                    <div class="text-2.5vh text-#C0C4CC leading-relaxed font-medium" v-html="getCardFullDesc(activeEvoCard, getCardStar(activeEvoCard))"></div>
                    <div class="flex gap-x-2vh text-1.6vh font-medium">
                      <span class="text-#409EFF text-2.6vh iconfont2">{{ getCardCostAtStar(activeEvoCard) > 0 ? `${L('costLabel')} ${getCardCostAtStar(activeEvoCard)} ${L('manaUnit')}`
                        : L('noCost')
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 星级信息 -->
              <div class="px-2vw py-2vh">
                <div class="flex items-center gap-x-1vh mb-2vh">
                  <span class="text-2.5vh font-bold text-#67C23A">{{ L('starEffect') }}</span>
                  <span v-if="!activeEvoCard.num || activeEvoCard.num <= 0"
                    class="text-1.4vh px-1vh py-0.3vh rounded-full bg-#F56C6C/20 text-#F56C6C font-medium ml-auto">
                    🔒 {{ L('lockedLabel') }}
                  </span>
                </div>
                <div class="flex flex-col gap-y-1.5vh">
                  <!-- 下一星级效果（含具体倍率 + 星级特殊效果） -->
                  <div v-if="getCardStar(activeEvoCard) < 3"
                    class="p-2vh rounded-lg bg-gradient-to-r from-#E6A23C/15 to-#E6A23C/5 border border-#E6A23C/30">
                    <div class="flex items-center justify-between mb-1vh">
                      <span class="text-1.9vh font-bold text-#E6A23C">
                        {{ '⭐'.repeat(Math.min(3, getCardStar(activeEvoCard) + 1)) }} {{ L('nextStar') }}
                      </span>
                      <span class="text-1.9vh px-1vh py-0.3vh rounded-full bg-#E6A23C/20 text-#E6A23C font-medium">
                        {{ L('starUpPreview') }}
                      </span>
                    </div>
                    <div class="text-2.4vh text-#DCDFE6 leading-relaxed font-medium whitespace-pre-line" v-html="getCardFullDesc(activeEvoCard, Math.min(3, getCardStar(activeEvoCard) + 1))"></div>
                  </div>

                  <!-- 升星按钮 -->
                  <div v-if="(getCardStar(activeEvoCard)) < 3 && activeEvoCard.num > 0"
                    class="p-2vh rounded-lg bg-gradient-to-r from-#E6A23C/15 to-#E6A23C/5 border border-#E6A23C/30">
                    <div class="flex items-center justify-between mb-1vh">
                      <span class="text-1.9vh font-bold text-#E6A23C">{{ L('starUpBtn') }}</span>
                      <span class="text-1.9vh px-1vh py-0.3vh rounded-full bg-#E6A23C/20 text-#E6A23C font-medium">
                        {{ L('need3Cards') }}
                      </span>
                    </div>
                    <div class="text-2.4vh text-#DCDFE6 leading-relaxed font-medium">
                      {{ L('currentOwn') }} <span class="text-#E6A23C font-bold">{{ getHighestStarCount(activeEvoCard.name) }}</span>
                      {{ L('cardUnit') }} {{ getCardStar(activeEvoCard) }} {{ L('starCardUnit') }} {{ Math.min(3, getCardStar(activeEvoCard) + 1) }} {{ L('starUnit') }}
                    </div>
                    <div
                      class="mt-1.5vh px-2vh py-1vh rounded-lg text-2.2vh font-medium text-center cursor-pointer transition-all"
                      :class="getHighestStarCount(activeEvoCard.name) >= 5
                        ? 'bg-#E6A23C text-white hover:bg-#F0B84D'
                        : 'bg-#909399/30 text-#909399 cursor-not-allowed'"
                      @click="getHighestStarCount(activeEvoCard.name) >= 5 && openStarUpConfirm()">
                      ⭐ {{ L('starUpBtn') }}
                    </div>
                  </div>
                  <div v-if="(getCardStar(activeEvoCard)) >= 3"
                    class="p-2vh rounded-lg bg-gradient-to-r from-#F56C6C/10 to-#F56C6C/5 border border-#F56C6C/20">
                    <div class="text-2vh text-#F56C6C font-bold text-center">{{ L('maxStarReached') }}</div>
                  </div>
                  <div v-if="!activeEvoCard.num || activeEvoCard.num <= 0"
                    class="text-center py-2vh text-2vh text-#909399">
                    {{ L('unlockToUpgrade') }}
                  </div>
                </div>
              </div>

              <!-- 🎖 熟练度信息 -->
              <div v-if="activeEvoCard.mastery" class="px-2vw py-2vh border-t border-#409EFF/20">
                <div class="flex items-center gap-x-1vh mb-1.5vh">
                  <span class="text-2.5vh font-bold text-#F0A020">🎖 {{ L('cardMastery') }}</span>
                  <span v-if="!activeEvoCard.num || activeEvoCard.num <= 0"
                    class="text-1.4vh px-1vh py-0.3vh rounded-full bg-#F56C6C/20 text-#F56C6C font-medium ml-auto">
                    🔒 {{ L('lockedLabel') }}
                  </span>
                </div>
                <div class="flex flex-col gap-y-1.5vh">
                  <!-- 当前等级 -->
                  <div class="flex items-center justify-between">
                    <span class="text-2vh text-#C0C4CC font-medium">{{ L('masteryLevel') }}</span>
                    <span class="text-2.6vh font-black text-#FFD700">Lv.{{ getCardMasteryLevel(activeEvoCard.name) }}</span>
                  </div>
                  <!-- 经验进度 -->
                  <div class="flex flex-col gap-y-0.8vh">
                    <div class="flex items-center justify-between text-1.8vh text-#C0C4CC">
                      <span>{{ L('masteryExp') }}</span>
                      <span class="font-bold text-#E6A23C">{{ getCardMastery(activeEvoCard.name).exp }} / {{ getCardMasteryNeed(activeEvoCard.name) }}</span>
                    </div>
                    <div class="w-full h-1.8vh bg-black/40 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-#E6A23C to-#FFD700 rounded-full transition-all duration-300"
                        :style="{ width: getMasteryProgress(activeEvoCard.name) + '%' }"></div>
                    </div>
                    <div class="text-1.5vh text-#909399">{{ L('masteryNeedHint') }}</div>
                  </div>
                  <!-- 当前效果 -->
                  <div class="p-2vh rounded-lg bg-gradient-to-r from-#E6A23C/15 to-#E6A23C/5 border border-#E6A23C/30">
                    <div class="text-1.9vh font-bold text-#E6A23C mb-0.8vh">{{ L('masteryCurrentEffect') }}</div>
                    <div class="text-2.2vh text-#DCDFE6 leading-relaxed font-medium">{{ getMasteryCurrentEffect(activeEvoCard) }}</div>
                  </div>
                  <!-- 下一级效果 -->
                  <div class="p-2vh rounded-lg bg-gradient-to-r from-#67C23A/15 to-#67C23A/5 border border-#67C23A/30">
                    <div class="flex items-center justify-between mb-0.8vh">
                      <span class="text-1.9vh font-bold text-#67C23A">{{ L('masteryNextEffect') }}</span>
                      <span class="text-1.8vh px-1vh py-0.3vh rounded-full bg-#67C23A/20 text-#67C23A font-medium">
                        Lv.{{ getCardMasteryLevel(activeEvoCard.name) + 1 }}
                      </span>
                    </div>
                    <div class="text-2.2vh text-#DCDFE6 leading-relaxed font-medium">{{ activeEvoCard.mastery.desc }}</div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
        <!-- 升星确认弹窗（卡牌图鉴用） -->
        <el-dialog v-model="showEvoConfirm" title="" width="28vw" :close-on-click-modal="true" top="2.5vh"
          custom-class="evo-confirm-dialog" :show-close="true">
          <div v-if="activeEvoCard" class="flex flex-col">
            <!-- 顶部标题 -->
            <div class="flex items-center justify-center gap-x-1.5vh mb-2vh">
              <el-icon size="5vh" class=" text-#E6A23C">
                <Star />
              </el-icon>
              <span class="text-3vh font-bold text-black">{{ L('cardStarUp') }}</span>
              <el-icon size="5vh" class=" text-#E6A23C">
                <Star />
              </el-icon>
            </div>

            <!-- 卡牌信息 -->
            <div class="flex items-center gap-x-3vh mb-2vh p-3vh rounded-xl bg-black/70  border border-#409EFF/20">
              <!-- 卡牌图标 -->
              <div class="relative w-14vh h-14vh flex-shrink-0">
                <div class="absolute inset-0 rounded-xl bg-gradient-to-br from-#E6A23C/20 to-#E6A23C/5 animate-pulse">
                </div>
                <div class="absolute inset-0.5 rounded-lg overflow-hidden border-2 flex items-center justify-center"
                  :style="{ borderColor: activeEvoCard.color }">
                  <img v-if="cardImgMap[activeEvoCard.name]" :src="cardImgMap[activeEvoCard.name]"
                    class="w-full h-full object-contain scale-185" />
                </div>
              </div>
              <!-- 卡牌信息 -->
              <div class="flex flex-col gap-y-1vh flex-1">
                <div class="text-3vh font-bold" :style="{ color: activeEvoCard.color }">
                  {{ tr(activeEvoCard.name) }}
                </div>
                <div class="flex gap-x-2vh text-2.3vh">
                  <span class="text-#E6A23C">{{ L('costLabel') }} {{ getCardCostAtStar(activeEvoCard) }} {{ L('manaUnit') }}</span>
                </div>
              </div>
            </div>

            <!-- 升星消耗 -->
            <div class="p-3vh rounded-xl bg-gradient-to-r from-#F5F7FA/5 to-#F5F7FA/10 border border-#E4E7ED/20">
              <div class="flex items-center gap-x-1vh mb-2vh">
                <el-icon class="text-1.8vh text-#E6A23C">
                  <Coin />
                </el-icon>
                <span class="text-2vh font-bold text-#333">{{ L('starUpCost') }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-x-1.5vh">
                  <div class="w-6vh h-6vh rounded-lg overflow-hidden border flex items-center justify-center"
                    :style="{ borderColor: activeEvoCard.color }">
                    <img v-if="cardImgMap[activeEvoCard.name]" :src="cardImgMap[activeEvoCard.name]"
                      class="w-full h-full object-contain scale-185 rounded-full" />
                  </div>
                  <span class="text-2.5vh text-black">{{ L('sameStarCards') }}</span>
                </div>
                <div class="flex items-center gap-x-1vh">
                  <span class="text-3vh font-bold"
                    :class="getHighestStarCount(activeEvoCard.name) >= 3 ? 'text-#67C23A' : 'text-#F56C6C'">
                    {{ getHighestStarCount(activeEvoCard.name) }}
                  </span>
                  <span class="text-2vh text-#333">/</span>
                  <span class="text-3vh font-medium text-#333">3</span>
                </div>
              </div>
              <div class="text-2vh text-#333 mt-1.5vh text-right">
                {{ L('consume3Upgrade') }} {{ Math.min(3, (activeEvoCard.star || 1) + 1) }} {{ L('starUnit') }}
              </div>
            </div>

            <!-- 升星后效果 -->
            <div class=" p-2.5vh rounded-xl  bg-#E6A23C/25 border border-#E6A23C/30">
              <div class="text-3.5vh text-black leading-relaxed font-medium">
                {{ '⭐'.repeat(Math.min(3, (getCardStar(activeEvoCard)) + 1)) }} {{ L('starEffect') }}
              </div>
              <div class="text-2.8vh text-black mt-0.5vh whitespace-pre-line" v-html="getCardFullDesc(activeEvoCard, Math.min(3, getCardStar(activeEvoCard) + 1))"></div>
            </div>
          </div>

          <template #footer>
            <div class="flex gap-x-2vh px-1vh">
              <el-button @click="showEvoConfirm = false" class="flex-1 h-5vh text-1.7vh">
                {{ L('cancel') }}
              </el-button>
              <el-button type="primary" @click="confirmStarUpCard"
                :disabled="getHighestStarCount(activeEvoCard?.name) < 3" class="flex-1 text-1.7vh">
                {{ L('confirmStarUp') }}
              </el-button>
            </div>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- 当前卡组 -->
      <el-tab-pane v-if="shouldShowTab('cardCarry')" name="cardCarry">
        <template #label>
          <span class="text-3vh ">当前卡组</span>
        </template>
        <div class="flex flex-col h-72vh">
          <!-- 上半区：当前卡组（战斗抽牌来源） -->
          <div class="px-2vh pt-2vh border-b border-#E4E7ED flex-shrink-0">
            <div class="flex items-center gap-x-1 mb-1.5vh">
              <span class="text-2.3vh font-bold text-#303133">当前卡组</span>
              <span class="text-2.6vh text-#409EFF">{{ deckList.length }} / {{ MAX_DECK_CARDS }} 张</span>
              <span class="ml-auto text-1.8vh text-#909399">初始卡组在后台管理（dladmin）中编辑</span>
            </div>
            <div class="flex gap-x-1.5vh overflow-x-auto pb-1vh" style="scrollbar-width:thin;scrollbar-color:rgba(64,158,255,.4) transparent">
              <div v-for="(cardName, idx) in deckList" :key="'deck-' + cardName + '-' + idx"
                class="relative w-13vh h-[19.2vh] rounded-lg overflow-hidden cursor-pointer group shadow-sm transition-all duration-200 hover:-translate-y-0.3vh flex-shrink-0 select-none"
                @click="removeCardFromDeck(idx)">
                <div class="absolute inset-0">
                  <!-- 卡牌背景 -->
                  <div class="absolute inset-0" :style="{
                    background: `linear-gradient(180deg, ${getCardData(cardName)?.color}22 0%, ${getCardData(cardName)?.color}11 40%, ${getCardData(cardName)?.color}33 100%)`,
                  }"></div>
                  <!-- 卡牌边框 -->
                  <div class="absolute inset-0 rounded-lg border-2"
                    :style="{ borderColor: getCardData(cardName)?.color + '88' }"></div>
                  <!-- 灵力消耗（左上角） -->
                  <div class="absolute top-[3%] left-[7%] text-2.2vh font-bold z-10 text-#409EFF">
                    {{ getCardData(cardName)?.cost }}
                  </div>
                  <!-- 卡牌名称 -->
                  <div
                    class="absolute top-[6%] left-[52%]  w-full  -translate-x-1/2 text-center text-1.5vh  z-10   font-bold text-black iconfont2 ">
                    {{ tr(cardName) }}
                  </div>
                  <!-- 中间卡牌图 -->
                  <div class="absolute inset-0 z-1 pointer-events-none">
                    <img v-if="cardImgMap[cardName]" :src="cardImgMap[cardName]"
                      class="w-full h-full object-cover pointer-events-none" draggable="false" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <el-divider style="margin:1.5vh 0 1vh 0;" />
          <!-- 下半区：卡牌图鉴浏览（仅查看，不修改卡组） -->
          <div class="flex-1 overflow-y-auto px-2vh  pt-0.5vh overflow-y-scroll  pb-5vh">
            <div class="flex items-center justify-between mb-1vh">
              <span class="text-2.6vh font-bold text-#303133">已有卡牌</span>
              <span class="text-2.6vh text-#333 font-bold">&nbsp;</span>
            </div>
            <!-- 筛选栏：稀有度 / 灵力花费 / 属性伤害（可多条件叠加） -->
            <div class="flex flex-wrap gap-x-1.5vh gap-y-1vh mb-1vh">
              <el-select v-model="cardCarryRarity">
                <el-option :label="L('allRarity')" value="all" />
                <el-option v-for="opt in rarityOptions" :key="opt.value" :label="L(opt.name)" :value="opt.value" />
              </el-select>
              <el-select v-model="cardCarryCost">
                <el-option :label="L('allMana')" value="all" />
                <el-option v-for="c in costOptions" :key="c" :label="`${c} ${L('manaUnit')}`" :value="c" />
              </el-select>
              <el-select v-model="cardCarryDmgType">
                <el-option :label="L('allElement')" value="all" />
                <el-option v-for="opt in dmgTypeOptions" :key="opt.value" :label="L(opt.name)" :value="opt.value" />
              </el-select>
            </div>
            <div class="grid md:grid-cols-7 xl:grid-cols-8 gap-x-2vh gap-y-2vh content-start">
              <div v-for="card in deckBookInstances" :key="card.id"
                class="relative w-full h-0 pt-[148.28%] rounded-lg overflow-hidden cursor-pointer group shadow-md transition-all duration-200 select-none"
                :class="!canCarryCard(card) ? 'grayscale opacity-60' : 'hover:-translate-y-0.5vh hover:shadow-lg'"
                @click="onBookCardClick(card)">
                <div class="absolute inset-0">
                  <!-- 卡牌背景 -->
                  <div class="absolute inset-0" :style="{
                    background: `linear-gradient(180deg, ${card.color}22 0%, ${card.color}11 40%, ${card.color}33 100%)`,
                  }"></div>
                  <!-- 卡牌边框 -->
                  <div class="absolute inset-0 rounded-lg border-2 group-hover:border-opacity-100 transition-all"
                    :style="{ borderColor: card.color + '88' }"></div>
                  <!-- 已携带标记：仅当前实例被携带时显示黑色遮罩 + 中间文字 -->
                  <div v-if="card.carried"
                    class="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
                    <span
                      class="text-white text-1.5vh font-bold bg-black/50 px-1.5vh py-0.5vh rounded-full border border-white/25">
                      已携带
                    </span>
                  </div>
                  <!-- 灵力消耗（左上角） -->
                  <div class="absolute top-[4.5%] left-[8.5%] text-2.7vh font-bold z-10 text-#409EFF font-bold">
                    {{ card.cost }}
                  </div>
                  <!-- 卡牌名称 -->
                  <div
                    class="absolute top-[5%] left-[53%] -translate-x-1/2 text-center  text-3vh font-bold z-11 w-full iconfont2 text-black">
                    {{ tr(card.name) }}
                  </div>
                  <!-- 星级（右上角） -->
                  <div v-if="card.num > 0 && card.star" class="absolute top-0 right-0 z-20">
                    <span class="text-1.6vh font-bold text-#E6A23C px-0.8vh py-0.2vh rounded-bl-lg bg-black/50"
                      style="text-shadow: 0 0 2px #fff, 0 1px 2px rgba(0,0,0,0.5);">
                      {{ '⭐'.repeat(Math.min(3, card.star)) }}
                    </span>
                  </div>
                  <!-- 中间卡牌图 -->
                  <div class="absolute inset-0 z-1 pointer-events-none">
                    <img v-if="cardImgMap[card.name]" :src="cardImgMap[card.name]"
                      class="w-full h-full object-cover pointer-events-none" draggable="false" />
                  </div>
                  <!-- 实例序号徽标（右下角）：第 order/N 张，配合独立 id 区分重复卡牌 -->
                  <div
                    class="absolute bottom-0 right-0 z-20 bg-black/60 text-white text-1.6vh font-bold px-1.2vh py-0.2vh rounded-tl-lg">
                    {{ card.order }}/{{ card.num }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="deckBookInstances.length === 0"
              class="flex flex-col items-center justify-center py-8vh text-#909399">
              <div class="text-4vh mb-1.5vh">🃏</div>
              <div class="text-2vh">暂无已有卡牌</div>
            </div>
          </div>
        </div>

                <!-- 已携带卡牌长按详情弹窗 -->
        <el-dialog v-model="handDetailVisible" :title="handDetailCard || L('cardDetail')" width="32vw" top="8vh"
          :close-on-click-modal="true" :show-close="true" custom-class="hand-card-detail-dialog"
          @close="closeHandDetail">
          <template v-if="handDetailCard">
            <div class="flex flex-col gap-y-2vh">
              <!-- 卡牌头部 -->
              <div class="flex items-center gap-x-2.5vh p-2.5vh rounded-xl"
                :style="{ background: `linear-gradient(135deg, ${getCardData(handDetailCard)?.color}22, ${getCardData(handDetailCard)?.color}11)` }">
                <div
                  class="w-12vh h-12vh rounded-xl overflow-hidden border-2 flex-shrink-0 flex items-center justify-center bg-white/10"
                  :style="{ borderColor: getCardData(handDetailCard)?.color }">
                  <img v-if="cardImgMap[handDetailCard]" :src="cardImgMap[handDetailCard]"
                    class="w-full h-full object-contain scale-160" />
                </div>
                <div class="flex flex-col gap-y-1vh flex-1">
                  <div class="text-3vh font-bold flex items-center gap-x-1vh"
                    :style="{ color: getCardData(handDetailCard)?.color }">
                    <span>{{ handDetailCard }}</span>
                    <span class="text-2vh font-medium"
                      :style="{ color: rarityColor(getCardRarity(getCardData(handDetailCard))) }">
                      （{{ rarityName(getCardRarity(getCardData(handDetailCard))) }}）
                    </span>
                  </div>
                  <div class="flex items-center gap-x-1.5vh">
                    <span class="text-2vh font-bold text-#E6A23C">
                      {{ '⭐'.repeat(Math.min(3, getCardStar(getCardData(handDetailCard)))) }}
                      {{ getCardStar(getCardData(handDetailCard)) }} {{ L('starUnit') }}
                    </span>
                    <span class="text-1.7vh px-1vh py-0.3vh rounded-full font-medium"
                      :style="{ background: rarityColor(getCardRarity(getCardData(handDetailCard))) + '22', color: rarityColor(getCardRarity(getCardData(handDetailCard))) }">
                      {{ rarityName(getCardRarity(getCardData(handDetailCard))) }}
                    </span>
                  </div>
                  <div class="flex gap-x-2vh text-1.7vh">
                    <span class="text-#409EFF">{{ L('costLabel') }} <span class="font-bold">{{
                      getCardCostAtStar(getCardData(handDetailCard))
                    }}</span> {{ L('manaUnit') }}</span>
                  </div>
                </div>
              </div>
              <!-- 卡牌效果 -->
              <div class="p-2.5vh rounded-xl bg-#F5F7FA/60 border border-#E4E7ED">
                <div class="text-2vh font-bold text-#333 mb-1vh">{{ L('cardEffect') }}</div>
                <div class="text-2.5vh text-#333 leading-relaxed whitespace-pre-line font-medium" v-html="getCardFullDesc(getCardData(handDetailCard), getCardStar(getCardData(handDetailCard)))"></div>
              </div>
            </div>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- 道具装备 -->
      <el-tab-pane v-if="shouldShowTab('itemEquip')" name="itemEquip">
        <template #label>
          <span class="text-3vh">{{ L('itemEquipTab') }}</span>
        </template>
        <div class="flex flex-col h-72vh">
          <div class="px-2vh pt-2vh border-b border-#E4E7ED flex-shrink-0">
            <div class="flex items-center  gap-x-1 mb-1.5vh">
              <span class="text-2.3vh font-bold text-#303133">{{ L('equippedItems') }}</span>
              <span class="text-2.6vh"
                :class="equippedItemList.length >= maxEquipItems ? 'text-#F56C6C' : 'text-#409EFF'">
                {{ equippedItemList.length }} / {{ maxEquipItems }}
              </span>
            </div>
            <div class="flex flex-wrap gap-x-1.5vh gap-y-1.5vh">
              <!-- 已装备的道具 -->
              <div v-for="itemName in equippedItemList" :key="'equip-' + itemName"
                class="relative w-13vh h-13vh rounded-lg overflow-hidden cursor-pointer group shadow-sm transition-all duration-200 hover:-translate-y-0.3vh flex-shrink-0"
                @click="unequipItem(itemName)">
                <div class="absolute inset-0 bg-gradient-to-br from-#F5F7FA to-#E4E7ED border border-#DCDFE6">
                </div>
                <div class="absolute inset-1 flex items-center justify-center pointer-events-none">
                  <img v-if="daojuImgMap[getItemData(itemName)?.img]" :src="daojuImgMap[getItemData(itemName)?.img]"
                    class="w-full h-full object-contain pointer-events-none" draggable="false" />
                  <img v-else :src="inventoryImg(getItemData(itemName)?.img || 'baishuo_lingjing')"
                    class="w-full h-full object-contain pointer-events-none" draggable="false" />
                </div>
              </div>
              <!-- 空槽位 -->
              <div v-for="i in emptyEquipSlots" :key="'empty-' + i"
                class="relative w-13vh h-13vh rounded-lg border-2 border-dashed border-#DCDFE6 opacity-60 flex-shrink-0 flex items-center justify-center">
                <span class="text-#C0C4CC text-3vh">+</span>
              </div>
            </div>
          </div>
          <el-divider style="margin:1.5vh 0 1vh 0;" />
          <!-- 可选道具区域 -->
          <div class="flex-1 overflow-y-auto px-2vh  py-0.5vh overflow-y-scroll">
            <div class="flex items-center justify-between mb-1vh">
              <span class="text-2.6vh font-bold text-#303133">{{ L('optionalItems') }}</span>
              <span class="text-2.6vh text-#333 font-bold">{{ L('clickItemEquip') }}</span>
            </div>
            <div class="grid md:grid-cols-6 xl:grid-cols-8 gap-x-2vh gap-y-2vh content-start">
              <div v-for="item in availableEquipItems" :key="'avail-item-' + item.name"
                class="relative w-full h-0 pt-[100%] rounded-lg overflow-hidden cursor-pointer group shadow-md transition-all duration-200"
                :class="[
                  isItemEquipped(item.name) ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:-translate-y-0.5vh hover:shadow-lg',
                  item.num <= 0 ? 'grayscale opacity-60 cursor-not-allowed' : ''
                ]" @click="equipItem(item.name)">
                <div
                  class="absolute inset-0 bg-gradient-to-br from-#F5F7FA to-#E4E7ED border border-#DCDFE6 pointer-events-none">
                </div>
                <!-- 已装备标记 -->
                <div v-if="isItemEquipped(item.name) && item.num > 0"
                  class="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
                  <span class="text-white text-1.4vh font-bold bg-#67C23A/80 px-1.2vh py-0.4vh rounded-full">
                    {{ L('equipped') }}
                  </span>
                </div>
                <!-- 道具图片 -->
                <div class="absolute inset-1 flex items-center justify-center">
                  <img v-if="daojuImgMap[item.img]" :src="daojuImgMap[item.img]" class="w-full h-full object-contain" />
                  <img v-else :src="inventoryImg(item.img)" class="w-full h-full object-contain" />
                </div>
                <!-- 道具名称 -->
                <div
                  class="absolute bottom-0 left-0 right-0 text-center text-2vh bg-black/50 text-white py-0.5vh truncate px-0.5vh">
                  {{ tr(item.name) }}
                </div>
              </div>
            </div>
            <!-- 无道具提示 -->
            <div v-if="availableEquipItems.length === 0"
              class="flex flex-col items-center justify-center py-10vh text-#909399">
              <div class="text-5vh mb-2vh">📦</div>
              <div class="text-2vh">{{ L('noEquipItem') }}</div>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="px-2vh pb-2.5vh pt-0.5vh border-t border-#E4E7ED flex-shrink-0 bg-#F5F7FA">
            <div class="flex items-center gap-x-1vh text-1.8vh text-#333">
              <el-icon>
                <InfoFilled />
              </el-icon>
              <span>{{ L('equipHint') }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 卡牌抽取 -->
      <el-tab-pane v-if="shouldShowTab('cardGacha')" name="cardGacha">
        <template #label>
          <span class="text-3vh">{{ L('gachaTab') }}</span>
        </template>
        <div class="relative h-70vh overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
          <!-- 粒子背景 -->
          <div class="absolute inset-0 z-0 overflow-hidden">
            <div v-for="(particle, i) in particles" :key="'particle-' + i" class="absolute rounded-full particle"
              :style="{
                left: particle.left,
                top: particle.top,
                width: particle.width,
                height: particle.height,
                background: particle.background,
                animationDelay: particle.animationDelay,
                animationDuration: particle.animationDuration,
              }">
            </div>
          </div>

          <!-- 主内容区 -->
          <div class="relative z-10 flex flex-col h-full  ">
            <!-- 顶部：卡池切换 + 货币 + 历史记录按钮 -->
            <div class="absolute top-3vh left-0 right-0 flex justify-between items-start px-3vh z-20">
              <!-- 左侧：卡池切换 -->
              <div class="flex gap-x-1.5vh">
                <div
                  class="flex items-center gap-x-1vh bg-black/40 backdrop-blur-sm px-2.5vh py-1.5vh rounded-full border border-purple-500/30 cursor-pointer transition-all"
                  :class="gachaPool === 'normal' ? 'border-purple-400 bg-purple-600/30' : 'hover:bg-purple-600/20'"
                  @click="gachaPool = 'normal'">
                  <span class="text-white text-2vh font-bold">{{ L('normalPool') }}</span>
                </div>
                <div
                  class="flex items-center gap-x-1vh bg-black/40 backdrop-blur-sm px-2.5vh py-1.5vh rounded-full border border-red-500/30 cursor-pointer transition-all"
                  :class="gachaPool === 'premium' ? 'border-red-400 bg-red-600/30' : 'hover:bg-red-600/20'"
                  @click="gachaPool = 'premium'">
                  <span class="text-white text-2vh font-bold">{{ L('premiumPool') }}</span>
                </div>
              </div>
              <!-- 右侧：历史记录 + 货币 -->
              <div class="flex items-center gap-x-1.5vh">
                <el-button size="small"
                  class="bg-black/40 backdrop-blur-sm border border-purple-500/30 text-white hover:bg-purple-600/50"
                  @click="showHistory = true">
                  <span class="flex items-center gap-x-1vh">
                    <el-icon>
                      <Clock />
                    </el-icon>
                    <span>{{ L('historyLabel') }}</span>
                  </span>
                </el-button>
                <!-- 货币数量（按卡池显示） -->
                <div v-if="gachaPool === 'normal'"
                  class="flex items-center gap-x-1.5vh bg-black/40 backdrop-blur-sm px-3vh py-1.5vh rounded-full border border-purple-500/30">
                  <img src="@/assets/daoju/jinghe.webp" class="w-4vh h-4vh object-contain" />
                  <span class="text-white text-2vh font-bold">{{ crystalCount }}</span>
                </div>
                <div v-else
                  class="flex items-center gap-x-1.5vh bg-black/40 backdrop-blur-sm px-3vh py-1.5vh rounded-full border border-red-500/30">
                  <img src="@/assets/daoju/jinghe.webp" class="w-4vh h-4vh object-contain" />
                  <span class="text-red-300 text-2vh font-bold">{{ premiumCrystalCount }}</span>
                </div>
              </div>
            </div>

            <!-- 中间：卡牌展示区 -->
            <div ref="gachaResultRef" class="flex-1 flex gacha-result-container  pb-1vh"
              :class="showResults ? 'items-start justify-center overflow-y-auto pb-3vh' : 'items-center justify-center'">
              <!-- 抽卡前：卡池展示 -->
              <div v-if="!isDrawing && !showResults" class="flex flex-col items-center gap-y-2vh w-full max-w-80vh">
                <!-- 卡池说明 + 概率（合并成一行更紧凑） -->
                <div
                  class="w-full flex flex-col items-center gap-y-1.5vh px-3vh py-1.8vh rounded-2xl backdrop-blur-md shadow-lg border"
                  :class="gachaPool === 'normal'
                    ? 'bg-indigo-950/60 border-purple-500/30'
                    : 'bg-red-950/60 border-red-500/30'">
                  <div class="text-2.2vh font-bold tracking-widest"
                    :class="gachaPool === 'normal' ? 'text-purple-100' : 'text-orange-100'">
                    <template v-if="gachaPool === 'normal'">{{ L('normalPoolDesc') }}</template>
                    <template v-else>{{ L('premiumPoolDesc') }}</template>
                  </div>
                  <!-- 出货概率 -->
                  <div class="flex flex-wrap justify-center gap-x-3.5vh gap-y-0.8vh">
                    <span v-for="rate in gachaRateList" :key="rate.rarity"
                      class="text-1.7vh font-medium text-#909399 flex items-center gap-x-1vh">
                      <span class="w-1.5vh h-1.5vh rounded-full inline-block"
                        :style="{ background: rate.color, boxShadow: `0 0 6px ${rate.color}88` }"></span>
                      <span class="text-white/90">{{ L(rate.name) }}</span>
                      <span class="font-bold" :style="{ color: rate.color }">{{ rate.percent }}%</span>
                    </span>
                  </div>
                </div>

                <div class="relative mt-0.5vh">
                  <!-- 环境光晕 -->
                  <div class="absolute -inset-6vh rounded-full blur-3xl opacity-50 animate-pulse" :class="gachaPool === 'normal'
                    ? 'bg-gradient-to-r from-indigo-500/35 via-purple-500/35 to-fuchsia-500/35'
                    : 'bg-gradient-to-r from-red-500/35 via-orange-500/35 to-yellow-500/35'">
                  </div>

                  <!-- 卡背展示 -->
                  <div class="relative w-23vh h-[30vh] perspective-1000 gacha-card-hover">
                    <div class="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border border-white/15"
                      :class="gachaPool === 'normal' ? 'gacha-card-glow-purple' : 'gacha-card-glow-red'">
                      <!-- 卡背背景 -->
                      <div class="absolute inset-0" :class="gachaPool === 'normal'
                        ? 'bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950'
                        : 'bg-gradient-to-br from-red-950 via-orange-900 to-red-950'">
                        <!-- 斜纹质感 -->
                        <div class="absolute inset-0 gacha-card-texture"></div>
                        <!-- 顶部宝石 -->
                        <div
                          class="absolute top-2.5vh left-1/2 -translate-x-1/2 w-4.5vh h-4.5vh flex items-center justify-center">
                          <div class="w-full h-full rounded-full flex items-center justify-center border-2 shadow-lg"
                            :class="gachaPool === 'normal'
                              ? 'border-indigo-300/70 bg-indigo-500/30 shadow-indigo-400/40'
                              : 'border-orange-300/70 bg-orange-500/30 shadow-orange-400/40'">
                            <div class="w-2vh h-2vh rounded-full" :class="gachaPool === 'normal'
                              ? 'bg-gradient-to-br from-indigo-300 to-purple-400'
                              : 'bg-gradient-to-br from-orange-300 to-yellow-400'">
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- 神秘法阵 -->
                      <div class="absolute inset-0 flex items-center justify-center">
                        <div class="relative w-14vh h-14vh">
                          <!-- 外环 -->
                          <div class="absolute inset-0 rounded-full border border-dashed animate-spin-slow"
                            :class="gachaPool === 'normal' ? 'border-purple-400/50' : 'border-orange-400/50'">
                          </div>
                          <!-- 中环（反向旋转） -->
                          <div class="absolute inset-1.5 rounded-full border border-dashed animate-spin-reverse"
                            :class="gachaPool === 'normal' ? 'border-indigo-400/40' : 'border-red-400/40'">
                          </div>
                          <!-- 内圈 -->
                          <div class="absolute inset-[26%] rounded-full flex items-center justify-center" :class="gachaPool === 'normal'
                            ? 'bg-gradient-to-br from-indigo-500/40 to-purple-500/40'
                            : 'bg-gradient-to-br from-red-500/40 to-orange-500/40'">
                            <div class="text-3vh"
                              :class="gachaPool === 'normal' ? 'animate-pulse' : 'animate-pulse-fast'">
                              {{ gachaPool === 'normal' ? '🌀' : '💎' }}
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- 光芒射线 -->
                      <div class="absolute inset-0 opacity-20">
                        <div v-for="i in 12" :key="i"
                          class="absolute top-1/2 left-1/2 w-px h-24vh bg-gradient-to-t from-transparent via-white to-transparent origin-bottom animate-ray"
                          :style="{ transform: `translate(-50%, -100%) rotate(${i * 30}deg)`, animationDelay: `${i * 0.15}s` }">
                        </div>
                      </div>
                      <!-- 四角装饰 -->
                      <div
                        v-for="(pos, i) in [{ top: '0.8vh', left: '0.8vh' }, { top: '0.8vh', right: '0.8vh' }, { bottom: '0.8vh', left: '0.8vh' }, { bottom: '0.8vh', right: '0.8vh' }]"
                        :key="i" class="absolute w-2.5vh h-2.5vh border-t-2 border-l-2"
                        :class="gachaPool === 'normal' ? 'border-purple-400/60' : 'border-orange-400/60'" :style="pos">
                      </div>
                      <!-- 底部提示 -->
                      <div
                        class="absolute bottom-2.5vh left-1/2 -translate-x-1/2 text-1.5vh text-white/60 font-medium tracking-widest whitespace-nowrap">
                        {{ L('clickDraw') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 抽卡动画中 -->
              <div v-if="isDrawing" class="flex items-center justify-center">
                <div class="relative">
                  <!-- 外层强烈光芒 -->
                  <div
                    class="absolute -inset-12vh bg-gradient-to-r from-yellow-400/30 via-white/50 to-yellow-400/30 blur-3xl rounded-full animate-pulse-fast">
                  </div>

                  <!-- 中层光芒 -->
                  <div
                    class="absolute -inset-8vh bg-gradient-to-br from-indigo-400/40 via-fuchsia-400/40 to-yellow-400/40 blur-2xl rounded-full animate-pulse">
                  </div>

                  <!-- 旋转光线 -->
                  <div class="absolute -inset-5vh">
                    <div class="absolute inset-0 animate-spin-slow opacity-60">
                      <div v-for="i in 8" :key="'ray-' + i"
                        class="absolute top-1/2 left-1/2 w-1 h-24vh bg-gradient-to-t from-transparent via-yellow-300 to-transparent origin-bottom"
                        :style="{ transform: `translate(-50%, -100%) rotate(${i * 45}deg)` }">
                      </div>
                    </div>
                  </div>

                  <!-- 抽取文字 -->
                  <div
                    class="absolute -top-6vh left-1/2 -translate-x-1/2 text-2.5vh font-bold tracking-[0.3em] text-white/90 animate-pulse whitespace-nowrap"
                    style="text-shadow: 0 0 15px rgba(255,200,50,0.6)">
                    {{ L('drawing') }}
                  </div>

                  <!-- 翻转的卡牌 -->
                  <div class="relative w-23vh h-[30vh] perspective-1000 z-10">
                    <div class="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl animate-card-flip"
                      :style="{ transformStyle: 'preserve-3d' }">
                      <!-- 卡背 -->
                      <div class="absolute inset-0 backface-hidden" :style="{ backfaceVisibility: 'hidden' }">
                        <div class="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
                          <!-- 斜纹质感 -->
                          <div class="absolute inset-0 gacha-card-texture"></div>
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center">
                          <div
                            class="w-13vh h-13vh rounded-full border-4 border-purple-400/50 flex items-center justify-center animate-spin-slow">
                            <div
                              class="w-4vh h-4vh rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg shadow-purple-500/50">
                            </div>
                          </div>
                        </div>
                        <!-- 卡背光芒射线 -->
                        <div class="absolute inset-0 opacity-30">
                          <div v-for="i in 12" :key="'back-ray-' + i"
                            class="absolute top-1/2 left-1/2 w-0.5 h-20vh bg-gradient-to-t from-transparent via-purple-400 to-transparent origin-bottom"
                            :style="{ transform: `translate(-50%, -100%) rotate(${i * 30}deg)` }">
                          </div>
                        </div>
                      </div>
                      <!-- 卡面（光芒效果） -->
                      <div class="absolute inset-0 backface-hidden"
                        :style="{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }">
                        <div class="absolute inset-0 bg-gradient-to-br from-yellow-100 via-white to-yellow-100"></div>
                        <div
                          class="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-yellow-400/20">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 抽卡结果展示 -->
              <div v-if="showResults" class="flex flex-col items-center gap-y-3vh w-full px-4vh">
                <div class="text-3.5vh font-bold text-white mb-2vh">{{ L('gachaResult') }}</div>
                <!-- 单抽结果 -->
                <div v-if="gachaResults.length === 1" class="flex flex-col items-center">
                  <div class="relative">
                    <!-- 卡牌光芒效果 -->
                    <div class="absolute inset-0 -m-5vh blur-2xl rounded-full animate-pulse"
                      :style="{ background: `radial-gradient(circle, ${gachaResults[0].color}66 0%, transparent 70%)` }">
                    </div>
                    <!-- 结果卡牌 -->
                    <div
                      class="relative w-25vh h-[37vh] rounded-2xl overflow-hidden shadow-2xl animate-result-appear hover:scale-105 transition-transform z-10">
                      <!-- 卡牌背景渐变 -->
                      <div class="absolute inset-0" :style="{
                        background: `linear-gradient(180deg, ${gachaResults[0].color}33 0%, ${gachaResults[0].color}11 40%, ${gachaResults[0].color}44 100%)`,
                      }"></div>

                      <!-- 卡牌边框 -->
                      <div class="absolute inset-0 rounded-2xl border-4"
                        :style="{ borderColor: gachaResults[0].color + 'aa' }"></div>
                      <!-- 灵力消耗（左上角） -->
                      <div class="absolute top-[4%] left-[8%] text-4vh font-bold z-10 text-#409EFF">
                        {{ gachaResults[0].cost }}
                      </div>
                      <!-- 稀有度角标 -->
                      <div class="absolute top-[2%] right-[8%] z-10">
                        <span class="text-1.8vh px-1.5vh py-0.4vh rounded-full font-bold"
                          :style="{ background: rarityColor(gachaResults[0].rarity) + '44', color: rarityColor(gachaResults[0].rarity) }">
                          {{ rarityName(gachaResults[0].rarity) }}
                        </span>
                      </div>
                      <!-- 卡牌名称 -->
                      <div class="absolute top-2vh left-1/2 -translate-x-1/2 text-center z-10 w-full px-2vh">
                        <div class="text-3.5vh font-bold iconfont2 text-black">
                          {{ tr(gachaResults[0].name) }}
                        </div>
                      </div>



                      <!-- 中间 Spine 卡牌图 -->
                      <div class="absolute inset-0 z-1 pointer-events-none">
                        <img v-if="cardImgMap[gachaResults[0].name]" :src="cardImgMap[gachaResults[0].name]"
                          class="w-full h-full object-cover pointer-events-none" draggable="false" />
                      </div>
                    </div>
                  </div>
                  <div class="text-center mt-3vh">
                    <el-button type="primary" @click="closeResults" class="px-6vh">
                      {{ L('confirmBtn') }}
                    </el-button>
                  </div>
                </div>

                <!-- 十连抽结果 -->
                <div v-else class="w-full gacha-result-wrapper">
                  <div class="grid grid-cols-5 gap-x-5vh gap-y-5vh gacha-result-grid">
                    <div v-for="(card, index) in gachaResults" :key="index"
                      class="relative w-full h-0 pt-[148%] rounded-lg overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-transform animate-result-card"
                      :style="{ animationDelay: `${index * 0.1}s` }" @click="showCardDetail(card)">
                      <div class="absolute inset-0" :style="{
                        background: `linear-gradient(180deg, ${card.color}33 0%, ${card.color}11 40%, ${card.color}44 100%)`,
                      }"></div>
                      <div class="absolute inset-0 rounded-lg border-2" :style="{ borderColor: card.color + '88' }">
                      </div>

                      <!-- 灵力消耗（左上角） -->
                      <div class="absolute top-[4%] left-[7%] text-4vh font-bold z-10 text-#409EFF">
                        {{ card.cost }}
                      </div>

                      <!-- 稀有度角标 -->
                      <div class="absolute top-[2%] right-[5%] z-10">
                        <span class="text-1.4vh px-1vh py-0.3vh rounded-full font-bold"
                          :style="{ background: rarityColor(card.rarity) + '44', color: rarityColor(card.rarity) }">
                          {{ rarityName(card.rarity) }}
                        </span>
                      </div>

                      <!-- 卡牌名称 -->
                      <div class="absolute top-[5%] left-1/2 -translate-x-1/2 text-center z-10 w-full px-1vh ml-0.5vw">
                        <div class="text-3vh font-bold truncate iconfont2 text-black">
                          {{ tr(card.name) }}
                        </div>
                      </div>



                      <!-- 中间 Spine 卡牌图 -->
                      <div class="absolute inset-0 z-1 pointer-events-none">
                        <img v-if="cardImgMap[card.name]" :src="cardImgMap[card.name]"
                          class="w-full h-full object-cover pointer-events-none" draggable="false" />
                      </div>
                    </div>
                  </div>
                  <div class="text-center mt-3vh">
                    <el-button type="primary" @click="closeResults" class="px-6vh">
                      {{ L('confirmBtn') }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部：抽卡按钮 -->
            <div v-if="!isDrawing && !showResults" class="flex justify-center gap-x-4vh pb-2vh">
              <!-- 普通池按钮 -->
              <template v-if="gachaPool === 'normal'">
                <el-button
                  class="gacha-btn px-5vh py-2vh text-2.2vh font-bold rounded-2xl shadow-xl transition-all relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 hover:brightness-110"
                  @click="doGacha(1)">
                  <span class="flex items-center gap-x-1vh text-white">
                    <span>{{ L('singleDraw') }}</span>
                    <span class="text-1.6vh opacity-80">×1</span>
                  </span>
                </el-button>
                <el-button
                  class="gacha-btn px-5vh py-2vh text-2.2vh font-bold rounded-2xl shadow-xl transition-all relative bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:brightness-110"
                  @click="doGacha(10)">
                  <span class="flex items-center gap-x-1vh text-white">
                    <span>{{ L('tenDraw') }}</span>
                  </span>
                </el-button>
              </template>
              <!-- 高级池按钮（只能单抽） -->
              <template v-else>
                <el-button
                  class="gacha-btn px-5vh py-2vh text-2.2vh font-bold rounded-2xl shadow-xl transition-all relative bg-gradient-to-r from-red-600 to-orange-500 text-white border-0 hover:brightness-110"
                  @click="doPremiumGacha">
                  <span class="flex items-center gap-x-1vh text-white">
                    <span>{{ L('premiumSingle') }}</span>
                    <span class="text-1.6vh opacity-80">×1</span>
                  </span>
                </el-button>
              </template>
            </div>
          </div>

          <!-- 抽卡历史记录弹窗 -->
          <el-dialog v-model="showHistory" :title="L('gachaHistory')" width="60vh" class="gacha-history-dialog">
            <div class="max-h-50vh overflow-y-auto">
              <div v-if="user.gachaHistory.length === 0" class="text-center py-8vh text-gray-400">
                {{ L('noGachaRecord') }}
              </div>
              <div v-else class="flex flex-col gap-y-2vh">
                <div v-for="(record, index) in user.gachaHistory" :key="index"
                  class="bg-white/5 rounded-lg p-2vh border border-white/10">
                  <div class="flex justify-between items-center mb-1vh">
                    <span class="text-1.6vh text-gray-300">{{ record.time }}</span>
                    <span class="text-1.6vh" :class="record.pool === '高级卡池' ? 'text-red-300' : 'text-purple-300'">
                      {{ record.pool || L('normalPool') }} · {{ record.count }}{{ L('timesDraw') }} · {{ L('spendLabel') }}{{ record.cost }}
                      {{ record.pool === '高级卡池' ? L('magicCrystalLv1') : L('manaCore') }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1vh">
                    <span v-for="(card, cardIndex) in record.cards" :key="cardIndex"
                      class="px-1.5vh py-0.5vh rounded text-1.5vh bg-white/10 text-white">
                      {{ card }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-dialog>
        </div>
      </el-tab-pane>

      <!-- 天赋系统（画布树状） -->
      <el-tab-pane v-if="shouldShowTab('talent')" name="talent">
        <template #label>
          <span class="text-3vh">{{ L('talentTab') }}</span>
        </template>
        <div class="h-70vh">
          <TalentTree />
        </div>
      </el-tab-pane>
    </el-tabs>


  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";

import { useCounterStore, LEVEL_UP_CFG, DEFAULT_CARD_DATA } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import { t, tr } from "@/i18n";
import emitter from "@/bus"; // 🔥 战斗中用药水同步血量事件
import { createCardSpine, createDaojuSpine } from "../fight/CardSpine"
import { Star, Coin, MagicStick, Close, Check, InfoFilled, Clock } from '@element-plus/icons-vue'
import { getItemTypeValue, getItemType, getItemQualityColor, isFoodItem } from './xinxiUtils.js';
import TalentTree from "./TalentTree.vue"
import BagPanel from "@/components/BagPanel.vue"

const user = useCounterStore();

// 🃏 对齐牌库实例记录：deckInstances 缺失或与 deck 长度不一致时，按 deck 重建（旧档迁移）。
//    保证 deck 与 deckInstances 下标一一对应，撤下卡牌时同步移除记录，图鉴"已携带"遮罩正确回退
function ensureDeckInstancesAligned() {
  const deck = user.pixi?.player?.deck;
  if (!Array.isArray(deck)) return;
  const inst = user.pixi?.player?.deckInstances;
  if (Array.isArray(inst) && inst.length === deck.length) return;
  const seen = {};
  user.pixi.player.deckInstances = deck.map((n) => {
    seen[n] = (seen[n] || 0) + 1;
    return `${n}#${seen[n]}`;
  });
}
// 🃏 牌库按卡名分组排序（相同卡牌位置相邻），deck 与 deckInstances 同步重排保持下标对应
function sortDeckByCardName() {
  ensureDeckInstancesAligned();
  const deck = user.pixi.player.deck;
  const inst = user.pixi.player.deckInstances;
  if (!Array.isArray(deck) || !Array.isArray(inst) || deck.length !== inst.length) return;
  const pairs = deck.map((name, i) => ({ name, id: inst[i] }));
  pairs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  user.pixi.player.deck = pairs.map(p => p.name);
  user.pixi.player.deckInstances = pairs.map(p => p.id);
}
ensureDeckInstancesAligned(); // 组件打开即对齐（读档已完成）
sortDeckByCardName(); // 打开页面即按卡名分组排序

const langVersion = ref(0);
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++);
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}


// 接收父组件传入的默认激活标签
const props = defineProps({
  defaultTab: {
    type: String,
    default: 'info' // 默认第一个标签
  },
  // 🎒 仅显示指定标签页（如战斗中打开背包只显示背包+卡牌携带）
  //    传入数组如 ['inventory', 'cardCarry']；不传/空则显示全部标签页
  showTabs: {
    type: Array,
    default: null
  }
});

// 判断某个标签页是否应显示（showTabs 为空则全部显示）
function shouldShowTab(name) {
  if (!props.showTabs || props.showTabs.length === 0) return true;
  return props.showTabs.includes(name);
}

// 血量百分比（确保负数显示为0%）
const hpPercent = computed(() => {
  const hp = user.pixi.player.juese?.hp ?? 0
  const maxHp = user.pixi.player.juese?.maxHp ?? 1
  return Math.max(0, Math.min(100, hp / maxHp * 100))
})

// ==================== 个人信息属性数据 ====================
const juese = computed(() => user.pixi.player.juese)
const p = computed(() => user.pixi.player)

// 🌀 元素共鸣天赋：解锁后元素精通 +flatMastery/级（常驻，面板显示）
const elemResonanceMastery = computed(() => {
  const lv = user.getTalentLevel('element_reaction_dmg_up')
  if (!lv) return 0
  const t = user.talentConfig?.find?.(t => t.id === 'element_reaction_dmg_up')
  return lv * (t?.effect?.flatMastery ?? 5)
})
// 元素精通总计 = 基础 + 智慧派生 + 元素共鸣
const masteryTotal = computed(() => (juese.value.elementMastery || 0) + (juese.value.intelligence || 0) * (LEVEL_UP_CFG.attrRates?.intelligenceMastery ?? 0.2) + elemResonanceMastery.value)
// 🍀 好运天赋：解锁后幸运 +baseLuck + perLvLuck×(等级-1)（常驻，面板显示）
// 🛡️ 硬化天赋：解锁后护甲 +flatArmor + flatArmorPerLv×(等级-1)（常驻，面板显示）
// ⚡ 迅捷天赋：每级 +flatSpeedPerLv 点速度（常驻，面板显示）
const swiftSpeedBonus = computed(() => {
  const lv = user.getTalentLevel('swift_speed')
  if (!lv) return 0
  const t = user.talentConfig?.find?.(t => t.id === 'swift_speed')
  return (t?.effect?.flatSpeed ?? 4) + (t?.effect?.flatSpeedPerLv ?? 4) * (lv - 1)
})
// ⚡ 速度总计 = 基础 + 迅捷
const speedTotal = computed(() => (juese.value.baseSpeed || 0) + swiftSpeedBonus.value)

// 💖 亲和天赋：每级 +flatCharmPerLv 点魅力（常驻，面板显示）
const charmAffinityBonus = computed(() => {
  const lv = user.getTalentLevel('charm_affinity')
  if (!lv) return 0
  const t = user.talentConfig?.find?.(t => t.id === 'charm_affinity')
  return (t?.effect?.flatCharm ?? 1) + (t?.effect?.flatCharmPerLv ?? 1) * (lv - 1)
})
// 💖 魅力总计 = 基础 + 亲和
const charmTotal = computed(() => (juese.value.charm || 0) + charmAffinityBonus.value)

// ⚔ 攻击总计 = 基础攻击力（战斗狂热已改为常驻力量加成，力量属性面板直接显示）
const attackTotal = computed(() => (juese.value.baseAttack || 0))

const hardenedArmorBonus = computed(() => {
  const lv = user.getTalentLevel('hardened_armor')
  if (!lv) return 0
  const t = user.talentConfig?.find?.(t => t.id === 'hardened_armor')
  return (t?.effect?.flatArmor ?? 2) + (t?.effect?.flatArmorPerLv ?? 2) * (lv - 1)
})
const hardenedMRBonus = computed(() => {
  const lv = user.getTalentLevel('hardened_armor')
  if (!lv) return 0
  const t = user.talentConfig?.find?.(t => t.id === 'hardened_armor')
  return (t?.effect?.flatMagicResist ?? 2) + (t?.effect?.flatMagicResistPerLv ?? 2) * (lv - 1)
})
// 🛡️ 护甲总计 = 基础 + 硬化
const armorTotal = computed(() => (juese.value.baseArmor || 0) + hardenedArmorBonus.value)
// 🧙 魔抗总计 = 基础 + 硬化
const magicResistTotal = computed(() => (juese.value.baseMagicResist ?? 10) + hardenedMRBonus.value)

const luckBlessingBonus = computed(() => {
  const lv = user.getTalentLevel('luck_blessing')
  if (!lv) return 0
  const t = user.talentConfig?.find?.(t => t.id === 'luck_blessing')
  return (t?.effect?.baseLuck ?? 5) + (t?.effect?.perLvLuck ?? 5) * (lv - 1)
})

// 💖 魅力：召唤物/同伴全属性加成（分段线性递减，越提升越弱）
function charmSummonBonusPct(c) {
  if (!(c > 0)) return 0
  let p = Math.min(c, 50) * 0.30
  if (c > 50) p += Math.min(c - 50, 70) * 0.18
  if (c > 120) p += Math.min(c - 120, 130) * 0.10
  if (c > 250) p += (c - 250) * 0.06
  return p
}

const baseAttrs = computed(() => {
  langVersion.value;
  return [
  {
    label: 'attrHp',
    img: 'Hp',
    value: `${Math.max(0, juese.value.hp)}/${juese.value.maxHp}`,
    style: { color: '#67C23A', textShadow: '0 0 0.5px #000' },
    tooltip: t('attrHpTooltip'),
  },
  {
    label: 'attrAtk',
    img: 'Attack',
    value: attackTotal.value,
    allocKey: 'attack',
    style: { color: '#F56C6C', textShadow: '0 0 0.5px #000' },
    tooltip: t('attrAtkTooltip'),
  },
  {
    label: 'attrArmor',
    img: 'Armor',
    value: armorTotal.value,
    allocKey: 'armor',
    style: { color: '#788394', textShadow: '0 0 0.5px #000' },
    tooltip: (() => {
      const a = armorTotal.value
      const rd = Math.round(a / (a + 100) * 10000) / 100
      return fmt('attrArmorTooltip', { a, rd })
    })(),
  },
  {
    label: 'attrMagicResist',
    img: 'MR',
    value: magicResistTotal.value,
    allocKey: 'magicResist',
    style: { color: '#8A6FE0', textShadow: '0 0 0.5px #000' },
    tooltip: (() => {
      const m = magicResistTotal.value
      const rd = Math.round(m / (m + 100) * 10000) / 100
      return fmt('attrMrTooltip', { m, rd })
    })(),
  },
  {
    label: 'attrSpeed',
    img: 'Speed',
    value: speedTotal.value.toFixed(1),
    allocKey: 'speed',
    style: { color: '#5C7FA8', textShadow: '0 0 0.5px #000' },
    tooltip: t('attrSpeedTooltip'),
  },
  {
    label: 'attrStrength',
    img: 'liliang',
    value: juese.value.strength || 0,
    allocKey: 'strength',
    style: { color: '#F56C6C', textShadow: '0 0 0.5px #000' },
    tooltip: fmt('attrStrengthTooltip', { pd: ((juese.value.strength || 0) * (LEVEL_UP_CFG.attrRates?.strengthPhysDmg ?? 1)).toFixed(1), hp: ((juese.value.strength || 0) * (LEVEL_UP_CFG.attrRates?.strengthHp ?? 2)).toFixed(0) }),
  },
  {
    label: 'attrIntelligence',
    img: 'zhihui',
    value: juese.value.intelligence || 0,
    allocKey: 'intelligence',
    style: { color: '#409EFF', textShadow: '0 0 0.5px #000' },
    tooltip: fmt('attrIntTooltip', { ed: ((juese.value.intelligence || 0) * (LEVEL_UP_CFG.attrRates?.intelligenceEleDmg ?? 1)).toFixed(1), em: ((juese.value.intelligence || 0) * (LEVEL_UP_CFG.attrRates?.intelligenceMastery ?? 0.2)).toFixed(1) }),
  },

  ];
})

const secondAttrs = computed(() => {
  langVersion.value;
  return [
  {
    label: 'attrMana',
    img: 'Mp',
    value: juese.value.maxMp,
    style: { color: '#409EFF', textShadow: '0 0 0.5px #000' },
    tooltip: t('attrManaTooltip'),
  },

  {
    label: 'attrMastery',
    img: 'jingtong',
    value: masteryTotal.value,
    style: { color: '#A78BFA', textShadow: '0 0 0.5px #000' },
    tooltip: (() => {
      const m = masteryTotal.value
      const cap = (LEVEL_UP_CFG.attrRates?.elementMasteryReactDmg ?? 1)
      const bonus = m > 0 ? cap * m / (m + 200) : 0
      return fmt('attrMasteryTooltip', { m: m.toFixed(1), b: (bonus * 100).toFixed(1), cap: (cap * 100).toFixed(0) })
    })(),
  },
  {
    label: 'attrCharm',
    img: 'meili',
    value: charmTotal.value,
    style: { color: '#F472B6', textShadow: '0 0 0.5px #000' },
    tooltip: fmt('attrCharmTooltip', { b: charmSummonBonusPct(charmTotal.value).toFixed(1) }),
  },
  {
    label: 'attrLuck',
    img: 'Luck',
    value: (juese.value.baseLuck || 0) + luckBlessingBonus.value,
    style: { color: '#FFD166', textShadow: '0 0 0.6px #333' },
    tooltip: (() => {
      const l = (juese.value.baseLuck || 0) + luckBlessingBonus.value
      const _fc = LEVEL_UP_CFG?.elementReaction?.freezeChance ?? 0.35
      const _ld = LEVEL_UP_CFG?.attrRates?.luckDrop ?? 100
      // fr：元素反应（冻结）触发率 = 基础概率 × (1+幸运转化率)，与 ElementReaction.js 统一 luckProb 结算一致
      const _rate = (_ld / 100) * l / (l + 100)
      return fmt('attrLuckTooltip', { fr: Math.min(100, _fc * 100 * (1 + _rate)).toFixed(1), dr: (_ld * l / (l + 100)).toFixed(1) })
    })(),
  },
  {
    label: 'attrExp',
    img: 'Exp',
    value: `${p.value.exp} / ${p.value.maxExp}`,
    style: { color: '#9370DB', textShadow: '0 0 0.4px #000' },
    tooltip: t('attrExpTooltip'),
  },
  ];
})

// ==================== 🆓 自由属性点分配 ====================
const freeAttrPoints = computed(() => user.pixi.player.freeAttrPoints || 0)
const allocMode = ref(false)
// 自由属性点为 0 时自动退出分配模式（所有 ＋ 隐藏）
watch(freeAttrPoints, (v) => { if (v <= 0) { stopHold(); allocMode.value = false } })
const ATTR_LABELS = { strength: 'attrStrength', intelligence: 'attrIntelligence', elementMastery: 'attrMastery', attack: 'attrAtk', armor: 'attrArmor', speed: 'attrSpeed', luck: 'attrLuck' }
function addAttr(key, silent = false) {
  const r = user.addAttrPoint(key)
  if (!r.ok) { stopHold(); console.warn(r.msg); return }
  if (!silent) ElMessText(`${L(ATTR_LABELS[key] || key)} +1`, 'success', 900)
}
// ==================== 长按连续加点 ====================
let _holdKey = null
let _holdTimer = null
let _holdInterval = null
function startHold(key) {
  stopHold()
  addAttr(key) // 按下立即加 1 点
  _holdKey = key
  // 长按 400ms 后进入连发模式（每 120ms 加 1 点）
  _holdTimer = setTimeout(() => {
    _holdInterval = setInterval(() => {
      if (!_holdKey || freeAttrPoints.value <= 0) { stopHold(); return }
      addAttr(_holdKey, true)
    }, 120)
  }, 400)
}
function stopHold() {
  _holdKey = null
  if (_holdTimer) { clearTimeout(_holdTimer); _holdTimer = null }
  if (_holdInterval) { clearInterval(_holdInterval); _holdInterval = null }
}
function resetAttr() {
  const r = user.resetAttrPoints()
  if (!r.ok) console.warn(r.msg)
}

// ==================== 属性浮层提示 ====================
// 组件内状态：切换标签 / 关闭弹窗（组件销毁重建）后浮层自然消失
const activeTooltip = ref('')
const tooltipPos = ref({ top: '0px', left: '0px' })

const allAttrMap = computed(() => {
  const map = {}
  baseAttrs.value.forEach(a => { map[a.label] = a.tooltip })
  secondAttrs.value.forEach(a => { map[a.label] = a.tooltip })
  return map
})

function closeTooltip() {
  activeTooltip.value = ''
}

function toggleTooltip(label, target) {
  const content = allAttrMap.value[label]
  if (!content) return
  if (activeTooltip.value === content) {
    closeTooltip()
    return
  }
  activeTooltip.value = content
  nextTick(() => {
    const row = target?.closest?.('.attr-row')
    if (!row) return
    const rect = row.getBoundingClientRect()
    const tipW = 300
    // 优先在右侧显示，超出窗口则回退到左侧
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

// 当前激活的标签
const activeTab = ref(props.defaultTab);

// 监听默认标签变化，切换到对应标签 + 懒加载
watch(() => props.defaultTab, (newVal) => {
  if (newVal) {
    activeTab.value = newVal;
    // 触发懒加载
    if (newVal === 'cardBook') {
      loadCardSpinesLazy()
    } else if (newVal === 'inventory') {
      loadDaojuSpinesLazy()
      loadCardSpinesLazy()  // 背包中的卡牌也需要 Spine 图
    }
  }
});

const popoverRefs1 = ref([]);
// 当前展开描述的卡牌
const activeDescCard = ref(null);
// 当前打开进化面板的卡牌
const activeEvoCard = ref(null);

// ==================== 卡牌携带：长按查看详情 ====================
// 长按详情弹窗显示的卡牌名
const handDetailCard = ref(null);
// 长按详情弹窗是否可见（el-dialog v-model 需要布尔值）
const handDetailVisible = ref(false);
// 长按计时器
let _handLongPressTimer = null;
// 是否已触发长按（用于区分点击 vs 长按）
let _handLongPressed = false;

// 开始长按检测
// 查看卡牌详情弹窗（点击 / 长按共用）
function showHandDetail(cardName) {
  handDetailCard.value = cardName;
  handDetailVisible.value = true;
}
function startHandLongPress(cardName) {
  if (!cardName) return;
  _handLongPressed = false;
  clearTimeout(_handLongPressTimer);
  _handLongPressTimer = setTimeout(() => {
    _handLongPressed = true;
    handDetailCard.value = cardName;
    handDetailVisible.value = true;
  }, 500);
}
// 结束长按检测（鼠标/触摸抬起或移出）
function endHandLongPress(cardName) {
  clearTimeout(_handLongPressTimer);
  _handLongPressTimer = null;
  // 若是长按触发的，延迟重置标记，避免同一交互的 click 被误判为移除
  if (_handLongPressed) {
    setTimeout(() => { _handLongPressed = false; }, 50);
  }
}
// 已携带卡牌点击（若刚长按过则不触发移除）
function handleHandClick(cardName) {
  if (_handLongPressed) {
    _handLongPressed = false;
    return;
  }
  showHandDetail(cardName);
}
// 关闭长按详情弹窗
function closeHandDetail() {
  handDetailVisible.value = false;
  handDetailCard.value = null;
}

function toggleCardDesc(card) {
  if (activeDescCard.value === card.name) {
    // 关闭描述，同时关闭进化面板
    activeDescCard.value = null;
    activeEvoCard.value = null;
  } else {
    // 打开描述，同时打开进化面板（未解锁也能查看预览）
    activeDescCard.value = card.name;
    activeEvoCard.value = card;
  }
}

// 关闭进化面板
function closeEvoPanel() {
  activeEvoCard.value = null;
  activeDescCard.value = null;
}

// ==================== 🎖 卡牌熟练度（图鉴右侧面板展示） ====================
function getCardMastery(cardName) {
  return user.getCardMastery(cardName);
}
function getCardMasteryLevel(cardName) {
  return user.getCardMasteryLevel(cardName);
}
function getCardMasteryNeed(cardName) {
  return user.getCardMasteryNeed(cardName);
}
// 熟练度进度条百分比：按本等级区间计算（Lv.0 为 0→base，之后为上一阈值→本级阈值）
function getMasteryProgress(cardName) {
  const need = user.getCardMasteryNeed(cardName);
  if (!need) return 0;
  const exp = user.getCardMastery(cardName).exp;
  const lv = user.getCardMasteryLevel(cardName);
  const prev = lv === 0 ? 0 : need / 2;
  if (need <= prev) return Math.min(100, Math.round(exp / need * 100));
  return Math.max(0, Math.min(100, Math.round((exp - prev) / (need - prev) * 100)));
}
// 当前等级实际生效的效果文案
function getMasteryCurrentEffect(card) {
  const cfg = card.mastery;
  if (!cfg) return '';
  const lv = user.getCardMasteryLevel(card.name);
  if (cfg.type === 'flatDmg') {
    const bonus = lv * cfg.value;
    const elem = masteryDmgTypeName(card.dmgType);
    if (bonus <= 0) return `暂未生效，达到 Lv.1 后额外造成 ${cfg.value} 点${elem}属性伤害。`;
    return `额外造成 ${bonus} 点${elem}属性伤害。`;
  }
  if (cfg.type === 'percentDmg') {
    const pct = Number(cfg.value) || 0;
    if (lv <= 0) return `暂未生效，达到 Lv.1 后伤害提升 ${pct}%。`;
    const total = Math.round((Math.pow(1 + pct / 100, lv) - 1) * 100);
    return `伤害提升 ${total}%（每级 +${pct}%，累计 ${lv} 级）。`;
  }
  return cfg.desc || '';
}
function masteryDmgTypeName(t) {
  const map = { fire: '火', water: '水', lightning: '雷', ice: '冰', poison: '毒', wind: '风', physical: '物理', null: '无' };
  return map[t] || '';
}

// ==================== 工具函数 ====================
// 标签切换时关闭弹窗 + 懒加载
// 切换标签时浮层提示应当关闭（不再保留）
function handleTabChange(name) {
  closeTooltip();
  closeEvoPanel();
  closeItemDetail();
  showCraftDialog.value = false;
  // 懒加载 Spine 图标
  if (name === 'cardBook') {
    loadCardSpinesLazy()
  } else if (name === 'inventory') {
    loadDaojuSpinesLazy()
    loadCardSpinesLazy()  // 背包中的卡牌也需要 Spine 图
  }
}

function closeAllPanels() {
  showEvoConfirm.value = false;
  // 关闭合成弹窗
  showCraftDialog.value = false;
  selectedCraftCard.value = null;
  // 关闭抽卡结果
  showResults.value = false;
  gachaResults.value = [];
  isDrawing.value = false;
  // 关闭历史记录
  showHistory.value = false;
}

// ==================== 卡牌抽取 ====================

// 抽卡状态
const isDrawing = ref(false);
const showResults = ref(false);
const gachaResults = ref([]);
const showHistory = ref(false);
const particles = ref([]);
const gachaResultRef = ref(null);
// 卡池类型：normal=普通卡池 / premium=高级卡池
const gachaPool = ref('normal');

// 灵力晶核数量
const crystalCount = computed(() => {
  return user.getCrystalCount();
});

// 魔力晶核数量
const premiumCrystalCount = computed(() => {
  return user.getPremiumCrystalCount ? user.getPremiumCrystalCount() : 0;
});

// 🎰 当前卡池的出货概率列表（从 store.gachaRates 读取权重并换算成百分比，读档后自动更新）
// 返回 [{ rarity, name, color, percent }]，percent 为保留1位小数的百分比
const gachaRateList = computed(() => {
  const rates = (gachaPool.value === 'normal' ? user.gachaRates?.normal : user.gachaRates?.premium) || {};
  const items = Object.entries(rates).filter(([, w]) => w > 0);
  const total = items.reduce((s, [, w]) => s + w, 0) || 1;
  const RATE_META = {
    common: { name: 'rarityCommon', color: '#909399' },
    excellent: { name: 'rarityExcellent', color: '#409EFF' },
    rare: { name: 'rarityRare', color: '#8B5CF6' },
    epic: { name: 'rarityEpic', color: '#E6A23C' },
    legendary: { name: 'rarityLegendary', color: '#F56C6C' },
  };
  return items.map(([rarity, w]) => {
    const meta = RATE_META[rarity] || { name: rarity, color: '#909399' };
    return {
      rarity,
      name: meta.name,
      color: meta.color,
      percent: (w / total * 100).toFixed(1),
    };
  });
});

// 执行抽卡（普通卡池）
function doGacha(count) {
  if (isDrawing.value) return;

  const cost = count;
  if (crystalCount.value < cost) {
    ElMessText(L("insufficientCrystal"), "warning");
    return;
  }

  isDrawing.value = true;
  showResults.value = false;

  // 播放抽卡动画
  setTimeout(() => {
    const results = user.gachaCard(count);

    if (results) {
      gachaResults.value = results;
      isDrawing.value = false;
      showResults.value = true;
      // 自动滚动到结果顶部
      nextTick(() => {
        if (gachaResultRef.value) {
          gachaResultRef.value.scrollTop = 0;
        }
      });
    } else {
      isDrawing.value = false;
    }
  }, 1500);
}

// 执行抽卡（高级卡池，只能单抽）
function doPremiumGacha() {
  if (isDrawing.value) return;

  if (premiumCrystalCount.value < 1) {
    ElMessText(L("insufficientMagicCrystal"), "warning");
    return;
  }

  isDrawing.value = true;
  showResults.value = false;

  // 播放抽卡动画
  setTimeout(() => {
    const results = user.gachaCardPremium();

    if (results) {
      gachaResults.value = results;
      isDrawing.value = false;
      showResults.value = true;
      // 自动滚动到结果顶部
      nextTick(() => {
        if (gachaResultRef.value) {
          gachaResultRef.value.scrollTop = 0;
        }
      });
    } else {
      isDrawing.value = false;
    }
  }, 1500);
}

// 关闭结果
function closeResults() {
  showResults.value = false;
  gachaResults.value = [];
}

// 显示卡牌详情（预留）
function showCardDetail(card) {

}

// ==================== 物品栏 ====================



// 筛选标签
const itemTabs = [
  { label: '全部', value: 'all' },
  { label: '食物', value: 'food' }, // 🍎 食物类：可食用/喂食
  { label: '材料', value: 'material' },
  { label: '消耗品', value: 'consumable' }, // 🧪 药水等可使用的消耗品
  { label: '卡牌', value: 'currency' },
  { label: '道具', value: 'item' },
  { label: '特殊', value: 'special' }, // 🎰 抽卡资源（魔力晶核 / 灵力晶核）
];

const itemTab = ref('all');
const activeItem = ref(null);
const activeItemIndex = ref(-1);
const itemDialogVisible = ref(false);

// 碎片合成弹窗
const showCraftDialog = ref(false);
const selectedCraftCard = ref(null);

// 卡牌图鉴升星确认弹窗
const showEvoConfirm = ref(false);

// 获取筛选分类数量
function getTabCount(tab) {
  // 数量为 0 的物品不显示也不计数
  const inv = user.inventory.filter(item => item.num > 0);
  if (tab === 'all') return inv.length;
  return inv.filter(item => getItemTypeValue(item) === tab).length;
}

// 获取物品类型值（用于筛选）

// 获取物品类型名称

// 获取物品品质颜色

// 动态生成物品描述（黑米的灵晶显示实时击杀加成）
function getItemMiaoshu(item) {
  if (item.name === '黑米的灵晶') {
    const killCount = user.pixi.player.equippedItemKillCounts?.['黑米的灵晶'] || 0;
    const bonusAtk = (killCount * 0.2).toFixed(1);
    const l1 = tr('黑米死后凝聚的半魔化灵晶，消灭魔物可以提升攻击力。');
    const l2 = tr('基础：提升10点攻击力');
    const l3 = tr('已消灭 {killCount} 只魔物，进入战斗后额外获得 {bonusAtk} 攻击力。')
      .replace('{killCount}', killCount)
      .replace('{bonusAtk}', bonusAtk);
    return `${l1}\n${l2}\n${l3}`;
  }
  // 🎴 卡牌：显示当前星级的动态描述（背包卡牌物品可能无 isCard 标记，按卡名兜底）
  if (item.isCard || user.pixi.player.CARD_DATA?.[item.name]) {
    return getCardFullDesc(item, getCardStar(item));
  }
  // 🆕 统一走 store 动态描述（魔晶经验实时绑定 FEEDABLE_ITEMS）
  return user.getItemDesc(item);
}

// 筛选后的物品列表
const filteredItems = computed(() => {
  // 数量为 0 的物品不显示（如默认背包中 num=0 的果实/精灵果实）
  const inv = user.inventory.filter(item => item.num > 0);
  if (itemTab.value === 'all') return inv;
  return inv.filter(item => getItemTypeValue(item) === itemTab.value);
});

// 空格子数量（至少显示50个格子）
const emptySlots = computed(() => {
  const minSlots = 50;
  const count = filteredItems.value.length;
  return Math.max(0, minSlots - count);
});

// ==================== 卡牌升星 / 稀有度 ====================

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
function rarityName(r) { return L(RARITY_NAMES[r] || 'rarityCommon'); } // 🏷️ 稀有度名称走 i18n（不显示 key 原文）
function rarityColor(r) { return RARITY_COLORS[r] || '#909399'; }

// 获取卡牌当前星级（物品栏分星级存放，取该物品格子自身的星级）
function getCardStar(item) {
  if (item?.star) return item.star;
  const cardData = item?.name ? user.pixi.player.CARD_DATA[item.name] : null;
  if (cardData?.star) return cardData.star;
  return 1;
}
// 获取卡牌稀有度
function getCardRarity(item) {
  const cardData = item?.name ? user.pixi.player.CARD_DATA[item.name] : null;
  return cardData?.rarity || item?.rarity || 'common';
}
// 🪙 获取分解金币（按稀有度默认 + 指定卡牌 decomposeGold 覆盖 + 星级加成）
// 星级倍率：1星×1，2星×2.5，3星×6（与 store.decomposeCard 保持一致）
function getCardGoldValue(item) {
  const cardData = item?.name ? user.pixi.player.CARD_DATA[item.name] : null;
  const r = getCardRarity(item);
  const map = { common: 5, excellent: 15, rare: 30, epic: 60, legendary: 120 };
  let base = map[r] || 5;
  if (cardData?.decomposeGold != null) base = Number(cardData.decomposeGold);
  const star = getCardStar(item);
  const multiplier = star === 2 ? 2.5 : star >= 3 ? 6 : 1;
  return Math.floor(base * multiplier);
}
// 获取合成消耗（稀有以上不可合成）
function getCardCraftCost(card) {
  const r = card?.rarity || getCardRarity(card);
  const map = { common: 8, excellent: 12, rare: 17 };
  return map[r] || null;
}

// ==================== 星级效果描述 ====================
// 生成卡牌某个星级的【星级效果】文字描述（不含基础数值倍率，只描述星级带来的特殊效果）
// 有 starEffects 配置的返回特殊效果文字；没有的返回「该星级无特殊效果，仅提升基础数值」
const STAR_EFFECT_DESC = {
  激光: () => '', // 🎯 暴击机制已移除：星级不再提供暴击率
  火球: (s) => s === 2 ? '溅射伤害 +15%' : s === 3 ? '溅射伤害 +25%，且溅射为主目标伤害的75%' : '',
  水弹: (s) => s === 2 ? '使敌人迟滞，移动速度 -10%（不可叠加）' : s === 3 ? '使敌人迟滞，移动速度 -20%（不可叠加）' : '',
  雷击: (s) => s === 1 ? '目标行动条 -10%' : s === 2 ? '目标行动条 -15%' : s === 3 ? '目标行动条 -20%' : '',
  冰箭: (s) => s === 2 ? '击碎目标 12% 当前护甲' : s === 3 ? '击碎目标 16% 当前护甲' : '',
  影分身: (s) => s === 2 ? '' : s === 3 ? '开局自动召唤影分身' : '',
  反弹: (s) => s === 2 ? '反弹期间受到伤害 -5%' : s === 3 ? '反弹期间受到伤害 -10%' : '',
  毒雾: (s) => s === 2 ? '所有敌人攻击力 -10%' : s === 3 ? '所有敌人攻击力 -15%' : '',
  未来: (s) => s === 2 ? '使用后所有敌人行动条 -15%' : s === 3 ? '使用后所有敌人行动条 -30%' : '',
  毒发: (s) => s === 2 ? '' : s === 3 ? '不再减少敌人中毒 buff 回合' : '',
  号令: (s) => s === 2 ? '' : s === 3 ? '消耗灵力 -1' : '',
  焚焰: (s) => s === 2 ? '' : s === 3 ? '击杀目标后返还 1 点灵力' : '',
};

// 获取卡牌某星级的效果描述（无特殊效果返回 null）
function getStarEffectDesc(card, star) {
  const name = card?.name;
  if (!name || !star) return null;
  // 优先用配置的 starEffects 判断是否有特殊效果
  const cfg = user.pixi.player.CARD_DATA[name];
  const hasConfig = cfg?.starEffects && cfg.starEffects[star];
  if (!hasConfig) return null;
  return STAR_EFFECT_DESC[name]?.(star) || '该星级解锁特殊效果';
}

// ==================== 卡牌动态描述 ====================
// 📖 统一描述来源：直接读取 CARD_DATA 配置的 desc（与 dladmin 卡牌编辑、战斗内描述完全一致），
//    星级特殊效果（starEffects）由 getStarEffectDesc 单独拼接在末尾
// 返回 { desc, extra }：desc=描述正文，extra=星级额外效果行（可选）
// ⭐ 按星级填充描述：将 desc 中的 "X/Y/Z%" 三档数值替换为当前星级实际值，并以金色加粗标注（例：1星显示"60%"）
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
  if (!cfg) return { desc: starSpecificDesc(card?.desc || '', starNum) };
  const effDesc = getStarEffectDesc(card, starNum);
  return { desc: starSpecificDesc(cfg.desc || '', starNum), effDesc };
}

// 获取卡牌某星级的【完整动态描述】（含星级效果，用于详情/升星预览）
function getCardFullDesc(card, star) {
  const name = card?.name;
  if (!name) return '';
  const { desc, effDesc } = getCardDynamicDesc(card, star);
  if (effDesc) {
    return tr(`${desc}\n⭐ ${star}星效果：${effDesc}`);
  }
  return tr(desc);
}
// 升星需要多少张（5张同星）
function getStarUpNeed(item) {
  const star = getCardStar(item);
  if (star >= 3) return 0;
  return 5;
}

// 获取卡牌当前星级对应的消耗（兼容数组）
function getCardCostAtStar(card) {
  const name = card?.name;
  if (!name) return card?.cost || 0;
  const cfg = user.pixi.player.CARD_DATA[name];
  const star = getCardStar(card);
  if (!cfg) return card?.cost || 0;
  if (Array.isArray(cfg.cost)) return cfg.cost[star - 1] ?? cfg.cost[0] ?? 0;
  return cfg.cost ?? card?.cost ?? 0;
}


// 当前选中卡牌升星（按该物品格子自身的星级）
function starUpActiveCard() {
  if (!activeItem.value?.isCard) return;
  const star = getCardStar(activeItem.value);
  const success = user.starUpCard(activeItem.value.name, star);
  if (success) {
    // 升星后：原星级条目被消耗，升到了下一星，刷新选中为下一星物品
    const nextStar = star + 1;
    const cardItem = user.inventory.find(item => item.isCard && item.name === activeItem.value.name && item.star === nextStar);
    if (cardItem) {
      activeItem.value = { ...cardItem };
    } else {
      closeItemDetail();
    }
  }
}

// 可合成的卡牌列表（仅普通/优秀/稀有；独占卡牌不可合成）
const craftableCardList = computed(() => {
  return cardList.value.filter(c => c.cardType !== 'exclusive' && c.cardType !== 'special' && [8, 12, 17].includes(getCardCraftCost(c)));
});
function getSelectedCraftCost() {
  if (!selectedCraftCard.value) return 0;
  const card = craftableCardList.value.find(c => c.name === selectedCraftCard.value);
  return getCardCraftCost(card) || 0;
}
// 打开合成弹窗
function openCraftDialog() {
  selectedCraftCard.value = null;
  showCraftDialog.value = true;
}
// 关闭合成弹窗
function closeCraftDialog() {
  showCraftDialog.value = false;
  selectedCraftCard.value = null;
}
// 确认合成卡牌
function confirmCraftCard() {
  if (!selectedCraftCard.value) return;
  const cardName = selectedCraftCard.value;
  const cost = getSelectedCraftCost();
  if (fragmentCount.value < cost) return;

  const success = user.craftCard(cardName);
  if (success) {
    // 刷新碎片数据
    const updatedFragment = user.inventory.find(i => i.name === '卡牌碎片');
    if (updatedFragment) {
      activeItem.value = { ...updatedFragment };
    }
    closeCraftDialog();
  }
}

// ==================== 卡牌图鉴进化系统 ====================

// 获取背包中某卡牌的总数量（各星级合计，用于图鉴显示）
function getCardInventoryCount(cardName) {
  return user.inventory
    .filter(i => i.isCard && i.name === cardName)
    .reduce((sum, i) => sum + (i.num || 0), 0);
}

// 获取某卡牌【最高星级条目】的数量（升星需要同星级3张）
function getHighestStarCount(cardName) {
  const star = user.getHighestCardStar(cardName);
  return user.getCardCountAtStar(cardName, star);
}

// 打开升星确认弹窗（卡牌图鉴）
function openStarUpConfirm() {
  showEvoConfirm.value = true;
}

// 确认升星（卡牌图鉴，升玩家拥有的最高星级）
function confirmStarUpCard() {
  if (!activeEvoCard.value) return;
  const cardName = activeEvoCard.value.name;
  const star = user.getHighestCardStar(cardName);

  const success = user.starUpCard(cardName, star);
  if (success) {
    showEvoConfirm.value = false;
    // 刷新升星面板数据
    const cardData = user.pixi.player.CARD_DATA[cardName];
    activeEvoCard.value = {
      ...cardData,
      name: cardName,
      owned: (cardData.num || 0) > 0
    };
  }
}

// 选择物品
function selectItem(item, index) {
  activeItem.value = item;
  activeItemIndex.value = index;
  itemDialogVisible.value = true;
}

// 关闭物品详情
function closeItemDetail() {
  itemDialogVisible.value = false;
  setTimeout(() => {
    activeItem.value = null;
    activeItemIndex.value = -1;
  }, 200);
}

// 使用物品
function useItem(type) {
  if (!activeItem.value) return;
  usedBack(activeItem.value, type, activeItemIndex.value);
  closeItemDetail();
}

// 🍎 判断是否为食物类（food 字段 或 名称识别，兼容旧存档物品无 food 字段）

// 🍎 食物：食用（玩家经验）
function eatFood() {
  const it = activeItem.value;
  if (!it || (!isFoodItem(it) && !user.isEdibleHpItem(it.name))) return;
  const hp = user.getEdibleHp(it.name);
  const res = hp > 0 ? user.eatFoodHpItem(it.name, hp) : user.eatFoodItem(it.name);
  if (!res.ok) {
    ElMessText(res.msg, 'warning');
    return;
  }
  ElMessText(res.msg, 'success');
  // 🍎 不关闭弹窗，支持连续食用；刷新当前物品数量，吃完才关闭
  const updated = user.inventory.find(i => i.name === activeItem.value.name);
  if (updated && updated.num > 0) {
    activeItem.value = { ...updated };
    activeItemIndex.value = user.inventory.indexOf(updated);
  } else {
    // 已吃完，物品从背包移除 → 关闭详情
    closeItemDetail();
  }
}

// 🍎 食物：喂食（选择同伴 → NPC 经验）
const feedDialogVisible = ref(false);
const feedAllyList = ref([]);
function openFeedDialog() {
  const it = activeItem.value;
  if (!isFoodItem(it) && !it?.giveNpc) return;
  feedAllyList.value = user.getAllyList();
  feedDialogVisible.value = true;
}
function feedToAlly(npcImg) {
  const it = activeItem.value;
  if (!isFoodItem(it) && !it?.giveNpc) return;
  const res = it?.giveNpc ? user.feedPermanentPotionToAlly(npcImg, it.name) : user.feedAllyItem(npcImg, it.name);
  if (!res.ok) {
    ElMessText(res.msg, 'warning');
    return;
  }
  ElMessText(res.msg, 'success');
  // 🍎 不关闭喂食弹窗，支持连续投喂（可换同伴继续喂）；刷新同伴经验 + 物品数量
  feedAllyList.value = user.getAllyList();
  const updated = user.inventory.find(i => i.name === activeItem.value.name);
  if (updated && updated.num > 0) {
    activeItem.value = { ...updated };
    activeItemIndex.value = user.inventory.indexOf(updated);
  } else {
    // 食物喂完了 → 关闭喂食弹窗和详情
    feedDialogVisible.value = false;
    closeItemDetail();
  }
}

// 分解卡牌（按该物品格子自身的星级，碎片随星级增加）
function decomposeCard() {
  if (!activeItem.value || !activeItem.value.isCard) return;
  const cardName = activeItem.value.name;
  const star = getCardStar(activeItem.value);

  const result = user.decomposeCard(cardName, 1, star);
  if (result) {
    // 刷新当前选中物品数据
    const cardItem = user.inventory.find(item => item.isCard && item.name === cardName && item.star === star);
    if (cardItem) {
      activeItem.value = { ...cardItem };
    } else {
      closeItemDetail();
    }
  }
}

// 当前碎片数量
const fragmentCount = computed(() => {
  const item = user.inventory.find(i => i.name === '卡牌碎片');
  return item ? item.num : 0;
});

const ImgSrc = (src) => {
  return new URL(`../../../assets/fullBody/head/${src}.webp`, import.meta.url).href;
};

const inventoryImg = (src) => {
  return new URL(`../../../assets/daoju/${src}.webp`, import.meta.url).href;
};

function usedBack(item, type, index) {
  if (type === "eat") {
    // 💊 特殊物品（永浆/灵剂/灵药/疾行药剂等）统一处理（焚力/幽铠/迅霆/启明/盈悟/生命/魔力/疾行）
    const spRes = user.useSpecialPotion(item);
    if (spRes) {
      if (!spRes.ok) {
        ElMessText(spRes.msg, 'warning');
        return;
      }
      ElMessText(spRes.msg, spRes.warn ? 'warning' : 'success');
      item.num--;
      if (item.num <= 0) {
        user.inventory.splice(index, 1);
        closeItemDetail();
      }
      return;
    }
    const popover = popoverRefs1.value[index];
    if (popover && typeof popover.hide === "function") {
      popover.hide();
    }
    if (item.zhiding) {
      showData.twoShow = true;
      showData.type = "治愈";
      showData.Hp = item.Hp;
      showData.name = "恢复药水";
      return;
    }
    let title = fmt("usedItem", { n: tr(item.name) });
    // 🆕 恢复生命值（治疗药水等）
    if (item.Hp !== undefined) {
      const juese = user.pixi.player.juese;
      // 🔥 战斗中用药水：战斗的实时血量在 index.vue 的 player.hp（独立于 juese.hp），
      //    这里只通知战斗界面，由 potionUsed 监听基于 player.hp 计算真实恢复量并显示正确提示
      if (user.pixi.fight) {
        emitter.emit('potionUsed', { hp: item.Hp });
        title = title + L("healEffectApplied");
      } else {
        // 非战斗（主世界）：直接恢复 juese.hp（统一走 healPlayer：钳制最大生命 + 治疗加成预留）
        const oldHp = juese.hp;
        const actual = user.healPlayer(item.Hp);
        title = title + fmt("hpRestored", { n: Math.max(0, actual) });
      }
    }
    if (item.moli !== undefined) {
      user.attributes.moli += item.moli;
      user.attributes.myMana += item.moli;
      title = title + fmt("manaCapUp", { n: item.moli });
    }
    ElMessText(title, "success");
    item.num--;
    if (item.num <= 0) {
      user.inventory.splice(index, 1);
    }
  } else if (type === "sheshi") {
    showData.threeShow = true;
    showData.guanli = item.name;
  }
}

// ==================== 卡牌图鉴 ====================

const cardTab = ref("owned");

// ==================== 卡牌筛选（图鉴 + 携带共用） ====================
// 稀有度选项
const rarityOptions = [
  { value: 'common', name: 'rarityCommon' },
  { value: 'excellent', name: 'rarityExcellent' },
  { value: 'rare', name: 'rarityRare' },
  { value: 'epic', name: 'rarityEpic' },
  { value: 'legendary', name: 'rarityLegendary' },
];
// 属性伤害选项（null = 无属性/辅助卡）
const dmgTypeOptions = [
  { value: 'physical', name: 'elementPhysical' },
  { value: 'fire', name: 'elementFire' },
  { value: 'water', name: 'elementWater' },
  { value: 'lightning', name: 'elementLightning' },
  { value: 'ice', name: 'elementIce' },
  { value: 'poison', name: 'elementPoison' },
  { value: 'wind', name: 'elementWind' },
  { value: 'null', name: 'elementNeutral' },
];
// 灵力花费选项（从所有卡牌按当前星级解析后的 cost 提取，升序）
const costOptions = computed(() => {
  const set = new Set(cardList.value.map(c => c.cost).filter(c => typeof c === 'number'));
  return [...set].sort((a, b) => a - b);
});
// 卡牌图鉴筛选状态
const cardBookRarity = ref('all');
const cardBookCost = ref('all');
const cardBookDmgType = ref('all');
// 卡牌携带筛选状态
const cardCarryRarity = ref('all');
const cardCarryCost = ref('all');
const cardCarryDmgType = ref('all');
// 通用筛选（多种条件叠加，all 表示不限）
function applyCardFilters(list, rarity, cost, dmgType) {
  return list.filter(card => {
    if (rarity !== 'all' && card.rarity !== rarity) return false;
    if (cost !== 'all' && card.cost !== cost) return false;
    if (dmgType !== 'all' && card.dmgType !== dmgType) return false;
    return true;
  });
}

// 处理后的卡牌列表
const cardList = computed(() => {
  // 🆕 兜底同步：每次计算前把最新 DEFAULT_CARD_DATA 的新卡补进 CARD_DATA
  //    （图鉴/携带任何入口读取卡牌都先补齐，新增卡立即可见；幂等，保留玩家 star/num 进度）
  try { user.syncLatestCardData?.(); } catch (e) { /* 同步失败不影响已有卡展示 */ }
  // 📖 图鉴数据源 = 最新默认配置 ∪ 玩家存档进度（新增卡即使未解锁也必显示）
  const all = { ...DEFAULT_CARD_DATA, ...(user.pixi?.player?.CARD_DATA || {}) };
  const curRole = user.pixi?.player?.role || 'linen';
  return Object.entries(all).map(([name, data]) => {
    const star = data.star || 1;
    // 🛡️ 独占卡：仅对应角色可拥有（如双兆=林恩独占；选择其他角色时强制锁定，不显示在已有卡牌）
    const roleLocked = !!(data.exclusiveRole && data.exclusiveRole !== curRole);
    return {
      name,
      ...data,
      // 数组字段取当前星级对应的值
      cost: Array.isArray(data.cost) ? (data.cost[star - 1] ?? data.cost[0] ?? 0) : (data.cost ?? 0),
      maxCooldown: Array.isArray(data.maxCooldown) ? (data.maxCooldown[star - 1] ?? data.maxCooldown[0] ?? 0) : (data.maxCooldown ?? 0),
      owned: !roleLocked && (data.num || 0) > 0, // num > 0 且非角色锁 表示已解锁
    };
  });
});

const ownedCardList = computed(() => applyCardFilters(
  cardList.value.filter((c) => c.owned),
  cardBookRarity.value, cardBookCost.value, cardBookDmgType.value
));
const lockedCardList = computed(() => applyCardFilters(
  cardList.value.filter((c) => !c.owned),
  cardBookRarity.value, cardBookCost.value, cardBookDmgType.value
));
const displayCards = computed(() =>
  cardTab.value === "owned" ? ownedCardList.value : lockedCardList.value
);

// ==================== 当前卡组（战斗抽牌牌组） ====================

// 当前卡组（从 pinia 获取：卡名数组，可含重复 = 多副本；初始卡组在 dladmin 编辑）
const deckList = computed(() => user.pixi.player.deck || []);

// 卡组聚合（卡名 → 数量，用于角标显示）
const deckMap = computed(() => {
  const m = {};
  deckList.value.forEach(n => { m[n] = (m[n] || 0) + 1; });
  return m;
});

// 牌库实例 id 记录（与 deck 一一对应；旧存档无此字段时为空数组）
const deckInstancesList = computed(() => {
  const arr = user.pixi?.player?.deckInstances;
  return Array.isArray(arr) ? arr.filter(Boolean) : [];
});

// 已有卡牌实例列表（当前卡组下半区）：只显示已拥有卡牌（num>0）；
// 重复卡牌每张独立展开（唯一 id = 卡名#序号），支持稀有度/灵力/属性多重筛选；点击可添加进卡组
// "已携带"按实例 id 精确匹配（点击哪张就遮哪张）；旧档无实例记录时退化为序号分配
const deckBookInstances = computed(() => {
  const owned = cardList.value.filter((c) => c.owned);
  const carriedIds = new Set(deckInstancesList.value);
  const hasInstanceRecord = deckInstancesList.value.length > 0;
  const instances = [];
  for (const c of owned) {
    const carriedCount = deckMap.value[c.name] || 0;
    for (let i = 1; i <= c.num; i++) {
      const id = `${c.name}#${i}`;
      instances.push({
        ...c,
        id,
        order: i,
        carried: hasInstanceRecord ? carriedIds.has(id) : (i <= carriedCount),
      });
    }
  }
  return applyCardFilters(instances, cardCarryRarity.value, cardCarryCost.value, cardCarryDmgType.value);
});

// 🃏 卡组限制：每张卡牌最多携带 3 张，卡组最多 30 张
const MAX_DECK_CARDS = 30;
const MIN_DECK_CARDS = 10; // 卡组下限：不足 10 张禁止弃用
const MAX_CARD_COPIES = 3;
// 🃏 单卡携带上限：召唤物类卡牌（isSummon，水精灵/影分身）最多 2 张，普通卡 3 张
function maxCopiesOf(cardName) {
  return user.pixi.player.CARD_DATA?.[cardName]?.isSummon ? 2 : MAX_CARD_COPIES;
}

// 🃏 该卡当前能否加入卡组：须已拥有，携带数 < 拥有数，且单卡 <3、卡组 <30
function canCarryCard(card) {
  if (!card || card.num <= 0) return false;
  const carried = deckMap.value[card.name] || 0;
  if (carried >= maxCopiesOf(card.name)) return false;
  if (carried >= card.num) return false;
  if (deckList.value.length >= MAX_DECK_CARDS) return false;
  return true;
}

// 🃏 图鉴卡片点击：已携带 → 卸下该实例（从牌库移除）；未携带且可添加 → 加入卡组；不可添加（置灰）→ 无反应
function onBookCardClick(card) {
  if (card.carried) {
    const idx = deckInstancesList.value.indexOf(card.id);
    if (idx !== -1) removeCardFromDeck(idx);
    return;
  }
  if (canCarryCard(card)) addCardToDeck(card);
}

// 🃏 携带卡牌到卡组（+1 副本）：携带数 ≤ 拥有数，且单卡 ≤3、总数 ≤30；
// 同时把该实例 id 记入 deckInstances（与 deck 一一对应），图鉴"已携带"按实例精确匹配
function addCardToDeck(card) {
  ensureDeckInstancesAligned();
  const cardName = card?.name;
  if (!cardName) return;
  const owned = (cardList.value.find(c => c.name === cardName)?.num || 0);
  const carried = deckMap.value[cardName] || 0;
  if (owned <= 0) { ElMessText(L('lockedLabel'), 'warning'); return; }
  if (carried >= owned) { ElMessText(`该卡牌仅拥有 ${owned} 张，最多携带 ${owned} 张`, 'warning'); return; }
  const maxCopies = maxCopiesOf(cardName);
  if (carried >= maxCopies) { ElMessText(`每张卡牌最多携带 ${maxCopies} 张`, 'warning'); return; }
  if (deckList.value.length >= MAX_DECK_CARDS) { ElMessText('卡组最多 30 张牌', 'warning'); return; }
  if (!Array.isArray(user.pixi.player.deckInstances)) user.pixi.player.deckInstances = [];
  user.pixi.player.deck.push(cardName);
  user.pixi.player.deckInstances.push(card.id || `${cardName}#${user.pixi.player.deckInstances.length + 1}`);
  sortDeckByCardName(); // 相同卡牌位置相邻
  user.autoSave();
  ElMessText(`已携带 ${tr(cardName)}`, 'success', 900);
}

// 🃏 弃用卡牌（按下标从卡组移出 1 张；卡组 ≤10 张时禁止弃用），同步移除对应实例记录
function removeCardFromDeck(idx) {
  ensureDeckInstancesAligned();
  const deck = user.pixi.player.deck || [];
  if (deck.length <= MIN_DECK_CARDS) { ElMessText(`卡组至少保留 ${MIN_DECK_CARDS} 张牌`, 'warning'); return; }
  if (idx < 0 || idx >= deck.length) return;
  const cardName = deck[idx];
  deck.splice(idx, 1);
  if (Array.isArray(user.pixi.player.deckInstances)) user.pixi.player.deckInstances.splice(idx, 1);
  sortDeckByCardName(); // 相同卡牌位置相邻
  user.autoSave();
  ElMessText(`已弃用 ${tr(cardName)}`, 'success', 900);
}

// 获取卡牌数据（cost/maxCooldown 按当前星级取数组中的具体数值，避免显示数组）
function getCardData(cardName) {
  const data = user.pixi.player.CARD_DATA[cardName] || null;
  if (!data) return null;
  const star = data.star || 1;
  return {
    ...data,
    name: cardName, // ⚠️ CARD_DATA 配置不含 name，需补上（getCardDynamicDesc 等依赖 name）
    cost: Array.isArray(data.cost) ? (data.cost[star - 1] ?? data.cost[0] ?? 0) : (data.cost ?? 0),
    maxCooldown: Array.isArray(data.maxCooldown) ? (data.maxCooldown[star - 1] ?? data.maxCooldown[0] ?? 0) : (data.maxCooldown ?? 0),
  };
}

// ==================== 道具装备 ====================

// 最大装备道具数量
const maxEquipItems = computed(() => {
  return user.getMaxEquipItems ? user.getMaxEquipItems() : 3;
});

// 当前已装备的道具列表
const equippedItemList = computed(() => {
  return user.pixi.player.equippedItems || [];
});

// 空槽位数量
const emptyEquipSlots = computed(() => {
  return Math.max(0, maxEquipItems.value - equippedItemList.value.length);
});

// 获取道具数据（排除消耗品，如药水——药水是使用的，不参与装备）
function getItemData(itemName) {
  return user.inventory.find(i => i.name === itemName && i.isItem && !i.shiyong) || null;
}

// 检查道具是否已装备
function isItemEquipped(itemName) {
  return equippedItemList.value.includes(itemName);
}

// 可装备的道具列表（背包中的道具，排除消耗品如药水——药水是使用的，不参与装备）
const availableEquipItems = computed(() => {
  return user.inventory.filter(item => item.isItem && !item.shiyong && item.num > 0);
});

// 装备道具
function equipItem(itemName) {
  user.equipItem(itemName);
}

// 卸下道具
function unequipItem(itemName) {
  user.unequipItem(itemName);
}

// ==================== Spine 卡牌渲染（模块级缓存） ====================
// 这些变量在模块作用域，组件销毁重建后仍然存在
let _cardImgCache = {}
let _daojuImgCache = {}
let _cardCacheDone = false
let _daojuCacheDone = false

/** 尝试从 sessionStorage 恢复 cache */
function _restoreXinxiCache() {
  try {
    const raw = sessionStorage.getItem('xinxi_img_cache_v2')
    if (!raw) return
    const data = JSON.parse(raw)
    // 直接合并到缓存对象（cardImgMap 后续会从 cache 初始化）
    if (data.cardCache) {
      Object.assign(_cardImgCache, data.cardCache)
    }
    if (data.daojuCache) {
      Object.assign(_daojuImgCache, data.daojuCache)
    }
  } catch (e) { }
}

/** 保存 cache 到 sessionStorage */
function _saveXinxiCache() {
  try {
    sessionStorage.setItem('xinxi_img_cache_v2', JSON.stringify({
      cardCache: _cardImgCache,
      daojuCache: _daojuImgCache,
    }))
  } catch (e) {
    // base64 可能过大，忽略
  }
}

// 🔥 在 ref 初始化之前恢复缓存，让 cardImgMap 直接用缓存数据初始化
_restoreXinxiCache()
const cardImgMap = ref({ ..._cardImgCache });
const daojuImgMap = ref({ ..._daojuImgCache });
// 🌐 同步到全局 window，供地牢等其他组件读取（避免重复 Spine 渲染）
window.__cardImgMap = cardImgMap.value;
window.__daojuImgMap = daojuImgMap.value;
watch(cardImgMap, (v) => { window.__cardImgMap = v; }, { deep: true });
watch(daojuImgMap, (v) => { window.__daojuImgMap = v; }, { deep: true });

// 批量创建所有卡牌 Spine 并转成图片
async function initAllCardSpines() {
  const ids = cardList.value.map(c => c.name).filter(n => !_cardImgCache[n])
  for (const name of ids) {
    try {
      const result = await createCardSpine(name, 128, 128);
      if (result?.canvas) {
        const url = result.canvas.toDataURL()
        _cardImgCache[name] = url
        cardImgMap.value[name] = url
      }
    } catch (e) {
      console.warn(`卡牌 ${name} spine 加载失败:`, e);
    }
  }
  _cardCacheDone = true
  _saveXinxiCache()
}

// ==================== Spine 道具渲染（tianfu，模块级缓存） ====================

/** 收集背包中所有需要渲染的道具 skinName */
function collectDaojuSkinNames() {
  const names = new Set();
  for (const item of user.inventory) {
    if (!item.isCard && item.img && !_daojuImgCache[item.img]) {
      names.add(item.img);
    }
  }
  return [...names];
}

/** 批量创建道具 Spine（tianfu 骨骼，img 作为皮肤名） */
async function initAllDaojuSpines() {
  const skinNames = collectDaojuSkinNames();
  if (skinNames.length === 0) {
    _daojuCacheDone = true
    return
  }
  for (const skinName of skinNames) {
    try {
      const result = await createDaojuSpine(skinName, 80, 80);
      if (result?.canvas) {
        const url = result.canvas.toDataURL()
        _daojuImgCache[skinName] = url
        daojuImgMap.value[skinName] = url
      }
    } catch (e) {
      console.warn(`道具 ${skinName} spine 加载失败:`, e);
    }
  }
  _daojuCacheDone = true
  _saveXinxiCache()
}

onMounted(() => {
  nextTick(() => {
    // 🆕 卡牌数据同步：打开面板即用最新 DEFAULT_CARD_DATA 补齐新卡（图鉴/背包读取 CARD_DATA）
    user.syncLatestCardData?.();
    initCardsToInventory();
    // 默认 tab 是背包 → 立即触发票据 + 卡牌懒加载
    if (props.defaultTab === 'inventory') {
      loadDaojuSpinesLazy()
      loadCardSpinesLazy()
    } else if (props.defaultTab === 'cardBook') {
      loadCardSpinesLazy()
    }
    // 生成背景粒子固定数据
    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B', '#10B981'];
    for (let i = 0; i < 50; i++) {
      particles.value.push({
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        width: (Math.random() * 4 + 2) + 'px',
        height: (Math.random() * 4 + 2) + 'px',
        background: colors[Math.floor(Math.random() * 5)],
        animationDelay: Math.random() * 5 + 's',
        animationDuration: (Math.random() * 10 + 10) + 's',
      });
    }
  });
});

// ====== 懒加载：仅在切换到对应 tab 时加载（spineLoadedOnce 在模块级） ======
let spineLoading = ref(false)

/** 懒加载所有卡牌 Spine（只加载一次，缓存跨组件实例） */
async function loadCardSpinesLazy() {
  if (_cardCacheDone) return
  spineLoading.value = true
  // 分批并行加载，每批 4 个
  const batchSize = 4
  const cards = cardList.value.filter(c => !_cardImgCache[c.name])
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize)
    await Promise.all(batch.map(async (card) => {
      try {
        const result = await createCardSpine(card.name, 128, 128)
        if (result?.canvas) {
          const url = result.canvas.toDataURL()
          _cardImgCache[card.name] = url
          cardImgMap.value[card.name] = url
        }
      } catch (e) {
        console.warn(`卡牌 ${card.name} spine 加载失败:`, e)
      }
    }))
  }
  _cardCacheDone = true
  _saveXinxiCache()
  spineLoading.value = false
}

/** 懒加载所有道具 Spine（只加载一次，缓存跨组件实例） */
async function loadDaojuSpinesLazy() {
  if (_daojuCacheDone) return
  spineLoading.value = true
  const skinNames = collectDaojuSkinNames()
  // 分批并行加载，每批 4 个
  const batchSize = 4
  for (let i = 0; i < skinNames.length; i += batchSize) {
    const batch = skinNames.slice(i, i + batchSize)
    await Promise.all(batch.map(async (skinName) => {
      try {
        const result = await createDaojuSpine(skinName, 80, 80)
        if (result?.canvas) {
          const url = result.canvas.toDataURL()
          _daojuImgCache[skinName] = url
          daojuImgMap.value[skinName] = url
        }
      } catch (e) {
        console.warn(`道具 ${skinName} spine 加载失败:`, e)
      }
    }))
  }
  _daojuCacheDone = true
  _saveXinxiCache()
  spineLoading.value = false
}

// 初始化已解锁卡牌到物品栏（兼容旧存档：背包无任何该卡牌条目但 CARD_DATA.num>0 时补一条）
// 新模型下背包按 (name, star) 分条目存储，这里只在缺失时按最高星级补齐，不改写现有条目
function initCardsToInventory() {
  const cardData = user.pixi.player.CARD_DATA;
  for (const [name, data] of Object.entries(cardData)) {
    const num = data.num || 0;
    // num > 0 表示已解锁
    if (num > 0) {
      // 检查是否已有任意星级的条目
      const existing = user.inventory.some(item => item.name === name && item.isCard);
      if (!existing) {
        // 缺失：按最高星级补一条（数量给该卡牌总数量，玩家可自行升星/分解）
        const star = Math.min(3, Math.max(1, data.star || 1));
        user.addCardToInventory(name, num, star);
      }
    }
  }
}

</script>

<style scoped>
/* 右侧滑入动画 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.slide-right-enter-from .absolute.right-0,
.slide-right-leave-to .absolute.right-0 {
  transform: translateX(100%);
}

/* 物品详情弹窗样式 */
:deep(.el-dialog.item-detail-dialog) {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

:deep(.el-dialog.item-detail-dialog .el-dialog__header) {
  border-bottom: 1px solid rgba(64, 158, 255, 0.3);
  margin-right: 0;
  padding: 2vh 2.5vw;
}

:deep(.el-dialog.item-detail-dialog .el-dialog__title) {
  color: #fff;
  font-size: 2.2vh;
  font-weight: bold;
}

:deep(.el-dialog.item-detail-dialog .el-dialog__headerbtn) {
  top: 2vh;
  right: 1.5vw;
}

:deep(.el-dialog.item-detail-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #fff;
  font-size: 2.5vh;
}

:deep(.el-dialog.item-detail-dialog .el-dialog__headerbtn:hover .el-dialog__close) {
  color: #409EFF;
}

:deep(.el-dialog.item-detail-dialog .el-dialog__body) {
  color: #C0C4CC;
  padding: 3vh 2.5vw;
}

:deep(.el-dialog.item-detail-dialog .el-dialog__footer) {
  border-top: none;
  padding: 0 2.5vw 3vh;
}

:deep(.el-dialog.item-detail-dialog .el-button) {
  font-size: 1.8vh;
  font-weight: bold;
  padding: 1.5vh 2vh;
  border-radius: 8px;
}

:deep(.el-dialog.item-detail-dialog .el-button--primary) {
  background: linear-gradient(90deg, #409EFF 0%, #66B1FF 100%);
  border: none;
}

:deep(.el-dialog.item-detail-dialog .el-button--success) {
  background: linear-gradient(90deg, #67C23A 0%, #85CE6A 100%);
  border: none;
}

:deep(.el-dialog.item-detail-dialog .el-button.is-disabled) {
  background: #4B5563;
  border-color: #4B5563;
  color: #9CA3AF;
}

/* 进化选择弹窗样式 */
:deep(.el-dialog.evo-select-dialog) {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

:deep(.el-dialog.evo-select-dialog .el-dialog__header) {
  border-bottom: 1px solid rgba(64, 158, 255, 0.3);
  margin-right: 0;
  padding: 2vh 2.5vw;
}

:deep(.el-dialog.evo-select-dialog .el-dialog__title) {
  color: #fff;
  font-size: 2.2vh;
  font-weight: bold;
}

:deep(.el-dialog.evo-select-dialog .el-dialog__body) {
  color: #C0C4CC;
  padding: 3vh 2.5vw;
}

/* 进化确认弹窗样式 */
:deep(.el-dialog.evo-confirm-dialog) {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  z-index: 9999 !important;
}

:deep(.el-dialog.evo-confirm-dialog .el-dialog__header) {
  border-bottom: none;
  margin-right: 0;
  padding: 0;
}

:deep(.el-dialog.evo-confirm-dialog .el-dialog__title) {
  color: #fff;
  font-size: 2.2vh;
  font-weight: bold;
}

:deep(.el-dialog.evo-confirm-dialog .el-dialog__body) {
  color: #C0C4CC;
  padding: 3vh 2.5vw;
}

:deep(.el-dialog.evo-confirm-dialog .el-dialog__footer) {
  border-top: none;
  padding: 0 2.5vw 3vh;
}

:deep(.el-dialog.evo-confirm-dialog .el-dialog__close) {
  color: #909399;
  font-size: 2vh;
}

:deep(.el-dialog.evo-confirm-dialog .el-dialog__close:hover) {
  color: #fff;
}

/* 抽卡按钮禁用样式：保持渐变背景，添加灰色遮罩 */
.gacha-btn.is-disabled,
.gacha-btn:disabled {
  background: inherit !important;
  color: white !important;
  border: none !important;
  opacity: 1 !important;
}

.gacha-disabled::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: inherit;
  pointer-events: none;
}

/* ==================== 抽卡动画样式 ==================== */

/* ==================== 抽卡动画样式 ==================== */

/* 粒子漂浮动画 */
@keyframes particle-float {

  0%,
  100% {
    transform: translateY(0) translateX(0);
    opacity: 0.3;
  }

  25% {
    transform: translateY(-30px) translateX(10px);
    opacity: 0.8;
  }

  50% {
    transform: translateY(-10px) translateX(-10px);
    opacity: 0.5;
  }

  75% {
    transform: translateY(-40px) translateX(5px);
    opacity: 0.7;
  }
}

.particle {
  animation: particle-float linear infinite;
  opacity: 0.6;
  box-shadow: 0 0 6px currentColor;
}

/* 3D透视 */
.perspective-1000 {
  perspective: 1000px;
}

.backface-hidden {
  backface-visibility: hidden;
}

/* 慢速旋转动画 */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

/* 快速脉冲动画 */
@keyframes pulse-fast {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.animate-pulse-fast {
  animation: pulse-fast 0.5s ease-in-out infinite;
}

/* 卡牌翻转动画 */
@keyframes card-flip {
  0% {
    transform: rotateY(0deg) scale(1);
  }

  25% {
    transform: rotateY(90deg) scale(1.1);
  }

  50% {
    transform: rotateY(180deg) scale(1.2);
  }

  75% {
    transform: rotateY(270deg) scale(1.1);
  }

  100% {
    transform: rotateY(360deg) scale(1);
  }
}

.animate-card-flip {
  animation: card-flip 1.5s ease-in-out;
  transform-style: preserve-3d;
}

/* 结果出现动画 */
@keyframes result-appear {
  0% {
    opacity: 0;
    transform: scale(0.5) rotateY(180deg);
  }

  50% {
    transform: scale(1.1) rotateY(90deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotateY(0deg);
  }
}

.animate-result-appear {
  animation: result-appear 0.8s ease-out forwards;
}

/* 十连抽卡牌逐个出现动画 */
@keyframes result-card {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.8);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-result-card {
  opacity: 0;
  animation: result-card 0.5s ease-out forwards;
}

/* 光芒射线动画 */
@keyframes ray-rotate {
  from {
    transform: translate(-50%, -100%) rotate(0deg);
  }

  to {
    transform: translate(-50%, -100%) rotate(360deg);
  }
}

/* 稀有度闪光效果 */
@keyframes rarity-shine {

  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.3);
  }
}

/* 稀有度闪光效果 */
@keyframes rarity-shine {

  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.3);
  }
}

/* 抽卡历史记录弹窗样式 */
:deep(.gacha-history-dialog) {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

:deep(.gacha-history-dialog .el-dialog__header) {
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
  margin-right: 0;
  padding: 2vh 2.5vh;
}

:deep(.gacha-history-dialog .el-dialog__title) {
  color: #fff;
  font-size: 2.2vh;
  font-weight: bold;
}

:deep(.gacha-history-dialog .el-dialog__headerbtn) {
  top: 2vh;
  right: 2vh;
}

:deep(.gacha-history-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #fff;
  font-size: 2.5vh;
}

:deep(.gacha-history-dialog .el-dialog__body) {
  color: #C0C4CC;
  padding: 2vh 2.5vh;
}

:deep(.el-tabs--border-card>.el-tabs__content) {
  padding: 0;
  /* 移动端：允许内部元素触摸滚动，不被 tabs 拦截 */
  overflow: visible !important;
}

/* ==============================================
   手机端适配 - 十连抽结果可滚动
   ============================================== */

/* 滚动容器优化：确保移动端可以流畅滚动 */
.gacha-result-container {
  -webkit-overflow-scrolling: touch;
  /* 修复 flex 布局中 overflow 不生效的问题 */
  min-height: 0;
  /* 预留滚动条空间，避免内容跳动 */
  scrollbar-gutter: stable;
}

.gacha-result-container.overflow-y-auto {
  /* 始终显示滚动条，不用 auto */
  overflow-y: scroll !important;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
  /* 右边留出滚动操作的空间，方便手指触摸 */
  padding-right: 1vw !important;
  box-sizing: border-box;
}

/* 自定义滚动条样式 - 更宽更容易触摸 */
.gacha-result-container::-webkit-scrollbar {
  width: 12px;
  /* 滚动条宽度，手机端更容易触摸 */
}

.gacha-result-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.gacha-result-container::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.6);
  /* 紫色半透明，和主题搭配 */
  border-radius: 6px;
}

.gacha-result-container::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.8);
}

/* Firefox 滚动条样式 */
.gacha-result-container {
  scrollbar-width: thick;
  /* 宽滚动条 */
  scrollbar-color: rgba(139, 92, 246, 0.6) rgba(255, 255, 255, 0.1);
}

/* 移动端触摸优化：禁止双击缩放，加快触摸响应 */
.touch-manipulation {
  touch-action: manipulation;
}

/* ==============================================
   卡牌图鉴 - 滚动条优化
   ============================================== */
.card-gallery-scroll {
  /* 始终显示滚动条 */
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
  /* 允许垂直触摸滚动 */
  touch-action: pan-y;
  overscroll-behavior: contain;
  /* 确保 z-index 正确 */
  position: relative;
  z-index: 1;
  /* 修复 flex 布局滚动问题 */
  min-height: 0;
  /* 预留滚动条空间 */
  scrollbar-gutter: stable;
  /* 右边留出触摸空间 */
  padding-right: 1vw !important;
  box-sizing: border-box;
  /* 防止浏览器拦截触摸事件用于默认行为（如拖拽图片） */
  -webkit-user-drag: none;
  user-select: none;
}

/* 自定义滚动条样式 */
.card-gallery-scroll::-webkit-scrollbar {
  width: 12px;
}

.card-gallery-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.card-gallery-scroll::-webkit-scrollbar-thumb {
  background: rgba(64, 158, 255, 0.5);
  /* 蓝色，和主题搭配 */
  border-radius: 6px;
}

.card-gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 158, 255, 0.7);
}

/* Firefox 滚动条 */
.card-gallery-scroll {
  scrollbar-width: thick;
  scrollbar-color: rgba(64, 158, 255, 0.5) rgba(0, 0, 0, 0.05);
}

/* 十连抽结果包装器 */
.gacha-result-wrapper {
  width: 100%;
}

/* 响应式：平板/小屏 - 4列 */
@media (max-width: 768px) {
  .gacha-result-grid {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 1.5vh !important;
  }
}

/* 响应式：手机端 - 3列 */
@media (max-width: 480px) {
  .gacha-result-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 1vh !important;
  }

  /* 手机端调整文字大小 */
  .gacha-result-grid .text-3vh {
    font-size: 2.5vh !important;
  }

  .gacha-result-grid .text-4vh {
    font-size: 3vh !important;
  }
}

/* 超小屏适配 - 2列 */
@media (max-width: 360px) {
  .gacha-result-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 2vh !important;
  }
}

/* ==================== 合成工坊弹窗 ==================== */
:deep(.el-dialog.craft-dialog) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  overflow: visible !important;
}

:deep(.el-dialog.craft-dialog .el-dialog__header) {
  display: none;
}

:deep(.el-dialog.craft-dialog .el-dialog__body) {
  padding: 0 !important;
  border-radius: 1vh;
  overflow: hidden;
}

/* ==================== 卡牌筛选下拉框 ==================== */
/* 让下拉框文字与游戏 UI 匹配（默认 el-select 偏小） */
:deep(.el-select) {
  width: 22vh;
}

:deep(.el-select .el-select__wrapper) {
  font-size: 2vh;
  min-height: 4.5vh;
  border-radius: 1vh;
}

:deep(.el-select .el-select__placeholder) {
  font-size: 2vh;
}
</style>