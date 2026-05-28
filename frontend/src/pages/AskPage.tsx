import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

export function AskPage() {
  const { user, token, can } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Ask me anything. Use + to ingest PDF/TXT knowledge for your tenant." }
  ]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!can("query:run") || !trimmed || busy) return;
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuery("");
    try {
      const res = await api.query(user!.tenantId, token!, trimmed);
      const reply = res.answer ?? res.warning ?? "No answer returned";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "system", text: `Error: ${(err as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        await api.uploadPdfDocument(user!.tenantId, token!, file);
      } else {
        const content = await file.text();
        await api.uploadDocument(user!.tenantId, token!, { fileName: file.name, content });
      }
      setMessages((prev) => [...prev, { role: "system", text: `${file.name} ingested successfully.` }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "system", text: `Ingestion failed: ${(err as Error).message}` }]);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="chat-wrap">
      <div className="chat-scroll">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={ask} className="chat-composer">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          onChange={onPickFile}
          style={{ display: "none" }}
        />
        <button type="button" className="plus-btn" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          +
        </button>
        <textarea
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything..."
        />
        <button type="submit" disabled={!can("query:run") || busy || !query.trim()}>
          {busy ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
