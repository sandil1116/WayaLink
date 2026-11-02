
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization ||
        !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. Token missing."
      });
    }

    const token = authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Not authorized. Token missing."
      });
    }

    // Verify token signature and expiration
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "wayalink-api",
        audience: "wayalink-client"
      }
    );

    // Retrieve the authenticated user
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists"
      });
    }

    req.user = user;
    next();

  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Authentication failed"
    });
  }
};

module.exports = { protect };
