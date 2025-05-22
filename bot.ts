// bot.ts
import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { handleStart } from "./commands/start";
import { handleStats } from "./commands/stats";

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing");

export const bot = new Bot(token);

bot.command("start", handleStart);
bot.on("message:text", handleStats);
