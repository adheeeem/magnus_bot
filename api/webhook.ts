// api/webhook.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { bot } from '../bot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
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
