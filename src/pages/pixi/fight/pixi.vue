<template>
    <div ref="pixiRef" class="pixi-wrap" style="position:relative;z-index:1"></div>
</template>

<script setup>
import { battleLog } from './logger.js'
import { monsterConfigs } from '../matter1/enemiesData.js'
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { Application, Container, ColorMatrixFilter, Text, TextStyle, Graphics, Sprite, Assets, Rectangle } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { loadAssets } from "@/components/loadAssets";
import { DAMAGE_COLOR_MAP, BUFF_COLOR_MAP, BUFF_SKIN_MAP } from '../matter1/buff.js'
import { getEffect, returnEffect } from './SkillLogic'
import { setEnemySpineList, setFightApp, setEnemyContainer, setPlayerScreenPos, getPlayerScreenPos, playStrikeExplosion, consumeStrikeData, getBattlePlayer } from './battle.js'
import { predictEnemyNextDamage, predictEnemyNextAction } from './SkillDamage'
import emitter from "@/bus";
import gsap from "gsap";
import { createEnemyDeathEffect, destroyEffect } from '../matter1/particleEffects.js'
import { useCounterStore } from "@/store/counter";

// ===========================
// Buff名称 → tianfu皮肤名 映射（已移至 buff.js）
// ===========================
// 使用 import { BUFF_SKIN_MAP } from '../matter1/buff.js'

const user = useCounterStore();

const props = defineProps({
    mp: { type: Number, default: 0 },
    maxMp: { type: Number, default: 10 },
    enemySpines: { type: Array, default: () => [] }, // 敌人 spine 资源名数组
    enemies: { type: Array, default: () => [] },      // 敌人数据数组（含 hp/maxHp/name）
    playerBuffs: { type: Array, default: () => [] },  // 玩家 buff 列表
    player: { type: Object, default: null },           // 玩家对象（直接监听 debuffs 变化，防响应式丢失）
    allies: { type: Array, default: () => [] },       // 友方召唤物（水/雷/冰/火精灵、影分身等），点击弹属性详情
});

// 暴露方法给父组件调用
defineExpose({
    showEnemyDamage,   // 显示伤害数字
    showEnemyBuff,     // 显示buff文字
    updateEnemyHpBar,  // 更新指定敌人血条
    flashEnemyPoison,  // 敌人中毒闪绿
    updatePlayerBuffIcons, // 更新玩家buff图标
    updatePlayerPoisonIcon, // 🧪 更新玩家中毒图标（层数/回合）
    updatePlayerSlowIcons, // 🐢 更新玩家减速图标（缠绕/粘液减速等）
    getApp: () => app, // 获取 pixi app 实例，用于子弹渲染
    getEffectContainer: () => effectContainer, // 获取特效层容器（顶层）
    getEnemyContainer: () => enemyContainer,   // 获取敌人层容器（底层，用于在敌人下方的特效）
    getSummonTap,   // 🖱️ 按屏幕位置检测友方召唤物并返回属性/buff摘要（点击召唤物弹详情）
    getEnemyAtRenderPos, // 🎯 按屏幕位置检测敌人（返回最近敌人 uid），指定目标卡牌用
    getEnemyPredictTap,   // 🎯 按屏幕位置检测敌人并返回预测攻击详情（点击怪物弹详情）
    getEnemyBubblePos,    // 💬 获取敌人左上角屏幕坐标（二阶段聊天气泡定位）
});

const pixiRef = ref(null);
let app = null;

// 布局常量
const SPINE_START_X = VW(3.5); // 原 2.5 + 1vw 容器偏移补偿，保持灵力条位置不变
const SPINE_START_Y = VH(86);
const TEXT_RIGHT = VW(3.5);
// 敌人最右侧固定位置（更靠右，靠近屏幕边缘）
const ENEMY_RIGHT_FIXED = VW(92);
const ENEMY_SPACING = VW(10);       // 敌人间距
const ENEMY_Y = VH(85);            // 敌人 y 坐标（脚底位置，越低值越大）
const ENEMY_TARGET_HEIGHT = VH(35); // 敌人spine目标高度（更大更醒目）

let manaContainer = null;
let manaSpine = null;
let currentMpText = null;
let maxMpText = null;
let sharedTime = 0;

// 敌人相关
let enemyContainer = null;
let damageTextContainer = null; // 💯 伤害数字容器（zIndex 1000，盖住所有特效）
let enemySpineList = [];       // 敌人 spine 列表
let enemyHpBarList = [];       // 敌人血条列表
let enemyDataList = [];        // 敌人数据引用
let isRenderingEnemies = false; // 渲染锁，防止渲染过程中血条更新冲突

// 特效层（独立容器，zIndex最高，所有技能特效/子弹都在这里）
let effectContainer = null;

// 全局目标选中高亮滤镜（橙黄色调 + 提亮，表示卡牌指定目标）
let globalTargetFilterRef = null;
function getTargetFilter() {
    if (!globalTargetFilterRef) {
        globalTargetFilterRef = new ColorMatrixFilter();
        globalTargetFilterRef.tint(0xffcc00);
        globalTargetFilterRef.brightness(1.4);
        globalTargetFilterRef.contrast(1.2);
    }
    return globalTargetFilterRef;
}

/**
 * 让敌人闪一下绿色（中毒效果）
 * @param {number} enemyIndex - 敌人索引
 */
function flashEnemyPoison(enemyIndex) {
    // 已移除中毒滤镜：施加中毒效果不再添加滤镜（保留空实现兼容外部调用）
    void enemyIndex;
}



// 单位转换
function VW(v) {
    return window.innerWidth * (v / 100);
}
function VH(v) {
    return window.innerHeight * (v / 100);
}

// ===========================
// 亮度滤镜
// ===========================
function getBrightFilter(ratio) {
    const filter = new ColorMatrixFilter();
    const safeBright = Math.max(ratio * 2, 0.2);
    filter.brightness(safeBright, false);
    return filter;
}

// ===========================
// 创建灵力 Spine
// ===========================
function createManaSpine() {
    const spine = new Spine({
        skeleton: "bluefive_skel",
        atlas: "bluefive_atlas",
        allowMissingRegions: true,
    });
    const targetH = VH(12);
    const scale = targetH / (spine.height || 100);
    spine.scale.set(scale);
    spine.position.set(SPINE_START_X, SPINE_START_Y * 1.025);
    return spine;
}

// ===========================
// 创建灵力文字
// ===========================
function createManaTexts() {
    const currentStyle = new TextStyle({
        fill: "#409EFF",
        fontSize: VH(5.5),
        fontWeight: "bold",
    });
    const current = new Text({ text: "", style: currentStyle });
    current.anchor.set(0, 0.5);
    current.position.set(SPINE_START_X + TEXT_RIGHT, SPINE_START_Y);

    const maxStyle = new TextStyle({
        fill: "#ffffff",
        fontSize: VH(3),
        fontWeight: "normal",
    });
    const max = new Text({ text: "", style: maxStyle });
    max.anchor.set(0, 0);
    max.position.set(
        SPINE_START_X + TEXT_RIGHT + VW(0.5),
        SPINE_START_Y + VH(2.8)
    );
    return { current, max };
}

