/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 10:48:46
 * @LastEditTime: 2024-05-28 17:18:08
 */
import { defineStore } from "pinia"

export const useCounterStore = defineStore('counter', {
  state: () => {
    return {
      date:2,
      User:{
        username:null,
        password:null
      },
      tableData:[],
      currentIndex:0,//当前页面
    }
  },
  getters: {
  },
  actions: {
  },
  persist: {
    // 按需存储 state/ref
    // 修改存储中使用的键名称，默认为当前 Store的 id
    key: 'storekey',
    // 修改为 sessionStorage，默认为 localStorage
    storage: window.sessionStorage,
    // 🎉按需持久化，默认不写会存储全部
    paths: ['User'],
  },
})