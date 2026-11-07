#!/usr/bin/env node
/* Собирает NovikovFormats.html — общую витрину всех форматов — из
 * tools/formats-hub.template.html. Подставляет шрифты (из NovikovOffer.html)
 * и цены «от» для осени и НГ, читая их прямо из лендингов, поэтому после
 * смены цен на лендинге достаточно пересобрать:
 *
 *   node tools/build-art-battle.mjs && node tools/build-formats-hub.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sectionRange, must, parseRub, rub } from "./build-casino.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Простые цены «N ₽» из секции formats (без «+ N ₽/чел» частных МК). */
function formatPrices(file, filter = () => true){
  const src = read(file);
  const [a,b] = sectionRange(src, "formats");
  const sec = src.slice(a, b+1);
  const out = [];
  for(const m of sec.matchAll(/\{n:\{ru:"([^"]*)"[\s\S]*?p:"([\d ]+ ₽)"/g))
    if(filter(m[1])) out.push(parseRub(m[2]));
  must(out.length, "нет цен в "+file);
  return out;
}
const from = (file, filter) => rub(Math.min(...formatPrices(file, filter)));
const notDemo = n => n !== "Демо-ужин";
const demo = n => n === "Демо-ужин";

const PRICES = {
  cook:     {adult:from("NovikovOffer.html", notDemo),  ny:from("NovikovNewYear.html", notDemo)},
  chefs:    {adult:from("NovikovOffer.html", demo),     ny:from("NovikovNewYear.html", demo)},
  wine:     {adult:from("NovikovWineCasino.html"),      ny:from("NovikovNewYearWineCasino.html")},
  cocktail: {adult:from("NovikovCocktailCasino.html"),  ny:from("NovikovNewYearCocktailCasino.html")},
  battle:   {adult:from("NovikovCocktailBattle.html"),  ny:from("NovikovNewYearCocktailBattle.html")},
  art:      {adult:from("NovikovArt.html"),             ny:from("NovikovNewYearArt.html")},
  kids:     {adult:from("NovikovKids.html"),            ny:from("NovikovKids.html")}
};

const offer = read("NovikovOffer.html");
const fonts = [...offer.matchAll(/^@font-face\{[^\n]*\}$/gm)].map(m=>m[0]).join("\n");
must(fonts.split("@font-face").length-1 === 5, "ожидалось 5 @font-face в NovikovOffer.html");

let html = read("tools/formats-hub.template.html");
html = html.replace("/*@FONTS@*/", () => fonts);
html = html.replace("/*@PRICES@*/{}", () => JSON.stringify(PRICES, null, 1));
html = html.replace(/(<!DOCTYPE html>\n?)/i, "$1<!-- СОБРАНО tools/build-formats-hub.mjs из tools/formats-hub.template.html — руками не править -->\n");
must(!html.includes("@FONTS@") && !html.includes("@PRICES@"), "плейсхолдеры остались");

fs.writeFileSync(path.join(ROOT, "NovikovFormats.html"), html);
console.log("→ NovikovFormats.html", PRICES);
