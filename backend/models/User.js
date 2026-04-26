// models/User.js - User Schema
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name     : { type: String, required: true, trim: true },
  email    : { type: String, required: true, unique: true, lowercase: true, trim: true },
  password : { type: String, required: true, minlength: 6 },
  role     : { type: String, enum: ['user','ca'], default: 'user' },
  phone    : { type: String, trim: true },
  language : { type: String, enum: ['en','hi'], default: 'en' },

  // Financial quick-profile (for users)
  profile: {
    annualIncome    : Number,
    ageGroup        : { type: String, enum: ['below60','60to80','above80'] },
    employmentType  : { type: String, enum: ['salaried','business','freelance','retired'] },
    preferredRegime : { type: String, enum: ['old','new','undecided'], default: 'undecided' }
  },

  createdAt : { type: Date, default: Date.now },
  lastLogin : Date
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
