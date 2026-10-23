// Project Gravemind - the stats page (stats.html, built by tools/web_pages.py): GRAVEMIND LIVE's stats.json drawn with
// plain DOM code. The Live server writes the file every 30 s and tools/publish_stats.ps1 pushes it to GitHub; the
// first URL that answers is used (the second: a copy published with the site, or the local preview's).

(function () {
  const URLS = ["https://raw.githubusercontent.com/BriRoz1/project-gravemind-stats/main/stats.json", "data/stats.json"];
  const REFRESH = 120000;  // ms between loads
  const STALE = 15 * 60;   // s without a new file: the server is not reporting
  const PAGE = 50;         // players shown at a time
  const TOP = 25;

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

  const $ = (id) => document.getElementById(id);
  const t = (en, es) => '<span lang="en">' + en + '</span><span lang="es">' + es + "</span>";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const n = (v) => (v || 0).toLocaleString();
  const pct = (a, b) => (b ? Math.round((a * 100) / b) + " %" : "–");
  const kd = (k, d) => (k || d ? (k / Math.max(1, d)).toFixed(2) : "–");
  const lvl = (v) => '<span class="lvl">' + (v || 1) + "</span>";
  const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  const now = () => Math.floor(Date.now() / 1000);

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
    return esc(new Date(unix * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
  }
  function minutes(seconds) {
    const m = Math.floor(seconds / 60);
    return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min";
  }

  let data = null, playlists = {}, players = [], shown = PAGE, sortKey = "level", sortDown = true, filter = "", topTab = "";

  // every account with its totals over the playlists (ranks only where played)
  function prepare(d) {
    playlists = {};
    d.playlists.forEach((p) => { playlists[p.id] = p; });
    players = d.players.map((p) => {
      const tot = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, medals: 0 };
      Object.values(p.ranks || {}).forEach((r) => { Object.keys(tot).forEach((k) => { tot[k] += r[k] || 0; }); });
      return Object.assign({ tot: tot, online: !!p.status }, p);
    });
  }

  function tiles(d) {
    const tile = (v, en, es) => '<div class="panel"><div class="stat">' + v + "<small>" + t(en, es) + "</small></div></div>";
    $("tiles").innerHTML = tile(n(d.online), "online now", "en línea") + tile(n(d.playing), "in a match", "en partida") +
      tile(n(d.searching), "searching", "buscando partida") + tile(n(d.accounts), "accounts", "cuentas");
  }

  function matches(d) {
    const list = (d.matches || []).slice().sort((a, b) => a.since - b.since);
    if (!list.length) {
      $("matches").innerHTML = '<p class="empty">' + t("No match in progress.", "Ninguna partida en curso.") + "</p>";
      return;
    }
    $("matches").innerHTML = list.map((m) => {
      const pl = playlists[m.playlist] || {};
      const teams = pl.teams && m.players.some((p) => p.team >= 0);
      const player = (p) => '<li>' + lvl(p.level) + esc(p.name) + "</li>";
      let body;
      if (teams) {
        const side = (team, en, es) => '<div class="team ' + (team ? "blue" : "red") + '"><b>' + t(en, es) + "</b><ul>" +
          m.players.filter((p) => p.team === team).map(player).join("") + "</ul></div>";
        body = side(0, "Red", "Rojo") + side(1, "Blue", "Azul");
      } else {
        body = '<div class="team"><ul>' + m.players.map(player).join("") + "</ul></div>";
      }
      const state = m.state === "playing" ? t("Playing · " + minutes(now() - m.since), "En juego · " + minutes(now() - m.since))
        : t("In the lobby", "En la sala");
      return '<div class="panel match"><div class="mhead"><span>' + esc(pl.name || m.playlist) + '</span><span class="state">' + state +
        "</span></div><h3>" + esc(m.title) + '</h3><div class="teams">' + body + "</div></div>";
    }).join("");
  }

  function playlistTable(d) {
    const rows = d.playlists.map((p) => "<tr><td>" + esc(p.name) + (p.ranked ? ' <span class="tag">' + t("ranked", "con rango") + "</span>" : "") +
      "</td><td>" + (p.teams ? t("Teams", "Equipos") : t("Free for all", "Todos contra todos")) + "</td><td>" + p.players_per_game +
      "</td><td>" + n(p.searching) + "</td><td>" + n(p.players) + "</td><td>" + n(Math.round(p.games / Math.max(1, p.players_per_game))) + "</td></tr>").join("");
    $("playlists").innerHTML = "<thead><tr><th>" + t("Playlist", "Lista") + "</th><th>" + t("Type", "Tipo") + "</th><th>" + t("Players", "Jugadores") +
      "</th><th>" + t("Searching now", "Buscando ahora") + "</th><th>" + t("Players ranked", "Jugadores con nivel") + "</th><th>" +
      t("Matches", "Partidas") + "</th></tr></thead><tbody>" + rows + "</tbody>";
  }

  // the best of a playlist (its level, then experience), or overall (best level, then experience)
  function top(d) {
    const tabs = [["", "Overall", "General"]].concat(d.playlists.map((p) => [p.id, p.name, p.name]));
    if (!tabs.some((x) => x[0] === topTab)) topTab = "";
    $("top-tabs").innerHTML = tabs.map((x) => '<button type="button" data-tab="' + esc(x[0]) + '"' + (x[0] === topTab ? ' class="on"' : "") + ">" +
      t(esc(x[1]), esc(x[2])) + "</button>").join("");
    $("top-tabs").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { topTab = b.dataset.tab; top(d); }));
    let rows;
    if (!topTab) {
      rows = players.filter((p) => p.tot.games).sort((a, b) => b.level - a.level || b.experience - a.experience || b.tot.wins - a.tot.wins)
        .map((p) => Object.assign({ name: p.name, level: p.level, xp: p.experience }, p.tot));
    } else {
      rows = players.filter((p) => p.ranks && p.ranks[topTab] && p.ranks[topTab].games)
        .map((p) => Object.assign({ name: p.name }, p.ranks[topTab]))
        .sort((a, b) => b.level - a.level || b.xp - a.xp || b.wins - a.wins);
    }
    const body = rows.slice(0, TOP).map((r, i) => '<tr data-player="' + esc(r.name) + '"><td class="rank">' + (i + 1) + "</td><td>" + esc(r.name) + "</td><td>" +
      lvl(r.level) + "</td><td>" + n(r.games) + "</td><td>" + n(r.wins) + "</td><td>" + pct(r.wins, r.games) + "</td><td>" + n(r.kills) +
      "</td><td>" + n(r.deaths) + "</td><td>" + kd(r.kills, r.deaths) + "</td><td>" + n(r.medals) + "</td></tr>").join("");
    $("top").innerHTML = "<thead><tr><th>#</th><th>" + t("Player", "Jugador") + "</th><th>" + t("Level", "Nivel") + "</th><th>" + t("Games", "Partidas") +
      "</th><th>" + t("Wins", "Victorias") + "</th><th>" + t("Win %", "% vict.") + "</th><th>" + t("Kills", "Bajas") + "</th><th>" +
      t("Deaths", "Muertes") + "</th><th>K/D</th><th>" + t("Medals", "Medallas") + "</th></tr></thead><tbody>" +
      (body || '<tr><td colspan="10" class="empty">' + t("Nobody has played this playlist yet.", "Nadie ha jugado esta lista todavía.") + "</td></tr>") + "</tbody>";
    $("top").querySelectorAll("tr[data-player]").forEach((tr) => tr.addEventListener("click", () => card(tr.dataset.player)));
  }

  // every account: filter by name, sort by a column, PAGE rows at a time
  function playerTable() {
    const f = filter.toLowerCase();
    const list = players.filter((p) => p.name.toLowerCase().includes(f));
    const value = (p) => {
      if (sortKey === "name") return p.name.toLowerCase();
      if (sortKey === "level") return p.level * 1e6 + p.experience;
      if (sortKey === "seen") return p.online ? 1e12 : p.seen;
      if (sortKey === "kd") return p.tot.kills / Math.max(1, p.tot.deaths);
      if (sortKey === "winp") return p.tot.games ? p.tot.wins / p.tot.games : -1;
      return p.tot[sortKey] || 0;
    };
    list.sort((a, b) => {
      const x = value(a), y = value(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return (sortDown ? -c : c) || (b.online - a.online) || b.level - a.level;
    });
    const cols = [["name", "Player", "Jugador"], ["level", "Level", "Nivel"], ["games", "Games", "Partidas"], ["wins", "Wins", "Victorias"],
      ["winp", "Win %", "% vict."], ["kills", "Kills", "Bajas"], ["deaths", "Deaths", "Muertes"], ["kd", "K/D", "K/D"],
      ["medals", "Medals", "Medallas"], ["seen", "Last seen", "Última vez"]];
    const head = cols.map((c) => '<th data-sort="' + c[0] + '"' + (c[0] === sortKey ? ' class="' + (sortDown ? "down" : "up") + '"' : "") + ">" + t(c[1], c[2]) + "</th>").join("");
    const seen = (p) => p.online ? '<span class="online">' + { game: t("In a match", "En partida"), search: t("Searching", "Buscando"),
      lobby: t("In a lobby", "En una sala"), menu: t("Online", "En línea") }[p.status] + "</span>" : p.seen ? ago(p.seen) : "–";
    const body = list.slice(0, shown).map((p) => '<tr data-player="' + esc(p.name) + '"><td>' + esc(p.name) + "</td><td>" + lvl(p.level) + "</td><td>" +
      n(p.tot.games) + "</td><td>" + n(p.tot.wins) + "</td><td>" + pct(p.tot.wins, p.tot.games) + "</td><td>" + n(p.tot.kills) + "</td><td>" +
      n(p.tot.deaths) + "</td><td>" + kd(p.tot.kills, p.tot.deaths) + "</td><td>" + n(p.tot.medals) + "</td><td>" + seen(p) + "</td></tr>").join("");
    $("players").innerHTML = "<thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody>";
    $("found").innerHTML = t(list.length + " players", list.length + " jugadores");
    $("more").hidden = shown >= list.length;
    $("players").querySelectorAll("th").forEach((th) => th.addEventListener("click", () => {
      if (sortKey === th.dataset.sort) sortDown = !sortDown;
      else { sortKey = th.dataset.sort; sortDown = sortKey !== "name"; }
      playerTable();
    }));
    $("players").querySelectorAll("tr[data-player]").forEach((tr) => tr.addEventListener("click", () => card(tr.dataset.player)));
  }

  // one player: every playlist, the medals earned most, their last matches
  function card(name) {
    const p = players.find((x) => x.name === name);
    const el = $("card");
    if (!p) return;
    const ranks = Object.keys(p.ranks || {}).map((id) => Object.assign({ id: id, pl: playlists[id] || { name: id } }, p.ranks[id]))
      .sort((a, b) => b.level - a.level || b.games - a.games);
    const rankRows = ranks.map((r) => "<tr><td>" + esc(r.pl.name) + "</td><td>" + lvl(r.level) + "</td><td>" + n(r.games) + "</td><td>" + n(r.wins) +
      "</td><td>" + pct(r.wins, r.games) + "</td><td>" + n(r.kills) + "</td><td>" + n(r.deaths) + "</td><td>" + kd(r.kills, r.deaths) + "</td><td>" +
      n(r.assists) + "</td><td>" + n(r.headshots) + "</td><td>" + n(r.suicides) + "</td><td>" + n(r.betrayals) + "</td><td>" + n(r.medals) + "</td></tr>").join("");
    const medals = Object.keys(p.medals || {}).map((m) => [MEDALS[m] || [m, m], p.medals[m]]).sort((a, b) => b[1] - a[1]).slice(0, 16)
      .map((m) => '<li><b>' + n(m[1]) + "</b> " + t(esc(m[0][0]), esc(m[0][1])) + "</li>").join("");
    const mine = (data.recent || []).filter((m) => m.rows.some((r) => r.name === name)).slice(0, 10).map((m) => {
      const row = m.rows.find((r) => r.name === name);
      const res = result(m);
      const won = m.teams ? res.winner === row.team : res.winner === row.name;
      return '<tr><td>' + ago(m.ended) + "</td><td>" + esc((playlists[m.playlist] || {}).name || m.playlist) + "</td><td>" + esc(m.title) + "</td><td class=\"" +
        (res.tie ? "" : won ? "won" : "lost") + '">' + (res.tie ? t("Tie", "Empate") : won ? t("Won", "Victoria") : t("Lost", "Derrota")) +
        (row.left ? " · " + t("left", "se fue") : "") + "</td><td>" + n(row.score) + "</td><td>" + (m.stats ? n(row.kills) + " / " + n(row.deaths) : "–") +
        "</td><td>" + lvl(row.level) + (row.xp ? ' <small>' + (row.xp > 0 ? "+" : "") + row.xp + "</small>" : "") + "</td></tr>";
    }).join("");
    el.innerHTML = '<button type="button" class="close" id="card-close" aria-label="Close">&times;</button><h3>' + esc(p.name) + " " + lvl(p.level) + "</h3>" +
      '<p class="sub">' + (p.online ? '<span class="online">' + t("Online", "En línea") + "</span>" : p.seen ? t("Last seen ", "Última vez ") + ago(p.seen) : "") +
      " · " + t(n(p.tot.games) + " games, " + n(p.tot.wins) + " wins", n(p.tot.games) + " partidas, " + n(p.tot.wins) + " victorias") +
      " · " + n(p.tot.kills) + " " + t("kills", "bajas") + ", " + n(p.tot.deaths) + " " + t("deaths", "muertes") + " · " + n(p.experience) + " " + t("experience", "experiencia") + "</p>" +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + t("Playlist", "Lista") + "</th><th>" + t("Level", "Nivel") + "</th><th>" + t("Games", "Partidas") +
      "</th><th>" + t("Wins", "Victorias") + "</th><th>" + t("Win %", "% vict.") + "</th><th>" + t("Kills", "Bajas") + "</th><th>" + t("Deaths", "Muertes") +
      "</th><th>K/D</th><th>" + t("Assists", "Asist.") + "</th><th>" + t("Head shots", "A la cabeza") + "</th><th>" + t("Suicides", "Suicidios") + "</th><th>" +
      t("Betrayals", "Traiciones") + "</th><th>" + t("Medals", "Medallas") + "</th></tr></thead><tbody>" +
      (rankRows || '<tr><td colspan="13" class="empty">' + t("No matchmaking match yet.", "Ninguna partida de matchmaking todavía.") + "</td></tr>") + "</tbody></table></div>" +
      (medals ? '<div class="label">' + t("Medals", "Medallas") + '</div><ul class="medals">' + medals + "</ul>" : "") +
      (mine ? '<div class="label">' + t("Last matches", "Últimas partidas") + '</div><div class="table-wrap"><table class="tbl"><thead><tr><th>' + t("When", "Cuándo") +
        "</th><th>" + t("Playlist", "Lista") + "</th><th>" + t("Game", "Partida") + "</th><th>" + t("Result", "Resultado") + "</th><th>" + t("Score", "Puntos") +
        "</th><th>" + t("Kills / deaths", "Bajas / muertes") + "</th><th>" + t("Level", "Nivel") + "</th></tr></thead><tbody>" + mine + "</tbody></table></div>" : "");
    el.hidden = false;
    history.replaceState(null, "", "#p=" + encodeURIComponent(name));
    $("card-close").addEventListener("click", () => { el.hidden = true; history.replaceState(null, "", location.pathname); });
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // who won a played match: the team with the higher total (a team that all left lost), or the top score
  function result(m) {
    if (m.teams) {
      const score = {}, stayed = {};
      m.rows.forEach((r) => { score[r.team] = (score[r.team] || 0) + r.score; stayed[r.team] = stayed[r.team] || !r.left; });
      const teams = Object.keys(score).map(Number).sort((a, b) => (stayed[b] - stayed[a]) || score[b] - score[a]);
      const tie = teams.length > 1 && score[teams[0]] === score[teams[1]] && stayed[teams[0]] === stayed[teams[1]];
      return { winner: tie ? null : teams[0], tie: tie, score: score };
    }
    const rows = m.rows.slice().sort((a, b) => (a.left - b.left) || b.score - a.score);
    const tie = rows.length > 1 && rows[0].score === rows[1].score && rows[0].left === rows[1].left;
    return { winner: tie ? null : rows[0].name, tie: tie };
  }

  function recent(d) {
    const list = d.recent || [];
    if (!list.length) {
      $("recent").innerHTML = '<p class="empty">' + t("No match played yet.", "Ninguna partida jugada todavía.") + "</p>";
      return;
    }
    $("recent").innerHTML = list.map((m) => {
      const res = result(m), pl = playlists[m.playlist] || {};
      let outcome;
      if (m.teams) {
        outcome = '<span class="red' + (res.winner === 0 ? " won" : "") + '">' + t("Red", "Rojo") + " " + n(res.score[0] || 0) + "</span> – " +
          '<span class="blue' + (res.winner === 1 ? " won" : "") + '">' + t("Blue", "Azul") + " " + n(res.score[1] || 0) + "</span>";
      } else {
        outcome = res.tie ? t("Tie", "Empate") : '<span class="won">' + esc(res.winner) + "</span>";
      }
      const rows = m.rows.slice().sort((a, b) => (m.teams && a.team !== b.team ? a.team - b.team : b.score - a.score)).map((r) =>
        '<tr class="' + (m.teams ? (r.team ? "t-blue" : "t-red") : "") + (r.left ? " left" : "") + '"><td data-player="' + esc(r.name) + '">' + lvl(r.level) + esc(r.name) +
        (r.left ? ' <small>' + t("left", "se fue") + "</small>" : "") + "</td><td>" + n(r.score) + "</td><td>" + (m.stats ? n(r.kills) : "–") + "</td><td>" +
        (m.stats ? n(r.deaths) : "–") + "</td><td>" + (m.stats ? n(r.assists) : "–") + "</td><td>" + (m.stats ? n(r.medals) : "–") + "</td><td>" +
        (r.xp ? (r.xp > 0 ? "+" : "") + r.xp : "–") + "</td></tr>").join("");
      return "<details><summary><span class=\"when\">" + ago(m.ended) + '</span><span class="what">' + esc(pl.name || m.playlist) + " · " + esc(m.title) +
        '</span><span class="outcome">' + outcome + "</span></summary>" +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>' + t("Player", "Jugador") + "</th><th>" + t("Score", "Puntos") + "</th><th>" + t("Kills", "Bajas") +
        "</th><th>" + t("Deaths", "Muertes") + "</th><th>" + t("Assists", "Asist.") + "</th><th>" + t("Medals", "Medallas") + "</th><th>" + t("Experience", "Experiencia") +
        "</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<p class="sub">' + when(m.started) + (m.ended > m.started ? " · " + minutes(m.ended - m.started) : "") + "</p></details>";
    }).join("");
    $("recent").querySelectorAll("td[data-player]").forEach((td) => td.addEventListener("click", () => card(td.dataset.player)));
  }

  function updated(d) {
    const age = now() - d.generated;
    let text = t("Updated ", "Actualizado ") + ago(d.generated);
    if (age > STALE) text = '<span class="warn">' + t("GRAVEMIND LIVE has not reported for " + minutes(age) + ".", "GRAVEMIND LIVE no informa desde hace " + minutes(age) + ".") + "</span>";
    $("updated").innerHTML = text;
  }

  function render(d) {
    const first = !data;
    data = d;
    prepare(d);
    updated(d);
    tiles(d);
    matches(d);
    playlistTable(d);
    top(d);
    playerTable();
    recent(d);
    // stats.html#p=<gamertag> opens that player's card (a link to share)
    if (first && location.hash.startsWith("#p=")) card(decodeURIComponent(location.hash.slice(3)));
  }

  async function load() {
    for (const url of URLS) {
      try {
        const r = await fetch(url, { cache: "no-cache" });
        if (!r.ok) continue;
        render(await r.json());
        return;
      } catch (e) { /* the next one */ }
    }
    if (!data) $("updated").innerHTML = '<span class="warn">' + t("The stats are not available right now.", "Las estadísticas no están disponibles ahora mismo.") + "</span>";
  }

  $("find").addEventListener("input", () => { filter = $("find").value.trim(); shown = PAGE; if (data) playerTable(); });
  $("more").addEventListener("click", () => { shown += PAGE; playerTable(); });
  load();
  setInterval(load, REFRESH);
})();
