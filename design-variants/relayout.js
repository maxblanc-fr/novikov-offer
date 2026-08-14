/* Structural relayout for the two "rethink the page" variants.
   Runs after printmode.js has unfolded tabs and modals.
   window.RELAYOUT = {table:bool, leaders:bool, checklist:bool, chapters:bool} */
setTimeout(function(){
  var R = window.RELAYOUT || {};
  var kids = DATA.sections.filter(function(s){ return s.type === 'kids'; })[0];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  /* ---------- A. Packages as a comparison table ----------
     Three cards side by side force the reader to diff three bullet lists.
     A matrix puts the differences on one axis: dishes, game, price. */
  if (R.table && kids) {
    document.querySelectorAll('#program .mc-panel').forEach(function(panel, ai){
      var age = kids.ages[ai]; if (!age) return;
      var wrap = panel.querySelector('.pkg-cards'); if (!wrap) return;

      var rows = age.packages.map(function(p){
        var inc = p.inc.map(function(x){ return x.ru; });
        var dishes = '—', what = '', game = '—', buffet = '—';
        inc.forEach(function(t){
          var m = t.match(/(\d)\s*блюд/);
          if (m) { dishes = m[1]; what = (t.split(':')[1] || '').trim(); }
          if (/фуршет/i.test(t)) buffet = '✓';
          if (/Треш-бокс/i.test(t))  game = '«Треш-бокс», 30 мин';
          if (/Интерактивная игра/i.test(t)) game = 'На выбор, 1 час';
        });
        return {n:p.n.ru, price:p.price || '—', dishes:dishes, what:what, game:game, buffet:buffet, tag:p.tag && p.tag.ru};
      });

      var FEAT = [
        {l:'Приветственный детский фуршет', k:'buffet'},
        {l:'Блюд готовит каждый ребёнок',   k:'dishes'},
        {l:'Что именно',                    k:'what'},
        {l:'Игра',                          k:'game'}
      ];
      var h = '<table class="cmp"><thead><tr><th class="cmp-f"></th>' +
        rows.map(function(r){
          return '<th><span class="cmp-n">' + esc(r.n) + '</span>' +
                 (r.tag ? '<span class="cmp-tag">' + esc(r.tag) + '</span>' : '') + '</th>';
        }).join('') + '</tr></thead><tbody>';
      FEAT.forEach(function(f){
        if (rows.every(function(r){ return r[f.k] === '—' || r[f.k] === ''; })) return;
        h += '<tr><td class="cmp-f">' + f.l + '</td>' +
             rows.map(function(r){
               var v = r[f.k] || '—';
               return '<td' + (v === '✓' ? ' class="ok"' : (v === '—' ? ' class="no"' : '')) + '>' + esc(v) + '</td>';
             }).join('') + '</tr>';
      });
      h += '<tr class="cmp-price"><td class="cmp-f">Цена за ребёнка</td>' +
           rows.map(function(r){ return '<td>' + esc(r.price) + '</td>'; }).join('') + '</tr>';
      h += '</tbody></table>';
      wrap.outerHTML = h;
    });
  }

  /* ---------- B. Dish lists as a printed menu ---------- */
  if (R.leaders) {
    document.querySelectorAll('#program .menu-grid').forEach(function(grid){
      var out = '<div class="rmenu">';
      grid.querySelectorAll('.menu-card').forEach(function(c){
        var name = c.querySelector('.menu-card-h b').textContent;
        var n    = c.querySelector('.menu-card-h span').textContent;
        out += '<div class="rmenu-col"><div class="rmenu-cat">' + esc(name) +
               '<i>' + esc(n) + '</i></div>';
        c.querySelectorAll('li').forEach(function(li){
          out += '<div class="rmenu-i">' + esc(li.textContent) + '</div>';
        });
        out += '</div>';
      });
      grid.outerHTML = out + '</div>';
    });
  }

  /* ---------- C. Dish lists as a tick-box picker ----------
     The guest is literally choosing dishes, so give them the box to tick. */
  if (R.checklist) {
    document.querySelectorAll('#program .menu-card li').forEach(function(li){
      li.classList.add('tick');
    });
  }

  /* ---------- D. Services as a dense price list with leaders ----------
     Sixteen cards run to four pages; as a list they fit in one and a half,
     and the prices line up in a column the eye can scan. */
  if (R.leaders) {
    var grid = document.querySelector('.svc-grid');
    if (grid) {
      var out = '<div class="plist">';
      [].slice.call(grid.children).forEach(function(el){
        if (el.classList.contains('svc-gh')) {
          out += '<div class="plist-g">' + el.innerHTML + '</div>';
          return;
        }
        var name = el.querySelector('.svc-h b');
        if (!name) return;
        var min   = el.querySelector('.svc-min');
        var desc  = el.querySelector('.svc-d');
        var price = el.querySelector('.svc-price');
        var tiers = [].slice.call(el.querySelectorAll('.svc-tiers > div'));
        var tags  = [].slice.call(el.querySelectorAll('.svc-tags span, .print-tags span'));
        var note  = el.querySelector('.svc-note');
        var cat   = el.querySelector('.print-cat');
        /* floral gets a bare .print-note, not wrapped in .print-cat */
        var loose = el.querySelector(':scope > .print-note');

        out += '<div class="plist-i">';
        out += '<div class="plist-h"><span class="plist-n">' + name.textContent + '</span>' +
               '<span class="plist-d"></span>' +
               '<span class="plist-p">' + (price ? price.textContent.trim() : (tiers.length ? '' : '—')) + '</span></div>';
        if (min)  out += '<div class="plist-min">' + min.textContent + '</div>';
        if (desc) out += '<div class="plist-x">' + desc.textContent + '</div>';
        tiers.forEach(function(t){
          var l = t.querySelector('span'), b = t.querySelector('b'), e = t.querySelector('em');
          out += '<div class="plist-t"><span>' + (l ? l.textContent : '') + '</span>' +
                 '<i></i><b>' + (b ? b.textContent : '') + '</b>' +
                 '<em>' + (e ? e.textContent : '') + '</em></div>';
        });
        if (tags.length) out += '<div class="plist-tags">' + tags.map(function(t){ return t.textContent; }).join(' · ') + '</div>';
        if (note) out += '<div class="plist-note">' + note.innerHTML + '</div>';
        if (cat)   out += cat.outerHTML;
        if (loose) out += '<div class="plist-note">' + loose.innerHTML + '</div>';
        out += '</div>';
      });
      grid.outerHTML = out + '</div>';
    }
  }

  /* ---------- E. Age blocks as numbered chapters ---------- */
  if (R.chapters) {
    document.querySelectorAll('#program .age-head').forEach(function(h, i){
      var b = h.querySelector('b');
      var num = document.createElement('span');
      num.className = 'chapter-n';
      num.textContent = String(i + 1).padStart(2, '0');
      h.insertBefore(num, h.firstChild);
      var ic = h.querySelector('.age-ic'); if (ic) ic.remove();
      if (b) b.classList.add('chapter-t');
    });
  }
}, 600);
