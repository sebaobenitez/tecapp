require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('./src/middleware/auth');
const { SECRET } = require('./src/middleware/auth');

const app = express();
app.set('trust proxy', 1);
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CORS_ORIGIN = IS_PROD ? true : FRONTEND_URL;

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No autorizado'));
    socket.user = jwt.verify(token, SECRET);
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  if (socket.user?.negocio_id) {
    socket.join(`n:${socket.user.negocio_id}`);
  }
});

// ─── Seguridad ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ─── Rate limiting ───────────────────────────────────────────────────────────
const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: { error: 'Demasiadas solicitudes. Intentá en unos minutos.' },
  standardHeaders: true, legacyHeaders: false,
});

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Demasiados intentos de login. Esperá 15 minutos.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use('/api', limiterGeneral);
app.use('/api/auth/login', limiterLogin);

// ─── Rutas públicas ──────────────────────────────────────────────────────────
app.use('/api/auth', require('./src/routes/auth'));

// ─── Rutas protegidas ────────────────────────────────────────────────────────
app.use('/api/dashboard',   requireAuth, require('./src/routes/dashboard'));
app.use('/api/productos',   requireAuth, require('./src/routes/productos')(io));
app.use('/api/ventas',      requireAuth, require('./src/routes/ventas')(io));
app.use('/api/stock',       requireAuth, require('./src/routes/stock')(io));
app.use('/api/clientes',    requireAuth, require('./src/routes/clientes'));
app.use('/api/proveedores', requireAuth, require('./src/routes/proveedores'));
app.use('/api/reportes',    requireAuth, require('./src/routes/reportes'));
app.use('/api/categorias',  requireAuth, require('./src/routes/categorias'));
app.use('/api/ia',          requireAuth, require('./src/routes/ia'));
app.use('/api/balances',    require('./src/routes/balances'));
app.use('/api/usuarios',    require('./src/routes/usuarios'));
app.use('/api/negocios',    require('./src/routes/negocios'));

// ─── Frontend estático (producción) ─────────────────────────────────────────
if (IS_PROD) {
  const STATIC = path.join(__dirname, 'public');
  app.use(express.static(STATIC));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(STATIC, 'index.html')));
}

// ─── Error global ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

httpServer.listen(PORT, () => console.log(`Backend en http://localhost:${PORT}`));
