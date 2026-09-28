const fs = require('fs')
const p = 'D:/youxi/fvnyouxi/src/pages/pixi/fight/index.vue'
const raw = fs.readFileSync(p, 'utf8')
const crlf = raw.includes('\r\n')
let s = raw.replace(/\r\n/g, '\n')
let n = 0

// 1️⃣ 回退随机降费排除限制
const oldCand = "    // 额外随机使一张消耗>0 的手牌灵力 -1（排除精灵召唤卡，不被随机降费）\n    const cand = playerHand.value.filter(c => (c.cost ?? 0) > 0 && !c.name.includes('精灵'))"
const newCand = "    // 额外随机使一张消耗>0 的手牌灵力 -1\n    const cand = playerHand.value.filter(c => (c.cost ?? 0) > 0)"
let i = s.indexOf(oldCand)
if (i === -1) { console.error('CAND MISS'); process.exit(1) }
s = s.slice(0, i) + newCand + s.slice(i + oldCand.length)
n++

// 2️⃣ 手牌卡模板加冰霜粒子层（spine-here 之后）
const oldSpine = "            <div class=\"spine-here absolute inset-0\"></div>"
const newSpine = "            <div class=\"spine-here absolute inset-0\"></div>\n" +
"            <!-- ❄️ 冰霜粒子：被冰精灵降费的卡牌循环粒子特效（打出后随卡消失） -->\n" +
"            <div v-if=\"(card._costReduce ?? 0) > 0\" class=\"frost-particles\">\n" +
"                <span v-for=\"n in 10\" :key=\"'fp' + n\" class=\"frost-particle\" :style=\"frostStyle(n)\"></span>\n" +
"            </div>"
let j = s.indexOf(oldSpine)
if (j === -1) { console.error('SPINE MISS'); process.exit(1) }
s = s.slice(0, j) + newSpine + s.slice(j + oldSpine.length)
n++

// 3️⃣ 加 frostStyle 函数（isCardCostReduced 之后）
const anchorFn = "    return base > 0 && final < base\n}\n"
let k = s.indexOf(anchorFn)
if (k === -1) { console.error('FN MISS'); process.exit(1) }
s = s.slice(0, k + anchorFn.length) +
"// ❄️ 冰霜粒子随机样式（每颗粒子位置/延迟/漂移不同）\n" +
"function frostStyle(n) {\n" +
"    return {\n" +
"        left: ((n * 37) % 100) + '%',\n" +
"        top: ((n * 53) % 100) + '%',\n" +
"        animationDelay: (n * 0.23) + 's',\n" +
"        animationDuration: (1.8 + (n % 3) * 0.5) + 's',\n" +
"        '--driftX': ((n % 2 ? 1 : -1) * (4 + (n % 4) * 3)) + 'px',\n" +
"    }\n" +
"}\n" +
s.slice(k + anchorFn.length)
n++

// 4️⃣ 打出时不再还原灵力（去掉 delete card._costReduce）
const oldDel = "    delete card._costReduce // ❄️ 降费标记随打出清除（避免洗回牌库后仍降费）\n"
let m = s.indexOf(oldDel)
if (m === -1) { console.error('DELETE MISS'); process.exit(1) }
s = s.slice(0, m) + s.slice(m + oldDel.length)
n++

// 5️⃣ CSS 加冰霜粒子动画（cost-reduced-flash 后）
const oldCss = ".cost-reduced-flash {\n    animation: costReducedFlash 0.8s ease-in-out infinite;\n    transform-origin: center;\n}"
const newCss = ".cost-reduced-flash {\n    animation: costReducedFlash 0.8s ease-in-out infinite;\n    transform-origin: center;\n}\n" +
".frost-particles {\n" +
"    position: absolute; inset: 0;\n" +
"    pointer-events: none; overflow: hidden;\n" +
"    border-radius: inherit;\n" +
"    z-index: 5;\n" +
"}\n" +
".frost-particle {\n" +
"    position: absolute;\n" +
"    width: 5px; height: 5px;\n" +
"    border-radius: 50%;\n" +
"    background: radial-gradient(circle, rgba(224,247,255,0.98) 0%, rgba(147,197,253,0.55) 55%, transparent 75%);\n" +
"    box-shadow: 0 0 7px rgba(186,230,253,0.9);\n" +
"    opacity: 0;\n" +
"    animation: frostParticleFloat 2.4s ease-in-out infinite;\n" +
"}\n" +
"@keyframes frostParticleFloat {\n" +
"    0% { opacity: 0; transform: translate(0, 0) scale(0.6); }\n" +
"    20% { opacity: 0.95; }\n" +
"    60% { opacity: 0.7; transform: translate(var(--driftX, 6px), -14px) scale(1); }\n" +
"    100% { opacity: 0; transform: translate(calc(var(--driftX, 6px) * -1), 10px) scale(0.5); }\n" +
"}"
let q = s.indexOf(oldCss)
if (q === -1) { console.error('CSS MISS'); process.exit(1) }
s = s.slice(0, q) + newCss + s.slice(q + oldCss.length)
n++

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8')
console.log('index.vue patched x' + n)
