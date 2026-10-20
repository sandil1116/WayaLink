
require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const Opportunity = require("./models/Opportunity");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware to handle JSON requests
app.use(express.json());

// Health check API
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "WayaLink backend is running!"
  });
});

// Welcome API
app.get("/api/welcome", (req, res) => {
  res.json({
    message: "Welcome to WayaLink!"
  });
});

// GET all opportunities from MongoDB
app.get("/api/opportunities", async (req, res) => {
  try {
    const opportunities = await Opportunity.find()
      .sort({ createdAt: -1 });

    res.status(200).json(opportunities);

  } catch (error) {
    console.error(
      "Error fetching opportunities:",
      error.message
    );

    res.status(500).json({
      message: "Failed to fetch opportunities"
    });
  }
});

// POST - Create a new opportunity
// Temporary development-only endpoint

if (process.env.NODE_ENV === "development") {

  app.post("/api/opportunities", async (req, res) => {
    try {
      const { title, category, description, date } = req.body || {};

      // Validate required fields
      if (
        [title, category, description].some(
          (value) =>
            typeof value !== "string" || !value.trim()
        )
      ) {
        return res.status(400).json({
          message: "Title, category and description are required"
        });
      }

      // Validate date
      if (date !== undefined && typeof date !== "string") {
        return res.status(400).json({
          message: "Date must be text"
        });
      }

      // Save the opportunity to MongoDB
      const newOpportunity = await Opportunity.create({
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        ...(date !== undefined
          ? { date: date.trim() }
          : {})
      });

      res.status(201).json(newOpportunity);

    } catch (error) {

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message
        });
      }

      console.error(
        "Error creating opportunity:",
        error.message
      );

      res.status(500).json({
        message: "Failed to create opportunity"
      });
    }
  });
}




console.log("NODE_ENV:", process.env.NODE_ENV);
console.log(
  "POST route enabled:",
  process.env.NODE_ENV === "development"
);


// Connect to MongoDB before starting Express
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(
      `WayaLink server running on port ${PORT}`
    );
  });
});
