// Individual Match Node Component
// Represents a single match in the tournament bracket

class MatchNode {
  constructor(matchData, container) {
    this.matchData = matchData;
    this.container = container;
    this.element = null;
    this.isExpanded = false;
    
    this.init();
  }
  
  init() {
    this.createElement();
    this.attachEventListeners();
  }
  
  createElement() {
    this.element = document.createElement('div');
    this.element.className = 'match-node';
    this.element.dataset.matchId = this.matchData.id;
    this.element.dataset.round = this.matchData.round;
    
    // Match header with status
    const header = document.createElement('div');
    header.className = 'match-header';
    header.innerHTML = `
      <h6>Match ${this.matchData.id}</h6>
      <span class="status-badge status-${this.matchData.status}">
        ${this.matchData.status}
      </span>
      <button class="expand-btn" title="Show details">▼</button>
    `;
    
    // Match content with teams
    const content = document.createElement('div');
    content.className = 'match-content';
    
    const teamsContainer = document.createElement('div');
    teamsContainer.className = 'teams-container';
    
    const teamA = this.createTeamDisplay(this.matchData.team_a, 'A', this.matchData.winner === 'team_a');
    const teamB = this.createTeamDisplay(this.matchData.team_b, 'B', this.matchData.winner === 'team_b');
    
    teamsContainer.appendChild(teamA);
    teamsContainer.appendChild(this.createVSElement());
    teamsContainer.appendChild(teamB);
    
    // Match details (hidden by default)
    const details = this.createMatchDetails();
    
    // Assemble match element
    this.element.appendChild(header);
    this.element.appendChild(content);
    this.element.appendChild(details);
    
    if (this.container) {
      this.container.appendChild(this.element);
    }
  }
  
  createTeamDisplay(teamName, side, isWinner) {
    const teamElement = document.createElement('div');
    teamElement.className = `team-display team-${side} ${isWinner ? 'winner' : ''}`;
    
    const teamInfo = document.createElement('div');
    teamInfo.className = 'team-info';
    
    const teamNameElement = document.createElement('span');
    teamNameElement.className = 'team-name';
    teamNameElement.textContent = teamName || 'TBD';
    
    const seedElement = document.createElement('span');
    seedElement.className = 'team-seed';
    seedElement.textContent = this.getSeedForTeam(teamName, side);
    
    teamInfo.appendChild(seedElement);
    teamInfo.appendChild(teamNameElement);
    
    teamElement.appendChild(teamInfo);
    return teamElement;
  }
  
  createVSElement() {
    const vsElement = document.createElement('div');
    vsElement.className = 'vs-element';
    vsElement.innerHTML = '<span>VS</span>';
    return vsElement;
  }
  
  createMatchDetails() {
    const details = document.createElement('div');
    details.className = 'match-details';
    details.style.display = 'none';
    
    const detailsContent = document.createElement('div');
    detailsContent.className = 'details-content';
    
    // Add match-specific details based on status
    if (this.matchData.status === 'completed') {
      detailsContent.innerHTML = `
        <div class="result-info">
          <span class="winner">Winner: ${this.getWinnerTeam()}</span>
          <span class="score">Score: ${this.matchData.score_a || 0} - ${this.matchData.score_b || 0}</span>
        </div>
        <div class="match-meta">
          <span>Court: ${this.matchData.court || 'TBA'}</span>
          <span>Started: ${this.matchData.scheduled_at || 'TBA'}</span>
        </div>
      `;
    } else if (this.matchData.status === 'in_progress') {
      detailsContent.innerHTML = `
        <div class="live-info">
          <span class="live-indicator">🔴 LIVE</span>
          <span class="time-remaining">Time: ${this.getTimeRemaining()}</span>
        </div>
        <div class="participants">
          <span class="current-score">${this.matchData.current_score_a || 0} - ${this.matchData.current_score_b || 0}</span>
        </div>
      `;
    } else {
      detailsContent.innerHTML = `
        <div class="scheduled-info">
          <span>Court: ${this.matchData.court || 'TBA'}</span>
          <span>Starts: ${this.matchData.scheduled_at || 'TBA'}</span>
          <span>Players: ${this.matchData.p1 || 'TBD'} vs ${this.matchData.p2 || 'TBD'}</span>
        </div>
      `;
    }
    
    details.appendChild(detailsContent);
    
    // Add expand/collapse toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'details-toggle';
    toggleBtn.textContent = 'Details';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDetails();
    });
    
    details.appendChild(toggleBtn);
    
    return details;
  }
  
  toggleDetails() {
    const details = this.element.querySelector('.match-details');
    if (details) {
      const isVisible = details.style.display !== 'none';
      details.style.display = isVisible ? 'none' : 'block';
      
      const toggleBtn = details.querySelector('.details-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = isVisible ? 'Details' : 'Hide';
      }
    }
  }
  
  createTeamDisplay(teamName, side, isWinner) {
    const teamElement = document.createElement('div');
    teamElement.className = `team-display team-${side} ${isWinner ? 'winner' : ''}`;
    
    const teamInfo = document.createElement('div');
    teamInfo.className = 'team-info';
    
    const teamNameElement = document.createElement('span');
    teamNameElement.className = 'team-name';
    teamNameElement.textContent = teamName || 'TBD';
    
    const seedElement = document.createElement('span');
    seedElement.className = 'team-seed';
    seedElement.textContent = this.getSeedForTeam(teamName, side);
    
    teamInfo.appendChild(seedElement);
    teamInfo.appendChild(teamNameElement);
    
    teamElement.appendChild(teamInfo);
    return teamElement;
  }
  
  getSeedForTeam(teamName, side) {
    // Mock seed calculation - in real implementation would be based on tournament seeding
    return teamName ? `Seed ${Math.floor(Math.random() * 8) + 1}` : 'TBD';
  }
  
  getWinnerTeam() {
    return this.matchData.winner === 'team_a' ? this.matchData.team_a : this.matchData.team_b;
  }
  
  getTimeRemaining() {
    if (this.matchData.status === 'in_progress') {
      const matchTime = this.matchData.scheduled_at ? new Date(this.matchData.scheduled_at) : new Date();
      const now = new Date();
      const diff = matchTime - now;
      
      if (diff > 0) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m remaining`;
      }
    }
    return 'Unknown';
  }
  
  updateMatchData(newData) {
    this.matchData = { ...this.matchData, ...newData };
    this.updateDisplay();
  }
  
  updateDisplay() {
    // Update the match element to reflect new data
    const statusElement = this.element.querySelector('.status-badge');
    if (statusElement) {
      statusElement.className = `status-badge status-${this.matchData.status}`;
      statusElement.textContent = this.matchData.status.toUpperCase();
    }
  }
  
  attachEventListeners() {
    this.element.addEventListener('click', (e) => {
      if (!e.target.classList.contains('details-toggle')) {
        this.toggleDetails();
      }
    });
  }
  
  export() {
    return {
      matchData: this.matchData,
      isExpanded: this.isExpanded
    };
  }
  
  import(state) {
    this.matchData = state.matchData;
    this.isExpanded = state.isExpanded || false;
    this.init();
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MatchNode;
} else {
  window.MatchNode = MatchNode;
}