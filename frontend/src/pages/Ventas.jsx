import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, XCircle, Receipt } from 'lucide-react';
import { ventas as ventasApi } from '../services/api';
import { useSocketEvent } from '../context/SocketContext';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }

function DetalleModal({ ventaId, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { ventasApi.get(ventaId).then(setData); }, [ventaId]);

  if (!data) return <div className="modal-overlay"><div className="modal" style={{ maxWidth: 480 }}><p style={{ textAlign: 'center', color: '#64748b' }}>Cargando...</p></div></div>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Venta {data.numero}</h3>
          <span className={`badge ${data.estado === 'completada' ? 'badge-green' : 'badge-red'}`}>{data.estado}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem', color: '#94a3b8' }}>
          <div>Cliente: <span style={{ color: '#f1f5f9' }}>{data.cliente_nombre}</span></div>
          <div>Pago: <span style={{ color: '#f1f5f9' }}>{data.metodo_pago}</span></div>
          <div>Fecha: <span style={{ color: '#f1f5f9' }}>{new Date(data.creado_en).toLocaleString('es-AR')}</span></div>
          {data.descuento > 0 && <div>Descuento: <span style={{ color: '#f87171' }}>-${fmt(data.descuento)}</span></div>}
        </div>
        <table>
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
          <tbody>
            {data.items.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight: 500 }}>{i.producto_nombre}</td>
                <td>{i.cantidad}</td>
                <td>${fmt(i.precio_unitario)}</td>
                <td style={{ fontWeight: 600 }}>${fmt(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: '1px solid #334155', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
          TOTAL: ${fmt(data.total)}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function VentasPage() {
  const [data, setData] = useState({ ventas: [], total: 0 });
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const d = await ventasApi.list({ desde, hasta });
    setData(d);
    setLoading(false);
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);
  useSocketEvent('venta:nueva', cargar);
  useSocketEvent('venta:anulada', cargar);

  const metodoPagoColor = { efectivo: 'badge-green', tarjeta_debito: 'badge-blue', tarjeta_credito: 'badge-blue', transferencia: 'badge-cyan', mercadopago: 'badge-blue' };

  const filtradas = data.ventas.filter(v => !busqueda || v.numero.includes(busqueda) || v.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()));
  const totalFiltrado = filtradas.filter(v => v.estado === 'completada').reduce((s, v) => s + v.total, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Historial de Ventas</div>
          <div className="page-subtitle">{data.total} ventas · Total: ${fmt(totalFiltrado)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} />
          <input className="input" placeholder="Buscar por nro. o cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>hasta</span>
        <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div> :
          filtradas.length === 0 ? <div className="empty-state"><Receipt size={40} /><p>Sin ventas en el período</p></div> : (
            <table>
              <thead><tr><th>N°</th><th>Cliente</th><th>Fecha</th><th>Items</th><th>Método</th><th>Estado</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {filtradas.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600, color: '#818cf8' }}>{v.numero}</td>
                    <td>{v.cliente_nombre}</td>
                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{new Date(v.creado_en).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ color: '#94a3b8' }}>{v.items_count}</td>
                    <td><span className={`badge ${metodoPagoColor[v.metodo_pago] || 'badge-gray'}`}>{v.metodo_pago}</span></td>
                    <td><span className={`badge ${v.estado === 'completada' ? 'badge-green' : 'badge-red'}`}>{v.estado}</span></td>
                    <td style={{ fontWeight: 700, color: v.estado === 'completada' ? '#34d399' : '#f87171' }}>${fmt(v.total)}</td>
                    <td><button className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => setDetalle(v.id)}><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {detalle && <DetalleModal ventaId={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
