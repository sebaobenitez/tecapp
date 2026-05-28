const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  const { buscar } = req.query;
  let sql = `
    SELECT c.*,
      COUNT(v.id) as total_compras,
      COALESCE(SUM(v.total), 0) as monto_total
    FROM clientes c
    LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
    WHERE c.negocio_id = ? AND c.activo = 1
  `;
  const params = [nid];
  if (buscar) { sql += ` AND (c.nombre LIKE ? OR c.telefono LIKE ? OR c.email LIKE ?)`; params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`); }
  sql += ` GROUP BY c.id ORDER BY monto_total DESC`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const cliente = db.prepare(`SELECT * FROM clientes WHERE id = ? AND negocio_id = ?`).get(req.params.id, req.user.negocio_id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  const ventas = db.prepare(`SELECT * FROM ventas WHERE cliente_id = ? AND negocio_id = ? ORDER BY creado_en DESC LIMIT 20`).all(req.params.id, req.user.negocio_id);
  const stats = db.prepare(`SELECT COUNT(*) as compras, COALESCE(SUM(total), 0) as total FROM ventas WHERE cliente_id = ? AND negocio_id = ? AND estado = 'completada'`).get(req.params.id, req.user.negocio_id);
  res.json({ ...cliente, ventas, stats });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { nombre, telefono, email, direccion, notas } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const id = db.prepare(`INSERT INTO clientes (negocio_id, nombre, telefono, email, direccion, notas) VALUES (?, ?, ?, ?, ?, ?)`).run(req.user.negocio_id, nombre, telefono || null, email || null, direccion || null, notas || null).lastInsertRowid;
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { nombre, telefono, email, direccion, notas, activo } = req.body;
  const updates = [], params = [];
  if (nombre !== undefined) { updates.push('nombre = ?'); params.push(nombre); }
  if (telefono !== undefined) { updates.push('telefono = ?'); params.push(telefono); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (direccion !== undefined) { updates.push('direccion = ?'); params.push(direccion); }
  if (notas !== undefined) { updates.push('notas = ?'); params.push(notas); }
  if (activo !== undefined) { updates.push('activo = ?'); params.push(activo); }
  if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
  params.push(req.params.id, req.user.negocio_id);
  db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ? AND negocio_id = ?`).run(...params);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE clientes SET activo = 0 WHERE id = ? AND negocio_id = ?`).run(req.params.id, req.user.negocio_id);
  res.json({ ok: true });
});

module.exports = router;