// ===========================
// 创建单个敌人血条
// ===========================
function createEnemyHpBar(enemyData, spine) {
    const container = new Container();

    // 👑 Boss 判定：显式 isBoss 标记 或 宽血条（≥14vw，BOSS 感配置）→ 血条固定在屏幕顶部中心
    const isBoss = !!enemyData?.isBoss || (enemyData?.hpBarWidth ?? 0) >= VW(14);

    // 血条宽度：支持 enemyData.hpBarWidth 自定义（不传用默认 VW(10)）；Boss 用更宽的大血条
    const barWidth = isBoss ? VW(28) : (enemyData?.hpBarWidth ?? VW(10));
    const BAR_HEIGHT = VH(isBoss ? 2.4 : 1.8);   // 血条高度（Boss 更高）
    const BAR_Y_OFFSET = VH(5);   // 血条在spine上方的偏移（抬高）

    // 边框（透明背景，只显示黑色边框）
    const border = new Graphics();
    border.roundRect(-barWidth / 2, -BAR_HEIGHT / 2, barWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    border.stroke({ width: 2, color: 0x000000, alpha: 0.8 });

    // 延迟血条（深红色，受伤后缓慢减少，形成拖尾效果）
    const delayedFill = new Graphics();
    delayedFill.roundRect(-barWidth / 2, -BAR_HEIGHT / 2, barWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    delayedFill.fill(0x8b0000);

    // 即时血条（亮红色，立即响应血量变化）
    const fill = new Graphics();
    fill.roundRect(-barWidth / 2, -BAR_HEIGHT / 2, barWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    fill.fill(0xff3333);

    // 血条发光效果
    const glow = new Graphics();
    glow.roundRect(-barWidth / 2, -BAR_HEIGHT / 2, barWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    glow.stroke({ width: 3, color: 0xff0000, alpha: 0.3 });

    // 高光效果（顶部半透明白色）
    const highlight = new Graphics();
    highlight.roundRect(-barWidth / 2, -BAR_HEIGHT / 2, barWidth, BAR_HEIGHT / 2, [BAR_HEIGHT / 2, BAR_HEIGHT / 2, 0, 0]);
    highlight.fill({ color: 0xffffff, alpha: 0.25 });

    // ===== 夺命烙印斩杀覆盖层（直接在血条上方绘制不透明紫色）=====
    const deathMarkOverlay = new Graphics();
    deathMarkOverlay.visible = false;

    // 血量文字
    const hpText = new Text({
        text: `${Math.ceil(enemyData.hp)} / ${enemyData.maxHp}`,
        style: {
            fill: 0xffffff,
            fontSize: VH(2),
            fontWeight: "bold",
            stroke: { color: 0x000000, width: 3 },
        }
    });
    hpText.anchor.set(0.5);

    // ===== 状态栏（血条下方）=====
    const statusBar = new Container();
    // 📍 状态栏绝对定位（不占位）：Boss/普通怪统一紧贴血条正下方
    statusBar.y = BAR_HEIGHT / 2 + VH(1.5);
    statusBar._iconSize = VH(4.5);          // 图标尺寸
    statusBar._iconGap = VH(1.0);           // 图标间距
    statusBar._maxRows = 2;                 // 最多两行
    statusBar._maxWidth = barWidth;        // 不超出血条宽度

    // 组装（注意顺序：底层到上层）
    container.addChild(border, delayedFill, fill, glow, highlight, statusBar, deathMarkOverlay, hpText);

    // ===== ⚔️ 预测攻击（血条上方）：buffall 皮肤图标（basic_attack=普攻 / skill=技能）+ 伤害数字 / 类型提示 =====
    const predictGroup = new Container();
    predictGroup.y = -BAR_HEIGHT / 2 - VH(2.7); // 血条上方（护盾条之上）
    const predictText = new Text({
        text: '',
        style: {
            fill: 0xff6b6b,
            fontSize: VH(2),
            fontWeight: "bold",
            stroke: { color: 0x000000, width: 3 },
        }
    });
    predictText.anchor.set(0.5);
    predictGroup.addChild(predictText);
    container.addChild(predictGroup);
    container._predictGroup = predictGroup;
    container._predictText = predictText;
    container._predictIcon = null; // 🎯 buffall 皮肤图标（懒创建，按需切换）

    // 🛡️ 凋零之盾护盾条：叠加在血条上（蓝色覆盖红色），有护盾时替代血条显示
    const shieldBarBg = new Graphics();
    const shieldBar = new Graphics();
    const shieldText = new Text({
        text: '',
        style: {
            fill: 0x38bdf8,
            fontSize: VH(2),
            fontWeight: "bold",
            stroke: { color: 0x000000, width: 3 },
        }
    });
    shieldText.anchor.set(0.5);
    shieldText.visible = false;
    container.addChild(shieldBarBg, shieldBar, shieldText);
    container._shieldBarBg = shieldBarBg;
    container._shieldBar = shieldBar;
    container._shieldText = shieldText;

if (!spine || spine.destroyed) return
    if (isBoss) {
        // 👑 Boss：固定在屏幕顶部中心，不跟随敌人位置
        container.position.set(app.screen.width / 2, VH(7));
    } else {
        // 定位到敌人头顶正上方（根据spine实际缩放高度动态调整）
        const actualSpineHeight = (spine.height || ENEMY_TARGET_HEIGHT) * Math.abs(spine.scale.y);
        container.position.set(
            spine.x,
            spine.y - actualSpineHeight - BAR_Y_OFFSET - VH(28)
        );
    }

    // 存储引用
    container._fill = fill;
    container._delayedFill = delayedFill;
    container._hpText = hpText;
    container._barWidth = barWidth;
    container._statusBar = statusBar;
    container._deathMarkOverlay = deathMarkOverlay;
    container._isBoss = isBoss;
    container._currentRatio = enemyData.hp / enemyData.maxHp;
    container._delayedRatio = enemyData.hp / enemyData.maxHp;
    container._animationId = null;

    // 初始绘制延迟血条
    const initialRatio = enemyData.hp / enemyData.maxHp;
    delayedFill.clear();
    if (initialRatio > 0) {
        delayedFill.roundRect(-barWidth / 2, -BAR_HEIGHT / 2, barWidth * initialRatio, BAR_HEIGHT, BAR_HEIGHT / 2);
        delayedFill.fill(0x8b0000);
    }

    // 初始血量比例（即时血条）
    updateHpBarFill(container, initialRatio);

    // 初始状态栏
    updateEnemyStatusBar(container, enemyData);

    // 初始刷新预测伤害（player 未准备好时内部会自动跳过，ticker 后续补充）
    refreshEnemyPredictDmg(container, enemyData, (props.enemies || []).filter(e => e && e.hp > 0).length);

    return container;
}

// ===========================
// 刷新敌人预测伤害（血条上方的 ⚔️ 数字 = 下回合普攻对你造成的伤害）
// ===========================
/**
 * 🎯 创建/切换预测攻击 buffall 皮肤图标（basic_attack=普攻 / skill=技能），无皮肤返回 null
 */
function ensurePredictIcon(hpBar, skinName) {
    const icon = hpBar._predictIcon;
    if (icon && !icon.destroyed && icon._skinName === skinName) {
        icon.visible = true;
        return icon;
    }
    if (icon && !icon.destroyed) {
        try { icon.state?.clearTracks?.(); } catch (e) { /* ignore */ }
        try { icon.destroy({ children: true }); } catch (e) { /* ignore */ }
        hpBar._predictIcon = null;
    }
    try {
        const spine = createBuffIconSpine(skinName);
        if (!spine) return null;
        // 🎯 技能图标比普攻图标大一点（skill 略大，突出技能威胁）
        const iconSize = skinName === 'skill' ? VH(3.6) : VH(3.2);
        const spineHeight = spine.height || 30;
        spine.scale.set(iconSize / spineHeight);
        // 🖱️ 显式命中区域（Spine 静态皮肤 bounds 可能为 0 导致点击不到）
        const hitIh = Math.max(spineHeight, iconSize) / Math.abs(spine.scale.y || 1);
        spine.hitArea = new Rectangle(-hitIh, -hitIh, hitIh * 2, hitIh * 2);
        hpBar._predictGroup.addChild(spine);
        spine._skinName = skinName;
        hpBar._predictIcon = spine;
        // 🖱️ 命中辅助（点击统一由 predictGroup 处理，spine 本身不绑事件避免重复触发）
        spine.eventMode = 'static';
        return spine;
    } catch (e) {
        return null;
    }
}

/**
 * 📐 预测攻击图标 + 数字整体居中排布（图标在左，数字在右）
 */
function layoutPredictIcon(hpBar, icon) {
    const iconW = Math.max((icon.width || icon.height || VH(2.6)) * Math.abs(icon.scale.x), 1);
    const gap = VH(1.0);
    const textW = hpBar._predictText.width || 0;
    const totalW = iconW + gap + textW;
    icon.x = -totalW / 2;
    hpBar._predictText.x = -totalW / 2 + iconW + gap + textW / 2;
}

/**
 * 🖱️ 点击预测攻击图标 → 通知 Vue 层弹出预测详情（普攻/技能名 + 属性伤害）
 */
function onPredictIconTap(hpBar, target) {
    const action = hpBar._predictAction;
    const enemyData = hpBar._predictEnemy;
    // 只对伤害类行动弹详情（增益/治疗/召唤/护场不弹）
    if (!action || !enemyData || action.type !== 'damage') return;
    let gp;
    try { gp = target.getGlobalPosition(); } catch (e) { return; }
    // 📱 移动端适配：canvas 世界坐标 → 视口坐标（canvas 可能被 CSS 缩放/偏移）
    let vx = gp.x, vy = gp.y;
    try {
        const rect = app.view.getBoundingClientRect();
        const sx = rect.width / app.renderer.width;
        const sy = rect.height / app.renderer.height;
        vx = rect.left + gp.x * sx;
        vy = rect.top + gp.y * sy;
    } catch (e) { /* 保持原坐标 */ }
    emitter.emit('enemyPredictTap', {
        x: vx,
        y: vy,
        enemyName: enemyData.name,
        source: action.source,
        dmgType: action.dmgType,
        dmg: Math.ceil(action.dmg),
        skill: action.skill || null,
    });
}

function refreshEnemyPredictDmg(hpBar, enemyData, aliveCount) {
    if (!hpBar || hpBar.destroyed || !hpBar._predictText) return;
    const player = getBattlePlayer();
    if (!player) return;
    // 🎯 预测敌人下一次行动：伤害型显示 buffall 图标 + 数字；增益/治疗/召唤/护场/减益显示类型提示
    const action = predictEnemyNextAction(enemyData, player, aliveCount);
    if (!action) {
        if (hpBar._predictText.visible) hpBar._predictText.visible = false;
        if (hpBar._predictIcon) hpBar._predictIcon.visible = false;
        return;
    }
    if (!hpBar._predictText.visible) hpBar._predictText.visible = true;
    // 🎨 记录当前预测动作与敌人引用（点击图标弹出详情用）
    hpBar._predictAction = action;
    hpBar._predictEnemy = enemyData;
    if (action.type === 'damage') {
        // 🎨 伤害数字颜色按属性（DAMAGE_COLOR_MAP：物理橙/火红/水蓝/雷紫/冰青/风绿/毒紫/无属性白）
        const dmgHex = (DAMAGE_COLOR_MAP[action.dmgType] || DAMAGE_COLOR_MAP.null).normal;
        hpBar._predictText.style.fill = parseInt(dmgHex.replace('#', ''), 16);
        // 🎯 普攻图标 basic_attack / 技能图标 skill（buffall 皮肤），没有皮肤时回退 emoji
        const skinName = action.source === 'skill' ? 'skill' : 'basic_attack';
        const icon = ensurePredictIcon(hpBar, skinName);
        if (icon) {
            const text = `${Math.ceil(action.dmg)}`;
            if (hpBar._predictText.text !== text) hpBar._predictText.text = text;
            layoutPredictIcon(hpBar, icon);
        } else {
            const srcIcon = action.source === 'skill' ? '✨' : '⚔️';
            const text = `${srcIcon} ${Math.ceil(action.dmg)}`;
            if (hpBar._predictText.text !== text) hpBar._predictText.text = text;
        }
    } else {
        // 非伤害行动：隐藏图标，按类型显示提示（颜色区分）
        if (hpBar._predictIcon) hpBar._predictIcon.visible = false;
        hpBar._predictText.x = 0;
        const TYPE_MAP = {
            buff:   ['🔺 增益', 0x4ade80],   // 绿：给自己加 buff
            heal:   ['💚 治疗', 0x4ade80],   // 绿：治疗
            summon: ['👾 召唤', 0xfbbf24],   // 黄：召唤
            field:  ['⚡ 护场', 0x60a5fa],   // 蓝：电磁场/护场
            debuff: ['🔻 减益', 0xc084fc],   // 紫：给玩家上 debuff
        };
        const [label, color] = TYPE_MAP[action.type] || ['✨ 技能', 0xffffff];
        hpBar._predictText.style.fill = color;
        if (hpBar._predictText.text !== label) {
            hpBar._predictText.text = label;
        }
    }
}

// ===========================
// 更新敌人状态栏图标
// ===========================
// debuff名 → yuansuicon皮肤名 映射
const DEBUFF_SKIN_MAP = {
    '湿润': 'shui',
    '灼烧': 'huo',
    '电流': 'dian',
    '霜冻': 'bing',
};

function updateEnemyStatusBar(hpBar, enemyData) {
    if (!hpBar || !hpBar._statusBar || hpBar.destroyed) return;
    const statusBar = hpBar._statusBar;
    const iconSize = statusBar._iconSize;
    const iconGap = statusBar._iconGap;
    const maxWidth = statusBar._maxWidth;
    const maxRows = statusBar._maxRows;

    // 清空旧图标
    while (statusBar.children.length > 0) {
        const child = statusBar.children[0];
        statusBar.removeChild(child);
        // ⚠️ 先清除 Spine 动画轨道，再彻底销毁，避免 Spine 内部资源泄漏
        if (child.state && typeof child.state.clearTracks === 'function') {
            try { child.state.clearTracks(); } catch (e) { /* ignore */ }
        }
        child.destroy?.({ children: true });
    }

    // 🛡️ 凋零之盾护盾条（血条正上方蓝色护盾条，随敌人数据更新刷新）
    if (hpBar._shieldBar) {
        // 🛡️ 兜底：仅在战斗单位从未初始化 _witherShield（undefined，部分召唤/自定义路径跳过）时，
        //    按被动/配置表现场计算；破盾后 _witherShield=0 是已定义状态，绝不恢复护盾
        let sh = enemyData?._witherShield ?? 0;
        if (enemyData?._witherShield === undefined) {
            let ws = Array.isArray(enemyData?.passives) ? enemyData.passives.find(p => p.type === 'witherShield') : null;
            if (!ws) {
                const cfg = monsterConfigs?.[enemyData?.juese];
                ws = Array.isArray(cfg?.passives) ? cfg.passives.find(p => p.type === 'witherShield') : null;
            }
            if (ws) {
                sh = Math.round((enemyData.maxHp ?? enemyData.hp ?? 0) * (ws.shieldPct ?? 0.25) * 100) / 100;
                enemyData._witherShield = sh;
                enemyData._witherShieldMax = sh;
                enemyData._witherShieldBoostPct = ws.actionBarBoost ?? 0.5;
            }
        }
        const bH = VH(hpBar._isBoss ? 2.4 : 1.8);       // 血条高度
        const bw = hpBar._barWidth || VW(10);             // 血条宽度
        const sbH = bH;                                   // 护盾条高度 = 血条高度（叠加在血条上）
        const bY = -bH / 2;                               // 与血条完全重叠
        hpBar._shieldBarBg.visible = sh > 0;
        hpBar._shieldBar.visible = sh > 0;
        // 有护盾时：隐藏 HP 数字，只显示护盾数字；无护盾恢复 HP 数字
        if (hpBar._hpText) hpBar._hpText.visible = !(sh > 0);
        if (hpBar._shieldText) {
            hpBar._shieldText.visible = sh > 0;
            if (sh > 0) {
                const shieldVal = String(Math.ceil(sh));
                if (hpBar._shieldText.text !== shieldVal) hpBar._shieldText.text = shieldVal;
            }
        }
        if (sh > 0) {
            try {
                // 满宽基准 = 初始护盾值（破盾时护盾条从满宽递减）；无记录时退回 maxHp
                const maxShield = enemyData?._witherShieldMax || enemyData?.maxHp || 1;
                const w = bw * Math.min(1, sh / maxShield);
                // 轨道底色（半透明深色，圆角+黑色边框与血条一致）
                hpBar._shieldBarBg.clear();
                hpBar._shieldBarBg.roundRect(-bw / 2, bY, bw, sbH, sbH / 2);
                hpBar._shieldBarBg.fill(0x0f172a, 0.55);
                hpBar._shieldBarBg.stroke({ width: 2, color: 0x000000, alpha: 0.8 });
                // 蓝色护盾条（叠加在血条上，覆盖红色，圆角同血条）
                hpBar._shieldBar.clear();
                if (w > 0.5) {
                    hpBar._shieldBar.roundRect(-bw / 2, bY, w, sbH, sbH / 2);
                    hpBar._shieldBar.fill(0x38bdf8, 0.95);
                }
            } catch (e) {
                console.error('[凋零之盾绘制失败]', e);
            }
        }
    }

    const debuffs = enemyData?.debuffs || [];
    if (debuffs.length === 0) return;

    // 收集要显示的图标列表 { skin, count }
    const iconList = [];

    // 1. 普通元素debuff（湿润、灼烧、电流、霜冻）
    for (const [debuffName, skin] of Object.entries(DEBUFF_SKIN_MAP)) {
        if (debuffs.some(d => d.name === debuffName)) {
            // 避免重复添加相同皮肤
            if (!iconList.find(i => i.skin === skin)) {
                iconList.push({ skin, count: 0 });
            }
        }
    }

    // 2. 毒类debuff合并（多种毒合并成一个图标，右上角显示数量）
    const poisonDebuffs = debuffs.filter(d => d.type === 'poison');
    if (poisonDebuffs.length > 0) {
        iconList.push({ skin: 'du', count: poisonDebuffs.length });
    }

    // 3. 洞察破防（弱点debuff）
    const weakDebuff = debuffs.find(d => d.name === '弱点');
    if (weakDebuff) {
        iconList.push({ skin: 'pofang', count: weakDebuff.stack || 0 });
    }

    // 4. 碎甲（护甲降低 armor_down）：buffall 统合皮肤，纯图标，不显示层数与回合
    const armorDownDebuff = debuffs.find(d => d.type === 'armorShred' || d.name === '碎甲' || d.name === 'armor_down');
    if (armorDownDebuff) {
        if (!iconList.find(i => i.skin === 'armor_down')) {
            iconList.push({ skin: 'armor_down', count: 0, useBuffall: true });
        }
    }

    if (iconList.length === 0) return;

    // 排列图标：从左到右，超过宽度换行，最多两行
    let row = 0;
    let colX = -maxWidth / 2; // 从最左边开始
    const rowHeight = iconSize + VH(0.5);

    for (let i = 0; i < iconList.length; i++) {
        const { skin, count, useBuffall } = iconList[i];

        // 检查是否超出行数限制
        if (row >= maxRows) break;

        // 检查当前行是否放得下
        const needWidth = iconSize + iconGap;
        if (colX + needWidth > maxWidth / 2 && colX !== -maxWidth / 2) {
            row++;
            colX = -maxWidth / 2;
            if (row >= maxRows) break;
        }

        // 记录当前位置（闭包保存，避免异步回调时变量已变化）
        const curX = colX;
        const curRow = row;

        // 创建图标 spine（资源已预加载，直接同步操作）
        try {
            // 🛡️ armor_down 等 buffall 皮肤走统合骨骼（已 setSkin + 清轨道），其余走 yuansuicon
            let iconSpine;
            if (useBuffall) {
                iconSpine = createBuffIconSpine(skin);
                if (!iconSpine) continue;
            } else {
                iconSpine = new Spine({
                    skeleton: 'yuansuicon_skel',
                    atlas: 'yuansuicon_atlas',
                    allowMissingRegions: true,
                });
            }

            statusBar.addChild(iconSpine);

            const skeleton = iconSpine.skeleton;
            if (!useBuffall && skeleton && typeof skeleton.setSkinByName === 'function') {
                skeleton.setSkinByName(skin);
            }

            // 静态展示：清空动画轨道（buffall 已在 createBuffIconSpine 内清过）
            if (!useBuffall && iconSpine.state) {
                iconSpine.state.clearTracks();
            }

            // 缩放图标（按宽高较大者归一，所有 buff 视觉大小一致）
            const spineH = iconSpine.height || 1;
            const spineW = iconSpine.width || 1;
            const scale = iconSize / Math.max(spineH, spineW);
            iconSpine.scale.set(scale);

            // 位置
            iconSpine.x = curX + iconSize / 2;
            iconSpine.y = curRow * rowHeight + iconSize / 2;

            // 右上角层数数字
            if (count > 1) {
                const countText = new Text({
                    text: `×${count}`,
                    style: {
                        fill: 0xffffff,
                        fontSize: VH(1.8),
                        fontWeight: 'bold',
                        stroke: { color: 0x000000, width: 2 },
                    }
                });
                countText.anchor.set(0, 0);
                countText.x = curX + iconSize * 0.5;
                countText.y = curRow * rowHeight - VH(0.8);
                statusBar.addChild(countText);
            }

            colX += iconSize + iconGap;
        } catch (e) {
            console.warn('状态栏图标创建失败:', skin, e);
        }
    }
}

// ===========================
// 玩家 Buff 图标容器
// ===========================
let playerBuffContainer = null;
const PLAYER_BUFF_ICON_SIZE = VH(6);   // buff图标大小（缩小）
const PLAYER_BUFF_GAP = VH(2);          // 图标间距（加大）
// 🧪 中毒图标（单独管理：无 spine 皮肤，自绘绿色方块 + ☠，边角显示层数/回合）
let _poisonIcon = null;
let _poisonSeq = 0;              // 🧪 毒挂上时的绝对位置（1=第1格），后续图标自动让位
let _poisonState = null;        // 当前毒状态 { stacks, remaining }（buff 图标重建后重放）
let _lastBuffIconCount = 0;     // 最近一次 buff 图标渲染数量（毒图标排在其后）
let _poisonTexts = [];          // 🧪 毒图标角标数字（挂容器上、不跟随 spine 缩放，避免被 scale 缩小到不可见）

/**
 * 创建 buff/debuff 图标 Spine：buffall 统合皮肤优先（无动画静态），旧天赋皮肤回退 tianfu
 * @param {string} skinName - BUFF_SKIN_MAP 皮肤名
 * @returns {Spine|null}
 */
function createBuffIconSpine(skinName) {
    const tryCreate = (skel, atlas) => {
        try {
            const spine = new Spine({ skeleton: skel, atlas, allowMissingRegions: true });
            const skins = spine.skeleton?.data?.skins?.map(sk => sk.name) || [];
            if (skins.includes(skinName)) {
                spine.skeleton.setSkinByName(skinName);
                // 🎞️ buffall 无动画：清空轨道静态展示
                if (spine.state) spine.state.clearTracks();
                return spine;
            }
            try { spine.destroy?.({ children: true }); } catch (e) { /* ignore */ }
            return null;
        } catch (e) {
            return null;
        }
    };
    return tryCreate('buffall_skel', 'buffall_atlas') || tryCreate('tianfu_skel', 'tianfu_atlas');
}

/**
 * 更新玩家 buff 图标（使用 tianfu 骨骼，通过皮肤名切换）
 * @param {Array} buffs - 玩家 buff 列表
 */
function updatePlayerBuffIcons(buffs) {
    console.log('[buffIcons] 入口收到', buffs?.map(b => b.name + ':' + (b.remaining ?? '?')));
    if (!playerBuffContainer) return;
    if (!buffs || buffs.length === 0) {
        console.log('[buffIcons] 走空数组分支，清空所有 buff 图标');
        // 🧪 清掉残留 buff 图标；毒图标单独管理（排在最后），遇到即停
        while (playerBuffContainer.children.length > 0) {
            const child = playerBuffContainer.children[0];
            if (child === _poisonIcon) break;
            playerBuffContainer.removeChild(child);
            if (child.state && typeof child.state.clearTracks === 'function') {
                try { child.state.clearTracks(); } catch (e) { /* ignore */ }
            }
            child.destroy?.({ children: true });
        }
        _lastBuffIconCount = 0;
        playerBuffContainer.visible = !!_poisonIcon; // 有毒图标则保持可见，否则隐藏
        return;
    }

    // 过滤出有对应皮肤的 buff，如果没有可显示的 buff 则隐藏容器
    let visibleBuffs = buffs.filter(b => BUFF_SKIN_MAP[b.name]);
    // 📊 按 skinName 去重：同类属性提升（如多个加攻击的 buff）只显示一个聚合图标
    const seenSkins = new Set();
    visibleBuffs = visibleBuffs.filter(b => {
        const skin = BUFF_SKIN_MAP[b.name];
        if (seenSkins.has(skin)) return false;
        seenSkins.add(skin);
        return true;
    });
    console.log('[buffIcons] visibleBuffs =', visibleBuffs.map(b => b.name));
    if (visibleBuffs.length === 0) {
        console.log('[buffIcons] 走 visibleBuffs 空分支');
        // 清掉可能残留的 buff 图标（毒图标单独管理，不在这里清理）
        while (playerBuffContainer.children.length > 0) {
            const child = playerBuffContainer.children[0];
            if (child === _poisonIcon) break;
            playerBuffContainer.removeChild(child);
            if (child.state && typeof child.state.clearTracks === 'function') {
                try { child.state.clearTracks(); } catch (e) { /* ignore */ }
            }
            child.destroy?.({ children: true });
        }
        _lastBuffIconCount = 0;
        playerBuffContainer.visible = true; // 毒图标可能存在，容器保持可见
        return;
    }
    _lastBuffIconCount = visibleBuffs.length;
    playerBuffContainer.visible = true;

    // 清空旧图标
    while (playerBuffContainer.children.length > 0) {
        const child = playerBuffContainer.children[0];
        // 🧪 毒图标单独管理（排在最后），遇到即停，避免被清掉
        if (child === _poisonIcon) break;
        playerBuffContainer.removeChild(child);
        // ⚠️ 先清除 Spine 动画轨道，再彻底销毁，避免 Spine 内部资源泄漏
        if (child.state && typeof child.state.clearTracks === 'function') {
            try { child.state.clearTracks(); } catch (e) { /* ignore */ }
        }
        child.destroy?.({ children: true });
    }

    const iconSize = PLAYER_BUFF_ICON_SIZE;
    const iconGap = PLAYER_BUFF_GAP;
    // 🎯 单行 + 不超出血条宽度（玩家血条约 VW 22）：放不下的 buff 不显示
    const maxIcons = Math.max(1, Math.floor((VW(22) + iconGap) / (iconSize + iconGap)));
    visibleBuffs = visibleBuffs.slice(0, maxIcons);

    // 📐 正序渲染：先添加的 buff 排左，后添加的往右排
    visibleBuffs.forEach((buff, index) => {
        const skinName = BUFF_SKIN_MAP[buff.name];
        if (!skinName) return;

        // 🧪 按添加先后占位：毒插在 _poisonSeq 位，减速组插在 _slowBase 位，buff 自动让位
        const poisonOff = (_poisonIcon && index >= _poisonSeq - 1) ? 1 : 0;
        const slowOff = (_slowState.length && index >= _slowBase) ? _slowState.length : 0;
        const x = (index + poisonOff + slowOff) * (iconSize + iconGap) + iconSize / 2;
        const y = iconSize / 2;

        try {
            // 🎞️ buffall 优先（统合 buff/debuff 皮肤），旧天赋皮肤回退 tianfu
            const iconSpine = createBuffIconSpine(skinName);
            if (!iconSpine) { console.warn('[buffIcons] 创建失败:', skinName, buff.name); return; }

            playerBuffContainer.addChild(iconSpine);

            // 缩放图标
            // 📐 显式更新世界变换后按 bounds 缩放，保证不同皮肤图标高度/宽度统一
            try { iconSpine.state?.update?.(0); iconSpine.skeleton?.updateWorldTransform?.(); } catch (e) {}
            const bnd = iconSpine.getBounds ? iconSpine.getBounds() : { width: iconSize, height: iconSize };
            const scale = Math.min(iconSize / Math.max(bnd.height, 1), iconSize / Math.max(bnd.width, 1));
            iconSpine.scale.set(scale);

            // 位置
            iconSpine.x = x;
            iconSpine.y = y;

            // 🖱️ 点击 buff 图标 → 弹出 buff 详情 Popover（加 hitArea 确保 Spine 静态皮肤可点）
            iconSpine.eventMode = 'static';
            iconSpine.cursor = 'pointer';
            iconSpine.hitArea = new Rectangle(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
            iconSpine.on('pointertap', () => {
                emitter.emit('playerBuffTap');
            });
            // ✅ 纯增益类（攻击力提升 allStats / 火元素伤害 fireBoost）：不显示层数与回合数
            const noCount = buff.type === 'allStats' || buff.type === 'fireBoost' || buff.type === 'thunderBoost' || buff.type === 'waterBoost' || buff.type === 'iceBoost';
            // ✅ 右下角：剩余回合数（已隐藏，不显示数字）
            // const roundLeft = buff.remaining ?? buff.stack ?? 0;
            // if (!noCount && roundLeft >= 1 && roundLeft <= 10) {
            //     const stackText = new Text({
            //         text: ``,
            //         style: {
            //             fill: 0xffffff,
            //             fontSize: VH(1.6),
            //             fontWeight: 'bold',
            //             stroke: { color: 0x000000, width: 2 },
            //         }
            //     });
            //     stackText.anchor.set(0, 1); // 右下锚点
            //     stackText.x = x + iconSize / 2 - VH(0.5);
            //     stackText.y = y + iconSize / 2 - VH(0.2);
            //     playerBuffContainer.addChild(stackText);
            // }

            // ✅ 右上角：持续回合数（已隐藏，不显示数字）
            // const remaining = buff.remaining;
            // if (!noCount && remaining !== undefined && remaining > 0 && remaining <= 10 && !buff.isPermanent) {
            //     const durationText = new Text({
            //         text: ``,
            //         style: {
            //             fill: 0xffcc00,
            //             fontSize: VH(1.6),
            //             fontWeight: 'bold',
            //             stroke: { color: 0x000000, width: 2 },
            //         }
            //     });
            //     durationText.anchor.set(1, 0); // 右上锚点
            //     durationText.x = x + iconSize / 2 - VH(1.5);
            //     durationText.y = y - iconSize / 2 + VH(0.1);
            //     playerBuffContainer.addChild(durationText);
            // }
        } catch (e) {
            console.warn('玩家buff图标创建失败:', buff.name, skinName, e);
        }
    });

    // 🧪 重建后重放中毒图标（若存在）
    if (_poisonState) {
        updatePlayerPoisonIcon(_poisonState.stacks, _poisonState.remaining);
    }
}

// 🧪 中毒图标：绿色方块 + ☠，与 buff 图标同排同尺寸，右下角层数 / 右上角剩余回合
function updatePlayerPoisonIcon(stacks, remaining) {
    _poisonState = (stacks > 0) ? { stacks, remaining } : null;
    if (!playerBuffContainer) return;

    // 移除旧毒图标
    if (_poisonIcon) {
        try { playerBuffContainer.removeChild(_poisonIcon); } catch (e) { /* ignore */ }
        try { _poisonIcon.destroy?.({ children: true }); } catch (e) { /* ignore */ }
        _poisonIcon = null;
    }
    // 清理上一轮角标数字（挂容器上，需手动移除）
    for (const t of _poisonTexts) {
        try { playerBuffContainer.removeChild(t); } catch (e) { /* ignore */ }
        try { t.destroy?.(); } catch (e) { /* ignore */ }
    }
    _poisonTexts = [];
    // 🧪 毒清空时重置位置标记，下次重新挂毒重新分配
    if (!_poisonState) {
        _poisonSeq = 0;
        return;
    }

    // 🧪 首次挂毒（_poisonSeq 为 0）：记录毒挂上时的绝对位置（当时图标总数 + 1）
    // ⚠️ 不能依赖 _poisonIcon 判断：重建时旧图标已被销毁置 null
    if (_poisonSeq === 0) {
        _poisonSeq = _lastBuffIconCount + _slowIcons.length + 1;
    }

    playerBuffContainer.visible = true; // 🧪 有毒就显示（可能此前被 buff 更新隐藏）

    // 🧪 毒图标比普通 buff 图标小一圈
    const iconSize = PLAYER_BUFF_ICON_SIZE; // 统一所有 buff/毒/减速图标尺寸
    const iconGap = PLAYER_BUFF_GAP;
    // 🧪 毒固定在挂上时的位置（_poisonSeq 格），后续 buff/减速自动让位
    const x = (_poisonSeq - 1) * (iconSize + iconGap) + iconSize / 2;
    const y = iconSize / 2;
    // 🔢 角标数字样式（后续各种 debuff/buff 图标复用：调 fontSize / fill 换主题）
    const stackStyle = {   // 层数：白色
        fill: 0xffffff,
        fontSize: VH(2.2),
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 },
    };
    const durationStyle = { // 回合数：黄色
        fill: 0xffcc00,
        fontSize: VH(2.2),
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 },
    };

    try {
        // 🧪 优先使用 buffall 统合皮肤（poison_debuff），无皮肤时回退自绘绿方块
        const iconSpine = createBuffIconSpine('poison_debuff');
        if (iconSpine) {
            // 📐 显式更新世界变换后按 bounds 缩放，保证不同皮肤图标高度/宽度统一
            try { iconSpine.state?.update?.(0); iconSpine.skeleton?.updateWorldTransform?.(); } catch (e) {}
            const bnd = iconSpine.getBounds ? iconSpine.getBounds() : { width: iconSize, height: iconSize };
            const scale = Math.min(iconSize / Math.max(bnd.height, 1), iconSize / Math.max(bnd.width, 1));
            iconSpine.scale.set(scale);
            iconSpine.x = x;
            iconSpine.y = y;
            playerBuffContainer.addChild(iconSpine);
            _poisonIcon = iconSpine;
            iconSpine.eventMode = 'static';
            iconSpine.cursor = 'pointer';
            iconSpine.hitArea = new Rectangle(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
            iconSpine.on('pointertap', () => { emitter.emit('playerBuffTap'); });
            // 🔢 角标数字挂容器（不跟随 spine 缩放，避免被 scale 缩小不可见），
            //    共用同一竖线（X 轴一致），垂直上下错开（Y 轴不一致）
            const numX = x + iconSize / 2 + VH(0.5);
            if (remaining !== undefined && remaining > 0) {
                const durationText = new Text({
                    text: `${remaining}`,
                    style: { ...durationStyle },
                });
                durationText.anchor.set(0.5, 0.5);
                durationText.x = numX;
                durationText.y = y - iconSize / 2 - VH(0.05);
                playerBuffContainer.addChild(durationText);
                _poisonTexts.push(durationText);
            }
            if (stacks >= 1) {
                const stackText = new Text({
                    text: `${stacks}`,
                    style: { ...stackStyle },
                });
                stackText.anchor.set(0.5, 0.5);
                stackText.x = numX;
                stackText.y = y + iconSize / 2 + VH(0.05);
                playerBuffContainer.addChild(stackText);
                _poisonTexts.push(stackText);
            }
            _poisonIcon = iconSpine;
            return;
        }
        // 绿色方块底 + ☠ 符号
        const g = new Graphics()
            .roundRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6)
            .fill({ color: 0x0d2412, alpha: 0.92 })
            .stroke({ color: 0x4ade80, width: 2 });
        const skull = new Text({
            text: '☠',
            style: {
                fill: 0x4ade80,
                fontSize: iconSize * 0.6,
                fontWeight: 'bold',
                stroke: { color: 0x000000, width: 2 },
            }
        });
        skull.anchor.set(0.5, 0.5);
        g.addChild(skull);
        g.x = x;
        g.y = y;
        playerBuffContainer.addChild(g);

        // 🔢 两个角标数字共用同一竖线（X 轴一致），垂直上下错开（Y 轴不一致）
        const numX = iconSize / 2 + VH(0.5);   // 图标右外侧同一竖线

        // 回合数：右上角外侧（贴顶，比之前降低）
        if (remaining !== undefined && remaining > 0) {
            const durationText = new Text({
                text: `${remaining}`,
                style: { ...durationStyle },
            });
            durationText.anchor.set(0.5, 0.5);
            durationText.x = numX;
            durationText.y = -iconSize / 2 - VH(0.05);   // 贴近上边缘外侧
            g.addChild(durationText);
        }

        // 层数：右下角外侧（贴底，与回合数 X 一致）；1 层也显示
        if (stacks >= 1) {
            const stackText = new Text({
                text: `${stacks}`,
                style: { ...stackStyle },
            });
            stackText.anchor.set(0.5, 0.5);
            stackText.x = numX;
            stackText.y = iconSize / 2 + VH(0.05);       // 贴近下边缘外侧
            g.addChild(stackText);
        }
        _poisonIcon = g;
    } catch (e) {
        console.warn('中毒图标创建失败:', e);
        _poisonIcon = null;
    }
}

// 🐢 玩家减速 debuff 图标（同中毒布局：蓝色方块 + 🐢，右上回合数/右下层数，无文字）
let _slowIcons = [];
let _slowState = [];             // 🐢 当前减速列表（布局计算用）
let _slowBase = 0;               // 🐢 减速组挂上时的起点位置（固定，后续图标让位）
function updatePlayerSlowIcons(slows) {
    if (!playerBuffContainer) return;
    _slowState = slows || [];
    // 🐢 清空时重置起点标记，下次重新挂减速重新分配
    if (!slows || slows.length === 0) {
        _slowBase = 0;
    } else if (_slowBase === 0) {
        // 🐢 首次挂减速：起点位置 = 当时图标总数（buff + 毒占位）
        _slowBase = _lastBuffIconCount + (_poisonIcon ? 1 : 0);
    }
    for (const ic of _slowIcons) {
        try { if (ic.parent === playerBuffContainer) playerBuffContainer.removeChild(ic); } catch (e) { /* ignore */ }
        try { ic.destroy?.({ children: true }); } catch (e) { /* ignore */ }
    }
    _slowIcons = [];
    if (!slows || slows.length === 0) {
        // 没有减速时，若容器空则隐藏（中毒/buff 图标存在则保持可见）
        if (playerBuffContainer.children.length === 0) playerBuffContainer.visible = false;
        return;
    }
    playerBuffContainer.visible = true;
    const iconSize = PLAYER_BUFF_ICON_SIZE; // 统一所有 buff/毒/减速图标尺寸
    const iconGap = PLAYER_BUFF_GAP;
    // 🧪 减速组固定在挂上时的起点（_slowBase），后续 buff/毒不挤占
    const baseIdx = _slowBase;
    slows.forEach((d, i) => {
        const x = (baseIdx + i) * (iconSize + iconGap) + iconSize / 2;
        const y = iconSize / 2;
        const stacks = d.stacks ?? 1;
        // 🐢 优先使用 buffall 统合皮肤（slow_debuff），无皮肤时回退自绘蓝方块
        const iconSpine = createBuffIconSpine('slow_debuff');
        if (iconSpine) {
            // 📐 显式更新世界变换后按 bounds 缩放，保证不同皮肤图标高度/宽度统一
            try { iconSpine.state?.update?.(0); iconSpine.skeleton?.updateWorldTransform?.(); } catch (e) {}
            const bnd = iconSpine.getBounds ? iconSpine.getBounds() : { width: iconSize, height: iconSize };
            const scale = Math.min(iconSize / Math.max(bnd.height, 1), iconSize / Math.max(bnd.width, 1));
            iconSpine.scale.set(scale);
            iconSpine.x = x;
            iconSpine.y = y;
            // 角标数字共用右外侧竖线（同中毒图标）
            const numX = iconSize / 2 + VH(0.5);
            if (d.remaining !== undefined && d.remaining > 0) {
                const rt = new Text({
                    text: `${d.remaining}`,
                    style: { fill: 0xffcc00, fontSize: VH(2.2), fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } },
                });
                rt.anchor.set(0.5, 0.5);
                rt.x = numX;
                rt.y = -iconSize / 2 - VH(0.05);
                iconSpine.addChild(rt);
            }
            if (stacks > 0) {
                const st = new Text({
                    text: `${stacks}`,
                    style: { fill: 0xffffff, fontSize: VH(2.2), fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } },
                });
                st.anchor.set(0.5, 0.5);
                st.x = numX;
                st.y = iconSize / 2 + VH(0.05);
                iconSpine.addChild(st);
            }
            playerBuffContainer.addChild(iconSpine);
            _slowIcons.push(iconSpine);
            iconSpine.eventMode = 'static';
            iconSpine.cursor = 'pointer';
            iconSpine.hitArea = new Rectangle(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
            iconSpine.on('pointertap', () => { emitter.emit('playerBuffTap'); });
            return;
        }
        const g = new Graphics()
            .roundRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6)
            .fill({ color: 0x0c1c2e, alpha: 0.92 })
            .stroke({ color: 0x38bdf8, width: 2 });
        const mark = new Text({
            text: '🐢',
            style: { fill: 0x38bdf8, fontSize: iconSize * 0.6, fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } }
        });
        mark.anchor.set(0.5, 0.5);
        g.addChild(mark);
        g.x = x;
        g.y = y;
        playerBuffContainer.addChild(g);
        // 角标数字共用右外侧竖线（同中毒图标）
        const numX = iconSize / 2 + VH(0.5);
        // 右上角：剩余回合数（黄色）
        if (d.remaining !== undefined && d.remaining > 0) {
            const rt = new Text({
                text: `${d.remaining}`,
                style: { fill: 0xffcc00, fontSize: VH(2.2), fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } }
            });
            rt.anchor.set(0.5, 0.5);
            rt.x = numX;
            rt.y = -iconSize / 2 - VH(0.05);
            g.addChild(rt);
        }
        // 右下角：层数（白色）
        if (stacks > 0) {
            const st = new Text({
                text: `${stacks}`,
                style: { fill: 0xffffff, fontSize: VH(2.2), fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } }
            });
            st.anchor.set(0.5, 0.5);
            st.x = numX;
            st.y = iconSize / 2 + VH(0.05);
            g.addChild(st);
        }
        _slowIcons.push(g);
    });
}

