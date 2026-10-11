/* Ekspor laporan: Excel (.xlsx asli) dan PDF (A4) tanpa library eksternal. */
(function(w,d){var FF=w.FF=w.FF||{};
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function dl(n,b){var a=d.createElement('a');a.href=URL.createObjectURL(b);a.download=n;d.body.appendChild(a);a.click();setTimeout(function(){d.body.removeChild(a);URL.revokeObjectURL(a.href)},800)}
function rp(n){return'Rp '+String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function utf8(s){if(w.TextEncoder)return new TextEncoder().encode(s);var u=unescape(encodeURIComponent(s)),b=new Uint8Array(u.length),i;for(i=0;i<u.length;i++)b[i]=u.charCodeAt(i);return b}
/* ---------- ZIP (tanpa kompresi) ---------- */
var CT=[];(function(){var n,c,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CT[n]=c>>>0}})();
function crc(b){var c=-1,i;for(i=0;i<b.length;i++)c=CT[(c^b[i])&255]^(c>>>8);return(c^-1)>>>0}
function zip(files){var parts=[],cd=[],off=0,cs=0,z;
files.forEach(function(f){var n=utf8(f.name),b=utf8(f.text),c=crc(b),h=new DataView(new ArrayBuffer(30)),e=new DataView(new ArrayBuffer(46));
h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,33,true);h.setUint32(14,c,true);h.setUint32(18,b.length,true);h.setUint32(22,b.length,true);h.setUint16(26,n.length,true);
parts.push(new Uint8Array(h.buffer),n,b);
e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint16(14,33,true);e.setUint32(16,c,true);e.setUint32(20,b.length,true);e.setUint32(24,b.length,true);e.setUint16(28,n.length,true);e.setUint32(42,off,true);
cd.push(new Uint8Array(e.buffer),n);cs+=46+n.length;off+=30+n.length+b.length});
z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,files.length,true);z.setUint16(10,files.length,true);z.setUint32(12,cs,true);z.setUint32(16,off,true);
return new Blob(parts.concat(cd,[new Uint8Array(z.buffer)]),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
/* ---------- XLSX ---------- */
var NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function L(i){return String.fromCharCode(65+i)}
function sheet(rows,o){o=o||{};var x=X+'<worksheet xmlns="'+NS+'"><sheetViews><sheetView workbookViewId="0" showGridLines="0">'+(o.freeze?'<pane ySplit="'+o.freeze+'" topLeftCell="A'+(o.freeze+1)+'" activePane="bottomLeft" state="frozen"/>':'')+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18" customHeight="1"/>'+(o.w?'<cols>'+o.w.map(function(v,i){return'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+v+'" customWidth="1"/>'}).join('')+'</cols>':'')+'<sheetData>';
rows.forEach(function(r,ri){x+='<row r="'+(ri+1)+'">';r.forEach(function(c,ci){var v=c,s=0,ref=L(ci)+(ri+1);if(c==null)return;if(typeof c==='object'){v=c.v;s=c.s||0}
x+=typeof v==='number'?'<c r="'+ref+'" s="'+s+'"><v>'+v+'</v></c>':'<c r="'+ref+'" s="'+s+'" t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>'});x+='</row>'});
x+='</sheetData>';if(o.filter&&rows.length>1)x+='<autoFilter ref="A1:'+L(rows[0].length-1)+rows.length+'"/>';if(o.merge)x+='<mergeCells count="1"><mergeCell ref="'+o.merge+'"/></mergeCells>';return x+'</worksheet>'}
var XF=function(n,f,fi,b,al){return'<xf numFmtId="'+n+'" fontId="'+f+'" fillId="'+fi+'" borderId="'+b+'" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"'+(al?' applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>':'/>')};
var STY=X+'<styleSheet xmlns="'+NS+'"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;Rp&quot;#,##0"/></numFmts><fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FFE83B2E"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF68717D"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE83B2E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F6F8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE0E4E9"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">'+XF(0,0,0,0)+XF(0,1,2,0,1)+XF(0,2,0,0)+XF(0,0,0,1)+XF(164,0,0,1)+XF(0,3,0,1)+XF(164,3,0,1)+XF(0,3,3,1)+XF(0,4,0,0)+XF(3,0,0,1)+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function H(a){return a.map(function(t){return{v:t,s:1}})}
FF.exp=FF.exp||{};
FF.exp.xlsx=function(D){
var sum=[[{v:'FUN FITNESS - Laporan',s:2}],[{v:'Periode: '+D.per+' ('+D.range+')',s:8}],[{v:'Dibuat: '+D.now,s:8}],[],H(['Indikator','Nilai'])];
D.kpi.forEach(function(k){sum.push([{v:k[0],s:7},{v:k[1],s:k[2]?6:9}])});sum.push([],H(['Paket','Jumlah','Total']));
if(D.by.length)D.by.forEach(function(b){sum.push([{v:b[0],s:3},{v:b[1],s:9},{v:b[2],s:4}])});else sum.push([{v:'Belum ada penjualan terkonfirmasi',s:3}]);
var tx=[H(['No Transaksi','Tanggal','ID Member','Nama','Paket','Nominal','Status','Catatan'])];D.tx.forEach(function(r){tx.push([{v:r[0],s:3},{v:r[1],s:3},{v:r[2],s:3},{v:r[3],s:3},{v:r[4],s:3},{v:r[5],s:4},{v:r[6],s:3},{v:r[7]||'',s:3}])});
var mb=[H(['ID','Nama','No HP','Email','Paket','Berakhir','Status'])];D.members.forEach(function(r){mb.push(r.map(function(v){return{v:v,s:3}}))});
var vs=[H(['Waktu','ID Member','Nama'])];D.visits.forEach(function(r){vs.push(r.map(function(v){return{v:v,s:3}}))});
var names=['Ringkasan','Transaksi','Member','Kunjungan'],files=[
{name:'[Content_Types].xml',text:X+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+names.map(function(n,i){return'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'}).join('')+'</Types>'},
{name:'_rels/.rels',text:X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
{name:'xl/workbook.xml',text:X+'<workbook xmlns="'+NS+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map(function(n,i){return'<sheet name="'+n+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'}).join('')+'</sheets></workbook>'},
{name:'xl/_rels/workbook.xml.rels',text:X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+names.map(function(n,i){return'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'}).join('')+'<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
{name:'xl/styles.xml',text:STY},
{name:'xl/worksheets/sheet1.xml',text:sheet(sum,{w:[36,18,20],merge:'A1:C1'})},
{name:'xl/worksheets/sheet2.xml',text:sheet(tx,{w:[22,14,12,24,26,16,14,26],freeze:1,filter:1})},
{name:'xl/worksheets/sheet3.xml',text:sheet(mb,{w:[12,26,16,30,26,14,16],freeze:1,filter:1})},
{name:'xl/worksheets/sheet4.xml',text:sheet(vs,{w:[22,14,26],freeze:1,filter:1})}];
dl(D.file+'.xlsx',zip(files))};
/* ---------- PDF ---------- */
var W=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
function san(s){return String(s==null?'':s).replace(/[^\x20-\x7e]/g,function(c){var m={'\u2013':'-','\u2014':'-','\u2022':'*','\u2026':'...','\u2019':"'",'\u00a0':' '},k=c.charCodeAt(0);return m[c]||(k>=160&&k<256?c:(k<32?' ':'?'))})}
function pe(s){return s.replace(/[\\()]/g,'\\$&')}
function tw(s,z,b){var t=0,i,c;for(i=0;i<s.length;i++){c=s.charCodeAt(i);t+=(c>=32&&c<=126?W[c-32]:556)}return t*z/1000*(b?1.07:1)}
function rgb(h){h=h.replace('#','');return[0,2,4].map(function(i){return(parseInt(h.substr(i,2),16)/255).toFixed(3)}).join(' ')}
FF.exp.pdf=function(D){var pages=[],P,y;
function np(){P=[];pages.push(P);y=40}
function rect(x,t,wd,h,c){P.push(rgb(c)+' rg '+x.toFixed(2)+' '+(842-t-h).toFixed(2)+' '+wd.toFixed(2)+' '+h.toFixed(2)+' re f')}
function poly(pts,c){P.push(rgb(c)+' rg '+pts.map(function(p,i){return p[0]+' '+(842-p[1])+(i?' l':' m')}).join(' ')+' h f')}
function txt(s,x,t,z,b,c,al,wd){s=san(s);var m=tw(s,z,b);if(al==='r')x=x+wd-m;P.push('BT '+rgb(c||'#20242A')+' rg /F'+(b?2:1)+' '+z+' Tf '+x.toFixed(2)+' '+(842-t).toFixed(2)+' Td ('+pe(s)+') Tj ET')}
function fit(s,wd,z,b){s=san(s);while(s.length>2&&tw(s,z,b)>wd){s=s.slice(0,-1)}return s}
function sec(t){if(y>760)np();rect(36,y,4,14,'#E83B2E');txt(t,46,y+11,12,1,'#20242A');y+=26}
function table(cols,rows){function hd(){rect(36,y,523,20,'#20242A');var x=36;cols.forEach(function(c){txt(c.h,x+6,y+13,8.5,1,'#FFFFFF',c.a,c.w-12);x+=c.w});y+=20}
if(y>740)np();hd();if(!rows.length){txt('Tidak ada data pada periode ini',42,y+13,9,0,'#68717D');y+=24}
rows.forEach(function(r,i){if(y+18>800){np();hd()}if(i%2)rect(36,y,523,18,'#F6F7F9');var x=36;cols.forEach(function(c,j){var v=r[j],col='#20242A',b=0;if(v&&typeof v==='object'){col=v.c||col;b=v.b;v=v.t}txt(fit(v,c.w-12,8.5,b),x+6,y+12.5,8.5,b,col,c.a,c.w-12);x+=c.w});y+=18});y+=16}
np();rect(0,0,595,72,'#E83B2E');poly([[400,0],[470,0],[430,72],[360,72]],'#CF2929');poly([[480,0],[500,0],[460,72],[440,72]],'#CF2929');
txt('FUN FITNESS',36,38,24,1,'#FFFFFF');txt('LAPORAN BISNIS',36,56,9,1,'#FFE3DF');
txt('Periode: '+D.per,300,34,10,1,'#FFFFFF','r',259);txt(D.range,300,48,9,0,'#FFFFFF','r',259);txt('Dibuat: '+D.now,300,62,8,0,'#FFE3DF','r',259);y=94;
var bw=(523-30)/4;D.kpi.forEach(function(k,i){var x=36+(i%4)*(bw+10),t=y+Math.floor(i/4)*64;rect(x,t,bw,54,'#F4F6F8');rect(x,t,3,54,'#E83B2E');txt(k[0],x+12,t+18,8,0,'#68717D');txt(k[2]?rp(k[1]):String(k[1]),x+12,t+41,k[2]?13:18,1,'#20242A')});y+=64*Math.ceil(D.kpi.length/4)+10;
sec('Penjualan per paket (terkonfirmasi)');table([{h:'Paket',w:303},{h:'Jumlah',w:80,a:'r'},{h:'Total',w:140,a:'r'}],D.by.map(function(b){return[b[0],String(b[1]),rp(b[2])]}));
sec('Daftar transaksi');var SC={disetujui:'#1f8f4e',ditolak:'#D92626',dibatalkan:'#D92626',menunggu:'#b7791f'};
table([{h:'No Transaksi',w:100},{h:'Tanggal',w:62},{h:'Member',w:100},{h:'Paket',w:111},{h:'Nominal',w:80,a:'r'},{h:'Status',w:70}],D.tx.map(function(r){return[r[0],r[1],r[3],r[4],rp(r[5]),{t:r[6],c:SC[r[6]],b:1}]}));
sec('Member yang perlu ditindaklanjuti');var ml=D.members.filter(function(m){return m[6]==='akan berakhir'||m[6]==='kedaluwarsa'});
table([{h:'ID',w:60},{h:'Nama',w:150},{h:'No HP',w:100},{h:'Berakhir',w:90},{h:'Status',w:123}],ml.map(function(m){return[m[0],m[1],m[2],m[5],{t:m[6],c:m[6]==='kedaluwarsa'?'#D92626':'#b7791f',b:1}]}));
pages.forEach(function(p,i){P=p;P.push(rgb('#E0E4E9')+' RG 0.5 w 36 40 m 559 40 l S');txt('FUN FITNESS - Laporan dibuat dari data aplikasi demo (localStorage)',36,816,7.5,0,'#68717D');txt('Halaman '+(i+1)+' dari '+pages.length,400,816,7.5,0,'#68717D','r',159)});
var o=[],i;o.push('<< /Type /Catalog /Pages 2 0 R >>');var kids=[];for(i=0;i<pages.length;i++)kids.push((7+i*2)+' 0 R');
o.push('<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>');o.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');o.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
o.push('<< /Title (FUN FITNESS - Laporan) /Producer (FUN FITNESS) >>');
pages.forEach(function(p,k){var s=p.join('\n');o.push('<< /Length '+s.length+' >>\nstream\n'+s+'\nendstream');o.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+(6+k*2)+' 0 R >>')});
var out='%PDF-1.4\n',off=[];o.forEach(function(b,n){off.push(out.length);out+=(n+1)+' 0 obj\n'+b+'\nendobj\n'});
var xr=out.length;out+='xref\n0 '+(o.length+1)+'\n0000000000 65535 f \n'+off.map(function(v){return('0000000000'+v).slice(-10)+' 00000 n \n'}).join('')+'trailer\n<< /Size '+(o.length+1)+' /Root 1 0 R /Info 5 0 R >>\nstartxref\n'+xr+'\n%%EOF';
var u=new Uint8Array(out.length);for(i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;dl(D.file+'.pdf',new Blob([u],{type:'application/pdf'}))};
})(window,document);
