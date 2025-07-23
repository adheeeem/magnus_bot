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
  chess_username: string;
  created_at?: string;
  updated_at?: string;
}

// User operations
export async function saveUserMapping(
  telegramUsername: string,
  chessUsername: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if user already exists
    const { data: existingUser } = await supabase
      .from('user_mappings')
      .select('*')
      .eq('telegram_username', telegramUsername)
      .single();

    if (existingUser) {
      // Update existing user
      const { error } = await supabase
        .from('user_mappings')
        .update({
          chess_username: chessUsername,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_username', telegramUsername);

      if (error) {
        console.error('Error updating user mapping:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new user
      const { error } = await supabase
        .from('user_mappings')
        .insert({
          telegram_username: telegramUsername,
          chess_username: chessUsername,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

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

    return data.chess_username;
  } catch (error) {
    console.error('Error fetching chess username:', error);
    return null;
  }
}

export async function getAllUserMappings(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('user_mappings')
      .select('telegram_username, chess_username');

    if (error || !data) {
      console.error('Error fetching all user mappings:', error);
      return {};
    }

    const userMap: Record<string, string> = {};
    data.forEach((mapping: any) => {
      userMap[mapping.telegram_username] = mapping.chess_username;
    });

    return userMap;
  } catch (error) {
    console.error('Error fetching all user mappings:', error);
    return {};
  }
}
