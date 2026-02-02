const express = require('express');
const cors = require('cors');

// Route files

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount routers
app.get('/', (req, res) => res.send('API is running...'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/matches', require('./routes/match.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

module.exports = app;
