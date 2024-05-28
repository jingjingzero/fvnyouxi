<!--
 * @作者: 冯星悦
 * @Date: 2024-05-27 17:23:57
 * @LastEditTime: 2024-05-28 17:28:34
-->
<template>
    <div class="pt-4 pl-4 flex flex-col box-border">
        <el-button class="cursor-pointer" style="width: 80px;" type="primary" @click="userMask = true">新增</el-button>
        <el-table :data="user.tableData" stripe>
            <el-table-column prop="uid" label="用户编号" width="180" />
            <el-table-column prop="location" label="用户地址" width="180" />
            <el-table-column label="操作" align="center" width="auto">
                <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.$index, scope.row)">
                        编辑
                    </el-button>
                    <el-popconfirm width="220" confirm-button-text="删除" cancel-button-text="返回" hide-after="50"
                        cancel-button-type="primary" confirm-button-type="danger" :icon="InfoFilled"
                        icon-color="#F56C6C" title="是否删除该行数据?" @confirm="handleDelete(scope.$index, scope.row)">">
                        <template #reference>
                            <el-button size="small" type="danger">
                                删除
                            </el-button>
                        </template>
                    </el-popconfirm>
                    <el-button size="small" type="success">
                        创建任务
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
    <addUser v-if="userMask" class="absolute top-0 left-0" />
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox,ElMessage } from 'element-plus'
import addUser from '@/Popup/addUser.vue'
import emitter from '@/bus' //引入传值组件
import { useCounterStore } from '@/store/counter' //pinia库
const user = useCounterStore()
const userMask = ref(false)
onMounted(() => {
    closeMask()
    user.tableData = [
        {
            uid: 0,
            location: '广东省'
        },
        {
            uid: 1,
            location: '广东省'
        },
        {
            uid: 2,
            location: '广东省'
        }
    ]
})
//关闭弹出框
function closeMask() {
    emitter.off('addUser');
    emitter.on('addUser', (res) => {
        userMask.value = false
    })
}
function handleDelete(index, row) {
    console.log(index, row);
    user.tableData.splice(index, 1)
    ElMessage({
        message: '删除成功.',
        type: 'success',
    })
}
const open = () => {
}


</script>