let VH = window.innerHeight / 100;
let VW = window.innerWidth / 100;

function createEnemiesData() {
    return [
        {
            id:2,
            juese: "monster1",
            mapId:"desert_02",
            player: 2,
            xuetiaoPosition: 24,
            x: 0 * VW,
            y: 80 * VH,
            speed:0,
            direction: -1,
            data: {
                name: '史莱姆',
                hp: 100,
                maxHp: 100,
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
            }
        },
    ];
}

// 导出工厂函数（非 const，可扩展）
export default createEnemiesData;