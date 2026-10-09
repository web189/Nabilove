/* Nabillove — packages.js
   Paket Harga & Promo: tampil di Beranda + halaman Pricelist, dikelola di Dasbor Admin → "Paket & Promo Harga".
   Data disimpan di db.ref('packages') = { v:1, items:{ id: paket } }.
   Selama admin belum pernah menyimpan, yang tampil adalah paket contoh (DEFAULTS) dari gambar acuan. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- data awal (sesuai gambar 1 & 2) ---------- */
  var DEFAULTS = [
    { id: 'pdkt1', group: 'PDKT', layout: 'tab', label: 'PDKT 1', price: '100.000', color: '#e11d48', perks: ['Chat 3 Hari', 'PAP 1x', 'Call 15 Menit', 'VC 15 Menit'] },
    { id: 'pdkt2', group: 'PDKT', layout: 'tab', label: 'PDKT 2', price: '165.000', color: '#4338ca', perks: ['Chat 7 Hari', 'PAP 3x', 'Call 30 Menit', 'VC 15 Menit'] },
    { id: 'pdkt3', group: 'PDKT', layout: 'tab', label: 'PDKT 3', price: '380.000', color: '#94499b', perks: ['Chat 14 Hari', 'PAP 10x', 'Call 30 Menit (2x)', 'VC 15 Menit (2x)', 'VN Sepuasnya'] },
    { id: 'pdkt4', group: 'PDKT', layout: 'tab', label: 'PDKT 4', price: '700.000', color: '#111111', perks: ['Chat 30 Hari', 'PAP 20x', 'Call 30 Menit (3x)', 'VC 15 Menit (4x)', 'VN Sepuasnya'] },
    { id: 'rel1', group: 'Relationship', layout: 'row', label: 'Relationship 1', price: '220.000', color: '#c81e5b', perks: ['Chat 3 Hari', 'Offline Date 1x (2 Jam)', 'PAP 1x', 'Call 15 Menit'] },
    { id: 'rel2', group: 'Relationship', layout: 'row', label: 'Relationship 2', price: '400.000', color: '#c81e5b', perks: ['Chat 7 Hari', 'Offline Date 1x (4 Jam)', 'Call 15 Menit', 'PAP 3x'] },
    { id: 'rel3', group: 'Relationship', layout: 'row', label: 'Relationship 3', price: '600.000', color: '#c81e5b', perks: ['Chat 14 Hari', 'Offline Date 2x (2 Jam)', 'Call 30 Menit (2x)', 'PAP 7x'] }
  ];

  /* ---------- helper harga & warna ---------- */
  function toNum(s) {
    s = String(s == null ? '' : s).toLowerCase().trim();
    var m = s.match(/^([\d.,]+)\s*(k|rb|ribu)$/);
    if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1000) || 0;
    return parseInt(s.replace(/\D/g, ''), 10) || 0;
  }
  function dots(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function short(n) { return (n >= 1000 && n % 1000 === 0) ? (n / 1000) + 'K' : 'Rp ' + dots(n); }
  function okColor(c) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#c81e5b'; }
  function lum(hex) {
    var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    function f(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function colorVars(hex) {
    var l = lum(hex);
    return '--pk:' + hex + ';--pk-ink:' + (l > 0.55 ? '#231019' : '#ffffff') + ';--pk-line:' + (l < 0.12 ? 'var(--text-muted)' : hex) + ';--pk-text:' + ((l < 0.12 || l > 0.7) ? 'var(--text)' : hex);
  }

  /* ---------- state ---------- */
  var cache = null; /* null = belum pernah disimpan admin → tampil contoh */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function norm(p, i) {
    return {
      id: String(p.id || ('pk' + i)), group: String(p.group || 'Paket').slice(0, 40), layout: p.layout === 'row' ? 'row' : 'tab',
      label: String(p.label || '').slice(0, 60), price: String(p.price || '0'), oldPrice: p.oldPrice ? String(p.oldPrice) : '', promo: p.promo ? String(p.promo).slice(0, 40) : '',
      color: okColor(p.color), perks: (Array.isArray(p.perks) ? p.perks : (p.perks && typeof p.perks === 'object' ? Object.keys(p.perks).map(function (k) { return p.perks[k]; }) : [])).map(String),
      popular: p.popular === true, active: p.active !== false, order: typeof p.order === 'number' ? p.order : i * 10
    };
  }
  function getPkgs() {
    var src = cache === null ? DEFAULTS : cache;
    return src.map(function (p, i) { return norm(p, i); }).filter(function (p) { return p.label; }).sort(function (a, b) { return a.order - b.order; });
  }
  function savePkgs(list) {
    list = list.map(function (p, i) { var o = clone(p); o.order = i * 10; return o; });
    cache = list; /* optimistis */
    var items = {}; list.forEach(function (p) { items[p.id] = p; });
    var pr = db.ref('packages').set({ v: 1, items: items });
    if (pr && pr.catch) pr.catch(function (e) { console.error('packages save error:', e); toast('Gagal menyimpan. Pastikan Firebase Rules sudah memuat aturan "packages".', 'error'); });
    return pr;
  }

  /* ---------- tampilan publik ---------- */
  function flags(p, disc) {
    var h = (p.popular ? '<span class="pk-flag pop">🔥 Terpopuler</span>' : '') + (disc ? '<span class="pk-flag promo">🏷️ ' + esc(disc) + '</span>' : '');
    return h ? '<div class="pk-flags">' + h + '</div>' : '';
  }
  function cardHTML(p) {
    var n = toNum(p.price), o = toNum(p.oldPrice), disc = p.promo || (o > n && n > 0 ? 'Hemat ' + Math.round((o - n) / o * 100) + '%' : '');
    var ul = '<ul class="pk-list">' + p.perks.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    var cta = '<button type="button" class="pk-cta" data-pk="' + esc(p.id) + '">Pesan</button>';
    var oldH = o > n ? '<s>' + short(o) + '</s>' : '';
    if (p.layout === 'row') {
      return '<div class="pk-card pk-row' + (p.popular ? ' is-pop' : '') + '" style="' + colorVars(p.color) + '"><div class="pk-row-head"><h4>' + esc(p.label) + '</h4><div class="pk-row-price">' + oldH + '<b>' + short(n) + '</b></div></div>' + flags(p, disc) + ul + cta + '</div>';
    }
    return '<div class="pk-card pk-tab' + (p.popular ? ' is-pop' : '') + '" style="' + colorVars(p.color) + '"><div class="pk-label">' + esc(p.label) + '</div>' + flags(p, disc) + '<div class="pk-band">' + oldH + '<b>' + short(n) + '</b></div>' + ul + cta + '</div>';
  }
  function groupsOf(L) {
    var order = [], map = {};
    L.forEach(function (p) { if (!map[p.group]) { map[p.group] = []; order.push(p.group); } map[p.group].push(p); });
    return order.map(function (g) { return { name: g, list: map[g] }; });
  }
  function publicHTML() {
    var L = getPkgs().filter(function (p) { return p.active; });
    if (!L.length) return '';
    return '<div class="pk-wrap">' + groupsOf(L).map(function (g) {
      var tabs = g.list.filter(function (p) { return p.layout !== 'row'; }), rows = g.list.filter(function (p) { return p.layout === 'row'; });
      return '<div class="pk-group"><div class="pk-group-head"><h3>' + esc(g.name) + '</h3></div>' +
        (tabs.length ? '<div class="pk-grid n' + Math.min(tabs.length, 5) + '">' + tabs.map(cardHTML).join('') + '</div>' : '') +
        (rows.length ? '<div class="pk-grid rows n' + Math.min(rows.length, 5) + '">' + rows.map(cardHTML).join('') + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function renderPublic() {
    var h = publicHTML(), a = $('packagesLanding'), b = $('packagesPricelist'), s = $('landingPackages'), w = $('packagesPricelistWrap');
    if (a) a.innerHTML = h; if (b) b.innerHTML = h;
    if (s) s.classList.toggle('pk-none', !h); if (w) w.classList.toggle('pk-none', !h);
  }
  function order(id) {
    var p = getPkgs().filter(function (x) { return x.id === id; })[0]; if (!p) return;
    if (typeof openBookingFromPrice === 'function') openBookingFromPrice(p.group + ' — ' + p.label, dots(toNum(p.price)));
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.pk-cta') : null; if (b) order(b.getAttribute('data-pk'));
  });

  /* filter di halaman Pricelist: tombol "Paket & Promo" */
  var _fp = window.filterPrice;
  if (typeof _fp === 'function') {
    window.filterPrice = function (cat, btn) {
      _fp.apply(this, arguments);
      var w = $('packagesPricelistWrap'), c = $('pricelistContainer');
      if (w) w.classList.toggle('pk-filtered-out', !(cat === 'all' || cat === 'paket'));
      if (c) c.classList.toggle('pk-filtered-out', cat === 'paket');
    };
  }

  /* ---------- listener data ---------- */
  function onData(snap) {
    var v = snap && snap.val ? snap.val() : null;
    if (v && v.items) cache = Object.keys(v.items).map(function (k) { return v.items[k]; }).filter(function (p) { return p && p.label; });
    else if (v && v.v) cache = [];
    else cache = null;
    renderPublic();
    var el = $('admin-tab-packages');
    if (el && el.classList.contains('active') && !document.querySelector('.nb-ov')) renderAdmin(el);
  }
  try { db.ref('packages').on('value', onData, function () { cache = null; renderPublic(); }); } catch (e) { renderPublic(); }
  renderPublic();

  /* ---------- admin ---------- */
  function renderAdmin(el) {
    var L = getPkgs();
    var head = '<div class="dh"><div><h2>Paket &amp; promo harga</h2><p>' + L.length + ' paket · tampil di Beranda &amp; halaman Pricelist</p></div>' +
      '<div style="display:flex;gap:.6rem;flex-wrap:wrap"><button type="button" class="nb-btn ghost" onclick="pkgLoadSample()"><i class="fas fa-rotate-left"></i> Muat contoh</button><button type="button" class="nb-btn" onclick="pkgEdit()"><i class="fas fa-plus"></i> Tambah paket</button></div></div>';
    var note = cache === null ? '<div class="nb-info">ℹ️ Saat ini yang tampil adalah paket contoh bawaan. Ubah, hapus, atau tambah paket apa saja — perubahan langsung tersimpan dan tampil di website.</div>' : '';
    var body = L.length ? groupsOf(L).map(function (g) {
      return '<div class="dash-section"><h3>' + esc(g.name) + ' (' + g.list.length + ')</h3>' + g.list.map(function (p, i) {
        var n = toNum(p.price), o = toNum(p.oldPrice), on = p.active;
        var meta = 'Rp ' + dots(n) + (o > n ? ' <s>Rp ' + dots(o) + '</s>' : '') + (p.promo ? ' · 🏷️ ' + esc(p.promo) : '') + (p.popular ? ' · 🔥 Terpopuler' : '');
        return '<div class="nb-promo"><div class="pk-dot" style="background:' + p.color + '"></div><div class="nb-promo-i"><strong>' + esc(p.label) + '</strong><small>' + meta + '</small><small>' + (p.perks.length ? esc(p.perks.join(' · ')) : 'Belum ada isi paket') + '</small></div>' +
          '<div class="nb-promo-a"><button type="button" class="nb-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" onclick="pkgToggle(\'' + p.id + '\')"><i></i><b>' + (on ? 'Tampil' : 'Sembunyi') + '</b></button>' +
          '<button type="button" class="mini" aria-label="Naik" ' + (i === 0 ? 'disabled' : '') + ' onclick="pkgMove(\'' + p.id + '\',-1)"><i class="fas fa-arrow-up"></i></button>' +
          '<button type="button" class="mini" aria-label="Turun" ' + (i === g.list.length - 1 ? 'disabled' : '') + ' onclick="pkgMove(\'' + p.id + '\',1)"><i class="fas fa-arrow-down"></i></button>' +
          '<button type="button" class="mini" onclick="pkgEdit(\'' + p.id + '\')"><i class="fas fa-pen"></i> Edit</button>' +
          '<button type="button" class="mini no" aria-label="Hapus" onclick="pkgDelete(\'' + p.id + '\')"><i class="fas fa-trash"></i></button></div></div>';
      }).join('') + '</div>';
    }).join('') : '<div class="dash-section"><div class="empty-mini">Belum ada paket. Tekan “Tambah paket” atau “Muat contoh”.</div></div>';
    el.innerHTML = head + note + body;
  }

  window.pkgToggle = function (id) {
    var L = getPkgs(); L.forEach(function (p) { if (p.id === id) p.active = !p.active; }); savePkgs(L); showAdminTab('packages');
  };
  window.pkgMove = function (id, dir) {
    var L = getPkgs(), i = L.findIndex(function (p) { return p.id === id; }); if (i < 0) return;
    var j = i + dir; while (j >= 0 && j < L.length && L[j].group !== L[i].group) j += dir;
    if (j < 0 || j >= L.length) return;
    var t = L[i]; L[i] = L[j]; L[j] = t; savePkgs(L); showAdminTab('packages');
  };
  window.pkgDelete = function (id) {
    var p = getPkgs().filter(function (x) { return x.id === id; })[0]; if (!p) return;
    nbConfirm({ icon: '🗑️', title: 'Hapus ' + esc(p.label) + '?', msg: 'Paket ini akan hilang dari website.', ok: 'Hapus', danger: true }, function () {
      savePkgs(getPkgs().filter(function (x) { return x.id !== id; })); toast('Paket dihapus', 'info'); showAdminTab('packages');
    });
  };
  window.pkgLoadSample = function () {
    nbConfirm({ icon: '↩️', title: 'Muat paket contoh?', msg: 'Semua paket sekarang diganti dengan contoh bawaan (PDKT 1–4 &amp; Relationship 1–3).', ok: 'Ganti' }, function () {
      savePkgs(clone(DEFAULTS)); toast('Paket contoh dimuat ✓', 'success'); showAdminTab('packages');
    });
  };
  function fld(l, id, v, type, ph) { return '<label class="nb-f"><span>' + l + '</span><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>'; }
  window.pkgEdit = function (id) {
    var L = getPkgs(), old = id ? L.filter(function (x) { return x.id === id; })[0] : null;
    var p = old || { id: 'pk' + Date.now().toString(36), group: (L.length ? L[L.length - 1].group : 'PDKT'), layout: 'tab', label: '', price: '', oldPrice: '', promo: '', color: '#c81e5b', perks: [], popular: false, active: true };
    var groups = []; L.forEach(function (x) { if (groups.indexOf(x.group) < 0) groups.push(x.group); });
    var ov = nbOverlay('<div class="nb-head"><h3>' + (old ? 'Edit paket' : 'Tambah paket') + '</h3><button type="button" class="nb-x2" aria-label="Tutup">✕</button></div>' +
      '<div class="nb-grid"><label class="nb-f"><span>Grup / kategori</span><input id="pk_group" list="pk_groups" value="' + esc(p.group) + '" placeholder="mis. PDKT"><datalist id="pk_groups">' + groups.map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist></label>' + fld('Nama paket', 'pk_label', p.label, 'text', 'mis. PDKT 1') + '</div>' +
      '<div class="nb-grid">' + fld('Harga (Rp)', 'pk_price', p.price, 'text', 'mis. 100.000 atau 100K') + fld('Harga coret / sebelum promo (opsional)', 'pk_old', p.oldPrice, 'text', 'mis. 130.000') + '</div>' +
      '<div class="nb-grid">' + fld('Label promo (opsional)', 'pk_promo', p.promo, 'text', 'mis. Diskon 20% / Hemat 30rb') +
      '<label class="nb-f"><span>Tampilan kartu</span><select id="pk_layout"><option value="tab"' + (p.layout === 'tab' ? ' selected' : '') + '>Kartu berwarna (gaya PDKT)</option><option value="row"' + (p.layout === 'row' ? ' selected' : '') + '>Baris judul + harga (gaya Relationship)</option></select></label></div>' +
      '<label class="nb-f"><span>Isi paket — satu baris satu item</span><textarea id="pk_perks" rows="6" placeholder="Chat 3 Hari&#10;PAP 1x&#10;Call 15 Menit">' + esc(p.perks.join('\n')) + '</textarea></label>' +
      '<div class="nb-grid"><label class="nb-f"><span>Warna kartu</span><input id="pk_color" type="color" value="' + p.color + '" style="height:44px;padding:.2rem"></label>' +
      '<div class="nb-f"><span>Opsi</span><label class="nb-chk"><input type="checkbox" id="pk_pop"' + (p.popular ? ' checked' : '') + '> Tandai 🔥 Terpopuler</label><label class="nb-chk"><input type="checkbox" id="pk_on"' + (p.active ? ' checked' : '') + '> Tampilkan di website</label></div></div>' +
      '<div class="nb-btns"><button type="button" class="nb-btn ghost nb-x">Batal</button><button type="button" class="nb-btn nb-save"><i class="fas fa-save"></i> Simpan</button></div>', 'wide');
    ov.querySelector('.nb-x').onclick = ov.querySelector('.nb-x2').onclick = function () { nbCloseOv(ov); };
    ov.querySelector('.nb-save').onclick = function () {
      var label = $('pk_label').value.trim(), n = toNum($('pk_price').value);
      if (!label) { toast('Nama paket wajib diisi', 'error'); return; }
      if (!n) { toast('Harga wajib diisi (angka)', 'error'); return; }
      var o2 = toNum($('pk_old').value);
      var o = { id: p.id, group: $('pk_group').value.trim().slice(0, 40) || 'Paket', layout: $('pk_layout').value, label: label.slice(0, 60), price: dots(n), oldPrice: o2 ? dots(o2) : '', promo: $('pk_promo').value.trim().slice(0, 40),
        color: okColor($('pk_color').value), perks: $('pk_perks').value.split('\n').map(function (s) { return s.trim().slice(0, 60); }).filter(Boolean).slice(0, 14), popular: $('pk_pop').checked, active: $('pk_on').checked };
      var cur = getPkgs(), idx = cur.findIndex(function (x) { return x.id === p.id; });
      if (idx > -1) cur[idx] = o;
      else { /* paket baru: taruh di akhir grupnya */
        var last = -1; cur.forEach(function (x, i) { if (x.group === o.group) last = i; });
        if (last < 0) cur.push(o); else cur.splice(last + 1, 0, o);
      }
      savePkgs(cur); nbCloseOv(ov); toast(old ? 'Perubahan disimpan ✓' : 'Paket ditambahkan ✓', 'success'); showAdminTab('packages');
    };
  };

  var _sat = window.showAdminTab;
  window.showAdminTab = function (tab) { _sat.apply(this, arguments); var el = $('admin-tab-packages'); if (tab === 'packages' && el) renderAdmin(el); };
  window.nbPackages = { get: getPkgs, defaults: DEFAULTS };
})();
