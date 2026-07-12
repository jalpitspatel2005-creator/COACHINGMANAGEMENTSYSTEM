const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Verify JWT Token Middleware
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if account is active
    if (req.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is not active. Please contact administrator.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    
    // Log failed authentication attempt
    await AuditLog.create({
      action: 'AUTH_FAILED',
      entity: 'user',
      status: 'failed',
      errorMessage: error.message,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Special Admin-only middleware for super admin routes
const adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only admin can access this route'
    });
  }
  
  // Additional check: Verify this is the hardcoded super admin
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super admin only.'
    });
  }
  
  next();
};

module.exports = {
  generateToken,
  protect,
  authorize,
  adminOnly
};