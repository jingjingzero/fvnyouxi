/**
 * 地牢探索进度持久化模块：迷雾 + 玩家位置 + 已拾取道具 + 感应区/箱子/障碍物/互动点状态，按层独立存储
 * 从 dungeon.vue 拆出。
 *
 * 依赖通过 initSave(env) 注入：
 *  - getExploration()      当前层迷雾 Uint8Array（引用，需读长度与内容）
 *  - getPickupItems()      道具列表
 *  - getTriggers()         感应区列表
 *  - getObstacles()        障碍物列表
 *  - getChests()           宝箱列表
 *  - getPushTargets()      箱子目标位置列表
 *  - getInteractables()    互动点列表
 *  - getEnemies()          敌人列表
 *  - getMapW() / getMapH() 地图尺寸
 *  - getPCol() / getPRow() 玩家格子
 *  - getCurrentLevel()     当前层数
 */

import { saveKeyForLevel } from './config.js';

let getExploration = () => null;
let getPickupItems = () => [];
let getTriggers = () => [];
let getObstacles = () => [];
let getChests = () => [];
let getPushTargets = () => [];
let getInteractables = () => [];
let getGatherPoints = () => [];
let getEnemies = () => [];
let getPreSealedZones = () => [];
let getMapW = () => 0;
let getMapH = () => 0;
let getPCol = () => 0;
let getPRow = () => 0;
let getCurrentLevel = () => 1;

/** 注入存档依赖 */
export function initSave(env) {
  if (typeof env.getExploration === 'function') getExploration = env.getExploration;
  if (typeof env.getPickupItems === 'function') getPickupItems = env.getPickupItems;
  if (typeof env.getTriggers === 'function') getTriggers = env.getTriggers;
  if (typeof env.getObstacles === 'function') getObstacles = env.getObstacles;
  if (typeof env.getChests === 'function') getChests = env.getChests;
  if (typeof env.getPushTargets === 'function') getPushTargets = env.getPushTargets;
  if (typeof env.getInteractables === 'function') getInteractables = env.getInteractables;
  if (typeof env.getGatherPoints === 'function') getGatherPoints = env.getGatherPoints;
  if (typeof env.getEnemies === 'function') getEnemies = env.getEnemies;
  if (typeof env.getPreSealedZones === 'function') getPreSealedZones = env.getPreSealedZones;
  if (typeof env.getMapW === 'function') getMapW = env.getMapW;
  if (typeof env.getMapH === 'function') getMapH = env.getMapH;
  if (typeof env.getPCol === 'function') getPCol = env.getPCol;
  if (typeof env.getPRow === 'function') getPRow = env.getPRow;
  if (typeof env.getCurrentLevel === 'function') getCurrentLevel = env.getCurrentLevel;
}

// 💾 存档写入节流：防抖 250ms，高频拾取/互动合并为最后一次写入；
//    离开地牢/换层等需要立即落盘的场景请调用 saveDungeonStateNow()
let _dungeonSaveTimer = null;
export function saveDungeonState() {
  if (_dungeonSaveTimer) clearTimeout(_dungeonSaveTimer);
  _dungeonSaveTimer = setTimeout(() => { _dungeonSaveTimer = null; doSaveDungeonState(); }, 250);
}
// ⚡ 立即保存（离开地牢/换层/暂停时调用，确保防抖窗口内的状态先落盘）
export function saveDungeonStateNow() {
  if (_dungeonSaveTimer) { clearTimeout(_dungeonSaveTimer); _dungeonSaveTimer = null; }
  doSaveDungeonState();
}
// 保存当前层探索进度：返回时写入 localStorage，下次进入时还原战争迷雾、位置与道具拾取状态
function doSaveDungeonState() {
  const exploration = getExploration();
  if (!exploration) return;
  try {
    const mapW = getMapW(), mapH = getMapH();
    const pCol = getPCol(), pRow = getPRow();
    const pickupItems = getPickupItems();
    const triggers = getTriggers();
    const obstacles = getObstacles();
    const chests = getChests();
    const pushTargets = getPushTargets();
    const interactables = getInteractables();
    const enemies = getEnemies();
    const picked = pickupItems
      .filter(it => it.taken)
      .map(it => `${it.itemId}@${it.col},${it.row}`);
    // ⚡ 保存已触发的感应区（用左上角位置标识）
    const triggeredTriggers = triggers
      .filter(t => t.triggered)
      .map(t => `${t.col},${t.row}`);
    // 📦 保存箱子位置+锁定状态（按索引顺序）
    const pushableStates = obstacles
      .filter(o => o.type === 'pushable')
      .map(o => ({ col: o.col, row: o.row, locked: !!o.locked }));
    // 📦 保存所有已出现的宝箱（visible=true，不管是否打开）
    //    🔄 respawn=true 的宝箱每次进入地牢刷新，不持久化状态（存档里没有 → 下次进入即回到初始）
    const visibleChests = chests
      .filter(c => c.visible && !c.respawn)
      .map(c => ({ col: c.col, row: c.row, opened: !!c.opened }));
    // 🎯 保存已触发的箱子目标位置（避免读取后重复提示宝箱出现）
    const triggeredTargets = pushTargets
      .filter(t => t.triggered)
      .map(t => `${t.col},${t.row}`);
    // 🖐️ 保存已触发的互动点（once=true 的触发过不再触发）
    const triggeredInteractables = interactables
      .filter(it => it.triggered)
      .map(it => `${it.col},${it.row}`);
    // ⛏️ 保存已采集的采集点（once=true 的采集过不再触发）
    const triggeredGathers = getGatherPoints()
      .filter(gp => gp.triggered)
      .map(gp => `${gp.col},${gp.row}`);
    // 💀 保存 noRespawn 敌人已击败状态（重新进入/读档后仍不复活；开始新游戏清存档即重置）
    const defeatedNoRespawn = enemies
      .filter(e => e.noRespawn && e.defeated)
      .map(e => String(e.id));
    // 🔓 保存已解锁的预封印区域 id（重新进入地牢保持解封，不再封印、不再弹提示）
    const unlockedPreSeals = getPreSealedZones()
      .filter(z => z.unlocked)
      .map(z => String(z.id));
    localStorage.setItem(saveKeyForLevel(getCurrentLevel()), JSON.stringify({
      w: mapW,
      h: mapH,
      col: pCol,
      row: pRow,
      data: Array.from(exploration),
      picked,
      triggeredTriggers,
      pushableStates,
      visibleChests,
      triggeredTargets,
      triggeredInteractables,
      triggeredGathers,
      defeatedNoRespawn,
      unlockedPreSeals,
    }));
  } catch (e) { /* ignore */ }
}

// 读取当前层探索进度（仅迷雾 + 已拾取道具）；尺寸不匹配 / 数据非法则返回 null（重新开局）
export function loadDungeonState() {
  try {
    const mapW = getMapW(), mapH = getMapH();
    const raw = localStorage.getItem(saveKeyForLevel(getCurrentLevel()));
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.data) || s.data.length !== mapW * mapH) return null;
    if (s.w !== mapW || s.h !== mapH) return null;
    for (const v of s.data) if (typeof v !== 'number' || v < 0 || v > 2) return null;
    if (s.picked !== undefined && !Array.isArray(s.picked)) return null;
    return s;
  } catch (e) { return null; }
}
