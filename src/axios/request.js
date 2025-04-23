/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 11:01:17
 * @LastEditTime: 2025-03-31 11:33:25
 */
import axios from 'axios';
import { useCounterStore } from "@/store/counter"; // pinia库
import { ElMessage } from "element-plus";
import router from "@/router"; //引入路由

// 创建一个 axios 实例，用于80端口
export const service = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
    timeout: 12000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 创建一个 axios 实例，用于90端口
export const localservice = axios.create({
    baseURL: "",
    timeout: 12000
});

// 请求拦截器，用于在请求发送前做一些处理
service.interceptors.request.use(config => {
    const user = useCounterStore();
    if (user?.token) {
        config.headers['Authorization'] = 'Bearer ' + user.token;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// 响应拦截器，用于在接收到响应数据后做一些处理
service.interceptors.response.use(response => {
    if (response.data && (response.data.code == '500' || response.data.code == '401')) {
        if (response.data.code == '401') {
            const user = useCounterStore();
            user.User.username = null;
            router.push({ name: "login" });
        } else {
            ElMessage.error('异常：' + (response.data.message || response.data.msg || '未知错误'));
        }
    }
    return response;
}, error => {
    ElMessage.error('服务器响应超时')
    return Promise.reject(error);
});

// 请求拦截器，用于在请求发送前做一些处理
localservice.interceptors.request.use(config => {
    const user = useCounterStore();
    if (user?.token) {
        config.headers['Authorization'] = 'Bearer ' + user.token;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// 响应拦截器，用于在接收到响应数据后做一些处理
localservice.interceptors.response.use(response => {
    if (response.data && response.data.code == '500') {
        ElMessage.error('服务器返回异常：' + (response.data.message || '未知错误'));
    }
    return response;
}, error => {
    ElMessage.error('服务器响应超时')
    return Promise.reject(error);
});

export default { service, localservice };