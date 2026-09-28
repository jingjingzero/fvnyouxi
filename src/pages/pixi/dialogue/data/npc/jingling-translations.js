/**
 * 精灵 NPC 对话翻译 —— 分组索引
 *
 * 每个分组一个独立文件（translations/ 目录），本文件只负责汇总导出。
 * 新增剧情翻译：在 translations/ 下新建分组文件，然后在这里加一行 import + 一个 key。
 * 英文版：translations/en/ 下同名文件，key 与中文版一一对应，运行时按 store.pixi.language 选择。
 */

import npc_juqing01 from './translations/npc_juqing01.js';
import npc_huli from './translations/npc_huli.js';
import npc_yu from './translations/npc_yu.js';
import npc_jinmao from './translations/npc_jinmao.js';
import fengxi from './translations/fengxi.js';
import juqing02 from './translations/juqing02.js';
import jieju01 from './translations/jieju01.js';
import hudong01 from './translations/hudong01.js';
import heimi from './translations/heimi.js';
import shibai01 from './translations/shibai01.js';
import day5 from './translations/day5.js';
import common from './translations/common.js';

import en_npc_juqing01 from './translations/en/npc_juqing01.js';
import en_npc_huli from './translations/en/npc_huli.js';
import en_npc_yu from './translations/en/npc_yu.js';
import en_npc_jinmao from './translations/en/npc_jinmao.js';
import en_fengxi from './translations/en/fengxi.js';
import en_juqing02 from './translations/en/juqing02.js';
import en_jieju01 from './translations/en/jieju01.js';
import en_hudong01 from './translations/en/hudong01.js';
import en_heimi from './translations/en/heimi.js';
import en_shibai01 from './translations/en/shibai01.js';
import en_day5 from './translations/en/day5.js';
import en_common from './translations/en/common.js';

export default {
  'zh-CN': {
    npc_juqing01,
    npc_huli,
    npc_yu,
    npc_jinmao,
    fengxi,
    juqing02,
    jieju01,
    hudong01,
    heimi,
    shibai01,
    day5,
    common,
  },
  'en-US': {
    npc_juqing01: en_npc_juqing01,
    npc_huli: en_npc_huli,
    npc_yu: en_npc_yu,
    npc_jinmao: en_npc_jinmao,
    fengxi: en_fengxi,
    juqing02: en_juqing02,
    jieju01: en_jieju01,
    hudong01: en_hudong01,
    heimi: en_heimi,
    shibai01: en_shibai01,
    day5: en_day5,
    common: en_common,
  },
};
