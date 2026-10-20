
const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      default: "To be announced",
    },
  },
  {
    timestamps: true,
  }
);

const Opportunity = mongoose.model(
  "Opportunity",
  opportunitySchema
);

module.exports = Opportunity;
