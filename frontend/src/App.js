import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/PatientDashboard';
import HelperDashboard from './pages/HelperDashboard';
import AmbulanceDashboard from './pages/AmbulanceDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--navy)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="pulse-ring" />
        <p style={{ color:'var(--teal)', fontFamily:'var(--font-mono)', marginTop:16 }}>LOADING...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={user ? <Navigate to={`/dashboard/${user.role}`} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={`/dashboard/${user.role}`} /> : <RegisterPage />} />
      <Route path="/dashboard/patient" element={
        <ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>
      } />
      <Route path="/dashboard/helper" element={
        <ProtectedRoute allowedRoles={['helper']}><HelperDashboard /></ProtectedRoute>
      } />
      <Route path="/dashboard/ambulance" element={
        <ProtectedRoute allowedRoles={['ambulance']}><AmbulanceDashboard /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { background:'var(--navy-card)', color:'var(--text)', border:'1px solid var(--border)', fontFamily:'var(--font-body)' },
            success: { iconTheme: { primary:'var(--teal)', secondary:'var(--navy)' } },
            error: { iconTheme: { primary:'var(--red)', secondary:'var(--navy)' } },
          }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
