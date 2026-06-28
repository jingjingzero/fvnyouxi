import { ReflectionFilter, GodrayFilter, AdjustmentFilter, OldFilmFilter } from "pixi-filters";
import { gsap } from "gsap";
// ==============================================
// 倒影滤镜全局缓存（原有逻辑完全保留）
// ==============================================
let reflectionFilter = null;
let targetViewport = null;
let targetApp = null;
let currentBoundary = 0.87;

// ==============================================
// 丁达尔体积光 全局缓存
// ==============================================
let godrayFilter = null;
let godrayTicker = null;
let godrayContainer = null;
let godrayApp = null;

// ==============================================
// 昼夜滤镜 全局缓存（Worker计算，无内置ticker，统一外部驱动）
// ==============================================
let dayNightFilter = null;
let dayNightContainer = null;
let dayNightApp = null;
let dayTime = 0;
let dayTimeSpeed = 0.0005;
let dayNightWorker = null;
// 新增标记：滤镜是否处于隐藏状态（室内场景）
let dayNightHidden = false;

// ==============================================
// 倒影对外API（原代码不变）
// ==============================================
export function isReflectionActive() {
    return !!reflectionFilter;
}
export function getCurrentBoundary() {
    return currentBoundary;
}
export function setReflectionBoundary(value) {
    currentBoundary = value;
}

export function createReflectionFilter(viewport, app, bgContainer) {
    removeReflectionFilter();

    targetViewport = viewport;
    targetApp = app;

    reflectionFilter = new ReflectionFilter({
        boundary: 0.87,
        amplitude: [2, 8],
        waveLength: [80, 150],
        alpha: [0.5, 0.7],
        mirror: true,
        time: 0,
    });

    reflectionFilter.clearColor = [1, 1, 1, 0];
    reflectionFilter.resolution = app.renderer.resolution;

    const currentFilters = viewport.filters || [];
    viewport.filters = [...currentFilters, reflectionFilter];
}

export function removeReflectionFilter() {
    if (!reflectionFilter) return;

    if (targetViewport) {
        const remain = targetViewport.filters?.filter(f => f !== reflectionFilter) || [];
        targetViewport.filters = remain.length ? remain : null;
    }

    reflectionFilter = null;
    targetViewport = null;
    targetApp = null;
    currentBoundary = 0.87;
}

// ==============================================
// 丁达尔体积光对外API（原代码不变）
// ==============================================
export function createGodrayLight(bgContainer, app, worldLightSource, activePlayer) {
    removeGodrayLight();
    if (!worldLightSource || !activePlayer) return;

    godrayContainer = bgContainer;
    godrayApp = app;

    godrayFilter = new GodrayFilter({
        angle: 30,
        gain: 0.75,
        lacunarity: 2.5,
        alpha: 0.5
    });
    godrayFilter.parallel = false
    godrayFilter.center = {
        x: worldLightSource.x,
        y: worldLightSource.y * -7
    };
    godrayFilter.resolution = 1.5;
    godrayFilter.time = 0;
    bgContainer.filters = [...(bgContainer.filters || []), godrayFilter];
}

export function removeGodrayLight() {
    if (!godrayFilter) return;

    if (godrayTicker && godrayApp) {
        godrayApp.ticker.remove(godrayTicker);
    }

    if (godrayContainer) {
        const remainFilters = godrayContainer.filters?.filter(f => f !== godrayFilter) || [];
        godrayContainer.filters = remainFilters.length ? remainFilters : null;
    }

    godrayFilter = null;
    godrayTicker = null;
    godrayContainer = null;
    godrayApp = null;
}
export function isGodrayActive() {
    return !!godrayFilter;
}
export function getGodrayFilter() {
    return godrayFilter;
}
export function getReflectionFilter() {
    return reflectionFilter;
}

