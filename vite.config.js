import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      Unocss()
    ],
    base: "./",
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 8081,
      proxy: {
        [env.VITE_BASE_URL]: {
          target: env.VITE_LOGIN_NAME,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(new RegExp(`^${env.VITE_BASE_URL}`), "")
        }
      },
    },
  }
})
