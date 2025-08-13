import { Context } from "grammy";
import { getAllUserMappings } from "../../utils/userMap";
import { fetchLichessGames } from "../../utils/chessApis";
import { getAllUserScores } from "../../utils/championship";

interface PlayerStats {
    username: string;
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
    weightedScore: number;
    chesscomGames: number;
    lichessGames: number;
}

const COMMAND_DESCRIPTIONS = {
    default: "Shows overall monthly leaderboard for all game types",
    bugun: "Shows today's top players - Top 3 earn championship points!",
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
        "🏆 Championship System:",
        "• Daily awards: 🥇300pts, 🥈200pts, 🥉100pts",
        "• Need 3+ games to qualify for daily championship",
        "• Points awarded daily at 23:55 Tajikistan time",
        "",
        "📊 Ranking System:",
        "• Weighted Score = Win Rate × √(Games) × 100",
        "• Rewards both skill and game volume",
        "• Fair to all playing styles",
        "",
        "Use /standings to see championship standings!",
        "Use any /top command to see the corresponding leaderboard!"
    ].join('\n');
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

        // Initialize stats for all players from both platforms
        const playerStats = new Map<string, PlayerStats>();
        for (const [tgUsername, userMappings] of Object.entries(userMap)) {
            // Initialize stats for this telegram user
            playerStats.set(tgUsername, {
                username: tgUsername,
                wins: 0,
                losses: 0,
                totalGames: 0,
                winRate: 0,
                weightedScore: 0,
                chesscomGames: 0,
                lichessGames: 0
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

        // Track game counts by platform
        const gameCounts = { chesscom: 0, lichess: 0 };

        // Fetch and process games for each player
        await Promise.all(Object.entries(userMap).map(async ([tgUsername, userMappings]) => {
            try {
                console.log(`[Debug] Processing ${tgUsername} - Chess.com: ${userMappings.chess || 'none'}, Lichess: ${userMappings.lichess || 'none'}`);
                
                // Process Chess.com games if user has Chess.com account
                if (userMappings.chess) {
                    const chesscomCount = await processChessComGames(userMappings.chess, tgUsername, option, startDate, now, playerStats);
                    const stats = playerStats.get(tgUsername);
                    if (stats) {
                        stats.chesscomGames = chesscomCount;
                    }
                    gameCounts.chesscom += chesscomCount;
                }
                
                // Process Lichess games if user has Lichess account
                if (userMappings.lichess) {
                    const lichessCount = await processLichessGames(userMappings.lichess, tgUsername, option, startDate, now, playerStats);
                    const stats = playerStats.get(tgUsername);
                    if (stats) {
                        stats.lichessGames = lichessCount;
                    }
                    gameCounts.lichess += lichessCount;
                }
                
            } catch (error) {
                console.error(`Error processing games for ${tgUsername}:`, error);
            }
        }));

        // Sort players by weighted score (fairest ranking system)
        const sortedPlayers = [...playerStats.values()]
            .sort((a, b) => {
                if (b.weightedScore !== a.weightedScore) {
                    return b.weightedScore - a.weightedScore;
                }
                // Tiebreaker: higher win rate wins
                if (b.winRate !== a.winRate) {
                    return b.winRate - a.winRate;
                }
                // Final tiebreaker: more wins
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
        const userScores = await getAllUserScores();
        const scoresMap = new Map(userScores.map(score => [score.telegram_username, score.total_score]));
        
        let currentRank = 1;
        
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            
            // Check if this player is tied with the previous player
            if (i > 0) {
                const prevPlayer = sortedPlayers[i - 1];
                // Players are truly tied only if they have same weighted score
                const isTied = Math.abs(player.weightedScore - prevPlayer.weightedScore) < 0.01; // Account for floating point precision
                
                // If not tied, increment rank by 1 (consecutive ranking)
                if (!isTied) {
                    currentRank++;
                }
                // Otherwise, keep the same rank (true tie)
            }
            
            const championshipScore = scoresMap.get(player.username) || 0;
            const scoreDisplay = championshipScore > 0 ? ` [${championshipScore}pts]` : '';
            
            playerLines.push(
                `${getPositionEmoji(currentRank)} ${player.username}: ${player.weightedScore.toFixed(1)} score (${player.winRate.toFixed(1)}% • ${player.totalGames}g) [♟️${player.chesscomGames} 🏰${player.lichessGames}]${scoreDisplay}`
            );
        }

        let response = [
            title,
            description,
            ""
        ];
        
        // Add championship info for daily leaderboards
        if (option === 'bugun') {
            response.push("🏆 Daily Championship: Top 3 earn points at day end!");
            response.push("Weighted Score = Win Rate × √(Games) × 100 | Need 3+ games");
            response.push("");
        }
        
        response.push(...playerLines);
        response.push("");
        
        if (option === 'bugun') {
            response.push("Use /standings to see championship standings");
        }
        
        response.push("Type /top help to see all available commands.");

        await ctx.reply(response.join('\n'));

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
        
        // Calculate weighted score: Win Rate × √(Games Played) × Weight Factor
        const WEIGHT_FACTOR = 100;
        stats.weightedScore = stats.totalGames >= 3 ? 
            (stats.winRate / 100) * Math.sqrt(stats.totalGames) * WEIGHT_FACTOR : 0;
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

// Helper function to process Chess.com games
async function processChessComGames(
    chessUsername: string,
    tgUsername: string,
    option: string,
    startDate: Date,
    now: Date,
    playerStats: Map<string, PlayerStats>
): Promise<number> {
    let processedGames = 0;
    
    try {
        console.log(`[Debug] Processing Chess.com games for ${tgUsername} -> ${chessUsername}`);
        
        // Get archives
        const archivesRes = await fetch(`https://api.chess.com/pub/player/${chessUsername}/games/archives`);
        if (!archivesRes.ok) {
            console.log(`[Debug] Failed to fetch Chess.com archives for ${chessUsername}`);
            return 0;
        }

        const archives = await archivesRes.json();
        const currentMonth = archives.archives[archives.archives.length - 1];

        // Get games from current month
        const gamesRes = await fetch(currentMonth);
        if (!gamesRes.ok) {
            console.log(`[Debug] Failed to fetch Chess.com games for ${chessUsername}`);
            return 0;
        }

        const data = await gamesRes.json();
        const games = data.games || [];
        console.log(`[Debug] Fetched ${games.length} Chess.com games for ${chessUsername}`);

        // Process each game
        games.forEach((game: any) => {
            const gameEndTime = new Date(game.end_time * 1000);
            const gameEndTimeTajikistan = getTajikistanTime(gameEndTime);

            // Date filtering
            if (option === 'bugun') {
                const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
                const todayDateStr = getTajikistanTime(now).toISOString().split('T')[0];
                if (gameDateStr !== todayDateStr) return;
            } else {
                if (gameEndTimeTajikistan < startDate) return;
            }

            // Game type filtering
            if (option && ['blitz', 'bullet', 'rapid'].includes(option) && game.time_class !== option) {
                return;
            }

            const stats = processGame(game, chessUsername, 'chess.com');
            updatePlayerStats(tgUsername, stats, playerStats);
            processedGames++;
        });
    } catch (error) {
        console.error(`Error processing Chess.com games for ${tgUsername}:`, error);
    }
    
    return processedGames;
}

// Helper function to process Lichess games
async function processLichessGames(
    lichessUsername: string,
    tgUsername: string,
    option: string,
    startDate: Date,
    now: Date,
    playerStats: Map<string, PlayerStats>
): Promise<number> {
    let processedGames = 0;
    
    try {
        console.log(`[Debug] Processing Lichess games for ${tgUsername} -> ${lichessUsername}`);
        
        // Calculate date filtering
        let sinceTimestamp: number;
        let untilTimestamp: number = Date.now();
        
        if (option === 'bugun') {
            sinceTimestamp = startDate.getTime();
            console.log(`[Debug] Lichess today filter: ${new Date(sinceTimestamp).toISOString()} to ${new Date(untilTimestamp).toISOString()}`);
        } else {
            sinceTimestamp = startDate.getTime();
            console.log(`[Debug] Lichess monthly filter: ${new Date(sinceTimestamp).toISOString()} to ${new Date(untilTimestamp).toISOString()}`);
        }
        
        const games = await fetchLichessGames(lichessUsername, sinceTimestamp, untilTimestamp);
        if (!games) {
            console.log(`[Debug] No games returned from Lichess API for ${lichessUsername}`);
            return 0;
        }
        
        console.log(`[Debug] Fetched ${games.length} Lichess games for ${lichessUsername}`);
        
        // Log first few games for debugging
        if (games.length > 0) {
            console.log(`[Debug] Sample Lichess games for ${lichessUsername}:`);
            games.slice(0, 3).forEach((game: any, index: number) => {
                const gameTime = new Date(game.lastMoveAt || game.createdAt);
                console.log(`  Game ${index + 1}: ${game.id}`);
                console.log(`    Time: ${gameTime.toISOString()}`);
                console.log(`    Speed: ${game.speed}, Status: ${game.status}`);
                console.log(`    Players: ${game.players.white.user?.name} vs ${game.players.black.user?.name}`);
                console.log(`    Winner: ${game.winner || 'draw'}`);
            });
        }

        // Process each game
        games.forEach((game: any) => {
            const timestamp = game.lastMoveAt || game.createdAt;
            const gameEndTime = new Date(timestamp);
            const gameEndTimeTajikistan = getTajikistanTime(gameEndTime);

            console.log(`[Debug] Processing Lichess game ${game.id} for ${lichessUsername} at ${gameEndTime.toISOString()}`);

            // Date filtering
            if (option === 'bugun') {
                const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
                const todayDateStr = getTajikistanTime(now).toISOString().split('T')[0];
                console.log(`[Debug] Date comparison for ${game.id}: game=${gameDateStr}, today=${todayDateStr}`);
                if (gameDateStr !== todayDateStr) {
                    console.log(`[Debug] Skipping Lichess game ${game.id} - wrong date`);
                    return;
                }
            } else {
                if (gameEndTimeTajikistan < startDate) {
                    console.log(`[Debug] Skipping Lichess game ${game.id} - before start date`);
                    return;
                }
            }

            // Game type filtering
            if (option && ['blitz', 'bullet', 'rapid'].includes(option) && game.speed !== option) {
                console.log(`[Debug] Skipping Lichess game ${game.id} - wrong type: ${game.speed} != ${option}`);
                return;
            }

            const stats = processGame(game, lichessUsername, 'lichess');
            console.log(`[Debug] Lichess game ${game.id} processed - wins: ${stats.wins}, losses: ${stats.losses}`);
            updatePlayerStats(tgUsername, stats, playerStats);
            processedGames++;
        });
    } catch (error) {
        console.error(`Error processing Lichess games for ${tgUsername}:`, error);
    }
    
    return processedGames;
}

// Helper function to get Tajikistan time (GMT+5)
function getTajikistanTime(date: Date): Date {
    // Get the UTC timestamp
    const utcTime = date.getTime();
    // Convert to Tajikistan time (GMT+5)
    return new Date(utcTime + (5 * 60 * 60 * 1000));
}