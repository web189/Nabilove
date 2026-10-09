'use strict';

// ══════════════════════════════════════════════════════
//  FOTO TALENT — local optimized images (img/01.jpg .. 12.jpg)
//  Catatan: 12 foto yang tersedia semuanya wanita, jadi hanya
//  dipasang untuk talent perempuan (t001-t008). Talent laki-laki
//  (t009-t011) tetap pakai avatar monogram karena tidak ada foto
//  yang cocok di set ini.
// ══════════════════════════════════════════════════════

const G = id => id ? `https://drive.google.com/thumbnail?id=${id}&sz=w600` : null;

// Bump this whenever TALENT_PHOTOS below changes, to clear any stale
// admin-uploaded photos in Firebase from earlier testing sessions.
const CUSTOM_PHOTOS_RESET_VERSION = 1;
const TALENT_PHOTOS = {
  't001': { main: 'img/01.jpg', gallery: ['img/09.jpg', null, null] },
  't002': { main: 'img/02.jpg', gallery: ['img/10.jpg', null, null] },
  't003': { main: 'img/03.jpg', gallery: ['img/11.jpg', null, null] },
  't004': { main: 'img/04.jpg', gallery: ['img/12.jpg', null, null] },
  't005': { main: 'img/05.jpg', gallery: [null, null, null] },
  't006': { main: 'img/06.jpg', gallery: [null, null, null] },
  't007': { main: 'img/07.jpg', gallery: [null, null, null] },
  't008': { main: 'img/08.jpg', gallery: [null, null, null] },
  't009': { main: null, gallery: [null, null, null] },
  't010': { main: null, gallery: [null, null, null] },
  't011': { main: null, gallery: [null, null, null] },
};

const TALENT_GRADIENTS = {
  't001': ['#fbe3ea','#e8577f'], 't002': ['#f3e6f5','#8f74c9'],
  't003': ['#fbe9e0','#e9a06a'], 't004': ['#f6ecdc','#b98a44'],
  't005': ['#fbe3ea','#b8144a'], 't006': ['#f3e6f5','#4a2f7a'],
  't007': ['#fbe9e0','#c8874a'], 't008': ['#f6ecdc','#e8577f'],
  't009': ['#f3e6f5','#5c4650'], 't010': ['#fbe3ea','#8f74c9'],
  't011': ['#fbe9e0','#b8144a'],
};

// Elegant monogram fallback (initial + small decorative emoji accent) used
// wherever a talent has no uploaded photo, instead of one oversized emoji.
function avatarFallbackHTML(t) {
  const initial = (t.name || '?').trim().charAt(0).toUpperCase();
  return `<div class="tc-monogram"><span class="tc-monogram-letter">${initial}</span><span class="tc-monogram-accent">${t.avatar||''}</span></div>`;
}

// ══════════════════════════════════════════════════════
//  FIREBASE HELPERS — Real-time Database
// ══════════════════════════════════════════════════════

// Cache lokal agar UI tetap responsif
let _talentsCache  = null;
let _ordersCache   = null;
let _priceCache    = null;
let _testiCache    = null;
let _photosCache   = {};
let _inboxCache    = {}; // { admin: [...], talent_t001: [...], ... }

// Listener aktif untuk auto-refresh UI
function nbEsc(v){
  if (typeof v === 'string') return v.replace(/[&<>"'`]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]; });
  if (Array.isArray(v)) return v.map(nbEsc);
  if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = nbEsc(v[k]); }); return o; }
  return v;
}
function isLive(){return window.__fbLive===true}
function isWiped(){try{return localStorage.getItem('nabi_wiped')==='1'}catch(e){return false}}
function emptyPrices(){var o={};Object.keys(DEFAULT_PRICELIST).forEach(function(k){o[k]=[]});return o}
function initFirebaseListeners() {
  // ── TALENTS ──
  db.ref('talents').on('value', snap => {
    const val = snap.val();
    if (val) {
      _talentsCache = Object.values(val);
    } else {
      // Jika database kosong, seed dari DEFAULT
      if (isWiped() || isLive()) { _talentsCache = []; } else {
      _talentsCache = DEFAULT_TALENTS;
      DEFAULT_TALENTS.forEach(t => db.ref('talents/' + t.id).set(t)); }
    }
    // Refresh UI jika ada halaman yang terbuka
    const talentGrid = document.getElementById('talentGrid');
    if (talentGrid && talentGrid.children.length > 0) renderTalents();
    const showcase = document.getElementById('talentShowcase');
    if (showcase && showcase.children.length > 0) renderShowcase();
  });

  // ── ORDERS ──
  db.ref('orders').on('value', snap => {
    const val = snap.val();
    _ordersCache = val ? Object.values(nbEsc(val)).sort((a,b) => (b.createdAt||0)-(a.createdAt||0)) : ((isWiped() || isLive()) ? [] : DEFAULT_ORDERS);
    if (!val && !isWiped() && !isLive()) {
      DEFAULT_ORDERS.forEach(o => db.ref('orders/' + o.id).set(o));
    }
  });

  // ── PRICELIST ──
  db.ref('pricelist').on('value', snap => {
    const val = snap.val();
    if (val) {
      _priceCache = val;
    } else {
      if (isWiped() && !isLive()) { _priceCache = emptyPrices(); } else {
      _priceCache = DEFAULT_PRICELIST;
      if (!isLive()) db.ref('pricelist').set(DEFAULT_PRICELIST); }
    }
  });

  // ── TESTIMONIALS ──
  // TESTIMONIALS_VERSION bumps whenever DEFAULT_TESTIMONIALS content changes,
  // forcing a reseed even if Firebase already has older seeded data.
  db.ref('testimonials').on('value', snap => {
    const val = snap.val();
    const currentVersion = val && val.__version;
    if (val && currentVersion === TESTIMONIALS_VERSION) {
      const rest = Object.assign({}, val);
      delete rest.__version;
      _testiCache = Object.values(rest);
    } else {
      if (isWiped() && !isLive()) { _testiCache = []; return; }
      _testiCache = DEFAULT_TESTIMONIALS;
      const seed = {};
      DEFAULT_TESTIMONIALS.forEach((t,i) => { seed['t'+i] = t; });
      seed.__version = TESTIMONIALS_VERSION;
      if (!isLive()) db.ref('testimonials').set(seed);
    }
    const tGrid = document.getElementById('testimonialsGrid');
    if (tGrid && tGrid.children.length > 0) renderTestimonials();
  });

  // ── CUSTOM PHOTOS ──
  // CUSTOM_PHOTOS_RESET_VERSION bumps whenever the built-in talent photos
  // change, so leftover test uploads from earlier sessions (which always
  // took priority over code-level photos) get cleared exactly once.
  db.ref('customPhotos/__meta/version').once('value').then(vsnap => {
    const storedVersion = vsnap.val() || 0;
    if (storedVersion < CUSTOM_PHOTOS_RESET_VERSION && !isLive()) {
      db.ref('customPhotos').set({ __meta: { version: CUSTOM_PHOTOS_RESET_VERSION } });
    }
    db.ref('customPhotos').on('value', snap => {
      const val = snap.val() || {};
      delete val.__meta;
      _photosCache = val;
      const grid = document.getElementById('talentGrid');
      if (grid && grid.children.length > 0) renderTalents();
      renderShowcase(); /* beranda + kartu hero ikut diperbarui saat foto tiba */
    });
  });
  // ── INBOX (pesan masuk, menggantikan redirect WhatsApp) ──
  db.ref('inbox').on('value', snap => {
    _inboxCache = nbEsc(snap.val() || {});
    updateInboxBadge();
    const adminInboxEl = document.getElementById('admin-tab-inbox');
    if (adminInboxEl && adminInboxEl.classList.contains('active')) renderAdminInbox(adminInboxEl);
    if (currentPage === 'talent-dash') renderTalentDash();
  });
}

// ── GETTER/SETTER FIREBASE ──

function getTalents() {
  return _talentsCache || DEFAULT_TALENTS;
}

function setTalents(arr) {
  _talentsCache = arr;
  // Simpan ke Firebase sebagai map id -> data
  const map = {};
  arr.forEach(t => { map[t.id] = t; });
  db.ref('talents').set(map).catch(e => console.error('setTalents error:', e));
}

function updateTalent(id, updates) {
  _talentsCache = (_talentsCache || DEFAULT_TALENTS).map(t => t.id===id ? {...t,...updates} : t);
  db.ref('talents/' + id).update(updates).catch(e => console.error('updateTalent error:', e));
}

function getOrders() {
  return _ordersCache || DEFAULT_ORDERS;
}

function setOrders(arr) {
  _ordersCache = arr;
  const map = {};
  arr.forEach(o => { map[o.id] = o; });
  db.ref('orders').set(map).catch(e => console.error('setOrders error:', e));
}

function addOrder(order) {
  _ordersCache = [order, ...(_ordersCache || [])];
  db.ref('orders/' + order.id).set(order).catch(e => console.error('addOrder error:', e));
}

function updateOrderStatus(id, status) {
  _ordersCache = (_ordersCache || []).map(o => o.id===id ? {...o, status} : o);
  db.ref('orders/' + id + '/status').set(status)
    .then(() => toast('Status diperbarui ✓', 'success'))
    .catch(e => { console.error(e); toast('Gagal update status', 'error'); });
}

function getTestimonials() {
  return _testiCache || DEFAULT_TESTIMONIALS;
}

function setTestimonials(arr) {
  _testiCache = arr;
  const map = {};
  arr.forEach((t,i) => { map['t'+i] = t; });
  map.__version = TESTIMONIALS_VERSION;
  db.ref('testimonials').set(map).catch(e => console.error('setTestimonials error:', e));
}

function getPricelist() {
  return _priceCache || DEFAULT_PRICELIST;
}

function setPricelist(pl) {
  _priceCache = pl;
  db.ref('pricelist').set(pl).catch(e => console.error('setPricelist error:', e));
}

// ── CUSTOM PHOTOS via Firebase DB (bukan localStorage lagi) ──
function getCustomPhotos() {
  return _photosCache || {};
}

function getCustomPhotoData(talentId) {
  return (_photosCache || {})[talentId] || { main: null, gallery: [null, null] };
}

function saveCustomPhotoData(talentId, data) {
  if (!_photosCache) _photosCache = {};
  _photosCache[talentId] = data;
  db.ref('customPhotos/' + talentId).set(data).catch(e => console.error('saveCustomPhotoData error:', e));
}

// ── PHOTO UPLOAD — Google Drive (utama) + Base64 lokal (fallback) ──
// Firebase Storage TIDAK digunakan — cukup simpan URL ke Realtime Database

async function uploadPhotoToStorage(file, talentId, slotType, slotIdx) {
  // Firebase Storage dinonaktifkan — langsung return null agar fallback ke base64
  return null;
}

// ── CONVERT FILE KE BASE64 & SIMPAN KE FIREBASE DB ──
async function uploadPhotoBase64(file, talentId, slotType, slotIdx) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      // Cek ukuran base64 — Firebase DB max 10MB per node
      if (base64.length > 800000) {
        // Compress jika terlalu besar
        compressAndSave(file, talentId, slotType, slotIdx, resolve);
      } else {
        applyPhotoToSlot(talentId, slotType, slotIdx, base64);
        toast('📸 Foto tersimpan ke database!', 'success');
        resolve(base64);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

function compressAndSave(file, talentId, slotType, slotIdx, resolve) {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = new Image();
  const url    = URL.createObjectURL(file);
  img.onload = () => {
    // Resize max 800px
    const MAX = 800;
    let w = img.width, h = img.height;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
    canvas.width = w; canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const compressed = canvas.toDataURL('image/jpeg', 0.75);
    URL.revokeObjectURL(url);
    applyPhotoToSlot(talentId, slotType, slotIdx, compressed);
    toast('📸 Foto dikompres & tersimpan!', 'success');
    if (resolve) resolve(compressed);
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Gagal memproses foto','error'); };
  img.src = url;
}

// ══════════════════════════════════════════════════════
//  GOOGLE DRIVE HELPERS
// ══════════════════════════════════════════════════════
function extractDriveId(input) {
  if (!input) return null;
  input = input.trim();
  let m = input.match(/\/(?:file\/d|d)\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  m = input.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;
  return null;
}

function driveUrlFromInput(input) {
  if (!input) return null;
  const id = extractDriveId(input);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  if (input.startsWith('http')) return input;
  return null;
}

function getTalentPhotoUrl(id) {
  const custom = getCustomPhotoData(id);
  if (custom.main) return custom.main;
  const p = TALENT_PHOTOS[id];
  return (p && p.main) ? p.main : null;
}

function getTalentGallery(id) {
  const custom = getCustomPhotoData(id);
  const customGallery = custom.gallery || [null, null];
  const staticP = TALENT_PHOTOS[id];
  const staticGallery = (staticP && staticP.gallery) ? staticP.gallery : [null, null];
  return [
    customGallery[0] || staticGallery[0] || null,
    customGallery[1] || staticGallery[1] || null,
  ];
}

function photoImgTag(url, name, extraStyle) {
  if (!url) return '';
  return `<img src="${url}" alt="${name||''}" style="width:100%;height:100%;object-fit:cover;display:block;${extraStyle||''}" loading="lazy" onerror="console.warn('Foto talent gagal dimuat, cek folder img/ ada di tempat yang sama dengan index.html:', this.src);this.style.display='none';var n=this.nextElementSibling;if(n&&n.classList&&n.classList.contains('tc-avatar-fallback'))n.style.display='flex';">`;
}

// ── STATE ──
let currentUser = null, currentPage = 'landing', musicPlaying = false,
    bookingStep = 1, bookingData = {}, currentPriceFilter = 'all';

// ── Legacy localStorage helpers (untuk session saja) ──
const lsGet = (k,d) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):d; } catch { return d; } };
const lsSet = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

