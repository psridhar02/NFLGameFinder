const TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";
const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

const results = document.getElementById("results");
const dynamicView = document.getElementById("dynamicView");

const teamsGrid = document.getElementById("teamsGrid");
const teamsEmpty = document.getElementById("teamsEmpty");
const liveNowGrid = document.getElementById("liveNowGrid");
const liveNowEmpty = document.getElementById("liveNowEmpty");

// Navbar links
const brandLink = document.getElementById("brandLink");
const logoLink = document.getElementById("logoLink");
const teamsLink = document.getElementById("teamsLink");
const gamesLink = document.getElementById("gamesLink");
const liveScoresLink = document.getElementById("liveScoresLink");

// Forms
const navSearchForm = document.getElementById("searchForm");
const navSearchInput = document.getElementById("searchInput");
const mainSearchForm = document.getElementById("mainSearchForm");
const mainSearchInput = document.getElementById("mainSearchInput");

// other
document
  .getElementById("reloadTeams")
  .addEventListener("click", () => initTeams());
document
  .getElementById("backHomeFromTeams")
  .addEventListener("click", () => showHome());
document
  .getElementById("refreshLiveNow")
  .addEventListener("click", () => loadLiveNow());

// --- CHANGED/ADDED --- global state variables to manage back/restore
let previousView = null;
let currentTeamId = null;
let teamsSnapshotHTML = null; // to restore teams grid when needed

// Nav helpers
function showHome() {
  dynamicView.classList.add("d-none");
  document.getElementById("home").scrollIntoView({ behavior: "smooth" });
}

brandLink.addEventListener("click", () => showHome());
logoLink.addEventListener("click", (e) => {
  e.preventDefault();
  showHome();
});

teamsLink.addEventListener("click", async () => {
  await initTeams();
  document.getElementById("teams").scrollIntoView({ behavior: "smooth" });
});

gamesLink.addEventListener("click", async () => {
  await loadLiveNow();
  document.getElementById("liveNow").scrollIntoView({ behavior: "smooth" });
});

liveScoresLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await loadScoresView();
});

// Data loaders for home sections
async function initTeams() {
  teamsGrid.innerHTML = `<div class="col-12 text-center text-muted">Loading teams...</div>`;
  teamsEmpty.textContent = "";
  try {
    const res = await fetch(TEAMS_URL);
    const data = await res.json();
    const teams = data.sports[0].leagues[0].teams;

    teamsGrid.innerHTML = "";
    teams.forEach(({ team }) => {
      const card = document.createElement("div");
      card.className = "square-card";
      card.setAttribute("data-team-id", team.id); // --- ADDED for filtering/restore ---
      card.style.backgroundColor = team.color ? `#${team.color}` : "#ffffff";
      card.style.color = team.alternateColor
        ? `#${team.alternateColor}`
        : "#000000";

      card.innerHTML = `
        <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
          <img src="${team.logos?.[0]?.href || ""}" alt="${team.displayName}">
          <h4 class="mt-1">${team.displayName}</h4>
          <div class="actions">
            <button class="btn btn-sm btn-light" data-action="roster" data-id="${
              team.id
            }">Roster</button>
            <button class="btn btn-sm btn-dark" data-action="schedule" data-id="${
              team.id
            }">Schedule</button>
          </div>
        </div>
      `;

      card.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");

        if (action === "roster") {
          // When user clicks ROSTER from the teams grid, show only that team's card
          showOnlyTeamCard(id);
          loadRosterView(id, team.displayName);
        }
        if (action === "schedule") {
          showOnlyTeamCard(id);
          loadScheduleView(id, team.displayName);
        }
      });

      teamsGrid.appendChild(card);
    });

    if (!teams.length) teamsEmpty.textContent = "No teams available.";
    // Save snapshot of full teams HTML so we can restore after a search/detail
    teamsSnapshotHTML = teamsGrid.innerHTML;
  } catch (err) {
    teamsGrid.innerHTML = "";
    teamsEmpty.textContent = "Failed to load teams.";
    console.error(err);
  }
}

// --- CHANGED/ADDED --- helper to show only a single team card and hide others
function showOnlyTeamCard(teamId) {
  if (!teamsSnapshotHTML) {
    teamsSnapshotHTML = teamsGrid.innerHTML;
  }
  const cards = Array.from(teamsGrid.children);
  cards.forEach((c) => {
    if (c.getAttribute("data-team-id") === String(teamId)) {
      c.style.display = ""; // show
    } else {
      c.style.display = "none"; // hide
    }
  });
  // scroll to teams section
  document.getElementById("teams").scrollIntoView({ behavior: "smooth" });
}

