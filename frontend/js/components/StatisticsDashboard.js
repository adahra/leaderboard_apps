// Player Statistics Dashboard Component
// Displays player performance metrics and analytics

class StatisticsDashboard {
  constructor(container, scheduleData) {
    this.container = container;
    this.scheduleData = scheduleData;
    this.playerStats = {};
    this.filter = {
      category: null,
      minWins: 0,
      dateRange: { start: null, end: null }
    };
    
    this.init();
  }
  
  init() {
    this.calculatePlayerStats();
    this.render();
    this.attachEventListeners();
  }
  
  calculatePlayerStats() {
    this.playerStats = {};
    
    // Calculate statistics from matches
    this.scheduleData.matches.forEach(match => {
      const teamA = match.team_a;
      const teamB = match.team_b;
      
      if (!this.playerStats[teamA]) {
        this.playerStats[teamA] = {
          name: teamA,
          wins: 0,
          losses: 0,
          matches: 0,
          winRate: 0,
          matches_played: []
        };
      }
      
      if (!this.playerStats[teamB]) {
        this.playerStats[teamB] = {
          name: teamB,
          wins: 0,
          losses: 0,
          matches: 0,
          winRate: 0,
          matches_played: []
        };
      }
      
      this.playerStats[teamA].matches++;
      this.playerStats[teamA].matches_played.push({
        opponent: teamB,
        result: match.winner === 'team_a' ? 'win' : 'loss',
        round: match.round,
        date: match.scheduled_at
      });
      
      this.playerStats[teamB].matches++;
      this.playerStats[teamB].matches_played.push({
        opponent: teamA,
        result: match.winner === 'team_b' ? 'win' : 'loss',
        round: match.round,
        date: match.scheduled_at
      });
      
      // Update win/loss counts
      if (match.winner === 'team_a') {
        this.playerStats[teamA].wins++;
        this.playerStats[teamB].losses++;
      } else if (match.winner === 'team_b') {
        this.playerStats[teamB].wins++;
        this.playerStats[teamA].losses++;
      } else {
        // Draw or no winner
        this.playerStats[teamA].losses++;
        this.playerStats[teamB].losses++;
      }
    });
    
    // Calculate win rates
    Object.keys(this.playerStats).forEach(playerId => {
      const stats = this.playerStats[playerId];
      if (stats.matches > 0) {
        stats.winRate = (stats.wins / stats.matches) * 100;
      }
    });
  }
  
  render() {
    this.container.innerHTML = '';
    
    // Create header
    const header = this.createHeader();
    this.container.appendChild(header);
    
    // Create filters
    const filters = this.createFilters();
    this.container.appendChild(filters);
    
    // Create player statistics table
    const statsTable = this.createPlayerStatsTable();
    this.container.appendChild(statsTable);
    
    // Create detailed view
    const detailedView = this.createDetailedView();
    this.container.appendChild(detailedView);
  }
  
  createHeader() {
    const header = document.createElement('div');
    header.className = 'stats-header';
    header.innerHTML = `
      <h3>Player Statistics</h3>
      <div class="stats-summary">
        <span>Total Players: ${Object.keys(this.playerStats).length}</span>
        <span>Matches Analyzed: ${this.scheduleData.matches.length}</span>
        <span>Winning Rate: ${this.calculateOverallWinRate().toFixed(1)}%</span>
      </div>
    `;
    return header;
  }
  
  createFilters() {
    const filters = document.createElement('div');
    filters.className = 'stats-filters';
    
    // Category filter
    const categoryFilter = document.createElement('select');
    categoryFilter.className = 'filter-select';
    categoryFilter.innerHTML = `
      <option value="">All Categories</option>
      <option value="junior">Junior</option>
      <option value="senior">Senior</option>
    `;
    categoryFilter.addEventListener('change', (e) => {
      this.filter.category = e.target.value;
      this.applyFilters();
    });
    
    // Min wins filter
    const winsFilter = document.createElement('input');
    winsFilter.className = 'filter-input';
    winsFilter.type = 'number';
    winsFilter.placeholder = 'Min wins';
    winsFilter.addEventListener('change', (e) => {
      this.filter.minWins = parseInt(e.target.value) || 0;
      this.applyFilters();
    });
    
    filters.appendChild(categoryFilter);
    filters.appendChild(winsFilter);
    
    return filters;
  }
  
