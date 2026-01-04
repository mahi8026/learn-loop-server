const { MongoClient } = require("mongodb");

// Global variables for connection reuse
let client;
let db;
let enrollmentsCollection;

async function connectDB() {
  if (!db) {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db("learnloopDB");
    enrollmentsCollection = db.collection("enrollments");
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

  if (req.method === "GET") {
    try {
      await connectDB();
      const { email } = req.query;

      // Simple query for now - just get enrollments by email
      const enrollments = await enrollmentsCollection
        .find({ userEmail: email })
        .toArray();

      res.status(200).json(enrollments);
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
      res.status(500).json({ message: "Failed to fetch enrolled courses" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
};
