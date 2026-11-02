
const Opportunity = require("../models/Opportunity");

// GET all opportunities
const getOpportunities = async (req, res) => {
  try {
    const opportunities = await Opportunity.find()
      .sort({ createdAt: -1 });

    res.status(200).json(opportunities);
  } catch (error) {
    console.error("GET opportunities error:", error.message);

    res.status(500).json({
      message: "Failed to fetch opportunities"
    });
  }
};

// POST create opportunity (development only)
const createOpportunity = async (req, res) => {
  try {
    const { title, category, description, date } = req.body || {};

    const requiredFields = [title, category, description];

    if (
      requiredFields.some(
        (value) => typeof value !== "string" || !value.trim()
      )
    ) {
      return res.status(400).json({
        message: "Title, category and description are required"
      });
    }

    if (date !== undefined && typeof date !== "string") {
      return res.status(400).json({
        message: "Date must be text"
      });
    }

    const opportunity = await Opportunity.create({
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      ...(date !== undefined ? { date: date.trim() } : {})
    });

    res.status(201).json(opportunity);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message
      });
    }

    console.error("POST opportunities error:", error.message);

    res.status(500).json({
      message: "Failed to create opportunity"
    });
  }
};


const mongoose = require("mongoose");

// UPDATE an opportunity
const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid opportunity ID"
      });
    }

    const allowedFields = [
      "title",
      "category",
      "description",
      "date"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        if (
          typeof req.body[field] !== "string" ||
          !req.body[field].trim()
        ) {
          return res.status(400).json({
            message: `Invalid value for ${field}`
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided"
      });
    }

    const opportunity =
      await Opportunity.findByIdAndUpdate(
        id,
        { $set: updates },
        {
          new: true,
          runValidators: true
        }
      );

    if (!opportunity) {
      return res.status(404).json({
        message: "Opportunity not found"
      });
    }

    return res.status(200).json(opportunity);
  } catch (error) {
    console.error("Update error:", error.message);

    return res.status(500).json({
      message: "Failed to update opportunity"
    });
  }
};

// DELETE an opportunity
const deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid opportunity ID"
      });
    }

    const opportunity =
      await Opportunity.findByIdAndDelete(id);

    if (!opportunity) {
      return res.status(404).json({
        message: "Opportunity not found"
      });
    }

    return res.status(200).json({
      message: "Opportunity deleted successfully"
    });
  } catch (error) {
    console.error("Delete error:", error.message);

    return res.status(500).json({
      message: "Failed to delete opportunity"
    });
  }
};

module.exports = {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity
};
