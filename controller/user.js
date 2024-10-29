const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
//Oct15

const generateUserId = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  const count = rows[0].count + 1; // Increment by 1 for the new ID
  return `UID${String(count).padStart(2, '0')}`; // Generate ID like MDC01, MDC02, etc.
};

// User signup
const signupUser = async (req, res) => {
  const { username, email, password, phone_number } = req.body;

  try {
    const [existingUser] = await pool.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'This Mobile number has already been registered' });
    }
    const user_id = await generateUserId();

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (user_id, username, email, password, phone_number) VALUES (?,?, ?, ?, ?)', [user_id, username, email, hashedPassword, phone_number]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Error during signup' });
  }
};


// User login
const loginUser = async (req, res) => {
  const { phone_number, password } = req.body;

  try {
    const [user] = await pool.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userData = user[0];
    console.log("userData", userData)
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token with user ID and isAdmin status
    const token = jwt.sign({ id: userData.id, isAdmin: userData.isAdmin }, process.env.JWT_SECRET);

    res.status(200).json({
      username: userData.username,
      user_id: userData.user_id,
      token: token,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  const userId = req.params.user_id; // Assuming 'user_id' is used in the route parameter
  const { isAdmin } = req.body;
  console.log("userId", userId)

  try {
    const result = await pool.query('UPDATE users SET isAdmin = ? WHERE user_id = ?', [isAdmin, userId]);

    res.status(200).json({ message: 'User role updated successfully' });

  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, user_id, username, email, isAdmin, phone_number FROM users');
    res.status(200).json(rows);  // Send the fetched users as a JSON response
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id; // This is set by the authenticateJWT middleware

    // Execute the query to get user data, including user_id
    const [rows] = await pool.query(
      'SELECT id, user_id, username, email, isAdmin FROM users WHERE id = ?',
      [userId]
    );

    // Check if the user exists
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user data, including user_id
    res.status(200).json({
      id: rows[0].id,
      user_id: rows[0].user_id,  // This ensures user_id is returned
      username: rows[0].username,
      email: rows[0].email,
      isAdmin: rows[0].isAdmin,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserWishlist = async (req, res) => {
  const userId = req.params.user_id; // Assuming 'user_id' is used in the route parameter

  try {
    const [wishlistItems] = await pool.query(`
      SELECT w.*, p.image
      FROM wishlist w 
      JOIN products p ON w.product_id = p.product_id 
      WHERE w.user_id = ?`,
      [userId]
    );

    // Format the image URLs properly for each wishlist item
    const formattedWishlist = wishlistItems.map(item => ({
      ...item,
      image: `${req.protocol}://${req.get('host')}/${item.image.replace(/\\/g, '/')}`, // Correct the image path format
    }));

    res.status(200).json(formattedWishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const getUserCart = async (req, res) => {
  const userId = req.params.user_id;

  try {
    const [cartItems] = await pool.query(`
      SELECT c.product_id AS productId, c.product_name AS name, c.quantity, c.price, p.image
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?`,
      [userId]
    );

    // Ensure the response structure includes all needed fields
    const formattedCart = cartItems.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: `${req.protocol}://${req.get('host')}/${item.image.replace(/\\/g, '/')}`
    }));

    res.status(200).json(formattedCart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        

const toggleCartItem = async (req, res) => {
  const { productId, quantity, product_name, image, price } = req.body;
  console.log("price", price)
  const userId = req.params.user_id;

  if (!userId || !productId) {
    return res.status(400).json({ message: "User ID and Product ID are required" });
  }

  try {
    const [existingItem] = await pool.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);

    // If the item exists in the cart, remove it and return grey color
    if (existingItem.length > 0) {
      await pool.query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.status(200).json({
        message: 'Item removed from cart',
        isAdded: false,
        buttonColor: '#6c757d', // grey
        cartItem: {
          id: productId,
          name: product_name,
          quantity: quantity,
          price: price, // Ensure you send the price
          image: image
        }

      });
    }

    await pool.query('INSERT INTO cart (user_id, product_id, quantity, product_name, image, price) VALUES (?, ?, ?, ?, ?, ?)', [userId, productId, quantity, product_name, image, price]);

    return res.status(201).json({
      message: 'Item added to cart',
      isAdded: true,
      buttonColor: '#dc3545',
      cartItem: {
        id: productId,
        name: product_name,
        quantity: quantity,
        price: price, // Ensure you send the price
        image: image
      }
    });
  } catch (error) {
    console.error('Error toggling cart item:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const toggleWishlistItem = async (req, res) => {
  const { productId, product_name, image, price } = req.body;
  console.log("req.body", req.body)
  const userId = req.params.user_id;

  if (!userId || !productId) {
    return res.status(400).json({ message: "User ID and Product ID are required" });
  }

  try {
    const [existingItem] = await pool.query('SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);

    // If the item exists in the cart, remove it and return grey color
    if (existingItem.length > 0) {
      await pool.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.status(200).json({
        message: 'Item removed from wishlist',
        isAdded: false,
        buttonColor: '#6c757d', // grey
        wishlistItem: {
          id: productId,
          product_name: product_name,
          image: `${req.protocol}://${req.get('host')}/${image.replace(/\\/g, '/')}`, // Correct the image path format

          price: price, // Ensure you send the price
        }

      });
    }

    // If item is not in the cart, add it and return red color
    await pool.query('INSERT INTO wishlist (user_id, product_id, product_name, image, price) VALUES (?, ?, ?, ?, ?)', [userId, productId, product_name, image, price]);

    return res.status(201).json({
      message: 'Item added to wishlist',
      isAdded: true,
      buttonColor: '#dc3545',
      wishlistItem: {
        id: productId,
        product_name: product_name,
        image: image,
        price: price, // Ensure you send the price

      }
    });
  } catch (error) {
    console.error('Error toggling wishlist item:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  signupUser,
  loginUser,
  updateUserRole,
  getUsers,
  getCurrentUser,
  getUserWishlist,
  getUserCart,
  toggleCartItem,
  toggleWishlistItem
};


