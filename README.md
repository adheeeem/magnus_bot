# 🏆 Magnus Bot

**Magnus Bot** is a lightweight, serverless **Telegram chess‑club assistant** written in TypeScript.  It runs entirely on **Vercel functions** and uses the [grammY](https://grammy.dev/) framework to talk to the Telegram Bot API.

It helps a small community track their Chess.com progress with:

* personal rating / puzzle statistics (`/stats`)
* head‑to‑head score summaries (`/score @user1 @user2`)
* daily & monthly leader‑boards (`/zuri …`)
* a playful onboarding flow that encourages open‑source contributions ✨

---

## 🤖 Features

| Area      | Details                                                                    |         |          |                          |
| --------- | -------------------------------------------------------------------------- | ------- | -------- | ------------------------ |
| Language  | **TypeScript 5** (strict mode)                                             |         |          |                          |
| Runtime   | **Vercel Edge Functions** (`@vercel/node`)                                 |         |          |                          |
| Framework | [**grammY 1.36**](https://grammy.dev/)                                     |         |          |                          |
| Chess API | [Chess.com Public API](https://www.chess.com/news/view/published-data-api) |         |          |                          |
| Commands  | `/start`, `/stats`, `/score`, `/zuri` \*(with \`bugun                      |  blitz  |  bullet  |  rapid\` sub‑commands)\* |
| CI / CD   | Vercel Deploy Hooks + optional GitGuardian secret scan                     |         |          |                          |
| Logging   | JSON logs written straight to stdout (picked up by Vercel)                 |         |          |                          |

---

## 📂 Project Layout

```
├── api/              # Serverless function entry – Telegram webhook
│   └── webhook.ts
├── bot.ts            # GrammY bot & command wiring
├── commands/         # Individual command handlers
│   ├── score.ts
│   ├── stats.ts
│   ├── start.ts
│   └── zuri.ts
├── utils/
│   └── userMap.ts    # Community username ↔︎ Chess.com mapping
├── vercel.json       # Route  /webhook  ➜  api/webhook.ts
├── tsconfig.json
└── package.json
```

> **Why **\`\`**?**  Vercel treats every file inside `api/` as a serverless function. The `vercel.json` route ensures Telegram only hits that single endpoint instead of auto‑generated routes.

---

## 🚀 Quick Start (local)

### 1 · Clone & install

```bash
$ git clone https://github.com/<your-fork>/magnus_bot.git
$ cd magnus_bot
$ npm install
```

### 2 · Configure

Create a `.env` file at project root and drop your bot token:

```env
BOT_TOKEN=123456:ABC‑DEF…
```

### 3 · Run the bot

```bash
# start TypeScript directly
$ npx ts-node bot.ts
```

> Local bots generally use **long‑polling**.  When you deploy to Vercel the bot automatically switches to **webhooks**.

---

## ☁️ Deploying to Vercel

1. **Import** the repo in the Vercel dashboard.
2. **Environment → Add** `BOT_TOKEN` (scope: Production & Preview).
3. **Build Command** – leave *empty* (Vercel auto‑installs & transpiles TS).
4. Click **Deploy**.
5. Set the webhook once (replace `<project>` and region if needed):

```bash
curl \
  -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d "url=https://<project>.vercel.app/webhook"
```

That’s it — Vercel’s global edge will now forward Telegram updates to your function.

---

## 🕹️ Commands & Usage

| Command                | What it does                                                                                                                                           | Example                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `/start`               | Sends onboarding message and explains how to register your Chess.com username.                                                                         | `/start`               |
| `/stats [username]`    | Shows Rapid, Blitz, Bullet ratings, highest tactics rating and best Puzzle‑Rush score. If no *username* is given your mapped Chess.com handle is used. | `/stats magnuscarlsen` |
| `/score @user1 @user2` | Head‑to‑head record **this month** between two registered users.                                                                                       | `/score @alice @bob`   |
| `/zuri`                | Monthly win‑rate leaderboard (all time‑controls).                                                                                                      | `/zuri`                |
| `/zuri bugun`          | **Today’s** leaderboard (minimum 3 games).                                                                                                             | `/zuri bugun`          |
| `/zuri blitz`          | Monthly leaderboard just for *blitz* games.                                                                                                            | `/zuri blitz`          |

Send `/zuri help` from the chat at any time to see the full list.

---

## 🙋‍♀️ Adding yourself to the club

1. **Star** the repo ⭐ → shows you’ve read the rules.
2. Fork → edit \`\`:

```ts
export const userMap: Record<string, string> = {
  // telegram : chess.com
  "your_tg_username": "your_chess_username",
  // keep existing lines!
};
```

3. Commit ➜ open a Pull Request (one‑liner is fine).
4. Once merged, you can use all commands immediately.

> PRs without ⭐ star will be closed by the maintainer’s bot.  Be nice!

---

## 🛠️ Scripts

```
# run in dev mode (ts‑node)
npm run dev       # alias for ts-node bot.ts

# type‑check only
npm run lint      # tsc --noEmit

# compile to plain JS (./dist)
npm run build     # tsc
```

*(Add these to **`package.json`** if they aren’t there yet.)*

---

## 📄 License

[MIT](LICENSE) — use it, fork it, improve it.

---

## ✨ Credits

* **@adheeeem** — original author & maintainer
* and everyone who opens PRs ❤️

---

> Built with ♥ in Tajikistan — may your tactics be sharp and your endgames precise.
