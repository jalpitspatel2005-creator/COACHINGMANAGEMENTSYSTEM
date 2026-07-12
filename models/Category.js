const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  icon: String,
  color: {
    type: String,
    default: '#3B82F6'
  },
  
  // Pricing
  basePrice: Number,
  minDuration: {
    type: Number,
    default: 30
  },
  maxDuration: {
    type: Number,
    default: 120
  },
  
  // Requirements
  requiredDocuments: [String],
  qualifications: [String],
  
  // Statistics
  totalCoaches: {
    type: Number,
    default: 0
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // System
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;