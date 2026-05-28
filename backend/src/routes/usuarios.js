const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb, audit } = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT id, nombre, username, rol, activo, ultimo_acceso, creado_en FROM usuarios WHERE negocio_id = ? ORDER BY creado_en DESC`).all(req.user.negocio_id));
});

router.post('/', [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('username').trim().notEmpty().withMessage('Usuario requerido').isLength({ min: 3 }).withMessage('Mínimo 3 caracteres'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña mínima 6 caracteres'),
  body('rol').isIn(['admin', 'supervisor', 'cajero']).withMessage('Rol inválido'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { nombre, username, password, rol } = req.body;
  const db = getDb();
  const nid = req.user.negocio_id;

  const existe = db.prepare(`SELECT id FROM usuarios WHERE username = ? AND negocio_id = ?`).get(username.toLowerCase().trim(), nid);
  if (existe) return res.status(409).json({ error: 'El nombre de usuario ya existe en este negocio' });

  const hash = bcrypt.hashSync(password, 10);
  const id = db.prepare(`INSERT INTO usuarios (negocio_id, nombre, username, password_hash, rol) VALUES (?, ?, ?, ?, ?)`)
    .run(nid, nombre.trim(), username.toLowerCase().trim(), hash, rol).lastInsertRowid;

  audit(req.user.id, req.user.nombre, 'crear_usuario', 'usuario', id, `${username} (${rol})`, req.ip, nid);
  res.status(201).json({ id });
});

router.put('/:id', [
  body('username').optional().trim().isLength({ min: 3 }).withMessage('Usuario mínimo 3 caracteres'),
  body('rol').optional().isIn(['admin', 'supervisor', 'cajero']).withMessage('Rol inválido'),
  body('password').optional().isLength({ min: 6 }).withMessage('Contraseña mínima 6 caracteres'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const db = getDb();
  const nid = req.user.negocio_id;
  const { nombre, username, rol, activo, password } = req.body;

  const target = db.prepare(`SELECT * FROM usuarios WHERE id = ? AND negocio_id = ?`).get(req.params.id, nid);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (rol && rol !== 'admin' && target.rol === 'admin') {
    const adminCount = db.prepare(`SELECT COUNT(*) as c FROM usuarios WHERE rol = 'admin' AND activo = 1 AND negocio_id = ?`).get(nid);
    if (adminCount.c <= 1) return res.status(400).json({ error: 'No podés degradar al único admin' });
  }

  if (username) {
    const u = username.toLowerCase().trim();
    const existe = db.prepare(`SELECT id FROM usuarios WHERE username = ? AND negocio_id = ? AND id != ?`).get(u, nid, req.params.id);
    if (existe) return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
    db.prepare(`UPDATE usuarios SET username = ? WHERE id = ? AND negocio_id = ?`).run(u, req.params.id, nid);
  }
  if (nombre) db.prepare(`UPDATE usuarios SET nombre = ? WHERE id = ? AND negocio_id = ?`).run(nombre.trim(), req.params.id, nid);
  if (rol) db.prepare(`UPDATE usuarios SET rol = ? WHERE id = ? AND negocio_id = ?`).run(rol, req.params.id, nid);
  if (activo !== undefined) db.prepare(`UPDATE usuarios SET activo = ? WHERE id = ? AND negocio_id = ?`).run(activo ? 1 : 0, req.params.id, nid);
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ? AND negocio_id = ?`).run(hash, req.params.id, nid);
  }

  audit(req.user.id, req.user.nombre, 'editar_usuario', 'usuario', req.params.id, null, req.ip, nid);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });

  const target = db.prepare(`SELECT rol FROM usuarios WHERE id = ? AND negocio_id = ?`).get(req.params.id, nid);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (target.rol === 'admin') {
    const adminCount = db.prepare(`SELECT COUNT(*) as c FROM usuarios WHERE rol = 'admin' AND activo = 1 AND negocio_id = ?`).get(nid);
    if (adminCount.c <= 1) return res.status(400).json({ error: 'No podés eliminar al único admin' });
  }

  db.prepare(`UPDATE usuarios SET activo = 0 WHERE id = ? AND negocio_id = ?`).run(req.params.id, nid);
  audit(req.user.id, req.user.nombre, 'desactivar_usuario', 'usuario', req.params.id, null, req.ip, nid);
  res.json({ ok: true });
});

router.get('/audit', (req, res) => {
  const db = getDb();
  const { limit = 100 } = req.query;
  res.json(db.prepare(`SELECT * FROM audit_log WHERE negocio_id = ? ORDER BY creado_en DESC LIMIT ?`).all(req.user.negocio_id, Number(limit)));
});

module.exports = router;
