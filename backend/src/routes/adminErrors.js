import { Router } from 'express';
import {
  ERROR_UUID,
  reconcileStatuses,
  recordError,
  refreshReport,
  syncPending,
  syncReport,
} from '../errorReports.js';
import { query } from '../db.js';
import { HttpError } from '../http.js';
import { isConfigured, tfConfig } from '../ticketforge.js';

// Được mount trong admin.js, đã qua requireAdmin.
const router = Router();

const LIST_COLUMNS = `id, source, message, route, page_url, release, occurrences, last_seen_at, created_at,
  ticket_id, ticket_key, status, status_label, tf_updated_at, sync_state, sync_error, sync_attempts`;
const FILTERS = ['not_started', 'in_progress', 'refused', 'done', 'unsent'];

function assertId(id) {
  if (!ERROR_UUID.test(id)) throw new HttpError(404, 'Không tìm thấy báo cáo lỗi');
  return id;
}

router.get('/', async (req, res) => {
  const filter = FILTERS.includes(req.query.status) ? req.query.status : null;
  const [list, counts] = await Promise.all([
    query(
      `SELECT ${LIST_COLUMNS} FROM error_reports
       WHERE ($1::text IS NULL
              OR ($1 = 'unsent' AND ticket_id IS NULL)
              OR ($1 <> 'unsent' AND ticket_id IS NOT NULL AND status = $1))
       ORDER BY last_seen_at DESC LIMIT 200`,
      [filter],
    ),
    query(`
      SELECT count(*)::int AS all,
             count(*) FILTER (WHERE ticket_id IS NULL)::int AS unsent,
             count(*) FILTER (WHERE ticket_id IS NOT NULL AND status = 'not_started')::int AS not_started,
             count(*) FILTER (WHERE ticket_id IS NOT NULL AND status = 'in_progress')::int AS in_progress,
             count(*) FILTER (WHERE ticket_id IS NOT NULL AND status = 'refused')::int AS refused,
             count(*) FILTER (WHERE ticket_id IS NOT NULL AND status = 'done')::int AS done
      FROM error_reports`),
  ]);
  const config = tfConfig();
  res.json({
    items: list.rows,
    counts: counts.rows[0],
    config: {
      configured: isConfigured(),
      webhook_configured: Boolean(config.webhookSecret),
      ticketforge_url: config.publicUrl,
      site_url: config.siteUrl || null,
    },
  });
});

// Đặt trước '/:id' để không bị bắt nhầm.
router.post('/sync', async (_req, res) => {
  if (!isConfigured()) throw new HttpError(400, 'Chưa cấu hình TICKETFORGE_API_KEY');
  const sent = await syncPending(10);
  const checked = await reconcileStatuses(20);
  res.json({ sent, checked });
});

router.post('/test', async (req, res) => {
  if (!isConfigured()) throw new HttpError(400, 'Chưa cấu hình TICKETFORGE_API_KEY trong backend/.env');
  const stamp = new Date().toISOString();
  const { id } = await recordError({
    source: 'manual',
    message: `[Thử nghiệm] Kiểm tra tích hợp TicketForge từ trang quản trị VoltMart (${stamp})`,
    route: '/admin/errors',
    pageUrl: tfConfig().siteUrl ? `${tfConfig().siteUrl}/admin/errors` : null,
    environment: { platform: 'server', note: 'Ticket thử nghiệm, không cần sửa code' },
    userId: Number.isInteger(Number(req.user?.sub)) ? Number(req.user.sub) : undefined,
    fingerprint: `manual-${stamp}`, // không gộp với lần thử trước
    autoSync: false, // gửi ngay bên dưới để trả đúng lý do nếu lỗi
  });
  res.status(201).json(await syncReport(id, { throwOnError: true }));
});

router.get('/:id', async (req, res) => {
  const {
    rows: [report],
  } = await query('SELECT * FROM error_reports WHERE id = $1', [assertId(req.params.id)]);
  if (!report) throw new HttpError(404, 'Không tìm thấy báo cáo lỗi');
  res.json(report);
});

// Chưa có ticket → gửi lại; đã có ticket → đọc lại trạng thái từ TicketForge.
router.post('/:id/sync', async (req, res) => {
  const id = assertId(req.params.id);
  const {
    rows: [report],
  } = await query('SELECT id, ticket_id FROM error_reports WHERE id = $1', [id]);
  if (!report) throw new HttpError(404, 'Không tìm thấy báo cáo lỗi');

  if (report.ticket_id) return res.json(await refreshReport(id, { throwOnError: true }));
  await query(`UPDATE error_reports SET sync_state = 'pending', sync_attempts = 0, sync_error = NULL WHERE id = $1`, [id]);
  res.json(await syncReport(id, { throwOnError: true }));
});

export default router;
