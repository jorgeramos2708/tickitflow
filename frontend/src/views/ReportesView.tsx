import { useMemo } from "react";
import { Download } from "lucide-react";
import { Module } from "../components/ui/Module";
import { PriorityChip, StatusBadge } from "../components/ui/Chips";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/cn";
import { exportCsv } from "../lib/csv";
import { fmtDuration, slaOf } from "../lib/sla";
import { useStore } from "../lib/store";
import {
  PRACTICE_LABEL,
  type Priority,
  type TicketStatus,
} from "../lib/types";

const DAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Barra horizontal hairline: pista de filete, relleno por ancho, valor mono. */
function BarRow({
  label,
  display,
  share,
  tone = "ink",
  children,
}: {
  label: React.ReactNode;
  display: string;
  share: number;
  tone?: "ink" | "good" | "amber" | "signal";
  children?: React.ReactNode;
}) {
  const toneClass = {
    ink: "bg-ink",
    good: "bg-good",
    amber: "bg-amber",
    signal: "bg-signal",
  }[tone];
  return (
    <div className="border-t border-rule px-4 py-3 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2 text-[13px] text-ink-2">
          {label}
          {children}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-ink">
          {display}
        </span>
      </div>
      <div className="mt-2 h-[3px] w-full rounded-[1px] bg-rule">
        <div
          className={cn("h-full rounded-[1px]", toneClass)}
          style={{ width: `${Math.max(2, Math.round(share * 100))}%` }}
        />
      </div>
    </div>
  );
}

const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

