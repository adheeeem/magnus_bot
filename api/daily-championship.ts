// api/daily-championship.ts
// Vercel cron job endpoint for daily championship awards
// This endpoint should be called daily at 23:55 Tajikistan time (18:55 UTC)

import { VercelRequest, VercelResponse } from '@vercel/node';
import { bot } from '../bot';
import { getTodaysLeaderboard, saveDailyChampions, getRecentChampions } from '../utils/championship';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron job request (for security)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🏆 Running daily championship calculation...');
    
    // Get today's date in Tajikistan time
    const now = new Date();
    const tajikTime = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // UTC+5
    
    // Get today's leaderboard
    const leaderboard = await getTodaysLeaderboard(tajikTime);
    
    if (leaderboard.length === 0) {
      console.log('No qualifying players for today\'s championship');
      return res.status(200).json({ 
        success: true, 
        message: 'No qualifying players today',
        date: tajikTime.toISOString().split('T')[0]
      });
    }

    // Save champions and award scores
    const championData = await saveDailyChampions(tajikTime, leaderboard);
    
    if (!championData) {
      console.log('Failed to save daily champions');
      return res.status(500).json({ error: 'Failed to save champions' });
    }

    // Prepare championship announcement message
    const message = formatChampionshipMessage(championData, leaderboard);
    
    // Send announcement to all registered users (or a specific group)
    // For now, we'll log the message and return it
    console.log('Championship message:', message);
    
    // You can uncomment this to send to a specific chat ID
    // const ANNOUNCEMENT_CHAT_ID = process.env.ANNOUNCEMENT_CHAT_ID;
    // if (ANNOUNCEMENT_CHAT_ID) {
    //   await bot.api.sendMessage(ANNOUNCEMENT_CHAT_ID, message);
    // }

    return res.status(200).json({ 
      success: true, 
      message: 'Daily championship processed successfully',
      champions: championData,
      announcement: message
    });

  } catch (error) {
    console.error('Error in daily championship cron job:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function formatChampionshipMessage(championData: any, leaderboard: any[]): string {
  const date = new Date(championData.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let message = `🏆 DAILY CHAMPIONSHIP RESULTS - ${date}\n\n`;
  
  // First place
  const first = leaderboard[0];
  message += `🥇 CHAMPION: ${championData.first_place}\n`;
  message += `   Win Rate: ${first.winRate.toFixed(1)}% (${first.wins}W-${first.losses}L)\n`;
  message += `   Awarded: +300 points 🎉\n\n`;
  
  // Second place
  if (championData.second_place && leaderboard[1]) {
    const second = leaderboard[1];
    message += `🥈 Runner-up: ${championData.second_place}\n`;
    message += `   Win Rate: ${second.winRate.toFixed(1)}% (${second.wins}W-${second.losses}L)\n`;
    message += `   Awarded: +200 points\n\n`;
  }
  
  // Third place
  if (championData.third_place && leaderboard[2]) {
    const third = leaderboard[2];
    message += `🥉 Third place: ${championData.third_place}\n`;
    message += `   Win Rate: ${third.winRate.toFixed(1)}% (${third.wins}W-${third.losses}L)\n`;
    message += `   Awarded: +100 points\n\n`;
  }

  message += `Congratulations to all players! 🎊\n`;
  message += `Total qualifying players: ${leaderboard.length}\n\n`;
  message += `Use /standings to see overall championship standings!`;

  return message;
}
