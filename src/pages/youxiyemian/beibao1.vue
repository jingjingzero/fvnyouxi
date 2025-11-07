<template>
  <div class="inventory-container relative flex w-95% box-border h-[90vh] bg-white text-white p-4 box-border my-[5vh] mx-[2%] rounded-xl shadow-xl">
    <!-- 关闭按钮 -->
    <!-- 右侧内容区域 -->
    <div class="w-full flex flex-col text-gray-100">
      <!-- Tabs -->
      <div class="flex w-full justify-between items-center">
        <el-tabs v-model="activeTab" type="card" class="text-white" tab-position="top">
          <el-tab-pane v-for="(tab, index) in tabs" :key="index" :label="tab" :name="tab" />
        </el-tabs>
        <el-icon class="z-10 mb-2vh" size="30" @click="handleClose">
          <Close color="black" />
        </el-icon>
      </div>
      <!-- 内容区 -->
      <div class="bg-gray-700/80 flex-1 overflow-y-scroll rounded-xl p-4 box-border border border-white">
        <!-- 道具栏 -->
        <div v-if="activeTab === '库存'" class="flex">
          <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw gap-y-4vh flex-1 h-1/2o">
            <div v-for="(item, index) in user.inventory" :key="index" class="bg-white text-black aspect-square flex justify-center items-center rounded-1 relative">
              <span v-if="item.num > 1" class="absolute top-[-0.8vh] right-[-0.7vw] bg-#79BBFF text-white text-gray-800 rounded-full text-[1.4vw] px-[0.6vw] py-[0.2vh] leading-none font-semibold z-10">
                {{ item.num }}
              </span>
              <el-popover class="box-item pointer-events-auto" :title="item.name" :ref="(el) => (popoverRefs1[index] = el)" :width="200" trigger="click" placement="top-start" :teleported="false" :append-to-body="false">
                <template #default>
                  <div>
                    <div class="text-sm text-gray-700 mb-2">{{ item.miaoshu }}</div>
                    <div v-if="item.img === 'qiandaizi.webp'" class="flex text-#E6A23C">货币数量:{{ item.num }}</div>
                    <div v-else-if="item.wuqi" class="flex items-center justify-end">
                      <el-button type="primary" size="small" @click="usedBack(item, 'wuqi', index)">穿戴</el-button>
                    </div>
                    <div v-else-if="item.shiyong" class="flex items-center justify-end">
                      <el-button type="primary" size="small" @click="usedBack(item, 'eat', index)">使用</el-button>
                    </div>
                  </div>
                </template>
                <template #reference>
                  <img :src="inventoryImg(item.img)" class="w-50% object-cover" />
                </template>
              </el-popover>
            </div>
          </div>
        </div>
        <!-- 知识栏 -->
        <div v-else-if="activeTab === '管理'" class="flex flex-col">
          <div class="text-26px mb-1vh iconfont2 font-bold">属性详细</div>
          <div class="flex mb-4vh gap-x-2vw flex-wrap gap-y-1vh">
            <el-popover class="box-item pointer-events-auto" :width="180" trigger="click" placement="right-start" :teleported="false" :append-to-body="false">
              <template #default>
                <div>每个人口都会每天给予你0.01魔力</div>
              </template>
              <template #reference>
                <span class="text-20px">村庄总人口: {{ user.attributes.villagePopulation }}</span>
              </template>
            </el-popover>
            <el-popover class="box-item pointer-events-auto" :width="170" trigger="click" placement="right-start" :teleported="false" :append-to-body="false">
              <template #default>
                <div>用于抵御外来入侵</div>
              </template>
              <template #reference>
                <span class="text-20px">村庄战斗力: {{ villageCombatPower }}</span>
              </template>
            </el-popover>
            <el-popover class="box-item pointer-events-auto" :width="170" trigger="click" placement="right-start" :teleported="false" :append-to-body="false">
              <template #default>
                <div>提升繁荣度推进剧情</div>
              </template>
              <template #reference>
                <span class="text-20px">村庄繁荣度: {{ user.attributes.villageWealth }}</span>
              </template>
            </el-popover>
            <el-popover class="box-item pointer-events-auto" :width="250" trigger="click" placement="right-start" :teleported="false" :append-to-body="false">
              <template #default>
                <div>影响人口魔力供给效率</div>
                <div>当前信仰程度: {{ faithTitle }}</div>
                <div>当前魔力供给效率：{{ faithEfficiency * 100 }}%</div>
              </template>
              <template #reference>
                <span class="text-20px">村庄信仰度: {{ user.attributes.villagersFaith }}</span>
              </template>
            </el-popover>
          </div>
          <div class="text-26px mb-2vh iconfont2 font-bold">可用设施</div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw gap-y-4vh flex-1 h-1/2">
            <div v-for="(item, index) in user.attributes.facilities" :key="index" class="bg-white text-black aspect-square flex justify-center items-center rounded-1 relative">
              <el-popover class="box-item pointer-events-auto" :title="item.name" :width="300" trigger="click" placement="top-start" :teleported="false" :append-to-body="false">
                <template #default>
                  <div>
                    <div class="text-sm text-gray-500 mb-2">{{ item.note }}</div>
                    <div class="flex items-center justify-end">
                      <el-button type="primary" size="small" @click="usedBack(item, 'sheshi', index)">使用</el-button>
                    </div>
                  </div>
                </template>
                <template #reference>
                  <img :src="inventoryImg(item.img)" class="w-100% object-cover" />
                </template>
              </el-popover>
            </div>
          </div>
        </div>
        <!-- 属性栏 -->
        <div v-else-if="activeTab === '笔记'" class="flex flex-col px-2vw bg-white">
          <el-collapse v-model="activeName" accordion :expand-icon-position="position">
            <el-collapse-item title="进行中的任务" name="1">
              <div class="flex flex-col gap-y-2vh">
                <div v-for="item of user.attributes.allTasks.finishedTasks" :key="item.name" class="flex flex-col border border-solid border-#EBEEF5 px-2vw py-1.2vh">
                  <span class="text-gray-800">{{ item.name }}</span>
                  <span class="text-gray-500" v-html="item.note"></span>
                </div>
              </div>
            </el-collapse-item>
            <el-collapse-item title="已完成的任务" name="2"> </el-collapse-item>
            <el-collapse-item title="已获得的成就" name="3">
              <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(80px,10vw,120px),1fr))] gap-x-5vw gap-y-4vh">
                <div v-for="(item, index) in user.attributes.achv" :key="index" class="bg-white text-black h-[70px] w-full flex justify-center items-center rounded relative">
                  <el-popover class="box-item pointer-events-auto" :teleported="true"  :width="300" trigger="click" placement="bottom-start" :append-to-body="false">
                    <template #default>
                      <div>
                    
                        <div class="text-16px text-gray-700 mb-2">{{ item.note }}</div>
                        <div class="text-13px text-gray-500 mb-2">{{ item.title }}</div>
                      </div>
                    </template>
                    <template #reference>
                      <div class="text-#409EFF text-18px iconfont2">{{ item.name }}</div>
                    </template>
                  </el-popover>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        <div v-else-if="activeTab === '人物'" class="flex flex-col">
          <div class="text-26px mb-1vh iconfont2 font-bold">队伍中的人</div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw gap-y-4vh flex-1 h-1/2">
            <div v-for="(item, index) in user.attributes.Character" :key="index" class="bg-white text-black aspect-square flex justify-center items-center rounded-1 relative">
              <el-popover class="box-item pointer-events-auto" :title="item.name" :width="300" trigger="click" placement="top-start" :teleported="false" :append-to-body="false">
                <template #default>
                  <div>
                    <div :class="['text-sm mb-0.5', getStatusClass(item.currentHp)]">状态: {{ getStatusText(item.currentHp) }}</div>
                    <div class="text-sm mb-0.5 text-yellow-500">等级: {{ item.level }}</div>
                    <div class="text-sm mb-0.5" :class="getExpColor(item.exp, item.expMax)">经验值: {{ item.exp }}/{{ item.expMax }}</div>
                    <div class="text-sm mb-0.5 text-rose-500">亲近: {{ item.Affinity }}</div>
                    <div class="text-sm mb-0.5 text-indigo-500">魔力供给: {{ item.manaGrant }}/天</div>
                    <template v-if="item.uniqueSkill?.length > 0">
                      <el-divider style="margin: 1vh 0 0.5vh 0" />
                      <div>
                        <span class="text-#409EFF">特殊能力:</span>
                        <div v-for="item1 of item.uniqueSkill" :key="item1.title">{{ item1.title }}({{ item1.note }})</div>
                      </div>
                    </template>
                    <el-divider style="margin: 1vh 0" />
                    <div class="flex justify-between">
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-red-500">力量:{{ item.str }}</span>
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-blue-500">智慧:{{ item.int }}</span>
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-green-500">敏捷:{{ item.agi }}</span>
                    </div>
                    <div class="flex mt-0.25vh">
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-purple-500">魔力:{{ item.mag }}</span>
                    </div>
                    <el-divider style="margin: 1vh 0" />
                    <template v-if="item.blessingState?.length > 0">
                      <div>
                        <span class="text-#67C23A">已有增益:</span>
                        <div v-for="item1 of item.blessingState" :key="item1.title">{{ item1.title }}({{ item1.note }})</div>
                      </div>
                    </template>
                  </div>
                </template>
                <template #reference>
                  <img :src="inventoryImg(item.img)" class="w-100% object-cover" />
                </template>
              </el-popover>
            </div>
          </div>
          <div class="text-26px mb-1vh iconfont2 font-bold mt-4vh">你认识的人</div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw gap-y-4vh flex-1 h-1/2">
            <div v-for="(item, index) in user.attributes.knownPeople" :key="index" class="bg-white text-black aspect-square flex justify-center items-center rounded-1 relative">
              <el-popover class="box-item pointer-events-auto" :title="item.name" :width="300" trigger="click" placement="top-start" :teleported="false" :append-to-body="false">
                <template #default>
                  <div>
                    <div :class="['text-sm mb-0.5', getStatusClass(item.currentHp)]">状态: {{ getStatusText(item.currentHp) }}</div>
                    <div class="text-sm mb-0.5 text-rose-500">亲近: {{ item.Affinity }}</div>
                    <template v-if="item.uniqueSkill?.length > 0">
                      <el-divider style="margin: 1vh 0 0.5vh 0" />
                      <div>
                        <span class="text-#409EFF">特殊能力:</span>
                        <div v-for="item1 of item.uniqueSkill" :key="item1.title">{{ item1.title }}({{ item1.note }})</div>
                      </div>
                    </template>
                    <el-divider style="margin: 1vh 0" />
                    <div class="flex justify-between">
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-red-500">力量:{{ item.str }}</span>
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-blue-500">智慧:{{ item.int }}</span>
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-green-500">敏捷:{{ item.agi }}</span>
                    </div>
                    <div class="flex mt-0.25vh">
                      <span class="w-91px text-center text-ellipsis whitespace-nowrap text-purple-500">魔力:{{ item.mag }}</span>
                    </div>
                    <el-divider style="margin: 1vh 0" />
                    <template v-if="item.blessingState?.length > 0">
                      <div>
                        <span class="text-#67C23A">已有增益:</span>
                        <div v-for="item1 of item.blessingState" :key="item1.title">{{ item1.title }}({{ item1.note }})</div>
                      </div>
                    </template>
                  </div>
                </template>
                <template #reference>
                  <img :src="inventoryImg(item.img)" class="w-100% object-cover" />
                </template>
              </el-popover>
            </div>
          </div>
        </div>
      </div>
    </div>
    <el-dialog v-model="showData.twoShow" title="选择目标" width="80vw" top="20vh">
      <template v-if="showData.type === '赐福'">
        <div class="pb-5vh grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw gap-y-4vh flex-1 h-1/2">
          <div v-for="(item, index) in user.attributes.Character" :key="index" class="border border-solid border-#DCDFE6 text-black aspect-square flex justify-center items-center rounded-1 relative" @click="xuanzemubiao(index, '赐福', item.cifu)">
            <span class="absolute -bottom-25px text-#409EFF text-12px w-120px -left-8px">赐福所需魔力:{{ item.cifu }}</span>
          </div>
        </div>
      </template>
      <template v-if="showData.type === '制作'">
        <div class="pb-5vh grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw gap-y-4vh flex-1 h-1/2">
          <div v-for="(item, index) in user.attributes.Character" :key="index" class="border border-solid border-#DCDFE6 text-black aspect-square flex justify-center items-center rounded-1 relative" @click="xuanzemubiao(index, '制作', item.int * showData.zhizuo.int + showData.zhizuo.odds, '草药')">
            <span class="absolute -bottom-25px text-#E6A23C text-12px">成功率:{{ item.int * showData.zhizuo.int + showData.zhizuo.odds }}%</span>
          </div>
        </div>
      </template>
      <template v-else-if="showData.type === '治愈'">
        <div v-if="user.attributes.Character.filter((c) => c.currentHp < 100).length > 0" class="pb-5vh grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw gap-y-4vh flex-1 h-1/2">
          <div v-for="(item, index) in user.attributes.Character.filter((c) => c.currentHp < 100)" :key="index" class="border border-solid border-#DCDFE6 text-black aspect-square flex justify-center items-center rounded-1 relative" @click="xuanzemubiao(index, '治疗', showData.Hp)">
            <span class="absolute -bottom-25px text-#67C23A text-12px">生命值:{{ item.currentHp }}%</span>
          </div>
        </div>
        <div v-else class="pb-3vh text-center text-18px font-bold">没有受伤人员</div>
      </template>
    </el-dialog>
    <!-- 草药棚 -->
    <el-dialog v-model="showData.threeShow" width="80vw" top="5vh">
      <span>背包草药数量：{{ herbCount }}</span>
      <div class="text-center py-5vh text-#333">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-2.5vw gap-y-6vh flex-1">
          <div v-for="(item, index) in user.attributes.caoyaozhizuo" :key="index" class="bg-white h-150px w-full text-black aspect-square flex justify-center items-center rounded-1 relative">
            <div class="flex border border-solid border-#DCDFE6 box-border rounded-2xl h-150px flex-1">
              <img :src="inventoryImg(item.img)" class="w-40% object-cover py-3vh" />
              <div class="flex w-full box-border flex-col justify-between pb-4vh">
                <div class="mt-1vh">
                  <span class="w-full text-gray-700">{{ item.name }}</span>
                  <div class="text-gray-500 text-left text-13px mt-0.25vh">{{ item.miaoshu }}</div>
                </div>
                <div class="flex justify-end mr-2">
                  <el-button type="primary" size="small" @click="zhizuo(item)">制作</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from "vue";
