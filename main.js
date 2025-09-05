const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
const results = document.getElementById("results");

const TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";
const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

// Load all teams
async function loadTeams() {
  results.innerHTML = "<p>Loading teams...</p>";
  const res = await fetch(TEAMS_URL);
  const data = await res.json();
  const teams = data.sports[0].leagues[0].teams;

  results.innerHTML = "";
  teams.forEach(t => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.backgroundColor = `#${t.team.color}`;
    card.style.color = `#${t.team.alternateColor}`;
    card.innerHTML = `
      <img src="${t.team.logos[0].href}" alt="${t.team.displayName}">
      <h3>${t.team.displayName}</h3>
      <button onclick="loadRoster(${t.team.id})">View Roster</button>
      <button onclick="loadSchedule(${t.team.id})">View Schedule</button>
    `;
    results.appendChild(card);
  });
}

// Load roster for a team
async function loadRoster(teamId) {
  results.innerHTML = "<p>Loading roster...</p>";
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`);
  const data = await res.json();

  results.innerHTML = "";
  data.athletes.forEach(group => {
    group.items.forEach(player => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${player.headshot?.href || ''}" alt="${player.displayName}">
        <h3>${player.displayName}</h3>
        <p>#${player.jersey} - ${player.position.abbreviation}</p>
        <button onclick="loadPlayer(${player.id})">View Stats</button>
      `;
      results.appendChild(card);
    });
  });
}

// Load individual player stats
async function loadPlayer(playerId) {
  results.innerHTML = "<p>Loading player stats...</p>";
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${playerId}`);
  const data = await res.json();

  const stats = data.stats?.[0]?.splits?.categories || [];

  results.innerHTML = `
    <div class="card">
      <h2>${data.athlete.displayName}</h2>
      <img src="${data.athlete.headshot.href}" alt="${data.athlete.displayName}">
      <h3>Stats This Season</h3>
      <ul>
        ${stats.map(cat =>
          cat.stats.map(s => `<li>${s.displayName}: ${s.displayValue}</li>`).join("")
        ).join("")}
      </ul>
    </div>
  `;
}

// Load team schedule
async function loadSchedule(teamId) {
  results.innerHTML = "<p>Loading schedule...</p>";
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule`);
  const data = await res.json();

  results.innerHTML = "";
  data.events.forEach(game => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${game.name}</h3>
      <p>${new Date(game.date).toLocaleString()}</p>
      <button onclick="loadGame(${game.id})">View Game</button>
    `;
    results.appendChild(card);
  });
}

// Load live scores
async function loadScores() {
  results.innerHTML = "<p>Loading live scores...</p>";
  const res = await fetch(SCOREBOARD_URL);
  const data = await res.json();

  results.innerHTML = "";
  data.events.forEach(game => {
    const comp = game.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === "home");
    const away = comp.competitors.find(c => c.homeAway === "away");

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${away.team.displayName} @ ${home.team.displayName}</h3>
      <p>${away.score} - ${home.score}</p>
      <p>Status: ${game.status.type.detail}</p>
      <button onclick="loadGame(${game.id})">View Game</button>
    `;
    results.appendChild(card);
  });
}

