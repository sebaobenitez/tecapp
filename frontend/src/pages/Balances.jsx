import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { balances as balancesApi } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }
function fmtK(n) {
  const v = Number(n || 0);
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${fmt(v)}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', minWidth: 180 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{p.name}</span><span style={{ fontWeight: 700 }}>${fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function ResumenCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="stat-label">{label}</span>
        <Icon size={16} color={color} />
      </div>
      <div className="stat-value" style={{ fontSize: '1.4rem', color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function BalanceMensual() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('grafico');

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setData(await balancesApi.mensual(anio)); } catch {}
    setLoading(false);
  }, [anio]);

  useEffect(() => { cargar(); }, [cargar]);

  const anioActual = new Date().getFullYear();
  const aniosOpts = Array.from({ length: 5 }, (_, i) => anioActual - i);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando balance...</div>;
  if (!data) return <div className="empty-state"><p>Error al cargar el balance</p></div>;

  const { meses, resumen } = data;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto' }} value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {aniosOpts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['grafico', 'tabla'].map(v => (
            <button key={v} onClick={() => setVista(v)} className={vista === v ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', textTransform: 'capitalize' }}>{v}</button>
          ))}
        </div>
        <button className="btn-ghost" onClick={cargar}><RefreshCw size={14} /></button>
      </div>

      {/* Resumen anual */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <ResumenCard label="Ingresos" value={fmtK(resumen.ingresos)} color="#10b981" icon={DollarSign}
          sub={resumen.vs_anio_anterior !== null ? `${resumen.vs_anio_anterior >= 0 ? '+' : ''}${resumen.vs_anio_anterior}% vs ${anio - 1}` : undefined} />
        <ResumenCard label="Costo ventas" value={fmtK(resumen.costo_ventas)} color="#ef4444" icon={BarChart3} />
        <ResumenCard label="Ganancia bruta" value={fmtK(resumen.ganancia_bruta)} color="#6366f1" icon={TrendingUp}
          sub={`Margen ${resumen.margen_pct}%`} />
        <ResumenCard label="Transacciones" value={resumen.transacciones.toLocaleString()} color="#06b6d4" icon={Calendar}
          sub={`Ticket prom: ${fmtK(resumen.ticket_promedio)}`} />
      </div>

      {vista === 'grafico' ? (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '1rem' }}>Ingresos vs Ganancia por mes</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={meses} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="mes_nombre" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis hide tickFormatter={fmtK} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costo_ventas" name="Costo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ganancia_bruta" name="Ganancia" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '1rem' }}>Margen % por mes</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={meses}>
                <XAxis dataKey="mes_nombre" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 11 }} width={40} />
                <Tooltip formatter={v => `${v}%`} />
                <Line type="monotone" dataKey="margen_pct" name="Margen %" stroke="#818cf8" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Mes</th><th>Transacciones</th><th>Ingresos</th><th>Costo ventas</th><th>Ganancia bruta</th><th>Margen</th><th>Ticket prom.</th></tr></thead>
            <tbody>
              {meses.map(m => (
                <tr key={m.mes}>
                  <td style={{ fontWeight: 600 }}>{m.mes_nombre}</td>
                  <td>{m.transacciones}</td>
                  <td style={{ color: '#34d399', fontWeight: 600 }}>${fmt(m.ingresos)}</td>
                  <td style={{ color: '#f87171' }}>${fmt(m.costo_ventas)}</td>
                  <td style={{ color: '#818cf8', fontWeight: 600 }}>${fmt(m.ganancia_bruta)}</td>
                  <td>
                    <span className={`badge ${m.margen_pct >= 30 ? 'badge-green' : m.margen_pct >= 10 ? 'badge-yellow' : m.margen_pct > 0 ? 'badge-red' : 'badge-gray'}`}>
                      {m.margen_pct}%
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>${fmt(m.ticket_promedio)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #6366f1' }}>
                <td style={{ fontWeight: 800 }}>TOTAL</td>
                <td style={{ fontWeight: 700 }}>{resumen.transacciones}</td>
                <td style={{ color: '#34d399', fontWeight: 800 }}>${fmt(resumen.ingresos)}</td>
                <td style={{ color: '#f87171', fontWeight: 700 }}>${fmt(resumen.costo_ventas)}</td>
                <td style={{ color: '#818cf8', fontWeight: 800 }}>${fmt(resumen.ganancia_bruta)}</td>
                <td><span className="badge badge-blue">{resumen.margen_pct}%</span></td>
                <td style={{ color: '#94a3b8' }}>${fmt(resumen.ticket_promedio)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BalanceAnual() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    balancesApi.anual(5).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando...</div>;
  if (!data) return null;

  const { anios, mejor_mes, metodos_historico } = data;

  return (
    <div>
      {/* Gráfico comparativo */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '1rem' }}>Comparativa anual — Ingresos vs Ganancia</div>
        {anios.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={anios}>
              <XAxis dataKey="anio" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ganancia_bruta" name="Ganancia" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty-state" style={{ padding: '2rem' }}><p>Sin datos históricos</p></div>}
      </div>

      {/* Tabla anual */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '1rem' }}>
        <table>
          <thead><tr><th>Año</th><th>Transacciones</th><th>Ingresos</th><th>Costo</th><th>Ganancia</th><th>Margen</th><th>Crecimiento</th></tr></thead>
          <tbody>
            {anios.map(a => (
              <tr key={a.anio}>
                <td style={{ fontWeight: 700, fontSize: '1rem' }}>{a.anio}</td>
                <td>{a.transacciones}</td>
                <td style={{ color: '#34d399', fontWeight: 600 }}>${fmt(a.ingresos)}</td>
                <td style={{ color: '#f87171' }}>${fmt(a.costo_ventas)}</td>
                <td style={{ color: '#818cf8', fontWeight: 600 }}>${fmt(a.ganancia_bruta)}</td>
                <td><span className={`badge ${a.margen_pct >= 30 ? 'badge-green' : a.margen_pct >= 10 ? 'badge-yellow' : 'badge-red'}`}>{a.margen_pct}%</span></td>
                <td>
                  {a.crecimiento_vs_anterior !== null ? (
                    <span style={{ color: a.crecimiento_vs_anterior >= 0 ? '#34d399' : '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {a.crecimiento_vs_anterior >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {a.crecimiento_vs_anterior >= 0 ? '+' : ''}{a.crecimiento_vs_anterior}%
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {mejor_mes && (
          <div className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>Mejor mes histórico</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{mejor_mes.periodo}</div>
            <div style={{ color: '#34d399', fontWeight: 700, marginTop: 4 }}>${fmt(mejor_mes.total)}</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{mejor_mes.transacciones} transacciones</div>
          </div>
        )}

        {metodos_historico?.length > 0 && (
          <div className="card">
            <div className="stat-label" style={{ marginBottom: 8 }}>Métodos de pago (histórico)</div>
            {metodos_historico.map((m, i) => (
              <div key={m.metodo_pago} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: i < metodos_historico.length - 1 ? '1px solid #334155' : 'none', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{m.metodo_pago}</span>
                <span style={{ fontWeight: 600 }}>${fmt(m.total)} <span style={{ color: '#64748b', fontWeight: 400 }}>({m.cantidad})</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BalancesPage() {
  const [tab, setTab] = useState('mensual');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Balances</div>
          <div className="page-subtitle">Análisis financiero mensual y anual</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['mensual', 'anual'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
      </div>

      {tab === 'mensual' ? <BalanceMensual /> : <BalanceAnual />}
    </div>
  );
}
