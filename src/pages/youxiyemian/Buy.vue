<template>
  <div class="flex gap-4 p-4 justify-between">
    <!-- 我的背包 -->
    <div class="flex flex-col w-48vw bg-gray-700/60 h-95vh overflow-y-auto">
      <img src="@/assets/wuping/beibao.webp" class="absolute w-45vw object-cover -z-1 mt-8vh" />
      <div class="mb-1vh iconfont2 text-center mb-4vh mt-3vh relative text-26px items-center flex justify-center">
        <span>库存</span>
        <el-icon class="absolute! right-2vw" size="30" @click="handleClose">
          <Close color="white" />
        </el-icon>
      </div>

      <div class="h-83vh overflow-y-scroll py-2vh box-border">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw flex-1 h-1/2 px-5px box-border gap-y-4vh">
          <div v-for="(item, index) in user.inventory" :key="index" class="bg-white text-black aspect-square flex justify-center items-center rounded-1 relative">
            <span v-if="item.num > 1" class="absolute top-[-0.8vh] right-[-0.7vw] bg-#79BBFF text-white text-gray-800 rounded-full text-[1.4vw] px-[0.6vw] py-[0.2vh] leading-none font-semibold z-10">
              {{ item.num }}
            </span>
            <el-popover class="box-item" :title="item.name" :ref="(el) => (popoverRefs1[index] = el)" :width="240" trigger="click" placement="top-start">
              <template #default>
                <div>
                  <div class="text-sm text-gray-700 mb-2">{{ item.miaoshu }}</div>
                  <div class="flex justify-between items-center">
                    <span class="text-16px text-#E6A23C" v-if="item.name === '钱袋子'">货币数量:{{ item.num }}</span>
                    <span class="text-16px" v-else>售价:{{ item.sell === -1 ? "无法售卖" : item.sell }}</span>
                    <div v-if="item.sell !== -1">
                      <el-button size="small" type="danger" :disabled="item.sell === -1 || item.num <= 1" @click="useItem(item, 'allsell', index)">全卖</el-button>
                      <el-button size="small" type="warning" :disabled="item.sell === -1" @click="useItem(item, 'sell', index)">售卖</el-button>
                    </div>
                  </div>
                </div>
              </template>
              <template #reference>
                <img :src="inventoryImg(item.img)" class="w-70% object-cover" />
              </template>
            </el-popover>
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-col w-48vw bg-gray-700/60 h-95vh overflow-y-auto">
      <div class="mb-1vh iconfont2 text-center mb-4vh mt-3vh relative text-26px items-center flex justify-center">
        <span>货架</span>
        <el-icon class="absolute! right-2vw" size="30" @click="handleClose">
          <Close color="white" />
        </el-icon>
      </div>
      <div class="h-83vh overflow-y-scroll py-2vh box-border">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(clamp(60px,8vw,80px),1fr))] gap-x-5vw flex-1 px-5px box-border gap-y-4vh">
          <div v-for="(item, index) in user.attributes.zahuopuSP" :key="index" class="bg-white text-black aspect-square flex justify-center items-center rounded-1 relative" :class="{ 'text-gray-400! bg-white cursor-not-allowed opacity-50': item.num <= 0 }">
            <span v-if="item.num > 1" class="absolute top-[-0.8vh] right-[-0.7vw] bg-#79BBFF text-white text-gray-800 rounded-full text-[1.4vw] px-[0.6vw] py-[0.2vh] leading-none font-semibold z-10">
              {{ item.num }}
            </span>
            <el-popover class="box-item" :title="item.name" :width="200" trigger="click" placement="top-start">
              <template #default>
                <div>
                  <div class="text-sm text-gray-700 mb-2">{{ item.miaoshu }}</div>
                  <div class="flex justify-between items-center">
                    <span>售价:{{ item.sell }}</span>
                    <el-button size="small" type="success" @click="useItem(item, 'buy')">买入</el-button>
                  </div>
                </div>
              </template>
              <template #reference>
                <img :src="inventoryImg(item.img)" class="w-70% object-cover" />
              </template>
            </el-popover>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import cloneDeep from "lodash/cloneDeep";
