const mongoose = require('mongoose');
const CodeSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  code: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, expires: '1h' } // auto-delete after 1 hour
});

module.exports = mongoose.model('CodeSession', CodeSessionSchema);