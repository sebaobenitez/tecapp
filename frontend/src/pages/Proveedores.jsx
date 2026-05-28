import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, Phone, Mail, Package } from 'lucide-react';
import { proveedores as provApi } from '../services/api';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }

function Modal({ proveedor, onClose, onSave }) {
  const [form, setForm] = useState({ nombre: proveedor?.nombre || '', telefono: proveedor?.telefono || '', email: proveedor?.email || '', direccion: proveedor?.direccion || '', notas: proveedor?.notas || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.nombre) return alert('Nombre requerido');
    setSaving(true);
    try {
      if (proveedor?.id) await provApi.update(proveedor.id, form);
      else await provApi.create(form);
      onSave();
    } catch (e) { alert(e.error || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{proveedor?.id ? 'Editar' : 'Nuevo'} Proveedor</h3>
        {[
          { k: 'nombre', label: 'Nombre *', placeholder: 'Nombre del proveedor' },
          { k: 'telefono', label: 'Teléfono', placeholder: '11-1234-5678' },
          { k: 'email', label: 'Email', placeholder: 'contacto@proveedor.com' },
          { k: 'direccion', label: 'Dirección', placeholder: 'Dirección' },
          { k: 'notas', label: 'Notas', placeholder: 'Condiciones, datos de contacto, etc.' },
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

export default function ProveedoresPage() {
  const [lista, setLista] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const data = await provApi.list(busqueda ? { buscar: busqueda } : {});
    setLista(data);
    setLoading(false);
  }, [busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este proveedor?')) return;
    await provApi.delete(id);
    cargar();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Proveedores</div>
          <div className="page-subtitle">{lista.length} proveedores</div>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Nuevo proveedor</button>
      </div>

      <div className="search-box" style={{ marginBottom: '1rem' }}>
        <Search size={15} />
        <input className="input" placeholder="Buscar proveedores..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div> : lista.length === 0 ? (
        <div className="empty-state"><Truck size={40} /><p>No hay proveedores registrados</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {lista.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Truck size={14} color="#6366f1" />{p.nombre}
                  </div>
                  {p.telefono && <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={11} />{p.telefono}</div>}
                  {p.email && <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{p.email}</div>}
                  {p.direccion && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{p.direccion}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => setModal(p)}><Edit2 size={14} /></button>
                  <button className="btn-ghost" style={{ padding: '0.3rem', color: '#ef4444' }} onClick={() => eliminar(p.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              {p.notas && <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.5rem' }}>{p.notas}</div>}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={12} color="#6366f1" /><span style={{ color: '#64748b' }}>Productos:</span> <span style={{ fontWeight: 600 }}>{p.total_productos || 0}</span></div>
                <div><span style={{ color: '#64748b' }}>Compras:</span> <span style={{ fontWeight: 600, color: '#34d399' }}>${fmt(p.monto_compras)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <Modal proveedor={modal.id ? modal : null} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar(); }} />}
    </div>
  );
}
