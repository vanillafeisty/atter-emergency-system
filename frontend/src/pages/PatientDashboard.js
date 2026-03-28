import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import LiveMap from '../components/LiveMap';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [helperLoc, setHelperLoc] = useState(null);
  const [ambulanceLoc, setAmbulanceLoc] = useState(null);
  const [vitals, setVitals] = useState({ heartRate:'', spo2:'', bloodPressure:'', notes:'' });
  const [activeTab, setActiveTab] = useState('map');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Get GPS
  useEffect(() => {
    const watchId = navigator.geolocation?.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        if (emergency?._id) emit('location:update', { ...loc, emergencyId: emergency._id });
      },
      err => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation?.clearWatch(watchId);
  }, [emergency, emit]);

  // Fetch active emergency
  const fetchEmergency = useCallback(async () => {
    try {
      const res = await axios.get('/emergency/active');
      setEmergency(res.data.emergency);
      if (res.data.emergency?.helperLocation) setHelperLoc(res.data.emergency.helperLocation);
      if (res.data.emergency?.ambulanceLocation) setAmbulanceLoc(res.data.emergency.ambulanceLocation);
    } catch {}
  }, []);

  useEffect(() => { fetchEmergency(); }, [fetchEmergency]);

  // Socket listeners
  useEffect(() => {
    const unsub1 = on('location:received', ({ role, lat, lng }) => {
      if (role === 'helper') setHelperLoc({ lat, lng });
      if (role === 'ambulance') setAmbulanceLoc({ lat, lng });
    });
    const unsub2 = on('emergency:status_update', () => fetchEmergency());
    const unsub3 = on('chat:message', (msg) => setMessages(prev => [...prev, msg]));
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [on, fetchEmergency]);

  const requestEmergency = async () => {
    if (!myLocation) return toast.error('Cannot get your location. Please enable GPS.');
    setLoading(true);
    try {
      const res = await axios.post('/emergency/request', {
        patientLocation: { ...myLocation, address: 'Current Location' },
        emergencyType: 'trauma',
      });
      setEmergency(res.data.emergency);
      emit('emergency:new', { emergencyId: res.data.emergency._id, location: myLocation });
      toast.success('Emergency request sent! Dispatching help...');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request emergency');
    } finally { setLoading(false); }
  };

  const initiatePayment = async () => {
    if (!emergency) return;
    try {
      const res = await axios.post('/payment/create-order', { emergencyId: emergency._id, amount: 500 });
      const options = {
        key: RAZORPAY_KEY,
        amount: res.data.amount,
        currency: res.data.currency,
        name: 'ATTER Emergency Services',
        description: 'Emergency Transport Payment',
        order_id: res.data.orderId,
        handler: async (response) => {
          try {
            await axios.post('/payment/verify', { ...response, emergencyId: emergency._id });
            toast.success('Payment successful! Thank you.');
            fetchEmergency();
          } catch { toast.error('Payment verification failed.'); }
        },
        theme: { color: '#00E5CC' },
        modal: { ondismiss: () => toast('Payment cancelled', { icon: '⚠️' }) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error('Failed to initiate payment');
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !emergency) return;
    emit('chat:message', { emergencyId: emergency._id, message: chatInput });
    setMessages(prev => [...prev, { from: { name: user.name, role: 'patient' }, message: chatInput, timestamp: new Date() }]);
    setChatInput('');
  };

  const TIMELINE_ICONS = { pending:'⏳', helper_assigned:'🏍️', helper_en_route:'🏃', patient_picked:'🤝', rendezvous:'📍', ambulance_en_route:'🚑', hospital_reached:'🏥', completed:'✅', cancelled:'❌' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', paddingTop:64 }}>
      <Navbar />
      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes ring{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}
        .tab-btn{padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-family:var(--font-body);font-size:14px;font-weight:600;transition:all 0.2s;}
        .sos-btn{animation:pulse 2s infinite;transition:all 0.2s;}
        .sos-btn:hover{filter:brightness(1.15);}
      `}</style>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 20px', display:'grid', gridTemplateColumns:'1fr 380px', gap:24, height:'calc(100vh - 64px)' }}>

        {/* LEFT: Map */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22 }}>Patient Dashboard</h2>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:2 }}>
                {myLocation ? `📍 ${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : 'Acquiring GPS...'}
              </p>
            </div>
            {emergency && <StatusBadge status={emergency.status} size="lg" />}
          </div>

          <div style={{ flex:1, minHeight:0, background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
            <LiveMap
              patientLoc={myLocation}
              helperLoc={helperLoc}
              ambulanceLoc={ambulanceLoc}
              rendezvousLoc={emergency?.rendezvousPoint}
              myRole="patient"
              center={myLocation}
            />
          </div>
        </div>

        {/* RIGHT: Control Panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>

          {/* SOS or status */}
          {!emergency ? (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:28, textAlign:'center' }}>
              <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:24 }}>Press SOS to dispatch emergency response immediately</p>
              <div style={{ position:'relative', display:'inline-block', marginBottom:24 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(255,45,85,0.3)', animation:'ring 1.5s ease-out infinite' }} />
                <button className="sos-btn" onClick={requestEmergency} disabled={loading || !myLocation} style={{
                  width:140, height:140, borderRadius:'50%', fontSize:20, fontWeight:800, fontFamily:'var(--font-display)',
                  background:'var(--red)', color:'#fff', position:'relative',
                  boxShadow:'0 0 48px rgba(255,45,85,0.6)',
                }}>
                  {loading ? '...' : '🆘 SOS'}
                </button>
              </div>
              {!myLocation && <p style={{ color:'var(--amber)', fontSize:12 }}>⚠️ Enable location access for SOS to work</p>}
            </div>
          ) : (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid rgba(0,229,204,0.2)', padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17 }}>Active Emergency</h3>
                <StatusBadge status={emergency.status} />
              </div>

              {/* Responders */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Helper Vehicle', data: emergency.helper, icon:'🏍️', color:'var(--amber)', loc: helperLoc },
                  { label:'Ambulance', data: emergency.ambulance, icon:'🚑', color:'var(--red)', loc: ambulanceLoc },
                ].map(({ label, data, icon, color, loc }) => (
                  <div key={label} style={{ padding:'12px 14px', borderRadius:10, background:'var(--navy-light)', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span>{icon}</span>
                      <span style={{ fontSize:13, fontWeight:600, color }}>{label}</span>
                    </div>
                    {data ? (
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {data.name} • {data.phone}
                        {loc && <span style={{ marginLeft:8, color:'var(--teal)' }}>📡 Live</span>}
                      </div>
                    ) : (
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>Waiting for assignment...</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {emergency.timeline?.length > 0 && (
                <div style={{ marginTop:16 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:10, letterSpacing:1 }}>TIMELINE</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:150, overflowY:'auto' }}>
                    {emergency.timeline.slice(-5).reverse().map((t, i) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ fontSize:14 }}>{TIMELINE_ICONS[emergency.status] || '📋'}</span>
                        <div>
                          <p style={{ fontSize:12, color:'var(--text)' }}>{t.event}</p>
                          <p style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(t.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment */}
              {emergency.status === 'completed' && emergency.payment?.status !== 'paid' && (
                <button onClick={initiatePayment} style={{
                  width:'100%', marginTop:16, padding:'13px', borderRadius:10, fontSize:15, fontWeight:700,
                  background:'var(--teal)', color:'var(--navy)',
                }}>
                  💳 Pay ₹500 via Razorpay
                </button>
              )}
              {emergency.payment?.status === 'paid' && (
                <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10, background:'rgba(52,211,153,0.1)', color:'#34d399', fontSize:13, fontWeight:600 }}>
                  ✅ Payment Completed
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display:'flex', gap:8 }}>
            {['map','chat','vitals'].map(t => (
              <button key={t} className="tab-btn" onClick={() => setActiveTab(t)} style={{
                flex:1, background: activeTab===t ? 'var(--teal)' : 'var(--navy-card)',
                color: activeTab===t ? 'var(--navy)' : 'var(--text-muted)',
                border: `1px solid ${activeTab===t ? 'var(--teal)' : 'var(--border)'}`,
              }}>{t === 'map' ? '🗺 Map' : t === 'chat' ? '💬 Chat' : '❤️ Vitals'}</button>
            ))}
          </div>

          {/* Vitals panel */}
          {activeTab === 'vitals' && (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:20 }}>
              <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:16 }}>My Health Info</h4>
              {[['heartRate','Heart Rate (bpm)'],['spo2','SpO₂ (%)'],['bloodPressure','Blood Pressure'],['notes','Notes']].map(([k,l]) => (
                <div key={k} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{l.toUpperCase()}</label>
                  <input value={vitals[k]} onChange={e => setVitals(v=>({...v,[k]:e.target.value}))} placeholder={l}
                    style={{ width:'100%', padding:'10px 12px', background:'var(--navy-light)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14 }} />
                </div>
              ))}
            </div>
          )}

          {/* Chat */}
          {activeTab === 'chat' && emergency && (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:16, display:'flex', flexDirection:'column', gap:12, flex:1, minHeight:200 }}>
              <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Emergency Chat</h4>
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, maxHeight:200 }}>
                {messages.length === 0 && <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center' }}>No messages yet</p>}
                {messages.map((m, i) => (
                  <div key={i} style={{ padding:'8px 12px', borderRadius:8, background: m.from.role==='patient' ? 'rgba(0,229,204,0.1)' : 'var(--navy-light)', maxWidth:'85%', alignSelf: m.from.role==='patient' ? 'flex-end' : 'flex-start' }}>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{m.from.name}</p>
                    <p style={{ fontSize:14 }}>{m.message}</p>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                  placeholder="Type message..." style={{ flex:1, padding:'10px 12px', background:'var(--navy-light)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14 }} />
                <button onClick={sendChat} style={{ padding:'10px 16px', borderRadius:8, background:'var(--teal)', color:'var(--navy)', fontWeight:700 }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
