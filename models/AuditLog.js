const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userEmail: String,
  userRole: String,
  
  // Action Details
  action: {
    type: String,
    required: true
  },
  entity: {
    type: String,
    enum: ['user', 'session', 'category', 'system', 'payment']
  },
  entityId: mongoose.Schema.Types.ObjectId,
  
  // Changes
  beforeState: mongoose.Schema.Types.Mixed,
  afterState: mongoose.Schema.Types.Mixed,
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  
  // Location
  location: {
    country: String,
    city: String,
    region: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  
  // Error Info (if failed)
  errorMessage: String,
  errorStack: String,
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Performance
  responseTime: Number,
  requestSize: Number
});

// Compound indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;