<template>
  <div>
    <transition name="fade">
      <div v-show="progress !== 100" class="absolute inset-0 z-999">
        <LoadingSpine :show="progress !== 100" />
        <div class="absolute flex justify-center items-center w-100vw h-100vh">
          <el-progress type="dashboard" :percentage="progress">
            <template #default="{ percentage }">
              <span class="percentage-value">
                {{ percentage }}%
              </span>

              <span class="percentage-label">
                {{ L('loading') }}
              </span>
            </template>
          </el-progress>
        </div>
      </div>
    </transition>
    <transition name="fade-game">
      <div v-show="progress === 100" class="flex w-full h-100vh justify-end">
        <div class="fixed inset-0 overflow-hidden -z-1">
        </div>
        <!-- 背景spine图 -->
        <div class="absolute page">
          <div ref="pixiRef" class="pixi-wrap" :style="{
            opacity: pixiReady ? 1 : 0
          }">
          </div>
        </div>
        <div class="z-99 flex" v-if="startSelect.index === 0">
          <div
            class="flex flex-col items-end text-white iconfont2 mt-15vh text-7.5vh pt-2vh px-3vw rounded-5 gap-y-9vh font-bold">
            <span v-for="(item, index) of info" :key="index">
              <span
                class="bg-#409EFF/60 px-2vw py-3vh rounded-2 transition-all duration-150 cursor-pointer select-none"
                :class="enterBusy ? 'opacity-50 scale-95 pointer-events-none' : 'hover:brightness-110 active:scale-95'"
                @click="enter(index)">
                {{ item }}
              </span>
            </span>
          </div>
        </div>
        <!-- ⚙️ 设置弹窗（文字速度 / 音量 / 语言） -->
        <el-dialog v-model="settingsVisible" width="74vw" :show-close="true" top="10vh" append-to-body
          body-class="!p-0!" modal-class="settings-modal"
          :style="{ '--el-dialog-bg-color': 'rgba(20,22,40,0.96)' }">
          <div class="px-4vh py-3vh">
            <div class="text-3vh font-bold text-white mb-2vh">⚙️ {{ L('settings') }}</div>
            <!-- 文字速度 -->
            <div class="text-2.4vh font-bold text-white/90 mb-1.2vh">{{ L('textSpeed') }}</div>
            <div class="flex items-center gap-x-3vw">
              <span class="text-2vh text-white/60 w-6vh">{{ L('slow') }}</span>
              <el-slider v-model="user.text_speed" :min="90" :max="99" class="flex-1!"
                @change="onTextSpeedChange" />
              <span class="text-2vh text-white/60 w-6vh">{{ L('fast') }}</span>
            </div>
            <!-- 总音量 -->
            <div class="text-2.4vh font-bold text-white/90 mb-1.2vh mt-3vh">{{ L('volume') }}</div>
            <div class="flex items-center gap-x-3vw">
              <span class="text-2vh text-white/60 w-6vh">{{ L('low') }}</span>
              <el-slider v-model="user.volume" :min="0" :max="0.7" :step="0.05" class="flex-1!"
                @change="onVolumeChange" />
              <span class="text-2vh text-white/60 w-6vh">{{ L('high') }}</span>
            </div>
            <!-- 语言 -->
            <div class="text-2.4vh font-bold text-white/90 mb-1.2vh mt-3vh">{{ L('language') }}</div>
            <div class="flex gap-x-2vw">
              <el-button :type="getLang() === 'zh' ? 'primary' : 'default'" size="large" class="flex-1!"
                @click="switchLang('zh')">中文</el-button>
              <el-button :type="getLang() === 'en' ? 'primary' : 'default'" size="large" class="flex-1!"
                @click="switchLang('en')">English</el-button>
            </div>
            <!-- ⚡ 性能模式（公共组件，与游戏内设置共用） -->
            <PerfModeSwitch />
          </div>
        </el-dialog>
        <!-- 🎮 开始游戏前的模式选择：普通模式（选角色直接进地牢） / 剧情模式（填名字进剧情） -->
        <transition name="fade">
          <div v-if="showModeSelect"
            class="fixed inset-0 z-998 bg-black/85 backdrop-blur-sm flex items-center justify-center"
            @click.self="cancelModeSelect">
            <div
              class="w-74vw max-w-115vh bg-gradient-to-b from-#1c1c30/95 to-#0d0d1a/95 border border-white/15 rounded-4 px-6vw py-7vh shadow-2xl flex flex-col items-center">
              <div class="text-white iconfont2 text-5vh font-bold tracking-[0.5vw] mb-1.5vh select-none">
                选择游戏模式
              </div>
              <div class="flex flex-col w-full gap-y-2.5vh">
                <div
                  class="mode-btn iconfont2 px-5vw py-2.6vh rounded-2 bg-white/8 border border-white/15 hover:bg-white/15 hover:border-#ff9a56 cursor-pointer select-none transition-all text-center"
                  @click="chooseNormalMode">
                  <div class="text-white font-bold text-3vh"> 普通模式</div>
                  <div class="text-white/50 text-2.2vh mt-0.8vh">选择角色，进入战斗</div>
                </div>
                <div
                  class="mode-btn iconfont2 px-5vw py-2.6vh rounded-2 bg-white/4 border border-white/8 cursor-not-allowed select-none transition-all text-center opacity-50"
                  title="剧情模式暂未开放">
                  <div class="text-white font-bold text-3vh"> 剧情模式</div>
                  <div class="text-white/50 text-2.2vh mt-0.8vh">填写姓名，体验剧情（暂未开放）</div>
                </div>
              </div>
              <div class="flex mt-5vh">
                <div
                  class="name-btn iconfont2 px-5vw py-1.8vh text-2.8vh rounded-full bg-white/10 text-white/80 border border-white/15 hover:bg-white/20 cursor-pointer select-none transition-all"
                  @click="cancelModeSelect">取消</div>
              </div>
            </div>
          </div>
        </transition>
        <!-- 🎭 开始游戏前的角色选择：横向 4 角色立绘 -->
        <transition name="fade">
          <div v-if="showRoleSelect"
            class="fixed inset-0 z-998 bg-black/85 backdrop-blur-sm flex items-center justify-center "
            @click.self="cancelRoleSelect">
            <div
              class="w-90vw h-90vh box-border  bg-gradient-to-b from-#1c1c30/95 to-#0d0d1a/95 border border-white/15 rounded-4 px-3vw py-4vh shadow-2xl flex flex-col items-center relative overflow-hidden">
              <div
                class="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[0.5vh] bg-gradient-to-r from-transparent via-#ff9a56 to-transparent"></div>
              <div class="text-white iconfont2 text-5vh font-bold tracking-[0.5vw] mb-1.5vh select-none">
                {{ L('roleTitle') }}
              </div>

              <div class="flex flex-1 min-h-0 w-full items-start justify-center gap-x-3vw overflow-y-auto">
                <!-- ⬅️ 左栏：角色立绘走马灯（卡片模式，点两侧直接切换） -->
                <div class="w-74vw">
                  <el-carousel class="role-select-carousel" height="62vh" type="card" :autoplay="false" arrow="always" :loop="false"
                    indicator-position="none" :initial-index="1" @change="(i) => onRoleCarouselChange(i)">
                    <el-carousel-item v-for="(r, i) in ROLE_OPTIONS" :key="r.id">
                      <div class="flex items-center justify-center h-full">
                        <div class="role-card relative flex flex-col items-center gap-1.2vh rounded-3 p-2.5vh cursor-pointer select-none border bg-transparent transition-all duration-200" style="width:min(36vh,24vw)"
                          :class="isRoleLocked(r.id)
                            ? 'border-white/10'
                            : (selectedRoleId === r.id
                              ? 'border-#ff9a56 shadow-[0_0_3.5vh_rgba(255,154,86,0.35)]'
                              : 'border-white/12 hover:border-white/25 hover:scale-[1.02]')"
                          @click="onSelectRole(r)">
                          <!-- 角色名徽章 -->
                          <div class="absolute top-1.5vh left-1/2 -translate-x-1/2 z-20 px-2.5vh py-0.8vh rounded-full bg-black/50 border border-white/15 backdrop-blur-sm flex items-center gap-x-1vh whitespace-nowrap"
                            :class="isRoleLocked(r.id) ? 'opacity-60' : ''">
                            <span class="w-1.5vh h-1.5vh rounded-full" :style="{ background: (NPC_NAME_COLORS[r.id] || '#fff'), boxShadow: '0 0 1vh ' + (NPC_NAME_COLORS[r.id] || '#fff') }"></span>
                            <span class="text-2.4vh font-bold iconfont2 leading-none" :style="{ color: (NPC_NAME_COLORS[r.id] || '#fff') }">{{ roleCfg(r.id)?.name }}</span>
                          </div>
                          <!-- 🎭 Q 版 spine idle 立绘（缩放进格，居中；格子内不显示任何文字） -->
                          <div :ref="el => setRoleCanvas(r.id, el)" class="h-[50vh] flex items-center justify-center p-[2vh] rounded-2 overflow-hidden" style="width:min(30vh,20vw); background: transparent"
                            :class="isRoleLocked(r.id) ? 'grayscale opacity-50' : ''"></div>
                          <!-- 🏆 局外养成：角色永久等级与经验（失败结算、跨局保留、升级提升初始属性） -->
                          <div class="w-full flex flex-col items-center gap-0.7vh mt-0.8vh" style="width:min(30vh,20vw)">
                            <div class="flex items-center justify-between w-full">
                              <span class="text-2vh font-bold leading-none" :style="{ color: (NPC_NAME_COLORS[r.id] || '#fff') }">Lv.{{ metaLv(r.id) }}</span>
                              <span class="text-1.7vh text-white/60 leading-none">{{ metaExp(r.id) }}/{{ metaNeed(r.id) }}</span>
                            </div>
                            <div class="w-full h-1.5vh rounded-full bg-white/10 overflow-hidden">
                              <div class="h-full rounded-full bg-gradient-to-r from-#ffd28a to-#ff9a56 transition-all duration-300"
                                :style="{ width: metaExpPct(r.id) + '%' }"></div>
                            </div>
                          </div>
                          <!-- 🔒 未解锁遮罩（dladmin 角色初始可编辑 unlocked） -->
                          <div v-if="isRoleLocked(r.id)"
                            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1vh rounded-3 bg-black/40">
                            <span class="text-5vh">🔒</span>
                            <span class="text-2.2vh font-bold text-white/85">未解锁</span>
                          </div>
                        </div>
                      </div>
                    </el-carousel-item>
                  </el-carousel>
                </div>
                <!-- ➡️ 右栏：当前选中角色的初始配置（ROLE_INIT_CONFIGS，dladmin 可编辑） -->
                <div v-if="selectedRole" class="w-[33%] text-left rounded-3 p-3vh flex flex-col gap-1.5vh max-h-[58vh] overflow-y-auto pb-3vh bg-gradient-to-br from-#241c33/90 to-#14101f/90 border border-#ffd28a/25 shadow-[0_0_3vh_rgba(255,210,138,0.12)] [&::-webkit-scrollbar]:w-[0.6vh] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-#3d2c63 [&::-webkit-scrollbar-track]:bg-transparent">
                  <!-- 角色名 + 状态徽章 -->
                  <div class="flex items-center gap-x-1.5vh">
                    <div class="w-1vh h-4.5vh rounded-full bg-gradient-to-b from-#ffd28a to-#ff9a56"></div>
                    <span class="text-white iconfont2 text-3.6vh font-bold" :style="{ color: (NPC_NAME_COLORS[selectedRole.id] || '#fff') }">{{ selectedRole.name }}</span>
                    <span v-if="!isRoleLocked(selectedRole.id)" class="ml-auto text-1.8vh px-2vh py-0.6vh rounded-full bg-#ff9a56/15 text-#ffd28a border border-#ff9a56/40">可选</span>
                    <span v-else class="ml-auto text-1.8vh px-2vh py-0.6vh rounded-full bg-white/10 text-white/60 border border-white/20">未解锁</span>
                  </div>
                  <div v-if="!isRoleLocked(selectedRole.id)" class="flex flex-col gap-1.5vh ">
                    <!-- 🎲 初始卡牌（开局随机：普通 65% / 优秀 35%，优秀最多 5 张，共 10 张可无限随机；林恩专属被动 +5） -->
                    <div>
                      <div class="flex items-center justify-between mb-0.8vh">
                        <span class="flex items-center gap-x-1vh">
                          <span class="text-2vh text-white/50 tracking-wider">初始卡牌</span>
                          <span v-if="selectedRole.id === 'linen'"
                            class="text-1.5vh px-1vh py-0.2vh rounded-full bg-#c084fc/20 border border-#c084fc/40 text-#d8b4fe">专属被动 +5</span>
                        </span>
                        <span
                          class="text-1.8vh px-1.5vh py-0.4vh rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white cursor-pointer select-none transition-all"
                          @click="rerollRoleState(selectedRole.id)">🎲 随机</span>
                      </div>
                      <div class="grid grid-cols-5 gap-x-1vh gap-y-1.2vh">
                        <span v-for="(cd, i) in getRoleRerollState(selectedRole.id).deck" :key="i"
                          class="px-0.5vh py-0.8vh rounded-lg border text-2.2vh text-center truncate cursor-pointer select-none transition-all hover:scale-105"
                          :class="cardRarity(cd) === 'excellent'
                            ? 'bg-#ffd28a/12 border-#ffd28a/40 text-#ffd28a hover:bg-#ffd28a/25'
                            : 'bg-white/8 border-white/12 text-white/90 hover:bg-white/18'"
                          @click="openCardDetail(cd)">{{ cd }}</span>
                      </div>
                    </div>
                    <!-- 属性 2 列网格 -->
                    <div class="grid grid-cols-2 gap-x-1.5vh gap-y-1.2vh">
                      <div v-for="at in roleAttrList(selectedRole.id)" :key="at.k"
                        class="flex items-center gap-x-1vh bg-white/6 rounded-lg px-1.5vh py-1vh border border-white/10">
                        <img :src="roleAttrImg(at.icon)" class="w-3.2vh h-3.2vh" />
                        <span class="text-white/55 text-2.2vh">{{ at.label }}</span>
                        <span class="ml-auto text-white font-bold text-2.4vh">{{ at.value }}</span>
                      </div>
                    </div>
                    <!-- 天赋点 / 自由属性点 双卡 -->
                    <div class="flex flex-nowrap gap-x-1.5vh mt-0.5vh">
                      <div class="flex-1 bg-#ff9a56/10 border border-#ff9a56/25 rounded-xl py-1.2vh text-center flex justify-center gap-x-5% ">
                        <div class="text-2.6vh text-#ffd28a/75">天赋点</div>
                        <div class="text-3.2vh font-bold text-#ffd28a leading-tight">{{ getRoleRerollState(selectedRole.id).talentPoints }}</div>
                      </div>
                      <div class="flex-1 bg-#7dd3fc/10 border border-#7dd3fc/25 rounded-xl py-1.2vh text-center flex justify-center gap-x-5% ">
                        <div class="text-2.6vh text-#7dd3fc/75">自由属性点</div>
                        <div class="text-3.2vh font-bold text-#7dd3fc leading-tight">{{ getRoleRerollState(selectedRole.id).freeAttrPoints }}</div>
                      </div>
                    </div>
                    <!-- 🃏 角色专属被动说明（底部独立区块） -->
                    <div v-if="rolePassive(selectedRole.id)" class="mt-0.5vh">
                      <div class="text-2vh text-white/50 tracking-wider mb-0.8vh">专属被动</div>
                      <div class="rounded-xl px-2vh py-1.5vh bg-#c084fc/10 border border-#c084fc/30 text-#d8b4fe text-2vh leading-relaxed">
                        {{ rolePassive(selectedRole.id) }}
                      </div>
                    </div>
                    <!-- ✅ 确认角色：位于专属被动下方（普通模式选角后直接进地牢） -->
                    <div class="flex justify-center mt-2.5vh">
                      <div class="name-btn iconfont2 px-6vw py-1.8vh text-2.8vh rounded-full bg-gradient-to-r from-#ff9a56 to-#ff6b6b text-white font-bold shadow-lg hover:opacity-85 cursor-pointer select-none transition-all"
                        @click="confirmRole">{{ L('confirmRole') }}</div>
                    </div>
                  </div>
                  <div v-else class="flex flex-col items-center justify-center gap-1.5vh py-6vh text-white/50">
                    <span class="text-6vh">🔒</span>
                    <span class="text-2.6vh">该角色暂未解锁</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </transition>
        <!-- 🎭 开始游戏前的玩家姓名输入：全屏黑幕 + 居中卡片 -->
        <transition name="fade">
          <div v-if="showNameInput"
            class="fixed inset-0 z-998 bg-black/85 backdrop-blur-sm flex items-center justify-center"
            @click.self="cancelNameInput">
            <div
              class="w-74vw max-w-120vh bg-gradient-to-b from-#1c1c30/95 to-#0d0d1a/95 border border-white/15 rounded-4 px-7vw py-8vh shadow-2xl flex flex-col items-center">
              <div class="text-white iconfont2 text-5vh font-bold tracking-[0.5vw] mb-1.5vh select-none">
                {{ L('nameTitle') }}
              </div>
              <div class="text-white/55 iconfont2 text-2.4vh mb-6vh select-none">
                {{ L('nameSubtitle') }}
              </div>
              <input
                ref="nameInputRef"
                v-model="playerNameInput"
                maxlength="8"
                :placeholder="L('namePlaceholder')"
                class="name-input w-50vw max-w-90vh h-7.5vh bg-white/10 border border-white/25 rounded-full px-4vw text-white iconfont2 text-3.2vh text-center outline-none placeholder-white/35 focus:border-#ff9a56 focus:bg-white/15 transition-all duration-300"
                @keyup.enter="confirmName" />
              <div class="flex gap-x-4vw mt-6vh">
                <div
                  class="name-btn iconfont2 px-5vw py-1.8vh text-2.8vh rounded-full bg-white/10 text-white/80 border border-white/15 hover:bg-white/20 cursor-pointer select-none transition-all"
                  @click="cancelNameInput">{{ L('cancel') }}</div>
                <div
                  class="name-btn iconfont2 px-6vw py-1.8vh text-2.8vh rounded-full bg-gradient-to-r from-#ff9a56 to-#ff6b6b text-white font-bold shadow-lg hover:opacity-85 cursor-pointer select-none transition-all"
                  @click="confirmName">{{ L('startAdventure') }}</div>
              </div>
            </div>
          </div>
        </transition>
        <!-- 📖 图鉴 -->
        <TuJian v-if="showTujian" @close="closeTujian" />
        <!-- 🃏 初始卡牌详情（点击卡牌 chip 弹出：Spine 卡面 + 灵力消耗 + 卡牌名称 + 说明） -->
        <transition name="fade">
          <div v-if="cardDetailCard" class="fixed inset-0 z-9999 bg-black/85 backdrop-blur-sm flex items-center justify-center"
            @click.self="closeCardDetail">
            <div class="flex flex-col items-center gap-2.5vh">
              <!-- 卡牌容器（130×198，与战斗内卡牌详情一致） -->
              <div class="w-[130px] h-[198px] relative rounded-lg overflow-hidden bg-black/40 border border-white/20 shadow-[0_0_4vh_rgba(0,0,0,0.6)]">
                <!-- Spine 卡面 -->
                <div ref="cardDetailSpineContainer" class="absolute inset-0"></div>
                <!-- 卡牌名称（顶部居中，跟随卡牌配色） -->
                <div class="absolute top-[7px] w-full text-center text-[20px] iconfont2 leading-tight px-1 truncate"
                  :style="{ color: cardDetailColor, textShadow: '0 0 2px #000, 0 0 4px #000, 0 1px 2px rgba(0,0,0,0.5)' }">{{ cardDetailCard }}</div>
                <!-- 灵力消耗（左上角） -->
                <div class="absolute top-[8px] left-[10px] text-[20px] font-bold text-blue-400 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">{{ cardDetailCost }}</div>
              </div>
              <!-- 卡牌说明 -->
              <div class="text-3.4vh text-white/85 max-w-70vw text-center leading-relaxed px-4vh" v-html="cardDetailDesc"></div>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Application } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { useCounterStore, DUNGEON_KEYS } from "@/store/counter";
