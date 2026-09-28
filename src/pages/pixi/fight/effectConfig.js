// ==============================================
// 🎬 技能特效配置表
// ==============================================
// 集中管理所有技能卡牌的「特效播放数据」：
//   播放方式、特效名、大小、偏移、时长等。
// 以后调整特效只需改这里的配置，无需改动技能代码。
//
// ✅ 以下字段对三张配置表通用：
//   EFFECT_CONFIG（玩家卡牌）/ ALLY_EFFECT_CONFIG（NPC 队友）/ ENEMY_EFFECT_CONFIG（敌人）
//   同一套字段在队友/敌人配置里写同样生效（projectile / atPoint / buff / field 全类型已支持）。
//
// 字段说明：
//   type:  播放方式
//     'projectile'  从玩家位置发射投射物飞向目标（射击/冰箭/火球等）
//     'atPoint'     在指定位置直接播放特效（雷击/洞察/毒刺等）
//     'buff'        在玩家脚底播放 buff 特效（聚灵/光佑/反弹等）
//     'field'       在全体敌人中心播放领域特效（毒雾）
//     'none'        无特效，直接结算（水牢/冰寒/毒发等）
//
//   effectName: effectPool 中注册的特效 key
//   scale:      特效缩放（基于 EFFECT_SCALE_BASE 基准自动适配）
//   offsetX/offsetY: 相对基准位置的偏移（单位：vw/vh）
//   startOffsetX/endOffsetX: 投射物起点/终点的水平偏移（vw）
//   startOffsetY/endOffsetY: 投射物起点/终点的垂直偏移（vh）
//   🎯 投射物终点默认锚定在「敌人 spine 实际渲染位置」（屏幕坐标），
//      endOffsetX/endOffsetY 是在敌人位置基础上的微调
//   hitAnimName:     命中后播放的自定义动画（爆炸/碎裂），默认锚定在敌人身上
//   hitAnimOffsetX/Y: 命中动画的额外偏移（vw/vh，默认 0 = 无偏移，需要偏移才设置）
//   🎯 hitAnimName 对 projectile 和 atPoint 都生效：
//      projectile = 飞行动画播完 → 接播爆炸动画 → 回收
//      atPoint     = 主动画播完   → 接播爆炸动画 → 回收
//   flyDuration: 投射物飞行时长（秒）
//   animName:    Spine 动画名（默认 'animation'）
//   loop:        是否循环播放（默认 false）
//   timeScale:   动画播放速度（默认 1）
//   zIndex:      层级（默认 100）
//   targetY:     定点特效的 Y 基准（0.9 = 敌人 y*0.9，1.1 = y*1.1）
//   sound:       技能音效路径（可选，如 'music/jineng/sheji.wav'）。
//                配了 sound 后由特效层按「每次发射/命中」播放（多段技能响多次，
//                如射击 6 发子弹响 6 次），并跳过出牌时的单次播放，避免重复
//   soundVolume: 该音效的独立音量倍率（0~1，默认 1 = 全局音量），可单独调大调小
//   🎵 召唤系技能（影分身/无人机等）用下面两个字段，召唤音效和攻击音效分开配：
//   summonSound:  召唤物出现时播放的音效（如 'music/jineng/card_drone.mp3'）
//   attackSound:  召唤物攻击时播放的音效（如影分身/无人机用射击音效 'music/jineng/sheji.wav'）
//   summonSoundVolume / attackSoundVolume: 召唤/攻击音效各自的音量（默认 soundVolume ?? 1）
// ==============================================
export const EFFECT_CONFIG = {
  // ==================== 🎯 投射物（玩家 → 敌人） ====================
  射击: {
    type: 'projectile',
    effectName: 'bullet',
    scale: 0.5,
    flyDuration: 0.3,
    animName: 'sheji',
    sound: 'music/jineng/sheji.wav',  // 🎵 每发子弹响一次（6 发 = 6 次）
    soundVolume: 0.5,                    // 🎚️ 单独音量倍率（0~1，默认 1）
    soundPerHit: true,                   // 🎵 由特效层按每次发射播放，出牌时不重复播
  },
  碎甲弹: {
    type: 'projectile',
    effectName: 'bullet',
    scale: 0.8,
    flyDuration: 0.2,
    animName: 'suijia',
    sound: 'music/jineng/card_armorbreak.wav', // 🎵 发射时响一次
    soundVolume: 0.2,
    soundPerHit: true,                   // 🎵 由特效层按每次发射播放，出牌时不重复播
  },
  风刃: {
    sound: 'music/jineng/card_windblade.mp3',
    soundPerHit: true,                   // 🎵 每道风刃响一次（3 道 = 3 响）
    type: 'projectile',
    effectName: 'Fengren',
    scale: 0.75,
    flyDuration: 0.25,
    endOffsetX: 5,
    startOffsetY: -8,
    horizontal: true,                    // 🎯 水平飞行（终点 y = 起点 y，不斜着飞）
    // ⚠️ horizontal 时终点 y 不再用 targetY / endOffsetY（水平高度由 startOffsetY 决定）
  },
  流火: {
    type: 'projectile',       // 🎯 每次从玩家自身位置发射，随机飞向敌人，命中后立即回收特效
    effectName: 'liuhuo',
    scale: 0.8,
    flyDuration: 0.3,         // 单次飞行时长（秒）
    targetY: 0.9,             // 终点 y 基准（敌人 spine y 的倍率，0.9 ≈ 身体位置）
    // startOffsetX/startOffsetY: 发射起点偏移（vw/vh，不写 = 0，从玩家位置正出发）
    // endOffsetX/endOffsetY:    终点偏移（vw/vh，不写 = 0，正好落在敌人身上）
    hitCountOffsetMs: 180,       // 多段特效的间隔
    sound: 'music/jineng/card_flowfire.mp3', // 🎵 每次攻击响一次（4 次 = 4 响）
    soundVolume: 1,                              // 🎚️ 单独音量倍率（0~1，默认 1）
    soundPerHit: true,                           // 🎵 由特效层按每次发射播放，出牌时不重复播
  },
  回旋风刃: {
    sound: 'music/jineng/card_boomerang.mp3',
    type: 'roundTrip',        // 🌀 往返：玩家 → 最远敌人身后 → 返回玩家
    effectName: 'Fengren1',
    scale: 1.5,
    flyDuration: 0.4,         // 去程/返程各 0.4s
    endOffsetX: 25,            // 越过最远敌人 8vw（身后）
    targetY: 1,
  },
  冰箭: {
    sound: 'music/jineng/card_ice.mp3',
    type: 'projectile',
    effectName: 'bingjian',
    scale: 1,
    flyDuration: 0.35,
    animName: 'animation',
    loop: true,
    endOffsetX: 2,
    hitAnimName: 'animation1', // 🧊 命中后播放自定义动画（爆炸/碎裂），播放完自动回收
    hitAnimLoop: false, // 命中动画是否循环（默认播一次）
    // 🎯 命中动画默认锚定在敌人身上（不再自带偏移）：
    //    0 = 不偏移；需要微调再设置（正=右/下，负=左/上）
    hitAnimOffsetX: 0,
    hitAnimOffsetY: -10,
  },

  毒刺: {
    sound: 'music/jineng/card_Duci.mp3',
    type: 'projectile',
    effectName: 'Duci',
    animName: 'animation',
    scale: 3,
    flyDuration: 0.35,
    startOffsetX: 12,
    startOffsetY: -6,
    horizontal: true,  // 🎯 水平飞向敌人（终点 y = 玩家 y）
    hitAnimName: 'animation1', // 🧊 命中后播放自定义动画（爆炸/碎裂），播放完自动回收
    hitAnimLoop: false, // 命中动画是否循环（默认播一次）
    hitAnimScale: 1.5,    // 🎯 命中动画独立缩放（不写 = 沿用飞行的 scale；这里放大到 2 倍）
    // 🎯 命中动画默认锚定在敌人 spine 实际位置（不写 hitAnimOffsetX/Y = 无偏移，正好在敌人身上爆炸）
    noHitParticles: true, // 🚫 取消造成伤害后敌人身上的粒子特效（毒刺有自己的命中动画）
    hitAnimOffsetY: -10,
  },
  水弹: {
    sound: 'music/jineng/card_water.mp3',
    type: 'projectile',
    effectName: 'shuipao',
    scale: 0.5,
    flyDuration: 0.5,
    animName: 'animation',
    loop: true,
    timeScale: 3,
    startOffsetX: 0,
    endOffsetX: 2,
    aoeCenter: true,
  },
  火球: {
    sound: 'music/jineng/card_fireball.mp3',
    type: 'projectile',
    effectName: 'huoqiu',
    scale: 0.1,
    flyDuration: 0.35,
    animName: 'animation',
    explosion: true,            // 终点生成爆炸特效
    explosionEffectName: 'baozha',
    endOffsetX: 2,
  },
  狙击: {
    type: 'projectile',
    effectName: 'bullet',
    scale: 0.85,
    flyDuration: 0.2,
    animName: 'juji',
    endOffsetX: 2,
    horizontal: true,
    sound: 'music/jineng/card_juji.wav', // 🎵 发射时响一次
    soundVolume: 0.4,
    soundPerHit: true,                   // 🎵 由特效层按每次发射播放，出牌时不重复播
  },
  // ==================== ⚡ 定点特效（指定敌人/位置） ====================

  毒发: {
    sound: 'music/jineng/card_poisonburst.mp3',
    type: 'atPoint',
    effectName: 'Dufa',
    scale: 2,
    targetY: 0.85,
    hitAnimName: 'animation1', // 🧊 主动画（animation）播完后自动接播爆炸动画，播完才回收（atPoint 也支持）
    hitAnimLoop: false, // 命中动画是否循环（默认播一次）
    hitAnimScale: 1.5,    // 🎯 爆炸动画独立缩放（不写 = 沿用 scale）
    // 🎯 爆炸动画锚定在敌人 spine 实际位置（targetY 基准），hitAnimOffsetX/Y = 额外偏移（默认 0 = 无偏移）
    noHitParticles: true, // 🚫 取消造成伤害后敌人身上的粒子特效（毒发有自己的爆炸动画）
    hitAnimOffsetY: -10,  // 爆炸往上抬 10vh（正=下，负=上）
  },
  冰寒: {
    sound: 'music/jineng/card_frost.wav',
    type: 'atPoint',
    effectName: 'Binghan',
    scale: 1,
    targetY: 1,
  },
  焚焰: {
    sound: 'music/jineng/card_blaze.wav',
    type: 'atPoint',
    effectName: 'Fenyan',
    scale: 2.5,
    targetY: 0.95,
  },
  雷击: {
    sound: 'music/jineng/card_lightning.mp3',
    type: 'atPoint',
    effectName: 'dianji',
    scale: 2,
    targetY: 0.9,
  },
  龙卷风暴: {
    sound: 'music/jineng/card_tornado.mp3',
    type: 'atPoint',
    effectName: 'LongjuanFengbao',
    scale: 1.8,
    targetY: 0.75,
    aoeCenter: true, // 🌀 群体 AOE：多位敌人时取所有存活敌人位置的中心释放
  },
  水牢: {
    sound: 'music/jineng/card_waterprison.mp3',
    type: 'atPoint',
    effectName: 'Shuilao',
    scale: 3,
    targetY: 0.75,
    aoeCenter: true, // 🌀 群体 AOE：多位敌人时取所有存活敌人位置的中心释放 
  },
  洞察: {
    sound: 'music/jineng/card_insight.mp3',
    type: 'atPoint',
    effectName: 'dongcha',
    scale: 2,
    targetY: 0.8,
    offsetX: -1
  },
  瘴气: {
    sound: 'music/jineng/card_miasma.mp3',
    type: 'atPoint',
    effectName: 'zhangqi',
    scale: 2.5,
    // 🎯 targetY = 敌人 spine y 的倍率（spine y 就是敌人脚底位置）：
    //    1 = 正好在敌人脚下（0.9 = 脚上方一点/身体，>1 = 往屏幕下方跑）
    targetY: 0.98,
  },
  连锁闪电: {
    sound: 'music/jineng/card_chainlightning.mp3',
    soundPerHit: true,            // 🎵 主目标 + 每次电链弹射都响一次
    type: 'atPoint',
    effectName: 'LSshandian',
    scale: 1,
    targetY: 0.85,
  },
  禁忌狂雷: {
    sound: 'music/jineng/card_forbiddenlightning.mp3',
    soundPerHit: true,            // 🎵 每落下一道雷电就响一次
    type: 'atPoint',
    effectName: 'JinjiKuanglei',
    scale: 2,
    targetY: 1,
    soundVolume: 0.6,
    hitCountOffsetMs: 250,
  },
  激光: {
    sound: 'music/jineng/card_laser.wav',
    type: 'atPoint',
    effectName: 'laser',
    scale: 1.2,
    offsetX: 25,                  // 在玩家右侧一点播放
    baseY: 'player',
    targetY: 0.9,
  },
  // ==================== 🛡️ 玩家脚底 buff ====================
  号令: {
    sound: 'music/jineng/card_command.mp3',
    type: 'buff',
    effectName: 'Haoling',
    scale: 2,
    offsetY: -30,
  },
  未来: {
    sound: 'music/jineng/card_future.mp3',
    type: 'buff',
    effectName: 'Weilai',
    scale: 2.5,
    offsetY: -20,
    offsetX: -5,
  },
  聚灵: {
    sound: 'music/jineng/card_mana.mp3',
    type: 'buff',
    effectName: 'juling',
    scale: 4.5,
    offsetY: 15,
  },
  武器强化: {
    sound: 'music/jineng/card_weapon.mp3',
    type: 'buff',
    effectName: 'wuqiqianghua',
    scale: 1.6,
    offsetY: 15,
  },
  光佑: {
    sound: 'music/jineng/card_lightguard.mp3',
    type: 'buff',
    effectName: 'Guangyou',
    scale: 1,
    offsetY: 0,
  },
  水愈: {
    sound: 'music/jineng/card_heal.mp3',
    type: 'buff',
    effectName: 'Shuiyu',
    scale: 1.35,
    offsetY: 0,
  },
  反弹: {
    sound: 'music/jineng/card_reflect.wav',
    type: 'buff',
    effectName: 'fantan',
    scale: 0.35,
    offsetX: 1,
    offsetY: -10,
    loop: true,                  // 持续循环（随 buff 结束移除）
  },
  魔力暴动: {
    sound: 'music/jineng/card_manastorm.mp3',
    type: 'buff',
    effectName: 'MoliBaodong',
    scale: 1.5,
    offsetY: -2,
  },
  风之庇佑: {
    sound: 'music/jineng/card_windguard.mp3',
    type: 'buff',
    effectName: 'FengZhiBiyou',
    scale: 1.5,
    offsetY: 0,
    offsetX: 0,
    loop: true, // ✅ loop: true 的 buff 持续特效会在对应 buff 结束（player.buffs 移除）时自动移除，
    //   无需手动清理；绑定的 buff 名默认 = 技能名（此处「风之庇佑」），
    //   若 buff 名与技能名不同可用 buffName 字段显式指定
  },
  // ==================== 🌫️ 领域特效（敌人中心，循环播放至战斗结束） ====================
  毒雾: {
    sound: 'music/jineng/card_poison.mp3',
    type: 'field',
    effectName: 'duwu',
    scale: 5,
    timeScale: 0.6,
    zIndex: -100,
    offsetY: 0,
    loop: true,     // 🌫️ 循环播放，战斗结束时自动移除（removeFieldFx）
    aoeCenter: true, // 🌀 群体 AOE：取所有存活敌人 spine 位置的中心释放
  },
  // ==================== 🎭 特殊处理（代码内自定义逻辑，配置作参考） ====================
  // 🎵 召唤系技能：召唤音效（summonSound）和攻击音效（attackSound）分开配：
  //    影分身/无人机的攻击音效 = 射击音效（sheji），影分身多发子弹 → 多次播放，无人机每次射击播一次
  影分身: {
    type: 'none',  // 召唤影分身 Spine（持续存在）
    summonSound: 'music/jineng/card_clone.mp3',  // 🎵 召唤影分身时播放
    attackSound: 'music/jineng/sheji.wav',       // 🎵 影分身攻击 = 射击音效（多发子弹 → 多次播放）
    attackSoundVolume: 0.5,                      // 🎚️ 攻击音效音量（跟随射击配置的 0.5）
    bulletStartYFactor: 1,   // 🎯 影分身子弹起点 y 倍率（越大越往下；默认 0.9，还想低就继续调大）
    bulletEndYFactor: 0.85,     // 🎯 影分身子弹终点 y 倍率（越大越往下；默认 0.9，还想低就继续调大）
  },
  无人机: {
    type: 'none',  // 召唤无人机 Spine（持续存在）
    summonSound: 'music/jineng/card_drone.mp3',  // 🎵 召唤无人机时播放
    attackSound: 'music/jineng/sheji.wav',       // 🎵 无人机攻击 = 射击音效（每次射击播放一次）
    attackSoundVolume: 0.5,                      // 🎚️ 攻击音效音量（跟随射击配置的 0.5）
  },
  魔力飞弹: {
    noHitParticles: true, // 🚫 取消造成伤害后敌人身上的粒子特效（魔力飞弹有自己的导弹命中动画）
  },
};

