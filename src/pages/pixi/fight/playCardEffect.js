// ==============================================
// 🎬 技能特效统一播放器
// ==============================================
// 技能代码只需调用 playCardEffect()，播放数据全部来自 effectConfig.js 配置表。
// 内部按配置的 type 分发到 projectile / atPoint / buff / field 四种播放形式。
//
// 调用方式：
//   playCardEffect({
//     skillName: '火球',     // 卡牌名（用于查配置表）
//     container,             // 战斗特效层容器
//     player,                // 玩家单位
//     enemies,               // 敌人数组
//     target,                // 指定目标（可选，needTarget 卡）
//     onHit,                 // 命中回调（投射物命中 / 定点播放后触发）
//   })
//   playAllyEffect({ npcImg, kind: 'attack'|'skill', ... })   // NPC 队友特效
//   playEnemyEffect({ juese, kind: 'attack'|'skill', ... })   // 敌人特效
// ==============================================
import { getEffect, returnEffect, VH_CACHE, VW_CACHE, EFFECT_SCALE_BASE } from './animations/effectPool.js';
import { playAtPoint, playProjectile } from './animations/index.js';
import { getFightContainer, getPlayerScreenPos, getEnemyContainer, getNpcAllyScreenPos, getEnemySpinePos, getEnemyAttackPointPos } from './battle.js';
import { getEffectConfig, getAllyEffectConfig, getEnemyEffectConfig, getEnemySkillEffectConfig } from './effectConfig.js';
import gsap from 'gsap';

/**
 * 获取玩家屏幕坐标（战斗特效层坐标系）
 */
function getPlayerPos() {
  const screenPos = getPlayerScreenPos();
  return screenPos || { x: 0, y: 0 };
}

/**
 * 计算投射物起点/终点（玩家 → 目标敌人）
 * 偏移全部来自配置表（单位 vw/vh）
 * 🎯 终点用敌人 spine 实际渲染位置（getEnemySpinePos，屏幕坐标）计算，
 *    直接用 enemy.x/y（逻辑站位坐标）会导致投射物/命中动画偏移（见 getAtPointPos 注释）
 * @param {Object} targetEnemy 目标
 * @param {Object} cfg 特效配置
 * @param {Object} [fromPos] 起点坐标（默认玩家位置；队友特效传队友位置）
 */
function calcProjectilePoints(targetEnemy, cfg, fromPos) {
  const base = fromPos || getPlayerPos();
  const sx = (cfg.startOffsetX ?? 1) * VW_CACHE;
  const sy = (cfg.startOffsetY ?? 0) * VH_CACHE;
  const ex = (cfg.endOffsetX ?? 2) * VW_CACHE;
  const ey = (cfg.endOffsetY ?? 0) * VH_CACHE;
  // 🎯 终点基准 = 敌人 spine 实际渲染位置（屏幕坐标），fallback 敌人数据坐标
  const spinePos = getEnemySpinePos(targetEnemy);
  const tx = spinePos ? spinePos.x : targetEnemy.x;
  const ty = spinePos ? spinePos.y : targetEnemy.y;
  // 🎯 horizontal: true → 水平飞向敌人（终点 y = 玩家 y）
  const endY = cfg.horizontal
    ? (base.y + sy)
    : (ty * (cfg.endTargetY ?? 0.9) + ey);
  return {
    startPos: { x: base.x + sx, y: base.y + sy },
    endPos: { x: tx + ex, y: endY },
  };
}

/**
 * 🎯 获取「最中心的存活敌人」（aoeCenter 联动 projectile 用）：
 *    取所有存活敌人 x 的平均值作为中心，返回 x 最接近中心的敌人
 *    （3 个敌人时通常是中间那个；没有存活敌人返回 null）
 * @param {Array} enemies 敌人数组
 * @returns {Object|null}
 */
export function getCenterEnemy(enemies) {
  const alive = (enemies || []).filter(e => e.hp > 0);
  if (!alive.length) return null;
  if (alive.length === 1) return alive[0];
  const cx = alive.reduce((s, e) => s + e.x, 0) / alive.length;
  return alive.reduce((a, b) => Math.abs(b.x - cx) < Math.abs(a.x - cx) ? b : a);
}

/**
 * 获取定点特效的播放坐标（默认在目标脚下）
 * - baseY/targetY = 'player'：以玩家位置为基准（x/y 都取玩家，如激光在玩家前方）
 * - targetY 数字：目标 y 倍率（默认 0.9）
 * - 目标可以是敌人（spine 实际渲染位置）或玩家（玩家屏幕位置）——玩家/NPC/敌人共用同一套定位
 * ⚠️ 敌人坐标必须用 getEnemySpinePos（spine 实际渲染位置，屏幕坐标），
 *    enemy.x/y 是逻辑站位坐标，直接用会导致特效位置偏移
 */
