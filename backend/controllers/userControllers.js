const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const jwtExpiry = '1d';

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: jwtExpiry });
}

async function registerUser(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });

    return res.status(201).json({
      message: 'User registered successfully',
      token: signToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        voted: user.voted,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    return res.status(200).json({
      message: 'Login successful',
      token: signToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        voted: user.voted,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function vote(req, res) {
  try {
    const { nullifierHash, voteCommitment, txHash } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.voted) {
      return res.status(400).json({ error: 'You have already voted' });
    }

    user.voted = true;
    user.lastNullifier = nullifierHash;
    user.lastCommitment = voteCommitment;
    user.lastVoteTxHash = txHash;
    await user.save();

    return res.status(200).json({
      message: 'Vote recorded successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        voted: user.voted,
        lastVoteTxHash: user.lastVoteTxHash,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { registerUser, loginUser, getProfile, vote };
