
const mongoose = require("mongoose");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");

// GET saved opportunities
const getSavedOpportunities = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("savedOpportunities");

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    const saved = (user.savedOpportunities || [])
      .filter(Boolean);

    return res.status(200).json(saved);
  } catch (error) {
    console.error("Get saved opportunities:", error.message);

    return res.status(500).json({
      message: "Failed to load saved opportunities"
    });
  }
};

// POST save opportunity
const saveOpportunity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid opportunity ID"
      });
    }

    const opportunity = await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        message: "Opportunity not found"
      });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { savedOpportunities: opportunity._id } }
    );

    return res.status(200).json({
      message: "Opportunity saved successfully"
    });
  } catch (error) {
    console.error("Save opportunity:", error.message);

    return res.status(500).json({
      message: "Failed to save opportunity"
    });
  }
};

// DELETE unsave opportunity
const unsaveOpportunity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid opportunity ID"
      });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { savedOpportunities: new mongoose.Types.ObjectId(id) } }
    );

    return res.status(200).json({
      message: "Opportunity removed from saved list"
    });
  } catch (error) {
    console.error("Unsave opportunity:", error.message);

    return res.status(500).json({
      message: "Failed to remove saved opportunity"
    });
  }
};

module.exports = {
  getSavedOpportunities,
  saveOpportunity,
  unsaveOpportunity
};
