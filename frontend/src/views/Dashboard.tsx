import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { TicketTable } from "../components/queue/TicketTable";
import { Button } from "../components/ui/Button";
import { LoadingBox, Module } from "../components/ui/Module";
import { WeekChart } from "../components/ui/WeekChart";
import { seriesOf, weeklyDelta } from "../lib/kpi";
import { VOLUME_7D } from "../lib/data";
import { SLA_LEVEL_TEXT, fmtDuration, fmtRelative, fmtRemaining, slaOf } from "../lib/sla";
import { useStore } from "../lib/store";
import { useCountUp } from "../lib/useCountUp";
import {
  OPEN_STATUSES,
  STATUS_LABEL,
  type EventKind,
  type TicketStatus,
} from "../lib/types";
import { cn } from "../lib/cn";

const TIME_FMT = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_FMT = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function eventText(kind: EventKind, to?: string, detail?: string): string {
  switch (kind) {
    case "estado":
      return `Estado → ${STATUS_LABEL[to as TicketStatus]}`;
    case "asignacion":
      return `Asignado a ${to}`;
    case "nota":
      return detail ?? "Nota interna";
    case "adjunto":
      return `Adjuntos: ${detail}`;
    default:
      return "Ticket registrado";
  }
}

/** Sparkline: línea de los últimos 7 días, sin ejes ni relleno. */
function Sparkline({
  points,
  className,
  summary,
}: {
  points: number[];
  className?: string;
  /** Resumen accesible de la tendencia (p.ej. "Abiertos: tendencia al alza…") */
  summary: string;
}) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;
  const step = w / (points.length - 1);
  const y = (v: number) =>
    range === 0 ? h / 2 : h - 3 - ((v - min) / range) * (h - 6);
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${y(v).toFixed(2)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("mt-2 h-[28px] w-full", className)}
      role="img"
      aria-label={summary}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function KpiCell({
  label,
  value,
  count,
  spark,
  prev,
  deltaKind,
  positiveIsGood,
  risk = false,
}: {
  label: string;
  value: string;
  count?: number;
  spark: number[];
  prev: number[];
  deltaKind: "levelPct" | "levelCount" | "duration" | "pct";
  positiveIsGood: boolean;
  risk?: boolean;
}) {
  const animated = useCountUp(typeof count === "number" ? count : 0);
  const delta = weeklyDelta(spark, prev, deltaKind);
  // Sin datos (menos de 2 puntos): solo el valor — spec
  const showSeries = spark.filter((p) => p >= 0).length >= 2;
  const deltaGood = delta
    ? positiveIsGood
      ? delta.up
      : !delta.up
    : false;
  // Resumen accesible de la tarjeta ("Abiertos: tendencia al alza, +14% vs. semana anterior")
  const sparkSummary = delta
    ? `${label}: tendencia ${delta.up ? "al alza" : "a la baja"}, ${delta.raw} vs. semana anterior`
    : `${label}: sin cambios significativos vs. semana anterior`;
  return (
    <div
      className={cn(
        "rounded-[14px] border border-rule bg-raised px-4 py-3.5 shadow-1",
        "transition-[transform,box-shadow] duration-250 ease-[cubic-bezier(.2,.8,.2,1)]",
        "hover:-translate-y-[3px] hover:shadow-2",
        risk && "ring-inset ring-1 ring-amber-fill/50",
      )}
    >
      <p className="label text-ink-3">{label}</p>
      <p className="mt-2.5 flex items-baseline gap-2.5">
        <span className="font-display text-[32px] leading-none font-extrabold tracking-tight tabular-nums">
          {typeof count === "number" ? animated : value}
        </span>
        {delta ? (
          <span
            className={cn(
              "flex items-center gap-0.5 font-mono text-[11px] tabular-nums",
              deltaGood ? "text-good" : "text-signal",
            )}
          >
            {delta.up ? (
              <ArrowUp size={10} strokeWidth={2} aria-hidden />
            ) : (
              <ArrowDown size={10} strokeWidth={2} aria-hidden />
            )}
            {delta.text}
          </span>
        ) : null}
      </p>
      {showSeries ? (
        <Sparkline
          points={spark}
          className={risk ? "text-amber-fill" : "text-ink-2"}
          summary={sparkSummary}
        />
      ) : null}
    </div>
  );
}

