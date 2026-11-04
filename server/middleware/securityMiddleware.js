
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

// Add standard HTTP security headers
const securityHeaders = helmet();

// General protection for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later."
  }
});

// Registration: limit account creation attempts
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Registration limit reached. Try again later."
  }
});

// Login: slow repeated password attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message: "Too many login attempts. Try again later."
  }
});

// Refresh: restrict excessive session requests
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many session requests. Try again later."
  }
});

module.exports = {
  securityHeaders,
  apiLimiter,
  registrationLimiter,
  loginLimiter,
  refreshLimiter
};
