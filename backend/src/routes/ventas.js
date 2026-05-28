const express = require('express');
const { getDb } = require('../db/database');

function generarNumero(db, negocioId) {
  const last = db.prepare(`SELECT numero FROM ventas WHERE negocio_id = ? ORDER BY id DESC LIMIT 1`).get(negocioId);
  const n = last ? parseInt(last.numero.replace('V-', '')) + 1 : 1;
  return `V-${String(n).padStart(6, '0')}`;
}

module.exports = (io) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { desde, hasta, cliente_id, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT v.*, COALESCE(c.nombre, 'Sin cliente') as cliente_nombre,
             COUNT(vi.id) as items_count
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN venta_items vi ON vi.venta_id = v.id
      WHERE v.negocio_id = ?
    `;
    const params = [nid];
    if (desde) { sql += ` AND DATE(v.creado_en) >= ?`; params.push(desde); }
    if (hasta) { sql += ` AND DATE(v.creado_en) <= ?`; params.push(hasta); }
    if (cliente_id) { sql += ` AND v.cliente_id = ?`; params.push(cliente_id); }
    sql += ` GROUP BY v.id ORDER BY v.creado_en DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    let totalSql = `SELECT COUNT(*) as c FROM ventas WHERE negocio_id = ?`;
    const totalParams = [nid];
    if (desde) { totalSql += ` AND DATE(creado_en) >= ?`; totalParams.push(desde); }
    if (hasta) { totalSql += ` AND DATE(creado_en) <= ?`; totalParams.push(hasta); }
    if (cliente_id) { totalSql += ` AND cliente_id = ?`; totalParams.push(cliente_id); }

    const total = db.prepare(totalSql).get(...totalParams);
    res.json({ ventas: db.prepare(sql).all(...params), total: total.c });
  });

  router.get('/:id', (req, res) => {
    const db = getDb();
    const venta = db.prepare(`
      SELECT v.*, COALESCE(c.nombre, 'Sin cliente') as cliente_nombre
      FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ? AND v.negocio_id = ?
    `).get(req.params.id, req.user.negocio_id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const items = db.prepare(`
      SELECT vi.*, p.nombre as producto_nombre, p.codigo_barras
      FROM venta_items vi JOIN productos p ON vi.producto_id = p.id WHERE vi.venta_id = ?
    `).all(req.params.id);

    res.json({ ...venta, items });
  });

  router.post('/', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { cliente_id, items, descuento = 0, metodo_pago = 'efectivo', notas } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Se requieren items' });

    const tx = db.transaction(() => {
      let total = 0;
      const itemsConPrecio = items.map(item => {
        const producto = db.prepare(`SELECT * FROM productos WHERE id = ? AND negocio_id = ? AND activo = 1`).get(item.producto_id, nid);
        if (!producto) throw new Error(`Producto ${item.producto_id} no encontrado`);
        const stockRow = db.prepare(`SELECT cantidad FROM stock WHERE producto_id = ?`).get(item.producto_id);
        const disponible = stockRow?.cantidad ?? 0;
        if (disponible < item.cantidad) throw new Error(`Stock insuficiente para "${producto.nombre}" (disponible: ${disponible})`);
        const precio = item.precio_unitario ?? producto.precio_venta;
        const subtotal = precio * item.cantidad;
        total += subtotal;
        return { ...item, precio_unitario: precio, precio_costo_unitario: producto.precio_costo, subtotal };
      });
      total = total - (descuento || 0);

      const numero = generarNumero(db, nid);
      const venta = db.prepare(`
        INSERT INTO ventas (negocio_id, numero, cliente_id, usuario_id, total, descuento, metodo_pago, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(nid, numero, cliente_id || null, req.user.id, total, descuento, metodo_pago, notas || null);

      const ventaId = venta.lastInsertRowid;
      const insertItem = db.prepare(`INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, precio_costo_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?)`);
      const updateStock = db.prepare(`UPDATE stock SET cantidad = cantidad - ?, actualizado_en = CURRENT_TIMESTAMP WHERE producto_id = ?`);
      const insertMov = db.prepare(`INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_tipo, referencia_id) VALUES (?, 'salida', ?, 'venta', ?)`);

      for (const item of itemsConPrecio) {
        insertItem.run(ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.precio_costo_unitario, item.subtotal);
        updateStock.run(item.cantidad, item.producto_id);
        insertMov.run(item.producto_id, item.cantidad, ventaId);
      }

      return { id: ventaId, numero, total };
    });

    try {
      const result = tx.immediate();
      io.to(`n:${req.user.negocio_id}`).emit('venta:nueva', { id: result.id, numero: result.numero, total: result.total });
      io.to(`n:${req.user.negocio_id}`).emit('stock:cambio');
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/:id/anular', (req, res) => {
    const db = getDb();
    const venta = db.prepare(`SELECT * FROM ventas WHERE id = ? AND negocio_id = ?`).get(req.params.id, req.user.negocio_id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta.estado === 'anulada') return res.status(400).json({ error: 'La venta ya está anulada' });

    const tx = db.transaction(() => {
      db.prepare(`UPDATE ventas SET estado = 'anulada' WHERE id = ?`).run(req.params.id);
      const items = db.prepare(`SELECT * FROM venta_items WHERE venta_id = ?`).all(req.params.id);
      for (const item of items) {
        db.prepare(`UPDATE stock SET cantidad = cantidad + ?, actualizado_en = CURRENT_TIMESTAMP WHERE producto_id = ?`).run(item.cantidad, item.producto_id);
        db.prepare(`INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_tipo, referencia_id, notas) VALUES (?, 'entrada', ?, 'anulacion_venta', ?, 'Anulación de venta')`).run(item.producto_id, item.cantidad, req.params.id);
      }
    });
    tx();
    io.to(`n:${req.user.negocio_id}`).emit('venta:anulada', { id: Number(req.params.id) });
    io.to(`n:${req.user.negocio_id}`).emit('stock:cambio');
    res.json({ ok: true });
  });

  return router;
};
