#!/usr/bin/env node
/* Собирает 2 лендинга «Винно-мясное казино» из взрослого и новогоднего:
 *
 *   NovikovOffer.html    → NovikovMeatWineCasino.html
 *   NovikovNewYear.html  → NovikovNewYearMeatWineCasino.html
 *
 * Логика та же, что у build-casino.mjs: всё, кроме основного формата, берётся
 * с исходной страницы (фуршет, бар, доп. услуги). Заменяются:
 *   - герой (фото со стола с проекциями фоном), статистика, «премиальная» тема,
 *   - «Форматы и цены» — 3 уровня по пакетам EventyOn (business.eventyon.ru/meatwine-casino
 *     и /meatwine-casino-newyear), без официанта (у Новикова он и так входит),
 *   - «Программа» — что входит в каждый уровень и свой тайминг у уровня
 *     (Стандартный и Авторский — 4 часа, Эксклюзивный — 5 часов, решение пользователя 2026-11-12),
 *   - «Залы» — все, кроме ART; вместимость не пишем (DATA.hideCap); Апельсиновый
 *     выделен: игра проходит только в нём,
 *   - из доп. услуг убраны казино, Free-Flow FF1–FF3 на 1 000 ₽ дешевле — как у казино.
 *
 * Готовые страницы руками не править:  node tools/build-meatwine.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchBrace, must, replaceOnce, sectionRange, replaceSection, rub, parseRub } from "./build-casino.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const q = s => JSON.stringify(s);
const L = o => `{ru:${q(o.ru)}, en:${q(o.en)}}`;

/* ---------- цены (черновик на согласование) ----------
   Осень: EventyOn 12 100 / 13 100 / 14 100 × 1.25, вверх до сотни — как у винного казино.
   Новый год: как у НГ-казино — НГ-кулинария Новикова (15 500 / 17 000 / 18 500) + разница,
   на которую у EventyOn НГ винно-мясное дороже НГ-кулинарии (17 300 / 18 300 / 19 300 против
   14 500 / 15 500 / 17 100 чт–сб): +2 800 / +2 800 / +2 200. */
const SEASON = {
  adult: {src:"NovikovOffer.html",   out:"NovikovMeatWineCasino.html",        prices:["15 200 ₽","16 400 ₽","17 700 ₽"], bottles:["8 500","11 500","14 500"],
          title:"Novikov School — Винно-мясное казино 2026 / Meat & Wine Casino 2026",
          h1:{ru:'Винно-мясное казино <span>Novikov School</span>', en:'<span>Novikov School</span> Meat &amp; Wine Casino'},
          lead:{ru:"Гастрономическая игра для ценителей: вино и мясные деликатесы вслепую, ставки фишками, шеф и сомелье за одним столом с гостями.",
                en:"A gastronomic game for connoisseurs: wine and prime meat tasted blind, chip bets, and a chef and a sommelier at the table with your guests."}},
  ny:    {src:"NovikovNewYear.html", out:"NovikovNewYearMeatWineCasino.html", prices:["18 300 ₽","19 800 ₽","20 700 ₽"], bottles:["10 200","13 800","17 400"],
          title:"Novikov School — Винно-мясное казино · Новый год 2027 / New Year Meat & Wine Casino 2027",
          h1:{ru:'Винно-мясное казино на Новый год в <span>Novikov School</span>', en:'New Year Meat &amp; Wine Casino at <span>Novikov School</span>'},
          lead:{ru:"Новогодний вечер для тех, кто ценит хорошее мясо и вино: дегустация вслепую, ставки фишками, шеф и сомелье за одним столом с гостями.",
                en:"A New Year evening for lovers of fine meat and wine: blind tasting, chip bets, and a chef and a sommelier at the table with your guests."}}
};
const FF_DISCOUNT = 1000;

