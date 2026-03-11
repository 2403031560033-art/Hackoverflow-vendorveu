import jwt from 'jsonwebtoken';

export function adminAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Admin authorization required' });
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'ADMIN_JWT_SECRET is not configured' });
    }

    const payload = jwt.verify(token, secret);
    req.admin = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

