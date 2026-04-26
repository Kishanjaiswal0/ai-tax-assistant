// ============================================================
// AI Tax Filing Assistant - Main Server (server.js)
// Node.js + Express + MongoDB Atlas
// ============================================================
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

// Route imports
const authRoutes         = require('./routes/auth');
const chatRoutes         = require('./routes/chat');
const taxRoutes          = require('./routes/tax');
const caRoutes           = require('./routes/ca');
const consultationRoutes = require('./routes/consultation');
const documentRoutes     = require('./routes/documents');

const app = express();

// ─── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs : 15 * 60 * 1000, // 15 minutes
  max      : 200,
  message  : { error: 'Too many requests, please try again later.' }
});

const chatLimiter = rateLimit({
  windowMs : 1 * 60 * 1000, // 1 minute
  max      : 30,
  message  : { error: 'Chat rate limit exceeded.' }
});

// ─── Global Middleware ────────────────────────────────────────
app.use(cors({
  origin      : process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials : true,
  methods     : ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', limiter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── MongoDB Atlas Connection ─────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅  MongoDB Atlas connected successfully');
    await seedSampleData(); // Seed sample CA data on first run
  } catch (err) {
    console.error('⚠️  MongoDB connection failed:', err.message);
    console.log('📌  Running in offline mode (auth/DB features disabled)');
  }
};
connectDB();

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/chat',          chatLimiter, chatRoutes);
app.use('/api/tax',           taxRoutes);
app.use('/api/ca',            caRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/documents',     documentRoutes);

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status    : 'ok',
    app       : 'AI Tax Filing Assistant',
    version   : '1.0.0',
    db        : mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ai        : process.env.HUGGINGFACE_API_KEY ? 'HuggingFace' :
                process.env.OLLAMA_URL          ? 'Ollama'       : 'Rule-based',
    timestamp : new Date().toISOString()
  });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error   : err.message || 'Internal server error',
    success : false
  });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ─── Seed Sample CA Data ──────────────────────────────────────
const seedSampleData = async () => {
  try {
    const CAProfile = require('./models/CAProfile');
    const count = await CAProfile.countDocuments();
    if (count === 0) {
      const User = require('./models/User');
      const bcrypt = require('bcryptjs');

      // Create sample CA users
      const caUsers = [
        { name: 'CA Rajesh Kumar',  email: 'rajesh.ca@example.com',  role: 'ca', password: 'password123' },
        { name: 'CA Priya Sharma',  email: 'priya.ca@example.com',   role: 'ca', password: 'password123' },
        { name: 'CA Amit Patel',    email: 'amit.ca@example.com',    role: 'ca', password: 'password123' },
        { name: 'CA Sneha Reddy',   email: 'sneha.ca@example.com',   role: 'ca', password: 'password123' },
      ];

      const caProfiles = [
        {
          name: 'CA Rajesh Kumar', email: 'rajesh.ca@example.com', phone: '+91-9876543210',
          registrationNumber: 'FCA/123456', experience: 12, city: 'Mumbai', state: 'Maharashtra',
          specializations: ['ITR Filing','Tax Planning','GST','Corporate Tax'],
          about: 'Senior CA with 12+ years specializing in individual and corporate tax planning. Former Big4 employee.',
          languages: ['English','Hindi','Marathi'], consultationFee: 2000,
          rating: 4.8, totalConsultations: 450, isAvailable: true, verified: true
        },
        {
          name: 'CA Priya Sharma', email: 'priya.ca@example.com', phone: '+91-9765432109',
          registrationNumber: 'FCA/789012', experience: 8, city: 'Delhi', state: 'Delhi',
          specializations: ['International Taxation','Startup Taxation','ITR Filing','Investment Advisory'],
          about: 'Specialist in NRI taxation, FEMA compliance and startup equity structures.',
          languages: ['English','Hindi'], consultationFee: 3000,
          rating: 4.9, totalConsultations: 280, isAvailable: true, verified: true
        },
        {
          name: 'CA Amit Patel', email: 'amit.ca@example.com', phone: '+91-9654321098',
          registrationNumber: 'FCA/345678', experience: 15, city: 'Ahmedabad', state: 'Gujarat',
          specializations: ['Corporate Tax','Audit','GST','International Taxation'],
          about: 'Expert in corporate taxation and statutory audits with Big4 background.',
          languages: ['English','Hindi','Gujarati'], consultationFee: 2500,
          rating: 4.7, totalConsultations: 620, isAvailable: true, verified: true
        },
        {
          name: 'CA Sneha Reddy', email: 'sneha.ca@example.com', phone: '+91-9543210987',
          registrationNumber: 'ACA/901234', experience: 5, city: 'Hyderabad', state: 'Telangana',
          specializations: ['Investment Advisory','Tax Planning','ITR Filing'],
          about: 'Young, tech-savvy CA focused on investment-linked tax planning for millennials.',
          languages: ['English','Hindi','Telugu'], consultationFee: 1500,
          rating: 4.6, totalConsultations: 180, isAvailable: true, verified: false
        }
      ];

      for (let i = 0; i < caUsers.length; i++) {
        const existing = await User.findOne({ email: caUsers[i].email });
        let user;
        if (!existing) {
          user = new User(caUsers[i]);
          await user.save();
        } else {
          user = existing;
        }
        const existingProfile = await CAProfile.findOne({ userId: user._id });
        if (!existingProfile) {
          await CAProfile.create({ ...caProfiles[i], userId: user._id });
        }
      }
      console.log('✅  Sample CA data seeded');
    }
  } catch (err) {
    console.log('Seed skipped:', err.message);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀  AI Tax Assistant API running on port ${PORT}`);
  console.log(`🌐  CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🤖  AI Mode: ${process.env.HUGGINGFACE_API_KEY ? 'HuggingFace' : process.env.OLLAMA_URL ? 'Ollama' : 'Rule-based fallback'}`);
});