const INTRO = {
  kick:{ru:"О формате", en:"The format"},
  h:{ru:"Вино и мясо вслепую.<em>Ставки — фишками.</em>", en:"Wine and meat, tasted blind.<em>Bets in chips.</em>"},
  p1:{ru:"Гастрономическая игра для тех, кто ценит хорошее мясо и вино. Гости вслепую дегустируют вино и мясные деликатесы, угадывают и делают ставки фишками.",
      en:"A gastronomic game for those who love good meat and wine. Guests taste wine and meat delicacies blind, guess and place chip bets."},
  p2:{ru:"Весь вечер рядом шеф и сомелье: расскажут, какое мясо прощает ошибки, какие маринады уместны к тому или иному блюду и какое вино станет лучшей парой. Стандартный и Авторский уровни — 4 часа, Эксклюзивный — 5 часов, с приветствием гостей и фуршетом.",
      en:"The chef and the sommelier stay with you all evening: they explain which meat forgives mistakes, which marinades suit which dish and which wine makes the perfect pairing. The Standard and Author’s levels run 4 hours, the Exclusive level 5 hours, including the guest welcome and the buffet."},
  facts:[
    {ic:"glass", b:{ru:"До 5 вин", en:"Up to 5 wines"}, s:{ru:"вслепую, от сомелье", en:"blind, poured by the sommelier"}},
    {ic:"meat",  b:{ru:"До 4 отрубов", en:"Up to 4 cuts"}, s:{ru:"готовит и подаёт шеф", en:"cooked and served by the chef"}},
    {ic:"chip",  b:{ru:"Ставки фишками", en:"Chip bets"}, s:{ru:"на вина и мясные отрубы", en:"on the wines and meat cuts"}},
    {ic:"pin",   b:{ru:"Апельсиновый зал", en:"Orange hall"}, s:{ru:"игра проходит только здесь", en:"the only hall for the game"}}
  ]
};
/* тонкие золотые иконки фактов */
const FACT_IC = {
  glass:'<path d="M8 3h8l-.6 6a3.4 3.4 0 0 1-6.8 0L8 3zM12 12.5V20M8.5 20h7"/>',
  meat:'<path d="M14.5 4.5c3 0 5 2.2 5 5 0 4.5-5 9.5-10 9.5-2.6 0-4.5-1.8-4.5-4.2 0-3.3 3-4.3 4.6-6.3 1.4-1.8 2.4-4 4.9-4z"/><circle cx="14" cy="10" r="1.6"/>',
  chip:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
  pin:'<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'
};
const NAME = {ru:"Винно-мясное казино", en:"Meat & Wine Casino"};

/* Уровни. Состав — из пакетов EventyOn silver / gold / platinum. */
const LEVELS_T = [
  {k:"std", n:{ru:"Стандартный", en:"Standard"}, hours:{ru:"4 часа", en:"4 hours"}, buffet:"Small Set", bwt:"132 г", bru:"7 позиций, 132 г", ben:"7 items, 132 g",
   game:{ru:"Игра «Винно-мясное казино» · 3 вина стандартной категории (@B@ ₽/бут., дегустационная порция 50 мл) · 3 отборных мясных отруба стандартной категории с овощами",
         en:"«Meat & Wine Casino» game · 3 wines of the standard category (@B@ ₽/bottle, 50 ml tasting pour) · 3 prime meat cuts of the standard category with vegetables"},
   set:{id:"mw_std", ru:"3 вина и 3 отруба", en:"3 wines & 3 cuts",
        d:["3 вина стандартной категории (@B@ ₽/бут.) вслепую, порция 50 мл","3 отборных мясных отруба стандартной категории с овощами","Итальянское домашнее мороженое"]},
   tl:[[30,"Сбор гостей, фуршет и приветственные напитки","Guest welcome, buffet and welcome drinks"],
       [80,"Играем: 2 раунда винного и 2 раунда мясного казино","Game: 2 wine rounds and 2 meat rounds",true],
       [20,"Перерыв","Break"],
       [50,"Продолжаем: ещё 1 раунд вина и 1 раунд мяса","The game continues: 1 more wine round and 1 meat round",true],
       [30,"Десерт и итоги игры","Dessert and game results"],
       [30,"Свободное время: общение","Free time: mingling"]]},
  {k:"author", n:{ru:"Авторский", en:"Author’s"}, hours:{ru:"4 часа", en:"4 hours"}, buffet:"Medium Set", bwt:"166 г", bru:"9 позиций, 166 г", ben:"9 items, 166 g",
   game:{ru:"Игра «Винно-мясное казино» · 4 вина авторской категории (@B@ ₽/бут., дегустационная порция 50 мл) · 4 отборных мясных отруба авторской категории с овощами",
         en:"«Meat & Wine Casino» game · 4 wines of the signature category (@B@ ₽/bottle, 50 ml tasting pour) · 4 prime meat cuts of the signature category with vegetables"},
   set:{id:"mw_author", ru:"4 вина и 4 отруба", en:"4 wines & 4 cuts",
        d:["4 вина авторской категории (@B@ ₽/бут.) вслепую, порция 50 мл","4 отборных мясных отруба авторской категории с овощами","Итальянское домашнее мороженое"]},
   tl:[[30,"Сбор гостей, фуршет и приветственные напитки","Guest welcome, buffet and welcome drinks"],
       [70,"Играем: 2 раунда винного и 2 раунда мясного казино","Game: 2 wine rounds and 2 meat rounds",true],
       [15,"Перерыв","Break"],
       [70,"Продолжаем: ещё 2 раунда вина и 2 раунда мяса","The game continues: 2 more wine rounds and 2 meat rounds",true],
       [25,"Десерт и итоги игры","Dessert and game results"],
       [30,"Свободное время: общение","Free time: mingling"]]},
  {k:"excl", n:{ru:"Эксклюзивный", en:"Exclusive"}, hours:{ru:"5 часов", en:"5 hours"}, buffet:"Large Set", bwt:"205 г", bru:"11 позиций, 205 г", ben:"11 items, 205 g",
   game:{ru:"Игра «Винно-мясное казино» + раунд Black Casino · 5 вин эксклюзивной категории (@B@ ₽/бут., дегустационная порция 50 мл) · 4 отборных мясных отруба эксклюзивной категории с овощами · салат на выбор",
         en:"«Meat & Wine Casino» game + Black Casino round · 5 wines of the exclusive category (@B@ ₽/bottle, 50 ml tasting pour) · 4 prime meat cuts of the exclusive category with vegetables · salad of your choice"},
   set:{id:"mw_excl", ru:"5 вин, 4 отруба и Black Casino", en:"5 wines, 4 cuts & Black Casino",
        d:["5 вин эксклюзивной категории (@B@ ₽/бут.) вслепую, порция 50 мл, и раунд Black Casino","4 отборных мясных отруба эксклюзивной категории с овощами","Салат на выбор","Итальянское домашнее мороженое"]},
   tl:[[30,"Сбор гостей, фуршет и приветственные напитки","Guest welcome, buffet and welcome drinks"],
       [70,"Играем: 2 раунда винного и 2 раунда мясного казино","Game: 2 wine rounds and 2 meat rounds",true],
       [30,"Перерыв и салат","Break and salad"],
       [80,"Продолжаем: ещё 3 раунда вина, включая Black Casino, и 2 раунда мяса","The game continues: 3 more wine rounds including Black Casino, and 2 meat rounds",true],
       [30,"Десерт и итоги игры","Dessert and game results"],
       [60,"Свободное время: общение","Free time: mingling"]]}
];
const DISH_EN_T = {
  "3 вина стандартной категории (@B@ ₽/бут.) вслепую, порция 50 мл":"3 standard-category wines (@B@ ₽/bottle) tasted blind, 50 ml pour",
  "3 отборных мясных отруба стандартной категории с овощами":"3 prime meat cuts of the standard category with vegetables",
  "4 вина авторской категории (@B@ ₽/бут.) вслепую, порция 50 мл":"4 signature-category wines (@B@ ₽/bottle) tasted blind, 50 ml pour",
  "4 отборных мясных отруба авторской категории с овощами":"4 prime meat cuts of the signature category with vegetables",
  "5 вин эксклюзивной категории (@B@ ₽/бут.) вслепую, порция 50 мл, и раунд Black Casino":"5 exclusive-category wines (@B@ ₽/bottle) tasted blind, 50 ml pour, and a Black Casino round",
  "4 отборных мясных отруба эксклюзивной категории с овощами":"4 prime meat cuts of the exclusive category with vegetables",
  "Салат на выбор":"Salad of your choice",
  "Итальянское домашнее мороженое":"Italian homemade ice cream",
  "4 часа":"4 hours", "5 часов":"5 hours"
};

