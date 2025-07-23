import { CommandContext, GrammyError } from "grammy";
import { getChessUsername } from "../../utils/supabase";
import { startRegistrationFlow } from "../../utils/registration";

export async function handleStart(ctx: CommandContext<any>) {
  try {
    const userId = ctx.from?.id;
    const telegramUsername = ctx.from?.username;

    if (!userId) {
      await ctx.reply("❌ Unable to get your user information. Please try again.");
      return;
    }

    if (!telegramUsername) {
      await ctx.reply(
        "❌ You need to set a Telegram username to use this bot.\n\n" +
        "Go to Telegram Settings → Username and create one, then try /start again."
      );
      return;
    }

    // Check if user is already registered
    const existingChessUsername = await getChessUsername(telegramUsername);
    
    if (existingChessUsername) {
      await ctx.reply(
        `👋 Welcome back!\n\n` +
        `You're already registered:\n` +
        `🎯 Telegram: @${telegramUsername}\n` +
        `♟️ Chess.com: ${existingChessUsername}\n\n` +
        `Available commands:\n` +
        `📊 /stats - View your chess statistics\n` +
        `🏆 /top - See leaderboards\n` +
        `⚔️ /score @user1 @user2 - Compare players`
      );
      return;
    }

    // Start registration flow for new users
    startRegistrationFlow(userId);
    
    await ctx.reply(
      "👋 Welcome to Magnus Bot!\n\n" +
      "🎯 Let's register your Chess.com account.\n\n" +
      "Please enter your Chess.com username:\n" +
      "(The bot will verify it exists on Chess.com)"
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

// Legacy function - keeping for compatibility but not using GitHub flow anymore
export async function handleUsername(ctx: any) {
  // This function is now handled by the registration flow
  // We'll redirect to the new registration system
  const userId = ctx.from?.id;
  if (userId) {
    const { handleRegistration } = await import("../../utils/registration");
    await handleRegistration(ctx);
  }
}