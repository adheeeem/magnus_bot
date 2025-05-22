import { Bot } from "grammy";
import * as dotenv from "dotenv";
import * as fs from "fs/promises";

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not set");

const bot = new Bot(token);

interface Rating {
  last?: { rating: number };
}

interface ChessStats {
  chess_rapid?: Rating;
  chess_blitz?: Rating;
  chess_bullet?: Rating;
  tactics?: { highest?: { rating: number } };
  puzzle_rush?: { best?: { score: number } };
}

type RatingKey = "chess_rapid" | "chess_blitz" | "chess_bullet";

interface ChessGame {
  time_class: 'rapid' | 'blitz' | 'bullet';
  white: { username: string; result: string };
  black: { username: string; result: string };
  end_time: number;  // Unix timestamp in seconds
}

// Command handlers first
bot.command("start", async (ctx) => {
  await ctx.reply("👋 Welcome! Please send me your Chess.com username:");
});

bot.command("today", async (ctx) => {
  try {
    // First, we need to get the user's chess.com username from our saved data
    const usersData = await fs.readFile('users.csv', 'utf-8');
    const telegramUsername = ctx.from?.username || ctx.from?.id?.toString() || "unknown";
    console.log('Looking for Telegram username:', telegramUsername);
    console.log('Users data:', usersData);
    
    const userLine = usersData.split('\n').find(line => line.startsWith(telegramUsername));
    console.log('Found user line:', userLine);
    
    if (!userLine) {
      return ctx.reply("❌ You haven't registered your Chess.com username yet. Use /start first!");
    }

    const chessUsername = userLine.split(',')[1].trim();
    console.log('Chess.com username:', chessUsername);
    
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    const apiUrl = `https://api.chess.com/pub/player/${chessUsername}/games/${year}/${month}`;
    console.log('Fetching from URL:', apiUrl);

    const res = await fetch(apiUrl);
    console.log('API response status:', res.status);
    
    if (!res.ok) {
      return ctx.reply("⚠️ Could not fetch games. Please try again later.");
    }

    const data = await res.json();
    const todayGames = data.games.filter((game: ChessGame) => {
      const gameDate = new Date(game.end_time * 1000);
      return gameDate.toDateString() === today.toDateString();
    });

    const stats = {
      rapid: { won: 0, lost: 0, draw: 0 },
      blitz: { won: 0, lost: 0, draw: 0 },
      bullet: { won: 0, lost: 0, draw: 0 }
    };

    todayGames.forEach((game: ChessGame) => {
      const playerColor = game.white.username.toLowerCase() === chessUsername.toLowerCase() ? 'white' : 'black';
      const result = game[playerColor].result;
      const timeClass = game.time_class;

      if (result === 'win') stats[timeClass].won++;
      else if (result === 'lose') stats[timeClass].lost++;
      else stats[timeClass].draw++;
    });

    const message = `
📊 Today's Stats for @${chessUsername}:

♟ Rapid:
   Wins: ${stats.rapid.won}
   Losses: ${stats.rapid.lost}
   Draws: ${stats.rapid.draw}

⚡ Blitz:
   Wins: ${stats.blitz.won}
   Losses: ${stats.blitz.lost}
   Draws: ${stats.blitz.draw}

💨 Bullet:
   Wins: ${stats.bullet.won}
   Losses: ${stats.bullet.lost}
   Draws: ${stats.bullet.draw}

Total Games Today: ${todayGames.length}
    `.trim();

    await ctx.reply(message);

  } catch (err) {
    console.error(err);
    ctx.reply("🚨 An error occurred while fetching today's stats.");
  }
});

// Add this interface for tracking head-to-head stats
interface HeadToHeadStats {
  rapid: { wins: number; losses: number; draws: number };
  blitz: { wins: number; losses: number; draws: number };
  bullet: { wins: number; losses: number; draws: number };
}

