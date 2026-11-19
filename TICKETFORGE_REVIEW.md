# VOLTMA-4 — Bấm "Thêm vào giỏ" ở trang iPhone 16 Pro Max thì hiện thông báo "Lỗi hệ thống", sản phẩm không được thêm vào giỏ hàng.

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/VOLTMA-4-bam-them-vao-gio-o-trang-iphone-16-pro-m`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.88)
- Lý do: Lỗi chặn thao tác thêm sản phẩm vào giỏ hàng trên trang iPhone 16 Pro Max, kèm thông báo 'Lỗi hệ thống' và sản phẩm không được thêm vào giỏ. Đây là bước quan trọng trong luồng mua hàng và không thấy workaround rõ ràng trên cùng trang.
- Trong phạm vi: có
- Lỗi trực tiếp liên quan tới route /products/iphone-16-pro-max và hành vi addToCart của sản phẩm trong ticket; phạm vi sửa nên giới hạn ở ProductPage/addToCart và phần giỏ hàng liên quan trực tiếp nếu cần.

## Nguyên nhân
Prompt: bấm 'Thêm vào giỏ' tại trang iPhone 16 Pro Max hiện 'Lỗi hệ thống'; Sản phẩm không được thêm vào giỏ hàng; Route /products/iphone-16-pro-max khớp với sản phẩm được báo; Stack trace: addToCart tại ProductPage.jsx, variantId=1; Không có ảnh đính kèm trong ticket

## Thay đổi
- `frontend/src/pages/ProductPage.jsx`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