// ══════════════════════════════════════════════════════
//  DEFAULT DATA
// ══════════════════════════════════════════════════════
const DEFAULT_TALENTS = [
  {id:'t001',name:'Ara Salsabila',nickname:'Ara',age:22,gender:'Perempuan',location:'Jakarta',
   bio:'Hii, aku Ara! Suka ngobrol, nonton film, dan kulineran. Orangnya humoris dan easygoing. Dijamin gak bakal bosen ngobrol sama aku 💕',
   hobbies:'Film, Music, Kuliner',services:['Chatting','Calling','Video Call','Offline Date'],
   schedule:['Siang (12-17)','Sore (17-20)','Malam (20-24)'],
   rating:4.9,bookings:234,price:'26K',status:'online',avatar:'🌸',
   ig:'@ara.salsabila',tiktok:'@ara.sal',verified:true,username:'ara01',password:'ara123'},

  {id:'t002',name:'Nara Putri',nickname:'Nara',age:20,gender:'Perempuan',location:'Bandung',
   bio:'Music lover & gaming enthusiast! Yuk ngobrol atau sekadar curhat. Aku teman ngobrol yang gak pernah boring 🎵',
   hobbies:'Gaming, Music, Anime',services:['Chatting','Calling','Video Call'],
   schedule:['Pagi (06-12)','Malam (20-24)'],
   rating:4.8,bookings:189,price:'26K',status:'online',avatar:'🎵',
   ig:'@naraputri_',tiktok:'@nara.music',verified:true,username:'nara01',password:'nara123'},

  {id:'t003',name:'Dira Cantika',nickname:'Dira',age:23,gender:'Perempuan',location:'Surabaya',
   bio:'Ceria, aktif, dan selalu ada buat dengerin ceritamu! Suka cafe hopping & travel. Offline date ke mana aja, aku siap! 🌺',
   hobbies:'Travel, Photography, Cafe Hopping',services:['Chatting','Calling','Video Call','Offline Date'],
   schedule:['Pagi (06-12)','Siang (12-17)','Sore (17-20)'],
   rating:5.0,bookings:312,price:'26K',status:'online',avatar:'🌺',
   ig:'@dira.cantika',tiktok:'@dira_travel',verified:true,username:'dira01',password:'dira123'},

  {id:'t004',name:'Luna Safira',nickname:'Luna',age:21,gender:'Perempuan',location:'Yogyakarta',
   bio:'Introvert tapi asik banget diajak ngobrol. Suka sastra, kopi hangat, dan hujan. Deep conversation adalah hal favoritku 🌙',
   hobbies:'Membaca, Menulis, Kopi',services:['Chatting','Calling','Video Call'],
   schedule:['Sore (17-20)','Malam (20-24)'],
   rating:4.7,bookings:145,price:'26K',status:'offline',avatar:'🌙',
   ig:'@luna.safira_',tiktok:'@luna_writes',verified:true,username:'luna01',password:'luna123'},

  {id:'t005',name:'Reva Anindita',nickname:'Reva',age:22,gender:'Perempuan',location:'Jakarta',
   bio:'Aktris teater yang punya segudang cerita seru! Yuk ngobrol dan temukan warna baru dalam hidupmu 🎭',
   hobbies:'Teater, Seni, Kuliner',services:['Chatting','Calling','Video Call','Offline Date'],
   schedule:['Siang (12-17)','Sore (17-20)'],
   rating:4.9,bookings:201,price:'26K',status:'online',avatar:'🎭',
   ig:'@reva.anindita',tiktok:'@reva_art',verified:true,username:'reva01',password:'reva123'},

  {id:'t006',name:'Zara Najwa',nickname:'Zara',age:19,gender:'Perempuan',location:'Medan',
   bio:'Foodie sejati! Selalu tau tempat makan enak yang lagi hits. Asik banget buat teman jalan & konten bareng 🍜',
   hobbies:'Kuliner, Vlogging, Dance',services:['Chatting','Calling','Offline Date'],
   schedule:['Siang (12-17)','Malam (20-24)'],
   rating:4.6,bookings:97,price:'26K',status:'online',avatar:'🍜',
   ig:'@zara.najwa',tiktok:'@zara_food',verified:true,username:'zara01',password:'zara123'},

  {id:'t007',name:'Sari Melati',nickname:'Sari',age:21,gender:'Perempuan',location:'Bandung',
   bio:'Pecinta kopi & buku. Deep conversation adalah hal yang paling aku suka. Ayo ngobrol sambil nongkrong! ☕',
   hobbies:'Kopi, Buku, Hiking',services:['Chatting','Calling','Video Call'],
   schedule:['Pagi (06-12)','Sore (17-20)'],
   rating:4.8,bookings:118,price:'26K',status:'online',avatar:'☕',
   ig:'@sari.melati_',tiktok:'@sari_reads',verified:true,username:'sari01',password:'sari123'},

  {id:'t008',name:'Kaia Rizky',nickname:'Kaia',age:20,gender:'Perempuan',location:'Jakarta',
   bio:'Dancer & content creator! Energi positif 24/7. Seru banget buat teman ngobrol soal apapun — fashion, lifestyle, atau sekadar ketawa bareng 🦋',
   hobbies:'Dance, Content Creation, Fashion',services:['Chatting','Calling','Video Call','Offline Date'],
   schedule:['Siang (12-17)','Malam (20-24)'],
   rating:4.7,bookings:163,price:'26K',status:'online',avatar:'🦋',
   ig:'@kaia.rizky',tiktok:'@kaia_dance',verified:true,username:'kaia01',password:'kaia123'},

  {id:'t009',name:'Kira Mahesa',nickname:'Kira',age:24,gender:'Laki-laki',location:'Bali',
   bio:'Pro gamer yang bisa bantu carry rank kamu! Juga seru buat teman jalan atau ngobrol soal game & lifestyle 🎮',
   hobbies:'Gaming, Surfing, Photography',services:['Chatting','Video Call','Offline Date'],
   schedule:['Pagi (06-12)','Malam (20-24)'],
   rating:4.8,bookings:278,price:'26K',status:'online',avatar:'🎮',
   ig:'@kira.mahesa',tiktok:'@kira_pro',verified:true,username:'kira01',password:'kira123'},

  {id:'t010',name:'Dani Pratama',nickname:'Dani',age:25,gender:'Laki-laki',location:'Semarang',
   bio:'Teman ngobrol yang hangat dan supportif. Pendengar terbaik buat kamu yang butuh teman cerita 🌟',
   hobbies:'Olahraga, Musik, Traveling',services:['Chatting','Calling','Video Call','Offline Date'],
   schedule:['Pagi (06-12)','Sore (17-20)','Malam (20-24)'],
   rating:4.7,bookings:156,price:'26K',status:'online',avatar:'🌟',
   ig:'@dani.pratama_',tiktok:'@dani_vibe',verified:true,username:'dani01',password:'dani123'},

  {id:'t011',name:'Rio Ardiansyah',nickname:'Rio',age:26,gender:'Laki-laki',location:'Jakarta',
   bio:'Fotografer & traveler dengan seribu cerita! Yuk cerita soal perjalanan atau foto bareng jalan-jalan 📸',
   hobbies:'Fotografi, Travel, Kuliner',services:['Chatting','Calling','Offline Date'],
   schedule:['Siang (12-17)','Sore (17-20)'],
   rating:4.6,bookings:89,price:'26K',status:'offline',avatar:'📸',
   ig:'@rio.ardiansyah',tiktok:'@rio_lens',verified:true,username:'rio01',password:'rio123'},
];

// Bump this whenever DEFAULT_TESTIMONIALS content below changes, so returning
// visitors' Firebase data (seeded from an older version) gets refreshed too.
const TESTIMONIALS_VERSION = 3;
const DEFAULT_TESTIMONIALS = [
  {name:'Rafi A.',rating:5,text:'Anjay respon Ara gercep banget, chat-nya nyambung mulu ga pernah garing. Auto langganan sih ini mah!',service:'Chatting 7 Hari'},
  {name:'Bayu P.',rating:5,text:'Ngobrol bareng Kira tuh seru banget, nyambung dan ramah. Worth it banget dah!',service:'Video Call'},
  {name:'Dimas R.',rating:5,text:'Offline date sama Dira vibes-nya enak banget, orangnya asik dan tau spot-spot kece. Recommended banget bestie!',service:'Offline Date 4 Jam'},
  {name:'Angga W.',rating:4,text:'Prosesnya smooth, talent-nya responsif, ga ribet sama sekali. Gaskeun order lagi minggu depan!',service:'Video Call 30 Mnt'},
  {name:'Reza S.',rating:5,text:'Udah cobain banyak platform tapi Nabillove tetep juara. Real recommended, ga php sama sekali!',service:'PDKT Package 2'},
  {name:'Fajar K.',rating:5,text:'Ngobrol sama Reva santai abis, sejam berasa lima menit doang. Worth every rupiah, gaskeun!',service:'Calling 60 Menit'},
];

const DEFAULT_PRICELIST = {
  chatting:[{label:'1 Hari',price:'26.000',popular:false},{label:'3 Hari',price:'50.000',popular:false},{label:'7 Hari',price:'93.000',popular:true},{label:'14 Hari',price:'185.000',popular:false},{label:'30 Hari',price:'370.000',popular:false}],
  calling:[{label:'15 Menit',price:'12.000',popular:false},{label:'30 Menit',price:'23.000',popular:true},{label:'60 Menit',price:'45.000',popular:false},{label:'90 Menit',price:'60.000',popular:false},{label:'120 Menit',price:'100.000',popular:false}],
  videocall:[{label:'15 Menit',price:'30.000',popular:false},{label:'30 Menit',price:'55.000',popular:false},{label:'60 Menit',price:'95.000',popular:true},{label:'90 Menit',price:'125.000',popular:false},{label:'120 Menit',price:'160.000',popular:false}],
  offline:[{label:'2 Jam',price:'150.000',popular:false},{label:'4 Jam',price:'270.000',popular:true},{label:'6 Jam',price:'400.000',popular:false},{label:'8 Jam',price:'530.000',popular:false},{label:'Tambahan 1 Jam',price:'100.000',popular:false}],
  pap:[{label:'1x PAP',price:'10.000',popular:false}],
  paket:[
    {label:'Relationship 1',price:'220.000',popular:false,items:['Chat 3 Hari','Offline Date 1x (2 Jam)','PAP 1x','Call 15 Menit'],featured:false},
    {label:'Relationship 2',price:'400.000',popular:true,items:['Chat 7 Hari','Offline Date 1x (4 Jam)','PAP 3x','Call 15 Menit'],featured:false},
    {label:'Relationship 3',price:'600.000',popular:false,items:['Chat 14 Hari','Offline Date 2x (2 Jam)','Call 30 Menit (2x)','PAP 7x'],featured:true},
  ],
  pdkt:[
    {label:'PDKT 1',price:'100.000',popular:false,items:['Chat 3 Hari','PAP 1x','Call 15 Menit','VC 15 Menit'],featured:false},
    {label:'PDKT 2',price:'165.000',popular:true,items:['Chat 7 Hari','PAP 3x','Call 30 Menit','VC 15 Menit'],featured:false},
    {label:'PDKT 3',price:'380.000',popular:false,items:['Chat 14 Hari','PAP 10x','Call 30 Mnt (2x)','VC 15 Mnt (2x)','VN Sepuasnya'],featured:false},
    {label:'PDKT VIP',price:'700.000',popular:false,items:['Chat 30 Hari','PAP 20x','Call 30 Mnt (3x)','VC 15 Mnt (4x)','VN Sepuasnya','Prioritas Fast Response'],featured:true},
  ],
};

const DEFAULT_ORDERS = [
  {id:'ORD001',customer:'Amel R.',wa:'0812-0000-0001',talent:'Ara Salsabila',service:'Chatting 7 Hari',date:'2026-05-01',status:'Selesai',total:'93.000',createdAt:1746057600000},
  {id:'ORD002',customer:'Budi S.',wa:'0812-0000-0002',talent:'Kira Mahesa',service:'Video Call 30 Menit',date:'2026-05-03',status:'Aktif',total:'10.000',createdAt:1746230400000},
  {id:'ORD003',customer:'Citra M.',wa:'0812-0000-0003',talent:'Dira Cantika',service:'Offline Date 4 Jam',date:'2026-05-10',status:'Menunggu',total:'270.000',createdAt:1746835200000},
  {id:'ORD004',customer:'Dodi F.',wa:'0812-0000-0004',talent:'Reva Anindita',service:'Video Call 30 Mnt',date:'2026-05-08',status:'Selesai',total:'55.000',createdAt:1746662400000},
  {id:'ORD005',customer:'Erlin P.',wa:'0812-0000-0005',talent:'Luna Safira',service:'PDKT 2',date:'2026-05-12',status:'Aktif',total:'165.000',createdAt:1747008000000},
];

// ══════════════════════════════════════════════════════
//  INIT — DOM READY
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Init Firebase listeners PERTAMA — sebelum render apa pun
  initFirebaseListeners();

  initLoading();
  initCursor();
  initNavbar();
  initTheme();

  // Theme toggle
  const tt = document.getElementById('themeToggle');
  if (tt) tt.addEventListener('click', () => {
    const c = document.documentElement.getAttribute('data-theme');
    const n = c === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('lovia_theme', n);
    updateThemeIcon(n);
    toast('Mode ' + (n==='dark'?'Gelap 🌙':'Terang ☀️') + ' aktif', 'info');
  });

  renderHome();
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.page === 'landing'));
  initCounters();
  initScrollReveal();
  initTyping();
  initScrollUI();
  schedulePopup();

  // ESC menutup drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeDashSidebar('admin');
      closeDashSidebar('talent');
    }
  });

  // Cek session tersimpan
  const sess = lsGet('lovia_session', null);
  if (sess) {
    currentUser = sess;
    if (sess.role === 'admin') showPage('admin');
    else if (sess.role === 'talent') showPage('talent-dash');
  }
});

function initLoading() {
  // Generate floating particles — mix of soft dots and small sparkles
  const container = document.getElementById('loadingParticles');
  if (container) {
    const colors = ['', 'gold', 'purple'];
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      const isSparkle = Math.random() < 0.3;
      const size = isSparkle ? (10 + Math.random() * 6) : (3 + Math.random() * 6);
      const left = Math.random() * 100;
      const duration = 3.5 + Math.random() * 3.5;
      const delay = Math.random() * 4.5;
      const drift = (Math.random() * 80 - 40) + 'px';
      p.className = 'loading-particle ' + colors[Math.floor(Math.random() * colors.length)] + (isSparkle ? ' sparkle' : '');
      if (isSparkle) {
        p.textContent = '✦';
        p.style.cssText = `left:${left}%;font-size:${size}px;--drift:${drift};animation-duration:${duration}s;animation-delay:${delay}s;`;
      } else {
        p.style.cssText = `left:${left}%;width:${size}px;height:${size}px;--drift:${drift};animation-duration:${duration}s;animation-delay:${delay}s;`;
      }
      container.appendChild(p);
    }
  }

  // Rotate loading messages across the 4s duration — pesan yang lebih hangat & personal
  const messages = [
    'Mempersiapkan pengalaman terbaik...',
    'Setiap koneksi berawal dari satu sapaan hangat 💕',
    'Menyiapkan talent pilihan untukmu...',
    'Kadang yang kita butuh cuma teman untuk didengar',
    'Hampir siap menemanimu...'
  ];
  const textEl = document.getElementById('loadingText');
  let mi = 0;
  const msgTimer = setInterval(() => {
    mi++;
    if (textEl && mi < messages.length) {
      textEl.style.opacity = 0;
      setTimeout(() => { textEl.textContent = messages[mi]; textEl.style.opacity = 1; }, 200);
    }
  }, 900);

  setTimeout(() => {
    clearInterval(msgTimer);
    const ls = document.getElementById('loadingScreen');
    if (ls) ls.classList.add('hidden');
  }, 4000);
}

