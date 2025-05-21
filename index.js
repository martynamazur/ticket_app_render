require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const client = jwksClient({
 jwksUri: 'https://hhvriufzsfvhjtoijfsx.supabase.co/auth/v1/keys'
});

// Funkcja do pobrania klucza na podstawie `kid`
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Konfiguracja bazy danych
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Sekret JWT 
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// 🟦 Endpoint z weryfikacją JWT i zapisaniem aktywowanego biletu
app.post('/activate-ticket', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak nagłówka autoryzacji' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.SUPABASE_JWT_SECRET, {}, async (err, decoded) => {
  if (err) {
    console.error('Błąd JWT:', err);
    return res.status(403).json({ error: 'Nieprawidłowy token' });
  }


    const user_id = decoded.sub; // <- id użytkownika z Supabase
    const { vehicle_id, ticket_id, activation_time, transaction_id } = req.body;

    if (!ticket_id || !vehicle_id || !activation_time || !transaction_id) {
      return res.status(400).json({ error: 'Brakuje pól' });
    }

    const activated_at = new Date(activation_time);
    const expires_at = new Date(activated_at.getTime() + 60 * 60 * 1000); // +1h

    const qr_token = jwt.sign(
      {
        user_id,
        vehicle_id,
        activated_at,
        expires_at,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    try {
      const result = await pool.query(
        `INSERT INTO activated_tickets (user_id, vehicle_id, activated_at, expires_at, qr_token, ticket_id, transaction_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [user_id, vehicle_id, activated_at, expires_at, qr_token, ticket_id, transaction_id]
      );

      return res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('Błąd przy zapisie do bazy:', e);
      return res.status(500).json({ error: 'Błąd serwera' });
    }
  });
});

module.exports = router;



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
  const { encodedToken,amount, description, email, name } = req.body;


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
