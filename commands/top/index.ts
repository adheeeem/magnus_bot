import { Context } from "grammy";
import { getAllUserMappings } from "../../utils/userMap";
import { getAllUserScores } from "../../utils/championship";
import { PlayerStats, processChessComGames, processLichessGames } from "../../utils/gameStats";
import { getStartOfDayTajikistan, getTajikistanTime } from "../../utils/timeUtils";

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

export async function handleZuri(ctx: Context) {
    try {
        const args = ctx.message?.text?.split(' ') || [];
        const option = args[1]?.toLowerCase() || 'bugun';

        if (option === 'help') {
            return ctx.reply(getCommandHelp());
        }

        // Get user mappings from Supabase
        const userMap = await getAllUserMappings();
        
        if (Object.keys(userMap).length === 0) {
            return ctx.reply("⚠️ No registered users found. Users can register with /start");
        }

        // Initialize stats for all players
        const playerStats = new Map<string, PlayerStats>();
        for (const [tgUsername] of Object.entries(userMap)) {
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

        // Process games for each player using shared utilities
        await Promise.all(Object.entries(userMap).map(async ([tgUsername, userMappings]) => {
            try {
                console.log(`[Debug] Processing ${tgUsername} - Chess.com: ${userMappings.chess || 'none'}, Lichess: ${userMappings.lichess || 'none'}`);
                
                // Process Chess.com games if user has Chess.com account
                if (userMappings.chess) {
                    const chesscomCount = await processChessComGames(
                        userMappings.chess,
                        tgUsername,
                        startDate,
                        now,
                        playerStats,
                        option
                    );
                    gameCounts.chesscom += chesscomCount;
                }
                
                // Process Lichess games if user has Lichess account
                if (userMappings.lichess) {
                    const lichessCount = await processLichessGames(
                        userMappings.lichess,
                        tgUsername,
                        startDate,
                        now,
                        playerStats,
                        option
                    );
                    gameCounts.lichess += lichessCount;
                }
            } catch (error) {
                console.error(`Error processing games for ${tgUsername}:`, error);
            }
        }));

        // Sort players by weighted score
        const sortedPlayers = [...playerStats.values()]
            .sort((a, b) => {
                if (b.weightedScore !== a.weightedScore) {
                    return b.weightedScore - a.weightedScore;
                }
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

        // Format response
        const playerLines: string[] = [];
        const userScores = await getAllUserScores();
        const scoresMap = new Map(userScores.map(score => [score.telegram_username, score.total_score]));
        
        let currentRank = 1;
        
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            
            if (i > 0) {
                const prevPlayer = sortedPlayers[i - 1];
                const isTied = Math.abs(player.weightedScore - prevPlayer.weightedScore) < 0.01;
                
                if (!isTied) {
                    currentRank++;
                }
            }
            
            const championshipScore = scoresMap.get(player.username) || 0;
            
            playerLines.push(
                `${getPositionEmoji(currentRank)} ${player.username}: ${player.weightedScore.toFixed(1)}`
            );
        }

        let response = [
            title,
            description,
            ""
        ];
        
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

function getPositionEmoji(position: number): string {
    switch (position) {
        case 1: return "🥇";
        case 2: return "🥈";
        case 3: return "🥉";
        default: return `${position}.`;
    }
}