/**
 * 预加载脚本：通过 contextBridge 暴露桌面端能力
 * 渲染进程可用 window.desktop.toggleFullscreen() 切换全屏
 */
const { contextBridge, ipcRenderer } = require('electron');

// 事件监听辅助：安全地订阅主进程推送，并返回取消函数
function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('desktop', {
  // 切换全屏，返回切换后的全屏状态
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  // 查询当前是否全屏
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  // 是否为桌面（Electron）环境
  isDesktop: true,

  // =====================
  // 自动更新 API
  // =====================
  updater: {
    // 检查更新（需由用户点击触发）
    check: () => ipcRenderer.invoke('updater:check'),
    // 下载更新
    download: () => ipcRenderer.invoke('updater:download'),
    // 退出并安装
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    // 订阅更新状态事件（checking/available/not-available/downloaded/error）
    onStatus: (cb) => subscribe('updater:status', cb),
    // 订阅下载进度
    onProgress: (cb) => subscribe('updater:progress', cb),
    // 订阅错误
    onError: (cb) => subscribe('updater:error', cb),
  },
});
