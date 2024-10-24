const express = require('express');
const Razorpay = require('razorpay');
require('dotenv').config();
//Oct15

const productRoutes = require('./routes/product');
const loginRoutes = require('./routes/user');
const { getCurrentUser } = require('./controller/user');

const path = require('path');

const cors = require('cors');

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

const PORT = process.env.PORT || 3306;

app.post('/create-order', async (req, res) => {
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
