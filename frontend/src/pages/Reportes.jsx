import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import { reportes as repApi } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '0.65rem 0.9rem', fontSize: '0.8rem' }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.dataKey} style={{ color: p.color }}>$ {fmt(p.value)}</div>)}
    </div>
  );
};

export default function ReportesPage() {
  const [datosVentas, setDatosVentas] = useState(null);
  const [datosStock, setDatosStock] = useState(null);
  const [desde, setDesde] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [agrupar, setAgrupar] = useState('dia');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [v, s] = await Promise.all([repApi.ventas({ desde, hasta, agrupar }), repApi.stock()]);
    setDatosVentas(v);
    setDatosStock(s);
    setLoading(false);
  }, [desde, hasta, agrupar]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reportes</div>
          <div className="page-subtitle">Análisis de ventas e inventario</div>
        </div>
        <button className="btn-ghost" onClick={cargar}><RefreshCw size={15} /> Actualizar</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>hasta</span>
        <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
        {['dia', 'semana', 'mes'].map(a => (
          <button key={a} onClick={() => setAgrupar(a)} className={agrupar === a ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', textTransform: 'capitalize' }}>{a}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando reportes...</div> : (
        <>
          {/* Resumen */}
          {datosVentas?.resumen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total ventas', val: `$${fmt(datosVentas.resumen.total_ventas)}`, color: '#10b981' },
                { label: 'Transacciones', val: datosVentas.resumen.transacciones, color: '#6366f1' },
                { label: 'Ticket promedio', val: `$${fmt(datosVentas.resumen.ticket_promedio)}`, color: '#06b6d4' },
                { label: 'Venta máxima', val: `$${fmt(datosVentas.resumen.venta_maxima)}`, color: '#f59e0b' },
              ].map(({ label, val, color }) => (
                <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
                  <span className="stat-label">{label}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Ventas por período */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Ventas por {agrupar}</div>
            {datosVentas?.por_periodo?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosVentas.por_periodo}>
                  <XAxis dataKey="periodo" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state" style={{ padding: '2rem' }}><p>Sin datos en el período</p></div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Método de pago */}
            <div className="card">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Por método de pago</div>
              {datosVentas?.por_metodo_pago?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={datosVentas.por_metodo_pago} dataKey="total" nameKey="metodo_pago" cx="50%" cy="50%" outerRadius={75} label={({ metodo_pago, percent }) => `${metodo_pago} (${Math.round(percent * 100)}%)`} labelLine={false}>
                      {datosVentas.por_metodo_pago.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `$${fmt(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ padding: '1.5rem' }}><p>Sin datos</p></div>}
            </div>

            {/* Top productos */}
            <div className="card">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Top productos</div>
              {datosVentas?.top_productos?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {datosVentas.top_productos.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.unidades} uds · Ganancia: ${fmt(p.ganancia)}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.85rem' }}>${fmt(p.total)}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state" style={{ padding: '1.5rem' }}><p>Sin datos</p></div>}
            </div>
          </div>

          {/* Stock por categoría */}
          {datosStock?.por_categoria && (
            <div className="card">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: '#94a3b8' }}>Stock por categoría</div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Categoría</th><th>Productos</th><th>Unidades</th><th>Valor a costo</th><th>Valor a venta</th></tr></thead>
                  <tbody>
                    {datosStock.por_categoria.map((c, i) => (
                      <tr key={i}>
                        <td><span className="chip" style={{ background: `${c.color || COLORS[i % COLORS.length]}22`, color: c.color || COLORS[i % COLORS.length] }}>{c.categoria}</span></td>
                        <td>{c.productos}</td>
                        <td style={{ fontWeight: 600 }}>{c.unidades}</td>
                        <td style={{ color: '#94a3b8' }}>${fmt(c.valor_costo)}</td>
                        <td style={{ color: '#34d399', fontWeight: 600 }}>${fmt(c.valor_venta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
