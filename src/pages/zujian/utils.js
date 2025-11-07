import { useCounterStore } from "@/store/counter";
import { ElMessage } from "element-plus";
import emitter from "@/bus"; // 引入传值组件
import { readSettings } from "../storage.js";
import { User } from "@element-plus/icons-vue";
// 封装一个等待（睡眠）函数，返回一个 Promise
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function DuihuaPanduan(item) {
    const user = useCounterStore();
    console.log("item=", item);

    if (item === undefined || item.text === user.text) {
        return
    }

    //笔记
    if (item.biji !== undefined) {
        clearInterval(user.kuaijin);
        const settings = await readSettings();
        user.text_speed = settings.text_speed;
        user.kuaijin = false;
        user.text_boolean = true
        user.attributes.duihuaBUkejian = 1;//日记
        user.attributes.rijiNeirong = item.biji
        emitter.emit("rijiText");
    }
    //背景可点击
    if (item.bjWuping !== undefined) {
        console.log('item.bjWuping=', item.bjWuping);
        if (!item.bjWuping) {
            user.attributes.bjIndex = -1
        } else {
            user.attributes.bjIndex = user.attributes.bjWuping.findIndex(i => i.name === item.bjWuping)
            emitter.emit("updateAllBoxes");
        }
    }
    if (item.Character !== undefined) {
        for (let i = 0; i < item.Character.length; i++) {
            const char = item.Character[i];
            if (char.add) {
                user.attributes.Character.push(char);
            } else {
                // 否则移除（如果存在）
                const index = user.attributes.Character.findIndex(c => c.name == char.name);
                if (index !== -1) {
                    user.attributes.Character.splice(index, 1);
                }
            }
        }
    }
    if (item.knownPeople !== undefined) {
        for (let i = 0; i < item.knownPeople.length; i++) {
            const char = item.knownPeople[i];
            if (char.add) {
                user.attributes.knownPeople.push(char);
            } else {
                // 否则移除（如果存在）
                const index = user.attributes.knownPeople.findIndex(c => c.name == char.name);
                if (index !== -1) {
                    user.attributes.knownPeople.splice(index, 1);
                }
            }
        }
    }
    //称呼修改
    if (item.nameEdit !== undefined) {
        const index = user.attributes.Character.findIndex(item1 => item1.name = item.name)
        user.attributes.myName = user.attributes.Character[index].callName
    }
    //短信新增
    if (item.xiaoxi !== undefined) {
        const index = user.attributes.contacts.findIndex(
            i => i.name === item.xiaoxi.name
        );
        if (index !== -1) {
            // 确保都是数组再合并
            user.attributes.contacts[index].messages = [
                ...user.attributes.contacts[index].messages,
                ...item.xiaoxi.messages
            ];
            // 移到数组首位
            const [obj] = user.attributes.contacts.splice(index, 1);
            user.attributes.contacts.unshift(obj);
        }
    }
    //文字
    if (item.heipingWenzi === undefined) {
        if (item.text !== undefined) {
            user.text = item.text
            user.playSound("clickS", false, user.volume * 0.5);
        } else {
            user.text = "..."
        }
    }
    // 音乐
    if (item.music !== undefined) {
        if (item.music.file !== undefined) {
            user.playSound(item.music.file, item.music.loop);
        } else {
            user.stopAllSounds()
        }
    }
    //重要剧情选项
    if (item.juqing !== undefined) {
        user.attributes.juqing.push(item.juqing)
    }


    //事件提示
    if (item.tips !== undefined) {
        const index1 = user.attributes.actionList[item.tips.index].list.findIndex((item1) => item1.name === item.tips.name)
        user.attributes.actionList[item.tips.index].list[index1].tips = item.tips.tips
    }
    //背景透明度
    if (item.bgOpacity !== undefined) {
        user.attributes.bgOpacity = item.bgOpacity;
    }
    // 修改头像
    if (item.face !== undefined) {
        if (!item.face) {
            user.face_img = false;
        } else {
            user.face_img = new URL(`../../assets/people/wo/biaoqing/${item.face}.webp`, import.meta.url).href;
        }
    }
    //任务新增
    if (item.actionList !== undefined) {
        item.actionList.forEach((item2) => {
            const index1 = user.attributes.actionList.findIndex((item1) => item1.name === item2.title);
            if (index1 === -1) {
                const lengthNum = user.attributes.actionList.length
                user.attributes.actionList.push({
                    name: item2.title,
                    list: []
                });
                user.attributes.actionList[lengthNum].list.push(item2)
            } else {
                user.attributes.actionList[index1].list.push(item2)
            }
        })
    }
    //获得物品
    if (item.reward !== undefined) {
        let text = ""
        const hasNum = item.reward.some((obj) => "num" in obj);
        if (hasNum) {
            for (let i = 0; i < item.reward.length; i++) {
                user.addItemToInventory(item.reward[i]);
                if (item.reward[i].notips === undefined) {
                    text = text + `<span class="text-#E6A23C">< 获得 ${item.reward[i].num}*${item.reward[i].name} ></span>`
                }
            }
            user.text = user.text + text
            console.log("我的物品", user.inventory);
        }
    }
    //下一天
    if (item.xiayitian !== undefined) {
        user.newDay()
    }
    //好感度提升
    if (item.favorLevel !== undefined) {
        let text = " ";
        for (let i = 0; i < item.favorLevel.length; i++) {
            const index1 = user.attributes.Character.findIndex((item1) => item1.name === item.favorLevel[i].name)
            user.attributes.Character[index1].Affinity += item.favorLevel[i].Affinity
            if (item.favorLevel[i].Affinity > 0) {
                text = text + `<span class="text-#67C23A">< ${item.favorLevel[i].name} 亲和度 + ${item.favorLevel[i].Affinity} ></span>`
            } else {
                text = text + `<span style="color: #F56C6C;">< ${item.favorLevel[i].name} 亲和度 - ${item.favorLevel[i].Affinity} ></span>`
            }
        }
        user.text = user.text + text
    }
    //隐藏文本框
    if (item.textYincang) {
        user.textYincang = item.textYincang
    }
    // 背景图片
    if (item.backgroundImage !== undefined) {
        if (item.backgroundImage === 'baise') {
            user.attributes.baise = true
        } else {
            user.attributes.baise = false
            user.backgroundImage = new URL(`../../assets/images/${item.backgroundImage}.webp`, import.meta.url).href;
            user.bg_img = item.backgroundImage;
        }
    }
    //边框颜色
    if (item.borderGradient !== undefined) {
        user.borderGradient = item.borderGradient;
    }
    // 修改姓名
    if (item.name !== undefined) {
        if (item.name === '我') {
            user.name = user.zhujue01.name
        } else {
            user.name = item.name
        }
    } else {
        user.name = ""
    }
    // 背包是否出现
    if (item.wupingShow !== undefined) {
        user.wupingShow = item.wupingShow;
    }
    // 音乐
    if (item.music !== undefined) {
        if (item.music.file !== undefined) {
            user.playSound(item.music.file, item.music.loop);
        } else {
            user.stopAllSounds()
        }
    }
    // 选项
    if (item.selectContent !== undefined) {
        kuaijinFalse()
        user.selectedOptionShow = true; //显示选项
        user.selectedOption = item.selectContent; //显示内容
        console.log("user.attributes.selectStatus=", user.attributes.selectStatus);
        for (let i = 0; i < item.selectContent.length; i++) {
            if (item.selectContent[i].str !== undefined) {
                const totalStr = user.attributes.Character.reduce((sum, char) => sum + char.str, 0);
                if (totalStr < item.selectContent[i].str) {
                    item.selectContent[i].isLocked = true;
                    item.selectContent[i].tips = "众人力量属性不达标";
                }
            } else if (item.selectContent[i].no) {
                item.selectContent[i].isLocked = true;
                item.selectContent[i].tips = "剧情暂未完成";
            } else if (item.selectContent[i].tiredness !== undefined) {
                if (!user.attributes.tiredness) {
                    item.selectContent[i].isLocked = true;
                    item.selectContent[i].tips = "现在还不是睡觉的时间";
                } else {
                    item.selectContent[i].isLocked = false;
                }
            } else if (user.attributes.selectselected.includes(item.selectContent[i].currentNodeKey)) {
                item.selectContent[i].isLocked = true;
                item.selectContent[i].tips = "该选项已选择过了";
            }
        }
        await sleep(500);
        user.selectedOptionAble = true;
        user.text_boolean = false;
    }
    //返还行动点
    if (item.tiredness !== undefined) {
        user.attributes.tiredness = item.tiredness
    }
    //任务
    if (item.finishedTasks !== undefined) {
        item.finishedTasks.forEach((item1) => {
            if (item1.boolean) {
                user.attributes.allTasks.finishedTasks.push(item1);
                user.text = user.text + ` <span style="color:#E6A23C;">  < ${item1.name}已接取 ></span>`
            }
        })
    }
    //取名
    if (item.quming !== undefined) {
        user.attributes.textJuxu = true
    }
    //立绘视频
    if (item.fullBodyVideos !== undefined) {
        console.log('item.fullBodyVideos=', item.fullBodyVideos);
        emitter.emit("fullBodyVideos", item.fullBodyVideos);
    } else {
        Object.assign(user.animations, user.animations.map(v => ({ ...v, isSpeaking1: false })))
    }
    //减少压力值
    if (item.Pressure !== undefined) {
        user.attributes.jingshenData.Pressure += item.Pressure
    }
    //房间立绘
    if (item.jueseDonghua !== undefined) {
        if (item.jueseDonghua === false) {
            user.attributes.jueseDonghua = undefined
        } else {
            user.attributes.jueseDonghua = new URL(`../../assets/images/${item.jueseDonghua}.webp`, import.meta.url).href;
        }
    }
    //任务点击
    if (item.dangqianrenwu !== undefined) {
        user.attributes.dangqianrenwu = item.dangqianrenwu
        if (item.boxesShow !== undefined) {
            user.attributes.bjWuping[item.index].boxes[item.boxesShow].show = true
            if (item.boxesShow === 6) {
                user.attributes.bjWuping[item.index].boxes[1].liang = true
            } else if (item.boxesShow === 7) {
                user.attributes.bjWuping[item.index].boxes[2].liang = true
            }
        }
    }
    // 立绘
    if (item.fullBodyImages !== undefined) {
        if (item.fullBodyImages.allDelete) {
            user.fullBodyImages.splice(0, user.fullBodyImages.length);
        }
        let index;
        Object.assign(user.fullBodyImages, user.fullBodyImages.map(v => ({ ...v, isSpeaking: false })))
        item.fullBodyImages.forEach((item1) => {
            index = user.fullBodyImages.findIndex((image) => image.id === item1.id);
            if (item1.show === undefined && item1.isSpeaking > 0 && index !== -1) {
                user.fullBodyImages[index].isSpeaking = item1.isSpeaking;
                return;
            }
            if (index !== -1) {
                // 如果已经存在相同 id 的项，检查 show 字段
                if (!item1.show) {
                    // 如果 show 为 false，则移除该项
                    user.fullBodyImages.splice(index, 1);
                } else if (item1.y === undefined && item1.x !== undefined) {
                    user.fullBodyImages[index].x = item1.x
                    return
                } else {
                    // 如果 show 为 true，覆盖更新该项
                    user.fullBodyImages[index] = { ...user.fullBodyImages[index], ...item1 };
                }
            } else {
                // 如果没有相同 id 的项，添加新项
                if (user.fullBodyImages === undefined) {
                    user.fullBodyImages = [];
                }
                user.fullBodyImages.push(item1);
            }
        });
    } else {
        Object.assign(user.fullBodyImages, user.fullBodyImages.map(v => ({ ...v, isSpeaking: false })))
        Object.assign(user.animations, user.animations.map(v => ({ ...v, isSpeaking1: false })))
    }
    //消耗的物品
    if (item.inventory !== undefined) {
        const index = user.inventory.findIndex(item1 => item1.name === item.inventory.name);
        if ((user.inventory[index].num - item.inventory.num) > 0) {
            user.inventory[index].num -= item.inventory.num
            user.inventory.splice(index, 1);
            user.attributes.xiaohaoBoolean = true;
            if (item.inventory.name === "钱袋子") {
                ElMessText(`花费了${item.inventory.num}金钱`)
            }
        } else if ((user.inventory[index].num - item.inventory.num) === 0) {
            if (item.inventory.name === "钱袋子") {
                user.inventory[index].num = 0;
                ElMessText(`花费了${item.inventory.num}金钱`)
            } else {
                user.inventory.splice(index, 1);
            }
            user.attributes.xiaohaoBoolean = true;
        } else {
            user.attributes.xiaohaoBoolean = false;
            if (item.inventory.name === "钱袋子") {
                ElMessText(`金钱不足`)
            }
        }
    }
    if (item.TTElMessText !== undefined) {
        ElMessText(item.TTElMessText)
    }
    if (item.achv !== undefined) {
        user.attributes.achv.push(item.achv);
        user.text = user.text + ` <span style="color:#409EFF;">  < 获得成就《${item.achv.name}》 ></span>`
    }
    // 屏幕特效
    if (item.action !== undefined) {
        user.visible = item.action;
        if (item.action === 3) {
            await sleep(1600);
        }
    }
    //黑屏文字
    if (item.heipingWenzi !== undefined) {
        user.attributes.textJuxu = true
        user.heipingWenzi = item.heipingWenzi;
        await sleep(1300);
        user.heipingWenzi = "";
        user.text = item.text
        await sleep(450);
        user.attributes.textJuxu = false
    }
    if (item.liaotian !== undefined) {
        clearInterval(user.kuaijin);
        const settings = await readSettings();
        user.text_speed = settings.text_speed;
        user.kuaijin = false;
        user.attributes.liaotian = item.liaotian
        if (item.liaotian === 1) {
            user.attributes.showActions = undefined
        }
    }
    //库存打开
    if (item.kucun !== undefined) {
        user.attributes.kucun = item.kucun;
    }
    if (item.waichu !== undefined) {
        user.attributes.waichu = item.waichu;
    }
    //   对话框抖动
    if (item?.tone) {
        emitter.emit("flashTrigger", item.tone);
    }
    // 屏幕特效图片
    if (item.backgroundImage1 !== undefined) {
        user.backgroundImage1 = item.backgroundImage1
        await sleep(1100);
        user.backgroundImage1 = false
        await sleep(250);
    }
    //节点切换
    if (item.currentNodeKey !== undefined) {
        if (item.currentNodeKey === "gaveOver") {
            user.youxi = 0;
            user.text_boolean = false;
            user.text = "";
            clearInterval(user.kuaijin);
            user.kuaijin = false;
            user.backgroundImage = new URL(`../../assets/images/jiemian0.webp`, import.meta.url).href;
            return
        } else if (item.currentNodeKey === "xiuxihou01") {
            if (!user.attributes.juqing.includes("cunzhuangxiantan01")) {
                user.attributes.juqing.push("cunzhuangxiantan01");
                user.currentNodeKey = "cunzhuangxiantan01";
            } else {
                user.currentNodeKey = item.currentNodeKey;
            }
        } else {
            user.currentNodeKey = item.currentNodeKey;
        }
        user.youxi = 1;
        user.text_boolean = false;
        return
    }
    //   游戏结束
    if (item?.end) {
        kuaijinFalse()
        // user.setVisible(2)  // 触发 blink 动画
        user.text_boolean = false
        user.text = "剧情未完成"
        user.name = ""
        user.attributes.noCaidan = true
        setTimeout(() => {
            user.selectBoolean = false; //关闭搜索场景
            user.youxi = 0;
            user.menu = 1;
            user.fullBodyImages = []
            user.backgroundImage
            user.stopAllSounds();
            // user.setVisible(0)  // 触发 blink 动画
            user.backgroundImage = new URL(`../../assets/images/jiemian0.webp`, import.meta.url).href;
        }, 1500);
        return
    }

    //漫游式提示
    if (item.tishi !== undefined) {
        setTimeout(() => {
            if (item.tishi === "tishi01") {
                user.attributes.tishi01 = true
            }
        }, 400);
    }
    //经验值成长
    if (item.jingyanzhi !== undefined) {
        if (item.jingyanzhi[0].name === "全部") {
            user.text = user.text + ` <span style="color:#E6A23C;">  <  所有人经验值提升${item.jingyanzhi[0].num} ></span>`
        }
        user.attributes.Character.forEach((char) => {
            if (char.expMax === "当前版本最高等级") {
                return
            }
            if (item.jingyanzhi[0].name === "全部") {
                char.exp += item.jingyanzhi[0].num;
            } else {
                const index1 = item.jingyanzhi.findIndex((item1) => item1.name === char.name);
                if (index1 !== -1) {
                    char.exp += item.jingyanzhi[index1].num;
                    user.text = user.text + ` <span style="color:#E6A23C;">  <  ${char.name} 经验值提升${item.jingyanzhi[index1].num} ></span>`
                }
            }
            if (char.exp >= char.expMax) {
                char.level++
                char.exp -= char.expMax
                char.expMax = Math.floor(100 * Math.pow(char.level, 1.5));
                if (char.name === "凯") {
                    char.str += 1;
                    char.agi += 1;
                } else if (char.name === "奇莫") {
                    char.str += 0.5;
                    char.agi += 1.5;
                } else if (char.name === "戈兰") {
                    char.str += 1.5;
                    char.agi += 0.5;
                }
                if (user.attributes.version === "1.0" && char.level === 3) {
                    char.expMax = "当前版本最高等级"
                    char.exp = 0;
                }
            }
        })
    }
    //采集
    if (item.caiji !== undefined) {
        console.log("item.caiji=", item.caiji);
        const factor = Math.random() * (1.2 - 0.8) + 0.8;
        if (item.caiji.area === "村庄") {
            if (item.caiji.name === "草药") {
                const totalStr = user.attributes.Character.reduce((sum, char) => sum + char.str, 0);
                const amount = Math.floor(((0.5 * totalStr + 2 * user.attributes.Character.length) * item.caiji.rate) * factor);
                console.log("草药数量=", amount);
                const reward = {
                    name: "草药",
                    num: amount,
                    img: "caoyao.webp",
                    miaoshu: "可以用于加工，不可直接食用。",
                    sell: 1,
                    status: "herb"
                }
                user.text = user.text + ` <span style="color:#E6A23C;">  < 获得${amount}*草药 ></span>`
                user.addItemToInventory(reward);
            } else if (item.caiji.name === "兽肉") {
                const totalStr = user.attributes.Character.reduce((sum, char) => sum + char.str, 0);
                const amount = Math.floor(((0.5 * totalStr + 0.4 * user.attributes.Character.length) * item.caiji.rate) * factor);
                let reward = {
                    name: "兽肉",
                    num: amount,
                    img: "shourou.webp",
                    miaoshu: "鲜嫩的兽肉，带着浓郁的野味和丰富的营养。",
                    sell: 2,
                    status: "food"
                }
                const amount1 = Math.max(1, Math.floor(0.2 * amount));
                user.text = user.text + ` <span style="color:#E6A23C;">  < 获得${amount}*兽肉，${amount1}*毛皮 ></span>`
                user.addItemToInventory(reward);
                reward = {
                    name: "毛皮",
                    num: amount1,
                    sell: 4,
                    img: "maopi.webp",
                    miaoshu: "柔软厚实的毛皮，保暖性极佳。",
                    status: "food"
                }
                user.addItemToInventory(reward);
            }
        }
    }
    if (item.textJuxu !== undefined) {
        clearInterval(user.kuaijin);
        user.kuaijin = false;
        user.attributes.textJuxu = item.textJuxu;
    }
    if (user.attributes.liaotian > 0) {
        user.youxi01++;
    } else {
        user.youxi++;
    }
    //自动存档
    if (item.zidongSave !== undefined) {
        user.cundang(1);
    }
    if (item.dengdai !== undefined) {
        user.attributes.textJuxu = true
        await sleep(user.kuaijin ? item.dengdai * 0.25 : item.dengdai);
        user.attributes.textJuxu = false
    }
}
async function kuaijinFalse() {
    const user = useCounterStore();
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false
}
let closeTimer = null;
function ElMessText(content, type) {
    // 清除之前的关闭定时器
    if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
    }

    // 显示消息（先清除已有）
    ElMessage.closeAll();
    ElMessage({
        message: content,
        type: type || "info",
        duration: 1500
    });

    // 设置 1.5 秒后再次关闭（如果期间触发则重置）
    closeTimer = setTimeout(() => {
        ElMessage.closeAll();
        closeTimer = null;
    }, 1750);
}
// 导出 sleep 函数，便于其他文件引用
export { sleep, ElMessText, DuihuaPanduan };