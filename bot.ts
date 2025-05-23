// bot.ts
import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { handleStart, handleUsername } from "./commands/start";
import { handleStats } from "./commands/stats";
import { handleScore } from "./commands/score";
import { handleZuri } from "./commands/zuri";
import { BotError, GrammyError, HttpError } from "grammy";

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing");

export const bot = new Bot(token);

bot.command("start", handleStart);
bot.command("stats", handleStats);
bot.command("score", handleScore);
bot.command("zuri", handleZuri);

// Handle text messages for username registration only in private chats
bot.on("message:text", async (ctx) => {
  // Only process text messages in private chats
  if (ctx.chat?.type === "private") {
    await handleUsername(ctx);
  }
});

// Global error handler
bot.catch((err: BotError) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  
  if (err.error instanceof GrammyError) {
    // Handle specific Telegram API errors
    if (err.error.description.includes("Forbidden: bot was blocked by the user")) {
      console.log(`Bot was blocked by user ${ctx.from?.id}`);
      // You could add additional logic here, like removing the user from your database
    } else if (err.error.description.includes("Too Many Requests")) {
      console.log("Rate limit exceeded:", err.error.description);
      // You could add retry logic here
    } else if (err.error.description.includes("Bad Request")) {
      console.log("Bad request error:", err.error.description);
    } else {
      console.log("Other Telegram API error:", err.error.description);
    }
  } else if (err.error instanceof HttpError) {
    // Handle network errors
    console.error("HTTP error:", err.error.message);
  } else {
    // Handle non-Telegram API errors
    console.error("Unknown error:", err.error);
  }
});
