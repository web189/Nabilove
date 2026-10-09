/* Nabillove — patch v3 (dimuat setelah app.js)
   Menimpa fungsi dasbor + tema tanpa mengubah alur lain. ES5-style, aman untuk Chrome lama. */
(function () {
  'use strict';

  /* ---------- util ---------- */
  function notice(msg, icon, title) {
    showNotifModal(msg, icon);
    var h = document.querySelector('#notifModal .notif-header'); if (h) h.textContent = title;
    var box = document.querySelector('#notifContent > div'); if (box && box.lastElementChild && box.children.length > 2) box.removeChild(box.lastElementChild);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(o) { return parseInt(String(o.total || '0').replace(/[^0-9]/g, ''), 10) || 0; }
  function rp(n) { return 'Rp ' + n.toLocaleString('id-ID'); }
  function avatar(t) {
    var u = getTalentPhotoUrl(t.id);
    return '<div class="todo-av"' + (u ? ' style="background-image:url(\'' + esc(u) + '\')"' : '') + '>' + (u ? '' : esc(t.avatar || '✨')) + '</div>';
  }
  function today() { return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }

  /* ---------- TEMA: ikuti sistem, simpan pilihan, tanpa kedip ---------- */
  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  window.initTheme = function () {
    var s = null;
    try { s = localStorage.getItem('lovia_theme'); } catch (e) {}
    if (s !== 'dark' && s !== 'light') s = systemTheme();
    document.documentElement.setAttribute('data-theme', s);
    updateThemeIcon(s);
  };
  function syncMeta() {
    var t = document.documentElement.getAttribute('data-theme');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0f0a14' : '#fbf6f4');
    updateThemeIcon(t);
  }
  new MutationObserver(syncMeta).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var follow = function () {
      var saved = null; try { saved = localStorage.getItem('lovia_theme'); } catch (e) {}
      if (!saved) document.documentElement.setAttribute('data-theme', systemTheme());
    };
    if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
  }

  /* ---------- AUTH GUARD: dasbor tidak bisa dibuka tanpa login ---------- */
  var _showPage = window.showPage;
  window.showPage = function (p) {
    if (p === 'admin' && !(currentUser && currentUser.role === 'admin')) { showLoginModal(); return; }
    if (p === 'talent-dash' && !(currentUser && currentUser.role === 'talent')) { showLoginModal(); return; }
    return _showPage(p);
  };

  /* ---------- Escape input pengunjung (cegah HTML/script nyasar di dasbor) ---------- */
  var _send = window.sendInboxMessage;
  window.sendInboxMessage = function (m) {
    m = m || {};
    return _send({ name: esc(m.name), contact: esc(m.contact), message: esc(m.message), talentId: m.talentId, talentName: esc(m.talentName), source: m.source });
  };

  /* ---------- Tabel: label tiap sel supaya jadi kartu di HP ---------- */
  function labelTables() {
    var tables = document.querySelectorAll('.admin-table');
    for (var i = 0; i < tables.length; i++) {
      var heads = [].map.call(tables[i].querySelectorAll('thead th'), function (h) { return h.textContent.replace(/\s+/g, ' ').trim(); });
      var rows = tables[i].querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].children.length; c++) {
          if (heads[c] && !rows[r].children[c].hasAttribute('data-label')) rows[r].children[c].setAttribute('data-label', heads[c]);
        }
      }
    }
  }
  var pending = false;
  function queueLabel() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; labelTables(); }); }
  ['adminContent', 'talentContent'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) new MutationObserver(queueLabel).observe(el, { childList: true, subtree: true });
  });

  /* ---------- Tombol tema di topbar dasbor ---------- */
  [].forEach.call(document.querySelectorAll('.db-topbar'), function (bar) {
    if (bar.querySelector('.db-theme')) return;
    var b = document.createElement('button');
    b.className = 'db-theme'; b.type = 'button'; b.title = 'Ganti mode terang/gelap'; b.setAttribute('aria-label', 'Ganti mode terang/gelap');
    b.innerHTML = '<i class="fas fa-circle-half-stroke"></i>';
    b.onclick = function () { document.getElementById('themeToggle').click(); };
    var out = bar.querySelector('.btn-home');
    bar.insertBefore(b, out);
  });

  /* ---------- Tabel pesanan (aman + rapi) ---------- */
  window.ordersTable = function (orders, editable) {
    if (!orders.length) return '<div class="empty-mini">Belum ada pesanan.</div>';
    var st = ['Menunggu', 'Aktif', 'Selesai', 'Ditolak'];
    return '<table class="admin-table"><thead><tr><th>ID</th><th>Customer</th><th>Talent</th><th>Layanan</th><th>Tanggal</th><th>Total</th><th>Status</th>' + (editable ? '<th>Ubah</th>' : '') + '</tr></thead><tbody>' +
      orders.map(function (o) {
        var cls = o.status === 'Selesai' ? 'badge-done' : o.status === 'Aktif' ? 'badge-active' : o.status === 'Ditolak' ? 'badge-rejected' : 'badge-pending';
        return '<tr><td class="nw" style="color:var(--text-muted);font-size:.74rem">' + esc(o.id) + '</td>' +
          '<td><strong>' + esc(o.customer) + '</strong>' + (o.wa ? '<br><small style="color:var(--text-muted)">' + esc(o.wa) + '</small>' : '') + '</td>' +
          '<td>' + esc(o.talent) + '</td><td>' + esc(o.service) + '</td><td class="nw">' + esc(o.date) + '</td>' +
          '<td class="nw" style="font-weight:700;color:var(--pink-deep)">Rp ' + esc(o.total) + '</td>' +
          '<td><span class="status-badge ' + cls + '">' + esc(o.status) + '</span></td>' +
          (editable ? '<td><select class="sel" onchange="adminSetOrder(\'' + esc(o.id) + '\',this.value)">' + st.map(function (s) { return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' : '') +
          '</tr>';
      }).join('') + '</tbody></table>';
  };
  window.adminSetOrder = function (id, s) { updateOrderStatus(id, s); var a = document.querySelector('.admin-tab.active'); if (a && a.id === 'admin-tab-overview') renderAdminOverview(a); };
  window.talentSetOrder = function (id, s) { updateOrderStatus(id, s); showTalentTab('overview'); };

  /* ---------- ADMIN: overview ---------- */
  window.renderAdminOverview = function (el) {
    var T = getTalents(), O = getOrders();
    var pend = T.filter(function (t) { return t.pendingApproval && !t.verified; });
    var wait = O.filter(function (o) { return o.status === 'Menunggu'; });
    var rev = O.filter(function (o) { return o.status === 'Selesai'; }).reduce(function (s, o) { return s + money(o); }, 0);
    var online = T.filter(function (t) { return t.status === 'online'; }).length;
    function kpi(c, ic, v, l) { return '<div class="dash-stat-card"><div class="kpi"><div class="kpi-ico ' + c + '"><i class="fas ' + ic + '"></i></div><div><div class="kpi-val">' + v + '</div><div class="kpi-lab">' + l + '</div></div></div></div>'; }
    var todoP = pend.map(function (t) {
      return '<div class="todo">' + avatar(t) + '<div class="todo-main"><strong>' + esc(t.name) + '</strong><span>Pendaftar baru · ' + esc(t.location) + '</span></div><div class="todo-act"><button class="mini ok" onclick="approveTalent(\'' + t.id + '\')">Setujui</button><button class="mini no" onclick="rejectTalent(\'' + t.id + '\')">Tolak</button></div></div>';
    }).join('');
    var todoO = wait.map(function (o) {
      return '<div class="todo"><div class="todo-av"><i class="fas fa-bag-shopping" style="color:var(--pink-deep)"></i></div><div class="todo-main"><strong>' + esc(o.customer) + ' → ' + esc(o.talent) + '</strong><span>' + esc(o.service) + ' · Rp ' + esc(o.total) + '</span></div><div class="todo-act"><button class="mini ok" onclick="adminSetOrder(\'' + esc(o.id) + '\',\'Aktif\')">Terima</button><button class="mini no" onclick="adminSetOrder(\'' + esc(o.id) + '\',\'Ditolak\')">Tolak</button></div></div>';
    }).join('');
    el.innerHTML =
      '<div class="dh"><div><h2>Ringkasan hari ini</h2><p>' + today() + '</p></div><div style="display:flex;gap:.5rem"><button class="btn-sm" onclick="showAdminTab(\'talents\')"><i class="fas fa-users"></i> Talent</button><button class="btn-primary" style="padding:.6rem 1.1rem;font-size:.85rem" onclick="showAdminTab(\'orders\')"><i class="fas fa-bag-shopping"></i> Pesanan</button></div></div>' +
      '<div class="dash-grid-4">' + kpi('c', 'fa-wallet', rp(rev), 'Pendapatan selesai') + kpi('b', 'fa-hourglass-half', wait.length, 'Pesanan menunggu') + kpi('a', 'fa-circle', online + '/' + T.length, 'Talent online') + kpi('d', 'fa-user-clock', pend.length, 'Pendaftar baru') + '</div>' +
      '<div class="admin-2col-grid">' +
      '<div class="dash-section"><h3>Perlu tindakan</h3>' + ((todoP + todoO) || '<div class="empty-mini">Semua beres. Tidak ada yang menunggu.</div>') + '</div>' +
      '<div class="dash-section"><h3>Status pesanan</h3>' + ['Menunggu', 'Aktif', 'Selesai', 'Ditolak'].map(function (s) {
        var n = O.filter(function (o) { return o.status === s; }).length, pc = O.length ? Math.round(n * 100 / O.length) : 0;
        return '<div style="margin-bottom:.8rem"><div style="display:flex;justify-content:space-between;font-size:.84rem"><span>' + s + '</span><strong>' + n + '</strong></div><div class="meter"><i style="width:' + pc + '%"></i></div></div>';
      }).join('') + '</div></div>' +
      '<div class="dash-section"><h3>Pesanan terbaru</h3><div class="table-scroll">' + ordersTable(O.slice(0, 6), true) + '</div></div>';
  };

  /* ---------- ADMIN: talent (tanpa password terbuka) ---------- */
  window.buildTalentRows = function (talents) {
    return talents.map(function (t) {
      var pend = t.pendingApproval && !t.verified;
      var cls = t.status === 'online' ? 'badge-active' : t.status === 'busy' ? 'badge-pending' : 'badge-rejected';
      return '<tr><td><div class="who">' + avatar(t) + '<div><strong>' + esc(t.name) + '</strong><small>' + esc(t.gender) + ' · ' + esc(t.age) + ' thn</small></div></div></td>' +
        '<td>' + esc(t.location) + '</td><td><span class="status-badge ' + cls + '">' + esc(t.status) + '</span></td><td class="nw">⭐ ' + esc(t.rating) + '</td>' +
        '<td><span class="status-badge ' + (pend ? 'badge-pending' : t.verified ? 'badge-done' : 'badge-rejected') + '">' + (pend ? 'Menunggu seleksi' : t.verified ? 'Terverifikasi' : 'Belum') + '</span></td>' +
        '<td><div class="row-act">' +
        (pend ? '<button class="mini ok" onclick="approveTalent(\'' + t.id + '\')">Setujui</button><button class="mini no" onclick="rejectTalent(\'' + t.id + '\')">Tolak</button>'
              : '<button class="mini" onclick="toggleVerify(\'' + t.id + '\')">' + (t.verified ? 'Cabut' : 'Verifikasi') + '</button>') +
        '<button class="mini no" aria-label="Hapus" onclick="deleteTalent(\'' + t.id + '\')"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
  };
  window.renderAdminTalents = function (el) {
    var T = getTalents();
    el.innerHTML =
      '<div class="dh"><div><h2>Kelola talent</h2><p>' + T.length + ' talent terdaftar</p></div><div class="search-wrap" style="min-width:230px"><i class="fas fa-search"></i><input type="text" placeholder="Cari nama atau kota" oninput="adminSearchTalent(this.value)" /></div></div>' +
      '<div class="dash-section"><div class="table-scroll"><table class="admin-table"><thead><tr><th>Talent</th><th>Kota</th><th>Status</th><th>Rating</th><th>Verifikasi</th><th>Aksi</th></tr></thead><tbody id="adminTalentRows">' + buildTalentRows(T) + '</tbody></table></div></div>' +
      '<div class="dash-section"><h3>Akun login talent</h3><p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.8rem">Sandi tidak ditampilkan. Reset akan membuat sandi baru yang muncul satu kali untuk kamu sampaikan ke talent.</p>' +
      '<div class="table-scroll"><table class="admin-table"><thead><tr><th>Nama</th><th>Username</th><th>Aksi</th></tr></thead><tbody>' +
      T.map(function (t) { return '<tr><td><strong>' + esc(t.name) + '</strong></td><td><code>' + esc(t.username) + '</code></td><td><button class="mini" onclick="resetTalentPassword(\'' + t.id + '\')"><i class="fas fa-key"></i> Reset sandi</button></td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  };
  window.adminSearchTalent = function (q) {
    q = (q || '').toLowerCase();
    var rows = document.getElementById('adminTalentRows');
    if (rows) rows.innerHTML = buildTalentRows(getTalents().filter(function (t) { return t.name.toLowerCase().indexOf(q) > -1 || String(t.location).toLowerCase().indexOf(q) > -1; }));
  };
  window.resetTalentPassword = function (id) {
    var t = getTalents().filter(function (x) { return x.id === id; })[0]; if (!t) return;
    if (!confirm('Buat sandi baru untuk ' + t.name + '?')) return;
    var chars = 'abcdefghjkmnpqrstuvwxyz23456789', pw = '', a = new Uint32Array(8);
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < 8; i++) pw += chars.charAt(a[i] % chars.length);
    updateTalent(id, { password: pw });
    notice('Sandi baru ' + t.name + ' (username ' + t.username + '): ' + pw + '. Salin sekarang, sandi ini tidak akan ditampilkan lagi.', '🔑', 'Sandi baru dibuat');
  };

  /* ---------- ADMIN: pengaturan ---------- */
  window.renderAdminSettings = function (el) {
    el.innerHTML =
      '<div class="dh"><div><h2>Pengaturan</h2></div></div><div class="admin-2col-grid">' +
      '<div class="dash-section"><h3>Tampilan</h3><div style="display:flex;gap:.6rem;flex-wrap:wrap">' +
      '<button class="btn-sm" onclick="document.documentElement.setAttribute(\'data-theme\',\'light\');localStorage.setItem(\'lovia_theme\',\'light\')"><i class="fas fa-sun"></i> Terang</button>' +
      '<button class="btn-sm" onclick="document.documentElement.setAttribute(\'data-theme\',\'dark\');localStorage.setItem(\'lovia_theme\',\'dark\')"><i class="fas fa-moon"></i> Gelap</button>' +
      '<button class="btn-sm" onclick="localStorage.removeItem(\'lovia_theme\');initTheme()"><i class="fas fa-desktop"></i> Ikuti perangkat</button></div></div>' +
      '<div class="dash-section"><h3>Platform</h3><div style="font-size:.88rem;line-height:1.9">Versi: <strong>Nabillove v3</strong><br>Penyimpanan: <strong>browser perangkat ini (prototipe)</strong><br>Akun admin: <strong>admin</strong></div></div>' +
      '<div class="dash-section"><h3>Reset data</h3><p style="font-size:.82rem;color:var(--text-muted);margin-bottom:1rem">Mengembalikan semua data contoh. Tidak bisa dibatalkan.</p><button class="mini no" onclick="resetData()">Reset semua data</button></div></div>';
  };

  /* ---------- TALENT: overview ---------- */
  window.renderTalentOverview = function (el, t) {
    if (!t) { el.innerHTML = '<div class="empty-mini">Data tidak ditemukan.</div>'; return; }
    var mine = getOrders().filter(function (o) { return o.talent === t.name; });
    function n(s) { return mine.filter(function (o) { return o.status === s; }).length; }
    var earn = mine.filter(function (o) { return o.status === 'Selesai'; }).reduce(function (s, o) { return s + money(o); }, 0);
    var gal = (getTalentGallery(t.id) || []).filter(Boolean).length;
    var checks = [['Foto utama', !!getTalentPhotoUrl(t.id)], ['Galeri foto', gal > 0], ['Bio', !!(t.bio && t.bio.length > 20)], ['Hobi', !!t.hobbies], ['Layanan', (t.services || []).length > 0], ['Jadwal', (t.schedule || []).length > 0], ['Instagram', !!t.ig]];
    var done = checks.filter(function (c) { return c[1]; }).length, pc = Math.round(done * 100 / checks.length);
    var missing = checks.filter(function (c) { return !c[1]; }).map(function (c) { return c[0]; });
    var on = t.status === 'online';
    function kpi(c, ic, v, l) { return '<div class="dash-stat-card"><div class="kpi"><div class="kpi-ico ' + c + '"><i class="fas ' + ic + '"></i></div><div><div class="kpi-val">' + v + '</div><div class="kpi-lab">' + l + '</div></div></div></div>'; }
    var wait = mine.filter(function (o) { return o.status === 'Menunggu'; });
    el.innerHTML =
      '<div class="dh"><div><h2>Halo, ' + esc(t.nickname || t.name) + '</h2><p>' + today() + '</p></div>' +
      '<button class="switch ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + on + '" onclick="toggleTalentStatus(\'' + t.id + '\')"><span class="knob"></span>' + (on ? 'Online, terlihat pelanggan' : 'Offline, disembunyikan') + '</button></div>' +
      '<div class="dash-grid-4">' + kpi('b', 'fa-hourglass-half', n('Menunggu'), 'Menunggu respons') + kpi('c', 'fa-circle-play', n('Aktif'), 'Sedang berjalan') + kpi('d', 'fa-circle-check', n('Selesai'), 'Selesai') + kpi('a', 'fa-wallet', rp(earn), 'Pendapatan') + '</div>' +
      '<div class="admin-2col-grid">' +
      '<div class="dash-section"><h3>Booking perlu respons</h3>' + (wait.length ? wait.map(function (o) {
        return '<div class="todo"><div class="todo-av"><i class="fas fa-bag-shopping" style="color:var(--pink-deep)"></i></div><div class="todo-main"><strong>' + esc(o.customer) + '</strong><span>' + esc(o.service) + ' · ' + esc(o.date) + ' · Rp ' + esc(o.total) + '</span></div><div class="todo-act"><button class="mini ok" onclick="talentSetOrder(\'' + esc(o.id) + '\',\'Aktif\')">Terima</button><button class="mini no" onclick="talentSetOrder(\'' + esc(o.id) + '\',\'Ditolak\')">Tolak</button></div></div>';
      }).join('') : '<div class="empty-mini">Belum ada booking baru. Pastikan statusmu online.</div>') + '</div>' +
      '<div class="dash-section"><h3>Kelengkapan profil · ' + pc + '%</h3><div class="meter"><i style="width:' + pc + '%"></i></div>' +
      '<p style="font-size:.84rem;color:var(--text-sec);margin:.6rem 0 .9rem">' + (missing.length ? 'Lengkapi: ' + missing.join(', ') + '. Profil lengkap lebih sering dipilih.' : 'Profilmu sudah lengkap.') + '</p>' +
      '<button class="btn-sm" onclick="showTalentTab(\'profile\')"><i class="fas fa-user-pen"></i> Edit profil &amp; foto</button></div></div>' +
      '<div class="dash-section"><h3>Booking terbaru</h3><div class="table-scroll">' + ordersTable(mine.slice(0, 5)) + '</div></div>';
  };


  /* =====================================================
     JAM OPERASIONAL — booking hanya dalam jam buka (WIB),
     melihat talent tetap bisa kapan saja.
     ===================================================== */
  var HOURS = { enabled: true, open: 8, close: 23 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtH(h) { return pad(h) + '.00'; }
  function wibHour() {
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var h = 0, m = 0;
    p.forEach(function (x) { if (x.type === 'hour') h = parseInt(x.value, 10) % 24; if (x.type === 'minute') m = parseInt(x.value, 10); });
    return h + m / 60;
  }
  function isOpen() { return !HOURS.enabled || (wibHour() >= HOURS.open && wibHour() < HOURS.close); }
  window.loviaIsOpen = isOpen;
  function hoursText() { return fmtH(HOURS.open) + '–' + fmtH(HOURS.close) + ' WIB'; }
  function closedMsg() {
    return 'Booking dibuka setiap hari pukul ' + hoursText() + '. Sekarang sedang tutup, jadi booking baru bisa dilakukan mulai pukul ' + fmtH(HOURS.open) + '. Kamu tetap bisa melihat-lihat talent dan mengirim pesan ke admin.';
  }
  function refreshHours() {
    var open = isOpen();
    document.body.classList.toggle('closed', !open);
    var label = HOURS.enabled ? (open ? 'Booking buka sekarang · ' + hoursText() : 'Booking tutup · buka lagi ' + fmtH(HOURS.open) + ' WIB') : 'Booking buka 24 jam';
    var chip = document.getElementById('hoursChip');
    if (!chip) {
      var hs = document.querySelector('.hero-content');
      if (hs) { chip = document.createElement('div'); chip.id = 'hoursChip'; chip.className = 'hours-chip'; chip.innerHTML = '<span class="dot"></span><span class="t"></span>'; hs.appendChild(chip); }
    }
    if (chip) { chip.classList.toggle('open', open); chip.querySelector('.t').textContent = label; }
    var bar = document.getElementById('hoursBar'), grid = document.getElementById('talentGrid');
    if (!bar && grid && grid.parentNode) {
      bar = document.createElement('div'); bar.id = 'hoursBar'; bar.className = 'hours-bar';
      bar.style.borderRadius = '14px'; bar.style.marginBottom = '1rem';
      grid.parentNode.insertBefore(bar, grid);
    }
    if (bar) {
      bar.classList.toggle('open', open);
      bar.innerHTML = '<span class="dot"></span><span>' + (open ? 'Booking buka sekarang (' + hoursText() + ')' : 'Sedang di luar jam operasional. Booking buka pukul <b>' + fmtH(HOURS.open) + ' WIB</b>, melihat talent tetap bisa.') + '</span>';
      bar.style.display = HOURS.enabled ? '' : 'none';
    }
  }
  try {
    db.ref('settings/hours').on('value', function (snap) {
      var v = snap.val();
      if (v) { HOURS = { enabled: v.enabled !== false, open: +v.open, close: +v.close }; }
      refreshHours();
    });
  } catch (e) {}
  setInterval(refreshHours, 60000);
  ['openBooking', 'openBookingFromPrice', 'submitBookingFinal'].forEach(function (fn) {
    var orig = window[fn];
    window[fn] = function () {
      if (!isOpen()) { closeModal('bookingModal'); notice(closedMsg(), '🌙', 'Booking sedang tutup'); return; }
      return orig.apply(this, arguments);
    };
  });
  var _sp2 = window.showPage;
  window.showPage = function (p) { var r = _sp2(p); setTimeout(refreshHours, 80); return r; };

  /* =====================================================
     LABEL TALENT (Best Talent, Favorit, dll) — diatur admin
     ===================================================== */
  var LABELS = ['', 'Best Talent', 'Favorit', 'Top Rated', 'Baru'];
  function rank(t) { var i = LABELS.indexOf(t.badge || ''); return t.badge ? (i < 0 ? 1 : i) : 99; }
  ['renderShowcase', 'renderTalents'].forEach(function (fn) {
    var orig = window[fn];
    window[fn] = function () {
      var g = window.getTalents;
      window.getTalents = function () { return g().slice().sort(function (a, b) { return rank(a) - rank(b); }); };
      try { return orig.apply(this, arguments); } finally { window.getTalents = g; }
    };
  });
  function decorate(root) {
    [].forEach.call(root.querySelectorAll('.talent-card'), function (c) {
      if (c.getAttribute('data-deco')) return;
      c.setAttribute('data-deco', '1');
      var m = /openTalentDetail\('([^']+)'\)/.exec(c.getAttribute('onclick') || ''); if (!m) return;
      var t = getTalents().filter(function (x) { return x.id === m[1]; })[0];
      if (!t || !t.badge) return;
      var ph = c.querySelector('.tc-photo'); if (!ph) return;
      var d = document.createElement('div'); d.className = 'tc-label'; d.textContent = '★ ' + t.badge; ph.appendChild(d);
      c.classList.add('is-best');
    });
  }
  ['talentGrid', 'talentShowcase'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { new MutationObserver(function () { decorate(el); }).observe(el, { childList: true }); decorate(el); }
  });
  window.adminSetBadge = function (id, v) { updateTalent(id, { badge: v }); toast(v ? 'Label "' + v + '" dipasang' : 'Label dihapus', 'success'); };
  window.adminToggleStatus = function (id) {
    var t = getTalents().filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var n = t.status === 'online' ? 'offline' : 'online';
    updateTalent(id, { status: n }); toast(t.name + ' kini ' + n, 'info');
    renderAdminTalents(document.getElementById('admin-tab-talents'));
  };
  window.saveHours = function () {
    var en = document.getElementById('hrEnabled').checked, o = +document.getElementById('hrOpen').value, c = +document.getElementById('hrClose').value;
    if (!(o >= 0 && o <= 23 && c >= 1 && c <= 24 && c > o)) { toast('Jam tutup harus setelah jam buka', 'error'); return; }
    db.ref('settings/hours').set({ enabled: en, open: o, close: c });
    toast('Jam operasional disimpan', 'success');
  };

  /* tabel talent admin: status bisa diklik + kolom label */
  window.buildTalentRows = function (talents) {
    return talents.map(function (t) {
      var pend = t.pendingApproval && !t.verified, on = t.status === 'online';
      return '<tr><td><div class="who">' + avatar(t) + '<div><strong>' + esc(t.name) + '</strong><small>' + esc(t.gender) + ' · ' + esc(t.age) + ' thn · ⭐ ' + esc(t.rating) + '</small></div></div></td>' +
        '<td>' + esc(t.location) + '</td>' +
        '<td><button class="mini" title="Klik untuk ganti online/offline" onclick="adminToggleStatus(\'' + t.id + '\')"><span class="status-badge ' + (on ? 'badge-active' : 'badge-rejected') + '">' + (on ? 'online' : 'offline') + '</span></button></td>' +
        '<td><select class="sel sel-label" onchange="adminSetBadge(\'' + t.id + '\',this.value)">' + LABELS.map(function (l) { return '<option value="' + l + '"' + ((t.badge || '') === l ? ' selected' : '') + '>' + (l || 'Tanpa label') + '</option>'; }).join('') + '</select></td>' +
        '<td><span class="status-badge ' + (pend ? 'badge-pending' : t.verified ? 'badge-done' : 'badge-rejected') + '">' + (pend ? 'Menunggu seleksi' : t.verified ? 'Terverifikasi' : 'Belum') + '</span></td>' +
        '<td><div class="row-act">' +
        (pend ? '<button class="mini ok" onclick="approveTalent(\'' + t.id + '\')">Setujui</button><button class="mini no" onclick="rejectTalent(\'' + t.id + '\')">Tolak</button>'
              : '<button class="mini" onclick="toggleVerify(\'' + t.id + '\')">' + (t.verified ? 'Cabut' : 'Verifikasi') + '</button>') +
        '<button class="mini no" aria-label="Hapus" onclick="deleteTalent(\'' + t.id + '\')"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
  };
  var _rat = window.renderAdminTalents;
  window.renderAdminTalents = function (el) {
    _rat(el);
    var th = el.querySelector('thead tr'); // sisipkan header Label setelah Status
    if (th && th.children.length === 6) { var h = document.createElement('th'); h.textContent = 'Label'; th.insertBefore(h, th.children[3]); }
  };

  /* pengaturan: tambah kartu jam operasional */
  var _ras = window.renderAdminSettings;
  window.renderAdminSettings = function (el) {
    _ras(el);
    var opts = function (from, to, sel) { var s = ''; for (var i = from; i <= to; i++) s += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + fmtH(i) + '</option>'; return s; };
    var box = document.createElement('div'); box.className = 'dash-section';
    box.innerHTML = '<h3>Jam operasional booking</h3><p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.9rem">Di luar jam ini pengunjung tetap bisa melihat talent, tetapi tidak bisa booking. Waktu mengikuti WIB.</p>' +
      '<label style="display:flex;gap:.5rem;align-items:center;margin-bottom:.8rem;font-weight:600"><input type="checkbox" id="hrEnabled"' + (HOURS.enabled ? ' checked' : '') + '> Batasi jam booking</label>' +
      '<div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem"><select class="sel" id="hrOpen">' + opts(0, 23, HOURS.open) + '</select><span>sampai</span><select class="sel" id="hrClose">' + opts(1, 24, HOURS.close) + '</select></div>' +
      '<button class="btn-primary" style="padding:.6rem 1.2rem;font-size:.85rem" onclick="saveHours()">Simpan jam</button>';
    var grid = el.querySelector('.admin-2col-grid'); (grid || el).insertBefore(box, grid ? grid.firstChild : null);
  };

  /* talent: tombol libur cepat */
  var _rto = window.renderTalentOverview;
  window.renderTalentOverview = function (el, t) {
    _rto(el, t);
    if (!t) return;
    var note = document.createElement('p');
    note.style.cssText = 'font-size:.82rem;color:var(--text-muted);margin:-.6rem 0 1rem';
    note.textContent = t.status === 'online'
      ? 'Lagi berhalangan hari ini? Ubah ke Offline lewat saklar di atas, kamu tidak akan bisa dibooking sampai online lagi. Jam booking: ' + hoursText() + '.'
      : 'Kamu sedang offline dan tidak muncul untuk dibooking. Aktifkan lagi lewat saklar di atas saat siap.';
    var dh = el.querySelector('.dh'); if (dh && dh.nextSibling) el.insertBefore(note, dh.nextSibling);
  };

  refreshHours();
  labelTables();
  syncMeta();
})();
