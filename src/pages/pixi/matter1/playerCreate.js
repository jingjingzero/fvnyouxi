// ==============================================
// 创建玩家/ NPC 的物理碰撞体（主体 + 脚部传感器）
// ==============================================
export function createPlayerPhysicsBody(playerW, rectHeight, radius, isFriend, category, Matter, COLLISION_GROUPS) {
    // 🎯 摩擦参数（玩家移动完全由代码控制 setVelocity，不依赖物理摩擦）
    //   - friction: 滑动摩擦 = 0 → 玩家贴墙/站障碍物不会被摩擦力影响，跳跃正常
    //   - frictionStatic: 静摩擦 = 0 → ⚠️ 关键：若设 0.5，玩家水平贴着障碍物侧面时，
    //     接触面切向是竖直方向，静摩擦会向下拉住玩家，导致「贴墙跳跳得很低」。
    //     玩家站立稳定不依赖 Matter 静摩擦（靠 footSensor + isOnGround 碰撞判定），
    //     所以滑动摩擦和静摩擦都设为 0，消除贴墙跳被向下拉住的问题。
    //   - frictionAir: 空气阻力（0.02）→ 移动中的减速
    //   - restitution: 弹性 0 → 不反弹
    const FRICTION = 0;         // 滑动摩擦 0（玩家移动靠 setVelocity 控制）
    const FRICTION_STATIC = 0;  // 静摩擦 0：消除贴墙跳被向下静摩擦拉住
    const FRICTION_AIR = 0.02;

    // 主体物理刚体
    const mainPart = Matter.Bodies.rectangle(0, 0, playerW, rectHeight, {
        label: "playerMain",
        friction: FRICTION, frictionStatic: FRICTION_STATIC, frictionAir: FRICTION_AIR, restitution: 0,
        collisionFilter: { category, mask: COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.BULLET }
    });

    // 脚部传感器（位于主体底部，薄矩形，专门用于地面检测）
    // 🎯 传感器宽度 = 主体整个宽度（之前只有一半）：站在障碍物边缘时，
    //    footSensor 也能搭到障碍物顶部，isOnGround 更稳定 → 边缘也能正常跳跃
    const sensorH = 4;
    const sensorW = playerW;          // 覆盖主体整个底部宽度
    const sensorY = rectHeight / 2 + sensorH / 2; // 主体底部下方
    const footSensor = Matter.Bodies.rectangle(0, sensorY, sensorW, sensorH, {
        isSensor: true,
        label: "footSensor",
        collisionFilter: { category, mask: COLLISION_GROUPS.OBSTACLE }
    });

    // 组合为复合刚体（parts[0]=主体, parts[1]=脚部传感器）
    const body = Matter.Body.create({
        parts: [mainPart, footSensor],
        friction: FRICTION,
        frictionStatic: FRICTION_STATIC,
        frictionAir: FRICTION_AIR,
        restitution: 0,
        label: "playerMain",
        collisionFilter: { category, mask: COLLISION_GROUPS.OBSTACLE | COLLISION_GROUPS.BULLET }
    });

    return { body, footSensor };
}

// ==============================================
// 受伤变红效果（颜色滤镜）
// ==============================================
export function applyDamageFilter(view, filter, damage, maxHp) {
    // 计算受伤强度（伤害比例越高，红色越明显）
    const intensity1 = Math.min((damage / maxHp) * 1.4, 1);
    const intensity = Math.min(0.2 + intensity1, 1);

    // 设置滤镜矩阵：只保留红色通道，绿蓝通道变暗
    filter.matrix = [
        1, 0, 0, 0, 0,
        0, 1 - intensity, 0, 0, 0,
        0, 0, 1 - intensity, 0, 0,
        0, 0, 0, 1, 0
    ];

    // 应用滤镜 → 角色变红
    view.filters = [filter];

    // 100ms 后移除滤镜（恢复原色）
    setTimeout(() => view.filters = null, 100);
}

