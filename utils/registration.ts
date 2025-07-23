import { Context } from "grammy";
import { saveUserMapping } from "../utils/supabase";

// Store user states for registration flow
const userStates = new Map<number, { step: 'waiting_for_chess_username' }>();

export async function handleRegistration(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.message?.text?.trim();
  if (!text) return;

  const userState = userStates.get(userId);
  
  if (userState?.step === 'waiting_for_chess_username') {
    // User is providing their chess.com username
    await handleChessUsernameInput(ctx, text);
  }
}

async function handleChessUsernameInput(ctx: Context, chessUsername: string): Promise<void> {
  const userId = ctx.from?.id;
  const telegramUsername = ctx.from?.username;
  
  if (!userId || !telegramUsername) {
    await ctx.reply("❌ Unable to get your Telegram information. Please try again.");
    return;
  }

  // Remove user from registration flow
  userStates.delete(userId);

  // Validate chess.com username format (basic validation)
  if (chessUsername.length < 3 || chessUsername.length > 25) {
    await ctx.reply("❌ Invalid username. Chess.com usernames must be 3-25 characters long. Please use /start to try again.");
    return;
  }

  // Verify the chess.com username exists by making an API call
  try {
    const response = await fetch(`https://api.chess.com/pub/player/${chessUsername}`);
    if (!response.ok) {
      await ctx.reply(`❌ Chess.com user "${chessUsername}" not found. Please check the spelling and try again with /start.`);
      return;
    }
  } catch (error) {
    await ctx.reply("❌ Unable to verify Chess.com username. Please try again later.");
    return;
  }

  // Save to database
  try {
    const result = await saveUserMapping(telegramUsername, chessUsername);
    
    if (result.success) {
      await ctx.reply(
        `✅ Registration successful!\n\n` +
        `🎯 Telegram: @${telegramUsername}\n` +
        `♟️ Chess.com: ${chessUsername}\n\n` +
        `You can now use:\n` +
        `📊 /stats - View your chess statistics\n` +
        `🏆 /top - See leaderboards\n` +
        `⚔️ /score @user1 @user2 - Compare players`
      );
    } else {
      await ctx.reply(`❌ Registration failed: ${result.error}. Please try again with /start.`);
    }
  } catch (error) {
    console.error('Registration error:', error);
    await ctx.reply("❌ Registration failed due to a database error. Please try again later.");
  }
}

export function startRegistrationFlow(userId: number): void {
  userStates.set(userId, { step: 'waiting_for_chess_username' });
}

export function isUserInRegistrationFlow(userId: number): boolean {
  return userStates.has(userId);
}
