const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


const transactions = {};

app.post('/callback', (req, res) => {
  const { transactionId, status } = req.body;

  console.log('Received callback:', req.body);

  if (transactionId && status) {
    transactions[transactionId] = { status };
  }

  res.status(200).send('TRUE');
});

app.get('/status', (req, res) => {
  const id = req.query.id;
  const transaction = transactions[id];

  if (!transaction) {
    return res.status(404).json({ status: 'not_found' });
  }

  res.json({ status: transaction.status });
});

app.get('/', (req, res) => {
  res.send('Tpay callback server is running.');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
