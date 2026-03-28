import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (color, emoji) => L.divIcon({
  className: '',
  html: `<div style="
    width:40px;height:40px;border-radius:50%;
    background:${color};border:3px solid white;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;box-shadow:0 0 16px ${color}88;
    animation:pulse 2s infinite;
  ">${emoji}</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const patientIcon = createIcon('#00E5CC', '🆘');
const helperIcon  = createIcon('#FF9500', '🏍️');
const ambIcon     = createIcon('#FF2D55', '🚑');
const rendevIcon  = createIcon('#a855f7', '📍');

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, map.getZoom(), { duration: 1.2 }); }, [center, map]);
  return null;
}

export default function LiveMap({ patientLoc, helperLoc, ambulanceLoc, rendezvousLoc, myRole, center }) {
  const defaultCenter = center || patientLoc || helperLoc || [20.2961, 85.8245]; // Bhubaneswar

  const routePoints = [];
  if (helperLoc && patientLoc) routePoints.push([[helperLoc.lat, helperLoc.lng],[patientLoc.lat, patientLoc.lng]]);
  if (ambulanceLoc && rendezvousLoc) routePoints.push([[ambulanceLoc.lat, ambulanceLoc.lng],[rendezvousLoc.lat, rendezvousLoc.lng]]);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
      <MapContainer
        center={[defaultCenter.lat || defaultCenter[0], defaultCenter.lng || defaultCenter[1]]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        {center && <FlyTo center={[center.lat || center[0], center.lng || center[1]]} />}

        {patientLoc?.lat && (
          <Marker position={[patientLoc.lat, patientLoc.lng]} icon={patientIcon}>
            <Popup><b>🆘 Patient</b><br/>Lat: {patientLoc.lat.toFixed(5)}<br/>Lng: {patientLoc.lng.toFixed(5)}</Popup>
          </Marker>
        )}
        {helperLoc?.lat && (
          <Marker position={[helperLoc.lat, helperLoc.lng]} icon={helperIcon}>
            <Popup><b>🏍️ Helper Vehicle</b><br/>En route to patient</Popup>
          </Marker>
        )}
        {ambulanceLoc?.lat && (
          <Marker position={[ambulanceLoc.lat, ambulanceLoc.lng]} icon={ambIcon}>
            <Popup><b>🚑 Ambulance</b><br/>En route to rendezvous</Popup>
          </Marker>
        )}
        {rendezvousLoc?.lat && (
          <Marker position={[rendezvousLoc.lat, rendezvousLoc.lng]} icon={rendevIcon}>
            <Popup><b>📍 Rendezvous Point</b><br/>Meet here for handover</Popup>
          </Marker>
        )}
        {routePoints.map((pts, i) => (
          <Polyline key={i} positions={pts}
            color={i === 0 ? '#FF9500' : '#FF2D55'}
            weight={3} dashArray="8 6" opacity={0.8}
          />
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        background: 'rgba(10,15,30,0.88)', backdropFilter: 'blur(12px)',
        borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {[['🆘','Patient','#00E5CC'],['🏍️','Helper Vehicle','#FF9500'],['🚑','Ambulance','#FF2D55'],['📍','Rendezvous','#a855f7']].map(([e,l,c]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>{e}</span>
            <span style={{ fontSize:11, color:c, fontFamily:'var(--font-mono)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
