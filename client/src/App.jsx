
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Categories from "./components/Categories";
import OpportunityCard from "./components/OpportunityCard";
import OpportunityDetails from "./components/OpportunityDetails";
import AdminDashboard from "./components/AdminDashboard";
import AuthPage from "./components/AuthPage";
import StudentDashboard from "./components/StudentDashboard";
import StudentProfile from "./components/StudentProfile";

// Existing WayaLink homepage
function HomePage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchOpportunities() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/opportunities", {
          signal: controller.signal
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

          {loading && (
            <p>Loading opportunities...</p>
          )}

          {error && (
            <p role="alert">Error: {error}</p>
          )}

          {!loading &&
            !error &&
            opportunities.length === 0 && (
              <p>No opportunities available yet.</p>
            )}

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

// WayaLink routes
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/admin"
        element={<AdminDashboard />}
      />

      <Route
        path="/login"
        element={<AuthPage initialMode="login" />}
      />

      <Route
        path="/register"
        element={<AuthPage initialMode="register" />}
      />

      <Route
        path="/opportunities"
        element={<StudentDashboard />}
      />

      <Route path="/profile" element={<StudentProfile />} />

      <Route path="/opportunities/:id" element={<OpportunityDetails />}
/>

      <Route
        path="*"
        element={
          <main style={{ padding: "40px", textAlign: "center" }}>
            <h1>404 - Page Not Found</h1>
            <a href="/">Back to WayaLink Home</a>
          </main>
        }
      />
    </Routes>
  );
}

export default App;
