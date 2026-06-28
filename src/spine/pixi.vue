<template>
    <div ref="pixiRef" class="pixi-wrap"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { Application, Container, ColorMatrixFilter } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { loadAssets } from "@/components/loadAssets";

const props = defineProps({
    mp: { type: Number, default: 0 },
    maxMp: { type: Number, default: 0 },
});

const pixiRef = ref(null);
let app = null;

const COLS = 3;
const X_GAP = 3.2;
const Y_GAP = 7;
const START_X = 2.5;
const START_Y = 81;

const manaContainer = new Container();
const manaSprites = [];

function VW(v) {
    return window.innerWidth * (v / 100);
}
function VH(v) {
    return window.innerHeight * (v / 100);
}

let sharedTime = 0;

// ===========================
// 创建纯黑滤镜
// ===========================
function createBlackFilter() {
    const filter = new ColorMatrixFilter();
    filter.brightness(0, false); // ⭐亮度 0 = 纯黑
    return filter;
}

// ===========================
// 创建 Spine
// ===========================
function createManaSpine() {
    const spine = new Spine({
        skeleton: "bluefive_skel",
        atlas: "bluefive_atlas",
    });

    const targetH = VH(4.5);
    const scale = targetH / (spine.height || 100);
    spine.scale.set(scale);

    spine.filters = [];

    return spine;
}

// ===========================
// 布局
// ===========================
function layoutMana() {
    manaSprites.forEach((sprite, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);

        sprite.x = VW(START_X + col * X_GAP);
        sprite.y = VH(START_Y + row * Y_GAP);
    });
}

// ===========================
// 更新状态
// ===========================
function updateMana(mp, maxMp) {
    if (!app) return;

    // 生成 maxMp
    while (manaSprites.length < maxMp) {
        const spine = createManaSpine();
        manaContainer.addChild(spine);
        manaSprites.push(spine);
    }

    // 删除多余
    while (manaSprites.length > maxMp) {
        const s = manaSprites.pop();
        manaContainer.removeChild(s);
        s.destroy?.();
    }

    // 更新状态
    manaSprites.forEach((spine, index) => {
        const active = index < mp;
        const anim = spine.skeleton.data.animations?.[0]?.name;

        if (active) {
            // 激活：正常播放动画
            spine.filters = [];
            spine.state.timeScale = 1;
            if (anim && !spine.state.tracks[0]) {
                spine.state.setAnimation(0, anim, true);
                spine.state.tracks[0].trackTime = sharedTime;
            }
        } else {
            // 1. 黑色滤镜（关键）
            spine.filters = [createBlackFilter()];

            // 2. 停止动画系统更新
            spine.state.timeScale = 0;

            // 3. 只清动画，不动 skeleton
            spine.state.clearTracks();

            // 4. 强制渲染当前静止姿态
            spine.state.apply(spine.skeleton);
            spine.skeleton.updateWorldTransform();
        }
    });

    layoutMana();
}

// ===========================
// 生命周期
// ===========================
onMounted(async () => {
    await loadAssets();

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

    updateMana(props.mp, props.maxMp);

    // 同步动画时间轴
    app.ticker.add(() => {
        sharedTime += app.ticker.deltaMS * 0.001;

        for (let i = 0; i < props.mp; i++) {
            const s = manaSprites[i];
            const track = s?.state?.tracks?.[0];
            if (track) track.trackTime = sharedTime;
        }
    });
});

// ===========================
// 响应变化
// ===========================
watch([() => props.mp, () => props.maxMp], ([mp, maxMp]) => {
    updateMana(mp, maxMp);
});

// ===========================
// 销毁
// ===========================
onBeforeUnmount(() => {
    if (app) {
        app.destroy(true, { children: true });
        app = null;
    }
});
</script>

<style scoped>
.pixi-wrap {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>