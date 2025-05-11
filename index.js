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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
