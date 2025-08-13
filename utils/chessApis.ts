// utils/chessApis.ts
// Utility functions for fetching data from Chess.com and Lichess APIs

export interface ChessComRating {
  last?: { rating: number };
}

export interface ChessComStats {
  chess_rapid?: ChessComRating;
  chess_blitz?: ChessComRating;
  chess_bullet?: ChessComRating;
  tactics?: { highest?: { rating: number } };
  puzzle_rush?: { best?: { score: number } };
}

export interface LichessPerf {
  rating?: number;
  games?: number;
}

export interface LichessStats {
  perfs?: {
    rapid?: LichessPerf;
    blitz?: LichessPerf;
    bullet?: LichessPerf;
    puzzle?: LichessPerf;
  };
}

export interface ChessComGame {
  end_time: number;
  time_class: string;
  white: {
    username: string;
    result: string;
    rating?: number;
  };
  black: {
    username: string;
    result: string;
    rating?: number;
  };
  url?: string;
  pgn?: string;
  time_control?: string;
  rated?: boolean;
  accuracies?: {
    white: number;
    black: number;
  };
}

export interface LichessGame {
  id: string;
  rated: boolean;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: {
      user?: { name: string };
      rating?: number;
    };
    black: {
      user?: { name: string };
      rating?: number;
    };
  };
  winner?: 'white' | 'black';
}

// Chess.com API functions
export async function fetchChessComStats(username: string): Promise<ChessComStats | null> {
  try {
    const response = await fetch(`https://api.chess.com/pub/player/${username}/stats`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching Chess.com stats:', error);
    return null;
  }
}

export async function fetchChessComGames(username: string, year: number, month: number): Promise<ChessComGame[] | null> {
  try {
    const monthStr = month.toString().padStart(2, '0');
    const response = await fetch(`https://api.chess.com/pub/player/${username}/games/${year}/${monthStr}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.games || [];
  } catch (error) {
    console.error('Error fetching Chess.com games:', error);
    return null;
  }
}

export async function verifyChessComUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.chess.com/pub/player/${username}`);
    return response.ok;
  } catch (error) {
    console.error('Error verifying Chess.com user:', error);
    return false;
  }
}

// Lichess API functions
export async function fetchLichessStats(username: string): Promise<LichessStats | null> {
  try {
    const response = await fetch(`https://lichess.org/api/user/${username}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching Lichess stats:', error);
    return null;
  }
}

export async function fetchLichessGames(username: string, since?: number, until?: number): Promise<LichessGame[] | null> {
  try {
    let url = `https://lichess.org/api/games/user/${username}?max=100&rated=true`;
    if (since) url += `&since=${since}`;
    if (until) url += `&until=${until}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/x-ndjson'
      }
    });
    
    if (!response.ok) return null;
    
    const text = await response.text();
    const games: LichessGame[] = [];
    
    // Parse NDJSON format
    text.split('\n').forEach(line => {
      if (line.trim()) {
        try {
          games.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
        }
      }
    });
    
    return games;
  } catch (error) {
    console.error('Error fetching Lichess games:', error);
    return null;
  }
}

export async function verifyLichessUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`https://lichess.org/api/user/${username}`);
    return response.ok;
  } catch (error) {
    console.error('Error verifying Lichess user:', error);
    return false;
  }
}

// Combined stats formatting
export function formatCombinedStats(
  username: string,
  chessComStats: ChessComStats | null,
  lichessStats: LichessStats | null
): string {
  let message = `📊 Stats for @${username}:\n\n`;

  if (chessComStats) {
    message += `🏁 **Chess.com**\n`;
    message += `♟ Rapid: ${chessComStats.chess_rapid?.last?.rating ?? "N/A"}\n`;
    message += `⚡ Blitz: ${chessComStats.chess_blitz?.last?.rating ?? "N/A"}\n`;
    message += `💨 Bullet: ${chessComStats.chess_bullet?.last?.rating ?? "N/A"}\n`;
    message += `🧠 Tactics: ${chessComStats.tactics?.highest?.rating ?? "N/A"}\n`;
    message += `📅 Puzzle Rush: ${chessComStats.puzzle_rush?.best?.score ?? "N/A"}\n\n`;
  }

  if (lichessStats) {
    message += `♟️ **Lichess**\n`;
    message += `♟ Rapid: ${lichessStats.perfs?.rapid?.rating ?? "N/A"}\n`;
    message += `⚡ Blitz: ${lichessStats.perfs?.blitz?.rating ?? "N/A"}\n`;
    message += `💨 Bullet: ${lichessStats.perfs?.bullet?.rating ?? "N/A"}\n`;
    message += `🧠 Puzzles: ${lichessStats.perfs?.puzzle?.rating ?? "N/A"}\n`;
  }

  if (!chessComStats && !lichessStats) {
    message += `⚠️ No stats found for this user.`;
  }

  return message;
}
