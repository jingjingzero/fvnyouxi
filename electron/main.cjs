/**
 * 桌面版主进程（Electron）
 * - 内置本地 HTTP 静态服务器，加载 Vite 构建产物 dist/
 * - 用 http://127.0.0.1 加载而非 file://，确保 Web Worker / 绝对路径资源 / 音频全部可用
 * - 支持全屏切换、窗口控制、自动更新
 */
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// =====================
// 路径解析
// =====================
// 开发模式：直接用项目根目录下的 dist
// 打包模式：dist 通过 extraResources 复制到 resources/dist
const isDev = !app.isPackaged;
const distRoot = isDev
  ? path.join(app.getAppPath(), 'dist')
  : path.join(process.resourcesPath, 'dist');

// =====================
// MIME 映射
// =====================
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.skel': 'application/octet-stream',
  '.atlas': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// 确保路径安全：阻止目录穿越
function safeResolve(base, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  let filePath = path.normalize(path.join(base, decoded));
  if (!filePath.startsWith(base)) return null;
  return filePath;
}

// =====================
// 本地静态服务器
// =====================
// ⚠️ 固定端口：不要用随机端口（listen(0)）！
// 存档存在 localStorage，而 localStorage 是按「来源 origin = 协议+主机+端口」隔离的。
// 如果端口每次启动都随机变化，localStorage 就相当于换了网站，存档会“丢失”。
// 固定端口能保证每次启动来源一致，存档才能稳定保留。
const STATIC_PORT = 17632;

function createStaticServer() {
  const server = http.createServer((req, res) => {
    // 只处理 GET / HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }

    let urlPath = req.url === '/' ? '/index.html' : req.url;
    let filePath = safeResolve(distRoot, urlPath);
    if (!filePath) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    // 目录 → 找 index.html
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch (e) {
      /* ignore */
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA 兜底（本项目是 hash 路由，一般不会走到，但保留以策安全）
        const fallback = path.join(distRoot, 'index.html');
        if (fs.existsSync(fallback) && filePath !== fallback) {
          fs.readFile(fallback, (_e2, html) => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          });
          return;
        }
        res.writeHead(404).end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        // 打包后资源带 hash，可放心缓存；html 不缓存避免旧缓存
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    // 固定端口；若被占用则顺延（极小概率），并打印实际端口便于排查
    const tryListen = (port, retries = 5) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
          console.warn(`[静态服务器] 端口 ${port} 被占用，尝试端口 ${port + 1}`);
          tryListen(port + 1, retries - 1);
        } else {
          console.error('[静态服务器] 启动失败:', err);
          throw err;
        }
      });
      server.listen(port, '127.0.0.1', () => {
        resolve({ server, port: server.address().port });
      });
    };
    tryListen(STATIC_PORT);
  });
}

let mainWindow = null;
let staticServer = null;

function createWindow(port) {
  // 打包后默认全屏启动（isDev 为 true 时保持窗口模式，方便调试）
  const isFullscreen = !isDev;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    fullscreen: isFullscreen, // 🎯 打包版默认全屏
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: '自由的彼岸',
    icon: isDev ? path.join(__dirname, '..', 'build', 'icon.png') : path.join(process.resourcesPath, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // 允许本地 http 服务器资源，保持常规 web 环境语义
      webSecurity: true,
      backgroundThrottling: false, // 后台不降频，保证音频/动画稳定
      // 🎯 使用持久化分区存储：存档(storekey/auto_save)写在独立磁盘分区里。
      // 即使端口变化，localStorage 依然保留，彻底避免“重开丢存档”。
      partition: 'persist:fvnyouxi',
    },
  });

  // 拦截外部导航，防止误开新窗口
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // 打包版：窗口就绪后强制进入全屏（兜底，确保覆盖任务栏等场景稳定生效）
  if (isFullscreen) {
    mainWindow.once('ready-to-show', () => {
      try {
        mainWindow.setFullScreen(true);
      } catch (e) {
        console.warn('[窗口] 进入全屏失败:', e);
      }
    });
  }

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  // 打开 DevTools（开发模式）
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =====================
// IPC：全屏 / 窗口控制（供渲染进程调用）
// =====================
ipcMain.handle('window:toggleFullscreen', () => {
  if (!mainWindow) return false;
  const isFull = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFull);
  return !isFull;
});

