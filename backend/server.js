const express = require('express');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(FRONTEND_DIR));

// API routes
app.use('/api', apiRoutes);

// Fallback to frontend/index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
