/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:50:23
 * @LastEditTime: 2024-05-27 09:43:35
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'uno.css'
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
app.use(ElementPlus)
app.mount('#app')
app.config.globalProperties.$apis = apis