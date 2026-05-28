import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pos_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r.data,
  e => {
    if (e.response?.status === 401) {
      localStorage.removeItem('pos_token');
      window.dispatchEvent(new Event('pos:logout'));
    }
    return Promise.reject(e.response?.data || { error: 'Error de conexión' });
  }
);

export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  cambiarPassword: (data) => api.post('/auth/cambiar-password', data),
};

export const dashboard = {
  get: () => api.get('/dashboard'),
  setMeta: (meta) => api.put('/dashboard/meta', { meta }),
  setConfig: (data) => api.put('/dashboard/config', data),
};

export const productos = {
  list: (params) => api.get('/productos', { params }),
  get: (id) => api.get(`/productos/${id}`),
  create: (data) => api.post('/productos', data),
  update: (id, data) => api.put(`/productos/${id}`, data),
  delete: (id) => api.delete(`/productos/${id}`),
};

export const ventas = {
  list: (params) => api.get('/ventas', { params }),
  get: (id) => api.get(`/ventas/${id}`),
  create: (data) => api.post('/ventas', data),
  anular: (id) => api.put(`/ventas/${id}/anular`),
};

export const stock = {
  list: (params) => api.get('/stock', { params }),
  ajuste: (data) => api.post('/stock/ajuste', data),
  setMinimo: (productoId, min) => api.put(`/stock/${productoId}/minimo`, { stock_minimo: min }),
  movimientos: (params) => api.get('/stock/movimientos', { params }),
};

export const clientes = {
  list: (params) => api.get('/clientes', { params }),
  get: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`),
};

export const proveedores = {
  list: (params) => api.get('/proveedores', { params }),
  get: (id) => api.get(`/proveedores/${id}`),
  create: (data) => api.post('/proveedores', data),
  update: (id, data) => api.put(`/proveedores/${id}`, data),
  delete: (id) => api.delete(`/proveedores/${id}`),
};

export const reportes = {
  ventas: (params) => api.get('/reportes/ventas', { params }),
  stock: () => api.get('/reportes/stock'),
};

export const categorias = {
  list: () => api.get('/categorias'),
  create: (data) => api.post('/categorias', data),
  update: (id, data) => api.put(`/categorias/${id}`, data),
  delete: (id) => api.delete(`/categorias/${id}`),
};

export const ia = {
  analizar: (pregunta) => api.post('/ia/analizar', { pregunta }),
};

export const usuarios = {
  list: () => api.get('/usuarios'),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
  audit: (params) => api.get('/usuarios/audit', { params }),
};

export const balances = {
  mensual: (anio) => api.get('/balances/mensual', { params: { anio } }),
  anual: (anios) => api.get('/balances/anual', { params: { anios } }),
};

export const negocios = {
  list: () => api.get('/negocios'),
  create: (data) => api.post('/negocios', data),
  update: (id, data) => api.put(`/negocios/${id}`, data),
  delete: (id) => api.delete(`/negocios/${id}`),
  resetAdmin: (id) => api.post(`/negocios/${id}/reset-admin`),
};
