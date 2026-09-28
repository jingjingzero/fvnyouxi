/**
 * 生成 Windows 图标脚本
 * 用法: node scripts/gen-icon.cjs
 * 将 src/assets/icon/logo.webp 转换为 build/icon.png 和 build/icon.ico
 */
const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'assets', 'icon', 'logo.webp');
const OUT_PNG = path.join(__dirname, '..', 'build', 'icon.png');
const OUT_ICO = path.join(__dirname, '..', 'build', 'icon.ico');

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('❌ 找不到源图标:', SRC);
    process.exit(1);
  }

  // 1. WebP → 512x512 PNG（带透明）
  const pngBuf = await sharp(SRC)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync(OUT_PNG, pngBuf);
  console.log('✅ 已生成 icon.png (512x512)');

  // 2. PNG → ICO
  // png-to-ico 默认导出支持传 256x256 的 png 文件路径，自动 resize 生成标准尺寸
  const tmpPng = path.join(__dirname, '..', 'build', '_icon_256.png');
  await sharp(pngBuf)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(tmpPng);

  const icoFn = pngToIco.default || pngToIco;
  const ico = await icoFn(tmpPng);
  fs.writeFileSync(OUT_ICO, ico);
  fs.unlinkSync(tmpPng); // 清理临时文件
  console.log('✅ 已生成 icon.ico');

  // 3. 也输出一个 256 版供 Linux 等使用（可选）
  console.log('🎉 图标生成完成');
}

main().catch((e) => {
  console.error('❌ 图标生成失败:', e);
  process.exit(1);
});
