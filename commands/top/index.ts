import { Context } from "grammy";
import { getAllUserMappings } from "../../utils/userMap";
import { fetchLichessGames } from "../../utils/chessApis";

interface PlayerStats {
    username: string;
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
}

const COMMAND_DESCRIPTIONS = {
    default: "Shows overall monthly leaderboard for all game types",
    bugun: "Shows today's top players across all game types",
    blitz: "Shows monthly leaderboard for blitz games (3-5 minutes)",
    bullet: "Shows monthly leaderboard for bullet games (1-2 minutes)",
    rapid: "Shows monthly leaderboard for rapid games (10+ minutes)"
};

function getCommandHelp(): string {
    return [
        "📋 Available /top commands:",
        "",
        "🎮 /top - " + COMMAND_DESCRIPTIONS.default,
        "🌅 /top bugun - " + COMMAND_DESCRIPTIONS.bugun,
        "⚡ /top blitz - " + COMMAND_DESCRIPTIONS.blitz,
        "🔫 /top bullet - " + COMMAND_DESCRIPTIONS.bullet,
        "🏃 /top rapid - " + COMMAND_DESCRIPTIONS.rapid,
        "",
        "Use any command to see the corresponding leaderboard!"
    ].join('\n');
}

// Helper function to get Tajikistan time (GMT+5)
function getTajikistanTime(date: Date): Date {
    // Get the UTC timestamp
    const utcTime = date.getTime();
    // Convert to Tajikistan time (GMT+5)
    return new Date(utcTime + (5 * 60 * 60 * 1000));
}

// Helper function to get start of day in Tajikistan time
function getStartOfDayTajikistan(date: Date): Date {
    const tajikTime = getTajikistanTime(date);

    // Create 00:00 Tajikistan time today and convert back to UTC
    const tajikMidnight = new Date(
        tajikTime.getFullYear(),
        tajikTime.getMonth(),
        tajikTime.getDate(),
        0, 0, 0, 0
    );

    // Convert to UTC by subtracting 5 hours
    return new Date(tajikMidnight.getTime() - (5 * 60 * 60 * 1000));
}

