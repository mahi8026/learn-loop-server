// Simple redirect to API
module.exports = (req, res) => {
  res.json({
    message: "LearnLoop Server is running!",
    api: "/api",
  });
};
