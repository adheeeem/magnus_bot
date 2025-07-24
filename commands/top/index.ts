import { Context } from "grammy";
import { getAllUserMappings } from "../../utils/userMap";

interface Game {
    end_time: number;
    time_class: string;
    white: {
        username: string;
        result: string;
    };
    black: {
        username: string;
        result: string;
    };
}

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
        for (const [tgUsername, chessUsername] of Object.entries(userMap)) {
            playerStats.set(chessUsername, {
                username: tgUsername,
                wins: 0,
                losses: 0,
                totalGames: 0,
                winRate: 0
            });
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
        await Promise.all(Object.values(userMap).map(async (chessUsername) => {
            try {
                // Get archives
                const archivesRes = await fetch(`https://api.chess.com/pub/player/${chessUsername}/games/archives`);
                if (!archivesRes.ok) return;

                const archives = await archivesRes.json();
                const currentMonth = archives.archives[archives.archives.length - 1];

                // Get games from current month
                const gamesRes = await fetch(currentMonth);
                if (!gamesRes.ok) return;

                const { games } = await gamesRes.json();

                // Process each game
                games.forEach((game: Game) => {
                    // Convert game end time to Tajikistan time for comparison
                    const gameEndTimeUTC = new Date(game.end_time * 1000);
                    const gameEndTimeTajikistan = getTajikistanTime(gameEndTimeUTC);

                    // If 'bugun', compare full date string
                    if (option === 'bugun') {
                        const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
                        const todayDateStr = getTajikistanTime(now).toISOString().split('T')[0];
                        if (gameDateStr !== todayDateStr) return;
                    } else {
                        // Monthly filter by Tajikistan time
                        if (gameEndTimeTajikistan < startDate) return;
                    }

                    // Filter by game type if specified
                    if (option && ['blitz', 'bullet', 'rapid'].includes(option) && game.time_class !== option) {
                        return;
                    }

                    if (option === 'bugun') {
                        console.log('[Debug] Game time info:', {
                            player: chessUsername,
                            gameEndUTC: gameEndTimeUTC.toISOString(),
                            gameEndTajikistan: gameEndTimeTajikistan.toISOString(),
                            isIncluded: gameEndTimeTajikistan >= startDate
                        });
                    }

                    const stats = processGame(game, chessUsername);
                    updatePlayerStats(chessUsername, stats, playerStats);
                });
            } catch (error) {
                console.error(`Error processing games for ${chessUsername}:`, error);
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

function processGame(game: Game, username: string): { wins: number; losses: number } {
    const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
    const playerResult = isWhite ? game.white.result : game.black.result;
    const opponentResult = isWhite ? game.black.result : game.white.result;

    let wins = 0;
    let losses = 0;

    if (playerResult === 'win' || opponentResult === 'resigned' ||
        opponentResult === 'timeout' || opponentResult === 'abandoned') {
        wins++;
    } else if (opponentResult === 'win' || playerResult === 'resigned' ||
        playerResult === 'timeout' || playerResult === 'abandoned') {
        losses++;
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