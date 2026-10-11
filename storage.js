/* FUN FITNESS - lapisan data tunggal (LocalStorageAdapter). Semua halaman memanggil FF.db.*; ganti adapter ini saat migrasi ke Firebase. */
(function(w){
var NS='ff_',mem={},ok=false;
try{localStorage.setItem('__t','1');localStorage.removeItem('__t');ok=true}catch(e){}
function rd(k,d){try{var r=ok?localStorage.getItem(NS+k):mem[k];return r?JSON.parse(r):d}catch(e){return d}}
function wr(k,v){try{var s=JSON.stringify(v);if(ok)localStorage.setItem(NS+k,s);else mem[k]=s;return true}catch(e){if(w.FF&&FF.toast)FF.toast('Data gagal disimpan (penyimpanan penuh/tidak tersedia)','err');return false}}
function p2(n){return('0'+n).slice(-2)}
function ymd(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function today(){return ymd(new Date())}
function addDays(s,n){var d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return ymd(d)}
function addMonths(s,n){var d=new Date(s+'T00:00:00');d.setMonth(d.getMonth()+n);return ymd(d)}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function hash(s){var h=5381,i;for(i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return'd'+(h>>>0).toString(16)} /* DEMO saja, bukan keamanan nyata */
var db={ymd:ymd,today:today,addDays:addDays,addMonths:addMonths,hash:hash,uid:uid,
list:function(c){var r=rd(c,[]);return Array.isArray(r)?r:[]},
get:function(c,id){return db.list(c).filter(function(x){return x.id===id})[0]||null},
add:function(c,o){var l=db.list(c);o.id=o.id||uid(c[0]);o.createdAt=o.updatedAt=new Date().toISOString();l.push(o);return wr(c,l)?o:null},
upd:function(c,id,p){var l=db.list(c),o=null;l.forEach(function(x){if(x.id===id){for(var k in p)x[k]=p[k];x.updatedAt=new Date().toISOString();o=x}});return o&&wr(c,l)?o:null},
del:function(c,id){return wr(c,db.list(c).filter(function(x){return x.id!==id}))},
settings:function(){var o=rd('settings',{}),r={},k;if(!o||typeof o!=='object')o={};for(k in DS)r[k]=(o[k]==null||o[k]==='')?DS[k]:o[k];return r},
saveSettings:function(s){return wr('settings',s)},
session:function(){return rd('session',null)},
setSession:function(s){return s?wr('session',s):(ok?localStorage.removeItem(NS+'session'):delete mem.session,true)},
log:function(type,detail){var s=db.session();var l=db.list('logs');l.push({id:uid('l'),at:new Date().toISOString(),type:type,detail:detail||'',user:s?s.id:'-'});wr('logs',l.slice(-300))},
nextMemberId:function(){var n=db.list('members').length+1,id;do{id='FF-'+('0000'+n).slice(-4);n++}while(db.get('members',id));return id},
level:function(n){var L=[[0,'Pemula'],[5,'Rutin'],[15,'Konsisten'],[30,'Atlet'],[60,'Elite']],i=0;while(i<L.length-1&&n>=L[i+1][0])i++;return{lv:i+1,name:L[i][1],from:L[i][0],next:L[i+1]?L[i+1][0]:null}},
counts:function(){var c={};db.list('visits').forEach(function(v){c[v.memberId]=(c[v.memberId]||0)+1});return c},
rank:function(id){var c=db.counts(),me=c[id]||0,r=1,k;for(k in c)if(c[k]>me)r++;return r},
onsite:function(h){var t=Date.now()-(h||3)*36e5,seen={},out=[];db.list('visits').slice().reverse().forEach(function(v){if(new Date(v.at).getTime()>=t&&!seen[v.memberId]){seen[v.memberId]=1;var m=db.get('members',v.memberId);if(m&&m.status!=='nonaktif'&&m.showPublic!==false)out.push(m)}});return out},
status:function(m){if(m.status==='nonaktif')return'nonaktif';if(!m.end)return'menunggu';var t=today();if(m.end<t)return'kedaluwarsa';if(m.end<=addDays(t,7))return'akan berakhir';return'aktif'},
setTx:function(id,st,note){var t=db.get('transactions',id);if(!t||t.status!=='menunggu')return false; /* cegah proses ganda */
 if(st==='disetujui'){var m=db.get('members',t.memberId),pk=db.get('packages',t.packageId);if(!m||!pk)return false;
  var base=(m.end&&m.end>today())?m.end:today();db.upd('members',m.id,{start:m.start&&m.end>today()?m.start:today(),end:addMonths(base,(+pk.months||0)+(+pk.bonus||0)),packageId:pk.id});}
 db.upd('transactions',id,{status:st,note:note||t.note||''});db.log('Pembayaran '+st,t.no);return true},
reset:function(){if(ok){Object.keys(localStorage).forEach(function(k){if(k.indexOf(NS)===0)localStorage.removeItem(k)})}else mem={};seed()}};
var DS={name:'FUN FITNESS',address:'Jl. Raya Kalisuren, Kalisuren, RT 02/RW 03, Tajur Halang, Kabupaten Bogor, Jawa Barat 16320',hours:'Setiap hari, 06.00–23.00',phone1:'08831-963-981',phone2:'0881-2254-258',ig:'https://www.instagram.com/funfitness_centre/',maps:'https://maps.app.goo.gl/sA8oo7rcE4yC8PFUA?g_st=ac',mgm:'Ajak 3 orang, dapat bonus membership 1 bulan.',mgmStatus:'Perlu konfirmasi ketentuan'};
function seed(){
if(rd('schema',0)>=1)return;var t=today();
wr('packages',[
{id:'p3',name:'Membership 3 Bulan',type:'member',price:450000,months:3,bonus:1,active:true,popular:true,promoEnd:'2026-10-31',note:'Promo Oktober: bonus 1 bulan. Ketentuan perlu dikonfirmasi.',demo:true},
{id:'p6',name:'Membership 6 Bulan',type:'member',price:null,months:6,bonus:2,active:true,popular:false,promoEnd:'2026-10-31',note:'Bonus 2 bulan sesuai poster. Harga dan ketentuan perlu dikonfirmasi.',demo:true},
{id:'pt2',name:'Personal Training 2 Sesi',type:'pt',price:500000,months:0,bonus:1,active:true,popular:false,promoEnd:'',note:'Bonus membership 1 bulan sesuai poster; ketentuan resmi perlu dikonfirmasi.',demo:true},
{id:'pt5',name:'Personal Training 5 Sesi',type:'pt',price:900000,months:0,bonus:1,active:true,popular:false,promoEnd:'',note:'Bonus membership 1 bulan sesuai poster; ketentuan resmi perlu dikonfirmasi.',demo:true}]);
wr('settings',DS);
function M(id,n,u,pk,s,e){return{id:id,name:n,username:u,email:u+'@contoh.test',phone:'081200000'+id.slice(-3),passHash:hash('member123'),role:'member',packageId:pk,start:s,end:e,status:'ok',demo:true,createdAt:s+'T08:00:00.000Z',updatedAt:s+'T08:00:00.000Z'}}
wr('members',[{id:'ADM-001',name:'Admin Demo',username:'admin',email:'admin@contoh.test',phone:'',passHash:hash('admin123'),role:'admin',status:'ok',demo:true,createdAt:t+'T00:00:00.000Z',updatedAt:t+'T00:00:00.000Z'},
M('FF-0001','Budi Demo','budi','p3',addDays(t,-30),addDays(t,60)),M('FF-0002','Sari Demo','sari','p3',addDays(t,-85),addDays(t,3)),M('FF-0003','Andi Demo','andi','p3',addDays(t,-130),addDays(t,-10))]);
function T(n,m,nm,st,d,a){return{id:'t'+n,no:'TRX-DEMO-'+n,memberId:m,memberName:nm,packageId:'p3',packageName:'Membership 3 Bulan',amount:a,date:d,method:'Transfer (simulasi)',status:st,note:'DATA DEMO',demo:true,createdAt:d+'T09:00:00.000Z',updatedAt:d+'T09:00:00.000Z'}}
wr('transactions',[T(1,'FF-0001','Budi Demo','disetujui',addDays(t,-30),450000),T(2,'FF-0003','Andi Demo','disetujui',addDays(t,-130),450000),T(3,'FF-0002','Sari Demo','menunggu',t,450000)]);
wr('visits',[{id:'v1',memberId:'FF-0001',name:'Budi Demo',at:new Date().toISOString(),demo:true}]);
wr('logs',[{id:'l0',at:new Date().toISOString(),type:'Seed data demo',detail:'DATA DEMO dibuat',user:'sistem'}]);
wr('schema',1)}
seed();w.FF=w.FF||{};w.FF.db=db;
w.addEventListener('storage',function(){if(w.FF&&FF.refresh)FF.refresh()});
})(window);
