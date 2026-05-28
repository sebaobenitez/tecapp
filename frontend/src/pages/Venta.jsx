import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, User } from 'lucide-react';
import { productos as prodApi, ventas as ventasApi, clientes as clientesApi } from '../services/api';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }

export default function VentaPage() {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [descuento, setDescuento] = useState(0);
  const [clienteId, setClienteId] = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(null);
  const searchRef = useRef();

  useEffect(() => {
    clientesApi.list().then(setClientes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return; }
    const t = setTimeout(() => {
      prodApi.list({ buscar: busqueda }).then(setResultados).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  const agregar = (prod) => {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.producto_id === prod.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1, subtotal: (next[idx].cantidad + 1) * next[idx].precio_unitario };
        return next;
      }
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, precio_unitario: prod.precio_venta, cantidad: 1, subtotal: prod.precio_venta, stock_actual: prod.stock_actual }];
    });
    setBusqueda('');
    setResultados([]);
    searchRef.current?.focus();
  };

  const cambiarCantidad = (idx, delta) => {
    setCarrito(prev => {
      const next = [...prev];
      const nueva = next[idx].cantidad + delta;
      if (nueva <= 0) { next.splice(idx, 1); return next; }
      next[idx] = { ...next[idx], cantidad: nueva, subtotal: nueva * next[idx].precio_unitario };
      return next;
    });
  };

  const cambiarPrecio = (idx, precio) => {
    setCarrito(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], precio_unitario: parseFloat(precio) || 0, subtotal: next[idx].cantidad * (parseFloat(precio) || 0) };
      return next;
    });
  };

  const subtotal = carrito.reduce((s, i) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - (parseFloat(descuento) || 0));

  const cobrar = async () => {
    if (!carrito.length) return;
    setLoading(true);
    try {
      const items = carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }));
      const res = await ventasApi.create({ items, descuento: parseFloat(descuento) || 0, metodo_pago: metodoPago, cliente_id: clienteId || null });
      setExito(res);
      setCarrito([]);
      setDescuento(0);
      setClienteId('');
    } catch (e) {
      alert(e.error || 'Error al registrar la venta');
    }
    setLoading(false);
  };

  if (exito) return (
    <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
      <div className="card">
        <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Venta registrada</h2>
        <div style={{ color: '#94a3b8', marginBottom: 8 }}>N° {exito.numero}</div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginBottom: '1.5rem' }}>${fmt(exito.total)}</div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={() => setExito(null)}>Nueva venta</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
      {/* Left: buscar y carrito */}
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Nueva Venta</div>
            <div className="page-subtitle">Buscá productos para agregar al carrito</div>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <div className="search-box">
            <Search size={16} />
            <input ref={searchRef} className="input" placeholder="Buscar producto por nombre o código de barras..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
          </div>
          {resultados.length > 0 && (
            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, padding: 0, maxHeight: 320, overflowY: 'auto' }}>
              {resultados.map(p => (
                <button key={p.id} onClick={() => agregar(p)} style={{
                  width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                  padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid #334155', color: '#f1f5f9', transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.codigo_barras || '—'} · Stock: {p.stock_actual ?? 0}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.95rem' }}>${fmt(p.precio_venta)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="card" style={{ padding: 0 }}>
          {carrito.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <ShoppingCart size={40} style={{ margin: '0 auto 0.75rem' }} />
              <p>El carrito está vacío</p>
              <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Buscá productos arriba para agregar</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr>
              </thead>
              <tbody>
                {carrito.map((item, idx) => (
                  <tr key={item.producto_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.nombre}</div>
                      {item.stock_actual !== null && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Stock: {item.stock_actual}</div>}
                    </td>
                    <td>
                      <input className="input" type="number" value={item.precio_unitario} onChange={e => cambiarPrecio(idx, e.target.value)} style={{ width: 90, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={() => cambiarCantidad(idx, -1)}><Minus size={14} /></button>
                        <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{item.cantidad}</span>
                        <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={() => cambiarCantidad(idx, 1)}><Plus size={14} /></button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#34d399' }}>${fmt(item.subtotal)}</td>
                    <td><button className="btn-ghost" style={{ color: '#ef4444', padding: '0.25rem' }} onClick={() => setCarrito(c => c.filter((_, i) => i !== idx))}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: resumen */}
      <div style={{ position: 'sticky', top: 80 }}>
        <div className="card">
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#94a3b8' }}>Resumen</div>

          <div className="form-group">
            <label>Cliente (opcional)</label>
            <select className="input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Sin cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Método de pago</label>
            <select className="input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta_debito">Tarjeta Débito</option>
              <option value="tarjeta_credito">Tarjeta Crédito</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercadopago">MercadoPago</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descuento ($)</label>
            <input className="input" type="number" value={descuento} onChange={e => setDescuento(e.target.value)} min="0" />
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: 4 }}>
              <span>Subtotal</span><span>${fmt(subtotal)}</span>
            </div>
            {parseFloat(descuento) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#f87171', marginBottom: 4 }}>
                <span>Descuento</span><span>-${fmt(descuento)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginTop: 8 }}>
              <span>TOTAL</span><span>${fmt(total)}</span>
            </div>
          </div>

          <button className="btn-primary" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', padding: '0.75rem', fontSize: '1rem' }}
            onClick={cobrar} disabled={!carrito.length || loading}>
            <CheckCircle size={18} />
            {loading ? 'Procesando...' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
