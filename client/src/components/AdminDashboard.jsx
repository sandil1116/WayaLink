
import { useEffect, useState } from "react";
import "./AdminDashboard.css";

const emptyForm = {
  title: "",
  category: "Workshop",
  description: "",
  date: ""
};

function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const readResponse = async (response) => {
    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("Invalid API response");
    }

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed (${response.status})`
      );
    }

    return data;
  };

  const loadOpportunities = async (signal) => {
    const response = await fetch("/api/opportunities", {
      signal
    });

    const data = await readResponse(response);

    if (!Array.isArray(data)) {
      throw new Error("Unexpected opportunities response");
    }

    setOpportunities(data);
  };

  useEffect(() => {
    if (!admin) return;

    const controller = new AbortController();

    loadOpportunities(controller.signal).catch((err) => {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    });

    return () => controller.abort();
  }, [admin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await readResponse(response);

      if (data.user?.role !== "admin") {
        throw new Error("Administrator access required");
      }

      if (!data.token) {
        throw new Error("Login token missing");
      }

      setToken(data.token);
      setAdmin(data.user);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setAdmin(null);
    setOpportunities([]);
    setPassword("");
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
    setSuccess("");
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      category: item.category || "Workshop",
      description: item.description || "",
      date: item.date || ""
    });
    setShowForm(true);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const isEditing = Boolean(editingId);

    const url = isEditing
      ? `/api/opportunities/${editingId}`
      : "/api/opportunities";

    try {
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          date: form.date.trim() || "To be announced"
        })
      });

      await readResponse(response);
      await loadOpportunities();

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      setSuccess(
        isEditing
          ? "Opportunity updated successfully!"
          : "Opportunity created successfully!"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this opportunity?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/opportunities/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      await readResponse(response);
      setOpportunities((previous) =>
        previous.filter((item) => item._id !== id)
      );

      setSuccess("Opportunity deleted successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!admin) {
    return (
      <div className="admin-page">
        <form className="admin-login" onSubmit={handleLogin}>
          <h1>WayaLink Admin</h1>
          <p>Sign in with your administrator account.</p>

          {error && <p className="admin-error">{error}</p>}

          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Admin Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">

        <header className="admin-header">
          <div>
            <h1>WayaLink Admin Dashboard</h1>
            <p>Welcome, {admin.name}</p>
          </div>

          <div className="admin-actions">
            <button onClick={openCreateForm}>
              + Add Opportunity
            </button>

            <button
              className="admin-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <div className="admin-stats">
          <div className="admin-stat">
            <h2>{opportunities.length}</h2>
            <p>Total Opportunities</p>
          </div>

          <div className="admin-stat">
            <h2>
              {opportunities.filter(
                (item) => item.category === "Workshop"
              ).length}
            </h2>
            <p>Workshops</p>
          </div>

          <div className="admin-stat">
            <h2>
              {opportunities.filter(
                (item) => item.category === "Hackathon"
              ).length}
            </h2>
            <p>Hackathons</p>
          </div>
        </div>

        {error && (
          <p className="admin-error">{error}</p>
        )}

        {success && (
          <p className="admin-success">{success}</p>
        )}

        {showForm && (
          <form className="admin-form" onSubmit={handleSave}>
            <h2>
              {editingId
                ? "Edit Opportunity"
                : "Create New Opportunity"}
            </h2>

            <label htmlFor="opportunity-title">
              Title
            </label>
            <input
              id="opportunity-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />

            <label htmlFor="opportunity-category">
              Category
            </label>
            <select
              id="opportunity-category"
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="Workshop">Workshop</option>
              <option value="Hackathon">Hackathon</option>
              <option value="Internship">Internship</option>
              <option value="Event">Event</option>
            </select>

            <label htmlFor="opportunity-description">
              Description
            </label>
            <textarea
              id="opportunity-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
            />

            <label htmlFor="opportunity-date">
              Date
            </label>
            <input
              id="opportunity-date"
              name="date"
              placeholder="e.g. 2026-11-15"
              value={form.date}
              onChange={handleChange}
            />

            <div className="admin-form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Opportunity"
                    : "Create Opportunity"}
              </button>

              <button
                type="button"
                className="admin-cancel"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="admin-list">
          <h2>Manage Opportunities</h2>

          {opportunities.length === 0 && (
            <p>No opportunities found.</p>
          )}

          {opportunities.map((item) => (
            <div
              className="admin-opportunity"
              key={item._id}
            >
              <div className="admin-opportunity-details">
                <h3>{item.title}</h3>
                <p>{item.category}</p>
                <small>{item.date}</small>
                <p>{item.description}</p>
              </div>

              <div className="admin-item-actions">
                <button
                  className="admin-edit"
                  onClick={() => openEditForm(item)}
                >
                  Edit
                </button>

                <button
                  className="admin-delete"
                  onClick={() => handleDelete(item._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}

export default AdminDashboard;
