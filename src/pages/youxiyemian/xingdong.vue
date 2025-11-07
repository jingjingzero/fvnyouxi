<!--
 * @作者: 冯星悦
 * @Date: 2025-07-28 11:04:15
 * @LastEditTime: 2025-07-29 10:57:13
-->
<template>
  <div class="inventory-container relative flex w-95% box-border h-[90vh] bg-white text-white p-4 box-border my-[5vh] mx-[2%] rounded-xl shadow-xl">
    <div class="w-full flex flex-col text-gray-100">
      <!-- Tabs -->
      <div class="flex w-full justify-between items-center mb-3vh">
        <div class="text-24px text-#333">天数:{{ user.attributes.Day }}</div>
        <el-icon class="z-10" size="30" @click="handleClose">
          <Close color="black" />
        </el-icon>
      </div>
      <div class="flex flex-col text-#333 gap-y-4vh">
        <div v-for="(item, index) of user.attributes.actionList" :key="index" class="text-28px">
          <span>{{ item.name }}</span>
          <div class="flex gap-x-5 mt-1.2vh">
            <div v-for="(item1, index1) of item.list" :key="index1" class="bg-#409EFF relative flex justify-center items-center text-white text-22px w-140px py-1 rounded-2" :class="{ 'bg-#909399': item1.needAble && user.attributes.tiredness }">
              <el-popconfirm v-if="item1.tishi" :title="item1.content" width="200">
                <template #reference>
                  <div>{{ item1.name }}</div>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-button size="small" @click="cancel">取消</el-button>
                  <el-button type="success" size="small" @click="action(item1)"> 继续 </el-button>
                </template>
              </el-popconfirm>
              <div v-else class="w-full h-full text-center" @click="action(item1)">{{ item1.name }}</div>
              <div class="alert-icon absolute right-13px text-17px" v-if="item1.tips">!</div>
            </div>
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
import emitter from "@/bus"; // 引入传值组件
const user = useCounterStore();
const handleClose = () => {
  ElMessText("已关闭");
  user.wupingShow = 1;
};
onMounted(() => {
  console.log("user.attributes.actionList=", user.attributes.actionList);
});
const triggers = ["fenghewu01_gelan01", "fenghewu01_qimo01", "fenghewu01_gelan02", "fenghewu01_qimo02", "fenghewu01_gelan03", "fenghewu01_qimo03", "fenghewu01_gelan04"];
function action(item1) {
  console.log("item1", item1);
  //判断
  const juqing = user.attributes.juqing;
  const day = user.attributes.Day;
  const tired = user.attributes.tiredness;
  if (item1.needAble) {
    if (user.attributes.tiredness) {
      ElMessText("众人累了，还是先回丰禾屋休息后明天再行动吧");
      return;
    }
    if (item1.able) {
      user.attributes.tiredness = true; 
    }
    //判断丰禾屋是否有事件
    // 条件1~7，只要有一个没触发，就设置变量
    const basicTrigger = triggers.some((item) => !juqing.includes(item));
    // 条件8：第8个条件需要额外判断 tiredness
    const specialTrigger1 = !juqing.includes("fenghewu01_qimo04") && tired;
    // 条件9：额外判断 day 与 tiredness 和剧情状态
    const specialTrigger2 = !juqing.includes("qimo011") && juqing.includes("qimo01") && day % 4 === 1 && tired;
    if (basicTrigger || specialTrigger1 || specialTrigger2) {
      // 满足条件，修改变量为 true
      const index1 = user.attributes.actionList[1].list.findIndex((item) => item.name === "丰禾屋");
      user.attributes.actionList[1].list[index1].tips = true;
    }
  }
  item1.tips = false;
  if (item1.name === "寻找碎片") {
    if (!user.attributes.juqing.includes("Suipian01")) {
      user.attributes.juqing.push("Suipian01");
      user.currentNodeKey = "Suipian01";
      const index = user.attributes.actionList[0].list.findIndex((item) => item.name === item1.name);
      user.attributes.actionList[0].list.splice(index, 1);
      user.attributes.actionList[0].list.push({
        able: true,
        name: "野猪营地",
        tips: false,
        needAble:true,
      });
    }
  } else if (item1.name === "野猪营地") {
    if (!user.attributes.juqing.includes("Suipian02")) {
      user.currentNodeKey = "Suipian02";
    }
  } else if (item1.name === "采集草药") {
    if (!user.attributes.juqing.includes("lumi01") && user.attributes.juqing.includes("fenghewu01_qimo02")) {
      user.attributes.juqing.push("lumi01");
      user.currentNodeKey = "lumi01";
    } else if (!user.attributes.juqing.includes("lumi02") && user.attributes.juqing.includes("fenghewu01_qimo03")) {
      user.attributes.juqing.push("lumi02");
      user.currentNodeKey = "lumi02";
    } else {
      const randomNumber = Math.floor(Math.random() * 100) + 1;
      if (randomNumber > 75) {
        user.currentNodeKey = "caiji01_01";
      } else if (randomNumber > 25) {
        user.currentNodeKey = "caiji01_02";
      } else {
        user.currentNodeKey = "caiji01_03";
      }
    }
  } else if (item1.name === "狩猎") {
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    if (randomNumber > 75) {
      user.currentNodeKey = "shoulie01_01";
    } else if (randomNumber > 25) {
      user.currentNodeKey = "shoulie01_01";
    } else {
      user.currentNodeKey = "shoulie01_01";
    }
  } else if (item1.name === "训练") {
    const index = user.inventory.findIndex((i) => i.name === "钱袋子");
    if (user.inventory[index].num - 15 >= 0) {
      user.inventory[index].num -= 15;
    } else {
      ElMessText("金钱不足");
      return;
    }
    user.attributes.tiredness = true;
    if (!user.attributes.juqing.includes("xunlian01_01")) {
      user.attributes.juqing.push("xunlian01_01");
      user.currentNodeKey = "xunlian01_01";
    } else if (!user.attributes.juqing.includes("lumi03") && user.attributes.juqing.includes("xunlian01_01")) {
      user.attributes.juqing.push("lumi03");
      user.currentNodeKey = "lumi03";
    } else if (!user.attributes.juqing.includes("xunlian01_02")) {
      user.currentNodeKey = "xunlian01_02";
    }
  } else if (item1.name === "商团交易") {
    user.currentNodeKey = "shangtuanjiaoyi01_01";
  } else if (item1.name === "丰禾屋") {
    if (!user.attributes.tiredness || user.attributes.yiChuFa) {
      user.currentNodeKey = "fenghewu01_01";
    } else if (!juqing.includes("fenghewu01_gelan01")) {
      user.attributes.juqing.push("fenghewu01_gelan01");
      user.currentNodeKey = "fenghewu01_gelan01";
      user.attributes.yiChuFa = true;
    } else if (!juqing.includes("fenghewu01_qimo01")) {
      user.attributes.juqing.push("fenghewu01_qimo01");
      user.currentNodeKey = "fenghewu01_qimo01";
      user.attributes.yiChuFa = true;
    } else if (!juqing.includes("fenghewu01_gelan02")) {
      user.attributes.juqing.push("fenghewu01_gelan02");
      user.currentNodeKey = "fenghewu01_gelan02";
      user.attributes.yiChuFa = true;
    } else if (!juqing.includes("fenghewu01_qimo02")) {
      user.attributes.juqing.push("fenghewu01_qimo02");
      user.currentNodeKey = "fenghewu01_qimo02";
      user.attributes.yiChuFa = true;
    } else if (!juqing.includes("fenghewu01_gelan03")) {
      user.attributes.juqing.push("fenghewu01_gelan03");
      user.currentNodeKey = "fenghewu01_gelan03";
      user.attributes.yiChuFa = true;
    } else if (!juqing.includes("fenghewu01_qimo03")) {
      user.attributes.juqing.push("fenghewu01_qimo03");
      user.currentNodeKey = "fenghewu01_qimo03";
      user.attributes.yiChuFa = true;
    } else if (day > 7) {
      if (!juqing.includes("fenghewu01_gelan04")) {
        user.attributes.juqing.push("fenghewu01_gelan04");
        user.currentNodeKey = "fenghewu01_gelan04";
        user.attributes.yiChuFa = true;
      } else if (!juqing.includes("fenghewu01_qimo04") && juqing.includes("lumi02")) {
        user.attributes.juqing.push("fenghewu01_qimo04");
        user.currentNodeKey = "fenghewu01_qimo04";
        user.attributes.yiChuFa = true;
      } else if (!juqing.includes("qimo011") && juqing.includes("qimo01") && day % 4 === 1) {
        user.attributes.juqing.push("qimo011");
        user.attributes.yiChuFa = true;
        if (user.attributes.juqing.includes("gelan_yes")) {
          user.currentNodeKey = "fenghewu01_qimo05";
        } else {
          user.currentNodeKey = "fenghewu01_qimo051";
        }
      } else {
        user.currentNodeKey = "fenghewu01_01";
      }
    } else {
      user.currentNodeKey = "fenghewu01_01";
    }
  }else if(item1.name ==="粮食紧缺"){
    const index = user.inventory.findIndex((i) => i.name === "兽肉");
    if (index!== -1 && user.inventory[index].num - 30 >= 0) {
      user.inventory[index].num -= 30;
    } else {
      ElMessText("兽肉不足");
      return;
    }
    user.attributes.tiredness = true;
    if (!user.attributes.juqing.includes("renwu01")) {
      user.attributes.juqing.push("renwu01");
      user.currentNodeKey = "renwu01";
    }
  }
  user.youxi = 1;
  user.text_boolean = false;
  user.attributes.textJuxu = false;
  user.attributes.waichu = false;
  user.attributes.kucun = false;
  user.wupingShow = 1;
  emitter.emit("text_num");
  console.log("触发");
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
.alert-icon {
  font-weight: bold;
  color: #e6a23c;
  animation: bounceGlow 1s infinite;
  text-shadow: 0 0 8px #e6a23c;
}

@keyframes bounceGlow {
  0% {
    transform: scale(1);
    text-shadow: 0 0 6px #ff3333;
  }
  50% {
    transform: scale(1.3);
    text-shadow: 0 0 16px #ff6666;
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 6px #ff3333;
  }
}
</style>
