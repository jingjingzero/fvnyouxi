<template>
  <div class="flex flex-col text-1.6vw select-none!">

    <el-tabs v-model="activeTab" type="border-card" class="h-80vh" @tab-change="handleTabChange">
      <!-- 个人信息 -->
      <el-tab-pane name="info" class="px-2vw pt-5vh">
        <template #label>
          <span class="text-3vh">个人信息</span>
        </template>
        <div class="flex h-40vh">
          <!-- 左侧头像区 -->
          <div class="h-full flex items-center flex-col justify-center gap-y-1.5vh">
            <div
              class="w-25vh h-25vh border-2 border-solid border-#A8ABB2 rounded-2 overflow-hidden shadow-lg bg-gradient-to-br from-#ECF5FF to-#D9ECFF">
              <img :src="ImgSrc('zhujue')" class="inset-0 object-cover w-full h-full pointer-events-none" />
            </div>
            <div class="text-2vw font-bold text-#303133">{{ user.pixi.player.juese.name }}</div>
            <div v-html="user.pixi.player.shenfen" class="text-1.4vw text-#606266"></div>
          </div>

          <!-- 右侧属性区 -->
          <div class="flex flex-col flex-1 gap-y-2vh ml-3vw">
            <div class="flex items-center">
              <span class="text-2vw font-bold text-#303133">姓名：林恩</span>
            </div>

            <div
              class="bg-gradient-to-br from-#F5F7FA to-#E4E7ED rounded-2 ml-1vw flex py-3vh px-2.5vw text-#303133 shadow-md border border-#DCDFE6">
              <!-- 左栏：基础属性 -->
              <div class="flex flex-col gap-y-2vh flex-1">
                <div class="text-1.5vw font-semibold text-#606266 mb-0.5vh">基础属性</div>

                <div class="flex justify-between items-center">
                  <span class="text-#909399">生命值</span>
                  <span class="font-bold text-1.7vw text-#67C23A">{{ user.pixi.player.juese.hp }}/{{
                    user.pixi.player.juese.maxHp }}</span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-#909399">灵力值</span>
                  <span class="font-bold text-1.7vw text-#E6A23C">{{ user.pixi.player.juese.maxMp }}</span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-#909399">攻击力</span>
                  <span class="font-bold text-1.7vw text-#F56C6C">{{ user.pixi.player.juese.attack }}</span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-#909399">护甲</span>
                  <span class="font-bold text-1.7vw text-#409EFF">{{ user.pixi.player.juese.armor }}</span>
                </div>
              </div>

              <el-divider direction="vertical" class="mx-2vw! h-full! text-#E4E7ED!" />

              <!-- 右栏：其他属性 -->
              <div class="flex flex-col gap-y-2vh flex-1">
                <div class="text-1.5vw font-semibold text-#606266 mb-0.5vh">次级属性</div>

                <div class="flex justify-between items-center">
                  <span class="text-#909399">速度</span>
                  <span class="font-bold text-1.7vw text-#909399">{{ user.pixi.player.juese.speed.toFixed(1) }}</span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-#909399">幸运</span>
                  <span class="font-bold text-1.7vw text-#E6A23C">{{ user.pixi.player.juese.luck }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-#909399">经验值</span>
                  <span class="font-bold text-1.7vw text-#606266">{{ user.pixi.player.exp }} / {{
                    user.pixi.player.maxExp
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 物品栏 -->
      <el-tab-pane name="inventory">
        <template #label>
          <span class="text-3vh">背包</span>
        </template>
        <div class="flex flex-col h-70vh overflow-y-auto">
          <!-- 筛选标签 -->
          <div class="flex flex-wrap gap-x-1.5vh gap-y-1vh px-2vh py-2vh border-b border-#E4E7ED flex-shrink-0">
            <div v-for="tab in itemTabs" :key="tab.value"
              class="px-2vh py-0.8vh rounded-full cursor-pointer text-2.4vh font-medium transition-all flex-shrink-0"
              :class="itemTab === tab.value ? 'bg-gradient-to-r from-#409EFF to-#66B1FF text-white shadow-md' : 'bg-#F5F7FA text-#606266 hover:bg-#E4E7ED'"
              @click="itemTab = tab.value">
              {{ tab.label }}
              <span class="ml-0.5vh opacity-70">({{ getTabCount(tab.value) }})</span>
            </div>
          </div>
          <!-- 物品格子 -->
          <div
            class="grid grid-cols-6 md:grid-cols-8 gap-x-2vh gap-y-2vh px-2vh py-2vh overflow-y-auto flex-1 box-border content-start">
            <div v-for="(item, index) in filteredItems" :key="item.name + index"
              class="relative w-full h-0 pt-[100%] rounded-lg overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5vh"
              :class="activeItem?.name === item.name && activeItemIndex === index ? 'ring-2 ring-#409EFF scale-105' : ''"
              @click="selectItem(item, index)">
              <!-- 背景 -->
              <div class="absolute inset-0 bg-gradient-to-br from-#F5F7FA to-#E4E7ED border border-#DCDFE6 rounded-lg">
              </div>
              <!-- 物品图片 -->
              <div class="absolute inset-1 flex items-center justify-center">
                <!-- 灵力晶核特殊显示 -->
                <img v-if="!item.isCard" :src="inventoryImg(item.img)" class="w-full h-full object-contain" />
                <img v-else-if="cardImgMap[item.name]" :src="cardImgMap[item.name]"
                  class="w-full h-full object-contain scale-190" />
                <div v-else class="w-full h-full flex items-center justify-center text-2.5vh font-bold"
                  :style="{ color: item.color }">
                  {{ item.name.charAt(0) }}
                </div>
              </div>
              <!-- 物品数量（右下角） -->
              <div class="absolute bottom-0.5vh right-0.8vh text-2vh font-bold z-10"
                style="text-shadow: 0 0 2px #fff, 0 0 4px #fff, 0 1px 2px rgba(0,0,0,0.3); color: #303133;">
                {{ item.num }}
              </div>
              <!-- 品质边框 -->
              <div class="absolute inset-0 rounded-lg border-2 opacity-0 group-hover:opacity-100 transition-all"
                :style="{ borderColor: getItemQualityColor(item) }"></div>
            </div>
            <!-- 空格子占位 -->
            <div v-for="i in emptySlots" :key="'empty-' + i"
              class="relative w-full h-0 pt-[100%] rounded-lg border-2 border-dashed border-#E4E7ED opacity-50">
            </div>
          </div>
        </div>

        <!-- 物品详情弹窗 -->
        <el-dialog v-model="itemDialogVisible" :title="activeItem?.name || '物品详情'" width="30vw" top="4vh"
          :close-on-click-modal="true" :show-close="true" custom-class="item-detail-dialog" @close="closeItemDetail">
          <template #header>
            <div class="flex items-center gap-x-2vh">
              <span class="text-2.5vh font-bold text-black">
                {{ activeItem?.name || '物品详情' }}
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
                <!-- 灵力晶核特殊显示 -->
                <img v-if="!activeItem.isCard" :src="inventoryImg(activeItem.img)"
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
                  数量: <span class="text-#E6A23C font-bold">{{ activeItem.num }}</span>
                </div>
                <div class="text-2vh font-medium text-black">
                  {{ getItemType(activeItem) }}
                </div>
                <!-- 卡牌专属信息 -->
                <div v-if="activeItem.isCard" class="flex gap-x-2vh text-2vh">
                  <span class="text-#909399">消耗: <span class="text-#E6A23C font-bold">{{ activeItem.cost
                      }}</span></span>
                  <span class="text-#909399">冷却: <span class="text-#F56C6C font-bold">{{ activeItem.maxCooldown
                      }}</span></span>
                </div>
              </div>
            </div>

            <!-- 物品描述 -->
            <div>
              <div class="text-2vh font-bold text-black mb-1.5vh">{{ activeItem.isCard ? '卡牌效果' : '物品描述' }}</div>
              <div class="text-2.2vh text-#333 leading-relaxed font-medium">
                {{ activeItem.miaoshu }}
              </div>
            </div>

            <!-- 卡牌进化词条 -->
            <div v-if="activeItem.isCard">
              <div class="text-2vh font-bold text-#333 mb-1.5vh">进化词条</div>
              <div class="flex flex-col gap-y-1.5vh">
                <el-tooltip v-for="evo in cardEvoOptions" :key="evo" :content="getEvoDesc(evo)" placement="right"
                  trigger="click" :show-after="0" :hide-after="0">
                  <div class="p-1.5vh rounded-lg border cursor-pointer"
                    :class="isEvoUnlocked(evo) ? 'bg-#67C23A/10 border-#67C23A/40' : 'bg-#F5F7FA/10 border-#E4E7ED/30'">
                    <div class="flex items-center justify-between">
                      <span class="text-2vh font-medium" :class="isEvoUnlocked(evo) ? 'text-#67C23A' : 'text-#C0C4CC'">
                        {{ evo }}
                      </span>
                      <span v-if="isEvoUnlocked(evo)"
                        class="text-1.6vh px-1vh py-0.3vh rounded-full bg-#67C23A/20 text-#67C23A">
                        已激活
                      </span>
                      <span v-else class="text-1.6vh text-#909399">
                        点击查看
                      </span>
                    </div>
                  </div>
                </el-tooltip>
              </div>
            </div>

            <!-- 物品属性（如果有） -->
            <div v-if="activeItem.Hp || activeItem.moli">
              <div class="text-2vh font-bold text-white mb-2vh">物品效果</div>
              <div class="flex flex-col gap-y-1.5vh">
                <div v-if="activeItem.Hp" class="flex justify-between text-1.7vh">
                  <span class="text-#909399">恢复生命值</span>
                  <span class="text-#67C23A font-bold">+{{ activeItem.Hp }}</span>
                </div>
                <div v-if="activeItem.moli" class="flex justify-between text-1.7vh">
                  <span class="text-#909399">魔力上限</span>
                  <span class="text-#E6A23C font-bold">+{{ activeItem.moli }}</span>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex gap-x-2vh">
              <template v-if="activeItem?.wuqi">
                <el-button type="primary" @click="useItem('wuqi')" class="flex-1">
                  穿戴
                </el-button>
              </template>
              <template v-else-if="activeItem?.shiyong">
                <el-button type="success" @click="useItem('eat')" class="flex-1">
                  使用
                </el-button>
              </template>
              <!-- <template v-else>
                <el-button disabled class="flex-1">
                  暂无操作
                </el-button>
              </template> -->
            </div>
          </template>
        </el-dialog>

        <!-- 进化选择弹窗 -->
        <el-dialog v-model="showEvoSelect" title="选择进化词条" width="28vw" :close-on-click-modal="true"
          custom-class="evo-select-dialog">
          <div class="flex flex-col gap-y-2vh">
            <div class="text-1.6vh text-#909399 mb-1vh">
              消耗 1 张重复卡牌进行进化
            </div>
            <div v-for="evo in cardEvoOptions" :key="evo" class="p-2vh rounded-lg border cursor-pointer transition-all"
              :class="isEvoUnlocked(evo)
                ? 'bg-#67C23A/10 border-#67C23A/40 cursor-not-allowed'
                : 'bg-#F5F7FA/10 border-#E4E7ED/30 hover:border-#409EFF/60 hover:bg-#409EFF/5'"
              @click="!isEvoUnlocked(evo) && evolveCard(evo)">
              <div class="flex items-center justify-between mb-1vh">
                <span class="text-1.8vh font-bold" :class="isEvoUnlocked(evo) ? 'text-#67C23A' : 'text-white'">
                  {{ evo }}
                </span>
                <span v-if="isEvoUnlocked(evo)"
                  class="text-1.4vh px-1vh py-0.3vh rounded-full bg-#67C23A/20 text-#67C23A">
                  已激活
                </span>
                <span v-else class="text-1.4vh px-1vh py-0.3vh rounded-full bg-#409EFF/20 text-#409EFF">
                  点击进化
                </span>
              </div>
              <div class="text-1.5vh text-#C0C4CC">
                {{ getEvoDesc(evo) }}
              </div>
            </div>
          </div>
        </el-dialog>
      </el-tab-pane>

      <!-- 卡牌图鉴 -->
      <el-tab-pane name="cardBook" class="pt-1.5vh" >
        <template #label>
          <span class="text-3vh">卡牌图鉴</span>
        </template>
        <div class="flex flex-col h-66vh  pb-4vh ">
          <!-- 切换标签 -->
          <div class="flex gap-x-2vh px-2vh pb-1vh">
            <div class="px-2vw py-0.8vh rounded-full cursor-pointer text-1.4vw font-medium transition-all"
              :class="cardTab === 'owned' ? 'bg-gradient-to-r from-#409EFF to-#66B1FF text-white shadow-md' : 'bg-#F5F7FA text-#606266 hover:bg-#E4E7ED'"
              @click="cardTab = 'owned'">
              ✨ 已解锁 ({{ ownedCardList.length }})
            </div>
            <div class="px-2vw py-0.8vh rounded-full cursor-pointer text-1.4vw font-medium transition-all"
              :class="cardTab === 'locked' ? 'bg-gradient-to-r from-#409EFF to-#66B1FF text-white shadow-md' : 'bg-#F5F7FA text-#606266 hover:bg-#E4E7ED'"
              @click="cardTab = 'locked'">
              🔒 未解锁 ({{ lockedCardList.length }})
            </div>
          </div>
          <el-divider style="margin: 0 0;" />
          <!-- 卡牌列表 -->
          <div
            class="grid  md:grid-cols-6 xl:grid-cols-7 gap-x-2.5vh gap-y-2.5vh px-2vh py-2vh overflow-y-auto flex-1 box-border content-start card-gallery-scroll">
            <div v-for="card in displayCards" :key="card.name"
              class="relative w-full h-0 pt-[148.28%] rounded-lg overflow-hidden cursor-pointer group shadow-md transition-all duration-200"
              :class="[
                (!card.num || card.num <= 0) && 'grayscale opacity-60',
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
                <div v-if="!card.num || card.num <= 0"
                  class="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
                  <div class="flex flex-col items-center gap-y-1vh">
                    <div class="text-5vh">🔒</div>
                    <div class="text-white text-1.3vw font-medium">未解锁</div>
                    <div class="text-white/70 text-1.1vh">点击查看</div>
                  </div>
                </div>

                <!-- 灵力消耗（左上角） -->
                <div class="absolute top-[4%] left-[8%] text-3.5vh font-bold z-10 text-#409EFF">
                  {{ card.cost }}
                </div>

                <!-- 卡牌名称（绝对居中） -->
                <div
                  class="absolute top-[5%] left-1/2  -translate-x-1/2 text-center text-3vh  z-10 w-full  font-bold text-black iconfont2 ">
                  {{ card.name }}
                </div>

                <!-- 已进化标记（右上角） -->
                <div v-if="card.owned && card.defaultEvos?.length" class="absolute top-[-2%] right-[4%] z-10">
                  <span class="text-1.4vh px-1vh py-0.3vh rounded-full text-white font-medium bg-black/50">
                    进化×{{ card.defaultEvos.length }}
                  </span>
                </div>
                <!-- 中间 Spine 卡牌图 -->
                <div class="absolute inset-0 z-1">
                  <img v-if="cardImgMap[card.name]" :src="cardImgMap[card.name]" class="w-full h-full object-cover" />
                </div>

              </div>
            </div>
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
                    <div class="text-3.5vh font-bold" :style="{ color: activeEvoCard.color }">
                      {{ activeEvoCard.name }}
                    </div>
                    <div class="text-2.5vh text-#C0C4CC leading-relaxed font-medium">
                      {{ activeEvoCard.desc }}
                    </div>
                    <div class="flex gap-x-2vh text-1.6vh font-medium">
                      <span class="text-#409EFF text-2.6vh iconfont2">{{ activeEvoCard.cost > 0 ? `消耗:
                        ${activeEvoCard.cost} 灵力`
                        : '无消耗'
                      }}</span>
                      <span class="text-#E6A23C text-2.6vh iconfont2">{{ activeEvoCard.maxCooldown > 0 ? `冷却:
                        ${activeEvoCard.maxCooldown}
                        回合` :
                        '无冷却' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 已进化词条 -->
              <div class="px-2vw py-2vh">
                <div class="flex items-center gap-x-1vh mb-2vh">
                  <span class="text-2.5vh font-bold text-#67C23A">已进化 ({{ ownedEvos.length }})</span>
                  <span v-if="!activeEvoCard.num || activeEvoCard.num <= 0"
                    class="text-1.4vh px-1vh py-0.3vh rounded-full bg-#F56C6C/20 text-#F56C6C font-medium ml-auto">
                    🔒 未解锁
                  </span>
                </div>
                <div class="flex flex-col gap-y-1.5vh">
                  <div v-for="evo in ownedEvos" :key="evo"
                    class="p-2vh rounded-lg bg-gradient-to-r from-#67C23A/20 to-#67C23A/10 border border-#67C23A/40">
                    <div class="flex items-center justify-between mb-1vh">
                      <span class="text-1.9vh font-bold text-#67C23A">{{ evo }}</span>
                      <span
                        class="text-1.4vh px-1vh py-0.3vh rounded-full bg-#67C23A/30 text-#67C23A font-medium">已激活</span>
                    </div>
                    <div class="text-1.7vh text-#DCDFE6 leading-relaxed font-medium">
                      {{ activeEvoCard.evoDesc?.[evo] || '' }}
                    </div>
                  </div>
                  <div v-if="ownedEvos.length === 0" class="text-center py-3vh text-2vh text-#909399">
                    {{ activeEvoCard.num && activeEvoCard.num > 0 ? '暂无已进化词条' : '解锁后可进化' }}
                  </div>
                </div>
              </div>

              <!-- 未进化词条 -->
              <div class="px-2vw py-2vh">
                <div class="flex items-center gap-x-1vh mb-2vh">
                  <span class="text-2.5vh font-bold text-#E6A23C">可进化 ({{ lockedEvos.length }})</span>
                </div>
                <div class="flex flex-col gap-y-1.5vh">
                  <div v-for="evo in lockedEvos" :key="evo" :class="[
                    activeEvoCard.num && activeEvoCard.num > 0
                      ? 'cursor-pointer hover:border-#E6A23C/60'
                      : 'cursor-not-allowed opacity-70'
                  ]"
                    class="p-2vh rounded-lg bg-gradient-to-r from-#E6A23C/15 to-#E6A23C/5 border border-#E6A23C/30 transition-all group"
                    @click="activeEvoCard.num && activeEvoCard.num > 0 && openEvoConfirm(evo)">
                    <div class="flex items-center justify-between mb-1vh">
                      <span class="text-1.9vh font-bold text-#E6A23C">{{ evo }}</span>
                      <span v-if="activeEvoCard.num && activeEvoCard.num > 0"
                        class="text-2vh px-1vh py-0.3vh rounded-full bg-#E6A23C/20 text-#E6A23C group-hover:bg-#E6A23C/40 transition-all font-medium">点击进化</span>
                      <span v-else
                        class="text-2vh px-1vh py-0.3vh rounded-full bg-#909399/20 text-#909399 font-medium">🔒
                        未解锁</span>
                    </div>
                    <div class="text-2.5vh text-#DCDFE6 leading-relaxed font-medium">
                      {{ activeEvoCard.evoDesc?.[evo] || '' }}
                    </div>
                  </div>
                  <div v-if="lockedEvos.length === 0" class="text-center py-3vh text-2vh text-#909399">
                    所有词条已全部进化
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
        <!-- 进化确认弹窗（卡牌图鉴用） -->
        <el-dialog v-model="showEvoConfirm" title="" width="28vw" :close-on-click-modal="true" top="2.5vh"
          custom-class="evo-confirm-dialog" :show-close="true">
          <div v-if="activeEvoCard" class="flex flex-col">
            <!-- 顶部标题 -->
            <div class="flex items-center justify-center gap-x-1.5vh mb-2vh">
              <el-icon size="5vh" class=" text-#E6A23C">
                <Star />
              </el-icon>
              <span class="text-3vh font-bold text-black">卡牌进化</span>
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
                  {{ activeEvoCard.name }}
                </div>
                <div class="flex gap-x-2vh text-2.3vh">
                  <span class="text-#E6A23C">消耗 {{ activeEvoCard.cost }} 灵力</span>
                  <span class="text-#F56C6C">冷却 {{ activeEvoCard.maxCooldown }} 回合</span>
                </div>
              </div>
            </div>

            <!-- 进化消耗 -->
            <div class="p-3vh rounded-xl bg-gradient-to-r from-#F5F7FA/5 to-#F5F7FA/10 border border-#E4E7ED/20">
              <div class="flex items-center gap-x-1vh mb-2vh">
                <el-icon class="text-1.8vh text-#E6A23C">
                  <Coin />
                </el-icon>
                <span class="text-2vh font-bold text-#333">进化消耗</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-x-1.5vh">
                  <div class="w-6vh h-6vh rounded-lg overflow-hidden border flex items-center justify-center"
                    :style="{ borderColor: activeEvoCard.color }">
                    <img v-if="cardImgMap[activeEvoCard.name]" :src="cardImgMap[activeEvoCard.name]"
                      class="w-full h-full object-contain scale-185 rounded-full" />
                  </div>
                  <span class="text-2.5vh text-black">重复卡牌</span>
                </div>
                <div class="flex items-center gap-x-1vh">
                  <span class="text-3vh font-bold"
                    :class="canEvolve(activeEvoCard.name) ? 'text-#67C23A' : 'text-#F56C6C'">
                    {{ getExtraCardCount(activeEvoCard.name) }}
                  </span>
                  <span class="text-2vh text-#333">/</span>
                  <span class="text-3vh font-medium text-#333">

                    {{ getEvoCostCount(activeEvoCard.name) }}
                  </span>
                </div>
              </div>
              <div class="text-2vh text-#333 mt-1.5vh text-right">
                多余卡牌数量（不含基础卡牌）
              </div>
            </div>

            <!-- 进化效果 -->
            <div class=" p-2.5vh rounded-xl  bg-#E6A23C/25 border border-#E6A23C/30">
              <div class="text-3.5vh text-black leading-relaxed font-medium">
                {{ pendingEvoName }}
              </div>
              <div class="text-2.8vh text-black mt-0.5vh">
                {{ activeEvoCard.evoDesc?.[pendingEvoName] || '' }}
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex gap-x-2vh px-1vh">
              <el-button @click="showEvoConfirm = false" class="flex-1 h-5vh text-1.7vh">
                取消
              </el-button>
              <el-button type="primary" @click="confirmEvolveCard" :disabled="!canEvolve(activeEvoCard?.name)"
                class="flex-1 text-1.7vh">
                确认进化
              </el-button>
            </div>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- 卡牌携带 -->
      <el-tab-pane name="cardCarry">
        <template #label>
          <span class="text-3vh">卡牌携带</span>
        </template>
        <div class="flex flex-col h-72vh">
          <div class="px-2vh pt-2vh border-b border-#E4E7ED flex-shrink-0">
            <div class="flex items-center  gap-x-1 mb-1.5vh">
              <span class="text-2.3vh font-bold text-#303133">已携带卡牌</span>
              <span class="text-2.6vh" :class="playerHandList.length >= maxHandCards ? 'text-#F56C6C' : 'text-#409EFF'">
                {{ playerHandList.length }} / {{ maxHandCards }}
              </span>
            </div>
            <div class="flex flex-wrap gap-x-1.5vh gap-y-1.5vh">
              <!-- 已携带的卡牌 -->
              <div v-for="cardName in playerHandList" :key="'hand-' + cardName"
                class="relative w-13vh h-[19.2vh] rounded-lg overflow-hidden cursor-pointer group shadow-sm transition-all duration-200 hover:-translate-y-0.3vh flex-shrink-0"
                :class="cardName === '射击' ? 'ring-2 ring-#F56C6C' : ''" @click="removeFromHand(cardName)">
                <div class="absolute inset-0">
                  <!-- 卡牌背景 -->
                  <div class="absolute inset-0" :style="{
                    background: `linear-gradient(180deg, ${getCardData(cardName)?.color}22 0%, ${getCardData(cardName)?.color}11 40%, ${getCardData(cardName)?.color}33 100%)`,
                  }"></div>
                  <!-- 卡牌边框 -->
                  <div class="absolute inset-0 rounded-lg border-2 transition-all"
                    :style="{ borderColor: getCardData(cardName)?.color + '88' }"></div>
                  <!-- 灵力消耗（左上角） -->
                  <div class="absolute top-[3%] left-[7%] text-2.2vh font-bold z-10 text-#409EFF">
                    {{ getCardData(cardName)?.cost }}
                  </div>
                  <!-- 卡牌名称 -->
                  <div
                    class="absolute top-[6%] left-[52%]  w-full  -translate-x-1/2 text-center text-1.5vh  z-10   font-bold text-black iconfont2 ">
                    {{ cardName }}
                  </div>
                  <!-- 中间卡牌图 -->
                  <div class="absolute inset-0 z-1">
                    <img v-if="cardImgMap[cardName]" :src="cardImgMap[cardName]" class="w-full h-full object-cover" />
                  </div>
                  <!-- 必带标记（射击） -->
                  <div v-if="cardName === '射击'"
                    class="absolute top-0 right-0 z-20 bg-#F56C6C text-white text-1.1vh px-0.7vh py-0.2vh rounded-bl font-medium">
                    必带
                  </div>
                </div>
              </div>
              <!-- 添加按钮 -->
              <div v-if="playerHandList.length < maxHandCards"
                class="relative w-13vh h-[19.2vh] rounded-lg border-2 border-dashed border-#DCDFE6 opacity-60 cursor-pointer hover:opacity-100 hover:border-#409EFF transition-all flex-shrink-0 flex items-center justify-center"
                @click="scrollToAvailable">
                <span class="text-#C0C4CC text-3vh">+</span>
              </div>
            </div>
          </div>
          <el-divider style="margin:1.5vh 0 1vh 0;" />
          <!-- 可选卡牌区域 -->
          <div class="flex-1 overflow-y-auto pl-2vh pr-3vw py-0.5vh overflow-y-scroll">
            <div class="flex items-center justify-between mb-1vh">
              <span class="text-2vh font-bold text-#303133">可选卡牌</span>
              <span class="text-2vh text-#333 font-bold">点击卡牌添加到携带栏</span>
            </div>
            <div class="grid md:grid-cols-7 xl:grid-cols-8 gap-x-2vh gap-y-2vh content-start">
              <div v-for="card in availableCards" :key="'avail-' + card.name"
                class="relative w-full h-0 pt-[148.28%] rounded-lg overflow-hidden cursor-pointer group shadow-md transition-all duration-200"
                :class="[
                  isInHand(card.name) ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:-translate-y-0.5vh hover:shadow-lg',
                  card.num <= 0 ? 'grayscale opacity-60 cursor-not-allowed' : ''
                ]" @click="addToHand(card.name)">
                <div class="absolute inset-0">
                  <!-- 卡牌背景 -->
                  <div class="absolute inset-0" :style="{
                    background: `linear-gradient(180deg, ${card.color}22 0%, ${card.color}11 40%, ${card.color}33 100%)`,
                  }"></div>
                  <!-- 卡牌边框 -->
                  <div class="absolute inset-0 rounded-lg border-2 group-hover:border-opacity-100 transition-all"
                    :style="{ borderColor: card.color + '88' }"></div>
                  <!-- 未解锁遮罩 -->
                  <div v-if="card.num <= 0"
                    class="absolute inset-0 bg-black/50 flex items-center justify-center z-30 backdrop-blur-sm">
                    <div class="flex flex-col items-center gap-y-1vh">
                      <div class="text-3.5vh">🔒</div>
                      <div class="text-white text-1.2vh font-medium">未解锁</div>
                    </div>
                  </div>
                  <!-- 已携带标记 -->
                  <div v-if="isInHand(card.name) && card.num > 0"
                    class="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
                    <span class="text-white text-1.4vh font-bold bg-#67C23A/80 px-1.2vh py-0.4vh rounded-full">
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
                    {{ card.name }}
                  </div>
                  <!-- 中间卡牌图 -->
                  <div class="absolute inset-0 z-1">
                    <img v-if="cardImgMap[card.name]" :src="cardImgMap[card.name]" class="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="px-2vh pb-2.5vh pt-0.5vh border-t border-#E4E7ED flex-shrink-0 bg-#F5F7FA">
            <div class="flex items-center gap-x-1vh text-1.8vh text-#333">
              <el-icon>
                <InfoFilled />
              </el-icon>
              <span>「射击」为必带卡牌，无法移除；最多可携带 {{ maxHandCards }} 张卡牌进入战斗</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 卡牌抽取 -->
      <el-tab-pane name="cardGacha">
        <template #label>
          <span class="text-3vh">卡牌抽取</span>
        </template>
        <div class="relative h-65vh overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
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
          <div class="relative z-10 flex flex-col h-full">
            <!-- 顶部：右上角灵力晶核 + 历史记录按钮（绝对定位不占空间） -->
            <div class="absolute top-3vh left-0 right-0 flex justify-between items-start px-3vh z-20">
              <!-- 左侧：历史记录按钮 -->
              <el-button size="small"
                class="bg-black/40 backdrop-blur-sm border border-purple-500/30 text-white hover:bg-purple-600/50"
                @click="showHistory = true">
                <span class="flex items-center gap-x-1vh">
                  <el-icon>
                    <Clock />
                  </el-icon>
                  <span>历史</span>
                </span>
              </el-button>
              <!-- 右侧：灵力晶核数量 -->
              <div
                class="flex items-center gap-x-1.5vh bg-black/40 backdrop-blur-sm px-3vh py-1.5vh rounded-full border border-purple-500/30">
                <img src="@/assets/daoju/jinghe.webp" class="w-4vh h-4vh object-contain" />
                <span class="text-white text-2vh font-bold">{{ crystalCount }}</span>
              </div>
            </div>

            <!-- 中间：卡牌展示区 -->
            <div ref="gachaResultRef" class="flex-1 flex gacha-result-container"
              :class="showResults ? 'items-start justify-center overflow-y-auto pt-5vh pb-3vh' : 'items-center justify-center'">
              <!-- 抽卡前：卡池展示 -->
              <div v-if="!isDrawing && !showResults" class="flex flex-col items-center gap-y-4vh">
                <div class="relative">
                  <!-- 发光效果 -->
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-3xl rounded-full animate-pulse">
                  </div>

                  <!-- 卡背展示 -->
                  <div class="relative w-25vh h-[37vh] perspective-1000">
                    <div
                      class="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-500 hover:scale-105 hover:rotate-1">
                      <!-- 卡背背景 -->
                      <div class="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900"></div>
                      <!-- 神秘图案 -->
                      <div class="absolute inset-0 flex items-center justify-center">
                        <div
                          class="w-15vh h-15vh rounded-full border-4 border-purple-400/50 flex items-center justify-center animate-spin-slow">
                          <div
                            class="w-10vh h-10vh rounded-full border-2 border-pink-400/50 flex items-center justify-center">
                            <div
                              class="w-5vh h-5vh rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg shadow-purple-500/50">
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- 光芒射线 -->
                      <div class="absolute inset-0 opacity-30">
                        <div v-for="i in 12" :key="i"
                          class="absolute top-1/2 left-1/2 w-0.5 h-20vh bg-gradient-to-t from-transparent via-purple-400 to-transparent origin-bottom"
                          :style="{ transform: `translate(-50%, -100%) rotate(${i * 30}deg)` }">
                        </div>
                      </div>
                      <!-- 边框装饰 -->
                      <div class="absolute inset-2 rounded-xl border border-purple-400/30"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 抽卡动画中 -->
              <div v-if="isDrawing" class="flex items-center justify-center">
                <div class="relative">
                  <!-- 外层强烈光芒 -->
                  <div
                    class="absolute inset-0 -m-15vh bg-gradient-to-r from-yellow-400/30 via-white/50 to-yellow-400/30 blur-3xl rounded-full animate-pulse-fast">
                  </div>

                  <!-- 中层光芒 -->
                  <div
                    class="absolute inset-0 -m-8vh bg-gradient-to-br from-purple-400/40 via-pink-400/40 to-yellow-400/40 blur-2xl rounded-full animate-pulse">
                  </div>

                  <!-- 旋转光线 -->
                  <div class="absolute inset-0 -m-5vh">
                    <div class="absolute inset-0 animate-spin-slow opacity-60">
                      <div v-for="i in 8" :key="'ray-' + i"
                        class="absolute top-1/2 left-1/2 w-1 h-25vh bg-gradient-to-t from-transparent via-yellow-300 to-transparent origin-bottom"
                        :style="{ transform: `translate(-50%, -100%) rotate(${i * 45}deg)` }">
                      </div>
                    </div>
                  </div>

                  <!-- 翻转的卡牌 -->
                  <div class="relative w-25vh h-[37vh] perspective-1000 z-10">
                    <div class="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl animate-card-flip"
                      :style="{ transformStyle: 'preserve-3d' }">
                      <!-- 卡背 -->
                      <div class="absolute inset-0 backface-hidden" :style="{ backfaceVisibility: 'hidden' }">
                        <div class="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center">
                          <div
                            class="w-15vh h-15vh rounded-full border-4 border-purple-400/50 flex items-center justify-center animate-spin-slow">
                            <div
                              class="w-5vh h-5vh rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg shadow-purple-500/50">
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
                <div class="text-2.5vh font-bold text-white mb-2vh">抽卡结果</div>
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
                      <!-- 卡牌名称 -->
                      <div class="absolute top-2vh left-1/2 -translate-x-1/2 text-center z-10 w-full px-2vh">
                        <div class="text-3.5vh font-bold iconfont2 text-black">
                          {{ gachaResults[0].name }}
                        </div>
                      </div>



                      <!-- 中间 Spine 卡牌图 -->
                      <div class="absolute inset-0 z-1">
                        <img v-if="cardImgMap[gachaResults[0].name]" :src="cardImgMap[gachaResults[0].name]"
                          class="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                  <div class="text-center mt-3vh">
                    <el-button type="primary" @click="closeResults" class="px-6vh">
                      确认
                    </el-button>
                  </div>
                </div>

                <!-- 十连抽结果 -->
                <div v-else class="w-full gacha-result-wrapper">
                  <div class="grid grid-cols-5 gap-x-2vh gap-y-2vh gacha-result-grid">
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

                      <!-- 卡牌名称 -->
                      <div class="absolute top-[5%] left-1/2 -translate-x-1/2 text-center z-10 w-full px-1vh ml-0.5vw">
                        <div class="text-3vh font-bold truncate iconfont2 text-black">
                          {{ card.name }}
                        </div>
                      </div>



                      <!-- 中间 Spine 卡牌图 -->
                      <div class="absolute inset-0 z-1">
                        <img v-if="cardImgMap[card.name]" :src="cardImgMap[card.name]"
                          class="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                  <div class="text-center mt-3vh">
                    <el-button type="primary" @click="closeResults" class="px-6vh">
                      确认
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部：抽卡按钮 -->
            <div v-if="!isDrawing && !showResults" class="flex justify-center gap-x-4vh pb-5vh">
              <el-button size="large"
                class="gacha-btn px-6vh py-3vh text-xl font-bold rounded-xl shadow-lg transition-all relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0"
                @click="doGacha(1)">
                <span class="flex items-center gap-x-1vh text-white">
                  <span>单抽</span>
                  <span class="text-sm opacity-80">×1</span>
                </span>
              </el-button>
              <el-button size="large"
                class="gacha-btn px-6vh py-3vh text-xl font-bold rounded-xl shadow-lg transition-all relative bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0"
                @click="doGacha(10)">
                <span class="flex items-center gap-x-1vh text-white">
                  <span>十连抽</span>
                </span>
              </el-button>
            </div>
          </div>

          <!-- 抽卡历史记录弹窗 -->
          <el-dialog v-model="showHistory" title="抽卡历史" width="60vh" class="gacha-history-dialog">
            <div class="max-h-50vh overflow-y-auto">
              <div v-if="user.gachaHistory.length === 0" class="text-center py-8vh text-gray-400">
                暂无抽卡记录
              </div>
              <div v-else class="flex flex-col gap-y-2vh">
                <div v-for="(record, index) in user.gachaHistory" :key="index"
                  class="bg-white/5 rounded-lg p-2vh border border-white/10">
                  <div class="flex justify-between items-center mb-1vh">
                    <span class="text-1.6vh text-gray-300">{{ record.time }}</span>
                    <span class="text-1.6vh text-purple-300">{{ record.count }}连抽 · 消耗{{ record.cost }}晶核</span>
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

      <!-- 天赋系统 -->
      <el-tab-pane name="talent">
        <template #label>
          <span class="text-3vh">天赋系统</span>
        </template>
        <div class="flex flex-col h-70vh">
          <!-- 顶部：天赋点显示 -->
          <div class="flex items-center justify-between px-4vh py-1.5vh border-b border-#E4E7ED flex-shrink-0">
            <div class="flex items-center gap-2vh">
              <span class="text-3vh">🌟</span>
              <span class="text-2.5vh font-bold text-#303133">天赋点</span>
            </div>
            <div class="flex items-center gap-1.5vh">
              <span class="text-4vh font-bold text-#E6A23C">{{ user.pixi.player.talentPoints }}</span>
              <span class="text-2vh text-#909399">点可用</span>
            </div>
          </div>

          <!-- 天赋列表 -->
          <div class="flex-1 overflow-y-auto p-1vh">
            <div class="grid grid-cols-3 gap-3vh">
              <div v-for="talent in user.talentConfig" :key="talent.id"
                class="relative py-2vh px-3vh rounded-2xl border-2 transition-all cursor-pointer" :class="user.hasTalent(talent.id)
                  ? 'bg-gradient-to-br from-#F0F9FF to-#E0F2FE border-#409EFF shadow-lg'
                  : 'bg-gradient-to-br from-#F5F7FA to-#F2F6FC border-#DCDFE6 hover:border-#C0C4CC hover:shadow-md'">
                <!-- 已激活标记 -->
                <div v-if="user.hasTalent(talent.id)"
                  class="absolute top-2vh right-2vh w-3vh h-3vh rounded-full bg-#67C23A flex items-center justify-center">
                  <span class="text-white text-1.5vh">✓</span>
                </div>

                <!-- 天赋图标和名称 -->
                <div class="flex gap-x-2.5vh mb-1vh">
                  <img :src="inventoryImg(talent.id)" class="w-15vh h-15vh object-contain rounded-full" />
                  <div class="flex-1 flex flex-col  gap-y-1vh">
                    <div class="text-3vh font-bold text-#303133">{{ talent.name }}</div>
                    <div class="text-2.4vh iconfont2 text-#333 leading-relaxed">
                      {{ talent.description }}
                    </div>

                  </div>
                </div>

                <!-- 底部：消耗和按钮 -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1vh">
                    <span class="text-2vh text-#333">消耗</span>
                    <span class="text-2.5vh font-bold text-#E6A23C">{{ talent.cost }}</span>
                    <span class="text-2vh text-#333">点</span>
                  </div>


                  <div v-if="!user.hasTalent(talent.id)" class="bg-#409EFF text-white text-2vh px-2vh py-1vh rounded"
                    @click="activateTalent(talent.id)" round>激活</div>

                  <span v-else class="text-2vh font-semibold text-#67C23A py-1vh">
                    已激活
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="px-4vh pb-1vh">
            <el-divider style="margin: 0;" />
            <span class="text-2vh text-#333 iconfont2 flex items-center justify-center">
              💡 5/10/15/20以上等级都会获得一天赋点
            </span>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import { createCardSpine } from "../fight/CardSpine"
import { Star, Coin, MagicStick, Close, Check, InfoFilled, Clock } from '@element-plus/icons-vue'

const user = useCounterStore();

// 接收父组件传入的默认激活标签
const props = defineProps({
  defaultTab: {
    type: String,
    default: 'info' // 默认第一个标签
  }
});

// 当前激活的标签
const activeTab = ref(props.defaultTab);

// 监听默认标签变化，切换到对应标签
watch(() => props.defaultTab, (newVal) => {
  if (newVal) {
    activeTab.value = newVal;
  }
});

const popoverRefs1 = ref([]);
// 当前展开描述的卡牌
const activeDescCard = ref(null);
// 当前打开进化面板的卡牌
const activeEvoCard = ref(null);

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

// 标签切换时关闭弹窗
function handleTabChange() {
  closeEvoPanel();
  closeItemDetail();
  showEvoSelect.value = false;
  showEvoConfirm.value = false;
  // 关闭抽卡结果
  showResults.value = false;
  gachaResults.value = [];
  isDrawing.value = false;
  // 关闭历史记录
  showHistory.value = false;
}

// ==================== 天赋系统 ====================
function activateTalent(talentId) {
  user.activateTalent(talentId)
}

// 已进化的词条
const ownedEvos = computed(() => {
  if (!activeEvoCard.value?.defaultEvos) return [];
  return activeEvoCard.value.defaultEvos;
});

// 未进化的词条（evoOptions 减去 defaultEvos）
const lockedEvos = computed(() => {
  if (!activeEvoCard.value?.evoOptions) return [];
  const defaultEvos = activeEvoCard.value.defaultEvos || [];
  return activeEvoCard.value.evoOptions.filter(evo => !defaultEvos.includes(evo));
});

// ==================== 卡牌抽取 ====================

// 抽卡状态
const isDrawing = ref(false);
const showResults = ref(false);
const gachaResults = ref([]);
const showHistory = ref(false);
const particles = ref([]);
const gachaResultRef = ref(null);

// 灵力晶核数量
const crystalCount = computed(() => {
  return user.getCrystalCount();
});

// 执行抽卡
function doGacha(count) {
  if (isDrawing.value) return;

  const cost = count;
  if (crystalCount.value < cost) {
    ElMessText("灵力晶核不足！", "warning");
    return;
  }

  isDrawing.value = true;
  showResults.value = false;

  // 播放抽卡动画
  setTimeout(() => {
    const results = user.gachaCard(count);
    console.log('results=', results);

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
  console.log("查看卡牌详情:", card);
}

// ==================== 物品栏 ====================

// 筛选标签
const itemTabs = [
  { label: '全部', value: 'all' },
  { label: '材料', value: 'material' },
  { label: '卡牌', value: 'currency' },
];

const itemTab = ref('all');
const activeItem = ref(null);
const activeItemIndex = ref(-1);
const itemDialogVisible = ref(false);
const showEvoSelect = ref(false);

// 卡牌图鉴进化确认弹窗
const showEvoConfirm = ref(false);
const pendingEvoName = ref('');

// 获取筛选分类数量
function getTabCount(tab) {
  if (tab === 'all') return user.inventory.length;
  return user.inventory.filter(item => getItemTypeValue(item) === tab).length;
}

// 获取物品类型值（用于筛选）
function getItemTypeValue(item) {
  if (item.isCard) return 'currency';
  if (item.img === 'qiandaizi.webp') return 'currency';
  if (item.wuqi) return 'equipment';
  if (item.shiyong) return 'consumable';
  return 'material';
}

// 获取物品类型名称
function getItemType(item) {
  if (item.isCard) return '卡牌';
  if (item.img === 'qiandaizi.webp') return '货币';
  if (item.wuqi) return '装备';
  if (item.shiyong) return '消耗品';
  return '材料';
}

// 获取物品品质颜色
function getItemQualityColor(item) {
  if (item.isCard) return item.color || '#409EFF';
  if (item.isGachaItem) return '#8B5CF6'; // 紫色 - 抽卡道具
  if (item.img === 'qiandaizi.webp') return '#E6A23C'; // 金色 - 货币
  if (item.wuqi) return '#F56C6C'; // 红色 - 装备
  if (item.shiyong) return '#67C23A'; // 绿色 - 消耗品
  return '#909399'; // 灰色 - 材料
}

// 筛选后的物品列表
const filteredItems = computed(() => {
  if (itemTab.value === 'all') return user.inventory;
  return user.inventory.filter(item => getItemTypeValue(item) === itemTab.value);
});

// 空格子数量（至少显示50个格子）
const emptySlots = computed(() => {
  const minSlots = 50;
  const count = filteredItems.value.length;
  return Math.max(0, minSlots - count);
});

// 卡牌进化选项
const cardEvoOptions = computed(() => {
  if (!activeItem.value?.isCard) return [];
  const cardData = user.pixi.player.CARD_DATA[activeItem.value.name];
  return cardData?.evoOptions || [];
});

// 检查词条是否已解锁
function isEvoUnlocked(evoName) {
  if (!activeItem.value?.isCard) return false;
  const cardData = user.pixi.player.CARD_DATA[activeItem.value.name];
  return cardData?.defaultEvos?.includes(evoName) || false;
}

// 是否有可进化的词条
const hasEvolvableEvo = computed(() => {
  return cardEvoOptions.value.some(evo => !isEvoUnlocked(evo));
});

// 进化卡牌
function evolveCard(evoName) {
  console.log(`进化卡牌 ${activeEvoCard.value.name} 的 ${evoName}`);
  if (!activeItem.value?.isCard) return;
  const success = user.evolveCardWithItem(activeItem.value.name, evoName);
  if (success) {
    showEvoSelect.value = false;
    // 刷新物品数据
    const cardItem = user.inventory.find(item => item.name === activeItem.value.name && item.isCard);
    if (cardItem) {
      activeItem.value = { ...cardItem };
    } else {
      closeItemDetail();
    }
  }
}

// 获取进化词条描述
function getEvoDesc(evoName) {
  if (!activeItem.value?.isCard) return '';
  const cardData = user.pixi.player.CARD_DATA[activeItem.value.name];
  return cardData?.evoDesc?.[evoName] || '';
}

// ==================== 卡牌图鉴进化系统 ====================

// 获取背包中某卡牌的数量
function getCardInventoryCount(cardName) {
  const item = user.inventory.find(i => i.name === cardName && i.isCard);
  return item ? item.num : 0;
}

// 获取多余的卡牌数量（不含基础卡牌）
function getExtraCardCount(cardName) {
  const total = getCardInventoryCount(cardName);
  return Math.max(0, total - 1);
}

// 获取进化所需的卡牌数量（第n次进化需要n张）
function getEvoCostCount(cardName) {
  const cardData = user.pixi.player.CARD_DATA[cardName];
  const evoCount = cardData?.defaultEvos?.length || 0;
  // 最多进化4次，第n次进化需要n张
  return Math.min(evoCount + 1, 4);
}

// 检查是否可以进化
function canEvolve(cardName) {
  const have = getCardInventoryCount(cardName);
  const need = getEvoCostCount(cardName);
  // 至少需要保留1张基础卡牌，所以需要 have > need？
  // 不对，应该是 have >= need + 1？还是 have >= need？
  // 用户说"第一次进化要额外1张"，意思是除了基础的1张，还需要额外1张
  // 所以进化需要消耗 need 张，保留1张基础的
  // 总共需要 need + 1 张？
  // 让我再想想...用户说"额外1张"，应该是进化消耗1张
  // 比如你有3张，进化1次消耗1张，还剩2张（1张基础可用+1张可进化）
  // 所以判断条件是 have > need？还是 have >= need？
  // 我觉得是 have >= need + 1？不对...

  // 重新理解："第一次进化要额外1张对应的卡牌"
  // 意思是：进化1次，需要额外消耗1张
  // 你至少要有1张基础卡牌能用，然后额外的才能用来进化
  // 所以：拥有数量 - 1（基础） >= 需要消耗的数量
  // 即 have - 1 >= need
  return have - 1 >= getEvoCostCount(cardName);
}

// 打开进化确认弹窗
function openEvoConfirm(evoName) {
  pendingEvoName.value = evoName;
  showEvoConfirm.value = true;
}

// 确认进化
function confirmEvolveCard() {
  if (!activeEvoCard.value || !pendingEvoName.value) return;

  const cardName = activeEvoCard.value.name;
  const evoName = pendingEvoName.value;
  const cost = getEvoCostCount(cardName);

  const success = user.evolveCardWithCount(cardName, evoName, cost);
  if (success) {
    showEvoConfirm.value = false;
    pendingEvoName.value = '';
    // 刷新进化面板数据
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

const ImgSrc = (src) => {
  return new URL(`../../../assets/fullBody/head/${src}.webp`, import.meta.url).href;
};

const inventoryImg = (src) => {
  return new URL(`../../../assets/daoju/${src}.webp`, import.meta.url).href;
};

function usedBack(item, type, index) {
  if (type === "eat") {
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
    let title = `你使用了${item.name}`;
    if (item.moli !== undefined) {
      user.attributes.moli += item.moli;
      user.attributes.myMana += item.moli;
      title = title + `，魔力上限提升 ${item.moli}`;
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


// 处理后的卡牌列表
const cardList = computed(() => {
  return Object.entries(user.pixi.player.CARD_DATA).map(([name, data]) => ({
    name,
    ...data,
    owned: (data.num || 0) > 0, // num > 0 表示已解锁
  }));
});

const ownedCardList = computed(() => cardList.value.filter((c) => c.num > 0));
const lockedCardList = computed(() => cardList.value.filter((c) => !c.num || c.num <= 0));
const displayCards = computed(() =>
  cardTab.value === "owned" ? ownedCardList.value : lockedCardList.value
);

// ==================== 卡牌携带 ====================

// 最大携带卡牌数量（以后要增加直接改这里）
const maxHandCards = computed(() => {
  let count = 6;
  // 天赋：卡牌大师 - 可携带卡牌数量+1
  if (user.hasTalent('card_master')) {
    count += 1;
  }
  return count;
});

// 当前携带的卡牌列表（从 pinia 获取）
const playerHandList = computed(() => {
  return user.pixi.player.playerHand || [];
});

// 空槽位数量
const emptyHandSlots = computed(() => {
  return Math.max(0, maxHandCards.value - playerHandList.value.length);
});

// 可选卡牌列表（所有 num >= 1 的卡牌）
const availableCards = computed(() => {
  return cardList.value.filter(card => card.num >= 1);
});

// 获取卡牌数据
function getCardData(cardName) {
  return user.pixi.player.CARD_DATA[cardName] || null;
}

// 判断卡牌是否已携带
function isInHand(cardName) {
  return playerHandList.value.includes(cardName);
}

// 滚动到可选卡牌区域
function scrollToAvailable() {
  // 可选区域在下方，这里可以扩展滚动逻辑
}

// 添加卡牌到携带栏
function addToHand(cardName) {
  // 检查是否已解锁
  const cardData = getCardData(cardName);
  if (!cardData || cardData.num <= 0) {
    ElMessText("该卡牌尚未解锁", "warning");
    return;
  }

  // 检查是否已携带
  if (isInHand(cardName)) {
    return;
  }

  // 检查是否达到上限
  if (playerHandList.value.length >= maxHandCards.value) {
    ElMessText(`最多只能携带 ${maxHandCards.value} 张卡牌`, "warning");
    return;
  }

  // 添加到携带栏
  user.pixi.player.playerHand.push(cardName);
  ElMessText(`已添加「${cardName}」到携带栏`, "success");
}

// 从携带栏移除卡牌
function removeFromHand(cardName) {
  // 射击是必带卡牌，不能移除
  if (cardName === "射击") {
    ElMessText("「射击」是必带卡牌，无法移除", "warning");
    return;
  }

  const index = user.pixi.player.playerHand.indexOf(cardName);
  if (index > -1) {
    user.pixi.player.playerHand.splice(index, 1);
    ElMessText(`已移除「${cardName}」`, "info");
  }
}

// ==================== Spine 卡牌渲染 ====================

const cardImgMap = ref({});

// 批量创建所有卡牌 Spine 并转成图片
async function initAllCardSpines() {
  for (const card of cardList.value) {
    try {
      const result = await createCardSpine(card.name, 128, 128); // 改成 256，更清晰
      if (result?.canvas) {
        // 转成 dataURL，用 img 标签显示，避免手动操作 DOM
        cardImgMap.value[card.name] = result.canvas.toDataURL();
      }
    } catch (e) {
      console.warn(`卡牌 ${card.name} spine 加载失败:`, e);
    }
  }
}
onMounted(() => {
  nextTick(() => {
    initAllCardSpines();
    initCardsToInventory();
    // 生成背景粒子固定数据，避免重渲染时粒子变化
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

// 初始化已解锁卡牌到物品栏
function initCardsToInventory() {
  const cardData = user.pixi.player.CARD_DATA;
  for (const [name, data] of Object.entries(cardData)) {
    const num = data.num || 0;
    // num > 0 表示已解锁
    if (num > 0) {
      // 检查是否已存在
      const existing = user.inventory.find(item => item.name === name && item.isCard);
      if (existing) {
        // 已存在，同步数量
        existing.num = num;
      } else {
        // 不存在，添加指定数量的卡牌
        user.addCardToInventory(name, num);
      }
    } else {
      // num 为 0，从物品栏移除
      const existingIndex = user.inventory.findIndex(item => item.name === name && item.isCard);
      if (existingIndex > -1) {
        user.inventory.splice(existingIndex, 1);
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
  padding-right: 2vw !important;
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

/* ==============================================
   卡牌图鉴 - 滚动条优化
   ============================================== */
.card-gallery-scroll {
  /* 始终显示滚动条 */
  overflow-y: scroll !important;
  -webkit-overflow-scrolling: touch;
  /* 修复 flex 布局滚动问题 */
  min-height: 0;
  /* 预留滚动条空间 */
  scrollbar-gutter: stable;
  /* 右边留出触摸空间 */
  padding-right: 2vw !important;
  box-sizing: border-box;
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
</style>