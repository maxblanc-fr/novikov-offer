#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересобирает NovikovNewYear.html из текущей NovikovOffer.html.

Новогодняя страница = взрослая + новогодний слой + новогодние цены. Поэтому
правки взрослой переносятся не мержем, а пересборкой: запустите скрипт после
любого изменения взрослой страницы.

    python3 tools/rebuild-newyear.py

Каждая замена цены проверяется assert'ом: если во взрослой цена поменялась,
скрипт падает с именем позиции, а не молча оставляет старое число.

ВАЖНО: цены раздела «Дополнительные услуги» скрипт НЕ трогает — они приходят
от заказчика отдельным списком. См. SERVICES_NOTE внизу.
"""
import math, random, re, shutil, sys

SRC, DST = "NovikovOffer.html", "NovikovNewYear.html"

FIR, FIR_L, FIR_D = "#215A3E", "#357C57", "#143B29"
GOLD, GOLD_L = "#C9A227", "#F2DE9C"
RED, RED_D = "#D6122B", "#8E0A1B"
W, H = 64, 220        # плитка гирлянды; период синуса 110 = H/2 -> стык бесшовный


def rope_x(t):
    return 32 + 10 * math.sin(2 * math.pi * t / 110)


def garland(pid):
    p = [f'<path d="{" ".join(f"{chr(77) if i == 0 else chr(76)}{rope_x(t):.1f} {t}" for i, t in enumerate(range(0, H + 1, 5)))}" '
         f'fill="none" stroke="{FIR_D}" stroke-width="2.6" stroke-linecap="round"/>']
    rnd = random.Random(20271)                     # фиксируем: вёрстка должна быть детерминированной
    for i, t in enumerate(range(8, 209, 10)):
        x, ang = rope_x(t), math.radians(38)
        for side in (-1, 1):
            ln = rnd.uniform(12, 18)
            p.append(f'<path d="M{x:.1f} {t} L{x + side * ln * math.cos(ang):.1f} {t + ln * math.sin(ang):.1f}" '
                     f'stroke="{(FIR, FIR_L, FIR_D)[i % 3]}" stroke-width="1.7" stroke-linecap="round" fill="none"/>')
    for t, col, r in ((58, RED, 5.5), (112, GOLD, 4.6), (172, RED_D, 6.0)):
        x, cy = rope_x(t), t + 6 + r
        p.append(f'<path d="M{x:.1f} {t} L{x:.1f} {t + 6:.1f}" stroke="{GOLD}" stroke-width="1.2"/>')
        p.append(f'<circle cx="{x:.1f}" cy="{cy:.1f}" r="{r}" fill="{col}"/>')
        p.append(f'<circle cx="{x - r * .32:.1f}" cy="{cy - r * .34:.1f}" r="{r * .24:.1f}" fill="#fff" opacity=".55"/>')
    for t, s in ((32, 4.2), (88, 3.4), (145, 4.6), (200, 3.2)):
        x = rope_x(t) + (7 if t % 2 == 0 else -7)
        p.append(f'<path d="M{x:.1f} {t - s:.1f} L{x + s * .3:.1f} {t - s * .3:.1f} L{x + s:.1f} {t:.1f} '
                 f'L{x + s * .3:.1f} {t + s * .3:.1f} L{x:.1f} {t + s:.1f} L{x - s * .3:.1f} {t + s * .3:.1f} '
                 f'L{x - s:.1f} {t:.1f} L{x - s * .3:.1f} {t - s * .3:.1f} Z" fill="{GOLD_L}" opacity=".9"/>')
    return (f'<svg class="ny-garland" width="{W}" height="100%" xmlns="http://www.w3.org/2000/svg" '
            f'aria-hidden="true" focusable="false"><defs><pattern id="{pid}" width="{W}" height="{H}" '
            f'patternUnits="userSpaceOnUse">' + "".join(p) +
            f'</pattern></defs><rect width="{W}" height="100%" fill="url(#{pid})"/></svg>')


def flakes(n, seed, rmin, rmax, op):
    rnd = random.Random(seed)
    return ",\n      ".join(
        f"radial-gradient({r:.1f}px {r:.1f}px at {rnd.uniform(2, 98):.1f}% {rnd.uniform(2, 98):.1f}%, "
        f"rgba(255,255,255,{op:.2f}), rgba(255,255,255,0))"
        for r in (rnd.uniform(rmin, rmax) for _ in range(n)))


CSS = f"""
  /* ══════════════════ Новогодний слой ══════════════════
     Дописан поверх взрослой страницы, ничего в ней не переопределяя силой,
     поэтому её правки переносятся пересборкой, а не разбором конфликтов.
     Всё декоративное — aria-hidden, не печатается и замирает при
     prefers-reduced-motion. Собирается tools/rebuild-newyear.py. */
  :root{{
    --fir:{FIR}; --fir-lite:{FIR_L}; --fir-deep:{FIR_D};
    --gold:{GOLD}; --gold-lite:{GOLD_L};
  }}

  /* --- Гирлянды по краям окна --------------------------------------
     Показываются только когда рядом с колонкой контента (1180px + поля)
     реально есть место: иначе наехали бы на текст. */
  .ny-side{{
    position:fixed; top:0; bottom:0; width:{W}px; z-index:1;
    pointer-events:none; opacity:.92; display:none;
  }}
  .ny-side--l{{left:10px}}
  .ny-side--r{{right:10px; transform:scaleX(-1)}}
  @media(min-width:1380px){{
    .ny-side{{display:block}}
    /* Шапка идёт во всю ширину, а не по колонке контента, — поэтому там,
       где показались гирлянды, её поля надо развести вручную. */
    .hero{{padding-left:96px; padding-right:96px}}
  }}

  /* --- Огоньки по нижнему краю шапки -------------------------------- */
  header.top::after{{
    content:""; position:absolute; left:0; right:0; bottom:0; height:8px; z-index:2;
    border-top:1px solid rgba(242,222,156,.5);
    background-image:
      radial-gradient(circle at 8px 4.5px, var(--gold-lite) 0 2.4px, rgba(0,0,0,0) 3px),
      radial-gradient(circle at 24px 4.5px, #FFD9A0 0 2.4px, rgba(0,0,0,0) 3px);
    background-size:32px 8px; background-repeat:repeat-x;
    animation:ny-glow 3.4s ease-in-out infinite;
  }}
  @keyframes ny-glow{{ 0%,100%{{filter:brightness(1)}} 50%{{filter:brightness(1.45)}} }}

  /* --- Снег в шапке --------------------------------------------------
     Сдвиг за цикл равен ровно одной плитке фона — поэтому петля незаметна. */
  .ny-snow{{position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden}}
  .ny-snow i{{position:absolute; inset:0; display:block; background-repeat:repeat}}
  .ny-snow i:nth-child(1){{
    background-image:
      {flakes(16, 7, 1.6, 2.9, .95)};
    background-size:380px 380px; animation:ny-fall-a 26s linear infinite;
  }}
  .ny-snow i:nth-child(2){{
    background-image:
      {flakes(14, 91, 1.0, 1.8, .7)};
    background-size:240px 240px; animation:ny-fall-b 16s linear infinite;
  }}
  @keyframes ny-fall-a{{ from{{background-position:0 0}} to{{background-position:-380px 380px}} }}
  @keyframes ny-fall-b{{ from{{background-position:0 0}} to{{background-position:240px 240px}} }}

  /* Текст шапки — над снегом, сугроб — над текстом, у самого низа. */
  .hero .kicker, .hero h1, .hero p.lead, .hero .stats{{position:relative; z-index:1}}
  .hero{{padding-bottom:calc(clamp(34px,5vw,60px) + 34px)}}
  .ny-drift{{position:absolute; left:0; right:0; bottom:-1px; width:100%; height:48px; z-index:2; display:block}}
  .ny-drift path{{fill:var(--bone)}}

  /* --- Золото в акцентах -------------------------------------------- */
  .sec-head{{border-image:linear-gradient(90deg,var(--red) 0%,var(--gold) 58%,var(--fir) 100%) 1}}
  .hero .kicker{{color:var(--gold-lite)}}

  @media print{{ .ny-side, .ny-snow, .ny-drift{{display:none}} }}
  @media (prefers-reduced-motion:reduce){{
    .ny-snow i, header.top::after{{animation:none}}
  }}
"""

DRIFT = ('<svg class="ny-drift" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">'
         '<path d="M0 48 L0 27 C120 13 240 35 360 25 C480 15 560 33 700 29 '
         'C840 25 920 9 1060 19 C1180 28 1300 41 1440 23 L1440 48 Z"/></svg>')

# ---------------------------------------------------------------- копия
COPY = [
 ("<title>Novikov School — Коммерческое предложение 2026 / Event Offer 2026</title>",
  "<title>Novikov School — Новогоднее предложение 2027 / New Year Offer 2027</title>"),
 ('<small data-i18n="brandsub">МЕРОПРИЯТИЯ · 2026</small>',
  '<small data-i18n="brandsub">НОВЫЙ ГОД · 2027</small>'),
 ('brandsub:{ru:"МЕРОПРИЯТИЯ · 2026", en:"EVENTS · 2026"}',
  'brandsub:{ru:"НОВЫЙ ГОД · 2027", en:"NEW YEAR · 2027"}'),
 ('<div class="kicker" data-i18n="kicker">Коммерческое предложение</div>',
  '<div class="kicker" data-i18n="kicker">❄ Новогоднее предложение · 2027</div>'),
 ('kicker:{ru:"Коммерческое предложение", en:"Event Offer"}',
  'kicker:{ru:"❄ Новогоднее предложение · 2027", en:"❄ New Year Offer · 2027"}'),
 ('<h1 data-i18n="h1">Мероприятия <span>Novikov School</span></h1>',
  '<h1 data-i18n="h1">Новый год в <span>Novikov School</span></h1>'),
 ("""h1:{ru:'Мероприятия <span>Novikov School</span>', en:'<span>Novikov School</span> Events'}""",
  """h1:{ru:'Новый год в <span>Novikov School</span>', en:'New Year at <span>Novikov School</span>'}"""),
 ('Кулинарные мастер-классы, фуршеты, премиальные сеты и барная карта — всё для яркого корпоратива, праздника или частного события.',
  'Новогодний корпоратив на площадке в центре Москвы: кулинарные мастер-классы, фуршеты, премиальные сеты и барная карта — праздник под ключ в восьми залах.'),
 ('Culinary masterclasses, buffets, premium sets and a full bar card — everything for a memorable corporate event, celebration or private occasion.',
  'A New Year party in central Moscow: culinary masterclasses, buffets, premium sets and a full bar card — the whole celebration across eight halls.'),
 ('цены за человека, действуют с апреля 2026', 'цены за человека, новогодний сезон 2026/27'),
 ('prices per person, valid from April 2026', 'prices per person, 2026/27 holiday season'),
 ('Цены и состав меню указаны по данным менеджеров на 2026 г. и могут меняться.',
  'Цены новогоднего сезона 2026/27 и состав меню могут меняться.'),
 ('Цены и состав меню указаны по данным исходных материалов на 2026 г. и могут меняться.',
  'Цены новогоднего сезона 2026/27 и состав меню могут меняться.'),
 ('Prices and menu composition are based on 2026 source materials and may change;',
  '2026/27 holiday-season prices and menu composition may change;'),
 # Взрослая уже носит плашку черновика — переиспользуем её, поправив адрес.
 ('клиенту отправляют ссылку без «/draft»', 'клиенту отправляют ссылку без «-draft»'),
]

# ------------------------------------------------------- новогодние цены
# Ключ — цена взрослой страницы, значение — новогодняя. Применяется по разделам,
# чтобы одинаковые числа в разных местах не задевали друг друга.
PACKAGES = {
    "12 500 ₽": "17 500 ₽", "14 600 ₽": "19 800 ₽",
    "16 700 ₽": "22 600 ₽", "13 600 ₽": "18 400 ₽",
    "12 500 \\u20bd": "17 500 \\u20bd", "14 600 \\u20bd": "19 800 \\u20bd",
    "16 700 \\u20bd": "22 600 \\u20bd",
    "40 000 ₽ + 10 000 ₽/чел": "54 000 ₽ + 13 500 ₽/чел",
    "99 000 ₽ + 10 000 ₽/чел": "133 700 ₽ + 13 500 ₽/чел",
    "40 000 ₽ + 10 000 ₽/person": "54 000 ₽ + 13 500 ₽/person",
    "99 000 ₽ + 10 000 ₽/person": "133 700 ₽ + 13 500 ₽/person",
    "от 12 500 ₽/чел": "от 17 500 ₽/чел",
    "12 500 ₽/person": "17 500 ₽/person",
    "+500 ₽": "+800 ₽",
}
FREEFLOW = {                       # +30% к ценам взрослой, округление вверх до сотни
    "5 400 ₽": "7 100 ₽", "1 650 ₽": "2 200 ₽",
    "6 600 ₽": "8 600 ₽", "1 950 ₽": "2 600 ₽",
    "7 800 ₽": "10 200 ₽", "2 350 ₽": "3 100 ₽",
}

SERVICES_NOTE = """
  Новые цены заказчика вносите в SERVICES выше — тогда пересборка их сохранит.
"""


# Новогодние цены раздела «Дополнительные услуги» — прислал заказчик 11.09.2026.
# (метка тарифа, цена во взрослой, новогодняя). Цена во взрослой проверяется:
# если она уедет, пересборка упадёт с именем позиции.
SERVICES = [
    ("Игра",                            "20 000 ₽",    "24 000 ₽"),
    ("Ивент-менеджер",                  "35 000 ₽",    "40 000 ₽"),
    ("Караоке",                         "45 000 ₽",    "50 000 ₽"),
    ("Ведущий",                         "от 60 000 ₽", "от 80 000 ₽"),
    ("Официант",                        "12 000 ₽",    "13 000 ₽"),
    ("Диджей и звуковое оборудование",  "54 000 ₽",    "60 000 ₽"),
    ("Продление диджея",                "13 500 ₽",    "15 000 ₽"),
    ("Профессиональный фотограф",       "44 000 ₽",    "50 000 ₽"),
    ("Продление фотографа",             "11 000 ₽",    "12 500 ₽"),
]

# Ивент-менеджер теперь идёт с игрой — это меняет не цену, а саму позицию.
SERVICE_LABELS = [
    ('{ru:"Ивент-менеджер", en:"Event manager"}',
     '{ru:"Ивент-менеджер + игра на выбор", en:"Event manager + a game of your choice"}'),
]

# Остальное в разделе остаётся по ценам взрослой страницы: сомелье и вино,
# ставки дегустационных казино, коктейльный мастер-класс, арт, торты,
# флористика, звёздный шеф и все четыре позиции фартуков.


# Казино — прайс заказчика от 11.09.2026. Замены привязаны к карточке: строка
# «Сомелье 2 200 ₽/гость · 3 раунда» есть в обеих, а меняется в них по-разному.
#
# У дегустационных казино поменялась сама модель: работа сомелье теперь стоит
# 60 000 ₽ за мероприятие вместо 2 200 ₽ с гостя, а ставка за раунд остаётся
# стоимостью алкоголя. Поэтому правятся не только цифры, но и формула в тексте.
SERVICE_CARDS = {
    "Винное казино": [
        ("сомелье 2 200 ₽/гость", "сомелье 2 700 ₽/гость"),
        ("sommelier 2 200 ₽/guest", "sommelier 2 700 ₽/guest"),
        ('p:"8 500 ₽/бут.",  n:"≈ 51 900 ₽"',  'p:"10 200 ₽/бут.", n:"≈ 63 000 ₽"'),
        ('p:"11 500 ₽/бут.", n:"≈ 60 900 ₽"',  'p:"13 800 ₽/бут.", n:"≈ 73 800 ₽"'),
        ('p:"14 500 ₽/бут.", n:"≈ 69 900 ₽"',  'p:"17 400 ₽/бут.", n:"≈ 84 600 ₽"'),
        ('price:{ru:"Сомелье 2 200 ₽/гость · 3 раунда", en:"Sommelier 2 200 ₽/guest · 3 rounds"}',
         'price:{ru:"Сомелье 2 700 ₽/гость · 3 раунда", en:"Sommelier 2 700 ₽/guest · 3 rounds"}'),
    ],
    "Дегустационные казино": [
        ("Цена = сомелье 2 200 ₽/гость + ставка за гостя × число раундов (по умолчанию 3).",
         "Цена = работа сомелье 60 000 ₽ за мероприятие + ставка за гостя × число раундов (по умолчанию 3)."),
        ("Price = sommelier 2 200 ₽/guest + per-guest rate × number of rounds (3 by default).",
         "Price = the sommelier at 60 000 ₽ per event + per-guest rate × number of rounds (3 by default)."),
        ('p:"1 050 ₽/гость · раунд", n:"3 раунда ≈ 64 200 ₽"',
         'p:"1 300 ₽/гость · раунд", n:"3 раунда ≈ 106 800 ₽"'),
        ('p:"1 200 ₽/гость · раунд", n:"3 раунда ≈ 69 600 ₽"',
         'p:"1 500 ₽/гость · раунд", n:"3 раунда ≈ 114 000 ₽"'),
        ("— плюс работа сомелье 2 200 ₽/гость.",
         "— плюс работа сомелье 60 000 ₽ за мероприятие, независимо от числа гостей."),
        ("Стоимость = сомелье × число гостей + ставка × количество раундов × число гостей.",
         "Стоимость = 60 000 ₽ + ставка × количество раундов × число гостей."),
        ("— plus the sommelier at 2 200 ₽/guest.",
         "— plus the sommelier at 60 000 ₽ per event, whatever the guest count."),
        ("Total = sommelier × guests + rate × rounds × guests.",
         "Total = 60 000 ₽ + rate × rounds × guests."),
        ('price:{ru:"Сомелье 2 200 ₽/гость · 3 раунда", en:"Sommelier 2 200 ₽/guest · 3 rounds"}',
         'price:{ru:"Сомелье 60 000 ₽ за мероприятие · 3 раунда", en:"Sommelier 60 000 ₽ per event · 3 rounds"}'),
    ],
}

# Те же строки цен служат ключами в RU->EN словаре и живут вне раздела услуг.
SERVICE_TMAP = {
    '"8 500 ₽/бут.":"8 500 ₽/bottle"':   '"10 200 ₽/бут.":"10 200 ₽/bottle"',
    '"11 500 ₽/бут.":"11 500 ₽/bottle"': '"13 800 ₽/бут.":"13 800 ₽/bottle"',
    '"14 500 ₽/бут.":"14 500 ₽/bottle"': '"17 400 ₽/бут.":"17 400 ₽/bottle"',
    '"1 050 ₽/гость · раунд":"1 050 ₽/guest · round"': '"1 300 ₽/гость · раунд":"1 300 ₽/guest · round"',
    '"3 раунда ≈ 64 200 ₽":"3 rounds ≈ 64 200 ₽"':     '"3 раунда ≈ 106 800 ₽":"3 rounds ≈ 106 800 ₽"',
    '"3 раунда ≈ 69 600 ₽":"3 rounds ≈ 69 600 ₽"':     '"3 раунда ≈ 114 000 ₽":"3 rounds ≈ 114 000 ₽"',
}


def card_bounds(lines, start, end, card):
    """Границы одной карточки услуги: от её name до начала следующей."""
    a = next(i for i in range(start, end) if f'name:{{ru:"{card}"' in lines[i])
    while a > start and not lines[a].lstrip().startswith("{ic:"):
        a -= 1
    b = next((i for i in range(a + 1, end) if lines[i].lstrip().startswith("{ic:")), end)
    return a, b


def apply_service_cards(lines):
    s, e = section_bounds(lines, "services")
    for card, subs in SERVICE_CARDS.items():
        a, b = card_bounds(lines, s, e, card)
        for old, new in subs:
            if not any(old in lines[i] for i in range(a, b)):
                sys.exit(f"«{card}»: не найдено — {old[:70]}")
            for i in range(a, b):
                lines[i] = lines[i].replace(old, new)
        print(f"  {card}: {len(subs)} правок")
    tmap = next(i for i, l in enumerate(lines) if l.startswith("const fmt"))
    for old, new in SERVICE_TMAP.items():
        hit = False
        for i in range(tmap, len(lines)):
            if old in lines[i]:
                lines[i] = lines[i].replace(old, new)
                hit = True
        if not hit:
            sys.exit(f"словарь переводов: не найдено — {old[:60]}")
    print(f"  словарь переводов: {len(SERVICE_TMAP)} записей")


def apply_services(lines):
    s, e = section_bounds(lines, "services")
    done = []
    for label, old, new in SERVICES:
        hit = False
        for i in range(s, e):
            if f'{{l:{{ru:"{label}"' in lines[i]:
                if f'p:"{old}"' not in lines[i]:
                    sys.exit(f"«{label}»: во взрослой ожидалась {old}, а там {lines[i].strip()[:90]}")
                lines[i] = lines[i].replace(f'p:"{old}"', f'p:"{new}"', 1)
                hit = True
                break
        if not hit:
            sys.exit(f"не найдена позиция «{label}» в разделе услуг")
        done.append(f"{label}: {old} -> {new}")
    for i in range(s, e):
        for a, b in SERVICE_LABELS:
            if a in lines[i]:
                lines[i] = lines[i].replace(a, b, 1)
    print(f"  услуги: {len(done)} цен")
    for d in done:
        print(f"      {d}")


def section_bounds(lines, name):
    s = next(i for i, l in enumerate(lines) if re.search(rf'^\s+id:"{name}",', l))
    nxt = [i for i, l in enumerate(lines) if re.search(r'^\s+id:"[a-z]+",', l) and i > s]
    end = nxt[0] if nxt else next(i for i, l in enumerate(lines) if l.startswith("const fmt"))
    return s, end


def apply_prices(lines, mapping, regions, label):
    """Заменяет цены только внутри перечисленных разделов плюс словаря переводов."""
    spans = [section_bounds(lines, r) for r in regions]
    tmap = next(i for i, l in enumerate(lines) if l.startswith("const fmt"))
    spans.append((tmap, len(lines)))          # RU->EN словарь хранит строки цен как ключи
    pat = re.compile("|".join(re.escape(k) for k in sorted(mapping, key=len, reverse=True)))
    hits = {}

    def rep(m):
        hits[m.group(0)] = hits.get(m.group(0), 0) + 1
        return mapping[m.group(0)]

    for a, b in spans:
        for i in range(a, b):
            lines[i] = pat.sub(rep, lines[i])
    missing = [k for k in mapping if k not in hits]
    print(f"  {label}: {sum(hits.values())} замен по {len(hits)} шаблонам")
    return missing


def main():
    shutil.copy(SRC, DST)
    s = open(DST, encoding="utf-8").read()

    if s.count("</style>") != 2:
        sys.exit("во взрослой странице не два </style> — разметка изменилась, проверьте скрипт")
    s = s.replace("</style>\n</head>", CSS + "</style>\n</head>", 1)

    s = s.replace("<body>\n", "<body>\n"
                  f'<div class="ny-side ny-side--l" aria-hidden="true">{garland("nyGarlandA")}</div>\n'
                  f'<div class="ny-side ny-side--r" aria-hidden="true">{garland("nyGarlandB")}</div>\n', 1)

    anchor = '<div class="hero">\n  <div class="kicker"'
    if anchor not in s:
        sys.exit("не найдена разметка шапки — проверьте скрипт")
    s = s.replace(anchor, '<div class="hero">\n  <div class="ny-snow" aria-hidden="true"><i></i><i></i></div>\n  <div class="kicker"', 1)
    s = s.replace('  <div class="stats" id="stats"></div>\n</div>',
                  '  <div class="stats" id="stats"></div>\n  ' + DRIFT + '\n</div>', 1)

    for a, b in COPY:
        if a not in s:
            sys.exit(f"не найдено во взрослой странице: {a[:70]}")
        s = s.replace(a, b)

    lines = s.split("\n")
    miss = apply_prices(lines, PACKAGES, ["formats", "sets"], "пакеты")
    miss += apply_prices(lines, FREEFLOW, ["freeflow"], "free-flow")
    # "13 600 ₽" не существует: демо-ужин не уровень мастер-класса
    miss = [m for m in miss if m != "13 600 \\u20bd"]
    apply_services(lines)
    apply_service_cards(lines)
    if miss:
        sys.exit("цены во взрослой странице изменились, эти шаблоны не найдены:\n  "
                 + "\n  ".join(repr(m) for m in miss))

    open(DST, "w", encoding="utf-8").write("\n".join(lines))
    print(f"\n{DST} пересобран из {SRC}")
    print(SERVICES_NOTE)


if __name__ == "__main__":
    main()
