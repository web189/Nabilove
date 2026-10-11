(function(d){
d.addEventListener('DOMContentLoaded',function(){
var db=FF.db,s=db.settings(),t=db.today(),E=FF.esc,pk=db.list('packages').filter(function(p){return p.active});
function wa(txt){var u=FF.wa(s.phone1);return u?u+'?text='+encodeURIComponent(txt):''}
function card(p){var ended=p.promoEnd&&p.promoEnd<t,li=[],w=wa('Halo FUN FITNESS, saya mau tanya paket '+p.name);
if(p.months)li.push(p.months+' bulan membership');if(p.bonus)li.push('Bonus '+p.bonus+' bulan membership');
if(p.type==='pt'&&p.bonus)li.push('Ketentuan bonus menunggu konfirmasi resmi');if(p.promoEnd)li.push(ended?'Promo berakhir '+FF.tgl(p.promoEnd):'Promo berlaku s.d. '+FF.tgl(p.promoEnd));
return'<article class="card pk'+(p.popular?' pop':'')+(ended?' off':'')+'">'+(p.popular?'<span class="bd g" style="align-self:flex-start">Paket Populer</span>':'')+(ended?'<span class="bd r" style="align-self:flex-start">Promo berakhir</span>':'')+'<h3>'+E(p.name)+'</h3><div class="price">'+(p.price==null?'<small>Harga belum dikonfirmasi</small>':FF.rp(p.price))+'</div><ul>'+li.map(function(x){return'<li>'+E(x)+'</li>'}).join('')+'</ul>'+(p.note?'<p class="mut" style="font-size:13px">'+E(p.note)+'</p>':'')+(p.price==null?'<span class="bd y" style="align-self:flex-start">Harga dan ketentuan perlu dikonfirmasi</span>':'')+'<div class="acts">'+(p.price!=null&&!ended?'<a class="btn p" href="register.html?pkg='+encodeURIComponent(p.id)+'">Daftar</a>':'')+(w?'<a class="btn" href="'+w+'" target="_blank" rel="noopener">Tanya admin</a>':'')+'</div></article>'}
function put(id,type){var l=pk.filter(function(p){return p.type===type});d.getElementById(id).innerHTML=l.length?l.map(card).join(''):'<p class="mut">Belum ada paket aktif. Hubungi admin untuk info terbaru.</p>'}
put('pk','member');put('pt','pt');
var live=pk.filter(function(p){return!(p.promoEnd&&p.promoEnd<t)}).slice(0,4);
d.getElementById('heroPromo').innerHTML='<h3>Promo & paket</h3>'+(live.map(function(p){return'<div class="it"><span>'+E(p.name)+(p.bonus?'<br><small style="color:#A6ADB7">Bonus '+p.bonus+' bulan</small>':'')+'</span><b>'+(p.price==null?'Tanya admin':FF.rp(p.price))+'</b></div>'}).join('')||'<p>Hubungi admin untuk info promo.</p>')+'<p style="margin:12px 0 0"><a href="#paket" style="color:#fff;font-weight:700">Lihat semua paket</a></p>';
d.getElementById('mgm').innerHTML='<h3>Member Get Member</h3><p>'+E(s.mgm)+'</p><span class="bd y">'+E(s.mgmStatus)+'</span>';
var g=d.getElementById('ctaWa'),u=wa('Halo FUN FITNESS, saya mau tanya promo.');if(u){g.href=u;g.target='_blank';g.rel='noopener'}else g.style.display='none';
function ons(){var l=db.onsite(3),c=db.counts(),e=d.getElementById('ons');d.getElementById('onsNote').textContent=l.length?l.length+' member check-in dalam 3 jam terakhir':'Belum ada check-in dalam 3 jam terakhir.';
e.innerHTML=l.length?l.slice(0,12).map(function(m){var L=db.level(c[m.id]||0);return'<div class="card oc">'+FF.av(m,'l')+'<b>'+E(FF.first(m.name))+'</b><span class="bd g">Lv '+L.lv+' · '+L.name+'</span>'+(m.demo?'<span class="bd y">DEMO</span>':'')+'</div>'}).join('')+(l.length>12?'<div class="card oc"><b>+'+(l.length-12)+'</b><span class="mut">lainnya</span></div>':''):'<div class="card oc" style="flex:1 1 100%">Jadilah yang pertama latihan hari ini.</div>'}
ons();setInterval(ons,60000);FF.refresh=ons;
var bw=d.getElementById('barWa');if(u)bw.href=u;else bw.style.display='none';var hw=d.getElementById('heroWa');if(u)hw.href=u;else hw.style.display='none';
var ph=[s.phone1,s.phone2].filter(function(x){return x&&x.trim()}),h=ph.length?ph.map(function(x){var w=FF.wa(x);return w?'<a href="'+w+'" target="_blank" rel="noopener">'+E(x)+'</a>':E(x)}).join(' &nbsp;•&nbsp; '):'Kontak belum tersedia';
d.getElementById('contact').innerHTML=h;d.getElementById('fcontact').innerHTML=h;
d.getElementById('year').textContent=new Date().getFullYear();
var G=[['gym-interior.jpg','Interior FUN FITNESS'],['hero-gym.jpg','Area latihan FUN FITNESS'],['gym-treadmill.jpg','Treadmill'],['gym-dumbbell.jpg','Dumbbell'],['gym-mesin.jpg','Mesin latihan']],gl=d.getElementById('gal'),lb=d.getElementById('lb');
gl.innerHTML=G.map(function(x){return'<figure><img src="'+x[0]+'" alt="'+x[1]+'" loading="lazy"></figure>'}).join('');
function bad(i){var f=i.parentNode;if(f.parentNode)f.parentNode.removeChild(f);if(!gl.querySelector('img'))gl.innerHTML='<div class="card" style="grid-column:1/-1"><p class="mut" style="margin:0">Foto galeri akan segera hadir. Lihat Instagram kami untuk foto terbaru.</p></div>'}
gl.querySelectorAll('img').forEach(function(i){i.addEventListener('error',function(){bad(i)});if(i.complete&&!i.naturalWidth)bad(i)});
gl.addEventListener('click',function(e){var i=e.target.tagName==='IMG'?e.target:null;if(i){lb.querySelector('img').src=i.src;lb.querySelector('img').alt=i.alt;lb.className='on'}});
lb.addEventListener('click',function(){lb.className=''});d.addEventListener('keydown',function(e){if(e.key==='Escape')lb.className=''});
d.querySelectorAll('.nav nav a').forEach(function(a){a.addEventListener('click',function(){d.body.classList.remove('menu')})});
});
})(document);
