# DUANSH-4 — Còn hàng nhưng bấm thêm vào thì báo lỗi không còn

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/DUANSH-4-con-hang-nhung-bam-them-vao-thi-bao-loi-`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.84)
- Lý do: The product detail page indicates the item is in stock, but adding it to the cart fails with an out-of-stock error. This breaks a core purchase action for the reported product and likely indicates a stock-status or add-to-cart validation mismatch.
- Trong phạm vi: có
- The ticket directly references the product route and the add-to-cart behavior on that page, so the investigation should focus on the product page/API and cart stock validation related to this route.

## Nguyên nhân
Route: /products/ipad-air-m3; Prompt reports stock shown as available; Add-to-cart action returns 'không còn' / out-of-stock error; User-reported purchase-flow failure; No image attached

## Thay đổi
- `frontend/src/pages/ProductPage.jsx`
- `backend/src/routes/orders.js`


## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
