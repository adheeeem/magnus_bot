// test-championship.ts
// Manual test script for championship system

import * as dotenv from "dotenv";
import { getTodaysLeaderboard, saveDailyChampions, getAllUserScores } from "./utils/championship";

dotenv.config();

async function testChampionshipSystem() {
  console.log('🧪 Testing Championship System\n');

  try {
    // Test 1: Get today's leaderboard
    console.log('1️⃣ Getting today\'s leaderboard...');
    const today = new Date();
    const leaderboard = await getTodaysLeaderboard(today);
    
    console.log(`   Found ${leaderboard.length} qualifying players:`);
    leaderboard.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.username}: ${player.winRate.toFixed(1)}% (${player.wins}W-${player.losses}L, ${player.totalGames} total)`);
    });
    
    if (leaderboard.length === 0) {
      console.log('   ⚠️ No qualifying players found (need 3+ games)');
    }
    
    console.log();

    // Test 2: Get current user scores
    console.log('2️⃣ Getting current championship scores...');
    const userScores = await getAllUserScores();
    
    console.log(`   Current standings:`);
    if (userScores.length === 0) {
      console.log('   No scores recorded yet');
    } else {
      userScores.forEach((score, index) => {
        console.log(`   ${index + 1}. ${score.telegram_username}: ${score.total_score} points`);
      });
    }
    
    console.log();

    // Test 3: Simulate awarding champions (optional - only if there are qualifying players)
    if (leaderboard.length > 0) {
      console.log('3️⃣ Simulating championship awards...');
      console.log('   ⚠️ This will actually award points to players!');
      console.log('   Uncomment the code below if you want to test this:\n');
      
      // Uncomment to actually test the award system:
      /*
      const championData = await saveDailyChampions(today, leaderboard);
      if (championData) {
        console.log('   ✅ Championship data saved:');
        console.log(`   🥇 First: ${championData.first_place} (+300pts)`);
        if (championData.second_place) console.log(`   🥈 Second: ${championData.second_place} (+200pts)`);
        if (championData.third_place) console.log(`   🥉 Third: ${championData.third_place} (+100pts)`);
      } else {
        console.log('   ❌ Failed to save championship data');
      }
      */
      
      console.log('   // const championData = await saveDailyChampions(today, leaderboard);');
    }

    console.log('\n✅ Championship system test completed!');

  } catch (error) {
    console.error('❌ Error testing championship system:', error);
  }
}

// Run the test
testChampionshipSystem();
