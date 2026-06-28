// ==============================================
// 创建玩家/ NPC 的物理碰撞体（身体、头部、脚部传感器）
// ==============================================
export function createPlayerPhysicsBody(playerW, rectHeight, radius, isFriend, category, Matter, COLLISION_GROUPS) {
    // 主身体碰撞盒（矩形，负责主体物理碰撞）
    const mainBody = Matter.Bodies.rectangle(0, 0, playerW, rectHeight, {
        friction: 0, frictionStatic: 0, frictionAir: 0.02, restitution: 0, label: "playerMain"
    });

    // 头部碰撞体（圆形，让角色头部更圆润）
    const topCircle = Matter.Bodies.circle(0, -rectHeight / 2, radius, { label: "playerTop" });

    // 下半身碰撞体（圆形，让角色底部更圆润）
    const bottomCircle = Matter.Bodies.circle(0, rectHeight / 2, radius, { label: "playerBottom" });

    // 脚部传感器（细长矩形，用来检测是否落地、踩地面）
    const footSensor = Matter.Bodies.rectangle(0, rectHeight / 2 + radius, playerW * 0.2, 1, {
        isSensor: true, label: "playerFoot",
        collisionFilter: { category: COLLISION_GROUPS.SENSOR, mask: COLLISION_GROUPS.OBSTACLE }
    });

    // 把 头部 + 身体 + 脚部 合成一个完整物理体
    const body = Matter.Body.create({
        parts: [mainBody, topCircle, bottomCircle, footSensor],
        friction: 0, frictionAir: 0.02,
        collisionFilter: { category, mask: COLLISION_GROUPS.OBSTACLE }
    });

    // 返回所有部件供外部使用
    return { mainBody, topCircle, bottomCircle, footSensor, body };
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
export function updatePlayerAnimation(spine, isOnGround, absVX, vx, vy, speed) {
    // 如果不在地面 → 播放跳跃/下落动画
    if (!isOnGround) {
        vy < -1 ? spine.playJumpUp() : vy > 1 && spine.playJumpDown();
    } else {
        // 在地面 → 速度快就播放跑步，否则待机
        absVX > speed * 0.5 ? spine.playRun() : spine.playIdle();
    }
}

// ==============================================
// 控制角色左右朝向（翻转spine）
// ==============================================
export function updatePlayerDirection(spine, vx) {
    if (vx > 0) {
        // 速度向右 → 面向右侧
        spine.direction = 1;
        spine.setDirection(1);
    } else if (vx < 0) {
        // 速度向左 → 面向左侧
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