/**
 * 获取某张卡牌的特效配置
 * @param {string} skillName 卡牌名
 * @returns {Object|null} 特效配置（未配置返回 null）
 */
export function getEffectConfig(skillName) {
  return EFFECT_CONFIG[skillName] || null;
}

/**
 * 🎵 获取召唤系音效配置（召唤音效/攻击音效分开配）
 * @param {string} skillName 召唤物技能名（如 '无人机'/'影分身'）
 * @param {'summon'|'attack'} kind summon=召唤音效 attack=攻击音效
 * @returns {{sound: string, volume: number}|null} 没配返回 null
 */
export function getSummonSound(skillName, kind) {
  const cfg = EFFECT_CONFIG[skillName];
  if (!cfg) return null;
  const key = kind === 'attack' ? 'attackSound' : 'summonSound';
  const volKey = kind === 'attack' ? 'attackSoundVolume' : 'summonSoundVolume';
  const sound = cfg[key] ?? cfg.sound;
  if (!sound) return null;
  return { sound, volume: cfg[volKey] ?? cfg.soundVolume ?? 1 };
}

// ==============================================
// 👥 NPC 队友特效配置表
// ==============================================
// 携带的 NPC 队友（黑米/西亚/晨曦/云弥等）的普攻与技能特效。
// 按队友 img 读取（如 'tuzi'），每个队友可配：
//   attack:   普攻特效配置
//   skills:   技能特效映射表，key = 技能列表里的 id（如 'chanrao'/'zhiyu'），
//             队友切换技能时自动按当前选中的技能 id 播放对应的特效和音效
//   skill:    旧写法（单个技能特效，未迁移的队友回退用）
// 与卡牌配置同字段，额外支持：
//   type: 'projectile' 起点 = 队友所在位置（默认）| 'atPoint' 目标定点 | 'buff' 玩家/自身脚底
//   flipX: 是否水平翻转（默认 false）
//   basePos: 投射物起点基准：'ally'（队友位置，默认）| 'player'（玩家位置）
//   horizontal: 投射物水平飞行（终点 y = 起点 y，跟玩家射击一样，不斜着飞）
//   nearestTarget: 投射物飞向「离起点最近的存活敌人」（如 jinmao 普攻）
//   aoeCenter:   投射物飞到「人群中心」（取最靠近全体中心的敌人处停止，像玩家 AOE）
//   damageDelay: 出伤延时（毫秒）：
//                - hitAnimName 二段动画 → 第二段动画「开始播放」时 + 该延时结算伤害（0 = 开始即结算）
//                - atPoint          → 特效播放时 + 该延时结算
//   hitAnimName: 命中后播放的爆炸/碎裂动画（跟玩家冰箭/毒发同款：hitAnimLoop/hitAnimScale/
//                hitAnimOffsetX/hitAnimOffsetY 可配，播完自动回收）
// 🎵 每个 attack / skills 下的特效项都可以配音效：
//   sound:       音效路径（如 'music/jineng/ally_tuzi_zhuaji.mp3'，文件放 public/music/jineng/ 下）
//   soundVolume: 音量倍率（0~1，默认 1 = 全局音量）
//   不配 sound 时回退队友配置（counter.js）里的 attackSound / skillSound
// ==============================================
export const ALLY_EFFECT_CONFIG = {
  // 黑米（tuzi）：普攻=抓击特效（近战），技能=鼓舞（拉条）/ 抓击（单体伤害）
  tuzi: {
    attack: {
      type: 'atPoint',
      effectName: 'zhuaji',
      scale: 0.6,
      targetY: 0.9,
      sound: 'music/jineng/zhuaji.mp3',            // 🎵 普攻音效
      soundVolume: 1,                              // 🎚️ 音量倍率（0~1，默认 1）
    },
    skills: {
      guhuo: {  // 鼓舞：拉条，无伤害特效
        type: 'buff',
        effectName: 'guwu',
        scale: 3,
        offsetY: 0,
        sound: 'music/jineng/ally_tuzi_guhuo.mp3', // 🎵 鼓舞音效
        soundVolume: 1,
      },
      zhuaji: {  // 抓击：近战特效（单体伤害）
        type: 'atPoint',
        effectName: 'heimizhuaji',
        scale: 0.6,
        targetY: 0.85,
        sound: 'music/jineng/zhuajiQ1.mp3',          // 🎵 抓击音效
        soundVolume: 1,
      },
    },
  },
  // 西亚（huli）：普攻=治疗（玩家脚底水泡），技能=缠绕（全体伤害投射物）/ 治愈（治疗 buff 特效）
  huli: {
    attack: {
      type: 'buff',              // 🎯 玩家脚底 buff 特效
      effectName: 'zhiliaopugong',
      scale: 2,
      offsetY: 12,                // 🎯 玩家脚底位置（正=往下，默认 8，可调）
      sound: 'music/jineng/zhiliaopugong.mp3',          // 🎵 抓击音效
    },
    skills: {
      chanrao: {  // 缠绕：全体伤害投射物
        type: 'atPoint',           // 🎯 直接在脚下播放，不飞行
        effectName: 'chanrao',
        scale: 3,
        targetY: 0.7,                // 🎯 1 = 敌人脚底位置（脚下）
        aoeCenter: true,           // 🎯 在人群中心位置播放
        damageDelay: 250,          // ⏱️ 特效播放后延迟 400ms 再结算 AOE 伤害
        sound: 'music/jineng/chanrao.mp3',
      },
      zhiyu: {  // 治愈：治疗 buff 特效（玩家脚底水泡）
        type: 'buff',
        effectName: 'zhiyuxiya',
        scale: 2.5,
        offsetY: 14,
        sound: 'music/jineng/ally_huli_zhiyu.mp3', // 🎵 治愈音效
        soundVolume: 1,
      },
    },
  },
  // 晨曦（jinmao）：普攻=飞行特效（从友军位置水平飞向最近敌人），技能=光之庇佑（护盾无特效）/ 照耀（全体伤害投射物）
  jinmao: {
    attack: {
      type: 'projectile',          // 🎯 飞行特效（从左到右水平飞向最近的敌人，跟玩家射击一样）
      effectName: 'cxhuoqiu',        // 飞行皮肤（可换 bullet / huoqiu / shuipao 等）
      scale: 0.5,
      flyDuration: 0.4,
      animName: 'animation',
      basePos: 'ally',             // 起点 = 友军位置
      horizontal: true,            // 🎯 水平飞行（终点 y = 起点 y）
      nearestTarget: true,         // 🎯 飞向离友军最近的存活敌人
      hitAnimName: 'animation1',   // 🧊 命中后播放爆炸/碎裂动画（和玩家冰箭/毒发一样，播完自动回收）
      hitAnimLoop: false,          // 命中动画是否循环（默认播一次）
      hitAnimScale: 0.8,           // 🎯 命中动画独立缩放（不写 = 沿用飞行 scale）
      hitAnimOffsetX: 0,           // 🎯 命中动画水平偏移（vw，不写 = 0，正好在敌人身上）
      hitAnimOffsetY: -9,           // 🎯 命中动画垂直偏移（vh，不写 = 0）
      sound: 'music/jineng/guangmofa.mp3', // 🎵 普攻音效
      soundVolume: 1,
    },
    skills: {
      guangzhibiyou: {  // 治愈：治疗 buff 特效（玩家脚底水泡）
        type: 'buff',
        effectName: 'cxbiyou',
        scale: 2.5,
        offsetY: 0,
        sound: 'music/jineng/hudunguang.mp3', // 🎵 治愈音效
      },
      zhaoyao: {  // 照耀：全体伤害（直接在敌人脚下播放特效，位置取人群中心，命中后延迟出伤）
        type: 'atPoint',           // 🎯 直接在脚下播放，不飞行
        effectName: 'zhaoyao',
        scale: 2.5,
        targetY: 0.85,                // 🎯 1 = 敌人脚底位置（脚下）
        aoeCenter: true,           // 🎯 在人群中心位置播放
        damageDelay: 250,          // ⏱️ 特效播放后延迟 400ms 再结算 AOE 伤害
        sound: 'music/jineng/ally_jinmao_zhaoyao.mp3', // 🎵 照耀音效
        soundVolume: 1,
      },
    },
  },
  // 云弥（yu）：普攻=飞行特效（水平飞向最近敌人 + 命中爆炸），技能=灵力充能（辅助无特效）/ 狂涌（全体伤害投射物）
  yu: {
    attack: {
      type: 'projectile',          // 🎯 飞行特效（从左到右水平飞向最近的敌人，跟玩家射击一样）
      effectName: 'shuiqiuyu',        // 飞行皮肤（可换 bullet / huoqiu / shuipao 等）
      scale: 0.8,
      flyDuration: 0.4,
      animName: 'animation',
      basePos: 'ally',             // 起点 = 友军位置
      horizontal: true,            // 🎯 水平飞行（终点 y = 起点 y）
      nearestTarget: true,         // 🎯 飞向离友军最近的存活敌人
      hitAnimName: 'animation1',   // 🧊 命中后播放爆炸/碎裂动画（和玩家冰箭/毒发一样，播完自动回收）
      hitAnimLoop: false,          // 命中动画是否循环（默认播一次）
      hitAnimScale: 1,           // 🎯 命中动画独立缩放（不写 = 沿用飞行 scale）
      hitAnimOffsetX: 0,           // 🎯 命中动画水平偏移（vw，不写 = 0，正好在敌人身上）
      hitAnimOffsetY: -9,           // 🎯 命中动画垂直偏移（vh，不写 = 0）
      sound: 'music/jineng/shuixipugong.mp3',            // 🎵 普攻音效
      soundVolume: 1,
    },
    skills: {
      linglichongneng: {  // 灵力充能：辅助（在玩家脚底播放 buff 特效）
        type: 'buff',              // 🎯 玩家脚底 buff 特效
        effectName: 'linglichongneng',
        scale: 2,
        offsetY: 0,                // 🎯 玩家脚底位置（正=往下，默认 8，可调）
        sound: 'music/jineng/ally_yu_linglichongneng.mp3', // 🎵 灵力充能音效
        soundVolume: 1,
      },
      kuangyong: {  // 狂涌：全体伤害投射物
        type: 'atPoint',           // 🎯 直接在脚下播放，不飞行
        effectName: 'kuangyong',
        scale: 2.5,
        targetY: 0.85,                // 🎯 1 = 敌人脚底位置（脚下）
        aoeCenter: true,           // 🎯 在人群中心位置播放
        damageDelay: 250,          // ⏱️ 特效播放后延迟 400ms 再结算 AOE 伤害
        sound: 'music/jineng/ally_yu_kuangyong.mp3', // 🎵 狂涌音效
        soundVolume: 1,
      },
    },
  },
};

