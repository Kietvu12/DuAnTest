# VOLTMA-3 — Error: Lỗi hệ thống: không thể thêm "iPhone 16 Pro Max" vào giỏ hàng (addToCart, ProductPage.jsx, variantId=1)

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/VOLTMA-3-error-loi-he-thong-khong-the-them-iphone`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.86)
- Lý do: Lỗi chặn luồng thêm sản phẩm vào giỏ hàng trên trang chi tiết iPhone 16 Pro Max. Đây là hành vi thương mại cốt lõi, ảnh hưởng trực tiếp đến khả năng mua hàng của sản phẩm được báo cáo. Stack trace chỉ rõ addToCart trong ProductPage.jsx với variantId=1, nên phạm vi sửa tập trung vào xử lý add-to-cart của trang sản phẩm này.
- Trong phạm vi: có
- Ticket mô tả trực tiếp lỗi addToCart trên ProductPage.jsx cho route /products/iphone-16-pro-max và variantId=1; chỉ nên sửa phần liên quan đến luồng thêm vào giỏ hàng của trang sản phẩm này.

## Nguyên nhân
Prompt báo lỗi: không thể thêm "iPhone 16 Pro Max" vào giỏ hàng; Stack trace có addToCart, ProductPage.jsx, variantId=1; Route: /products/iphone-16-pro-max; Nguồn: trình duyệt khách, tự động bắt lỗi; Không có ảnh đính kèm để OCR/vision

## Thay đổi
- Chưa có patch mã nguồn.

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
