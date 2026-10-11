/* Autentikasi DEMO (localStorage) - bukan keamanan produksi. Ganti dengan Firebase Authentication. */
(function(w,d){
var FF=w.FF,db=FF.db;
FF.auth={
user:function(){var s=db.session();return s?db.get('members',s.id):null},
guard:function(role){var u=FF.auth.user();if(!u||u.role!==role||u.status==='nonaktif'){location.href='login.html';return null}return u},
logout:function(){db.log('Logout');db.setSession(null);location.href='login.html'},
login:function(id,pw){id=id.trim().toLowerCase();var u=db.list('members').filter(function(m){return m.username.toLowerCase()===id||m.email.toLowerCase()===id})[0];
 if(!u||u.passHash!==db.hash(pw))return'Username/email atau password salah.';if(u.status==='nonaktif')return'Akun dinonaktifkan. Hubungi admin.';
 db.setSession({id:u.id,role:u.role});db.log('Login demo',u.username);location.href=u.role==='admin'?'admin.html':'member.html';return''},
register:function(f){var e={},ms=db.list('members');
 if(f.name.trim().length<3)e.name='Nama minimal 3 karakter.';
 if(!/^[a-z0-9_]{4,20}$/i.test(f.username))e.username='Username 4–20 karakter (huruf, angka, _).';else if(ms.some(function(m){return m.username.toLowerCase()===f.username.toLowerCase()}))e.username='Username sudah dipakai.';
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email))e.email='Format email tidak valid.';else if(ms.some(function(m){return m.email.toLowerCase()===f.email.toLowerCase()}))e.email='Email sudah terdaftar.';
 if(!FF.wa(f.phone))e.phone='Nomor HP tidak valid (contoh 08123456789).';
 if(f.password.length<6)e.password='Password minimal 6 karakter.';
 if(f.password!==f.password2)e.password2='Konfirmasi password tidak sama.';
 if(!f.agree)e.agree='Setujui syarat dan privasi.';
 if(Object.keys(e).length)return e;
 var m=db.add('members',{id:db.nextMemberId(),name:f.name.trim(),username:f.username,email:f.email,phone:f.phone,passHash:db.hash(f.password),role:'member',packageId:null,start:'',end:'',status:'ok'});
 if(!m)return{form:'Gagal menyimpan.'};db.log('Pendaftaran member',m.id);
 if(f.pkg){FF.auth.request(m,f.pkg)}return{ok:m}},
request:function(m,pkId){var p=db.get('packages',pkId);if(!p||p.price==null||!p.active)return null;
 var t=db.add('transactions',{no:'TRX-'+Date.now().toString(36).toUpperCase(),memberId:m.id,memberName:m.name,packageId:p.id,packageName:p.name,amount:p.price,date:db.today(),method:'Transfer (simulasi)',status:'menunggu',note:''});db.log('Pengajuan paket',p.name);return t}
};
d.addEventListener('DOMContentLoaded',function(){
d.querySelectorAll('input[type=password]').forEach(function(i){var b=d.createElement('button');b.type='button';b.className='pwt';b.textContent='Lihat';b.onclick=function(){var h=i.type==='password';i.type=h?'text':'password';b.textContent=h?'Sembunyi':'Lihat'};var w=d.createElement('div');w.className='pwb';i.parentNode.insertBefore(w,i);w.appendChild(i);w.appendChild(b)});
var lf=d.getElementById('loginForm'),rf=d.getElementById('regForm');
function errs(f,e){f.querySelectorAll('.err').forEach(function(x){x.textContent=''});for(var k in e){var x=f.querySelector('[data-e="'+k+'"]');if(x)x.textContent=e[k];else FF.toast(e[k],'err')}}
if(lf)lf.addEventListener('submit',function(ev){ev.preventDefault();var b=lf.querySelector('button');if(b.disabled)return;b.disabled=true;b.textContent='Memproses…';
 var r=FF.auth.login(lf.id.value,lf.pw.value);if(r){errs(lf,{form:r});b.disabled=false;b.textContent='Masuk'}});
if(rf){var sel=rf.pkg;db.list('packages').filter(function(p){return p.active&&p.type==='member'}).forEach(function(p){var o=d.createElement('option');o.value=p.id;o.textContent=p.name+(p.price==null?' (harga belum dikonfirmasi)':' — '+FF.rp(p.price));if(p.price==null)o.disabled=true;sel.appendChild(o)});
 var q=/pkg=(\w+)/.exec(location.search);if(q)sel.value=q[1];
 rf.addEventListener('submit',function(ev){ev.preventDefault();var b=rf.querySelector('button');if(b.disabled)return;
  var r=FF.auth.register({name:rf.name.value,username:rf.username.value,email:rf.email.value,phone:rf.phone.value,password:rf.password.value,password2:rf.password2.value,pkg:rf.pkg.value,agree:rf.agree.checked});
  errs(rf,r);if(r.ok){b.disabled=true;FF.toast('Pendaftaran berhasil. Silakan login.');setTimeout(function(){location.href='login.html'},1200)}})}
});
})(window,document);
