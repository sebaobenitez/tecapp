import { useState, useEffect, useCallback } from 'react';
import { Plus, Building2, Users, TrendingUp, RotateCcw, Power, ShoppingCart, LogOut } from 'lucide-react';
import { negocios as negociosApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 }); }
function fmtMoney(n) { return `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`; }

function NuevoNegocioModal({ onClose, onSave }) {
  const [form, setForm] = useState({ codigo: '', nombre: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const submit = async () => {
    if (!form.codigo || !form.nombre) { setError('Completá todos los campos'); return; }
    setSaving(true);
    setError('');
    try {
      const r = await negociosApi.create(form);
      setResultado(r);
    } catch (e) { setError(e.error || 'Error'); }
    setSaving(false);
  };

  if (resultado) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: '#34d399' }}>Negocio creado</h3>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <div style={{ marginBottom: 6 }}>Código: <strong style={{ color: '#818cf8' }}>{resultado.codigo}</strong></div>
          <div style={{ marginBottom: 6 }}>Usuario inicial: <strong>admin</strong></div>
          <div>Contraseña inicial: <strong>admin123</strong></div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1rem' }}>Compartí este código y credenciales con el cliente para que pueda acceder al sistema.</p>
        <button className="btn-primary" onClick={() => { onSave(); onClose(); }}>Aceptar</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Nuevo Negocio</h3>

        <div className="form-group">
          <label>Código único</label>
          <input className="input" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase().replace(/\s/g, '') }))}
            placeholder="ej: PIZZERIA01" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Sin espacios. El cliente lo usará para iniciar sesión.</div>
        </div>

        <div className="form-group">
          <label>Nombre del negocio</label>
          <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Pizzería San Telmo" />
        </div>

        {error && <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Creando...' : 'Crear negocio'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { logout } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(async () => {
    try { setLista(await negociosApi.list()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleActivo = async (negocio) => {
    if (!confirm(`¿${negocio.activo ? 'Desactivar' : 'Activar'} el negocio "${negocio.nombre}"?`)) return;
    await negociosApi.update(negocio.id, { activo: negocio.activo ? 0 : 1 });
    cargar();
  };

  const resetAdmin = async (negocio) => {
    if (!confirm(`¿Resetear la contraseña del admin de "${negocio.nombre}" a admin123?`)) return;
    await negociosApi.resetAdmin(negocio.id);
    alert('Contraseña reseteada a admin123');
  };

  const activos = lista.filter(n => n.activo);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={20} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9' }}>Panel Super Admin</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{activos.length} negocios activos</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Nuevo negocio</button>
            <button className="btn-ghost" onClick={logout} style={{ color: '#64748b' }}><LogOut size={16} /></button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Negocios activos', value: activos.length, color: '#10b981' },
            { label: 'Total negocios', value: lista.length, color: '#6366f1' },
            { label: 'Total ventas', value: fmt(lista.reduce((s, n) => s + n.total_ventas, 0)), color: '#06b6d4' },
            { label: 'Facturación total', value: fmtMoney(lista.reduce((s, n) => s + n.monto_ventas, 0)), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color, fontSize: '1.3rem' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando...</div>
          ) : lista.length === 0 ? (
            <div className="empty-state"><Building2 size={40} /><p>No hay negocios creados aún</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Negocio</th><th>Código</th><th>Usuarios</th><th>Ventas</th><th>Facturación</th><th>Última venta</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {lista.map(n => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 600 }}>{n.nombre}</td>
                    <td style={{ fontFamily: 'monospace', color: '#818cf8', fontSize: '0.85rem' }}>{n.codigo}</td>
                    <td style={{ color: '#94a3b8' }}><Users size={13} style={{ display: 'inline', marginRight: 4 }} />{n.usuarios_activos}</td>
                    <td style={{ color: '#94a3b8' }}>{fmt(n.total_ventas)}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>{fmtMoney(n.monto_ventas)}</td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {n.ultima_venta ? new Date(n.ultima_venta).toLocaleDateString('es-AR') : '—'}
                    </td>
                    <td>
                      <span className={`badge ${n.activo ? 'badge-green' : 'badge-gray'}`}>
                        {n.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => resetAdmin(n)} title="Resetear admin"><RotateCcw size={13} /></button>
                        <button className="btn-ghost" style={{ padding: '0.3rem', color: n.activo ? '#f87171' : '#34d399' }} onClick={() => toggleActivo(n)} title={n.activo ? 'Desactivar' : 'Activar'}><Power size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {modal && <NuevoNegocioModal onClose={() => setModal(false)} onSave={cargar} />}
    </div>
  );
}