import { Assets } from "pixi.js";
import { loadAssets } from "./loadAssets";
import LoadingSpine from "@/components/LoadingSpine.vue";
import { createCardSpine } from "@/pages/pixi/fight/CardSpine.js";
import router from "@/router";
import { ElMessageBox } from 'element-plus';
import { ElMessText } from "@/pages/zujian/utils.js";
import { updateSetting } from "@/pages/storage";
import { t as i18nT, getLang, setLang } from "@/i18n";
import TuJian from "./TuJian.vue";
import PerfModeSwitch from "./PerfModeSwitch.vue";
import { ROLE_INIT_CONFIGS, NPC_NAME_COLORS, META_ROLE_CFG, DEFAULT_CARD_DATA } from "@/store/configs.js";
import emitter from "@/bus";
// 🎭 开局角色选择：4 名可选角色的全身立绘（zhujue=林恩 / jinmao=晨曦 / yu=云弥 / huli=西亚）
import roleImgLinen from "@/assets/fullBody/fullbody/zhujue01.webp";
import roleImgJinmao from "@/assets/fullBody/fullbody/jinmao01.webp";
import roleImgYu from "@/assets/fullBody/fullbody/yu01.webp";
import roleImgHuli from "@/assets/fullBody/fullbody/huli01.webp";

