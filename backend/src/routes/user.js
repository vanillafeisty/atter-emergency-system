const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Update location
router.patch('/location', protect, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      'currentLocation.lat': lat,
      'currentLocation.lng': lng,
      'currentLocation.updatedAt': new Date(),
    });
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get available helpers/ambulances
router.get('/available/:role', protect, async (req, res) => {
  try {
    const { role } = req.params;
    if (!['helper', 'ambulance'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const users = await User.find({ role, isAvailable: true }).select('-password');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle availability
router.patch('/availability', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isAvailable: req.body.isAvailable },
      { new: true }
    ).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
