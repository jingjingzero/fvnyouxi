import { useCounterStore } from "@/store/counter";
import { cloneDeep } from "lodash-es";
import textData from "@/store/textData.json";
import { ElMessage } from "element-plus";
import emitter from "@/bus"; // 引入传值组件
import { readSettings } from "../storage.js";
import { InfoFilled } from '@element-plus/icons-vue'
const user = useCounterStore();
// 封装一个等待（睡眠）函数，返回一个 Promise
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function searchAll(item) {
    console.log('item=', item);
    if (item === undefined) {
        return
    }
    if (item.heipingWenzi !== undefined) {
        user.heipingWenzi = item.heipingWenzi;
        await sleep(1300);
        user.heipingWenzi = "";
    }
    // 修改头像
    if (item.face !== undefined) {
        if (!item.face) {
            user.face_img = false;
        } else {
            user.face_img = new URL(`../../assets/people/wo/biaoqing/${item.face}`, import.meta.url).href;
        }
    }
    // 进入战斗
    if (item.fight !== undefined) {
        kuaijinFalse()
        user.wupingShow = 3
        user.fight = item.fight;
        user.fightReward = item.fightReward;
        console.log("user.fight=", user.fight);
    }
    // 背景图片
    if (item.backgroundImage !== undefined) {
        user.backgroundImage = new URL(`../../assets/images/${item.backgroundImage}`, import.meta.url).href;
        user.bg_img = item.backgroundImage;
    }
    //边框颜色
    if (item.borderGradient !== undefined) {
        user.borderGradient = item.borderGradient;
    }
    // 修改姓名
    if (item.name !== undefined) {
        user.name = item.name
    }else{
        user.name = ""
    }
    // 背包是否出现
    if (item.wupingShow !== undefined) {
        user.wupingShow = item.wupingShow;
    }
    
    // 音乐
    if (item.music != undefined) {
        if (item.music.file !== undefined) {
            user.playSound(item.music.file, item.music.loop);
        } else {
            user.stopAllSounds()
        }
    }
    // 进入搜索场景
    if (item.search != undefined) {
        kuaijinFalse()
        user.selectBoolean = true; //搜索场景
        user.selecttextNum = 0; //搜索初始化
        user.searchContent = cloneDeep(textData.search_img[item.search]); //搜索物品
        setTimeout(() => {
            user.text = "(点击周围的环境进行观察)";
        }, 250);
    }
    // 选项
    if (item.selectContent != undefined) {
        kuaijinFalse()
        user.selectedOptionShow = true; //显示选项
        user.selectedOption = item.selectContent; //显示内容
        user.youxi--;
        await sleep(500);
        user.selectedOptionAble = true;
    }
    // 立绘
    if (item.fullBodyImages != undefined) {
        const fullBodyImg = item.fullBodyImages;
        console.log('fullBodyImages=', item.fullBodyImages);
        let index;
        if (user.fullBodyImages?.length > 0) {
            index = user.fullBodyImages.findIndex((image) => image.id === fullBodyImg.id);
        } else {
            index = -1;
        }
        if (index !== -1) {
            // 如果已经存在相同 id 的项，检查 show 字段
            if (!user.fullBodyImages[index].show) {
                // 如果 show 为 false，则移除该项
                user.fullBodyImages.splice(index, 1);
            } else {
                // 如果 show 为 true，覆盖更新该项
                user.fullBodyImages[index] = { ...user.fullBodyImages[index], ...fullBodyImg };
            }
        } else {
            // 如果没有相同 id 的项，添加新项
            if (user.fullBodyImages === undefined) {
                user.fullBodyImages = [];
            }
            user.fullBodyImages.push(fullBodyImg);
        }
    }
    // 中间出现图片
    if (item.cg != undefined) {
        user.cg_imgboolean = true;
        user.cg_img = new URL(`../../assets/people/wo/biaoqing/shenti/${item.cg}`, import.meta.url).href;
        await sleep(user.kuaijin ? 300 : 1500);
        user.cg_imgboolean = false;
        await sleep(user.kuaijin ? 200 : 1300);
        user.text_boolean = false;
    }
    // 屏幕特效
    if (item.action) {
        if (item.action === "blink") {
            user.setVisible(2)  // 触发 blink 动画
            await sleep(1000);
            user.setVisible(0)  // 触发 blink 动画
        } else if (item.action === "flash") {
            user.setVisible(2)  // 触发 flash 动画
            await sleep(1000);
            user.setVisible(0)  // 触发 flash 动画
        }
    }
    //属性改变
    if (item?.maxHp) {
        if (item.maxHp > 0) {
            ElMessage({
                message: "生命值恢复" + item.maxHp + "点",
                type: "success",
                icon: InfoFilled
            });
        } else {
            //生命值减少
            ElMessage({
                message: '生命值 ' + item.maxHp + ' 点',
                type: 'error',
                icon: InfoFilled
            })
            user.attributes.currentHp += item.maxHp
        }
    }

    //   对话框抖动
    if (item?.tone) {
        emitter.emit("flashTrigger", item.tone);

    }
    // 屏幕特效图片
    if (item.backgroundImage1 != undefined) {
        user.backgroundImage1 = item.backgroundImage1
        await sleep(1100);
        user.backgroundImage1 = false
        await sleep(250);
    }
    //   游戏结束
    if (item?.end) {
        kuaijinFalse()
        user.setVisible(2)  // 触发 blink 动画
        await sleep(500);
        user.menu = 1;
        user.selectBoolean = false; //关闭搜索场景
        user.youxi = 0;
        user.text = "";
        user.cg_imgboolean = false;
        user.stopAllSounds();
        user.setVisible(0)  // 触发 blink 动画
        user.text_boolean = false
    }

}
async function kuaijinFalse() {
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false
}
// 导出 sleep 函数，便于其他文件引用
export { sleep, searchAll };