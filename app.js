const express = require('express');
const Razorpay = require('razorpay');
require('dotenv').config();
const path = require('path');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const productRoutes = require('./routes/product');
const loginRoutes = require('./routes/user');
const { getCurrentUser } = require('./controller/user');
app.use(bodyParser.json({ limit: '10mb' })); // Adjust the size as needed
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' })); //


const razorpay = new Razorpay({
  key_id: 'rzp_test_OK03rE3KWdrU3p',
  key_secret: 'dAVM1lNbabnddvEPeJTNKzu3'
});
// Middleware
app.use(cors()); // Enable CORS to allow requests from the frontend
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api/products', productRoutes);
app.use('/api/users', loginRoutes);

const PORT = process.env.PORT || 7000;

app.post('/api/create-order', async (req, res) => {
  const { amount, currency } = req.body; // You can pass the amount and currency from frontend

  const options = {
    amount: amount * 100, // Razorpay expects amount in the smallest currency unit (like paise for INR)
    currency: currency,
    receipt: 'receipt#1',
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