const user = useCounterStore();
const startSelect = reactive({
  index: 0,
  animationFinished: false,
});

// ⚙️ 设置弹窗（文字速度 / 音量 / 语言切换）
const settingsVisible = ref(false);
const langVersion = ref(0);
function L(key) { langVersion.value; return i18nT(key); }
window.addEventListener("fvnyouxi-lang-changed", () => langVersion.value++);
async function onTextSpeedChange(v) {
  try { await updateSetting("text_speed", v); } catch (e) { /* ignore */ }
}
async function onVolumeChange(v) {
  user.applyVolume(v);
  try { await updateSetting("volume", v); } catch (e) { /* ignore */ }
}
function switchLang(l) { setLang(l); }


const showTujian = ref(false); // 📖 图鉴开关

// 💾 读取游戏：唯一存档直接进入之前的游戏（不再弹窗选档）
function enterLoadGame() {
  if (user.hasAutoSave()) {
    user.setPendingLoadSlot(null); // 读自动存档（最近进度）
    router.push({ name: 'matter' });
    user.playBgm('senlin');
    return;
  }
  // 🧹 旧版本手动档兜底迁移：无自动存档但存在历史档位时，读取第一个非空档位
  const legacy = user.getFirstLegacySlot();
  if (legacy >= 0) {
    user.setPendingLoadSlot(legacy);
    router.push({ name: 'matter' });
    user.playBgm('senlin');
    return;
  }
  ElMessText(L('noSave')); // 无存档：提示后留在主菜单
}

// 🎭 开局角色选择（开始游戏前）：横向 4 角色
const ROLE_OPTIONS = [
  { id: 'jinmao', name: '晨曦', juese: 'jinmao', img: roleImgJinmao, desc: L('roleDescJinmao') },
  { id: 'linen', name: '林恩', juese: 'linen', img: roleImgLinen, desc: L('roleDescLinen') },
  { id: 'yu', name: '云弥', juese: 'yu', img: roleImgYu, desc: L('roleDescYu') },
  { id: 'huli', name: '西亚', juese: 'huli', img: roleImgHuli, desc: L('roleDescHuli') },
];
const showRoleSelect = ref(false);
const selectedRoleId = ref('linen');
const selectedRole = computed(() => ROLE_OPTIONS.find(r => r.id === selectedRoleId.value));
const roleSelectOpenedAt = ref(0);

// 🎮 开始游戏模式选择（普通模式：选角色直接进地牢；剧情模式：填名字进剧情）
const showModeSelect = ref(false);
const modeSelectOpenedAt = ref(0);
let storyMode = false; // 当前新游戏是否剧情模式
function openModeSelect() {
  showModeSelect.value = true;
  modeSelectOpenedAt.value = Date.now();
}
function cancelModeSelect() {
  if (Date.now() - modeSelectOpenedAt.value < 500) return;
  showModeSelect.value = false;
}
function chooseNormalMode() {
  storyMode = false;
  showModeSelect.value = false;
  openRoleSelect(); // 普通模式：先选角色，确认后直接新开
}
function chooseStoryMode() {
  return; // 🔒 剧情模式暂未开放：封锁入口（按钮已置灰，此处兜底拦截误调）
  storyMode = true;
  showModeSelect.value = false;
  openNameInput(''); // 剧情模式：不选角色，直接填名字（主角为默认林恩）
}

