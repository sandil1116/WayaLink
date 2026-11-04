
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const { protect } = require("../middleware/authMiddleware");
const {
  askOpportunityAI
} = require("../controllers/aiController");

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message:
      "Too many AI requests. Please try again shortly."
  }
});

router.post(
  "/chat",
  protect,
  aiLimiter,
  askOpportunityAI
);

module.exports = router;
