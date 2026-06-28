<template>
    <div>
        <div class="flex w-full h-100vh justify-end">
            <div class="fixed inset-0 overflow-hidden -z-1">
            </div>
            <!-- 背景spine图 -->
            <div class="absolute">
                <div ref="pixiRef" class="pixi-wrap">
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Application } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { loadAssets } from "@/components/loadAssets";
import { SkeletonBounds } from "@esotericsoftware/spine-core";



function VW(value) {
    return window.innerWidth * (value / 100);
}

function VH(value) {
    return window.innerHeight * (value / 100);
}

const pixiRef = ref(null);

let app = null;

function createSpine({
    skeleton,
    atlas,
    width = 20,
    x = 50,
    y = 100,
    animation,
    loop = true,
    onClick,
}) {
    const spine = new Spine({
        skeleton,
        atlas,
    });

    app.stage.addChild(spine);

    const bounds = new SkeletonBounds();

    let latestHit = null;

    // =========================
    // 每帧同步（关键稳定点）
    // =========================
    app.ticker.add(() => {
        bounds.update(spine.skeleton, true);
    });

    app.ticker.addOnce(() => {
        spine.autoUpdate = true;

        spine.scale.set(VW(width) / 100);
        spine.x = VW(x);
        spine.y = VH(y);

        const anim =
            animation ||
            spine.skeleton.data.animations?.[0]?.name;

        if (anim) {
            spine.state.setAnimation(0, anim, loop);
        }

        spine.eventMode = "static";

        spine.on("pointertap", (event) => {
            const local = spine.toLocal(event.global);

            const hit = bounds.containsPoint(local.x, local.y);

            latestHit = hit;

            if (!hit) {
                onClick?.({
                    spine,
                    slot: null,
                    event,
                });
                return;
            }

            const slotName = hit.name || null;

            onClick?.({
                spine,
                slot: slotName,
                attachment: hit,
                event,
            });
        });
    });

    return spine;
}
onMounted(async () => {
    // 加载资源
    await loadAssets()
    // 创建Pixi
    app = new Application();

    await app.init({

        resizeTo: window,

        resolution: Math.min(
            window.devicePixelRatio,
            2
        ),

        autoDensity: true,

        backgroundAlpha: 0,

        antialias: true,
    });

    // 挂载canvas
    pixiRef.value.appendChild(
        app.canvas
    );

    //需要加载的spine文件放下面
    const bg = createSpine({

        skeleton: "bluefive_skel",
        atlas: "bluefive_atlas",

        width: 1.5,

        x: 45,
        y: 20,
    });

    await nextTick()

});

onBeforeUnmount(() => {

    if (app) {
        app.destroy(true);
        app = null;
    }
});



</script>

<style scoped>
/* Pixi层 */
.pixi-wrap {
    position: relative;
    z-index: 2;
}
</style>