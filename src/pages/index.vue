<!--
 * @作者: 冯星悦
 * @Date: 2024-05-27 16:12:13
 * @LastEditTime: 2024-05-28 16:44:48
-->
<template>
    <div class="flex w-100vw h-98vh">
        <div v-if="showMask.boolean" @click="closeMask" class="absolute top-0 left-0 w-full h-full z-8888"></div>
        <leftNav class="min-w-14 h-98vh " />
        <div class="flex flex-col flex-1">
            <topNav class="flex items-center justify-end  h-50px" />
            <index v-if="user.currentIndex===0" />
            <midTab v-else-if="user.currentIndex===1" />
        </div>
    </div>
</template>
<script setup>
import { ref,onMounted } from 'vue'
import leftNav from '@/components/leftNav.vue'
import topNav from '@/components/topNav.vue'
import midTab from '@/components/midTable.vue'
import index from '@/components/index.vue'
import emitter from '@/bus' //引入传值组件
import router from "@/router"; //引入路由
import { useCounterStore } from '@/store/counter' //pinia库
const user = useCounterStore()
const showMask = ref({
    index:0,
    boolean:false
})

onMounted(() => {
    if (user.User.username==null) { //判断用户是否登录
        router.push("./login");
        return
    }
    editMask();
})

function closeMask() {
    showMask.value.boolean=false
    if (showMask.value.index===1) {
        emitter.emit('leftNav',false)
    }else if(showMask.value.index===2){
        emitter.emit('TopNav',false)
    }
}

function editMask() { //隐藏展示遮罩
    emitter.off('showMask');
    emitter.on('showMask',(res)=>{
        showMask.value.boolean = true; //隐藏显示
        showMask.value.index=res;//判断来源
    })
}
</script>

<style scoped>

</style>