/* Student Island · new shop items (November 2026).
   Two new avatars in each tier (boys and girls), two new items in every other shop category.
   Classic script, loaded right after the page's own shop code on teacher.html and student.html:
   it adds to SHOP, ENEMY, GFIG and the tier list, and teaches weaponParts / girlTop the new held items. */
(function () {
  "use strict";
  if (typeof SHOP === "undefined" || typeof ENEMY === "undefined") return;
  const add = (list) => list.forEach(it => { if (!SHOP.some(x => x.id === it.id)) SHOP.push(it); });

  /* ---------- boys' avatars ---------- */
  const eyes = (c = DKC) => fr_(31, 40, 8, 10, c) + fr_(53, 40, 8, 10, c) + fr_(36, 41, 2, 2, "#fff") + fr_(58, 41, 2, 2, "#fff");
  Object.assign(ENEMY, {
    "e-pumpkin": () => svgWrap("#fff3e0", torso("#2e7d32") + `<path d="M24 86 H66 M24 98 H66" stroke="#1b5e20" stroke-width="2"/>` + neckOf("#33691e") + cubeHead("#fb8c00")
      + `<path d="M34 25 V65 M45 25 V65 M56 25 V65" stroke="#e65100" stroke-width="1.6" opacity=".75"/>` + sp("M42 17 L44 5 L51 6 L49 17Z", "#558b2f") + `<path d="M51 8 Q61 1 66 9" stroke="#7cb342" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      + sp("M29 49 L35 38 L41 49Z", "#3e2723") + sp("M51 49 L57 38 L63 49Z", "#3e2723") + `<path d="M32.5 47 L35 42.5 L37.5 47Z M54.5 47 L57 42.5 L59.5 47Z" fill="#ffca28"/>`
      + sp("M29 54 L35 58 L40 54 L45 59 L50 54 L55 58 L61 54 L58 62 L32 62Z", "#3e2723")),
    "e-cactus": () => svgWrap("#fffde7", torso("#c96a3b") + sr(18, 72, 54, 8, "#a0522d") + `<path d="M26 92 Q45 98 64 92" stroke="#8d4a22" stroke-width="2" fill="none"/>` + neckOf("#388e3c") + cubeHead("#43a047")
      + `<g stroke="#e8f5e9" stroke-width="1.4" stroke-linecap="round"><path d="M28 30 l-3 -2 M28 52 l-3 2 M62 34 l3 -2 M62 56 l3 2 M40 28 l-1 -3 M52 28 l1 -3"/></g>`
      + `<path d="M34 24 V64 M45 24 V64 M56 24 V64" stroke="#2e7d32" stroke-width="1.4" opacity=".7"/>`
      + `<g stroke="${DKC}" stroke-width="1.2"><circle cx="45" cy="11" r="5" fill="#ff6fa3"/><circle cx="38" cy="14" r="4" fill="#ff8fb8"/><circle cx="52" cy="14" r="4" fill="#ff8fb8"/></g><circle cx="45" cy="12" r="2.4" fill="#ffd54f"/>`
      + `<circle cx="35" cy="44" r="4.4" fill="${DKC}"/><circle cx="55" cy="44" r="4.4" fill="${DKC}"/><circle cx="36.4" cy="42.6" r="1.4" fill="#fff"/><circle cx="56.4" cy="42.6" r="1.4" fill="#fff"/>`
      + `<ellipse cx="30" cy="52" rx="4" ry="2.4" fill="#ff8a80" opacity=".7"/><ellipse cx="60" cy="52" rx="4" ry="2.4" fill="#ff8a80" opacity=".7"/><path d="M38 54 Q45 61 52 54" stroke="${DKC}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
    "e-viking": () => svgWrap("#e3f2fd", torso("#6d4c41") + sp("M18 72 Q45 86 72 72 L72 80 Q45 94 18 80Z", "#d7ccc8") + sr(18, 98, 54, 6, "#3e2723") + sr(40, 97, 10, 8, "#ffca28")
      + neckOf("#e0ac69") + cubeHead("#e0ac69") + eyes() + sp("M24 50 H66 V64 L58 74 H32 L24 64Z", "#e65100") + sp("M34 52 Q45 47 56 52 Q50 55 45 53 Q40 55 34 52Z", "#bf360c")
      + `<path d="M34 64 L36 72 M45 64 V74 M56 64 L54 72" stroke="#bf360c" stroke-width="1.4"/>`
      + sp("M20 31 Q20 11 45 11 Q70 11 70 31Z", "#9e9e9e") + sr(20, 28, 50, 6, "#757575") + `<g fill="#cfd8dc" stroke="${DKC}" stroke-width="1"><circle cx="30" cy="31" r="1.6"/><circle cx="45" cy="31" r="1.6"/><circle cx="60" cy="31" r="1.6"/></g>`
      + sp("M23 24 Q6 20 4 3 Q14 14 25 16Z", "#fff8e1") + sp("M67 24 Q84 20 86 3 Q76 14 65 16Z", "#fff8e1")),
    "e-cyber": () => svgWrap("#141428", `<g fill="#26c6da" opacity=".5"><circle cx="12" cy="20" r="1.4"/><circle cx="84" cy="14" r="1.4"/><circle cx="88" cy="60" r="1.2"/></g>`
      + torso("#263238") + `<path d="M22 80 H38 L44 88 H70 M22 96 H50 L56 90 H70" stroke="#26c6da" stroke-width="2" fill="none"/><circle cx="45" cy="88" r="3" fill="#ff1f8e"/>`
      + neckOf("#37474f") + cubeHead("#37474f") + sr(40, 9, 10, 9, "#111118") + sr(43, 4, 4, 6, "#111118")
      + sr(25, 38, 41, 11, "#1b0f2a") + `<rect x="27" y="40" width="37" height="7" rx="2" fill="#ff1f8e"/><rect x="27" y="40" width="37" height="2.2" fill="#ffb3d9" opacity=".9"/>`
      + `<path d="M32 56 H58 M34 60 H56" stroke="#26c6da" stroke-width="1.6"/><path d="M66 30 L80 18" stroke="${DKC}" stroke-width="2"/><circle cx="81" cy="17" r="3" fill="#26c6da" stroke="${DKC}" stroke-width="1"/>`),
    "e-titan": () => svgWrap("#1b2440", `<path d="M10 14 L18 26 L13 27 L20 40" stroke="#ffeb3b" stroke-width="2.4" fill="none" stroke-linejoin="round"/><path d="M84 20 L77 32 L83 33 L75 46" stroke="#ffeb3b" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`
      + torso("#455a64") + `<path d="M28 78 L36 88 L32 96 M58 76 L54 86 L62 96" stroke="#ffd600" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`
      + neckOf("#78909c") + cubeHead("#90a4ae") + `<path d="M30 30 L36 36 M56 58 L62 52" stroke="#607d8b" stroke-width="1.6"/>`
      + `<circle cx="35" cy="45" r="7" fill="#ffd600" opacity=".35"/><circle cx="55" cy="45" r="7" fill="#ffd600" opacity=".35"/>` + fr_(31, 41, 8, 8, "#ffea00") + fr_(51, 41, 8, 8, "#ffea00") + fr_(36, 54, 18, 3, "#37474f")
      + sp("M24 24 L28 6 L34 18 L39 2 L45 16 L51 2 L56 18 L62 6 L66 24Z", "#ffd600")),
    "e-mecha": () => svgWrap("#fff8e1", sp("M8 70 L22 64 L26 82 L10 84Z", "#ffb300") + sp("M82 70 L68 64 L64 82 L80 84Z", "#ff8f00")
      + torso("#f9a825") + `<circle cx="45" cy="90" r="8" fill="#29b6f6" stroke="${DKC}" stroke-width="1.6"/><circle cx="45" cy="90" r="4" fill="#e1f5fe"/><path d="M24 78 H36 M54 78 H66" stroke="#e65100" stroke-width="2"/>`
      + neckOf("#8d6e63") + sp("M18 30 L24 26 L24 60 L18 56Z", "#ffb300") + sp("M72 30 L66 26 L66 60 L72 56Z", "#ff8f00") + cubeHead("#fbc02d")
      + sr(26, 40, 38, 10, "#b71c1c") + `<rect x="28" y="42" width="34" height="2.4" fill="#ff8a80"/>` + `<path d="M34 58 H56" stroke="#e65100" stroke-width="2"/>`
      + sp("M40 16 L45 2 L50 16Z", "#d50000") + `<circle cx="45" cy="30" r="3" fill="#29b6f6" stroke="${DKC}" stroke-width="1"/>`)
  });
  Object.assign(ENEMY_BODY, { "e-pumpkin": ["#2e7d32", "#fb8c00"], "e-cactus": ["#c96a3b", "#43a047"], "e-viking": ["#6d4c41", "#e0ac69"], "e-cyber": ["#263238", "#37474f"], "e-titan": ["#455a64", "#90a4ae"], "e-mecha": ["#f9a825", "#fbc02d"] });

  /* ---------- girls' avatars ---------- */
  Object.assign(GFIG, {
    "g-sunny": { bg: "#fff6cc", hair: "#f2b33d", hs: 1, dress: "#ffd54f", trim: "#ffffff", front: [["flowers", ["#ff8a65", "#ffffff", "#ffb74d"]]] },
    "g-berry": { bg: "#f3e0ff", hair: "#4a2340", hs: 3, dress: "#b25bd6", front: [["bow", "#7b2cbf"], ["hearts"]] },
    "g-pixie": { bg: "#e4fbe6", hair: "#57b36a", hs: 4, dress: "#8ee3a0", trim: "#ffffff", back: [["wings", "#e8fff0", "#b9f3c8"]], front: [["flowers"]], sp: [[14, 22, 3.4], [88, 26, 3]], spc: "#fffde7" },
    "g-snow": { bg: "#e3f2ff", hair: "#ffffff", hs: 0, dress: "#90caf9", trim: "#ffffff", back: [["bunny", "#ffffff"]], front: [["star", 30, 26]], sp: [[16, 30, 3], [86, 40, 3.4], [12, 64, 2.6]], spc: "#ffffff" },
    "g-moonq": { bg: "#151a3d", hair: "#c9d6ff", hs: 0, dress: "#3949ab", trim: "#e3e8ff", cape: "#283593", front: [["crown", "#e3e8ff", "#7986cb"], ["star", 28, 24]], sp: [[12, 20, 3.4], [88, 16, 4], [90, 58, 3], [10, 60, 2.6]], spc: "#fff9c4" },
    "g-sakura": { bg: "#ffe4ee", hair: "#2a1620", hs: 0, dress: "#f48fb1", trim: "#ffffff", gown: 1, front: [["tiara", "#ffd54f", "#ff4d94"], ["flowers", ["#ffc1d9", "#ffffff", "#ff8fb8"]]], sp: [[14, 24, 3.4], [86, 28, 3.4], [88, 64, 3]], spc: "#ffffff" }
  });
  ["g-sunny", "g-berry", "g-pixie", "g-snow", "g-moonq", "g-sakura"].forEach(k => { try { GFIG_SET.add(k); } catch (e) {} });

  Object.assign(AV_TIER, { "e-pumpkin": "basic", "e-cactus": "basic", "e-viking": "epic", "e-cyber": "epic", "e-titan": "legendary", "e-mecha": "legendary",
    "g-sunny": "basic", "g-berry": "basic", "g-pixie": "epic", "g-snow": "epic", "g-moonq": "legendary", "g-sakura": "legendary" });

  /* ---------- held items ---------- */
  const ow = window.weaponParts;
  if (typeof ow === "function") window.weaponParts = function (id) {
    if (id === "h-katana") return { back: `<ellipse class="wg" cx="76" cy="40" rx="10" ry="34" fill="#80deea" opacity=".35"/>` + sp("M73.5 77 L73.5 16 Q75 7 80 3 Q78.5 12 78.5 77Z", "#eceff1", 'stroke-width="1.2"') + `<path d="M76 74 V14" stroke="#90a4ae" stroke-width="1"/><text x="76" y="44" font-size="6" text-anchor="middle" fill="#00838f" font-family="Georgia,serif" font-weight="700">7</text><text x="76" y="56" font-size="6" text-anchor="middle" fill="#00838f" font-family="Georgia,serif" font-weight="700">11</text>`,
      front: sr(69, 75, 14, 3.4, "#ffd54f", 'stroke-width="1.1"') + sr(73.6, 84, 4.8, 12, "#311b92", 'stroke-width="1.1"') + `<path d="M73.6 87 L78.4 89 M73.6 91 L78.4 93" stroke="#b39ddb" stroke-width="1"/>` };
    if (id === "h-orb") return { back: `<path d="M75.5 92 V36" stroke="${DKC}" stroke-width="5" stroke-linecap="round"/><path d="M75.5 92 V36" stroke="#6d4c41" stroke-width="3" stroke-linecap="round"/>`
      + `<circle class="wg" cx="75.5" cy="24" r="17" fill="#b388ff" opacity=".4"/>` + sp("M66 36 Q75.5 30 85 36 L82 40 H69Z", "#ffd54f", 'stroke-width="1.1"')
      + `<circle cx="75.5" cy="24" r="12" fill="#7c4dff" stroke="${DKC}" stroke-width="1.3"/><circle cx="72" cy="20" r="4" fill="#fff" opacity=".55"/><text x="75.5" y="28" font-size="9" text-anchor="middle" fill="#fff" font-family="Georgia,serif" font-style="italic" font-weight="700">x²</text>` };
    return ow.apply(this, arguments);
  };
  const ogt = window.girlTop;
  if (typeof ogt === "function") window.girlTop = function (id) {
    if (id === "w-fan") return { back: `<path d="M75.5 86 L56 52 A28 28 0 0 1 95 52Z" fill="#ffc1d9" stroke="${GOL}" stroke-width="1.3"/><path d="M75.5 86 L62 49 M75.5 86 L69 46 M75.5 86 L75.5 45 M75.5 86 L82 46 M75.5 86 L89 49" stroke="#e57399" stroke-width="1"/>`
      + `<circle cx="66" cy="56" r="3" fill="#fff"/><circle cx="84" cy="58" r="2.6" fill="#fff"/><circle cx="75" cy="52" r="2.2" fill="#ff8fb8"/>` };
    if (id === "w-lantern") return { back: `<path d="M75.5 88 V44" stroke="${GOL}" stroke-width="4.6" stroke-linecap="round"/><path d="M75.5 88 V44" stroke="#8d6e63" stroke-width="2.8" stroke-linecap="round"/><path d="M75.5 44 Q84 40 86 46" stroke="${GOL}" stroke-width="1.6" fill="none"/>`
      + `<circle class="wg" cx="86" cy="58" r="15" fill="#ffe082" opacity=".45"/><ellipse cx="86" cy="58" rx="9" ry="11" fill="#ffca28" stroke="${GOL}" stroke-width="1.3"/><path d="M80 52 Q86 58 80 64 M92 52 Q86 58 92 64" stroke="#ff8f00" stroke-width="1" fill="none"/><rect x="82.5" y="45" width="7" height="3" fill="#6d4c41"/><rect x="82.5" y="68" width="7" height="3" fill="#6d4c41"/><path d="M86 71 V77" stroke="#ff4d94" stroke-width="1.4"/>` };
    return ogt.apply(this, arguments);
  };

  /* ---------- the shop list ---------- */
  add([
    { id: "e-pumpkin", cat: "skin", name: "Pumpkin Head", price: 350 },
    { id: "e-cactus", cat: "skin", name: "Cactus Kid", price: 350 },
    { id: "e-viking", cat: "skin", name: "Viking Raider", price: 700 },
    { id: "e-cyber", cat: "skin", name: "Cyber Ronin", price: 750 },
    { id: "e-titan", cat: "skin", name: "Storm Titan", price: 1050 },
    { id: "e-mecha", cat: "skin", name: "Golden Mecha", price: 1100 },
    { id: "g-sunny", cat: "skin", name: "Sunny Girl", price: 300, g: 1 },
    { id: "g-berry", cat: "skin", name: "Berry Bow", price: 350, g: 1 },
    { id: "g-pixie", cat: "skin", name: "Garden Pixie", price: 650, g: 1 },
    { id: "g-snow", cat: "skin", name: "Snow Bunny", price: 700, g: 1 },
    { id: "g-moonq", cat: "skin", name: "Moon Queen", price: 1050, g: 1 },
    { id: "g-sakura", cat: "skin", name: "Sakura Empress", price: 1100, g: 1 },
    { id: "f-tide", cat: "frame", name: "✦ Tidal Wave", price: 450 },
    { id: "f-storm", cat: "frame", name: "✦ Thunder Storm", price: 550 },
    { id: "f-g-sakura", cat: "frame", name: "✿ Sakura Bloom", price: 400, g: 1 },
    { id: "f-g-opal", cat: "frame", name: "✦ Opal Moon", price: 550, g: 1 },
    { id: "c-ocean", cat: "color", name: "Ocean Wave", price: 250 },
    { id: "c-lava", cat: "color", name: "Lava Glow", price: 300 },
    { id: "c-g-cotton", cat: "color", name: "Cotton Candy", price: 250, g: 1 },
    { id: "c-g-sunset", cat: "color", name: "Sunset Glow", price: 300, g: 1 },
    { id: "t-graph", cat: "title", name: "Graph Master", price: 300 },
    { id: "t-ninja", cat: "title", name: "Number Ninja", price: 300 },
    { id: "t-g-graph", cat: "title", name: "Graph Queen", price: 300, g: 1 },
    { id: "t-g-numstar", cat: "title", name: "Number Star", price: 300, g: 1 },
    { id: "h-katana", cat: "top", name: "✦ Prime Katana", icon: "🗡️", price: 450 },
    { id: "h-orb", cat: "top", name: "✦ Orb of Equations", icon: "🔮", price: 650 },
    { id: "w-fan", cat: "top", name: "✦ Sakura Fan", icon: "🪭", price: 350, g: 1 },
    { id: "w-lantern", cat: "top", name: "✦ Moon Lantern", icon: "🏮", price: 450, g: 1 },
    { id: "hat-viking", cat: "hat", name: "Viking Helmet", price: 300, both: 1 },
    { id: "hat-grad", cat: "hat", name: "Graduation Cap", price: 250, both: 1 },
    { id: "th-aurora", cat: "theme", name: "Aurora Night", price: 500, both: 1 },
    { id: "th-reef", cat: "theme", name: "Coral Reef", price: 500, both: 1 }
  ]);
})();
