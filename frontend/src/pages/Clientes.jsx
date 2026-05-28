import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Phone, Mail, TrendingUp } from 'lucide-react';
import { clientes as clientesApi } from '../services/api';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }

function Modal({ cliente, onClose, onSave }) {
  const [form, setForm] = useState({ nombre: cliente?.nombre || '', telefono: cliente?.telefono || '', email: cliente?.email || '', direccion: cliente?.direccion || '', notas: cliente?.notas || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.nombre) return alert('Nombre requerido');
    setSaving(true);
    try {
      if (cliente?.id) await clientesApi.update(cliente.id, form);
      else await clientesApi.create(form);
      onSave();
    } catch (e) { alert(e.error || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{cliente?.id ? 'Editar' : 'Nuevo'} Cliente</h3>
        {[
          { k: 'nombre', label: 'Nombre *', placeholder: 'Nombre completo' },
          { k: 'telefono', label: 'Teléfono', placeholder: '11-1234-5678' },
          { k: 'email', label: 'Email', placeholder: 'email@ejemplo.com' },
          { k: 'direccion', label: 'Dirección', placeholder: 'Dirección' },
          { k: 'notas', label: 'Notas', placeholder: 'Notas adicionales' },
        ].map(({ k, label, placeholder }) => (
          <div key={k} className="form-group">
            <label>{label}</label>
            <input className="input" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [lista, setLista] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const params = busqueda ? { buscar: busqueda } : {};
    const data = await clientesApi.list(params);
    setLista(data);
    setLoading(false);
  }, [busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await clientesApi.delete(id);
    cargar();
  };

  const totalCompras = lista.reduce((s, c) => s + (c.monto_total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">{lista.length} clientes · Total compras: ${fmt(totalCompras)}</div>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Nuevo cliente</button>
      </div>

      <div className="search-box" style={{ marginBottom: '1rem' }}>
        <Search size={15} />
        <input className="input" placeholder="Buscar por nombre, teléfono o email..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div> : lista.length === 0 ? (
        <div className="empty-state"><Users size={40} /><p>No hay clientes registrados</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {lista.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.nombre}</div>
                  {c.telefono && <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={11} />{c.telefono}</div>}
                  {c.email && <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{c.email}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => setModal(c)}><Edit2 size={14} /></button>
                  <button className="btn-ghost" style={{ padding: '0.3rem', color: '#ef4444' }} onClick={() => eliminar(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
                <div><span style={{ color: '#64748b' }}>Compras:</span> <span style={{ fontWeight: 600 }}>{c.total_compras || 0}</span></div>
                <div><span style={{ color: '#64748b' }}>Total:</span> <span style={{ fontWeight: 600, color: '#34d399' }}>${fmt(c.monto_total)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <Modal cliente={modal.id ? modal : null} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar(); }} />}
    </div>
  );
}
