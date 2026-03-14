import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoicesList from './pages/InvoicesList';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Upgrade from './pages/Upgrade';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ className: 'glass text-white border-white/10' }} />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoices" element={<InvoicesList />} />
          <Route path="/invoices/new" element={<CreateInvoice />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