function getAtPointPos(target, cfg, basePos) {
  // 🎯 以玩家为基准（激光等：在玩家前方播放）
  if (cfg.baseY === 'player' || cfg.targetY === 'player') {
    const p = basePos || getPlayerPos();
    return {
      x: p.x + (cfg.offsetX ?? 0) * VW_CACHE,
      y: p.y + (cfg.offsetY ?? 0) * VH_CACHE,
    };
  }
  // 🎯 目标实际渲染位置（屏幕坐标）：敌人走 spine 位置；玩家走玩家屏幕位置
  let tx, ty;
  if (!target || target.camp === 'player') {
    const p = basePos || getPlayerPos();
    tx = p.x;
    ty = p.y;
  } else {
    const spinePos = getEnemySpinePos(target);
    tx = spinePos ? spinePos.x : target.x;
    ty = spinePos ? spinePos.y : target.y;
  }
  const baseY = typeof cfg.targetY === 'number' ? ty * cfg.targetY : ty * 0.9;
  return {
    x: tx + (cfg.offsetX ?? 0) * VW_CACHE,
    y: baseY + (cfg.offsetY ?? 0) * VH_CACHE,
  };
}

/**
 * 播放一次性定点特效（自动回收）
 * 🎯 支持两段式动画（atPoint 与投射物一致）：
 *    第一段：播放 animName ?? 'animation'（主动画）
 *    第二段：主动画播完后，若配置了 hitAnimName 则自动接播爆炸动画（如 animation1），
 *            用 hitAnimScale 独立缩放 + hitAnimOffsetX/Y 独立偏移，播完才回收
 *    onComplete 在整段动画（含爆炸）全部播完后触发（回收前）；特效无法播放时立即触发，保证伤害不卡死
 * @param {Container} container
 * @param {number} x 基准 x（第二段叠加 hitAnimOffsetX）
 * @param {number} y 基准 y（第二段叠加 hitAnimOffsetY）
 * @param {Object} cfg 特效配置
 * @param {Function} [onComplete] 全部动画播完回调
 */
function playOneShotAtPoint(container, x, y, cfg, onComplete) {
  try {
    if (!container) { onComplete?.(); return; }
    const eff = getEffect(cfg.effectName);
    if (!eff) { onComplete?.(); return; }
    eff.zIndex = cfg.zIndex ?? 100;
    if (cfg.timeScale) eff.state.timeScale = cfg.timeScale;
    // 🎯 倾斜支持：cfg.rotation 直接给特效设置旋转角度（弧度，正=顺时针）。
    //    适合「定点射线/光柱」类特效（如巨瞳 jypg 从头顶斜射向玩家）：
    //    传 cfg.rotationDeg（角度）会自动转弧度，更直观
    if (cfg.rotation !== undefined) {
      eff.rotation = cfg.rotation;
    } else if (cfg.rotationDeg !== undefined) {
      eff.rotation = cfg.rotationDeg * Math.PI / 180;
    }

    const anims = eff.skeleton?.data?.animations || [];
    const hasAnim = (name) => anims.some(a => a.name === name);

    // ============ 第一段：主动画（animName ?? 'animation'） ============
    const stage1Name = cfg.animName ?? 'animation';
    const safe1 = hasAnim(stage1Name) ? stage1Name : (anims[0]?.name || 'animation');
    eff.scale.set((cfg.scale ?? 1) * EFFECT_SCALE_BASE);
    if (cfg.flipX) eff.scale.x = -Math.abs(eff.scale.x);
    eff.x = x;
    eff.y = y;
    eff.state.setAnimation(0, safe1, false);
    container.addChild(eff);
    if (container.sortChildren) container.sortChildren();

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { onComplete?.(); } catch (err) { console.error(err); }
      try { returnEffect(cfg.effectName, eff); } catch (e) {}
    };

    // 配置了 hitAnimName → 主动画播完后再接播爆炸动画（animation1），播完才回收
    if (cfg.hitAnimName) {
      const stage2Name = cfg.hitAnimName;
      const safe2 = hasAnim(stage2Name) ? stage2Name : safe1;
      let stage = 0;
      eff.state.addListener({
        complete: () => {
          if (done) return;
          if (stage === 0) {
            stage = 1;
            // ============ 第二段：爆炸动画（独立缩放/偏移） ============
            if (cfg.hitAnimScale != null) {
              eff.scale.set(cfg.hitAnimScale * EFFECT_SCALE_BASE);
              if (cfg.flipX) eff.scale.x = -Math.abs(eff.scale.x);
            }
            eff.x = x + (cfg.hitAnimOffsetX ?? 0) * VW_CACHE;
            eff.y = y + (cfg.hitAnimOffsetY ?? 0) * VH_CACHE;
            try { eff.state.setAnimation(0, safe2, false); } catch (e) { finish(); }
          } else {
            finish();
          }
        }
      });
    } else {
      // 没有爆炸动画：主动画播完直接回收
      eff.state.addListener({ complete: finish });
    }

    // ⏱️ 安全兜底：仅当需要回调（如结算伤害）时，动画 complete 万一不触发则 2s 后强制回收 + 回调
    if (onComplete) setTimeout(finish, 2000);
  } catch (e) {
    onComplete?.();
  }
}

