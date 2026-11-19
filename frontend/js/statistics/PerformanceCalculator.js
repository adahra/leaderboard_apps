// Performance Calculator
// Calculates player statistics from match results

class PerformanceCalculator {
  constructor(matchResults = []) {
    this.matchResults = Array.isArray(matchResults) ? matchResults : [];
    this.processedResults = this.processMatchResults();
  }
  
  processMatchResults() {
    const processed = {};
    
    this.matchResults.forEach(match => {
      const { team_a, team_b, winner } = match;
      
      // Process team A
      if (!processed[team_a]) {
        processed[team_a] = {
          name: team_a,
          wins: 0,
          losses: 0,
          matches: 0,
          winRate: 0,
          matches_played: [],
          category: this.determineCategory(team_a)
        };
      }
      
      // Process team B
      if (!processed[team_b]) {
        processed[team_b] = {
          name: team_b,
          wins: 0,
          losses: 0,
          matches: 0,
          winRate: 0,
          matches_played: [],
          category: this.determineCategory(team_b)
        };
      }
      
      // Update match counts
      processed[team_a].matches++;
      processed[team_b].matches++;
      
      // Record match details
      const matchRecord = {
        opponent: team_b,
        result: winner === 'team_a' ? 'win' : (winner === 'team_b' ? 'loss' : 'draw'),
        round: match.round || 'unknown',
        date: match.scheduled_at || new Date().toISOString(),
        score: match.score_a && match.score_b ? `${match.score_a}-${match.score_b}` : null
      };
      
      processed[team_a].matches_played.push(matchRecord);
      processed[team_b].matches_played.push({
        ...matchRecord,
        opponent: team_a,
        result: winner === 'team_b' ? 'win' : (winner === 'team_a' ? 'loss' : 'draw')
      });
      
      // Update win/loss counts
      if (winner === 'team_a') {
        processed[team_a].wins++;
        processed[team_b].losses++;
      } else if (winner === 'team_b') {
        processed[team_b].wins++;
        processed[team_a].losses++;
      } else {
        // Draw or no winner
        processed[team_a].losses++;
        processed[team_b].losses++;
      }
    });
    
    // Calculate win rates
    Object.keys(processed).forEach(playerId => {
      const stats = processed[playerId];
      stats.winRate = this.calculateWinRate(stats);
    });
    
    return processed;
  }
  
  calculateWinRate(stats) {
    return stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
  }
  
  determineCategory(teamName) {
    // Simple category determination based on team name pattern
    // In a real implementation, this would come from the category mapping
    if (teamName.startsWith('Team 1') || teamName.startsWith('Team 2') || teamName.startsWith('Team 3') || teamName.startsWith('Team 4')) {
      return 'junior';
    } else if (teamName.startsWith('Team 5') || teamName.startsWith('Team 6') || teamName.startsWith('Team 7') || teamName.startsWith('Team 8')) {
      return 'senior';
    }
    return 'unknown';
  }
  
  calculateForPlayer(playerId) {
    const stats = this.processedResults[playerId];
    if (!stats) {
      return null;
    }
    
    return {
      name: stats.name,
      category: stats.category,
      wins: stats.wins,
      losses: stats.losses,
      matches: stats.matches,
      winRate: stats.winRate,
      matches_played: stats.matches_played,
      isUndefeated: stats.wins > 0 && stats.losses === 0,
      streak: this.calculateStreak(stats.name),
      lastMatch: stats.matches_played.length > 0 ? stats.matches_played[stats.matches_played.length - 1].date : null,
      rank: this.calculateRank(stats.name)
    };
  }
  
  calculateAllPlayers() {
    return Object.values(this.processedResults).map(stats => this.calculateForPlayer(stats.name));
  }
  
  calculateStreak(playerName) {
    const playerStats = this.processedResults[playerName];
    if (!playerStats) return 0;
    
    let currentStreak = 0;
    const sortedMatches = [...playerStats.matches_played].reverse(); // Most recent first
    
    for (const match of sortedMatches) {
      if (match.result === 'win') {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return currentStreak;
  }
  
  calculateRank(playerName) {
    const allStats = this.calculateAllPlayers();
    const playerIndex = allStats.findIndex(stats => stats.name === playerName);
    if (playerIndex === -1) return 0;
    
    return playerIndex + 1;
  }
  
  getPlayersByCategory(category) {
    return this.calculateAllPlayers().filter(stats => stats.category === category);
  }
  
  getPlayersByWinRate(minWinRate) {
    return this.calculateAllPlayers().filter(stats => stats.winRate >= minWinRate);
  }
  
  export() {
    return {
      matchResults: this.matchResults,
      processedResults: this.processedResults
    };
  }
  
  import(state) {
    this.matchResults = state.matchResults || [];
    this.processedResults = state.processedResults || {};
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceCalculator;
} else {
  window.PerformanceCalculator = PerformanceCalculator;
}