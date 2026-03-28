const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const Emergency = require('../models/Emergency');
const User = require('../models/User');

// Patient: create emergency request
router.post('/request', protect, authorize('patient'), async (req, res) => {
  try {
    const { patientLocation, emergencyType, patientVitals } = req.body;
    const emergency = await Emergency.create({
      patient: req.user._id,
      patientLocation,
      emergencyType: emergencyType || 'general',
      patientVitals,
      timeline: [{ event: 'Emergency request created' }],
    });
    // Notify via socket (handled in socketHandler)
    res.status(201).json({ emergency });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active emergency for logged-in user
router.get('/active', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'patient') query = { patient: req.user._id, status: { $nin: ['completed', 'cancelled'] } };
    if (req.user.role === 'helper') query = { helper: req.user._id, status: { $nin: ['completed', 'cancelled'] } };
    if (req.user.role === 'ambulance') query = { ambulance: req.user._id, status: { $nin: ['completed', 'cancelled'] } };

    const emergency = await Emergency.findOne(query)
      .populate('patient', 'name phone currentLocation')
      .populate('helper', 'name phone currentLocation vehicleType')
      .populate('ambulance', 'name phone currentLocation vehicleType')
      .sort({ createdAt: -1 });

    res.json({ emergency });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all pending emergencies (for helper/ambulance to accept)
router.get('/pending', protect, authorize('helper', 'ambulance'), async (req, res) => {
  try {
    const field = req.user.role === 'helper' ? 'helper' : 'ambulance';
    const statusFilter = req.user.role === 'helper' ? 'pending' : 'helper_assigned';
    const emergencies = await Emergency.find({ [field]: null, status: statusFilter })
      .populate('patient', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ emergencies });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept emergency
router.patch('/:id/accept', protect, authorize('helper', 'ambulance'), async (req, res) => {
  try {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Emergency not found' });

    if (req.user.role === 'helper') {
      if (emergency.helper) return res.status(400).json({ message: 'Already assigned' });
      emergency.helper = req.user._id;
      emergency.status = 'helper_assigned';
      emergency.timeline.push({ event: `Helper ${req.user.name} assigned` });
    } else {
      if (emergency.ambulance) return res.status(400).json({ message: 'Already assigned' });
      emergency.ambulance = req.user._id;
      emergency.status = 'rendezvous';
      emergency.timeline.push({ event: `Ambulance ${req.user.name} assigned` });
    }

    await emergency.save();
    const populated = await emergency.populate(['patient', 'helper', 'ambulance']);
    res.json({ emergency: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update emergency status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status, rendezvousPoint, hospitalLocation, patientVitals } = req.body;
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Emergency not found' });

    emergency.status = status;
    if (rendezvousPoint) emergency.rendezvousPoint = rendezvousPoint;
    if (hospitalLocation) emergency.hospitalLocation = hospitalLocation;
    if (patientVitals) emergency.patientVitals = { ...emergency.patientVitals, ...patientVitals };
    if (status === 'completed') emergency.completedAt = new Date();
    emergency.timeline.push({ event: `Status updated to ${status}` });

    await emergency.save();
    res.json({ emergency });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get emergency history for a user
router.get('/history', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'patient') query.patient = req.user._id;
    if (req.user.role === 'helper') query.helper = req.user._id;
    if (req.user.role === 'ambulance') query.ambulance = req.user._id;
    query.status = 'completed';

    const history = await Emergency.find(query)
      .populate('patient', 'name phone')
      .populate('helper', 'name phone')
      .populate('ambulance', 'name phone')
      .sort({ completedAt: -1 })
      .limit(20);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
