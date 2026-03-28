import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const STATS = [
  { value: '28%', label: 'Faster Hospital Arrival' },
  { value: '85%', label: 'Reduced Handover Wait' },
  { value: '42m', label: 'Rendezvous Accuracy' },
  { value: '0G', label: 'Cloud Dependency' },
];

const HOW_STEPS = [
  { icon: '📞', title: 'Patient Calls', desc: 'Patient triggers an emergency request. ATTER\'s AI instantly analyses terrain and traffic to dispatch the right vehicle.' },
  { icon: '🏍️', title: 'Helper Dispatched', desc: 'A nimble Tier-1 Helper Vehicle (motorcycle or e-trike) reaches the patient through roads no ambulance can navigate.' },
  { icon: '🧠', title: 'AI Computes Rendezvous', desc: 'The DRNN model running on-device predicts the exact GPS coordinates where both vehicles should meet — with zero wait time.' },
  { icon: '🚑', title: 'Ambulance Intercepts', desc: 'The Tier-2 Ambulance meets the Helper at the rendezvous point. Patient data transfers digitally in under 3 seconds.' },
  { icon: '🏥', title: 'Hospital Notified', desc: 'The ambulance transmits vital projections ahead. Surgeons prepare before the patient even arrives.' },
];

const ROLES = [
  {
    key: 'patient',
    icon: '🆘',
    title: 'Patient / User',
    desc: 'Request emergency help instantly. Track your Helper Vehicle and Ambulance in real-time on a live map.',
    color: 'var(--teal)',
    features: ['One-tap SOS request', 'Live GPS tracking', 'Digital vitals record', 'Secure Razorpay payment'],
  },
  {
    key: 'helper',
    icon: '🏍️',
    title: 'Helper Vehicle',
    desc: 'Accept nearby emergencies, navigate to patients in hard-to-reach areas, and coordinate handovers.',
    color: 'var(--amber)',
    features: ['Real-time dispatch alerts', 'Patient + ambulance tracking', 'Vitals entry panel', 'Rendezvous navigator'],
  },
  {
    key: 'ambulance',
    icon: '🚑',
    title: 'Ambulance',
    desc: 'Receive handover coordinates from the AI, track the Helper, and prepare hospitals in advance.',
    color: 'var(--red)',
    features: ['DRNN rendezvous point', 'Patient vitals stream', 'Helper vehicle tracker', 'Hospital pre-alert'],
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(null);
  const heroRef = useRef(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handler = (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
      el.style.setProperty('--rx', `${-y}deg`);
      el.style.setProperty('--ry', `${x}deg`);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      <Navbar />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)} }
        @keyframes spin-slow { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)} }
        .hero-grid { transform: perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition: transform 0.1s; }
        .role-card { transition: all 0.3s; cursor: pointer; }
        .role-card:hover { transform: translateY(-6px); }
        .step-dot:hover { transform: scale(1.1); }
        .cta-btn { transition: all 0.25s; }
        .cta-btn:hover { transform: translateY(-2px); filter: brightness(1.12); }
        .stat-card { animation: fadeUp 0.6s ease both; }
      `}</style>

      {/* ── HERO ── */}
      <section ref={heroRef} className="hero-grid" style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(0,229,204,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,204,0.04) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Glow orbs */}
        <div style={{ position:'absolute', top:'20%', left:'15%', width:400, height:400, borderRadius:'50%', background:'rgba(255,45,85,0.08)', filter:'blur(80px)', zIndex:0 }} />
        <div style={{ position:'absolute', bottom:'20%', right:'15%', width:300, height:300, borderRadius:'50%', background:'rgba(0,229,204,0.08)', filter:'blur(60px)', zIndex:0 }} />

        <div style={{ position:'relative', zIndex:1, maxWidth:860 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20, marginBottom: 28,
            background: 'rgba(255,45,85,0.12)', border: '1px solid rgba(255,45,85,0.3)',
          }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', animation:'pulse 1.5s infinite' }} />
            <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--red)', letterSpacing:2 }}>
              LIVE EMERGENCY RESPONSE SYSTEM
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(40px,7vw,88px)', lineHeight: 1.05,
            letterSpacing: '-2px', marginBottom: 28,
          }}>
            <span style={{ display:'block' }}>Every Second</span>
            <span style={{ display:'block', color:'var(--red)' }}>Is the Golden Hour</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px,2.2vw,21px)', color: 'var(--text-muted)',
            lineHeight: 1.7, maxWidth: 620, margin: '0 auto 44px',
          }}>
            ATTER deploys AI-coordinated two-tier emergency transport — a nimble Helper Vehicle and an Intercept Ambulance — guided by deep learning to reach you faster than any conventional system.
          </p>

          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="cta-btn" onClick={() => navigate('/register')} style={{
              padding: '16px 36px', borderRadius: 10, fontSize: 16, fontWeight: 700,
              background: 'var(--red)', color: '#fff',
              boxShadow: '0 0 32px rgba(255,45,85,0.4)',
            }}>Get Emergency Help →</button>
            <button className="cta-btn" onClick={() => navigate('/register')} style={{
              padding: '16px 36px', borderRadius: 10, fontSize: 16, fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: 'var(--text)',
              border: '1px solid var(--border)',
            }}>Join as Responder</button>
          </div>
        </div>

        {/* Floating vehicle icons */}
        <div style={{ position:'absolute', top:'28%', left:'8%', fontSize:48, animation:'float 3s ease-in-out infinite', zIndex:1 }}>🏍️</div>
        <div style={{ position:'absolute', top:'40%', right:'8%', fontSize:48, animation:'float 3.5s ease-in-out infinite 0.5s', zIndex:1 }}>🚑</div>
        <div style={{ position:'absolute', bottom:'28%', left:'12%', fontSize:36, animation:'float 4s ease-in-out infinite 1s', zIndex:1 }}>📡</div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding:'80px 24px', background:'var(--navy-mid)' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:24 }}>
          {STATS.map((s, i) => (
            <div key={s.label} className="stat-card" style={{
              textAlign:'center', padding:'36px 24px', borderRadius:16,
              background:'var(--navy-card)', border:'1px solid var(--border)',
              animationDelay: `${i*0.1}s`,
            }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:48, fontWeight:700, color:'var(--teal)', marginBottom:8 }}>{s.value}</div>
              <div style={{ fontSize:14, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding:'100px 24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(28px,4vw,44px)', fontWeight:800, textAlign:'center', marginBottom:12 }}>
            How ATTER Works
          </h2>
          <p style={{ textAlign:'center', color:'var(--text-muted)', marginBottom:64, fontSize:17 }}>
            Five coordinated steps — all guided by AI running directly on each vehicle.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {HOW_STEPS.map((step, i) => (
              <div key={step.title} style={{ display:'flex', gap:32, alignItems:'flex-start', paddingBottom:40, position:'relative' }}>
                {i < HOW_STEPS.length-1 && (
                  <div style={{ position:'absolute', left:28, top:60, width:2, height:'calc(100% - 20px)',
                    background:'linear-gradient(to bottom, var(--teal), transparent)', zIndex:0 }} />
                )}
                <div className="step-dot" style={{
                  minWidth:56, height:56, borderRadius:'50%', flexShrink:0,
                  background:'var(--navy-card)', border:'2px solid var(--teal)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:24, zIndex:1, transition:'transform 0.2s',
                  boxShadow:'0 0 20px rgba(0,229,204,0.2)',
                }}>
                  {step.icon}
                </div>
                <div style={{ paddingTop:12 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, marginBottom:8 }}>{step.title}</div>
                  <div style={{ color:'var(--text-muted)', lineHeight:1.7, fontSize:15 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE CARDS / SIGN IN SECTION ── */}
      <section id="signin" style={{ padding:'80px 24px 120px', background:'var(--navy-mid)' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(26px,4vw,42px)', fontWeight:800, textAlign:'center', marginBottom:12 }}>
          Choose Your Role
        </h2>
        <p style={{ textAlign:'center', color:'var(--text-muted)', marginBottom:56, fontSize:16 }}>
          Sign in or register to access your dedicated dashboard
        </p>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:28 }}>
          {ROLES.map(role => (
            <div key={role.key} className="role-card" style={{
              background: 'var(--navy-card)', borderRadius: 20,
              border: `1px solid ${activeRole === role.key ? role.color : 'var(--border)'}`,
              padding: '36px 28px', position: 'relative', overflow: 'hidden',
              boxShadow: activeRole === role.key ? `0 0 32px ${role.color}22` : 'none',
            }}
              onClick={() => setActiveRole(role.key)}
            >
              <div style={{ position:'absolute', top:-20, right:-20, fontSize:80, opacity:0.06 }}>{role.icon}</div>
              <div style={{ fontSize:44, marginBottom:16 }}>{role.icon}</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, marginBottom:10, color:role.color }}>{role.title}</h3>
              <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.7, marginBottom:24 }}>{role.desc}</p>
              <ul style={{ listStyle:'none', marginBottom:32 }}>
                {role.features.map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:13, color:'var(--text-muted)' }}>
                    <span style={{ color:role.color, fontWeight:700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <div style={{ display:'flex', gap:10 }}>
                <button className="cta-btn" onClick={(e) => { e.stopPropagation(); navigate('/login'); }} style={{
                  flex:1, padding:'11px 0', borderRadius:8, fontSize:14, fontWeight:600,
                  background:'transparent', color:role.color, border:`1px solid ${role.color}60`,
                }}>Sign In</button>
                <button className="cta-btn" onClick={(e) => { e.stopPropagation(); navigate(`/register?role=${role.key}`); }} style={{
                  flex:1, padding:'11px 0', borderRadius:8, fontSize:14, fontWeight:700,
                  background:role.color, color:'var(--navy)',
                }}>Register</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH SECTION ── */}
      <section style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:860, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(24px,3.5vw,38px)', fontWeight:800, marginBottom:20 }}>
            Powered by Edge AI
          </h2>
          <p style={{ color:'var(--text-muted)', fontSize:16, lineHeight:1.8, marginBottom:48, maxWidth:600, margin:'0 auto 48px' }}>
            No cloud. No connectivity requirement. The DRNN model runs entirely on the vehicle's onboard edge node — making ATTER the only EMS system that works in zero-signal rural corridors.
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
            {['Deep Learning DRNN','Leaky ReLU Activation','CNN Terrain Analysis','Socket.io Live Tracking','Edge Computing','OpenStreetMap','MongoDB Atlas','Razorpay Payments'].map(tag => (
              <span key={tag} style={{
                padding:'8px 16px', borderRadius:20, fontSize:13,
                background:'rgba(0,229,204,0.08)', color:'var(--teal)',
                border:'1px solid rgba(0,229,204,0.2)', fontFamily:'var(--font-mono)',
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'32px 24px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>
          © 2026 ATTER
        </div>
      </footer>
    </div>
  );
}
