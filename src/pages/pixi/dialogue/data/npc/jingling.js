/**
 * 精灵 NPC 对话数据 —— 入口文件
 * 
 * 原 1700+ 行的大文件已按剧情拆分为多个子文件：
 * - jingling-shared.js    公共部分（辅助函数、翻译前缀、说话者、选项数组）
 * - jingling-yushi.js     初次相遇（yu 段）+ 互动（hd/hm 段）+ 失败（sb 段）
 * - jingling-guanri.js    羁绊日常段（hl / jinmao / yu 日常）
 * - jingling-zhuxian.js   主线剧情段（zz / jqZ / jjone / jqX / one + end）
 * 
 * 本文件只负责 import + 合并导出。
 * 
 * ⚠️ 拆分注意事项：
 * - 合并顺序 = yushi → guanri → zhuxian（与拆分前节点在对象中的顺序一致）
 * - 重复 key（zz01 / zz18 / zz79 / jqZ30）在 zhuxian 段内部保持原书写顺序，
 *   后面出现的会覆盖前面出现的，与拆分前行为一致
 * - loadData: 'npc/jingling' 引用保持不变，无需改动任何触发点
 * 
 * 【新增剧情】直接改对应子文件即可，不要往这里加节点
 */

import translations from './jingling-translations.js';
import { yushiDialogues } from './jingling-yushi.js';
import { guanriDialogues } from './jingling-guanri.js';
import { zhuxianDialogues } from './jingling-zhuxian.js';
import {
  i18nPrefix,
  speakers,
} from './jingling-shared.js';

// ========== 导出 ==========
// translations 会被自动注册到 i18n 系统
// i18nPrefix 配置后，text 只写 key 名即可自动补全前缀
// speakers 配置说话者别名，对话节点里用 speaker 字段引用
// 其他的都是对话节点
export default {
  translations,
  i18nPrefix,
  speakers,
  ...yushiDialogues,
  ...guanriDialogues,
  ...zhuxianDialogues,
};
