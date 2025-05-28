const express = require('express');
const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const id = req.query.id;

        const { data, error } = await supabase
            .from('transactions')
            .select('status')
            .eq('id', id);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'B³¹d bazy danych' });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ status: 'not_found' });
        }

        res.json({ status: data[0].status });
    } catch (err) {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'Wewnêtrzny b³¹d serwera' });
    }
});

module.exports = router;
