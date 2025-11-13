
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express(); 
app.use(cors());
app.use(express.json());


const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("learnloopDB");
    const coursesCollection = db.collection("courses");
    const enrollmentsCollection = db.collection("enrollments");
    console.log("✅ Connected to MongoDB");

    
    const router = express.Router();

    
    router.post("/courses", async (req, res) => {
      const result = await coursesCollection.insertOne(req.body);
      res.status(201).json({ success: true, data: result });
    });

    
    router.get("/courses", async (req, res) => {
      const { owner, category } = req.query;
      const filter = {};
      if (owner) filter.instructorEmail = owner;
      if (category) filter.category = category;
      const courses = await coursesCollection.find(filter).toArray();
      res.json(courses);
    });

    
    router.get("/courses/:id", async (req, res) => {
      const course = await coursesCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.json(course);
    });

    
    router.put("/courses/:id", async (req, res) => {
      const update = await coursesCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.json(update);
    });

    
    router.get("/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { _id: id };
    const course = await coursesCollection.findOne(query);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    console.error("Error fetching course:", err);
    res.status(500).json({ message: "Server error" });
  }
});


     
    router.post("/enroll", async (req, res) => {
      const result = await enrollmentsCollection.insertOne({
        ...req.body,
        enrolledAt: new Date(),
      });
      res.json(result);
    });

 
    router.get("/enrolled", async (req, res) => {
      const { email } = req.query;
      const enrolled = await enrollmentsCollection
        .find({ userEmail: email })
        .toArray();
      res.json(enrolled);
    });

    
    app.use("/api", router);

    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
  } catch (error) {
    console.error(" Server initialization error:", error);
  }
}

run().catch(console.dir);
