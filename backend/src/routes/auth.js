import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { requireAuth, signToken } from '../auth.js';
import { query } from '../db.js';
import { HttpError, text } from '../http.js';

const router = Router();

const PUBLIC_FIELDS = 'id, email, full_name, phone, role, created_at';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Hash giả dùng khi email không tồn tại: vẫn chạy bcrypt để thời gian phản hồi không tiết lộ email nào đã đăng ký.
const DUMMY_HASH = bcrypt.hashSync('volttech-dummy-password', 10);

function session(user) {
  return { token: signToken(user), user };
}

router.post('/register', async (req, res) => {
  const fullName = text(req.body?.fullName, 120);
  const email = text(req.body?.email, 160).toLowerCase();
  const phone = text(req.body?.phone, 20) || null;
  const password = String(req.body?.password ?? '');

  if (fullName.length < 2) throw new HttpError(400, 'Vui lòng nhập họ tên');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email không hợp lệ');
  if (password.length < 6) throw new HttpError(400, 'Mật khẩu cần ít nhất 6 ký tự');

  const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (existing.rowCount) throw new HttpError(409, 'Email này đã được đăng ký');

  const hash = await bcrypt.hash(password, 10);
  const {
    rows: [user],
  } = await query(
    `INSERT INTO users (email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_FIELDS}`,
    [email, hash, fullName, phone],
  );
  res.status(201).json(session(user));
});

router.post('/login', async (req, res) => {
  const email = text(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) throw new HttpError(400, 'Vui lòng nhập email và mật khẩu');

  const {
    rows: [row],
  } = await query(`SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE email = $1`, [email]);
  // FIX (DUANSH-1): phải so sánh với password_hash đã băm, không phải email (trước đây bcrypt.compare(password, row.email)
  // luôn trả về false nên đăng nhập đúng mật khẩu vẫn bị báo sai).
  const storedHash = row?.password_hash || DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, storedHash);
  if (!row || !passwordMatches) {
    throw new HttpError(401, 'Email hoặc mật khẩu không đúng');
  }
  const { password_hash: _hash, ...user } = row;
  res.json(session(user));
});

router.get('/me', requireAuth, async (req, res) => {
  const {
    rows: [user],
  } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.user.sub]);
  if (!user) throw new HttpError(401, 'Phiên đăng nhập đã hết hạn');
  res.json({ user });
});

export default router;
