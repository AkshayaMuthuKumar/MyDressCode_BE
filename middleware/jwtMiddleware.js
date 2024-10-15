const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret'; // Store in environment variable in production
//Oct15

// Function to generate a JWT token
const generateToken = (user) => {
  // The payload includes user data (e.g., ID, username, email)
  const payload = {
    user_id: user.user_id, // Ensure user.id is available
    username: user.username,
    email: user.email,
  };
console.log ("payload",payload)
  // Sign and generate a token with a 1-hour expiration time
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' }); 
  console.log ("token", token);
// Ensure expiration is set correctly
  return token;
};

// Middleware to authenticate JWT token
const authenticateJWT = (req, res, next) => {
  // Get the token from the authorization header
  const authHeader = req.headers.authorization;

  // Check if the authorization header is present
  if (authHeader) {
    // Extract the token (it comes in the format: Bearer <token>)
    const token = authHeader.split(' ')[1];

    // Verify the token using the same secret used to sign it
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        // Token is invalid or expired, send a 403 Forbidden status
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      // If token is valid, attach the decoded user to the request object
      req.user = user;
      next(); // Proceed to the next middleware or route handler
    });
  } else {
    // If no token is provided, send a 401 Unauthorized status
    return res.status(401).json({ message: 'No token provided' });
  }
};

module.exports = { generateToken, authenticateJWT };
