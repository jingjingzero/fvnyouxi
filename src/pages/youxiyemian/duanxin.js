// utils/checker.js
export function doCheck(value) {
    // 你想判断什么都可以写在这里
    let fanhui;
    console.log('value=', value);
    if (value === 'zoufang') {
        fanhui = { user: "琳恩", text: "收到。", src: "mytouxiang.png" }
    }
    return fanhui;
}