import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import LiveMap from '../components/LiveMap';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { queueEmergency, cacheEmergency, getCachedEmergency, cacheLocation } from '../utils/offlineDB';

export default function PatientDashboard() {
  const { user, token } = useAuth();
  const { emit, on } = useSocket();
  const { isOnline } = useOnlineStatus();
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [helperLoc, setHelperLoc] = useState(null);
  const [ambulanceLoc, setAmbulanceLoc] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [offlineQueued, setOfflineQueued] = useState(false);

  // GPS watch — cache location for offline use
  useEffect(() => {
    const watchId = navigator.geolocation?.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        if (user?._id) cacheLocation(user._id, loc.lat, loc.lng).catch(() => {});
        if (emergency?._id && isOnline) emit('location:update', { ...loc, emergencyId: emergency._id });
      },
      err => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation?.clearWatch(watchId);
  }, [emergency, emit, isOnline, user]);

  const fetchEmergency = useCallback(async () => {
    try {
      const res = await axios.get('/emergency/active');
      if (res.data.emergency) {
        setEmergency(res.data.emergency);
        cacheEmergency(res.data.emergency).catch(() => {});
        if (res.data.emergency.helperLocation) setHelperLoc(res.data.emergency.helperLocation);
        if (res.data.emergency.ambulanceLocation) setAmbulanceLoc(res.data.emergency.ambulanceLocation);
      }
    } catch (err) {
      // Offline fallback — load from IndexedDB
      if (!isOnline && user?._id) {
        const cached = await getCachedEmergency(user._id).catch(() => null);
        if (cached) setEmergency(cached);
      }
    }
  }, [isOnline, user]);

  useEffect(() => { fetchEmergency(); }, [fetchEmergency]);

  // Re-fetch when coming back online
  useEffect(() => {
    if (isOnline) fetchEmergency();
  }, [isOnline, fetchEmergency]);

  // Listen for synced emergency from service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'EMERGENCY_SYNCED') {
          setOfflineQueued(false);
          setEmergency(event.data.data.emergency);
          toast.success('Emergency synced! Help is on the way.');
        }
      });
    }
  }, []);

  useEffect(() => {
    const u1 = on('location:received', ({ role, lat, lng }) => {
      if (role === 'helper') setHelperLoc({ lat, lng });
      if (role === 'ambulance') setAmbulanceLoc({ lat, lng });
    });
    const u2 = on('emergency:status_update', () => fetchEmergency());
    const u3 = on('chat:message', (msg) => setMessages(prev => [...prev, msg]));
    return () => { u1?.(); u2?.(); u3?.(); };
  }, [on, fetchEmergency]);

  const requestEmergency = async () => {
    if (!myLocation) return toast.error('Cannot get your location. Please enable GPS.');
    setLoading(true);
    const emergencyData = {
      patientLocation: { ...myLocation, address: 'Current Location' },
      emergencyType: 'trauma',
    };
    try {
      if (!isOnline) {
        // Queue for later sync
        await queueEmergency(emergencyData, token);
        setOfflineQueued(true);
        toast('📡 You are offline. Emergency queued — will dispatch automatically when connected.', {
          icon: '⚠️', duration: 6000,
          style: { background: 'rgba(255,149,0,0.9)', color: '#0a0f1e' }
        });
        // Register background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const sw = await navigator.serviceWorker.ready;
          await sw.sync.register('sync-emergencies');
        }
      } else {
        const res = await axios.post('/emergency/request', emergencyData);
        setEmergency(res.data.emergency);
        cacheEmergency(res.data.emergency).catch(() => {});
        emit('emergency:new', { emergencyId: res.data.emergency._id, location: myLocation });
        toast.success('Emergency request sent! Dispatching help...');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request emergency');
    } finally { setLoading(false); }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !emergency) return;
    if (!isOnline) return toast.error('Chat requires internet connection');
    emit('chat:message', { emergencyId: emergency._id, message: chatInput });
    setMessages(prev => [...prev, { from: { name: user.name, role: 'patient' }, message: chatInput, timestamp: new Date() }]);
    setChatInput('');
  };

  const TIMELINE_ICONS = {
    pending:'⏳', helper_assigned:'🏍️', helper_en_route:'🏃',
    patient_picked:'🤝', rendezvous:'📍', ambulance_en_route:'🚑',
    hospital_reached:'🏥', completed:'✅', cancelled:'❌'
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', paddingTop:64 }}>
      <Navbar />
      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes ring{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .tab-btn{padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-family:var(--font-body);font-size:14px;font-weight:600;transition:all 0.2s;}
        .sos-btn{animation:pulse 2s infinite;transition:all 0.2s;}
        .sos-btn:hover{filter:brightness(1.15);}
      `}</style>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 20px', display:'grid', gridTemplateColumns:'1fr 380px', gap:24, minHeight:'calc(100vh - 64px)' }}>

        {/* LEFT: Map */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22 }}>Patient Dashboard</h2>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:2 }}>
                {myLocation ? `📍 ${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : 'Acquiring GPS...'}
                {!isOnline && <span style={{ color:'var(--amber)', marginLeft:8 }}>• OFFLINE</span>}
              </p>
            </div>
            {emergency && <StatusBadge status={emergency.status} size="lg" />}
          </div>

          <div style={{ flex:1, minHeight:400, background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
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

          {/* Offline queued notice */}
          {offlineQueued && (
            <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(255,149,0,0.1)', border:'1px solid rgba(255,149,0,0.3)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>📡</span>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--amber)' }}>Emergency Queued Offline</p>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>Will dispatch automatically when internet returns</p>
              </div>
            </div>
          )}

          {/* SOS or active emergency */}
          {!emergency && !offlineQueued ? (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:28, textAlign:'center' }}>
              <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:24 }}>
                Press SOS to dispatch emergency response
                {!isOnline && <span style={{ display:'block', color:'var(--amber)', marginTop:6, fontSize:12 }}>📡 Offline — SOS will be queued and sent when connected</span>}
              </p>
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
          ) : emergency ? (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid rgba(0,229,204,0.2)', padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17 }}>Active Emergency</h3>
                <StatusBadge status={emergency.status} />
              </div>

              {/* Responders */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {[
                  { label:'Helper Vehicle', data:emergency.helper, icon:'🏍️', color:'var(--amber)', loc:helperLoc },
                  { label:'Ambulance', data:emergency.ambulance, icon:'🚑', color:'var(--red)', loc:ambulanceLoc },
                ].map(({ label, data, icon, color, loc }) => (
                  <div key={label} style={{ padding:'12px 14px', borderRadius:10, background:'var(--navy-light)', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span>{icon}</span>
                        <span style={{ fontSize:12, fontWeight:700, color }}>{label}</span>
                      </div>
                      {loc && <span style={{ fontSize:11, color:'var(--teal)', fontFamily:'var(--font-mono)' }}>📡 LIVE</span>}
                    </div>
                    {data
                      ? <p style={{ fontSize:13, color:'var(--text-muted)' }}>{data.name} • {data.phone}</p>
                      : <p style={{ fontSize:12, color:'var(--text-muted)' }}>Waiting for assignment...</p>
                    }
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {emergency.timeline?.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, letterSpacing:1 }}>TIMELINE</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:120, overflowY:'auto' }}>
                    {emergency.timeline.slice(-5).reverse().map((t, i) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ fontSize:13 }}>{TIMELINE_ICONS[emergency.status] || '📋'}</span>
                        <div>
                          <p style={{ fontSize:12 }}>{t.event}</p>
                          <p style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(t.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment — dummy badge */}
              {emergency.status === 'completed' && (
                <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(255,149,0,0.08)', border:'1px solid rgba(255,149,0,0.25)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:20 }}>💳</span>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--amber)' }}>Payment Pending</p>
                        <p style={{ fontSize:12, color:'var(--text-muted)' }}>Emergency transport fee</p>
                      </div>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:800, color:'var(--amber)' }}>₹500</span>
                  </div>
                  <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(255,149,0,0.1)', marginBottom:10 }}>
                    <p style={{ fontSize:11, color:'var(--amber)', fontFamily:'var(--font-mono)' }}>ORDER ID: ATTER-{emergency._id?.slice(-8).toUpperCase()}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Payment gateway integration coming soon</p>
                  </div>
                  <button disabled style={{
                    width:'100%', padding:'12px', borderRadius:10, fontSize:14, fontWeight:700,
                    background:'rgba(255,149,0,0.2)', color:'var(--amber)',
                    border:'1px solid rgba(255,149,0,0.4)', cursor:'not-allowed',
                  }}>
                    🔒 Pay via Razorpay — Coming Soon
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Tabs */}
          <div style={{ display:'flex', gap:8 }}>
            {['map','chat'].map(t => (
              <button key={t} className="tab-btn" onClick={() => setActiveTab(t)} style={{
                flex:1, background: activeTab===t ? 'var(--teal)' : 'var(--navy-card)',
                color: activeTab===t ? 'var(--navy)' : 'var(--text-muted)',
                border: `1px solid ${activeTab===t ? 'var(--teal)' : 'var(--border)'}`,
              }}>{t === 'map' ? '🗺 Map Info' : '💬 Chat'}</button>
            ))}
          </div>

          {/* Map info tab */}
          {activeTab === 'map' && (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:20 }}>
              <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:14 }}>Live Tracking</h4>
              {[
                { icon:'🆘', label:'You (Patient)', loc:myLocation, color:'var(--teal)' },
                { icon:'🏍️', label:'Helper Vehicle', loc:helperLoc, color:'var(--amber)' },
                { icon:'🚑', label:'Ambulance', loc:ambulanceLoc, color:'var(--red)' },
              ].map(({ icon, label, loc, color }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span>{icon}</span>
                    <span style={{ fontSize:13, color }}>{label}</span>
                  </div>
                  {loc
                    ? <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--teal)' }}>📡 {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}</span>
                    : <span style={{ fontSize:11, color:'var(--text-muted)' }}>Not yet active</span>
                  }
                </div>
              ))}
              {!isOnline && (
                <div style={{ marginTop:12, padding:'10px 12px', borderRadius:8, background:'rgba(255,149,0,0.08)', border:'1px solid rgba(255,149,0,0.2)' }}>
                  <p style={{ fontSize:12, color:'var(--amber)' }}>📡 Offline — showing last known positions. Map tiles cached.</p>
                </div>
              )}
            </div>
          )}

          {/* Chat */}
          {activeTab === 'chat' && (
            <div style={{ background:'var(--navy-card)', borderRadius:16, border:'1px solid var(--border)', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Emergency Chat</h4>
              {!isOnline && <p style={{ fontSize:12, color:'var(--amber)', padding:'8px 12px', background:'rgba(255,149,0,0.08)', borderRadius:8 }}>Chat requires internet connection</p>}
              <div style={{ overflowY:'auto', maxHeight:200, display:'flex', flexDirection:'column', gap:8 }}>
                {messages.length === 0 && <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'20px 0' }}>No messages yet</p>}
                {messages.map((m, i) => (
                  <div key={i} style={{ padding:'8px 12px', borderRadius:8, background: m.from.role==='patient'?'rgba(0,229,204,0.1)':'var(--navy-light)', maxWidth:'85%', alignSelf: m.from.role==='patient'?'flex-end':'flex-start' }}>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{m.from.name}</p>
                    <p style={{ fontSize:14 }}>{m.message}</p>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                  placeholder={isOnline ? "Type message..." : "Offline — chat unavailable"}
                  disabled={!isOnline}
                  style={{ flex:1, padding:'10px 12px', background:'var(--navy-light)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14, opacity: isOnline?1:0.5 }} />
                <button onClick={sendChat} disabled={!isOnline} style={{ padding:'10px 16px', borderRadius:8, background:'var(--teal)', color:'var(--navy)', fontWeight:700, opacity: isOnline?1:0.5 }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
