import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PriorityChip, StatusBadge } from "../../components/ui/Chips";
import { SLAMeter } from "../../components/ui/SLAMeter";
import { TextArea } from "../../components/ui/Field";
import { Module, Propiedad, LoadingBox } from "../../components/ui/Module";
import { cn } from "../../lib/cn";
import { PORTAL_USER } from "../../lib/data";
import { fmtRelative } from "../../lib/sla";
import { useStore } from "../../lib/store";
import { OPEN_STATUSES, STATUS_LABEL } from "../../lib/types";

export function MyTicketsView() {
  const { tickets, now, hydrating } = useStore();
  const mine = tickets
    .filter((t) => t.requester === PORTAL_USER.name)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const openCount = mine.filter((t) => OPEN_STATUSES.includes(t.status)).length;

  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] leading-[1.2] font-extrabold tracking-tight">
            Mis tickets
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {mine.length} registrados · <span className="font-mono tabular-nums">{openCount}</span> en atención
          </p>
        </div>
        <Link to="/portal">
          <Button variant="outline">Solicitar algo nuevo</Button>
        </Link>
      </div>

      {hydrating ? (
        <div className="mt-6">
          <LoadingBox label="Cargando tus tickets del servidor…" />
        </div>
      ) : mine.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-rule-2 bg-raised px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-ink">
            Aún no has registrado nada
          </p>
          <p className="max-w-sm text-[13px] text-ink-3">
            Cuando reportes un problema o pidas algo del catálogo, lo verás aquí
            con su número y su estado de atención.
          </p>
        </div>
      ) : (
        <ul className="mt-5 overflow-hidden rounded-xl border border-rule">
          {mine.map((t) => (
            <li key={t.id}>
              <Link
                to={`/portal/ticket/${t.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule px-4 py-3.5 transition-colors duration-150 first:border-t-0 hover:bg-raised"
              >
                <span className="font-mono text-[12px] tabular-nums text-ink-3">
                  {t.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                  {t.subject}
                </span>
                <StatusBadge status={t.status} />
                <SLAMeter ticket={t} now={now} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function eventLine(ev: { kind: string; to?: string; detail?: string }): string {
  switch (ev.kind) {
    case "creado":
      return "Registraste tu solicitud";
    case "estado":
      return ev.to === "resuelto"
        ? "El equipo marcó tu caso como resuelto"
        : `Estado: ${ev.to?.replace(/_/g, " ")}`;
    case "asignacion":
      return `Asignado a ${ev.to}`;
    case "nota":
      return "El equipo agregó una nota";
    case "adjunto":
      return "Se adjuntaron archivos";
    default:
      return ev.detail ?? "";
  }
}

export function PortalTicketView() {
  const { id } = useParams<{ id: string }>();
  const {
    getTicket,
    now,
    addNote,
    derivedNotice,
    clearDerivedNotice,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [note, setNote] = useState("");
  const justCreated = Boolean(
    (location.state as { creado?: boolean } | null)?.creado,
  );

  const ticket = id ? getTicket(id) : undefined;
  const isTerminal =
    !!ticket && (ticket.status === "cerrado" || ticket.status === "cancelado");
  // El aviso de derivación aplica a ESTE ticket
  const derivation =
    derivedNotice && derivedNotice.from === id ? derivedNotice : null;

  if (!ticket || ticket.requester !== PORTAL_USER.name) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-rule-2 bg-raised px-6 py-14 text-center">
        <p className="text-[15px] font-medium text-ink">Ticket no disponible</p>
        <p className="mt-1 text-[13px] text-ink-3">
          No encontramos este ticket entre tus solicitudes.
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => navigate("/portal/mis-tickets")}
        >
          Volver a mis tickets
        </Button>
      </div>
    );
  }

  const submitNote = () => {
    const text = note.trim();
    if (!text) return;
    // isEndUser: activa las reglas de reapertura del backend
    addNote(ticket.id, text, PORTAL_USER.name, true);
    setNote("");
  };

  return (
    <div className="mx-auto max-w-[760px] animate-rise">
      {justCreated ? (
        <p
          role="status"
          className="mb-5 flex items-start gap-2 rounded-xl border border-rule bg-raised px-4 py-3 text-[13.5px] text-ink-2"
        >
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-good" />
          Tu solicitud quedó registrada con el número{" "}
          <span className="font-mono tabular-nums">{ticket.id}</span>. Recibirás
          avisos por correo en cada avance.
        </p>
      ) : null}

      <nav aria-label="Ruta" className="flex items-center gap-2 text-[13px]">
        <Link
          to="/portal/mis-tickets"
          className="link-grow hover:link-grow-hover font-bold text-amber hover:text-amber-hi"
        >
          Mis tickets
        </Link>
        <span aria-hidden className="text-ink-3">/</span>
        <span className="font-mono text-[12.5px] tabular-nums text-ink-3">
          {ticket.id}
        </span>
      </nav>

      <h1 className="mt-3 font-display text-[24px] leading-[1.2] font-extrabold tracking-tight">
        {ticket.subject}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <StatusBadge status={ticket.status} />
        <PriorityChip priority={ticket.priority} />
        <SLAMeter ticket={ticket} now={now} />
      </div>

      <p className="mt-4 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">
        {ticket.description}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-12">
        <section className="sm:col-span-8" aria-label="Avances">
          <h2 className="label text-ink-2">Avances</h2>

          {derivation ? (
            <p
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-good/40 bg-good/10 px-4 py-3 text-[13.5px] text-ink-2"
            >
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-[2px] bg-good" />
              <span className="min-w-0">
                Tu respuesta registró el ticket{" "}
                <Link
                  to={`/portal/ticket/${derivation.to}`}
                  className="link-grow hover:link-grow-hover font-bold text-amber hover:text-amber-hi"
                  onClick={clearDerivedNotice}
                >
                  {derivation.to}
                </Link>
                . Este ticket permanece{" "}
                {STATUS_LABEL[ticket.status].toLowerCase()} y no se modifica;
                el seguimiento continúa en el nuevo.
              </span>
            </p>
          ) : null}

          {isTerminal ? (
            <p className="mb-3 rounded-xl border border-rule bg-raised px-4 py-3 text-[13px] leading-relaxed text-ink-3">
              Este ticket está{" "}
              <strong className="font-semibold text-ink-2">
                {STATUS_LABEL[ticket.status].toLowerCase()}
              </strong>{" "}
              y no puede modificarse. Si el problema persiste, escríbelo abajo:
              registraremos un{" "}
              <strong className="font-semibold text-ink-2">ticket nuevo</strong>{" "}
              vinculado a este.
            </p>
          ) : null}

          <div className="mt-3 rounded-xl border border-rule bg-raised p-3">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submitNote();
                }
              }}
              placeholder={
                isTerminal
                  ? "Cuéntanos qué sigue pasando — abriremos un ticket nuevo…"
                  : "Agregar información para el equipo (visible en tu ticket)…"
              }
              aria-label="Comentario"
              className="min-h-16 border-0 bg-transparent focus:border-0"
            />
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="font-mono text-[11px] text-ink-3">Ctrl+⏎ envía</p>
              <Button
                variant="outline"
                size="sm"
                disabled={!note.trim()}
                onClick={submitNote}
              >
                Enviar comentario
              </Button>
            </div>
          </div>

          <ol className="relative mt-5 space-y-5 border-l border-rule pl-5">
            {ticket.events.map((ev) => (
              <li key={ev.id} className="relative">
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1 -left-[26.5px] size-2 rounded-full",
                    ev.kind === "creado"
                      ? "bg-ink"
                      : ev.kind === "estado"
                        ? "bg-ink/50"
                        : "bg-rule-2",
                  )}
                />
                <p className="text-[12.5px] text-ink-3">
                  {eventLine(ev)} · {fmtRelative(ev.at, now)}
                </p>
                {ev.detail && ev.kind === "nota" ? (
                  <p className="mt-0.5 max-w-[65ch] rounded-xl border border-rule bg-raised px-3 py-2 text-[13.5px] text-ink-2">
                    {ev.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <aside className="sm:col-span-4">
          <Module title="Tu solicitud">
            <dl>
              <Propiedad label="Número">
                <span className="font-mono text-[12px] tabular-nums">
                  {ticket.id}
                </span>
              </Propiedad>
              <Propiedad label="Área">{ticket.dept}</Propiedad>
              <Propiedad label="Registrado">
                {fmtRelative(ticket.createdAt, now)}
              </Propiedad>
              <Propiedad label="Último avance">
                {fmtRelative(ticket.updatedAt, now)}
              </Propiedad>
            </dl>
          </Module>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
            ¿Se resolvió solo? Revisa la{" "}
            <Link
              to="/portal/ayuda"
              className="link-grow hover:link-grow-hover font-bold text-amber hover:text-amber-hi"
            >
              base de conocimiento
            </Link>{" "}
            antes de escribir.
          </p>
        </aside>
      </div>
    </div>
  );
}
