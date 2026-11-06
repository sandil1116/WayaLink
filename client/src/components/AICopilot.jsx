
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import StudentNav from "./StudentNav";
import { useAuth } from "../context/AuthContext";
import "./AICopilot.css";

const SUGGESTED_QUESTIONS = [
  "What workshops are available?",
  "Find programming and technology opportunities",
  "Are there any internships I can explore?",
  "Show me hackathons and competitions"
];

export default function AICopilot() {
  const { user, token, authReady } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);
  const requestRef = useRef(null);
  const inFlightRef = useRef(false);
  const messageIdRef = useRef(0);

  const isStudent = user?.role === "student";

  function newMessageId() {
    messageIdRef.current += 1;
    return `${Date.now()}-${messageIdRef.current}`;
  }

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages, loading]);

  async function sendMessage(question) {
    const text = String(question || "").trim();

    if (
      !text ||
      text.length > 1000 ||
      inFlightRef.current ||
      !token ||
      !isStudent
    ) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError("");
    setInput("");

    const messageId = newMessageId();

    setMessages((previous) => [
      ...previous,
      {
        id: messageId,
        role: "user",
        content: text,
        opportunities: []
      }
    ]);

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        credentials: "same-origin",
        body: JSON.stringify({ message: text }),
        signal: controller.signal
      });

      const raw = await response.text();

      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          "WayaLink AI returned an invalid response."
        );
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Your login session has expired. Please sign in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "WayaLink AI is available to student accounts."
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
          `AI request failed (${response.status}).`
        );
      }

      if (
        typeof data.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error(
          "Gemini returned an empty answer."
        );
      }

      const opportunities = Array.isArray(
        data.opportunities
      )
        ? data.opportunities
            .filter(
              (item) =>
                item &&
                typeof item.id === "string" &&
                /^[a-f0-9]{24}$/i.test(item.id)
            )
            .map((item) => ({
              id: item.id,
              title: String(item.title || "Opportunity"),
              category: String(
                item.category || "Opportunity"
              ),
              url: `/opportunities/${item.id}`
            }))
        : [];

      setMessages((previous) => [
        ...previous,
        {
          id: newMessageId(),
          role: "assistant",
          content: data.answer.trim(),
          opportunities
        }
      ]);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(
          err.message ||
          "Unable to contact WayaLink AI."
        );

        // Restore the question for a simple retry.
        setInput(text);

        // Don't leave a duplicated user message
        // if the request failed.
        setMessages((previous) =>
          previous.filter(
            (message) => message.id !== messageId
          )
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }

      inFlightRef.current = false;

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  function clearConversation() {
    if (inFlightRef.current) return;

    setMessages([]);
    setInput("");
    setError("");
  }

  if (!authReady) {
    return (
      <main className="ai-page">
        <p className="ai-loading-page">
          Restoring your session...
        </p>
      </main>
    );
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!isStudent) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <main className="ai-page">
      <div className="ai-container">

        {/* Shared WayaLink navigation */}
        <StudentNav />

        {/* Hero */}
        <section className="ai-hero">
          <div className="ai-hero-badge">
            ✨ POWERED BY GEMINI
          </div>

          <h1>WayaLink AI Copilot</h1>

          <p>
            Discover opportunities, explore your
            interests, and take your next step
            with intelligent guidance.
          </p>
        </section>

        {/* Chat workspace */}
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
                  Explore real WayaLink opportunities
                  using natural language.
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
                  Hello,{" "}
                  {user.name?.split(" ")[0] ||
                    "Student"}!
                </h2>

                <p>
                  I'm your WayaLink AI Copilot.
                  Ask about workshops, internships,
                  hackathons, events, or competitions
                  listed on WayaLink.
                </p>

                <h3>Try asking:</h3>

                <div className="ai-suggestions">
                  {SUGGESTED_QUESTIONS.map(
                    (question) => (
                      <button
                        key={question}
                        type="button"
                        className="ai-suggestion"
                        disabled={loading}
                        onClick={() =>
                          sendMessage(question)
                        }
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
                className={
                  `ai-message ai-message-${message.role}`
                }
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
                    Searching real opportunities and
                    generating your answer...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="ai-error" role="alert">
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
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder="Ask about workshops, internships, skills, or opportunities..."
                rows={2}
                maxLength={1000}
                disabled={loading}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();

                    if (!loading && input.trim()) {
                      sendMessage(input);
                    }
                  }
                }}
              />

              <button
                type="submit"
                className="ai-send-button"
                disabled={loading || !input.trim()}
              >
                {loading ? "Thinking..." : "Send"}
              </button>
            </div>

            <div className="ai-input-footer">
              <span>
                {input.length}/1000 characters
              </span>

              <span>
                Enter to send · Shift + Enter
                for a new line
              </span>
            </div>
          </form>
        </section>

        <p className="ai-disclaimer">
          WayaLink AI generates answers using
          available opportunity listings.
          Verify eligibility, dates, and details
          before applying.
        </p>
      </div>
    </main>
  );
}
