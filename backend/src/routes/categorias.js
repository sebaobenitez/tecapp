const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  res.json(db.prepare(`SELECT c.*, COUNT(p.id) as productos FROM categorias c LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1 WHERE c.negocio_id = ? GROUP BY c.id ORDER BY c.nombre`).all(nid));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { nombre, color } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const id = db.prepare(`INSERT INTO categorias (negocio_id, nombre, color) VALUES (?, ?, ?)`).run(req.user.negocio_id, nombre, color || '#6366f1').lastInsertRowid;
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { nombre, color } = req.body;
  if (nombre) db.prepare(`UPDATE categorias SET nombre = ? WHERE id = ? AND negocio_id = ?`).run(nombre, req.params.id, req.user.negocio_id);
  if (color) db.prepare(`UPDATE categorias SET color = ? WHERE id = ? AND negocio_id = ?`).run(color, req.params.id, req.user.negocio_id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  db.prepare(`UPDATE productos SET categoria_id = NULL WHERE categoria_id = ? AND negocio_id = ?`).run(req.params.id, nid);
  db.prepare(`DELETE FROM categorias WHERE id = ? AND negocio_id = ?`).run(req.params.id, nid);
  res.json({ ok: true });
});

module.exports = router;
