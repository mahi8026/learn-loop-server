const { MongoClient, ObjectId } = require("mongodb");

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

  if (req.method === "GET") {
    try {
      await connectDB();
      const { id } = req.query;

      console.log(`Fetching course with ID: ${id}`);

      // Try to find by ObjectId first, then by string ID
      let query;
      if (ObjectId.isValid(id)) {
        query = { _id: new ObjectId(id) };
      } else {
        query = { _id: id };
      }

      const course = await coursesCollection.findOne(query);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.status(200).json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch course", error: error.message });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
};
