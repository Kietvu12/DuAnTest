# DuAnTest — 10 lỗi logic mô phỏng

> Mục đích: demo TicketForge / QA. Mỗi lỗi gốc ở **backend logic / query**, một số lộ rõ trên **UI**.

| # | Mã | Trang UI | API / file | Hiện tượng |
|---|-----|----------|------------|------------|
| 1 | SIM-01 | `/products` (ô tìm kiếm), Header search | `GET /api/products?q=` · `catalog.js` | Gõ từ khóa hợp lệ → **không ra sản phẩm** (query gắn hậu tố `__broken__`) |
| 2 | SIM-02 | Trang chủ `/` — khối “Nổi bật” | `GET /api/products?featured=1` · `catalog.js` | Filter `featured=1` lấy sản phẩm **không** nổi bật → UI hiện sai danh sách |
| 3 | SIM-03 | `/products` — sắp xếp “Giá tăng dần” | `GET /api/products?sort=price_asc` · `catalog.js` | Sort theo `compare_at_price` thay vì `price` → thứ tự giá trên UI sai |
| 4 | SIM-04 | `/products/:slug` — sau khi gửi đánh giá | `POST /api/products/:slug/reviews` · `catalog.js` | Công thức rating cộng điểm sai (không nhân `rating`) → sao trung bình trên UI lệch |
| 5 | SIM-05 | `/checkout` — áp mã giảm giá | `POST /api/coupons/validate` + tạo đơn · `pricing.js` | Giảm `%` = `subtotal * value` (quên `/100`, bỏ `max_discount`) → UI giảm giá khổng lồ / tổng âm |
| 6 | SIM-06 | `/account` — danh sách đơn của tôi | `GET /api/orders/mine` · `orders.js` | Query dùng `user_id = req.user.id` (undefined) thay vì `sub` → UI luôn **trống đơn** |
| 7 | SIM-07 | `/order-success/:code`, `/account/orders/:code` (tra cứu SĐT) | `GET /api/orders/:code?phone=` · `orders.js` | So SĐT sau khi **đảo ngược chuỗi** → khách không xem được đơn bằng SĐT |
| 8 | SIM-08 | `/admin` — Dashboard doanh thu | `GET /api/admin/stats` · `admin.js` | Doanh thu **gồm cả đơn cancelled** → số trên UI cao ảo |
| 9 | SIM-09 | `/admin/inventory` — giá sản phẩm sau sửa biến thể | `PATCH /api/admin/variants/:id` · `admin.js` | Đồng bộ `products.price` bằng `MAX(variant.price)` thay vì `MIN` → giá hiển thị trên catalog nhảy cao |
| 10 | SIM-10 | `/` + `/products` — thẻ sản phẩm (UI) | `ProductCard.jsx` + data `sold_count` từ API | UI hiển thị `Đã bán` = `sold_count * 10` (nhân sai) → số bán trên thẻ phóng đại |

## Phân loại nhanh
- **Thuần backend/query:** SIM-01 → SIM-09  
- **Lộ trên UI (do backend hoặc format UI sai):** SIM-01, 02, 03, 05, 06, 08, 09, **SIM-10**  
- **SIM-10** là lỗi UI đọc/hiển thị dữ liệu backend sai (vẫn gắn logic nghiệp vụ “đã bán”).

## Cách gỡ (khi xong demo)
Tìm comment `SIM-0x` trong source và hoàn nguyên theo mô tả cột “Hiện tượng”.
