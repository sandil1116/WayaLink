
import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Categories from "./components/Categories";
import OpportunityCard from "./components/OpportunityCard";
import AdminDashboard from "./components/AdminDashboard";
import AuthPage from "./components/AuthPage";
import StudentDashboard from "./components/StudentDashboard";

function App() {
  // Store opportunities received from the backend
  const [opportunities, setOpportunities] = useState([]);

  if (window.location.pathname === "/admin") {
  return <AdminDashboard />;
}

  // Track loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch opportunities when the component loads
  useEffect(() => {
    const controller = new AbortController();

    async function fetchOpportunities() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/opportunities", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch opportunities");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid opportunities data");
        }

        setOpportunities(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchOpportunities();

    return () => controller.abort();
  }, []);

  if (window.location.pathname === "/admin") {
  return <AdminDashboard />;
}

if (window.location.pathname === "/login") {
  return <AuthPage initialMode="login" />;
}

if (window.location.pathname === "/register") {
  return <AuthPage initialMode="register" />;
}


if (window.location.pathname === "/opportunities") {
  return <StudentDashboard />;
}
  return (
    <>
      <Navbar />

      <main>
        <Hero />

        <Categories />

        <section className="featured-opportunities">
          <h2>Featured Opportunities</h2>

          <p>
            Explore the latest opportunities for students.
          </p>

          {/* Loading message */}
          {loading && (
            <p>Loading opportunities...</p>
          )}

          {/* Error message */}
          {error && (
            <p role="alert">
              Error: {error}
            </p>
          )}

          {/* Empty state */}
          {!loading &&
            !error &&
            opportunities.length === 0 && (
              <p>No opportunities available yet.</p>
            )}

          {/* Display opportunities from Express */}
          {!loading &&
            !error &&
            opportunities.length > 0 && (
              <div className="opportunity-grid">
                {opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity._id}
                    title={opportunity.title}
                    category={opportunity.category}
                    description={opportunity.description}
                    date={opportunity.date}
                  />
                ))}
              </div>
            )}
        </section>
      </main>
    </>
  );
}

export default App;
