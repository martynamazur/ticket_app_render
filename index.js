
require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const ticketRouter = require('./routes/activateTicket');
const paymentRouter = require('./routes/payments');
const statusRouter = require('./routes/status');


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