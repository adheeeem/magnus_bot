import { Context } from "grammy";
import { getUserMappings } from "../../utils/userMap";
import { fetchChessComGames, fetchLichessGames } from "../../utils/chessApis";

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

    // Get chess platform usernames for both users
    const userMappingPromises = usernames.map(username => getUserMappings(username || ''));
    const userMappingsArray = await Promise.all(userMappingPromises);
    
    if (userMappingsArray.some(mapping => !mapping || (!mapping.chess && !mapping.lichess))) {
      return ctx.reply("⚠️ One or both users haven't registered any chess platform usernames. They should use /start first.");
    }

    const [user1Mappings, user2Mappings] = userMappingsArray.filter(m => m !== null) as Array<{ chess: string | null; lichess: string | null }>;
    
    // For now, prioritize Chess.com for head-to-head comparison, fall back to Lichess
    const player1 = user1Mappings.chess || user1Mappings.lichess;
    const player2 = user2Mappings.chess || user2Mappings.lichess;
    
    if (!player1 || !player2) {
      return ctx.reply("⚠️ Unable to determine chess usernames for comparison.");
    }
    
    const platform = (user1Mappings.chess && user2Mappings.chess) ? 'chess.com' : 'lichess';    try {
        let headToHeadGames: any[] = [];
        let totalGames1 = 0, wins1 = 0, totalGames2 = 0, wins2 = 0;

        if (platform === 'chess.com') {
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
            headToHeadGames = games.filter((game: any) => 
                (game.white.username.toLowerCase() === player1.toLowerCase() && game.black.username.toLowerCase() === player2.toLowerCase()) ||
                (game.white.username.toLowerCase() === player2.toLowerCase() && game.black.username.toLowerCase() === player1.toLowerCase())
            );

            // Count wins for each player
            for (const game of headToHeadGames) {
                if (game.white.username.toLowerCase() === player1.toLowerCase()) {
                    totalGames1++;
                    if (game.white.result === 'win') wins1++;
                } else {
                    totalGames2++;
                    if (game.black.result === 'win') wins2++;
                }
                
                if (game.black.username.toLowerCase() === player1.toLowerCase()) {
                    totalGames1++;
                    if (game.black.result === 'win') wins1++;
                } else {
                    totalGames2++;
                    if (game.white.result === 'win') wins2++;
                }
            }
        } else {
            // Lichess API
            const now = Date.now();
            const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
            
            const games1 = await fetchLichessGames(player1, oneMonthAgo, now);
            const games2 = await fetchLichessGames(player2, oneMonthAgo, now);
            
            if (!games1 || !games2) {
                return ctx.reply("⚠️ Error fetching games from Lichess. Please try again later.");
            }

            // Filter head-to-head games from both player's game lists
            const allGames = [...games1, ...games2];
            const gameIds = new Set();
            
            headToHeadGames = allGames.filter(game => {
                const player1Name = game.players.white.user?.name?.toLowerCase();
                const player2Name = game.players.black.user?.name?.toLowerCase();
                const isHeadToHead = (
                    (player1Name === player1.toLowerCase() && player2Name === player2.toLowerCase()) ||
                    (player1Name === player2.toLowerCase() && player2Name === player1.toLowerCase())
                );
                
                if (isHeadToHead && !gameIds.has(game.id)) {
                    gameIds.add(game.id);
                    return true;
                }
                return false;
            });

            // Count wins for each player
            for (const game of headToHeadGames) {
                const whitePlayer = game.players.white.user?.name?.toLowerCase();
                const blackPlayer = game.players.black.user?.name?.toLowerCase();
                const winner = game.winner;
                
                if (whitePlayer === player1.toLowerCase()) {
                    totalGames1++;
                    if (winner === 'white') wins1++;
                } else if (blackPlayer === player1.toLowerCase()) {
                    totalGames1++;
                    if (winner === 'black') wins1++;
                }
                
                if (whitePlayer === player2.toLowerCase()) {
                    totalGames2++;
                    if (winner === 'white') wins2++;
                } else if (blackPlayer === player2.toLowerCase()) {
                    totalGames2++;
                    if (winner === 'black') wins2++;
                }
            }
        }

        if (headToHeadGames.length === 0) {
            return ctx.reply(`📊 No games found between @${usernames[0]} and @${usernames[1]} for this month on ${platform}.`);
        }

        // Calculate statistics (different logic for each platform)
        let player1Wins = 0;
        let player2Wins = 0;
        let draws = 0;

        if (platform === 'chess.com') {
            headToHeadGames.forEach((game: any) => {
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
        } else {
            // Lichess games
            headToHeadGames.forEach((game: any) => {
                const whitePlayer = game.players.white.user?.name?.toLowerCase();
                const winner = game.winner;
                
                if (!winner) {
                    draws++;
                } else if ((whitePlayer === player1.toLowerCase() && winner === 'white') ||
                          (whitePlayer !== player1.toLowerCase() && winner === 'black')) {
                    player1Wins++;
                } else {
                    player2Wins++;
                }
            });
        }

        // Format response
        const lastGameUrl = platform === 'chess.com' 
            ? headToHeadGames[headToHeadGames.length - 1].url 
            : `https://lichess.org/${headToHeadGames[headToHeadGames.length - 1].id}`;

        const response = [
            `📊 Head-to-head stats for this month (${platform}):`,
            `@${usernames[0]} vs @${usernames[1]}`,
            ``,
            `Total games: ${headToHeadGames.length}`,
            `@${usernames[0]} wins: ${player1Wins}`,
            `@${usernames[1]} wins: ${player2Wins}`,
            `Draws: ${draws}`,
            ``,
            `Last game: ${lastGameUrl}`
        ].join('\n');

        await ctx.reply(response);
    } catch (err) {
        console.error(err);
        ctx.reply("🚨 Error fetching head-to-head stats. Please try again later.");
    }
} 