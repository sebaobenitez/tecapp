const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb, audit } = require('../db/database');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', [
  body('username').trim().notEmpty().withMessage('Usuario requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { username, password, codigo_negocio } = req.body;
  const db = getDb();
  const ip = req.ip || req.connection.remoteAddress;

  let user;

  if (codigo_negocio) {
    // Login de usuario normal: buscar dentro del negocio
    const negocio = db.prepare(`SELECT id FROM negocios WHERE codigo = ? AND activo = 1`).get(codigo_negocio.toUpperCase().trim());
    if (!negocio) {
      return res.status(401).json({ error: 'Código de negocio incorrecto' });
    }
    user = db.prepare(`SELECT * FROM usuarios WHERE username = ? AND negocio_id = ? AND activo = 1`).get(username.toLowerCase().trim(), negocio.id);
  } else {
    // Login de superadmin (sin negocio)
    user = db.prepare(`SELECT * FROM usuarios WHERE username = ? AND rol = 'superadmin' AND activo = 1`).get(username.toLowerCase().trim());
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    audit(null, username, 'login_fallido', 'auth', null, `Intento fallido: ${username}`, ip, null);
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  db.prepare(`UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);
  audit(user.id, user.nombre, 'login', 'auth', user.id, null, ip, user.negocio_id);

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, nombre: user.nombre, username: user.username, rol: user.rol, negocio_id: user.negocio_id },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(`SELECT id, nombre, username, rol, negocio_id, ultimo_acceso FROM usuarios WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.post('/cambiar-password', requireAuth, [
  body('password_actual').notEmpty().withMessage('Contraseña actual requerida'),
  body('password_nuevo').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { password_actual, password_nuevo } = req.body;
  const db = getDb();
  const user = db.prepare(`SELECT * FROM usuarios WHERE id = ?`).get(req.user.id);

  if (!bcrypt.compareSync(password_actual, user.password_hash))
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });

  const hash = bcrypt.hashSync(password_nuevo, 10);
  db.prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`).run(hash, req.user.id);
  audit(req.user.id, req.user.nombre, 'cambio_password', 'usuario', req.user.id, null, req.ip, req.user.negocio_id);
  res.json({ ok: true });
});

module.exports = router;
