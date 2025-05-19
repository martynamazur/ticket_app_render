require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);


app.post('/callback', async (req, res) => {
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


app.get('/status', async (req, res) => {
  const id = req.query.id;

  const { data, error } = await supabase
    .from('transactions')
    .select('status')
    .eq('id', id);

  if (error || !data || data.length === 0) {
    return res.status(404).json({ status: 'not_found' });
  }

  res.json({ status: data[0].status });
});

app.get('/', (req, res) => {
  res.send('Tpay callback server is running.');
});

app.post('/payments/googlepay', async (req, res) => {
  const { encodedToken,amount, description } = req.body;

  if (!encodedToken || !amount) {
    return res.status(400).json({ error: 'Brak tokena Google Pay lub kwoty' });
  }

  try {
    const response = await fetch('https://openapi.sandbox.tpay.com/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${process.env.TPAY_CLIENT_ID}:${process.env.TPAY_CLIENT_SECRET}`).toString('base64')
      },
      body: JSON.stringify({
        pay: {
          groupId: parseInt(process.env.TPAY_GROUP_ID, 10), 
          amount: parseFloat(amount), 
          description: description || 'Zakup biletu',
          googlePayPaymentData: encodedToken
        }
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Tpay error:', responseData);
      return res.status(500).json({ error: 'Błąd Tpay', details: responseData });
    }

  
    await supabase.from('transactions').upsert({
      id: responseData.title, 
      status: 'pending'
    });

    return res.status(200).json({ success: true, tpayData: responseData });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
