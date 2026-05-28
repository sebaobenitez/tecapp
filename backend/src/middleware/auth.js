const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'cambiar-este-secreto-en-produccion';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Sesión expirada', expired: true });
    res.status(401).json({ error: 'Token inválido' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    if (!roles.includes(req.user.rol)) return res.status(403).json({ error: 'Sin permiso para esta acción' });
    next();
  };
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'superadmin') return res.status(403).json({ error: 'Solo el superadmin puede realizar esta acción' });
  next();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol, negocio_id: user.negocio_id || null },
    SECRET,
    { expiresIn: '10h' }
  );
}

module.exports = { requireAuth, requireRole, requireSuperAdmin, signToken, SECRET };
