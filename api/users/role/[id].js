const { MongoClient, ObjectId } = require("mongodb");

// Global variables for connection reuse
let client;
let db;
let usersCollection;

async function connectDB() {
  if (!db) {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db("learnloopDB");
    usersCollection = db.collection("users");
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
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
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
      // Get user role by email (id parameter is actually email)
      const { id } = req.query; // This is actually the email
      console.log(`Fetching role for email: ${id}`);

      const user = await usersCollection.findOne({ email: id });
      res.status(200).json(user || { role: "student" });
    } else if (req.method === "PATCH") {
      // Update user role by ID
      const { id } = req.query;
      const { role } = req.body;

      console.log(`Updating user ${id} role to ${role}`);

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );

      res.status(200).json(result);
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error in users/role API:", error);
    res
      .status(500)
      .json({ message: "Failed to process request", error: error.message });
  }
};
