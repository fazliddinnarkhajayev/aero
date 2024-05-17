const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../Database/database');
const { body, validationResult } = require('express-validator');
const { successResponse, errorResponse } = require('../utils/response');
require('dotenv').config();

const router = express.Router();

router.post('/signup', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array().map(err => err.msg).join(', '), 400);
  }

  const { email, password } = req.body;
  try {
    // Check if the email is already in use
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length) {
      return errorResponse(res, 'Email already in use', 400);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const [result] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);

    if (result.affectedRows) {
      successResponse(res, { id: result.insertId, email }, 'User registered successfully', 201);
    } else {
      errorResponse(res, 'Create data failed');
    }
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Database query error');
  }
});

router.post('/signin', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  body('deviceId').notEmpty().withMessage('Device is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array().map(err => err.msg).join(', '), 400);
  }

  const { email, password, deviceId } = req.body;
  try {
    // Check if the user exists
    const [users] = await pool.query('SELECT id, email, password FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return errorResponse(res, 'Invalid email', 400);
    }

    // Validate the password
    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid password', 401);
    }
    // Generate access token
    const accessToken = jwt.sign({ id: user.id, deviceId, email: user.email }, process.env.JWT_SECRET, { expiresIn: '10m' });

    // Generate refresh token (stored in database for persistence)
    const refreshToken = jwt.sign({ id: user.id, deviceId, email: user.email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '1d' });

    // update user tokens
    await pool.query(`UPDATE users SET access_token = ?, refresh_token = ? WHERE id = ?`, [accessToken, refreshToken, user.id]);

    successResponse(res, { accessToken, refreshToken }, 'Sign-in successful');
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Database query error');
  }
});

router.post('/new_token', async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return errorResponse(res, 'Refresh token is missing', 400);
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    // Check if the refresh token is expired
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTimestamp) {
      return errorResponse(res, 'Refresh token has expired', 401);
    }

    // Check if the refresh token is still valid
    const userId = decoded.id;
    const [refreshTokenInDB] = await pool.query(`SELECT id FROM users WHERE id = ? AND refresh_token = ?`, [userId, refreshToken]);
    if (!refreshTokenInDB.length) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }


    // Generate a new access token
    const accessToken = jwt.sign({ id: decoded.id, deviceId: decoded.deviceId, email: decoded.email }, process.env.JWT_SECRET, { expiresIn: '10m' });

    await pool.query(`UPDATE users SET access_token = ? WHERE id = ?`, [accessToken, decoded.id]);
    successResponse(res, { accessToken }, 'Token refreshed successfully');
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message, 401);
  }
});

router.post('/logout', async (req, res) => {
  const { deviceId } = req.body;
  const userId = req.user.id;

  try {

    // check if user exists
    const [user] = await pool.query(`SELECT id, access_token FROM users WHERE id = ?`, [userId]);
    if (!user.length) {
      return errorResponse(res, 'User not found', 400);
    }
    const [blockedToken] = await pool.query(`SELECT * FROM blocked_token WHERE user_id = ? AND device_id = ?`, [userId, deviceId]);
    if (!blockedToken.length) {
      await pool.query(`INSERT INTO blocked_token SET user_id = ?, device_id = ?, access_token = ?`, [userId, deviceId, user[0]?.access_token]);
    } else {
      await pool.query(`UPDATE blocked_token SET access_token = ? WHERE user_id = ? AND  device_id = ?`, [user[0].access_token, userId, deviceId]);
    }

    successResponse(res, null, 'Logout successful');
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message, 401);
  }
});

router.get('/info', async (req, res) => {
  const userId = req.user.id;

  try {

    // check if user exists
    const [user] = await pool.query(`SELECT id FROM users WHERE id = ?`, [userId]);
    if (!user.length) {
      return errorResponse(res, 'User not found', 400);
    } else {
      successResponse(res, { userId: user[0]?.id });
    }
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message, 401);
  }
});

module.exports = router;
