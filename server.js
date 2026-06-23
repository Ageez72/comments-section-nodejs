require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Comment = require("./models/Comment");

const app = express();
const PORT = process.env.PORT || 3000;

const CURRENT_USER = {
  username: "ramsesmiron",
  avatar: "https://i.pravatar.cc/64?img=68",
};

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function collectDescendantIds(comments, parentId) {
  const ids = [parentId];
  const children = comments.filter((c) => c.parentId === parentId);
  for (const child of children) {
    ids.push(...collectDescendantIds(comments, child.id));
  }
  return ids;
}

async function nextId() {
  const last = await Comment.findOne().sort({ id: -1 });
  return last ? last.id + 1 : 1;
}

// GET all comments
app.get("/api/comments", async (_req, res) => {
  try {
    const comments = await Comment.find().sort({ id: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// GET single comment
app.get("/api/comments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const comment = await Comment.findOne({ id });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comment" });
  }
});

// POST create comment
app.post("/api/comments", async (req, res) => {
  try {
    const { content, parentId } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (parentId != null) {
      const parent = await Comment.findOne({ id: Number(parentId) });
      if (!parent) {
        return res.status(404).json({ error: "Parent comment not found" });
      }
    }

    const newComment = await Comment.create({
      id: await nextId(),
      content: String(content).trim(),
      score: 0,
      username: CURRENT_USER.username,
      avatar: CURRENT_USER.avatar,
      createdAt: new Date(),
      parentId: parentId != null ? Number(parentId) : null,
      isCurrentUser: true,
    });

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// PUT update comment
app.put("/api/comments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const comment = await Comment.findOne({ id });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (!comment.isCurrentUser) {
      return res.status(403).json({ error: "You can only edit your own comments" });
    }

    comment.content = String(content).trim();
    await comment.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// DELETE comment (and nested replies)
app.delete("/api/comments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const comment = await Comment.findOne({ id });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (!comment.isCurrentUser) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    const comments = await Comment.find();
    const idsToRemove = collectDescendantIds(comments, id);
    await Comment.deleteMany({ id: { $in: idsToRemove } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// PATCH vote
app.patch("/api/comments/:id/vote", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { direction } = req.body;

    if (!["up", "down"].includes(direction)) {
      return res.status(400).json({ error: "Direction must be 'up' or 'down'" });
    }

    const comment = await Comment.findOneAndUpdate(
      { id },
      { $inc: { score: direction === "up" ? 1 : -1 } },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to vote on comment" });
  }
});

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Copy .env.example to .env and add your Atlas connection string.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
