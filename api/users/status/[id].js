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

  if (req.method === "PATCH") {
    try {
      await connectDB();
      const { id } = req.query;
      const { status } = req.body;

      console.log(`Updating user ${id} status to ${status}`);

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error updating user status:", error);
      res
        .status(500)
        .json({
          message: "Failed to update user status",
          error: error.message,
        });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
};
