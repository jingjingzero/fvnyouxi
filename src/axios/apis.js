/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 11:01:17
 * @LastEditTime: 2024-05-28 16:34:39
 */
import service from './request'
export default {
    message(data) {
        return service({
            method: 'post',
            url: '/wanshengjiexg',
            data
        })
    },
    //获取验证码
    getCodeImg() {
        return service({
            method: 'get',
            url: '/captchaImage'
        })
    },
    //登录
    login(data) {
        return service({
            method: 'post',
            url: '/login',
            data
        })
    },
    //测试
    ceshi() {
        return service({
            method: 'post',
            url: '/ceshi'
        })
    }
}