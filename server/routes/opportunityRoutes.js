
const express = require("express");

const {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity
} = require("../controllers/opportunityController");

const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// Public
router.get("/", getOpportunities);

// Admin only
router.post("/", protect, requireRole("admin"), createOpportunity);

router.put("/:id", protect, requireRole("admin"), updateOpportunity);

router.delete("/:id", protect, requireRole("admin"), deleteOpportunity);

module.exports = router;
