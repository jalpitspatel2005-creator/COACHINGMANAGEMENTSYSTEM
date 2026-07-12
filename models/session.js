const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  
  // Participants
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Scheduling
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: Number, // in minutes
  
  // Session Details
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  type: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual'
  },
  maxParticipants: {
    type: Number,
    default: 1
  },
  currentParticipants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  
  // Location/Platform
  platform: {
    type: String,
    enum: ['zoom', 'google_meet', 'microsoft_teams', 'in_person'],
    default: 'zoom'
  },
  meetingLink: String,
  location: String,
  
  // Resources
  materials: [{
    name: String,
    fileUrl: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: Date
  }],
  
  // Recording
  recordingUrl: String,
  
  // Progress Tracking
  attendance: {
    type: Boolean,
    default: false
  },
  progressNotes: String,
  rating: Number,
  feedback: String,
  
  // Financial
  price: Number,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  
  // System
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String
});

// Indexes
sessionSchema.index({ coach: 1, date: 1 });
sessionSchema.index({ student: 1, status: 1 });
sessionSchema.index({ date: 1, status: 1 });

// Virtual for checking if session is in past
sessionSchema.virtual('isPast').get(function() {
  return new Date(this.date) < new Date();
});

// Virtual for checking if session can be cancelled
sessionSchema.virtual('canCancel').get(function() {
  const sessionDate = new Date(this.date);
  const now = new Date();
  const hoursDiff = (sessionDate - now) / (1000 * 60 * 60);
  return hoursDiff > 24; // Can cancel if more than 24 hours before
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;