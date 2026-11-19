import { createApp } from './app.js';
import { ensureErrorTables, startErrorSyncWorker } from './errorReports.js';
import { isConfigured } from './ticketforge.js';

await ensureErrorTables();

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
createApp().listen(port, host, () => {
  console.log(`VoltMart API listening on http://${host}:${port}`);
  console.log(
    isConfigured()
      ? 'TicketForge: đã cấu hình, lỗi sẽ được gửi sang TicketForge'
      : 'TicketForge: chưa có TICKETFORGE_API_KEY, lỗi được lưu lại và sẽ tự gửi khi cấu hình xong',
  );
});
startErrorSyncWorker();
