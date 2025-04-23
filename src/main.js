/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:50:23
 * @LastEditTime: 2025-04-15 17:00:27
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'uno.css'
import 'animate.css';
import './main.css'; // 引入全局 CSS 文件
import apis from '@/axios/apis'
import 'element-plus/dist/index.css'
// 引入element-plus icon
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App);
// 引入element-plus icon
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}
app.use(router)
app.use(pinia)
app.use(ElementPlus, {
    locale: zhCn,
})
app.mount('#app')
app.config.globalProperties.$apis = apis