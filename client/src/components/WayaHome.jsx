
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Code2,
  Compass,
  GraduationCap,
  Menu,
  Search,
  Sparkles,
  Target,
  X
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./WayaHome.css";

const CATEGORIES = [
  {
    name: "Events",
    key: "event",
    icon: CalendarDays,
    tone: "blue",
    description: "Experiences that bring students together"
  },
  {
    name: "Internships",
    key: "internship",
    icon: BriefcaseBusiness,
    tone: "purple",
    description: "Take your first step into the industry"
  },
  {
    name: "Hackathons",
    key: "hackathon",
    icon: Code2,
    tone: "orange",
    description: "Create, compete, and build something great"
  },
  {
    name: "Workshops",
    key: "workshop",
    icon: GraduationCap,
    tone: "green",
    description: "Develop skills that shape your future"
  }
];

function formatDate(value) {
  if (!value) return "Date to be confirmed";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be confirmed";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function getCategoryIcon(category = "") {
  const text = String(category).toLowerCase();

  if (text.includes("intern")) return BriefcaseBusiness;
  if (text.includes("hack")) return Code2;
  if (text.includes("workshop")) return GraduationCap;

  return CalendarDays;
}

function getCategoryTone(category = "") {
  const text = String(category).toLowerCase();

  if (text.includes("intern")) return "purple";
  if (text.includes("hack")) return "orange";
  if (text.includes("workshop")) return "green";

  return "blue";
}

