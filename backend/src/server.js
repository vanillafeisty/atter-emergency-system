const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const emergencyRoutes = require('./routes/emergency');
const paymentRoutes = require('./routes/payment');
const userRoutes = require('./routes/user');
const { initSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'ATTER API is running', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);

initSocket(io);

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI is not set');
  process.exit(1);
}

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 }).then(function() {
  console.log('MongoDB connected successfully');
  var PORT = parseInt(process.env.PORT) || 5000;
  server.listen(PORT, '0.0.0.0', function() {
    console.log('ATTER Server running on port ' + PORT);
  });
}).catch(function(err) {
  console.error('MongoDB connection error: ' + err.message);
  var PORT = parseInt(process.env.PORT) || 5000;
  server.listen(PORT, '0.0.0.0', function() {
    console.log('Server on port ' + PORT + ' DB failed');
    process.exit(1);
  });
});

module.exports = { app: app, io: io };
