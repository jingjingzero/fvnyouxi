<!--
 * @作者: 冯星悦
 * @Date: 2024-05-27 16:13:50
 * @LastEditTime: 2024-05-28 14:38:45
-->
<template>
    <div class="ceshi1 flex flex-col items-center bg-#304156 select-none">
        <img class="w-8 h-8 mt-4 rounded-md " src="@/assets/logo/logo1.png">
        <img class="w-5 h-5 mt-8 cursor-pointer" v-if="select !== 0" @click="sel(0)"
            src="@/assets/icon/index_black.png">
        <img class="w-5 h-5 mt-8 cursor-pointer" v-else @click="sel(0)" src="@/assets/icon/index_blue.png">
        <img class="w-5 h-5 mt-8 cursor-pointer " v-if="select !== 1" @click="sel(1)"
            src="@/assets/icon/setting_black.png">
        <img class="w-5 h-5 mt-8 cursor-pointer" v-else @click="sel(1)" src="@/assets/icon/setting_blue.png">
        <div class="flex flex-col justify-center items-center absolute w-30 bg-#304156 ml-210px mt-31 py-2  text-#f4f4f5 rounded-5px z-9999"
            v-if="nav.one">
            <span class="absolute w-5 h-3 bg-#304156 top-3.5 -left-1.8 rotate-45"></span>
            <span class="my-1 cursor-pointer hover:bg-#79bbff px-3 py-1 rounded-1" v-for="(item,index) of list01" :key="item" @click="selectSetting(index)">
                {{ item }}
            </span>
        </div>
        <img class="w-5 h-5 mt-8 cursor-pointer" v-if="select !== 2" @click="sel(2)" src="@/assets/icon/pc_black.png">
        <img class="w-5 h-5 mt-8 cursor-pointer" v-else @click="sel(2)" src="@/assets/icon/pc_blue.png">
        <div class="flex flex-col justify-center items-center absolute w-30 bg-#304156 ml-210px mt-44 py-2  text-#f4f4f5 rounded-5px z-9999"
            v-if="nav.two">
            <span class="absolute w-5 h-3 bg-#304156 top-3.5 -left-1.8 rotate-45"></span>
            <span class="my-1 cursor-pointer hover:bg-#79bbff px-3 py-1 rounded-1" v-for="item in list02" :key="item">
                {{ item }}
            </span>
        </div>
        <img class="w-5 h-5 mt-8 cursor-pointer" v-if="select !== 3" @click="sel(3)"
            src="@/assets/icon/gongju_black.png">
        <img class="w-5 h-5 mt-8 cursor-pointer" v-else @click="sel(3)" src="@/assets/icon/gongju_blue.png">
    </div>
</template>

<script setup>
import { ref,onMounted } from 'vue'
import emitter from '@/bus' //引入传值组件
import { useCounterStore } from '@/store/counter' //pinia库
const user = useCounterStore()
const select = ref(0)
const nav = ref({
    one: false,
    two: false
})
const list01 = ['用户管理', '角色管理', '菜单管理', '部门管理', '岗位管理', '字典管理']
const list02 = ['在线用户', '定时任务', '数据监控', '服务监控']

onMounted(() => {
    closeNav();
})
//打开弹出框
function sel(params) {
    nav.value.one = false
    nav.value.two = false
    select.value = params
    if(params===0){
        user.currentIndex=0
    }else if (params === 1) {
        nav.value.one = true
        emitter.emit('showMask', 1)
    } else if (params === 2) {
        nav.value.two = true
        emitter.emit('showMask', 1)
    }
}
//关闭弹出框
function closeNav() {
    emitter.off('leftNav');
    emitter.on('leftNav', (res) => {
        nav.value.one = res
        nav.value.two = res
    })
}
//跳转到指定页面
function selectSetting(i) {
    nav.value.one = false
    nav.value.two = false
    if (i===0) {
        user.currentIndex=1
    }
}
</script>

<style lang="scss" scoped>
.ceshi3 {
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: absolute;
    width: 100px;
    background-color: #304156;
    margin-left: calc(180px + 2vw);
    margin-top: 175px;
    padding: 8px 0 8px 30px;
    color: #f4f4f5;
    border-radius: 5px;
}
</style>