# 4 lỗi logic lõi (DuAnTest)

| # | Lỗi | Logic sai |
|---|-----|-----------|
| 1 | Đúng password vẫn không đăng nhập | `auth.js`: `bcrypt.compare(password, row.email)` thay vì `password_hash` |
| 2 | Không thêm được vào giỏ | `store.jsx`: tìm dòng theo `variantId === productSlug`, rồi `return prev` (không push item mới) |
| 3 | Đặt hàng OK nhưng kho không trừ | `orders.js`: `UPDATE ... WHERE id=$1 AND stock < $2` (không khớp khi còn đủ hàng) |
| 4 | Admin không đổi được trạng thái đơn | `admin.js`: `UPDATE ... WHERE id=$1 AND status=$2` (chỉ “đổi” khi đã sẵn trạng thái đích) |
