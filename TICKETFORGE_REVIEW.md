# VOLTMA-1 — Error: Lỗi hệ thống: không thể thêm "JBL Charge 5" vào giỏ hàng (addToCart, ProductPage.jsx, variantId=112)

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/VOLTMA-1-error-loi-he-thong-khong-the-them-jbl-ch`.

## Mức độ và phạm vi
- Mức độ: P2 (độ tin cậy 0.82)
- Lý do: Lỗi chặn thao tác thêm sản phẩm vào giỏ hàng trên trang /products/jbl-charge-5, ảnh hưởng trực tiếp đến luồng mua hàng của một sản phẩm/variant cụ thể. Chưa thấy bằng chứng lỗi toàn hệ thống, thanh toán hoặc mất dữ liệu nên không ở mức p0/p1.
- Trong phạm vi: có
- Ticket mô tả trực tiếp lỗi addToCart trên route /products/jbl-charge-5 và ProductPage.jsx với variantId=112; phạm vi sửa nên giới hạn ở handler/UI liên quan đến thêm giỏ hàng của sản phẩm này.

## Nguyên nhân
Route: /products/jbl-charge-5; Lỗi frontend tại addToCart trong ProductPage.jsx; variantId=112; Thông báo: không thể thêm "JBL Charge 5" vào giỏ hàng; Không có ảnh đính kèm để OCR/vision

## Thay đổi
- Chưa có patch mã nguồn.

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
