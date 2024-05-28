<!--
 * @作者: 冯星悦
 * @Date: 2024-05-27 17:00:56
 * @LastEditTime: 2024-05-28 16:48:42
-->
<template>
    <div class="border border-solid border-#F0F2F5">
        <img class="w-10 h-10 cursor-pointer mr-5" src="@/assets/logo/logo1.png" @click="emitShow">
        <div class=" flex flex-col py-1.75 absolute text-13.5px border border-solid border-#F0F2F5 mt-45 z-9999 mr-5" v-if="infoShow">
            <span class="triangle rotate-45 absolute w-2 h-2 -mt-2.65 ml-15 bg-white"></span>
            <span class="w-20 pt-1 pb-1 mb-2 flex justify-center cursor-pointer hover:bg-#79bbff hover:text-white">个人中心</span>
            <span class="w-20 pt-1 pb-1 mb-1 flex justify-center cursor-pointer hover:bg-#79bbff hover:text-white">布局设置</span>
            <span class="w-20 pt-1 pb-1 mt-1  flex justify-center  border-0 border-t-1 border-solid border-#F0F2F5 cursor-pointer hover:bg-#79bbff hover:text-white" @click="userQuit">退出登录</span>
        </div>
    </div>
</template>

<script setup>
import {ref,onMounted} from 'vue'
import emitter from '@/bus' //引入传值组件
import { useCounterStore } from '@/store/counter' //pinia库
import { ElMessage } from 'element-plus'
import router from "@/router"; //引入路由
const user = useCounterStore()
const infoShow = ref(false)
onMounted(() => {
    closeShow()
})
function closeShow() {
    emitter.off('TopNav');
    emitter.on('TopNav', (res) => {
        infoShow.value = res
    })
}
function emitShow() {
    infoShow.value=true
    emitter.emit('showMask', 2)
}
function userQuit() {
    ElMessage.error('账号已登出.');
    user.User.username=null;
    user.User.password=null;
    router.replace("./login");
}
</script>

<style scoped>
.triangle{
    border-top: 1.5px solid #F0F2F5;
    border-left: 1.5px solid #F0F2F5;
}
</style>