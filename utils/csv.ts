import * as fs from 'fs/promises';
import * as path from 'path';

const CSV_FILE = path.join(process.cwd(), 'users.csv');

export async function saveUser(telegramUsername: string, chessUsername: string) {
    try {
        // Create file with headers if it doesn't exist
        try {
            await fs.access(CSV_FILE);
        } catch {
            await fs.writeFile(CSV_FILE, 'telegram_username,chess_username\n');
        }

        const data = `${telegramUsername},${chessUsername}\n`;
        await fs.appendFile(CSV_FILE, data);
        return true;
    } catch (error) {
        console.error('Error saving user data:', error);
        return false;
    }
} 