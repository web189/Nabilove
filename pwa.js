/* PWA: registrasi service worker + tombol "Pasang Aplikasi" (Chrome/Edge Android & desktop). */
(function(w,d){var dp=null,h=d.documentElement;
function off(){h.className=h.className.replace(' can-install','')}
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))w.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
w.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;if(h.className.indexOf('can-install')<0)h.className+=' can-install'});
w.addEventListener('appinstalled',function(){dp=null;off()});
d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.pwa');if(b&&dp){dp.prompt();dp.userChoice.then(function(){dp=null;off()})}});
})(window,document);
