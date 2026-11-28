# SHOPHO-2 — Sản phẩm báo còn hàng nhưng bấm thêm sản phẩm thì báo lỗi không thêm được

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/SHOPHO-2-san-pham-bao-con-hang-nhung-bam-them-san`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.72)
- Lý do: Người dùng báo sản phẩm Lenovo Legion 5 Pro trên trang /products/lenovo-legion-5-pro hiển thị trạng thái còn hàng nhưng thao tác thêm vào giỏ lại thất bại. Đây là lỗi chặn luồng mua hàng cốt lõi (add-to-cart) trên một trang sản phẩm cụ thể, ảnh hưởng trực tiếp tới doanh thu và trải nghiệm mua sắm. Chưa có ảnh đính kèm nên không xác định được thông báo lỗi cụ thể, do đó confidence ở mức khá chứ không cao; nếu lỗi lan rộng ra toàn bộ danh mục sản phẩm thì nên nâng lên p0.
- Trong phạm vi: có
- Ticket mô tả trực tiếp lỗi thêm sản phẩm vào giỏ tại route /products/lenovo-legion-5-pro, nên phạm vi hợp lệ là logic hiển thị tồn kho và luồng add-to-cart liên quan tới sản phẩm này (component nút thêm giỏ, handler/API thêm giỏ, kiểm tra stock tương ứng).

## Nguyên nhân
[object Object]; [object Object]; [object Object]; [object Object]; [object Object]; [object Object]

## Thay đổi
- `frontend/src/lib/store.jsx`
- `frontend/src/pages/ProductPage.jsx`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
