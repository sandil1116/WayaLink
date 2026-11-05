
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import "./StudentDashboard.css";

function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, token, logout } = useAuth();
  const student = user?.role === "student" ? user : null;

  const activeView = searchParams.get("view");
  const savedOnly = activeView === "saved" && Boolean(student);
  const showMyApplications =
    activeView === "applications" && Boolean(student);

  const openSavedView = () => {
    setSearchParams({ view: "saved" });
  };

  const openApplicationsView = () => {
    setSearchParams({ view: "applications" });
  };

  const openAllView = () => {
    setSearchParams({});
  };

  const [opportunities, setOpportunities] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [applications, setApplications] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] =
    useState(false);

  const [busyId, setBusyId] = useState("");
  const [applyingId, setApplyingId] = useState("");

  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [applicationNotice, setApplicationNotice] = useState("");

  const categories = [
    "All",
    "Workshop",
    "Hackathon",
    "Internship",
    "Event"
  ];

  // Load public opportunities
  useEffect(() => {
    const controller = new AbortController();

    async function loadOpportunities() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/opportunities", {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to load opportunities");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid opportunities response");
        }

        if (!controller.signal.aborted) {
          setOpportunities(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOpportunities();

    return () => controller.abort();
  }, []);

  // Load saved opportunities
  useEffect(() => {
    if (!student || !token) {
      setSavedIds([]);
      setSavedLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadSaved() {
      setSavedLoading(true);
      setSaveError("");
      setSavedIds([]);

      try {
        const response = await fetch("/api/saved", {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load saved opportunities"
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("Invalid saved opportunities response");
        }

        if (!controller.signal.aborted) {
          setSavedIds(
            data
              .filter(Boolean)
              .map((item) => item._id)
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSaveError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSavedLoading(false);
        }
      }
    }

    loadSaved();

    return () => controller.abort();
  }, [student?.id, student?._id, token]);

  // Load student applications from the backend
  const loadMyApplications = async (signal) => {
    const response = await fetch("/api/applications/my", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to load applications"
      );
    }

    if (!Array.isArray(data)) {
      throw new Error("Invalid applications response");
    }

    return data;
  };

  useEffect(() => {
    if (!student || !token) {
      setApplications([]);
      setApplicationError("");
      setApplicationsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadApplications() {
      setApplicationsLoading(true);
      setApplicationError("");

      try {
        const data = await loadMyApplications(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setApplications(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setApplicationError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setApplicationsLoading(false);
        }
      }
    }

    loadApplications();

    return () => controller.abort();
  }, [student?.id, student?._id, token]);

  // Manually refresh application statuses
  const refreshApplications = async () => {
    if (!student || !token || applicationsLoading) return;

    setApplicationsLoading(true);
    setApplicationError("");
    setApplicationNotice("");

    try {
      const data = await loadMyApplications();

      setApplications(data);
      setApplicationNotice(
        "Application statuses refreshed successfully!"
      );
    } catch (err) {
      setApplicationError(err.message);
    } finally {
      setApplicationsLoading(false);
    }
  };

  // Search and filter opportunities
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return opportunities.filter((item) => {
      const matchesCategory =
        category === "All" ||
        item.category === category;

      const searchableText = [
        item.title,
        item.category,
        item.description
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(term);

      const matchesSaved =
        !savedOnly || savedIds.includes(item._id);

      return (
        matchesCategory &&
        matchesSearch &&
        matchesSaved
      );
    });
  }, [
    opportunities,
    search,
    category,
    savedOnly,
    savedIds
  ]);

  // Save or unsave opportunity
  const toggleSaved = async (id) => {
    if (!student || !token || busyId || savedLoading) {
      return;
    }

    const isSaved = savedIds.includes(id);

    setBusyId(id);
    setSaveError("");

    try {
      const response = await fetch(`/api/saved/${id}`, {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Could not update saved opportunities"
        );
      }

      setSavedIds((previous) =>
        isSaved
          ? previous.filter(
              (savedId) => savedId !== id
            )
          : previous.includes(id)
            ? previous
            : [...previous, id]
      );
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setBusyId("");
    }
  };

  // Submit student application
  const handleApply = async (opportunityId) => {
    if (
      !student ||
      !token ||
      applyingId ||
      applicationsLoading
    ) {
      return;
    }

    setApplyingId(opportunityId);
    setApplicationError("");
    setApplicationNotice("");

    try {
      const response = await fetch(
        `/api/applications/${opportunityId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            message:
              "I would like to participate in this opportunity."
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to submit application"
        );
      }

      // Refresh from MongoDB
      const updated = await loadMyApplications();

      setApplications(updated);
      setApplicationNotice(
        "Application submitted successfully!"
      );

      // Automatically open My Applications
      openApplicationsView();
    } catch (err) {
      setApplicationError(err.message);
    } finally {
      setApplyingId("");
    }
  };

  // Student logout
  const handleLogout = () => {
    logout();

    setSavedIds([]);
    setApplications([]);
    setApplicationError("");
    setApplicationNotice("");
    setSaveError("");

    navigate("/login", { replace: true });
  };

  return (
    <main className="student-page">
      {/* Navigation */}
      <header className="student-topbar">
        <Link to="/" className="student-brand">
          WayaLink
        </Link>

        <nav>
          <Link to="/">Home</Link>

          <Link to="/opportunities">
            Opportunities
          </Link>

          <Link
            to={student ? "/profile" : "/login"}
          >
            {student ? "My Profile" : "Login"}
          </Link>
        </nav>
      </header>

      <div className="student-container">
        {/* Hero */}
        <section className="student-hero">
          <span>YOUR FUTURE STARTS HERE</span>

          <h1>Explore Opportunities</h1>

          <p>
            Discover workshops, internships, hackathons
            and events that help you grow.
          </p>
        </section>

        {/* Student account */}
        <section className="student-account">
          {student ? (
            <div className="student-account-row">
              <div>
                <h2>Welcome, {student.name}!</h2>

                <p>
                  {savedIds.length} saved opportunities
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="student-account-row">
              <div>
                <h2>
                  Save and apply to opportunities
                </h2>

                <p>
                  Log in to save opportunities
                  and track applications.
                </p>
              </div>

              <Link
                to="/login"
                className="student-login-link"
              >
                Student Login
              </Link>
            </div>
          )}
        </section>

        {/* Statistics */}
        <section className="student-stat-grid">
          <div className="student-stat">
            <h2>{opportunities.length}</h2>
            <p>Total Opportunities</p>
          </div>

          <div className="student-stat">
            <h2>
              {opportunities.filter(
                (item) => item.category === "Workshop"
              ).length}
            </h2>

            <p>Workshops</p>
          </div>

          <div className="student-stat">
            <h2>
              {student ? savedIds.length : 0}
            </h2>

            <p>My Saved Opportunities</p>
          </div>
        </section>

        {/* Quick navigation */}
        {student && (
          <div className="student-application-actions">
            <button
              type="button"
              className="student-filter-button"
              onClick={openAllView}
            >
              All Opportunities
            </button>
          
            <Link
              to="/ai"
              className="student-ai-button"
            >
              ✨ Ask WayaLink AI
            </Link>

                <Link
                   to="/smart-match"
                  className="student-ai-button"
                >
      ✨ Find My Matches
    </Link>

            <button
              type="button"
              className="student-filter-button"
              onClick={openSavedView}
              aria-pressed={savedOnly}
            >
              My Saved ({savedIds.length})
            </button>

            <button
              type="button"
              className="student-filter-button"
              onClick={openApplicationsView}
              aria-pressed={showMyApplications}
            >
              My Applications ({applications.length})
            </button>
          </div>
        )}

        {/* My Applications */}
        {student && (
          <section
            className="student-applications"
            id="my-applications"
          >
            <div className="student-account-row">
              <div>
                <h2>My Applications</h2>
                <p>
                  Track your submitted applications.
                </p>
              </div>

              <div className="student-application-actions">
                <button
                  type="button"
                  className="student-filter-button"
                  onClick={refreshApplications}
                  disabled={applicationsLoading}
                >
                  {applicationsLoading
                    ? "Refreshing..."
                    : "Refresh Status"}
                </button>

                <button
                  type="button"
                  className="student-filter-button"
                  onClick={() =>
                    showMyApplications
                      ? openAllView()
                      : openApplicationsView()
                  }
                >
                  {showMyApplications
                    ? "Hide Applications"
                    : `View Applications (${applications.length})`}
                </button>
              </div>
            </div>

            {applicationsLoading && (
              <p className="student-message">
                Loading applications...
              </p>
            )}

            {applicationError && (
              <p
                className="student-error"
                role="alert"
              >
                {applicationError}
              </p>
            )}

            {applicationNotice && (
              <p
                className="student-success"
                role="status"
              >
                {applicationNotice}
              </p>
            )}

            {showMyApplications &&
              !applicationsLoading && (
                <div className="student-application-list">
                  {applications.length === 0 ? (
                    <p>
                      You have not applied to
                      any opportunities yet.
                    </p>
                  ) : (
                    applications.map((application) => (
                      <div
                        className="student-application-item"
                        key={application._id}
                      >
                        <div>
                          <h3>
                            {application.opportunity?.title ||
                              "Opportunity unavailable"}
                          </h3>

                          <small>
                            Applied:{" "}
                            {application.createdAt
                              ? new Date(
                                  application.createdAt
                                ).toLocaleDateString()
                              : "Date unavailable"}
                          </small>
                        </div>

                        <span
                          className={`application-status ${
                            application.status
                          }`}
                        >
                          {application.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
          </section>
        )}

        {/* Opportunities */}
        <section className="student-content">
          <div className="student-section-heading">
            <div>
              <h2>
                {savedOnly
                  ? "My Saved Opportunities"
                  : "Available Opportunities"}
              </h2>

              <p>
                {savedOnly
                  ? "Your bookmarked opportunities."
                  : "Find something that matches your interests."}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="student-filters">
            <input
              type="search"
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              aria-label="Search opportunities"
            />

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              aria-label="Filter by category"
            >
              {categories.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === "All"
                    ? "All Categories"
                    : item}
                </option>
              ))}
            </select>

            {student && (
              <button
                type="button"
                className="student-filter-button"
                onClick={() =>
                  savedOnly
                    ? openAllView()
                    : openSavedView()
                }
                disabled={savedLoading}
                aria-pressed={savedOnly}
              >
                {savedOnly
                  ? "Show All"
                  : "Saved Only"}
              </button>
            )}
          </div>

          {loading && (
            <p className="student-message">
              Loading opportunities...
            </p>
          )}

          {savedLoading && student && (
            <p className="student-message">
              Loading your saved opportunities...
            </p>
          )}

          {error && (
            <p className="student-error">
              {error}
            </p>
          )}

          {saveError && (
            <p
              className="student-error"
              role="alert"
            >
              {saveError}
            </p>
          )}

          {!loading &&
            !error &&
            !savedLoading &&
            filtered.length === 0 && (
              <p className="student-message">
                {savedOnly
                  ? "You have no matching saved opportunities."
                  : "No matching opportunities found."}
              </p>
            )}

          {!loading && !error && (
            <div className="student-card-grid">
              {filtered.map((item) => {
                const isSaved = savedIds.includes(
                  item._id
                );

                const application = applications.find(
                  (entry) => {
                    const opportunityId =
                      entry.opportunity?._id ||
                      entry.opportunity;

                    return (
                      String(opportunityId) ===
                      String(item._id)
                    );
                  }
                );

                return (
                  <article
                    className="student-card"
                    key={item._id}
                  >
                    <span className="student-category">
                      {item.category}
                    </span>

                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <div className="student-card-footer">
                      <span>
                        {item.date ||
                          "To be announced"}
                      </span>
                    </div>

                    {/* Opportunity details */}
                    <Link
                      to={`/opportunities/${item._id}`}
                      className="student-details-link"
                    >
                      View Details →
                    </Link>

                    {student && (
                      <>
                        {/* Save / Unsave */}
                        <button
                          type="button"
                          className={`student-save-button ${
                            isSaved ? "is-saved" : ""
                          }`}
                          onClick={() =>
                            toggleSaved(item._id)
                          }
                          disabled={
                            Boolean(busyId) ||
                            savedLoading
                          }
                          aria-pressed={isSaved}
                        >
                          {busyId === item._id
                            ? "Updating..."
                            : isSaved
                              ? "♥ Saved"
                              : "♡ Save Opportunity"}
                        </button>

                        {/* Apply */}
                        <button
                          type="button"
                          className="student-apply-button"
                          onClick={() =>
                            handleApply(item._id)
                          }
                          disabled={
                            Boolean(application) ||
                            Boolean(applyingId) ||
                            applicationsLoading
                          }
                        >
                          {applyingId === item._id
                            ? "Submitting..."
                            : application
                              ? `Application: ${application.status}`
                              : "Apply Now"}
                        </button>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StudentDashboard;