/**
 * 🌀 往返特效（roundTrip）：从起点飞到终点（去程），再飞回起点（返程），结束后回收
 * @param {Container} container
 * @param {{x:number,y:number}} start 起点（如玩家位置）
 * @param {{x:number,y:number}} end 终点（如最远敌人身后）
 * @param {Object} opts { effectName, scale, duration, onReach, onBack }
 * @returns {Spine|null}
 */
function playRoundTrip(container, start, end, opts = {}) {
  try {
    if (!container) return null;
    const { effectName, scale = 1, duration = 0.4, timeScale = 1, onReach, onBack } = opts;
    const eff = getEffect(effectName);
    if (!eff) return null;
    eff.scale.set(scale * EFFECT_SCALE_BASE);
    eff.x = start.x;
    eff.y = start.y;
    eff.zIndex = 100;
    eff.state.timeScale = timeScale; // ⏱️ 播放速度
    eff.state.setAnimation(0, 'animation', true); // 循环（往返期间持续播放）
    container.addChild(eff);
    if (container.sortChildren) container.sortChildren();

    const tl = gsap.timeline();
    tl.to(eff, { x: end.x, y: end.y, duration, ease: 'none', onComplete: onReach });
    tl.to(eff, {
      x: start.x, y: start.y, duration, ease: 'none',
      onComplete: () => {
        onBack?.();
        try { returnEffect(effectName, eff); } catch (e) { /* ignore */ }
      },
    });
    // 全程旋转
    gsap.to(eff, { rotation: '+=720', duration: duration * 2, ease: 'none' });
    return eff;
  } catch (e) {
    return null;
  }
}

/**
 * 在玩家脚底播放 buff 特效（返回 Spine 实例；loop 持续特效用于 buff 结束自动移除）
 */
function playBuffAtPlayer(container, cfg) {
  const screenPos = getPlayerPos();
  if (!container || !screenPos) return null;
  return playAtPoint(container, screenPos.x + (cfg.offsetX ?? 0) * VW_CACHE, screenPos.y + (cfg.offsetY ?? 8) * VH_CACHE, {
    effectName: cfg.effectName,
    scale: (cfg.scale ?? 1) * EFFECT_SCALE_BASE,
    animationName: cfg.animName ?? 'animation',   // 🎯 动画名（默认 'animation'，如反弹 buff 用 animName）
    loop: cfg.loop ?? false,
    timeScale: cfg.timeScale ?? 1,           // ⏱️ 播放速度
    zIndex: cfg.zIndex ?? 100,               // 层级
    flipX: cfg.flipX ?? false,               // 水平翻转（敌人 buff 朝左时用）
  });
}

/**
 * 🎬 移除玩家的持续 buff 特效（buff 结束时调用）
 * @param {Object} player
 * @param {string} buffName - 绑定的 buff 名（播放时挂在 player.buffFxMap[buffName]）
 */
export function removePlayerBuffFx(player, buffName) {
  const fxMap = player?.buffFxMap;
  if (!fxMap || !fxMap[buffName]) return;
  const fx = fxMap[buffName];
  try { returnEffect(fx.effectName, fx.spine); } catch (e) { /* ignore */ }
  delete fxMap[buffName];
}

// 🌫️ 领域特效全局实例（field 类型，循环播放至战斗结束，由 removeFieldFx 移除）
let _fieldFxSpine = null;

/**
 * 在全体存活敌人中心播放领域特效（循环，战斗结束由 removeFieldFx 移除）
 * 🌀 敌人中心用 spine 实际渲染位置（getEnemySpinePos）计算
 */
