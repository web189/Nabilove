/* Nabillove — pwa.js V.13 : pasang aplikasi, mode offline, auto-update */
(function () {
'use strict';
var ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
var android = /android/i.test(ua), btns = [];
function $(id) { return document.getElementById(id); }
function installed() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function idle(fn) { try { (window.requestIdleCallback || setTimeout)(fn, 1500); } catch (e) { setTimeout(fn, 1500); } }


/* ============ URL BERSIH: hilangkan "#" di belakang alamat ============ */
function cleanHash() { try { if (location.hash === '' && location.href.slice(-1) === '#' || location.hash === '#') history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href="#"]'); if (a) { e.preventDefault(); cleanHash(); }
}, true);
cleanHash(); window.addEventListener('load', cleanHash); window.addEventListener('hashchange', cleanHash);

/* ============ STATUS JARINGAN / UPDATE (banner kecil) ============ */
var netEl, netTimer;
function banner(text, cls, ms) {
  if (!netEl) { netEl = document.createElement('div'); netEl.className = 'nb-net'; netEl.setAttribute('role', 'status'); netEl.innerHTML = '<i></i><span></span>'; document.body.appendChild(netEl); }
  netEl.className = 'nb-net show ' + (cls || ''); netEl.lastChild.textContent = text;
  clearTimeout(netTimer); if (ms) netTimer = setTimeout(function () { netEl.classList.remove('show'); }, ms);
}
function hideBanner() { if (netEl) netEl.classList.remove('show'); }

var wasOffline = !navigator.onLine;
function goOffline() { wasOffline = true; document.documentElement.classList.add('nb-offline'); banner('Kamu sedang offline — menampilkan data tersimpan', ''); }
function goOnline() {
  document.documentElement.classList.remove('nb-offline');
  if (wasOffline) { wasOffline = false; banner('Kembali online — memeriksa pembaruan…', 'on upd', 2600); }
  checkUpdates(true);
}
window.addEventListener('offline', goOffline);
window.addEventListener('online', goOnline);

/* ============ SERVICE WORKER + AUTO UPDATE ============ */
var reg = null, lastCheck = 0, hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller), reloading = false;
function safeToReload() {
  if (document.body.classList.contains('modal-open')) return false;
  var m = document.querySelector('.modal-overlay.open,.modal-overlay.active,.modal-overlay.show,.nb-ov'); if (m) return false;
  var a = document.activeElement; return !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
}
function reloadWhenSafe() {
  if (reloading) return; reloading = true;
  banner('Versi terbaru siap — memuat ulang…', 'on upd');
  (function wait(n) { if (safeToReload() || n > 30) { try { sessionStorage.setItem('nb_updated', '1'); } catch (e) {} location.reload(); } else setTimeout(function () { wait(n + 1); }, 2000); })(0);
}
function hash(t) { var h = 5381, i = t.length; while (i) h = (h * 33) ^ t.charCodeAt(--i); return (h >>> 0).toString(36) + ':' + t.length; }

/* cek 2 lapis: (1) sw.js berubah → SW baru; (2) index.html berubah → muat ulang */
function checkUpdates(force) {
  if (!navigator.onLine) return;
  var now = Date.now(); if (!force && now - lastCheck < 5 * 60 * 1000) return; lastCheck = now;
  if (reg) reg.update().catch(function () {});
  fetch('index.html', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) {
    if (!t) return;
    var h = hash(t), old = null; try { old = localStorage.getItem('nb_idx_hash'); localStorage.setItem('nb_idx_hash', h); } catch (e) {}
    if (old && old !== h) {
      if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      reloadWhenSafe();
    } else if (!old) { /* kunjungan pertama: hanya simpan penanda */ }
  }).catch(function () {});
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (r) {
      reg = r;
      r.addEventListener('updatefound', function () {
        var w = r.installing; if (!w) return;
        w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) banner('Memasang pembaruan…', 'on upd', 2500); });
      });
      idle(function () { checkUpdates(true); });
    }).catch(function () {});
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }       // pemasangan pertama: tidak perlu reload
      reloadWhenSafe();
    });
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') checkUpdates(false); });
  setInterval(function () { checkUpdates(false); }, 30 * 60 * 1000);
}
window.addEventListener('load', function () {
  try { if (sessionStorage.getItem('nb_updated')) { sessionStorage.removeItem('nb_updated'); setTimeout(function () { banner('Aplikasi sudah diperbarui ke versi terbaru ✓', 'on', 3200); }, 4300); } } catch (e) {}
  if (!navigator.onLine) setTimeout(goOffline, 4300);               // setelah loading screen
});

/* booking butuh internet (kirim ke WhatsApp admin) */
window.addEventListener('load', function () {
  var orig = window.submitBookingFinal;
  if (typeof orig === 'function') window.submitBookingFinal = function () {
    if (!navigator.onLine) { if (typeof toast === 'function') toast('Kamu sedang offline. Sambungkan internet dulu untuk mengirim booking.', 'error'); return; }
    return orig.apply(this, arguments);
  };
});

