const express = require('express');

const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(express.json({ extended: false }));

app.get('/', (req, res) => res.json({ msg: 'welcome' }));

// Routes
app.use('/api/items', require('./routes/items'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
