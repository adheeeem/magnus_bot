# Lichess API Token Setup

## Why You Need a Token

The Lichess API requires authentication for accessing user statistics and game data. While some endpoints work without authentication, using a personal access token provides:

- **Better reliability** - Avoids rate limiting issues
- **Full access** - Access to all user stats and game history
- **Consistent performance** - No interruptions due to anonymous request limits

## How to Get a Token

1. **Visit the Lichess Token Creation Page**
   - Go to: https://lichess.org/account/oauth/token/create
   - Log in to your Lichess account if you haven't already

2. **Create a Personal Access Token**
   - Give your token a descriptive name (e.g., "Magnus Bot API Access")
   - **Scopes**: You don't need any special scopes for basic user stats
   - Click "Create"

3. **Copy Your Token**
   - The token will look like: `lip_abcdefghijklmnop1234567890`
   - **Important**: Copy it immediately - you won't be able to see it again

4. **Add to Environment Variables**
   
   **For local development (.env file):**
   ```env
   LICHESS_API_TOKEN=lip_your_actual_token_here
   ```
   
   **For Vercel deployment:**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add: `LICHESS_API_TOKEN` = `lip_your_actual_token_here`

## Token Security

- ✅ **Do**: Store tokens in environment variables
- ✅ **Do**: Use different tokens for development vs production
- ❌ **Don't**: Commit tokens to version control
- ❌ **Don't**: Share tokens publicly

## Testing Your Token

Once configured, you can test by running any command that uses Lichess data:
- `/stats` for a user registered with Lichess
- `/top` commands that include Lichess games

If there are token issues, check your bot logs for authentication warnings.

## Troubleshooting

**Token not working?**
- Verify the token is correctly copied (starts with `lip_`)
- Check that environment variables are properly set
- Restart your bot/deployment after adding the token

**Still having issues?**
- The bot will still work for Chess.com users
- Some Lichess features may be limited without a token
- Check console logs for specific error messages
