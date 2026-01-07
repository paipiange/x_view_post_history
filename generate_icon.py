#!/usr/bin/env python3
"""
生成Chrome扩展图标
创建一枚具有辨识度的X（Twitter）风格图标：
- 渐变蓝背景
- 白色粗线X
- 轻微外发光边缘
"""
from PIL import Image, ImageDraw
import os

def create_icon():
    sizes = [16, 48, 128]
    
    for size in sizes:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # 背景渐变（从浅蓝到深蓝）
        for y in range(size):
            ratio = y / max(1, size - 1)
            r = int(29 + (13 * ratio))   # 1d -> 2a
            g = int(155 + (20 * ratio))  # 9b -> af
            b = int(240 + (5 * ratio))   # f0 -> f5
            draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

        # 轻微圆角外框
        border = max(1, size // 24)
        draw.rounded_rectangle(
            [(border, border), (size - border, size - border)],
            radius=size // 6,
            outline=(255, 255, 255, 60),
            width=border
        )

        # 绘制白色X
        line_width = max(2, size // 7)
        margin = size // 4
        draw.line([(margin, margin), (size - margin, size - margin)],
                  fill=(255, 255, 255, 245), width=line_width)
        draw.line([(size - margin, margin), (margin, size - margin)],
                  fill=(255, 255, 255, 245), width=line_width)

        # 轻微发光（透明白环）
        glow_width = max(1, line_width // 2)
        draw.rounded_rectangle(
            [(margin - glow_width, margin - glow_width),
             (size - margin + glow_width, size - margin + glow_width)],
            radius=size // 5,
            outline=(255, 255, 255, 50),
            width=glow_width
        )

        img.save(f'icon_{size}.png', 'PNG')
        print(f'已生成 icon_{size}.png ({size}x{size})')
    
    if os.path.exists('icon_128.png'):
        import shutil
        shutil.copy('icon_128.png', 'icon.png')
        print('已创建 icon.png')

if __name__ == '__main__':
    try:
        create_icon()
        print('\n图标生成完成！')
    except ImportError:
        print('错误：需要安装Pillow库')
        print('请运行: pip install Pillow')
    except Exception as e:
        print(f'生成图标时出错: {e}')
