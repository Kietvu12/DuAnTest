# VOLTMA-2 — Error: Lỗi hệ thống: không thể thêm "AirPods Pro 2 (USB-C)" vào giỏ hàng (addToCart, ProductPage.jsx, variantId=106)

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/VOLTMA-2-error-loi-he-thong-khong-the-them-airpod`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.86)
- Lý do: Lỗi chặn luồng mua hàng chính (addToCart) cho sản phẩm AirPods Pro 2 (USB-C) trên trang sản phẩm; khách không thể thêm variantId=106 vào giỏ hàng. Ảnh hưởng trực tiếp đến chuyển đổi nhưng phạm vi giới hạn ở một sản phẩm/variant nên chưa mức p0.
- Trong phạm vi: có
- Ticket mô tả trực tiếp lỗi addToCart tại ProductPage.jsx cho route và variant cụ thể. Chỉ nên sửa phần liên quan đến add-to-cart của variant 106 và trang sản phẩm này.

## Nguyên nhân
Prompt và stack trace chỉ ra addToCart trong ProductPage.jsx; variantId=106; Route: /products/airpods-pro-2-usb-c; Nguồn: trình duyệt khách, lỗi hệ thống khi click add-to-cart; Không có ảnh đính kèm trong ticket

## Thay đổi
- Chưa có patch mã nguồn.

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
