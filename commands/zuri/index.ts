import { Context } from "grammy";

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

interface ExtendedGame {
    id: number;
    baseTime1: number;
    timeIncrement: number;
    user1Rating: number;
    user2Rating: number;
    user1Result: number;
    user2Result: number;
    gameTimeClass: string;
    user1: {
        id: number;
        username: string;
    };
    user2: {
        id: number;
        username: string;
    };
    isTimeout: boolean;
    gameEndTime: string;
}

interface ExtendedArchiveResponse {
    data: ExtendedGame[];
    meta: {
        totalCount: number;
    };
}

interface PlayerStats {
    username: string;
    wins: number;
    losses: number;
    netWins: number;
}

// Store user mappings in a simple object
// Key: Telegram username, Value: chess.com username
const userMap: Record<string, string> = {
    'azimjonfffff': 'adheeeem',
    'rahniz90': 'RahNiz',
    'RahmonovShuhrat': 'shuhratrahmonov',
    'aisoqov': 'guaje032',
    'Akhmedov_Sanjar': 'Sanjar_Akhmedov',
    'knajmitdinov': 'komiljon_najmitdinov',
    'nuriddin_yakubovich': 'Nuriddin_2004',
    'Alisherrik': 'alisherrik'
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
        "📋 Available /zuri commands:",
        "",
        "🎮 /zuri - " + COMMAND_DESCRIPTIONS.default,
        "🌅 /zuri bugun - " + COMMAND_DESCRIPTIONS.bugun,
        "⚡ /zuri blitz - " + COMMAND_DESCRIPTIONS.blitz,
        "🔫 /zuri bullet - " + COMMAND_DESCRIPTIONS.bullet,
        "🏃 /zuri rapid - " + COMMAND_DESCRIPTIONS.rapid,
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

async function fetchTodaysGames(username: string): Promise<ExtendedGame[]> {
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    
    const url = `https://www.chess.com/callback/games/extended-archive?locale=en_US&username=${username}&endDate[date]=${dateStr}&startDate[date]=${dateStr}&timeSort=desc&location=all`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ExtendedArchiveResponse = await response.json();
        return data.data;
    } catch (error) {
        console.error(`Error fetching games for ${username}:`, error);
        return [];
    }
}

function processExtendedGame(game: ExtendedGame, username: string): { wins: number; losses: number } {
    const isUser1 = game.user1.username.toLowerCase() === username.toLowerCase();
    const userResult = isUser1 ? game.user1Result : game.user2Result;
    
    let wins = 0;
    let losses = 0;

    if (userResult === 1.0) {
        wins++;
    } else if (userResult === 0.0) {
        losses++;
    }
    // Draw (0.5) is not counted

    return { wins, losses };
}

export async function handleZuri(ctx: Context) {
    try {
        // Parse command arguments
        const args = ctx.message?.text?.split(' ') || [];
        const option = args[1]?.toLowerCase();

        // Show help if "help" is requested
        if (option === 'help') {
            return ctx.reply(getCommandHelp());
        }

        // Check if we have any registered users
        if (Object.keys(userMap).length === 0) {
            return ctx.reply("⚠️ No registered users found.");
        }

        // Initialize stats for all players
        const playerStats = new Map<string, PlayerStats>();
        for (const [tgUsername, chessUsername] of Object.entries(userMap)) {
            playerStats.set(chessUsername, {
                username: tgUsername,
                wins: 0,
                losses: 0,
                netWins: 0
            });
        }

        let title: string;
        let description: string;

        if (option === 'bugun') {
            title = "🏆 Today's Leaderboard";
            description = COMMAND_DESCRIPTIONS.bugun;

            // Fetch today's games for all players using the new API
            await Promise.all(Object.values(userMap).map(async (chessUsername) => {
                try {
                    const games = await fetchTodaysGames(chessUsername);
                    
                    // Process each game
                    games.forEach(game => {
                        const stats = processExtendedGame(game, chessUsername);
                        updatePlayerStats(chessUsername, stats, playerStats);
                    });
                } catch (error) {
                    console.error(`Error processing games for ${chessUsername}:`, error);
                }
            }));
        } else {
            // Get start of month in Tajikistan time
            const tajikTime = getTajikistanTime(new Date());
            const startDate = new Date(Date.UTC(
                tajikTime.getFullYear(),
                tajikTime.getMonth(),
                1,
                -5,
                0,
                0,
                0
            ));
            title = "🏆 Monthly Leaderboard";
            description = option ? COMMAND_DESCRIPTIONS[option as keyof typeof COMMAND_DESCRIPTIONS] : COMMAND_DESCRIPTIONS.default;

            // Fetch and process games for each player using the old API
            await Promise.all(Object.values(userMap).map(async (chessUsername) => {
                try {
                    const archivesRes = await fetch(`https://api.chess.com/pub/player/${chessUsername}/games/archives`);
                    if (!archivesRes.ok) return;

                    const archives = await archivesRes.json();
                    const currentMonth = archives.archives[archives.archives.length - 1];

                    const gamesRes = await fetch(currentMonth);
                    if (!gamesRes.ok) return;

                    const { games } = await gamesRes.json();

                    games.forEach((game: Game) => {
                        const gameEndTimeUTC = new Date(game.end_time * 1000);
                        const gameEndTimeTajikistan = getTajikistanTime(gameEndTimeUTC);

                        if (gameEndTimeTajikistan < startDate) return;

                        if (option && ['blitz', 'bullet', 'rapid'].includes(option) && game.time_class !== option) {
                            return;
                        }

                        const stats = processGame(game, chessUsername);
                        updatePlayerStats(chessUsername, stats, playerStats);
                    });
                } catch (error) {
                    console.error(`Error processing games for ${chessUsername}:`, error);
                }
            }));
        }

        // Sort players by net wins
        const sortedPlayers = [...playerStats.values()]
            .sort((a, b) => b.netWins - a.netWins)
            .filter(player => player.wins > 0 || player.losses > 0);

        if (sortedPlayers.length === 0) {
            const timeFrame = option === 'bugun' ? 'today' : 'this month';
            const gameType = ['blitz', 'bullet', 'rapid'].includes(option || '') ? ` for ${option} games` : '';
            return ctx.reply(`📊 No games found${gameType} ${timeFrame}.\n\nType /zuri help to see all available commands.`);
        }

        // Format response
        const response = [
            title,
            description,
            "",
            ...sortedPlayers.map((player, index) =>
                `${getPositionEmoji(index + 1)} ${player.username}: ${player.netWins >= 0 ? '+' : ''}${player.netWins} (W: ${player.wins} L: ${player.losses})`
            ),
            "",
            "Type /zuri help to see all available commands."
        ].join('\n');

        await ctx.reply(response);

    } catch (err) {
        console.error(err);
        ctx.reply("🚨 Error generating leaderboard. Type /zuri help to see available commands.");
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
        stats.netWins = stats.wins - stats.losses;
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