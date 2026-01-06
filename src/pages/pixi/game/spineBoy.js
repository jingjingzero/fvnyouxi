import "@esotericsoftware/spine-pixi-v8";
import { Container } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export function createSpineBoy() {
  const view = new Container();
  const dirView = new Container();

  const spine = Spine.from({
    skeleton: "spineSkeleton",
    atlas: "spineAtlas",
  });

  spine.state.data.defaultMix = 0.2;

  dirView.addChild(spine);
  view.addChild(dirView);

  let spawning = true;
  let jumping = false;

  const state = {
    walk: false,
    run: false,
    hover: false,
    jump: false,
  };

  const anim = {
    idle: { name: "idle", loop: true },
    walk: { name: "walk", loop: true },
    run: { name: "run", loop: true },
    jump: { name: "jump", loop: false },
    hover: { name: "hoverboard", loop: true },
    spawn: { name: "portal", loop: false },
  };

  function play(a) {
    const cur = spine.state.getCurrent(0);
    if (cur && cur.animation.name === a.name) return;
    spine.state.setAnimation(0, a.name, a.loop);
  }

  function playSpawn() {
    spawning = true;
    const entry = spine.state.setAnimation(0, anim.spawn.name, false);
    entry.listener = {
      complete() {
        spawning = false;
      },
    };
  }

  function update() {
    if (spawning) return;

    if (jumping) {
      const cur = spine.state.getCurrent(0);
      if (!cur || cur.isComplete()) jumping = false;
      else return;
    }

    if (state.jump) {
      jumping = true;
      play(anim.jump);
      return;
    }

    if (state.hover) play(anim.hover);
    else if (state.run) play(anim.run);
    else if (state.walk) play(anim.walk);
    else play(anim.idle);
  }

  return {
    view,
    spine,
    state,
    direction: 1,
    playSpawn,
    update,
    setDirection(d) {
      dirView.scale.x = d;
      this.direction = d;
    },
  };
}