// --- CHANGED/ADDED --- restore the full teams grid
function restoreAllTeamCards() {
  if (teamsSnapshotHTML) {
    // restore current DOM (we kept same nodes, just hid them — so restore display)
    const cards = Array.from(teamsGrid.children);
    cards.forEach((c) => {
      c.style.display = "";
    });
    document.getElementById("teams").scrollIntoView({ behavior: "smooth" });
  }
}

async function loadLiveNow() {
  liveNowGrid.innerHTML = `<div class="col-12 text-center text-muted">Loading live games...</div>`;
  liveNowEmpty.textContent = "";
  try {
    const res = await fetch(SCOREBOARD_URL);
    const data = await res.json();
    const events = data.events || [];
    const live = events.filter((e) => e.status?.type?.state === "in");

    liveNowGrid.innerHTML = "";
    if (!live.length) {
      liveNowEmpty.textContent = "No games are live right now.";
      return;
    }

    live.forEach((game) => {
      const comp = game.competitions[0];
      const home = comp.competitors.find((c) => c.homeAway === "home");
      const away = comp.competitors.find((c) => c.homeAway === "away");

      const card = document.createElement("div");
      card.className = "square-card";
      card.innerHTML = `
        <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
          <h5 class="mb-1">${away.team.displayName} @ ${home.team.displayName}</h5>
          <p class="mb-1">${away.score} - ${home.score}</p>
          <small class="text-muted">${game.status.type.detail}</small>
          <div class="actions">
            <button class="btn btn-sm btn-primary" data-id="${game.id}">View Game</button>
          </div>
        </div>
      `;
      card
        .querySelector("button")
        .addEventListener("click", () => loadGameView(game.id));
      liveNowGrid.appendChild(card);
    });
  } catch (err) {
    liveNowGrid.innerHTML = "";
    liveNowEmpty.textContent = "Failed to load live games.";
    console.error(err);
  }
}

// Init home loads
initTeams();
loadLiveNow();

function showDynamic() {
  dynamicView.classList.remove("d-none");
  dynamicView.scrollIntoView({ behavior: "smooth" });
}