// 更新血条填充比例（带平滑过渡动画）
function updateHpBarFill(hpBar, ratio) {
    // 防御：血条已销毁直接返回
    if (!hpBar || !hpBar._fill || hpBar.destroyed) return;

    const safeRatio = Math.max(0, Math.min(1, ratio));
    const barWidth = hpBar._barWidth;
    const barHeight = VH(1.8);
    const halfBar = barHeight / 2;

    // 立即更新即时血条（亮红色）
    hpBar._fill.clear();
    if (safeRatio > 0) {
        hpBar._fill.roundRect(-barWidth / 2, -halfBar, barWidth * safeRatio, barHeight, halfBar);
        hpBar._fill.fill(0xff3333);
    }

    // 取消之前的延迟动画
    if (hpBar._animationId) {
        gsap.killTweensOf(hpBar);
    }

    // 使用gsap平滑过渡延迟血条（深红色拖尾效果）
    hpBar._currentRatio = safeRatio;
    hpBar._animationId = gsap.to(hpBar, {
        _delayedRatio: safeRatio,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => {
            const dr = hpBar._delayedRatio;
            // 🔒 防御：血条可能在动画过程中被销毁
            if (!hpBar._delayedFill || hpBar.destroyed) return;
            hpBar._delayedFill.clear();
            if (dr > 0) {
                hpBar._delayedFill.roundRect(-barWidth / 2, -halfBar, barWidth * dr, barHeight, halfBar);
                hpBar._delayedFill.fill(0x8b0000);
            }
        }
    });
}

