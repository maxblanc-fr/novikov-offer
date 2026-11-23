#!/usr/bin/env node
/* Собирает 4 лендинга из взрослого и новогоднего (так же, как build-casino.mjs):
 *
 *   NovikovOffer.html    → NovikovArt.html,        NovikovCocktailBattle.html
 *   NovikovNewYear.html  → NovikovNewYearArt.html, NovikovNewYearCocktailBattle.html
 *
 * Источник пакетов — EventyOn (2026-11-08):
 *   арт:    business.eventyon.ru/painton_basic_offer_b2b, /fluid-party,
 *           НГ — /painton-newyear-b2b, /fluid-art-newyear-b2b, /christmas-wreath-newyear-b2b
 *   баттл:  /cocktail-battle, НГ — /cocktail-battle-newyear-b2b
 * У EventyOn арт, флюид, баттл и винное казино стоят одинаково (10 400 / 11 400 / 12 400,
 * НГ тоже совпадает), поэтому цены — как у казино Новикова (SEASON из build-casino.mjs).
 * Сеты — те же, что у казино (2 / 2 / 3 блюда, как в пакетах EventyOn).
 * Free-Flow: баттл — как казино (FF1–FF3 −1 000 ₽), арт — как кулинарный (без изменений).
 * Доп. услуги не трогаем. Залы и вместимость — «Вместимость Новиков РОП (2).xlsx».
 *
 * + коктейльная вечеринка (2026-11-23): NovikovCocktailParty.html, NovikovNewYearCocktailParty.html.
 * + рождественский венок, только НГ (2026-11-23): NovikovNewYearWreath.html.
 *
 * Готовые страницы руками не править:  node tools/build-art-battle.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { addHeroPics } from "./hero-pics.mjs";
import { fileURLToPath } from "node:url";
import { CASINO_SETS, LEVEL_IDS, LEVELS, SEASON, matchBrace, must, replaceOnce,
         sectionRange, replaceSection, rub, parseRub } from "./build-casino.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const q = s => JSON.stringify(s);
const L = o => `{ru:${q(o.ru)}, en:${q(o.en)}}`;

const NOSEAT = {ru:"без посадки на время игры", en:"no seating during the game"};

/* ---------- таймлайны (4 часа, как у всех форматов Новикова) ---------- */
const TL_PAINT = [
  [30, "Сбор гостей, фуршет и приветственные напитки", "Guest welcome, buffet and welcome drinks"],
  [60, "Знакомство с художником и начинаем картину", "Meet the artist and start the painting", true],
  [30, "Первое блюдо от шефа", "First course from the chef"],
  [50, "Продолжаем и заканчиваем картину", "Continue and finish the painting", true],
  [20, "Картины сохнут — второе блюдо", "The paintings dry — second course"],
  [50, "Свободное время: общение, игры и активности", "Free time: mingling, games and activities"]
];
const TL_FLUID = [
  [30, "Сбор гостей, фуршет и приветственные напитки", "Guest welcome, buffet and welcome drinks"],
  [90, "Флюид-арт: смешиваем краски и создаём картину", "Fluid art: mixing the paints and pouring the canvas", true],
  [30, "Первое блюдо от шефа", "First course from the chef"],
  [40, "Командная игра: «Угадай мелодию» или квиз", "Team game: «Name That Tune» or a quiz", true],
  [20, "Второе блюдо", "Second course"],
  [30, "Свободное время: общение и фото с картинами", "Free time: mingling and photos with the paintings"]
];
const TL_WREATH = [
  [30, "Сбор гостей, фуршет и приветственные напитки", "Guest welcome, buffet and welcome drinks"],
  [60, "Создаём основу композиции из живой ели", "Building the base from fresh fir", true],
  [30, "Первое блюдо от шефа", "First course from the chef"],
  [50, "Украшаем венок: шишки, бубенцы, сухоцветы, гирлянды", "Decorating the wreath: cones, bells, dried flowers, garlands", true],
  [30, "Второе блюдо", "Second course"],
  [40, "Свободное время: общение, игры и активности", "Free time: mingling, games and activities"]
];
const TL_BATTLE = [
  [30, "Сбор гостей, фуршет и приветственные напитки", "Guest welcome, buffet and welcome drinks"],
  [10, "Открытие: делимся на команды и придумываем названия", "Opening: split into teams and pick team names"],
  [40, "Первый раунд: классический коктейль вместе с бартендером", "Round one: a classic cocktail with the bartender", true],
  [20, "Первое блюдо от шефа", "First course from the chef"],
  [60, "Второй раунд: команда придумывает и готовит авторский коктейль", "Round two: each team invents and mixes its own signature cocktail", true],
  [20, "Второе блюдо", "Second course"],
  [30, "Дегустация, оценки и победитель баттла", "Tasting, scoring and the battle winner"],
  [30, "Свободное время: общение, игры и активности", "Free time: mingling, games and activities"]
];

