module.exports = (req, res) => {
  res.status(200).json({
    message: "LearnLoop Server is running!",
    timestamp: new Date().toISOString(),
    api: "/api",
  });
};