/**
 * 获取某 NPC 队友的特效配置
 * @param {string} npcImg - 队友 img（如 'tuzi'）
 * @returns {Object|null} { attack, skill } 特效配置
 */
export function getAllyEffectConfig(npcImg) {
  return ALLY_EFFECT_CONFIG[npcImg] || null;
}

/**
 * 🎯 获取队友某类特效配置（技能按「当前选中的技能 id」从 skills 映射表取对应特效+音效；
 *    没有匹配时回退旧字段 skill）
 * @param {string} npcImg - 队友 img（如 'huli'）
 * @param {'attack'|'skill'} kind - 普攻 or 技能
 * @param {string} [skillId] - 当前选中技能的 id（如 'chanrao'/'zhiyu'），kind='skill' 时用
 * @returns {Object|null} 特效配置（含 sound / soundVolume）
 */
export function getAllyFxConfig(npcImg, kind, skillId) {
  const allyCfg = ALLY_EFFECT_CONFIG[npcImg];
  if (!allyCfg) return null;
  if (kind === 'skill' && allyCfg.skills) {
    return allyCfg.skills[skillId] || allyCfg.skill || null;
  }
  return allyCfg[kind] || null;
}

// ==============================================
// 👾 敌人特效配置表
// ==============================================
// 敌人的普攻与技能特效。优先按敌人 juese（骨骼名，如 'monster1'/'guaiwu2'）读取；
// 未配置的敌人回退到默认配置（'default'）。
// 与卡牌配置同字段，额外支持：
//   flipX: 是否水平翻转（敌人朝左，通常 true）
//   type: 'atPoint' 在玩家位置播放（敌人攻击朝向玩家）
//         'projectile' 从敌人位置发射飞向玩家
// 🎵 攻击音效 / 技能音效分开配：
//   普攻 → 在 attack 里写 sound / soundVolume（default 是兜底，未单独配置的怪物都用它）
//   技能 → 在 skillTypes 里按技能类型配 sound / soundVolume（多技能扩展点）
//   不配 sound 时回退敌人数据（enemiesData）里的 attackSound / skillSound
// ==============================================
export const ENEMY_EFFECT_CONFIG = {
  // 默认（所有敌人普攻）：未单独配置的怪物（雷鸟/暗影王/眼瞳/雷鸟女皇/风息等）都走这里
  default: {
    attack: {
      type: 'atPoint',
      effectName: 'zhuaji',
      scale: 1,
      offsetX: 4,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuajiQ2.mp3', // 🎵 普攻音效（文件已存在）
      soundVolume: 0.7,
    },
    // 敌人技能默认：无独立特效（走普攻特效或纯逻辑）
    skill: { type: 'none' },
  },
  // 魔化猫（guaiwu2）：爪子特效更大、更靠下
  guaiwu2: {
    attack: {
      type: 'atPoint',
      effectName: 'zhuaji2',
      scale: 1,
      offsetY: 5,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuajiQ2.mp3', // 🎵 普攻音效
      soundVolume: 0.7,
    },
  },
  // 雷鸟（guaiwu3）：爪子特效（enemiesData 里配的 zhuaji2，独立成项避免掉默认 zhuaji）
  guaiwu3: {
    attack: {
      type: 'atPoint',
      effectName: 'leiji',
      scale: 2.5,
      offsetY: 5,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuajiQ2.mp3', // 🎵 普攻音效
      soundVolume: 0.7,
      targetY: 1.1,
    },
  },
  // ⚡ 雷鸟女皇（nvhuang）：普攻三段雷击特效（leiji），在玩家位置播放
  //    （多段普攻 attackHits: 3 → enemyAttack 递归调用 3 次 → 特效自然播放 3 次）
  nvhuang: {
    attack: {
      type: 'atPoint',
      effectName: 'leiji',
      scale: 3,
      targetY: 'player',   // 🎯 在玩家位置播放
      sound: 'enemy_leiniaonvhuang_attack',
      soundVolume: 0.7,
      targetY: 1.1,
    },
  },
  // 暗影（monster1）：爪子特效，偏移靠右
  monster1: {
    attack: {
      type: 'atPoint',
      effectName: 'zhuaji',
      scale: 1,
      offsetX: 2,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuajiQ2.mp3', // 🎵 普攻音效
      soundVolume: 0.7,                                   // 🎚️ 音量（0~1，默认 1）
      offsetY: 5,
    },
  },
  // 👁️ 巨型眼瞳（jutong）：普攻特效 = 定点射线（不飞行），在巨瞳自身位置播放并斜射向玩家
  //    baseY: 'self' → 特效定位在巨瞳 spine 位置
  //    🎯 方向控制用 rotationDeg 而不是 flipX：
  //       flipX（scale.x=-1）+ rotation 组合在 Pixi 里变换顺序会导致方向反掉，
  //       统一用 rotation 180° 翻转朝向，再叠加倾斜角度
  jutong: {
    attack: {
      type: 'atPoint',
      effectName: 'jypg',
      scale: 3.8,
      baseY: 'self',        // 🎯 特效在攻击敌人（巨瞳）自身位置播放，而非玩家位置
      offsetY: -14,          // 🎯 上移 8vh ≈ 巨瞳头顶（正=下，负=上）
      offsetX:-35,
      flipX: false,
      // 🎯 方向 + 倾斜：180° = 翻转向左（面向玩家），再 -55° 上倾 → 从右到左斜射向玩家
      //    按实际资源微调：想更水平改小角度（如 125），更垂直改大（如 100）
      rotationDeg: -8,
      sound: 'music/jineng/zhuajiQ2.mp3', // 🎵 普攻音效
      soundVolume: 0.7,                                   // 🎚️ 音量（0~1，默认 1）
      damageDelay:200
    },
  },
  // 🎭 诅咒布偶（buou1）：普攻黑球从攻击点飞向玩家（projectile），技能黑暗光环在攻击点原地播放（atPoint），不再播默认爪击 zhuaji
  buou1: {
    attack: {
      type: 'projectile',
      effectName: 'buou1T',
      animName: 'heiqiu',
      attackPoint: true, // 🎯 起点 = Spine attackPoint 端点（攻击点）
      eventTrigger: 'onHit', // 🎯 等待 buou1.skel 的 attack 动画播放到 onHit 事件帧，从当时攻击点实时位置发射（真正走人物动画事件）
      scale: 2,
      flyDuration: 0.3, // 飞行时长（秒）
      damageDelay: 300, // 伤害随飞行命中时结算
    },
  },
  // 技能类型映射（enemyUseSkill 中按 skill.type 查）
  // 🎯 同一套技能逻辑可用不同 type 区分特效（battle.js 中多个 type 走同一分支）：
  //    - singleDamage_actionBarReduce      → 暗影「暗影突袭」（zhuaji2 特效）
  //    - singleDamage_actionBarReduce1     → 巨型眼瞳「致幻」（zhihuan 特效）
  skillTypes: {
    insertCurseCards: {  // 🎭 诅咒布偶「怨咒」：黑暗光环在玩家身上播放（诅咒降临演出）
      type: 'atPoint',
      effectName: 'buou1T',
      animName: 'heianhuan',
      targetY: 'player',
      offsetY: 5, // ⬇️ 向下偏移 5vh（正=下）
      scale: 2,
    },

    singleDamage_actionBarReduce: {
      type: 'atPoint',
      effectName: 'zhuaji2',
      scale: 3,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuaji2.mp3', // 🎵 技能音效（文件已存在）
      soundVolume: 0.7,
      offsetY: 6,
    },
    singleDamage_actionBarReduce1: {
      type: 'atPoint',
      effectName: 'zhihuan',
      scale: 3,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuaji2.mp3', // 🎵 技能音效（文件已存在）
      soundVolume: 0.7,
      offsetY: 0,
    },
    singleDamage_stun: {
      type: 'atPoint',
      effectName: 'dianji',
      scale: 1,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuaji2.mp3', // 🎵 技能音效（通用打击声；dianji 暂无对应音频）
      soundVolume: 0.7,
    },
    singleDamage_fly: {
      type: 'atPoint',
      effectName: 'zhuaji2',
      scale: 1,
      targetY: 'player',
      flipX: true,
      sound: 'music/jineng/zhuaji2.mp3', // 🎵 技能音效
      soundVolume: 0.7,
    },
    // 🐈 狂怒（buffSelf）：在敌人自身位置循环播放特效，直到 buff 结束（onTurnStart 移除）
    //    特效配置读这里（battle.js buffSelf 分支用 getEnemySkillEffectConfig('buffSelf') 播放）
    buffSelf: {
      type: 'atPoint',
      effectName: 'fennu',  
      scale:4,
      offsetY: -20,           // 特效中心略微上移（贴在敌人身上）
      loop: true,             // 🔁 循环播放，buff 结束自动移除
      zIndex:-50,
    },
    summon: { type: 'none' },    // 召唤由 createEnemySummon 处理
    // 🌪️ 龙卷风暴（风息 multiHit_wind）：在玩家脚底释放，每次多段攻击循环播放
    multiHit_wind: {
      type: 'atPoint',
      effectName: 'LongjuanFengbao',  // 🌀 龙卷风暴特效（effectPool 已注册）
      scale: 1.8,
      targetY: 'player',              // 🎯 在玩家位置（脚底）释放
      offsetY: -10,                   // 特效中心略微上移（风暴中心贴玩家身体）
      sound: 'music/jineng/card_tornado.mp3', // 🎵 技能音效
      soundVolume: 1,
       timeScale: 0.6,  
    },
    // ⚡ 电磁场（雷鸟女皇 electro_field）：在【玩家脚下】释放，无限循环播放，直到雷鸟女皇死亡（onEnemyDied 移除）
    // 🎯 本特效不走战斗特效层，而是加到【世界容器】（玩家所在画布）：
    //    玩家在世界容器 zIndex=2 → 特效 zIndex 配 <2 的值（如 -50）就显示在玩家脚下（玩家之下、背景之上）
    // 🎯 微调播放中心：offsetX（vw，正=右）/ offsetY（vh，正=下），基准 = 玩家脚底
    electro_field: {
      type: 'atPoint',
      effectName: 'diancichang',   // ⚡ 场地循环电特效骨骼（effectPool 已注册 diancichang）
      scale: 3,
      zIndex: -50,                 // 🎯 世界容器层级：玩家 zIndex=2，-50 → 玩家之下（不再受战斗特效层遮挡）
      targetY: 'player',           // 🎯 在玩家位置（脚底）释放
      loop: true,                  // 🔁 无限循环，直到雷鸟女皇死亡移除
      sound: 'enemy_leiniaonvhuang_skill', // 🎵 技能音效（优先于 enemiesData 里的 skillSound）
      soundVolume: 1,
      timeScale: 1,              // ⏱️ 播放速度（0.8 = 稍慢，读配置生效）
      // offsetX: 0,             // 🎯 播放中心水平偏移（vw，正=右）
      offsetY: -3,             // 🎯 播放中心垂直偏移（vh，正=下）
    },
  },
};