const TL_PARTY = [
  [30, "Сбор гостей, фуршет и приветственные напитки", "Guest welcome, buffet and welcome drinks"],
  [40, "Знакомство с бартендером и первый коктейль", "Meet the bartender and mix cocktail one", true],
  [25, "Первое блюдо от шефа", "First course from the chef"],
  [30, "Второй коктейль", "Cocktail two", true],
  [25, "Второе блюдо", "Second course"],
  [30, "Третий коктейль — с авторской подачей", "Cocktail three — with your own twist", true],
  [60, "Вечеринка продолжается: общение, музыка, игры и активности", "The party goes on: mingling, music, games and activities"]
];

const TAB_PAINT ={k:"paint", ic:"🎨", n:{ru:"Живопись PaintOn", en:"PaintOn painting"},
  short:{ru:"Своя картина или общая", en:"Your own canvas or a shared one"},
  d:{ru:"Художник ведёт мастер-класс. Индивидуально: картина акрилом, вином, кофе или 3D-картина. Командой: большая картина (команды по 4 человека) или картина-мозаика из фрагментов (от 12 гостей). Шеф тем временем готовит блюда сета.",
     en:"An artist leads the class. Individually: an acrylic, wine, coffee or 3D painting. As a team: a large canvas (teams of 4) or a mosaic painting made of fragments (from 12 guests). Meanwhile the chef cooks the set."},
  tl:TL_PAINT};
const TAB_FLUID = {k:"fluid", ic:"🌊", n:{ru:"Флюид-арт", en:"Fluid art"},
  short:{ru:"Абстракция жидким акрилом", en:"Abstract poured acrylic"},
  d:{ru:"Под руководством художника каждый смешивает акриловые краски в любимых оттенках, разливает их по холсту 40 × 40 см и получает абстрактную картину, которая не повторится. В программу входит командная игра: «Угадай мелодию» или квиз.",
     en:"Guided by the artist, everyone mixes acrylics in their favourite shades, pours them over a 40 × 40 cm canvas and gets a one-of-a-kind abstract painting. A team game is included: «Name That Tune» or a quiz."},
  tl:TL_FLUID};
const TAB_WREATH = {k:"wreath", ic:"🎄", n:{ru:"Рождественский венок", en:"Christmas wreath"},
  short:{ru:"Композиция из живой ели", en:"A fresh-fir arrangement"},
  d:{ru:"Декоратор помогает собрать новогодний венок или букет из свежих еловых веток и украсить его шишками, бубенцами, сухоцветами и гирляндами — под музыку и с бокалом в руке.",
     en:"A decorator helps each guest make a New Year wreath or bouquet from fresh fir branches and dress it with cones, bells, dried flowers and garlands — with music and a glass in hand."},
  tl:TL_WREATH};
const TAB_BATTLE = {k:"battle", ic:"🍹", n:{ru:"Коктейльный баттл", en:"Cocktail Battle"},
  short:{ru:"2 раунда, команды против команд", en:"2 rounds, team vs team"},
  d:{ru:"Бартендер ведёт игру, а шеф тем временем готовит блюда выбранного сета — их подают в перерывах между раундами.",
     en:"The bartender runs the game while the chef cooks the chosen set — the courses are served between rounds."},
  tl:TL_BATTLE};
/* Меню коктейлей — новиковское (COCKTAILS со взрослого/НГ лендинга, 30 позиций), кнопка открывает его окно. */
/* Кнопку дорисовывает сама страница (tab.ck), в данных — чистый текст: его читает генератор КП. */
const CK_BTN_JS = '${t.ck?`<br><button type="button" class="svc-clickable mc-ck-btn" data-modal="cocktails">${LANG==="ru"?"Смотреть меню коктейлей →":"View the cocktail menu →"}</button>`:""}';
const TAB_PARTY = {k:"party", ic:"🍸", n:{ru:"Коктейльная вечеринка", en:"Cocktail Party"},
  short:{ru:"3 коктейля своими руками", en:"3 cocktails you mix yourself"},
  d:{ru:"Бартендер показывает технику и барный инвентарь, а гости сами готовят 3 коктейля — вы выбираете их из 30 позиций нашего меню, от классики до тропических. Без соревнования: просто весело, вкусно и с бокалом в руке. Шеф тем временем готовит блюда выбранного сета, их подают между коктейлями.",
     en:"The bartender shows the techniques and bar tools, and the guests mix 3 cocktails themselves — you pick them from the 30 drinks on our menu, from classics to tropical. No competition: just fun, tasty and glass in hand. Meanwhile the chef cooks the chosen set, served between the cocktails."},
  tl:TL_PARTY, ck:true};

