const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// --- MIDDLEWARES ---
app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.0.114:5173", "https://your-frontend-domain.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Global variables for collections to be reused in serverless environment
let db, usersCollection, coursesCollection, enrollmentsCollection;

// --- DATABASE CONNECTION HELPER ---
async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("learnloopDB");
    usersCollection = db.collection("users");
    coursesCollection = db.collection("courses");
    enrollmentsCollection = db.collection("enrollments");
    console.log("✅ Connected to MongoDB");
  }
}

// Ensure DB is connected before processing any request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error: Database Connection Failed" });
  }
});

// --- AUTH MIDDLEWARES ---
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized Access: No Token Provided" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access: Invalid Token" });
    }
    req.decoded = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await usersCollection.findOne({ email });
  if (user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden Access: Admin Only" });
  }
  next();
};

// --- ROUTES ---
const router = express.Router();

// 1. JWT Generation
router.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "24h" });
  res.send({ token });
});

// 2. User Routes
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
  const result = await usersCollection.updateOne(filter, addNew, { upsert: true });
  res.json(result);
});

router.get("/users/role/:email", async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });
  res.send(user || { role: "student" });
});

router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
});

router.patch("/users/role/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const { role } = req.body;
  const result = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { role } });
  res.send(result);
});

router.patch("/users/status/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  const result = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
  res.send(result);
});

// 3. Course Routes
router.get("/courses", async (req, res) => {
  try {
    const { owner, category } = req.query;
    let query = {};
    if (owner) {
      query.instructorEmail = owner;
    } else {
      query.status = "approved";
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

router.get("/courses/:id", async (req, res) => {
  const id = req.params.id;
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
  const course = await coursesCollection.findOne(query);
  res.json(course);
});

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

router.patch("/courses/status/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, feedback } = req.body;
  const result = await coursesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, feedback: feedback || "" } }
  );
  res.json(result);
});

// 4. Enrollment Routes
router.post("/enroll", verifyToken, async (req, res) => {
  const enrollment = req.body;
  try {
    const result = await enrollmentsCollection.insertOne({
      ...enrollment,
      enrolledAt: new Date(),
    });
    await coursesCollection.updateOne(
      { _id: new ObjectId(enrollment.courseId) },
      { $inc: { totalEnrolled: 1 } }
    );
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).send({ message: "Enrollment failed" });
  }
});

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

router.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
  const users = await usersCollection.estimatedDocumentCount();
  const courses = await coursesCollection.countDocuments({ status: "approved" });
  const enrollments = await enrollmentsCollection.estimatedDocumentCount();

  // Simple aggregation for revenue if you have a price field
  const revenueResult = await enrollmentsCollection.aggregate([
    { $group: { _id: null, total: { $sum: "$price" } } }
  ]).toArray();
  
  const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

  res.send({
    totalUsers: users,
    totalCourses: courses,
    totalEnrollments: enrollments,
    totalRevenue: revenue
  });
});

// --- BASE & APP EXPORT ---
app.use("/api", router);

app.get("/", (req, res) => {
  res.send("LearnLoop Server is running!");
});

// Only listen locally, Vercel uses the exported module
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
}

module.exports = app;