// ===========================
// 创建单个敌人 Spine + 血条
// ===========================
function createEnemySpine(spineName, index, totalCount, enemyData) {
    const spine = new Spine({
        skeleton: `${spineName}_skel`,
        atlas: `${spineName}_atlas`,
        allowMissingRegions: true,
    });

    // 调整大小：目标高度更大，再乘以怪物配置的缩放倍率
    const baseScale = ENEMY_TARGET_HEIGHT / (spine.height || 100);
    const customScale = enemyData?.spineScale ?? 1;
    spine.scale.set(baseScale * customScale);

    // 设置透明度
    spine.alpha = enemyData?.spineAlpha ?? 1;

    // 右侧对齐排列（从最右侧往左排）
    // rowOffsetVW：整排怪物 X 偏移（vw 单位，由 renderEnemies 传入第一个敌人的配置），
    // 所有怪物跟随第一个一起偏移（负值往左，正值往右）
    const rowOffsetVW = enemyData?.rowOffsetVW ?? 0;
    const xOffset = ENEMY_RIGHT_FIXED - (totalCount - index - 1) * ENEMY_SPACING + VW(rowOffsetVW);
    // 📍 Y 轴偏移：怪物配置 yOffsetVH（vh 单位，正数=往下，负数=往上），
    //    默认 ENEMY_Y = VH(85) 脚底位置
    const yOffsetVH = enemyData?.yOffsetVH ?? 0;
    spine.position.set(xOffset, ENEMY_Y + VH(yOffsetVH));
    spine.zIndex = 0; // 敌人spine在最底层

    // 水平翻转：朝左（面向玩家），用 scale.x 取反确保翻转生效
    //   flipX 配置：怪物配置里 flipX:false 时保持美术原始方向（骨骼本身朝左时用，如空心布偶 buou）
    const flipX = enemyData?.flipX ?? true;
    spine.scale.x = (flipX ? -1 : 1) * Math.abs(spine.scale.x);
    spine.direction = -1;
    if (typeof spine.setDirection === 'function') {
        spine.setDirection(-1);
    }

    // 播放待机动画：战斗中默认 fight 动画
    // ⚠️ 不能退回 animations[0]，若骨骼第一个动画是 attack（如风息），
    //    会导致敌人从进战斗起就一直在循环播放攻击动画
    // ⚠️ 战斗中待机优先 fight（idle 仅在非战斗场景用）；没有 fight 再找 idle / 第一个非 attack 兜底
    const animations = spine.skeleton.data.animations || [];
    const idleName = animations.some(a => a.name === 'idle') ? 'idle' : (animations.find(a => a.name !== 'attack')?.name || animations[0]?.name);
    const hasRuchang = animations.some(a => a.name === 'ruchang');
    // 👑 boss 二阶段切换时不播 ruchang（二阶段入场动画由 switchEnemyPhase2Spine 单独处理）
    const _skipRuchang = enemyData._phase2JustEntered || (enemyData._phase2Data && enemyData._phase2);
    if (hasRuchang && !_skipRuchang) {
        // 🎬 开局隐藏敌人，1 秒后显示并播 ruchang（0.5 倍速），播完切 idle 循环
        spine._ruchangLock = true; // 🔒 直接挂在 spine 上，battle.js 能读到
        spine.visible = false; // 先隐藏
        spine.state.setAnimation(0, idleName, true); // 预加载 idle 姿势
        setTimeout(() => {
            if (!spine.state) { enemyData._ruchangPlaying = false; return; }
            spine.visible = true; // 显示敌人
            const _enterDone = { complete: (e) => {
                if (e.animation?.name === "ruchang") {
                    spine.state.removeListener("complete", _enterDone.complete);
                    spine.state.timeScale = 1.0;
                    spine.state.setAnimation(0, idleName, true);
                    // 🩸 ruchang 播完显示血条
                    if (hpBar) { hpBar.visible = true; }
                    // 🛡️ 再等 2 秒才解锁行动，期间不能攻击
                    setTimeout(() => { spine._ruchangLock = false; }, 200);
                }
            }};
            spine.state.addListener(_enterDone);
            spine.state.timeScale = 0.5; // 0.5 倍速播 ruchang
            spine.state.setAnimation(0, "ruchang", false);
        }, 400);
    } else if (idleName) {
        spine.state.setAnimation(0, idleName, true);
    }

    // 👤 脚下阴影：椭圆半透明，位于脚底（随敌人 spine 同 x，尺寸按实际高度比例）
    const shadow = new Graphics()
      .ellipse(0, 0, ENEMY_TARGET_HEIGHT * customScale * 0.3, ENEMY_TARGET_HEIGHT * customScale * 0.065)
      .fill({ color: 0x000000, alpha: 0.3 });
    shadow.position.set(spine.x, ENEMY_Y + VH(yOffsetVH) + ENEMY_TARGET_HEIGHT * customScale * 0.02);
    shadow.zIndex = -1; // 在敌人 spine 下方

    // 创建血条
    const hpBar = createEnemyHpBar(enemyData || { hp: 100, maxHp: 100 }, spine);
    // 🩸 有 ruchang 的敌人：血条在 ruchang 播完前隐藏
    if (hasRuchang) { hpBar.visible = false; }

    return { spine, hpBar, shadow };
}

// ===========================
// 渲染全部敌人
// ===========================
function renderEnemies(spineNames, enemiesData) {
    if (!app || !enemyContainer) return;

    isRenderingEnemies = true;

    // 清空旧的
    enemySpineList.forEach(item => {
        // 🧊 先回收残留的冻结特效，防止重新渲染后残留
        if (item._freezeFx) {
            try { returnEffect('dongjie', item._freezeFx); } catch (e) { /* ignore */ }
            item._freezeFx = null;
        }
        // 先清理所有 gsap 动画，避免销毁后回调还在执行导致报错
        gsap.killTweensOf(item.hpBar);
        gsap.killTweensOf(item.spine);
        gsap.killTweensOf(item.spine.scale);

        enemyContainer.removeChild(item.spine);
        enemyContainer.removeChild(item.hpBar);

        // ✅ Spine 必须加 texture: false，防止销毁共用图集贴图
        item.spine.destroy({ children: true, texture: false });
        // 血条是普通容器，保持原样即可
        item.hpBar.destroy({ children: true });
        // 脚下阴影
        if (item.shadow) { gsap.killTweensOf(item.shadow); item.shadow.destroy({ children: true }); }
    });
    enemySpineList = [];
    enemyHpBarList = [];

    if (!spineNames || spineNames.length === 0) {
        isRenderingEnemies = false;
        return;
    }

    const total = spineNames.length;
    // 整排偏移：取第一个敌人的 xOffsetVW，所有怪物跟随第一个一起偏移（注入 rowOffsetVW 统一应用）
    const rowOffsetVW = enemiesData?.[0]?.xOffsetVW ?? 0;
    spineNames.forEach((name, i) => {
        const enemyData = enemiesData?.[i] || { hp: 100, maxHp: 100 };
        // 👑 二阶段敌人：用二阶段皮肤（_phase2Data.spineKey）
        // 🎥 变身演出窗口（镜头特写 1.5s）内全量重建：保持旧皮肤、不播 ruchang，
        //    换皮+ruchang 由 handleBossPhase2Spine 定时在 1500ms 后执行（switchEnemyPhase2Spine）
        const p2Pending = enemyData._phase2Data && enemyData._phase2 && enemyData._phase2JustEntered
            && (performance.now() - (enemyData._phase2EnteredAt || 0)) < 1500;
        let spineName = name;
        if (enemyData._phase2Data && enemyData._phase2 && !p2Pending) {
            spineName = enemyData._phase2Data.spineKey || name;
        }
        const { spine, hpBar, shadow } = createEnemySpine(spineName, i, total, { ...enemyData, rowOffsetVW });
        // 🩸 变身演出窗口内全量重建：隐藏 boss 血条（handleBossPhase2Spine 隐藏的旧血条被销毁重建，
        //    这里同步隐藏新血条），ruchang 播完由 switchEnemyPhase2Spine 的 complete 恢复显示
        if (p2Pending) {
            hpBar.visible = false;
            hpBar.alpha = 0;
        }
        // 👑 二阶段刚变身（全量重建打断变身动画）：重播 ruchang → idle 循环
        if (enemyData._phase2Data && enemyData._phase2 && enemyData._phase2JustEntered && !p2Pending) {
            // 🩸 演出兜底：隐藏血条，ruchang 播完再显示
            hpBar.visible = false;
            hpBar.alpha = 0;
            const p2 = enemyData._phase2Data;
            const anims = spine.skeleton?.data?.animations || [];
            const enterAnim = p2.enterAnim || 'ruchang';
            const idleAnim = p2.idleAnim || 'idle';
            const hasEnter = anims.some(a => a.name === enterAnim);
            const backAnim = anims.some(a => a.name === idleAnim) ? idleAnim
                : (anims.some(a => a.name === 'idle') ? 'idle'
                    : (anims.find(a => a.name !== 'attack')?.name || anims[0]?.name));
            if (hasEnter && backAnim) {
                spine.state.timeScale = 0.4; // 👑 入场动画单独慢放 0.4 倍速
                spine.state.setAnimation(0, enterAnim, false);
                // 🛡️ 入场动画播完 → 解除变身无敌（emit 给 battle.js）
                const _enterListener = {
                    complete: (entry) => {
                        if (entry.animation?.name === enterAnim) {
                            spine.state.removeListener('complete', _enterListener.complete)
                            spine.state.timeScale = 1.0; // 恢复正常速度
                            hpBar.visible = true;
                            hpBar.alpha = 1;
                            try { emitter.emit('phase2EnterDone', { enemyUid: enemyData.uid }) } catch (e) { /* ignore */ }
                        }
                    }
                }
                spine.state.addListener(_enterListener);
                spine.state.addAnimation(0, backAnim, true, 0);
            } else if (backAnim) {
                spine.state.setAnimation(0, backAnim, true);
            }
            enemyData._phase2JustEntered = false;
        }
        // 🎪 入场动画：配置了 enterAnim 的敌人（空心布偶/诅咒布偶）出场先播 ruchang → 再切待机循环
        if (enemyData.enterAnim && enemyData._enterAnimPending) {
            // 🎥 暗影王二阶段：召唤布偶的 ruchang 跟随 boss 在镜头特写后（变身 1500ms 时刻）
            //    一起播，不提前（boss 换皮+ruchang 由 handleBossPhase2Spine 定时执行）
            let delayMs = 0;
            if (enemyData._sourceUid) {
                const boss = enemiesData.find(e => e && e.uid === enemyData._sourceUid);
                if (boss && boss._phase2Data && boss._phase2 && boss._phase2JustEntered && boss._phase2EnteredAt) {
                    const el = performance.now() - boss._phase2EnteredAt;
                    if (el < 1500) delayMs = 1500 - el;
                }
            }
            // 🎭 演出窗口内先隐藏布偶本体（不提前暴露），播入场动画时才显示；
            //    血条统一隐藏，ruchang 播完才显示（与暗影王一致）
            if (delayMs > 0) {
                spine.visible = false;
                spine.alpha = 0;
                if (shadow) { shadow.visible = false; shadow.alpha = 0; }
            }
            if (hpBar) { hpBar.visible = false; hpBar.alpha = 0; }
            const playEnter = () => {
                // 🎯 全量重建会销毁旧 spine：执行时按 uid 重新定位
                const item = enemySpineList.find(it => it.data?.uid === enemyData.uid && it.spine);
                const s = item?.spine;
                if (!s) { enemyData._enterAnimPending = false; return; }
                // 🎭 隐藏期结束：显示本体+阴影（血条保持隐藏），播 ruchang 入场，播完才显示血条
                s.visible = true;
                s.alpha = 1;
                if (item.shadow) { item.shadow.visible = true; item.shadow.alpha = 1; }
                const anims2 = s.skeleton?.data?.animations || [];
                const hasEnter2 = anims2.some(a => a.name === enemyData.enterAnim);
                const backAnim2 = anims2.some(a => a.name === 'idle') ? 'idle'
                    : (anims2.some(a => a.name === 'idle') ? 'idle'
                        : (anims2.find(a => a.name !== 'attack' && a.name !== enemyData.enterAnim)?.name || anims2[0]?.name));
                if (hasEnter2 && backAnim2) {
                    // 🐢 ruchang 播放速度：召唤布偶 0.35，其余默认 0.5（enterTimeScale 可配置）
                    s.state.timeScale = enemyData.enterTimeScale ?? 0.5;
                    s.state.setAnimation(0, enemyData.enterAnim, false);
                    const _listener = {
                        complete: (entry) => {
                            if (entry.animation?.name === enemyData.enterAnim) {
                                s.state.removeListener('complete', _listener.complete);
                                s.state.timeScale = 1.0; // 恢复正常速度
                                // 🩸 ruchang 播完：显示血条（与暗影王一致）
                                if (item.hpBar) { item.hpBar.visible = true; item.hpBar.alpha = 1; }
                            }
                        }
                    };
                    s.state.addListener(_listener);
                    s.state.addAnimation(0, backAnim2, true, 0);
                } else {
                    // 骨骼没有 ruchang 动画：直接显示血条
                    if (item.hpBar) { item.hpBar.visible = true; item.hpBar.alpha = 1; }
                }
                enemyData._enterAnimPending = false;
            };
            if (delayMs > 0) {
                setTimeout(playEnter, delayMs);
            } else {
                playEnter();
            }
        }
        // 🎯 死亡敌人（hp<=0）仍保留在 enemies 数组（hp 置 0 未移除），必须继续创建
        //    spine 以保持 enemySpineList 与 enemiesData 索引对齐（setEnemySpineList 按索引对应，
        //    跳过会导致后续按索引取 spine 全部错位），但立即隐藏 spine 和血条：
        //    ⚠️ 召唤触发全量重建时若不隐藏，死亡暗影的 spine 会被重新创建显示出来，
        //    造成「击杀 2 个暗影后召唤 2 个，屏幕上却出现 4 个暗影」的假象
        if (enemyData.hp !== undefined && enemyData.hp <= 0) {
            spine.visible = false;
            spine.alpha = 0;
            hpBar.visible = false;
            hpBar.alpha = 0;
            if (shadow) { shadow.visible = false; shadow.alpha = 0; }
        }
        enemyContainer.addChild(shadow, spine, hpBar);
        enemySpineList.push({
            spine, hpBar, shadow, data: enemyData,
            // 👑 二阶段标记：已换皮（anyingwang1），switchEnemyPhase2Spine 据此跳过，避免打断 ruchang
            _phase2Skin: !!(enemyData._phase2Data && enemyData._phase2 && !p2Pending),
        });
        enemyHpBarList.push(hpBar);
    });

    // 同步敌人 spine 列表到战斗逻辑，用于播放攻击动画
    setEnemySpineList(enemySpineList, enemiesData);

    isRenderingEnemies = false;
}

