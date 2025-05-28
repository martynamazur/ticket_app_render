import 'dotenv/config'; // zamiast require('dotenv').config()
import express from 'express';

import ticketRouter from './routes/activateTicket.js';
import paymentRouter from './routes/payments.js';
import statusRouter from './routes/status.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', ticketRouter);
app.use('/payments', paymentRouter);
app.use('/', statusRouter);

app.get('/', (req, res) => {
    res.send('Tpay callback server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});