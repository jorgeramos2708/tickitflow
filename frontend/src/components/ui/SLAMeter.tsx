import { cn } from "../../lib/cn";
import { SLA_LEVEL_BG, SLA_LEVEL_TEXT, fmtDuration, fmtRemaining, slaOf } from "../../lib/sla";
import type { Ticket } from "../../lib/types";

/**
 * El medidor SLA: pista redondeada con relleno por avance y cuenta regresiva
 * en mono tabular. Vencido añade el punto pulsante de 8px.
 */
export function SLAMeter({
  ticket,
  now,
  variant = "compact",
}: {
  ticket: Ticket;
  now: number;
  variant?: "compact" | "large";
}) {
  const sla = slaOf(ticket, now);
  const done =
    ticket.status === "resuelto" ||
    ticket.status === "cerrado" ||
    ticket.status === "cancelado";
  // A punto de vencer: >= 80% del objetivo consumido (escala con la
  // prioridad: P1 avisa a ~48 min, P3 a ~4.8 h, P4 a ~9.6 h restantes).
  // Vencido NO lleva punto — el punto solo anuncia "está por vencer".
  const aboutToBreach = !done && sla.level === "warn";

  if (variant === "large") {
    return (
      <div className="space-y-2">
        <div className="h-1.5 w-full rounded-full bg-rule">
          <div
            className={cn("h-full rounded-full", SLA_LEVEL_BG[sla.level])}
            style={{ width: `${Math.round(sla.progress * 100)}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between">
          <span
            className={cn(
              "flex items-center gap-2 font-mono text-[15px] tabular-nums",
              SLA_LEVEL_TEXT[sla.level],
            )}
          >
            {aboutToBreach ? (
              <span aria-hidden className="size-2 shrink-0 self-center rounded-full bg-amber-fill animate-pulse-dot" />
            ) : null}
            {done
              ? sla.remainingMin >= 0
                ? `Resuelto en ${fmtDuration(sla.elapsedMin)}`
                : `Venció por ${fmtDuration(-sla.remainingMin)}`
              : fmtRemaining(sla.remainingMin)}
          </span>
          <span className="label text-ink-3">
            Objetivo {fmtDuration(sla.targetMin)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-[3px] w-14 rounded-full bg-rule">
        <div
          className={cn("h-full rounded-full", SLA_LEVEL_BG[sla.level])}
          style={{ width: `${Math.round(sla.progress * 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "flex w-[76px] items-center gap-1.5 font-mono text-[12px] tabular-nums",
          SLA_LEVEL_TEXT[sla.level],
        )}
      >
        {aboutToBreach ? (
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-fill animate-pulse-dot" />
        ) : null}
        {done
          ? sla.remainingMin >= 0
            ? "Cumplido"
            : "Vencido"
          : fmtRemaining(sla.remainingMin)}
      </span>
    </div>
  );
}
