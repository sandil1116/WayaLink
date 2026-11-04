
const mongoose = require("mongoose");

const studentPreferenceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    interests: {
      type: [String],
      default: []
    },

    skills: {
      type: [String],
      default: []
    },

    preferredCategories: {
      type: [String],
      default: []
    },

    careerGoal: {
      type: String,
      default: "",
      maxlength: 300
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "StudentPreference",
  studentPreferenceSchema
);
