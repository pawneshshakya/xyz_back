const express = require('express');
const cors = require('cors');
const path = require('path');
const { enforceMinAppVersion } = require('./middlewares/appVersion.middleware');

// Route files

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Mount routers
app.get('/', (req, res) => res.send('API is running...'));
app.use('/api/app', require('./routes/appVersion.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/banners', require('./routes/banner.routes'));
app.use(enforceMinAppVersion);
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/matches', require('./routes/match.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

module.exports = app;
