/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:50:23
 * @LastEditTime: 2025-04-15 17:00:27
 */
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { useCounterStore } from '@/store/counter-store'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import { ElConfigProvider } from 'element-plus'
// 💬 Message 系列改为全局引入样式：按需引入时显式 import 的 ElMessage API 不会自动带样式，
//    会导致构建产物里 message 变体样式（--success/--warning 等）缺失、地牢拾取提示不显示
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
import 'uno.css'
import 'animate.css';
import './main.css'; // 引入全局 CSS 文件
import apis from '@/axios/apis'
import VConsole from 'vconsole';
// element-plus 已按需引入（unplugin-vue-components + unplugin-auto-import），只注册用到的图标
import {
    CaretBottom, InfoFilled, ZoomIn, ZoomOut, FullScreen, Star, Coin, Clock
} from "@element-plus/icons-vue";
// if (process.env.NODE_ENV === 'development') {
//   new VConsole(); // 页面底部会出现可拖动的小控制台
// }
const pinia = createPinia()
window.__pinia = pinia // 🎯 暴露 pinia 实例，供 counter.js 天赋热刷新事件使用
pinia.use(piniaPluginPersistedstate)
// element-plus 按需引入后不再全量 app.use(ElementPlus)；
// 用 ElConfigProvider 包裹根组件，保留全局 message 配置（zIndex 防被游戏 UI 遮挡、挂载 body）
const RootApp = {
    render() {
        return h(ElConfigProvider, { message: { zIndex: 99999, appendTo: document.body } }, () => h(App))
    }
}
const app = createApp(RootApp);
// 只注册项目实际用到的 element-plus 图标
for (const [key, component] of Object.entries({ CaretBottom, InfoFilled, ZoomIn, ZoomOut, FullScreen, Star, Coin, Clock })) {
    app.component(key, component);
}

app.use(router)
app.use(pinia)
app.mount('#app')
app.config.globalProperties.$apis = apis

// 🖱️ 全局统一点击音效：只对“可交互元素”的点击播放 /music/clickS.mp3
//    - 命中下方选择器（原生控件 / 项目按钮类 / cursor-pointer / element-plus 组件）才播放；
//    - 点击空白、装饰元素、画布（场景点击）不播放，避免无效点击也响；
//    - 画布内的真实交互（对话推进等）由局部代码显式调用 playClickSound()，全局去重不重复发声
const CLICKABLE_SELECTOR = [
  // 原生可交互控件
  'button, a, input, select, textarea, label, summary, option',
  // ARIA 可交互角色
  '[role="button"], [role="menuitem"], [role="option"], [role="switch"], [role="tab"], [role="radio"], [role="checkbox"], [role="link"], [role="menu"], [role="listbox"]',
  // 可聚焦 / 可编辑
  '[tabindex], [contenteditable]',
  // 通用可点击标记（项目可点击元素常用 cursor-pointer）
  '.cursor-pointer',
  // 项目自定义按钮类
  '.mode-btn, .name-btn, .option-btn, .battle-btn, .ally-option, .zoom-btn, .close-btn, .gacha-btn, .chip-btn, .anim-btns, .item-btn, .menu-btn, .set-btn, .tab-btn, .btn, .button, .icon-btn, .switch-btn, .map-btn, .skill-btn, .card-btn, .tip-btn, .confirm-btn, .cancel-btn, .start-btn, .save-btn, .load-btn, .shop-btn, .closeBtn, .el-dialog__headerbtn',
  // element-plus 组件
  '.el-button, .el-input, .el-select, .el-checkbox, .el-radio, .el-switch, .el-slider, .el-dropdown, .el-tabs__item, .el-option, .el-pagination, .el-radio-button, .el-checkbox-button, .el-cascader, .el-date-editor, .el-color-picker, .el-rate, .el-transfer, .el-message-box__btns, .el-drawer__close-btn'
].join(', ');
let _clickStore = null;
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (!t.closest(CLICKABLE_SELECTOR)) return; // 🎯 点击没反应的地方不播放
  if (!_clickStore) _clickStore = useCounterStore(pinia);
  _clickStore.playClickSound();
}, { capture: true });
