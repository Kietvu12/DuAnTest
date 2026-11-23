import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { requireAuth, signToken } from '../auth.js';
import { query } from '../db.js';
import { HttpError, text } from '../http.js';

const router = Router();

const PUBLIC_FIELDS = 'id, email, full_name, phone, role, created_at';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const password = String(req.body?.password ?? '');
  const {
    rows: [row],
  } = await query(`SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE email = $1`, [email]);
  // So sánh mật khẩu người dùng nhập với hash đã lưu (cột password_hash), không phải email.
  if (!row || !row.password_hash || !(await bcrypt.compare(password, row.password_hash))) {
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
