-- Lỗi người dùng/hệ thống gặp phải và ticket tương ứng trên TicketForge.
-- Idempotent: chạy được nhiều lần, và được app tự chạy khi khởi động.
CREATE TABLE IF NOT EXISTS error_reports (
  id              uuid PRIMARY KEY,
  source          text NOT NULL DEFAULT 'browser' CHECK (source IN ('browser', 'server', 'manual', 'user')),
  message         text NOT NULL,
  stack           text,
  route           text,
  page_url        text,
  user_agent      text,
  environment     jsonb NOT NULL DEFAULT '{}',
  release         text,
  user_id         integer,
  reporter_name   text,
  fingerprint     text NOT NULL,
  occurrences     integer NOT NULL DEFAULT 1,
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  -- Phía TicketForge
  ticket_id       text,
  ticket_key      text,
  status          text NOT NULL DEFAULT 'not_started',
  status_label    text NOT NULL DEFAULT 'Chưa làm',
  tf_updated_at   timestamptz,
  tf_checked_at   timestamptz,
  -- Gửi sang TicketForge: pending (chờ/thử lại) | synced | failed (lỗi không thể tự thử lại)
  sync_state      text NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending', 'synced', 'failed')),
  sync_error      text,
  sync_attempts   integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Nâng cấp bảng đã tạo từ phiên bản trước (CREATE TABLE IF NOT EXISTS không đổi bảng cũ).
ALTER TABLE error_reports ADD COLUMN IF NOT EXISTS reporter_name text;
ALTER TABLE error_reports DROP CONSTRAINT IF EXISTS error_reports_source_check;
ALTER TABLE error_reports ADD CONSTRAINT error_reports_source_check
  CHECK (source IN ('browser', 'server', 'manual', 'user'));

CREATE INDEX IF NOT EXISTS error_reports_fingerprint_idx ON error_reports (fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS error_reports_ticket_idx ON error_reports (ticket_id);
CREATE INDEX IF NOT EXISTS error_reports_created_idx ON error_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS error_reports_pending_idx ON error_reports (next_attempt_at)
  WHERE ticket_id IS NULL AND sync_state = 'pending';
