// Live Bracket Visualization Component
// Interactive tournament bracket tree with real-time updates

class BracketTree {
  constructor(scheduleData, container) {
    this.scheduleData = scheduleData;
    this.container = container || document.getElementById('bracket-container');
    this.matches = scheduleData.matches || [];
    this.currentRound = this.calculateCurrentRound();
    this.expandedRounds = this.getDefaultExpandedRounds();
    this.onMatchClick = this.onMatchClick.bind(this);
    
    this.init();
  }
  
  init() {
    this.container.innerHTML = '';
    this.renderBracketHeader();
    this.renderBracketTree();
    this.attachEventListeners();
  }
  
  renderBracketHeader() {
    const header = document.createElement('div');
    header.className = 'bracket-header';
    header.innerHTML = `
      <h3>Tournament Bracket - ${this.scheduleData.category} (${this.scheduleData.schema})</h3>
      <div class="bracket-info">
        <span class="team-count">Teams: ${this.scheduleData.team_count}</span>
        <span class="total-rounds">Total Rounds: ${this.scheduleData.total_rounds}</span>
        <span class="current-round">Current Round: R${this.currentRound}</span>
      </div>
    `;
    this.container.appendChild(header);
  }
  
  renderBracketTree() {
    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'bracket-tree-container';
    
    // Group matches by round
    const matchesByRound = this.groupMatchesByRound();
    
    // Render rounds
    const roundsContainer = document.createElement('div');
    roundsContainer.className = 'rounds-container';
    
    Object.keys(matchesByRound).sort().forEach(round => {
      const roundElement = this.createRoundElement(round, matchesByRound[round]);
      roundsContainer.appendChild(roundElement);
    });
    
    bracketContainer.appendChild(roundsContainer);
    this.container.appendChild(bracketContainer);
  }
  
  createRoundElement(round, matches) {
    const roundElement = document.createElement('div');
    roundElement.className = 'bracket-round';
    roundElement.dataset.round = round;
    
    const roundHeader = document.createElement('div');
    roundHeader.className = 'round-header';
    roundHeader.innerHTML = `
      <h4>Round ${round}</h4>
      <button class="expand-btn" onclick="this.toggleRound()">${this.expandedRounds[round] ? '−' : '+'}</button>
    `;
    roundHeader.querySelector('.expand-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleRound(round);
    });
    
    const matchesContainer = document.createElement('div');
    matchesContainer.className = 'matches-container';
    matchesContainer.style.display = this.expandedRounds[round] ? 'block' : 'none';
    
    matches.forEach(match => {
      const matchElement = this.createMatchElement(match);
      matchesContainer.appendChild(matchElement);
    });
    
    roundElement.appendChild(roundHeader);
    roundElement.appendChild(matchesContainer);
    
    return roundElement;
  }
  
  createMatchElement(match) {
    const matchElement = document.createElement('div');
    matchElement.className = `match-node ${match.status}`;
    matchElement.dataset.matchId = match.id;
    
    const matchHeader = document.createElement('div');
    matchHeader.className = 'match-header';
    matchHeader.innerHTML = `
      <h5>Match ${match.id}</h5>
      <span class="match-status ${match.status}">${match.status.toUpperCase()}</span>
    `;
    
    const matchContent = document.createElement('div');
    matchContent.className = 'match-content';
    
    const teamA = this.createTeamElement(match.team_a, 'team-a', match.winner);
    const vs = document.createElement('div');
    vs.className = 'vs';
    vs.textContent = 'vs';
    const teamB = this.createTeamElement(match.team_b, 'team-b', match.winner);
    
    matchContent.appendChild(teamA);
    matchContent.appendChild(vs);
    matchContent.appendChild(teamB);
    
    matchElement.appendChild(matchHeader);
    matchElement.appendChild(matchContent);
    
    matchElement.addEventListener('click', this.onMatchClick);
    
    return matchElement;
  }
  
  createTeamElement(teamName, side, winner) {
    const teamElement = document.createElement('div');
    teamElement.className = `team ${side} ${winner ? 'winner' : ''}`;
    teamElement.textContent = teamName;
    return teamElement;
  }
  
  groupMatchesByRound() {
    const matchesByRound = {};
    
    this.matches.forEach(match => {
      const round = match.round;
      if (!matchesByRound[round]) {
        matchesByRound[round] = [];
      }
      matchesByRound[round].push(match);
    });
    
    return matchesByRound;
  }
  
  calculateCurrentRound() {
    // Find the highest round number from completed matches
    let currentRound = 0;
    this.matches.forEach(match => {
      const roundNum = match.round.replace('r', '') - 0;
      if (roundNum > currentRound) {
        currentRound = roundNum;
      }
    });
    
    return currentRound > 0 ? currentRound : 1;
  }
  
  getDefaultExpandedRounds() {
    const expandedRounds = {};
    // Auto-expand current round and previous rounds
    for (let i = 1; i <= this.scheduleData.total_rounds; i++) {
      expandedRounds[`r${i}`] = i <= this.currentRound;
    }
    return expandedRounds;
  }
  
  toggleRound(round) {
    this.expandedRounds[round] = !this.expandedRounds[round];
    
    const roundElement = this.container.querySelector(`.bracket-round[data-round="${round}"]`);
    if (roundElement) {
      const matchesContainer = roundElement.querySelector('.matches-container');
      if (matchesContainer) {
        matchesContainer.style.display = this.expandedRounds[round] ? 'block' : 'none';
      }
    }
  }
  
  attachEventListeners() {
    // Add event listeners for match interactions
    document.addEventListener('themeChange', () => {
      this.updateTheme();
    });
    
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }
  
  updateTheme() {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    this.container.classList.toggle('dark-theme', isDark);
  }
  
  handleResize() {
    // Handle responsive layout changes
    this.container.classList.toggle('mobile-view', window.innerWidth <= 768);
  }
  
  updateSchedule(newScheduleData) {
    this.scheduleData = newScheduleData;
    this.matches = newScheduleData.matches || [];
    this.currentRound = this.calculateCurrentRound();
    this.updateExpandedRounds();
    this.init();
  }
  
  updateExpandedRounds() {
    const newExpandedRounds = this.getDefaultExpandedRounds();
    Object.keys(this.expandedRounds).forEach(round => {
      this.expandedRounds[round] = newExpandedRounds[round] || false;
    });
  }
  
  onMatchClick(event) {
    const matchElement = event.currentTarget;
    const matchId = matchElement.dataset.matchId;
    
    // Emit event for match selection
    const matchSelectedEvent = new CustomEvent('matchSelected', {
      detail: { matchId, match: this.matches.find(m => m.id === matchId) }
    });
    document.dispatchEvent(matchSelectedEvent);
  }
  
  export() {
    return {
      scheduleData: this.scheduleData,
      expandedRounds: this.expandedRounds,
      currentRound: this.currentRound
    };
  }
  
  import(state) {
    this.scheduleData = state.scheduleData;
    this.matches = this.scheduleData.matches || [];
    this.expandedRounds = state.expandedRounds;
    this.currentRound = state.currentRound || this.calculateCurrentRound();
    this.init();
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BracketTree;
} else {
  window.BracketTree = BracketTree;
}