// ===========================
// 👑 暗影王二阶段 spine 切换
// ===========================
function switchEnemyPhase2Spine(idx) {
    if (!enemyContainer || idx < 0 || idx >= enemySpineList.length) return
    const old = enemySpineList[idx]
    if (!old || !old.spine) return
    const enemyData = old.data || {}
    const p2 = enemyData._phase2Data
    if (!p2) return // 🛡️ 非二阶段敌人不允许切皮（防御：防止布偶被误切）
    // 🛡️ 已换皮（全量重建时已是 anyingwang1 并播放 ruchang）→ 跳过，避免打断入场动画
    if (old._phase2Skin) return
    const spineName = p2.spineKey || 'anyingwang1'
    const enterAnim = p2.enterAnim || 'ruchang'
    const idleAnim = p2.idleAnim || 'idle'
    const total = enemySpineList.length

    // 1. 回收旧 spine（血条/阴影一并清理，createEnemySpine 会新建全套）
    gsap.killTweensOf(old.spine)
    gsap.killTweensOf(old.spine.scale)
    enemyContainer.removeChild(old.spine)
    old.spine.destroy({ children: true, texture: false })
    if (old.hpBar) { gsap.killTweensOf(old.hpBar); enemyContainer.removeChild(old.hpBar); old.hpBar.destroy({ children: true }) }
    if (old.shadow) { gsap.killTweensOf(old.shadow); old.shadow.destroy({ children: true }) }

    // 2. 用二阶段皮肤重建（同索引同位置）
    const created = createEnemySpine(spineName, idx, total, {
        ...enemyData,
        isBoss: p2.isBoss ?? enemyData.isBoss, // 👑 二阶段同样是 Boss：血条固定屏幕顶部中心
        spineScale: p2.spineScale ?? enemyData.spineScale,
        rowOffsetVW: enemyData.rowOffsetVW ?? 0,
        flipX: enemyData.flipX ?? true,
    })
    enemyContainer.addChild(created.shadow, created.spine, created.hpBar)
    // 🩸 演出中：新血条保持隐藏（变换身时已隐藏旧血条），ruchang 播完再显示
    created.hpBar.visible = false
    created.hpBar.alpha = 0

    // 3. 入场动画 ruchang（非循环）→ 播完接 idle/fight 循环
    created.spine.state.timeScale = 0.35; // 👑 二阶段动画播放速度 0.25（配合慢动作）
    const anims = created.spine.skeleton?.data?.animations || []
    const hasEnter = anims.some(a => a.name === enterAnim)
    const backAnim = anims.some(a => a.name === idleAnim) ? idleAnim
        : (anims.some(a => a.name === 'idle') ? 'idle'
            : (anims.find(a => a.name !== 'attack')?.name || anims[0]?.name))
    if (hasEnter && backAnim) {
        created.spine.state.setAnimation(0, enterAnim, false)
        // 🛡️ 入场动画播完 → 解除变身无敌（emit 给 battle.js）
        const _enterListener = {
            complete: (entry) => {
                if (entry.animation?.name === enterAnim) {
                    created.spine.state.removeListener('complete', _enterListener.complete)
                    created.spine.state.timeScale = 1.0; // 恢复正常速度
                    // 🩸 入场动画播完：显示 boss 血条
                    created.hpBar.visible = true
                    created.hpBar.alpha = 1
                            try { emitter.emit('phase2EnterDone', { enemyUid: enemyData.uid }) } catch (e) { /* ignore */ }
                }
            }
        }
        created.spine.state.addListener(_enterListener)
        created.spine.state.addAnimation(0, backAnim, true, 0)
    } else if (backAnim) {
        created.spine.state.setAnimation(0, backAnim, true)
    }

    // 4. 替换列表引用（血条/阴影同步，后续 hp 更新按新索引）
    enemySpineList[idx] = { spine: created.spine, hpBar: created.hpBar, shadow: created.shadow, data: enemyData, _phase2Skin: true }
    enemyHpBarList[idx] = created.hpBar
    // 🎬 换皮完成：清除演出窗口标记，后续全量重建直接用新皮肤
    enemyData._phase2JustEntered = false
}
let _phase2SpineTimer = null
function handleBossPhase2Spine({ enemyUid } = {}) {
    if (!enemySpineList || enemyUid === undefined) return
    // 🩸 变身演出期间隐藏 boss 血条，直到 ruchang 播完（switchEnemyPhase2Spine 的 complete 里恢复）
    const _cur = enemySpineList.find(item => item.data?.uid === enemyUid && item.hpBar)
    if (_cur?.hpBar) { _cur.hpBar.visible = false; _cur.hpBar.alpha = 0; }
    // 🎥 先放大镜头特写（phase2Zoom 1.5s），1.5 秒后 boss 再执行 ruchang 入场动画
    clearTimeout(_phase2SpineTimer)
    _phase2SpineTimer = setTimeout(() => {
        // 👑 只切换真正的二阶段敌人（_phase2Data && _phase2），避免误把召唤布偶切皮
        // 🎯 执行时按 uid 重新定位：王权召唤会触发全量重建并改变敌人索引，
        //    用事件时的旧 idx 会误切到召唤物（布偶无 _phase2Data 会静默跳过）
        const idx = enemySpineList.findIndex(item =>
            item.data?.uid === enemyUid && item.data?._phase2Data && item.data?._phase2)
        if (idx >= 0) switchEnemyPhase2Spine(idx)
    }, 1500)
}
// 💬 获取敌人左上角屏幕坐标（二阶段聊天气泡定位：x 偏左、y 在头顶上方）
function getEnemyBubblePos(uid) {
    const item = enemySpineList.find(it => it?.data?.uid === uid)
    if (!item?.spine) return null
    let px = item.spine.x, py = item.spine.y
    try {
        const gp = item.spine.getGlobalPosition?.()
        if (gp && isFinite(gp.x) && isFinite(gp.y)) { px = gp.x; py = gp.y }
    } catch (e) { /* 回退容器坐标 */ }
    // 🎯 战斗画布是独立全屏 app（resizeTo: window），stage 坐标即屏幕坐标，无需 viewport 换算
    const h = (item.spine.height || 100) * Math.abs(item.spine.scale?.y || 1)
    return { x: Math.round(px - h * 0.72), y: Math.round(py - h * 1.05) }
}

// ===========================
// 屏幕抖动（攻击命中反馈）
// ===========================
let screenShakeTween = null;
let lastShakeTime = 0;
function screenShake(intensity = 6, duration = 0.12) {
    if (!enemyContainer) return;

    // 简单防抖：短时间内多次触发只取最强的一次
    const now = Date.now();
    if (now - lastShakeTime < 80 && screenShakeTween) return;
    lastShakeTime = now;

    // 清除之前的抖动
    if (screenShakeTween) {
        screenShakeTween.kill();
    }

    const originalX = enemyContainer.x;
    const originalY = enemyContainer.y;

    // 随机方向偏移
    const shakeX = (Math.random() - 0.5) * intensity * 2;
    const shakeY = (Math.random() - 0.5) * intensity * 1.5;

    screenShakeTween = gsap.to(enemyContainer, {
        x: originalX + shakeX,
        y: originalY + shakeY,
        duration: duration / 3,
        ease: "power1.out",
        yoyo: true,
        repeat: 2,
        onComplete: () => {
            if (enemyContainer && !enemyContainer.destroyed) {
                enemyContainer.x = originalX;
                enemyContainer.y = originalY;
            }
            screenShakeTween = null;
        }
    });
}

// ===========================
// 敌人受击震动效果
// ===========================
function playEnemyHitShake(enemyIndex) {
    const enemy = enemySpineList[enemyIndex];
    if (!enemy || !enemy.spine) return;

    const shakeDistance = 6;     // 震动距离
    const shakeTimes = 2;        // 震动次数
    const shakeDuration = 0.05;  // 每次震动时长
    const direction = 1;         // 怪物往右震

    // ⚠️ 关键：使用持久化记录的真实原始 X（不受前一次 kill 的中断影响）
    // 如果是首次震动，用当前 spine.x 初始化；后续复用已有的 _shakeOriginalX
    if (enemy._shakeOriginalX === undefined) {
        enemy._shakeOriginalX = enemy.spine.x;
    }

    // 清除之前的震动动画，避免叠加
    if (enemy._shakeTween) {
        // ⚠️ kill() 前先手动复位到原始位置，防止 spine.x 卡在偏移位置
        enemy.spine.x = enemy._shakeOriginalX;
        enemy._shakeTween.kill();
    }

    // 震动动画：来回抖动
    enemy._shakeTween = gsap.to(enemy.spine, {
        x: enemy._shakeOriginalX + direction * shakeDistance,
        duration: shakeDuration,
        yoyo: true,
        repeat: shakeTimes * 2 - 1,
        ease: "power2.inOut",
        onComplete: () => {
            // 确保回到原位（使用持久化原始位置，防止访问已销毁的 spine）
            if (enemy && enemy.spine && !enemy.spine.destroyed) {
                enemy.spine.x = enemy._shakeOriginalX;
            }
            enemy._shakeTween = null;
        }
    });

    // 同时触发轻微屏幕抖动（攻击命中反馈）
    screenShake(3, 0.08);
}

// ===========================
// 敌人受击受伤动画（spine 有 shoushang 动画则播放，没有则跳过）
// ⏱ 每 0.25 秒最多触发一次，避免多段伤害/连续命中时反复打断动画
// ===========================
const HURT_ANIM_COOLDOWN = 150; // 受伤动画触发冷却（ms）
function playEnemyHurtAnim(enemyIndex) {
    const enemy = enemySpineList[enemyIndex];
    if (!enemy || !enemy.spine?.state) return;

    // 🧊 冻结中的敌人不播受伤动画（时间冻结，播了也会定住）
    if (enemy._freezeFx) return;

    // ⏱ 节流：0.25 秒内不重复触发
    const now = Date.now();
    if (enemy._lastHurtAnimTime && now - enemy._lastHurtAnimTime < HURT_ANIM_COOLDOWN) return;
    enemy._lastHurtAnimTime = now;

    // 🕊️ 飞翔中的敌人跳过受伤动画（shoushang 会把 feixing 循环覆盖回待机，
    //    雷鸟女皇受击飞翔等被动需要 feixing 持续到被动结束）
    if (enemy._flyingAnim) return;
    // 👑 二阶段变身无敌期间不播受击动画（避免打断 ruchang 入场动画）
    if (enemy.data?._phase2Invincible) return;

    const spine = enemy.spine;
    const animations = spine.skeleton?.data?.animations || [];
    // 🎯 受伤动画名固定为 shoushang；骨骼没有该动画则直接跳过
    if (!animations.some(a => a.name === 'shoushang')) return;

    // 回切动画：与待机逻辑一致，优先 fight → idle → 兜底非 attack/feixing/fly
    const back = getEnemyBackAnim(spine);
    try {
        // 一次性播放受伤动画，播完自动接回战斗待机动画
        spine.state.setAnimation(0, 'shoushang', false);
        if (back) spine.state.addAnimation(0, back, true, 0);
    } catch (e) {
        console.warn('敌人受伤动画播放失败', e);
    }
}

// ===========================
// 冻结动画（事件驱动，不碰响应式数据）
// ===========================
function findEnemySpineByUid(uid) {
    const item = enemySpineList.find(e => e.data && e.data.uid === uid);
    return item || null;
}

