import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import LiveMap from '../components/LiveMap';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function HelperDashboard() {
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const [emergency, setEmergency] = useState(null);
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [patientLoc, setPatientLoc] = useState(null);
  const [ambulanceLoc, setAmbulanceLoc] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [vitals, setVitals] = useState({ heartRate:'', spo2:'', bloodPressure:'', notes:'' });
  const [activeTab, setActiveTab] = useState('map');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // GPS watch
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
      if (res.data.emergency?.ambulanceLocation) setAmbulanceLoc(res.data.emergency.ambulanceLocation);
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
      if (role === 'ambulance') setAmbulanceLoc({ lat, lng });
    });
    const u2 = on('emergency:alert', () => fetchPending());
    const u3 = on('emergency:status_update', () => fetchEmergency());
    const u4 = on('chat:message', msg => setMessages(p => [...p, msg]));
    return () => { u1?.(); u2?.(); u3?.(); u4?.(); };
  }, [on, fetchEmergency, fetchPending]);

  const acceptEmergency = async (emergencyId) => {
    try {
      const res = await axios.patch(`/emergency/${emergencyId}/accept`);
      setEmergency(res.data.emergency);
      emit('emergency:helper_accepted', { emergencyId, helperName: user.name, helperLocation: myLocation });
      toast.success('Emergency accepted! Navigate to patient.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept');
    }
  };

  const updateStatus = async (status) => {
    if (!emergency) return;
    try {
      await axios.patch(`/emergency/${emergency._id}/status`, { status });
      emit('emergency:status_change', { emergencyId: emergency._id, status });
      fetchEmergency();
      toast.success(`Status updated: ${status}`);
    } catch { toast.error('Status update failed'); }
  };

  const submitVitals = async () => {
    if (!emergency) return;
    try {
      await axios.patch(`/emergency/${emergency._id}/status`, { status: emergency.status, patientVitals: vitals });
      emit('vitals:update', { emergencyId: emergency._id, vitals });
      toast.success('Vitals sent to ambulance!');
    } catch { toast.error('Failed to send vitals'); }
  };

  const toggleAvailability = async () => {
    try {
      await axios.patch('/user/availability', { isAvailable: !isAvailable });
      setIsAvailable(a => !a);
      toast.success(`You are now ${!isAvailable ? 'available' : 'unavailable'}`);
    } catch {}
  };

  const sendChat = () => {
    if (!chatInput.trim() || !emergency) return;
    emit('chat:message', { emergencyId: emergency._id, message: chatInput });
    setMessages(p => [...p, { from:{ name: user.name, role:'helper' }, message: chatInput, timestamp: new Date() }]);
    setChatInput('');
  };

  const STATUS_ACTIONS = {
    helper_assigned: { label:'🏃 Mark En Route', next:'helper_en_route' },
    helper_en_route: { label:'🤝 Patient Picked Up', next:'patient_picked' },
    patient_picked:  { label:'📍 At Rendezvous', next:'rendezvous' },
  };
  const action = emergency ? STATUS_ACTIONS[emergency.status] : null;

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', paddingTop:64 }}>
      <Navbar />
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 20px', display:'grid', gridTemplateColumns:'1fr 380px', gap:24, height:'calc(100vh - 64px)' }}>

        {/* LEFT: Map */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22 }}>🏍️ Helper Dashboard</h2>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:2 }}>
                {myLocation ? `📍 ${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : 'Acquiring GPS...'}
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {emergency && <StatusBadge status={emergency.status} size="lg" />}
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20,
                background: isAvailable ? 'rgba(0,229,204,0.1)' : 'rgba(107,114,128,0.1)',
                border: `1px solid ${isAvailable ? 'var(--teal)' : '#6b7280'}40`,
                cursor:'pointer' }} onClick={toggleAvailability}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: isAvailable ? 'var(--teal)' : '#6b7280' }} />
                <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color: isAvailable ? 'var(--teal)' : '#6b7280' }}>
                  {isAvailable ? 'AVAILABLE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ flex:1, minHeight:0, background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
            <LiveMap
              patientLoc={patientLoc}
              helperLoc={myLocation}
              ambulanceLoc={ambulanceLoc}
              rendezvousLoc={emergency?.rendezvousPoint}
              myRole="helper"
              center={myLocation}
            />
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, overflowY:'auto' }}>

          {/* Active emergency controls */}
          {emergency ? (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid rgba(255,149,0,0.2)', padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17 }}>Active Mission</h3>
                <StatusBadge status={emergency.status} />
              </div>

              <div style={{ padding:'14px', borderRadius:10, background:'var(--navy-light)', marginBottom:16 }}>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>PATIENT</p>
                <p style={{ fontSize:15, fontWeight:600 }}>{emergency.patient?.name}</p>
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>{emergency.patient?.phone}</p>
                {patientLoc && <p style={{ fontSize:12, color:'var(--teal)', marginTop:4 }}>📡 Live tracking active</p>}
              </div>

              {emergency.rendezvousPoint && (
                <div style={{ padding:'14px', borderRadius:10, background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.2)', marginBottom:16 }}>
                  <p style={{ fontSize:12, color:'#a855f7', fontWeight:700, marginBottom:4 }}>📍 RENDEZVOUS POINT</p>
                  <p style={{ fontSize:13, fontFamily:'var(--font-mono)', color:'var(--text)' }}>
                    {emergency.rendezvousPoint.lat?.toFixed(5)}, {emergency.rendezvousPoint.lng?.toFixed(5)}
                  </p>
                </div>
              )}

              {action && (
                <button onClick={() => updateStatus(action.next)} style={{
                  width:'100%', padding:'13px', borderRadius:10, fontSize:15, fontWeight:700,
                  background:'var(--amber)', color:'var(--navy)', marginBottom:10,
                }}>{action.label}</button>
              )}
            </div>
          ) : (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Nearby Emergencies</h3>
                <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{pendingEmergencies.length} PENDING</span>
              </div>
              {pendingEmergencies.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>😴</div>
                  <p style={{ color:'var(--text-muted)', fontSize:14 }}>No nearby emergencies. Stay available.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {pendingEmergencies.map(e => (
                    <div key={e._id} style={{ padding:16, borderRadius:12, background:'var(--navy-light)', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div>
                          <p style={{ fontWeight:600, fontSize:15 }}>{e.patient?.name}</p>
                          <p style={{ fontSize:12, color:'var(--text-muted)' }}>{e.emergencyType} • {new Date(e.createdAt).toLocaleTimeString()}</p>
                        </div>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--red)', animation:'pulse 1.5s infinite' }} />
                      </div>
                      <button onClick={() => acceptEmergency(e._id)} style={{
                        width:'100%', padding:'10px', borderRadius:8, fontSize:14, fontWeight:700,
                        background:'var(--amber)', color:'var(--navy)',
                      }}>✅ Accept Mission</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display:'flex', gap:8 }}>
            {['vitals','chat'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                flex:1, padding:'10px', borderRadius:8, border:'1px solid',
                borderColor: activeTab===t ? 'var(--amber)' : 'var(--border)',
                background: activeTab===t ? 'rgba(255,149,0,0.12)' : 'var(--navy-card)',
                color: activeTab===t ? 'var(--amber)' : 'var(--text-muted)',
                fontSize:14, fontWeight:600, cursor:'pointer',
              }}>{t === 'vitals' ? '❤️ Patient Vitals' : '💬 Chat'}</button>
            ))}
          </div>

          {activeTab === 'vitals' && (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:20 }}>
              <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:16 }}>Record Patient Vitals</h4>
              {[['heartRate','❤️ Heart Rate (bpm)'],['spo2','🫧 SpO₂ (%)'],['bloodPressure','🩸 Blood Pressure'],['notes','📝 Notes']].map(([k,l]) => (
                <div key={k} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{l.toUpperCase()}</label>
                  <input value={vitals[k]} onChange={e => setVitals(v=>({...v,[k]:e.target.value}))} placeholder={l}
                    style={{ width:'100%', padding:'10px 12px', background:'var(--navy-light)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14 }} />
                </div>
              ))}
              <button onClick={submitVitals} style={{ width:'100%', padding:'12px', borderRadius:10, background:'var(--amber)', color:'var(--navy)', fontWeight:700, fontSize:15 }}>
                📡 Send Vitals to Ambulance
              </button>
            </div>
          )}

          {activeTab === 'chat' && emergency && (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Emergency Chat</h4>
              <div style={{ overflowY:'auto', maxHeight:180, display:'flex', flexDirection:'column', gap:8 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ padding:'8px 12px', borderRadius:8, background: m.from.role==='helper' ? 'rgba(255,149,0,0.1)' : 'var(--navy-light)', maxWidth:'85%', alignSelf: m.from.role==='helper'?'flex-end':'flex-start' }}>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{m.from.name}</p>
                    <p style={{ fontSize:14 }}>{m.message}</p>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                  placeholder="Type message..." style={{ flex:1, padding:'10px 12px', background:'var(--navy-light)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14 }} />
                <button onClick={sendChat} style={{ padding:'10px 16px', borderRadius:8, background:'var(--amber)', color:'var(--navy)', fontWeight:700 }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
