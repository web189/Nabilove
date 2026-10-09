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
    db.ref('orders').on('value', function (sn) { var v = sn.val(); _ordersCache = v ? Object.keys(v).map(function (k) { return v[k]; }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }) : []; });
    db.ref('inbox').on('value', function (sn) { _inboxCache = sn.val() || {}; updateInboxBadge(); var el = $('admin-tab-inbox'); if (el && el.classList.contains('active')) renderAdminInbox(el); });
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
    var t = { id: a.id, name: a.name, nickname: a.nickname, age: a.age, gender: a.gender, location: a.location, bio: a.bio, hobbies: a.hobbies || '', services: a.services || [], schedule: a.schedule || [], rating: 5, bookings: 0, price: '', status: 'offline', avatar: a.avatar || '🌸', ig: a.ig || '', tiktok: a.tiktok || '', verified: true };
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
        '<td><span class="status-badge ' + cls + '">' + esc(t.status) + '</span></td><td class="nw">⭐ ' + esc(t.rating) + '</td>' +
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
    var g = getTalentGallery(t.id), ap = appsCache[t.id] || {};
    var ov = overlay('<div class="nb-head"><h3>' + (isNew ? 'Tambah talent' : 'Edit talent') + '</h3><button type="button" class="nb-x2" aria-label="Tutup">✕</button></div>' +
      (ap.wa || ap.email ? '<div class="nb-info">📋 Data pendaftar — WA: <b>' + esc(ap.wa || '-') + '</b> · Email: <b>' + esc(ap.email || '-') + '</b>' + (ap.ig ? ' · IG: <b>' + esc(ap.ig) + '</b>' : '') + '</div>' : '') + '<div class="nb-sec"><h4>Foto</h4><div class="photo-slots-grid">' + slot(t.id, 'main', -1, getTalentPhotoUrl(t.id)) + slot(t.id, 'gallery', 0, g[0]) + slot(t.id, 'gallery', 1, g[1]) + '</div></div>' +
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
    ov.querySelector('.nb-x').onclick = ov.querySelector('.nb-x2').onclick = function () { closeOv(ov); showAdminTab('talents'); };
    ov.querySelector('.nb-save').onclick = function () {
      var name = $('ed_name').value.trim(); if (!name) { toast('Nama wajib diisi', 'error'); return; }
      var o = Object.assign({}, t, { name: name, nickname: $('ed_nick').value.trim() || name.split(' ')[0], gender: $('ed_gender').value, age: parseInt($('ed_age').value, 10) || 18,
        location: $('ed_loc').value.trim(), price: $('ed_price').value.trim(), rating: Math.min(5, Math.max(1, parseFloat($('ed_rating').value) || 5)), status: $('ed_status').value,
        ig: $('ed_ig').value.trim(), tiktok: $('ed_tk').value.trim(), avatar: $('ed_av').value.trim() || '🌸', hobbies: $('ed_hobi').value.trim(), bio: $('ed_bio').value.trim(),
        services: pick('ed_sv'), schedule: pick('ed_sc'), verified: $('ed_ver').checked, pendingApproval: false });
      if (isNew) setTalents(getTalents().concat([o])); else updateTalent(t.id, o);
      closeOv(ov); toast(isNew ? 'Talent ditambahkan ✓' : 'Perubahan disimpan ✓', 'success'); showAdminTab('talents');
    };
  };
})();
