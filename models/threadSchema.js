const mongoose = require('mongoose')

// Import the reply schema
const { replySchema } = require('./replySchema');

// Schema for the issues
const threadSchema = new mongoose.Schema({
  text: { type: String, default: "" },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  delete_password: { type: String, default: "" },
  replies: {type : [String], default: []}
})

// Models
const Thread = mongoose.model('Thread', threadSchema);

module.exports = { Thread, threadSchema };