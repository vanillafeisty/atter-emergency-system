// IndexedDB wrapper for offline emergency queuing and location caching

const DB_NAME = 'atter_offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('emergency_queue')) {
        db.createObjectStore('emergency_queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('location_cache')) {
        db.createObjectStore('location_cache', { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains('user_cache')) {
        db.createObjectStore('user_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('emergency_cache')) {
        db.createObjectStore('emergency_cache', { keyPath: '_id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueEmergency(data, token) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency_queue', 'readwrite');
    const req = tx.objectStore('emergency_queue').add({
      data,
      token,
      timestamp: new Date().toISOString(),
      synced: false,
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedEmergencies() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency_queue', 'readonly');
    const req = tx.objectStore('emergency_queue').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearQueuedEmergency(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency_queue', 'readwrite');
    const req = tx.objectStore('emergency_queue').delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

export async function cacheLocation(userId, lat, lng) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('location_cache', 'readwrite');
    const req = tx.objectStore('location_cache').put({ userId, lat, lng, updatedAt: new Date().toISOString() });
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedLocation(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('location_cache', 'readonly');
    const req = tx.objectStore('location_cache').get(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheEmergency(emergency) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency_cache', 'readwrite');
    const req = tx.objectStore('emergency_cache').put(emergency);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedEmergency(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency_cache', 'readonly');
    const req = tx.objectStore('emergency_cache').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheUser(user) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('user_cache', 'readwrite');
    const req = tx.objectStore('user_cache').put(user);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedUser(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('user_cache', 'readonly');
    const req = tx.objectStore('user_cache').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
