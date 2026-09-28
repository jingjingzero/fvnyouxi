import { Container } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";



export function createSpineBoy(options = {}, data) {
  const view = new Container();
  const dirView = new Container();
  const spine = new Spine({
    skeleton: `${data.juese}_skel`,
    atlas: `${data.juese}_atlas`,
    allowMissingRegions: true,
  });

  // 🎯 禁止 Spine 物理约束继承容器位移/旋转：
  // viewport 镜头移动会让 worldContainer 的 worldTransform 变化，
  // 默认情况下物理约束（头发/尾巴/布料等）会把它当成角色移动，导致骨骼乱动。
  // setPhysicsPositionInheritanceFactor(0,0) 后镜头移动不再影响物理约束。
  if (typeof spine.setPhysicsPositionInheritanceFactor === 'function') {
    spine.setPhysicsPositionInheritanceFactor(0, 0);
  }
  // 角色朝向用 dirView.scale.x=-1 镜像翻转，会产生 180° 旋转，
  // 也禁用掉，避免物理骨骼被镜像翻转干扰。
  if (spine.physicsRotationInheritanceFactor !== undefined) {
    spine.physicsRotationInheritanceFactor = 0;
  }

  spine.state.timeScale = data.animSpeed || 1;
  const skeleton = spine.skeleton;
  const state = spine.state;
  const skins = skeleton.data.skins || [];

  // 皮肤切换：
  // - 传了 skin 名称 → 精确匹配并应用
  // - 没传 / 名称无效 → 自动应用第一个非 default 皮肤
  // ⚠️ 不能只对 skins.length > 1 生效：有些骨骼（如 Q 版 yuQ*）默认皮肤是空的，
  //    必须显式 setSkin 到有内容的皮肤才显示，单个皮肤也要应用
  const skinName = data.skin;
  let targetSkin = skinName ? skeleton.data.findSkin(skinName) : null;
  if (targetSkin) {
    skeleton.setSkin(targetSkin);
  } else {
    const realSkins = skins.filter(v => v.name !== "default");
    if (realSkins.length > 0) {
      skeleton.setSkin(realSkins[0]);
    }
  }

  state.apply(skeleton);


  dirView.addChild(spine);
  view.addChild(dirView);



  const anim = {
    idle: "idle",
    run: "run",
    fight: "fight",
    jumpup: "jumpup",
    jumpdown: "jumpdown",
    shoushang: "shoushang",
  };


  let currentBase = null;

  function setBase(name, loop = true) {
    if (!name || currentBase === name) return;
    // ⚠️ 动画不存在时静默跳过，不报错（某些骨骼可能没有 fight/run 等动画）
    const hasAnim = spine.skeleton?.data?.animations?.some(a => a.name === name);
    if (!hasAnim) return;
    currentBase = name;
    // track 0：主动画（idle / run / jump 等）
    const entry = spine.state.setAnimation(0, name, loop);
    // 🎲 循环动画错峰：多个同骨骼角色（如一排 NPCQ）同时创建时，都从 trackTime=0 播会"整齐同步"。
    //    传了 animRandomOffset 的角色，在循环动画开始时把相位偏移到不同位置，播放就一直错开：
    //    - animRandomOffset: true  → 每次创建随机起始相位（每个实例不同）
    //    - animRandomOffset: 0.33  → 固定从动画 33% 处开始（手动指定错峰比例）
    if (loop && data.animRandomOffset) {
      const dur = entry?.animation?.duration ?? 1;
      entry.trackTime = typeof data.animRandomOffset === 'number'
        ? (data.animRandomOffset % 1) * dur
        : Math.random() * dur;
    }
    // track 1：混合动画 "animation"（如有则叠加播放，与主动画混合）
    const hasMixAnim = spine.skeleton?.data?.animations?.some(a => a.name === 'animation');
    if (hasMixAnim) {
      spine.state.setAnimation(1, 'animation', loop);
    }
  }


  // 初始化：默认待机 idle 循环
  setBase(anim.idle, true);

  // 🎯 在多个候选动画里挑第一个存在的播放（都不存在则静默跳过，保持当前动画）
  function setBaseTry(names, loop = false) {
    for (const n of names) {
      if (n && spine.skeleton?.data?.animations?.some(a => a.name === n)) {
        setBase(n, loop);
        return true;
      }
    }
    return false;
  }

  // ======================
  // 对外接口
  // ======================
  return {
    view,
    spine,

    playBase(name, loop = true) {
      setBase(name, loop);
    },

    playRun() {
      setBase(anim.run, true);
      // 🎯 切回正常态：恢复默认动画速度（战斗 fight 用 0.75 后切回要还原）
      spine.state.timeScale = data.animSpeed || 1;
    },

    playIdle() {
      setBase(anim.idle, true);
      spine.state.timeScale = data.animSpeed || 1;
    },

    // 🎯 战斗姿态动画：速度参数可配（玩家进入战斗传 0.75；友军默认 1 不变）
    playFight(speed = 1) {
      setBase(anim.fight, true);
      spine.state.timeScale = speed;
    },

    playJumpUp() {
      // 跳跃期间播放动画：优先 jumpup，缺失时回退到 run 循环（保证空中也有动画，不会定格）
      if (!setBaseTry([anim.jumpup, 'jump'], false)) {
        setBase(anim.run, true);
      }
    },

    playJumpDown() {
      // 下落动画：优先 jumpdown，缺失时回退到 run 循环（保证空中也有动画，不会定格）
      if (!setBaseTry([anim.jumpdown, 'jump'], false)) {
        setBase(anim.run, true);
      }
    },

    playshoushang(callback) {
      // 强制清空缓存，绕过重复判断
      currentBase = null;

      // 🎯 动画存在性检查：部分角色骨骼（如 jinmao/huli/yu）没有 shoushang 动画，
      //    直接 setAnimation 会静默无效甚至中断后续飘字；没有时回退 attack 一次性播放
      const hasShoushang = spine.skeleton?.data?.animations?.some(a => a.name === anim.shoushang);
      const hurtName = hasShoushang ? anim.shoushang : (spine.skeleton?.data?.animations?.some(a => a.name === 'attack') ? 'attack' : null);
      if (!hurtName) {
        // 无任何可用的受伤表现动画：只回调（保持当前待机）
        callback?.();
        currentBase = null;
        return;
      }
      // track 0：播放受伤动画（临时覆盖主动画，不循环）
      const entry = spine.state.setAnimation(0, hurtName, false);
      entry.listener = {
        complete: () => {
          callback?.();
          // 动画结束再清空一次，保证后续切换100%生效
          currentBase = null;
        }
      };
    },


    setDirection(d) {
      dirView.scale.x = d;
    },

    setAnimSpeed(speed) {
      spine.state.timeScale = speed;
    },

    update(delta) { },

    // ✅ PixiV8 安卓安全销毁，零GC泄漏
    destroy() {
      try {
        // 先销毁Spine骨骼
        spine.destroy({
          children: true,
          texture: false
        });

        // 再清理动画轨道&监听
        spine.state?.clearTracks();
        spine.state?.clearListeners();

        // 容器安全销毁，不重复销毁
        dirView.destroy({ children: true });
        view.destroy({ children: true });
      } catch (e) {
        console.error('Spine销毁异常', e);
      }
    }
  };
}