import { Context } from "grammy";
import { getAllUserScores, getRecentChampions } from "../../utils/championship";

export async function handleStandings(ctx: Context) {
  try {
    // Parse command arguments
    const args = ctx.message?.text?.split(' ') || [];
    const option = args[1]?.toLowerCase();

    if (option === 'recent' || option === 'champions') {
      return await showRecentChampions(ctx);
    }

    // Default: show overall championship standings
    return await showChampionshipStandings(ctx);

  } catch (error) {
    console.error('Error in standings command:', error);
    await ctx.reply("🚨 Error retrieving championship standings. Please try again later.");
  }
}

async function showChampionshipStandings(ctx: Context) {
  const userScores = await getAllUserScores();
  
  if (userScores.length === 0) {
    return ctx.reply(
      "🏆 CHAMPIONSHIP STANDINGS\n\n" +
      "No scores recorded yet! Start playing to earn championship points.\n\n" +
      "📊 How it works:\n" +
      "• Daily leaderboard resets every day\n" +
      "• Top 3 players earn points: 🥇300, 🥈200, 🥉100\n" +
      "• Need minimum 3 games to qualify\n" +
      "• Rankings based on win rate\n\n" +
      "Use /scores recent to see recent daily champions."
    );
  }

  let message = "🏆 CHAMPIONSHIP STANDINGS\n\n";
  
  userScores.forEach((user, index) => {
    const position = index + 1;
    const emoji = getPositionEmoji(position);
    message += `${emoji} ${user.telegram_username}: ${user.total_score} points\n`;
  });

  message += "\n📊 Daily points: 🥇300, 🥈200, 🥉100";
  message += "\nUse /standings recent for daily champions";
  
  await ctx.reply(message);
}

async function showRecentChampions(ctx: Context) {
  const recentChampions = await getRecentChampions(7);
  
  if (recentChampions.length === 0) {
    return ctx.reply(
      "🏆 RECENT DAILY CHAMPIONS\n\n" +
      "No daily champions recorded yet!\n\n" +
      "Championship awards happen daily at 23:55 Tajikistan time.\n" +
      "Be the top player of the day to become champion! 👑"
    );
  }

  let message = "🏆 RECENT DAILY CHAMPIONS\n\n";
  
  recentChampions.forEach((champion, index) => {
    const date = new Date(champion.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    message += `📅 ${date}:\n`;
    message += `🥇 ${champion.first_place} (${champion.win_rate_first.toFixed(1)}%)\n`;
    
    if (champion.second_place) {
      message += `🥈 ${champion.second_place} (${champion.win_rate_second?.toFixed(1)}%)\n`;
    }
    
    if (champion.third_place) {
      message += `🥉 ${champion.third_place} (${champion.win_rate_third?.toFixed(1)}%)\n`;
    }
    
    message += "\n";
  });

  message += "Use /standings to see overall standings";
  
  await ctx.reply(message);
}

function getPositionEmoji(position: number): string {
  switch (position) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    case 4: return "4️⃣";
    case 5: return "5️⃣";
    case 6: return "6️⃣";
    case 7: return "7️⃣";
    case 8: return "8️⃣";
    case 9: return "9️⃣";
    case 10: return "🔟";
    default: return `${position}.`;
  }
}
