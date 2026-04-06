const mongoose = require('mongoose');
const CodeSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  code: { type: String, default: '' },
  adminId: { type: String }, // socketId of the admin (session creator)
  defaultPermission: { type: String, enum: ['viewer', 'editor'], default: 'viewer' }, // default permission for new users
  users: [
    {
      socketId: { type: String },
      username: { type: String },
      permission: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
      joinedAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now, expires: '1h' } // auto-delete after 1 hour
});

module.exports = mongoose.model('CodeSession', CodeSessionSchema);