/* ============ PASANG APLIKASI ============ */
function dp() { return window.__nbDP || null; }
function sheet(title, sub, steps, note) {
  var old = $('nbSheet'); if (old) old.remove();
  var ov = document.createElement('div'); ov.className = 'nb-sheet-ov'; ov.id = 'nbSheet';
  ov.innerHTML = '<div class="nb-sheet" role="dialog" aria-modal="true"><div class="hd"><img src="icon-192.png" alt=""><div><h3>' + title + '</h3><p>' + sub + '</p></div></div><ol>' +
    steps.map(function (s) { return '<li><span>' + s + '</span></li>'; }).join('') + '</ol>' + (note ? '<div class="note">' + note + '</div>' : '') + '<button type="button" class="ok">Mengerti</button></div>';
  document.body.appendChild(ov);
  function close() { ov.classList.remove('show'); setTimeout(function () { ov.remove(); }, 300); }
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  ov.querySelector('.ok').onclick = close;
  requestAnimationFrame(function () { ov.classList.add('show'); });
}
function guide() {
  if (ios) return sheet('Pasang Nabillove di iPhone', 'Safari tidak punya tombol instal otomatis. Cukup 3 langkah:',
    ['Ketuk ikon <b>Bagikan</b> (kotak dengan panah ke atas) di bawah layar Safari.', 'Gulir lalu pilih <b>Tambah ke Layar Utama</b>.', 'Ketuk <b>Tambah</b> — ikon Nabillove muncul di layar utama.'], 'Harus dibuka lewat Safari, bukan dari dalam aplikasi lain.');
  if (android) return sheet('Pasang Nabillove', 'Browser belum memberi izin instal otomatis. Lakukan manual:',
    ['Ketuk menu <b>⋮</b> di pojok kanan atas browser.', 'Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.', 'Ketuk <b>Instal</b>.'], 'Tidak ada pilihan itu? Buka nabilove.com lewat <b>Chrome</b>. Jika sudah pernah dipasang, buka ikon Nabillove di layar utama.');
  return sheet('Pasang Nabillove', 'Instal sebagai aplikasi di komputer:',
    ['Klik ikon <b>Instal</b> di sisi kanan address bar (Chrome / Edge).', 'Atau menu <b>⋮</b> → <b>Instal Nabillove</b>.', 'Klik <b>Instal</b>.'], 'Situs harus dibuka lewat https.');
}
function click() {
  if (installed()) { if (typeof toast === 'function') toast('Aplikasi sudah terpasang di perangkat ini ✓', 'success'); return; }
  var e = dp();
  if (e) { go(e); return; }
  // beri waktu singkat bila browser baru saja siap
  var done = false, t = setTimeout(function () { if (!done) { done = true; guide(); } }, 900);
  window.addEventListener('nb-dp', function h() { window.removeEventListener('nb-dp', h); if (!done) { done = true; clearTimeout(t); go(dp()); } });
}
function go(e) {
  if (!e) { guide(); return; }
  try {
    e.prompt();
    e.userChoice.then(function (c) {
      window.__nbDP = null; sync();
      if (c && c.outcome === 'accepted') { if (typeof toast === 'function') toast('Memasang Nabillove… cek layar utama kamu ✓', 'success'); }
    });
  } catch (err) { window.__nbDP = null; guide(); }
}
function sync() { var on = !installed(); btns.forEach(function (b) { b.classList.toggle('show', on); }); }
function make(cls, label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'pwa-btn ' + (cls || ''); b.title = 'Pasang aplikasi'; b.setAttribute('aria-label', 'Pasang aplikasi'); b.innerHTML = '<i class="fas fa-download"></i><span class="lbl">' + (label || 'Pasang') + '</span>'; b.onclick = click; btns.push(b); return b; }
function mount() {
  var na = document.querySelector('.nav-actions'); if (na) na.insertBefore(make('', 'Pasang App'), na.firstChild);
  var tb = document.querySelectorAll('.db-topbar'); for (var i = 0; i < tb.length; i++) { var t = tb[i].querySelector('.db-theme'); var b = make('icon-only', ''); b.querySelector('.lbl').style.display = 'none'; tb[i].insertBefore(b, t ? t.nextSibling : null); }
  var nl = document.querySelector('.nav-links'); if (nl) nl.appendChild(make('block', 'Pasang Aplikasi di Perangkat'));
  var ft = document.querySelector('footer .footer-brand') || document.querySelector('footer'); if (ft) ft.appendChild(make('', 'Pasang Aplikasi'));
  sync();
}
window.addEventListener('nb-dp', sync);
window.addEventListener('appinstalled', function () { window.__nbDP = null; sync(); if (typeof toast === 'function') toast('Nabillove berhasil dipasang ✓', 'success'); });
if (!window.__nbDPHooked) { window.__nbDPHooked = 1; window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__nbDP = e; window.dispatchEvent(new Event('nb-dp')); }); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
