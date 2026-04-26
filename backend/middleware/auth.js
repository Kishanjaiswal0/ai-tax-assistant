// middleware/auth.js - JWT Authentication + Role Guard
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user to req
const auth = async (req, res, next) => {
  try {
    const header = req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    const token   = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_dev');
    const user    = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'Token invalid. User not found.' });

    req.user   = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Only CA users allowed
const caOnly = (req, res, next) => {
  if (req.user?.role !== 'ca') {
    return res.status(403).json({ error: 'Forbidden. CA access only.' });
  }
  next();
};

// Only regular users allowed
const userOnly = (req, res, next) => {
  if (req.user?.role !== 'user') {
    return res.status(403).json({ error: 'Forbidden. User access only.' });
  }
  next();
};

module.exports = { auth, caOnly, userOnly };
