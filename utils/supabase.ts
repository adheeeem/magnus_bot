import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface UserMapping {
  id?: number;
  telegram_username: string;
  chess_username?: string;
  lichess_username?: string;
  created_at?: string;
  updated_at?: string;
}

// User operations
export async function saveUserMapping(
  telegramUsername: string,
  chessUsername?: string,
  lichessUsername?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate that at least one chess platform username is provided
    if (!chessUsername && !lichessUsername) {
      return { success: false, error: 'At least one chess platform username is required' };
    }

    // First check if user already exists
    const { data: existingUser } = await supabase
      .from('user_mappings')
      .select('*')
      .eq('telegram_username', telegramUsername)
      .single();

    if (existingUser) {
      // Update existing user
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      if (chessUsername) updateData.chess_username = chessUsername;
      if (lichessUsername) updateData.lichess_username = lichessUsername;

      const { error } = await supabase
        .from('user_mappings')
        .update(updateData)
        .eq('telegram_username', telegramUsername);

      if (error) {
        console.error('Error updating user mapping:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new user
      const insertData: any = {
        telegram_username: telegramUsername,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (chessUsername) insertData.chess_username = chessUsername;
      if (lichessUsername) insertData.lichess_username = lichessUsername;
      const { error } = await supabase
        .from('user_mappings')
        .insert(insertData);

      if (error) {
        console.error('Error saving user mapping:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: 'Database connection failed' };
  }
}

export async function getChessUsername(telegramUsername: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_mappings')
      .select('chess_username')
      .eq('telegram_username', telegramUsername)
      .single();

    if (error || !data) {
      return null;
    }

    return data.chess_username || null;
  } catch (error) {
    console.error('Error fetching chess username:', error);
    return null;
  }
}

export async function getLichessUsername(telegramUsername: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_mappings')
      .select('lichess_username')
      .eq('telegram_username', telegramUsername)
      .single();

    if (error || !data) {
      return null;
    }

    return data.lichess_username || null;
  } catch (error) {
    console.error('Error fetching lichess username:', error);
    return null;
  }
}

export async function getUserMappings(telegramUsername: string): Promise<{ chess: string | null; lichess: string | null } | null> {
  try {
    const { data, error } = await supabase
      .from('user_mappings')
      .select('chess_username, lichess_username')
      .eq('telegram_username', telegramUsername)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      chess: data.chess_username || null,
      lichess: data.lichess_username || null
    };
  } catch (error) {
    console.error('Error fetching user mappings:', error);
    return null;
  }
}

export async function getAllUserMappings(): Promise<Record<string, { chess: string | null; lichess: string | null }>> {
  try {
    const { data, error } = await supabase
      .from('user_mappings')
      .select('telegram_username, chess_username, lichess_username');

    if (error || !data) {
      console.error('Error fetching all user mappings:', error);
      return {};
    }

    const userMap: Record<string, { chess: string | null; lichess: string | null }> = {};
    data.forEach((mapping: any) => {
      userMap[mapping.telegram_username] = {
        chess: mapping.chess_username || null,
        lichess: mapping.lichess_username || null
      };
    });

    return userMap;
  } catch (error) {
    console.error('Error fetching all user mappings:', error);
    return {};
  }
}
