import { CommandContext, Context } from "grammy";
import { saveUser } from "../../utils/csv";

let awaitingUsername = new Set<number>();

export async function handleStart(ctx: CommandContext<any>) {
  if (!ctx.from?.id) return;
  awaitingUsername.add(ctx.from.id);
  await ctx.reply("👋 Welcome! Please send me your Chess.com username:");
}

export async function handleUsername(ctx: Context) {
  if (!ctx.from?.id || !awaitingUsername.has(ctx.from.id)) return;

  const chessUsername = ctx.message?.text?.trim().toLowerCase();
  if (!chessUsername) return;
  
  const telegramUsername = ctx.from?.username || String(ctx.from.id);

  try {
    // Verify the chess.com username is valid
    const res = await fetch(`https://api.chess.com/pub/player/${chessUsername}/stats`);
    if (!res.ok) {
      return ctx.reply("⚠️ Invalid Chess.com username. Please use /start again.");
    }

    // Save user data
    await saveUser(telegramUsername, chessUsername);
    awaitingUsername.delete(ctx.from.id);
    await ctx.reply(`✅ Successfully registered! You can now use the /stats command to check your stats.`);
  } catch (err) {
    console.error(err);
    awaitingUsername.delete(ctx.from.id);
    ctx.reply("🚨 Error verifying Chess.com username. Please try /start again.");
  }
} 