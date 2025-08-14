// Shared game statistics utilities used by both /top command and daily championship
import { getTajikistanTime } from './timeUtils';
import { fetchLichessGames } from './chessApis';

export interface PlayerStats {
  username: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  weightedScore: number;
  chesscomGames: number;
  lichessGames: number;
}

// Process a single game from either platform
export function processGame(game: any, username: string, platform: string): { wins: number; losses: number } {
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
  }

  return { wins, losses };
}

// Update player stats with game results
export function updatePlayerStats(username: string, { wins, losses }: { wins: number; losses: number }, playerStats: Map<string, PlayerStats>) {
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

// Process Chess.com games for a time period
export async function processChessComGames(
  chessUsername: string,
  tgUsername: string,
  startDate: Date,
  endDate: Date,
  playerStats: Map<string, PlayerStats>,
  option?: string // For filtering game types in /top command
): Promise<number> {
  let processedGames = 0;
  
  try {
    console.log(`[Debug] Processing Chess.com games for ${tgUsername} -> ${chessUsername}`);
    
    // Get archives
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${chessUsername}/games/archives`);
    if (!archivesRes.ok) return 0;

    const archives = await archivesRes.json();
    const currentMonth = archives.archives[archives.archives.length - 1];
    
    // Get games from current month
    const gamesRes = await fetch(currentMonth);
    if (!gamesRes.ok) return 0;

    const data = await gamesRes.json();
    const games = data.games || [];
    console.log(`[Debug] Fetched ${games.length} Chess.com games for ${chessUsername}`);

    games.forEach((game: any) => {
      const gameEndTime = new Date(game.end_time * 1000);
      const gameEndTimeTajikistan = getTajikistanTime(gameEndTime);

      // Date filtering
      const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
      const targetDateStr = getTajikistanTime(endDate).toISOString().split('T')[0];
      
      // Skip if game is not from target date
      if (gameDateStr !== targetDateStr) return;

      // Game type filtering (for /top command)
      if (option && ['blitz', 'bullet', 'rapid'].includes(option) && game.time_class !== option) {
        return;
      }

      console.log(`[Debug] Found Chess.com game for ${tgUsername} at ${gameEndTime.toISOString()}`);
      const stats = processGame(game, chessUsername, 'chess.com');
      updatePlayerStats(tgUsername, stats, playerStats);
      processedGames++;
    });
  } catch (error) {
    console.error(`Error processing Chess.com games for ${tgUsername}:`, error);
  }
  
  return processedGames;
}

// Process Lichess games for a time period
export async function processLichessGames(
  lichessUsername: string,
  tgUsername: string,
  startDate: Date,
  endDate: Date,
  playerStats: Map<string, PlayerStats>,
  option?: string // For filtering game types in /top command
): Promise<number> {
  let processedGames = 0;
  
  try {
    console.log(`[Debug] Processing Lichess games for ${tgUsername} -> ${lichessUsername}`);
    
    // Convert dates to UTC timestamps
    const sinceTimestamp = startDate.getTime();
    const untilTimestamp = endDate.getTime() + 24 * 60 * 60 * 1000; // Include full day
    
    console.log(`[Debug] Lichess date filter:`, {
      start: new Date(sinceTimestamp).toISOString(),
      end: new Date(untilTimestamp).toISOString()
    });
    
    const games = await fetchLichessGames(lichessUsername, sinceTimestamp, untilTimestamp);
    if (!games) {
      console.log(`[Debug] No games returned from Lichess API for ${lichessUsername}`);
      return 0;
    }
    
    console.log(`[Debug] Fetched ${games.length} Lichess games for ${lichessUsername}`);

    games.forEach((game: any) => {
      const timestamp = game.lastMoveAt || game.createdAt;
      const gameEndTime = new Date(timestamp);
      const gameEndTimeTajikistan = getTajikistanTime(gameEndTime);
      const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
      const targetDateStr = getTajikistanTime(endDate).toISOString().split('T')[0];

      // Skip if game is not from target date
      if (gameDateStr !== targetDateStr) return;

      // Game type filtering (for /top command)
      if (option && ['blitz', 'bullet', 'rapid'].includes(option) && game.speed !== option) {
        return;
      }

      console.log(`[Debug] Processing Lichess game ${game.id} for ${lichessUsername}`);
      const stats = processGame(game, lichessUsername, 'lichess');
      console.log(`[Debug] Game ${game.id} stats: wins=${stats.wins}, losses=${stats.losses}`);
      updatePlayerStats(tgUsername, stats, playerStats);
      processedGames++;
    });
  } catch (error) {
    console.error(`Error processing Lichess games for ${tgUsername}:`, error);
  }
  
  return processedGames;
}