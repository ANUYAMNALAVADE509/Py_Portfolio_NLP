import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./AIAssistant.css";


const API_BASE =
  import.meta.env.VITE_API_URL || "";


const STARTER_PROMPTS = [
  "Explain beta in the stock market in simple terms.",
  "What is the difference between volatility and risk?",
  "Why did Reliance fall today?",
  "What happened to TCS this week?",
  "Show me the latest news affecting Infosys.",
  "Explain Value at Risk like I'm a beginner.",
];


function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}


function formatDate(value) {

  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}


function getHistoryForApi(messages) {

  return messages
    .filter(
      (message) =>
        message.role === "user" ||
        message.role === "assistant"
    )
    .slice(-6)
    .map(
      (message) => ({
        role: message.role,
        content: message.content,
      })
    );
}


export default function AIAssistant() {

  const [messages, setMessages] =
    useState([
      {
        id: createId(),
        role: "assistant",
        content:
          "Hello. I’m QuantRisk AI. Ask me about financial concepts, portfolio risk, stocks, market news, or your portfolio research.",
        citations: [],
      },
    ]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [status, setStatus] =
    useState("checking");

  const [error, setError] =
    useState("");

  const [openSources, setOpenSources] =
    useState({});

  const [copiedId, setCopiedId] =
    useState(null);

  const bottomRef =
    useRef(null);

  const inputRef =
    useRef(null);


  const lastUserQuestion =
    useMemo(
      () =>
        [...messages]
          .reverse()
          .find(
            (message) =>
              message.role === "user"
          ),
      [messages]
    );


  // ========================================================
  // Scroll conversation to latest message
  // ========================================================

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

  }, [messages, loading]);


  // ========================================================
  // Check assistant health
  // ========================================================

  useEffect(() => {

    let cancelled = false;

    async function checkHealth() {

      try {

        const response =
          await fetch(
            `${API_BASE}/api/assistant/health`
          );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (
          response.ok &&
          data?.status === "success" &&
          data?.ollama?.model_available
        ) {

          setStatus("online");

        } else {

          setStatus("offline");
        }

      } catch {

        if (!cancelled) {
          setStatus("offline");
        }
      }
    }

    checkHealth();

    return () => {
      cancelled = true;
    };

  }, []);


  // ========================================================
  // Send message
  // ========================================================

  async function sendMessage(
    suppliedMessage
  ) {

    const question =
      (
        typeof suppliedMessage === "string"
          ? suppliedMessage
          : input
      ).trim();

    if (!question || loading) {
      return;
    }

    const userMessage = {
      id: createId(),
      role: "user",
      content: question,
    };

    const history =
      getHistoryForApi(messages);

    setMessages(
      (current) => [
        ...current,
        userMessage,
      ]
    );

    setInput("");
    setError("");
    setLoading(true);

    try {

      const controller =
        new AbortController();

      const timeout =
        window.setTimeout(
          () => controller.abort(),
          100000
        );

      let response;

      try {

        response =
          await fetch(
            `${API_BASE}/api/assistant/chat`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                message: question,
                symbols: [],
                history,
              }),

              signal:
                controller.signal,
            }
          );

      } finally {

        window.clearTimeout(
          timeout
        );
      }

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          "The assistant returned an invalid response."
        );
      }

      if (
        !response.ok ||
        data?.status === "error"
      ) {

        throw new Error(
          data?.detail ||
          data?.message ||
          "The AI Assistant could not answer the question."
        );
      }

      if (
        !data?.answer ||
        !data.answer.trim()
      ) {

        throw new Error(
          "The assistant returned an empty answer."
        );
      }

      const assistantMessage = {

        id: createId(),

        role: "assistant",

        content:
          data.answer,

        citations:
          Array.isArray(
            data.citations
          )
            ? data.citations
            : [],

        intent:
          data.intent || "",

        symbols:
          Array.isArray(
            data.symbols
          )
            ? data.symbols
            : [],

        evidenceCount:
          data.evidence_count || 0,
      };

      setMessages(
        (current) => [
          ...current,
          assistantMessage,
        ]
      );

      setStatus("online");

    } catch (requestError) {

      if (
        requestError?.name ===
        "AbortError"
      ) {

        setError(
          "The request took too long. Please try a shorter question."
        );

      } else {

        setError(
          requestError?.message ||
          "The AI Assistant could not answer the question."
        );
      }

      setStatus(
        (current) =>
          current === "checking"
            ? "offline"
            : current
      );

    } finally {

      setLoading(false);

      window.setTimeout(
        () => {
          inputRef.current?.focus();
        },
        50
      );
    }
  }


  // ========================================================
  // Keyboard handling
  // ========================================================

  function handleKeyDown(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();
    }
  }


  // ========================================================
  // Copy answer
  // ========================================================

  async function copyAnswer(
    message
  ) {

    try {

      await navigator.clipboard.writeText(
        message.content
      );

      setCopiedId(
        message.id
      );

      window.setTimeout(
        () => {
          setCopiedId(null);
        },
        1500
      );

    } catch {

      setError(
        "The answer could not be copied."
      );
    }
  }


  // ========================================================
  // Regenerate latest question
  // ========================================================

  function regenerate() {

    if (
      !lastUserQuestion ||
      loading
    ) {
      return;
    }

    sendMessage(
      lastUserQuestion.content
    );
  }


  return (
    <div className="ai-page">

      {/* ================================================== */}
      {/* Header */}
      {/* ================================================== */}

      <section className="ai-hero">

        <div className="ai-hero-copy">

          <div className="ai-kicker">

            <span className="ai-spark">
              ✦
            </span>

            FINANCIAL RESEARCH COPILOT

          </div>

          <h1>
            QuantRisk AI Assistant
          </h1>

          <p>
            Ask natural-language questions about
            stocks, markets, portfolio risk and
            financial concepts.
          </p>

        </div>

        <div
          className={`ai-status ai-status-${status}`}
        >

          <span className="ai-status-dot" />

          {status === "online" &&
            "AI Online"}

          {status === "checking" &&
            "Checking AI"}

          {status === "offline" &&
            "AI Offline"}

        </div>

      </section>


      {/* ================================================== */}
      {/* Starter questions */}
      {/* ================================================== */}

      <section className="ai-starters">

        <div className="ai-section-heading">

          <span>
            TRY ASKING
          </span>

          <p>
            Suggestions only — you can ask
            anything in your own words.
          </p>

        </div>

        <div className="ai-starter-grid">

          {STARTER_PROMPTS.map(
            (prompt) => (

              <button
                key={prompt}
                type="button"
                className="ai-starter"
                onClick={() =>
                  sendMessage(prompt)
                }
                disabled={loading}
              >

                <span className="ai-starter-icon">
                  →
                </span>

                <span>
                  {prompt}
                </span>

              </button>
            )
          )}

        </div>

      </section>


      {/* ================================================== */}
      {/* Conversation */}
      {/* ================================================== */}

      <section className="ai-conversation">

        <div className="ai-conversation-header">

          <div>

            <span>
              CONVERSATION
            </span>

            <h2>
              Research session
            </h2>

          </div>

          {messages.length > 1 && (

            <button
              type="button"
              className="ai-regenerate-top"
              onClick={regenerate}
              disabled={
                loading ||
                !lastUserQuestion
              }
            >
              ↻ Regenerate
            </button>

          )}

        </div>


        <div className="ai-messages">

          {messages.map(
            (message) => (

              <article
                key={message.id}
                className={`ai-message ai-message-${message.role}`}
              >

                <div className="ai-message-avatar">

                  {message.role === "user"
                    ? "U"
                    : "✦"}

                </div>

                <div className="ai-message-body">

                  <div className="ai-message-meta">

                    <strong>
                      {message.role === "user"
                        ? "You"
                        : "QuantRisk AI"}
                    </strong>

                    {message.intent && (
                      <span className="ai-intent">
                        {message.intent}
                      </span>
                    )}

                  </div>

                  <div className="ai-message-content">
                    {message.content}
                  </div>


                  {/* ====================================== */}
                  {/* Sources */}
                  {/* ====================================== */}

                  {message.role ===
                    "assistant" &&
                    message.citations?.length >
                      0 && (

                    <div className="ai-sources">

                      <button
                        type="button"
                        className="ai-sources-toggle"
                        onClick={() =>
                          setOpenSources(
                            (current) => ({
                              ...current,
                              [message.id]:
                                !current[
                                  message.id
                                ],
                            })
                          )
                        }
                      >

                        <span>
                          Sources
                        </span>

                        <span>
                          {message.citations.length}
                          {" "}
                          source
                          {message.citations.length !==
                            1
                            ? "s"
                            : ""}
                        </span>

                        <span>
                          {openSources[
                            message.id
                          ]
                            ? "⌃"
                            : "⌄"}
                        </span>

                      </button>


                      {openSources[
                        message.id
                      ] && (

                        <div className="ai-source-list">

                          {message.citations.map(
                            (
                              citation,
                              index
                            ) => (

                              <a
                                key={`${citation.url}-${index}`}
                                href={
                                  citation.url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="ai-source-card"
                              >

                                <span className="ai-source-number">
                                  {index + 1}
                                </span>

                                <span className="ai-source-info">

                                  <strong>
                                    {
                                      citation.title ||
                                      "Financial source"
                                    }
                                  </strong>

                                  <small>

                                    {
                                      citation.source ||
                                      "Source"
                                    }

                                    {citation.published_at &&
                                      ` · ${formatDate(
                                        citation.published_at
                                      )}`}

                                  </small>

                                </span>

                                <span>
                                  ↗
                                </span>

                              </a>
                            )
                          )}

                        </div>

                      )}

                    </div>

                  )}


                  {/* ====================================== */}
                  {/* Answer actions */}
                  {/* ====================================== */}

                  {message.role ===
                    "assistant" && (

                    <div className="ai-answer-actions">

                      <button
                        type="button"
                        onClick={() =>
                          copyAnswer(
                            message
                          )
                        }
                      >
                        {copiedId ===
                        message.id
                          ? "Copied"
                          : "Copy"}
                      </button>

                      <button
                        type="button"
                        onClick={
                          regenerate
                        }
                        disabled={
                          loading ||
                          !lastUserQuestion
                        }
                      >
                        Regenerate
                      </button>

                    </div>

                  )}

                </div>

              </article>
            )
          )}


          {/* ============================================ */}
          {/* Loading */}
          {/* ============================================ */}

          {loading && (

            <article className="ai-message ai-message-assistant">

              <div className="ai-message-avatar">
                ✦
              </div>

              <div className="ai-message-body">

                <div className="ai-message-meta">
                  <strong>
                    QuantRisk AI
                  </strong>
                </div>

                <div className="ai-thinking">

                  <span className="ai-thinking-dot" />
                  <span className="ai-thinking-dot" />
                  <span className="ai-thinking-dot" />

                  <span>
                    Analyzing your question...
                  </span>

                </div>

              </div>

            </article>

          )}

          <div
            ref={bottomRef}
          />

        </div>

      </section>


      {/* ================================================== */}
      {/* Error */}
      {/* ================================================== */}

      {error && (

        <div className="ai-error">

          <div>

            <strong>
              Assistant could not complete
              that request.
            </strong>

            <p>
              {error}
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>

        </div>

      )}


      {/* ================================================== */}
      {/* Composer */}
      {/* ================================================== */}

      <section className="ai-composer">

        <div className="ai-composer-inner">

          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) =>
              setInput(
                event.target.value
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your portfolio, stocks, markets, risk or financial concepts..."
            rows={1}
            disabled={loading}
            aria-label="Ask QuantRisk AI"
          />

          <button
            type="button"
            className="ai-send"
            onClick={() =>
              sendMessage()
            }
            disabled={
              loading ||
              !input.trim()
            }
            aria-label="Send question"
          >
            {loading
              ? "..."
              : "↑"}
          </button>

        </div>

        <div className="ai-composer-note">

          <span>
            QuantRisk AI
          </span>

          <span>
            Current financial claims are
            evidence-backed when sources are
            available.
          </span>

        </div>

      </section>

    </div>
  );
}