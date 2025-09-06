// =========================
// Constants & Elements
// =========================
const TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";
const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

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

// Misc controls
document.getElementById("reloadTeams").addEventListener("click", () => initTeams());
document.getElementById("backHomeFromTeams").addEventListener("click", () => showHome());
document.getElementById("refreshLiveNow").addEventListener("click", () => loadLiveNow());

// =========================
// Navigation Helpers
// =========================
function showHome() {
  // Hide dynamic view, show main sections
  dynamicView.classList.add("d-none");
  document.getElementById("home").scrollIntoView({ behavior: "smooth" });
}

brandLink.addEventListener("click", (e) => {
  // normal anchor handles scroll; also ensure sections visible
  showHome();
});

logoLink.addEventListener("click", (e) => {
  e.preventDefault();
  showHome();
});

teamsLink.addEventListener("click", async (e) => {
  // scroll to teams and ensure they're loaded
  await initTeams();
  document.getElementById("teams").scrollIntoView({ behavior: "smooth" });
});

gamesLink.addEventListener("click", async (e) => {
  await loadLiveNow();
  document.getElementById("liveNow").scrollIntoView({ behavior: "smooth" });
});

liveScoresLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await loadScoresView(); // full live scores view into dynamic area
});

// =========================
//// Data loaders for home sections
// =========================
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
      card.style.backgroundColor = team.color ? `#${team.color}` : "#ffffff";
      // ensure readable text
      card.style.color = team.alternateColor ? `#${team.alternateColor}` : "#000000";
      card.innerHTML = `
        <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
          <img src="${team.logos?.[0]?.href || ''}" alt="${team.displayName}">
          <h4 class="mt-1">${team.displayName}</h4>
          <div class="actions">
            <button class="btn btn-sm btn-light" data-action="roster" data-id="${team.id}">Roster</button>
            <button class="btn btn-sm btn-dark" data-action="schedule" data-id="${team.id}">Schedule</button>
          </div>
        </div>
      `;
      // delegate clicks
      card.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        if (action === "roster") loadRosterView(id, team.displayName);
        if (action === "schedule") loadScheduleView(id, team.displayName);
      });
      teamsGrid.appendChild(card);
    });

    if (!teams.length) teamsEmpty.textContent = "No teams available.";
  } catch (err) {
    teamsGrid.innerHTML = "";
    teamsEmpty.textContent = "Failed to load teams.";
    console.error(err);
  }
}

async function loadLiveNow() {
  liveNowGrid.innerHTML = `<div class="col-12 text-center text-muted">Loading live games...</div>`;
  liveNowEmpty.textContent = "";
  try {
    const res = await fetch(SCOREBOARD_URL);
    const data = await res.json();
    const events = data.events || [];

    // Filter to just "in-progress" (state === "in")
    const live = events.filter(e => e.status?.type?.state === "in");

    liveNowGrid.innerHTML = "";
    if (!live.length) {
      liveNowEmpty.textContent = "No games are live right now.";
      return;
    }

    live.forEach(game => {
      const comp = game.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === "home");
      const away = comp.competitors.find(c => c.homeAway === "away");

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
      card.querySelector("button").addEventListener("click", () => loadGameView(game.id));
      liveNowGrid.appendChild(card);
    });
  } catch (err) {
    liveNowGrid.innerHTML = "";
    liveNowEmpty.textContent = "Failed to load live games.";
    console.error(err);
  }
}

// Initial home loads
initTeams();
loadLiveNow();

// =========================
// Shared dynamic view toggler
// =========================
function showDynamic() {
  dynamicView.classList.remove("d-none");
  dynamicView.scrollIntoView({ behavior: "smooth" });
}

// =========================
// Roster / Schedule Views (square cards as requested)
// =========================
async function loadRosterView(teamId, teamName = "Team") {
  results.innerHTML = `<p>Loading roster...</p>`;
  showDynamic();
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`);
    const data = await res.json();

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="mb-0">${teamName} – Roster</h2>
        <div>
          <button class="btn btn-secondary me-2" onclick="history.back()">⬅ Back</button>
          <button class="btn btn-outline-primary" onclick="loadScheduleView(${teamId}, '${escapeQuotes(teamName)}')">View Schedule</button>
        </div>
      </div>
      <div class="grid" id="rosterGrid"></div>
    `;
    results.innerHTML = "";
    results.appendChild(wrap);

    const rosterGrid = document.getElementById("rosterGrid");
    data.athletes.forEach(group => {
      group.items.forEach(player => {
        const card = document.createElement("div");
        card.className = "square-card";
        card.innerHTML = `
          <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
            <img src="${player.headshot?.href || ''}" alt="${player.displayName}">
            <h5 class="mt-1">${player.displayName}</h5>
            <p class="mb-1">#${player.jersey || '-'} • ${player.position?.abbreviation || ''}</p>
            <div class="actions">
              <button class="btn btn-sm btn-dark" data-id="${player.id}">View Stats</button>
            </div>
          </div>
        `;
        card.querySelector("button").addEventListener("click", () => loadPlayerView(player.id));
        rosterGrid.appendChild(card);
      });
    });
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load roster.</p>`;
    console.error(err);
  }
}

async function loadScheduleView(teamId, teamName = "Team") {
  results.innerHTML = `<p>Loading schedule...</p>`;
  showDynamic();
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule`);
    const data = await res.json();

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="mb-0">${teamName} – Schedule</h2>
        <div>
          <button class="btn btn-secondary" onclick="history.back()">⬅ Back</button>
        </div>
      </div>
      <div class="grid" id="scheduleGrid"></div>
    `;
    results.innerHTML = "";
    results.appendChild(wrap);

    const grid = document.getElementById("scheduleGrid");
    (data.events || []).forEach(game => {
      const card = document.createElement("div");
      card.className = "square-card";
      card.innerHTML = `
        <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
          <h5 class="mb-1">${game.name}</h5>
          <p class="mb-1">${new Date(game.date).toLocaleString()}</p>
          <div class="actions">
            <button class="btn btn-sm btn-primary" data-id="${game.id}">View Game</button>
          </div>
        </div>
      `;
      card.querySelector("button").addEventListener("click", () => loadGameView(game.id));
      grid.appendChild(card);
    });
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load schedule.</p>`;
    console.error(err);
  }
}

