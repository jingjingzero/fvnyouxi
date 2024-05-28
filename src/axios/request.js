/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 11:01:17
 * @LastEditTime: 2024-05-28 09:50:33
 */
import axios from 'axios'

const service = axios.create({
    // axios中请求配置有baseURL选项，表示请求URL公共部分
    //baseURL: 'http://124.222.142.23:8889',
    baseURL: IP_ADDRESS_WEB,
    // 超时
    timeout: 30000
})

service.interceptors.request.use(cofnig => {
    return cofnig
}, err => {
    Promise.reject(err)
})

service.interceptors.response.use(res => {
    return res
}, err => {
    Promise.reject(err)
})
export default service