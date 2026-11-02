
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

// ======================================
// REGISTER NEW STUDENT
// ======================================

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate registration details
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        message: "Please enter a valid name, email and password"
      });
    }

    // Check password length
    if (
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Password must be at least 12 characters and no more than 72 bytes"
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already registered
    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    // Hash password before storing it
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create student account
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "student"
    });

    // Return response without password
    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      message: "Registration failed"
    });
  }
};

// ======================================
// LOGIN EXISTING STUDENT
// ======================================

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate login details
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

    // Find user and include hashed password
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    // Reject incorrect email
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Compare entered password with stored hash
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    // Reject incorrect password
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // Generate authentication token
    const token = jwt.sign(
      {
        sub: user._id.toString()
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "1h",
        issuer: "wayalink-api",
        audience: "wayalink-client"
      }
    );

    // Return login response
    return res.status(200).json({
      message: "Login successful",
      token,
      tokenType: "Bearer",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      message: "Login failed"
    });
  }
};

// ======================================
// EXPORT CONTROLLERS
// ======================================

module.exports = {
  registerUser,
  loginUser
};
