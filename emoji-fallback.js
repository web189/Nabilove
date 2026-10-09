/* Nabilove — emoji-fallback.js
   Windows 7 tidak punya font emoji berwarna (tampil sebagai kotak □). Skrip ini hanya aktif jika
   emoji tidak didukung: emoji diganti ikon Font Awesome / titik warna. Di perangkat modern tidak melakukan apa-apa. */
(function () {
  'use strict';
  function supported() {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 28; var x = c.getContext('2d');
      x.textBaseline = 'top'; x.font = '22px sans-serif'; x.fillText('\uD83D\uDE00', 0, 0);
      var d = x.getImageData(0, 0, 28, 28).data;
      for (var i = 0; i < d.length; i += 4) { if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 2]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) return true; }
      return false;
    } catch (e) { return true; }
  }
  if (!window.__nbForceNoEmoji && supported()) return;
  document.documentElement.className += ' no-emoji';
  var G = '#2e9e5b', Y = '#f5b82e', P = '#e0457b';
  var M = {
    '⭐': ['star', Y], '★': ['star', Y], '🌟': ['star', Y], '💫': ['star', Y], '✓': ['check'], '✅': ['circle-check', G], '✕': ['xmark'], '✖': ['xmark'], '✗': ['xmark'], '❌': ['xmark', '#d33'],
    '📸': ['camera'], '✨': ['wand-magic-sparkles', Y], '🎉': ['gift', P], '🌙': ['moon'], '☀': ['sun', Y], '🌅': ['sun', Y], '🌆': ['city'],
    '🌸': ['spa', P], '🌺': ['spa', P], '🦋': ['feather', P], '📍': ['location-dot', P], '🎵': ['music'], '💬': ['comment-dots'], '📞': ['phone'], '🎥': ['video'],
    '👑': ['crown', Y], '⏳': ['hourglass-half'], '📦': ['box'], '📋': ['clipboard-list'], '🗑': ['trash'], '💕': ['heart', P], '💗': ['heart', P], '💝': ['heart', P],
    '🎮': ['gamepad'], '🔐': ['lock'], '📭': ['inbox'], '💰': ['wallet'], '💵': ['money-bill-wave', G], '💌': ['envelope', P], '🎭': ['masks-theater'], '🍜': ['bowl-food'],
    '☕': ['mug-hot'], '🔥': ['fire', '#f26a2e'], '👥': ['users'], '📊': ['chart-simple'], '🏅': ['medal', Y], '📅': ['calendar-days'], '🖼': ['image'], '👋': ['hand', Y],
    '📈': ['chart-line'], '👧': ['user'], '👦': ['user'], '⚙': ['gear'], '🎨': ['palette'], '⚡': ['bolt', Y], '✏': ['pen'], '📌': ['thumbtack', '#d33'], '📝': ['pen-to-square'],
    '🔗': ['link'], '🏆': ['trophy', Y], '🔑': ['key', Y], '❓': ['circle-question'], '⚠': ['triangle-exclamation', Y], '🛑': ['circle-stop', '#d33'],
    '🥇': ['medal', '#e9a920'], '🥈': ['medal', '#9aa3b0'], '🥉': ['medal', '#c27a3e'], '🔢': ['list-ol']
  };
  var DOT = { '🟢': G, '⚫': '#555', '🟡': Y, '🔴': '#d33' }, KEEP = { '✦': 1 };
  var RE = /(?:[\u2600-\u27BF\u2B50\u2B55\u2300-\u23FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])[\uFE0F\u200D]?/g;
  function html(m) {
    var k = m.replace(/[\uFE0F\u200D]/g, '');
    if (KEEP[k]) return null;
    if (DOT[k]) return '<i class="nb-dot" style="background:' + DOT[k] + '"></i>';
    var e = M[k]; if (!e) return '';
    return '<i class="fas fa-' + e[0] + ' nb-em"' + (e[1] ? ' style="color:' + e[1] + '"' : '') + '></i>';
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1 };
  function fix(root) {
    if (!root) return;
    if (root.nodeType === 3) { one(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, 4, null, false), n, list = [];
    while ((n = w.nextNode())) { if (RE.test(n.nodeValue)) list.push(n); RE.lastIndex = 0; }
    list.forEach(one);
  }
  function one(t) {
    var p = t.parentNode; if (!p || SKIP[p.nodeName]) return;
    var s = t.nodeValue; RE.lastIndex = 0; if (!RE.test(s)) return; RE.lastIndex = 0;
    if (p.nodeName === 'OPTION' || p.nodeName === 'TITLE') { t.nodeValue = s.replace(RE, function (m) { return html(m) === null ? m : ''; }); return; }
    var h = s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }).replace(RE, function (m) { var r = html(m); return r === null ? m : r; });
    var sp = document.createElement('span'); sp.className = 'nb-emw'; sp.innerHTML = h; p.replaceChild(sp, t);
  }
  var q = [], tm = null;
  function flush() { tm = null; var a = q; q = []; a.forEach(function (n) { if (document.body.contains(n)) fix(n); }); }
  function start() {
    fix(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { if (m.type === 'characterData') q.push(m.target); else [].forEach.call(m.addedNodes, function (n) { if (!(n.className && /nb-emw|nb-em/.test(n.className))) q.push(n); }); });
      if (!tm) tm = setTimeout(flush, 40);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
