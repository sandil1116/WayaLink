
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./OpportunityDetails.css";

function OpportunityDetails() {
  const { id } = useParams();
  const { user, token } = useAuth();

  const student = user?.role === "student" ? user : null;

  const [opportunity, setOpportunity] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [application, setApplication] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDetails() {
      try {
        setLoading(true);
        setError("");
        setOpportunity(null);
        setApplication(null);
        setIsSaved(false);

        // Reuse the existing public opportunities API
        const response = await fetch("/api/opportunities", {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to load opportunities");
        }

        const opportunities = await response.json();

        if (!Array.isArray(opportunities)) {
          throw new Error("Invalid opportunities response");
        }

        const found = opportunities.find(
          (item) => item._id === id
        );

        if (!found) {
          throw new Error("Opportunity not found");
        }

        if (controller.signal.aborted) return;

        setOpportunity(found);

        if (student && token) {
          const headers = {
            Authorization: `Bearer ${token}`
          };

          const [savedResponse, appsResponse] =
            await Promise.all([
              fetch("/api/saved", {
                headers,
                signal: controller.signal
              }),
              fetch("/api/applications/my", {
                headers,
                signal: controller.signal
              })
            ]);

          if (!savedResponse.ok || !appsResponse.ok) {
            throw new Error(
              "Failed to load your saved or application information"
            );
          }

          const saved = await savedResponse.json();
          const applications = await appsResponse.json();

          if (!Array.isArray(saved) ||
              !Array.isArray(applications)) {
            throw new Error("Invalid account data received");
          }

          if (controller.signal.aborted) return;

          setIsSaved(
            saved.some((item) => item?._id === id)
          );

          const existing = applications.find((item) => {
            const opportunityId =
              item.opportunity?._id || item.opportunity;

            return String(opportunityId) === id;
          });

          setApplication(existing || null);
        }
      } catch (err) {
        if (err.name !== "AbortError" &&
            !controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDetails();
    return () => controller.abort();
  }, [id, student?.id, student?._id, token]);

  const handleSave = async () => {
    if (!student || busy) return;

    setBusy("save");
    setError("");
    setNotice("");

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
          data.message || "Could not update saved list"
        );
      }

      setIsSaved(!isSaved);

      setNotice(
        isSaved
          ? "Opportunity removed from saved list."
          : "Opportunity saved successfully!"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const handleApply = async (event) => {
    event.preventDefault();

    if (!student || application || busy) return;

    setBusy("apply");
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/applications/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            message: applicationMessage.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to submit application"
        );
      }

      setApplication(data.application);
      setNotice("Application submitted successfully!");
      setApplicationMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <main className="details-page">
        <p>Loading opportunity details...</p>
      </main>
    );
  }

  if (!opportunity) {
    return (
      <main className="details-page">
        <Link to="/opportunities">← Back to Opportunities</Link>
        <p role="alert">
          {error || "Opportunity not found"}
        </p>
      </main>
    );
  }

  return (
    <main className="details-page">
      <div className="details-container">
        <Link
          to="/opportunities"
          className="details-back"
        >
          ← Back to Opportunities
        </Link>

        <article className="details-card">
          <span className="details-category">
            {opportunity.category}
          </span>

          <h1>{opportunity.title}</h1>

          <p className="details-date">
            Date: {opportunity.date || "To be announced"}
          </p>

          <h2>About this Opportunity</h2>

          <p className="details-description">
            {opportunity.description}
          </p>

          {error && (
            <p className="details-error" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <p className="details-success" role="status">
              {notice}
            </p>
          )}

          {!student ? (
            <section className="details-actions">
              <p>
                Sign in with a student account to save
                or apply to this opportunity.
              </p>
              <Link to="/login" className="details-button">
                Student Login
              </Link>
            </section>
          ) : (
            <section className="details-actions">
              <button
                type="button"
                className="details-save"
                disabled={Boolean(busy)}
                onClick={handleSave}
              >
                {busy === "save"
                  ? "Updating..."
                  : isSaved
                    ? "♥ Saved"
                    : "♡ Save Opportunity"}
              </button>

              {application ? (
                <div className="details-application-status">
                  <strong>Application status:</strong>{" "}
                  <span
                    className={`application-status ${
                      application.status
                    }`}
                  >
                    {application.status}
                  </span>
                </div>
              ) : (
                <form
                  className="details-apply-form"
                  onSubmit={handleApply}
                >
                  <h2>Apply for this Opportunity</h2>

                  <label htmlFor="application-message">
                    Application Message (Optional)
                  </label>

                  <textarea
                    id="application-message"
                    rows={4}
                    maxLength={1000}
                    value={applicationMessage}
                    onChange={(e) =>
                      setApplicationMessage(e.target.value)
                    }
                    placeholder="Why are you interested in this opportunity?"
                  />

                  <button
                    type="submit"
                    className="details-button"
                    disabled={Boolean(busy)}
                  >
                    {busy === "apply"
                      ? "Submitting..."
                      : "Submit Application"}
                  </button>
                </form>
              )}
            </section>
          )}
        </article>
      </div>
    </main>
  );
}

export default OpportunityDetails;