// ===========================
// 🎯 按屏幕位置检测敌人（指定目标卡牌用）
// 直接遍历渲染层 enemySpineList，用 spine 实际位置（屏幕坐标）与拖拽点比较，
// 返回距离最近的敌人 uid。⚠️ 不依赖数据坐标 / 索引映射，召唤后重排也准确。
// 🎯 命中半径按敌人「实际 spine 大小」计算：大角色区域大、小角色区域小，
//    不会出现小怪拖不准 / 大怪一点就中的偏差。
// ===========================
function getEnemyAtRenderPos(x, y, radius = 90) {
    let best = null;
    let bestDist = radius;
    for (const item of enemySpineList) {
        if (!item?.spine || !item?.data) continue;
        // 过滤已死亡敌人（data.hp 与战斗单位同步）；兜底对象无 hp 则视为存活
        const hp = item.data.hp;
        if (hp !== undefined && hp <= 0) continue;
        // 必须能定位到 uid（兜底对象没有 uid 直接跳过，避免返回 undefined 找不到敌人）
        if (!item.data.uid) continue;
        // 🎯 用「世界坐标」（getGlobalPosition）而非容器坐标：即使 enemyContainer
        //    或父级有偏移/抖动残留，也能与拖拽的页面坐标正确比较
        let px = item.spine.x, py = item.spine.y;
        try {
            const gp = item.spine.getGlobalPosition();
            if (gp && isFinite(gp.x) && isFinite(gp.y)) { px = gp.x; py = gp.y; }
        } catch (e) { /* 忽略，回退容器坐标 */ }

        // 🎯 根据 spine 实际渲染大小计算命中半径：
        //    - spine 目标高度 = ENEMY_TARGET_HEIGHT(VH35) × 该敌人 spineScale
        //    - 命中半径取高度与宽度的较大者（宽约 = 高 × 0.6），再 × 0.5 得中心到边缘距离，
        //      并保留下限（小怪至少 60px，避免太小点不中）与上限（超大怪最多 130px）
        const targetH = ENEMY_TARGET_HEIGHT * (item.data.spineScale ?? 1);
        const halfW = targetH * 0.6 * 0.5;   // 半宽（宽≈高×0.6）
        const halfH = targetH * 0.5;          // 半高
        const hitRadius = Math.max(60, Math.min(130, Math.max(halfW, halfH)));

        // 🎯 检测中心上移半高：spine 位置是脚底，敌人视觉重心在身体中部，
        //    以「脚底 + 半高」为圆心判定，拖到敌人身上任意位置都能命中（不再感觉偏上/偏下）
        const cx = px;
        const cy = py - halfH * 0.5;  // 脚底往上移半高的一半 ≈ 身体中下部

        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // 命中判定：距离在「该敌人自身半径」内才可能选中
        if (dist <= hitRadius && dist <= bestDist) {
            bestDist = dist;
            best = item.data.uid;
        }
    }
    return best; // 返回 uid 或 null
}

/**
 * 🖱️ 按屏幕位置检测敌人并返回其预测攻击详情（点击怪物弹详情，坐标体系与卡牌选目标一致：pageX/pageY）
 */
function getEnemyPredictTap(x, y, radius = 90) {
    const uid = getEnemyAtRenderPos(x, y, radius);
    if (!uid) return null;
    const item = enemySpineList.find(it => it?.data?.uid === uid);
    if (!item?.hpBar) return null;
    const action = item.hpBar._predictAction;
    if (!action || action.type !== 'damage') return null;
    return {
        uid,
        name: item.data?.name,
        source: action.source,
        dmgType: action.dmgType,
        dmg: Math.ceil(action.dmg),
        skill: action.skill || null,
        // 📖 详细说明：普攻倍率/次数/破甲（给玩家展示敌人下一次攻击的具体信息）
        attackMultiplier: item.data?.attackMultiplier ?? 1,
        attackHits: item.data?.attackHits ?? 1,
        attackArmorReducePct: item.data?.attackArmorReducePct ?? 0,
        // 🩹 敌人身上的增益/减益摘要（弹窗展示；碎甲附带护甲减免比例）
        buffs: (item.data?.buffs || []).map(b => ({ name: b.name, remaining: b.remaining, stack: b.stack })),
        debuffs: (item.data?.debuffs || []).map(d => ({ name: d.name, type: d.type, remaining: d.remaining, stack: d.stack, armorShredPct: d.armorShredPct })),
    };
}

/**
 * 🖱️ 按屏幕位置检测友方召唤物（水/雷/冰/火精灵、影分身等）并返回其属性/buff摘要
 *   命中后由 index.vue 弹出召唤物详情（属性 + 增益/减益）
 */
function getSummonTap(x, y, radius = 80) {
    let best = null;
    let bestDist = radius;
    for (const ally of (props.allies || [])) {
        if (!ally || !ally.spineInstance) continue;
        if (ally.hp !== undefined && ally.hp <= 0) continue;
        if (ally._isDead) continue;
        let px = ally.spineInstance.x, py = ally.spineInstance.y;
        try {
            const gp = ally.spineInstance.getGlobalPosition?.();
            if (gp && isFinite(gp.x) && isFinite(gp.y)) { px = gp.x; py = gp.y; }
        } catch (e) { /* 回退容器坐标 */ }
        const cx = px;
        const cy = py - 20; // spine 锚点偏脚底，视觉重心上移
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius && dist < bestDist) {
            bestDist = dist;
            best = ally;
        }
    }
    if (!best) return null;
    return {
        name: best.name,
        hp: Math.max(0, Math.round(best.hp || 0)),
        maxHp: Math.round(best.maxHp || best.hp || 1),
        attack: Math.round(best.attack || 0),
        speed: Math.round(best.speed || 0),
        armor: Math.round(best.armor || 0),
        buffs: (best.buffs || []).map(b => ({ name: b.name, remaining: b.remaining, stack: b.stack })),
        debuffs: (best.debuffs || []).map(d => ({ name: d.name, type: d.type, remaining: d.remaining, stack: d.stack, armorShredPct: d.armorShredPct })),
    };
}

// ===========================
// 🐦 敌人飞翔特殊动画（事件驱动，不碰响应式数据）
// 雷鸟 / 雷鸟女皇触发飞翔被动或飞翔技能时，播放特殊 spine 动画（优先 fly），
// 持续至飞翔结束（敌人回合开始，battle.js 发 flying:false）后恢复待机动画。
// 说明：骨骼资源尚未实装，此处优先播放名为「fly」的动画；若骨骼暂无 fly 动画，
//       会临时回退播放「attack」动画（不循环）以占位，方便后续替换资源。
// ===========================
function getEnemyBackAnim(spine) {
    if (!spine?.skeleton?.data?.animations) return null;
    const animations = spine.skeleton.data.animations;
    // 🎯 回切动画 = 敌人「战斗中的待机动画」：与 createEnemySpine 一致，优先 fight（战斗待机），
    //    没有 fight 才用 idle；绝不能取 feixing/fly/attack 本身
    const hasFight = animations.some(a => a.name === 'idle');
    if (hasFight) return 'idle';
    const hasIdle = animations.some(a => a.name === 'idle');
    if (hasIdle) return 'idle';
    return animations.find(a => a.name !== 'attack' && a.name !== 'feixing' && a.name !== 'fly')?.name || animations[0]?.name || null;
}

function handleEnemyFly({ enemyUid, flying }) {
    const enemy = findEnemySpineByUid(enemyUid);
    if (!enemy || !enemy.spine?.state) return;
    const spine = enemy.spine;
    const animations = spine.skeleton?.data?.animations || [];
    // 🎯 飞翔动画名：优先 feixing（雷鸟骨骼 guaiwu3 里就叫 feixing），没有再找 fly
    const flyAnim = animations.find(a => a.name === 'feixing') || animations.find(a => a.name === 'fly');

    if (flying) {
        try {
            if (flyAnim) {
                // ✅ 播放 feixing 飞翔动画（循环），持续至飞翔效果结束
                spine.state.setAnimation(0, flyAnim.name, true);
            } else if (animations.length > 0) {
                // ⚠️ 占位：暂无 feixing/fly 动画时，播放第一个动画（不循环）作为飞翔表现
                const placeholder = animations.find(a => a.name === 'attack')
                    ? 'attack'
                    : (animations[0]?.name || null);
                if (placeholder) {
                    spine.state.setAnimation(0, placeholder, false);
                    const back = getEnemyBackAnim(spine);
                    if (back) spine.state.addAnimation(0, back, true, 0);
                }
            }
            enemy._flyingAnim = true;
        } catch (e) {
            console.warn('飞翔动画播放失败', e);
        }
    } else {
        // 飞翔结束：恢复战斗待机动画（优先 fight → idle → 兜底非飞翔动画）
        enemy._flyingAnim = false;
        try {
            const back = animations.find(a => a.name === 'idle')
                ? 'idle'
                : (animations.find(a => a.name === 'idle')
                    ? 'idle'
                    : (animations.find(a => a.name !== 'attack' && a.name !== 'feixing' && a.name !== 'fly')?.name || animations[0]?.name));
            // 🎯 直接切回待机（setAnimation 会替换轨道，无需先 clearTracks）
            //    若指定动画不存在会抛异常，这里逐个尝试兜底，绝不让轨道为空导致定格
            const tryAnim = (name) => {
                if (name && animations.some(a => a.name === name)) {
                    spine.state.setAnimation(0, name, true);
                    return true;
                }
                return false;
            };
            if (!tryAnim(back)) {
                if (!tryAnim('idle')) {
                    if (!tryAnim('idle')) {
                        for (const a of animations) {
                            if (a.name !== 'feixing' && a.name !== 'fly' && tryAnim(a.name)) break;
                        }
                    }
                }
            }
            // 🎯 确保动画推进：显式恢复 timeScale / autoUpdate（防冻结残留或意外关闭）
            spine.state.timeScale = 1;
            spine.autoUpdate = true;
        } catch (e) {
            console.warn('飞翔结束恢复动画失败', e);
        }
    }
}

function handleEnemyFreeze({ enemyUid }) {
    const enemy = findEnemySpineByUid(enemyUid);
    if (!enemy || !enemy.spine) return;
    if (enemy._freezeFx) return; // 已经有冻结特效了

    // 🧊 进入冻结时播放音效（public/music/jineng/dongjie.mp3）
    try {
        user.playSoundEffect('music/jineng/dongjie.mp3');
    } catch (e) { /* 忽略 */ }

    try {
        const freezeFx = getEffect('dongjie');
        freezeFx.scale.set(1.3);
        freezeFx.x = enemy.spine.x;
        freezeFx.y = enemy.spine.y;
        freezeFx.zIndex = enemy.spine.zIndex + 1;
        freezeFx.state.setAnimation(0, 'animation', true);
        freezeFx.alpha = 0.75;
        enemy.spine.parent.addChild(freezeFx);
        if (enemy.spine.parent.sortChildren) enemy.spine.parent.sortChildren();
        enemy._freezeFx = freezeFx;

        // 暂停敌人自身spine
        enemy.spine.state.timeScale = 0;
    } catch (e) {
        console.warn('冻结动画播放失败', e);
    }
}

function handleEnemyUnfreeze({ enemyUid }) {
    const enemy = findEnemySpineByUid(enemyUid);
    if (!enemy) return;

    if (enemy._freezeFx) {
        try {
            returnEffect('dongjie', enemy._freezeFx);
        } catch (e) { /* ignore */ }
        enemy._freezeFx = null;
    }

    // 恢复敌人自身spine
    if (enemy.spine && enemy.spine.state) {
        enemy.spine.state.timeScale = 1;
    }
}

// ===========================
// 卡牌指定目标：敌人高亮 + 目标提示文字
// ===========================
let currentTargetEnemy = null; // 当前被选中高亮的敌人

function handleCardTargetHover({ enemyUid, hovering }) {
    // 先清理之前的高亮
    if (currentTargetEnemy) {
        const targetFilter = getTargetFilter();
        // 移除滤镜（使用安全副本，避免数组突变问题）
        if (currentTargetEnemy.spine?.filters) {
            currentTargetEnemy.spine.filters = currentTargetEnemy.spine.filters.filter(
                f => f !== targetFilter
            );
        }
        // 移除目标提示文字
        if (currentTargetEnemy._targetText) {
            try {
                if (enemyContainer && !enemyContainer.destroyed) {
                    enemyContainer.removeChild(currentTargetEnemy._targetText);
                }
            } catch (e) { }
            currentTargetEnemy._targetText.destroy?.();
            currentTargetEnemy._targetText = null;
        }
        currentTargetEnemy = null;
    }

    if (!hovering || !enemyUid) return;

    // 找到目标敌人
    const enemy = findEnemySpineByUid(enemyUid);
    if (!enemy || !enemy.spine) return;

    const targetFilter = getTargetFilter();
    // 添加高亮滤镜
    enemy.spine.filters = [...(enemy.spine.filters || []), targetFilter];

    // 创建"指定该目标"文字
    const targetText = new Text({
        text: '指定该目标',
        style: {
            fontFamily: 'Arial',
            fontSize: 28,
            fill: 0xffcc00,
            fontWeight: 'bold',
            stroke: { color: 0x000000, width: 4 },
            align: 'center',
        }
    });
    targetText.anchor.set(0.5);
    targetText.x = enemy.spine.x;
    targetText.y = enemy.spine.y - ENEMY_TARGET_HEIGHT / 2 - VH(3);
    targetText.zIndex = 200;
    targetText.scale.set(1);

    enemyContainer.addChild(targetText);
    if (enemyContainer.sortChildren) enemyContainer.sortChildren();

    enemy._targetText = targetText;
    currentTargetEnemy = enemy;
}

// ===========================
// 显示伤害浮动文字（与 buff 一样，同时播放通过堆叠偏移错开）
// ===========================
function showEnemyDamage(enemyIndex, damage, options = {}) {
    const enemy = enemySpineList[enemyIndex];
    if (!enemy) return;

    // 受到伤害时触发震动 + 受伤动画（治疗类型不触发）
    const { type = 'physical' } = options;
    if (!['heal', 'mp'].includes(type)) {
        playEnemyHitShake(enemyIndex);
        playEnemyHurtAnim(enemyIndex);
    }

    const { isCritical = false } = options;
    const colorConfig = DAMAGE_COLOR_MAP[type] || DAMAGE_COLOR_MAP.normal;
    const color = isCritical ? colorConfig.critical : colorConfig.normal;

    const baseFontSize = VH(2.5);
    const finalFontSize = Math.max(14, Math.min(36, Math.round(baseFontSize * (isCritical ? 1.3 : 1))));

    // 统一保留两位小数
    const displayDamage = Math.max(damage, 0);
    const damageStr = Number(displayDamage).toFixed(2);

    const damageText = new Text({
        text: `${['heal', 'mp'].includes(type) ? '+' : '-'}${damageStr}`,
        style: {
            fill: color,
            fontSize: finalFontSize,
            fontWeight: isCritical ? 'bold' : 'normal',
        }
    });

    damageText.anchor.set(0.5);
    // 随机水平偏移，避免完全重叠
    damageText.x = enemy.spine.x + (Math.random() - 0.5) * VW(4);

    // 纵向堆叠：短时间内多段伤害依次往上排，避免重叠
    const now = Date.now();
    const stackWindow = 800; // 800ms 内视为连续伤害
    if (!enemy._dmgStackTime || now - enemy._dmgStackTime > stackWindow) {
        enemy._dmgStackCount = 0;
    } else {
        enemy._dmgStackCount++;
    }
    enemy._dmgStackTime = now;
    const stackOffset = enemy._dmgStackCount * VH(2.5);

    // 从敌人头顶上方开始，加上堆叠偏移
    damageText.y = enemy.spine.y - ENEMY_TARGET_HEIGHT / 2 - VH(1) - stackOffset;
    damageText.alpha = 1;
    damageText.scale.set(isCritical ? 0.5 : 0.7);
    damageText.zIndex = 999;

    // 💯 加到伤害数字容器（zIndex 1000，比特效层 999 更高 → 飘字永远显示在特效上面）
    (damageTextContainer || enemyContainer).addChild(damageText);

    // 浮动动画：放大 → 上浮 → 消失
    gsap.timeline()
        .to(damageText.scale, {
            x: isCritical ? 1.2 : 1,
            y: isCritical ? 1.2 : 1,
            duration: 0.25,
            ease: 'power3.out'
        })
        .to(damageText, {
            y: damageText.y - VH(5),
            duration: 1.2,
            ease: 'power1.out',
        }, '<')
        .to(damageText, {
            alpha: 0,
            duration: 0.5,
            ease: 'power1.out',
        }, '>-0.2')
        .call(() => {
            damageText.destroy({ children: true });
        }, null, '>');
}

