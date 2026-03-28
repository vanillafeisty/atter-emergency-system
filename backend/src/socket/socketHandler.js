const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Emergency = require('../models/Emergency');

// Store socket-to-user mappings
const connectedUsers = new Map(); // userId -> socketId
const socketToUser = new Map();   // socketId -> userId

const initSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    connectedUsers.set(userId, socket.id);
    socketToUser.set(socket.id, userId);

    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

    // Join personal room
    socket.join(`user_${userId}`);
    socket.join(`role_${socket.user.role}`);

    // Broadcast location update to emergency participants
    socket.on('location:update', async (data) => {
      try {
        const { lat, lng, emergencyId } = data;

        // Update DB
        await User.findByIdAndUpdate(userId, {
          'currentLocation.lat': lat,
          'currentLocation.lng': lng,
          'currentLocation.updatedAt': new Date(),
        });

        if (!emergencyId) return;

        const emergency = await Emergency.findById(emergencyId);
        if (!emergency) return;

        // Determine who to notify
        const participants = [
          emergency.patient?.toString(),
          emergency.helper?.toString(),
          emergency.ambulance?.toString(),
        ].filter(Boolean).filter(id => id !== userId);

        const payload = {
          userId,
          role: socket.user.role,
          name: socket.user.name,
          lat,
          lng,
          emergencyId,
          timestamp: new Date(),
        };

        participants.forEach(pid => {
          const targetSocketId = connectedUsers.get(pid);
          if (targetSocketId) {
            io.to(targetSocketId).emit('location:received', payload);
          }
        });

        // Also update emergency location fields
        if (socket.user.role === 'helper') {
          await Emergency.findByIdAndUpdate(emergencyId, { helperLocation: { lat, lng } });
        } else if (socket.user.role === 'ambulance') {
          await Emergency.findByIdAndUpdate(emergencyId, { ambulanceLocation: { lat, lng } });
        }
      } catch (err) {
        console.error('Location update error:', err.message);
      }
    });

    // New emergency broadcast to all helpers
    socket.on('emergency:new', async (data) => {
      io.to('role_helper').emit('emergency:alert', data);
    });

    // Helper accepted — notify ambulances
    socket.on('emergency:helper_accepted', async (data) => {
      io.to('role_ambulance').emit('emergency:alert', data);
      // Notify patient
      const emergency = await Emergency.findById(data.emergencyId).populate('patient');
      if (emergency?.patient) {
        const pid = emergency.patient._id.toString();
        const psid = connectedUsers.get(pid);
        if (psid) io.to(psid).emit('emergency:status_update', { status: 'helper_assigned', emergency: data });
      }
    });

    // Status update broadcast
    socket.on('emergency:status_change', async ({ emergencyId, status }) => {
      try {
        const emergency = await Emergency.findById(emergencyId);
        if (!emergency) return;
        const participants = [
          emergency.patient?.toString(),
          emergency.helper?.toString(),
          emergency.ambulance?.toString(),
        ].filter(Boolean);

        participants.forEach(pid => {
          const sid = connectedUsers.get(pid);
          if (sid) io.to(sid).emit('emergency:status_update', { status, emergencyId });
        });
      } catch (err) {
        console.error('Status change error:', err.message);
      }
    });

    // Vitals update from helper → ambulance + hospital
    socket.on('vitals:update', async ({ emergencyId, vitals }) => {
      try {
        const emergency = await Emergency.findById(emergencyId);
        if (!emergency) return;
        await Emergency.findByIdAndUpdate(emergencyId, { patientVitals: vitals });
        const ambId = emergency.ambulance?.toString();
        if (ambId) {
          const sid = connectedUsers.get(ambId);
          if (sid) io.to(sid).emit('vitals:received', { emergencyId, vitals });
        }
      } catch (err) {
        console.error('Vitals update error:', err.message);
      }
    });

    // Chat message between participants
    socket.on('chat:message', async ({ emergencyId, message }) => {
      try {
        const emergency = await Emergency.findById(emergencyId);
        if (!emergency) return;
        const participants = [
          emergency.patient?.toString(),
          emergency.helper?.toString(),
          emergency.ambulance?.toString(),
        ].filter(Boolean);

        const payload = {
          from: { id: userId, name: socket.user.name, role: socket.user.role },
          message,
          timestamp: new Date(),
        };

        participants.forEach(pid => {
          const sid = connectedUsers.get(pid);
          if (sid) io.to(sid).emit('chat:message', payload);
        });
      } catch (err) {
        console.error('Chat error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      socketToUser.delete(socket.id);
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });
};

module.exports = { initSocket, connectedUsers };
