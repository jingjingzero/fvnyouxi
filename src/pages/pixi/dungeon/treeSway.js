/**
 * 🌬️ 树冠摇曳 Shader（PixiJS v8 Filter）
 * 作用对象：地牢 cover_ 遮挡层（树冠 / 屋檐瓦片容器）
 * 两种动画模式（由 Tiled 图层自定义属性 swayMode 控制）：
 *   slide —— 左右横移：整层顶点同步做正弦左右平移
 *   swing —— 钟表式扇形：整层绕底部中心同相位旋转（折扇），底部钉死不动、顶部折扇弧线来回，顶部水平位移 ≈ uStrength 像素
 * 原理：顶点着色器按 RT 局部 Y 高度做正弦位移；碎片着色器透传原纹理。
 * 注意：v8 必须用 Filter.from({ gl })（内部 GlProgram.from 编译），
 *       直接 new Filter({ glProgram: {vertex,fragment} }) 会导致 shader 无效（黑屏）。
 * 性能：每层一次中间纹理渲染，瓦片少，开销可忽略。
 */
import { Filter } from 'pixi.js';

const TREE_SWAY_VERTEX_SLIDE = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
uniform float uTime;
uniform float uStrength;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  // 左右横移：整层同步左右平移（相位随高度轻微错开，避免呆板）
  float phase = uTime * 1.2 + aPosition.y * 0.02;
  float sway = sin(phase) * uStrength;
  position.x += sway;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const TREE_SWAY_VERTEX_SWING = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
uniform float uTime;
uniform float uStrength;

vec4 filterVertexPosition(void) {
  // 钟表式扇形（折扇）：整层绕底部中心 (0.5, 1.0) 做同相位旋转
  // 角度随高度衰减：底部（y=1）角度 0 → 整条底边钉死不动；顶部（y=0）角度最大 → 折扇弧线来回
  // 同相位（无 x 错开）→ 整层像钟摆统一左右倾斜
  // 幅度归一化：顶部水平位移 ≈ uStrength 像素（不随层高放大）
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  float h = max(uOutputFrame.w, 1.0);
  float t = 1.0 - clamp(aPosition.y, 0.0, 1.0);
  float ang = sin(uTime * 1.2) * (uStrength / h) * t;
  float dx = aPosition.x - 0.5;
  float dy = aPosition.y - 1.0;
  float ca = cos(ang);
  float sa = sin(ang);
  float nx = 0.5 + dx * ca - dy * sa;
  float ny = 1.0 + dx * sa + dy * ca;
  position.x = nx * uOutputFrame.z + uOutputFrame.x;
  position.y = ny * uOutputFrame.w + uOutputFrame.y;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const TREE_SWAY_VERTEX_SWING_REV = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
uniform float uTime;
uniform float uStrength;

vec4 filterVertexPosition(void) {
  // 反向钟摆（swing2）：与 swing 相反 —— 顶部（y=0）角度 0 → 顶边钉死不动；底部（y=1）角度最大 → 底部折扇弧线来回
  // 绕顶部中心 (0.5, 0.0) 做同相位旋转，幅度归一化：底部水平位移 ≈ uStrength 像素
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  float h = max(uOutputFrame.w, 1.0);
  float t = clamp(aPosition.y, 0.0, 1.0);
  float ang = sin(uTime * 1.2) * (uStrength / h) * t;
  float dx = aPosition.x - 0.5;
  float dy = aPosition.y;
  float ca = cos(ang);
  float sa = sin(ang);
  float nx = 0.5 + dx * ca - dy * sa;
  float ny = dy * ca + dx * sa;
  position.x = nx * uOutputFrame.z + uOutputFrame.x;
  position.y = ny * uOutputFrame.w + uOutputFrame.y;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const TREE_SWAY_FRAGMENT = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
void main() {
  finalColor = texture(uTexture, vTextureCoord);
}
`;

/**
 * 创建一个树冠摇曳滤镜
 * @param {number} strength 摆动幅度 px（默认 12）
 * @param {'slide'|'swing'|'swingRev'} mode 动画模式：slide=左右横移，swing=扇形摆动（底部固定头部动），swingRev=反向钟摆（顶部固定底部动）
 */
export function createTreeSwayFilter(strength = 12, mode = 'slide') {
  try {
    const vertex = mode === 'swing' ? TREE_SWAY_VERTEX_SWING : mode === 'swingRev' ? TREE_SWAY_VERTEX_SWING_REV : TREE_SWAY_VERTEX_SLIDE;
    return Filter.from({
      gl: { vertex, fragment: TREE_SWAY_FRAGMENT },
      resources: {
        treeUniforms: {
          uTime: { value: 0, type: 'f32' },
          uStrength: { value: strength, type: 'f32' },
        },
      },
    });
  } catch (e) {
    console.warn('[树冠摇曳] 创建滤镜失败，跳过：', e?.message || e);
    return null;
  }
}

/** 每帧更新摇曳时间（time：秒） */
export function updateTreeSway(filter, time) {
  if (filter?.resources?.treeUniforms) filter.resources.treeUniforms.uniforms.uTime = time;
}