// Add before bot.start()
bot.command("score", async (ctx) => {
  try {
    if (!ctx.message?.text) {
      return ctx.reply("❌ Invalid command format.");
    }

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length !== 2) {
      return ctx.reply("❌ Please provide two Telegram usernames. Usage: /score @user1 @user2");
    }

    const [user1, user2] = args.map(u => u.replace('@', ''));
    
    // Read users data
    const usersData = await fs.readFile('users.csv', 'utf-8');
    const users = new Map(
      usersData.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [telegram, chess] = line.split(',');
          return [telegram, chess.trim()];
        })
    );

    const chess1 = users.get(user1);
    const chess2 = users.get(user2);

    if (!chess1 || !chess2) {
      return ctx.reply("❌ One or both users haven't registered their Chess.com usernames yet.");
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');

    // Fetch games for both players
    const [res1, res2] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${chess1}/games/${year}/${month}`),
      fetch(`https://api.chess.com/pub/player/${chess2}/games/${year}/${month}`)
    ]);

    if (!res1.ok || !res2.ok) {
      return ctx.reply("⚠️ Could not fetch games for one or both players.");
    }

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Find games between these two players
    const headToHead = data1.games.filter((game: ChessGame) => {
      const whiteUser = game.white.username.toLowerCase();
      const blackUser = game.black.username.toLowerCase();
      return (whiteUser === chess1.toLowerCase() && blackUser === chess2.toLowerCase()) ||
             (whiteUser === chess2.toLowerCase() && blackUser === chess1.toLowerCase());
    });

    if (headToHead.length === 0) {
      return ctx.reply(`No games found between @${user1} and @${user2} this month.`);
    }

    // Track stats for user1
    const stats: HeadToHeadStats = {
      rapid: { wins: 0, losses: 0, draws: 0 },
      blitz: { wins: 0, losses: 0, draws: 0 },
      bullet: { wins: 0, losses: 0, draws: 0 }
    };

    headToHead.forEach((game: ChessGame) => {
      const timeClass = game.time_class;
      const isUser1White = game.white.username.toLowerCase() === chess1.toLowerCase();
      const result = isUser1White ? game.white.result : game.black.result;

      if (result === 'win') stats[timeClass].wins++;
      else if (result === 'lose') stats[timeClass].losses++;
      else stats[timeClass].draws++;
    });

    const message = `
🤺 Head-to-head: @${user1} vs @${user2} (${chess1} vs ${chess2})

♟ Rapid:
   ${user1} wins: ${stats.rapid.wins}
   ${user2} wins: ${stats.rapid.losses}
   Draws: ${stats.rapid.draws}

⚡ Blitz:
   ${user1} wins: ${stats.blitz.wins}
   ${user2} wins: ${stats.blitz.losses}
   Draws: ${stats.blitz.draws}

💨 Bullet:
   ${user1} wins: ${stats.bullet.wins}
   ${user2} wins: ${stats.bullet.losses}
   Draws: ${stats.bullet.draws}

Total Games: ${headToHead.length}
    `.trim();

    await ctx.reply(message);

  } catch (err) {
    console.error(err);
    ctx.reply("🚨 An error occurred while fetching head-to-head stats.");
  }
});

// General text message handler last
bot.on("message:text", async (ctx) => {
  // Skip command messages
  if (ctx.message.text.startsWith('/')) {
    return;
  }

  const chessUsername = ctx.message.text.trim().toLowerCase();
  const telegramUsername = ctx.from?.username || ctx.from?.id?.toString() || "unknown";

  try {
    const res = await fetch(`https://api.chess.com/pub/player/${chessUsername}/stats`);
    if (!res.ok) {
      return ctx.reply("⚠️ Could not fetch stats. Make sure the username is correct.");
    }

    // Save usernames to file
    const userData = `${telegramUsername},${chessUsername}\n`;
    await fs.appendFile('users.csv', userData);

    const stats = await res.json() as ChessStats;

    const getRating = (mode: RatingKey): string =>
      stats[mode]?.last?.rating?.toString() ?? "N/A";

    const message = `
📊 Stats for @${chessUsername}:

♟ Rapid: ${getRating("chess_rapid")}
⚡ Blitz: ${getRating("chess_blitz")}
💨 Bullet: ${getRating("chess_bullet")}
🧠 Tactics: ${stats.tactics?.highest?.rating ?? "N/A"}
📅 Puzzle Rush Best: ${stats.puzzle_rush?.best?.score ?? "N/A"}
    `.trim();

    await ctx.reply(message);

  } catch (err) {
    console.error(err);
    ctx.reply("🚨 An error occurred while fetching stats.");
  }
});

bot.start();
