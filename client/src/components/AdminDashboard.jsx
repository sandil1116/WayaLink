
import { useEffect, useState } from "react";
import "./AdminDashboard.css";

const emptyForm = {
  title: "",
  category: "Workshop",
  description: "",
  date: ""
};

async function readResponse(response) {
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
}

function AdminDashboard() {
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState(null);

  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [applicationSuccess, setApplicationSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState("");

  const loadOpportunities = async (signal) => {
    const response = await fetch("/api/opportunities", {
      signal
    });

    const data = await readResponse(response);

    if (!Array.isArray(data)) {
      throw new Error("Unexpected opportunities response");
    }

    if (!signal?.aborted) {
      setOpportunities(data);
    }
  };

  const loadApplications = async (jwt, signal) => {
    const response = await fetch("/api/applications", {
      headers: {
        Authorization: `Bearer ${jwt}`
      },
      signal
    });

    const data = await readResponse(response);

    if (!Array.isArray(data)) {
      throw new Error("Invalid applications response");
    }

    if (!signal?.aborted) {
      setApplications(data);
    }
  };

  // Load opportunities after admin login
  useEffect(() => {
    if (!admin || !token) {
      setOpportunities([]);
      return;
    }

    const controller = new AbortController();

    loadOpportunities(controller.signal).catch((err) => {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    });

    return () => controller.abort();
  }, [admin?.id, admin?._id, token]);

  // Load student applications after admin login
  useEffect(() => {
    if (!admin || !token) {
      setApplications([]);
      setApplicationsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchApplications() {
      setApplicationsLoading(true);
      setApplicationError("");

      try {
        await loadApplications(token, controller.signal);
      } catch (err) {
        if (err.name !== "AbortError") {
          setApplicationError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setApplicationsLoading(false);
        }
      }
    }

    fetchApplications();

    return () => controller.abort();
  }, [admin?.id, admin?._id, token]);

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
          email: loginIdentifier.trim(),
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
    setApplications([]);
    setLoginIdentifier("");
    setPassword("");
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
    setSuccess("");
    setApplicationError("");
    setApplicationSuccess("");
    setReviewingId("");
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

  // Create or edit opportunities
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

  // Delete opportunities
  const handleDelete = async (id) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this opportunity?"
    );

    if (!confirmed) return;

    setDeletingId(id);
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
    } finally {
      setDeletingId("");
    }
  };

  // Refresh student applications
  const refreshApplications = async () => {
    if (!admin || !token || applicationsLoading) return;

    setApplicationsLoading(true);
    setApplicationError("");
    setApplicationSuccess("");

    try {
      await loadApplications(token);
      setApplicationSuccess("Applications refreshed successfully!");
    } catch (err) {
      setApplicationError(err.message);
    } finally {
      setApplicationsLoading(false);
    }
  };

  // Approve or reject student applications
  const handleReview = async (applicationId, status) => {
    if (reviewingId) return;

    setReviewingId(applicationId);
    setApplicationError("");
    setApplicationSuccess("");

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await readResponse(response);

      if (!data.application) {
        throw new Error("Application response is incomplete");
      }

      setApplications((previous) =>
        previous.map((application) =>
          application._id === applicationId
            ? {
                ...application,
                status: data.application.status
              }
            : application
        )
      );

      setApplicationSuccess(
        `Application ${status} successfully!`
      );
    } catch (err) {
      setApplicationError(err.message);
    } finally {
      setReviewingId("");
    }
  };

  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  ).length;

  // Admin login screen
  if (!admin) {
    return (
      <div className="admin-page">
        <form className="admin-login" onSubmit={handleLogin}>
          <h1>WayaLink Admin</h1>
          <p>Sign in with your administrator account.</p>

          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}

          <label htmlFor="admin-email">Email or username</label>
          <input
            id="admin-email"
            type="text"
            autoComplete="username"
            value={loginIdentifier}
            onChange={(e) => setLoginIdentifier(e.target.value)}
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

  // Main dashboard
  return (
    <div className="admin-page">
      <div className="admin-container">

        <header className="admin-header">
          <div>
            <h1>WayaLink Admin Dashboard</h1>
            <p>Welcome, {admin.name}</p>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              onClick={openCreateForm}
            >
              + Add Opportunity
            </button>

            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Statistics */}
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
            <h2>{applications.length}</h2>
            <p>Total Applications</p>
          </div>

          <div className="admin-stat">
            <h2>{pendingApplications}</h2>
            <p>Pending Reviews</p>
          </div>
        </div>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="admin-success" role="status">
            {success}
          </p>
        )}

        {/* Opportunity form */}
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

        {/* Student Application Review */}
        <section className="admin-list admin-applications">
          <div className="admin-applications-heading">
            <div>
              <h2>Student Applications</h2>
              <p>
                Review applications submitted by students.
              </p>
            </div>

            <div className="admin-actions">
              <button
                type="button"
                onClick={refreshApplications}
                disabled={applicationsLoading}
              >
                {applicationsLoading
                  ? "Refreshing..."
                  : "Refresh Applications"}
              </button>
            </div>
          </div>

          {applicationError && (
            <p className="admin-error" role="alert">
              {applicationError}
            </p>
          )}

          {applicationSuccess && (
            <p className="admin-success" role="status">
              {applicationSuccess}
            </p>
          )}

          {applicationsLoading && (
            <p>Loading student applications...</p>
          )}

          {!applicationsLoading &&
            !applicationError &&
            applications.length === 0 && (
              <p>No student applications yet.</p>
            )}

          {!applicationsLoading &&
            applications.map((application) => (
              <div
                className="admin-application-item"
                key={application._id}
              >
                <div className="admin-application-info">
                  <h3>
                    {application.opportunity?.title ||
                      "Opportunity unavailable"}
                  </h3>

                  <p>
                    <strong>Student:</strong>{" "}
                    {application.student?.name ||
                      "Unknown student"}
                  </p>

                  <p>
                    <strong>Email:</strong>{" "}
                    {application.student?.email ||
                      "Unavailable"}
                  </p>

                  {application.message && (
                    <p>
                      <strong>Message:</strong>{" "}
                      {application.message}
                    </p>
                  )}

                  <p>
                    <strong>Applied:</strong>{" "}
                    {application.createdAt
                      ? new Date(
                          application.createdAt
                        ).toLocaleDateString()
                      : "Date unavailable"}
                  </p>

                  <span
                    className={`application-status ${
                      application.status
                    }`}
                  >
                    {application.status}
                  </span>
                </div>

                <div className="admin-review-actions">
                  <button
                    type="button"
                    className="admin-approve"
                    onClick={() =>
                      handleReview(
                        application._id,
                        "approved"
                      )
                    }
                    disabled={
                      Boolean(reviewingId) ||
                      application.status === "approved"
                    }
                  >
                    {reviewingId === application._id
                      ? "Updating..."
                      : "Approve"}
                  </button>

                  <button
                    type="button"
                    className="admin-reject"
                    onClick={() =>
                      handleReview(
                        application._id,
                        "rejected"
                      )
                    }
                    disabled={
                      Boolean(reviewingId) ||
                      application.status === "rejected"
                    }
                  >
                    {reviewingId === application._id
                      ? "Updating..."
                      : "Reject"}
                  </button>
                </div>
              </div>
            ))}
        </section>

        {/* Opportunity Management */}
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
                  type="button"
                  className="admin-edit"
                  onClick={() => openEditForm(item)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="admin-delete"
                  disabled={Boolean(deletingId)}
                  onClick={() => handleDelete(item._id)}
                >
                  {deletingId === item._id
                    ? "Deleting..."
                    : "Delete"}
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