// ==============================================
// 更新角色物理速度（控制移动）
// ==============================================
export function updatePlayerVelocity(body, vx, vy, Matter) {
    const vel = body.velocity;

    // 节流优化：速度变化太小就不更新，减少性能消耗
    if (Math.abs(vel.x - vx) < 0.05 && Math.abs(vel.y - vy) < 0.05) return;

    // 设置物理体的速度（左右/上下）
    Matter.Body.setVelocity(body, { x: vx, y: vy });
}

// ==============================================
// 自动切换动画： idle 待机 / run 跑 / jump 跳
// ==============================================

export function updatePlayerAnimation(spine, isOnGround, absVX, vy, airGap = 0) {
    // 🎯 腾空判定只看「离地距离」：脚底离地形地面超过阈值才算腾空，
    //    斜坡/平地抖动（离地 1~3px）不会误触发跳跃动画
    //    · 高度图地图：airGap = 脚底离地面 px（> 阈值 = 腾空）
    //    · 非高度图地图：airGap = 0（贴地）/ 999（碰撞判定离地）
    const AIR_GAP_THRESHOLD = 8; // 离地 8px 以上才播跳跃动画
    const JUMP_DOWN_VY_THRESHOLD = 1.2; // 🎯 下落速度达到该值才切 jumpdown（避免最高点瞬间突兀切换）

    if (airGap > AIR_GAP_THRESHOLD) {
        // 🎯 腾空按垂直速度区分：上升 → jumpup；下落速度达到阈值才 → jumpdown
        //    vy ∈ [0, 阈值)（刚过最高点、下落速度未起）→ 保持当前动画（jumpup），切换更平缓
        if (vy < 0) {
            spine.playJumpUp();
        } else if (vy > JUMP_DOWN_VY_THRESHOLD) {
            spine.playJumpDown();
        }
    } else {
        // 地面 → 速度快就播放跑步，否则待机
        absVX !== 0 ? spine.playRun() : spine.playIdle();
    }
}

// ==============================================
// 控制角色左右朝向（翻转spine）
// ==============================================
export function updatePlayerDirection(spine, vx) {
    if (vx > 0) {
        // ✅ 方向未变化时跳过 setDirection，避免每帧触发 dirView.scale 变换更新
        if (spine.direction === 1) return;
        spine.direction = 1;
        spine.setDirection(1);
    } else if (vx < 0) {
        if (spine.direction === -1) return;
        spine.direction = -1;
        spine.setDirection(-1);
    }
}

// 创建角色头顶血条（使用对象池创建，性能更高）
export function createHpBar(options, body, rectPool, VH, VW, world, worldContainer, Container, Text) {
    // 血条基础参数（和你acquire的尺寸严格对应）
    const BAR_FULL_WIDTH = 6 * VW;   // 血条总宽度
    const BAR_START_X = -3 * VW;     // 血条左边缘x坐标（左锚点位置）

    // 从对象池获取血条矩形
    const barRect = rectPool.acquire(
        BAR_START_X, 0, BAR_FULL_WIDTH, 2 * VH,
        { color: options.player === 1 ? 0x13ce66 : 0xff4949, texture: false, create: true },
        world, worldContainer
    );

    // 根容器，承载矩形+文字，统一控制位置
    const root = new Container();
    root.position.set(body.position.x, body.position.y - 11 * VH);

    // 前景血条（左锚点缩放）
    const fill = barRect.view;
    fill.pivot.x = 0;
    root.addChild(fill);

    // 居中白色血量文字
    const hpText = new Text({
        text: `${options.data.hp}`,
        style: {
            fill: 0xffffff,
            fontSize: 2 * VH,
            fontWeight: "bold",
        }
    });
    hpText.anchor.set(0.5);
    // 初始满血时，文字在血条正中间
    hpText.x = BAR_START_X + BAR_FULL_WIDTH / 2;
    hpText.y = -1.1 * VH;
    root.addChild(hpText);

    // 把基础尺寸存起来，更新时复用
    barRect.barStartX = BAR_START_X;
    barRect.barFullWidth = BAR_FULL_WIDTH;
    // 扩展字段
    barRect.view = root;
    barRect.fill = fill;
    barRect.hpText = hpText;
    barRect.fill.scale.x = 1;

    return barRect;
}