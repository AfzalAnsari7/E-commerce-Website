import { useState, useRef, useEffect } from "react";
import api from "../services";
import "./ChatWidget.css";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "model", text }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]); // [{ id, label, provider, free }]
  const [model, setModel] = useState("");
  const bodyRef = useRef(null);

  // Load the list of available models once the chat opens
  useEffect(() => {
    if (!open || models.length) return;
    api
      .get("/api/chat/models")
      .then(({ data }) => {
        setModels(data.models || []);
        if (data.models?.length) setModel(data.models[0].id);
      })
      .catch(() => setModels([]));
  }, [open, models.length]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/api/chat", {
        message: text,
        history: messages,
        model, // selected in the dropdown
      });
      setMessages([...next, { role: "model", text: data.reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "model", text: "Sorry, I couldn't respond right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      {open ? (
        <div className="card shadow chat-window">
          <div className="card-header chat-header">
            <div className="d-flex justify-content-between align-items-center">
              <strong>🛍️ Shopping Assistant</strong>
              <button
                className="btn-close"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              />
            </div>
            {models.length > 0 && (
              <select
                className="form-select form-select-sm mt-2 chat-model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                aria-label="Select AI model"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.free ? " · free" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="card-body chat-body" ref={bodyRef}>
            {messages.length === 0 && (
              <p className="text-muted small">
                Hi! Ask me about our products, sizes, or shipping. 😊
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-row ${m.role === "user" ? "from-user" : "from-bot"}`}
              >
                <span className={`chat-bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"}`}>
                  {m.text}
                </span>
              </div>
            ))}
            {loading && <p className="text-muted small mb-0">Typing…</p>}
          </div>

          <div className="card-footer p-2">
            <div className="input-group">
              <input
                className="form-control"
                value={input}
                placeholder="Type a message…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn btn-primary" onClick={send} disabled={loading}>
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary chat-fab"
          aria-label="Open shopping assistant"
          onClick={() => setOpen(true)}
        >
          💬
        </button>
      )}
    </div>
  );
}
