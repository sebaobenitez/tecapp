import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Users, Shield, Clock, Key } from 'lucide-react';
import { usuarios as usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROL_INFO = {
  admin: { label: 'Admin', color: '#ef4444', desc: 'Acceso total + gestión de usuarios' },
  supervisor: { label: 'Supervisor', color: '#f59e0b', desc: 'Todo excepto gestión de usuarios' },
  cajero: { label: 'Cajero', color: '#10b981', desc: 'Ventas, productos y clientes' },
};

function Modal({ usuario, onClose, onSave, currentUserId }) {
  const isEdit = !!usuario?.id;
  const isSelf = usuario?.id === currentUserId;
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '', username: usuario?.username || '',
    password: '', rol: usuario?.rol || 'cajero',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.nombre) return setError('Nombre requerido');
    if (!form.username || form.username.length < 3) return setError('El nombre de usuario debe tener al menos 3 caracteres');
    if (!isEdit && !form.password) return setError('Contraseña requerida');
    if (form.password && form.password.length < 6) return setError('Contraseña mínima 6 caracteres');
    setSaving(true);
    try {
      const data = { nombre: form.nombre, rol: form.rol };
      if (!isEdit) { data.username = form.username; data.password = form.password; }
      else {
        if (form.username !== usuario.username) data.username = form.username;
        if (form.password) data.password = form.password;
      }
      if (isEdit) await usersApi.update(usuario.id, data);
      else await usersApi.create(data);
      onSave();
    } catch (e) { setError(e.error || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{isEdit ? 'Editar' : 'Nuevo'} Usuario</h3>

        <div className="form-group">
          <label>Nombre completo</label>
          <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del empleado" />
        </div>

        <div className="form-group">
          <label>Nombre de usuario</label>
          <input className="input" value={form.username} onChange={e => set('username', e.target.value.toLowerCase())} placeholder="ej: maria.garcia" />
        </div>

        <div className="form-group">
          <label>{isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
          <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder={isEdit ? '••••••••' : 'Mín. 6 caracteres'} />
        </div>

        {!isSelf && (
          <div className="form-group">
            <label>Rol</label>
            <select className="input" value={form.rol} onChange={e => set('rol', e.target.value)}>
              {Object.entries(ROL_INFO).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.desc}</option>)}
            </select>
            <div style={{ marginTop: 6, padding: '0.5rem 0.75rem', background: `${ROL_INFO[form.rol].color}15`, borderRadius: 8, fontSize: '0.8rem', color: ROL_INFO[form.rol].color }}>
              <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
              {ROL_INFO[form.rol].desc}
            </div>
          </div>
        )}

        {error && <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

function AuditModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  useEffect(() => { usersApi.audit({ limit: 100 }).then(setLogs).catch(() => {}); }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Registro de Actividad</h3>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table>
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(l.creado_en).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ fontWeight: 500 }}>{l.usuario_nombre || '—'}</td>
                  <td><span className={`badge ${l.accion.includes('fallido') ? 'badge-red' : l.accion.includes('login') ? 'badge-green' : 'badge-blue'}`}>{l.accion}</span></td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{l.detalle || '—'}</td>
                  <td style={{ color: '#475569', fontSize: '0.75rem' }}>{l.ip || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Sin actividad registrada</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const data = await usersApi.list();
    setLista(data);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    try { await usersApi.delete(id); cargar(); }
    catch (e) { alert(e.error || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Gestión de Usuarios</div>
          <div className="page-subtitle">{lista.filter(u => u.activo).length} usuarios activos</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => setAuditOpen(true)}><Clock size={15} /> Actividad</button>
          <button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Nuevo usuario</button>
        </div>
      </div>

      {/* Roles info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {Object.entries(ROL_INFO).map(([k, v]) => (
          <div key={k} className="card" style={{ borderLeft: `3px solid ${v.color}`, padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
              <Shield size={14} color={v.color} />
              <span style={{ fontWeight: 700, color: v.color }}>{v.label}</span>
              <span className="badge" style={{ marginLeft: 'auto', background: `${v.color}20`, color: v.color }}>
                {lista.filter(u => u.rol === k && u.activo).length}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{v.desc}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div> : (
          <table>
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th></th></tr></thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#818cf8' }}>{u.username}</td>
                  <td style={{ fontWeight: 500 }}>
                    {u.nombre}
                    {u.id === currentUser?.id && <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: '0.65rem' }}>Vos</span>}
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${ROL_INFO[u.rol]?.color}20`, color: ROL_INFO[u.rol]?.color }}>
                      {ROL_INFO[u.rol]?.label || u.rol}
                    </span>
                  </td>
                  <td><span className={`badge ${u.activo ? 'badge-green' : 'badge-gray'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                    {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => setModal(u)} title="Editar"><Edit2 size={14} /></button>
                      {u.id !== currentUser?.id && <button className="btn-ghost" style={{ padding: '0.3rem', color: '#ef4444' }} onClick={() => eliminar(u.id)} title="Desactivar"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && <Modal usuario={modal.id ? modal : null} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar(); }} currentUserId={currentUser?.id} />}
      {auditOpen && <AuditModal onClose={() => setAuditOpen(false)} />}
    </div>
  );
}
