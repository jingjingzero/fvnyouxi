from PIL import Image
SRC = r'C:\Users\Admin\Downloads\377ddcd1-9460-4590-9398-8e908ad474cb_aigc_1788196819863.png'
im = Image.open(SRC).convert('RGBA')
px = im.load()

col_ranges = [(33,156),(171,296),(310,434),(449,572),(587,711),(726,850),(865,989)]
row_ranges = [(33,158),(172,296),(310,434),(448,572),(586,711),(725,850),(864,989)]

# 取第0行前3个瓦片，分析内容区边缘一圈 vs 中心颜色
import statistics
def region_stats(x0,y0,x1,y1):
    rs=[];gs=[];bs=[];as_=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b,a = px[x,y]
            if a>8:
                rs.append(r);gs.append(g);bs.append(b);as_.append(a)
    if not rs: return None
    return (statistics.mean(rs),statistics.mean(gs),statistics.mean(bs))

for c,(xs,xe) in enumerate(col_ranges[:3]):
    ys,ye = row_ranges[0]
    # 内容bbox
    minx,maxx,miny,maxy=10**9,-1,10**9,-1
    for y in range(ys,ye+1):
        for x in range(xs,xe+1):
            if px[x,y][3]>8:
                minx=min(minx,x);maxx=max(maxx,x);miny=min(miny,y);maxy=max(maxy,y)
    bw=maxx-minx+1;bh=maxy-miny+1
    # 边缘1px、2px、3px vs 中心
    e1=region_stats(minx,miny,maxx+1,miny+1)      # 上边缘
    e2=region_stats(minx,maxy,maxx+1,maxy+1)      # 下边缘
    e3=region_stats(minx,miny,minx+1,maxy+1)      # 左边缘
    e4=region_stats(maxx,miny,maxx+1,maxy+1)      # 右边缘
    cen=region_stats(minx+10,miny+10,maxx-9,maxy-9)
    print(f'瓦片列{c} 内容bbox=({minx},{miny})-({maxx},{maxy}) 尺寸{bw}x{bh}')
    print(f'  上缘RGB≈({e1[0]:.0f},{e1[1]:.0f},{e1[2]:.0f}) 下缘≈({e2[0]:.0f},{e2[1]:.0f},{e2[2]:.0f})')
    print(f'  左缘RGB≈({e3[0]:.0f},{e3[1]:.0f},{e3[2]:.0f}) 右缘≈({e4[0]:.0f},{e4[1]:.0f},{e4[2]:.0f})')
    print(f'  中心RGB≈({cen[0]:.0f},{cen[1]:.0f},{cen[2]:.0f})')
