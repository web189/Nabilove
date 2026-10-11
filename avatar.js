/* Crop foto profil (geser + zoom, bulat) lalu simpan sebagai WebP 256x256 (fallback JPEG). */
(function(w,d){var FF=w.FF,S=240;
FF.crop=function(file,done){
if(!/^image\//.test(file.type)){FF.toast('File harus berupa gambar','err');return}
if(file.size>10*1048576){FF.toast('Foto terlalu besar (maks 10 MB)','err');return}
var img=new Image(),url=URL.createObjectURL(file);
img.onerror=function(){URL.revokeObjectURL(url);FF.toast('Foto tidak dapat dibaca','err')};
img.onload=function(){
var iw=img.naturalWidth,ih=img.naturalHeight,min=S/Math.min(iw,ih),s=min,x=(S-iw*s)/2,y=(S-ih*s)/2,cv,c,zm,drag=null;
FF.dlg('Atur foto profil','<div class="cvw"><canvas id="cv" width="'+S+'" height="'+S+'"></canvas></div><input id="zm" type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom"><p class="mut" style="font-size:13px">Geser foto untuk mengatur posisi. Foto disimpan otomatis sebagai WebP agar ringan.</p>','Simpan',function(){
var o=d.createElement('canvas'),k=256/S,u;o.width=o.height=256;o.getContext('2d').drawImage(img,x*k,y*k,iw*s*k,ih*s*k);
u=o.toDataURL('image/webp',.82);if(u.indexOf('data:image/webp')!==0)u=o.toDataURL('image/jpeg',.82);URL.revokeObjectURL(url);done(u)});
cv=d.getElementById('cv');c=cv.getContext('2d');zm=d.getElementById('zm');
function draw(){x=Math.min(0,Math.max(S-iw*s,x));y=Math.min(0,Math.max(S-ih*s,y));c.fillStyle='#000';c.fillRect(0,0,S,S);c.drawImage(img,x,y,iw*s,ih*s)}
draw();
zm.oninput=function(){var a=(S/2-x)/s,b=(S/2-y)/s;s=min*parseFloat(zm.value);x=S/2-a*s;y=S/2-b*s;draw()};
cv.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,ox:x,oy:y};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',function(e){if(!drag)return;var k=S/cv.getBoundingClientRect().width;x=drag.ox+(e.clientX-drag.x)*k;y=drag.oy+(e.clientY-drag.y)*k;draw()});
cv.addEventListener('pointerup',function(){drag=null});cv.addEventListener('pointercancel',function(){drag=null})};
img.src=url};
})(window,document);
