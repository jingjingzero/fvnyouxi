//physics.worker.js
// ========== 性能优化版：无 setTimeout，改用帧计数延迟 ==========
const syncMsg = { type: 'vxSync', vx: 0 };
const triggerMsg = { type: 'triggerEnter', index: 0 };
let globalRes = [];
let globalShadow = [];
// 🎯 阴影表面列表（主线程切图时发送）：每个表面 = { x0, x1, topY }（世界坐标，topY=顶面 y）
//    用于「阴影跟随脚下表面」：跳跃时阴影不升空（留在脚下表面），踩到二楼时阴影跟随到二楼顶面
let globalShadowSurfaces = [];
// 🎯 玩家阴影记忆：腾空/跳跃时保持上一帧的表面阴影（阴影不随升空）
const shadowPrevY = [];
// ✅ 对象池：预填充空对象，避免每帧 new {} 导致 GC
const POOL_SIZE = 256;
for (let i = 0; i < POOL_SIZE; i++) {
  globalRes[i] = { id: 0, x: 0, y: 0, bubbleX: 0, bubbleY: 0, hpX: 0, hpY: 0, showBubble: false, isNear: false, gravityVy: 0 };
  globalShadow[i] = { id: 0, x: 0, y: 0, scale: 1, alpha: 1, groundFixedY: 0 };
}
/** 对象池自动扩展：确保下标 idx 有对象，不够就 push */
function ensurePoolSlot(idx) {
  while (globalRes.length <= idx) {
    globalRes.push({ id: 0, x: 0, y: 0, bubbleX: 0, bubbleY: 0, hpX: 0, hpY: 0, showBubble: false, isNear: false, gravityVy: 0 });
    globalShadow.push({ id: 0, x: 0, y: 0, scale: 1, alpha: 1, groundFixedY: 0 });
  }
}

