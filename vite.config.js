import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'
import fs from 'fs'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      Unocss(),
      // 🎨 element-plus 按需引入（组件 + ElMessage 等 API 自动按需，配合移除全量引入）
      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: false,
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: false,
      }),
      // ⚡ 剥离 configs.js 的内联 sourcemap：vite 5 dev 会把 sourcemap base64 内联进模块响应，
      //    导致 54KB 源码变成 404KB 响应，物品面板每次点「加载」都强制重新 transform、卡顿/偶发超时。
      //    在 HTTP 响应层拦截剥离，仅针对这一个超大配置模块。
      {
        name: 'strip-inline-sourcemap',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || '';
            if (url.includes('/store/configs.js')) {
              const origEnd = res.end.bind(res);
              res.end = function (chunk, encoding, cb) {
                if (typeof chunk === 'string') {
                  const i = chunk.indexOf('//# sourceMappingURL=data:');
                  if (i >= 0) chunk = chunk.slice(0, i);
                } else if (chunk && typeof chunk === 'object' && typeof chunk.toString === 'function') {
                  const s = chunk.toString('utf8');
                  const i = s.indexOf('//# sourceMappingURL=data:');
                  if (i >= 0) chunk = Buffer.from(s.slice(0, i), 'utf8');
                }
                return origEnd(chunk, encoding, cb);
              };
            }
            next();
          });
        },
      },
      // 🎛️ 对话管理系统：开发中间件，允许管理页直接写入对话文件（仅 dev 模式，构建时不生效）
      {
        name: 'dladmin-write',
        configureServer(server) {
          const pathMod = path;
          server.middlewares.use('/__dladmin_write', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return; }
            let body = '';
            req.on('data', (c) => (body += c));
            req.on('end', () => {
              try {
                const { ops } = JSON.parse(body || '{}');
                if (!Array.isArray(ops) || !ops.length) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, msg: '无操作' })); return; }
                console.log('[dladmin-write] 收到操作:', ops.map(o => o.kind + '(' + (o.id || o.fromId || o.toId || '') + ')').join(' → '));
                const base = pathMod.join(process.cwd(), 'src', 'pages', 'pixi', 'dialogue', 'data', 'npc');
                const results = [];
                // 🎒 物品编辑通用写入：替换 counter.js 内指定常量锚点的对象体/数组体（kind → { anchor, closeRe, label }）
                const COUNTER_SECTIONS = {
                  items:        { anchor: 'const ITEM_DEFS = {',            closeRe: '\n};',    label: 'ITEM_DEFS' },
                  lianzhi:      { anchor: 'const LIANZHI_RECIPES = [',      closeRe: '\n];',    label: 'LIANZHI_RECIPES' },
                  craft:        { anchor: 'const CRAFT_RECIPES = [',        closeRe: '\n];',    label: 'CRAFT_RECIPES' },
                  shop:         { anchor: 'const DEFAULT_SHOP_ITEMS = [',   closeRe: '\n]',     label: 'DEFAULT_SHOP_ITEMS' },
                  sellPrices:   { anchor: 'const DEFAULT_SELL_PRICES = {',  closeRe: '\n}',     label: 'DEFAULT_SELL_PRICES' },
                  lianzhiLevel: { anchor: 'const LIANZHI_LEVEL_CFG = {',    closeRe: '\n};',    label: 'LIANZHI_LEVEL_CFG' },
                  levelUp:      { anchor: 'const LEVEL_UP_CFG = {',         closeRe: '\n};',    label: 'LEVEL_UP_CFG' },
                  initInventory: { anchor: 'const DEFAULT_inventory = [', closeRe: '\n]', label: 'DEFAULT_inventory' },
                  achievements: { anchor: 'ACHIEVEMENT_DEFS = {',                closeRe: '\n};',    label: 'ACHIEVEMENT_DEFS' },
                  tasks:        { anchor: 'const TASK_DEFS = [',            closeRe: '\n];',    label: 'TASK_DEFS' },
                  cards:        { anchor: 'export const DEFAULT_CARD_DATA = {', closeRe: '\n};', label: 'DEFAULT_CARD_DATA' },
                  gachaRates:   { anchor: 'export const DEFAULT_GACHA_RATES = {', closeRe: '\n};', label: 'DEFAULT_GACHA_RATES' },
                  btStages:     { anchor: 'export const BREAKTHROUGH_STAGES = {', closeRe: '\n};', label: 'BREAKTHROUGH_STAGES' },
                  btPenalty:    { anchor: 'export const BREAKTHROUGH_QUALITY_PENALTY = {', closeRe: '\n};', label: 'BREAKTHROUGH_QUALITY_PENALTY' },
                  btComp:       { anchor: 'export const BREAKTHROUGH_FAIL_COMPENSATION = {', closeRe: '\n};', label: 'BREAKTHROUGH_FAIL_COMPENSATION' },
                  btCap:        { anchor: 'export const BREAKTHROUGH_COMPENSATION_CAP = ', closeRe: ';', inline: true, label: 'BREAKTHROUGH_COMPENSATION_CAP' },
                  btQuality:    { anchor: 'export const BREAKTHROUGH_QUALITY_BONUS = {', closeRe: '\n};', label: 'BREAKTHROUGH_QUALITY_BONUS' },
                  initialDeck:  { anchor: 'export const INITIAL_DECK = [', closeRe: '\n];', label: 'INITIAL_DECK' },
                  roleInit:      { anchor: 'export const ROLE_INIT_CONFIGS = {', closeRe: '\n};', label: 'ROLE_INIT_CONFIGS' },
                  metaRole:      { anchor: 'export const META_ROLE_CFG = {', closeRe: '\n};', label: 'META_ROLE_CFG' },
                };
                // ⚙️ 配置段已迁出到 configs.js（counter.js 通过 import/re-export 保持 API 兼容）
                const counterPath = pathMod.join(process.cwd(), 'src', 'store', 'configs.js');
                function replaceCounterSection(kind, code) {
                  const sec = COUNTER_SECTIONS[kind];
                  if (!sec || !fs.existsSync(counterPath)) return { ok: false, msg: '未配置或文件不存在' };
                  let ts = fs.readFileSync(counterPath, 'utf8');
                  const tcrlf = ts.includes('\\r\\n');
                  ts = ts.replace(/\\r\\n/g, '\\n');
                  const start = ts.indexOf(sec.anchor);
                  if (start < 0) return { ok: false, msg: '未找到 ' + sec.label };
                  const bodyStart = start + sec.anchor.length;
                  // 🔒 搜索窗口限制：防止 closeRe 在段落内部缺失时跳到文件后面误删整段（如单行格式的数组）
                  let closeM = -1;
                  let closeRe = sec.closeRe;
                  if (kind === 'initialDeck') {
                    // 初始卡组：数组元素为单行字符串，紧邻锚点后 5000 字符内必有其结尾 "];"
                    const local = ts.slice(bodyStart, bodyStart + 5000);
                    const m = local.search(/\n\];|\];/);
                    if (m < 0) return { ok: false, msg: '未找到 ' + sec.label + ' 结尾（请检查格式）' };
                    closeM = m;
                    closeRe = local[m] === ']' ? '];' : '\n];';
                  } else {
                    closeM = ts.slice(bodyStart).search(closeRe);
                    if (closeM < 0) return { ok: false, msg: '未找到 ' + sec.label + ' 结尾' };
                  }
                  const closeEnd = bodyStart + closeM + closeRe.length;
                  if (sec.inline) {
                    // 📝 单行常量（如 `export const X = 0.25;`）：直接拼接，不换行展开
                    ts = ts.slice(0, start) + sec.anchor + code + sec.closeRe + ts.slice(closeEnd);
                  } else {
                    ts = ts.slice(0, start) + sec.anchor + '\n' + code + '\n' + sec.closeRe.slice(1) + ts.slice(closeEnd);
                  }
                  try { server.watcher.unwatch(counterPath); } catch (e) {}
                  fs.writeFileSync(counterPath, tcrlf ? ts.replace(/\\n/g, '\\r\\n') : ts, 'utf8');
                  try { server.watcher.add(counterPath); } catch (e) {}
                  return { ok: true, msg: sec.label + ' 写入' };
                }
                for (const op of ops) {
                  // 🎒 物品编辑：items/lianzhi/craft/shop/sellPrices/lianzhiLevel 六种整块替换
                  if (op.kind === 'items' || op.kind === 'lianzhi' || op.kind === 'craft' || op.kind === 'shop' || op.kind === 'sellPrices' || op.kind === 'lianzhiLevel' || op.kind === 'levelUp' || op.kind === 'achievements' || op.kind === 'initInventory' || op.kind === 'cards' || op.kind === 'gachaRates' || op.kind === 'btStages' || op.kind === 'btPenalty' || op.kind === 'btComp' || op.kind === 'btCap' || op.kind === 'btQuality' || op.kind === 'tasks' || op.kind === 'initialDeck' || op.kind === 'roleInit' || op.kind === 'metaRole') {
                    const r = replaceCounterSection(op.kind, String(op.code || ''));
                    results.push({ file: 'configs.js', ok: r.ok, msg: r.msg });
                    console.log('[dladmin-write] configs.js', op.kind, '→', r.ok ? 'OK' : 'FAIL ' + r.msg);
                    continue;
                  }
                  // 🎓 天赋配置写入：整块替换 counter.js 的 DEFAULT_TALENT_CONFIG_SNAPSHOT 数组（对话目录之外的特殊写入）
                  if (op.kind === 'talent') {
                    const code = String(op.code || '');
                    const tp = pathMod.join(process.cwd(), 'src', 'store', 'counter-store.js');
                    if (!fs.existsSync(tp)) { results.push({ file: 'counter-store.js', ok: false, msg: '文件不存在' }); continue; }
                    let ts = fs.readFileSync(tp, 'utf8');
                    const tcrlf = ts.includes('\r\n');
                    ts = ts.replace(/\r\n/g, '\n');
                    const tStart = ts.indexOf('const DEFAULT_TALENT_CONFIG_SNAPSHOT = [');
                    if (tStart < 0) { results.push({ file: 'counter-store.js', ok: false, msg: '未找到天赋配置数组' }); continue; }
                    const tEndM = ts.slice(tStart).match(/^        \];/m);
                    if (!tEndM) { results.push({ file: 'counter-store.js', ok: false, msg: '未找到天赋数组结尾' }); continue; }
                    const tEnd = tStart + tEndM.index + tEndM[0].length;
                    ts = ts.slice(0, tStart) + 'const DEFAULT_TALENT_CONFIG_SNAPSHOT = [\n' + code + '\n        ];' + ts.slice(tEnd);
                    try { server.watcher.unwatch(tp); } catch (e) {}
                    fs.writeFileSync(tp, tcrlf ? ts.replace(/\n/g, '\r\n') : ts, 'utf8');
                    try { server.watcher.add(tp); } catch (e) {}
                    console.log('[dladmin-write] counter.js talent → OK');
                    results.push({ file: 'counter-store.js', ok: true, msg: '天赋配置写入' });
                    continue;
                  }

                  // 🗺️ 地牢配置写入：整块替换 config.js 的 DUNGEON_EDIT_CFG 对象体
                  if (op.kind === 'dungeon') {
                    const code = String(op.code || '');
                    const tp = pathMod.join(process.cwd(), 'src', 'pages', 'pixi', 'dungeon', 'config.js');
                    if (!fs.existsSync(tp)) { results.push({ file: 'config.js', ok: false, msg: '文件不存在' }); continue; }
                    let ts = fs.readFileSync(tp, 'utf8');
                    const tcrlf = ts.includes('\r\n');
                    ts = ts.replace(/\r\n/g, '\n');
                    const dStart = ts.indexOf('export const DUNGEON_EDIT_CFG = {');
                    if (dStart < 0) { results.push({ file: 'config.js', ok: false, msg: '未找到 DUNGEON_EDIT_CFG' }); continue; }
                    const dBodyStart = dStart + 'export const DUNGEON_EDIT_CFG = {'.length;
                    const dClose = ts.indexOf('\n};', dBodyStart);
                    if (dClose < 0) { results.push({ file: 'config.js', ok: false, msg: '未找到配置对象结尾' }); continue; }
                    const dCloseEnd = dClose + 3;
                    ts = ts.slice(0, dStart) + 'export const DUNGEON_EDIT_CFG = {' + '\n' + code + '\n};' + ts.slice(dCloseEnd);
                    try { server.watcher.unwatch(tp); } catch (e) {}
                    fs.writeFileSync(tp, tcrlf ? ts.replace(/\n/g, '\r\n') : ts, 'utf8');
                    try { server.watcher.add(tp); } catch (e) {}
                    console.log('[dladmin-write] config.js dungeon → OK');
                    results.push({ file: 'config.js', ok: true, msg: '地牢配置写入' });
                    continue;
                  }

                  // 🎁 敌人掉落表写入：整块替换 dropRates.js 的 ENEMY_DROP_RATES 对象体
                  if (op.kind === 'dungeonDrops') {
                    const code = String(op.code || '');
                    const tp = pathMod.join(process.cwd(), 'src', 'pages', 'pixi', 'dungeon', 'dropRates.js');
                    if (!fs.existsSync(tp)) { results.push({ file: 'dropRates.js', ok: false, msg: '文件不存在' }); continue; }
                    let ts = fs.readFileSync(tp, 'utf8');
                    const tcrlf = ts.includes('\r\n');
                    ts = ts.replace(/\r\n/g, '\n');
                    const dStart = ts.indexOf('export const ENEMY_DROP_RATES = {');
                    if (dStart < 0) { results.push({ file: 'dropRates.js', ok: false, msg: '未找到 ENEMY_DROP_RATES' }); continue; }
                    const dBodyStart = dStart + 'export const ENEMY_DROP_RATES = {'.length;
                    const dClose = ts.indexOf('\n};', dBodyStart);
                    if (dClose < 0) { results.push({ file: 'dropRates.js', ok: false, msg: '未找到掉落表结尾' }); continue; }
                    const dCloseEnd = dClose + 3;
                    ts = ts.slice(0, dStart) + 'export const ENEMY_DROP_RATES = {' + '\n' + code + '\n};' + ts.slice(dCloseEnd);
                    try { server.watcher.unwatch(tp); } catch (e) {}
                    fs.writeFileSync(tp, tcrlf ? ts.replace(/\n/g, '\r\n') : ts, 'utf8');
                    try { server.watcher.add(tp); } catch (e) {}
                    console.log('[dladmin-write] dropRates.js drops → OK');
                    results.push({ file: 'dropRates.js', ok: true, msg: '掉落表写入' });
                    continue;
                  }
                  // 👾 怪物编辑写入：按怪名定位 enemiesData.js 的怪物对象，指令式替换数值行
                  //    code = JSON 指令数组：[{ monster, section?: null|'skills'|'passives', name?: 技能/被动名, field, value }]
                  //    怪层字段（hp/普攻倍率/易伤等）直接改；技能/被动数值通过 section+name 定位到嵌套对象再改；
                  //    保留其余结构（desc/type/动画/音效等不动）
                  if (op.kind === 'monsters') {
                    const code = String(op.code || '');
                    const tp = pathMod.join(process.cwd(), 'src', 'pages', 'pixi', 'matter1', 'enemiesData.js');
                    if (!fs.existsSync(tp)) { results.push({ file: 'enemiesData.js', ok: false, msg: '文件不存在' }); continue; }
                    let ts = fs.readFileSync(tp, 'utf8');
                    const tcrlf = ts.includes('\r\n');
                    ts = ts.replace(/\r\n/g, '\n');
                    const lines = ts.split('\n');
                    const updated = [];
                    try {
                      for (const ins of JSON.parse(code)) {
                        const nm = String(ins.monster || '');
                        if (!nm || ins.field === undefined) continue;
                        const monsterIdx = lines.findIndex(l => l.includes("name: '" + nm + "',"));
                        if (monsterIdx < 0) { updated.push(nm + '×未找到'); continue; }
                        let mEnd = lines.length;
                        for (let i = monsterIdx + 1; i < lines.length; i++) {
                          if (/^    [A-Za-z_]\w*: \{/.test(lines[i])) { mEnd = i; break; }
                        }
                        let tStart = monsterIdx, tEnd = mEnd;
                        if (ins.section) {
                          // 定位 skills/passives 数组区间
                          const secIdx = lines.slice(monsterIdx, mEnd).findIndex(l => new RegExp('^\\s*' + ins.section + ': \\[').test(l));
                          if (secIdx < 0) { updated.push(nm + '.' + ins.section + '×无数组'); continue; }
                          const secStart = monsterIdx + secIdx;
                          const arrLen = lines.slice(secStart, mEnd).findIndex(l => /^\s*\],/.test(l));
                          const secEnd = secStart + (arrLen < 0 ? (mEnd - secStart) : arrLen);
                          // 定位技能/被动元素（name 行）
                          const nmIdx = lines.slice(secStart, secEnd).findIndex(l => l.includes("name: '" + String(ins.name || '') + "',"));
                          if (nmIdx < 0) { updated.push(nm + '.' + ins.section + '.' + ins.name + '×未找到'); continue; }
                          const objStart = secStart + nmIdx;
                          let objEnd = secEnd;
                          for (let i = objStart + 1; i < secEnd; i++) {
                            if (/^            \{/.test(lines[i]) || /^            \}/.test(lines[i]) || /^\s*\],/.test(lines[i])) { objEnd = i; break; }
                          }
                          tStart = objStart; tEnd = objEnd;
                        }
                        const seg = lines.slice(tStart, tEnd);
                        const vStr = typeof ins.value === 'number' ? String(ins.value) : JSON.stringify(String(ins.value));
                        const ri = seg.findIndex(l => new RegExp('^\\s*' + ins.field + ':').test(l));
                        if (ri >= 0) {
                          seg[ri] = seg[ri].replace(/^(\s*)[A-Za-z_]+\s*:.*/, '$1' + ins.field + ': ' + vStr + ',');
                        } else {
                          // 🔧 无此字段：对象末尾新增一行（缩进参考首个非空行），支持 rank 等新字段
                          const refLine = seg.find(l => l.trim()) || '';
                          const ind = /^(\s*)/.exec(refLine)?.[1] || '    ';
                          seg.push(ind + ins.field + ': ' + vStr + ',');
                        }
                        lines.splice(tStart, tEnd - tStart, ...seg);
                        updated.push(nm + (ins.section ? '.' + ins.section + '.' + ins.name : '') + '.' + ins.field + '✓' + (ri >= 0 ? '' : '(新增)'));
                      }
                    } catch (e) { results.push({ file: 'enemiesData.js', ok: false, msg: '解析失败 ' + (e?.message || e) }); continue; }
                    ts = lines.join('\n');
                    try { server.watcher.unwatch(tp); } catch (e) {}
                    fs.writeFileSync(tp, tcrlf ? ts.replace(/\n/g, '\r\n') : ts, 'utf8');
                    try { server.watcher.add(tp); } catch (e) {}
                    console.log('[dladmin-write] enemiesData.js monsters → OK', updated.join(' / '));
                    results.push({ file: 'enemiesData.js', ok: true, msg: '怪物数值写入：' + updated.join(' / ') });
                    continue;
                  }

                  // 🧭 指引文本写入：替换 i18n/ui-core.js 的 guideHint 词条值（中英各一，保存后刷新游戏生效）
                  if (op.kind === 'guide') {
                    let parsed = {};
                    try { parsed = JSON.parse(String(op.code || '{}')); } catch (e) { results.push({ file: 'ui-core.js', ok: false, msg: 'code 解析失败' }); continue; }
                    const tp = pathMod.join(process.cwd(), 'src', 'i18n', 'ui-core.js');
                    if (!fs.existsSync(tp)) { results.push({ file: 'ui-core.js', ok: false, msg: '文件不存在' }); continue; }
                    let ts = fs.readFileSync(tp, 'utf8');
                    const tcrlf = ts.includes('\r\n');
                    ts = ts.replace(/\r\n/g, '\n');
                    // 依次替换第 1（zh）、第 2（en）处 guideHint 值（值内单引号转义为 \'）
                    const esc = (v) => String(v ?? '').replace(/'/g, "\\'");
                    let replaced = 0;
                    const re = /guideHint:\s*'/g;
                    let m;
                    while ((m = re.exec(ts)) !== null) {
                      replaced++;
                      const val = replaced === 1 ? esc(parsed.zh) : (replaced === 2 ? esc(parsed.en) : null);
                      if (val === null) break;
                      const vStart = re.lastIndex;
                      const vEnd = ts.indexOf("',", vStart);
                      if (vEnd < 0) { replaced = -1; break; }
                      ts = ts.slice(0, vStart) + val + ts.slice(vEnd);
                      re.lastIndex = vStart + val.length; // 继续向后找第 2 处
                    }
                    if (replaced < 2) { results.push({ file: 'ui-core.js', ok: false, msg: '未找到 guideHint 词条(' + replaced + ')' }); continue; }
                    try { server.watcher.unwatch(tp); } catch (e) {}
                    fs.writeFileSync(tp, tcrlf ? ts.replace(/\n/g, '\r\n') : ts, 'utf8');
                    try { server.watcher.add(tp); } catch (e) {}
                    console.log('[dladmin-write] ui-core.js guide → OK');
                    results.push({ file: 'ui-core.js', ok: true, msg: '指引文本写入' });
                    continue;
                  }

                  // 🎖 卡牌熟练度写入：按卡名在 DEFAULT_CARD_DATA 各卡对象内注入/删除 mastery 字段（不碰卡牌其他字段）
                  if (op.kind === 'cardMastery') {
                    let parsed = {};
                    try { parsed = JSON.parse(String(op.code || '{}')); } catch (e) { results.push({ file: 'configs.js', ok: false, msg: 'code 解析失败' }); continue; }
                    const tp = pathMod.join(process.cwd(), 'src', 'store', 'configs.js');
                    if (!fs.existsSync(tp)) { results.push({ file: 'configs.js', ok: false, msg: '文件不存在' }); continue; }
                    let ts = fs.readFileSync(tp, 'utf8');
                    const tcrlf = ts.includes('\r\n');
                    ts = ts.replace(/\r\n/g, '\n');
                    const anchor = 'export const DEFAULT_CARD_DATA = {';
                    const aIdx = ts.indexOf(anchor);
                    if (aIdx < 0) { results.push({ file: 'configs.js', ok: false, msg: '未找到 DEFAULT_CARD_DATA' }); continue; }
                    const zoneEnd = ts.indexOf('\n};', aIdx);
                    if (zoneEnd < 0) { results.push({ file: 'configs.js', ok: false, msg: '未找到 DEFAULT_CARD_DATA 结尾' }); continue; }
                    let zone = ts.slice(aIdx, zoneEnd);
                    let updated = [];
                    for (const [name, cfg] of Object.entries(parsed)) {
                      // 在区域内定位卡对象行（缩进2空格 + "卡名": {）
                      const cardRe = new RegExp('\n  ' + JSON.stringify(String(name)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': \\{');
                      const cStart = zone.search(cardRe);
                      if (cStart < 0) { updated.push(name + '×未找到卡'); continue; }
                      // 卡块范围：卡名行之后（行尾换行 +1），到下一个顶层卡名行（\n  "xxx": {）或区域结尾
                      const cHeadEnd = zone.indexOf('\n', cStart + 1) + 1;
                      const nextCardRe = /\n  "[^"]+": \{/g;
                      nextCardRe.lastIndex = cHeadEnd;
                      const nxt = nextCardRe.exec(zone);
                      const cEnd = nxt ? nxt.index : zone.length;
                      const block = zone.slice(cHeadEnd, cEnd);
                      // 删除已有 mastery 行（单行对象）
                      let newBlock = block.replace(/\n[ \t]*"mastery": \{[^\n]*\},?/g, '');
                      let opMsg;
                      if (cfg && (cfg.type === 'flatDmg' || cfg.type === 'percentDmg') && Number(cfg.value) > 0) {
                        const msJson = '{"base":' + (Number(cfg.base) || 100) + ',"type":' + JSON.stringify(cfg.type) + ',"value":' + (Number(cfg.value) || 0) + ',"desc":' + JSON.stringify(String(cfg.desc || '')) + '}';
                        newBlock = '    "mastery": ' + msJson + ',\n' + newBlock;
                        opMsg = name + '✓';
                      } else {
                        opMsg = name + '(删除)' + (block.includes('"mastery"') ? '✓' : '·无字段');
                      }
                      zone = zone.slice(0, cHeadEnd) + newBlock + zone.slice(cEnd);
                      updated.push(opMsg);
                    }
                    ts = ts.slice(0, aIdx) + zone + ts.slice(zoneEnd);
                    try { server.watcher.unwatch(tp); } catch (e) {}
                    fs.writeFileSync(tp, tcrlf ? ts.replace(/\n/g, '\r\n') : ts, 'utf8');
                    try { server.watcher.add(tp); } catch (e) {}
                    console.log('[dladmin-write] configs.js cardMastery → OK', updated.join(' / '));
                    results.push({ file: 'configs.js', ok: true, msg: '熟练度写入：' + updated.join(' / ') });
                    continue;
                  }

                  const rawFile = String(op.file || '');
                  const file = rawFile.replace(/\.js$/, '');
                  if (!/^[\w-]+$/.test(file)) { results.push({ file: rawFile, ok: false, msg: '非法文件名' }); continue; }
                  const p = pathMod.join(base, file + '.js');
                  if (!p.startsWith(base)) { results.push({ file, ok: false, msg: '非法路径' }); continue; }
                  if (!fs.existsSync(p)) { results.push({ file, ok: false, msg: '文件不存在' }); continue; }
                  let s = fs.readFileSync(p, 'utf8');
                  const crlf = s.includes('\r\n');
                  s = s.replace(/\r\n/g, '\n');
                  let changed = false, msg = '';
                  if (op.kind === 'insert') {
                    const code = String(op.code || '');
                    const afterId = op.afterId;
                    const pos = op.pos === 'after' ? 'after' : (op.pos === 'end' ? 'end' : 'before');
                    let insertAt = -1;
                    if (!afterId || pos === 'end') {
                      const idx = s.search(/\n\};/);
                      if (idx < 0) { results.push({ file, ok: false, msg: '未找到文件末尾' }); continue; }
                      insertAt = idx;
                    } else if (pos === 'after') {
                      const start = s.indexOf('\n  ' + afterId + ': ');
                      if (start < 0) { results.push({ file, ok: false, msg: '未找到锚点 ' + afterId }); continue; }
                      // 单行节点（`sr02: {...},` 整行结束）没有 '\n  },' 边界，需按行尾处理
                      const lineEnd = s.indexOf('\n', start + 1);
                      const firstLine = (lineEnd < 0 ? s.slice(start) : s.slice(start, lineEnd));
                      let blockEnd;
                      if (/},\s*$/.test(firstLine)) {
                        blockEnd = start + firstLine.length;
                      } else {
                        const e = s.indexOf('\n  },', start);
                        if (e < 0) { results.push({ file, ok: false, msg: '未找到节点边界 ' + afterId }); continue; }
                        blockEnd = e + 5;
                      }
                      insertAt = blockEnd;
                    } else {
                      const idx = s.indexOf('\n  ' + afterId + ': ');
                      if (idx < 0) { results.push({ file, ok: false, msg: '未找到锚点 ' + afterId }); continue; }
                      insertAt = idx;
                    }
                    const prefix = (insertAt > 0 && s[insertAt - 1] !== '\n') ? '\n' : '';
                    s = s.slice(0, insertAt) + prefix + code + s.slice(insertAt);
                    changed = true; msg = '插入 ' + (op.id || '');
                  } else if (op.kind === 'replace') {
                    const id = String(op.id || '');
                    const code = String(op.code || '');
                    const start = s.indexOf('\n  ' + id + ': ');
                    if (start < 0) { results.push({ file, ok: false, msg: '未找到节点 ' + id }); continue; }
                    // 单行节点（`sr02: {...},` 整行结束）没有 '\n  },' 边界，需按行尾处理，避免误删后续节点
                    const lineEnd = s.indexOf('\n', start + 1);
                    const firstLine = (lineEnd < 0 ? s.slice(start) : s.slice(start, lineEnd));
                    let end;
                    if (/},\s*$/.test(firstLine)) {
                      end = start + firstLine.length;
                    } else {
                      const e = s.indexOf('\n  },', start);
                      if (e < 0) { results.push({ file, ok: false, msg: '未找到节点边界 ' + id }); continue; }
                      end = e + 5;
                    }
                    s = s.slice(0, start) + '\n' + code + s.slice(end);
                    changed = true; msg = '替换 ' + id;
                  } else if (op.kind === 'delete') {
                    const id = String(op.id || '');
                    const lines = s.split('\n');
                    let si = -1;
                    for (let i = 0; i < lines.length; i++) { if (lines[i].startsWith('  ' + id + ': ')) { si = i; break; } }
                    if (si < 0) { results.push({ file, ok: false, msg: '未找到节点 ' + id }); continue; }
                    let ei = si;
                    if (!/},\s*$/.test(lines[si])) {
                      for (let i = si + 1; i < lines.length; i++) { if (/^  },/.test(lines[i])) { ei = i; break; } }
                      if (ei === si) { results.push({ file, ok: false, msg: '未找到节点边界 ' + id }); continue; }
                    }
                    lines.splice(si, ei - si + 1);
                    s = lines.join('\n');
                    changed = true; msg = '删除 ' + id;
                  } else if (op.kind === 'nextRetarget') {
                    const fromId = String(op.fromId || '');
                    const toId = String(op.toId || '');
                    const start = s.indexOf('\n  ' + fromId + ': ');
                    if (start < 0) { results.push({ file, ok: false, msg: '未找到节点 ' + fromId }); continue; }
                    // 单行节点（`sr02: {...},` 整行结束）没有 '\n  },' 边界，需按行尾处理
                    const lineEnd = s.indexOf('\n', start + 1);
                    const firstLine = (lineEnd < 0 ? s.slice(start) : s.slice(start, lineEnd));
                    const isSingle = /},\s*$/.test(firstLine);
                    let end;
                    if (isSingle) {
                      end = start + firstLine.length;
                    } else {
                      const e = s.indexOf('\n  },', start);
                      if (e < 0) { results.push({ file, ok: false, msg: '未找到节点边界 ' + fromId }); continue; }
                      end = e + 5;
                    }
                    const block = s.slice(start, end);
                    const m = isSingle ? block.match(/next:\s*["'][^"']*["']/) : block.match(/^    next:\s*["'][^"']*["']/m);
                    if (!m) { results.push({ file, ok: false, msg: '节点 ' + fromId + ' 无 next 字段，无法重定向' }); continue; }
                    const repl = isSingle ? 'next: ' + JSON.stringify(toId) : '    next: ' + JSON.stringify(toId);
                    s = s.slice(0, start) + block.replace(m[0], repl) + s.slice(end);
                    changed = true; msg = fromId + '.next → ' + toId;
                  }
                  if (changed) {
                    // 🛡️ 写入期间临时取消该文件监听，避免 Vite 检测到数据文件变化触发整页 reload，
                    //    导致「直接写入项目」后页面又二次加载（writeToProject 手动 loadFile 已负责刷新）
                    try { server.watcher.unwatch(p); } catch (e) {}
                    fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
                    try { server.watcher.add(p); } catch (e) {}
                  }
                  console.log('[dladmin-write]', file, op.kind, '→', (changed ? 'OK ' + msg : 'FAIL ' + (msg || '未知 kind 未处理')) + (op.kind === 'nextRetarget' ? ' [from=' + op.fromId + ' to=' + op.toId + ']' : ''));
                  results.push({ file, ok: changed, msg });
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true, results }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, msg: String((e && e.message) || e) }));
              }
            });
          });
        },
      },
    ],
    base: "./",
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },

    // 📦 构建产物拆分：大依赖各自独立 chunk（并行加载 + 缓存复用）
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'pinia', 'vue-router', 'pinia-plugin-persistedstate'],
            'vendor-ep': ['element-plus', '@element-plus/icons-vue'],
            'vendor-pixi': ['pixi-filters', 'pixi-tiledmap', 'pixi-viewport', '@pixi/particle-emitter'],
            'vendor-spine': ['@esotericsoftware/spine-core', '@esotericsoftware/spine-pixi-v8'],
            'vendor-libs': ['gsap', 'howler', 'matter-js', 'sat', 'mitt'],
          },
        },
      },
    },

    server: {
      host: '0.0.0.0',
      port: 8081,
      proxy: {
        [env.VITE_BASE_URL]: {
          target: env.VITE_LOGIN_NAME,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(new RegExp(`^${env.VITE_BASE_URL}`), "")
        }
      },
    },
  }
})
