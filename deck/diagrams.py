from PIL import Image, ImageDraw, ImageFont
import math
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
def piece(d, x, y, R, v):
    a, b = ((255,198,70),(255,138,61)) if v > 0 else ((142,197,255),(91,75,255))
    if abs(v) == 2:
        for k in range(12):
            t = k*math.pi/6; d.line([(x+R*.62*math.cos(t), y+R*.62*math.sin(t)), (x+R*math.cos(t), y+R*math.sin(t))], fill=b, width=int(R*.14))
        d.ellipse([x-R*.55,y-R*.55,x+R*.55,y+R*.55], fill=a, outline='white', width=4)
    else:
        pts=[(x+(R if k%2==0 else R*.42)*math.cos(-math.pi/2+k*math.pi/5), y+(R if k%2==0 else R*.42)*math.sin(-math.pi/2+k*math.pi/5)) for k in range(10)]
        d.polygon(pts, fill=a, outline='white', width=4)
def board(path, cells, n=6, rows=6, hl=(), arrows=(), ghosts=(), s=120):
    W, H = n*s+40, rows*s+40
    im = Image.new('RGB', (W, H), (18,26,68)); d = ImageDraw.Draw(im)
    for r in range(rows):
        for c in range(n):
            x, y = 20+c*s, 20+r*s
            d.rounded_rectangle([x+6,y+6,x+s-6,y+s-6], radius=22, fill=(34,48,106), outline=(255,214,107) if r*n+c in hl else (110,123,196), width=6 if r*n+c in hl else 2)
    for i, v in cells.items():
        r, c = divmod(i, n); piece(d, 20+c*s+s/2, 20+r*s+s/2, s*.38, v)
    for i in ghosts:
        r, c = divmod(i, n); x, y = 20+c*s+s/2, 20+r*s+s/2; d.ellipse([x-s*.3,y-s*.3,x+s*.3,y+s*.3], outline=(255,120,120), width=5)
    for (i, dr, dc) in arrows:
        r, c = divmod(i, n); x, y = 20+c*s+s/2, 20+r*s+s/2; ex, ey = x+dc*s*.55, y+dr*s*.55
        d.line([(x+dc*s*.2, y+dr*s*.2), (ex, ey)], fill=(255,255,255), width=8)
        ang = math.atan2(ey-y, ex-x); d.polygon([(ex+18*math.cos(ang), ey+18*math.sin(ang)), (ex+18*math.cos(ang+2.4), ey+18*math.sin(ang+2.4)), (ex+18*math.cos(ang-2.4), ey+18*math.sin(ang-2.4))], fill='white')
    im.save(path)
# 1: толчок в 4 стороны
board('d_push_before.png', {14:1, 8:-1, 13:-1, 15:1, 16:-1, 20:-1, 21:-1}, hl=(14,), arrows=((8,-1,0),(13,0,-1),(15,0,1),(20,1,0)))
board('d_push_after.png', {14:1, 2:-1, 12:-1, 16:1, 17:-1, 26:-1, 21:-1})
# 2: солнце-якорь
board('d_sun.png', {7:1, 8:-1, 9:-2, 10:-1, 19:-1, 25:-1}, hl=(7,), arrows=((7,1,0),))
# 3: пример хода (до/после) — золотые сбивают лазурную с края и строят диагональ
before = {0:1, 7:1, 14:-1, 15:-1, 21:-1, 22:1, 11:-1, 28:1}
board('d_ex_before.png', before, hl=(16,))
after = {0:1, 7:1, 14:-1, 16:1, 21:-1, 22:-1, 11:-1, 28:1}
board('d_ex_after.png', after, hl=(16,))
