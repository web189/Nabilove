(function(){'use strict';
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
var dp=null,btns=[],ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua);
function installed(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true}
function guide(){
 if(ios)return 'Ketuk ikon Bagikan, lalu pilih "Tambah ke Layar Utama".';
 if(/android/i.test(ua))return 'Buka menu browser (⋮), lalu pilih "Instal aplikasi" atau "Tambahkan ke layar utama".';
 return 'Di Chrome/Edge: klik ikon instal di kanan address bar, atau menu ⋮ → "Instal LoviaPartner". Situs harus dibuka lewat https.';}
function click(){if(dp){dp.prompt();dp.userChoice.then(function(){dp=null;sync()})}else{alert(guide())}}
function sync(){var on=!installed();btns.forEach(function(b){b.classList.toggle('show',on)})}
function make(cls,label){var b=document.createElement('button');b.type='button';b.className='pwa-btn '+(cls||'');b.title='Pasang aplikasi';b.innerHTML='<i class="fas fa-download"></i><span class="lbl">'+(label||'Pasang')+'</span>';b.onclick=click;btns.push(b);return b}
function mount(){
 var na=document.querySelector('.nav-actions');if(na)na.insertBefore(make('', 'Pasang App'),na.firstChild);
 var tb=document.querySelectorAll('.db-topbar');for(var i=0;i<tb.length;i++){var t=tb[i].querySelector('.db-theme');var b=make('icon-only','');b.querySelector('.lbl').style.display='none';tb[i].insertBefore(b,t?t.nextSibling:null)}
 var nl=document.querySelector('.nav-links');if(nl){var m=make('block','Pasang Aplikasi di Perangkat');nl.appendChild(m)}
 var ft=document.querySelector('footer .footer-brand')||document.querySelector('footer');if(ft)ft.appendChild(make('', 'Pasang Aplikasi'));
 sync()}
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;sync()});
window.addEventListener('appinstalled',function(){dp=null;sync()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
