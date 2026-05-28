const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const negocio = db.prepare(`SELECT * FROM negocios WHERE id = ?`).get(nid);

  const ventasHoy = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as transacciones
    FROM ventas WHERE negocio_id = ? AND DATE(creado_en) = ? AND estado = 'completada'
  `).get(nid, today);

  const ventasAyer = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total
    FROM ventas WHERE negocio_id = ? AND DATE(creado_en) = ? AND estado = 'completada'
  `).get(nid, yesterday);

  const comparativa = ventasAyer.total > 0
    ? Math.round(((ventasHoy.total - ventasAyer.total) / ventasAyer.total) * 100)
    : ventasHoy.total > 0 ? 100 : 0;

  const stockTotal = db.prepare(`
    SELECT COUNT(*) as total, COALESCE(SUM(s.cantidad * p.precio_costo), 0) as valor
    FROM stock s JOIN productos p ON s.producto_id = p.id WHERE p.negocio_id = ? AND p.activo = 1
  `).get(nid);

  const stockBajo = db.prepare(`
    SELECT COUNT(*) as count FROM stock s JOIN productos p ON s.producto_id = p.id
    WHERE p.negocio_id = ? AND s.cantidad <= s.stock_minimo AND s.cantidad > 0
  `).get(nid);

  const stockSinStock = db.prepare(`
    SELECT COUNT(*) as count FROM stock s JOIN productos p ON s.producto_id = p.id
    WHERE p.negocio_id = ? AND s.cantidad = 0
  `).get(nid);

  const ventasSemana = db.prepare(`
    SELECT DATE(creado_en) as dia, COALESCE(SUM(total), 0) as total, COUNT(*) as transacciones
    FROM ventas WHERE negocio_id = ? AND creado_en >= DATE('now', '-6 days') AND estado = 'completada'
    GROUP BY DATE(creado_en) ORDER BY dia
  `).all(nid);

  const topProductos = db.prepare(`
    SELECT p.nombre, SUM(vi.cantidad) as cantidad_vendida, SUM(vi.subtotal) as total_vendido
    FROM venta_items vi
    JOIN productos p ON vi.producto_id = p.id
    JOIN ventas v ON vi.venta_id = v.id
    WHERE v.negocio_id = ? AND DATE(v.creado_en) >= DATE('now', '-30 days') AND v.estado = 'completada'
    GROUP BY p.id ORDER BY total_vendido DESC LIMIT 5
  `).all(nid);

  const ultimasVentas = db.prepare(`
    SELECT v.id, v.numero, v.total, v.metodo_pago, v.creado_en,
           COALESCE(c.nombre, 'Sin cliente') as cliente
    FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.negocio_id = ? AND v.estado = 'completada'
    ORDER BY v.creado_en DESC LIMIT 5
  `).all(nid);

  res.json({
    negocio: { nombre: negocio?.nombre || 'Mi Negocio', moneda: negocio?.moneda || '$' },
    ventas_hoy: { total: ventasHoy.total, transacciones: ventasHoy.transacciones, comparativa_ayer: comparativa },
    stock: { total: stockTotal.total, valor: stockTotal.valor, bajo: stockBajo.count, sin_stock: stockSinStock.count },
    ventas_semana: ventasSemana,
    top_productos: topProductos,
    meta_diaria: negocio?.meta_diaria || 0,
    ultimas_ventas: ultimasVentas,
  });
});

router.put('/meta', (req, res) => {
  const db = getDb();
  const { meta } = req.body;
  db.prepare(`UPDATE negocios SET meta_diaria = ? WHERE id = ?`).run(Number(meta) || 0, req.user.negocio_id);
  res.json({ ok: true });
});

router.put('/config', (req, res) => {
  const db = getDb();
  const { nombre_negocio, moneda } = req.body;
  const updates = [], params = [];
  if (nombre_negocio) { updates.push('nombre = ?'); params.push(nombre_negocio); }
  if (moneda) { updates.push('moneda = ?'); params.push(moneda); }
  if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
  params.push(req.user.negocio_id);
  db.prepare(`UPDATE negocios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

module.exports = router;
