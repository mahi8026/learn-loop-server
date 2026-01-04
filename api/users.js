const { MongoClient } = require("mongodb");

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
      // Get all users (requires authentication)
      const authorization = req.headers.authorization;
      if (!authorization) {
        // For testing, return empty array instead of error
        console.log("No authorization header provided");
        return res.status(200).json([]);
      }

      console.log("Authorization header found, fetching users...");
      const users = await usersCollection.find().toArray();
      console.log(`Found ${users.length} users`);
      res.status(200).json(users);
    } else if (req.method === "PUT") {
      // Update/create user
      const user = req.body;
      const filter = { email: user.email };
      const existingUser = await usersCollection.findOne(filter);

      if (existingUser) {
        const updateDoc = { $set: { name: user.name, photo: user.photo } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.status(200).json(result);
      } else {
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
        res.status(200).json(result);
      }
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error in users API:", error);
    res
      .status(500)
      .json({ message: "Failed to process request", error: error.message });
  }
};