const DAY_FMT = new Intl.DateTimeFormat("es-MX", { weekday: "short" });

/** En live se deriva del store; en demo usa la serie sintética. */
function volumeData(
  live: boolean,
  tickets: { createdAt: number }[],
): Array<{ day: string; count: number }> {
  if (!live) return VOLUME_7D;
  const days: Array<{ day: string; count: number }> = [];
  const nowMs = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(nowMs - i * 86_400_000);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const end = start + 86_400_000;
    const count = tickets.filter((t) => t.createdAt >= start && t.createdAt < end).length;
    const label = DAY_FMT.format(d);
    days.push({ day: label.charAt(0).toUpperCase() + label.slice(1), count });
  }
  return days;
}

export function Dashboard() {
  const { tickets, now, me, hydrating, hydrateFailed, live, reload, kpiDays } =
    useStore();
  

  const open = useMemo(
    () => tickets.filter((t) => OPEN_STATUSES.includes(t.status)),
    [tickets],
  );
  const critical = useMemo(
    () =>
      open
        .map((t) => ({ t, sla: slaOf(t, now) }))
        .filter(({ sla }) => sla.level !== "ok")
        .sort((a, b) => a.sla.remainingMin - b.sla.remainingMin)
        .map(({ t }) => t)
        .slice(0, 8),
    [open, now],
  );

  const resolved = useMemo(
    () => tickets.filter((t) => t.resolvedAt !== null),
    [tickets],
  );
  const mttr = useMemo(() => {
    if (!resolved.length) return null;
    const total = resolved.reduce((acc, t) => acc + (t.resolvedAt! - t.createdAt), 0);
    return total / resolved.length / 60_000;
  }, [resolved]);
  const compliance = useMemo(() => {
    if (!resolved.length) return null;
    const within = resolved.filter((t) => slaOf(t, now).remainingMin >= 0).length;
    return (within / resolved.length) * 100;
  }, [resolved, now]);

  const mine = useMemo(
    () =>
      open
        .filter((t) => t.assignee === me)
        .sort((a, b) => slaOf(a, now).remainingMin - slaOf(b, now).remainingMin)
        .slice(0, 5),
    [open, me, now],
  );

  const volume = useMemo(() => volumeData(live, tickets), [live, tickets]);

  const activity = useMemo(() => {
    const all: { at: number; id: string; text: string }[] = [];
    for (const t of tickets) {
      for (const ev of t.events) {
        if (ev.kind === "creado") continue;
        all.push({ at: ev.at, id: t.id, text: eventText(ev.kind, ev.to, ev.detail) });
      }
    }
    return all.sort((a, b) => b.at - a.at).slice(0, 6);
  }, [tickets]);

  return (
    <div className="mx-auto max-w-[1200px] animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-tight">
            Estado del servicio
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Turno de {me} · {DATE_FMT.format(now)} ·{" "}
            <span className="font-mono tabular-nums">{TIME_FMT.format(now)}</span>
          </p>
        </div>
      </div>

      <section
        aria-label="Indicadores del servicio"
        className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <KpiCell
          label="Abiertos"
          value={String(open.length)}
          count={open.length}
          spark={seriesOf(kpiDays, "open").spark}
          prev={seriesOf(kpiDays, "open").prev}
          deltaKind="levelPct"
          positiveIsGood={false}
        />
        <KpiCell
          risk
          label="En riesgo de SLA"
          value={String(critical.length)}
          count={critical.length}
          spark={seriesOf(kpiDays, "atRisk").spark}
          prev={seriesOf(kpiDays, "atRisk").prev}
          deltaKind="levelCount"
          positiveIsGood={false}
        />
        <KpiCell
          label="MTTR"
          value={mttr === null ? "—" : fmtDuration(mttr)}
          spark={seriesOf(kpiDays, "mttr").spark}
          prev={seriesOf(kpiDays, "mttr").prev}
          deltaKind="duration"
          positiveIsGood={false}
        />
        <KpiCell
          label="Cumplimiento SLA"
          value={compliance === null ? "—" : `${compliance.toFixed(1)}%`}
          spark={seriesOf(kpiDays, "compliance").spark}
          prev={seriesOf(kpiDays, "compliance").prev}
          deltaKind="pct"
          positiveIsGood
        />
      </section>

      <section className="mt-8" aria-label="Tickets pendientes">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight">Tickets pendientes</h2>
          <Link
            to="/cola/incidente"
            className="ml-auto flex items-center gap-1 text-[13px] link-grow hover:link-grow-hover font-bold text-amber hover:text-amber-hi"
          >
            Ver todos los incidentes
            <ArrowRight size={13} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        {hydrating ? (
          <LoadingBox label="Cargando la cola del servidor…" />
        ) : hydrateFailed ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule bg-raised px-4 py-3"
          >
            <p className="text-[13.5px] text-ink-2">
              No se pudo cargar la cola del servidor — los KPIs pueden estar
              incompletos.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => void reload()}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <TicketTable
            tickets={critical}
            emptyTitle="Ningún ticket en riesgo"
            emptyHint="Toda la cola abierta está dentro de su objetivo de SLA."
            initialSort={[{ id: "sla", desc: false }]}
          />
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Module title="Mis asignados" count={`${mine.length}`} className="lg:col-span-5">
          {mine.length === 0 ? (
            <p className="px-4 py-6 text-[15px] text-ink-3">
              No tienes tickets abiertos asignados. Toma uno desde la cola de
              incidentes.
            </p>
          ) : (
            <ul>
              {mine.map((t) => {
                const sla = slaOf(t, now);
                return (
                  <li key={t.id}>
                    <Link
                      to={`/ticket/${t.id}`}
                      className="flex items-center gap-3 border-t border-rule px-4 py-2.5 transition-colors duration-150 first:border-t-0 hover:bg-raised"
                    >
                      <span className="font-mono text-[12px] tabular-nums text-ink-3">
                        {t.id}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">
                        {t.subject}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[11px] tabular-nums",
                          SLA_LEVEL_TEXT[sla.level],
                        )}
                      >
                        {fmtRemaining(sla.remainingMin)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Module>

        <Module title="Actividad reciente" className="lg:col-span-4">
          <ul>
            {activity.map((a, i) => (
              <li
                key={`${a.id}-${a.at}-${i}`}
                className="flex items-baseline gap-2 border-t border-rule px-4 py-2.5 first:border-t-0"
              >
                <span className="font-mono text-[11px] tabular-nums text-ink-3">
                  {fmtRelative(a.at, now)}
                </span>
                <span className="font-mono text-[11.5px] tabular-nums text-ink-2">
                  {a.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-3">
                  {a.text}
                </span>
              </li>
            ))}
          </ul>
        </Module>

        <Module title="Últimos 7 días" className="lg:col-span-3">
          <div className="px-4 py-3">
            <WeekChart data={volume} todayIndex={volume.length - 1} />
            <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
              {volume.reduce((acc, d) => acc + d.count, 0) === 0
                ? "Sin registros esta semana"
                : `${volume.reduce((acc, d) => acc + d.count, 0)} registrados esta semana`}
              {!live ? (
                <span className="text-[10.5px] font-semibold text-ink-3" title="Serie de demostración — no real en modo demo">
                  demo
                </span>
              ) : null}
            </p>
          </div>
        </Module>
      </div>
    </div>
  );
}
