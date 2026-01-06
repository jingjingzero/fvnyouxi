import { Assets } from "pixi.js";

export function loadAssets() {
  return Assets.load([
    {
      alias: "spineSkeleton",
      src: "https://raw.githubusercontent.com/pixijs/spine-v8/main/examples/assets/spineboy-pro.skel",
    },
    {
      alias: "spineAtlas",
      src: "https://raw.githubusercontent.com/pixijs/spine-v8/main/examples/assets/spineboy-pma.atlas",
    },
    // { alias: "background", src: "/public/pixi/background.png" },
    { alias: "background", src: "/public/pixi/shiyanshi.webp" },
    { alias: "tp1", src: "/public/pixi/tp1.jpg" },
  ]);
}
