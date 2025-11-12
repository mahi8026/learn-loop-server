const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

async function run() {
  try {
    await client.connect();
    const db = client.db("learnloopDB");
    const coursesCollection = db.collection("courses");
    const enrollmentsCollection = db.collection("enrollments");
    console.log(" Connected to MongoDB");

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

     router.delete("/courses/:id", async (req, res) => {
      const result = await coursesCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.json(result);
    });

    
    router.put("/courses/:id", async (req, res) => {
      const update = await coursesCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.json(update);
    });


    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
  } catch (error) {
    console.error(" Server initialization error:", error);
  }
}

run().catch(console.dir);
