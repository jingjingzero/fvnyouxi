    import { AdjustmentFilter } from "pixi-filters";

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
    // 🖼️ 昼夜滤镜"渲染就绪"标记：Worker 首次回传参数后置 true（此时滤镜才是正确明暗效果）
    let dayNightReady = false;
    let dayNightReadyWaiters = [];
    function resolveDayNightReady() {
        if (dayNightReady) return;
        dayNightReady = true;
        const ws = dayNightReadyWaiters;
        dayNightReadyWaiters = [];
        ws.forEach(r => r());
    }
    /** 等待昼夜滤镜渲染就绪（Worker 首次回传参数）；已就绪立即 resolve；超时兜底（不阻塞） */
    export function waitDayNightReady(timeout = 3000) {
        return new Promise((resolve) => {
            if (dayNightReady) return resolve(true);
            let done = false;
            const t = setTimeout(() => {
                if (done) return;
                done = true;
                dayNightReadyWaiters = dayNightReadyWaiters.filter(r => r !== onReady);
                resolve(false);
            }, timeout);
            const onReady = () => {
                if (done) return;
                done = true;
                clearTimeout(t);
                resolve(true);
            };
            dayNightReadyWaiters.push(onReady);
        });
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
            resolveDayNightReady(); // 🖼️ 首次回传 → 滤镜参数就绪
        };
    }
    function lerp(a, b, t) {
    return a + (b - a) * t;
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
        // 🖼️ 创建后立即同步一次昼夜参数：保证 Worker 必有一次回传（→ dayNightReady=true），
        //    否则等待方（waitDayNightReady）会等到超时才放行，出现"地图先亮、夜晚后变黑"跳变
        dayNightWorker.postMessage({ dayTime });
        dayNightContainer = bgContainer;
        dayNightApp = app;
        dayNightHidden = false;

        dayNightFilter = new AdjustmentFilter();
        dayNightFilter.resolution = 1;
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
        dayNightReady = false;
        dayNightReadyWaiters = [];
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

    /** 直接设置为白天 */
    export function setDay() {
        setDayTime(0);
    }

    /** 直接设置为早上（清晨，天刚亮） */
    export function setMorning() {
        setDayTime(0.15); // sin(0.15*π)≈0.45，清晨微暗
    }

    /** 直接设置为夜晚 */
    export function setNight() {
        setDayTime(0.5); // sin(0.5*π)=1，最黑
    }

    /** 暂停自动昼夜变化 */
    export function pauseDayNightCycle() {
        dayTimeSpeed = 0;
    }

    /** 恢复自动昼夜变化（默认速度） */
    export function resumeDayNightCycle(speed = 0.0005) {
        dayTimeSpeed = speed;
    }
