const fs = require('fs')
function load(p) {
  let s = fs.readFileSync(p, 'utf8')
  const crlf = s.includes('\r\n')
  return { p, s: s.replace(/\r\n/g, '\n'), crlf }
}
function save(o) { fs.writeFileSync(o.p, o.crlf ? o.s.replace(/\n/g, '\r\n') : o.s, 'utf8') }
function rep(o, oldStr, newStr, expect = 1) {
  const count = o.s.split(oldStr).length - 1
  if (count !== expect) { console.error('MISMATCH', expect, count, JSON.stringify(oldStr.slice(0, 80))); process.exit(1) }
  o.s = o.s.split(oldStr).join(newStr)
}

// ========== 1. pixi.vue：新增 updatePlayerSlowIcons（同中毒布局：蓝色方块+🐢，右上回合/右下层数，无文字） ==========
const px = load('D:/youxi/fvnyouxi/src/pages/pixi/fight/pixi.vue')
rep(px,
  "// 更新血条填充比例（带平滑过渡动画）\nfunction updateHpBarFill(hpBar, ratio) {",
  [
    '// 🐢 玩家减速 debuff 图标（同中毒布局：蓝色方块 + 🐢，右上回合数/右下层数，无文字）',
    'let _slowIcons = [];',
    'function updatePlayerSlowIcons(slows) {',
    '    if (!playerBuffContainer) return;',
    '    for (const ic of _slowIcons) {',
    '        try { if (ic.parent === playerBuffContainer) playerBuffContainer.removeChild(ic); } catch (e) { /* ignore */ }',
    '        try { ic.destroy?.({ children: true }); } catch (e) { /* ignore */ }',
    '    }',
    '    _slowIcons = [];',
    '    if (!slows || slows.length === 0) {',
    '        // 没有减速时，若容器空则隐藏（中毒/buff 图标存在则保持可见）',
    '        if (playerBuffContainer.children.length === 0) playerBuffContainer.visible = false;',
    '        return;',
    '    }',
    '    playerBuffContainer.visible = true;',
    '    const iconSize = PLAYER_BUFF_ICON_SIZE * 0.8;',
    '    const iconGap = PLAYER_BUFF_GAP;',
    '    // 排在 buff 图标和中毒图标之后',
    '    const baseIdx = _lastBuffIconCount + (_poisonIcon ? 1 : 0);',
    '    slows.forEach((d, i) => {',
    '        const x = (baseIdx + i) * (iconSize + iconGap) + iconSize / 2;',
    '        const y = iconSize / 2;',
    '        const stacks = d.stacks ?? 1;',
    '        const g = new Graphics()',
    '            .roundRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6)',
    '            .fill({ color: 0x0c1c2e, alpha: 0.92 })',
    '            .stroke({ color: 0x38bdf8, width: 2 });',
    '        const mark = new Text({',
    "            text: '🐢',",
    '            style: { fill: 0x38bdf8, fontSize: iconSize * 0.6, fontWeight: \'bold\', stroke: { color: 0x000000, width: 2 } }',
    '        });',
    '        mark.anchor.set(0.5, 0.5);',
    '        g.addChild(mark);',
    '        g.x = x;',
    '        g.y = y;',
    '        playerBuffContainer.addChild(g);',
    '        // 角标数字共用右外侧竖线（同中毒图标）',
    '        const numX = iconSize / 2 + VH(0.5);',
    '        // 右上角：剩余回合数（黄色）',
    '        if (d.remaining !== undefined && d.remaining > 0) {',
    '            const rt = new Text({',
    '                text: `${d.remaining}`,',
    '                style: { fill: 0xffcc00, fontSize: VH(2.2), fontWeight: \'bold\', stroke: { color: 0x000000, width: 2 } }',
    '            });',
    '            rt.anchor.set(0.5, 0.5);',
    '            rt.x = numX;',
    '            rt.y = -iconSize / 2 - VH(0.05);',
    '            g.addChild(rt);',
    '        }',
    '        // 右下角：层数（白色）',
    '        if (stacks > 0) {',
    '            const st = new Text({',
    '                text: `${stacks}`,',
    '                style: { fill: 0xffffff, fontSize: VH(2.2), fontWeight: \'bold\', stroke: { color: 0x000000, width: 2 } }',
    '            });',
    '            st.anchor.set(0.5, 0.5);',
    '            st.x = numX;',
    '            st.y = iconSize / 2 + VH(0.05);',
    '            g.addChild(st);',
    '        }',
    '        _slowIcons.push(g);',
    '    });',
    '}',
    '',
    '// 更新血条填充比例（带平滑过渡动画）',
    'function updateHpBarFill(hpBar, ratio) {',
  ].join('\n'))