// Roster and team game view
async function loadRosterView(teamId, teamName = "Team") {
  // --- CHANGED --- save previous view state for goBack
  previousView = "teams";
  currentTeamId = teamId;

  results.innerHTML = `<p>Loading roster...</p>`;
  showDynamic();
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`
    );
    const data = await res.json();

    // build roster view with tabs and a schedule button beside back
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <button class="btn btn-secondary me-2" id="rosterBackBtn">⬅ Back</button>
            <button class="btn btn-outline-dark" id="viewScheduleBtn">View Schedule</button>
          </div>
          <h2 class="mb-0">${teamName} – Roster</h2>
      </div>
      
      <div class="mb-3" id="teamGameInfo">
          <p>Loading current game info...</p>
      </div>
        
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
            <a class="nav-link active" id="offenseTab" href="#" data-tab="offense">Offense</a>
        </li>
        
        <li class="nav-item">
            <a class="nav-link" id="defenseTab" href="#" data-tab="defense">Defense</a>
        </li>
      </ul>
      
      <div id="rosterGrid" class="grid"></div>
`;

    results.innerHTML = "";
    results.appendChild(wrap);

    // Attach back & schedule handlers
    document.getElementById("rosterBackBtn").addEventListener("click", () => {
      // restore team cards and go to teams section
      restoreAllTeamCards();
      showHome();
    });

    document.getElementById("viewScheduleBtn").addEventListener("click", () =>
      loadScheduleView(teamId, teamName)
    );

    // Tab switching
    const offenseTab = document.getElementById("offenseTab");
    const defenseTab = document.getElementById("defenseTab");
    function setActiveTab(tabName) {
      offenseTab.classList.toggle("active", tabName === "offense");
      defenseTab.classList.toggle("active", tabName === "defense");
      // render players for that tab
      renderRosterSplit(tabName, data);
    }
    offenseTab.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveTab("offense");
    });
    defenseTab.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveTab("defense");
    });

    // initial render — use helper that splits roster & orders players
    setActiveTab("offense");

    loadTeamGameInfo(teamId);
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load roster.</p>`;
    console.error(err);
  }
}

// --- CHANGED/ADDED --- helper to render roster tabs and ordering by "popularity"
// Note: popularity heuristic: players with headshot first, then by jersey number (asc).
// If you have a real popularity field, replace the sorting function accordingly.
function renderRosterSplit(tabName, rosterData) {
  const rosterGrid = document.getElementById("rosterGrid");
  rosterGrid.innerHTML = "";

  // gather all players into a flat array (your API uses groups)
  const players = [];
  (rosterData.athletes || []).forEach((group) => {
    (group.items || []).forEach((p) => players.push(p));
  });

  // use your splitRoster function to partition
  const { offense, defense } = splitRoster(players);

  const chosen = tabName === "offense" ? offense : defense;

  // ordering: players with headshot first, then by jersey number (numeric)
  chosen.sort((a, b) => {
    const aHas = a.headshot?.href ? 0 : 1;
    const bHas = b.headshot?.href ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    const an = Number(a.jersey || 9999);
    const bn = Number(b.jersey || 9999);
    return an - bn;
  });

  if (!chosen.length) {
    rosterGrid.innerHTML = `<p class="text-muted">No players in this group.</p>`;
    return;
  }

  chosen.forEach((player) => {
    const card = document.createElement("div");
    card.className = "square-card";
    card.innerHTML = `
      <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
        ${player.headshot?.href ? `<img src="${player.headshot.href}" alt="${player.displayName}">` : ""}
        <h5 class="mt-1">${player.displayName}</h5>
        <p class="mb-1">#${player.jersey || "-"} • ${
      player.position?.abbreviation || ""
    }</p>
        <div class="actions">
          <button class="btn btn-sm btn-primary" data-player-id="${player.id}">View Player</button>
        </div>
      </div>
    `;
    card
      .querySelector("button")
      .addEventListener("click", () => loadPlayer(player.id));
    rosterGrid.appendChild(card);
  });
}

async function loadTeamGameInfo(teamId) {
  const gameInfo = document.getElementById("teamGameInfo");
  try {
    const res = await fetch(SCOREBOARD_URL);
    const data = await res.json();
    const events = data.events || [];

    // Look for a live or upcoming game involving whatever team
    const game = events.find((e) =>
      e.competitions[0].competitors.some((c) => c.team.id == teamId)
    );

    if (!game) {
      gameInfo.innerHTML = `<p class="text-muted">No games found for this team right now.</p>`;
      return;
    }

    const comp = game.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");

    if (game.status.type.state === "in") {
      // Live game
      gameInfo.innerHTML = `
        <div class="alert alert-success text-center">
          <h4>Current Game</h4>
          <p>${away.team.displayName} @ ${home.team.displayName}</p>
          <p><strong>${away.score} - ${home.score}</strong></p>
          <small>${game.status.type.detail}</small>
        </div>
      `;
    } else if (game.status.type.state === "pre") {
      // Next scheduled game
      gameInfo.innerHTML = `
        <div class="alert alert-info text-center">
          <p>No game is happening at the moment.</p>
          <p>Next game: <strong>${away.team.displayName} @ ${
        home.team.displayName
      }</strong></p>
          <p>${new Date(game.date).toLocaleString()}</p>
        </div>
      `;
    } else {
      // Game is over or final
      gameInfo.innerHTML = `
        <div class="alert alert-secondary text-center">
          <p>Last game finished:</p>
          <p>${away.team.displayName} @ ${home.team.displayName}</p>
          <p><strong>${away.score} - ${home.score}</strong></p>
          <small>${game.status.type.detail}</small>
        </div>
      `;
    }
  } catch (err) {
    gameInfo.innerHTML = `<p class="text-danger">Failed to load game info.</p>`;
    console.error(err);
  }
}

async function loadScheduleView(teamId, teamName = "Team") {
  // --- CHANGED --- remember previous view
  previousView = "teams";
  currentTeamId = teamId;

  results.innerHTML = `<p>Loading schedule...</p>`;
  showDynamic();
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule`
    );
    const data = await res.json();

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button class="btn btn-secondary" id="scheduleBackBtn">⬅ Back</button>
        </div>
        <h2 class="mb-0">${teamName} – Schedule</h2>
      </div>
      <div class="grid" id="scheduleGrid"></div>
    `;
    results.innerHTML = "";
    results.appendChild(wrap);

    document.getElementById("scheduleBackBtn").addEventListener("click", () => {
      restoreAllTeamCards();
      showHome();
    });

    const grid = document.getElementById("scheduleGrid");
    (data.events || []).forEach((game) => {
      const card = document.createElement("div");
      card.className = "square-card";
      card.innerHTML = `
        <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
          <h5 class="mb-1">${game.name}</h5>
          <p class="mb-1">${new Date(game.date).toLocaleString()}</p>
          <div class="actions">
            <button class="btn btn-sm btn-primary" data-id="${
              game.id
            }">View Game</button>
          </div>
        </div>
      `;
      card
        .querySelector("button")
        .addEventListener("click", () => loadGameView(game.id));
      grid.appendChild(card);
    });
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load schedule.</p>`;
    console.error(err);
  }
}

