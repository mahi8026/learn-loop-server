module.exports = (req, res) => {
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

  res.status(200).json({
    message: "Test endpoint working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    mongoUri: process.env.MONGO_URI ? "Set" : "Not Set",
    jwtSecret: process.env.ACCESS_TOKEN_SECRET ? "Set" : "Not Set",
  });
};