// 🎭 角色 Q 版 spine 实时动画：每个卡片一个轻量 Application，循环播放 idle
const roleApps = {};   // roleId → Application
const roleSpines = {}; // roleId → Spine（销毁时清理）
const roleCanvasSet = {}; // 已挂载 canvas 的角色（防止 ref 重复创建）
const roleEls = {};    // roleId → 立绘容器 DOM（resize 重算用）
let roleResizeBound = false; // resize 监听只绑一次

/** canvas ref 回调：卡片挂载后创建动画 */
function setRoleCanvas(roleId, el) {
  if (!el || roleCanvasSet[roleId]) return;
  roleCanvasSet[roleId] = true;
  roleEls[roleId] = el;
  createRoleAnim(roleId, el);
}

async function createRoleAnim(roleId, el) {
  const juese = ROLE_OPTIONS.find(r => r.id === roleId)?.juese;
  if (!juese) return;
  const skel = juese + '_skel', atlas = juese + '_atlas';
  try {
    if (!Assets.cache.has(skel) || !Assets.cache.has(atlas)) return;
    const w = el.clientWidth || 260, h = el.clientHeight || 260;
    const app = new Application();
    await app.init({ width: w, height: h, backgroundAlpha: 0, antialias: false, autoDensity: true, resolution: 2 });
    el.appendChild(app.canvas);
    // 🔒 autoUpdate: false + 绑定 app 自己的 ticker：不挂全局 Ticker.shared（无人启动会静止）
    const spine = new Spine({ skeleton: skel, atlas, allowMissingRegions: true, autoUpdate: false });
    const skeleton = spine.skeleton;
    const realSkins = (skeleton.data.skins || []).filter(v => v.name !== 'default');
    if (realSkins.length) skeleton.setSkin(realSkins[0]);
    spine.state.setAnimation(0, 'idle', true); // 🔁 无限循环 idle
    spine.update(0.05);
    // 🎯 立绘大小统一口径（参考主界面 createSpine）：目标高度 = min(屏幕高, 1080) × 44%
    //    屏幕高度 ≥1080 时角色尺寸固定一致；小屏按比例缩小适配，避免不同屏幕显示大小不一
    applyRoleSize(spine, w, h);
    app.stage.addChild(spine);
    // ⏱ deltaMS/1000 转秒驱动（v8 deltaTime 是无量纲标量，直接传会超速抽搐）
    app.ticker.add((delta) => { spine.update(delta.deltaMS / 1000); });
    roleApps[roleId] = app;
    roleSpines[roleId] = spine;
    roleEls[roleId] = el;
    bindRoleResize();
  } catch (e) {
    console.warn('[角色选择] Q版动画创建失败:', roleId, e);
  }
}

/** 🎯 立绘尺寸统一计算（所有屏幕不裁剪）：
 *    高度目标 = min(屏幕高, 1080) × 43%（vh 统一口径，上下留足动画摆动余量）；
 *    宽度上限 = 容器宽 × 72%（左右各留 14% 余量，防尾巴/耳朵/挥手等 idle 动画摆出画布）。
 *    两者取最小：常规体型高度主导、多屏大小一致；极端宽体自动收窄，任何屏幕完整显示 */
function applyRoleSize(spine, w, h) {
  const b = spine.getLocalBounds();
  const bh = (b && b.height > 0) ? b.height : 1;
  const bw = (b && b.width > 0) ? b.width : 1;
  const s = Math.min((Math.min(window.innerHeight, 1080) * 0.43) / bh, (w * 0.72) / bw, (h * 0.8) / bh);
  spine.scale.set(s);
  spine.x = w / 2 - (b.x + b.width / 2) * s;
  spine.y = h / 2 - (b.y + b.height / 2) * s;
}

/** 窗口尺寸变化（跨屏拖动 / 缩放）后即时重算立绘大小 */
function onRoleResize() {
  for (const [id, spine] of Object.entries(roleSpines)) {
    const el = roleEls[id];
    if (el) applyRoleSize(spine, el.clientWidth || 140, el.clientHeight || 497);
  }
}
function bindRoleResize() {
  if (roleResizeBound) return;
  roleResizeBound = true;
  window.addEventListener('resize', onRoleResize);
}
function unbindRoleResize() {
  if (!roleResizeBound) return;
  roleResizeBound = false;
  window.removeEventListener('resize', onRoleResize);
}

/** 销毁全部角色动画（关弹窗 / 重开 / 卸载时调用，避免 WebGL 上下文泄漏） */
function destroyRoleAnims() {
  unbindRoleResize();
  for (const k of Object.keys(roleApps)) {
    try { roleApps[k].destroy({ children: true, texture: false, textureSource: false, releaseGlobalResources: false }); } catch (e) { /* ignore */ }
  }
  for (const k of Object.keys(roleApps)) delete roleApps[k];
  for (const k of Object.keys(roleSpines)) delete roleSpines[k];
  for (const k of Object.keys(roleCanvasSet)) delete roleCanvasSet[k];
  for (const k of Object.keys(roleEls)) delete roleEls[k];
}

// 📜 选中角色说明（初始卡牌 / 属性点 / 天赋点，来自 ROLE_INIT_CONFIGS，dladmin 可编辑）
const selectedRoleInfo = computed(() => ROLE_INIT_CONFIGS[selectedRoleId.value] || null);
function roleCfg(roleId) { return ROLE_INIT_CONFIGS[roleId] || null; }
/** 🔓 角色是否未解锁（dladmin 角色初始可编辑 unlocked；主角默认解锁） */
function isRoleLocked(rid) { return !(ROLE_INIT_CONFIGS[rid]?.unlocked); }
function roleAttrOf(roleId, k) { return getRoleRerollState(roleId).attrs[k] ?? 0; }
// 🖼️ 属性图标（与游戏内个人面板同款图片：src/assets/daoju/{src}.webp）
const roleAttrImg = (src) => new URL(`../assets/daoju/${src}.webp`, import.meta.url).href;

/** 📋 角色初始配置的属性列表（图标 + 名称 + 数值，供右栏 2 列网格渲染） */
function roleAttrList(rid) {
  return [
    { k: 'strength', icon: 'liliang', label: '力量', value: roleAttrOf(rid, 'strength') },
    { k: 'intelligence', icon: 'zhihui', label: '智慧', value: roleAttrOf(rid, 'intelligence') },
    { k: 'elementMastery', icon: 'jingtong', label: '元素精通', value: roleAttrOf(rid, 'elementMastery') },
    { k: 'charm', icon: 'meili', label: '魅力', value: roleAttrOf(rid, 'charm') },
    { k: 'baseAttack', icon: 'Attack', label: '攻击', value: roleAttrOf(rid, 'baseAttack') },
    { k: 'baseArmor', icon: 'Armor', label: '护甲', value: roleAttrOf(rid, 'baseArmor') },
    { k: 'baseMagicResist', icon: 'MR', label: '魔抗', value: roleAttrOf(rid, 'baseMagicResist') },
    { k: 'baseSpeed', icon: 'Speed', label: '速度', value: roleAttrOf(rid, 'baseSpeed') },
  ];
}

// =====================================================
// 🎲 开局随机：只随机初始卡牌（选择角色界面可无限随机）；属性 / 天赋点 / 自由属性点固定不随机（沿用角色配置）
//   卡牌：普通 65% / 优秀 35%；优秀最多 5 张；仅普通/优秀品质（不含稀有以上）；
//         🃏 林恩专属被动：初始卡牌 +5（15 张）；随机池与抽卡卡池口径一致（排除 canDraw:false）
// =====================================================
const REROLL_DECK_SIZE = 10;      // 默认初始卡牌 10 张
const REROLL_LINEN_DECK_SIZE = 15; // 🃏 林恩专属被动：初始卡牌 +5
const REROLL_MAX_EXCELLENT = 5;   // 优秀牌上限 5 张
const REROLL_COMMON_RATE = 0.65;  // 普通牌概率 65%（优秀 35%）
const rerollStates = reactive({}); // roleId → { deck, attrs, talentPoints, freeAttrPoints }（切角色各自保留；重开角色选择清空）

