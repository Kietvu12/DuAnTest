import { useEffect, useRef, useState } from 'react';
import { Bug, CircleCheck, LoaderCircle, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { submitUserReport } from '../lib/errorReporting';
import { useAuth } from '../lib/store';

const NAME_KEY = 'volttech.reporter';
const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

/**
 * Nút "Báo lỗi" nổi ở mọi trang (cả khu quản trị). Trang bị lỗi lấy theo trang đang mở.
 * Đã đăng nhập: dùng tên tài khoản. Chưa đăng nhập: cho nhập tên (không bắt buộc, nhớ cho lần sau).
 */
export function ReportErrorWidget() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [phase, setPhase] = useState('form'); // form | sending | sent
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const isAdminArea = pathname.startsWith('/admin');

  const close = () => {
    setOpen(false);
    if (phase === 'sent') {
      setPhase('form');
      setDescription('');
    }
    setError('');
  };

  useEffect(() => {
    if (!open) return undefined;
    textareaRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && phase !== 'sending') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);

  const submit = async (event) => {
    event.preventDefault();
    if (description.trim().length < MIN_LENGTH) return;
    setPhase('sending');
    setError('');
    try {
      await submitUserReport({ description, reporterName: user ? undefined : name });
      if (!user && name.trim()) localStorage.setItem(NAME_KEY, name.trim());
      setPhase('sent');
    } catch (err) {
      setError(err.message || 'Không gửi được báo cáo, vui lòng thử lại.');
      setPhase('form');
    }
  };

  const displayName = user?.full_name ?? (name.trim() || 'bạn');
  const tooShort = description.trim().length < MIN_LENGTH;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Báo lỗi"
        className={`fixed bottom-4 left-4 z-40 inline-flex size-11 items-center justify-center gap-2 rounded-full bg-zinc-950 text-sm font-semibold text-white shadow-lg shadow-zinc-950/25 ring-1 ring-white/10 transition hover:bg-zinc-800 active:scale-95 sm:h-11 sm:w-auto sm:px-4 ${
          isAdminArea ? 'lg:left-[17rem]' : ''
        }`}
      >
        <Bug className="size-[18px] text-volt-400" />
        <span className="hidden sm:inline">Báo lỗi</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-end bg-zinc-950/50 backdrop-blur-sm sm:place-items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && phase !== 'sending') close();
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="card max-h-[100dvh] w-full max-w-lg animate-fade-up overflow-y-auto rounded-b-none p-6 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-7">
            {phase === 'sent' ? (
              <div className="flex flex-col items-center py-4 text-center">
                <span className="grid size-16 place-items-center rounded-full bg-volt-200 text-volt-600">
                  <CircleCheck className="size-8" strokeWidth={1.75} />
                </span>
                <h2 id="report-title" className="mt-5 text-xl font-extrabold tracking-tight">Đã gửi báo lỗi</h2>
                <p className="mt-2 max-w-sm text-sm text-zinc-500">
                  Cảm ơn {displayName}. Đội kỹ thuật đã nhận được và sẽ xem xét sớm nhất có thể.
                </p>
                <button type="button" onClick={close} className="btn btn-primary mt-7 px-8">Đóng</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-950 text-volt-400">
                    <Bug className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id="report-title" className="text-lg font-extrabold tracking-tight">Báo lỗi</h2>
                    <p className="text-sm text-zinc-500">Gặp sự cố? Mô tả để đội kỹ thuật xử lý.</p>
                  </div>
                  <button type="button" onClick={close} disabled={phase === 'sending'} className="-mt-1 -mr-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950" aria-label="Đóng">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {user ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                      <span className="grid size-9 place-items-center rounded-full bg-zinc-950 text-sm font-bold text-white">
                        {user.full_name?.trim()?.[0]?.toUpperCase() ?? '?'}
                      </span>
                      <div className="min-w-0 text-sm">
                        <p className="text-xs text-zinc-500">Báo lỗi với tài khoản</p>
                        <p className="truncate font-semibold">{user.full_name}</p>
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="label">Tên của bạn <span className="font-normal text-zinc-400">(không bắt buộc)</span></span>
                      <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" placeholder="Ví dụ: Nguyễn Văn A" className="input" />
                    </label>
                  )}

                  <label className="block">
                    <span className="label">Bạn gặp vấn đề gì?</span>
                    <textarea
                      ref={textareaRef}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={MAX_LENGTH}
                      rows={5}
                      required
                      placeholder="Ví dụ: Bấm “Đặt hàng” nhưng trang không phản hồi, giỏ hàng vẫn còn nguyên…"
                      className="input h-auto resize-none py-3 leading-relaxed"
                    />
                    <span className="mt-1 flex justify-between text-xs text-zinc-400">
                      <span>{tooShort && description.length > 0 ? `Cần ít nhất ${MIN_LENGTH} ký tự` : ''}</span>
                      <span className="tabular-nums">{description.length}/{MAX_LENGTH}</span>
                    </span>
                  </label>

                  <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-500 ring-1 ring-zinc-200">
                    Tự động đính kèm trang đang mở <code className="rounded bg-white px-1.5 py-0.5 font-mono text-zinc-700 ring-1 ring-zinc-200">{pathname}</code>, thông tin trình duyệt và các lỗi vừa xảy ra trên trang.
                  </p>

                  {error && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={close} disabled={phase === 'sending'} className="btn btn-ghost">Huỷ</button>
                  <button type="submit" disabled={tooShort || phase === 'sending'} className="btn btn-primary">
                    {phase === 'sending' ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {phase === 'sending' ? 'Đang gửi…' : 'Gửi báo lỗi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
