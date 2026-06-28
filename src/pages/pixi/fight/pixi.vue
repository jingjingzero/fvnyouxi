<template>
    <div ref="pixiRef" class="pixi-wrap"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { Application, Container, ColorMatrixFilter, Text, TextStyle } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { loadAssets } from "@/components/loadAssets";

const props = defineProps({
    mp: { type: Number, default: 0 },
    maxMp: { type: Number, default: 10 },
});

const pixiRef = ref(null);
let app = null;

// 布局常量
const SPINE_START_X = VW(2.5);
const SPINE_START_Y = VH(86);
const TEXT_RIGHT = VW(3.5); // 文字整体右偏移

let manaContainer = null;
let manaSpine = null;
let currentMpText = null;  // 当前灵力：大号加粗
let maxMpText = null;      // /最大灵力：小号灰色
let sharedTime = 0;

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
    // 最低亮度 0.2 + 整体亮度乘以 1.6 → 更亮更通透
    const safeBright = Math.max(ratio * 2, 0.2);
    filter.brightness(safeBright, false);
    return filter;
}

// ===========================
// 创建单个Spine
// ===========================
function createManaSpine() {
    const spine = new Spine({
        skeleton: "bluefive_skel",
        atlas: "bluefive_atlas",
    });
    const targetH = VH(12);
    const scale = targetH / (spine.height || 100);
    spine.scale.set(scale);
    spine.position.set(SPINE_START_X, SPINE_START_Y * 1.025);
    return spine;
}

// ===========================
// 创建两行文字
// ===========================
function createManaTexts() {
    // 当前灵力：大号 加粗 白色
    const currentStyle = new TextStyle({
        fill: "#409EFF",
        fontSize: VH(5.5),
        fontWeight: "bold",
    });
    const current = new Text({ text: "", style: currentStyle });
    current.anchor.set(0, 0.5);
    current.position.set(SPINE_START_X + TEXT_RIGHT, SPINE_START_Y);

    // /最大灵力：小号 灰色 暗色
    const maxStyle = new TextStyle({
        fill: "#ffffff",
        fontSize: VH(3),
        fontWeight: "normal",
    });
    const max = new Text({ text: "", style: maxStyle });
    max.anchor.set(0, 0);
    max.position.set(
        SPINE_START_X + TEXT_RIGHT + VW(0.5), // 这里 + 左边距
        SPINE_START_Y + VH(2.8)
    );
    return { current, max };
}

// ===========================
// 更新状态
// ===========================
function updateMana(mp, maxMp) {
    if (!app || !manaSpine) return;

    const ratio = maxMp <= 0 ? 0 : mp / maxMp;

    // 更新两行文字
    currentMpText.text = mp;
    maxMpText.text = `/ ${maxMp}`;

    // 气泡亮度
    manaSpine.filters = [getBrightFilter(ratio)];

    // 动画控制
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
// 初始化
// ===========================
let tickerFn = null;
onMounted(async () => {
    await loadAssets();
    manaContainer = new Container();
    app = new Application();
    await app.init({
        resizeTo: window,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: true,
    });

    pixiRef.value.appendChild(app.canvas);
    app.stage.addChild(manaContainer);

    // 创建元素
    manaSpine = createManaSpine();
    const texts = createManaTexts();
    currentMpText = texts.current;
    maxMpText = texts.max;

    manaContainer.addChild(manaSpine, currentMpText, maxMpText);

    // 首次更新
    updateMana(props.mp, props.maxMp);

    // 同步动画
    tickerFn = () => {
        sharedTime += app.ticker.deltaMS * 0.001;

        if (props.mp > 0 && manaSpine?.state?.tracks?.[0]) {
            manaSpine.state.tracks[0].trackTime = sharedTime;
        }
    };

    app.ticker.add(tickerFn);
});

watch([() => props.mp, () => props.maxMp], ([mp, maxMp]) => {
    updateMana(mp, maxMp);
});
onBeforeUnmount(() => {

    if (!app) return;

    try {

        if (tickerFn) {
            app.ticker.remove(tickerFn);
            tickerFn = null;
        }

        if (manaSpine) {
            app.stage.removeChild(manaSpine);

            manaSpine.destroy({
                children: true,
            });

            manaSpine = null;
        }

        manaContainer?.destroy?.({
            children: true,
        });

        manaContainer = null;

        app.destroy();

        app = null;

    } catch (e) {
        console.error('pixi destroy error:', e);
    }
});
</script>

<style scoped>
.pixi-wrap {
    position: fixed;
    left: 1vw;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
}
</style>