/** 🎴 随机池：普通/优秀品质的可抽取卡牌（排除 canDraw:false，与抽卡卡池口径一致） */
function buildRerollPool() {
  const cardData = user.pixi?.player?.CARD_DATA || DEFAULT_CARD_DATA;
  const pool = { common: [], excellent: [] };
  Object.entries(cardData).forEach(([name, data]) => {
    if (!data) return;
    if (data.canDraw === false) return;
    const r = data.rarity || 'common';
    if (r === 'common' || r === 'excellent') pool[r].push(name);
  });
  return pool;
}

/** 🃏 角色初始卡牌数量（林恩专属被动 +5，其余 10 张） */
function roleDeckSize(roleId) {
  return roleId === 'linen' ? REROLL_LINEN_DECK_SIZE : REROLL_DECK_SIZE;
}

/** 🎰 生成一组随机初始卡牌（普通 65% / 优秀 35%；优秀 ≤ 5） */
function rollInitialDeck(roleId) {
  const pool = buildRerollPool();
  const deck = [];
  let excellentCount = 0;
  for (let i = 0; i < roleDeckSize(roleId); i++) {
    // 优秀已达上限 → 强制普通；否则按 65/35 概率随机
    let rarity = excellentCount >= REROLL_MAX_EXCELLENT
      ? 'common'
      : (Math.random() < REROLL_COMMON_RATE ? 'common' : 'excellent');
    let poolArr = pool[rarity] || [];
    // 该品质无可用卡 → 回退到另一品质（正常池子不会为空，兜底保护）
    if (!poolArr.length) {
      const alt = rarity === 'common' ? 'excellent' : 'common';
      poolArr = pool[alt] || [];
      if (!poolArr.length) break; // 池子全空：无法继续生成
    }
    const name = poolArr[Math.floor(Math.random() * poolArr.length)];
    deck.push(name);
    if (rarity === 'excellent') excellentCount++;
  }
  return deck;
}

/** 🎲 随机开局初始卡牌（卡牌独立随机；属性 / 天赋点 / 自由属性点固定沿用角色配置） */
function buildRoleRerollState(roleId) {
  const cfg = ROLE_INIT_CONFIGS[roleId] || {};
  return {
    deck: rollInitialDeck(roleId),          // 🃏 只有卡牌参与随机
    attrs: cfg.attrs || {},                 // ⚔️ 属性固定不随机（沿用角色配置）
    talentPoints: cfg.talentPoints ?? 0,    // 🎯 天赋点固定
    freeAttrPoints: cfg.freeAttrPoints ?? 0, // 🎯 自由属性点固定
  };
}

/** 🎲 重新随机当前角色的初始卡牌（属性/天赋点/自由属性点固定，无限随机，点击按钮触发） */
function rerollRoleState(roleId) {
  rerollStates[roleId] = buildRoleRerollState(roleId);
}

/** 📋 读取角色当前的随机开局配置；未生成时先生成一组 */
function getRoleRerollState(roleId) {
  if (!rerollStates[roleId]) rerollStates[roleId] = buildRoleRerollState(roleId);
  return rerollStates[roleId];
}

/** ⭐ 卡牌品质（普通 common / 优秀 excellent），用于初始卡牌 chips 着色 */
function cardRarity(name) {
  const d = (user.pixi?.player?.CARD_DATA || DEFAULT_CARD_DATA)[name];
  return d?.rarity || 'common';
}

/** 🃏 角色专属被动说明（右栏底部单独展示；后续角色有被动时在此追加） */
const ROLE_PASSIVES = {
  linen: '开局初始卡牌 +5：初始卡牌数量由 10 张提升至 15 张。',
};

/** 📜 读取角色专属被动说明（无被动返回空串） */
function rolePassive(roleId) {
  return ROLE_PASSIVES[roleId] || '';
}

// ==================== 🃏 初始卡牌详情弹窗（点击卡牌 chip：Spine 卡面 + 灵力消耗 + 名称 + 说明） ====================
const cardDetailCard = ref(null);            // 当前查看的卡牌名
const cardDetailSpineContainer = ref(null);
let cardDetailSpine = null;                  // Spine 实例（关闭时销毁）
const cardDetailColor = computed(() => {
  const d = cardDetailCard.value ? (user.pixi?.player?.CARD_DATA || DEFAULT_CARD_DATA)[cardDetailCard.value] : null;
  return d?.color || '#ffffff';
});
/** 💧 灵力消耗（初始卡牌均为 1 星 → 数组取第 1 档，与战斗内卡牌详情口径一致） */
const cardDetailCost = computed(() => {
  const name = cardDetailCard.value;
  const d = name ? (user.pixi?.player?.CARD_DATA || DEFAULT_CARD_DATA)[name] : null;
  if (!d) return 0;
  if (Array.isArray(d.cost)) return d.cost[0] ?? 0;
  return d.cost ?? 0;
});
/** 📖 卡牌说明：读取 CARD_DATA.desc，按 1 星填充 "X/Y/Z%" 三档数值并以金色标注（与战斗内一致） */
const cardDetailDesc = computed(() => {
  const name = cardDetailCard.value;
  const d = name ? (user.pixi?.player?.CARD_DATA || DEFAULT_CARD_DATA)[name] : null;
  if (!d?.desc) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(d.desc).replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(%)?/g, (m, a, b, c, pct) => '<span style="color:#ffb400;font-weight:600">' + [a, b, c][0] + (pct || '') + '</span>');
});
/** 🧹 统一销毁详情 Spine（复用封装） */
async function destroyCardDetailSpine() {
  if (!cardDetailSpine) return;
  try { await cardDetailSpine.destroy(); } catch (e) { console.warn('卡牌详情 Spine 销毁异常', e); }
  cardDetailSpine = null;
  if (cardDetailSpineContainer.value) cardDetailSpineContainer.value.innerHTML = '';
}
/** 🎴 点击卡牌 chip：打开详情弹窗并渲染 Spine 卡面 */
async function openCardDetail(name) {
  if (!name) return;
  cardDetailCard.value = name;
  await nextTick();
  await destroyCardDetailSpine();
  if (!cardDetailSpineContainer.value) return;
  cardDetailSpine = await createCardSpine(name, 130, 198);
  if (cardDetailSpine && cardDetailSpineContainer.value) {
    cardDetailSpineContainer.value.innerHTML = '';
    cardDetailSpineContainer.value.appendChild(cardDetailSpine.canvas);
    await nextTick();
    cardDetailSpine.render();
  }
}
/** 🚪 关闭详情弹窗 */
function closeCardDetail() {
  cardDetailCard.value = null;
  destroyCardDetailSpine();
}

// 🏆 局外养成辅助（metaRoles 跨局保留：失败返回时结算本局经验，升级提升下次开局初始属性）
function metaLv(rid) { return user.metaRoles?.[rid]?.level ?? 1; }
function metaExp(rid) { return user.metaRoles?.[rid]?.exp ?? 0; }
function metaNeed(rid) {
  const lv = metaLv(rid);
  return lv >= META_ROLE_CFG.maxLevel ? 0 : user.metaExpNeed(lv);
}
function metaExpPct(rid) {
  const need = metaNeed(rid);
  if (need <= 0) return 100;
  return Math.min(100, Math.round(metaExp(rid) / need * 100));
}
/** 📈 局外每级固定属性提升数值（META_ROLE_CFG.perLevelStats，dladmin 可编辑） */
function perLv(k) { return META_ROLE_CFG.perLevelStats?.[k] ?? 0; }

/** 点选角色：记录选中 + 切换该卡片说明 popover */
function onSelectRole(r) {
  if (isRoleLocked(r.id)) return; // 🔒 未解锁角色不可选中
  selectedRoleId.value = r.id; // 选中后其初始配置直接内嵌显示在卡片内
  getRoleRerollState(r.id); // 🎲 该角色首次选中时生成随机开局配置（卡牌/属性/点数）
}
/** 🎠 走马灯切换：选中跟随当前展示的角色（锁定角色右栏显示未解锁提示） */
function onRoleCarouselChange(i) {
  const r = ROLE_OPTIONS[i];
  if (!r) return;
  selectedRoleId.value = r.id;
  if (!isRoleLocked(r.id)) getRoleRerollState(r.id); // 🎲 走马灯切换同样生成随机开局配置
}