// Load detailed game summary
async function loadGame(gameId) {
  results.innerHTML = "<p>Loading game stats...</p>";
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`);
  const data = await res.json();

  const competition = data.header.competitions[0];
  const home = competition.competitors.find(c => c.homeAway === "home");
  const away = competition.competitors.find(c => c.homeAway === "away");

  results.innerHTML = `
    <div class="card">
      <h2>${away.team.displayName} @ ${home.team.displayName}</h2>
      <p>${away.score} - ${home.score}</p>
      <h3>Scoring Plays</h3>
      <ul>
        ${data.scoringPlays.map(play =>
          `<li>${play.period.displayValue} ${play.clock.displayValue} - ${play.text}</li>`
        ).join("")}
      </ul>
    </div>
  `;
}

// Search team by name
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const searchTerm = input.value.toLowerCase();

  const res = await fetch(TEAMS_URL);
  const data = await res.json();
  const teams = data.sports[0].leagues[0].teams;
  const team = teams.find(t => t.team.displayName.toLowerCase().includes(searchTerm));

  if (team) {
    loadRoster(team.team.id);
  } else {
    results.innerHTML = `<p>No team found for "${searchTerm}".</p>`;
  }
});

// Auto-refresh scores every 60s if on scores page
setInterval(() => {
  if (results.innerHTML.includes("Status:")) {
    loadScores();
  }
}, 60000);

// Home Reset
function goHome() {
    function goHome() {
  results.innerHTML = "<h2 class='text-center'>Welcome to NFL Tracker</h2><p class='text-center'>Search for teams, players, schedules, or check live scores.</p>";
}
}

// Search teams and players
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const searchTerm = input.value.toLowerCase();

  const res = await fetch(TEAMS_URL);
  const data = await res.json();
  const teams = data.sports[0].leagues[0].teams;

  // Search for team
  const team = teams.find(t => t.team.displayName.toLowerCase().includes(searchTerm));
  if (team) {
    loadRoster(team.team.id);
    return;
  }

  // Search across rosters for player
  for (const t of teams) {
    const rosterRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${t.team.id}/roster`);
    const rosterData = await rosterRes.json();
    for (const group of rosterData.athletes) {
      const player = group.items.find(p => p.displayName.toLowerCase().includes(searchTerm));
      if (player) {
        loadPlayer(player.id);
        return;
      }
    }
  }

  results.innerHTML = `<p>No team or player found for "${searchTerm}".</p>`;
});

// Player stats across seasons
async function loadPlayer(playerId, season = 2025) {
  results.innerHTML = "<p>Loading player stats...</p>";
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${playerId}?season=${season}`);
  const data = await res.json();
  const stats = data.stats?.[0]?.splits?.categories || [];

  results.innerHTML = `
    <div class="card p-3">
      <button class="btn btn-secondary mb-2" onclick="goHome()">⬅ Back</button>
      <h2 class="text-center">${data.athlete.displayName}</h2>
      <img class="mx-auto d-block" src="${data.athlete.headshot.href}" alt="${data.athlete.displayName}" height="120">
      <label for="seasonSelect">Choose Season:</label>
      <select id="seasonSelect" class="form-select mb-3" onchange="loadPlayer(${playerId}, this.value)">
        ${[2025,2024,2023,2022,2021,2020].map(y => 
          `<option value="${y}" ${y==season?'selected':''}>${y}</option>`
        ).join("")}
      </select>
      <h3>Stats</h3>
      <div class="stats-list">
        ${stats.map(cat => cat.stats.map(s => 
          `<p><strong>${s.displayName}:</strong> ${s.displayValue || '-'}</p>`
        ).join("")).join("")}
      </div>
    </div>
  `;
}

// Game Summary
async function loadGame(gameId) {
  results.innerHTML = "<p>Loading game stats...</p>";
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`);
  const data = await res.json();

  const comp = data.header.competitions[0];
  const home = comp.competitors.find(c => c.homeAway === "home");
  const away = comp.competitors.find(c => c.homeAway === "away");

  results.innerHTML = `
    <div class="card text-center p-3">
      <button class="btn btn-secondary mb-2" onclick="loadScores()">⬅ Back</button>
      <h2>${away.team.displayName} @ ${home.team.displayName}</h2>
      <h3>${away.score} - ${home.score}</h3>
      <p><em>${data.header.competitions[0].status.type.detail}</em></p>
      <h4>Scoring Plays</h4>
      <div>
        ${data.scoringPlays.map(play =>
          `<div class="border-bottom py-2">${play.period.displayValue} ${play.clock.displayValue} – ${play.text}</div>`
        ).join("") || "<p>No scoring plays available.</p>"}
      </div>
    </div>
  `;
}

// Auto updates
let liveGameInterval = null;

async function loadLiveGame(gameId) {
  if (liveGameInterval) clearInterval(liveGameInterval);

  async function update() {
    await loadGame(gameId);
  }

  update(); // first load
  liveGameInterval = setInterval(update, 30000); // refresh every 30s
}

