const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// 1. Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://learn-loop-edcf7.web.app",
      /\.vercel\.app$/ // Allows Vercel preview deployments
    ],
    credentials: true,
  })
);
app.use(express.json());

// 2. MongoDB Connection Caching
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let cachedDb = null;

async function getDB() {
  if (cachedDb) return cachedDb;
  
  await client.connect();
  const db = client.db("learnloopDB");
  cachedDb = db;
  return db;
}

// 3. Routes
const router = express.Router();

// Health Check
app.get("/", (req, res) => res.send("LearnLoop API is live and connected!"));

// POST: Create a course
router.post("/courses", async (req, res) => {
  const db = await getDB();
  const result = await db.collection("courses").insertOne(req.body);
  res.status(201).json(result);
});

// GET: All courses (with filtering)
router.get("/courses", async (req, res) => {
  const db = await getDB();
  const { owner, category } = req.query;

  const filter = {};
  if (owner) filter.instructorEmail = owner;
  if (category) filter.category = category;

  const courses = await db.collection("courses").find(filter).toArray();
  res.json(courses);
});

// GET: Single course by ID
router.get("/courses/:id", async (req, res) => {
  const db = await getDB();
  const { id } = req.params;

  try {
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const course = await db.collection("courses").findOne(query);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course" });
  }
});

// PUT: Update course
router.put("/courses/:id", async (req, res) => {
  const db = await getDB();
  const { id } = req.params;
  
  const result = await db.collection("courses").updateOne(
    { _id: new ObjectId(id) },
    { $set: req.body }
  );
  res.json(result);
});

// DELETE: Course
router.delete("/courses/:id", async (req, res) => {
  const db = await getDB();
  const { id } = req.params;

  const result = await db.collection("courses").deleteOne({
    _id: new ObjectId(id),
  });

  if (!result.deletedCount) {
    return res.status(404).json({ message: "Course not found" });
  }
  res.json({ message: "Course deleted successfully" });
});

// POST: Enrollment
router.post("/enroll", async (req, res) => {
  const db = await getDB();
  const result = await db.collection("enrollments").insertOne({
    ...req.body,
    enrolledAt: new Date(),
  });
  res.json(result);
});

// GET: User Enrolled courses
router.get("/enrolled", async (req, res) => {
  const db = await getDB();
  const { email } = req.query;
  const enrolled = await db
    .collection("enrollments")
    .find({ userEmail: email })
    .toArray();
  res.json(enrolled);
});

// 4. Mount Router
app.use("/api", router);

// 5. Export for Vercel (No app.listen needed for production)
module.exports = app;