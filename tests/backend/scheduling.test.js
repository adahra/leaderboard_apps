// Tournament Scheduling System Tests
// Tests for knockout and double elimination bracket generation

const schedulingController = require('../../backend/controllers/schedulingController');

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

function generateMockCategory(schema, key) {
  return { key, schema };
}

function testKnockoutScheduleGeneration() {
  const category = generateMockCategory('knockout', 'senior');
  const result = schedulingController.generateSchedule(category, 8);
  
  // Test basic properties
  assertEqual(result.category, 'senior', 'Category mismatch');
  assertEqual(result.schema, 'knockout', 'Schema mismatch');
  assertEqual(result.team_count, 8, 'Team count mismatch');
  assertEqual(result.total_rounds, 3, 'Round count mismatch');
  
  // Test match count (8 teams = 7 matches: 4+2+1)
  assertEqual(result.matches.length, 7, 'Match count mismatch for knockout bracket');
  
  // Test all matches have required properties
  result.matches.forEach((match, index) => {
    assertEqual(typeof match.id, 'string', `Match ${index} ID type mismatch`);
    assertEqual(typeof match.round, 'string', `Match ${index} round type mismatch`);
    assertEqual(typeof match.team_a, 'string', `Match ${index} team_a type mismatch`);
    assertEqual(typeof match.team_b, 'string', `Match ${index} team_b type mismatch`);
    assertEqual(typeof match.status, 'string', `Match ${index} status type mismatch`);
    assertEqual(typeof match.court, 'string', `Match ${index} court type mismatch`);
  });
  
  // Test match progression (check for bye handling)
  const teamMatches = {};
  result.matches.forEach(match => {
    if (!teamMatches[match.team_a]) teamMatches[match.team_a] = 0;
    if (!teamMatches[match.team_b]) teamMatches[match.team_b] = 0;
    teamMatches[match.team_a]++;
    teamMatches[match.team_b]++;
  });
  
  const teamsWithMultipleMatches = Object.values(teamMatches).filter(count => count > 1);
  assertEqual(teamsWithMultipleMatches.length > 0, true, 'No team plays multiple matches');
}

function testDoubleEliminationScheduleGeneration() {
  const category = generateMockCategory('double_elimination', 'junior');
  const result = schedulingController.generateSchedule(category, 16);
  
  // Test basic properties
  assertEqual(result.category, 'junior', 'Category mismatch');
  assertEqual(result.schema, 'double_elimination', 'Schema mismatch');
  assertEqual(result.team_count, 16, 'Team count mismatch');
  
  // Test match count (16 teams in double elimination)
  // Approx 30 matches for 16-team double elimination
  assertEqual(result.matches.length >= 25 && result.matches.length <= 35, true, 'Match count out of expected range for double elimination');
  
  // Test all matches have required properties
  result.matches.forEach((match, index) => {
    assertEqual(typeof match.id, 'string', `Match ${index} ID type mismatch`);
    assertEqual(typeof match.round, 'string', `Match ${index} round type mismatch`);
    assertEqual(typeof match.team_a, 'string', `Match ${index} team_a type mismatch`);
    assertEqual(typeof match.team_b, 'string', `Match ${index} team_b type mismatch`);
  });
}

function testByeHandling() {
  const category = generateMockCategory('knockout', 'test');
  const result = schedulingController.generateSchedule(category, 3);
  
  // Test 3-team bracket
  assertEqual(result.team_count, 3, 'Team count mismatch');
  assertEqual(result.total_rounds, 2, 'Round count mismatch');
  
  // Should have 3 matches (2 in round 1, 1 in round 2)
  assertEqual(result.matches.length, 3, 'Match count mismatch for 3-team bracket');
}

function testCalculateRounds() {
  // Test knockout rounds calculation
  assertEqual(schedulingController.calculateRounds(2, 'knockout'), 1, '2-team knockout rounds');
  assertEqual(schedulingController.calculateRounds(4, 'knockout'), 2, '4-team knockout rounds');
  assertEqual(schedulingController.calculateRounds(8, 'knockout'), 3, '8-team knockout rounds');
  assertEqual(schedulingController.calculateRounds(16, 'knockout'), 4, '16-team knockout rounds');
  
  // Test double elimination rounds calculation
  assertEqual(schedulingController.calculateRounds(2, 'double_elimination'), 3, '2-team double elimination rounds');
  assertEqual(schedulingController.calculateRounds(4, 'double_elimination'), 4, '4-team double elimination rounds');
  assertEqual(schedulingController.calculateRounds(8, 'double_elimination'), 5, '8-team double elimination rounds');
}

function testGenerateTeamList() {
  const teams = schedulingController.generateTeamList(5);
  assertEqual(teams.length, 5, 'Team list length mismatch');
  
  teams.forEach((team, index) => {
    assertEqual(team, `Team ${index + 1}`, `Team name mismatch for index ${index}`);
  });
}

// Run all tests
runTest('Knockout Schedule Generation', testKnockoutScheduleGeneration);
runTest('Double Elimination Schedule Generation', testDoubleEliminationScheduleGeneration);
runTest('Bye Handling', testByeHandling);
runTest('Calculate Rounds', testCalculateRounds);
runTest('Generate Team List', testGenerateTeamList);

console.log('\nAll tests completed successfully!');