// =========================
// Player View (fixed, season selector + back)
// =========================
async function loadPlayerView(playerId, season = new Date().getFullYear()) {
  results.innerHTML = `<p>Loading player stats...</p>`;
  showDynamic();
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${playerId}?season=${season}`);
    const data = await res.json();

    const stats = data.stats?.[0]?.splits?.categories || [];
    const seasons = [2025, 2024, 2023, 2022, 2021, 2020];

    results.innerHTML = `
      <div class="card p-3">
        <div class="d-flex justify-content-between align-items-center">
          <button class="btn btn-secondary mb-2" onclick="history.back()">⬅ Back</button>
          <div></div>
        </div>
        <h2 class="text-center">${data.athlete.displayName}</h2>
        <img class="mx-auto d-block my-2" src="${data.athlete.headshot?.href || ''}" alt="${data.athlete.displayName}" height="120">
        <label for="seasonSelect" class="form-label mt-2">Choose Season:</label>
        <select id="seasonSelect" class="form-select mb-3">
          ${seasons.map(y => `<option value="${y}" ${y == season ? 'selected' : ''}>${y}</option>`).join("")}
        </select>
        <h3>Stats</h3>
        <div class="stats-list">
          ${
            stats.length
              ? stats.map(cat => cat.stats.map(s => 
                  `<p><strong>${s.displayName}:</strong> ${s.displayValue || '-'}</p>`
                ).join("")).join("")
              : "<p class='text-muted'>No stats available for this season.</p>"
          }
        </div>
      </div>
    `;

    document.getElementById("seasonSelect").addEventListener("change", (e) => {
      loadPlayerView(playerId, e.target.value);
    });
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load player stats.</p>`;
    console.error(err);
  }
}

// =========================
// Game View (+ back)
// =========================
async function loadGameView(gameId) {
  results.innerHTML = `<p>Loading game...</p>`;
  showDynamic();
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`);
    const data = await res.json();

    const comp = data.header?.competitions?.[0];
    if (!comp) {
      results.innerHTML = `<p class="text-muted">No game details available.</p>`;
      return;
    }
    const home = comp.competitors.find(c => c.homeAway === "home");
    const away = comp.competitors.find(c => c.homeAway === "away");

    results.innerHTML = `
      <div class="card text-center p-3">
        <div class="d-flex justify-content-start">
          <button class="btn btn-secondary mb-2" onclick="history.back()">⬅ Back</button>
        </div>
        <h2>${away.team.displayName} @ ${home.team.displayName}</h2>
        <h3>${away.score} - ${home.score}</h3>
        <p><em>${comp.status?.type?.detail || ''}</em></p>
        <h4>Scoring Plays</h4>
        <div>
          ${
            (data.scoringPlays || []).length
              ? data.scoringPlays.map(play =>
                  `<div class="border-bottom py-2">${play.period.displayValue} ${play.clock.displayValue} – ${play.text}</div>`
                ).join("")
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

// =========================
// Live Scores full view (from navbar)
// =========================
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
    (data.events || []).forEach(game => {
      const comp = game.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === "home");
      const away = comp.competitors.find(c => c.homeAway === "away");

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
      card.querySelector("button").addEventListener("click", () => loadGameView(game.id));
      container.appendChild(card);
    });
    frag.appendChild(container);

    results.innerHTML = "";
    results.appendChild(frag);

    document.getElementById("refreshScores").addEventListener("click", loadScoresView);
  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load live scores.</p>`;
    console.error(err);
  }
}

// =========================
// Search (navbar + main search) — team or player
// =========================
[ [navSearchForm, navSearchInput], [mainSearchForm, mainSearchInput] ].forEach(([form, input]) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const term = input.value.trim().toLowerCase();
    if (!term) return;

    try {
      const res = await fetch(TEAMS_URL);
      const data = await res.json();
      const teams = data.sports[0].leagues[0].teams;

      // Try team match
      const t = teams.find(x => x.team.displayName.toLowerCase().includes(term));
      if (t) {
        await loadRosterView(t.team.id, t.team.displayName);
        return;
      }

      // Search across rosters for player
      for (const x of teams) {
        const rosterRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${x.team.id}/roster`);
        const rosterData = await rosterRes.json();
        for (const group of rosterData.athletes) {
          const player = group.items.find(p => p.displayName.toLowerCase().includes(term));
          if (player) {
            await loadPlayerView(player.id);
            return;
          }
        }
      }

      // Nothing found
      results.innerHTML = `<p>No team or player found for "${escapeHtml(term)}".</p>`;
      showDynamic();
    } catch (err) {
      console.error(err);
    }
  });
});

// =========================
// Utilities
// =========================
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function escapeQuotes(str) {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}
