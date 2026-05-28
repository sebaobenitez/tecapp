const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'negocio.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS negocios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL DEFAULT 'Mi Negocio',
      moneda TEXT DEFAULT '$',
      meta_diaria REAL DEFAULT 0,
      plan TEXT DEFAULT 'basico',
      activo INTEGER DEFAULT 1,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER REFERENCES negocios(id),
      nombre TEXT NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'cajero',
      activo INTEGER DEFAULT 1,
      ultimo_acceso DATETIME,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER REFERENCES negocios(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      usuario_nombre TEXT,
      accion TEXT NOT NULL,
      entidad TEXT,
      entidad_id INTEGER,
      detalle TEXT,
      ip TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      nombre TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      notas TEXT,
      activo INTEGER DEFAULT 1,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      notas TEXT,
      activo INTEGER DEFAULT 1,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      nombre TEXT NOT NULL,
      descripcion TEXT,
      codigo_barras TEXT,
      precio_venta REAL NOT NULL DEFAULT 0,
      precio_costo REAL DEFAULT 0,
      categoria_id INTEGER REFERENCES categorias(id),
      proveedor_id INTEGER REFERENCES proveedores(id),
      activo INTEGER DEFAULT 1,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad REAL NOT NULL DEFAULT 0,
      stock_minimo REAL DEFAULT 5,
      ubicacion TEXT,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      numero TEXT NOT NULL,
      cliente_id INTEGER REFERENCES clientes(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      total REAL NOT NULL DEFAULT 0,
      descuento REAL DEFAULT 0,
      metodo_pago TEXT DEFAULT 'efectivo',
      estado TEXT DEFAULT 'completada',
      notas TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS venta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      precio_costo_unitario REAL DEFAULT 0,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER REFERENCES negocios(id),
      numero TEXT NOT NULL,
      proveedor_id INTEGER REFERENCES proveedores(id),
      total REAL NOT NULL DEFAULT 0,
      estado TEXT DEFAULT 'pendiente',
      notas TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compra_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      tipo TEXT NOT NULL,
      cantidad REAL NOT NULL,
      referencia_tipo TEXT,
      referencia_id INTEGER,
      notas TEXT,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      negocio_id INTEGER REFERENCES negocios(id),
      PRIMARY KEY (key, negocio_id)
    );
  `);

  // Migrations for existing databases
  try { db.exec(`ALTER TABLE usuarios ADD COLUMN negocio_id INTEGER REFERENCES negocios(id)`); } catch {}
  try { db.exec(`ALTER TABLE audit_log ADD COLUMN negocio_id INTEGER REFERENCES negocios(id)`); } catch {}
  try { db.exec(`ALTER TABLE categorias ADD COLUMN negocio_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE proveedores ADD COLUMN negocio_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE clientes ADD COLUMN negocio_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE productos ADD COLUMN negocio_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE ventas ADD COLUMN negocio_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE ventas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)`); } catch {}
  try { db.exec(`ALTER TABLE compras ADD COLUMN negocio_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE venta_items ADD COLUMN precio_costo_unitario REAL DEFAULT 0`); } catch {}

  // Create superadmin if no superadmin exists
  const sa = db.prepare(`SELECT id FROM usuarios WHERE rol = 'superadmin'`).get();
  if (!sa) {
    const hash = bcrypt.hashSync('superadmin123', 10);
    db.prepare(`INSERT INTO usuarios (negocio_id, nombre, username, password_hash, rol) VALUES (NULL, 'Super Admin', 'superadmin', ?, 'superadmin')`)
      .run(hash);
    console.log('Superadmin creado — usuario: superadmin, contraseña: superadmin123');
  }

  // Create a default negocio if none exist (for existing single-tenant installs)
  const negocioCount = db.prepare(`SELECT COUNT(*) as c FROM negocios`).get();
  if (negocioCount.c === 0) {
    const negocioId = db.prepare(`INSERT INTO negocios (codigo, nombre) VALUES ('NEGOCIO01', 'Mi Negocio')`).run().lastInsertRowid;

    // Migrate existing users to this negocio
    db.prepare(`UPDATE usuarios SET negocio_id = ? WHERE negocio_id IS NULL AND rol != 'superadmin'`).run(negocioId);
    // Migrate all existing data
    db.prepare(`UPDATE categorias SET negocio_id = ? WHERE negocio_id IS NULL`).run(negocioId);
    db.prepare(`UPDATE proveedores SET negocio_id = ? WHERE negocio_id IS NULL`).run(negocioId);
    db.prepare(`UPDATE clientes SET negocio_id = ? WHERE negocio_id IS NULL`).run(negocioId);
    db.prepare(`UPDATE productos SET negocio_id = ? WHERE negocio_id IS NULL`).run(negocioId);
    db.prepare(`UPDATE ventas SET negocio_id = ? WHERE negocio_id IS NULL`).run(negocioId);
    db.prepare(`UPDATE compras SET negocio_id = ? WHERE negocio_id IS NULL`).run(negocioId);
    db.prepare(`UPDATE audit_log SET negocio_id = ? WHERE negocio_id IS NULL`).run(negocioId);

    // Create default admin user if none exist for this negocio
    const adminExists = db.prepare(`SELECT id FROM usuarios WHERE negocio_id = ? AND rol = 'admin'`).get(negocioId);
    if (!adminExists) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare(`INSERT INTO usuarios (negocio_id, nombre, username, password_hash, rol) VALUES (?, 'Administrador', 'admin', ?, 'admin')`).run(negocioId, hash);
      console.log(`Negocio "${negocioId}" — admin creado: usuario=admin, contraseña=admin123, código=${negocioId === 1 ? 'NEGOCIO01' : ''}`);
    }

    // Seed demo products if empty
    const count = db.prepare(`SELECT COUNT(*) as c FROM productos WHERE negocio_id = ?`).get(negocioId);
    if (count.c === 0) seedDemo(negocioId);
  }
}

function seedDemo(negocioId) {
  const cat1 = db.prepare(`INSERT INTO categorias (negocio_id, nombre, color) VALUES (?, 'General', '#6366f1')`).run(negocioId).lastInsertRowid;
  const cat2 = db.prepare(`INSERT INTO categorias (negocio_id, nombre, color) VALUES (?, 'Bebidas', '#06b6d4')`).run(negocioId).lastInsertRowid;
  const cat3 = db.prepare(`INSERT INTO categorias (negocio_id, nombre, color) VALUES (?, 'Alimentos', '#10b981')`).run(negocioId).lastInsertRowid;

  const prov = db.prepare(`INSERT INTO proveedores (negocio_id, nombre, telefono, email) VALUES (?, 'Proveedor Demo', '11-0000-0000', 'proveedor@demo.com')`).run(negocioId).lastInsertRowid;
  db.prepare(`INSERT INTO clientes (negocio_id, nombre, telefono, email) VALUES (?, 'Cliente Demo', '11-1111-1111', 'cliente@demo.com')`).run(negocioId);

  const productos = [
    { nombre: 'Coca Cola 500ml', precio: 1200, costo: 700, cat: cat2, barras: '7790895000054' },
    { nombre: 'Agua Mineral 1L', precio: 800, costo: 400, cat: cat2, barras: '7791813420015' },
    { nombre: 'Pan de molde', precio: 1500, costo: 900, cat: cat3, barras: '7790640000010' },
    { nombre: 'Yerba 500g', precio: 3200, costo: 2000, cat: cat3, barras: '7790001000020' },
    { nombre: 'Aceite 1L', precio: 2800, costo: 1800, cat: cat3, barras: '7790001000021' },
    { nombre: 'Producto Demo A', precio: 5000, costo: 3000, cat: cat1, barras: '0000000000001' },
  ];

  const insertProd = db.prepare(`INSERT INTO productos (negocio_id, nombre, precio_venta, precio_costo, categoria_id, proveedor_id, codigo_barras) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insertStock = db.prepare(`INSERT INTO stock (producto_id, cantidad, stock_minimo) VALUES (?, ?, ?)`);

  for (const p of productos) {
    const id = insertProd.run(negocioId, p.nombre, p.precio, p.costo, p.cat, prov, p.barras).lastInsertRowid;
    insertStock.run(id, Math.floor(Math.random() * 50) + 5, 5);
  }
}

function createNegocio(codigo, nombre) {
  const db = getDb();
  const negocio = db.prepare(`INSERT INTO negocios (codigo, nombre) VALUES (?, ?)`).run(codigo.toUpperCase(), nombre);
  const negocioId = negocio.lastInsertRowid;
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO usuarios (negocio_id, nombre, username, password_hash, rol) VALUES (?, 'Administrador', 'admin', ?, 'admin')`).run(negocioId, hash);
  return negocioId;
}

function audit(usuarioId, usuarioNombre, accion, entidad, entidadId, detalle, ip, negocioId) {
  try {
    getDb().prepare(`INSERT INTO audit_log (negocio_id, usuario_id, usuario_nombre, accion, entidad, entidad_id, detalle, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(negocioId || null, usuarioId || null, usuarioNombre || null, accion, entidad || null, entidadId || null, detalle || null, ip || null);
  } catch {}
}

module.exports = { getDb, audit, createNegocio };
