import { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Package, BarChart3, Users, Truck, Boxes, Sparkles, Menu, X, ChevronRight, LogOut, TrendingUp, UserCog, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_NAV = [
  { id: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','supervisor','cajero'] },
  { id: 'venta',       label: 'Nueva Venta',   icon: ShoppingCart,    roles: ['admin','supervisor','cajero'] },
  { id: 'ventas',      label: 'Ventas',         icon: BarChart3,       roles: ['admin','supervisor','cajero'] },
  { id: 'productos',   label: 'Productos',      icon: Package,         roles: ['admin','supervisor','cajero'] },
  { id: 'stock',       label: 'Stock',          icon: Boxes,           roles: ['admin','supervisor'] },
  { id: 'clientes',    label: 'Clientes',       icon: Users,           roles: ['admin','supervisor','cajero'] },
  { id: 'proveedores', label: 'Proveedores',    icon: Truck,           roles: ['admin','supervisor'] },
  { id: 'reportes',    label: 'Reportes',       icon: BarChart3,       roles: ['admin','supervisor'] },
  { id: 'balances',    label: 'Balances',       icon: TrendingUp,      roles: ['admin','supervisor'] },
  { id: 'ia',          label: 'IA Asistente',   icon: Sparkles,        roles: ['admin','supervisor'] },
  { id: 'usuarios',    label: 'Usuarios',       icon: UserCog,         roles: ['admin'] },
];

const ROL_COLOR = { admin: '#ef4444', supervisor: '#f59e0b', cajero: '#10b981' };

export default function Layout({ children, page, onNavigate, negocioNombre }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = ALL_NAV.filter(n => !user || n.roles.includes(user.rol));

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className="sidebar" style={{
        width: 220, background: '#1e293b', borderRight: '1px solid #334155',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : -220,
        height: '100vh', zIndex: 50, transition: 'left 0.25s',
      }}>
        <div style={{ padding: '1.1rem 1rem', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TecApp</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginTop: 1 }}>{negocioNombre}</div>
            </div>
            <button className="btn-ghost" onClick={() => setSidebarOpen(false)} style={{ padding: '0.25rem' }}><X size={16} /></button>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? 'active' : ''}`}
              onClick={() => { onNavigate(id); setSidebarOpen(false); }}>
              <Icon size={15} />{label}
            </button>
          ))}
        </nav>

        {/* User info */}
        {user && (
          <div style={{ padding: '0.75rem', borderTop: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem', borderRadius: 8, background: '#0f172a' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${ROL_COLOR[user.rol]}25`, border: `2px solid ${ROL_COLOR[user.rol]}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={14} color={ROL_COLOR[user.rol]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nombre}</div>
                <div style={{ fontSize: '0.7rem', color: ROL_COLOR[user.rol] }}>{user.rol}</div>
              </div>
              <button className="btn-ghost" style={{ padding: '0.25rem', color: '#64748b' }} onClick={logout} title="Cerrar sesión"><LogOut size={14} /></button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          background: '#1e293b', borderBottom: '1px solid #334155',
          padding: '0.7rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button className="btn-ghost" onClick={() => setSidebarOpen(true)} style={{ padding: '0.35rem' }}><Menu size={20} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', flex: 1 }}>
            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{negocioNombre}</span>
            <ChevronRight size={14} />
            <span>{navItems.find(n => n.id === page)?.label}</span>
          </div>
          {user && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setProfileOpen(!profileOpen)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#334155',
                border: 'none', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', color: '#f1f5f9', fontSize: '0.82rem',
              }}>
                <Shield size={13} color={ROL_COLOR[user.rol]} />
                <span>{user.nombre}</span>
              </button>
              {profileOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setProfileOpen(false)} />
                  <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 200, zIndex: 50, padding: '0.5rem' }}>
                    <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #334155', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.nombre}</div>
                      <div style={{ color: ROL_COLOR[user.rol], fontSize: '0.75rem' }}>{user.username} · {user.rol}</div>
                    </div>
                    <button className="nav-link" onClick={() => { onNavigate('cambiar-password'); setProfileOpen(false); }}>
                      <Key size={14} /> Cambiar contraseña
                    </button>
                    <button className="nav-link" style={{ color: '#f87171' }} onClick={() => { setProfileOpen(false); logout(); }}>
                      <LogOut size={14} /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        <main style={{ flex: 1, padding: '1.5rem', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .sidebar { left: 0 !important; }
          .main-content { margin-left: 220px; }
        }
      `}</style>
    </div>
  );
}
