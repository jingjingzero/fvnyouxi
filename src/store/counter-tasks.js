// 任务/升级相关（拆分自 counter.js）
import { TASK_DEFS, TASK_TPL_VERSION, LEVEL_UP_CFG, DEFAULT_ALLY_BATTLE_DATA } from "./configs";
import { refreshAllyDerivedFields } from "./counter-utils";


// ========================
// 队友战斗属性配置（携带队友时生成 NPC 帮助战斗）
// juese 是主世界中该 NPC 使用的 Spine 骨骼资源名
// ========================
// 📝 生成默认同伴的动态文案与扁平技能字段（模块加载时执行一次；读档时还会用存档当前数值重新生成）
Object.values(DEFAULT_ALLY_BATTLE_DATA).forEach(cfg => refreshAllyDerivedFields(cfg))
// ========================
// 📜 任务模板（TASK_DEFS）：dladmin「任务编辑」可新增/编辑/删除/隐藏
// 新游戏时据此生成任务；读档 / 保存写入后会与 allTasks 自动合并同步
// 任务字段：
//   id          数字唯一标识（剧情/代码引用用）
//   name        任务名
//   type        main=主线 / side=支线
//   description 任务描述
//   icon        图标（可空）
//   hidden      1=隐藏（任务面板不显示，进度保留）；0=显示
//   steps       达成步骤：[{ id, desc, target? }]，target=达成目标次数（可选）
//   reward      完成奖励：{ exp, money, items:[{ name, num }] }（优先于 TASK_REWARDS）
// ========================
// 📜 模板版本号：每次页面加载（模块重新执行）都会变化，用于读档后自动重同步任务模板
export var buildTasksFromDefs = function buildTasksFromDefs() {
  const main = []
  const side = []
  for (const def of TASK_DEFS) {
    const type = def.type === 'main' ? 'main' : 'side'
    const t = {
      id: def.id,
      name: def.name || '新任务',
      type,
      description: def.description || '',
      icon: def.icon || '',
      hidden: def.hidden ? 1 : 0,
      isCompleted: false,
      currentStep: 0,
      _fromDef: true,
      steps: (def.steps || []).map(s => ({
        id: s.id,
        desc: s.desc || '',
        target: s.target || 0,
        current: 0,
        isCompleted: false,
      })),
    }
    ;(type === 'main' ? main : side).push(t)
  }
  return { mainTasks: main, sideTasks: side, _tplVer: TASK_TPL_VERSION }
}
const DEFAULT_allTasks = buildTasksFromDefs();
//初始背包
// 🎭 应用升级配置的初始属性：NPC（读档迁移按 baseAttack/baseSpeed 覆盖，自动生效）
//    玩家新档模板由 configs.createDefaultJuese() 直接基于 LEVEL_UP_CFG.player.base 生成，无需在此同步
(function applyLevelUpBase() {
  for (const [role, b] of Object.entries(LEVEL_UP_CFG.ally.base || {})) {
    const d = DEFAULT_ALLY_BATTLE_DATA[role];
    if (!d) continue;
    if (b.attack != null) d.baseAttack = Math.floor(b.attack);
    if (b.speed != null) d.baseSpeed = Math.floor(b.speed);
  }
  // 初始所需经验跟随 expBase（按角色）
  for (const [role, d] of Object.entries(DEFAULT_ALLY_BATTLE_DATA)) {
    if (d.maxExp == null) d.maxExp = allyExpBase(role);
  }
})();
// 🎓 按角色取 NPC 初始经验/经验系数（兼容旧版数字结构）
function allyExpBase(role) {
  const e = LEVEL_UP_CFG.ally.expBase;
  return (e && typeof e === 'object' ? e[role] : e) ?? 50;
}
function allyExpMult(role) {
  const e = LEVEL_UP_CFG.ally.expMult;
  return (e && typeof e === 'object' ? e[role] : e) ?? 1.1;
}
// 🎓 按角色+等级计算「升下一级所需经验」（expBase/expMult 公式递推；等级用存档等级）
//    r1=expBase, r2=expBase+r1×mult, ... → 配置改动后读档立即生效
function allyMaxExpForLevel(role, level) {
  const eb = allyExpBase(role), mult = allyExpMult(role)
  let m = eb
  for (let i = 1; i < (level || 1); i++) m = Math.floor(eb + m * mult)
  return m
}
// ========================
// 🏆 成就配置表（名称 → 成就详情）
// - desc: 成就说明（完成方式），未解锁的成就在界面只显示名字，解锁后可见 desc

export { DEFAULT_allTasks, allyExpBase, allyExpMult, allyMaxExpForLevel };
