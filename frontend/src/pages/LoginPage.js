import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(`/dashboard/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{`
        .auth-input { width:100%; padding:14px 16px; background:var(--navy-light); border:1px solid var(--border); border-radius:10px; color:var(--text); font-size:15px; font-family:var(--font-body); transition:border-color 0.2s; }
        .auth-input:focus { border-color:var(--teal); }
        .auth-input::placeholder { color:var(--text-muted); }
        .submit-btn { transition:all 0.2s; }
        .submit-btn:hover:not(:disabled) { transform:translateY(-2px); filter:brightness(1.1); }
        .submit-btn:disabled { opacity:0.6; cursor:not-allowed; }
      `}</style>

      {/* Background */}
      <div style={{ position:'fixed', inset:0, zIndex:0 }}>
        <div style={{ position:'absolute', top:'30%', left:'20%', width:400, height:400, borderRadius:'50%', background:'rgba(0,229,204,0.06)', filter:'blur(80px)' }} />
        <div style={{ position:'absolute', bottom:'20%', right:'15%', width:300, height:300, borderRadius:'50%', background:'rgba(255,45,85,0.06)', filter:'blur(60px)' }} />
      </div>

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:440 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:32, marginBottom:8 }}>
            <span style={{ color:'var(--red)' }}>A</span>TTER
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:26, marginBottom:8 }}>Welcome Back</h1>
          <p style={{ color:'var(--text-muted)', fontSize:15 }}>Sign in to your emergency response dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background:'var(--navy-card)', borderRadius:20, padding:36, border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:8, letterSpacing:0.5 }}>EMAIL ADDRESS</label>
            <input className="auth-input" type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:8, letterSpacing:0.5 }}>PASSWORD</label>
            <input className="auth-input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
          </div>

          <button type="submit" className="submit-btn" disabled={loading} style={{
            padding:'15px', borderRadius:10, fontSize:16, fontWeight:700,
            background:'var(--teal)', color:'var(--navy)', marginTop:4,
          }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          <p style={{ textAlign:'center', fontSize:14, color:'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color:'var(--teal)', fontWeight:600 }}>Register here</Link>
          </p>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-muted)' }}>
          <Link to="/" style={{ color:'var(--text-muted)' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
