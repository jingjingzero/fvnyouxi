// 修复：levelDescriptions 多包一层数组 [["a","b"]] -> ["a","b"]
const fs = require('fs');
const file = 'D:/youxi/fvnyouxi/src/store/counter.js';
let s = fs.readFileSync(file, 'utf8');
const re = /(levelDescriptions: \[)\[([\s\S]*?)\](,)/g;
const before = (s.match(re) || []).length;
s = s.replace(re, '$1$2$3');
fs.writeFileSync(file, s, 'utf8');
console.log('FIXED nested lvds count:', before);
