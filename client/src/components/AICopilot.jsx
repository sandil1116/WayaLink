
import { useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import "./AICopilot.css";

const SUGGESTED_QUESTIONS = [
  "What workshops are available?",
  "Find programming and technology opportunities",
  "Are there any internships I can explore?",
  "Show me hackathons and competitions"
];

function AICopilot() {
  const navigate = useNavigate();

  const {
    user,
    token,
    authReady,
    logout
  } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  const isStudent = user?.role === "student";

  // Abort requests if the component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages, loading]);

  const sendMessage = async (question) => {
    const text = question.trim();

    if (
      !text ||
      text.length > 1000 ||
      loading ||
      !token ||
      !isStudent
    ) {
      return;
    }

    setError("");
    setInput("");
    setLoading(true);

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      opportunities: []
    };

    setMessages((previous) => [
      ...previous,
      userMessage
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },

        credentials: "same-origin",

        body: JSON.stringify({
          message: text
        }),

        signal: controller.signal
      });

      const responseText = await response.text();

      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          "Invalid response from WayaLink AI."
        );
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Your access token has expired. Please return to your profile and refresh your session."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "Only student accounts can use WayaLink AI."
          );
        }

        if (response.status === 429) {
          throw new Error(
            data.message ||
            "AI request limit reached. Please try again later."
          );
        }

        throw new Error(
          data.message ||
          "WayaLink AI could not process your question."
        );
      }

      if (typeof data.answer !== "string") {
        throw new Error(
          "The AI response did not contain an answer."
        );
      }

      const aiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        opportunities: Array.isArray(data.opportunities)
          ? data.opportunities
          : []
      };

      setMessages((previous) => [
        ...previous,
        aiMessage
      ]);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const clearConversation = () => {
    if (loading) return;

    setMessages([]);
    setInput("");
    setError("");
  };

  const handleLogout = () => {
    abortRef.current?.abort();
    logout();
    navigate("/login", { replace: true });
  };

  if (!authReady) {
    return (
      <main className="ai-page">
        <p className="ai-loading-page">
          Restoring your student session...
        </p>
      </main>
    );
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!isStudent) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="ai-page">
      <div className="ai-container">

        {/* Navigation */}
        <header className="ai-topbar">
          <Link to="/" className="ai-brand">
            WayaLink
          </Link>

          <nav className="ai-nav">
            <Link to="/opportunities">
              Opportunities
            </Link>

            <Link to="/profile">
              My Profile
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="ai-logout-button"
            >
              Logout
            </button>
          </nav>
        </header>

        {/* Introduction */}
        <section className="ai-hero">
          <div className="ai-hero-badge">
            ✨ Powered by Gemini
          </div>

          <h1>WayaLink AI Copilot</h1>

          <p>
            Discover university opportunities,
            explore your interests, and find
            your next step with AI assistance.
          </p>
        </section>

        {/* Chat */}
        <section
          className="ai-chat"
          aria-label="WayaLink AI chat"
        >
          <div className="ai-chat-header">
            <div className="ai-chat-title">
              <span className="ai-chat-icon">
                ✨
              </span>

              <div>
                <h2>Opportunity Assistant</h2>
                <p>
                  Search WayaLink listings using
                  natural language
                </p>
              </div>
            </div>

            <button
              type="button"
              className="ai-clear-button"
              onClick={clearConversation}
              disabled={
                loading || messages.length === 0
              }
            >
              New Chat
            </button>
          </div>

          <div
            className="ai-chat-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 && (
              <div className="ai-welcome">
                <div className="ai-welcome-icon">
                  ✨
                </div>

                <h2>
                  Hello, {user.name?.split(" ")[0] || "Student"}!
                </h2>

                <p>
                  I'm your WayaLink AI Copilot.
                  Ask me about workshops,
                  internships, hackathons,
                  competitions, and other
                  opportunities listed on WayaLink.
                </p>

                <h3>
                  Try asking:
                </h3>

                <div className="ai-suggestions">
                  {SUGGESTED_QUESTIONS.map(
                    (question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() =>
                          sendMessage(question)
                        }
                        disabled={loading}
                        className="ai-suggestion"
                      >
                        {question}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-message ai-message-${message.role}`}
              >
                <div className="ai-message-avatar">
                  {message.role === "user"
                    ? "👤"
                    : "✨"}
                </div>

                <div className="ai-message-content">
                  <div className="ai-message-label">
                    {message.role === "user"
                      ? "You"
                      : "WayaLink AI"}
                  </div>

                  <p className="ai-message-text">
                    {message.content}
                  </p>

                  {/* Grounded MongoDB opportunity links */}
                  {message.opportunities.length > 0 && (
                    <div className="ai-results">
                      <h3>
                        Related Opportunities
                      </h3>

                      <div className="ai-result-list">
                        {message.opportunities.map(
                          (item) => (
                            <Link
                              key={item.id}
                              to={item.url}
                              className="ai-result-card"
                            >
                              <span className="ai-result-category">
                                {item.category}
                              </span>

                              <strong>
                                {item.title}
                              </strong>

                              <span className="ai-result-link">
                                View Opportunity →
                              </span>
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message ai-message-assistant">
                <div className="ai-message-avatar">
                  ✨
                </div>

                <div className="ai-message-content">
                  <div className="ai-message-label">
                    WayaLink AI
                  </div>

                  <p
                    className="ai-thinking"
                    role="status"
                  >
                    Searching WayaLink and preparing
                    your answer...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div
                className="ai-error"
                role="alert"
              >
                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => setError("")}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Chat input */}
          <form
            className="ai-chat-form"
            onSubmit={handleSubmit}
          >
            <label
              htmlFor="ai-question"
              className="ai-input-label"
            >
              Ask WayaLink AI
            </label>

            <div className="ai-input-row">
              <textarea
                id="ai-question"
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                placeholder="Ask about opportunities, skills, or interests..."
                maxLength={1000}
                rows={2}
                disabled={loading}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();

                    if (!loading && input.trim()) {
                      sendMessage(input);
                    }
                  }
                }}
              />

              <button
                type="submit"
                className="ai-send-button"
                disabled={
                  loading || !input.trim()
                }
              >
                {loading
                  ? "Thinking..."
                  : "Send"}
              </button>
            </div>

            <div className="ai-input-footer">
              <span>
                {input.length}/1000 characters
              </span>

              <span>
                Enter to send • Shift + Enter
                for a new line
              </span>
            </div>
          </form>
        </section>

        {/* AI transparency */}
        <p className="ai-disclaimer">
          WayaLink AI uses available opportunity
          records to generate recommendations.
          Verify eligibility, dates, and
          registration details before applying.
          AI-generated answers may contain errors.
        </p>
      </div>
    </main>
  );
}

export default AICopilot;
