// models/ChatHistory.js - Stores user chat sessions
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role      : { type: String, enum: ['user','assistant'], required: true },
  content   : { type: String, required: true },
  timestamp : { type: Date, default: Date.now }
});

const chatHistorySchema = new mongoose.Schema({
  userId    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId : { type: String, required: true, index: true },
  title     : { type: String, default: 'Tax Consultation' },
  messages  : [messageSchema],
  taxContext: {              // stores extracted tax info from conversation
    income     : Number,
    deductions : Number,
    age        : String,
    regime     : String
  }
}, { timestamps: true });

// Compound index for fast user+session lookup
chatHistorySchema.index({ userId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
