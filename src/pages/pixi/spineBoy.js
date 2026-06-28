import { Container } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export function createSpineBoy(options = {}, data) {
  const { onShoot } = options;

  const view = new Container();
  const dirView = new Container();
  const spine = new Spine({
    skeleton: `${data.juese}_skel`,
    atlas: `${data.juese}_atlas`,
  });

  spine.state.timeScale = 1;

  const skeleton = spine.skeleton
  const state = spine.state
  const skins = skeleton.data.skins

  if (skins.length > 1) {

    const realSkins = skins.filter(v => v.name !== "default")

    const skinName = data.skin

    // 设置皮肤
    if (skinName && skeleton.data.findSkin(skinName)) {

      skeleton.setSkinByName(skinName)

    } else if (realSkins.length > 0) {

      skeleton.setSkin(realSkins[0])

    }

    // ⭐ 正确刷新方式（关键）
    state.apply(skeleton)
  }
  spine.state.data.defaultMix = 0.12;

  dirView.addChild(spine);
  view.addChild(dirView);

  // ==============================
  // 事件监听
  // ==============================
  spine.state.addListener({
    event(entry, event) {
      if (entry.trackIndex === 1 && event.data.name === "shoot") {

      }
    }
  });

  // ==============================
  // 动画控制
  // ==============================

  const anim = {
    idle: "idle",
    run: "run",
    shoot: "shoot",
    jumpup: "jumpup",
    jumpdown: "jumpdown",
  };

  let currentBase = null;

  function setBase(name, loop = true) {


    if (!name) return;
    if (currentBase === name) return;
    currentBase = name;
    spine.state.setAnimation(0, name, loop);
  }

  function playOverlay(name, loop = false) {
    if (!name) return;

    // 如果已有 overlay 在播，不重复
    if (spine.state.getCurrent(1)) return;

    const entry = spine.state.setAnimation(1, name, loop);

    entry.listener = {
      complete() {
        spine.state.clearTrack(1);
      },
    };
  }

  // ==============================
  // 对外 API
  // ==============================

  return {
    view,
    spine,

    // ⭐ 只提供“直接播放”接口
    playBase(name, loop = true) {
      setBase(name, loop);
    },

    playRun() {
      setBase(anim.run, true);
    },

    playIdle() {
      setBase(anim.idle, true);
    },

    playJumpUp() {
      setBase(anim.jumpup, false);
    },

    playJumpDown() {
      setBase(anim.jumpdown, false);
    },

    playShoot() {
      playOverlay(anim.shoot, false);
    },

    setDirection(d) {
      dirView.scale.x = d;
    },

    update(delta) {

    },
    destroy() {
      try {

        spine.state.clearTracks();
        spine.state.clearListeners?.();

        view.removeChildren();

        spine.destroy({
          children: true,
        });

        dirView.destroy({
          children: true,
        });

        view.destroy({
          children: true,
        });

      } catch (e) {
        console.error(e);
      }
    }
  };
}