function playFieldAtEnemies(enemies, cfg) {
  // 🎯 领域特效（毒雾）加到「敌人容器」而不是特效容器：
  //    这样毒雾和敌人同容器，zIndex（如 -100）才能让毒雾显示在敌人后面；
  //    加在特效容器（zIndex 999）里，无论内部 zIndex 多低都会盖住敌人。
  const container = getEnemyContainer() || getFightContainer();
  if (!container) return null;
  const alive = enemies.filter(e => e.hp > 0);
  let centerX = window.innerWidth / 2;
  let centerY = window.innerHeight / 2;
  if (alive.length) {
    // 🎯 用敌人 spine 实际位置（屏幕坐标）取中心，fallback 数据坐标
    const pts = alive.map(e => getEnemySpinePos(e) || { x: e.x, y: e.y });
    centerX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    centerY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  }
  let eff = null;
  try {
    eff = getEffect(cfg.effectName);
    if (!eff) return null;
    eff.x = centerX;
    eff.y = centerY + (cfg.offsetY ?? 15) * VH_CACHE;
    eff.zIndex = cfg.zIndex ?? -1;
    eff.scale.set((cfg.scale ?? 1.5) * EFFECT_SCALE_BASE);
    if (cfg.timeScale) eff.state.timeScale = cfg.timeScale;
    // 🌫️ 循环播放至战斗结束（移除见 removeFieldFx）
    eff.state.setAnimation(0, cfg.animName ?? 'animation', true);
    container.addChild(eff);
    if (container.sortChildren) container.sortChildren();
    eff._fieldFxName = cfg.effectName; // 记录池类型，removeFieldFx 用它回池
    _fieldFxSpine = eff; // 记录全局实例，战斗结束统一移除
  } catch (e) { /* 无特效资源跳过 */ }
  return eff;
}

/**
 * 🌫️ 移除领域特效（field 类型，战斗结束时调用）
 */
export function removeFieldFx() {
  if (_fieldFxSpine) {
    try { returnEffect(_fieldFxSpine._fieldFxName || 'duwu', _fieldFxSpine); } catch (e) { /* ignore */ }
    _fieldFxSpine = null;
  }
}

/**
 * 🎬 统一入口：按配置表播放技能特效
 * @param {Object} opts
 * @param {string} opts.skillName - 卡牌名
 * @param {Container} [opts.container] - 特效层容器（默认取战斗容器）
 * @param {Object} [opts.player] - 玩家单位
 * @param {Array} [opts.enemies] - 敌人数组
 * @param {Object} [opts.target] - 指定目标
 * @param {Function} [opts.onHit] - 命中回调（投射物命中后 / 定点播放后触发）
 * @param {boolean} [opts.persistent] - 领域/buff 是否持续（不自动回收）
 * @returns {Object|null} 返回 { eff, tween } 供需要精确控制时使用；无特效返回 null
 */
