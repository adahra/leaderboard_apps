// Match Phase Features Initializer
// Initializes BracketTree and StatisticsDashboard components

// Import components (using ES6 module pattern for compatibility)
let BracketTree = null;
let StatisticsDashboard = null;
let PerformanceCalculator = null;

// Check if modules are available in the current environment
if (typeof window !== 'undefined') {
  BracketTree = window.BracketTree || window.BracketTree;
  StatisticsDashboard = window.StatisticsDashboard || window.StatisticsDashboard;
  PerformanceCalculator = window.PerformanceCalculator || window.PerformanceCalculator;
} else if (typeof module !== 'undefined') {
  BracketTree = require('./components/BracketTree');
  StatisticsDashboard = require('./components/StatisticsDashboard');
  PerformanceCalculator = require('./statistics/PerformanceCalculator');
}

let bracketTreeInstance = null;
let statisticsDashboardInstance = null;

function initializeMatchPhaseFeatures() {
  try {
    // Get the main container for bracket visualization
    const bracketContainer = document.getElementById('bracket-container');
    if (!bracketContainer) {
      console.warn('Bracket container not found');
      return;
    }
    
    // Initialize BracketTree component
    if (BracketTree && typeof BracketTree === 'function') {
      bracketTreeInstance = new BracketTree(window.CURRENT_SCHEDULE, bracketContainer);
      console.log('BracketTree component initialized successfully');
    } else {
      console.error('BracketTree component not available');
    }
    
    // Initialize StatisticsDashboard component
    if (StatisticsDashboard && typeof StatisticsDashboard === 'function') {
      const statsContainer = document.getElementById('stats-container');
      if (statsContainer) {
        statisticsDashboardInstance = new StatisticsDashboard(statsContainer, window.CURRENT_SCHEDULE);
        console.log('StatisticsDashboard component initialized successfully');
      } else {
        console.warn('Stats container not found');
      }
    } else {
      console.error('StatisticsDashboard component not available');
    }
    
    // Setup event listeners for component interactions
    setupComponentEventListeners();
    
    // Initialize performance calculator if available
    if (PerformanceCalculator && typeof PerformanceCalculator === 'function') {
      const calculator = new PerformanceCalculator();
      console.log('PerformanceCalculator initialized successfully');
    }
    
  } catch (error) {
    console.error('Error initializing Match Phase Features:', error);
  }
}

function setupComponentEventListeners() {
  // Listen for theme changes
  document.addEventListener('themeChange', (event) => {
    if (bracketTreeInstance) {
      bracketTreeInstance.updateTheme();
    }
    if (statisticsDashboardInstance) {
      statisticsDashboardInstance.updateTheme();
    }
  });
  
  // Listen for schedule updates
  document.addEventListener('scheduleUpdated', (event) => {
    const newSchedule = event.detail.schedule;
    if (bracketTreeInstance && newSchedule) {
      bracketTreeInstance.updateSchedule(newSchedule);
    }
    if (statisticsDashboardInstance && newSchedule) {
      statisticsDashboardInstance.updateSchedule(newSchedule);
    }
  });
  
  // Listen for player selection events
  document.addEventListener('playerSelected', (event) => {
    const { playerName } = event.detail;
    if (statisticsDashboardInstance) {
      statisticsDashboardInstance.showPlayerDetails(playerName);
    }
  });
  
  // Listen for bracket interactions
  document.addEventListener('matchSelected', (event) => {
    const { matchId } = event.detail;
    console.log('Match selected:', matchId);
    // Handle match selection logic here
  });
}

function updateSchedule(newSchedule) {
  if (bracketTreeInstance && newSchedule) {
    bracketTreeInstance.updateSchedule(newSchedule);
  }
  
  if (statisticsDashboardInstance && newSchedule) {
    statisticsDashboardInstance.updateSchedule(newSchedule);
  }
  
  // Update global schedule variable
  window.CURRENT_SCHEDULE = newSchedule;
}

function getBracketTreeInstance() {
  return bracketTreeInstance;
}

function getStatisticsDashboardInstance() {
  return statisticsDashboardInstance;
}

function exportMatchPhaseFeaturesState() {
  return {
    bracketTree: bracketTreeInstance ? bracketTreeInstance.export() : null,
    statisticsDashboard: statisticsDashboardInstance ? statisticsDashboardInstance.export() : null
  };
}

function importMatchPhaseFeaturesState(state) {
  if (state.bracketTree && bracketTreeInstance) {
    bracketTreeInstance.import(state.bracketTree);
  }
  
  if (state.statisticsDashboard && statisticsDashboardInstance) {
    statisticsDashboardInstance.import(state.statisticsDashboard);
  }
}

// Auto-initialize when DOM is ready
function autoInitialize() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeMatchPhaseFeatures();
  } else {
    document.addEventListener('DOMContentLoaded', initializeMatchPhaseFeatures);
  }
}

// Public API
const MatchPhaseFeatures = {
  initialize: initializeMatchPhaseFeatures,
  updateSchedule: updateSchedule,
  getBracketTree: getBracketTreeInstance,
  getStatisticsDashboard: getStatisticsDashboardInstance,
  export: exportMatchPhaseFeaturesState,
  import: importMatchPhaseFeaturesState,
  autoInitialize: autoInitialize
};

// Initialize automatically on module load
autoInitialize();

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MatchPhaseFeatures;
} else {
  window.MatchPhaseFeatures = MatchPhaseFeatures;
  window.MPF = MatchPhaseFeatures; // Short alias
}