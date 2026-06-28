//physics.worker.js
// ========== 电梯 Worker 计算类 (纯数学计算，不碰物理) ==========
class ElevatorWorker {
  constructor(label, bodyY, VH) {
    this.label = label;
    this.startY = bodyY;
    this.currentY = bodyY;
    this.speed = 0.4 * VH;
    this.topY = 50;
    this.moveDirection = 0; // -1上升 1下降 0静止
    this.playersOnElevator = new Set();
  }

  update() {
    if (this.moveDirection === 0) return null;

    const prevY = this.currentY;
    this.currentY += this.speed * this.moveDirection;
    const dy = this.currentY - prevY;

    // 到顶
    if (this.moveDirection === -1 && this.currentY <= this.topY) {
      this.currentY = this.topY;
      this.moveDirection = 0;
      if (this.playersOnElevator.size === 0) {
        this.moveDirection = 1;
      }
    }

    // 到底
    if (this.moveDirection === 1 && this.currentY >= this.startY) {
      this.currentY = this.startY; // 强制回到初始Y
      this.moveDirection = 0;
    }

    return {
      y: this.currentY,
      dy: dy,
      playerIds: Array.from(this.playersOnElevator)
    };
  }

  enter(playerId) {
    this.playersOnElevator.add(playerId);
    this.moveDirection = -1;
  }

  leave(playerId) {
    this.playersOnElevator.delete(playerId);

    // 人走光了 → 延迟 0.5 秒再回落
    if (this.playersOnElevator.size === 0) {
      setTimeout(() => {
        // 延迟期间如果又有人上来了，就不回落了
        if (this.playersOnElevator.size === 0) {
          this.moveDirection = 1;
        }
      }, 1200); // 👈 500 毫秒 = 0.5 秒
    }
  }
}

