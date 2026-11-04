import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSupabaseClient } from "../lib/supabase";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

const suggestions = [
  "Habitaciones ocupadas",
  "Habitaciones pendientes",
];

export default function HotelAssistant() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      content:
        "Hola. Puedo consultar la ocupación, las habitaciones, el personal y los movimientos recientes.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || sending) return;

    const history = messages
      .filter((item) => !item.error)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    const userMessage: ChatMessage = {
      id: ++messageId.current,
      role: "user",
      content: message,
    };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setSending(true);

    try {
      const { data, error } = await getSupabaseClient().functions.invoke<{
        answer?: string;
        error?: string;
      }>("hotel-chat", { body: { message, history } });

      if (error) {
        let detail = error.message;
        if (error.context instanceof Response) {
          try {
            const body = await error.context.clone().json() as { error?: string };
            if (body.error) detail = body.error;
          } catch {
            // Use the function error message when the response is not JSON.
          }
        }
        throw new Error(detail);
      }
      if (!data?.answer) {
        throw new Error(data?.error || "El asistente devolvió una respuesta vacía.");
      }
      setMessages((current) => [
        ...current,
        { id: ++messageId.current, role: "assistant", content: data.answer! },
      ]);
    } catch (requestError: unknown) {
      setMessages((current) => [
        ...current,
        {
          id: ++messageId.current,
          role: "assistant",
          content: requestError instanceof Error
            ? requestError.message
            : "No se pudo consultar el asistente.",
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(prompt);
  }

  return (
    <>
      {open && (
        <section className="assistant-panel" aria-label="Asistente de operaciones">
          <header className="assistant-header">
            <div>
              <span className="assistant-avatar material-symbol" aria-hidden="true">auto_awesome</span>
              <strong>Asistente del hotel</strong>
              <span>Consultas operativas con IA</span>
            </div>
            <button
              className="assistant-close"
              type="button"
              aria-label="Cerrar asistente"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((item) => (
              <p
                className={`assistant-message assistant-${item.role}${item.error ? " assistant-error" : ""}`}
                key={item.id}
              >
                {item.content}
              </p>
            ))}
            {sending && <p className="assistant-message assistant-pending">Consultando…</p>}
            <div ref={endRef} />
          </div>
          {messages.length === 1 && (
            <div className="assistant-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={sending}
                  onClick={() => void sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form className="assistant-form" onSubmit={handleSubmit}>
            <input
              aria-label="Pregunta sobre el hotel"
              autoComplete="off"
              maxLength={2000}
              placeholder="Pregunta sobre el hotel…"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <button className="button button-primary" disabled={sending || !prompt.trim()}>
              Enviar
            </button>
          </form>
        </section>
      )}
      <button
        className="assistant-trigger"
        type="button"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente de IA"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="material-symbol" aria-hidden="true">
          {open ? "close" : "auto_awesome"}
        </span>
      </button>
    </>
  );
}