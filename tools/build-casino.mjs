#!/usr/bin/env node
/* Собирает 4 лендинга «казино» из взрослого и новогоднего:
 *
 *   NovikovOffer.html    → NovikovWineCasino.html,        NovikovCocktailCasino.html
 *   NovikovNewYear.html  → NovikovNewYearWineCasino.html, NovikovNewYearCocktailCasino.html
 *
 * Всё, кроме основного формата, берётся с исходной страницы как есть: фуршет,
 * бар, доп. услуги, торты и т.д. Заменяются только:
 *   - герой и статистика,
 *   - «Форматы и цены» — 3 уровня казино вместо мастер-классов,
 *   - «Залы» — только залы, где казино возможно, с вместимостью для казино,
 *   - «Кулинарная часть» → «Меню казино»: готовые сеты из «Сеты НС винное казино.xlsx»,
 *   - из доп. услуг убраны карточки «Винное казино» и «Дегустационные казино»,
 *   - Free-Flow FF1–FF3 на 1 000 ₽ дешевле исходной страницы (Ultra и продление — как есть).
 *
 * Готовые страницы руками не править: правим взрослый/новогодний лендинг
 * или этот файл и пересобираем:  node tools/build-casino.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

/* ---------- цены ----------
   Пакеты: EventyOn (wine/cocktail_casino_basic_offer_b2b, 10 400 / 11 400 / 12 400)
   × 1.25, вверх до сотни. Новый год (решение пользователя 2026-10-28): цена
   кулинарного НГ-пакета Новикова + 1 000 ₽ — у EventyOn НГ-казино ровно на 1 000
   дороже НГ-кулинарии. Одна цена, без разбивки по дням недели. */
const SEASON = {
  adult: {src:"NovikovOffer.html",   prices:["13 000 ₽","14 300 ₽","15 500 ₽"]},
  ny:    {src:"NovikovNewYear.html", prices:["16 500 ₽","18 000 ₽","19 500 ₽"]}
};
const FF_DISCOUNT = 1000;

/* ---------- сеты (одни и те же для вина и коктейлей) ----------
   c — какие подписи курсов показывать (0 закуска, 1 горячее, 2 десерт). */
const SORBET = "Сорбет из манго с клубникой, базиликом, конфитюром из маракуйи и лаймовым безе";
const CASINO_SETS = {
  cz_s1: {ru:"Мясная классика", en:"Meat Classic", c:[0,2], d:["Стейк-салат","Шоколадный брауни с ванильным мороженым"]},
  cz_s2: {ru:"Утка и ягоды", en:"Duck & Berries", c:[0,2], d:["Салат из утиной грудки с печёными овощами","Мильфей с воздушным кремом и ягодами"]},
  cz_s3: {ru:"Ростбиф и манго", en:"Roast Beef & Mango", c:[0,2], d:["Салат с ростбифом и медовой заправкой",SORBET]},
  cz_s4: {ru:"Говядина и тирамису", en:"Beef & Tiramisu", c:[0,2], d:["Тёплый салат с говядиной и чёрно-перечным соусом","Тирамису с манговым муссом и вафельной крошкой"]},
  cz_g1: {ru:"Цыплёнок и тирамису", en:"Chicken & Tiramisu", c:[1,2], d:["Запечённый цыплёнок с кукурузным кремом и соусом жу","Тирамису с манговым муссом и вафельной крошкой"]},
  cz_g2: {ru:"Утка и шоколад", en:"Duck & Chocolate", c:[1,2], d:["Утиная грудка с сельдереем и черникой","Шоколадный брауни с ванильным мороженым"]},
  cz_g3: {ru:"Фланк и сорбет", en:"Flank & Sorbet", c:[1,2], d:["Фланк-стейк с соусом чимичурри и пюре из батата",SORBET]},
  cz_g4: {ru:"Палтус и ягоды", en:"Halibut & Berries", c:[1,2], d:["Филе палтуса с соусом из горгонзолы и бланшированными овощами","Мильфей с воздушным кремом и ягодами"]},
  cz_p1: {ru:"Классика и шоколад", en:"Classic & Chocolate", d:["Стейк-салат","Утиная грудка с сельдереем и черникой","Шоколадный брауни с ванильным мороженым"]},
  cz_p2: {ru:"Утка и палтус", en:"Duck & Halibut", d:["Салат из утиной грудки с печёными овощами","Филе палтуса с соусом из горгонзолы и бланшированными овощами",SORBET]},
  cz_p3: {ru:"Перечный ужин", en:"Pepper Dinner", d:["Тёплый салат с говядиной и чёрно-перечным соусом","Запечённый цыплёнок с кукурузным кремом и соусом жу","Тирамису с манговым муссом и вафельной крошкой"]},
  cz_p4: {ru:"Мясо и море", en:"Meat & Sea", d:["Стейк-салат","Филе дикого сибаса с соусом из спаржи","Мильфей с воздушным кремом и ягодами"]}
};
const LEVEL_IDS = [
  ["cz_s1","cz_s2","cz_s3","cz_s4"],
  ["cz_g1","cz_g2","cz_g3","cz_g4"],
  ["cz_p1","cz_p2","cz_p3","cz_p4"]
];

