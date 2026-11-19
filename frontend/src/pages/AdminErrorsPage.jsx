import { Fragment, useEffect, useState } from 'react';
import { Bug, Check, ChevronDown, Copy, ExternalLink, RefreshCw, Send, TriangleAlert } from 'lucide-react';
import { EmptyState, PageLoader } from '../components/ui';
import { api } from '../lib/api';
import { ERROR_SOURCE, ERROR_STATUS, formatDate } from '../lib/format';
import { useToast } from '../lib/store';
import { useApi } from '../lib/useApi';

const FILTERS = [
  ['', 'Tất cả', 'all'],
  ['not_started', 'Chưa làm', 'not_started'],
  ['in_progress', 'Đang làm', 'in_progress'],
  ['refused', 'Từ chối làm', 'refused'],
  ['done', 'Hoàn thành', 'done'],
  ['unsent', 'Chưa gửi', 'unsent'],
];

function ErrorStatus({ report }) {
  if (!report.ticket_id) {
    const failed = report.sync_state === 'failed';
    return (
      <span className={`chip whitespace-nowrap ring-1 ring-inset ${failed ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
        {failed ? 'Gửi thất bại' : 'Chưa gửi'}
      </span>
    );
  }
  const meta = ERROR_STATUS[report.status] ?? ERROR_STATUS.not_started;
  return <span className={`chip whitespace-nowrap ring-1 ring-inset ${meta.className}`}>{report.status_label || meta.label}</span>;
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-zinc-500">{label}</p>
      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-amber-200">
        <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
        <button type="button" onClick={copy} className="text-zinc-500 hover:text-zinc-950" aria-label={`Sao chép ${label}`}>
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function SetupNotice({ config }) {
  if (config.configured && config.webhook_configured) return null;
  const host = (() => {
    try {
      return new URL(config.site_url ?? window.location.origin).hostname;
    } catch {
      return window.location.hostname;
    }
  })();
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <TriangleAlert className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-amber-950">
            {config.configured ? 'Chưa cấu hình webhook nhận trạng thái' : 'Chưa kết nối TicketForge'}
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            {config.configured
              ? 'Lỗi đã được gửi sang TicketForge, nhưng trạng thái chỉ cập nhật khi bạn bấm “Đồng bộ”. Thêm secret webhook để cập nhật tự động.'
              : 'Lỗi vẫn được lưu lại ở đây và sẽ tự gửi sang TicketForge ngay khi backend có API key.'}
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-amber-950/90">
            {!config.configured && (
              <>
                <li>
                  Vào{' '}
                  <a href={config.ticketforge_url} target="_blank" rel="noreferrer" className="font-semibold underline">
                    TicketForge
                  </a>{' '}
                  → Cài đặt → API → <b>Tạo API key</b>, và thêm domain <code className="rounded bg-white px-1.5 py-0.5 text-xs">{host}</code>.
                </li>
                <li>
                  Thêm vào <code className="rounded bg-white px-1.5 py-0.5 text-xs">backend/.env</code>:{' '}
                  <code className="rounded bg-white px-1.5 py-0.5 text-xs">TICKETFORGE_API_KEY=tf_live_…</code>
                </li>
              </>
            )}
            {!config.webhook_configured && (
              <li>
                Cài đặt → API → Webhook: dán URL bên dưới, rồi đặt secret vào{' '}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">TICKETFORGE_WEBHOOK_SECRET=whsec_…</code>
              </li>
            )}
            <li>
              Chạy <code className="rounded bg-white px-1.5 py-0.5 text-xs">pm2 restart voltmart-api</code> để nhận cấu hình mới.
            </li>
          </ol>
          {!config.webhook_configured && (
            <div className="mt-4 max-w-xl">
              <CopyField label="URL webhook" value={`${window.location.origin}/api/ticketforge/webhook`} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ErrorDetail({ id, onChanged }) {
  const { data: report, reload } = useApi(`/admin/errors/${id}`);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const sync = async () => {
    setBusy(true);
    try {
      await api(`/admin/errors/${id}/sync`, { method: 'POST' });
      toast(report.ticket_id ? 'Đã cập nhật trạng thái từ TicketForge' : 'Đã gửi lỗi sang TicketForge');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
      reload();
      onChanged();
    }
  };

  if (!report) return <div className="p-6"><PageLoader /></div>;
  const environment = Object.entries(report.environment ?? {});
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 bg-zinc-50/70 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <div className="card p-5">
          <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Nội dung lỗi</p>
          <p className="mt-2 text-sm font-medium break-words whitespace-pre-wrap">{report.message}</p>
        </div>
        {report.stack && (
          <div className="card p-5">
            <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Stack trace</p>
            <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-300">{report.stack}</pre>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="card space-y-2 p-5 text-sm">
          <p className="flex justify-between gap-3"><span className="text-zinc-500">Nguồn</span><span className="font-medium">{ERROR_SOURCE[report.source]}</span></p>
          {report.reporter_name && <p className="flex justify-between gap-3"><span className="text-zinc-500">Người báo</span><span className="truncate font-medium">{report.reporter_name}</span></p>}
          {report.route && <p className="flex justify-between gap-3"><span className="text-zinc-500">Màn hình</span><span className="truncate font-mono text-xs">{report.route}</span></p>}
          {report.page_url && <p className="flex justify-between gap-3"><span className="text-zinc-500">Trang</span><span className="truncate text-xs">{report.page_url}</span></p>}
          {report.release && <p className="flex justify-between gap-3"><span className="text-zinc-500">Phiên bản</span><span className="font-mono text-xs">{report.release}</span></p>}
          <p className="flex justify-between gap-3"><span className="text-zinc-500">Số lần</span><span className="font-medium">{report.occurrences}</span></p>
          <p className="flex justify-between gap-3"><span className="text-zinc-500">Lần đầu</span><span>{formatDate(report.created_at, true)}</span></p>
          {report.user_agent && <p className="pt-1 text-xs break-words text-zinc-400">{report.user_agent}</p>}
          {environment.length > 0 && (
            <p className="pt-1 text-xs text-zinc-400">{environment.map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>
          )}
        </div>

        <div className="card space-y-3 p-5 text-sm">
          <p className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Ticket</span>
            {report.ticket_key ? <span className="font-mono font-semibold">{report.ticket_key}</span> : <span className="text-zinc-400">Chưa có</span>}
          </p>
          {report.sync_error && <p className="rounded-xl bg-rose-50 p-3 text-xs break-words text-rose-700">{report.sync_error}</p>}
          {!report.ticket_id && report.sync_state === 'pending' && report.sync_attempts > 0 && (
            <p className="text-xs text-zinc-500">Đã thử {report.sync_attempts} lần, hệ thống sẽ tự thử lại.</p>
          )}
          <button type="button" onClick={sync} disabled={busy} className="btn btn-primary btn-sm w-full">
            {report.ticket_id ? <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} /> : <Send className="size-3.5" />}
            {report.ticket_id ? 'Cập nhật trạng thái' : 'Gửi sang TicketForge'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminErrors() {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState('');
  const { data, reload } = useApi(`/admin/errors${filter ? `?status=${filter}` : ''}`);
  const toast = useToast();

  // Webhook có thể đến bất cứ lúc nào: làm mới danh sách định kỳ.
  useEffect(() => {
    const timer = setInterval(reload, 30_000);
    return () => clearInterval(timer);
  }, [reload]);

  const run = async (name, path, success) => {
    setBusy(name);
    try {
      const result = await api(path, { method: 'POST' });
      toast(typeof success === 'function' ? success(result) : success);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy('');
      reload();
    }
  };

  if (!data) return <PageLoader />;
  const { items, counts, config } = data;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Báo lỗi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Lỗi của khách và của hệ thống được gửi sang TicketForge để agent tự sửa code.
            {config.configured && (
              <a href={config.ticketforge_url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 font-semibold text-zinc-700 hover:underline">
                Mở TicketForge <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!config.configured || Boolean(busy)}
            onClick={() => run('sync', '/admin/errors/sync', ({ sent, checked }) => `Đã gửi ${sent} lỗi, đối chiếu ${checked} ticket`)}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw className={`size-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> Đồng bộ
          </button>
          <button
            type="button"
            disabled={!config.configured || Boolean(busy)}
            onClick={() => run('test', '/admin/errors/test', 'Đã gửi lỗi thử sang TicketForge')}
            className="btn btn-primary btn-sm"
          >
            <Send className="size-3.5" /> Gửi lỗi thử
          </button>
        </div>
      </div>

      <SetupNotice config={config} />

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {FILTERS.map(([key, label, countKey]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setFilter(key); setExpanded(null); }}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === key ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-400'
            }`}
          >
            {label}
            <span className={`text-xs tabular-nums ${filter === key ? 'text-zinc-400' : 'text-zinc-400'}`}>{counts[countKey]}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bug}
          title={filter ? 'Không có lỗi nào ở nhóm này' : 'Chưa có lỗi nào được báo'}
          description="Khi khách gặp lỗi trên cửa hàng hoặc backend trả lỗi 5xx, chúng sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Lỗi</th>
                  <th className="px-6 py-3">Ticket</th>
                  <th className="whitespace-nowrap px-6 py-3">Trạng thái</th>
                  <th className="whitespace-nowrap px-6 py-3">Lần cuối</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((report) => (
                  <Fragment key={report.id}>
                    <tr className="cursor-pointer hover:bg-zinc-50" onClick={() => setExpanded(expanded === report.id ? null : report.id)}>
                      <td className="w-full max-w-0 px-6 py-4">
                        <p className="truncate font-medium" title={report.message}>{report.message.split('\n')[0]}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${report.source === 'user' ? 'bg-volt-200 text-volt-600' : 'bg-zinc-100 text-zinc-600'}`}>{ERROR_SOURCE[report.source]}</span>
                          {report.reporter_name && <span className="font-medium text-zinc-700">{report.reporter_name}</span>}
                          {report.route && <span className="font-mono">{report.route}</span>}
                          {report.occurrences > 1 && <span className="font-semibold text-zinc-700">×{report.occurrences}</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold whitespace-nowrap">{report.ticket_key ?? <span className="font-sans font-normal text-zinc-400">—</span>}</td>
                      <td className="px-6 py-4"><ErrorStatus report={report} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-500">{formatDate(report.last_seen_at, true)}</td>
                      <td className="pr-4">
                        <ChevronDown className={`size-4 text-zinc-400 transition ${expanded === report.id ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {expanded === report.id && (
                      <tr>
                        <td colSpan={5} className="p-0">
                          {/* w-0 + min-w-full: stack trace dài tự cuộn ngang, không kéo giãn cả bảng */}
                          <div className="w-0 min-w-full"><ErrorDetail id={report.id} onChanged={reload} /></div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
