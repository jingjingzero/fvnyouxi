/*
 * @作者: 冯星悦
 * @Date: 2024-05-20 10:48:46
 * @LastEditTime: 2025-04-23 15:41:49
 */
import { defineStore } from "pinia"
import { Howl } from 'howler'
export const useCounterStore = defineStore('counter', {
  state: () => {
    return {
      chapterNumber: 0, //游戏章节
      youxi: 0, //游戏进程
      selectBoolean: false,//选择是否开启搜索环境
      selecttextNum: 0,//选择是否在执行中
      searchContent: [],//搜索物品
      backgroundImage: "",//背景图
      backgroundImage1:false,//背景特效图
      text: "",//文本
      name: "我",//姓名
      text_boolean: false,//文字是否在播放中
      cg_img: null,//cg图片
      cg_imgboolean: false,//cg图片开启
      bg_img: false,
      face_img: null,//表情图片
      menu: 1,//菜单
      menuSelect: 0,//菜单选择
      menuText: "",//菜单存储的字
      savejson: [],//存档
      borderGradient: 'linear-gradient(45deg, #3b82f6, #ffffff)',//文本框渐变色
      selectedOptionShow: false,//选项
      selectedOption: [],//选项
      selectIndexNum: false,//选项是否要删除
      selectedOptionAble: false,//选项可触碰
      messages: [],//历史记录 
      inventory: [],  // 物品列表
      wupingShow: 1,//是否显示物品图标 ， 0是不显示，1是只显示图片，2是显示物品栏，3是战斗状态
      saveData: "",//存档数据
      playingSounds: [],//音乐数组
      SoundArr: [],
      volume: 0.6, // 默认音量 60%
      text_speed: 94,//1快速，2正常，3慢速
      fullBodyImages: [],//立绘
      visible: 0,  // 控制黑幕和眼皮的显示与隐藏
      currentPage:1,//分页当前页数
      textData: null,//文本数据
      kuaijin:false,//是否快进中
      huituiData: null,//回退数据
      heipingWenzi:"",//黑屏文字
      attributes: {
        knowledge: [
          {
            title: '蓝月的起源',
            content: '蓝月，是赋予兽人文明与魔力的奇迹之月……',
            pages: [
              "第一页内容：蓝月初现之夜，星辰低语，兽人获得智慧。",
              "第二页内容：文明起步，蓝月议者诞生。",
              "第三页内容：失落的咏月仪式……"
            ]
          },
          {
            title: '红月异变',
            content: '红月事件带来了大规模的魔物变异，其中最可怕的是……'
          },
          {
            title: '六贤者的牺牲',
            content: '为封印魔花，泽尔以命换得一线生机……'
          }
        ],//知识
        myName: "我",//我的名字
        quanshenImg: "quanshen.png",//全身照片
        level: 1,            // 等级
        exp: 0,              // 经验值
        expRequired: 100,  //所需经验值
        maxHp: 100,          // 生命上限
        currentHp: 100,      // 当前生命
        mana: 10,            // 魔力值
        strength: 15,        // 力量
        speed: 10,           // 速度
        endurance: 100,       // 耐力
        damageReduction: 0,  // 减伤百分比，例如 0.1 表示 10%
        status: [],//选择的状态
      },
      skillData: {
        points: 0, // 可用技能点
        list: [
          // {
          //   name: '火焰弹',
          //   type: '魔法',
          //   level: 1,
          //   endurance: 150,
          //   beishu: 1.5,
          //   description: '发射一颗小型火球造成150%魔力伤害。'
          // }
        ]
      },
      fight: [],//敌人战斗
      fightReward:"",//战斗奖励
    }
  },
  getters: {
  },
  actions: {
    // 屏幕特效
    setVisible(visible) {
      console.log('visible=', visible);
      this.visible = visible;
    },
    addMessage(role, content) {
      const lastMsg = this.messages[this.messages.length - 1]

      // 如果最后一条内容与当前相同，不添加
      if (lastMsg && lastMsg.role === role && lastMsg.content === content) {
        return
      }

      this.messages.unshift({ role, content })

      // 最多保留 20 条
      if (this.messages.length > 20) {
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
    // 音乐播放
    getSoundUrl(name) {
      return new URL(`../music/${name}.mp3`, import.meta.url).href
    },
    playSound(name, loop = false) {
      // 检查是否有同名音乐，无论是否播放中
      const hasSameName = this.playingSounds.some(s => {
        const srcName = s._src.split('/').pop().replace('.mp3', '');
        return srcName === name;
      });
      if (hasSameName) {
        console.log(`音乐 "${name}" 已存在，跳过播放。`);
        return;
      }

      // 播放新的音乐
      const sound = new Howl({
        src: [this.getSoundUrl(name)],
        volume: this.volume,
        loop,
        onplay: () => {
          this.playingSounds.push(sound);
          this.SoundArr.push(name)
        },
        onend: () => {
          this.playingSounds = this.playingSounds.filter(s => s !== sound);
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
      this.youxi = 1;
      this.menu = 0;
      this.name = '我';
      this.borderGradient = 'linear-gradient(45deg, #3b82f6, #ffffff)';//文本框渐变色
      this.selectBoolean = false;
      this.cg_imgboolean = false;
      this.selectedOptionShow = false;
      this.messages = []; // 清除历史记录
      this.chapterNumber = 0
      this.attributes = {
        knowledge: [
        ], // 知识
        quanshenImg: "quanshen.png", // 全身照片
        level: 1, // 等级
        exp: 0, // 经验值
        expRequired: 100, // 所需经验值
        maxHp: 100, // 生命上限
        currentHp: 100, // 当前生命
        mana: 0, // 魔力值
        strength: 15, // 力量
        speed: 10, // 速度
        endurance: 100, // 耐力
        damageReduction: 0, // 减伤百分比
        status: [], // 选择的状态
        myName: "我",//我的名字
      };
      this.skillData = {
        points: 0, // 可用技能点
        list: [
        ]
      }
      this.fullBodyImages = []
      this.inventory = []; // 清空物品栏
    },
  },
  persist: {
    // 按需存储 state/ref
    // 修改存储中使用的键名称，默认为当前 Store的 id
    key: 'storekey',
    // 修改为 sessionStorage，默认为 localStorage
    storage: window.sessionStorage,
    // 🎉按需持久化，默认不写会存储全部
    paths: ['savejson', 'messages', 'volume', 'text_speed', 'fight'],
  },
})