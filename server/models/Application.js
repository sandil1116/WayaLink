
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Each student can apply only once per opportunity
applicationSchema.index(
  { student: 1, opportunity: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "Application",
  applicationSchema
);
