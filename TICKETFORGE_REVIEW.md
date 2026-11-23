# DUANSH-1 — Lỗi đăng nhập báo lỗi sai pass dù nhập đúng pass

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/DUANSH-1-loi-ang-nhap-bao-loi-sai-pass-du-nhap-un`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.92)
- Lý do: Lỗi đăng nhập trên route /login báo sai mật khẩu dù người dùng nhập đúng, chặn truy cập hệ thống của người dùng hợp lệ. Đây là lỗi chức năng cốt lõi (authentication) nhưng chưa có dấu hiệu mất dữ liệu, lỗ hổng bảo mật hoặc sập toàn hệ thống nên mức p1.
- Trong phạm vi: có
- Ticket mô tả trực tiếp lỗi xác thực tại màn hình/API /login; phạm vi sửa chỉ nên giới hạn ở luồng đăng nhập và logic kiểm tra mật khẩu liên quan.

## Nguyên nhân
Prompt: 'Lỗi đăng nhập báo lỗi sai pass dù nhập đúng pass'; Route: /login; Màn hình/API: /login; Người báo: Tuấn Vũ Kiệt; Không có ảnh đính kèm để OCR/vision

## Thay đổi
- `backend/src/routes/auth.js`
- `frontend/src/pages/MiscPages.jsx`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
