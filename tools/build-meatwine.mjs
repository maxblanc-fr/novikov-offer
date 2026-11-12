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
  ru:"Винно-мясное казино — гастрономическая игра для тех, кто ценит хорошее мясо и вино. Гости вслепую дегустируют вино и мясные деликатесы и делают ставки фишками. Весь вечер рядом шеф и сомелье: расскажут, какое мясо прощает ошибки, какие маринады уместны к тому или иному блюду и какое вино станет лучшей парой. Игра проходит в Апельсиновом зале. Стандартный и Авторский уровни длятся 4 часа, Эксклюзивный — 5 часов, с приветствием гостей и фуршетом.",
  en:"The meat & wine casino is a gastronomic game for those who love good meat and wine. Guests taste wine and meat delicacies blind and place chip bets. The chef and the sommelier stay with you all evening: they explain which meat forgives mistakes, which marinades suit which dish and which wine makes the perfect pairing. The game is played in the Orange hall. The Standard and Author’s levels run 4 hours, the Exclusive level 5 hours, including the guest welcome and the buffet."
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
const HALL_ORDER = ["orange","cafe","prof","granat","olive","lemon","tomato"];
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
  .mw-intro{max-width:880px; margin:0 auto; padding:clamp(28px,4vw,44px) clamp(16px,5vw,48px) 0; font-size:clamp(16px,1.9vw,19px); line-height:1.6; color:var(--ink-soft)}
  .mw-intro b{color:var(--red-deep)}
  .mw-intro .mw-sign{display:block; width:64px; height:3px; background:var(--gold); margin-bottom:16px}
  .ven-card.ven-game{grid-column:1 / -1; background:linear-gradient(135deg,#1A0A0E 0%,#3A0E18 100%); color:#fff; border:1px solid var(--gold); padding:20px 22px}
  .ven-card.ven-game .ven-h b{color:var(--gold-lite); font-size:20px}
  .ven-card.ven-game .ven-a,.ven-card.ven-game .ven-more{color:var(--gold-lite)}
  .ven-game-badge{display:inline-block; margin-top:10px; padding:6px 12px; background:var(--gold); color:#1A0A0E; font-family:var(--head); font-weight:900; text-transform:uppercase; letter-spacing:.06em; font-size:12px}
  .ven-game-d{display:block; margin-top:8px; font-size:14px; color:rgba(255,255,255,.85)}
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
    const intro = `<div class="mw-intro" data-mw-intro><span class="mw-sign"></span><p data-i18n="mwIntro">${INTRO.ru}</p></div>\n`;
    const m = src.match(/<div class="hero">/);
    must(m, "нет .hero");
    const a = m.index, b = (()=>{ // конец div.hero
      let depth=0, re=/<\/?div\b[^>]*>/g; re.lastIndex=a; let t;
      while((t=re.exec(src))){ depth += t[0][1]==="/" ? -1 : 1; if(depth===0) return re.lastIndex; }
      throw new Error("hero не закрыт");
    })();
    src = src.slice(0,b) + "\n" + intro + src.slice(b);
    src = src.replace(/^  lead:\{ru:/m, `  mwIntro:${L(INTRO)},\n  lead:{ru:`);
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
    const ext = old.match(/ext:\[[^\n]*\]/)[0];
    const incl = old.slice(old.indexOf("incl:{"), matchBrace(old, old.indexOf("incl:{")+5)+1);
    const halls = HALL_ORDER.map(slug=>{
      const at = old.indexOf(`{slug:"${slug}"`);
      must(at>0, "нет зала "+slug);
      let h = old.slice(at, matchBrace(old, at)+1);
      if(slug===GAME_HALL) h = h.replace(/^\{slug:"orange",/, `{slug:"orange", game:true,`);
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
    '${(l.prem&&s.premNote)?`<div class="lvl-prem">${s.premNote[LANG]}</div>`:""}${l.tl?`<div class="mc-top">${mcTimeline(l.tl)}</div>`:""}${grid(l.ids)}</div>',
    "level timeline");
  // зал игры: выделенная карточка
  src = replaceOnce(src,
    '<div class="ven-card ven-clickable" data-hall="${h.slug}" role="button" tabindex="0">',
    '<div class="ven-card ven-clickable${h.game?" ven-game":""}" data-hall="${h.slug}" role="button" tabindex="0">',
    "ven-card");
  src = replaceOnce(src,
    '        ${DATA.hideCap ? "" : `<span class="ven-c">${h.cap[LANG]}</span>`}\n',
    '        ${DATA.hideCap ? "" : `<span class="ven-c">${h.cap[LANG]}</span>`}\n        ${h.game ? `<span class="ven-game-badge">${LANG==="ru"?"Здесь проходит игра":"The game is played here"}</span><span class="ven-game-d">${LANG==="ru"?"Винно-мясное казино проводим только в Апельсиновом зале.":"We host the meat & wine casino in the Orange hall only."}</span>` : ""}\n',
    "ven-game badge");

  const data = src.slice(src.indexOf("const DATA"), src.indexOf("const TR"));
  for(const bad of ["Демо-ужин","Индивидуальный мастер-класс (максимум","Дегустационные казино",'slug:"art"','Официант'])
    must(!data.slice(data.indexOf('id:"formats"'), data.indexOf('id:"venues"')).includes(bad) || bad==='slug:"art"', `осталось «${bad}» в форматах`);
  must(!data.slice(data.indexOf('id:"venues"'), data.indexOf('id:"sets"')).includes('slug:"art"'), "ART остался в залах");

  fs.writeFileSync(path.join(ROOT, S.out), src);
  console.log("→", S.out);
}

for(const s of Object.keys(SEASON)) build(s);
