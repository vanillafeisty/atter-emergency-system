const router = require('express').Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const Emergency = require('../models/Emergency');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { emergencyId, amount } = req.body;
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) return res.status(404).json({ message: 'Emergency not found' });

    const options = {
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `receipt_${emergencyId}`,
      notes: { emergencyId, patientId: req.user._id.toString() },
    };

    const order = await razorpay.orders.create(options);
    emergency.payment = { orderId: order.id, amount, status: 'pending', currency: 'INR' };
    await emergency.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify payment signature
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, emergencyId } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const emergency = await Emergency.findById(emergencyId);
    emergency.payment.paymentId = razorpay_payment_id;
    emergency.payment.status = 'paid';
    emergency.timeline.push({ event: 'Payment completed successfully' });
    await emergency.save();

    res.json({ message: 'Payment verified successfully', emergency });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
