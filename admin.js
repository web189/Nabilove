/* Nabilove — admin.js (dimuat setelah patch.js). Login hanya admin, kelola talent, reset data 2 tahap. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---- hanya admin: buang sesi talent lama, blokir halaman talent ---- */
  try { if (currentUser && currentUser.role !== 'admin') { currentUser = null; localStorage.removeItem('lovia_session'); } } catch (e) {}
  var _sp = window.showPage;
  window.showPage = function (p, a, b) { if (p === 'talent-dash') p = 'landing'; var r = _sp.call(this, p, a, b); updBack(); return r; };

  /* ---- Firebase live: login admin lewat Authentication, data privat hanya untuk admin ---- */
  var live = window.__fbLive === true, appsCache = {}, attached = false;
  function becomeAdmin() { currentUser = { role: 'admin', name: 'Admin Nabilove', username: 'admin' }; lsSet('lovia_session', currentUser); attachPrivate(); updBack(); }
  function attachPrivate() {
    if (attached) return; attached = true;
    db.ref('orders').on('value', function (sn) { var v = nbEsc(sn.val()); _ordersCache = v ? Object.keys(v).map(function (k) { return v[k]; }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }) : []; });
    db.ref('inbox').on('value', function (sn) { _inboxCache = nbEsc(sn.val() || {}); updateInboxBadge(); var el = $('admin-tab-inbox'); if (el && el.classList.contains('active')) renderAdminInbox(el); });
    db.ref('talentApplications').on('value', function (sn) { appsCache = sn.val() || {}; var el = $('admin-tab-talents'); if (el && el.classList.contains('active')) renderAdminTalents(el); });
  }
  if (live) {
        auth.onAuthStateChanged(function (u) {
      if (!u) { attached = false; if (currentUser && currentUser.role === 'admin') { currentUser = null; try { localStorage.removeItem('lovia_session'); } catch (e) {} if (currentPage === 'admin') showPage('landing'); } return; }
      db.ref('admins/' + u.uid).once('value').then(function (sn) { if (sn.val() === true) { if (!currentUser || currentUser.role !== 'admin') becomeAdmin(); else attachPrivate(); } else auth.signOut(); }).catch(function () {});
    });
    var _lo = window.logout; window.logout = function () { try { auth.signOut(); } catch (e) {} return _lo.apply(this, arguments); };
  }
  window.handleLogin = function () {
    var u = ($('loginUser') || {}).value || '', p = ($('loginPass') || {}).value || '';
    u = u.trim(); if (!u || !p.trim()) { toast('Isi email dan password!', 'error'); return; }
    var keep = !$('loginRemember') || $('loginRemember').checked;
    if (live) {
      var email = u.indexOf('@') > -1 ? u : u + '@nabilove.com', pst;
      try { pst = auth.setPersistence(keep ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION); } catch (e) { pst = null; }
      Promise.resolve(pst).catch(function () {}).then(function () { return auth.signInWithEmailAndPassword(email, p); }).then(function (c) {
        return db.ref('admins/' + c.user.uid).once('value').then(function (sn) {
          if (sn.val() === true) { rememberLogin(u, keep); becomeAdmin(); closeModal('loginModal'); toast('Selamat datang, Admin! 👑', 'success'); setTimeout(function () { showPage('admin'); }, 400); }
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
    if (taps >= 5) { taps = 0; if (currentUser && currentUser.role === 'admin') showPage('admin'); else { prefillLogin(); showLoginModal(); } }
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

  /* ===== v10: Lihat sebagai Tamu, login, ranking talent, promo ===== */
  var back = document.createElement('button'); back.type = 'button'; back.className = 'nb-backadmin'; back.innerHTML = '<i class="fas fa-arrow-left"></i> Kembali ke Dasbor'; back.onclick = function () { showPage('admin'); }; document.body.appendChild(back);
  function updBack() { if (!back) return; back.classList.toggle('show', !!(currentUser && currentUser.role === 'admin' && currentPage !== 'admin')); }
  setInterval(updBack, 1500);
  window.nbGuest = function () { try { closeDashSidebar('admin'); } catch (e) {} showPage('landing'); };
  function rememberLogin(u, keep) { try { localStorage.setItem('nabi_rem', keep ? '1' : '0'); if (keep) localStorage.setItem('nabi_rem_email', u); else localStorage.removeItem('nabi_rem_email'); } catch (e) {} }
  function prefillLogin() {
    var keep = true, e = ''; try { keep = localStorage.getItem('nabi_rem') !== '0'; e = keep ? (localStorage.getItem('nabi_rem_email') || '') : ''; } catch (er) {}
    if ($('loginUser')) $('loginUser').value = e; if ($('loginPass')) $('loginPass').value = ''; if ($('loginRemember')) $('loginRemember').checked = keep;
  }
  window.togglePw = function () { var i = $('loginPass'), ic = document.querySelector('.pw-eye i'); if (!i) return; var s = i.type === 'password'; i.type = s ? 'text' : 'password'; if (ic) ic.className = s ? 'fas fa-eye-slash' : 'fas fa-eye'; };

  var pubMode = false;
  function ranked(T) { return T.slice().sort(function (a, b) { var x = a.rank > 0 ? a.rank : 9999, y = b.rank > 0 ? b.rank : 9999; return (x - y) || ((b.rating || 0) - (a.rating || 0)); }); }
  var _gt3 = window.getTalents;
  window.getTalents = function () { var T = _gt3(); return pubMode ? ranked(T) : T; };
  function pubT() { pubMode = true; try { return getTalents().filter(function (t) { return t.verified; }); } finally { pubMode = false; } }
  var MED = ['🥇', '🥈', '🥉'];
  function afterRender() {
    var T = pubT(), byId = {}; T.forEach(function (t) { byId[t.id] = t; });
    [].forEach.call(document.querySelectorAll('.talent-card'), function (c) {
      var m = /openTalentDetail\('([^']+)'\)/.exec(c.getAttribute('onclick') || ''), t = m && byId[m[1]], old = c.querySelector('.nb-rank'); if (old) old.remove();
      if (t && t.rank >= 1 && t.rank <= 3) { var b = document.createElement('span'); b.className = 'nb-rank r' + t.rank; b.textContent = MED[t.rank - 1] + ' Top ' + t.rank; c.appendChild(b); }
    });
    var cards = document.querySelectorAll('.hero-card-stack .hcard'), stack = document.querySelector('.hero-card-stack');
    [].forEach.call(cards, function (c, i) {
      var t = T[i]; if (!t) { c.style.display = 'none'; return; } c.style.display = '';
      var a = c.querySelector('.hcard-avatar'), u = getTalentPhotoUrl(t.id); a.style.backgroundImage = u ? 'url("' + u.replace(/"/g, '') + '")' : ''; a.style.backgroundSize = 'cover'; a.style.backgroundPosition = 'center'; a.textContent = u ? '' : (t.name || '?').charAt(0);
      c.querySelector('strong').textContent = t.name; c.querySelector('.hcard-info span').textContent = '⭐ ' + t.rating + ' · ' + t.location;
      var st = c.querySelector('.hcard-status'); st.className = 'hcard-status ' + (t.status === 'online' ? 'online' : 'offline'); st.textContent = t.status === 'online' ? 'Online' : t.status === 'busy' ? 'Sibuk' : 'Offline';
    });
    if (stack) stack.style.display = T.length ? '' : 'none';
    var hs = document.querySelectorAll('.hstat-num')[1]; if (hs) { hs.dataset.target = T.length; if (hs.textContent !== '0') hs.textContent = T.length; }
    var ab = document.querySelectorAll('.about-stat-num')[1]; if (ab) ab.textContent = T.length;
  }
  ['renderTalents', 'renderShowcase', 'renderHome', 'openTalentDetail'].forEach(function (n) {
    var f = window[n]; if (!f) return;
    window[n] = function () { pubMode = true; try { return f.apply(this, arguments); } finally { pubMode = false; if (n !== 'openTalentDetail') setTimeout(afterRender, 0); } };
  });
  setTimeout(afterRender, 1200);

  /* --- Ranking talent --- */
  function visibleT() { return ranked(getTalents().filter(function (t) { return t.verified; })); }
  function saveRank(list) {
    var m = {}; list.forEach(function (t, i) { m[t.id] = i + 1; });
    setTalents(getTalents().map(function (t) { return m[t.id] ? Object.assign({}, t, { rank: m[t.id] }) : t; })); showAdminTab('rank');
  }
  window.moveRank = function (id, dir) {
    var L = visibleT(), i = L.findIndex(function (t) { return t.id === id; }); if (i < 0) return;
    var t = L.splice(i, 1)[0]; var j = dir === 'top' ? 0 : dir === 'up' ? Math.max(0, i - 1) : Math.min(L.length, i + 1); L.splice(j, 0, t); saveRank(L);
  };
  window.autoRank = function () { nbConfirm({ icon: '🔢', title: 'Urutkan otomatis?', msg: 'Urutan diganti berdasarkan rating tertinggi, lalu jumlah booking.', ok: 'Urutkan' }, function () { saveRank(getTalents().filter(function (t) { return t.verified; }).sort(function (a, b) { return (b.rating || 0) - (a.rating || 0) || (b.bookings || 0) - (a.bookings || 0); })); }); };
  function renderRank(el) {
    var L = visibleT();
    el.innerHTML = '<div class="dh"><div><h2>Ranking talent</h2><p>Urutan tampil di situs</p></div><button type="button" class="nb-btn ghost" onclick="autoRank()"><i class="fas fa-wand-magic-sparkles"></i> Urutkan otomatis</button></div>' +
      '<div class="dash-section"><p class="nb-hint2">Urutan ini dipakai di halaman Talent, bagian Talent Unggulan, dan kartu di beranda. Talent #1–#3 mendapat lencana Top di kartunya.</p>' +
      (L.length ? '<div class="nb-rank-list">' + L.map(function (t, i) {
        return '<div class="nb-rk"><div class="nb-rk-n">' + (i < 3 ? MED[i] : '#' + (i + 1)) + '</div>' + av(t) + '<div class="nb-rk-i"><strong>' + esc(t.name) + '</strong><small>' + esc(t.location) + ' · ' + esc(t.status) + '</small></div>' +
          '<div class="nb-rk-a"><button type="button" class="mini" aria-label="Naik" ' + (i === 0 ? 'disabled' : '') + ' onclick="moveRank(\'' + t.id + '\',\'up\')"><i class="fas fa-arrow-up"></i></button>' +
          '<button type="button" class="mini" aria-label="Turun" ' + (i === L.length - 1 ? 'disabled' : '') + ' onclick="moveRank(\'' + t.id + '\',\'down\')"><i class="fas fa-arrow-down"></i></button>' +
          (i > 0 ? '<button type="button" class="mini" onclick="moveRank(\'' + t.id + '\',\'top\')">#1</button>' : '') + '</div></div>';
      }).join('') + '</div>' : '<div class="empty-mini">Belum ada talent terverifikasi.</div>') + '</div>';
  }

  /* --- Promo & notifikasi --- */
  var promoData = null, promoLoaded = false, TG = [['talents', 'Halaman Talent'], ['pricelist', 'Pricelist'], ['layanan', 'Layanan'], ['daftar-talent', 'Daftar Jadi Talent'], ['about', 'Tentang'], ['landing', 'Beranda'], ['url', 'Link luar (https://…)']];
  function pCfg() { var s = (promoData && promoData.settings) || {}; return { enabled: s.enabled !== false, delay: +s.delay || 8, interval: +s.interval || 45, max: +s.max || 3 }; }
  function pAll() { var d = (promoData && promoData.items) || {}; return Object.keys(d).map(function (k) { return d[k]; }).filter(function (p) { return p && p.title; }).sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }); }
  function toMsg(p) {
    var ext = p.target === 'url' && /^https?:\/\//i.test(p.url || '');
    return { emoji: esc(p.emoji || '🎉'), title: esc(p.title), desc: esc(p.desc || ''), cta: esc(p.cta || 'Lihat'), ctaUrl: ext ? esc(p.url) : null, action: ext ? null : function () { showPage(p.target && p.target !== 'url' ? p.target : 'landing'); } };
  }
  db.ref('promos').on('value', function (s) { promoData = s.val() || null; promoLoaded = true; var el = $('admin-tab-promo'); if (el && el.classList.contains('active') && !document.querySelector('.nb-ov')) renderPromo(el); }, function () { promoLoaded = true; });
  var pShown = 0, pIdx = 0;
  function nextPromo() {
    if (!promoLoaded) { setTimeout(nextPromo, 2000); return; }
    var c = pCfg(); if (!c.enabled) return;
    var items = promoData && promoData.items ? pAll().filter(function (p) { return p.active !== false; }).map(toMsg) : (!live ? NOTIF_MESSAGES : []);
    if (!items.length || pShown >= c.max) return;
    if (currentPage === 'admin' || document.querySelector('.modal-overlay.open') || document.querySelector('.nb-ov')) { setTimeout(nextPromo, 20000); return; }
    showPremiumNotif(items[pIdx % items.length]); pIdx++; pShown++; setTimeout(nextPromo, c.interval * 1000);
  }
  window.schedulePopup = function () { if (_notifScheduled) return; _notifScheduled = true; setTimeout(nextPromo, pCfg().delay * 1000); };
  window.savePromoSettings = function () {
    var o = { enabled: $('pm_en').checked, delay: Math.max(1, +$('pm_delay').value || 8), interval: Math.max(10, +$('pm_int').value || 45), max: Math.max(1, Math.min(10, +$('pm_max').value || 3)) };
    db.ref('promos/settings').set(o).then(function () { toast('Pengaturan promo disimpan ✓', 'success'); });
  };
  window.togglePromo = function (id) { var p = ((promoData && promoData.items) || {})[id]; if (!p) return; db.ref('promos/items/' + id + '/active').set(p.active === false); };
  window.previewPromo = function (id) { var p = ((promoData && promoData.items) || {})[id]; if (p) showPremiumNotif(toMsg(p)); };
  window.deletePromo = function (id) { nbConfirm({ icon: '🗑️', title: 'Hapus promo ini?', msg: 'Notifikasi ini tidak akan tampil lagi.', ok: 'Hapus', danger: true }, function () { db.ref('promos/items/' + id).remove().then(function () { toast('Promo dihapus', 'info'); }); }); };
  function renderPromo(el) {
    var c = pCfg(), L = pAll();
    el.innerHTML = '<div class="dh"><div><h2>Promo &amp; notifikasi</h2><p>Popup yang muncul di halaman website</p></div><button type="button" class="nb-btn" onclick="openPromoEditor()"><i class="fas fa-plus"></i> Tambah promo</button></div>' +
      '<div class="dash-section"><h3>Pengaturan tampil</h3><label class="nb-chk"><input type="checkbox" id="pm_en"' + (c.enabled ? ' checked' : '') + '> Tampilkan notifikasi promo ke pengunjung</label>' +
      '<div class="nb-grid" style="margin-top:.8rem"><label class="nb-f"><span>Muncul pertama (detik)</span><input id="pm_delay" type="number" min="1" value="' + c.delay + '"></label><label class="nb-f"><span>Jeda antar notifikasi (detik)</span><input id="pm_int" type="number" min="10" value="' + c.interval + '"></label><label class="nb-f"><span>Maksimal per kunjungan</span><input id="pm_max" type="number" min="1" max="10" value="' + c.max + '"></label></div>' +
      '<button type="button" class="nb-btn" onclick="savePromoSettings()"><i class="fas fa-save"></i> Simpan pengaturan</button></div>' +
      '<div class="dash-section"><h3>Daftar promo (' + L.length + ')</h3>' + (L.length ? L.map(function (p) {
        var tg = (TG.filter(function (x) { return x[0] === p.target; })[0] || ['', p.target || '-'])[1], on = p.active !== false;
        return '<div class="nb-promo"><div class="nb-promo-e">' + esc(p.emoji || '🎉') + '</div><div class="nb-promo-i"><strong>' + esc(p.title) + '</strong><small>' + esc(p.desc || '') + '</small><small>Tombol “' + esc(p.cta || 'Lihat') + '” → ' + esc(tg) + '</small></div>' +
          '<div class="nb-promo-a"><button type="button" class="nb-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" onclick="togglePromo(\'' + p.id + '\')"><i></i><b>' + (on ? 'Aktif' : 'Mati') + '</b></button>' +
          '<button type="button" class="mini" onclick="previewPromo(\'' + p.id + '\')"><i class="fas fa-eye"></i></button><button type="button" class="mini" onclick="openPromoEditor(\'' + p.id + '\')"><i class="fas fa-pen"></i></button><button type="button" class="mini no" onclick="deletePromo(\'' + p.id + '\')"><i class="fas fa-trash"></i></button></div></div>';
      }).join('') : '<div class="empty-mini">Belum ada promo. ' + (live ? 'Tanpa promo, tidak ada popup yang tampil.' : 'Selama kosong, popup contoh bawaan yang tampil.') + '</div>') + '</div>';
  }
  window.openPromoEditor = function (id) {
    var old = id ? ((promoData && promoData.items) || {})[id] : null, p = old || { id: 'p' + Date.now().toString(36), emoji: '🎉', title: '', desc: '', cta: 'Lihat', target: 'pricelist', url: '', active: true, createdAt: Date.now() };
    var ov = overlay('<div class="nb-head"><h3>' + (old ? 'Edit promo' : 'Tambah promo') + '</h3><button type="button" class="nb-x2" aria-label="Tutup">✕</button></div>' +
      '<div class="nb-grid">' + fld('Emoji', 'pe_emoji', p.emoji) + fld('Judul', 'pe_title', p.title) + '</div>' + fld('Deskripsi singkat', 'pe_desc', p.desc) +
      '<div class="nb-grid">' + fld('Teks tombol', 'pe_cta', p.cta) + '<label class="nb-f"><span>Tombol menuju</span><select id="pe_target">' + TG.map(function (x) { return '<option value="' + x[0] + '"' + (p.target === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<div id="pe_urlw" style="display:' + (p.target === 'url' ? 'block' : 'none') + '">' + fld('Alamat link (https://…)', 'pe_url', p.url) + '</div>' +
      '<label class="nb-chk"><input type="checkbox" id="pe_on"' + (p.active !== false ? ' checked' : '') + '> Aktif</label>' +
      '<div class="nb-btns"><button type="button" class="nb-btn ghost nb-x">Batal</button><button type="button" class="nb-btn nb-save"><i class="fas fa-save"></i> Simpan</button></div>', 'wide');
    $('pe_target').onchange = function () { $('pe_urlw').style.display = this.value === 'url' ? 'block' : 'none'; };
    ov.querySelector('.nb-x').onclick = ov.querySelector('.nb-x2').onclick = function () { closeOv(ov); };
    ov.querySelector('.nb-save').onclick = function () {
      var o = Object.assign({}, p, { emoji: $('pe_emoji').value.trim() || '🎉', title: $('pe_title').value.trim().slice(0, 80), desc: $('pe_desc').value.trim().slice(0, 140), cta: $('pe_cta').value.trim().slice(0, 24) || 'Lihat', target: $('pe_target').value, url: $('pe_url').value.trim().slice(0, 300), active: $('pe_on').checked });
      if (!o.title) { toast('Judul wajib diisi', 'error'); return; }
      if (o.target === 'url' && !/^https?:\/\//i.test(o.url)) { toast('Link harus diawali https://', 'error'); return; }
      db.ref('promos/items/' + o.id).set(o).then(function () { closeOv(ov); toast('Promo tersimpan ✓', 'success'); showAdminTab('promo'); });
    };
  };
  var _sat = window.showAdminTab;
  window.showAdminTab = function (tab) { _sat(tab); var el = $('admin-tab-' + tab); if (tab === 'rank' && el) renderRank(el); else if (tab === 'promo' && el) renderPromo(el); };
})();
