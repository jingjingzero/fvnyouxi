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
        gameUi: false,//是否隐藏ui
        characters: [],//人物动画
        setting: 0,
        npcDataList: [],//所有地图NPC数据
        mapDataList: [],//地图数据
        activePlayer: null,
        playerInstance: null,//主角实例
        npcInstance: null,
        npcSelectList: [
          { value: "jinglingQ", tips: "精灵" },
          { value: "two219", tips: "白猫" },
          { value: "huli", tips: "狐狸" },
          { value: "jinmao", tips: "金毛" },
          { value: "yu", tips: "鱼" },
          { value: "linen", tips: "主角" }
        ],//可以选择的人物
        player: {
          playerHand: ['射击', '无人机', '影分身', '洞察', '激光', '聚灵'],
          CARD_DATA: {
            射击: {
              skin: 'Shoot',
              color: '#ff4757',
              num: 7,
              maxCooldown: 0,
              cost: 0,
              limitPerTurn: 1,
              evoOptions: ['弹夹升级', '概率暴击', '快速换弹', '破甲'],
              defaultEvos: ['弹夹升级', '快速换弹', '概率暴击'],//已进化
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
              defaultEvos: ['击杀返还', '超频释放'],
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
              num: 1,
              evoOptions: ['毒素紊乱', '熟能生巧', '死亡返还', '虚弱'],
              defaultEvos: ['毒素紊乱', '熟能生巧', '死亡返还', '虚弱'],
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
              num: 1,
              evoOptions: ['超强续航', '自动部署', '系统升级'],
              defaultEvos: ['机群效应'],
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
              num: 1,
              evoOptions: ['生命提升', '自动召唤', '强力分裂', '协同作战'],
              defaultEvos: ['协同作战'],
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
              num: 1,
              evoOptions: ['快速使用', '效果强化', '汲灵秘术', '灵力分享'],
              defaultEvos: ['快速使用', '汲灵秘术', '效果强化'],
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
              num: 1,
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
              num: 1,
              animDelay: 500,
              initialCooldown: 1,//1
              evoOptions: ['效果增强', '乘胜追击', '不安', '看透'],
              defaultEvos: ['效果增强', '看透', '不安', '乘胜追击'],
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
              num: 1,
              initialCooldown: 4,
              evoOptions: ['效果增强', '快速启动', '窒息', '扩散'],
              defaultEvos: ['效果增强', '快速启动', '窒息', '扩散'],
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
            hp: 5000,
            maxHp: 5000,
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
          maxExp: 200,
          Level: 20,//等级
        },
        duihua: true
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
      name: "",//姓名
      text_boolean: false,//文字是否在播放中
      bg_img: false,
      face_img: null,//表情图片
      menu: 1,//菜单
      menuSelect: 0,//菜单选择
      menuText: "",//菜单存储的字
      savejson: [],//存档
      borderGradient: "linear-gradient(45deg, #3b82f6, #ffffff)",//文本框渐变色
      selectedOptionShow: false,//选项
      selectedOption: [],//选项
      selectIndexNum: false,//选项是否要删除
      selectedOptionAble: false,//选项可触碰
      messages: [],//历史记录 
      inventory: [ {
        name: "灵力晶核",
        num: 20,
            img: "jinghe",
        miaoshu: "蕴含强大灵力的晶核，可用于抽取卡牌。",
        sell: 10,
        status: "material",
        color: "#8B5CF6"
      },],  // 物品列表
      gachaHistory: [], // 抽卡历史记录
      wupingShow: 1,//是否显示物品图标 ， 0是不显示，1是只显示图片，2是显示物品栏，3是战斗状态
      saveData: "",//存档数据
      playingSounds: [],//音乐数组
      SoundArr: [],
      volume: 0.6, // 默认音量 60%
      text_speed: 96,//1快速，2正常，3慢速
      textSize: 18,//文字大小
      fullBodyImages: [],//立绘
      visible: 0,  // 控制黑幕和眼皮的显示与隐藏
      currentPage: 1,//分页当前页数
      textData: null,//文本数据
      kuaijin: false,//是否快进中
      heipingWenzi: "",//黑屏文字
      shoujitishi: { con1: null },//手机提示
      qufenxuanxiang: false,//区别选项
      xuanzeList: [],//选项路线
      zhujue01: {
        sex: 0,//0代表女性 1代表男性
        personality: 0,//0代表单纯善良  1代表冷漠理智  
        name: "无"
      },
      attributes: {
        bjIndex: -1,//背景索引
      },
      skillData: {
        points: 0, // 可用技能点
        list: [
        ]
      },
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
      console.log("newItem", newItem);
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
          color: data.color || "#ffffff"
        }));

      const results = [];

      for (let i = 0; i < count; i++) {
        // 所有卡牌概率相同，随机抽取
        const selectedCard = allCards[Math.floor(Math.random() * allCards.length)];

        // 添加到物品栏
        this.addCardToInventory(selectedCard.name, 1);

        results.push({
          name: selectedCard.name,
          color: selectedCard.color
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
    //新的一天
    newDay() {

    },
    //存档
    async cundang(index) {
      if (index === 1) {
        console.log(" user.youxi=", this.youxi);
        const info = {
          data: {
            zhujue01: this.zhujue01,
            youxi: this.youxi, //游戏进度
            youxi01: this.youxi01,//聊天进度
            name: this.name, //姓名
            text: this.text, //文本描述
            selectBoolean: this.selectBoolean, //是否处于探索状态
            backgroundImage: this.backgroundImage,

            face_img: this.face_img, //当前头像
            bg_img: this.bg_img, //背景图片
            animations: this.animations,//人物立绘
            selectedOptionShow: this.selectedOptionShow, //选项是否显示
            inventory: this.inventory, //我的物品
            selectedOption: this.selectedOption, //当前选项
            borderGradient: this.borderGradient, //边框颜色
            fullBodyImages: this.fullBodyImages, //立绘
            textYincang: this.textYincang,
            selectedOptionAble: this.selectedOptionAble,
            textData: this.textData, //文本内容
            xuanzeList: this.xuanzeList, //选项
            currentNodeKey: this.currentNodeKey, //节点
            attributes: this.attributes, //属性
          },
          time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        };
        await setStorage("userInfo", {
          data: info.data,
          time: info.time,
        });
        ElMessText("存档成功");
      } else {
        //读档
        const userInfo = getStorage("userInfo");
        console.log("userInfo", userInfo);
        const shujuData = userInfo.data;
        if (shujuData !== undefined) {
          this.text_boolean = true;
          this.stopAllSounds();
          this.menu = 0;
          const data = shujuData;
          console.log("data=", data);
          this.name = data.name;
          this.youxi = data.youxi;
          this.youxi01 = data.youxi01
          this.bg_img = data.bg_img;
          this.backgroundImage = data.bg_img
          this.zhujue01 = data.zhujue01,
            this.inventory = data.inventory; //我的物品
          this.backgroundImage = new URL(`../assets/images/${this.bg_img}.webp`, import.meta.url).href;
          this.animations = data.animations //立绘
          this.fullBodyImages = data.fullBodyImages //立绘
          this.text = data.text
          this.textYincang = data.textYincang
          this.currentNodeKey = data.currentNodeKey
          this.selectedOptionShow = data.selectedOptionShow
          this.selectedOption = data.selectedOption
          this.selectedOptionAble = data.selectedOptionAble
          this.attributes = data.attributes
          //------------
          if (data.attributes.juqing === undefined) {
            this.attributes.juqing = []
          }
          this.attributes.version = "1.0"
          setTimeout(() => {
            this.text_boolean = false;
          }, 250);
        }
      }
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
    //技能加点
    levelUpSkill(index) {
      if (this.skillData.points > 0) {
        this.skillData.list[index].level++
        this.skillData.points--
      }
    },
    // 重置所有属性
    resetUser() {
      this.youxi = 0;
      this.youxi01 = 0;
      this.currentNodeKey = "start01"
      this.menu = 0;
      this.borderGradient = "linear-gradient(45deg, #3b82f6, #ffffff)";//文本框渐变色
      this.selectBoolean = false;
      this.selectedOptionShow = false;
      this.messages = []; // 清除历史记录
      // this.animations = [
      //   {
      //     id: 1,
      //     show: true,
      //     img: "http://localhost:8081/src/assets/donghua/zhujue1.webm",
      //     x: 0,
      //     y: 50,
      //     daxiao: 0
      //   },
      //   {
      //     id: 2,
      //     show: true,
      //     img: "http://localhost:8081/src/assets/donghua/zhujue2.webm",
      //     x: 18,
      //     y: 0,
      //     daxiao: 0,
      //     isSpeaking: false
      //   },
      // ]
      this.attributes = {
        baise: undefined,
        HPxushi: undefined,//黑屏叙事
        jueseDonghua: undefined,
        dangqianrenwu: "电脑",
        shiwu: 0,
        contacts: [
          {
            name: "萨米",
            src: "touxiang1.png",
            xiaoxi: "我会的，麻烦你了。",
            messages: [
              { text: "2013 年 8 月 7 日" },
              { user: "萨米", text: "你打算什么时候行动？", src: "touxiang1.png" },
              { user: "琳恩", text: "这个安全系统很难破解，我会尽量找其他办法的，再给我点时间。", src: "mytouxiang.png" },
              { user: "萨米", text: "可以，有什么困难随时联系我，希望你尽早能完成这项任务。", src: "touxiang1.png" },
              { user: "琳恩", text: "我了解的，毕竟也是为了我自己。", src: "mytouxiang.png" },
              { user: "琳恩", text: "你可以将我调去培育部门吗？那个部门的主任拥有最高权限，如果我能将病毒植入她的设备的话…", src: "mytouxiang.png" },
              { user: "萨米", text: "……", src: "touxiang1.png" },
              { user: "萨米", text: "行，我希望你能对得起我对你的投资。", src: "touxiang1.png" },
              { user: "琳恩", text: "我会的，麻烦你了。", src: "mytouxiang.png" },
            ], tips: false
          },
          {
            name: "实验体培育部",
            qun: [{
              name: "主任",
              src: "touxiangzhuren.webp"
            }, {
              name: "西奥",
              src: "touxiangxiao.webp"
            }, {
              name: "法伯尔",
              src: "touxiangfaboer.webp"
            }, {
              name: "马库斯",
              src: "touxiangmakusi.webp"
            }, {
              name: "琳恩",
              src: "mytouxiang.png"
            }],
            src: "touxiang2.png",
            xiaoxi: "收到",
            messages: [
              { text: "2013 年 8 月 13 日" },
              { text: "琳恩已加入群聊" },
              { user: "主任", text: "@全体成员 大家欢迎琳恩！她之前在群星一号科研设施工作，最近调岗到苍穹工作，以后就是部门的一员了。", src: "touxiangzhuren.webp" },
              { user: "西奥", text: "欢迎。", src: "touxiangxiao.webp" },
              { user: "法伯尔", text: "欢迎。", src: "touxiangfaboer.webp" },
              { user: "马库斯", text: "欢迎。", src: "touxiangmakusi.webp" },
              { user: "琳恩", text: "谢谢大家，以后请多指教。", src: "mytouxiang.png" },
              { user: "法伯尔", text: "群星的员工怎么会来到苍穹工作？", src: "touxiangfaboer.webp" },
              { user: "西奥", text: "我记得，能进群星的都是能力特别突出的人，而且薪资非常吓人。", src: "touxiangxiao.webp" },
              { user: "法伯尔", text: "工资很高吗？真羡慕。", src: "touxiangfaboer.webp" },
              { user: "琳恩", text: "不是这样的，是因为工作出了失误，才被调过来的。", src: "mytouxiang.png" },
              { user: "西奥", text: "那可真糟糕，有什么问题可以问我，我会尽量帮你的。", src: "touxiangxiao.webp" },
              { user: "琳恩", text: "谢谢。", src: "mytouxiang.png" },
              { text: "2013 年 8 月 16 日" },
              { user: "主任", text: "@全体成员 明日实验体将正式送入苍穹基地，大家准备好培育工作。", src: "touxiangzhuren.webp" },
              { user: "主任", text: "补充：实验体选择顺序已确定 琳恩>西奥>马库斯>法伯尔。请各位研究员于今日18:00前，通过平板选择好自己想要负责的实验体。", src: "touxiangzhuren.webp" },
              {
                user: "主任",
                text: `网址链接,<br class='indent-line' />
                       <b class='text-blue-600' ontouchstart="handleLinkTouch(1)">
                         https://192.168.128.01:8081/#/AoMi2031PeiYu/index
                       </b>`,
                src: "touxiangzhuren.webp",
              },
              { user: "琳恩", text: "收到。", src: "mytouxiang.png" },
              { user: "西奥", text: "收到。", src: "touxiangxiao.webp" },
              { user: "法伯尔", text: "收到。", src: "touxiangfaboer.webp" },
              { user: "马库斯", text: "收到。", src: "touxiangmakusi.webp" },
            ], tips: true
          },
          {
            name: "奥米联合银行",
            src: "touxiang3.webp",
            xiaoxi: "2013 年 8 月 15 日",
            messages: [
              { text: "2013 年 8 月 15 日" },
              {
                user: "奥米联合银行",
                text: `
                您好！根据您与 奥米联合银行 签订的《个人贷款自动还款协议》，系统已于今日（2013 年 8 月 15 日）完成本月工资到账与自动还贷操作，具体信息如下：
                <br class='indent-line' />本月工资到账金额：58000
                <br class='indent-line' />自动划扣还贷金额：58000
                <br class='indent-line' />贷款当前剩余本金：<span class="text-jinggao">3680000</span>
                <br class='indent-line' />若您需查询详细还款明细、调整还款计划，或对本次划扣有疑问，可通过奥米集团官网 “金融服务 - 个人贷款” 专区咨询。
                <br class='indent-line' />奥米联合银行
                <br class='indent-line' />2013 年 8 月 15 日
                `,
                src: "touxiang3.webp"
              },
            ], tips: false
          },
        ],//短信
        news: [
          {
            content: `
              <p>今日，奥米集团正式宣布，旗下重点建设的第五十号实验设施 “苍穹” 已全面竣工并启动试运行。这座高新科技研究中心，耗时三年打造，总投入超 1.2 亿元。</p>
              <p>据奥米集团科研负责人披露，“苍穹” 设施搭载国际前沿生物实验系统，重点研究基因编辑与神经科学。</p>
            `,
            name: "科技快讯",
            title: "奥米集团 “苍穹” 设施竣工试运行 聚焦基因与神经研究",
            time: "2013年5月20日",
            src: "new1"
          },
          {
            content: `
              <p>一张匿名举报的照片近日登上了热搜，画面中疑似出现幼体实验场景，直指奥米集团新建的 “苍穹” 实验设施涉嫌开展人体实验。</p>
              <p>据接收举报的媒体透露，照片由匿名人士通过加密邮件发送，画面因分辨率限制略显模糊，但可辨识出类似实验舱的设备及疑似幼体的身影。举报事件曝光后，数十家媒体记者第一时间介入调查，试图联系匿名举报人核实细节，但对方预留的联系方式已失效，无法找到该名举报人。</p>
              <p>面对汹涌舆情，奥米集团于今日召开紧急新闻发布会作出回应。科研事业部负责人在会上展示了所谓 “技术鉴定报告”，称经第三方机构检测，举报照片存在明显像素篡改痕迹，属于 “恶意 PS 的伪造素材”。“‘苍穹’设施聚焦基因编辑与神经科学基础研究，严格遵循国际生物伦理规范，从未开展任何人体实验。” 该负责人强调，此次事件是 “针对集团的恶意诬告”，已委托律师事务所收集证据，将追究造谣者法律责任。</p>
              <p>截至发稿，已有多地科研伦理学者联名呼吁监管部门介入，要求对 “苍穹” 设施开展全面核查，公开实验项目清单及伦理审查文件。</p>
              <p>目前，相关监管部门尚未就此事作出明确表态。</p>
            `,
            name: "科技快讯",
            title: "奥米集团遭举报涉嫌幼体实验",
            time: "2013年6月27日",
            src: "new2"
          },
          {
            content: `
              <p>深陷 “幼体实验” 争议的奥米集团再爆风波：据知情人士披露，针对其 “苍穹” 实验设施的合规性审查要求已由国家监管部门正式提出，但奥米集团以 “涉及核心技术机密” 为由明确拒绝配合。</p>
              <p>截至发稿，国家监管部门尚未就此事作出公开回应，这种 “沉默态度” 迅速引发舆论场连锁反应。社交平台上，# 奥米集团拒绝监管 #话题阅读量短时间内突破 2 亿，</p>
              <p>有网民直言 “奥米集团敢公然抗命，难道连国家都无法抗衡”，担忧其凭借技术与资本优势成为 “法外之地”；也有声音猜测 “官方或在酝酿更严厉的核查措施，沉默是为后续行动留有余地”。</p>
              <p>目前，奥米集团未就拒绝审查的决定补充说明，监管部门的后续动作仍待观察。</p>
            `,
            name: "科技快讯",
            title: "奥米集团拒绝国家监管审查 官方沉默引舆论热议",
            time: "2013年8月10日",
            src: "new3"
          }
        ],//新闻     
        userApps: [
          {
            src: "qunliao.png",
            name: "消息",
            id: 1,
            tips: true
          },
          {
            src: "news.png",
            name: "新闻",
            id: 2,
            tips: false
          },
          {
            src: "beiwanglu.png",
            name: "备忘录",
            id: 3,
            tips: false
          },
        ],//应用程序
        jingshenData: {
          chushiPower: 20,//初始精神力
          SpiritPower: 20,//精神力
          Pressure: 25,//压力值
          mubianPower: 15,//目标提升幅度
        },//精神属性
        bjWuping: [
          {
            name: "shiyanshi.webp",
            boxes: [
              { x: 0.942, y: 0.254, width: 0.06, height: 0.1, name: "小鸟", tip: "(这是琳恩最喜欢的画。)" },
              { x: 0.826, y: 0.324, width: 0.125, height: 0.14, name: "电脑", tip: "(琳恩日常工作所用的电脑。)", liang: true },
              { x: 0.236, y: 0.406, width: 0.11, height: 0.4, name: "房门", tip: "(这是实验体的房间。)" },
              { x: 0.404, y: 0.559, width: 0.09, height: 0.18, name: "花盆", tip: "(平平无奇的装饰花盆，花不是真的，不过不用打理，是个不错的装饰品。)" },
              { x: 0.6, y: 0.245, width: 0.17, height: 0.22, name: "电视机", tip: "(一台电视机而已，并没有想看的节目。)" },
              { x: 0.986, y: 0.525, width: 0.05, height: 0.11, name: "垃圾桶", tip: "(垃圾桶是必须的不是吗？)" },
              { x: 0.825, y: 0.21, width: 0.05, height: 0.11, name: "信号", show: true },
              { x: 0.25, y: 0.16, width: 0.05, height: 0.11, name: "信号", show: false }
            ]
          }
        ],//背景物品
        DH02Cur: undefined,
        bjIndex: -1,//背景索引
        DateYear: new Date(2013, 7, 16),//当前日期   
        wujiemian: false,//无界面
        noCaidan: false,//开启菜单
        bgOpacity: 0,//黑色背景透明度
        liaotian: false,//聊天界面
        xiaohaoBoolean: false,//钱是否足够
        zahuopuSP: undefined,//杂货铺商品
        Day: 0,//天数
        kucun: false,//是否可以打开库存
        waichu: false,//是否可以外出
        myName: null,
        duihuaBUkejian: 0,//对话框是否不可见
        rijiNeirong: null,//日记内容
        version: "1.0",//版本
        selectStatus: [],//选择过的选项
        selectselected: [],//多选保留选项
        quanshenImg: "quanshen.webp", // 全身照片
        zahuopuSP: undefined,//杂货铺商品
        textJuxu: false,
        //人物
        Character: [{
          name: "220",//姓名
          Affinity: 0,//好感度
        }, {
          name: "219",//姓名
          Affinity: 0,//好感度
        }, {
          name: "218",//姓名
          Affinity: 0,//好感度
        }, {
          name: "217",//姓名
          Affinity: 0,//好感度
        }],
        knownPeople: [],//认识的人
        achv: [],//成就
        caoyaozhizuo: [
          {
            name: "恢复药水",
            num: 1,
            img: "zhiliaoYS.webp",
            miaoshu: "一瓶喝下能恢复伤势的药水",
            sell: 10,
            Hp: 10,
            status: "herb",
            shiyong: true,
            zhiding: true,
            need: {
              name: "草药",
              num: 5,
              odds: 25,
              failTs: 2.5,
              int: 5,//智慧加成
            }
          }, {
            name: "醒神药水",
            num: 1,
            img: "moliYS.webp",
            miaoshu: "一瓶喝下能提神醒脑的药水",
            sell: 10,
            status: "herb",
            need: {
              name: "草药",
              num: 5,
              odds: 25,
              failTs: 2.5,
              int: 5,//智慧加成
            }
          }, {
            name: "滋补药水",
            num: 1,
            img: "huashuzhi.webp",
            miaoshu: "一瓶可以给土地施肥的药水",
            sell: 5,
            status: "herb",
            need: {
              name: "草药",
              num: 4,
              odds: 40,
              failTs: 4,
              int: 8,//智慧加成
            }
          }
        ],
        chufangzhizuo: [
          {
            name: "美味的兽肉",
            num: 1,
            img: "shourou.webp",
            miaoshu: "烤熟的兽肉，美味好吃。",
            sell: 4,
            status: "food",
            need: {
              name: "兽肉",
              num: 1,
              odds: 40,
              failTs: 5,
              int: 10,//智慧加成
            }
          },
        ],
        myMana: 0,


        //任务列表
        allTasks: {
          finishedTasks: [{
            id: 1,
            name: "黑客入侵(主要目的)",
            note: "窃取“苍穹”设施的安全最高权限后将权限交给萨米。",
            src: "bingdu.png"
          }, {
            id: 2,
            name: "实验体挑选",
            note: "通过平板打开消息，在实验体培育部群聊中点击网址链接选择想要培育的实验体。"
          }],
          unfinishedTasks: []
        },
        //增益状态
        buffs: [],

        tiredness: false,
        juqing: [],
        villageShelves: [{
          name: "粗麦饼",
          num: 99,
          img: "cumaibing.webp",
          miaoshu: "用小麦磨制成的硬饼，口感粗糙，不太好吃，但能填饱肚子。",
          sell: 2,
          status: "food"
        }, {
          name: "劣质药水",
          num: 10,
          img: "yaoshui.webp",
          miaoshu: "效果微弱的药水，疗效有限。",
          Hp: 10,
          shiyong: true,
          zhiding: true,
          sell: 20,
          status: "herb"
        }, {
          name: "铁剑",
          num: 1,
          img: "changjian.webp",
          miaoshu: "一把由普通铁材打造的长剑，凯或许用得上。",
          sell: 300,
          str: 2,
          agi: 1,
          status: "equipment"
        }, {
          name: "匕首",
          num: 1,
          img: "bishou.webp",
          miaoshu: "一把由普通铁材打造的匕首，奇莫或许用得上。",
          sell: 200,
          str: 1,
          agi: 1,
          status: "equipment"
        }, {
          name: "铁杖",
          num: 1,
          img: "tiebang.webp",
          miaoshu: "一把由普通铁材打造的铁棒，戈兰或许用得上。",
          sell: 200,
          str: 2,
          status: "equipment"
        }, {
          name: "石头雕像",
          num: 1,
          img: "shitoudiaoxiang.webp",
          miaoshu: "不知名的石头雕像，目前看不出来有什么用。",
          sell: 999,
          status: "items"
        }],
        yiChuFa: false
      };
      this.fullBodyImages = []
      this.inventory = []; // 清空物品栏
      this.textData = null;
      emitter.emit("text_num");
    },
  },
  persist: {
    // 按需存储 state/ref
    // 修改存储中使用的键名称，默认为当前 Store的 id
    key: "storekey",
    // 修改为 sessionStorage，默认为 localStorage
    storage: window.sessionStorage,
    // 🎉按需持久化，默认不写会存储全部
    paths: ["savejson", "messages", "volume", "text_speed"],
  },
})