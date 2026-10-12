import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, MousePointerClick, RefreshCw, Search, X } from "lucide-react";
import { TicketTable } from "../components/queue/TicketTable";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/Field";
import { LoadingBox } from "../components/ui/Module";
import { cn } from "../lib/cn";
import { slaOf } from "../lib/sla";
import { useStore } from "../lib/store";
import { TicketDetail } from "./TicketDetail";
import {
  OPEN_STATUSES,
  PRACTICE_LABEL,
  type Practice,
  type Priority,
  type TicketStatus,
} from "../lib/types";

const STATUS_FILTERS: {
  value: TicketStatus | "todos";
  label: string;
}[] = [
  { value: "todos", label: "Todos" },
  { value: "nuevo", label: "Nuevo" },
  { value: "asignado", label: "Asignado" },
  { value: "en_progreso", label: "En progreso" },
  { value: "pendiente_usuario", label: "En espera" },
  { value: "resuelto", label: "Resuelto" },
  { value: "cerrado", label: "Cerrado" },
  { value: "cancelado", label: "Cancelado" },
];

/** Hover y activo por estado (mismo lenguaje del StatusBadge) */
const STATUS_STYLE: Record<TicketStatus, { active: string; hover: string }> = {
  nuevo: {
    active: "border-status-nuevo/40 bg-status-nuevo/15 text-status-nuevo",
    hover: "hover:border-status-nuevo/60",
  },
  asignado: {
    active: "border-status-asignado/40 bg-status-asignado/15 text-status-asignado",
    hover: "hover:border-status-asignado/60",
  },
  en_progreso: {
    active: "border-status-progreso/40 bg-status-progreso/15 text-status-progreso",
    hover: "hover:border-status-progreso/60",
  },
  pendiente_usuario: {
    active: "border-status-espera/40 bg-status-espera/15 text-status-espera",
    hover: "hover:border-status-espera/60",
  },
  resuelto: {
    active: "border-status-resuelto/40 bg-status-resuelto/15 text-status-resuelto",
    hover: "hover:border-status-resuelto/60",
  },
  cerrado: {
    active: "border-status-cerrado/40 bg-status-cerrado/15 text-status-cerrado",
    hover: "hover:border-status-cerrado/60",
  },
  cancelado: {
    active: "border-rule-2 bg-raised text-ink-3",
    hover: "hover:border-rule-2",
  },
};

/** Hover y activo por prioridad (semáforo relleno) */
const PRIORITY_STYLE: Record<Priority, { active: string; hover: string }> = {
  P1: { active: "border-transparent bg-p1 text-p1-ink", hover: "hover:border-p1/60" },
  P2: { active: "border-transparent bg-p2 text-p2-ink", hover: "hover:border-p2/60" },
  P3: { active: "border-transparent bg-p3 text-p3-ink", hover: "hover:border-p3/60" },
  P4: { active: "border-transparent bg-p4 text-p4-ink", hover: "hover:border-p4/60" },
};

const PRIORITY_FILTERS: (Priority | "todas")[] = [
  "todas",
  "P1",
  "P2",
  "P3",
  "P4",
];

function FilterChip({
  active,
  children,
  onClick,
  activeClass,
  hoverClass,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  /** Clases del estado activo (color por estado/prioridad); default ámbar */
  activeClass?: string;
  /** Clases del hover (color del propio filtro); default ámbar */
  hoverClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 cursor-pointer rounded-lg border px-2.5 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-px",
        active
          ? (activeClass ?? "border-amber-fill bg-amber-fill text-amber-fill-ink")
          : cn("border-rule text-ink-2", hoverClass ?? "hover:border-amber"),
      )}
    >
      {children}
    </button>
  );
}

