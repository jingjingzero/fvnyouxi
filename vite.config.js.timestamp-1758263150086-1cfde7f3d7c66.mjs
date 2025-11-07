// vite.config.js
import { defineConfig, loadEnv } from "file:///C:/Users/%E5%86%AFmr/Desktop/%E5%AE%88%E6%9C%9B/%E6%B8%B8%E6%88%8F%E5%99%A8/vue/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/%E5%86%AFmr/Desktop/%E5%AE%88%E6%9C%9B/%E6%B8%B8%E6%88%8F%E5%99%A8/vue/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import Unocss from "file:///C:/Users/%E5%86%AFmr/Desktop/%E5%AE%88%E6%9C%9B/%E6%B8%B8%E6%88%8F%E5%99%A8/vue/node_modules/unocss/dist/vite.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\\u51AFmr\\Desktop\\\u5B88\u671B\\\u6E38\u620F\u5668\\vue";
var vite_config_default = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      vue(),
      Unocss()
    ],
    base: "./",
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "src")
      }
    },
    server: {
      host: "0.0.0.0",
      port: 8081,
      proxy: {
        [env.VITE_BASE_URL]: {
          target: env.VITE_LOGIN_NAME,
          changeOrigin: true,
          ws: true,
          rewrite: (path2) => path2.replace(new RegExp(`^${env.VITE_BASE_URL}`), "")
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxcdTUxQUZtclxcXFxEZXNrdG9wXFxcXFx1NUI4OFx1NjcxQlxcXFxcdTZFMzhcdTYyMEZcdTU2NjhcXFxcdnVlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxcdTUxQUZtclxcXFxEZXNrdG9wXFxcXFx1NUI4OFx1NjcxQlxcXFxcdTZFMzhcdTYyMEZcdTU2NjhcXFxcdnVlXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy8lRTUlODYlQUZtci9EZXNrdG9wLyVFNSVBRSU4OCVFNiU5QyU5Qi8lRTYlQjglQjglRTYlODglOEYlRTUlOTklQTgvdnVlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCBVbm9jc3MgZnJvbSAndW5vY3NzL3ZpdGUnXHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJylcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgdnVlKCksXHJcbiAgICAgIFVub2NzcygpXHJcbiAgICBdLFxyXG4gICAgYmFzZTogXCIuL1wiLFxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogJzAuMC4wLjAnLFxyXG4gICAgICBwb3J0OiA4MDgxLFxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgIFtlbnYuVklURV9CQVNFX1VSTF06IHtcclxuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfTE9HSU5fTkFNRSxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIHdzOiB0cnVlLFxyXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZShuZXcgUmVnRXhwKGBeJHtlbnYuVklURV9CQVNFX1VSTH1gKSwgXCJcIilcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH1cclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2VSxTQUFTLGNBQWMsZUFBZTtBQUNuWCxPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBQ25CLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFNBQVMsS0FBSyxNQUFNO0FBQ2pELFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUUzQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxJQUFJO0FBQUEsTUFDSixPQUFPO0FBQUEsSUFDVDtBQUFBLElBQ0EsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQ3BDO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0wsQ0FBQyxJQUFJLGFBQWEsR0FBRztBQUFBLFVBQ25CLFFBQVEsSUFBSTtBQUFBLFVBQ1osY0FBYztBQUFBLFVBQ2QsSUFBSTtBQUFBLFVBQ0osU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksSUFBSSxhQUFhLEVBQUUsR0FBRyxFQUFFO0FBQUEsUUFDekU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
