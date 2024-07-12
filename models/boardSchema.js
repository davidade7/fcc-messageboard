const mongoose = require('mongoose')

// Import the thread schema
const { threadSchema } = require('../models/threadSchema');

// Schema for the issues
const boardSchema = new mongoose.Schema({
  board: { type: String, default: "" },
  threads: { type: [String], default: []}
})

// Models
const Board = mongoose.model('Board', boardSchema);

module.exports = Board;