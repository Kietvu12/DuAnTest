# SHOPHO-1 — Dù nhập đúng pass nhưng vẫn báo sai pass

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/SHOPHO-1-du-nhap-ung-pass-nhung-van-bao-sai-pass`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.82)
- Lý do: Lỗi chặn toàn bộ luồng đăng nhập: người dùng nhập đúng mật khẩu vẫn bị báo sai, không có workaround rõ ràng ngoài việc không đăng nhập được. Đây là chức năng cốt lõi (xác thực) trên route /login, ảnh hưởng mọi người dùng cuối và các luồng phía sau phụ thuộc phiên đăng nhập. Chưa tới mức p0 vì chưa có dấu hiệu mất dữ liệu, lộ dữ liệu hay sập toàn hệ thống, nhưng cần ưu tiên sửa ngay.
- Trong phạm vi: có
- Prompt và route cùng chỉ về luồng đăng nhập tại /login (React + Express + PostgreSQL). Việc sửa lỗi so khớp mật khẩu/xác thực nằm đúng phạm vi ticket; các thay đổi phải giới hạn ở phần liên quan trực tiếp tới /login, không đổi schema, không đụng luồng khác, và đẩy lên nhánh ticketforge/.

## Nguyên nhân
[object Object]; [object Object]; [object Object]; [object Object]

## Thay đổi
- `backend/src/routes/auth.js`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
