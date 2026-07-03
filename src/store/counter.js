/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 10:48:46
 * @LastEditTime: 2025-07-29 11:12:10
 */
import { defineStore } from "pinia"
import { Howl } from "howler"
import { setStorage, getStorage } from "@/pages/storage.js";
import dayjs from "dayjs";
import { ElMessText } from "@/pages/zujian/utils.js";
import emitter from "@/bus"; // 引入传值组件

// ======================================
// 自动存档配置：需要持久化的state路径
// 后续新增需要存档的字段，直接添加到这个数组即可，无需修改存读档逻辑
// ======================================
const AUTO_SAVE_PATHS = [
  // 游戏进度相关
  'youxi',
  'youxi01',
  'currentNodeKey',
  'textData',
  'duihua',
  'selectBoolean',
  'selecttextNum',
  'searchContent',
  'text',
  'text_boolean',
  'textYincang',
  'kuaijin',
  'backgroundImage',
  // 物品/抽卡相关
  'inventory',
  'triggeredStories',
  'gachaHistory',
  // 设置相关
  'volume',
  'text_speed',
  'textSize',
  // 任务系统
  'allTasks',
  // NPC相关（好感度、背景故事解锁状态）
  'pixi.npcSelectList',
  // 对话系统
  'pixi.dialogueFlags',
  'pixi.choiceHistory',
  'pixi.dialogueProgress',
  'pixi.language', // 语言设置
  // 玩家数据（属性、卡牌CARD_DATA、手牌playerHand、等级经验、身份）
  'pixi.player',
  'pixi.setting',
  'pixi.fight',
  'pixi.hasSeenBattleTutorial',
  'pixi.gameUi',
];

