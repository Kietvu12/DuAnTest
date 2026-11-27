# SHOPHO-1 — Mật khẩu đã nhập đúng nhưng vẫn báo sai

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/SHOPHO-1-mat-khau-a-nhap-ung-nhung-van-bao-sai`.

## Mức độ và phạm vi
- Mức độ: P2 (độ tin cậy 0.82)
- Lý do: Người dùng báo mật khẩu đúng nhưng hệ thống vẫn báo sai tại màn hình /login. Đây là lỗi chức năng đăng nhập trực tiếp, có thể chặn người dùng truy cập hệ thống, nhưng chưa có bằng chứng ảnh hưởng toàn bộ người dùng, mất dữ liệu hoặc lỗ hổng bảo mật nghiêm trọng.
- Trong phạm vi: có
- Lỗi được mô tả trực tiếp tại màn hình/API /login và liên quan đến xử lý xác thực đăng nhập, đúng phạm vi route và prompt của ticket.

## Nguyên nhân
prompt: mật khẩu đã nhập đúng nhưng vẫn báo sai; route: /login; luồng xác thực đăng nhập; nguồn: người dùng tự báo lỗi; không có ảnh đính kèm trong ticket

## Thay đổi
- `backend/src/routes/auth.js`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
