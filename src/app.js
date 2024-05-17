const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const pool = require('./Database/database');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/file');

app.use(authMiddleware);
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/file', fileRoutes);

app.get('/', async (req, res) => {
  const [user] = await pool.query('SELECT * from users')
  res.json(user)
})

app.listen(PORT, () => console.log('http://localhost:' + PORT))