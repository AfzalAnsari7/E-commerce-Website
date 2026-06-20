import { useState, useRef, useEffect, useCallback } from "react";
import api from "../services";
import "./ChatWidget.css";

const POS_KEY = "chatWidgetPos";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "model", text }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]); // [{ id, label, provider, free }]
  const [model, setModel] = useState("");
  const [pos, setPos] = useState(null); // {x, y} top-left in px, or null = default (bottom-right)
  const bodyRef = useRef(null);
  const widgetRef = useRef(null);
  const drag = useRef(null);

  // Restore a previously dragged position
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY));
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") setPos(saved);
    } catch {
      /* ignore */
    }
  }, []);

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

  // ---- Dragging (mouse + touch via pointer events) ----
  const clamp = (x, y) => {
    const el = widgetRef.current;
    const w = el ? el.offsetWidth : 56;
    const h = el ? el.offsetHeight : 56;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, maxX)),
      y: Math.min(Math.max(8, y), Math.max(8, maxY)),
    };
  };

  const moveDrag = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setPos(clamp(d.bx + dx, d.by + dy));
  }, []);

  const endDrag = useCallback(() => {
    const d = drag.current;
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", endDrag);
    if (d) {
      const el = widgetRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        try {
          localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
        } catch {
          /* ignore */
        }
      }
      // A tap (no movement) on the closed bubble opens the chat
      if (d.isFab && !d.moved) setOpen(true);
    }
    drag.current = null;
  }, [moveDrag]);

  const beginDrag = (e, isFab) => {
    // When dragging the header, don't hijack clicks on its controls
    if (!isFab && e.target.closest("button, select, input, a, .btn-close")) return;
    const el = widgetRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, bx: r.left, by: r.top, moved: false, isFab };
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
  };

  const style = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : undefined;

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
    <div className="chat-widget" ref={widgetRef} style={style}>
      {open ? (
        <div className="card shadow chat-window">
          <div
            className="card-header chat-header"
            onPointerDown={(e) => beginDrag(e, false)}
          >
            <div className="d-flex justify-content-between align-items-center">
              <strong title="Drag to move">⠿ 🛍️ Shopping Assistant</strong>
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
          aria-label="Open shopping assistant (drag to move)"
          onPointerDown={(e) => beginDrag(e, true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        >
          💬
        </button>
      )}
    </div>
  );
}