save(px)

// ========== 2. battle.js：handleSlow 施加/刷新减速后通知 UI ==========
const b = load('D:/youxi/fvnyouxi/src/pages/pixi/fight/battle.js')
rep(b,
  "      if (isNew) applyBuffSideEffects(player, { type: 'slow', speedDebuff })\n      _playerInstanceCache?.showBuffText?.(`缠绕-${Math.round(slowPct * 100)}%`)",
  "      if (isNew) applyBuffSideEffects(player, { type: 'slow', speedDebuff })\n      _playerInstanceCache?.showBuffText?.(`缠绕-${Math.round(slowPct * 100)}%`)\n      emitter.emit('playerSlowChanged') // 🐢 通知战斗页刷新减速图标")
save(b)

// ========== 3. index.vue：移除 DOM 减速图标 + slowIcon，改 computed 为 map，监听 playerSlowChanged + 回合刷新 ==========
const iv = load('D:/youxi/fvnyouxi/src/pages/pixi/fight/index.vue')
// 3a. 模板移除 DOM 减速图标块
rep(iv,
  [
    '            <!-- 🐢 玩家减速 debuff 图标（血条下方）：缠绕/霜冻/冰寒等带 speedDebuff 的显示减速图标与剩余回合 -->',
    '            <div v-if="playerSlowDebuffs.length > 0"',
    '                class="absolute top-[4.7vh] left-0.5vw z-2 flex items-center gap-1">',
    '                <div v-for="d in playerSlowDebuffs" :key="d.name"',
    '                    class="flex items-center gap-0.5 bg-black/55 text-white rounded px-1vw py-0.4vh text-1.5vh font-bold border border-white/15 shadow">',
    '                    <span>{{ slowIcon(d.name) }}</span>',
    '                    <span>{{ d.name }}</span>',
    '                    <span class="text-sky-300">{{ d.remaining }}</span>',
    '                </div>',
    '            </div>',
    '        </div>',
    '        <template v-if="showEndButton">',
  ].join('\n'),
  '        </div>\n        <template v-if="showEndButton">')
// 3b. computed 改为 map + 移除 slowIcon
rep(iv,
  [
    '// 🐢 玩家减速 debuff（缠绕/霜冻/冰寒等带 speedDebuff 的）——血条下方显示减速图标与剩余回合',
    'const playerSlowDebuffs = computed(() => {',
    '    return (player.debuffs || []).filter(d => d.speedDebuff != null && d.speedDebuff !== 0);',
    '});',
    'function slowIcon(name) {',
    "    return { '缠绕': '🐢', '霜冻': '❄️', '冰寒': '❄️' }[name] || '🐢';",
    '}',
  ].join('\n'),
  [
    '// 🐢 玩家减速 debuff（缠绕/霜冻/冰寒等带 speedDebuff 的）——pixi 层图标（同中毒布局，右上回合/右下层数）',
    'const playerSlowDebuffs = computed(() => {',
    '    return (player.debuffs || [])',
    '        .filter(d => d.speedDebuff != null && d.speedDebuff !== 0)',
    '        .map(d => ({ name: d.name, remaining: d.remaining, stacks: d.stacks ?? 1 }));',
    '});',
    'const handlePlayerSlowChanged = () => {',
    '    pixiIndexRef.value?.updatePlayerSlowIcons?.(playerSlowDebuffs.value);',
    '};',
    'emitter.on("playerSlowChanged", handlePlayerSlowChanged);',
  ].join('\n'))
// 3c. 玩家回合开始刷新减速图标（覆盖到期移除）
rep(iv,
  "    nextTick(() => {\n        pixiIndexRef.value?.updatePlayerBuffIcons(player.buffs)\n    })",
  "    nextTick(() => {\n        pixiIndexRef.value?.updatePlayerBuffIcons(player.buffs)\n        pixiIndexRef.value?.updatePlayerSlowIcons?.(playerSlowDebuffs.value)\n    })")
save(iv)

console.log('PATCHED slow icons (pixi.vue + battle.js + index.vue)')