import emitter from "@/bus"; // 引入传值组件
const user = useCounterStore();
//物品图片
onMounted(() => {
  console.log("user.attributes.villageShelves=", user.attributes.villageShelves);

  user.attributes.zahuopuSP = cloneDeep(user.attributes.villageShelves);
});
const popoverRefs1 = ref([]);

const inventoryImg = (name) => {
  return new URL(`../../assets/wuping/${name}`, import.meta.url).href;
};
function handleClose() {
  ElMessText("已关闭");
  user.currentNodeKey = "shangtuanjiaoyi01_03";
  user.youxi = 1;
  user.text_boolean = false;
  user.attributes.textJuxu = false;
  user.attributes.waichu = false;
  user.attributes.kucun = false;
  user.wupingShow = 1;
  emitter.emit("text_num");
}
function useItem(item, type, index1) {
  console.log("购买", item);
  if (type === "buy") {
    const index = user.inventory.findIndex((i) => i.name === "钱袋子");
    if (item.num <= 0) {
      ElMessText("库存不足");
      return;
    }
    if (user.inventory[index].num - item.sell >= 0) {
      if (item.name === "石头雕像") {
        ElMessText("凯:天烁大人，这太贵了，还是不要把钱花在这里吧");
        return;
      }
      const index2 = user.attributes.villageShelves.findIndex((i) => i.name === item.name);
      if (index2 !== -1) {
        user.attributes.villageShelves[index2].num--;
      }
      user.inventory[index].num -= item.sell;
      ElMessText("购买成功");
      let reward = cloneDeep(item);
      reward.num = 1;
      reward.sell = Math.floor(item.sell * 0.5);
      user.addItemToInventory(reward);
      item.num--;
    } else {
      ElMessText("金钱不足");
    }
  } else if (type === "sell") {
    console.log(" user.inventory=", user.inventory);

    const index = user.inventory.findIndex((item1) => item1.name === "钱袋子");
    user.inventory[index].num += item.sell;
    user.inventory[index1].num--;
    const existing = user.attributes.zahuopuSP.findIndex((item1) => item1.name === item.name);
    console.log("existing=", existing);
    if (existing !== -1) {
      user.attributes.zahuopuSP[existing].num++;
    } else {
      user.attributes.zahuopuSP.push({
        name: item.name,
        num: 1,
        img: item.img,
        miaoshu: item.miaoshu,
        sell: item.sell * 2,
        wuqi: item.wuqi,
        eat: item.eat,
      });
    }
    console.log("user.inventory[index1].num=", user.inventory[index1].num);

    if (user.inventory[index1].num <= 0) {
      const popover = popoverRefs1.value[index1];
      if (popover && typeof popover.hide === "function") {
        popover.hide();
      }
      user.inventory.splice(index1, 1);
    }
    ElMessText(`售卖成功，金钱+${item.sell}`);
  } else if (type === "allsell") {
    const popover = popoverRefs1.value[index1];
    if (popover && typeof popover.hide === "function") {
      popover.hide();
    }
    const index = user.inventory.findIndex((item1) => item1.name === "钱袋子");
    user.inventory[index].num += item.sell * item.num;
    const existing = user.attributes.zahuopuSP.findIndex((item1) => item1.name === item.name);
    if (existing !== -1) {
      user.attributes.zahuopuSP[existing].num += user.inventory[index1].num;
    } else {
      user.attributes.zahuopuSP.push({
        name: item.name,
        num: user.inventory[index1].num,
        img: item.img,
        miaoshu: item.miaoshu,
        sell: item.sell * 2,
      });
    }
    ElMessText(`售卖成功，金钱+${item.sell * item.num}`);
    user.inventory[index1].num = 0;
    if (user.inventory[index1].num === 0) {
      user.inventory.splice(index1, 1);
    }
  }
}
</script>
