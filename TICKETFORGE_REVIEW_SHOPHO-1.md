# SHOPHO-1 — Nhập đúng password nhưng vẫn báo sai

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/SHOPHO-1-nhap-ung-password-nhung-van-bao-sai`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.78)
- Lý do: Người dùng báo nhập đúng mật khẩu nhưng hệ thống vẫn trả về lỗi sai mật khẩu tại màn hình /login. Đây là lỗi chặn luồng xác thực cốt lõi (không thể đăng nhập), ảnh hưởng trực tiếp tới toàn bộ người dùng của cửa hàng nếu lỗi nằm ở phía server (so khớp hash, trim/encoding mật khẩu, truy vấn PostgreSQL) chứ không chỉ một tài khoản. Chưa có bằng chứng lỗi chỉ xảy ra với một người nên xếp p1 thay vì p2. Không có ảnh đính kèm nên không có tín hiệu OCR/UI bổ sung.
- Trong phạm vi: có
- Ticket mô tả lỗi đăng nhập tại đúng route /login, trùng với màn hình/API được ghi trong ticket; phạm vi sửa chỉ nên giới hạn ở luồng xác thực đăng nhập (component form login phía React và handler/route đăng nhập phía Express), không mở rộng sang đăng ký, phân quyền hay đổi schema dữ liệu.

## Nguyên nhân
prompt: 'Nhập đúng password nhưng vẫn báo sai'; route: /login; screen/API: /login; stack: React + Express + PostgreSQL (nghi vấn so khớp hash mật khẩu hoặc xử lý input ở tầng API); reporter: Tuấn Vũ Kiệt (người dùng tự báo lỗi); no image attached

## Thay đổi
- `backend/src/routes/auth.js`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