export function playCardEffect({ skillName, container, player, enemies, target, onHit, onBack, persistent }) {
  const cfg = getEffectConfig(skillName);
  if (!cfg || !cfg.type || cfg.type === 'none') return null;

  const appContainer = container || getFightContainer();
  const targetEnemy = target?.hp > 0 ? target : (enemies?.find(e => e.hp > 0) || null);

  switch (cfg.type) {
    // ==================== 投射物（玩家 → 敌人） ====================
    case 'projectile': {
      // 🎯 aoeCenter 联动 projectile：配置 aoeCenter: true 时，无指定目标则
      //    飞向「最中心的存活敌人」处停止（而不是第一个/最近的敌人）
      let projTarget = targetEnemy;
      if (cfg.aoeCenter && (!projTarget || projTarget.hp <= 0)) {
        projTarget = getCenterEnemy(enemies);
      }
      if (!projTarget || !appContainer) return null;
      const { startPos, endPos } = calcProjectilePoints(projTarget, cfg);
      // 🎯 命中动画锚点 = 敌人 spine 实际渲染位置（屏幕坐标），保证爆炸/碎裂正好在敌人身上
      //    （不想要敌人身上就留空，回退到飞行终点）
      const hitAnchor = getEnemySpinePos(projTarget);
      try {
        // 用 playProjectile（自带对象池管理 + 爆炸 + 命中动画 + 命中回调）
        playProjectile(appContainer, startPos, endPos, {
          effectName: cfg.effectName,
          scale: (cfg.scale ?? 0.2) * EFFECT_SCALE_BASE,
          duration: cfg.flyDuration ?? 0.3,
          animName: cfg.animName ?? 'animation',
          timeScale: cfg.timeScale ?? 1,   // ⏱️ 动画播放速度
          rotationFromAngle: cfg.rotationFromAngle ?? true,
          hitAnimName: cfg.hitAnimName ?? null,   // 🧊 命中后播放自定义动画
          hitAnimLoop: cfg.hitAnimLoop ?? false,
          hitAnimScale: cfg.hitAnimScale != null ? cfg.hitAnimScale * EFFECT_SCALE_BASE : null, // 🎯 命中动画独立缩放
          hitAnimX: hitAnchor ? hitAnchor.x : null, // 🎯 命中动画锚点 x（敌人实际位置，屏幕坐标）
          hitAnimY: hitAnchor ? hitAnchor.y : null, // 🎯 命中动画锚点 y（敌人实际位置，屏幕坐标）
          hitAnimOffsetX: cfg.hitAnimOffsetX ?? 0, // 🎯 命中动画独立水平偏移（vw，不配 = 0 无偏移）
          hitAnimOffsetY: cfg.hitAnimOffsetY ?? 0, // 🎯 命中动画独立垂直偏移（vh，不配 = 0 无偏移）
          hitAnimDelay: cfg.damageDelay ?? 0,      // ⏱️ 第二段动画开始播放后延迟多少毫秒出伤（不配 = 0 立即）
          createExplosion: cfg.explosion ?? false,
          explosionEffectName: cfg.explosionEffectName || 'baozha',
          onHit,
        });
        return { played: true }; // 播放成功标记（调用方可判断特效是否可用）
      } catch (e) {
        return null; // 无特效资源 → 特效未播放（调用方兜底结算伤害）
      }
    }

    // ==================== 玩家脚底 buff ====================
    case 'buff': {
      if (!appContainer) return null;
      const eff = playBuffAtPlayer(appContainer, cfg);
      // 🎬 持续 buff 特效（loop: true）：挂到玩家 buffFxMap，buff 结束（player.buffs 移除）时自动清理
      //    绑定的 buff 名 = cfg.buffName ?? 技能名（如「风之庇佑」的 buff.name === 技能名）
      if (eff && cfg.loop) {
        const buffName = cfg.buffName || skillName;
        // 重复施放：先移除旧的持续特效，避免残留
        if (player.buffFxMap?.[buffName]) removePlayerBuffFx(player, buffName);
        player.buffFxMap = player.buffFxMap || {};
        player.buffFxMap[buffName] = { effectName: cfg.effectName, spine: eff };
      }
      if (onHit) onHit();
      return null;
    }

    // ==================== 🌀 往返特效（玩家 → 最远敌人身后 → 返回玩家，如回旋风刃） ====================
    case 'roundTrip': {
      if (!appContainer) return null;
      const alive = (enemies || []).filter(e => e.hp > 0);
      if (!alive.length) return null;
      const start = getPlayerPos();
      // 终点 = 离玩家水平最远的存活敌人「身后」（越过该敌人再偏 endOffsetX）
      const far = alive.reduce((b, e) => Math.abs(e.x - start.x) > Math.abs(b.x - start.x) ? e : b, alive[0]);
      const end = {
        x: far.x + (cfg.endOffsetX ?? 8) * VW_CACHE,
        y: far.y * (cfg.targetY ?? 0.9) + (cfg.endOffsetY ?? 0) * VH_CACHE,
      };
      // 返回特效实例（调用方可判断特效是否成功播放；onHit=去程到达，onBack=返程回到）
      return playRoundTrip(appContainer, start, end, {
        effectName: cfg.effectName,
        scale: cfg.scale ?? 1,
        duration: cfg.flyDuration ?? 0.4,
        timeScale: cfg.timeScale ?? 1,   // ⏱️ 动画播放速度
        onReach: () => onHit?.(),
        onBack: () => onBack?.(),
      });
    }

    // ==================== 定点特效（指定敌人/位置，如雷击/洞察/龙卷风暴） ====================
    case 'atPoint': {
      if (!appContainer) return null;
      // 🌀 AOE 中心模式（aoeCenter: true）：多位敌人时取所有存活敌人 spine 位置的中心释放
      if (cfg.aoeCenter) {
        const alive = (enemies || []).filter(e => e.hp > 0);
        if (alive.length === 0) return null;
        const pts = alive.map(e => getEnemySpinePos(e) || { x: e.x, y: e.y });
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const baseY = typeof cfg.targetY === 'number' ? cy * cfg.targetY : cy * 0.9;
        // 🎯 onHit 由特效动画播放完触发（与动画同步，避免「动画没播就扣血」）
        playOneShotAtPoint(appContainer,
          cx + (cfg.offsetX ?? 0) * VW_CACHE,
          baseY + (cfg.offsetY ?? 0) * VH_CACHE,
          cfg, () => onHit?.());
        return { played: true };
      }
      if (!targetEnemy) return null;
      const pos = getAtPointPos(targetEnemy, cfg);
      // 🎯 onHit 由特效动画播放完触发（与动画同步，避免「动画没播就扣血」）
      playOneShotAtPoint(appContainer, pos.x, pos.y, cfg, () => onHit?.());
      return { played: true };
    }

    // ==================== 领域特效 ====================
    case 'field': {
      if (!appContainer) return null;
      const eff = playFieldAtEnemies(enemies || [], cfg);
      if (onHit) onHit();
      return eff ? { eff } : null;
    }

    default:
      return null;
  }
}

