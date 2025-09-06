// =========================
// Constants & Elements
// =========================
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

// Misc controls
document
  .getElementById("reloadTeams")
  .addEventListener("click", () => initTeams());
document
  .getElementById("backHomeFromTeams")
  .addEventListener("click", () => showHome());
document
  .getElementById("refreshLiveNow")
  .addEventListener("click", () => loadLiveNow());

// =========================
// Navigation Helpers
// =========================
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

// =========================
// Data loaders for home sections
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
      card.style.color = team.alternateColor ? `#${team.alternateColor}` : "#000000";

      card.innerHTML = `
        <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
          <img src="${team.logos?.[0]?.href || ""}" alt="${team.displayName}">
          <h4 class="mt-1">${team.displayName}</h4>
          <div class="actions">
            <button class="btn btn-sm btn-light" data-action="roster" data-id="${team.id}">Roster</button>
            <button class="btn btn-sm btn-dark" data-action="schedule" data-id="${team.id}">Schedule</button>
          </div>
        </div>
      `;

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
// Roster / Team Game View
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
        </div>
      </div>
      <div class="mb-3" id="teamGameInfo">
        <p>Loading current game info...</p>
      </div>
      <div class="grid" id="rosterGrid"></div>
    `;
    results.innerHTML = "";
    results.appendChild(wrap);

    // Render roster
    const rosterGrid = document.getElementById("rosterGrid");
    data.athletes.forEach((group) => {
      group.items.forEach((player) => {
        const card = document.createElement("div");
        card.className = "square-card";
        card.innerHTML = `
          <div class="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
            <img src="${player.headshot?.href || ""}" alt="${player.displayName}">
            <h5 class="mt-1">${player.displayName}</h5>
            <p class="mb-1">#${player.jersey || "-"} • ${player.position?.abbreviation || ""}</p>
          </div>
        `;
        rosterGrid.appendChild(card);
      });
    });

    // Load game info for this team
    loadTeamGameInfo(teamId);

  } catch (err) {
    results.innerHTML = `<p class="text-danger">Failed to load roster.</p>`;
    console.error(err);
  }
}

async function loadTeamGameInfo(teamId) {
  const gameInfo = document.getElementById("teamGameInfo");
  try {
    const res = await fetch(SCOREBOARD_URL);
    const data = await res.json();
    const events = data.events || [];

    // Look for a live or upcoming game involving this team
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
          <p>Next game: <strong>${away.team.displayName} @ ${home.team.displayName}</strong></p>
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
    (data.events || []).forEach((game) => {
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
// Player View
// =========================
async function loadPlayer(playerId, season = new Date().getFullYear()) {
  results.innerHTML = "<p>Loading player stats...</p>";
  try {
    const profileRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${playerId}`);
    const profileData = await profileRes.json();

    const statsRes = await fetch(`https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}/stats?season=${season}`);
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
            .map((y) => `<option value="${y}" ${y == season ? "selected" : ""}>${y}</option>`)
            .join("")}
        </select>
        <h3>Stats</h3>
        <div class="stats-list">
          ${
            stats.length > 0
              ? stats.map((cat) => `
                  <h5>${cat.displayName}</h5>
                  ${cat.stats.map((s) => `<p><strong>${s.displayName}:</strong> ${s.displayValue || "-"}</p>`).join("")}
                `).join("")
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

// =========================
// Game View
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
              ? data.scoringPlays.map((play) => `<div class="border-bottom py-2">${play.period.displayValue} ${play.clock.displayValue} – ${play.text}</div>`).join("")
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
// Live Scores full view
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
// Search
// =========================
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
      const t = teams.find((x) => x.team.displayName.toLowerCase().includes(term));
      if (t) {
        await loadRosterView(t.team.id, t.team.displayName);
        return;
      }

      // Search across rosters for player
      for (const x of teams) {
        const rosterRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${x.team.id}/roster`);
        const rosterData = await rosterRes.json();
        for (const group of rosterData.athletes) {
          const player = group.items.find((p) => p.displayName.toLowerCase().includes(term));
          if (player) {
            await loadPlayer(player.id);
            return;
          }
        }
      }

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
  return str.replace(/[&<>"']/g, (s) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
  );
}
function escapeQuotes(str) {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}
