import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import DashboardPage from './pages/Dashboard';
import VentaPage from './pages/Venta';
import VentasPage from './pages/Ventas';
import ProductosPage from './pages/Productos';
import StockPage from './pages/Stock';
import ClientesPage from './pages/Clientes';
import ProveedoresPage from './pages/Proveedores';
import ReportesPage from './pages/Reportes';
import BalancesPage from './pages/Balances';
import IAPage from './pages/IA';
import UsuariosPage from './pages/Usuarios';
import CambiarPasswordPage from './pages/CambiarPassword';
import SuperAdminPage from './pages/SuperAdmin';
import { dashboard } from './services/api';

const PAGES = {
  dashboard:          DashboardPage,
  venta:              VentaPage,
  ventas:             VentasPage,
  productos:          ProductosPage,
  stock:              StockPage,
  clientes:           ClientesPage,
  proveedores:        ProveedoresPage,
  reportes:           ReportesPage,
  balances:           BalancesPage,
  ia:                 IAPage,
  usuarios:           UsuariosPage,
  'cambiar-password': CambiarPasswordPage,
};

const INICIO = { admin: 'dashboard', supervisor: 'dashboard', cajero: 'venta' };

function AppInner() {
  const { user, token, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [negocioNombre, setNegocioNombre] = useState('Mi Negocio');

  useEffect(() => {
    if (user && user.rol !== 'superadmin') {
      setPage(INICIO[user.rol] || 'dashboard');
      dashboard.get().then(d => setNegocioNombre(d.negocio?.nombre || 'Mi Negocio')).catch(() => {});
    }
  }, [user]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Cargando...</div>
    </div>
  );

  if (!user) return <Login />;

  if (user.rol === 'superadmin') return <SuperAdminPage />;

  const Page = PAGES[page] || DashboardPage;

  return (
    <SocketProvider token={token} negocio_id={user.negocio_id}>
      <Layout page={page} onNavigate={setPage} negocioNombre={negocioNombre}>
        <Page onNavigate={setPage} />
      </Layout>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
