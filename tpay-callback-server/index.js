
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/callback', (req, res) => {
  console.log('Received callback:', req.body);
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('Tpay callback server is running.');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
