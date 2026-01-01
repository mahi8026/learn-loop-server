const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://learn-loop-edcf7.web.app"
    ],
    credentials: true,
  })
);

app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let cachedDb = null;

async function getDB() {
  if (cachedDb) return cachedDb;
  await client.connect();
  cachedDb = client.db("learnloopDB");
  console.log("MongoDB connected");
  return cachedDb;
}

const router = express.Router();


router.post("/courses", async (req, res) => {
  const db = await getDB();
  const result = await db.collection("courses").insertOne(req.body);
  res.status(201).json(result);
});

router.get("/courses", async (req, res) => {
  const db = await getDB();
  const { owner, category } = req.query;

  const filter = {};
  if (owner) filter.instructorEmail = owner;
  if (category) filter.category = category;

  const courses = await db.collection("courses").find(filter).toArray();
  res.json(courses);
});

router.get("/courses/:id", async (req, res) => {
  const db = await getDB();
  const { id } = req.params;

  const query = ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { _id: id };

  const course = await db.collection("courses").findOne(query);
  if (!course) return res.status(404).json({ message: "Course not found" });

  res.json(course);
});

router.put("/courses/:id", async (req, res) => {
  const db = await getDB();
  const result = await db.collection("courses").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  );
  res.json(result);
});

router.delete("/courses/:id", async (req, res) => {
  const db = await getDB();
  const result = await db.collection("courses").deleteOne({
    _id: new ObjectId(req.params.id),
  });

  if (!result.deletedCount) {
    return res.status(404).json({ message: "Course not found" });
  }

  res.json({ message: "Course deleted successfully" });
});


router.post("/enroll", async (req, res) => {
  const db = await getDB();
  const result = await db.collection("enrollments").insertOne({
    ...req.body,
    enrolledAt: new Date(),
  });
  res.json(result);
});

router.get("/enrolled", async (req, res) => {
  const db = await getDB();
  const enrolled = await db
    .collection("enrollments")
    .find({ userEmail: req.query.email })
    .toArray();
  res.json(enrolled);
});

app.use("/api", router);

module.exports = app;