function openRoleSelect() {
  destroyRoleAnims(); // 清掉上次的动画实例（v-if 重建 canvas，必须重建 app）
  selectedRoleId.value = 'linen'; // 默认林恩
  // 🎲 每次打开角色选择清空上一次的随机开局配置，重新开始随机
  Object.keys(rerollStates).forEach(k => delete rerollStates[k]);
  getRoleRerollState('linen'); // 预生成默认角色（林恩）的随机开局配置
  showRoleSelect.value = true;
  roleSelectOpenedAt.value = Date.now();
}
function cancelRoleSelect() {
  if (Date.now() - roleSelectOpenedAt.value < 500) return;
  closeCardDetail(); // 🃏 关闭可能打开的卡牌详情
  showRoleSelect.value = false;
  destroyRoleAnims();
}
/** 确认角色（普通模式）：记录选择 → 关弹窗 → 直接新开游戏进地牢（不弹姓名输入） */
function confirmRole() {
  if (isRoleLocked(selectedRoleId.value)) return; // 🔒 未解锁角色不可确认
  closeCardDetail(); // 🃏 关闭可能打开的卡牌详情
  showRoleSelect.value = false;
  destroyRoleAnims();
  startNewGame();
}

// 🎭 玩家姓名输入（开始游戏前）
const showNameInput = ref(false);
const playerNameInput = ref('');
const nameInputRef = ref(null);
const nameInputOpenedAt = ref(0); // 🛡️ 姓名框弹出时间戳：防误触取消

/** 打开姓名输入框：预填开局角色名（新游戏）；可留空让玩家自由命名 */
function openNameInput(roleName) {
  // 🚫 NPC/故人名字（含所选角色名）不可作为玩家名：预填空让玩家自定义
  const isForbidden = FORBIDDEN_NAMES.some(f => (roleName || '').toLowerCase().includes(f));
  playerNameInput.value = isForbidden ? '' : (roleName || '');
  showNameInput.value = true;
  nameInputOpenedAt.value = Date.now();
  nextTick(() => {
    nameInputRef.value?.focus?.();
  });
}

function cancelNameInput() {
  // 🛡️ 防误触：弹出 500ms 内的黑幕点击不取消（避免玩家以为"点了没反应"把弹窗点掉）
  if (Date.now() - nameInputOpenedAt.value < 500) return;
  showNameInput.value = false;
}

// 🚫 禁用姓名：主角名 + NPC 名（含拼音/英文，大小写不敏感；含子串即拦截，避免混淆）
const FORBIDDEN_NAMES = [
  '林恩', '晨曦', '西亚', '云弥', '莫奇', '里亚', '风息', '暗影王',
  'linen', 'chenxi', 'xiya', 'yunmi', 'moqi', 'liya', 'fengxi', 'anyingwang',
  '金毛', '狐狸', '鱼', 'jinmao', 'huli',
];
/** 校验姓名：返回错误提示文案，通过返回空串 */
function validateName(name) {
  const n = (name || '').trim();
  if (!n) return L('nameErrEmpty');
  if (/\d/.test(n)) return L('nameErrDigit');
  if (/[^\u4e00-\u9fa5a-zA-Z\s]/.test(n)) return L('nameErrChar');
  const lower = n.toLowerCase();
  if (FORBIDDEN_NAMES.some(f => lower.includes(f))) return L('nameErrNpc');
  return '';
}

/** 确认姓名（剧情模式）：校验 → 保存 → 关闭输入框 → 带剧情标记新开（进入地牢后自动播开场剧情） */
function confirmName() {
  const err = validateName(playerNameInput.value);
  if (err) { ElMessText(err); return; }
  user.setPlayerName(playerNameInput.value);
  showNameInput.value = false;
  startNewGame(storyMode);
}

/** 🆕 开始新游戏时重置地牢探索进度（所有层的迷雾 / 位置 / 已拾取道具全部清空，层数回到第一层） */
function resetDungeonProgress() {
  try {
    // 🏰 统一走 DUNGEON_KEYS（新增层数只改 store 一处）
    DUNGEON_KEYS.forEach(k => localStorage.removeItem(k));
  } catch (e) { /* ignore */ }
  // 🔔 通知地牢组件重置内存态（noRespawn 敌人复活 / 迷雾 / 层数），
  //    即使地牢组件因 v-show 常驻未销毁也能正确重置
  try { emitter.emit('dungeonHardReset'); } catch (e) { /* ignore */ }
}

/** 🆕 开始新游戏：直接新开（不再弹覆盖确认；六格手动档保留，仅清空自动存档与地牢进度） */
/** 🎭 套用所选角色的初始配置（ROLE_INIT_CONFIGS，dladmin「角色初始」可编辑）
 *  @param st 开局随机配置（角色选择界面 🎲 随机生成：deck/attrs/talentPoints/freeAttrPoints）；
 *            传入非空时优先使用，否则回退角色配置 */
function applyRoleInit(roleId, st) {
  const cfg = ROLE_INIT_CONFIGS[roleId];
  if (!cfg) return;
  // 初始卡组：优先使用开局随机卡牌，否则用角色配置
  const deck = st?.deck && st.deck.length ? st.deck : cfg.deck;
  if (Array.isArray(deck) && deck.length) user.pixi.player.deck = [...deck];
  // 🎴 开局赠送：先清零全部卡牌拥有数，再只赠送最终初始卡组（避免角色固定卡组残留——
  //    如「射击/火球/冰箭」没随机到时，resetUser 已赠送的固定卡仍会残留为已拥有）
  for (const [_n, def] of Object.entries(user.pixi.player.CARD_DATA)) { if (def) def.num = 0; }
  if (Array.isArray(deck)) {
    // 🎴 拥有数按卡组实际副本数计（卡组 3 张碎甲弹 = 拥有 3 张），重复卡在下半区每张独立显示
    const cnt = {};
    deck.forEach(n => { cnt[n] = (cnt[n] || 0) + 1; });
    Object.entries(cnt).forEach(([n, c]) => { if (user.pixi.player.CARD_DATA?.[n]) user.pixi.player.CARD_DATA[n].num = c; });
  }
  // 🛡️ 独占卡：仅对应角色可拥有（如双兆=林恩独占；选择其他角色时 num 归零，不出现在已有卡牌）
  for (const [n, def] of Object.entries(user.pixi.player.CARD_DATA)) {
    if (def?.exclusiveRole && def.exclusiveRole !== roleId) def.num = 0;
  }
  // 初始属性（基础值；attack/speed/armor 为派生值保持 null，由战斗统一计算）
  const j = user.pixi.player.juese;
  const a = st?.attrs || cfg.attrs || {};
  if (j) {
    j.strength = a.strength ?? 0;
    j.intelligence = a.intelligence ?? 0;
    j.elementMastery = a.elementMastery ?? 0;
    j.charm = a.charm ?? 0;
    if (a.baseAttack != null) j.baseAttack = a.baseAttack;
    if (a.baseSpeed != null) j.baseSpeed = a.baseSpeed;
    if (a.baseArmor != null) j.baseArmor = a.baseArmor;
    if (a.baseMagicResist != null) j.baseMagicResist = a.baseMagicResist;
  }
  // 天赋点 / 自由属性点
  if (st?.talentPoints != null) user.pixi.player.talentPoints = st.talentPoints;
  else if (cfg.talentPoints != null) user.pixi.player.talentPoints = cfg.talentPoints;
  if (st?.freeAttrPoints != null) user.pixi.player.freeAttrPoints = st.freeAttrPoints;
  else if (cfg.freeAttrPoints != null) user.pixi.player.freeAttrPoints = cfg.freeAttrPoints;
}

/** 🏆 应用局外养成加成：局外等级每级固定提升角色开局初始属性（攻击/生命/速度/护甲/魔抗） */
function applyMetaBonus(roleId) {
  const bonus = user.metaRoleStatBonus(roleId);
  const j = user.pixi?.player?.juese;
  if (!j || !bonus) return;
  j.baseAttack = Math.round((j.baseAttack || 0) + bonus.attack);
  j.baseMaxHp = Math.round((j.baseMaxHp || 0) + bonus.maxHp);
  j.baseSpeed = Math.round((j.baseSpeed || 0) + bonus.speed);
  j.baseArmor = Math.round((j.baseArmor || 0) + bonus.armor);
  j.baseMagicResist = Math.round((j.baseMagicResist || 0) + bonus.magicResist);
}

