# DUANSH-3 — Mật khẩu đã nhập đúng nhưng vẫn báo sai

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/DUANSH-3-mat-khau-a-nhap-ung-nhung-van-bao-sai`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.62)
- Lý do: Lỗi chặn luồng đăng nhập: người dùng nhập đúng mật khẩu nhưng hệ thống vẫn trả về 'sai mật khẩu'. Đăng nhập là luồng bắt buộc để dùng toàn bộ hệ thống VoltTech, nên nếu nguyên nhân nằm ở phía server (so sánh hash, trim/chuẩn hoá mật khẩu, truy vấn user trong PostgreSQL) thì mọi người dùng đều có thể bị ảnh hưởng. Chưa có bằng chứng lỗi lan rộng hay mất dữ liệu nên để p1 thay vì p0. Không có ảnh đính kèm nên không có tín hiệu UI/OCR bổ sung.
- Trong phạm vi: có
- Lỗi được mô tả trực tiếp tại màn hình/route /login và liên quan tới xử lý xác thực đăng nhập, đúng phạm vi ticket. Chỉ cần sửa logic kiểm tra mật khẩu/phản hồi lỗi trong luồng /login, không mở rộng sang module khác và không cần đổi schema.

## Nguyên nhân
Prompt tiếng Việt: 'Mật khẩu đã nhập đúng nhưng vẫn báo sai'; Route bị ảnh hưởng: /login; Màn hình/API: /login; Nguồn: người dùng tự báo lỗi (Tuấn Vũ Kiệt); Stack: React + Express + PostgreSQL; Không có ảnh đính kèm để OCR/vision

## Thay đổi
- `backend/src/routes/auth.js`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