import { Close } from "@element-plus/icons-vue";
import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";

const activeName = ref("1"); //笔记
const position = ref("left");
const user = useCounterStore();
const tabs = ["库存", "管理", "笔记", "人物"];
const activeTab = ref("库存");
const popoverRefs = ref([]);
const popoverRefs1 = ref([]);
const showData = reactive({
  oneShow: false,
  twoShow: false,
  threeShow: false,
  type: "",
  zhizuo: {},
  name: "",
  Hp: 0,
  guanli: "",
});
const totalMana = computed(() => {
  const characterMana = user.attributes.Character?.reduce((sum, c) => sum + (c.manaGrant || 0), 0) || 0;
  const faith = user.attributes.villagersFaith || 0;
  const faithEfficiency = faith >= 80 ? 1.2 : faith >= 40 ? 1.0 : 0.8;
  const populationMana = (user.attributes.villagePopulation || 0) * 0.01 * faithEfficiency;
  return characterMana + populationMana;
});
function getStatusText(hp) {
  if (hp <= 0) return "死亡";
  if (hp <= 10) return "濒死";
  if (hp <= 30) return "虚弱";
  if (hp <= 60) return "受伤";
  if (hp <= 89) return "亚健康";
  return "健康";
}
function getExpColor(exp, expMax) {
  const ratio = exp / expMax;
  if (ratio < 0.3) return "text-rose-500"; // 经验低 红色
  if (ratio < 0.7) return "text-yellow-500"; // 经验中 黄橙色
  return "text-green-500"; // 经验高 绿色
}
const villageCombatPower = computed(() => {
  const basePower = user.attributes.villageCombatPower || 0; // 你可以改这个名字为原始战斗力字段

  return basePower;
});
const herbCount = computed(() => {
  return user.inventory.filter((item) => item.name === "草药").reduce((total, item) => total + item.num, 0);
});
const faithTitle = computed(() => {
  const val = user.attributes.villagersFaith;
  if (val >= 80) return "虔诚";
  if (val >= 40) return "平庸";
  return "迷茫";
});
const faithEfficiency = computed(() => {
  const val = user.attributes.villagersFaith;
  if (val >= 80) return 1.2;
  if (val >= 40) return 1.0;
  return 0.8;
});

