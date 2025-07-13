const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');  // Your existing auth routes
const fileRoutes = require('./routes/fileRoutes');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads folder statically (for direct access if needed)
app.use('/uploads', express.static('uploads'));

// Route middlewares
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ DB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
