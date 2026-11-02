
const mongoose = require("mongoose");

const Application = require("../models/Application");
const Opportunity = require("../models/Opportunity");

// Student submits an application
const applyToOpportunity = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { message = "" } = req.body || {};

    if (!mongoose.isValidObjectId(opportunityId)) {
      return res.status(400).json({
        message: "Invalid opportunity ID"
      });
    }

    if (
      typeof message !== "string" ||
      message.length > 1000
    ) {
      return res.status(400).json({
        message: "Message must be 1000 characters or fewer"
      });
    }

    const opportunity = await Opportunity.findById(
      opportunityId
    );

    if (!opportunity) {
      return res.status(404).json({
        message: "Opportunity not found"
      });
    }

    const existing = await Application.findOne({
      student: req.user._id,
      opportunity: opportunityId
    });

    if (existing) {
      return res.status(409).json({
        message: "You have already applied to this opportunity"
      });
    }

    const application = await Application.create({
      student: req.user._id,
      opportunity: opportunityId,
      message: message.trim(),
      status: "pending"
    });

    return res.status(201).json({
      message: "Application submitted successfully",
      application
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already applied to this opportunity"
      });
    }

    console.error("Application error:", error.message);

    return res.status(500).json({
      message: "Failed to submit application"
    });
  }
};

// Student views own applications
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({
      student: req.user._id
    })
      .populate("opportunity", "title category description date")
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);

  } catch (error) {
    console.error("My applications error:", error.message);

    return res.status(500).json({
      message: "Failed to load applications"
    });
  }
};

// Admin views all applications
const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("student", "name email")
      .populate("opportunity", "title category date")
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);

  } catch (error) {
    console.error("Admin applications error:", error.message);

    return res.status(500).json({
      message: "Failed to load applications"
    });
  }
};

// Admin updates an application's status
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid application ID"
      });
    }

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid application status"
      });
    }

    const application = await Application.findByIdAndUpdate(
      id,
      { $set: { status } },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!application) {
      return res.status(404).json({
        message: "Application not found"
      });
    }

    return res.status(200).json({
      message: "Application status updated successfully",
      application
    });

  } catch (error) {
    console.error("Status update error:", error.message);

    return res.status(500).json({
      message: "Failed to update application"
    });
  }
};

module.exports = {
  applyToOpportunity,
  getMyApplications,
  getAllApplications,
  updateApplicationStatus
};
