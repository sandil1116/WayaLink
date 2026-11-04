
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const User = require("../models/User");
const RefreshSession = require("../models/RefreshSession");

const COOKIE_NAME = "wayalink_refresh";

const REFRESH_DURATION_MS =
  7 * 24 * 60 * 60 * 1000;

// =====================================
// HELPER FUNCTIONS
// =====================================

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

const createAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      sub: user._id.toString()
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "15m",
      issuer: "wayalink-api",
      audience: "wayalink-client"
    }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashRefreshToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth"
});

const setRefreshCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: REFRESH_DURATION_MS
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

// Basic browser-origin protection for cookie endpoints.
// Deploy the frontend and /api through the same origin.
const isAllowedOrigin = (req) => {
  const origin = req.get("Origin");

  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return false;
    }

    if (process.env.NODE_ENV === "production") {
      const allowed = process.env.CLIENT_ORIGIN;

      if (!allowed) {
        return false;
      }

      return origin === allowed.replace(/\/$/, "");
    }

    return (
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(
        parsed.hostname
      )
    );
  } catch {
    return false;
  }
};

// =====================================
// REGISTER NEW STUDENT
// =====================================

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
      )
    ) {
      return res.status(400).json({
        message:
          "Please enter a valid name, email and password"
      });
    }

    if (
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 12 characters and no more than 72 bytes"
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          "An account with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "student"
    });

    return res.status(201).json({
      message: "Registration successful",
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "An account with this email already exists"
      });
    }

    console.error(
      "Registration failed:",
      error.message
    );

    return res.status(500).json({
      message: "Registration failed"
    });
  }
};

// =====================================
// LOGIN STUDENT OR ADMIN
// =====================================

const loginUser = async (req, res) => {
  try {
    if (!isAllowedOrigin(req)) {
      return res.status(403).json({
        message: "Request origin not allowed"
      });
    }

    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const loginIdentifier = email.trim();
    let user = await User.findOne({
      email: loginIdentifier.toLowerCase()
    }).select("+password");

    if (!user) {
      const escapedIdentifier = loginIdentifier.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const matchingAdmins = await User.find({
        name: new RegExp(`^${escapedIdentifier}$`, "i"),
        role: "admin"
      })
        .select("+password")
        .limit(2);

      if (matchingAdmins.length === 1) {
        user = matchingAdmins[0];
      }
    }

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const accessToken = createAccessToken(user);

    // A previous student cookie must not survive
    // a new login on this browser.
    const oldToken = req.cookies?.[COOKIE_NAME];

    if (oldToken) {
      await RefreshSession.deleteOne({
        tokenHash: hashRefreshToken(oldToken)
      });
    }

    clearRefreshCookie(res);

    // Only students receive persistent refresh sessions.
    // Admins continue using the separate admin login.
    if (user.role === "student") {
      const refreshToken = generateRefreshToken();

      await RefreshSession.create({
        user: user._id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(
          Date.now() + REFRESH_DURATION_MS
        )
      });

      setRefreshCookie(res, refreshToken);
    }

    return res.status(200).json({
      message: "Login successful",
      token: accessToken,
      tokenType: "Bearer",
      user: publicUser(user)
    });
  } catch (error) {
    console.error(
      "Login failed:",
      error.message
    );

    return res.status(500).json({
      message: "Login failed"
    });
  }
};

// =====================================
// REFRESH STUDENT SESSION
// =====================================

const refreshUser = async (req, res) => {
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({
      message: "Request origin not allowed"
    });
  }

  const oldToken = req.cookies?.[COOKIE_NAME];

  if (
    typeof oldToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(oldToken)
  ) {
    clearRefreshCookie(res);

    return res.status(401).json({
      message: "No valid refresh session"
    });
  }

  try {
    const nextToken = generateRefreshToken();

    // Atomically rotate the refresh token.
    const session = await RefreshSession.findOneAndUpdate(
      {
        tokenHash: hashRefreshToken(oldToken),
        expiresAt: { $gt: new Date() }
      },
      {
        $set: {
          tokenHash: hashRefreshToken(nextToken),
          expiresAt: new Date(
            Date.now() + REFRESH_DURATION_MS
          )
        }
      },
      { new: true }
    );

    if (!session) {
      clearRefreshCookie(res);

      return res.status(401).json({
        message: "Refresh session expired or invalid"
      });
    }

    const user = await User.findById(session.user);

    if (!user || user.role !== "student") {
      await RefreshSession.deleteOne({
        _id: session._id
      });

      clearRefreshCookie(res);

      return res.status(401).json({
        message: "Student session is no longer valid"
      });
    }

    const accessToken = createAccessToken(user);

    setRefreshCookie(res, nextToken);

    return res.status(200).json({
      message: "Session restored",
      token: accessToken,
      tokenType: "Bearer",
      user: publicUser(user)
    });
  } catch (error) {
    console.error(
      "Session refresh failed:",
      error.message
    );

    return res.status(500).json({
      message: "Could not refresh session"
    });
  }
};

// =====================================
// LOGOUT STUDENT
// =====================================

const logoutUser = async (req, res) => {
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({
      message: "Request origin not allowed"
    });
  }

  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (token) {
      await RefreshSession.deleteOne({
        tokenHash: hashRefreshToken(token)
      });
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error(
      "Logout failed:",
      error.message
    );

    return res.status(500).json({
      message: "Logout failed"
    });
  }
};

// =====================================
// EXPORT ALL CONTROLLERS
// =====================================

module.exports = {
  registerUser,
  loginUser,
  refreshUser,
  logoutUser
};
