// Shared user mappings across all commands
// Key: Telegram username, Value: chess.com username
export const userMap: Record<string, string> = {
    'azimjonfffff': 'adheeeem',
    'rahniz90': 'RahNiz',
    'RahmonovShuhrat': 'shuhratrahmonov',
    'aisoqov': 'guaje032',
    'Akhmedov_Sanjar': 'Akhmedov_Sanjar',
    'knajmitdinov': 'komiljon_najmitdinov',
    'nuriddin_yakubovich': 'Nuriddin_2004',
    'Alisherrik': 'alisherrik',
    'Abbosi12': 'Abbosi12'
};

export function getChessUsername(telegramUsername: string): string | null {
    return userMap[telegramUsername] || null;
}

export function addUser(telegramUsername: string, chessUsername: string): boolean {
    try {
        userMap[telegramUsername] = chessUsername;
        return true;
    } catch (error) {
        console.error('Error adding user to map:', error);
        return false;
    }
}
