// models/Consultation.js - CA Consultation Requests
const mongoose = require('mongoose');

const msgSchema = new mongoose.Schema({
  senderId   : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName : String,
  senderRole : { type: String, enum: ['user','ca'] },
  content    : { type: String, required: true },
  timestamp  : { type: Date, default: Date.now }
});

const consultationSchema = new mongoose.Schema({
  userId      : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caId        : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caProfileId : { type: mongoose.Schema.Types.ObjectId, ref: 'CAProfile', required: true },
  userName    : String,
  caName      : String,

  status      : {
    type    : String,
    enum    : ['pending','accepted','rejected','completed'],
    default : 'pending'
  },
  topic         : { type: String, required: true },
  description   : String,
  preferredDate : Date,
  preferredTime : String,
  income        : Number,
  complexity    : { type: String, enum: ['simple','moderate','complex'] },

  messages : [msgSchema],
  notes    : String,
  fee      : Number
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);
