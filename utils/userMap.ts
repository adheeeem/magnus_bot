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
    'Abbosi12': 'Abbosi12',
    'MalikaMukhsinova': 'Malika1987',
};

export function getChessUsername(telegramUsername: string): string | null {
    return userMap[telegramUsername] || null;
}
