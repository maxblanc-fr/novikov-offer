# Варианты дизайна детского лендинга

Пять оформлений одной и той же страницы (`NovikovKids.html`) для выбора руководством.
Содержание во всех вариантах идентично и полное — меняется только оформление.

| Файл | Вариант |
|------|---------|
| `v1.css` | Фирменный — та же система, что на взрослом лендинге |
| `v2.css` | Светлый минимализм — белый лист, красный только акцентом |
| `v3.css` | Журнальный — без плашек, линейки и воздух |
| `v4.css` | Тёмный премиум — бордовый лист, кремовый текст |
| `v5.css` | Мягкий тёплый — кремовый фон, скруглённые карточки |
| `v6.css` | Редакционный — тёплая бумага, антиква, прайс с отточиями |
| `v7.css` | Тетрадь юного шефа — чек-лист блюд, главы, скруглённые рамки |

V6 и V7 меняют не только цвет, но и саму раскладку — за это отвечает
`relayout.js`. Он включается флагами `window.RELAYOUT` перед подключением:
`table` — пакеты становятся сравнительной таблицей вместо трёх карточек;
`leaders` — блюда становятся печатным меню, а 16 активностей — прайс-листом
с отточиями; `checklist` — у блюд появляются галочки; `chapters` — возрасты
нумеруются как главы. Ориентиры взяты из styles.refero.design: Steep / Monad /
ElevenLabs для V6, Superr для V7.

`printbase.css` — общая обвязка для печати (A4, разрывы страниц, сохранение фонов).
`printmode.js` — разворачивает то, что на сайте спрятано за вкладками и модалками:
три возрастные группы становятся тремя блоками подряд, каталог шаров, начинки
тортов и портфолио флористики вклеиваются в карточки, некликабельные кнопки убираются.

## Пересобрать PDF

```bash
cd ~/Developer/novikov-offer
python3 -m http.server 8899 &
BIN=~/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell
for v in v1 v2 v3 v4 v5; do
  python3 - "$v" <<'PY'
import pathlib, sys
v = sys.argv[1]; d = pathlib.Path('design-variants')
html = pathlib.Path('NovikovKids.html').read_text(encoding='utf-8')
html = html.replace('</head>', f"<style>\n{(d/'printbase.css').read_text(encoding='utf-8')}\n{(d/(v+'.css')).read_text(encoding='utf-8')}\n</style>\n</head>")
html = html.replace('</body>', f"<script>\n{(d/'printmode.js').read_text(encoding='utf-8')}\n</script>\n</body>")
pathlib.Path(f'{v}.html').write_text(html, encoding='utf-8')
PY
  "$BIN" --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
    --print-to-pdf="$v.pdf" --virtual-time-budget=12000 "http://127.0.0.1:8899/$v.html"
  rm -f "$v.html"
done
```

Когда вариант выбран — его правила переносятся в основной `<style>` в `NovikovKids.html`,
и папка становится не нужна. На опубликованный сайт эти файлы не попадают:
`deploy.sh` копирует только `NovikovKids.html`, `NovikovOffer.html`, `images/`,
`uploads/` и `robots.txt`.
