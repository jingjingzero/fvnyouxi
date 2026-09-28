/**
 * 对话路由条件判断 —— 公共模块
 *
 * 供两处共用，避免重复写判断逻辑：
 * - daoju.js 的 buildOnClickFromClickData（问号点击路由）
 * - duihua.vue 的 dialogueList（昼夜CG后的自动对话选择）
 *
 * 支持的条件字段（写任意组合，全部满足才通过）：
 * - needNpc: string|string[]   → 需要指定 NPC 存在于 npcDataList 才通过（匹配 id / juese）
 * - ifCarryNpc: string|string[] → 当前【携带的队友】（npcAlly，如 'tuzi'/'jinmao'）匹配才通过；传数组表示任一匹配即通过
 * - ifNotCompleted: string|string[] → 该对话【未完成】才通过；传数组表示【全部】未完成才通过
 * - ifCompleted: string|string[]    → 该对话【已完成】才通过；传数组表示【全部】已完成才通过
 * - ifAnyCompleted: string[]   → 数组中【任意一个】对话已完成则【不通过】（共同事件互斥）
 * - ifCompletedToday: string[] → 数组中【任意一个】对话今天已完成则【不通过】（同一天互斥）
 * - ifFlag: string|string[]    → 该对话 flag 为【真】才通过；传数组表示【全部】为真才通过
 * - ifNotFlag: string|string[] → 该对话 flag 为【假】才通过；传数组表示【全部】为假才通过（任一为真则跳过）
 * - ifDayGte: number           → 当前天数 ≥ 该值才通过（第 N 天后解锁）
 * - ifDayEqualsFlag: string    → 当前天数必须 === 某标记记录的天数才通过（只在那天生效）
 * - ifDaysSinceFlag: {flag, min} → 从某标记记录的天数起至少过 min 天才通过（入队后 N 天解锁）
 * - needItem: string|string[]  → 背包需拥有指定物品才通过（可配 needItemNum 指定数量）
 * - needAffection: {npc, min}|数组 → 指定 NPC 好感度达标才通过（数组 = 全部达标）
 *
 * 用法示例：
 *   matchDialogueCondition({ needNpc: 'tuzi', ifDayGte: 3, ifCompletedToday: ['hl50'] })
 *   matchDialogueCondition({ ifCompleted: ['hd390', 'hd420'] })   // 两个都已完成才通过
 *   matchDialogueCondition({ needItem: '草药', needAffection: { npc: 'huli', min: 50 } })
 *   findFirstMatchable(dialogueList, { checkCompleteKey: 'id' })
 */
import { useCounterStore } from "@/store/counter";

/**
 * 判断单个条件对象是否全部满足
 * @param {Object} cond - 条件对象（可含上方任意字段）
 * @returns {boolean} true=满足（该步可触发）
 */
