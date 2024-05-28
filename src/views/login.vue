<!--
 * @作者: 冯星悦
 * @Date: 2024-05-28 08:59:38
 * @LastEditTime: 2024-05-28 17:31:55
-->
<template>
    <img class="absolute w-100vw h-40vh bg-cover md:hidden" src="@/assets/images/login-back.jpg">
    <img class="absolute w-100vw h-100vh bg-cover max-md:hidden" src="@/assets/images/login-background.jpg">
    <div class="absolute w-full h-full flex z-1 justify-center items-center select-none">
        <!-- PC端 -->
        <div class="flex w-200 h-100 bg-red rounded-2 max-md:hidden">
            <!-- 注册 -->
            <div class="w-50% bg-white rounded-l-2 flex flex-col items-center">
                <div class="text-#606266 text-20px mt-5">歌捷后台注册系统</div>
                <el-form class="pt-8  w-85%" :model="register" :rules="rules" label-width="70px">
                    <el-form-item label="用户名" prop="username">
                        <el-input v-model="register.username"></el-input>
                    </el-form-item>
                    <div class="h-2"></div>
                    <el-form-item label="密码" prop="password">
                        <el-input type="password" v-model="register.password"></el-input>
                    </el-form-item>
                    <div class="h-2"></div>
                    <div class="flex h-32px flex-wrap">
                        <el-form-item label="验证码" prop="code">
                            <el-input class="w-35!" type="code" v-model="register.code"></el-input>
                        </el-form-item>
                        <div class="flex-1  ml-4 h-32px border border-solid border-#e9e9eb">
                            <img v-if="codeUrl" class="w-full h-full cursor-pointer" :src="codeUrl" @click="getCodeImg" />
                        </div>
                    </div>
                    <div class="h-2"></div>
                    <el-form-item>
                        <el-button class="w-48 mt-6" type="primary" @click="submitForm">注册</el-button>
                    </el-form-item>
                </el-form>
            </div>
            <!-- 切换滑块 -->
            <div :style="{ transform: `translateX(${offset}px)` }"
                class=" absolute w-100 h-100 flex items-center justify-center z-9999">
                <img class="absolute w-100 h-100 bg-cover" src="@/assets/images/login-mask.jpg" />
                <el-icon class="cursor-pointer rounded-full p-0.75 border-2 border-solid border-white" color="white"
                    size="24" @click="toggle">
                    <Right v-if="!status" />
                    <Back v-else />
                </el-icon>
            </div>
            <!-- 登录 -->
            <div class="w-50% bg-white rounded-r-2 flex flex-col items-center">
                <div class="text-#606266 text-20px mt-5">歌捷后台登录系统</div>
                <el-form class="pt-8  w-85%" :model="logon" :rules="rules" label-width="70px">
                    <el-form-item label="用户名" prop="username">
                        <el-input v-model="logon.username"></el-input>
                    </el-form-item>
                    <div class="h-2"></div>
                    <el-form-item label="密码" prop="password">
                        <el-input type="password" v-model="logon.password"></el-input>
                    </el-form-item>
                    <div class="h-2"></div>
                    <div class="flex h-32px flex-wrap">
                        <el-form-item label="验证码" prop="code">
                            <el-input @keydown.enter="submitForm" class="w-35!" type="code" v-model="logon.code"></el-input>
                        </el-form-item>
                        <div class="flex-1 ml-4 h-32px border border-solid border-#e9e9eb">
                            <img v-if="codeUrl" class="w-full h-full cursor-pointer" :src="codeUrl" @click="getCodeImg" />
                        </div>
                    </div>
                    <div class="h-2"></div>
                    <el-form-item>
                        <el-button class="w-48 mt-6" type="primary" @click="submitForm">登录</el-button>
                    </el-form-item>
                </el-form>
            </div>
        </div>
        <!-- 移动端 -->
        <div
            class="flex w-90vw h-70vh mt-5vh bg-white md:hidden rounded-t-3 flex-col border-0.5 border-solid border-#e9e9eb">
            <el-tabs v-model="activeName" class="demo-tabs" :stretch="true" @tab-click="handleClick">
                <el-tab-pane label="登录" name="first">
                    <el-form class="pt-8  w-90% px-5%" :model="logon" :rules="rules" label-width="70px">
                        <el-form-item label="用户名" prop="username">
                            <el-input v-model="logon.username"></el-input>
                        </el-form-item>
                        <div class="h-2"></div>
                        <el-form-item label="密码" prop="password">
                            <el-input type="password" v-model="logon.password"></el-input>
                        </el-form-item>
                        <div class="h-2"></div>
                        <div class="flex h-32px flex-wrap">
                            <el-form-item label="验证码" prop="code">
                                <el-input  @keydown.enter="submitForm" class="w-35!" type="code" v-model="logon.code"></el-input>
                            </el-form-item>
                            <div class="flex-1 ml-4 h-32px max-w-35 border border-solid border-#e9e9eb">
                                <img class="w-full h-full cursor-pointer" :src="codeUrl" @click="getCodeImg" />
                            </div>
                        </div>
                        <div class="h-2"></div>
                        <el-form-item>
                            <el-button class="w-100% mt-6" type="primary" @click="submitForm">登录</el-button>
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
                <el-tab-pane label="注册" name="second">
                    <el-form class="pt-8  w-90% px-5%" :model="register" :rules="rules" label-width="70px">
                        <el-form-item label="用户名" prop="username">
                            <el-input v-model="register.username"></el-input>
                        </el-form-item>
                        <div class="h-2"></div>
                        <el-form-item label="密码" prop="password">
                            <el-input type="password" v-model="register.password"></el-input>
                        </el-form-item>
                        <div class="h-2"></div>
                        <div class="flex h-32px flex-wrap">
                            <el-form-item label="验证码" prop="code">
                                <el-input class="w-35!" type="code" v-model="register.code"></el-input>
                            </el-form-item>
                            <div class="flex-1  ml-4 h-32px max-w-35 border border-solid border-#e9e9eb">
                                <img class="w-full h-full cursor-pointer" :src="codeUrl" @click="getCodeImg" />
                            </div>
                        </div>
                        <div class="h-2"></div>
                        <el-form-item>
                            <el-button class="w-100% mt-6" type="primary" @click="submitForm">注册</el-button>
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue';
import { ElMessage } from 'element-plus'
import router from "@/router"; //引入路由
import { useCounterStore } from '@/store/counter' //pinia库
const user = useCounterStore()
const { proxy } = getCurrentInstance()
const activeName = ref('first')
const logon = ref({ //登录信息
    username: '',
    password: '',
    code: '',
    uuid: ''
})
const register = ref({ //注册信息
    username: '',
    password: '',
    code: '',
    uuid: ''
});
const offset = ref(0);
const status = ref(false) //false=登录界面，true=注册界面
const handleClick = (tab, event) => {
    console.log(tab, event)
}
const toggle = () => {
    if (offset.value < 400) {
        status.value = true
        ToRight()
    } else {
        status.value = false
        ToLeft()
    }
}
function ToRight() {
    setTimeout(() => {
        offset.value += 12 //控制速度
        if (offset.value < 400) {
            ToRight()
        }
    }, 10);
}
function ToLeft() {
    setTimeout(() => {
        offset.value -= 12
        if (offset.value > 0) {
            ToLeft()
        }
    }, 10);
}
onMounted(() => {
    getCodeImg()
})

