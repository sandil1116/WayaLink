
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

function AuthPage({ initialMode = "login" }) {
  const navigate = useNavigate();

  const { user, token, login, logout } = useAuth();

  const [mode, setMode] = useState(initialMode);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  // Update form values
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // Student registration and login
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    const isRegister = mode === "register";

    try {
      const response = await fetch(
        isRegister
          ? "/api/auth/register"
          : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            isRegister
              ? {
                  name: form.name.trim(),
                  email: form.email.trim(),
                  password: form.password
                }
              : {
                  email: form.email.trim(),
                  password: form.password
                }
          )
        }
      );

      const responseText = await response.text();

      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error("Invalid response from backend");
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          `Request failed (${response.status})`
        );
      }

      if (isRegister) {
        // Switch to login after registration
        setMode("login");

        setForm({
          name: "",
          email: form.email.trim(),
          password: ""
        });

        setSuccess(
          "Registration successful! Please log in."
        );
      } else {
        if (!data.token || !data.user) {
          throw new Error("Incomplete login response");
        }

        if (data.user.role !== "student") {
          throw new Error(
            "This page is for students. Administrators must use /admin."
          );
        }

        // Store student session in AuthContext
        login(data.user, data.token);

        setProfileUser(null);

        setForm({
          name: "",
          email: "",
          password: ""
        });

        setSuccess("Login successful!");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh student profile from MongoDB
  const loadProfile = async () => {
    if (!token || profileLoading) return;

    setError("");
    setSuccess("");
    setProfileLoading(true);

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const responseText = await response.text();

      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error("Invalid profile response");
      }

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          setProfileUser(null);
        }

        throw new Error(
          data.message || "Failed to load profile"
        );
      }

      if (!data.user) {
        throw new Error("Profile information missing");
      }

      if (data.user.role !== "student") {
        logout();
        setProfileUser(null);
        throw new Error("Student access required");
      }

      setProfileUser(data.user);

      // Keep shared authentication context updated
      login(data.user, token);

      setSuccess("Profile refreshed successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    logout();

    setProfileUser(null);
    setForm({
      name: "",
      email: "",
      password: ""
    });

    setError("");
    setSuccess("");
    setMode("login");

    navigate("/login", { replace: true });
  };

  const currentUser = profileUser || user;

  // Logged-in student screen
  if (currentUser?.role === "student" && token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Welcome to WayaLink!</h1>

          <p>
            You are successfully logged in.
            Explore opportunities and manage
            your student account.
          </p>

          {error && (
            <p
              className="auth-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="auth-success"
              role="status"
            >
              {success}
            </p>
          )}

          {/* Student account information */}
          <div className="auth-profile">
            <h2>Student Account</h2>

            <p>
              <strong>Name:</strong>{" "}
              {currentUser.name}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {currentUser.email}
            </p>

            <p>
              <strong>Role:</strong>{" "}
              {currentUser.role}
            </p>
          </div>

          {/* Profile navigation */}
          <Link
            to="/profile"
            className="auth-navigation-link"
          >
            View My Profile
          </Link>

          <button
            type="button"
            onClick={loadProfile}
            disabled={profileLoading}
          >
            {profileLoading
              ? "Refreshing..."
              : "Refresh My Profile"}
          </button>

          {/* Opportunities navigation */}
          <button
            type="button"
            onClick={() => navigate("/opportunities")}
          >
            Explore Opportunities
          </button>

          
            <button
            type="button"
            onClick={() => navigate("/opportunities?view=saved")}
            >
            My Saved Opportunities
            </button>


          <button
            type="button"
            onClick={() => {
              navigate("/opportunities");
            }}
          >
            My Applications
          </button>

          {/* Logout */}
          <button
            type="button"
            className="auth-secondary"
            onClick={handleLogout}
          >
            Logout
          </button>

          <Link to="/">
            Back to WayaLink Home
          </Link>
        </section>
      </main>
    );
  }

  // Student registration/login screen
  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >
        <h1>WayaLink</h1>

        <h2>
          {mode === "login"
            ? "Student Login"
            : "Create Student Account"}
        </h2>

        <p>
          Discover opportunities and shape your future.
        </p>

        {error && (
          <p
            className="auth-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="auth-success"
            role="status"
          >
            {success}
          </p>
        )}

        {mode === "register" && (
          <>
            <label htmlFor="student-name">
              Full Name
            </label>

            <input
              id="student-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </>
        )}

        <label htmlFor="student-email">
          Email
        </label>

        <input
          id="student-email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="student-password">
          Password
        </label>

        <input
          id="student-password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          autoComplete={
            mode === "register"
              ? "new-password"
              : "current-password"
          }
          minLength={
            mode === "register" ? 12 : undefined
          }
          required
        />

        {mode === "register" && (
          <small>
            Use at least 12 characters.
            Maximum 72 UTF-8 bytes.
          </small>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </button>

        <p className="auth-switch">
          {mode === "login"
            ? "Don't have an account?"
            : "Already registered?"}

          {" "}

          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              );

              setError("");
              setSuccess("");
              setForm((previous) => ({
                ...previous,
                password: ""
              }));
            }}
          >
            {mode === "login"
              ? "Register"
              : "Login"}
          </button>
        </p>

        <Link to="/">
          Back to Home
        </Link>
      </form>
    </main>
  );
}

export default AuthPage;