function getStatusClass(hp) {
  if (hp <= 0) return "text-gray-500"; // 死亡
  if (hp <= 10) return "text-red-600"; // 濒死
  if (hp <= 30) return "text-red-500"; // 虚弱
  if (hp <= 60) return "text-orange-500"; // 受伤
  if (hp <= 89) return "text-yellow-500"; // 亚健康
  return "text-green-600"; // 健康
}

// 动态拼接路径
const getImageUrl = (name) => {
  return new URL(`../../assets/people/wo/biaoqing/shenti/${name}`, import.meta.url).href;
};
//物品图片
const inventoryImg = (name) => {
  return new URL(`../../assets/wuping/${name}`, import.meta.url).href;
};
onMounted(() => {
  console.log("打开背包", user.attributes);
  console.log("user.inventory=", user.inventory);
});

const handleClose = () => {
  ElMessText("已关闭", "info");
  user.wupingShow = 1;
};
// 知识弹出框

function shuxingbianhua(item, type) {
  console.log("item=", item);
  if (type === "add") {
    if (item.strength) {
      user.attributes.strength += item.strength;
    }
    if (item.mana) {
      user.attributes.mana += item.mana;
    }
    if (item.damageReduction) {
      user.attributes.damageReduction += item.damageReduction;
    }
  } else if (type === "remove") {
    if (item.strength) {
      user.attributes.strength -= item.strength;
    }
    if (item.mana) {
      user.attributes.mana -= item.mana;
    }
    if (item.damageReduction) {
      user.attributes.damageReduction -= item.damageReduction;
    }
  }
}
function eat(item) {
  if (item.shengming) {
    user.attributes.currentHp += item.shengming;
    //生命值不可超过上限
    if (user.attributes.currentHp > user.attributes.maxHp) {
      user.attributes.currentHp = user.attributes.maxHp;
    }
    ElMessText(`生命值恢复${item.shengming}点`, "success");
  }
}
///关系
// 立绘图片
const fullBodyImagesImg = (src) => {
  return new URL(`../../assets/fullBody/${src}`, import.meta.url).href;
};
//使用物品
function usedBack(item, type, index) {
  console.log("item=", item);

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
//使用魔法
function mofa(item, index) {
  const popover = popoverRefs.value[index];
  if (popover && typeof popover.hide === "function") {
    popover.hide();
  }
  if (item === "赐福") {
    showData.twoShow = true;
    showData.type = "赐福";
  } else if (item === "滋养") {
    if (user.attributes.myMana >= 6) {
      user.attributes.myMana -= 6;
      const hasShield = user.attributes.buffs.some((b) => b.name === "滋养"); // true
      if (hasShield) {
        const index1 = user.attributes.buffs.findIndex((item1) => item1.name === "滋养");
        user.attributes.buffs[index1].day += 5;
      } else {
        user.attributes.buffs.push({
          name: "滋养",
          day: 5,
        });
      }
      ElMessText("已释放滋养祝福", "success");
    } else {
      ElMessText("魔力不足");
    }
  } else if (item === "庇护") {
    if (user.attributes.myMana >= 6) {
      user.attributes.myMana -= 6;
      const hasShield = user.attributes.buffs.some((b) => b.name === "庇佑"); // true
      if (hasShield) {
        const index1 = user.attributes.buffs.findIndex((item1) => item1.name === "庇佑");
        user.attributes.buffs[index1].day += 3;
      } else {
        user.attributes.buffs.push({
          name: "庇佑",
          day: 3,
        });
      }
      ElMessText("已释放庇佑祝福", "success");
    } else {
      ElMessText("魔力不足");
    }
  } else if (item === "治愈") {
    showData.twoShow = true;
    showData.type = "治愈";
    showData.name = "治愈";
    showData.Hp = 25;
  }
}
//制作
function zhizuo(item) {
  console.log("item=", item);
  showData.twoShow = true;
  showData.type = "制作";
  showData.zhizuo = item.need;
  showData.name = item.name;
  console.log("showData=", showData);
}
//选择目标
function xuanzemubiao(index, type, odds, need) {
  if (type === "制作") {
    const index2 = user.inventory.findIndex((item1) => item1.name === need);
    const index1 = user.attributes.caoyaozhizuo.findIndex((item1) => item1.name === showData.name);
    if (index2 === -1 || user.inventory[index2].num < user.attributes.caoyaozhizuo[index1].need.num) {
      ElMessText(`${need}不足，无法制作`);
      return;
    }
    user.inventory[index2].num -= user.attributes.caoyaozhizuo[index1].need.num;
    if (user.inventory[index2].num <= 0) {
      user.inventory.splice(index2, 1);
    }
    const isSuccess = Math.random() * 100 < odds;
    if (isSuccess) {
      ElMessText(`制作成功，获得1*${showData.name}`, "success");
      user.addItemToInventory(user.attributes.caoyaozhizuo[index1]);
    } else {
      ElMessText(`制作失败，制作熟练度提升`);
      if (user.attributes.caoyaozhizuo[index1].need.odds < 60) {
        user.attributes.caoyaozhizuo[index1].need.odds += user.attributes.caoyaozhizuo[index1].need.failTs;
      }
      if (user.attributes.caoyaozhizuo[index1].need.odds > 60) {
        user.attributes.caoyaozhizuo[index1].need.odds = 60;
      }
    }
    return;
  } else if (type === "治疗") {
    console.log("showData.name=", showData.name);
    console.log("odds=", odds);
    if (showData.name === "治愈") {
      if (user.attributes.myMana < 4) {
        ElMessText(`魔力不足`);
        return;
      }
      ElMessText(`使用成功，生命值恢复${odds}`, "success");
      user.attributes.Character[index].currentHp += odds;
      user.attributes.myMana -= 4;
    } else {
      const index1 = user.inventory.findIndex((item1) => item1.name === showData.name);
      if (index1 === -1) {
        ElMessText(`${showData.name}不足`);
        return;
      }
      user.inventory[index1].num--;
      user.attributes.Character[index].currentHp += odds;
      ElMessText(`使用成功，生命值恢复${odds}`, "success");
      if (user.inventory[index1].num <= 0) {
        user.inventory.splice(index1, 1);
      }
    }
  } else if (type === "赐福") {
    if (user.attributes.myMana < odds) {
      ElMessText(`魔力不足`);
      return;
    }
    ElMessText(`赐福成功，${user.attributes.Character[index].name}全属性提升1`, "success");
    user.attributes.Character[index].str++;
    user.attributes.Character[index].int++;
    user.attributes.Character[index].agi++;
    user.attributes.Character[index].cifu *= 2;
    user.attributes.myMana -= odds;
  }
  // console.log("index=", index);
  // if (user.attributes.myMana >= 10) {
  //   user.attributes.myMana -= 10;
  //   showData.twoShow = false;
  // } else {
  //   ElMessText("魔力不足");
  // }
}
</script>

<style scoped>
:deep(.el-progress__text) {
  margin-bottom: 1vh;
  color: white;
}
:deep(.el-collapse-item__content) {
  padding-bottom: 2.5vh;
}
.inventory-container {
  position: relative;
  backdrop-filter: blur(8px);
}
</style>
