# Supabase Integration Guide

## Overview
Magnus Bot has been upgraded from a static user mapping system to a dynamic Supabase database integration. Users can now register directly through the bot without needing to submit GitHub Pull Requests.

## Changes Made

### 1. New Files Created
- `utils/supabase.ts` - Supabase client configuration and database operations
- `utils/registration.ts` - User registration flow handler
- `schema.sql` - Database schema for Supabase
- `migrate.ts` - Migration script for existing users
- `.env.example` - Environment variables template

### 2. Modified Files
- `utils/userMap.ts` - Now imports from Supabase instead of static mapping
- `commands/start/index.ts` - New registration flow with username validation
- `commands/stats/index.ts` - Uses both user ID and username lookup
- `commands/zuri/index.ts` - Fetches user mappings dynamically
- `bot.ts` - Updated to handle registration flow
- `package.json` - Added new scripts and Supabase dependency
- `Readme.md` - Updated documentation

### 3. New Registration Flow
1. User types `/start`
2. Bot checks if user is already registered
3. If not registered, bot asks for Chess.com username
4. Bot validates username exists on Chess.com
5. Bot saves mapping to Supabase database
6. User can immediately use all bot features

## Setup Instructions

### 1. Supabase Setup
1. Create a new project at https://supabase.com
2. Run the SQL from `schema.sql` in your Supabase SQL editor
3. Get your project URL and anon key from Project Settings → API

### 2. Environment Variables
Add to your `.env` file:
```env
BOT_TOKEN=your_telegram_bot_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
LICHESS_API_TOKEN=lip_your_lichess_token_here
```

**Note**: The `LICHESS_API_TOKEN` is optional but highly recommended for reliable Lichess integration. See `LICHESS_TOKEN_SETUP.md` for detailed setup instructions.

### 3. Migration (Optional)
To migrate existing users from the legacy userMap:
```bash
npm run migrate
```

### 4. Deployment
Add the Supabase environment variables to your Vercel project settings.

## Database Schema

### Table: `user_mappings`
- `id` - Primary key (auto-increment)
- `telegram_username` - Telegram username (string)
- `chess_username` - Chess.com username (string)
- `telegram_user_id` - Telegram user ID (unique, bigint)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Benefits

### For Users
- Instant registration without GitHub account
- No waiting for PR approval
- Can update their Chess.com username
- Better user experience

### For Maintainers
- No manual PR reviews for user registration
- Automatic user validation
- Better data management
- Scalable user base

### Technical
- Proper database with ACID compliance
- Automatic backups through Supabase
- Real-time capabilities if needed in future
- Better error handling and logging

## Security Notes
- Row Level Security (RLS) is enabled
- Only basic read/write policies are set up
- Consider more restrictive policies for production
- Supabase anon key is safe for client-side use

## Future Enhancements
- User profile management
- Statistics caching
- Real-time leaderboard updates
- User preferences storage
- Admin panel for user management
