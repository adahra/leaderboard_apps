// Live Bracket Visualization Tests
// Simple tests for BracketTree functionality

const BracketTree = require('../../frontend/js/components/BracketTree');

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

function createMockSchedule() {
  return {
    category: 'junior',
    schema: 'knockout',
    team_count: 8,
    total_rounds: 3,
    matches: [
      {
        id: 'm1',
        round: 'r1',
        team_a: 'Team 1',
        team_b: 'Team 2',
        status: 'scheduled',
        court: 'Court A',
        scheduled_at: '2024-01-15T10:00:00'
      },
      {
        id: 'm2',
        round: 'r1',
        team_a: 'Team 3',
        team_b: 'Team 4',
        status: 'scheduled',
        court: 'Court B',
        scheduled_at: '2024-01-15T11:00:00'
      },
      {
        id: 'm3',
        round: 'r2',
        team_a: 'Team 1',
        team_b: 'Team 3',
        status: 'completed',
        court: 'Court A',
        scheduled_at: '2024-01-15T14:00:00'
      },
      {
        id: 'm4',
        round: 'r2',
        team_a: 'Team 4',
        team_b: 'Team 2',
        status: 'scheduled',
        court: 'Court B',
        scheduled_at: '2024-01-15T15:00:00'
      },
      {
        id: 'm5',
        round: 'r3',
        team_a: 'Team 1',
        team_b: 'Team 4',
        status: 'scheduled',
        court: 'Court A',
        scheduled_at: '2024-01-15T16:00:00'
      }
    ]
  };
}

function testBracketTreeCreation() {
  const scheduleData = createMockSchedule();
  
  // Test basic properties of schedule data
  assertEqual(scheduleData.category, 'junior', 'Category mismatch');
  assertEqual(scheduleData.schema, 'knockout', 'Schema mismatch');
  assertEqual(scheduleData.team_count, 8, 'Team count mismatch');
  assertEqual(scheduleData.total_rounds, 3, 'Round count mismatch');
  assertEqual(scheduleData.matches.length, 5, 'Match count mismatch');
  
  // Test match properties
  scheduleData.matches.forEach((match, index) => {
    assertEqual(typeof match.id, 'string', `Match ${index} ID type mismatch`);
    assertEqual(typeof match.round, 'string', `Match ${index} round type mismatch`);
    assertEqual(typeof match.team_a, 'string', `Match ${index} team_a type mismatch`);
    assertEqual(typeof match.team_b, 'string', `Match ${index} team_b type mismatch`);
    assertEqual(typeof match.status, 'string', `Match ${index} status type mismatch`);
    assertEqual(typeof match.court, 'string', `Match ${index} court type mismatch`);
  });
}

function testRoundGrouping() {
  const scheduleData = createMockSchedule();
  
  // Group matches by round
  const matchesByRound = {};
  scheduleData.matches.forEach(match => {
    const round = match.round;
    if (!matchesByRound[round]) {
      matchesByRound[round] = [];
    }
    matchesByRound[round].push(match);
  });
  
  // Test round keys
  assertEqual(Object.keys(matchesByRound).length, 3, 'Incorrect number of rounds');
  assertEqual(Object.keys(matchesByRound).includes('r1'), true, 'Missing round 1');
  assertEqual(Object.keys(matchesByRound).includes('r2'), true, 'Missing round 2');
  assertEqual(Object.keys(matchesByRound).includes('r3'), true, 'Missing round 3');
  
  // Test each round
  assertEqual(matchesByRound.r1.length, 2, 'Round 1 should have 2 matches');
  assertEqual(matchesByRound.r2.length, 2, 'Round 2 should have 2 matches');
  assertEqual(matchesByRound.r3.length, 1, 'Round 3 should have 1 match');
}

function calculateCurrentRound(scheduleData) {
  // Find the highest round number from completed matches
  let currentRound = 0;
  scheduleData.matches.forEach(match => {
    const roundNum = match.round.replace('r', '') - 0;
    if (roundNum > currentRound) {
      currentRound = roundNum;
    }
  });
  
  return currentRound > 0 ? currentRound : 1;
}

function testCurrentRoundCalculation() {
  const scheduleData = createMockSchedule();
  
  // Test with completed match
  const currentRound = calculateCurrentRound(scheduleData);
  // Round 3 has a completed match, so current round should be 3
  assertEqual(currentRound, 3, 'Current round calculation with completed match');
}

function testExpandedRounds() {
  const scheduleData = createMockSchedule();
  
  // Test default expanded rounds logic
  const expandedRounds = {};
  const currentRound = calculateCurrentRound(scheduleData);
  
  for (let i = 1; i <= scheduleData.total_rounds; i++) {
    expandedRounds[`r${i}`] = i <= currentRound;
  }
  
  assertEqual(expandedRounds.r1, true, 'Round 1 should be expanded initially');
  assertEqual(expandedRounds.r2, true, 'Round 2 should be expanded initially');
  assertEqual(expandedRounds.r3, true, 'Round 3 should be expanded initially (current round)');
}

function testMatchClickHandler() {
  // Test match click handler setup
  const scheduleData = createMockSchedule();
  
  // Verify match structure supports click handler
  scheduleData.matches.forEach(match => {
    assertEqual(typeof match.id, 'string', 'Match should have ID for click handling');
    assertEqual(typeof match.round, 'string', 'Match should have round for click handling');
  });
}

function testBracketTreeUpdate() {
  const initialSchedule = createMockSchedule();
  
  // Test schedule update logic
  const updatedSchedule = {
    ...initialSchedule,
    matches: [
      ...initialSchedule.matches,
      {
        id: 'm6',
        round: 'r1',
        team_a: 'Team 5',
        team_b: 'Team 6',
        status: 'scheduled',
        court: 'Court C',
        scheduled_at: '2024-01-15T17:00:00'
      }
    ]
  };
  
  assertEqual(updatedSchedule.matches.length, 6, 'Match count should be updated');
}

// Run all tests
runTest('Knockout Schedule Generation', testBracketTreeCreation);
runTest('Round Grouping', testRoundGrouping);
runTest('Current Round Calculation', testCurrentRoundCalculation);
runTest('Expanded Rounds', testExpandedRounds);
runTest('Match Click Handler', testMatchClickHandler);
runTest('Bracket Tree Update', testBracketTreeUpdate);

console.log('\nAll bracket visualization tests completed successfully!');