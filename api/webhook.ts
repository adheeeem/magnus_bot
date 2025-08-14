// api/webhook.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { bot } from '../bot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Log the chat ID from incoming updates
    const update = req.body;
    if (update.message?.chat || update.channel_post?.chat) {
      const chat = update.message?.chat || update.channel_post?.chat;
      console.log('Received message from:', {
        chat_id: chat.id,
        chat_type: chat.type,
        chat_title: chat.title
      });
    }

    // Ensure bot info is loaded
    if (!bot.isInited()) {
      await bot.init();
    }

    await bot.handleUpdate(req.body);
    return res.status(200).end();
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
