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
