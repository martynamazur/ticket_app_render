const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { pool } = require('../services/db'); 

router.post('/activate-ticket', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing auth header' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.SUPABASE_JWT_SECRET, {}, async (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });

        const user_id = decoded.sub;
        const { vehicle_id, ticket_id, activation_time, transaction_id, ticket_duraton } = req.body;

        if (!ticket_id || !vehicle_id || !activation_time || !transaction_id || !ticket_duraton) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const activated_at = new Date(activation_time);
        const expires_at = new Date(activated_at.getTime() + ticket_duraton * 60 * 1000);

        const qr_token = jwt.sign(
            { user_id, vehicle_id, activated_at, expires_at },
            process.env.JWT_SECRET,
            { expiresIn: '${ticket_duration}m' }
        );

        try {
            const result = await pool.query(
                `INSERT INTO activated_tickets (...) VALUES (...) RETURNING *`,
                [user_id, vehicle_id, activated_at, expires_at, qr_token, ticket_id, transaction_id]
            );
            return res.status(201).json(result.rows[0]);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Server error' });
        }
    });
});

module.exports = router;