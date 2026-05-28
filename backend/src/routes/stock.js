const express = require('express');
const { getDb } = require('../db/database');

module.exports = (io) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { alerta } = req.query;
    let sql = `
      SELECT s.*, p.nombre as producto_nombre, p.codigo_barras, p.precio_venta, p.precio_costo,
             c.nombre as categoria_nombre, c.color as categoria_color,
             CASE WHEN s.cantidad = 0 THEN 'sin_stock'
                  WHEN s.cantidad <= s.stock_minimo THEN 'bajo'
                  ELSE 'ok' END as estado_stock
      FROM stock s
      JOIN productos p ON s.producto_id = p.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.negocio_id = ? AND p.activo = 1
    `;
    const params = [nid];
    if (alerta === 'bajo') sql += ` AND s.cantidad > 0 AND s.cantidad <= s.stock_minimo`;
    if (alerta === 'sin_stock') sql += ` AND s.cantidad = 0`;
    sql += ` ORDER BY s.cantidad ASC`;
    const items = db.prepare(sql).all(...params);

    const resumen = db.prepare(`
      SELECT
        COUNT(*) as total_productos,
        COALESCE(SUM(s.cantidad), 0) as unidades_totales,
        COALESCE(SUM(s.cantidad * p.precio_costo), 0) as valor_costo,
        COALESCE(SUM(s.cantidad * p.precio_venta), 0) as valor_venta,
        SUM(CASE WHEN s.cantidad <= s.stock_minimo AND s.cantidad > 0 THEN 1 ELSE 0 END) as bajo_stock,
        SUM(CASE WHEN s.cantidad = 0 THEN 1 ELSE 0 END) as sin_stock
      FROM stock s JOIN productos p ON s.producto_id = p.id WHERE p.negocio_id = ? AND p.activo = 1
    `).get(nid);

    res.json({ items, resumen });
  });

  router.post('/ajuste', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { producto_id, tipo, cantidad, notas } = req.body;
    if (!producto_id || !tipo || !cantidad) return res.status(400).json({ error: 'Datos incompletos' });
    if (!['entrada', 'salida'].includes(tipo)) return res.status(400).json({ error: 'Tipo debe ser "entrada" o "salida"' });

    const producto = db.prepare(`SELECT id FROM productos WHERE id = ? AND negocio_id = ?`).get(producto_id, nid);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const tx = db.transaction(() => {
      const delta = tipo === 'entrada' ? cantidad : -cantidad;
      db.prepare(`UPDATE stock SET cantidad = MAX(0, cantidad + ?), actualizado_en = CURRENT_TIMESTAMP WHERE producto_id = ?`).run(delta, producto_id);
      db.prepare(`INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_tipo, notas) VALUES (?, ?, ?, 'ajuste_manual', ?)`).run(producto_id, tipo, Math.abs(cantidad), notas || null);
    });
    tx();
    io.to(`n:${nid}`).emit('stock:cambio');
    res.json({ ok: true });
  });

  router.put('/:producto_id/minimo', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { stock_minimo } = req.body;
    const producto = db.prepare(`SELECT id FROM productos WHERE id = ? AND negocio_id = ?`).get(req.params.producto_id, nid);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    db.prepare(`UPDATE stock SET stock_minimo = ? WHERE producto_id = ?`).run(stock_minimo, req.params.producto_id);
    res.json({ ok: true });
  });

  router.get('/movimientos', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { producto_id, limit = 50 } = req.query;
    let sql = `
      SELECT m.*, p.nombre as producto_nombre
      FROM movimientos_stock m
      JOIN productos p ON m.producto_id = p.id
      WHERE p.negocio_id = ?
    `;
    const params = [nid];
    if (producto_id) { sql += ` AND m.producto_id = ?`; params.push(producto_id); }
    sql += ` ORDER BY m.creado_en DESC LIMIT ?`;
    params.push(Number(limit));
    res.json(db.prepare(sql).all(...params));
  });

  return router;
};
