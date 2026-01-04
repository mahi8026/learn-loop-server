const { MongoClient, ObjectId } = require("mongodb");

// Global variables for connection reuse
let client;
let db;
let enrollmentsCollection;
let coursesCollection;

async function connectDB() {
  if (!db) {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db("learnloopDB");
    enrollmentsCollection = db.collection("enrollments");
    coursesCollection = db.collection("courses");
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://learn-loop-edcf7.web.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    try {
      await connectDB();
      const enrollment = req.body;

      console.log("Processing enrollment:", enrollment);

      // Check if user is already enrolled
      const existingEnrollment = await enrollmentsCollection.findOne({
        userEmail: enrollment.userEmail,
        courseId: enrollment.courseId,
      });

      if (existingEnrollment) {
        return res
          .status(400)
          .json({ message: "Already enrolled in this course" });
      }

      // Create enrollment record
      const result = await enrollmentsCollection.insertOne({
        ...enrollment,
        enrolledAt: new Date(),
      });

      // Update course enrollment count
      await coursesCollection.updateOne(
        { _id: new ObjectId(enrollment.courseId) },
        { $inc: { totalEnrolled: 1 } }
      );

      res.status(201).json({
        success: true,
        result,
        message: "Successfully enrolled in course",
      });
    } catch (error) {
      console.error("Error enrolling user:", error);
      res.status(500).json({
        message: "Enrollment failed",
        error: error.message,
      });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
};
