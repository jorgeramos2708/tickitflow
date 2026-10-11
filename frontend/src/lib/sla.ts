import type {
  Impact,
  Priority,
  SlaLevel,
  Ticket,
  Urgency,
} from "./types";

/** Matriz ITIL de prioridad: impacto × urgencia → P1–P4 */
export const PRIORITY_MATRIX: Record<Impact, Record<Urgency, Priority>> = {
  alto: { alta: "P1", media: "P2", baja: "P3" },
  medio: { alta: "P2", media: "P3", baja: "P4" },
  bajo: { alta: "P3", media: "P4", baja: "P4" },
};

export function priorityOf(impact: Impact, urgency: Urgency): Priority {
  return PRIORITY_MATRIX[impact][urgency];
}

/** Objetivo de resolución por prioridad, en minutos */
export const SLA_TARGET_MIN: Record<Priority, number> = {
  P1: 240,
  P2: 480,
  P3: 1440,
  P4: 2880,
};

export const SLA_TARGET_LABEL: Record<Priority, string> = {
  P1: "4 h",
  P2: "8 h",
  P3: "24 h",
  P4: "48 h",
};

export interface SlaInfo {
  targetMin: number;
  elapsedMin: number;
  remainingMin: number;
  progress: number;
  level: SlaLevel;
}

export function slaOf(ticket: Ticket, now: number): SlaInfo {
  const targetMin = SLA_TARGET_MIN[ticket.priority];
  const end =
    ticket.resolvedAt ?? now;
  const elapsedMin = Math.max(0, (end - ticket.createdAt) / 60_000);
  const remainingMin = targetMin - elapsedMin;
  const progress = Math.min(1, elapsedMin / targetMin);
  let level: SlaLevel = "ok";
  if (
    ticket.status === "resuelto" ||
    ticket.status === "cerrado" ||
    ticket.status === "cancelado"
  ) {
    level = remainingMin >= 0 ? "ok" : "breach";
  } else if (progress >= 1) {
    level = "breach";
  } else if (progress >= 0.8) {
    level = "warn";
  }
  return { targetMin, elapsedMin, remainingMin, progress, level };
}

export const SLA_LEVEL_TEXT: Record<SlaLevel, string> = {
  ok: "text-good",
  warn: "text-amber",
  breach: "text-signal",
};

export const SLA_LEVEL_BG: Record<SlaLevel, string> = {
  ok: "bg-good",
  warn: "bg-amber",
  breach: "bg-signal",
};

export function fmtRemaining(remainingMin: number): string {
  if (remainingMin >= 0) {
    return fmtDuration(remainingMin);
  }
  return `Vencido ${fmtDuration(-remainingMin)}`;
}

export function fmtDuration(min: number): string {
  const m = Math.round(min);
  const sign = min < 0 ? "−" : "";
  const abs = Math.abs(m);
  if (abs < 60) return `${sign}${abs}m`;
  const h = Math.floor(abs / 60);
  const rest = abs % 60;
  if (h < 48) return `${sign}${h}h${rest ? ` ${rest}m` : ""}`;
  const d = Math.floor(h / 24);
  const restH = h % 24;
  return `${sign}${d}d${restH ? ` ${restH}h` : ""}`;
}

export function fmtRelative(at: number, now: number): string {
  const diffMin = (now - at) / 60_000;
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${Math.floor(diffMin)}m`;
  return `hace ${fmtDuration(diffMin)}`;
}

export function fmtClock(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
