/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:56:01
 * @LastEditTime: 2025-04-20 14:56:16
 */
import { createRouter, createWebHashHistory } from 'vue-router'
const routes = [
  { path: '/', redirect: { name: "index" }, },
  {
    path: '/index01', name: "index", component: () => import('@/pages/index.vue'),
  },
  {
    path: '/searchIndex', name: "searchIndex", component: () => import('@/pages/searchIndex.vue'),
  },
  {
    path: '/ceshi', name: "ceshi", component: () => import('@/pages/ceshi.vue'),
  },
  {
    path: '/ceshi1', name: "ceshi1", component: () => import('@/pages/ceshi1.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(), //hash模式 ,还有history模式
  //如果想用history就把createWebHashHistory改成createWebHistory
  routes,
})
export default router