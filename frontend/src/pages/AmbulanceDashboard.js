import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import LiveMap from '../components/LiveMap';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function AmbulanceDashboard() {
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [emergency, setEmergency] = useState(null);
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [patientLoc, setPatientLoc] = useState(null);
  const [helperLoc, setHelperLoc] = useState(null);
  const [receivedVitals, setReceivedVitals] = useState(null);
  const [rendezvousInput, setRendezvousInput] = useState({ lat:'', lng:'' });
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('map');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const watchId = navigator.geolocation?.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        if (emergency?._id) emit('location:update', { ...loc, emergencyId: emergency._id });
      },
      err => console.warn('GPS:', err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation?.clearWatch(watchId);
  }, [emergency, emit]);

  const fetchEmergency = useCallback(async () => {
    try {
      const res = await axios.get('/emergency/active');
      setEmergency(res.data.emergency);
      if (res.data.emergency?.patientLocation) setPatientLoc(res.data.emergency.patientLocation);
      if (res.data.emergency?.helperLocation) setHelperLoc(res.data.emergency.helperLocation);
      if (res.data.emergency?.patientVitals) setReceivedVitals(res.data.emergency.patientVitals);
    } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    if (emergency) return;
    try {
      const res = await axios.get('/emergency/pending');
      setPendingEmergencies(res.data.emergencies || []);
    } catch {}
  }, [emergency]);

  useEffect(() => { fetchEmergency(); }, [fetchEmergency]);
  useEffect(() => { fetchPending(); const t = setInterval(fetchPending, 8000); return () => clearInterval(t); }, [fetchPending]);

  useEffect(() => {
    const u1 = on('location:received', ({ role, lat, lng }) => {
      if (role === 'patient') setPatientLoc({ lat, lng });
      if (role === 'helper') setHelperLoc({ lat, lng });
    });
    const u2 = on('vitals:received', ({ vitals }) => {
      setReceivedVitals(vitals);
      toast('📡 New vitals received from Helper!', { icon: '❤️' });
    });
    const u3 = on('emergency:alert', () => fetchPending());
    const u4 = on('emergency:status_update', () => fetchEmergency());
    const u5 = on('chat:message', msg => setMessages(p => [...p, msg]));
    return () => { u1?.(); u2?.(); u3?.(); u4?.(); u5?.(); };
  }, [on, fetchEmergency, fetchPending]);

  const acceptEmergency = async (emergencyId) => {
    try {
      const res = await axios.patch(`/emergency/${emergencyId}/accept`);
      setEmergency(res.data.emergency);
      toast.success('Emergency accepted! Navigate to rendezvous point.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept');
    }
  };

  const setRendezvous = async () => {
    if (!emergency || !rendezvousInput.lat || !rendezvousInput.lng) return toast.error('Enter valid coordinates');
    const rp = { lat: parseFloat(rendezvousInput.lat), lng: parseFloat(rendezvousInput.lng) };
    try {
      await axios.patch(`/emergency/${emergency._id}/status`, { status: emergency.status, rendezvousPoint: rp });
      emit('emergency:status_change', { emergencyId: emergency._id, status: emergency.status });
      fetchEmergency();
      toast.success('Rendezvous point set! Helper notified.');
    } catch { toast.error('Failed to set rendezvous'); }
  };

  // Auto-suggest rendezvous: midpoint between helper and ambulance
  const suggestRendezvous = () => {
    if (!helperLoc || !myLocation) return toast.error('Need both Helper and Ambulance locations');
    const lat = ((helperLoc.lat + myLocation.lat) / 2).toFixed(5);
    const lng = ((helperLoc.lng + myLocation.lng) / 2).toFixed(5);
    setRendezvousInput({ lat, lng });
    toast.success('AI-suggested midpoint set!', { icon: '🧠' });
  };

  const updateStatus = async (status) => {
    if (!emergency) return;
    try {
      await axios.patch(`/emergency/${emergency._id}/status`, { status });
      emit('emergency:status_change', { emergencyId: emergency._id, status });
      fetchEmergency();
      toast.success(`Status: ${status}`);
    } catch { toast.error('Status update failed'); }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !emergency) return;
    emit('chat:message', { emergencyId: emergency._id, message: chatInput });
    setMessages(p => [...p, { from:{ name: user.name, role:'ambulance' }, message: chatInput, timestamp: new Date() }]);
    setChatInput('');
  };

  const STATUS_ACTIONS = {
    rendezvous:           { label:'🚑 Mark En Route to Rendezvous', next:'ambulance_en_route' },
    ambulance_en_route:   { label:'🏥 Mark Hospital Reached', next:'hospital_reached' },
    hospital_reached:     { label:'✅ Complete Emergency', next:'completed' },
  };
  const action = emergency ? STATUS_ACTIONS[emergency.status] : null;

  const VITAL_COLOR = (key, val) => {
    if (!val) return 'var(--text-muted)';
    const num = parseFloat(val);
    if (key === 'heartRate') return num < 60 || num > 100 ? 'var(--red)' : 'var(--teal)';
    if (key === 'spo2') return num < 95 ? 'var(--red)' : 'var(--teal)';
    return 'var(--text)';
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', paddingTop:64 }}>
      <Navbar />
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 20px', display:'grid', gridTemplateColumns:'1fr 400px', gap:24, height:'calc(100vh - 64px)' }}>

        {/* LEFT: Map */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22 }}>🚑 Ambulance Dashboard</h2>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:2 }}>
                {myLocation ? `📍 ${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : 'Acquiring GPS...'}
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {emergency && <StatusBadge status={emergency.status} size="lg" />}
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20,
                background: isAvailable ? 'rgba(255,45,85,0.1)' : 'rgba(107,114,128,0.1)',
                border: `1px solid ${isAvailable ? 'var(--red)' : '#6b7280'}40`,
                cursor:'pointer' }} onClick={() => setIsAvailable(a=>!a)}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: isAvailable ? 'var(--red)' : '#6b7280', animation: isAvailable ? 'pulse 1.5s infinite':'' }} />
                <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color: isAvailable ? 'var(--red)':'#6b7280' }}>
                  {isAvailable ? 'ON DUTY' : 'OFF DUTY'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ flex:1, minHeight:0, background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
            <LiveMap
              patientLoc={patientLoc}
              helperLoc={helperLoc}
              ambulanceLoc={myLocation}
              rendezvousLoc={emergency?.rendezvousPoint}
              myRole="ambulance"
              center={myLocation}
            />
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>

          {emergency ? (
            <>
              {/* Mission info */}
              <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid rgba(255,45,85,0.2)', padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17 }}>Active Mission</h3>
                  <StatusBadge status={emergency.status} />
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  {[
                    { icon:'🆘', label:'PATIENT', data: emergency.patient, color:'var(--teal)', loc: patientLoc },
                    { icon:'🏍️', label:'HELPER VEHICLE', data: emergency.helper, color:'var(--amber)', loc: helperLoc },
                  ].map(({ icon, label, data, color, loc }) => (
                    <div key={label} style={{ padding:'12px 14px', borderRadius:10, background:'var(--navy-light)', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span>{icon}</span>
                          <span style={{ fontSize:11, fontWeight:700, color, fontFamily:'var(--font-mono)' }}>{label}</span>
                        </div>
                        {loc && <span style={{ fontSize:11, color:'var(--teal)' }}>📡 LIVE</span>}
                      </div>
                      <p style={{ fontSize:14, marginTop:4 }}>{data?.name || 'Not assigned'}</p>
                      <p style={{ fontSize:12, color:'var(--text-muted)' }}>{data?.phone || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Rendezvous setter */}
                <div style={{ background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:12, padding:14, marginBottom:14 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#a855f7', marginBottom:10, letterSpacing:1 }}>📍 SET RENDEZVOUS POINT</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                    {['lat','lng'].map(k => (
                      <input key={k} value={rendezvousInput[k]} onChange={e=>setRendezvousInput(r=>({...r,[k]:e.target.value}))}
                        placeholder={k === 'lat' ? 'Latitude' : 'Longitude'}
                        style={{ padding:'9px 12px', background:'var(--navy-light)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13 }} />
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={suggestRendezvous} style={{ flex:1, padding:'9px', borderRadius:8, background:'rgba(168,85,247,0.15)', color:'#a855f7', border:'1px solid rgba(168,85,247,0.3)', fontSize:13, fontWeight:600 }}>
                      🧠 AI Suggest
                    </button>
                    <button onClick={setRendezvous} style={{ flex:1, padding:'9px', borderRadius:8, background:'#a855f7', color:'#fff', fontSize:13, fontWeight:700 }}>
                      Set Point
                    </button>
                  </div>
                </div>

                {action && (
                  <button onClick={() => updateStatus(action.next)} style={{
                    width:'100%', padding:'13px', borderRadius:10, fontSize:15, fontWeight:700,
                    background:'var(--red)', color:'#fff',
                  }}>{action.label}</button>
                )}
              </div>

              {/* Vitals */}
              {receivedVitals && (
                <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid rgba(0,229,204,0.2)', padding:20 }}>
                  <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    ❤️ Patient Vitals
                    <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--teal)', padding:'3px 8px', borderRadius:10, background:'rgba(0,229,204,0.1)' }}>LIVE</span>
                  </h4>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {[['heartRate','Heart Rate','bpm'],['spo2','SpO₂','%']].map(([k,l,u]) => receivedVitals[k] && (
                      <div key={k} style={{ padding:'14px', borderRadius:10, background:'var(--navy-light)', textAlign:'center' }}>
                        <p style={{ fontSize:28, fontWeight:800, fontFamily:'var(--font-mono)', color: VITAL_COLOR(k, receivedVitals[k]) }}>
                          {receivedVitals[k]}<span style={{ fontSize:13 }}>{u}</span>
                        </p>
                        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{l.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                  {receivedVitals.bloodPressure && (
                    <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background:'var(--navy-light)' }}>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>BLOOD PRESSURE: </span>
                      <span style={{ fontSize:15, fontWeight:700, fontFamily:'var(--font-mono)' }}>{receivedVitals.bloodPressure}</span>
                    </div>
                  )}
                  {receivedVitals.notes && (
                    <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background:'var(--navy-light)', color:'var(--text-muted)', fontSize:13 }}>
                      📝 {receivedVitals.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Chat */}
              <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:16 }}>
                <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:12 }}>💬 Emergency Chat</h4>
                <div style={{ overflowY:'auto', maxHeight:160, display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ padding:'8px 12px', borderRadius:8, background: m.from.role==='ambulance' ? 'rgba(255,45,85,0.1)':'var(--navy-light)', maxWidth:'85%', alignSelf: m.from.role==='ambulance'?'flex-end':'flex-start' }}>
                      <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{m.from.name}</p>
                      <p style={{ fontSize:14 }}>{m.message}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                    placeholder="Type message..." style={{ flex:1, padding:'10px 12px', background:'var(--navy-light)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14 }} />
                  <button onClick={sendChat} style={{ padding:'10px 16px', borderRadius:8, background:'var(--red)', color:'#fff', fontWeight:700 }}>Send</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Available Intercepts</h3>
                <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{pendingEmergencies.length} READY</span>
              </div>
              {pendingEmergencies.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🚑</div>
                  <p style={{ color:'var(--text-muted)', fontSize:14 }}>Standby. No intercepts needed yet.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {pendingEmergencies.map(e => (
                    <div key={e._id} style={{ padding:16, borderRadius:12, background:'var(--navy-light)', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <div>
                          <p style={{ fontWeight:600, fontSize:15 }}>{e.patient?.name}</p>
                          <p style={{ fontSize:12, color:'var(--text-muted)' }}>Helper assigned • Needs AMB intercept</p>
                        </div>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--amber)', animation:'pulse 1.5s infinite' }} />
                      </div>
                      <button onClick={() => acceptEmergency(e._id)} style={{ width:'100%', padding:'10px', borderRadius:8, fontSize:14, fontWeight:700, background:'var(--red)', color:'#fff' }}>
                        🚑 Intercept
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
