const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  content: { type: String, required: true },
  score: { type: Number, default: 0 },
  username: { type: String, required: true },
  avatar: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  parentId: { type: Number, default: null },
  isCurrentUser: { type: Boolean, default: false },
});

module.exports = mongoose.model("Comment", commentSchema);