// Player View
async function loadPlayer(playerId, season = new Date().getFullYear()) {
  results.innerHTML = "<p>Loading player stats...</p>";
  try {
    const profileRes = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${playerId}`
    );
    const profileData = await profileRes.json();

    const statsRes = await fetch(
      `https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}/stats?season=${season}`
    );
    const statsData = await statsRes.json();

    const athlete = profileData.athlete || {};
    const stats = statsData.splits?.categories || [];

    results.innerHTML = `
      <div class="card p-3">
        <button class="btn btn-secondary mb-2" onclick="history.back()">⬅ Back</button>
        <h2 class="text-center">${athlete.displayName || "Unknown Player"}</h2>
        ${
          athlete.headshot?.href
            ? `<img class="mx-auto d-block" src="${athlete.headshot.href}" alt="${athlete.displayName}" height="120">`
            : ""
        }
        <label for="seasonSelect">Choose Season:</label>
        <select id="seasonSelect" class="form-select mb-3" onchange="loadPlayer(${playerId}, this.value)">
          ${[2025, 2024, 2023, 2022, 2021, 2020]
            .map(
              (y) =>
                `<option value="${y}" ${
                  y == season ? "selected" : ""
                }>${y}</option>`
            )
            .join("")}
        </select>
        <h3>Stats</h3>
        <div class="stats-list">
          ${
            stats.length > 0
              ? stats
                  .map(
                    (cat) => `
                  <h5>${cat.displayName}</h5>
                  ${cat.stats
                    .map(
                      (s) =>
                        `<p><strong>${s.displayName}:</strong> ${
                          s.displayValue || "-"
                        }</p>`
                    )
                    .join("")}
                `
                  )
                  .join("")
              : "<p>No stats available for this season.</p>"
          }
        </div>
      </div>
    `;
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Error loading player stats.</p>`;
    console.error(err);
  }
}

// Game View
async function loadGameView(gameId) {
  results.innerHTML = `<p>Loading game...</p>`;
  showDynamic();
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`
    );
    const data = await res.json();

    const comp = data.header?.competitions?.[0];
    if (!comp) {
      results.innerHTML = `<p class="text-muted">No game details available.</p>`;
      return;
    }
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");

    results.innerHTML = `
      <div class="card text-center p-3">
        <div class="d-flex justify-content-start">
          <button class="btn btn-secondary mb-2" onclick="history.back()">⬅ Back</button>
        </div>
        <h2>${away.team.displayName} @ ${home.team.displayName}</h2>
        <h3>${away.score} - ${home.score}</h3>
        <p><em>${comp.status?.type?.detail || ""}</em></p>
        <h4>Scoring Plays</h4>
        <div>
          ${
            (data.scoringPlays || []).length
              ? data.scoringPlays
                  .map(
                    (play) =>
                      `<div class="border-bottom py-2">${play.period.displayValue} ${play.clock.displayValue} – ${play.text}</div>`
                  )
                  .join("")
              : "<p class='text-muted'>No scoring plays available.</p>"
          }
        </div>
      </div>
    `;
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load game.</p>`;
    console.error(err);
  }
}