/**
 * 获取某敌人的特效配置（按 juese 匹配，回退默认）
 * @param {string} juese - 敌人骨骼名（如 'monster1'）
 * @returns {Object} { attack, skill }
 */
export function getEnemyEffectConfig(juese) {
  return ENEMY_EFFECT_CONFIG[juese] || ENEMY_EFFECT_CONFIG.default;
}

/**
 * 获取某敌人技能的特效配置（按 skill.type 匹配）
 * @param {string} skillType - 技能类型（如 'singleDamage_actionBarReduce'）
 * @returns {Object|null}
 */
export function getEnemySkillEffectConfig(skillType) {
  return ENEMY_EFFECT_CONFIG.skillTypes?.[skillType] || null;
}

/**
 * 🎯 获取敌人的特效配置（普攻/技能分开；技能按 skill.type 从 skillTypes 取，
 *    没配就回退该敌人的普攻特效配置——普攻和技能共用一套兜底）
 * @param {string} juese - 敌人骨骼名（如 'monster1'）
 * @param {'attack'|'skill'} kind - 普攻 or 技能
 * @param {string} [skillType] - 技能类型（kind='skill' 时用，如 'singleDamage_stun'）
 * @returns {Object|null} 特效配置（含 sound / soundVolume）
 */
export function getEnemyFxConfig(juese, kind, skillType) {
  if (kind === 'skill' && skillType) {
    const st = ENEMY_EFFECT_CONFIG.skillTypes?.[skillType];
    if (st) return st;
  }
  return getEnemyEffectConfig(juese)?.attack || null;
}
