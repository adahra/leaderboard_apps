// Player Statistics Model
// Represents a single player's performance data

class PlayerStats {
  constructor(data = {}) {
    this.name = data.name || '';
    this.category = data.category || '';
    this.wins = data.wins || 0;
    this.losses = data.losses || 0;
    this.matches = data.matches || 0;
    this.winRate = data.winRate || 0;
    this.matches_played = data.matches_played || [];
    this.rank = data.rank || 0;
    this.streak = data.streak || 0;
    this.lastMatch = data.lastMatch || null;
    this.photo = data.photo || '';
    this.coach = data.coach || '';
  }
  
  get isUndefeated() {
    return this.wins > 0 && this.losses === 0;
  }
  
  get winPercentage() {
    return this.matches > 0 ? (this.wins / this.matches) * 100 : 0;
  }
  
  get isTopPerformer() {
    return this.rank > 0 && this.rank <= 3;
  }
  
  get isNewPlayer() {
    return this.lastMatch && new Date(this.lastMatch) <= new Date(Date.now() - 7 * 4 * 60 * 60 * 1000);
  }
  
  get isInactive() {
    return this.lastMatch && new Date(this.lastMatch) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  
  addMatchResult(match) {
    this.matches++;
    this.matches_played.push(match);
    
    if (match.result === 'win') {
      this.wins++;
      this.streak = this.streak > 0 ? this.streak + 1 : 1;
    } else {
      this.losses++;
      this.streak = this.streak > 0 ? this.streak + 1 : 1;
    }
    
    this.lastMatch = match.date;
    
    // Recalculate win rate
    this.winRate = this.calculateWinRate();
  }
  
  calculateWinRate() {
    return this.matches > 0 ? (this.wins / this.matches) * 100 : 0;
  }
  
  toJSON() {
    return {
      name: this.name,
      category: this.category,
      wins: this.wins,
      losses: this.losses,
      matches: this.matches,
      winRate: this.winRate,
      streak: this.streak,
      isUndefeated: this.isUndefeated,
      isTopPerformer: this.isTopPerformer(),
      isNewPlayer: this.isNewPlayer(),
      isInactive: this.isInactive()
    };
  }
  
  static createFromMatch(match, category) {
    const playerStats = new PlayerStats();
    playerStats.name = match.player;
    playerStats.category = category;
    playerStats.addMatchResult(match);
    return playerStats;
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlayerStats;
} else {
  window.PlayerStats = PlayerStats;
}