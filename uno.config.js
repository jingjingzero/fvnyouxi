/*
 * @作者: 冯星悦
 * @Date: 2024-05-30 09:21:55
 * @LastEditTime: 2025-04-17 17:37:19
 */
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    // 其他预设...
  ],
  rules: [
    ['bg-radial-gradient-center', {' background': 'radial-gradient(circle, #dedfe0,#c8c9cc, #b1b3b8)' }],
    ['bg-op-0.35', {' background': 'rgba(0, 0, 0, 0.35)' }],
    ['over-line',{'word-break':'break-all','overflow':'hidden','display':'-webkit-box','-webkit-line-clamp':'4',' -webkit-box-orient':'vertical'}],
    // 更多自定义规则...
    // 边框渐变色
    ['gradient-border', {
      'border': '1px solid transparent',
      'border-image-source': 'var(--border-gradient, linear-gradient(45deg, #3b82f6, #ffffff))',
      'border-image-slice': '1',
    }],
    [
      'red-glow-border',
      {
        border: '2px solid transparent',
        'border-image-source': 'linear-gradient(90deg, #ff0000, #ff4d4d, #ff0000)',
        'border-image-slice': '1',
        'box-shadow': '0 0 25px rgba(255, 45, 45, 0.6)',
      },
    ],
  ],
  // .... 其他配置
  theme:{
    breakpoints:{
      ssx:'0px',
      xs:'320px',
      sm:'480px',
      md:'768px',
      lgg:'875px',
      lg:'1024px',
      xl:'1280px',
      x1500:'1502px',
      xxl:'1600px'
    },
  }
})