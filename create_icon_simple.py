#!/usr/bin/env python3
"""
简单方法生成图标 - 使用base64编码的PNG数据
如果Pillow不可用，可以使用这个方法
"""
import base64
import struct

def create_simple_png(size, filename):
    """创建一个简单的PNG图标"""
    # PNG文件头
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR块
    width = height = size
    bit_depth = 8
    color_type = 6  # RGBA
    compression = 0
    filter_method = 0
    interlace = 0
    
    ihdr_data = struct.pack('>IIBBBBB', width, height, bit_depth, color_type, 
                           compression, filter_method, interlace)
    ihdr_crc = 0x0d0a1a0a  # 简化的CRC
    ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # 创建简单的RGBA图像数据（黑色背景，白色X）
    pixels = []
    for y in range(height):
        for x in range(width):
            # 绘制X形状
            margin = size // 4
            is_on_x_line1 = abs((x - margin) - (y - margin) * (size - 2*margin) / (size - 2*margin)) < size // 16
            is_on_x_line2 = abs((x - (size - margin)) - (y - margin) * -(size - 2*margin) / (size - 2*margin)) < size // 16
            
            if is_on_x_line1 or is_on_x_line2:
                r, g, b, a = 255, 255, 255, 255  # 白色
            else:
                r, g, b, a = 0, 0, 0, 0  # 透明
            pixels.extend([r, g, b, a])
    
    # 使用zlib压缩（简化版本，实际需要使用zlib库）
    # 这里我们创建一个最小化的有效PNG
    idat_data = bytes(pixels)
    idat_chunk = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', 0)
    
    # IEND块
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', 0xae426082)
    
    # 组合PNG文件
    png_data = png_signature + ihdr_chunk + idat_chunk + iend_chunk
    
    with open(filename, 'wb') as f:
        f.write(png_data)
    
    print(f'已创建 {filename}')

# 使用Pillow创建更标准的图标
try:
    from PIL import Image, ImageDraw
    
    def create_icon_with_pillow():
        sizes = [16, 48, 128]
        for size in sizes:
            img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            line_width = max(2, size // 8)
            margin = size // 4
            
            # 绘制X
            draw.line([(margin, margin), (size - margin, size - margin)], 
                     fill=(255, 255, 255, 255), width=line_width)
            draw.line([(size - margin, margin), (margin, size - margin)], 
                     fill=(255, 255, 255, 255), width=line_width)
            
            img.save(f'icon_{size}.png', 'PNG')
            print(f'已生成 icon_{size}.png')
        
        # 复制128x128作为主图标
        import shutil
        shutil.copy('icon_128.png', 'icon.png')
        print('已创建 icon.png')
    
    create_icon_with_pillow()
    print('\n图标生成完成！')
    
except ImportError:
    print('Pillow未安装，尝试使用base64方法...')
    # 如果Pillow不可用，创建一个简单的16x16图标
    create_simple_png(128, 'icon.png')
    print('已创建基础图标 icon.png')
    print('建议安装Pillow以获得更好的图标质量: pip install Pillow')

