const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');

// All routes protected
router.use(protect);
router.use(authorize('admin'));

// Dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
    try {
        const totalCoaches = await User.countDocuments({ role: 'coach', status: 'active' });
        const totalStudents = await User.countDocuments({ role: 'student', status: 'active' });
        const pendingStudents = await User.countDocuments({ role: 'student', status: 'pending' });
        const totalSessions = await Session.countDocuments();
        const completedSessions = await Session.countDocuments({ status: 'completed' });
        
        // Recent activities
        const recentLogs = await AuditLog.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('user', 'firstName lastName email');
        
        res.json({
            success: true,
            data: {
                totals: { totalCoaches, totalStudents, pendingStudents, totalSessions, completedSessions },
                recentLogs
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Coach Management
router.post('/coaches', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, specialization, experience, hourlyRate, bio } = req.body;
        
        // Check if coach exists
        const existingCoach = await User.findOne({ email });
        if (existingCoach) {
            return res.status(400).json({
                success: false,
                error: 'Coach with this email already exists'
            });
        }
        
        // Create coach
        const coach = await User.create({
            firstName,
            lastName,
            email,
            password,
            phone,
            role: 'coach',
            status: 'active',
            specialization,
            experience: parseInt(experience) || 0,
            hourlyRate: parseFloat(hourlyRate) || 0,
            bio
        });
        
        // Log the action
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'CREATE_COACH',
            entity: 'user',
            entityId: coach._id,
            afterState: coach.toObject(),
            status: 'success',
            ipAddress: req.ip
        });
        
        res.status(201).json({
            success: true,
            message: 'Coach created successfully',
            data: coach
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all coaches
router.get('/coaches', async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = { role: 'coach' };
        
        if (status) query.status = status;
        
        const coaches = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            data: coaches,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle coach status
router.put('/coaches/:id/toggle-status', async (req, res) => {
    try {
        const coach = await User.findById(req.params.id);
        
        if (!coach || coach.role !== 'coach') {
            return res.status(404).json({ success: false, error: 'Coach not found' });
        }
        
        const newStatus = coach.status === 'active' ? 'inactive' : 'active';
        coach.status = newStatus;
        await coach.save();
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'TOGGLE_COACH_STATUS',
            entity: 'user',
            entityId: coach._id,
            afterState: { status: newStatus },
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: `Coach ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
            data: coach
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single coach
router.get('/coaches/:id', async (req, res) => {
    try {
        const coach = await User.findById(req.params.id).select('-password');
        if (!coach || coach.role !== 'coach') {
            return res.status(404).json({ success: false, error: 'Coach not found' });
        }
        res.json({ success: true, data: coach });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update coach
router.put('/coaches/:id', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, specialization, experience, hourlyRate, bio } = req.body;
        
        const coach = await User.findById(req.params.id);
        if (!coach || coach.role !== 'coach') {
            return res.status(404).json({ success: false, error: 'Coach not found' });
        }
        
        const beforeState = coach.toObject();
        
        coach.firstName = firstName || coach.firstName;
        coach.lastName = lastName || coach.lastName;
        coach.email = email || coach.email;
        coach.phone = phone || coach.phone;
        coach.specialization = specialization || coach.specialization;
        coach.experience = parseInt(experience) || coach.experience;
        coach.hourlyRate = parseFloat(hourlyRate) || coach.hourlyRate;
        coach.bio = bio || coach.bio;
        
        await coach.save();
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'UPDATE_COACH',
            entity: 'user',
            entityId: coach._id,
            beforeState,
            afterState: coach.toObject(),
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Coach updated successfully',
            data: coach
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Student Management
router.get('/students/pending', async (req, res) => {
    try {
        const pendingStudents = await User.find({ 
            role: 'student', 
            status: 'pending' 
        }).select('-password');
        
        res.json({ success: true, data: pendingStudents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/students', async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = { role: 'student' };
        
        if (status) query.status = status;
        
        const students = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            data: students,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/students/:id/approve', async (req, res) => {
    try {
        const student = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        ).select('-password');
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'APPROVE_STUDENT',
            entity: 'user',
            entityId: student._id,
            afterState: { status: 'active' },
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Student approved successfully',
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/students/:id/reject', async (req, res) => {
    try {
        const student = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'suspended' },
            { new: true }
        ).select('-password');
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'REJECT_STUDENT',
            entity: 'user',
            entityId: student._id,
            afterState: { status: 'suspended' },
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Student rejected successfully',
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/students/:id/suspend', async (req, res) => {
    try {
        const student = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'suspended' },
            { new: true }
        ).select('-password');
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'SUSPEND_STUDENT',
            entity: 'user',
            entityId: student._id,
            afterState: { status: 'suspended' },
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Student suspended successfully',
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/students/:id/activate', async (req, res) => {
    try {
        const student = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        ).select('-password');
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ACTIVATE_STUDENT',
            entity: 'user',
            entityId: student._id,
            afterState: { status: 'active' },
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Student activated successfully',
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/students/:id', async (req, res) => {
    try {
        const student = await User.findByIdAndDelete(req.params.id);
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'DELETE_STUDENT',
            entity: 'user',
            entityId: student._id,
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// User Actions
router.post('/users/:id/force-logout', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'FORCE_LOGOUT',
            entity: 'user',
            entityId: user._id,
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: `User ${user.email} has been logged out from all devices`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'New password is required' 
            });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        user.password = newPassword;
        await user.save();
        
        await AuditLog.create({
            user: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'RESET_PASSWORD',
            entity: 'user',
            entityId: user._id,
            status: 'success',
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// System Monitoring
router.get('/audit-logs', async (req, res) => {
    try {
        const { page = 1, limit = 20, action, startDate, endDate } = req.query;
        const query = {};
        
        if (action) query.action = action;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }
        
        const logs = await AuditLog.find(query)
            .populate('user', 'firstName lastName email role')
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await AuditLog.countDocuments(query);
        
        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Category Management
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/categories', async (req, res) => {
    try {
        const { name, description, basePrice, icon } = req.body;
        
        const category = await Category.create({
            name,
            description,
            basePrice,
            icon,
            createdBy: req.user._id
        });
        
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;