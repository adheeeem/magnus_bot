import { Context } from "grammy";
import * as fs from 'fs/promises';
import * as path from 'path';

interface Game {
    end_time: number;
    time_class: string;  // Added for game type filtering
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
    netWins: number;
}

const CSV_FILE = path.join(process.cwd(), 'users.csv');

async function getAllChessUsernames(): Promise<Map<string, string>> {
    try {
        const content = await fs.readFile(CSV_FILE, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const usernameMap = new Map<string, string>();
        
        for (const line of lines) {
            const [tgUsername, chessUsername] = line.split(',');
            if (tgUsername && chessUsername) {
                usernameMap.set(chessUsername.trim(), tgUsername.trim());
            }
        }
        return usernameMap;
    } catch {
        return new Map();
    }
}

export async function handleZuri(ctx: Context) {
    try {
        // Parse command arguments
        const args = ctx.message?.text?.split(' ') || [];
        const option = args[1]?.toLowerCase();

        // Get all registered chess.com usernames
        const usernameMap = await getAllChessUsernames();
        if (usernameMap.size === 0) {
            return ctx.reply("⚠️ No registered users found. Users should use /start first.");
        }

        // Initialize stats for all players
        const playerStats = new Map<string, PlayerStats>();
        for (const [chessUsername, tgUsername] of usernameMap) {
            playerStats.set(chessUsername, {
                username: tgUsername,
                wins: 0,
                losses: 0,
                netWins: 0
            });
        }

        // Set date range based on command
        const now = new Date();
        let startDate: Date;
        let title: string;

        if (option === 'bugin') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            title = "🏆 Today's Leaderboard";
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            title = "🏆 Monthly Leaderboard";
        }

        // Fetch and process games for each player
        await Promise.all([...usernameMap.keys()].map(async (username) => {
            try {
                // Get archives
                const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
                if (!archivesRes.ok) return;
                
                const archives = await archivesRes.json();
                const currentMonth = archives.archives[archives.archives.length - 1];

                // Get games from current month
                const gamesRes = await fetch(currentMonth);
                if (!gamesRes.ok) return;

                const { games } = await gamesRes.json();
                
                // Process each game
                games.forEach((game: Game) => {
                    const gameEndTime = new Date(game.end_time * 1000);
                    
                    // Filter by date
                    if (gameEndTime < startDate) return;

                    // Filter by game type if specified
                    if (option && ['blitz', 'bullet', 'rapid'].includes(option) && game.time_class !== option) {
                        return;
                    }

                    const stats = processGame(game, username);
                    updatePlayerStats(username, stats, playerStats);
                });
            } catch (error) {
                console.error(`Error processing games for ${username}:`, error);
            }
        }));

        // Sort players by net wins
        const sortedPlayers = [...playerStats.values()]
            .sort((a, b) => b.netWins - a.netWins)
            .filter(player => player.wins > 0 || player.losses > 0);

        if (sortedPlayers.length === 0) {
            const timeFrame = option === 'bugin' ? 'today' : 'this month';
            const gameType = ['blitz', 'bullet', 'rapid'].includes(option || '') ? ` for ${option} games` : '';
            return ctx.reply(`📊 No games found${gameType} ${timeFrame}.`);
        }

        // Format response
        let subtitle = '';
        if (['blitz', 'bullet', 'rapid'].includes(option || '')) {
            subtitle = `Game type: ${option}\n`;
        }

        const response = [
            title,
            subtitle,
            ...sortedPlayers.map((player, index) => 
                `${getPositionEmoji(index + 1)} @${player.username}: ${player.netWins >= 0 ? '+' : ''}${player.netWins} (W: ${player.wins} L: ${player.losses})`
            )
        ].join('\n');

        await ctx.reply(response);

    } catch (err) {
        console.error(err);
        ctx.reply("🚨 Error generating leaderboard.");
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