/** 🎮 开始新游戏：已有存档先弹覆盖确认（element-plus），确认后才真正开始新游戏 */
function startNewGame(withStory = false) {
  // 💾 已有存档（唯一存档或历史档位残留）：提示会覆盖，确认后才执行
  if (user.hasAnySave()) {
    ElMessageBox.confirm(
      L('confirmOverwriteSave'),
      L('notice'),
      {
        confirmButtonText: L('confirm'),
        cancelButtonText: L('cancel'),
        type: 'warning',
        closeOnClickModal: false,
      }
    ).then(() => {
      doStartNewGame(withStory);
    }).catch(() => { /* 取消覆盖：不开始新游戏 */ });
    return;
  }
  doStartNewGame(withStory);
}

/** 🎮 真正执行开始新游戏：普通模式应用所选角色直接进地牢；剧情模式用默认主角并自动播放开场剧情 */
function doStartNewGame(withStory = false) {
  // 🎮 先记录游戏模式（普通=normal / 剧情=story），resetUser 内按模式初始化同伴解锁状态
  user.pixi.gameMode = withStory ? 'story' : 'normal';
  user.resetUser();
  // 🎭 应用角色：剧情模式固定默认主角（林恩），普通模式用所选角色
  const cur = withStory ? ROLE_OPTIONS[0] : ROLE_OPTIONS.find(r => r.id === selectedRoleId.value);
  if (cur) {
    user.pixi.player.role = cur.juese;
    if (user.pixi.player.juese) user.pixi.player.juese.name = cur.name;
    // 🎲 普通模式：开局卡牌/属性/天赋点用角色选择界面的随机结果；剧情模式（暂未开放）用角色固定配置
    const rerollState = withStory ? null : getRoleRerollState(cur.id);
    applyRoleInit(cur.id, rerollState); // 🎭 套用角色初始配置（初始卡组 / 属性 / 天赋点 / 自由属性点）
    applyMetaBonus(cur.id); // 🏆 应用局外养成加成（局外等级提升初始属性）
  }
  resetDungeonProgress(); // 🆕 新游戏重置地牢
  // 📜 普通模式主线任务：提升自己并在 15 天后迎击苏醒的邪魔（第 15 天过天时自动完成）
  if (!withStory) {
    user.addTask({
      id: 'main_demon_awaken',
      name: '邪魔苏醒',
      description: '提升自己并在 15 天后迎击苏醒的邪魔。地牢怪物会随天数与层数变强，抓紧变强。',
      steps: [{ id: 'survive15', desc: '提升实力，撑到第 15 天迎击苏醒的邪魔', target: 15 }],
    }, 'main');
  }
  console.log('新游戏', withStory ? '剧情模式' : '普通模式');
  router.push({ name: "matter" });
  user.stopBgm();
  // 🎬 剧情模式：进入地牢场景后自动触发开场剧情（opening，对话结束即开始探索）
  if (withStory) {
    setTimeout(() => {
      emitter.emit('talkToNpc', { loadData: 'npc/opening', name: 'op01' });
    }, 800);
  }
}

/** 关闭图鉴：同时确保主页 ticker 仍在运行（防御：若被意外停止则恢复背景动画） */
function closeTujian() {
  showTujian.value = false;
  app?.ticker?.start();
}

const info = computed(() => [
  L('startGame'),
  L('loadGame'),
  L('tujian'),
  L('settings'),
]);

const enterBusy = ref(false); // 🖱️ 主菜单按钮忙碌态：防连点 + 点击视觉反馈（不再静默吞点击）


async function enter(index) {
  if (enterBusy.value) return;
  enterBusy.value = true;
  // ⏱️ 提前解锁：任何异常/异步都不会卡死按钮
  setTimeout(() => { enterBusy.value = false; }, 250);

  try {
    user.text = "";
    user.playClickSound();
    if (index === 0) {
      // 🎮 开始游戏：先选模式（普通 / 剧情），普通模式选角色直接进地牢，剧情模式填名字进剧情
      openModeSelect();
    } else if (index === 1) {
      // 💾 读取游戏：唯一存档直接进入之前的游戏（不再弹窗）
      enterLoadGame();
    } else if (index === 2) {
      // 📖 图鉴：打开书籍图鉴（精灵 / 魔物）
      showTujian.value = true;
    } else if (index === 3) {
      // ⚙️ 设置弹窗
      settingsVisible.value = true;
    } else {
      ElMessText(L("notOpen"));
    }
  } catch (e) {
    // 🛡️ 兜底：点击异常不吞掉，250ms 锁由 enter 开头 setTimeout 自动释放
    console.warn('主菜单点击异常:', e);
  }
}

function VW(value) {
  return window.innerWidth * (value / 100);
}

function VH(value) {
  return window.innerHeight * (value / 100);
}

const pixiRef = ref(null);
let app = null;
const progress = ref(0);
const pixiReady = ref(false);

// 存放所有spine实例，统一管理
const spineList = [];

/**
 * 🎬 顺序播放 spine 动画序列（无限循环）：
 *   steps: [{ anim: 动画名, count: 播放次数（数字 或 返回次数的函数，如 () => 5 + rand*4） }]
 *   每个 step 内的动画按 count 重复播放，播完后进入下一个 step；全部播完回到第一个（循环）
 */
function playSequence(spine, steps) {
  let si = 0;
  const go = () => {
    if (si >= steps.length) si = 0; // 全部播完 → 回到第一个（无限循环）
    const s = steps[si];
    let remain = typeof s.count === 'function' ? s.count() : (s.count ?? 1);
    if (remain <= 0) remain = 1;
    const playOne = () => {
      const e = spine.state.setAnimation(0, s.anim, false);
      if (typeof s.speed === 'number') e.timeScale = s.speed; // ⏱️ 该步骤按倍速播放（如 0.6 慢放）
      e.listener = {
        complete: () => {
          remain--;
          if (remain > 0) {
            playOne(); // 同一步骤内继续重复当前动画
          } else {
            si++;
            go(); // 进入下一步骤
          }
        }
      };
    };
    playOne();
  };
  go();
}

/**
 * 优化版创建Spine：移除点击、移除碰撞包围盒计算
 */
function createSpine({
  skeleton,
  atlas,
  width = 20,
  x = 50,
  y = 100,
  bottom, // 🆕 底部贴合偏移（vh）：传值时 spine 底部贴屏幕底部并向上偏移 bottom(vh)；不传则用旧 y 定位
  fullHeight, // 🆕 高度固定（vh）：传值时 spine 高度始终占 fullHeight(vh)，垂直居中（背景铺满整屏高度用）
  animation,
  loop = true,
  sequence,
}) {
  const skelAsset = Assets.get(skeleton);
  const atlasAsset = Assets.get(atlas);
  if (!skelAsset || !atlasAsset) {
    console.error('❌ Spine 资源未加载:', skeleton, atlas);
    return null;
  }

  const spine = new Spine({ skeleton, atlas, allowMissingRegions: true });
  app.stage.addChild(spine);

  // 关闭物理约束继承，保留原有配置
  if (typeof spine.setPhysicsPositionInheritanceFactor === 'function') {
    spine.setPhysicsPositionInheritanceFactor(0, 0);
  }
  if (spine.physicsRotationInheritanceFactor !== undefined) {
    spine.physicsRotationInheritanceFactor = 0;
  }

  // 关闭自动更新！关键优化
  spine.autoUpdate = false;

  app.ticker.addOnce(() => {
    // 🎯 大小由视口高度 vh 决定：不同屏幕高度不同时，spine 按高度比例缩放（横屏尺寸相差不大时大小也接近）；
    //    调整 BASE_H 可控制整体大小档位。
    const BASE_H = 1080; // 基准设计高度（px），可调
    let s;
    let vCenter = null; // fullHeight 模式下记录 bounds 用于垂直居中
    if (fullHeight !== undefined) {
      // 🆕 高度固定：spine 高度始终 = fullHeight(vh)，按高度等比缩放
      spine.update(0); // 先算一帧，让 bounds 可用
      const b = spine.getLocalBounds();
      const bh = (b && b.height > 0) ? b.height : 1;
      s = VH(fullHeight) / bh;
      vCenter = b;
    } else {
      s = (width / 100) * (Math.min(window.innerHeight, BASE_H) / 100);
    }
    spine.scale.set(s);
    spine.x = VW(x);

    if (vCenter) {
      // 🆕 垂直居中：spine 包围盒中心对齐屏幕中心
      spine.y = VH(50) - (vCenter.y + vCenter.height / 2) * s;
    } else if (bottom !== undefined) {
      // 🆕 底部贴合：不管屏幕多高，spine 底边都贴到屏幕底部，再向上偏移 bottom(vh)
      spine.update(0); // 先算一帧，让 bounds 可用
      const b = spine.getLocalBounds();
      const h = (b && b.width > 0) ? (b.y + b.height) * s : 0;
      spine.y = VH(100 - bottom) - h;
    } else {
      spine.y = VH(y);
    }

    if (sequence && sequence.length) {
      playSequence(spine, sequence);
      return;
    }
    const anim = animation || spine.skeleton.data.animations?.[0]?.name;
    if (anim) {
      spine.state.setAnimation(0, anim, loop);
    }

    // ========== 全部删除：交互、点击、包围盒相关代码 ==========
    // 删除 eventMode、pointertap、SkeletonBounds 全部逻辑
  });

  return {
    spine,
    destroy() {
      try {
        app?.stage?.removeChild(spine);
        // 彻底销毁spine资源
        spine.state.clearTracks();
        spine.destroy({ children: true, texture: false, baseTexture: false });
      } catch (e) {
        console.warn('spine destroy error', e);
      }
    }
  };
}

