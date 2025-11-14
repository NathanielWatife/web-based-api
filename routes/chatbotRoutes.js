const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { handleMessage } = require('../controllers/chatbotController');

router.post('/message', protect, handleMessage);

module.exports = router;