export function QueueView() {
  const { practice } = useParams<{ practice: string }>();
  const {
    tickets,
    now,
    hydrating,
    hydrateFailed,
    live,
    hasMoreTickets,
    loadMoreTickets,
    reload,
    getTicket,
  } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selected = searchParams.get("ticket");
  const paneRef = useRef<HTMLElement>(null);
  const select = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("ticket", id);
    else next.delete("ticket");
    setSearchParams(next, { replace: true });
    // En móvil el panel vive bajo la tabla: llevarlo a la vista al elegir
    if (id && window.innerWidth < 1024) {
      requestAnimationFrame(() =>
        paneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  };

  // C7: deep-link a un ticket más viejo que la página 1 — buscar en
  // páginas subsiguientes (máx. 5 cargas automáticas por selección)
  const selectedTicket = selected ? getTicket(selected) : undefined;
  const searchPagesRef = useRef(0);
  useEffect(() => {
    searchPagesRef.current = 0;
  }, [selected]);
  useEffect(() => {
    if (!selected || !live || hydrating || selectedTicket) return;
    if (!hasMoreTickets || searchPagesRef.current >= 5) return;
    searchPagesRef.current += 1;
    void loadMoreTickets();
  }, [selected, live, hydrating, selectedTicket, hasMoreTickets, loadMoreTickets]);
  const stillSearching =
    !!selected &&
    live &&
    !selectedTicket &&
    !hydrating &&
    hasMoreTickets &&
    searchPagesRef.current < 5;

  const [status, setStatus] = useState<TicketStatus | "todos">("todos");
  const [priority, setPriority] = useState<Priority | "todas">("todas");
  const [query, setQuery] = useState("");

  const valid: Practice | null =
    practice === "incidente" || practice === "requerimiento" ? practice : null;

  const filtered = useMemo(() => {
    if (!valid) return [];
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (t.practice !== valid) return false;
      if (status !== "todos" && t.status !== status) return false;
      if (priority !== "todas" && t.priority !== priority) return false;
      if (q) {
        const haystack = `${t.id} ${t.subject} ${t.requester}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, valid, status, priority, query]);

  const open = useMemo(
    () =>
      valid
        ? tickets.filter(
            (t) => t.practice === valid && OPEN_STATUSES.includes(t.status),
          )
        : [],
    [tickets, valid],
  );
  const atRisk = useMemo(
    () => open.filter((t) => slaOf(t, now).level !== "ok").length,
    [open, now],
  );

  if (!valid) {
    return (
      <EmptyQueue
        title="Cola no encontrada"
        hint="La práctica solicitada no existe en esta versión."
      />
    );
  }

  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-tight">
            {PRACTICE_LABEL[valid]}s
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {open.length} abiertos ·{" "}
            <span className={atRisk > 0 ? "font-mono tabular-nums text-amber" : ""}>
              {atRisk} en riesgo de SLA
            </span>
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(`/nuevo?practice=${valid}`)}
        >
          Nuevo {PRACTICE_LABEL[valid].toLowerCase()}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            active={status === f.value}
            onClick={() => setStatus(f.value)}
            activeClass={f.value === "todos" ? undefined : STATUS_STYLE[f.value].active}
            hoverClass={f.value === "todos" ? undefined : STATUS_STYLE[f.value].hover}
          >
            {f.label}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-rule" aria-hidden />
        {PRIORITY_FILTERS.map((p) => (
          <FilterChip
            key={p}
            active={priority === p}
            onClick={() => setPriority(p)}
            activeClass={p === "todas" ? undefined : PRIORITY_STYLE[p].active}
            hoverClass={p === "todas" ? undefined : PRIORITY_STYLE[p].hover}
          >
            {p === "todas" ? "Todas" : p}
          </FilterChip>
        ))}
        <div className="ml-auto w-72">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ID, asunto o solicitante"
            aria-label="Buscar en la cola"
          />
        </div>
      </div>

      {/* Master-detail: lista a la izquierda, panel de detalle pegajoso a la derecha */}
      <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_480px] xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="min-w-0">
          {hydrating ? (
            <LoadingBox label="Cargando la cola del servidor…" />
          ) : hydrateFailed ? (
            <HydrateError onRetry={() => void reload()} />
          ) : (
            <TicketTable
              tickets={filtered}
              initialSort={[{ id: "sla", desc: false }]}
              selectedId={selected}
              onSelect={(id) => select(id)}
              emptyTitle="Sin tickets en esta vista"
              emptyHint={
                query
                  ? `Ningún ticket coincide con «${query}». Ajusta la búsqueda o los filtros.`
                  : `Sin ${PRACTICE_LABEL[valid].toLowerCase()}s con estos filtros.`
              }
              emptyAction={
                <Button
                  variant="primary"
                  className="mt-2"
                  onClick={() => navigate(`/nuevo?practice=${valid}`)}
                >
                  Nuevo {PRACTICE_LABEL[valid].toLowerCase()}
                </Button>
              }
            />
          )}
        </div>

        <aside
          ref={paneRef}
          aria-label="Detalle del ticket seleccionado"
          className={cn(
            "lg:sticky lg:top-0 lg:-mr-8 lg:-mb-7 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto",
            "lg:border-l lg:border-rule lg:bg-panel-2 lg:px-7 lg:py-6",
            // Sin lg:p-0 aqui: tailwind-merge daria prioridad a p-0 sobre el
            // px/py-6 de arriba y el contenido quedaria pegado a los bordes
            selected
              ? "rounded-2xl border border-rule bg-panel-2 p-5 lg:rounded-none lg:border-0"
              : "hidden lg:block",
          )}
        >
          {selected ? (
            stillSearching ? (
              <SearchingPane />
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => select(null)}
                  aria-label="Cerrar el detalle"
                  className="absolute -top-1 right-0 z-10 flex size-7 cursor-pointer items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-row-hover hover:text-ink"
                >
                  <X size={15} strokeWidth={2} aria-hidden />
                </button>
                <TicketDetail key={selected} code={selected} pane />
              </div>
            )
          ) : (
            <EmptyPane />
          )}
        </aside>
      </div>
    </div>
  );
}

function EmptyPane() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <MousePointerClick
        size={26}
        strokeWidth={1.5}
        aria-hidden
        className="text-ink-3/50"
      />
      <p className="text-[14px] font-semibold text-ink-2">
        Ningún ticket seleccionado
      </p>
      <p className="max-w-[240px] text-[15px] leading-relaxed text-ink-3">
        Elige un ticket de la lista y su detalle se abrirá aquí, sin perder la
        cola de vista.
      </p>
    </div>
  );
}

/** D9: un fallo de hidratación nunca es "cola vacía". */
function HydrateError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rule bg-raised px-6 py-14 text-center"
    >
      <AlertTriangle size={24} strokeWidth={1.5} aria-hidden className="text-amber" />
      <p className="text-[15px] font-semibold text-ink">
        No se pudo cargar la cola del servidor
      </p>
      <p className="max-w-sm text-[15px] leading-relaxed text-ink-3">
        La conexión con los microservicios falló. Esto no significa que no
        haya tickets — reintenta cuando el servicio responda.
      </p>
      <Button variant="primary" size="sm" className="mt-1" onClick={onRetry}>
        <RefreshCw size={14} strokeWidth={1.75} aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}

/** C7: el ticket deep-linkeado vive en páginas más antiguas. */
function SearchingPane() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <Search size={24} strokeWidth={1.5} aria-hidden className="animate-pulse text-ink-3" />
      <p className="text-[14px] font-semibold text-ink-2">Buscando el ticket…</p>
      <p className="max-w-[240px] text-[15px] leading-relaxed text-ink-3">
        Es más antiguo que la primera página de la cola; estamos cargando
        páginas anteriores del servidor.
      </p>
    </div>
  );
}

export function EmptyQueue({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-dashed border-rule-2 bg-raised px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      <p className="text-[15px] text-ink-3">{hint}</p>
      {action}
    </div>
  );
}
