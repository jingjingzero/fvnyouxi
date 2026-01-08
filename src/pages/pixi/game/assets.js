import { Assets } from "pixi.js";

export function loadAssets() {
  return Assets.load([
    {
      alias: "spineSkeleton",
      src:"/pixi/spineboy.skel",
    },
    {
      alias: "spineAtlas",
      src:"/pixi/spineboy.atlas",
    },
    { alias: "tp1", src: new URL("../../../assets/pixi/tp1.jpg", import.meta.url).href },
    { alias: "wall", src: new URL("../../../assets/pixi/wall.webp", import.meta.url).href },

  ]);
}
