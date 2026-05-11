import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Home from './pages/Home.jsx';
import InvoiceDetailPage from './pages/InvoiceDetailPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import SavingsRecommendationsPage from './pages/SavingsRecommendationsPage.jsx';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<div className="layout"><Navbar /><Home /></div>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <div className="layout"><Navbar /><Dashboard /></div>
            </PrivateRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <PrivateRoute>
              <div className="layout"><Navbar /><InvoicesPage /></div>
            </PrivateRoute>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <PrivateRoute>
              <div className="layout"><Navbar /><InvoiceDetailPage /></div>
            </PrivateRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <PrivateRoute>
              <div className="layout"><Navbar /><SuppliersPage /></div>
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <div className="layout"><Navbar /><AnalyticsPage /></div>
            </PrivateRoute>
          }
        />
        <Route
          path="/savings-recommendations"
          element={
            <PrivateRoute>
              <div className="layout"><Navbar /><SavingsRecommendationsPage /></div>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
