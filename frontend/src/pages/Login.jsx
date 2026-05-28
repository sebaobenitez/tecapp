import { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShoppingCart, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [codigoNegocio, setCodigoNegocio] = useState(localStorage.getItem('pos_codigo_negocio') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modoSuperAdmin, setModoSuperAdmin] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!modoSuperAdmin && !codigoNegocio) { setError('Ingresá el código de tu negocio'); return; }
    if (!username || !password) { setError('Completá usuario y contraseña'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username, password, modoSuperAdmin ? '' : codigoNegocio);
    } catch (err) {
      setError(err.error || 'Error al iniciar sesión');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <ShoppingCart size={28} color="#818cf8" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>TecApp</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {modoSuperAdmin ? 'Acceso Super Admin' : 'Iniciá sesión para continuar'}
          </p>
        </div>

        <div className="card" style={{ borderRadius: 16, padding: '2rem' }}>
          <form onSubmit={submit}>
            {!modoSuperAdmin && (
              <div className="form-group">
                <label>Código del negocio</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: '2.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    placeholder="ej: NEGOCIO01"
                    value={codigoNegocio}
                    onChange={e => setCodigoNegocio(e.target.value.toUpperCase())}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Usuario</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder={modoSuperAdmin ? 'superadmin' : 'admin'}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus={modoSuperAdmin}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem',
                }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '0.6rem 0.9rem', color: '#f87171',
                fontSize: '0.85rem', marginBottom: '1rem',
              }}>{error}</div>
            )}

            <button type="submit" className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', fontSize: '0.95rem', marginTop: '0.25rem' }}
              disabled={loading}>
              <Lock size={16} />
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={() => { setModoSuperAdmin(!modoSuperAdmin); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
            {modoSuperAdmin ? '← Volver al login normal' : 'Acceso administrador de plataforma'}
          </button>
        </div>
      </div>
    </div>
  );
}
