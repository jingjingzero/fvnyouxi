
import { ElMessage } from "element-plus";

let closeTimer = null;

function ElMessText(content, type, duration = 1500) {
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
        duration
    });

    // 到时自动关闭（如果期间触发则重置）
    closeTimer = setTimeout(() => {
        ElMessage.closeAll();
        closeTimer = null;
    }, duration + 250);
}

// 导出 sleep 函数，便于其他文件引用
export { ElMessText };