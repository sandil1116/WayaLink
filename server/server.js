
const express = require("express");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());

// First API endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "WayaLink backend is running!"
  });
});

// Second API endpoint
app.get("/api/welcome", (req, res) => {
  res.json({
    message: "Welcome to WayaLink!"
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`WayaLink server running on port ${PORT}`);
});
