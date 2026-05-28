import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, Package, AlertTriangle, XCircle, DollarSign, Target, RefreshCw } from 'lucide-react';
import { dashboard } from '../services/api';
import { useSocketEvent } from '../context/SocketContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function fmt(n, moneda = '$') {
  return `${moneda} ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label, moneda }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '0.65rem 0.9rem', fontSize: '0.8rem' }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>{fmt(p.value, moneda)}</div>
      ))}
    </div>
  );
};

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMeta, setEditMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await dashboard.get();
      setData(d);
      setMetaInput(String(d.meta_diaria || 0));
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useSocketEvent('venta:nueva', load);
  useSocketEvent('stock:cambio', load);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando...</div>;
  if (!data) return <div className="empty-state"><p>Error al cargar el dashboard</p></div>;

  const { negocio, ventas_hoy, stock, ventas_semana, top_productos, meta_diaria, ultimas_ventas } = data;
  const moneda = negocio.moneda;
  const metaPct = meta_diaria > 0 ? Math.min(100, Math.round((ventas_hoy.total / meta_diaria) * 100)) : 0;

  const saveMeta = async () => {
    await dashboard.setMeta(parseFloat(metaInput) || 0);
    setEditMeta(false);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{negocio.nombre}</div>
          <div className="page-subtitle">Panel principal · {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Actualizar</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Ventas Hoy</span>
            <DollarSign size={18} color="#10b981" />
          </div>
          <div className="stat-value" style={{ color: '#34d399' }}>{fmt(ventas_hoy.total, moneda)}</div>
          <div className="stat-sub">
            {ventas_hoy.transacciones} transacciones &nbsp;
            <span style={{ color: ventas_hoy.comparativa_ayer >= 0 ? '#34d399' : '#f87171' }}>
              {ventas_hoy.comparativa_ayer >= 0 ? <TrendingUp size={12} style={{ display: 'inline' }} /> : <TrendingDown size={12} style={{ display: 'inline' }} />}
              &nbsp;{ventas_hoy.comparativa_ayer}% vs ayer
            </span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="stat-label">Stock Total</span>
            <Package size={18} color="#6366f1" />
          </div>
          <div className="stat-value">{stock.total}</div>
          <div className="stat-sub">Valor: {fmt(stock.valor, moneda)}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="stat-label">Stock Bajo</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>{stock.bajo}</div>
          <div className="stat-sub" style={{ color: '#f87171' }}>
            {stock.sin_stock > 0 && <><XCircle size={12} style={{ display: 'inline' }} /> {stock.sin_stock} sin stock</>}
            {stock.sin_stock === 0 && 'Sin quiebres de stock'}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #06b6d4', cursor: 'pointer' }} onClick={() => setEditMeta(true)}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="stat-label">Meta del Día</span>
            <Target size={18} color="#06b6d4" />
          </div>
          {meta_diaria > 0 ? (
            <>
              <div className="stat-value" style={{ color: metaPct >= 100 ? '#34d399' : '#f1f5f9' }}>{metaPct}%</div>
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, background: '#334155', borderRadius: 2 }}>
                  <div style={{ height: 4, background: metaPct >= 100 ? '#10b981' : '#6366f1', borderRadius: 2, width: `${metaPct}%`, transition: 'width 0.5s' }} />
                </div>
                <div className="stat-sub" style={{ marginTop: 4 }}>{fmt(ventas_hoy.total, moneda)} / {fmt(meta_diaria, moneda)}</div>
              </div>
            </>
          ) : (
            <div className="stat-value" style={{ fontSize: '0.9rem', color: '#64748b' }}>Clic para fijar meta</div>
          )}
        </div>
      </div>

      {/* Edit meta modal */}
      {editMeta && (
        <div className="modal-overlay" onClick={() => setEditMeta(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Meta diaria de ventas</h3>
            <div className="form-group">
              <label>Monto objetivo ({moneda})</label>
              <input className="input" type="number" value={metaInput} onChange={e => setMetaInput(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setEditMeta(false)}>Cancelar</button>
              <button className="btn-primary" onClick={saveMeta}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Ventas últimos 7 días</div>
          {ventas_semana.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ventas_semana} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip moneda={moneda} />} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: '2rem' }}><p>Sin ventas en los últimos 7 días</p></div>}
        </div>

        <div className="card">
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Top productos (7 días)</div>
          {top_productos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {top_productos.map((p, i) => (
                <div key={p.nombre} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.cantidad_vendida} uds</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399', flexShrink: 0 }}>{fmt(p.total_vendido, moneda)}</div>
                </div>
              ))}
            </div>
          ) : <div className="empty-state" style={{ padding: '2rem' }}><p>Sin ventas registradas</p></div>}
        </div>
      </div>

      {/* Quick actions + recent sales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Acciones rápidas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { id: 'venta', label: 'Nueva Venta', color: '#10b981', icon: ShoppingCart },
              { id: 'productos', label: 'Productos', color: '#6366f1', icon: Package },
              { id: 'stock', label: 'Stock', color: '#f59e0b', icon: Package },
              { id: 'clientes', label: 'Clientes', color: '#06b6d4', icon: ShoppingCart },
            ].map(({ id, label, color, icon: Icon }) => (
              <button key={id} onClick={() => onNavigate(id)} style={{
                background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 10, padding: '0.85rem 0.5rem',
                color, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.15s',
              }}>
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Últimas ventas</div>
          {ultimas_ventas.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ultimas_ventas.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{v.numero}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.cliente} · {v.metodo_pago}</div>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>{fmt(v.total, moneda)}</div>
                </div>
              ))}
            </div>
          ) : <div className="empty-state" style={{ padding: '1.5rem' }}><p>Sin ventas registradas</p></div>}
        </div>
      </div>
    </div>
  );
}
