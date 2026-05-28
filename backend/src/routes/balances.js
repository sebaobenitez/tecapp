const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/mensual', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  const anio = req.query.anio || new Date().getFullYear();
  if (!/^\d{4}$/.test(String(anio))) return res.status(400).json({ error: 'Año inválido' });
  const anioAnterior = Number(anio) - 1;

  const meses = db.prepare(`
    SELECT strftime('%m', creado_en) as mes, strftime('%Y-%m', creado_en) as periodo,
           COUNT(*) as transacciones, COALESCE(SUM(total), 0) as ingresos,
           COALESCE(SUM(descuento), 0) as descuentos, COALESCE(AVG(total), 0) as ticket_promedio,
           COALESCE(MAX(total), 0) as venta_maxima
    FROM ventas
    WHERE negocio_id = ? AND strftime('%Y', creado_en) = ? AND estado = 'completada'
    GROUP BY strftime('%Y-%m', creado_en) ORDER BY mes
  `).all(nid, String(anio));

  const cogs = db.prepare(`
    SELECT strftime('%m', v.creado_en) as mes,
           COALESCE(SUM(CASE WHEN vi.precio_costo_unitario > 0 THEN vi.cantidad * vi.precio_costo_unitario ELSE vi.cantidad * p.precio_costo END), 0) as costo_ventas
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    JOIN productos p ON vi.producto_id = p.id
    WHERE v.negocio_id = ? AND strftime('%Y', v.creado_en) = ? AND v.estado = 'completada'
    GROUP BY mes
  `).all(nid, String(anio));

  const cogsMap = Object.fromEntries(cogs.map(c => [c.mes, c.costo_ventas]));
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const todos = Array.from({ length: 12 }, (_, i) => {
    const mesStr = String(i + 1).padStart(2, '0');
    const found = meses.find(m => m.mes === mesStr) || {};
    const costo = cogsMap[mesStr] || 0;
    const ingresos = found.ingresos || 0;
    return {
      mes: i + 1, mes_nombre: mesesNombres[i], periodo: `${anio}-${mesStr}`,
      transacciones: found.transacciones || 0, ingresos, costo_ventas: costo,
      ganancia_bruta: ingresos - costo,
      margen_pct: ingresos > 0 ? Math.round(((ingresos - costo) / ingresos) * 100) : 0,
      ticket_promedio: found.ticket_promedio || 0, venta_maxima: found.venta_maxima || 0,
      descuentos: found.descuentos || 0,
    };
  });

  const resumenAnio = todos.reduce((acc, m) => ({
    ingresos: acc.ingresos + m.ingresos, costo_ventas: acc.costo_ventas + m.costo_ventas,
    ganancia_bruta: acc.ganancia_bruta + m.ganancia_bruta, transacciones: acc.transacciones + m.transacciones,
  }), { ingresos: 0, costo_ventas: 0, ganancia_bruta: 0, transacciones: 0 });

  resumenAnio.margen_pct = resumenAnio.ingresos > 0 ? Math.round((resumenAnio.ganancia_bruta / resumenAnio.ingresos) * 100) : 0;
  resumenAnio.ticket_promedio = resumenAnio.transacciones > 0 ? resumenAnio.ingresos / resumenAnio.transacciones : 0;

  const anioAnt = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as ingresos FROM ventas
    WHERE negocio_id = ? AND strftime('%Y', creado_en) = ? AND estado = 'completada'
  `).get(nid, String(anioAnterior));

  resumenAnio.vs_anio_anterior = anioAnt.ingresos > 0
    ? Math.round(((resumenAnio.ingresos - anioAnt.ingresos) / anioAnt.ingresos) * 100) : null;

  res.json({ anio, meses: todos, resumen: resumenAnio });
});

router.get('/anual', (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  const anios_count = Math.min(Number(req.query.anios) || 5, 10);

  const anios = db.prepare(`
    SELECT strftime('%Y', creado_en) as anio, COUNT(*) as transacciones,
           COALESCE(SUM(total), 0) as ingresos, COALESCE(SUM(descuento), 0) as descuentos,
           COALESCE(AVG(total), 0) as ticket_promedio
    FROM ventas WHERE negocio_id = ? AND estado = 'completada'
    GROUP BY anio ORDER BY anio DESC LIMIT ?
  `).all(nid, anios_count);

  const cogsAnuales = db.prepare(`
    SELECT strftime('%Y', v.creado_en) as anio,
           COALESCE(SUM(CASE WHEN vi.precio_costo_unitario > 0 THEN vi.cantidad * vi.precio_costo_unitario ELSE vi.cantidad * p.precio_costo END), 0) as costo_ventas
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    JOIN productos p ON vi.producto_id = p.id
    WHERE v.negocio_id = ? AND v.estado = 'completada'
    GROUP BY anio
  `).all(nid);

  const cogsMap = Object.fromEntries(cogsAnuales.map(c => [c.anio, c.costo_ventas]));

  const resultado = anios.map((a, i) => {
    const costo = cogsMap[a.anio] || 0;
    const prev = anios[i + 1];
    const crecimiento = prev?.ingresos > 0 ? Math.round(((a.ingresos - prev.ingresos) / prev.ingresos) * 100) : null;
    return { ...a, costo_ventas: costo, ganancia_bruta: a.ingresos - costo,
      margen_pct: a.ingresos > 0 ? Math.round(((a.ingresos - costo) / a.ingresos) * 100) : 0,
      crecimiento_vs_anterior: crecimiento };
  }).reverse();

  const mejorMes = db.prepare(`
    SELECT strftime('%Y-%m', creado_en) as periodo, SUM(total) as total, COUNT(*) as transacciones
    FROM ventas WHERE negocio_id = ? AND estado = 'completada'
    GROUP BY periodo ORDER BY total DESC LIMIT 1
  `).get(nid);

  const metodosHistorico = db.prepare(`
    SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as total
    FROM ventas WHERE negocio_id = ? AND estado = 'completada'
    GROUP BY metodo_pago ORDER BY total DESC
  `).all(nid);

  res.json({ anios: resultado, mejor_mes: mejorMes, metodos_historico: metodosHistorico });
});

module.exports = router;
