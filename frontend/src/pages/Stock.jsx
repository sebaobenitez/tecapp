import { useState, useEffect, useCallback } from 'react';
import { Boxes, Plus, Minus, AlertTriangle, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { stock as stockApi } from '../services/api';
import { useSocketEvent } from '../context/SocketContext';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }

function AjusteModal({ producto, onClose, onSave }) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!cantidad || parseFloat(cantidad) <= 0) return alert('Ingresá una cantidad válida');
    setSaving(true);
    try {
      await stockApi.ajuste({ producto_id: producto.producto_id, tipo, cantidad: parseFloat(cantidad), notas });
      onSave();
    } catch (e) { alert(e.error || 'Error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ajuste de Stock</h3>
        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{producto.producto_nombre}</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['entrada', 'salida'].map(t => (
            <button key={t} onClick={() => setTipo(t)} style={{
              flex: 1, padding: '0.5rem', borderRadius: 8, border: `2px solid ${tipo === t ? (t === 'entrada' ? '#10b981' : '#ef4444') : '#334155'}`,
              background: tipo === t ? (t === 'entrada' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
              color: tipo === t ? (t === 'entrada' ? '#34d399' : '#f87171') : '#94a3b8',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
              {t === 'entrada' ? <Plus size={14} /> : <Minus size={14} />}
              {t === 'entrada' ? 'Entrada' : 'Salida'}
            </button>
          ))}
        </div>
        <div className="form-group">
          <label>Cantidad</label>
          <input className="input" type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" autoFocus />
        </div>
        <div style={{ background: '#0f172a', borderRadius: 8, padding: '0.65rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>Stock actual: </span>
          <span style={{ fontWeight: 700 }}>{producto.cantidad}</span>
          <span style={{ color: '#64748b' }}> → </span>
          <span style={{ fontWeight: 700, color: tipo === 'entrada' ? '#34d399' : '#f87171' }}>
            {tipo === 'entrada' ? (producto.cantidad + (parseFloat(cantidad) || 0)) : Math.max(0, producto.cantidad - (parseFloat(cantidad) || 0))}
          </span>
        </div>
        <div className="form-group">
          <label>Notas (opcional)</label>
          <input className="input" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Motivo del ajuste..." />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function StockPage() {
  const [data, setData] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [alerta, setAlerta] = useState('');
  const [modal, setModal] = useState(null);

  const cargar = useCallback(async () => {
    const d = await stockApi.list(alerta ? { alerta } : {});
    setData(d);
  }, [alerta]);

  useEffect(() => { cargar(); }, [cargar]);
  useSocketEvent('stock:cambio', cargar);
  useSocketEvent('producto:cambio', cargar);

  const itemsFiltrados = data?.items?.filter(i => !filtro || i.producto_nombre.toLowerCase().includes(filtro.toLowerCase())) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Inventario / Stock</div>
          <div className="page-subtitle">{data?.resumen?.total_productos || 0} productos</div>
        </div>
        <button className="btn-ghost" onClick={cargar}><RefreshCw size={15} /> Actualizar</button>
      </div>

      {/* Resumen */}
      {data?.resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Valor a costo', val: `$${fmt(data.resumen.valor_costo)}`, color: '#6366f1' },
            { label: 'Valor a venta', val: `$${fmt(data.resumen.valor_venta)}`, color: '#10b981' },
            { label: 'Stock bajo', val: data.resumen.bajo_stock, color: '#f59e0b', badge: true },
            { label: 'Sin stock', val: data.resumen.sin_stock, color: '#ef4444', badge: true },
          ].map(({ label, val, color, badge }) => (
            <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
              <span className="stat-label">{label}</span>
              {badge ? <span style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{val}</span> : <span style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{val}</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <Boxes size={15} />
          <input className="input" placeholder="Filtrar productos..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>
        {['', 'bajo', 'sin_stock'].map(a => (
          <button key={a} onClick={() => setAlerta(a)} className={alerta === a ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            {a === '' ? 'Todos' : a === 'bajo' ? 'Stock bajo' : 'Sin stock'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {!data ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div> :
          itemsFiltrados.length === 0 ? <div className="empty-state"><Boxes size={40} /><p>Sin resultados</p></div> : (
            <table>
              <thead><tr><th>Producto</th><th>Categoría</th><th>Cantidad</th><th>Mínimo</th><th>Estado</th><th>Valor</th><th>Acción</th></tr></thead>
              <tbody>
                {itemsFiltrados.map(item => (
                  <tr key={item.id}>
                    <td><div style={{ fontWeight: 500 }}>{item.producto_nombre}</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.codigo_barras || '—'}</div></td>
                    <td>{item.categoria_nombre ? <span className="chip" style={{ background: `${item.categoria_color}22`, color: item.categoria_color }}>{item.categoria_nombre}</span> : '—'}</td>
                    <td style={{ fontWeight: 700, fontSize: '1rem' }}>{item.cantidad}</td>
                    <td style={{ color: '#64748b' }}>{item.stock_minimo}</td>
                    <td>
                      {item.estado_stock === 'ok' && <span className="badge badge-green"><CheckCircle size={11} style={{ display: 'inline' }} /> OK</span>}
                      {item.estado_stock === 'bajo' && <span className="badge badge-yellow"><AlertTriangle size={11} style={{ display: 'inline' }} /> Bajo</span>}
                      {item.estado_stock === 'sin_stock' && <span className="badge badge-red"><XCircle size={11} style={{ display: 'inline' }} /> Sin stock</span>}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>${fmt(item.cantidad * item.precio_costo)}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setModal(item)}>Ajustar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modal && <AjusteModal producto={modal} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar(); }} />}
    </div>
  );
}
