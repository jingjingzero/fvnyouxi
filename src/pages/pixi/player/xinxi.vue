<template>
  <div class="flex flex-col text-1.6vw">
    <div class="ml-2vw">个人面板</div>
    <el-divider style="margin: 1.5vh 0" />
    <el-tabs type="border-card" class="h-62vh">
      <el-tab-pane>
        <template #label>
          <span class="text-4vh">个人信息</span>
        </template>
        <div class="flex h-40vh">
          <div class="h-full flex items-center ">
            <div
              class="w-25vh h-25vh border border-solid border-#A8ABB2 pt-0.5vh rounded-2"
            >
              <img
                :src="ImgSrc('cat')"
                class="inset-0 object-cover w-full h-25vh pointer-events-none"
              />
            </div>
          </div>
          <div class="flex flex-col flex-1 gap-y-2vh">
            <div class="flex gap-x-5vw ml-4vw">
              <span>姓名：林恩</span>
              <span v-html="user.pixi.player.shenfen"></span>
            </div>
            <div
              class="bg-#409EFF overflow-y-auto border-4 border-solid border-#337ECC rounded-2 ml-1vw flex py-2vh px-1.5vw text-white"
            >
              <div class="flex flex-col box-border gap-y-1vh w-22vw text-1.5vw">
                <div>攻击力：{{ user.pixi.player.attack }}</div>
                <div>
                  生命值：{{ user.pixi.player.currentHp }} /
                  {{ user.pixi.player.maxHp }}
                </div>
                <div>速度：{{ user.pixi.player.speed.toFixed(1) }}</div>
                <div>
                  经验值：{{ user.pixi.player.exp }} /
                  {{ user.pixi.player.maxExp }}
                </div>
                
              </div>
              <el-divider
                direction="vertical"
                class="mr-1.5vw! h-full! text-white!"
              />
              <div class="text-1.5vw flex flex-col gap-y-1vh">
                <div v-for="item of user.pixi.player.skill" :key="item.name">
                  <span>{{ item.name }}</span
                  >：<span v-html="item.desc"></span>
                </div>
                <el-divider class="text-white! mt-1vh!" />
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane>
        <template #label>
      <span class="text-4vh">物品栏</span>
        </template>
        <div
          class="flex flex-wrap justify-start gap-x-2vh gap-y-2vh px-2vh py-2vh overflow-y-auto h-35vh box-border"
        >
          <!-- <div v-for="(item, index) of PageIndex" :key="index">
            <div class="h-13vh w-13vh bg-blue rounded-2"></div>
          </div> -->
          <div
            v-for="(item, index) in user.inventory"
            :key="index"
            class="bg-blue w-13vh h-13vh rounded-2 text-black aspect-square flex justify-center items-center relative"
          >
            <span
              v-if="item.num > 1"
              class="absolute top-[-0.8vh] right-[-0.7vw] bg-#79BBFF text-white text-gray-800 rounded-full text-[1.4vw] px-[0.6vw] py-[0.2vh] leading-none font-semibold z-10"
            >
              {{ item.num }}
            </span>
            <el-popover
              class="box-item pointer-events-auto"
              :title="item.name"
              :ref="(el) => (popoverRefs1[index] = el)"
              :width="200"
              trigger="click"
              placement="top-start"
              :teleported="false"
              :append-to-body="false"
            >
              <template #default>
                <div>
                  <div class="text-sm text-gray-700 mb-2">
                    {{ item.miaoshu }}
                  </div>
                  <div
                    v-if="item.img === 'qiandaizi.webp'"
                    class="flex text-#E6A23C"
                  >
                    货币数量:{{ item.num }}
                  </div>
                  <div
                    v-else-if="item.wuqi"
                    class="flex items-center justify-end"
                  >
                    <el-button
                      type="primary"
                      size="small"
                      @click="usedBack(item, 'wuqi', index)"
                      >穿戴</el-button
                    >
                  </div>
                  <div
                    v-else-if="item.shiyong"
                    class="flex items-center justify-end"
                  >
                    <el-button
                      type="primary"
                      size="small"
                      @click="usedBack(item, 'eat', index)"
                      >使用</el-button
                    >
                  </div>
                </div>
              </template>
              <template #reference>
                <img
                  :src="inventoryImg(item.img)"
                  class="w-95% mt-5% object-cover"
                />
              </template>
            </el-popover>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
const user = useCounterStore();
const popoverRefs1 = ref([]);
const PageIndex = ref(30);
const ImgSrc = (src) => {
  return new URL(`../../../assets/fullBody/zhujue/${src}.webp`, import.meta.url)
    .href;
};
const inventoryImg = (src) => {
  return new URL(`../../../assets/fullBody/zhujue/${src}.webp`, import.meta.url)
    .href;
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
</script>


