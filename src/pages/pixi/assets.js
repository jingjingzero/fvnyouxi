import { Assets } from "pixi.js";

export function loadAssets() {
  return Assets.load([
    {
      alias: "spineboy_skel",
      src: "/pixi/spineboy.skel",
    },
    {
      alias: "spineboy_atlas",
      src: "/pixi/spineboy.atlas",
    },
    {
      alias: "linen_skel",
      src: "/pixi/qlitter.skel",
    },
    {
      alias: "linen_atlas",
      src: "/pixi/qlitter.atlas",
    },
    {
      alias: "mao_skel",
      src: "/pixi/mao.skel",
    },
    {
      alias: "mao_atlas",
      src: "/pixi/mao.atlas",
    },
    {
      alias: "jingdao_skel",
      src: "/pixi/jingdao.skel",
    },
    {
      alias: "jingdao_atlas",
      src: "/pixi/jingdao.atlas",
    },
    { alias: "wall_01", src: new URL("../../assets/pixi/wall_01.jpg", import.meta.url).href },
    { alias: "wall_02", src: new URL("../../assets/pixi/wall_02.jpg", import.meta.url).href },
    { alias: "wall_03", src: new URL("../../assets/pixi/wall_03.jpg", import.meta.url).href },
    { alias: "question", src: new URL("../../assets/pixi/question.webp", import.meta.url).href },
    // ✅ webp 雪碧图
    {
      alias: "zidan",
      src: new URL("../../assets/pixi/zidan.webp", import.meta.url).href,
    },
    {
      alias: "baozha",
      src: new URL("../../assets/pixi/baozha.webp", import.meta.url).href,
    },
    {
      alias: "drop",
      src: new URL("../../assets/pixi/drop.webp", import.meta.url).href,
    },
    {
      alias: "jiguang",
      src: new URL("../../assets/pixi/jiguang.webp", import.meta.url).href,
    },
    
  ]);
}
