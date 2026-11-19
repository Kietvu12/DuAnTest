import { Route, Routes } from 'react-router-dom';
import { Layout, RequireAuth, ScrollToTop } from './components/Layout';
import { AdminDashboard, AdminInventory, AdminLayout, AdminOrders } from './pages/AdminPages';
import CartPage from './pages/CartPage';
import CatalogPage from './pages/CatalogPage';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import { LoginPage, NotFoundPage, RegisterPage, WishlistPage } from './pages/MiscPages';
import { AccountPage, OrderDetailPage, OrderSuccessPage } from './pages/OrderPages';
import ProductPage from './pages/ProductPage';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<CatalogPage />} />
          <Route path="products/:slug" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-success/:code" element={<OrderSuccessPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="account/orders/:code" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="inventory" element={<AdminInventory />} />
        </Route>
      </Routes>
    </>
  );
}