/* ---------- залы ----------
   Арт — строки PaintOn / Fluid Art (одинаковые) и «Рождественские венки» (Гранатовый 12).
   Баттл — строка «Коктейльный баттл». Лимонный и Prof — «-» в обоих, не показываем.
   Посадка под блюда в Томатном/Апельсиновом — 24 (блок «Посадка под блюда в стол»). */
const ART_CAP = ny => ({
  cafe:   {ru:"до 34 гостей", en:"up to 34 guests"},
  olive:  {ru:"до 16 гостей", en:"up to 16 guests"},
  granat: ny ? {ru:"до 10 гостей · венки — до 12", en:"up to 10 guests · wreaths — up to 12"}
             : {ru:"до 10 гостей", en:"up to 10 guests"},
  art:    {ru:"Керамика — 8 · Флористика — 12 · Живопись — 8 гостей", en:"Ceramics — 8 · Floristry — 12 · Painting — 8 guests"},
  tomato: {ru:"до 32 гостей · блюда в стол — до 24", en:"up to 32 guests · seated dining — up to 24"},
  orange: {ru:"до 40 гостей · блюда в стол — до 24", en:"up to 40 guests · seated dining — up to 24"}
});
const BATTLE_CAP = () => ({
  cafe:   {ru:"до 40 гостей", en:"up to 40 guests"},
  olive:  {ru:"до 20 гостей", en:"up to 20 guests"},
  granat: {ru:"до 20 гостей", en:"up to 20 guests"},
  art:    {ru:`до 20 гостей в каждом зале · ${NOSEAT.ru}`, en:`up to 20 guests per hall · ${NOSEAT.en}`},
  tomato: {ru:`до 50 гостей · ${NOSEAT.ru}`, en:`up to 50 guests · ${NOSEAT.en}`},
  orange: {ru:`до 50 гостей · ${NOSEAT.ru}`, en:`up to 50 guests · ${NOSEAT.en}`}
});
/* Вечеринка — строка «Коктейльная вечеринка», совпадает с баттлом. */
const NOSEAT_MC = {ru:"без посадки на время мастер-класса", en:"no seating during the masterclass"};
const PARTY_CAP = () => ({
  cafe:   {ru:"до 40 гостей", en:"up to 40 guests"},
  olive:  {ru:"до 20 гостей", en:"up to 20 guests"},
  granat: {ru:"до 20 гостей", en:"up to 20 guests"},
  art:    {ru:`до 20 гостей в каждом зале · ${NOSEAT_MC.ru}`, en:`up to 20 guests per hall · ${NOSEAT_MC.en}`},
  tomato: {ru:`до 50 гостей · ${NOSEAT_MC.ru}`, en:`up to 50 guests · ${NOSEAT_MC.en}`},
  orange: {ru:`до 50 гостей · ${NOSEAT_MC.ru}`, en:`up to 50 guests · ${NOSEAT_MC.en}`}
});
const HALL_ORDER =["cafe","olive","granat","art","tomato","orange"];

