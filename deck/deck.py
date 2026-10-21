import json
from pptx import Presentation
from pptx.util import Emu, Pt, Cm
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
NAVY, NAVY2, GOLD, BLUE, WHITE, MUTED = RGBColor(0x0B,0x10,0x26), RGBColor(0x1B,0x24,0x56), RGBColor(0xFF,0xC6,0x46), RGBColor(0x8E,0xC5,0xFF), RGBColor(0xFF,0xFF,0xFF), RGBColor(0xB8,0xC0,0xE8)
FONT = 'Inter'
R = {k: json.load(open(f'../sim/{k}.json')) for k in ['final_l3_run1','final_l3_run2','final_l2_noise3','final_l2_noise10']}
L3 = R['final_l3_run2']; L2 = R['final_l2_noise3']
prs = Presentation(); prs.slide_width, prs.slide_height = Cm(33.867), Cm(19.05)
SW, SH = prs.slide_width, prs.slide_height
blank = prs.slide_layouts[6]
def bg(s, col=NAVY):
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH); r.fill.solid(); r.fill.fore_color.rgb = col; r.line.fill.background(); return r
def text(s, x, y, w, h, t, size=20, bold=False, color=WHITE, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(x, y, w, h); tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Cm(0.1)
    lines = t if isinstance(t, list) else [t]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph(); p.alignment = align
        if isinstance(ln, tuple): ln, sz, b, col = ln
        else: sz, b, col = size, bold, color
        r = p.add_run(); r.text = ln; r.font.size = Pt(sz); r.font.bold = b; r.font.color.rgb = col; r.font.name = FONT
        p.space_after = Pt(sz * 0.45)
    return tb
def title(s, t, kicker=None):
    if kicker: text(s, Cm(1.8), Cm(1.1), Cm(28), Cm(1), kicker.upper(), 12, True, GOLD)
    text(s, Cm(1.8), Cm(1.8), Cm(30), Cm(2.2), t, 34, True)
def card(s, x, y, w, h, col=NAVY2):
    r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h); r.adjustments[0] = 0.08; r.fill.solid(); r.fill.fore_color.rgb = col; r.line.fill.background(); return r
def notes(s, t): s.notes_slide.notes_text_frame.text = t
def slide(): s = prs.slides.add_slide(blank); bg(s); return s

# 1 Титул
s = slide(); s.shapes.add_picture('d_ex_after.png', Cm(19.5), Cm(2.2), height=Cm(14.6))
text(s, Cm(1.8), Cm(5.0), Cm(17), Cm(1), 'НАСТОЛЬНАЯ ЛОГИЧЕСКАЯ ИГРА · 2 ИГРОКА · 15–25 МИНУТ', 12, True, GOLD)
text(s, Cm(1.8), Cm(6.0), Cm(17), Cm(3.5), 'Созвездие', 66, True)
text(s, Cm(1.8), Cm(9.6), Cm(16.5), Cm(3), 'Сложи четыре звезды в ряд — или столкни соперника с неба', 24, False, MUTED)
text(s, Cm(1.8), Cm(15.6), Cm(16), Cm(1), 'Иван Воронцов · 2026 · настолка + приложение для Android', 13, False, MUTED)
notes(s, 'Титульный слайд. Картинка — финал примера хода: золотые собрали диагональ.')
# 2 Концепция
s = slide(); title(s, 'Одна фишка — четыре толчка', 'Концепция')
text(s, Cm(1.8), Cm(4.6), Cm(14.5), Cm(12), [
    'Каждый ход ты ставишь звезду на поле 6×6 — и она отталкивает соседей во все четыре стороны.',
    'Свои фишки толкаются так же, как чужие. Поэтому прямой ряд нельзя просто продлить: новая фишка оттолкнёт соседей.',
    'Побеждают дальновидные: ряд собирают по диагонали, толчками ставят свои цепочки на место, а чужие сталкивают за край.'], 19, False, WHITE)
for i, (big, small) in enumerate([('5 минут', 'на объяснение правил'), ('0 удачи', 'полная информация, без кубиков'), ('2 пути', 'к победе: ряд или 5 трофеев')]):
    card(s, Cm(18), Cm(4.6 + i * 4.3), Cm(14), Cm(3.7)); text(s, Cm(18.8), Cm(4.9 + i * 4.3), Cm(13), Cm(3.2), [(big, 30, True, GOLD), (small, 16, False, MUTED)])