/* ---------- форматы ---------- */
const KIND = {
  wine: {
    out:{adult:"NovikovWineCasino.html", ny:"NovikovNewYearWineCasino.html"},
    ic:"🍷",
    name:{ru:"Винное казино", en:"Wine Casino"},
    titleTag:{adult:"Novikov School — Винное казино 2026 / Wine Casino 2026",
              ny:"Novikov School — Винное казино · Новый год 2027 / New Year Wine Casino 2027"},
    h1:{adult:{ru:'Винное казино <span>Novikov School</span>', en:'<span>Novikov School</span> Wine Casino'},
        ny:{ru:'Винное казино на Новый год в <span>Novikov School</span>', en:'New Year Wine Casino at <span>Novikov School</span>'}},
    lead:{adult:{ru:"Игра-дегустация вслепую с сомелье-крупье, готовые сеты от шефа, фуршет и барная карта — всё для яркого корпоратива, праздника или частного события.",
                 en:"A blind tasting game with a sommelier-croupier, ready-made chef’s sets, a buffet and a full bar card — everything for a memorable corporate event, celebration or private occasion."},
          ny:{ru:"Новогодний корпоратив в центре Москвы: винное казино с сомелье-крупье, готовые сеты от шефа, фуршет и барная карта — праздник под ключ.",
              en:"A New Year party in central Moscow: a wine casino with a sommelier-croupier, ready-made chef’s sets, a buffet and a full bar card — the whole celebration, turnkey."}},
    intro:{ru:"Игра-дегустация вслепую: сомелье-крупье наливает вино, гости угадывают сорт винограда, страну, крепость или даже год урожая и делают ставки фишками. Интересно и знатоку, и новичку. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
           en:"A blind tasting game: the sommelier-croupier pours, guests guess the grape, the country, the strength or even the vintage and place chip bets. Fun for connoisseurs and beginners alike. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."},
    game:[
      {ru:"Игра «Винное казино» · 6 вин стандартной категории (дегустационная порция 50 мл)", en:"«Wine Casino» game · 6 wines of the standard category (50 ml tasting pour)"},
      {ru:"Игра «Винное казино» + раунд Black Casino · 6 вин авторской категории (дегустационная порция 50 мл)", en:"«Wine Casino» game + Black Casino round · 6 wines of the signature category (50 ml tasting pour)"},
      {ru:"Игра «Винное казино» + раунд Black Casino · 8 вин эксклюзивной категории (дегустационная порция 50 мл)", en:"«Wine Casino» game + Black Casino round · 8 wines of the exclusive category (50 ml tasting pour)"}
    ],
    tabShort:{ru:"Дегустация вслепую", en:"Blind tasting"},
    tabD:{ru:"Сомелье-крупье ведёт игру, а шеф тем временем готовит блюда выбранного сета — их подают в перерывах между раундами.",
          en:"The sommelier-croupier runs the game while the chef cooks the chosen set — the courses are served between rounds."},
    tl:[
      [30, "Сбор гостей, фуршет и приветственные напитки", "Guest welcome, buffet and welcome drinks"],
      [60, "Винное казино: правила и первые раунды", "Wine Casino: the rules and the first rounds", true],
      [30, "Первое блюдо от шефа", "First course from the chef"],
      [60, "Продолжаем игру", "The game continues", true],
      [20, "Второе блюдо", "Second course"],
      [15, "Итоги игры", "Game results"],
      [25, "Свободное время: общение, игры и активности", "Free time: mingling, games and activities"]
    ],
    levelIntro:{ru:"вино в игре", en:"the wines in the game"}
  },
  cocktail: {
    out:{adult:"NovikovCocktailCasino.html", ny:"NovikovNewYearCocktailCasino.html"},
    ic:"🍸",
    name:{ru:"Коктейльное казино", en:"Cocktail Casino"},
    titleTag:{adult:"Novikov School — Коктейльное казино 2026 / Cocktail Casino 2026",
              ny:"Novikov School — Коктейльное казино · Новый год 2027 / New Year Cocktail Casino 2027"},
    h1:{adult:{ru:'Коктейльное казино <span>Novikov School</span>', en:'<span>Novikov School</span> Cocktail Casino'},
        ny:{ru:'Коктейльное казино на Новый год в <span>Novikov School</span>', en:'New Year Cocktail Casino at <span>Novikov School</span>'}},
    lead:{adult:{ru:"Коктейли вслепую с миксологом, готовые сеты от шефа, фуршет и барная карта — всё для яркого корпоратива, праздника или частного события.",
                 en:"Blind cocktail tasting with a mixologist, ready-made chef’s sets, a buffet and a full bar card — everything for a memorable corporate event, celebration or private occasion."},
          ny:{ru:"Новогодний корпоратив в центре Москвы: коктейльное казино с миксологом, готовые сеты от шефа, фуршет и барная карта — праздник под ключ.",
              en:"A New Year party in central Moscow: a cocktail casino with a mixologist, ready-made chef’s sets, a buffet and a full bar card — the whole celebration, turnkey."}},
    intro:{ru:"Вечеринка по мотивам винного казино: гости «вслепую» угадывают состав коктейлей и делают ставки фишками, а миксологи рассказывают секреты приготовления и сочетания напитков. Шеф-команда тем временем кормит ужином. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
           en:"A party inspired by the wine casino: guests taste cocktails blind, guess what is in them and place chip bets, while the mixologists share the secrets of making and pairing drinks. Meanwhile the chef team serves dinner. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."},
    game:[
      {ru:"Игра «Коктейльное казино» · 6 коктейлей (дегустационная порция 50 мл)", en:"«Cocktail Casino» game · 6 cocktails (50 ml tasting pour)"},
      {ru:"Игра «Коктейльное казино» · 7 коктейлей (дегустационная порция 50 мл)", en:"«Cocktail Casino» game · 7 cocktails (50 ml tasting pour)"},
      {ru:"Игра «Коктейльное казино» · 8 коктейлей (дегустационная порция 50 мл)", en:"«Cocktail Casino» game · 8 cocktails (50 ml tasting pour)"}
    ],
    tabShort:{ru:"Коктейли вслепую", en:"Blind cocktails"},
    tabD:{ru:"Миксолог ведёт игру, а шеф тем временем готовит блюда выбранного сета — их подают в перерывах между раундами.",
          en:"The mixologist runs the game while the chef cooks the chosen set — the courses are served between rounds."},
    tl:[
      [30, "Сбор гостей, фуршет и приветственные напитки", "Guest welcome, buffet and welcome drinks"],
      [60, "Коктейльное казино: правила и первые раунды", "Cocktail Casino: the rules and the first rounds", true],
      [30, "Первое блюдо от шефа", "First course from the chef"],
      [45, "Продолжаем игру", "The game continues", true],
      [20, "Второе блюдо", "Second course"],
      [15, "Итоги игры", "Game results"],
      [40, "Свободное время: общение, игры и активности", "Free time: mingling, games and activities"]
    ],
    levelIntro:{ru:"коктейли в игре", en:"the cocktails in the game"}
  }
};

