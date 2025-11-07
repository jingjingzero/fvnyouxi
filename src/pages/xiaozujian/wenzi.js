export const dialogueTree = {
  start: {
    lines: [
      '你来到神秘村庄，村长焦急地对你说：“村里最近怪物频繁出没，能帮帮我们吗？”',
      '你点了点头，准备了解更多情况。'
    ],
    options: [
      { text: '我愿意帮助击退怪物。', next: 'chooseApproach' },
      { text: '我想先了解怪物的情况。', next: 'investigateMonster' },
      { text: '抱歉，我没时间。', next: 'refuseHelp' }
    ]
  },
  chooseApproach: {
    lines: ['你打算如何对付怪物？'],
    options: [
      { text: '用武力直接挑战怪物。', next: 'fightMonster', condition: (char) => char.strength >= 6 },
      { text: '用智慧设陷阱捕捉怪物。', next: 'trapMonster', condition: (char) => char.intelligence >= 6 },
      { text: '试着用魅力与怪物沟通。', next: 'talkMonster', condition: (char) => char.charisma >= 6 },
      { text: '我还不确定，想多了解些。', next: 'investigateMonster' }
    ]
  },
  fightMonster: {
    lines: ['凭借强大的力量，你击败了怪物，村庄恢复了平静！'],
    options: [
      { text: '继续探险。', next: 'start' },
      { text: '结束游戏。', next: 'end' }
    ]
  },
  trapMonster: {
    lines: ['你巧妙设置陷阱，成功捕获了怪物，获得了村民的赞赏。'],
    options: [
      { text: '继续探险。', next: 'start' },
      { text: '结束游戏。', next: 'end' }
    ]
  },
  talkMonster: {
    lines: ['怪物被你的魅力打动，停止了骚扰村庄，甚至成为了你的伙伴。'],
    options: [
      { text: '继续探险。', next: 'start' },
      { text: '结束游戏。', next: 'end' }
    ]
  },
  investigateMonster: {
    lines: [
      '你调查后得知怪物怕火且行动迟缓。',
      '也许用火攻或者陷阱会有效。'
    ],
    options: [
      { text: '用火攻打怪物。', next: 'fireAttack' },
      { text: '设陷阱捕捉怪物。', next: 'trapMonster', condition: (char) => char.intelligence >= 6 },
      { text: '还是直接战斗吧。', next: 'fightMonster', condition: (char) => char.strength >= 6 }
    ]
  },
  fireAttack: {
    lines: ['你用火焰成功吓退了怪物，村民们为你庆祝。'],
    options: [
      { text: '继续探险。', next: 'start' },
      { text: '结束游戏。', next: 'end' }
    ]
  },
  refuseHelp: {
    lines: ['村长失望地说：“那只能靠自己了。”你离开了村庄。'],
    options: [
      { text: '重新考虑帮助村庄。', next: 'start' },
      { text: '结束游戏。', next: 'end' }
    ]
  },
  end: {
    lines: ['游戏结束，感谢游玩！'],
    options: []
  }
}