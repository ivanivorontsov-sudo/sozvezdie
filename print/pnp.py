# Print & Play «Созвездие»: цветная и ч/б версии, A4
import math, sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white, black, Color
pdfmetrics.registerFont(TTFont('D', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DB', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
W, H = A4

def make(path, color):
    c = canvas.Canvas(path, pagesize=A4); c.setTitle('Созвездие — Print & Play' + ('' if color else ' (ч/б)')); c.setAuthor('Иван Воронцов')
    P = dict(
        bg=HexColor('#121A44') if color else white, cell=HexColor('#22306A') if color else white, line=HexColor('#6E7BC4') if color else black,
        ink=white if color else black, gold=HexColor('#FFC646') if color else white, gold2=HexColor('#FF8A3D') if color else black,
        blue=HexColor('#8EC5FF') if color else HexColor('#9a9a9a'), blue2=HexColor('#5B4BFF') if color else black)
    def cutline(x1, y1, x2, y2):
        c.saveState(); c.setStrokeColor(black); c.setLineWidth(0.6); c.setDash(4, 3); c.line(x1, y1, x2, y2); c.restoreState()
    def foldline(x1, y1, x2, y2):
        c.saveState(); c.setStrokeColor(HexColor('#777777')); c.setLineWidth(0.6); c.setDash([1, 2, 6, 2]); c.line(x1, y1, x2, y2); c.restoreState()
    def cutrect(x, y, w, h):
        for a in [(x, y, x + w, y), (x + w, y, x + w, y + h), (x + w, y + h, x, y + h), (x, y + h, x, y)]: cutline(*a)
    def scissors(x, y, rot=0):
        c.saveState(); c.translate(x, y); c.rotate(rot); c.setFont('D', 12); c.setFillColor(black); c.drawString(-5, -4, '✂'); c.restoreState()
    def header(t, sub=''):
        c.setFillColor(black); c.setFont('DB', 16); c.drawString(1.5 * cm, H - 1.6 * cm, t)
        from reportlab.lib.utils import simpleSplit
        c.setFont('D', 9)
        for j, ln in enumerate(simpleSplit(sub, 'D', 9, W - 3 * cm)): c.drawString(1.5 * cm, H - 2.15 * cm - j * 0.4 * cm, ln)
        c.setFont('D', 7.5); c.setFillColor(HexColor('#555555'))
        c.drawRightString(W - 1.5 * cm, 1 * cm, 'Созвездие · Print & Play · печатать в масштабе 100% (без «подогнать по размеру») · - - - резать   – · – сгибать')
    def star(x, y, R, fill, stroke, lw=1.2):
        p = c.beginPath()
        for k in range(10):
            r = R if k % 2 == 0 else R * 0.42; t = math.pi / 2 + k * math.pi / 5
            (p.moveTo if k == 0 else p.lineTo)(x + r * math.cos(t), y + r * math.sin(t))
        p.close(); c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(lw); c.drawPath(p, fill=1, stroke=1)
    def sun(x, y, R, fill, stroke):
        c.setStrokeColor(stroke); c.setLineWidth(R * 0.12)
        for k in range(12):
            t = k * math.pi / 6; c.line(x + R * .62 * math.cos(t), y + R * .62 * math.sin(t), x + R * math.cos(t), y + R * math.sin(t))
        c.setLineWidth(1.2); c.setFillColor(fill); c.circle(x, y, R * 0.55, fill=1, stroke=1); c.circle(x, y, R * 0.18, fill=0, stroke=1)
    def piece(x, y, R, who, kind):
        f, s = (P['gold'], P['gold2']) if who == 1 else (P['blue'], P['blue2'])
        if not color: s = black
        if kind == 'sun': sun(x, y, R, f, s)
        else: star(x, y, R, f, s)
        if not color and who == -1:  # в ч/б синие отличаются точкой в центре
            c.setFillColor(black); c.circle(x, y, R * 0.13, fill=1, stroke=0)
    # ---------- 1. Обложка + состав ----------
    header('Созвездие — набор для печати' + ('' if color else ' (экономия чернил)'), 'Абстрактная логическая игра для 2 игроков · 15–25 минут · 8+')
    c.setFont('D', 11); c.setFillColor(black); y = H - 3.6 * cm
    for line in ['Что напечатать (все листы A4, масштаб 100%):', '', '  Лист 2 — игровое поле 6×6 (18×18 см), 1 лист.',
                 '  Листы 3–4 — большое поле 24×24 см из двух листов (по желанию).',
                 '  Лист 5 — сгибаемые двусторонние жетоны: по 12 звёзд и 1 Солнцу на игрока.',
                 '  Лист 6 — Солнца-фигурки (стоячие), шкалы трофеев и 2 памятки.', '  Лист 7 — краткие правила.', '',
                 'Понадобится: ножницы, клей-карандаш, по желанию — плотная бумага 160–220 г/м² или картон.',
                 'Жетоны: вырезать по пунктиру, согнуть по линии «– · –», склеить половинки.', 'Монетки или пуговицы двух цветов тоже подойдут вместо жетонов.',
                 '', 'Себестоимость печати: 7 листов ≈ 35–70 ₽ на струйном/лазерном принтере.']:
        c.drawString(1.5 * cm, y, line); y -= 0.62 * cm
    # картинка-обложка
    cx, cy = W / 2, 8.5 * cm
    if color:
        c.setFillColor(P['bg']); c.roundRect(cx - 8 * cm, cy - 5 * cm, 16 * cm, 10 * cm, 0.6 * cm, fill=1, stroke=0)
    else:
        c.setStrokeColor(black); c.roundRect(cx - 8 * cm, cy - 5 * cm, 16 * cm, 10 * cm, 0.6 * cm, fill=0, stroke=1)
    for (dx, dy, w, k) in [(-5, 1.5, 1, 'star'), (-2.6, -0.5, 1, 'star'), (-0.2, -2.5, 1, 'star'), (2.6, 2, -1, 'star'), (5, -1, -1, 'sun'), (4.2, 1.2, -1, 'star')]:
        piece(cx + dx * cm, cy + dy * cm, 1.0 * cm, w, k)
    c.setFillColor(P['ink']); c.setFont('DB', 30); c.drawCentredString(cx, cy + 3.3 * cm, 'СОЗВЕЗДИЕ')
    c.setFont('D', 11); c.drawCentredString(cx, cy - 4.2 * cm, 'Сложи четыре звезды в ряд — или столкни соперника с неба')
    c.showPage()
    # ---------- поле ----------
    def board(ox, oy, s, clip=None):
        n = 6; size = n * s; m = 0.5 * cm
        c.saveState()
        if clip: p = c.beginPath(); p.rect(*clip); c.clipPath(p, stroke=0, fill=0)
        c.setFillColor(P['bg']); c.setStrokeColor(black); c.setLineWidth(1)
        c.roundRect(ox - m, oy - m, size + 2 * m, size + 2 * m, 0.4 * cm, fill=1 if color else 0, stroke=1)
        for r in range(n):
            for q in range(n):
                x, y = ox + q * s, oy + (n - 1 - r) * s
                c.setFillColor(P['cell']); c.setStrokeColor(P['line']); c.setLineWidth(1.2)
                c.roundRect(x + s * .06, y + s * .06, s * .88, s * .88, s * .18, fill=1, stroke=1)
                if not color: pass
        # маленькие звёздочки-ориентиры по углам клеток и буквы
        c.setFillColor(P['ink'] if color else black); c.setFont('D', 9)
        for q in range(n): c.drawCentredString(ox + q * s + s / 2, oy - m * 0.75, 'абвгде'[q])
        for r in range(n): c.drawCentredString(ox - m * 0.55, oy + (n - 1 - r) * s + s / 2 - 3, str(r + 1))
        c.restoreState()
        return size
    s = 3 * cm; ox = (W - 6 * s) / 2; oy = 4.5 * cm
    header('Игровое поле 6×6', 'Вырежьте по внешнему пунктиру. Можно наклеить на картон.')
    board(ox, oy, s); cutrect(ox - 0.8 * cm, oy - 0.8 * cm, 6 * s + 1.6 * cm, 6 * s + 1.6 * cm); scissors(ox - 0.8 * cm, oy + 6 * s + 1.2 * cm, 0)
    c.setFont('D', 9); c.setFillColor(black)
    c.drawString(1.5 * cm, 2.6 * cm, 'Золотые сидят со стороны букв, лазурные — напротив. Запись ходов: «в3», «С:г4» (Солнце).')
    c.showPage()
    # ---------- большое поле на 2 листах ----------
    s2 = 4 * cm; size = 6 * s2  # 24 см
    for half in (0, 1):
        header(f'Большое поле 24×24 см — часть {half + 1} из 2', 'Вырежьте по пунктиру. Часть 2 заходит под часть 1 на серый клапан; совместите метки ⊕.')
        # показываем 3 ряда (верхняя/нижняя половина), поле повернуто: ширина 24 см не влезает в 21 — кладём лист альбомно поворотом
        c.saveState(); c.translate(W, 0); c.rotate(90)  # теперь ширина = 29.7
        PW, PH = H, W
        ox2 = (PW - size) / 2; oy2 = 3.2 * cm
        rows_h = 3 * s2
        # half 0 — верхние 3 ряда, half 1 — нижние 3 ряда
        clip = (ox2 - 1 * cm, oy2 - (0 if half == 0 else 1 * cm), size + 2 * cm, rows_h + 1 * cm)
        board_y = oy2 - (3 * s2 if half == 0 else 0)
        board(ox2, board_y, s2, clip=(ox2 - 1 * cm, oy2, size + 2 * cm, rows_h + (0.6 * cm if half == 0 else 0.6 * cm)) if False else None) if False else None
        c.saveState(); p = c.beginPath()
        if half == 0: p.rect(ox2 - 1 * cm, oy2, size + 2 * cm, rows_h + 0.6 * cm)
        else: p.rect(ox2 - 1 * cm, oy2 - 0.6 * cm, size + 2 * cm, rows_h + 0.6 * cm)
        c.clipPath(p, stroke=0, fill=0); board(ox2, board_y, s2); c.restoreState()
        if half == 1:  # клапан для склейки
            c.setFillColor(HexColor('#DDDDDD')); c.rect(ox2 - 0.5 * cm, oy2 + rows_h, size + 1 * cm, 1.2 * cm, fill=1, stroke=0)
            c.setFillColor(black); c.setFont('D', 9); c.drawCentredString(ox2 + size / 2, oy2 + rows_h + 0.45 * cm, 'КЛЕЙ — сюда ложится часть 1')
            top = oy2 + rows_h + 1.2 * cm; bot = oy2 - 0.6 * cm
        else:
            top = oy2 + rows_h + 0.6 * cm; bot = oy2
        cutrect(ox2 - 0.6 * cm, bot, size + 1.2 * cm, top - bot); scissors(ox2 - 0.6 * cm, top + 0.4 * cm)
        # метки совмещения на линии стыка
        yj = oy2 if half == 0 else oy2 + rows_h
        c.setStrokeColor(black); c.setLineWidth(0.8)
        for xx in (ox2 + s2, ox2 + size / 2, ox2 + size - s2):
            c.circle(xx, yj, 0.25 * cm, stroke=1, fill=0); c.line(xx - 0.4 * cm, yj, xx + 0.4 * cm, yj); c.line(xx, yj - 0.4 * cm, xx, yj + 0.4 * cm)
        c.restoreState(); c.showPage()
    # ---------- жетоны (сгибаемые) ----------
    header('Жетоны: звёзды и Солнца (сгибаемые, двусторонние)', 'Вырежьте полоску по пунктиру, согните по «– · –», склейте. Получится двусторонний жетон 2,4×2,4 см.')
    tw = 2.4 * cm; gx = 1.3 * cm; top = H - 3 * cm
    items = [(1, 'star')] * 12 + [(1, 'sun')] + [(-1, 'star')] * 12 + [(-1, 'sun')]
    cols = 7
    for k, (who, kind) in enumerate(items):
        q, r = k % cols, k // cols
        x = gx + q * (tw + 0.35 * cm); y = top - (r + 1) * (2 * tw + 0.25 * cm)
        if y < 1.4 * cm: break
        for half in (0, 1):
            yy = y + half * tw
            if color: c.setFillColor(P['bg']); c.rect(x, yy, tw, tw, fill=1, stroke=0)
            piece(x + tw / 2, yy + tw / 2, tw * 0.4, who, kind)
        cutrect(x, y, tw, 2 * tw); foldline(x, y + tw, x + tw, y + tw)
    scissors(gx - 0.5 * cm, top - 0.3 * cm)
    c.showPage()
    # ---------- Солнца-фигурки, трофеи, памятки ----------
    header('Солнца-фигурки, шкалы трофеев, памятки', 'Фигурка: вырезать, согнуть по «– · –» в треугольник-подставку, склеить основание. Ставится на клетку вместо жетона Солнца.')
    for i, who in enumerate((1, -1)):
        x0 = 1.6 * cm + i * 5.0 * cm; y0 = H - 13.2 * cm; w = 2.6 * cm; hh = 3.6 * cm
        # развертка: основание - лицо - спина - основание
        segs = [(0, 1.3 * cm, 'база'), (1.3 * cm, hh, 'лицо'), (1.3 * cm + hh, hh, 'спина'), (1.3 * cm + 2 * hh, 1.3 * cm, 'база')]
        for (off, h, name) in segs:
            yy = y0 + off
            if name in ('лицо', 'спина'):
                if color: c.setFillColor(P['bg']); c.rect(x0, yy, w, h, fill=1, stroke=0)
                c.saveState()
                if name == 'спина': c.translate(x0 + w / 2, yy + h / 2); c.rotate(180); c.translate(-(x0 + w / 2), -(yy + h / 2))
                piece(x0 + w / 2, yy + h / 2 + 0.2 * cm, w * 0.42, who, 'sun'); c.setFillColor(P['ink'] if color else black); c.setFont('DB', 8)
                c.drawCentredString(x0 + w / 2, yy + 0.25 * cm, 'СОЛНЦЕ'); c.restoreState()
            else:
                c.setFillColor(HexColor('#EEEEEE')); c.rect(x0, yy, w, h, fill=1, stroke=0); c.setFillColor(black); c.setFont('D', 7); c.drawCentredString(x0 + w / 2, yy + h / 2 - 2, 'клей' if off else 'основание')
        cutrect(x0, y0, w, 2.6 * cm + 2 * hh)
        for f in (1.3 * cm, 1.3 * cm + hh, 1.3 * cm + 2 * hh): foldline(x0, y0 + f, x0 + w, y0 + f)
    scissors(1.2 * cm, H - 2.7 * cm)
    # шкалы трофеев
    for i, who in enumerate((1, -1)):
        x0 = 11.5 * cm; y0 = H - 4.9 * cm - i * 3.4 * cm; cw = 1.4 * cm
        c.setFillColor(black); c.setFont('DB', 9); c.drawString(x0, y0 + 1.6 * cm, 'Трофеи ' + ('золотых' if who == 1 else 'лазурных') + (' (начинают с 0)' if who == 1 else ' (начинают с 1)'))
        for k in range(6):
            x = x0 + k * cw
            if color: c.setFillColor(P['bg']); c.rect(x, y0, cw, 1.5 * cm, fill=1, stroke=0)
            c.setStrokeColor(black); c.setLineWidth(0.5); c.rect(x, y0, cw, 1.5 * cm, fill=0, stroke=1)
            c.setFillColor(P['ink'] if color else black); c.setFont('DB', 14 if k < 5 else 7.5); c.drawCentredString(x + cw / 2, y0 + 0.55 * cm, str(k) if k < 5 else 'ПОБЕДА')
        cutrect(x0 - 0.2 * cm, y0 - 0.2 * cm, 6 * cw + 0.4 * cm, 2.4 * cm)
    # памятки
    memo = ['ПАМЯТКА', 'Ход: поставь звезду (или Солнце —', 'не первым ходом партии) на пустую клетку.', 'Она толкает соседей по 4 сторонам:',
            'вся цепочка сдвигается на 1 клетку.', 'Цепочка с Солнцем стоит на месте.', 'Чужая за край — твой трофей,', 'своя за край — обратно в запас.',
            'Нет звёзд — переставь свою звезду.', 'ПОБЕДА: 4 в ряд (в т.ч. по диагонали)', 'или 5 трофеев. Ряд у обоих — у ходившего.']
    for i in range(2):
        x0 = 11.2 * cm; y0 = 3.0 * cm + i * 0; x0 = 1.6 * cm + i * 9.3 * cm; y0 = 1.8 * cm; mw, mh = 8.8 * cm, 6.6 * cm
        if color: c.setFillColor(HexColor('#F4F1E6')); c.rect(x0, y0, mw, mh, fill=1, stroke=0)
        c.setFillColor(black); yy = y0 + mh - 0.7 * cm
        for j, t in enumerate(memo):
            c.setFont('DB' if j in (0, 9) else 'D', 10 if j == 0 else 8.6); c.drawString(x0 + 0.35 * cm, yy, t); yy -= 0.53 * cm
        cutrect(x0, y0, mw, mh)
    c.showPage()
    # ---------- краткие правила ----------
    header('Краткие правила', 'Полная версия правил с примерами — в приложении и в презентации.')
    c.setFillColor(black); y = H - 3.2 * cm
    rules = [('Цель', 'Первым выстроить 4 свои фишки в ряд (горизонталь, вертикаль, диагональ) ИЛИ набрать 5 трофеев.'),
             ('Подготовка', 'Пустое поле 6×6. У каждого 10 звёзд и 1 Солнце (2 запасные звезды — на случай потери). Первыми ходят золотые. Лазурные за второй ход сразу получают 1 трофей.'),
             ('Ход', 'Поставь одну фишку из запаса на любую пустую клетку. Солнце нельзя ставить самым первым ходом партии.'),
             ('Толчок', 'Новая фишка отталкивает соседей вверх, вниз, влево и вправо (диагонали не трогает). В каждом из 4 направлений вся сплошная цепочка фишек сдвигается на 1 клетку от новой фишки — и свои, и чужие.'),
             ('Солнце', 'Солнце никогда не сдвигается. Если в цепочке есть Солнце, эта цепочка не двигается. Само Солнце толкает, как обычная фишка, и считается в ряду.'),
             ('Край', 'Если цепочка упирается в край, крайняя фишка падает с поля: чужая звезда — твой трофей, своя возвращается в твой запас.'),
             ('Запас кончился', 'Если в запасе нет звёзд, ход — переставить одну свою звезду с поля на другую пустую клетку (она тоже толкает).'),
             ('Конец', 'Победа сразу после хода. Если ряд получился у обоих — побеждает ходивший. Если ряд сложился только у соперника (ты сам его подтолкнул) — побеждает соперник. 50 ходов каждого без победы — ничья.'),
             ('Хитрость', 'Прямой ряд нельзя продлить вплотную — новая фишка оттолкнёт своих соседей. Собирайте ряды по диагонали, ставьте фишку через клетку или толкайте свои цепочки на место. Держитесь подальше от края.')]
    from reportlab.lib.utils import simpleSplit
    for t, body in rules:
        c.setFont('DB', 11.5); c.drawString(1.6 * cm, y, t); y -= 0.55 * cm
        c.setFont('D', 10)
        for ln in simpleSplit(body, 'D', 10, W - 3.4 * cm): c.drawString(1.9 * cm, y, ln); y -= 0.48 * cm
        y -= 0.25 * cm
    # пример-схема толчка
    y0 = 2.2 * cm; s = 1.2 * cm
    def mini(x0, cells, label, arrow=None):
        for q in range(5):
            c.setStrokeColor(black); c.setFillColor(HexColor('#E8EBF8') if color else white); c.rect(x0 + q * s, y0, s, s, fill=1, stroke=1)
        for q, (w, k) in cells.items(): piece(x0 + q * s + s / 2, y0 + s / 2, s * .38, w, k)
        c.setFillColor(black); c.setFont('D', 8.5); c.drawString(x0, y0 + s + 0.2 * cm, label)
    mini(1.6 * cm, {2: (-1, 'star'), 3: (1, 'star'), 4: (-1, 'star')}, 'До: ставим золотую на 2-ю клетку')
    c.setFont('DB', 18); c.drawCentredString(9.1 * cm, y0 + 0.35 * cm, '→')
    mini(10.6 * cm, {1: (1, 'star'), 3: (-1, 'star'), 4: (1, 'star')}, 'После: цепочка сдвинулась, лазурная упала → трофей')
    c.showPage(); c.save()

make('/workspace/sozvezdie/print/Sozvezdie-PnP-color.pdf', True)
make('/workspace/sozvezdie/print/Sozvezdie-PnP-bw.pdf', False)
print('ok')
