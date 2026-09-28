/**
 * 精灵 NPC 对话数据 —— 初次相遇（yu 段）+ 互动（hd/hm 段）+ 失败（sb 段）
 * 
 * 由 jingling.js 拆分而来，本文件只导出对话节点
 * 辅助函数/翻译/选项数组在 jingling-shared.js 里，节点通过 import 引用
 */

import { createWenhaoHudong, getWenhaoHudong, addRectObstacle, removeRectObstacle } from '@/pages/pixi/matter1/daoju.js';
import { addUnlockWorldMapScene } from '@/pages/pixi/player/map.js';
import {
  user,
  emitter,
  router,
  createNPC,
  moveJinmaoHuli,
  option4,
  hideNpc,
} from './jingling-shared.js';
import { showCg } from '../../index.js';

// ========== 初次相遇（yu 段） + 互动（hd/hm 段） + 失败（sb 段） ==========
export const yushiDialogues = {
  // ===== 特殊剧情对话：初次相遇 =====
  // 对话节点可以只写有特殊配置的，普通节点自动根据 translations 生成：
  // - text 自动 = 键名（自动加 i18n 前缀）
  // - next 自动 = 键名+1
  // - 最后一个节点自动跳到 end
  // - speaker 可以写在 translations 里，也可以写在对话节点里
  // - 自己写了就用自己的，没写就自动补全
  dayo400: {
    blackScreen: true,
    textSpeed: 15
  },
  dayo401: {
    onEnter: () => {
      const juese = user.pixi.player.juese;
      // 扣除 30% 最大生命值，同时限制血量最低不会小于0、最高不超上限
      juese.hp = Math.max(0, Math.min(juese.maxHp, juese.hp - juese.maxHp * 0.3));
      emitter.emit("customBattle", {
        // 怪物完全自定义（可多个，各自独立）
        enemies: [
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
        ],
      });
      user.markDialogueComplete('Day5魔物潮7', true);
      // 🏆 完成「讨伐魔物潮」成就（首次完成奖励永久天赋点，每个成就只完成一次）
      // user.addAchievement('讨伐魔物潮');
    },
    end: 1
  },
  dayo403: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu2/one01",
    hideUI: true,
    autoNext: 1300,
  },
  dayo406: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one02",
    hideUI: true,
    autoNext: 1300,
  },
  dayo410: {
    onEnter: () => {
      emitter.emit("customBattle", {
        // 怪物完全自定义（可多个，各自独立）
        enemies: [
          { monsterType: 'guaiwu2', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
        ],
      });
      user.markDialogueComplete('Day5魔物潮8', true);
    },
    end: 1
  },
  dayo420: {
    blackScreen: true,
  },
  dayo421: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu2/one03",
    hideUI: true,
    autoNext: 1300,
  },
  dayo422: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one04",
    hideUI: true,
    autoNext: 1300,
  },
  dayo426: {
    blackScreen: true,
  },
  dayo427: {
    blackScreen: true,
  },
  dayo428: {
    blackScreen: true,
  },
  dayo429: {
    blackScreen: true,
    textSpeed: 10,
  },
  dayo430: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one05",
  },
  dayo438: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one017",
  },
  dayo443: {
    blackScreen: true,
  },
  dayo444: {
    blackScreen: true,
  },
  dayo445: {
    blackScreen: true,
  },
  dayo446: {
    blackScreen: true,
  },
  dayo447: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one07",
    hideUI: true,
    autoNext: 1300,
  },
  dayo458: {
    options: [
      { text: "dayo464", next: "dayo470", repeatable: true, },
      {
        text: "dayo465", next: "dayo500", repeatable: true
      },
    ]
  },
  dayo470: {
    blackScreen: true,
  },
  dayo471: {
    blackScreen: true,
  },
  dayo472: {
    blackScreen: true,
  },
  dayo473: {
    blackScreen: true,
  },
  dayo474: {
    blackScreen: true,
  },
  dayo475: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one06",
    hideUI: true,
    autoNext: 2400
  },
  dayo479: {
    onEnter: () => {
      setTimeout(() => {
        //返回主界面
        localStorage.removeItem('auto_save');
        user._skipAutoSave = true;
        router.push({ name: "index" });
      }, 500);
    }
  },
  dayo501: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one08",
  },
  dayo505: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one07",
  },
  dayo508: {
    blackScreen: true,
  },
  dayo509: {
    blackScreen: true,
  },
  dayo510: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one09",
    hideUI: true,
    autoNext: 1200
  },
  dayo517: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one010",
  },
  dayo522: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one018",
  },
  dayo533: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one011",
  },
  dayo537: {
    blackScreen: true,
    textSpeed: 4
  },
  dayo538: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one012",
  },
  dayo540: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one013",
  },
  dayo547: {
    onEnter: () => {
      const juese = user.pixi.player.juese;
      // 强制设置为最大生命值20%，限制区间0~maxHp
      juese.hp = Math.max(0, Math.min(juese.maxHp, juese.maxHp * 0.2));
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
      user.markDialogueComplete('和风息战斗3', true);
    },
    end: 1
  },
  dayo549: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu2/one013",
  },
  dayo552: {
    blackScreen: true,
  },
  dayo553: {
    blackScreen: true,
  },
  dayo554: {
    blackScreen: true,
  },
  dayo555: {
    blackScreen: true,
  },
  dayo556: {
    blackScreen: true,
  },
  dayo557: {
    blackScreen: true,
  },
  dayo558: {
    blackScreen: true,
  },
  dayo559: {
    blackScreen: true,
  },
  dayo560: {
    blackScreen: true,
  },
  dayo561: {
    blackScreen: true,
  },
  dayo562: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one014",
  },
  dayo567: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one019",
  },
  dayo574: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one015",
  },
  dayo576: {
    cgAnimation: "animation1",
    cgSkin: "pifu2/one016",
  },
  dayo579: {
    onEnter: () => {
      setTimeout(() => {
        //返回主界面
        localStorage.removeItem('auto_save');
        user._skipAutoSave = true;
        router.push({ name: "index" });
      }, 500);
    }
  },
  dayo01: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one021",
    // � 进入该节点后播放一段音频（一次性，播放完自动清理移除）：
    //    - user.playSoundEffect('音频名')：播放 /music/ 目录下的音频，播放结束自动移除实例
    //    - 音频文件不存在时静默跳过（不报错），后期把文件放到 public/music/ 即可生效
    //    - 对应循环音乐用 user.playBgm('bgm名')；想停止循环音乐用 user.stopBgm()
    // onEnter: () => {
    //   user.playSoundEffect('dayo01');
    // },
    // �🏪 进入该节点后打开商店（对话框关闭后自动弹出商店）
    // onEnter: () => {
    //   setTimeout(() => {
    //     emitter.emit('openShop');
    //   }, 400);
    // },
    // end: 1,
  },

  // ⚠️ dayo02/dayo03/dayo05/dayo06 的皮肤配置统一写在 jingling-translations.js 的翻译条目里：
  //    playerSkin（玩家头像皮肤）+ npcSkin（在场 NPC 头像皮肤），按节点分别指定
  //    （这些节点无特殊配置，由翻译表自动生成，皮肤通过 index.js 的 _nodeSkins 机制应用）
  dayo04: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one022",
  },
  dayo07: {
    onEnter: () => {
      emitter.emit("customBattle", {
        // 怪物完全自定义（可多个，各自独立）
        enemies: [
          { monsterType: 'buou1', count: 1, name: '空心布偶' },
        ],
      });
      user.markDialogueComplete('Day5魔物潮1', true);
      //地图添加
      addUnlockWorldMapScene(
        {
          id: 'new_zone_01',
          label: '新区域', icon: '🗺️', x: 60, y: 50,
          type: 'story', mapId: 'desert_01', desc: '击败魔物潮后解锁的新区域',
          links: ['battle_03'],
        },
        ['Day5魔物潮1']   // 打完这场战斗后才显示
      );
    },
    end: 1 // 触发战斗前关闭对话框（否则对话框残留导致 Vue 渲染冲突 __vnode 报错）
  },
  dayo10: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one01",
    hideUI: true,
    autoNext: 1000,
  },
  dayo11: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one04",
    hideUI: true,
    autoNext: 1000,
  },
  dayo12: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one03",
    hideUI: true,
    autoNext: 1000,
  },
  dayo13: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one02",
  },
  dayo16: {
    onEnter: () => {
      const juese = user.pixi.player.juese;
      juese.hp = Math.min(juese.maxHp, juese.hp + 25);
    }
  },
  dayo18: {
    onEnter: () => {
      emitter.emit("customBattle", {
        // 怪物完全自定义（可多个，各自独立）
        enemies: [
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'monster1', count: 1, name: '暗影', hp: 10, attack: 18, armor: 80, baseExp: 200 },
        ],
      });
      user.markDialogueComplete('Day5魔物潮2', true);
    },
    end: 1 // 触发战斗前关闭对话框（否则对话框残留导致 Vue 渲染冲突 __vnode 报错）
  },
  dayo25: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one02",
  },
  dayo33: {
    onEnter: () => {
      const juese = user.pixi.player.juese;
      juese.hp = Math.min(juese.maxHp, juese.hp + 25);
    }
  },
  dayo34: {
    onEnter: () => {
      emitter.emit("customBattle", {
        // 怪物完全自定义（可多个，各自独立）
        enemies: [
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
        ],
      });
      user.markDialogueComplete('Day5魔物潮3', true);
    },
    end: 1 // 触发战斗前关闭对话框（否则对话框残留导致 Vue 渲染冲突 __vnode 报错）
  },
  dayo40: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one02",
  },
  dayo50: {
    onEnter: () => {
      emitter.emit("customBattle", {
        // 怪物完全自定义（可多个，各自独立）
        enemies: [
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
          { monsterType: 'guaiwu2', count: 1, name: '魔化猫', hp: 25, attack: 18, armor: 80, baseExp: 200 },
        ],
      });
      user.markDialogueComplete('Day5魔物潮4', true);
    },
    end: 1 // 触发战斗前关闭对话框（否则对话框残留导致 Vue 渲染冲突 __vnode 报错）
  },
  dayo9999: {
    onEnter: () => {
      addRectObstacle({
        mapId: 'desert_01',
        obstacleId: 'rock_1',           // 唯一标识
        spineName: 'ceshispine',        // 🦴 绑定 Spine 骨骼（loadAssets.js 注册了 changjing2_skel/atlas）
        spineAnimation: 'animation',    // 可选：动画名（不传自动播第一个）
        spineLoop: true,                // 可选：循环（默认 true）
        spineSkin: 'pifu1',             // 可选：皮肤
        spineScale: 1,                // 可选：Spine 缩放
        xPercent: 0.4,                  // 底部中心 X（百分比）
        yPercent: 0.85,                 // 底部 Y（百分比）
        w: 40, h: 50,                   // ⚔️ 物理碰撞盒宽高（像素）
      });

    },
    end: 1,
    repeatable: true,
  },
  dayo10001: {
    onEnter: () => {
      removeRectObstacle('desert_01', 'rock_1')

    },
    end: 1,
    repeatable: true,
  },
  dayo60: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one05",
    hideUI: true,
    autoNext: 1000,
  },
  dayo61: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one025",
    hideUI: true,
    autoNext: 1000,
  },
  dayo63: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one05",
  },
  dayo67: {
    onStage: ["jinmao", "huli"],
    cgShowAvatar: true,
  },
  dayo70: {
    onStage: ["jinmao", "huli", 'maomi'],
  },
  dayo76: {
    cgShowAvatar: false,
    cgAnimation: "animation1",
    cgSkin: "pifu1/one026",
    hideUI: true,
    autoNext: 1200,
  },
  dayo77: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one019",
    hideUI: true,
    autoNext: 1200,
  },
  dayo78: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one020",
    hideUI: true,
    autoNext: 1200,
  },
  dayo79: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one08",
    hideUI: true,
    autoNext: 1200,
  },
  dayo80: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one06",
    hideUI: true,
    autoNext: 1200,
  },
  dayo81: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one027",
    hideUI: true,
    autoNext: 2000,
  },
  dayo82: {
    onStage: "maomi",
    cgShowAvatar: true,
  },
  dayo100: {
    onEnter: () => {
      hideNpc(4)
      hideNpc(3)
      hideNpc(2)
      hideNpc(1)
      createNPC({ id: 1, juese: 'yuQ2', height: 21, player: 3, mapId: 'desert_01', x: 0.45, y: 0.72, shadow: false, direction: 1, TopMap: -2, data: { name: '金毛' } })
      createNPC({ id: 2, juese: 'yuQ3', player: 3, height: 20, mapId: 'desert_01', x: 0.7, y: 0.72, direction: 1, shadow: false, TopMap: -2, data: { name: '鱼' } })
      createNPC({ id: 3, juese: 'yuQ1', player: 3, height: 20, skin: 'huli', mapId: 'desert_01', x: 0.305, y: 0.72, direction: 1, shadow: false, TopMap: -7, data: { name: '狐狸' } })
      createNPC({ id: 4, juese: 'yuQ4', skin: 'yu', height: 18, player: 3, mapId: 'desert_01', x: 0.25, y: 0.72, shadow: false, direction: 1, TopMap: 2, data: { name: '兔子' } })
      getWenhaoHudong('heimi')?.hide();
      getWenhaoHudong('jinmao')?.hide();
      getWenhaoHudong('huli')?.hide();
      getWenhaoHudong('yu')?.hide();
      createWenhaoHudong({
        id: 'jinmao1',          // 唯一 ID（不要和其他问号重复）
        mapId: 'desert_01',        // 所在的地图 ID（默认 'one01'）
        x: 0.445, y: 0.6,           // 百分比 0~1（x 相对地图宽度，y 相对窗口高度）
        textureName: 'duihua',     // 图标纹理（默认 "question"）
        wuxian: 0,                // 可点击次数，-1=无限点击
        isFloatEnable: false,       // 是否上下浮动
        clickData: {
          loadData: 'npc/jingling',
          route: [
            { name: 'dayo140' },                             // 兜底打开 jinmao51
          ],
        },
      });
      createWenhaoHudong({
        id: 'xiya1',          // 唯一 ID（不要和其他问号重复）
        mapId: 'desert_01',        // 所在的地图 ID（默认 'one01'）
        x: 0.28, y: 0.6,           // 百分比 0~1（x 相对地图宽度，y 相对窗口高度）
        textureName: 'duihua',     // 图标纹理（默认 "question"）
        wuxian: 0,                // 可点击次数，-1=无限点击
        isFloatEnable: false,       // 是否上下浮动
        clickData: {
          loadData: 'npc/jingling',
          route: [
            { name: 'dayo110' },                             // 兜底打开 jinmao51
          ],
        },
      });
      createWenhaoHudong({
        id: 'yu1',          // 唯一 ID（不要和其他问号重复）
        mapId: 'desert_01',        // 所在的地图 ID（默认 'one01'）
        x: 0.69, y: 0.6,           // 百分比 0~1（x 相对地图宽度，y 相对窗口高度）
        textureName: 'duihua',     // 图标纹理（默认 "question"）
        wuxian: 0,                // 可点击次数，-1=无限点击
        isFloatEnable: false,       // 是否上下浮动
        clickData: {
          loadData: 'npc/jingling',
          route: [
            { name: 'dayo159' },                             // 兜底打开 jinmao51
          ],
        },
      });
      getWenhaoHudong('rest_01')?.addRouteStep(
        // 第五日结束前（未设置 flag '第五日结束'）→ 点休息先打开 dayo302 引导对话
        // 设置 user.setDialogueFlag('第五日结束', true) 后 → 该步条件不满足自动跳过，直接走休息逻辑
        { ifNotFlag: '第五日结束', name: 'dayo302' },
        { prepend: true }
      );
    },
    end: 1
  },
  dayo110: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one013",
    hideUI: true,
    autoNext: 1600,
  },
  dayo116: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one014",
  },
  dayo118: {
    textSpeed: 6, // 打字速度：每秒 100 字（不写默认 50，数值越大打字越快）
  },
  dayo121: {
    textSpeed: 6, // 打字速度：每秒 100 字（不写默认 50，数值越大打字越快）
  },
  dayo127: {
    textSpeed: 10,
  },
  dayo129: {
    textSpeed: 10,
  },
  dayo119: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one015",
  },
  dayo123: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one016",
    hideUI: true,
    autoNext: 1600,
  },
  dayo128: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one017",
  },
  dayo140: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one08",
    hideUI: true,
    autoNext: 1600,
  },
  dayo151: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one09",
    hideUI: true,
    autoNext: 1600,
    onEnter: () => {
      user.setDialogueFlag('金毛醉酒', true);
    }
  },
  dayo159: {
    showCg: "richangmanhua1",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one06",
    hideUI: true,
    autoNext: 1600,
  },
  dayo171: {
    options: [
      { text: "dayo303", next: "dayo180", repeatable: true, },
      { text: "dayo304", next: "dayo192", repeatable: true },
    ],
  },
  dayo189: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one07",
  },
  dayo190: {
    options: [
      {
        text: "dayo305", next: "dayo195", onSelect: () => {
          user.setDialogueFlag('摸摸肚子', true);
        }
      },
      { text: "dayo306", next: "dayo330", },
      {
        text: "dayo307", next: "dayo335", repeatable: true,
      }
    ],
  },
  dayo332: {
    next: "dayo190"
  },
  dayo196: {
    next: "dayo190"
  },
  dayo335: {
    // next 支持函数形式：运行时根据条件返回不同的节点 ID，实现条件跳转
    next: () => {
      if (user.getDialogueFlag("摸摸肚子") && user.getDialogueFlag("金毛醉酒")) {
        return "dayo230";   // 已摸过肚子 → 跳转到成功分支（改成你的实际节点 ID）
      } else {
        return "dayo340";   // 没摸过肚子 → 跳到 end:1 节点，直接退出对话
      }
    },
    onEnter: () => {
      getWenhaoHudong('jinmao1')?.remove();
      user.setDialogueFlag('第五日结束', true);
    },
  },
  dayo192: {
    onEnter: () => {
      getWenhaoHudong('jinmao1')?.remove();
      user.setDialogueFlag('第五日结束', true);
    },
  },
  // 失败分支结束节点：end:1 表示一次性结束节点，跳到这里会自动关闭对话
  dayo181: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one023",
    hideUI: true,
    autoNext: 1000,
  },
  dayo182: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one024",
    hideUI: true,
    autoNext: 1000,
  },

  dayo230: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one010",
    hideUI: true,
    autoNext: 1000,
  },
  dayo240: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one011",
  },
  dayo249: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one012",
  },
  dayo340: {
    end: 1,
  },
  dayo302: {
    repeatable: true,
    end: 1
  },
  jinmao251: {
    blackScreen: true,
  },
  jinmao252: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu3/one01",
    hideUI: true,
    autoNext: 1600,
  },
  jinmao254: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one02",
  },
  jinmao256: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one03",
  },
  jinmao261: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one04",
    hideUI: true,
    autoNext: 1600,
  },
  jinmao263: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one17",
  },
  jinmao270: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one05",
  },
  jinmao274: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one06",
  },
  jinmao278: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one07",
    hideUI: true,
    autoNext: 1600,
  },
  jinmao280: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one16",
  },
  jinmao290: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one17",
  },
  jinmao306: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one08",
  },
  jinmao310: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one19",
  },
  jinmao312: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one20",
  },
  jinmao314: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one09",
  },
  jinmao329: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one16",
  },
  jinmao330: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one03",
  },
  jinmao331: {
    blackScreen: true,
  },
  jinmao332: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one10",
  },
  jinmao337: {
    blackScreen: true,
  },
  jinmao338: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one18",
  },
  jinmao343: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one11",
  },
  jinmao348: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one12",
  },
  jinmao351: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one13",
  },
  jinmao357: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one03",
  },
  jinmao358: {
    blackScreen: true,
  },
  jinmao359: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one21",
  },
  jinmao363: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one22",
  },
  jinmao386: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one15",
    cgClickDelay: 1600,
  },
  jinmao387: {
    blackScreen: true,
  },
  jinmao388: {
    showCg: "",
    onStage: "jinmao",
  },
  jinmao367: {
    blackScreen: true,
  },
  jinmao368: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one14",
  },
  jinmao373: {
    cgAnimation: "animation1",
    cgSkin: "pifu3/one23",
  },
  yu500: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu2/one09",
  },
  yu510: {
    onEnter: () => {
      user.pixi.player.talentPoints += 5;
    }
  },
  yu305: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one20",
  },
  yu308: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one36",
  },
  yu313: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one21",
  },
  yu315: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one22",
  },
  yu330: {
    blackScreen: true,
  },
  yu331: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one24",
  },
  yu333: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one25",
  },
  yu338: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one26",
  },
  yu345: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one27",
  },
  yu351: {
    blackScreen: true,
  },
  yu352: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one28",
  },
  yu358: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one29",
  },
  yu360: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one30",
  },
  yu367: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one31",
  },
  yu370: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one32",
  },
  yu381: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one34",
  },
  yu383: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one33",
    cgClickDelay: 1600,
  },
  yu384: {
    blackScreen: true,
  },

  yu385: {
    showCg: "",
    onStage: "yu",
  },
  yu395: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one35",
  },
  yu403: {
    blackScreen: true,
  },
  yu404: {
    showCg: "",
  },
  yu409: {
    onStage: "maomi",
  },
  hm01: {
    repeatable: true,
    onStage: "heimi",
  },
  hd200: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one11",
    onStage: "jinmao",
    //cgShowAvatar: true, // CG 显示时仍显示头像框（默认 false=CG 时隐藏头像）
  },
  // ===== 演示：在另一个对话节点里操作之前创建的问号 =====
  // hd201: {
  //   onEnter: () => {
  //     // 用 id 从全局注册表取回控制对象，无需变量跨作用域传递
  //     const mark = getWenhaoHudong('hd200_mark');
  //     if (mark) {
  //       mark.setPosition(0.6, 0.5);  // 移动位置
  //       // mark.setTexture('xiuxi');     // 换图标
  //       // mark.show();                  // 显示
  //       // mark.hide();                  // 隐藏
  //       // mark.remove();                // 移除（可再次创建）
  //     } else {
  //       console.warn('[hd201] 未找到问号 hd200_mark（可能还没创建或已被移除）');
  //     }
  //   },
  // },
  hd202: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one12",
  },
  hd204: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one10",
    cgShowAvatar: true,
  },
  hd306: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one10",
  },
  hd234: {
    cgShowAvatar: true,
  },
  hd241: {
    onStage: ["jinmao", "maomi"],
  },
  hd292: {
    onStage: "jinmao",
  },
  hd307: {
    onStage: ["jinmao", "huli"],
  },
  hd309: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one16",
  },
  hd317: {
    onEnter: () => {
      createNPC({ id: 4, juese: 'tuzi', player: 3, mapId: 'desert_01', x: 0.35, y: 0.72, direction: -1, TopMap: 1, data: { name: '兔子' }, idleNames: ['idle2'], })
      // 👥 黑米入队：加入「同伴查看」展示列表（独立于地图 NPC，读档后仍在）
      user.addAllyToDisplay('tuzi');
      // 记录黑米入队当天的天数（供 hd390 的 ifDaysSinceFlag 判断：入队后需再过 1 天才能触发）
      user.setDialogueFlag('heimiJoinDay', user.pixi.player?.day ?? 1);
      // ===== 动态创建问号互动（进入本对话节点时触发） =====
      // 不需要用变量接收！控制对象会自动注册到全局注册表
      // 其他任何对话节点/函数里都能用 getWenhaoHudong('hd200_mark') 取回来操作
      createWenhaoHudong({
        id: 'heimi',          // 唯一 ID（不要和其他问号重复）
        mapId: 'desert_01',        // 所在的地图 ID（默认 'one01'）
        x: 0.35, y: 0.57,           // 百分比 0~1（x 相对地图宽度，y 相对窗口高度）
        textureName: 'duihua',     // 图标纹理（默认 "question"）
        wuxian: -1,                // 可点击次数，-1=无限点击
        isFloatEnable: true,       // 是否上下浮动
        // 可序列化的点击路由：存档读档后靠它复现「按进度选对话」的分支逻辑
        clickData: {
          loadData: 'npc/jingling',
          route: [
            // { ifNotCompleted: 'hl01', name: 'hl01' },   // 未完成 hl01 → 打开 hl01
            // { ifNotCompleted: 'hl50', name: 'hl50' },   // 未完成 hl50 → 打开 hl50
            // 黑米入队当天不能触发 hd390，需入队后再过 1 天（当前天数 >= 入队日 + 1）
            { ifNotCompleted: 'hd390', name: 'hd390', ifDaysSinceFlag: { flag: 'heimiJoinDay', min: 1 }, ifCompletedToday: ['hd420'] },
            { ifNotCompleted: 'hd420', name: 'hd420', ifDaysSinceFlag: { flag: 'heimiJoinDay', min: 2 }, ifCompletedToday: ['hd390'] },
            { name: 'hm01' },                           // 兜底 → 打开 hm01
          ],
        },
      });
    }
  },
  hd300: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one17",
  },
  hd260: {
    blackScreen: true,
  },
  hd261: {
    blackScreen: true,
    onEnter: () => {
      const hasBaiShuoCrystal = user.inventory.some(item => item.name === "黑米的灵晶");
      if (!hasBaiShuoCrystal) {
        user.addItemToInventory({
          name: "黑米的灵晶",
          num: 1,
          img: "heimi",
          miaoshu: "黑米死后凝聚的半魔化灵晶。\n提升10点攻击力，\n进入战斗后提升0.2*已消灭魔物数量的攻击力。",
          isItem: true,
          color: "#E6A23C",
          quality: "rare"
        });
      }
    }
  },
  hd220: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one13",
    cgShowAvatar: false,
  },
  hd223: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one14",
  },
  hd228: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one15",
  },
  hd248: {
    options: [
      {
        text: "hd270", next: "hd260", repeatable: true,
      }, {
        text: "hd271", next: "hd280", repeatable: true,
      },
    ],
  },
  hd205: {
    options: option4
  },
  hd209: {
    id: "hd205", // 和 zz25 共享已选选项状态
    options: option4
  },
  hd211: {
    next: "hd209",
  },
  hd01: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one02", // 可选：指定皮肤名；不写默认用 default
    onStage: ["jinmao", "huli"],
    onEnter: () => {
      // 修改玩家朝向（1=朝右, -1=朝左）
      const player = user.pixi.playerInstance;
      if (player?.spine) {
        player.spine.direction = -1;
        player.spine.setDirection?.(-1);
      }
      // 移动 NPC 到指定百分比位置（只改 X，Y 轴不变）
      // npcId: createNPC 里传的 id（1=金毛 2=鱼 3=狐狸 4=白朔）
      emitter.emit('moveNpcTo', {
        npcId: 1,
        xPercent: 0.53,    // 0~1 百分比，对应地图宽度
        teleport: true,   // true=瞬移；false=走过去
        direction: -1,   // 可选：1=朝右, -1=朝左
      });
      emitter.emit('moveNpcTo', {
        npcId: 3,
        xPercent: 0.50,
        teleport: true,
      });
    },
  },
  hd09: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one03", // 可选：指定皮肤名；不写默认用 default
  },
  hd65: {
    blackScreen: true,
  },
  hd66: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one04", // 可选：指定皮肤名；不写默认用 default
  },
  hd75: {
    blackScreen: true,
  },
  hd76: {
    showCg: "",
  },
  hd82: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one05", // 可选：指定皮肤名；不写默认用 default
  },
  hd113: {
    showCg: "richangmanhua",
    cgAnimation: "animation1",
    cgSkin: "pifu1/one06", // 可选：指定皮肤名；不写默认用 default
  },
  hd115: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one07", // 可选：指定皮肤名；不写默认用 default
  },
  hd116: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one08", // 可选：指定皮肤名；不写默认用 default
  },
  hd16: {
    showCg: ""
  },
  hd122: {
    cgAnimation: "animation1",
    cgSkin: "pifu1/one09", // 可选：指定皮肤名；不写默认用 default
    onEnter: moveJinmaoHuli,
  },
  hd97: {
    onEnter: moveJinmaoHuli,
  },
  hd83: {
    onEnter: moveJinmaoHuli,
  },
  hd18: {
    options: [
      { text: "hd20", next: "hd26", },
      {
        text: "hd21", next: "hd40", repeatable: true,
      }, {
        text: "hd22", next: "hd110", repeatable: true,
      },
    ],
  },
  hd47: {
    options: [
      { text: "hd55", next: "hd65", repeatable: true },
      {
        text: "hd56", next: "hd90", repeatable: true,
      }
    ],
  },
  hd31: {
    next: "hd18"
  },
  sb01: {
    playerAvatar: false,// 隐藏玩家头像 
    onStage: "maomi",
    repeatable: true, // 可重复对话，不记录到 dialogueProgress
  },
  sb05: {
    onEnter: () => {
      user.addAchievement("不可能的失败", 1);
    },
  },
  sb06: {
    onEnter: () => {
      const juese = user.pixi.player.juese;
      juese.hp = Math.min(juese.maxHp, juese.hp + Math.floor(juese.maxHp * 1));
      user.markDialogueComplete('初次遭遇魔物', true);
      // 🗡️ 讨伐战已移除：剧情强制战改为对话自定义战斗（保持主线推进）
      emitter.emit('customBattle', { enemies: [{ monsterType: 'monster1', count: 1, name: '暗影', hp: 100, attack: 5, armor: 5, speed: 90, baseExp: 30 }] });
    },
    end: 1
  },
  sb10: {
    playerAvatar: false,// 隐藏玩家头像 
    onStage: "maomi",
    repeatable: true, // 可重复对话，不记录到 dialogueProgress
  },
  sb11: {
    options: [
      { text: "sb13", next: "sb25", repeatable: true, },
      {
        text: "sb14", next: "sb16", repeatable: true,
        onSelect: () => {
          user.addAchievement("不可能的失败", 2);
        }
      },
    ],
  },
  sb25: {
    onEnter: () => {
      setTimeout(() => {
        //返回主界面
        localStorage.removeItem('auto_save');
        user._skipAutoSave = true;
        router.push({ name: "index" });
      }, 500);
    },
  },
  sb16: {
    next: "sb06"
  },
};
