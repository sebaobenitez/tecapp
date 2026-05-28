const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.post('/analizar', async (req, res) => {
  const db = getDb();
  const nid = req.user.negocio_id;
  const { pregunta } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Pregunta requerida' });

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'IA no configurada. Agregá CLAUDE_API_KEY en el archivo .env del backend.' });

  const hoy = new Date().toISOString().split('T')[0];
  const negocio = db.prepare(`SELECT nombre FROM negocios WHERE id = ?`).get(nid);
  const ventasHoy = db.prepare(`SELECT COALESCE(SUM(total),0) as t, COUNT(*) as c FROM ventas WHERE negocio_id = ? AND DATE(creado_en)=? AND estado='completada'`).get(nid, hoy);
  const topProd = db.prepare(`SELECT p.nombre, SUM(vi.cantidad) as q, SUM(vi.subtotal) as t FROM venta_items vi JOIN productos p ON vi.producto_id=p.id JOIN ventas v ON vi.venta_id=v.id WHERE v.negocio_id=? AND v.creado_en >= DATE('now','-7 days') AND v.estado='completada' GROUP BY p.id ORDER BY t DESC LIMIT 5`).all(nid);
  const stockBajo = db.prepare(`SELECT p.nombre, s.cantidad, s.stock_minimo FROM stock s JOIN productos p ON s.producto_id=p.id WHERE p.negocio_id=? AND s.cantidad <= s.stock_minimo AND p.activo=1 ORDER BY s.cantidad`).all(nid);
  const ventasSemana = db.prepare(`SELECT DATE(creado_en) as d, SUM(total) as t FROM ventas WHERE negocio_id=? AND creado_en >= DATE('now','-6 days') AND estado='completada' GROUP BY d ORDER BY d`).all(nid);

  const contexto = `
Negocio: ${negocio?.nombre || 'Mi Negocio'}
Hoy (${hoy}): Ventas $${ventasHoy.t.toFixed(2)} en ${ventasHoy.c} transacciones.
Ventas últimos 7 días: ${ventasSemana.map(v => `${v.d}: $${v.t.toFixed(2)}`).join(', ') || 'Sin datos'}
Top productos (7 días): ${topProd.map(p => `${p.nombre} (${p.q} uds, $${p.t.toFixed(2)})`).join(', ') || 'Sin datos'}
Productos con stock bajo: ${stockBajo.map(s => `${s.nombre} (${s.cantidad}/${s.stock_minimo})`).join(', ') || 'Ninguno'}
`.trim();

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `Sos un asistente inteligente para negocios pequeños y medianos. Analizás datos del negocio y dás respuestas concretas, útiles y en español. Sé directo y accionable. No uses markdown complejo, solo texto claro.`,
      messages: [{ role: 'user', content: `Datos actuales del negocio:\n${contexto}\n\nPregunta del dueño: ${pregunta}` }],
    });

    res.json({ respuesta: message.content[0].text, contexto_usado: contexto });
  } catch (e) {
    res.status(500).json({ error: 'Error al contactar la IA: ' + e.message });
  }
});

module.exports = router;
