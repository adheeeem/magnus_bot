// utils/championship.ts
// Championship scoring and daily winner management

import { supabase } from './supabase';
import { getAllUserMappings } from './userMap';
import { fetchChessComGames, fetchLichessGames } from './chessApis';

export interface UserScore {
  telegram_username: string;
  total_score: number;
  updated_at: string;
}

export interface DailyChampion {
  date: string;
  first_place: string;
  second_place?: string;
  third_place?: string;
  first_score: number;
  second_score: number;
  third_score: number;
  win_rate_first: number;
  win_rate_second?: number;
  win_rate_third?: number;
}

export interface PlayerDayStats {
  username: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  weightedScore: number;
  chesscomGames: number;
  lichessGames: number;
}

// Get user's current total score
export async function getUserScore(telegramUsername: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_scores')
      .select('total_score')
      .eq('telegram_username', telegramUsername)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.total_score || 0;
  } catch (error) {
    console.error('Error fetching user score:', error);
    return 0;
  }
}

// Get all user scores sorted by total score
export async function getAllUserScores(): Promise<UserScore[]> {
  try {
    const { data, error } = await supabase
      .from('user_scores')
      .select('*')
      .order('total_score', { ascending: false });

    if (error) {
      console.error('Error fetching user scores:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user scores:', error);
    return [];
  }
}

// Update user's total score
export async function updateUserScore(telegramUsername: string, scoreToAdd: number): Promise<boolean> {
  try {
    // First, ensure user exists in user_scores table
    const { data: existingScore } = await supabase
      .from('user_scores')
      .select('total_score')
      .eq('telegram_username', telegramUsername)
      .single();

    if (!existingScore) {
      // Create new score record
      const { error: insertError } = await supabase
        .from('user_scores')
        .insert({
          telegram_username: telegramUsername,
          total_score: scoreToAdd
        });

      if (insertError) {
        console.error('Error creating user score:', insertError);
        return false;
      }
    } else {
      // Update existing score
      const { error: updateError } = await supabase
        .from('user_scores')
        .update({
          total_score: (existingScore.total_score || 0) + scoreToAdd
        })
        .eq('telegram_username', telegramUsername);

      if (updateError) {
        console.error('Error updating user score:', updateError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating user score:', error);
    return false;
  }
}

// Get today's leaderboard for championship determination
export async function getTodaysLeaderboard(date: Date): Promise<PlayerDayStats[]> {
  // Get user mappings from Supabase
  const userMap = await getAllUserMappings();
  
  if (Object.keys(userMap).length === 0) {
    return [];
  }

  // Initialize stats for all players
  const playerStats = new Map<string, PlayerDayStats>();
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

  // Get start of day in Tajikistan time
  const startDate = getStartOfDayTajikistan(date);
  
  // Process games for each player
  await Promise.all(Object.entries(userMap).map(async ([tgUsername, userMappings]) => {
    try {
      // Process Chess.com games
      if (userMappings.chess) {
        await processChessComGamesForDay(userMappings.chess, tgUsername, startDate, date, playerStats);
      }
      
      // Process Lichess games
      if (userMappings.lichess) {
        await processLichessGamesForDay(userMappings.lichess, tgUsername, startDate, date, playerStats);
      }
    } catch (error) {
      console.error(`Error processing games for ${tgUsername}:`, error);
    }
  }));

  // Return sorted players with at least 3 games
  return [...playerStats.values()]
    .filter(player => player.totalGames >= 3)
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
    });
}

// Save daily champions and award scores
export async function saveDailyChampions(date: Date, leaderboard: PlayerDayStats[]): Promise<DailyChampion | null> {
  if (leaderboard.length === 0) {
    console.log('No qualifying players for daily championship');
    return null;
  }

  const dateStr = date.toISOString().split('T')[0];
  
  try {
    // Check if champions for this date already exist
    const { data: existing } = await supabase
      .from('daily_champions')
      .select('*')
      .eq('date', dateStr)
      .single();

    if (existing) {
      console.log(`Daily champions for ${dateStr} already recorded`);
      return existing;
    }

    const first = leaderboard[0];
    const second = leaderboard[1] || null;
    const third = leaderboard[2] || null;

    // Award scores
    await updateUserScore(first.username, 300);
    if (second) await updateUserScore(second.username, 200);
    if (third) await updateUserScore(third.username, 100);

    // Save champions record
    const championData = {
      date: dateStr,
      first_place: first.username,
      second_place: second?.username || null,
      third_place: third?.username || null,
      first_score: 300,
      second_score: 200,
      third_score: 100,
      win_rate_first: first.winRate,
      win_rate_second: second?.winRate || null,
      win_rate_third: third?.winRate || null
    };

    const { data, error } = await supabase
      .from('daily_champions')
      .insert(championData)
      .select()
      .single();

    if (error) {
      console.error('Error saving daily champions:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in saveDailyChampions:', error);
    return null;
  }
}

// Get recent daily champions
export async function getRecentChampions(limit: number = 7): Promise<DailyChampion[]> {
  try {
    const { data, error } = await supabase
      .from('daily_champions')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent champions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching recent champions:', error);
    return [];
  }
}

// Helper function to get start of day in Tajikistan time
function getStartOfDayTajikistan(date: Date): Date {
  const tajikTime = getTajikistanTime(date);
  const tajikMidnight = new Date(
    tajikTime.getFullYear(),
    tajikTime.getMonth(),
    tajikTime.getDate(),
    0, 0, 0, 0
  );
  return new Date(tajikMidnight.getTime() - (5 * 60 * 60 * 1000));
}

// Helper function to get Tajikistan time (GMT+5)
function getTajikistanTime(date: Date): Date {
  const utcTime = date.getTime();
  return new Date(utcTime + (5 * 60 * 60 * 1000));
}

// Process Chess.com games for a specific day
async function processChessComGamesForDay(
  chessUsername: string,
  tgUsername: string,
  startDate: Date,
  endDate: Date,
  playerStats: Map<string, PlayerDayStats>
): Promise<void> {
  try {
    console.log(`[Debug] Processing Chess.com games for ${tgUsername} -> ${chessUsername}`);
    
    // Get archives
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${chessUsername}/games/archives`);
    if (!archivesRes.ok) return;

    const archives = await archivesRes.json();
    const currentMonth = archives.archives[archives.archives.length - 1];
    
    // Get games from current month
    const gamesRes = await fetch(currentMonth);
    if (!gamesRes.ok) return;

    const data = await gamesRes.json();
    const games = data.games || [];
    console.log(`[Debug] Fetched ${games.length} Chess.com games for ${chessUsername}`);

    games.forEach((game: any) => {
      const gameEndTime = new Date(game.end_time * 1000);
      const gameEndTimeTajikistan = getTajikistanTime(gameEndTime);
      const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
      const targetDateStr = getTajikistanTime(endDate).toISOString().split('T')[0];
      
      if (gameDateStr === targetDateStr) {
        console.log(`[Debug] Found Chess.com game for ${tgUsername} at ${gameEndTime.toISOString()}`);
        const stats = processGame(game, chessUsername, 'chess.com');
        updatePlayerStats(tgUsername, stats, playerStats);
      }
    });
  } catch (error) {
    console.error(`Error processing Chess.com games for ${tgUsername}:`, error);
  }
}

// Process Lichess games for a specific day
async function processLichessGamesForDay(
  lichessUsername: string,
  tgUsername: string,
  startDate: Date,
  endDate: Date,
  playerStats: Map<string, PlayerDayStats>
): Promise<void> {
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
      return;
    }
    
    console.log(`[Debug] Fetched ${games.length} Lichess games for ${lichessUsername}`);

    // Process each game
    games.forEach((game: any) => {
      const timestamp = game.lastMoveAt || game.createdAt;
      const gameEndTime = new Date(timestamp);
      const gameEndTimeTajikistan = getTajikistanTime(gameEndTime);
      const gameDateStr = gameEndTimeTajikistan.toISOString().split('T')[0];
      const targetDateStr = getTajikistanTime(endDate).toISOString().split('T')[0];

      if (gameDateStr === targetDateStr) {
        console.log(`[Debug] Processing Lichess game ${game.id} for ${lichessUsername}`);
        const stats = processGame(game, lichessUsername, 'lichess');
        console.log(`[Debug] Game ${game.id} stats: wins=${stats.wins}, losses=${stats.losses}`);
        updatePlayerStats(tgUsername, stats, playerStats);
      }
    });
  } catch (error) {
    console.error(`Error processing Lichess games for ${tgUsername}:`, error);
  }
}

// Game processing helper (copied from top/index.ts)
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
  }

  return { wins, losses };
}

// Update player stats helper (copied from top/index.ts)
function updatePlayerStats(username: string, { wins, losses }: { wins: number; losses: number }, playerStats: Map<string, PlayerDayStats>) {
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
