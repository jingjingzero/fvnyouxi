<!--
 * @作者: 冯星悦
 * @Date: 2025-06-05 15:54:09
 * @LastEditTime: 2025-08-20 09:18:00
-->

<template>
  <div class="p-4 flex">
    <div v-if="tableRows.length">
      <div class="table border border-collapse w-60vw">
        <VueDraggable v-for="(cols, rowIndex) in tableRows" v-model="tableRows" :animation="150" :sort="false" @clone="onClone" :group="{ name: 'people', pull: 'clone', put: false }" :key="rowIndex" class="flex-1 flex">
          <div v-for="col in cols" :key="col.keyName" :data-key="col.keyName" :data-value="col.value" class="flex-1 border border-solid p-2 flex items-center justify-center">
            {{ col.value }}
            <!-- {{ col.keyName }} -->
          </div>
        </VueDraggable>
      </div>
    </div>
    <div v-else>加载中...</div>
    <div class="flex gap-x-2vw ml-1vw flex-1 justify-between">
      <div class="flex flex-col items-center gap-y-1.1vh">
        <span>键名</span>
        <VueDraggable v-model="list2" @add="onAddToList2" :animation="150" :group="{ name: 'people', pull: false, put: true }" :sort="false" class=" flex-1 flex flex-col gap-2 p-4 w-15vw box-border bg-gray-500/5 rounded overflow-auto">
          <div v-for="item in list3" :key="item.id" class=" bg-gray-500/5 rounded p-3 text-center select-none" @click="handleClick(item, $event, 1)" :class="{ 'bg-red!': item.able }">
            {{ item.name }}
          </div>
        </VueDraggable>
      </div>
      <div class="flex flex-col items-center gap-y-1.1vh">
        <span>键值</span>
        <VueDraggable v-model="list2" @add="onAddToList3" :animation="150" :group="{ name: 'people', pull: false, put: true }" :sort="false" class="flex-1 flex flex-col gap-2 p-4 w-15vw box-border bg-gray-500/5 rounded overflow-auto">
          <div v-for="item in list4" :key="item.id" class=" text-center bg-gray-500/5 rounded p-3 select-none" @click="dianji" :class="{ 'bg-red!': item.able }">
            {{ item.name }}
          </div>
        </VueDraggable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, getCurrentInstance, computed, ref } from "vue";
const { proxy } = getCurrentInstance();
import { VueDraggable } from "vue-draggable-plus";
//
const selectedItems = ref([]);

function handleClick(col, event, num) {
  if (event.ctrlKey) {
    if (num === 1) {
      console.log("col=", col);
      col.able = !col.able;
      selectedItems.value.push(col);
      console.log("selectedItems.value=", selectedItems.value);
      if (selectedItems.value.length > 1) {
        list3.value = list3.value.filter((item) => !item.able);
        const merged = {
          name: selectedItems.value.map((item) => item.name).join(""),
          key: selectedItems.value.map((item) => item.key).join(""),
        };
        list3.value.push(merged);
        console.log('list3=',list3.value);
        selectedItems.value=[]
      }
    }
  }
}

//

const rawData = ref({}); // 初始空对象
onMounted(() => {
  getData();
});

