const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/ventas', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  const { desde, hasta, agrupar = 'dia' } = req.query;
  const d = desde || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const h = hasta || new Date().toISOString().split('T')[0];

  let groupFormat;
  if (agrupar === 'hora') groupFormat = `strftime('%H:00', v.creado_en)`;
  else if (agrupar === 'semana') groupFormat = `strftime('%Y-W%W', v.creado_en)`;
  else if (agrupar === 'mes') groupFormat = `strftime('%Y-%m', v.creado_en)`;
  else groupFormat = `DATE(v.creado_en)`;

  const porPeriodo = db.prepare(`
    SELECT ${groupFormat} as periodo,
           COALESCE(SUM(total), 0) as total,
           COUNT(*) as transacciones,
           COALESCE(AVG(total), 0) as ticket_promedio
    FROM ventas v WHERE negocio_id = ? AND DATE(v.creado_en) BETWEEN ? AND ? AND v.estado = 'completada'
    GROUP BY periodo ORDER BY periodo
  `).all(nid, d, h);

  const porMetodoPago = db.prepare(`
    SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as total
    FROM ventas WHERE negocio_id = ? AND DATE(creado_en) BETWEEN ? AND ? AND estado = 'completada'
    GROUP BY metodo_pago
  `).all(nid, d, h);

  const topProductos = db.prepare(`
    SELECT p.nombre, p.id,
           SUM(vi.cantidad) as unidades,
           SUM(vi.subtotal) as total,
           SUM(vi.subtotal - (vi.cantidad * CASE WHEN vi.precio_costo_unitario > 0 THEN vi.precio_costo_unitario ELSE p.precio_costo END)) as ganancia
    FROM venta_items vi
    JOIN productos p ON vi.producto_id = p.id
    JOIN ventas v ON vi.venta_id = v.id
    WHERE v.negocio_id = ? AND DATE(v.creado_en) BETWEEN ? AND ? AND v.estado = 'completada'
    GROUP BY p.id ORDER BY total DESC LIMIT 10
  `).all(nid, d, h);

  const topClientes = db.prepare(`
    SELECT COALESCE(c.nombre, 'Sin cliente') as nombre, c.id,
           COUNT(v.id) as compras, SUM(v.total) as total
    FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.negocio_id = ? AND DATE(v.creado_en) BETWEEN ? AND ? AND v.estado = 'completada'
    GROUP BY v.cliente_id ORDER BY total DESC LIMIT 10
  `).all(nid, d, h);

  const resumen = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total_ventas,
           COUNT(*) as transacciones,
           COALESCE(AVG(total), 0) as ticket_promedio,
           COALESCE(MAX(total), 0) as venta_maxima
    FROM ventas WHERE negocio_id = ? AND DATE(creado_en) BETWEEN ? AND ? AND estado = 'completada'
  `).get(nid, d, h);

  res.json({ por_periodo: porPeriodo, por_metodo_pago: porMetodoPago, top_productos: topProductos, top_clientes: topClientes, resumen, desde: d, hasta: h });
});

router.get('/stock', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;

  const porCategoria = db.prepare(`
    SELECT COALESCE(c.nombre, 'Sin categoría') as categoria, c.color,
           COUNT(*) as productos,
           SUM(s.cantidad) as unidades,
           SUM(s.cantidad * p.precio_costo) as valor_costo,
           SUM(s.cantidad * p.precio_venta) as valor_venta
    FROM stock s JOIN productos p ON s.producto_id = p.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.negocio_id = ? AND p.activo = 1
    GROUP BY p.categoria_id ORDER BY valor_venta DESC
  `).all(nid);

  const rotacion = db.prepare(`
    SELECT p.nombre, p.id,
           s.cantidad as stock_actual,
           COALESCE(SUM(vi.cantidad), 0) as vendido_mes,
           CASE WHEN COALESCE(SUM(vi.cantidad), 0) > 0
                THEN ROUND(s.cantidad / (SUM(vi.cantidad) / 30.0), 1)
                ELSE NULL END as dias_cobertura
    FROM productos p
    JOIN stock s ON s.producto_id = p.id
    LEFT JOIN venta_items vi ON vi.producto_id = p.id
    LEFT JOIN ventas v ON vi.venta_id = v.id AND v.negocio_id = ? AND v.estado = 'completada' AND v.creado_en >= DATE('now', '-30 days')
    WHERE p.negocio_id = ? AND p.activo = 1
    GROUP BY p.id ORDER BY dias_cobertura ASC NULLS LAST LIMIT 20
  `).all(nid, nid);

  res.json({ por_categoria: porCategoria, rotacion });
});

module.exports = router;
