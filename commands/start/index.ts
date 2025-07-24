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
        `👋 Хуш омадед! / Welcome back!\n\n` +
        `Шумо аллакай сабт шудаед:\n` +
        `You're already registered:\n` +
        `🎯 Telegram: @${telegramUsername}\n` +
        `♟️ Chess.com: ${existingChessUsername}\n\n` +
        `Фармонҳои дастрас / Available commands:\n` +
        `📊 /stats - Омори шахмат / View your chess statistics\n` +
        `🏆 /top - Рейтинг / See leaderboards\n` +
        `⚔️ /score @user1 @user2 - Муқоисаи бозигарон / Compare players`
      );
      return;
    }

    // Start registration flow for new users
    startRegistrationFlow(userId);
    
    await ctx.reply(
      "👋 Хуш омадед ба Magnus Bot! / Welcome to Magnus Bot!\n\n" +
      "🎯 Биёед ҳисоби Chess.com-и худро сабт кунем.\n" +
      "🎯 Let's register your Chess.com account.\n\n" +
      "Лутфан номи корбарии Chess.com-и худро ворид кунед:\n" +
      "Please enter your Chess.com username:\n" +
      "(Бот мавҷудияти онро дар Chess.com тасдиқ мекунад)\n" +
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