// Worker 初始化：仅数学计算，不包含任何计时、ticker逻辑
function initDayNightWorker() {
    if (dayNightWorker) return;
    const workerCode = `
    self.onmessage = (e) => {
    const { dayTime } = e.data;
    const t = Math.sin(dayTime * Math.PI);
    // 基础明暗对比
    const brightness = lerp(1.0, 0.42, t);
    const contrast = lerp(1.0, 1.3, t);
    const saturation = lerp(1.0, 0.55, t);
    // 白天纯白，夜晚偏冷蓝
    const red = lerp(1.0, 0.6, t);
    const green = lerp(1.0, 0.72, t);
    const blue = lerp(1.0, 1.45, t);
    self.postMessage({ brightness, contrast, saturation, red, green, blue });
     };
     function lerp(a,b,t){return a+(b-a)*t}
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    dayNightWorker = new Worker(blobUrl);

    // Worker回传计算结果，主线程赋值滤镜
    dayNightWorker.onmessage = (e) => {
        if (!dayNightFilter) return;
        const { brightness, contrast, saturation, red, green, blue } = e.data;
        dayNightFilter.brightness = brightness;
        dayNightFilter.contrast = contrast;
        dayNightFilter.saturation = saturation;
        dayNightFilter.red = red;
        dayNightFilter.green = green;
        dayNightFilter.blue = blue;
    };
}

/** 创建昼夜滤镜，挂载至bgContainer */
export function createDayNightFilter(bgContainer, app) {
    // 已经创建过，只更新容器、不重置时间、不重建Worker
    if (dayNightFilter) {
        dayNightContainer = bgContainer;
        dayNightApp = app;
        dayNightHidden = false;
        // 重新挂载回容器
        const currentFilters = bgContainer.filters || [];
        if (!currentFilters.includes(dayNightFilter)) {
            bgContainer.filters = [...currentFilters, dayNightFilter];
        }
        return;
    }

    // 首次创建
    initDayNightWorker();
    dayNightContainer = bgContainer;
    dayNightApp = app;
    dayNightHidden = false;

    dayNightFilter = new AdjustmentFilter();
    dayNightFilter.resolution = app.renderer.resolution;
    const currentFilters = bgContainer.filters || [];
    bgContainer.filters = [...currentFilters, dayNightFilter];
}
export function hideDayNightFilter() {
    if (!dayNightFilter || dayNightHidden) return;
    dayNightHidden = true;
    // 从容器移除滤镜，视觉关闭，但实例、Worker、dayTime全部保留
    if (dayNightContainer) {
        const remainFilters = dayNightContainer.filters?.filter(f => f !== dayNightFilter) || [];
        dayNightContainer.filters = remainFilters.length ? remainFilters : null;
    }
}
// 新增：恢复显示滤镜，使用当前已计算的昼夜时间
export function showDayNightFilter() {
    if (!dayNightFilter || !dayNightHidden) return;
    dayNightHidden = false;
    const currentFilters = dayNightContainer.filters || [];
    if (!currentFilters.includes(dayNightFilter)) {
        dayNightContainer.filters = [...currentFilters, dayNightFilter];
    }
    // 恢复瞬间同步一次最新昼夜参数
    if (dayNightWorker) dayNightWorker.postMessage({ dayTime });
}
/** 销毁昼夜滤镜，终止Worker、清空缓存 */
export function destroyDayNightFilter() {
    if (!dayNightFilter) return;
    // 移除滤镜
    if (dayNightContainer) {
        const remainFilters = dayNightContainer.filters?.filter(f => f !== dayNightFilter) || [];
        dayNightContainer.filters = remainFilters.length ? remainFilters : null;
    }
    // 彻底销毁Worker
    if (dayNightWorker) {
        dayNightWorker.terminate();
        dayNightWorker = null;
    }
    // 全部重置清空
    dayNightFilter = null;
    dayNightContainer = null;
    dayNightApp = null;
    dayNightHidden = false;
    dayTime = 0;
    dayTimeSpeed = 0.0005;
}
/** 判断昼夜滤镜是否启用 */
export function isDayNightActive() {
    return !!dayNightFilter;
}

/** 获取昼夜滤镜实例 */
export function getDayNightFilter() {
    return dayNightFilter;
}

/** 外部设置昼夜流逝速度 */
export function setDayNightSpeed(speed) {
    dayTimeSpeed = speed;
}
export function getDayNightSpeed() {
    return dayTimeSpeed;
}
/** 外部手动设置昼夜时间 0~1 */
export function setDayTime(value) {
    dayTime = Math.max(0, Math.min(1, value));
    // 手动设置时间后同步更新一次滤镜
    if (dayNightWorker) dayNightWorker.postMessage({ dayTime });
}

/** 获取当前昼夜时间 0~1 */
export function getDayTime() {
    return dayTime;
}

/** 主动推送当前昼夜时间给Worker计算（页面ticker调用） */
export function updateDayNightCalc() {
    if (!dayNightWorker || !dayNightFilter) return;
    dayNightWorker.postMessage({ dayTime });
}

export function isNight() {
    const t = Math.sin(getDayTime() * Math.PI);
    return t > 0.3;
}

/** 判断是否白天 */
export function isDay() {
    return !isNight();
}

/** 获取黑夜程度 0~1，0纯白昼，1最深午夜 */
export function getNightFactor() {
    return Math.sin(getDayTime() * Math.PI);
}

// ==============================================
// 老电影过渡滤镜 全局缓存（战斗入场过渡，默认挂载 app.stage）
// ==============================================
let oldFilmFilter = null;
let oldFilmApp = null;
let oldFilmTarget = null;
let oldFilmTickerFn = null;
let oldFilmHidden = false;

// ==============================================
// 公开：创建滤镜
// ==============================================
export function createOldFilmFilter(app, targetContainer) {
    if (!app || !app.renderer) {
        console.warn("createOldFilmFilter 无效：缺少合法 app 实例");
        return;
    }
    removeOldFilmFilter();

    oldFilmApp = app;
    oldFilmTarget = targetContainer || app.stage;
    oldFilmHidden = false;
   console.log("触发")
    oldFilmFilter = new OldFilmFilter({
        sepia: 0,
        noise: 0,
        noiseSize: 1,
        scratch: -1,
        scratchDensity: 0,
        scratchWidth: 1,
        vignetting: 0,
        vignettingAlpha: 1,
        vignettingBlur: 0.25
    });
    oldFilmFilter.resolution = app.renderer.resolution;

    // 放到数组末尾，保证层级最高
    const currentFilters = oldFilmTarget.filters || [];
    oldFilmTarget.filters = [...currentFilters, oldFilmFilter];
}

// ==============================================
// 公开：移除并销毁滤镜
// ==============================================
export function removeOldFilmFilter() {
    _stopTicker();

    if (!oldFilmFilter) return;

    if (oldFilmTarget) {
        const remain = oldFilmTarget.filters?.filter(f => f !== oldFilmFilter) || [];
        oldFilmTarget.filters = remain.length ? remain : null;
    }

    oldFilmFilter = null;
    oldFilmApp = null;
    oldFilmTarget = null;
    oldFilmHidden = false;
}

// ==============================================
// 公开：状态查询
// ==============================================
export function isOldFilmActive() {
    return !!oldFilmFilter;
}

export function getOldFilmFilter() {
    return oldFilmFilter;
}


// ==============================================
// 公开：隐藏 / 显示
// ==============================================
export function hideOldFilmFilter() {
    if (!oldFilmFilter || oldFilmHidden) return;
    oldFilmHidden = true;
    if (oldFilmTarget) {
        const remain = oldFilmTarget.filters?.filter(f => f !== oldFilmFilter) || [];
        oldFilmTarget.filters = remain.length ? remain : null;
    }
}

export function showOldFilmFilter() {
    if (!oldFilmFilter || !oldFilmHidden) return;
    oldFilmHidden = false;
    const currentFilters = oldFilmTarget.filters || [];
    const remain = currentFilters.filter(f => f !== oldFilmFilter);
    oldFilmTarget.filters = [...remain, oldFilmFilter];
}

// ==============================================
// 内部：ticker 动画控制
// ==============================================
function _stopTicker() {
    if (oldFilmTickerFn && oldFilmApp) {
        oldFilmApp.ticker.remove(oldFilmTickerFn);
    }
    oldFilmTickerFn = null;
}

function _tweenByTicker(target, prop, from, to, duration, ease, onComplete) {
    _stopTicker();
    if (!oldFilmApp) return;

    target[prop] = from;
    const startTime = oldFilmApp.ticker.lastTime;

    oldFilmTickerFn = () => {
        if (!oldFilmApp || !oldFilmFilter) {
            _stopTicker();
            return;
        }
        const elapsed = (oldFilmApp.ticker.lastTime - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const eased = ease(progress);

        target[prop] = from + (to - from) * eased;

        if (progress >= 1) {
            _stopTicker();
            onComplete?.();
        }
    };

    oldFilmApp.ticker.add(oldFilmTickerFn);
}

// ==============================================
// 内部：缓动函数
// ==============================================
function _easeOutPower2(t) {
    return 1 - (1 - t) * (1 - t);
}

function _easeInPower2(t) {
    return t * t;
}