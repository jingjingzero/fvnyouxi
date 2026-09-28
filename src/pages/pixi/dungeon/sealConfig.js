// 🔐 封印系统配置表：tiled 的封印对象只摆位置 + 用对象名/switchId 做唯一标识，
//    解锁条件与文案（unlockType/unlockTarget/message/unlockMessage）在这里统一配置
//    - sealExit（封印出口感应区）：key = 对象名
//    - preSealed（预封印区域）：key = 对象名；格子坐标 sealCells 仍在 tiled（位置数据）
//    - switch（地图开关）：key = switchId（tiled 里 switchId 属性，没填用对象名）
export const SEAL_EXIT_CONFIG = {
  // 示例（muban.tmj sealTrigger1 原值搬移）：
  'sealTrigger1': {
    message: '🚪 出口被封印了！击败敌人后才能离开',
    unlockType: 'killAllEnemies', // 🗡️ 击败所有敌人后解锁
    unlockMessage: '✨ 封印解除！出口已打开',
  },
};
export const SEAL_EXIT_DEFAULT = {
  message: '',
  unlockType: 'killAllEnemies',
  unlockMessage: '',
};

export const PRE_SEAL_CONFIG = {
  // 示例（muban.tmj 四个 preSealed 原值搬移）：
  'preSeal_killAll': {
    unlockType: 'killAll', // 🗡️ 击败所有敌人后解锁
    message: '🚪 前方区域被封印，击败所有敌人后解锁',
    unlockMessage: '✨ 所有敌人已击败，封印解除！',
  },
  'preSeal_switch': {
    unlockType: 'switch', // 🔘 找到开关后解锁（unlockTarget = 开关的 switchId）
    unlockTarget: 'switch_01',
    message: '🚪 前方区域被封印，找到开关解锁',
    unlockMessage: '✨ 开关已激活，封印解除！',
  },
  'preSeal_killSpecific': {
    unlockType: 'killSpecific', // 🎯 击败指定敌人后解锁（unlockTarget = 敌人 enemyId，对应 enemy 对象）
    unlockTarget: 'enemy_slime_bat',
    message: '🚪 前方区域被封印，击败特定敌人后解锁',
    unlockMessage: '✨ 目标敌人已击败，封印解除！',
  },
  'preSeal_dialogue': {
    unlockType: 'dialogue', // 💬 完成指定对话后解锁（unlockTarget = 对话标记）
    unlockTarget: 'unlock_dialogue_door',
    unlockMessage: '✨ 对话解锁，封印解除！',
  },
};
export const PRE_SEAL_DEFAULT = {
  unlockType: 'killAll',
  unlockTarget: '',
  message: '',
  unlockMessage: '',
};

export const SWITCH_CONFIG = {
  // 示例（muban.tmj switch_01 原值搬移）：
  'switch_01': {
    message: '🔘 你按下了开关',
  },
};
export const SWITCH_DEFAULT = {
  message: '',
};