export async function handleZuri(ctx: Context) {
    try {
        // Parse command arguments
        const args = ctx.message?.text?.split(' ') || [];
        const option = args[1]?.toLowerCase() || 'bugun'; // Set 'bugun' as default when no argument provided

        // Show help if "help" is requested
        if (option === 'help') {
            return ctx.reply(getCommandHelp());
        }

        // Get user mappings from Supabase
        const userMap = await getAllUserMappings();
        
        // Check if we have any registered users
        if (Object.keys(userMap).length === 0) {
            return ctx.reply("⚠️ No registered users found. Users can register with /start");
        }

        // Initialize stats for all players
        const playerStats = new Map<string, PlayerStats>();
        for (const [tgUsername, userMappings] of Object.entries(userMap)) {
            // Prioritize Chess.com, fall back to Lichess for now
            const chessUsername = userMappings.chess || userMappings.lichess;
            if (chessUsername) {
                playerStats.set(chessUsername, {
                    username: tgUsername,
                    wins: 0,
                    losses: 0,
                    totalGames: 0,
                    winRate: 0
                });
            }
        }

        const now = new Date();
        console.log('[Debug] Server time (UTC):', now.toISOString());
        let startDate: Date;
        let title: string;
        let description: string;

        if (option === 'bugun') {
            // Get start of today in Tajikistan time
            startDate = getStartOfDayTajikistan(now);
            const tajikNow = getTajikistanTime(now);

            console.log('[Debug] Timezone info:', {
                serverTime: now.toISOString(),
                tajikistanTime: tajikNow.toISOString(),
                startDate: startDate.toISOString(),
                filterCutoff: startDate.toUTCString()
            });
            title = "🏆 Today's Leaderboard";
            description = COMMAND_DESCRIPTIONS.bugun;
        } else {
            // Get start of month in Tajikistan time
            const tajikTime = getTajikistanTime(now);
            startDate = new Date(Date.UTC(
                tajikTime.getFullYear(),
                tajikTime.getMonth(),
                1,
                -5, // 00:00 Tajikistan time in UTC
                0,
                0,
                0
            ));
            title = "🏆 Monthly Leaderboard";
            description = option ? COMMAND_DESCRIPTIONS[option as keyof typeof COMMAND_DESCRIPTIONS] : COMMAND_DESCRIPTIONS.default;
        }

        // Fetch and process games for each player
        await Promise.all(Object.entries(userMap).map(async ([tgUsername, userMappings]) => {
            try {
                // Prioritize Chess.com, fall back to Lichess
                const chessUsername = userMappings.chess || userMappings.lichess;
                if (!chessUsername) {
                    console.log(`[Debug] Skipping ${tgUsername} - no chess username found`);
                    return;
                }

                const platform = userMappings.chess ? 'chess.com' : 'lichess';
                console.log(`[Debug] Processing ${tgUsername} -> ${chessUsername} on ${platform}`);
                let games: any[] = [];

                if (platform === 'chess.com') {
                    // Get archives
                    const archivesRes = await fetch(`https://api.chess.com/pub/player/${chessUsername}/games/archives`);
                    if (!archivesRes.ok) return;

                    const archives = await archivesRes.json();
                    const currentMonth = archives.archives[archives.archives.length - 1];

                    // Get games from current month
                    const gamesRes = await fetch(currentMonth);
                    if (!gamesRes.ok) return;

                    const data = await gamesRes.json();
                    games = data.games || [];
                } else {
                    // Lichess API - use proper date filtering
                    let sinceTimestamp: number;
                    let untilTimestamp: number = Date.now();
                    
                    if (option === 'bugun') {
                        // For today, get start of day in Tajikistan time
                        sinceTimestamp = startDate.getTime();
                        console.log(`[Debug] Lichess today filter: ${new Date(sinceTimestamp).toISOString()} to ${new Date(untilTimestamp).toISOString()}`);
                    } else {
                        // For monthly, get start of month in Tajikistan time  
                        sinceTimestamp = startDate.getTime();
                        console.log(`[Debug] Lichess monthly filter: ${new Date(sinceTimestamp).toISOString()} to ${new Date(untilTimestamp).toISOString()}`);
                    }
                    
                    const lichessGames = await fetchLichessGames(chessUsername, sinceTimestamp, untilTimestamp);
                    games = lichessGames || [];
                    console.log(`[Debug] Fetched ${games.length} Lichess games for ${chessUsername} from ${new Date(sinceTimestamp).toISOString()}`);
                    
                    // Log first few games for debugging
                    if (games.length > 0) {
                        console.log(`[Debug] Sample Lichess games for ${chessUsername}:`);
                        games.slice(0, 3).forEach((game: any, index: number) => {
                            const gameTime = new Date(game.lastMoveAt || game.createdAt);
                            console.log(`  Game ${index + 1}: ${game.id}`);
                            console.log(`    Time: ${gameTime.toISOString()} (${gameTime.getTime()})`);
                            console.log(`    Speed: ${game.speed}, Status: ${game.status}`);
                            console.log(`    Players: ${game.players.white.user?.name} vs ${game.players.black.user?.name}`);
                            console.log(`    Winner: ${game.winner || 'draw'}`);
                        });
                    } else {
                        console.log(`[Debug] No games returned from Lichess API for ${chessUsername}`);
                    }
                }

                // Process each game
                games.forEach((game: any) => {
                    let gameEndTime: Date;

                    if (platform === 'chess.com') {
                        gameEndTime = new Date(game.end_time * 1000);
                    } else {
                        // For Lichess, use lastMoveAt if available, otherwise createdAt
                        // lastMoveAt is when the game actually ended
                        const timestamp = game.lastMoveAt || game.createdAt;
                        gameEndTime = new Date(timestamp);
                    }

                    console.log(`[Debug] Processing ${platform} game for ${chessUsername}: ${game.id || 'unknown'} at ${gameEndTime.toISOString()}`);

                    // Convert game end time to Tajikistan time for comparison
                    const gameEndTimeTajikistan = getTajikistanTime(gameEndTime);

                    // If 'bugun', compare full date string
                    if (option === 'bugun') {
                        const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
                        const todayDateStr = getTajikistanTime(now).toISOString().split('T')[0];
                        console.log(`[Debug] Date comparison for ${game.id || 'unknown'}: game=${gameDateStr}, today=${todayDateStr}`);
                        if (gameDateStr !== todayDateStr) {
                            console.log(`[Debug] Skipping game ${game.id || 'unknown'} - wrong date`);
                            return;
                        }
                    } else {
                        // Monthly filter by Tajikistan time
                        if (gameEndTimeTajikistan < startDate) {
                            console.log(`[Debug] Skipping game ${game.id || 'unknown'} - before start date`);
                            return;
                        }
                    }

                    // Filter by game type if specified
                    let gameType: string;
                    if (platform === 'chess.com') {
                        gameType = game.time_class;
                    } else {
                        gameType = game.speed; // Lichess uses 'speed' field
                    }

                    if (option && ['blitz', 'bullet', 'rapid'].includes(option) && gameType !== option) {
                        console.log(`[Debug] Skipping game ${game.id || 'unknown'} - wrong type: ${gameType} != ${option}`);
                        return;
                    }

                    if (option === 'bugun') {
                        console.log('[Debug] Game time info:', {
                            player: chessUsername,
                            platform,
                            gameEndUTC: gameEndTime.toISOString(),
                            gameEndTajikistan: gameEndTimeTajikistan.toISOString(),
                            isIncluded: gameEndTimeTajikistan >= startDate
                        });
                    }

                    const stats = processGame(game, chessUsername, platform);
                    console.log(`[Debug] Game ${game.id || 'unknown'} processed - wins: ${stats.wins}, losses: ${stats.losses}`);
                    updatePlayerStats(chessUsername, stats, playerStats);
                });
            } catch (error) {
                console.error(`Error processing games for ${tgUsername} (${userMappings.chess || userMappings.lichess}):`, error);
            }
        }));

        // Sort players by win rate
        const sortedPlayers = [...playerStats.values()]
            .sort((a, b) => {
                if (b.winRate !== a.winRate) {
                    return b.winRate - a.winRate;
                }
                return b.wins - a.wins;
            })
            .filter(player => player.totalGames >= 3);

        if (sortedPlayers.length === 0) {
            const timeFrame = option === 'bugun' ? 'today' : 'this month';
            const gameType = ['blitz', 'bullet', 'rapid'].includes(option || '') ? ` for ${option} games` : '';
            const minGamesMsg = "Players need at least 3 games to appear on the leaderboard.";
            return ctx.reply(`📊 No qualifying players found${gameType} ${timeFrame}.\n${minGamesMsg}\n\nType /top help to see all available commands.`);
        }

        // Format response with win rate and proper tie handling
        const playerLines: string[] = [];
        let currentRank = 1;
        
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            
            // Check if this player is tied with the previous player
            if (i > 0) {
                const prevPlayer = sortedPlayers[i - 1];
                // Players are truly tied only if they have same win rate AND same wins
                const isTied = (player.winRate === prevPlayer.winRate && player.wins === prevPlayer.wins);
                
                // If not tied, increment rank by 1 (consecutive ranking)
                if (!isTied) {
                    currentRank++;
                }
                // Otherwise, keep the same rank (true tie)
            }
            
            playerLines.push(
                `${getPositionEmoji(currentRank)} ${player.username}: ${player.winRate.toFixed(1)}% (W: ${player.wins} L: ${player.losses})`
            );
        }

        const response = [
            title,
            description,
            "",
            ...playerLines,
            "",
            "Type /top help to see all available commands."
        ].join('\n');

        await ctx.reply(response);

    } catch (err) {
        console.error(err);
        ctx.reply("🚨 Error generating leaderboard. Type /top help to see available commands.");
    }
}

