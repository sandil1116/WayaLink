
import { useState } from "react";
import "./AuthPage.css";

function AuthPage({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const text = await response.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(
          data.message || `Request failed (${response.status})`
        );
      }

      if (isRegister) {
        setMode("login");
        setForm({
          name: "",
          email: form.email,
          password: ""
        });
        setSuccess("Account created! Please log in.");
      } else {
        if (!data.token || !data.user) {
          throw new Error("Incomplete login response");
        }

        setToken(data.token);
        setUser(data.user);
        setForm({
          name: "",
          email: "",
          password: ""
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    setError("");

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Profile failed to load");
      }

      setUser(data.user);
      setSuccess("Profile refreshed successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setError("");
    setSuccess("");
    setMode("login");
  };

  if (user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Welcome to WayaLink!</h1>
          <p>You are successfully logged in.</p>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <div className="auth-profile">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>

          <button onClick={loadProfile}>
            Refresh My Profile
          </button>

          <button className="auth-secondary" onClick={logout}>
            Logout
          </button>

          <a href="/">Back to WayaLink Home</a>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>WayaLink</h1>
        <h2>
          {mode === "login"
            ? "Student Login"
            : "Create Student Account"}
        </h2>

        <p>
          Discover opportunities and shape your future.
        </p>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}

        {mode === "register" && (
          <>
            <label htmlFor="student-name">Full Name</label>
            <input
              id="student-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </>
        )}

        <label htmlFor="student-email">Email</label>
        <input
          id="student-email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="student-password">Password</label>
        <input
          id="student-password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          minLength={mode === "register" ? 12 : undefined}
          required
        />

        {mode === "register" && (
          <small>
            Use at least 12 characters. Maximum 72 UTF-8 bytes.
          </small>
        )}

        <button disabled={loading} type="submit">
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

          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setMode(
                mode === "login" ? "register" : "login"
              );
              setError("");
              setSuccess("");
            }}
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>

        <a href="/">Back to Home</a>
      </form>
    </main>
  );
}

export default AuthPage;
