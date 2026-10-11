/* Loading screen 3 detik, tampil sekali per sesi browser (per tab). */
(function(d){try{d.documentElement.setAttribute('data-theme',localStorage.getItem('ff_theme')||'dark')}catch(e){d.documentElement.setAttribute('data-theme','dark')}
try{if(sessionStorage.getItem('ff_ld'))return;sessionStorage.setItem('ff_ld','1')}catch(e){}
var h=d.documentElement,o=d.createElement('div'),s=d.createElement('style');
s.textContent='#ld{position:fixed;top:0;left:0;right:0;bottom:0;z-index:999;background:#090B0E;display:flex;align-items:center;justify-content:center;transition:opacity .5s}#ld.out{opacity:0}#ld .i{text-align:center;color:#fff;font-family:Bahnschrift,"Arial Narrow",Impact,sans-serif}#ld img{width:120px;height:auto;border-radius:12px;display:block;margin:0 auto 18px;animation:ldp 1.2s ease-in-out infinite alternate}#ld .b{width:200px;height:4px;background:#2a3039;border-radius:2px;overflow:hidden;margin:0 auto 14px}#ld .b i{display:block;height:100%;width:0;background:#F04432;animation:ldf 3s linear forwards}#ld b{display:block;font-size:22px;letter-spacing:.3em;margin-bottom:18px}#ld p{margin:0;letter-spacing:.25em;font-size:12px;color:#A6ADB7}@keyframes ldf{to{width:100%}}@keyframes ldp{from{transform:scale(.96)}to{transform:scale(1.04)}}';
(d.head||h).appendChild(s);o.id='ld';o.setAttribute('role','status');o.setAttribute('aria-label','Memuat');
o.innerHTML='<div class="i"><img src="logo.png" alt="FUN FITNESS"><b>FUN FITNESS</b><div class="b"><i></i></div><p>BUILD YOUR STRONGER SELF.</p></div>';
h.appendChild(o);h.style.overflow='hidden';
setTimeout(function(){o.className='out';h.style.overflow='';setTimeout(function(){if(o.parentNode)o.parentNode.removeChild(o)},550)},3000)})(document);
