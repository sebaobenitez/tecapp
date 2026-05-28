const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, createNegocio } = require('../db/database');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireSuperAdmin);

router.get('/', (req, res) => {
  const db = getDb();
  const negocios = db.prepare(`
    SELECT n.*,
      (SELECT COUNT(*) FROM usuarios WHERE negocio_id = n.id AND activo = 1) as usuarios_activos,
      (SELECT COUNT(*) FROM ventas WHERE negocio_id = n.id AND estado = 'completada') as total_ventas,
      (SELECT COALESCE(SUM(total), 0) FROM ventas WHERE negocio_id = n.id AND estado = 'completada') as monto_ventas,
      (SELECT MAX(creado_en) FROM ventas WHERE negocio_id = n.id) as ultima_venta
    FROM negocios n ORDER BY n.creado_en DESC
  `).all();
  res.json(negocios);
});

router.post('/', (req, res) => {
  const { codigo, nombre } = req.body;
  if (!codigo || !nombre) return res.status(400).json({ error: 'Código y nombre son requeridos' });
  const db = getDb();
  const existe = db.prepare(`SELECT id FROM negocios WHERE codigo = ?`).get(codigo.toUpperCase().trim());
  if (existe) return res.status(409).json({ error: 'El código ya está en uso' });

  try {
    const negocioId = createNegocio(codigo, nombre);
    res.status(201).json({ id: negocioId, codigo: codigo.toUpperCase(), message: `Negocio creado. Admin inicial: usuario=admin, contraseña=admin123` });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { nombre, plan, activo } = req.body;
  const updates = [], params = [];
  if (nombre) { updates.push('nombre = ?'); params.push(nombre); }
  if (plan) { updates.push('plan = ?'); params.push(plan); }
  if (activo !== undefined) { updates.push('activo = ?'); params.push(activo ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
  params.push(req.params.id);
  db.prepare(`UPDATE negocios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE negocios SET activo = 0 WHERE id = ?`).run(req.params.id);
  db.prepare(`UPDATE usuarios SET activo = 0 WHERE negocio_id = ?`).run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/reset-admin', (req, res) => {
  const db = getDb();
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`UPDATE usuarios SET password_hash = ? WHERE negocio_id = ? AND username = 'admin'`).run(hash, req.params.id);
  res.json({ ok: true, message: 'Contraseña del admin reseteada a admin123' });
});

module.exports = router;
