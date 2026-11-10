// Project Gravemind - the stats page (stats.html, built by tools/web_pages.py; its look is web/stats.css): GRAVEMIND
// LIVE's stats.json drawn with plain DOM code and our own SVG charts. The Live server writes the file every 30 s and
// tools/publish_stats.ps1 pushes it to GitHub; the first URL that answers is used (the second: a copy published with
// the site, or the local preview's). Every text is written in both languages (t()); main.js shows one.

(function () {
  const URLS = ["https://raw.githubusercontent.com/BriRoz1/project-gravemind-stats/main/stats.json", "data/stats.json"];
  // a local preview (a local server, or the file opened from disk) shows its own data/stats.json first
  if (location.protocol === "file:" || /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) URLS.reverse();
  const REFRESH = 120000;  // ms between loads
  const STALE = 15 * 60;   // s without a new file: the server is not reporting
  const RECENT_STEP = 6;   // recent matches shown at a time
  const KD_GAMES = 5;      // games with numbers needed to lead by K/D
  const TOP_SHORT = 10, TOP_LONG = 25;
  const MAX_DAYS = 14;     // days in the activity chart

  // Halo 2's medals by their game results index (medals.cpp), the ones MCC shows
  const MEDALS = {
    0: ["Double Kill", "Doble baja"], 1: ["Triple Kill", "Triple baja"], 2: ["Overkill", "Exceso"], 3: ["Killtacular", "Killtacular"],
    4: ["Killtrocity", "Killtrocity"], 5: ["Killimanjaro", "Killimanjaro"], 6: ["Killing Spree", "Racha de bajas"],
    7: ["Killing Frenzy", "Frenesí"], 8: ["Running Riot", "Disturbio"], 9: ["Rampage", "Arrasador"], 10: ["Untouchable", "Intocable"],
    11: ["Sniper Kill", "Baja de francotirador"], 12: ["Splatter", "Atropello"], 13: ["Beat Down", "Paliza"], 14: ["Assassin", "Asesino"],
    15: ["Stick", "Granada pegada"], 16: ["Hijack", "Secuestro"], 17: ["Vehicle Destroyed", "Vehículo destruido"],
    18: ["Flag Carrier Kill", "Baja del portador de la bandera"], 19: ["Flag Taken", "Bandera robada"], 20: ["Flag Returned", "Bandera devuelta"],
    21: ["Bomb Carrier Kill", "Baja del portador de la bomba"], 22: ["Bomb Planted", "Bomba colocada"], 23: ["Killtastrophe", "Killtastrophe"],
    24: ["Killpocalypse", "Killpocalypse"], 25: ["Killionaire", "Killionaire"], 26: ["Invincible", "Invencible"],
    27: ["Sniper Spree", "Racha de francotirador"], 28: ["Sharpshooter", "Tirador"], 29: ["Shotgun Spree", "Racha de escopeta"],
    30: ["Open Season", "Temporada de caza"], 31: ["Sword Spree", "Racha de espada"], 33: ["Splatter Spree", "Racha de atropellos"],
    34: ["Vehicular Manslaughter", "Homicidio vehicular"], 35: ["Skyjack", "Secuestro aéreo"], 36: ["Extermination", "Exterminio"],
    37: ["Showstopper", "Interrupción"], 39: ["Kill from the Grave", "Baja desde la tumba"], 40: ["Killjoy", "Aguafiestas"],
    41: ["Wheelman", "Conductor"], 42: ["Flag Capture", "Bandera capturada"], 43: ["King Spree", "Racha de rey"], 44: ["Ball Kill", "Baja con la bola"],
    45: ["Killed Juggernaut", "Juggernaut abatido"], 46: ["Juggernaut Spree", "Racha de Juggernaut"], 47: ["Unstoppable Force", "Fuerza imparable"],
    48: ["Last Man Standing", "Último en pie"], 49: ["Infection Spree", "Racha de infección"], 50: ["Mmm Brains", "Mmm, cerebros"],
    51: ["Zombie Killing Spree", "Racha de zombis"], 53: ["Perfection", "Perfección"], 54: ["Comeback Kill", "Baja de remontada"],
    56: ["Head Shot", "Tiro a la cabeza"], 57: ["Unfrigginbelievable", "Increíble"], 71: ["Revenge", "Venganza"], 72: ["Avenger", "Vengador"],
    73: ["Savior", "Salvador"], 74: ["Close Call", "Por los pelos"], 75: ["Snapshot", "Instantánea"], 84: ["King Kill", "Baja del rey"],
    90: ["Ball Carrier Kill", "Baja del portador de la bola"], 92: ["Bomb Defused", "Bomba desactivada"],
    94: ["Captured Territory", "Territorio capturado"], 97: ["Last Strike", "Último golpe"], 98: ["First Strike", "Primer golpe"],
  };

  // the launcher's 18 armour / emblem colours (settings.cpp kArmorColors), by index
  const COLORS = ["#d8d8d8", "#7c7f86", "#c02828", "#e0701e", "#d8b030", "#6e7a2e", "#2e8b3a", "#8aa27a", "#38b8d8", "#1e8a8a",
    "#3355aa", "#2050e0", "#6a40c0", "#8a2a9a", "#e070b0", "#8a1020", "#6a4628", "#c0a070"];
  const color = (i) => COLORS[Math.min(Math.max(i | 0, 0), 17)];
  const TEAM = ["#ff6b6b", "#7ab8ff"];  // red, blue (docs/WEB_DESIGN.md: only for teams)

  const $ = (id) => document.getElementById(id);
  const t = (en, es) => '<span lang="en">' + en + '</span><span lang="es">' + es + "</span>";
  // a plain string in the language shown now (aria labels, SVG text: drawn again when the language changes)
  const es = () => document.documentElement.dataset.lang === "es";
  const tx = (en, sp) => (es() ? sp : en);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // the project's developer: a neon DEV badge beside his gamertag, wherever it is shown
  const DEVS = ["BriRoz"];
  // a gamertag shown: isolated from the text around it (a name may carry right-to-left or isolate marks)
  const nm = (s) => "<bdi>" + esc(s) + "</bdi>" + (DEVS.includes(s) ? '<span class="devtag" title="Project Gravemind developer">DEV</span>' : "");
  const n = (v) => (v || 0).toLocaleString(es() ? "es-ES" : "en-US");
  const pct = (a, b) => (b ? Math.round((a * 100) / b) + " %" : "–");
  const kd = (k, d) => (k || d ? (k / Math.max(1, d)).toFixed(2) : "–");
  const plural = (v, en1, enN, es1, esN) => t(n(v) + " " + (v === 1 ? en1 : enN), n(v) + " " + (v === 1 ? es1 : esN));
  const title = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
  const now = () => Math.floor(Date.now() / 1000);
  const plName = (id) => (playlists[id] || {}).name || title(String(id || "").replace(/_/g, " "));

  // Halo 2's rank icon (tools/web_assets.py: MCC's SMALLRANKICON / LARGERANKICON)
  const rankSrc = (v, big) => "img/ranks/" + (big ? "large/" : "small/") + String(Math.min(Math.max(v | 0, 1), 50)).padStart(2, "0") + ".png";
  const lvl = (v, size) => {
    const s = size || 22, big = s > 40;
    return '<img class="sx-rank" src="' + rankSrc(v, big) + '" alt="' + tx("Level ", "Nivel ") + (v || 1) + '" width="' + s + '" height="' + s + '" loading="lazy">';
  };

  // --- MCC's emblems, composed as the launcher does (mapart.cpp EmblemCompose): the background shape in colour 3,
  // the foreground's second layer in colour 2 and its first layer in colour 1, each 52 x 52 shape resampled to the
  // size wanted with sharpened edges. The shapes come from three sprite sheets (tools/web_assets.py).
  const emblems = { ready: false, index: null, sheets: {}, cache: {} };
  function loadEmblems() {
    const load = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
    return fetch("img/emblems/index.json").then((r) => r.json()).then((index) =>
      Promise.all([load("img/emblems/fg1.png"), load("img/emblems/fg2.png"), load("img/emblems/bg.png")]).then((imgs) => {
        emblems.index = index;
        emblems.sheets = { fg: imgs[0], fg2: imgs[1], bg: imgs[2] };
        emblems.ready = !!(imgs[0] && imgs[2]);
      })).catch(() => { emblems.ready = false; });
  }
  // a shape's alpha (0..1 per pixel, cell x cell) out of a sheet
  function shape(kind, number) {
    const idx = emblems.index, img = emblems.sheets[kind];
    const i = idx && img ? idx[kind].indexOf(number) : -1;
    if (i < 0) return null;
    const c = idx.cell, cv = document.createElement("canvas");
    cv.width = cv.height = c;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, (i % idx.cols) * c, Math.floor(i / idx.cols) * c, c, c, 0, 0, c, c);
    const d = ctx.getImageData(0, 0, c, c).data, out = new Float32Array(c * c);
    for (let k = 0; k < out.length; k++) out[k] = d[k * 4] / 255;
    return out;
  }
  // m x m mask -> n x n: bicubic, then the edge sharpened (a threshold band that narrows as the scale grows)
  function resample(mask, m, n) {
    if (m === n) return mask;
    const at = (x, y) => mask[Math.min(Math.max(y, 0), m - 1) * m + Math.min(Math.max(x, 0), m - 1)];
    const cubic = (t, a, b, c, d) => b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
    const out = new Float32Array(n * n), scale = m / n, edge = Math.min(Math.max(0.5 * m / n, 0.04), 0.5), row = [0, 0, 0, 0];
    for (let y = 0; y < n; y++) {
      const v = (y + 0.5) * scale - 0.5, y0 = Math.floor(v), ty = v - y0;
      for (let x = 0; x < n; x++) {
        const u = (x + 0.5) * scale - 0.5, x0 = Math.floor(u), tx = u - x0;
        for (let k = 0; k < 4; k++) row[k] = cubic(tx, at(x0 - 1, y0 - 1 + k), at(x0, y0 - 1 + k), at(x0 + 1, y0 - 1 + k), at(x0 + 2, y0 - 1 + k));
        const a = Math.min(Math.max((cubic(ty, row[0], row[1], row[2], row[3]) - (0.5 - edge)) / (2 * edge), 0), 1);
        out[y * n + x] = a * a * (3 - 2 * a);
      }
    }
    return out;
  }
  // the emblem of a look ([fg, bg, c1, c2, c3, species, primary, secondary]) as a data URL, n x n
  function emblem(look, n) {
    if (!emblems.ready || !look) return "";
    const key = look.slice(0, 5).join(",") + "@" + n;
    if (emblems.cache[key]) return emblems.cache[key];
    const m = emblems.index.cell, layers = [["bg", look[1], look[4]], ["fg2", look[0], look[3]], ["fg", look[0], look[2]]];
    const rgb = new Float32Array(n * n * 3), alpha = new Float32Array(n * n);
    let any = false;
    layers.forEach(([kind, number, ci]) => {
      const s = shape(kind, number);
      if (!s) return;
      any = true;
      const a = resample(s, m, n), hex = color(ci), c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
      for (let i = 0; i < a.length; i++) {
        for (let k = 0; k < 3; k++) rgb[i * 3 + k] = rgb[i * 3 + k] * (1 - a[i]) + c[k] * a[i];
        alpha[i] = alpha[i] + a[i] * (1 - alpha[i]);
      }
    });
    if (!any) return "";
    const cv = document.createElement("canvas");
    cv.width = cv.height = n;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(n, n), d = img.data;
    for (let i = 0; i < alpha.length; i++) {
      const inv = alpha[i] > 0.001 ? 1 / alpha[i] : 0;  // blended over black: back to straight alpha
      for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.min(255, Math.round(rgb[i * 3 + k] * inv));
      d[i * 4 + 3] = Math.round(alpha[i] * 255);
    }
    ctx.putImageData(img, 0, 0);
    return (emblems.cache[key] = cv.toDataURL());
  }
  // a player's emblem in a chamfered frame (an empty frame when there is none to draw)
  const emb = (name, size) => {
    const s = size || 28, p = byName[name] || {}, src = emblem(p.look, s * 2);
    return '<span class="sx-emb" style="width:' + s + "px;height:" + s + 'px">' + (src ? '<img src="' + src + '" width="' + s + '" height="' + s + '" alt="">' : "") + "</span>";
  };
  // a gamertag as a button that opens the player's card
  const who = (name, inner) => '<button type="button" class="sx-who" data-player="' + esc(name) + '">' + (inner || nm(name)) + "</button>";

  // MCC's line-art Spartan / Elite (white on transparent) in the player's armour colours: the primary over most of
  // the body, the secondary towards the feet
  function figure(look, el) {
    const species = look && look[5] === 1 ? "elite" : "spartan";
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.width;
      cv.height = img.height;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      const g = ctx.createLinearGradient(0, 0, 0, img.height);
      g.addColorStop(0, color(look ? look[6] : 2));
      g.addColorStop(0.55, color(look ? look[6] : 2));
      g.addColorStop(1, color(look ? look[7] : 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, img.width, img.height);
      el.innerHTML = "";
      el.appendChild(cv);
    };
    img.src = "img/body/" + species + ".png";
  }

  // "3 min ago" / "hace 3 min"
  function ago(unix) {
    const s = Math.max(0, now() - unix);
    if (s < 60) return t("just now", "ahora mismo");
    const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (m < 60) return t(m + " min ago", "hace " + m + " min");
    if (h < 48) return t(h + " h ago", "hace " + h + " h");
    if (d < 60) return t(d + " days ago", "hace " + d + " días");
    return when(unix);
  }
  function when(unix) {
    return esc(new Date(unix * 1000).toLocaleString(es() ? "es-ES" : "en-US", { dateStyle: "medium", timeStyle: "short" }));
  }
  function minutes(seconds) {
    const m = Math.max(0, Math.floor(seconds / 60));
    return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min";
  }
  const every = () => t("every " + Math.round(REFRESH / 60000) + " min", "cada " + Math.round(REFRESH / 60000) + " min");

  let data = null, playlists = {}, players = [], byName = {};
  let recentShown = RECENT_STEP, recentFilter = "", recentOpen = "", leadScope = "recent", topTab = "", topLong = false;
  let actMode = "day", plMode = "players", ringKey = "", opener = null;

  // every account with its totals over the playlists (ranks only where played)
  function prepare(d) {
    playlists = {};
    ["playlists", "players", "matches", "recent", "newest"].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
    d.recent = d.recent.filter((m) => m && typeof m === "object");
    d.recent.forEach((m) => { if (!Array.isArray(m.rows)) m.rows = []; });
    d.matches.forEach((m) => { if (!Array.isArray(m.players)) m.players = []; });
    d.playlists.forEach((p) => { playlists[p.id] = p; });
    players = d.players.filter((p) => p && typeof p.name === "string").map((p) => {
      const tot = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, medals: 0 };
      Object.values(p.ranks || {}).forEach((r) => { Object.keys(tot).forEach((k) => { tot[k] += r[k] || 0; }); });
      return Object.assign({ tot: tot, online: !!p.status, level: 0, experience: 0 }, p);
    });
    byName = {};
    players.forEach((p) => { byName[p.name] = p; });
  }

  // who won a played match: the team with the higher total (a team that all left lost), or the top score
  function result(m) {
    if (m.teams) {
      const score = {}, stayed = {};
      m.rows.forEach((r) => { score[r.team] = (score[r.team] || 0) + (r.score || 0); stayed[r.team] = stayed[r.team] || !r.left; });
      const teams = Object.keys(score).map(Number).sort((a, b) => (stayed[b] - stayed[a]) || score[b] - score[a]);
      const tie = teams.length > 1 && score[teams[0]] === score[teams[1]] && stayed[teams[0]] === stayed[teams[1]];
      return { winner: tie ? null : teams[0], tie: tie, score: score };
    }
    const rows = m.rows.slice().sort((a, b) => (a.left - b.left) || b.score - a.score);
    const tie = rows.length > 1 && rows[0].score === rows[1].score && rows[0].left === rows[1].left;
    return { winner: tie || !rows.length ? null : rows[0].name, tie: tie };
  }
  const won = (m, res, r) => !res.tie && (m.teams ? res.winner === r.team : res.winner === r.name);
  // the best row of a match: the top score among those who stayed
  const mvp = (m) => m.rows.slice().sort((a, b) => (a.left - b.left) || b.score - a.score || (b.kills || 0) - (a.kills || 0))[0];

  // ---- the map tile: no map pictures, so a typographic tile: the map's name in the game's words over a pattern of
  // Installation 05's ring segments and fine hatching, the same for a map every time (a hash of its name)
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mapTile(map, variant, small, label) {
    const key = String(map || "?").toLowerCase(), h = hash(key);
    const cx = 70 + (h % 200), cy = 20 + ((h >>> 8) % 90), slope = ((h >>> 16) % 2 ? 1 : -1) * (0.5 + ((h >>> 17) % 5) / 10);
    let art = "";
    for (let i = 0; i < 5; i++) {
      const r = 34 + i * 26, seg = 8 + ((h >>> (i * 3)) & 15) * 3, gap = 4 + ((h >>> (i * 2 + 5)) & 7) * 3;
      art += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-dasharray="' + seg + " " + gap + '" style="opacity:' + (0.5 - i * 0.07).toFixed(2) + '"/>';
    }
    let hatch = "";
    for (let k = -8; k < 24; k++) hatch += '<line x1="' + k * 18 + '" y1="0" x2="' + (k * 18 + slope * 120).toFixed(1) + '" y2="120"/>';
    return '<div class="sx-map' + (small ? " small" : "") + '"><svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<g class="h">' + hatch + '</g><g class="r">' + art + '</g><line class="hz" x1="0" y1="96" x2="320" y2="96"/></svg>' +
      '<span class="sx-map-k">' + (variant && variant !== label ? esc(variant) : t("Map", "Mapa")) + '</span><b class="sx-map-n">' + esc(title(map || "?")) + "</b></div>";
  }

  // ---- hero: the Installation 05 ring of who is online (in a match / searching / in the menus) and the live strip
  function ring(d) {
    const online = d.online || 0, playing = Math.min(d.playing || 0, online), searching = Math.min(d.searching || 0, online - playing);
    const key = [online, playing, searching, es()].join("/");
    if (key === ringKey) return;
    ringKey = key;
    const r = 84, circ = 2 * Math.PI * r, gap = online > 1 ? 3 : 0;
    const arc = (cls, v, off) => v > 0 ? '<circle class="rg-arc ' + cls + '" cx="100" cy="100" r="' + r + '" stroke-width="12" stroke-dasharray="' +
      Math.max(0.5, (circ * v) / online - gap).toFixed(1) + " " + circ.toFixed(1) + '" stroke-dashoffset="' + (-(circ * off) / online).toFixed(1) + '"/>' : "";
    let ticks = "";
    for (let a = 0; a < 360; a += 15) ticks += '<line class="rg-tick" x1="100" y1="6" x2="100" y2="12" transform="rotate(' + a + ' 100 100)"/>';
    const label = tx(online + " online: " + playing + " in a match, " + searching + " searching", online + " en línea: " + playing + " en partida, " + searching + " buscando");
    $("ring").innerHTML = '<p class="rg-name">' + t("INSTALLATION 05 · ONLINE NOW", "INSTALACIÓN 05 · EN LÍNEA") + "</p>" +
      '<svg class="ring" viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="' + esc(label) + '">' +
      '<g transform="rotate(-90 100 100)"><circle class="rg-track" cx="100" cy="100" r="' + r + '" stroke-width="12"/>' +
      (online ? arc("rg-done", playing, 0) + arc("rg-prog", searching, playing) + arc("sx-rg-menu", online - playing - searching, playing + searching) : "") +
      "</g>" + ticks + '<text class="rg-num" x="100" y="110" text-anchor="middle">' + n(online) + "</text>" +
      '<text class="rg-sub" x="100" y="134" text-anchor="middle">' + tx("ONLINE", "EN LÍNEA") + "</text></svg>" +
      '<ul class="rg-legend"><li><i class="k-done"></i>' + t("In a match", "En partida") + "<b>" + n(playing) + "</b></li>" +
      '<li><i class="k-prog"></i>' + t("Searching", "Buscando") + "<b>" + n(searching) + "</b></li>" +
      '<li><i class="sx-k-menu"></i>' + t("In the menus", "En los menús") + "<b>" + n(online - playing - searching) + "</b></li></ul>";
  }
  function tiles(d) {
    const live = d.matches.filter((m) => m.state === "playing").length;
    const tile = (v, en, sp, capEn, capEs, cls) => '<div class="sx-tile' + (cls ? " " + cls : "") + '"><span class="sx-tile-k">' + t(en, sp) + "</span><b>" + n(v) +
      "</b><span class=\"sx-tile-c\">" + t(capEn, capEs) + "</span></div>";
    $("tiles").innerHTML =
      tile(d.online, "Online", "En línea", "players connected right now", "jugadores conectados ahora", d.online ? "on" : "") +
      tile(d.searching, "Searching", "Buscando", "looking for a match in FIND GAMES", "buscando partida en BUSCAR PARTIDAS") +
      tile(d.playing, "In a match", "En partida", live === 1 ? "playing 1 match now" : "playing " + live + " matches now",
        live === 1 ? "jugando 1 partida ahora" : "jugando " + live + " partidas ahora") +
      tile(d.accounts, "Accounts", "Cuentas", "registered on GRAVEMIND LIVE", "registradas en GRAVEMIND LIVE");
  }
  function updated(d) {
    const age = now() - (d.generated || 0);
    $("updated").innerHTML = age > STALE
      ? '<span class="sx-warn">' + t("GRAVEMIND LIVE has not reported for " + minutes(age) + ".", "GRAVEMIND LIVE no informa desde hace " + minutes(age) + ".") + "</span>"
      : '<i class="sx-dot" aria-hidden="true"></i>' + t("Updated ", "Actualizado ") + ago(d.generated) + " · " + t("this page refreshes ", "esta página se actualiza ") + every();
  }

  // ---- 01 live now: the matches being played, or an empty state that says so
  function live(d) {
    const list = d.matches.slice().sort((a, b) => a.since - b.since);
    $("live-cap").innerHTML = list.length ? plural(list.length, "match", "matches", "partida", "partidas") : t("Right now", "Ahora mismo");
    if (!list.length) {
      $("live").innerHTML = '<div class="sx-panel sx-empty"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="24"/><circle cx="30" cy="30" r="14"/><circle cx="30" cy="30" r="3"/></svg>' +
        "<div><b>" + t("Nobody is in a matchmaking match right now.", "Nadie está jugando una partida de matchmaking ahora mismo.") + "</b><p>" +
        t("Matches show up here as they start; this page looks again ", "Las partidas aparecen aquí en cuanto empiezan; esta página vuelve a mirar ") + every() + ".</p></div></div>";
      return;
    }
    $("live").innerHTML = list.map((m) => {
      const pl = playlists[m.playlist] || {};
      const teams = pl.teams !== false && m.players.some((p) => p.team >= 0) && m.players.length > 2;
      const line = (p) => '<li class="' + (teams || m.players.length === 2 ? (p.team ? "t-b" : "t-r") : "") + '">' + lvl(p.level) + emb(p.name, 22) + who(p.name) + "</li>";
      let body;
      if (teams) {
        const side = (team, en, sp) => '<div class="sx-side ' + (team ? "b" : "r") + '"><span>' + t(en, sp) + "</span><ul>" + m.players.filter((p) => p.team === team).map(line).join("") + "</ul></div>";
        body = '<div class="sx-sides">' + side(0, "Red team", "Equipo rojo") + side(1, "Blue team", "Equipo azul") + "</div>";
      } else {
        body = '<ul class="sx-roster">' + m.players.map(line).join("") + "</ul>";
      }
      const playing = m.state === "playing";
      return '<article class="sx-panel sx-livecard">' + mapTile(m.map, m.variant, true, pl.name) + '<div class="sx-lc-body"><div class="sx-meta"><span class="sx-pl">' + esc(pl.name || m.playlist) +
        "</span>" + (playing ? '<span class="st st-live">_' + t("LIVE", "EN DIRECTO") + "_</span>" : '<span class="st st-plan">_' + t("LOBBY", "SALA") + "_</span>") + "</div>" +
        '<p class="sx-lc-time">' + (playing ? t("Playing for " + minutes(now() - m.since), "En juego desde hace " + minutes(now() - m.since)) : t("In the lobby", "En la sala")) +
        " · " + plural(m.players.length, "player", "players", "jugador", "jugadores") + "</p>" + body + "</div></article>";
    }).join("");
  }

  // ---- 02 recent matches: cards (map tile, playlist, mode, outcome in the winning team's colour, MVP, length), a
  // playlist filter, "show more", and each card's full carnage report on demand
  function recent(d) {
    const counts = {};
    d.recent.forEach((m) => { counts[m.playlist] = (counts[m.playlist] || 0) + 1; });
    const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (recentFilter && !counts[recentFilter]) recentFilter = "";
    $("recent-filter").innerHTML = ids.length > 1 ? [["", t("All", "Todas"), d.recent.length]].concat(ids.map((id) => [id, esc(plName(id)), counts[id]]))
      .map((x) => '<button type="button" data-v="' + esc(x[0]) + '" aria-pressed="' + (x[0] === recentFilter) + '">' + x[1] + "<small>" + x[2] + "</small></button>").join("") : "";
    const list = d.recent.filter((m) => !recentFilter || m.playlist === recentFilter);
    $("recent-cap").innerHTML = t("Last " + d.recent.length + " matches", "Últimas " + d.recent.length + " partidas");
    if (!list.length) {
      $("recent").innerHTML = '<div class="sx-panel sx-empty"><div><b>' + t("No match played yet.", "Ninguna partida jugada todavía.") + "</b></div></div>";
      $("recent-more").hidden = true;
      return;
    }
    $("recent").innerHTML = list.slice(0, recentShown).map(matchCard).join("");
    $("recent-more").hidden = recentShown >= list.length;
  }
  function matchCard(m) {
    const res = result(m), duel = m.teams && m.rows.length === 2 && m.rows[0].team !== m.rows[1].team;
    const key = String(m.id || m.started + "/" + m.title);
    const best = mvp(m);
    let outcome, accent = "var(--accent)";
    if (duel) {
      const a = m.rows.slice().sort((x, y) => x.team - y.team), side = (r, right) => {
        const w = won(m, res, r);
        return '<div class="sx-duel-s ' + (r.team ? "b" : "r") + (w ? " win" : "") + (right ? " right" : "") + '">' + emb(r.name, 26) + '<span class="sx-duel-n">' + who(r.name) + "</span><b>" + n(r.score) + "</b></div>";
      };
      outcome = '<div class="sx-duel">' + side(a[0], false) + '<i>–</i>' + side(a[1], true) + "</div>";
      if (!res.tie) accent = TEAM[res.winner ? 1 : 0];
      outcome += '<p class="sx-res">' + (res.tie ? t("Tie", "Empate") : t(nm(res.winner === a[0].team ? a[0].name : a[1].name) + " wins", "Gana " + nm(res.winner === a[0].team ? a[0].name : a[1].name))) + "</p>";
    } else if (m.teams) {
      const s = res.score || {};
      outcome = '<div class="sx-score"><span class="r' + (res.winner === 0 ? " win" : "") + '">' + n(s[0] || 0) + "</span><i>–</i><span class=\"b" + (res.winner === 1 ? " win" : "") + '">' + n(s[1] || 0) + "</span></div>" +
        '<p class="sx-res">' + (res.tie ? t("Tie", "Empate") : res.winner === 0 ? t("Red team wins", "Gana el equipo rojo") : t("Blue team wins", "Gana el equipo azul")) + "</p>";
      if (!res.tie && res.winner != null) accent = TEAM[res.winner ? 1 : 0];
    } else {
      outcome = '<div class="sx-ffa"><span class="sx-crown" aria-hidden="true">★</span>' + (res.tie ? t("Tie", "Empate") : who(res.winner) + '<span class="sx-res">' + t("wins", "gana") + "</span>") + "</div>";
    }
    const mvpLine = best ? '<div class="sx-mvp"><span class="sx-mvp-k">MVP</span>' + emb(best.name, 30) + '<span class="sx-mvp-n">' + who(best.name) +
      "<small>" + lvl(best.level, 16) + n(best.score) + " " + t("pts", "pts") + (m.stats ? " · K/D " + kd(best.kills, best.deaths) + " · " + plural(best.medals || 0, "medal", "medals", "medalla", "medallas") : "") + "</small></span></div>" : "";
    const open = recentOpen === key;
    const rows = m.rows.slice().sort((a, b) => (m.teams && a.team !== b.team ? a.team - b.team : b.score - a.score)).map((r) =>
      '<tr class="' + (m.teams ? (r.team ? "t-b" : "t-r") : "") + (r.left ? " left" : "") + '"><td>' + lvl(r.level, 18) + emb(r.name, 20) + who(r.name) +
      (r.left ? " <small>" + t("left", "se fue") + "</small>" : "") + "</td><td>" + n(r.score) + "</td><td>" + (m.stats ? n(r.kills) : "–") + "</td><td>" +
      (m.stats ? n(r.deaths) : "–") + "</td><td>" + (m.stats ? n(r.assists) : "–") + "</td><td>" + (m.stats ? n(r.medals) : "–") + "</td><td>" +
      (r.xp ? (r.xp > 0 ? "+" : "") + r.xp : "–") + "</td></tr>").join("");
    return '<article class="sx-panel sx-match' + (open ? " open" : "") + '" style="--win:' + accent + '" data-key="' + esc(key) + '">' +
      mapTile(m.map, m.variant, false, plName(m.playlist)) + '<div class="sx-m-body"><div class="sx-meta"><span class="sx-pl">' + esc(plName(m.playlist)) + "</span><span>" + ago(m.ended) + "</span></div>" +
      outcome + mvpLine + '<div class="sx-m-foot"><span>' + (m.ended > m.started ? minutes(m.ended - m.started) + " · " : "") + plural(m.rows.length, "player", "players", "jugador", "jugadores") +
      '</span><button type="button" class="sx-link" data-report="' + esc(key) + '" aria-expanded="' + open + '">' + (open ? t("Hide report", "Ocultar informe") : t("Carnage report", "Informe de bajas")) + "</button></div></div>" +
      (open ? '<div class="sx-report"><table class="sx-table"><caption class="sx-vh">' + t("Carnage report", "Informe de bajas") + "</caption><thead><tr><th>" + t("Player", "Jugador") + "</th><th>" + t("Score", "Puntos") + "</th><th>" + t("Kills", "Bajas") +
        "</th><th>" + t("Deaths", "Muertes") + "</th><th>" + t("Assists", "Asist.") + "</th><th>" + t("Medals", "Medallas") + "</th><th>XP</th></tr></thead><tbody>" + rows + "</tbody></table>" +
        '<p class="sx-sub">' + when(m.started) + (m.stats ? "" : " · " + t("this match kept no kill counts", "esta partida no guardó bajas")) + "</p></div>" : "") + "</article>";
  }

  // ---- 03 leaders: kills, K/D, medals and wins over the last 100 matches, this week or this month
  function tally(list) {
    const s = {};
    list.forEach((m) => {
      const res = result(m);
      m.rows.forEach((r) => {
        const x = s[r.name] || (s[r.name] = { name: r.name, games: 0, wins: 0, kills: 0, deaths: 0, medals: 0, sg: 0 });
        x.games++;
        if (won(m, res, r)) x.wins++;
        if (m.stats) { x.sg++; x.kills += r.kills || 0; x.deaths += r.deaths || 0; x.medals += r.medals || 0; }
      });
    });
    return Object.values(s);
  }
  function scoped(d) {
    if (leadScope === "recent") return { rows: tally(d.recent), count: d.recent.length };
    const days = leadScope === "week" ? 7 : 30, since = now() - days * 86400, list = d.recent.filter((m) => m.ended >= since);
    const srv = d[leadScope] && Array.isArray(d[leadScope].top) && d[leadScope].top.length ? d[leadScope].top : null;
    // Live's own totals for the period when it sends them (it keeps every account's days), else the recent matches
    if (srv) return { rows: srv.map((r) => ({ name: r.name, games: r.games || 0, wins: r.wins || 0, kills: r.kills || 0, deaths: r.deaths || 0, medals: r.medals || 0, sg: r.games || 0 })), count: null };
    return { rows: tally(list), count: list.length };
  }
  const ICONS = {
    kills: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><circle cx="12" cy="12" r="5"/>',
    kd: '<path d="M4 20L20 4M5 5h5v5M14 14h5v5"/>',
    medals: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11L6 3h4l2 5 2-5h4l-2.5 8"/>',
    wins: '<path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  };
  function leaders(d) {
    const scopes = [["recent", "Last 100 matches", "Últimas 100 partidas"], ["week", "This week", "Esta semana"], ["month", "This month", "Este mes"]];
    $("lead-scope").innerHTML = scopes.map((x) => '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (x[0] === leadScope) + '">' + t(x[1], x[2]) + "</button>").join("");
    const sc = scoped(d), rows = sc.rows;
    $("lead-cap").innerHTML = sc.count == null ? t("Totals from GRAVEMIND LIVE", "Totales de GRAVEMIND LIVE")
      : leadScope === "recent" ? t("From the last " + sc.count + " matches", "De las últimas " + sc.count + " partidas")
        : t("From " + sc.count + " of the last " + d.recent.length + " matches", "De " + sc.count + " de las últimas " + d.recent.length + " partidas");
    const ratio = (r) => r.kills / Math.max(1, r.deaths);
    const cats = [
      ["kills", "Most kills", "Más bajas", (r) => r.kills, (r) => r.sg > 0 && r.kills > 0, (r) => n(r.kills), (r) => plural(r.sg, "game", "games", "partida", "partidas")],
      ["kd", "Best K/D", "Mejor K/D", ratio, (r) => r.sg >= KD_GAMES && (r.kills || r.deaths), (r) => kd(r.kills, r.deaths),
        (r) => t(n(r.kills) + " kills · " + n(r.deaths) + " deaths", n(r.kills) + " bajas · " + n(r.deaths) + " muertes")],
      ["medals", "Most medals", "Más medallas", (r) => r.medals, (r) => r.sg > 0 && r.medals > 0, (r) => n(r.medals), (r) => plural(r.sg, "game", "games", "partida", "partidas")],
      ["wins", "Most wins", "Más victorias", (r) => r.wins, (r) => r.wins > 0, (r) => n(r.wins), (r) => t(pct(r.wins, r.games) + " of " + n(r.games) + " games", pct(r.wins, r.games) + " de " + n(r.games) + " partidas")],
    ];
    $("leaders").innerHTML = cats.map(([id, en, sp, val, ok, show, sub]) => {
      const top = rows.filter(ok).sort((a, b) => val(b) - val(a) || b.games - a.games || (a.name < b.name ? -1 : 1)).slice(0, 3);
      const head = '<div class="sx-ld-head"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[id] + "</svg><h3>" + t(en, sp) + "</h3></div>";
      const note = id === "kd" ? '<p class="sx-ld-note">' + t("At least " + KD_GAMES + " games with kill counts", "Mínimo " + KD_GAMES + " partidas con bajas") + "</p>" : "";
      if (!top.length) return '<div class="sx-panel sx-leader">' + head + '<p class="sx-none">' + t("Nobody yet in this period.", "Nadie todavía en este periodo.") + "</p>" + note + "</div>";
      const one = top[0], p1 = byName[one.name] || {};
      return '<div class="sx-panel sx-leader">' + head + '<div class="sx-ld-one"><span class="sx-ld-pos">#1</span>' + emb(one.name, 52) +
        '<div class="sx-ld-who">' + who(one.name) + "<small>" + lvl(p1.level, 16) + sub(one) + "</small></div></div>" +
        '<b class="sx-ld-val">' + show(one) + "</b>" +
        '<ol class="sx-ld-rest" start="2">' + top.slice(1).map((r, i) => '<li><span class="sx-ld-pos">#' + (i + 2) + "</span>" + emb(r.name, 22) + who(r.name) + "<b>" + show(r) + "</b></li>").join("") + "</ol>" + note + "</div>";
    }).join("");
  }

  // ---- 04 top players: by level (then experience), overall or in one playlist; the first three on a podium
  function top(d) {
    const ranked = d.playlists.filter((pl) => players.some((p) => p.ranks && p.ranks[pl.id] && p.ranks[pl.id].games));
    const tabs = [["", "Overall", "General"]].concat(ranked.map((pl) => [pl.id, esc(pl.name), esc(pl.name)]));
    if (!tabs.some((x) => x[0] === topTab)) topTab = "";
    $("top-tabs").innerHTML = tabs.map((x) => '<button type="button" data-v="' + esc(x[0]) + '" aria-pressed="' + (x[0] === topTab) + '">' + t(x[1], x[2]) + "</button>").join("");
    let rows = !topTab ? players.filter((p) => p.level > 0).map((p) => ({ name: p.name, level: p.level, xp: p.experience, games: p.tot.games, wins: p.tot.wins }))
      : players.filter((p) => p.ranks && p.ranks[topTab] && p.ranks[topTab].games).map((p) => ({ name: p.name, level: p.ranks[topTab].level || 1, xp: p.ranks[topTab].xp || 0, games: p.ranks[topTab].games, wins: p.ranks[topTab].wins || 0 }));
    rows.sort((a, b) => b.level - a.level || b.xp - a.xp || b.wins - a.wins);
    $("top-cap").innerHTML = t(n(rows.length) + " players with a level", n(rows.length) + " jugadores con nivel");
    if (!rows.length) { $("top").innerHTML = '<div class="sx-panel sx-empty"><div><b>' + t("Nobody has a level here yet.", "Nadie tiene nivel aquí todavía.") + "</b></div></div>"; return; }
    const tag = (name) => (byName[name] || {}).tag ? '<span class="sx-tag">' + esc(byName[name].tag) + "</span>" : "";
    const podium = rows.slice(0, 3).map((r, i) => '<div class="sx-panel sx-pod p' + (i + 1) + '"><span class="sx-pod-pos">' + (i + 1) + "</span>" + lvl(r.level, 84) +
      '<div class="sx-pod-id">' + emb(r.name, 40) + '<div class="sx-pod-n">' + who(r.name) + tag(r.name) + "</div></div>" +
      '<p class="sx-pod-sub"><b>' + t("Level ", "Nivel ") + r.level + "</b> · " + n(r.xp) + " XP · " + plural(r.games, "game", "games", "partida", "partidas") + " · " + plural(r.wins, "win", "wins", "victoria", "victorias") + "</p></div>").join("");
    const rest = rows.slice(3, topLong ? TOP_LONG : TOP_SHORT).map((r, i) => '<li><span class="sx-rk">' + (i + 4) + "</span>" + lvl(r.level, 26) + emb(r.name, 26) +
      '<span class="sx-row-n">' + who(r.name) + tag(r.name) + "</span><span class=\"sx-row-x\">" + n(r.xp) + " XP</span><span class=\"sx-row-g\">" + plural(r.games, "game", "games", "partida", "partidas") +
      '</span><b class="sx-row-l">' + r.level + "</b></li>").join("");
    $("top").innerHTML = '<div class="sx-podium">' + podium + "</div>" + (rest ? '<ol class="sx-rows">' + rest + "</ol>" : "") +
      (rows.length > TOP_SHORT ? '<div class="sx-more"><button type="button" class="sx-btn" id="top-more">' + (topLong ? t("Show top " + TOP_SHORT, "Ver los " + TOP_SHORT + " primeros") : t("Show top " + TOP_LONG, "Ver los " + TOP_LONG + " primeros")) + "</button></div>" : "");
  }

  // ---- 05 charts (SVG drawn here, sized to their box: redrawn when it changes width)
  const seg = (id, opts, cur) => { $(id).innerHTML = opts.map((o) => '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === cur) + '">' + t(o[1], o[2]) + "</button>").join(""); };
  const dayKey = (u) => { const x = new Date(u * 1000); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
  function activity(d) {
    seg("act-mode", [["day", "By day", "Por día"], ["hour", "By hour", "Por hora"]], actMode);
    const list = d.recent.filter((m) => m.ended || m.started), el = $("activity");
    if (!list.length) { el.innerHTML = '<p class="sx-none">' + t("No match played yet.", "Ninguna partida jugada todavía.") + "</p>"; $("act-kpis").innerHTML = ""; $("act-sub").innerHTML = ""; return; }
    const loc = es() ? "es-ES" : "en-US", first = Math.min(...list.map((m) => m.started || m.ended)), last = Math.max(...list.map((m) => m.ended || m.started));
    let bins = [];
    if (actMode === "day") {
      const end = dayKey(last);
      let start = dayKey(first);
      const span = Math.round((end - start) / 86400000) + 1;
      if (span > MAX_DAYS) start = end - (MAX_DAYS - 1) * 86400000;
      for (let k = start; k <= end; k = new Date(new Date(k).getFullYear(), new Date(k).getMonth(), new Date(k).getDate() + 1).getTime()) {
        const dt = new Date(k);
        bins.push({ k: k, v: 0, label: dt.toLocaleDateString(loc, { weekday: "short" }).replace(".", ""), label2: String(dt.getDate()),
          tip: dt.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" }) });
      }
      list.forEach((m) => { const b = bins.find((x) => x.k === dayKey(m.started || m.ended)); if (b) b.v++; });
    } else {
      bins = Array.from({ length: 24 }, (_, h) => ({ v: 0, label: h % (el.clientWidth < 520 ? 6 : 3) === 0 ? String(h).padStart(2, "0") : "", label2: "", tip: String(h).padStart(2, "0") + ":00–" + String(h).padStart(2, "0") + ":59" }));
      list.forEach((m) => { bins[new Date((m.started || m.ended) * 1000).getHours()].v++; });
    }
    const fmt = (u) => new Date(u * 1000).toLocaleDateString(loc, { day: "numeric", month: "short" });
    $("act-sub").innerHTML = t("Last " + list.length + " matches · " + fmt(first) + " – " + fmt(last), "Últimas " + list.length + " partidas · " + fmt(first) + " – " + fmt(last)) +
      (actMode === "hour" ? " · " + t("your local time", "tu hora local") : "");
    const peak = bins.reduce((a, b) => (b.v > a.v ? b : a), bins[0]);
    const days = Math.max(1, (dayKey(last) - dayKey(first)) / 86400000 + 1);
    const hours = Array.from({ length: 24 }, () => 0);
    list.forEach((m) => { hours[new Date((m.started || m.ended) * 1000).getHours()]++; });
    const peakH = hours.indexOf(Math.max(...hours));
    $("act-kpis").innerHTML = '<div><b>' + n(list.length) + "</b><span>" + t("matches", "partidas") + "</span></div>" +
      "<div><b>" + (list.length / days).toFixed(1).replace(".", es() ? "," : ".") + "</b><span>" + t("a day on average", "al día de media") + "</span></div>" +
      "<div><b>" + String(peakH).padStart(2, "0") + ":00</b><span>" + t("busiest hour", "hora con más partidas") + "</span></div>";
    const w = Math.max(260, el.clientWidth || 520), h = w > 500 ? 236 : 190, top = 24, bottom = actMode === "day" ? 40 : 24, ph = h - top - bottom;
    const max = Math.max(1, peak.v), step = w / bins.length, bw = Math.max(3, Math.min(34, step * 0.62));
    const labelAll = bins.length <= MAX_DAYS;
    let svg = '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' +
      esc(tx(actMode === "day" ? "Matches per day" : "Matches per hour of the day", actMode === "day" ? "Partidas por día" : "Partidas por hora del día") + ": " +
        bins.map((b) => (b.tip + " " + b.v)).join(", ")) + '">';
    bins.forEach((b, i) => {
      const x = i * step + (step - bw) / 2, bh = b.v ? Math.max(3, (b.v / max) * ph) : 0, y = top + ph - bh, r = Math.min(3, bw / 2, bh);
      svg += '<g class="sx-bar' + (b === peak && b.v ? " peak" : "") + '"><title>' + esc(b.tip) + ": " + b.v + " " + esc(tx(b.v === 1 ? "match" : "matches", b.v === 1 ? "partida" : "partidas")) + "</title>" +
        '<rect class="hit" x="' + (i * step).toFixed(1) + '" y="0" width="' + step.toFixed(1) + '" height="' + h + '"/>' +
        (bh ? '<path d="M' + x.toFixed(1) + " " + (top + ph) + "V" + (y + r).toFixed(1) + "Q" + x.toFixed(1) + " " + y.toFixed(1) + " " + (x + r).toFixed(1) + " " + y.toFixed(1) +
          "H" + (x + bw - r).toFixed(1) + "Q" + (x + bw).toFixed(1) + " " + y.toFixed(1) + " " + (x + bw).toFixed(1) + " " + (y + r).toFixed(1) + "V" + (top + ph) + 'Z"/>' : "") +
        (b.v && (labelAll || b === peak) ? '<text class="v" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 7).toFixed(1) + '" text-anchor="middle">' + b.v + "</text>" : "") +
        (b.label ? '<text class="l" x="' + (x + bw / 2).toFixed(1) + '" y="' + (top + ph + 17) + '" text-anchor="middle">' + esc(b.label) + "</text>" : "") +
        (b.label2 ? '<text class="l2" x="' + (x + bw / 2).toFixed(1) + '" y="' + (top + ph + 32) + '" text-anchor="middle">' + esc(b.label2) + "</text>" : "") + "</g>";
    });
    svg += '<line class="base" x1="0" y1="' + (top + ph + 0.5) + '" x2="' + w + '" y2="' + (top + ph + 0.5) + '"/></svg>';
    el.innerHTML = svg;
  }
  function playlistChart(d) {
    seg("pl-mode", [["players", "Players", "Jugadores"], ["games", "Matches", "Partidas"]], plMode);
    const el = $("playlists"), val = (p) => plMode === "players" ? p.players || 0 : Math.round((p.games || 0) / Math.max(1, p.players_per_game || 1));
    const list = d.playlists.slice().sort((a, b) => val(b) - val(a) || (a.name < b.name ? -1 : 1));
    $("pl-sub").innerHTML = plMode === "players" ? t("Players with a level in each playlist", "Jugadores con nivel en cada lista") : t("Matches played in each playlist", "Partidas jugadas en cada lista");
    if (!list.length) { el.innerHTML = ""; return; }
    const w = Math.max(260, el.clientWidth || 520), narrow = w < 400, max = Math.max(1, ...list.map(val));
    const labelW = narrow ? 0 : Math.min(190, Math.round(w * 0.36)), x0 = narrow ? 0 : labelW + 12, valW = 54, barMax = w - x0 - valW;
    const rowH = narrow ? 40 : 28, h = list.length * rowH + 4;
    let svg = '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' +
      esc(tx(plMode === "players" ? "Players with a level per playlist" : "Matches per playlist", plMode === "players" ? "Jugadores con nivel por lista" : "Partidas por lista") + ": " +
        list.map((p) => p.name + " " + val(p)).join(", ")) + '">';
    list.forEach((p, i) => {
      const v = val(p), y = i * rowH + (narrow ? 20 : 8), bw = v ? Math.max(3, (v / max) * barMax) : 0, ly = narrow ? y - 7 : y + 9;
      svg += '<g class="sx-hbar' + (v === max && v ? " peak" : "") + (v ? "" : " zero") + '"><title>' + esc(p.name + ": " + n(v) + " " +
        tx(plMode === "players" ? "players" : "matches", plMode === "players" ? "jugadores" : "partidas") + (p.searching ? " · " + p.searching + " " + tx("searching now", "buscando ahora") : "") +
        (p.ranked ? " · " + tx("ranked", "con rango") : "")) + "</title>" +
        '<rect class="hit" x="0" y="' + (i * rowH) + '" width="' + w + '" height="' + rowH + '"/>' +
        '<text class="l" x="' + (narrow ? 0 : labelW) + '" y="' + ly + '" text-anchor="' + (narrow ? "start" : "end") + '">' + esc(p.name) + "</text>" +
        '<rect class="track" x="' + x0 + '" y="' + y + '" width="' + barMax + '" height="12" rx="2"/>' +
        (bw ? '<rect class="fill" x="' + x0 + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="12" rx="2"/>' : "") +
        '<text class="v" x="' + (x0 + bw + 8).toFixed(1) + '" y="' + (y + 10) + '">' + n(v) + "</text></g>";
    });
    el.innerHTML = svg + "</svg>";
  }

  // ---- 06 the newest accounts: a welcome card each, with the emblem, the armour colours, the rank and when they joined
  function newest(d) {
    let list = d.newest.filter((x) => x && x.name && x.joined);
    if (!list.length) list = players.filter((p) => p.joined).sort((a, b) => b.joined - a.joined).slice(0, 12);
    $("newcomers").hidden = !list.length;
    if (!list.length) return;
    $("newest").innerHTML = list.slice(0, 12).map((x) => {
      const p = byName[x.name] || { name: x.name }, look = p.look, prim = color(look ? look[6] : 1), sec = color(look ? look[7] : 1), e = emblem(look, 112);
      return '<button type="button" class="newcomer" data-player="' + esc(x.name) + '" style="--prim:' + prim + ";--sec:" + sec + '">' +
        (e ? '<img class="emb nc-emb" src="' + e + '" width="56" height="56" alt="">' : '<span class="emb nc-emb"></span>') +
        '<span class="nc-text"><span class="nc-name">' + nm(x.name) + (p.tag ? ' <span class="stag">' + esc(p.tag) + "</span>" : "") + "</span>" +
        '<span class="nc-when">' + t("Joined ", "Llegó ") + ago(x.joined) + "</span></span>" +
        '<span class="nc-rank">' + lvl(p.level || 1, 34) + "<small>" + t("Level ", "Nivel ") + (p.level || 1) + "</small></span></button>";
    }).join("");
  }

  // ---- the player card: level, rank, emblem, last seen, per playlist, medals, recent matches (stats.html#p=<name>)
  function card(name) {
    const p = byName[name];
    if (!p || !data) return;
    if ($("card").hidden) opener = document.activeElement;
    const status = { game: t("In a match", "En partida"), search: t("Searching", "Buscando"), lobby: t("In a lobby", "En una sala"), menu: t("Online", "En línea") }[p.status];
    const seen = p.online ? '<span class="sx-on"><i class="sx-dot"></i>' + (status || t("Online", "En línea")) + "</span>" : p.seen ? t("Last seen ", "Visto por última vez ") + ago(p.seen) : "";
    const big = emblem(p.look, 224);
    const ranks = Object.keys(p.ranks || {}).map((id) => Object.assign({ id: id }, p.ranks[id])).filter((r) => r.games).sort((a, b) => b.level - a.level || b.games - a.games);
    const mine = data.recent.filter((m) => m.rows.some((r) => r.name === name));
    const stat = (v, en, sp) => "<div><b>" + v + "</b><span>" + t(en, sp) + "</span></div>";
    const lines = mine.slice(0, 10).map((m) => {
      const row = m.rows.find((r) => r.name === name), res = result(m), w = won(m, res, row);
      const cls = res.tie ? "tie" : w ? "won" : "lost";
      return '<li class="' + cls + '"><span class="sx-out">' + (res.tie ? t("Tie", "Empate") : w ? t("Won", "Victoria") : t("Lost", "Derrota")) + "</span>" +
        '<span class="sx-ml-map"><b>' + esc(title(m.map)) + "</b><small>" + esc(plName(m.playlist)) + (row.left ? " · " + t("left early", "se fue antes") : "") + "</small></span>" +
        '<span class="sx-ml-num">' + n(row.score) + "<small>" + t("pts", "pts") + "</small></span>" +
        '<span class="sx-ml-num">' + (m.stats ? n(row.kills) + "/" + n(row.deaths) : "–") + "<small>K/D</small></span>" +
        '<span class="sx-ml-when">' + ago(m.ended) + "</span></li>";
    }).join("");
    const medals = Object.keys(p.medals || {}).map((k) => [MEDALS[k] || [tx("Medal ", "Medalla ") + k, tx("Medal ", "Medalla ") + k], p.medals[k]]).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map((m) => "<li><b>" + n(m[1]) + "</b>" + t(esc(m[0][0]), esc(m[0][1])) + "</li>").join("");
    $("card-body").innerHTML = '<div class="sx-c-head"><div class="sx-c-emb">' + (big ? '<img src="' + big + '" width="112" height="112" alt="">' : "") + "</div>" +
      '<div class="sx-c-id"><p class="sx-c-k">' + t("Player", "Jugador") + (p.tag ? " · <span>" + esc(p.tag) + "</span>" : "") + '</p><h2 id="card-name">' + nm(p.name) + "</h2>" +
      '<p class="sx-c-seen">' + seen + "</p></div>" +
      '<div class="sx-c-rank">' + lvl(p.level || 1, 104) + '<div><b>' + (p.level || 0) + "</b><span>" + t("Level", "Nivel") + "</span><small>" + n(p.experience) + " XP</small></div></div>" +
      '<div class="sx-c-fig" id="card-figure" aria-hidden="true"></div></div>' +
      '<div class="sx-c-stats">' + stat(n(p.tot.games), "games", "partidas") + stat(n(p.tot.wins), "wins", "victorias") + stat(pct(p.tot.wins, p.tot.games), "win rate", "victorias") +
      stat(kd(p.tot.kills, p.tot.deaths), "K/D", "K/D") + stat(n(p.tot.medals), "medals", "medallas") + "</div>" +
      (lines ? '<h3 class="sx-c-h">' + t("Recent matches", "Últimas partidas") + "<small>" + t("in the last " + data.recent.length + " on GRAVEMIND LIVE", "de las últimas " + data.recent.length + " en GRAVEMIND LIVE") + '</small></h3><ul class="sx-mlines">' + lines + "</ul>" : "") +
      (ranks.length ? '<h3 class="sx-c-h">' + t("Playlists", "Listas") + '</h3><div class="sx-report"><table class="sx-table"><thead><tr><th>' + t("Playlist", "Lista") + "</th><th>" + t("Level", "Nivel") +
        "</th><th>" + t("Games", "Partidas") + "</th><th>" + t("Wins", "Victorias") + "</th><th>K/D</th><th>" + t("Medals", "Medallas") + "</th></tr></thead><tbody>" +
        ranks.map((r) => "<tr><td>" + esc(plName(r.id)) + "</td><td>" + lvl(r.level, 20) + r.level + "</td><td>" + n(r.games) + "</td><td>" + n(r.wins) + "</td><td>" + kd(r.kills, r.deaths) + "</td><td>" + n(r.medals) + "</td></tr>").join("") +
        "</tbody></table></div>" : '<p class="sx-none">' + t("No matchmaking match yet.", "Ninguna partida de matchmaking todavía.") + "</p>") +
      (medals ? '<h3 class="sx-c-h">' + t("Medals earned most", "Medallas más ganadas") + '</h3><ul class="sx-medals">' + medals + "</ul>" : "");
    figure(p.look, $("card-figure"));
    $("card").hidden = false;
    $("card").scrollTop = 0;
    document.body.classList.add("modal-open");
    $("card-close").focus();
    const hash = "#p=" + encodeURIComponent(name);
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }
  function closeCard() {
    if ($("card").hidden) return;
    $("card").hidden = true;
    document.body.classList.remove("modal-open");
    history.replaceState(null, "", location.pathname + location.search);
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }
  $("card-close").addEventListener("click", closeCard);
  $("card").addEventListener("click", (e) => { if (e.target === $("card")) closeCard(); });
  document.addEventListener("keydown", (e) => {
    if ($("card").hidden) return;
    if (e.key === "Escape") closeCard();
    if (e.key === "Tab") {  // focus stays in the card
      const f = Array.from($("card").querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")).filter((x) => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.addEventListener("hashchange", () => { if (location.hash.startsWith("#p=")) card(decodeURIComponent(location.hash.slice(3))); else closeCard(); });

  // ---- find a player: a list under the box as you type (names that start with it first), arrows + Enter, "/" to focus
  let found = [], active = -1;
  function suggest() {
    const q = $("find").value.trim().toLowerCase(), list = $("find-list");
    found = !q ? [] : players.filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || (b.online - a.online) || b.level - a.level || (a.name < b.name ? -1 : 1)).slice(0, 8);
    active = found.length ? 0 : -1;
    if (!q) { list.hidden = true; $("find").setAttribute("aria-expanded", "false"); return; }
    list.innerHTML = found.length ? found.map((p, i) => '<li role="option" id="find-o' + i + '" data-player="' + esc(p.name) + '" aria-selected="' + (i === active) + '">' + emb(p.name, 28) +
      '<span class="sx-f-n">' + nm(p.name) + (p.tag ? '<span class="sx-tag">' + esc(p.tag) + "</span>" : "") + "</span>" +
      (p.online ? '<span class="sx-on"><i class="sx-dot"></i>' + t("Online", "En línea") + "</span>" : "") + lvl(p.level, 24) + '<span class="sx-f-l">' + (p.level || 0) + "</span></li>").join("")
      : '<li class="sx-f-none">' + t("No player with that name.", "Ningún jugador con ese nombre.") + "</li>";
    list.hidden = false;
    $("find").setAttribute("aria-expanded", "true");
    mark();
  }
  function mark() {
    $("find-list").querySelectorAll("[role=option]").forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
    if (active >= 0) $("find").setAttribute("aria-activedescendant", "find-o" + active); else $("find").removeAttribute("aria-activedescendant");
  }
  function pick(name) { $("find-list").hidden = true; $("find").setAttribute("aria-expanded", "false"); card(name); }
  $("find").addEventListener("input", suggest);
  $("find").addEventListener("focus", () => { if ($("find").value.trim()) suggest(); });
  $("find").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && found.length) { e.preventDefault(); active = (active + 1) % found.length; mark(); }
    else if (e.key === "ArrowUp" && found.length) { e.preventDefault(); active = (active - 1 + found.length) % found.length; mark(); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(found[active].name); }
    else if (e.key === "Escape") { $("find-list").hidden = true; $("find").setAttribute("aria-expanded", "false"); }
  });
  $("find-list").addEventListener("mousedown", (e) => { const li = e.target.closest("[data-player]"); if (li) { e.preventDefault(); pick(li.dataset.player); } });
  document.addEventListener("click", (e) => { if (!e.target.closest(".sx-find")) { $("find-list").hidden = true; $("find").setAttribute("aria-expanded", "false"); } });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "") && $("card").hidden) { e.preventDefault(); $("find").focus(); }
  });

  // ---- one click handler for the whole page: gamertags, filters, toggles, "show more"
  document.querySelector("main").addEventListener("click", (e) => {
    const el = e.target.closest("button");
    if (!el || !data) return;
    if (el.dataset.player && !el.closest("#find-list")) { card(el.dataset.player); return; }
    const group = el.parentElement && el.parentElement.id;
    if (el.dataset.report != null) { recentOpen = recentOpen === el.dataset.report ? "" : el.dataset.report; recent(data); return; }
    if (el.id === "recent-more") { recentShown += RECENT_STEP; recent(data); return; }
    if (el.id === "top-more") { topLong = !topLong; top(data); return; }
    const v = el.dataset.v;
    if (v == null) return;
    if (group === "recent-filter") { recentFilter = v; recentShown = RECENT_STEP; recentOpen = ""; recent(data); }
    else if (group === "lead-scope") { leadScope = v; leaders(data); }
    else if (group === "top-tabs") { topTab = v; topLong = false; top(data); }
    else if (group === "act-mode") { actMode = v; activity(data); }
    else if (group === "pl-mode") { plMode = v; playlistChart(data); }
  });
  // the language buttons (main.js switches the spans): draw again what holds plain strings (SVG text, aria labels)
  document.querySelectorAll("[data-set-lang]").forEach((b) => b.addEventListener("click", () => { if (data) render(data); }));
  let lastW = 0, timer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (data && window.innerWidth !== lastW) { lastW = window.innerWidth; activity(data); playlistChart(data); } }, 150);
  });

  function render(d) {
    const first = !data;
    data = d;
    prepare(d);
    lastW = window.innerWidth;
    // each part on its own: one that fails (an odd entry in the file) leaves the others drawn
    [updated, ring, tiles, live, recent, leaders, top, activity, playlistChart, newest].forEach((part) => { try { part(d); } catch (e) { console.error(e); } });
    // stats.html#p=<gamertag> opens that player's card (a link to share)
    if (first && location.hash.startsWith("#p=")) card(decodeURIComponent(location.hash.slice(3)));
  }

  async function load() {
    for (const url of URLS) {
      try {
        const r = await fetch(url, { cache: "no-cache" });
        if (!r.ok) continue;
        // read as bytes and decoded leniently: a stray non-UTF-8 byte (an older Live's file) becomes U+FFFD, not a
        // file that cannot be read
        const text = new TextDecoder("utf-8").decode(await r.arrayBuffer());
        const d = JSON.parse(text);
        if (!d || typeof d !== "object") continue;
        render(d);
        return;
      } catch (e) { /* the next one */ }
    }
    if (!data) $("updated").innerHTML = '<span class="sx-warn">' + t("The stats are not available right now.", "Las estadísticas no están disponibles ahora mismo.") + "</span>";
  }

  loadEmblems().then(load);
  setInterval(load, REFRESH);
})();
