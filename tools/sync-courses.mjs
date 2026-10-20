#!/usr/bin/env node
// Ежедневная сверка витрины курсов с сайтом школы.
// Обходит https://novikovspace.com/school/direction/professional и страницу каждого
// курса, собирает цены, повышения цены, группы и места, пишет courses-live.json и
// дописывает в него журнал изменений относительно прошлого прогона.
//
//   node tools/sync-courses.mjs <out.json> [<copy-to.json> ...]
//
// Без зависимостей — на сервере только Node. Качаем через curl, а не fetch: в контейнере
// встроенный fetch идёт мимо HTTPS-прокси и падает по таймауту, а curl прокси берёт из env. Если список курсов не скачался или
// пустой, прошлый файл не трогаем: витрина лучше покажет вчерашние данные, чем пустоту.

import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'

const LISTING = 'https://novikovspace.com/school/direction/professional'
const COURSE = slug => `https://novikovspace.com/school/course/${slug}`
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const KEEP_CHANGES = 200

const [out, ...copies] = process.argv.slice(2)
if (!out) {
  console.error('usage: sync-courses.mjs <out.json> [<copy-to.json> ...]')
  process.exit(2)
}

const today = new Date(new Date().toISOString().slice(0, 10))
const iso = d => d.toISOString().slice(0, 10)
const utc = (y, m, d) => new Date(Date.UTC(y, m, d))

const decode = s =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8381;/g, '₽')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&bull;/g, '•')
    .replace(/&times;/g, '×')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&')
const text = s => decode(String(s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const money = s => {
  const m = text(s).match(/(\d[\d ]*)\s*₽/)
  return m ? +m[1].replace(/\s/g, '') : null
}
const first = (s, re) => s.match(re)?.[1]

const curl = args =>
  new Promise((resolve, reject) =>
    execFile('curl', ['-sSL', '--max-time', '60', '-A', 'Mozilla/5.0 (novikov-school.ru courses sync)', '-H', 'Accept-Language: ru', ...args],
      { maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => (err ? reject(new Error(stderr.trim() || err.message)) : resolve(stdout))))

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await curl(['--fail', url])
    } catch (e) {
      if (attempt >= 3) throw new Error(`${url}: ${e.message}`)
      await new Promise(r => setTimeout(r, 3000 * attempt))
    }
  }
}

// «27.12» без года — ближайшая такая дата, не раньше чем неделю назад.
function dayMonth(d, m, near = today) {
  let y = near.getUTCFullYear()
  let date = utc(y, m, d)
  if (date < new Date(+near - 7 * 864e5)) date = utc(y + 1, m, d)
  return date
}

// «с 11 января по 15 января», «с 26 по 28 октября», «12 ноября»
function parseRange(raw, hintIso) {
  const re = new RegExp(`(\\d{1,2})(?:\\s+(${MONTHS.join('|')}))?(?:\\s+(\\d{4}))?`, 'gi')
  const parts = [...raw.matchAll(re)]
  const dated = parts.filter(m => m[2])
  if (!dated.length) return null
  const mon = name => MONTHS.indexOf(name.toLowerCase())
  const a = parts[0], b = parts.length > 1 ? parts[1] : parts[0]
  const am = a[2] ? mon(a[2]) : mon(dated[0][2])
  const bm = b[2] ? mon(b[2]) : am
  let y = a[3] ? +a[3] : today.getUTCFullYear()
  let known = !!a[3]
  // Подсказка из списка курсов («Ближайшая группа 26.10.26») знает год точно.
  if (hintIso && !known) {
    const h = new Date(hintIso)
    if (h.getUTCMonth() === am && h.getUTCDate() === +a[1]) (y = h.getUTCFullYear()), (known = true)
  }
  let start = utc(y, am, +a[1])
  let end = utc(b[3] ? +b[3] : y, bm, +b[1])
  if (end < start) end = utc(end.getUTCFullYear() + 1, bm, +b[1])
  // Группа, закончившаяся больше недели назад, на сайте не висит — значит, это следующий год.
  if (!known && end < new Date(+today - 7 * 864e5)) {
    start = utc(start.getUTCFullYear() + 1, am, +a[1])
    end = utc(end.getUTCFullYear() + 1, bm, +b[1])
  }
  return { start: iso(start), end: iso(end) }
}

