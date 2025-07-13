const mongoose = require('mongoose');

const DownloadLogSchema = new mongoose.Schema({
  filename: String,
  userId: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DownloadLog', DownloadLogSchema);
