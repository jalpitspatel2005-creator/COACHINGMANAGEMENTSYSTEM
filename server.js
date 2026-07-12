const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // ← CRITICAL: ADD THIS
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');

// Import middleware
const { protect, authorize } = require('./middleware/auth');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.FRONTEND_URL,
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Static files
app.use(express.static('../public'));

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected');
    
    // Initialize super admin
    await initializeSuperAdmin();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize Super Admin (Hardcoded as per requirements)
const initializeSuperAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ 
      email: process.env.ADMIN_EMAIL,
      role: 'admin' 
    });
    
    if (!adminExists) {
      // Generate hash for admin password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Update .env file with the hash (for first run)
      if (process.env.ADMIN_PASSWORD_HASH === '$2a$10$YourBcryptHashHereWillBeGeneratedBelow') {
        console.log('⚠️ Please update ADMIN_PASSWORD_HASH in .env with:', hashedPassword);
      }
      
      // Create super admin
      const superAdmin = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        phone: '+1234567890',
        bio: 'System Administrator'
      });
      
      await superAdmin.save();
      console.log('✅ Super Admin created successfully');
      
      // Log the creation
      await AuditLog.create({
        action: 'SYSTEM_INIT',
        entity: 'user',
        entityId: superAdmin._id,
        afterState: { role: 'admin', status: 'active' },
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'System'
      });
    } else {
      console.log('✅ Super Admin already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing super admin:', error);
  }
};

// WebSocket for real-time features
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  // Join room based on user role
  socket.on('join-room', (userId, role) => {
    socket.join(`${role}-${userId}`);
    console.log(`User ${userId} (${role}) joined their room`);
  });
  
  // Handle chat messages
  socket.on('send-message', async (data) => {
    const { senderId, receiverId, message, sessionId } = data;
    
    // Broadcast to receiver's room
    socket.to(`user-${receiverId}`).emit('receive-message', {
      senderId,
      message,
      timestamp: new Date(),
      sessionId
    });
    
    // Save to database (implement Chat model later)
    // await Chat.create({ senderId, receiverId, message, sessionId });
  });
  
  // Handle notifications
  socket.on('send-notification', (data) => {
    const { userId, type, message } = data;
    socket.to(`user-${userId}`).emit('new-notification', {
      type,
      message,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Coachify API is running',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Authentication endpoint (special handling for super admin)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }
    
    // SPECIAL CASE: Hardcoded super admin login
    if (email === process.env.ADMIN_EMAIL) {
      // Verify password (compare with hash from env)
      const isValidPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
      
      if (!isValidPassword) {
        // Log failed attempt
        await AuditLog.create({
          action: 'LOGIN_FAILED',
          entity: 'user',
          status: 'failed',
          errorMessage: 'Invalid password for admin',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      // Get or create admin user
      let adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });
      
      if (!adminUser) {
        // This shouldn't happen if initialization worked, but just in case
        adminUser = await User.create({
          firstName: 'Super',
          lastName: 'Admin',
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD_HASH,
          role: 'admin',
          status: 'active'
        });
      }
      
      // Update last login
      adminUser.lastLogin = new Date();
      await adminUser.save();
      
      // Generate token using jwt (FIXED)
      const token = jwt.sign(
        { id: adminUser._id, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );
      
      // Log successful login
      await AuditLog.create({
        user: adminUser._id,
        userEmail: adminUser.email,
        userRole: adminUser.role,
        action: 'LOGIN_SUCCESS',
        entity: 'user',
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.json({
        success: true,
        token,
        user: {
          id: adminUser._id,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          email: adminUser.email,
          role: adminUser.role,
          avatar: adminUser.avatar
        }
      });
    }
    
    // Regular user login (coaches and students)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(403).json({
        success: false,
        error: 'Account is locked. Please contact administrator.'
      });
    }
    
    // Check if student is approved
    if (user.role === 'student' && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending approval by administrator.'
      });
    }
    
    // Check if coach is active
    if (user.role === 'coach' && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your coach account is not active.'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await user.save();
      
      // Log failed attempt
      await AuditLog.create({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        entity: 'user',
        status: 'failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    // Log successful login
    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      entity: 'user',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

// Student registration endpoint
app.post('/api/auth/register/student', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Create student (status will be 'pending' by default from schema)
    const student = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: 'student',
      status: 'pending' // Requires admin approval
    });
    
    // Log registration
    await AuditLog.create({
      user: student._id,
      userEmail: student.email,
      userRole: student.role,
      action: 'REGISTER_STUDENT',
      entity: 'user',
      afterState: { status: 'pending' },
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
      data: {
        id: student._id,
        email: student.email,
        status: student.status
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
});

// Import routes
const adminRoutes = require('./routes/admin');
const coachRoutes = require('./routes/coach');
const studentRoutes = require('./routes/student');

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/student', studentRoutes);

// Protected test routes
app.get('/api/admin/test', protect, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to admin protected route',
    user: req.user
  });
});

app.get('/api/coach/test', protect, authorize('coach'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to coach protected route',
    user: req.user
  });
});

app.get('/api/student/test', protect, authorize('student'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to student protected route',
    user: req.user
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 MongoDB: ${process.env.MONGODB_URI}`);
    console.log(`👑 Super Admin: ${process.env.ADMIN_EMAIL}`);
  });
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});