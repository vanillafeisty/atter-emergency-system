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
import OfflineBanner from './components/OfflineBanner';
import InstallPWA from './components/InstallPWA';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--navy)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, border:'3px solid var(--teal)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} />
        <p style={{ color:'var(--teal)', fontFamily:'var(--font-mono)', marginTop:16, fontSize:13 }}>LOADING ATTER...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <OfflineBanner />
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
      <InstallPWA />
    </>
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