// Live Scores full view
async function loadScoresView() {
  results.innerHTML = `<p>Loading live scores...</p>`;
  showDynamic();
  try {
    const res = await fetch(SCOREBOARD_URL);
    const data = await res.json();

    const frag = document.createDocumentFragment();
    const header = document.createElement("div");
    header.className = "d-flex justify-content-between align-items-center mb-3";
    header.innerHTML = `
      <h2 class="mb-0">Live Scores</h2>
      <div>
        <button class="btn btn-secondary me-2" onclick="showHome()">⬅ Back</button>
        <button class="btn btn-outline-primary" id="refreshScores">Refresh</button>
      </div>
    `;
    frag.appendChild(header);

    const container = document.createElement("div");
    container.className = "grid";
    (data.events || []).forEach((game) => {
      const comp = game.competitions[0];
      const home = comp.competitors.find((c) => c.homeAway === "home");
      const away = comp.competitors.find((c) => c.homeAway === "away");

      const card = document.createElement("div");
      card.className = "square-card";
      card.innerHTML = `
        <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
          <h5 class="mb-1">${away.team.displayName} @ ${home.team.displayName}</h5>
          <p class="mb-1">${away.score} - ${home.score}</p>
          <small class="text-muted">${game.status.type.detail}</small>
          <div class="actions">
            <button class="btn btn-sm btn-primary" data-id="${game.id}">View Game</button>
          </div>
        </div>
      `;
      card
        .querySelector("button")
        .addEventListener("click", () => loadGameView(game.id));
      container.appendChild(card);
    });
    frag.appendChild(container);

    results.innerHTML = "";
    results.appendChild(frag);

    document
      .getElementById("refreshScores")
      .addEventListener("click", loadScoresView);
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load live scores.</p>`;
    console.error(err);
  }
}

// Search
[
  [navSearchForm, navSearchInput],
  [mainSearchForm, mainSearchInput],
].forEach(([form, input]) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const term = input.value.trim().toLowerCase();
    if (!term) return;

    try {
      const res = await fetch(TEAMS_URL);
      const data = await res.json();
      const teams = data.sports[0].leagues[0].teams;

      // Try team match
      const t = teams.find((x) =>
        x.team.displayName.toLowerCase().includes(term)
      );
      if (t) {
        // --- CHANGED --- show only the matched team's card in the grid and then open roster
        showOnlyTeamCard(t.team.id);
        await loadRosterView(t.team.id, t.team.displayName);
        return;
      }

      // Search across rosters for player
      for (const x of teams) {
        const rosterRes = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${x.team.id}/roster`
        );
        const rosterData = await rosterRes.json();
        for (const group of rosterData.athletes) {
          const player = group.items.find((p) =>
            p.displayName.toLowerCase().includes(term)
          );
          if (player) {
            await loadPlayer(player.id);
            return;
          }
        }
      }

      results.innerHTML = `<p>No team or player found for "${escapeHtml(
        term
      )}".</p>`;
      showDynamic();
    } catch (err) {
      console.error(err);
    }
  });
});

// go back
function goBack() {
  if (previousView === "teams") {
    // restore teams and scroll
    restoreAllTeamCards();
    document.getElementById("teams").scrollIntoView({ behavior: "smooth" });
  } else if (previousView === "teamRoster") {
    // show that team's roster again
    if (currentTeamId) loadRosterView(currentTeamId);
  } else if (previousView === "teamSchedule") {
    if (currentTeamId) loadScheduleView(currentTeamId);
  } else {
    // default fallback
    showHome();
  }
}

// split the rosters
function splitRoster(players) {
  const offensePositions = [
    "QB",
    "RB",
    "WR",
    "TE",
    "OL",
    "C",
    "T",
    "G",
    "K",
    "P",
  ];
  const defensePositions = [
    "DL",
    "DE",
    "DT",
    "LB",
    "MLB",
    "OLB",
    "ILB",
    "CB",
    "S",
    "FS",
    "SS",
  ];

  let offense = [];
  let defense = [];

  players.forEach((p) => {
    if (offensePositions.includes(p.position.abbreviation)) offense.push(p);
    else if (defensePositions.includes(p.position.abbreviation))
      defense.push(p);
  });

  // Sort (QB first, then WR, RB, etc.)
  const positionOrder = ["QB", "WR", "RB", "TE", "OL"];
  offense.sort(
    (a, b) =>
      positionOrder.indexOf(a.position.abbreviation) -
      positionOrder.indexOf(b.position.abbreviation)
  );

  return { offense, defense };
}

// extra stuff
function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        s
      ])
  );
}
function escapeQuotes(str) {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}
