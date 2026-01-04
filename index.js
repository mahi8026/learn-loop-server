const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- MIDDLEWARES ---
const corsOptions = {
  origin: "https://learn-loop-edcf7.web.app",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// Basic test routes
app.get("/", (req, res) => {
  res.json({ message: "LearnLoop Server is running!" });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    mongoUri: process.env.MONGO_URI ? "Set" : "Not Set",
    jwtSecret: process.env.ACCESS_TOKEN_SECRET ? "Set" : "Not Set",
  });
});

// Export for Vercel
module.exports = app;
