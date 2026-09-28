/**
 * 精灵 NPC 对话数据 —— 羁绊日常段（hl / jinmao / yu 日常 + 治疗/学习/战斗过渡）
 * 
 * 由 jingling.js 拆分而来，本文件只导出对话节点
 * 辅助函数/翻译/选项数组在 jingling-shared.js 里，节点通过 import 引用
 */

import {
    user,
    emitter,
    getGreetingText,
    askOptions1,
    askOptions2,
    askOptions3,
    askOptions4,
} from './jingling-shared.js';

// ========== 羁绊日常段 ==========
export const guanriDialogues = {
    fx19: {
        onEnter: () => {
            emitter.emit("customBattle", {
                // 怪物完全自定义（可多个，各自独立）
                enemies: [
                    { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
                    { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
                    { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
                    { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
                    {
                        monsterType: 'fengxi',
                        count: 1,
                        name: '风息',
                        hp: 10,
                        attack: 18,
                        armor: 80,
                        baseExp: 150, // 经验固定（不受深度倍率影响）
                        hpBarWidth: 14, // ← 血条宽 14vw（默认 10vw），boss 用宽血条更醒目
                        spineScale: 1.2,  // 怪物放大 20%
                        // 掉落固定：baseChance: 1 = 必定掉落
                        drops: [
                            {
                                itemKey: 'jinglingjinghe',
                                itemName: '灵力晶核',
                                img: 'jinghe',
                                baseChance: 1,//掉落概率， 掉落概率：0~1，1 = 100% 必定掉落
                                minNum: 3,
                                maxNum: 3
                            }
                        ],
                    },
                ],
            });
            user.markDialogueComplete('和风息战斗2', true);
        },
        end: 1 // 触发战斗前关闭对话框（否则对话框残留导致 Vue 渲染冲突 __vnode 报错）
    },
    fx03: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu4/one01",
    },
    fx20: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu4/one02",
    },
    fx23: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one03",
    },
    fx29: {
        blackScreen: true,
    },
    fx30: {
        blackScreen: true,
    },
    fx31: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one04",
        hideUI: true,
        autoNext: 1600,
    },
    fx39: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one05",
    },
    fx41: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one06",
    },
    fx46: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one07",
    },
    fx65: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one12",
    },
    fx72: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one08",
    },
    fx75: {
        blackScreen: true,
    },
    fx76: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one12",
    },
    fx78: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one08",
    },
    fx81: {
        blackScreen: true,
    },
    fx82: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one09",
    },
    fx109: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one10",
    },
    fx111: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one11",
    },
    fx132: {
        blackScreen: true,
    },
    fx133: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one08",
    },
    fx138: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one14",
    },
    fx140: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one15",
    },
    fx145: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one16",
    },
    fx153: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one17",
        cgClickDelay: 1600,
    },
    fx154: {
        next: "fx300",
    },
    fx300: {
        cgAnimation: "animation1",
        cgSkin: "pifu3/one09",
    },
    fx310: {
        cgAnimation: "animation1",
        cgSkin: "pifu3/one16",
    },
    fx311: {
        cgAnimation: "animation1",
        cgSkin: "pifu3/one04",
        next: "fx155"
    },
    fx155: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one18",
    },
    fx157: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one19",
    },
    fx160: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one20",
    },
    fx163: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one21",
    },
    fx166: {
        blackScreen: true,
    },
    fx167: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one23",
    },
    fx176: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one24",
        cgClickDelay: 1600,
    },
    fx177: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one25",
        hideUI: true,
        autoNext: 1800,
    },
    fx125: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one30",
        next: "hd470",
        hideUI: true,
        autoNext: 1600,
    },
    hd470: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one31",
        hideUI: true,
        autoNext: 1600,
    },
    hd471: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one32",
        hideUI: true,
        autoNext: 1600,
    },
    hd472: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one33",
        hideUI: true,
        autoNext: 1600,
    },
    hd473: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one34",
        hideUI: true,
        autoNext: 1600,
    },
    hd474: {
        next: "fx126"
    },
    fx179: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one26",
    },
    fx188: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one29",
    },
    fx190: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one27",
    },
    fx191: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one28",
        hideUI: true,
        autoNext: 1600,
    },
    fx192: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one29",
    },
    fx193: {
        options: [
            { text: "fx200", next: "fx205", },
            { text: "fx201", next: "fx215", },
            { text: "fx202", next: "fx220", },
        ],
    },
    fx209: {
        next: "fx193"
    },
    fx218: {
        next: "fx193"
    },
    fx220: {
        cgAnimation: "animation1",
        cgSkin: "pifu4/one35",
    },
    fx227: {
        text: "fx227",
    },
    fx228: {
        onEnter: () => {
            user.addExp(1000);
        },
        end: 1
    },
    jqZ200: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu2/one10",
    },
    jqZ215: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one11",
    },
    jqZ226: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one12",
    },
    jqZ233: {
        onEnter: () => {
            emitter.emit("customBattle", {
                // 怪物完全自定义（可多个，各自独立）
                enemies: [
                    {
                        monsterType: 'fengxi',
                        count: 1,
                        name: '风息',
                        hp: 10,
                        attack: 18,
                        armor: 80,
                        baseExp: 150, // 经验固定（不受深度倍率影响）
                        hpBarWidth: 14, // ← 血条宽 14vw（默认 10vw），boss 用宽血条更醒目
                        spineScale: 1.2,  // 怪物放大 20%
                        xOffsetVW: -10,
                        // 掉落固定：baseChance: 1 = 必定掉落
                        drops: [
                            {
                                itemKey: 'jinglingjinghe',
                                itemName: '灵力晶核',
                                img: 'jinghe',
                                baseChance: 1,//掉落概率， 掉落概率：0~1，1 = 100% 必定掉落
                                minNum: 2,
                                maxNum: 2
                            }
                        ],
                    },
                ],
            });
            user.setDialogueFlag('hd01Day', user.pixi.player?.day ?? 1);
            user.markDialogueComplete('和风息战斗1', true);
            user.setDialogueFlag('晨曦与风息', true);
        },
        end: 1 // 触发战斗前关闭对话框（否则对话框残留导致 Vue 渲染冲突 __vnode 报错）
    },
    jqZ240: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu2/one13",
    },
    jqZ259: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one14",
    },
    hd420: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu2/one06",
    },
    hd432: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one07",
    },
    hd444: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one08",
        // 进入本节点时记录当天天数（供 jinmao60 的 ifDayEqualsFlag 精确判断：必须在同一天才能触发）
        onEnter: () => {
            user.setDialogueFlag('hd444Day', user.pixi.player?.day ?? 1);
        },
    },
    hd390: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu2/one03",
    },
    hd394: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one04",
    },
    hd404: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one05",
    },
    hd350: {
        blackScreen: true,
    },
    hd351: {
        blackScreen: true,
    },
    hd352: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu2/one01",
    },
    hd364: {
        cgAnimation: "animation1",
        cgSkin: "pifu2/one02",
    },
    hl200: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        // cgLoop: true,//循环播放cg动画
        hideUI: true,
        autoNext: 2000,
    },
    hl201: {
        showCg: "",
    },
    hl205: {
        showCg: "richangmanhua",
        cgAnimation: "animation1",
        cgSkin: "pifu1/one01",
        hideUI: true,
        autoNext: 1600,
    },
    jqZ166: {
        blackScreen: true, //黑屏文字
        textSpeed: 10, // 打字速度：每秒 10 字（不写默认 50）
    },
    jqZ167: {
        blackScreen: true, //黑屏文字
        textSpeed: 20, // 打字速度：每秒 10 字（不写默认 50）
        end: 1, // ⚠️ jqX 主线段已删除，视角转换后结束对话
        playerAvatar: "maomi",// 切换成猫咪头像（字符串=显示并切换，主角是 zhujue）
    },
    jqZ108: {
        showCg: "manhua3",
        cgAnimation: "animation18",
        options: [
            {
                text: "jqZ120",
                next: "jqZ150", // ⚠️ jjone 结局段已删除，与"带上猫咪"分支汇合
            },
            {
                text: "jqZ121",
                next: "jqZ150",
                onSelect: () => {
                    user.addNpcAffection('maomi', 30);
                }
            },
        ],
    },
    jqZ30: {
        onStage: "maomi",
    },
    jqZ09: {
        onEnter: () => {
            user.markDialogueComplete('初次遭遇魔物', true);
            // 🗡️ 讨伐战已移除：剧情强制战改为对话自定义战斗（保持主线推进）
            emitter.emit('customBattle', { enemies: [{ monsterType: 'monster1', count: 1, name: '暗影', hp: 100, attack: 5, armor: 5, speed: 90, baseExp: 30 }] });
        },
        end: 1
    },
    jqZ53: {
        onEnter: () => {
            user.markDialogueComplete('初次遭遇魔物1', true);
            // 🗡️ 讨伐战已移除：剧情强制战改为对话自定义战斗（魔物潮：3只暗影）
            emitter.emit('customBattle', { enemies: [{ monsterType: 'monster1', count: 3, name: '暗影', hp: 100, attack: 5, armor: 5, speed: 90, baseExp: 30 }] });
        },
        end: 1
    },
    hm01: {
        onStage: "heimi",
        options: askOptions4,
        repeatable: true,
    },
    jinmao01: {
        onStage: "jinmao",
    },
    jinmao50: {
        onStage: "jinmao",
        options: askOptions3,
        // 根据好感度显示不同问候
        text: () => getGreetingText('jinmao01'),
    },
    jinmao51: {
        onStage: "jinmao",
        id: "jinmao50", // 和 hl50 共享已选选项状态，选过的两边都不能再选
        repeatable: true, // 可重复对话，不记录到 dialogueProgress
        options: askOptions3,
        text: () => getGreetingText('jinmao02'),
    },
    jinmao60: {
        onStage: "jinmao",
        id: "jinmao50", // 和 hl50 共享已选选项状态，选过的两边都不能再选
        options: askOptions3,
    },
    jinmao151: {
        onEnter: () => {
            user.setDialogueFlag('关于首领', true);
        },
    },
    jinmao198: {
        onEnter: () => {
            user.setDialogueFlag('已知云弥大致情况', true);
        },
    },
    yu01: {
        onStage: "yu",
    },
    yu50: {
        onStage: "yu",
        options: askOptions2,
        // 根据好感度显示不同问候
        text: () => getGreetingText('yu01'),
    },
    yu51: {
        onStage: "yu",
        id: "yu50", // 和 hl50 共享已选选项状态，选过的两边都不能再选
        repeatable: true, // 可重复对话，不记录到 dialogueProgress
        options: askOptions2,
        text: () => getGreetingText('yu02'),
    },
    yu177: {
        onStage: "",
    },
    yu183: {
        onEnter: () => {
            user.setDialogueFlag('云弥的过往', true);
        },
    },
    hl01: {
        onStage: "huli",
        // ===== 皮肤（skin）使用说明 =====
        // onStage 激活 NPC 头像时，默认皮肤为 "zc"（嘟嘴表情）
        //
        // playerSkin: 切换玩家头像的 Spine 皮肤（用于表情）
        //   - 字符串："smile" / "angry" / null（null=恢复默认"zc"）
        //
        // npcSkin: 切换 NPC 头像的 Spine 皮肤（用于表情）
        //   单NPC写法：npcSkin: "smile"  → 应用到当前说话的NPC
        //   多NPC写法：npcSkin: { huli: "smile", jinmao: "zc", yu: "angry" }
        //     → 按 NPC 名称分别指定，"zc" 恢复默认皮肤
        //
        // 示例（取消注释即可使用）：
        // npcSkin: "smile",                           // 狐狸微笑
        // npcSkin: { huli: "smile", jinmao: "angry" }, // 多NPC各自表情
        // playerSkin: "angry",                        // 玩家生气
    },
    hl50: {
        // onStage: "huli",
        options: askOptions1,
        // 根据好感度显示不同问候
        text: () => getGreetingText('huli01'),
    },
    hl51: {
        id: "hl50", // 和 hl50 共享已选选项状态，选过的两边都不能再选
        repeatable: true, // 可重复对话，不记录到 dialogueProgress
        options: askOptions1,
        text: () => getGreetingText('huli02'),
    },
    hl180: {
        onEnter: () => {
            user.setDialogueFlag('西亚的消息', true);
        },
    },
    jinmao179: {
        next: () => {
            if (!user.getDialogueFlag("西亚的消息")) {
                return "end";
            }
            return "jinmao190";
        },
    },
};
