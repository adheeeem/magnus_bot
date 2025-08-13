# Daily Championship System

## Overview
Magnus Bot now features a **Daily Championship System** that rewards the top players each day with championship points. This system encourages daily participation and creates ongoing competition among community members.

## How It Works

### Daily Competition
- Every day, players compete on the daily leaderboard (`/top bugun`)
- At **23:55 Tajikistan time (18:55 UTC)**, the system automatically:
  1. Calculates the day's top players
  2. Awards championship points to the top 3
  3. Announces the daily champions
  4. Resets for the next day

### Championship Points
- **🥇 1st Place**: 300 points
- **🥈 2nd Place**: 200 points  
- **🥉 3rd Place**: 100 points

### Qualification Requirements
- Minimum **3 games** played on the day
- Rankings based on **weighted score** (Win Rate × √(Games) × 100)
- Includes games from both Chess.com and Lichess

### Ranking System
The bot uses a **Weighted Score System** that's fair to all playing styles:
- **Formula**: `Weighted Score = Win Rate × √(Games Played) × 100`
- **Benefits**: Rewards both skill (win rate) and activity (game volume)
- **Examples**:
  - Player A: 3W-0L (100% win rate) = 173.2 score
  - Player B: 9W-1L (90% win rate) = 284.6 score ← **Wins!**
  - Player C: 15W-15L (50% win rate) = 274.0 score

This system ensures that playing more games is rewarded, but skill still matters most.

## Bot Commands

### New Commands
- `/standings` - View overall championship standings
- `/standings recent` - View recent daily champions

### Updated Commands
- `/top bugun` - Now shows championship point potential
- `/start` - Mentions the championship system

### New Tables

#### `user_scores`
Tracks cumulative championship points for each user.
```sql
- telegram_username (VARCHAR, FK to user_mappings)
- total_score (INTEGER, default 0)
- created_at, updated_at (TIMESTAMP)
```

#### `daily_champions`
Records daily championship results.
```sql
- date (DATE, unique)
- first_place, second_place, third_place (VARCHAR)
- first_score, second_score, third_score (INTEGER)
- win_rate_first, win_rate_second, win_rate_third (DECIMAL)
- created_at (TIMESTAMP)
```

## Technical Implementation

### Scheduled Task
- **Vercel Cron Job**: Runs daily at 18:55 UTC (23:55 Tajikistan time)
- **Endpoint**: `/api/daily-championship`
- **Security**: Protected by `CRON_SECRET` environment variable

### Key Functions
- `getTodaysLeaderboard()` - Calculates daily rankings
- `saveDailyChampions()` - Awards points and saves results
- `getAllUserScores()` - Retrieves championship standings

## Setup Instructions

### 1. Database Migration
Run the championship schema in your Supabase SQL editor:
```bash
# Execute the contents of schema_championship.sql
```

### 2. Environment Variables
Add to your `.env` file:
```env
# Optional: Secret for cron job security
CRON_SECRET=your_random_secret_here

# Optional: Chat ID for championship announcements
ANNOUNCEMENT_CHAT_ID=-1001234567890
```

### 3. Deploy to Vercel
The cron job is automatically configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/daily-championship",
      "schedule": "55 18 * * *"
    }
  ]
}
```

### 4. Testing
Test the championship system locally:
```bash
npm run test-championship
```

## Usage Examples

### Daily Leaderboard with Championship Info
```
🏆 Today's Leaderboard
Shows today's top players - Top 3 earn championship points!

🏆 Daily Championship: Top 3 earn points at day end!
Weighted Score = Win Rate × √(Games) × 100 | Need 3+ games

🥇 alice: 284.6 score (90.0% • 10g) [♟️6 🏰4] [150pts]
🥈 bob: 274.0 score (50.0% • 30g) [♟️18 🏰12] [300pts]
🥉 charlie: 268.4 score (60.0% • 20g) [♟️12 🏰8] [0pts]

Use /standings to see championship standings
```

### Championship Standings
```
🏆 CHAMPIONSHIP STANDINGS

🥇 @bob: 300 points
🥈 @alice: 150 points
🥉 @charlie: 100 points

📊 Daily points: 🥇300, 🥈200, 🥉100
Use /standings recent for daily champions
```

### Daily Championship Announcement
```
🏆 DAILY CHAMPIONSHIP RESULTS - August 13, 2025

🥇 CHAMPION: @alice
   Win Rate: 85.7% (6W-1L)
   Awarded: +300 points 🎉

🥈 Runner-up: @bob
   Win Rate: 80.0% (4W-1L)
   Awarded: +200 points

🥉 Third place: @charlie
   Win Rate: 75.0% (3W-1L)
   Awarded: +100 points

Congratulations to all players! 🎊
Total qualifying players: 8

Use /standings to see overall championship standings!
```

## Architecture Notes

### Timezone Handling
- All calculations use **Tajikistan time (GMT+5)**
- Day boundaries are calculated correctly for the local community
- Cron job runs 5 minutes before midnight Tajikistan time

### Error Handling
- Graceful degradation if APIs are unavailable
- Duplicate prevention for daily awards
- Comprehensive logging for debugging

### Performance Considerations
- Efficient database queries with proper indexing
- Cached user mappings to reduce API calls
- Batch processing for multiple users

## Future Enhancements

Potential improvements to consider:
- **Weekly/Monthly Championships** with larger point awards
- **Achievement System** for milestone rewards
- **Championship History** with detailed statistics
- **Team Competitions** between groups
- **Seasonal Resets** with hall of fame

## Troubleshooting

### Common Issues

1. **No players qualify**: Ensure users play at least 3 games per day
2. **Cron job not running**: Check Vercel cron configuration and logs
3. **Wrong timezone**: Verify Tajikistan time calculations
4. **Database errors**: Check Supabase connection and table permissions

### Manual Championship Award
If needed, you can manually trigger championship calculation:
```bash
# Call the endpoint directly
curl -X POST https://your-bot.vercel.app/api/daily-championship \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Debugging
Enable debug logging by checking the championship test script:
```bash
npm run test-championship
```

This will show current leaderboard and standings without awarding points.
