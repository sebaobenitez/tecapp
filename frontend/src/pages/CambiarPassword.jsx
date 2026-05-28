import { useState } from 'react';
import { Key, CheckCircle } from 'lucide-react';
import { auth as authApi } from '../services/api';

export default function CambiarPasswordPage() {
  const [form, setForm] = useState({ password_actual: '', password_nuevo: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.password_actual || !form.password_nuevo) return setError('Completá todos los campos');
    if (form.password_nuevo.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres');
    if (form.password_nuevo !== form.confirmar) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      await authApi.cambiarPassword({ password_actual: form.password_actual, password_nuevo: form.password_nuevo });
      setOk(true);
      setForm({ password_actual: '', password_nuevo: '', confirmar: '' });
    } catch (e) { setError(e.error || 'Error al cambiar contraseña'); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Cambiar Contraseña</div>
      </div>
      <div className="card">
        {ok && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', color: '#34d399' }}>
            <CheckCircle size={18} /> Contraseña actualizada exitosamente
          </div>
        )}
        <form onSubmit={submit}>
          {[
            { k: 'password_actual', label: 'Contraseña actual' },
            { k: 'password_nuevo', label: 'Nueva contraseña (mín. 6 caracteres)' },
            { k: 'confirmar', label: 'Confirmar nueva contraseña' },
          ].map(({ k, label }) => (
            <div key={k} className="form-group">
              <label>{label}</label>
              <input className="input" type="password" value={form[k]} onChange={e => set(k, e.target.value)} placeholder="••••••••" />
            </div>
          ))}
          {error && <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            <Key size={15} /> {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
