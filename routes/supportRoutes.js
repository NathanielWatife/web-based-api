const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/supportController');

// User
router.get('/my', protect, ctrl.getMyTickets);
router.get('/:id', protect, ctrl.getTicketById);

// Admin
router.get('/', protect, admin, ctrl.listTickets);
router.put('/:id/status', protect, admin, ctrl.updateStatus);
router.post('/:id/reply', protect, admin, ctrl.replyToTicket);

module.exports = router;