// ===========================
// 显示 Buff 浮动文字
// ===========================
function showEnemyBuff(enemyIndex, buffName) {
    const enemy = enemySpineList[enemyIndex];
    if (!enemy) return;

    // 💚 回血数字（+xx，如狂怒/暗影治愈等敌人回血）用治疗绿色；
    //    其余按 BUFF_COLOR_MAP 匹配（找不到 fallback 减益色）
    const color = typeof buffName === 'string' && /^\+/.test(buffName)
        ? '#67C23A'
        : (BUFF_COLOR_MAP[buffName]?.color || BUFF_COLOR_MAP['减益'].color);
    // 🎯 字号增大（VH(1.3)≈14px 太小，技能名如「暗影召唤」看不清 → 提到 VH(2.2)≈24px）
    const finalFontSize = Math.max(14, Math.min(32, Math.round(VH(2.2))));

    const buffText = new Text({
        text: buffName,
        style: {
            fill: color,
            fontSize: finalFontSize,
            fontWeight: 'bold',
        }
    });

    buffText.anchor.set(0.5);
    // 大范围随机，避免多个buff重叠
    buffText.x = enemy.spine.x + (Math.random() - 0.5) * VW(5);
    buffText.y = enemy.spine.y - ENEMY_TARGET_HEIGHT / 2 + VH(1) + (Math.random() - 0.5) * VH(2);
    buffText.alpha = 1;
    buffText.scale.set(1);
    buffText.zIndex = 120;

    enemyContainer.addChild(buffText);
    // ✅ zIndex 已设为 120，无需 sortChildren

    // 浮动动画（与伤害文字节奏一致）
    gsap.timeline()
        .to(buffText, { scale: 1.1, duration: 0.25, ease: 'power3.out' })
        .to(buffText, { y: buffText.y - VH(4), duration: 1.2, ease: 'power1.out' }, '<')
        .to(buffText, { alpha: 0, duration: 0.5, ease: 'power1.out' }, '>-0.2')
        .call(() => buffText.destroy({ children: true }), null, '>');
}

// ===========================
// 更新指定敌人血条
// ===========================
function updateEnemyHpBar(enemyIndex, hp, maxHp) {
    const enemy = enemySpineList[enemyIndex];
    if (!enemy || !enemy.hpBar || enemy.hpBar.destroyed) return;

    // 血量归0直接隐藏血条
    if (hp <= 0) {
        enemy.hpBar.visible = false;
        enemy.hpBar.alpha = 0;
        return;
    }

    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    updateHpBarFill(enemy.hpBar, ratio);

    // 更新文字
    enemy.hpBar._hpText.text = `${Math.ceil(Math.max(0, hp))} / ${maxHp}`;

    // ========== 夺命烙印斩杀覆盖层 ==========
    const enemyData = enemySpineList?.[enemyIndex]?.data;
    const accum = enemyData?._deathMarkAccum || 0;

    // 关键修复：血条容器开启排序
    enemy.hpBar.sortableChildren = true;

    let dmOverlay = enemy.hpBar._deathMarkOverlay;
    if (accum > 0 && maxHp > 0) {
        if (!dmOverlay) {
            dmOverlay = new Graphics();
            enemy.hpBar._deathMarkOverlay = dmOverlay;
            enemy.hpBar.addChild(dmOverlay);
        }

        // 防御：判断图形未销毁
        if (dmOverlay && !dmOverlay.destroyed) {
            // 强制层级：紫色 > 红色血条 < 文字
            dmOverlay.zIndex = 10;
            enemy.hpBar._hpText.zIndex = 20;

            const barWidth = enemy.hpBar._barWidth || VW(10);
            const barHeight = VH(1.8);
            const halfH = barHeight / 2;
            const r = Math.min(accum / maxHp, 1);

            dmOverlay.visible = true;
            dmOverlay.clear();
            // 严格和血条一模一样大小，不偏移
            dmOverlay.roundRect(-barWidth / 2, -halfH, barWidth * r, barHeight, halfH);
            dmOverlay.fill({ color: 0x9b59b6, alpha: 1 }); // 不透明，必盖住红色

            // 斩杀分割白线
            dmOverlay.roundRect(-barWidth / 2 + barWidth * r - 1.5, -halfH, 3, barHeight, 1);
            dmOverlay.fill(0xffffff);
        }

    } else if (dmOverlay && !dmOverlay.destroyed) {
        dmOverlay.visible = false;
        dmOverlay.clear();
    }
}
// ===========================
// 更新灵力显示
// ===========================
function updateMana(mp, maxMp) {
    if (!app || !manaSpine) return;

    const ratio = maxMp <= 0 ? 0 : mp / maxMp;

    currentMpText.text = mp;
    maxMpText.text = `/ ${maxMp}`;

    manaSpine.filters = [getBrightFilter(ratio)];

    const anim = manaSpine.skeleton.data.animations?.[0]?.name;
    if (ratio > 0 && anim) {
        manaSpine.state.timeScale = 1;
        if (!manaSpine.state.tracks[0]) {
            manaSpine.state.setAnimation(0, anim, true);
            manaSpine.state.tracks[0].trackTime = sharedTime;
        }
    } else {
        manaSpine.state.timeScale = 0;
        manaSpine.state.clearTracks();
        manaSpine.state.apply(manaSpine.skeleton);
        manaSpine.skeleton.updateWorldTransform();
    }
}

// ===========================
// 战斗天气粒子（读地牢天气：雨/雪/雾/血月，盖在敌人 spine 之上）
// ===========================
let battleFxLayer = null;    // 天气层 Container（zIndex 8：高于敌人1/玩家buff5，低于灵力条10）
let battleFxDrops = [];      // 粒子数据
let battleFxRainGfx = null;  // 雨线 Graphics
let battleFxTick = null;     // ticker 引用
async function _loadBattleTex(url, key) {
  let tex = null;
  try {
    if (Assets.cache?.has?.(key)) tex = Assets.get(key);
    else if (Assets.cache?.has?.(url)) tex = Assets.get(url);
  } catch (e) { tex = null; }
  if (!tex) { try { tex = await Assets.load(url); } catch (e) { tex = null; } }
  return tex;
}
function destroyBattleWeatherFx() {
  if (battleFxTick && app) { try { app.ticker.remove(battleFxTick); } catch (e) { /* ignore */ } }
  battleFxTick = null;
  if (battleFxLayer) {
    try { if (battleFxLayer.parent) battleFxLayer.parent.removeChild(battleFxLayer); battleFxLayer.destroy({ children: true }); } catch (e) { /* ignore */ }
  }
  battleFxLayer = null;
  battleFxRainGfx = null;
  battleFxDrops = [];
}
async function createBattleWeatherFx() {
  destroyBattleWeatherFx();
  const _cbd = user.getDialogueFlag?.('customBattleData');
  const w = _cbd?.weather;
  battleLog('[战斗天气] weather=', w, 'cbd=', JSON.stringify(_cbd && { enemies: _cbd.enemies?.length, weather: _cbd.weather, night: _cbd.night }));
  if (!w || !app) return;
  const isRain = w === 'rain' || w === 'storm' || w === 'thunderstorm';
  const isSnow = w === 'snow';
  const isFog = w === 'fog';
  const isBlood = w === 'bloodmoon';
  if (!isRain && !isSnow && !isFog && !isBlood) return;
  const W = window.innerWidth, H = window.innerHeight;
  battleFxLayer = new Container();
  battleFxLayer.zIndex = 8; // 盖在敌人(1)之上，低于灵力条(10)
  app.stage.addChild(battleFxLayer);
  if (isRain) {
    const cfg = w === 'storm'
      ? { count: 100, speedBase: 640, speedRand: 420, driftBase: 180, driftRand: 100, lenBase: 22, lenRand: 14, width: 3 }
      : (w === 'thunderstorm'
        ? { count: 70, speedBase: 520, speedRand: 380, driftBase: 200, driftRand: 120, lenBase: 20, lenRand: 12, width: 2.5 }
        : { count: 45, speedBase: 380, speedRand: 320, driftBase: 90, driftRand: 80, lenBase: 12, lenRand: 9, width: 1.5 });
    battleFxRainGfx = new Graphics();
    battleFxLayer.addChild(battleFxRainGfx);
    battleFxDrops = [];
    for (let i = 0; i < cfg.count; i++) {
      battleFxDrops.push({
        x: Math.random() * W, y: Math.random() * H,
        speed: cfg.speedBase + Math.random() * cfg.speedRand,
        drift: cfg.driftBase + Math.random() * cfg.driftRand,
        len: cfg.lenBase + Math.random() * cfg.lenRand,
        alpha: 0.28 + Math.random() * 0.42,
        width: cfg.width,
      });
    }
  } else if (isSnow) {
    const tex = await _loadBattleTex('/tietu/Snow50px.png', 'Snow50px');
    if (!tex) { destroyBattleWeatherFx(); return; }
    battleFxDrops = [];
    for (let i = 0; i < 40; i++) {
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 0.5);
      const s = 0.25 + Math.random() * 0.35;
      sp.scale.set(s);
      sp.x = Math.random() * W;
      sp.y = Math.random() * H;
      sp.rotation = Math.random() * Math.PI * 2;
      const tc = Math.random();
      sp.tint = tc < 0.5 ? 0xffffff : (tc < 0.8 ? 0xe8f4ff : 0xcfeeff);
      sp.alpha = 0.55 + Math.random() * 0.45;
      battleFxLayer.addChild(sp);
      battleFxDrops.push({
        sprite: sp,
        speedY: 25 + Math.random() * 45,
        speedX: (6 + Math.random() * 18) * (Math.random() < 0.5 ? -1 : 1),
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: 6 + Math.random() * 14,
        rotSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 1.2),
      });
    }
  } else if (isFog) {
    const tex = await _loadBattleTex('/tietu/smokeparticle.png', 'smokeparticle');
    if (!tex) { destroyBattleWeatherFx(); return; }
    battleFxDrops = [];
    for (let i = 0; i < 26; i++) {
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 0.5);
      const s = 1.4 + Math.random() * 2.2;
      sp.scale.set(s);
      sp.x = Math.random() * W;
      sp.y = Math.random() * H;
      sp.rotation = Math.random() * Math.PI * 2;
      sp.alpha = 0.5;
      sp.tint = 0xdfe6f0;
      battleFxLayer.addChild(sp);
      battleFxDrops.push({
        sprite: sp,
        speedX: (4 + Math.random() * 14) * (Math.random() < 0.5 ? -1 : 1),
        speedY: (2 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1),
        rotSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.12),
        phase: Math.random() * Math.PI * 2,
      });
    }
  } else if (isBlood) {
    const g = new Graphics();
    const cx = W / 2, cy = H / 2, maxR = Math.sqrt(cx * cx + cy * cy);
    for (let i = 24; i >= 0; i--) {
      const tt = i / 24;
      const r = maxR * (0.5 + tt * 0.65);
      const a = 0.10 * tt * tt;
      g.circle(cx, cy, r).fill({ color: 0x4a0000, alpha: a });
    }
    battleFxLayer.addChild(g);
  }
  battleFxTick = (ticker) => {
    updateBattleWeatherFx(Math.min(0.05, (ticker.deltaMS || 16) / 1000));
  };
  app.ticker.add(battleFxTick);
}
function updateBattleWeatherFx(dt) {
  if (!battleFxLayer) return;
  const W = window.innerWidth, H = window.innerHeight;
  const w = user.getDialogueFlag?.('customBattleData')?.weather;
  const isRain = w === 'rain' || w === 'storm' || w === 'thunderstorm';
  const isSnow = w === 'snow';
  const isFog = w === 'fog';
  if (isRain && battleFxRainGfx) {
    const g = battleFxRainGfx;
    g.clear();
    for (const d of battleFxDrops) {
      d.y += d.speed * dt;
      d.x += d.drift * dt;
      if (d.y - d.len > H) { d.y = -d.len; d.x = Math.random() * W; }
      if (d.x > W + 60) d.x = -60;
      if (d.x < -60) d.x = W + 60;
      g.moveTo(d.x, d.y);
      g.lineTo(d.x - d.drift * 0.03, d.y - d.len);
      g.stroke({ width: d.width, color: 0x9db8ff, alpha: d.alpha });
    }
  } else if (isSnow) {
    for (const d of battleFxDrops) {
      const sp = d.sprite;
      sp.y += d.speedY * dt;
      sp.x += d.speedX * dt;
      d.swayPhase += dt * 1.8;
      sp.x += Math.sin(d.swayPhase) * d.swayAmp * dt;
      sp.rotation += d.rotSpeed * dt;
      if (sp.y > H + 40) { sp.y = -40; sp.x = Math.random() * W; }
      if (sp.x > W + 40) sp.x = -40;
      if (sp.x < -40) sp.x = W + 40;
    }
  } else if (isFog) {
    for (const d of battleFxDrops) {
      const sp = d.sprite;
      sp.x += d.speedX * dt;
      sp.y += d.speedY * dt;
      sp.rotation += d.rotSpeed * dt;
      d.phase += dt * 0.5;
      const rr = 64 * sp.scale.x;
      if (sp.x < -rr) sp.x = W + rr;
      if (sp.x > W + rr) sp.x = -rr;
      if (sp.y < -rr) sp.y = H + rr;
      if (sp.y > H + rr) sp.y = -rr;
      sp.alpha = Math.max(0.1, 0.5 * (0.7 + 0.3 * Math.sin(d.phase)));
    }
  }
  // bloodmoon：静态暗角，无需更新
}