// 全局保存所有电梯
const elevators = new Map();
// ==============================================
// 你原来的代码完全不动！我只在后面加电梯消息！
// ==============================================
self.onmessage = (e) => {
  const data = e.data;

  // 玩家输入
  if (data.type === 'input') {
    const { left, right, jump } = data.data;

    let vx = 0;
    const speed = 0.2 * data.VW;
    if (left) vx = -speed;
    if (right) vx = speed;

    self.postMessage({
      type: 'vxSync',
      vx: vx,
      jump: jump
    });
    return;
  }

  // 问号浮动
  if (data.type === 'updateWenhao') {
    const { buffer, px, py, ACTIVE_MARK_DIST } = data;
    const view = new DataView(buffer);
    const count = view.getUint32(0, true);

    for (let i = 0; i < count; i++) {
      const off = 4 + i * 36;

      const x = view.getFloat32(off + 0, true);
      const baseY = view.getFloat32(off + 4, true);
      let renderY = view.getFloat32(off + 8, true);
      const locked = view.getUint8(off + 12, true) === 1;
      const en = view.getUint8(off + 16, true) === 1;
      const speed = view.getFloat32(off + 20, true);
      let dir = view.getInt8(off + 24, true);
      const maxY = view.getFloat32(off + 28, true);
      const minY = view.getFloat32(off + 32, true);

      let inRange = false;
      const dx = x - px;
      const dy = baseY - py;
      const distSq = ACTIVE_MARK_DIST * ACTIVE_MARK_DIST;
      const markDistSq = dx * dx + dy * dy;
      if (markDistSq <= distSq + 0.0001) {
        inRange = true;
        if (en) {
          renderY += speed * dir;
          if (renderY >= maxY) { renderY = maxY; dir = -1; }
          if (renderY <= minY) { renderY = minY; dir = 1; }
        }
      } else {
        // 离开范围：浮动Y回弹回基准baseY，不会卡死静止
        renderY = baseY;
        dir = 1;
      }

      view.setFloat32(off + 8, renderY, true);
      view.setInt8(off + 24, dir, true);
      view.setUint8(off + 25, inRange ? 1 : 0, true);
    }

    self.postMessage({ type: 'wenhaoResult', buffer }, [buffer]);
    return;
  }

  // ====================== 电梯消息 ======================
  // 初始化电梯
  if (data.type === 'elevator:init') {
    const { id, label, bodyY, VH } = data;
    elevators.set(id, new ElevatorWorker(label, bodyY, VH));
    return;
  }

  // 每帧更新所有电梯
  if (data.type === 'elevator:updateAll') {
    const results = [];
    for (const [id, elev] of elevators) {
      const res = elev.update();
      if (res) results.push({ id, ...res });
    }
    if (results.length > 0) {
      self.postMessage({ type: 'elevator:move', list: results });
    }
    return;
  }

  // 玩家进入电梯
  if (data.type === 'elevator:enter') {
    const { id, playerId } = data;
    elevators.get(id)?.enter(playerId);
    return;
  }

  // 玩家离开电梯
  if (data.type === 'elevator:leave') {
    const { id, playerId } = data;
    elevators.get(id)?.leave(playerId);
    return;
  }
  if (data.type === 'computeAllViews') {
    const { buffer, count, VH, currentMapTopMap, currentGroundY, light } = data;
    const view = new DataView(buffer);
    const result = [];
    const shadowList = [];

    for (let i = 0; i < count; i++) {
      const o = 4 + i * 40; // 步长40
      const id = view.getUint32(o + 0, true);
      const x = view.getFloat32(o + 4, true);
      const y = view.getFloat32(o + 8, true);
      const h = view.getFloat32(o + 12, true);
      const th = view.getFloat32(o + 16, true);
      const hpOff = view.getFloat32(o + 20, true);
      const showBubble = view.getUint8(o + 24, true) === 1;
      const vy = view.getFloat32(o + 28, true);      // 读取竖直速度
      const isOnGround = view.getUint8(o + 32, true) === 1; // 落地标记

      // 原有视图坐标计算不变
      const realTopH = (th + currentMapTopMap) * VH;
      const fx = x;
      const fy = y + realTopH;
      const bx = x;
      const by = y - h + 7 * VH + currentMapTopMap * VH;
      const hx = x;
      const hy = y - hpOff * VH + currentMapTopMap * VH;
      result.push({ id, x: fx, y: fy, bubbleX: bx, bubbleY: by, hpX: hx, hpY: hy, showBubble });

      // 影子完整计算
      let groundFixedY = (currentGroundY + 9) * VH;
      if (isOnGround) {
        groundFixedY = (currentGroundY + 9) * VH;
      }

      let baseX = x;
      if (light) {
        const dx = x - light.x;
        const offsetX = dx * light.offsetScale;
        baseX += offsetX;
      }
      const baseY = groundFixedY;

      const airFactor = isOnGround ? 1 : Math.max(0.25, 1 - Math.abs(vy) * 0.08);
      const targetAlpha = isOnGround ? 0.35 : 0.12;
      let shadowScale = 1;
      let shadowAlpha = 0.35;
      shadowScale += (airFactor - shadowScale) * 0.18;
      shadowAlpha += (targetAlpha - shadowAlpha) * 0.18;

      shadowList.push({
        id,
        x: baseX,
        y: baseY,
        scale: shadowScale,
        alpha: shadowAlpha,
        groundFixedY
      });
    }

    self.postMessage({ type: 'viewResult', views: result });
    self.postMessage({ type: 'shadowUpdate', list: shadowList });
    return;
  }
  // 2. 独立的AABB区域检测：低频执行
  if (data.type === 'checkTriggers') {
    const { buffer } = data;
    const v = new DataView(buffer);

    const px = v.getFloat32(4, true);
    const py = v.getFloat32(8, true);
    const ph = v.getFloat32(12, true);
    const pw = 20;

    const trigCount = v.getUint32(16, true);

    for (let i = 0; i < trigCount; i++) {
      const o = 20 + i * 24;
      const x = v.getFloat32(o + 0, true);
      const y = v.getFloat32(o + 4, true);
      const w = v.getFloat32(o + 8, true);
      const h = v.getFloat32(o + 12, true);
      const offsetX = v.getFloat32(o + 16, true);
      const index = v.getUint32(o + 20, true); // 拿到索引

      const tx = x + offsetX;
      const ox = px + pw > tx && px < tx + w;
      const oy = py + ph > y && py < y + h;

      if (ox && oy) {
        // 只发 index！不发字符串！
        self.postMessage({
          type: 'triggerEnter',
          index: index
        });
        return; // 一次只触发一个
      }
    }
    return;
  }
  //水面
  if (data.type === 'updateReflection') {
    const { viewport, waterWorldY, screenHeight } = data

    // 世界坐标转屏幕坐标
    const screenY = (waterWorldY - viewport.top) * viewport.scaleY
    let boundary = screenY / screenHeight
    boundary = Math.max(0, Math.min(1, boundary))

    // 发回主线程
    self.postMessage({
      type: 'reflectionBoundary',
      boundary: boundary
    })
  }
  // ====================== 体积光 Godray 计算 ======================
  if (data.type === 'godray:calc') {
    if (!self.godrayInternalTime) self.godrayInternalTime = 0;
    self.godrayInternalTime += data.deltaMS * 0.0002;
    const screenPixelX = data.lightWorldX - data.playerX;

    self.postMessage({
      type: 'godray:result',
      time: self.godrayInternalTime,
      screenPixelX: screenPixelX
    });
    return;
  }
};