export function matchDialogueCondition(cond = {}) {
  const user = useCounterStore();
  const today = user.pixi.player?.day ?? 1;

  // 1. 对话完成状态
  //    ifNotCompleted / ifCompleted 支持单个字符串或数组：
  //    - 传数组时表示【全部】满足该状态才通过（ifCompleted = 全部已完成；ifNotCompleted = 全部未完成）
  const toList = (v) => Array.isArray(v) ? v : (v != null ? [v] : []);
  const notCompletedList = toList(cond.ifNotCompleted);
  if (notCompletedList.length > 0 && notCompletedList.some(id => user.isDialogueComplete(id))) return false;
  const completedList = toList(cond.ifCompleted);
  if (completedList.length > 0 && !completedList.every(id => user.isDialogueComplete(id))) return false;

  // 1.5 对话 flag 判断（setDialogueFlag / getDialogueFlag 存的布尔标记）
  //    ifFlag / ifNotFlag 支持单个字符串或数组：
  //    - ifFlag = 全部为真才通过；ifNotFlag = 全部为假才通过（任一为真则跳过）
  const flagList = toList(cond.ifFlag);
  if (flagList.length > 0 && !flagList.every(f => !!user.getDialogueFlag(f))) return false;
  const notFlagList = toList(cond.ifNotFlag);
  if (notFlagList.length > 0 && notFlagList.some(f => !!user.getDialogueFlag(f))) return false;

  // 2. 共同事件互斥：任一已完成 → 不通过
  if (Array.isArray(cond.ifAnyCompleted) && cond.ifAnyCompleted.some(id => user.isDialogueComplete(id))) {
    return false;
  }

  // 3. 同一天互斥：任一今天已完成 → 不通过
  if (Array.isArray(cond.ifCompletedToday)) {
    const doneToday = cond.ifCompletedToday.some(id => {
      const rec = user.pixi.dialogueProgress?.[id];
      return rec?.completed && rec.completedDay === today;
    });
    if (doneToday) return false;
  }

  // 4. 天数 ≥ N
  if (cond.ifDayGte != null && today < cond.ifDayGte) return false;

  // 5. 必须等于某标记记录的天数（只在那天生效，过天失效）
  if (cond.ifDayEqualsFlag) {
    const recordDay = user.getDialogueFlag(cond.ifDayEqualsFlag);
    console.log("recordDay=",recordDay)
    if (typeof recordDay !== 'number' || recordDay <= 0) return false; // 未记录 → 不通过
    if (today !== recordDay) return false;                             // 不是同一天 → 不通过
  }

  // 6. 入队/事件后 N 天（当前天数 >= 记录日 + min）
  if (cond.ifDaysSinceFlag) {
    const { flag, min = 1 } = cond.ifDaysSinceFlag;
    const recordDay = user.getDialogueFlag(flag);
    if (typeof recordDay !== 'number' || recordDay <= 0) return false; // 未记录 → 不通过
    if (today < recordDay + min) return false;                         // 天数不足 → 不通过
  }

  // 7. 需要指定 NPC 存在于地图上（npcDataList）
  if (cond.needNpc) {
    const needList = Array.isArray(cond.needNpc) ? cond.needNpc : [cond.needNpc];
    const npcExists = needList.every(need =>
      (user.pixi.npcDataList || []).some(n => n.id === need || n.juese === need)
    );
    if (!npcExists) return false;
  }

  // 8.5 携带队友检测：ifCarryNpc（string|string[]）→ 当前携带的队友（npcAlly）匹配才通过
  if (cond.ifCarryNpc) {
    const carryList = Array.isArray(cond.ifCarryNpc) ? cond.ifCarryNpc : [cond.ifCarryNpc];
    const curCarry = user.getNpcAlly?.() || user.pixi?.npcAlly || null;
    if (!curCarry || !carryList.includes(curCarry)) return false;
  }

  // 9. 背包物品检测：needItem（string|string[]，可配 needItemNum 指定数量）
  if (cond.needItem && !user.hasInventoryItem?.(cond.needItem, cond.needItemNum ?? 1)) {
    return false;
  }

  // 10. NPC好感度检测：needAffection（{npc, min} 或数组 = 全部达标）
  if (cond.needAffection && !user.hasNpcAffection?.(cond.needAffection)) {
    return false;
  }

  return true;
}

/**
 * 从数组中找出第一个满足条件的条目
 * @param {Array<Object>} list - 条件对象数组（如 dialogueList / route 数组）
 * @param {Object} [opts]
 * @param {string} [opts.checkCompleteKey] - 指定字段名（如 'id' / 'name'），
 *        该字段对应的对话已完成时也视为不满足（用于 dialogueList 的 id 字段）
 * @returns {Object|null} 命中的条目；没有返回 null
 */
export function findFirstMatchable(list = [], opts = {}) {
  const user = useCounterStore();
  const { checkCompleteKey = null } = opts;
  return list.find(item => {
    // 可选的"自身对话完成检查"（duihua.vue 用 id，route 步骤可用 name）
    if (checkCompleteKey && item[checkCompleteKey] && user.isDialogueComplete(item[checkCompleteKey])) {
      return false;
    }
    return matchDialogueCondition(item);
  }) || null;
}

