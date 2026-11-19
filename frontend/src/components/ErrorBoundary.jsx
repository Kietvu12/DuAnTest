import { Component } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { reportError } from '../lib/errorReporting';

/**
 * Bắt lỗi khi render, báo về server và hiện màn hình dự phòng.
 * Cố ý không dùng context/provider nào của app: component này phải còn chạy được khi chính chúng bị lỗi.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(`${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`, `${error?.stack ?? ''}\n\nComponent stack:${info?.componentStack ?? ''}`, {
      environment: { source: 'react-error-boundary' },
    });
  }

  componentDidUpdate(previous) {
    // Chuyển sang trang khác thì thử render lại.
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50 p-6">
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <TriangleAlert className="size-7" strokeWidth={1.5} />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight">Có lỗi xảy ra</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Rất tiếc, trang này vừa gặp sự cố. Đội kỹ thuật đã nhận được báo cáo và sẽ xử lý sớm.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw className="size-4" /> Tải lại trang
            </button>
            <a href="/" className="btn btn-outline">Về trang chủ</a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 max-h-40 overflow-auto rounded-xl bg-zinc-950 p-3 text-left text-xs text-zinc-300">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export function RouterErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