  createPlayerStatsTable() {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'stats-table-container';
    
    const table = document.createElement('table');
    table.className = 'stats-table';
    
    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Player</th>
        <th>Wins</th>
        <th>Losses</th>
        <th>Matches</th>
        <th>Win Rate</th>
        <th>Action</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    const filteredStats = this.getFilteredStats();
    
    filteredStats.forEach(playerStats => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${playerStats.name}</strong></td>
        <td>${playerStats.wins}</td>
        <td>${playerStats.losses}</td>
        <td>${playerStats.matches}</td>
        <td><span class="win-rate ${playerStats.winRate >= 50 ? 'good' : 'poor'}">${playerStats.winRate.toFixed(1)}%</span></td>
        <td><button class="view-details-btn" data-player="${playerStats.name}">View Details</button></td>
      `;
      
      row.querySelector('.view-details-btn').addEventListener('click', (e) => {
        this.showPlayerDetails(playerStats.name);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    return tableContainer;
  }
  
  createDetailedView() {
    const detailedView = document.createElement('div');
    detailedView.className = 'player-details';
    detailedView.id = 'player-details';
    detailedView.style.display = 'none';
    
    return detailedView;
  }
  
  getFilteredStats() {
    let filtered = Object.values(this.playerStats);
    
    if (this.filter.category) {
      filtered = filtered.filter(stats => {
        // Filter based on category logic
        const categoryMap = {
          'junior': ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6', 'Team 7', 'Team 8', 'Team 9', 'Team 10', 'Team 11', 'Team 12', 'Team 13', 'Team 14', 'Team 15', 'Team 16'],
          'senior': ['Team 17', 'Team 18', 'Team 19', 'Team 20', 'Team 21', 'Team 22', 'Team 23', 'Team 24']
        };
        
        const categoryTeams = categoryMap[this.filter.category] || [];
        return categoryTeams.includes(stats.name);
      });
    }
    
    filtered = filtered.filter(stats => stats.wins >= this.filter.minWins);
    
    // Sort by win rate descending
    filtered.sort((a, b) => b.winRate - a.winRate);
    
    return filtered;
  }
  
  calculateOverallWinRate() {
    let totalWins = 0;
    let totalMatches = 0;
    
    Object.values(this.playerStats).forEach(stats => {
      totalWins += stats.wins;
      totalMatches += stats.matches;
    });
    
    return totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
  }
  
  applyFilters() {
    const tableContainer = this.container.querySelector('.stats-table-container');
    if (tableContainer) {
      const table = tableContainer.querySelector('table');
      if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
          // Re-render table with filtered data
          this.container.replaceChild(this.createPlayerStatsTable(), tableContainer);
        }
      }
    }
  }
  
  showPlayerDetails(playerName) {
    const detailsView = this.container.querySelector('#player-details');
    if (detailsView) {
      const playerStats = this.playerStats[playerName];
      
      detailsView.innerHTML = `
        <h4>Details for ${playerStats.name}</h4>
        <div class="player-stats">
          <p><strong>Category:</strong> ${playerName.includes('Team 1') || playerName.includes('Team 2') ? 'Junior' : 'Senior'}</p>
          <p><strong>Record:</strong> ${playerStats.wins}-${playerStats.losses} (${playerStats.winRate.toFixed(1)}%)</p>
          <p><strong>Matches Played:</strong> ${playerStats.matches}</p>
        </div>
        <h5>Match History</h5>
        <table class="history-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Opponent</th>
              <th>Result</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${playerStats.matches_played.map(match => `
              <tr>
                <td>${match.round}</td>
                <td>${match.opponent}</td>
                <td class="result ${match.result}">${match.result}</td>
                <td>${match.date}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      detailsView.style.display = 'block';
    }
  }
  
  attachEventListeners() {
    // Add event listeners for various interactions
    document.addEventListener('themeChange', () => {
      this.updateTheme();
    });
    
    // Add global event listener for category changes
    const categorySelect = this.container.querySelector('.filter-select');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        this.filter.category = e.target.value;
        this.applyFilters();
      });
    }
  }
  
  updateTheme() {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    this.container.classList.toggle('dark-theme', isDark);
  }
  
  export() {
    return {
      playerStats: this.playerStats,
      filter: this.filter
    };
  }
  
  import(state) {
    this.playerStats = state.playerStats;
    this.filter = state.filter;
    this.render();
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatisticsDashboard;
} else {
  window.StatisticsDashboard = StatisticsDashboard;
}