import { Context } from "grammy";
import { getChessUsername } from "../../utils/userMap";

interface Game {
    url: string;
    pgn: string;
    time_control: string;
    end_time: number;
    rated: boolean;
    accuracies?: {
        white: number;
        black: number;
    };
    white: {
        username: string;
        result: string;
        rating: number;
    };
    black: {
        username: string;
        result: string;
        rating: number;
    };
}

export async function handleScore(ctx: Context) {
    // Extract mentioned users from the message
    const mentions = ctx.message?.entities?.filter(e => e.type === 'mention') || [];
    if (mentions.length !== 2) {
        return ctx.reply("⚠️ Please mention exactly two users to compare their head-to-head scores (Use telegram usernames).\nExample: /score @user1 @user2");
    }

    const usernames = mentions.map(mention => {
        const start = mention.offset + 1; // +1 to skip the @ symbol
        const username = ctx.message?.text?.substring(start, start + mention.length - 1);
        return username;
    });

    // Get chess.com usernames for both users
    const chessUsernamePromises = usernames.map(username => getChessUsername(username || ''));
    const chessUsernames = await Promise.all(chessUsernamePromises);
    
    if (chessUsernames.includes(null)) {
        return ctx.reply("⚠️ One or both users haven't registered their Chess.com username. They should use /start first.");
    }

    const [player1, player2] = chessUsernames.filter(u => u !== null) as string[];
    
    try {
        // Get current month's archives for player1
        const archivesRes = await fetch(`https://api.chess.com/pub/player/${player1}/games/archives`);
        if (!archivesRes.ok) {
            return ctx.reply("⚠️ Error fetching game archives. Please try again later.");
        }

        const archives = await archivesRes.json();
        const currentMonth = archives.archives[archives.archives.length - 1];

        // Get games from current month
        const gamesRes = await fetch(currentMonth);
        if (!gamesRes.ok) {
            return ctx.reply("⚠️ Error fetching games. Please try again later.");
        }

        const { games } = await gamesRes.json();
        
        // Filter games between the two players
        const headToHeadGames = games.filter((game: Game) => 
            (game.white.username.toLowerCase() === player1.toLowerCase() && game.black.username.toLowerCase() === player2.toLowerCase()) ||
            (game.white.username.toLowerCase() === player2.toLowerCase() && game.black.username.toLowerCase() === player1.toLowerCase())
        );

        if (headToHeadGames.length === 0) {
            return ctx.reply(`📊 No games found between @${usernames[0]} and @${usernames[1]} for this month.`);
        }

        // Calculate statistics
        let player1Wins = 0;
        let player2Wins = 0;
        let draws = 0;

        headToHeadGames.forEach((game: Game) => {
            const isPlayer1White = game.white.username.toLowerCase() === player1.toLowerCase();
            const player1Result = isPlayer1White ? game.white.result : game.black.result;
            const player2Result = isPlayer1White ? game.black.result : game.white.result;

            if (player1Result === 'win' || player2Result === 'resigned' || 
                player2Result === 'timeout' || player2Result === 'abandoned') {
                player1Wins++;
            } else if (player2Result === 'win' || player1Result === 'resigned' || 
                player1Result === 'timeout' || player1Result === 'abandoned') {
                player2Wins++;
            } else {
                draws++;
            }
        });

        // Format response
        const response = [
            `📊 Head-to-head stats for this month:`,
            `@${usernames[0]} vs @${usernames[1]}`,
            ``,
            `Total games: ${headToHeadGames.length}`,
            `@${usernames[0]} wins: ${player1Wins}`,
            `@${usernames[1]} wins: ${player2Wins}`,
            `Draws: ${draws}`,
            ``,
            `Last game: ${headToHeadGames[headToHeadGames.length - 1].url}`
        ].join('\n');

        await ctx.reply(response);
    } catch (err) {
        console.error(err);
        ctx.reply("🚨 Error fetching head-to-head stats. Please try again later.");
    }
} 