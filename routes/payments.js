import express from 'express';
import supabase from '../services/supabaseClient.js'; // Upewnij si�, �e masz plik supabaseClient.js eksportuj�cy instancj�

const router = express.Router();

router.post('/callback', async (req, res) => {
    const { transactionId, status } = req.body;

    console.log('Received callback:', req.body);

    if (!transactionId || !status) {
        return res.status(400).send('Missing transactionId or status');
    }

    const { error } = await supabase
        .from('transactions')
        .upsert({ id: transactionId, status });

    if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).send('Database error');
    }

    res.status(200).send('TRUE');
});

router.post('/googlepay', async (req, res) => {
    const { encodedToken, amount, description, email, name } = req.body;
    console.log('  /payments/googlepay hit');
    console.log(' Request body:', req.body);

    if (!encodedToken || !amount || !description || !email || !name) {
        return res.status(400).json({ error: 'Nie przekazano wszystkich parametrow naglowka' });
    }

    try {
        const response = await fetch('https://openapi.sandbox.tpay.com/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(`${process.env.TPAY_CLIENT_ID}:${process.env.TPAY_CLIENT_SECRET}`).toString('base64')
            },
            body: JSON.stringify({
                groupId: parseInt(process.env.TPAY_GROUP_ID, 10),
                amount: amount,
                description: description || 'Zakup biletu',
                googlePayPaymentData: encodedToken,
                payer: {
                    email: email,
                    name: name
                }
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Tpay error:', responseData);
            return res.status(500).json({ error: 'B��d Tpay', details: responseData });
        }

        await supabase.from('transactions').upsert({
            id: responseData.title,
            status: 'pending'
        });

        return res.status(200).json({ success: true, tpayData: responseData });
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: 'Wewn�trzny b��d serwera' });
    }
});

export default router;