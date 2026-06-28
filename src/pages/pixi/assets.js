

import { Assets } from 'pixi.js'

let loaded = false

export async function loadAssets(onProgress) {
  if (loaded) return
  loaded = true
   console.log('加载');
   
  const start = performance.now()

  // Assets.load 第二个参数可以传进度回调
  await Assets.load(
    [
      {
        alias: "jinglingQ_skel",
        src: "/pixi/jinglingQ.skel",
      },
      {
        alias: "jinglingQ_atlas",
        src: "/pixi/jinglingQ.atlas",
      },
      {
        alias: "two219_skel",
        src: "/pixi/two219.skel",
      },
      {
        alias: "two219_atlas",
        src: "/pixi/two219.atlas",
      },

      {
        alias: "huli_skel",
        src: "/pixi/huli.skel",
      },
      {
        alias: "huli_atlas",
        src: "/pixi/huli.atlas",
      },
      {
        alias: "kapai_skel",
        src: "/pixi/kapai.skel",
      },
      {
        alias: "kapai_atlas",
        src: "/pixi/kapai.atlas",
      },
      {
        alias: "jinmao_skel",
        src: "/pixi/jinmao.skel",
      },
      {
        alias: "jinmao_atlas",
        src: "/pixi/jinmao.atlas",
      },
      {
        alias: "yu_skel",
        src: "/pixi/yu.skel",
      },
      {
        alias: "yu_atlas",
        src: "/pixi/yu.atlas",
      },
      {
        alias: "linen_skel",
        src: "/pixi/zhujue.skel",
      },
      {
        alias: "linen_atlas",
        src: "/pixi/zhujue.atlas",
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
    ],
    (progress) => {
      // progress 是 0~1
      if (onProgress) onProgress(progress)
      console.log(`加载进度: ${(progress * 100).toFixed(1)}%`)
    }
  )

  const end = performance.now()
  console.log(`资源加载完成，用时 ${(end - start).toFixed(2)} ms`)
}