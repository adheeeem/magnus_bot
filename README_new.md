# 🏆 Magnus Bot

**Magnus Bot** is a lightweight, serverless **chess-club assistant** written in TypeScript. It runs entirely on **Vercel functions** and uses the [grammY](https://grammy.dev/) framework to talk to the Telegram Bot API.

It helps a small community track their **Chess.com** and **Lichess** progress with:

* personal rating / puzzle statistics (`/stats`) from both platforms
* monthly leaderboards (`/top`) supporting multiple game types  
* head-to-head comparisons (`/score @user1 @user2`)
* bilingual support (English/Tajik)
* dynamic user registration with platform choice

## 🚀 Features

### Platform Support
- ♟️ **Chess.com** - Full stats, games, and leaderboards
- ♟️ **Lichess** - Full stats, games, and leaderboards  
- 🔄 **Dual Registration** - Users can register for one or both platforms

### Commands
- 📊 `/stats` - View chess statistics from registered platforms
- 🏆 `/top [option]` - Leaderboards with multiple modes:
  - `bugun` (default) - Today's top players
  - `blitz` - Monthly blitz leaderboard
  - `bullet` - Monthly bullet leaderboard  
  - `rapid` - Monthly rapid leaderboard
- ⚔️ `/score @user1 @user2` - Head-to-head comparison
- 🆕 `/start` - Register with Chess.com and/or Lichess usernames

### Multi-Language Support
- 🇺🇸 English
- 🇹🇯 Tajik (Тоҷикӣ)

## 🛠️ Setup

### 1 · Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Telegram Bot Token](https://core.telegram.org/bots#3-how-do-i-create-a-bot)
- [Supabase Account](https://supabase.com/) (free tier works)

### 2 · Configure

Create a `.env` file with your configuration:

```env
# Telegram Bot Token
BOT_TOKEN=123456:ABC‑DEF…

# Supabase Configuration
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3 · Setup Database

1. Create a new Supabase project at https://supabase.com
2. Run the SQL commands from `schema.sql` in your Supabase SQL editor
3. If migrating from an older version, also run `schema_lichess_migration.sql`
4. Copy your project URL and anon key to the `.env` file

### 4 · Run the bot

```bash
# Install dependencies
npm install

# Start TypeScript directly
npm run dev
```

> Local bots use **long‑polling**. When deployed to Vercel, the bot automatically switches to **webhooks**.

## ☁️ Deploying to Vercel

1. **Import** the repo in the Vercel dashboard.
2. **Environment → Add** environment variables:
   - `BOT_TOKEN` (your Telegram bot token)
   - `SUPABASE_URL` (your Supabase project URL)
   - `SUPABASE_ANON_KEY` (your Supabase anon key)
3. **Build Command** – leave *empty* (Vercel auto‑installs & transpiles TS).
4. Click **Deploy**.
5. Set the webhook once (replace `<project>` and region if needed):

```bash
curl \
  -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d "url=https://<project>.vercel.app/webhook"
```

That's it — Vercel's global edge will now forward Telegram updates to your function.

## 📊 How It Works

### User Registration
1. Users type `/start`
2. Bot prompts to choose Chess.com or Lichess (or both)
3. Bot validates usernames exist on chosen platforms
4. User data is stored in Supabase database
5. Users can add additional platforms later

### Statistics (`/stats`)
- Fetches real-time data from Chess.com and/or Lichess APIs
- Shows ratings for rapid, blitz, bullet, and puzzles
- Displays combined stats if user is registered on both platforms

### Leaderboards (`/top`)
- Supports multiple time periods and game types
- Uses Tajikistan timezone (GMT+5) for local relevance
- Ranks by win rate with tie-breaking logic
- Works with both Chess.com and Lichess games

### Head-to-Head (`/score`)
- Compares game history between two players
- Prioritizes Chess.com if both players are registered there
- Falls back to Lichess for comparison
- Shows monthly statistics and game links

## 🗄️ Database Schema

The bot uses a single `user_mappings` table:

```sql
CREATE TABLE user_mappings (
    id BIGSERIAL PRIMARY KEY,
    telegram_username VARCHAR(255) NOT NULL UNIQUE,
    chess_username VARCHAR(255),
    lichess_username VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT at_least_one_chess_platform CHECK (
        chess_username IS NOT NULL OR lichess_username IS NOT NULL
    )
);
```

## 🎯 Architecture

- **Frontend**: Telegram Bot (grammY framework)
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase PostgreSQL
- **APIs**: Chess.com Public API, Lichess API
- **Language**: TypeScript

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with both Chess.com and Lichess accounts
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

*Built with ❤️ for chess communities everywhere*
