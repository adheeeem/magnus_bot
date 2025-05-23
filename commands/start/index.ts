import { CommandContext, Context, GrammyError } from "grammy";
import { saveUser } from "../../utils/csv";

let awaitingUsername = new Set<number>();

export async function handleStart(ctx: CommandContext<any>) {
  try {
    await ctx.reply(
      "👋 Welcome! To register, please send your Chess.com and Telegram usernames to @azimjonfffff"
    );
  } catch (err) {
    const errorContext = {
      updateId: ctx.update.update_id,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      timestamp: new Date().toISOString()
    };

    if (err instanceof GrammyError && err.description.includes("bot was blocked by the user")) {
      console.log(JSON.stringify({
        level: "warn",
        type: "bot_blocked",
        message: `Bot was blocked by user ${ctx.from?.id}`,
        ...errorContext,
        error: err.description
      }));
    } else {
      console.log(JSON.stringify({
        level: "error",
        type: "reply_failed",
        message: "Failed to send reply in /start",
        ...errorContext,
        error: err instanceof Error ? err.message : String(err)
      }));
    }
  }
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