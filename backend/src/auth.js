import jwt from 'jsonwebtoken';
import { HttpError } from './http.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục'));
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, (error) => {
    if (error) return next(error);
    if (req.user.role !== 'admin') return next(new HttpError(403, 'Bạn không có quyền truy cập'));
    next();
  });
}
