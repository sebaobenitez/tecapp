const express = require('express');
const { getDb } = require('../db/database');

module.exports = (io) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { buscar, categoria_id, activo = 1 } = req.query;
    let sql = `
      SELECT p.*, c.nombre as categoria_nombre, c.color as categoria_color,
             pr.nombre as proveedor_nombre,
             s.cantidad as stock_actual, s.stock_minimo
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN stock s ON s.producto_id = p.id
      WHERE p.negocio_id = ? AND p.activo = ?
    `;
    const params = [nid, Number(activo)];
    if (buscar) { sql += ` AND (p.nombre LIKE ? OR p.codigo_barras LIKE ?)`; params.push(`%${buscar}%`, `%${buscar}%`); }
    if (categoria_id) { sql += ` AND p.categoria_id = ?`; params.push(categoria_id); }
    sql += ` ORDER BY p.nombre`;
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/:id', (req, res) => {
    const db = getDb();
    const p = db.prepare(`
      SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre,
             s.cantidad as stock_actual, s.stock_minimo
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN stock s ON s.producto_id = p.id
      WHERE p.id = ? AND p.negocio_id = ?
    `).get(req.params.id, req.user.negocio_id);
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(p);
  });

  router.post('/', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { nombre, descripcion, codigo_barras, precio_venta, precio_costo, categoria_id, proveedor_id, stock_inicial = 0, stock_minimo = 5 } = req.body;
    if (!nombre || precio_venta == null) return res.status(400).json({ error: 'Nombre y precio son requeridos' });

    if (codigo_barras) {
      const existe = db.prepare(`SELECT id FROM productos WHERE codigo_barras = ? AND negocio_id = ? AND activo = 1`).get(codigo_barras, nid);
      if (existe) return res.status(409).json({ error: 'Ya existe un producto con ese código de barras' });
    }

    const tx = db.transaction(() => {
      const prod = db.prepare(`
        INSERT INTO productos (negocio_id, nombre, descripcion, codigo_barras, precio_venta, precio_costo, categoria_id, proveedor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(nid, nombre, descripcion || null, codigo_barras || null, precio_venta, precio_costo || 0, categoria_id || null, proveedor_id || null);

      db.prepare(`INSERT INTO stock (producto_id, cantidad, stock_minimo) VALUES (?, ?, ?)`).run(prod.lastInsertRowid, stock_inicial, stock_minimo);

      if (stock_inicial > 0) {
        db.prepare(`INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_tipo, notas) VALUES (?, 'entrada', ?, 'inicial', 'Stock inicial')`).run(prod.lastInsertRowid, stock_inicial);
      }
      return prod.lastInsertRowid;
    });

    const id = tx();
    io.to(`n:${nid}`).emit('producto:cambio');
    res.status(201).json({ id, message: 'Producto creado' });
  });

  router.put('/:id', (req, res) => {
    const db = getDb();
    const nid = req.user.negocio_id;
    const { nombre, descripcion, codigo_barras, precio_venta, precio_costo, categoria_id, proveedor_id, activo } = req.body;

    if (codigo_barras) {
      const existe = db.prepare(`SELECT id FROM productos WHERE codigo_barras = ? AND negocio_id = ? AND id != ? AND activo = 1`).get(codigo_barras, nid, req.params.id);
      if (existe) return res.status(409).json({ error: 'Ya existe un producto con ese código de barras' });
    }

    const updates = [];
    const params = [];
    if (nombre !== undefined) { updates.push('nombre = ?'); params.push(nombre); }
    if (descripcion !== undefined) { updates.push('descripcion = ?'); params.push(descripcion); }
    if (codigo_barras !== undefined) { updates.push('codigo_barras = ?'); params.push(codigo_barras); }
    if (precio_venta !== undefined) { updates.push('precio_venta = ?'); params.push(precio_venta); }
    if (precio_costo !== undefined) { updates.push('precio_costo = ?'); params.push(precio_costo); }
    if (categoria_id !== undefined) { updates.push('categoria_id = ?'); params.push(categoria_id); }
    if (proveedor_id !== undefined) { updates.push('proveedor_id = ?'); params.push(proveedor_id); }
    if (activo !== undefined) { updates.push('activo = ?'); params.push(activo); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    params.push(req.params.id, nid);
    db.prepare(`UPDATE productos SET ${updates.join(', ')} WHERE id = ? AND negocio_id = ?`).run(...params);
    io.to(`n:${nid}`).emit('producto:cambio');
    res.json({ ok: true });
  });

  router.delete('/:id', (req, res) => {
    const db = getDb();
    db.prepare(`UPDATE productos SET activo = 0 WHERE id = ? AND negocio_id = ?`).run(req.params.id, req.user.negocio_id);
    io.to(`n:${req.user.negocio_id}`).emit('producto:cambio');
    res.json({ ok: true });
  });

  return router;
};