/* Залы: все, кроме ART. Апельсиновый — первым: игра проходит только в нём. */
const HALL_ORDER = ["orange","cafe","granat","olive","tomato"];  /* без ART, PROF и Лимонного (решение 2026-11-12) */
const GAME_HALL = "orange";

/* «Премиальная» тема: графит, бордо и золото, фото стола фоном в шапке */
const THEME = `
  /* ---------- Винно-мясное казино: премиальная тема (tools/build-meatwine.mjs) ---------- */
  :root{ --red:#7E1A2C; --red-deep:#4E0E1A; --maroon:#2A0A10; --maroon-dark:#140608; --gold:#C9A46A; --gold-lite:#E6CFA2;
         --bone:#F3EFE8; --bone-2:#E7E0D5; --card:#FBF9F5; --line:#D9CDBB; }
  header.top{background:linear-gradient(135deg,#1A0A0E 0%,#3A0E18 100%); border-bottom:1px solid rgba(201,164,106,.35)}
  .hero{background:linear-gradient(90deg,rgba(14,5,8,.94) 0%,rgba(14,5,8,.82) 42%,rgba(14,5,8,.35) 100%),
                   url(images/formats/meatwine/hero.jpg) center 62%/cover no-repeat, #140608;
        min-height:clamp(460px,62vh,640px); display:flex; flex-direction:column; justify-content:center}
  .hero .kicker{color:var(--gold) !important}
  .hero h1 span{color:var(--gold-lite) !important}
  .hero .stats::before{background:var(--gold) !important}
  .hero .stat b{color:var(--gold-lite)}
  .sec-head{border-bottom-color:var(--gold)}
  .sec-head .ico{color:var(--red)}
  /* описание формата — продолжение тёмной шапки */
  .mw-intro{background:linear-gradient(180deg,#140608 0%,#1E0A10 100%); color:#EDE6DA; border-top:1px solid rgba(201,164,106,.25); border-bottom:1px solid rgba(201,164,106,.35)}
  .mw-in{max-width:1080px; margin:0 auto; padding:clamp(34px,5vw,64px) clamp(16px,5vw,48px) clamp(26px,3.5vw,40px); display:grid; grid-template-columns:minmax(0,5fr) minmax(0,6fr); gap:clamp(22px,4vw,56px); align-items:start}
  .mw-kick{display:flex; align-items:center; gap:12px; font-family:var(--head); font-weight:800; text-transform:uppercase; letter-spacing:.18em; font-size:12px; color:var(--gold); margin-bottom:14px}
  .mw-kick::before{content:""; width:40px; height:1px; background:var(--gold)}
  .mw-h{margin:0; font-family:"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif; font-weight:500; font-size:clamp(30px,4.2vw,48px); line-height:1.08; color:#fff; letter-spacing:-.005em}
  .mw-h em{display:block; font-style:italic; color:var(--gold-lite)}
  .mw-txt p{margin:0 0 14px; font-size:clamp(15px,1.6vw,17px); line-height:1.65; color:rgba(237,230,218,.86)}
  .mw-txt p:first-child{color:#fff; font-size:clamp(16px,1.8vw,19px)}
  .mw-facts{list-style:none; margin:0 auto; padding:0 clamp(16px,5vw,48px) clamp(30px,4vw,48px); max-width:1080px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0}
  .mw-facts li{display:flex; gap:12px; align-items:flex-start; padding:18px 18px 4px 0; border-top:1px solid rgba(201,164,106,.4)}
  .mw-facts li + li{padding-left:18px; border-left:1px solid rgba(201,164,106,.18)}
  .mw-facts svg{flex:none; width:30px; height:30px; fill:none; stroke:var(--gold); stroke-width:1.3; stroke-linecap:round; stroke-linejoin:round}
  .mw-facts b{display:block; font-family:var(--head); font-weight:800; font-size:15px; color:#fff}
  .mw-facts span{display:block; font-size:13px; line-height:1.4; color:rgba(237,230,218,.65); margin-top:2px}
  @media(max-width:820px){ .mw-in{grid-template-columns:1fr} .mw-facts{grid-template-columns:1fr 1fr; row-gap:6px} .mw-facts li:nth-child(3){padding-left:0; border-left:0} }
  @media(max-width:420px){ .mw-facts{grid-template-columns:1fr} .mw-facts li + li{padding-left:0; border-left:0} }
  /* Апельсиновый зал — главная карточка с фото */
  .ven-card.ven-game{grid-column:1 / -1; position:relative; overflow:hidden; min-height:clamp(240px,30vw,320px); display:flex; flex-direction:column; justify-content:flex-end; gap:6px;
     padding:clamp(20px,3vw,32px); color:#fff; border:1px solid var(--gold);
     background:linear-gradient(90deg,rgba(14,5,8,.92) 0%,rgba(14,5,8,.7) 45%,rgba(14,5,8,.15) 100%), url(images/halls/orange/1.jpg) center 55%/cover no-repeat, #140608}
  .ven-card.ven-game .ven-h{display:block}
  .ven-card.ven-game .ven-h b{display:block; font-family:"Cormorant Garamond","Playfair Display",Georgia,serif; font-weight:500; font-size:clamp(28px,3.6vw,40px); line-height:1.05; color:#fff; text-transform:none; letter-spacing:0}
  .ven-card.ven-game .ven-a{display:inline-block; margin-top:6px; color:var(--gold-lite); font-size:14px}
  .ven-card.ven-game .ven-more{align-self:flex-start; width:auto; color:var(--gold-lite); border-color:var(--gold); background:rgba(14,5,8,.35); margin-top:8px}
  .ven-game-badge{position:absolute; top:clamp(16px,2.4vw,24px); left:clamp(20px,3vw,32px); display:inline-flex; align-items:center; gap:8px; padding:7px 14px; background:var(--gold); color:#1A0A0E; font-family:var(--head); font-weight:900; text-transform:uppercase; letter-spacing:.1em; font-size:11px}
  .ven-game-badge::before{content:""; width:7px; height:7px; border-radius:50%; background:#7E1A2C}
  .ven-game-d{display:block; max-width:460px; font-size:15px; line-height:1.5; color:rgba(255,255,255,.88)}
  .ven-sub{grid-column:1 / -1; display:flex; align-items:center; gap:14px; margin:14px 0 2px; font-family:var(--head); font-weight:800; text-transform:uppercase; letter-spacing:.14em; font-size:12px; color:var(--ink-soft)}
  .ven-sub::after{content:""; flex:1; height:1px; background:var(--line)}
  /* «Программа»: один сет на уровень — широкая карточка под таймингом */
  .mw-set{display:grid; grid-template-columns:minmax(0,4fr) minmax(0,7fr); background:var(--card); border:1px solid var(--line); border-top:3px solid var(--gold); box-shadow:var(--card-shadow)}
  .mw-set-h{padding:clamp(20px,2.6vw,30px); background:linear-gradient(160deg,#1A0A0E 0%,#3A0E18 100%); color:#fff; display:flex; flex-direction:column; gap:10px}
  .mw-set-k{font-family:var(--head); font-weight:800; text-transform:uppercase; letter-spacing:.14em; font-size:11px; color:var(--gold)}
  .mw-set-h h3{margin:0; font-family:"Cormorant Garamond","Playfair Display",Georgia,serif; font-weight:500; font-size:clamp(26px,3vw,36px); line-height:1.1; text-transform:none; letter-spacing:0; color:#fff}
  .mw-set-t{margin-top:auto; font-size:13px; color:var(--gold-lite)}
  .mw-set-l{list-style:none; counter-reset:mw; margin:0; padding:clamp(14px,2vw,22px) clamp(18px,2.6vw,30px); display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:0 26px; align-content:center}
  .mw-set-l li{counter-increment:mw; display:flex; gap:14px; align-items:baseline; padding:12px 0; border-bottom:1px solid var(--line); font-size:15px; line-height:1.5; color:var(--ink)}
  .mw-set-l li::before{content:counter(mw,decimal-leading-zero); flex:none; font-family:"Cormorant Garamond",Georgia,serif; font-style:italic; font-size:22px; line-height:1; color:var(--gold)}
  @media(max-width:760px){ .mw-set{grid-template-columns:1fr} }
  .lvl-cnt{color:var(--red-deep)}
`;

