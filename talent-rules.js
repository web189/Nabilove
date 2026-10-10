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

  var _next = window.regNext;
  if (typeof _next === 'function') {
    window.regNext = function (step) {
      if (step === 1 && !guard(['reg_panggilan'], { reg_panggilan: 'Nama panggilan' })) return;
      if (step === 2 && !guard(['reg_bio', 'reg_exp'], { reg_bio: 'Bio', reg_exp: 'Pengalaman' })) return;
      return _next.apply(this, arguments);
    };
  }

  var _submit = window.submitRegister;
  if (typeof _submit === 'function') {
    window.submitRegister = function () {
      var u = $('reg_umur'); if (u && +u.value < 18) { toast('Minimal usia 18 tahun!', 'error'); return; }
      if (!guard(['reg_panggilan', 'reg_bio', 'reg_exp'], { reg_panggilan: 'Nama panggilan', reg_bio: 'Bio', reg_exp: 'Pengalaman' })) return;
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
