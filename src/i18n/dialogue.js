// 🌐 全局 i18n 词条：对话系统 UI（duihua.vue 按钮 / 提示等硬编码中文）
// 结构同 ui-core.js：zh / en 两个键，en 缺词回退中文
export default {
  zh: {
    // 对话选项需求提示（（需要：XX））
    need: '需要',
    // 快进按钮
    fastForward: '快进',
    // 行动点不足提示
    // 物品不足提示
    needItem: '需要物品：',
    // 好感度不足提示
    needAffection: '好感度不足：',
    // 好感度格式化（XX 好感≥N）
    affection: '好感',
  },
  en: {
    need: 'Need',
    fastForward: 'Fast Forward',
    needItem: 'Required item: ',
    needAffection: 'Affection too low: ',
    affection: 'Affection',
  },
};
