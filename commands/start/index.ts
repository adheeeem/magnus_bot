import { CommandContext, GrammyError } from "grammy";

export async function handleStart(ctx: CommandContext<any>) {
  try {
    await ctx.reply(
      "👋 Welcome to Magnus Bot!\n\n" +
      "🌟 To register your Chess.com username:\n\n" +
      "1️⃣ Go to this repository: https://github.com/adheeeem/magnus_bot\n" +
      "2️⃣ Star the repository ⭐\n" +
      "3️⃣ Add your usernames to the userMap in utils/userMap.ts\n" +
      "4️⃣ Create a Pull Request\n\n" +
      "⚠️ Note: Your PR won't be accepted if you haven't starred the repository!\n\n" +
      "📝 Format: 'your_telegram_username': 'your_chess_username'"
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