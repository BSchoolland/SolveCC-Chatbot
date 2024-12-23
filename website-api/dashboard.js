const express = require('express');
const router = express.Router();
require('dotenv').config();

const { 
    getUserPlans
} = require('../database/plans.js');

const { authMiddleware } = require('./middleware.js');

// Get all plans for a user
router.get('/user-plans', authMiddleware, async (req, res) => {
    try {
        const plans = await getUserPlans(req.userId);
        res.status(200).json({ plans, success: true });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;