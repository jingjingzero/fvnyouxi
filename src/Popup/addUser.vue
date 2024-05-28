<!--
 * @作者: 冯星悦
 * @Date: 2024-05-28 14:03:11
 * @LastEditTime: 2024-05-28 17:17:15
-->
<template>
    <div class="absolute top-0 left-0 flex items-center justify-center z-9997 w-full h-full">
        <div class="absolute z-9998 zhezhao w-full h-full" @click="closeMask"></div>
        <div class="absolute z-9999">
            <div class="w-80vw max-w-500px min-h-45vh bg-white flex rounded-md py-7 justify-center text-black z-1">
                <el-tabs v-model="activeName" class="demo-tabs" :stretch="true">
                    <div class="w-full flex items-center justify-center text-22px mb-2">新增用户</div>
                    <el-form class="pt-8  w-90% px-5%" :model="info" :rules="rules" :ref="formRef" label-width="65px">
                        <el-form-item label="用户名" prop="username">
                            <el-input v-model="info.username"></el-input>
                        </el-form-item>
                        <div class="h-3"></div>
                        <el-form-item label="地址" prop="localhost">
                            <el-input type="localhost" v-model="info.localhost"></el-input>
                        </el-form-item>
                        <div class="h-3"></div>
                        <el-form-item label="密码" prop="password">
                            <el-input type="password" v-model="info.password"></el-input>
                        </el-form-item>
                        <div class="h-7"></div>
                        <div class="flex justify-center">
                            <el-button class="flex-1 ml-15% mr-5% text-16px!" size="large" type="primary"
                                @click="addInfo">添加</el-button>
                        </div>
                    </el-form>
                </el-tabs>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import emitter from '@/bus' //引入传值组件
import { ElMessage } from 'element-plus'
import { useCounterStore } from '@/store/counter' //pinia库
const user = useCounterStore()
const info = ref({
    username: '',
    password: '',
    localhost: ''
});
//验证码
const codeUrl = ref('');

//规则
const rules = {
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
    ], localhost: [
        { required: true, message: '请输入地址', trigger: 'blur' }
    ]
};
const formRef = ref(null); // 创建对表单的引用
//隐藏
function closeMask() {
    emitter.emit('addUser', false)
}
//新增
function addInfo() {
    if (info.value.username.length === 0) {
        ElMessage({
            message: '用户名未填写.',
            type: 'warning',
        })
        return
    } else if (info.value.localhost.length === 0) {
        ElMessage({
            message: '地址未填写.',
            type: 'warning',
        })
        return
    } else if (info.value.password.length === 0) {
        ElMessage({
            message: '密码未填写.',
            type: 'warning',
        })
        return
    }
    console.log( user.tableData);
    user.tableData.push({ uid: user.tableData.length, location: info.value.localhost })
    ElMessage({
        message: '添加成功.',
        type: 'success',
    })
    emitter.emit('addUser', false)
}
</script>

<style scoped lang='scss'>
.zhezhao {
    background: rgba(0, 0, 0, 0.5);
    /* 设置黑色半透明背景 */
}
</style>