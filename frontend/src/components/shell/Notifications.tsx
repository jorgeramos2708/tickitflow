import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { api, type ApiNotification } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import { fmtRelative } from "../../lib/sla";
import { useStore } from "../../lib/store";

const ROUTING_TEXT: Record<string, string> = {
  "ticket.created": "Ticket registrado",
  "ticket.updated": "Ticket actualizado",
  "problem.updated": "Problema actualizado",
  "change.updated": "Cambio actualizado",
  "change.approved": "Cambio aprobado",
  "change.rejected": "Cambio rechazado",
};

export function NotificationsBell() {
  const { live, token } = useAuth();
  const { now } = useStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [lastEvent, setLastEvent] = useState<ApiNotification | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // D7: Escape y click-fuera cierran; el foco entra al abrir (dialog)
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onDocKey);
    document.addEventListener("mousedown", onDocDown);
    return () => {
      document.removeEventListener("keydown", onDocKey);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [open]);

  const load = useCallback(() => {
    if (!live || !token) return;
    api
      .listNotifications(token, 20)
      .then(setItems)
      .catch((err) => console.error("[notificaciones]", err));
  }, [live, token]);

  // Carga inicial + fallback polling (si SSE falla)
  useEffect(() => {
    if (!live || !token) return;
    load();
  }, [live, token, load]);

  // SSE: stream en tiempo real (token por query param)
  useEffect(() => {
    if (!live || !token) return;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      load();
      pollTimer = setInterval(load, 15_000);
    };

    const stopAll = () => {
      if (source) {
        source.close();
        source = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    try {
      source = new EventSource(
        `/api/notifications/notifications/stream?token=${encodeURIComponent(token)}`,
      );
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ApiNotification;
          setLastEvent(data);
          setItems((prev) => {
            if (prev.some((n) => n.id === data.id)) return prev;
            return [data, ...prev].slice(0, 20);
          });
        } catch {
          // Ignorar mensajes no parseables
        }
      };
      source.onerror = () => {
        stopAll();
        startPolling();
      };
    } catch {
      startPolling();
    }

    return stopAll;
  }, [live, token, load]);

  // Cuando llega una notificación nueva vía SSE, actualizar el reloj de la lista
  useEffect(() => {
    if (lastEvent) {
      setItems((prev) => {
        if (prev.some((n) => n.id === lastEvent.id)) return prev;
        return [lastEvent, ...prev].slice(0, 20);
      });
    }
  }, [lastEvent]);

  if (!live) return null;

  // Cierre accesible: Escape y click-fuera; el foco vuelve a la campana
  const closePopover = () => {
    setOpen(false);
    bellRef.current?.focus();
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={bellRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
        aria-label={`Notificaciones (${items.length})`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex size-8 cursor-pointer items-center justify-center rounded-xl transition-colors duration-150",
          open
            ? "bg-ink text-paper"
            : "text-ink-3 hover:bg-ink/5 hover:text-ink",
        )}
      >
        <Bell size={15} strokeWidth={1.75} aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificaciones recientes"
          className="absolute top-11 right-0 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-rule bg-raised shadow-3"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              closePopover();
            }
          }}
        >
          <header className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <h2 className="label text-ink-2">Notificaciones</h2>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => closePopover()}
              aria-label="Cerrar notificaciones"
              className="cursor-pointer rounded-lg p-1 text-ink-3 transition-colors duration-150 hover:bg-row-hover hover:text-ink"
            >
              <X size={14} strokeWidth={2} aria-hidden />
            </button>
          </header>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[15px] text-ink-3">
              Sin eventos todavía. Cada registro o cambio de estado aparecerá
              aquí en cuanto ocurra.
            </p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="flex items-baseline gap-2.5 border-t border-rule px-4 py-2.5 first:border-t-0"
                >
                  <span className="text-[13px] text-ink-2">
                    {ROUTING_TEXT[n.routingKey] ?? n.routingKey}
                  </span>
                  {n.code ? (
                    <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
                      {n.code}
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-ink-3">
                    {fmtRelative(Date.parse(n.occurredAt), now)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