function parseListing(html) {
  const out = new Map()
  const chunks = html.split(/<div class="b-school-slider__course-profesional\b/).slice(1)
  for (const c of chunks) {
    const slug = first(c, /href="https:\/\/novikovspace\.com\/school\/course\/([^"/?#]+)"/)
    if (!slug || out.has(slug)) continue
    const nearest = first(c, /b-school-slider__group-info">([\s\S]*?)<\/div>/)
    const nd = nearest && text(nearest).match(/(\d{2})\.(\d{2})\.(\d{2})/)
    out.set(slug, {
      slug,
      url: COURSE(slug),
      title: text(first(c, /b-school-slider__title-text">([\s\S]*?)<\/span>/)),
      img: first(c, /data-src="([^"]+)"/) || first(c, /<img[^>]+src="([^"]+)"/) || null,
      short: text(first(c, /b-school-slider__text-hidden"[^>]*>([\s\S]*?)<\/p>/)),
      level: text(first(c, /b-school-slider__level">([\s\S]*?)<\/span>/)) || null,
      lessons: text(first(c, /b-school-slider__lesson">([\s\S]*?)<\/span>/)) || null,
      listPrice: money(first(c, /b-school-slider__price">([\s\S]*?)<\/span>\s*<\/span>/) || ''),
      nearest: nd ? { date: `20${nd[3]}-${nd[2]}-${nd[1]}`, note: text(nearest).replace(/^.*?\d{2}\.\d{2}\.\d{2}\s*/, '') || null } : null,
    })
  }
  return [...out.values()]
}

function parseCourse(html, base) {
  const priceBlock = first(html, /<div class="price">([\s\S]*?)<div class="subscribe">/) || ''
  const now = money(first(priceBlock, /<span>([\s\S]*?)<\/span>/) || '')
  const raiseTitle = text(first(priceBlock, /early-booking-title">([\s\S]*?)<\/div>/) || '')
  const raiseDate = raiseTitle.match(/(\d{2})\.(\d{2})/)
  const raisePrice = money(first(priceBlock, /early-booking-price">([\s\S]*?)<\/div>/) || '')
  const groups = [...html.matchAll(/<p class="group">([\s\S]*?)<\/p>/g)].map(([, g]) => {
    const name = text(first(g, /class="name">([\s\S]*?)<\/span>/)) || 'Группа'
    const timeHtml = first(g, /class="time">[\s\S]*?<b>([\s\S]*?)<\/b>/) || ''
    const [datesRaw, ...rest] = timeHtml.split(/<br\s*\/?>/i).map(text)
    const people = text(first(g, /class="people">([\s\S]*?)<\/span>/) || '')
    const seats = people.match(/(\d+)\s*из\s*(\d+)/)
    const range = parseRange(datesRaw || '', base.nearest?.date)
    return {
      name,
      ...(range || {}),
      dates: datesRaw || null,
      schedule: rest.join(' ').replace(/—/g, '–') || null,
      free: seats ? +seats[1] : /нет/i.test(people) ? 0 : null,
      total: seats ? +seats[2] : null,
      seats: people || null,
    }
  })
  const teachers = [...html.matchAll(/<div class="b-school-slider__curator">([\s\S]*?)<\/p><\/div><\/div>/g)].map(([, t]) => [
    text(first(t, /b-school-slider__title-text">([\s\S]*?)<\/span>/)),
    text(first(t, /b-school-slider__text-hidden">([\s\S]*?)$/)),
  ]).filter(([n]) => n)
  return {
    ...base,
    title: text(first(html, /<h1[^>]*>([\s\S]*?)<\/h1>/)) || base.title,
    description: text(first(html, /<meta[^>]+(?:name|property)="(?:og:)?description"[^>]+content="([^"]*)"/)) || null,
    price: {
      now: now ?? base.listPrice,
      credit: /рассрочк/i.test(priceBlock),
      raise: raiseDate && raisePrice ? { from: iso(dayMonth(+raiseDate[1], +raiseDate[2] - 1)), price: raisePrice } : null,
    },
    groups,
    teachers,
  }
}

const rub = n => (n == null ? '—' : n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽')
const day = s => {
  const d = new Date(s)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
const groupKey = g => `${g.name}|${g.start || g.dates}`

function diff(prev, next) {
  const out = []
  const was = new Map((prev?.courses || []).map(c => [c.slug, c]))
  const add = (c, kind, text) => out.push({ date: iso(today), slug: c.slug, title: c.title, kind, text })
  if (!prev) return out
  for (const c of next) {
    const p = was.get(c.slug)
    was.delete(c.slug)
    if (!p) {
      add(c, 'new', `Новый курс на сайте · ${rub(c.price.now)}`)
      continue
    }
    if (p.price?.now !== c.price.now) add(c, 'price', `Цена: ${rub(p.price?.now)} → ${rub(c.price.now)}`)
    const pr = p.price?.raise, cr = c.price.raise
    if (cr && (!pr || pr.from !== cr.from || pr.price !== cr.price)) add(c, 'raise', `С ${day(cr.from)} цена станет ${rub(cr.price)}`)
    const pg = new Map((p.groups || []).map(g => [groupKey(g), g]))
    for (const g of c.groups) {
      const old = pg.get(groupKey(g))
      pg.delete(groupKey(g))
      const when = g.start ? `${day(g.start)} – ${day(g.end)}` : g.dates
      if (!old) add(c, 'group', `Новая группа: ${when}${g.free != null ? ` · свободно ${g.free}${g.total ? ` из ${g.total}` : ''}` : ''}`)
      else if (old.free > 0 && g.free === 0) add(c, 'full', `${g.name} (${when}): мест больше нет`)
    }
    for (const g of pg.values()) add(c, 'gone', `Группа снята с сайта: ${g.start ? `${day(g.start)} – ${day(g.end)}` : g.dates}`)
  }
  for (const p of was.values()) add(p, 'removed', 'Курс пропал со страницы проф. направления')
  return out
}

// В списке курсов — миниатюры 400×227; у большинства есть баннер 1290×400 в background/.
async function cover(img) {
  if (!img) return null
  const big = img.replace(/\/uploads\/school\/courses\/(?!background\/)/, '/uploads/school/courses/background/')
  if (big === img) return img
  try {
    return (await curl(['-I', '-o', '/dev/null', '-w', '%{http_code}', big])).trim() === '200' ? big : img
  } catch {
    return img
  }
}

async function pool(items, n, fn) {
  const res = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++
      res[k] = await fn(items[k], k)
    }
  }))
  return res
}

const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null
const errors = []

let listing
try {
  listing = parseListing(await get(LISTING))
} catch (e) {
  listing = []
  errors.push(e.message)
}
if (!listing.length) {
  console.error(`sync-courses: список курсов не получен (${errors.join('; ') || 'пусто'}), ${out} не тронут`)
  process.exit(1)
}

const prevBySlug = new Map((prev?.courses || []).map(c => [c.slug, c]))
const courses = await pool(listing, 3, async base => {
  try {
    const [html, img] = await Promise.all([get(base.url), cover(base.img)])
    return parseCourse(html, { ...base, img })
  } catch (e) {
    errors.push(e.message)
    // Страница курса не открылась — оставляем вчерашние данные, а не пустые.
    return prevBySlug.get(base.slug) || { ...base, price: { now: base.listPrice, credit: false, raise: null }, groups: [], teachers: [] }
  }
})

const changes = [...diff(prev, courses), ...(prev?.changes || [])].slice(0, KEEP_CHANGES)
const data = {
  updated: new Date().toISOString(),
  source: LISTING,
  errors,
  courses: courses.map(({ listPrice, ...c }) => c),
  changes,
}

const json = JSON.stringify(data, null, 1)
for (const f of [out, ...copies]) {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f + '.tmp', json)
  fs.renameSync(f + '.tmp', f)
}
const fresh = changes.filter(c => c.date === iso(today)).length
console.log(`sync-courses ${data.updated}: ${courses.length} курсов, изменений сегодня ${fresh}${errors.length ? `, ошибок ${errors.length}` : ''}`)
