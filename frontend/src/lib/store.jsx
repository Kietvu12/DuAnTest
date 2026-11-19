import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, X } from 'lucide-react';
import { api, tokenStore } from './api';

const AuthContext = createContext(null);
const CartContext = createContext(null);
const WishlistContext = createContext(null);
const ToastContext = createContext(null);

const MAX_PER_LINE = 20;

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (path, body) => {
    const data = await api(path, { method: 'POST', body });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function CartProvider({ children }) {
  const [items, setItems] = usePersistentState('voltmart.cart', []);

  const add = useCallback(
    (line, quantity = 1) =>
      setItems((prev) => {
        const max = Math.min(line.stock ?? MAX_PER_LINE, MAX_PER_LINE);
        const existing = prev.find((item) => item.variantId === line.variantId);
        if (existing) {
          return prev.map((item) =>
            item.variantId === line.variantId ? { ...item, ...line, quantity: Math.min(item.quantity + quantity, max) } : item,
          );
        }
        return [...prev, { ...line, quantity: Math.min(quantity, max) }];
      }),
    [setItems],
  );

  const update = useCallback(
    (variantId, quantity) =>
      setItems((prev) =>
        prev.map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock ?? MAX_PER_LINE, MAX_PER_LINE)) }
            : item,
        ),
      ),
    [setItems],
  );

  const remove = useCallback((variantId) => setItems((prev) => prev.filter((item) => item.variantId !== variantId)), [setItems]);
  const clear = useCallback(() => setItems([]), [setItems]);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { items, count, subtotal, add, update, remove, clear };
  }, [items, add, update, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function WishlistProvider({ children }) {
  const [items, setItems] = usePersistentState('voltmart.wishlist', []);

  const has = useCallback((slug) => items.some((item) => item.slug === slug), [items]);
  const toggle = useCallback(
    (product) =>
      setItems((prev) =>
        prev.some((item) => item.slug === product.slug)
          ? prev.filter((item) => item.slug !== product.slug)
          : [{ ...product, related: undefined, reviews: undefined, variants: undefined }, ...prev],
      ),
    [setItems],
  );

  const value = useMemo(() => ({ items, has, toggle }), [items, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((toast) => toast.id !== id)), []);
  const show = useCallback(
    (message, options = {}) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((prev) => [...prev.slice(-2), { id, message, ...options }]);
      setTimeout(() => dismiss(id), options.duration ?? 3200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm animate-toast items-center gap-3 rounded-2xl bg-zinc-950 py-3 pr-3 pl-4 text-sm text-white shadow-2xl shadow-zinc-950/30"
          >
            <CircleCheck className={`size-5 shrink-0 ${toast.tone === 'error' ? 'text-rose-400' : 'text-volt-400'}`} />
            <span className="flex-1">{toast.message}</span>
            {toast.action}
            <button type="button" onClick={() => dismiss(toast.id)} className="rounded-full p-1 text-zinc-400 hover:text-white" aria-label="Đóng">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
export const useWishlist = () => useContext(WishlistContext);
export const useToast = () => useContext(ToastContext);
