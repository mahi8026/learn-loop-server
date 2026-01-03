const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// --- MIDDLEWARES ---
app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.0.114:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let usersCollection, coursesCollection, enrollmentsCollection;

// --- AUTH MIDDLEWARES ---

const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ message: "Unauthorized Access: No Token Provided" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ message: "Forbidden Access: Invalid Token" });
    }
    req.decoded = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await usersCollection.findOne({ email }); // Fetching live data
  
  if (user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden Access: Admin Only" });
  }
  next();
};

async function run() {
  try {
    await client.connect();
    const db = client.db("learnloopDB");

    // Initialize Collections
    coursesCollection = db.collection("courses");
    enrollmentsCollection = db.collection("enrollments");
    usersCollection = db.collection("users");

    console.log("✅ Connected to MongoDB - LearnLoop");

    const router = express.Router();

    // --- JWT GENERATION ---
    router.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    // --- USER ROUTES ---

    // Upsert User on Login
    router.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const existingUser = await usersCollection.findOne(filter);

      if (existingUser) {
        const updateDoc = { $set: { name: user.name, photo: user.photo } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        return res.json(result);
      }

      const addNew = {
        $set: {
          ...user,
          role: "student",
          status: "active",
          createdAt: new Date(),
        },
      };
      const result = await usersCollection.updateOne(filter, addNew, {
        upsert: true,
      });
      res.json(result);
    });

    // Get User Role (For Dashboard Navigation)
    router.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send(user || { role: "student" });
    });

    router.patch(
      "/users/role/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const { role } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { role: role } };

        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    router.patch(
      "/users/status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const { status } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { status: status } };

        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // --- COURSE ROUTES ---

    // Public All Courses / Instructor Drafts
    router.get("/courses", async (req, res) => {
      try {
        const { owner, category } = req.query;
        let query = {};

        if (owner) {
          query.instructorEmail = owner; // For Instructor Dashboard
        } else {
          query.status = "approved"; // For Public Listing Page
        }

        if (category && category !== "all") {
          query.category = category;
        }

        const result = await coursesCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch courses" });
      }
    });

    // Single Course Details (Publicly accessible)
    router.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = ObjectId.isValid(id)
        ? { _id: new ObjectId(id) }
        : { _id: id };
      const course = await coursesCollection.findOne(query);
      res.json(course);
    });

    // Add New Course (Requirement 6)
    router.post("/courses", verifyToken, async (req, res) => {
      const course = {
        ...req.body,
        status: "pending",
        totalEnrolled: 0,
        createdAt: new Date(),
      };
      const result = await coursesCollection.insertOne(course);
      res.status(201).json(result);
    });

    // Admin: Change Status & Add Feedback (Requirement 8)
    router.patch(
      "/courses/status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const { status, feedback } = req.body;
        const result = await coursesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, feedback: feedback || "" } }
        );
        res.json(result);
      }
    );

    // --- ENROLLMENT ROUTES (Requirement 7) ---

    router.post("/enroll", verifyToken, async (req, res) => {
      const enrollment = req.body;
      try {
        // Record enrollment
        const result = await enrollmentsCollection.insertOne({
          ...enrollment,
          enrolledAt: new Date(),
        });

        // Atomic Increment for Popularity Sorting
        await coursesCollection.updateOne(
          { _id: new ObjectId(enrollment.courseId) },
          { $inc: { totalEnrolled: 1 } }
        );

        res.json({ success: true, result });
      } catch (err) {
        res.status(500).send({ message: "Enrollment failed" });
      }
    });

    // Get My Enrolled Courses
    router.get("/enrolled/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const result = await enrollmentsCollection
        .aggregate([
          { $match: { userEmail: email } },
          {
            $lookup: {
              from: "courses",
              let: { courseId: "$courseId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", { $toObjectId: "$$courseId" }] },
                  },
                },
              ],
              as: "courseDetails",
            },
          },
          { $unwind: "$courseDetails" },
        ])
        .toArray();

      res.send(result);
    });

    // --- START SERVER ---
    app.use("/api", router);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`LearnLoop Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database Connection Error:", error);
  }
}

run().catch(console.dir);
