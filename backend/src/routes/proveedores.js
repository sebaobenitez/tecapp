const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  const { buscar } = req.query;
  let sql = `
    SELECT p.*,
      COUNT(DISTINCT prod.id) as total_productos,
      COUNT(DISTINCT c.id) as total_compras,
      COALESCE(SUM(c.total), 0) as monto_compras
    FROM proveedores p
    LEFT JOIN productos prod ON prod.proveedor_id = p.id AND prod.activo = 1
    LEFT JOIN compras c ON c.proveedor_id = p.id
    WHERE p.negocio_id = ? AND p.activo = 1
  `;
  const params = [nid];
  if (buscar) { sql += ` AND (p.nombre LIKE ? OR p.telefono LIKE ? OR p.email LIKE ?)`; params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`); }
  sql += ` GROUP BY p.id ORDER BY p.nombre`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const proveedor = db.prepare(`SELECT * FROM proveedores WHERE id = ? AND negocio_id = ?`).get(req.params.id, req.user.negocio_id);
  if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
  const productos = db.prepare(`SELECT id, nombre, precio_venta, precio_costo FROM productos WHERE proveedor_id = ? AND negocio_id = ? AND activo = 1`).all(req.params.id, req.user.negocio_id);
  const compras = db.prepare(`SELECT * FROM compras WHERE proveedor_id = ? ORDER BY creado_en DESC LIMIT 10`).all(req.params.id);
  res.json({ ...proveedor, productos, compras });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { nombre, telefono, email, direccion, notas } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const id = db.prepare(`INSERT INTO proveedores (negocio_id, nombre, telefono, email, direccion, notas) VALUES (?, ?, ?, ?, ?, ?)`).run(req.user.negocio_id, nombre, telefono || null, email || null, direccion || null, notas || null).lastInsertRowid;
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
  db.prepare(`UPDATE proveedores SET ${updates.join(', ')} WHERE id = ? AND negocio_id = ?`).run(...params);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE proveedores SET activo = 0 WHERE id = ? AND negocio_id = ?`).run(req.params.id, req.user.negocio_id);
  res.json({ ok: true });
});

module.exports = router;
