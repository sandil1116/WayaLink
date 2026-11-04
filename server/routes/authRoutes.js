
const express = require("express");

const {
  registerUser,
  loginUser,
  refreshUser,
  logoutUser
} = require("../controllers/authController");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  registrationLimiter,
  loginLimiter,
  refreshLimiter
} = require("../middleware/securityMiddleware");

const router = express.Router();

// =====================================
// REGISTER STUDENT
// =====================================

router.post(
  "/register",
  registrationLimiter,
  registerUser
);

// =====================================
// LOGIN STUDENT OR ADMIN
// =====================================

router.post(
  "/login",
  loginLimiter,
  loginUser
);

// =====================================
// REFRESH STUDENT SESSION
// =====================================

router.post(
  "/refresh",
  refreshLimiter,
  refreshUser
);

// =====================================
// LOGOUT
// =====================================

router.post(
  "/logout",
  logoutUser
);

// =====================================
// GET AUTHENTICATED PROFILE
// =====================================

router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    message: "Profile retrieved successfully",
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

console.log("Authentication routes registered");

module.exports = router;