ipcMain.handle('window:isFullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// =====================
// 自动更新（electron-updater）
// =====================
// 说明：
// 1. 开发模式（npm run electron:dev）跳过，避免每次调试都触发更新检查。
// 2. 自动更新只支持「安装版」应用（NSIS 安装到 Program Files 的）。
//    - 免安装版（win-unpacked / 解压即玩）没有 app-update.yml，无法自动更新，
//      若强行调用会报 ENOENT 错误并打扰玩家，因此这里直接跳过。
//    - 判断方式：resources 下必须存在 app-update.yml（electron-updater 生成）。
function initAutoUpdater() {
  if (isDev) {
    console.log('[自动更新] 开发模式，跳过自动更新');
    return;
  }

  // ⚠️ 免安装版 / 缺更新配置：完全跳过自动更新，避免 ENOENT 报错
  const updateYml = path.join(process.resourcesPath, 'app-update.yml');
  if (!fs.existsSync(updateYml)) {
    console.log('[自动更新] 未检测到 app-update.yml（免安装版），跳过自动更新');
    return;
  }

  // 真正启用自动更新
  updaterEnabled = true;

  // 禁止自动下载，由用户确认后再下载（避免后台静默占用流量）
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  };

  // ---------- 事件监听 ----------
  autoUpdater.on('checking-for-update', () => send('updater:status', { status: 'checking' }));

  autoUpdater.on('update-available', (info) => {
    send('updater:status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    send('updater:status', { status: 'not-available', version: info?.version });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    send('updater:progress', {
      percent: Math.round(progressObj.percent * 100) / 100,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    send('updater:status', {
      status: 'downloaded',
      version: info.version,
    });
  });

  // 出错时静默记录，不打扰玩家（网络不可达/无更新源都属正常情况）
  autoUpdater.on('error', (err) => {
    console.warn('[自动更新] 错误（已忽略，不影响游戏）:', err?.message || err);
  });

  // ---------- IPC：渲染进程触发 ----------
  // 启动后延迟 3 秒静默检查一次（避免阻塞首屏加载）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.warn('[自动更新] 启动检查失败（可忽略，网络不可达时正常）:', e?.message);
    });
  }, 3000);
}

// =====================
// 自动更新 IPC（模块级注册）
// =====================
// 无论是否启用自动更新，都注册这些接口，保证渲染进程调用不会报错。
// 免安装版/未启用时，直接返回「无需更新」，静默处理。
let updaterEnabled = false; // 是否真正启用了自动更新

function registerUpdaterIpc() {
  // 检查更新（返回 { ok, message }）
  ipcMain.handle('updater:check', async () => {
    if (!updaterEnabled) {
      return { ok: true, disabled: true };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (e) {
      console.warn('[自动更新] 检查失败（已忽略）:', e?.message);
      return { ok: false, message: e?.message || String(e) };
    }
  });

  // 下载更新
  ipcMain.handle('updater:download', async () => {
    if (!updaterEnabled) {
      return { ok: false, disabled: true };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (e) {
      console.warn('[自动更新] 下载失败:', e?.message);
      return { ok: false, message: e?.message || String(e) };
    }
  });

  // 下载完成后退出并安装
  ipcMain.handle('updater:quitAndInstall', () => {
    if (updaterEnabled) {
      autoUpdater.quitAndInstall(false, true);
    }
    return { ok: true };
  });
}

// =====================
// 应用生命周期
// =====================
app.whenReady().then(async () => {
  const { server, port } = await createStaticServer();
  staticServer = server;
  createWindow(port);

  // 无条件注册自动更新 IPC（无论是否启用，保证渲染进程调用不报错）
  registerUpdaterIpc();

  // 自动更新（内部判断是否启用）
  initAutoUpdater();

  // 全屏快捷键 F11
  globalShortcut.register('F11', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
});