const list2 = ref([]);
const list3 = ref([]);
const list4 = ref([]);
function dianji() {
  console.log("list2=", list2.value);
}
function onClone(e) {
  console.log("clone", e);
}
// 当元素被拖入 list2 时触发
function onAddToList2(evt) {
  const keyName = evt.item.dataset.key;
  const value = evt.item.dataset.value;
  console.log("拖入的元素 key:", keyName);
  console.log("拖入的元素 value:", value);
  list3.value.push({
    name: value,
    key: keyName,
  });
}
function onAddToList3(evt) {
  const keyName = evt.item.dataset.key;
  const value = evt.item.dataset.value;
  console.log("拖入的元素 key:", keyName);
  console.log("拖入的元素 value:", value);
  list4.value.push({
    name: value,
    key: keyName,
  });
}
async function getData() {
  const data = {
    path: "/app/data/1112.png",
  };
  // const res = await proxy.$apis.getPlateType1(data);

  // 模拟接口返回
  const res = {
    status: "success",
    code: 200,
    data: {
      row0col0: "XXXXXXXX有限公司",
      row1col0: "地址",
      row1col1: "XX",
      row1col2: "邮编",
      row1col3: "XX",
      row2col0: "联系人",
      row2col1: "XX",
      row2col2: "联系电话",
      row2col3: "XX",
      row2col4: "传真号码",
      row2col5: "XX",
      row3col0: "送货清单",
      row4col0: "日期",
      row4col1: "2015-11-7",
      row4col2: "送货单号",
      row4col3: "WDSH2015110701",
      row5col0: "客户名称",
      row5col1: "XX有限公司",
      row6col0: "序号",
      row6col1: "货物名称",
      row6col2: "规格型号",
      row6col3: "单位",
      row6col4: "数量",
      row6col5: "单价",
      row6col6: "金额",
      row7col0: "1",
      row7col1: "网链主动轮",
      row7col2: "轴圆孔直径40，键槽宽12",
      row7col3: "件",
      row7col4: "30",
      row7col5: "35",
      row7col6: "1050",
      row8col0: "2",
      row8col1: "网链从动轮",
      row8col2: "轴圆孔直径40",
      row8col3: "件",
      row8col4: "20",
      row8col5: "35",
      row8col6: "700",
      row9col0: "3",
      row9col1: "网链主动轮",
      row9col2: "轴圆孔直径40，键槽宽12",
      row9col3: "件",
      row9col4: "20",
      row9col5: "35",
      row9col6: "700",
      row10col0: "4",
      row10col1: "网链主动轮",
      row10col2: "轴圆孔直径30，键槽宽8",
      row10col3: "件",
      row10col4: "20",
      row10col5: "35",
      row10col6: "700",
      row11col0: "5",
      row11col1: "弯链主动轮",
      row11col2: "轴圆孔直径40，18齿",
      row11col3: "件",
      row11col4: "10",
      row11col5: "35",
      row11col6: "350",
      row12col0: "6",
      row12col1: "弯链从动轮",
      row12col2: "轴圆孔直径40",
      row12col3: "件",
      row12col4: "20",
      row12col5: "35",
      row12col6: "700",
      row13col0: "7",
      row13col1: "磁性弯轨单排",
      row13col2: "件",
      row13col3: "3",
      row13col4: "1000",
      row13col5: "3000",
      row14col0: "合计",
      row14col1: "7200",
      row15col0: "总计（大写）",
      row15col1: "柒仟贰佰元整",
      row16col0: "收签单位",
      row16col1: "(签收)",
      row16col2: "制单人",
      row17col0: "第一联",
      row17col1: "存根",
      row17col2: "第二联",
      row17col3: "客户",
      row17col4: "第三联",
      row17col5: "财务",
    },
  };

  if (res.code === 200) {
    rawData.value = res.data;
    console.log("rawData=", rawData.value);
  }
  console.log("res=", res);
}

// 转换为二维数组
const tableRows = computed(() => {
  const rows = {};
  for (const key in rawData.value) {
    const match = key.match(/row(\d+)col(\d+)/);
    if (match) {
      const row = parseInt(match[1]);
      const col = parseInt(match[2]);
      if (!rows[row]) rows[row] = [];
      rows[row].push({ keyName: key, value: rawData.value[key], selected: false });
    }
  }

  return Object.keys(rows)
    .sort((a, b) => a - b)
    .map((row) =>
      rows[row].sort((a, b) => {
        const aCol = parseInt(a.keyName.match(/col(\d+)/)[1]);
        const bCol = parseInt(b.keyName.match(/col(\d+)/)[1]);
        return aCol - bCol;
      })
    );
});
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed; /* 每列固定宽度，强制平分 */
}

td {
  width: calc(100% / 6); /* 假设最大 6 列，就让每列宽度 = 总宽度/6 */
}
</style>