self.onmessage = (e) => {
  const data = e.data;

  // 🎯 阴影表面：主线程切图时推送当前地图可站立矩形（阴影跟随脚下表面用）
  if (data.type === 'setShadowSurfaces') {
    globalShadowSurfaces = data.surfaces || [];
    return;
  }

  // 玩家输入
  if (data.type === 'input') {
    const { left, right } = data.data;

    // 🎯 移动速度统一用 VH（世界单位），而不是 VW（屏幕宽度）：
    //    世界坐标本身按 VH 缩放（角色身高=27*VH、地图尺寸等都基于 VH），
    //    用 VH 才能保证移动端/电脑端的「世界位移速度」一致。
    //    用 VW 时：电脑端宽屏 VW 大→速度快，移动端窄屏 VW 小→速度慢（差好几倍）。
    //    系数 0.533 ≈ 原电脑端 0.3*VW 手感（1920屏 VW=19.2 → 0.3*19.2=5.76 ≈ 0.533*10.8=5.76）
    let vx = 0;
    const speed = 0.533 * data.VH;
    if (left) vx = -speed;
    if (right) vx = speed;

    syncMsg.vx = vx;
    self.postMessage(syncMsg);
    return;
  }

  // 问号浮动 原版字节偏移·完美还原 显示+浮动全部正常
  if (data.type === 'updateWenhao') {
    const { buffer, px, py, ACTIVE_MARK_DIST } = data;
    const view = new DataView(buffer);
    const count = view.getUint32(0, true);

    for (let i = 0; i < count; i++) {
      const off = 4 + i * 44;
      if (off + 44 > buffer.byteLength) break;

      const x = view.getFloat32(off + 0, true);
      const baseY = view.getFloat32(off + 4, true);
      let renderY = view.getFloat32(off + 8, true);
      const locked = view.getUint8(off + 12, true) === 1;
      // 还原你旧偏移：off+16 不是13！
      const en = view.getUint8(off + 16, true) === 1;
      const speed = view.getFloat32(off + 20, true);
      let dir = view.getInt8(off + 24, true);
      const maxY = view.getFloat32(off + 28, true);
      const minY = view.getFloat32(off + 32, true);
      const detectWidth = view.getFloat32(off + 36, true);
      const onlyX = view.getUint8(off + 40, true) === 1;

      const markDist = detectWidth > 0 ? detectWidth : ACTIVE_MARK_DIST;
      let inRange = false;
      const dx = Math.abs(x - px);

      if (onlyX) {
        inRange = dx <= markDist;
      } else {
        const dy = baseY - py;
        const distSq = markDist * markDist;
        const markDistSq = dx * dx + dy * dy;
        inRange = markDistSq <= distSq + 0.0001;
      }

      if (inRange && !locked && en) {
        renderY += speed * dir;
        if (renderY >= maxY) { renderY = maxY; dir = -1; }
        if (renderY <= minY) { renderY = minY; dir = 1; }
      } else {
        renderY = baseY;
        dir = 1;
      }

      // 写回你主线程读取的位置：off+25
      view.setFloat32(off + 8, renderY, true);
      view.setInt8(off + 24, dir, true);
      view.setUint8(off + 25, inRange ? 1 : 0, true);
    }

    self.postMessage({ type: 'wenhaoResult', buffer }, [buffer]);
    return;
  }

  if (data.type === 'computeAllViews') {
    const { buffer, count, VH, currentMapTopMap, currentGroundY, playerX, activeDistance, outBuffer, playerFootOffset } = data;
    const view = new DataView(buffer);

    const result = globalRes;
    const shadowList = globalShadow;

    const groundFixedY = (currentGroundY + 5) * VH;
    // 🎯 阴影参考物 = spine 角色：阴影中心精确贴在「脚下表面顶面」（站立时 = spine 视觉脚底）
    //    PLAYER_SHADOW_FOOT_GAP：玩家贴地偏移；NPC_SHADOW_FOOT_GAP：NPC 独立偏移（可分开调）
//    正数下移；负数上移；0 = 阴影中心在脚底（表面顶面）
    const PLAYER_SHADOW_FOOT_GAP = 23; // 玩家（保留当前值）
    const NPC_SHADOW_FOOT_GAP = 15;      // NPC（单独设置）
    const groundTopY = currentGroundY * VH;
    // 贴地偏移：不再叠加在表面命中分支，改为最终统一加各自 gap（见下方计算）
    const SHADOW_SURFACE_RANGE = 2; // 距脚底 VH 数内视为脚下表面（跳跃远离则不跟随）
    const topMapOffset = currentMapTopMap * VH;
    const baseYOffset = 7 * VH + topMapOffset;
    // 🧮 视距剔除的距离判断（纯数学，移到此 Worker 计算，主线程零负担）
    const dist = activeDistance > 0 ? activeDistance : Infinity;
    // ✅ 重力已由 Matter 引擎驱动（主线程 engine.gravity），Worker 不再计算重力 vy

    // ✅ 打包输出缓冲：view + shadow 全部写进一个 Float32Array，
    //    与主线程间通过 transfer 往返复用，零 GC 分配（替代 slice() 对象数组克隆）
    const out = new Float32Array(outBuffer);

    for (let i = 0; i < count; i++) {
      const o = 4 + i * 40;
      if (o + 40 > buffer.byteLength) break;

      const id = view.getUint32(o + 0, true);
      const x = view.getFloat32(o + 4, true);
      const y = view.getFloat32(o + 8, true);
      const h = view.getFloat32(o + 12, true);
      const th = view.getFloat32(o + 16, true);
      const hpOff = view.getFloat32(o + 20, true);
      const showBubble = view.getUint8(o + 24, true) === 1;
      const vy = view.getFloat32(o + 28, true);
      const isOnGround = view.getUint8(o + 32, true) === 1;
      const tf = view.getUint8(o + 33, true); // player flag（1=玩家）
      const realTopH = (th + currentMapTopMap) * VH;
      const fy = y + realTopH;
      const by = y - h + baseYOffset;
      const hy = y - hpOff * VH + topMapOffset;

      // ✅ 复用预填充对象，零 GC 分配
      ensurePoolSlot(i);
      const r = result[i];
      r.id = id;
      r.x = x;
      r.y = fy;
      r.bubbleX = x;
      r.bubbleY = by;
      r.hpX = x;
      r.hpY = hy;
      r.showBubble = showBubble;
      // 🧮 视距标记：玩家水平距离 ≤ activeDistance 为近（可见），否则为远
      r.isNear = Math.abs(x - playerX) <= dist;
      // ✅ 重力 vy 直接透传（Matter 引擎已处理重力下落），保留 isOnGround 供主线程使用
      r.gravityVy = vy;

      const airFactor = isOnGround ? 1 : Math.max(0.25, 1 - Math.abs(vy) * 0.08);
      const targetAlpha = isOnGround ? 0.35 : 0.12;

      // 🎯 阴影跟随脚下表面：实体脚底 = body 中心 + 脚底偏移
      //    玩家用主线程算好的真实物理脚底偏移（body.bounds 底部 - 质心，站地面=62px=6.5VH）；
      //    其余（NPC 假 body）保持视觉半高。
      const footWorldY = y + ((tf === 1 && playerFootOffset !== undefined) ? playerFootOffset : h * 0.5);
      let surfTop = null;
      for (let k = 0; k < globalShadowSurfaces.length; k++) {
        const sf = globalShadowSurfaces[k];
        if (x < sf.x0 || x > sf.x1) continue;            // 水平不覆盖
        if (sf.topY > footWorldY + 0.01) continue;        // 顶面在脚底下方（或等高）
        if (sf.topY < footWorldY - SHADOW_SURFACE_RANGE * VH) continue; // 距脚底太远（跳跃中/深渊）
        if (surfTop === null || sf.topY > surfTop) surfTop = sf.topY;   // 取最高（最接近脚底）
      }
      // 🎯 玩家：站表面 → 阴影贴脚下表面；腾空/跳跃 → 保持上一帧表面（阴影不升空）
      let shadowY;
      if (tf === 1) {
        if (isOnGround) {
          shadowY = (surfTop !== null) ? surfTop : groundFixedY;
          shadowPrevY[i] = shadowY;
        } else {
          shadowY = (shadowPrevY[i] !== undefined) ? shadowPrevY[i] : groundFixedY;
        }
      } else {
        shadowY = (surfTop !== null) ? surfTop : groundFixedY;
      }
      // 🎯 贴地偏移统一在最终值上加（玩家/NPC 各自独立；对表面命中 / 回退 / 跳跃保持 所有路径生效）
      shadowY += (tf === 1) ? PLAYER_SHADOW_FOOT_GAP : NPC_SHADOW_FOOT_GAP;


      const s = shadowList[i];
      s.id = id;
      s.x = x;
      s.y = shadowY;
      s.scale = airFactor;
      s.alpha = targetAlpha;
      s.groundFixedY = shadowY;

      // ===== 写入打包缓冲（每实体 12 个 float = 48 字节）=====
      // 布局：view[0..5]=id,x,y,gravityVy,isNear,showBubble
      //       shadow[6..11]=id,x,y,scale,alpha,groundFixedY
      // ⚠️ 注意：out 是 Float32Array，索引 p 是 float 下标（不是字节偏移）。
      //    float 下标 0 保留给 count（主线程用 DataView 读 Uint32），数据从下标 1 开始。
      const p = 1 + i * 12;
      out[p + 0] = id;
      out[p + 1] = x;
      out[p + 2] = fy;
      out[p + 3] = r.gravityVy;
      out[p + 4] = r.isNear ? 1 : 0;
      out[p + 5] = showBubble ? 1 : 0;
      out[p + 6] = id;
      out[p + 7] = x;
      out[p + 8] = shadowY;
      out[p + 9] = airFactor;
      out[p + 10] = targetAlpha;
      out[p + 11] = shadowY;
    }

    // 写入 count（前 4 字节，主线程用 DataView 读）
    new DataView(outBuffer).setUint32(0, count, true);

    // ✅ 只回传 outBuffer（transfer 往返复用），不再 slice 对象数组 → 0 GC
    self.postMessage(
      {
        type: 'viewResult',
        buffer: outBuffer,
        count,
        returnBuffer: buffer
      },
      [outBuffer] // 把输出缓冲所有权交还主线程
    );
    return;
  }

  // 触发器检测 变量顺序+变量名全部修复
  if (data.type === 'checkTriggers') {
    const { buffer } = data;
    const v = new DataView(buffer);

    const trigCount = v.getUint32(16, true);
    if (16 + trigCount * 24 > buffer.byteLength) return;

    const px = v.getFloat32(4, true);
    const py = v.getFloat32(8, true);
    const ph = v.getFloat32(12, true);
    const pw = 20;

    for (let i = 0; i < trigCount; i++) {
      const o = 20 + i * 24;
      const x = v.getFloat32(o + 0, true);
      const y = v.getFloat32(o + 4, true);
      const w = v.getFloat32(o + 8, true);
      const h = v.getFloat32(o + 12, true);
      const offsetX = v.getFloat32(o + 16, true);
      const index = v.getUint32(o + 20, true);

      const tx = x + offsetX;
      const ox = px + pw > tx && px < tx + w;
      const oy = py + ph > y && py < y + h;

      if (ox && oy) {
        triggerMsg.index = index;
        self.postMessage(triggerMsg);
        return;
      }
    }
    return;
  }
};