// ===========================
// 初始化
// ===========================
let tickerFn = null;
let _predictRefreshAcc = 0; // 预测伤害刷新节流计数
let onScreenShake = null; // 具名函数引用，用于卸载时精确移除
const _timers = []; // 存储所有 setTimeout 引用，用于卸载时统一清理
onMounted(async () => {
    await loadAssets();
    // 🛡️ HMR/路由切换等导致组件在 loadAssets 期间被卸载时，容器为 null，直接停止初始化（新实例会正常重建）
    if (!pixiRef.value) { console.warn('[pixi] 战斗场景容器已卸载，跳过初始化'); return; }
    manaContainer = new Container();
    enemyContainer = new Container();
    app = new Application();
    await app.init({
        resizeTo: window,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: false,
    });

    pixiRef.value.appendChild(app.canvas);
    // 🎥 进入战斗镜头过渡：从中心放大 → 缩小到当前比例（镜头拉近后回位）
    if (pixiRef.value) {
      const _wrap = pixiRef.value;
      _wrap.style.transformOrigin = '50% 50%';
      gsap.killTweensOf(_wrap);
      gsap.fromTo(_wrap, { scale: 1.6 }, { scale: 1, duration: 0.75, ease: 'power2.out' });
    }
    app.stage.sortableChildren = true;
    manaContainer.zIndex = 10;
    enemyContainer.zIndex = 1;  // 敌人容器层级较低
    enemyContainer.sortableChildren = true;

    // 创建特效层（最高层级，所有技能特效/子弹都在这里显示）
    effectContainer = new Container();
    effectContainer.zIndex = 999;
    effectContainer.sortableChildren = true;

    // 💯 伤害数字容器（比特效层更高，保证飘字永远显示在特效上面）
    damageTextContainer = new Container();
    damageTextContainer.zIndex = 1000;
    damageTextContainer.sortableChildren = true;

    app.stage.addChild(manaContainer, enemyContainer, effectContainer, damageTextContainer);

    // ⛈️ 战斗天气粒子（读地牢天气，盖在敌人 spine 之上；贴图异步加载 fire-and-forget）
    createBattleWeatherFx();

    // ⭐ 立即设置战斗容器缓存，确保 playHitParticlesOnEnemy 能正确获取容器
    // 玩家屏幕坐标优先用 matter.vue 动态计算的值（viewport.toScreen），
    // 没有（未走 jinruzhandou）时才用固定值兜底
    setFightApp(effectContainer, null);
    // 🎯 注册敌人容器：特效要显示在敌人 spine 下方时（如狂怒 buff 特效 zIndex=-50），
    //    必须加到敌人容器而不是特效层——特效层 zIndex 再低也永远盖在敌人之上
    setEnemyContainer(enemyContainer);
    if (!getPlayerScreenPos()) {
      setPlayerScreenPos({
        x: window.innerWidth * 0.18,
        y: window.innerHeight * 0.75,
      });
    }

    // 创建灵力条元素
    manaSpine = createManaSpine();
    const texts = createManaTexts();
    currentMpText = texts.current;
    maxMpText = texts.max;

    manaContainer.addChild(manaSpine, currentMpText, maxMpText);

    // ===== 玩家 buff 图标容器（血条下方） =====
    playerBuffContainer = new Container();
    playerBuffContainer.zIndex = 5;
    playerBuffContainer.eventMode = 'static'; // 确保容器接收事件传递
    // 定位：与 index.vue 血条位置对齐（top-3vh left-1vw w-[22vw]）
    // buff 图标在血条下方
    playerBuffContainer.x = VW(1); // 与血条左对齐（left-1vw）
    playerBuffContainer.y = VH(8.5); // 血条下方约 0.5vh
    app.stage.addChild(playerBuffContainer);

    // 首次渲染敌人
    renderEnemies(props.enemySpines, props.enemies);

    // 🔥 不幸天赋：延迟处理伤害数字 + 粒子特效（此时 index.vue 的 enemyDamage 监听器已就绪）
    const strikeData = consumeStrikeData();
    if (strikeData?.triggered) {
        // 播放粒子爆炸特效
        playStrikeExplosion(effectContainer, props.enemies);

        // 延迟 emit 伤害数字，让监听器有充足时间注册
        const strikeTimer = setTimeout(() => {
            strikeData.damages.forEach(d => {
                emitter.emit('enemyDamage', {
                    enemyName: d.enemyName,
                    enemyUid: d.enemyUid,
                    damage: d.damage,
                    type: 'physical',
                    isCritical: false,
                });
            });
        }, 200);
        _timers.push(strikeTimer);
    }

    // 首次更新
    updateMana(props.mp, props.maxMp);

    // 同步动画
    tickerFn = () => {
        if (!app || !manaSpine) return; // 组件已卸载，停止 ticker
        sharedTime += app.ticker.deltaMS * 0.001;

        // ⚔️ 节流刷新敌人预测伤害（250ms 一次，数字变化才更新 Text）
        _predictRefreshAcc += app.ticker.deltaMS;
        if (_predictRefreshAcc >= 250) {
            _predictRefreshAcc = 0;
            const aliveCount = (props.enemies || []).filter(e => e && e.hp > 0).length;
            enemySpineList.forEach((item, idx) => {
                if (item?.hpBar && !item.hpBar.destroyed) {
                    refreshEnemyPredictDmg(item.hpBar, props.enemies?.[idx], aliveCount);
                }
            });
        }

        // ⚠️ 防止 mp>0 时轨道为空导致报错（trackTime 在 updateMana 中也可能被设置）
        if (props.mp > 0 && manaSpine.state && manaSpine.state.tracks && manaSpine.state.tracks[0]) {
            manaSpine.state.tracks[0].trackTime = sharedTime;
        }
    };

    app.ticker.add(tickerFn);

    // 冻结动画事件
    emitter.on('enemyFreeze', handleEnemyFreeze);
    emitter.on('enemyUnfreeze', handleEnemyUnfreeze);

    // 👑 暗影王二阶段：spine 切换（anyingwang → anyingwang1，ruchang → idle）
    emitter.on('bossPhase2', handleBossPhase2Spine);


    // 🐦 敌人飞翔特殊动画事件
    emitter.on('enemyFly', handleEnemyFly);

    // 屏幕抖动事件（使用具名函数，便于卸载时精确移除）
    onScreenShake = ({ intensity, duration }) => {
        screenShake(intensity || 4, duration || 0.1);
    };
    emitter.on('screenShake', onScreenShake);

    // 卡牌指定目标高亮事件
    emitter.on('cardTargetHover', handleCardTargetHover);
});

// 监听灵力变化
watch([() => props.mp, () => props.maxMp], ([mp, maxMp]) => {
    updateMana(mp, maxMp);
});

// 监听敌人spine列表变化
watch(() => props.enemySpines, (names) => {
    renderEnemies(names, props.enemies);
}, { deep: true });

// 监听敌人数据变化（血量更新）
watch(() => props.enemies.map(e => e.hp + JSON.stringify(e.debuffs)), () => {
    if (isRenderingEnemies) return;
    if (!props.enemies || props.enemies.length === 0) return;

    props.enemies.forEach((enemy, i) => {
        if (enemySpineList[i]) {
            updateEnemyHpBar(i, enemy.hp, enemy.maxHp);
            updateEnemyStatusBar(enemySpineList[i].hpBar, enemy);

            // 敌人死亡：淡出消失
            if (enemy.hp <= 0 && !enemySpineList[i]._isDead) {
                // 你原来所有死亡代码原样保留，不动
                enemySpineList[i]._isDead = true;
                const enemyObj = enemySpineList[i];

                // 🧊 死亡时移除敌人身上的冻结特效（dongjie），防止残留循环播放
                if (enemyObj._freezeFx) {
                    try { returnEffect('dongjie', enemyObj._freezeFx); } catch (e) { /* ignore */ }
                    enemyObj._freezeFx = null;
                }

                if (enemyObj.spine && effectContainer) {
                    const deathEffect = createEnemyDeathEffect(
                        effectContainer,
                        enemyObj.spine.x,
                        enemyObj.spine.y - VH(15),
                        { duration: 2.5, scale: 3 }
                    );
                    const deathTimer = setTimeout(() => {
                        try { destroyEffect(deathEffect); } catch (e) { /* ignore */ }
                    }, 3000);
                    enemyObj._deathTimer = deathTimer;
                }

                gsap.to(enemyObj.spine.scale, {
                    x: 0.3,
                    y: 0.3,
                    duration: 0.4,
                    ease: 'power2.in'
                });
                gsap.to(enemyObj.spine, {
                    alpha: 0,
                    duration: 0.4,
                    ease: 'power2.in',
                    onComplete: () => {
                        if (enemyObj?.spine && !enemyObj.spine.destroyed) {
                            enemyObj.spine.visible = false;
                        }
                    }
                });

                // 👤 脚下阴影随死亡一起淡出消失
                if (enemyObj.shadow) {
                    gsap.to(enemyObj.shadow, {
                        alpha: 0,
                        duration: 0.4,
                        ease: 'power2.in',
                        onComplete: () => {
                            if (enemyObj?.shadow && !enemyObj.shadow.destroyed) {
                                enemyObj.shadow.visible = false;
                            }
                        }
                    });
                }

                try {
                    gsap.killTweensOf(enemyObj.hpBar);
                    if (enemyObj.hpBar.parent) {
                        enemyObj.hpBar.parent.removeChild(enemyObj.hpBar);
                    }
                    enemyObj.hpBar.destroy({ children: true });
                } catch (e) { }
            }
        }
    });
}, { deep: false });

// 监听玩家buff变化（immediate确保首次挂载也更新）
watch(() => props.playerBuffs, (buffs) => {
    updatePlayerBuffIcons(buffs);
}, { deep: true, immediate: true });

// 🩸 直接监听 player.debuffs，确保玩家行动后 debuffs 变化立刻刷新图标（绕过 computed 响应式丢失问题）
watch(() => props.player?.debuffs?.map(d => d.name + ':' + d.remaining), () => {
    const all = [...(props.player?.buffs || []), ...(props.player?.debuffs || [])];
    console.log('[debuffsWatch] 直接监听触发，all =', all.map(b => b.name + ':' + (b.remaining ?? '?')));
    updatePlayerBuffIcons(all);
}, { deep: true });

// 🩸 玩家 debuff 变化强制同步：battle.js 直接把最新 buff 快照传过来，绕过 props 响应式链路（防玩家行动后图标提前消失）
const _onForceSync = (snap) => { console.log('[ForceSync] pixi 收到 snap =', Array.isArray(snap) ? snap.map(b => b.name + ':' + (b.remaining ?? '?')) : snap); if (Array.isArray(snap)) updatePlayerBuffIcons(snap); };

// 🩸 兜底：每 300ms 轮询 player.debuffs，有变化就刷新图标（防 Vue 响应式丢失）
let _lastDebuffKey = '';
setInterval(() => {
    if (!props.player) return;
    const all = [...(props.player.buffs || []), ...(props.player.debuffs || [])];
    const key = all.map(b => b.name + ':' + (b.remaining ?? '?')).join(',');
    if (key !== _lastDebuffKey) {
        _lastDebuffKey = key;
        console.log('[poll] 检测到 debuffs 变化，刷新图标:', key);
        updatePlayerBuffIcons(all);
    }
}, 300);
emitter.on('playerBuffsForceSync', _onForceSync);

onBeforeUnmount(() => {
    emitter.off('playerBuffsForceSync', _onForceSync);
    if (!app) return;

    try {
        // 1️⃣ 清理所有定时器
        _timers.forEach(t => { if (t) clearTimeout(t); });
        _timers.length = 0;

        enemySpineList.forEach(item => {
            if (item.poisonTimer) {
                clearTimeout(item.poisonTimer);
                item.poisonTimer = null;
            }
            if (item._deathTimer) {
                clearTimeout(item._deathTimer);
                item._deathTimer = null;
            }
        });

        // 2️⃣ 杀死所有 GSAP 动画（必须先杀灭，再销毁对象，避免 onComplete 访问已销毁对象）
        // 全局杀灭所有可能涉及本组件的 GSAP 动画
        if (screenShakeTween) {
            screenShakeTween.kill();
            screenShakeTween = null;
        }
        enemySpineList.forEach(item => {
            gsap.killTweensOf(item.hpBar);
            gsap.killTweensOf(item.spine);
            gsap.killTweensOf(item.spine?.scale);
            if (item._shakeTween) {
                item._shakeTween.kill();
                item._shakeTween = null;
            }
        });
        // 同时杀灭特效层所有子对象的 GSAP 动画
        if (effectContainer && effectContainer.children) {
            const allChildren = [];
            const walk = (node) => {
                if (!node || !node.children) return;
                for (const child of node.children) {
                    allChildren.push(child);
                    walk(child);
                }
            };
            walk(effectContainer);
            gsap.killTweensOf(allChildren);
        }

        // 3️⃣ 移除事件监听
        emitter.off('enemyFreeze', handleEnemyFreeze);
        emitter.off('enemyUnfreeze', handleEnemyUnfreeze);
        emitter.off('bossPhase2', handleBossPhase2Spine);
        clearTimeout(_phase2SpineTimer);

        // 🐦 移除敌人飞翔特殊动画事件
        emitter.off('enemyFly', handleEnemyFly);
        // 使用具名函数精确移除，避免误删其他组件的 screenShake 监听器
        if (onScreenShake) {
            emitter.off('screenShake', onScreenShake);
            onScreenShake = null;
        }
        emitter.off('cardTargetHover', handleCardTargetHover);

        // 4️⃣ 移除 ticker
        if (tickerFn) {
            app.ticker.remove(tickerFn);
            tickerFn = null;
        }

        // ⛈️ 清理战斗天气粒子（雨/雪/雾/血月）
        destroyBattleWeatherFx();

        // 5️⃣ 销毁 Spine 前先清理动画轨道
        if (manaSpine) {
            try {
                manaSpine.state?.clearTracks();
                manaSpine.state?.removeAllListeners(); // 清动画事件监听
            } catch (e) { }
            if (manaSpine.parent) manaSpine.parent.removeChild(manaSpine);
            manaSpine.destroy({ children: true, texture: false });
            manaSpine = null;
        }

        // 6️⃣ 销毁玩家buff图标
        if (playerBuffContainer) {
            // 先清理所有子级的 Spine 轨道
            playerBuffContainer.children.forEach(child => {
                if (child.state && typeof child.state.clearTracks === 'function') {
                    try { child.state.clearTracks(); } catch (e) { }
                }
            });
            if (playerBuffContainer.parent) playerBuffContainer.parent.removeChild(playerBuffContainer);
            playerBuffContainer.destroy({ children: true });
            playerBuffContainer = null;
        }

        // 7️⃣ 销毁敌人（先清除 Spine 轨道再销毁）
        enemySpineList.forEach(item => {
            try {
                if (item.spine) {
                    try { item.spine.state?.clearTracks(); } catch (e) { }
                    // ✅ Spine 必须禁止销毁共用贴图
                    item.spine.destroy({ children: true, texture: false });
                }
                // hpBar 是普通Container，只需要 children:true
                if (item.hpBar) {
                    item.hpBar.destroy({ children: true });
                }
            } catch (e) { }
        });
        enemySpineList = [];
        enemyHpBarList = [];

        // 8️⃣ 销毁容器
        if (manaContainer) {
            if (manaContainer.parent) manaContainer.parent.removeChild(manaContainer);
            manaContainer.destroy({ children: true });
            manaContainer = null;
        }

        if (enemyContainer) {
            if (enemyContainer.parent) enemyContainer.parent.removeChild(enemyContainer);
            enemyContainer.destroy({ children: true });
            enemyContainer = null;
        }

        if (effectContainer) {
            if (effectContainer.parent) effectContainer.parent.removeChild(effectContainer);
            effectContainer.destroy({ children: true });
            effectContainer = null;
        }

        if (damageTextContainer) {
            if (damageTextContainer.parent) damageTextContainer.parent.removeChild(damageTextContainer);
            damageTextContainer.destroy({ children: true });
            damageTextContainer = null;
        }

        // 9️⃣ 销毁 PixiJS 应用
        app.destroy({ children: true });
        app = null;
    } catch (e) {
        console.error('pixi destroy error:', e);
    }
});
</script>

<style scoped>
.pixi-wrap {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}
</style>
