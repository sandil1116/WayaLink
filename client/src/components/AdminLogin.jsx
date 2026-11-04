
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ClipboardCheck,
  CalendarPlus
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, token, authReady, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to sign in."
        );
      }

      if (data.user?.role !== "admin") {
        // The backend may have set a refresh cookie.
        // Clear it when the account is not an admin.
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin"
        }).catch(() => {});

        throw new Error(
          "This account does not have administrator access."
        );
      }

      if (!data.token) {
        throw new Error("Login response is missing a token.");
      }

      login(data.user, data.token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) {
    return (
      <main className="auth2-loading">
        <span className="auth2-spinner" />
        <p>Checking your session...</p>
      </main>
    );
  }

  if (user?.role === "admin" && token) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <main className="auth2-page">
      <div className="auth2-shell">

        <section className="auth2-showcase admin-auth-showcase">
          <Link to="/" className="auth2-logo">
            <span className="auth2-logo-icon">
              <GraduationCap size={24} />
            </span>
            WayaLink
          </Link>

          <div className="auth2-showcase-content">
            <span className="auth2-overline">
              WAYALINK ADMINISTRATION
            </span>

            <h1>
              Lead the
              <br />
              opportunities.
              <br />
              <span>Shape the future.</span>
            </h1>

            <p>
              A dedicated workspace for publishing
              opportunities, managing listings,
              and reviewing student applications.
            </p>

            <div className="auth2-feature-stack">
              <div className="auth2-feature">
                <div className="auth2-feature-icon">
                  <CalendarPlus size={21} />
                </div>
                <div>
                  <strong>Manage opportunities</strong>
                  <small>
                    Publish, update, and organize listings.
                  </small>
                </div>
              </div>

              <div className="auth2-feature">
                <div className="auth2-feature-icon">
                  <ClipboardCheck size={21} />
                </div>
                <div>
                  <strong>Review applications</strong>
                  <small>
                    Track and manage student submissions.
                  </small>
                </div>
              </div>

              <div className="auth2-feature">
                <div className="auth2-feature-icon">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <strong>Role-protected access</strong>
                  <small>
                    Administrative actions require permission.
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="auth2-showcase-footer">
            WayaLink Administration
            <ArrowUpRight size={17} />
          </div>
        </section>

        <section className="auth2-form-side">
          <div className="auth2-form-top">
            <span className="auth2-mobile-brand">
              WayaLink Admin
            </span>
            <Link to="/" className="auth2-back">
              Back to homepage <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="auth2-form-container">
            <div className="admin-auth-emblem">
              <ShieldCheck size={26} />
            </div>

            <div className="auth2-form-heading">
              <span className="auth2-kicker">
                ADMIN PORTAL
              </span>
              <h2>Administrator sign in</h2>
              <p>
                Access the WayaLink management workspace
                using your administrator credentials.
              </p>
            </div>

            {user?.role === "student" && (
              <div className="admin-auth-notice">
                You're currently signed in as a student.
                Use your administrator account to switch portals.
              </div>
            )}

            {error && (
              <div
                className="auth2-alert auth2-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <form
              className="auth2-form admin-auth-form"
              onSubmit={handleSubmit}
            >
              <div className="auth2-field">
                <label htmlFor="admin-email">
                  Administrator email
                </label>

                <div className="auth2-input-wrap">
                  <Mail size={19} />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="auth2-field">
                <label htmlFor="admin-password">
                  Password
                </label>

                <div className="auth2-input-wrap">
                  <LockKeyhole size={19} />

                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    className="auth2-eye"
                    onClick={() => setShowPassword(!showPassword)}
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
              </div>

              <button
                type="submit"
                className="auth2-submit"
                disabled={loading}
              >
                {loading
                  ? "Signing in..."
                  : "Access Admin Workspace"}
                {!loading && <ArrowRight size={19} />}
              </button>
            </form>

            <div className="admin-auth-bottom-links">
              <Link to="/login">
                Student sign in
              </Link>
              <Link to="/">
                Return home
              </Link>
            </div>
          </div>

          <div className="auth2-bottom-note">
            <ShieldCheck size={15} />
            Restricted to authorized WayaLink administrators
          </div>
        </section>

      </div>
    </main>
  );
}
