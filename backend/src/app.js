import cors from 'cors';
import express from 'express';
import { query } from './db.js';
import { reportServerError } from './errorReports.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import { reportRouter, webhookRouter } from './routes/errors.js';
import ordersRouter from './routes/orders.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
  // Webhook TicketForge cần body gốc để kiểm chữ ký nên phải đứng trước express.json().
  app.use('/api/ticketforge', webhookRouter);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    await query('SELECT 1');
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', reportRouter);
  app.use('/api', catalogRouter);
  app.use('/api', ordersRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Không tìm thấy tài nguyên' });
  });

  app.use((error, req, res, _next) => {
    const status = error.status ?? (error.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) {
      console.error(error);
      // Lỗi của chính backend cũng thành ticket (chạy nền, không ảnh hưởng response).
      void reportServerError(error, req);
    }
    res.status(status).json({ message: status >= 500 ? 'Máy chủ đang gặp sự cố, vui lòng thử lại' : error.message });
  });

  return app;
}