/* ---------- форматы ---------- */
const DISH = [
  {ru:"2 блюда из сета: салат и десерт", en:"2 courses from the set: salad and dessert"},
  {ru:"2 блюда из сета: горячее и десерт", en:"2 courses from the set: main and dessert"},
  {ru:"3 блюда из сета: салат, горячее и десерт", en:"3 courses from the set: salad, main and dessert"}
];
const KIND = {
  art: {
    out:{adult:"NovikovArt.html", ny:"NovikovNewYearArt.html"},
    ff:0,
    name:{ru:"Арт-вечеринка", en:"Art Party"},
    titleTag:{adult:"Novikov School — Арт-вечеринка 2026 / Art Party 2026",
              ny:"Novikov School — Арт-вечеринка · Новый год 2027 / New Year Art Party 2027"},
    h1:{adult:{ru:'Арт-вечеринка <span>Novikov School</span>', en:'<span>Novikov School</span> Art Party'},
        ny:{ru:'Новогодняя арт-вечеринка в <span>Novikov School</span>', en:'New Year Art Party at <span>Novikov School</span>'}},
    lead:{adult:{ru:"Живопись или флюид-арт с художником, готовые сеты от шефа, фуршет и барная карта — творческий корпоратив, праздник или частное событие.",
                 en:"Painting or fluid art with an artist, ready-made chef’s sets, a buffet and a full bar card — a creative corporate event, celebration or private occasion."},
          ny:{ru:"Новогодний корпоратив в центре Москвы: живопись, флюид-арт или рождественский венок, готовые сеты от шефа, фуршет и барная карта — праздник под ключ.",
              en:"A New Year party in central Moscow: painting, fluid art or a Christmas wreath, ready-made chef’s sets, a buffet and a full bar card — the whole celebration, turnkey."}},
    intro:{adult:{ru:"Творческая вечеринка с профессиональным художником: гости пишут картину — каждый свою или вместе одну большую — или создают абстракцию в технике флюид-арт. Холст и материалы включены. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
                  en:"A creative party with a professional artist: guests paint — each their own canvas or one big one together — or create an abstract in the fluid-art technique. Canvas and materials are included. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."},
           ny:{ru:"Праздничная творческая вечеринка: гости пишут новогоднюю картину с художником, создают абстракцию в технике флюид-арт или собирают рождественский венок из живой ели с декоратором. Материалы включены. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
               en:"A festive creative party: guests paint a New Year picture with an artist, pour a fluid-art abstract or make a Christmas wreath from fresh fir with a decorator. Materials are included. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."}},
    game:{adult:{ru:"Арт-вечеринка на выбор: живопись PaintOn или флюид-арт с командной игрой", en:"Art party of your choice: PaintOn painting or fluid art with a team game"},
          ny:{ru:"Арт-вечеринка на выбор: живопись PaintOn, флюид-арт с командной игрой или рождественский венок", en:"Art party of your choice: PaintOn painting, fluid art with a team game or a Christmas wreath"}},
    tabs:{adult:[TAB_PAINT, TAB_FLUID], ny:[TAB_PAINT, TAB_FLUID, TAB_WREATH]},
    stats:{adult:{n:"2", ru:"арт-формата", en:"art formats"}, ny:{n:"3", ru:"арт-формата", en:"art formats"}},
    foot:{ru:"Для компаний меньше 10 гостей — доплата за художника 11 500 ₽.",
          en:"For groups under 10 guests there is an artist surcharge of 11 500 ₽."},
    cap:ART_CAP,
    venuesSub:{ru:"Залы для арт-вечеринки — от 8 до 50 гостей на одной площадке", en:"Halls for the art party — 8 to 50 guests at one venue"},
    combos:{ru:"Оливковый + Остров — до 50 гостей. В Томатном и Апельсиновом рисовать можно большим составом, а посадка под блюда в стол — до 24 гостей.",
            en:"Olive + Island — up to 50 guests. Tomato and Orange take a bigger group for painting, while seated dining is up to 24 guests."},
    setsTitle:{ru:"Программа и меню", en:"Programme & Menu"},
    setsIntro:{ru:"Выберите формат вечеринки, затем уровень — от него зависят сеты от шефа, включённый фуршет и цена за гостя.",
               en:"Choose the party format, then the level — it defines the chef’s sets, the included buffet and the price per guest."}
  },
  battle: {
    out:{adult:"NovikovCocktailBattle.html", ny:"NovikovNewYearCocktailBattle.html"},
    ff:1000,
    name:{ru:"Коктейльный баттл", en:"Cocktail Battle"},
    titleTag:{adult:"Novikov School — Коктейльный баттл 2026 / Cocktail Battle 2026",
              ny:"Novikov School — Коктейльный баттл · Новый год 2027 / New Year Cocktail Battle 2027"},
    h1:{adult:{ru:'Коктейльный баттл <span>Novikov School</span>', en:'<span>Novikov School</span> Cocktail Battle'},
        ny:{ru:'Коктейльный баттл на Новый год в <span>Novikov School</span>', en:'New Year Cocktail Battle at <span>Novikov School</span>'}},
    lead:{adult:{ru:"Команды против команд за барной стойкой: классика с бартендером и свой авторский коктейль, готовые сеты от шефа, фуршет и барная карта.",
                 en:"Team against team behind the bar: a classic with the bartender and your own signature cocktail, ready-made chef’s sets, a buffet and a full bar card."},
          ny:{ru:"Новогодний корпоратив в центре Москвы: коктейльный баттл с бартендером, готовые сеты от шефа, фуршет и барная карта — праздник под ключ.",
              en:"A New Year party in central Moscow: a cocktail battle with a bartender, ready-made chef’s sets, a buffet and a full bar card — the whole celebration, turnkey."}},
    intro:{adult:{ru:"Командная игра за барной стойкой: в первом раунде команды вместе с бартендером готовят классический коктейль, во втором — придумывают и готовят свой авторский, который дегустируют и оценивают соперники. Побеждает команда с лучшей оценкой. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
                  en:"A team game behind the bar: in round one the teams mix a classic cocktail with the bartender, in round two they invent and mix their own signature drink, which the rivals taste and score. The best-scored team wins. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."}},
    game:{adult:{ru:"Коктейльный баттл · 2 раунда: классический и авторский коктейль", en:"Cocktail Battle · 2 rounds: a classic and a signature cocktail"}},
    tabs:{adult:[TAB_BATTLE], ny:[TAB_BATTLE]},
    stats:{adult:{n:"2", ru:"раунда баттла", en:"battle rounds"}},
    foot:{ru:"18+. Чрезмерное употребление алкоголя вредит вашему здоровью.",
          en:"18+. Excessive drinking is harmful to your health."},
    cap:BATTLE_CAP,
    venuesSub:{ru:"Залы для баттла — от 20 до 50 гостей на одной площадке", en:"Halls for the battle — 20 to 50 guests at one venue"},
    combos:{ru:"Оливковый + Остров — до 40 гостей. В Томатном, Апельсиновом и залах ART баттл проходит в барном формате: места для посадки на время игры нет.",
            en:"Olive + Island — up to 40 guests. In Tomato, Orange and the ART halls the battle runs bar-style: there is no seating during the game."},
    setsTitle:{ru:"Программа и меню", en:"Programme & Menu"},
    setsIntro:{ru:"Выберите уровень — от него зависят сеты от шефа, включённый фуршет и цена за гостя.",
               en:"Choose the level — it defines the chef’s sets, the included buffet and the price per guest."}
  },
  /* Коктейльная вечеринка — EventyOn /cocktail_party_basic_offer_b2b, НГ /cocktail-party-newyear-b2b
     (10 400 / 11 400 / 12 400 — как казино → цены казино Новикова). FF как у казино (−1 000).
     Решение пользователя 2026-11-23: фуршет входит, меню коктейлей новиковское, залы — строка
     «Коктейльная вечеринка» в РОП-таблице, весёлый формат без битвы команд. */
  party: {
    out:{adult:"NovikovCocktailParty.html", ny:"NovikovNewYearCocktailParty.html"},
    ff:1000,
    ckArea:true,
    name:{ru:"Коктейльная вечеринка", en:"Cocktail Party"},
    titleTag:{adult:"Novikov School — Коктейльная вечеринка 2026 / Cocktail Party 2026",
              ny:"Novikov School — Коктейльная вечеринка · Новый год 2027 / New Year Cocktail Party 2027"},
    h1:{adult:{ru:'Коктейльная вечеринка <span>Novikov School</span>', en:'<span>Novikov School</span> Cocktail Party'},
        ny:{ru:'Новогодняя коктейльная вечеринка в <span>Novikov School</span>', en:'New Year Cocktail Party at <span>Novikov School</span>'}},
    lead:{adult:{ru:"Гости сами готовят 3 коктейля вместе с бартендером, шеф подаёт сеты между ними, фуршет и барная карта — весёлый корпоратив, день рождения или вечер с друзьями.",
                 en:"Guests mix 3 cocktails with a bartender, the chef serves the set in between, plus a buffet and a full bar card — a fun corporate party, birthday or night out with friends."},
          ny:{ru:"Новогодний корпоратив в центре Москвы: 3 коктейля своими руками с бартендером, готовые сеты от шефа, фуршет и барная карта — праздник под ключ.",
              en:"A New Year party in central Moscow: 3 cocktails you mix yourself with a bartender, ready-made chef’s sets, a buffet and a full bar card — the whole celebration, turnkey."}},
    intro:{adult:{ru:"Весёлая вечеринка за барной стойкой: бартендер знакомит с инвентарём и техникой, и гости сами готовят 3 коктейля — классику, хиты или тропические, на выбор из 30 позиций нашего меню. Без командной битвы: общение, музыка и вкусные напитки. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
                  en:"A fun party behind the bar: the bartender introduces the tools and techniques, and the guests mix 3 cocktails themselves — classics, hits or tropical, chosen from the 30 drinks on our menu. No team battle: just mingling, music and great drinks. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."},
           ny:{ru:"Праздничная вечеринка за барной стойкой: бартендер знакомит с инвентарём и техникой, и гости сами готовят 3 коктейля на выбор из 30 позиций нашего меню. Без командной битвы: общение, музыка и новогоднее настроение. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
               en:"A festive party behind the bar: the bartender introduces the tools and techniques, and the guests mix 3 cocktails chosen from the 30 drinks on our menu. No team battle: just mingling, music and the New Year spirit. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."}},
    game:{adult:{ru:"Коктейльная вечеринка · мастер-класс с бартендером, 3 коктейля", en:"Cocktail Party · masterclass with a bartender, 3 cocktails"}},
    tabs:{adult:[TAB_PARTY], ny:[TAB_PARTY]},
    stats:{adult:{n:"30", ru:"коктейлей на выбор", en:"cocktails to choose from"}},
    foot:{ru:"18+. Чрезмерное употребление алкоголя вредит вашему здоровью. Мохито, Moscow Mule и Lynchburg Lemonade можно приготовить без алкоголя.",
          en:"18+. Excessive drinking is harmful to your health. Mojito, Moscow Mule and Lynchburg Lemonade can be made alcohol-free."},
    cap:PARTY_CAP,
    venuesSub:{ru:"Залы для коктейльной вечеринки — от 20 до 50 гостей на одной площадке", en:"Halls for the cocktail party — 20 to 50 guests at one venue"},
    combos:{ru:"Оливковый + Остров — до 40 гостей. В Томатном, Апельсиновом и залах ART вечеринка проходит в барном формате: места для посадки на время мастер-класса нет.",
            en:"Olive + Island — up to 40 guests. In Tomato, Orange and the ART halls the party runs bar-style: there is no seating during the masterclass."},
    setsTitle:{ru:"Программа и меню", en:"Programme & Menu"},
    setsIntro:{ru:"Выберите уровень — от него зависят сеты от шефа, включённый фуршет и цена за гостя.",
               en:"Choose the level — it defines the chef’s sets, the included buffet and the price per guest."}
  },
  /* Рождественские венки — только НГ. EventyOn /christmas-wreath-newyear-b2b стоит как НГ-арт,
     поэтому цены = НГ-арт Новикова (SEASON.ny). FF как у арта (без изменений).
     Залы — строка «Рожденственские венки» в РОП-таблице (2026-11-23). */
  wreath: {
    seasons:["ny"],
    out:{ny:"NovikovNewYearWreath.html"},
    ff:0,
    name:{ru:"Рождественский венок", en:"Christmas Wreath"},
    titleTag:{ny:"Novikov School — Рождественский венок · Новый год 2027 / Christmas Wreath Party 2027"},
    h1:{ny:{ru:'Новогодние венки в <span>Novikov School</span>', en:'Christmas Wreaths at <span>Novikov School</span>'}},
    lead:{ny:{ru:"Новогодний корпоратив в центре Москвы: венок или букет из живой ели с декоратором, готовые сеты от шефа, фуршет и барная карта — праздник под ключ.",
              en:"A New Year party in central Moscow: a fresh-fir wreath or bouquet with a decorator, ready-made chef’s sets, a buffet and a full bar card — the whole celebration, turnkey."}},
    intro:{ny:{ru:"Аромат хвои, праздничная музыка и бокал в руке: под руководством декоратора гости собирают новогодний венок или букет из свежих еловых веток и украшают его шишками, бубенцами, сухоцветами и гирляндами. Все материалы включены. Мероприятие длится 4 часа с приветствием гостей и фуршетом. Официанты включены в стоимость: 6–19 гостей — 1 официант, 20–30 — 2, 31–50 — 3.",
               en:"The scent of pine, festive music and a glass in hand: guided by a decorator, guests make a New Year wreath or bouquet from fresh fir branches and dress it with cones, bells, dried flowers and garlands. All materials are included. The event runs 4 hours, including the guest welcome and the buffet. Waiters are included in the price: 6–19 guests — 1 waiter, 20–30 — 2, 31–50 — 3."}},
    game:{ny:{ru:"Мастер-класс с декоратором: венок или букет из живой ели", en:"Masterclass with a decorator: a fresh-fir wreath or bouquet"}},
    tabs:{ny:[{...TAB_WREATH, short:{ru:"Венок или букет из живой ели", en:"A fresh-fir wreath or bouquet"}}]},
    stats:{ny:{n:"2", ru:"варианта: венок или букет", en:"options: wreath or bouquet"}},
    foot:{ru:"Все материалы включены: живая ель, основа, шишки, бубенцы, сухоцветы и гирлянды.",
          en:"All materials are included: fresh fir, the base, cones, bells, dried flowers and garlands."},
    cap:() => ({...ART_CAP(true), granat:{ru:"до 12 гостей", en:"up to 12 guests"}}),
    venuesSub:{ru:"Залы для мастер-класса — от 8 до 50 гостей на одной площадке", en:"Halls for the masterclass — 8 to 50 guests at one venue"},
    combos:{ru:"Оливковый + Остров — до 50 гостей. В Томатном и Апельсиновом венки можно делать большим составом, а посадка под блюда в стол — до 24 гостей.",
            en:"Olive + Island — up to 50 guests. Tomato and Orange take a bigger group for the wreaths, while seated dining is up to 24 guests."},
    setsTitle:{ru:"Программа и меню", en:"Programme & Menu"},
    setsIntro:{ru:"Выберите уровень — от него зависят сеты от шефа, включённый фуршет и цена за гостя.",
               en:"Choose the level — it defines the chef’s sets, the included buffet and the price per guest."}
  }
};
/* Подпись окна коктейлей на странице вечеринки: 3 входят в пакет, дополнительный — по цене доп. услуги. */
const CK_CSS = `
  /* ---------- Кнопка меню коктейлей в «Программе» (build-art-battle.mjs) ---------- */
  .mc-ck-btn{display:inline-flex; align-items:center; margin-top:12px; padding:9px 16px; border:1px solid var(--red); background:#fff; color:var(--red);
    font:inherit; font-size:14px; font-weight:600; letter-spacing:.01em}
  .mc-ck-btn:hover{background:var(--red); color:#fff}
`;
const pick = (o, s) => o[s] || o.adult;

