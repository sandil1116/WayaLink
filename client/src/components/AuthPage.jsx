
import { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate
} from "react-router-dom";

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

function AuthPage({ initialMode = "login" }) {
  const navigate = useNavigate();
  const { user, token, authReady, login } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setShowPassword(false);

    setForm((previous) => ({
      ...previous,
      password: ""
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const endpoint = isRegister
        ? "/api/auth/register"
        : "/api/auth/login";

      const payload = isRegister
        ? {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password
          }
        : {
            email: form.email.trim(),
            password: form.password
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          `Request failed (${response.status})`
        );
      }

      if (isRegister) {
        setForm({
          name: "",
          email: form.email.trim(),
          password: ""
        });

        setMode("login");
        setSuccess(
          "Account created! Sign in to continue."
        );
      } else {
        if (!data.user || !data.token) {
          throw new Error("Incomplete login response");
        }

        if (data.user.role !== "student") {
          throw new Error(
            "Administrator accounts must sign in through /admin."
          );
        }

        login(data.user, data.token);

        // Go directly to the new student dashboard.
        navigate("/profile", { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <main className="auth2-loading">
        <span className="auth2-spinner" />
        <p>Preparing WayaLink...</p>
      </main>
    );
  }

  if (user?.role === "admin" && token) {
  return <Navigate to="/admin" replace />;
}
  // Returning students skip the login screen.
  if (user?.role === "student" && token) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <main className="auth2-page">
      <div className="auth2-shell">

        {/* Left visual panel */}
        <section className="auth2-showcase">
          <Link to="/" className="auth2-logo">
            <span className="auth2-logo-icon">
              <GraduationCap size={24} />
            </span>
            WayaLink
          </Link>

          <div className="auth2-showcase-content">
            <span className="auth2-overline">
              YOUR CAMPUS. YOUR FUTURE.
            </span>

            <h1>
              Your next big
              <br />
              opportunity
              <br />
              <span>starts here.</span>
            </h1>

            <p>
              One intelligent platform for discovering
              university events, building your career,
              and connecting with opportunities
              that matter.
            </p>

            <div className="auth2-feature-stack">
              <div className="auth2-feature">
                <div className="auth2-feature-icon">
                  <Sparkles size={20} />
                </div>
                <div>
                  <strong>AI-powered discovery</strong>
                  <small>
                    Discover opportunities with Gemini AI.
                  </small>
                </div>
              </div>

              <div className="auth2-feature">
                <div className="auth2-feature-icon">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <strong>Everything in one place</strong>
                  <small>
                    Manage applications, saved listings,
                    and your progress.
                  </small>
                </div>
              </div>

              <div className="auth2-feature">
                <div className="auth2-feature-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong>Your personal workspace</strong>
                  <small>
                    A secure dashboard built for students.
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="auth2-showcase-footer">
            Designed for ambitious students.
            <ArrowUpRight size={17} />
          </div>
        </section>

        {/* Right authentication panel */}
        <section className="auth2-form-side">
          <div className="auth2-form-top">
            <span className="auth2-mobile-brand">
              WayaLink
            </span>

            <Link to="/" className="auth2-back">
              Back to home <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="auth2-form-container">
            <div className="auth2-form-heading">
              <span className="auth2-kicker">
                STUDENT PORTAL
              </span>

              <h2>
                {isRegister
                  ? "Create your account"
                  : "Welcome back"}
              </h2>

              <p>
                {isRegister
                  ? "Join WayaLink and begin your journey."
                  : "Sign in to access your personal workspace."}
              </p>
            </div>

            <div className="auth2-mode-tabs">
              <button
                type="button"
                className={!isRegister ? "active" : ""}
                onClick={() => changeMode("login")}
              >
                Sign In
              </button>

              <button
                type="button"
                className={isRegister ? "active" : ""}
                onClick={() => changeMode("register")}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="auth2-alert auth2-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="auth2-alert auth2-success" role="status">
                {success}
              </div>
            )}

            <form
              className="auth2-form"
              onSubmit={handleSubmit}
            >
              {isRegister && (
                <div className="auth2-field">
                  <label htmlFor="auth2-name">
                    Full name
                  </label>

                  <div className="auth2-input-wrap">
                    <UserRound size={19} />

                    <input
                      id="auth2-name"
                      type="text"
                      name="name"
                      placeholder="Your full name"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="auth2-field">
                <label htmlFor="auth2-email">
                  Email address
                </label>

                <div className="auth2-input-wrap">
                  <Mail size={19} />

                  <input
                    id="auth2-email"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="auth2-field">
                <label htmlFor="auth2-password">
                  Password
                </label>

                <div className="auth2-input-wrap">
                  <LockKeyhole size={19} />

                  <input
                    id="auth2-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    autoComplete={
                      isRegister
                        ? "new-password"
                        : "current-password"
                    }
                    value={form.password}
                    onChange={handleChange}
                    minLength={
                      isRegister ? 12 : undefined
                    }
                    required
                  />

                  <button
                    type="button"
                    className="auth2-eye"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />}
                  </button>
                </div>

                {isRegister && (
                  <small className="auth2-help">
                    Minimum 12 characters, maximum 72 UTF-8 bytes.
                  </small>
                )}
              </div>

              <button
                className="auth2-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isRegister
                    ? "Create my account"
                    : "Go to my dashboard"}

                {!loading && <ArrowRight size={19} />}
              </button>
            </form>

            <p className="auth2-switch-text">
              {isRegister
                ? "Already have an account?"
                : "New to WayaLink?"}

              <button
                type="button"
                onClick={() =>
                  changeMode(
                    isRegister ? "login" : "register"
                  )
                }
              >
                {isRegister ? "Sign in" : "Create an account"}
              </button>
            </p>
          </div>

          <div className="auth2-bottom-note">
            <ShieldCheck size={15} />
            Secure access to your WayaLink student workspace
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
