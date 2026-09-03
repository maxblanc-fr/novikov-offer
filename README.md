# Novikov School — коммерческие предложения

Три самостоятельные страницы. Все self-contained: вся вёрстка и логика внутри
одного HTML, контент собирается из объекта `DATA` в инлайновом `<script>`.

| Файл | Адрес | Кому |
|------|-------|------|
| `NovikovOffer.html` | https://novikov-school.ru | взрослые мероприятия |
| `NovikovKids.html` | https://novikov-school.ru/deti | детские праздники |
| `NovikovKids.html` | https://novikov-school.ru/deti-draft | **черновик** детской |
| `NovikovNewYear.html` | https://newyear.novikov-school.ru | новогодние мероприятия |
| `NovikovNewYear.html` | https://novikov-school.ru/newyear-draft | **черновик** новогодней |

## Черновик и клиентская ссылка

У детской и у новогодней страницы по две ссылки, и это важно не сломать:

- **`/deti-draft`** — черновик. Следует за `main`: любой задеплоенный коммит
  виден здесь сразу. В углу висит плашка «Черновик».
- **`/deti`** — то, что видит клиент. Это **снимок**, он не меняется при
  обычном деплое. Двигается только вручную.

Новогодняя устроена так же: **`/newyear-draft`** следует за `main`, а
**`newyear.novikov-school.ru`** — снимок для клиента.

```bash
ssh -p 2222 max@193.124.131.161

~/workspace/novikov/deploy.sh            # взрослая + ЧЕРНОВИКИ детской и новогодней
~/workspace/novikov/publish.sh           # черновик детской  -> клиентская /deti
~/workspace/novikov/publish.sh newyear   # черновик новогодней -> клиентский поддомен
~/workspace/novikov/publish.sh all       # обе сразу
```

`publish.sh` кладёт копию в `~/workspace/novikov/published/<страница>.html` и
пишет в `published/VERSION`, какой коммит сейчас у клиента. `deploy.sh` при
сборке берёт клиентские страницы именно оттуда.

**Не заменяйте `cp repo/NovikovKids.html site/deti.html` обратно** — это
уберёт разделение, и клиент начнёт видеть незаконченные правки. То же и с
`newyear.html`.

## Новогодний поддомен

`newyear.novikov-school.ru` — это тот же сервер на 8081: Caddy на хосте выдаёт
сертификат на любой поддомен, а `server.js` по заголовку `Host` отдаёт на `/`
файл `newyear.html`. Поэтому клиентская ссылка короткая и без хвоста, а
относительные `uploads/` и `images/` резолвятся в тот же общий каталог.

## Взрослая страница

Черновика нет: `deploy.sh` кладёт `NovikovOffer.html` сразу в корень как
`index.html`.

## Прочее

- `design-variants/` — семь вариантов оформления детской в PDF и их исходники.
  На сайт не попадает: `deploy.sh` копирует только три HTML, `images/`,
  `uploads/` и `robots.txt`.
- `robots.txt` — `Disallow: /`. Все страницы намеренно закрыты от индексации:
  это ссылки, которые отправляют клиенту напрямую, а не ищут в поиске.
- Чистые адреса без `.html` работают за счёт `server.js`: для пути без
  расширения он пробует `<путь>.html`, а `/deti/` со слэшем редиректит на
  `/deti`, иначе относительные `uploads/` и `images/` уехали бы на уровень глубже.
