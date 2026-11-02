
require("dotenv").config();
const applicationRoutes = require("./routes/applicationRoutes");
const express = require("express");
const connectDB = require("./config/db");

// Import routes
const opportunityRoutes = require("./routes/opportunityRoutes");
const authRoutes = require("./routes/authRoutes");
const savedOpportunityRoutes = require("./routes/savedOpportunityRoutes");

const app = express();

const PORT = process.env.PORT || 5002;

// Middleware
app.use(express.json({ limit: "20kb" }));

// Request logger
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health check API
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "WayaLink backend is running!"
  });
});

// Welcome API
app.get("/api/welcome", (req, res) => {
  return res.status(200).json({
    message: "Welcome to WayaLink!"
  });
});

// Public opportunities and admin CRUD
app.use("/api/opportunities", opportunityRoutes);

// Student registration and login
app.use("/api/auth", authRoutes);

// Student saved opportunities
app.use("/api/saved", savedOpportunityRoutes);
app.use("/api/applications", applicationRoutes);

// Unknown API endpoints
app.use("/api", (req, res) => {
  return res.status(404).json({
    message: "API endpoint not found",
    method: req.method,
    path: req.originalUrl
  });
});

// General error handler
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error.message);

  return res.status(500).json({
    message: "Internal server error"
  });
});

// Start server after MongoDB connects
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log("================================");
      console.log("WayaLink Backend Started");
      console.log(`PORT: ${PORT}`);
      console.log(
        `Environment: ${process.env.NODE_ENV || "not set"}`
      );
      console.log("Routes mounted:");
      console.log("  /api/health");
      console.log("  /api/welcome");
      console.log("  /api/opportunities");
      console.log("  /api/auth");
      console.log("  /api/saved");
      console.log("================================");
    });

    server.on("error", (error) => {
      console.error("Server error:", error.message);
      process.exit(1);
    });

  } catch (error) {
    console.error(
      "Failed to start WayaLink:",
      error.message
    );
    process.exit(1);
  }
};

startServer();