function processGame(game: any, username: string, platform: string): { wins: number; losses: number } {
    let wins = 0;
    let losses = 0;

    if (platform === 'chess.com') {
        const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
        const playerResult = isWhite ? game.white.result : game.black.result;
        const opponentResult = isWhite ? game.black.result : game.white.result;

        if (playerResult === 'win' || opponentResult === 'resigned' ||
            opponentResult === 'timeout' || opponentResult === 'abandoned') {
            wins++;
        } else if (opponentResult === 'win' || playerResult === 'resigned' ||
            playerResult === 'timeout' || playerResult === 'abandoned') {
            losses++;
        }
    } else {
        // Lichess
        const whitePlayer = game.players.white.user?.name?.toLowerCase();
        const blackPlayer = game.players.black.user?.name?.toLowerCase();
        const winner = game.winner;
        const isWhite = whitePlayer === username.toLowerCase();
        
        if (winner) {
            if ((isWhite && winner === 'white') || (!isWhite && winner === 'black')) {
                wins++;
            } else {
                losses++;
            }
        }
        // Draws are not counted as wins or losses
    }

    return { wins, losses };
}

function updatePlayerStats(username: string, { wins, losses }: { wins: number; losses: number }, playerStats: Map<string, PlayerStats>) {
    const stats = playerStats.get(username);
    if (stats) {
        stats.wins += wins;
        stats.losses += losses;
        stats.totalGames = stats.wins + stats.losses;
        stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;
    }
}

function getPositionEmoji(position: number): string {
    switch (position) {
        case 1: return "🥇";
        case 2: return "🥈";
        case 3: return "🥉";
        default: return `${position}.`;
    }
} 