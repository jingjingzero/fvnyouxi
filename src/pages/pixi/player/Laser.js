import Matter from "matter-js";

export class Laser {
  constructor({ app, engine, container, groups, damage = 10 }) {
    this.app = app;
    this.engine = engine;
    this.container = container;
    this.groups = groups;
    this.damage = damage;

    this.active = false;
    this.tickInterval = 150;
    this._tickTimer = 0;

    this.sprite = null;
    this._update = null;
  }

  /* ------------------------------------------------------------------ */
  /*                              对外 API                               */
  /* ------------------------------------------------------------------ */

  /**
   * ✅ 单次激光（参数风格 = startContinuous）
   */
  shootOnce(
    getStart,
    getEnd,
    {
      spriteFactory,
      duration = 80,
      startRatio = -0.04,
      endRatio = 1,
    } = {}
  ) {
    if (!spriteFactory) return;

    const sprite = spriteFactory;
    this.container.addChild(sprite);

    const start = getStart;
    const end = getEnd;
    const finalEnd = this._hit(start, end, true);

    this._drawSpriteWithRatio(sprite, start, finalEnd, startRatio, endRatio);

    // 自动销毁
    if (sprite.play) {
      sprite.loop = false;
      sprite.play();
    }

    setTimeout(() => {
      sprite.removeFromParent();
      sprite.destroy({ texture: false });
    }, duration);
  }

  /**
   * ✅ 持续激光
   */
  
  startContinuous(
    getStart,
    getEnd,
    {
      duration = 2000,
      startRatio = -0.04,
      endRatio = 1.025,
    } = {},
    sprite = null
  ) {
    if (this.active || !sprite) return;
    this.active = true;
    this._tickTimer = 0;
    this.sprite = sprite;

    this.container.addChild(this.sprite);
    this._update = (ticker) => {
      const deltaMs = ticker.deltaMS;
      this._tickTimer += deltaMs;

      const start = getStart();
      const end = getEnd();
      const applyDamage = this._tickTimer >= this.tickInterval;
      if (applyDamage) this._tickTimer = 0;

      const finalEnd = this._hit(start, end, applyDamage);
      this._drawSpriteWithRatio(
        this.sprite,
        start,
        finalEnd,
        startRatio,
        endRatio
      );
    };

    this.app.ticker.add(this._update);
    setTimeout(() => this.stopContinuous(), duration);
  }

  stopContinuous() {
    if (!this.active) return;

    this.active = false;
    this.app.ticker.remove(this._update);

    if (this.sprite) {
      this.sprite.removeFromParent();
      this.sprite.destroy({ texture: false });
      this.sprite = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*                            判定逻辑                                 */
  /* ------------------------------------------------------------------ */

  _hit(start, end, applyDamage) {
    const bodies = this.engine.world.bodies;
    const hits = Matter.Query.ray(bodies, start, end);

    let finalEnd = end;
    let blockPoint = null;
    let minDist = Infinity;

    for (const hit of hits) {
      const body = hit.body;
      const filter = body.parent
        ? body.parent.collisionFilter
        : body.collisionFilter;

      if (body.isSensor) continue;
      if (body.label === "trigger") continue;
      if (filter.category & this.groups.SENSOR) continue;
      if (filter.category & this.groups.BULLET) continue;
      if (filter.category & this.groups.FRIEND) continue;

      const p = this._lineBodyIntersection(start, end, body);
      if (!p) continue;

      const dist = (p.x - start.x) ** 2 + (p.y - start.y) ** 2;

      // 敌人（不阻挡）
      if (filter.category & this.groups.ENEMY) {
        if (!applyDamage) continue;

        // ❗关键：敌人必须在阻挡点之前
        if (dist >= minDist) continue;

        const enemy = body.parent?.gameObject;
        enemy?.takeDamage?.(this.damage);
        continue;
      }

      // 障碍物（阻挡）
      if (filter.category & this.groups.OBSTACLE) {
        if (dist < minDist) {
          minDist = dist;
          blockPoint = p;
        }
      }
    }

    if (blockPoint) finalEnd = blockPoint;
    return finalEnd;
  }

  /* ------------------------------------------------------------------ */
  /*                                绘制                                 */
  /* ------------------------------------------------------------------ */

  _drawSpriteWithRatio(sprite, start, end, startRatio, endRatio) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const angle = Math.atan2(dy, dx);
    const ux = dx / dist;
    const uy = dy / dist;

    const startOffset = dist * startRatio;
    const endOffset = dist * endRatio;

    const sx = start.x + ux * startOffset;
    const sy = start.y + uy * startOffset;
    const length = endOffset - startOffset;

    sprite.anchor?.set?.(0, 0.5);
    sprite.position.set(sx, sy);
    sprite.rotation = angle;
    sprite.width = length;
    sprite.height = sprite.heightVH ?? sprite.height;
  }

  /* ------------------------------------------------------------------ */
  /*                              几何计算                               */
  /* ------------------------------------------------------------------ */

  _lineBodyIntersection(start, end, body) {
    const v = body.vertices;
    for (let i = 0; i < v.length; i++) {
      const p = this._lineLineIntersection(
        start,
        end,
        v[i],
        v[(i + 1) % v.length]
      );
      if (p) return p;
    }
    return null;
  }

  _lineLineIntersection(p1, p2, p3, p4) {
    const den =
      (p1.x - p2.x) * (p3.y - p4.y) -
      (p1.y - p2.y) * (p3.x - p4.x);

    if (den === 0) return null;

    const t =
      ((p1.x - p3.x) * (p3.y - p4.y) -
        (p1.y - p3.y) * (p3.x - p4.x)) / den;

    const u =
      ((p1.x - p3.x) * (p1.y - p2.y) -
        (p1.y - p3.y) * (p1.x - p2.x)) / den;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      };
    }
    return null;
  }
}
