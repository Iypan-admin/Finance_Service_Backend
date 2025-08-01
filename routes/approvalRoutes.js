const express = require('express');
const { approvePayment, getAllTransactions, editTransaction } = require('../controllers/approvalController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Approve Payment (Requires 'financial' role)
router.post('/approve', authMiddleware, approvePayment);

// ✅ Get All Transactions (Requires 'financial' role)
router.get('/transactions', authMiddleware, getAllTransactions);

// ✅ Edit Transaction Duration (Requires 'financial' role)
router.put('/transaction/edit', authMiddleware, editTransaction);

module.exports = router;
