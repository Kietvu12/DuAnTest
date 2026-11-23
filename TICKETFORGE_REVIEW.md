# DUANSH-2 — Lỗi không đăng nhập được mặc dù đúng password

## Tóm tắt
Agent đã đánh giá ticket bằng `deepseek-flash` và ghi nhận trên nhánh `ticketforge/DUANSH-2-loi-khong-ang-nhap-uoc-mac-du-ung-passwo`.

## Mức độ và phạm vi
- Mức độ: P1 (độ tin cậy 0.86)
- Lý do: Người dùng không thể đăng nhập dù nhập đúng mật khẩu tại route /login. Đây là lỗi chặn luồng xác thực cốt lõi, ảnh hưởng trực tiếp đến khả năng truy cập hệ thống của người dùng.
- Trong phạm vi: có
- Lỗi được mô tả trực tiếp tại màn hình/API /login và liên quan đến chức năng đăng nhập, đúng phạm vi route của ticket.

## Nguyên nhân
Route: /login; Prompt: Lỗi không đăng nhập được mặc dù đúng password; Nguồn: Người dùng tự báo lỗi; Người báo: Tuấn Vũ Kiệt; Màn hình / API: /login; Stack: React + Express + PostgreSQL; Không có ảnh đính kèm để OCR/vision

## Thay đổi
- `backend/src/routes/auth.js`
- `frontend/src/pages/MiscPages.jsx`

## Rủi ro
Bản vá cần lập trình viên đọc diff trước khi merge vào nhánh sản phẩm.

## Cách kiểm tra
Đối chiếu route và mô tả trong ticket, rồi chạy lại đúng thao tác gây lỗi.
