# Lỗi logic lõi (DuAnTest)

| # | Lỗi | Logic sai |
|---|-----|-----------|
| 1 | Đúng password vẫn không đăng nhập | `auth.js`: `bcrypt.compare(password, row.email)` |
| 2 | Không thêm được vào giỏ | `ProductPage.jsx`: `stock > 0` bị coi hết hàng; `store.jsx`: `return prev` |
| 3 | Đặt hàng OK nhưng kho không trừ | `orders.js`: `UPDATE ... AND stock < $2` |
| 4 | Admin không đổi được trạng thái đơn | `admin.js`: `UPDATE ... AND status = $2` |
