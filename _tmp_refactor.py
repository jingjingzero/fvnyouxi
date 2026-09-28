import io

f = 'src/pages/pixi/fight/battle.js'
lines = io.open(f, encoding='utf-8').read().split('\n')

# 9 个 if 块区间（1-indexed 行号，含前置注释行），与 handler 名
BLOCKS = [
    (2224, 2239, 'handleActionBarReduce'),
    (2241, 2251, 'handleStun'),
    (2253, 2273, 'handlePoisonDetonate'),
    (2275, 2352, 'handleBuffSelf'),
    (2355, 2400, 'handleSummon'),
    (2402, 2422, 'handleHealAllies'),
    (2424, 2445, 'handleMultiHitWind'),
    (2447, 2498, 'handleElectroField'),
    (2500, 2515, 'handleSingleDamageFly'),
]

# 0-indexed
def rng(a, b):  # 含两端
    return list(range(a - 1, b))

# 1) 提取每块原文并转 handler（保留注释/逻辑逐字，仅改缩进与签名）
handlers = {}
for (a, b, name) in BLOCKS:
    block = '\n'.join([lines[i] for i in rng(a, b)])
    out = []
    started = False
    for ln in block.split('\n'):
        if 'if (skill.type ===' in ln and not started:
            started = True
            out.append('  function ' + name + '(enemyUnit, skill, attackDone) {')
            continue
        if started:
            if ln.strip() == '}':
                out.append('  }')
                continue
            out.append(ln[2:] if ln.startswith('    ') else ln)
        else:
            out.append(ln[2:] if ln.startswith('    ') else ln)
    handlers[name] = '\n'.join(out)

# 2) 替换：enemyUseSkill 内 9 块区域 → 分发表调用（保留头 2202-2222 与兜底 2516-2518）
#    2516 是空行（2515 后），2517-2518 兜底
header = lines[:2222]           # 0..2221 = 行1..2222
body_new = [
    '    // 🔥 分发表路由：按技能类型分发到独立 handler（9+ 分支收敛，行为零变化）',
    '    //    新技能类型：enemySkillHandlers 注册一行即可',
    '    const handler = enemySkillHandlers[skill.type]',
    '    if (handler) {',
    '      handler(enemyUnit, skill, attackDone)',
    '      return',
    '    }',
]
tail = lines[2516:]             # 0-indexed 2516 = 行2517 起（兜底 + 闭合 + 后续）

# 3) 在 enemyUseSkill 闭合后插入 handlers + 注册表
handlers_txt = '\n\n'.join(handlers.values())
registry = (
    '  // 📋 敌人技能分发表（type → handler）：收敛 9+ 分支，新技能类型注册一行',
    '  const enemySkillHandlers = {',
    "    singleDamage_actionBarReduce: handleActionBarReduce,",
    "    singleDamage_actionBarReduce1: handleActionBarReduce, // 与 Reduce 同一逻辑，仅特效配置按各自 type",
    "    singleDamage_stun: handleStun,",
    "    poisonDetonate: handlePoisonDetonate,",
    "    buffSelf: handleBuffSelf,",
    "    summon: handleSummon,",
    "    healAllies: handleHealAllies,",
    "    multiHit_wind: handleMultiHitWind,",
    "    electro_field: handleElectroField,",
    "    singleDamage_fly: handleSingleDamageFly,",
    '  }',
)

# 组装：header + body_new + 空行 + 兜底行(2516=空行已含?) 检查
# tail[0] 是行2517 的兜底注释（2516 空行已在 header 后缺——检查：原行2516 是空行，已在 header? header 到行2222，body_new 后需要空行）
# 原结构：行2222(attackDone 闭合) 行2223(空行? 看读取 2223 是空) —— 检查 2223 行
# 简单处理：header 取到行2222；2223 空行丢弃由 body_new 自带结构；tail 从行2516（空行）开始
tail = lines[2516:]
# 若 tail[0] 为空行则保留（兜底前空行）

new = header + [''] + body_new + [''] + tail[:0] + tail
# 插入 handlers：找 tail 里 enemyUseSkill 闭合 '  }'（2519 行）之后
# 更稳：在 '  // 🎯 召唤暗影分身（暗影王技能）' 前插入
insert_marker = '  // 🎯 召唤暗影分身（暗影王技能）'
out = []
done = False
for ln in new:
    if not done and insert_marker in ln:
        out.append(handlers_txt)
        out.append('')
        out.extend(registry)
        out.append('')
        out.append('')
        done = True
    out.append(ln)
assert done, 'INSERT MARKER NOT FOUND'

io.open(f, 'w', encoding='utf-8').write('\n'.join(out))
print('REBUILD OK, handlers:', len(handlers))