function OpportunityPreview({ opportunity }) {
  const Icon = getCategoryIcon(opportunity.category);
  const tone = getCategoryTone(opportunity.category);

  const description = String(
    opportunity.description || ""
  ).trim();

  return (
    <Link
      className="wl-home-opportunity"
      to={`/opportunities/${opportunity._id}`}
    >
      <div className="wl-home-card-header">
        <span
          className={`wl-home-card-icon wl-home-tone-${tone}`}
        >
          <Icon size={22} />
        </span>

        <ArrowUpRight
          className="wl-home-card-arrow"
          size={19}
        />
      </div>

      <span className="wl-home-card-category">
        {opportunity.category || "Opportunity"}
      </span>

      <h3>{opportunity.title}</h3>

      <p>
        {description.length > 135
          ? `${description.slice(0, 135)}...`
          : description || "Explore this opportunity on WayaLink."}
      </p>

      <div className="wl-home-card-footer">
        <span>
          <CalendarDays size={15} />
          {formatDate(opportunity.date)}
        </span>

        <span className="wl-home-card-view">
          Details <ChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export default function WayaHome() {
  const { user, token, authReady } = useAuth();

  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const signedIn = Boolean(
    authReady && user && token
  );

  const dashboardUrl =
    user?.role === "admin"
      ? "/admin"
      : "/profile";

  const aiUrl =
    signedIn && user?.role === "student"
      ? "/ai"
      : "/login";

  const matchUrl =
    signedIn && user?.role === "student"
      ? "/smart-match"
      : "/login";

  useEffect(() => {
    const controller = new AbortController();

    async function loadOpportunities() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/opportunities",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Could not load opportunities (${response.status})`
          );
        }

        const data = await response.json();

        const records = Array.isArray(data)
          ? data
          : Array.isArray(data.opportunities)
            ? data.opportunities
            : null;

        if (!records) {
          throw new Error(
            "Unexpected opportunities response."
          );
        }

        if (!controller.signal.aborted) {
          setOpportunities(
            records.filter(
              (item) =>
                item &&
                item._id &&
                item.title
            )
          );
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

  const filteredOpportunities = useMemo(() => {
    if (selectedCategory === "all") {
      return opportunities;
    }

    return opportunities.filter((item) =>
      String(item.category || "")
        .toLowerCase()
        .includes(selectedCategory)
    );
  }, [opportunities, selectedCategory]);

  const featured = filteredOpportunities.slice(0, 6);

  const spotlight = opportunities[0];

  const selectCategory = (key) => {
    setSelectedCategory(key);

    document
      .getElementById("wl-home-featured")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="wl-home">

      {/* ==================================
          NAVIGATION
      ================================== */}

      <header className="wl-home-header">
        <div className="wl-home-nav-inner">
          <Link
            to="/"
            className="wl-home-brand"
            onClick={closeMenu}
          >
            <span className="wl-home-brand-symbol">
              <GraduationCap size={25} />
            </span>

            <span>WayaLink</span>

            <span className="wl-home-brand-version">
              2.0
            </span>
          </Link>

          <nav
            className={
              menuOpen
                ? "wl-home-navigation wl-home-navigation-open"
                : "wl-home-navigation"
            }
            aria-label="Main navigation"
          >
            <Link
              to="/"
              className="wl-home-nav-current"
              onClick={closeMenu}
            >
              Home
            </Link>

            <Link
              to="/opportunities"
              onClick={closeMenu}
            >
              Opportunities
            </Link>

            <Link
              to={matchUrl}
              onClick={closeMenu}
            >
              Smart Match
            </Link>

            <Link
            to="/admin/login"
            onClick={closeMenu}
            >
            Admin Portal
            </Link>
            <Link to="/admin/login">
            Admin Portal
            </Link>

            <Link
              to={aiUrl}
              onClick={closeMenu}
            >
              AI Copilot
            </Link>

            <div className="wl-home-mobile-actions">
              <Link
                to={signedIn ? dashboardUrl : "/login"}
                onClick={closeMenu}
              >
                {signedIn ? "My Dashboard" : "Sign In"}
              </Link>
            </div>
          </nav>

          <div className="wl-home-nav-actions">
            {signedIn ? (
              <Link
                to={dashboardUrl}
                className="wl-home-nav-button"
              >
                My Dashboard
                <ArrowUpRight size={17} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="wl-home-signin"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="wl-home-nav-button"
                >
                  Get Started
                  <ArrowUpRight size={17} />
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="wl-home-menu-toggle"
            aria-label={
              menuOpen ? "Close navigation" : "Open navigation"
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen
              ? <X size={23} />
              : <Menu size={23} />}
          </button>
        </div>
      </header>

      <main className="wl-home-main">

        {/* ==================================
            HERO
        ================================== */}

        <section className="wl-home-hero">
          <div className="wl-home-hero-copy">
            <span className="wl-home-eyebrow">
              <Sparkles size={16} />
              YOUR FUTURE STARTS HERE
            </span>

            <h1>
              Discover what's
              <br />
              <span>next for you.</span>
            </h1>

            <p>
              Your all-in-one platform for university
              opportunities. Explore events, find
              internships, build your skills, and get
              personalized guidance powered by AI.
            </p>

            <div className="wl-home-hero-buttons">
              <Link
                to={
                  signedIn
                    ? dashboardUrl
                    : "/register"
                }
                className="wl-home-button-light"
              >
                {signedIn
                  ? "Open My Workspace"
                  : "Start Your Journey"}

                <ArrowUpRight size={19} />
              </Link>

              <Link
                to="/opportunities"
                className="wl-home-button-outline"
              >
                Explore Opportunities
                <ArrowRight size={19} />
              </Link>
            </div>

            <div className="wl-home-hero-proof">
              <span className="wl-home-proof-icon">
                <CheckCircle2 size={18} />
              </span>

              Explore real WayaLink listings and
              manage your applications in one place.
            </div>
          </div>

          {/* Live opportunity spotlight */}

          <div className="wl-home-hero-visual">
            <div className="wl-home-floating-chip">
              <Sparkles size={15} />
              AI-powered discovery
            </div>

            <div className="wl-home-spotlight">
              <div className="wl-home-spotlight-top">
                <span className="wl-home-spotlight-logo">
                  <Compass size={23} />
                </span>

                <div>
                  <strong>Opportunity Spotlight</strong>
                  <small>
                    Discover something new today
                  </small>
                </div>

                <span className="wl-home-live-pill">
                  LIVE
                </span>
              </div>

              <div className="wl-home-spotlight-body">
                {loading ? (
                  <div className="wl-home-spotlight-loading">
                    Loading current listings...
                  </div>
                ) : spotlight ? (
                  <>
                    <span className="wl-home-spotlight-tag">
                      {spotlight.category ||
                        "Opportunity"}
                    </span>

                    <h3>{spotlight.title}</h3>

                    <p>
                      {String(
                        spotlight.description || ""
                      ).slice(0, 155)}
                    </p>

                    <div className="wl-home-spotlight-date">
                      <CalendarDays size={16} />
                      {formatDate(spotlight.date)}
                    </div>

                    <Link
                      to={`/opportunities/${spotlight._id}`}
                      className="wl-home-spotlight-link"
                    >
                      Explore this opportunity
                      <ArrowUpRight size={17} />
                    </Link>
                  </>
                ) : (
                  <>
                    <h3>Your next opportunity awaits.</h3>
                    <p>
                      Browse university events,
                      workshops, internships, and
                      hackathons in one place.
                    </p>

                    <Link
                      to="/opportunities"
                      className="wl-home-spotlight-link"
                    >
                      Browse opportunities
                      <ArrowUpRight size={17} />
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="wl-home-floating-bottom">
              <Target size={17} />
              Find your best match
            </div>
          </div>
        </section>

        {/* ==================================
            VALUE STRIP
        ================================== */}

        <section
          className="wl-home-benefits"
          aria-label="Platform features"
        >
          <div>
            <Compass size={20} />
            <span>One place to discover</span>
          </div>

          <div>
            <Bookmark size={20} />
            <span>Save and track opportunities</span>
          </div>

          <div>
            <Target size={20} />
            <span>Personalized matching</span>
          </div>

          <div>
            <Sparkles size={20} />
            <span>Gemini AI assistance</span>
          </div>
        </section>

        {/* ==================================
            CATEGORIES
        ================================== */}

        <section className="wl-home-section wl-home-categories">
          <div className="wl-home-section-intro">
            <div>
              <span className="wl-home-section-kicker">
                FIND YOUR PATH
              </span>

              <h2>Explore your possibilities</h2>

              <p>
                Whatever your ambition, there's a place
                to begin.
              </p>
            </div>

            <Link
              to="/opportunities"
              className="wl-home-text-link"
            >
              Browse all opportunities
              <ArrowUpRight size={18} />
            </Link>
          </div>

          <div className="wl-home-category-grid">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;

              const count = opportunities.filter(
                (item) =>
                  String(item.category || "")
                    .toLowerCase()
                    .includes(category.key)
              ).length;

              return (
                <button
                  type="button"
                  key={category.key}
                  className={`wl-home-category-card wl-home-category-${category.tone}`}
                  onClick={() =>
                    selectCategory(category.key)
                  }
                >
                  <span className="wl-home-category-icon">
                    <Icon size={25} />
                  </span>

                  <span className="wl-home-category-title">
                    {category.name}
                  </span>

                  <span className="wl-home-category-description">
                    {category.description}
                  </span>

                  <span className="wl-home-category-bottom">
                    <span>
                      {loading
                        ? "Loading..."
                        : `${count} listing${count === 1 ? "" : "s"}`}
                    </span>

                    <ArrowUpRight size={19} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ==================================
            AI FEATURE
        ================================== */}

        <section className="wl-home-ai-showcase">
          <div className="wl-home-ai-copy">
            <span className="wl-home-ai-kicker">
              <Sparkles size={16} />
              MEET YOUR AI OPPORTUNITY ASSISTANT
            </span>

            <h2>
              Less searching.
              <br />
              <span>More discovering.</span>
            </h2>

            <p>
              Ask WayaLink AI about available
              opportunities or use Smart Match to
              explore listings based on your interests,
              skills, and career goals.
            </p>

            <div className="wl-home-ai-actions">
              <Link
                to={aiUrl}
                className="wl-home-ai-primary"
              >
                Explore AI Copilot
                <ArrowUpRight size={18} />
              </Link>

              <Link
                to={matchUrl}
                className="wl-home-ai-secondary"
              >
                Try Smart Match
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="wl-home-ai-demo">
            <div className="wl-home-ai-demo-head">
              <span className="wl-home-ai-demo-avatar">
                <Sparkles size={20} />
              </span>

              <div>
                <strong>WayaLink AI Copilot</strong>
                <small>
                  Your opportunity discovery assistant
                </small>
              </div>
            </div>

            <div className="wl-home-ai-question">
              <span>
                What opportunities can help me build
                my tech career?
              </span>
            </div>

            <div className="wl-home-ai-answer">
              <span className="wl-home-ai-answer-icon">
                <Sparkles size={17} />
              </span>

              <p>
                Explore relevant workshops, hackathons
                and internships from WayaLink's
                listings. I can help explain how
                they relate to your interests.
              </p>
            </div>

            <div className="wl-home-ai-demo-footer">
              <Search size={16} />
              Ask about your next opportunity...
              <ArrowUpRight size={17} />
            </div>
          </div>
        </section>

        {/* ==================================
            FEATURED OPPORTUNITIES
        ================================== */}

        <section
          id="wl-home-featured"
          className="wl-home-section wl-home-featured"
        >
          <div className="wl-home-section-intro">
            <div>
              <span className="wl-home-section-kicker">
                DISCOVER MORE
              </span>

              <h2>Featured opportunities</h2>

              <p>
                Explore current listings published
                on WayaLink.
              </p>
            </div>

            <Link
              to="/opportunities"
              className="wl-home-text-link"
            >
              View all listings
              <ArrowUpRight size={18} />
            </Link>
          </div>

          <div
            className="wl-home-filter-row"
            aria-label="Filter opportunities by category"
          >
            <button
              type="button"
              className={
                selectedCategory === "all" ? "active" : ""
              }
              aria-pressed={selectedCategory === "all"}
              onClick={() =>
                setSelectedCategory("all")
              }
            >
              All
            </button>

            {CATEGORIES.map((category) => (
              <button
                key={category.key}
                type="button"
                className={
                  selectedCategory === category.key
                    ? "active"
                    : ""
                }
                aria-pressed={
                  selectedCategory === category.key
                }
                onClick={() =>
                  setSelectedCategory(category.key)
                }
              >
                {category.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div
              className="wl-home-results-state"
              role="status"
            >
              Loading opportunities...
            </div>
          ) : error ? (
            <div
              className="wl-home-results-state"
              role="alert"
            >
              <h3>Couldn't load opportunities</h3>
              <p>{error}</p>
              <Link to="/opportunities">
                Visit opportunity directory
              </Link>
            </div>
          ) : featured.length === 0 ? (
            <div className="wl-home-results-state">
              <h3>No listings found</h3>
              <p>
                There are no opportunities in this
                category right now.
              </p>
              <button
                type="button"
                onClick={() =>
                  setSelectedCategory("all")
                }
              >
                Show all categories
              </button>
            </div>
          ) : (
            <div className="wl-home-opportunity-grid">
              {featured.map((item) => (
                <OpportunityPreview
                  key={item._id}
                  opportunity={item}
                />
              ))}
            </div>
          )}

          <div className="wl-home-more">
            <Link
              to="/opportunities"
              className="wl-home-more-button"
            >
              Explore All Opportunities
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* ==================================
            FINAL CTA
        ================================== */}

        <section className="wl-home-final-cta">
          <div>
            <span>YOUR NEXT CHAPTER</span>

            <h2>
              Your future won't wait.
              <br />
              Neither should you.
            </h2>

            <p>
              Start discovering opportunities
              that move you forward.
            </p>
          </div>

          <Link
            to={signedIn ? dashboardUrl : "/register"}
          >
            {signedIn
              ? "Go to My Dashboard"
              : "Get Started for Free"}

            <ArrowUpRight size={19} />
          </Link>
        </section>

      </main>

      {/* ==================================
          FOOTER
      ================================== */}

      <footer className="wl-home-footer">
        <div className="wl-home-footer-inner">
          <Link to="/" className="wl-home-footer-brand">
            <GraduationCap size={22} />
            WayaLink
          </Link>

          <p>
            Connecting students to possibilities.
          </p>

          <div className="wl-home-footer-links">
            <Link to="/opportunities">
              Opportunities
            </Link>

            <Link to={aiUrl}>
              AI Copilot
            </Link>

            <Link to={matchUrl}>
              Smart Match
            </Link>
          </div>
        </div>

        <div className="wl-home-footer-bottom">
          © {new Date().getFullYear()} WayaLink.
          Built for student growth.
        </div>
      </footer>
    </div>
  );
}
