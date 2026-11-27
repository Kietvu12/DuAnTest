# SHOPHO-2 — Lỗi đã bấm thêm sản phẩm vào giỏ hàng nhưng không thấy gì cả

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/SHOPHO-2-loi-a-bam-them-san-pham-vao-gio-hang-nhu`.

## Mức độ và phạm vi
- Mức độ: P2 (độ tin cậy 0.6)
- Lý do: Người dùng báo đã bấm thêm sản phẩm vào giỏ hàng nhưng không thấy sản phẩm nào hiển thị. Đây là lỗi chức năng ở luồng giỏ hàng (route /cart), ảnh hưởng trực tiếp tới đường mua hàng nhưng chưa rõ nguyên nhân: có thể là API thêm-giỏ hàng thất bại, state giỏ hàng không cập nhật, hoặc chỉ thiếu phản hồi UI (toast/badge) chứ dữ liệu vẫn được lưu. Vì mô tả ngắn, không có ảnh/minh chứng và mức độ ảnh hưởng chưa xác định (không rõ có chặn hoàn toàn việc mua hàng hay không), chấm p2 thay vì p1.
- Trong phạm vi: có
- Ticket mô tả lỗi thêm sản phẩm vào giỏ nhưng /cart không hiển thị, khớp trực tiếp với route /cart. Phạm vi sửa chỉ nên giới hạn ở logic thêm-vào-giỏ và hiển thị giỏ hàng (component/route /cart và endpoint giỏ hàng liên quan).

## Nguyên nhân
prompt: 'đã bấm thêm sản phẩm vào giỏ hàng nhưng không thấy gì cả' — hành động add-to-cart không có kết quả quan sát được; route: /cart — màn hình giỏ hàng là nơi kỳ vọng hiển thị sản phẩm; screen/api: /cart — cần kiểm tra cả render giỏ hàng phía React và API giỏ hàng phía Express/PostgreSQL; không có ảnh đính kèm: không có OCR/UI để đối chiếu, nên reason chỉ dựa trên text; nguồn: người dùng tự báo lỗi, không có log/mã lỗi kèm theo; không có dấu hiệu lỗi dữ liệu/schema trong mô tả

## Thay đổi
- `frontend/src/lib/store.jsx`
- `frontend/src/pages/CartPage.jsx`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