//验证码
const codeUrl = ref('');

//规则
const rules = {
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
    ], code: [
        { required: true, message: '请输入验证码', trigger: 'blur' }
    ]
};

//获取验证码
function getCodeImg() {
    proxy.$apis.getCodeImg().then(res => {
        if (res.data.code !== 200) {
            ElMessage.error('服务器访问错误.')
            return
        }
        logon.value.uuid = res.data.uuid
        register.value.uuid = res.data.uuid
        codeUrl.value = "data:image/gif;base64," + res.data.img;
    })
}
//提交
const submitForm =() => {
    console.log(register.value);
    console.log(logon.value);
    console.log(status.value, window.innerWidth);
    if (!status.value) { //false为登录页面
        if (logon.value.username.length == 0) {
            ElMessage({
                message: '用户名为空.',
                type: 'warning',
            })
            return
        } else if (logon.value.password.length == 0) {
            ElMessage({
                message: '密码未填写.',
                type: 'warning',
            })
            return
        } else if (logon.value.code.length == 0) {
            ElMessage({
                message: '验证码未填写.',
                type: 'warning',
            })
            return
        }
        proxy.$apis.login(logon.value).then(res => {
            if (res.data.code === 200) {
                ElMessage({
                    message: '登录成功.',
                    type: 'success',
                })
                console.log(user.User);
                user.currentIndex=0
                user.User.username = logon.value.username
                user.User.password = logon.value.password
                router.push("./index01");
            } else {
                ElMessage.error(res.data.msg)
                logon.value.password = ''
                logon.value.code = ''
            }
        })
    }
};
</script>

<style lang="scss" scoped>
.ceshi {
    border-radius: 10px;
}
</style>
