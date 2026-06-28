import { createUnit } from './Unit.js'

// 敌人配置
export function createEnemyGroup() {
  return [
    createUnit({
      name: '史莱姆',
      hp: 1500,
      maxHp: 1500,
      baseSpeed: 90,
      speed: 90,
      camp: 'enemy',
      position: 1,
      baseArmor: 50,
      armor: 50,
      baseAttack: 70,
      attack: 70,
      baseLuck: 10,
      luck: 10
    }),

    // createUnit({
    //   name: '哥布林',
    //   hp: 50,
    //   maxHp: 50,
    //   baseSpeed: 80,
    //   speed: 80,
    //   camp: 'enemy',
    //   position: 2,
    //   // 🔥 和主角完全统一
    //   baseArmor: 0,
    //   armor: 0,
    //   baseAttack: 90,
    //   attack: 90,
    //   baseLuck: 15,
    //   luck: 15
    // })
  ]
}
