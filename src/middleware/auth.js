const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const pool = require('../Database/database');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  if (req.url === '/auth/signin' || req.url === '/auth/refresh-token') { // Check for the '/auth/signin' route
    return next(); // Skip authentication middleware
  }

  const token = req.headers['authorization']?.split(' ')[1]; // Use optional chaining to avoid errors

  if (!token) {
    return errorResponse(res, 'No token provided', 403); // Send error response if token is missing
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //check if device is not blocked
    const [blockedToken] = await pool.query(`SELECT * FROM blocked_token WHERE user_id = ? AND device_id = ? AND access_token = ?`, [decoded.id, decoded.deviceId, token]);
    if (blockedToken.length) {
      return errorResponse(res, 'Invalidd token', 401); // Send error response for invalid token
    }

    req.user = decoded; // Attach the decoded payload to the request object
    next(); // Move to the next middleware/route handler
  } catch (err) {
    console.error(err);
    return errorResponse(res, 'Invalid token', 401); // Send error response for invalid token
  }
};

module.exports = authMiddleware;
