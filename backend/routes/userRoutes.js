const express = require('express');
const {
  registerUser,
  loginUser,
  getProfile,
  vote,
} = require('../controllers/userControllers');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getProfile);
router.post('/vote', protect, vote);

module.exports = router;
