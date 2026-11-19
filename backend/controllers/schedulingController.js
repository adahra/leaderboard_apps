// Tournament Scheduling System
// Generates match schedules for knockout and double elimination brackets

const db = require('../config/db');

function generateSchedule(category, teamCount) {
  const { schema, key } = category;
  
  if (!['knockout', 'double_elimination'].includes(schema)) {
    throw new Error(`Unsupported bracket schema: ${schema}`);
  }
  
  if (!teamCount || teamCount < 2) {
    throw new Error('Team count must be at least 2');
  }
  
  const rounds = calculateRounds(teamCount, schema);
  const matches = schema === 'knockout' 
    ? generateKnockoutSchedule(teamCount, rounds)
    : generateDoubleEliminationSchedule(teamCount, rounds);
  
  return {
    category: key,
    schema,
    team_count: teamCount,
    total_rounds: rounds,
    matches,
    generated_at: new Date().toISOString()
  };
}

function calculateRounds(teamCount, schema) {
  if (schema === 'knockout') {
    // Calculate rounds for single elimination: ceil(log2(teamCount))
    let rounds = 0;
    let teams = teamCount;
    while (teams > 1) {
      rounds++;
      teams = Math.ceil(teams / 2);
    }
    return rounds;
  } else {
    // Double elimination: additional rounds for losers bracket
    return calculateRounds(teamCount, 'knockout') + 2; // Winner + Loser brackets
  }
}

function generateKnockoutSchedule(teamCount, totalRounds) {
  const matches = [];
  let matchId = 1;
  
  // Calculate matches per round
  // For knockout: round 1 has ceil(teamCount/2) matches, then halved each round
  let teamsRemaining = teamCount;
  
  for (let round = 1; round <= totalRounds; round++) {
    const matchesThisRound = [];
    const numMatches = Math.ceil(teamsRemaining / 2);
    
    for (let i = 0; i < numMatches; i++) {
      // Generate team names based on round and match position
      const teamA = `Team ${i * 2 + 1}`;
      const teamB = `Team ${i * 2 + 2}`;
      
      matchesThisRound.push({
        id: `m${matchId++}`,
        round: `r${round}`,
        team_a: teamA,
        team_b: teamB,
        status: 'scheduled',
        court: `Court ${Math.ceil(matchId / 10)}`
      });
    }
    
    matches.push(...matchesThisRound);
    teamsRemaining = numMatches; // Winners advance to next round
  }
  
  return matches;
}

function generateDoubleEliminationSchedule(teamCount, totalRounds) {
  // Double elimination has winners bracket and losers bracket
  const winnersBracket = generateKnockoutSchedule(teamCount, totalRounds - 2);
  const losersBracket = generateLosersBracket(teamCount, totalRounds - 2);
  
  // Combine both brackets with proper ordering
  const allMatches = [];
  
  // First round: Winners bracket matches
  allMatches.push(...winnersBracket.slice(0, 4));
  
  // Second round: Losers bracket matches
  allMatches.push(...losersBracket.slice(0, 8));
  
  // Continue alternating
  let winnersIndex = 4;
  let losersIndex = 8;
  
  while (winnersIndex < winnersBracket.length || losersIndex < losersBracket.length) {
    if (winnersIndex < winnersBracket.length) {
      allMatches.push(winnersBracket[winnersIndex]);
      winnersIndex++;
    }
    if (losersIndex < losersBracket.length) {
      allMatches.push(losersBracket[losersIndex]);
      losersIndex++;
    }
  }
  
  return allMatches;
}

function generateLosersBracket(teamCount, rounds) {
  const losersMatches = [];
  let matchId = 1000; // Different ID space for losers bracket
  
  // Simplified losers bracket generation
  // In a full implementation, this would track teams that lost in earlier rounds
  for (let round = 1; round <= rounds; round++) {
    const matchesThisRound = [];
    const numMatches = Math.pow(2, Math.max(0, round - 1));
    
    for (let i = 0; i < numMatches; i++) {
      matchesThisRound.push({
        id: `lm${matchId++}`,
        round: `l${round}r${round}`, // Losers round format
        team_a: `L${i + 1}A`,
        team_b: `L${i + 1}B`,
        status: 'scheduled',
        court: `Court ${Math.ceil(matchId / 20)}`
      });
    }
    
    losersMatches.push(...matchesThisRound);
  }
  
  return losersMatches;
}

function generateTeamList(teamCount) {
  const teams = [];
  for (let i = 1; i <= teamCount; i++) {
    teams.push(`Team ${i}`);
  }
  return teams;
}

module.exports = {
  generateSchedule,
  calculateRounds,
  generateKnockoutSchedule,
  generateDoubleEliminationSchedule,
  generateLosersBracket,
  generateTeamList
};