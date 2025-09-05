const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
const results = document.getElementById("results");

const TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";
const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

// Loading all the teams
async function loadTeams() {
    results.innerHTML = "<p>Loading teams...</p>"
    const res = await fetch(TEAMS_URL);
    const data = await res.json();
    const teams = data.sports[0].leagues[0].teams;

    results.innerHTML = "";
    teams.forEach(t => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src= "${t.team.logos[0].href}" alt="${t.team.displayName}">
            <h3>${t.team.displayName}</h3>
            <button onclick="loadRoster(${t.team.id})>View Roster</button>
            <button onclick="loadSchedule(${t.team.id})>View Schedule</button>
        `;
        results.appendChild(card);
    });
}

// Load rosters for each team
async function loadRoster(teamId) {
    results.innerHTML = "<p>Loading team roster...</p>";
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
            `;
            results.appendChild(card);
        });
    });
}