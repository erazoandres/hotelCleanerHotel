import type { ReactNode } from "react";
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

async function readFunctionError(response: Response): Promise<{ error?: string; code?: string } | null> {
  try {
    return await response.clone().json() as { error?: string; code?: string };
  } catch {
    return null;
  }
}

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
      const supabase = getSupabaseClient();
      const invokeChat = (accessToken?: string) => supabase.functions.invoke<{
        answer?: string;
        error?: string;
      }>("hotel-chat", {
        body: { message, history },
        ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
      });
      let { data, error } = await invokeChat();

      if (error) {
        const status = error.context instanceof Response ? error.context.status : null;
        const body = error.context instanceof Response
          ? await readFunctionError(error.context)
          : null;
        if (
          status === 401
          || body?.code === "invalid_session"
          || body?.error === "Se requiere una sesión administrativa válida."
        ) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            throw new Error("La sesión venció. Cierra sesión y vuelve a ingresar para consultar al asistente.");
          }
          if (!refreshed.session) {
            throw new Error("La sesión venció. Cierra sesión y vuelve a ingresar para consultar al asistente.");
          }
          if (refreshed.session.user.app_metadata.role !== "hotel_admin") {
            throw new Error("La cuenta no tiene permisos de administrador. Solicita el rol hotel_admin al administrador del proyecto.");
          }
          ({ data, error } = await invokeChat(refreshed.session.access_token));
        }
      }

      if (error) {
        const body = error.context instanceof Response
          ? await readFunctionError(error.context)
          : null;
        throw new Error(body?.error || error.message);
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
              <div
                className={`assistant-message assistant-${item.role}${item.error ? " assistant-error" : ""}`}
                key={item.id}
              >
                {item.role === "assistant"
                  ? renderAssistantContent(item.content)
                  : item.content}
              </div>
            ))}
            {sending && <div className="assistant-message assistant-pending">Consultando…</div>}
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

function renderAssistantContent(content: string): ReactNode[] {
  const lines = content.trim().split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push(
        <strong className="assistant-content-heading" key={`heading-${index}`}>
          {renderInlineFormatting(heading[2])}
        </strong>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul className="assistant-content-list" key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineFormatting(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol className="assistant-content-list" key={`ordered-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineFormatting(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length
      && lines[index].trim()
      && !/^(#{1,3}\s+|[-*]\s+|\d+[.)]\s+)/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p className="assistant-content-paragraph" key={`paragraph-${index}`}>
        {renderInlineFormatting(paragraph.join(" "))}
      </p>,
    );
  }

  return blocks;
}

function renderInlineFormatting(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}