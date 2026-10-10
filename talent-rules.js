/* Nabillove — talent-rules.js
   Peraturan pendaftaran talent: akordeon (HP) / grid terbuka (PC), modal "Baca peraturan lengkap",
   persetujuan wajib, dan larangan akun sosial media / tautan / nomor kontak pada profil talent. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }

  /* ---------- 1. Akordeon: di PC semua terbuka, di HP hanya yang pertama ---------- */
  var mq = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: true };
  var touched = false;
  function sync() {
    var cards = document.querySelectorAll('#talentRules details.rule-card');
    for (var i = 0; i < cards.length; i++) {
      if (mq.matches) { cards[i].open = true; cards[i].classList.add('locked'); }
      else { cards[i].classList.remove('locked'); if (!touched) cards[i].open = (i === 0); }
    }
  }
  /* HP: membuka satu ketentuan otomatis menutup yang lain (tampilan lebih ringkas) */
  [].forEach.call(document.querySelectorAll('#talentRules details.rule-card'), function (d) {
    d.addEventListener('toggle', function () {
      if (mq.matches || !d.open) return;
      [].forEach.call(document.querySelectorAll('#talentRules details.rule-card'), function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener('click', function (e) {
    var s = e.target.closest ? e.target.closest('#talentRules summary') : null;
    if (!s) return;
    if (mq.matches) { e.preventDefault(); return; } /* PC: tidak bisa ditutup */
    touched = true;
  });
  if (mq.addEventListener) mq.addEventListener('change', sync); else if (mq.addListener) mq.addListener(sync);
  sync();

  /* ---------- 2. Modal peraturan lengkap (dipakai di langkah 3) ---------- */
  window.openRulesModal = function () {
    var src = document.querySelector('#talentRules .rules-grid'); if (!src || !window.nbOverlay) return;
    var grid = src.cloneNode(true);
    [].forEach.call(grid.querySelectorAll('details'), function (d) { d.open = true; d.classList.add('locked'); });
    var ov = window.nbOverlay('<div class="nb-head"><h3>Peraturan &amp; Ketentuan Talent</h3><button type="button" class="nb-x2" aria-label="Tutup">✕</button></div><div class="rules-modal-body"></div><div class="nb-btns"><button type="button" class="nb-btn nb-x">Saya mengerti</button></div>', 'wide');
    ov.querySelector('.rules-modal-body').appendChild(grid);
    ov.querySelector('.rules-modal-body').classList.add('rules-in-modal');
    ov.querySelector('.nb-x').onclick = ov.querySelector('.nb-x2').onclick = function () { window.nbCloseOv(ov); };
  };

  /* ---------- 3. Larangan sosial media / tautan / kontak pribadi ---------- */
  var BLOCK = [
    /@[a-z0-9._]{2,}/i,                                                         /* @username / email */
    /(https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|\.com\b|\.id\b|\.me\b)/i,          /* tautan */
    /\b(instagram|insta|ig|tiktok|tik\s?tok|telegram|facebook|fb|youtube|twitter|snapchat|whatsapp|wa)\b/i, /* nama platform */
    /(\+?62|\b0)\s?8[\d\s.\-]{7,}/                                               /* nomor HP */
  ];
  function hasContact(text) { text = String(text || ''); for (var i = 0; i < BLOCK.length; i++) if (BLOCK[i].test(text)) return true; return false; }
  window.nbHasSocialOrContact = hasContact;
  var MSG = 'Tidak boleh memuat akun sosial media, tautan, atau nomor kontak pribadi.';
  function guard(ids, label) {
    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);
      if (el && hasContact(el.value)) { toast((label[ids[i]] || 'Isian') + ': ' + MSG, 'error'); try { el.focus(); } catch (e) {} return false; }
    }
    return true;
  }

  /* ---------- 4. Validasi formulir (langkah 1 & 2) ---------- */
  function val(id) { var e = $(id); return e ? String(e.value).trim() : ''; }
  function radio(n) { var e = document.querySelector('input[name="' + n + '"]:checked'); return e ? e.value : ''; }
  function fail(msg, id) { toast(msg, 'error'); var el = id && $(id); if (el) { try { el.focus(); } catch (e) {} if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } return false; }

  /* @username / username / tautan profil -> "username" (atau null bila tidak valid) */
  function parseHandle(raw) {
    var s = String(raw || '').trim(); if (!s) return '';
    if (/\//.test(s) || /(instagram|tiktok)\./i.test(s)) {
      var seg = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[?#]/)[0].split('/').filter(Boolean);
      s = seg[1] || '';
    }
    s = s.replace(/^@/, '');
    return /^[A-Za-z0-9._]{2,30}$/.test(s) ? s : null;
  }

  function checkStep1() {
    var need = ['reg_nama', 'reg_panggilan', 'reg_umur', 'reg_gender', 'reg_kota', 'reg_wa', 'reg_email', 'reg_tinggi', 'reg_berat'];
    for (var i = 0; i < need.length; i++) if (!val(need[i])) return fail('Lengkapi semua field *!', need[i] === 'reg_gender' ? null : need[i]);
    if (+val('reg_umur') < 18) return fail('Minimal usia 18 tahun!', 'reg_umur');
    var tb = +val('reg_tinggi'), bb = +val('reg_berat');
    if (tb < 130 || tb > 220) return fail('Tinggi badan tidak valid (130–220 cm).', 'reg_tinggi');
    if (bb < 30 || bb > 150) return fail('Berat badan tidak valid (30–150 kg).', 'reg_berat');
    if (!guard(['reg_panggilan'], { reg_panggilan: 'Nama panggilan' })) return false;
    var st = radio('reg_status');
    if (!st) return fail('Pilih status hubungan kamu.');
    if (st !== 'Single') return fail('Mohon maaf, pendaftar wajib berstatus single.');
    return true;
  }
  function checkStep2() {
    if (val('reg_bio').length < 20) return fail('Bio minimal 20 karakter!', 'reg_bio');
    if (val('reg_alasan').length < 10) return fail('Alasan ingin bergabung minimal 10 karakter.', 'reg_alasan');
    if (!guard(['reg_bio', 'reg_alasan'], { reg_bio: 'Bio', reg_alasan: 'Alasan' })) return false;
    if (!radio('reg_pengalaman')) return fail('Pilih pengalaman: pernah atau belum pernah jadi talent.');
    var ig = parseHandle(val('reg_ig')), tk = parseHandle(val('reg_tiktok'));
    if (ig === null) return fail('Username Instagram tidak valid (huruf, angka, titik, garis bawah).', 'reg_ig');
    if (tk === null) return fail('Username TikTok tidak valid (huruf, angka, titik, garis bawah).', 'reg_tiktok');
    if (!ig && !tk) return fail('Isi minimal satu akun sosial media (Instagram atau TikTok). Hanya dilihat admin.', 'reg_ig');
    $('reg_ig').value = ig || ''; $('reg_tiktok').value = tk || '';   /* simpan dalam bentuk bersih */
    return true;
  }

  var _next = window.regNext;
  if (typeof _next === 'function') {
    window.regNext = function (step) {
      if (step === 1 && !checkStep1()) return;
      if (step === 2 && !checkStep2()) return;
      return _next.apply(this, arguments);
    };
  }

  var _submit = window.submitRegister;
  if (typeof _submit === 'function') {
    window.submitRegister = function () {
      if (!checkStep1()) { goRegStep(1); return; }
      if (!checkStep2()) { goRegStep(2); return; }
      var c = $('reg_agree');
      if (!c || !c.checked) {
        toast('Centang pernyataan persetujuan untuk mengirim pendaftaran', 'error');
        var box = document.querySelector('.agree-box'); if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
      return _submit.apply(this, arguments);
    };
  }

  /* dasbor talent: bio & hobi juga tidak boleh memuat sosmed/kontak */
  var _save = window.saveTalentProfile;
  if (typeof _save === 'function') {
    window.saveTalentProfile = function () {
      if (!guard(['editBio', 'editHobi'], { editBio: 'Bio', editHobi: 'Hobi' })) return;
      return _save.apply(this, arguments);
    };
  }
})();
