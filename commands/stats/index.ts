import { Context } from "grammy";
import { getUserMappings } from "../../utils/userMap";
import { fetchChessComStats, fetchLichessStats, formatCombinedStats } from "../../utils/chessApis";

export async function handleStats(ctx: Context) {
  // For /stats command without username, use the sender's username
  let targetUsername = ctx.message?.text?.replace('/stats', '').trim().toLowerCase();
  
  if (!targetUsername) {
    // If no username provided, try to get the sender's chess platforms
    const telegramUsername = ctx.from?.username;
    
    if (telegramUsername) {
      const userMappings = await getUserMappings(telegramUsername);
      if (userMappings && (userMappings.chess || userMappings.lichess)) {
        // Fetch stats from both platforms
        const chessComStats = userMappings.chess ? await fetchChessComStats(userMappings.chess) : null;
        const lichessStats = userMappings.lichess ? await fetchLichessStats(userMappings.lichess) : null;
        
        if (chessComStats || lichessStats) {
          const message = formatCombinedStats(telegramUsername, chessComStats, lichessStats);
          return ctx.reply(message);
        }
      }
    }
    
    return ctx.reply("⚠️ Please provide a username or register using /start first.\nExample: /stats username");
  }

  // If username is provided, try to fetch from both platforms (assume it's the same on both)
  try {
    const chessComStats = await fetchChessComStats(targetUsername);
    const lichessStats = await fetchLichessStats(targetUsername);
    
    if (!chessComStats && !lichessStats) {
      return ctx.reply(`⚠️ User "${targetUsername}" not found on Chess.com or Lichess.`);
    }
    
    const message = formatCombinedStats(targetUsername, chessComStats, lichessStats);
    await ctx.reply(message);
  } catch (err) {
    console.error(err);
    ctx.reply("🚨 Error while fetching stats. Please try again later.");
  }
} 