function build(kindKey, seasonKey){
  const K = KIND[kindKey], S = SEASON[seasonKey];
  let src = read(S.src);
  const orig = src;

  for(const s of Object.values(CASINO_SETS)) for(const d of s.d)
    must(orig.includes(`\n${q(d)}:`), `нет перевода блюда в TR (${S.src}): ${d}`);

  src = src.replace(/<title>[^<]*<\/title>/, `<title>${K.titleTag[seasonKey]}</title>`);
  src = src.replace(/(<!DOCTYPE html>\n?)/i, `$1<!-- СОБРАНО tools/build-art-battle.mjs из ${S.src} — руками не править -->\n`);
  const h1 = K.h1[seasonKey], lead = K.lead[seasonKey];
  src = src.replace(/<h1 data-i18n="h1">[\s\S]*?<\/h1>/, `<h1 data-i18n="h1">${h1.ru}</h1>`);
  src = src.replace(/<p class="lead" data-i18n="lead">[\s\S]*?<\/p>/, `<p class="lead" data-i18n="lead">${lead.ru}</p>`);
  src = src.replace(/^  h1:\{ru:.*$/m, `  h1:{ru:'${h1.ru}', en:'${h1.en}'},`);
  src = src.replace(/^  lead:\{ru:[^\n]*\n[^\n]*\},$/m, `  lead:${L(lead)},`);

  const setsText = Object.entries(CASINO_SETS).map(([k,v]) =>
    `  ${k}: {ru:${q(v.ru)}, en:${q(v.en)}${v.c?`, c:${q(v.c)}`:""}, d:${q(v.d)}}`).join(",\n");
  src = src.replace(/(const SETS = \{[\s\S]*?)\n\};/, (m, body) => `${body},\n  /* сеты арт/баттл (= казино) — tools/build-art-battle.mjs */\n${setsText}\n};`);

  // статистика
  {
    const a = src.indexOf("stats:["), b = matchBrace(src, a+6);
    const old = src.slice(a, b+1);
    const svc = old.match(/\{n:"(\d+)", ru:"доп\. услуг"/)[1];
    const st = pick(K.stats, seasonKey);
    src = src.slice(0,a) + `stats:[
    {n:"12", ru:"готовых сетов", en:"ready-made sets"},
    {n:"${st.n}",  ru:"${st.ru}", en:"${st.en}"},
    {n:"8",  ru:"залов на площадке", en:"halls at the venue"},
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
    const game = pick(K.game, seasonKey);
    const items = LEVELS.map((l,i)=>`          {n:${L(l.n)},
            d:{ru:${q(`${game.ru} · ${DISH[i].ru} · фуршет «${l.buffet}» (${l.bru}) · вода, чай и кофе.`)},
               en:${q(`${game.en} · ${DISH[i].en} · «${l.buffet}» buffet (${l.ben}) · water, tea and coffee.`)}}, p:"${S.prices[i]}",
            game:${L(game)}}`).join(",\n");
    src = replaceSection(src, "formats", `{
      id:"formats", icon:"💼", type:"formats",
      title:{ru:"Форматы и цены", en:"Formats & Pricing"},
      sub:${sub},
      note:${note},
      intro:${L(pick(K.intro, seasonKey))},
      groups:[
        {head:{ru:${q(K.name.ru+" — 3 уровня")}, en:${q(K.name.en+" — 3 levels")}}, items:[
${items}
        ]}
      ],
      foot:${L(K.foot)}
    }`);
  }

  // залы
  {
    const [a,b] = sectionRange(src, "venues");
    const old = src.slice(a,b+1);
    const note = old.match(/note:(\{ru:[^\n]*\})/)[1];
    const incl = old.slice(old.indexOf("incl:{"), matchBrace(old, old.indexOf("incl:{")+5)+1);
    const CAP = K.cap(seasonKey==="ny");
    const halls = HALL_ORDER.map(slug=>{
      const at = old.indexOf(`{slug:"${slug}"`);
      must(at>0, "нет зала "+slug);
      const h = old.slice(at, matchBrace(old, at)+1);
      return "        " + h.replace(/cap:\{ru:"[^"]*", en:"[^"]*"\}/, `cap:${L(CAP[slug])}`);
    }).join(",\n");
    const ext = old.match(/ext:\[[^\n]*\]/)[0];
    const pOG = ext.match(/s:\["olive","granat"\], p:"([^"]+)"/), pC = ext.match(/s:\["cafe"\], p:"([^"]+)"/);
    must(pOG && pC, "формат ext поменялся");
    src = replaceSection(src, "venues", `{
      id:"venues", icon:"🏛️", type:"venues",
      ext:[{s:["olive","granat"], p:"${pOG[1]}"}, {s:["cafe"], p:"${pC[1]}"}],
      title:{ru:"Залы", en:"Venues"},
      sub:${L(K.venuesSub)},
      note:${note},
      halls:[
${halls}
      ],
      combos:${L(K.combos)},
      ${incl}
    }`);
  }

  // программа и меню
  {
    const tabs = K.tabs[seasonKey].map(t=>{
      const tl = t.tl.map(([m,ru,en,hi])=>`           {m:${m}, ru:${q(ru)}, en:${q(en)}${hi?", hi:true":""}}`).join(",\n");
      const levels = LEVELS.map((l,i)=>`           {k:"${l.k}", n:${L(l.n)}, price:"${S.prices[i]}", buffet:"${l.buffet}", bwt:"${l.bwt}",
            ids:${q(LEVEL_IDS[i])}}`).join(",\n");
      return `        {k:"${t.k}", ic:"${t.ic}"${t.ck?", ck:true":""},
         n:${L(t.n)},
         short:${L(t.short)},
         d:${L(t.d)},
         tl:[
${tl}
         ],
         levels:[
${levels}
         ]}`;
    }).join(",\n");
    src = replaceSection(src, "sets", `{
      id:"sets", type:"sets",
      title:${L(K.setsTitle)},
      sub:{ru:"Три уровня · 4 готовых сета от шефа в каждом", en:"Three levels · 4 ready-made chef’s sets in each"},
      note:{ru:"Сет из 2 блюд (Эксклюзивный — 3) \\u00b7 фуршет включён в стоимость", en:"2-course set (Exclusive — 3) \\u00b7 buffet included"},
      intro:${L(K.setsIntro)},
      tabs:[
${tabs}
      ]
    }`);
  }

  // Free-Flow
  if(K.ff) for(const code of ["FF1","FF2","FF3"]){
    const re = new RegExp(`(\\{code:"${code}", name:\\{[^}]*\\}, price:")([^"]+)(")`);
    must(re.test(src), "нет пакета "+code);
    src = src.replace(re, (m,a,p,c)=>a + rub(parseRub(p)-K.ff) + c);
  }

  src = replaceOnce(src,
    "body = (s.intro?`<p class=\"sec-intro\">${s.intro[LANG]}</p>`:\"\") + tabBar + panels;",
    "body = (s.intro?`<p class=\"sec-intro\">${s.intro[LANG]}</p>`:\"\") + (s.tabs.length>1?tabBar:\"\") + panels;",
    "tabBar");
  src = replaceOnce(src,
    "const cc = it.d.length===3 ? c : [];",
    "const cc = it.c ? it.c.map(k=>c[k]) : it.d.length===3 ? c : [];",
    "setCard");

  if(K.ckArea){
    const re = /<span class="hm-area">\$\{LANG==="ru"\?"([0-9  ]+ ₽) \/ гость за коктейль":"[^"]+"\}<\/span>/;
    const m = src.match(re);
    must(m, "нет подписи цены в окне коктейлей");
    src = src.replace(re, `<span class="hm-area">\${LANG==="ru"?"3 коктейля входят в пакет · дополнительный — ${m[1]} / гость":"3 cocktails included · each extra — ${m[1]} / guest"}</span>`);
    src = replaceOnce(src, " · обычно 2–3 коктейля за мероприятие`", "`", "ckCapRu");
    src = replaceOnce(src, " · usually 2–3 per event`", "`", "ckCapEn");
    const st = src.lastIndexOf("\n</style>");
    src = src.slice(0, st) + CK_CSS + src.slice(st);
    src = replaceOnce(src, '<p class="mc-panel-d">${t.d[LANG]}</p>', '<p class="mc-panel-d">${t.d[LANG]}' + CK_BTN_JS + '</p>', "ckBtn");
  }

  const data = src.slice(src.indexOf("const DATA"), src.indexOf("const TR"));
  for(const bad of ["Демо-ужин","Индивидуальный мастер-класс (максимум",'"Prof"','"Лимонный"',"Кулинарная часть"])
    must(!data.includes(bad), `осталось «${bad}» в ${K.out[seasonKey]}`);

  src = addHeroPics(src, kindKey === "art" && seasonKey === "ny" ? "art-ny" : kindKey);
  fs.writeFileSync(path.join(ROOT, K.out[seasonKey]), src);
  console.log("→", K.out[seasonKey]);
}

for(const k of Object.keys(KIND)) for(const s of (KIND[k].seasons || Object.keys(SEASON))) build(k, s);