// 全局统一ticker：只执行一次，批量更新所有spine
function globalSpineUpdate(delta) {
  // 关键：标准化时间，还原spine默认播放速度
  const dt = delta.deltaTime * (1 / 60);

  for (const item of spineList) {
    const spine = item.spine;
    if (!spine.visible || !spine.parent) continue;
    spine.update(dt);
  }
}
onMounted(async () => {
  try {
    // 🏃 优先加载加载动画资源（paobuload 两个小文件，先于大资源包，加载页一出现即可循环播放）
    try {
      await Assets.load(['/pixi1/paobuload.skel', '/pixi1/paobuload.atlas']);
    } catch (e) {
      console.warn('[qidong] paobuload 预加载失败', e);
    }
    await loadAssets((value) => {
      progress.value = value !== 100 ? value : 99;
    });

    app = new Application();
    await app.init({
      resizeTo: window,
      // 优化：分辨率固定1，Electron环境不要2倍DPR，性能提升巨大
      resolution: 2,
      autoDensity: true,
      backgroundAlpha: 0,
      antialias: false,
      preserveDrawingBuffer: false, // 不需要截图，关闭缓存
    });

    // 画布禁止触摸拖拽
    app.canvas.style.touchAction = 'none';

    pixiRef.value.appendChild(app.canvas);
    user.playBgm('jiemian1', 0.7);

    // 创建背景spine（bg3 放最底层，铺满整屏高度）
    spineList.push(createSpine({ skeleton: "bg3_skel", atlas: "bg3_atlas", x: 26, fullHeight: 100, animation: 'animation' }));
    // 🎬 主角界面：自定义序列——入场 animation(1次) → animation1 循环 5~8 次 → 退场 animation2(1次) → 回到 animation 无限循环
    spineList.push(createSpine({
      skeleton: "zhujuejiemian_skel",
      atlas: "zhujuejiemian_atlas",
      width: 7, x: 16, bottom: 0,
      sequence: [
        { anim: 'animation',  count: 1, speed: 0.5 },           // 入场动画，只播放一次，0.6 倍速
        { anim: 'animation1', count: () => 2 + Math.floor(Math.random() * 3) }, // 循环动画，随机 5~8 次
        { anim: 'animation2', count: 1, speed: 0.5 },           // 入场+退场动画，只播放一次，0.6 倍速
      ],
    }));
    spineList.push(createSpine({ skeleton: "bg2_skel", atlas: "bg2_atlas", width: 6.5, x: 68, bottom: -5 }));
    spineList.push(createSpine({ skeleton: "bg4_skel", atlas: "bg4_atlas", width: 5.7, x: 73, bottom: -10 }));
    spineList.push(createSpine({ skeleton: "bg1_skel", atlas: "bg1_atlas", width: 6.5, x: 83.2, bottom: -10 }));

    // 注册全局唯一的spine更新函数
    app.ticker.add(globalSpineUpdate);

    pixiReady.value = true;
  } catch (e) {
    console.error('[qidong] 主界面初始化失败:', e);
  }
  // 无论如何都结束加载态，避免加载层常驻导致"路由跳了但没画面"
  progress.value = 100;
});

onBeforeUnmount(() => {
  enterBusy.value = false; // 按钮忙碌态复位（重挂载后保持可点击）
  destroyRoleAnims(); // 🎭 销毁角色选择动画实例
  destroyCardDetailSpine(); // 🃏 销毁卡牌详情 Spine

  // 移除全局ticker监听，防止内存残留
  if(app){
    app.ticker.remove(globalSpineUpdate);
  }

  // 销毁所有Spine实例
  spineList.forEach(item => {
    item?.destroy?.();
  });
  spineList.length = 0;

  if (app) {
    app.ticker.stop();

    if (pixiRef.value && app.canvas) {
      pixiRef.value.removeChild(app.canvas);
    }

    app.destroy({ children: true, texture: true, textureSource: true, releaseGlobalResources: false });
    app = null;
  }
});
</script>

<style scoped>
/* loading */
.fade-enter-active,
.fade-leave-active {
  transition: opacity .5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 游戏 */
.fade-game-enter-active,
.fade-game-leave-active {
  transition:
    opacity 1s ease,
    transform 1s ease;
}

.fade-game-enter-from,
.fade-game-leave-to {
  opacity: 0;

  transform:
    scale(1.02);
}

.percentage-value {
  display: block;
  margin-top: 10px;
  font-size: 28px;
}

.percentage-label {
  display: block;
  margin-top: 10px;
  font-size: 12px;
}

.page {
  position: absolute;

  width: 100vw;
  height: 100vh;

  overflow: hidden;
}

/* 动态背景 */
.page::before {

  content: "";

  position: absolute;

  left: 50%;
  top: 50%;

  /* 故意放大 */
  width: 120%;
  height: 120%;

  background-image: url("@/assets/image/beijing.webp");

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  /* 初始居中 */
  transform:
    translate(-50%, -50%);

  /* 镜头缓慢移动 */
  animation:
    cameraMove 20s linear infinite alternate;

  will-change: transform;
}

/* Pixi层 */
.pixi-wrap {
  position: relative;
  z-index: 2;
}

/* 缓慢镜头移动 */
@keyframes cameraMove {

  0% {
    transform:
      translate(-50%, -50%) translate(-2%, -2%) scale(1);
  }

  25% {
    transform:
      translate(-50%, -50%) translate(2%, -1%) scale(1.02);
  }

  50% {
    transform:
      translate(-50%, -50%) translate(1%, 2%) scale(1.03);
  }

  75% {
    transform:
      translate(-50%, -50%) translate(-2%, 1%) scale(1.01);
  }

  100% {
    transform:
      translate(-50%, -50%) translate(2%, 2%) scale(1.05);
  }
}

/* 高清canvas */
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
<style>
/* 🃏 角色初始配置 popover 深色主题（popover teleport 到 body，需全局样式） */
.role-popover-dark.el-popper {
  background: rgba(20, 22, 40, 0.97) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  padding: 14px 16px;
}
.role-popover-dark .el-popper__arrow::before {
  background: rgba(20, 22, 40, 0.97) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
}
/* 点击角色卡片不出现蓝色 focus 方框 / 移动端触击淡蓝遮罩（tap-highlight 要放基础选择器才在触碰瞬间生效） */
.role-card,
.el-popover__reference,
.el-popover__reference * {
  outline: none !important;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-touch-callout: none !important;
}
.role-card:focus,
.role-card:focus-visible,
.el-popover__reference:focus,
.el-popover__reference:focus-visible,
.el-popover__reference *:focus,
.el-popover__reference *:focus-visible {
  outline: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

/* 🎠 走马灯卡片模式：去掉 Element Plus 默认白底 */
.role-select-carousel .el-carousel__item--card {
  background: transparent;
}
.role-select-carousel .el-carousel__mask {
  background-color: transparent;
}
</style>