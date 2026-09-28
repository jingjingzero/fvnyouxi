import fs from "fs";
function checkJs(p) {
  try { new Function(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")); return "JS-OK " + p; }
  catch (e) { return "JS-FAIL " + p + " :: " + (e.message || e); }
}
async function checkVue(p) {
  const { parse, compileScript } = await import("@vue/compiler-sfc");
  try {
    const src = fs.readFileSync(p, "utf8");
    const { descriptor, errors } = parse(src, { filename: p });
    if (errors && errors.length) return "VUE-PARSE-FAIL " + p + " :: " + errors.map(e => e.message).join(" | ");
    if (descriptor.script || descriptor.scriptSetup) compileScript(descriptor, { id: "x" });
    return "VUE-OK " + p;
  } catch (e) { return "VUE-FAIL " + p + " :: " + (e.message || e); }
}
const results = [];
results.push(checkJs("D:/youxi/fvnyouxi/src/store/configs.js"));
results.push(checkJs("D:/youxi/fvnyouxi/src/store/counter-store.js"));
results.push(checkJs("D:/youxi/fvnyouxi/vite.config.js"));
results.push(checkJs("D:/youxi/fvnyouxi/src/pages/pixi/fight/index.vue"));
results.push(await checkVue("D:/youxi/fvnyouxi/src/pages/pixi/player/xinxi.vue"));
results.push(await checkVue("D:/youxi/fvnyouxi/src/pages/pixi/dialogue/DialogueAdmin.vue"));
console.log(results.join("\n"));
