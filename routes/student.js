const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');
const Category = require('../models/Category');

// All routes protected for students only
router.use(protect);
router.use(authorize('student'));

// Check if student is approved
router.use((req, res, next) => {
    if (req.user.status !== 'active') {
        return res.status(403).json({
            success: false,
            error: 'Your account is pending approval by administrator'
        });
    }
    next();
});

// Student dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const upcomingSessions = await Session.find({
            student: req.user._id,
            status: 'scheduled',
            date: { $gte: new Date() }
        })
        .populate('coach', 'firstName lastName email specialization avatar')
        .sort({ date: 1, startTime: 1 })
        .limit(5);
        
        const completedSessions = await Session.countDocuments({
            student: req.user._id,
            status: 'completed'
        });

        const availableCoaches = await User.countDocuments({
            role: 'coach',
            status: 'active'
        });
        
        res.json({
            success: true,
            data: {
                student: req.user,
                upcomingSessions,
                stats: {
                    completedSessions,
                    upcomingSessions: upcomingSessions.length,
                    availableCoaches,
                    learningHours: completedSessions * 1 // Placeholder: 1 hour per completed session
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available coaches
router.get('/coaches', async (req, res) => {
    try {
        const coaches = await User.find({
            role: 'coach',
            status: 'active'
        }).select('firstName lastName email specialization experience hourlyRate avatar bio');
        
        res.json({ 
            success: true, 
            data: {
                coaches
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get student's sessions
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await Session.find({ student: req.user._id })
            .populate('coach', 'firstName lastName email specialization avatar')
            .sort({ date: -1, startTime: -1 });
        
        res.json({ success: true, data: { sessions } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get learning materials
router.get('/materials', async (req, res) => {
    try {
        // In a real app, these would come from a 'Material' model
        const materials = [
            {
                _id: 'm1',
                title: 'Introduction to Operating Systems',
                type: 'pdf',
                size: '2.4 MB',
                uploadDate: new Date(),
                coachName: 'Jalpit Patel',
                description: 'Core concepts and architecture overview.'
            },
            {
                _id: 'm2',
                title: 'Data Structures Cheat Sheet',
                type: 'pdf',
                size: '1.1 MB',
                uploadDate: new Date(Date.now() - 86400000),
                coachName: 'Neel Patel',
                description: 'Quick reference for arrays, lists, and trees.'
            },
            {
                _id: 'm3',
                title: 'Web Dev Best Practices 2024',
                type: 'video',
                duration: '45:00',
                uploadDate: new Date(Date.now() - 172800000),
                coachName: 'Admin',
                description: 'Modern workflow and performance tips.'
            }
        ];
        
        res.json({ success: true, data: { materials } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get today's sessions
router.get('/sessions/today', async (req, res) => {
    try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const sessions = await Session.find({
            student: req.user._id,
            date: { $gte: start, $lte: end }
        }).populate('coach', 'firstName lastName');

        res.json({
            success: true,
            data: {
                sessions
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Book a session
router.post('/sessions/book', async (req, res) => {
    try {
        const { coachId, date, startTime, endTime, title, description } = req.body;
        
        const session = await Session.create({
            title: title || 'Coaching Session',
            description,
            coach: coachId,
            student: req.user._id,
            date: new Date(date),
            startTime,
            endTime,
            status: 'scheduled'
        });
        
        res.status(201).json({
            success: true,
            message: 'Session booked successfully',
            data: session
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancel a session
router.put('/sessions/:id/cancel', async (req, res) => {
    try {
        const session = await Session.findOne({
            _id: req.params.id,
            student: req.user._id
        });
        
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        
        session.status = 'cancelled';
        session.cancelledBy = req.user._id;
        await session.save();
        
        res.json({
            success: true,
            message: 'Session cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