/* Убрать элемент массива, начинающийся с `head`, вместе с разделяющей запятой. */
function removeItem(src, head){
  const a = src.indexOf(head);
  must(a>0, "нет элемента "+head);
  const b = matchBrace(src, a);
  const after = src.slice(b+1).match(/^\s*,\s*/);
  return src.slice(0,a) + src.slice(b+1+(after?after[0].length:0));
}

function build(seasonKey){
  const S = SEASON[seasonKey];
  /* Цена бутылки — как в «Винном казино» Новикова (Классика / Авторский / Эксклюзив) этого сезона */
  const sub = (x,i) => JSON.parse(JSON.stringify(x).replace(/@B@/g, S.bottles[i]));
  const LEVELS = LEVELS_T.map((l,i)=>sub(l,i));
  const DISH_EN = Object.fromEntries(Object.entries(DISH_EN_T).map(([k,v])=>{
    const i = /^3 /.test(k) ? 0 : /^4 вина/.test(k) ? 1 : /^5 /.test(k) ? 2 : -1;
    return i<0 ? [k,v] : [sub(k,i), sub(v,i)];
  }));
  let src = read(S.src);

  src = src.replace(/<title>[^<]*<\/title>/, `<title>${S.title}</title>`);
  src = src.replace(/(<!DOCTYPE html>\n?)/i, `$1<!-- СОБРАНО tools/build-meatwine.mjs из ${S.src} — руками не править -->\n`);
  src = src.replace(/<h1 data-i18n="h1">[\s\S]*?<\/h1>/, `<h1 data-i18n="h1">${S.h1.ru}</h1>`);
  src = src.replace(/<p class="lead" data-i18n="lead">[\s\S]*?<\/p>/, `<p class="lead" data-i18n="lead">${S.lead.ru}</p>`);
  src = src.replace(/^  h1:\{ru:.*$/m, `  h1:{ru:'${S.h1.ru}', en:'${S.h1.en}'},`);
  src = src.replace(/^  lead:\{ru:[^\n]*\n[^\n]*\},$/m, `  lead:${L(S.lead)},`);

  // тема — в конец последнего <style> перед </head>
  {
    const head = src.indexOf("</head>"), at = src.lastIndexOf("</style>", head);
    must(at>0, "нет </style>");
    src = src.slice(0,at) + THEME + src.slice(at);
  }

  // описание формата сразу под шапкой
  {
    const facts = INTRO.facts.map((f,i)=>`<li><svg viewBox="0 0 24 24" aria-hidden="true">${FACT_IC[f.ic]}</svg><div><b data-i18n="mwF${i}b">${f.b.ru}</b><span data-i18n="mwF${i}s">${f.s.ru}</span></div></li>`).join("");
    const intro = `<section class="mw-intro" data-mw-intro><div class="mw-in"><div><div class="mw-kick" data-i18n="mwKick">${INTRO.kick.ru}</div><h2 class="mw-h" data-i18n="mwH">${INTRO.h.ru}</h2></div><div class="mw-txt"><p data-i18n="mwP1">${INTRO.p1.ru}</p><p data-i18n="mwP2">${INTRO.p2.ru}</p></div></div><ul class="mw-facts">${facts}</ul></section>\n`;
    const m = src.match(/<div class="hero">/);
    must(m, "нет .hero");
    const a = m.index, b = (()=>{ // конец div.hero
      let depth=0, re=/<\/?div\b[^>]*>/g; re.lastIndex=a; let t;
      while((t=re.exec(src))){ depth += t[0][1]==="/" ? -1 : 1; if(depth===0) return re.lastIndex; }
      throw new Error("hero не закрыт");
    })();
    src = src.slice(0,b) + "\n" + intro + src.slice(b);
    src = src.replace(/^  lead:\{ru:/m, `  mwKick:${L(INTRO.kick)}, mwH:${L(INTRO.h)}, mwP1:${L(INTRO.p1)}, mwP2:${L(INTRO.p2)},\n  ${INTRO.facts.map((f,i)=>`mwF${i}b:${L(f.b)}, mwF${i}s:${L(f.s)}`).join(", ")},\n  lead:{ru:`);
  }

  // сеты-«программы» уровней в общий справочник
  const setsText = LEVELS.map(l=>`  ${l.set.id}: {ru:${q(l.set.ru)}, en:${q(l.set.en)}, c:[], d:${q(l.set.d)}}`).join(",\n");
  src = src.replace(/(const SETS = \{[\s\S]*?)\n\};/, (m, body) => `${body},\n  /* винно-мясное казино — tools/build-meatwine.mjs */\n${setsText}\n};`);

  // переводы
  src = replaceOnce(src, "const TR={", "const TR={\n" + Object.entries(DISH_EN).map(([k,v])=>`${q(k)}:${q(v)},`).join("\n"), "TR");

  // DATA: вместимость не показываем
  src = replaceOnce(src, "const DATA = {\n", "const DATA = {\n  hideCap:true, /* винно-мясное казино: вместимость не пишем */\n", "DATA head");
  src = src.replace(/  hideCap:true, \/\* НГ:[^\n]*\n/, "");

  // статистика
  {
    const a = src.indexOf("stats:["), b = matchBrace(src, a+6);
    const old = src.slice(a, b+1);
    const svc = +old.match(/\{n:"(\d+)", ru:"доп\. услуг"/)[1] - 2;
    src = src.slice(0,a) + `stats:[
    {n:"3",  ru:"уровня игры", en:"game levels"},
    {n:"5",  ru:"вин в Эксклюзивном", en:"wines in Exclusive"},
    {n:"4",  ru:"мясных отруба", en:"meat cuts"},
    {n:"100+", ru:"позиций в барной карте", en:"drinks on the bar card"},
    {n:"${svc}", ru:"доп. услуг", en:"add-on services"}
  ]` + src.slice(b+1);
  }

  // форматы
  {
    const [a,b] = sectionRange(src, "formats");
    const old = src.slice(a,b+1);
    const sub = old.match(/sub:(\{ru:[^\n]*\})/)[1];
    const items = LEVELS.map((l,i)=>`          {n:${L(l.n)},
            d:{ru:${q(`${l.game.ru} · фуршет «${l.buffet}» (${l.bru}) · итальянское домашнее мороженое · вода, чай и кофе · ${l.hours.ru}.`)},
               en:${q(`${l.game.en} · «${l.buffet}» buffet (${l.ben}) · Italian homemade ice cream · water, tea and coffee · ${l.hours.en}.`)}}, p:"${S.prices[i]}",
            game:${L(l.game)}}`).join(",\n");
    src = replaceSection(src, "formats", `{
      id:"formats", icon:"💼", type:"formats",
      title:{ru:"Форматы и цены", en:"Formats & Pricing"},
      sub:${sub},
      note:{ru:"Цены за гостя", en:"Prices per guest"},
      intro:{ru:"Игра проходит в Апельсиновом зале. Стандартный и Авторский — 4 часа, Эксклюзивный — 5 часов, с приветствием гостей и фуршетом.",
             en:"The game is played in the Orange hall. Standard and Author’s run 4 hours, Exclusive 5 hours, including the guest welcome and the buffet."},
      groups:[
        {head:{ru:"Винно-мясное казино — 3 уровня", en:"Meat & Wine Casino — 3 levels"}, items:[
${items}
        ]}
      ],
      foot:{ru:"Казино не является азартной игрой: участники не делают денежных ставок. 18+. Чрезмерное употребление алкоголя вредит вашему здоровью.",
            en:"The casino is not gambling: no money is staked. 18+. Excessive drinking is harmful to your health."}
    }`);
  }

  // залы: все, кроме ART, Апельсиновый — первый и с пометкой
  {
    const [a,b] = sectionRange(src, "venues");
    const old = src.slice(a,b+1);
    const note = old.match(/note:(\{ru:[^\n]*\})/)[1];
    const ext = "ext:" + JSON.stringify(eval(old.match(/ext:(\[[^\n]*\])/)[1].replace(/(\w+):/g,'"$1":'))
      .map(e=>({...e, s:e.s.filter(k=>HALL_ORDER.includes(k))})).filter(e=>e.s.length)).replace(/"(\w+)":/g,"$1:");
    const incl = old.slice(old.indexOf("incl:{"), matchBrace(old, old.indexOf("incl:{")+5)+1);
    const halls = HALL_ORDER.map(slug=>{
      const at = old.indexOf(`{slug:"${slug}"`);
      must(at>0, "нет зала "+slug);
      let h = old.slice(at, matchBrace(old, at)+1);
      if(slug===GAME_HALL) h = h.replace(/^\{slug:"orange",/, `{slug:"orange", game:true,`).replace(/n:\{ru:"Апельсиновый \(бизнес\)", en:"Orange \(business\)"\}/, `n:{ru:"Апельсиновый зал", en:"Orange hall"}`);
      return "        " + h;
    }).join(",\n");
    src = replaceSection(src, "venues", `{
      id:"venues", icon:"🏛️", type:"venues",
      ${ext},
      title:{ru:"Залы", en:"Venues"},
      sub:{ru:"Игра проходит в Апельсиновом зале", en:"The game is played in the Orange hall"},
      note:${note},
      halls:[
${halls}
      ],
      combos:{ru:"", en:""},
      ${incl}
    }`);
  }

  // программа уровней (вместо «Кулинарной части»)
  {
    const levels = LEVELS.map((l,i)=>`           {k:"${l.k}", n:${L(l.n)}, price:"${S.prices[i]}", buffet:"${l.buffet}", bwt:"${l.bwt}", hours:${L(l.hours)},
            ids:${q([l.set.id])},
            tl:[
${l.tl.map(([m,ru,en,hi])=>`              {m:${m}, ru:${q(ru)}, en:${q(en)}${hi?", hi:true":""}}`).join(",\n")}
            ]}`).join(",\n");
    src = replaceSection(src, "sets", `{
      id:"sets", type:"sets",
      title:{ru:"Программа", en:"Programme"},
      sub:{ru:"Три уровня игры · вино и мясо вслепую", en:"Three game levels · wine and meat tasted blind"},
      note:{ru:"Фуршет и десерт включены в стоимость", en:"Buffet and dessert included"},
      intro:{ru:"Выберите уровень — от него зависят вина и мясные отрубы в игре, включённый фуршет, длительность и цена за гостя.",
             en:"Choose the level — it defines the wines and meat cuts in the game, the included buffet, the duration and the price per guest."},
      tabs:[
        {k:"meatwine", ic:"🥩",
         n:${L(NAME)},
         short:{ru:"Вино и мясо вслепую", en:"Wine and meat tasted blind"},
         d:{ru:"Сомелье ведёт игру и наливает вино вслепую, шеф готовит и подаёт мясные отрубы — гости угадывают и делают ставки фишками. Игра проходит в Апельсиновом зале.",
            en:"The sommelier runs the game and pours the wine blind, the chef cooks and serves the meat cuts — guests guess and place chip bets. The game is played in the Orange hall."},
         levels:[
${levels}
         ]}
      ]
    }`);
  }

  // фуршет: без детских блюд в стол и детского фуршета
  {
    let [a,b] = sectionRange(src, "buffet");
    let sec = src.slice(a,b+1);
    for(const key of ["kids:{","groups:["]){
      const i = sec.indexOf("\n      "+key);
      if(i<0) continue;
      const j = matchBrace(sec, i+7+key.length-1);
      const after = sec.slice(j+1).match(/^,?/)[0];
      sec = sec.slice(0,i) + sec.slice(j+1+after.length);
    }
    sec = sec.replace(/,(\s*)\}$/, "$1}");
    must(!/Kid Set|Детские блюда/.test(sec), "детское осталось в фуршете");
    src = src.slice(0,a) + sec + src.slice(b+1);
  }

  // доп. услуги: без казино
  src = removeItem(src, `{ic:"🍷", name:{ru:"Винное казино"`);
  src = removeItem(src, `{ic:"🎰", name:{ru:"Дегустационные казино"`);

  // Free-Flow: как у казино — FF1–FF3 на 1 000 ₽ дешевле
  for(const code of ["FF1","FF2","FF3"]){
    const re = new RegExp(`(\\{code:"${code}", name:\\{[^}]*\\}, price:")([^"]+)(")`);
    must(re.test(src), "нет пакета "+code);
    src = src.replace(re, (m,a,p,c)=>a + rub(parseRub(p)-FF_DISCOUNT) + c);
  }

  // рендер: одна вкладка; тайминг у каждого уровня; на карточке уровня — длительность
  src = replaceOnce(src,
    "    const grid = ids => `<div class=\"grid sets\">`+ ids.map(id=>setCard(SETS[id])).join(\"\") + `</div>`;\n",
    "    const grid = ids => `<div class=\"grid sets\">`+ ids.map(id=>setCard(SETS[id])).join(\"\") + `</div>`;\n"
    + "    const mwCard = (it,l) => `<div class=\"mw-set\"><div class=\"mw-set-h\"><span class=\"mw-set-k\">${LANG===\"ru\"?\"В программе уровня\":\"Included at this level\"} · ${l.n[LANG]}</span><h3>${it[LANG]}</h3><span class=\"mw-set-t\">⏱ ${l.hours[LANG]}</span></div><ol class=\"mw-set-l\">${it.d.map(d=>`<li>${T(d)}</li>`).join(\"\")}</ol></div>`;\n",
    "mwCard");
  src = replaceOnce(src,
    "body = (s.intro?`<p class=\"sec-intro\">${s.intro[LANG]}</p>`:\"\") + tabBar + panels;",
    "body = (s.intro?`<p class=\"sec-intro\">${s.intro[LANG]}</p>`:\"\") + (s.tabs.length>1?tabBar:\"\") + panels;",
    "tabBar");
  src = replaceOnce(src,
    "const cc = it.d.length===3 ? c : [];",
    "const cc = it.c ? it.c.map(k=>c[k]) : it.d.length===3 ? c : [];",
    "setCard");
  src = replaceOnce(src,
    '<span class="lvl-cnt">${nSets(l.ids.length)}</span>',
    '<span class="lvl-cnt">${l.hours ? `⏱ ${l.hours[LANG]}` : nSets(l.ids.length)}</span>',
    "lvl-cnt");
  src = replaceOnce(src,
    '${(l.prem&&s.premNote)?`<div class="lvl-prem">${s.premNote[LANG]}</div>`:""}${grid(l.ids)}</div>',
    '${(l.prem&&s.premNote)?`<div class="lvl-prem">${s.premNote[LANG]}</div>`:""}${l.tl?`<div class="mc-top">${mcTimeline(l.tl)}</div>`:""}${l.ids.length===1?mwCard(SETS[l.ids[0]], l):grid(l.ids)}</div>',
    "level timeline");
  // зал игры: выделенная карточка
  src = replaceOnce(src,
    '<div class="ven-card ven-clickable" data-hall="${h.slug}" role="button" tabindex="0">',
    '<div class="ven-card ven-clickable${h.game?" ven-game":""}" data-hall="${h.slug}" role="button" tabindex="0">',
    "ven-card");
  src = replaceOnce(src,
    '        ${DATA.hideCap ? "" : `<span class="ven-c">${h.cap[LANG]}</span>`}\n',
    '        ${DATA.hideCap ? "" : `<span class="ven-c">${h.cap[LANG]}</span>`}\n        ${h.game ? `<span class="ven-game-badge">${LANG==="ru"?"Здесь проходит игра":"The game is played here"}</span><span class="ven-game-d">${LANG==="ru"?"Винно-мясное казино проводим только в Апельсиновом зале: здесь накрываем игровой стол для гостей, шефа и сомелье.":"We host the meat & wine casino in the Orange hall only: this is where the game table for guests, the chef and the sommelier is set."}</span>` : ""}\n',
    "ven-game badge");
  src = replaceOnce(src,
    '      </div>\n    `).join("")+`</div>\n    <div class="ven-hint">',
    '      </div>${h.game?`<div class="ven-sub">${LANG==="ru"?"Другие площадки для брони":"Other spaces available to book"}</div>`:""}\n    `).join("")+`</div>\n    <div class="ven-hint">',
    "ven-sub");

  const data = src.slice(src.indexOf("const DATA"), src.indexOf("const TR"));
  for(const bad of ["Демо-ужин","Индивидуальный мастер-класс (максимум","Дегустационные казино",'slug:"art"','Официант'])
    must(!data.slice(data.indexOf('id:"formats"'), data.indexOf('id:"venues"')).includes(bad) || bad==='slug:"art"', `осталось «${bad}» в форматах`);
  must(!data.slice(data.indexOf('id:"venues"'), data.indexOf('id:"sets"')).includes('slug:"art"'), "ART остался в залах");

  fs.writeFileSync(path.join(ROOT, S.out), src);
  console.log("→", S.out);
}

for(const s of Object.keys(SEASON)) build(s);