// ==============================================
// 👥 NPC 队友特效统一播放器
// ==============================================
// 从 ALLY_EFFECT_CONFIG 读取队友的普攻/技能特效配置并播放。
//   playAllyEffect({
//     npcImg: 'tuzi',              // 队友 img
//     kind: 'attack'|'skill',      // 普攻 or 技能
//     skillId,                     // 当前选中技能的 id（kind='skill' 时按它选特效，如 'chanrao'）
//     container, player, enemies, target,
//     onHit,                       // 命中回调
//   })
// ==============================================
export function playAllyEffect({ npcImg, kind = 'attack', skillId, container, player, enemies, target, onHit }) {
  const allyCfg = getAllyEffectConfig(npcImg);
  if (!allyCfg) return null;
  // 🎯 技能特效：按选中技能 id 从 skills 映射表取（回退旧 skill 字段）；普攻直接取 attack
  const cfg = kind === 'skill'
    ? (allyCfg.skills?.[skillId] || allyCfg.skill || null)
    : allyCfg[kind];
  if (!cfg || !cfg.type || cfg.type === 'none') return null;

  const appContainer = container || getFightContainer();

  // 🎯 起点（nearestTarget 需要以起点为基准找最近的敌人，先算出来）
  let fromPos = null;
  if (cfg.basePos === 'player') {
    fromPos = getPlayerPos();
  } else {
    const allyPos = getNpcAllyScreenPos();
    if (allyPos) fromPos = { x: allyPos.x, y: allyPos.y };
    else fromPos = getPlayerPos();
  }

  let targetEnemy = target?.hp > 0 ? target : null;
  // 🎯 aoeCenter: true → 飞向「人群中心」（取最靠近全体中心的存活敌人，跟玩家 AOE 一样）
  if (!targetEnemy && cfg.aoeCenter) {
    targetEnemy = getCenterEnemy(enemies);
  }
  // 🎯 nearestTarget: true → 飞向「离起点最近的存活敌人」（如 jinmao 普攻水平飞向最近敌人）
  if (!targetEnemy && cfg.nearestTarget && fromPos) {
    const alive = (enemies || []).filter(e => e.hp > 0);
    if (alive.length) {
      targetEnemy = alive.reduce((a, b) => {
        const ax = getEnemySpinePos(a)?.x ?? a.x;
        const bx = getEnemySpinePos(b)?.x ?? b.x;
        return Math.abs(bx - fromPos.x) < Math.abs(ax - fromPos.x) ? b : a;
      });
    }
  }
  if (!targetEnemy) targetEnemy = enemies?.find(e => e.hp > 0) || null;

  // ⏱️ 延迟伤害：配置 damageDelay（毫秒）时，命中后延迟结算（如 AOE 爆炸落点后出伤）
  const delayedHit = cfg.damageDelay
    ? () => { setTimeout(() => { try { onHit?.(); } catch (e) { /* 忽略 */ } }, cfg.damageDelay); }
    : onHit;

  switch (cfg.type) {
    case 'projectile': {
      if (!targetEnemy || !appContainer) return null;
      const { startPos, endPos } = calcProjectilePoints(targetEnemy, cfg, fromPos);
      // 🎯 命中动画锚点 = 敌人 spine 实际位置（跟玩家冰箭/毒发一样，爆炸/碎裂正好在敌人身上）
      const hitAnchor = getEnemySpinePos(targetEnemy);
      playProjectile(appContainer, startPos, endPos, {
        effectName: cfg.effectName,
        scale: (cfg.scale ?? 0.2) * EFFECT_SCALE_BASE,
        duration: cfg.flyDuration ?? 0.3,
        animName: cfg.animName ?? 'animation',
        timeScale: cfg.timeScale ?? 1,   // ⏱️ 动画播放速度
        rotationFromAngle: cfg.rotationFromAngle ?? true,
        // 🧊 命中后播放自定义动画（如 animation1 爆炸/碎裂），播完自动回收；与玩家冰箭/毒发同款机制
        hitAnimName: cfg.hitAnimName ?? null,
        hitAnimLoop: cfg.hitAnimLoop ?? false,
        hitAnimScale: cfg.hitAnimScale != null ? cfg.hitAnimScale * EFFECT_SCALE_BASE : null,
        hitAnimX: hitAnchor ? hitAnchor.x : null,
        hitAnimY: hitAnchor ? hitAnchor.y : null,
        hitAnimOffsetX: cfg.hitAnimOffsetX ?? 0,
        hitAnimOffsetY: cfg.hitAnimOffsetY ?? 0,
        hitAnimDelay: cfg.damageDelay ?? 0,  // ⏱️ 第二段动画开始播放后延迟多少毫秒出伤（不配 = 0 立即）
        createExplosion: cfg.explosion ?? false,
        explosionEffectName: cfg.explosionEffectName || 'baozha',
        // 🎯 传原始 onHit：命中动画开始播放时由 playProjectile 触发（+ hitAnimDelay），避免重复延时
        onHit,
      });
      return null;
    }
    case 'atPoint': {
      if (!targetEnemy || !appContainer) return null;
      const pos = getAtPointPos(targetEnemy, cfg);
      // 🎯 直接在目标位置播放特效（播完自动回收）
      playOneShotAtPoint(appContainer, pos.x, pos.y, cfg);
      // ⏱️ 伤害在动画「播放时」开始计时：damageDelay 毫秒后结算（不配/0 = 播放即结算），
      //    不再等动画播完（用户需求：播放时就结算伤害）
      if (cfg.damageDelay) {
        setTimeout(() => { try { onHit?.(); } catch (e) { /* 忽略 */ } }, cfg.damageDelay);
      } else {
        onHit?.();
      }
      return null;
    }
    case 'buff': {
      if (!appContainer) return null;
      playBuffAtPlayer(appContainer, cfg);
      if (delayedHit) delayedHit();
      return null;
    }
    default:
      return null;
  }
}