const LEVELS = [
  {k:"std",    n:{ru:"Стандартный", en:"Standard"},    buffet:"Small Set",  bwt:"132 г", bru:"7 позиций, 132 г",  ben:"7 items, 132 g",
   dish:{ru:"2 блюда из сета: салат и десерт", en:"2 courses from the set: salad and dessert"}},
  {k:"author", n:{ru:"Авторский",   en:"Author’s"},    buffet:"Medium Set", bwt:"166 г", bru:"9 позиций, 166 г",  ben:"9 items, 166 g",
   dish:{ru:"2 блюда из сета: горячее и десерт", en:"2 courses from the set: main and dessert"}},
  {k:"excl",   n:{ru:"Эксклюзивный",en:"Exclusive"},   buffet:"Large Set",  bwt:"205 г", bru:"11 позиций, 205 г", ben:"11 items, 205 g",
   dish:{ru:"3 блюда из сета: салат, горячее и десерт", en:"3 courses from the set: salad, main and dessert"}}
];

/* ---------- залы для казино (файл «Вместимость Новиков СЕЙЛЗ (5).xlsx», строки
   «Казино» и «Коктейльное казино» — цифры одинаковые). Гранатовый, Лимонный и Prof —
   казино невозможно, не показываем. */
const NOSEAT = {ru:"без посадки на время игры", en:"no seating during the game"};
const HALL_CAP = {
  cafe:   {ru:"до 40 гостей", en:"up to 40 guests"},
  olive:  {ru:"до 20 гостей", en:"up to 20 guests"},
  art:    {ru:`до 20 гостей в каждом зале · ${NOSEAT.ru}`, en:`up to 20 guests per hall · ${NOSEAT.en}`},
  tomato: {ru:`до 40 гостей · ${NOSEAT.ru}`, en:`up to 40 guests · ${NOSEAT.en}`},
  orange: {ru:`до 40 гостей · ${NOSEAT.ru}`, en:`up to 40 guests · ${NOSEAT.en}`}
};
const HALL_ORDER = ["cafe","olive","art","tomato","orange"];

