require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Comment = require("./models/Comment");

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const raw = fs.readFileSync(
    path.join(__dirname, "data", "comments.json"),
    "utf-8"
  );
  const comments = JSON.parse(raw).map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt),
  }));

  await Comment.deleteMany({});
  await Comment.insertMany(comments);

  console.log(`Seeded ${comments.length} comments into MongoDB Atlas`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
