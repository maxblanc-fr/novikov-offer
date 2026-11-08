/* Фото-мозаика в шапке лендингов форматов (казино, арт, баттл).
 * Вставляется сборщиками build-casino.mjs и build-art-battle.mjs сразу после
 * блока цифр в .hero. Фото лежат в images/formats/<набор>/N.jpg (1400px, q80).
 * Первое фото — большое слева; клик по любому открывает просмотр. */
import { must, replaceOnce } from "./build-casino.mjs";

export const PICS = {
  wine:     ["images/formats/wine/1.jpg","images/formats/wine/2.jpg","images/formats/wine/3.jpg","images/formats/wine/4.jpg","images/formats/wine/5.jpg"],
  cocktail: ["images/formats/cocktail/1.jpg","images/formats/cocktail/2.jpg","images/formats/cocktail/3.jpg","images/formats/cocktail/4.jpg","images/formats/cocktail/5.jpg"],
  art:      ["images/formats/art/1.jpg","images/formats/art/2.jpg","images/formats/art/3.jpg","images/formats/art/4.jpg","images/formats/art/5.jpg"],
  "art-ny": ["images/formats/art-ny/1.jpg","images/formats/art-ny/2.jpg","images/formats/art-ny/4.jpg","images/formats/art-ny/3.jpg","images/formats/art-ny/5.jpg"],
  battle:   ["images/formats/battle/1.jpg","images/formats/battle/2.jpg","images/formats/battle/3.jpg","uploads/cocktails/pornstar-martini.webp","uploads/cocktails/negroni.webp"],
};

const CSS = `
  /* ---------- Hero photo mosaic (tools/hero-pics.mjs) ---------- */
  .hero-pics{position:relative; z-index:1; display:grid; gap:8px; margin-top:clamp(28px,4vw,44px);
    grid-template-columns:1.35fr 1fr 1fr; grid-template-rows:repeat(2,clamp(150px,17vw,230px))}
  .hero-pics button{all:unset; cursor:zoom-in; position:relative; overflow:hidden; background:var(--maroon-dark); outline:1px solid rgba(255,255,255,.18)}
  .hero-pics button:first-child{grid-row:span 2}
  .hero-pics img{width:100%; height:100%; object-fit:cover; display:block; transition:transform .8s cubic-bezier(.2,.7,.2,1), filter .4s; filter:saturate(1.02)}
  .hero-pics button:hover img{transform:scale(1.06); filter:saturate(1.15)}
  .hero-pics button::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 60%,rgba(42,4,8,.35)); pointer-events:none}
  .hero-pics button:focus-visible{outline:2px solid #fff; outline-offset:2px}
  @media (max-width:720px){
    .hero-pics{display:flex; overflow-x:auto; scroll-snap-type:x mandatory; margin-left:calc(-1*clamp(16px,5vw,48px)); margin-right:calc(-1*clamp(16px,5vw,48px));
      padding:0 clamp(16px,5vw,48px); scrollbar-width:none}
    .hero-pics::-webkit-scrollbar{display:none}
    .hero-pics button{flex:none; width:74vw; height:62vw; scroll-snap-align:center}
  }
  @media (min-width:1000px){
    .hero{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.08fr); column-gap:clamp(28px,4vw,56px); align-content:start}
    .hero > *:not(.hero-pics):not(.ny-snow):not(.ny-drift){grid-column:1}
    .hero h1{font-size:clamp(46px,5.1vw,78px)}
    .hero-pics{grid-column:2; grid-row:1 / span 5; align-self:center; margin-top:0;
      grid-template-rows:repeat(2,clamp(170px,16vw,250px))}
  }
  .pic-lb{position:fixed; inset:0; z-index:1000; background:rgba(18,4,6,.92); display:grid; place-items:center; padding:24px; cursor:zoom-out}
  .pic-lb[hidden]{display:none}
  .pic-lb img{max-width:min(1400px,100%); max-height:88vh; object-fit:contain; box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .pic-lb .lb-nav{position:absolute; top:50%; transform:translateY(-50%); width:48px; height:48px; border:0; background:rgba(255,255,255,.92); color:var(--red-deep); font-size:28px; cursor:pointer; display:grid; place-items:center}
  .pic-lb .lb-prev{left:16px} .pic-lb .lb-next{right:16px}
`;

const JS = `
/* ---------- Hero photo lightbox (tools/hero-pics.mjs) ---------- */
(function(){
  const box=document.querySelector(".hero-pics"); if(!box) return;
  const srcs=[...box.querySelectorAll("img")].map(i=>i.getAttribute("src"));
  const lb=document.createElement("div"); lb.className="pic-lb"; lb.hidden=true;
  lb.innerHTML='<button class="lb-nav lb-prev" aria-label="prev">‹</button><img alt=""><button class="lb-nav lb-next" aria-label="next">›</button>';
  document.body.appendChild(lb);
  let i=0; const img=lb.querySelector("img");
  const show=n=>{i=(n+srcs.length)%srcs.length; img.src=srcs[i]; lb.hidden=false;};
  box.addEventListener("click",e=>{const b=e.target.closest("button[data-i]"); if(b) show(+b.dataset.i);});
  lb.addEventListener("click",e=>{ if(e.target.closest(".lb-prev")) show(i-1); else if(e.target.closest(".lb-next")) show(i+1); else lb.hidden=true; });
  document.addEventListener("keydown",e=>{ if(lb.hidden) return; if(e.key==="Escape") lb.hidden=true; if(e.key==="ArrowLeft") show(i-1); if(e.key==="ArrowRight") show(i+1); });
})();
`;

export function addHeroPics(src, key){
  const pics = PICS[key];
  must(pics && pics.length === 5, "нет фото для " + key);
  const tiles = pics.map((u,i) =>
    `<button type="button" data-i="${i}" aria-label="фото ${i+1}"><img src="${u}" alt="" ${i ? 'loading="lazy" ' : 'fetchpriority="high" '}decoding="async"></button>`).join("");
  src = replaceOnce(src, `<div class="stats" id="stats"></div>`,
    `<div class="stats" id="stats"></div>\n  <div class="hero-pics">${tiles}</div>`, "hero-pics html");
  const st = src.lastIndexOf("\n</style>");
  must(st > 0, "нет </style>");
  src = src.slice(0, st) + CSS + src.slice(st);
  const end = src.lastIndexOf("</script>");
  must(end > 0, "нет </script>");
  src = src.slice(0, end) + JS + src.slice(end);
  return src;
}