/* ---------- утилиты ---------- */
const q = s => JSON.stringify(s);
const L = o => `{ru:${q(o.ru)}, en:${q(o.en)}}`;

/* Конец JS-литерала, начинающегося с открывающей скобки на позиции i. */
function matchBrace(src, i){
  const open = src[i], close = {"{":"}","[":"]"}[open];
  let depth = 0;
  for(let j=i; j<src.length; j++){
    const ch = src[j];
    if(ch==='"' || ch==="'" || ch==="`"){
      for(j++; src[j]!==ch; j++) if(src[j]==="\\") j++;
      continue;
    }
    if(ch==="/" && src[j+1]==="*"){ j = src.indexOf("*/", j+2)+1; continue; }
    if(ch===open) depth++;
    else if(ch===close && --depth===0) return j;
  }
  throw new Error("unbalanced at "+i);
}
function must(cond, msg){ if(!cond) throw new Error(msg); }
function replaceOnce(src, from, to, what){
  const n = src.split(from).length-1;
  must(n===1, `${what}: ожидалось 1 совпадение, найдено ${n}`);
  return src.replace(from, () => to);
}
/* Объект секции DATA.sections с данным id: [start, end] (end включительно). */
function sectionRange(src, id){
  const k = src.indexOf(`id:"${id}"`);
  must(k>0, "нет секции "+id);
  const start = src.lastIndexOf("{", k);
  return [start, matchBrace(src, start)];
}
function replaceSection(src, id, text){
  const [a,b] = sectionRange(src, id);
  return src.slice(0,a) + text + src.slice(b+1);
}
/* Убрать элемент массива, начинающийся с `head`, вместе с разделяющей запятой. */
function removeItem(src, head){
  const a = src.indexOf(head);
  must(a>0, "нет элемента "+head);
  const b = matchBrace(src, a);
  const after = src.slice(b+1).match(/^\s*,\s*/);
  return src.slice(0,a) + src.slice(b+1+(after?after[0].length:0));
}
const rub = n => n.toLocaleString("ru-RU").replace(/\u00a0/g," ") + " ₽";
const parseRub = s => +s.replace(/[^\d]/g,"");

