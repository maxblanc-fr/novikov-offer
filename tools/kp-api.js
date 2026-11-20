// Общий архив КП генератора (novikov-school.ru/kp-generator-<менеджер>).
// Подключается из server.js на сервере: `const kpApi = require('./kp-api')` и в начале обработчика
// `if (kpApi(req, res)) return`. Копию сюда кладёт tools/install-kp-api.sh.
//
// Данные: data/kp/<менеджер>.json = {items:[{id,no,ver,client,date,kind,tots,updated,by,state}], deleted:{id:iso}, counter:{yy:n}}
// Бэкап: data/kp/backup/<менеджер>-<ГГГГ-ММ-ДД>.json — копия на начало каждого дня, когда были записи.
// Доступ без пароля (решение пользователя 2026-11-20): архив открыт всем, кто знает адрес генератора.
//
//   GET  /api/kp/<менеджер>[?v=<версия>]            → {items, counter, v} | {same:true, v}, если архив не менялся
//        (вкладки опрашивают раз в 30 с — без изменений передаётся пара десятков байт, а не весь архив)
//   POST /api/kp/<менеджер> {op:"put", item, base, force} → {updated} | 409 {item: версия на сервере}
//   POST /api/kp/<менеджер> {op:"merge", items}      → {added, updated}  (перенос старых КП из браузера)
//   POST /api/kp/<менеджер> {op:"del", id}           → {ok}
//   POST /api/kp/<менеджер> {op:"no", yy, min}       → {n}  (следующий номер КП за год, общий для всех компьютеров)
const fs = require('node:fs')
const path = require('node:path')

const DIR = path.join(__dirname, 'data', 'kp')
const BAK = path.join(DIR, 'backup')
const KEY = /^[a-z]{2,24}$/
const ID = /^[\w-]{4,64}$/
const MAX_BODY = 10 * 1024 * 1024

const file = k => path.join(DIR, k + '.json')
const version = k => { try { const st = fs.statSync(file(k)); return `${Math.round(st.mtimeMs)}-${st.size}` } catch { return '0' } }
function load(k) {
  try {
    const d = JSON.parse(fs.readFileSync(file(k), 'utf8'))
    return { items: d.items || [], deleted: d.deleted || {}, counter: d.counter || {} }
  } catch {
    return { items: [], deleted: {}, counter: {} }
  }
}
function store(k, d) {
  fs.mkdirSync(BAK, { recursive: true })
  const f = file(k)
  const bak = path.join(BAK, `${k}-${new Date().toISOString().slice(0, 10)}.json`)
  if (fs.existsSync(f) && !fs.existsSync(bak)) fs.copyFileSync(f, bak)
  const tmp = `${f}.tmp${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify(d))
  fs.renameSync(tmp, f)
}
const byUpdated = (a, b) => String(b.updated || '').localeCompare(String(a.updated || ''))
// Сервер выдаёт время сам и строго по возрастанию, чтобы две записи подряд не получили одинаковую метку
let last = ''
function stamp() {
  let t = new Date().toISOString()
  if (t <= last) t = new Date(Date.parse(last) + 1).toISOString()
  return (last = t)
}
const clean = it =>
  it && typeof it === 'object' && typeof it.id === 'string' && ID.test(it.id) && it.state && typeof it.state === 'object'

function send(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

function handle(k, op, b) {
  const d = load(k)
  if (op === 'put') {
    const it = b.item
    if (!clean(it)) return [400, { error: 'bad item' }]
    const i = d.items.findIndex(x => x.id === it.id)
    const cur = i >= 0 ? d.items[i] : null
    // base — метка версии, с которой работал этот компьютер. Если КП с тех пор сохранили с другого — конфликт
    if (cur && !b.force && (b.base || '') !== (cur.updated || '')) return [409, { item: cur }]
    const rec = { ...it, updated: stamp() }
    if (i >= 0) d.items[i] = rec
    else d.items.push(rec)
    delete d.deleted[it.id]
    store(k, d)
    return [200, { updated: rec.updated }]
  }
  if (op === 'merge') {
    if (!Array.isArray(b.items)) return [400, { error: 'bad items' }]
    let added = 0, updated = 0
    for (const it of b.items) {
      if (!clean(it) || d.deleted[it.id]) continue
      const i = d.items.findIndex(x => x.id === it.id)
      if (i < 0) { d.items.push({ ...it, updated: it.updated || stamp() }); added++ }
      else if (String(it.updated || '') > String(d.items[i].updated || '')) { d.items[i] = it; updated++ }
    }
    if (added || updated) store(k, d)
    return [200, { added, updated }]
  }
  if (op === 'del') {
    if (typeof b.id !== 'string' || !ID.test(b.id)) return [400, { error: 'bad id' }]
    d.items = d.items.filter(x => x.id !== b.id)
    d.deleted[b.id] = stamp()
    store(k, d)
    return [200, { ok: true }]
  }
  if (op === 'no') {
    const yy = String(b.yy || '')
    if (!/^\d{2}$/.test(yy)) return [400, { error: 'bad yy' }]
    let n = Math.max(+d.counter[yy] || 0, +b.min || 0)
    for (const x of d.items) {
      const m = String(x.no || '').match(/(\d+)-(\d+)$/)
      if (m && m[1] === yy) n = Math.max(n, +m[2])
    }
    d.counter[yy] = ++n
    store(k, d)
    return [200, { n }]
  }
  return [400, { error: 'bad op' }]
}

// true — запрос обработан здесь; false — это не API, пусть отдаёт статика
module.exports = function kpApi(req, res) {
  const m = (req.url || '').match(/^\/api\/kp\/([^/?#]+)\/?(?:[?#].*)?$/)
  if (!m) return false
  const k = m[1].toLowerCase()
  if (!KEY.test(k)) { send(res, 400, { error: 'bad manager' }); return true }
  if (req.method === 'GET') {
    const v = version(k), q = (req.url.match(/[?&]v=([\w-]+)/) || [])[1]
    if (q && q === v) { send(res, 200, { same: true, v }); return true }
    const d = load(k)
    send(res, 200, { items: d.items.sort(byUpdated), counter: d.counter, v })
    return true
  }
  if (req.method !== 'POST') { send(res, 405, { error: 'method' }); return true }
  let size = 0
  const chunks = []
  req.on('data', c => {
    size += c.length
    if (size > MAX_BODY) { send(res, 413, { error: 'too large' }); req.destroy() } else chunks.push(c)
  })
  req.on('end', () => {
    if (res.headersSent) return
    let b
    try { b = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { send(res, 400, { error: 'bad json' }); return }
    try {
      const [code, out] = handle(k, b && b.op, b || {})
      send(res, code, out)
    } catch (e) {
      console.error('kp-api', e)
      send(res, 500, { error: 'server' })
    }
  })
  return true
}
module.exports.handle = handle
module.exports.DIR = DIR