function initCursor() {
  return; /* kursor custom dimatikan: memakai kursor asli sistem (lebih ringan & aman di semua PC) */
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (window.innerWidth <= 768 || isTouchDevice) return;
  const dot = document.getElementById('cursorDot'), ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  function loop() {
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  document.addEventListener('mouseover', e => { if (e.target.matches('button,a,.talent-card,.service-card,.price-item-card,.package-card')) { ring.style.width='50px'; ring.style.height='50px'; ring.style.borderColor='var(--pink-deep)'; }});
  document.addEventListener('mouseout',  e => { if (e.target.matches('button,a,.talent-card,.service-card,.price-item-card,.package-card')) { ring.style.width='32px'; ring.style.height='32px'; ring.style.borderColor='var(--pink)'; }});
}

function initNavbar() {
  window.addEventListener('scroll', () => {
    const nb = document.getElementById('navbar');
    if (nb) nb.classList.toggle('scrolled', window.scrollY > 20);
  });
}

function customSelectHTML(id, options, onChange) {
  const first = options[0] || { value: '', label: '' };
  const opts = options.map((o,i) => `<div class="cs-option${i===0?' selected':''}" data-value="${String(o.value).replace(/"/g,'&quot;')}" onclick="selectCustomOption(this,'${id}'${onChange?`,'${onChange}'`:''})">${o.label}</div>`).join('');
  return `<div class="custom-select" id="${id}Wrap">
    <button type="button" class="custom-select-trigger" onclick="toggleCustomSelect('${id}')">
      <span class="cs-value">${first.label}</span>
      <i class="fas fa-chevron-down"></i>
    </button>
    <div class="custom-select-panel" id="${id}Panel">${opts}</div>
    <input type="hidden" id="${id}" value="${first.value}">
  </div>`;
}

function toggleCustomSelect(id) {
  const wrap = document.getElementById(id+'Wrap');
  const wasOpen = wrap.classList.contains('open');
  document.querySelectorAll('.custom-select.open').forEach(w => w.classList.remove('open'));
  if (!wasOpen) wrap.classList.add('open');
}

function selectCustomOption(el, id, onChange) {
  const wrap = document.getElementById(id+'Wrap');
  wrap.querySelectorAll('.cs-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  wrap.querySelector('.cs-value').textContent = el.textContent;
  document.getElementById(id).value = el.dataset.value;
  wrap.classList.remove('open');
  if (onChange && typeof window[onChange] === 'function') window[onChange]();
}

document.addEventListener('click', e => {
  if (!e.target.closest('.custom-select')) {
    document.querySelectorAll('.custom-select.open').forEach(w => w.classList.remove('open'));
  }
});

// ══════════════════════════════════════════════════════
//  INBOX SYSTEM — pesan masuk internal, menggantikan redirect ke WhatsApp
// ══════════════════════════════════════════════════════

function sendInboxMessage({name, contact, message, talentId, talentName, source}) {
  const id = 'm' + Date.now() + Math.random().toString(36).slice(2,7);
  const entry = {
    name: name || 'Guest', contact: contact || '-', message: message || '',
    talentId: talentId || null, talentName: talentName || null,
    source: source || 'Website', time: new Date().toISOString(), read: false
  };
  db.ref('inbox/admin/' + id).set(entry);
  if (talentId) db.ref('inbox/talent_' + talentId + '/' + id).set(entry);
  return true;
}

function openMessageModal(talentId, talentName, presetText) {
  window._msgContext = { talentId: talentId || null, talentName: talentName || null };
  const label = document.getElementById('msgContextLabel');
  if (label) label.textContent = talentName ? `Pesan untuk ${talentName}` : 'Pesan untuk Admin Nabillove';
  const ta = document.getElementById('msgText');
  if (ta) ta.value = presetText || '';
  openModal('messageModal');
}

function submitMessage() {
  const name = (document.getElementById('msgName')||{}).value?.trim();
  const contact = (document.getElementById('msgContact')||{}).value?.trim();
  const text = (document.getElementById('msgText')||{}).value?.trim();
  if (!name || !contact || !text) { toast('Lengkapi semua kolom pesan!','error'); return; }
  const ctx = window._msgContext || {};
  sendInboxMessage({ name, contact, message: text, talentId: ctx.talentId, talentName: ctx.talentName, source: ctx.talentName ? 'Chat Talent' : 'Chat Admin' });
  closeModal('messageModal');
  toast('Pesan terkirim! Admin akan segera membalas 💌','success');
  document.getElementById('msgName').value = '';
  document.getElementById('msgContact').value = '';
  document.getElementById('msgText').value = '';
}

function getInboxFor(key) {
  const raw = _inboxCache[key] || {};
  return Object.entries(raw)
    .map(([id, m]) => ({ ...m, _id: id }))
    .sort((a,b) => new Date(b.time) - new Date(a.time));
}

function updateInboxBadge() {
  const badge = document.getElementById('adminInboxBadge');
  if (badge) {
    const unread = getInboxFor('admin').filter(m => !m.read).length;
    badge.textContent = unread > 0 ? unread : '';
    badge.style.display = unread > 0 ? 'inline-flex' : 'none';
  }
}

function markInboxRead(key, id) {
  db.ref('inbox/' + key + '/' + id + '/read').set(true);
}

function renderAdminInbox(el) {
  const msgs = getInboxFor('admin');
  el.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:.35rem"><i class="fas fa-envelope" style="color:var(--pink-deep)"></i> Pesan Masuk</h2>
    <p style="color:var(--text-muted);font-size:.83rem;margin-bottom:1.5rem">Semua pesan dari pengunjung situs — tidak ada yang diarahkan ke WhatsApp lagi.</p>
    ${msgs.length ? `<div class="inbox-list">${msgs.map(m => `
      <div class="inbox-item ${m.read?'':'unread'}" onclick="markInboxRead('admin','${m._id}');this.classList.remove('unread')">
        <div class="inbox-item-top">
          <strong>${m.name}</strong>
          ${m.talentName ? `<span class="inbox-tag">untuk ${m.talentName}</span>` : ''}
          <span class="inbox-time">${new Date(m.time).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <p class="inbox-item-msg">${m.message}</p>
        <div class="inbox-item-contact"><i class="fas fa-phone"></i> ${m.contact}</div>
      </div>`).join('')}</div>` : `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-inbox"></i></div><h3>Belum Ada Pesan</h3><p>Pesan dari pengunjung situs akan muncul di sini.</p></div>`}
  `;
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

function toggleMobileMenu() {
  const nl = document.getElementById('navLinks');
  const bd = document.getElementById('navBackdrop');
  const hb = document.getElementById('hamburger');
  if (nl) nl.classList.toggle('open');
  if (bd) bd.classList.toggle('open');
  if (hb) hb.classList.toggle('active');
}

function initTheme() {
  const s = localStorage.getItem('lovia_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', s);
  updateThemeIcon(s);
}

function updateThemeIcon(t) {
  const i = document.getElementById('themeIcon');
  if (i) i.className = t==='dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function initScrollUI() {
  const bar = document.getElementById('scrollProgress');
  const btt = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    if (bar) bar.style.width = pct + '%';
    if (btt) btt.classList.toggle('visible', scrolled > 500);
  }, { passive: true });
}

function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }});
  }, {threshold:.1, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal:not(.visible),.reveal-left:not(.visible),.reveal-right:not(.visible),.reveal-scale:not(.visible)').forEach(el => obs.observe(el));
}

function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; const target = +el.dataset.target;
      let cur = 0; const step = Math.ceil(target/60);
      const timer = setInterval(() => { cur = Math.min(cur+step, target); el.textContent = cur.toLocaleString('id-ID'); if(cur>=target) clearInterval(timer); }, 25);
      obs.unobserve(el);
    });
  }, {threshold:.5});
  document.querySelectorAll('.hstat-num').forEach(el => obs.observe(el));
}

function initTyping() {
  const el = document.querySelector('.hero-title em');
  if (!el) return;

  const words = [
    'Partner',
    'Teman',
    'Sahabat',
    'Teman Curhat'
  ];

  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeEffect() {

    const currentWord = words[wordIndex];

    // typing
    if (!isDeleting) {
      el.textContent = currentWord.substring(0, charIndex + 1);
      charIndex++;

      // selesai mengetik
      if (charIndex === currentWord.length) {

        el.classList.add('typing-pause');

        setTimeout(() => {
          isDeleting = true;
          el.classList.remove('typing-pause');
          typeEffect();
        }, 1800);

        return;
      }

    } else {

      // deleting lebih smooth
      el.textContent = currentWord.substring(0, charIndex - 1);
      charIndex--;

      // selesai hapus
      if (charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;

        // transisi antar kata
        el.classList.add('typing-switch');

        setTimeout(() => {
          el.classList.remove('typing-switch');
          typeEffect();
        }, 250);

        return;
      }
    }

    const speed = isDeleting ? 45 : 90;

    setTimeout(typeEffect, speed);
  }

  typeEffect();
}

// ── PAGE NAVIGATION ──
function showPage(p) {
  currentPage = p;
  document.body.classList.toggle('in-dashboard', p === 'admin' || p === 'talent-dash');
  const isDash = (p === 'admin' || p === 'talent-dash');

  // Activate correct page
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pg = document.getElementById('page-'+p);
  if (pg) pg.classList.add('active');

  // Scroll top
  window.scrollTo({top:0, behavior:'smooth'});

  // Close mobile nav menu
  const nl = document.getElementById('navLinks');
  if (nl) nl.classList.remove('open');
  const bd = document.getElementById('navBackdrop');
  if (bd) bd.classList.remove('open');
  const hb = document.getElementById('hamburger');
  if (hb) hb.classList.remove('active');

  // Highlight the matching nav link
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === p);
  });

  // Hide/show navbar and footer for dashboard pages
  const navbar = document.getElementById('navbar');
  const footer = document.getElementById('mainFooter');
  if (isDash) {
    if (navbar) navbar.style.display = 'none';
    if (footer) footer.style.display = 'none';
    document.body.classList.add('dashboard-active');
  } else {
    if (navbar) navbar.style.display = '';
    if (footer) footer.style.display = '';
    document.body.classList.remove('dashboard-active');
  }

  // Render page content
  if (p === 'landing')       renderHome();
  if (p === 'talents')       renderTalents();
  if (p === 'pricelist')     renderPricelist();
  if (p === 'admin')         renderAdminDash();
  if (p === 'talent-dash')   renderTalentDash();

  // Re-attach scroll-reveal to any newly rendered elements (fixes content
  // that never appears because it was injected after the initial observer ran)
  requestAnimationFrame(() => { if (typeof initScrollReveal === 'function') initScrollReveal(); });

  // Close any open premium notification
  closePremiumNotif();
}

// ── RENDER HOME ──
function renderHome() {
  renderShowcase();
  renderTestimonials();
}

function renderShowcase() {
  const el = document.getElementById('talentShowcase'); if (!el) return;
  const featured = getTalents().filter(t => t.verified && t.status==='online').slice(0,4);
  el.innerHTML = featured.map((t,i) => {
    const photoUrl = getTalentPhotoUrl(t.id);
    const grad = TALENT_GRADIENTS[t.id] || ['#fbe3ea','#e8577f'];
    return `<div class="talent-card reveal" onclick="openTalentDetail('${t.id}')">
      <div class="tc-photo" style="background:linear-gradient(135deg,${grad[0]},${grad[1]})">
        ${photoUrl ? `<img src="${photoUrl}" alt="${t.name}" loading="lazy" style="animation-delay:${-(i%4)*2.3}s" onload="this.classList.add('loaded')" onerror="this.style.display='none'">` : ''}
        <div class="tc-avatar-fallback" style="${photoUrl?'display:none':''}">${avatarFallbackHTML(t)}</div>
        <div class="tc-status ${t.status==='online'?'online':''}">${t.status==='online'?'🟢 Online':'⚫ Offline'}</div>
      </div>
      <div class="tc-info">
        <div class="tc-header"><strong>${t.name}</strong>${t.verified?'<span class="verified-badge">✓</span>':''}</div>
        <div class="tc-meta">${t.location} · ${t.age}thn</div>
        <div class="tc-rating">⭐ ${t.rating} · ${t.bookings} booking</div>
        <div class="tc-services">${(t.services||[]).slice(0,3).map(s=>`<span>${s}</span>`).join('')}</div>
        <button class="btn-primary" style="width:100%;justify-content:center;margin-top:.75rem" onclick="event.stopPropagation();openBooking('${t.id}')">Booking Sekarang</button>
      </div>
    </div>`;
  }).join('');
  setTimeout(initScrollReveal, 60);
}

const REVIEWER_GRADIENTS = [
  ['#f6dcc8','#b8144a'], ['#e3dcf6','#4a2f7a'], ['#f6e6cf','#b98a44'],
  ['#fbe3ea','#8f74c9'], ['#dceaf6','#2f5f7a'], ['#f6dce0','#c8874a'],
];

function renderTestimonials() {
  const el = document.getElementById('testimonialsGrid'); if (!el) return;
  el.innerHTML = getTestimonials().map((t,i) => {
    const initial = (t.name || '?').trim().charAt(0).toUpperCase();
    const grad = REVIEWER_GRADIENTS[i % REVIEWER_GRADIENTS.length];
    return `
    <div class="testi-card reveal">
      <div class="testi-header"><div class="testi-avatar" style="background:linear-gradient(135deg,${grad[0]},${grad[1]})"><span class="testi-avatar-letter">${initial}</span></div><div><strong>${t.name}</strong><div class="testi-stars">${'⭐'.repeat(t.rating)}</div></div></div>
      <p>"${t.text}"</p>
      <div class="testi-service">${t.service}</div>
    </div>`;
  }).join('');
  setTimeout(initScrollReveal, 60);
}

// ── RENDER TALENTS PAGE ──
function resetTalentFilters() {
  const ids = ['searchTalent','filterGender','filterService','filterLocation','sortTalent'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderTalents();
}

function renderTalents() {
  const grid = document.getElementById('talentGrid'); if (!grid) return;
  let talents = getTalents();
  const search  = (document.getElementById('searchTalent')  ||{}).value||'';
  const gender  = (document.getElementById('filterGender')  ||{}).value||'';
  const service = (document.getElementById('filterService') ||{}).value||'';
  const loc     = (document.getElementById('filterLocation')||{}).value||'';
  const sort    = (document.getElementById('sortTalent')    ||{}).value||'';

  if (search)  talents = talents.filter(t => t.name.toLowerCase().includes(search.toLowerCase())||t.nickname.toLowerCase().includes(search.toLowerCase()));
  if (gender)  talents = talents.filter(t => t.gender===gender);
  if (service) talents = talents.filter(t => (t.services||[]).includes(service));
  if (loc)     talents = talents.filter(t => t.location.includes(loc));
  if (sort==='rating')   talents = [...talents].sort((a,b)=>b.rating-a.rating);
  if (sort==='bookings') talents = [...talents].sort((a,b)=>b.bookings-a.bookings);
  if (sort==='name')     talents = [...talents].sort((a,b)=>a.name.localeCompare(b.name));

  const cnt = document.getElementById('talentCount'); if (cnt) cnt.textContent = talents.length;

  if (!talents.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"><i class="fas fa-magnifying-glass"></i></div>
      <h3>Belum Ada Talent yang Cocok</h3>
      <p>Coba ganti kata kunci atau reset filter untuk melihat semua talent kami.</p>
      <button class="btn-outline" onclick="resetTalentFilters()"><i class="fas fa-rotate-left"></i> Reset Filter</button>
    </div>`;
    return;
  }

  grid.innerHTML = talents.map((t,i) => {
    const photoUrl = getTalentPhotoUrl(t.id);
    const grad = TALENT_GRADIENTS[t.id] || ['#fbe3ea','#e8577f'];
    return `<div class="talent-card" onclick="openTalentDetail('${t.id}')">
      <div class="tc-photo" style="background:linear-gradient(135deg,${grad[0]},${grad[1]})">
        ${photoUrl ? `<img src="${photoUrl}" alt="${t.name}" loading="lazy" style="animation-delay:${-(i%4)*2.3}s" onload="this.classList.add('loaded')" onerror="this.style.display='none'">` : ''}
        <div class="tc-avatar-fallback" style="${photoUrl?'display:none':''}">${avatarFallbackHTML(t)}</div>
        <div class="tc-status ${t.status==='online'?'online':t.status==='busy'?'busy':''}">${t.status==='online'?'🟢 Online':t.status==='busy'?'🟡 Sibuk':'⚫ Offline'}</div>
        ${t.verified?'<div class="tc-verified">✓ Verified</div>':''}
        ${t.pendingApproval?'<div class="tc-pending">⏳ Review</div>':''}
      </div>
      <div class="tc-info">
        <div class="tc-header"><strong>${t.name}</strong><span style="font-size:.75rem;color:var(--text-muted)">${t.gender}</span></div>
        <div class="tc-meta"><i class="fas fa-map-marker-alt" style="font-size:.7rem"></i> ${t.location} · ${t.age}thn</div>
        <div class="tc-rating">⭐ ${t.rating} <span style="color:var(--text-muted);font-size:.78rem">· ${t.bookings} booking</span></div>
        <p style="font-size:.78rem;color:var(--text-sec);margin:.4rem 0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${t.bio}</p>
        <div class="tc-services">${(t.services||[]).slice(0,3).map(s=>`<span>${s}</span>`).join('')}${(t.services||[]).length>3?`<span>+${t.services.length-3}</span>`:''}</div>
        <div style="display:flex;gap:.5rem;margin-top:.75rem">
          <button class="btn-primary" style="flex:1;justify-content:center;font-size:.8rem" onclick="event.stopPropagation();openBooking('${t.id}')">Booking</button>
          <button style="width:36px;height:36px;background:var(--pink-light);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--pink-deep);font-size:1rem;flex-shrink:0;border:none;cursor:pointer" onclick="event.stopPropagation();openMessageModal('${t.id}','${t.name.replace(/'/g,"\\'")}','Halo, saya tertarik dengan ${t.name.replace(/'/g,"\\'")}')"><i class="fas fa-comment-dots"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── TALENT DETAIL ──
function openTalentDetail(id) {
  const t = getTalents().find(x => x.id===id); if (!t) return;
  showPage('talent-detail');
  const el = document.getElementById('talentDetailContent'); if (!el) return;
  const photoUrl = getTalentPhotoUrl(id);
  const gallery  = getTalentGallery(id);
  const grad = TALENT_GRADIENTS[id] || ['#fbe3ea','#e8577f'];
  el.innerHTML = `
    <div class="talent-detail-grid">
      <div class="td-photos">
        <div class="td-hero-photo" style="width:100%;aspect-ratio:4/5;border-radius:var(--radius);overflow:hidden;background:linear-gradient(135deg,${grad[0]},${grad[1]});display:flex;align-items:center;justify-content:center;margin-bottom:.75rem">
          ${photoUrl?`<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'" onload="this.classList.add('loaded')">`:''}
          <span style="font-size:5rem${photoUrl?';display:none':''}">${t.avatar}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
          ${gallery.filter(Boolean).map(u=>`<div style="aspect-ratio:1;border-radius:var(--radius-sm);overflow:hidden;background:var(--card)"><img src="${u}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'" onload="this.classList.add('loaded')"></div>`).join('')}
        </div>
      </div>
      <div class="td-info">
        <div style="display:flex;align-items:flex-start;gap:.75rem;margin-bottom:1rem;flex-wrap:wrap">
          <h1 style="font-family:var(--font-display);font-size:1.8rem;flex:1">${t.name} <span style="font-size:1.4rem">${t.avatar}</span></h1>
          ${t.verified?'<span class="status-badge badge-active">✓ Verified</span>':''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;font-size:.85rem;color:var(--text-muted)">
          <span><i class="fas fa-map-marker-alt"></i> ${t.location}</span>
          <span><i class="fas fa-birthday-cake"></i> ${t.age} tahun</span>
          <span><i class="fas fa-venus-mars"></i> ${t.gender}</span>
        </div>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
          <div><span style="font-size:1.5rem;font-weight:700;color:var(--pink-deep)">⭐ ${t.rating}</span></div>
          <div style="color:var(--text-muted);font-size:.85rem">${t.bookings}+ booking berhasil</div>
          <div class="tc-status ${t.status}" style="position:relative;transform:none">${t.status==='online'?'🟢 Online':'⚫ Offline'}</div>
        </div>
        <p style="color:var(--text-sec);line-height:1.75;margin-bottom:1.25rem">${t.bio}</p>
        <div style="display:flex;flex-direction:column;gap:.65rem;margin-bottom:1.25rem">
          <div><strong style="font-size:.82rem;color:var(--text-muted)">HOBI</strong><div style="margin-top:.3rem;font-size:.88rem">${t.hobbies}</div></div>
          <div><strong style="font-size:.82rem;color:var(--text-muted)">LAYANAN</strong><div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem">${(t.services||[]).map(s=>`<span class="tc-services"><span>${s}</span></span>`).join('')}</div></div>
          <div><strong style="font-size:.82rem;color:var(--text-muted)">JADWAL AKTIF</strong><div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem">${(t.schedule||[]).map(s=>`<span style="padding:.2rem .6rem;background:var(--purple-light);border-radius:50px;font-size:.78rem">${s}</span>`).join('')}</div></div>
          ${t.ig?`<div><strong style="font-size:.82rem;color:var(--text-muted)">SOSMED</strong><div style="margin-top:.3rem;font-size:.85rem"><i class="fab fa-instagram"></i> ${t.ig}${t.tiktok?` &nbsp; <i class="fab fa-tiktok"></i> ${t.tiktok}`:''}</div></div>`:''}
        </div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap">
          <button class="btn-primary glow-btn" style="flex:1;justify-content:center" onclick="openBooking('${t.id}')"><i class="fas fa-calendar-plus"></i> Booking Sekarang</button>
          <button class="btn-outline" style="flex:1;justify-content:center;display:flex;align-items:center;gap:.4rem" onclick="openMessageModal('${t.id}','${t.name.replace(/'/g,"\\'")}','Halo, saya ingin booking ${t.name.replace(/'/g,"\\'")}')"><i class="fas fa-comment-dots"></i> Chat Admin</button>
        </div>
      </div>
    </div>`;
}

// ── PRICELIST ──
function renderPricelist() {
  const el = document.getElementById('pricelistContainer'); if (!el) return;
  const pl = getPricelist();
  const SERVICES = [
    {key:'chatting',label:'💬 Chatting',desc:'Chat santai & asik'},
    {key:'calling',label:'📞 Calling',desc:'Telepon langsung'},
    {key:'videocall',label:'🎥 Video Call',desc:'Tatap muka virtual'},
    {key:'offline',label:'📍 Offline Date',desc:'Jalan bareng'},
    {key:'pap',label:'📸 PAP',desc:'Photo & proof'},
    ];
  const filtered = currentPriceFilter==='all' ? SERVICES : SERVICES.filter(s=>s.key===currentPriceFilter);
  el.innerHTML = filtered.map(s => {
    const items = pl[s.key] || [];
    if (!items.length) return '';
    if (s.isPackage) {
      return `<div class="price-section reveal"><h3 class="price-section-title">${s.label} <span style="font-size:.8rem;font-weight:400;color:var(--text-muted)">${s.desc}</span></h3>
        <div class="package-grid">${items.map(pkg=>`<div class="package-card${pkg.featured?' featured':''}">
          ${pkg.featured?'<div class="pkg-badge">⭐ Best Value</div>':''}
          ${pkg.popular?'<div class="pkg-badge popular">🔥 Popular</div>':''}
          <h4>${pkg.label}</h4>
          <div class="pkg-price">Rp ${pkg.price}</div>
          <ul class="pkg-items">${(pkg.items||[]).map(i=>`<li><i class="fas fa-check"></i> ${i}</li>`).join('')}</ul>
          <div style="display:flex;gap:.4rem;margin-top:auto">
            <button class="btn-primary" style="flex:1;justify-content:center" onclick="openBookingFromPrice('${s.label} — ${pkg.label}','${pkg.price}')">Pesan</button>
            <button style="width:36px;height:36px;background:var(--pink-light);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--pink-deep);font-size:1rem;border:none;cursor:pointer" onclick="openMessageModal(null,null,'Mau pesan ${(s.label+' '+pkg.label).replace(/'/g,"\\'")}')"><i class="fas fa-comment-dots"></i></button>
          </div>
        </div>`).join('')}</div></div>`;
    }
    return `<div class="price-section reveal"><h3 class="price-section-title">${s.label} <span style="font-size:.8rem;font-weight:400;color:var(--text-muted)">${s.desc}</span></h3>
      <div class="price-items-grid">${items.map(item=>`<div class="price-item-card${item.popular?' popular':''}">
        ${item.popular?'<div class="popular-badge">🔥 Terpopuler</div>':''}
        <div class="price-item-label">${item.label}</div>
        <div class="price-item-price">Rp ${item.price}<small>/sesi</small></div>
        <div style="display:flex;gap:.4rem;margin-top:.75rem">
          <button class="btn-sm" style="flex:1;justify-content:center" onclick="openBookingFromPrice('${s.label} — ${item.label}','${item.price}')">Pesan</button>
          <button style="width:34px;height:34px;background:var(--pink-light);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--pink-deep);font-size:.9rem;flex-shrink:0;border:none;cursor:pointer" onclick="openMessageModal(null,null,'Mau pesan ${(s.label+' '+item.label).replace(/'/g,"\\'")}')"><i class="fas fa-comment-dots"></i></button>
        </div>
      </div>`).join('')}</div></div>`;
  }).join('');
  setTimeout(initScrollReveal, 60);
}

function filterPrice(cat, btn) {
  currentPriceFilter = cat;
  document.querySelectorAll('.price-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPricelist();
}

// ── BOOKING ──
function openBookingFromPrice(svc, price) {
  bookingData = {talent:null, serviceName:svc, servicePrice:price};
  buildBookingModal();
  openModal('bookingModal');
}

function openBooking(id) {
  const t = getTalents().find(x => x.id===id); if (!t) return;
  if (t.status==='offline') { toast('Talent sedang offline, pilih talent lain','error'); return; }
  if (t.status==='busy')    { toast('Talent sedang sibuk, coba lagi nanti','error'); return; }
  bookingData = {talent:t, serviceName:null, servicePrice:null};
  buildBookingModal();
  openModal('bookingModal');
}

function buildBookingModal() {
  bookingStep = 1;
  const {talent, serviceName, servicePrice} = bookingData;
  const minDate = new Date().toISOString().split('T')[0];
  const photoUrl = talent ? getTalentPhotoUrl(talent.id) : null;
  const grad = talent ? (TALENT_GRADIENTS[talent.id]||['#fbe3ea','#e8577f']) : ['#fbe3ea','#e8577f'];
  const talentPreview = talent ? `
    <div style="display:flex;align-items:center;gap:1rem;padding:.85rem;background:var(--pink-light);border-radius:var(--radius-sm);margin-bottom:1.25rem">
      <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,${grad[0]},${grad[1]});display:flex;align-items:center;justify-content:center">
        ${photoUrl?`<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:1.5rem">${talent.avatar}</span>`}
      </div>
      <div><strong>${talent.name}</strong><div style="font-size:.78rem;color:var(--text-muted)">${talent.location} · ⭐ ${talent.rating}</div></div>
    </div>
    <div class="form-group"><label>Pilih Layanan</label>
      ${customSelectHTML('bkService', (talent.services||[]).map(s=>({value:s,label:s})))}
    </div>`
  : `<div style="padding:.85rem;background:var(--purple-light);border-radius:var(--radius-sm);margin-bottom:1.25rem">
      <strong>📦 ${serviceName}</strong>
      <div style="font-size:.82rem;color:var(--text-muted);margin-top:.25rem">Harga: Rp ${servicePrice}</div>
    </div>
    <div class="form-group"><label>Pilih Talent (Opsional)</label>
      ${customSelectHTML('bkTalent', [{value:'',label:'Pilihkan oleh admin'}, ...getTalents().filter(t=>t.status==='online').map(t=>({value:t.id,label:`${t.avatar} ${t.name} — ${t.location}`}))])}
    </div>`;

  const content = document.getElementById('bookingContent'); if (!content) return;
  content.innerHTML = `
    <div class="booking-progress"><div class="bp-dot active" id="bp1"></div><div class="bp-dot" id="bp2"></div><div class="bp-dot" id="bp3"></div></div>
    <div class="booking-step active" id="bkStep1">
      <h4 style="font-family:var(--font-display);margin-bottom:1.25rem">1. Pilih Layanan</h4>
      ${talentPreview}
      <button class="btn-primary" style="width:100%;justify-content:center;margin-top:.75rem" onclick="bkNext(1)">Lanjut <i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="booking-step" id="bkStep2">
      <h4 style="font-family:var(--font-display);margin-bottom:1.25rem">2. Pilih Jadwal</h4>
      <div class="form-group"><label>Tanggal</label><input type="date" id="bkDate" min="${minDate}" style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text)" /></div>
      <div class="form-group" style="margin-top:.75rem"><label>Jam</label>${customSelectHTML('bkTime', ['09:00 — Pagi','12:00 — Siang','15:00 — Sore','18:00 — Petang','20:00 — Malam'].map(v=>({value:v,label:v})))}</div>
      <div class="form-group" style="margin-top:.75rem"><label>Lokasi/Platform</label>${customSelectHTML('bkLocation', ['Online (WhatsApp)','Online (Discord)','Online (Zoom)','Offline — Cafe','Offline — Mall','Offline — Taman'].map(v=>({value:v,label:v})))}</div>
      <div style="display:flex;gap:.75rem;margin-top:1rem">
        <button class="btn-outline" style="flex:1;justify-content:center" onclick="bkPrev(2)"><i class="fas fa-arrow-left"></i> Kembali</button>
        <button class="btn-primary" style="flex:1;justify-content:center" onclick="bkNext(2)">Lanjut <i class="fas fa-arrow-right"></i></button>
      </div>
    </div>
    <div class="booking-step" id="bkStep3">
      <h4 style="font-family:var(--font-display);margin-bottom:1.25rem">3. Data Pemesan</h4>
      <div class="form-group"><label>Nama Lengkap *</label><input type="text" id="bkName" placeholder="Nama lengkapmu" style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text)" /></div>
      <div class="form-group" style="margin-top:.75rem"><label>WhatsApp *</label><input type="text" id="bkWa" placeholder="08xxxxxxxxxx" style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text)" /></div>
      <div class="form-group" style="margin-top:.75rem"><label>Catatan</label><textarea id="bkNote" rows="2" placeholder="Pesan untuk talent..." style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);resize:vertical"></textarea></div>
      <div style="padding:.7rem;background:var(--pink-light);border-radius:var(--radius-sm);font-size:.78rem;color:var(--pink-deep);margin:.75rem 0"><i class="fas fa-shield-alt"></i> Data kamu aman & hanya untuk keperluan booking.</div>
      <div style="display:flex;gap:.75rem">
        <button class="btn-outline" style="flex:1;justify-content:center" onclick="bkPrev(3)"><i class="fas fa-arrow-left"></i> Kembali</button>
        <button class="btn-primary glow-btn" style="flex:1;justify-content:center" onclick="submitBookingFinal()"><i class="fas fa-check"></i> Konfirmasi</button>
      </div>
    </div>`;
}

function bkNext(step) {
  if (step===2) { const d=document.getElementById('bkDate'); if(!d||!d.value){toast('Pilih tanggal dulu!','error');return;} }
  const curr = document.getElementById('bkStep'+step);
  const next  = document.getElementById('bkStep'+(step+1));
  if (curr) curr.classList.remove('active');
  if (next) next.classList.add('active');
  bookingStep = step+1; updateBkProgress();
}

function bkPrev(step) {
  const curr = document.getElementById('bkStep'+step);
  const prev  = document.getElementById('bkStep'+(step-1));
  if (curr) curr.classList.remove('active');
  if (prev) prev.classList.add('active');
  bookingStep = step-1; updateBkProgress();
}

function updateBkProgress() {
  [1,2,3].forEach(i => {
    const d = document.getElementById('bp'+i);
    if (d) { d.classList.toggle('active', i===bookingStep); d.classList.toggle('done', i<bookingStep); }
  });
}

function submitBookingFinal() {
  const name = (document.getElementById('bkName')||{}).value||'';
  const wa   = (document.getElementById('bkWa')  ||{}).value||'';
  if (!name.trim()||!wa.trim()) { toast('Lengkapi nama dan WhatsApp!','error'); return; }

  const {talent, serviceName, servicePrice} = bookingData;
  const serviceEl = document.getElementById('bkService');
  const talentEl  = document.getElementById('bkTalent');
  const service   = talent ? (serviceEl?serviceEl.value:'Chatting') : serviceName;

  let talentName = 'Ditentukan Admin';
  if (talent) { talentName = talent.name; }
  else if (talentEl && talentEl.value) {
    const sel = getTalents().find(x => x.id===talentEl.value);
    talentName = sel ? sel.name : 'Ditentukan Admin';
  }

  const date = (document.getElementById('bkDate')||{}).value || new Date().toISOString().split('T')[0];
  const newOrder = {
    id:       'ORD' + String(Date.now()).slice(-8),
    customer: name.trim(),
    wa:       wa.trim(),
    talent:   talentName,
    service,
    date,
    location: (document.getElementById('bkLocation')||{}).value||'Online',
    note:     (document.getElementById('bkNote')||{}).value||'',
    status:   'Menunggu',
    total:    servicePrice || (talent?talent.price:'0'),
    createdAt: Date.now()
  };

  // Simpan ke Firebase Realtime Database
  addOrder(newOrder);

  // Juga kirim ke talentApplications jika daftar talent
  closeModal('bookingModal');
  toast('Booking berhasil dikirim! 🎉', 'success');
  setTimeout(() => showNotifModal(
    `Booking <strong>${service}</strong> dengan <strong>${talentName}</strong> berhasil!<br><br>Konfirmasi dikirim ke WhatsApp <strong>${wa.trim()}</strong> dalam 5–15 menit.`,
    talent ? talent.avatar : '💝'
  ), 400);
}

// ── REGISTER TALENT ──
function regNext(step) {
  if (step===1) {
    const fields=['reg_nama','reg_umur','reg_gender','reg_kota','reg_wa','reg_email'];
    for (const f of fields) { const el=document.getElementById(f); if(!el||!el.value.trim()){toast('Lengkapi semua field *!','error');return;} }
    const u=document.getElementById('reg_umur'); if(u&&+u.value<18){toast('Minimal usia 18 tahun!','error');return;}
  } else if (step===2) {
    const b=document.getElementById('reg_bio'); if(!b||b.value.trim().length<20){toast('Bio minimal 20 karakter!','error');return;}
  }
  goRegStep(step+1);
}

function regPrev(step) { goRegStep(step-1); }

function goRegStep(n) {
  document.querySelectorAll('.reg-step').forEach(s => s.classList.remove('active'));
  const s = document.getElementById('regStep'+n); if (s) s.classList.add('active');
  document.querySelectorAll('.step-indicator .step:not(.step-line)').forEach((s,i) => {
    s.classList.toggle('active', i+1===n); s.classList.toggle('done', i+1<n);
  });
  document.querySelectorAll('.step-indicator .step-line').forEach((l,i) => l.classList.toggle('filled', i+1<n));
}

function submitRegister() {
  const services  = Array.from(document.querySelectorAll('.reg-service:checked')).map(c=>c.value);
  const schedule  = Array.from(document.querySelectorAll('.reg-schedule:checked')).map(c=>c.value);
  if (!services.length) { toast('Pilih minimal 1 layanan!','error'); return; }
  if (!schedule.length) { toast('Pilih minimal 1 jadwal!','error'); return; }

  const g = f => document.getElementById(f);
  const newId = 'ta' + String(Date.now()).slice(-7);
  const pass  = 'talent' + Math.floor(1000+Math.random()*9000);
  const emojis = ['🌸','🌺','🌙','⭐','✨','🎵','💫','🦋'];

  const newT = {
    id:newId, name:g('reg_nama').value.trim(), nickname:g('reg_panggilan').value.trim(),
    age:+g('reg_umur').value, gender:g('reg_gender').value, location:g('reg_kota').value.trim(),
    bio:g('reg_bio').value.trim(), hobbies:'Belum diisi', services, schedule,
    rating:0, bookings:0, price:'26K', status:'offline',
    avatar:emojis[Math.floor(Math.random()*emojis.length)],
    verified:false, pendingApproval:true,
    ig:    g('reg_ig')     ? g('reg_ig').value     : '',
    tiktok:g('reg_tiktok') ? g('reg_tiktok').value : '',
    username:'talent_'+newId, password:pass,
    email:g('reg_email').value.trim(), wa:g('reg_wa').value.trim(),
    createdAt: Date.now()
  };

  // Simpan ke Firebase
  const talents = getTalents();
  talents.push(newT);
  setTalents(talents);

  // Simpan juga ke talentApplications (untuk admin review)
  db.ref('talentApplications/' + newId).set({
    ...newT,
    status: 'Menunggu Seleksi'
  }).catch(e => console.error('talentApplications error:', e));

  toast('Pendaftaran berhasil! 🎉', 'success');
  showNotifModal(`Pendaftaran berhasil!<br><br>Admin akan menghubungi via WhatsApp dalam 1×24 jam.<br><br>Data kamu masuk ke antrean seleksi admin.`, '🌟');
  setTimeout(() => showPage('landing'), 3000);
}

// ── DASHBOARD DRAWER ──
function openDashSidebar(type) {
  const sidebar  = document.getElementById(type==='admin'?'adminSidebar':'talentSidebar');
  const overlay  = document.getElementById(type==='admin'?'adminOverlay':'talentOverlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
  // Prevent scroll only on mobile (desktop sidebar is always visible)
  if (window.innerWidth <= 900) document.body.style.overflow = 'hidden';
}

function closeDashSidebar(type) {
  const sidebar  = document.getElementById(type==='admin'?'adminSidebar':'talentSidebar');
  const overlay  = document.getElementById(type==='admin'?'adminOverlay':'talentOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── AUTH ──
function showLoginModal() { openModal('loginModal'); }

function handleLogin() {
  const user = (document.getElementById('loginUser')||{}).value||'';
  const pass = (document.getElementById('loginPass')||{}).value||'';
  if (!user.trim()||!pass.trim()) { toast('Isi username dan password!','error'); return; }

  if (user==='admin' && pass==='admin123') {
    currentUser = {role:'admin', name:'Admin Nabillove', username:'admin'};
    lsSet('lovia_session', currentUser);
    closeModal('loginModal');
    toast('Selamat datang, Admin! 👑','success');
    setTimeout(() => showPage('admin'), 500);
    return;
  }

  const t = getTalents().find(x => x.username===user && x.password===pass);
  if (t) {
    if (t.pendingApproval && !t.verified) { toast('Akunmu masih dalam proses seleksi','error'); return; }
    currentUser = {role:'talent', name:t.name, talentId:t.id, username:t.username};
    lsSet('lovia_session', currentUser);
    closeModal('loginModal');
    toast(`Selamat datang, ${t.nickname||t.name}! ✨`,'success');
    setTimeout(() => showPage('talent-dash'), 500);
    return;
  }
  toast('Username atau password salah!','error');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('lovia_session');
  closeDashSidebar('admin');
  closeDashSidebar('talent');
  document.body.style.overflow = '';
  document.body.classList.remove('dashboard-active');
  // Re-show navbar and footer
  const navbar = document.getElementById('navbar');
  const footer = document.getElementById('mainFooter');
  if (navbar) navbar.style.display = '';
  if (footer) footer.style.display = '';
  toast('Berhasil logout! 👋','info');
  setTimeout(() => showPage('landing'), 300);
}

// ══════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════════════════════════
function renderAdminDash() { showAdminTab('overview'); }

function showAdminTab(tab) {
  closeDashSidebar('admin');

  // Clear all tabs so they re-render fresh
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.classList.remove('active');
    t.innerHTML = '';
  });

  const el = document.getElementById('admin-tab-' + tab);
  if (el) el.classList.add('active');

  // Update active link state
  document.querySelectorAll('#adminSidebar .db-link').forEach(l => {
    const oc = l.getAttribute('onclick') || '';
    l.classList.toggle('active', oc.includes("'" + tab + "'"));
  });

  const c = document.getElementById('admin-tab-' + tab);
  if (!c) return;

  if      (tab === 'overview')      renderAdminOverview(c);
  else if (tab === 'talents')       renderAdminTalents(c);
  else if (tab === 'orders')        renderAdminOrders(c);
  else if (tab === 'inbox')         renderAdminInbox(c);
  else if (tab === 'pricelist')     renderAdminPricelist(c);
  else if (tab === 'testimonials')  renderAdminTestimonials(c);
  else if (tab === 'settings')      renderAdminSettings(c);

  const content = document.getElementById('adminContent');
  if (content) content.scrollTop = 0;
}

function renderAdminOverview(el) {
  const talents = getTalents(), orders = getOrders(), pending = talents.filter(t=>t.pendingApproval&&!t.verified);
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.75rem;flex-wrap:wrap;gap:.75rem">
      <div><h2 style="font-family:var(--font-display);font-size:1.5rem">Selamat datang, Admin! 👑</h2><p style="color:var(--text-muted);font-size:.83rem">${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
      <div style="display:flex;gap:.6rem"><button class="btn-sm" onclick="showAdminTab('talents')"><i class="fas fa-users"></i> Kelola Talent</button><button class="btn-primary" onclick="showAdminTab('orders')"><i class="fas fa-shopping-bag"></i> Pesanan</button></div>
    </div>
    <div class="dash-grid-4">
      <div class="dash-stat-card" style="border-top:3px solid var(--pink-deep)"><div class="dsc-icon">👥</div><div class="dsc-val">${talents.length}</div><div class="dsc-label">Total Talent</div></div>
      <div class="dash-stat-card" style="border-top:3px solid #059669"><div class="dsc-icon">🟢</div><div class="dsc-val">${talents.filter(t=>t.status==='online').length}</div><div class="dsc-label">Talent Online</div></div>
      <div class="dash-stat-card" style="border-top:3px solid var(--gold)"><div class="dsc-icon">📦</div><div class="dsc-val">${orders.length}</div><div class="dsc-label">Total Order</div></div>
      <div class="dash-stat-card" style="border-top:3px solid var(--purple-deep)"><div class="dsc-icon">⏳</div><div class="dsc-val">${pending.length}</div><div class="dsc-label">Pending Daftar</div></div>
    </div>
    <div class="admin-2col-grid">
      <div class="dash-section"><h3>📋 Pendaftar Baru</h3>${pending.length?pending.map(t=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:.6rem"><span style="font-size:1.4rem">${t.avatar}</span><div><strong style="font-size:.85rem">${t.name}</strong><div style="font-size:.75rem;color:var(--text-muted)">${t.location} · ${t.age}thn</div></div></div><div style="display:flex;gap:.3rem"><button class="btn-sm" onclick="approveTalent('${t.id}')" style="border-color:#48bb78;color:#48bb78;padding:.3rem .6rem">✓ Setuju</button><button class="btn-sm" onclick="rejectTalent('${t.id}')" style="border-color:#ef4444;color:#ef4444;padding:.3rem .6rem">✗ Tolak</button></div></div>`).join(''):'<p style="color:var(--text-muted);font-size:.85rem">Tidak ada pendaftar baru</p>'}</div>
      <div class="dash-section"><h3>📈 Statistik Pesanan</h3><div style="font-size:.85rem;display:flex;flex-direction:column;gap:.5rem">
        <div style="display:flex;justify-content:space-between"><span>Menunggu</span><strong style="color:#d97706">${orders.filter(o=>o.status==='Menunggu').length}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Aktif</span><strong style="color:#059669">${orders.filter(o=>o.status==='Aktif').length}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Selesai</span><strong style="color:#2563eb">${orders.filter(o=>o.status==='Selesai').length}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Ditolak</span><strong style="color:#dc2626">${orders.filter(o=>o.status==='Ditolak').length}</strong></div>
      </div></div>
    </div>
    <div class="dash-section"><h3>📋 Order Terbaru</h3><div class="table-scroll">${ordersTable(orders.slice(0,10), true)}</div></div>`;
}

function renderAdminTalents(el) {
  const talents = getTalents();
  const cewe = talents.filter(t=>t.gender==='Perempuan');
  const cowo  = talents.filter(t=>t.gender==='Laki-laki');
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem">
      <h2 style="font-family:var(--font-display)">Kelola Talent 👥</h2>
      <div class="search-wrap" style="min-width:220px"><i class="fas fa-search"></i><input type="text" placeholder="Cari nama / kota..." oninput="adminSearchTalent(this.value)" /></div>
    </div>
    <div class="dash-section">
      <div class="table-scroll"><table class="admin-table"><thead><tr><th>Talent</th><th>Kota</th><th>Status</th><th>Rating</th><th>Verified</th><th>Pending</th><th>Aksi</th></tr></thead>
      <tbody id="adminTalentRows">${buildTalentRows(talents)}</tbody></table></div>
    </div>
    <div class="dash-section" style="margin-top:1.5rem">
      <h3 style="font-family:var(--font-display);font-size:1rem;margin-bottom:1rem">🔐 Akun Login Talent — RAHASIA</h3>
      <h4 style="font-size:.85rem;font-weight:700;color:var(--pink-deep);margin-bottom:.6rem">👧 Talent Cewe</h4>
      <div class="table-scroll" style="margin-bottom:1.25rem">
        <table class="admin-table"><thead><tr><th>#</th><th>Nama</th><th>Username</th><th>Password</th><th>Status</th></tr></thead>
        <tbody>${cewe.map((t,i)=>`<tr><td style="color:var(--text-muted);font-size:.78rem">${i+1}</td><td><strong>${t.name}</strong></td><td><code style="background:var(--bg);padding:.15rem .4rem;border-radius:4px;font-size:.83rem">${t.username}</code></td><td><code style="background:var(--bg);padding:.15rem .4rem;border-radius:4px;font-size:.83rem">${t.password}</code></td><td><span class="status-badge ${t.status==='online'?'badge-active':'badge-rejected'}">${t.status}</span></td></tr>`).join('')}</tbody>
        </table>
      </div>
      <h4 style="font-size:.85rem;font-weight:700;color:var(--purple);margin-bottom:.6rem">👦 Talent Cowo</h4>
      <div class="table-scroll">
        <table class="admin-table"><thead><tr><th>#</th><th>Nama</th><th>Username</th><th>Password</th><th>Status</th></tr></thead>
        <tbody>${cowo.map((t,i)=>`<tr><td style="color:var(--text-muted);font-size:.78rem">${i+1}</td><td><strong>${t.name}</strong></td><td><code style="background:var(--bg);padding:.15rem .4rem;border-radius:4px;font-size:.83rem">${t.username}</code></td><td><code style="background:var(--bg);padding:.15rem .4rem;border-radius:4px;font-size:.83rem">${t.password}</code></td><td><span class="status-badge ${t.status==='online'?'badge-active':'badge-rejected'}">${t.status}</span></td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function buildTalentRows(talents) {
  return talents.map(t => `<tr>
    <td><div style="display:flex;align-items:center;gap:.6rem"><span style="font-size:1.3rem">${t.avatar}</span><div><strong style="font-size:.85rem">${t.name}</strong><div style="font-size:.73rem;color:var(--text-muted)">${t.gender} · ${t.age}thn</div></div></div></td>
    <td style="font-size:.83rem">${t.location}</td>
    <td><span class="status-badge ${t.status==='online'?'badge-active':t.status==='busy'?'badge-pending':'badge-rejected'}">${t.status}</span></td>
    <td>⭐ ${t.rating}</td>
    <td><span class="status-badge ${t.verified?'badge-done':'badge-pending'}">${t.verified?'✓ Ya':'Belum'}</span></td>
    <td><span class="status-badge ${t.pendingApproval?'badge-pending':'badge-done'}">${t.pendingApproval?'⏳ Ya':'Tidak'}</span></td>
    <td><div style="display:flex;gap:.3rem;flex-wrap:wrap">
      <button class="btn-sm" onclick="toggleVerify('${t.id}')" style="font-size:.72rem;padding:.25rem .5rem">${t.verified?'Unverify':'Verify'}</button>
      ${t.pendingApproval?`<button class="btn-sm" onclick="approveTalent('${t.id}')" style="border-color:#48bb78;color:#48bb78;font-size:.72rem;padding:.25rem .5rem">✓</button><button class="btn-sm" onclick="rejectTalent('${t.id}')" style="border-color:#ef4444;color:#ef4444;font-size:.72rem;padding:.25rem .5rem">✗</button>`:''}
      <button class="btn-sm" onclick="deleteTalent('${t.id}')" style="border-color:#ef4444;color:#ef4444;font-size:.72rem;padding:.25rem .5rem"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

function adminSearchTalent(q) {
  const talents = getTalents().filter(t => t.name.toLowerCase().includes(q.toLowerCase())||t.location.toLowerCase().includes(q.toLowerCase()));
  const rows = document.getElementById('adminTalentRows');
  if (rows) rows.innerHTML = buildTalentRows(talents);
}

function renderAdminOrders(el) {
  const orders = getOrders();
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem"><h2 style="font-family:var(--font-display)">Kelola Pesanan 📦</h2><span style="font-size:.8rem;color:var(--text-muted)">Total: ${orders.length} pesanan · Data real-time Firebase</span></div>
    <div class="dash-section"><div class="table-scroll">${ordersTable(orders, true)}</div></div>`;
}

function ordersTable(orders, editable=false) {
  if (!orders.length) return '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><div style="font-size:3rem">📭</div><p>Belum ada order</p></div>';
  return `<table class="admin-table"><thead><tr><th>ID</th><th>Customer</th><th>Talent</th><th>Layanan</th><th>Tanggal</th><th>Total</th><th>Status</th>${editable?'<th>Ubah</th>':''}</tr></thead><tbody>
    ${orders.map(o=>`<tr>
      <td style="font-size:.72rem;color:var(--text-muted);font-family:monospace">${o.id}</td>
      <td><strong>${o.customer}</strong>${o.wa?`<br><small style="color:var(--text-muted)">${o.wa}</small>`:''}</td>
      <td>${o.talent}</td>
      <td style="font-size:.82rem">${o.service}</td>
      <td style="font-size:.82rem">${o.date}</td>
      <td style="font-weight:700;color:var(--pink-deep)">Rp ${o.total}</td>
      <td><span class="status-badge ${o.status==='Selesai'?'badge-done':o.status==='Aktif'?'badge-active':o.status==='Ditolak'?'badge-rejected':'badge-pending'}">${o.status}</span></td>
      ${editable?`<td><select style="font-size:.78rem;border:1px solid var(--border);border-radius:8px;padding:.3rem .5rem;background:var(--bg);color:var(--text)" onchange="updateOrderStatus('${o.id}',this.value)"><option ${o.status==='Menunggu'?'selected':''}>Menunggu</option><option ${o.status==='Aktif'?'selected':''}>Aktif</option><option ${o.status==='Selesai'?'selected':''}>Selesai</option><option ${o.status==='Ditolak'?'selected':''}>Ditolak</option></select></td>`:''}
    </tr>`).join('')}
  </tbody></table>`;
}

function renderAdminPricelist(el) {
  const pl = getPricelist();
  const cats=[['chatting','💬 Chatting'],['calling','📞 Calling'],['videocall','🎥 Video Call'],['offline','📍 Offline Date'],['pap','📸 PAP'],];
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem"><h2 style="font-family:var(--font-display)">Kelola Pricelist 💰</h2><span style="font-size:.8rem;color:var(--text-muted)">Edit langsung → tersimpan ke Firebase</span></div>
    ${cats.map(([cat,label])=>`<div class="dash-section"><h3 style="display:flex;align-items:center;justify-content:space-between">${label}<button class="btn-sm" onclick="addPrice('${cat}')"><i class="fas fa-plus"></i> Tambah</button></h3>
    <div class="table-scroll"><table class="admin-table"><thead><tr><th>Label</th><th>Harga (Rp)</th><th>Populer</th><th>Hapus</th></tr></thead><tbody>
    ${(pl[cat]||[]).map((item,i)=>`<tr>
      <td><input type="text" value="${item.label}" onchange="updatePrice('${cat}',${i},'label',this.value)" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:.3rem .6rem;width:100%;color:var(--text);font-size:.83rem"/></td>
      <td><input type="text" value="${item.price}" onchange="updatePrice('${cat}',${i},'price',this.value)" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:.3rem .6rem;width:120px;color:var(--text);font-size:.83rem"/></td>
      <td style="text-align:center"><input type="checkbox" ${item.popular?'checked':''} onchange="updatePrice('${cat}',${i},'popular',this.checked)"/></td>
      <td><button class="btn-sm" onclick="deletePrice('${cat}',${i})" style="border-color:#ef4444;color:#ef4444"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('')}
    </tbody></table></div></div>`).join('')}`;
}

function updatePrice(cat, i, field, val) {
  const pl = getPricelist();
  if (!pl[cat]||!pl[cat][i]) return;
  pl[cat][i][field] = field==='popular' ? Boolean(val) : val;
  setPricelist(pl);
  toast('Tersimpan ke Firebase ✓','success');
}

function deletePrice(cat, i) {
  const pl = getPricelist();
  pl[cat].splice(i,1);
  setPricelist(pl);
  renderAdminPricelist(document.getElementById('admin-tab-pricelist'));
  toast('Dihapus','info');
}

function addPrice(cat) {
  const pl = getPricelist();
  if (!pl[cat]) pl[cat]=[];
  pl[cat].push({label:'Item Baru',price:'0',popular:false});
  setPricelist(pl);
  renderAdminPricelist(document.getElementById('admin-tab-pricelist'));
}

function renderAdminTestimonials(el) {
  const ts = getTestimonials();
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem"><h2 style="font-family:var(--font-display)">Kelola Testimoni ⭐</h2></div>
    <div class="dash-section"><div class="table-scroll"><table class="admin-table"><thead><tr><th>User</th><th>Rating</th><th>Teks</th><th>Layanan</th><th>Aksi</th></tr></thead><tbody>
    ${ts.map((t,i)=>`<tr>
      <td>${(t.name||'?').charAt(0)} <strong>${t.name}</strong></td>
      <td>${'⭐'.repeat(t.rating)}</td>
      <td style="max-width:200px;font-size:.78rem;color:var(--text-sec)">${t.text.slice(0,90)}...</td>
      <td><span class="testi-service">${t.service}</span></td>
      <td><button class="btn-sm" onclick="deleteTestimonial(${i})" style="border-color:#ef4444;color:#ef4444"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('')}
    </tbody></table></div></div>`;
}

function deleteTestimonial(i) {
  const ts = getTestimonials(); ts.splice(i,1); setTestimonials(ts);
  renderAdminTestimonials(document.getElementById('admin-tab-testimonials'));
  toast('Dihapus','info');
}

function renderAdminSettings(el) {
  el.innerHTML = `<h2 style="font-family:var(--font-display);margin-bottom:1.5rem">Pengaturan ⚙️</h2>
    <div class="admin-2col-grid">
      <div class="dash-section"><h3>🔐 Akun Admin</h3><div style="font-size:.88rem;display:flex;flex-direction:column;gap:.5rem"><div>Username: <strong>admin</strong></div><div>Password: <strong>admin123</strong></div><div>Role: <strong>Super Admin</strong></div></div></div>
      <div class="dash-section"><h3>📊 Platform</h3><div style="font-size:.88rem;display:flex;flex-direction:column;gap:.5rem"><div>Versi: <strong>Nabillove v3.0</strong></div><div>Storage: <strong>Firebase Realtime Database ✅</strong></div><div>Deploy: <strong>GitHub Pages Ready</strong></div></div></div>
      <div class="dash-section"><h3>🎨 Tema</h3><div style="display:flex;gap:.75rem"><button class="btn-sm" onclick="document.documentElement.setAttribute('data-theme','light');localStorage.setItem('lovia_theme','light');updateThemeIcon('light');toast('Terang aktif','info')">☀️ Terang</button><button class="btn-sm" onclick="document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('lovia_theme','dark');updateThemeIcon('dark');toast('Gelap aktif','info')">🌙 Gelap</button></div></div>
      <div class="dash-section"><h3>🗑️ Reset Data Firebase</h3><p style="font-size:.82rem;color:var(--text-muted);margin-bottom:1rem">Hapus semua data dari Firebase (tidak bisa dibatalkan)</p><button class="btn-outline" onclick="resetData()" style="border-color:#ef4444;color:#ef4444"><i class="fas fa-redo"></i> Reset Semua</button></div>
    </div>`;
}

function resetData() {
  if (!confirm('Reset semua data di Firebase?\nTidak bisa dibatalkan.')) return;
  db.ref('talents').remove();
  db.ref('orders').remove();
  db.ref('pricelist').remove();
  db.ref('testimonials').remove();
  db.ref('customPhotos').remove();
  _talentsCache = null; _ordersCache = null; _priceCache = null; _testiCache = null; _photosCache = {};
  toast('Data Firebase direset!','info');
  renderAdminDash();
}

function approveTalent(id) {
  updateTalent(id, {pendingApproval:false, verified:true});
  // Juga update talentApplications
  db.ref('talentApplications/' + id + '/status').set('Disetujui').catch(()=>{});
  toast('Talent disetujui ✓','success');
  renderAdminDash();
}

function rejectTalent(id) {
  updateTalent(id, {pendingApproval:false, verified:false});
  db.ref('talentApplications/' + id + '/status').set('Ditolak').catch(()=>{});
  toast('Talent ditolak','info');
  renderAdminDash();
}

function toggleVerify(id) {
  const t = getTalents().find(x=>x.id===id);
  if (t) updateTalent(id, {verified:!t.verified});
  toast('Verifikasi diperbarui!','info');
  renderAdminTalents(document.getElementById('admin-tab-talents'));
}

function deleteTalent(id) {
  if (!confirm('Hapus talent ini dari database?')) return;
  const talents = getTalents().filter(t=>t.id!==id);
  setTalents(talents);
  db.ref('talents/'+id).remove().catch(()=>{});
  toast('Talent dihapus','info');
  renderAdminTalents(document.getElementById('admin-tab-talents'));
}

// ══════════════════════════════════════════════════════
//  TALENT DASHBOARD
// ══════════════════════════════════════════════════════
function renderTalentDash() {
  const tId = currentUser ? currentUser.talentId : null;
  const t   = tId ? getTalents().find(x => x.id === tId) : null;

  // Update topbar user label
  const el = document.getElementById('talentTopbarUser');
  if (el && t) el.textContent = (t.avatar || '✨') + ' ' + (t.nickname || t.name);

  // Update sidebar avatar name
  const sn = document.getElementById('talentSidebarName');
  if (sn && t) sn.textContent = t.nickname || t.name;

  // Always show overview tab fresh on dashboard load
  showTalentTab('overview');

  // Update inbox badge immediately too
  if (t) {
    const badge = document.getElementById('talentInboxBadge');
    if (badge) {
      const unread = getInboxFor('talent_' + t.id).filter(m => !m.read).length;
      badge.textContent = unread > 0 ? unread : '';
      badge.style.display = unread > 0 ? 'inline-flex' : 'none';
    }
  }
}

function showTalentTab(tab) {
  // Close sidebar on mobile
  closeDashSidebar('talent');

  // Deactivate all tabs
  document.querySelectorAll('.talent-tab').forEach(t => {
    t.classList.remove('active');
    t.innerHTML = ''; // clear stale content so it always re-renders fresh
  });

  // Activate target tab
  const el = document.getElementById('talent-tab-' + tab);
  if (el) el.classList.add('active');

  // Update sidebar active link
  document.querySelectorAll('#talentSidebar .db-link').forEach(l => {
    const oc = l.getAttribute('onclick') || '';
    l.classList.toggle('active', oc.includes("'" + tab + "'"));
  });

  // Get talent data fresh from cache
  const tId = currentUser ? currentUser.talentId : null;
  const t   = tId ? getTalents().find(x => x.id === tId) : getTalents()[0];

  const c = document.getElementById('talent-tab-' + tab);
  if (!c) return;

  // Render the correct tab content
  if      (tab === 'overview')  renderTalentOverview(c, t);
  else if (tab === 'orders')    renderTalentOrders(c, t);
  else if (tab === 'inbox')     renderTalentInbox(c, t);
  else if (tab === 'profile')   renderTalentProfile(c, t);
  else if (tab === 'earnings')  renderTalentEarnings(c, t);

  // Scroll content area to top
  const content = document.getElementById('talentContent');
  if (content) content.scrollTop = 0;
}

function renderTalentInbox(el, t) {
  if (!t) { el.innerHTML = '<p style="padding:2rem;color:var(--text-muted)">Data tidak ditemukan</p>'; return; }
  const msgs = getInboxFor('talent_' + t.id);
  const badge = document.getElementById('talentInboxBadge');
  if (badge) {
    const unread = msgs.filter(m => !m.read).length;
    badge.textContent = unread > 0 ? unread : '';
    badge.style.display = unread > 0 ? 'inline-flex' : 'none';
  }
  el.innerHTML = `
    <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:.35rem"><i class="fas fa-envelope" style="color:var(--pink-deep)"></i> Pesan Masuk</h2>
    <p style="color:var(--text-muted);font-size:.83rem;margin-bottom:1.5rem">Pesan dari calon customer yang ingin kenal kamu lebih dekat.</p>
    ${msgs.length ? `<div class="inbox-list">${msgs.map(m => `
      <div class="inbox-item ${m.read?'':'unread'}" onclick="markInboxRead('talent_${t.id}','${m._id}');this.classList.remove('unread')">
        <div class="inbox-item-top">
          <strong>${m.name}</strong>
          <span class="inbox-time">${new Date(m.time).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <p class="inbox-item-msg">${m.message}</p>
        <div class="inbox-item-contact"><i class="fas fa-phone"></i> ${m.contact}</div>
      </div>`).join('')}</div>` : `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-inbox"></i></div><h3>Belum Ada Pesan</h3><p>Pesan dari customer yang tertarik denganmu akan muncul di sini.</p></div>`}
  `;
}

function renderTalentOverview(el,t) {
  if (!t) { el.innerHTML='<p style="padding:2rem;color:var(--text-muted)">Data tidak ditemukan</p>'; return; }
  const myOrders = getOrders().filter(o=>o.talent===t.name);
  const photoUrl = getTalentPhotoUrl(t.id);
  const grad = TALENT_GRADIENTS[t.id]||['#fbe3ea','#e8577f'];
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem">
      <div><h2 style="font-family:var(--font-display)">Halo, ${t.nickname||t.name}! ${t.avatar}</h2><p style="color:var(--text-muted);font-size:.83rem">${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</p></div>
      <button class="btn-sm ${t.status==='online'?'':'btn-primary'}" onclick="toggleTalentStatus('${t.id}')" style="${t.status==='online'?'border-color:#059669;color:#059669':''}">${t.status==='online'?'🟢 Online — klik Offline':'⚫ Offline — klik Online'}</button>
    </div>
    <div class="dash-grid-4">
      <div class="dash-stat-card" style="border-top:3px solid var(--pink-deep)"><div class="dsc-icon">📦</div><div class="dsc-val">${myOrders.length}</div><div class="dsc-label">Total Booking</div></div>
      <div class="dash-stat-card" style="border-top:3px solid var(--gold)"><div class="dsc-icon">⏳</div><div class="dsc-val">${myOrders.filter(o=>o.status==='Menunggu').length}</div><div class="dsc-label">Menunggu</div></div>
      <div class="dash-stat-card" style="border-top:3px solid #059669"><div class="dsc-icon">✅</div><div class="dsc-val">${myOrders.filter(o=>o.status==='Aktif').length}</div><div class="dsc-label">Aktif</div></div>
      <div class="dash-stat-card" style="border-top:3px solid var(--purple-deep)"><div class="dsc-icon">🏅</div><div class="dsc-val">${myOrders.filter(o=>o.status==='Selesai').length}</div><div class="dsc-label">Selesai</div></div>
    </div>
    <div class="admin-2col-grid" style="margin-bottom:1rem">
      <div class="dash-section" style="background:linear-gradient(135deg,var(--pink-light),var(--purple-light))">
        <div style="display:flex;align-items:center;gap:1rem">
          <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,${grad[0]},${grad[1]});display:flex;align-items:center;justify-content:center">
            ${photoUrl?`<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:2rem">${t.avatar}</span>`}
          </div>
          <div><div style="font-family:var(--font-display);font-size:1.1rem">${t.name}</div><div style="font-size:.8rem;color:var(--text-muted);margin:.3rem 0">⭐ ${t.rating} · 📍 ${t.location}</div></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.75rem">${(t.services||[]).map(s=>`<span style="padding:.2rem .6rem;background:rgba(255,255,255,.5);border-radius:50px;font-size:.7rem">${s}</span>`).join('')}</div>
      </div>
      <div class="dash-section"><h3 style="font-size:1rem;margin-bottom:1rem">⚡ Aksi Cepat</h3>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          <button class="btn-sm" onclick="showTalentTab('orders')" style="justify-content:flex-start;gap:.6rem"><i class="fas fa-calendar-check"></i> Lihat Booking</button>
          <button class="btn-sm" onclick="showTalentTab('profile')" style="justify-content:flex-start;gap:.6rem"><i class="fas fa-user-edit"></i> Edit Profil</button>
          <button class="btn-sm" onclick="showTalentTab('profile')" style="justify-content:flex-start;gap:.6rem;border-color:var(--pink);color:var(--pink-deep)"><i class="fas fa-camera"></i> Kelola Foto</button>
          <button class="btn-sm" onclick="showTalentTab('earnings')" style="justify-content:flex-start;gap:.6rem"><i class="fas fa-wallet"></i> Pendapatan</button>
          <button class="btn-sm" onclick="toggleTalentStatus('${t.id}')" style="justify-content:flex-start;gap:.6rem;${t.status==='online'?'border-color:#ef4444;color:#ef4444':'border-color:#059669;color:#059669'}">${t.status==='online'?'<i class="fas fa-moon"></i> Set Offline':'<i class="fas fa-circle"></i> Set Online'}</button>
        </div>
      </div>
    </div>
    <div class="dash-section"><h3>📅 Booking Terbaru</h3>${myOrders.length?`<div class="table-scroll">${ordersTable(myOrders.slice(0,5))}</div>`:'<div style="text-align:center;padding:2rem;color:var(--text-muted)"><div style="font-size:2rem">📭</div><p>Belum ada booking</p></div>'}</div>`;
}

function toggleTalentStatus(id) {
  const t = getTalents().find(x => x.id === id);
  if (!t) return;
  const newStatus = t.status === 'online' ? 'offline' : 'online';
  updateTalent(id, { status: newStatus });
  toast(`Status: ${newStatus === 'online' ? '🟢 Online' : '⚫ Offline'}`, 'info');
  // Re-render overview tab only (no full reload)
  const overviewEl = document.getElementById('talent-tab-overview');
  if (overviewEl && overviewEl.classList.contains('active')) {
    const fresh = getTalents().find(x => x.id === id) || t;
    renderTalentOverview(overviewEl, { ...fresh, status: newStatus });
  }
  // Update topbar
  const topbar = document.getElementById('talentTopbarUser');
  if (topbar && t) topbar.textContent = (t.avatar || '✨') + ' ' + (t.nickname || t.name);
}

function renderTalentOrders(el,t) {
  if (!t) { el.innerHTML='<p style="padding:2rem">Data tidak ditemukan</p>'; return; }
  const myOrders = getOrders().filter(o=>o.talent===t.name);
  el.innerHTML = `<h2 style="font-family:var(--font-display);margin-bottom:1.5rem">Daftar Booking 📅</h2>
    <div class="dash-section">${myOrders.length?`<div class="table-scroll">${ordersTable(myOrders)}</div>`:'<div style="text-align:center;padding:3rem;color:var(--text-muted)"><div style="font-size:3rem">📭</div><p>Belum ada booking</p></div>'}</div>`;
}

// ── PROFILE & FOTO ──
function renderTalentProfile(el, t) {
  if (!t) { el.innerHTML='<p>Data tidak ditemukan</p>'; return; }
  const grad = TALENT_GRADIENTS[t.id]||['#fbe3ea','#e8577f'];
  const photoUrl = getTalentPhotoUrl(t.id);
  const gallery  = getTalentGallery(t.id);

  const photoSlot = (url, slotType, slotIdx) => {
    const isMain   = slotType==='main';
    const label    = isMain ? 'Foto Profil (Utama)' : ('Galeri Foto '+(slotIdx+1));
    const idSuffix = isMain ? 'main' : ('gal'+slotIdx);
    return `
    <div class="photo-slot" id="slot-${idSuffix}-${t.id}">
      <div class="photo-slot-label">${isMain?'🖼️':'📸'} ${label}</div>
      <div class="photo-slot-preview" id="preview-${idSuffix}-${t.id}">
        ${url
          ? `<img src="${url}" alt="${label}" onerror="this.parentElement.innerHTML='<div class=photo-slot-empty>${t.avatar}</div>'">
             <button class="photo-slot-del" onclick="deleteSlotPhoto('${t.id}','${slotType}',${isMain?-1:slotIdx})" title="Hapus foto"><i class='fas fa-trash'></i></button>`
          : `<div class="photo-slot-empty">${isMain?t.avatar:'+'}</div>`
        }
      </div>
      <div class="photo-slot-actions">
        <label class="photo-upload-btn" title="Upload file PNG/JPG">
          <i class="fas fa-upload"></i> Upload File
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none"
            onchange="handlePhotoFileUpload(event,'${t.id}','${slotType}',${isMain?-1:slotIdx})">
        </label>
        <button class="photo-link-btn" onclick="showDriveLinkInput('${t.id}','${slotType}',${isMain?-1:slotIdx})">
          <i class="fab fa-google-drive"></i> Google Drive
        </button>
      </div>
      <div class="photo-drive-input" id="drive-input-${idSuffix}-${t.id}" style="display:none">
        <input type="text" id="drive-url-${idSuffix}-${t.id}" placeholder="Paste link Google Drive atau File ID..."
          style="width:100%;padding:.55rem .85rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.82rem">
        <div style="display:flex;gap:.5rem;margin-top:.5rem">
          <button class="btn-sm" style="flex:1;justify-content:center" onclick="applyDriveLink('${t.id}','${slotType}',${isMain?-1:slotIdx})"><i class="fas fa-check"></i> Terapkan</button>
          <button class="btn-sm" style="flex:1;justify-content:center" onclick="document.getElementById('drive-input-${idSuffix}-${t.id}').style.display='none'">Batal</button>
        </div>
      </div>
    </div>`;
  };

  el.innerHTML = `<h2 style="font-family:var(--font-display);margin-bottom:1.5rem">Edit Profil ✏️</h2>
    <div class="dash-section" style="margin-bottom:1.5rem">
      <h3 style="font-size:1rem;margin-bottom:.5rem">📸 Kelola Foto</h3>
      <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:1.25rem">📌 <strong>2 cara simpan foto:</strong> (1) Upload file PNG/JPG dari HP/PC — dikompres otomatis & disimpan ke database. (2) Paste link Google Drive — pastikan file sudah di-share "Anyone with the link". 1 foto profil + 2 foto galeri.</p>
      <div class="photo-slots-grid">
        ${photoSlot(photoUrl,'main',-1)}
        ${photoSlot(gallery[0],'gallery',0)}
        ${photoSlot(gallery[1],'gallery',1)}
      </div>
    </div>
    <div class="admin-2col-grid">
      <div class="dash-section">
        <div style="text-align:center;padding:1.25rem;background:linear-gradient(135deg,var(--pink-light),var(--purple-light));border-radius:var(--radius);margin-bottom:1.25rem">
          <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;margin:0 auto .6rem;background:linear-gradient(135deg,${grad[0]},${grad[1]});display:flex;align-items:center;justify-content:center">
            ${photoUrl?`<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`:''}
            <span style="font-size:2.2rem${photoUrl?';display:none':''}">${t.avatar}</span>
          </div>
          <h3 style="font-family:var(--font-display)">${t.name}</h3>
          <p style="color:var(--text-muted);font-size:.8rem;margin:.3rem 0">${t.location} · ${t.gender} · ${t.age} thn</p>
          <span class="status-badge ${t.verified?'badge-active':'badge-pending'}">${t.verified?'✓ Verified':'⏳ Menunggu'}</span>
        </div>
        <h3 style="font-size:.9rem;margin-bottom:.65rem">🔐 Kredensial Login</h3>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.8rem;font-size:.82rem">
          <div style="margin-bottom:.4rem">Username: <strong>${t.username}</strong></div>
          <div>Password: <strong>${t.password}</strong></div>
        </div>
      </div>
      <div class="dash-section">
        <h3 style="font-size:.95rem;margin-bottom:1rem">📝 Edit Info</h3>
        <div class="form-group"><label>Bio</label>
          <textarea rows="3" id="editBio" style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.85rem;resize:vertical">${t.bio}</textarea>
        </div>
        <div class="form-group" style="margin-top:.75rem"><label>Hobi</label>
          <input type="text" id="editHobi" value="${t.hobbies||''}" style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.85rem">
        </div>
        <div class="form-group" style="margin-top:.75rem"><label>Instagram</label>
          <input type="text" id="editIg" value="${t.ig||''}" style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.85rem">
        </div>
        <div class="form-group" style="margin-top:.75rem"><label>TikTok</label>
          <input type="text" id="editTiktok" value="${t.tiktok||''}" style="width:100%;padding:.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.85rem">
        </div>
        <button class="btn-primary" style="margin-top:1.25rem;width:100%;justify-content:center" onclick="saveTalentProfile('${t.id}')">
          <i class="fas fa-save"></i> Simpan ke Firebase
        </button>
      </div>
    </div>`;
}

// ── PHOTO HELPERS ──
function showDriveLinkInput(talentId, slotType, slotIdx) {
  const suffix = slotType==='main'?'main':('gal'+slotIdx);
  const el = document.getElementById(`drive-input-${suffix}-${talentId}`);
  if (el) el.style.display = el.style.display==='none' ? 'block' : 'none';
}

async function handlePhotoFileUpload(event, talentId, slotType, slotIdx) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.match(/image\/(png|jpeg|jpg|webp)/)) {
    toast('Format tidak didukung! Gunakan PNG/JPG/WEBP', 'error');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    toast('Ukuran file max 8MB!', 'error');
    return;
  }

  toast('Memproses foto...', 'info');

  // Langsung compress & simpan sebagai base64 ke Firebase Realtime DB
  compressAndSave(file, talentId, slotType, slotIdx, null);
}

function applyDriveLink(talentId, slotType, slotIdx) {
  const suffix  = slotType==='main'?'main':('gal'+slotIdx);
  const inputEl = document.getElementById(`drive-url-${suffix}-${talentId}`);
  if (!inputEl||!inputEl.value.trim()) { toast('Masukkan link Google Drive!','error'); return; }
  const url = driveUrlFromInput(inputEl.value.trim());
  if (!url) { toast('Link tidak valid! Pastikan link Google Drive benar.','error'); return; }
  applyPhotoToSlot(talentId, slotType, slotIdx, url);
  const driveInput = document.getElementById(`drive-input-${suffix}-${talentId}`);
  if (driveInput) driveInput.style.display='none';
  toast('🔗 Foto Google Drive diterapkan & disimpan ke Firebase!','success');
}

function applyPhotoToSlot(talentId, slotType, slotIdx, url) {
  const data = getCustomPhotoData(talentId);
  if (slotType==='main') {
    data.main = url;
  } else {
    if (!data.gallery) data.gallery=[null,null];
    data.gallery[slotIdx] = url;
  }
  // Simpan ke Firebase DB
  saveCustomPhotoData(talentId, data);

  // Refresh preview
  const suffix    = slotType==='main'?'main':('gal'+slotIdx);
  const previewEl = document.getElementById(`preview-${suffix}-${talentId}`);
  if (previewEl) {
    previewEl.innerHTML = `<img src="${url}" alt="Foto" onerror="this.parentElement.innerHTML='<div class=photo-slot-empty>❌</div>'">
      <button class="photo-slot-del" onclick="deleteSlotPhoto('${talentId}','${slotType}',${slotIdx})" title="Hapus foto"><i class='fas fa-trash'></i></button>`;
  }
  refreshTalentPhotoDisplay(talentId);
}

function deleteSlotPhoto(talentId, slotType, slotIdx) {
  if (!confirm('Hapus foto ini?')) return;
  const data = getCustomPhotoData(talentId);
  if (slotType==='main') { data.main=null; }
  else { if (data.gallery) data.gallery[slotIdx]=null; }
  saveCustomPhotoData(talentId, data);
  const suffix    = slotType==='main'?'main':('gal'+slotIdx);
  const previewEl = document.getElementById(`preview-${suffix}-${talentId}`);
  const t = getTalents().find(x=>x.id===talentId);
  if (previewEl) previewEl.innerHTML=`<div class="photo-slot-empty">${slotType==='main'?(t?t.avatar:'✨'):'+'}</div>`;
  refreshTalentPhotoDisplay(talentId);
  toast('Foto dihapus dari Firebase','info');
}

function refreshTalentPhotoDisplay(talentId) {
  const overviewEl = document.getElementById('talent-tab-overview');
  if (overviewEl && overviewEl.classList.contains('active')) {
    const t = getTalents().find(x=>x.id===talentId);
    if (t) renderTalentOverview(overviewEl, t);
  }
}

function saveTalentProfile(id) {
  const b  = document.getElementById('editBio');
  const h  = document.getElementById('editHobi');
  const ig = document.getElementById('editIg');
  const tk = document.getElementById('editTiktok');
  const updates = {};
  if (b)  updates.bio     = b.value;
  if (h)  updates.hobbies = h.value;
  if (ig) updates.ig      = ig.value;
  if (tk) updates.tiktok  = tk.value;
  updateTalent(id, updates);
  toast('Profil tersimpan ke Firebase! ✓','success');
}

function renderTalentEarnings(el, t) {
  if (!t) { el.innerHTML='<p>Data tidak ditemukan</p>'; return; }
  const done = getOrders().filter(o=>o.talent===t.name&&o.status==='Selesai');
  let total = 0;
  done.forEach(o => { const raw=(o.total||'').replace(/\./g,'').replace(/[^0-9]/g,''); total+=parseInt(raw||0,10); });
  el.innerHTML = `<h2 style="font-family:var(--font-display);margin-bottom:1.5rem">Pendapatan 💰</h2>
    <div class="dash-grid-4">
      <div class="dash-stat-card" style="background:linear-gradient(135deg,var(--pink-light),var(--purple-light));border:none"><div class="dsc-icon">💵</div><div class="dsc-val" style="font-size:1.2rem">Rp ${total.toLocaleString('id-ID')}</div><div class="dsc-label">Total Pendapatan</div></div>
      <div class="dash-stat-card"><div class="dsc-icon">📊</div><div class="dsc-val">${done.length}</div><div class="dsc-label">Order Selesai</div></div>
      <div class="dash-stat-card"><div class="dsc-icon">⭐</div><div class="dsc-val">${t.rating}</div><div class="dsc-label">Rating</div></div>
      <div class="dash-stat-card"><div class="dsc-icon">🏅</div><div class="dsc-val">${t.bookings}</div><div class="dsc-label">All Time Booking</div></div>
    </div>
    <div class="dash-section"><h3>📋 Histori Order Selesai</h3>${done.length?`<div class="table-scroll">${ordersTable(done)}</div>`:'<div style="text-align:center;padding:3rem;color:var(--text-muted)"><div style="font-size:3rem">💰</div><p>Belum ada pendapatan</p></div>'}</div>`;
}

// ── MODALS ──
function openModal(id)  { const el=document.getElementById(id); if(el)el.classList.add('open'); document.body.classList.add('modal-open'); }
function closeModal(id) { const el=document.getElementById(id); if(el)el.classList.remove('open'); if(!document.querySelector('.modal-overlay.open')) document.body.classList.remove('modal-open'); }

function showNotifModal(msg, icon='🎉') {
  const c = document.getElementById('notifContent');
  if (c) c.innerHTML = `<div style="text-align:center;padding:1rem"><div style="font-size:3.5rem;margin-bottom:1rem">${icon}</div><p style="font-size:.9rem;line-height:1.7;color:var(--text-sec)">${msg}</p><div style="margin-top:1.25rem;padding:.85rem;background:var(--pink-light);border-radius:var(--radius-sm);font-size:.8rem;color:var(--pink-deep);display:flex;align-items:center;gap:.5rem;justify-content:center"><i class="fab fa-whatsapp"></i> Konfirmasi dikirim via WhatsApp dalam 5–15 menit</div></div>`;
  openModal('notifModal');
}

function toast(msg, type='info') {
  const c = document.getElementById('toastContainer'); if (!c) return;
  while (c.children.length >= 3) c.removeChild(c.firstChild);
  const el = document.createElement('div'); el.className='toast '+type;
  const icons = {success:'✅',error:'❌',info:'ℹ️'};
  el.innerHTML = `<span style="flex-shrink:0">${icons[type]||'ℹ️'}</span><span style="flex:1">${msg}</span><span onclick="this.parentElement.remove()" style="flex-shrink:0;cursor:pointer;opacity:.6;padding:.1rem .2rem;font-size:.85rem">✕</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(10px)'; el.style.transition='all .35s'; setTimeout(()=>el.remove(),350); }, 3000);
}

// ── MUSIC — FIX: accessed inside function, not at top level ──
function toggleMusic() {
  const bgMusic = document.getElementById('bgMusic');
  if (!bgMusic) return;
  musicPlaying = !musicPlaying;
  const icon = document.getElementById('musicIcon');
  const btn  = document.getElementById('floatMusic');
  if (musicPlaying) {
    bgMusic.play().catch(()=>{}); // catch autoplay policy error
    if (icon) icon.className='fas fa-pause';
    if (btn)  btn.classList.add('playing');
    toast('🎵 Memutar: Bila Aku — Jeje','info');
    try { if ('mediaSession' in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: 'Bila Aku', artist: 'Jeje', album: 'Nabillove' }); } catch (e) {}
  } else {
    bgMusic.pause();
    if (icon) icon.className='fas fa-music';
    if (btn)  btn.classList.remove('playing');
    toast('🎵 Musik dimatikan','info');
  }
}

// ══════════════════════════════════════════════════════
//  PREMIUM NOTIFICATION SYSTEM — setiap 20 detik
//  Link target: https://benyoriki.com/
// ══════════════════════════════════════════════════════

const NOTIF_MESSAGES = [
  {
    emoji: '🌸',
    badge: '💕 Ara online!',
    title: 'Talent favoritmu sedang online',
    desc: 'Ara Salsabila & 7 talent lain siap menemanimu.',
    cta: 'Cari Talent',
    ctaUrl: null,
    action: () => showPage('talents')
  },
  {
    emoji: '🎉',
    badge: '📦 Promo Aktif!',
    title: 'Diskon 20% PDKT Package!',
    desc: 'Terbatas! Jangan sampai kehabisan.',
    cta: 'Lihat Harga',
    ctaUrl: null,
    action: () => showPage('pricelist')
  },
  {
    emoji: '⭐',
    badge: '🏆 Top Talent',
    title: 'Dira Cantika — Rating 5.0!',
    desc: '312+ booking, tersedia hari ini!',
    cta: 'Booking',
    ctaUrl: null,
    action: () => showPage('talents')
  },
  {
    emoji: '🎮',
    badge: '🟢 Online Sekarang',
    title: 'Kira Mahesa siap ngobrol!',
    desc: 'Rating tertinggi, slot terbatas!',
    cta: 'Ngobrol Sekarang',
    ctaUrl: null,
    action: () => showPage('talents')
  },
];

let _notifIdx = 0;
let _notifTimer = null;
let _notifScheduled = false;
let _notifShownCount = 0;
const _notifMaxPerSession = 3;

function schedulePopup() {
  if (_notifScheduled) return;
  _notifScheduled = true;
  // Tampilkan pertama kali setelah 12 detik, beri waktu user menjelajah dulu
  setTimeout(() => _showNextNotif(), 12000);
}

function _showNextNotif() {
  if (_notifShownCount >= _notifMaxPerSession) return;
  if (currentPage === 'admin' || currentPage === 'talent-dash') {
    _notifTimer = setTimeout(_showNextNotif, 30000);
    return;
  }
  if (document.querySelector('.modal-overlay.open')) {
    _notifTimer = setTimeout(_showNextNotif, 30000);
    return;
  }
  const msg = NOTIF_MESSAGES[_notifIdx % NOTIF_MESSAGES.length];
  _notifIdx++;
  _notifShownCount++;
  showPremiumNotif(msg);
  if (_notifShownCount < _notifMaxPerSession) {
    _notifTimer = setTimeout(_showNextNotif, 45000);
  }
}

function showPremiumNotif(msg) {
  // Remove existing
  const old = document.getElementById('premiumNotif');
  if (old) old.remove();

  const el = document.createElement('div');
  el.id = 'premiumNotif';
  el.className = 'premium-notif';

  const isExternal = !!msg.ctaUrl;
  const ctaHref = msg.ctaUrl || '#';
  window._pnAction = msg.action || null;

  el.innerHTML = `
    <div class="pn-emoji">${msg.emoji}</div>
    <div class="pn-text">
      <div class="pn-title">${msg.title}</div>
      <div class="pn-desc">${msg.desc}</div>
    </div>
    <a href="${ctaHref}" ${isExternal ? 'target="_blank" rel="noopener"' : ''} class="pn-cta-btn" onclick="handleNotifCta(event, ${isExternal})">
      ${msg.cta} <i class="fas fa-arrow-right"></i>
    </a>
    <button class="pn-close" onclick="closePremiumNotif()" aria-label="Tutup">✕</button>
    <div class="pn-progress"><div class="pn-progress-fill" id="pnProgressFill"></div></div>`;

  document.body.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('show');
      const fill = document.getElementById('pnProgressFill');
      if (fill) setTimeout(() => fill.classList.add('animating'), 100);
    });
  });

  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => closePremiumNotif(), 6000);
}

function closePremiumNotif() {
  const el = document.getElementById('premiumNotif');
  if (!el) return;
  el.classList.remove('show');
  el.classList.add('hide');
  setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
}

function handleNotifCta(event, isExternal) {
  if (!isExternal) {
    event.preventDefault();
    closePremiumNotif();
    if (typeof window._pnAction === 'function') {
      window._pnAction();
      window._pnAction = null;
    }
    return;
  }
  // External link — let browser open it
  closePremiumNotif();
}

