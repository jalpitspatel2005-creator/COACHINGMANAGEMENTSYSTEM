const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');

// All routes protected for coaches only
router.use(protect);
router.use(authorize('coach'));

// Get coach dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const upcomingSessions = await Session.find({
            coach: req.user._id,
            status: 'scheduled',
            date: { $gte: new Date() }
        })
        .populate('student', 'firstName lastName email avatar')
        .sort({ date: 1, startTime: 1 })
        .limit(10);
        
        const completedSessions = await Session.countDocuments({
            coach: req.user._id,
            status: 'completed'
        });
        
        const totalStudents = await Session.distinct('student', {
            coach: req.user._id
        });
        
        res.json({
            success: true,
            data: {
                coach: req.user,
                upcomingSessions,
                stats: {
                    completedSessions,
                    totalStudents: totalStudents.length,
                    upcomingSessions: upcomingSessions.length
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get coach's sessions
router.get('/sessions', async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const query = { coach: req.user._id };
        
        if (status) query.status = status;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        
        const sessions = await Session.find(query)
            .populate('student', 'firstName lastName email')
            .sort({ date: -1 });
        
        res.json({ success: true, data: sessions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new session
router.post('/sessions', async (req, res) => {
    try {
        const { title, description, date, startTime, endTime, studentId, type } = req.body;
        
        // Validate time slot
        const existingSession = await Session.findOne({
            coach: req.user._id,
            date: new Date(date),
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
        });
        
        if (existingSession) {
            return res.status(400).json({
                success: false,
                error: 'Time slot already booked'
            });
        }
        
        const session = await Session.create({
            title,
            description,
            coach: req.user._id,
            student: studentId,
            date: new Date(date),
            startTime,
            endTime,
            type: type || 'individual',
            status: 'scheduled'
        });
        
        res.status(201).json({
            success: true,
            message: 'Session created successfully',
            data: session
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update session status
router.put('/sessions/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        const session = await Session.findOneAndUpdate(
            { _id: req.params.id, coach: req.user._id },
            { status },
            { new: true }
        );
        
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        
        res.json({
            success: true,
            message: `Session marked as ${status}`,
            data: session
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get coach's students
router.get('/students', async (req, res) => {
    try {
        // Find students that have had sessions with this coach
        const distinctStudentIds = await Session.find({ coach: req.user._id })
            .distinct('student');
        
        let students;
        if (distinctStudentIds.length > 0) {
            students = await User.find({
                _id: { $in: distinctStudentIds },
                role: 'student',
                status: 'active'
            }).select('firstName lastName email phone avatar');
        } else {
            // If no sessions yet, return all active students so the coach can start scheduling
            students = await User.find({
                role: 'student',
                status: 'active'
            }).select('firstName lastName email phone avatar');
        }
        
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;