export const useCounterStore = defineStore("counter", {
  state: () => {
    return {
      ceshi1: 0,
      ceshi2: 0,
      ceshi3: 0,
      pixi: {
        app: null,//主世界画布
        stop: false,
        mapLoading: false,//地图加载
        mapLoadingProgress: 0,//地图加载进度
        isPaused: false, //游戏暂停
        spineBoy: null,//主角
        fight: false,//是否进入战斗
        hasSeenBattleTutorial: false, // 是否已看过战斗新手引导
        gameUi: false,//是否隐藏ui
        characters: [],//人物动画
        setting: 0,
        npcDataList: [],//所有地图NPC数据
        mapDataList: [],//地图数据
        activePlayer: null,
        playerInstance: null,//主角实例
        npcInstance: null,
        npcSelectList: [
          {
            img: "jingling",
            name: "精灵",
            affection: 100,
            description: "神秘的森林精灵，拥有治愈的力量，性格温柔善良。",
            buff: {
              name: "森林祝福",
              icon: "💚",
              description: "战斗开始时，为全队恢复10%生命值"
            },
            backstories: [
              {
                id: 1,
                title: "森林的守护者",
                content: "精灵来自古老的森林深处，她的族群世代守护着森林的秘密。在精灵的记忆中，森林永远是那么宁静而美好，阳光透过树叶洒下斑驳的光影，空气中弥漫着花香与泥土的气息。",
                unlocked: true,
                unlockAffection: 0
              },
              {
                id: 2,
                title: "离开家园",
                content: "在一次意外中，她离开了家园，来到了苍穹设施附近的森林。那一天，森林的边缘出现了奇怪的机器，巨大的噪音惊扰了林中的生灵。精灵为了调查真相，小心翼翼地靠近了那个陌生的世界。",
                unlocked: false,
                unlockAffection: 30
              },
              {
                id: 3,
                title: "治愈之力",
                content: "她的治愈能力来自于与自然的共鸣，只有真正心地善良的人才能获得她的信任。精灵的双手能够汲取阳光与露水的力量，将生命的能量注入受伤的躯体。但这种力量并非无穷无尽，每一次治愈都会消耗她自身的元气。",
                unlocked: false,
                unlockAffection: 60
              },
              {
                id: 4,
                title: "命运的相遇",
                content: "当精灵第一次见到主角时，她从主角的眼中看到了与森林相似的纯净。那是一种在这个充斥着钢铁与实验的设施中，难得一见的光芒。她决定留下来，观察这个人类，看看命运会将他们带向何方。",
                unlocked: false,
                unlockAffection: 90
              }
            ]
          },
          {
            img: "two19",
            name: "白猫",
            affection: 0,
            description: "一只会说话的白猫，看似普通实则神秘莫测。",
            buff: {
              name: "幸运光环",
              icon: "🍀",
              description: "战斗中暴击率提升15%"
            },
            backstories: [
              {
                id: 1,
                title: "实验体编号",
                content: "白猫并非普通的猫，它曾是苍穹设施的实验体之一。在它的记忆深处，有一串冰冷的编号——Two-19。那是它在实验中的代号，也是它曾经的身份。它不记得自己是怎么来到这里的，只记得无尽的检查和测试。",
                unlocked: true,
                unlockAffection: 0
              },
              {
                id: 2,
                title: "觉醒之日",
                content: "在一次实验事故中，它获得了智慧和说话的能力，但也因此失去了原本的身份。那天的爆炸改变了一切，当白猫从废墟中爬出来时，它发现自己能够理解人类的语言，甚至能够开口说话。但它也意识到，这个能力不能让任何人知道。",
                unlocked: false,
                unlockAffection: 30
              },
              {
                id: 3,
                title: "暗中观察",
                content: "它选择以猫的形态隐藏在设施中，暗中观察着一切。没有人知道它真正的目的是什么，但它似乎对主角有着特殊的兴趣。白猫总是在不经意间出现在主角身边，有时是在窗台上，有时是在走廊的拐角。它在观察，也在等待。",
                unlocked: false,
                unlockAffection: 60
              },
              {
                id: 4,
                title: "真正的计划",
                content: "白猫的心中藏着一个巨大的秘密。它之所以留在设施中，不仅仅是为了生存。它在寻找一个人，一个与它有着相同命运的人。当它遇到主角时，它知道，自己等待的时机终于到了。",
                unlocked: false,
                unlockAffection: 90
              }
            ]
          },
          {
            img: "huli",
            name: "狐狸",
            affection: 0,
            description: "狡黠的九尾狐，擅长幻术和迷惑人心。",
            buff: {
              name: "幻影分身",
              icon: "🦊",
              description: "战斗开始时召唤一个幻影分身，继承50%属性"
            },
            backstories: [
              {
                id: 1,
                title: "青丘之狐",
                content: "狐狸是一只修炼了数百年的妖狐，拥有九条尾巴的力量。她来自传说中的青丘，那里是所有狐族的圣地。在青丘的岁月里，她学会了幻术、化形、以及窥探人心的能力。她曾经是族中最有天赋的年轻狐妖。",
                unlocked: true,
                unlockAffection: 0
              },
              {
                id: 2,
                title: "误入人间",
                content: "她因为一场意外被卷入了人类的世界，被困在苍穹设施附近。那是一个月圆之夜，狐狸正在进行突破境界的修炼。突如其来的空间乱流将她卷到了这个陌生的地方，法力大损，连化形都变得困难。",
                unlocked: false,
                unlockAffection: 30
              },
              {
                id: 3,
                title: "幻术之道",
                content: "她擅长使用幻术，能够轻易迷惑人心，但内心深处却渴望找到回家的路。狐狸的幻术能够制造出最逼真的幻象，甚至能够影响人的五感。但她很少使用这种能力，因为她知道，欺骗得来的信任永远不会长久。",
                unlocked: false,
                unlockAffection: 60
              },
              {
                id: 4,
                title: "新的羁绊",
                content: "在与主角的相处中，狐狸渐渐放下了戒备。她发现，这个人类与她之前遇到的都不一样。主角不会因为她是妖狐而恐惧，也不会因为她的力量而利用。也许，这里可以成为她另一个家。",
                unlocked: false,
                unlockAffection: 90
              }
            ]
          },
          {
            img: "jinmao",
            name: "金毛",
            affection: 0,
            description: "忠诚的金毛犬，是主角最可靠的伙伴。",
            buff: {
              name: "忠诚守护",
              icon: "🐕",
              description: "为主角承担20%的伤害"
            },
            backstories: [
              {
                id: 1,
                title: "最初的相遇",
                content: "金毛是主角在进入苍穹设施前就饲养的狗狗。还记得那天，在宠物店的橱窗里，它一眼就看到了主角。它拼命地摇着尾巴，发出呜呜的声音，好像在说：选我！选我！而主角也确实这么做了。",
                unlocked: true,
                unlockAffection: 0
              },
              {
                id: 2,
                title: "陪伴的岁月",
                content: "它一直陪伴着主角，是主角最忠诚的伙伴。从小小的幼犬长成威风凛凛的大狗狗，金毛见证了主角的每一次欢笑与泪水。在主角最难过的时候，它会安静地趴在脚边，用温暖的身体给予安慰。",
                unlocked: false,
                unlockAffection: 20
              },
              {
                id: 3,
                title: "来到设施",
                content: "在主角进入实验体培育部门工作后，金毛也被带到了设施中。虽然这里没有宽敞的院子可以奔跑，但只要能和主人在一起，在哪里都没关系。金毛很快就适应了新环境，甚至还交了几个朋友——虽然那些朋友大多只是管道和仪器。",
                unlocked: false,
                unlockAffection: 40
              },
              {
                id: 4,
                title: "永远的守护",
                content: "金毛不会说话，但它总能在主角需要的时候给予安慰和支持。它的忠诚和勇气，是主角在黑暗中前行的重要动力。如果有谁想要伤害主角，金毛会毫不犹豫地挡在前面，哪怕付出生命的代价。",
                unlocked: false,
                unlockAffection: 70
              }
            ]
          },
          {
            img: "yu",
            name: "鱼",
            affection: 0,
            description: "生活在设施水池中的神秘金鱼，似乎能预知未来。",
            buff: {
              name: "预知之眼",
              icon: "🐟",
              description: "每回合开始前预知敌人下回合的行动"
            },
            backstories: [
              {
                id: 1,
                title: "池中之鱼",
                content: "这条金鱼并非普通的观赏鱼，它是苍穹设施早期基因实验的产物。在它还是一枚鱼卵的时候，科学家们就向其中注入了神秘的基因序列。它成功孵化了，并且表现出了与众不同的特质。",
                unlocked: true,
                unlockAffection: 0
              },
              {
                id: 2,
                title: "预知能力",
                content: "在一次实验中，它意外获得了预知未来的能力，但代价是永远只能以鱼的形态存在。金鱼能够看到时间的碎片，那些关于未来的画面总是在它眼前闪现。但它无法说话，只能用特殊的方式传递信息。",
                unlocked: false,
                unlockAffection: 40
              },
              {
                id: 3,
                title: "时间的囚徒",
                content: "它生活在设施的各个水池中，默默地观察着时间的流逝。对金鱼来说，时间是一种奇妙的东西。它能看到过去和未来的碎片，却被困在永恒的当下。它游过一个又一个水池，看着一代又一代的人来了又走。",
                unlocked: false,
                unlockAffection: 60
              },
              {
                id: 4,
                title: "命运的指引",
                content: "它会用特殊的方式向有缘人预示未来，但解读它的提示需要足够的智慧和信任。当主角第一次出现在水池边时，金鱼知道，那个能够改变一切的人终于出现了。它决定用自己的方式，引导主角走向正确的道路。",
                unlocked: false,
                unlockAffection: 90
              }
            ]
          },
        ],//可以选择的人物
        player: {
          playerHand: ['射击', '激光'],
          CARD_DATA: {
            射击: {
              skin: 'Shoot',
              color: '#ff4757',
              num: 1,
              maxCooldown: 0,
              cost: 0,
              limitPerTurn: 1,
              evoOptions: ['弹夹升级', '概率暴击', '快速换弹', '破甲'],
              defaultEvos: [],//已进化
              evoDesc: {
                "弹夹升级": "额外射击二次",
                "概率暴击": "有50%概率暴击，造成140%伤害",
                "快速换弹": "可消耗1点灵力额外使用1次",
                "破甲": "无视敌方 30% 护甲"
              },
              hitCount: 6,//打击次数
              fixedDmg: 8,//固定伤害
              atkRatio: 0.1,//攻击力收益
              animDelay: 6 * 150,//动画时长
              // ✅ 卡牌描述
              desc: "无消耗,每回合限用一次,朝敌人射击6次,每次造成 8 + 10% 攻击力物理伤害。"
            },

            激光: {
              skin: 'Laser',
              color: '#ffeb3b',
              maxCooldown: 1,
              cost: 3,
              num: 1,
              evoOptions: ['击杀返还', '概率暴击', '超频释放', '破甲'],
              defaultEvos: [],
              evoDesc: {
                "击杀返还": "造成击杀则返还2点灵力",
                "概率暴击": "有50%概率暴击，造成140%伤害",
                "超频释放": "所需灵力提升1点，造成伤害提升40%",
                "破甲": "无视敌方 30% 护甲"
              },
              fixedDmg: 110,
              atkRatio: 1.2,
              animDelay: 500,
              desc: "对所有敌人造成110+120%攻击力物理伤害。"
            },

            瘴气: {
              skin: 'Miasma',
              color: '#2fca64',
              dmgType: "poison", // 毒伤
              maxCooldown: 2,
              cost: 2,
              num: 0,
              evoOptions: ['毒素紊乱', '熟能生巧', '死亡返还', '虚弱'],
              defaultEvos: [],
              evoDesc: {
                "毒素紊乱": "目标身上每携带1种毒素状态，瘴毒伤害提高12%",
                "熟能生巧": "战斗中累计使用3 次后，减少1点灵力消耗",
                "死亡返还": "当有敌人阵亡时，冷却缩短1回合",
                "虚弱": "携带【瘴毒】的敌人护甲降低 15%，所受毒素伤害提高12%"
              },
              fixedDmg: 25,
              atkRatio: 0.25,
              animDelay: 500,
              desc: "对全部敌人施加【瘴毒】，持续 3 回合；敌人每次行动时受到「25+25% 攻击力」毒素伤害。重复施加瘴气，刷新中毒持续时长，并使【瘴毒】伤害增幅 50%。"
            },

            无人机: {
              skin: 'Drone',
              color: '#a78bfa',
              maxCooldown: 3,
              cost: 3,
              num:0,
              evoOptions: ['超强续航', '自动部署', '系统升级', '机群效应'],
              defaultEvos: [],
              evoDesc: {
                "超强续航": "无人机攻击次数+2",
                "自动部署": "战斗开局自动召唤 1 台无人机",
                "系统升级": "无人机速度提升40%，造成伤害提升20%",
                "机群效应": "当召唤无人机时，在场的无人机行动条推进 50%"
              },
              fixedDmg: 60,
              atkRatio: 0.6,
              animDelay: 500,
              desc: "召唤一个无人机协助自己作战，无人机初始拥有60速度，在攻击3次后退场。无人机每次攻击造成60+60%攻击力伤害。"
            },

            影分身: {
              skin: 'ShadowClone',
              color: '#7c3aed',
              maxCooldown: 1,
              cost: 3,
              num: 0,
              evoOptions: ['生命提升', '自动召唤', '强力分裂', '协同作战'],
              defaultEvos: [],
              evoDesc: {
                "生命提升": "影分身生命值提升至40%最大生命值",
                "自动召唤": "战斗开局自动召唤影分身",
                "强力分裂": "影分身的属性提升至自身的70%",
                "协同作战": "影分身行动时，你的行动条推进30%"
              },
              desc: "召唤一个拥有你25%最大生命值的影分身，拥有你60%的速度，他会替你承担50%伤害，死亡后退场。当他行动时，会使用射击。"
            },

            聚灵: {
              skin: 'SpiritGather',
              color: '#10b981',
              maxCooldown: 2,
              animDelay: 300,
              initialCooldown: 2,
              cost: 0,
              num: 0,
              evoOptions: ['快速使用', '效果强化', '汲灵秘术', '灵力分享'],
              defaultEvos: [],
              evoDesc: {
                "快速使用": "战斗开始时不再拥有冷却",
                "效果强化": "额外恢复1点灵力",
                "汲灵秘术": "使用后全属性提升10%持续1回合",
                "灵力分享": "使用后会使你的其他友方单位行动条推进25%"
              },
              desc: "恢复2点灵力"
            },

            反弹: {
              skin: 'Reflect',
              color: '#f59e0b',
              maxCooldown: 2,
              cost: 2,
              num: 0,
              evoOptions: ['效果强化', '全副武装', '状态延长', '自动释放'],
              defaultEvos: [],
              evoDesc: {
                "效果强化": "反弹伤害修正为【70%折前伤害+180%护甲】",
                "全副武装": "反弹状态下额外提升20%护甲",
                "状态延长": "反弹状态额外持续1回合",
                "自动释放": "战斗开始时自动获得此状态，并且战斗开始时护甲提升10%"
              },
              desc: "获得2回合的【反弹】状态，期间护甲提升30%，当你受到攻击时，对攻击者造成【50%折前伤害+140%护甲】伤害。"
            },

            武器强化: {
              skin: 'WeaponBoost',
              color: '#fbbf24',
              maxCooldown: 2,
              cost: 2,
              num: 0,
              evoOptions: ['首发增幅', '负荷提升', '穿甲', '重置'],
              defaultEvos: [],
              evoDesc: {
                "首发增幅": "第一次使用时额外增强100%效果",
                "负荷提升": "可强化次数提升2，当强化三次后，冷却时间缩短1回合",
                "穿甲": "每层效果额外使你的物理伤害无视5%护甲",
                "重置": "每次强化后可额外免费使用一次射击"
              },
              desc: "使你的物理伤害提升20%直到战斗结束，最多可强化三次。"
            },

            洞察: {
              skin: 'Insight',
              color: '#ffffff',
              maxCooldown: 2,//2
              cost: 2,//2
              num: 0,
              animDelay: 500,
              initialCooldown: 1,//1
              evoOptions: ['效果增强', '乘胜追击', '不安', '看透'],
              defaultEvos: [],
              evoDesc: {
                "效果增强": "受到伤害修正为（15+9*破解层数）%",
                "乘胜追击": "当拥有弱点的敌人死亡，你的速度提升20%持续2回合",
                "不安": "当敌人获得弱点时，行动条减少40%",
                "看透": "拥有弱点的敌人护甲会降低20%"
              },
              desc: "使所有敌人获得一层弱点状态，敌人拥有弱点时，受到伤害提升（10+6*破解层数）%"
            },

            毒雾: {
              skin: 'PoisonMist',
              color: '#2fca64',
              maxCooldown: 1,
              cost: 5,
              num: 0,
              initialCooldown: 4,
              evoOptions: ['效果增强', '快速启动', '窒息', '扩散'],
              defaultEvos: [],
              evoDesc: {
                "效果增强": "敌人行动时受到中毒伤害提升至55+55%",
                "快速启动": "初始冷却-2",
                "窒息": "毒雾存在时，敌人的速度降低18%",
                "扩散": "毒雾存在时，敌人行动时会受到20+15%攻击力的毒素伤害"
              },
              desc: "令周围充满毒雾，令所有敌人进入中毒效果、护甲降低 20%、所受毒素伤害提高 30%；敌人每回合开始受到 40+40% 攻击力的毒素伤害。"
            }
          },
          juese: {
            name: '主角',
            hp: 200,
            maxHp: 200,
            mp: 2,
            maxMp: 6,
            baseArmor: 30,
            baseAttack: 100,
            baseSpeed: 136,
            baseLuck: 50,
            armor: 30,
            attack: 100,
            speed: 136,
            luck: 50,
            camp: 'player'
          },
          shenfen: `身份：奥米集团 <b class="text-#F56C6C">LV.1</b> 探索者`,
          exp: 0,//经验值
          maxExp: 50,
          Level: 1,//等级
          talentPoints: 99, // 天赋点（初始1点）
          activatedTalents: [], // 已激活的天赋ID列表
        },
        duihua: false,
        // 语言设置
        language: 'zh-CN',
        // 对话系统状态
        dialogueFlags: {}, // 对话标记（用于条件判断）
        choiceHistory: [], // 选择历史记录
        dialogueProgress: {}, // 对话进度（记录每个对话的完成情况）
      },
      playerSprite: undefined,
      youxi01: 0,
      textYincang: false,//文字是否隐藏
      currentNodeKey: "",
      animations: [],
      youxi: 0, //游戏进程
      selectBoolean: false,//选择是否开启搜索环境
      selecttextNum: 0,//选择是否在执行中
      searchContent: [],//搜索物品
      backgroundImage: "",//背景图
      backgroundImage1: false,//背景特效图
      text: "",//文本
      text_boolean: false,//文字是否在播放中
      menu: 1,//菜单
      menuSelect: 0,//菜单选择
      savejson: [],//存档
      messages: [],//历史记录 
      inventory: [{
        name: "灵力晶核",
        num: 999,
        img: "jinghe",
        miaoshu: "蕴含强大灵力的晶核，可用于抽取卡牌。",
        sell: 10,
        status: "material",
        color: "#8B5CF6"
      },],  // 物品列表
      triggeredStories: [], // 已触发的剧情列表（一次性剧情）
      gachaHistory: [], // 抽卡历史记录
      saveData: "",//存档数据
      playingSounds: [],//音乐数组
      SoundArr: [],
      volume: 0.6, // 默认音量 60%
      text_speed: 96,//1快速，2正常，3慢速
      textSize: 18,//文字大小
      fullBodyImages: [],//立绘
      visible: 0, // 控制黑幕和眼皮的显示与隐藏
      currentPage: 1,//分页当前页数
      textData: null,//文本数据
      kuaijin: false,//是否快进中
      //任务列表
      allTasks: {
        // 主线任务
        mainTasks: [
          {
            id: 1,
            name: "黑客入侵",
            type: "main",
            description: "你的主要目的：窃取“苍穹”设施的安全最高权限后将权限交给萨米，完成你的复仇计划。",
            isCompleted: false,
            currentStep: 0,
            steps: [
              { id: 1, content: "进入实验体培育部门，获取主任的信任", isCompleted: false },
              { id: 2, content: "选择负责的实验体，开始培育工作", isCompleted: false },
              { id: 3, content: "寻找机会入侵主任的设备，植入病毒程序", isCompleted: false },
              { id: 4, content: "获取苍穹设施的最高安全权限", isCompleted: false },
              { id: 5, content: "将权限数据交给萨米", isCompleted: false }
            ]
          },
          {
            id: 2,
            name: "实验体挑选",
            type: "main",
            description: "通过平板打开消息，在实验体培育部群聊中点击网址链接选择想要培育的实验体。",

            isCompleted: true,
            currentStep: 4,
            steps: [
              { id: 1, content: "打开平板，查看消息应用", isCompleted: false },
              { id: 2, content: "进入实验体培育部群聊", isCompleted: false },
              { id: 3, content: "点击主任发送的网址链接", isCompleted: false },
              { id: 4, content: "选择你想要负责培育的实验体", isCompleted: false }
            ]
          }
        ],
        // 支线任务
        sideTasks: [
          {
            id: 101,
            name: "了解设施环境",
            type: "side",
            description: "熟悉苍穹设施的布局和各个部门的位置，为后续行动做准备。",
            isCompleted: false,
            currentStep: 0,
            steps: [
              { id: 1, content: "探索实验体培育部门", isCompleted: false },
              { id: 2, content: "找到员工休息区", isCompleted: false },
              { id: 3, content: "了解设施的安全监控分布", isCompleted: false }
            ]
          },
          {
            id: 102,
            name: "建立人脉",
            type: "side",
            description: "与同事建立良好关系，获取更多有用的信息。",

            isCompleted: false,
            currentStep: 0,
            steps: [
              { id: 1, content: "与西奥交谈", isCompleted: false },
              { id: 2, content: "与法伯尔交谈", isCompleted: false },
              { id: 3, content: "与马库斯交谈", isCompleted: false }
            ]
          }
        ]
      },
      //天赋
      talentConfig: [
        {
          id: 'mana_surge',
          name: '灵力奔涌',
          description: '进入战斗后额外获得3点灵力，最大灵力上限+1',
          cost: 1,
          icon: '💧',
          color: '#409EFF',
        },
        {
          id: 'mana_regen',
          name: '灵韵流转',
          description: '每回合开始时额外获得1点灵力',
          cost: 2,
          icon: '🔄',
          color: '#67C23A',
        },
        {
          id: 'critical_strike',
          name: '致命一击',
          description: '幸运+15，暴击伤害提升40%',
          cost: 2,
          icon: '⚔️',
          color: '#F56C6C',
        },
        {
          id: 'life_steal',
          name: '生命回复',
          description: '自身回合开始时恢复4%最大生命值',
          cost: 1,
          icon: '💚',
          color: '#67C23A',
        },
        {
          id: 'battle_frenzy',
          name: '战斗狂热',
          description: '进入战斗后，攻击力和速度提升15%',
          cost: 2,
          icon: '🔥',
          color: '#E6A23C',
        },
        {
          id: 'card_master',
          name: '余匣',
          description: '可携带的卡牌数量提升1',
          cost: 1,
          icon: '🃏',
          color: '#909399',
        }
      ]
    }
  },
  getters: {
  },
  actions: {
    // 屏幕特效
    addMessage(name, content) {
      const lastMsg = this.messages[0]
      // 如果最后一条内容与当前相同，不添加
      if (lastMsg && lastMsg.content === content) {
        return
      }
      this.messages.unshift({ name, content })

      // 最多保留 30 条
      if (this.messages.length > 30) {
        this.messages.pop()
      }
    },
    // 存放物品
    addItemToInventory(newItem) {
      if (!newItem.num) {
        return; // 不做任何操作
      }
      const existing = this.inventory.find(item => item.name === newItem.name)
      if (existing) {
        existing.num += newItem.num
      } else {
        this.inventory.push({ ...newItem })
      }
    },
    // 添加卡牌到物品栏
    addCardToInventory(cardName, count = 1) {
      const cardData = this.pixi.player.CARD_DATA[cardName];
      if (!cardData) return;

      const existing = this.inventory.find(item => item.name === cardName && item.isCard);
      if (existing) {
        existing.num += count;
      } else {
        this.inventory.push({
          name: cardName,
          num: count,
          img: cardData.skin || cardName,
          miaoshu: cardData.desc || '',
          isCard: true,
          color: cardData.color,
          cost: cardData.cost,
          maxCooldown: cardData.maxCooldown,
        });
      }

      // 同步更新 CARD_DATA 中的 num
      if (!cardData.num) {
        cardData.num = 0;
      }
      cardData.num += count;
    },
    // 消耗重复卡牌进化
    evolveCardWithItem(cardName, evoName) {
      const cardItem = this.inventory.find(item => item.name === cardName && item.isCard);
      const cardData = this.pixi.player.CARD_DATA[cardName];

      if (!cardItem || !cardData) return false;
      if (cardItem.num < 2) {
        ElMessText("需要至少2张相同卡牌才能进化", "warning");
        return false;
      }

      // 检查是否已经进化过
      if (!cardData.defaultEvos) {
        cardData.defaultEvos = [];
      }
      if (cardData.defaultEvos.includes(evoName)) {
        ElMessText("该词条已进化", "warning");
        return false;
      }

      // 检查是否是可进化的词条
      if (!cardData.evoOptions || !cardData.evoOptions.includes(evoName)) {
        ElMessText("无法进化该词条", "warning");
        return false;
      }

      // 消耗1张卡牌
      cardItem.num -= 1;
      if (cardItem.num <= 0) {
        const index = this.inventory.indexOf(cardItem);
        this.inventory.splice(index, 1);
      }

      // 添加进化
      cardData.defaultEvos.push(evoName);
      ElMessText(`进化成功：${evoName}`, "success");
      return true;
    },
    // 消耗指定数量卡牌进化（用于卡牌图鉴）
    evolveCardWithCount(cardName, evoName, count) {
      const cardItem = this.inventory.find(item => item.name === cardName && item.isCard);
      const cardData = this.pixi.player.CARD_DATA[cardName];

      if (!cardItem || !cardData) return false;

      // 至少保留1张基础卡牌
      if (cardItem.num - 1 < count) {
        ElMessText(`需要至少 ${count + 1} 张卡牌才能进化`, "warning");
        return false;
      }

      // 检查是否已经进化过
      if (!cardData.defaultEvos) {
        cardData.defaultEvos = [];
      }
      if (cardData.defaultEvos.includes(evoName)) {
        ElMessText("该词条已进化", "warning");
        return false;
      }

      // 检查是否是可进化的词条
      if (!cardData.evoOptions || !cardData.evoOptions.includes(evoName)) {
        ElMessText("无法进化该词条", "warning");
        return false;
      }

      // 最多进化4次
      if (cardData.defaultEvos.length >= 4) {
        ElMessText("已达到最大进化次数", "warning");
        return false;
      }

      // 消耗指定数量卡牌
      cardItem.num -= count;
      if (cardItem.num <= 0) {
        const index = this.inventory.indexOf(cardItem);
        this.inventory.splice(index, 1);
      }

      // 同步更新 CARD_DATA 中的 num
      if (cardData.num) {
        cardData.num -= count;
      }

      // 添加进化
      cardData.defaultEvos.push(evoName);
      ElMessText(`进化成功：${evoName}`, "success");
      return true;
    },
    // 抽卡方法
    gachaCard(count = 1) {
      // 检查灵力晶核数量
      const crystalItem = this.inventory.find(item => item.name === "灵力晶核");
      const cost = count; // 十连抽优惠

      if (!crystalItem || crystalItem.num < cost) {
        ElMessText("灵力晶核不足！", "warning");
        return null;
      }

      // 消耗灵力晶核
      crystalItem.num -= cost;
      if (crystalItem.num <= 0) {
        const index = this.inventory.indexOf(crystalItem);
        this.inventory.splice(index, 1);
      }

      // 获取所有卡牌（排除初始必带的射击）
      const allCards = Object.entries(this.pixi.player.CARD_DATA)
        .filter(([name]) => name !== "射击")
        .map(([name, data]) => ({
          name,
          color: data.color || "#ffffff",
          cost: data.cost || 0
        }));

      const results = [];

      for (let i = 0; i < count; i++) {
        // 所有卡牌概率相同，随机抽取
        const selectedCard = allCards[Math.floor(Math.random() * allCards.length)];

        // 添加到物品栏
        this.addCardToInventory(selectedCard.name, 1);

        results.push({
          name: selectedCard.name,
          color: selectedCard.color,
          cost: selectedCard.cost,
        });
      }

      // 添加到抽卡历史记录
      const historyRecord = {
        time: new Date().toLocaleString('zh-CN'),
        count: count,
        cost: cost,
        cards: results.map(r => r.name)
      };
      this.gachaHistory.unshift(historyRecord);

      // 只保留最近100条记录
      if (this.gachaHistory.length > 100) {
        this.gachaHistory = this.gachaHistory.slice(0, 100);
      }

      return results;
    },
    // 获取灵力晶核数量
    getCrystalCount() {
      const crystalItem = this.inventory.find(item => item.name === "灵力晶核");
      return crystalItem ? crystalItem.num : 0;
    },
    // ======================================
    // 自动存读档系统（可扩展）
    // ======================================
    /**
     * 自动存档：返回主界面时调用
     * @param {Object} extraData - 游戏内临时数据（当前地图、玩家坐标等非store常驻数据）
     * @param {string} extraData.currentMap - 当前所在地图ID
     * @param {number} extraData.playerX - 玩家X坐标
     * @param {number} extraData.playerY - 玩家Y坐标
     */
    autoSave(extraData = {}) {
      const saveData = {
        version: 1, // 存档版本号，后续版本更新可做兼容迁移
        saveTime: Date.now(),
        data: {},
      };

      // 自动收集配置路径下的所有store数据，深拷贝避免引用问题
      AUTO_SAVE_PATHS.forEach(path => {
        const keys = path.split('.');
        let target = this;
        for (const key of keys) {
          if (target == null) break;
          target = target[key];
        }
        if (target !== undefined) {
          saveData.data[path] = JSON.parse(JSON.stringify(target));
        }
      });

      // 合并游戏内临时数据
      Object.assign(saveData.data, extraData);

      // 存入本地存储
      setStorage('auto_save', saveData);
      console.log('[自动存档] 成功，存档时间：', new Date(saveData.saveTime).toLocaleString());
    },

    /**
     * 自动读档：开始游戏时调用
     * @returns {Object|null} 游戏初始化需要的临时数据（地图、坐标等），无存档返回null
     */
    autoLoad() {
      const saveData = getStorage('auto_save');
      if (!saveData || !saveData.data) {
        console.log('[自动读档] 无存档，开始新游戏');
        return null;
      }

      // 版本兼容处理，后续版本可在这里添加旧存档迁移逻辑
      if (saveData.version !== 1) {
        console.warn('[自动读档] 存档版本不兼容，跳过读取');
        return null;
      }

      // 自动还原配置路径下的所有store数据
      Object.entries(saveData.data).forEach(([path, value]) => {
        // 只还原配置里的store路径，跳过临时数据
        if (AUTO_SAVE_PATHS.includes(path)) {
          const keys = path.split('.');
          let target = this;
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (target[key] == null) {
              target[key] = {};
            }
            target = target[key];
          }
          target[keys[keys.length - 1]] = value;
        }
      });

      console.log('[自动读档] 成功，存档时间：', new Date(saveData.saveTime).toLocaleString());
      // 返回游戏初始化需要的临时数据
      return {
        currentMap: saveData.data.currentMap,
        playerX: saveData.data.playerX,
        playerY: saveData.data.playerY,
        playerDirection: saveData.data.playerDirection,
        npcDirections: saveData.data.npcDirections,
        saveTime: saveData.saveTime,
      };
    },

    /**
     * 检查是否存在自动存档
     */
    hasAutoSave() {
      return !!getStorage('auto_save');
    },

    /**
     * 删除自动存档（开始新游戏时调用）
     */
    deleteAutoSave() {
      setStorage('auto_save', null);
      console.log('[自动存档] 已删除');
    },
    // 音乐播放
    getSoundUrl(name) {
      return new URL(`../music/${name}.mp3`, import.meta.url).href
    },
    playSound(name, loop = false, volume = this.volume) {  // ✅ 默认音量为1
      // 检查是否有同名音乐，无论是否播放中
      const hasSameName = this.SoundArr.some(s => s === name);
      if (hasSameName && name !== "clickS") {
        console.log(`音乐 "${name}" 已存在，跳过播放。`);
        return;
      }
      // 播放新的音乐
      const sound = new Howl({
        src: [this.getSoundUrl(name)],
        volume,  // ✅ 使用传入或默认的音量
        loop,
        onplay: () => {
          this.playingSounds.push(sound);
          this.SoundArr.push(name);
        },
        onend: () => {
          this.playingSounds = this.playingSounds.filter(s => s !== sound);
          this.SoundArr = this.SoundArr.filter(s => s !== name);
        }
      });
      sound.play();
    },
    // 停止所有音乐
    stopAllSounds() {
      this.playingSounds.forEach(sound => {
        sound.stop()
      })
      this.SoundArr = []
      this.playingSounds = []
    },
    // 完成任务步骤
    completeTaskStep(taskId, stepId) {
      const allTasks = this.allTasks
      const taskList = [...allTasks.mainTasks, ...allTasks.sideTasks]
      const task = taskList.find(t => t.id === taskId)

      if (!task) return false

      const step = task.steps.find(s => s.id === stepId)
      if (!step || step.isCompleted) return false

      step.isCompleted = true

      // 检查是否所有步骤都完成了
      const allCompleted = task.steps.every(s => s.isCompleted)
      if (allCompleted) {
        task.isCompleted = true
      }

      return { stepCompleted: true, taskCompleted: allCompleted }
    },
    // 获取当前进行中的任务
    getActiveTasks(type = 'all') {
      const allTasks = this.allTasks
      if (type === 'main') {
        return allTasks.mainTasks.filter(t => !t.isCompleted)
      } else if (type === 'side') {
        return allTasks.sideTasks.filter(t => !t.isCompleted)
      }
      return [...allTasks.mainTasks, ...allTasks.sideTasks].filter(t => !t.isCompleted)
    },
    // 获取已完成的任务
    getCompletedTasks(type = 'all') {
      const allTasks = this.allTasks
      if (type === 'main') {
        return allTasks.mainTasks.filter(t => t.isCompleted)
      } else if (type === 'side') {
        return allTasks.sideTasks.filter(t => t.isCompleted)
      }
      return [...allTasks.mainTasks, ...allTasks.sideTasks].filter(t => t.isCompleted)
    },
    // 添加新任务
    addTask(taskData, type = 'side') {
      const newTask = {
        id: Date.now(),
        name: taskData.name || '新任务',
        type: type,
        description: taskData.description || '',
        icon: taskData.icon || '',
        isCompleted: false,
        currentStep: 0,
        steps: taskData.steps || []
      }

      if (type === 'main') {
        this.allTasks.mainTasks.push(newTask)
      } else {
        this.allTasks.sideTasks.push(newTask)
      }

      return newTask
    },
    // 增加NPC好感度
    addNpcAffection(npcImg, amount) {
      const npc = this.pixi.npcSelectList.find(n => n.img === npcImg)
      if (!npc) return false

      npc.affection = Math.min(100, Math.max(0, npc.affection + amount))

      // 检查并解锁达到好感度要求的背景故事
      if (npc.backstories && Array.isArray(npc.backstories)) {
        npc.backstories.forEach(story => {
          if (!story.unlocked && npc.affection >= story.unlockAffection) {
            story.unlocked = true
          }
        })
      }

      return npc.affection
    },
    // 解锁NPC某段背景故事
    unlockNpcBackstory(npcImg, storyId) {
      const npc = this.pixi.npcSelectList.find(n => n.img === npcImg)
      if (!npc || !npc.backstories) return false

      const story = npc.backstories.find(s => s.id === storyId)
      if (story) {
        story.unlocked = true
        return true
      }
      return false
    },
    // 获取NPC好感度等级文字
    getAffectionLevel(affection) {
      if (affection >= 90) return '挚友'
      if (affection >= 70) return '亲密'
      if (affection >= 50) return '友好'
      if (affection >= 25) return '熟悉'
      return '陌生'
    },
    // 获取NPC信息
    getNpcInfo(npcImg) {
      return this.pixi.npcSelectList.find(n => n.img === npcImg) || null
    },

    // ========== 对话系统相关方法 ==========
    
    /**
     * 设置对话标记
     */
    setDialogueFlag(key, value = true) {
      this.pixi.dialogueFlags[key] = value
    },

    /**
     * 获取对话标记
     */
    getDialogueFlag(key) {
      return this.pixi.dialogueFlags?.[key] || false
    },

    /**
     * 记录对话选择
     */
    recordDialogueChoice(dialogueId, optionIndex, optionText) {
      this.pixi.choiceHistory.push({
        dialogueId,
        optionIndex,
        optionText,
        timestamp: Date.now()
      })
    },

    /**
     * 检查是否选择过某个对话选项
     */
    hasChosenOption(dialogueId, optionIndex) {
      return this.pixi.choiceHistory?.some(
        c => c.dialogueId === dialogueId && c.optionIndex === optionIndex
      ) || false
    },

    /**
     * 标记对话完成
     */
    markDialogueComplete(dialogueId) {
      this.pixi.dialogueProgress[dialogueId] = {
        completed: true,
        completedAt: Date.now()
      }
    },

    /**
     * 检查对话是否完成
     */
    isDialogueComplete(dialogueId) {
      return this.pixi.dialogueProgress?.[dialogueId]?.completed || false
    },

    /**
     * 获取对话存档数据
     */
    getDialogueSaveData() {
      return {
        dialogueFlags: { ...this.pixi.dialogueFlags },
        choiceHistory: [...this.pixi.choiceHistory],
        dialogueProgress: { ...this.pixi.dialogueProgress }
      }
    },

    /**
     * 加载对话存档数据
     */
    loadDialogueSaveData(saveData) {
      if (!saveData) return
      
      if (saveData.dialogueFlags) {
        this.pixi.dialogueFlags = { ...saveData.dialogueFlags }
      }
      if (saveData.choiceHistory) {
        this.pixi.choiceHistory = [...saveData.choiceHistory]
      }
      if (saveData.dialogueProgress) {
        this.pixi.dialogueProgress = { ...saveData.dialogueProgress }
      }
    },

    /**
     * 显示对话
     */
    showDialogue() {
      this.pixi.duihua = true
    },

    /**
     * 隐藏对话
     */
    hideDialogue() {
      this.pixi.duihua = false
    },

    // ========== 对话系统方法结束 ==========
    //技能加点
    levelUpSkill(index) {
      if (this.skillData.points > 0) {
        this.skillData.list[index].level++
        this.skillData.points--
      }
    },

    /**
     * 检查是否已激活某个天赋
     */
    hasTalent(talentId) {
      return this.pixi.player.activatedTalents?.includes(talentId) || false
    },

    /**
     * 激活天赋
     */
    activateTalent(talentId) {
      const talent = this.talentConfig.find(t => t.id === talentId)
      if (!talent) return false

      // 检查是否已激活
      if (this.hasTalent(talentId)) {
        ElMessText("该天赋已激活", "warning")
        return false
      }

      // 检查天赋点是否足够
      if (this.pixi.player.talentPoints < talent.cost) {
        ElMessText("天赋点不足", "warning")
        return false
      }

      // 扣除天赋点
      this.pixi.player.talentPoints -= talent.cost

      // 添加到已激活列表
      if (!this.pixi.player.activatedTalents) {
        this.pixi.player.activatedTalents = []
      }
      this.pixi.player.activatedTalents.push(talentId)

      ElMessText(`激活天赋：${talent.name}`, "success")
      return true
    },

    /**
     * 计算应该拥有的天赋点（根据等级）
     * 初始1点，1/5/10/15/20级循环获得
     */
    calculateTalentPoints(level) {
      if (level < 1) return 0

      // 初始1点
      let points = 1

      // 每5级获得1点（5, 10, 15, 20, 25...）
      points += Math.floor(level / 5)

      return points
    },

    /**
     * 升级时检查是否获得新的天赋点
     */
    checkTalentPointGain(oldLevel, newLevel) {
      const oldPoints = this.calculateTalentPoints(oldLevel)
      const newPoints = this.calculateTalentPoints(newLevel)
      const gained = newPoints - oldPoints

      if (gained > 0) {
        this.pixi.player.talentPoints += gained
        console.log(`[天赋系统] 等级提升，获得 ${gained} 点天赋点`)
        ElMessText(`获得 ${gained} 点天赋点！`, "success")
      }

      return gained
    },

    /**
     * 获取所有已激活的天赋
     */
    getActivatedTalents() {
      const activated = this.pixi.player.activatedTalents || []
      return this.talentConfig.filter(t => activated.includes(t.id))
    },
    // ======================================
    // 🔥 等级经验系统
    // ======================================
    /**
     * 增加经验值，自动处理升级
     * @param {number} expAmount - 获得的经验值
     * @returns {Object} 升级信息 { leveledUp: boolean, levelsGained: number, oldLevel: number, newLevel: number }
     */
    addExp(expAmount) {
      const player = this.pixi.player;
      const oldLevel = player.Level;
      let levelsGained = 0;

      // 增加经验
      player.exp += expAmount;
      console.log(`[经验系统] 获得 ${expAmount} 经验，当前经验：${player.exp}/${player.maxExp}`);

      // 检查是否升级（可能连升多级）
      while (player.exp >= player.maxExp) {
        player.exp -= player.maxExp;
        this._performLevelUp();
        levelsGained++;

        // 防止无限循环（设置等级上限）
        if (player.Level >= 100) {
          player.exp = player.maxExp;
          break;
        }
      }

      // 更新身份文字中的等级显示
      this._updateShenfenText();

      const result = {
        leveledUp: levelsGained > 0,
        levelsGained,
        oldLevel,
        newLevel: player.Level
      };

      if (levelsGained > 0) {
        console.log(`[经验系统] 升级了！从 Lv.${oldLevel} 升到 Lv.${player.Level}，共升了 ${levelsGained} 级`);

        // 🔥 检查是否获得天赋点
        this.checkTalentPointGain(oldLevel, player.Level);
      }

      return result;
    },

    /**
     * 执行一次升级（内部方法）
     */
    _performLevelUp() {
      const player = this.pixi.player;
      const juese = player.juese;

      // 等级+1
      player.Level += 1;

      // 属性提升（百分比增长）
      const hpGrowth = 16;      // 最大生命 16
      const atkGrowth = 5;     // 攻击力 +5
      const armorGrowth = 3;   // 护甲 +3

      // 提升基础属性
      juese.maxHp = Math.floor(juese.maxHp + hpGrowth);
      juese.baseAttack = Math.floor(juese.baseAttack + atkGrowth);
      juese.baseArmor = Math.floor(juese.baseArmor + armorGrowth);
      // 同步当前属性为基础属性（战斗结束后重置）
      juese.attack = juese.baseAttack;
      juese.armor = juese.baseArmor;


      // 最大经验指数增长（*1.15）
      player.maxExp = Math.floor(50 + player.maxExp * 1.15);

      console.log(`[经验系统] 升级到 Lv.${player.Level}，最大经验：${player.maxExp}`);
      console.log(`[经验系统] 属性提升：生命${juese.maxHp} 攻击${juese.baseAttack} 护甲${juese.baseArmor} 速度${juese.baseSpeed}`);
    },

    /**
     * 更新身份文字中的等级显示
     */
    _updateShenfenText() {
      const player = this.pixi.player;
      player.shenfen = `身份：奥米集团 <b class="text-#F56C6C">LV.${player.Level}</b> 探索者`;
    },
    // 重置所有属性（新游戏时调用）
    resetUser() {
      // 删除自动存档
      this.deleteAutoSave();

      // 重置玩家数据
      this.pixi.player = {
        playerHand: ['射击', '激光'],
        CARD_DATA: JSON.parse(JSON.stringify(this.pixi.player.CARD_DATA)), // 保留卡牌配置
        juese: {
          name: '主角',
          hp: 200,
          maxHp: 200,
          mp: 2,
          maxMp: 6,
          baseArmor: 30,
          baseAttack: 100,
          baseSpeed: 136,
          baseLuck: 50,
          armor: 30,
          attack: 100,
          speed: 136,
          luck: 50,
          camp: 'player'
        },
        shenfen: `身份：奥米集团 <b class="text-#F56C6C">LV.1</b> 探索者`,
        exp: 0,
        maxExp: 50,
        Level: 1,
        talentPoints: 99, // 天赋点
        activatedTalents: [], // 已激活的天赋
      };

      // 重置战斗和UI状态
      this.pixi.fight = false;
      this.pixi.gameUi = false;
      this.pixi.setting = 0;
      this.pixi.isPaused = false;

      // 重置游戏进度
      this.youxi = 0;
      this.youxi01 = 0;
      this.currentNodeKey = "";
      this.textData = null;
      this.duihua = true;
      this.selectBoolean = false;
      this.selecttextNum = 0;
      this.searchContent = [];
      this.text = "";
      this.text_boolean = false;
      this.textYincang = false;
      this.kuaijin = false;
      this.backgroundImage = "";
      this.animations = [];
      this.menu = 1;
      this.menuSelect = 0;

      // 重置物品栏和抽卡记录
      this.inventory = [{
        name: "灵力晶核",
        num: 999,
        img: "jinghe",
        miaoshu: "蕴含强大灵力的晶核，可用于抽取卡牌。",
        sell: 10,
        status: "material",
        color: "#8B5CF6"
      }];
      this.gachaHistory = [];
      this.savejson = [];
      this.messages = [];

      // 重置任务列表
      this.allTasks = {
        mainTasks: [
          {
            id: 1,
            name: "黑客入侵",
            type: "main",
            description: "你的主要目的：窃取“苍穹”设施的安全最高权限后将权限交给萨米，完成你的复仇计划。",
            isCompleted: false,
            currentStep: 0,
            steps: [
              { id: 1, content: "进入实验体培育部门，获取主任的信任", isCompleted: false },
              { id: 2, content: "选择负责的实验体，开始培育工作", isCompleted: false },
              { id: 3, content: "寻找机会入侵主任的设备，植入病毒程序", isCompleted: false },
              { id: 4, content: "获取苍穹设施的最高安全权限", isCompleted: false },
              { id: 5, content: "将权限数据交给萨米", isCompleted: false }
            ]
          },
          {
            id: 2,
            name: "实验体挑选",
            type: "main",
            description: "通过平板打开消息，在实验体培育部群聊中点击网址链接选择想要培育的实验体。",
            isCompleted: true,
            currentStep: 4,
            steps: [
              { id: 1, content: "打开平板，查看消息应用", isCompleted: false },
              { id: 2, content: "进入实验体培育部群聊", isCompleted: false },
              { id: 3, content: "点击主任发送的网址链接", isCompleted: false },
              { id: 4, content: "选择你想要负责培育的实验体", isCompleted: false }
            ]
          }
        ],
        sideTasks: [
          {
            id: 101,
            name: "了解设施环境",
            type: "side",
            description: "熟悉苍穹设施的布局和各个部门的位置，为后续行动做准备。",
            isCompleted: false,
            currentStep: 0,
            steps: [
              { id: 1, content: "探索实验体培育部门", isCompleted: false },
              { id: 2, content: "找到员工休息区", isCompleted: false },
              { id: 3, content: "了解设施的安全监控分布", isCompleted: false }
            ]
          },
          {
            id: 102,
            name: "建立人脉",
            type: "side",
            description: "与同事建立良好关系，获取更多有用的信息。",
            isCompleted: false,
            currentStep: 0,
            steps: [
              { id: 1, content: "与西奥交谈", isCompleted: false },
              { id: 2, content: "与法伯尔交谈", isCompleted: false },
              { id: 3, content: "与马库斯交谈", isCompleted: false }
            ]
          }
        ]
      };

      // 重置NPC好感度
      this.pixi.npcSelectList.forEach(npc => {
        npc.affection = 100;
        npc.backstories.forEach(story => {
          story.unlocked = story.unlockAffection === 0;
        });
      });

      console.log('[重置] 游戏数据已重置为初始状态');
    },
  },
  persist: {
    // 按需存储 state/ref
    // 修改存储中使用的键名称，默认为当前 Store的 id
    key: "storekey",
    // 使用 localStorage，关闭页面后数据仍在（sessionStorage关闭就没了）
    storage: window.localStorage,
    // 🎉按需持久化，只持久化设置相关，游戏进度用autoSave系统
    paths: ["volume", "text_speed", "textSize"],
  },
})