require('dotenv').config();
const express = require('express');
const cors = require('cors');

const portfolioRoutes = require('./routes/portfolio');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/portfolio', portfolioRoutes);
app.use('/api/contact', contactRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Clear Digital Studio API is running' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, errors: ['Invalid request data. Please try again.'] });
  }
  console.error('Server error:', err.stack);
  res.status(500).json({ success: false, errors: ['Internal server error'] });
});

app.listen(PORT, () => {
  console.log(`Clear Digital Studio API running on http://localhost:${PORT}`);
});
