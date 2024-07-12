const mongoose = require('mongoose')

// Schema for the issues
const replySchema = new mongoose.Schema({
  text: { type: String, default: "" },
  created_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  delete_password: { type: String, default: "" },
})

// Models
const Reply = mongoose.model('Reply', replySchema);

module.exports = { replySchema, Reply };