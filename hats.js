/* Math Island · hats (accessories). hatSVG(id, kind) returns SVG markup that sits on top of an avatar's head.
   Drawn in the avatar's 100 x 100 space; kind = "b" (boy), "g" (girl) or "e" (shop avatar). The avatar SVG has overflow visible, so brims may extend past the circle. */
(function () {
  var P = function (d, f, x) { return '<path d="' + d + '" fill="' + f + '"' + (x ? " " + x : "") + "/>"; };
  var E = function (cx, cy, rx, ry, f, x) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (x ? " " + x : "") + "/>"; };
  var C = function (cx, cy, r, f, x) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + f + '"' + (x ? " " + x : "") + "/>"; };
  var K = "#1d1d26", S = ' stroke="#1d1d26" stroke-width="1.1" stroke-linejoin="round"';
  var HATS = {
    "hat-fedora": function () { return E(50, 22, 31, 6, "#46464e", S) + P("M33 21 Q32 6 43 4 Q50 8 57 4 Q68 6 67 21Z", "#62626c", S) + P("M33 16.5 L67 16.5 L67.4 21 Q50 25 32.6 21Z", K) + P("M44 4.6 Q50 9 56 4.6", "none", 'stroke="#2e2e36" stroke-width="1.4"'); },
    "hat-beret": function () { return P("M23 22 Q20 7 45 5 Q76 4 79 17 Q78 24 50 24.5 Q27 25 23 22Z", "#7b3a9c", S) + P("M30 11 Q48 3 70 9 Q52 8 30 11Z", "#a266c4", 'opacity=".7"') + P("M47 5 L48.4 -1 L51.6 -1 L53 5Z", "#5a2776", S); },
    "hat-chef": function () { return P("M32 24 L32.5 12 Q21 11 23 3 Q26 -5 37 -3 Q43 -10 53 -5 Q63 -8 68 0 Q78 2 74 11 L67.5 12 L68 24Z", "#ffffff", 'stroke="#c9ced8" stroke-width="1.2" stroke-linejoin="round"') + P("M32 18 L68 18 L68 24 L32 24Z", "#eef1f6", 'stroke="#c9ced8" stroke-width="1"') + P("M40 12 Q41 4 44 0 M56 12 Q59 5 58 -1", "none", 'stroke="#d9deea" stroke-width="1.2"'); },
    "hat-captain": function () { return P("M25 20 Q25 5 50 5 Q75 5 75 20Z", "#fafafa", S) + P("M25 20 L75 20 L75 25.5 Q50 29 25 25.5Z", K) + P("M25 21.6 Q50 25 75 21.6", "none", 'stroke="#f2b134" stroke-width="1.5"') + P("M33 26 Q50 33 67 26 Q50 29 33 26Z", "#10101a", S) + C(50, 12.5, 4.4, "#f2b134", 'stroke="#b57d12" stroke-width="1"') + P("M50 9.8 L50 15.6 M47.2 12 L52.8 12 M47.4 14.6 Q50 17 52.6 14.6", "none", 'stroke="#6b4a08" stroke-width="1"'); },
    "hat-cowboy": function () { return P("M14 11 Q18 25 50 25 Q82 25 86 11 Q79 19 66 18.5 L34 18.5 Q21 19 14 11Z", "#a76a35", S) + P("M33 19 Q31 3 41 3 Q46 9 50 8 Q54 9 59 3 Q69 3 67 19Z", "#8b5426", S) + P("M33.4 15 L66.6 15 L67 19 L33 19Z", "#4e2d10") + P("M42 4 Q46 9 50 8", "none", 'stroke="#b5793f" stroke-width="1"'); },
    "hat-bowler": function () { return P("M32 22 Q31 3 50 3 Q69 3 68 22Z", "#1f1f27", S) + P("M33 16.5 L67 16.5 L68 21.4 L32 21.4Z", "#ffffff", 'stroke="#1d1d26" stroke-width=".9"') + P("M25 22 Q50 29 75 22 Q75 19.6 68 20.8 L32 20.8 Q25 19.6 25 22Z", "#2a2a33", S) + P("M38 8 Q44 4 52 5", "none", 'stroke="#55556a" stroke-width="1.6" stroke-linecap="round"'); },
    "hat-cap": function () { return P("M29 22 Q29 5 50 5 Q71 5 71 22Z", "#d93a32", S) + P("M44 22 Q64 20.4 83 27 Q66 31.6 44 25.6Z", "#b32621", S) + P("M50 5 L50 22 M39 9 Q36 15 36 22 M61 9 Q64 15 64 22", "none", 'stroke="#a92520" stroke-width="1"') + C(50, 5, 2.2, "#b32621", 'stroke="#1d1d26" stroke-width=".9"') + P("M37 9 Q43 5 49 6", "none", 'stroke="#ff8c84" stroke-width="1.6" stroke-linecap="round"'); },
    "hat-top": function () { return P("M34 22 L36 -7 Q50 -10 64 -7 L66 22Z", "#17171d", S) + E(50, -7, 14, 2.6, "#2a2a33", S) + P("M34.5 14.5 L65.5 14.5 L66 22 L34 22Z", "#ffffff", 'stroke="#1d1d26" stroke-width=".9"') + E(50, 22, 28, 5, "#17171d", S) + P("M40 -3 L40.6 11", "none", 'stroke="#4d4d5c" stroke-width="1.6" stroke-linecap="round"'); },
    "hat-jester": function () { return P("M30 21 Q25 8 13 9 Q22 15 37 19Z", "#8e44ad", S) + P("M70 21 Q75 8 87 9 Q78 15 63 19Z", "#e53935", S) + P("M36 20 Q32 3 39 -6 Q47 3 51 17Z", "#43a047", S) + P("M49 17 Q53 3 61 -6 Q68 3 64 20Z", "#fbc02d", S) + P("M30 19.5 L70 19.5 L68 25 Q50 28.4 32 25Z", "#1e88e5", S) + P("M33 22 L38 25 L43 22 L48 25 L53 22 L58 25 L63 22 L67 24.6", "none", 'stroke="#ffffff" stroke-width="1.2"') + C(13, 9, 3.2, "#ffc107", 'stroke="#b57d12" stroke-width=".9"') + C(87, 9, 3.2, "#ffc107", 'stroke="#b57d12" stroke-width=".9"') + C(39, -6, 3.2, "#ffc107", 'stroke="#b57d12" stroke-width=".9"') + C(61, -6, 3.2, "#ffc107", 'stroke="#b57d12" stroke-width=".9"'); },
    "hat-pirate": function () { return P("M19 23 Q27 6 50 4 Q73 6 81 23 Q70 28 50 25 Q30 28 19 23Z", "#17171d", S) + P("M19 23 Q27 6 50 4", "none", 'stroke="#f2b134" stroke-width="1.5"') + P("M81 23 Q73 6 50 4", "none", 'stroke="#f2b134" stroke-width="1.5"') + C(50, 13.5, 4.6, "#ffffff") + P("M46.6 17 L53.4 17 L52.4 20 L47.6 20Z", "#ffffff") + C(48.2, 13, 1.1, K) + C(51.8, 13, 1.1, K) + P("M43 22 L57 15.6 M43 15.6 L57 22", "none", 'stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"'); },
    "hat-sombrero": function () {
      var dots = "", cols = ["#e53935", "#1e88e5", "#fbc02d", "#43a047"], i;
      for (i = 0; i < 9; i++) { dots += C(14 + i * 9, 25.6 + Math.sin((i / 8) * Math.PI) * 4.2, 2.1, cols[i % 4]); }
      return E(50, 22, 41, 8.6, "#e3893a", S) + dots + P("M38 21 Q39 5 50 2 Q61 5 62 21Z", "#e8953f", S) + P("M38.4 17 Q50 22 61.6 17 L62 21 Q50 25 38 21Z", "#c0392b", S) + P("M43 8 Q46 4 50 3.4", "none", 'stroke="#f7c58a" stroke-width="1.6" stroke-linecap="round"');
    },
    "hat-party": function () { return P("M35 23 L50 -12 L65 23Z", "#7e57c2", S) + P("M40.5 10.4 L59.5 10.4 M37.8 16.7 L62.2 16.7 M43.2 4 L56.8 4", "none", 'stroke="#ffca28" stroke-width="2.2"') + E(50, 23, 15.4, 2.4, "#5e3ea1", S) + C(50, -12, 4.6, "#ff5c8a", 'stroke="#1d1d26" stroke-width="1"') + C(48.4, -13.4, 1.3, "#ffffff", 'opacity=".8"'); }
  };
  var DY = { b: 0, g: 0, e: 0 };
  window.HAT_IDS = Object.keys(HATS);
  window.hatSVG = function (id, kind) {
    var f = HATS[id]; if (!f) return "";
    var dy = DY[kind] || 0;
    return '<g class="hatg" pointer-events="none"' + (dy ? ' transform="translate(0 ' + dy + ')"' : "") + ">" + f() + "</g>";
  };
})();
