/* Print mode: a PDF has no tabs and no modals, so everything they hide must be
   unfolded onto the page before rendering. Nothing is removed except controls
   that cannot work on paper — and those are replaced by the text they revealed. */
setTimeout(function(){
  var LBL = {photos:"фото зала — покажем по запросу"};

  /* ---- 1. Age tabs -> three stacked, titled blocks ---- */
  var sec = document.getElementById('program');
  if (sec) {
    var tabs = [].slice.call(sec.querySelectorAll('.mc-tab'));
    var meta = tabs.map(function(t){ return {
      ic: t.querySelector('.mc-tab-ic').textContent,
      n:  t.querySelector('.mc-tab-tx b').textContent,
      s:  t.querySelector('.mc-tab-tx em').textContent
    };});
    var bar = sec.querySelector('.mc-tabs'); if (bar) bar.remove();
    [].slice.call(sec.querySelectorAll('.mc-panel')).forEach(function(p, i){
      p.hidden = false;
      p.classList.add('print-age');
      var h = document.createElement('div');
      h.className = 'age-head';
      h.innerHTML = '<span class="age-ic">' + meta[i].ic + '</span>' +
                    '<b>' + meta[i].n + '</b><em>' + meta[i].s + '</em>';
      p.insertBefore(h, p.firstChild);
    });
  }

  /* ---- 2. Balloon catalogue lived in a modal — inline the full price list ---- */
  var bal = document.querySelector('.svc-card[data-modal="balloons"]');
  if (bal && typeof BALLOONS !== 'undefined') {
    var html = '<div class="print-cat"><div class="print-cat-h">Каталог и цены</div>';
    BALLOONS.groups.forEach(function(g){
      html += '<div class="print-cat-g">' + g.n.ru + '</div>';
      g.rows.forEach(function(r){
        var price = (typeof r.price === 'number')
          ? r.price.toLocaleString('ru-RU').replace(/,/g,' ') : r.price;
        html += '<div class="print-cat-r"><span>' + r.ru +
                (r.info ? ' <em>— ' + r.info + '</em>' : '') + '</span>' +
                '<b class="u">' + r.u + '</b><b class="p">' + price + ' ₽</b></div>';
      });
    });
    html += '</div>';
    bal.insertAdjacentHTML('beforeend', html);
  }

  /* ---- 3. Cake modal held 16 fillings — list them instead of a button ---- */
  var cake = document.querySelector('.svc-card[data-modal="cakes"]');
  if (cake && typeof CAKE !== 'undefined') {
    cake.insertAdjacentHTML('beforeend',
      '<div class="print-cat"><div class="print-cat-h">Начинки (' + CAKE.fillings.length + ')</div>' +
      '<div class="print-tags">' + CAKE.fillings.map(function(f){ return '<span>' + f + '</span>'; }).join('') +
      '</div><div class="print-note">' + CAKE.designs + ' готовых дизайнов в каталоге · свой дизайн — по референсу</div></div>');
  }

  /* ---- 4. Floral had a 26-photo gallery behind a button ---- */
  var flo = document.querySelector('.svc-card[data-modal="floral"]');
  if (flo && typeof FLORAL !== 'undefined') {
    flo.insertAdjacentHTML('beforeend',
      '<div class="print-note">' + FLORAL.count + ' примеров оформления в портфолио — покажем по запросу</div>');
  }

  /* ---- 5. Strip controls that cannot work on paper ---- */
  ['.lang', 'nav.sections'].forEach(function(sel){
    var el = document.querySelector(sel); if (el) el.remove();
  });
  [].slice.call(document.querySelectorAll('.ven-more, .cake-teaser-more')).forEach(function(e){ e.remove(); });
  [].slice.call(document.querySelectorAll('.hall-modal')).forEach(function(e){ e.remove(); });
  var hint = document.querySelector('.ven-hint');
  if (hint) hint.innerHTML = 'Фотографии залов покажем по запросу — менеджер подскажет, какой зал свободен и подойдёт для выбранного возраста и числа детей.';

  document.documentElement.setAttribute('data-print', 'ready');
}, 250);
