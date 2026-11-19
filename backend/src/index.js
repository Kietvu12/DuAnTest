import cors from 'cors';
import express from 'express';
import { query } from './db.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import ordersRouter from './routes/orders.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', catalogRouter);
app.use('/api', ordersRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Không tìm thấy tài nguyên' });
});

app.use((error, _req, res, _next) => {
  const status = error.status ?? (error.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Máy chủ đang gặp sự cố, vui lòng thử lại' : error.message });
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
app.listen(port, host, () => {
  console.log(`VoltMart API listening on http://${host}:${port}`);
});
