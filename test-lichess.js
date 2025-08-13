#!/usr/bin/env node
// test-lichess.js
// Quick test script to verify Lichess API integration

import { fetchLichessStats, verifyLichessUser } from './utils/chessApis.js';

async function testLichessAPI() {
  console.log('🧪 Testing Lichess API Integration\n');

  // Test username - using a known good Lichess user
  const testUsername = 'lichess';

  console.log(`📋 Testing with username: ${testUsername}`);
  console.log(`🔑 Token configured: ${process.env.LICHESS_API_TOKEN ? '✅ Yes' : '❌ No'}\n`);

  // Test user verification
  console.log('1️⃣ Testing user verification...');
  const userExists = await verifyLichessUser(testUsername);
  console.log(`   Result: ${userExists ? '✅ User exists' : '❌ User not found'}\n`);

  if (userExists) {
    // Test stats fetching
    console.log('2️⃣ Testing stats fetching...');
    const stats = await fetchLichessStats(testUsername);
    
    if (stats) {
      console.log('   ✅ Stats retrieved successfully');
      console.log(`   📊 Rapid rating: ${stats.perfs?.rapid?.rating ?? 'N/A'}`);
      console.log(`   ⚡ Blitz rating: ${stats.perfs?.blitz?.rating ?? 'N/A'}`);
      console.log(`   💨 Bullet rating: ${stats.perfs?.bullet?.rating ?? 'N/A'}`);
      console.log(`   🧠 Puzzle rating: ${stats.perfs?.puzzle?.rating ?? 'N/A'}`);
    } else {
      console.log('   ❌ Failed to retrieve stats');
      console.log('   💡 This might be due to missing API token or rate limiting');
    }
  }

  console.log('\n🏁 Test completed!');
  
  if (!process.env.LICHESS_API_TOKEN) {
    console.log('\n💡 Tip: Add LICHESS_API_TOKEN to your .env file for better reliability');
    console.log('   See LICHESS_TOKEN_SETUP.md for instructions');
  }
}

// Run the test
testLichessAPI().catch(console.error);
