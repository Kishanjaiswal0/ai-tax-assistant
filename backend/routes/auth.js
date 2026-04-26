// routes/auth.js - Authentication Routes (Signup / Login / Profile)
const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret_dev', { expiresIn: '7d' });

// ── POST /api/auth/signup ──────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'user', phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    if (await User.findOne({ email }))
      return res.status(409).json({ error: 'Email already registered.' });

    const user  = await User.create({ name, email, password, role, phone });
    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required.' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password.' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────
router.get('/me', auth, (req, res) => res.json({ user: req.user.toJSON() }));

// ── PUT /api/auth/profile ──────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, language, profile } = req.body;
    const user = await User.findById(req.userId);
    if (name)     user.name     = name;
    if (phone)    user.phone    = phone;
    if (language) user.language = language;
    if (profile)  user.profile  = { ...user.profile, ...profile };
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
