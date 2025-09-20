const express = require('express');
const { approvePayment, getAllPayments, editPaymentDuration } = require('../controllers/approvalController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Approve Payment (Requires 'financial' role)
router.post('/approve', authMiddleware, approvePayment);

// ✅ Get All Payments (Requires 'financial' role)
router.get('/payments', authMiddleware, getAllPayments);

// ✅ Edit Payment Duration (Requires 'financial' role)
router.put('/payment/edit', authMiddleware, editPaymentDuration);

module.exports = router;
