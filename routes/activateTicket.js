import express from 'express';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch'; // jeœli bêdziesz go u¿ywaæ
import { pool } from '../services/db.js'; // Upewnij siê, ¿e masz plik db.js eksportuj¹cy pool

const router = express.Router();

router.post('/activate-ticket', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing auth header' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        const user_id = decoded.sub;

        const { vehicle_id, ticket_id, transaction_id, ticket_duration } = req.body;

        if (!vehicle_id || !ticket_id || !transaction_id || !ticket_duration) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const activated_at = new Date();
        const expires_at = new Date(activated_at.getTime() + ticket_duration * 60 * 1000);

        const qr_token = jwt.sign(
            { user_id, vehicle_id, activated_at, expires_at },
            process.env.JWT_SECRET,
            { expiresIn: `${ticket_duration}m` }
        );

        const result = await pool.query(
            `INSERT INTO activated_tickets (user_id, vehicle_id, activated_at, expires_at, qr_token, ticket_id, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [user_id, vehicle_id, activated_at, expires_at, qr_token, ticket_id, transaction_id]
        );

        console.log('Activated at:', activated_at.toISOString());
        console.log('Expires at:', expires_at.toISOString());

        res.status(201).json(
            {
                qrToken: qr_token,
                activated_at: activated_at.toISOString(),
                expires_at: expires_at.toISOString(),
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;