export function ReportesView() {
  const { tickets, now } = useStore();

  /** Histograma de los últimos 7 días derivado de la cola real (hidratada). */
  const volume = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86_400_000);
      return {
        key: d.toISOString().slice(0, 10),
        day: DAY_LABELS[d.getDay()],
      };
    });
    const counts = new Map<string, number>();
    for (const t of tickets) {
      const key = new Date(t.createdAt).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return days.map((d) => ({ day: d.day, count: counts.get(d.key) ?? 0 }));
  }, [tickets, now]);

  const stats = useMemo(() => {
    const resolved = tickets.filter((t) => t.resolvedAt !== null);
    const open = tickets.filter((t) =>
      ["nuevo", "en_progreso", "pendiente_usuario"].includes(t.status),
    );

    const mttrByPractice = (["incidente", "requerimiento"] as const).map(
      (practice) => {
        const rows = resolved.filter((t) => t.practice === practice);
        const total = rows.reduce(
          (acc, t) => acc + (t.resolvedAt! - t.createdAt),
          0,
        );
        return {
          practice,
          count: rows.length,
          minutes: rows.length ? total / rows.length / 60_000 : 0,
        };
      },
    );

    const complianceByPriority = PRIORITIES.map((priority) => {
      const rows = resolved.filter((t) => t.priority === priority);
      const within = rows.filter((t) => slaOf(t, now).remainingMin >= 0).length;
      return {
        priority,
        total: rows.length,
        pct: rows.length ? (within / rows.length) * 100 : 100,
      };
    });

    const byStatus = (["nuevo", "en_progreso", "pendiente_usuario"] as TicketStatus[]).map(
      (status) => ({
        status,
        count: tickets.filter((t) => t.status === status).length,
      }),
    );

    const requesterCounts = new Map<string, { count: number; dept: string }>();
    for (const t of tickets) {
      const entry = requesterCounts.get(t.requester) ?? {
        count: 0,
        dept: t.dept,
      };
      entry.count += 1;
      requesterCounts.set(t.requester, entry);
    }
    const topRequesters = [...requesterCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const breached = open.filter((t) => slaOf(t, now).level === "breach").length;

    return {
      resolvedCount: resolved.length,
      openCount: open.length,
      breached,
      mttrByPractice,
      complianceByPriority,
      byStatus,
      topRequesters,
      maxRequesterCount: topRequesters[0]?.[1].count ?? 1,
    };
  }, [tickets, now]);

  const maxMttr = Math.max(
    ...stats.mttrByPractice.map((m) => m.minutes),
    1,
  );
  const totalOpenForBars =
    stats.byStatus.reduce((acc, s) => acc + s.count, 0) || 1;

  return (
    <div className="mx-auto max-w-[1200px] animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-tight">
            Reportes
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Indicadores calculados respecto a los tickets en la cola
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            exportCsv(
              "tickitflow-reportes",
              tickets.map((t) => ({
                id: t.id,
                practica: t.practice,
                asunto: t.subject,
                estado: t.status,
                prioridad: t.priority,
                solicitante: t.requester,
                departamento: t.dept,
                asignado: t.assignee ?? "",
                creado: new Date(t.createdAt).toISOString(),
                actualizado: new Date(t.updatedAt).toISOString(),
                resuelto: t.resolvedAt ? new Date(t.resolvedAt).toISOString() : "",
                sla_nivel: slaOf(t, now).level,
                sla_restante: Math.round(slaOf(t, now).remainingMin),
              })),
              [
                "id", "practica", "asunto", "estado", "prioridad",
                "solicitante", "departamento", "asignado",
                "creado", "actualizado", "resuelto", "sla_nivel", "sla_restante",
              ],
            );
          }}
        >
          <Download size={14} strokeWidth={1.75} aria-hidden />
          Exportar CSV
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Module
          title="MTTR por práctica"
          count={`${stats.resolvedCount} resueltos`}
          className="lg:col-span-5"
        >
          {stats.mttrByPractice.map((m) => (
            <BarRow
              key={m.practice}
              label={PRACTICE_LABEL[m.practice]}
              display={m.count ? fmtDuration(m.minutes) : "—"}
              share={m.minutes / maxMttr}
            />
          ))}
        </Module>

        <Module title="Cumplimiento SLA por prioridad" className="lg:col-span-4">
          {stats.complianceByPriority.map((c) => (
            <BarRow
              key={c.priority}
              label={<PriorityChip priority={c.priority} />}
              display={c.total ? `${Math.round(c.pct)}%` : "—"}
              share={c.pct / 100}
              tone={c.pct >= 90 ? "good" : c.pct >= 70 ? "amber" : "signal"}
            />
          ))}
        </Module>

        <Module title="Abiertos por estado" count={`${stats.openCount}`} className="lg:col-span-3">
          {stats.byStatus.map((s) => (
            <BarRow
              key={s.status}
              label={<StatusBadge status={s.status} />}
              display={String(s.count)}
              share={s.count / totalOpenForBars}
            />
          ))}
        </Module>

        <Module title="Top solicitantes" className="lg:col-span-7">
          {stats.topRequesters.map(([requester, info]) => (
            <BarRow
              key={requester}
              label={
                <span className="flex items-baseline gap-2">
                  <span className="truncate">{requester}</span>
                  <span className="text-[11.5px] text-ink-3">{info.dept}</span>
                </span>
              }
              display={String(info.count)}
              share={info.count / stats.maxRequesterCount}
            />
          ))}
        </Module>

        <Module title="Volumen 7 días" className="lg:col-span-5">
          <div className="px-4 py-4">
            <svg
              viewBox="0 0 168 64"
              className="w-full"
              role="img"
              aria-label="Tickets registrados por día, últimos 7 días"
            >
              {(() => {
                const max = Math.max(...volume.map((d) => d.count), 1);
                return volume.map((d, i) => {
                  const h = (d.count / max) * 36;
                  // +4px de sangría: "dom"/"sáb" centrados quedan completos
                  // dentro del viewBox (antes la primera etiqueta se clipeaba)
                  const x = 4 + i * 24;
                  const esDescanso = d.day === "sáb" || d.day === "dom";
                  return (
                    <g key={`${d.day}-${i}`}>
                      <rect
                        x={x}
                        y={46 - h}
                        width={14}
                        height={h}
                        className={esDescanso ? "fill-ink/35" : "fill-ink"}
                      />
                      <text
                        x={x + 7}
                        y={43 - h}
                        textAnchor="middle"
                        fontSize={8}
                        className="fill-ink-2 font-mono tabular-nums"
                      >
                        {d.count}
                      </text>
                      <text
                        x={x + 7}
                        y={58}
                        textAnchor="middle"
                        fontSize={8}
                        className="fill-ink-3"
                      >
                        {d.day}
                      </text>
                    </g>
                  );
                });
              })()}
              <line
                x1={0}
                y1={46.5}
                x2={168}
                y2={46.5}
                className="stroke-rule-2"
                strokeWidth={1}
              />
            </svg>
            <p className="mt-3 font-mono text-[11px] text-ink-3">
              {volume.reduce((acc, d) => acc + d.count, 0)} registrados esta
              semana
            </p>
          </div>
        </Module>
      </div>
    </div>
  );
}
