# Lichess Integration Migration Guide

## Overview
Magnus Bot has been upgraded to support both Chess.com and Lichess platforms! This guide will help you upgrade your existing installation and understand the new features.

## What's New

### Dual Platform Support
- ✅ Chess.com (existing functionality)
- ✅ Lichess (new!)
- ✅ Users can register for one or both platforms
- ✅ Combined statistics display
- ✅ Cross-platform leaderboards

### Enhanced Commands
- `/stats` - Now shows stats from both platforms if registered
- `/top` - Works with both Chess.com and Lichess games
- `/score` - Compares players across platforms
- `/start` - New registration flow with platform choice

## Database Migration

### Step 1: Update Your Database Schema
Run this SQL in your Supabase SQL editor:

```sql
-- Add Lichess support to existing table
ALTER TABLE user_mappings 
ADD COLUMN lichess_username VARCHAR(255);

-- Create index for performance
CREATE INDEX idx_user_mappings_lichess_username ON user_mappings(lichess_username);

-- Update constraint to allow either platform
ALTER TABLE user_mappings 
DROP CONSTRAINT IF EXISTS user_mappings_chess_username_check;

ALTER TABLE user_mappings 
ADD CONSTRAINT at_least_one_chess_platform CHECK (
    chess_username IS NOT NULL OR lichess_username IS NOT NULL
);

-- Make chess_username nullable for new registrations
ALTER TABLE user_mappings 
ALTER COLUMN chess_username DROP NOT NULL;
```

### Step 2: Update Your Code
Pull the latest changes from the repository or manually update the following files:

#### Required File Updates
- `utils/supabase.ts` - New functions for dual platform support
- `utils/chessApis.ts` - New file for API handling
- `utils/registration.ts` - Updated registration flow
- `commands/start/index.ts` - New platform selection
- `commands/stats/index.ts` - Combined stats display
- `commands/score/index.ts` - Cross-platform comparison
- `commands/top/index.ts` - Multi-platform leaderboards

#### New Files
- `schema_lichess_migration.sql` - Migration script
- `utils/chessApis.ts` - API utilities for both platforms

### Step 3: Test the Migration
1. Restart your bot
2. Try `/start` - you should see platform selection
3. Existing users should still work with Chess.com
4. New users can choose Chess.com, Lichess, or both

## User Experience Changes

### For Existing Users
- ✅ All existing Chess.com registrations continue to work
- ✅ Can add Lichess username later with `/start`
- ✅ No data loss or migration needed

### For New Users
- 🆕 Platform choice during registration
- 🆕 Can register for both platforms
- 🆕 Combined statistics view

### Command Changes
```bash
# Before (Chess.com only)
/stats username    # Chess.com stats only

# After (Multi-platform)
/stats username    # Stats from both platforms
/stats             # Your registered platform stats
```

## API Rate Limits & Considerations

### Chess.com API
- Rate limit: ~300 requests per 5 minutes
- No authentication required
- Archived games by month

### Lichess API  
- Rate limit: ~1000 requests per minute
- No authentication required
- Real-time game streaming available

### Bot Optimization
The bot automatically:
- Prioritizes Chess.com for head-to-head comparisons
- Caches API responses where possible
- Handles API failures gracefully

## Troubleshooting

### Common Issues

**1. Database constraint errors**
```sql
-- If you get constraint errors, run:
ALTER TABLE user_mappings DROP CONSTRAINT IF EXISTS user_mappings_chess_username_check;
```

**2. TypeScript compilation errors**
```bash
# Clear and rebuild
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**3. Missing Lichess usernames**
- Users need to use `/start` again to add Lichess
- Old registrations only have Chess.com usernames

### Verification Steps
1. Check database schema: `\d user_mappings` in psql
2. Test new registration: `/start` should show platform choice
3. Test existing users: `/stats` should work for old registrations
4. Test combined stats: Register for both platforms and try `/stats`

## Rollback Plan

If you need to rollback to Chess.com only:

```sql
-- Remove Lichess column (optional)
ALTER TABLE user_mappings DROP COLUMN IF EXISTS lichess_username;

-- Restore NOT NULL constraint
ALTER TABLE user_mappings ALTER COLUMN chess_username SET NOT NULL;
```

Then revert your code to the previous version.

## Support

If you encounter issues:
1. Check the bot logs for error messages
2. Verify your database schema matches the new structure
3. Test with both Chess.com and Lichess usernames
4. Ensure all new files are properly imported

The migration is designed to be backwards compatible - existing functionality should continue working while new features become available.
