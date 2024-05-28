<!--
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:56:44
 * @LastEditTime: 2024-05-27 09:23:43
-->
<template>
    <div class="bg-red">index01</div>
    <button @click="tiaoz(0)" class="ceshi">跳转</button>
    <button @click="tiaoz(1)">测试页面1</button>
    <index02></index02>
</template>
<script setup>
import router from "@/router"; //引入路由
import emitter from '@/bus'
import index02 from '@/components/index02.vue'
function tiaoz(i) {
    // router.push("./index02");
    if (i==0) {
        emitter.emit('message','你好世界')
    }else if(i==1){
        router.push("./page01");
    }
}
</script>

<style scoped lang="scss">
.ceshi{
    color: red;
}
</style>