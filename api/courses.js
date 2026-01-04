const { MongoClient } = require("mongodb");

// Global variables for connection reuse
let client;
let db;
let coursesCollection;

async function connectDB() {
  if (!db) {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db("learnloopDB");
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

  try {
    await connectDB();

    if (req.method === "GET") {
      // Parse query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const owner = url.searchParams.get("owner");
      const category = url.searchParams.get("category");

      let query = {};
      if (owner) {
        query.instructorEmail = owner;
      } else {
        query.status = "approved";
      }
      if (category && category !== "all") {
        query.category = category;
      }

      const courses = await coursesCollection.find(query).toArray();
      res.status(200).json(courses);
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error in courses API:", error);
    res.status(500).json({
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};
