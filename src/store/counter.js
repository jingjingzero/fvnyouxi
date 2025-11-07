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
      inventory: [],  // 物品列表
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
        jueseDonghua: undefined,
        dangqianrenwu: "电脑",
        shiwu: 0,
        contacts: [
          {
            name: "萨米",
            src: "touxiang1.png",
            xiaoxi: "我只是提醒你快点行动。",
            messages: [
              { text: "2013 年 8 月 7 日" },
              { user: "萨米", text: "你打算什么时候拿到苍穹的安全权限？", src: "touxiang1.png" },
              { user: "琳恩", text: "我有自己的打算。", src: "mytouxiang.png" },
              { user: "萨米", text: "希望你知道我将你调去苍穹的意义。", src: "touxiang1.png" },
              { user: "萨米", text: "二个月内必须给我弄到，否则你入侵 “群星” 安全系统的痕迹就要暴露了。", src: "touxiang1.png" },
              { user: "琳恩", text: "那你觉得你帮我隐瞒这个罪行很轻吗？", src: "mytouxiang.png" },
              { user: "萨米", text: "我们没必要双输，完全可以双赢的，完成后你就自由了，不是很好吗？", src: "touxiang1.png" },
              { user: "琳恩", text: "知道了，别威胁我了，我会做的。", src: "mytouxiang.png" },
              { user: "萨米", text: "我只是提醒你快点行动。", src: "touxiang1.png" },
            ], tips: false
          },
          {
            name: "实验体培育部",
            src: "touxiang2.png",
            xiaoxi: "收到",
            messages: [
              { text: "2013 年 8 月 13 日" },
              { text: "琳恩已加入群聊" },
              { user: "主任", text: "@全体成员 大家欢迎琳恩！她之前是群星一号科研设施的科学家，最近调岗到苍穹工作，以后就是部门的一员了。", src: "touxiangzhuren.webp" },
              { user: "西奥", text: "欢迎。", src: "touxiangxiao.webp" },
              { user: "法伯尔", text: "欢迎。", src: "touxiangfaboer.webp" },
              { user: "马库斯", text: "欢迎。", src: "touxiangmakusi.webp" },
              { user: "琳恩", text: "谢谢大家，以后请多指教。", src: "mytouxiang.png" },
              { user: "法伯尔", text: "群星的科学家怎么会来到苍穹工作？", src: "touxiangfaboer.webp" },
              { user: "西奥", text: "我记得，能进群星的都是能力特别突出的人，而且薪资非常吓人。", src: "touxiangxiao.webp" },
              { user: "法伯尔", text: "工资很高吗？真羡慕。", src: "touxiangfaboer.webp" },
              { user: "琳恩", text: "不是这样的，是因为工作出了失误，才被调过来的。", src: "mytouxiang.png" },
              { user: "西奥", text: "那可真糟糕，有什么问题可以问我，我会尽量帮你的。", src: "touxiangxiao.webp" },
              { user: "琳恩", text: "谢谢。", src: "mytouxiang.png" },
              { text: "2013 年 8 月 20 日" },
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
              { x: 0.826, y: 0.324, width: 0.125, height: 0.14, name: "电脑", tip: "(琳恩日常工作所用的电脑。)",liang:true },
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