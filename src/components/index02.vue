<!--
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:57:07
 * @LastEditTime: 2024-05-20 11:05:25
-->
<template>
    <div>你好</div>
    <div>{{ message }}</div>
</template>

<script setup>
import {ref,onMounted} from 'vue'
import emitter from '@/bus'
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
const message = ref('')
onMounted(() => {
    console.log(user.date);
    addmessage()
})
function addmessage() {
    emitter.off('message');
    emitter.on('message',(res)=>{
        console.log(res);
        message.value =res
    })
}
</script>