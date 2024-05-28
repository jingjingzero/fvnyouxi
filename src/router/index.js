/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:56:01
 * @LastEditTime: 2024-05-28 10:32:06
 */
import { createRouter, createWebHashHistory } from 'vue-router'
const routes = [
  { path: '/', redirect: { name: "index" }, },
  {
    path: '/index01', name: "index", component: () => import('@/pages/index.vue'),
  },
  {
    path: '/index02', component: () => import('@/components/index02.vue'),
  },
  {
    path: '/page01', component: () => import('@/components/page01.vue'),
  },
  {
    path: '/login', name:"登录页面", component: () => import('@/views/login.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(), //hash模式 ,还有history模式
  //如果想用history就把createWebHashHistory改成createWebHistory
  routes,
})
export default router