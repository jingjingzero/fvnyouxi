<!--
 * @作者: 冯星悦
 * @Date: 2024-05-27 09:22:51
 * @LastEditTime: 2024-05-27 14:29:48
-->
<template>
    <div class="flex w-80vw my-10vh mx-10vw">
        <div class="flex flex-col">
            <div class="flex items-center mb-10px">
                <el-input v-model="info.subject" @input="(event) => validateInput(event, 0)" style="width: 300px;"
                    placeholder="请输入标题" />
                <span :style="{ color: tipInfo.colorOne }" class="text-13px ml-2 ">{{ tipInfo.messOne }}</span>
            </div>
            <div class="absolute mt-1 -ml-12" :style="{ color: warn.subject }"><span class="text-red">*</span>标题</div>
            <div class="absolute mt-13 -ml-12" :style="{ color: warn.content }"><span class="text-red">*</span>内容
            </div>
            <div class="absolute mt-88 -ml-12" :style="{ color: warn.tags }"><span class="text-red">*</span>标签</div>
            <!-- 富文本 -->
            <div style="height: 250px;width: 40vw;" ref="editor" />
            <!-- 标签 -->
            <div class="mt-4 mb-3 h-6 flex items-center">
                <input @input="(event) => validateInput(event, 1, 0)" v-model="info.tags[0]" class="w-33 h-full ipt"
                    type="text">
                <input @input="(event) => validateInput(event, 1, 1)" v-model="info.tags[1]" class="w-33 h-full ipt"
                    type="text">
                <input @input="(event) => validateInput(event, 1, 2)" v-model="info.tags[2]" class="w-33 h-full ipt1"
                    type="text">
                <span :style="{ color: tipInfo.colorTwo }" class="text-13px ml-2 ">{{ tipInfo.messTwo }}</span>
            </div>
            <button
                class="flex items-center justify-center box-border w-94.88px h-44px p-11px px-19px bg-#ff4400 text-white text-17.5px border-none rounded-5px mt-10px cursor-pointer"
                @click="getContent">
                提交
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue';
import { ElNotification, ElMessage } from 'element-plus'
import Quill from 'quill';
const { proxy } = getCurrentInstance()//api
const editor = ref(null);
let quill;
const warn = ref({
    subject: 'black',
    content: 'black',
    tags: 'black'
})
const formCheck = ref({
    subject: false,//判断标题是否正确
    tags: false //判断标签是否正确
})
const info = ref({
    subject: '',//标题
    content: '',//内容
    tags: ['', '', ''],//标签
    id: ''//id
})
const tipInfo = ref({
    messOne: '标题不能为空',
    colorOne: '#909399',
    messTwo: '标签至少填1个',
    colorTwo: '#909399',
})
onMounted(() => {
    quill = new Quill(editor.value, {
        theme: 'snow' // 或其他主题
    });
});

let time;
function validateInput(event, i, param) {
    clearTimeout(time)
    time = setTimeout(() => {
        if (i === 0) {
            console.log(event);
            clue(event, 0)
        } else if (i === 1) {
            if (param === 0) {
                clue(info.value.tags[0], 1, param)
            } else if (param === 1) {
                clue(info.value.tags[1], 1, param)
            } else {
                clue(info.value.tags[2], 1, param)
            }
        }
    }, 200);
}
// 检验提示
function clue(i, subject, param) {
    if (subject === 1) {
        // 标签内值不能相等
        if (info.value.tags[param] !== '') {
            if (param === 0 && (info.value.tags[0] === info.value.tags[1] || info.value.tags[0] === info.value.tags[2])) {
                tipInfo.value.messTwo = '标签有重复'
                tipInfo.value.colorTwo = '#F56C6C'
                formCheck.value.tags = false
                return
            } else if (param === 1 && (info.value.tags[1] === info.value.tags[0] || info.value.tags[1] === info.value.tags[2])) {
                tipInfo.value.messTwo = '标签有重复'
                tipInfo.value.colorTwo = '#F56C6C'
                formCheck.value.tags = false
                return
            } else if (param === 2 && (info.value.tags[2] === info.value.tags[0] || info.value.tags[2] === info.value.tags[1])) {
                tipInfo.value.messTwo = '标签有重复'
                tipInfo.value.colorTwo = '#F56C6C'
                formCheck.value.tags = false
                return
            }
        }
    }
    if (i.length === 0) {
        const check = info.value.tags.every((item) => {
            return item == ''
        })
        if (!check && subject === 1) {
            tipInfo.value.messTwo = '正确'
            tipInfo.value.colorTwo = '#67C23A'
            formCheck.value.tags = true
        }
        else {
            switch (subject) {
                case 0:
                    tipInfo.value.messOne = '标题不能为空'
                    tipInfo.value.colorOne = '#F56C6C'
                    formCheck.value.subject = false
                    break;
                case 1:
                    tipInfo.value.messTwo = '标签不能为空'
                    tipInfo.value.colorTwo = '#F56C6C'
                    formCheck.value.tags = false
                    break;
            }
        }
    } else if (i.length < 5) {
        switch (subject) {
            case 0:
                tipInfo.value.messOne = '标题太短了'
                tipInfo.value.colorOne = '#E6A23C'
                formCheck.value.subject = false
                break;
            case 1:
                tipInfo.value.messTwo = '标签太短了'
                tipInfo.value.colorTwo = '#E6A23C'
                formCheck.value.tags = false
                break;
        }
    } else {
        switch (subject) {
            case 0:
                tipInfo.value.messOne = '正确'
                tipInfo.value.colorOne = '#67C23A'
                formCheck.value.subject = true
                break;
            case 1:
                tipInfo.value.messTwo = '正确'
                tipInfo.value.colorTwo = '#67C23A'
                formCheck.value.tags = true
                break;
        }
    }
}
const getContent = () => {
    // console.log(quill.root.innerHTML);
    // console.log(quill.root.innerText);
    // console.log('长度=', quill.root.innerText.length);
    warn.value.subject = 'black'
    warn.value.content = 'black'
    warn.value.tags = 'black'
    if (!formCheck.value.subject) {
        warn.value.subject = '#F56C6C'
        ElNotification({
            title: '错误',
            message: '标题有误',
            type: 'error',
            duration: 1500
        })
        return
    } else if (quill.root.innerText.length < 6) {
        warn.value.content = '#F56C6C'
        ElNotification({
            title: '错误',
            message: '内容字数不合规定,应为6-10000个汉字!',
            type: 'error',
            duration: 1500
        })
        return
    } else if (!formCheck.value.tags) {
        warn.value.tags = '#F56C6C'
        ElNotification({
            title: '错误',
            message: '标签有误',
            type: 'error',
            duration: 1500
        })
        return
    }
    info.value.content=quill.root.innerHTML
    ElMessage({
        message: '提交成功.',
        type: 'success',
    })
    console.log(info.value);
    proxy.$apis.message(info.value).then(res => {
        console.log(res);
    })
};
</script>


<style scoped lang='scss'>
.ipt1:focus {
    outline: none;
    border: 1px solid rgba(82, 168, 236, 0.8)
}

.ipt:focus {
    outline: none;
    border: 1px solid rgba(82, 168, 236, 0.8)
}

.ipt {
    border: 1px solid #D4D4D4;
    border-right: none;
    padding: 0 5px;
}

.ipt1 {
    border: 1px solid #D4D4D4;
    padding: 0 5px;
}
</style>