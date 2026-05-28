import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { productos as prodApi, categorias as catApi, proveedores as provApi } from '../services/api';

function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 }); }

function Modal({ prod, categorias, proveedores, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: prod?.nombre || '', descripcion: prod?.descripcion || '',
    codigo_barras: prod?.codigo_barras || '', precio_venta: prod?.precio_venta || '',
    precio_costo: prod?.precio_costo || '', categoria_id: prod?.categoria_id || '',
    proveedor_id: prod?.proveedor_id || '', stock_inicial: '', stock_minimo: prod?.stock_minimo || 5,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.nombre || !form.precio_venta) return alert('Nombre y precio son requeridos');
    setSaving(true);
    try {
      const data = { ...form, precio_venta: parseFloat(form.precio_venta), precio_costo: parseFloat(form.precio_costo) || 0, categoria_id: form.categoria_id || null, proveedor_id: form.proveedor_id || null, stock_minimo: parseFloat(form.stock_minimo) || 5 };
      if (prod?.id) await prodApi.update(prod.id, data);
      else await prodApi.create({ ...data, stock_inicial: parseFloat(form.stock_inicial) || 0 });
      onSave();
    } catch (e) { alert(e.error || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{prod?.id ? 'Editar' : 'Nuevo'} Producto</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Nombre *</label>
            <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del producto" />
          </div>
          <div className="form-group">
            <label>Precio venta *</label>
            <input className="input" type="number" value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Precio costo</label>
            <input className="input" type="number" value={form.precio_costo} onChange={e => set('precio_costo', e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Código de barras</label>
            <input className="input" value={form.codigo_barras} onChange={e => set('codigo_barras', e.target.value)} placeholder="EAN-13" />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select className="input" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Proveedor</label>
            <select className="input" value={form.proveedor_id} onChange={e => set('proveedor_id', e.target.value)}>
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Stock mínimo</label>
            <input className="input" type="number" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} />
          </div>
          {!prod?.id && (
            <div className="form-group">
              <label>Stock inicial</label>
              <input className="input" type="number" value={form.stock_inicial} onChange={e => set('stock_inicial', e.target.value)} placeholder="0" />
            </div>
          )}
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Descripción</label>
            <input className="input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción opcional" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const [lista, setLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [catFiltro, setCatFiltro] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const params = {};
    if (busqueda) params.buscar = busqueda;
    if (catFiltro) params.categoria_id = catFiltro;
    const [prods, cats, provs] = await Promise.all([
      prodApi.list(params),
      catApi.list(),
      import('../services/api').then(m => m.proveedores.list()),
    ]);
    setLista(prods);
    setCategorias(cats);
    setProveedores(provs);
    setLoading(false);
  }, [busqueda, catFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await prodApi.delete(id);
    cargar();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Productos</div>
          <div className="page-subtitle">{lista.length} productos activos</div>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}><Plus size={16} /> Nuevo producto</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} />
          <input className="input" placeholder="Buscar por nombre o código..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div> : lista.length === 0 ? (
          <div className="empty-state"><Package size={40} /><p>No hay productos</p></div>
        ) : (
          <table>
            <thead><tr><th>Producto</th><th>Código</th><th>Categoría</th><th>Precio venta</th><th>Precio costo</th><th>Margen</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {lista.map(p => {
                const margen = p.precio_costo > 0 ? Math.round(((p.precio_venta - p.precio_costo) / p.precio_costo) * 100) : null;
                const stockOk = (p.stock_actual ?? 0) > (p.stock_minimo ?? 0);
                return (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 500 }}>{p.nombre}</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.descripcion || ''}</div></td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.codigo_barras || '—'}</td>
                    <td>{p.categoria_nombre ? <span className="chip" style={{ background: `${p.categoria_color}22`, color: p.categoria_color }}>{p.categoria_nombre}</span> : <span style={{ color: '#475569' }}>—</span>}</td>
                    <td style={{ fontWeight: 600 }}>${fmt(p.precio_venta)}</td>
                    <td style={{ color: '#94a3b8' }}>${fmt(p.precio_costo)}</td>
                    <td>{margen !== null ? <span className={`badge ${margen >= 30 ? 'badge-green' : margen >= 10 ? 'badge-yellow' : 'badge-red'}`}>{margen}%</span> : '—'}</td>
                    <td><span className={`badge ${stockOk ? 'badge-green' : 'badge-red'}`}>{p.stock_actual ?? 0}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => setModal(p)}><Edit2 size={14} /></button>
                        <button className="btn-ghost" style={{ padding: '0.3rem', color: '#ef4444' }} onClick={() => eliminar(p.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && <Modal prod={modal.id ? modal : null} categorias={categorias} proveedores={proveedores} onClose={() => setModal(null)} onSave={() => { setModal(null); cargar(); }} />}
    </div>
  );
}
