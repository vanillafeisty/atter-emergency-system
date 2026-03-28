import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = [
  { key:'patient', icon:'🆘', label:'Patient / User', color:'var(--teal)', desc:'Request emergency help' },
  { key:'helper', icon:'🏍️', label:'Helper Vehicle', color:'var(--amber)', desc:'First-responder on two wheels' },
  { key:'ambulance', icon:'🚑', label:'Ambulance', color:'var(--red)', desc:'Intercept & hospital transit' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name:'', email:'', phone:'', password:'', confirmPassword:'',
    role: params.get('role') || 'patient', vehicleId:'', vehicleType:'',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const user = await register(form);
      toast.success(`Account created! Welcome, ${user.name}`);
      navigate(`/dashboard/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const f = (field, val) => setForm(prev => ({...prev, [field]: val}));
  const roleInfo = ROLES.find(r => r.key === form.role);

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 24px 40px' }}>
      <style>{`
        .auth-input{width:100%;padding:13px 16px;background:var(--navy-light);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:15px;font-family:var(--font-body);transition:border-color 0.2s;}
        .auth-input:focus{border-color:var(--teal);}
        .auth-input::placeholder{color:var(--text-muted);}
        .role-btn{padding:14px;border-radius:10px;border:1px solid var(--border);background:var(--navy-light);color:var(--text-muted);cursor:pointer;transition:all 0.2s;text-align:center;}
        .role-btn.active{background:var(--navy-card);color:var(--text);}
        .submit-btn{transition:all 0.2s;}
        .submit-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        .submit-btn:disabled{opacity:0.6;cursor:not-allowed;}
      `}</style>

      <div style={{ width:'100%', maxWidth:520 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:30, marginBottom:8 }}>
            <span style={{ color:'var(--red)' }}>A</span>TTER
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:24, marginBottom:6 }}>Create Account</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Join the emergency response network</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background:'var(--navy-card)', borderRadius:20, padding:36, border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:18 }}>

          {/* Role selector */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:10, letterSpacing:1 }}>SELECT YOUR ROLE</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {ROLES.map(r => (
                <div key={r.key} className={`role-btn${form.role===r.key?' active':''}`}
                  style={{ borderColor: form.role===r.key ? r.color : 'var(--border)', background: form.role===r.key ? `${r.color}12`:'var(--navy-light)' }}
                  onClick={() => f('role', r.key)}
                >
                  <div style={{ fontSize:24, marginBottom:4 }}>{r.icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color: form.role===r.key ? r.color : 'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{r.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:7 }}>FULL NAME</label>
              <input className="auth-input" placeholder="Your name" value={form.name} onChange={e=>f('name',e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:7 }}>PHONE</label>
              <input className="auth-input" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e=>f('phone',e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:7 }}>EMAIL ADDRESS</label>
            <input className="auth-input" type="email" placeholder="you@example.com" value={form.email} onChange={e=>f('email',e.target.value)} required />
          </div>

          {(form.role === 'helper' || form.role === 'ambulance') && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:7 }}>VEHICLE ID</label>
                <input className="auth-input" placeholder="OD-01-AA-0000" value={form.vehicleId} onChange={e=>f('vehicleId',e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:7 }}>VEHICLE TYPE</label>
                <select className="auth-input" value={form.vehicleType} onChange={e=>f('vehicleType',e.target.value)}
                  style={{ cursor:'pointer' }}>
                  <option value="">Select type</option>
                  {form.role==='helper' ? (
                    <><option value="motorcycle">Motorcycle</option><option value="e-trike">E-Trike</option><option value="bicycle">Bicycle</option></>
                  ) : (
                    <><option value="ALS Ambulance">ALS Ambulance</option><option value="BLS Ambulance">BLS Ambulance</option><option value="Patient Transport">Patient Transport</option></>
                  )}
                </select>
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:7 }}>PASSWORD</label>
              <input className="auth-input" type="password" placeholder="••••••••" value={form.password} onChange={e=>f('password',e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:7 }}>CONFIRM</label>
              <input className="auth-input" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={e=>f('confirmPassword',e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading} style={{
            padding:'15px', borderRadius:10, fontSize:16, fontWeight:700, marginTop:4,
            background: roleInfo?.color || 'var(--teal)', color:'var(--navy)',
          }}>
            {loading ? 'Creating account...' : `Register as ${roleInfo?.label} →`}
          </button>

          <p style={{ textAlign:'center', fontSize:14, color:'var(--text-muted)' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color:'var(--teal)', fontWeight:600 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
