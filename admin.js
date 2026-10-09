/* Nabilove — admin.js (dimuat setelah patch.js). Login hanya admin, kelola talent, reset data 2 tahap. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---- hanya admin: buang sesi talent lama, blokir halaman talent ---- */
  try { if (currentUser && currentUser.role !== 'admin') { currentUser = null; localStorage.removeItem('lovia_session'); } } catch (e) {}
  var _sp = window.showPage;
  window.showPage = function (p, a, b) { if (p === 'talent-dash') p = 'landing'; return _sp.call(this, p, a, b); };

  /* ---- Firebase live: login admin lewat Authentication, data privat hanya untuk admin ---- */
  var live = window.__fbLive === true, appsCache = {}, attached = false;
  function becomeAdmin() { currentUser = { role: 'admin', name: 'Admin Nabilove', username: 'admin' }; lsSet('lovia_session', currentUser); attachPrivate(); }
  function attachPrivate() {
    if (attached) return; attached = true;
    db.ref('orders').on('value', function (sn) { var v = nbEsc(sn.val()); _ordersCache = v ? Object.keys(v).map(function (k) { return v[k]; }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }) : []; });
    db.ref('inbox').on('value', function (sn) { _inboxCache = nbEsc(sn.val() || {}); updateInboxBadge(); var el = $('admin-tab-inbox'); if (el && el.classList.contains('active')) renderAdminInbox(el); });
    db.ref('talentApplications').on('value', function (sn) { appsCache = sn.val() || {}; var el = $('admin-tab-talents'); if (el && el.classList.contains('active')) renderAdminTalents(el); });
  }
  if (live) {
    try { var lbl = $('loginUser').closest('.form-group').querySelector('label'); if (lbl) lbl.textContent = 'Email admin'; $('loginUser').placeholder = 'admin@nabilove.com'; } catch (e) {}
    auth.onAuthStateChanged(function (u) {
      if (!u) { attached = false; if (currentUser && currentUser.role === 'admin') { currentUser = null; try { localStorage.removeItem('lovia_session'); } catch (e) {} if (currentPage === 'admin') showPage('landing'); } return; }
      db.ref('admins/' + u.uid).once('value').then(function (sn) { if (sn.val() === true) { if (!currentUser || currentUser.role !== 'admin') becomeAdmin(); else attachPrivate(); } else auth.signOut(); }).catch(function () {});
    });
    var _lo = window.logout; window.logout = function () { try { auth.signOut(); } catch (e) {} return _lo.apply(this, arguments); };
  }
  window.handleLogin = function () {
    var u = ($('loginUser') || {}).value || '', p = ($('loginPass') || {}).value || '';
    u = u.trim(); if (!u || !p.trim()) { toast('Isi email dan password!', 'error'); return; }
    if (live) {
      var email = u.indexOf('@') > -1 ? u : u + '@nabilove.com';
      auth.signInWithEmailAndPassword(email, p).then(function (c) {
        return db.ref('admins/' + c.user.uid).once('value').then(function (sn) {
          if (sn.val() === true) { becomeAdmin(); closeModal('loginModal'); toast('Selamat datang, Admin! 👑', 'success'); setTimeout(function () { showPage('admin'); }, 400); }
          else { auth.signOut(); toast('Akun ini bukan admin', 'error'); }
        });
      }).catch(function (e) { toast(e && (e.code === 'auth/operation-not-allowed' || e.code === 'auth/configuration-not-found') ? 'Aktifkan Email/Password di Firebase Authentication' : 'Email atau password salah!', 'error'); });
      return;
    }
    if (u === 'admin' && p === 'admin123') { becomeAdminLocal(); return; }
    toast('Username atau password salah!', 'error');
  };
  function becomeAdminLocal() { currentUser = { role: 'admin', name: 'Admin Nabilove', username: 'admin' }; lsSet('lovia_session', currentUser); attachPrivate(); closeModal('loginModal'); toast('Selamat datang, Admin! 👑', 'success'); setTimeout(function () { showPage('admin'); }, 400); }

  /* ---- Pendaftaran talent: masuk ke antrean (bukan ke data publik) ---- */
  window.submitRegister = function () {
    var services = [].map.call(document.querySelectorAll('.reg-service:checked'), function (c) { return c.value; }), schedule = [].map.call(document.querySelectorAll('.reg-schedule:checked'), function (c) { return c.value; });
    if (!services.length) { toast('Pilih minimal 1 layanan!', 'error'); return; }
    if (!schedule.length) { toast('Pilih minimal 1 jadwal!', 'error'); return; }
    function v(id) { var e = $(id); return e ? String(e.value).trim() : ''; }
    var id = 'ta' + String(Date.now()).slice(-7) + Math.random().toString(36).slice(2, 5), em = ['🌸', '🌺', '🌙', '⭐', '✨', '🎵', '💫', '🦋'];
    var a = { id: id, name: v('reg_nama').slice(0, 100), nickname: v('reg_panggilan').slice(0, 50), age: +v('reg_umur') || 0, gender: v('reg_gender'), location: v('reg_kota').slice(0, 80), bio: v('reg_bio').slice(0, 1000), hobbies: '', services: services, schedule: schedule,
      avatar: em[Math.floor(Math.random() * em.length)], ig: v('reg_ig').slice(0, 60), tiktok: v('reg_tiktok').slice(0, 60), email: v('reg_email').slice(0, 120), wa: v('reg_wa').slice(0, 30), createdAt: Date.now(), status: 'Menunggu Seleksi' };
    if (!a.name || !a.wa) { toast('Nama dan nomor WhatsApp wajib diisi', 'error'); return; }
    db.ref('talentApplications/' + id).set(a).then(function () {
      toast('Pendaftaran berhasil! 🎉', 'success');
      showNotifModal('Pendaftaran berhasil!<br><br>Data kamu masuk antrean seleksi admin. Admin akan menghubungi via WhatsApp dalam 1×24 jam.', '🌟');
      setTimeout(function () { showPage('landing'); }, 3000);
    }).catch(function () { toast('Gagal mengirim, periksa koneksi lalu coba lagi', 'error'); });
  };
  function pendingApps() { return Object.keys(appsCache).map(function (k) { return appsCache[k]; }).filter(function (a) { return a && a.status === 'Menunggu Seleksi'; }).sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); }); }
  window.approveApp = function (id) {
    var a = appsCache[id]; if (!a) return;
    function cl(x) { return String(x == null ? '' : x).replace(/[<>"`\\]/g, ''); }
    var t = { id: a.id, name: cl(a.name), nickname: cl(a.nickname), age: +a.age || 18, gender: cl(a.gender), location: cl(a.location), bio: cl(a.bio), hobbies: cl(a.hobbies), services: (a.services || []).map(cl), schedule: (a.schedule || []).map(cl), rating: 5, bookings: 0, price: '', status: 'offline', avatar: cl(a.avatar) || '🌸', ig: cl(a.ig), tiktok: cl(a.tiktok), verified: true };
    setTalents(getTalents().concat([t])); db.ref('talentApplications/' + id + '/status').set('Disetujui');
    toast('Pendaftar di-ACC ✓ Lengkapi nama & foto talent', 'success'); showAdminTab('talents'); openTalentEditor(id);
  };
  window.rejectApp = function (id) {
    var a = appsCache[id]; if (!a) return;
    nbConfirm({ icon: '✖️', title: 'Tolak ' + esc(a.name) + '?', msg: 'Pendaftaran ini akan ditandai ditolak.', ok: 'Tolak', danger: true }, function () { db.ref('talentApplications/' + id + '/status').set('Ditolak'); toast('Pendaftar ditolak', 'info'); });
  };
  function appsBox() {
    var L = pendingApps(); if (!L.length) return '';
    return '<div class="dash-section nb-pendbox"><h3>Pendaftar baru (' + L.length + ')</h3>' + L.map(function (a) {
      return '<div class="nb-app"><div class="nb-app-i"><strong>' + esc(a.name) + '</strong> · ' + esc(a.age) + ' thn · ' + esc(a.location) + '<small>WA: ' + esc(a.wa) + (a.email ? ' · ' + esc(a.email) : '') + (a.ig ? ' · IG ' + esc(a.ig) : '') + '</small><small>Layanan: ' + esc((a.services || []).join(', ')) + '</small>' + (a.bio ? '<p>' + esc(a.bio) + '</p>' : '') + '</div>' +
        '<div class="row-act"><button type="button" class="mini ok" onclick="approveApp(\'' + esc(a.id) + '\')">ACC</button><button type="button" class="mini no" onclick="rejectApp(\'' + esc(a.id) + '\')">Tolak</button></div></div>';
    }).join('') + '</div>';
  }

  /* ---- ketuk logo 5x = buka login admin ---- */
  var taps = 0, tmr = null;
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('.nav-logo,.footer-logo'); if (!l) return;
    taps++; clearTimeout(tmr); tmr = setTimeout(function () { taps = 0; }, 2200);
    if (taps >= 5) { taps = 0; if (currentUser && currentUser.role === 'admin') showPage('admin'); else { var u = $('loginUser'); if (u) u.value = ''; var p = $('loginPass'); if (p) p.value = ''; showLoginModal(); } }
  }, true);

  /* ---- bersihkan sisa "Mabar" pada data lama yang tersimpan ---- */
  var _gt = window.getTalents;
  window.getTalents = function () {
    return _gt().map(function (t) {
      var bio = t.bio && /mabar/i.test(t.bio) ? t.bio.replace(/mabar/gi, 'ngobrol') : t.bio;
      var sv = t.services && t.services.indexOf('Mabar') > -1 ? t.services.filter(function (s) { return s !== 'Mabar'; }) : t.services;
      return (bio !== t.bio || sv !== t.services) ? Object.assign({}, t, { bio: bio, services: sv }) : t;
    });
  };
  var pubMode = false;
  ['renderTalents', 'renderShowcase', 'renderHome', 'openTalentDetail'].forEach(function (n) {
    var f = window[n]; if (!f) return;
    window[n] = function () { pubMode = true; try { return f.apply(this, arguments); } finally { pubMode = false; } };
  });
  var _gt2 = window.getTalents;
  window.getTalents = function () { var T = _gt2(); return pubMode ? T.filter(function (t) { return !(t.pendingApproval && !t.verified); }) : T; };
  var _gp = window.getPricelist;
  window.getPricelist = function () { var p = _gp(); if (p && p.mabar) { p = Object.assign({}, p); delete p.mabar; } return p; };
  var _gts = window.getTestimonials;
  window.getTestimonials = function () { return (_gts() || []).filter(function (t) { return !/mabar/i.test((t.text || '') + (t.service || '')); }); };

  /* ---- dialog ---- */
  function overlay(html, cls) {
    var o = document.createElement('div'); o.className = 'nb-ov';
    o.innerHTML = '<div class="nb-box ' + (cls || '') + '">' + html + '</div>';
    document.body.appendChild(o); document.body.classList.add('nb-lock'); return o;
  }
  function closeOv(o) { if (o && o.parentNode) o.parentNode.removeChild(o); if (!document.querySelector('.nb-ov')) document.body.classList.remove('nb-lock'); }
  function nbConfirm(o, cb) {
    var ov = overlay('<div class="nb-ico">' + (o.icon || '❓') + '</div><h3>' + o.title + '</h3><p>' + o.msg + '</p><div class="nb-btns"><button type="button" class="nb-btn ghost nb-x">Batal</button><button type="button" class="nb-btn ' + (o.danger ? 'danger' : '') + ' nb-ok">' + o.ok + '</button></div>');
    ov.querySelector('.nb-x').onclick = function () { closeOv(ov); };
    ov.querySelector('.nb-ok').onclick = function () { closeOv(ov); cb(); };
  }
  window.nbConfirm = nbConfirm;

  /* ---- RESET DATA: 2 pertanyaan ---- */
  window.resetData = function () {
    nbConfirm({ icon: '⚠️', title: 'Reset semua data?', msg: 'Semua talent, foto, pesanan, harga, testimoni, dan pesan masuk akan dihapus.', ok: 'Lanjut' }, function () {
      nbConfirm({ icon: '🛑', title: 'Yakin banget?', msg: 'Ini pertanyaan terakhir. Setelah dihapus, data <b>tidak bisa dikembalikan</b>. Tekan Hapus hanya jika kamu benar-benar yakin.', ok: 'Ya, hapus semua', danger: true }, doWipe);
    });
  };
  function doWipe() {
    try { localStorage.setItem('nabi_wiped', '1'); } catch (e) {}
    ['talents', 'orders', 'pricelist', 'testimonials', 'customPhotos', 'inbox', 'talentApplications'].forEach(function (k) { try { db.ref(k).remove(); } catch (e) {} });
    _talentsCache = []; _ordersCache = []; _priceCache = emptyPrices(); _testiCache = []; _photosCache = {};
    toast('Semua data sudah dihapus', 'info'); showAdminTab('settings');
  }
  window.renderAdminSettings = function (el) {
    el.innerHTML = '<div class="dh"><div><h2>Pengaturan</h2><p>nabilove.com</p></div></div><div class="admin-2col-grid">' +
      '<div class="dash-section"><h3>Akun admin</h3><p style="font-size:.88rem;color:var(--text-sec);line-height:1.7">Username: <strong>admin</strong><br>Buka login: ketuk logo Nabilove 5x.</p></div>' +
      '<div class="dash-section nb-danger"><h3>Zona berbahaya</h3><p style="font-size:.85rem;color:var(--text-sec);margin-bottom:1rem">Hapus seluruh data situs. Kamu akan ditanya 2 kali sebelum data dihapus.</p><button type="button" class="nb-btn danger" onclick="resetData()"><i class="fas fa-triangle-exclamation"></i> Reset semua data</button></div></div>';
  };

  /* ---- KELOLA TALENT: tambah / edit / hapus ---- */
  function av(t) { var u = getTalentPhotoUrl(t.id); return '<div class="todo-av"' + (u ? ' style="background-image:url(\'' + esc(u) + '\')"' : '') + '>' + (u ? '' : esc(t.avatar || '✨')) + '</div>'; }
  window.buildTalentRows = function (T) {
    if (!T.length) return '<tr><td colspan="6"><div class="empty-mini">Belum ada talent. Tekan “Tambah Talent”.</div></td></tr>';
    T = T.slice().sort(function (a, b) { return (b.pendingApproval && !b.verified ? 1 : 0) - (a.pendingApproval && !a.verified ? 1 : 0); });
    return T.map(function (t) {
      var pend = t.pendingApproval && !t.verified, cls = t.status === 'online' ? 'badge-active' : t.status === 'busy' ? 'badge-pending' : 'badge-rejected';
      var wa = pend && t.wa ? '<small>WA: ' + esc(t.wa) + '</small>' : '';
      return '<tr' + (pend ? ' class="nb-pend"' : '') + '><td><div class="who">' + av(t) + '<div><strong>' + esc(t.name) + '</strong><small>' + esc(t.gender) + ' · ' + esc(t.age) + ' thn</small>' + wa + '</div></div></td><td>' + esc(t.location) + '</td>' +
        '<td>' + statusSwitch(t) + '</td><td class="nw">⭐ ' + esc(t.rating) + '</td>' +
        '<td><span class="status-badge ' + (pend ? 'badge-pending' : t.verified ? 'badge-done' : 'badge-rejected') + '">' + (pend ? 'Menunggu ACC' : t.verified ? 'Terverifikasi' : 'Belum') + '</span></td>' +
        '<td><div class="row-act">' + (pend ? '<button type="button" class="mini ok" onclick="approveTalent(\'' + t.id + '\')">ACC</button><button type="button" class="mini no" onclick="rejectTalent(\'' + t.id + '\')">Tolak</button>' : '') +
        '<button type="button" class="mini" onclick="openTalentEditor(\'' + t.id + '\')"><i class="fas fa-pen"></i> Edit</button>' +
        '<button type="button" class="mini no" aria-label="Hapus" onclick="deleteTalent(\'' + t.id + '\')"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
  };
  window.renderAdminTalents = function (el) {
    var T = getTalents();
    el.innerHTML = '<div class="dh"><div><h2>Kelola talent</h2><p>' + T.length + ' talent</p></div><div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center"><div class="search-wrap" style="min-width:200px"><i class="fas fa-search"></i><input type="text" placeholder="Cari nama atau kota" oninput="adminSearchTalent(this.value)"></div><button type="button" class="nb-btn" onclick="openTalentEditor()"><i class="fas fa-plus"></i> Tambah Talent</button></div></div>' + appsBox() +
      '<div class="dash-section"><div class="table-scroll"><table class="admin-table"><thead><tr><th>Talent</th><th>Kota</th><th>Status</th><th>Rating</th><th>Verifikasi</th><th>Aksi</th></tr></thead><tbody id="adminTalentRows">' + buildTalentRows(T) + '</tbody></table></div></div>';
  };
  window.toggleVerify = function (id) { var t = getTalents().filter(function (x) { return x.id === id; })[0]; if (t) updateTalent(id, { verified: !t.verified }); showAdminTab('talents'); };
  window.deleteTalent = function (id) {
    var t = getTalents().filter(function (x) { return x.id === id; })[0]; if (!t) return;
    nbConfirm({ icon: '🗑️', title: 'Hapus ' + esc(t.name) + '?', msg: 'Data dan foto talent ini akan dihapus permanen.', ok: 'Hapus', danger: true }, function () {
      setTalents(getTalents().filter(function (x) { return x.id !== id; }));
      try { db.ref('talents/' + id).remove(); db.ref('customPhotos/' + id).remove(); } catch (e) {}
      if (_photosCache) delete _photosCache[id];
      toast('Talent dihapus', 'info'); showAdminTab('talents');
    });
  };

  var SERV = ['Chatting', 'Calling', 'Video Call', 'Offline Date', 'PAP'], SCH = ['Pagi (06-12)', 'Siang (12-17)', 'Sore (17-20)', 'Malam (20-24)'];
  function fld(l, id, v, type) { return '<label class="nb-f"><span>' + l + '</span><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '"></label>'; }
  function chks(name, all, sel) { return all.map(function (s) { return '<label class="nb-chk"><input type="checkbox" name="' + name + '" value="' + esc(s) + '"' + ((sel || []).indexOf(s) > -1 ? ' checked' : '') + '> ' + esc(s) + '</label>'; }).join(''); }
  function slot(id, type, idx, url) {
    var sfx = type === 'main' ? 'main' : 'gal' + idx, i = type === 'main' ? -1 : idx, a = "'" + id + "','" + type + "'," + i;
    return '<div class="photo-slot"><div class="photo-slot-label">' + (type === 'main' ? '🖼️ Foto utama' : '📸 Galeri ' + (idx + 1)) + '</div>' +
      '<div class="photo-slot-preview" id="preview-' + sfx + '-' + id + '">' + (url ? '<img src="' + esc(url) + '" alt=""><button type="button" class="photo-slot-del" onclick="deleteSlotPhoto(' + a + ')"><i class="fas fa-trash"></i></button>' : '<div class="photo-slot-empty">+</div>') + '</div>' +
      '<div class="photo-slot-actions"><label class="photo-upload-btn"><i class="fas fa-upload"></i> Upload<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="handlePhotoFileUpload(event,' + a + ')"></label>' +
      '<button type="button" class="photo-link-btn" onclick="showDriveLinkInput(' + a + ')"><i class="fab fa-google-drive"></i> Link</button></div>' +
      '<div class="photo-drive-input" id="drive-input-' + sfx + '-' + id + '" style="display:none"><input type="text" id="drive-url-' + sfx + '-' + id + '" placeholder="Tempel link Google Drive"><button type="button" class="nb-btn sm" onclick="applyDriveLink(' + a + ')">Terapkan</button></div></div>';
  }
  window.openTalentEditor = function (id) {
    var old = id ? getTalents().filter(function (x) { return x.id === id; })[0] : null, isNew = !old;
    var t = old || { id: 't' + Date.now().toString(36), name: '', nickname: '', age: 20, gender: 'Perempuan', location: '', bio: '', hobbies: '', services: ['Chatting', 'Calling'], schedule: ['Malam (20-24)'], rating: 5, bookings: 0, price: '', status: 'online', avatar: '🌸', ig: '', tiktok: '', verified: true };
    var ap = appsCache[t.id] || {}, saved = false;
    var ov = overlay('<div class="nb-head"><h3>' + (isNew ? 'Tambah talent' : 'Edit talent') + '</h3><button type="button" class="nb-x2" aria-label="Tutup">✕</button></div>' +
      (ap.wa || ap.email ? '<div class="nb-info">📋 Data pendaftar — WA: <b>' + esc(ap.wa || '-') + '</b> · Email: <b>' + esc(ap.email || '-') + '</b>' + (ap.ig ? ' · IG: <b>' + esc(ap.ig) + '</b>' : '') + '</div>' : '') + '<div class="nb-sec"><h4>Foto profil</h4>' + avatarPicker(t.id, getTalentPhotoUrl(t.id), t.avatar) + '</div>' +
      '<div class="nb-sec"><h4>Informasi</h4><div class="nb-grid">' + fld('Nama lengkap', 'ed_name', t.name) + fld('Nama panggilan', 'ed_nick', t.nickname) +
      '<label class="nb-f"><span>Gender</span><select id="ed_gender"><option' + (t.gender === 'Perempuan' ? ' selected' : '') + '>Perempuan</option><option' + (t.gender === 'Laki-laki' ? ' selected' : '') + '>Laki-laki</option></select></label>' +
      fld('Umur', 'ed_age', t.age, 'number') + fld('Kota', 'ed_loc', t.location) + fld('Harga mulai (mis. 26K)', 'ed_price', t.price) + fld('Rating (1-5)', 'ed_rating', t.rating, 'number') +
      '<label class="nb-f"><span>Status</span><select id="ed_status">' + ['online', 'busy', 'offline'].map(function (s) { return '<option' + (t.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
      fld('Instagram', 'ed_ig', t.ig) + fld('TikTok', 'ed_tk', t.tiktok) + fld('Emoji avatar', 'ed_av', t.avatar) + fld('Hobi', 'ed_hobi', t.hobbies) + '</div>' +
      '<label class="nb-f"><span>Bio</span><textarea id="ed_bio" rows="3">' + esc(t.bio) + '</textarea></label>' +
      '<div class="nb-f"><span>Layanan</span><div class="nb-chks">' + chks('ed_sv', SERV, t.services) + '</div></div>' +
      '<div class="nb-f"><span>Jam tersedia</span><div class="nb-chks">' + chks('ed_sc', SCH, t.schedule) + '</div></div>' +
      '<label class="nb-chk" style="margin-top:.4rem"><input type="checkbox" id="ed_ver"' + (t.verified ? ' checked' : '') + '> Tandai terverifikasi</label></div>' +
      '<div class="nb-btns"><button type="button" class="nb-btn ghost nb-x">Batal</button><button type="button" class="nb-btn nb-save"><i class="fas fa-save"></i> Simpan</button></div>', 'wide');
    function pick(n) { return [].map.call(ov.querySelectorAll('input[name="' + n + '"]:checked'), function (c) { return c.value; }); }
    ov.querySelector('.nb-x').onclick = ov.querySelector('.nb-x2').onclick = function () { if (isNew && !saved) wipePhoto(t.id); closeOv(ov); showAdminTab('talents'); };
    ov.querySelector('.nb-save').onclick = function () {
      var name = $('ed_name').value.trim(); if (!name) { toast('Nama wajib diisi', 'error'); return; }
      var o = Object.assign({}, t, { name: name, nickname: $('ed_nick').value.trim() || name.split(' ')[0], gender: $('ed_gender').value, age: parseInt($('ed_age').value, 10) || 18,
        location: $('ed_loc').value.trim(), price: $('ed_price').value.trim(), rating: Math.min(5, Math.max(1, parseFloat($('ed_rating').value) || 5)), status: $('ed_status').value,
        ig: $('ed_ig').value.trim(), tiktok: $('ed_tk').value.trim(), avatar: $('ed_av').value.trim() || '🌸', hobbies: $('ed_hobi').value.trim(), bio: $('ed_bio').value.trim(),
        services: pick('ed_sv'), schedule: pick('ed_sc'), verified: $('ed_ver').checked, pendingApproval: false });
      if (isNew) setTalents(getTalents().concat([o])); else updateTalent(t.id, o);
      saved = true; closeOv(ov); toast(isNew ? 'Talent ditambahkan ✓' : 'Perubahan disimpan ✓', 'success'); showAdminTab('talents');
    };
  };

  /* ===== FOTO PROFIL: satu foto, crop persegi ala WhatsApp, simpan WebP ===== */
  function setPreview(id, url, emoji) {
    var el = $('preview-main-' + id); if (!el) return;
    el.innerHTML = url ? '<img src="' + esc(url) + '" alt="Foto">' : '<span>' + esc(emoji || '✨') + '</span>';
  }
  function wipePhoto(id) { try { db.ref('customPhotos/' + id).remove(); } catch (e) {} if (_photosCache) delete _photosCache[id]; }
  function avatarPicker(id, url, emoji) {
    return '<div class="nb-ava"><div class="nb-ava-pv" id="preview-main-' + id + '">' + (url ? '<img src="' + esc(url) + '" alt="Foto">' : '<span>' + esc(emoji || '✨') + '</span>') + '</div>' +
      '<div class="nb-ava-act"><label class="nb-btn sm"><i class="fas fa-camera"></i> Pilih foto<input type="file" accept="image/*" style="display:none" onchange="handlePhotoFileUpload(event,\'' + id + '\',\'main\',-1)"></label>' +
      '<button type="button" class="nb-btn ghost sm" onclick="deleteSlotPhoto(\'' + id + '\',\'main\',-1)">Hapus foto</button>' +
      '<small>Geser &amp; zoom untuk memotong. Disimpan sebagai WebP agar ringan.</small></div></div>';
  }
  window.applyPhotoToSlot = function (id, type, idx, url) {
    saveCustomPhotoData(id, { main: url }); /* hanya 1 foto; galeri lama ikut dibuang */
    var t = getTalents().filter(function (x) { return x.id === id; })[0]; setPreview(id, url, t && t.avatar);
  };
  window.deleteSlotPhoto = function (id) {
    nbConfirm({ icon: '🗑️', title: 'Hapus foto?', msg: 'Foto profil talent ini akan dihapus.', ok: 'Hapus', danger: true }, function () {
      wipePhoto(id); var t = getTalents().filter(function (x) { return x.id === id; })[0]; setPreview(id, null, t && t.avatar); toast('Foto dihapus', 'info');
    });
  };
  function openCropper(file, done) {
    var url = URL.createObjectURL(file), im = new Image();
    im.onerror = function () { URL.revokeObjectURL(url); toast('Gagal membaca foto', 'error'); };
    im.onload = function () {
      var ov = overlay('<div class="nb-head"><h3>Atur foto</h3><button type="button" class="nb-x2" aria-label="Tutup">✕</button></div>' +
        '<div class="nb-crop" id="nbCrop"><img id="nbCropImg" alt="" draggable="false"><div class="nb-crop-mask"></div></div>' +
        '<div class="nb-zoom"><span>−</span><input type="range" id="nbZoom" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><span>+</span></div>' +
        '<p class="nb-hint">Geser foto, cubit atau geser slider untuk zoom. Lingkaran = bagian yang tampil.</p>' +
        '<div class="nb-btns"><button type="button" class="nb-btn ghost nb-x">Batal</button><button type="button" class="nb-btn nb-ok"><i class="fas fa-check"></i> Simpan foto</button></div>', 'crop');
      var box = ov.querySelector('#nbCrop'), pi = ov.querySelector('#nbCropImg'), z = ov.querySelector('#nbZoom');
      var V = box.clientWidth, w = im.naturalWidth, h = im.naturalHeight, s0 = V / Math.min(w, h), k = 1, x = 0, y = 0, pts = {}, last = 0;
      pi.src = url;
      function draw() {
        var s = s0 * k, mx = Math.max(0, (w * s - V) / 2), my = Math.max(0, (h * s - V) / 2);
        x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y));
        pi.style.width = (w * s) + 'px'; pi.style.height = (h * s) + 'px'; pi.style.left = (V / 2 + x - w * s / 2) + 'px'; pi.style.top = (V / 2 + y - h * s / 2) + 'px';
      }
      function dist() { var a = Object.keys(pts); if (a.length < 2) return 0; var p = pts[a[0]], q = pts[a[1]]; return Math.hypot(p.x - q.x, p.y - q.y); }
      draw();
      z.oninput = function () { k = parseFloat(z.value); draw(); };
      box.addEventListener('wheel', function (e) { e.preventDefault(); k = Math.max(1, Math.min(4, k * (e.deltaY < 0 ? 1.08 : 0.93))); z.value = k; draw(); }, { passive: false });
      box.addEventListener('pointerdown', function (e) { try { box.setPointerCapture(e.pointerId); } catch (er) {} pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = dist(); });
      box.addEventListener('pointermove', function (e) {
        var p = pts[e.pointerId]; if (!p) return; var n = Object.keys(pts).length;
        if (n === 1) { x += e.clientX - p.x; y += e.clientY - p.y; }
        p.x = e.clientX; p.y = e.clientY;
        if (n === 2) { var d = dist(); if (last) { k = Math.max(1, Math.min(4, k * d / last)); z.value = k; } last = d; }
        draw();
      });
      function up(e) { delete pts[e.pointerId]; last = 0; }
      box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
      function end() { URL.revokeObjectURL(url); closeOv(ov); }
      ov.querySelector('.nb-x').onclick = ov.querySelector('.nb-x2').onclick = end;
      ov.querySelector('.nb-ok').onclick = function () {
        var s = s0 * k, OUT = 512, c = document.createElement('canvas'); c.width = c.height = OUT; var g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, OUT, OUT);
        g.drawImage(im, (w * s / 2 - V / 2 - x) / s, (h * s / 2 - V / 2 - y) / s, V / s, V / s, 0, 0, OUT, OUT);
        var out = c.toDataURL('image/webp', 0.82); if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/jpeg', 0.82);
        end(); done(out);
      };
    };
    im.src = url;
  }
  window.handlePhotoFileUpload = function (ev, id) {
    var f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return;
    if (!/^image\//.test(f.type)) { toast('Pilih file gambar (JPG/PNG/WEBP)', 'error'); return; }
    if (f.size > 20 * 1024 * 1024) { toast('Ukuran file maksimal 20 MB', 'error'); return; }
    openCropper(f, function (data) { applyPhotoToSlot(id, 'main', -1, data); toast('Foto tersimpan ✓ (' + Math.round(data.length * 0.75 / 1024) + ' KB, ' + (data.indexOf('image/webp') > 4 ? 'WebP' : 'JPEG') + ')', 'success'); });
  };

  /* ===== STATUS online/offline langsung dari tabel ===== */
  function statusSwitch(t) {
    var on = t.status === 'online', busy = t.status === 'busy';
    return '<button type="button" class="nb-sw' + (on ? ' on' : busy ? ' busy' : '') + '" role="switch" aria-checked="' + on + '" onclick="toggleStatus(\'' + t.id + '\')"><i></i><b>' + (on ? 'Online' : busy ? 'Sibuk' : 'Offline') + '</b></button>';
  }
  window.toggleStatus = function (id) {
    var t = getTalents().filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var n = t.status === 'online' ? 'offline' : 'online'; updateTalent(id, { status: n });
    toast(esc(t.name) + ' → ' + (n === 'online' ? 'Online' : 'Offline'), 'success');
    var q = document.querySelector('#admin-tab-talents .search-wrap input'); adminSearchTalent(q ? q.value : '');
  };

  /* ===== PESAN MASUK: salin nomor & hapus ===== */
  function copyText(txt, ok) {
    function fb() { var a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Gagal menyalin', 'error'); } document.body.removeChild(a); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok, fb); else fb();
  }
  window.copyInboxPhone = function (btn) { var v = btn.getAttribute('data-p').replace(/&amp;/g, '&'); copyText(v, function () { toast('Nomor ' + v + ' disalin 📋', 'success'); }); };
  window.deleteInboxMsg = function (id) {
    nbConfirm({ icon: '🗑️', title: 'Hapus pesan ini?', msg: 'Pesan akan dihapus permanen.', ok: 'Hapus', danger: true }, function () {
      try { db.ref('inbox/admin/' + id).remove(); } catch (e) {}
      if (_inboxCache && _inboxCache.admin) delete _inboxCache.admin[id];
      updateInboxBadge(); var el = $('admin-tab-inbox'); if (el) renderAdminInbox(el); toast('Pesan dihapus', 'info');
    });
  };
  window.renderAdminInbox = function (el) {
    var msgs = getInboxFor('admin');
    el.innerHTML = '<div class="dh"><div><h2><i class="fas fa-envelope" style="color:var(--pink-deep)"></i> Pesan masuk</h2><p>' + msgs.length + ' pesan</p></div></div>' +
      (msgs.length ? '<div class="inbox-list">' + msgs.map(function (m) {
        return '<div class="inbox-item ' + (m.read ? '' : 'unread') + '" onclick="markInboxRead(\'admin\',\'' + m._id + '\');this.classList.remove(\'unread\')">' +
          '<div class="inbox-item-top"><strong>' + m.name + '</strong>' + (m.talentName ? '<span class="inbox-tag">untuk ' + m.talentName + '</span>' : '') +
          '<span class="inbox-time">' + new Date(m.time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
          '<p class="inbox-item-msg">' + m.message + '</p>' +
          '<div class="inbox-item-contact"><i class="fas fa-phone"></i> ' + m.contact + '</div>' +
          '<div class="nb-inb-act"><button type="button" class="nb-btn sm" data-p="' + m.contact + '" onclick="event.stopPropagation();copyInboxPhone(this)"><i class="fas fa-copy"></i> Salin nomor</button>' +
          '<button type="button" class="nb-btn danger sm" onclick="event.stopPropagation();deleteInboxMsg(\'' + m._id + '\')"><i class="fas fa-trash"></i> Hapus</button></div></div>';
      }).join('') + '</div>' : '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-inbox"></i></div><h3>Belum ada pesan</h3><p>Pesan dari pengunjung akan muncul di sini.</p></div>');
  };
})();