/* ---------- сборка ---------- */
function build(kindKey, seasonKey){
  const K = KIND[kindKey], S = SEASON[seasonKey];
  let src = read(S.src);
  const orig = src;

  // TR должен знать все блюда сетов, иначе в EN останется русский
  for(const s of Object.values(CASINO_SETS)) for(const d of s.d)
    must(orig.includes(`\n${q(d)}:`), `нет перевода блюда в TR (${S.src}): ${d}`);

  // заголовок, герой
  src = src.replace(/<title>[^<]*<\/title>/, `<title>${K.titleTag[seasonKey]}</title>`);
  src = src.replace(/(<!DOCTYPE html>\n?)/i, `$1<!-- СОБРАНО tools/build-casino.mjs из ${S.src} — руками не править -->\n`);
  const h1 = K.h1[seasonKey], lead = K.lead[seasonKey];
  src = src.replace(/<h1 data-i18n="h1">[\s\S]*?<\/h1>/, `<h1 data-i18n="h1">${h1.ru}</h1>`);
  src = src.replace(/<p class="lead" data-i18n="lead">[\s\S]*?<\/p>/, `<p class="lead" data-i18n="lead">${lead.ru}</p>`);
  src = src.replace(/^  h1:\{ru:.*$/m, `  h1:{ru:'${h1.ru}', en:'${h1.en}'},`);
  src = src.replace(/^  lead:\{ru:[^\n]*\n[^\n]*\},$/m, `  lead:${L(lead)},`);

  // сеты в общий справочник
  const setsText = Object.entries(CASINO_SETS).map(([k,v]) =>
    `  ${k}: {ru:${q(v.ru)}, en:${q(v.en)}${v.c?`, c:${q(v.c)}`:""}, d:${q(v.d)}}`).join(",\n");
  src = src.replace(/(const SETS = \{[\s\S]*?)\n\};/, (m, body) => `${body},\n  /* казино — tools/build-casino.mjs */\n${setsText}\n};`);

  // статистика
  {
    const a = src.indexOf("stats:["), b = matchBrace(src, a+6);
    const old = src.slice(a, b+1);
    const svc = +old.match(/\{n:"(\d+)", ru:"доп\. услуг"/)[1] - 2;
    src = src.slice(0,a) + `stats:[
    {n:"12", ru:"готовых сетов", en:"ready-made sets"},
    {n:"3",  ru:"уровня казино", en:"casino levels"},
    {n:"7",  ru:"залов для игры", en:"halls for the game"},
    {n:"100+", ru:"позиций в барной карте", en:"drinks on the bar card"},
    {n:"${svc}", ru:"доп. услуг", en:"add-on services"}
  ]` + src.slice(b+1);
  }

  // форматы
  {
    const [a,b] = sectionRange(src, "formats");
    const old = src.slice(a,b+1);
    const sub = old.match(/sub:(\{ru:[^\n]*\})/)[1];
    const note = old.match(/note:(\{ru:[^\n]*\})/)[1];
    const items = LEVELS.map((l,i)=>`          {n:${L(l.n)},
            d:{ru:${q(`${K.game[i].ru} · ${l.dish.ru} · фуршет «${l.buffet}» (${l.bru}) · безалкогольные напитки.`)},
               en:${q(`${K.game[i].en} · ${l.dish.en} · «${l.buffet}» buffet (${l.ben}) · soft drinks.`)}}, p:"${S.prices[i]}",
            game:${L(K.game[i])}}`).join(",\n");
    src = replaceSection(src, "formats", `{
      id:"formats", icon:"💼", type:"formats",
      title:{ru:"Форматы и цены", en:"Formats & Pricing"},
      sub:${sub},
      note:${note},
      intro:${L(K.intro)},
      groups:[
        {head:{ru:${q(K.name.ru+" — 3 уровня")}, en:${q(K.name.en+" — 3 levels")}}, items:[
${items}
        ]}
      ],
      foot:{ru:"Казино не является азартной игрой: участники не делают денежных ставок. 18+. Чрезмерное употребление алкоголя вредит вашему здоровью.",
            en:"The casino is not gambling: no money is staked. 18+. Excessive drinking is harmful to your health."}
    }`);
  }

  // залы
  {
    const [a,b] = sectionRange(src, "venues");
    const old = src.slice(a,b+1);
    const note = old.match(/note:(\{ru:[^\n]*\})/)[1];
    const incl = old.slice(old.indexOf("incl:{"), matchBrace(old, old.indexOf("incl:{")+5)+1);
    const halls = HALL_ORDER.map(slug=>{
      const at = old.indexOf(`{slug:"${slug}"`);
      must(at>0, "нет зала "+slug);
      let h = old.slice(at, matchBrace(old, at)+1);
      return "        " + h.replace(/cap:\{ru:"[^"]*", en:"[^"]*"\}/, `cap:${L(HALL_CAP[slug])}`);
    }).join(",\n");
    const ext = old.match(/ext:\[[^\n]*\]/)[0];
    must(/s:\["olive","granat"\], p:"([^"]+)"/.test(ext) && /s:\["cafe"\], p:"([^"]+)"/.test(ext), "формат ext поменялся");
    const pOlive = ext.match(/s:\["olive","granat"\], p:"([^"]+)"/)[1], pCafe = ext.match(/s:\["cafe"\], p:"([^"]+)"/)[1];
    src = replaceSection(src, "venues", `{
      id:"venues", icon:"🏛️", type:"venues",
      ext:[{s:["olive"], p:"${pOlive}"}, {s:["cafe"], p:"${pCafe}"}],
      title:{ru:"Залы", en:"Venues"},
      sub:{ru:"Залы, где проводим казино, — от 20 до 40 гостей на одной площадке", en:"Halls that host the casino — 20 to 40 guests at one venue"},
      note:${note},
      halls:[
${halls}
      ],
      combos:{ru:"В Томатном, Апельсиновом и залах ART казино проходит в барном формате: места для посадки на время игры нет.",
              en:"In Tomato, Orange and the ART halls the casino runs bar-style: there is no seating during the game."},
      ${incl}
    }`);
  }

  // меню казино (вместо «Кулинарной части»)
  {
    const levels = LEVELS.map((l,i)=>`           {k:"${l.k}", n:${L(l.n)}, price:"${S.prices[i]}", buffet:"${l.buffet}", bwt:"${l.bwt}",
            ids:${q(LEVEL_IDS[i])}}`).join(",\n");
    const tl = K.tl.map(([m,ru,en,hi])=>`           {m:${m}, ru:${q(ru)}, en:${q(en)}${hi?", hi:true":""}}`).join(",\n");
    src = replaceSection(src, "sets", `{
      id:"sets", type:"sets",
      title:{ru:"Меню казино", en:"Casino Menu"},
      sub:{ru:"Три уровня · 4 готовых сета от шефа в каждом", en:"Three levels · 4 ready-made chef’s sets in each"},
      note:{ru:"Сет из 2 блюд (Эксклюзивный — 3) \\u00b7 фуршет включён в стоимость", en:"2-course set (Exclusive — 3) \\u00b7 buffet included"},
      intro:{ru:${q(`Выберите уровень — от него зависят ${K.levelIntro.ru}, сеты от шефа, включённый фуршет и цена за гостя.`)},
             en:${q(`Choose the level — it defines ${K.levelIntro.en}, the chef’s sets, the included buffet and the price per guest.`)}},
      tabs:[
        {k:"casino", ic:"${K.ic}",
         n:${L(K.name)},
         short:${L(K.tabShort)},
         d:${L(K.tabD)},
         tl:[
${tl}
         ],
         levels:[
${levels}
         ]}
      ]
    }`);
  }

  // доп. услуги: без казино
  src = removeItem(src, `{ic:"🍷", name:{ru:"Винное казино"`);
  src = removeItem(src, `{ic:"🎰", name:{ru:"Дегустационные казино"`);

  // Free-Flow: пакеты на 1 000 ₽ дешевле, Ultra и продление — как есть
  for(const code of ["FF1","FF2","FF3"]){
    const re = new RegExp(`(\\{code:"${code}", name:\\{[^}]*\\}, price:")([^"]+)(")`);
    must(re.test(src), "нет пакета "+code);
    src = src.replace(re, (m,a,p,c)=>a + rub(parseRub(p)-FF_DISCOUNT) + c);
  }

  // рендер: одна вкладка — без переключателя; подписи курсов для сетов из 2 блюд
  src = replaceOnce(src,
    "body = (s.intro?`<p class=\"sec-intro\">${s.intro[LANG]}</p>`:\"\") + tabBar + panels;",
    "body = (s.intro?`<p class=\"sec-intro\">${s.intro[LANG]}</p>`:\"\") + (s.tabs.length>1?tabBar:\"\") + panels;",
    "tabBar");
  src = replaceOnce(src,
    "const cc = it.d.length===3 ? c : [];",
    "const cc = it.c ? it.c.map(k=>c[k]) : it.d.length===3 ? c : [];",
    "setCard");

  // В новых страницах не должно остаться следов кулинарного формата в DATA
  const data = src.slice(src.indexOf("const DATA"), src.indexOf("const TR"));
  for(const bad of ["Демо-ужин","Индивидуальный мастер-класс (максимум","Дегустационные казино",'"Prof"','"Гранатовый"','"Лимонный"'])
    must(!data.includes(bad), `осталось «${bad}» в ${K.out[seasonKey]}`);

  fs.writeFileSync(path.join(ROOT, K.out[seasonKey]), src);
  console.log("→", K.out[seasonKey]);
}

for(const k of Object.keys(KIND)) for(const s of Object.keys(SEASON)) build(k, s);