// ==============================================
// 👾 敌人特效统一播放器
// ==============================================
// 从 ENEMY_EFFECT_CONFIG 读取敌人的普攻/技能特效配置并播放。
// 敌人朝向玩家（左侧），默认 flipX 使特效水平翻转。
//   playEnemyEffect({
//     juese: 'monster1',           // 敌人骨骼名
//     kind: 'attack'|'skill',      // 普攻 or 技能
//     skillType,                   // kind='skill' 时传技能类型（如 singleDamage_actionBarReduce）
//     container, player, enemies, target,
//     onHit,
//   })
// ==============================================
export function playEnemyEffect({ juese, kind = 'attack', skillType, container, player, enemies, target, onHit, spine, animName }) {
  let cfg = null;
  if (kind === 'skill' && skillType) {
    cfg = getEnemySkillEffectConfig(skillType);
    // 技能无独立配置时，回退到该敌人的普攻特效
    if (!cfg || cfg.type === 'none') {
      cfg = getEnemyEffectConfig(juese)?.attack || null;
    }
  } else {
    cfg = getEnemyEffectConfig(juese)?.attack || null;
  }
  if (!cfg || !cfg.type || cfg.type === 'none') return null;

  const appContainer = container || getFightContainer();

  // 🎯 事件驱动特效：等待敌人 spine 动画播放到事件帧（如 buou1 attack 动画的 onHit）再播放
  //    起点 = 事件帧时 attackPoint 端点的实时位置（真正走人物动画的 attackPoint 端点 + onHit 事件），终点 = 玩家位置
  if (cfg.eventTrigger) {
    if (!spine?.state || !appContainer) return null;
    // 🎯 角色没设置 attackPoint 端点 → 跳过（不播放）
    const initialPos = getEnemyAttackPointPos(target);
    if (!initialPos) return null;
    // 🎯 事件帧不预检查：动画里没有 onHit 事件帧时事件回调自然不会触发（等效跳过）；
    //    事件名不匹配同样由回调里的过滤拦截（避免不同 Spine 运行时版本 events 数据结构差异导致误跳过）
    let fired = false;
    const listener = {
      event: (entry, ev) => {
        if (fired || !ev || ev.data?.name !== cfg.eventTrigger) return;
        // 🎯 只响应当前攻击动画的事件（其他动画的同名事件忽略）
        if (animName && entry?.animation?.name !== animName) return;
        fired = true;
        try { spine.state.removeListener(listener); } catch (e) { /* ignore */ }
        // 🎯 事件帧触发时骨架可能还没 update 到该帧（读到的是上一帧/待机姿态的攻击点位置）→
        //    延迟到下一渲染帧再读攻击点，位置才是事件帧的真实出手点
        requestAnimationFrame(() => {
          const fromPos = getEnemyAttackPointPos(target) || initialPos;
          if (!fromPos) return;
          const toPos = getPlayerPos();
          playProjectile(appContainer, fromPos, toPos, {
            effectName: cfg.effectName,
            scale: (cfg.scale ?? 0.2) * EFFECT_SCALE_BASE,
            duration: cfg.flyDuration ?? 0.3,
            animName: cfg.animName ?? 'animation',
            timeScale: cfg.timeScale ?? 1,
            rotationFromAngle: cfg.rotationFromAngle ?? true,
            hitAnimName: cfg.hitAnimName ?? null,
            hitAnimLoop: cfg.hitAnimLoop ?? false,
            hitAnimScale: cfg.hitAnimScale != null ? cfg.hitAnimScale * EFFECT_SCALE_BASE : null,
            hitAnimX: toPos.x,
            hitAnimY: toPos.y,
            hitAnimOffsetX: cfg.hitAnimOffsetX ?? 0,
            hitAnimOffsetY: cfg.hitAnimOffsetY ?? 0,
            hitAnimDelay: cfg.damageDelay ?? 0,
            createExplosion: cfg.explosion ?? false,
            explosionEffectName: cfg.explosionEffectName || 'baozha',
            onHit,
          });
        });
      },
    };
    spine.state.addListener(listener);
    // 🧹 兜底清理：动画超时未触发也移除监听（防止 fight 循环动画残留监听）
    setTimeout(() => { try { spine.state.removeListener(listener); } catch (e) { /* ignore */ } }, cfg.eventTimeout ?? 3000);
    return null;
  }
  switch (cfg.type) {
    case 'projectile': {
      if (!appContainer) return null;
      // 🎯 与玩家/NPC 共用同一套参数：终点 = 玩家位置；offsetX/offsetY/startOffset/endOffset 照常叠加
      //    attackPoint: true → 起点 = 敌人 Spine 攻击点端点（如布偶挥击出手位置）；否则起点 = 敌人 spine 位置
      const attackPos = cfg.attackPoint ? getEnemyAttackPointPos(target) : null;
      const spinePos = attackPos || (target ? getEnemySpinePos(target) : null);
      const fx = attackPos ? attackPos.x : (spinePos ? spinePos.x : (target?.x ?? window.innerWidth * 0.7));
      const fy = attackPos ? attackPos.y : (spinePos ? spinePos.y : (target?.y ?? window.innerHeight * 0.5));
      const startY = attackPos ? fy : (typeof cfg.targetY === 'number' ? fy * cfg.targetY : fy * 0.9);
      const fromPos = {
        x: fx + (cfg.startOffsetX ?? 0) * VW_CACHE + (cfg.offsetX ?? 0) * VW_CACHE,
        y: startY + (cfg.startOffsetY ?? 0) * VH_CACHE + (cfg.offsetY ?? 0) * VH_CACHE,
      };
      const toPos = getPlayerPos();
      const hitAnchor = getPlayerPos();
      playProjectile(appContainer, fromPos, toPos, {
        effectName: cfg.effectName,
        scale: (cfg.scale ?? 0.2) * EFFECT_SCALE_BASE,
        duration: cfg.flyDuration ?? 0.3,
        animName: cfg.animName ?? 'animation',
        timeScale: cfg.timeScale ?? 1,   // ⏱️ 动画播放速度
        rotationFromAngle: cfg.rotationFromAngle ?? true,
        hitAnimName: cfg.hitAnimName ?? null,   // 🧊 命中后播放自定义动画（同玩家/NPC）
        hitAnimLoop: cfg.hitAnimLoop ?? false,
        hitAnimScale: cfg.hitAnimScale != null ? cfg.hitAnimScale * EFFECT_SCALE_BASE : null,
        hitAnimX: hitAnchor ? hitAnchor.x : null,
        hitAnimY: hitAnchor ? hitAnchor.y : null,
        hitAnimOffsetX: cfg.hitAnimOffsetX ?? 0,
        hitAnimOffsetY: cfg.hitAnimOffsetY ?? 0,
        hitAnimDelay: cfg.damageDelay ?? 0,
        createExplosion: cfg.explosion ?? false,
        explosionEffectName: cfg.explosionEffectName || 'baozha',
        onHit,
      });
      return null;
    }
    case 'atPoint': {
      if (!appContainer) return null;
      // 🎯 与玩家/NPC 共用同一套定位（getAtPointPos）：
      //    敌人攻击目标 = 玩家 → 以玩家位置为基准，targetY 数字 = 玩家 y 倍率（如 0.5 = 玩家半身高度），
      //    targetY: 'player' 或 baseY: 'player' = 玩家完整位置，offsetX/offsetY 照常叠加
      //    🎯 baseY: 'self' → 特效定位在「攻击敌人自身」的 spine 位置（如巨瞳从自己头顶
      //       斜射向玩家的定点射线：特效在巨瞳身上播放，用 rotationDeg 倾斜指向玩家）
      let pos;
      if (cfg.baseY === 'self') {
        // 🎯 attackPoint: true → 定位到敌人 Spine 攻击点端点（如布偶挥击出手位置）；读不到回退敌人 spine 位置
        const attackPos = cfg.attackPoint ? getEnemyAttackPointPos(target) : null;
        const selfPos = attackPos || getEnemySpinePos(target);
        if (!selfPos) return null;
        pos = {
          x: selfPos.x + (cfg.offsetX ?? 0) * VW_CACHE,
          y: selfPos.y + (cfg.offsetY ?? 0) * VH_CACHE,
        };
      } else {
        pos = getAtPointPos(player, cfg);
      }
      playOneShotAtPoint(appContainer, pos.x, pos.y, cfg);
      // ⏱️ 与 NPC atPoint 一致：damageDelay 毫秒后结算（不配/0 = 播放即结算）
      if (cfg.damageDelay) {
        setTimeout(() => { try { onHit?.(); } catch (e) { /* 忽略 */ } }, cfg.damageDelay);
      } else {
        if (onHit) onHit();
      }
      return null;
    }
    case 'buff': {
      if (!appContainer) return null;
      playBuffAtPlayer(appContainer, cfg);
      if (onHit) onHit();
      return null;
    }
    default:
      return null;
  }
}
