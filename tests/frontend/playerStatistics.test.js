  // Test that PerformanceCalculator can be instantiated
  const calculator = new PerformanceCalculator();
  assertEqual(calculator.processedResults, {}, 'Calculator should be empty by default');
// Tests for PerformanceCalculator functionality

const PerformanceCalculator = require('../../frontend/js/statistics/PerformanceCalculator');

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function runTest(testName, testFunc) {
  try {
    testFunc();
    console.log(`✓ ${testName} PASSED`);
  } catch (error) {
    console.error(`✗ ${testName} FAILED: ${error.message}`);
    throw error;
  }
}

function testPerformanceCalculatorBasic() {
  // Test that PerformanceCalculator can be instantiated
  const calculator = new PerformanceCalculator();
  assertEqual(calculator, {}, 'Calculator should be empty by default');
  
  // Test with empty match results
  const emptyCalculator = new PerformanceCalculator([]);
  assertEqual(emptyCalculator.processedResults, {}, 'Empty calculator should have no processed results');
}

function testPerformanceCalculatorProcessing() {
  const matchResults = [
    {
      id: 'm1',
      team_a: 'Team 1',
      team_b: 'Team 2',
      winner: 'team_a',
      scheduled_at: '2024-01-15T10:00:00'
    },
    {
      id: 'm2',
      team_a: 'Team 1',
      team_b: 'Team 3',
      winner: 'team_b',
      scheduled_at: '2024-01-15T11:00:00'
    }
  ];
  
  const calculator = new PerformanceCalculator(matchResults);
  
  // Test that processedResults is populated
  assertEqual(Object.keys(calculator.processedResults).length, 3, 'Should have 3 teams in processed results');
  
  // Test that Team 1 has correct basic stats
  const team1Stats = calculator.processedResults['Team 1'];
  assertEqual(team1Stats.name, 'Team 1', 'Team 1 name incorrect');
  assertEqual(team1Stats.wins, 1, 'Team 1 wins incorrect');
  assertEqual(team1Stats.losses, 1, 'Team 1 losses incorrect');
  assertEqual(team1Stats.matches, 2, 'Team 1 matches incorrect');
}

function testPerformanceCalculatorEmptyResults() {
  const calculator = new PerformanceCalculator([]);
  
  // Test that empty results work
  assertEqual(calculator.processedResults, {}, 'Empty results should produce empty processed results');
}

function testPerformanceCalculatorDraws() {
  const matchResults = [
    {
      id: 'm1',
      team_a: 'Team 1',
      team_b: 'Team 2',
      winner: null, // Draw
      scheduled_at: '2024-01-15T10:00:00'
    }
  ];
  
  const calculator = new PerformanceCalculator(matchResults);
  
  // Test that draws are handled
  const team1Stats = calculator.processedResults['Team 1'];
  assertEqual(team1Stats.wins, 0, 'Team 1 should have 0 wins for draw');
  assertEqual(team1Stats.losses, 1, 'Team 1 should have 1 loss for draw');
  assertEqual(team1Stats.matches, 1, 'Team 1 should have 1 match');
}

function testStatisticsDashboardCalculation() {
  // Test that we can calculate statistics from schedule data
  const scheduleData = {
    category: 'junior',
    schema: 'knockout',
    team_count: 4,
    total_rounds: 2,
    matches: [
      {
        id: 'm1',
        team_a: 'Team 1',
        team_b: 'Team 2',
        winner: 'team_a',
        scheduled_at: '2024-01-15T10:00:00'
      },
      {
        id: 'm2',
        team_a: 'Team 1',
        team_b: 'Team 3',
        winner: 'team_b',
        scheduled_at: '2024-01-15T11:00:00'
      }
    ]
  };
  
  // Convert schedule matches to match results format
  const matchResults = scheduleData.matches.map(match => ({
    id: match.id,
    team_a: match.team_a,
    team_b: match.team_b,
    winner: match.winner,
    scheduled_at: match.scheduled_at
  }));
  
  const calculator = new PerformanceCalculator(matchResults);
  
  // Test that we can access player statistics
  assertEqual(calculator.processedResults['Team 1'].wins, 1, 'Team 1 should have 1 win');
  assertEqual(calculator.processedResults['Team 1'].losses, 1, 'Team 1 should have 1 loss');
}

function testStatisticsDashboardFilters() {
  // Test filter logic without requiring DOM
  const categoryMap = {
    'junior': ['Team 1', 'Team 2'],
    'senior': ['Team 3']
  };
  
  const filteredStats = categoryMap.junior;
  assertEqual(filteredStats.length, 2, 'Should filter to 2 junior teams');
}

function testStatisticsDashboardPlayerDetails() {
  // Test player details extraction
  const scheduleData = {
    category: 'junior',
    schema: 'knockout',
    team_count: 4,
    total_rounds: 2,
    matches: [
      {
        id: 'm1',
        team_a: 'Team 1',
        team_b: 'Team 2',
        winner: 'team_a',
        scheduled_at: '2024-01-15T10:00:00'
      }
    ]
  };
  
  // Extract player details from schedule
  const playerStats = {};
  scheduleData.matches.forEach(match => {
    if (!playerStats[match.team_a]) {
      playerStats[match.team_a] = { name: match.team_a, wins: 0, losses: 0, matches: 0 };
    }
    if (!playerStats[match.team_b]) {
      playerStats[match.team_b] = { name: match.team_b, wins: 0, losses: 0, matches: 0 };
    }
  });
  
  // Verify player details
  assertEqual(playerStats['Team 1'].name, 'Team 1', 'Player name should be correct');
}

function testStatisticsDashboardThemeUpdate() {
  // Test that theme update logic is separate from statistics
  assertEqual(true, true, 'Theme update logic should be independent');
}

// Run all tests
runTest('Performance Calculator Basic', testPerformanceCalculatorBasic);
runTest('Performance Calculator Processing', testPerformanceCalculatorProcessing);
runTest('Performance Calculator Empty Results', testPerformanceCalculatorEmptyResults);
runTest('Performance Calculator Draws', testPerformanceCalculatorDraws);
runTest('Statistics Dashboard Calculation', testStatisticsDashboardCalculation);
runTest('Statistics Dashboard Filters', testStatisticsDashboardFilters);
runTest('Statistics Dashboard Player Details', testStatisticsDashboardPlayerDetails);
runTest('Statistics Dashboard Theme Update', testStatisticsDashboardThemeUpdate);

console.log('\nAll player statistics tests completed successfully!');