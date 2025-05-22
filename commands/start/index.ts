import { CommandContext, Context } from "grammy";
import { saveUser } from "../../utils/csv";

// Handle initial /start command
export async function handleStart(ctx: CommandContext<any>) {
  await ctx.reply("👋 Welcome! Please send me your Chess.com username:");
  
  // Set up a one-time listener for the next message
  ctx.conversation.once("message:text", async (ctx: Context) => {
    if (!ctx.message?.text) return;
    
    const chessUsername = ctx.message.text.trim().toLowerCase();
    const telegramUsername = ctx.from?.username || String(ctx.from?.id);

    try {
      // Verify the chess.com username is valid
      const res = await fetch(`https://api.chess.com/pub/player/${chessUsername}/stats`);
      if (!res.ok) {
        return ctx.reply("⚠️ Invalid Chess.com username. Please use /start again.");
      }

      // Save user data
      await saveUser(telegramUsername, chessUsername);
      await ctx.reply(`✅ Successfully registered! You can now use the /stats command to check your stats.`);
    } catch (err) {
      console.error(err);
      ctx.reply("🚨 Error verifying Chess.com username. Please try /start again.");
    }
  });
} 