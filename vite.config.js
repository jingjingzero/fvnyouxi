/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:50:23
 * @LastEditTime: 2025-04-15 15:41:59
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
    server: {
      host: '0.0.0.0', //启动Network
      port: 8081,
      proxy: {
        [env.VITE_BASE_URL]: { // 配置需要代理的路径 --> 这里的意思是代理http://localhost:80/api/后的所有路由
          target: env.VITE_LOGIN_NAME, // 目标地址 --> 服务器地址
          changeOrigin: true, // 允许跨域
          ws: true,  // 允许websocket代理
          // 重写路径 --> 作用与vue配置pathRewrite作用相同
          rewrite: (path) => path.replace(new RegExp(`^${env.VITE_BASE_URL}`), "")
        }
      },
    },
  }
})