// ========================================================================
// 对话条件工厂 —— 供「对话选项 options.condition」「问号路由」等需要函数式判断的场景复用。
// 每个方法返回一个 () => boolean 的判定函数；按类别分组，命名与声明式字段一一对应。
//
// 【分类速查】
// 一、对话完成状态
//   cond.notCompleted(id)        该对话未完成才通过
//   cond.completed(id)           该对话已完成才通过
//   cond.notAnyCompleted(ids)    数组中任一个已完成 → 不通过（共同事件互斥）
//   cond.notCompletedToday(ids)  数组中任一个今天已完成 → 不通过（同一天互斥）
// 二、Flag 布尔 / 数字标记
//   cond.flag(f)                 该 flag 为真才通过
//   cond.notFlag(f)              该 flag 为假才通过
//   cond.flagNumGte(f, n)        数字型 flag 值 >= n 才通过（如好感度/计数）
//   cond.flagNumEquals(f, n)     数字型 flag 值 === n 才通过
// 三、天数
//   cond.dayGte(n)               当前天数 >= n 才通过
//   cond.dayEqualsFlag(f)        必须与 flag 记录的天数同一天才通过
//   cond.daysSinceFlag(flag, min) 自 flag 记录日起至少过 min 天才通过
// 四、NPC 存在
//   cond.needNpc('tuzi' | ['tuzi','yu'])  指定 NPC 存在于 npcDataList 才通过
// 五、好感度
//   cond.favorGte('huli', 50)    指定 NPC 好感度 >= min 才通过
// 六、背包物品
//   cond.needItem('草药', 1)      背包拥有指定物品（数量）才通过
// 八、组合
//   cond.all(fn1, fn2, ...)      全部满足才通过
//   cond.any(fn1, fn2, ...)      任一满足即通过
//
// 【用法示例】
//   condition: cond.all(cond.notFlag('shangrenTaleAsked'), cond.flagNumGte('shangrenFavor', 20))
//   condition: cond.any(cond.needItem('钥匙'), cond.dayGte(3))
//   condition: cond.all(cond.notAnyCompleted(['yu01','jinmao01']), cond.favorGte('huli', 50))
// ========================================================================
const _u = () => useCounterStore();
export const cond = {
  // ---------- 一、对话完成状态 ----------
  notCompleted: (id) => () => !_u().isDialogueComplete(id),
  completed: (id) => () => !!_u().isDialogueComplete(id),
  // 数组中任意一个已完成 → 不通过（共同事件互斥）
  notAnyCompleted: (ids) => () => !ids.some(id => _u().isDialogueComplete(id)),
  // 数组中任意一个今天已完成 → 不通过（同一天互斥）
  notCompletedToday: (ids) => () => !ids.some(id => {
    const rec = _u().pixi.dialogueProgress?.[id];
    return rec?.completed && rec.completedDay === _u().pixi.player?.day;
  }),

  // ---------- 二、Flag 布尔 / 数字标记 ----------
  flag: (f) => () => !!_u().getDialogueFlag(f),
  notFlag: (f) => () => !_u().getDialogueFlag(f),
  flagNumGte: (f, n) => () => (Number(_u().getDialogueFlag(f)) || 0) >= n,
  flagNumEquals: (f, n) => () => Number(_u().getDialogueFlag(f)) === n,

  // ---------- 三、天数 ----------
  dayGte: (n) => () => (_u().pixi.player?.day ?? 1) >= n,
  dayEqualsFlag: (f) => () => _u().getDialogueFlag(f) === _u().pixi.player?.day,
  daysSinceFlag: (flag, min = 1) => () => {
    const d = _u().getDialogueFlag(flag);
    return typeof d === 'number' && d > 0 && (_u().pixi.player?.day ?? 1) >= d + min;
  },

  // ---------- 四、NPC 存在 / 携带 ----------
  needNpc: (n) => () => [].concat(n).every(x => (_u().pixi.npcDataList || []).some(nn => nn.id === x || nn.juese === x)),
  carryNpc: (n) => () => [].concat(n).includes(_u().getNpcAlly?.() || _u().pixi?.npcAlly),

  // ---------- 五、好感度 ----------
  favorGte: (npc, min) => () => !!_u().hasNpcAffection?.({ npc, min }),

  // ---------- 六、背包物品 ----------
  needItem: (name, num = 1) => () => !!_u().hasInventoryItem?.(name, num),

  // ---------- 八、组合 ----------
  all: (...fns) => () => fns.every(fn => fn()),
  any: (...fns) => () => fns.some(fn => fn()),
};
