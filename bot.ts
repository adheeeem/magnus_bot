// bot.ts
import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { handleStart, handleUsername } from "./commands/start";
import { handleStats } from "./commands/stats";
import { handleScore } from "./commands/score";
import { handleZuri } from "./commands/zuri";

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing");

export const bot = new Bot(token);

bot.command("start", handleStart);
bot.command("stats", handleStats);
bot.command("score", handleScore);
bot.command("zuri", handleZuri);

// Handle text messages for username registration
bot.on("message:text", handleUsername);
