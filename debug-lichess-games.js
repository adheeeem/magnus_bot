#!/usr/bin/env node
// debug-lichess-games.js
// Debug script to test Lichess game fetching for recent games

import { fetchLichessGames } from './utils/chessApis.js';

async function debugLichessGames() {
  console.log('🔍 Debugging Lichess Games Fetching\n');

  // Test with the usernames from the game example
  const testUsernames = ['shuhratrahmonov146', 'Starryknights'];
  
  // Calculate today's start in Tajikistan time (GMT+5)
  const now = new Date();
  const tajikTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  const startOfDayTajik = new Date(
    tajikTime.getFullYear(),
    tajikTime.getMonth(),
    tajikTime.getDate(),
    0, 0, 0, 0
  );
  const startOfDayUTC = new Date(startOfDayTajik.getTime() - (5 * 60 * 60 * 1000));
  
  console.log('📅 Date Info:');
  console.log(`   Current UTC: ${now.toISOString()}`);
  console.log(`   Current Tajik: ${tajikTime.toISOString()}`);
  console.log(`   Start of day UTC: ${startOfDayUTC.toISOString()}`);
  console.log(`   Timestamp filter: ${startOfDayUTC.getTime()}\n`);

  for (const username of testUsernames) {
    console.log(`🎯 Testing user: ${username}`);
    
    // Test 1: Get games from today
    console.log('   📊 Fetching today\'s games...');
    const todayGames = await fetchLichessGames(username, startOfDayUTC.getTime(), Date.now());
    
    if (todayGames) {
      console.log(`   ✅ Found ${todayGames.length} games today`);
      
      // Show details of recent games
      todayGames.slice(0, 3).forEach((game, i) => {
        const gameTime = new Date(game.lastMoveAt || game.createdAt);
        const gameTajik = new Date(gameTime.getTime() + (5 * 60 * 60 * 1000));
        
        console.log(`      Game ${i+1}: ${game.id}`);
        console.log(`         Time (UTC): ${gameTime.toISOString()}`);
        console.log(`         Time (Tajik): ${gameTajik.toISOString()}`);
        console.log(`         Speed: ${game.speed}`);
        console.log(`         Status: ${game.status}`);
        
        // Check who won
        const whiteUser = game.players.white.user?.name || 'Anonymous';
        const blackUser = game.players.black.user?.name || 'Anonymous';
        console.log(`         Players: ${whiteUser} vs ${blackUser}`);
        console.log(`         Winner: ${game.winner || 'Draw'}`);
        console.log(`         URL: https://lichess.org/${game.id}`);
        console.log('');
      });
    } else {
      console.log('   ❌ Failed to fetch games');
    }
    
    // Test 2: Get recent games (last 24 hours)
    console.log('   📊 Fetching last 24h games...');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentGames = await fetchLichessGames(username, oneDayAgo, Date.now());
    
    if (recentGames) {
      console.log(`   ✅ Found ${recentGames.length} games in last 24h`);
    } else {
      console.log('   ❌ Failed to fetch recent games');
    }
    
    console.log('');
  }

  // Test the specific game mentioned
  console.log('🎮 Looking for specific game: QrL5dzGe');
  const gameDate = new Date('2025-08-13T07:04:45.000Z');
  console.log(`   Game time (UTC): ${gameDate.toISOString()}`);
  console.log(`   Game timestamp: ${gameDate.getTime()}`);
  
  // Check if this timestamp falls within our filter
  const isInToday = gameDate.getTime() >= startOfDayUTC.getTime();
  console.log(`   Should be included in today's games: ${isInToday ? '✅ Yes' : '❌ No'}`);
}

// Run the debug
debugLichessGames().catch(console.error);
