
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Edit3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./AdminWorkspace.css";

const EMPTY_FORM = {
  title: "",
  category: "Event",
  description: "",
  date: ""
};

const CATEGORIES = [
  "Event",
  "Workshop",
  "Hackathon",
  "Internship",
  "Competition",
  "Scholarship",
  "Club",
  "Other"
];

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not specified"
    : date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
}

function readArray(payload, key) {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.[key])) {
    return payload[key];
  }

  if (Array.isArray(payload?.data?.[key])) {
    return payload.data[key];
  }

  throw new Error(`Unexpected ${key} response from server.`);
}

function StatusPill({ status }) {
  const normalized = String(status || "pending").toLowerCase();

  return (
    <span className={`admin2-status admin2-status-${normalized}`}>
      {normalized}
    </span>
  );
}

export default function AdminWorkspace() {
  const navigate = useNavigate();

  const {
    user,
    token,
    authReady,
    logout
  } = useAuth();

  const [tab, setTab] = useState("overview");
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = user?.role === "admin";

  const apiRequest = useCallback(
    async (path, options = {}) => {
      const response = await fetch(path, {
        ...options,
        credentials: "same-origin",
        headers: {
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          Authorization: `Bearer ${token}`,
          ...(options.headers || {})
        }
      });

      const raw = await response.text();

      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Invalid response from server.");
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          `Request failed (${response.status})`
        );
      }

      return data;
    },
    [token]
  );

  const loadData = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const [opportunityData, applicationData] =
          await Promise.all([
            apiRequest("/api/opportunities", { signal }),
            apiRequest("/api/applications", { signal })
          ]);

        if (signal?.aborted) return;

        setOpportunities(
          readArray(opportunityData, "opportunities")
        );

        setApplications(
          readArray(applicationData, "applications")
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [apiRequest]
  );

  useEffect(() => {
    if (!authReady || !isAdmin || !token) return;

    const controller = new AbortController();
    loadData(controller.signal);

    return () => controller.abort();
  }, [authReady, isAdmin, token, loadData]);

  const filteredOpportunities = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return opportunities;

    return opportunities.filter((item) =>
      `${item.title || ""} ${item.category || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [opportunities, search]);

  const pendingApplications = applications.filter(
    (item) =>
      String(item.status || "").toLowerCase() === "pending"
  );

  const approvedApplications = applications.filter(
    (item) =>
      String(item.status || "").toLowerCase() === "approved"
  );

  const upcomingOpportunities = opportunities.filter(
    (item) => {
      if (!item.date) return false;

      const date = new Date(item.date);
      return !Number.isNaN(date.getTime()) &&
        date >= new Date();
    }
  );

  const stats = [
    {
      label: "Total Opportunities",
      value: opportunities.length,
      icon: BookOpen,
      tone: "blue"
    },
    {
      label: "Upcoming Listings",
      value: upcomingOpportunities.length,
      icon: CalendarDays,
      tone: "purple"
    },
    {
      label: "Student Applications",
      value: applications.length,
      icon: BriefcaseBusiness,
      tone: "teal"
    },
    {
      label: "Pending Reviews",
      value: pendingApplications.length,
      icon: Clock3,
      tone: "orange"
    }
  ];

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEditing(item) {
    setEditingId(item._id);

    setForm({
      title: item.title || "",
      category: item.category || "Event",
      description: item.description || "",
      date: toDateInput(item.date)
    });

    setTab("opportunities");
    setNotice("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveOpportunity(event) {
    event.preventDefault();
    if (saving) return;

    const payload = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      date: form.date
    };

    if (
      !payload.title ||
      !payload.category ||
      !payload.description ||
      !payload.date
    ) {
      setError("Complete every opportunity field.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        editingId
          ? `/api/opportunities/${editingId}`
          : "/api/opportunities",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload)
        }
      );

      resetForm();

      await loadData();

      setNotice(
        editingId
          ? "Opportunity updated successfully."
          : "Opportunity published successfully."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteOpportunity(item) {
    if (
      !window.confirm(
        `Permanently delete "${item.title}"?`
      )
    ) {
      return;
    }

    setBusyId(item._id);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/api/opportunities/${item._id}`,
        { method: "DELETE" }
      );

      await loadData();

      if (editingId === item._id) {
        resetForm();
      }

      setNotice("Opportunity deleted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function updateApplicationStatus(id, status) {
    setBusyId(id);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/api/applications/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status })
        }
      );

      await loadData();

      setNotice(
        `Application marked as ${status}.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate("/admin/login", { replace: true });
  }

  if (!authReady) {
    return (
      <main className="admin2-loading">
        Restoring administrator session...
      </main>
    );
  }

  if (!isAdmin || !token) {
    return <Navigate to="/admin/login" replace />;
  }

  const displayName = user.name || "Administrator";

  return (
    <main className="admin2-page">
      <div className="admin2-layout">

        {/* SIDEBAR */}
        <aside className="admin2-sidebar">
          <Link to="/" className="admin2-brand">
            <span className="admin2-brand-icon">
              <GraduationCap size={24} />
            </span>
            <span>
              WayaLink
              <small>ADMIN WORKSPACE</small>
            </span>
          </Link>

          <p className="admin2-nav-caption">
            MANAGEMENT
          </p>

          <nav className="admin2-navigation">
            {[
              {
                id: "overview",
                label: "Overview",
                icon: LayoutDashboard
              },
              {
                id: "opportunities",
                label: "Manage Opportunities",
                icon: BookOpen
              },
              {
                id: "applications",
                label: "Applications",
                icon: ClipboardCheck
              }
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={
                    tab === item.id
                      ? "admin2-nav-item active"
                      : "admin2-nav-item"
                  }
                  onClick={() => {
                    setTab(item.id);
                    setError("");
                  }}
                >
                  <Icon size={19} />
                  {item.label}

                  {item.id === "applications" &&
                    pendingApplications.length > 0 && (
                      <span className="admin2-nav-count">
                        {pendingApplications.length}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>

          <div className="admin2-sidebar-bottom">
            <div className="admin2-sidebar-user">
              <span className="admin2-avatar">
                {displayName[0].toUpperCase()}
              </span>

              <div>
                <strong>{displayName}</strong>
                <small>Administrator</small>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="admin2-signout"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {/* CONTENT */}
        <div className="admin2-main">
          <header className="admin2-topbar">
            <div className="admin2-breadcrumb">
              <span>Administration</span>
              <ChevronRight size={15} />
              <strong>
                {tab === "overview"
                  ? "Overview"
                  : tab === "opportunities"
                    ? "Opportunities"
                    : "Applications"}
              </strong>
            </div>

            <div className="admin2-top-actions">
              <button
                type="button"
                className="admin2-refresh"
                onClick={() => loadData()}
                disabled={loading}
                title="Refresh admin data"
              >
                <RefreshCw size={18} />
              </button>

              <span className="admin2-user-icon">
                <ShieldCheck size={19} />
              </span>
            </div>
          </header>

          <div className="admin2-content">

            {/* Welcome */}
            <section className="admin2-hero">
              <div>
                <span className="admin2-eyebrow">
                  <ShieldCheck size={15} />
                  ADMIN CONTROL CENTER
                </span>

                <h1>
                  {tab === "overview"
                    ? `Welcome back, ${displayName.split(" ")[0]}`
                    : tab === "opportunities"
                      ? "Opportunity Management"
                      : "Application Reviews"}
                </h1>

                <p>
                  {tab === "overview"
                    ? "Manage opportunities and support students from one organized workspace."
                    : tab === "opportunities"
                      ? "Create, update and manage the opportunities available to students."
                      : "Review student applications and manage their approval status."}
                </p>
              </div>

              <div className="admin2-hero-symbol">
                <ShieldCheck size={58} />
              </div>
            </section>

            {loading && (
              <div className="admin2-message">
                Loading WayaLink administration data...
              </div>
            )}

            {error && (
              <div
                className="admin2-message admin2-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                className="admin2-message admin2-success"
                role="status"
              >
                <CheckCircle2 size={17} />
                {notice}
              </div>
            )}

            {/* Overview */}
            {tab === "overview" && (
              <>
                <section className="admin2-stats">
                  {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div
                        className="admin2-stat-card"
                        key={stat.label}
                      >
                        <span
                          className={`admin2-stat-icon admin2-tone-${stat.tone}`}
                        >
                          <Icon size={23} />
                        </span>

                        <strong>{stat.value}</strong>
                        <small>{stat.label}</small>
                      </div>
                    );
                  })}
                </section>

                <section className="admin2-quick-grid">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setTab("opportunities");
                    }}
                    className="admin2-quick-action"
                  >
                    <span className="admin2-tone-blue">
                      <Plus size={25} />
                    </span>

                    <strong>Publish Opportunity</strong>
                    <small>
                      Add a new event, internship, or workshop.
                    </small>

                    <ArrowRight size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTab("applications")
                    }
                    className="admin2-quick-action"
                  >
                    <span className="admin2-tone-purple">
                      <ClipboardCheck size={25} />
                    </span>

                    <strong>Review Applications</strong>
                    <small>
                      Evaluate student submissions.
                    </small>

                    <ArrowRight size={19} />
                  </button>
                </section>

                <section className="admin2-panel">
                  <div className="admin2-panel-heading">
                    <div>
                      <h2>Recent Applications</h2>
                      <p>
                        Latest student submissions
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setTab("applications")
                      }
                    >
                      View all <ArrowRight size={16} />
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <p className="admin2-empty">
                      No applications to display yet.
                    </p>
                  ) : (
                    <div className="admin2-table-wrap">
                      <table className="admin2-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Opportunity</th>
                            <th>Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {applications.slice(0, 5).map(
                            (application) => (
                              <tr key={application._id}>
                                <td>
                                  {application.student?.name ||
                                    "Student"}
                                </td>

                                <td>
                                  {application.opportunity?.title ||
                                    "Unavailable listing"}
                                </td>

                                <td>
                                  <StatusPill
                                    status={application.status}
                                  />
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* Opportunities */}
            {tab === "opportunities" && (
              <>
                <section className="admin2-panel">
                  <div className="admin2-panel-heading">
                    <div>
                      <h2>
                        {editingId
                          ? "Edit Opportunity"
                          : "Publish an Opportunity"}
                      </h2>

                      <p>
                        Keep student opportunity information accurate.
                      </p>
                    </div>

                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                      >
                        Cancel editing
                      </button>
                    )}
                  </div>

                  <form
                    className="admin2-form"
                    onSubmit={saveOpportunity}
                  >
                    <div className="admin2-form-grid">
                      <label>
                        Opportunity title
                        <input
                          value={form.title}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              title: event.target.value
                            })
                          }
                          placeholder="e.g. AI Career Workshop"
                          maxLength={160}
                          required
                        />
                      </label>

                      <label>
                        Category
                        <select
                          value={form.category}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              category: event.target.value
                            })
                          }
                        >
                          {!CATEGORIES.includes(form.category) && (
                            <option value={form.category}>
                              {form.category}
                            </option>
                          )}

                          {CATEGORIES.map((category) => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Event / opportunity date
                        <input
                          type="date"
                          value={form.date}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              date: event.target.value
                            })
                          }
                          required
                        />
                      </label>
                    </div>

                    <label>
                      Description
                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            description: event.target.value
                          })
                        }
                        placeholder="Explain what students should know..."
                        rows={5}
                        maxLength={3500}
                        required
                      />
                    </label>

                    <div className="admin2-form-actions">
                      <button
                        type="submit"
                        className="admin2-primary"
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : editingId
                            ? "Save Changes"
                            : "Publish Opportunity"}

                        <ArrowRight size={18} />
                      </button>

                      <button
                        type="button"
                        className="admin2-secondary"
                        onClick={resetForm}
                      >
                        Clear Form
                      </button>
                    </div>
                  </form>
                </section>

                <section className="admin2-panel">
                  <div className="admin2-panel-heading">
                    <div>
                      <h2>Published Opportunities</h2>
                      <p>
                        {opportunities.length} records in WayaLink
                      </p>
                    </div>
                  </div>

                  <div className="admin2-search">
                    <Search size={18} />
                    <input
                      placeholder="Search title or category..."
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                    />
                  </div>

                  <div className="admin2-table-wrap">
                    <table className="admin2-table">
                      <thead>
                        <tr>
                          <th>Opportunity</th>
                          <th>Category</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredOpportunities.map((item) => (
                          <tr key={item._id}>
                            <td>
                              <strong>{item.title}</strong>
                            </td>
                            <td>{item.category}</td>
                            <td>{formatDate(item.date)}</td>

                            <td>
                              <div className="admin2-row-actions">
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditing(item)
                                  }
                                  aria-label={`Edit ${item.title}`}
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  type="button"
                                  className="admin2-danger-action"
                                  disabled={busyId === item._id}
                                  onClick={() =>
                                    deleteOpportunity(item)
                                  }
                                  aria-label={`Delete ${item.title}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredOpportunities.length === 0 && (
                      <p className="admin2-empty">
                        No matching opportunities found.
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Applications */}
            {tab === "applications" && (
              <section className="admin2-panel">
                <div className="admin2-panel-heading">
                  <div>
                    <h2>Student Applications</h2>
                    <p>
                      {pendingApplications.length} awaiting review,
                      {" "}{approvedApplications.length} approved
                    </p>
                  </div>
                </div>

                <div className="admin2-table-wrap">
                  <table className="admin2-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Opportunity</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Review</th>
                      </tr>
                    </thead>

                    <tbody>
                      {applications.map((item) => {
                        const id = item._id;

                        return (
                          <tr key={id}>
                            <td>
                              <strong>
                                {item.student?.name || "Student"}
                              </strong>
                              <small className="admin2-cell-sub">
                                {item.student?.email || ""}
                              </small>
                            </td>

                            <td>
                              {item.opportunity?.title ||
                                "Unavailable listing"}
                            </td>

                            <td>
                              {formatDate(item.createdAt)}
                            </td>

                            <td>
                              <StatusPill status={item.status} />
                            </td>

                            <td>
                              <div className="admin2-row-actions">
                                <button
                                  type="button"
                                  className="admin2-approve"
                                  title="Approve application"
                                  aria-label="Approve application"
                                  disabled={busyId === id}
                                  onClick={() =>
                                    updateApplicationStatus(
                                      id,
                                      "approved"
                                    )
                                  }
                                >
                                  <CheckCircle2 size={18} />
                                </button>

                                <button
                                  type="button"
                                  className="admin2-reject"
                                  title="Reject application"
                                  aria-label="Reject application"
                                  disabled={busyId === id}
                                  onClick={() =>
                                    updateApplicationStatus(
                                      id,
                                      "rejected"
                                    )
                                  }
                                >
                                  <XCircle size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {applications.length === 0 && (
                    <p className="admin2-empty">
                      No student applications have been submitted.
                    </p>
                  )}
                </div>
              </section>
            )}

            <footer className="admin2-footer">
              WayaLink 2.0 · Administration Workspace
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
