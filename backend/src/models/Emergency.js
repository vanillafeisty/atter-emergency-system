const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  helper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['pending', 'helper_assigned', 'helper_en_route', 'patient_picked', 'rendezvous', 'ambulance_en_route', 'hospital_reached', 'completed', 'cancelled'],
    default: 'pending',
  },
  patientLocation: { lat: Number, lng: Number, address: String },
  helperLocation: { lat: Number, lng: Number },
  ambulanceLocation: { lat: Number, lng: Number },
  rendezvousPoint: { lat: Number, lng: Number },
  hospitalLocation: { lat: Number, lng: Number, name: String },
  patientVitals: {
    heartRate: Number,
    spo2: Number,
    bloodPressure: String,
    notes: String,
  },
  emergencyType: { type: String, default: 'general' },
  payment: {
    orderId: String,
    paymentId: String,
    amount: Number,
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    currency: { type: String, default: 'INR' },
  },
  timeline: [{ event: String, timestamp: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

module.exports = mongoose.model('Emergency', emergencySchema);
