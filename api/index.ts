import { createApp } from '../src/app';
import { VercelRequest, VercelResponse } from '@vercel/node';

const app = createApp();

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};