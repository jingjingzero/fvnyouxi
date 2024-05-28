/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:50:23
 * @LastEditTime: 2024-05-28 09:44:18
 */
import { defineConfig,loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
// 添加路径别名@
import path from 'path'
import Unocss from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      vue(),
      Unocss()
    ],
    base: "./",
    // 添加如下，配置路径别名
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    // 环境变量
    define: {
      // 接口地址
      IP_ADDRESS_WEB: JSON.stringify(env.VITE_BASE_URL),
    },
  }
})
