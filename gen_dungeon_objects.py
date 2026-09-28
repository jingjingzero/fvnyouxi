# -*- coding: utf-8 -*-
"""
为 dungeon.tmj 添加对象层 dungeon_objects：
  - spawn 对象：玩家出生点（取自地图中心附近可走格）
  - item 对象：可拾取道具（分散在 4 个房间的可走格）
地图宽高不固定，坐标由当前 tmj 的地板/墙壁数据动态计算。
"""
import json, io

P = r'D:\youxi\fvnyouxi\public\map\dungeon.tmj'
tmj = json.load(io.open(P, encoding='utf-8'))

W, H = tmj['width'], tmj['height']
TW = tmj['tilewidth']

# 找到"地板与墙壁"tilelayer，解析 gid 网格
grid = None
for l in tmj['layers']:
    if l.get('type') == 'tilelayer':
        grid = l['data']
        break
assert grid is not None, '找不到 tilelayer'
assert len(grid) == W * H

WALL_GIDS = set(range(5, 9))  # 墙壁 gid 5-8（solid）

def is_walkable(c, r):
    if c < 0 or c >= W or r < 0 or r >= H:
        return False
    return grid[r * W + c] not in WALL_GIDS

# 收集可走格，按房间（十字墙分隔：垂直内墙 col≈W//2，水平内墙 row≈H//2）
# 通用做法：用 BFS/曼哈顿近似，这里直接按坐标分 4 区
midC, midR = W // 2, H // 2
rooms = {'tl': [], 'tr': [], 'bl': [], 'br': []}
for r in range(H):
    for c in range(W):
        if is_walkable(c, r):
            if c < midC and r < midR: rooms['tl'].append((c, r))
            elif c >= midC and r < midR: rooms['tr'].append((c, r))
            elif c < midC and r >= midR: rooms['bl'].append((c, r))
            else: rooms['br'].append((c, r))

def pick_center(cells):
    """取最接近房间中心的格"""
    if not cells:
        return None
    # 平均中心
    avg_c = sum(x for x, y in cells) / len(cells)
    avg_r = sum(y for x, y in cells) / len(cells)
    return min(cells, key=lambda p: (p[0] - avg_c) ** 2 + (p[1] - avg_r) ** 2)

# ---- 出生点：取左上房间中心附近 ----
spawn = pick_center(rooms['tl'])
if spawn is None:
    # 兜底：全图第一个可走格
    for r in range(2, H - 2):
        for c in range(2, W - 2):
            if is_walkable(c, r):
                spawn = (c, r); break
        if spawn: break

# ---- 道具分布：每个房间若干可走格 ----
# 物品配置：itemId（对应背包物品名）, num（数量）
ITEM_PLAN = [
    ('魔晶', 3), ('草药', 2),
    ('纯净水', 2), ('灵力晶核', 1),
    ('果实', 2), ('精灵果实', 1),
    ('金币', 30),
]
# 为每个道具分配格：按房间循环（tr, bl, br, tl 各放，避免挤一起）
room_cycle = ['tr', 'bl', 'br', 'tl']
def room_cells_excluding(rooms, key, used):
    cells = [p for p in rooms[key] if p not in used]
    return cells

used = set()
if spawn:
    used.add(spawn)
item_objs = []
for idx, (name, num) in enumerate(ITEM_PLAN):
    key = room_cycle[idx % len(room_cycle)]
    cells = [p for p in rooms[key] if p not in used]
    if not cells:
        # 换房间找
        for k2 in room_cycle:
            cells = [p for p in rooms[k2] if p not in used]
            if cells:
                key = k2; break
    if not cells:
        continue
    pos = pick_center(cells) if len(cells) > 3 else cells[0]
    used.add(pos)
    item_objs.append({'name': name, 'num': num, 'col': pos[0], 'row': pos[1]})

# ---- 构造对象层 ----
objects = []
oid = 1
if spawn:
    objects.append({
        'id': oid, 'name': 'spawn', 'type': 'point', 'x': spawn[0] * TW + TW // 2,
        'y': spawn[1] * TW + TW // 2, 'width': 0, 'height': 0, 'rotation': 0, 'visible': True,
    })
    oid += 1
for it in item_objs:
    objects.append({
        'id': oid, 'name': 'item', 'type': 'point', 'x': it['col'] * TW + TW // 2,
        'y': it['row'] * TW + TW // 2, 'width': 0, 'height': 0, 'rotation': 0, 'visible': True,
        'properties': [
            {'name': 'itemId', 'type': 'string', 'value': it['name']},
            {'name': 'num', 'type': 'int', 'value': it['num']},
        ],
    })
    oid += 1

object_layer = {
    'id': len(tmj['layers']) + 1,
    'name': 'dungeon_objects',
    'opacity': 1,
    'type': 'objectgroup',
    'visible': True,
    'x': 0, 'y': 0,
    'objects': objects,
}

# 替换/新增对象层
tmj['layers'] = [l for l in tmj['layers'] if l.get('type') != 'objectgroup']
tmj['layers'].append(object_layer)
tmj['nextobjectid'] = oid

json.dump(tmj, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

print('地图尺寸:', W, 'x', H)
print('出生点:', spawn)
print('道具:')
for it in item_objs:
    print('   ', it['name'], 'x', it['num'], '@', (it['col'], it['row']))
print('对象层已写入 dungeon.tmj')