# 3 Компоненты
s = slide(); title(s, 'Что в коробке', 'Компоненты')
comps = [('Поле 6×6', '36 клеток, 18×18 см (или 24×24 из двух листов)'), ('20 звёзд', 'по 10 золотых и лазурных (+2 запасные)'), ('2 Солнца', 'по одному на игрока — якорь, который нельзя сдвинуть'), ('2 шкалы трофеев', 'от 0 до 5; лазурные начинают с 1'), ('2 памятки', 'все правила на одной карточке')]
for i, (a, b) in enumerate(comps):
    x = Cm(1.8 + (i % 3) * 10.3); y = Cm(5 + (i // 3) * 6.2)
    card(s, x, y, Cm(9.6), Cm(5.4)); text(s, x + Cm(0.7), y + Cm(0.6), Cm(8.4), Cm(4.4), [(a, 24, True, GOLD), (b, 15, False, WHITE)])
text(s, Cm(22.4), Cm(11.8), Cm(10), Cm(4.6), [('Print & Play', 22, True, BLUE), ('Всё печатается на 7 листах A4 — цветная и экономичная ч/б версии', 15, False, MUTED)])
# 4 Ход и цель
s = slide(); title(s, 'Как ходить и как победить', 'Правила')
steps = [('1', 'Поставь звезду', 'из запаса на любую пустую клетку. Солнце — не самым первым ходом партии.'), ('2', 'Оттолкни', 'в 4 стороны: вся сплошная цепочка сдвигается на 1 клетку от новой фишки.'), ('3', 'Столкни с края', 'чужая звезда за краем — твой трофей, своя возвращается в запас.'), ('4', 'Победи', 'четыре своих в ряд (и по диагонали) или 5 трофеев.')]
for i, (n, a, b) in enumerate(steps):
    x = Cm(1.8 + i * 7.7); card(s, x, Cm(5), Cm(7.1), Cm(9.5))
    o = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Cm(0.6), Cm(5.6), Cm(1.8), Cm(1.8)); o.fill.solid(); o.fill.fore_color.rgb = GOLD; o.line.fill.background()
    tf = o.text_frame; tf.paragraphs[0].alignment = PP_ALIGN.CENTER; r = tf.paragraphs[0].add_run(); r.text = n; r.font.size = Pt(22); r.font.bold = True; r.font.color.rgb = NAVY; r.font.name = FONT
    text(s, x + Cm(0.6), Cm(7.9), Cm(6), Cm(6.3), [(a, 21, True, WHITE), (b, 15, False, MUTED)])
text(s, Cm(1.8), Cm(15.4), Cm(30), Cm(2), 'Запас кончился — переставь свою звезду с поля. Ряд у обоих сразу — побеждает ходивший. 50 ходов без победы — ничья.', 15, False, MUTED)
# 5 Толчок
s = slide(); title(s, 'Главная механика: отталкивание', 'Правила')
s.shapes.add_picture('d_push_before.png', Cm(1.8), Cm(4.4), height=Cm(11.6)); s.shapes.add_picture('d_push_after.png', Cm(15.0), Cm(4.4), height=Cm(11.6))
text(s, Cm(13.3), Cm(9.0), Cm(1.8), Cm(2), '→', 44, True, GOLD, PP_ALIGN.CENTER)
text(s, Cm(27.6), Cm(4.4), Cm(5.8), Cm(13), [('Золотая звезда', 16, True, GOLD), ('встала на подсвеченную клетку.', 14, False, MUTED), ('4 стороны', 16, True, WHITE), ('соседи сверху, слева и снизу отъехали на клетку; справа сдвинулась цепочка из двух.', 14, False, MUTED), ('Диагональ', 16, True, WHITE), ('не тронута.', 14, False, MUTED)])
# 6 Солнце
s = slide(); title(s, 'Солнце — якорь линии', 'Правила')
s.shapes.add_picture('d_sun.png', Cm(18.5), Cm(4.0), height=Cm(13.6))
text(s, Cm(1.8), Cm(4.8), Cm(15.5), Cm(12), [
    ('Солнце нельзя сдвинуть.', 22, True, GOLD), ('Если в цепочке есть Солнце, вся цепочка стоит на месте. На схеме золотая звезда встала слева от цепочки лазурных с Солнцем — и цепочка не шелохнулась.', 17, False, WHITE),
    ('Одно на игрока.', 22, True, GOLD), ('Поставить рано — защитить линию. Поставить поздно — закрыть брешь. Солнце толкает и считается в ряду.', 17, False, WHITE)])
# 7 Пример хода
s = slide(); title(s, 'Пример хода: удар и победа', 'Пример')
s.shapes.add_picture('d_ex_before.png', Cm(1.8), Cm(4.2), height=Cm(11.6)); s.shapes.add_picture('d_ex_after.png', Cm(15.0), Cm(4.2), height=Cm(11.6))
text(s, Cm(13.3), Cm(8.8), Cm(1.8), Cm(2), '→', 44, True, GOLD, PP_ALIGN.CENTER)
text(s, Cm(27.6), Cm(4.2), Cm(5.8), Cm(13.5), [('Ход золотых', 16, True, GOLD), ('звезда в верхний ряд (подсвечена).', 13, False, WHITE), ('Вправо:', 14, True, WHITE), ('лазурная вылетает за край — трофей, вторая сдвигается.', 13, False, MUTED), ('Вниз:', 14, True, WHITE), ('цепочка из золотой и лазурной сдвигается — золотая встаёт в диагональ.', 13, False, MUTED), ('Итог: 4 по диагонали — победа!', 15, True, GOLD)])
notes(s, 'Позиция проверена движком игры: ход в клетку г1 даёт трофей и диагональ в2-г3-д4-е5.')
# 8 Почему интересно
s = slide(); title(s, 'Почему в это хочется играть', 'Ценность')
pts = [('Решения на каждом ходу', 'Одна фишка меняет до четырёх линий сразу — каждый ход это маленькая головоломка.'), ('Свои фишки мешают', 'Прямой ряд не продлить вплотную. Приходится думать на ход-два вперёд.'), ('Два пути к победе', 'Строить созвездие или охотиться за трофеями — по моделированию оба пути реально используются.'), ('Короткие партии', 'Медиана — около 20 полуходов: 10–20 минут, можно сыграть серию.')]
for i, (a, b) in enumerate(pts):
    x = Cm(1.8 + (i % 2) * 15.4); y = Cm(4.8 + (i // 2) * 6.6); card(s, x, y, Cm(14.7), Cm(5.9))
    text(s, x + Cm(0.8), y + Cm(0.7), Cm(13.2), Cm(4.8), [(a, 22, True, GOLD), (b, 16, False, WHITE)])
notes(s, 'Исследование жанра: игроки ценят простые правила + глубину (Hive, Santorini, Onitama, Tak) и чаще всего жалуются на преимущество первого хода (Tak 5×5). Источники: reddit.com/r/boardgames/comments/b9zse9, reddit.com/r/Tak/comments/6k31gt, gomagic.org/abstract-strategy-games/')
# 9 Баланс
s = slide(); title(s, 'Баланс проверен тысячами ходов', 'Моделирование ИИ против ИИ')
T3 = R['final_l3_run1']; w3 = T3['firstPlayerWins'] + L3['firstPlayerWins']; d3 = w3 + T3['secondPlayerWins'] + L3['secondPlayerWins']
for i, (big, small) in enumerate([(f"{w3/d3*100:.0f}%", f"побед первого игрока, ИИ «Мастер», 200 партий"), (f"{L2['firstWinRate']*100:.0f}%", f"побед первого, ИИ глубины 2, 300 партий"), (f"{L3['medianPlies']}", 'полуходов — медиана партии «Мастеров»')]):
    x = Cm(1.8 + i * 10.3); card(s, x, Cm(4.6), Cm(9.6), Cm(4.6)); text(s, x + Cm(0.7), Cm(4.9), Cm(8.4), Cm(4.2), [(big, 44, True, GOLD), (small, 14, False, MUTED)])
rows = [('ИИ против ИИ', 'Партий', '1-й / 2-й / ничьи', 'Ряд / трофеи', 'Медиана полуходов')]
for lab, K in [('Мастер, прогон 1', 'final_l3_run1'), ('Мастер, прогон 2', 'final_l3_run2'), ('Глубина 2, точная игра', 'final_l2_noise3'), ('Глубина 2, много ошибок', 'final_l2_noise10')]:
    X = R[K]; dec = X['firstPlayerWins'] + X['secondPlayerWins']; rows.append((lab, str(X['games']), f"{X['firstPlayerWins']} / {X['secondPlayerWins']} / {X['draws']}", f"{dec - X['captureWins']} / {X['captureWins']}", str(X['medianPlies'])))
tb = s.shapes.add_table(len(rows), 5, Cm(1.8), Cm(9.7), Cm(30.3), Cm(4.6)).table
for r, row in enumerate(rows):
    for c, v in enumerate(row):
        cell = tb.cell(r, c); cell.text = v; cell.fill.solid(); cell.fill.fore_color.rgb = GOLD if r == 0 else NAVY2
        p = cell.text_frame.paragraphs[0]; p.runs[0].font.size = Pt(13); p.runs[0].font.name = FONT; p.runs[0].font.bold = r == 0; p.runs[0].font.color.rgb = NAVY if r == 0 else WHITE
text(s, Cm(1.8), Cm(15.0), Cm(30.3), Cm(3.5), [('Как добились: без форы первый игрок выигрывал до 89% партий. Фора — 1 трофей у второго игрока — и победа за 5 трофеев вместо 4 выровняли игру до 44–48% при сильной игре.', 14, False, MUTED), ('Ограничения: это ИИ, а не люди. Когда игроки часто ошибаются, фора сильнее помогает второму (26% у первого). Ничьи — около 10%.', 14, False, MUTED)])
notes(s, 'Данные: sim/final_l2.json, sim/final_l3.json. Первый ход каждой партии — случайная клетка центра 4×4 для разнообразия.')
# 10 Аудитория
s = slide(); title(s, 'Для кого игра', 'Аудитория')
aud = [('Любители абстрактных игр', 'кто играет в шахматы, го, Hive, Santorini и ищет новое'), ('Семьи с детьми 8+', 'правила за 5 минут, партия за чашкой чая'), ('Клубы и кафе настольных игр', 'короткие партии, турниры серией'), ('Школы и кружки логики', 'дешёвая печать в классе, развитие пространственного мышления')]
for i, (a, b) in enumerate(aud):
    y = Cm(4.8 + i * 3.4); card(s, Cm(1.8), y, Cm(30.3), Cm(2.9))
    text(s, Cm(2.6), y + Cm(0.45), Cm(12), Cm(2.2), a, 20, True, GOLD); text(s, Cm(14.5), y + Cm(0.55), Cm(17), Cm(2.2), b, 16, False, WHITE)
# 11 Себестоимость
s = slide(); title(s, 'Себестоимость', 'Производство')
rows = [('Вариант', 'Что входит', 'Оценка за комплект'), ('Print & Play', '7 листов A4, клей, ножницы', '≈ 35–70 ₽ печать'), ('PnP на картоне', 'то же + 2 листа картона 1 мм', '≈ 150–250 ₽'), ('Малый тираж', 'картонное поле, 22 жетона, коробка', 'оценку нужно запросить у типографии')]
tb = s.shapes.add_table(len(rows), 3, Cm(1.8), Cm(5.0), Cm(30.3), Cm(6.5)).table
for r, row in enumerate(rows):
    for c, v in enumerate(row):
        cell = tb.cell(r, c); cell.text = v; cell.fill.solid(); cell.fill.fore_color.rgb = GOLD if r == 0 else NAVY2
        p = cell.text_frame.paragraphs[0]; p.runs[0].font.size = Pt(16); p.runs[0].font.name = FONT; p.runs[0].font.bold = r == 0; p.runs[0].font.color.rgb = NAVY if r == 0 else WHITE
text(s, Cm(1.8), Cm(12.6), Cm(30.3), Cm(4.5), [('Дёшево по своей природе: нет карт, кубиков и фигурок сложной формы — только поле и 22 одинаковых жетона.', 17, False, WHITE), ('Цены печати — ориентировочные, по типичным ценам домашней и копицентровой печати; цену тиража нужно уточнить в типографии.', 13, False, MUTED)])
# 12 Приложение
s = slide(); title(s, 'Приложение для Android', 'Цифровая версия')
s.shapes.add_picture('app-demo.png', Cm(1.8), Cm(4.0), height=Cm(14.3)); s.shapes.add_picture('app-tut.png', Cm(9.4), Cm(4.0), height=Cm(14.3))
text(s, Cm(18.6), Cm(4.4), Cm(14), Cm(14), [('Против ИИ', 19, True, GOLD), ('три уровня: Новичок, Любитель, Мастер', 15, False, WHITE), ('Вдвоём на одном телефоне', 19, True, GOLD), ('с отменой хода', 15, False, WHITE), ('По сети', 19, True, GOLD), ('Bluetooth, Wi-Fi рядом и интернет по коду из 5 букв; ходы проверяются на обоих телефонах, реванш со сменой первого хода', 15, False, WHITE), ('Обучение', 19, True, GOLD), ('6 интерактивных уроков и полные правила', 15, False, WHITE)])
# 13 Дальше
s = slide(); title(s, 'Что дальше', 'План')
nxt = [('Живые тесты', '20+ партий людей разного уровня, сверка баланса с моделью'), ('Полировка', 'оформление, коробка, пластиковые или деревянные жетоны'), ('Варианты', 'поле 7×7 для опытных, «пять в ряд», задачи-этюды'), ('Выпуск', 'бесплатный Print & Play + приложение, затем малый тираж')]
for i, (a, b) in enumerate(nxt):
    x = Cm(1.8 + i * 7.7); card(s, x, Cm(5), Cm(7.1), Cm(8.5)); text(s, x + Cm(0.6), Cm(5.6), Cm(6), Cm(7.5), [(a, 21, True, GOLD), (b, 15, False, WHITE)])
text(s, Cm(1.8), Cm(15.0), Cm(30), Cm(2), 'Созвездие — простые правила, глубокая игра, печать за вечер.', 22, True, BLUE, PP_ALIGN.CENTER)
prs.save('Sozvezdie-presentation.pptx'); print('slides', len(prs.slides))
